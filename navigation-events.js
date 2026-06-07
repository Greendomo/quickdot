// QuickDot navigation and shell interaction handlers. Loaded before app-events.js.
function handleDocumentClick(event) {
  const periodShiftButton = event.target.closest("[data-period-shift]");
  if (periodShiftButton) {
    event.preventDefault();
    window.quickDotShiftVisiblePeriod(Number(periodShiftButton.dataset.periodShift));
    return;
  }

  closeSymbolSettingsOnOutsideClick(event);
}

function handleDateNavigationClick(event) {
  const dateButton = event.target.closest("[data-date]");
  if (!dateButton || event.target.closest("[data-id]")) return false;

  closeOpenSwipeRows();
  state.view = "daily";
  state.selectedDate = dateButton.dataset.date;
  state.calendarMonth = startOfMonth(parseDateKey(state.selectedDate));
  render();
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
