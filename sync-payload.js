// QuickDot legacy payload sync helpers. Loaded by index.html before sync.js.
async function fetchCloudData() {
  const { data, error } = await state.supabaseClient
    .from("quickdot_user_data")
    .select("payload, updated_at")
    .eq("user_id", state.syncSession.user.id)
    .maybeSingle();

  if (error) {
    noteSyncFailure();
    await recordSyncError("quickdot_user_data.select", error, { table: "quickdot_user_data" });
    updateSyncStatus(t("syncCloudReadFailed", { message: error.message }));
    return null;
  }

  return data;
}

async function applyCloudPayload(payload, updatedAt) {
  const migratedPayload = migratePayload(payload);
  if (!migratedPayload || typeof migratedPayload !== "object") {
    updateSyncStatus(t("syncCloudInvalid"));
    return;
  }

  state.suppressDirty = true;
  applyPayloadToState(migratedPayload, { preserveSymbolsIfMissing: true });
  state.suppressDirty = false;

  saveSyncMeta({ lastSyncAt: updatedAt || new Date().toISOString(), localDirty: false, seedOnly: false });
  render();
  updateSyncStatus(t("syncCloudDownloaded"));
  setTimeout(openYesterdayMigrationPrompt, 150);
}

async function mergeCloudPayload(payload, updatedAt) {
  const merged = mergeLocalAndCloudPayload(createCloudPayload(), migratePayload(payload));
  state.suppressDirty = true;
  applyPayloadToState(merged);
  state.suppressDirty = false;
  saveSyncMeta({ lastSyncAt: updatedAt || null, localDirty: true, seedOnly: false });
  render();
  updateSyncStatus(t("syncMerged"));
}

function applyPayloadToState(payload, options = {}) {
  const { preserveSymbolsIfMissing = false } = options;
  const migratedPayload = migratePayload(payload);
  const hasSymbolData = Boolean(migratedPayload.symbolDefinitions || migratedPayload.symbolMeanings);

  state.entries = normalizeEntries(migratedPayload.entries);
  state.deletedEntries = normalizeDeletedEntries(migratedPayload.deletedEntries);
  state.deletedSymbolDefinitions = normalizeDeletedSymbolDefinitions(migratedPayload.deletedSymbolDefinitions);

  if (migratedPayload.symbolDefinitions) {
    state.symbolDefinitions = filterDeletedSymbolDefinitions(migratedPayload.symbolDefinitions, state.deletedSymbolDefinitions);
  } else if (migratedPayload.symbolMeanings) {
    state.symbolDefinitions = filterDeletedSymbolDefinitions(migrateMeaningsToSymbolDefinitions(migratedPayload.symbolMeanings), state.deletedSymbolDefinitions);
  } else if (!preserveSymbolsIfMissing) {
    state.symbolDefinitions = filterDeletedSymbolDefinitions(state.symbolDefinitions, state.deletedSymbolDefinitions);
  }

  if (preserveSymbolsIfMissing && !hasSymbolData) {
    state.symbolDefinitions = filterDeletedSymbolDefinitions(state.symbolDefinitions, state.deletedSymbolDefinitions);
  }

  syncSymbolMeaningsFromDefinitions();
  saveEntries();
  saveSymbolMeanings();
}

function applyCloudSymbolDefinitions(payload) {
  const migratedPayload = migratePayload(payload);
  state.deletedSymbolDefinitions = mergeDeletedSymbolDefinitions(state.deletedSymbolDefinitions, migratedPayload.deletedSymbolDefinitions);
  state.symbolDefinitions = filterDeletedSymbolDefinitions(
    mergeSymbolDefinitions(
      state.symbolDefinitions,
      migratedPayload.symbolDefinitions,
      state.symbolMeanings,
      migratedPayload.symbolMeanings,
      state.deletedSymbolDefinitions,
    ),
    state.deletedSymbolDefinitions,
  );
  syncSymbolMeaningsFromDefinitions();
  saveSymbolMeanings();
}

async function pushCloudSnapshot() {
  if (!ensureSyncReady() || !navigator.onLine) return null;
  const now = new Date().toISOString();
  const payload = createCloudPayload(now);
  const { data, error } = await state.supabaseClient
    .from("quickdot_user_data")
    .upsert(
      {
        user_id: state.syncSession.user.id,
        payload,
        updated_at: now,
      },
      { onConflict: "user_id" },
    )
    .select("updated_at")
    .single();

  if (error) {
    await recordSyncError("quickdot_user_data.snapshot_upsert", error, { table: "quickdot_user_data" });
    return null;
  }

  return data?.updated_at || now;
}

