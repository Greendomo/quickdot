// QuickDot sync engine module. Loaded by index.html.

async function initSync() {
  const config = window.QUICKDOT_SUPABASE || {};
  if (!config.url || !config.anonKey || !window.supabase?.createClient) {
    updateSyncStatus(t("syncNotConfigured"));
    return;
  }

  state.supabaseClient = window.supabase.createClient(config.url, config.anonKey);
  const { data } = await state.supabaseClient.auth.getSession();
  state.syncSession = data.session;
  updateSyncStatus();

  state.supabaseClient.auth.onAuthStateChange((event, session) => {
    state.syncSession = session;
    updateSyncStatus();
    if (event === "PASSWORD_RECOVERY") {
      openPasswordResetDialog();
      return;
    }
    if (session) {
      startSyncRefresh();
      window.setTimeout(syncLatestThenPrompt, 0);
    } else {
      stopSyncRefresh();
    }
  });

  window.addEventListener("focus", syncWhenActive);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") syncWhenActive();
  });
  window.addEventListener("online", syncWhenActive);
  window.addEventListener("offline", () => updateSyncStatus(t("syncOfflineQueued")));

  if (state.syncSession) {
    startSyncRefresh();
    await syncLatest();
  }
}

async function syncLatestThenPrompt() {
  await syncLatest();
  openYesterdayMigrationPrompt();
}

async function syncLatest() {
  if (!ensureSyncReady()) return;
  if (!canAttemptSyncNow()) return;

  beginSyncTask(t("syncLatestProgress"));
  try {
    if (state.normalizedSyncAvailable !== false) {
      const normalizedResult = await syncLatestNormalized();
      if (normalizedResult !== "fallback") return;
    }

    const cloud = await fetchCloudData();
    if (!cloud) {
      await pushToCloud();
      return;
    }

    const meta = loadSyncMeta();
    const hasUntrackedLocalData = !meta.lastSyncAt && !meta.seedOnly && state.entries.length > 0;
    const cloudIsNewer = meta.lastSyncAt ? new Date(cloud.updated_at) > new Date(meta.lastSyncAt) : true;

    if (cloudIsNewer && (meta.localDirty || hasUntrackedLocalData)) {
      await mergeCloudPayload(cloud.payload, cloud.updated_at);
      await pushToCloud();
      return;
    }

    if (cloudIsNewer) {
      await applyCloudPayload(cloud.payload, cloud.updated_at);
      return;
    }

    if (meta.localDirty) {
      await pushToCloud();
      return;
    }

    noteSyncSuccess();
    updateSyncStatus(t("syncAlreadyLatest"));
  } finally {
    endSyncTask();
  }
}

async function syncLatestNormalized() {
  const remote = await fetchNormalizedEntries();
  if (remote === "fallback") return "fallback";
  if (remote === "error") return "error";

  if (remote) {
    const remotePayload = normalizedRowsToPayload(remote);
    const merged = mergeLocalAndCloudPayload(createCloudPayload(), remotePayload);
    state.suppressDirty = true;
    state.entries = normalizeEntries(merged.entries);
    state.deletedEntries = normalizeDeletedEntries(merged.deletedEntries);
    saveEntries();
    state.suppressDirty = false;
  }

  const pushResult = await pushNormalizedChanges();
  if (pushResult !== "ok") return pushResult;
  saveSyncMeta({ lastSyncAt: new Date().toISOString(), localDirty: false, seedOnly: false });
  render();
  await flushSyncErrors();
  noteSyncSuccess();
  updateSyncStatus(t("syncAlreadyLatest"));
  return "ok";
}

async function pullFromCloud() {
  if (!ensureSyncReady()) return;
  beginSyncTask(t("syncLatestProgress"));
  try {
    if (state.normalizedSyncAvailable !== false) {
      const remote = await fetchNormalizedEntries();
      if (remote !== "fallback" && remote !== "error") {
        await applyCloudPayload(normalizedRowsToPayload(remote), new Date().toISOString());
        return;
      }
      if (remote === "error") return;
    }

    const cloud = await fetchCloudData();
    if (!cloud) {
      updateSyncStatus(t("syncCloudEmpty"));
      return;
    }
    await applyCloudPayload(cloud.payload, cloud.updated_at);
  } finally {
    endSyncTask();
  }
}

