import fs from "node:fs/promises";
import path from "node:path";

const SITE_URL = "https://chat-egy.com";
const SITE_BRAND = "شات ايجي";
const SITE_NAME = "شات ايجي - شات مصر - ايجي شات";
const SITE_KEYWORDS = "شات ايجي, شات مصر, ايجي شات, chat egy, egy chat, chat-egy";
const CONTACT_EMAIL = "heshammoustafasamar@gmail.com";
const ADSENSE_CLIENT = "ca-pub-4693481683736794";
const DEFAULT_OG_IMAGE = `${SITE_URL}/icons/icon-512.png`;
const BRAND_LOGO_PATH = "/images/chat-egy-logo.svg";
const GOOGLE_VERIFICATION_TOKEN = "googlea04d67eba391f995";
const GOOGLE_VERIFICATION_FILE = `${GOOGLE_VERIFICATION_TOKEN}.html`;
const SITE_ORIGIN = new URL(SITE_URL).origin;

const DEFAULT_FULL_COUNT = 400;
const DEFAULT_DAILY_COUNT = 10;
const POSTS_PER_PAGE = 20;
const MAX_POSTS_DEFAULT = 1200;
const HOMEPAGE_CARDS_COUNT = 20;
const MIN_ARTICLE_WORDS = 280;
const BACKDATE_GROUP_SIZE = 20;
const BACKDATE_START_DAYS_AGO = 14;
const BACKDATE_STEP_DAYS = 2;
const ROOT = process.cwd();

const FEED_KEYWORDS = [
  "مصر",
  "القاهرة",
  "الاقتصاد",
  "رياضة",
  "كرة القدم",
  "تكنولوجيا",
  "ذكاء اصطناعي",
  "تعليم",
  "صحة",
  "سياسة",
  "الشرق الأوسط",
  "سياحة",
  "سيارات",
  "هواتف",
  "أمن سيبراني",
  "طاقة",
  "أسعار الذهب",
  "الدولار",
  "البورصة",
  "عقارات",
  "وظائف",
  "مشاريع صغيرة",
  "ثقافة",
  "فن",
  "سينما",
  "موسيقى",
  "علوم",
  "الطقس",
  "بيئة",
  "فضاء",
  "العالم",
  "السعودية",
  "الإمارات",
  "برمجة",
  "ألعاب",
  "اندرويد",
  "ايفون",
  "استثمار",
  "بنوك",
  "الدوري المصري",
  "كأس العالم",
  "حوادث",
  "حقوق المستهلك",
  "آثار",
  "جامعات",
  "مواصلات"
];

const FALLBACK_CATEGORIES = [
  "مصر",
  "الاقتصاد",
  "رياضة",
  "تكنولوجيا",
  "تعليم",
  "صحة",
  "مواصلات",
  "أسعار الذهب",
  "استثمار",
  "طاقة"
];

const FALLBACK_ANGLES = [
  "تحديثات الساعة",
  "أبرز المستجدات",
  "ماذا نعرف حتى الآن",
  "قراءة سريعة",
  "ملخص عملي",
  "متابعة مباشرة"
];

const FALLBACK_SOURCES = ["غرفة متابعة شات إيجي", "مرصد شات إيجي", "فريق التحرير"];

const htmlEscapes = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};

const xmlEntities = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&#39;": "'",
  "&nbsp;": " ",
  "&#160;": " "
};

const todayDate = new Date().toISOString().slice(0, 10);

const jsonLd = (data) => `<script type="application/ld+json">${JSON.stringify(data)}</script>`;

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: DEFAULT_OG_IMAGE
};

const adsenseScriptTag = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}" crossorigin="anonymous"></script>`;

const webSiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_BRAND,
  alternateName: ["شات مصر", "إيجي شات", "Chat EGY", "Egy Chat"],
  url: SITE_URL,
  inLanguage: "ar"
};

const webPageSchema = ({ title, description, canonical }) => ({
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: title,
  description,
  url: canonical,
  inLanguage: "ar",
  isPartOf: {
    "@type": "WebSite",
    name: SITE_BRAND,
    url: SITE_URL
  }
});

const ensureDir = async (dir) => {
  await fs.mkdir(dir, { recursive: true });
};

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (ch) => htmlEscapes[ch] || ch);

const decodeXml = (value) =>
  String(value ?? "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&(amp|lt|gt|quot|apos|nbsp);|&#39;|&#160;/gi, (m) => xmlEntities[m.toLowerCase()] || m)
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)))
    .replace(/\u00a0/g, " ")
    .trim();

