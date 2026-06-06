// QuickDot event handling module. Loaded by index.html.
function bindEvents() {
  els.entryForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addEntry();
  });
  els.addEntryButton.addEventListener("click", openEntryDialog);
  els.entryCancel.addEventListener("click", closeEntryDialog);
  els.entryClose.addEventListener("click", closeEntryDialog);
  els.entryTypeOptions.forEach((button) => {
    button.addEventListener("click", () => setEntryType(button.dataset.entryType));
  });

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

  els.entryList.addEventListener("pointerdown", startEntrySwipe);
  els.entryList.addEventListener("pointermove", moveEntrySwipe);
  els.entryList.addEventListener("pointerup", finishEntrySwipe);
  els.entryList.addEventListener("pointercancel", cancelEntrySwipe);
  els.entryList.addEventListener("lostpointercapture", cancelEntrySwipe);
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
