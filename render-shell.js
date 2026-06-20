// QuickDot shell state rendering module. Loaded by index.html before render.js.
function renderCollapseState() {
  els.collapsiblePanels.forEach((panel) => {
    const key = panel.dataset.collapsible;
    const isOpen = Boolean(state.collapseState[key]);
    const header = panel.querySelector(".collapsible-header");
    panel.classList.toggle("open", isOpen);
    header.setAttribute("aria-expanded", String(isOpen));
  });

  const symbolsOpen = Boolean(state.collapseState.symbols);
  if (els.symbolSheet) {
    els.symbolSheet.hidden = !symbolsOpen;
    els.symbolSheet.classList.toggle("open", symbolsOpen);
  }
}

function renderSymbolMeanings() {
  const signature = makeSymbolRenderSignature();
  if (state.renderedSymbolSignature === signature) return;
  state.renderedSymbolSignature = signature;
  renderSymbolSettings();
  renderEntryTypeTabs();
  els.priorityLabel.textContent = getMeaning("important");
}

function makeSymbolRenderSignature() {
  return JSON.stringify({
    language: state.language,
    definitions: getSymbolDefinitions().map((definition) => ({
      id: definition.id,
      symbol: definition.symbol,
      label: definition.label,
      description: definition.description || "",
      role: definition.role,
      quickAdd: definition.quickAdd !== false,
    })),
  });
}

function renderSearchPanel() {
  const isOpen = state.searchOpen || Boolean(state.search);
  els.searchPanel.hidden = !isOpen;
  els.searchButton.classList.toggle("active", isOpen);
  els.searchButton.setAttribute("aria-expanded", String(isOpen));

  if (document.activeElement !== els.searchInput) {
    els.searchInput.value = state.search;
  }
}

function renderViewShell() {
  if (state.view !== "daily" || state.search) state.sortMode = false;
  document.body.dataset.view = state.view;
  document.body.classList.toggle("sort-mode-active", state.sortMode);
  els.viewEyebrow.textContent = t("navDaily");

  els.viewButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.view);
  });

  els.viewPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.viewPanel === state.view);
  });

  if (state.view === "daily") {
    els.viewTitle.textContent = formatV0DayTitle(parseDateKey(state.selectedDate));
    els.entryDate.value = state.selectedDate;
  }

  if (state.view === "weekly") {
    els.viewTitle.textContent = formatWeekTitle(parseDateKey(state.selectedDate));
    els.entryDate.value = state.selectedDate;
  }

  if (state.view === "monthly") {
    els.viewTitle.textContent = formatDateWithOptions(state.calendarMonth, { month: "long" });
    els.entryDate.value = state.selectedDate;
  }

  if (state.view === "future") {
    els.viewTitle.textContent = t("futureLog");
    els.entryDate.value = getDefaultEntryDate();
  }

  updatePeriodNavLabels();
  renderSortModeControl();
}

function renderSortModeControl() {
  const canSort = state.view === "daily" && !state.search && filteredEntries().length > 1;
  els.sortModeButton.hidden = state.view !== "daily";
  els.sortModeButton.disabled = !canSort;
  els.sortModeButton.classList.toggle("active", state.sortMode);
  els.sortModeButton.textContent = state.sortMode ? t("sortDone") : t("sortMode");
  els.sortModeButton.setAttribute("aria-pressed", String(state.sortMode));
  els.sortModeButton.setAttribute("aria-label", state.sortMode ? t("sortDone") : t("sortMode"));
}

function updatePeriodNavLabels() {
  const previousLabel = state.view === "monthly" ? t("previousMonth") : state.view === "weekly" ? t("previousWeek") : t("previousDay");
  const nextLabel = state.view === "monthly" ? t("nextMonth") : state.view === "weekly" ? t("nextWeek") : t("nextDay");
  els.prevDailyDate.setAttribute("aria-label", previousLabel);
  els.prevDailyDate.title = previousLabel;
  els.nextDailyDate.setAttribute("aria-label", nextLabel);
  els.nextDailyDate.title = nextLabel;
}

function formatV0DayTitle(date) {
  return formatDateWithOptions(date, { month: "short", day: "numeric" });
}

function formatWeekTitle(date) {
  const start = startOfWeek(date);
  const end = endOfWeek(date);
  const sameMonth = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
  if (state.language === "en") {
    const startLabel = formatDateWithOptions(start, { month: "short", day: "numeric" });
    const endLabel = sameMonth
      ? formatDateWithOptions(end, { day: "numeric" })
      : formatDateWithOptions(end, { month: "short", day: "numeric" });
    return `${startLabel} - ${endLabel}`;
  }

  const startLabel = formatDateWithOptions(start, { month: "numeric", day: "numeric" });
  const endLabel = sameMonth
    ? String(end.getDate())
    : formatDateWithOptions(end, { month: "numeric", day: "numeric" });
  return `${startLabel} - ${endLabel}`;
}
