// QuickDot render module. Loaded by index.html.
function render() {
  renderLanguage();
  renderStaticText();
  els.todayLabel.textContent = formatDateLong(new Date());
  renderCollapseState();
  renderSymbolMeanings();
  renderSearchPanel();
  renderViewShell();
  renderCalendar();
  renderActiveView();
}

function renderActiveView() {
  if (state.view === "daily") {
    renderEntries();
    renderMonthIndex();
    return;
  }

  if (state.view === "weekly") {
    renderWeeklyLog();
    return;
  }

  if (state.view === "monthly") {
    renderMonthlyLog();
    return;
  }

  if (state.view === "future") {
    renderFutureLog();
  }
}