const stripTags = (value) =>
  decodeXml(String(value ?? "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

const escapeRegex = (value) =>
  String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeText = (value) =>
  stripTags(value)
    .replace(/\s+/g, " ")
    .trim();

const isValidDate = (value) => !Number.isNaN(Date.parse(value));

const toIsoDate = (value, fallback = new Date().toISOString()) =>
  isValidDate(value) ? new Date(value).toISOString() : fallback;

const normalizeUrl = (value) => {
  try {
    const raw = String(value ?? "").trim();
    return raw ? new URL(raw).toString() : "";
  } catch {
    return "";
  }
};

const isHomepageUrl = (value) => {
  try {
    const url = new URL(normalizeUrl(value));
    return (url.pathname === "/" || url.pathname === "") && !url.search && !url.hash;
  } catch {
    return false;
  }
};

const isInternalUrl = (value) => {
  try {
    return new URL(normalizeUrl(value)).origin === SITE_ORIGIN;
  } catch {
    return false;
  }
};

const pickSourceUrl = (sourceUrl, sourceLink) => {
  const primary = normalizeUrl(sourceUrl);
  const fallback = normalizeUrl(sourceLink);
  if (primary && fallback) {
    try {
      const primaryUrl = new URL(primary);
      const fallbackUrl = new URL(fallback);
      if (primaryUrl.origin === fallbackUrl.origin && isHomepageUrl(primary)) {
        return fallback;
      }
    } catch {
      // ignore URL comparison errors
    }
  }
  if (primary && !isHomepageUrl(primary)) return primary;
  return fallback || primary || SITE_URL;
};

const buildPostExcerpt = ({ title, excerpt, category, sourceName }) => {
  let text = normalizeText(excerpt);
  if (sourceName) {
    text = text.replace(new RegExp(`(?:\\s+|[-:|]+\\s*)${escapeRegex(sourceName)}\\s*$`, "iu"), "").trim();
  }
  const normalizedTitle = normalizeTitleKey(title);
  if (!text || text.length < 80 || normalizeTitleKey(text) === normalizedTitle) {
    return `ملخص عربي سريع لخبر "${title}" ضمن قسم ${category} مع أبرز النقاط ورابط مباشر للمصدر الأصلي.`;
  }
  return text;
};

const normalizePostRow = (post) => {
  const sourceName = String(post.source_name || post.sourceName || "مصدر إخباري").trim();
  const title = normalizeText(post.title);
  const category = normalizeText(post.category || "عام");
  const sourceLink = normalizeUrl(post.source_link || post.sourceLink || post.link || post.source_url);
  const sourceUrl = pickSourceUrl(post.source_url || post.sourceUrl, sourceLink);

  return {
    ...post,
    title,
    excerpt: buildPostExcerpt({
      title,
      excerpt: post.excerpt,
      category,
      sourceName
    }),
    category,
    source_name: sourceName,
    source_url: sourceUrl,
    source_link: sourceLink || sourceUrl,
    published_at: toIsoDate(post.published_at),
    updated_at: toIsoDate(post.updated_at || post.published_at),
    title_key: post.title_key || normalizeTitleKey(title)
  };
};

const isIndexablePost = (post) => !isInternalUrl(post.source_url) && !isInternalUrl(post.source_link);

const wordCount = (value) =>
  String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

const slugId = (id) => `post-${String(id).padStart(4, "0")}`;

const feedUrl = (keyword) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=ar&gl=EG&ceid=EG:ar`;

const extractTag = (block, tagName) => {
  const re = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const m = block.match(re);
  return m ? decodeXml(m[1]) : "";
};

const normalizeTitleKey = (title) =>
  String(title || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const parseItems = (xml, keyword) => {
  const items = [];
  const matches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
  for (const match of matches) {
    const block = match[1] || "";
    const titleRaw = extractTag(block, "title");
    const link = extractTag(block, "link");
    const descriptionRaw = extractTag(block, "description");
    const pubDateRaw = extractTag(block, "pubDate");
    const sourceMatch = block.match(/<source(?:\s+url="([^"]*)")?[^>]*>([\s\S]*?)<\/source>/i);
    const sourceUrl = sourceMatch ? decodeXml(sourceMatch[1] || "") : "";
    const sourceName = sourceMatch ? decodeXml(sourceMatch[2] || "") : "";
    const titleClean = titleRaw.replace(/\s+-\s+[^\-]+$/u, "").trim();
    const fallbackSource = titleRaw.includes(" - ") ? titleRaw.split(" - ").pop().trim() : "";
    const summary = stripTags(descriptionRaw).slice(0, 320);
    const publishedAt = Number.isNaN(Date.parse(pubDateRaw)) ? new Date().toISOString() : new Date(pubDateRaw).toISOString();
    if (!titleClean || !link) continue;
    items.push({
      title: titleClean,
      link,
      summary,
      sourceName: sourceName || fallbackSource || "مصدر إخباري",
      sourceUrl: sourceUrl || link,
      keyword,
      publishedAt
    });
  }
  return items;
};

const parseArgs = () => {
  const out = {
    mode: "full",
    target: DEFAULT_FULL_COUNT,
    dailyCount: DEFAULT_DAILY_COUNT,
    maxPosts: MAX_POSTS_DEFAULT
  };

  process.argv.slice(2).forEach((arg) => {
    const [k, v] = String(arg).split("=");
    if (k === "--mode" && (v === "full" || v === "daily" || v === "rebuild")) out.mode = v;
    if (k === "--target" && Number(v) > 0) out.target = Number(v);
    if (k === "--daily-count" && Number(v) >= 0) out.dailyCount = Number(v);
    if (k === "--max-posts" && Number(v) > 0) out.maxPosts = Number(v);
  });

  return out;
};

const buildFallbackCandidates = (needed, excludeKeys = new Set()) => {
  const created = [];
  const seen = new Set(excludeKeys);
  const now = new Date();
  const dateLabel = now.toISOString().slice(0, 10);
  let attempt = 0;

  while (created.length < needed && attempt < needed * 40) {
    attempt += 1;
    const category = FALLBACK_CATEGORIES[attempt % FALLBACK_CATEGORIES.length];
    const angle = FALLBACK_ANGLES[attempt % FALLBACK_ANGLES.length];
    const serial = String(attempt).padStart(2, "0");
    const title = `${angle} في ${category} - ${dateLabel} - ${serial}`;
    const titleKey = normalizeTitleKey(title);
    if (!titleKey || seen.has(titleKey)) continue;
    seen.add(titleKey);

    const minuteOffset = created.length * 4;
    const publishedAt = new Date(now.getTime() - minuteOffset * 60 * 1000).toISOString();

    created.push({
      title,
      link: `${SITE_URL}/topics/`,
      summary: `تغطية موجزة حول ${category} تشمل النقاط الأهم، التأثير المتوقع، والخطوات القادمة بشكل واضح وسريع للقارئ العربي.`,
      sourceName: FALLBACK_SOURCES[attempt % FALLBACK_SOURCES.length],
      sourceUrl: SITE_URL,
      keyword: category,
      publishedAt
    });
  }

  return created;
};
const repairFallbackDatedPosts = (posts) =>
  posts.map((post) => {
    const title = String(post.title || "");
    const match = title.match(/-\s(\d{4}-\d{2}-\d{2})\s-\s(\d{2})$/);
    if (!match) return post;

    const datePart = match[1];
    const serial = Math.max(1, Number(match[2] || 1));
    const published = new Date(`${datePart}T12:00:00.000Z`);
    published.setUTCMinutes(published.getUTCMinutes() - (serial - 1));

    const updated = new Date(`${datePart}T18:00:00.000Z`);
    return {
      ...post,
      published_at: published.toISOString(),
      updated_at: updated.toISOString()
    };
  });

const cardMarkup = (post) => `
      <article class="card" data-title="${escapeHtml(post.title)}" data-category="${escapeHtml(post.category)}" data-slug="${escapeHtml(post.slug)}">
        <div class="card-media" aria-hidden="true">
          <span class="card-media-kicker">${escapeHtml(post.category || "عام")}</span>
          <span class="card-media-badge">تحديث متجدد</span>
        </div>
        <div class="card-body">
          <div class="card-top">
            <span class="chip">${escapeHtml(post.category)}</span>
            <time datetime="${escapeHtml(post.published_at)}">${escapeHtml(post.published_at.slice(0, 10))}</time>
          </div>
          <h2><a href="/topics/${post.slug}/">${escapeHtml(post.title)}</a></h2>
          <p>${escapeHtml(post.excerpt)}</p>
          <div class="card-actions">
            <span class="source-name">${escapeHtml(post.source_name)}</span>
            <a class="read-more" href="/topics/${post.slug}/">اقرأ الآن</a>
          </div>
        </div>
      </article>`;

const baseLayout = ({
  title,
  description,
  canonical,
  body,
  schema = "",
  extraHead = "",
  pageType = "website",
  ogImage = DEFAULT_OG_IMAGE,
  noindex = false,
  withAds = false
}) => {
  const robotsMeta = noindex
    ? "noindex,follow,max-image-preview:large"
    : "index,follow,max-image-preview:large";
  const defaultSchemas = `${jsonLd(organizationSchema)}\n${jsonLd(webPageSchema({ title, description, canonical }))}`;

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="${escapeHtml(robotsMeta)}">
  <meta name="googlebot" content="${escapeHtml(robotsMeta)},max-snippet:-1,max-video-preview:-1">
  <meta name="bingbot" content="${escapeHtml(robotsMeta)}">
  <meta name="keywords" content="${escapeHtml(SITE_KEYWORDS)}">
  <meta name="author" content="${escapeHtml(SITE_BRAND)}">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <meta name="format-detection" content="telephone=no,address=no,email=no">
  <meta http-equiv="content-language" content="ar">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <link rel="sitemap" type="application/xml" title="Sitemap" href="${SITE_URL}/sitemap.xml">
  <link rel="alternate" hreflang="ar" href="${escapeHtml(canonical)}">
  <link rel="alternate" hreflang="x-default" href="${SITE_URL}/">
  <link rel="alternate" type="application/rss+xml" title="${escapeHtml(SITE_NAME)} RSS" href="${SITE_URL}/feed.xml">
  <meta name="google-site-verification" content="${GOOGLE_VERIFICATION_TOKEN}">
  <meta property="og:type" content="${pageType === "article" ? "article" : "website"}">
  <meta property="og:site_name" content="${escapeHtml(SITE_NAME)}">
  <meta property="og:locale" content="ar_EG">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:image" content="${escapeHtml(ogImage)}">
  <meta property="og:image:alt" content="${escapeHtml(title)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(ogImage)}">
  <meta name="theme-color" content="#0a1120">
  <link rel="icon" href="/icons/icon-192.png" sizes="192x192">
  <link rel="apple-touch-icon" href="/icons/icon-192.png">
  <link rel="stylesheet" href="/css/portal.css?v=20260308-11">
  ${withAds ? adsenseScriptTag : ""}
  ${extraHead}
  ${defaultSchemas}
  ${schema}
</head>
<body>
  ${body}
</body>
</html>`;
};

const mainNav = `
  <header class="site-header">
    <div class="header-wrap">
      <div class="header-main">
        <a class="brand" href="/">
          <img src="${BRAND_LOGO_PATH}" alt="${escapeHtml(SITE_BRAND)}" width="44" height="44" loading="eager">
          <span>${escapeHtml(SITE_BRAND)}</span>
        </a>
        <form class="top-search" action="/topics/" method="get">
          <input type="search" name="q" placeholder="ابحث عن موضوع..." aria-label="ابحث في الموقع">
          <button type="submit">بحث</button>
        </form>
      </div>
      <nav class="top-nav">
        <a href="/">الرئيسية</a>
        <a href="/topics/">الموضوعات</a>
        <a class="feature-nav" href="/features.html#mood-map" title="خريطة المزاج" aria-label="خريطة المزاج">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2a7 7 0 0 0-7 7c0 4.8 7 13 7 13s7-8.2 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z"/></svg>
        </a>
        <a class="feature-nav" href="/features.html#trend-challenge" title="توقع الترند" aria-label="توقع الترند">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 19h18v2H3v-2Zm2-3.2 4.7-4.6 3.1 3.1 5.2-5.2 1.4 1.4-6.6 6.6-3.1-3.1L6.4 17.2 5 15.8Z"/></svg>
        </a>
        <a class="feature-nav" href="/features.html#quick-20" title="خبر في 20 ثانية" aria-label="خبر في 20 ثانية">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 1a11 11 0 1 0 11 11A11 11 0 0 0 12 1Zm1 11.6 4.3 2.5-1 1.7L11 13.5V6h2v6.6Z"/></svg>
        </a>
        <a class="feature-nav" href="/features.html#coverage-compare" title="مين غطى أفضل" aria-label="مين غطى أفضل">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M11 3h2v2h6v2h-1l3 6h-6l3-6h-5v10h3v2H8v-2h3V7H6l3 6H3l3-6H5V5h6V3Z"/></svg>
        </a>
        <a class="feature-nav" href="/features.html#story-timeline" title="الخط الزمني" aria-label="الخط الزمني">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 11h4a3 3 0 0 1 6 0h6v2h-6a3 3 0 0 1-6 0H4v-2Zm5 1a1 1 0 1 0 2 0 1 1 0 0 0-2 0Z"/></svg>
        </a>
        <a class="feature-nav" href="/features.html#my-feed" title="يفيدني أنا" aria-label="يفيدني أنا">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 5h18v2l-7 7v5l-4-2v-3L3 7V5Z"/></svg>
        </a>
        <a class="feature-nav" href="/features.html#headline-game" title="صح ولا مبالغ" aria-label="صح ولا مبالغ">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 5h10l2 4h2v6h-3l-2 4H8l-2-4H3V9h2l2-4Zm2 2-1 2h8l-1-2H9Zm0 10h6l1-2H8l1 2Z"/></svg>
        </a>
        <a class="feature-nav" href="/features.html#open-discussion" title="افتح النقاش" aria-label="افتح النقاش">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 4h16v12H8l-4 4V4Zm3 4v2h10V8H7Zm0 4v2h7v-2H7Z"/></svg>
        </a>
      </nav>
    </div>
  </header>`;

const siteFooter = `
  <footer class="site-footer">
    <div class="footer-wrap">
      <section>
        <h3>${escapeHtml(SITE_BRAND)}</h3>
        <p>منصة عربية تجمع أحدث الموضوعات في عرض سريع ومنظم يساعد القارئ على المتابعة اليومية بسهولة.</p>
      </section>
      <section>
        <h3>روابط مهمة</h3>
        <div class="footer-links">
          <a href="/">الرئيسية</a>
          <a href="/topics/">الموضوعات</a>
          <a href="/about.html">من نحن</a>
          <a href="/privacy.html">الخصوصية</a>
          <a href="/contact.html">اتصل بنا</a>
          <a href="/terms.html">الشروط</a>
        </div>
      </section>
      <section>
        <h3>تواصل</h3>
        <p><a href="/contact.html">راسلنا عبر صفحة التواصل</a></p>
        <p>© ${new Date().getFullYear()} ${escapeHtml(SITE_NAME)}</p>
      </section>
    </div>
  </footer>`;

const articleNarrative = (post) => {
  const base = [
    `يتناول هذا التقرير موضوع "${post.title}" من زاوية عملية تساعد القارئ العربي على فهم السياق العام، بعيدًا عن العناوين السريعة. نحن نعتمد على ملخصات المصدر الأصلي، ثم نعيد ترتيب النقاط الأساسية بشكل واضح يبرز ما تغير فعلًا، وما الذي ما زال قيد المتابعة خلال الساعات أو الأيام المقبلة.`,
    `خلفية هذا الملف مرتبطة بتطورات متراكمة داخل محور ${post.category}، لذلك من المهم قراءة الخبر في إطار زمني أوسع. عادةً ما تظهر التفاصيل الدقيقة بعد النشر الأول، مثل التصريحات الرسمية، أو التوضيحات الفنية، أو الأرقام المرتبطة بالتأثير الاقتصادي والاجتماعي، وهو ما يجعل المتابعة المتدرجة أكثر دقة من الانطباع الأول.`,
    `من الناحية العملية، يهتم المتابعون بثلاث نقاط: ماذا حدث الآن، ولماذا حدث، وما التأثير المتوقع على الناس أو السوق أو الجهات المعنية. لهذا السبب نحافظ على عرض متوازن يبتعد عن التهويل، ويعطي القارئ صورة أقرب للواقع، مع الإشارة المستمرة إلى رابط المصدر الأصلي حتى يمكن التحقق من التفاصيل بسهولة.`,
    `قراءة البيانات المتاحة حتى الآن تشير إلى أن الخبر لا يقف عند حد العنوان، بل يمتد إلى نتائج مرتبطة بالقرارات القادمة. قد يتغير إيقاع الحدث سريعًا إذا صدرت معلومات إضافية، لذلك يُنصح بمتابعة المستجدات الرسمية أولًا، ومقارنة أكثر من مصدر قبل اعتماد أي استنتاج نهائي، خاصة في الملفات الحساسة أو المؤثرة على الجمهور.`,
    `إذا كنت تتابع هذا النوع من الأخبار يوميًا، فالأفضل تقسيم التحليل إلى مراحل: مرحلة الخبر الأولي، ثم مرحلة التوضيح، ثم مرحلة الأثر. هذه الطريقة تقلل من التضارب وتساعد في اتخاذ قرار أفضل، سواء كنت مهتمًا بالجانب العام أو بالانعكاس المباشر على العمل أو الدراسة أو التخطيط المالي والشخصي.`,
    `في النهاية، يبقى الهدف من هذا المحتوى تقديم قراءة مفيدة وسريعة ولكن بعمق كافٍ. لذلك نعرض ملخصًا منظمًا، ونضيف عناصر مساعدة مثل النقاط المفتاحية والأسئلة الشائعة والروابط الداخلية لموضوعات قريبة. هذا الأسلوب يدعم تجربة القارئ، وفي الوقت نفسه يقوي بنية الصفحة لمحركات البحث بطريقة سليمة.`
  ];

  let text = base.join("\n\n");
  if (wordCount(text) < MIN_ARTICLE_WORDS) {
    text += "\n\n" +
      `ملاحظة تحريرية: هذا الموضوع يُحدّث باستمرار عند ظهور معطيات جديدة من ${post.source_name}. التركيز هنا على تقديم معلومات عملية قابلة للفهم السريع، مع الحفاظ على رابط مباشر للمصدر الأصلي حتى يظل القارئ قادرًا على مراجعة السياق الكامل دون وسيط.`;
  }
  return text;
};

const buildFaq = (post) => [
  {
    q: `ما أهمية خبر "${post.title}" الآن؟`,
    a: `أهميته أنه يقع ضمن ملف ${post.category} ويؤثر على المتابعين بشكل مباشر أو غير مباشر، لذلك عرضنا ملخصًا مركّزًا مع رابط المصدر.`
  },
  {
    q: "هل المحتوى هنا بديل عن المصدر الأصلي؟",
    a: "لا. هذه الصفحة ملخص تحليلي منظم، والمصدر الأصلي يظل المرجع الأساسي للتفاصيل الكاملة." 
  },
  {
    q: "كيف أتابع التحديثات القادمة لنفس الموضوع؟",
    a: "تابع قسم الموضوعات يوميًا، وراجع الرابط الأصلي المدرج داخل الصفحة لأن التحديثات الرسمية تظهر هناك أولًا." 
  }
];

const pickRelated = (posts, post, count = 6) => {
  const titleWords = new Set(
    normalizeTitleKey(post.title)
      .split(" ")
      .filter((w) => w.length > 2)
  );

  const scored = [];
  posts.forEach((row) => {
    if (row.slug === post.slug) return;
    let score = 0;
    if (row.category === post.category) score += 3;
    const rowWords = normalizeTitleKey(row.title).split(" ");
    rowWords.forEach((w) => {
      if (titleWords.has(w)) score += 1;
    });
    if (score > 0) scored.push({ row, score });
  });

  scored.sort((a, b) => b.score - a.score || Date.parse(b.row.published_at) - Date.parse(a.row.published_at));
  return scored.slice(0, count).map((x) => x.row);
};

const buildPostHtml = (post, related) => {
  const canonical = `${SITE_URL}/topics/${post.slug}/`;
  const description = post.excerpt;
  const sourceHref = post.source_link || post.source_url;
  const noindex = !isIndexablePost(post);
  const contentBlocks = articleNarrative(post).split("\n\n").filter(Boolean);
  const faqItems = buildFaq(post);

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "الرئيسية", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "الموضوعات", item: `${SITE_URL}/topics/` },
      { "@type": "ListItem", position: 3, name: post.title, item: canonical }
    ]
  };

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: post.title,
    description: post.excerpt,
    image: [DEFAULT_OG_IMAGE],
    url: canonical,
    datePublished: post.published_at,
    dateModified: post.updated_at || post.published_at,
    inLanguage: "ar",
    mainEntityOfPage: canonical,
    articleSection: post.category,
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/icons/icon-512.png`
      }
    },
    isAccessibleForFree: true,
    keywords: `${SITE_KEYWORDS}, ${post.category}`
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a }
    }))
  };

  const schema = `<script type="application/ld+json">${JSON.stringify(articleSchema)}</script>
