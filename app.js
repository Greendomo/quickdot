// QuickDot app module. Loaded by index.html.
const NOTEKUN_WELCOME_STORAGE_KEY = "quickdot_notekun_welcome_date";
const NOTEKUN_LAST_OPEN_STORAGE_KEY = "quickdot_notekun_last_open_date";

async function boot() {
  if (shouldClearLocalEntries()) {
    clearLocalEntriesPayload();
    removeClearLocalQuery();
  }

  state.language = loadLanguage();
  state.entries = loadEntries();
  state.deletedEntries = loadDeletedEntries();
  state.syncQueue = loadSyncQueue();
  state.syncErrorQueue = loadSyncErrorQueue();
  state.symbolMeanings = loadSymbolMeanings();
  state.collapseState = loadCollapseState();
  removeSeedEntriesIfUntouched();
  bindEvents();
  render();
  registerServiceWorker();
  await initSync();
  scheduleStartupNoteKun();
}

function scheduleStartupNoteKun() {
  setTimeout(() => {
    openYesterdayMigrationPrompt();
    if (!els.yesterdayDialog?.open) {
      setTimeout(showNoteKunWelcomeOnce, 450);
    }
  }, 250);
}

function showNoteKunWelcomeOnce() {
  if (!els.noteKunToast || els.yesterdayDialog?.open) return;

  const todayKey = toDateKey(new Date());
  let messageKey = getNoteKunWelcomeKey();
  try {
    if (localStorage.getItem(NOTEKUN_WELCOME_STORAGE_KEY) === todayKey) return;
    const lastOpenKey = localStorage.getItem(NOTEKUN_LAST_OPEN_STORAGE_KEY);
    if (lastOpenKey) {
      const daysAway = Math.floor((parseDateKey(todayKey) - parseDateKey(lastOpenKey)) / (24 * 60 * 60 * 1000));
      if (daysAway >= 3) messageKey = "noteKunReturnToast";
    }
    localStorage.setItem(NOTEKUN_WELCOME_STORAGE_KEY, todayKey);
    localStorage.setItem(NOTEKUN_LAST_OPEN_STORAGE_KEY, todayKey);
  } catch (_) {
    // The greeting is optional; storage errors should never block the app.
  }

  showNoteKunToast(t(messageKey));
}

function shouldClearLocalEntries() {
  return new URLSearchParams(window.location.search).has("clearLocal");
}

function removeClearLocalQuery() {
  const url = new URL(window.location.href);
  url.searchParams.delete("clearLocal");
  window.history.replaceState({}, "", url.href);
}

function setLanguage(language) {
  if (!translations[language] || language === state.language) return;
  state.language = language;
  state.symbolMeanings = { ...getDefaultSymbolMeanings() };
  saveSymbolMeanings();
  saveLanguage();
  render();
  updateSyncStatus();
}

function openSymbolSettings() {
  closeSyncDialog();
  state.collapseState.symbols = true;
  saveCollapseState();
  renderCollapseState();
  requestAnimationFrame(() => els.symbolSheetClose?.focus());
}

function closeSymbolSettings() {
  state.collapseState.symbols = false;
  saveCollapseState();
  renderCollapseState();
}

function setView(view) {
  closeOpenSwipeRows();
  state.view = view;

  if (view === "daily") {
    const today = new Date();
    state.selectedDate = toDateKey(today);
    state.calendarMonth = startOfMonth(today);
  }

  if (view === "weekly") {
    const today = new Date();
    state.selectedDate = toDateKey(today);
    state.calendarMonth = startOfMonth(today);
  }

  if (view === "monthly") {
    const today = new Date();
    state.calendarMonth = startOfMonth(today);
    state.selectedDate = toDateKey(today);
  }

  if (view === "future") {
    const firstFutureMonth = addMonths(startOfMonth(new Date()), 1);
    state.calendarMonth = firstFutureMonth;
    state.selectedDate = toDateKey(firstFutureMonth);
  }

  render();
}

function shiftVisiblePeriod(direction) {
  closeOpenSwipeRows();

  if (state.view === "monthly") {
    const nextMonth = addMonths(state.calendarMonth, direction);
    state.calendarMonth = startOfMonth(nextMonth);
    state.selectedDate = toDateKey(state.calendarMonth);
    render();
    return;
  }

  if (state.view !== "daily" && state.view !== "weekly") return;

  const dayOffset = state.view === "weekly" ? direction * 7 : direction;
  const nextDate = addDays(parseDateKey(state.selectedDate), dayOffset);
  state.selectedDate = toDateKey(nextDate);
  state.calendarMonth = startOfMonth(nextDate);
  render();
}

window.quickDotShiftVisiblePeriod = shiftVisiblePeriod;

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (window.location.protocol === "file:") return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // The app still works online if service worker registration is unavailable.
    });
  });
}

boot().catch(() => {
  scheduleStartupNoteKun();
});
