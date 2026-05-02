<?php
declare(strict_types=1);

require_once __DIR__ . '/app/bootstrap.php';

$pdo = app_db();
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$action = (string)($_GET['action'] ?? '');

function app_video_payload(array $row): array
{
    $username = (string)($row['username'] ?? '');
    $author = (string)($row['author_handle'] ?? '');
    if ($author === '' && $username !== '') {
        $author = '@' . $username;
    }

    return [
        'id' => (int)$row['id'],
        'author' => $author,
        'username' => $username,
        'author_name' => (string)($row['user_name'] ?? ''),
        'avatar_url' => (string)($row['avatar_url'] ?? ''),
        'profile_url' => $username !== '' ? ('profile.html?u=' . rawurlencode($username)) : '',
        'title' => (string)$row['title'],
        'description' => (string)$row['description'],
        'language' => (string)$row['language'],
        'video_url' => (string)$row['video_url'],
        'poster_url' => (string)$row['poster_url'],
        'views' => (int)$row['views'],
        'likes' => (int)$row['likes'],
        'is_liked_by_viewer' => (int)($row['is_liked_by_viewer'] ?? 0) === 1,
        'is_favorited_by_viewer' => (int)($row['is_favorited_by_viewer'] ?? 0) === 1,
        'is_following_author' => (int)($row['is_following_author'] ?? 0) === 1,
        'comments' => (int)$row['comments'],
        'shares' => (int)$row['shares'],
        'created_at' => (string)$row['created_at']
    ];
}

function app_fetch_videos(PDO $pdo, string $where = 'v.status = "published"', array $params = [], ?int $viewerUserId = null): array
{
    $viewerPart = '0 AS is_liked_by_viewer, 0 AS is_favorited_by_viewer, 0 AS is_following_author';
    if ($viewerUserId !== null && $viewerUserId > 0) {
        $viewerPart = 'CASE WHEN EXISTS (
                SELECT 1 FROM video_likes vl
                WHERE vl.video_id = v.id AND vl.user_id = :viewer_state_user_id
            ) THEN 1 ELSE 0 END AS is_liked_by_viewer,
            CASE WHEN EXISTS (
                SELECT 1 FROM video_favorites vf
                WHERE vf.video_id = v.id AND vf.user_id = :viewer_state_user_id
            ) THEN 1 ELSE 0 END AS is_favorited_by_viewer,
            CASE WHEN v.user_id IS NOT NULL
                  AND v.user_id != :viewer_state_user_id
                  AND EXISTS (
                      SELECT 1 FROM follows f
                      WHERE f.follower_user_id = :viewer_state_user_id
                        AND f.following_user_id = v.user_id
                  )
            THEN 1 ELSE 0 END AS is_following_author';
        $params['viewer_state_user_id'] = $viewerUserId;
    }

    $stmt = $pdo->prepare(
        'SELECT
            v.id, v.author_handle, v.title, v.description, v.language, v.video_url, v.poster_url,
            v.views, v.likes, v.comments, v.shares, v.created_at,
            u.username, u.name AS user_name, u.avatar_url,
            ' . $viewerPart . '
         FROM videos v
         LEFT JOIN users u ON u.id = v.user_id
         WHERE ' . $where . '
         ORDER BY v.id DESC'
    );
    $stmt->execute($params);
    return $stmt->fetchAll();
}

function app_username_is_valid(string $username): bool
{
    // Allow Arabic/English (and any letter language), numbers, dot, dash, underscore.
    return (bool)preg_match('/^(?=.{3,24}$)[\p{L}\p{N}._-]+$/u', $username);
}

function app_resolve_login_user(PDO $pdo, string $identifier): ?array
{
    if (filter_var($identifier, FILTER_VALIDATE_EMAIL)) {
        $stmt = $pdo->prepare('SELECT * FROM users WHERE email = :identifier LIMIT 1');
        $stmt->execute(['identifier' => mb_strtolower($identifier)]);
        return $stmt->fetch() ?: null;
    }

    $stmt = $pdo->prepare('SELECT * FROM users WHERE username = :identifier LIMIT 1');
    $stmt->execute(['identifier' => mb_strtolower($identifier)]);
    return $stmt->fetch() ?: null;
}

function app_reaction_types(): array
{
    return ['like', 'love', 'haha', 'wow', 'sad'];
}

function app_empty_reaction_totals(): array
{
    return array_fill_keys(app_reaction_types(), 0);
}

function app_extract_mentions(string $content): array
{
    if ($content === '') {
        return [];
    }

    preg_match_all('/(^|[\s\(\[\{>.,!?;:ØŒØ›ØŸ])@([\p{L}\p{N}._-]{3,24})/u', $content, $matches);
    $usernames = [];
    foreach (($matches[2] ?? []) as $username) {
        $normalized = mb_strtolower(trim((string)$username));
        if ($normalized !== '') {
            $usernames[$normalized] = true;
        }
    }
    return array_keys($usernames);
}

function app_push_notification(PDO $pdo, int $userId, ?int $actorUserId, string $type, int $refId, string $message): void
{
    if ($userId <= 0 || $message === '') {
        return;
    }

    $stmt = $pdo->prepare(
        'INSERT INTO notifications (user_id, actor_user_id, type, ref_id, message, is_read)
         VALUES (:user_id, :actor_user_id, :type, :ref_id, :message, 0)'
    );
    $stmt->execute([
        'user_id' => $userId,
        'actor_user_id' => $actorUserId,
        'type' => $type,
        'ref_id' => $refId,
        'message' => $message
    ]);
}

function app_comment_reactions_map(PDO $pdo, array $commentIds, ?int $viewerUserId = null): array
{
    $ids = array_values(array_unique(array_map('intval', $commentIds)));
    if (!$ids) {
        return [];
    }

    $map = [];
    $placeholders = [];
    $params = [];

    foreach ($ids as $i => $id) {
        $key = 'id' . $i;
        $placeholders[] = ':' . $key;
        $params[$key] = $id;
        $map[$id] = [
            'totals' => app_empty_reaction_totals(),
            'total' => 0,
            'mine' => null
        ];
    }

    $inClause = implode(',', $placeholders);

    $totalsStmt = $pdo->prepare(
        'SELECT comment_id, reaction, COUNT(*) AS total
         FROM comment_reactions
         WHERE comment_id IN (' . $inClause . ')
         GROUP BY comment_id, reaction'
    );
    $totalsStmt->execute($params);

    foreach ($totalsStmt->fetchAll() as $row) {
        $commentId = (int)$row['comment_id'];
        $reaction = (string)$row['reaction'];
        $count = (int)$row['total'];
        if (!isset($map[$commentId])) {
            continue;
        }
        if (!array_key_exists($reaction, $map[$commentId]['totals'])) {
            $map[$commentId]['totals'][$reaction] = 0;
        }
        $map[$commentId]['totals'][$reaction] = $count;
        $map[$commentId]['total'] += $count;
    }

    if ($viewerUserId !== null && $viewerUserId > 0) {
        $mineParams = $params;
        $mineParams['viewer_user_id'] = $viewerUserId;

        $mineStmt = $pdo->prepare(
            'SELECT comment_id, reaction
             FROM comment_reactions
             WHERE comment_id IN (' . $inClause . ')
               AND user_id = :viewer_user_id'
        );
        $mineStmt->execute($mineParams);

        foreach ($mineStmt->fetchAll() as $row) {
            $commentId = (int)$row['comment_id'];
            if (!isset($map[$commentId])) {
                continue;
            }
            $map[$commentId]['mine'] = (string)$row['reaction'];
        }
    }

    return $map;
}

