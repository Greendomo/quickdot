// QuickDot render module. Loaded by index.html.
function render() {
  if (state.renderedStaticLanguage !== state.language) {
    renderLanguage();
    renderStaticText();
    state.renderedStaticLanguage = state.language;
  }
  els.todayLabel.textContent = formatDateLong(new Date());
  renderCollapseState();
  renderSymbolMeanings();
  renderSearchPanel();
  renderViewShell();
  renderCalendar();
  renderActiveView();
}

function renderPreservingScroll() {
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  render();
  window.scrollTo(scrollX, scrollY);
  window.requestAnimationFrame(() => window.scrollTo(scrollX, scrollY));
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
