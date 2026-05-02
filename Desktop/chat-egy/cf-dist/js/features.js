(function () {
  "use strict";

  var STORAGE_KEYS = {
    moodVotes: "features_mood_votes",
    trendBoard: "features_trend_board",
    selectedInterests: "features_selected_interests",
    gameStats: "features_game_stats",
    discussionVotes: "features_discussion_votes"
  };

  var POSITIVE_WORDS = ["نجاح", "تحسن", "فوز", "نمو", "ارتفاع", "تعافي", "توسع", "انجاز", "استقرار", "تعزيز"];
  var NEGATIVE_WORDS = ["ازمه", "أزمة", "خساره", "حرب", "تراجع", "انخفاض", "قلق", "هجوم", "كارثه", "انهيار", "مبالغ", "صدمه"];
  var SENSATIONAL_WORDS = ["كارثه", "كارثة", "صدمه", "صدمة", "مرعب", "يفجر", "فضيحه", "فضيحة", "ناري", "عاجل", "مدوي", "مفاجأه", "مفاجأة"];
  var STOP_WORDS = new Set([
    "في", "من", "على", "الى", "إلى", "عن", "هذا", "هذه", "ذلك", "تلك", "مع", "بعد", "قبل", "بين",
    "كان", "كانت", "كما", "ضمن", "حتى", "ثم", "هو", "هي", "و", "او", "أو", "اذا", "إذا", "كل", "اليوم"
  ]);

  var INTERESTS = [
    { id: "gold", label: "سعر الذهب", keywords: ["ذهب", "عيار", "جنيه", "اسعار", "أسعار"] },
    { id: "jobs", label: "وظائف", keywords: ["وظائف", "تعيين", "فرص", "مرتبات", "رواتب"] },
    { id: "transport", label: "مواصلات", keywords: ["قطار", "مترو", "مواصلات", "محطات", "نقل"] },
    { id: "education", label: "تعليم", keywords: ["تعليم", "مدارس", "جامعة", "امتحان", "طلاب"] },
    { id: "economy", label: "اقتصاد", keywords: ["اقتصاد", "تضخم", "دولار", "سوق", "بورصة"] },
    { id: "sports", label: "رياضة", keywords: ["رياضة", "مباراة", "دوري", "هدف", "لاعب"] },
    { id: "health", label: "صحة", keywords: ["صحة", "مستشفى", "دواء", "علاج", "طبي"] }
  ];

  var htmlDecoder = document.createElement("textarea");
  var ui = {};
  var state = {
    topics: [],
    latest20: [],
    latest60: [],
    clusters: [],
    moodVotes: loadJSON(STORAGE_KEYS.moodVotes, {}),
    trendBoard: loadJSON(STORAGE_KEYS.trendBoard, []),
    selectedInterests: new Set(loadJSON(STORAGE_KEYS.selectedInterests, [])),
    gameStats: loadJSON(STORAGE_KEYS.gameStats, { wins: 0, total: 0 }),
    discussionVotes: loadJSON(STORAGE_KEYS.discussionVotes, {}),
    gameCurrentSlug: ""
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    cacheElements();
    bindTimelineButtons();

    try {
      var topics = await loadTopics();
      if (!topics.length) {
        throw new Error("لم يتم العثور على أخبار صالحة للعرض.");
      }

      state.topics = topics;
      state.latest20 = topics.slice(0, 20);
      state.latest60 = topics.slice(0, 60);
      state.clusters = buildClusters(state.latest60);

      updateStatus("تم تحميل " + state.topics.length + " خبر بنجاح.");
      initMoodMap();
      initTrendChallenge();
      initQuickSummary();
      initCoverageCompare();
      initTimeline();
      initPersonalizedFeed();
      initHeadlineGame();
      initDiscussion();
    } catch (error) {
      updateStatus("تعذر تحميل البيانات: " + (error && error.message ? error.message : "خطأ غير معروف."));
      renderFallbackError();
    }
  }

  function cacheElements() {
    ui.dataStatus = byId("dataStatus");
    ui.moodHeatMap = byId("moodHeatMap");
    ui.moodVoteList = byId("moodVoteList");
    ui.trendName = byId("trendName");
    ui.trendChoices = byId("trendChoices");
    ui.trendStatus = byId("trendStatus");
    ui.trendBoard = byId("trendBoard");
    ui.quickSelect = byId("quickSelect");
    ui.quickSummary = byId("quickSummary");
    ui.compareSelect = byId("compareSelect");
    ui.compareTable = byId("compareTable");
    ui.timelineSelect = byId("timelineSelect");
    ui.timelineTrack = byId("timelineTrack");
    ui.timelinePrev = byId("timelinePrev");
    ui.timelineNext = byId("timelineNext");
    ui.interestChoices = byId("interestChoices");
    ui.personalizedFeed = byId("personalizedFeed");
    ui.gameCard = byId("gameCard");
    ui.gameActions = byId("gameActions");
    ui.gameScore = byId("gameScore");
    ui.discussSelect = byId("discussSelect");
    ui.discussQuestion = byId("discussQuestion");
    ui.discussActions = byId("discussActions");
    ui.discussStats = byId("discussStats");
  }

  function bindTimelineButtons() {
    if (ui.timelinePrev) {
      ui.timelinePrev.addEventListener("click", function () {
        if (ui.timelineTrack) {
          ui.timelineTrack.scrollBy({ left: -290, behavior: "smooth" });
        }
      });
    }
    if (ui.timelineNext) {
      ui.timelineNext.addEventListener("click", function () {
        if (ui.timelineTrack) {
          ui.timelineTrack.scrollBy({ left: 290, behavior: "smooth" });
        }
      });
    }
  }

  async function loadTopics() {
    var listA = await fetchCards("/topics/");
    var listB = await fetchCards("/");
    var merged = mergeTopics(listA.concat(listB));
    return merged
      .filter(function (item) { return item.slug && item.title; })
      .sort(function (a, b) { return b.publishedTs - a.publishedTs; });
  }

  async function fetchCards(url) {
    try {
      var response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        return [];
      }
      var html = await response.text();
      var doc = new DOMParser().parseFromString(html, "text/html");
      var cards = Array.prototype.slice.call(doc.querySelectorAll("article.card"));
      return cards.map(function (card, index) {
        var link = card.querySelector("h2 a");
        var href = link ? String(link.getAttribute("href") || "") : "";
        var slug = String(card.getAttribute("data-slug") || extractSlug(href) || ("card-" + index));
        var title = cleanText(card.getAttribute("data-title") || textOf(link));
        var excerpt = cleanText(textOf(card.querySelector("p")));
        var category = cleanText(card.getAttribute("data-category") || textOf(card.querySelector(".chip")) || "عام");
        var source = cleanText(textOf(card.querySelector(".source-name")) || "مصدر غير معروف");
        var timeNode = card.querySelector("time");
        var datetime = String((timeNode && timeNode.getAttribute("datetime")) || "");
        var dateText = cleanText(textOf(timeNode));
        var ts = Date.parse(datetime) || Date.parse(dateText) || 0;
        return {
          slug: slug,
          title: title,
          excerpt: excerpt,
          category: category,
          source: source,
          publishedAt: datetime || dateText,
          publishedTs: ts,
          tokens: tokenize(title + " " + excerpt),
          normalized: normalizeArabic(title + " " + excerpt)
        };
      });
    } catch (error) {
      return [];
    }
  }

  function mergeTopics(items) {
    var bySlug = new Map();
    items.forEach(function (item) {
      if (!item || !item.slug) {
        return;
      }
      if (!bySlug.has(item.slug)) {
        bySlug.set(item.slug, item);
      } else {
        var current = bySlug.get(item.slug);
        if ((item.publishedTs || 0) > (current.publishedTs || 0)) {
          bySlug.set(item.slug, item);
        }
      }
    });
    return Array.from(bySlug.values());
  }

  function initMoodMap() {
    renderMoodMap();
    renderMoodVoteList();

    if (ui.moodVoteList) {
      ui.moodVoteList.addEventListener("click", function (event) {
        var btn = event.target.closest("button[data-slug][data-mood]");
        if (!btn) {
          return;
        }
        var slug = btn.getAttribute("data-slug");
        var mood = Number(btn.getAttribute("data-mood"));
        var current = Number(state.moodVotes[slug]);

        if (current === mood) {
          delete state.moodVotes[slug];
        } else {
          state.moodVotes[slug] = mood;
        }

        saveJSON(STORAGE_KEYS.moodVotes, state.moodVotes);
        renderMoodMap();
        renderMoodVoteList();
      });
    }
  }

  function renderMoodMap() {
    if (!ui.moodHeatMap) {
      return;
    }

    var byCategory = {};
    state.latest20.forEach(function (item) {
      if (!byCategory[item.category]) {
        byCategory[item.category] = [];
      }
      var mood = Object.prototype.hasOwnProperty.call(state.moodVotes, item.slug)
        ? Number(state.moodVotes[item.slug])
        : autoMood(item.title + " " + item.excerpt);
      byCategory[item.category].push(mood);
    });

    var rows = Object.keys(byCategory).map(function (cat) {
      var values = byCategory[cat];
      var score = values.reduce(function (sum, value) { return sum + value; }, 0) / (values.length || 1);
      return { category: cat, score: score, count: values.length };
    }).sort(function (a, b) {
      return b.count - a.count;
    });

    if (!rows.length) {
      ui.moodHeatMap.innerHTML = "<p class='muted'>لا توجد بيانات مزاج متاحة.</p>";
      return;
    }

    ui.moodHeatMap.innerHTML = rows.map(function (row) {
      var pct = Math.round(Math.abs(row.score) * 100);
      var moodLabel = row.score > 0.2 ? "إيجابي" : row.score < -0.2 ? "قلق" : "محايد";
      var color = row.score >= 0 ? "#3ad39f" : "#ff8d8d";
      return (
        "<div class='mood-row'>" +
        "<div class='mood-top'><span>" + escapeHtml(row.category) + " (" + row.count + ")</span><span>" + moodLabel + "</span></div>" +
        "<div class='mood-bar'><div class='mood-fill' style='width:" + pct + "%;background:" + color + ";'></div></div>" +
        "</div>"
      );
    }).join("");
  }

  function renderMoodVoteList() {
    if (!ui.moodVoteList) {
      return;
    }

    var items = state.latest20.slice(0, 12);
    ui.moodVoteList.innerHTML = items.map(function (item) {
      var current = Number(state.moodVotes[item.slug] || 0);
      return (
        "<div class='mood-vote-item'>" +
        "<p><a href='/topics/" + escapeHtml(item.slug) + "/'>" + escapeHtml(truncate(item.title, 96)) + "</a></p>" +
        "<div class='emoji-row'>" +
        moodButton(item.slug, 1, "😊", current) +
        moodButton(item.slug, 0, "😐", current) +
        moodButton(item.slug, -1, "😟", current) +
        "</div>" +
        "</div>"
      );
    }).join("");
  }

  function moodButton(slug, mood, label, current) {
    var active = current === mood ? "active" : "";
    return "<button type='button' class='" + active + "' data-slug='" + escapeHtml(slug) + "' data-mood='" + mood + "'>" + label + "</button>";
  }

  function initTrendChallenge() {
    if (!ui.trendChoices || !ui.trendBoard || !ui.trendStatus) {
      return;
    }

    var counts = categoryCounts();
    var categories = Array.from(counts.entries()).sort(function (a, b) { return b[1] - a[1]; });
    var actual = categories.length ? categories[0][0] : "";

    ui.trendChoices.innerHTML = categories.slice(0, 6).map(function (row) {
      return "<button type='button' data-category='" + escapeHtml(row[0]) + "'>" + escapeHtml(row[0]) + " (" + row[1] + ")</button>";
    }).join("");

    ui.trendChoices.addEventListener("click", function (event) {
      var btn = event.target.closest("button[data-category]");
      if (!btn) {
        return;
      }
      var guess = btn.getAttribute("data-category");
      setActive(ui.trendChoices.querySelectorAll("button"), btn);
      updateTrendBoard(guess, actual);
    });

    renderTrendBoard();
    ui.trendStatus.innerHTML = "<p class='muted'>توقّع القسم الأعلى نشاطًا خلال 24 ساعة. الصحيح الحالي: <strong>" + escapeHtml(actual || "لا بيانات") + "</strong></p>";
  }

  function updateTrendBoard(guess, actual) {
    var name = cleanText((ui.trendName && ui.trendName.value) || "") || "ضيف";
    var hit = guess === actual;
    var board = state.trendBoard.slice();
    var entry = board.find(function (row) { return row.name === name; });

    if (!entry) {
      entry = { name: name, points: 0, played: 0, wins: 0 };
      board.push(entry);
    }

    entry.points += hit ? 10 : 2;
    entry.played += 1;
    if (hit) {
      entry.wins += 1;
    }

    board.sort(function (a, b) {
      if (b.points === a.points) {
        return b.wins - a.wins;
      }
      return b.points - a.points;
    });

    state.trendBoard = board.slice(0, 25);
    saveJSON(STORAGE_KEYS.trendBoard, state.trendBoard);

    ui.trendStatus.innerHTML =
      "<p><strong>اختيارك:</strong> " + escapeHtml(guess) + " | <strong>النتيجة:</strong> " + escapeHtml(actual || "لا بيانات") + "</p>" +
      "<p class='muted'>" + (hit ? "توقع ممتاز! +10 نقاط." : "محاولة جيدة +2 نقاط.") + "</p>";

    renderTrendBoard();
  }

  function renderTrendBoard() {
    if (!ui.trendBoard) {
      return;
    }
    if (!state.trendBoard.length) {
      ui.trendBoard.innerHTML = "<li class='muted'>لا يوجد ترتيب بعد.</li>";
      return;
    }

    ui.trendBoard.innerHTML = state.trendBoard.slice(0, 10).map(function (row) {
      var accuracy = row.played ? Math.round((row.wins / row.played) * 100) : 0;
      return "<li><strong>" + escapeHtml(row.name) + "</strong> - " + row.points + " نقطة (" + accuracy + "%)</li>";
    }).join("");
  }

  function initQuickSummary() {
    if (!ui.quickSelect || !ui.quickSummary) {
      return;
    }

    ui.quickSelect.innerHTML = state.latest20.map(function (item) {
      return "<option value='" + escapeHtml(item.slug) + "'>" + escapeHtml(truncate(item.title, 92)) + "</option>";
    }).join("");

    ui.quickSelect.addEventListener("change", function () {
      renderQuickSummary(ui.quickSelect.value);
    });

    if (state.latest20.length) {
      ui.quickSelect.value = state.latest20[0].slug;
      renderQuickSummary(state.latest20[0].slug);
    }
  }

  function renderQuickSummary(slug) {
    var item = state.latest20.find(function (x) { return x.slug === slug; });
    if (!item) {
      ui.quickSummary.innerHTML = "<p class='muted'>اختر خبرًا لعرض الملخص.</p>";
      return;
    }

    var keyword = topKeyword(item.title + " " + item.excerpt);
    var question = followupQuestion(item.category);
    var sentence1 = "الخبر يتناول: " + truncate(item.title, 80) + ".";
    var sentence2 = "التصنيف: " + item.category + " | المصدر: " + item.source + " | النشر: " + formatDate(item.publishedTs) + ".";
    var sentence3 = item.excerpt ? truncate(item.excerpt, 120) + "." : "تفاصيل مختصرة متاحة عبر الرابط الأصلي للخبر.";

    ui.quickSummary.innerHTML =
      "<ul>" +
      "<li>" + escapeHtml(sentence1) + "</li>" +
      "<li>" + escapeHtml(sentence2) + "</li>" +
      "<li>" + escapeHtml(sentence3) + "</li>" +
      "</ul>" +
      "<p><strong>الكلمة المفتاحية:</strong> " + escapeHtml(keyword || "غير متاحة") + "</p>" +
      "<p><strong>سؤال متابعة:</strong> " + escapeHtml(question) + "</p>" +
      "<p><a href='/topics/" + escapeHtml(item.slug) + "/'>قراءة الخبر الكامل</a></p>";
  }

  function initCoverageCompare() {
    if (!ui.compareSelect || !ui.compareTable) {
      return;
    }

    var clusters = getComparableClusters();
    if (!clusters.length) {
      ui.compareTable.innerHTML = "<p class='muted'>لا توجد مجموعة أخبار متشابهة من أكثر من مصدر حاليًا.</p>";
      return;
    }

    ui.compareSelect.innerHTML = clusters.map(function (cluster) {
      return "<option value='" + cluster.id + "'>" + escapeHtml(cluster.label) + " (" + cluster.items.length + ")</option>";
    }).join("");

    ui.compareSelect.addEventListener("change", function () {
      renderCoverageCompare(ui.compareSelect.value);
    });

    ui.compareSelect.value = String(clusters[0].id);
    renderCoverageCompare(clusters[0].id);
  }

  function renderCoverageCompare(clusterId) {
    var clusters = getComparableClusters();
    var cluster = clusters.find(function (c) { return String(c.id) === String(clusterId); });
    if (!cluster) {
      ui.compareTable.innerHTML = "<p class='muted'>لا يمكن عرض المقارنة الآن.</p>";
      return;
    }

    var scored = cluster.items.map(function (item) {
      var words = tokenize(item.title).length;
      var sensationalCount = countKeyword(item.title, SENSATIONAL_WORDS);
      var clarity = clamp(100 - Math.abs(words - 11) * 6, 40, 96);
      var neutrality = clamp(98 - sensationalCount * 18, 35, 98);
      var detail = clamp(50 + Math.min(item.excerpt.length, 220) / 220 * 50, 50, 100);
      var score = Math.round(clarity * 0.4 + neutrality * 0.35 + detail * 0.25);
      return {
        source: item.source,
        clarity: clarity,
        neutrality: neutrality,
        detail: detail,
        score: score,
        slug: item.slug
      };
    }).sort(function (a, b) {
      return b.score - a.score;
    });

    ui.compareTable.innerHTML =
      "<table class='compare-table'>" +
      "<thead><tr><th>المصدر</th><th>الوضوح</th><th>الحياد</th><th>التفاصيل</th><th>النتيجة</th></tr></thead>" +
      "<tbody>" +
      scored.map(function (row) {
        return "<tr>" +
          "<td><a href='/topics/" + escapeHtml(row.slug) + "/'>" + escapeHtml(row.source) + "</a></td>" +
          "<td>" + row.clarity + "</td>" +
          "<td>" + row.neutrality + "</td>" +
          "<td>" + row.detail + "</td>" +
          "<td><span class='score-pill'>" + row.score + "</span></td>" +
          "</tr>";
      }).join("") +
      "</tbody></table>";
  }

  function initTimeline() {
    if (!ui.timelineSelect || !ui.timelineTrack) {
      return;
    }

    var timelineClusters = getTimelineClusters();
    if (!timelineClusters.length) {
      ui.timelineTrack.innerHTML = "<p class='muted'>لا توجد سلاسل زمنية متاحة حاليًا.</p>";
      return;
    }

    ui.timelineSelect.innerHTML = timelineClusters.map(function (cluster) {
      return "<option value='" + cluster.id + "'>" + escapeHtml(cluster.label) + "</option>";
    }).join("");

    ui.timelineSelect.addEventListener("change", function () {
      renderTimeline(ui.timelineSelect.value);
    });

    ui.timelineSelect.value = String(timelineClusters[0].id);
    renderTimeline(timelineClusters[0].id);
  }

  function renderTimeline(clusterId) {
    var cluster = getTimelineClusters().find(function (row) {
      return String(row.id) === String(clusterId);
    });

    if (!cluster) {
      ui.timelineTrack.innerHTML = "<p class='muted'>لا يمكن عرض الخط الزمني الآن.</p>";
      return;
    }

    ui.timelineTrack.innerHTML = cluster.items.map(function (item) {
      return (
        "<article class='timeline-card'>" +
        "<time datetime='" + escapeHtml(item.publishedAt) + "'>" + formatDate(item.publishedTs) + "</time>" +
        "<a href='/topics/" + escapeHtml(item.slug) + "/'>" + escapeHtml(item.title) + "</a>" +
        "<p class='muted'>" + escapeHtml(item.source) + " | " + escapeHtml(item.category) + "</p>" +
        "</article>"
      );
    }).join("");

    ui.timelineTrack.scrollTo({ left: 0, behavior: "auto" });
  }

  function initPersonalizedFeed() {
    if (!ui.interestChoices || !ui.personalizedFeed) {
      return;
    }

    ui.interestChoices.innerHTML = INTERESTS.map(function (interest) {
      var active = state.selectedInterests.has(interest.id) ? "active" : "";
      return "<button type='button' class='" + active + "' data-interest='" + interest.id + "'>" + escapeHtml(interest.label) + "</button>";
    }).join("");

    ui.interestChoices.addEventListener("click", function (event) {
      var btn = event.target.closest("button[data-interest]");
      if (!btn) {
        return;
      }
      var id = btn.getAttribute("data-interest");
      if (state.selectedInterests.has(id)) {
        state.selectedInterests.delete(id);
        btn.classList.remove("active");
      } else {
        state.selectedInterests.add(id);
        btn.classList.add("active");
      }
      saveJSON(STORAGE_KEYS.selectedInterests, Array.from(state.selectedInterests));
      renderPersonalizedFeed();
    });

    renderPersonalizedFeed();
  }

  function renderPersonalizedFeed() {
    var selected = INTERESTS.filter(function (interest) {
      return state.selectedInterests.has(interest.id);
    });

    if (!selected.length) {
      ui.personalizedFeed.innerHTML = "<p class='muted'>اختر اهتمامًا واحدًا على الأقل لبناء الفيد الشخصي.</p>";
      return;
    }

    var scored = state.latest60.map(function (item) {
      var norm = item.normalized;
      var matched = [];
      selected.forEach(function (interest) {
        if (interest.keywords.some(function (key) { return norm.indexOf(normalizeArabic(key)) >= 0; })) {
          matched.push(interest.label);
        }
      });
      return { item: item, score: matched.length, tags: matched };
    }).filter(function (row) {
      return row.score > 0;
    }).sort(function (a, b) {
      if (b.score === a.score) {
        return b.item.publishedTs - a.item.publishedTs;
      }
      return b.score - a.score;
    });

    if (!scored.length) {
      ui.personalizedFeed.innerHTML = "<p class='muted'>لا يوجد تطابق مباشر الآن مع اهتماماتك المختارة.</p>";
      return;
    }

    ui.personalizedFeed.innerHTML = scored.slice(0, 12).map(function (row) {
      return (
        "<div class='feed-item'>" +
        "<p><a href='/topics/" + escapeHtml(row.item.slug) + "/'>" + escapeHtml(row.item.title) + "</a></p>" +
        "<p class='muted'>يطابق: " + escapeHtml(row.tags.join(" - ")) + "</p>" +
        "</div>"
      );
    }).join("");
  }

  function initHeadlineGame() {
    if (!ui.gameCard || !ui.gameActions || !ui.gameScore) {
      return;
    }

    ui.gameActions.addEventListener("click", function (event) {
      var btn = event.target.closest("button[data-action]");
      if (!btn) {
        return;
      }

      var action = btn.getAttribute("data-action");
      if (action === "next") {
        nextHeadlineRound();
        return;
      }

      if (!state.gameCurrentSlug) {
        return;
      }

      evaluateHeadlineAnswer(action);
    });

    nextHeadlineRound();
    renderGameScore();
  }

  function nextHeadlineRound() {
    var pool = state.latest60.length ? state.latest60 : state.latest20;
    if (!pool.length) {
      ui.gameCard.innerHTML = "<p class='muted'>لا توجد عناوين للعبة الآن.</p>";
      ui.gameActions.innerHTML = "";
      return;
    }

    var picked = pool[Math.floor(Math.random() * pool.length)];
    state.gameCurrentSlug = picked.slug;

    ui.gameCard.innerHTML =
      "<p class='game-headline'>" + escapeHtml(picked.title) + "</p>" +
      "<p class='game-meta'>" + escapeHtml(picked.source) + " | " + escapeHtml(picked.category) + "</p>";

    ui.gameActions.innerHTML =
      "<button type='button' data-action='accurate'>صح</button>" +
      "<button type='button' data-action='exaggerated'>مبالغ</button>";
  }

  function evaluateHeadlineAnswer(action) {
    var item = state.latest60.find(function (row) { return row.slug === state.gameCurrentSlug; });
    if (!item) {
      return;
    }

    var expected = isSensational(item.title) ? "exaggerated" : "accurate";
    var correct = action === expected;

    state.gameStats.total += 1;
    if (correct) {
      state.gameStats.wins += 1;
    }
    saveJSON(STORAGE_KEYS.gameStats, state.gameStats);

    ui.gameCard.innerHTML +=
      "<p><strong>" + (correct ? "إجابة صحيحة." : "إجابة غير دقيقة.") + "</strong></p>" +
      "<p class='muted'>التقييم المرجعي: " + (expected === "exaggerated" ? "عنوان مبالغ" : "عنوان منطقي") + "</p>";

    ui.gameActions.innerHTML = "<button type='button' data-action='next'>جولة جديدة</button>";
    renderGameScore();
  }

  function renderGameScore() {
    var total = state.gameStats.total || 0;
    var wins = state.gameStats.wins || 0;
    var rate = total ? Math.round((wins / total) * 100) : 0;
    ui.gameScore.innerHTML = "<p><strong>نتيجتك:</strong> " + wins + "/" + total + " (" + rate + "%)</p>";
  }

  function initDiscussion() {
    if (!ui.discussSelect || !ui.discussQuestion || !ui.discussActions || !ui.discussStats) {
      return;
    }

    ui.discussSelect.innerHTML = state.latest20.map(function (item) {
      return "<option value='" + escapeHtml(item.slug) + "'>" + escapeHtml(truncate(item.title, 88)) + "</option>";
    }).join("");

    ui.discussSelect.addEventListener("change", function () {
      renderDiscussion(ui.discussSelect.value);
    });

    ui.discussActions.addEventListener("click", function (event) {
      var btn = event.target.closest("button[data-vote]");
      if (!btn) {
        return;
      }
      var slug = ui.discussSelect.value;
      var vote = btn.getAttribute("data-vote");
      if (!state.discussionVotes[slug]) {
        state.discussionVotes[slug] = { agree: 0, neutral: 0, disagree: 0 };
      }
      state.discussionVotes[slug][vote] += 1;
      saveJSON(STORAGE_KEYS.discussionVotes, state.discussionVotes);
      renderDiscussionStats(slug);
    });

    if (state.latest20.length) {
      ui.discussSelect.value = state.latest20[0].slug;
      renderDiscussion(state.latest20[0].slug);
    }
  }

  function renderDiscussion(slug) {
    var item = state.latest20.find(function (x) { return x.slug === slug; });
    if (!item) {
      ui.discussQuestion.innerHTML = "<p class='muted'>اختر موضوعًا أولًا.</p>";
      return;
    }

    ui.discussQuestion.innerHTML =
      "<p><strong>سؤال النقاش:</strong> " + escapeHtml(discussionQuestion(item)) + "</p>" +
      "<p class='muted'><a href='/topics/" + escapeHtml(item.slug) + "/'>رابط الموضوع</a></p>";

    ui.discussActions.innerHTML =
      "<button type='button' data-vote='agree'>موافق</button>" +
      "<button type='button' data-vote='neutral'>مش متأكد</button>" +
      "<button type='button' data-vote='disagree'>رافض</button>";

    renderDiscussionStats(slug);
  }

  function renderDiscussionStats(slug) {
    var bucket = state.discussionVotes[slug] || { agree: 0, neutral: 0, disagree: 0 };
    var total = bucket.agree + bucket.neutral + bucket.disagree;
    var agreePct = total ? Math.round((bucket.agree / total) * 100) : 0;
    var neutralPct = total ? Math.round((bucket.neutral / total) * 100) : 0;
    var disagreePct = total ? Math.round((bucket.disagree / total) * 100) : 0;

    ui.discussStats.innerHTML =
      "<div class='poll-stats'>" +
      "<div class='poll-row'><span>موافق</span><strong>" + bucket.agree + " (" + agreePct + "%)</strong></div>" +
      "<div class='poll-row'><span>مش متأكد</span><strong>" + bucket.neutral + " (" + neutralPct + "%)</strong></div>" +
      "<div class='poll-row'><span>رافض</span><strong>" + bucket.disagree + " (" + disagreePct + "%)</strong></div>" +
      "</div>";
  }

  function getComparableClusters() {
    return state.clusters
      .filter(function (cluster) {
        return uniqueCount(cluster.items.map(function (item) { return item.source; })) >= 2;
      })
      .map(function (cluster) {
        return {
          id: cluster.id,
          label: truncate(cluster.items[cluster.items.length - 1].title, 70),
          items: cluster.items.slice()
        };
      });
  }

  function getTimelineClusters() {
    if (state.clusters.length) {
      return state.clusters.map(function (cluster) {
        return {
          id: cluster.id,
          label: truncate(cluster.items[cluster.items.length - 1].title, 72),
          items: cluster.items.slice().sort(function (a, b) { return a.publishedTs - b.publishedTs; })
        };
      });
    }

    var categories = {};
    state.latest20.forEach(function (item) {
      if (!categories[item.category]) {
        categories[item.category] = [];
      }
      categories[item.category].push(item);
    });

    return Object.keys(categories)
      .filter(function (key) { return categories[key].length >= 2; })
      .map(function (key, index) {
        return {
          id: "cat-" + index,
          label: key + " (" + categories[key].length + ")",
          items: categories[key].slice().sort(function (a, b) { return a.publishedTs - b.publishedTs; })
        };
      });
  }

  function buildClusters(items) {
    var list = items.slice(0, 60);
    if (list.length < 2) {
      return [];
    }

    var parent = list.map(function (_, index) { return index; });

    function find(x) {
      if (parent[x] !== x) {
        parent[x] = find(parent[x]);
      }
      return parent[x];
    }

    function unite(a, b) {
      var ra = find(a);
      var rb = find(b);
      if (ra !== rb) {
        parent[rb] = ra;
      }
    }

    for (var i = 0; i < list.length; i += 1) {
      for (var j = i + 1; j < list.length; j += 1) {
        var sim = jaccard(list[i].tokens, list[j].tokens);
        if (sim >= 0.34 || strongTitleMatch(list[i].title, list[j].title)) {
          unite(i, j);
        }
      }
    }

    var groups = {};
    list.forEach(function (_, index) {
      var root = find(index);
      if (!groups[root]) {
        groups[root] = [];
      }
      groups[root].push(list[index]);
    });

    var clusterId = 1;
    return Object.keys(groups)
      .map(function (key) {
        return groups[key].sort(function (a, b) { return a.publishedTs - b.publishedTs; });
      })
      .filter(function (group) {
        return group.length >= 2;
      })
      .map(function (group) {
        return { id: clusterId++, items: group };
      })
      .sort(function (a, b) {
        return b.items.length - a.items.length;
      });
  }

  function renderFallbackError() {
    var ids = [
      ui.moodHeatMap, ui.moodVoteList, ui.trendStatus, ui.trendBoard, ui.quickSummary,
      ui.compareTable, ui.timelineTrack, ui.personalizedFeed, ui.gameCard, ui.discussQuestion, ui.discussStats
    ];
    ids.forEach(function (node) {
      if (node) {
        node.innerHTML = "<p class='muted'>تعذر عرض هذه الميزة الآن.</p>";
      }
    });
  }

  function categoryCounts() {
    var counts = new Map();
    state.latest20.forEach(function (item) {
      counts.set(item.category, (counts.get(item.category) || 0) + 1);
    });
    return counts;
  }

  function autoMood(text) {
    var norm = normalizeArabic(text);
    var pos = countKeyword(norm, POSITIVE_WORDS);
    var neg = countKeyword(norm, NEGATIVE_WORDS);
    if (pos > neg) {
      return 1;
    }
    if (neg > pos) {
      return -1;
    }
    return 0;
  }

  function isSensational(text) {
    return countKeyword(text, SENSATIONAL_WORDS) > 0;
  }

  function discussionQuestion(item) {
    var category = normalizeArabic(item.category);
    if (category.indexOf("اقتصاد") >= 0) {
      return "برأيك هذا الخبر هيأثر على الأسعار خلال الأيام الجاية؟";
    }
    if (category.indexOf("رياض") >= 0) {
      return "هل تتوقع استمرار نفس الأداء في الجولة القادمة؟";
    }
    if (category.indexOf("مصر") >= 0 || category.indexOf("قاهره") >= 0) {
      return "هل القرار أو الحدث ده له تأثير مباشر على حياتك اليومية؟";
    }
    return "هل تعتبر الخبر ده مهم فعلا للمتابعة الآن؟";
  }

  function followupQuestion(category) {
    var norm = normalizeArabic(category);
    if (norm.indexOf("اقتصاد") >= 0) {
      return "ما الأثر المتوقع على الأسعار والدخل خلال الفترة القادمة؟";
    }
    if (norm.indexOf("رياض") >= 0) {
      return "ما العامل الذي حسم النتيجة في رأيك؟";
    }
    if (norm.indexOf("مصر") >= 0 || norm.indexOf("قاهره") >= 0) {
      return "كيف ينعكس هذا الخبر على الخدمات أو الحياة اليومية؟";
    }
    return "ما أهم نقطة تحتاج متابعة في هذا الملف؟";
  }

  function topKeyword(text) {
    var words = tokenize(text);
    var freq = {};
    words.forEach(function (word) {
      freq[word] = (freq[word] || 0) + 1;
    });
    var sorted = Object.keys(freq).sort(function (a, b) { return freq[b] - freq[a]; });
    return sorted.length ? sorted[0] : "";
  }

  function strongTitleMatch(a, b) {
    var na = normalizeArabic(a);
    var nb = normalizeArabic(b);
    if (!na || !nb) {
      return false;
    }
    return na === nb || na.indexOf(nb) >= 0 || nb.indexOf(na) >= 0;
  }

  function jaccard(tokensA, tokensB) {
    if (!tokensA.length || !tokensB.length) {
      return 0;
    }
    var setA = new Set(tokensA);
    var setB = new Set(tokensB);
    var inter = 0;
    setA.forEach(function (token) {
      if (setB.has(token)) {
        inter += 1;
      }
    });
    return inter / (setA.size + setB.size - inter);
  }

  function countKeyword(text, list) {
    var norm = normalizeArabic(text);
    return list.reduce(function (sum, key) {
      return sum + (norm.indexOf(normalizeArabic(key)) >= 0 ? 1 : 0);
    }, 0);
  }

  function tokenize(text) {
    return normalizeArabic(text).split(/\s+/).filter(function (word) {
      return word.length > 2 && !STOP_WORDS.has(word);
    });
  }

  function normalizeArabic(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[إأآا]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ؤ/g, "و")
      .replace(/ئ/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/[\u064B-\u065F\u0670]/g, "")
      .replace(/[^0-9a-zA-Z\u0600-\u06FF\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function cleanText(value) {
    if (!value) {
      return "";
    }
    htmlDecoder.innerHTML = String(value);
    return htmlDecoder.value
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function truncate(text, maxLen) {
    var str = String(text || "");
    if (str.length <= maxLen) {
      return str;
    }
    return str.slice(0, maxLen - 1) + "…";
  }

  function formatDate(ts) {
    if (!ts) {
      return "غير متاح";
    }
    try {
      return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(ts));
    } catch (error) {
      return new Date(ts).toLocaleString();
    }
  }

  function extractSlug(href) {
    if (!href) {
      return "";
    }
    var match = href.match(/\/topics\/([^\?\/#]+)\//);
    return match ? match[1] : "";
  }

  function textOf(node) {
    return node ? String(node.textContent || "") : "";
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function updateStatus(text) {
    if (ui.dataStatus) {
      ui.dataStatus.textContent = text;
    }
  }

  function setActive(nodes, activeNode) {
    Array.prototype.forEach.call(nodes, function (node) {
      node.classList.remove("active");
    });
    if (activeNode) {
      activeNode.classList.add("active");
    }
  }

  function uniqueCount(list) {
    return new Set(list).size;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Math.round(value)));
  }

  function loadJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      // Ignore storage write errors.
    }
  }
})();