function app_comment_payloads(PDO $pdo, array $rows, ?int $viewerUserId = null): array
{
    $commentIds = array_map(static fn(array $row): int => (int)$row['id'], $rows);
    $reactionsMap = app_comment_reactions_map($pdo, $commentIds, $viewerUserId);
    $payload = [];

    foreach ($rows as $row) {
        $id = (int)$row['id'];
        $username = (string)($row['username'] ?? '');
        $reactions = $reactionsMap[$id] ?? [
            'totals' => app_empty_reaction_totals(),
            'total' => 0,
            'mine' => null
        ];

        $payload[] = [
            'id' => $id,
            'video_id' => (int)$row['video_id'],
            'user_id' => (int)$row['user_id'],
            'author_name' => (string)$row['author_name'],
            'author_username' => $username,
            'author_avatar' => (string)($row['avatar_url'] ?? ''),
            'profile_url' => $username !== '' ? ('profile.html?u=' . rawurlencode($username)) : '',
            'content' => (string)$row['content'],
            'created_at' => (string)$row['created_at'],
            'reactions' => $reactions
        ];
    }

    return $payload;
}

function app_follow_counts(PDO $pdo, int $userId): array
{
    $followersStmt = $pdo->prepare('SELECT COUNT(*) FROM follows WHERE following_user_id = :user_id');
    $followersStmt->execute(['user_id' => $userId]);
    $followers = (int)$followersStmt->fetchColumn();

    $followingStmt = $pdo->prepare('SELECT COUNT(*) FROM follows WHERE follower_user_id = :user_id');
    $followingStmt->execute(['user_id' => $userId]);
    $following = (int)$followingStmt->fetchColumn();

    return [
        'followers_count' => $followers,
        'following_count' => $following
    ];
}

function app_is_following(PDO $pdo, int $followerUserId, int $targetUserId): bool
{
    if ($followerUserId <= 0 || $targetUserId <= 0 || $followerUserId === $targetUserId) {
        return false;
    }

    $stmt = $pdo->prepare(
        'SELECT id
         FROM follows
         WHERE follower_user_id = :follower_user_id
           AND following_user_id = :following_user_id
         LIMIT 1'
    );
    $stmt->execute([
        'follower_user_id' => $followerUserId,
        'following_user_id' => $targetUserId
    ]);
    return (bool)$stmt->fetch();
}

function app_user_video_state_ids(PDO $pdo, int $userId): array
{
    if ($userId <= 0) {
        return [
            'liked_video_ids' => [],
            'favorite_video_ids' => []
        ];
    }

    $likedStmt = $pdo->prepare(
        'SELECT video_id
         FROM video_likes
         WHERE user_id = :user_id
         ORDER BY id DESC'
    );
    $likedStmt->execute(['user_id' => $userId]);
    $liked = array_map(static fn($value): int => (int)$value, $likedStmt->fetchAll(PDO::FETCH_COLUMN));

    $favoriteStmt = $pdo->prepare(
        'SELECT video_id
         FROM video_favorites
         WHERE user_id = :user_id
         ORDER BY id DESC'
    );
    $favoriteStmt->execute(['user_id' => $userId]);
    $favorites = array_map(static fn($value): int => (int)$value, $favoriteStmt->fetchAll(PDO::FETCH_COLUMN));

    return [
        'liked_video_ids' => array_values(array_unique($liked)),
        'favorite_video_ids' => array_values(array_unique($favorites))
    ];
}

function app_admin_normalize_project_path(string $path): string
{
    $path = trim(str_replace('\\', '/', $path));
    $path = preg_replace('#/+#', '/', $path) ?? '';
    $path = ltrim($path, '/');
    if ($path === '' || str_contains($path, "\0") || str_contains($path, '..')) {
        app_json(['ok' => false, 'message' => 'Invalid project path.'], 422);
    }
    return $path;
}

function app_admin_allowed_file_path(string $path): bool
{
    static $exact = [
        'tools/generate-portal.mjs',
        'data/topics.json',
        'feed.xml',
        'sitemap.xml',
        'index.html',
        'topics/index.html'
    ];
    if (in_array($path, $exact, true)) {
        return true;
    }
    if (preg_match('#^topics/post-\d+/index\.html$#', $path)) {
        return true;
    }
    if (preg_match('#^topics/page/\d+/index\.html$#', $path)) {
        return true;
    }
    return false;
}

function app_admin_allowed_remove_path(string $path): bool
{
    return (bool)preg_match('#^topics/(post-\d+|page/\d+)$#', $path);
}

function app_admin_resolve_project_path(string $path): string
{
    $normalized = app_admin_normalize_project_path($path);
    if (!app_admin_allowed_file_path($normalized)) {
        app_json(['ok' => false, 'message' => 'Path is not allowed.'], 403);
    }
    return app_root_path($normalized);
}

function app_admin_resolve_remove_path(string $path): string
{
    $normalized = app_admin_normalize_project_path($path);
    if (!app_admin_allowed_remove_path($normalized)) {
        app_json(['ok' => false, 'message' => 'Directory path is not allowed.'], 403);
    }
    return app_root_path($normalized);
}

function app_admin_read_project_file(string $path): string
{
    $absolute = app_admin_resolve_project_path($path);
    if (!is_file($absolute)) {
        app_json(['ok' => false, 'message' => 'File not found.'], 404);
    }
    $content = file_get_contents($absolute);
    if ($content === false) {
        app_json(['ok' => false, 'message' => 'Could not read file.'], 500);
    }
    return $content;
}

function app_admin_write_project_file(string $path, string $content): void
{
    $absolute = app_admin_resolve_project_path($path);
    $dir = dirname($absolute);
    if (!is_dir($dir) && !mkdir($dir, 0777, true) && !is_dir($dir)) {
        app_json(['ok' => false, 'message' => 'Could not create target directory.'], 500);
    }
    if (file_put_contents($absolute, $content) === false) {
        app_json(['ok' => false, 'message' => 'Could not write file.'], 500);
    }
}

function app_admin_delete_directory_recursive(string $absolute): void
{
    $items = scandir($absolute);
    if ($items === false) {
        app_json(['ok' => false, 'message' => 'Could not read directory.'], 500);
    }
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') {
            continue;
        }
        $full = $absolute . DIRECTORY_SEPARATOR . $item;
        if (is_dir($full)) {
            app_admin_delete_directory_recursive($full);
        } elseif (is_file($full)) {
            @unlink($full);
        }
    }
    @rmdir($absolute);
}

function app_admin_remove_project_directory(string $path): void
{
    $absolute = app_admin_resolve_remove_path($path);
    if (!is_dir($absolute)) {
        return;
    }
    app_admin_delete_directory_recursive($absolute);
}

function app_admin_run_shell_command(string $command): array
{
    $descriptors = [
        0 => ['pipe', 'r'],
        1 => ['pipe', 'w'],
        2 => ['pipe', 'w']
    ];
    $process = proc_open($command, $descriptors, $pipes, app_root_path());
    if (!is_resource($process)) {
        app_json(['ok' => false, 'message' => 'Failed to start command.'], 500);
    }

    fclose($pipes[0]);
    $stdout = stream_get_contents($pipes[1]);
    $stderr = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    $exitCode = proc_close($process);

    return [
        'exit_code' => (int)$exitCode,
        'output' => trim((string)$stdout . "\n" . (string)$stderr)
    ];
}

