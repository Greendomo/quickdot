// QuickDot sync authentication module. Loaded by index.html before sync.js.
async function requestPasswordReset() {
  const email = els.syncEmail.value.trim();
  if (!email) {
    updateSyncStatus(t("passwordResetEmailRequired"));
    return;
  }
  if (!state.supabaseClient) {
    updateSyncStatus(t("syncSupabaseMissing"));
    return;
  }

  beginSyncTask(t("passwordResetSending"));
  try {
    const { error } = await state.supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: getPasswordResetRedirectUrl(),
    });
    if (error) {
      await recordSyncError("auth.resetPasswordForEmail", error, { code: error.code || null });
      updateSyncStatus(t("passwordResetSendFailed", { message: error.message }));
      return;
    }
    updateSyncStatus(t("passwordResetSent"));
  } finally {
    endSyncTask();
  }
}

function getPasswordResetRedirectUrl() {
  if (window.location.protocol === "file:") return undefined;
  const url = new URL(window.location.href);
  url.hash = "";
  url.search = "";
  return url.toString();
}

function openPasswordResetDialog() {
  closeSyncDialog();
  els.newPassword.value = "";
  els.passwordResetStatus.textContent = "";
  showDialog(els.passwordResetDialog);
  window.setTimeout(() => els.newPassword.focus(), 50);
}

function closePasswordResetDialog() {
  hideDialog(els.passwordResetDialog);
}

async function confirmPasswordReset(event) {
  event.preventDefault();
  if (!state.supabaseClient) return;

  const password = els.newPassword.value;
  if (!password || password.length < 6) {
    els.passwordResetStatus.textContent = t("passwordResetTooShort");
    return;
  }

  els.passwordResetStatus.textContent = t("passwordResetUpdating");
  const { error } = await state.supabaseClient.auth.updateUser({ password });
  if (error) {
    await recordSyncError("auth.updateUserPassword", error, { code: error.code || null });
    els.passwordResetStatus.textContent = t("passwordResetFailed", { message: error.message });
    return;
  }

  els.newPassword.value = "";
  closePasswordResetDialog();
  updateSyncStatus(t("passwordResetSuccess"));
}

async function signUpSyncAccount() {
  const credentials = getSyncCredentials();
  if (!credentials) return;
  if (!state.supabaseClient) {
    updateSyncStatus(t("syncSupabaseMissing"));
    return;
  }

  beginSyncTask(t("syncSignUpProgress"));
  try {
    const { error } = await state.supabaseClient.auth.signUp(credentials);
    if (error) {
      await recordSyncError("auth.signUp", error, { code: error.code || null });
      updateSyncStatus(t("syncSignUpFailed", { message: error.message }));
      return;
    }
    updateSyncStatus(t("syncSignUpSuccess"));
  } finally {
    endSyncTask();
  }
}

async function signInSyncAccount() {
  const credentials = getSyncCredentials();
  if (!credentials) return;
  if (!state.supabaseClient) {
    updateSyncStatus(t("syncSupabaseMissing"));
    return;
  }

  beginSyncTask(t("syncSignInProgress"));
  try {
    const { data, error } = await state.supabaseClient.auth.signInWithPassword(credentials);
    if (error) {
      await recordSyncError("auth.signIn", error, { code: error.code || null });
      updateSyncStatus(t("syncSignInFailed", { message: error.message }));
      return;
    }
    state.syncSession = data.session;
    updateSyncStatus(t("syncSignInSuccess"));
    await syncLatest();
  } finally {
    endSyncTask();
  }
}

async function signOutSyncAccount() {
  if (!state.supabaseClient) return;
  beginSyncTask(t("syncSignOutProgress"));
  try {
    const { error } = await state.supabaseClient.auth.signOut();
    if (error) {
      await recordSyncError("auth.signOut", error, { code: error.code || null });
      updateSyncStatus(t("syncCloudReadFailed", { message: error.message }));
      return;
    }
    state.syncSession = null;
    updateSyncStatus(t("syncSignedOut"));
  } finally {
    endSyncTask();
  }
}

function getSyncCredentials() {
  const email = els.syncEmail.value.trim();
  const password = els.syncPassword.value;
  if (!email || !password) {
    updateSyncStatus(t("syncCredentialsRequired"));
    return null;
  }
  return { email, password };
}