async function pushToCloud() {
  if (!ensureSyncReady()) return;
  if (!navigator.onLine) {
    updateSyncStatus(t("syncOfflineQueued"));
    return;
  }
  if (!canAttemptSyncNow()) return;

  beginSyncTask(t("syncUploadProgress"));
  try {
    if (state.normalizedSyncAvailable !== false) {
      const normalizedResult = await pushNormalizedChanges();
      if (normalizedResult === "ok") {
        saveSyncMeta({ lastSyncAt: new Date().toISOString(), localDirty: false, seedOnly: false });
        await flushSyncErrors();
        noteSyncSuccess();
        updateSyncStatus(t("syncUploadSuccess"));
        return;
      }
      if (normalizedResult === "error") return;
    }

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
    noteSyncFailure();
    await recordSyncError("quickdot_user_data.upsert", error, { table: "quickdot_user_data" });
    updateSyncStatus(t("syncUploadFailed", { message: error.message }));
    return;
    }

  saveSyncMeta({ lastSyncAt: data.updated_at, localDirty: false });
  clearSyncQueue();
  await flushSyncErrors();
  noteSyncSuccess();
  updateSyncStatus(t("syncUploadSuccess"));
  } finally {
    endSyncTask();
  }
}

async function fetchNormalizedEntries() {
  const meta = loadSyncMeta();
  let query = state.supabaseClient
    .from("quickdot_entries")
    .select("entry_id,payload,updated_at,deleted_at")
    .eq("user_id", state.syncSession.user.id)
    .order("updated_at", { ascending: true });

  if (meta.lastSyncAt) {
    query = query.or(`updated_at.gt.${meta.lastSyncAt},deleted_at.gt.${meta.lastSyncAt}`);
  }

  const { data, error } = await query;
  if (error) return handleNormalizedSyncError(error, "quickdot_entries.select");
  state.normalizedSyncAvailable = true;
  return data || [];
}

async function pushNormalizedChanges() {
  const queue = normalizeSyncQueue(state.syncQueue);
  const changes = queue.length
    ? queue
    : normalizeEntries(state.entries).map((entry) => ({
        entryId: entry.id,
        action: "upsert",
        entry,
        changedAt: entry.updatedAt || new Date().toISOString(),
      }));

  if (changes.length === 0) return "ok";

  const upserts = changes
    .filter((change) => change.action === "upsert" && change.entry)
    .map((change) => normalizedEntryRow(change.entry));
  const deletions = changes
    .filter((change) => change.action === "delete")
    .map((change) => normalizedDeleteRow(change.entryId, change.changedAt));

  if (upserts.length) {
    const { error } = await state.supabaseClient
      .from("quickdot_entries")
      .upsert(upserts, { onConflict: "user_id,entry_id" });
    if (error) return handleNormalizedSyncError(error, "quickdot_entries.upsert");
  }

  if (deletions.length) {
    const { error } = await state.supabaseClient
      .from("quickdot_entries")
      .upsert(deletions, { onConflict: "user_id,entry_id" });
    if (error) return handleNormalizedSyncError(error, "quickdot_entries.delete");
  }

  await recordNormalizedChanges(changes);
  state.normalizedSyncAvailable = true;
  clearSyncQueue();
  return "ok";
}

async function recordNormalizedChanges(changes) {
  const rows = changes.map((change) => ({
    user_id: state.syncSession.user.id,
    entry_id: change.entryId,
    action: change.action,
    changed_at: change.changedAt || new Date().toISOString(),
  }));
  if (!rows.length) return;
  const { error } = await state.supabaseClient.from("quickdot_entry_changes").insert(rows);
  if (error) await recordSyncError("quickdot_entry_changes.insert", error, { table: "quickdot_entry_changes" });
}

function handleNormalizedSyncError(error, operation = "quickdot_entries") {
  if (/quickdot_entries|schema|relation|does not exist|404/i.test(error.message || "")) {
    state.normalizedSyncAvailable = false;
    return "fallback";
  }
  noteSyncFailure();
  recordSyncError(operation, error, { table: "quickdot_entries" }).catch(() => {});
  updateSyncStatus(t("syncCloudReadFailed", { message: error.message }));
  return "error";
}