if ($method === 'GET' && $action === 'auth') {
    app_json(['ok' => true, 'user' => app_current_user($pdo)]);
}

if ($method === 'GET' && $action === 'admin_auth') {
    $user = app_current_user($pdo);
    if (!$user || empty($user['is_admin'])) {
        app_json(['ok' => true, 'user' => null]);
    }
    app_json(['ok' => true, 'user' => $user]);
}

if ($method === 'POST' && $action === 'admin_login') {
    $body = app_read_json();
    $username = mb_strtolower(trim((string)($body['username'] ?? '')));
    $password = (string)($body['password'] ?? '');

    if ($username === '' || $password === '') {
        app_json(['ok' => false, 'message' => 'Username and password are required.'], 422);
    }

    $stmt = $pdo->prepare('SELECT * FROM users WHERE username = :username AND is_admin = 1 LIMIT 1');
    $stmt->execute(['username' => $username]);
    $row = $stmt->fetch();
    if (!$row || !password_verify($password, (string)$row['password_hash'])) {
        app_json(['ok' => false, 'message' => 'Invalid admin credentials.'], 401);
    }

    session_regenerate_id(true);
    $_SESSION['user_id'] = (int)$row['id'];
    app_json(['ok' => true, 'user' => app_current_user($pdo)]);
}

if ($method === 'POST' && $action === 'register') {
    $body = app_read_json();
    $name = trim((string)($body['name'] ?? ''));
    $email = mb_strtolower(trim((string)($body['email'] ?? '')));
    $password = (string)($body['password'] ?? '');
    $usernameInput = mb_strtolower(trim((string)($body['username'] ?? '')));

    if ($name === '' || mb_strlen($name) < 2) {
        app_json(['ok' => false, 'message' => 'Name must be at least 2 characters.'], 422);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        app_json(['ok' => false, 'message' => 'Invalid email address.'], 422);
    }
    if (strlen($password) < 6) {
        app_json(['ok' => false, 'message' => 'Password must be at least 6 characters.'], 422);
    }

    $username = $usernameInput !== '' ? app_slugify($usernameInput) : app_slugify($name);
    if (!app_username_is_valid($username)) {
        app_json(['ok' => false, 'message' => 'Username must be 3-24 chars (letters/numbers, dot, dash, underscore).'], 422);
    }
    if ($username === 'admin') {
        app_json(['ok' => false, 'message' => 'This username is reserved.'], 422);
    }
    $username = app_generate_unique_username($pdo, $username);

    $existsEmail = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
    $existsEmail->execute(['email' => $email]);
    if ($existsEmail->fetch()) {
        app_json(['ok' => false, 'message' => 'Email is already registered.'], 409);
    }

    $insert = $pdo->prepare(
        'INSERT INTO users (name, email, password_hash, username, avatar_url, bio, is_admin)
         VALUES (:name, :email, :password_hash, :username, "", "", 0)'
    );
    $insert->execute([
        'name' => $name,
        'email' => $email,
        'password_hash' => password_hash($password, PASSWORD_DEFAULT),
        'username' => $username
    ]);

    session_regenerate_id(true);
    $_SESSION['user_id'] = (int)$pdo->lastInsertId();
    app_json([
        'ok' => true,
        'message' => 'Account created successfully.',
        'user' => app_current_user($pdo)
    ], 201);
}

if ($method === 'POST' && $action === 'login') {
    $body = app_read_json();
    $identifier = trim((string)($body['email'] ?? $body['identifier'] ?? ''));
    $password = (string)($body['password'] ?? '');
    if ($identifier === '' || $password === '') {
        app_json(['ok' => false, 'message' => 'Invalid username/email or password.'], 422);
    }

    $user = app_resolve_login_user($pdo, $identifier);
    if (!$user || !password_verify($password, (string)$user['password_hash'])) {
        app_json(['ok' => false, 'message' => 'Invalid username/email or password.'], 401);
    }

    session_regenerate_id(true);
    $_SESSION['user_id'] = (int)$user['id'];
    app_json(['ok' => true, 'message' => 'Login successful.', 'user' => app_current_user($pdo)]);
}

if ($method === 'POST' && $action === 'logout') {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], (bool)$params['secure'], (bool)$params['httponly']);
    }
    session_destroy();
    app_json(['ok' => true, 'message' => 'Logged out.']);
}

if ($method === 'GET' && $action === 'feed') {
    $mode = mb_strtolower(trim((string)($_GET['mode'] ?? 'for_you')));
    $viewer = app_current_user($pdo);
    $viewerId = $viewer ? (int)$viewer['id'] : null;
    if ($mode === 'following') {
        if (!$viewer) {
            app_json([
                'ok' => true,
                'mode' => 'following',
                'total' => 0,
                'videos' => []
            ]);
        }

        $rows = app_fetch_videos(
            $pdo,
            'v.status = "published" AND v.user_id IN (
                SELECT following_user_id FROM follows WHERE follower_user_id = :viewer_user_id
            )',
            ['viewer_user_id' => (int)$viewer['id']],
            $viewerId
        );
    } else {
        $mode = 'for_you';
        $rows = app_fetch_videos($pdo, 'v.status = "published"', [], $viewerId);
    }

    app_json([
        'ok' => true,
        'mode' => $mode,
        'total' => count($rows),
        'videos' => array_map('app_video_payload', $rows)
    ]);
}

if ($method === 'POST' && $action === 'upload') {
    $user = app_require_user($pdo);
    $title = trim((string)($_POST['title'] ?? ''));
    $description = trim((string)($_POST['description'] ?? ''));
    $language = trim((string)($_POST['language'] ?? 'ar'));
    $titleCompact = preg_replace('/\s+/u', '', $title);

    if (!is_string($titleCompact) || $titleCompact === '') {
        app_json(['ok' => false, 'message' => 'Title is required.'], 422);
    }
    if (!isset($_FILES['video'])) {
        app_json(['ok' => false, 'message' => 'Video file is required.'], 422);
    }

    try {
        $video = app_upload_video($_FILES['video']);
    } catch (RuntimeException $e) {
        app_json(['ok' => false, 'message' => $e->getMessage()], 422);
    }

    $authorHandle = '@' . ($user['username'] ?: app_slugify($user['name']));
    $stmt = $pdo->prepare(
        'INSERT INTO videos (
            user_id, author_handle, title, description, language, video_url, poster_url, status
        ) VALUES (
            :user_id, :author_handle, :title, :description, :language, :video_url, "", "published"
        )'
    );
    $stmt->execute([
        'user_id' => $user['id'],
        'author_handle' => $authorHandle,
        'title' => $title,
        'description' => $description,
        'language' => $language === 'en' ? 'en' : 'ar',
        'video_url' => $video['url']
    ]);

    app_json([
        'ok' => true,
        'message' => 'Video uploaded successfully.',
        'video_id' => (int)$pdo->lastInsertId()
    ], 201);
}

