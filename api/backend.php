<?php
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

function envValue(string $key, mixed $default = null): mixed {
    $value = $_ENV[$key] ?? getenv($key);
    return ($value === false || $value === null || $value === '') ? $default : $value;
}

function envBool(string $key, bool $default = false): bool {
    $value = envValue($key, null);
    if ($value === null) return $default;
    return in_array(strtolower((string)$value), ['1', 'true', 'yes', 'on'], true);
}

function appEnv(): string {
    return strtolower((string)envValue('APP_ENV', 'local'));
}

function isProduction(): bool {
    return appEnv() === 'production';
}

define('DB_HOST', $_ENV['DB_HOST'] ?? getenv('DB_HOST') ?: 'db.xxxx.supabase.co');
define('DB_PORT', $_ENV['DB_PORT'] ?? getenv('DB_PORT') ?: '5432');
define('DB_USER', $_ENV['DB_USER'] ?? getenv('DB_USER') ?: 'postgres');
define('DB_PASS', $_ENV['DB_PASS'] ?? getenv('DB_PASS') ?: '');
define('DB_NAME', $_ENV['DB_NAME'] ?? getenv('DB_NAME') ?: 'postgres');

const IMAGE_BUCKET = 'kidlearn-images';
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const IMAGE_EXTENSIONS = ['image/png' => 'png', 'image/jpeg' => 'jpg', 'image/gif' => 'gif', 'image/webp' => 'webp'];

header('Content-Type: application/json; charset=utf-8');
// รองรับทั้ง localhost และ 127.0.0.1
// CORS — รองรับทุก origin ที่เป็น localhost
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (empty($origin)) {
    // ไม่มี Origin header (same-origin request) — ไม่ต้องส่ง CORS header
} elseif (
    str_contains($origin, 'localhost') ||
    str_contains($origin, '127.0.0.1') ||
    preg_match('/^https?:\/\/localhost(:\d+)?$/', $origin)
) {
    header("Access-Control-Allow-Origin: $origin");
}
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') { http_response_code(200); exit; }

class DB {
    private static ?DB $i = null;
    private PDO $c;
    private ?PDOStatement $lastStmt = null;

    private function __construct() {
        $dsn = sprintf('pgsql:host=%s;port=%s;dbname=%s;sslmode=require', DB_HOST, DB_PORT, DB_NAME);
        try {
            $this->c = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        } catch (PDOException $e) {
            error_log('[KidLearn DB connect] ' . $e->getMessage());
            self::fail(isProduction() ? 'Database connection failed' : 'DB error: ' . $e->getMessage());
        }
    }

    public static function get(): self { if (!self::$i) self::$i = new self(); return self::$i; }

    public function run(string $sql, array $p = [], string $t = ''): PDOStatement {
        try {
            $stmt = $this->c->prepare($sql);
            $stmt->execute($p ?: []);
            $this->lastStmt = $stmt;
            return $stmt;
        } catch (PDOException $e) {
            error_log('[KidLearn DB query] ' . $e->getMessage() . ' | SQL: ' . $sql);
            self::fail(isProduction() ? 'Database query failed' : 'Query error: ' . $e->getMessage() . ' | SQL: ' . $sql);
        }
    }

    public function all(string $sql, array $p = [], string $t = ''): array {
        return $this->run($sql, $p, $t)->fetchAll() ?: [];
    }

    public function one(string $sql, array $p = [], string $t = ''): ?array {
        $row = $this->run($sql, $p, $t)->fetch();
        return $row ?: null;
    }

    public function insertId(): int { return (int)$this->c->lastInsertId(); }
    public function affected(): int { return $this->lastStmt?->rowCount() ?? 0; }

    // rawQuery — ไม่ throw/exit เมื่อ error (ใช้กับ CALL SP)
    public function rawQuery(string $sql): bool {
        try {
            $this->c->exec($sql);
            return true;
        } catch (PDOException) {
            return false;
        }
    }

    public static function ok(mixed $data = []): never {
        $payload = array_merge(['ok' => true], is_array($data) ? $data : ['data' => $data]);
        if (session_status() === PHP_SESSION_ACTIVE && isset($_SESSION['user'])) {
            $payload['csrf_token'] = csrfToken();
        }
        echo json_encode($payload,
            JSON_UNESCAPED_UNICODE); exit;
    }

