// QuickDot event handling module. Loaded by index.html.
function bindEvents() {
  els.entryForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addEntry();
  });
  els.addEntryButton.addEventListener("click", openEntryDialog);
  els.entryCancel.addEventListener("click", closeEntryDialog);
  els.entryClose.addEventListener("click", closeEntryDialog);

  els.collapsiblePanels.forEach((panel) => {
    const header = panel.querySelector(".collapsible-header");
    header.addEventListener("click", () => {
      const key = panel.dataset.collapsible;
      state.collapseState[key] = !state.collapseState[key];
      saveCollapseState();
      renderCollapseState();
    });
  });

  els.viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setView(button.dataset.view);
    });
  });

  els.prevMonth.addEventListener("click", () => {
    state.calendarMonth = addMonths(state.calendarMonth, -1);
    render();
  });

  els.nextMonth.addEventListener("click", () => {
    state.calendarMonth = addMonths(state.calendarMonth, 1);
    render();
  });

  els.syncButton.addEventListener("click", openSyncDialog);
  els.legendButton.addEventListener("click", openSymbolSettings);
  els.symbolSheetClose.addEventListener("click", closeSymbolSettings);
  els.symbolSheet.addEventListener("click", (event) => {
    if (!event.target.closest(".symbol-footer")) closeSymbolSettings();
  });
  els.searchButton.addEventListener("click", toggleSearchPanel);
  document.addEventListener("click", handleDocumentClick);

  els.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    render();
  });

  els.searchInput.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    state.search = "";
    state.searchOpen = false;
    render();
    els.searchButton.focus();
  });

  els.entryList.addEventListener("pointerdown", startDragHold);
  els.entryList.addEventListener("pointermove", moveDragSort);
  els.entryList.addEventListener("pointerup", finishDragSort);
  els.entryList.addEventListener("pointercancel", cancelDragSort);
  els.entryList.addEventListener("lostpointercapture", cancelDragSort);

  els.main.addEventListener("click", handleMainClick);

  els.calendar.addEventListener("click", (event) => {
    const button = event.target.closest("[data-date]");
    if (!button) return;
    state.selectedDate = button.dataset.date;
    state.calendarMonth = startOfMonth(parseDateKey(state.selectedDate));
    render();
  });

  els.monthIndex.addEventListener("click", (event) => {
    const button = event.target.closest("[data-date]");
    if (!button) return;
    state.selectedDate = button.dataset.date;
    render();
  });

  els.migrationForm.addEventListener("submit", confirmMigration);
  els.migrationCancel.addEventListener("click", closeMigrationDialog);
  els.migrationClose.addEventListener("click", closeMigrationDialog);
  els.yesterdayForm.addEventListener("submit", confirmYesterdayMigration);
  els.yesterdayLater.addEventListener("click", closeYesterdayDialog);
  els.yesterdayClose.addEventListener("click", closeYesterdayDialog);
  els.copyForm.addEventListener("submit", confirmCopy);
  els.copyCancel.addEventListener("click", closeCopyDialog);
  els.copyClose.addEventListener("click", closeCopyDialog);
  els.subitemForm.addEventListener("submit", confirmSubitem);
  els.subitemCancel.addEventListener("click", closeSubitemDialog);
  els.subitemClose.addEventListener("click", closeSubitemDialog);
  els.editForm.addEventListener("submit", confirmEdit);
  els.editCancel.addEventListener("click", closeEditDialog);
  els.editClose.addEventListener("click", closeEditDialog);
  els.deleteForm.addEventListener("submit", confirmDelete);
  els.deleteCancel.addEventListener("click", closeDeleteDialog);
  els.deleteClose.addEventListener("click", closeDeleteDialog);
  els.syncForm.addEventListener("submit", (event) => event.preventDefault());
  els.syncClose.addEventListener("click", closeSyncDialog);
  els.syncSignUp.addEventListener("click", signUpSyncAccount);
  els.syncSignIn.addEventListener("click", signInSyncAccount);
  els.syncSignOut.addEventListener("click", signOutSyncAccount);
  els.syncForgotPassword.addEventListener("click", requestPasswordReset);
  els.syncPull.addEventListener("click", pullFromCloud);
  els.syncPush.addEventListener("click", pushToCloud);
  els.syncNow.addEventListener("click", syncLatest);
  els.passwordResetForm.addEventListener("submit", confirmPasswordReset);
  els.passwordResetCancel.addEventListener("click", closePasswordResetDialog);
  els.passwordResetClose.addEventListener("click", closePasswordResetDialog);
  els.languageButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setLanguage(button.dataset.language);
    });
  });
}

