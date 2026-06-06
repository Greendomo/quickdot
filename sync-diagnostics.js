// QuickDot sync diagnostics helpers. Loaded by index.html before sync.js.
async function recordSyncError(operation, error, details = {}) {
  queueSyncError(operation, error, sanitizeErrorDetails(details));
  if (!state.supabaseClient || !state.syncSession || !navigator.onLine) return;
  try {
    await flushSyncErrors();
  } catch {
    // Keep the local error queue so diagnostics can be retried later.
  }
}

async function flushSyncErrors() {
  const queue = normalizeSyncErrorQueue(state.syncErrorQueue);
  if (!queue.length || !state.supabaseClient || !state.syncSession || !navigator.onLine) return;

  const rows = queue.map((item) => ({
    user_id: state.syncSession.user.id,
    operation: item.operation,
    message: item.message,
    details: item.details || {},
    created_at: item.createdAt,
  }));
  try {
    const { error } = await state.supabaseClient.from("quickdot_sync_errors").insert(rows);
    if (error) return;
    clearSyncedSyncErrors(queue.map((item) => item.id));
  } catch {
    // Diagnostics should never block the user's actual sync flow.
  }
}

function sanitizeErrorDetails(details) {
  if (!details || typeof details !== "object") return {};
  const allowed = ["code", "table", "phase", "fallback"];
  return Object.fromEntries(Object.entries(details).filter(([key]) => allowed.includes(key)));
}
