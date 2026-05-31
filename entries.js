// QuickDot entries module. Loaded by index.html.
function showDialog(dialog, focusTarget = null) {
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
  focusTarget?.focus();
}

function hideDialog(dialog) {
  if (dialog.open) dialog.close();
}

function openEntryDialog() {
  els.entryDate.value = getDefaultEntryDate();
  showDialog(els.entryDialog, els.entryText);
}

function closeEntryDialog() {
  els.entryText.value = "";
  els.priorityInput.checked = false;
  hideDialog(els.entryDialog);
}

function addEntry() {
  const text = els.entryText.value.trim();
  if (!text) {
    els.entryText.focus();
    return;
  }

  const entryDate = els.entryDate.value || getDefaultEntryDate();
  const now = new Date().toISOString();

  state.entries.unshift({
    id: crypto.randomUUID(),
    date: entryDate,
    text,
    type: els.entryType.value,
    done: false,
    important: els.priorityInput.checked,
    migrated: false,
    subitems: [],
    sortOrder: getTopSortOrder(entryDate),
    createdAt: now,
    updatedAt: now,
  });
  queueEntryUpsert(state.entries[0]);

  state.selectedDate = entryDate;
  state.calendarMonth = startOfMonth(parseDateKey(entryDate));
  els.entryText.value = "";
  els.priorityInput.checked = false;
  saveEntries();
  render();
  closeEntryDialog();
}

