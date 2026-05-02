<?php
declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    $isSecure = !empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off';
    ini_set('session.use_only_cookies', '1');
    ini_set('session.use_strict_mode', '1');
    if (PHP_VERSION_ID >= 70300) {
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'secure' => $isSecure,
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
    } else {
        session_set_cookie_params(0, '/; samesite=Lax', '', $isSecure, true);
    }
    session_start();
}

function app_root_path(string $path = ''): string
{
    $base = dirname(__DIR__);
    return $path === '' ? $base : $base . DIRECTORY_SEPARATOR . ltrim($path, DIRECTORY_SEPARATOR);
}

function app_public_url(string $path): string
{
    if ($path === '') {
        return '/';
    }
    return $path[0] === '/' ? $path : '/' . $path;
}

function app_json(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function app_read_json(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function app_slugify(string $value): string
{
    $value = trim($value);
    $value = mb_strtolower($value);
    $value = preg_replace('/[^\p{L}\p{N}_\-\.]+/u', '-', $value) ?? '';
    $value = trim($value, '-.');
    return $value !== '' ? $value : 'user';
}

function app_column_exists(PDO $pdo, string $table, string $column): bool
{
    $stmt = $pdo->query('PRAGMA table_info(' . $table . ')');
    $rows = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
    foreach ($rows as $row) {
        if (($row['name'] ?? '') === $column) {
            return true;
        }
    }
    return false;
}

function app_generate_unique_username(PDO $pdo, string $base, ?int $excludeId = null): string
{
    $base = app_slugify($base);
    $candidate = $base;
    $i = 1;
    while (true) {
        $sql = 'SELECT id FROM users WHERE username = :username';
        $params = ['username' => $candidate];
        if ($excludeId !== null) {
            $sql .= ' AND id != :exclude_id';
            $params['exclude_id'] = $excludeId;
        }
        $sql .= ' LIMIT 1';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        if (!$stmt->fetch()) {
            return $candidate;
        }
        $candidate = $base . $i;
        $i++;
    }
}

function app_migrate_users(PDO $pdo): void
{
    if (!app_column_exists($pdo, 'users', 'username')) {
        $pdo->exec('ALTER TABLE users ADD COLUMN username TEXT');
    }
    if (!app_column_exists($pdo, 'users', 'avatar_url')) {
        $pdo->exec('ALTER TABLE users ADD COLUMN avatar_url TEXT NOT NULL DEFAULT ""');
    }
    if (!app_column_exists($pdo, 'users', 'bio')) {
        $pdo->exec('ALTER TABLE users ADD COLUMN bio TEXT NOT NULL DEFAULT ""');
    }
    if (!app_column_exists($pdo, 'users', 'status_text')) {
        $pdo->exec('ALTER TABLE users ADD COLUMN status_text TEXT NOT NULL DEFAULT ""');
    }
    if (!app_column_exists($pdo, 'users', 'is_admin')) {
        $pdo->exec('ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0');
    }

    $rows = $pdo->query('SELECT id, name, email, username FROM users')->fetchAll();
    $update = $pdo->prepare('UPDATE users SET username = :username WHERE id = :id');
    foreach ($rows as $row) {
        $username = trim((string)($row['username'] ?? ''));
        if ($username === '') {
            $seed = (string)($row['name'] ?: strtok((string)$row['email'], '@'));
            $username = app_generate_unique_username($pdo, $seed, (int)$row['id']);
            $update->execute(['username' => $username, 'id' => (int)$row['id']]);
        } else {
            $normalized = app_generate_unique_username($pdo, $username, (int)$row['id']);
            if ($normalized !== $username) {
                $update->execute(['username' => $normalized, 'id' => (int)$row['id']]);
            }
        }
    }

    $pdo->exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique ON users(username)');
}

function app_ensure_admin_user(PDO $pdo): void
{
    $passwordHash = password_hash('admin', PASSWORD_DEFAULT);
    $stmt = $pdo->prepare('SELECT id FROM users WHERE username = :username LIMIT 1');
    $stmt->execute(['username' => 'admin']);
    $existing = $stmt->fetch();

    if ($existing) {
        $update = $pdo->prepare(
            'UPDATE users
             SET name = :name, email = :email, password_hash = :password_hash, is_admin = 1
             WHERE id = :id'
        );
        $update->execute([
            'name' => 'admin',
            'email' => 'admin@reels.local',
            'password_hash' => $passwordHash,
            'id' => (int)$existing['id']
        ]);
        return;
    }

    $insert = $pdo->prepare(
        'INSERT INTO users (name, email, password_hash, username, is_admin)
         VALUES (:name, :email, :password_hash, :username, 1)'
    );
    $insert->execute([
        'name' => 'admin',
        'email' => 'admin@reels.local',
        'password_hash' => $passwordHash,
        'username' => 'admin'
    ]);
}

function app_init_schema(PDO $pdo): void
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            status_text TEXT NOT NULL DEFAULT "",
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )'
    );

    app_migrate_users($pdo);

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS videos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NULL,
            author_handle TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT "",
            language TEXT NOT NULL DEFAULT "ar",
            video_url TEXT NOT NULL,
            poster_url TEXT NOT NULL DEFAULT "",
            views INTEGER NOT NULL DEFAULT 0,
            likes INTEGER NOT NULL DEFAULT 0,
            comments INTEGER NOT NULL DEFAULT 0,
            shares INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT "published",
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            video_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            author_name TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS comment_reactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            comment_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            reaction TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(comment_id, user_id),
            FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            actor_user_id INTEGER NULL,
            type TEXT NOT NULL,
            ref_id INTEGER NOT NULL DEFAULT 0,
            message TEXT NOT NULL,
            is_read INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
        )'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS follows (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            follower_user_id INTEGER NOT NULL,
            following_user_id INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(follower_user_id, following_user_id),
            FOREIGN KEY (follower_user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (following_user_id) REFERENCES users(id) ON DELETE CASCADE
        )'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS video_likes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            video_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(video_id, user_id),
            FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )'
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS video_favorites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            video_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(video_id, user_id),
            FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )'
    );


    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_videos_status_created ON videos(status, created_at DESC)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_comments_video ON comments(video_id, created_at DESC)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment ON comment_reactions(comment_id)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_comment_reactions_user ON comment_reactions(user_id)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_notifications_user_date ON notifications(user_id, created_at DESC)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_user_id, created_at DESC)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_user_id, created_at DESC)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_video_likes_video ON video_likes(video_id)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_video_likes_user ON video_likes(user_id, created_at DESC)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_video_favorites_video ON video_favorites(video_id)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_video_favorites_user ON video_favorites(user_id, created_at DESC)');
}