<script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>
<script type="application/ld+json">${JSON.stringify(faqSchema)}</script>`;

  const body = `
    ${mainNav}
    <main class="container article">
      <div class="breadcrumbs"><a href="/">الرئيسية</a> / <a href="/topics/">الموضوعات</a> / ${escapeHtml(post.category)}</div>
      <h1>${escapeHtml(post.title)}</h1>
      <p class="lead">${escapeHtml(post.excerpt)}</p>
      <div class="meta-row">
        <span>التصنيف: ${escapeHtml(post.category)}</span>
        <span>المصدر: ${escapeHtml(post.source_name)}</span>
        <time datetime="${escapeHtml(post.published_at)}">${escapeHtml(post.published_at.slice(0, 10))}</time>
      </div>

      <section class="key-points">
        <h2>أهم النقاط</h2>
        <ul>
          <li>ملخص واضح للخبر مع تبسيط السياق العام.</li>
          <li>عرض التأثير المحتمل على المتابعين والقطاع المرتبط.</li>
          <li>ربط الخبر بمسار التطورات السابقة واللاحقة.</li>
          <li>الإشارة إلى المصدر الأصلي للتحقق من التفاصيل.</li>
          <li>روابط داخلية لموضوعات قريبة لتحسين المتابعة.</li>
        </ul>
      </section>

      ${contentBlocks.map((p) => `<p>${escapeHtml(p)}</p>`).join("\n")}

      <p>للاطلاع على الخبر الكامل من مصدره الأصلي:</p>
      <p><a class="source-link" rel="nofollow noopener" target="_blank" href="${escapeHtml(sourceHref)}">${escapeHtml(post.source_name)}</a></p>

      <section class="faq-box">
        <h2>الأسئلة الشائعة</h2>
        ${faqItems.map((f) => `<details><summary>${escapeHtml(f.q)}</summary><p>${escapeHtml(f.a)}</p></details>`).join("\n")}
      </section>

      <section class="related-box">
        <h2>موضوعات ذات صلة</h2>
        <ul>
          ${related.map((r) => `<li><a href="/topics/${r.slug}/">${escapeHtml(r.title)}</a></li>`).join("\n")}
        </ul>
      </section>

    </main>
    ${siteFooter}
    `;

  return baseLayout({
    title: `${post.title} | ${SITE_NAME}`,
    description,
    canonical,
    schema,
    extraHead: `<meta property="article:published_time" content="${escapeHtml(post.published_at)}"><meta property="article:modified_time" content="${escapeHtml(post.updated_at || post.published_at)}"><meta property="article:section" content="${escapeHtml(post.category)}"><meta property="article:author" content="${escapeHtml(SITE_NAME)}">`,
    pageType: "article",
    noindex,
    withAds: true,
    body
  });
};

const buildListingHtml = ({ title, description, canonical, cards, pager, pageNum, totalPages, listPosts }) => {
  const extraHead =
    (pageNum > 1 ? `<link rel="prev" href="${pageNum === 2 ? "/topics/" : `/topics/page/${pageNum - 1}/`}">` : "") +
    (pageNum < totalPages ? `<link rel="next" href="/topics/page/${pageNum + 1}/">` : "");

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "الرئيسية", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "الموضوعات", item: `${SITE_URL}/topics/` },
      ...(pageNum > 1
        ? [{ "@type": "ListItem", position: 3, name: `صفحة ${pageNum}`, item: canonical }]
        : [])
    ]
  };

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: title,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    numberOfItems: listPosts.length,
    itemListElement: listPosts.map((post, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      url: `${SITE_URL}/topics/${post.slug}/`,
      name: post.title
    }))
  };

  const schema = `${jsonLd(breadcrumbSchema)}\n${jsonLd(itemListSchema)}`;

  const body = `
    ${mainNav}
    <main class="container">
      <section class="hero">
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(description)}</p>
        <form class="search-box" id="topic-search-form" action="/topics/" method="get">
          <input type="search" id="topic-search-input" name="q" placeholder="ابحث داخل العناوين..." aria-label="بحث في الموضوعات">
          <button type="submit">بحث</button>
        </form>
        <p class="search-state" id="search-state" hidden></p>
      </section>
      <section class="grid">${cards.join("\n")}</section>
      <nav class="pager">${pager}</nav>
    </main>
    ${siteFooter}
    <script>
      (function () {
        var params = new URLSearchParams(window.location.search);
        var query = (params.get("q") || "").trim().toLowerCase();
        var input = document.getElementById("topic-search-input");
        var state = document.getElementById("search-state");
        var cards = Array.prototype.slice.call(document.querySelectorAll(".grid .card"));
        if (!input || !cards.length) return;
        input.value = query;
        if (!query) return;
        ["robots", "googlebot", "bingbot"].forEach(function (name) {
          var meta = document.querySelector('meta[name="' + name + '"]');
          if (meta) meta.setAttribute("content", "noindex,follow,max-image-preview:large");
        });
        if (document.title) {
          document.title = "نتائج البحث | ${escapeHtml(SITE_NAME)}";
        }
        var shown = 0;
        var pager = document.querySelector(".pager");
        cards.forEach(function (card) {
          var title = (card.getAttribute("data-title") || "").toLowerCase();
          var cat = (card.getAttribute("data-category") || "").toLowerCase();
          var match = title.indexOf(query) !== -1 || cat.indexOf(query) !== -1;
          card.style.display = match ? "" : "none";
          if (match) shown += 1;
        });
        if (pager) pager.style.display = "none";
        if (state) {
          state.hidden = false;
          state.textContent = "نتائج البحث: " + shown + " موضوع";
        }
      })();
    </script>`;
  return baseLayout({ title, description, canonical, body, extraHead, schema, noindex: pageNum > 1, withAds: true });
};

const staticPage = ({ title, description, body, pathName }) =>
  baseLayout({
    title: `${title} | ${SITE_NAME}`,
    description,
    canonical: `${SITE_URL}${pathName}`,
    body: `${mainNav}<main class="container static">${body}</main>${siteFooter}`
  });

const buildNotFoundHtml = () =>
  baseLayout({
    title: `الصفحة غير موجودة | ${SITE_NAME}`,
    description: "هذه الصفحة غير متوفرة أو تم حذفها. يمكنك العودة إلى الرئيسية أو متابعة أحدث الموضوعات.",
    canonical: `${SITE_URL}/404.html`,
    noindex: true,
    body: `${mainNav}
    <main class="container static">
      <section class="hero">
        <h1>الصفحة غير موجودة</h1>
        <p>الرابط الذي طلبته غير متاح الآن، وربما تم نقله أو حذفه من الأرشيف.</p>
        <div class="hero-kpis">
          <span><a href="/">العودة إلى الرئيسية</a></span>
          <span><a href="/topics/">تصفح الموضوعات</a></span>
        </div>
      </section>
    </main>
    ${siteFooter}`
  });

const cssContent = `:root{--bg:#070b14;--bg-soft:#0d1426;--surface:#111a31;--surface-2:#0c1529;--surface-3:#16223f;--text:#eef3ff;--muted:#98a9c8;--line:#243861;--brand:#ff8a3d;--brand-2:#22d3ee;--link:#8ab4ff;--ok:#57d6b5;--shadow:0 22px 52px rgba(0,0,0,.35)}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;color:var(--text);font:16px/1.9 "Cairo","Changa","Tajawal",Tahoma,sans-serif;background:radial-gradient(circle at 20% -10%,#24345f66 0%,transparent 34%),radial-gradient(circle at 80% 0%,#0a8ea433 0%,transparent 30%),linear-gradient(180deg,var(--bg),var(--bg-soft))}
a{color:var(--link);text-decoration:none;transition:.2s ease}
a:hover{color:#b9d0ff}
.site-header{position:sticky;top:0;z-index:60;padding:12px 16px;border-bottom:1px solid #2a3f68;background:#060d1be0;backdrop-filter:blur(14px)}
.header-wrap{max-width:1280px;margin:0 auto;display:flex;flex-direction:column;gap:10px}
.header-main{display:flex;gap:12px;align-items:center}
.brand{display:flex;align-items:center;gap:10px;font-weight:900;color:#f6f9ff;letter-spacing:.3px}
.brand img{width:42px;height:42px;border-radius:12px;box-shadow:0 10px 24px rgba(0,0,0,.34)}
.brand span{font-size:25px}
.top-search{display:flex;gap:8px;align-items:center;flex:1;min-width:220px}
.top-search input{flex:1;padding:12px 13px;border:1px solid #365286;border-radius:13px;background:#0f1b33;color:#f2f6ff;outline:none}
.top-search input::placeholder{color:#8ba1c5}
.top-search input:focus{border-color:#4f8dde;box-shadow:0 0 0 3px #4f8dde3b}
.top-search button{padding:11px 16px;border:none;border-radius:13px;background:linear-gradient(120deg,#ff9a57,#ff7a2f);color:#1b1007;font-weight:800;cursor:pointer}
.top-nav{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.top-nav a{padding:8px 13px;border-radius:999px;border:1px solid #2f466f;background:#0b172c;color:#d8e6ff}
.top-nav a:hover{border-color:#3f6196;background:#12213f}
.top-nav .feature-nav{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;padding:0;border-radius:50%;background:#0f1f3d}
.top-nav .feature-nav svg{width:18px;height:18px;fill:#bfe0ff}
.top-nav .feature-nav:hover svg{fill:#eff7ff}
.container{max-width:1280px;margin:0 auto;padding:24px}
.hero{position:relative;overflow:hidden;padding:30px;border:1px solid var(--line);border-radius:26px;background:linear-gradient(135deg,#1a2b51 0%,#16355a 45%,#144a5d 100%);box-shadow:var(--shadow);margin-bottom:24px}
.hero::before{content:"";position:absolute;inset:auto -90px -120px auto;width:260px;height:260px;border-radius:50%;background:radial-gradient(circle,#42d7f44d 0%,transparent 70%);pointer-events:none}
.hero-home{display:grid;grid-template-columns:1.4fr .9fr;gap:16px;align-items:start}
.hero-copy .eyebrow{display:inline-flex;gap:7px;align-items:center;margin:0 0 12px;padding:5px 12px;border-radius:999px;background:#0f1d3f;border:1px solid #3d5888;color:#79c8ff;font-weight:700;font-size:13px}
.hero h1{margin:0 0 12px;font-size:40px;line-height:1.3;color:#fff}
.hero p{margin:0;color:#d9e7ff}
.hero-kpis{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
.hero-kpis span{padding:6px 12px;border-radius:999px;background:#0f2242;border:1px solid #345889;color:#e7f2ff;font-size:13px}
.hero-panel{padding:16px;border:1px solid #3c5e93;border-radius:18px;background:#09162f}
.hero-panel h2{margin:0 0 10px;font-size:22px;color:#fff}
.hero-panel ul{margin:0;padding-inline-start:18px;color:#cee0ff}
.hero-panel li{margin-bottom:8px}
.section-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:12px 0 16px}
.section-head h2{margin:0;font-size:28px;color:#f6f9ff}
.section-head a{padding:8px 12px;border-radius:10px;border:1px solid #375384;background:#0f1d37}
.search-box{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
.search-box input{min-width:230px;flex:1;padding:12px 13px;border:1px solid #385382;border-radius:13px;background:#0f1b33;color:#f2f6ff;outline:none}
.search-box input::placeholder{color:#8da5cb}
.search-box input:focus{border-color:#4f8dde;box-shadow:0 0 0 3px #4f8dde3b}
.search-box button{padding:11px 16px;border:none;border-radius:13px;background:linear-gradient(120deg,#22d3ee,#3bb8f5);color:#051623;font-weight:800;cursor:pointer}
.search-state{margin-top:10px;color:#d0e6ff;font-size:14px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:18px}
.card{display:flex;flex-direction:column;background:linear-gradient(180deg,var(--surface) 0%,var(--surface-2) 100%);border:1px solid var(--line);border-radius:20px;overflow:hidden;box-shadow:0 12px 30px rgba(0,0,0,.28);transition:transform .2s ease,border-color .2s ease,box-shadow .2s ease;animation:fadeIn .45s ease}
.card:hover{transform:translateY(-4px);border-color:#3c6196;box-shadow:0 18px 36px rgba(0,0,0,.34)}
.card-media{min-height:74px;padding:12px 14px;background:radial-gradient(circle at 15% 15%,#42b9ff2e 0%,transparent 45%),linear-gradient(130deg,#1a2f58,#0d3d63 60%,#0d4f66);display:flex;align-items:flex-start;justify-content:space-between;gap:8px;border-bottom:1px solid #294672}
.card-media-kicker{display:inline-flex;max-width:70%;padding:4px 10px;border-radius:999px;border:1px solid #4b6fa4;background:#10284a;color:#cfe7ff;font-size:12px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.card-media-badge{font-size:11px;font-weight:800;color:#c4efff;background:#0f2744;border:1px solid #3f6f8f;border-radius:999px;padding:4px 9px}
.card-body{padding:14px 15px 16px;display:flex;flex-direction:column;flex:1}
.card-top{display:flex;justify-content:space-between;align-items:center;gap:8px;color:#a8bbdf;font-size:12px;margin-bottom:10px}
.chip{display:inline-block;padding:4px 10px;border-radius:999px;border:1px solid #3f6398;background:#13284a;color:#8fd8ff;font-size:12px}
.card h2{font-size:21px;line-height:1.45;margin:0 0 9px}
.card h2 a{color:#f4f8ff;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.card p{margin:0;color:var(--muted);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.card-actions{margin-top:auto;padding-top:12px;display:flex;justify-content:space-between;align-items:center;gap:10px}
.source-name{color:#8fa4c8;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:52%}
.read-more{padding:7px 11px;border-radius:10px;border:1px solid #3e6499;background:#132548;color:#cfe4ff;font-weight:700}
.read-more:hover{background:#19315e}
.meta-row{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;color:#c3d6f8;font-size:13px;margin-top:12px;padding:11px 12px;background:#101f3c;border:1px solid #314e7d;border-radius:12px}
.article{animation:fadeIn .45s ease}
.article h1{font-size:38px;line-height:1.35;margin:10px 0 12px;color:#fff}
.article .lead{color:#cbdcf8;font-size:20px}
.article h2{font-size:27px;margin-top:28px;color:#f2f7ff}
.article p{margin:0 0 16px}
.breadcrumbs{font-size:13px;color:#9cb2d8}
.breadcrumbs a{color:#8fc4ff}
.source-link{font-weight:700}
.key-points,.faq-box,.related-box{background:#101d38;border:1px solid #2f4978;border-radius:16px;padding:16px;margin:20px 0}
.key-points ul,.related-box ul{margin:0;padding-inline-start:22px}
.faq-box details{margin-bottom:9px;border-bottom:1px solid #2a436f;padding-bottom:9px}
.faq-box summary{cursor:pointer;color:#d4e6ff;font-weight:700}
.pager{display:flex;gap:8px;flex-wrap:wrap;margin:26px 0}
.pager a,.pager span{padding:8px 13px;border:1px solid #355483;border-radius:12px;background:#101e39;color:#cfdef7}
.pager .current{background:linear-gradient(120deg,#ff9e5f,#ff7a2f);color:#26150a;border-color:transparent;font-weight:800}
.ad-box{margin:26px 0;padding:12px;border:1px dashed #3a5b8f;border-radius:12px;min-height:90px;background:#0f1b34}
.static h1{margin-top:0;color:#fff}
.footer-note{color:#99acd0;font-size:14px}
.site-footer{margin-top:34px;border-top:1px solid #243962;background:linear-gradient(180deg,#081327,#070f1f)}
.footer-wrap{max-width:1280px;margin:0 auto;padding:26px 24px;display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:18px}
.site-footer h3{margin:0 0 10px;color:#f1f6ff}
.site-footer p{margin:0;color:#98abd0}
.footer-links{display:grid;gap:8px}
.footer-links a{width:max-content;color:#b5cff8}
.footer-links a:hover{color:#e3efff}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@media (max-width:1024px){.container{padding:20px}.hero h1,.article h1{font-size:34px}.hero-home{grid-template-columns:1fr}.footer-wrap{grid-template-columns:1fr 1fr}}
@media (max-width:768px){.site-header{position:static}.header-main{flex-direction:column;align-items:stretch}.brand{justify-content:center}.top-search{width:100%}.top-nav{justify-content:center}.top-nav .feature-nav{width:34px;height:34px}.top-nav .feature-nav svg{width:16px;height:16px}.container{padding:16px}.grid{grid-template-columns:1fr 1fr}.hero h1,.article h1{font-size:30px}}
@media (max-width:560px){.grid{grid-template-columns:1fr}.hero{padding:18px}.hero h1,.article h1{font-size:26px}.search-box button,.top-search button{width:100%}.footer-wrap{grid-template-columns:1fr}}`;

const logoSvgContent = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="t d">
<title id="t">Chat EGY Logo</title>
<desc id="d">Premium monogram logo for Chat EGY.</desc>
<defs>
  <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#e2c17e"/>
    <stop offset="100%" stop-color="#a87b30"/>
  </linearGradient>
  <linearGradient id="sea" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#1f7462"/>
    <stop offset="100%" stop-color="#0d4e40"/>
  </linearGradient>
</defs>
<rect width="512" height="512" rx="110" fill="#f8f1e3"/>
<rect x="30" y="30" width="452" height="452" rx="90" fill="none" stroke="url(#gold)" stroke-width="8"/>
<path d="M130 158h252v44H184v52h176v43H184v54h198v43H130V158z" fill="url(#sea)"/>
<circle cx="366" cy="148" r="28" fill="url(#gold)"/>
<text x="256" y="443" text-anchor="middle" fill="#0f4f42" font-size="56" font-family="Cairo,Segoe UI,Tahoma,sans-serif" font-weight="800">CHAT EGY</text>
</svg>`;

const buildHomepage = (posts) => {
  const top = posts.slice(0, HOMEPAGE_CARDS_COUNT).map(cardMarkup).join("\n");
  const featuredList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "أحدث الموضوعات",
    numberOfItems: Math.min(posts.length, 20),
    itemListElement: posts.slice(0, 20).map((post, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      url: `${SITE_URL}/topics/${post.slug}/`,
      name: post.title
    }))
  };
  const schema = `${jsonLd(webSiteSchema)}\n${jsonLd(featuredList)}`;

  const body = `
    ${mainNav}
    <main class="container">
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">منصة محتوى عربي</p>
          <h1>بوابة شات إيجي للمحتوى العربي</h1>
          <p>واجهة جديدة أسرع في التصفح، مع ترتيب محتوى أوضح يساعدك توصل للموضوعات المهمة بدون تشتيت.</p>
          <form class="search-box" action="/topics/" method="get">
            <input type="search" name="q" placeholder="ابحث في أحدث الموضوعات..." aria-label="بحث في أحدث الموضوعات">
            <button type="submit">ابدأ البحث</button>
          </form>
          <div class="hero-kpis">
            <span>+${posts.length} موضوع منشور</span>
            <span>تحديثات يومية</span>
            <span>تصنيفات متنوعة</span>
          </div>
        </div>
      </section>
      <section class="section-head">
        <h2>أحدث الموضوعات</h2>
        <a href="/topics/">عرض الأرشيف الكامل</a>
      </section>
      <section class="grid">${top}</section>
      <p class="footer-note">كل موضوع يتضمن ملخصًا مع رابط المصدر الأصلي.</p>
    </main>
    ${siteFooter}
    `;

  return baseLayout({
    title: `${SITE_NAME} | موضوعات عربية محدثة`,
    description: "موقع موضوعات عربية مهيأ لمحركات البحث مع تحديث يومي تلقائي وروابط مصادر واضحة.",
    canonical: `${SITE_URL}/`,
    schema,
    pageType: "website",
    withAds: true,
    body
  });
};

const collectCandidates = async (minNeeded, excludeKeys = new Set()) => {
  const queries = [...FEED_KEYWORDS, ...FEED_KEYWORDS.map((k) => `${k} اليوم`)];
  const collected = [];
  const seen = new Set(excludeKeys);

  for (const query of queries) {
    try {
      const res = await fetch(feedUrl(query), { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.ok) continue;
      const xml = await res.text();
      const items = parseItems(xml, query.replace(/\s+اليوم$/u, ""));
      for (const item of items) {
        const key = normalizeTitleKey(item.title);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        collected.push(item);
      }
      if (collected.length >= minNeeded * 3) break;
    } catch (_) {
      // ignore transient feed errors
    }
  }

  return collected;
};

const writeFeedXml = async (posts) => {
  const latest = posts.slice(0, 100);
  const items = latest
    .map((post) => {
      const link = `${SITE_URL}/topics/${post.slug}/`;
      return `<item>
  <title><![CDATA[${post.title}]]></title>
  <link>${link}</link>
  <guid>${link}</guid>
  <pubDate>${new Date(post.published_at).toUTCString()}</pubDate>
  <description><![CDATA[${post.excerpt}]]></description>
</item>`;
    })
    .join("\n");

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title><![CDATA[${SITE_NAME}]]></title>
  <link>${SITE_URL}</link>
  <description><![CDATA[موجزات عربية محدثة يوميًا مع روابط المصادر الأصلية.]]></description>
  <language>ar</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
</channel>
</rss>\n`;

  await fs.writeFile(path.join(ROOT, "feed.xml"), feed, "utf8");
};

const writeSitemapUrlset = async (fileName, entries) => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries
    .map(
      (entry) =>
        `  <url>\n    <loc>${escapeHtml(entry.loc)}</loc>\n    <lastmod>${escapeHtml(entry.lastmod || todayDate)}</lastmod>\n    <changefreq>${escapeHtml(entry.changefreq || "daily")}</changefreq>\n    <priority>${escapeHtml(String(entry.priority ?? 0.7))}</priority>\n  </url>`
    )
    .join("\n")}\n</urlset>\n`;
  await fs.writeFile(path.join(ROOT, fileName), xml, "utf8");
};

const removeLegacySitemapFiles = async () => {
  const legacyNames = new Set(["sitemap-static.xml", "sitemap-index.xml"]);
  const files = await fs.readdir(ROOT);
  const toDelete = files.filter((name) => legacyNames.has(name) || /^sitemap-topics-\d+\.xml$/u.test(name));
  await Promise.all(
    toDelete.map(async (name) => {
      try {
        await fs.unlink(path.join(ROOT, name));
      } catch (_) {
        // ignore deletion errors for non-critical cleanup
      }
    })
  );
};

const writeSitemaps = async (posts, totalPages) => {
  const staticEntries = [
    { loc: `${SITE_URL}/`, priority: 1.0 },
    { loc: `${SITE_URL}/topics/`, priority: 0.9 },
    { loc: `${SITE_URL}/features.html`, priority: 0.8 },
    { loc: `${SITE_URL}/about.html`, priority: 0.6 },
    { loc: `${SITE_URL}/privacy.html`, priority: 0.4 },
    { loc: `${SITE_URL}/terms.html`, priority: 0.4 },
    { loc: `${SITE_URL}/contact.html`, priority: 0.5 }
  ];
// Keep only one sitemap.xml file to simplify Search Console processing.
  const allEntries = [
    ...staticEntries.map((entry) => ({
      loc: entry.loc,
      lastmod: todayDate,
      changefreq: entry.changefreq || "daily",
      priority: entry.priority
    })),
    ...posts.filter(isIndexablePost).map((post) => ({
      loc: `${SITE_URL}/topics/${post.slug}/`,
      lastmod: (post.updated_at || post.published_at || todayDate).slice(0, 10),
      changefreq: "daily",
      priority: 0.7
    }))
  ];

  await removeLegacySitemapFiles();
  await writeSitemapUrlset("sitemap.xml", allEntries);
};

const writeRobots = async () => {
  const robots = `User-agent: *
Allow: /
Disallow: /dashboard.php
Disallow: /dashboard/
Disallow: /app-api.php
Disallow: /api.php

# AI crawler directives (standard robots format)
User-agent: Amazonbot
Disallow: /

User-agent: Applebot-Extended
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: GPTBot
Disallow: /

User-agent: meta-externalagent
Disallow: /

User-agent: Googlebot
Allow: /

User-agent: Googlebot-News
Allow: /

User-agent: AdsBot-Google
Allow: /

Host: chat-egy.com
Sitemap: ${SITE_URL}/sitemap.xml
`;
  await fs.writeFile(path.join(ROOT, "robots.txt"), robots, "utf8");
};

const toPostRow = (item, id, existing = null) => {
  const now = new Date().toISOString();
  const published = item.publishedAt || now;
  return normalizePostRow({
    id,
    slug: slugId(id),
    title: item.title,
    excerpt: item.summary || `ملخص سريع حول ${item.title}.`,
    category: item.keyword,
    source_name: item.sourceName,
    source_url: item.sourceUrl,
    source_link: item.link,
    published_at: published,
    updated_at: existing?.updated_at || now,
    title_key: normalizeTitleKey(item.title)
  });
};

const readExistingPosts = async () => {
  const file = path.join(ROOT, "data", "topics.json");
  try {
    const raw = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((p) => normalizePostRow(p));
  } catch (_) {
    return [];
  }
};

const buildPosts = async (args) => {
  if (args.mode === "rebuild") {
    return { posts: await readExistingPosts(), addedCount: 0, liveCount: 0, fallbackCount: 0 };
  }

  if (args.mode === "daily") {
    const existing = repairFallbackDatedPosts(await readExistingPosts());
    const existingKeys = new Set(existing.map((p) => p.title_key));
    const candidates = await collectCandidates(args.dailyCount + 20, existingKeys);
    const liveToAdd = candidates.slice(0, args.dailyCount);
    const missing = Math.max(0, args.dailyCount - liveToAdd.length);
    const fallbackToAdd = missing
      ? buildFallbackCandidates(
          missing,
          new Set([...existingKeys, ...liveToAdd.map((item) => normalizeTitleKey(item.title))])
        )
      : [];
    const toAdd = [...liveToAdd, ...fallbackToAdd].slice(0, args.dailyCount);
    if (!toAdd.length) {
      return { posts: existing, addedCount: 0, liveCount: 0, fallbackCount: 0 };
    }

    let nextId = existing.reduce((max, row) => Math.max(max, Number(row.id || 0)), 0) + 1;
    const newRows = toAdd.map((item) => {
      const row = toPostRow(item, nextId);
      nextId += 1;
      return row;
    });

    const merged = [...newRows, ...existing];
    merged.sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
    return {
      posts: merged.slice(0, args.maxPosts),
      addedCount: newRows.length,
      liveCount: Math.min(liveToAdd.length, newRows.length),
      fallbackCount: Math.max(0, newRows.length - liveToAdd.length)
    };
  }

  const candidates = await collectCandidates(args.target + 30);
  const picked = candidates.slice(0, args.target);
  if (picked.length < args.target) {
    throw new Error(`Not enough topics fetched. Got ${picked.length}, expected ${args.target}.`);
  }

  const rows = picked.map((item, idx) => toPostRow(item, idx + 1));
  rows.sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
  return { posts: rows, addedCount: rows.length, liveCount: rows.length, fallbackCount: 0 };
};

const applyBackdatedDates = (posts) =>
  posts.map((post, index) => {
    const minuteShift = index % BACKDATE_GROUP_SIZE;
    const published = new Date();
    published.setUTCHours(12, 0, 0, 0);

    // Keep the newest 20 posts on today's date.
    if (index >= BACKDATE_GROUP_SIZE) {
      const shiftedIndex = index - BACKDATE_GROUP_SIZE;
      const group = Math.floor(shiftedIndex / BACKDATE_GROUP_SIZE);
      const daysAgo = BACKDATE_START_DAYS_AGO + group * BACKDATE_STEP_DAYS;
      published.setUTCDate(published.getUTCDate() - daysAgo);
    }

    published.setUTCMinutes(published.getUTCMinutes() - minuteShift);

    const updated = new Date(published);
    updated.setUTCHours(18, 0, 0, 0);

    return {
      ...post,
      published_at: published.toISOString(),
      updated_at: updated.toISOString()
    };
  });

const writePages = async (posts) => {
  const cssDir = path.join(ROOT, "css");
  const dataDir = path.join(ROOT, "data");
  const imagesDir = path.join(ROOT, "images");
  const topicsDir = path.join(ROOT, "topics");
  const pagesDir = path.join(topicsDir, "page");
  await Promise.all([ensureDir(cssDir), ensureDir(dataDir), ensureDir(imagesDir), ensureDir(topicsDir), ensureDir(pagesDir)]);

  await fs.writeFile(path.join(cssDir, "portal.css"), cssContent, "utf8");
  await fs.writeFile(path.join(imagesDir, "chat-egy-logo.svg"), logoSvgContent, "utf8");
  await fs.writeFile(path.join(dataDir, "topics.json"), JSON.stringify(posts, null, 2), "utf8");

  for (const post of posts) {
    const pDir = path.join(topicsDir, post.slug);
    await ensureDir(pDir);
    const related = pickRelated(posts, post, 6);
    await fs.writeFile(path.join(pDir, "index.html"), buildPostHtml(post, related), "utf8");
  }

  const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);
  for (let page = 1; page <= totalPages; page += 1) {
    const start = (page - 1) * POSTS_PER_PAGE;
    const slice = posts.slice(start, start + POSTS_PER_PAGE);
    const cards = slice.map(cardMarkup);
    const pager = Array.from({ length: totalPages }, (_, i) => i + 1)
      .map((p) => (p === page ? `<span class="current">${p}</span>` : `<a href="${p === 1 ? "/topics/" : `/topics/page/${p}/`}">${p}</a>`))
      .join("");

    const html = buildListingHtml({
      title: page === 1 ? "كل الموضوعات" : `كل الموضوعات - صفحة ${page}`,
      description: "أرشيف موضوعات محدث تلقائيًا من مصادر متعددة مع روابط داخلية قوية تساعد على الأرشفة.",
      canonical: page === 1 ? `${SITE_URL}/topics/` : `${SITE_URL}/topics/page/${page}/`,
      cards,
      listPosts: slice,
      pager,
      pageNum: page,
      totalPages
    });

    if (page === 1) {
      await fs.writeFile(path.join(topicsDir, "index.html"), html, "utf8");
    } else {
      const pDir = path.join(pagesDir, String(page));
      await ensureDir(pDir);
      await fs.writeFile(path.join(pDir, "index.html"), html, "utf8");
    }
  }

  const homeHtml = buildHomepage(posts);
  await fs.writeFile(path.join(ROOT, "index.html"), homeHtml, "utf8");

  await fs.writeFile(
    path.join(ROOT, "about.html"),
    staticPage({
      title: "من نحن",
      description: "تعرف على منصة شات إيجي للمحتوى العربي.",
      pathName: "/about.html",
      body: `<h1>من نحن</h1><p>شات إيجي منصة محتوى عربي مهيأة لمحركات البحث مع تحديثات يومية وأرشيف منظم.</p><p>نقدم ملخصات تحريرية واضحة مع روابط المصادر الأصلية لمساعدة القارئ على المتابعة الدقيقة.</p>`
    }),
    "utf8"
  );

  await fs.writeFile(
    path.join(ROOT, "privacy.html"),
    staticPage({
      title: "سياسة الخصوصية",
      description: "سياسة الخصوصية لموقع شات إيجي.",
      pathName: "/privacy.html",
      body: `<h1>سياسة الخصوصية</h1><p>قد يستخدم الموقع ملفات تعريف الارتباط وتحليلات الويب لتحسين التجربة.</p><p>عند تشغيل AdSense، قد تستخدم Google ملفات تعريف الارتباط لعرض إعلانات ملائمة.</p><p>لأي استفسار متعلق بالبيانات يمكنك مراسلتنا عبر البريد المنشور في صفحة التواصل.</p>`
    }),
    "utf8"
  );

  await fs.writeFile(
    path.join(ROOT, "terms.html"),
    staticPage({
      title: "الشروط والأحكام",
      description: "الشروط والأحكام الخاصة باستخدام شات إيجي.",
      pathName: "/terms.html",
      body: `<h1>الشروط والأحكام</h1><p>المحتوى المعروض يهدف إلى التلخيص والمتابعة الإخبارية.</p><p>المصدر الأصلي يظل المرجع الأساسي للتفاصيل النهائية.</p><p>يُمنع إساءة استخدام الموقع أو محاولة الوصول غير المصرح به إلى أي جزء منه.</p>`
    }),
    "utf8"
  );

  await fs.writeFile(
    path.join(ROOT, "contact.html"),
    staticPage({
      title: "اتصل بنا",
      description: "وسائل التواصل مع إدارة شات إيجي.",
      pathName: "/contact.html",
      body: `<h1>اتصل بنا</h1><p>للتواصل التجاري أو طلبات الحذف والتصحيح:</p><p><strong>Email:</strong> ${CONTACT_EMAIL}</p><p>سيتم الرد حسب ترتيب الأولوية.</p>`
    }),
    "utf8"
  );

  await fs.writeFile(path.join(ROOT, "404.html"), buildNotFoundHtml(), "utf8");

  await writeFeedXml(posts);
  await writeSitemaps(posts, totalPages);
  await writeRobots();

  return { totalPages };
};

const run = async () => {
  const args = parseArgs();
  console.log(`Mode: ${args.mode}`);
  if (args.mode !== "rebuild") {
    console.log("Fetching RSS feeds...");
  } else {
    console.log("Rebuilding from existing topics.json...");
  }
  const buildResult = await buildPosts(args);
  const basePosts = args.mode === "daily" || args.mode === "rebuild" ? buildResult.posts : applyBackdatedDates(buildResult.posts);
  const posts = basePosts.map((post) => normalizePostRow(post));
  const { totalPages } = await writePages(posts);

  console.log(
    `Done. Posts: ${posts.length}, archive pages: ${totalPages}, mode: ${args.mode}${
      args.mode === "daily"
        ? `, added: ${buildResult.addedCount} (live: ${buildResult.liveCount}, fallback: ${buildResult.fallbackCount})`
        : ""
    }.`
  );
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

