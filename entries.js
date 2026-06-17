// QuickDot entries module. Loaded by index.html.
const NOTEKUN_DONE_TOAST_KEYS = [
  "noteKunDoneToast",
  "noteKunDoneToastAlt1",
  "noteKunDoneToastAlt2",
  "noteKunDoneToastAlt3",
];

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

function openEntryActionsDialog(entryId) {
  const entry = state.entries.find((item) => item.id === entryId);
  if (!entry) return;

  closeOpenSwipeRows();
  state.pendingActionEntryId = entryId;
  els.entryActionsPreview.textContent = entry.text;
  updateEntryActionsLabels(entry);
  showDialog(els.entryActionsDialog);
}

function closeEntryActionsDialog() {
  state.pendingActionEntryId = null;
  hideDialog(els.entryActionsDialog);
}

function updateEntryActionsLabels(entry) {
  const priorityButton = els.entryActionButtons.find((button) => button.dataset.entryMenuAction === "priority");
  if (!priorityButton) return;
  const label = priorityButton.querySelector("span:last-child");
  if (label) label.textContent = getMeaning("important");
}

function runEntryActionFromMenu(action) {
  const entryId = state.pendingActionEntryId;
  if (!entryId) return;

  closeEntryActionsDialog();
  if (action === "edit") openEditDialog(entryId);
  if (action === "subitem") openSubitemDialog(entryId);
  if (action === "priority") togglePriority(entryId);
  if (action === "copy") openCopyDialog(entryId);
  if (action === "migrate") openMigrationDialog(entryId);
  if (action === "delete") openDeleteDialog(entryId);
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

function showRandomNoteKunToast(keys) {
  if (!keys.length) return;
  const key = keys[Math.floor(Math.random() * keys.length)];
  showNoteKunToast(t(key));
}

function showDoneNoteKunToast() {
  showRandomNoteKunToast(NOTEKUN_DONE_TOAST_KEYS);
}

function getNoteKunWelcomeKey() {
  const hour = new Date().getHours();
  if (hour < 11) return "noteKunWelcomeMorning";
  if (hour < 17) return "noteKunWelcomeAfternoon";
  return "noteKunWelcomeEvening";
}

function getEntryNoteKunToastKey(type, isImportant, isFirstEntryForDate) {
  if (isFirstEntryForDate) return "noteKunFirstEntryToast";
  if (isImportant) return "noteKunImportantEntryToast";
  if (type === "event") return "noteKunEntryEventToast";
  if (type === "note") return "noteKunEntryNoteToast";
  return "noteKunEntryTaskToast";
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
  const selectedSymbol = getEntrySymbolDefinition(els.entryType.value);
  const entryType = selectedSymbol?.type || "note";
  const isImportant = els.priorityInput.checked;

  state.entries.unshift({
    id: crypto.randomUUID(),
    date: entryDate,
    text,
    type: entryType,
    symbolId: selectedSymbol?.id || entryType,
    done: false,
    important: isImportant,
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
  showNoteKunToast(t(getEntryNoteKunToastKey(entryType, isImportant, isFirstEntryForDate)));
}

function setEntryType(symbolId) {
  if (!getEntrySymbolDefinition(symbolId)) return;
  els.entryType.value = symbolId;
  renderEntryTypeTabs();
}

function renderEntryTypeTabs() {
  const definitions = getQuickAddSymbolDefinitions();
  const currentId = getEntrySymbolDefinition(els.entryType.value)?.id || definitions[0]?.id || "task";
  els.entryType.value = currentId;
  els.entryTypeTabs.replaceChildren();

  definitions.forEach((definition) => {
    const button = document.createElement("button");
    button.className = "entry-type-option";
    button.type = "button";
    button.dataset.entryType = definition.id;
    button.role = "radio";
    const isActive = definition.id === currentId;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-checked", String(isActive));
    button.setAttribute("aria-label", definition.label);

    const symbol = document.createElement("span");
    symbol.className = "entry-type-symbol";
    symbol.textContent = definition.symbol;

    const label = document.createElement("span");
    label.className = "entry-type-label";
    label.textContent = definition.label;

    button.append(symbol, label);
    els.entryTypeTabs.append(button);
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
  showNoteKunToast(t("noteKunSubitemToast"));
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
  showNoteKunToast(t("noteKunCopiedToast"));
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

function deferYesterdayMigration() {
  closeYesterdayDialog();
  showNoteKunToast(t("noteKunYesterdayLaterToast"));
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
  showNoteKunToast(t("noteKunYesterdayMigratedToast", { count: entries.length }));
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
  showNoteKunToast(t("noteKunMigratedToast"));
}