if ($method === 'GET' && $action === 'my_profile') {
    $user = app_require_user($pdo);
    $stmt = $pdo->prepare(
        'SELECT id, author_handle, title, description, language, video_url, poster_url, views, likes, comments, shares, created_at
         FROM videos
         WHERE user_id = :user_id
         ORDER BY id DESC'
    );
    $stmt->execute(['user_id' => $user['id']]);
    $videos = $stmt->fetchAll();
    $follow = app_follow_counts($pdo, (int)$user['id']);

    app_json([
        'ok' => true,
        'profile' => [
            'name' => $user['name'],
            'username' => $user['username'],
            'avatar_url' => $user['avatar_url'],
            'bio' => $user['bio'],
            'status_text' => (string)($user['status_text'] ?? ''),
            'profile_url' => 'profile.html?u=' . rawurlencode((string)$user['username']),
            'followers_count' => $follow['followers_count'],
            'following_count' => $follow['following_count'],
            'is_own_profile' => true,
            'is_following' => false
        ],
        'videos' => array_map('app_video_payload', $videos)
    ]);
}

if ($method === 'POST' && $action === 'update_profile') {
    $user = app_require_user($pdo);
    $name = trim((string)($_POST['name'] ?? $user['name']));
    $bio = trim((string)($_POST['bio'] ?? $user['bio']));
    $statusText = trim((string)($_POST['status_text'] ?? ($user['status_text'] ?? '')));
    $usernameInput = mb_strtolower(trim((string)($_POST['username'] ?? $user['username'])));

    if ($name === '' || mb_strlen($name) < 2) {
        app_json(['ok' => false, 'message' => 'Name must be at least 2 characters.'], 422);
    }
    if (mb_strlen($statusText) > 120) {
        app_json(['ok' => false, 'message' => 'Status must be 120 characters or less.'], 422);
    }

    $username = app_slugify($usernameInput);
    if (!app_username_is_valid($username)) {
        app_json(['ok' => false, 'message' => 'Username must be 3-24 chars (letters/numbers, dot, dash, underscore).'], 422);
    }
    if ($username === 'admin' && empty($user['is_admin'])) {
        app_json(['ok' => false, 'message' => 'This username is reserved.'], 422);
    }
    $username = app_generate_unique_username($pdo, $username, (int)$user['id']);

    $avatarUrl = (string)$user['avatar_url'];
    if (isset($_FILES['avatar']) && is_array($_FILES['avatar']) && ($_FILES['avatar']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
        try {
            $avatar = app_upload_avatar($_FILES['avatar']);
            $avatarUrl = $avatar['url'];
        } catch (RuntimeException $e) {
            app_json(['ok' => false, 'message' => $e->getMessage()], 422);
        }
    }

    $update = $pdo->prepare(
        'UPDATE users
         SET name = :name, username = :username, bio = :bio, status_text = :status_text, avatar_url = :avatar_url
         WHERE id = :id'
    );
    $update->execute([
        'name' => $name,
        'username' => $username,
        'bio' => $bio,
        'status_text' => $statusText,
        'avatar_url' => $avatarUrl,
        'id' => $user['id']
    ]);

    $authorHandle = '@' . $username;
    $pdo->prepare('UPDATE videos SET author_handle = :author_handle WHERE user_id = :user_id')
        ->execute(['author_handle' => $authorHandle, 'user_id' => $user['id']]);

    app_json([
        'ok' => true,
        'message' => 'Profile updated successfully.',
        'user' => app_current_user($pdo)
    ]);
}

if ($method === 'GET' && $action === 'profile') {
    $username = mb_strtolower(trim((string)($_GET['u'] ?? '')));
    if ($username === '') {
        app_json(['ok' => false, 'message' => 'Username is required.'], 422);
    }

    $userStmt = $pdo->prepare(
        'SELECT id, name, username, avatar_url, bio, status_text, created_at
         FROM users
         WHERE username = :username
         LIMIT 1'
    );
    $userStmt->execute(['username' => $username]);
    $profile = $userStmt->fetch();
    if (!$profile) {
        app_json(['ok' => false, 'message' => 'Profile not found.'], 404);
    }

    $viewer = app_current_user($pdo);
    $viewerId = $viewer ? (int)$viewer['id'] : 0;
    $profileId = (int)$profile['id'];
    $follow = app_follow_counts($pdo, $profileId);
    $isOwnProfile = $viewerId > 0 && $viewerId === $profileId;
    $isFollowing = $viewerId > 0 ? app_is_following($pdo, $viewerId, $profileId) : false;

    $videosStmt = $pdo->prepare(
        'SELECT
            v.id, v.author_handle, v.title, v.description, v.language, v.video_url, v.poster_url,
            v.views, v.likes, v.comments, v.shares, v.created_at,
            u.username, u.name AS user_name, u.avatar_url,
            CASE WHEN :viewer_state_user_id > 0 AND EXISTS (
                SELECT 1 FROM video_likes vl
                WHERE vl.video_id = v.id AND vl.user_id = :viewer_state_user_id
            ) THEN 1 ELSE 0 END AS is_liked_by_viewer,
            CASE WHEN :viewer_state_user_id > 0 AND EXISTS (
                SELECT 1 FROM video_favorites vf
                WHERE vf.video_id = v.id AND vf.user_id = :viewer_state_user_id
            ) THEN 1 ELSE 0 END AS is_favorited_by_viewer
         FROM videos v
         JOIN users u ON u.id = v.user_id
         WHERE u.id = :user_id
         ORDER BY v.id DESC'
    );
    $videosStmt->execute([
        'user_id' => (int)$profile['id'],
        'viewer_state_user_id' => $viewerId
    ]);
    $videos = $videosStmt->fetchAll();

    $viewerVideoStates = $viewerId > 0 ? app_user_video_state_ids($pdo, $viewerId) : [
        'liked_video_ids' => [],
        'favorite_video_ids' => []
    ];

    app_json([
        'ok' => true,
        'profile' => [
            'name' => (string)$profile['name'],
            'username' => (string)$profile['username'],
            'avatar_url' => (string)$profile['avatar_url'],
            'bio' => (string)$profile['bio'],
            'status_text' => (string)($profile['status_text'] ?? ''),
            'created_at' => (string)$profile['created_at'],
            'profile_url' => 'profile.html?u=' . rawurlencode((string)$profile['username']),
            'followers_count' => $follow['followers_count'],
            'following_count' => $follow['following_count'],
            'is_own_profile' => $isOwnProfile,
            'is_following' => $isFollowing
        ],
        'videos' => array_map('app_video_payload', $videos),
        'viewer_video_states' => $viewerVideoStates
    ]);
}

if ($method === 'GET' && $action === 'follow_lists') {
    $username = mb_strtolower(trim((string)($_GET['u'] ?? '')));
    $viewer = app_current_user($pdo);

    if ($username === '') {
        if (!$viewer) {
            app_json(['ok' => false, 'message' => 'Username is required.'], 422);
        }
        $username = (string)$viewer['username'];
    }

    $targetStmt = $pdo->prepare(
        'SELECT id, username, name, avatar_url
         FROM users
         WHERE username = :username
         LIMIT 1'
    );
    $targetStmt->execute(['username' => $username]);
    $target = $targetStmt->fetch();
    if (!$target) {
        app_json(['ok' => false, 'message' => 'Profile not found.'], 404);
    }

    $followersStmt = $pdo->prepare(
        'SELECT u.id, u.username, u.name, u.avatar_url
         FROM follows f
         JOIN users u ON u.id = f.follower_user_id
         WHERE f.following_user_id = :user_id
         ORDER BY f.id DESC
         LIMIT 300'
    );
    $followersStmt->execute(['user_id' => (int)$target['id']]);
    $followers = $followersStmt->fetchAll();

    $followingStmt = $pdo->prepare(
        'SELECT u.id, u.username, u.name, u.avatar_url
         FROM follows f
         JOIN users u ON u.id = f.following_user_id
         WHERE f.follower_user_id = :user_id
         ORDER BY f.id DESC
         LIMIT 300'
    );
    $followingStmt->execute(['user_id' => (int)$target['id']]);
    $following = $followingStmt->fetchAll();

    $mapUser = static function (array $row): array {
        $username = (string)($row['username'] ?? '');
        return [
            'id' => (int)$row['id'],
            'name' => (string)($row['name'] ?? ''),
            'username' => $username,
            'avatar_url' => (string)($row['avatar_url'] ?? ''),
            'profile_url' => $username !== '' ? ('profile.html?u=' . rawurlencode($username)) : ''
        ];
    };

    app_json([
        'ok' => true,
        'user' => [
            'id' => (int)$target['id'],
            'username' => (string)$target['username'],
            'name' => (string)$target['name']
        ],
        'followers' => array_map($mapUser, $followers),
        'following' => array_map($mapUser, $following)
    ]);
}

if ($method === 'POST' && $action === 'toggle_follow') {
    $viewer = app_require_user($pdo);
    $body = app_read_json();
    $targetUsername = mb_strtolower(trim((string)($body['username'] ?? '')));
    $targetUserId = (int)($body['user_id'] ?? 0);

    if ($targetUsername === '' && $targetUserId <= 0) {
        app_json(['ok' => false, 'message' => 'Target user is required.'], 422);
    }

    if ($targetUsername !== '') {
        $targetStmt = $pdo->prepare(
            'SELECT id, username, name FROM users WHERE username = :username LIMIT 1'
        );
        $targetStmt->execute(['username' => $targetUsername]);
    } else {
        $targetStmt = $pdo->prepare(
            'SELECT id, username, name FROM users WHERE id = :id LIMIT 1'
        );
        $targetStmt->execute(['id' => $targetUserId]);
    }
    $target = $targetStmt->fetch();
    if (!$target) {
        app_json(['ok' => false, 'message' => 'Target user not found.'], 404);
    }

    $viewerId = (int)$viewer['id'];
    $targetId = (int)$target['id'];
    if ($viewerId === $targetId) {
        app_json(['ok' => false, 'message' => 'You cannot follow yourself.'], 422);
    }

    $existingStmt = $pdo->prepare(
        'SELECT id
         FROM follows
         WHERE follower_user_id = :follower_user_id
           AND following_user_id = :following_user_id
         LIMIT 1'
    );
    $existingStmt->execute([
        'follower_user_id' => $viewerId,
        'following_user_id' => $targetId
    ]);
    $existing = $existingStmt->fetch();

    if ($existing) {
        $pdo->prepare(
            'DELETE FROM follows
             WHERE follower_user_id = :follower_user_id
               AND following_user_id = :following_user_id'
        )->execute([
            'follower_user_id' => $viewerId,
            'following_user_id' => $targetId
        ]);
        $isFollowing = false;
    } else {
        $pdo->prepare(
            'INSERT INTO follows (follower_user_id, following_user_id)
             VALUES (:follower_user_id, :following_user_id)'
        )->execute([
            'follower_user_id' => $viewerId,
            'following_user_id' => $targetId
        ]);
        $isFollowing = true;

        app_push_notification(
            $pdo,
            $targetId,
            $viewerId,
            'follow',
            $viewerId,
            sprintf('%s started following you.', (string)$viewer['name'])
        );
    }

    $targetCounts = app_follow_counts($pdo, $targetId);
    $viewerCounts = app_follow_counts($pdo, $viewerId);

    app_json([
        'ok' => true,
        'is_following' => $isFollowing,
        'target' => [
            'id' => $targetId,
            'username' => (string)$target['username'],
            'followers_count' => $targetCounts['followers_count'],
            'following_count' => $targetCounts['following_count']
        ],
        'viewer' => [
            'id' => $viewerId,
            'followers_count' => $viewerCounts['followers_count'],
            'following_count' => $viewerCounts['following_count']
        ]
    ]);
}

if ($method === 'POST' && $action === 'share_video') {
    $body = app_read_json();
    $videoId = (int)($body['video_id'] ?? 0);
    $mode = mb_strtolower(trim((string)($body['mode'] ?? 'external')));
    $user = null;

    if ($videoId <= 0) {
        app_json(['ok' => false, 'message' => 'Invalid video id.'], 422);
    }
    if (!in_array($mode, ['external', 'copy', 'repost'], true)) {
        app_json(['ok' => false, 'message' => 'Invalid share mode.'], 422);
    }

    $videoStmt = $pdo->prepare(
        'SELECT id, user_id, author_handle, title, description, language, video_url, poster_url, shares
         FROM videos
         WHERE id = :id
         LIMIT 1'
    );
    $videoStmt->execute(['id' => $videoId]);
    $video = $videoStmt->fetch();
    if (!$video) {
        app_json(['ok' => false, 'message' => 'Video not found.'], 404);
    }

    if ($mode === 'repost') {
        $user = app_require_user($pdo);
    }

    $pdo->prepare('UPDATE videos SET shares = shares + 1 WHERE id = :id')->execute(['id' => $videoId]);
    $sharesStmt = $pdo->prepare('SELECT shares FROM videos WHERE id = :id LIMIT 1');
    $sharesStmt->execute(['id' => $videoId]);
    $sharesCount = (int)$sharesStmt->fetchColumn();

    $response = [
        'ok' => true,
        'video_id' => $videoId,
        'mode' => $mode,
        'shares_count' => $sharesCount
    ];

    if ($mode === 'repost') {
        $authorHandle = '@' . ((string)$user['username'] !== '' ? (string)$user['username'] : app_slugify((string)$user['name']));
        $sourceHandle = trim((string)($video['author_handle'] ?? ''));
        $sourcePart = $sourceHandle !== '' ? (' Â· Ù…Ù† ' . $sourceHandle) : '';

        $title = trim('Ø¥Ø¹Ø§Ø¯Ø© Ù…Ø´Ø§Ø±ÙƒØ©: ' . (string)$video['title']);
        if ($title === '') {
            $title = 'Ø¥Ø¹Ø§Ø¯Ø© Ù…Ø´Ø§Ø±ÙƒØ©';
        }

        $description = trim((string)$video['description']);
        if ($description !== '') {
            $description .= PHP_EOL . PHP_EOL;
        }
        $description .= 'ØªÙ…Øª Ø§Ù„Ù…Ø´Ø§Ø±ÙƒØ© Ù…Ù† ØµÙØ­Ø© Ø§Ù„ÙÙŠØ¯ÙŠÙˆ' . $sourcePart;

        $insertStmt = $pdo->prepare(
            'INSERT INTO videos (
                user_id, author_handle, title, description, language, video_url, poster_url, status
             ) VALUES (
                :user_id, :author_handle, :title, :description, :language, :video_url, :poster_url, "published"
             )'
        );
        $insertStmt->execute([
            'user_id' => (int)$user['id'],
            'author_handle' => $authorHandle,
            'title' => mb_substr($title, 0, 120),
            'description' => mb_substr($description, 0, 500),
            'language' => ((string)$video['language'] === 'en' ? 'en' : 'ar'),
            'video_url' => (string)$video['video_url'],
            'poster_url' => (string)$video['poster_url']
        ]);

        $response['repost_video_id'] = (int)$pdo->lastInsertId();
    }

    app_json($response);
}

