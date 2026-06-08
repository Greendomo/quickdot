// QuickDot sync UI helpers. Loaded by index.html before sync.js.
function openSyncDialog() {
  updateSyncStatus();
  showDialog(els.syncDialog);
}

function closeSyncDialog() {
  hideDialog(els.syncDialog);
}

function beginSyncTask(message) {
  state.syncBusyCount += 1;
  setSyncControlsDisabled(true);
  if (message) updateSyncStatus(message);
}

function endSyncTask() {
  state.syncBusyCount = Math.max(0, state.syncBusyCount - 1);
  if (state.syncBusyCount === 0) setSyncControlsDisabled(false);
}

function setSyncControlsDisabled(disabled) {
  [
    els.syncSignUp,
    els.syncSignIn,
    els.syncSignOut,
    els.syncForgotPassword,
    els.syncNow,
  ].forEach((button) => {
    if (button) button.disabled = disabled;
  });
}

function ensureSyncReady() {
  if (!state.supabaseClient) {
    updateSyncStatus(t("syncSupabaseMissing"));
    return false;
  }
  if (!state.syncSession) {
    updateSyncStatus(t("syncLoginRequired"));
    return false;
  }
  return true;
}

function updateSyncStatus(message) {
  if (!els.syncStatus) return;
  updateSyncAccountUi();
  if (!message && !state.supabaseClient) {
    els.syncStatus.textContent = t("syncNotConfigured");
    updateSyncButtonState("error", t("syncNotConfigured"));
    return;
  }

  const meta = loadSyncMeta();
  const account = state.syncSession?.user?.email ? t("syncAccount", { email: state.syncSession.user.email }) : t("syncSignedOutStatus");
  const dirty = meta.localDirty && !navigator.onLine ? t("syncOfflineQueued") : meta.localDirty ? t("syncLocalDirty") : t("syncLocalClean");
  els.syncStatus.textContent = message || (state.syncSession ? `${dirty}。` : `${account}。${dirty}。`);
  updateSyncButtonState(getSyncButtonState(message, meta), els.syncStatus.textContent);
}

function getSyncButtonState(message, meta) {
  if (state.syncBusyCount > 0 || (message && /正在|同步中|正在|Syncing|Signing|Creating|Uploading|Downloading/.test(message))) return "syncing";
  if (message && /失敗|失败|錯誤|错误|不正確|不正确|尚未設定|尚未设置|請先|请先|請輸入|请输入|failed|invalid|not configured|Sign in first|Enter/i.test(message)) return "error";
  if (!state.syncSession) return "signed-out";
  if (meta.localDirty) return "dirty";
  return "synced";
}

function updateSyncButtonState(syncState, label) {
  if (!els.syncButton) return;
  els.syncButton.dataset.syncState = syncState;
  const statusLabel = {
    synced: t("syncStateSynced"),
    dirty: t("syncStateDirty"),
    syncing: t("syncStateSyncing"),
    error: t("syncStateError"),
    "signed-out": t("syncStateSignedOut"),
  }[syncState] || t("cloudSync");
  els.syncButton.title = `${statusLabel}：${label}`;
  els.syncButton.setAttribute("aria-label", `${t("settings")}，${statusLabel}`);
}

function updateSyncAccountUi() {
  const email = state.syncSession?.user?.email || "";
  const isSignedIn = Boolean(email);
  if (els.syncFields) els.syncFields.hidden = isSignedIn;
  if (els.syncAuthActions) els.syncAuthActions.hidden = isSignedIn;
  if (els.syncAccountPanel) els.syncAccountPanel.hidden = !isSignedIn;
  if (els.syncAccountEmail) els.syncAccountEmail.textContent = email;
  if (els.syncEmail && isSignedIn) els.syncEmail.value = email;
  if (els.syncPassword && isSignedIn) els.syncPassword.value = "";
}