function toggleDone(id) {
  updateEntry(id, (entry) => {
    entry.done = !entry.done;
  });
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

function openDeleteDialog(entryId, subitemId = null) {
  const entry = state.entries.find((item) => item.id === entryId);
  if (!entry) return;

  const subitem = subitemId ? ensureSubitems(entry).find((item) => item.id === subitemId) : null;
  state.pendingDelete = { entryId, subitemId };
  els.deletePreview.textContent = subitem
    ? t("deleteSubitemConfirm", { text: subitem.text })
    : t("deleteEntryConfirm", {
        text: entry.text,
        children: ensureSubitems(entry).length ? t("deleteEntryChildren") : "",
      });

  showDialog(els.deleteDialog);
}

function closeDeleteDialog() {
  state.pendingDelete = null;
  hideDialog(els.deleteDialog);
}

function confirmDelete(event) {
  event.preventDefault();
  if (!state.pendingDelete) return;

  const { entryId, subitemId } = state.pendingDelete;
  closeDeleteDialog();

  if (subitemId) {
    deleteSubitem(entryId, subitemId);
  } else {
    deleteEntry(entryId);
  }
}

function updateEntry(id, mutator) {
  const entry = state.entries.find((item) => item.id === id);
  if (!entry) return;
  ensureSubitems(entry);
  mutator(entry);
  entry.updatedAt = new Date().toISOString();
  queueEntryUpsert(entry);
  saveEntries();
  render();
}

function openSubitemDialog(id) {
  const entry = state.entries.find((item) => item.id === id);
  if (!entry) return;

  state.pendingSubitemId = id;
  els.subitemPreview.textContent = entry.text;
  els.subitemText.value = "";

  showDialog(els.subitemDialog, els.subitemText);
}

function closeSubitemDialog() {
  state.pendingSubitemId = null;
  els.subitemText.value = "";
  hideDialog(els.subitemDialog);
}

function confirmSubitem(event) {
  event.preventDefault();
  const text = els.subitemText.value.trim();
  if (!state.pendingSubitemId || !text) {
    els.subitemText.focus();
    return;
  }

  state.expandedSubitems.add(state.pendingSubitemId);
  updateEntry(state.pendingSubitemId, (entry) => {
    ensureSubitems(entry).push({
      id: crypto.randomUUID(),
      text,
      done: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });
  closeSubitemDialog();
}

function openEditDialog(id) {
  const entry = state.entries.find((item) => item.id === id);
  if (!entry) return;

  state.pendingEditId = id;
  els.editPreview.textContent = formatShortDate(parseDateKey(entry.date));
  els.editText.value = entry.text;

  showDialog(els.editDialog, els.editText);
  els.editText.select();
}

function closeEditDialog() {
  state.pendingEditId = null;
  els.editText.value = "";
  hideDialog(els.editDialog);
}

function confirmEdit(event) {
  event.preventDefault();
  const text = els.editText.value.trim();
  if (!state.pendingEditId || !text) {
    els.editText.focus();
    return;
  }

  updateEntry(state.pendingEditId, (entry) => {
    entry.text = text;
  });
  closeEditDialog();
}

function toggleSubitem(entryId, subitemId) {
  if (!subitemId) return;
  updateEntry(entryId, (entry) => {
    const subitem = ensureSubitems(entry).find((item) => item.id === subitemId);
    if (subitem) subitem.done = !subitem.done;
  });
}

function toggleSubitemPanel(entryId) {
  if (state.expandedSubitems.has(entryId)) {
    state.expandedSubitems.delete(entryId);
  } else {
    state.expandedSubitems.add(entryId);
  }
  render();
}

function deleteSubitem(entryId, subitemId) {
  if (!subitemId) return;
  updateEntry(entryId, (entry) => {
    entry.subitems = ensureSubitems(entry).filter((item) => item.id !== subitemId);
  });
}

function startDragHold(event) {
  if (!canDragSort()) return;
  if (event.button !== undefined && event.button !== 0) return;
  if (event.target.closest("button, input, select, textarea, a, .entry-menu, .entry-actions, .subitem-list")) return;

  const item = event.target.closest(".entry-item");
  if (!item || !els.entryList.contains(item)) return;

  const pointerId = event.pointerId;
  state.dragSort = {
    item,
    pointerId,
    startY: event.clientY,
    dragging: false,
    didDrag: false,
    timer: window.setTimeout(() => beginDragSort(pointerId), 450),
  };

  item.classList.add("drag-armed");
  item.setPointerCapture?.(pointerId);
}

function beginDragSort(pointerId) {
  if (!state.dragSort || state.dragSort.pointerId !== pointerId) return;
  state.dragSort.dragging = true;
  state.dragSort.didDrag = true;
  state.dragSort.item.classList.remove("drag-armed");
  state.dragSort.item.classList.add("dragging");
  els.entryList.classList.add("sorting");
}

function moveDragSort(event) {
  const drag = state.dragSort;
  if (!drag || drag.pointerId !== event.pointerId) return;

  if (!drag.dragging && Math.abs(event.clientY - drag.startY) > 10) {
    cancelDragSort();
    return;
  }

  if (!drag.dragging) return;
  event.preventDefault();

  const afterElement = getDragAfterElement(event.clientY);
  if (!afterElement) {
    els.entryList.append(drag.item);
  } else {
    els.entryList.insertBefore(drag.item, afterElement);
  }
}

function finishDragSort(event) {
  const drag = state.dragSort;
  if (!drag || drag.pointerId !== event.pointerId) return;

  window.clearTimeout(drag.timer);
  drag.item.classList.remove("drag-armed");

  if (drag.dragging) {
    drag.item.classList.remove("dragging");
    els.entryList.classList.remove("sorting");
    persistVisibleEntryOrder();
    saveEntries();
    render();
    state.dragSort = { didDrag: true };
    window.setTimeout(() => {
      if (state.dragSort?.didDrag) state.dragSort = null;
    }, 0);
    return;
  }

  state.dragSort = null;
}

function cancelDragSort() {
  if (!state.dragSort) return;
  if (state.dragSort.didDrag) return;
  window.clearTimeout(state.dragSort.timer);
  state.dragSort.item?.classList.remove("drag-armed", "dragging");
  els.entryList.classList.remove("sorting");
  state.dragSort = null;
}

function canDragSort() {
  return state.view === "daily" && state.search === "";
}

function getDragAfterElement(y) {
  const items = Array.from(els.entryList.querySelectorAll(".entry-item:not(.dragging)"));
  return items.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) return { offset, element: child };
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null },
  ).element;
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

function openCopyDialog(id) {
  const entry = state.entries.find((item) => item.id === id);
  if (!entry) return;

  state.pendingCopyId = id;
  els.copyPreview.textContent = entry.text;
  els.copyDate.value = getSuggestedCopyDate(entry);

  showDialog(els.copyDialog, els.copyDate);
}

function closeCopyDialog() {
  state.pendingCopyId = null;
  hideDialog(els.copyDialog);
}

function confirmCopy(event) {
  event.preventDefault();
  const targetDate = els.copyDate.value;
  if (!state.pendingCopyId || !targetDate) return;

  const entry = state.entries.find((item) => item.id === state.pendingCopyId);
  if (!entry) {
    closeCopyDialog();
    return;
  }

  if (targetDate === entry.date) {
    alert(t("migrateDifferentDate"));
    els.copyDate.focus();
    return;
  }

  copyEntryToDate(entry, targetDate);
  state.selectedDate = targetDate;
  state.calendarMonth = startOfMonth(parseDateKey(targetDate));
  closeCopyDialog();
  saveEntries();
  render();
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

function openMigrationDialog(id) {
  const entry = state.entries.find((item) => item.id === id);
  if (!entry) return;

  state.pendingMigrationId = id;
  els.migrationPreview.textContent = entry.text;
  els.migrationDate.value = entry.migrationTarget || getSuggestedMigrationDate(entry);

  showDialog(els.migrationDialog, els.migrationDate);
}

function closeMigrationDialog() {
  state.pendingMigrationId = null;
  hideDialog(els.migrationDialog);
}

function openYesterdayMigrationPrompt() {
  const entries = getYesterdayOpenEntries();
  if (entries.length === 0) return;
  if (els.yesterdayDialog.open) return;

  els.yesterdayPreview.textContent = t("yesterdayPrompt", { count: entries.length });
  els.yesterdayList.replaceChildren(
    ...entries.map((entry) => {
      const item = document.createElement("li");
      item.textContent = entry.text;
      return item;
    }),
  );

  showDialog(els.yesterdayDialog);
}

function closeYesterdayDialog() {
  hideDialog(els.yesterdayDialog);
}

function confirmYesterdayMigration(event) {
  event.preventDefault();
  const today = toDateKey(new Date());
  const entries = getYesterdayOpenEntries();
  if (entries.length === 0) {
    closeYesterdayDialog();
    return;
  }

  entries.forEach((entry) => migrateEntryToDate(entry, today));
  state.view = "daily";
  state.selectedDate = today;
  state.calendarMonth = startOfMonth(new Date());
  closeYesterdayDialog();
  saveEntries();
  render();
}

function confirmMigration(event) {
  event.preventDefault();
  const targetDate = els.migrationDate.value;
  if (!state.pendingMigrationId || !targetDate) return;

  const entry = state.entries.find((item) => item.id === state.pendingMigrationId);
  if (!entry) {
    closeMigrationDialog();
    return;
  }

  if (targetDate === entry.date) {
    alert(t("migrateDifferentDate"));
    els.migrationDate.focus();
    return;
  }

  migrateEntryToDate(entry, targetDate);
  state.selectedDate = targetDate;
  state.calendarMonth = startOfMonth(parseDateKey(targetDate));
  closeMigrationDialog();
  saveEntries();
  render();
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
