// QuickDot entry data operations. Loaded by index.html before entries.js.
function toggleDone(id) {
  const entry = state.entries.find((item) => item.id === id);
  const shouldCelebrate = entry && !entry.done;
  updateEntry(id, (entry) => {
    entry.done = !entry.done;
  });
  if (shouldCelebrate) showNoteKunToast(t("noteKunDoneToast"));
}

function togglePriority(id) {
  updateEntry(id, (entry) => {
    entry.important = !entry.important;
  });
}

function deleteEntry(id) {
  const deletedAt = new Date().toISOString();
  state.deletedEntries.push({ id, deletedAt });
  queueEntryDelete(id, deletedAt);
  state.entries = state.entries.filter((entry) => entry.id !== id);
  saveEntries();
  render();
}

function updateEntry(id, mutator, options = {}) {
  const entry = state.entries.find((item) => item.id === id);
  if (!entry) return;
  ensureSubitems(entry);
  mutator(entry);
  entry.updatedAt = new Date().toISOString();
  queueEntryUpsert(entry);
  saveEntries();
  if (options.preserveScroll) {
    renderPreservingScroll();
  } else {
    render();
  }
}

function toggleSubitem(entryId, subitemId) {
  if (!subitemId) return;
  updateEntry(entryId, (entry) => {
    const subitem = ensureSubitems(entry).find((item) => item.id === subitemId);
    if (subitem) subitem.done = !subitem.done;
  }, { preserveScroll: true });
}

function toggleSubitemPanel(entryId) {
  if (state.expandedSubitems.has(entryId)) {
    state.expandedSubitems.delete(entryId);
  } else {
    state.expandedSubitems.add(entryId);
  }
  renderPreservingScroll();
}

function deleteSubitem(entryId, subitemId) {
  if (!subitemId) return;
  updateEntry(entryId, (entry) => {
    entry.subitems = ensureSubitems(entry).filter((item) => item.id !== subitemId);
  }, { preserveScroll: true });
}

function persistVisibleEntryOrder() {
  const now = new Date().toISOString();
  const ids = Array.from(els.entryList.querySelectorAll(".entry-item")).map((item) => item.dataset.id);
  ids.forEach((id, index) => {
    const entry = state.entries.find((item) => item.id === id);
    if (entry && entry.date === state.selectedDate) {
      entry.sortOrder = index;
      entry.updatedAt = now;
      queueEntryUpsert(entry);
    }
  });
}

function copyEntryToDate(entry, targetDate) {
  const now = new Date().toISOString();
  const copiedEntry = {
    id: crypto.randomUUID(),
    date: targetDate,
    text: entry.text,
    type: entry.type,
    done: entry.done,
    important: entry.important,
    migrated: false,
    migratedFrom: null,
    migrationTarget: null,
    migrationTargetId: null,
    migrationSourceId: null,
    copiedFrom: entry.date,
    copiedFromId: entry.id,
    subitems: ensureSubitems(entry).map((subitem) => ({
      id: crypto.randomUUID(),
      text: subitem.text,
      done: subitem.done,
      createdAt: subitem.createdAt || new Date().toISOString(),
      updatedAt: now,
    })),
    sortOrder: getTopSortOrder(targetDate),
    createdAt: now,
    updatedAt: now,
  };
  state.entries.unshift(copiedEntry);
  queueEntryUpsert(copiedEntry);
}

function migrateEntryToDate(entry, targetDate) {
  const now = new Date().toISOString();
  entry.migrated = true;
  entry.done = false;
  entry.migrationTarget = targetDate;
  entry.updatedAt = now;
  queueEntryUpsert(entry);

  let targetEntry = entry.migrationTargetId
    ? state.entries.find((item) => item.id === entry.migrationTargetId)
    : null;

  if (!targetEntry) {
    targetEntry = {
      id: crypto.randomUUID(),
      text: entry.text,
      createdAt: now,
    };
    entry.migrationTargetId = targetEntry.id;
    state.entries.unshift(targetEntry);
  }

  Object.assign(targetEntry, {
    date: targetDate,
    text: entry.text,
    type: entry.type,
    done: false,
    important: entry.important,
    migrated: false,
    migratedFrom: entry.date,
    migrationSourceId: entry.id,
    subitems: ensureSubitems(entry).map((subitem) => ({
      ...subitem,
      id: crypto.randomUUID(),
      done: false,
      updatedAt: now,
    })),
    sortOrder: getTopSortOrder(targetDate),
    updatedAt: now,
  });
  queueEntryUpsert(targetEntry);
}
