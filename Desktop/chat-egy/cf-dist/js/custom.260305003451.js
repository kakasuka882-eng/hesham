(() => {
  "use strict";

  const state = {
    allVideos: [],
    videos: [],
    cards: [],
    notifications: [],
    unreadNotifications: 0,
    feedMode: "for_you",
    currentIndex: 0,
    currentLang: "ar",
    currentUser: null,
    muted: false,
    likedVideoIds: new Set(),
    observer: null,
    activeCommentsVideoId: 0,
    notificationsOpen: false,
    activeMenuAction: "home",
    autoplayHintShown: false,
    needsGestureUnmute: false,
    audioGateVisible: false,
    searchQuery: "",
    notificationsPollTimer: null
  };

  const i18n = {
    ar: {
      following: "متابعة",
      for_you: "لك",
      live: "مباشر",
      account_panel: "لوحة الحساب",
      watch_free: "المشاهدة متاحة بدون حساب. الرفع والتعليق يحتاجان تسجيل دخول.",
      login: "تسجيل دخول",
      register: "إنشاء حساب",
      email: "البريد الإلكتروني",
      email_or_username: "البريد أو اسم المستخدم",
      password: "كلمة المرور",
      name: "الاسم",
      username: "اسم المستخدم",
      upload_video: "رفع فيديو",
      video_title: "عنوان الفيديو",
      video_desc: "وصف الفيديو",
      video_lang: "لغة الفيديو",
      video_file: "ملف الفيديو (MP4/WebM/MOV)",
      upload_now: "ارفع الآن",
      my_videos: "فيديوهاتي",
      logout: "تسجيل خروج",
      feed_aria: "فيديوهات قصيرة",
      actions_aria: "إجراءات التفاعل",
      like_aria: "إعجاب",
      comment_aria: "تعليق",
      share_aria: "مشاركة",
      comments: "التعليقات",
      send: "إرسال",
      auth_required: "يجب تسجيل الدخول أولًا.",
      loading: "جاري التحميل...",
      login_success: "تم تسجيل الدخول.",
      register_success: "تم إنشاء الحساب.",
      logout_success: "تم تسجيل الخروج.",
      upload_success: "تم رفع الفيديو بنجاح.",
      profile_updated: "تم تحديث البروفايل.",
      no_videos: "لا توجد فيديوهات بعد.",
      no_my_videos: "لم تقم برفع فيديوهات بعد.",
      no_comments: "لا توجد تعليقات بعد.",
      copied: "تم نسخ الرابط.",
      copy_failed: "تعذر النسخ. انسخ الرابط يدويًا.",
      share_text: "شاهد هذا الفيديو على ريلز العرب",
      delete_video: "حذف",
      delete_confirm: "هل تريد حذف هذا الفيديو؟",
      comment_placeholder: "اكتب تعليقك...",
      notifications: "الإشعارات",
      no_notifications: "لا توجد إشعارات حتى الآن.",
      mention_added: "تمت إضافة المنشن.",
      mention_prefix: "منشن",
      react_required: "سجل دخولك أولًا للتفاعل.",
      following_requires_login: "سجل دخولك لعرض فيديوهات المتابعة.",
      no_following_videos: "لا توجد فيديوهات من الحسابات التي تتابعها.",
      profile_page: "الصفحة الشخصية",
      upload_page: "رفع",
      tap_to_start_audio: "اضغط لتشغيل الصوت",
      tap_to_start_audio_sub: "بعض المتصفحات تمنع التشغيل التلقائي بالصوت."
    },
    en: {
      following: "Following",
      for_you: "For You",
      live: "Live",
      account_panel: "Account Panel",
      watch_free: "Watching is public. Login is required for upload and comments.",
      login: "Login",
      register: "Register",
      email: "Email",
      email_or_username: "Email or username",
      password: "Password",
      name: "Name",
      username: "Username",
      upload_video: "Upload Video",
      video_title: "Video Title",
      video_desc: "Video Description",
      video_lang: "Video Language",
      video_file: "Video File (MP4/WebM/MOV)",
      upload_now: "Upload Now",
      my_videos: "My Videos",
      logout: "Logout",
      feed_aria: "Short videos feed",
      actions_aria: "Feed actions",
      like_aria: "Like",
      comment_aria: "Comment",
      share_aria: "Share",
      comments: "Comments",
      send: "Send",
      auth_required: "Please login first.",
      loading: "Loading...",
      login_success: "Login successful.",
      register_success: "Account created.",
      logout_success: "Logged out.",
      upload_success: "Video uploaded successfully.",
      profile_updated: "Profile updated.",
      no_videos: "No videos available.",
      no_my_videos: "No uploaded videos yet.",
      no_comments: "No comments yet.",
      copied: "Link copied.",
      copy_failed: "Copy failed. Please copy manually.",
      share_text: "Watch this video on Reels Arab",
      delete_video: "Delete",
      delete_confirm: "Delete this video?",
      comment_placeholder: "Write a comment...",
      notifications: "Notifications",
      no_notifications: "No notifications yet.",
      mention_added: "Mention added.",
      mention_prefix: "Mention",
      react_required: "Please login to react.",
      following_requires_login: "Login to see Following videos.",
      no_following_videos: "No videos from followed users yet.",
      profile_page: "Profile",
      upload_page: "Upload",
      tap_to_start_audio: "Tap to enable sound",
      tap_to_start_audio_sub: "Some browsers block autoplay with sound."
    }
  };

  const refs = {
    feed: document.getElementById("feed"),
    template: document.getElementById("videoCardTemplate"),
    authorLine: document.getElementById("authorLine"),
    authorAvatarBtn: document.getElementById("authorAvatarBtn"),
    authorAvatarText: document.getElementById("authorAvatarText"),
    authorFollowBadge: document.getElementById("authorFollowBadge"),
    titleLine: document.getElementById("titleLine"),
    captionLine: document.getElementById("captionLine"),
    likeBtn: document.getElementById("likeBtn"),
    commentBtn: document.getElementById("commentBtn"),
    shareBtn: document.getElementById("shareBtn"),
    shareModal: document.getElementById("shareModal"),
    shareClose: document.getElementById("shareClose"),
    shareProfileBtn: document.getElementById("shareProfileBtn"),
    shareExternalBtn: document.getElementById("shareExternalBtn"),
    shareCopyBtn: document.getElementById("shareCopyBtn"),
    likesCount: document.getElementById("likesCount"),
    commentsCount: document.getElementById("commentsCount"),
    sharesCount: document.getElementById("sharesCount"),
    notificationsToggle: document.getElementById("notificationsToggle"),
    notificationsBadge: document.getElementById("notificationsBadge"),
    notificationsPanel: document.getElementById("notificationsPanel"),
    notificationsClose: document.getElementById("notificationsClose"),
    notificationsList: document.getElementById("notificationsList"),
    sidebarSearch: document.getElementById("sidebarSearch"),
    mobileSearch: document.getElementById("mobileSearch"),
    mobileSearchClear: document.getElementById("mobileSearchClear"),
    mobileNotifBtn: document.getElementById("mobileNotifBtn"),
    mobileNotifBadge: document.getElementById("mobileNotifBadge"),
    uploadModal: document.getElementById("uploadModal"),
    uploadClose: document.getElementById("uploadClose"),
    uploadForm: document.getElementById("uploadForm"),
    uploadAuthPrompt: document.getElementById("uploadAuthPrompt"),
    muteBtn: document.getElementById("globalMute"),
    profilePageBtn: document.getElementById("profilePageBtn"),
    loginQuickBtn: document.getElementById("loginQuickBtn"),
    uploadBtn: document.getElementById("uploadBtn"),
    navPrev: document.getElementById("navPrev"),
    navNext: document.getElementById("navNext"),
    langToggle: document.getElementById("langToggle"),
    statusMsg: document.getElementById("statusMsg"),
    modeTabs: Array.from(document.querySelectorAll(".mode-tabs .tab")),
    homeMenuItems: Array.from(document.querySelectorAll("[data-home-action]")),
    i18nNodes: Array.from(document.querySelectorAll("[data-i18n]")),
    commentsDrawer: document.getElementById("commentsDrawer"),
    commentsClose: document.getElementById("commentsClose"),
    commentsList: document.getElementById("commentsList"),
    commentForm: document.getElementById("commentForm"),
    commentInput: document.getElementById("commentInput")
  };

  const t = (key) => i18n[state.currentLang][key] || key;

  const refreshMuteButton = () => {
    if (!refs.muteBtn) return;
    const symbol = state.muted ? "\uD83D\uDD07" : "\uD83D\uDD0A";
    const muteIcon = refs.muteBtn.querySelector(".action-icon");
    if (muteIcon) {
      muteIcon.textContent = symbol;
    } else {
      refs.muteBtn.textContent = symbol;
    }
  };

  const AUDIO_GATE_ID = "rhacAudioGate";

  const updateAudioGateText = () => {
    const gate = document.getElementById(AUDIO_GATE_ID);
    if (!gate) return;
    const title = gate.querySelector("[data-audio-gate-title]");
    const sub = gate.querySelector("[data-audio-gate-sub]");
    if (title) title.textContent = t("tap_to_start_audio");
    if (sub) sub.textContent = t("tap_to_start_audio_sub");
  };

  const showAudioGate = () => {
    if (state.audioGateVisible) {
      updateAudioGateText();
      return;
    }
    const gate = document.createElement("div");
    gate.id = AUDIO_GATE_ID;
    gate.style.position = "fixed";
    gate.style.inset = "0";
    gate.style.zIndex = "9999";
    gate.style.display = "grid";
    gate.style.placeItems = "center";
    gate.style.background = "rgba(0,0,0,0.46)";
    gate.style.backdropFilter = "blur(4px)";
    gate.style.padding = "20px";
    gate.innerHTML = `
      <button type="button" style="border:0;border-radius:24px;padding:20px 22px;max-width:420px;width:min(92vw,420px);background:#ffffff;color:#101010;font:700 16px/1.4 Cairo, sans-serif;cursor:pointer;box-shadow:0 20px 50px rgba(0,0,0,.35);text-align:center;">
        <span aria-hidden="true" style="display:grid;place-items:center;width:78px;height:78px;margin:0 auto 12px;border-radius:999px;background:#111;color:#fff;font-size:34px;line-height:1;">▶</span>
        <div data-audio-gate-title>${escapeHtml(t("tap_to_start_audio"))}</div>
        <small data-audio-gate-sub style="display:block;margin-top:6px;opacity:.75;font-weight:600;font-size:12px;">${escapeHtml(t("tap_to_start_audio_sub"))}</small>
      </button>
    `;
    const actionButton = gate.querySelector("button");
    if (actionButton) {
      actionButton.addEventListener("click", () => {
        tryUnmuteAfterGesture();
      });
    }
    document.body.appendChild(gate);
    state.audioGateVisible = true;
  };

  const hideAudioGate = () => {
    const gate = document.getElementById(AUDIO_GATE_ID);
    if (gate) gate.remove();
    state.audioGateVisible = false;
  };

  const LIKED_STORAGE_KEY = "rhac_liked_video_ids";

  const readStoredLikedIds = () => {
    try {
      const raw = localStorage.getItem(LIKED_STORAGE_KEY);
      if (!raw) return new Set();
      const values = JSON.parse(raw);
      if (!Array.isArray(values)) return new Set();
      return new Set(values.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0));
    } catch (_) {
      return new Set();
    }
  };

  const saveStoredLikedIds = () => {
    try {
      localStorage.setItem(LIKED_STORAGE_KEY, JSON.stringify(Array.from(state.likedVideoIds)));
    } catch (_) {}
  };

  const normalizeIdSet = (items) =>
    new Set((Array.isArray(items) ? items : []).map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0));

  const syncLikedState = async () => {
    if (!state.currentUser) {
      state.likedVideoIds = readStoredLikedIds();
      return;
    }

    try {
      const payload = await api("video_preferences");
      state.likedVideoIds = normalizeIdSet(payload.liked_video_ids);
      saveStoredLikedIds();
    } catch (_) {
      state.likedVideoIds = readStoredLikedIds();
    }
  };

  const formatNumber = (value) =>
    new Intl.NumberFormat(state.currentLang === "ar" ? "ar" : "en", {
      notation: "compact",
      maximumFractionDigits: 1
    }).format(value || 0);

  const showStatus = (message, isError = false) => {
    if (!refs.statusMsg) return;
    refs.statusMsg.textContent = message;
    refs.statusMsg.classList.toggle("error", isError);
  };

  const initAdUnits = () => {
    const adNodes = Array.from(document.querySelectorAll('ins.adsbygoogle[data-ad-active="1"]'));
    if (!adNodes.length) return;
    adNodes.forEach((node) => {
      if (node.dataset.adsInitialized === "1") return;
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        node.dataset.adsInitialized = "1";
      } catch (_) {}
    });
  };

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const escapeAttr = (value) => escapeHtml(value).replace(/`/g, "&#96;");

  const renderContentWithMentions = (content) =>
    escapeHtml(content).replace(/(^|[\s(>{.,!?;:\u060C\u061B\u061F])@([\p{L}\p{N}._-]{3,24})/gu, (full, prefix, username) => {
      return `${prefix}<span class="mention">@${username}</span>`;
    });

  const reactionTypes = [
    { key: "like", emoji: "👍" },
    { key: "love", emoji: "❤️" },
    { key: "haha", emoji: "😂" },
    { key: "wow", emoji: "😮" },
    { key: "sad", emoji: "😢" }
  ];

  const api = async (action, method = "GET", body = null, isForm = false, params = null) => {
    if (window.RHAC_LOCAL_API && typeof window.RHAC_LOCAL_API.request === "function") {
      return window.RHAC_LOCAL_API.request({
        endpoint: "app-api.php",
        action,
        method,
        body,
        isForm,
        params
      });
    }

    const options = { method, credentials: "same-origin", cache: "no-store" };
    if (body) {
      if (isForm) {
        options.body = body;
      } else {
        options.headers = { "Content-Type": "application/json" };
        options.body = JSON.stringify(body);
      }
    }

    const query = new URLSearchParams({ action: String(action || "") });
    if (params && typeof params === "object") {
      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        query.set(key, String(value));
      });
    }

    const response = await fetch(`app-api.php?${query.toString()}`, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) {
      throw new Error(payload.message || "Request failed");
    }
    return payload;
  };

  const applyLanguage = (lang) => {
    state.currentLang = lang === "en" ? "en" : "ar";
    document.documentElement.lang = state.currentLang;
    document.documentElement.dir = state.currentLang === "ar" ? "rtl" : "ltr";
    refs.langToggle.textContent = state.currentLang.toUpperCase();
    refs.i18nNodes.forEach((node) => {
      const key = node.dataset.i18n;
      if (key) node.textContent = t(key);
    });
    refs.commentInput.placeholder = t("comment_placeholder");
    refs.feed.setAttribute("aria-label", t("feed_aria"));
    document.querySelector(".action-rail")?.setAttribute("aria-label", t("actions_aria"));
    refs.likeBtn.setAttribute("aria-label", t("like_aria"));
    refs.commentBtn.setAttribute("aria-label", t("comment_aria"));
    refs.shareBtn.setAttribute("aria-label", t("share_aria"));
    refs.notificationsToggle?.setAttribute("aria-label", t("notifications"));
    if (refs.profilePageBtn) refs.profilePageBtn.textContent = t("profile_page");
    if (refs.uploadBtn) {
      refs.uploadBtn.setAttribute("aria-label", t("upload_video"));
    }
    updateAudioGateText();
    try {
      localStorage.setItem("rhac_lang", state.currentLang);
    } catch (_) {}
    updateMeta();
    renderNotifications();
  };

  const createVideoCard = (video, index) => {
    const fragment = refs.template.content.cloneNode(true);
    const card = fragment.querySelector(".reel-card");
    const videoEl = fragment.querySelector(".reel-video");
    let clickTimer = null;

    card.dataset.index = String(index);
    card.dataset.id = String(video.id);
    videoEl.src = video.video_url;
    if (video.poster_url) videoEl.poster = video.poster_url;
    videoEl.muted = state.muted;

    card.addEventListener("click", (event) => {
      if (state.currentIndex !== index) return;
      if (event.detail !== 1) return;
      const target = event.target;
      if (target instanceof Element && target.closest("button, a, input, textarea, select, label")) return;
      if (clickTimer) clearTimeout(clickTimer);
      clickTimer = setTimeout(() => {
        const activeCard = state.cards[state.currentIndex];
        if (!activeCard) return;
        if (Number(activeCard.dataset.index || -1) !== index) return;
        toggleCurrentPlayback();
      }, 180);
    });

    card.addEventListener("dblclick", async () => {
      if (clickTimer) {
        clearTimeout(clickTimer);
        clickTimer = null;
      }
      if (state.currentIndex !== index) return;
      try {
        await toggleLike(true);
      } catch (error) {
        showStatus(error.message, true);
      }
    });

    return fragment;
  };

  const setupObserver = () => {
    if (state.observer) state.observer.disconnect();
    state.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.72) return;
          const nextIndex = Number(entry.target.dataset.index || 0);
          if (nextIndex !== state.currentIndex) playAt(nextIndex);
        });
      },
      { threshold: [0.72] }
    );
    state.cards.forEach((card) => state.observer.observe(card));
  };

  const currentVideo = () => state.videos[state.currentIndex] || null;

  const currentVideoElement = () => {
    const card = state.cards[state.currentIndex];
    if (!card) return null;
    return card.querySelector("video");
  };

  const playWithPreference = (video) => {
    if (!video) return;
    video.muted = state.muted;
    const attempt = video.play();
    if (!(attempt && typeof attempt.then === "function")) return;

    attempt
      .then(() => {
        if (!video.muted) {
          state.needsGestureUnmute = false;
          hideAudioGate();
        }
      })
      .catch((error) => {
        const blocked = !!error && String(error.name || "").toLowerCase() === "notallowederror";
        if (blocked && !state.muted) {
          state.muted = true;
          state.needsGestureUnmute = true;
          refreshMuteButton();
          video.muted = true;
          video.play().catch(() => {});
          showAudioGate();
          showStatus(
            state.currentLang === "ar"
              ? "المتصفح منع التشغيل التلقائي بالصوت."
              : "Autoplay with sound was blocked."
          );
          return;
        }
        if (blocked && !state.autoplayHintShown) {
          state.autoplayHintShown = true;
          showStatus(
            state.currentLang === "ar"
              ? "اضغط على الفيديو لتشغيله."
              : "Tap the video to play.",
            true
          );
        }
      });
  };

  const toggleCurrentPlayback = () => {
    const video = currentVideoElement();
    if (!video) return;
    if (video.paused || video.ended) {
      playWithPreference(video);
      return;
    }
    video.pause();
  };

  const updateMeta = () => {
    const video = currentVideo();
    if (!video) return;
    if (video.profile_url) {
      refs.authorLine.innerHTML = `<a href="${video.profile_url}">${video.author || "@" + (video.username || "user")}</a>`;
    } else {
      refs.authorLine.textContent = video.author || "@user";
    }
    refs.titleLine.textContent = video.title || "";
    refs.captionLine.textContent = video.description || "";
    if (refs.authorAvatarText) {
      const source = String(video.author || video.username || "@").trim();
      const text = source.startsWith("@") ? source.slice(1) : source;
      refs.authorAvatarText.textContent = (text[0] || "@").toUpperCase();
    }

    const canFollow = !!video.username && (!state.currentUser || state.currentUser.username !== video.username);
    const isFollowing = !!video.is_following_author;
    refs.authorAvatarBtn?.classList.toggle("following", canFollow && isFollowing);
    refs.authorAvatarBtn?.classList.toggle("disabled", !canFollow);
    if (refs.authorFollowBadge) {
      refs.authorFollowBadge.hidden = !canFollow;
      refs.authorFollowBadge.textContent = isFollowing ? "✓" : "+";
    }

    refs.likesCount.textContent = formatNumber(video.likes);
    refs.commentsCount.textContent = formatNumber(video.comments);
    refs.sharesCount.textContent = formatNumber(video.shares);
    refs.likeBtn.classList.toggle("active", state.likedVideoIds.has(Number(video.id || 0)));
  };

  const playAt = (index) => {
    if (!state.cards.length) return;
    state.currentIndex = Math.max(0, Math.min(index, state.cards.length - 1));
    state.cards.forEach((card, i) => {
      const v = card.querySelector("video");
      if (!v) return;
      if (i === state.currentIndex) {
        playWithPreference(v);
      } else {
        v.pause();
      }
    });
    updateMeta();
  };

  const renderFeed = () => {
    refs.feed.innerHTML = "";
    if (!state.videos.length) {
      const empty = document.createElement("div");
      empty.className = "empty-feed";
      empty.textContent = state.feedMode === "following" ? t("no_following_videos") : t("no_videos");
      refs.feed.appendChild(empty);
      refs.authorLine.textContent = "@reelsalarab";
      refs.titleLine.textContent = "ريلز العرب";
      refs.captionLine.textContent = state.feedMode === "following" ? t("no_following_videos") : t("no_videos");
      if (refs.authorAvatarText) refs.authorAvatarText.textContent = "@";
      refs.authorAvatarBtn?.classList.remove("following");
      refs.authorAvatarBtn?.classList.add("disabled");
      if (refs.authorFollowBadge) refs.authorFollowBadge.hidden = true;
      refs.likesCount.textContent = "0";
      refs.commentsCount.textContent = "0";
      refs.sharesCount.textContent = "0";
      return;
    }
    state.videos.forEach((video, index) => refs.feed.appendChild(createVideoCard(video, index)));
    state.cards = Array.from(refs.feed.querySelectorAll(".reel-card"));
    setupObserver();
    playAt(0);
  };

  const syncSearchInputs = () => {
    const value = state.searchQuery;
    if (refs.sidebarSearch && refs.sidebarSearch.value !== value) refs.sidebarSearch.value = value;
    if (refs.mobileSearch && refs.mobileSearch.value !== value) refs.mobileSearch.value = value;
    if (refs.mobileSearchClear) refs.mobileSearchClear.hidden = !value;
  };

  const applyFeedSearch = () => {
    const query = String(state.searchQuery || "").trim().toLowerCase();
    if (!query) {
      state.videos = [...state.allVideos];
      renderFeed();
      return;
    }

    state.videos = state.allVideos.filter((video) => {
      const title = String(video.title || "").toLowerCase();
      const description = String(video.description || "").toLowerCase();
      const author = String(video.author || "").toLowerCase();
      const username = String(video.username || "").toLowerCase();
      const authorName = String(video.author_name || "").toLowerCase();
      return (
        title.includes(query) ||
        description.includes(query) ||
        author.includes(query) ||
        username.includes(query) ||
        authorName.includes(query)
      );
    });
    renderFeed();
  };

  const loadFeed = async () => {
    if (state.feedMode === "following" && !state.currentUser) {
      state.allVideos = [];
      state.videos = [];
      renderFeed();
      showStatus(t("following_requires_login"), true);
      return;
    }

    const payload = await api("feed", "GET", null, false, { mode: state.feedMode });
    state.allVideos = Array.isArray(payload.videos) ? payload.videos : [];
    state.allVideos.forEach((video) => {
      const id = Number(video.id || 0);
      if (!id) return;
      if (video.is_liked_by_viewer) {
        state.likedVideoIds.add(id);
      }
    });
    saveStoredLikedIds();
    applyFeedSearch();
  };

  const setFeedMode = async (mode) => {
    state.feedMode = mode === "following" ? "following" : "for_you";
    refs.modeTabs.forEach((tab) => {
      const key = tab.dataset.i18n || "";
      tab.classList.toggle("active", key === (state.feedMode === "following" ? "following" : "for_you"));
    });
    await loadFeed();
  };

  const setActiveHomeMenu = (action) => {
    const key = String(action || "").toLowerCase();
    state.activeMenuAction = key || "home";
    refs.homeMenuItems.forEach((item) => {
      item.classList.toggle("active", (item.dataset.homeAction || "") === state.activeMenuAction);
    });
  };

  const ownProfileUrl = (hash = "") => {
    const suffix = hash ? `#${hash}` : "";
    if (!state.currentUser?.username) return `profile.html#auth`;
    return `profile.html?u=${encodeURIComponent(state.currentUser.username)}${suffix}`;
  };

  const openHomeAction = async (action) => {
    const key = String(action || "").toLowerCase();
    if (!key) return;

    if (key === "live") {
      setActiveHomeMenu("live");
      showStatus("البث المباشر غير متاح حاليًا.");
      return;
    }

    if (key === "home") {
      setActiveHomeMenu("home");
      await setFeedMode("for_you");
      window.history.replaceState({}, "", "./");
      return;
    }

    if (key === "explore") {
      setActiveHomeMenu("explore");
      await setFeedMode("for_you");
      window.history.replaceState({}, "", "./?mode=for_you");
      return;
    }

    if (key === "following") {
      setActiveHomeMenu("following");
      await setFeedMode("following");
      window.history.replaceState({}, "", "./?mode=following");
      return;
    }

    if (key === "upload") {
      await openUploadModal();
      return;
    }

    if (key === "profile") {
      window.location.href = ownProfileUrl("");
      return;
    }

    if (key === "friends") {
      window.location.href = ownProfileUrl("friends");
      return;
    }

    if (key === "messages") {
      window.location.href = ownProfileUrl("messages");
      return;
    }

    if (key === "activity") {
      window.location.href = ownProfileUrl("activity");
      return;
    }

    if (key === "more") {
      window.location.href = ownProfileUrl("more");
    }
  };

  const refreshAuth = async () => {
    const payload = await api("auth");
    state.currentUser = payload.user;
    await syncLikedState();
    renderAuth();
  };

  const renderAuth = () => {
    const u = state.currentUser;
    refs.notificationsPanel.hidden = true;
    state.notificationsOpen = false;
    if (refs.uploadModal && !refs.uploadModal.hidden) {
      if (refs.uploadAuthPrompt) refs.uploadAuthPrompt.hidden = !!u;
      if (refs.uploadForm) refs.uploadForm.hidden = !u;
    }
    if (refs.profilePageBtn) {
      refs.profilePageBtn.href = u?.username ? `profile.html?u=${encodeURIComponent(u.username)}` : "profile.html";
    }
    if (refs.loginQuickBtn) {
      const loggedIn = !!u?.username;
      refs.loginQuickBtn.href = loggedIn ? `profile.html?u=${encodeURIComponent(u.username)}` : "profile.html#auth";
      refs.loginQuickBtn.classList.toggle("logged-in", loggedIn);
      refs.loginQuickBtn.setAttribute("aria-label", loggedIn ? "الصفحة الشخصية" : "تسجيل الدخول");
      refs.loginQuickBtn.setAttribute("title", loggedIn ? "الصفحة الشخصية" : "تسجيل الدخول");
    }
    if (!u) {
      stopNotificationsPolling();
      refs.commentsDrawer.hidden = true;
      setCommentsDrawerOpen(false);
      state.notifications = [];
      state.unreadNotifications = 0;
      renderNotifications();
      return;
    }
    startNotificationsPolling();
    loadNotifications().catch((e) => showStatus(e.message, true));
  };

  const toggleLike = async (forceLike = false) => {
    const video = currentVideo();
    if (!video) return;
    const videoId = Number(video.id || 0);
    const liked = state.likedVideoIds.has(videoId);
    const nextLiked = forceLike ? true : !liked;

    if (state.currentUser) {
      const payload = await api("set_video_like", "POST", { video_id: videoId, liked: nextLiked });
      if (payload.is_liked) {
        state.likedVideoIds.add(videoId);
      } else {
        state.likedVideoIds.delete(videoId);
      }
      video.likes = Number(payload.likes_count || 0);
    } else {
      if (nextLiked && !liked) {
        state.likedVideoIds.add(videoId);
        video.likes += 1;
      } else if (!nextLiked && liked) {
        state.likedVideoIds.delete(videoId);
        video.likes = Math.max(0, video.likes - 1);
      }
    }

    saveStoredLikedIds();
    updateMeta();
  };

  const updateNotificationsBadge = () => {
    const count = Number(state.unreadNotifications || 0);
    const text = count > 99 ? "99+" : String(count);
    if (refs.notificationsBadge) {
      refs.notificationsBadge.hidden = !state.currentUser || count <= 0;
      refs.notificationsBadge.textContent = text;
    }
    if (refs.mobileNotifBadge) {
      refs.mobileNotifBadge.hidden = !state.currentUser || count <= 0;
      refs.mobileNotifBadge.textContent = text;
    }
  };

  const stopNotificationsPolling = () => {
    if (!state.notificationsPollTimer) return;
    clearInterval(state.notificationsPollTimer);
    state.notificationsPollTimer = null;
  };

  const startNotificationsPolling = () => {
    if (!state.currentUser || state.notificationsPollTimer) return;
    state.notificationsPollTimer = setInterval(() => {
      loadNotifications().catch(() => {});
    }, 12000);
  };

  const renderNotifications = () => {
    if (!refs.notificationsList) return;
    if (!state.currentUser) {
      refs.notificationsList.innerHTML = `<p class="comment-empty">${t("auth_required")}</p>`;
      updateNotificationsBadge();
      return;
    }

    if (!state.notifications.length) {
      refs.notificationsList.innerHTML = `<p class="comment-empty">${t("no_notifications")}</p>`;
      updateNotificationsBadge();
      return;
    }

    const locale = state.currentLang === "ar" ? "ar" : "en";
    refs.notificationsList.innerHTML = state.notifications
      .map((n) => {
        const actor = n.actor_username ? `@${n.actor_username}` : "";
        const actorPart = actor ? `<strong>${escapeHtml(actor)}</strong> ` : "";
        return `
          <article class="notification-item${n.is_read ? "" : " unread"}" data-notification-id="${n.id}">
            <p>${actorPart}${escapeHtml(n.message)}</p>
            <small>${new Date(n.created_at).toLocaleString(locale)}</small>
          </article>
        `;
      })
      .join("");
    updateNotificationsBadge();
  };

  const loadNotifications = async () => {
    if (!state.currentUser) return;
    const payload = await api("notifications");
    state.notifications = Array.isArray(payload.notifications) ? payload.notifications : [];
    state.unreadNotifications = Number(payload.unread_count || 0);
    renderNotifications();
  };

  const markNotificationsRead = async () => {
    if (!state.currentUser || !state.unreadNotifications) return;
    await api("notifications_mark_read", "POST", {});
    state.unreadNotifications = 0;
    state.notifications = state.notifications.map((n) => ({ ...n, is_read: true }));
    renderNotifications();
  };

  const insertMention = (username) => {
    if (!username) return;
    if (!state.currentUser) {
      showStatus(t("auth_required"), true);
      return;
    }
    const token = `@${username}`;
    const current = refs.commentInput.value.trim();
    refs.commentInput.value = current ? `${current} ${token} ` : `${token} `;
    refs.commentInput.focus();
    showStatus(t("mention_added"));
  };

  const renderComments = (rows) => {
    refs.commentsList.innerHTML = "";
    if (!rows.length) {
      refs.commentsList.innerHTML = `<p class="comment-empty">${t("no_comments")}</p>`;
      return;
    }

    const locale = state.currentLang === "ar" ? "ar" : "en";
    refs.commentsList.innerHTML = rows
      .map((c) => {
        const totals = c.reactions?.totals || {};
        const mine = c.reactions?.mine || null;
        const authorLabel = c.author_username
          ? `${c.author_name} (@${c.author_username})`
          : c.author_name;
        const reactionsHtml = reactionTypes
          .map((r) => {
            const count = Number(totals[r.key] || 0);
            const active = mine === r.key ? " active" : "";
            return `<button type="button" class="reaction-chip${active}" data-comment-id="${c.id}" data-reaction="${r.key}">${r.emoji}${count > 0 ? ` ${count}` : ""}</button>`;
          })
          .join("");

        return `
          <article class="comment-item" data-comment-id="${c.id}">
            <div class="comment-meta-row">
              <button type="button" class="comment-author-btn" data-mention="${escapeAttr(c.author_username || "")}">${escapeHtml(authorLabel)}</button>
              <small>${new Date(c.created_at).toLocaleString(locale)}</small>
            </div>
            <p class="comment-content">${renderContentWithMentions(c.content)}</p>
            <div class="comment-reactions">${reactionsHtml}</div>
          </article>
        `;
      })
      .join("");
  };

  const reactToComment = async (commentId, reaction) => {
    if (!state.currentUser) {
      showStatus(t("react_required"), true);
      return;
    }
    await api("react_comment", "POST", { comment_id: commentId, reaction });
    await openComments();
  };

  const setCommentsDrawerOpen = (open) => {
    document.body.classList.toggle("comments-open", !!open);
  };

  const openComments = async () => {
    const video = currentVideo();
    if (!video) return;
    state.activeCommentsVideoId = video.id;
    refs.notificationsPanel.hidden = true;
    closeShareModal();
    closeUploadModal();
    state.notificationsOpen = false;
    refs.commentsDrawer.hidden = false;
    setCommentsDrawerOpen(true);
    refs.commentsList.innerHTML = `<p class="comment-empty">${t("loading")}</p>`;

    try {
      const payload = await api("comments", "GET", null, false, { video_id: video.id });
      const rows = payload.comments || [];
      renderComments(rows);
      refs.commentInput.disabled = !state.currentUser;
      refs.commentInput.placeholder = state.currentUser ? t("comment_placeholder") : t("auth_required");
    } catch (error) {
      refs.commentsList.innerHTML = `<p class="comment-empty">${error.message}</p>`;
    }
  };

  const closeShareModal = () => {
    if (!refs.shareModal) return;
    refs.shareModal.hidden = true;
  };

  const openShareModal = () => {
    const video = currentVideo();
    if (!video) return;
    refs.commentsDrawer.hidden = true;
    setCommentsDrawerOpen(false);
    refs.notificationsPanel.hidden = true;
    closeUploadModal();
    state.notificationsOpen = false;
    if (refs.shareModal) refs.shareModal.hidden = false;
  };

  const shareDataForVideo = (video) => ({
    title: video.title,
    text: t("share_text"),
    url: new URL(`?video=${video.id}`, window.location.href).toString()
  });

  const recordShare = async (mode) => {
    const video = currentVideo();
    if (!video) return;
    try {
      const payload = await api("share_video", "POST", { video_id: Number(video.id || 0), mode });
      video.shares = Number(payload.shares_count || video.shares || 0);
      updateMeta();
    } catch (_) {
      video.shares += 1;
      updateMeta();
    }
  };

  const closeUploadModal = () => {
    if (!refs.uploadModal) return;
    refs.uploadModal.hidden = true;
  };

  const tryUnmuteAfterGesture = () => {
    if (!state.needsGestureUnmute) return;
    const video = currentVideoElement();
    state.muted = false;
    state.needsGestureUnmute = false;
    refreshMuteButton();
    hideAudioGate();
    if (!video) return;
    video.muted = false;
    playWithPreference(video);
  };

  const ensureCurrentUser = async () => {
    if (state.currentUser) return state.currentUser;
    try {
      await refreshAuth();
    } catch (_) {}
    return state.currentUser;
  };

  const openUploadModal = async () => {
    if (!refs.uploadModal) return;
    refs.commentsDrawer.hidden = true;
    setCommentsDrawerOpen(false);
    refs.notificationsPanel.hidden = true;
    state.notificationsOpen = false;
    refs.uploadModal.hidden = false;

    let isLoggedIn = !!state.currentUser;
    if (!isLoggedIn) {
      await ensureCurrentUser();
      isLoggedIn = !!state.currentUser;
    }
    if (refs.uploadAuthPrompt) refs.uploadAuthPrompt.hidden = isLoggedIn;
    // Keep form available; real auth is validated by upload API response.
    if (refs.uploadForm) refs.uploadForm.hidden = false;
  };

  const addComment = async (content) => {
    if (!state.currentUser) throw new Error(t("auth_required"));
    const video = currentVideo();
    if (!video) throw new Error("Video not found");
    const payload = await api("add_comment", "POST", { video_id: video.id, content });
    video.comments = payload.comments_count || video.comments + 1;
    updateMeta();
    await openComments();
  };

  const bindEvents = () => {
    refs.langToggle.addEventListener("click", () => applyLanguage(state.currentLang === "ar" ? "en" : "ar"));

    refs.muteBtn.addEventListener("click", () => {
      state.muted = !state.muted;
      if (!state.muted) {
        state.needsGestureUnmute = false;
        hideAudioGate();
      }
      refreshMuteButton();
      const currentCard = state.cards[state.currentIndex];
      const video = currentCard?.querySelector("video");
      if (video) {
        video.muted = state.muted;
        video.play().catch(() => {});
      }
    });

    refs.likeBtn.addEventListener("click", async () => {
      try {
        await toggleLike(false);
      } catch (error) {
        showStatus(error.message, true);
      }
    });
    refs.commentBtn.addEventListener("click", () => openComments());
    refs.commentsClose.addEventListener("click", () => {
      refs.commentsDrawer.hidden = true;
      setCommentsDrawerOpen(false);
    });

    const toggleNotificationsPanel = async () => {
      if (!state.currentUser) {
        showStatus(t("auth_required"), true);
        return;
      }
      const willOpen = refs.notificationsPanel.hidden;
      refs.commentsDrawer.hidden = true;
      setCommentsDrawerOpen(false);
      closeShareModal();
      closeUploadModal();
      refs.notificationsPanel.hidden = !willOpen;
      state.notificationsOpen = willOpen;
      if (willOpen) {
        try {
          await loadNotifications();
          await markNotificationsRead();
        } catch (error) {
          showStatus(error.message, true);
        }
      }
    };

    refs.notificationsToggle?.addEventListener("click", toggleNotificationsPanel);
    refs.mobileNotifBtn?.addEventListener("click", toggleNotificationsPanel);

    refs.notificationsClose?.addEventListener("click", () => {
      refs.notificationsPanel.hidden = true;
      state.notificationsOpen = false;
    });

    refs.shareClose?.addEventListener("click", () => {
      closeShareModal();
    });

    refs.shareModal?.addEventListener("click", (event) => {
      if (event.target === refs.shareModal) {
        closeShareModal();
      }
    });

    refs.uploadClose?.addEventListener("click", () => {
      closeUploadModal();
    });

    refs.uploadModal?.addEventListener("click", (event) => {
      if (event.target === refs.uploadModal) {
        closeUploadModal();
      }
    });

    refs.uploadForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        showStatus(t("loading"));
        const formData = new FormData(refs.uploadForm);
        await api("upload", "POST", formData, true);
        refs.uploadForm.reset();
        closeUploadModal();
        await refreshAuth().catch(() => {});
        await loadFeed();
        showStatus(t("upload_success"));
      } catch (error) {
        const message = String(error?.message || "");
        const authError = /unauthorized|login|auth|required|session/i.test(message);
        if (authError) {
          if (refs.uploadAuthPrompt) refs.uploadAuthPrompt.hidden = false;
          showStatus(t("auth_required"), true);
          return;
        }
        showStatus(message || "Upload failed.", true);
      }
    });

    refs.commentsList.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const mentionButton = target.closest(".comment-author-btn");
      if (mentionButton instanceof HTMLButtonElement) {
        const username = mentionButton.dataset.mention || "";
        if (username) insertMention(username);
        return;
      }

      const reactionButton = target.closest(".reaction-chip");
      if (reactionButton instanceof HTMLButtonElement) {
        const commentId = Number(reactionButton.dataset.commentId || 0);
        const reaction = String(reactionButton.dataset.reaction || "");
        if (!commentId || !reaction) return;
        try {
          await reactToComment(commentId, reaction);
        } catch (error) {
          showStatus(error.message, true);
        }
      }
    });

    refs.commentForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const content = refs.commentInput.value.trim();
      if (!content) return;
      try {
        await addComment(content);
        refs.commentForm.reset();
      } catch (error) {
        showStatus(error.message, true);
      }
    });

    refs.shareBtn.addEventListener("click", async () => {
      openShareModal();
    });

    refs.shareExternalBtn?.addEventListener("click", async () => {
      const video = currentVideo();
      if (!video) return;
      const shareData = shareDataForVideo(video);
      if (navigator.share) {
        try {
          await navigator.share(shareData);
          await recordShare("external");
          closeShareModal();
          return;
        } catch (_) {}
      }
      try {
        await navigator.clipboard.writeText(shareData.url);
        await recordShare("external");
        closeShareModal();
        showStatus(t("copied"));
      } catch (_) {
        showStatus(t("copy_failed"), true);
      }
    });

    refs.shareCopyBtn?.addEventListener("click", async () => {
      const video = currentVideo();
      if (!video) return;
      const shareData = shareDataForVideo(video);
      try {
        await navigator.clipboard.writeText(shareData.url);
        await recordShare("copy");
        closeShareModal();
        showStatus(t("copied"));
      } catch (_) {
        showStatus(t("copy_failed"), true);
      }
    });

    refs.shareProfileBtn?.addEventListener("click", async () => {
      const video = currentVideo();
      if (!video) return;
      if (!state.currentUser) {
        showStatus(t("auth_required"), true);
        return;
      }
      try {
        const payload = await api("share_video", "POST", { video_id: Number(video.id || 0), mode: "repost" });
        video.shares = Number(payload.shares_count || video.shares || 0);
        updateMeta();
        closeShareModal();
        showStatus("تمت المشاركة على صفحتي.");
      } catch (error) {
        showStatus(error.message, true);
      }
    });

    refs.uploadBtn?.addEventListener("click", async () => {
      await openUploadModal();
    });

    refs.authorAvatarBtn?.addEventListener("click", async () => {
      const video = currentVideo();
      if (!video) return;
      if (!video.username) {
        showStatus(state.currentLang === "ar" ? "لا يمكنك متابعة هذا الحساب حاليًا." : "Follow is unavailable for this account.", true);
        return;
      }

      if (!state.currentUser) {
        showStatus(t("auth_required"), true);
        return;
      }

      if (state.currentUser.username === video.username) {
        showStatus(state.currentLang === "ar" ? "هذا حسابك بالفعل." : "This is your account.");
        return;
      }

      try {
        const payload = await api("toggle_follow", "POST", { username: video.username });
        const nextFollowing = !!payload.is_following;
        state.videos.forEach((row) => {
          if (String(row.username || "").toLowerCase() === String(video.username || "").toLowerCase()) {
            row.is_following_author = nextFollowing;
          }
        });
        updateMeta();
        showStatus(nextFollowing ? "تمت المتابعة." : "تم إلغاء المتابعة.");
      } catch (error) {
        showStatus(error.message, true);
      }
    });

    refs.modeTabs.forEach((tab) => {
      tab.addEventListener("click", async () => {
        const mode = (tab.dataset.i18n || "") === "following" ? "following" : "for_you";
        try {
          await setFeedMode(mode);
          setActiveHomeMenu(mode === "following" ? "following" : "home");
        } catch (error) {
          showStatus(error.message, true);
        }
      });
    });

    const onSearchInput = (event) => {
      const value = String(event.target?.value || "");
      state.searchQuery = value;
      syncSearchInputs();
      applyFeedSearch();
    };

    refs.sidebarSearch?.addEventListener("input", onSearchInput);
    refs.mobileSearch?.addEventListener("input", onSearchInput);
    refs.mobileSearchClear?.addEventListener("click", () => {
      state.searchQuery = "";
      syncSearchInputs();
      applyFeedSearch();
      refs.mobileSearch?.focus();
    });
    refs.homeMenuItems.forEach((item) => {
      item.addEventListener("click", async (event) => {
        const action = item.dataset.homeAction || "";
        if (!action) return;
        event.preventDefault();
        try {
          await openHomeAction(action);
        } catch (error) {
          showStatus(error.message, true);
        }
      });
    });

    refs.navPrev?.addEventListener("click", () => {
      if (!state.cards.length) return;
      const prev = Math.max(0, state.currentIndex - 1);
      state.cards[prev]?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    refs.navNext?.addEventListener("click", () => {
      if (!state.cards.length) return;
      const next = Math.min(state.cards.length - 1, state.currentIndex + 1);
      state.cards[next]?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    refs.feed.addEventListener(
      "wheel",
      (event) => {
        if (!state.cards.length) return;
        if (Math.abs(event.deltaY) < 16) return;
        event.preventDefault();
        const next = state.currentIndex + (event.deltaY > 0 ? 1 : -1);
        const safe = Math.max(0, Math.min(next, state.cards.length - 1));
        state.cards[safe].scrollIntoView({ behavior: "smooth", block: "start" });
      },
      { passive: false }
    );

    document.addEventListener("keydown", (event) => {
      const activeTag = String(document.activeElement?.tagName || "").toLowerCase();
      if (event.code === "Space" && !["input", "textarea", "select", "button"].includes(activeTag)) {
        event.preventDefault();
        toggleCurrentPlayback();
        return;
      }

      if (event.key === "ArrowDown") {
        const next = Math.min(state.cards.length - 1, state.currentIndex + 1);
        state.cards[next]?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      if (event.key === "ArrowUp") {
        const prev = Math.max(0, state.currentIndex - 1);
        state.cards[prev]?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      if (event.key.toLowerCase() === "m") refs.muteBtn.click();
      if (event.key === "Escape") {
        refs.commentsDrawer.hidden = true;
        setCommentsDrawerOpen(false);
        refs.notificationsPanel.hidden = true;
        closeShareModal();
        closeUploadModal();
        state.notificationsOpen = false;
      }
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible" || !state.currentUser) return;
      loadNotifications().catch(() => {});
    });

    window.addEventListener("focus", () => {
      if (!state.currentUser) return;
      loadNotifications().catch(() => {});
    });

    ["pointerdown", "touchstart", "wheel", "keydown"].forEach((eventName) => {
      document.addEventListener(
        eventName,
        () => {
          tryUnmuteAfterGesture();
        },
        { passive: true }
      );
    });
  };

  const init = async () => {
    state.likedVideoIds = readStoredLikedIds();

    const savedLang = (() => {
      try {
        return localStorage.getItem("rhac_lang");
      } catch (_) {
        return null;
      }
    })();
    const autoLang = (navigator.language || "").toLowerCase().startsWith("ar") ? "ar" : "en";
    applyLanguage(savedLang || autoLang);
    syncSearchInputs();
    refreshMuteButton();
    initAdUnits();
    bindEvents();

    const searchParams = new URLSearchParams(window.location.search);
    const modeParam = (searchParams.get("mode") || "").toLowerCase();
    state.feedMode = modeParam === "following" ? "following" : "for_you";
    refs.modeTabs.forEach((tab) => {
      const key = tab.dataset.i18n || "";
      tab.classList.toggle("active", key === (state.feedMode === "following" ? "following" : "for_you"));
    });
    setActiveHomeMenu(state.feedMode === "following" ? "following" : "home");

    try {
      showStatus(t("loading"));
      await refreshAuth();
      await loadFeed();
      showStatus("");
    } catch (error) {
      showStatus(error.message, true);
    }
  };

  init();
})();



