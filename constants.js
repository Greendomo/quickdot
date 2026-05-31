// QuickDot constants module. Loaded by index.html.
const STORAGE_KEY = "quickdot-app-v1";
const LEGACY_STORAGE_KEY = "bullet-journal-app-v1";
const SYMBOL_MEANINGS_KEY = "quickdot-symbol-meanings-v1";
const LEGACY_SYMBOL_MEANINGS_KEY = "bullet-journal-symbol-meanings-v1";
const COLLAPSE_STATE_KEY = "quickdot-collapse-state-v1";
const SYNC_META_KEY = "quickdot-sync-meta-v1";
const SYNC_QUEUE_KEY = "quickdot-sync-queue-v1";
const SYNC_ERROR_QUEUE_KEY = "quickdot-sync-errors-v1";
const LANGUAGE_KEY = "quickdot-language-v1";
const CURRENT_SCHEMA_VERSION = 2;
const TOMBSTONE_RETENTION_DAYS = 90;
const SYNC_ERROR_RETENTION_LIMIT = 25;

const defaultLanguage = "zh-Hant";

const defaultSymbolMeaningsByLanguage = {
  "zh-Hant": {
    task: "任務",
    event: "事件",
    note: "筆記",
    done: "完成",
    important: "重要",
    migrated: "遷移",
  },
  "zh-Hans": {
    task: "任务",
    event: "事件",
    note: "笔记",
    done: "完成",
    important: "重要",
    migrated: "迁移",
  },
  en: {
    task: "Task",
    event: "Event",
    note: "Note",
    done: "Complete",
    important: "Important",
    migrated: "Migrated",
  },
};

const defaultSymbolMeanings = defaultSymbolMeaningsByLanguage[defaultLanguage];

const typeSymbol = {
  task: "•",
  event: "○",
  note: "◇",
};