    public static function fail(string $msg, int $code = 500): never {
        http_response_code($code);
        echo json_encode(['ok' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE); exit;
    }
}

if (session_status() === PHP_SESSION_NONE) {
    // session config มาจาก docker/php.ini
    // เปิด session
    $secureCookie = envBool('SESSION_COOKIE_SECURE', isProduction());
    session_set_cookie_params([
        'lifetime' => 86400,
        'path' => '/',
        'secure' => $secureCookie,
        'httponly' => true,
        'samesite' => isProduction() ? 'Strict' : 'Lax',
    ]);
    session_start();
}
function me(): ?array   { return $_SESSION['user'] ?? null; }
function myId(): int    { return (int)($_SESSION['user']['user_id'] ?? 0); }
function myRole(): string { return $_SESSION['user']['role'] ?? ''; }
function auth(): void   { if (!me()) DB::fail('Unauthorized', 401); }
function authRole(string ...$roles): void {
    auth();
    if (!in_array(myRole(), $roles, true)) DB::fail('Forbidden', 403);
}

function accountDateFilter(string $column): array {
    $range = (string)($_GET['date_range'] ?? 'all');
    $intervals = [
        '7d' => '7 days',
        '1m' => '1 month',
        '1y' => '1 year',
    ];
    if ($range === 'all') return ['', []];
    if (!isset($intervals[$range])) DB::fail('Invalid date range', 400);
    return [" AND $column >= NOW() - INTERVAL '{$intervals[$range]}' AND $column <= NOW()", []];
}

function csrfToken(): string {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function parseRequestBody(): array {
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') return [];
    $contentType = strtolower($_SERVER['CONTENT_TYPE'] ?? '');
    $looksLikeJson = str_starts_with(ltrim($raw), '{') || str_starts_with(ltrim($raw), '[');
    if (!str_contains($contentType, 'application/json') && !$looksLikeJson) {
        return [];
    }
    $data = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
        DB::fail('Invalid JSON request body', 400);
    }
    return $data;
}

function enforceRequestPolicy(string $action, array $body): void {
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    $postActions = [
        'login', 'logout', 'register', 'update_profile', 'change_password',
        'auto_link', 'unlink_child', 'mark_notif_read',
        'create_plan',
        'admin_toggle_user', 'admin_delete_user', 'admin_reset_pass',
        'save_subject', 'toggle_subject',
        'forgot_password', 'reset_password',
        'officer_update_user', 'officer_delete_user', 'officer_create_staff',
        'admin_create_staff', 'upload_image', 'add_classroom', 'delete_classroom', 'choose_classroom',
        'save_teacher_assignments',
    ];
    if (in_array($action, $postActions, true) && $method !== 'POST') {
        DB::fail('Method not allowed', 405);
    }

    $csrfProtected = array_diff($postActions, ['login', 'register', 'forgot_password', 'reset_password']);
    if (!in_array($action, $csrfProtected, true)) return;

    auth();
    $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($body['csrf_token'] ?? '');
    if (!is_string($sent) || !hash_equals(csrfToken(), $sent)) {
        DB::fail('Invalid CSRF token', 403);
    }
}

function tableColumnExists(string $table, string $column): bool {
    $row = DB::get()->one(
        "SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = ? AND column_name = ?
         LIMIT 1",
        [$table, $column]
    );

    return $row !== null;
}

function normalizeColumnDefinition(string $definition): string {
    $definition = preg_replace('/\s+AFTER\s+\w+/i', '', $definition);
    $definition = preg_replace('/\bMEDIUMTEXT\b/i', 'TEXT', $definition);
    $definition = preg_replace('/\bLONGTEXT\b/i', 'TEXT', $definition);
    $definition = preg_replace('/\bDATETIME\b/i', 'TIMESTAMPTZ', $definition);
    $definition = preg_replace('/\bTINYINT\b/i', 'SMALLINT', $definition);
    return trim((string)$definition);
}

function addColumnIfMissing(string $table, string $column, string $definition): void {
    if (tableColumnExists($table, $column)) return;
    $definition = normalizeColumnDefinition($definition);
    DB::get()->rawQuery("ALTER TABLE {$table} ADD COLUMN IF NOT EXISTS {$column} {$definition}");
}

function ensureAdvancedSchema(): void {
    static $done = false;
    if ($done) return;
    $done = true;

    // Schema is managed via kidlearn_supabase_schema.sql on Supabase.
    return;

    $db = DB::get();

    $schemaSql = [
        "CREATE TABLE IF NOT EXISTS student_mastery (
            mastery_id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            subject_id INT NOT NULL,
            skill_key VARCHAR(100) NOT NULL,
            skill_name VARCHAR(160) NOT NULL,
            mastery_score DECIMAL(5,2) NOT NULL DEFAULT 0,
            last_score DECIMAL(5,2) NOT NULL DEFAULT 0,
            attempts_count INT NOT NULL DEFAULT 0,
            weak_streak INT NOT NULL DEFAULT 0,
            strong_streak INT NOT NULL DEFAULT 0,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_mastery_skill (student_id, skill_key),
            KEY idx_mastery_student (student_id),
            CONSTRAINT fk_mastery_student FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
            CONSTRAINT fk_mastery_subject FOREIGN KEY (subject_id) REFERENCES subjects(subject_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        "CREATE TABLE IF NOT EXISTS score_attempt_details (
            attempt_id INT AUTO_INCREMENT PRIMARY KEY,
            score_id INT NOT NULL,
            student_id INT NOT NULL,
            game_id INT NOT NULL,
            subject_id INT NOT NULL,
            skill_key VARCHAR(100) DEFAULT NULL,
            skill_name VARCHAR(160) DEFAULT NULL,
            question_key VARCHAR(80) DEFAULT NULL,
            prompt_text TEXT DEFAULT NULL,
            correct_answer TEXT DEFAULT NULL,
            student_answer TEXT DEFAULT NULL,
            is_correct TINYINT(1) NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            KEY idx_attempt_score (score_id),
            KEY idx_attempt_student (student_id),
            CONSTRAINT fk_attempt_score FOREIGN KEY (score_id) REFERENCES scores(score_id) ON DELETE CASCADE,
            CONSTRAINT fk_attempt_student FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
            CONSTRAINT fk_attempt_game FOREIGN KEY (game_id) REFERENCES games(game_id) ON DELETE CASCADE,
            CONSTRAINT fk_attempt_subject FOREIGN KEY (subject_id) REFERENCES subjects(subject_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        "CREATE TABLE IF NOT EXISTS learning_plans (
            plan_id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            teacher_user_id INT NOT NULL,
            title VARCHAR(200) NOT NULL,
            description TEXT DEFAULT NULL,
            week_start DATE NOT NULL,
            due_at DATETIME DEFAULT NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'active',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            KEY idx_plan_student (student_id),
            CONSTRAINT fk_plan_student FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
            CONSTRAINT fk_plan_teacher FOREIGN KEY (teacher_user_id) REFERENCES users(user_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        "CREATE TABLE IF NOT EXISTS learning_plan_items (
            item_id INT AUTO_INCREMENT PRIMARY KEY,
            plan_id INT NOT NULL,
            game_id INT NOT NULL,
            lesson_no TINYINT UNSIGNED NOT NULL DEFAULT 1,
            target_score INT NOT NULL DEFAULT 80,
            sort_order INT NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            KEY idx_plan_items_plan (plan_id),
            CONSTRAINT fk_plan_item_plan FOREIGN KEY (plan_id) REFERENCES learning_plans(plan_id) ON DELETE CASCADE,
            CONSTRAINT fk_plan_item_game FOREIGN KEY (game_id) REFERENCES games(game_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        "CREATE TABLE IF NOT EXISTS student_badges (
            badge_id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            badge_code VARCHAR(80) NOT NULL,
            badge_title VARCHAR(160) NOT NULL,
            description VARCHAR(255) DEFAULT NULL,
            awarded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            meta_json JSON DEFAULT NULL,
            UNIQUE KEY uq_student_badge (student_id, badge_code),
            KEY idx_badge_student (student_id),
            CONSTRAINT fk_badge_student FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        "CREATE TABLE IF NOT EXISTS audit_logs (
            audit_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT DEFAULT NULL,
            actor_role VARCHAR(40) DEFAULT NULL,
            action_type VARCHAR(80) NOT NULL,
            entity_type VARCHAR(80) NOT NULL,
            entity_id VARCHAR(80) DEFAULT NULL,
            summary VARCHAR(255) DEFAULT NULL,
            meta_json JSON DEFAULT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            KEY idx_audit_created (created_at),
            KEY idx_audit_user (user_id),
            CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        "CREATE TABLE IF NOT EXISTS lesson_content_history (
            history_id INT AUTO_INCREMENT PRIMARY KEY,
            content_id INT NOT NULL,
            game_id INT NOT NULL,
            lesson_no TINYINT UNSIGNED NOT NULL DEFAULT 1,
            title VARCHAR(200) NOT NULL DEFAULT '',
            summary VARCHAR(500) DEFAULT NULL,
            body LONGTEXT DEFAULT NULL,
            read_time INT NOT NULL DEFAULT 5,
            status VARCHAR(20) NOT NULL DEFAULT 'draft',
            version_no INT NOT NULL DEFAULT 1,
            snapshot_by INT DEFAULT NULL,
            snapshot_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            KEY idx_lesson_history_content (content_id),
            CONSTRAINT fk_lesson_history_content FOREIGN KEY (content_id) REFERENCES lesson_content(content_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    ];

    foreach ($schemaSql as $sql) {
        $db->rawQuery($sql);
    }

    addColumnIfMissing('lesson_content', 'status', "VARCHAR(20) NOT NULL DEFAULT 'published' AFTER read_time");
    addColumnIfMissing('lesson_content', 'version_no', "INT NOT NULL DEFAULT 1 AFTER status");
    addColumnIfMissing('lesson_content', 'updated_by', "INT DEFAULT NULL AFTER version_no");
    addColumnIfMissing('lesson_content', 'approved_by', "INT DEFAULT NULL AFTER updated_by");
    addColumnIfMissing('lesson_content', 'published_at', "DATETIME DEFAULT NULL AFTER approved_by");
    addColumnIfMissing('parent_notifications', 'event_key', "VARCHAR(80) DEFAULT NULL AFTER notif_type");
}

const CLASSROOM_GRADES = ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6'];

function ensureClassroomSchema(): void {
    static $done = false;
    if ($done) return;
    $done = true;
    if (tableColumnExists('students', 'classroom_id')) return;

    $db = DB::get();
    $db->rawQuery(
        "CREATE TABLE IF NOT EXISTS classrooms (
            classroom_id SERIAL PRIMARY KEY,
            grade        VARCHAR(20) NOT NULL CHECK (grade IN ('ป.1','ป.2','ป.3','ป.4','ป.5','ป.6')),
            room_no      SMALLINT    NOT NULL CHECK (room_no > 0),
            created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (grade, room_no)
        )"
    );
    $db->rawQuery(
        "INSERT INTO classrooms (grade, room_no)
         SELECT g, r FROM unnest(ARRAY['ป.1','ป.2','ป.3','ป.4','ป.5','ป.6']) AS g, generate_series(1, 3) AS r
         ON CONFLICT DO NOTHING"
    );
    $db->rawQuery("ALTER TABLE students ADD COLUMN IF NOT EXISTS classroom_id INT REFERENCES classrooms(classroom_id)");
}

function findClassroom(mixed $classroomId): array {
    ensureClassroomSchema();
    $room = DB::get()->one("SELECT classroom_id, grade, room_no FROM classrooms WHERE classroom_id=?",
        [(int)$classroomId], 'i');
    if (!$room) DB::fail('กรุณาเลือกห้องเรียน', 400);
    return $room;
}

function setStudentClassroom(int $userId, mixed $classroomId): void {
    $room = findClassroom($classroomId);
    DB::get()->run("UPDATE students SET classroom_id=?, grade=? WHERE user_id=?",
        [$room['classroom_id'], $room['grade'], $userId], 'isi');
}

function handleChooseClassroom(): never {
    global $body;
    authRole('student');
    $room = findClassroom($body['classroom_id'] ?? 0);
    $db = DB::get();
    $db->run("UPDATE students SET classroom_id=?, grade=? WHERE user_id=? AND classroom_id IS NULL",
        [$room['classroom_id'], $room['grade'], myId()], 'isi');
    if (!$db->affected()) DB::fail('เลือกห้องเรียนไปแล้ว ติดต่อครูหรือเจ้าหน้าที่เพื่อเปลี่ยนห้อง', 409);
    DB::ok(['classroom' => $room]);
}

function handleClassrooms(): never {
    ensureClassroomSchema();
    DB::ok(['classrooms' => listClassrooms()]);
}

function listClassrooms(): array {
    return DB::get()->all("SELECT classroom_id, grade, room_no FROM classrooms ORDER BY grade, room_no");
}

// ทุกชั้นมีจำนวนห้องเท่ากัน: เติมทุกชั้นให้ถึงห้องถัดไปของชั้นที่มีห้องน้อยที่สุด
function handleAddClassroom(): never {
    authRole('teacher', 'admin', 'officer');
    ensureClassroomSchema();
    $db = DB::get();
    $maxByGrade = array_column(
        $db->all("SELECT grade, MAX(room_no) AS m FROM classrooms GROUP BY grade"), 'm', 'grade');
    $roomNo = min(array_map(fn($g) => (int)($maxByGrade[$g] ?? 0), CLASSROOM_GRADES)) + 1;
    foreach (CLASSROOM_GRADES as $grade) {
        $db->run("INSERT INTO classrooms (grade, room_no) SELECT ?, n FROM generate_series(1, ?) AS n
                  ON CONFLICT DO NOTHING", [$grade, $roomNo], 'si');
    }
    logAudit('create', 'classroom', (string)$roomNo, "เพิ่มห้องที่ {$roomNo} ให้ทุกชั้น");
    DB::ok(['classrooms' => listClassrooms()]);
}

function handleDeleteClassroom(): never {
    authRole('teacher', 'admin', 'officer');
    ensureClassroomSchema();
    $db = DB::get();
    $roomNo = (int)($db->one("SELECT MAX(room_no) AS m FROM classrooms")['m'] ?? 0);
    if ($roomNo <= 1) DB::fail('ต้องมีอย่างน้อย 1 ห้องในแต่ละชั้น', 400);
    $used = (int)$db->one(
        "SELECT COUNT(*) AS c FROM students s JOIN classrooms c ON c.classroom_id = s.classroom_id WHERE c.room_no=?",
        [$roomNo], 'i')['c'];
    if ($used) DB::fail("ลบไม่ได้ ยังมีนักเรียน {$used} คนอยู่ในห้องที่ {$roomNo} ให้ย้ายนักเรียนออกก่อน", 409);
    $db->run("DELETE FROM classrooms WHERE room_no=?", [$roomNo], 'i');
    logAudit('delete', 'classroom', (string)$roomNo, "ลบห้องที่ {$roomNo} ของทุกชั้น");
    DB::ok(['classrooms' => listClassrooms()]);
}

function ensureTeacherAssignmentSchema(): void {
    static $done = false;
    if ($done) return;
    $done = true;
    ensureClassroomSchema();
    if (tableColumnExists('teacher_assignments', 'classroom_id')) return;
    DB::get()->rawQuery(
        "CREATE TABLE IF NOT EXISTS teacher_assignments (
            assignment_id   SERIAL PRIMARY KEY,
            teacher_user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
            classroom_id    INT NOT NULL REFERENCES classrooms(classroom_id) ON DELETE CASCADE,
            subject_id      INT REFERENCES subjects(subject_id) ON DELETE CASCADE,
            UNIQUE NULLS NOT DISTINCT (teacher_user_id, classroom_id, subject_id)
        )"
    );
}

// subject_id ว่าง = ครูประจำชั้น เห็นทุกวิชาของห้องนั้น; admin/officer ไม่ถูกจำกัด
function teacherScopeSql(string $classroomCol, ?string $subjectCol = null): string {
    if (myRole() !== 'teacher') return 'TRUE';
    ensureTeacherAssignmentSchema();
    $subject = $subjectCol ? " AND (ta.subject_id IS NULL OR ta.subject_id = {$subjectCol})" : '';
    return "EXISTS (SELECT 1 FROM teacher_assignments ta WHERE ta.teacher_user_id = " . myId()
        . " AND ta.classroom_id = {$classroomCol}{$subject})";
}

function teacherCanSeeStudent(int $studentId): bool {
    if (myRole() !== 'teacher') return true;
    return (bool)DB::get()->one(
        "SELECT 1 FROM students st WHERE st.student_id=? AND " . teacherScopeSql('st.classroom_id'),
        [$studentId], 'i');
}

function intArrayLiteral(mixed $values): string {
    $ints = is_array($values) ? array_filter(array_map('intval', $values), fn($v) => $v > 0) : [];
    return '{' . implode(',', array_unique($ints)) . '}';
}

function handleTeacherAssignments(): never {
    authRole('teacher', 'admin', 'officer');
    ensureTeacherAssignmentSchema();
    $userId = myRole() === 'teacher' ? myId() : (int)($_GET['user_id'] ?? 0);
    DB::ok(['assignments' => DB::get()->all(
        "SELECT ta.classroom_id, ta.subject_id, c.grade, c.room_no, sub.name AS subject_name, sub.icon
         FROM teacher_assignments ta
         JOIN classrooms c ON c.classroom_id = ta.classroom_id
         LEFT JOIN subjects sub ON sub.subject_id = ta.subject_id
         WHERE ta.teacher_user_id=?
         ORDER BY c.grade, c.room_no, ta.subject_id NULLS FIRST",
        [$userId], 'i')]);
}

// ครูเลือกเองได้ครั้งแรกครั้งเดียว หลังจากนั้นเจ้าหน้าที่/แอดมินเป็นคนแก้
function handleSaveTeacherAssignments(): never {
    global $body;
    authRole('teacher', 'admin', 'officer');
    ensureTeacherAssignmentSchema();
    $db = DB::get();
    $isTeacher = myRole() === 'teacher';
    $userId = $isTeacher ? myId() : (int)($body['user_id'] ?? 0);
    if (!$db->one("SELECT 1 FROM users WHERE user_id=? AND role='teacher'", [$userId], 'i'))
        DB::fail('ไม่พบบัญชีครู', 404);
    if ($isTeacher && $db->one("SELECT 1 FROM teacher_assignments WHERE teacher_user_id=?", [$userId], 'i'))
        DB::fail('เลือกห้องและวิชาไปแล้ว ติดต่อเจ้าหน้าที่เพื่อแก้ไข', 409);

    $homeroom = (int)($body['homeroom_classroom_id'] ?? 0);
    $rooms = intArrayLiteral($body['classroom_ids'] ?? []);
    $subjects = intArrayLiteral($body['subject_ids'] ?? []);
    if ($isTeacher && !$homeroom && ($rooms === '{}' || $subjects === '{}'))
        DB::fail('กรุณาเลือกห้องประจำชั้น หรือเลือกทั้งวิชาและห้องที่สอน', 400);

    $db->run("DELETE FROM teacher_assignments WHERE teacher_user_id=?", [$userId], 'i');
    $db->run(
        "INSERT INTO teacher_assignments (teacher_user_id, classroom_id, subject_id)
         SELECT ?::int, c.classroom_id, s.subject_id
         FROM classrooms c CROSS JOIN subjects s
         WHERE c.classroom_id = ANY(?::int[]) AND s.subject_id = ANY(?::int[])
         UNION
         SELECT ?::int, classroom_id, NULL::int FROM classrooms WHERE classroom_id=?",
        [$userId, $rooms, $subjects, $userId, $homeroom], 'issii');
    logAudit('update', 'teacher_assignments', (string)$userId, 'กำหนดห้องและวิชาที่สอน');
    DB::ok(['saved' => true]);
}

const ATTENTION_MIN_SCORE = 50;
const ATTENTION_INACTIVE_DAYS = 7;

function needsAttention(?string $avgScore, ?string $lastPlayed): bool {
    if ($avgScore === null || $lastPlayed === null) return true;
    return (float)$avgScore < ATTENTION_MIN_SCORE
        || strtotime($lastPlayed) < strtotime('-' . ATTENTION_INACTIVE_DAYS . ' days');
}

// การ์ด = (ห้อง, วิชา) ที่ครูสอน; subject_id ว่าง = ทุกวิชา (ครูประจำชั้น / เจ้าหน้าที่)
function teacherCardsSql(): string {
    if (myRole() === 'teacher')
        return "SELECT classroom_id, subject_id FROM teacher_assignments WHERE teacher_user_id = " . myId();
    return "SELECT classroom_id, NULL::int AS subject_id FROM classrooms";
}

function cardStudentRows(string $cardsSql, array $params = []): array {
    return DB::get()->all(
        "WITH cards AS ({$cardsSql})
         SELECT k.classroom_id, k.subject_id, st.student_id, u.full_name,
                ROUND(AVG(sc.score), 1) AS avg_score, MAX(sc.played_at) AS last_played
         FROM cards k
         JOIN students st ON st.classroom_id = k.classroom_id
         JOIN users u ON u.user_id = st.user_id AND u.is_active = TRUE
         LEFT JOIN scores sc ON sc.student_id = st.student_id
              AND (k.subject_id IS NULL OR sc.game_id IN (SELECT game_id FROM games WHERE subject_id = k.subject_id))
         GROUP BY k.classroom_id, k.subject_id, st.student_id, u.full_name
         ORDER BY u.full_name",
        $params);
}

function handleTeacherClassSummary(): never {
    authRole('teacher', 'admin', 'officer');
    ensureTeacherAssignmentSchema();
    $cards = DB::get()->all(
        "SELECT k.classroom_id, k.subject_id, c.grade, c.room_no, sub.name AS subject_name, sub.icon
         FROM (" . teacherCardsSql() . ") k
         JOIN classrooms c ON c.classroom_id = k.classroom_id
         LEFT JOIN subjects sub ON sub.subject_id = k.subject_id
         ORDER BY c.grade, c.room_no, k.subject_id NULLS FIRST");
    $byCard = [];
    foreach (cardStudentRows(teacherCardsSql()) as $r) $byCard["{$r['classroom_id']}:{$r['subject_id']}"][] = $r;
    foreach ($cards as &$card) {
        $rows = $byCard["{$card['classroom_id']}:{$card['subject_id']}"] ?? [];
        $scored = array_filter(array_column($rows, 'avg_score'), fn($v) => $v !== null);
        $card['student_count'] = count($rows);
        $card['avg_score'] = $scored ? round(array_sum($scored) / count($scored), 1) : null;
        $card['needs_attention'] = count(array_filter($rows, fn($r) => needsAttention($r['avg_score'], $r['last_played'])));
        $card['last_played'] = $rows ? max(array_column($rows, 'last_played')) : null;
    }
    DB::ok(['cards' => $cards]);
}

function handleTeacherGradebook(): never {
    authRole('teacher', 'admin', 'officer');
    ensureTeacherAssignmentSchema();
    $db = DB::get();
    $classroomId = (int)($_GET['classroom_id'] ?? 0);
    $subjectId = (int)($_GET['subject_id'] ?? 0) ?: null;
    if (myRole() === 'teacher' && !$db->one(
        "SELECT 1 FROM teacher_assignments WHERE teacher_user_id=? AND classroom_id=?
         AND (subject_id IS NULL OR subject_id = ?::int)",
        [myId(), $classroomId, $subjectId], 'iii'))
        DB::fail('ไม่มีสิทธิ์ดูคะแนนห้องนี้', 403);

    $students = cardStudentRows("SELECT ?::int AS classroom_id, ?::int AS subject_id", [$classroomId, $subjectId]);
    foreach ($students as &$s) $s['needs_attention'] = needsAttention($s['avg_score'], $s['last_played']);

    // วิชาเดียว: คอลัมน์ = เกม (คะแนนดีที่สุด); ทุกวิชา: คอลัมน์ = วิชา (คะแนนเฉลี่ย)
    if ($subjectId) {
        $columns = $db->all("SELECT game_id AS id, name, icon FROM games
                             WHERE subject_id=? AND is_active=TRUE ORDER BY game_id", [$subjectId], 'i');
        $cells = $db->all(
            "SELECT sc.student_id, sc.game_id AS col, MAX(sc.score) AS val
             FROM scores sc JOIN students st ON st.student_id = sc.student_id
             JOIN games g ON g.game_id = sc.game_id AND g.subject_id = ?
             WHERE st.classroom_id = ? GROUP BY sc.student_id, sc.game_id",
            [$subjectId, $classroomId], 'ii');
    } else {
        $columns = $db->all("SELECT subject_id AS id, name, icon FROM subjects ORDER BY order_no");
        $cells = $db->all(
            "SELECT sc.student_id, g.subject_id AS col, ROUND(AVG(sc.score)) AS val
             FROM scores sc JOIN students st ON st.student_id = sc.student_id
             JOIN games g ON g.game_id = sc.game_id
             WHERE st.classroom_id = ? GROUP BY sc.student_id, g.subject_id",
            [$classroomId], 'i');
    }
    DB::ok(['columns' => $columns, 'cells' => $cells, 'students' => $students,
            'attention_rule' => ['min_score' => ATTENTION_MIN_SCORE, 'inactive_days' => ATTENTION_INACTIVE_DAYS]]);
}

function jsonEncodeSafe(array $data): string {
    return json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function logAudit(string $actionType, string $entityType, string $entityId = '', string $summary = '', array $meta = []): void {
    ensureAdvancedSchema();
    $db = DB::get();
    $db->run(
        "INSERT INTO audit_logs (user_id, actor_role, action_type, entity_type, entity_id, summary, meta_json)
         VALUES (?,?,?,?,?,?,?)",
        [myId() ?: null, myRole() ?: null, $actionType, $entityType, $entityId ?: null, $summary ?: null, jsonEncodeSafe($meta)],
        'sssssss'
    );
}

function createParentNotification(int $studentId, string $title, string $message, string $type = 'info', string $icon = '🔔', string $eventKey = ''): void {
    $db = DB::get();
    $parents = $db->all(
        "SELECT p.parent_id
         FROM parent_student ps
         JOIN parents p ON p.parent_id = ps.parent_id
         WHERE ps.student_id=?",
        [$studentId], 'i'
    );
    foreach ($parents as $parent) {
        $db->run(
            "INSERT INTO parent_notifications (parent_id, student_id, ico, title, message, notif_type, event_key)
             VALUES (?,?,?,?,?,?,?)",
            [$parent['parent_id'], $studentId, $icon, $title, $message, $type, $eventKey ?: null],
            'iisssss'
        );
    }
}

// ── ROUTER ────────────────────────────────────────────────────
$action = $_GET['action'] ?? '';
$body   = parseRequestBody();

enforceRequestPolicy($action, $body);

if ($action !== 'health') {
    ensureAdvancedSchema();
}

match ($action) {
    'login'           => handleLogin(),
    'logout'          => handleLogout(),
    'register'        => handleRegister(),
    'me'              => handleMe(),
    'update_profile'  => handleUpdateProfile(),
    'change_password' => handleChangePassword(),
    'upload_image'    => handleUploadImage(),
    'subjects'        => handleSubjects(),
    'scores'          => handleScores(),
    'my_children'     => handleMyChildren(),
    'auto_link'       => handleAutoLink(),
    'unlink_child'    => handleUnlinkChild(),
    'recommendations' => handleRecommendations(),
    'notifications'   => handleNotificationsV2(),
    'mark_notif_read' => handleMarkNotifRead(),
    'teacher_stats'   => handleTeacherStats(),
    'all_students'    => handleAllStudents(),
    'classrooms'      => handleClassrooms(),
    'add_classroom'   => handleAddClassroom(),
    'delete_classroom' => handleDeleteClassroom(),
    'choose_classroom' => handleChooseClassroom(),
    'teacher_assignments'      => handleTeacherAssignments(),
    'save_teacher_assignments' => handleSaveTeacherAssignments(),
    'teacher_class_summary'    => handleTeacherClassSummary(),
    'teacher_gradebook'        => handleTeacherGradebook(),
    'student_analytics' => handleStudentAnalytics(),
    'student_plans'     => handleStudentPlansV2(),
    'create_plan'       => handleCreatePlanV3(),
    'health'            => handleHealthCheck(),
    // 2.0 admin users
    'admin_users'        => handleAdminUsers(),
    'admin_toggle_user'  => handleAdminToggleUser(),
    'admin_delete_user'  => handleAdminDeleteUser(),
    'admin_reset_pass'   => handleAdminResetPassword(),
    // 3.0 subjects
    'save_subject'       => handleSaveSubject(),
    'toggle_subject'     => handleToggleSubject(),
    // 8.0 reports
    'report'             => handleReportV2(),
    // forgot/reset password
    'forgot_password'    => handleForgotPassword(),
    'reset_password'     => handleResetPassword(),
    'validate_email'     => handleValidateEmail(),
    // officer endpoints
    'officer_users'        => handleOfficerUsers(),
    'officer_update_user'  => handleOfficerUpdateUser(),
    'officer_delete_user'  => handleOfficerDeleteUser(),
    'officer_create_staff' => handleOfficerCreateStaff(),
    // admin create staff
    'admin_create_staff'   => handleAdminCreateStaff(),
    // executive endpoints
    'executive_dashboard' => handleExecutiveDashboard(),
    'executive_users'     => handleExecutiveUsers(),
    'executive_content'   => handleExecutiveContent(),
    default              => DB::fail("Unknown action: $action", 404),
};

// ============================================================
// AUTH
// ============================================================

function handleLogin(): never {
    global $body;
    $db   = DB::get();
    ensureClassroomSchema();
    $u    = trim($body['username'] ?? $_POST['username'] ?? '');
    $pass = $body['password'] ?? $_POST['password'] ?? '';
    if (!$u || !$pass) DB::fail('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน', 400);

    $user = $db->one(
        "SELECT u.*, s.student_id, s.grade, s.parent_phone, s.classroom_id, c.room_no,
                p.parent_id, p.phone,
                t.teacher_id, t.department,
                o.officer_id, o.permissions as officer_permissions,
                e.executive_id, e.title as executive_title, e.permissions as executive_permissions
         FROM users u
         LEFT JOIN students s ON s.user_id = u.user_id
         LEFT JOIN classrooms c ON c.classroom_id = s.classroom_id
         LEFT JOIN parents  p ON p.user_id = u.user_id
         LEFT JOIN teachers t ON t.user_id = u.user_id
         LEFT JOIN officers o ON o.user_id = u.user_id
         LEFT JOIN executives e ON e.user_id = u.user_id
         WHERE (u.username=? OR u.email=?) AND u.is_active=TRUE",
        [$u, $u], 'ss'
    );
    if (!$user || !password_verify($pass, $user['password']))
        DB::fail('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 401);

    unset($user['password']);

    // ดึง children list ถ้าเป็น parent
    if ($user['role'] === 'parent' && $user['parent_id']) {
        $kids = $db->all(
            "SELECT student_id FROM parent_student WHERE parent_id=?",
            [$user['parent_id']], 'i'
        );
        $user['children'] = array_column($kids, 'student_id');
    } else {
        $user['children'] = [];
    }

    session_regenerate_id(true);
    $_SESSION['user'] = $user;
    unset($_SESSION['csrf_token']);
    DB::ok(['user' => $user]);
}

function handleLogout(): never {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'] ?? '', $params['secure'], $params['httponly']);
    }
    session_destroy();
    DB::ok();
}

// ── normalize เบอร์โทรให้เป็น 10 หลักเสมอ ──
function normalizePhone(string $raw): string {
    $p = preg_replace('/\D/', '', $raw);
    if (strlen($p) === 9) $p = '0' . $p;  // 812345678 → 0812345678
    return $p;
}

// ── เปลี่ยนเบอร์ผู้ปกครอง แล้วย้ายเบอร์ของนักเรียนที่ผูกกับเบอร์เดิมไปเป็นเบอร์ใหม่ ──
function setParentPhone(int $uid, string $raw): void {
    $db    = DB::get();
    $phone = normalizePhone($raw);
    if (strlen($phone) < 9) DB::fail('เบอร์โทรไม่ถูกต้อง', 400);

    $p = $db->one("SELECT parent_id, phone FROM parents WHERE user_id=?", [$uid], 'i');
    if (!$p) return;
    $old = normalizePhone($p['phone'] ?? '');
    if ($phone === $old) return;
    if ($db->one("SELECT 1 FROM parents WHERE phone=? AND user_id<>?", [$phone, $uid], 'si'))
        DB::fail('เบอร์โทรนี้ถูกใช้แล้ว', 409);

    $db->run("UPDATE parents SET phone=? WHERE user_id=?", [$phone, $uid], 'si');
    if ($old) {
        $db->run("UPDATE students SET parent_phone=? WHERE parent_phone=? OR parent_phone=?",
            [$phone, $old, ltrim($old, '0')], 'sss');
    }

    $students = $db->all("SELECT student_id FROM students WHERE parent_phone=? OR parent_phone=?",
        [$phone, ltrim($phone, '0')], 'ss');
    foreach ($students as $s) {
        $db->run("INSERT INTO parent_student (parent_id,student_id) VALUES (?,?) ON CONFLICT DO NOTHING",
            [$p['parent_id'], $s['student_id']], 'ii');
    }
}

function handleRegister(): never {
    global $body;
    $db    = DB::get();
    $name  = trim($body['full_name']  ?? '');
    $uname = trim($body['username']   ?? '');
    $email = trim($body['email']      ?? '');
    $pass  = $body['password']        ?? '';
    $role  = $body['role']            ?? 'student';

    if (!$name || !$uname || !$email || !$pass) DB::fail('กรุณากรอกข้อมูลให้ครบ', 400);
    if (strlen($pass) < 6)                      DB::fail('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 400);
    // officer/executive สร้างได้เฉพาะผ่าน admin_create_staff / officer_create_staff
    if (!in_array($role, ['student','parent','teacher'], true)) DB::fail('role ไม่ถูกต้อง', 400);
    if ($role === 'teacher') {
        $teacherCode = (string)envValue('TEACHER_REGISTER_CODE', '');
        // ไม่ได้ตั้งรหัสไว้ = ปิดการสมัครครูเอง กันคนทั่วไปสมัครเป็นครู
        if ($teacherCode === '') DB::fail('ยังไม่เปิดให้สมัครบัญชีครู กรุณาติดต่อผู้ดูแลระบบ', 403);
        if (!hash_equals($teacherCode, trim((string)($body['teacher_code'] ?? ''))))
            DB::fail('รหัสประจำตัวครูไม่ถูกต้อง', 403);
    }

    if ($db->one("SELECT 1 FROM users WHERE username=?", [$uname], 's'))
        DB::fail('ชื่อผู้ใช้นี้ถูกใช้แล้ว', 409);
    if ($db->one("SELECT 1 FROM users WHERE email=?", [$email], 's'))
        DB::fail('อีเมลนี้ถูกใช้แล้ว', 409);

    $hash = password_hash($pass, PASSWORD_BCRYPT);

    // INSERT users
    $db->run("INSERT INTO users (username,email,password,role,full_name) VALUES (?,?,?,?,?)",
        [$uname, $email, $hash, $role, $name], 'sssss');
    $uid = $db->insertId();

    // INSERT role-specific table
    if ($role === 'student') {
        $room = findClassroom($body['classroom_id'] ?? 0);
        $pp = normalizePhone($body['parent_phone'] ?? '');
        if (!$pp || strlen($pp) < 9) DB::fail('กรุณากรอกเบอร์โทรผู้ปกครองให้ถูกต้อง', 400);
        $db->run("INSERT INTO students (user_id,grade,classroom_id,parent_phone) VALUES (?,?,?,?)",
            [$uid, $room['grade'], $room['classroom_id'], $pp], 'isis');
        $sid = $db->insertId();
        // auto-link parent
        $parent = $db->one("SELECT parent_id FROM parents WHERE phone=?", [$pp], 's');
        if ($parent) {
            $db->run("INSERT INTO parent_student (parent_id,student_id) VALUES (?,?) ON CONFLICT DO NOTHING",
                [$parent['parent_id'], $sid], 'ii');
        }
    }

    if ($role === 'parent') {
        $phone = normalizePhone($body['phone'] ?? '');
        if (!$phone || strlen($phone) < 9) DB::fail('กรุณากรอกเบอร์โทรให้ถูกต้อง', 400);
        if ($db->one("SELECT 1 FROM parents WHERE phone=?", [$phone], 's'))
            DB::fail('เบอร์โทรนี้ถูกใช้แล้ว', 409);
        $db->run("INSERT INTO parents (user_id,phone) VALUES (?,?)", [$uid, $phone], 'is');
        $pid = $db->insertId();
        // auto-link existing students — match ทั้ง 10 หลัก และ 9 หลัก
        $phone9 = ltrim($phone, '0');
        $students = $db->all(
            "SELECT student_id FROM students WHERE parent_phone=? OR parent_phone=?",
            [$phone, $phone9], 'ss'
        );
        foreach ($students as $s) {
            $db->run("INSERT INTO parent_student (parent_id,student_id) VALUES (?,?) ON CONFLICT DO NOTHING",
                [$pid, $s['student_id']], 'ii');
        }
    }

    if ($role === 'teacher') {
        $dept = trim($body['department'] ?? '');
        $db->run("INSERT INTO teachers (user_id,department) VALUES (?,?)", [$uid, $dept], 'is');
    }

    DB::ok(['user_id' => $uid]);
}

function handleMe(): never {
    auth();
    ensureClassroomSchema();
    $user = DB::get()->one(
        "SELECT u.user_id, u.username, u.email, u.role, u.full_name, u.avatar_url, u.created_at, u.updated_at,
                s.student_id, s.grade, s.parent_phone, s.classroom_id, c.room_no,
                p.parent_id, p.phone,
                t.teacher_id, t.department,
                o.officer_id, o.permissions as officer_permissions,
                e.executive_id, e.title as executive_title, e.permissions as executive_permissions
         FROM users u
         LEFT JOIN students s ON s.user_id = u.user_id
         LEFT JOIN classrooms c ON c.classroom_id = s.classroom_id
         LEFT JOIN parents  p ON p.user_id = u.user_id
         LEFT JOIN teachers t ON t.user_id = u.user_id
         LEFT JOIN officers o ON o.user_id = u.user_id
         LEFT JOIN executives e ON e.user_id = u.user_id
         WHERE u.user_id=?", [myId()], 'i'
    );
    if (!$user) DB::fail('ไม่พบผู้ใช้', 404);

    if ($user['role'] === 'parent' && $user['parent_id']) {
        $kids = DB::get()->all("SELECT student_id FROM parent_student WHERE parent_id=?",
            [$user['parent_id']], 'i');
        $user['children'] = array_column($kids, 'student_id');
    } else {
        $user['children'] = [];
    }
    DB::ok($user);
}

function storageUploadImage(string $path, string $bytes, string $mime): string {
    $base = rtrim((string)envValue('SUPABASE_URL', ''), '/');
    $key  = (string)envValue('SUPABASE_SERVICE_ROLE_KEY', '');
    if ($base === '' || $key === '') DB::fail('ยังไม่ได้ตั้งค่า SUPABASE_URL หรือ SUPABASE_SERVICE_ROLE_KEY ในไฟล์ .env', 500);

    $ch = curl_init("{$base}/storage/v1/object/" . IMAGE_BUCKET . "/{$path}");
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $bytes,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_HTTPHEADER     => [
            "apikey: {$key}",
            "Authorization: Bearer {$key}",
            "Content-Type: {$mime}",
            'Cache-Control: max-age=31536000',
            'x-upsert: false',
        ],
    ]);
    $response = curl_exec($ch);
    $status   = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $error    = curl_error($ch);
    curl_close($ch);
    if ($response === false || $status >= 300) {
        error_log("[KidLearn] storage upload failed ({$status}): " . (is_string($response) ? $response : $error));
        DB::fail('อัปโหลดรูปไปยัง Supabase ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 502);
    }
    return "{$base}/storage/v1/object/public/" . IMAGE_BUCKET . "/{$path}";
}

function handleUploadImage(): never {
    global $body;
    auth();
    $purpose = 'avatar';

    if (!preg_match('#^data:image/[\w.+-]+;base64,(.+)$#s', (string)($body['data_url'] ?? ''), $m)) {
        DB::fail('ไฟล์รูปภาพไม่ถูกต้อง', 400);
    }
    $bytes = base64_decode($m[1], true);
    if ($bytes === false || $bytes === '') DB::fail('ไฟล์รูปภาพไม่ถูกต้อง', 400);
    if (strlen($bytes) > IMAGE_MAX_BYTES) DB::fail('รูปภาพต้องมีขนาดไม่เกิน 5 MB', 413);

    $mime = (new finfo(FILEINFO_MIME_TYPE))->buffer($bytes);
    $ext  = IMAGE_EXTENSIONS[$mime] ?? null;
    if (!$ext) DB::fail('รองรับเฉพาะไฟล์ PNG, JPG, GIF และ WEBP', 415);

    $id   = myId();
    $path = sprintf('%s/%d/%s.%s', $purpose, $id, bin2hex(random_bytes(16)), $ext);
    $url  = storageUploadImage($path, $bytes, $mime);

    $db = DB::get();
    $asset = $db->one(
        "INSERT INTO image_assets (bucket_id, storage_path, original_filename, mime_type, byte_size, uploaded_by)
         VALUES (?,?,?,?,?,?) RETURNING image_id",
        [IMAGE_BUCKET, $path, mb_substr((string)($body['filename'] ?? ''), 0, 255), $mime, strlen($bytes), $id]
    );
    $db->run("UPDATE users SET avatar_url=? WHERE user_id=?", [$url, $id], 'si');
    $_SESSION['user']['avatar_url'] = $url;
    DB::ok(['url' => $url, 'image_id' => $asset['image_id'] ?? null]);
}

function handleUpdateProfile(): never {
    global $body;
    auth();
    $db   = DB::get();
    $id   = myId();
    $role = myRole();
    $name  = trim($body['full_name'] ?? '');
    $email = trim($body['email']     ?? '');
    if (!$name || !$email) DB::fail('กรุณากรอกข้อมูลให้ครบ', 400);

    if ($role === 'parent' && trim($body['phone'] ?? '') !== '') setParentPhone($id, $body['phone']);

    $db->run("UPDATE users SET full_name=?,email=? WHERE user_id=?", [$name, $email, $id], 'ssi');
    $accountDates = $db->one("SELECT created_at, updated_at FROM users WHERE user_id=?", [$id], 'i');

    if ($role === 'teacher') {
        $dept = trim($body['department'] ?? '');
        $db->run("UPDATE teachers SET department=? WHERE user_id=?", [$dept, $id], 'si');
    }

    // อัปเดต session
    $_SESSION['user']['full_name'] = $name;
    DB::ok(['created_at' => $accountDates['created_at'] ?? null, 'updated_at' => $accountDates['updated_at'] ?? null]);
}

function handleChangePassword(): never {
    global $body;
    auth();
    $old = $body['old_password'] ?? '';
    $new = $body['new_password'] ?? '';
    if (!$old || !$new) DB::fail('กรุณากรอกรหัสผ่านเดิมและรหัสผ่านใหม่', 400);
    if (strlen($new) < 6) DB::fail('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร', 400);
    $user = DB::get()->one("SELECT password FROM users WHERE user_id=?", [myId()], 'i');
    if (!password_verify($old, $user['password'])) DB::fail('รหัสผ่านเดิมไม่ถูกต้อง', 401);
    DB::get()->run("UPDATE users SET password=? WHERE user_id=?",
        [password_hash($new, PASSWORD_BCRYPT), myId()], 'si');
    $updatedAt = DB::get()->one("SELECT updated_at FROM users WHERE user_id=?", [myId()], 'i')['updated_at'] ?? null;
    DB::ok(['updated_at' => $updatedAt]);
}

// ============================================================
// SCORES
// ============================================================

function handleSubjects(): never {
    auth();
    DB::ok(['subjects' => DB::get()->all("SELECT * FROM subjects ORDER BY order_no")]);
}

function handleScores(): never {
    auth();
    $db        = DB::get();
    $studentId = (int)($_GET['student_id'] ?? 0);

    if (myRole() === 'student') {
        // นักเรียนดูคะแนนตัวเอง
        $st = $db->one("SELECT student_id FROM students WHERE user_id=?", [myId()], 'i');
        $studentId = $st ? $st['student_id'] : 0;
    } elseif (myRole() === 'parent' && $studentId) {
        // ผู้ปกครองต้องเชื่อมบัญชีก่อน
        $p = $db->one("SELECT parent_id FROM parents WHERE user_id=?", [myId()], 'i');
        if ($p) {
            $link = $db->one("SELECT 1 FROM parent_student WHERE parent_id=? AND student_id=?",
                [$p['parent_id'], $studentId], 'ii');
            if (!$link) DB::fail('ไม่มีสิทธิ์', 403);
        }
    }
    // teacher/admin ส่ง student_id มาตรงๆ ไม่ต้อง convert

    // รองรับ filter subject_id (ครูกรองตามวิชา)
    $subjectId = (int)($_GET['subject_id'] ?? 0);

    $where  = 'WHERE 1=1';
    $params = [];
    $types  = '';
    if ($studentId) { $where .= ' AND sc.student_id=?'; $params[] = $studentId; $types .= 'i'; }
    if ($subjectId) { $where .= ' AND sub.subject_id=?'; $params[] = $subjectId; $types .= 'i'; }
    $where .= ' AND ' . teacherScopeSql('st.classroom_id', 'sub.subject_id');

    $scores = $db->all(
        "SELECT sc.score_id, sc.student_id, sc.score,
                100 AS max_score,
                sc.lesson_no, sc.time_spent, sc.played_at,
                g.game_id, g.name AS game_name, g.game_type, g.level,
                sub.subject_id, sub.name AS subject_name, sub.color AS subject_color,
                u.full_name AS student_name, st.grade
         FROM scores sc
         JOIN students st  ON st.student_id = sc.student_id
         JOIN users    u   ON u.user_id     = st.user_id
         LEFT JOIN games    g   ON g.game_id     = sc.game_id
         LEFT JOIN subjects sub ON sub.subject_id = g.subject_id
         $where ORDER BY sc.played_at DESC LIMIT 300",
        $params, $types ?: ''
    );
    DB::ok(['scores' => $scores]);
}

// ============================================================
// PARENT / CHILDREN
// ============================================================

function handleMyChildren(): never {
    authRole('parent');
    ensureClassroomSchema();
    $p = DB::get()->one("SELECT parent_id FROM parents WHERE user_id=?", [myId()], 'i');
    if (!$p) DB::ok(['children' => []]);

    $kids = DB::get()->all(
        "SELECT u.user_id, u.full_name, st.grade, st.student_id, c.room_no,
                COALESCE(pr.avg_score, 0)   AS avg_score,
                COALESCE(pr.total_plays, 0) AS total_plays,
                (SELECT COUNT(*) FROM scores sc WHERE sc.student_id = st.student_id) AS total_games
         FROM parent_student ps
         JOIN students st ON st.student_id = ps.student_id
         JOIN users    u  ON u.user_id     = st.user_id
         LEFT JOIN classrooms c ON c.classroom_id = st.classroom_id
         LEFT JOIN (
             SELECT student_id, AVG(score) AS avg_score, COUNT(*) AS total_plays
             FROM scores GROUP BY student_id
         ) pr ON pr.student_id = st.student_id
         WHERE ps.parent_id=?",
        [$p['parent_id']], 'i'
    );
    DB::ok(['children' => $kids]);
}

// auto-link: parent เรียกเองเพื่อ sync บุตรหลานที่กรอกเบอร์ตรงกัน
function handleAutoLink(): never {
    authRole('parent');
    $db = DB::get();
    $p  = $db->one("SELECT parent_id, phone FROM parents WHERE user_id=?", [myId()], 'i');
    if (!$p) DB::ok(['linked' => 0]);

    $phone  = normalizePhone($p['phone'] ?? '');
    $phone9 = ltrim($phone, '0');

    $students = $db->all(
        "SELECT student_id FROM students WHERE parent_phone=? OR parent_phone=?",
        [$phone, $phone9], 'ss'
    );
    $linked = 0;
    foreach ($students as $s) {
        $db->run("INSERT INTO parent_student (parent_id,student_id) VALUES (?,?) ON CONFLICT DO NOTHING",
            [$p['parent_id'], $s['student_id']], 'ii');
        if ($db->affected() > 0) $linked++;
    }
    DB::ok(['linked' => $linked]);
}

function handleUnlinkChild(): never {
    global $body;
    authRole('parent');
    $sid = (int)($body['student_id'] ?? 0);
    if (!$sid) DB::fail('ต้องส่ง student_id', 400);
    $p = DB::get()->one("SELECT parent_id FROM parents WHERE user_id=?", [myId()], 'i');
    if ($p) DB::get()->run("DELETE FROM parent_student WHERE parent_id=? AND student_id=?",
        [$p['parent_id'], $sid], 'ii');
    DB::ok();
}

// ============================================================
// RECOMMENDATIONS
// ============================================================

function generateRecommendations(int $studentId, int $userId): void {
    $db      = DB::get();
    $subjects = $db->all(
        "SELECT g.subject_id, ROUND(AVG(sc.score),1) AS avg
         FROM scores sc JOIN games g ON g.game_id=sc.game_id
         WHERE sc.student_id=? GROUP BY g.subject_id",
        [$studentId], 'i'
    );

    foreach ($subjects as $sub) {
        $avg = (float)$sub['avg'];
        if ($avg >= 80)     { $type='praise';    $msg='เยี่ยมมาก! ทำคะแนนได้ดีในวิชานี้ ให้กำลังใจต่อไปเลย!'; }
        elseif ($avg >= 55) { $type='improve';   $msg='กำลังพัฒนาดีขึ้น! เล่นเกมวิชานี้บ่อยขึ้นอีกนิดนะครับ'; }
        else                { $type='low_score'; $msg='คะแนนยังน้อย ควรฝึกเล่นเกมในวิชานี้เพิ่มเติมนะครับ'; }

        $db->run(
            "INSERT INTO recommendations (student_id,subject_id,message,rec_type)
             VALUES (?,?,?,?)
             ON CONFLICT (student_id, subject_id)
             DO UPDATE SET message=EXCLUDED.message, rec_type=EXCLUDED.rec_type, created_at=NOW()",
            [$studentId, $sub['subject_id'], $msg, $type], 'iiss'
        );
    }

    // Notifications ให้ผู้ปกครอง
    $sName   = $db->one("SELECT full_name FROM users WHERE user_id=?", [$userId], 'i')['full_name'] ?? 'นักเรียน';
    $parents = $db->all(
        "SELECT p.parent_id, p.user_id FROM parent_student ps
         JOIN parents p ON p.parent_id=ps.parent_id
         WHERE ps.student_id=?", [$studentId], 'i'
    );

    foreach ($parents as $par) {
        $lowSubs  = array_filter($subjects, fn($s) => (float)$s['avg'] < 50);
        $highSubs = array_filter($subjects, fn($s) => (float)$s['avg'] >= 85);

        if ($lowSubs) {
            $db->run(
                "INSERT INTO parent_notifications (parent_id,student_id,ico,title,message,notif_type)
                 VALUES (?,?,'⚠️','ต้องการความช่วยเหลือ',?,'warn')",
                [$par['parent_id'], $studentId,
                 "$sName มีวิชาที่คะแนนต่ำกว่า 50% ลองช่วยทบทวนบทเรียนร่วมกันที่บ้านดูครับ"],
                'iis'
            );
        }
        if ($highSubs) {
            $db->run(
                "INSERT INTO parent_notifications (parent_id,student_id,ico,title,message,notif_type)
                 VALUES (?,?,'⭐','ผลการเรียนดีเยี่ยม!',?,'praise')",
                [$par['parent_id'], $studentId,
                 "$sName ทำคะแนนได้ยอดเยี่ยม! ให้กำลังใจกันด้วยนะครับ"],
                'iis'
            );
        }
    }
}

function generateRecommendationsV2(int $studentId, int $userId): void {
    $db = DB::get();
    $subjects = $db->all(
        "SELECT g.subject_id, ROUND(AVG(sc.score),1) AS avg, sub.name AS subject_name
         FROM scores sc
         JOIN games g ON g.game_id = sc.game_id
         JOIN subjects sub ON sub.subject_id = g.subject_id
         WHERE sc.student_id=?
         GROUP BY g.subject_id, sub.name",
        [$studentId], 'i'
    );

    $weakSkills = $db->all(
        "SELECT sm.subject_id, sm.skill_key, sm.skill_name, sm.mastery_score
         FROM student_mastery sm
         WHERE sm.student_id=?
         ORDER BY sm.mastery_score ASC, sm.updated_at DESC",
        [$studentId], 'i'
    );

    foreach ($subjects as $sub) {
        $avg = (float)$sub['avg'];
        $nextGame = $db->one(
            "SELECT name FROM games WHERE subject_id=? ORDER BY game_id LIMIT 1",
            [$sub['subject_id']], 'i'
        );
        $weakSkill = null;
        foreach ($weakSkills as $skill) {
            if ((int)$skill['subject_id'] === (int)$sub['subject_id']) {
                $weakSkill = $skill;
                break;
            }
        }

        if ($avg >= 80) {
            $type = 'praise';
            $msg = 'พร้อมต่อยอดแล้ว';
        } elseif ($avg >= 55) {
            $type = 'improve';
            $msg = 'กำลังดีขึ้น';
        } else {
            $type = 'low_score';
            $msg = 'ควรทบทวนก่อนเรียนต่อ';
        }

        if ($weakSkill) {
            $msg .= ' โดยเน้นหัวข้อ "' . $weakSkill['skill_name'] . '"';
        }
        if ($nextGame) {
            $msg .= ' และเล่นเกม "' . $nextGame['name'] . '" เป็นลำดับถัดไป';
        }

        $db->run(
            "INSERT INTO recommendations (student_id,subject_id,message,rec_type)
             VALUES (?,?,?,?)
             ON CONFLICT (student_id, subject_id)
             DO UPDATE SET message=EXCLUDED.message, rec_type=EXCLUDED.rec_type, created_at=NOW()",
            [$studentId, $sub['subject_id'], $msg, $type], 'iiss'
        );
    }

    $studentName = $db->one(
        "SELECT u.full_name
         FROM students st
         JOIN users u ON u.user_id = st.user_id
         WHERE st.student_id=?",
        [$studentId], 'i'
    )['full_name'] ?? 'นักเรียน';

    $weakest = $weakSkills[0] ?? null;
    if ($weakest && (float)$weakest['mastery_score'] < 60) {
        createParentNotification(
            $studentId,
            'มีหัวข้อที่ควรทบทวน',
            $studentName . ' ยังอ่อนในเรื่อง "' . $weakest['skill_name'] . '" ลองเปิดฝึกเฉพาะจุดหรือมอบหมายแผนรายสัปดาห์เพิ่ม',
            'warn',
            '⚠️',
            'weak_skill_' . $weakest['skill_key']
        );
    }
}

function handleRecommendations(): never {
    auth();
    $db  = DB::get();
    $sid = (int)($_GET['student_id'] ?? 0);

    if (myRole() === 'student') {
        $st  = $db->one("SELECT student_id FROM students WHERE user_id=?", [myId()], 'i');
        $sid = $st ? $st['student_id'] : 0;
    }
    if (!$sid) DB::fail('ต้องส่ง student_id', 400);

    $recs = $db->all(
        "SELECT r.*, sub.name AS subject_name, sub.color, sub.icon
         FROM recommendations r JOIN subjects sub ON sub.subject_id=r.subject_id
         WHERE r.student_id=? ORDER BY r.created_at DESC",
        [$sid], 'i'
    );
    DB::ok(['recs' => $recs]);
}

function handleNotifications(): never {
    authRole('parent');
    $p = DB::get()->one("SELECT parent_id FROM parents WHERE user_id=?", [myId()], 'i');
    if (!$p) DB::ok(['notifications' => []]);
    $notifs = DB::get()->all(
        "SELECT n.*, u.full_name AS student_name
         FROM parent_notifications n JOIN users u ON u.user_id=n.student_id
         WHERE n.parent_id=? ORDER BY n.created_at DESC LIMIT 50",
        [$p['parent_id']], 'i'
    );
    DB::ok(['notifications' => $notifs]);
}

function handleMarkNotifRead(): never {
    global $body;
    authRole('parent');
    $p = DB::get()->one("SELECT parent_id FROM parents WHERE user_id=?", [myId()], 'i');
    if (!$p) DB::ok();
    $nid = (int)($body['notif_id'] ?? 0);
    if ($nid) {
        DB::get()->run("UPDATE parent_notifications SET is_read=TRUE WHERE notif_id=? AND parent_id=?",
            [$nid, $p['parent_id']], 'ii');
    } else {
        DB::get()->run("UPDATE parent_notifications SET is_read=TRUE WHERE parent_id=?",
            [$p['parent_id']], 'i');
    }
    DB::ok();
}

// ============================================================
// TEACHER
// ============================================================

function handleTeacherStats(): never {
    authRole('teacher', 'admin', 'officer');
    $db = DB::get();
    $stats = $db->all("SELECT sub.subject_id, sub.name AS subject_name, sub.color AS subject_color,
                     sub.icon,
                     COUNT(DISTINCT sc.student_id)        AS student_count,
                     COUNT(sc.score_id)                   AS total_plays,
                     ROUND(AVG(sc.score), 1)              AS avg_score,
                     MAX(sc.score)                        AS best_score
              FROM subjects sub
              LEFT JOIN games g ON g.subject_id = sub.subject_id
              LEFT JOIN scores sc ON sc.game_id = g.game_id
                   AND " . teacherScopeSql('(SELECT st.classroom_id FROM students st WHERE st.student_id = sc.student_id)', 'sub.subject_id') . "
              WHERE " . (myRole() === 'teacher'
                  ? "EXISTS (SELECT 1 FROM teacher_assignments ta WHERE ta.teacher_user_id = " . myId() . " AND (ta.subject_id IS NULL OR ta.subject_id = sub.subject_id))"
                  : 'TRUE') . "
              GROUP BY sub.subject_id, sub.name, sub.color, sub.icon
              ORDER BY sub.subject_id");
    $total = $db->one("SELECT COUNT(*) AS c FROM students st JOIN users u ON u.user_id = st.user_id
                       WHERE u.is_active=TRUE AND " . teacherScopeSql('st.classroom_id'));
    DB::ok(['subjects' => $stats, 'total_students' => (int)$total['c']]);
}

function handleAllStudents(): never {
    authRole('teacher', 'admin', 'officer');
    ensureClassroomSchema();
    $db       = DB::get();
    $students = $db->all(
        "SELECT u.user_id, st.student_id, u.full_name, st.grade, st.classroom_id, c.room_no,
                COUNT(DISTINCT sc.score_id)  AS games_played,
                ROUND(AVG(sc.score), 1)      AS avg_score,
                MAX(sc.played_at)            AS last_active
         FROM students st
         JOIN users u ON u.user_id=st.user_id
         LEFT JOIN classrooms c ON c.classroom_id=st.classroom_id
         LEFT JOIN scores sc ON sc.student_id=st.student_id
              AND " . teacherScopeSql('st.classroom_id', '(SELECT g.subject_id FROM games g WHERE g.game_id = sc.game_id)') . "
         WHERE u.is_active=TRUE AND " . teacherScopeSql('st.classroom_id') . "
         GROUP BY u.user_id, st.student_id, u.full_name, st.grade, st.classroom_id, c.room_no
         ORDER BY st.grade, c.room_no, u.full_name"
    );
    DB::ok(['students' => $students]);
}

// ============================================================
// 2.0 จัดการข้อมูลผู้ใช้ (admin)
// ============================================================
function resolveStudentScope(int $requestedStudentId = 0): int {
    $db = DB::get();
    if (myRole() === 'student') {
        $st = $db->one("SELECT student_id FROM students WHERE user_id=?", [myId()], 'i');
        return (int)($st['student_id'] ?? 0);
    }
    if (myRole() === 'parent') {
        $p = $db->one("SELECT parent_id FROM parents WHERE user_id=?", [myId()], 'i');
        if (!$p) return 0;
        if (!$requestedStudentId) {
            $first = $db->one("SELECT student_id FROM parent_student WHERE parent_id=? ORDER BY student_id LIMIT 1", [$p['parent_id']], 'i');
            return (int)($first['student_id'] ?? 0);
        }
        $link = $db->one("SELECT 1 FROM parent_student WHERE parent_id=? AND student_id=?", [$p['parent_id'], $requestedStudentId], 'ii');
        return $link ? $requestedStudentId : 0;
    }
    return teacherCanSeeStudent($requestedStudentId) ? $requestedStudentId : 0;
}

function handleStudentAnalytics(): never {
    authRole('student', 'parent', 'teacher', 'admin');
    $db = DB::get();
    $studentId = resolveStudentScope((int)($_GET['student_id'] ?? 0));
    if (!$studentId) DB::fail('ไม่พบ student_id', 404);

    $overview = $db->one(
        "SELECT COUNT(*) AS total_plays, ROUND(AVG(score),1) AS avg_score, SUM(time_spent) AS total_time,
                MAX(played_at) AS last_played
         FROM scores WHERE student_id=?",
        [$studentId], 'i'
    ) ?: [];
    $trend = $db->all(
        "SELECT TO_CHAR(played_at, 'YYYY-MM-DD') AS played_day, score
         FROM scores WHERE student_id=?
         ORDER BY played_at DESC LIMIT 8",
        [$studentId], 'i'
    );
    $mastery = $db->all(
        "SELECT sm.skill_key, sm.skill_name, sm.mastery_score, sm.last_score, sm.weak_streak,
                sub.name AS subject_name, sub.color AS subject_color
         FROM student_mastery sm
         JOIN subjects sub ON sub.subject_id = sm.subject_id
         WHERE sm.student_id=?
         ORDER BY sm.mastery_score ASC, sm.updated_at DESC",
        [$studentId], 'i'
    );
    $reviewItems = $db->all(
        "SELECT prompt_text, correct_answer, student_answer, skill_name, COUNT(*) AS miss_count
         FROM score_attempt_details
         WHERE student_id=? AND is_correct=FALSE
         GROUP BY prompt_text, correct_answer, student_answer, skill_name
         ORDER BY miss_count DESC
         LIMIT 10",
        [$studentId], 'i'
    );
    $badges = $db->all(
        "SELECT badge_code, badge_title, description, awarded_at
         FROM student_badges WHERE student_id=?
         ORDER BY awarded_at DESC",
        [$studentId], 'i'
    );
    $plans = $db->all(
        "SELECT lp.plan_id, lp.title, lp.description, lp.week_start, lp.due_at, lp.status,
                COUNT(lpi.item_id) AS total_items,
                SUM(CASE WHEN COALESCE(best.best_score, 0) >= lpi.target_score THEN 1 ELSE 0 END) AS completed_items
         FROM learning_plans lp
         LEFT JOIN learning_plan_items lpi ON lpi.plan_id = lp.plan_id
         LEFT JOIN (
            SELECT student_id, game_id, MAX(score) AS best_score
            FROM scores
            WHERE student_id=?
            GROUP BY student_id, game_id
         ) best ON best.student_id = lp.student_id AND best.game_id = lpi.game_id
         WHERE lp.student_id=?
         GROUP BY lp.plan_id
         ORDER BY lp.week_start DESC, lp.created_at DESC
         LIMIT 10",
        [$studentId, $studentId], 'ii'
    );

    $daysSince = null;
    if (!empty($overview['last_played'])) {
        $daysSince = (int)floor((time() - strtotime($overview['last_played'])) / 86400);
    }
    $alerts = [];
    if ($daysSince !== null && $daysSince >= 7) $alerts[] = 'ไม่ได้เข้าเรียนเกิน 7 วัน';
    if (!empty($mastery) && (float)$mastery[0]['mastery_score'] < 60) $alerts[] = 'มีหัวข้ออ่อนที่ควรทบทวนทันที';

    DB::ok([
        'overview' => [
            'total_plays' => (int)($overview['total_plays'] ?? 0),
            'avg_score' => (float)($overview['avg_score'] ?? 0),
            'total_time' => (int)($overview['total_time'] ?? 0),
            'last_played' => $overview['last_played'] ?? null,
            'days_since_active' => $daysSince,
            'badge_count' => count($badges),
        ],
        'trend' => array_reverse($trend),
        'mastery' => $mastery,
        'review_items' => $reviewItems,
        'badges' => $badges,
        'plans' => $plans,
        'alerts' => $alerts,
    ]);
}

function handleStudentPlans(): never {
    authRole('student', 'parent', 'teacher', 'admin');
    $db = DB::get();
    $studentId = resolveStudentScope((int)($_GET['student_id'] ?? 0));
    if (!$studentId) DB::fail('ไม่พบ student_id', 404);
    $plans = $db->all(
        "SELECT lp.plan_id, lp.title, lp.description, lp.week_start, lp.due_at, lp.status,
                lpi.item_id, lpi.game_id, lpi.lesson_no, lpi.target_score, lpi.sort_order,
                g.name AS game_name, g.icon AS game_icon, sub.name AS subject_name,
                COALESCE(best.best_score, 0) AS best_score
         FROM learning_plans lp
         LEFT JOIN learning_plan_items lpi ON lpi.plan_id = lp.plan_id
         LEFT JOIN games g ON g.game_id = lpi.game_id
         LEFT JOIN subjects sub ON sub.subject_id = g.subject_id
         LEFT JOIN (
            SELECT student_id, game_id, MAX(score) AS best_score
            FROM scores
            WHERE student_id=?
            GROUP BY student_id, game_id
         ) best ON best.student_id = lp.student_id AND best.game_id = lpi.game_id
         WHERE lp.student_id=?
         ORDER BY lp.week_start DESC, lp.plan_id DESC, lpi.sort_order ASC",
        [$studentId, $studentId], 'ii'
    );
    DB::ok(['plans' => $plans]);
}

function handleCreatePlan(): never {
    global $body;
    authRole('teacher', 'admin');
    $db = DB::get();
    $studentId = (int)($body['student_id'] ?? 0);
    $title = trim((string)($body['title'] ?? 'แผนรายสัปดาห์'));
    $description = trim((string)($body['description'] ?? ''));
    $weekStart = trim((string)($body['week_start'] ?? date('Y-m-d')));
    $dueAt = trim((string)($body['due_at'] ?? ''));
    $items = is_array($body['items'] ?? null) ? $body['items'] : [];
    if (!$studentId || !$items) DB::fail('ต้องมี student_id และรายการเกม', 400);

    $db->run(
        "INSERT INTO learning_plans (student_id, teacher_user_id, title, description, week_start, due_at, status)
         VALUES (?,?,?,?,?,?, 'active')",
        [$studentId, myId(), $title, $description, $weekStart, $dueAt ?: null],
        'iissss'
    );
    $planId = $db->insertId();

    $sortOrder = 1;
    foreach ($items as $item) {
        if (!is_array($item) || empty($item['game_id'])) continue;
        $db->run(
            "INSERT INTO learning_plan_items (plan_id, game_id, lesson_no, target_score, sort_order)
             VALUES (?,?,?,?,?)",
            [$planId, (int)$item['game_id'], (int)($item['lesson_no'] ?? 1), (int)($item['target_score'] ?? 80), $sortOrder++],
            'iiiii'
        );
    }

    createParentNotification($studentId, 'มีแผนการเรียนใหม่', 'ครูได้มอบหมายแผนรายสัปดาห์ใหม่ให้แล้ว', 'info', '📘', 'plan_' . $planId);
    logAudit('plan_created', 'learning_plan', (string)$planId, $title, ['student_id' => $studentId, 'item_count' => count($items)]);
    try { refreshStudentNotifications($studentId); } catch (Exception $e) {}

    DB::ok(['plan_id' => $planId]);
}

function createParentNotificationUnique(int $studentId, string $title, string $message, string $type = 'info', string $icon = '🔔', string $eventKey = ''): void {
    $db = DB::get();
    $parents = $db->all(
        "SELECT p.parent_id
         FROM parent_student ps
         JOIN parents p ON p.parent_id = ps.parent_id
         WHERE ps.student_id=?",
        [$studentId], 'i'
    );

    foreach ($parents as $parent) {
        if ($eventKey !== '') {
            $exists = $db->one(
                "SELECT notif_id FROM parent_notifications WHERE parent_id=? AND student_id=? AND event_key=? LIMIT 1",
                [$parent['parent_id'], $studentId, $eventKey],
                'iis'
            );
            if ($exists) {
                $db->run(
                    "UPDATE parent_notifications
                    SET title=?, message=?, notif_type=?, ico=?, created_at=NOW(), is_read=FALSE
                     WHERE notif_id=?",
                    [$title, $message, $type, $icon, $exists['notif_id']],
                    'ssssi'
                );
                continue;
            }
        }

        $db->run(
            "INSERT INTO parent_notifications (parent_id, student_id, ico, title, message, notif_type, event_key)
             VALUES (?,?,?,?,?,?,?)",
            [$parent['parent_id'], $studentId, $icon, $title, $message, $type, $eventKey ?: null],
            'iisssss'
        );
    }
}

function refreshStudentNotifications(int $studentId): void {
    $db = DB::get();
    $recent = $db->all(
        "SELECT score, played_at FROM scores WHERE student_id=? ORDER BY played_at DESC LIMIT 10",
        [$studentId], 'i'
    );
    if ($recent) {
        $recentAvg = array_sum(array_map(fn($r) => (int)$r['score'], array_slice($recent, 0, 5))) / max(1, count(array_slice($recent, 0, 5)));
        $olderChunk = array_slice($recent, 5, 5);
        $olderAvg = $olderChunk ? (array_sum(array_map(fn($r) => (int)$r['score'], $olderChunk)) / count($olderChunk)) : null;
        if ($olderAvg !== null && ($olderAvg - $recentAvg) >= 15) {
            createParentNotificationUnique(
                $studentId,
                'คะแนนมีแนวโน้มลดลง',
                'ผลเล่นล่าสุดลดลงจากช่วงก่อนหน้าอย่างเห็นได้ชัด ควรช่วยทบทวนเป็นพิเศษ',
                'warn',
                '📉',
                'score_drop'
            );
        }
    }

    $activePlan = $db->one(
        "SELECT lp.plan_id, lp.title,
                COUNT(lpi.item_id) AS total_items,
                SUM(CASE WHEN COALESCE(best.best_score, 0) >= lpi.target_score THEN 1 ELSE 0 END) AS completed_items
         FROM learning_plans lp
         LEFT JOIN learning_plan_items lpi ON lpi.plan_id = lp.plan_id
         LEFT JOIN (
            SELECT student_id, game_id, MAX(score) AS best_score
            FROM scores WHERE student_id=?
            GROUP BY student_id, game_id
         ) best ON best.student_id = lp.student_id AND best.game_id = lpi.game_id
         WHERE lp.student_id=? AND lp.status='active'
         GROUP BY lp.plan_id
         ORDER BY lp.week_start DESC, lp.plan_id DESC
         LIMIT 1",
        [$studentId, $studentId], 'ii'
    );

    if ($activePlan && (int)$activePlan['total_items'] > 0 && (int)$activePlan['completed_items'] >= (int)$activePlan['total_items']) {
        createParentNotificationUnique(
            $studentId,
            'ทำเป้าหมายครบแล้ว',
            'นักเรียนทำแผน "' . $activePlan['title'] . '" ครบแล้ว',
            'praise',
            '🎯',
            'plan_complete_' . $activePlan['plan_id']
        );
        $db->run("UPDATE learning_plans SET status='completed' WHERE plan_id=?", [$activePlan['plan_id']], 'i');
    }
}

function handleNotificationsV2(): never {
    authRole('parent');
    $p = DB::get()->one("SELECT parent_id FROM parents WHERE user_id=?", [myId()], 'i');
    if (!$p) DB::ok(['notifications' => [], 'summary' => ['unread' => 0, 'total' => 0]]);
    $notifs = DB::get()->all(
        "SELECT n.*, u.full_name AS student_name
         FROM parent_notifications n
         JOIN students st ON st.student_id = n.student_id
         JOIN users u ON u.user_id = st.user_id
         WHERE n.parent_id=?
         ORDER BY n.created_at DESC
         LIMIT 80",
        [$p['parent_id']], 'i'
    );
    $summary = DB::get()->one(
        "SELECT COUNT(*) AS total, SUM(CASE WHEN is_read=FALSE THEN 1 ELSE 0 END) AS unread
         FROM parent_notifications WHERE parent_id=?",
        [$p['parent_id']], 'i'
    ) ?: ['total' => 0, 'unread' => 0];
    DB::ok(['notifications' => $notifs, 'summary' => ['total' => (int)$summary['total'], 'unread' => (int)$summary['unread']]]);
}

function handleCreatePlanV2(): never {
    global $body;
    authRole('teacher', 'admin');
    $db = DB::get();

    if (isset($body['student_ids'])) {
        DB::fail('ระบบนี้มอบหมายแผนได้ทีละนักเรียน 1 คนเท่านั้น', 400);
    }

    $studentId = (int)($body['student_id'] ?? 0);
    $title = trim((string)($body['title'] ?? 'แผนรายสัปดาห์'));
    $description = trim((string)($body['description'] ?? ''));
    $weekStart = trim((string)($body['week_start'] ?? date('Y-m-d')));
    $dueAt = trim((string)($body['due_at'] ?? ''));
    $items = is_array($body['items'] ?? null) ? $body['items'] : [];
    if (!$studentId || !$items) DB::fail('ต้องมี student_id และรายการเกม', 400);

    $student = $db->one(
        "SELECT st.student_id, u.full_name
         FROM students st JOIN users u ON u.user_id = st.user_id
         WHERE st.student_id=?",
        [$studentId], 'i'
    );
    if (!$student) DB::fail('ไม่พบนักเรียนที่เลือก', 404);

    $db->run(
        "INSERT INTO learning_plans (student_id, teacher_user_id, title, description, week_start, due_at, status)
         VALUES (?,?,?,?,?,?, 'active')",
        [$studentId, myId(), $title, $description, $weekStart, $dueAt ?: null],
        'iissss'
    );
    $planId = $db->insertId();

    $sortOrder = 1;
    foreach ($items as $item) {
        if (!is_array($item) || empty($item['game_id'])) continue;
        $db->run(
            "INSERT INTO learning_plan_items (plan_id, game_id, lesson_no, target_score, sort_order)
             VALUES (?,?,?,?,?)",
            [$planId, (int)$item['game_id'], (int)($item['lesson_no'] ?? 1), (int)($item['target_score'] ?? 80), $sortOrder++],
            'iiiii'
        );
    }

    createParentNotificationUnique(
        $studentId,
        'มีแผนการเรียนใหม่',
        'ครูได้มอบหมายแผน "' . $title . '" ให้กับ ' . $student['full_name'],
        'info',
        '📘',
        'plan_' . $planId
    );
    logAudit('plan_created', 'learning_plan', (string)$planId, $title, ['student_id' => $studentId, 'item_count' => count($items)]);

    DB::ok(['plan_id' => $planId]);
}

function handleHealthCheck(): never {
    $db = DB::get();
    $dbCheck = $db->one("SELECT 1 AS ok");
    DB::ok([
        'status' => 'healthy',
        'db' => (bool)($dbCheck['ok'] ?? false),
        'checks' => [
            'database' => (bool)($dbCheck['ok'] ?? false),
        ],
        'timestamp' => date('c'),
    ]);
}

function handleReportV2(): never {
    authRole('admin');
    $db   = DB::get();
    $type = $_GET['type'] ?? 'summary';

    if ($type === 'engagement') {
        $rows = $db->all(
            "SELECT DATE(sc.played_at) AS day,
                    COUNT(*) AS plays,
                    ROUND(AVG(sc.score),1) AS avg_score,
                    ROUND(AVG(sc.time_spent),1) AS avg_time,
                    COUNT(DISTINCT sc.student_id) AS active_students
             FROM scores sc
             WHERE sc.played_at >= NOW() - INTERVAL '30 days'
             GROUP BY DATE(sc.played_at)
             ORDER BY day ASC"
        );
        DB::ok(['engagement' => $rows]);
    }

    if ($type === 'at_risk') {
        $rows = $db->all(
            "SELECT * FROM (
                SELECT u.full_name, st.grade, st.student_id,
                       ROUND(AVG(sc.score),1) AS avg_score,
                       MAX(sc.played_at) AS last_active,
                       COALESCE(MIN(sm.mastery_score), 0) AS weakest_mastery,
                       COALESCE(DATE_PART('day', NOW() - MAX(sc.played_at)), 999999) AS inactive_days
                FROM students st
                JOIN users u ON u.user_id = st.user_id
                LEFT JOIN scores sc ON sc.student_id = st.student_id
                LEFT JOIN student_mastery sm ON sm.student_id = st.student_id
                GROUP BY st.student_id, u.user_id
             ) risk
             WHERE avg_score < 60 OR inactive_days >= 7 OR weakest_mastery < 60
             ORDER BY inactive_days DESC, weakest_mastery ASC, avg_score ASC NULLS FIRST
             LIMIT 100"
        );
        DB::ok(['students' => $rows]);
    }

    if ($type === 'mastery') {
        $rows = $db->all(
            "SELECT sub.name AS subject_name, sm.skill_name,
                    ROUND(AVG(sm.mastery_score),1) AS avg_mastery,
                    COUNT(*) AS student_count
             FROM student_mastery sm
             JOIN subjects sub ON sub.subject_id = sm.subject_id
             GROUP BY sub.subject_id, sm.skill_name
             ORDER BY avg_mastery ASC, sub.subject_id ASC"
        );
        DB::ok(['mastery' => $rows]);
    }

    if ($type === 'plans') {
        $rows = $db->all(
            "SELECT lp.plan_id, lp.title, lp.week_start, lp.due_at, lp.status,
                    u.full_name AS student_name,
                    COUNT(lpi.item_id) AS total_items,
                    SUM(CASE WHEN COALESCE(best.best_score, 0) >= lpi.target_score THEN 1 ELSE 0 END) AS completed_items
             FROM learning_plans lp
             JOIN students st ON st.student_id = lp.student_id
             JOIN users u ON u.user_id = st.user_id
             LEFT JOIN learning_plan_items lpi ON lpi.plan_id = lp.plan_id
             LEFT JOIN (
                SELECT student_id, game_id, MAX(score) AS best_score
                FROM scores
                GROUP BY student_id, game_id
             ) best ON best.student_id = lp.student_id AND best.game_id = lpi.game_id
             GROUP BY lp.plan_id, u.user_id
             ORDER BY lp.created_at DESC"
        );
        DB::ok(['plans' => $rows]);
    }

    if ($type === 'notifications') {
        $rows = $db->all(
            "SELECT notif_type, COUNT(*) AS total, SUM(CASE WHEN is_read=FALSE THEN 1 ELSE 0 END) AS unread
             FROM parent_notifications
             GROUP BY notif_type
             ORDER BY total DESC"
        );
        DB::ok(['notifications' => $rows]);
    }

    handleReport();
}

function handleAdminUsers(): never {
    authRole('admin');
    ensureClassroomSchema();
    $db   = DB::get();
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = 50;
    $offset = ($page - 1) * $limit;
    $role   = $_GET['role'] ?? '';
    $search = $_GET['search'] ?? '';

    $where = 'WHERE 1=1';
    $params = []; $types = '';
    [$dateSql] = accountDateFilter('u.created_at');
    $where .= $dateSql;
    if ($role)   { $where .= ' AND u.role=?';          $params[] = $role;   $types .= 's'; }
    if ($search) { $where .= ' AND (u.full_name LIKE ? OR u.username LIKE ?)';
                   $s = "%$search%"; $params[] = $s; $params[] = $s; $types .= 'ss'; }

    $users = $db->all("SELECT u.user_id, u.username, u.full_name, u.email, u.role,
            u.is_active, u.created_at, u.updated_at,
            COALESCE(s.grade,'—') AS grade, c.room_no,
            COALESCE(p.phone,'—') AS phone,
            COALESCE(t.department,'—') AS department
        FROM users u
        LEFT JOIN students s ON s.user_id=u.user_id
        LEFT JOIN classrooms c ON c.classroom_id=s.classroom_id
        LEFT JOIN parents  p ON p.user_id=u.user_id
        LEFT JOIN teachers t ON t.user_id=u.user_id
        $where ORDER BY u.created_at DESC LIMIT $limit OFFSET $offset",
        $params, $types ?: '');
    $total = $db->one("SELECT COUNT(*) AS c FROM users u $where", $params, $types ?: '');
    DB::ok(['users' => $users, 'total' => (int)($total['c'] ?? 0), 'page' => $page]);
}

function handleAdminToggleUser(): never {
    global $body;
    authRole('admin');
    $uid = (int)($body['user_id'] ?? 0);
    if (!$uid || $uid === myId()) DB::fail('ไม่สามารถดำเนินการได้', 400);
    // สลับค่าใน SQL: PDO ส่ง false เป็น '' ซึ่ง PostgreSQL ไม่รับเป็น BOOLEAN
    $u = DB::get()->one("UPDATE users SET is_active = NOT is_active WHERE user_id=? RETURNING is_active", [$uid], 'i');
    if (!$u) DB::fail('ไม่พบผู้ใช้', 404);
    DB::ok(['is_active' => (bool)$u['is_active']]);
}

function handleAdminDeleteUser(): never {
    global $body;
    authRole('admin');
    $uid = (int)($body['user_id'] ?? 0);
    if (!$uid || $uid === myId()) DB::fail('ไม่สามารถลบตัวเองได้', 400);
    DB::get()->run("DELETE FROM users WHERE user_id=?", [$uid], 'i');
    DB::ok();
}

function handleAdminResetPassword(): never {
    global $body;
    authRole('admin');
    $uid  = (int)($body['user_id'] ?? 0);
    $pass = $body['new_password'] ?? '';
    if (!$uid) DB::fail('ต้องส่ง user_id', 400);
    if (strlen($pass) < 8) DB::fail('New password must be at least 8 characters', 400);
    DB::get()->run("UPDATE users SET password=? WHERE user_id=?",
        [password_hash($pass, PASSWORD_BCRYPT), $uid], 'si');
    DB::ok(['message' => 'รีเซ็ตรหัสผ่านสำเร็จ']);
}

// ============================================================
// 3.0 จัดการวิชา/หลักสูตร (admin/teacher)
// ============================================================
function handleSaveSubject(): never {
    global $body;
    authRole('admin', 'teacher');
    $db   = DB::get();
    $sid  = (int)($body['subject_id'] ?? 0);
    $name = trim($body['name'] ?? '');
    $desc = trim($body['description'] ?? '');
    $icon = trim($body['icon'] ?? '📚');
    $color = trim($body['color'] ?? '#4CAF50');
    $order = (int)($body['order_no'] ?? 1);
    if (!$name) DB::fail('ต้องใส่ชื่อวิชา', 400);
    if ($sid) {
        $db->run("UPDATE subjects SET name=?,description=?,icon=?,color=?,order_no=? WHERE subject_id=?",
            [$name,$desc,$icon,$color,$order,$sid], 'ssssii');
    } else {
        $db->run("INSERT INTO subjects (name,description,icon,color,order_no) VALUES (?,?,?,?,?)",
            [$name,$desc,$icon,$color,$order], 'ssssi');
        $sid = $db->insertId();
    }
    DB::ok(['subject_id' => $sid]);
}

function handleToggleSubject(): never {
    global $body;
    authRole('admin');
    $sid = (int)($body['subject_id'] ?? 0);
    if (!$sid) DB::fail('ต้องส่ง subject_id', 400);
    $s = DB::get()->one("UPDATE subjects SET is_active = NOT is_active WHERE subject_id=? RETURNING is_active", [$sid], 'i');
    if (!$s) DB::fail('ไม่พบวิชา', 404);
    DB::ok(['is_active' => (bool)$s['is_active']]);
}

// ============================================================
// 4.0 ครูแก้ไขคำถาม-คำตอบในเกม
// ============================================================
// ============================================================
// 8.0 ออกรายงาน (ผู้บริหาร/ครู)
// ============================================================
function handleReport(): never {
    authRole('admin');
    $db   = DB::get();
    $type = $_GET['type'] ?? 'summary';

    if ($type === 'summary') {
        $students = $db->one("SELECT COUNT(*) AS c FROM users WHERE role='student' AND is_active=TRUE");
        $parents  = $db->one("SELECT COUNT(*) AS c FROM users WHERE role='parent'  AND is_active=TRUE");
        $teachers = $db->one("SELECT COUNT(*) AS c FROM users WHERE role='teacher' AND is_active=TRUE");
        $games    = $db->one("SELECT COUNT(*) AS c FROM scores");
        $avgScore = $db->one("SELECT ROUND(AVG(score),1) AS a FROM scores");
        DB::ok([
            'total_students' => (int)$students['c'],
            'total_parents'  => (int)$parents['c'],
            'total_teachers' => (int)$teachers['c'],
            'total_plays'    => (int)$games['c'],
            'avg_score'      => (float)($avgScore['a'] ?? 0),
        ]);
    }
    if ($type === 'by_subject') {
        $rows = $db->all("SELECT sub.subject_id, sub.name AS subject_name, sub.icon, sub.color,
            COUNT(DISTINCT sc.student_id) AS student_count,
            COUNT(sc.score_id) AS total_plays,
            ROUND(AVG(sc.score),1) AS avg_score,
            MAX(sc.score) AS best_score
            FROM subjects sub
            LEFT JOIN games g ON g.subject_id=sub.subject_id
            LEFT JOIN scores sc ON sc.game_id=g.game_id
            GROUP BY sub.subject_id ORDER BY sub.order_no");
        DB::ok(['subjects' => $rows]);
    }
    if ($type === 'by_student') {
        $rows = $db->all("SELECT u.user_id, u.full_name, st.grade,
            COUNT(sc.score_id) AS total_plays,
            ROUND(AVG(sc.score),1) AS avg_score,
            MAX(sc.played_at) AS last_active
            FROM students st JOIN users u ON u.user_id=st.user_id
            LEFT JOIN scores sc ON sc.student_id=st.student_id
            WHERE u.is_active=TRUE
            GROUP BY st.student_id, u.user_id ORDER BY avg_score DESC NULLS LAST LIMIT 100");
        DB::ok(['students' => $rows]);
    }
    if ($type === 'daily') {
        $days = (int)($_GET['days'] ?? 30);
        $rows = $db->all("SELECT DATE(played_at) AS day, COUNT(*) AS plays,
            ROUND(AVG(score),1) AS avg_score,
            COUNT(DISTINCT student_id) AS active_students
            FROM scores WHERE played_at >= NOW() - (CAST(? AS INT) * INTERVAL '1 day')
            GROUP BY DATE(played_at) ORDER BY day ASC",
            [$days], 'i');
        DB::ok(['daily' => $rows]);
    }
    DB::fail('ประเภทรายงานไม่ถูกต้อง', 400);
}


// ============================================================
// FORGOT / RESET PASSWORD
// ============================================================

function handleForgotPassword(): never {
    global $body;
    $db    = DB::get();
    $email = trim($body['email'] ?? '');
    if (!$email) DB::fail('กรุณากรอกอีเมล', 400);

    $user = $db->one("SELECT user_id, full_name FROM users WHERE email=? AND is_active=TRUE", [$email], 's');
    // ไม่บอกว่าอีเมลมีหรือไม่ (security)
    if (!$user) DB::ok(['message' => 'หากอีเมลนี้มีในระบบ จะได้รับรหัสรีเซ็ต']);

    // สร้าง token 6 หลัก (OTP style — ง่ายต่อการใช้งานในระบบโรงเรียน)
    $token = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expires = date('Y-m-d H:i:s', time() + 1800); // 30 นาที

    // ลบ token เก่า
    $db->run("DELETE FROM password_resets WHERE user_id=?", [$user['user_id']], 'i');
    $db->run("INSERT INTO password_resets (user_id,token,expires_at) VALUES (?,?,?)",
        [$user['user_id'], $token, $expires], 'iss');

    // ในระบบจริงควรส่งอีเมล — ระบบนี้ return token โดยตรง (สำหรับ demo/โรงเรียน)
    DB::ok([
        'message' => 'รหัส OTP สำหรับรีเซ็ตรหัสผ่าน (ใช้ได้ 30 นาที)',
        'otp'     => $token,   // production: ส่งอีเมลแทน
        'name'    => $user['full_name'],
    ]);
}

function handleResetPassword(): never {
    global $body;
    $db    = DB::get();
    $email = trim($body['email']    ?? '');
    $token = trim($body['token']    ?? '');
    $pass  = $body['new_password']  ?? '';

    if (!$email || !$token || !$pass) DB::fail('กรุณากรอกข้อมูลให้ครบ', 400);
    if (strlen($pass) < 6)           DB::fail('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 400);

    $user = $db->one("SELECT user_id FROM users WHERE email=? AND is_active=TRUE", [$email], 's');
    if (!$user) DB::fail('ไม่พบอีเมลนี้ในระบบ', 404);

    $reset = $db->one(
        "SELECT reset_id FROM password_resets
         WHERE user_id=? AND token=? AND expires_at>NOW() AND used=FALSE",
        [$user['user_id'], $token], 'is'
    );
    if (!$reset) DB::fail('รหัส OTP ไม่ถูกต้องหรือหมดอายุแล้ว', 400);

    // อัปเดตรหัสผ่าน
    $db->run("UPDATE users SET password=? WHERE user_id=?",
        [password_hash($pass, PASSWORD_BCRYPT), $user['user_id']], 'si');
    $db->run("UPDATE password_resets SET used=TRUE WHERE reset_id=?", [$reset['reset_id']], 'i');

    DB::ok(['message' => 'เปลี่ยนรหัสผ่านสำเร็จ']);
}

// ตรวจสอบอีเมลเบื้องต้น (format + ไม่ซ้ำในระบบ)
function handleValidateEmail(): never {
    $email = trim($_GET['email'] ?? '');
    if (!$email) DB::fail('ต้องส่ง email', 400);

    // ตรวจ format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL))
        DB::ok(['valid' => false, 'reason' => 'รูปแบบอีเมลไม่ถูกต้อง']);

    // ตรวจซ้ำในระบบ
    $exists = DB::get()->one("SELECT 1 FROM users WHERE email=?", [$email], 's');
    if ($exists)
        DB::ok(['valid' => false, 'reason' => 'อีเมลนี้ถูกใช้งานแล้ว']);

    // ตรวจ domain จาก MX record (basic)
    $domain = substr(strrchr($email, '@'), 1);
    $hasMX  = checkdnsrr($domain, 'MX');
    $hasA   = checkdnsrr($domain, 'A');

    if (!$hasMX && !$hasA)
        DB::ok(['valid' => false, 'reason' => "โดเมน $domain ไม่พบในระบบ DNS"]);

    DB::ok(['valid' => true, 'reason' => 'อีเมลถูกต้อง']);
}


// ============================================================
// โหลดคำถามสำหรับเล่นเกม (public — ไม่ต้อง auth)
// รองรับทุกประเภท: mcq, truefalse, fill, matching, sequence, wordsearch
// ============================================================
// ============================================================
// OFFICER HANDLERS — เจ้าหน้าที่จัดการผู้ใช้
// ============================================================

function handleOfficerUsers(): never {
    authRole('officer', 'admin');
    ensureClassroomSchema();
    $db = DB::get();
    [$dateSql, $dateParams] = accountDateFilter('u.created_at');
    
    // ดึงรายชื่อผู้ใช้ทั้งหมด
    $users = $db->all(
        "SELECT u.user_id, u.username, u.email, u.full_name, u.role, u.is_active, 
                u.created_at, u.updated_at, s.grade, s.classroom_id, c.room_no, p.phone, t.department
         FROM users u
         LEFT JOIN students s ON s.user_id = u.user_id
         LEFT JOIN classrooms c ON c.classroom_id = s.classroom_id
         LEFT JOIN parents p ON p.user_id = u.user_id
         LEFT JOIN teachers t ON t.user_id = u.user_id
         WHERE u.role IN ('student', 'parent', 'teacher', 'officer', 'executive') $dateSql
         ORDER BY u.created_at DESC"
        , $dateParams
    );
    
    DB::ok(['users' => $users]);
}

function handleOfficerUpdateUser(): never {
    global $body;
    authRole('officer', 'admin');
    $db = DB::get();
    
    $uid   = (int)($body['user_id'] ?? 0);
    $name  = trim($body['full_name'] ?? '');
    $email = trim($body['email'] ?? '');
    $phone = trim($body['phone'] ?? '');
    $dept  = trim($body['department'] ?? '');
    
    if (!$uid || !$name) DB::fail('ต้องส่ง user_id และ full_name', 400);
    
    $user = $db->one("SELECT role FROM users WHERE user_id=?", [$uid], 'i');
    if (!$user) DB::fail('ไม่พบผู้ใช้', 404);

    if ($user['role'] === 'parent' && $phone) setParentPhone($uid, $phone);

    // อัปเดต users table
    if ($email) {
        $existing = $db->one("SELECT 1 FROM users WHERE email=? AND user_id!=?", [$email, $uid], 'si');
        if ($existing) DB::fail('อีเมลนี้ถูกใช้แล้ว', 409);
        $db->run("UPDATE users SET full_name=?, email=? WHERE user_id=?", [$name, $email, $uid], 'ssi');
    } else {
        $db->run("UPDATE users SET full_name=? WHERE user_id=?", [$name, $uid], 'si');
    }
    
    // อัปเดต role-specific tables
    if ($user['role'] === 'student' && !empty($body['classroom_id'])) {
        setStudentClassroom($uid, $body['classroom_id']);
    }
    if ($user['role'] === 'teacher' && $dept) {
        $db->run("UPDATE teachers SET department=? WHERE user_id=?", [$dept, $uid], 'si');
    }
    if ($user['role'] === 'officer' && $dept) {
        $db->run("UPDATE officers SET department=? WHERE user_id=?", [$dept, $uid], 'si');
    }
    if ($user['role'] === 'executive' && $dept) {
        $db->run("UPDATE executives SET department=? WHERE user_id=?", [$dept, $uid], 'si');
    }
    
    DB::ok(['message' => 'อัปเดตสำเร็จ']);
}

function handleOfficerDeleteUser(): never {
    global $body;
    authRole('officer', 'admin');
    $db = DB::get();
    
    $uid = (int)($body['user_id'] ?? 0);
    if (!$uid) DB::fail('ต้องส่ง user_id', 400);
    
    $user = $db->one("SELECT role FROM users WHERE user_id=?", [$uid], 'i');
    if (!$user) DB::fail('ไม่พบผู้ใช้', 404);
    if ($user['role'] === 'admin') DB::fail('ไม่สามารถลบผู้ดูแลระบบได้', 403);
    
    // ลบผู้ใช้ (CASCADE จะลบข้อมูลที่เกี่ยวข้อง)
    $db->run("DELETE FROM users WHERE user_id=?", [$uid], 'i');
    
    DB::ok(['message' => 'ลบผู้ใช้สำเร็จ']);
}

// ============================================================
// EXECUTIVE HANDLERS — ผู้บริหาร (View-only)
// ============================================================

function handleExecutiveDashboard(): never {
    authRole('executive', 'admin');
    $db = DB::get();
    [$accountDateSql, $dateParams] = accountDateFilter('u.created_at');
    [$scoreDateSql] = accountDateFilter('sc.played_at');
    $students = $db->one("SELECT COUNT(*) AS c FROM students s JOIN users u ON u.user_id=s.user_id WHERE u.is_active=TRUE$accountDateSql", $dateParams);
    $teachers = $db->one("SELECT COUNT(*) AS c FROM teachers t JOIN users u ON u.user_id=t.user_id WHERE u.is_active=TRUE$accountDateSql", $dateParams);
    $totalPlays = $db->one("SELECT COUNT(*) AS c FROM scores sc WHERE TRUE$scoreDateSql");
    $avgScore = $db->one("SELECT ROUND(AVG(sc.score),1) AS a FROM scores sc WHERE TRUE$scoreDateSql");
    
    DB::ok([
        'total_students' => (int)($students['c'] ?? 0),
        'total_teachers' => (int)($teachers['c'] ?? 0),
        'total_plays' => (int)($totalPlays['c'] ?? 0),
        'avg_score' => (float)($avgScore['a'] ?? 0),
    ]);
}

function handleExecutiveUsers(): never {
    authRole('executive', 'admin');
    $db = DB::get();
    [$dateSql, $dateParams] = accountDateFilter('u.created_at');
    // ดึงข้อมูลผู้ใช้ทั้งหมด (View-only)
    $users = $db->all(
        "SELECT u.user_id, u.username, u.full_name, u.email, u.role, u.is_active, u.created_at, u.updated_at,
                s.grade, p.phone, t.department
         FROM users u
         LEFT JOIN students s ON s.user_id = u.user_id
         LEFT JOIN parents p ON p.user_id = u.user_id
         LEFT JOIN teachers t ON t.user_id = u.user_id
         WHERE u.is_active = TRUE$dateSql
         ORDER BY u.role, u.full_name"
        , $dateParams
    );
    
    DB::ok(['users' => $users]);
}

function handleExecutiveContent(): never {
    authRole('executive', 'admin');
    $db = DB::get();

    $type = $_GET['type'] ?? 'all';
    
    if ($type === 'scores') {
        [$scoreDateSql] = accountDateFilter('sc.played_at');
        $scores = $db->all(
            "SELECT sc.score_id, sc.score, 100 AS max_score, sc.time_spent, sc.played_at,
                    u.full_name AS student_name,
                    g.name AS game_name,
                    sub.name AS subject_name,
                    sub.icon AS subject_icon
             FROM scores sc
             JOIN students st ON st.student_id = sc.student_id
             JOIN users u ON u.user_id = st.user_id
             LEFT JOIN games g ON g.game_id = sc.game_id
             LEFT JOIN subjects sub ON sub.subject_id = g.subject_id
             WHERE TRUE$scoreDateSql
             ORDER BY sc.played_at DESC
             LIMIT 120"
        );
        DB::ok(['type' => 'scores', 'scores' => $scores]);
    }


    DB::ok(['type' => $type, 'items' => []]);
}


// ============================================================
// สร้างเจ้าหน้าที่/ผู้บริหาร — Admin เรียกได้
// ============================================================
function handleAdminCreateStaff(): never {
    global $body;
    authRole('admin');
    _doCreateStaff($body);
}

// ============================================================
// สร้างเจ้าหน้าที่/ผู้บริหาร — Officer เรียกได้
// ============================================================
function handleOfficerCreateStaff(): never {
    global $body;
    authRole('officer', 'admin');
    _doCreateStaff($body);
}

// ── ฟังก์ชันกลางสร้าง officer / executive ──────────────────
function _doCreateStaff(array $body): never {
    $db         = DB::get();
    $role       = $body['role']       ?? '';
    $username   = trim($body['username']   ?? '');
    $email      = trim($body['email']      ?? '');
    $password   = $body['password']   ?? '';
    $full_name  = trim($body['full_name']  ?? '');
    $department = trim($body['department'] ?? '');
    $title      = trim($body['title']      ?? '');      // executive เท่านั้น
    $permissions= trim($body['permissions']?? '');

    // validation
    if (!in_array($role, ['officer', 'executive'], true))
        DB::fail('role ต้องเป็น officer หรือ executive', 400);
    if (!$username || !$email || !$full_name)
        DB::fail('ต้องกรอก username, email, ชื่อ-นามสกุล', 400);

    // ตรวจ username / email ซ้ำ
    if ($db->one("SELECT user_id FROM users WHERE username=?", [$username], 's'))
        DB::fail("username '$username' มีอยู่แล้ว", 409);
    if ($db->one("SELECT user_id FROM users WHERE email=?", [$email], 's'))
        DB::fail("email '$email' มีอยู่แล้ว", 409);

    if (strlen($password) < 8)
        DB::fail('Password must be at least 8 characters', 400);

    $hash = password_hash($password, PASSWORD_BCRYPT);
    $db->run(
        "INSERT INTO users (username,email,password,role,full_name) VALUES (?,?,?,?,?)",
        [$username, $email, $hash, $role, $full_name], 'sssss'
    );
    $uid = $db->insertId();

    if ($role === 'officer') {
        $db->run(
            "INSERT INTO officers (user_id,department,permissions) VALUES (?,?,?)",
            [$uid, $department ?: null, $permissions ?: null], 'iss'
        );
    } else {
        $db->run(
            "INSERT INTO executives (user_id,title,department,permissions) VALUES (?,?,?,?)",
            [$uid, $title ?: null, $department ?: null, $permissions ?: null], 'isss'
        );
    }

    DB::ok(['user_id' => $uid, 'message' => "สร้าง $role สำเร็จ"]);
}

function handleStudentPlansV2(): never {
    authRole('student', 'parent', 'teacher', 'admin');
    $db = DB::get();
    $requestedStudentId = (int)($_GET['student_id'] ?? 0);
    $role = myRole();

    if (in_array($role, ['teacher', 'admin'], true)) {
        if ($requestedStudentId > 0 && !teacherCanSeeStudent($requestedStudentId)) DB::fail('ไม่มีสิทธิ์ดูนักเรียนคนนี้', 403);
        if ($requestedStudentId > 0) {
            $plans = $db->all(
                "SELECT lp.plan_id, lp.student_id, u.full_name AS student_name, lp.title, lp.description, lp.week_start, lp.due_at, lp.status,
                        lpi.item_id, lpi.game_id, lpi.lesson_no, lpi.target_score, lpi.sort_order,
                        g.name AS game_name, g.icon AS game_icon, sub.name AS subject_name,
                        COALESCE(best.best_score, 0) AS best_score
                 FROM learning_plans lp
                 JOIN students st ON st.student_id = lp.student_id
                 JOIN users u ON u.user_id = st.user_id
                 LEFT JOIN learning_plan_items lpi ON lpi.plan_id = lp.plan_id
                 LEFT JOIN games g ON g.game_id = lpi.game_id
                 LEFT JOIN subjects sub ON sub.subject_id = g.subject_id
                 LEFT JOIN (
                    SELECT student_id, game_id, MAX(score) AS best_score
                    FROM scores
                    WHERE student_id=?
                    GROUP BY student_id, game_id
                 ) best ON best.student_id = lp.student_id AND best.game_id = lpi.game_id
                 WHERE lp.student_id=?
                 ORDER BY lp.week_start DESC, lp.plan_id DESC, lpi.sort_order ASC",
                [$requestedStudentId, $requestedStudentId], 'ii'
            );
        } else {
            $plans = $db->all(
                "SELECT lp.plan_id, lp.student_id, u.full_name AS student_name, lp.title, lp.description, lp.week_start, lp.due_at, lp.status,
                        lpi.item_id, lpi.game_id, lpi.lesson_no, lpi.target_score, lpi.sort_order,
                        g.name AS game_name, g.icon AS game_icon, sub.name AS subject_name,
                        COALESCE(best.best_score, 0) AS best_score
                 FROM learning_plans lp
                 JOIN students st ON st.student_id = lp.student_id
                 JOIN users u ON u.user_id = st.user_id
                 LEFT JOIN learning_plan_items lpi ON lpi.plan_id = lp.plan_id
                 LEFT JOIN games g ON g.game_id = lpi.game_id
                 LEFT JOIN subjects sub ON sub.subject_id = g.subject_id
                 LEFT JOIN (
                    SELECT student_id, game_id, MAX(score) AS best_score
                    FROM scores
                    GROUP BY student_id, game_id
                 ) best ON best.student_id = lp.student_id AND best.game_id = lpi.game_id
                 WHERE " . teacherScopeSql('st.classroom_id') . "
                 ORDER BY lp.week_start DESC, lp.plan_id DESC, lpi.sort_order ASC"
            );
        }

        DB::ok(['plans' => $plans]);
    }

    $studentId = resolveStudentScope($requestedStudentId);
    if (!$studentId) DB::fail('ไม่พบ student_id', 404);

    $plans = $db->all(
        "SELECT lp.plan_id, lp.student_id, u.full_name AS student_name, lp.title, lp.description, lp.week_start, lp.due_at, lp.status,
                lpi.item_id, lpi.game_id, lpi.lesson_no, lpi.target_score, lpi.sort_order,
                g.name AS game_name, g.icon AS game_icon, sub.name AS subject_name,
                COALESCE(best.best_score, 0) AS best_score
         FROM learning_plans lp
         JOIN students st ON st.student_id = lp.student_id
         JOIN users u ON u.user_id = st.user_id
         LEFT JOIN learning_plan_items lpi ON lpi.plan_id = lp.plan_id
         LEFT JOIN games g ON g.game_id = lpi.game_id
         LEFT JOIN subjects sub ON sub.subject_id = g.subject_id
         LEFT JOIN (
            SELECT student_id, game_id, MAX(score) AS best_score
            FROM scores
            WHERE student_id=?
            GROUP BY student_id, game_id
         ) best ON best.student_id = lp.student_id AND best.game_id = lpi.game_id
         WHERE lp.student_id=?
         ORDER BY lp.week_start DESC, lp.plan_id DESC, lpi.sort_order ASC",
        [$studentId, $studentId], 'ii'
    );
    DB::ok(['plans' => $plans]);
}

function handleCreatePlanV3(): never {
    global $body;
    authRole('teacher', 'admin');
    $db = DB::get();

    $title = trim((string)($body['title'] ?? 'แผนรายสัปดาห์'));
    $description = trim((string)($body['description'] ?? ''));
    $weekStart = trim((string)($body['week_start'] ?? date('Y-m-d')));
    $dueAt = trim((string)($body['due_at'] ?? ''));
    $items = is_array($body['items'] ?? null) ? $body['items'] : [];

    $studentIds = [];
    $singleStudentId = (int)($body['student_id'] ?? 0);
    if ($singleStudentId > 0) $studentIds[] = $singleStudentId;
    if (is_array($body['student_ids'] ?? null)) {
        foreach ($body['student_ids'] as $candidateId) {
            $candidateId = (int)$candidateId;
            if ($candidateId > 0) $studentIds[] = $candidateId;
        }
    }
    $studentIds = array_values(array_unique($studentIds));

    if (!$studentIds || !$items) DB::fail('ต้องมี student_id หรือ student_ids และรายการเกม', 400);

    $createdPlans = [];
    foreach ($studentIds as $studentId) {
        $student = $db->one(
            "SELECT st.student_id, u.full_name
             FROM students st
             JOIN users u ON u.user_id = st.user_id
             WHERE st.student_id=?",
            [$studentId], 'i'
        );
        if (!$student || !teacherCanSeeStudent($studentId)) continue;

        $db->run(
            "INSERT INTO learning_plans (student_id, teacher_user_id, title, description, week_start, due_at, status)
             VALUES (?,?,?,?,?,?, 'active')",
            [$studentId, myId(), $title, $description, $weekStart, $dueAt ?: null],
            'iissss'
        );
        $planId = $db->insertId();

        $sortOrder = 1;
        foreach ($items as $item) {
            if (!is_array($item) || empty($item['game_id'])) continue;
            $db->run(
                "INSERT INTO learning_plan_items (plan_id, game_id, lesson_no, target_score, sort_order)
                 VALUES (?,?,?,?,?)",
                [$planId, (int)$item['game_id'], (int)($item['lesson_no'] ?? 1), (int)($item['target_score'] ?? 80), $sortOrder++],
                'iiiii'
            );
        }

        createParentNotificationUnique(
            $studentId,
            'มีแผนการเรียนใหม่',
            'ครูได้มอบหมายแผน "' . $title . '" ให้กับ ' . $student['full_name'],
            'info',
            '??',
            'plan_' . $planId
        );
        logAudit('plan_created', 'learning_plan', (string)$planId, $title, ['student_id' => $studentId, 'item_count' => count($items)]);
        try { refreshStudentNotifications($studentId); } catch (Exception $e) {}

        $createdPlans[] = [
            'plan_id' => $planId,
            'student_id' => $studentId,
            'student_name' => $student['full_name'],
        ];
    }

    if (!$createdPlans) DB::fail('ไม่พบนักเรียนที่เลือก', 404);

    DB::ok([
        'plan_id' => $createdPlans[0]['plan_id'],
        'plan_ids' => array_column($createdPlans, 'plan_id'),
        'created' => $createdPlans,
        'created_count' => count($createdPlans),
    ]);
}
