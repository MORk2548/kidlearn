<?php
// One-time local setup helper. Keep disabled unless ALLOW_INIT_ADMIN=1.
header('Content-Type: application/json; charset=utf-8');

$envFile = dirname(__DIR__) . '/.env';
if (file_exists($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $_ENV[trim($key)] = trim($value);
    }
}

function initEnv(string $key, mixed $default = null): mixed {
    $value = $_ENV[$key] ?? getenv($key);
    return ($value === false || $value === null || $value === '') ? $default : $value;
}

function initBool(string $key, bool $default = false): bool {
    $value = initEnv($key, null);
    if ($value === null) return $default;
    return in_array(strtolower((string)$value), ['1', 'true', 'yes', 'on'], true);
}

function initFail(string $message, int $code = 400, ?Throwable $error = null): never {
    if ($error) error_log('[KidLearn init_admin] ' . $error->getMessage());
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $message], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

if (!initBool('ALLOW_INIT_ADMIN', false)) {
    initFail('init_admin is disabled. Set ALLOW_INIT_ADMIN=1 only during local setup.', 403);
}

$initialPassword = (string)initEnv('INITIAL_ADMIN_PASSWORD', '');
if (strlen($initialPassword) < 12) {
    initFail('INITIAL_ADMIN_PASSWORD must be set to at least 12 characters before running setup.', 400);
}

define('DB_HOST', initEnv('DB_HOST', 'db'));
define('DB_USER', initEnv('DB_USER', 'kidlearn'));
define('DB_PASS', initEnv('DB_PASS', ''));
define('DB_NAME', initEnv('DB_NAME', 'kidlearn_db'));

$result = ['ok' => true, 'steps' => []];

try {
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    $c = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    $c->set_charset('utf8mb4');

    $result['steps'][] = 'Connected to database';

    $check = $c->query("SHOW TABLES LIKE 'users'");
    if (!$check || $check->num_rows === 0) {
        initFail('Missing users table. Import kidlearn_full.sql before setup.', 400);
    }
    $result['steps'][] = 'Verified users table';

    $admin = $c->query("SELECT user_id FROM users WHERE username='admin' LIMIT 1")->fetch_assoc();
    $hash = password_hash($initialPassword, PASSWORD_BCRYPT);

    if ($admin) {
        $stmt = $c->prepare("UPDATE users SET password=?, email='admin@kidlearn.local', is_active=1 WHERE username='admin'");
        $stmt->bind_param('s', $hash);
        $stmt->execute();
        $uid = (int)$admin['user_id'];
        $result['steps'][] = 'Updated admin account password from INITIAL_ADMIN_PASSWORD';
    } else {
        $fullName = 'System Administrator';
        $stmt = $c->prepare("INSERT INTO users (username,email,password,role,full_name,is_active) VALUES ('admin','admin@kidlearn.local',?,'admin',?,1)");
        $stmt->bind_param('ss', $hash, $fullName);
        $stmt->execute();
        $uid = (int)$c->insert_id;
        $result['steps'][] = 'Created admin account';
    }

    $stmt = $c->prepare("INSERT IGNORE INTO admins (user_id,level) VALUES (?,'super')");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $result['steps'][] = 'Verified admins table record';

    $cols = $c->query("SHOW COLUMNS FROM questions LIKE 'hint'");
    if ($cols->num_rows === 0) {
        $c->query("ALTER TABLE questions ADD COLUMN hint TEXT DEFAULT NULL");
        $result['steps'][] = 'Added questions.hint';
    }

    $cols2 = $c->query("SHOW COLUMNS FROM questions LIKE 'question_type'");
    if ($cols2->num_rows === 0) {
        $c->query("ALTER TABLE questions ADD COLUMN question_type VARCHAR(20) DEFAULT 'text'");
        $result['steps'][] = 'Added questions.question_type';
    }

    $pr = $c->query("SHOW TABLES LIKE 'password_resets'");
    if ($pr->num_rows === 0) {
        $c->query("CREATE TABLE password_resets (
            reset_id   INT AUTO_INCREMENT PRIMARY KEY,
            user_id    INT NOT NULL,
            token      VARCHAR(64) NOT NULL UNIQUE,
            expires_at DATETIME NOT NULL,
            used       TINYINT(1) NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
            INDEX idx_token (token)
        ) ENGINE=InnoDB");
        $result['steps'][] = 'Created password_resets table';
    }

    $result['account'] = [
        'username' => 'admin',
        'role' => 'admin',
        'note' => 'Password was read from INITIAL_ADMIN_PASSWORD and is not returned by this endpoint.',
    ];
    $result['next'] = 'Disable ALLOW_INIT_ADMIN after setup.';

    echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
} catch (Throwable $e) {
    initFail('Setup failed. Check server logs for details.', 500, $e);
}
