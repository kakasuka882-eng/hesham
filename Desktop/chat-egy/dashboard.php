<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dashboard Admin | ريلز العرب</title>
  <meta name="robots" content="noindex,nofollow">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/dashboard.css">
</head>
<body>
  <div class="dashboard-layout">
    <section id="adminLoginCard" class="login-card">
      <h1>Admin Dashboard</h1>
      <p>تسجيل دخول الأدمن فقط</p>
      <form id="adminLoginForm">
        <label>Username</label>
        <input type="text" name="username" placeholder="admin" required>
        <label>Password</label>
        <input type="password" name="password" placeholder="admin" required>
        <button type="submit">دخول</button>
      </form>
      <p class="status" id="loginStatus"></p>
    </section>

    <section id="adminApp" hidden>
      <header class="top">
        <div>
          <h1>ريلز العرب</h1>
          <p>لوحة تحكم الأدمن</p>
        </div>
        <div class="top-actions">
          <a href="/" class="btn">العودة للموقع</a>
          <button id="logoutBtn" class="btn danger">تسجيل خروج</button>
        </div>
      </header>

      <section class="stats-grid">
        <article class="stat">
          <h3>إجمالي الفيديوهات</h3>
          <strong id="statVideos">0</strong>
        </article>
        <article class="stat">
          <h3>إجمالي المشاهدات</h3>
          <strong id="statViews">0</strong>
        </article>
        <article class="stat">
          <h3>إجمالي الإعجابات</h3>
          <strong id="statLikes">0</strong>
        </article>
        <article class="stat">
          <h3>إجمالي التعليقات</h3>
          <strong id="statComments">0</strong>
        </article>
        <article class="stat">
          <h3>إجمالي المشاركات</h3>
          <strong id="statShares">0</strong>
        </article>
      </section>

      <section class="card">
        <h2>كل الفيديوهات على المنصة</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>العنوان</th>
                <th>الناشر</th>
                <th>المشاهدات</th>
                <th>الإعجابات</th>
                <th>التعليقات</th>
                <th>إجراء</th>
              </tr>
            </thead>
            <tbody id="videosTableBody"></tbody>
          </table>
        </div>
      </section>

      <p class="status" id="status"></p>
    </section>
  </div>

  <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-storage-compat.js"></script>
  <script src="/js/firebase-config.js?v=26030707"></script>
  <script src="/js/firebase-api.js?v=26030707"></script>
  <script src="/js/local-api.js?v=26030707"></script>
  <script src="/js/dashboard.js?v=26030707"></script>
</body>
</html>
