(() => {
  "use strict";

  const DB_KEY = "rhac_local_api_db_v1";
  const SESSION_KEY = "rhac_local_api_session_v1";
  const BACKEND_PREF_KEY = "rhac_api_backend_pref_v1";

  const defaultReactionTotals = () => ({ like: 0, love: 0, haha: 0, wow: 0, sad: 0 });

  const nowIso = () => new Date().toISOString();

  const safeJsonParse = (raw, fallback) => {
    if (!raw) return fallback;
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : fallback;
    } catch (_) {
      return fallback;
    }
  };

  const normalizeText = (value) => String(value ?? "").trim();

  const normalizeEmail = (value) => normalizeText(value).toLowerCase();

  const slugify = (value) =>
    normalizeText(value)
      .toLowerCase()
      .replace(/[^\p{L}\p{N}._-]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/\.{2,}/g, ".")
      .slice(0, 24) || "user";

  const usernameIsValid = (value) => /^(?=.{3,24}$)[\p{L}\p{N}._-]+$/u.test(String(value || ""));
  const isPublishedStatus = (value) => {
    if (value === undefined || value === null) return true;
    if (typeof value === "boolean") return value;
    const normalized = String(value).trim().toLowerCase();
    if (!normalized) return true;
    return ["published", "public", "active", "approved", "live", "1", "true"].includes(normalized);
  };

  const byIdDesc = (a, b) => Number(b.id || 0) - Number(a.id || 0);
  const LOCAL_SAMPLE_VIDEOS = [
    "/uploads/videos/2026/03/83ead3f0caa3c4ab748a.mp4",
    "/uploads/videos/2026/03/69fa0dc62e84dc939b61.mp4",
    "/uploads/videos/2026/03/c206f3ee65f2b15bb9e3.mp4"
  ];
  const sampleVideoUrl = (index = 0) => LOCAL_SAMPLE_VIDEOS[Math.abs(Number(index) || 0) % LOCAL_SAMPLE_VIDEOS.length];
  const LOCAL_MEDIA_DB = "rhac_local_media_v1";
  const LOCAL_MEDIA_STORE = "videos";
  const localMediaUrlCache = new Map();

  const openLocalMediaDb = () =>
    new Promise((resolve) => {
      if (typeof indexedDB === "undefined") {
        resolve(null);
        return;
      }
      try {
        const request = indexedDB.open(LOCAL_MEDIA_DB, 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(LOCAL_MEDIA_STORE)) {
            db.createObjectStore(LOCAL_MEDIA_STORE);
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
        request.onblocked = () => resolve(null);
      } catch (_) {
        resolve(null);
      }
    });

  const putLocalMediaFile = async (file) => {
    if (typeof Blob === "undefined" || !(file instanceof Blob)) return "";
    const db = await openLocalMediaDb();
    if (!db) return "";
    const key = `v_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    await new Promise((resolve) => {
      try {
        const tx = db.transaction(LOCAL_MEDIA_STORE, "readwrite");
        tx.objectStore(LOCAL_MEDIA_STORE).put(file, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
        tx.onabort = () => resolve();
      } catch (_) {
        resolve();
      }
    });
    try {
      db.close();
    } catch (_) {}
    return key;
  };

  const deleteLocalMediaByUrl = async (value) => {
    const raw = String(value || "").trim();
    if (!raw.startsWith("idb://")) return;
    const key = raw.slice("idb://".length);
    if (!key) return;
    const db = await openLocalMediaDb();
    if (!db) return;
    await new Promise((resolve) => {
      try {
        const tx = db.transaction(LOCAL_MEDIA_STORE, "readwrite");
        tx.objectStore(LOCAL_MEDIA_STORE).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
        tx.onabort = () => resolve();
      } catch (_) {
        resolve();
      }
    });
    try {
      db.close();
    } catch (_) {}
    const cached = localMediaUrlCache.get(raw);
    if (cached) {
      try {
        URL.revokeObjectURL(cached);
      } catch (_) {}
      localMediaUrlCache.delete(raw);
    }
  };

  const resolveLocalMediaUrl = async (value) => {
    const raw = String(value || "").trim();
    if (!raw.startsWith("idb://")) return raw;
    if (localMediaUrlCache.has(raw)) return localMediaUrlCache.get(raw) || "";
    const key = raw.slice("idb://".length);
    if (!key) return "";
    const db = await openLocalMediaDb();
    if (!db) return "";
    const blob = await new Promise((resolve) => {
      try {
        const tx = db.transaction(LOCAL_MEDIA_STORE, "readonly");
        const req = tx.objectStore(LOCAL_MEDIA_STORE).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch (_) {
        resolve(null);
      }
    });
    try {
      db.close();
    } catch (_) {}
    if (typeof Blob === "undefined" || !(blob instanceof Blob)) return "";
    try {
      const blobUrl = URL.createObjectURL(blob);
      localMediaUrlCache.set(raw, blobUrl);
      return blobUrl;
    } catch (_) {
      return "";
    }
  };

  const loadDb = () => {
    const db = safeJsonParse(localStorage.getItem(DB_KEY), null);
    if (db && typeof db === "object") return db;
    return {
      counters: { user: 1, video: 1, comment: 1, notification: 1 },
      users: [],
      videos: [],
      follows: [],
      videoLikes: [],
      videoFavorites: [],
      comments: [],
      commentReactions: [],
      notifications: []
    };
  };

  const saveDb = (db) => {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  };

  const loadSession = () => safeJsonParse(localStorage.getItem(SESSION_KEY), { userId: 0 });

  const saveSession = (session) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session || { userId: 0 }));
  };

  const readBackendPreference = () => {
    try {
      const raw = String(localStorage.getItem(BACKEND_PREF_KEY) || "").trim().toLowerCase();
      if (raw === "local" || raw === "firebase") return raw;
      return "auto";
    } catch (_) {
      return "auto";
    }
  };

  const writeBackendPreference = (value) => {
    const mode = String(value || "").trim().toLowerCase();
    try {
      if (mode === "local" || mode === "firebase") {
        localStorage.setItem(BACKEND_PREF_KEY, mode);
      } else {
        localStorage.removeItem(BACKEND_PREF_KEY);
      }
    } catch (_) {}
  };

  const nextId = (db, key) => {
    const current = Number(db.counters?.[key] || 1);
    db.counters[key] = current + 1;
    return current;
  };

  const ensureUniqueUsername = (db, candidate, excludeId = 0) => {
    const base = slugify(candidate);
    let i = 0;
    while (true) {
      const name = i === 0 ? base : `${base}${i}`;
      const taken = db.users.some((u) => String(u.username || "").toLowerCase() === name && Number(u.id) !== Number(excludeId));
      if (!taken) return name;
      i += 1;
    }
  };

  const getUserById = (db, userId) => db.users.find((u) => Number(u.id) === Number(userId)) || null;

  const getUserByUsername = (db, username) =>
    db.users.find((u) => String(u.username || "").toLowerCase() === String(username || "").toLowerCase()) || null;

  const getCurrentUser = (db, session) => getUserById(db, Number(session?.userId || 0));

  const userPayload = (user) => {
    if (!user) return null;
    return {
      id: Number(user.id),
      name: String(user.name || ""),
      email: String(user.email || ""),
      username: String(user.username || ""),
      avatar_url: String(user.avatar_url || ""),
      bio: String(user.bio || ""),
      status_text: String(user.status_text || ""),
      is_admin: !!user.is_admin,
      created_at: String(user.created_at || "")
    };
  };

  const followCounts = (db, userId) => {
    const uid = Number(userId || 0);
    let followers = 0;
    let following = 0;
    db.follows.forEach((row) => {
      if (Number(row.following_user_id) === uid) followers += 1;
      if (Number(row.follower_user_id) === uid) following += 1;
    });
    return { followers, following };
  };

  const isFollowing = (db, followerId, followingId) =>
    db.follows.some(
      (row) => Number(row.follower_user_id) === Number(followerId) && Number(row.following_user_id) === Number(followingId)
    );

  const likeCount = (db, videoId) => db.videoLikes.filter((row) => Number(row.video_id) === Number(videoId)).length;

  const commentCount = (db, videoId) => db.comments.filter((row) => Number(row.video_id) === Number(videoId)).length;

  const videoPayload = async (db, video, viewerId = 0) => {
    const owner = getUserById(db, Number(video.user_id || 0));
    const username = String(video.username || owner?.username || "");
    const likedByViewer = viewerId
      ? db.videoLikes.some((row) => Number(row.video_id) === Number(video.id) && Number(row.user_id) === Number(viewerId))
      : false;
    const favoritedByViewer = viewerId
      ? db.videoFavorites.some((row) => Number(row.video_id) === Number(video.id) && Number(row.user_id) === Number(viewerId))
      : false;
    const followingAuthor = viewerId && video.user_id ? isFollowing(db, viewerId, Number(video.user_id)) : false;
    const resolvedVideoUrl = await resolveLocalMediaUrl(video.video_url);

    return {
      id: Number(video.id),
      author: String(video.author_handle || (username ? `@${username}` : "")),
      username,
      author_name: String(video.author_name || owner?.name || ""),
      avatar_url: String(video.avatar_url || owner?.avatar_url || ""),
      profile_url: username ? `profile.html?u=${encodeURIComponent(username)}` : "profile.html",
      title: String(video.title || ""),
      description: String(video.description || ""),
      language: String(video.language || "ar"),
      video_url: String(resolvedVideoUrl || video.video_url || ""),
      poster_url: String(video.poster_url || ""),
      views: Number(video.views || 0),
      likes: Number(video.likes || 0),
      comments: Number(video.comments || 0),
      shares: Number(video.shares || 0),
      created_at: String(video.created_at || nowIso()),
      is_liked_by_viewer: likedByViewer,
      is_favorited_by_viewer: favoritedByViewer,
      is_following_author: followingAuthor
    };
  };

  const saveVideoCounters = (db, video) => {
    video.likes = likeCount(db, video.id);
    video.comments = commentCount(db, video.id);
  };

  const addNotification = (db, userId, actorUserId, type, message, refId = 0) => {
    if (!userId || Number(userId) === Number(actorUserId || 0)) return;
    db.notifications.unshift({
      id: nextId(db, "notification"),
      user_id: Number(userId),
      actor_user_id: Number(actorUserId || 0),
      type: String(type || "system"),
      ref_id: Number(refId || 0),
      message: String(message || ""),
      is_read: false,
      created_at: nowIso()
    });
  };

  const mentionUsernames = (content) => {
    const matches = String(content || "").match(/(^|[\s([{>.,!?;:])@([\p{L}\p{N}._-]{3,24})/gu) || [];
    const set = new Set();
    matches.forEach((token) => {
      const normalized = token.replace(/^.*@/u, "").trim().toLowerCase();
      if (normalized) set.add(normalized);
    });
    return Array.from(set);
  };

  const readRequestBody = async (method, body, isForm) => {
    if (String(method || "GET").toUpperCase() === "GET" || body == null) return {};
    if (isForm && typeof FormData !== "undefined" && body instanceof FormData) {
      const data = {};
      for (const [key, value] of body.entries()) {
        data[key] = value;
      }
      return data;
    }
    if (typeof body === "object") return body;
    return {};
  };

  const ensureSeed = () => {
    const db = loadDb();
    let mutated = false;
    const publicSeedRows = [
      {
        author_handle: "@riyadh.daily",
        title: "ليلة في الرياض",
        description: "رحلة ليلية سريعة في شوارع الرياض.",
        language: "ar",
        video_url: sampleVideoUrl(0),
        poster_url: "https://images.pexels.com/photos/1761279/pexels-photo-1761279.jpeg",
        likes: 18600,
        comments: 920,
        shares: 340
      },
      {
        author_handle: "@arab.vibes",
        title: "قهوة الصباح",
        description: "لحظة هدوء مع قهوة قبل بداية اليوم.",
        language: "ar",
        video_url: sampleVideoUrl(1),
        poster_url: "https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg",
        likes: 24500,
        comments: 1310,
        shares: 740
      },
      {
        author_handle: "@travel.arabia",
        title: "موج البحر",
        description: "لقطة بحرية قصيرة ومريحة.",
        language: "ar",
        video_url: sampleVideoUrl(2),
        poster_url: "https://images.pexels.com/photos/457882/pexels-photo-457882.jpeg",
        likes: 32300,
        comments: 2090,
        shares: 1200
      }
    ];

    if (!Array.isArray(db.users)) {
      db.users = [];
      mutated = true;
    }
    if (!Array.isArray(db.videos)) {
      db.videos = [];
      mutated = true;
    }

    if (!db.users.some((u) => String(u.username || "").toLowerCase() === "admin")) {
      db.users.push({
        id: nextId(db, "user"),
        name: "admin",
        email: "admin@reels.local",
        password: "admin",
        username: "admin",
        avatar_url: "",
        bio: "",
        status_text: "",
        is_admin: true,
        created_at: nowIso()
      });
      mutated = true;
    }

    const hasPublicVideos = db.videos.some((video) => Number(video.user_id || 0) === 0 && isPublishedStatus(video.status));
    if (!hasPublicVideos) {
      publicSeedRows.forEach((row) => {
        db.videos.push({
          id: nextId(db, "video"),
          user_id: 0,
          username: "",
          author_name: "",
          avatar_url: "",
          author_handle: row.author_handle,
          title: row.title,
          description: row.description,
          language: row.language,
          video_url: row.video_url,
          poster_url: row.poster_url,
          views: 0,
          likes: Number(row.likes || 0),
          comments: Number(row.comments || 0),
          shares: Number(row.shares || 0),
          status: "published",
          created_at: nowIso()
        });
      });
      mutated = true;
    }

    db.videos.forEach((video, idx) => {
      const source = String(video.video_url || "");
      if (!source) {
        video.video_url = sampleVideoUrl(idx);
        mutated = true;
        return;
      }
      if (source.includes("cdn.coverr.co/videos/")) {
        video.video_url = sampleVideoUrl(idx);
        mutated = true;
      }
    });

    if (mutated) saveDb(db);
  };

  const buildError = (message, status = 400) => {
    const err = new Error(message || "Request failed");
    err.status = status;
    return err;
  };

  const localRequest = async ({ action, method = "GET", body = null, isForm = false, params = null }) => {
    ensureSeed();
    const db = loadDb();
    const session = loadSession();
    const viewer = getCurrentUser(db, session);
    const verb = String(method || "GET").toUpperCase();
    const payload = await readRequestBody(verb, body, isForm);
    const query = params && typeof params === "object" ? params : {};

    const requireUser = () => {
      if (!viewer) throw buildError("Unauthorized", 401);
      return viewer;
    };

    const requireAdmin = () => {
      const user = requireUser();
      if (!user.is_admin) throw buildError("Admin access required", 403);
      return user;
    };

    if (verb === "GET" && action === "auth") {
      return { ok: true, user: userPayload(viewer) };
    }

    if (verb === "GET" && action === "admin_auth") {
      return { ok: true, user: viewer && viewer.is_admin ? userPayload(viewer) : null };
    }

    if (verb === "POST" && action === "admin_login") {
      const username = String(payload.username || "").trim().toLowerCase();
      const password = String(payload.password || "");
      const user = db.users.find((u) => String(u.username || "").toLowerCase() === username && !!u.is_admin);
      if (!user || String(user.password || "") !== password) {
        throw buildError("Invalid admin credentials.", 401);
      }
      saveSession({ userId: Number(user.id) });
      return { ok: true, user: userPayload(user) };
    }

    if (verb === "POST" && action === "register") {
      const name = normalizeText(payload.name);
      const email = normalizeEmail(payload.email);
      const password = String(payload.password || "");
      const usernameInput = normalizeText(payload.username);

      if (!name || !email || !password) throw buildError("Missing required fields.", 422);
      if (password.length < 6) throw buildError("Password must be at least 6 characters.", 422);
      if (db.users.some((u) => normalizeEmail(u.email) === email)) throw buildError("Email is already registered.", 409);

      let username = ensureUniqueUsername(db, usernameInput || name);
      if (!usernameIsValid(username)) throw buildError("Username must be 3-24 chars.", 422);
      if (username === "admin") username = ensureUniqueUsername(db, `${username}1`);

      const user = {
        id: nextId(db, "user"),
        name,
        email,
        password,
        username,
        avatar_url: "",
        bio: "",
        status_text: "",
        is_admin: false,
        created_at: nowIso()
      };
      db.users.push(user);
      saveDb(db);
      saveSession({ userId: Number(user.id) });
      return { ok: true, message: "Account created successfully.", user: userPayload(user) };
    }

    if (verb === "POST" && action === "login") {
      const identifier = normalizeText(payload.email || payload.identifier).toLowerCase();
      const password = String(payload.password || "");
      if (!identifier || !password) throw buildError("Invalid username/email or password.", 422);
      const user = db.users.find(
        (u) =>
          normalizeEmail(u.email) === identifier || String(u.username || "").toLowerCase() === identifier
      );
      if (!user || String(user.password || "") !== password) {
        throw buildError("Invalid username/email or password.", 401);
      }
      saveSession({ userId: Number(user.id) });
      return { ok: true, message: "Login successful.", user: userPayload(user) };
    }

    if (verb === "POST" && action === "logout") {
      saveSession({ userId: 0 });
      return { ok: true, message: "Logged out." };
    }

    if (verb === "GET" && action === "feed") {
      const mode = String(query.mode || "for_you").toLowerCase() === "following" ? "following" : "for_you";
      let rows = db.videos.filter((v) => isPublishedStatus(v.status));
      if (mode === "following") {
        if (!viewer) return { ok: true, mode, total: 0, videos: [] };
        const followedIds = new Set(
          db.follows
            .filter((row) => Number(row.follower_user_id) === Number(viewer.id))
            .map((row) => Number(row.following_user_id))
        );
        rows = rows.filter((v) => followedIds.has(Number(v.user_id || 0)));
      }
      rows.sort(byIdDesc);
      return {
        ok: true,
        mode,
        total: rows.length,
        videos: await Promise.all(rows.map((row) => videoPayload(db, row, Number(viewer?.id || 0))))
      };
    }

    if (verb === "POST" && action === "upload") {
      const user = requireUser();
      const title = normalizeText(payload.title);
      const description = normalizeText(payload.description);
      const language = normalizeText(payload.language || "ar") || "ar";
      if (!title) throw buildError("Title is required.", 422);
      const requestedVideoUrl = normalizeText(payload.video_url || payload.videoUrl || "");
      let uploadedVideoUrl = requestedVideoUrl;
      if (!uploadedVideoUrl && typeof File !== "undefined" && payload.video instanceof File && payload.video.size > 0) {
        const mediaKey = await putLocalMediaFile(payload.video);
        if (mediaKey) uploadedVideoUrl = `idb://${mediaKey}`;
      }
      if (!uploadedVideoUrl) {
        uploadedVideoUrl = sampleVideoUrl(Number(db.counters?.video || 1));
      }

      const video = {
        id: nextId(db, "video"),
        user_id: Number(user.id),
        username: String(user.username || ""),
        author_name: String(user.name || ""),
        avatar_url: String(user.avatar_url || ""),
        author_handle: `@${user.username}`,
        title,
        description,
        language,
        video_url: uploadedVideoUrl,
        poster_url: "",
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        status: "published",
        created_at: nowIso()
      };
      db.videos.unshift(video);
      saveDb(db);
      return { ok: true, message: "Video uploaded successfully.", video: await videoPayload(db, video, user.id) };
    }

    if (verb === "GET" && action === "profile") {
      const u = String(query.u || "").trim().toLowerCase();
      if (!u) throw buildError("Missing username.", 422);
      const profileUser = getUserByUsername(db, u);
      if (!profileUser) throw buildError("Profile not found.", 404);
      const viewerId = Number(viewer?.id || 0);
      const counts = followCounts(db, profileUser.id);
      const rows = db.videos
        .filter((v) => Number(v.user_id || 0) === Number(profileUser.id) && isPublishedStatus(v.status))
        .sort(byIdDesc);

      const likedVideoIds = viewer
        ? db.videoLikes.filter((row) => Number(row.user_id) === Number(viewer.id)).map((row) => Number(row.video_id))
        : [];
      const favoriteVideoIds = viewer
        ? db.videoFavorites.filter((row) => Number(row.user_id) === Number(viewer.id)).map((row) => Number(row.video_id))
        : [];

      return {
        ok: true,
        profile: {
          name: String(profileUser.name || ""),
          username: String(profileUser.username || ""),
          avatar_url: String(profileUser.avatar_url || ""),
          bio: String(profileUser.bio || ""),
          status_text: String(profileUser.status_text || ""),
          created_at: String(profileUser.created_at || ""),
          profile_url: `profile.html?u=${encodeURIComponent(String(profileUser.username || ""))}`,
          followers_count: counts.followers,
          following_count: counts.following,
          is_following: viewer ? isFollowing(db, viewer.id, profileUser.id) : false,
          is_own_profile: viewerId > 0 && viewerId === Number(profileUser.id)
        },
        videos: await Promise.all(rows.map((row) => videoPayload(db, row, viewerId))),
        viewer_video_states: {
          liked_video_ids: likedVideoIds,
          favorite_video_ids: favoriteVideoIds
        }
      };
    }

    if (verb === "GET" && action === "my_profile") {
      const user = requireUser();
      const counts = followCounts(db, user.id);
      return {
        ok: true,
        profile: {
          ...userPayload(user),
          profile_url: `profile.html?u=${encodeURIComponent(user.username)}`,
          followers_count: counts.followers,
          following_count: counts.following,
          is_following: false,
          is_own_profile: true
        }
      };
    }

    if (verb === "POST" && action === "update_profile") {
      const user = requireUser();
      const name = normalizeText(payload.name || user.name);
      const bio = normalizeText(payload.bio || "");
      const statusText = normalizeText(payload.status_text || "");
      const usernameInput = normalizeText(payload.username || user.username).toLowerCase();

      if (!name) throw buildError("Name is required.", 422);
      if (!usernameIsValid(usernameInput)) throw buildError("Username must be 3-24 chars.", 422);
      const username = ensureUniqueUsername(db, usernameInput, user.id);

      user.name = name;
      user.username = username;
      user.bio = bio;
      user.status_text = statusText;

      db.videos.forEach((video) => {
        if (Number(video.user_id) !== Number(user.id)) return;
        video.username = user.username;
        video.author_name = user.name;
        video.avatar_url = user.avatar_url || "";
        video.author_handle = `@${user.username}`;
      });

      saveDb(db);
      saveSession({ userId: Number(user.id) });
      return { ok: true, user: userPayload(user) };
    }

    if (verb === "GET" && action === "follow_lists") {
      const targetUsername = String(query.u || "").trim().toLowerCase();
      const target = getUserByUsername(db, targetUsername);
      if (!target) throw buildError("Profile not found.", 404);

      const followers = db.follows
        .filter((row) => Number(row.following_user_id) === Number(target.id))
        .map((row) => getUserById(db, Number(row.follower_user_id)))
        .filter(Boolean)
        .map((u) => ({
          id: Number(u.id),
          name: String(u.name || ""),
          username: String(u.username || ""),
          avatar_url: String(u.avatar_url || ""),
          bio: String(u.bio || ""),
          profile_url: `profile.html?u=${encodeURIComponent(String(u.username || ""))}`
        }));

      const following = db.follows
        .filter((row) => Number(row.follower_user_id) === Number(target.id))
        .map((row) => getUserById(db, Number(row.following_user_id)))
        .filter(Boolean)
        .map((u) => ({
          id: Number(u.id),
          name: String(u.name || ""),
          username: String(u.username || ""),
          avatar_url: String(u.avatar_url || ""),
          bio: String(u.bio || ""),
          profile_url: `profile.html?u=${encodeURIComponent(String(u.username || ""))}`
        }));

      return { ok: true, followers, following };
    }

    if (verb === "POST" && action === "toggle_follow") {
      const user = requireUser();
      const username = String(payload.username || "").trim().toLowerCase();
      const target = getUserByUsername(db, username);
      if (!target) throw buildError("User not found.", 404);
      if (Number(target.id) === Number(user.id)) throw buildError("Cannot follow yourself.", 422);

      const existingIndex = db.follows.findIndex(
        (row) => Number(row.follower_user_id) === Number(user.id) && Number(row.following_user_id) === Number(target.id)
      );
      let isFollowNow = false;
      if (existingIndex >= 0) {
        db.follows.splice(existingIndex, 1);
      } else {
        db.follows.push({
          follower_user_id: Number(user.id),
          following_user_id: Number(target.id),
          created_at: nowIso()
        });
        isFollowNow = true;
        addNotification(db, target.id, user.id, "follow", "بدأ بمتابعتك.");
      }

      const counts = followCounts(db, target.id);
      saveDb(db);
      return {
        ok: true,
        is_following: isFollowNow,
        target: { id: Number(target.id), followers_count: counts.followers, following_count: counts.following }
      };
    }

    if (verb === "POST" && action === "share_video") {
      const videoId = Number(payload.video_id || 0);
      const video = db.videos.find((v) => Number(v.id) === videoId);
      if (!video) throw buildError("Video not found.", 404);
      video.shares = Number(video.shares || 0) + 1;
      saveDb(db);
      return { ok: true, shares_count: Number(video.shares || 0) };
    }

    if (verb === "GET" && action === "video_preferences") {
      if (!viewer) return { ok: true, liked_video_ids: [], favorite_video_ids: [] };
      return {
        ok: true,
        liked_video_ids: db.videoLikes
          .filter((row) => Number(row.user_id) === Number(viewer.id))
          .map((row) => Number(row.video_id)),
        favorite_video_ids: db.videoFavorites
          .filter((row) => Number(row.user_id) === Number(viewer.id))
          .map((row) => Number(row.video_id))
      };
    }

    if (verb === "POST" && action === "set_video_like") {
      const user = requireUser();
      const videoId = Number(payload.video_id || 0);
      const likedRequested = payload.liked;
      const video = db.videos.find((v) => Number(v.id) === videoId);
      if (!video) throw buildError("Video not found.", 404);

      const existingIndex = db.videoLikes.findIndex(
        (row) => Number(row.video_id) === videoId && Number(row.user_id) === Number(user.id)
      );
      let nextLiked = existingIndex < 0;
      if (typeof likedRequested === "boolean") {
        nextLiked = likedRequested;
      } else if (typeof likedRequested === "string") {
        nextLiked = likedRequested === "1" || likedRequested.toLowerCase() === "true";
      }

      if (nextLiked && existingIndex < 0) {
        db.videoLikes.push({ video_id: videoId, user_id: Number(user.id), created_at: nowIso() });
      } else if (!nextLiked && existingIndex >= 0) {
        db.videoLikes.splice(existingIndex, 1);
      }

      saveVideoCounters(db, video);
      if (nextLiked && Number(video.user_id || 0) > 0) {
        addNotification(db, Number(video.user_id), Number(user.id), "like", "أعجب بفيديوك.", Number(video.id));
      }
      saveDb(db);
      return { ok: true, is_liked: nextLiked, likes_count: Number(video.likes || 0) };
    }

    if (verb === "POST" && action === "set_video_favorite") {
      const user = requireUser();
      const videoId = Number(payload.video_id || 0);
      const video = db.videos.find((v) => Number(v.id) === videoId);
      if (!video) throw buildError("Video not found.", 404);
      const idx = db.videoFavorites.findIndex(
        (row) => Number(row.video_id) === videoId && Number(row.user_id) === Number(user.id)
      );
      let isFavorited = false;
      if (idx >= 0) {
        db.videoFavorites.splice(idx, 1);
      } else {
        db.videoFavorites.push({ video_id: videoId, user_id: Number(user.id), created_at: nowIso() });
        isFavorited = true;
      }
      saveDb(db);
      return { ok: true, is_favorited: isFavorited };
    }

    if (verb === "GET" && action === "comments") {
      const videoId = Number(query.video_id || 0);
      if (!videoId) throw buildError("Invalid video id.", 422);

      const rows = db.comments
        .filter((row) => Number(row.video_id) === videoId)
        .sort((a, b) => Number(a.id || 0) - Number(b.id || 0))
        .map((row) => {
          const author = getUserById(db, Number(row.user_id || 0));
          const totals = defaultReactionTotals();
          let mine = null;
          db.commentReactions
            .filter((rx) => Number(rx.comment_id) === Number(row.id))
            .forEach((rx) => {
              const key = String(rx.reaction || "");
              if (Object.prototype.hasOwnProperty.call(totals, key)) totals[key] += 1;
              if (viewer && Number(rx.user_id) === Number(viewer.id)) mine = key;
            });
          return {
            id: Number(row.id),
            video_id: Number(row.video_id),
            user_id: Number(row.user_id),
            author_name: String(author?.name || row.author_name || "مستخدم"),
            author_username: String(author?.username || ""),
            content: String(row.content || ""),
            created_at: String(row.created_at || nowIso()),
            reactions: { totals, mine }
          };
        });

      return { ok: true, comments: rows };
    }

    if (verb === "POST" && action === "add_comment") {
      const user = requireUser();
      const videoId = Number(payload.video_id || 0);
      const content = normalizeText(payload.content);
      if (!videoId || !content) throw buildError("Invalid comment payload.", 422);
      const video = db.videos.find((v) => Number(v.id) === videoId);
      if (!video) throw buildError("Video not found.", 404);

      const comment = {
        id: nextId(db, "comment"),
        video_id: videoId,
        user_id: Number(user.id),
        author_name: String(user.name || ""),
        content,
        created_at: nowIso()
      };
      db.comments.push(comment);
      saveVideoCounters(db, video);

      if (Number(video.user_id || 0) > 0) {
        addNotification(db, Number(video.user_id), Number(user.id), "comment", "أضاف تعليقًا على فيديوك.", Number(video.id));
      }
      mentionUsernames(content).forEach((username) => {
        const mentioned = getUserByUsername(db, username);
        if (!mentioned) return;
        addNotification(db, Number(mentioned.id), Number(user.id), "mention", "تمت الإشارة إليك في تعليق.", Number(comment.id));
      });

      saveDb(db);
      return { ok: true, comment, comments_count: Number(video.comments || 0) };
    }

    if (verb === "POST" && action === "react_comment") {
      const user = requireUser();
      const commentId = Number(payload.comment_id || 0);
      const reaction = String(payload.reaction || "").toLowerCase();
      const comment = db.comments.find((row) => Number(row.id) === commentId);
      if (!comment) throw buildError("Comment not found.", 404);
      const valid = ["like", "love", "haha", "wow", "sad"];
      const idx = db.commentReactions.findIndex(
        (row) => Number(row.comment_id) === commentId && Number(row.user_id) === Number(user.id)
      );

      if (!reaction || reaction === "none") {
        if (idx >= 0) db.commentReactions.splice(idx, 1);
      } else if (!valid.includes(reaction)) {
        throw buildError("Invalid reaction.", 422);
      } else if (idx >= 0) {
        db.commentReactions[idx].reaction = reaction;
        db.commentReactions[idx].updated_at = nowIso();
      } else {
        db.commentReactions.push({
          comment_id: commentId,
          user_id: Number(user.id),
          reaction,
          created_at: nowIso(),
          updated_at: nowIso()
        });
      }

      if (Number(comment.user_id || 0) > 0) {
        addNotification(db, Number(comment.user_id), Number(user.id), "comment_reaction", "تفاعل مع تعليقك.", Number(comment.id));
      }
      saveDb(db);
      return { ok: true };
    }

    if (verb === "GET" && action === "notifications") {
      const user = requireUser();
      const rows = db.notifications
        .filter((row) => Number(row.user_id) === Number(user.id))
        .sort((a, b) => Number(b.id || 0) - Number(a.id || 0))
        .slice(0, 100)
        .map((row) => {
          const actor = getUserById(db, Number(row.actor_user_id || 0));
          return {
            id: Number(row.id),
            type: String(row.type || "system"),
            message: String(row.message || ""),
            ref_id: Number(row.ref_id || 0),
            is_read: !!row.is_read,
            created_at: String(row.created_at || nowIso()),
            actor_username: String(actor?.username || "")
          };
        });
      const unread = rows.filter((row) => !row.is_read).length;
      return { ok: true, notifications: rows, unread_count: unread };
    }

    if (verb === "POST" && action === "notifications_mark_read") {
      const user = requireUser();
      db.notifications.forEach((row) => {
        if (Number(row.user_id) === Number(user.id)) row.is_read = true;
      });
      saveDb(db);
      return { ok: true };
    }

    if (verb === "GET" && action === "my_videos") {
      const user = requireUser();
      const rows = await Promise.all(
        db.videos
          .filter((v) => Number(v.user_id) === Number(user.id))
          .sort(byIdDesc)
          .map((v) => videoPayload(db, v, user.id))
      );
      return { ok: true, videos: rows };
    }

    if (verb === "GET" && action === "dashboard_stats") {
      return {
        ok: true,
        total_videos: db.videos.length,
        total_views: db.videos.reduce((sum, v) => sum + Number(v.views || 0), 0),
        total_likes: db.videos.reduce((sum, v) => sum + Number(v.likes || 0), 0),
        total_comments: db.videos.reduce((sum, v) => sum + Number(v.comments || 0), 0),
        total_shares: db.videos.reduce((sum, v) => sum + Number(v.shares || 0), 0)
      };
    }

    if (verb === "POST" && action === "delete_video") {
      const user = requireUser();
      const videoId = Number(payload.video_id || 0);
      const idx = db.videos.findIndex((v) => Number(v.id) === videoId && Number(v.user_id || 0) === Number(user.id));
      if (idx < 0) throw buildError("Video not found or forbidden.", 404);
      await deleteLocalMediaByUrl(db.videos[idx]?.video_url);
      db.videos.splice(idx, 1);
      db.videoLikes = db.videoLikes.filter((row) => Number(row.video_id) !== videoId);
      db.videoFavorites = db.videoFavorites.filter((row) => Number(row.video_id) !== videoId);
      db.comments = db.comments.filter((row) => Number(row.video_id) !== videoId);
      saveDb(db);
      return { ok: true };
    }

    if (verb === "GET" && action === "admin_stats") {
      requireAdmin();
      return {
        ok: true,
        total_videos: db.videos.length,
        total_views: db.videos.reduce((sum, v) => sum + Number(v.views || 0), 0),
        total_likes: db.videos.reduce((sum, v) => sum + Number(v.likes || 0), 0),
        total_comments: db.videos.reduce((sum, v) => sum + Number(v.comments || 0), 0),
        total_shares: db.videos.reduce((sum, v) => sum + Number(v.shares || 0), 0)
      };
    }

    if (verb === "GET" && action === "admin_videos") {
      requireAdmin();
      const rows = await Promise.all(db.videos.sort(byIdDesc).map((row) => videoPayload(db, row, Number(viewer?.id || 0))));
      return { ok: true, videos: rows };
    }

    if (verb === "POST" && action === "admin_delete_video") {
      requireAdmin();
      const videoId = Number(payload.video_id || 0);
      const idx = db.videos.findIndex((v) => Number(v.id) === videoId);
      if (idx < 0) throw buildError("Video not found.", 404);
      await deleteLocalMediaByUrl(db.videos[idx]?.video_url);
      db.videos.splice(idx, 1);
      db.videoLikes = db.videoLikes.filter((row) => Number(row.video_id) !== videoId);
      db.videoFavorites = db.videoFavorites.filter((row) => Number(row.video_id) !== videoId);
      db.comments = db.comments.filter((row) => Number(row.video_id) !== videoId);
      saveDb(db);
      return { ok: true };
    }

    throw buildError("Unknown action.", 404);
  };

  const remoteRequest = async ({ endpoint, action, method, body, isForm, params }) => {
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

    const response = await fetch(`${endpoint}?${query.toString()}`, options);
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const hasStructuredPayload = payload && typeof payload === "object" && Object.prototype.hasOwnProperty.call(payload, "ok");
      if (!hasStructuredPayload) {
        throw buildError("Invalid API response", 502);
      }
      throw buildError(payload.message || "Request failed", response.status);
    }
    if (!payload || typeof payload !== "object" || !Object.prototype.hasOwnProperty.call(payload, "ok")) {
      throw buildError("Invalid API response", 502);
    }
    if (payload.ok === false) {
      throw buildError(payload.message || "Request failed", response.status || 400);
    }
    return payload;
  };

  let firebaseBackendDisabled = false;
  const firebaseAuthConfigErrorCodes = new Set(["auth/configuration-not-found", "auth/operation-not-allowed"]);
  const isFirebaseAuthConfigError = (err) => {
    const code = String(err?.code || "").toLowerCase();
    const message = String(err?.message || "").toLowerCase();
    if (firebaseAuthConfigErrorCodes.has(code)) return true;
    if (message.includes("auth/configuration-not-found")) return true;
    if (message.includes("auth/operation-not-allowed")) return true;
    if (message.includes("firebase auth is not configured")) return true;
    if (message.includes("firebase sdk is not loaded")) return true;
    return false;
  };

  const request = async ({ endpoint = "app-api.php", action, method = "GET", body = null, isForm = false, params = null }) => {
    const actionName = String(action || "").toLowerCase();
    const verb = String(method || "GET").toUpperCase();
    const backendPreference = readBackendPreference();
    const authWriteActions = new Set(["login", "register", "admin_login"]);
    const firebaseRequiredActions = new Set([
      "auth",
      "register",
      "login",
      "logout",
      "feed",
      "profile",
      "my_profile",
      "upload",
      "update_profile",
      "toggle_follow",
      "set_video_like",
      "set_video_favorite",
      "comments",
      "post_comment",
      "delete_comment",
      "set_comment_reaction",
      "notifications",
      "notifications_mark_read",
      "my_videos",
      "delete_video"
    ]);
    const publicReadActions = new Set(["feed", "profile"]);
    const prefersLocal = backendPreference === "local";
    const hasFirebaseApi = window.RHAC_FIREBASE_API && typeof window.RHAC_FIREBASE_API.request === "function";
    const localAuthPayload = () => localRequest({ action: "auth", method: "GET", body: null, isForm: false, params: null });
    const withLocalFeedFallback = async (payload) => {
      if (actionName !== "feed") return payload;
      const firebaseVideos = Array.isArray(payload?.videos) ? payload.videos : [];
      const localPayload = await localRequest({ action, method, body, isForm, params });
      const localVideos = Array.isArray(localPayload?.videos) ? localPayload.videos : [];
      if (!localVideos.length) return payload;
      if (!firebaseVideos.length) return localPayload;

      const merged = [];
      const seen = new Set();
      const pushUnique = (rows) => {
        rows.forEach((video) => {
          const key = [
            String(video?.video_url || ""),
            String(video?.username || ""),
            String(video?.title || ""),
            String(video?.created_at || ""),
            String(video?.id || "")
          ].join("|");
          if (seen.has(key)) return;
          seen.add(key);
          merged.push(video);
        });
      };

      // Keep local items first so user's own newly uploaded videos appear immediately.
      pushUnique(localVideos);
      pushUnique(firebaseVideos);

      merged.sort((a, b) => {
        const ta = Date.parse(String(a?.created_at || ""));
        const tb = Date.parse(String(b?.created_at || ""));
        const safeA = Number.isFinite(ta) ? ta : 0;
        const safeB = Number.isFinite(tb) ? tb : 0;
        if (safeA !== safeB) return safeB - safeA;
        return Number(b?.id || 0) - Number(a?.id || 0);
      });

      return {
        ...payload,
        videos: merged,
        total: merged.length
      };
    };
    const shouldTryFirebasePublicRead = publicReadActions.has(actionName) && hasFirebaseApi;
    const forceCloudSocial = firebaseRequiredActions.has(actionName);

    if (forceCloudSocial) {
      if (!hasFirebaseApi || firebaseBackendDisabled) {
        throw buildError("Cloud social backend is unavailable. Configure Firebase Auth and reload.", 503);
      }
      try {
        const firebasePayload = await window.RHAC_FIREBASE_API.request({ endpoint, action, method, body, isForm, params });
        if (actionName === "auth" && firebasePayload && firebasePayload.user) writeBackendPreference("firebase");
        if (authWriteActions.has(actionName) && firebasePayload && firebasePayload.user) writeBackendPreference("firebase");
        if (actionName === "logout") writeBackendPreference("auto");
        return firebasePayload;
      } catch (err) {
        if (isFirebaseAuthConfigError(err)) {
          firebaseBackendDisabled = true;
          writeBackendPreference("auto");
        }
        throw err;
      }
    }

    if ((prefersLocal || firebaseBackendDisabled) && shouldTryFirebasePublicRead) {
      try {
        const firebasePayload = await window.RHAC_FIREBASE_API.request({ endpoint, action, method, body, isForm, params });
        return withLocalFeedFallback(firebasePayload);
      } catch (_) {
        // Ignore and continue to local fallback for resilient reads.
      }
    }

    if (!prefersLocal && !firebaseBackendDisabled && hasFirebaseApi) {
      try {
        const firebasePayload = await window.RHAC_FIREBASE_API.request({ endpoint, action, method, body, isForm, params });

        if (actionName === "auth" && (!firebasePayload || !firebasePayload.user)) {
          const localAuth = await localAuthPayload();
          if (localAuth && localAuth.user) {
            writeBackendPreference("local");
            return localAuth;
          }
        }

        if (authWriteActions.has(actionName) && firebasePayload && firebasePayload.user) {
          writeBackendPreference("firebase");
        }
        if (actionName === "logout") {
          writeBackendPreference("auto");
        }
        return withLocalFeedFallback(firebasePayload);
      } catch (err) {
        if (isFirebaseAuthConfigError(err)) {
          firebaseBackendDisabled = true;
          writeBackendPreference("local");
        }
        if (authWriteActions.has(actionName)) {
          writeBackendPreference("local");
        }
        if (err && err.status && err.status !== 502 && err.status !== 0) {
          throw err;
        }
      }
    }

    if (prefersLocal || firebaseBackendDisabled) {
      const localPayload = await localRequest({ action, method, body, isForm, params });
      if (actionName === "auth" && localPayload && localPayload.user) writeBackendPreference("local");
      if (authWriteActions.has(actionName) && localPayload && localPayload.user) writeBackendPreference("local");
      if (actionName === "logout") writeBackendPreference("auto");
      return localPayload;
    }

    try {
      const remotePayload = await remoteRequest({ endpoint, action, method, body, isForm, params });
      if (authWriteActions.has(actionName) && remotePayload && remotePayload.user) {
        writeBackendPreference("auto");
      }
      if (actionName === "logout") {
        writeBackendPreference("auto");
      }
      return remotePayload;
    } catch (err) {
      if (err && err.status && err.status !== 502 && err.status !== 0) {
        throw err;
      }
      const localPayload = await localRequest({ action, method, body, isForm, params });
      if (actionName === "auth" && localPayload && localPayload.user) writeBackendPreference("local");
      if (authWriteActions.has(actionName) && localPayload && localPayload.user) writeBackendPreference("local");
      if (actionName === "logout") writeBackendPreference("auto");
      return localPayload;
    }
  };

  window.RHAC_LOCAL_API = { request };
})();
