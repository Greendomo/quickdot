// QuickDot storage module. Loaded by index.html.
function mergeEntries(current, incoming) {
  const byId = new Map(current.map((entry) => [entry.id, entry]));
  incoming.forEach((entry) => byId.set(entry.id, entry));
  return Array.from(byId.values());
}

function loadEntries() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    const payload = saved ? JSON.parse(saved) : [];
    return normalizeEntries(migratePayload(payload).entries);
  } catch {
    return [];
  }
}

function loadDeletedEntries() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    const payload = saved ? JSON.parse(saved) : [];
    return normalizeDeletedEntries(migratePayload(payload).deletedEntries);
  } catch {
    return [];
  }
}

function hasStoredEntriesPayload() {
  return localStorage.getItem(STORAGE_KEY) !== null || localStorage.getItem(LEGACY_STORAGE_KEY) !== null;
}

function getPayloadEntries(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.entries)) return payload.entries;
  return [];
}

function normalizeEntries(entries) {
  if (!Array.isArray(entries)) return [];
  return entries.filter((entry) => entry && entry.text && entry.date).map(normalizeEntry);
}

function normalizeEntry(entry) {
  const createdAt = entry.createdAt || new Date().toISOString();
  return {
    id: entry.id || crypto.randomUUID(),
    date: entry.date,
    text: String(entry.text),
    type: ["task", "event", "note"].includes(entry.type) ? entry.type : "note",
    done: Boolean(entry.done),
    important: Boolean(entry.important),
    migrated: Boolean(entry.migrated),
    migratedFrom: entry.migratedFrom,
    migrationTarget: entry.migrationTarget,
    migrationTargetId: entry.migrationTargetId,
    migrationSourceId: entry.migrationSourceId,
    copiedFrom: entry.copiedFrom,
    copiedFromId: entry.copiedFromId,
    subitems: normalizeSubitems(entry.subitems),
    sortOrder: normalizeSortOrder(entry.sortOrder),
    createdAt,
    updatedAt: entry.updatedAt || createdAt,
  };
}

function normalizeSubitems(subitems) {
  if (!Array.isArray(subitems)) return [];
  return subitems
    .filter((subitem) => subitem && subitem.text)
    .map((subitem) => ({
      id: subitem.id || crypto.randomUUID(),
      text: String(subitem.text),
      done: Boolean(subitem.done),
      createdAt: subitem.createdAt || new Date().toISOString(),
      updatedAt: subitem.updatedAt || subitem.createdAt || new Date().toISOString(),
    }));
}

function normalizeDeletedEntries(deletedEntries) {
  if (!Array.isArray(deletedEntries)) return [];
  const byId = new Map();
  deletedEntries.forEach((item) => {
    if (!item?.id) return;
    const deletedAt = item.deletedAt || new Date().toISOString();
    const existing = byId.get(item.id);
    if (!existing || new Date(deletedAt) > new Date(existing.deletedAt)) {
      byId.set(item.id, { id: item.id, deletedAt });
    }
  });
  return Array.from(byId.values());
}

function compactDeletedEntries(deletedEntries = state.deletedEntries, queue = state.syncQueue) {
  const cutoff = Date.now() - 1000 * 60 * 60 * 24 * TOMBSTONE_RETENTION_DAYS;
  const queuedDeletes = new Set(normalizeSyncQueue(queue).filter((change) => change.action === "delete").map((change) => change.entryId));
  return normalizeDeletedEntries(deletedEntries).filter((item) => {
    if (queuedDeletes.has(item.id)) return true;
    return new Date(item.deletedAt).getTime() >= cutoff;
  });
}

function normalizeSortOrder(value) {
  const order = Number(value);
  return Number.isFinite(order) ? order : undefined;
}

function saveEntries() {
  state.deletedEntries = compactDeletedEntries();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      entries: state.entries,
      deletedEntries: state.deletedEntries,
      updatedAt: new Date().toISOString(),
    }),
  );
  markLocalDirty();
}

function clearLocalEntriesPayload() {
  state.deletedEntries = [];
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, entries: [], deletedEntries: [] }));
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  saveSyncMeta({ lastSyncAt: null, localDirty: false, seedOnly: false });
}

function loadLanguage() {
  const saved = localStorage.getItem(LANGUAGE_KEY);
  return translations[saved] ? saved : defaultLanguage;
}

function saveLanguage() {
  localStorage.setItem(LANGUAGE_KEY, state.language);
}

function loadSymbolMeanings() {
  localStorage.removeItem(SYMBOL_MEANINGS_KEY);
  localStorage.removeItem(LEGACY_SYMBOL_MEANINGS_KEY);
  return { ...getDefaultSymbolMeanings() };
}

function saveSymbolMeanings() {
  localStorage.removeItem(SYMBOL_MEANINGS_KEY);
  localStorage.removeItem(LEGACY_SYMBOL_MEANINGS_KEY);
}

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

function loadCollapseState() {
  const defaults = { calendar: false, symbols: false };
  try {
    const saved = localStorage.getItem(COLLAPSE_STATE_KEY);
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  } catch {
    return defaults;
  }
}

function saveCollapseState() {
  localStorage.setItem(COLLAPSE_STATE_KEY, JSON.stringify(state.collapseState));
}

function removeSeedEntriesIfUntouched() {
  const meta = loadSyncMeta();
  if (!meta.seedOnly) return;
  if (meta.localDirty || state.syncQueue.length > 0) return;
  if (!state.entries.length) return;
  if (!state.entries.every(isSeedEntry)) return;

  state.suppressDirty = true;
  state.entries = [];
  state.deletedEntries = [];
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      entries: [],
      deletedEntries: [],
      updatedAt: new Date().toISOString(),
    }),
  );
  state.suppressDirty = false;
  saveSyncMeta({ localDirty: false, seedOnly: false });
}

function isSeedEntry(entry) {
  const seedTexts = new Set([
    "規劃這週最重要的三件事",
    "下午和設計討論首頁流程",
    "新增筆記時先追求低摩擦，再補整理工具",
    "整理閱讀清單",
  ]);
  return seedTexts.has(entry.text);
}

function seedEntries() {
  const today = toDateKey(new Date());
  const yesterday = toDateKey(addDays(new Date(), -1));
  return [
    {
      id: crypto.randomUUID(),
      date: today,
      text: "規劃這週最重要的三件事",
      type: "task",
      done: false,
      important: true,
      migrated: false,
      subitems: [
        {
          id: crypto.randomUUID(),
          text: "拆成可執行的小步驟",
          done: false,
          createdAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      date: today,
      text: "下午和設計討論首頁流程",
      type: "event",
      done: false,
      important: false,
      migrated: false,
      subitems: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      date: today,
      text: "新增筆記時先追求低摩擦，再補整理工具",
      type: "note",
      done: false,
      important: false,
      migrated: false,
      subitems: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      date: yesterday,
      text: "整理閱讀清單",
      type: "task",
      done: false,
      important: false,
      migrated: false,
      subitems: [],
      createdAt: addDays(new Date(), -1).toISOString(),
    },
  ];
}
