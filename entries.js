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
  renderEntryTypeTabs();
  showDialog(els.entryDialog, els.entryText);
}

function closeEntryDialog() {
  els.entryText.value = "";
  els.priorityInput.checked = false;
  hideDialog(els.entryDialog);
}

function showNoteKunToast(message) {
  if (!els.noteKunToast || !els.noteKunToastMessage) return;
  window.clearTimeout(state.noteKunToastTimer);
  els.noteKunToastMessage.textContent = message;
  els.noteKunToast.hidden = false;
  els.noteKunToast.classList.remove("visible");
  requestAnimationFrame(() => els.noteKunToast.classList.add("visible"));
  state.noteKunToastTimer = window.setTimeout(() => {
    els.noteKunToast.classList.remove("visible");
    state.noteKunToastTimer = window.setTimeout(() => {
      els.noteKunToast.hidden = true;
      state.noteKunToastTimer = null;
    }, 220);
  }, 2200);
}

function addEntry() {
  const text = els.entryText.value.trim();
  if (!text) {
    els.entryText.focus();
    return;
  }

  const entryDate = els.entryDate.value || getDefaultEntryDate();
  const now = new Date().toISOString();
  const isFirstEntryForDate = !state.entries.some((entry) => entry.date === entryDate);

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
  if (isFirstEntryForDate) showNoteKunToast(t("noteKunFirstEntryToast"));
}

function setEntryType(type) {
  if (!["task", "event", "note"].includes(type)) return;
  els.entryType.value = type;
  renderEntryTypeTabs();
}

function renderEntryTypeTabs() {
  const pickerSymbols = {
    task: "•",
    event: "◦",
    note: "–",
  };
  const currentType = els.entryType.value || "task";

  els.entryTypeOptions.forEach((button) => {
    const type = button.dataset.entryType;
    const isActive = type === currentType;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-checked", String(isActive));
    button.querySelector(".entry-type-symbol").textContent = pickerSymbols[type] || typeSymbol[type] || "";
    button.querySelector(".entry-type-label").textContent = getTypeLabel(type);
  });
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
