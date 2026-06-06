// QuickDot sync queue persistence helpers. Loaded by index.html before storage.js.
function loadSyncMeta() {
  try {
    const saved = localStorage.getItem(SYNC_META_KEY);
    return saved
      ? { lastSyncAt: null, localDirty: false, seedOnly: false, ...JSON.parse(saved) }
      : { lastSyncAt: null, localDirty: false, seedOnly: false };
  } catch {
    return { lastSyncAt: null, localDirty: false, seedOnly: false };
  }
}

function saveSyncMeta(meta) {
  localStorage.setItem(SYNC_META_KEY, JSON.stringify({ ...loadSyncMeta(), ...meta }));
}

function loadSyncQueue() {
  try {
    const saved = localStorage.getItem(SYNC_QUEUE_KEY);
    return saved ? normalizeSyncQueue(JSON.parse(saved)) : [];
  } catch {
    return [];
  }
}

function saveSyncQueue() {
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(normalizeSyncQueue(state.syncQueue)));
}

function normalizeSyncQueue(queue) {
  if (!Array.isArray(queue)) return [];
  const byId = new Map();
  queue.forEach((change) => {
    if (!change?.entryId || !["upsert", "delete"].includes(change.action)) return;
    const normalized = {
      entryId: change.entryId,
      action: change.action,
      entry: change.action === "upsert" && change.entry ? normalizeEntry(change.entry) : null,
      changedAt: change.changedAt || new Date().toISOString(),
    };
    const existing = byId.get(normalized.entryId);
    if (!existing || new Date(normalized.changedAt) >= new Date(existing.changedAt)) {
      byId.set(normalized.entryId, normalized);
    }
  });
  return Array.from(byId.values());
}

function queueEntryUpsert(entry) {
  if (state.suppressDirty || !entry?.id) return;
  state.syncQueue = normalizeSyncQueue([
    ...state.syncQueue,
    {
      entryId: entry.id,
      action: "upsert",
      entry,
      changedAt: entry.updatedAt || new Date().toISOString(),
    },
  ]);
  saveSyncQueue();
}

function queueEntryDelete(id, deletedAt = new Date().toISOString()) {
  if (state.suppressDirty || !id) return;
  state.syncQueue = normalizeSyncQueue([
    ...state.syncQueue,
    {
      entryId: id,
      action: "delete",
      entry: null,
      changedAt: deletedAt,
    },
  ]);
  saveSyncQueue();
}

function clearSyncQueue() {
  state.syncQueue = [];
  saveSyncQueue();
}

function loadSyncErrorQueue() {
  try {
    const saved = localStorage.getItem(SYNC_ERROR_QUEUE_KEY);
    return saved ? normalizeSyncErrorQueue(JSON.parse(saved)) : [];
  } catch {
    return [];
  }
}

function saveSyncErrorQueue() {
  localStorage.setItem(SYNC_ERROR_QUEUE_KEY, JSON.stringify(normalizeSyncErrorQueue(state.syncErrorQueue)));
}

function normalizeSyncErrorQueue(errors) {
  if (!Array.isArray(errors)) return [];
  return errors
    .filter((item) => item && item.message)
    .map((item) => ({
      id: item.id || crypto.randomUUID(),
      operation: String(item.operation || "sync"),
      message: String(item.message),
      details: item.details && typeof item.details === "object" ? item.details : {},
      createdAt: item.createdAt || new Date().toISOString(),
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, SYNC_ERROR_RETENTION_LIMIT);
}

function queueSyncError(operation, error, details = {}) {
  const message = typeof error === "string" ? error : error?.message || "Unknown sync error";
  state.syncErrorQueue = normalizeSyncErrorQueue([
    {
      operation,
      message,
      details,
      createdAt: new Date().toISOString(),
    },
    ...state.syncErrorQueue,
  ]);
  saveSyncErrorQueue();
}

function clearSyncedSyncErrors(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return;
  const synced = new Set(ids);
  state.syncErrorQueue = normalizeSyncErrorQueue(state.syncErrorQueue.filter((item) => !synced.has(item.id)));
  saveSyncErrorQueue();
}

function markLocalDirty() {
  if (state.suppressDirty) return;
  saveSyncMeta({ localDirty: true, seedOnly: false });
  updateSyncStatus();
  scheduleAutoSync();
}
