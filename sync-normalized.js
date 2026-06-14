// QuickDot normalized row sync helpers. Loaded by index.html before sync.js.
async function fetchNormalizedEntries(options = {}) {
  const { incremental = false } = options;
  const meta = loadSyncMeta();
  let query = state.supabaseClient
    .from("quickdot_entries")
    .select("entry_id,payload,updated_at,deleted_at")
    .eq("user_id", state.syncSession.user.id)
    .order("updated_at", { ascending: true });

  if (incremental && meta.lastSyncAt) {
    query = query.or(`updated_at.gt.${meta.lastSyncAt},deleted_at.gt.${meta.lastSyncAt}`);
  }

  const { data, error } = await query;
  if (error) return handleNormalizedSyncError(error, "quickdot_entries.select");
  state.normalizedSyncAvailable = true;
  return data || [];
}

async function pushNormalizedChanges() {
  const queue = normalizeSyncQueue(state.syncQueue);
  const changes = queue.length
    ? queue
    : normalizeEntries(state.entries).map((entry) => ({
        entryId: entry.id,
        action: "upsert",
        entry,
        changedAt: entry.updatedAt || new Date().toISOString(),
      }));

  if (changes.length === 0) return "ok";

  const upserts = changes
    .filter((change) => change.action === "upsert" && change.entry)
    .map((change) => normalizedEntryRow(change.entry));
  const deletions = changes
    .filter((change) => change.action === "delete")
    .map((change) => normalizedDeleteRow(change.entryId, change.changedAt));

  if (upserts.length) {
    const { error } = await state.supabaseClient
      .from("quickdot_entries")
      .upsert(upserts, { onConflict: "user_id,entry_id" });
    if (error) return handleNormalizedSyncError(error, "quickdot_entries.upsert");
  }

  if (deletions.length) {
    const { error } = await state.supabaseClient
      .from("quickdot_entries")
      .upsert(deletions, { onConflict: "user_id,entry_id" });
    if (error) return handleNormalizedSyncError(error, "quickdot_entries.delete");
  }

  await recordNormalizedChanges(changes);
  state.normalizedSyncAvailable = true;
  clearSyncQueue();
  return "ok";
}

async function recordNormalizedChanges(changes) {
  const rows = changes.map((change) => ({
    user_id: state.syncSession.user.id,
    entry_id: change.entryId,
    action: change.action,
    changed_at: change.changedAt || new Date().toISOString(),
  }));
  if (!rows.length) return;
  const { error } = await state.supabaseClient.from("quickdot_entry_changes").insert(rows);
  if (error) await recordSyncError("quickdot_entry_changes.insert", error, { table: "quickdot_entry_changes" });
}

function handleNormalizedSyncError(error, operation = "quickdot_entries") {
  if (/quickdot_entries|schema|relation|does not exist|404/i.test(error.message || "")) {
    state.normalizedSyncAvailable = false;
    return "fallback";
  }
  noteSyncFailure();
  recordSyncError(operation, error, { table: "quickdot_entries" }).catch(() => {});
  updateSyncStatus(t("syncCloudReadFailed", { message: error.message }));
  return "error";
}

function normalizedEntryRow(entry) {
  const normalized = normalizeEntry(entry);
  return {
    user_id: state.syncSession.user.id,
    entry_id: normalized.id,
    entry_date: normalized.date,
    payload: normalized,
    updated_at: normalized.updatedAt || new Date().toISOString(),
    deleted_at: null,
  };
}

function normalizedDeleteRow(entryId, deletedAt) {
  return {
    user_id: state.syncSession.user.id,
    entry_id: entryId,
    entry_date: null,
    payload: null,
    updated_at: deletedAt || new Date().toISOString(),
    deleted_at: deletedAt || new Date().toISOString(),
  };
}

function normalizedRowsToPayload(rows) {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    entries: rows.filter((row) => !row.deleted_at && row.payload).map((row) => row.payload),
    deletedEntries: rows
      .filter((row) => row.deleted_at)
      .map((row) => ({ id: row.entry_id, deletedAt: row.deleted_at })),
    updatedAt: new Date().toISOString(),
  };
}