function app_seed_demo_videos(PDO $pdo): void
{
    $count = (int)$pdo->query('SELECT COUNT(*) FROM videos')->fetchColumn();
    if ($count > 0) {
        return;
    }

    $seed = [
        [
            'author_handle' => '@riyadh.daily',
            'title' => 'ليلة في الرياض',
            'description' => 'رحلة ليلية سريعة في شوارع الرياض.',
            'language' => 'ar',
            'video_url' => 'https://cdn.coverr.co/videos/coverr-driving-through-a-city-at-night-1579/1080p.mp4',
            'poster_url' => 'https://images.pexels.com/photos/1761279/pexels-photo-1761279.jpeg',
            'likes' => 18600,
            'comments' => 920,
            'shares' => 340
        ],
        [
            'author_handle' => '@arab.vibes',
            'title' => 'قهوة الصباح',
            'description' => 'لحظة هدوء مع قهوة قبل بداية اليوم.',
            'language' => 'ar',
            'video_url' => 'https://cdn.coverr.co/videos/coverr-a-cup-of-coffee-on-a-table-1575/1080p.mp4',
            'poster_url' => 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg',
            'likes' => 24500,
            'comments' => 1310,
            'shares' => 740
        ],
        [
            'author_handle' => '@travel.arabia',
            'title' => 'موج البحر',
            'description' => 'لقطة بحرية قصيرة ومريحة.',
            'language' => 'ar',
            'video_url' => 'https://cdn.coverr.co/videos/coverr-waves-crashing-on-the-shore-1567/1080p.mp4',
            'poster_url' => 'https://images.pexels.com/photos/457882/pexels-photo-457882.jpeg',
            'likes' => 32300,
            'comments' => 2090,
            'shares' => 1200
        ],
        [
            'author_handle' => '@fit.arab',
            'title' => 'تمرين سريع',
            'description' => 'بداية يوم أقوى بتمرين خفيف.',
            'language' => 'ar',
            'video_url' => 'https://cdn.coverr.co/videos/coverr-woman-training-in-the-gym-1572/1080p.mp4',
            'poster_url' => 'https://images.pexels.com/photos/841130/pexels-photo-841130.jpeg',
            'likes' => 17100,
            'comments' => 680,
            'shares' => 290
        ]
    ];

    $stmt = $pdo->prepare(
        'INSERT INTO videos (
            user_id, author_handle, title, description, language, video_url, poster_url, likes, comments, shares, status
        ) VALUES (
            NULL, :author_handle, :title, :description, :language, :video_url, :poster_url, :likes, :comments, :shares, "published"
        )'
    );
    foreach ($seed as $row) {
        $stmt->execute($row);
    }
}

