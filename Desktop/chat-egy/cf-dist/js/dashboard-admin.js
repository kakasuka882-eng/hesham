(function () {
  "use strict";

  const DEFAULT_CONFIG = {
    siteUrl: "https://chat-egy.com",
    siteBrand: "شات إيجي",
    siteName: "شات مصر - ايجي شات",
    siteKeywords: "شات ايجي, شات مصر, ايجي شات, chat egy, egy chat, chat-egy",
    contactEmail: "heshammoustafasamar@gmail.com",
    adsenseClient: "ca-pub-4693481683736794",
    homeTitleSuffix: "",
    homeDescription: "موقع موضوعات عربية مهيأ لمحركات البحث مع تحديث يومي تلقائي وروابط مصادر واضحة."
  };

  const SITE_DESCRIPTION = "موجزات عربية محدثة يوميًا مع روابط المصادر الأصلية.";
  const TOPICS_PER_PAGE = 20;
  const FEED_LIMIT = 30;
  const STATIC_SITEMAP_PAGES = [
    { loc: "/", changefreq: "daily", priority: "1" },
    { loc: "/topics/", changefreq: "daily", priority: "0.9" },
    { loc: "/features.html", changefreq: "daily", priority: "0.8" },
    { loc: "/about.html", changefreq: "daily", priority: "0.6" },
    { loc: "/privacy.html", changefreq: "daily", priority: "0.4" },
    { loc: "/terms.html", changefreq: "daily", priority: "0.4" },
    { loc: "/contact.html", changefreq: "daily", priority: "0.5" }
  ];

  const state = {
    currentUser: null,
    projectRoot: "",
    generatorSource: "",
    settings: { ...DEFAULT_CONFIG },
    topics: [],
    selectedSlug: "",
    editorMode: "edit",
    draftTopic: null,
    feedBuildDate: "",
    sitemapCount: 0
  };

  const refs = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    refs.adminLoginView = document.getElementById("adminLoginView");
    refs.adminApp = document.getElementById("adminApp");
    refs.adminLoginForm = document.getElementById("adminLoginForm");
    refs.loginStatusBox = document.getElementById("loginStatusBox");
    refs.reloadProjectBtn = document.getElementById("reloadProjectBtn");
    refs.buildProjectBtn = document.getElementById("buildProjectBtn");
    refs.deployProjectBtn = document.getElementById("deployProjectBtn");
    refs.copyDeployCommandBtn = document.getElementById("copyDeployCommandBtn");
    refs.logoutBtn = document.getElementById("logoutBtn");
    refs.createArticleBtn = document.getElementById("createArticleBtn");
    refs.connectionMetric = document.getElementById("connectionMetric");
    refs.projectPathHint = document.getElementById("projectPathHint");
    refs.topicsCountMetric = document.getElementById("topicsCountMetric");
    refs.lastTopicMetric = document.getElementById("lastTopicMetric");
    refs.feedMetric = document.getElementById("feedMetric");
    refs.sitemapMetric = document.getElementById("sitemapMetric");
    refs.statusBox = document.getElementById("statusBox");
    refs.settingsForm = document.getElementById("settingsForm");
    refs.articleList = document.getElementById("articleList");
    refs.articleSearchInput = document.getElementById("articleSearchInput");
    refs.articleForm = document.getElementById("articleForm");
    refs.articleEditorBody = document.getElementById("articleEditorBody");
    refs.selectedSlugPill = document.getElementById("selectedSlugPill");
    refs.articleEditorTemplate = document.getElementById("articleEditorTemplate");

    refs.adminLoginForm.addEventListener("submit", onAdminLogin);
    refs.reloadProjectBtn.addEventListener("click", reloadProject);
    refs.buildProjectBtn.addEventListener("click", runBuild);
    refs.deployProjectBtn.addEventListener("click", runDeploy);
    refs.copyDeployCommandBtn.addEventListener("click", copyDeployCommand);
    refs.logoutBtn.addEventListener("click", logoutAdmin);
    refs.createArticleBtn.addEventListener("click", startCreateArticle);
    refs.settingsForm.addEventListener("submit", onSaveSettings);
    refs.articleSearchInput.addEventListener("input", renderArticleList);
    refs.articleForm.addEventListener("submit", onSaveArticle);
    refs.articleForm.addEventListener("click", onArticleFormClick);

    fillSettingsForm(state.settings);
    renderArticleList();
    initializeAuthState();
  }

  async function api(action, method = "GET", body = null, params = null) {
    const query = new URLSearchParams({ action });
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          query.set(key, String(value));
        }
      });
    }

    const options = {
      method,
      credentials: "same-origin",
      headers: {}
    };

    if (body !== null) {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`/app-api.php?${query.toString()}`, options);
    const rawText = await response.text();
    let payload = null;

    try {
      payload = rawText ? JSON.parse(rawText) : {};
    } catch (error) {
      if (/<!doctype html/i.test(rawText) || /<html/i.test(rawText)) {
        throw new Error("تم تحميل نسخة قديمة أو غير صحيحة من الداشبورد. حدّث الصفحة بـ Ctrl+F5 ثم حاول مرة أخرى.");
      }
      throw new Error(`استجابة غير صالحة من الخادم: ${rawText.slice(0, 140) || "فارغة"}`);
    }

    if (!response.ok || payload.ok === false) {
      throw new Error(payload.message || "Request failed");
    }
    return payload;
  }

  function setAuthedView(isAuthed) {
    refs.adminLoginView.hidden = isAuthed;
    refs.adminApp.hidden = !isAuthed;
  }

  async function initializeAuthState() {
    setAuthedView(false);
    setLoginStatus("بانتظار التحقق من جلسة الأدمن.", "warn");
    try {
      const payload = await api("admin_auth");
      if (!payload.user) {
        setLoginStatus("سجّل الدخول بحساب الأدمن للمتابعة.", "warn");
        return;
      }
      state.currentUser = payload.user;
      await loadProject();
      setAuthedView(true);
      setLoginStatus("تم التحقق من جلسة الأدمن.", "success");
      setStatus("تم تحميل بيانات المشروع من الخادم بنجاح.", "success");
    } catch (error) {
      setLoginStatus(getErrorMessage(error), "danger");
    }
  }

  async function onAdminLogin(event) {
    event.preventDefault();
    const formData = new FormData(refs.adminLoginForm);
    const username = String(formData.get("username") || "").trim();
    const password = String(formData.get("password") || "");
    try {
      setLoginStatus("جاري تسجيل الدخول...", "warn");
      const payload = await api("admin_login", "POST", { username, password });
      state.currentUser = payload.user || null;
      refs.adminLoginForm.reset();
      await loadProject();
      setAuthedView(true);
      setLoginStatus("تم تسجيل الدخول بنجاح.", "success");
      setStatus("تم تحميل بيانات المشروع من الخادم بنجاح.", "success");
    } catch (error) {
      setLoginStatus(getErrorMessage(error), "danger");
    }
  }

  async function logoutAdmin() {
    try {
      await api("logout", "POST", {});
      state.currentUser = null;
      state.projectRoot = "";
      state.topics = [];
      state.selectedSlug = "";
      state.editorMode = "edit";
      state.draftTopic = null;
      fillSettingsForm(DEFAULT_CONFIG);
      renderArticleList();
      refs.selectedSlugPill.textContent = "لا يوجد اختيار";
      refs.articleEditorBody.innerHTML = '<div class="editor-empty">اختر مقالًا من القائمة اليسرى لعرض بياناته وتعديلها.</div>';
      updateMetrics();
      setAuthedView(false);
      setLoginStatus("تم تسجيل الخروج.", "success");
    } catch (error) {
      setStatus(getErrorMessage(error), "danger");
    }
  }

  async function reloadProject() {
    if (!state.currentUser) {
      setStatus("سجّل الدخول أولًا ثم أعد التحميل.", "warn");
      return;
    }
    try {
      await loadProject();
      setStatus("تمت إعادة تحميل ملفات المشروع من الخادم.", "success");
    } catch (error) {
      setStatus("تعذر إعادة التحميل: " + getErrorMessage(error), "danger");
    }
  }

  async function loadProject() {
    state.projectRoot = "";
    state.generatorSource = await readText("tools/generate-portal.mjs");
    state.settings = parseGeneratorSettings(state.generatorSource);
    fillSettingsForm(state.settings);

    state.topics = sortTopics(JSON.parse(await readText("data/topics.json")));
    state.feedBuildDate = extractFeedBuildDate(await readText("feed.xml"));
    state.sitemapCount = countSitemapUrls(await readText("sitemap.xml"));

    updateMetrics();
    renderArticleList();

    if (state.topics.length) {
      const fallbackSlug = state.selectedSlug && state.topics.some((topic) => topic.slug === state.selectedSlug)
        ? state.selectedSlug
        : state.topics[0].slug;
      selectArticle(fallbackSlug);
    } else {
      state.selectedSlug = "";
      state.editorMode = "edit";
      state.draftTopic = null;
      refs.selectedSlugPill.textContent = "لا يوجد اختيار";
      refs.articleEditorBody.innerHTML = '<div class="editor-empty">لا توجد مقالات داخل الملف الحالي.</div>';
    }
    updateMetrics();
  }

  function parseGeneratorSettings(source) {
    const settings = { ...DEFAULT_CONFIG };
    settings.siteUrl = readConst(source, "SITE_URL", settings.siteUrl);
    settings.siteBrand = readConst(source, "SITE_BRAND", settings.siteBrand);
    settings.siteName = readConst(source, "SITE_NAME", settings.siteName);
    settings.siteKeywords = readConst(source, "SITE_KEYWORDS", settings.siteKeywords);
    settings.contactEmail = readConst(source, "CONTACT_EMAIL", settings.contactEmail);
    settings.adsenseClient = readConst(source, "ADSENSE_CLIENT", settings.adsenseClient);

    const homeMatch = source.match(/title:\s*`\$\{SITE_NAME\} \| ([^`]+)`\s*,\s*description:\s*"([^"]*)",/s);
    if (homeMatch) {
      settings.homeTitleSuffix = homeMatch[1].trim();
      settings.homeDescription = homeMatch[2].trim();
    }
    return settings;
  }

  function readConst(source, name, fallback) {
    const regex = new RegExp(`const ${name} = "([^"]*)";`);
    const match = source.match(regex);
    return match ? match[1] : fallback;
  }

  function fillSettingsForm(settings) {
    setInputValue("siteUrl", settings.siteUrl);
    setInputValue("siteBrand", settings.siteBrand);
    setInputValue("siteName", settings.siteName);
    setInputValue("siteKeywords", settings.siteKeywords);
    setInputValue("contactEmail", settings.contactEmail);
    setInputValue("adsenseClient", settings.adsenseClient);
    setInputValue("homeTitleSuffix", settings.homeTitleSuffix);
    setInputValue("homeDescription", settings.homeDescription);
  }

  function setInputValue(id, value) {
    const input = document.getElementById(id);
    if (input) {
      input.value = value || "";
    }
  }

  function collectSettingsForm() {
    return {
      siteUrl: getFieldValue("siteUrl"),
      siteBrand: getFieldValue("siteBrand"),
      siteName: getFieldValue("siteName"),
      siteKeywords: getFieldValue("siteKeywords"),
      contactEmail: getFieldValue("contactEmail"),
      adsenseClient: getFieldValue("adsenseClient"),
      homeTitleSuffix: getFieldValue("homeTitleSuffix"),
      homeDescription: getFieldValue("homeDescription")
    };
  }

  async function onSaveSettings(event) {
    event.preventDefault();
    if (!state.currentUser) {
      setStatus("سجّل الدخول أولًا حتى أقدر أكتب الملف.", "warn");
      return;
    }

    const nextSettings = collectSettingsForm();
    if (!nextSettings.siteUrl || !nextSettings.siteName || !nextSettings.siteBrand) {
      setStatus("رابط الموقع واسم العلامة واسم الموقع الكامل حقول أساسية.", "warn");
      return;
    }

    try {
      let source = state.generatorSource;
      source = replaceConst(source, "SITE_URL", nextSettings.siteUrl);
      source = replaceConst(source, "SITE_BRAND", nextSettings.siteBrand);
      source = replaceConst(source, "SITE_NAME", nextSettings.siteName);
      source = replaceConst(source, "SITE_KEYWORDS", nextSettings.siteKeywords);
      source = replaceConst(source, "CONTACT_EMAIL", nextSettings.contactEmail);
      source = replaceConst(source, "ADSENSE_CLIENT", nextSettings.adsenseClient);
      source = source.replace(
        /title:\s*`\$\{SITE_NAME\} \| [^`]+`\s*,\s*description:\s*"[^"]*",/s,
        "title: `${SITE_NAME} | " + escapeTemplateLiteral(nextSettings.homeTitleSuffix) + "`,\n    description: " + JSON.stringify(nextSettings.homeDescription) + ","
      );

      await writeText("tools/generate-portal.mjs", source);
      state.generatorSource = source;
      state.settings = { ...nextSettings };

      setStatus("تم حفظ إعدادات المصدر في generate-portal.mjs. يلزم الآن إعادة البناء ثم النشر.", "success");
    } catch (error) {
      setStatus("تعذر حفظ إعدادات المصدر: " + getErrorMessage(error), "danger");
    }
  }

  function replaceConst(source, name, value) {
    const regex = new RegExp(`const ${name} = "([^"]*)";`);
    return source.replace(regex, `const ${name} = ${JSON.stringify(value)};`);
  }

  function renderArticleList() {
    const query = (refs.articleSearchInput.value || "").trim().toLowerCase();
    const fragment = document.createDocumentFragment();
    const filtered = state.topics.filter((topic) => {
      if (!query) {
        return true;
      }
      return [topic.title, topic.category, topic.slug, topic.source_name]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });

    refs.articleList.innerHTML = "";
    if (!filtered.length) {
      refs.articleList.innerHTML = '<div class="editor-empty">لا توجد نتائج مطابقة للبحث الحالي.</div>';
      return;
    }

    filtered.forEach((topic) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "article-item" + (topic.slug === state.selectedSlug ? " active" : "");
      button.dataset.slug = topic.slug;
      button.innerHTML = `
        <strong>${escapeHtml(topic.title)}</strong>
        <div class="article-meta">
          <span>${escapeHtml(topic.slug)}</span>
          <span>${escapeHtml(topic.category || "بدون تصنيف")}</span>
          <span>${escapeHtml(formatDate(topic.published_at))}</span>
        </div>
      `;
      button.addEventListener("click", function () {
        selectArticle(topic.slug);
      });
      fragment.appendChild(button);
    });

    refs.articleList.appendChild(fragment);
  }

  function startCreateArticle() {
    if (!state.currentUser) {
      setStatus("سجّل الدخول أولًا قبل إنشاء مقال جديد.", "warn");
      return;
    }
    state.draftTopic = buildDraftTopic();
    openArticleEditor(state.draftTopic, "create");
    setStatus("تم تجهيز نموذج مقال جديد. املأ الحقول ثم احفظ لإنشاء الصفحة والملفات المرتبطة.", "success");
  }

  function selectArticle(slug) {
    const topic = state.topics.find((entry) => entry.slug === slug);
    if (!topic) {
      return;
    }
    openArticleEditor(topic, "edit");
    renderArticleList();
  }

  function openArticleEditor(topic, mode) {
    state.editorMode = mode;
    state.selectedSlug = mode === "edit" ? topic.slug : "";
    if (mode === "edit") {
      state.draftTopic = null;
    }
    refs.selectedSlugPill.textContent = mode === "create" ? `جديد: ${topic.slug}` : topic.slug;
    refs.articleEditorBody.innerHTML = "";
    refs.articleEditorBody.appendChild(refs.articleEditorTemplate.content.cloneNode(true));

    setInputValue("articleSlug", topic.slug);
    setInputValue("articlePublishedAt", isoToLocalInput(topic.published_at));
    setInputValue("articleTitle", topic.title || "");
    setInputValue("articleExcerpt", topic.excerpt || "");
    setInputValue("articleCategory", topic.category || "");
    setInputValue("articleSourceName", topic.source_name || "");
    setInputValue("articleSourceUrl", topic.source_url || "");
    setInputValue("articleSourceLink", topic.source_link || "");
    const saveButton = document.getElementById("saveArticleBtn");
    const deleteButton = document.getElementById("deleteArticleBtn");
    if (saveButton) {
      saveButton.textContent = mode === "create" ? "إنشاء المقال" : "حفظ المقال";
    }
    if (deleteButton) {
      deleteButton.style.display = mode === "create" ? "none" : "";
    }
  }

  function onArticleFormClick(event) {
    if (event.target && event.target.id === "deleteArticleBtn") {
      event.preventDefault();
      onDeleteArticle();
    }
  }

  async function onSaveArticle(event) {
    event.preventDefault();
    if (event.target.id !== "articleForm") {
      return;
    }
    if (!state.currentUser || !state.selectedSlug) {
      if (state.editorMode !== "create") {
        setStatus("اختر مقالًا بعد تسجيل الدخول أولًا.", "warn");
        return;
      }
    }

    const isCreating = state.editorMode === "create";
    const topic = isCreating
      ? state.draftTopic
      : state.topics.find((entry) => entry.slug === state.selectedSlug);
    if (!topic) {
      setStatus(isCreating ? "تعذر تجهيز بيانات المقال الجديد." : "تعذر إيجاد المقال المحدد داخل الذاكرة الحالية.", "danger");
      return;
    }

    const nextTopic = {
      ...topic,
      title: getFieldValue("articleTitle"),
      excerpt: getFieldValue("articleExcerpt"),
      category: getFieldValue("articleCategory"),
      source_name: getFieldValue("articleSourceName"),
      source_url: getFieldValue("articleSourceUrl"),
      source_link: getFieldValue("articleSourceLink"),
      published_at: localInputToIso(getFieldValue("articlePublishedAt"), topic.published_at),
      updated_at: new Date().toISOString()
    };
    nextTopic.title_key = normalizeTitleKey(nextTopic.title);

    if (!nextTopic.title || !nextTopic.category || !nextTopic.source_name) {
      setStatus("العنوان والتصنيف واسم المصدر حقول أساسية.", "warn");
      return;
    }

    try {
      if (isCreating) {
        addTopicToState(nextTopic);
      } else {
        replaceTopicInState(nextTopic);
      }
      await writeTopicsJson();
      await Promise.all([
        syncArticlePage(nextTopic),
        syncListings(),
        syncFeed(),
        syncSitemap()
      ]);
      updateMetrics();
      state.draftTopic = null;
      selectArticle(nextTopic.slug);
      setStatus(
        isCreating
          ? "تم إنشاء المقال الجديد وتحديث الملفات المرتبطة به داخل المشروع المحلي."
          : "تم حفظ المقال وتحديث الملفات المرتبطة به داخل المشروع المحلي.",
        "success"
      );
    } catch (error) {
      setStatus((isCreating ? "تعذر إنشاء المقال: " : "تعذر حفظ المقال: ") + getErrorMessage(error), "danger");
    }
  }

  async function onDeleteArticle() {
    if (state.editorMode === "create") {
      state.draftTopic = null;
      state.selectedSlug = "";
      state.editorMode = "edit";
      refs.selectedSlugPill.textContent = "لا يوجد اختيار";
      refs.articleEditorBody.innerHTML = '<div class="editor-empty">تم إلغاء إنشاء المقال الجديد قبل الحفظ.</div>';
      return;
    }
    if (!state.currentUser || !state.selectedSlug) {
      setStatus("اختر مقالًا أولًا قبل محاولة حذفه.", "warn");
      return;
    }
    const topic = state.topics.find((entry) => entry.slug === state.selectedSlug);
    if (!topic) {
      return;
    }
    const confirmed = window.confirm(`سيتم حذف المقال "${topic.title}" من ملفات المشروع. هل تريد المتابعة؟`);
    if (!confirmed) {
      return;
    }

    try {
      state.topics = state.topics.filter((entry) => entry.slug !== topic.slug);
      state.selectedSlug = "";
      await writeTopicsJson();
      await removeDirectory(`topics/${topic.slug}`);
      await Promise.all([
        syncListings(),
        syncFeed(),
        syncSitemap()
      ]);
      updateMetrics();
      renderArticleList();
      if (state.topics.length) {
        selectArticle(state.topics[0].slug);
      } else {
        refs.articleEditorBody.innerHTML = '<div class="editor-empty">تم حذف آخر مقال في القائمة الحالية.</div>';
        refs.selectedSlugPill.textContent = "لا يوجد اختيار";
      }
      setStatus("تم حذف المقال من topics.json ومن مجلد الصفحة وتحديث القوائم والـ RSS والخريطة.", "success");
    } catch (error) {
      setStatus("تعذر حذف المقال: " + getErrorMessage(error), "danger");
    }
  }

  function replaceTopicInState(nextTopic) {
    state.topics = state.topics.map((entry) => entry.slug === nextTopic.slug ? nextTopic : entry);
    state.topics = sortTopics(state.topics);
  }

  function addTopicToState(nextTopic) {
    state.topics = state.topics.concat(nextTopic);
    state.topics = sortTopics(state.topics);
  }

  function buildDraftTopic() {
    const identity = getNextTopicIdentity();
    const now = new Date().toISOString();
    return {
      id: identity.id,
      slug: identity.slug,
      title: "",
      excerpt: "",
      category: "",
      source_name: "",
      source_url: "",
      source_link: "",
      published_at: now,
      updated_at: now,
      title_key: ""
    };
  }

  function getNextTopicIdentity() {
    const maxId = state.topics.reduce((max, topic) => Math.max(max, Number(topic.id) || 0), 0);
    let nextId = maxId + 1;
    let nextSlug = formatTopicSlug(nextId);
    while (state.topics.some((topic) => Number(topic.id) === nextId || topic.slug === nextSlug)) {
      nextId += 1;
      nextSlug = formatTopicSlug(nextId);
    }
    return { id: nextId, slug: nextSlug };
  }

  function formatTopicSlug(id) {
    return `post-${String(id).padStart(4, "0")}`;
  }

  async function writeTopicsJson() {
    await writeText("data/topics.json", JSON.stringify(state.topics, null, 2) + "\n");
  }

  async function syncArticlePage(topic) {
    const path = `topics/${topic.slug}/index.html`;
    const html = await getArticleTemplateHtml(path);
    const doc = new DOMParser().parseFromString(html, "text/html");
    const config = state.settings;
    const topicUrl = buildAbsoluteUrl(`/topics/${topic.slug}/`);
    const title = topic.title.trim();
    const excerpt = cleanExcerpt(topic.excerpt);
    const category = topic.category.trim();
    const sourceUrl = topic.source_url.trim() || topic.source_link.trim() || config.siteUrl;
    const fullTitle = `${title} | ${config.siteName}`;

    doc.title = fullTitle;
    setNamedMeta(doc, "description", excerpt);
    setNamedMeta(doc, "keywords", `${config.siteKeywords}, ${category}`);
    setNamedMeta(doc, "author", config.siteBrand);
    setNamedMeta(doc, "twitter:card", "summary_large_image");
    setNamedMeta(doc, "twitter:title", fullTitle);
    setNamedMeta(doc, "twitter:description", excerpt);
    setNamedMeta(doc, "twitter:image", buildAbsoluteUrl("/icons/icon-512.png"));
    setPropertyMeta(doc, "og:type", "article");
    setPropertyMeta(doc, "og:site_name", config.siteName);
    setPropertyMeta(doc, "og:title", fullTitle);
    setPropertyMeta(doc, "og:description", excerpt);
    setPropertyMeta(doc, "og:url", topicUrl);
    setPropertyMeta(doc, "og:image", buildAbsoluteUrl("/icons/icon-512.png"));
    setPropertyMeta(doc, "og:image:alt", fullTitle);
    setPropertyMeta(doc, "article:published_time", topic.published_at);
    setPropertyMeta(doc, "article:modified_time", topic.updated_at);
    setPropertyMeta(doc, "article:section", category);
    setPropertyMeta(doc, "article:author", config.siteName);
    setLinkHref(doc, 'link[rel="canonical"]', topicUrl);
    setLinkHref(doc, 'link[rel="alternate"][hreflang="ar"]', topicUrl);
    setLinkHref(doc, 'link[rel="alternate"][type="application/rss+xml"]', buildAbsoluteUrl("/feed.xml"));

    updateArticleLdJson(doc, topic, excerpt);

    const main = doc.querySelector("main.article");
    if (main) {
      main.innerHTML = buildArticleMainHtml(topic, excerpt);
    }

    const sourceLink = doc.querySelector(".source-link");
    if (sourceLink) {
      sourceLink.setAttribute("href", sourceUrl);
      sourceLink.textContent = topic.source_name;
    }

    await writeText(path, "<!doctype html>\n" + doc.documentElement.outerHTML);
  }

  async function getArticleTemplateHtml(path) {
    try {
      return await readText(path);
    } catch (error) {
      const fallbackTopic = state.topics.find((topic) => topic.slug !== path.split("/")[1]);
      if (fallbackTopic) {
        return readText(`topics/${fallbackTopic.slug}/index.html`);
      }
      throw new Error("لا يوجد قالب مقال جاهز داخل المشروع لإنشاء الصفحة الجديدة.");
    }
  }

  function updateArticleLdJson(doc, topic, excerpt) {
    const config = state.settings;
    const topicUrl = buildAbsoluteUrl(`/topics/${topic.slug}/`);
    const homeUrl = buildAbsoluteUrl("/");
    const topicsUrl = buildAbsoluteUrl("/topics/");
    const scripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));

    scripts.forEach((script) => {
      const raw = script.textContent.trim();
      if (!raw) {
        return;
      }
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (error) {
        return;
      }
      if (parsed["@type"] === "Organization") {
        parsed.name = config.siteName;
        parsed.url = config.siteUrl;
        parsed.logo = buildAbsoluteUrl("/icons/icon-512.png");
      }
      if (parsed["@type"] === "WebPage") {
        parsed.name = `${topic.title} | ${config.siteName}`;
        parsed.description = excerpt;
        parsed.url = topicUrl;
        if (parsed.isPartOf) {
          parsed.isPartOf.name = config.siteBrand;
          parsed.isPartOf.url = config.siteUrl;
        }
      }
      if (parsed["@type"] === "NewsArticle") {
        parsed.headline = topic.title;
        parsed.description = excerpt;
        parsed.url = topicUrl;
        parsed.datePublished = topic.published_at;
        parsed.dateModified = topic.updated_at;
        parsed.inLanguage = "ar";
        parsed.mainEntityOfPage = topicUrl;
        parsed.articleSection = topic.category;
        parsed.author = { "@type": "Organization", name: config.siteName };
        parsed.publisher = {
          "@type": "Organization",
          name: config.siteName,
          logo: { "@type": "ImageObject", url: buildAbsoluteUrl("/icons/icon-512.png") }
        };
        parsed.keywords = `${config.siteKeywords}, ${topic.category}`;
      }
      if (parsed["@type"] === "BreadcrumbList") {
        parsed.itemListElement = [
          { "@type": "ListItem", position: 1, name: "الرئيسية", item: homeUrl },
          { "@type": "ListItem", position: 2, name: "الموضوعات", item: topicsUrl },
          { "@type": "ListItem", position: 3, name: topic.title, item: topicUrl }
        ];
      }
      if (parsed["@type"] === "FAQPage") {
        parsed.mainEntity = buildFaqData(topic);
      }
      script.textContent = JSON.stringify(parsed);
    });
  }

  function buildFaqData(topic) {
    return [
      {
        "@type": "Question",
        name: `ما أهمية خبر "${topic.title}" الآن؟`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `أهمية الخبر أنه يقع ضمن ملف ${topic.category} ويؤثر على المتابعين بشكل مباشر أو غير مباشر، لذلك عرضنا ملخصًا مركزًا مع رابط المصدر.`
        }
      },
      {
        "@type": "Question",
        name: "هل المحتوى هنا بديل عن المصدر الأصلي؟",
        acceptedAnswer: {
          "@type": "Answer",
          text: "لا. هذه الصفحة ملخص تحليلي منظم، والمصدر الأصلي يظل المرجع الأساسي للتفاصيل الكاملة."
        }
      },
      {
        "@type": "Question",
        name: "كيف أتابع التحديثات القادمة لنفس الموضوع؟",
        acceptedAnswer: {
          "@type": "Answer",
          text: "تابع قسم الموضوعات يوميًا، وراجع الرابط الأصلي المدرج داخل الصفحة لأن التحديثات الرسمية تظهر هناك أولًا."
        }
      }
    ];
  }

  function buildArticleMainHtml(topic, excerpt) {
    const related = getRelatedTopics(topic, 6);
    const sourceUrl = topic.source_url || topic.source_link || state.settings.siteUrl;
    return `
      <div class="breadcrumbs"><a href="/">الرئيسية</a> / <a href="/topics/">الموضوعات</a> / ${escapeHtml(topic.category)}</div>
      <h1>${escapeHtml(topic.title)}</h1>
      <p class="lead">${escapeHtml(excerpt)}</p>
      <div class="meta-row">
        <span>التصنيف: ${escapeHtml(topic.category)}</span>
        <span>المصدر: ${escapeHtml(topic.source_name)}</span>
        <time datetime="${escapeAttr(topic.published_at)}">${escapeHtml(formatDate(topic.published_at))}</time>
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

      <p>يتناول هذا التقرير موضوع "${escapeHtml(topic.title)}" من زاوية عملية تساعد القارئ العربي على فهم السياق العام، بعيدًا عن العناوين السريعة. نحن نعتمد على ملخصات المصدر الأصلي، ثم نعيد ترتيب النقاط الأساسية بشكل واضح يبرز ما تغير فعلًا، وما الذي ما زال قيد المتابعة خلال الساعات أو الأيام المقبلة.</p>
      <p>خلفية هذا الملف مرتبطة بتطورات متراكمة داخل محور ${escapeHtml(topic.category)}، لذلك من المهم قراءة الخبر في إطار زمني أوسع. عادةً ما تظهر التفاصيل الدقيقة بعد النشر الأول، مثل التصريحات الرسمية، أو التوضيحات الفنية، أو الأرقام المرتبطة بالتأثير الاقتصادي والاجتماعي، وهو ما يجعل المتابعة المتدرجة أكثر دقة من الانطباع الأول.</p>
      <p>من الناحية العملية، يهتم المتابعون بثلاث نقاط: ماذا حدث الآن، ولماذا حدث، وما التأثير المتوقع على الناس أو السوق أو الجهات المعنية. لهذا السبب نحافظ على عرض متوازن يبتعد عن التهويل، ويعطي القارئ صورة أقرب للواقع، مع الإشارة المستمرة إلى رابط المصدر الأصلي حتى يمكن التحقق من التفاصيل بسهولة.</p>
      <p>قراءة البيانات المتاحة حتى الآن تشير إلى أن الخبر لا يقف عند حد العنوان، بل يمتد إلى نتائج مرتبطة بالقرارات القادمة. قد يتغير إيقاع الحدث سريعًا إذا صدرت معلومات إضافية، لذلك يُنصح بمتابعة المستجدات الرسمية أولًا، ومقارنة أكثر من مصدر قبل اعتماد أي استنتاج نهائي، خاصة في الملفات الحساسة أو المؤثرة على الجمهور.</p>
      <p>إذا كنت تتابع هذا النوع من الأخبار يوميًا، فالأفضل تقسيم التحليل إلى مراحل: مرحلة الخبر الأولي، ثم مرحلة التوضيح، ثم مرحلة الأثر. هذه الطريقة تقلل من التضارب وتساعد في اتخاذ قرار أفضل، سواء كنت مهتمًا بالجانب العام أو بالانعكاس المباشر على العمل أو الدراسة أو التخطيط المالي والشخصي.</p>
      <p>في النهاية، يبقى الهدف من هذا المحتوى تقديم قراءة مفيدة وسريعة ولكن بعمق كافٍ. لذلك نعرض ملخصًا منظمًا، ونضيف عناصر مساعدة مثل النقاط المفتاحية والأسئلة الشائعة والروابط الداخلية لموضوعات قريبة. هذا الأسلوب يدعم تجربة القارئ، وفي الوقت نفسه يقوي بنية الصفحة لمحركات البحث بطريقة سليمة.</p>

      <p>للاطلاع على الخبر الكامل من مصدره الأصلي:</p>
      <p><a class="source-link" rel="nofollow noopener" target="_blank" href="${escapeAttr(sourceUrl)}">${escapeHtml(topic.source_name)}</a></p>

      <section class="faq-box">
        <h2>الأسئلة الشائعة</h2>
        <details><summary>ما أهمية خبر "${escapeHtml(topic.title)}" الآن؟</summary><p>أهميته أنه يقع ضمن ملف ${escapeHtml(topic.category)} ويؤثر على المتابعين بشكل مباشر أو غير مباشر، لذلك عرضنا ملخصًا مركزًا مع رابط المصدر.</p></details>
        <details><summary>هل المحتوى هنا بديل عن المصدر الأصلي؟</summary><p>لا. هذه الصفحة ملخص تحليلي منظم، والمصدر الأصلي يظل المرجع الأساسي للتفاصيل الكاملة.</p></details>
        <details><summary>كيف أتابع التحديثات القادمة لنفس الموضوع؟</summary><p>تابع قسم الموضوعات يوميًا، وراجع الرابط الأصلي المدرج داخل الصفحة لأن التحديثات الرسمية تظهر هناك أولًا.</p></details>
      </section>

      <section class="related-box">
        <h2>موضوعات ذات صلة</h2>
        <ul>${related.map((entry) => `<li><a href="/topics/${escapeAttr(entry.slug)}/">${escapeHtml(entry.title)}</a></li>`).join("")}</ul>
      </section>
    `;
  }

  async function syncListings() {
    const sortedTopics = sortTopics(state.topics);
    const totalPages = Math.max(1, Math.ceil(sortedTopics.length / TOPICS_PER_PAGE));
    const archivePageTemplate = await getArchivePageTemplate();

    await writeListingPage("index.html", sortedTopics.slice(0, TOPICS_PER_PAGE), {
      pageType: "home",
      pageNumber: 1,
      totalPages,
      templatePath: "index.html"
    });

    await writeListingPage("topics/index.html", sortedTopics.slice(0, TOPICS_PER_PAGE), {
      pageType: "archive",
      pageNumber: 1,
      totalPages,
      templatePath: "topics/index.html"
    });

    for (let page = 2; page <= totalPages; page += 1) {
      const pagePath = `topics/page/${page}/index.html`;
      const pageTopics = sortedTopics.slice((page - 1) * TOPICS_PER_PAGE, page * TOPICS_PER_PAGE);
      let templateHtml = archivePageTemplate;
      try {
        templateHtml = await readText(pagePath);
      } catch (error) {
        templateHtml = archivePageTemplate;
      }
      await writeListingPage(pagePath, pageTopics, {
        pageType: "archive",
        pageNumber: page,
        totalPages,
        templateHtml
      });
    }

    await removeExtraArchivePages(totalPages);
  }

  async function getArchivePageTemplate() {
    try {
      return await readText("topics/page/2/index.html");
    } catch (error) {
      return await readText("topics/index.html");
    }
  }

  async function writeListingPage(path, topics, options) {
    const html = options.templateHtml || await readText(options.templatePath);
    const doc = new DOMParser().parseFromString(html, "text/html");
    const grid = doc.querySelector(".grid");
    if (grid) {
      grid.innerHTML = topics.map(renderCardHtml).join("\n");
    }

    updateListingItemListJson(doc, topics);

    if (options.pageType === "home") {
      const topicCountChip = Array.from(doc.querySelectorAll(".hero-kpis span")).find((node) => node.textContent.includes("موضوع"));
      if (topicCountChip) {
        topicCountChip.textContent = `+${state.topics.length} موضوع منشور`;
      }
    } else {
      updateArchivePageHead(doc, options.pageNumber, options.totalPages);
    }

    await writeText(path, "<!doctype html>\n" + doc.documentElement.outerHTML);
  }

  function updateArchivePageHead(doc, pageNumber, totalPages) {
    const suffix = pageNumber > 1 ? ` - صفحة ${pageNumber}` : "";
    doc.title = `كل الموضوعات${suffix}`;
    setNamedMeta(doc, "description", "أرشيف موضوعات محدث تلقائيًا من مصادر متعددة مع روابط داخلية قوية تساعد على الأرشفة.");
    setPropertyMeta(doc, "og:title", doc.title);
    setNamedMeta(doc, "twitter:title", doc.title);
    setPropertyMeta(doc, "og:description", "أرشيف موضوعات محدث تلقائيًا من مصادر متعددة مع روابط داخلية قوية تساعد على الأرشفة.");
    setNamedMeta(doc, "twitter:description", "أرشيف موضوعات محدث تلقائيًا من مصادر متعددة مع روابط داخلية قوية تساعد على الأرشفة.");

    const heroTitle = doc.querySelector(".hero h1");
    if (heroTitle) {
      heroTitle.textContent = pageNumber > 1 ? `كل الموضوعات - صفحة ${pageNumber}` : "كل الموضوعات";
    }

    const canonical = pageNumber > 1 ? buildAbsoluteUrl(`/topics/page/${pageNumber}/`) : buildAbsoluteUrl("/topics/");
    setLinkHref(doc, 'link[rel="canonical"]', canonical);
    setLinkHref(doc, 'link[rel="alternate"][hreflang="ar"]', canonical);

    updateRelLink(doc, "prev", pageNumber > 2 ? `/topics/page/${pageNumber - 1}/` : pageNumber === 2 ? "/topics/" : "");
    updateRelLink(doc, "next", pageNumber < totalPages ? `/topics/page/${pageNumber + 1}/` : "");
  }

  async function removeExtraArchivePages(totalPages) {
    let pageNumber = totalPages + 1;
    while (pageNumber < totalPages + 50) {
      const pagePath = `topics/page/${pageNumber}/index.html`;
      try {
        await readText(pagePath);
      } catch (error) {
        break;
      }
      await removeDirectory(`topics/page/${pageNumber}`);
      pageNumber += 1;
    }
  }

  function updateListingItemListJson(doc, topics) {
    const scripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
    scripts.forEach((script) => {
      const raw = script.textContent.trim();
      if (!raw) {
        return;
      }
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (error) {
        return;
      }
      if (parsed["@type"] === "ItemList") {
        parsed.numberOfItems = topics.length;
        parsed.itemListElement = topics.map((topic, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: buildAbsoluteUrl(`/topics/${topic.slug}/`),
          name: topic.title
        }));
        script.textContent = JSON.stringify(parsed);
      }
    });
  }

  function renderCardHtml(topic) {
    const excerpt = cleanExcerpt(topic.excerpt);
    return `
      <article class="card" data-title="${escapeAttr(topic.title)}" data-category="${escapeAttr(topic.category)}" data-slug="${escapeAttr(topic.slug)}">
        <div class="card-media" aria-hidden="true">
          <span class="card-media-kicker">${escapeHtml(topic.category)}</span>
          <span class="card-media-badge">تحديث متجدد</span>
        </div>
        <div class="card-body">
          <div class="card-top">
            <span class="chip">${escapeHtml(topic.category)}</span>
            <time datetime="${escapeAttr(topic.published_at)}">${escapeHtml(formatDate(topic.published_at))}</time>
          </div>
          <h2><a href="/topics/${escapeAttr(topic.slug)}/">${escapeHtml(topic.title)}</a></h2>
          <p>${escapeHtml(excerpt)}</p>
          <div class="card-actions">
            <span class="source-name">${escapeHtml(topic.source_name)}</span>
            <a class="read-more" href="/topics/${escapeAttr(topic.slug)}/">اقرأ الآن</a>
          </div>
        </div>
      </article>
    `;
  }

  async function syncFeed() {
    const latestTopics = sortTopics(state.topics).slice(0, FEED_LIMIT);
    const itemsXml = latestTopics.map((topic) => {
      return [
        "<item>",
        `  <title><![CDATA[${safeCdata(topic.title)}]]></title>`,
        `  <link>${escapeXml(buildAbsoluteUrl(`/topics/${topic.slug}/`))}</link>`,
        `  <guid>${escapeXml(buildAbsoluteUrl(`/topics/${topic.slug}/`))}</guid>`,
        `  <pubDate>${escapeXml(new Date(topic.published_at).toUTCString())}</pubDate>`,
        `  <description><![CDATA[${safeCdata(cleanExcerpt(topic.excerpt))}]]></description>`,
        "</item>"
      ].join("\n");
    }).join("\n");

    const feedXml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      "<rss version=\"2.0\">",
      "<channel>",
      `  <title><![CDATA[${safeCdata(state.settings.siteName)}]]></title>`,
      `  <link>${escapeXml(state.settings.siteUrl)}</link>`,
      `  <description><![CDATA[${safeCdata(SITE_DESCRIPTION)}]]></description>`,
      "  <language>ar</language>",
      `  <lastBuildDate>${escapeXml(new Date().toUTCString())}</lastBuildDate>`,
      itemsXml,
      "</channel>",
      "</rss>",
      ""
    ].join("\n");

    await writeText("feed.xml", feedXml);
    state.feedBuildDate = new Date().toUTCString();
  }

  async function syncSitemap() {
    const urls = [];
    STATIC_SITEMAP_PAGES.forEach((entry) => {
      urls.push(buildSitemapEntry(buildAbsoluteUrl(entry.loc), currentDate(), entry.changefreq, entry.priority));
    });

    const totalPages = Math.max(1, Math.ceil(state.topics.length / TOPICS_PER_PAGE));
    for (let page = 2; page <= totalPages; page += 1) {
      urls.push(buildSitemapEntry(buildAbsoluteUrl(`/topics/page/${page}/`), currentDate(), "daily", "0.7"));
    }

    sortTopics(state.topics).forEach((topic) => {
      urls.push(buildSitemapEntry(buildAbsoluteUrl(`/topics/${topic.slug}/`), formatDate(topic.updated_at || topic.published_at), "daily", "0.8"));
    });

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      urls.join("\n"),
      "</urlset>",
      ""
    ].join("\n");

    await writeText("sitemap.xml", xml);
    state.sitemapCount = urls.length;
  }

  function buildSitemapEntry(loc, lastmod, changefreq, priority) {
    return [
      "  <url>",
      `    <loc>${escapeXml(loc)}</loc>`,
      `    <lastmod>${escapeXml(lastmod)}</lastmod>`,
      `    <changefreq>${escapeXml(changefreq)}</changefreq>`,
      `    <priority>${escapeXml(priority)}</priority>`,
      "  </url>"
    ].join("\n");
  }

  function getRelatedTopics(topic, limit) {
    const sameCategory = state.topics.filter((entry) => entry.slug !== topic.slug && entry.category === topic.category);
    const fallback = state.topics.filter((entry) => entry.slug !== topic.slug);
    return sortTopics(sameCategory.length ? sameCategory : fallback).slice(0, limit);
  }

  function updateMetrics() {
    refs.connectionMetric.textContent = state.currentUser ? "متصل" : "غير مسجل";
    refs.projectPathHint.textContent = state.currentUser
      ? `الأدمن: ${state.currentUser.username || "admin"} | المشروع: ${state.projectRoot || "الخادم الحالي"}`
      : "سجّل الدخول أولًا للوصول إلى ملفات المشروع";
    refs.topicsCountMetric.textContent = String(state.topics.length);
    refs.lastTopicMetric.textContent = state.topics.length
      ? `آخر تحديث: ${formatDateTime(state.topics[0].updated_at || state.topics[0].published_at)}`
      : "لا توجد بيانات محملة";
    refs.feedMetric.textContent = state.feedBuildDate ? formatDateTime(new Date(state.feedBuildDate).toISOString()) : "-";
    refs.sitemapMetric.textContent = `عدد روابط الخريطة: ${state.sitemapCount}`;
  }

  async function runBuild() {
    if (!state.currentUser) {
      setStatus("سجّل الدخول أولًا قبل تشغيل البناء.", "warn");
      return;
    }
    try {
      setStatus("جاري تشغيل البناء...", "warn");
      const payload = await api("admin_portal_run", "POST", { command: "build" });
      setStatus(`تم البناء بنجاح.\n${payload.output || ""}`.trim(), "success");
    } catch (error) {
      setStatus("تعذر تشغيل البناء: " + getErrorMessage(error), "danger");
    }
  }

  async function runDeploy() {
    if (!state.currentUser) {
      setStatus("سجّل الدخول أولًا قبل تشغيل النشر.", "warn");
      return;
    }
    try {
      setStatus("جاري تشغيل النشر...", "warn");
      const payload = await api("admin_portal_run", "POST", { command: "deploy" });
      setStatus(`تم تشغيل النشر.\n${payload.output || ""}`.trim(), "success");
    } catch (error) {
      setStatus("تعذر تشغيل النشر: " + getErrorMessage(error), "danger");
    }
  }

  function copyDeployCommand() {
    const command = [
      "node tools/prepare-cloudflare-dist.mjs",
      "npx wrangler pages deploy cf-dist --project-name chat-egy --branch main"
    ].join(" && ");
    navigator.clipboard.writeText(command)
      .then(() => setStatus("تم نسخ أوامر البناء والنشر إلى الحافظة.", "success"))
      .catch((error) => setStatus("تعذر نسخ الأوامر: " + getErrorMessage(error), "danger"));
  }

  function sortTopics(topics) {
    return topics.slice().sort((a, b) => {
      const dateA = new Date(a.published_at || 0).getTime();
      const dateB = new Date(b.published_at || 0).getTime();
      if (dateA !== dateB) {
        return dateB - dateA;
      }
      return (b.id || 0) - (a.id || 0);
    });
  }

  function cleanExcerpt(value) {
    return String(value || "")
      .replace(/&nbsp;/gi, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeTitleKey(value) {
    return String(value || "")
      .trim()
      .replace(/[أإآ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ؤ/g, "و")
      .replace(/ئ/g, "ي")
      .replace(/[^\p{L}\p{N}\s]+/gu, " ")
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function escapeTemplateLiteral(value) {
    return String(value || "")
      .replace(/\\/g, "\\\\")
      .replace(/`/g, "\\`")
      .replace(/\$\{/g, "\\${");
  }

  function isoToLocalInput(value) {
    if (!value) {
      return "";
    }
    const date = new Date(value);
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function localInputToIso(value, fallback) {
    if (!value) {
      return fallback || new Date().toISOString();
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return fallback || new Date().toISOString();
    }
    return date.toISOString();
  }

  function formatDate(value) {
    if (!value) {
      return "-";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "-";
    }
    return date.toISOString().slice(0, 10);
  }

  function formatDateTime(value) {
    if (!value) {
      return "-";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "-";
    }
    return new Intl.DateTimeFormat("ar-EG", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function currentDate() {
    return new Date().toISOString().slice(0, 10);
  }

  function countSitemapUrls(xml) {
    try {
      const doc = new DOMParser().parseFromString(xml, "application/xml");
      return doc.getElementsByTagName("url").length;
    } catch (error) {
      return 0;
    }
  }

  function extractFeedBuildDate(xml) {
    try {
      const doc = new DOMParser().parseFromString(xml, "application/xml");
      const node = doc.querySelector("lastBuildDate");
      return node ? node.textContent.trim() : "";
    } catch (error) {
      return "";
    }
  }

  function updateRelLink(doc, rel, href) {
    let link = doc.querySelector(`link[rel="${rel}"]`);
    if (!href) {
      if (link) {
        link.remove();
      }
      return;
    }
    if (!link) {
      link = doc.createElement("link");
      link.setAttribute("rel", rel);
      doc.head.appendChild(link);
    }
    link.setAttribute("href", buildAbsoluteUrl(href));
  }

  function setNamedMeta(doc, name, content) {
    let meta = doc.querySelector(`meta[name="${name}"]`);
    if (!meta) {
      meta = doc.createElement("meta");
      meta.setAttribute("name", name);
      doc.head.appendChild(meta);
    }
    meta.setAttribute("content", content);
  }

  function setPropertyMeta(doc, property, content) {
    let meta = doc.querySelector(`meta[property="${property}"]`);
    if (!meta) {
      meta = doc.createElement("meta");
      meta.setAttribute("property", property);
      doc.head.appendChild(meta);
    }
    meta.setAttribute("content", content);
  }

  function setLinkHref(doc, selector, href) {
    const link = doc.querySelector(selector);
    if (link) {
      link.setAttribute("href", href);
    }
  }

  function setLoginStatus(message, tone) {
    if (!refs.loginStatusBox) {
      return;
    }
    refs.loginStatusBox.innerHTML = `<strong>${tone === "success" ? "تم." : tone === "danger" ? "خطأ." : "معلومة."}</strong> ${escapeHtml(message)}`;
    refs.loginStatusBox.className = "status-box";
    if (tone === "success") {
      refs.loginStatusBox.classList.add("success");
    } else if (tone === "danger") {
      refs.loginStatusBox.classList.add("danger-text");
    }
  }

  async function readText(path) {
    const payload = await api("admin_portal_file", "GET", null, { path });
    if (payload.project_root) {
      state.projectRoot = payload.project_root;
    }
    return String(payload.content || "");
  }

  async function writeText(path, content) {
    const payload = await api("admin_portal_write", "POST", { path, content });
    if (payload.project_root) {
      state.projectRoot = payload.project_root;
    }
  }

  async function removeDirectory(path) {
    await api("admin_portal_remove", "POST", { path });
  }

  function getFieldValue(id) {
    const input = document.getElementById(id);
    return input ? input.value.trim() : "";
  }

  function buildAbsoluteUrl(path) {
    return new URL(path, state.settings.siteUrl.endsWith("/") ? state.settings.siteUrl : state.settings.siteUrl + "/").toString();
  }

  function safeCdata(value) {
    return String(value || "").replace(/]]>/g, "]]]]><![CDATA[>");
  }

  function escapeXml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function getErrorMessage(error) {
    if (!error) {
      return "خطأ غير معروف";
    }
    return error.message || String(error);
  }

  function setStatus(message, tone) {
    refs.statusBox.innerHTML = `<strong>${tone === "success" ? "تم." : tone === "danger" ? "خطأ." : "معلومة."}</strong> ${escapeHtml(message)}`;
    refs.statusBox.className = "status-box";
    if (tone === "success") {
      refs.statusBox.classList.add("success");
    } else if (tone === "danger") {
      refs.statusBox.classList.add("danger-text");
    }
  }
})();
