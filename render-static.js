// QuickDot static text rendering helpers. Loaded by index.html before render-shell.js.
function renderLanguage() {
  document.documentElement.lang = state.language;
  document.title = "ＱuickDot";
  document.querySelector('meta[name="description"]')?.setAttribute("content", t("appDescription"));
  els.languageButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.language === state.language);
    button.setAttribute("aria-pressed", String(button.dataset.language === state.language));
  });
}

function renderStaticText() {
  setText(".skip-link", t("skipMain"));
  document.querySelector(".month-panel")?.setAttribute("aria-label", t("calendar"));
  setText(".month-panel .collapsible-header span:first-child", t("calendar"));
  els.prevMonth.setAttribute("aria-label", state.language === "en" ? "Previous month" : state.language === "zh-Hans" ? "上个月" : "上個月");
  els.nextMonth.setAttribute("aria-label", state.language === "en" ? "Next month" : state.language === "zh-Hans" ? "下个月" : "下個月");
  els.calendar.setAttribute("aria-label", t("viewCalendar"));
  els.legendButton.setAttribute("aria-label", t("legendSettings"));
  els.legendButton.title = t("legendSettings");
  els.searchButton.setAttribute("aria-label", t("search"));
  els.searchButton.title = t("search");
  els.addEntryButton.setAttribute("aria-label", t("addRecord"));
  document.querySelector(".log-switch")?.setAttribute("aria-label", state.language === "en" ? "Journal views" : state.language === "zh-Hans" ? "笔记视图" : "筆記視圖");
  setText('.log-switch button[data-view="daily"] .nav-icon', t("todayIcon"));
  setText('.log-switch button[data-view="daily"] .nav-label', t("navDaily"));
  setText('.log-switch button[data-view="weekly"] .nav-label', t("navWeekly"));
  setText('.log-switch button[data-view="monthly"] .nav-label', t("navMonthly"));
  setText('.log-switch button[data-view="future"] .nav-label', t("navFuture"));
  els.searchInput.placeholder = t("search");
  els.searchInput.setAttribute("aria-label", t("search"));
  updatePeriodNavLabels();

  setText('[data-view-panel="daily"] .section-heading h3', state.language === "en" ? "Daily Entries" : state.language === "zh-Hans" ? "每日记录" : "每日記錄");
  setText("#emptyState strong", t("emptyDailyTitle"));
  setText("#emptyState p", t("emptyDailyBody"));
  setText("#emptyState .empty-action", t("addFirst"));
  setText('[data-view-panel="weekly"] .section-heading h3', t("weekly"));
  setText("#weeklyEmpty strong", t("emptyWeekTitle"));
  setText("#weeklyEmpty p", t("emptyWeekBody"));
  setText("#weeklyEmpty .empty-action", t("addFirst"));
  setText('[data-view-panel="monthly"] .section-heading h3', t("monthly"));
  setText("#monthlyEmpty strong", t("emptyMonthTitle"));
  setText("#monthlyEmpty p", t("emptyMonthBody"));
  setText("#monthlyEmpty .empty-action", t("addFirst"));
  setText('[data-view-panel="future"] .section-heading h3', t("futureLog"));
  setText("#futureEmpty strong", t("emptyFutureTitle"));
  setText("#futureEmpty p", t("emptyFutureBody"));
  setText("#futureEmpty .empty-action", t("addFirst"));
  els.noteKunEmptyMessages.forEach((element) => {
    element.textContent = t(element.dataset.notekunEmptyMessage);
  });
  if (els.noteKunToastMessage && els.noteKunToast.hidden) {
    els.noteKunToastMessage.textContent = t("noteKunDoneToast");
  }

  setText("#symbolSheetTitle", t("legendSettings"));
  els.symbolSheet?.setAttribute("aria-label", t("legendSettings"));
  els.symbolSheetClose?.setAttribute("aria-label", t("close"));
  setText("#entryDialogTitle", t("addRecord"));
  els.entryClose.setAttribute("aria-label", t("close"));
  els.entryTypeTabs?.setAttribute("aria-label", t("entryType"));
  els.entryText.placeholder = state.language === "en" ? "What's on your mind?" : state.language === "zh-Hans" ? "写下任务、事件或想法..." : "寫下任務、事件或想法...";
  els.entryDate.setAttribute("aria-label", t("dateField"));
  setText("#entryDialog .primary-button", t("saveEntry"));
  setText("#entryCancel", state.language === "en" ? "Cancel" : "取消");

  setDialogText("migration", "migrationTitle", "migrationClose", "migrationCancel", "migrateTo", "confirmMigration");
  setDialogText("copy", "copyTitle", "copyClose", "copyCancel", "copyDate", "confirmCopy");
  setText("#migrationTitle", state.language === "en" ? "Choose Migration Date" : state.language === "zh-Hans" ? "选择迁移日期" : "選擇遷移日期");
  setText("#copyTitle", t("copyToDate"));
  setText("#yesterdayTitle", t("yesterdayTitle"));
  els.yesterdayClose.setAttribute("aria-label", t("close"));
  setText("#yesterdayLater", t("later"));
  setText("#yesterdayDialog .primary-button", t("migrateToToday"));
  setText("#subitemTitle", t("subitemAdd"));
  els.subitemClose.setAttribute("aria-label", t("close"));
  setFieldLabel("#subitemDialog .date-field", t("subitemContent"));
  setText("#subitemCancel", state.language === "en" ? "Cancel" : "取消");
  setText("#subitemDialog .primary-button", t("subitemAdd"));
  setText("#deleteTitle", t("confirmDelete"));
  els.deleteClose.setAttribute("aria-label", t("close"));
  setText("#deleteCancel", state.language === "en" ? "Cancel" : "取消");
  setText("#deleteDialog .danger-button", t("delete"));
  setText("#editTitle", t("editRecord"));
  els.editClose.setAttribute("aria-label", t("close"));
  setFieldLabel("#editDialog .date-field", t("entryContent"));
  setText("#editCancel", state.language === "en" ? "Cancel" : "取消");
  setText("#editDialog .primary-button", t("save"));

  setText("#syncTitle", t("settings"));
  els.syncClose.setAttribute("aria-label", t("close"));
  setText("#languageTitle", t("language"));
  document.querySelector(".language-picker")?.setAttribute("aria-label", t("language"));
  setText('[data-language="zh-Hant"]', t("languageHant"));
  setText('[data-language="zh-Hans"]', t("languageHans"));
  setText('[data-language="en"]', t("languageEn"));
  setText("#cloudSyncTitle", t("cloudSync"));
  setText("#dataSettingsTitle", t("dataManagement"));
  setText("#dataSettingsDescription", t("dataManagementDescription"));
  setText("#healthCheckLink", t("healthCheck"));
  setText("#adminDashboardLink", t("adminDashboard"));
  setText("#aboutTitle", t("about"));
  setText("#aboutDescription", t("aboutDescription"));
  setFieldLabel("#syncEmail", t("email"));
  setFieldLabel("#syncPassword", t("password"));
  setText("#syncLoggedInLabel", t("syncLoggedInAs"));
  setText("#syncSignUp", t("signUp"));
  setText("#syncSignIn", t("signIn"));
  setText("#syncSignOut", t("signOut"));
  setText("#syncForgotPassword", t("forgotPassword"));
  setText("#syncPull", t("cloudDownload"));
  setText("#syncPush", t("cloudUpload"));
  setText("#syncNow", t("syncLatest"));
  setText("#passwordResetTitle", t("passwordResetTitle"));
  els.passwordResetClose.setAttribute("aria-label", t("close"));
  setText("#passwordResetDescription", t("passwordResetDescription"));
  setFieldLabel("#passwordResetDialog .date-field", t("newPassword"));
  setText("#passwordResetCancel", state.language === "en" ? "Cancel" : "取消");
  setText("#passwordResetDialog .primary-button", t("passwordResetSubmit"));
  const template = els.entryTemplate.content;
  template.querySelector(".entry-symbol")?.setAttribute("aria-label", t("doneToggle"));
  template.querySelector(".priority-badge")?.setAttribute("aria-label", t("important"));
  setActionText(template, '[data-action="edit"]', "✎", t("edit"));
  setActionText(template, '[data-action="subitem"]', "＋", t("subitem"));
  setActionText(template, '[data-action="priority"]', "!", t("important"));
  setActionText(template, '[data-action="copy"]', "⧉", t("copyToDate"));
  setActionText(template, '[data-action="migrate"]', "›", t("migrate"));
  setActionText(template, '[data-action="delete"]', "×", t("delete"));
}

