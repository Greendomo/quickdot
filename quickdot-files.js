const QUICKDOT_STYLE_FILES = [
  "styles.css",
  "base.css",
  "layout.css",
  "panels.css",
  "controls.css",
  "entries.css",
  "entry-layout.css",
  "entry-list.css",
  "entry-subitems.css",
  "notekun.css",
  "log-groups.css",
  "dialogs.css",
  "responsive.css",
];

const QUICKDOT_SCRIPT_GROUPS = {
  config: ["supabase-config.js", "constants.js", "dates.js", "i18n.js", "symbols.js", "migrations.js", "state.js", "dom.js", "core.js"],
  data: ["entry-normalize.js", "sync-store.js", "storage.js", "preferences-store.js"],
  sync: ["sync-ui.js", "sync-auth.js", "sync-diagnostics.js", "sync-payload.js", "sync-normalized.js", "sync.js"],
  entries: ["entry-store.js", "entry-swipe.js", "entry-drag.js", "entries.js"],
  render: ["render-static.js", "render-shell.js", "render-entries.js", "render-logs.js", "render-calendar.js", "render.js"],
  events: ["navigation-events.js", "entry-events.js", "symbol-settings.js", "app-events.js", "app.js"],
};

const QUICKDOT_BROWSER_SCRIPTS = Object.values(QUICKDOT_SCRIPT_GROUPS).flat();

const QUICKDOT_APP_SHELL = [
  "./",
  "./index.html",
  "./admin.html",
  "./admin.css",
  ...QUICKDOT_STYLE_FILES.map((file) => `./${file}`),
  "./quickdot-files.js",
  ...QUICKDOT_BROWSER_SCRIPTS.map((file) => `./${file}`),
  "./admin.js",
  "./supabase-config.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

const QUICKDOT_CHECK_JS = [
  "quickdot-files.js",
  "admin.js",
  ...QUICKDOT_BROWSER_SCRIPTS,
  "sw.js",
];

const QUICKDOT_TEST_FILES = [
  "tests/smoke-test.js",
  "tests/app-shell-manifest-test.js",
  "tests/data-logic-test.js",
  "tests/seed-cleanup-test.js",
  "tests/symbol-definitions-test.js",
  "tests/symbol-settings-actions-test.js",
  "tests/persistence-lifecycle-test.js",
  "tests/entry-actions-test.js",
  "tests/entry-swipe-test.js",
  "tests/entry-drag-test.js",
  "tests/sync-maintenance-test.js",
  "tests/scroll-preservation-test.js",
  "tests/sync-auth-ui-test.js",
  "tests/i18n-labels-test.js",
];

const QUICKDOT_DEPLOY_FILES = [
  ...QUICKDOT_APP_SHELL.filter((file) => file !== "./").map((file) => file.replace("./", "")),
  "sw.js",
  "supabase-schema.sql",
  "README.md",
];

if (typeof self !== "undefined") {
  self.QUICKDOT_APP_SHELL = QUICKDOT_APP_SHELL;
}

if (typeof module !== "undefined") {
  module.exports = {
    QUICKDOT_APP_SHELL,
    QUICKDOT_BROWSER_SCRIPTS,
    QUICKDOT_CHECK_JS,
    QUICKDOT_SCRIPT_GROUPS,
    QUICKDOT_STYLE_FILES,
    QUICKDOT_TEST_FILES,
    QUICKDOT_DEPLOY_FILES,
  };
}
