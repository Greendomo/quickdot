const adminEls = {
  loginPanel: document.querySelector("#loginPanel"),
  dashboard: document.querySelector("#dashboard"),
  email: document.querySelector("#adminEmail"),
  password: document.querySelector("#adminPassword"),
  loginStatus: document.querySelector("#loginStatus"),
  adminStatus: document.querySelector("#adminStatus"),
  signIn: document.querySelector("#signInButton"),
  signOut: document.querySelector("#signOutButton"),
  refresh: document.querySelector("#refreshButton"),
  metrics: document.querySelector("#metricGrid"),
  errors: document.querySelector("#errorRows"),
};

const adminConfig = window.QUICKDOT_SUPABASE || {};
const adminClient = adminConfig.url && adminConfig.anonKey && window.supabase?.createClient
  ? window.supabase.createClient(adminConfig.url, adminConfig.anonKey)
  : null;

function setAdminStatus(message, type = "") {
  adminEls.loginStatus.textContent = message;
  adminEls.adminStatus.textContent = message;
  adminEls.loginStatus.className = `status ${type}`;
  adminEls.adminStatus.className = `status ${type}`;
}

function formatAdminNumber(value) {
  return new Intl.NumberFormat("zh-Hant-TW").format(Number(value || 0));
}

function formatAdminDate(value) {
  if (!value) return "尚無紀錄";
  return new Intl.DateTimeFormat("zh-Hant-TW", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function escapeAdminHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function adminMetric(title, value, note = "") {
  return `
    <article class="card">
      <h2>${title}</h2>
      <span class="metric-value">${value}</span>
      <p class="metric-note">${note}</p>
    </article>
  `;
}

function showAdminDashboard(show) {
  adminEls.loginPanel.classList.toggle("hidden", show);
  adminEls.dashboard.classList.toggle("hidden", !show);
}

async function signInAdmin() {
  if (!adminClient) {
    setAdminStatus("Supabase 尚未設定，請先確認 supabase-config.js。", "warn");
    return;
  }
  setAdminStatus("正在登入...", "");
  const { data, error } = await adminClient.auth.signInWithPassword({
    email: adminEls.email.value.trim(),
    password: adminEls.password.value,
  });
  if (error) {
    setAdminStatus(`登入失敗：${error.message}`, "warn");
    return;
  }
  adminEls.password.value = "";
  await loadAdminDashboard(data.session);
}

async function signOutAdmin() {
  if (!adminClient) return;
  await adminClient.auth.signOut();
  showAdminDashboard(false);
  setAdminStatus("已登出。", "");
}

async function loadAdminDashboard(session) {
  if (!adminClient) {
    setAdminStatus("Supabase 尚未設定，請先確認 supabase-config.js。", "warn");
    return;
  }
  const activeSession = session || (await adminClient.auth.getSession()).data.session;
  if (!activeSession) {
    showAdminDashboard(false);
    setAdminStatus("請使用管理員帳號登入。", "");
    return;
  }

  showAdminDashboard(true);
  setAdminStatus(`已登入：${activeSession.user.email}，正在讀取後台資料...`, "");

  const [{ data: overview, error: overviewError }, { data: errors, error: errorsError }] = await Promise.all([
    adminClient.rpc("quickdot_admin_overview"),
    adminClient.rpc("quickdot_admin_recent_sync_errors", { limit_count: 25 }),
  ]);

  if (overviewError || errorsError) {
    showAdminDashboard(false);
    const message = overviewError?.message || errorsError?.message || "未知錯誤";
    setAdminStatus(`無法讀取管理後台：${message}`, "warn");
    return;
  }

  renderAdminOverview(overview || {});
  renderAdminErrors(errors || []);
  setAdminStatus(`已登入：${activeSession.user.email}。最後更新：${formatAdminDate(new Date().toISOString())}`, "ok");
}

function renderAdminOverview(data) {
  adminEls.metrics.innerHTML = [
    adminMetric("總使用者", formatAdminNumber(data.totalUsers), `今日新增 ${formatAdminNumber(data.newUsersToday)}`),
    adminMetric("7 日活躍", formatAdminNumber(data.activeUsers7d), "依同步變更紀錄估算"),
    adminMetric("目前紀錄", formatAdminNumber(data.totalEntries), `刪除保留 ${formatAdminNumber(data.deletedEntries)}`),
    adminMetric("24h 同步變更", formatAdminNumber(data.changes24h), `最後更新 ${formatAdminDate(data.latestEntryUpdate)}`),
    adminMetric("24h 同步錯誤", formatAdminNumber(data.syncErrors24h), `7 日共 ${formatAdminNumber(data.syncErrors7d)}`),
    adminMetric("最後錯誤", data.latestSyncError ? "有紀錄" : "無", formatAdminDate(data.latestSyncError)),
  ].join("");
}

function renderAdminErrors(errors) {
  adminEls.errors.innerHTML = errors.length
    ? errors.map((item) => `
        <tr>
          <td>${formatAdminDate(item.created_at)}</td>
          <td>${escapeAdminHtml(item.email || "unknown")}</td>
          <td><code>${escapeAdminHtml(item.operation || "sync")}</code></td>
          <td>${escapeAdminHtml(item.message || "")}</td>
          <td><code>${escapeAdminHtml(JSON.stringify(item.details || {}))}</code></td>
        </tr>
      `).join("")
    : '<tr><td colspan="5">目前沒有同步錯誤。</td></tr>';
}

function bindAdminEvents() {
  adminEls.signIn.addEventListener("click", signInAdmin);
  adminEls.signOut.addEventListener("click", signOutAdmin);
  adminEls.refresh.addEventListener("click", () => loadAdminDashboard());
  adminEls.password.addEventListener("keydown", (event) => {
    if (event.key === "Enter") signInAdmin();
  });
}

function bootAdmin() {
  bindAdminEvents();
  if (!adminClient) {
    setAdminStatus("Supabase 尚未設定，請先確認 supabase-config.js。", "warn");
    return;
  }
  adminClient.auth.getSession().then(({ data }) => loadAdminDashboard(data.session));
  adminClient.auth.onAuthStateChange((_event, session) => {
    if (session) loadAdminDashboard(session);
  });
}

bootAdmin();
