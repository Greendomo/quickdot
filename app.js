// QuickDot app module. Loaded by index.html.
async function boot() {
  if (shouldClearLocalEntries()) {
    clearLocalEntriesPayload();
    removeClearLocalQuery();
  }

  const hasStoredEntries = hasStoredEntriesPayload();
  state.language = loadLanguage();
  state.entries = loadEntries();
  state.deletedEntries = loadDeletedEntries();
  state.syncQueue = loadSyncQueue();
  state.syncErrorQueue = loadSyncErrorQueue();
  state.symbolMeanings = loadSymbolMeanings();
  state.collapseState = loadCollapseState();
  if (!hasStoredEntries && state.entries.length === 0) {
    state.entries = seedEntries();
    state.suppressDirty = true;
    saveEntries();
    state.suppressDirty = false;
    saveSyncMeta({ localDirty: false, seedOnly: true });
  }
  bindEvents();
  render();
  registerServiceWorker();
  await initSync();
  setTimeout(openYesterdayMigrationPrompt, 250);
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
  document.querySelector(".symbol-footer")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function setView(view) {
  closeOpenEntryMenus();
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
  setTimeout(openYesterdayMigrationPrompt, 250);
});
