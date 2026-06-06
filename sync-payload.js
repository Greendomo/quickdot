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
  state.entries = normalizeEntries(migratedPayload.entries);
  state.deletedEntries = normalizeDeletedEntries(migratedPayload.deletedEntries);
  state.symbolMeanings = { ...getDefaultSymbolMeanings() };
  saveEntries();
  saveSymbolMeanings();
  state.suppressDirty = false;

  saveSyncMeta({ lastSyncAt: updatedAt || new Date().toISOString(), localDirty: false, seedOnly: false });
  render();
  updateSyncStatus(t("syncCloudDownloaded"));
  setTimeout(openYesterdayMigrationPrompt, 150);
}

async function mergeCloudPayload(payload, updatedAt) {
  const merged = mergeLocalAndCloudPayload(createCloudPayload(), migratePayload(payload));
  state.suppressDirty = true;
  state.entries = normalizeEntries(merged.entries);
  state.deletedEntries = normalizeDeletedEntries(merged.deletedEntries);
  saveEntries();
  state.suppressDirty = false;
  saveSyncMeta({ lastSyncAt: updatedAt || null, localDirty: true, seedOnly: false });
  render();
  updateSyncStatus(t("syncMerged"));
}

function createCloudPayload(updatedAt = new Date().toISOString()) {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    entries: normalizeEntries(state.entries),
    deletedEntries: normalizeDeletedEntries(state.deletedEntries),
    updatedAt,
  };
}

function mergeLocalAndCloudPayload(localPayload, cloudPayload) {
  const local = migratePayload(localPayload);
  const cloud = migratePayload(cloudPayload);
  const entriesById = new Map();
  const deletedById = new Map();

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
    updatedAt: new Date().toISOString(),
  };
}

function pruneDeletedEntries(deletedEntries) {
  const cutoff = Date.now() - 1000 * 60 * 60 * 24 * TOMBSTONE_RETENTION_DAYS;
  return normalizeDeletedEntries(deletedEntries).filter((item) => new Date(item.deletedAt).getTime() >= cutoff);
}

function isNewer(next, current) {
  return new Date(next || 0).getTime() >= new Date(current || 0).getTime();
}