function createCloudPayload(updatedAt = new Date().toISOString()) {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    entries: normalizeEntries(state.entries),
    deletedEntries: normalizeDeletedEntries(state.deletedEntries),
    deletedSymbolDefinitions: compactDeletedSymbolDefinitions(state.deletedSymbolDefinitions),
    symbolDefinitions: filterDeletedSymbolDefinitions(state.symbolDefinitions, state.deletedSymbolDefinitions),
    symbolMeanings: state.symbolMeanings,
    updatedAt,
  };
}

function mergeLocalAndCloudPayload(localPayload, cloudPayload) {
  const local = migratePayload(localPayload);
  const cloud = migratePayload(cloudPayload);
  const entriesById = new Map();
  const deletedById = new Map();
  const deletedSymbols = mergeDeletedSymbolDefinitions(local.deletedSymbolDefinitions, cloud.deletedSymbolDefinitions);

  normalizeEntries([...local.entries, ...cloud.entries]).forEach((entry) => {
    const existing = entriesById.get(entry.id);
    if (!existing || isNewer(entry.updatedAt, existing.updatedAt)) {
      entriesById.set(entry.id, entry);
    }
  });

  normalizeDeletedEntries([...local.deletedEntries, ...cloud.deletedEntries]).forEach((deleted) => {
    const existing = deletedById.get(deleted.id);
    if (!existing || isNewer(deleted.deletedAt, existing.deletedAt)) {
      deletedById.set(deleted.id, deleted);
    }
  });

  deletedById.forEach((deleted, id) => {
    const entry = entriesById.get(id);
    if (!entry || isNewer(deleted.deletedAt, entry.updatedAt)) {
      entriesById.delete(id);
      return;
    }
    deletedById.delete(id);
  });

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    entries: Array.from(entriesById.values()),
    deletedEntries: pruneDeletedEntries(Array.from(deletedById.values())),
    deletedSymbolDefinitions: pruneDeletedSymbolDefinitions(deletedSymbols),
    symbolDefinitions: mergeSymbolDefinitions(local.symbolDefinitions, cloud.symbolDefinitions, local.symbolMeanings, cloud.symbolMeanings, deletedSymbols),
    updatedAt: new Date().toISOString(),
  };
}

function mergeSymbolDefinitions(localDefinitions, cloudDefinitions, localMeanings, cloudMeanings, deletedSymbols = []) {
  const merged = new Map();
  normalizeSymbolDefinitions(localDefinitions || migrateMeaningsToSymbolDefinitions(localMeanings)).forEach((definition) => {
    merged.set(definition.id, definition);
  });
  normalizeSymbolDefinitions(cloudDefinitions || migrateMeaningsToSymbolDefinitions(cloudMeanings)).forEach((definition) => {
    merged.set(definition.id, definition);
  });
  return filterDeletedSymbolDefinitions(Array.from(merged.values()), deletedSymbols);
}

function mergeDeletedSymbolDefinitions(localDeletedSymbols, cloudDeletedSymbols) {
  return normalizeDeletedSymbolDefinitions([
    ...normalizeDeletedSymbolDefinitions(localDeletedSymbols),
    ...normalizeDeletedSymbolDefinitions(cloudDeletedSymbols),
  ]);
}

function pruneDeletedEntries(deletedEntries) {
  const cutoff = Date.now() - 1000 * 60 * 60 * 24 * TOMBSTONE_RETENTION_DAYS;
  return normalizeDeletedEntries(deletedEntries).filter((item) => new Date(item.deletedAt).getTime() >= cutoff);
}

function pruneDeletedSymbolDefinitions(deletedSymbols) {
  const cutoff = Date.now() - 1000 * 60 * 60 * 24 * TOMBSTONE_RETENTION_DAYS;
  return normalizeDeletedSymbolDefinitions(deletedSymbols).filter((item) => new Date(item.deletedAt).getTime() >= cutoff);
}

function isNewer(next, current) {
  return new Date(next || 0).getTime() >= new Date(current || 0).getTime();
}
