const PROJECT_ROOT = "cloudflare-pages://chat-egy";
const SESSION_COOKIE = "chat_egy_admin";
const SESSION_MAX_AGE = 60 * 60 * 12;
const DEFAULT_REPO = {
  owner: "kakasuka882-eng",
  repo: "hesham",
  branch: "main",
  workflow: "dashboard-deploy.yml",
};
const ADMIN_USER = {
  id: 1,
  name: "admin",
  email: "admin@chat-egy.pages.dev",
  username: "admin",
  avatar_url: "",
  bio: "",
  status_text: "",
  is_admin: true,
  created_at: "2026-03-13 00:00:00",
};

const READABLE_PATHS = [
  /^tools\/generate-portal\.mjs$/,
  /^data\/topics\.json$/,
  /^feed\.xml$/,
  /^sitemap\.xml$/,
  /^topics\/index\.html$/,
  /^topics\/page\/\d+\/index\.html$/,
  /^topics\/[^/]+\/index\.html$/,
];

const WRITABLE_PATHS = [
  /^tools\/generate-portal\.mjs$/,
  /^data\/topics\.json$/,
  /^feed\.xml$/,
  /^sitemap\.xml$/,
  /^topics\/index\.html$/,
  /^topics\/page\/\d+\/index\.html$/,
  /^topics\/[^/]+\/index\.html$/,
];

const REMOVABLE_PATHS = [
  /^topics\/[^/]+\/index\.html$/,
];

const POSTS_PER_PAGE = 20;
const NAVIGATION_ROUTES = new Set([
  "/",
  "/index.html",
  "/topics/",
  "/topics/index.html",
  "/about.html",
  "/contact.html",
  "/privacy.html",
  "/terms.html",
  "/features.html",
  "/profile.html",
  "/404.html",
  "/dashboard/",
  "/dashboard/index.html",
  `/${"googlea04d67eba391f995"}.html`,
]);
const LEGACY_GONE_PREFIXES = [
  "/blog-single-page-layout",
  "/jobs-1-item",
  "/modules-1-item",
  "/real-estate-single-page-layout",
  "/subpage",
];
let topicsRouteCache = {
  expiresAt: 0,
  slugs: new Set(),
  noindexSlugs: new Set(),
  totalPages: 1,
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/app-api.php") {
      return handleSiteRequest(request, env, url);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": url.origin,
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        },
      });
    }

    try {
      const action = url.searchParams.get("action") || "";
      switch (action) {
        case "admin_auth":
          return await handleAdminAuth(request, env);
        case "admin_login":
          return await handleAdminLogin(request, env);
        case "logout":
          return await handleLogout();
        case "admin_portal_file":
          return await handlePortalFile(request, env);
        case "admin_portal_write":
          return await handlePortalWrite(request, env);
        case "admin_portal_remove":
          return await handlePortalRemove(request, env);
        case "admin_portal_run":
          return await handlePortalRun(request, env);
        default:
          return jsonResponse({ ok: false, message: "Action not found." }, 404);
      }
    } catch (error) {
      if (error instanceof ApiError) {
        return jsonResponse({ ok: false, message: error.message }, error.status);
      }
      return jsonResponse({ ok: false, message: "Unexpected server error." }, 500);
    }
  },
};

