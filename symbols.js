// QuickDot symbol definition helpers. Loaded by index.html before state.js.
function getActiveSymbolLanguage() {
  return typeof state !== "undefined" && state.language ? state.language : defaultLanguage;
}

function getDefaultSymbolDefinitions(language = getActiveSymbolLanguage()) {
  const meanings = defaultSymbolMeaningsByLanguage[language] || defaultSymbolMeaningsByLanguage[defaultLanguage];
  return builtinSymbolDefinitions.map((definition) => ({
    ...definition,
    label: meanings[definition.id] || definition.id,
    description: "",
  }));
}

function normalizeSymbolDefinitions(definitions, language = getActiveSymbolLanguage()) {
  const defaults = getDefaultSymbolDefinitions(language);
  const byId = new Map(defaults.map((definition) => [definition.id, definition]));

  if (Array.isArray(definitions)) {
    definitions.forEach((definition) => {
      const normalized = normalizeSymbolDefinition(definition, language);
      if (!normalized) return;
      if (!normalized.builtIn && (isPlaceholderCustomSymbol(normalized) || isDebugTestSymbol(normalized))) return;
      const existing = byId.get(normalized.id);
      byId.set(normalized.id, existing ? { ...existing, ...normalized, builtIn: existing.builtIn } : normalized);
    });
  }

  return Array.from(byId.values()).filter((definition) => definition.enabled !== false);
}

function normalizeDeletedSymbolDefinitions(deletedSymbols) {
  if (!Array.isArray(deletedSymbols)) return [];
  const byId = new Map();
  deletedSymbols.forEach((item) => {
    if (!item?.id || !String(item.id).startsWith("custom-")) return;
    const deletedAt = item.deletedAt || new Date().toISOString();
    const existing = byId.get(item.id);
    if (!existing || new Date(deletedAt) > new Date(existing.deletedAt)) {
      byId.set(item.id, { id: item.id, deletedAt });
    }
  });
  return Array.from(byId.values());
}

function compactDeletedSymbolDefinitions(deletedSymbols = state.deletedSymbolDefinitions) {
  const cutoff = Date.now() - 1000 * 60 * 60 * 24 * TOMBSTONE_RETENTION_DAYS;
  return normalizeDeletedSymbolDefinitions(deletedSymbols).filter((item) => {
    return new Date(item.deletedAt).getTime() >= cutoff;
  });
}

function filterDeletedSymbolDefinitions(definitions, deletedSymbols = state.deletedSymbolDefinitions) {
  const deletedIds = new Set(normalizeDeletedSymbolDefinitions(deletedSymbols).map((item) => item.id));
  return normalizeSymbolDefinitions(definitions).filter((definition) => (
    definition.builtIn || !deletedIds.has(definition.id)
  ));
}

function normalizeSymbolDefinition(definition, language = getActiveSymbolLanguage()) {
  if (!definition || typeof definition !== "object") return null;
  const symbol = String(definition.symbol || "").trim().slice(0, 2);
  const id = String(definition.id || "").trim() || `custom-${crypto.randomUUID()}`;
  const defaultDefinition = getDefaultSymbolDefinitions(language).find((item) => item.id === id);
  const label = String(definition.label || defaultDefinition?.label || symbol || id).trim().slice(0, 24);
  if (!symbol || !label) return null;

  const isBuiltIn = Boolean(defaultDefinition?.builtIn || definition.builtIn);
  const role = definition.role === "status" && isBuiltIn ? "status" : "entry";
  const type = ["task", "event", "note"].includes(definition.type)
    ? definition.type
    : ["task", "event", "note"].includes(id)
      ? id
      : "note";

  return {
    id,
    symbol,
    label,
    description: String(definition.description || "").trim().slice(0, 80),
    role,
    type,
    builtIn: isBuiltIn,
    enabled: definition.enabled !== false,
    quickAdd: role === "entry" && definition.quickAdd !== false,
  };
}

function migrateMeaningsToSymbolDefinitions(meanings, language = getActiveSymbolLanguage()) {
  const defaults = getDefaultSymbolDefinitions(language);
  if (!meanings || typeof meanings !== "object") return defaults;
  return defaults.map((definition) => ({
    ...definition,
    label: String(meanings[definition.id] || definition.label).trim() || definition.label,
  }));
}

function getSymbolDefinitions() {
  state.symbolDefinitions = filterDeletedSymbolDefinitions(state.symbolDefinitions, state.deletedSymbolDefinitions);
  return state.symbolDefinitions;
}

function getSymbolDefinition(id) {
  return getSymbolDefinitions().find((definition) => definition.id === id)
    || getDefaultSymbolDefinitions().find((definition) => definition.id === id)
    || null;
}

function getEntrySymbolDefinitions() {
  const entryDefinitions = getSymbolDefinitions().filter((definition) => definition.role === "entry");
  return entryDefinitions.length ? entryDefinitions : getDefaultSymbolDefinitions().filter((definition) => definition.role === "entry");
}

function getQuickAddSymbolDefinitions() {
  const quickDefinitions = getEntrySymbolDefinitions().filter((definition) => definition.quickAdd);
  return quickDefinitions.length ? quickDefinitions : getEntrySymbolDefinitions().slice(0, 3);
}

function getEntrySymbolDefinition(entryOrId) {
  const id = typeof entryOrId === "string"
    ? entryOrId
    : entryOrId?.symbolId || entryOrId?.type;
  return getSymbolDefinition(id) || getSymbolDefinition("note");
}

function getEntrySymbol(entry) {
  if (entry.done) return getSymbolDefinition("done")?.symbol || "×";
  if (entry.migrated) return getSymbolDefinition("migrated")?.symbol || "›";
  return getEntrySymbolDefinition(entry)?.symbol || typeSymbol[entry.type] || "◇";
}

function getMeaning(key) {
  return getSymbolDefinition(key)?.label || getDefaultSymbolMeanings()[key] || key;
}

function getTypeLabel(typeOrId) {
  return getEntrySymbolDefinition(typeOrId)?.label || getMeaning(typeOrId);
}

function makeCustomSymbolId() {
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function isPlaceholderCustomSymbol(definition) {
  if (definition.symbol !== "★" || definition.description) return false;
  return Object.values(translations).some((dictionary) => definition.label === dictionary.symbolNewLabel);
}

function isDebugTestSymbol(definition) {
  return definition.symbol === "§"
    && definition.label === "測試分類"
    && definition.description === "正式儲存測試";
}
