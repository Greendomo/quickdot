// QuickDot preference persistence helpers. Loaded by index.html before app.js.
function loadLanguage() {
  const saved = localStorage.getItem(LANGUAGE_KEY);
  return translations[saved] ? saved : defaultLanguage;
}

function saveLanguage() {
  localStorage.setItem(LANGUAGE_KEY, state.language);
}

function loadSymbolMeanings() {
  localStorage.removeItem(SYMBOL_MEANINGS_KEY);
  localStorage.removeItem(LEGACY_SYMBOL_MEANINGS_KEY);
  return { ...getDefaultSymbolMeanings() };
}

function saveSymbolMeanings() {
  localStorage.removeItem(SYMBOL_MEANINGS_KEY);
  localStorage.removeItem(LEGACY_SYMBOL_MEANINGS_KEY);
}

function loadCollapseState() {
  const defaults = { calendar: false, symbols: false };
  try {
    const saved = localStorage.getItem(COLLAPSE_STATE_KEY);
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  } catch {
    return defaults;
  }
}

function saveCollapseState() {
  localStorage.setItem(COLLAPSE_STATE_KEY, JSON.stringify(state.collapseState));
}