async function recordSyncError(operation, error, details = {}) {
  queueSyncError(operation, error, sanitizeErrorDetails(details));
  if (!state.supabaseClient || !state.syncSession || !navigator.onLine) return;
  try {
    await flushSyncErrors();
  } catch {
    // Keep the local error queue so diagnostics can be retried later.
  }
}

async function flushSyncErrors() {
  const queue = normalizeSyncErrorQueue(state.syncErrorQueue);
  if (!queue.length || !state.supabaseClient || !state.syncSession || !navigator.onLine) return;

  const rows = queue.map((item) => ({
    user_id: state.syncSession.user.id,
    operation: item.operation,
    message: item.message,
    details: item.details || {},
    created_at: item.createdAt,
  }));
  try {
    const { error } = await state.supabaseClient.from("quickdot_sync_errors").insert(rows);
    if (error) return;
    clearSyncedSyncErrors(queue.map((item) => item.id));
  } catch {
    // Diagnostics should never block the user's actual sync flow.
  }
}

function sanitizeErrorDetails(details) {
  if (!details || typeof details !== "object") return {};
  const allowed = ["code", "table", "phase", "fallback"];
  return Object.fromEntries(Object.entries(details).filter(([key]) => allowed.includes(key)));
}

function normalizedEntryRow(entry) {
  const normalized = normalizeEntry(entry);
  return {
    user_id: state.syncSession.user.id,
    entry_id: normalized.id,
    entry_date: normalized.date,
    payload: normalized,
    updated_at: normalized.updatedAt || new Date().toISOString(),
    deleted_at: null,
  };
}

function normalizedDeleteRow(entryId, deletedAt) {
  return {
    user_id: state.syncSession.user.id,
    entry_id: entryId,
    entry_date: null,
    payload: null,
    updated_at: deletedAt || new Date().toISOString(),
    deleted_at: deletedAt || new Date().toISOString(),
  };
}

function normalizedRowsToPayload(rows) {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    entries: rows.filter((row) => !row.deleted_at && row.payload).map((row) => row.payload),
    deletedEntries: rows
      .filter((row) => row.deleted_at)
      .map((row) => ({ id: row.entry_id, deletedAt: row.deleted_at })),
    updatedAt: new Date().toISOString(),
  };
}

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
  const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 90;
  return normalizeDeletedEntries(deletedEntries).filter((item) => new Date(item.deletedAt).getTime() >= cutoff);
}

function isNewer(next, current) {
  return new Date(next || 0).getTime() >= new Date(current || 0).getTime();
}

function scheduleAutoSync() {
  if (!state.syncSession || !state.supabaseClient || state.suppressDirty) return;
  if (!navigator.onLine) {
    updateSyncStatus(t("syncOfflineQueued"));
    return;
  }
  window.clearTimeout(state.syncDebounce);
  const delay = Math.max(1500, state.syncBackoffMs || 0) + Math.floor(Math.random() * 1500);
  state.syncDebounce = window.setTimeout(() => {
    pushToCloud();
  }, delay);
}

function startSyncRefresh() {
  stopSyncRefresh();
  state.syncRefreshInterval = window.setInterval(syncWhenActive, 60000);
}

function stopSyncRefresh() {
  window.clearInterval(state.syncRefreshInterval);
  state.syncRefreshInterval = null;
}

function syncWhenActive() {
  if (!state.syncSession || !state.supabaseClient) return;
  if (!navigator.onLine) {
    updateSyncStatus(t("syncOfflineQueued"));
    return;
  }
  window.setTimeout(syncLatest, Math.floor(Math.random() * 3000));
}

function canAttemptSyncNow() {
  const now = Date.now();
  const wait = Math.max(0, state.syncBackoffMs || 0);
  if (wait && now - state.lastSyncAttemptAt < wait) {
    updateSyncStatus(t("syncRetryScheduled"));
    return false;
  }
  state.lastSyncAttemptAt = now;
  return true;
}

function noteSyncSuccess() {
  state.syncBackoffMs = 0;
}

function noteSyncFailure() {
  state.syncBackoffMs = state.syncBackoffMs ? Math.min(state.syncBackoffMs * 2, 60000) : 5000;
}