function normalizePathname(pathname) {
  if (!pathname) return "/";
  if (pathname === "/") return pathname;
  if (/\.[a-z0-9]+$/i.test(pathname)) return pathname;
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

function isLikelyHtmlNavigation(request, url) {
  if (!["GET", "HEAD"].includes(request.method)) return false;
  if (url.pathname === "/") return true;
  if (/\.[a-z0-9]+$/i.test(url.pathname)) {
    return /\.html?$/i.test(url.pathname);
  }
  const accept = request.headers.get("Accept") || "";
  return accept.includes("text/html") || accept.includes("*/*");
}

function mergeResponseHeaders(response, extraHeaders = {}, statusOverride) {
  const headers = new Headers(response.headers);
  Object.entries(extraHeaders).forEach(([key, value]) => headers.set(key, value));
  return new Response(response.body, {
    status: statusOverride || response.status,
    statusText: response.statusText,
    headers,
  });
}

function buildFallbackErrorHtml(status) {
  const title = status === 410 ? "تم حذف الصفحة" : "الصفحة غير موجودة";
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><meta name="robots" content="noindex,nofollow"></head><body><main><h1>${title}</h1><p>هذا الرابط غير متاح الآن.</p></main></body></html>`;
}

async function buildErrorPageResponse(env, request, status = 404) {
  const assetUrl = new URL("/404.html", request.url);
  const assetResponse = await env.ASSETS.fetch(new Request(assetUrl.toString(), { method: "GET" }));
  if (assetResponse.ok) {
    return mergeResponseHeaders(
      assetResponse,
      {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "X-Robots-Tag": "noindex, nofollow",
      },
      status,
    );
  }
  return new Response(buildFallbackErrorHtml(status), {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

async function getTopicsRouteCache(env, request) {
  if (topicsRouteCache.expiresAt > Date.now()) {
    return topicsRouteCache;
  }

  const dataUrl = new URL("/data/topics.json", request.url);
  const response = await env.ASSETS.fetch(new Request(dataUrl.toString(), { method: "GET" }));
  if (!response.ok) {
    topicsRouteCache = {
      expiresAt: Date.now() + 60 * 1000,
      slugs: new Set(),
      noindexSlugs: new Set(),
      totalPages: 1,
    };
    return topicsRouteCache;
  }

  let posts = [];
  try {
    posts = await response.json();
  } catch {
    posts = [];
  }

  const slugs = new Set();
  const noindexSlugs = new Set();
  for (const post of Array.isArray(posts) ? posts : []) {
    const slug = String(post.slug || "").trim();
    if (!slug) continue;
    slugs.add(slug);
    if (isInternalTopicPost(post)) {
      noindexSlugs.add(slug);
    }
  }

  topicsRouteCache = {
    expiresAt: Date.now() + 5 * 60 * 1000,
    slugs,
    noindexSlugs,
    totalPages: Math.max(1, Math.ceil(slugs.size / POSTS_PER_PAGE)),
  };
  return topicsRouteCache;
}

function isInternalTopicPost(post) {
  const sourceUrl = normalizeMaybeUrl(post && post.source_url);
  const sourceLink = normalizeMaybeUrl(post && post.source_link);
  const siteOrigin = "https://chat-egy.com";
  return sourceUrl.startsWith(siteOrigin) || sourceLink.startsWith(siteOrigin);
}

function normalizeMaybeUrl(value) {
  try {
    return new URL(String(value || "").trim()).toString();
  } catch {
    return "";
  }
}

function isKnownStaticNavigationPath(pathname) {
  return NAVIGATION_ROUTES.has(pathname);
}

function shouldReturnGone(pathname) {
  return LEGACY_GONE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

async function classifyNavigationPath(pathname, env, request) {
  if (isKnownStaticNavigationPath(pathname)) return { valid: true, noindex: pathname === "/404.html" };
  if (pathname === "/topics/" || pathname === "/topics/index.html") {
    return { valid: true, noindex: false };
  }

  const topicMatch = pathname.match(/^\/topics\/([^/]+)\/$/);
  if (topicMatch && topicMatch[1] !== "page") {
    const cache = await getTopicsRouteCache(env, request);
    const slug = topicMatch[1];
    return { valid: cache.slugs.has(slug), noindex: cache.noindexSlugs.has(slug) };
  }

  const pagedMatch = pathname.match(/^\/topics\/page\/(\d+)\/$/);
  if (pagedMatch) {
    const pageNumber = Number(pagedMatch[1]);
    const cache = await getTopicsRouteCache(env, request);
    return { valid: pageNumber >= 2 && pageNumber <= cache.totalPages, noindex: false };
  }

  return { valid: false, noindex: false };
}

function shouldNoindexAsset(url, navigationInfo) {
  if (navigationInfo && navigationInfo.noindex) return true;
  if (url.pathname === "/feed.xml") return true;
  if (url.pathname === "/topics/" && url.searchParams.has("q")) return true;
  if (url.pathname.startsWith("/dashboard/")) return true;
  return false;
}

async function handleSiteRequest(request, env, url) {
  const normalizedPath = normalizePathname(url.pathname);

  if (shouldReturnGone(normalizedPath)) {
    return buildErrorPageResponse(env, request, 410);
  }

  let navigationInfo = null;
  if (isLikelyHtmlNavigation(request, url)) {
    navigationInfo = await classifyNavigationPath(normalizedPath, env, request);
    if (!navigationInfo.valid) {
      return buildErrorPageResponse(env, request, 404);
    }
  }

  const response = await env.ASSETS.fetch(request);
  if (response.status === 404) {
    return buildErrorPageResponse(env, request, 404);
  }

  if (shouldNoindexAsset(url, navigationInfo)) {
    return mergeResponseHeaders(response, {
      "X-Robots-Tag": "noindex, follow",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    });
  }

  if (normalizedPath === "/sw.js" || normalizedPath === "/manifest.json") {
    return mergeResponseHeaders(response, {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    });
  }

  return response;
}

async function handleAdminAuth(request, env) {
  const user = await getSessionUser(request, env);
  return jsonResponse({ ok: true, user });
}

async function handleAdminLogin(request, env) {
  if (request.method !== "POST") {
    throw new ApiError("Method not allowed.", 405);
  }

  const body = await readJsonBody(request);
  const username = String(body.username || "").trim();
  const password = String(body.password || "");

  if (username !== getAdminUsername(env) || password !== getAdminPassword(env)) {
    throw new ApiError("اسم المستخدم أو كلمة المرور غير صحيحين.", 401);
  }

  const cookie = await buildSessionCookie(username, env);
  return jsonResponse(
    {
      ok: true,
      user: { ...ADMIN_USER, username },
      project_root: PROJECT_ROOT,
    },
    200,
    { "Set-Cookie": cookie },
  );
}

async function handleLogout() {
  return jsonResponse(
    {
      ok: true,
      user: null,
    },
    200,
    {
      "Set-Cookie": `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    },
  );
}