function handleDocumentClick(event) {
  const periodShiftButton = event.target.closest("[data-period-shift]");
  if (periodShiftButton) {
    event.preventDefault();
    window.quickDotShiftVisiblePeriod(Number(periodShiftButton.dataset.periodShift));
    return;
  }

  closeSymbolSettingsOnOutsideClick(event);
}

function closeOpenEntryMenus(exceptMenu = null) {
  els.main.querySelectorAll(".entry-menu[open]").forEach((menu) => {
    if (menu === exceptMenu) return;
    menu.removeAttribute("open");
    menu.closest(".entry-item")?.classList.remove("menu-open");
  });
}

function handleMainClick(event) {
  if (state.dragSort?.didDrag) {
    event.preventDefault();
    event.stopPropagation();
    state.dragSort = null;
    return;
  }

  if (event.target.closest(".empty-action")) {
    closeOpenEntryMenus();
    openEntryDialog();
    return;
  }

  if (handleDateCardExpandClick(event)) return;
  if (handleEntryMenuClick(event)) return;
  if (handleDateNavigationClick(event)) return;
  if (handleSubitemActionClick(event)) return;
  if (handleEntryItemClick(event)) return;

  closeOpenEntryMenus(event.target.closest(".entry-menu"));
}

function handleDateCardExpandClick(event) {
  const moreButton = event.target.closest("[data-expand-date]");
  if (!moreButton) return false;

  closeOpenEntryMenus();
  const date = moreButton.dataset.expandDate;
  if (state.expandedDateCards.has(date)) {
    state.expandedDateCards.delete(date);
  } else {
    state.expandedDateCards.add(date);
  }
  render();
  return true;
}

function handleEntryMenuClick(event) {
  const menuButton = event.target.closest(".entry-menu-button");
  if (!menuButton) return false;

  event.preventDefault();
  const currentMenu = menuButton.closest(".entry-menu");
  const currentItem = menuButton.closest(".entry-item");
  const shouldOpen = !currentMenu.open;
  closeOpenEntryMenus();
  if (shouldOpen) {
    currentMenu.setAttribute("open", "");
    currentItem?.classList.add("menu-open");
  }
  return true;
}

function handleDateNavigationClick(event) {
  const dateButton = event.target.closest("[data-date]");
  if (!dateButton || event.target.closest("[data-id]")) return false;

  closeOpenEntryMenus();
  state.view = "daily";
  state.selectedDate = dateButton.dataset.date;
  state.calendarMonth = startOfMonth(parseDateKey(state.selectedDate));
  render();
  return true;
}

function handleSubitemActionClick(event) {
  const subitemButton = event.target.closest("[data-subitem-action]");
  if (!subitemButton) return false;

  closeOpenEntryMenus(event.target.closest(".entry-menu"));
  const item = event.target.closest("[data-id]");
  if (!item) return true;

  if (subitemButton.dataset.subitemAction === "expand") {
    toggleSubitemPanel(item.dataset.id);
    return true;
  }

  const subitemId = subitemButton.closest("[data-subitem-id]")?.dataset.subitemId;
  if (subitemButton.dataset.subitemAction === "toggle") toggleSubitem(item.dataset.id, subitemId);
  if (subitemButton.dataset.subitemAction === "delete") openDeleteDialog(item.dataset.id, subitemId);
  return true;
}

function handleEntryItemClick(event) {
  const item = event.target.closest("[data-id]");
  if (!item) return false;

  if (event.target.closest(".entry-symbol")) {
    closeOpenEntryMenus();
    toggleDone(item.dataset.id);
    return true;
  }

  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return false;

  closeOpenEntryMenus();
  const action = actionButton.dataset.action;
  if (action === "edit") openEditDialog(item.dataset.id);
  if (action === "subitem") openSubitemDialog(item.dataset.id);
  if (action === "priority") togglePriority(item.dataset.id);
  if (action === "copy") openCopyDialog(item.dataset.id);
  if (action === "migrate") openMigrationDialog(item.dataset.id);
  if (action === "delete") openDeleteDialog(item.dataset.id);
  return true;
}

function closeSymbolSettingsOnOutsideClick(event) {
  if (!state.collapseState.symbols) return;
  if (event.target.closest("#legendButton")) return;

  if (event.target.closest(".symbol-footer")) return;
  closeSymbolSettings();
}

function toggleSearchPanel() {
  state.searchOpen = !state.searchOpen;
  if (!state.searchOpen) state.search = "";
  render();
  if (state.searchOpen) {
    requestAnimationFrame(() => els.searchInput.focus());
  }
}
