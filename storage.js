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
