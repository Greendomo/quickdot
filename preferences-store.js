// QuickDot preference persistence helpers. Loaded by index.html before app.js.
function loadLanguage() {
  const saved = localStorage.getItem(LANGUAGE_KEY);
  return translations[saved] ? saved : defaultLanguage;
}

function saveLanguage() {
  localStorage.setItem(LANGUAGE_KEY, state.language);
}

function loadSymbolMeanings() {
  const definitions = loadSymbolDefinitions();
  return Object.fromEntries(definitions.map((definition) => [definition.id, definition.label]));
}

function loadSymbolDefinitions() {
  try {
    const deletedSymbols = loadDeletedSymbolDefinitions();
    const saved = localStorage.getItem(SYMBOL_DEFINITIONS_KEY);
    if (saved) return filterDeletedSymbolDefinitions(JSON.parse(saved), deletedSymbols);

    const payloadSaved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (payloadSaved) {
      const payload = migratePayload(JSON.parse(payloadSaved));
      const payloadDeletedSymbols = normalizeDeletedSymbolDefinitions([...deletedSymbols, ...normalizeDeletedSymbolDefinitions(payload.deletedSymbolDefinitions)]);
      if (payload.symbolDefinitions) return filterDeletedSymbolDefinitions(payload.symbolDefinitions, payloadDeletedSymbols);
      if (payload.symbolMeanings) return filterDeletedSymbolDefinitions(migrateMeaningsToSymbolDefinitions(payload.symbolMeanings), payloadDeletedSymbols);
    }

    const legacy = localStorage.getItem(SYMBOL_MEANINGS_KEY) || localStorage.getItem(LEGACY_SYMBOL_MEANINGS_KEY);
    if (legacy) return filterDeletedSymbolDefinitions(migrateMeaningsToSymbolDefinitions(JSON.parse(legacy)), deletedSymbols);
  } catch {
    // Fall through to defaults when stored preferences are corrupted.
  }
  return getDefaultSymbolDefinitions();
}

function loadDeletedSymbolDefinitions() {
  try {
    const saved = localStorage.getItem(DELETED_SYMBOL_DEFINITIONS_KEY);
    const deletedSymbols = saved ? JSON.parse(saved) : [];
    const payloadSaved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!payloadSaved) return normalizeDeletedSymbolDefinitions(deletedSymbols);
    const payload = migratePayload(JSON.parse(payloadSaved));
    return normalizeDeletedSymbolDefinitions([
      ...deletedSymbols,
      ...normalizeDeletedSymbolDefinitions(payload.deletedSymbolDefinitions),
    ]);
  } catch {
    return [];
  }
}

function saveSymbolDefinitions() {
  state.deletedSymbolDefinitions = compactDeletedSymbolDefinitions(state.deletedSymbolDefinitions);
  localStorage.setItem(DELETED_SYMBOL_DEFINITIONS_KEY, JSON.stringify(state.deletedSymbolDefinitions));
  const definitions = filterDeletedSymbolDefinitions(state.symbolDefinitions, state.deletedSymbolDefinitions);
  state.symbolDefinitions = definitions;
  localStorage.setItem(SYMBOL_DEFINITIONS_KEY, JSON.stringify(definitions));
  state.symbolMeanings = Object.fromEntries(definitions.map((definition) => [definition.id, definition.label]));
  localStorage.setItem(SYMBOL_MEANINGS_KEY, JSON.stringify(state.symbolMeanings));
  localStorage.removeItem(LEGACY_SYMBOL_MEANINGS_KEY);
  if (state.suppressDirty) return;
  saveSyncMeta({ localDirty: true, seedOnly: false });
  scheduleAutoSync();
}

function resetSymbolDefinitions() {
  const deletedAt = new Date().toISOString();
  const customDefinitions = getSymbolDefinitions().filter((definition) => !definition.builtIn);
  state.deletedSymbolDefinitions = normalizeDeletedSymbolDefinitions([
    ...state.deletedSymbolDefinitions,
    ...customDefinitions.map((definition) => ({ id: definition.id, deletedAt })),
  ]);
  state.symbolDefinitions = getDefaultSymbolDefinitions();
  saveSymbolDefinitions();
}

function saveSymbolMeanings() {
  if (!Array.isArray(state.symbolDefinitions)) {
    state.symbolDefinitions = migrateMeaningsToSymbolDefinitions(state.symbolMeanings);
  }
  saveSymbolDefinitions();
}

function syncSymbolMeaningsFromDefinitions() {
  state.symbolDefinitions = filterDeletedSymbolDefinitions(state.symbolDefinitions, state.deletedSymbolDefinitions);
  state.symbolMeanings = Object.fromEntries(state.symbolDefinitions.map((definition) => [definition.id, definition.label]));
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