function setDialogText(prefix, titleId, closeId, cancelId, labelKey, submitKey) {
  document.querySelector(`#${prefix}Close`)?.setAttribute("aria-label", t("close"));
  setText(`#${prefix}Cancel`, state.language === "en" ? "Cancel" : "取消");
  setFieldLabel(`#${prefix}Dialog .date-field`, t(labelKey));
  setText(`#${prefix}Dialog .primary-button`, t(submitKey));
}

function setFieldLabel(selectorOrInput, text) {
  const target = document.querySelector(selectorOrInput);
  const label = target?.matches?.("label") ? target : target?.closest?.("label");
  if (label?.firstChild) label.firstChild.textContent = `${text}\n          `;
}

function setText(selector, text) {
  const element = document.querySelector(selector);
  if (element) element.textContent = text;
}

function setTextIn(root, selector, text) {
  const element = root.querySelector(selector);
  if (element) element.textContent = text;
}

function setActionText(root, selector, icon, label) {
  root.querySelectorAll(selector).forEach((element) => {
    const iconElement = element.querySelector(".entry-action-icon");
    const labelElement = element.querySelector(".entry-action-label");
    if (iconElement) iconElement.textContent = icon;
    if (labelElement) labelElement.textContent = label;
    element.setAttribute("aria-label", label);
  });
}
