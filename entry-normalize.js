// QuickDot entry normalization helpers. Loaded by index.html before storage.js.
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