async function handlePortalFile(request, env) {
  await requireAdmin(request, env);
  const url = new URL(request.url);
  const requestedPath = normalizePath(url.searchParams.get("path"));
  ensureAllowedPath(requestedPath, READABLE_PATHS, "الملف المطلوب غير مسموح به.");

  const content = await readPublishedFile(requestedPath, request, env);
  return jsonResponse({
    ok: true,
    project_root: PROJECT_ROOT,
    content,
  });
}

async function handlePortalWrite(request, env) {
  await requireAdmin(request, env);
  if (request.method !== "POST") {
    throw new ApiError("Method not allowed.", 405);
  }

  ensureGitHubWriteEnabled(env);

  const body = await readJsonBody(request);
  const requestedPath = normalizePath(body.path);
  ensureAllowedPath(requestedPath, WRITABLE_PATHS, "هذا المسار غير مسموح بالحفظ عليه.");

  await writeRepositoryFile(requestedPath, String(body.content || ""), env);

  return jsonResponse({
    ok: true,
    message: "تم حفظ الملف داخل المستودع.",
    project_root: PROJECT_ROOT,
  });
}

async function handlePortalRemove(request, env) {
  await requireAdmin(request, env);
  if (request.method !== "POST") {
    throw new ApiError("Method not allowed.", 405);
  }

  ensureGitHubWriteEnabled(env);

  const body = await readJsonBody(request);
  let requestedPath = normalizePath(body.path);
  if (/^topics\/[^/]+$/.test(requestedPath)) {
    requestedPath = `${requestedPath}/index.html`;
  }
  ensureAllowedPath(requestedPath, REMOVABLE_PATHS, "هذا المسار غير مسموح بحذفه.");

  await deleteRepositoryFile(requestedPath, env);

  return jsonResponse({
    ok: true,
    message: "تم حذف الملف من المستودع.",
    project_root: PROJECT_ROOT,
  });
}

