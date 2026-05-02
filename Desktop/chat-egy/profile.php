<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>الملف الشخصي | ريلز العرب</title>
  <meta name="robots" content="index,follow,max-image-preview:large">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #000;
      --panel: #0d0e13;
      --line: rgba(255, 255, 255, 0.12);
      --text: #f3f6ff;
      --muted: #9aa0aa;
      --accent: #ff2857;
      --accent2: #ff2857;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: "Cairo", sans-serif;
      color: var(--text);
      background: var(--bg);
      min-height: 100vh;
      padding: 0;
    }

    .layout {
      display: grid;
      grid-template-columns: 1fr 280px;
      min-height: 100vh;
    }

    .shell-main {
      padding: 16px 18px;
      border-left: 1px solid rgba(255, 255, 255, 0.09);
    }

    .shell {
      width: min(1400px, 100%);
      margin: 0 auto;
      display: grid;
      gap: 12px;
    }

    .top-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .mode-pills {
      display: inline-flex;
      gap: 6px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      background: #17181d;
      padding: 6px;
    }

    .mode-pills button {
      border: 0;
      background: transparent;
      color: #b4bac5;
      font-family: inherit;
      font-size: 12px;
      font-weight: 700;
      padding: 6px 10px;
      border-radius: 8px;
      cursor: pointer;
    }

    .mode-pills button.active {
      background: #636872;
      color: #fff;
    }

    .search {
      width: min(360px, 44vw);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 999px;
      background: #17181d;
      color: #fff;
      padding: 10px 14px;
      font-family: inherit;
      font-size: 13px;
    }

    .card {
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      background: var(--panel);
      padding: 12px;
    }

    .profile-hero {
      border: 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 0;
      background: transparent;
      padding: 8px 6px 14px;
    }

    .profile-top {
      display: grid;
      grid-template-columns: 240px 1fr auto;
      gap: 18px;
      align-items: center;
    }

    .avatar {
      width: 220px;
      height: 220px;
      border-radius: 50%;
      object-fit: cover;
      border: 1px solid rgba(255, 255, 255, 0.14);
      background: #045d53;
      justify-self: center;
    }

    .name {
      margin: 0;
      font-size: 36px;
      line-height: 1.2;
      font-weight: 800;
    }

    .handle {
      margin: 2px 0 6px;
      color: #fff;
      font-size: 24px;
      direction: ltr;
      text-align: right;
      font-weight: 800;
    }

    .bio {
      margin: 0;
      color: #fff;
      font-size: 16px;
      line-height: 1.6;
    }

    .status-chip {
      margin-top: 7px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid rgba(25, 216, 207, 0.45);
      background: rgba(25, 216, 207, 0.12);
      color: #b0fdf8;
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 700;
    }

    .top-actions {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      min-width: 220px;
      align-self: start;
    }

    .btn,
    .btn-ghost,
    .btn-danger {
      border: 0;
      border-radius: 12px;
      padding: 10px 14px;
      font-family: inherit;
      font-size: 13px;
      font-weight: 800;
      cursor: pointer;
      text-decoration: none;
      text-align: center;
    }

    .btn {
      color: #fff;
      background: linear-gradient(120deg, var(--accent), var(--accent2));
    }

    .btn.following,
    .btn-ghost {
      color: #fff;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid var(--line);
    }

    .btn-danger {
      color: #fff;
      background: rgba(255, 70, 95, 0.28);
      border: 1px solid rgba(255, 70, 95, 0.48);
      padding: 7px 10px;
      font-size: 12px;
    }

    .btn-ghost.square {
      width: 44px;
      height: 44px;
      padding: 0;
      display: grid;
      place-items: center;
      font-size: 17px;
    }

    .stats {
      margin-top: 8px;
      display: flex;
      flex-wrap: wrap;
      gap: 12px 20px;
      align-items: center;
    }

    .stat {
      background: transparent;
      border: 0;
      padding: 0;
      text-align: right;
    }

    .stat strong {
      display: inline;
      font-size: 24px;
      line-height: 1.2;
      margin-left: 5px;
      color: #fff;
    }

    .stat span {
      color: var(--muted);
      font-size: 15px;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .tabs-bar {
      display: flex;
      gap: 26px;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding: 0 6px;
      margin-bottom: 6px;
      overflow: auto;
    }

    .tabs-bar button {
      border: 0;
      background: transparent;
      color: #9aa0aa;
      font-family: inherit;
      font-size: 18px;
      font-weight: 800;
      padding: 8px 0 10px;
      border-bottom: 3px solid transparent;
      white-space: nowrap;
      cursor: pointer;
    }

    .tabs-bar button.active {
      color: #fff;
      border-bottom-color: #fff;
    }

    .tabs-bar button:disabled {
      opacity: 0.7;
      cursor: default;
    }

    .form-grid {
      display: grid;
      gap: 8px;
    }

    .form-grid h3 {
      margin: 0 0 4px;
      font-size: 17px;
    }

    .form-grid p {
      margin: 0;
      color: var(--muted);
      font-size: 12px;
    }

    .auth-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 10px;
    }

    .auth-tab {
      flex: 1;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.06);
      color: #e8ebf4;
      padding: 9px;
      font-family: inherit;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }

    .auth-tab.active {
      background: linear-gradient(120deg, var(--accent), var(--accent2));
      border-color: transparent;
    }

    .auth-form.hidden { display: none; }

    label {
      font-size: 12px;
      color: #c6ccda;
      font-weight: 700;
    }

    input,
    textarea,
    select {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: rgba(5, 8, 14, 0.6);
      color: #fff;
      padding: 10px;
      font-family: inherit;
      font-size: 13px;
    }

    textarea { resize: vertical; }

    .videos {
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    }

    .video-card {
      border: 1px solid var(--line);
      border-radius: 12px;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.02);
      display: grid;
      position: relative;
    }

    .video-card video {
      width: 100%;
      aspect-ratio: 9 / 16;
      object-fit: cover;
      display: block;
      background: #05070d;
    }

    .video-meta {
      padding: 7px 8px 0;
      display: grid;
      gap: 4px;
    }

    .video-meta h4 {
      margin: 0;
      font-size: 13px;
      line-height: 1.5;
    }

    .video-meta p {
      margin: 0;
      color: var(--muted);
      font-size: 11px;
    }

    .video-actions {
      padding: 0 8px 8px;
      display: flex;
      gap: 6px;
      justify-content: flex-end;
    }

    .btn-favorite {
      border: 1px solid var(--line);
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
      padding: 7px 10px;
      font-size: 16px;
      line-height: 1;
      cursor: pointer;
    }

    .btn-favorite.active {
      border-color: rgba(255, 200, 80, 0.75);
      background: rgba(255, 200, 80, 0.18);
      color: #ffd46b;
    }

    .video-overlay {
      position: absolute;
      bottom: 44px;
      left: 8px;
      right: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 15px;
      font-weight: 800;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.7);
      pointer-events: none;
    }

    .videos-wrap {
      border: 0;
      background: transparent;
      padding: 0;
    }

    .status-msg {
      min-height: 20px;
      color: #8df0d2;
      font-size: 13px;
    }

    .status-msg.error { color: #ff9cab; }

    .empty {
      color: var(--muted);
      text-align: center;
      font-size: 13px;
      padding: 18px 10px;
      border: 1px dashed var(--line);
      border-radius: 10px;
    }

    .sidebar {
      padding: 18px 14px;
      background: #050506;
      display: grid;
      grid-template-rows: auto auto 1fr auto;
      gap: 14px;
    }

    .logo {
      font-size: 30px;
      font-weight: 900;
      text-align: right;
    }

    .sidebar-search {
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: #17181d;
      color: #fff;
      border-radius: 999px;
      padding: 10px 12px;
      font-family: inherit;
      font-size: 13px;
    }

    .menu {
      display: grid;
      gap: 8px;
      align-content: start;
    }

    .menu-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-radius: 10px;
      padding: 8px 10px;
      color: #f0f2f7;
      font-size: 17px;
      font-weight: 700;
      border: 1px solid transparent;
    }

    .menu-item.active {
      color: var(--accent);
      background: rgba(255, 40, 87, 0.18);
      border-color: rgba(255, 40, 87, 0.5);
    }

    .menu-item .ico {
      width: 32px;
      text-align: center;
      font-size: 21px;
    }

    .menu-item.disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .footer-note {
      color: #8e95a0;
      font-size: 14px;
      line-height: 1.7;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 10px;
    }

    .footer-note a {
      color: #c7d0df;
      text-decoration: none;
    }

    .footer-note a:hover {
      text-decoration: underline;
    }

    .panel-card h3 {
      margin: 0 0 10px;
      font-size: 18px;
    }

    .friend-cols {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .user-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      gap: 8px;
    }

    .user-item {
      display: flex;
      align-items: center;
      gap: 8px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      padding: 7px;
      background: rgba(255, 255, 255, 0.02);
    }

    .user-item img {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      object-fit: cover;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }

    .user-item a {
      font-size: 13px;
      font-weight: 700;
      color: #fff;
    }

    .user-item small {
      display: block;
      color: #9aa0aa;
      direction: ltr;
      font-size: 11px;
    }

    .event-list {
      display: grid;
      gap: 8px;
    }

    .event-item {
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      padding: 8px;
      background: rgba(255, 255, 255, 0.02);
    }

    .event-item p {
      margin: 0 0 4px;
      font-size: 12px;
    }

    .event-item small {
      color: #9aa0aa;
      font-size: 10px;
    }

    [hidden] { display: none !important; }

    @media (max-width: 1400px) {
      .name { font-size: 32px; }
      .handle { font-size: 22px; }
      .stat strong { font-size: 21px; }
      .stat span { font-size: 14px; }
      .bio { font-size: 15px; }
      .tabs-bar button { font-size: 17px; }
      .videos { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
      .menu-item { font-size: 15px; }
      .menu-item .ico { font-size: 19px; }
      .logo { font-size: 26px; }
    }

    @media (max-width: 1100px) {
      .layout { grid-template-columns: 1fr; }
      .sidebar { display: none; }
      .shell-main {
        border-left: 0;
        padding: 12px;
      }
      .top-row {
        flex-direction: column;
        align-items: stretch;
      }
      .search { width: 100%; }
      .profile-top { grid-template-columns: 1fr; }
      .top-actions { justify-content: center; }
      .stats { justify-content: center; }
      .name, .handle, .bio { text-align: center; }
      .handle { text-align: center; }
      .grid-2 { grid-template-columns: 1fr; }
      .videos { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .avatar { width: 160px; height: 160px; }
      .friend-cols { grid-template-columns: 1fr; }
    }

    @media (max-width: 700px) {
      body { min-height: 100dvh; }
      .shell-main { padding: 10px; }
      .top-row { gap: 8px; }
      .mode-pills { width: 100%; justify-content: center; }
      .mode-pills button { font-size: 11px; padding: 6px 8px; }
      .search { font-size: 12px; padding: 9px 11px; }
      .profile-top { gap: 10px; }
      .name { font-size: 26px; }
      .handle { font-size: 18px; }
      .bio { font-size: 14px; }
      .top-actions { gap: 6px; }
      .btn, .btn-ghost, .btn-danger { font-size: 12px; padding: 8px 11px; }
      .btn-ghost.square { width: 38px; height: 38px; font-size: 14px; }
      .tabs-bar { gap: 14px; }
      .tabs-bar button { font-size: 14px; }
      .videos { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
      .video-meta h4 { font-size: 12px; }
      .video-meta p { font-size: 10px; }
    }
  </style>
</head>
<body>
  <div class="layout">
    <main class="shell-main">
      <div class="shell">
    <div class="top-row">
      <div class="mode-pills" aria-label="فلترة">
        <button type="button" data-sort="oldest">الأقدم</button>
        <button type="button" data-sort="trending">رائج</button>
        <button type="button" data-sort="latest" class="active">الأخير</button>
      </div>
      <input class="search" type="search" placeholder="بحث">
    </div>

    <section class="card profile-hero">
      <div class="profile-top">
        <img id="profileAvatar" class="avatar" src="icons/icon-192.png" alt="avatar">
        <div>
          <h1 id="profileName" class="name">...</h1>
          <p id="profileHandle" class="handle">@user</p>
          <p id="profileBio" class="bio"></p>
          <div id="profileStatus" class="status-chip" hidden>الحالة: ...</div>
        </div>
        <div class="top-actions">
          <button id="promoteBtn" class="btn-ghost" hidden>الترويج للمنشور</button>
          <button id="settingsShortcut" class="btn-ghost square" hidden title="الإعدادات">⚙</button>
          <button id="uploadShortcut" class="btn-ghost square" hidden title="رفع">＋</button>
          <button id="shareProfileBtn" class="btn-ghost square" title="مشاركة">↗</button>
          <button id="followBtn" class="btn" hidden>متابعة</button>
          <button id="logoutBtn" class="btn-ghost" hidden>تسجيل خروج</button>
          <a href="./" class="btn-ghost">العودة للرئيسية</a>
        </div>
      </div>
      <div class="stats">
        <div class="stat">
          <strong id="followersCount">0</strong>
          <span>المتابعون</span>
        </div>
        <div class="stat">
          <strong id="followingCount">0</strong>
          <span>يتابع</span>
        </div>
        <div class="stat">
          <strong id="videosCount">0</strong>
          <span>الفيديوهات</span>
        </div>
        <div class="stat">
          <strong id="totalLikesCount">0</strong>
          <span>الإعجابات</span>
        </div>
      </div>
      <p id="statusMsg" class="status-msg"></p>
    </section>

    <section class="card" id="authCard" hidden>
      <h3 style="margin:0 0 8px;">تسجيل الدخول</h3>
      <p style="margin:0 0 10px; color:var(--muted); font-size:12px;">كل إعداداتك وتعديل صفحتك من هنا بعد الدخول.</p>
      <div class="auth-tabs">
        <button class="auth-tab active" data-auth-tab="login">تسجيل دخول</button>
        <button class="auth-tab" data-auth-tab="register">إنشاء حساب</button>
      </div>
      <form id="loginForm" class="form-grid auth-form">
        <label for="loginEmail">البريد أو اسم المستخدم</label>
        <input id="loginEmail" type="text" name="email" required>
        <label for="loginPassword">كلمة المرور</label>
        <input id="loginPassword" type="password" name="password" required>
        <button type="submit" class="btn">تسجيل دخول</button>
      </form>
      <form id="registerForm" class="form-grid auth-form hidden">
        <label for="regName">الاسم</label>
        <input id="regName" type="text" name="name" required minlength="2">
        <label for="regUsername">اسم المستخدم</label>
        <input id="regUsername" type="text" name="username" required minlength="3" maxlength="24">
        <label for="regEmail">البريد الإلكتروني</label>
        <input id="regEmail" type="email" name="email" required>
        <label for="regPassword">كلمة المرور</label>
        <input id="regPassword" type="password" name="password" required minlength="6">
        <button type="submit" class="btn">إنشاء حساب</button>
      </form>
    </section>

    <section class="card panel-card" id="ownerTools" hidden>
      <form id="editProfileForm" class="form-grid" enctype="multipart/form-data">
        <h3>إعدادات الحساب</h3>
        <p>عدّل بياناتك وصورتك وحالتك من هنا.</p>
        <label for="editName">الاسم</label>
        <input id="editName" type="text" name="name" required minlength="2">
        <label for="editUsername">اسم المستخدم</label>
        <input id="editUsername" type="text" name="username" required minlength="3" maxlength="24">
        <label for="editBio">نبذة</label>
        <textarea id="editBio" name="bio" rows="3" maxlength="220"></textarea>
        <label for="editStatusText">الحالة</label>
        <input id="editStatusText" type="text" name="status_text" maxlength="120" placeholder="مثال: متاح للتعاون اليوم">
        <label for="editAvatar">الصورة الشخصية</label>
        <input id="editAvatar" type="file" name="avatar" accept="image/jpeg,image/png,image/webp">
        <button type="submit" class="btn">حفظ التعديلات</button>
      </form>
    </section>

    <section class="card panel-card" id="uploadPanel" hidden>
      <form id="uploadForm" class="form-grid" enctype="multipart/form-data">
        <h3>رفع فيديو جديد</h3>
        <p>انشر ريل جديدًا على حسابك مباشرة.</p>
        <label for="videoTitle">عنوان الفيديو</label>
        <input id="videoTitle" type="text" name="title" required minlength="1" maxlength="120">
        <label for="videoDescription">وصف الفيديو</label>
        <textarea id="videoDescription" name="description" rows="3" maxlength="500"></textarea>
        <label for="videoLanguage">لغة الفيديو</label>
        <select id="videoLanguage" name="language">
          <option value="ar">العربية</option>
          <option value="en">English</option>
        </select>
        <label for="videoFile">ملف الفيديو (MP4/WebM/MOV)</label>
        <input id="videoFile" type="file" name="video" accept="video/mp4,video/webm,video/quicktime" required>
        <button type="submit" class="btn">رفع الآن</button>
      </form>
    </section>

    <section id="friendsPanel" class="card panel-card" hidden>
      <h3>الأصدقاء</h3>
      <div class="friend-cols">
        <div>
          <h3 style="font-size:15px; margin:0 0 8px;">المتابعون</h3>
          <ul id="followersList" class="user-list"></ul>
        </div>
        <div>
          <h3 style="font-size:15px; margin:0 0 8px;">يتابع</h3>
          <ul id="followingList" class="user-list"></ul>
        </div>
      </div>
    </section>

    <section id="messagesPanel" class="card panel-card" hidden>
      <h3>الرسائل</h3>
      <div id="messagesList" class="event-list"></div>
    </section>

    <section id="activityPanel" class="card panel-card" hidden>
      <h3>النشاط</h3>
      <div id="activityList" class="event-list"></div>
    </section>

    <section id="morePanel" class="card panel-card" hidden>
      <h3>المزيد</h3>
      <div class="quick-actions" style="display:flex; gap:8px; flex-wrap:wrap;">
        <button type="button" class="btn-ghost" id="moreActivityBtn">النشاط</button>
        <a href="./" class="btn-ghost">العودة للرئيسية</a>
      </div>
    </section>

    <section class="tabs-bar">
      <button type="button" class="active" data-tab="videos">الفيديوهات</button>
      <button type="button" data-tab="favorites">المفضلات</button>
      <button type="button" data-tab="liked">تم الإعجاب</button>
    </section>

    <section class="card videos-wrap">
      <h2 id="videosHeading" style="margin:0 0 8px; font-size:18px;">الفيديوهات</h2>
      <div id="videosGrid" class="videos"></div>
    </section>
      </div>
    </main>

    <aside class="sidebar">
      <div class="logo">ريلز العرب</div>
      <input class="sidebar-search" type="search" placeholder="بحث">
      <nav class="menu">
        <a class="menu-item" data-action="home" href="./"><span>لك</span><span class="ico">⌂</span></a>
        <a class="menu-item" data-action="explore" href="./?mode=for_you"><span>استكشف</span><span class="ico">◉</span></a>
        <a class="menu-item" data-action="following" href="./?mode=following"><span>أتابعه</span><span class="ico">⟲</span></a>
        <a class="menu-item" data-action="friends" href="#friends"><span>الأصدقاء</span><span class="ico">◌</span></a>
        <a class="menu-item disabled" data-action="live" href="#live"><span>LIVE</span><span class="ico">▣</span></a>
        <a class="menu-item" data-action="messages" href="#messages"><span>الرسائل</span><span class="ico">✉</span></a>
        <a class="menu-item" data-action="activity" href="#activity"><span>النشاط</span><span class="ico">☷</span></a>
        <a class="menu-item active" data-action="profile" href="profile.php"><span>الملف الشخصي</span><span class="ico">●</span></a>
        <a class="menu-item" data-action="more" href="#more"><span>المزيد</span><span class="ico">⋯</span></a>
      </nav>
      <div class="footer-note"><a href="legal-notice/">الشروط</a> · <a href="privacy/">السياسات</a> · <a href="contact/">اتصل بنا</a></div>
    </aside>
  </div>

  <script>
    (() => {
      "use strict";

      const refs = {
        profileAvatar: document.getElementById("profileAvatar"),
        profileName: document.getElementById("profileName"),
        profileHandle: document.getElementById("profileHandle"),
        profileBio: document.getElementById("profileBio"),
        profileStatus: document.getElementById("profileStatus"),
        followersCount: document.getElementById("followersCount"),
        followingCount: document.getElementById("followingCount"),
        videosCount: document.getElementById("videosCount"),
        totalLikesCount: document.getElementById("totalLikesCount"),
        statusMsg: document.getElementById("statusMsg"),
        videosGrid: document.getElementById("videosGrid"),
        videosHeading: document.getElementById("videosHeading"),
        sortButtons: Array.from(document.querySelectorAll(".mode-pills [data-sort]")),
        videoTabButtons: Array.from(document.querySelectorAll(".tabs-bar [data-tab]")),
        profileSearch: document.querySelector(".top-row .search"),
        followBtn: document.getElementById("followBtn"),
        promoteBtn: document.getElementById("promoteBtn"),
        settingsShortcut: document.getElementById("settingsShortcut"),
        uploadShortcut: document.getElementById("uploadShortcut"),
        shareProfileBtn: document.getElementById("shareProfileBtn"),
        logoutBtn: document.getElementById("logoutBtn"),
        menuItems: Array.from(document.querySelectorAll(".menu .menu-item")),
        authCard: document.getElementById("authCard"),
        authTabs: Array.from(document.querySelectorAll(".auth-tab")),
        loginForm: document.getElementById("loginForm"),
        registerForm: document.getElementById("registerForm"),
        ownerTools: document.getElementById("ownerTools"),
        uploadPanel: document.getElementById("uploadPanel"),
        friendsPanel: document.getElementById("friendsPanel"),
        followersList: document.getElementById("followersList"),
        followingList: document.getElementById("followingList"),
        messagesPanel: document.getElementById("messagesPanel"),
        messagesList: document.getElementById("messagesList"),
        activityPanel: document.getElementById("activityPanel"),
        activityList: document.getElementById("activityList"),
        morePanel: document.getElementById("morePanel"),
        moreActivityBtn: document.getElementById("moreActivityBtn"),
        editProfileForm: document.getElementById("editProfileForm"),
        editName: document.getElementById("editName"),
        editUsername: document.getElementById("editUsername"),
        editBio: document.getElementById("editBio"),
        editStatusText: document.getElementById("editStatusText"),
        uploadForm: document.getElementById("uploadForm")
      };

      const state = {
        username: "",
        viewer: null,
        profile: null,
        allVideos: [],
        videos: [],
        notifications: [],
        followers: [],
        following: [],
        sortMode: "latest",
        activeVideoTab: "videos",
        favoriteVideoIds: new Set(),
        likedVideoIds: new Set(),
        followBusy: false,
        loadingProfile: false
      };

      const format = (n) => new Intl.NumberFormat("ar", { notation: "compact", maximumFractionDigits: 1 }).format(Number(n || 0));

      const showStatus = (message, isError = false) => {
        refs.statusMsg.textContent = message || "";
        refs.statusMsg.classList.toggle("error", !!isError);
      };

      const normalizeIdSet = (values) =>
        new Set((Array.isArray(values) ? values : []).map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0));

      const readStoredIds = (key) => {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) return new Set();
          const values = JSON.parse(raw);
          if (!Array.isArray(values)) return new Set();
          return new Set(values.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0));
        } catch (_) {
          return new Set();
        }
      };

      const saveStoredIds = (key, values) => {
        try {
          localStorage.setItem(key, JSON.stringify(Array.from(values)));
        } catch (_) {}
      };

      const applyViewerVideoStates = (payload) => {
        const source = payload && typeof payload === "object" ? payload : {};
        state.favoriteVideoIds = normalizeIdSet(source.favorite_video_ids);
        state.likedVideoIds = normalizeIdSet(source.liked_video_ids);
      };

      const refreshViewerVideoStates = async (prefetched = null) => {
        if (prefetched) {
          applyViewerVideoStates(prefetched);
          saveStoredIds("rhac_profile_favorites", state.favoriteVideoIds);
          saveStoredIds("rhac_liked_video_ids", state.likedVideoIds);
          return;
        }

        if (state.viewer && state.viewer.id) {
          try {
            const payload = await api("video_preferences");
            applyViewerVideoStates(payload);
            saveStoredIds("rhac_profile_favorites", state.favoriteVideoIds);
            saveStoredIds("rhac_liked_video_ids", state.likedVideoIds);
            return;
          } catch (_) {}
        }

        state.favoriteVideoIds = readStoredIds("rhac_profile_favorites");
        state.likedVideoIds = readStoredIds("rhac_liked_video_ids");
      };

      const setActiveSortButton = () => {
        refs.sortButtons.forEach((button) => {
          button.classList.toggle("active", (button.dataset.sort || "latest") === state.sortMode);
        });
      };

      const setActiveVideoTab = () => {
        refs.videoTabButtons.forEach((button) => {
          button.classList.toggle("active", (button.dataset.tab || "videos") === state.activeVideoTab);
        });

        if (!refs.videosHeading) return;
        if (state.activeVideoTab === "favorites") {
          refs.videosHeading.textContent = "المفضلات";
          return;
        }
        if (state.activeVideoTab === "liked") {
          refs.videosHeading.textContent = "تم الإعجاب";
          return;
        }
        refs.videosHeading.textContent = "الفيديوهات";
      };

      const applyVideoView = () => {
        const query = String(refs.profileSearch?.value || "").trim().toLowerCase();
        let rows = [...state.allVideos];

        if (state.activeVideoTab === "favorites") {
          rows = rows.filter((video) => state.favoriteVideoIds.has(Number(video.id || 0)));
        } else if (state.activeVideoTab === "liked") {
          rows = rows.filter((video) => state.likedVideoIds.has(Number(video.id || 0)));
        }

        if (query) {
          rows = rows.filter((video) => {
            const title = String(video.title || "").toLowerCase();
            const description = String(video.description || "").toLowerCase();
            return title.includes(query) || description.includes(query);
          });
        }

        const byTime = (video) => {
          const ts = Date.parse(video.created_at || "");
          if (Number.isFinite(ts)) return ts;
          return Number(video.id || 0);
        };

        if (state.sortMode === "oldest") {
          rows.sort((a, b) => byTime(a) - byTime(b));
        } else if (state.sortMode === "trending") {
          rows.sort((a, b) => {
            const scoreA = Number(a.likes || 0) * 5 + Number(a.views || 0);
            const scoreB = Number(b.likes || 0) * 5 + Number(b.views || 0);
            return scoreB - scoreA;
          });
        } else {
          rows.sort((a, b) => byTime(b) - byTime(a));
        }

        state.videos = rows;
      };

      const escapeHtml = (value) =>
        String(value ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\"/g, "&quot;")
          .replace(/'/g, "&#39;");

      const api = async (action, method = "GET", body = null, isForm = false, params = null) => {
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
          Object.entries(params).forEach(([k, v]) => {
            if (v === undefined || v === null) return;
            query.set(k, String(v));
          });
        }

        const res = await fetch(`app-api.php?${query.toString()}`, options);
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || payload.ok === false) {
          throw new Error(payload.message || "Request failed");
        }
        return payload;
      };

      const formatDate = (value) => {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        return date.toLocaleString("ar");
      };

      const hidePanels = () => {
        refs.ownerTools.hidden = true;
        refs.uploadPanel.hidden = true;
        refs.friendsPanel.hidden = true;
        refs.messagesPanel.hidden = true;
        refs.activityPanel.hidden = true;
        refs.morePanel.hidden = true;
      };

      const setActiveMenu = (action) => {
        refs.menuItems.forEach((item) => {
          item.classList.toggle("active", (item.dataset.action || "") === action);
        });
      };

      const renderUsers = (container, users, emptyText) => {
        if (!container) return;
        if (!users.length) {
          container.innerHTML = `<li class="empty">${emptyText}</li>`;
          return;
        }

        container.innerHTML = users
          .map((user) => {
            const profileUrl = user.profile_url || (user.username ? `profile.php?u=${encodeURIComponent(user.username)}` : "profile.php");
            return `
              <li class="user-item">
                <img src="${escapeHtml(user.avatar_url || "icons/icon-192.png")}" alt="avatar">
                <div>
                  <a href="${escapeHtml(profileUrl)}">${escapeHtml(user.name || "مستخدم")}</a>
                  <small>@${escapeHtml(user.username || "user")}</small>
                </div>
              </li>
            `;
          })
          .join("");
      };

      const renderEvents = (container, rows, emptyText) => {
        if (!container) return;
        if (!rows.length) {
          container.innerHTML = `<div class="empty">${emptyText}</div>`;
          return;
        }

        container.innerHTML = rows
          .map((row) => `
            <article class="event-item">
              <p>${escapeHtml(row.message || "")}</p>
              <small>${formatDate(row.created_at)}</small>
            </article>
          `)
          .join("");
      };

      const loadFriendsPanel = async () => {
        if (!state.profile?.username) return;
        const payload = await api("follow_lists", "GET", null, false, { u: state.profile.username });
        state.followers = Array.isArray(payload.followers) ? payload.followers : [];
        state.following = Array.isArray(payload.following) ? payload.following : [];
        renderUsers(refs.followersList, state.followers, "لا يوجد متابعون بعد.");
        renderUsers(refs.followingList, state.following, "لا يتابع أحدًا بعد.");
      };

      const loadNotificationsData = async () => {
        if (!(state.viewer && state.profile?.is_own_profile)) {
          state.notifications = [];
          return [];
        }
        const payload = await api("notifications");
        state.notifications = Array.isArray(payload.notifications) ? payload.notifications : [];
        return state.notifications;
      };

      const renderVideos = () => {
        applyVideoView();
        setActiveSortButton();
        setActiveVideoTab();

        refs.videosGrid.innerHTML = "";
        refs.videosCount.textContent = format(state.allVideos.length);
        const totalLikes = state.allVideos.reduce((sum, video) => sum + Number(video.likes || 0), 0);
        refs.totalLikesCount.textContent = format(totalLikes);

        if (!state.videos.length) {
          if (state.activeVideoTab === "favorites") {
            refs.videosGrid.innerHTML = '<div class="empty">لا توجد فيديوهات مضافة إلى المفضلات.</div>';
            return;
          }
          if (state.activeVideoTab === "liked") {
            refs.videosGrid.innerHTML = '<div class="empty">لا توجد فيديوهات تم الإعجاب بها هنا.</div>';
            return;
          }
          refs.videosGrid.innerHTML = '<div class="empty">لا توجد فيديوهات في هذا الملف الشخصي.</div>';
          return;
        }

        const isOwnProfile = !!state.profile?.is_own_profile;

        state.videos.forEach((video) => {
          const el = document.createElement("article");
          el.className = "video-card";
          const id = Number(video.id || 0);
          const isFavorite = state.favoriteVideoIds.has(id);

          const deleteButton = isOwnProfile
            ? `<button type="button" class="btn-danger" data-delete-video-id="${id}">حذف</button>`
            : "";
          const favoriteButton = `<button type="button" class="btn-favorite${isFavorite ? " active" : ""}" data-favorite-video-id="${id}" aria-label="المفضلة">${isFavorite ? "★" : "☆"}</button>`;

          el.innerHTML = `
            <video src="${escapeHtml(video.video_url || "")}" ${video.poster_url ? `poster="${escapeHtml(video.poster_url)}"` : ""} preload="metadata" muted playsinline></video>
            <div class="video-overlay"><span>${format(video.views)} ▶</span><span>${format(video.likes)} ❤</span></div>
            <div class="video-meta">
              <h4>${escapeHtml(video.title || "")}</h4>
              <p>${format(video.views)} مشاهدة</p>
            </div>
            <div class="video-actions">${favoriteButton}${deleteButton}</div>
          `;

          refs.videosGrid.appendChild(el);
        });
      };

      const updateFollowButton = () => {
        const p = state.profile || {};
        if (!refs.followBtn) return;

        refs.logoutBtn.hidden = !(state.viewer && p.is_own_profile);

        if (p.is_own_profile) {
          refs.followBtn.hidden = true;
          refs.promoteBtn.hidden = false;
          refs.settingsShortcut.hidden = false;
          refs.uploadShortcut.hidden = false;
          return;
        }

        refs.promoteBtn.hidden = true;
        refs.settingsShortcut.hidden = true;
        refs.uploadShortcut.hidden = !(state.viewer && state.viewer.username);
        refs.followBtn.hidden = false;
        if (!state.viewer) {
          refs.followBtn.textContent = "سجّل دخول للمتابعة";
          refs.followBtn.classList.remove("following");
          return;
        }

        refs.followBtn.textContent = p.is_following ? "إلغاء المتابعة" : "متابعة";
        refs.followBtn.classList.toggle("following", !!p.is_following);
      };

      const fillOwnerForms = () => {
        if (!state.profile?.is_own_profile) return;
        refs.editName.value = state.profile.name || "";
        refs.editUsername.value = state.profile.username || "";
        refs.editBio.value = state.profile.bio || "";
        refs.editStatusText.value = state.profile.status_text || "";
      };

      const renderProfile = () => {
        const p = state.profile || {};
        refs.profileAvatar.src = p.avatar_url || "icons/icon-192.png";
        refs.profileName.textContent = p.name || "مستخدم";
        refs.profileHandle.textContent = `@${p.username || "user"}`;
        refs.profileBio.textContent = p.bio || "لا توجد سيرة ذاتية حتى الآن.";
        refs.followersCount.textContent = format(p.followers_count || 0);
        refs.followingCount.textContent = format(p.following_count || 0);

        if (p.status_text) {
          refs.profileStatus.hidden = false;
          refs.profileStatus.textContent = `الحالة: ${p.status_text}`;
        } else {
          refs.profileStatus.hidden = true;
          refs.profileStatus.textContent = "";
        }

        refs.ownerTools.hidden = true;
        refs.uploadPanel.hidden = true;
        updateFollowButton();
        fillOwnerForms();
        renderVideos();
      };

      const showAuthOnlyState = () => {
        hidePanels();
        setActiveMenu("profile");
        state.allVideos = [];
        state.videos = [];
        state.activeVideoTab = "videos";
        state.sortMode = "latest";
        setActiveSortButton();
        setActiveVideoTab();
        refs.authCard.hidden = false;
        refs.ownerTools.hidden = true;
        refs.followBtn.hidden = true;
        refs.promoteBtn.hidden = true;
        refs.settingsShortcut.hidden = true;
        refs.uploadShortcut.hidden = true;
        refs.logoutBtn.hidden = true;
        refs.profileName.textContent = "ملفك الشخصي";
        refs.profileHandle.textContent = "@your_page";
        refs.profileBio.textContent = "سجل الدخول لإنشاء وتعديل صفحتك.";
        refs.profileStatus.hidden = true;
        refs.followersCount.textContent = "0";
        refs.followingCount.textContent = "0";
        refs.videosCount.textContent = "0";
        refs.totalLikesCount.textContent = "0";
        refs.followersList.innerHTML = "";
        refs.followingList.innerHTML = "";
        refs.messagesList.innerHTML = "";
        refs.activityList.innerHTML = "";
        refs.videosGrid.innerHTML = '<div class="empty">بعد تسجيل الدخول ستظهر هنا إعداداتك وفيديوهاتك.</div>';
      };

      const loadPage = async () => {
        if (state.loadingProfile) return;
        state.loadingProfile = true;

        try {
          showStatus("جاري التحميل...");
          const fromQuery = (new URLSearchParams(window.location.search).get("u") || "").trim().toLowerCase();
          const auth = await api("auth");
          state.viewer = auth.user || null;

          if (!fromQuery && !state.viewer) {
            state.username = "";
            state.profile = null;
            state.allVideos = [];
            state.videos = [];
            showAuthOnlyState();
            showStatus("سجّل دخولك للمتابعة.");
            return;
          }

          state.username = fromQuery || String(state.viewer?.username || "").toLowerCase();
          if (!fromQuery && state.username) {
            const nextUrl = `${window.location.pathname}?u=${encodeURIComponent(state.username)}${window.location.hash || ""}`;
            window.history.replaceState({}, "", nextUrl);
          }

          const profilePayload = await api("profile", "GET", null, false, { u: state.username });
          state.profile = profilePayload.profile || null;
          state.allVideos = Array.isArray(profilePayload.videos) ? profilePayload.videos : [];
          state.videos = [...state.allVideos];
          const prefetchedStates = state.viewer ? (profilePayload.viewer_video_states || null) : null;
          await refreshViewerVideoStates(prefetchedStates);

          refs.authCard.hidden = !!state.viewer || !!fromQuery;
          hidePanels();
          setActiveMenu("profile");
          renderProfile();

          showStatus("");
        } finally {
          state.loadingProfile = false;
        }
      };

      const openSidebarAction = async (action) => {
        const key = String(action || "").toLowerCase();
        if (!key) return;

        if (key === "home") {
          window.location.href = "./";
          return;
        }
        if (key === "explore") {
          window.location.href = "./?mode=for_you";
          return;
        }
        if (key === "following") {
          window.location.href = "./?mode=following";
          return;
        }

        if (key === "live") {
          setActiveMenu("live");
          showStatus("البث المباشر غير متاح حاليًا.");
          return;
        }

        if (key === "upload") {
          if (state.viewer && !state.profile?.is_own_profile) {
            window.location.href = `profile.php?u=${encodeURIComponent(state.viewer.username)}#upload`;
            return;
          }
          if (!(state.viewer && state.profile?.is_own_profile)) {
            showStatus("سجّل دخولك أولًا للرفع.", true);
            window.location.href = "profile.php#auth";
            return;
          }
          hidePanels();
          refs.uploadPanel.hidden = false;
          setActiveMenu("upload");
          refs.uploadPanel.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }

        if (key === "profile") {
          hidePanels();
          setActiveMenu("profile");
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }

        if (key === "friends") {
          hidePanels();
          setActiveMenu("friends");
          refs.friendsPanel.hidden = false;
          try {
            await loadFriendsPanel();
          } catch (error) {
            showStatus(error.message, true);
          }
          refs.friendsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }

        if (key === "messages") {
          if (state.viewer && !state.profile?.is_own_profile) {
            window.location.href = `profile.php?u=${encodeURIComponent(state.viewer.username)}#messages`;
            return;
          }
          hidePanels();
          setActiveMenu("messages");
          refs.messagesPanel.hidden = false;
          try {
            const notifications = await loadNotificationsData();
            const messages = notifications.filter((row) => ["mention", "comment", "comment_reaction"].includes(String(row.type || "")));
            renderEvents(refs.messagesList, messages, "لا توجد رسائل حاليًا.");
          } catch (error) {
            showStatus(error.message, true);
          }
          refs.messagesPanel.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }

        if (key === "activity") {
          if (state.viewer && !state.profile?.is_own_profile) {
            window.location.href = `profile.php?u=${encodeURIComponent(state.viewer.username)}#activity`;
            return;
          }
          hidePanels();
          setActiveMenu("activity");
          refs.activityPanel.hidden = false;
          try {
            const notifications = await loadNotificationsData();
            renderEvents(refs.activityList, notifications, "لا يوجد نشاط حتى الآن.");
            if (state.viewer && state.profile?.is_own_profile) {
              await api("notifications_mark_read", "POST", {});
            }
          } catch (error) {
            showStatus(error.message, true);
          }
          refs.activityPanel.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }

        if (key === "more") {
          const willShow = refs.morePanel.hidden;
          hidePanels();
          refs.morePanel.hidden = !willShow;
          setActiveMenu("more");
          if (willShow) refs.morePanel.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
      };

      refs.authTabs.forEach((tab) => {
        tab.addEventListener("click", () => {
          const tabName = tab.dataset.authTab || "login";
          refs.authTabs.forEach((x) => x.classList.toggle("active", x === tab));
          refs.loginForm.classList.toggle("hidden", tabName !== "login");
          refs.registerForm.classList.toggle("hidden", tabName !== "register");
        });
      });

      refs.menuItems.forEach((item) => {
        item.addEventListener("click", async (event) => {
          const action = item.dataset.action || "";
          if (!action) return;

          if (["home", "explore", "following"].includes(action)) {
            return;
          }

          event.preventDefault();
          await openSidebarAction(action);
        });
      });

      refs.sortButtons.forEach((button) => {
        button.addEventListener("click", () => {
          state.sortMode = button.dataset.sort || "latest";
          renderVideos();
        });
      });

      refs.videoTabButtons.forEach((button) => {
        button.addEventListener("click", () => {
          state.activeVideoTab = button.dataset.tab || "videos";
          renderVideos();
        });
      });

      refs.profileSearch?.addEventListener("input", () => {
        renderVideos();
      });

      refs.loginForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
          showStatus("جاري تسجيل الدخول...");
          const data = Object.fromEntries(new FormData(refs.loginForm).entries());
          await api("login", "POST", data);
          refs.loginForm.reset();
          await loadPage();
        } catch (error) {
          showStatus(error.message, true);
        }
      });

      refs.registerForm?.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
          showStatus("جاري إنشاء الحساب...");
          const data = Object.fromEntries(new FormData(refs.registerForm).entries());
          await api("register", "POST", data);
          refs.registerForm.reset();
          await loadPage();
        } catch (error) {
          showStatus(error.message, true);
        }
      });

      refs.logoutBtn?.addEventListener("click", async () => {
        try {
          await api("logout", "POST", {});
          window.location.href = "profile.php#auth";
        } catch (error) {
          showStatus(error.message, true);
        }
      });

      refs.shareProfileBtn?.addEventListener("click", async () => {
        const profileUrl = state.profile?.profile_url ? `${window.location.origin}${state.profile.profile_url}` : window.location.href;
        try {
          await navigator.clipboard.writeText(profileUrl);
          showStatus("تم نسخ رابط الملف الشخصي.");
        } catch (_) {
          showStatus("تعذر النسخ، انسخ الرابط يدويًا.", true);
        }
      });

      refs.settingsShortcut?.addEventListener("click", () => {
        hidePanels();
        refs.ownerTools.hidden = false;
        refs.ownerTools?.scrollIntoView({ behavior: "smooth", block: "start" });
      });

      refs.uploadShortcut?.addEventListener("click", async () => {
        await openSidebarAction("upload");
      });

      refs.promoteBtn?.addEventListener("click", () => {
        showStatus("ميزة الترويج ستكون متاحة قريبًا.");
      });

      refs.moreActivityBtn?.addEventListener("click", async () => {
        await openSidebarAction("activity");
      });

      refs.followBtn?.addEventListener("click", async () => {
        if (state.followBusy) return;

        if (!state.viewer) {
          window.location.href = "profile.php#auth";
          return;
        }

        if (!state.profile || state.profile.is_own_profile) return;

        try {
          state.followBusy = true;
          showStatus("جاري التحديث...");

          const payload = await api("toggle_follow", "POST", { username: state.profile.username });
          state.profile.is_following = !!payload.is_following;
          state.profile.followers_count = Number(payload.target?.followers_count || state.profile.followers_count || 0);
          state.profile.following_count = Number(payload.target?.following_count || state.profile.following_count || 0);

          renderProfile();
          showStatus("");
        } catch (error) {
          showStatus(error.message, true);
        } finally {
          state.followBusy = false;
        }
      });

      refs.editProfileForm?.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!state.profile?.is_own_profile) return;

        try {
          showStatus("جاري حفظ التعديلات...");
          const formData = new FormData(refs.editProfileForm);
          const payload = await api("update_profile", "POST", formData, true);

          const nextUser = payload.user || null;
          if (nextUser?.username && nextUser.username !== state.username) {
            state.username = String(nextUser.username).toLowerCase();
            window.history.replaceState({}, "", `${window.location.pathname}?u=${encodeURIComponent(state.username)}`);
          }

          await loadPage();
          showStatus("تم حفظ التعديلات.");
        } catch (error) {
          showStatus(error.message, true);
        }
      });

      refs.uploadForm?.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!state.profile?.is_own_profile) return;

        try {
          showStatus("جاري رفع الفيديو...");
          const auth = await api("auth");
          state.viewer = auth.user || null;
          if (!state.viewer) {
            showStatus("يجب تسجيل الدخول أولًا.", true);
            window.location.href = "profile.php#auth";
            return;
          }
          const formData = new FormData(refs.uploadForm);
          await api("upload", "POST", formData, true);
          refs.uploadForm.reset();
          await loadPage();
          showStatus("تم رفع الفيديو بنجاح.");
        } catch (error) {
          showStatus(error.message, true);
        }
      });

      refs.videosGrid.addEventListener("click", async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        const favoriteButton = target.closest("[data-favorite-video-id]");
        if (favoriteButton instanceof HTMLButtonElement) {
          const videoId = Number(favoriteButton.dataset.favoriteVideoId || 0);
          if (!videoId) return;

          if (state.viewer && state.viewer.id) {
            try {
              const payload = await api("set_video_favorite", "POST", { video_id: videoId });
              if (payload.is_favorited) {
                state.favoriteVideoIds.add(videoId);
              } else {
                state.favoriteVideoIds.delete(videoId);
              }
              saveStoredIds("rhac_profile_favorites", state.favoriteVideoIds);
            } catch (error) {
              showStatus(error.message, true);
              return;
            }
          } else {
            if (state.favoriteVideoIds.has(videoId)) {
              state.favoriteVideoIds.delete(videoId);
            } else {
              state.favoriteVideoIds.add(videoId);
            }
            saveStoredIds("rhac_profile_favorites", state.favoriteVideoIds);
          }

          renderVideos();
          return;
        }

        const button = target.closest("[data-delete-video-id]");
        if (!(button instanceof HTMLButtonElement)) return;
        if (!state.profile?.is_own_profile) return;

        const videoId = Number(button.dataset.deleteVideoId || 0);
        if (!videoId) return;

        if (!window.confirm("هل تريد حذف هذا الفيديو؟")) return;

        try {
          showStatus("جاري حذف الفيديو...");
          await api("delete_video", "POST", { video_id: videoId });
          await loadPage();
          showStatus("تم حذف الفيديو.");
        } catch (error) {
          showStatus(error.message, true);
        }
      });

      loadPage()
        .then(async () => {
          const hash = String(window.location.hash || "").replace("#", "").toLowerCase();
          const map = {
            friends: "friends",
            messages: "messages",
            activity: "activity",
            upload: "upload",
            more: "more",
            auth: "profile"
          };
          const action = map[hash];
          if (action) await openSidebarAction(action);
        })
        .catch((error) => showStatus(error.message, true));
    })();
  </script>
</body>
</html>
