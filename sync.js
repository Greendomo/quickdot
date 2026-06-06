// QuickDot sync engine module. Loaded by index.html.

async function initSync() {
  const config = window.QUICKDOT_SUPABASE || {};
  if (!config.url || !config.anonKey || !window.supabase?.createClient) {
    updateSyncStatus(t("syncNotConfigured"));
    return;
  }

  state.supabaseClient = window.supabase.createClient(config.url, config.anonKey);
  const { data } = await state.supabaseClient.auth.getSession();
  state.syncSession = data.session;
  updateSyncStatus();

  state.supabaseClient.auth.onAuthStateChange((event, session) => {
    state.syncSession = session;
    updateSyncStatus();
    if (event === "PASSWORD_RECOVERY") {
      openPasswordResetDialog();
      return;
    }
    if (session) {
      startSyncRefresh();
      window.setTimeout(syncLatestThenPrompt, 0);
    } else {
      stopSyncRefresh();
    }
  });

  window.addEventListener("focus", syncWhenActive);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") syncWhenActive();
  });
  window.addEventListener("online", syncWhenActive);
  window.addEventListener("offline", () => updateSyncStatus(t("syncOfflineQueued")));

  if (state.syncSession) {
    startSyncRefresh();
    await syncLatest();
  }
}

async function syncLatestThenPrompt() {
  await syncLatest();
  openYesterdayMigrationPrompt();
}

async function syncLatest() {
  if (!ensureSyncReady()) return;
  if (!canAttemptSyncNow()) return;

  beginSyncTask(t("syncLatestProgress"));
  try {
    if (state.normalizedSyncAvailable !== false) {
      const normalizedResult = await syncLatestNormalized();
      if (normalizedResult !== "fallback") return;
    }

    const cloud = await fetchCloudData();
    if (!cloud) {
      await pushToCloud();
      return;
    }

    const meta = loadSyncMeta();
    const hasUntrackedLocalData = !meta.lastSyncAt && !meta.seedOnly && state.entries.length > 0;
    const cloudIsNewer = meta.lastSyncAt ? new Date(cloud.updated_at) > new Date(meta.lastSyncAt) : true;

    if (cloudIsNewer && (meta.localDirty || hasUntrackedLocalData)) {
      await mergeCloudPayload(cloud.payload, cloud.updated_at);
      await pushToCloud();
      return;
    }

    if (cloudIsNewer) {
      await applyCloudPayload(cloud.payload, cloud.updated_at);
      return;
    }

    if (meta.localDirty) {
      await pushToCloud();
      return;
    }

    noteSyncSuccess();
    updateSyncStatus(t("syncAlreadyLatest"));
  } finally {
    endSyncTask();
  }
}

async function syncLatestNormalized() {
  const remote = await fetchNormalizedEntries();
  if (remote === "fallback") return "fallback";
  if (remote === "error") return "error";

  if (remote) {
    const remotePayload = normalizedRowsToPayload(remote);
    const merged = mergeLocalAndCloudPayload(createCloudPayload(), remotePayload);
    state.suppressDirty = true;
    state.entries = normalizeEntries(merged.entries);
    state.deletedEntries = normalizeDeletedEntries(merged.deletedEntries);
    saveEntries();
    state.suppressDirty = false;
  }

  const pushResult = await pushNormalizedChanges();
  if (pushResult !== "ok") return pushResult;
  saveSyncMeta({ lastSyncAt: new Date().toISOString(), localDirty: false, seedOnly: false });
  render();
  await flushSyncErrors();
  noteSyncSuccess();
  updateSyncStatus(t("syncAlreadyLatest"));
  return "ok";
}

async function pullFromCloud() {
  if (!ensureSyncReady()) return;
  beginSyncTask(t("syncLatestProgress"));
  try {
    if (state.normalizedSyncAvailable !== false) {
      const remote = await fetchNormalizedEntries();
      if (remote !== "fallback" && remote !== "error") {
        await applyCloudPayload(normalizedRowsToPayload(remote), new Date().toISOString());
        return;
      }
      if (remote === "error") return;
    }

    const cloud = await fetchCloudData();
    if (!cloud) {
      updateSyncStatus(t("syncCloudEmpty"));
      return;
    }
    await applyCloudPayload(cloud.payload, cloud.updated_at);
  } finally {
    endSyncTask();
  }
}

async function pushToCloud() {
  if (!ensureSyncReady()) return;
  if (!navigator.onLine) {
    updateSyncStatus(t("syncOfflineQueued"));
    return;
  }
  if (!canAttemptSyncNow()) return;

  beginSyncTask(t("syncUploadProgress"));
  try {
    if (state.normalizedSyncAvailable !== false) {
      const normalizedResult = await pushNormalizedChanges();
      if (normalizedResult === "ok") {
        saveSyncMeta({ lastSyncAt: new Date().toISOString(), localDirty: false, seedOnly: false });
        await flushSyncErrors();
        noteSyncSuccess();
        updateSyncStatus(t("syncUploadSuccess"));
        return;
      }
      if (normalizedResult === "error") return;
    }

    const now = new Date().toISOString();
    const payload = createCloudPayload(now);

    const { data, error } = await state.supabaseClient
      .from("quickdot_user_data")
      .upsert(
        {
          user_id: state.syncSession.user.id,
          payload,
          updated_at: now,
        },
        { onConflict: "user_id" },
      )
      .select("updated_at")
      .single();

    if (error) {
      noteSyncFailure();
      await recordSyncError("quickdot_user_data.upsert", error, { table: "quickdot_user_data" });
      updateSyncStatus(t("syncUploadFailed", { message: error.message }));
      return;
    }

    saveSyncMeta({ lastSyncAt: data.updated_at, localDirty: false });
    clearSyncQueue();
    await flushSyncErrors();
    noteSyncSuccess();
    updateSyncStatus(t("syncUploadSuccess"));
  } finally {
    endSyncTask();
  }
}

function scheduleAutoSync() {
  if (!state.syncSession || !state.supabaseClient || state.suppressDirty) return;
  if (!navigator.onLine) {
    updateSyncStatus(t("syncOfflineQueued"));
    return;
  }
  window.clearTimeout(state.syncDebounce);
  const delay = Math.max(1500, state.syncBackoffMs || 0) + Math.floor(Math.random() * 1500);
  state.syncDebounce = window.setTimeout(() => {
    pushToCloud();
  }, delay);
}

function startSyncRefresh() {
  stopSyncRefresh();
  state.syncRefreshInterval = window.setInterval(syncWhenActive, 60000);
}

function stopSyncRefresh() {
  window.clearInterval(state.syncRefreshInterval);
  state.syncRefreshInterval = null;
}

function syncWhenActive() {
  if (!state.syncSession || !state.supabaseClient) return;
  if (!navigator.onLine) {
    updateSyncStatus(t("syncOfflineQueued"));
    return;
  }
  window.setTimeout(syncLatest, Math.floor(Math.random() * 3000));
}

function canAttemptSyncNow() {
  const now = Date.now();
  const wait = Math.max(0, state.syncBackoffMs || 0);
  if (wait && now - state.lastSyncAttemptAt < wait) {
    updateSyncStatus(t("syncRetryScheduled"));
    return false;
  }
  state.lastSyncAttemptAt = now;
  return true;
}

function noteSyncSuccess() {
  state.syncBackoffMs = 0;
}

function noteSyncFailure() {
  state.syncBackoffMs = state.syncBackoffMs ? Math.min(state.syncBackoffMs * 2, 60000) : 5000;
}