async function handlePortalRun(request, env) {
  await requireAdmin(request, env);
  if (request.method !== "POST") {
    throw new ApiError("Method not allowed.", 405);
  }

  const body = await readJsonBody(request);
  const command = String(body.command || "").trim();

  if (command === "build") {
    return jsonResponse({
      ok: true,
      output: "على Cloudflare Pages لا يوجد build منفصل من الداشبورد. استخدم زر النشر لتشغيل workflow البناء والنشر معًا.",
      project_root: PROJECT_ROOT,
    });
  }

  if (command !== "deploy") {
    throw new ApiError("الأمر المطلوب غير معروف.", 400);
  }

  ensureGitHubWriteEnabled(env);
  await dispatchDeployWorkflow(env);

  return jsonResponse({
    ok: true,
    output: "تم إرسال طلب النشر إلى GitHub Actions. راقب workflow dashboard-deploy.yml حتى يكتمل.",
    project_root: PROJECT_ROOT,
  });
}

class ApiError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

function normalizePath(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function ensureAllowedPath(path, patterns, message) {
  if (!path || !patterns.some((pattern) => pattern.test(path))) {
    throw new ApiError(message, 400);
  }
}

function getRepoConfig(env) {
  return {
    owner: env.GITHUB_OWNER || DEFAULT_REPO.owner,
    repo: env.GITHUB_REPO || DEFAULT_REPO.repo,
    branch: env.GITHUB_BRANCH || DEFAULT_REPO.branch,
    workflow: env.GITHUB_DEPLOY_WORKFLOW || DEFAULT_REPO.workflow,
  };
}

function getAdminUsername(env) {
  return env.ADMIN_USERNAME || ADMIN_USER.username;
}

function getAdminPassword(env) {
  return env.ADMIN_PASSWORD || "admin";
}

async function requireAdmin(request, env) {
  const user = await getSessionUser(request, env);
  if (!user) {
    throw new ApiError("يجب تسجيل الدخول بحساب الأدمن أولًا.", 401);
  }
  return user;
}

async function getSessionUser(request, env) {
  const cookieValue = readCookie(request.headers.get("Cookie"), SESSION_COOKIE);
  if (!cookieValue) {
    return null;
  }

  const [payload, signature] = cookieValue.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expected = await signValue(payload, env);
  if (expected !== signature) {
    return null;
  }

  const decoded = decodeBase64Url(payload);
  const [username, expiresAt] = decoded.split("|");
  if (!username || Number(expiresAt || 0) < Date.now()) {
    return null;
  }

  return { ...ADMIN_USER, username };
}

async function buildSessionCookie(username, env) {
  const expiresAt = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = encodeBase64Url(`${username}|${expiresAt}`);
  const signature = await signValue(payload, env);
  return `${SESSION_COOKIE}=${payload}.${signature}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`;
}

async function signValue(value, env) {
  const keyData = new TextEncoder().encode(env.ADMIN_SESSION_SECRET || "chat-egy-dashboard-secret");
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return encodeBytesBase64Url(new Uint8Array(signature));
}

function readCookie(cookieHeader, name) {
  const source = String(cookieHeader || "");
  const prefix = `${name}=`;
  for (const part of source.split(/;\s*/)) {
    if (part.startsWith(prefix)) {
      return part.slice(prefix.length);
    }
  }
  return "";
}

function encodeBase64Url(value) {
  const bytes = new TextEncoder().encode(value);
  return encodeBytesBase64Url(bytes);
}

function encodeBytesBase64Url(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "===".slice((normalized.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new TextDecoder().decode(bytes);
}

async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function ensureGitHubWriteEnabled(env) {
  if (!env.GITHUB_TOKEN) {
    throw new ApiError("تسجيل الدخول يعمل على Cloudflare الآن، لكن الحفظ والنشر يحتاجان إضافة GITHUB_TOKEN داخل إعدادات Pages Functions أولًا.", 503);
  }
}

async function readPublishedFile(path, request, env) {
  const assetUrl = new URL(request.url);
  assetUrl.pathname = `/${path}`;
  assetUrl.search = "";
  const response = await env.ASSETS.fetch(new Request(assetUrl.toString(), {
    headers: {
      Accept: "text/plain,text/html,application/json,application/xml;q=0.9,*/*;q=0.8",
    },
  }));
  if (response.status === 404) {
    throw new ApiError("الملف المطلوب غير موجود داخل النسخة المنشورة.", 404);
  }
  if (!response.ok) {
    throw new ApiError("تعذر قراءة الملف من النسخة المنشورة.", 502);
  }
  return await response.text();
}

async function writeRepositoryFile(path, content, env) {
  const repo = getRepoConfig(env);
  const current = await getRepositoryFileMeta(path, env);
  const response = await fetch(buildContentsApiUrl(path, repo), {
    method: "PUT",
    headers: buildGitHubHeaders(env, true),
    body: JSON.stringify({
      message: `dashboard: update ${path}`,
      content: encodeBase64Url(content),
      branch: repo.branch,
      sha: current ? current.sha : undefined,
    }),
  });
  if (!response.ok) {
    throw new ApiError("تعذر حفظ الملف داخل GitHub.", 502);
  }
}

async function deleteRepositoryFile(path, env) {
  const repo = getRepoConfig(env);
  const current = await getRepositoryFileMeta(path, env);
  if (!current) {
    throw new ApiError("الملف المطلوب حذفه غير موجود.", 404);
  }

  const response = await fetch(buildContentsApiUrl(path, repo), {
    method: "DELETE",
    headers: buildGitHubHeaders(env, true),
    body: JSON.stringify({
      message: `dashboard: remove ${path}`,
      sha: current.sha,
      branch: repo.branch,
    }),
  });

  if (!response.ok) {
    throw new ApiError("تعذر حذف الملف من GitHub.", 502);
  }
}

async function getRepositoryFileMeta(path, env) {
  const repo = getRepoConfig(env);
  const url = `${buildContentsApiUrl(path, repo)}?ref=${encodeURIComponent(repo.branch)}`;
  const response = await fetch(url, {
    headers: buildGitHubHeaders(env, true),
  });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new ApiError("تعذر الوصول إلى بيانات الملف في GitHub.", 502);
  }
  const payload = await response.json();
  return payload && payload.sha ? { sha: payload.sha } : null;
}

async function dispatchDeployWorkflow(env) {
  const repo = getRepoConfig(env);
  const url = `https://api.github.com/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}/actions/workflows/${encodeURIComponent(repo.workflow)}/dispatches`;
  const response = await fetch(url, {
    method: "POST",
    headers: buildGitHubHeaders(env, true),
    body: JSON.stringify({
      ref: repo.branch,
    }),
  });
  if (!response.ok) {
    throw new ApiError("تعذر تشغيل workflow النشر من GitHub. تأكد من وجود dashboard-deploy.yml وأن التوكن يملك صلاحية repo و workflow.", 502);
  }
}

function buildContentsApiUrl(path, repo) {
  const encodedPath = path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `https://api.github.com/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}/contents/${encodedPath}`;
}

function buildGitHubHeaders(env, authenticated) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "chat-egy-cloudflare-dashboard",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (authenticated && env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
    headers["Content-Type"] = "application/json";
  }
  return headers;
}
