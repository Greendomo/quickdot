// QuickDot data migrations module. Loaded by index.html.
function migratePayload(payload) {
  const source = Array.isArray(payload)
    ? { schemaVersion: 1, entries: payload, deletedEntries: [], deletedSymbolDefinitions: [] }
    : { schemaVersion: 1, entries: [], deletedEntries: [], deletedSymbolDefinitions: [], ...(payload || {}) };

  let migrated = source;
  const version = Number(migrated.schemaVersion || 1);

  if (version < 2) {
    migrated = migrateToV2(migrated);
  }

  if (version < 3) {
    migrated = migrateToV3(migrated);
  }

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    entries: Array.isArray(migrated.entries) ? migrated.entries : [],
    deletedEntries: Array.isArray(migrated.deletedEntries) ? migrated.deletedEntries : [],
    deletedSymbolDefinitions: normalizeDeletedSymbolDefinitions(migrated.deletedSymbolDefinitions),
    symbolDefinitions: normalizeSymbolDefinitions(migrated.symbolDefinitions || migrateMeaningsToSymbolDefinitions(migrated.symbolMeanings)),
    symbolMeanings: migrated.symbolMeanings,
    updatedAt: migrated.updatedAt,
  };
}

function migrateToV2(payload) {
  return {
    ...payload,
    schemaVersion: 2,
    entries: (payload.entries || []).map((entry) => {
      const createdAt = entry.createdAt || new Date().toISOString();
      return {
        ...entry,
        createdAt,
        updatedAt: entry.updatedAt || createdAt,
      };
    }),
    deletedEntries: payload.deletedEntries || [],
  };
}

function migrateToV3(payload) {
  return {
    ...payload,
    schemaVersion: 3,
    entries: (payload.entries || []).map((entry) => ({
      ...entry,
      symbolId: entry.symbolId || entry.type || "note",
    })),
    symbolDefinitions: normalizeSymbolDefinitions(payload.symbolDefinitions || migrateMeaningsToSymbolDefinitions(payload.symbolMeanings)),
  };
}
