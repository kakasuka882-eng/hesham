(() => {
  "use strict";

  const refs = {
    adminLoginCard: document.getElementById("adminLoginCard"),
    adminApp: document.getElementById("adminApp"),
    adminLoginForm: document.getElementById("adminLoginForm"),
    loginStatus: document.getElementById("loginStatus"),
    status: document.getElementById("status"),
    logoutBtn: document.getElementById("logoutBtn"),
    tableBody: document.getElementById("videosTableBody"),
    statVideos: document.getElementById("statVideos"),
    statViews: document.getElementById("statViews"),
    statLikes: document.getElementById("statLikes"),
    statComments: document.getElementById("statComments"),
    statShares: document.getElementById("statShares")
  };

  const showMessage = (node, message, isError = false) => {
    if (!node) return;
    node.textContent = message;
    node.classList.toggle("error", isError);
  };

  const showStatus = (message, isError = false) => showMessage(refs.status, message, isError);
  const showLoginStatus = (message, isError = false) => showMessage(refs.loginStatus, message, isError);

  const format = (value) =>
    new Intl.NumberFormat("ar", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);

  const escapeHtml = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const api = async (action, method = "GET", body = null) => {
    if (window.RHAC_LOCAL_API && typeof window.RHAC_LOCAL_API.request === "function") {
      return window.RHAC_LOCAL_API.request({
        endpoint: "app-api.php",
        action,
        method,
        body,
        isForm: false,
        params: null
      });
    }

    const options = { method, credentials: "same-origin" };
    if (body) {
      options.headers = { "Content-Type": "application/json" };
      options.body = JSON.stringify(body);
    }

    const res = await fetch(`/app-api.php?action=${encodeURIComponent(action)}`, options);
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || payload.ok === false) {
      throw new Error(payload.message || "Request failed");
    }
    return payload;
  };

  const setAuthedView = (isAuthed) => {
    if (refs.adminLoginCard) refs.adminLoginCard.hidden = isAuthed;
    if (refs.adminApp) refs.adminApp.hidden = !isAuthed;
  };

  const loadStats = async () => {
    const payload = await api("admin_stats");
    const stats = payload.stats || payload || {};
    refs.statVideos.textContent = format(stats.total_videos);
    refs.statViews.textContent = format(stats.total_views);
    refs.statLikes.textContent = format(stats.total_likes);
    refs.statComments.textContent = format(stats.total_comments);
    refs.statShares.textContent = format(stats.total_shares);
  };

  const renderVideos = (videos) => {
    refs.tableBody.innerHTML = "";
    if (!videos.length) {
      refs.tableBody.innerHTML = '<tr><td colspan="7">لا توجد فيديوهات</td></tr>';
      return;
    }

    videos.forEach((video) => {
      const publisherHandle = video.author || (video.username ? `@${video.username}` : "-");
      const publisherName = video.author_name ? ` (${video.author_name})` : "";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${video.id}</td>
        <td>${escapeHtml(video.title)}</td>
        <td>${escapeHtml(publisherHandle + publisherName)}</td>
        <td>${format(video.views)}</td>
        <td>${format(video.likes)}</td>
        <td>${format(video.comments)}</td>
        <td><button class="action-delete" data-id="${video.id}">حذف</button></td>
      `;
      refs.tableBody.appendChild(tr);
    });
  };

  const loadVideos = async () => {
    const payload = await api("admin_videos");
    renderVideos(payload.videos || []);
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    if (!refs.adminLoginForm) return;

    const data = new FormData(refs.adminLoginForm);
    const username = String(data.get("username") || "").trim();
    const password = String(data.get("password") || "");

    try {
      showLoginStatus("جاري تسجيل الدخول...");
      await api("admin_login", "POST", { username, password });
      refs.adminLoginForm.reset();
      setAuthedView(true);
      await Promise.all([loadStats(), loadVideos()]);
      showLoginStatus("");
      showStatus("");
    } catch (error) {
      showLoginStatus(error.message, true);
    }
  };

  const handleDelete = async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;

    const id = Number(target.dataset.id || 0);
    if (!id) return;
    if (!window.confirm("هل تريد حذف الفيديو؟")) return;

    try {
      showStatus("جاري حذف الفيديو...");
      await api("admin_delete_video", "POST", { video_id: id });
      await Promise.all([loadStats(), loadVideos()]);
      showStatus("تم حذف الفيديو.");
    } catch (error) {
      showStatus(error.message, true);
    }
  };

  const handleLogout = async () => {
    try {
      await api("logout", "POST", {});
      setAuthedView(false);
      showStatus("");
      showLoginStatus("");
    } catch (error) {
      showStatus(error.message, true);
    }
  };

  const initializeAuthState = async () => {
    setAuthedView(false);
    showLoginStatus("");
    showStatus("");

    try {
      const payload = await api("admin_auth");
      if (!payload.user) return;

      setAuthedView(true);
      showStatus("جاري تحميل البيانات...");
      await Promise.all([loadStats(), loadVideos()]);
      showStatus("");
    } catch (error) {
      showStatus(error.message, true);
    }
  };

  const bindEvents = () => {
    refs.adminLoginForm?.addEventListener("submit", handleLogin);
    refs.tableBody?.addEventListener("click", handleDelete);
    refs.logoutBtn?.addEventListener("click", handleLogout);
  };

  bindEvents();
  initializeAuthState();
})();