function app_db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dataDir = app_root_path('data');
    if (!is_dir($dataDir)) {
        mkdir($dataDir, 0777, true);
    }

    $pdo = new PDO('sqlite:' . app_root_path('data/reels.sqlite'));
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->exec('PRAGMA foreign_keys = ON;');

    app_init_schema($pdo);

    // Keep production database clean by default.
    // Set APP_SEED_DEMO=1 only when you intentionally want demo content.
    $seedDemo = (string)getenv('APP_SEED_DEMO') === '1';
    if ($seedDemo) {
        app_ensure_admin_user($pdo);
        app_seed_demo_videos($pdo);
    }

    return $pdo;
}

function app_current_user(PDO $pdo): ?array
{
    $id = $_SESSION['user_id'] ?? null;
    if (!$id) {
        return null;
    }

    $stmt = $pdo->prepare(
        'SELECT id, name, email, username, avatar_url, bio, status_text, is_admin, created_at
         FROM users
         WHERE id = :id
         LIMIT 1'
    );
    $stmt->execute(['id' => $id]);
    $user = $stmt->fetch();
    if (!$user) {
        unset($_SESSION['user_id']);
        return null;
    }

    $user['id'] = (int)$user['id'];
    $user['is_admin'] = (int)$user['is_admin'] === 1;
    return $user;
}

function app_require_user(PDO $pdo): array
{
    $user = app_current_user($pdo);
    if (!$user) {
        app_json(['ok' => false, 'message' => 'Unauthorized'], 401);
    }
    return $user;
}

function app_require_admin(PDO $pdo): array
{
    $user = app_current_user($pdo);
    if (!$user || empty($user['is_admin'])) {
        app_json(['ok' => false, 'message' => 'Admin access required'], 403);
    }
    return $user;
}

function app_upload_video(array $file): array
{
    if (!isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
        throw new RuntimeException('Invalid upload.');
    }

    $maxBytes = 80 * 1024 * 1024;
    if ((int)$file['size'] <= 0 || (int)$file['size'] > $maxBytes) {
        throw new RuntimeException('Video size must be between 1 byte and 80MB.');
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = (string)$finfo->file($file['tmp_name']);
    $map = [
        'video/mp4' => 'mp4',
        'video/webm' => 'webm',
        'video/quicktime' => 'mov'
    ];
    if (!isset($map[$mime])) {
        throw new RuntimeException('Unsupported video format. Use MP4, WebM, or MOV.');
    }

    $relativeDir = 'uploads/videos/' . date('Y') . '/' . date('m');
    $absDir = app_root_path($relativeDir);
    if (!is_dir($absDir)) {
        mkdir($absDir, 0777, true);
    }

    $filename = bin2hex(random_bytes(10)) . '.' . $map[$mime];
    $absolutePath = $absDir . DIRECTORY_SEPARATOR . $filename;
    if (!move_uploaded_file($file['tmp_name'], $absolutePath)) {
        throw new RuntimeException('Failed to save uploaded file.');
    }

    return ['url' => app_public_url($relativeDir . '/' . $filename), 'mime' => $mime];
}

function app_upload_avatar(array $file): array
{
    if (!isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
        throw new RuntimeException('Invalid image upload.');
    }

    $maxBytes = 5 * 1024 * 1024;
    if ((int)$file['size'] <= 0 || (int)$file['size'] > $maxBytes) {
        throw new RuntimeException('Avatar size must be between 1 byte and 5MB.');
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = (string)$finfo->file($file['tmp_name']);
    $map = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp'
    ];
    if (!isset($map[$mime])) {
        throw new RuntimeException('Unsupported image format. Use JPG, PNG, or WEBP.');
    }

    $relativeDir = 'uploads/avatars/' . date('Y') . '/' . date('m');
    $absDir = app_root_path($relativeDir);
    if (!is_dir($absDir)) {
        mkdir($absDir, 0777, true);
    }

    $filename = bin2hex(random_bytes(10)) . '.' . $map[$mime];
    $absolutePath = $absDir . DIRECTORY_SEPARATOR . $filename;
    if (!move_uploaded_file($file['tmp_name'], $absolutePath)) {
        throw new RuntimeException('Failed to save avatar.');
    }

    return ['url' => app_public_url($relativeDir . '/' . $filename), 'mime' => $mime];
}