if ($method === 'GET' && $action === 'video_preferences') {
    $user = app_require_user($pdo);
    $states = app_user_video_state_ids($pdo, (int)$user['id']);
    app_json([
        'ok' => true,
        'liked_video_ids' => $states['liked_video_ids'],
        'favorite_video_ids' => $states['favorite_video_ids']
    ]);
}

if ($method === 'POST' && $action === 'set_video_like') {
    $user = app_require_user($pdo);
    $body = app_read_json();
    $videoId = (int)($body['video_id'] ?? 0);
    if ($videoId <= 0) {
        app_json(['ok' => false, 'message' => 'Invalid video id.'], 422);
    }

    $videoStmt = $pdo->prepare('SELECT id, user_id, likes FROM videos WHERE id = :id LIMIT 1');
    $videoStmt->execute(['id' => $videoId]);
    $video = $videoStmt->fetch();
    if (!$video) {
        app_json(['ok' => false, 'message' => 'Video not found.'], 404);
    }

    $existingStmt = $pdo->prepare(
        'SELECT id FROM video_likes WHERE video_id = :video_id AND user_id = :user_id LIMIT 1'
    );
    $existingStmt->execute([
        'video_id' => $videoId,
        'user_id' => (int)$user['id']
    ]);
    $exists = (bool)$existingStmt->fetch();

    $desired = null;
    if (array_key_exists('liked', $body)) {
        $desired = filter_var($body['liked'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        if ($desired === null) {
            app_json(['ok' => false, 'message' => 'Invalid liked value.'], 422);
        }
    }
    $nextLiked = $desired ?? !$exists;

    if ($nextLiked && !$exists) {
        $pdo->prepare(
            'INSERT INTO video_likes (video_id, user_id) VALUES (:video_id, :user_id)'
        )->execute([
            'video_id' => $videoId,
            'user_id' => (int)$user['id']
        ]);

        $pdo->prepare('UPDATE videos SET likes = likes + 1 WHERE id = :id')->execute(['id' => $videoId]);

        $videoOwnerId = (int)($video['user_id'] ?? 0);
        if ($videoOwnerId > 0 && $videoOwnerId !== (int)$user['id']) {
            app_push_notification(
                $pdo,
                $videoOwnerId,
                (int)$user['id'],
                'video_like',
                $videoId,
                sprintf('%s liked your video.', (string)$user['name'])
            );
        }
    } elseif (!$nextLiked && $exists) {
        $pdo->prepare(
            'DELETE FROM video_likes WHERE video_id = :video_id AND user_id = :user_id'
        )->execute([
            'video_id' => $videoId,
            'user_id' => (int)$user['id']
        ]);

        $pdo->prepare(
            'UPDATE videos SET likes = CASE WHEN likes > 0 THEN likes - 1 ELSE 0 END WHERE id = :id'
        )->execute(['id' => $videoId]);
    }

    $countStmt = $pdo->prepare('SELECT likes FROM videos WHERE id = :id LIMIT 1');
    $countStmt->execute(['id' => $videoId]);
    $likesCount = (int)$countStmt->fetchColumn();

    app_json([
        'ok' => true,
        'video_id' => $videoId,
        'is_liked' => $nextLiked,
        'likes_count' => $likesCount
    ]);
}

if ($method === 'POST' && $action === 'set_video_favorite') {
    $user = app_require_user($pdo);
    $body = app_read_json();
    $videoId = (int)($body['video_id'] ?? 0);
    if ($videoId <= 0) {
        app_json(['ok' => false, 'message' => 'Invalid video id.'], 422);
    }

    $videoStmt = $pdo->prepare('SELECT id FROM videos WHERE id = :id LIMIT 1');
    $videoStmt->execute(['id' => $videoId]);
    if (!$videoStmt->fetch()) {
        app_json(['ok' => false, 'message' => 'Video not found.'], 404);
    }

    $existingStmt = $pdo->prepare(
        'SELECT id FROM video_favorites WHERE video_id = :video_id AND user_id = :user_id LIMIT 1'
    );
    $existingStmt->execute([
        'video_id' => $videoId,
        'user_id' => (int)$user['id']
    ]);
    $exists = (bool)$existingStmt->fetch();

    $desired = null;
    if (array_key_exists('favorited', $body)) {
        $desired = filter_var($body['favorited'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        if ($desired === null) {
            app_json(['ok' => false, 'message' => 'Invalid favorited value.'], 422);
        }
    }
    $nextFavorited = $desired ?? !$exists;

    if ($nextFavorited && !$exists) {
        $pdo->prepare(
            'INSERT INTO video_favorites (video_id, user_id) VALUES (:video_id, :user_id)'
        )->execute([
            'video_id' => $videoId,
            'user_id' => (int)$user['id']
        ]);
    } elseif (!$nextFavorited && $exists) {
        $pdo->prepare(
            'DELETE FROM video_favorites WHERE video_id = :video_id AND user_id = :user_id'
        )->execute([
            'video_id' => $videoId,
            'user_id' => (int)$user['id']
        ]);
    }

    app_json([
        'ok' => true,
        'video_id' => $videoId,
        'is_favorited' => $nextFavorited
    ]);
}

if ($method === 'GET' && $action === 'comments') {
    $videoId = (int)($_GET['video_id'] ?? 0);
    if ($videoId <= 0) {
        app_json(['ok' => false, 'message' => 'Invalid video id.'], 422);
    }

    $viewer = app_current_user($pdo);
    $viewerId = $viewer ? (int)$viewer['id'] : null;

    $stmt = $pdo->prepare(
        'SELECT
            c.id, c.video_id, c.user_id, c.author_name, c.content, c.created_at,
            u.username, u.avatar_url
         FROM comments c
         LEFT JOIN users u ON u.id = c.user_id
         WHERE c.video_id = :video_id
         ORDER BY c.id DESC
         LIMIT 80'
    );
    $stmt->execute(['video_id' => $videoId]);
    $rows = $stmt->fetchAll();

    app_json([
        'ok' => true,
        'comments' => app_comment_payloads($pdo, $rows, $viewerId)
    ]);
}

if ($method === 'POST' && $action === 'add_comment') {
    $user = app_require_user($pdo);
    $body = app_read_json();
    $videoId = (int)($body['video_id'] ?? 0);
    $content = trim((string)($body['content'] ?? ''));

    if ($videoId <= 0) {
        app_json(['ok' => false, 'message' => 'Invalid video id.'], 422);
    }
    if ($content === '' || mb_strlen($content) < 1) {
        app_json(['ok' => false, 'message' => 'Comment cannot be empty.'], 422);
    }
    if (mb_strlen($content) > 400) {
        app_json(['ok' => false, 'message' => 'Comment is too long.'], 422);
    }

    $check = $pdo->prepare('SELECT id, user_id, title FROM videos WHERE id = :id LIMIT 1');
    $check->execute(['id' => $videoId]);
    $video = $check->fetch();
    if (!$video) {
        app_json(['ok' => false, 'message' => 'Video not found.'], 404);
    }

    $insert = $pdo->prepare(
        'INSERT INTO comments (video_id, user_id, author_name, content)
         VALUES (:video_id, :user_id, :author_name, :content)'
    );
    $insert->execute([
        'video_id' => $videoId,
        'user_id' => $user['id'],
        'author_name' => $user['name'],
        'content' => $content
    ]);
    $newCommentId = (int)$pdo->lastInsertId();

    $pdo->prepare('UPDATE videos SET comments = comments + 1 WHERE id = :id')->execute(['id' => $videoId]);

    $fetch = $pdo->prepare(
        'SELECT
            c.id, c.video_id, c.user_id, c.author_name, c.content, c.created_at,
            u.username, u.avatar_url
         FROM comments c
         LEFT JOIN users u ON u.id = c.user_id
         WHERE c.id = :id
         LIMIT 1'
    );
    $fetch->execute(['id' => $newCommentId]);
    $commentRow = $fetch->fetch() ?: [];

    $videoOwnerId = (int)($video['user_id'] ?? 0);
    if ($videoOwnerId > 0 && $videoOwnerId !== (int)$user['id']) {
        app_push_notification(
            $pdo,
            $videoOwnerId,
            (int)$user['id'],
            'comment',
            $videoId,
            sprintf('%s commented on your video.', (string)$user['name'])
        );
    }

    $mentions = app_extract_mentions($content);
    if ($mentions) {
        $mentionStmt = $pdo->prepare('SELECT id, username FROM users WHERE username = :username LIMIT 1');
        foreach ($mentions as $mentionedUsername) {
            $mentionStmt->execute(['username' => $mentionedUsername]);
            $mentionedUser = $mentionStmt->fetch();
            if (!$mentionedUser) {
                continue;
            }
            $mentionedUserId = (int)$mentionedUser['id'];
            if ($mentionedUserId === (int)$user['id']) {
                continue;
            }
            app_push_notification(
                $pdo,
                $mentionedUserId,
                (int)$user['id'],
                'mention',
                $newCommentId,
                sprintf('%s mentioned you in a comment.', (string)$user['name'])
            );
        }
    }

    $countStmt = $pdo->prepare('SELECT comments FROM videos WHERE id = :id LIMIT 1');
    $countStmt->execute(['id' => $videoId]);
    $count = (int)$countStmt->fetchColumn();

    app_json([
        'ok' => true,
        'comment' => app_comment_payloads($pdo, [$commentRow], (int)$user['id'])[0] ?? null,
        'comments_count' => $count
    ], 201);
}

if ($method === 'POST' && $action === 'react_comment') {
    $user = app_require_user($pdo);
    $body = app_read_json();
    $commentId = (int)($body['comment_id'] ?? 0);
    $reaction = mb_strtolower(trim((string)($body['reaction'] ?? '')));

    if ($commentId <= 0) {
        app_json(['ok' => false, 'message' => 'Invalid comment id.'], 422);
    }

    $allowedReactions = app_reaction_types();
    if ($reaction !== '' && $reaction !== 'none' && !in_array($reaction, $allowedReactions, true)) {
        app_json(['ok' => false, 'message' => 'Invalid reaction type.'], 422);
    }

    $commentStmt = $pdo->prepare(
        'SELECT id, user_id, video_id
         FROM comments
         WHERE id = :id
         LIMIT 1'
    );
    $commentStmt->execute(['id' => $commentId]);
    $comment = $commentStmt->fetch();
    if (!$comment) {
        app_json(['ok' => false, 'message' => 'Comment not found.'], 404);
    }

    $existingStmt = $pdo->prepare(
        'SELECT reaction
         FROM comment_reactions
         WHERE comment_id = :comment_id AND user_id = :user_id
         LIMIT 1'
    );
    $existingStmt->execute([
        'comment_id' => $commentId,
        'user_id' => $user['id']
    ]);
    $existing = $existingStmt->fetchColumn();
    $nextReaction = null;

    if ($reaction === '' || $reaction === 'none') {
        if ($existing !== false) {
            $pdo->prepare('DELETE FROM comment_reactions WHERE comment_id = :comment_id AND user_id = :user_id')
                ->execute(['comment_id' => $commentId, 'user_id' => $user['id']]);
        }
    } else {
        if ($existing !== false && (string)$existing === $reaction) {
            $pdo->prepare('DELETE FROM comment_reactions WHERE comment_id = :comment_id AND user_id = :user_id')
                ->execute(['comment_id' => $commentId, 'user_id' => $user['id']]);
        } elseif ($existing !== false) {
            $pdo->prepare(
                'UPDATE comment_reactions
                 SET reaction = :reaction, updated_at = CURRENT_TIMESTAMP
                 WHERE comment_id = :comment_id AND user_id = :user_id'
            )->execute([
                'reaction' => $reaction,
                'comment_id' => $commentId,
                'user_id' => $user['id']
            ]);
            $nextReaction = $reaction;
        } else {
            $pdo->prepare(
                'INSERT INTO comment_reactions (comment_id, user_id, reaction)
                 VALUES (:comment_id, :user_id, :reaction)'
            )->execute([
                'comment_id' => $commentId,
                'user_id' => $user['id'],
                'reaction' => $reaction
            ]);
            $nextReaction = $reaction;
        }
    }

    $commentOwnerId = (int)($comment['user_id'] ?? 0);
    if ($nextReaction !== null && $commentOwnerId > 0 && $commentOwnerId !== (int)$user['id']) {
        app_push_notification(
            $pdo,
            $commentOwnerId,
            (int)$user['id'],
            'comment_reaction',
            $commentId,
            sprintf('%s reacted to your comment.', (string)$user['name'])
        );
    }

    $reactionsMap = app_comment_reactions_map($pdo, [$commentId], (int)$user['id']);

    app_json([
        'ok' => true,
        'comment_id' => $commentId,
        'reactions' => $reactionsMap[$commentId] ?? [
            'totals' => app_empty_reaction_totals(),
            'total' => 0,
            'mine' => null
        ]
    ]);
}

if ($method === 'GET' && $action === 'notifications') {
    $user = app_require_user($pdo);

    $notificationsStmt = $pdo->prepare(
        'SELECT
            n.id, n.type, n.ref_id, n.message, n.is_read, n.created_at, n.actor_user_id,
            u.name AS actor_name, u.username AS actor_username
         FROM notifications n
         LEFT JOIN users u ON u.id = n.actor_user_id
         WHERE n.user_id = :user_id
         ORDER BY n.id DESC
         LIMIT 60'
    );
    $notificationsStmt->execute(['user_id' => $user['id']]);
    $notifications = $notificationsStmt->fetchAll();

    $unreadStmt = $pdo->prepare('SELECT COUNT(*) FROM notifications WHERE user_id = :user_id AND is_read = 0');
    $unreadStmt->execute(['user_id' => $user['id']]);
    $unreadCount = (int)$unreadStmt->fetchColumn();

    app_json([
        'ok' => true,
        'unread_count' => $unreadCount,
        'notifications' => array_map(static function (array $row): array {
            return [
                'id' => (int)$row['id'],
                'type' => (string)$row['type'],
                'ref_id' => (int)$row['ref_id'],
                'message' => (string)$row['message'],
                'is_read' => (int)$row['is_read'] === 1,
                'created_at' => (string)$row['created_at'],
                'actor_user_id' => $row['actor_user_id'] !== null ? (int)$row['actor_user_id'] : null,
                'actor_name' => (string)($row['actor_name'] ?? ''),
                'actor_username' => (string)($row['actor_username'] ?? '')
            ];
        }, $notifications)
    ]);
}

if ($method === 'POST' && $action === 'notifications_mark_read') {
    $user = app_require_user($pdo);
    $pdo->prepare('UPDATE notifications SET is_read = 1 WHERE user_id = :user_id AND is_read = 0')
        ->execute(['user_id' => $user['id']]);
    app_json(['ok' => true, 'unread_count' => 0]);
}

if ($method === 'GET' && $action === 'my_videos') {
    $user = app_require_user($pdo);
    $rows = app_fetch_videos($pdo, 'v.user_id = :user_id', ['user_id' => $user['id']], (int)$user['id']);
    app_json(['ok' => true, 'videos' => array_map('app_video_payload', $rows)]);
}

if ($method === 'GET' && $action === 'dashboard_stats') {
    $user = app_require_user($pdo);
    $stmt = $pdo->prepare(
        'SELECT
            COUNT(*) AS total_videos,
            COALESCE(SUM(views), 0) AS total_views,
            COALESCE(SUM(likes), 0) AS total_likes,
            COALESCE(SUM(comments), 0) AS total_comments,
            COALESCE(SUM(shares), 0) AS total_shares
         FROM videos
         WHERE user_id = :user_id'
    );
    $stmt->execute(['user_id' => $user['id']]);
    $stats = $stmt->fetch() ?: [];
    app_json([
        'ok' => true,
        'stats' => [
            'total_videos' => (int)($stats['total_videos'] ?? 0),
            'total_views' => (int)($stats['total_views'] ?? 0),
            'total_likes' => (int)($stats['total_likes'] ?? 0),
            'total_comments' => (int)($stats['total_comments'] ?? 0),
            'total_shares' => (int)($stats['total_shares'] ?? 0)
        ]
    ]);
}

if ($method === 'POST' && $action === 'delete_video') {
    $user = app_require_user($pdo);
    $body = app_read_json();
    $videoId = (int)($body['video_id'] ?? 0);
    if ($videoId <= 0) {
        app_json(['ok' => false, 'message' => 'Invalid video id.'], 422);
    }

    $stmt = $pdo->prepare('SELECT id, video_url FROM videos WHERE id = :id AND user_id = :user_id LIMIT 1');
    $stmt->execute(['id' => $videoId, 'user_id' => $user['id']]);
    $video = $stmt->fetch();
    if (!$video) {
        app_json(['ok' => false, 'message' => 'Video not found.'], 404);
    }

    $pdo->prepare('DELETE FROM videos WHERE id = :id')->execute(['id' => $videoId]);
    $url = (string)$video['video_url'];
    if (strpos($url, '/uploads/videos/') === 0) {
        $absolute = app_root_path(ltrim($url, '/'));
        if (is_file($absolute)) {
            @unlink($absolute);
        }
    }
    app_json(['ok' => true, 'message' => 'Video deleted.']);
}

if ($method === 'GET' && $action === 'admin_stats') {
    app_require_admin($pdo);
    $stmt = $pdo->query(
        'SELECT
            COUNT(*) AS total_videos,
            COALESCE(SUM(views), 0) AS total_views,
            COALESCE(SUM(likes), 0) AS total_likes,
            COALESCE(SUM(comments), 0) AS total_comments,
            COALESCE(SUM(shares), 0) AS total_shares
         FROM videos'
    );
    $stats = $stmt->fetch() ?: [];
    app_json([
        'ok' => true,
        'stats' => [
            'total_videos' => (int)($stats['total_videos'] ?? 0),
            'total_views' => (int)($stats['total_views'] ?? 0),
            'total_likes' => (int)($stats['total_likes'] ?? 0),
            'total_comments' => (int)($stats['total_comments'] ?? 0),
            'total_shares' => (int)($stats['total_shares'] ?? 0)
        ]
    ]);
}

if ($method === 'GET' && $action === 'admin_videos') {
    app_require_admin($pdo);
    $rows = app_fetch_videos($pdo, '1=1');
    app_json(['ok' => true, 'videos' => array_map('app_video_payload', $rows)]);
}

if ($method === 'POST' && $action === 'admin_delete_video') {
    app_require_admin($pdo);
    $body = app_read_json();
    $videoId = (int)($body['video_id'] ?? 0);
    if ($videoId <= 0) {
        app_json(['ok' => false, 'message' => 'Invalid video id.'], 422);
    }

    $stmt = $pdo->prepare('SELECT id, video_url FROM videos WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $videoId]);
    $video = $stmt->fetch();
    if (!$video) {
        app_json(['ok' => false, 'message' => 'Video not found.'], 404);
    }

    $pdo->prepare('DELETE FROM videos WHERE id = :id')->execute(['id' => $videoId]);
    $url = (string)$video['video_url'];
    if (strpos($url, '/uploads/videos/') === 0) {
        $absolute = app_root_path(ltrim($url, '/'));
        if (is_file($absolute)) {
            @unlink($absolute);
        }
    }
    app_json(['ok' => true, 'message' => 'Video deleted by admin.']);
}

if ($method === 'GET' && $action === 'admin_portal_file') {
    app_require_admin($pdo);
    $path = (string)($_GET['path'] ?? '');
    $content = app_admin_read_project_file($path);
    app_json([
        'ok' => true,
        'path' => app_admin_normalize_project_path($path),
        'project_root' => app_root_path(),
        'content' => $content
    ]);
}

if ($method === 'POST' && $action === 'admin_portal_write') {
    app_require_admin($pdo);
    $body = app_read_json();
    $path = (string)($body['path'] ?? '');
    $content = (string)($body['content'] ?? '');
    app_admin_write_project_file($path, $content);
    app_json([
        'ok' => true,
        'message' => 'File written successfully.',
        'path' => app_admin_normalize_project_path($path),
        'project_root' => app_root_path()
    ]);
}

if ($method === 'POST' && $action === 'admin_portal_remove') {
    app_require_admin($pdo);
    $body = app_read_json();
    $path = (string)($body['path'] ?? '');
    app_admin_remove_project_directory($path);
    app_json([
        'ok' => true,
        'message' => 'Directory removed successfully.',
        'path' => app_admin_normalize_project_path($path)
    ]);
}

if ($method === 'POST' && $action === 'admin_portal_run') {
    app_require_admin($pdo);
    $body = app_read_json();
    $command = (string)($body['command'] ?? '');
    $spec = null;
    if ($command === 'build') {
        $spec = 'node tools/prepare-cloudflare-dist.mjs';
    } elseif ($command === 'deploy') {
        $spec = 'npx wrangler pages deploy cf-dist --project-name chat-egy --branch main --commit-dirty=true';
    } else {
        app_json(['ok' => false, 'message' => 'Unknown command.'], 422);
    }

    $result = app_admin_run_shell_command($spec);
    if (($result['exit_code'] ?? 1) !== 0) {
        app_json([
            'ok' => false,
            'message' => 'Command failed.',
            'output' => $result['output'] ?? '',
            'exit_code' => $result['exit_code'] ?? 1
        ], 500);
    }

    app_json([
        'ok' => true,
        'message' => 'Command completed successfully.',
        'output' => $result['output'] ?? '',
        'exit_code' => 0
    ]);
}

app_json(['ok' => false, 'message' => 'Not found.'], 404);

