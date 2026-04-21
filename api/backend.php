<?php
// ============================================================
// api/backend.php โ€” KidLearn PHP API
// เนเธเนเธเธฑเธ database_normalized.sql (เนเธขเธเธ•เธฒเธฃเธฒเธ students/parents/teachers)
// Docker: เธฃเธฑเธเธ”เนเธงเธข docker compose up -d
// ============================================================

// โ”€โ”€ CONFIG โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€
define('DB_HOST', getenv('DB_HOST') ?: 'db');
define('DB_USER', getenv('DB_USER') ?: 'kidlearn');
define('DB_PASS', getenv('DB_PASS') ?: 'kidlearn123');
define('DB_NAME', getenv('DB_NAME') ?: 'kidlearn_db');

header('Content-Type: application/json; charset=utf-8');
// เธฃเธญเธเธฃเธฑเธเธ—เธฑเนเธ localhost เนเธฅเธฐ 127.0.0.1
// CORS โ€” เธฃเธญเธเธฃเธฑเธเธ—เธธเธ origin เธ—เธตเนเน€เธเนเธ localhost
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (empty($origin)) {
    // เนเธกเนเธกเธต Origin header (same-origin request) โ€” เนเธกเนเธ•เนเธญเธเธชเนเธ CORS header
} elseif (
    str_contains($origin, 'localhost') ||
    str_contains($origin, '127.0.0.1') ||
    preg_match('/^https?:\/\/localhost(:\d+)?$/', $origin)
) {
    header("Access-Control-Allow-Origin: $origin");
}
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

// โ”€โ”€ DATABASE โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€
class DB {
    private static ?DB $i = null;
    private mysqli $c;

    private function __construct() {
        $this->c = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        $this->c->set_charset('utf8mb4');
        if ($this->c->connect_error) self::fail('DB error: ' . $this->c->connect_error);
    }

    public static function get(): self { if (!self::$i) self::$i = new self(); return self::$i; }

    public function run(string $sql, array $p = [], string $t = ''): mysqli_stmt {
        $stmt = $this->c->prepare($sql);
        if (!$stmt) self::fail('Query: ' . $this->c->error . ' | SQL: ' . $sql);
        if ($p) $stmt->bind_param($t ?: str_repeat('s', count($p)), ...$p);
        $stmt->execute();
        return $stmt;
    }

    public function all(string $sql, array $p = [], string $t = ''): array {
        $r = $this->run($sql, $p, $t)->get_result();
        return $r ? $r->fetch_all(MYSQLI_ASSOC) : [];
    }

    public function one(string $sql, array $p = [], string $t = ''): ?array {
        $r = $this->run($sql, $p, $t)->get_result();
        return $r ? ($r->fetch_assoc() ?: null) : null;
    }

    public function insertId(): int { return $this->c->insert_id; }
    public function affected(): int { return $this->c->affected_rows; }

    // rawQuery โ€” เนเธกเน throw/exit เน€เธกเธทเนเธญ error (เนเธเนเธเธฑเธ CALL SP)
    public function rawQuery(string $sql): bool {
        return $this->c->query($sql) !== false;
    }

    public static function ok(mixed $data = []): never {
        echo json_encode(array_merge(['ok' => true], is_array($data) ? $data : ['data' => $data]),
            JSON_UNESCAPED_UNICODE); exit;
    }

    public static function fail(string $msg, int $code = 500): never {
        http_response_code($code);
        echo json_encode(['ok' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE); exit;
    }
}

// โ”€โ”€ SESSION โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€
if (session_status() === PHP_SESSION_NONE) {
    // session config เธกเธฒเธเธฒเธ docker/php.ini
    // เน€เธเธดเธ” session
    session_start();
}
function me(): ?array   { return $_SESSION['user'] ?? null; }
function myId(): int    { return (int)($_SESSION['user']['user_id'] ?? 0); }
function myRole(): string { return $_SESSION['user']['role'] ?? ''; }
function auth(): void   { if (!me()) DB::fail('Unauthorized', 401); }
function authRole(string ...$roles): void {
    auth();
    if (!in_array(myRole(), $roles)) DB::fail('Forbidden', 403);
}

function tableColumnExists(string $table, string $column): bool {
    $row = DB::get()->one(
        "SELECT 1
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?
         LIMIT 1",
        [DB_NAME, $table, $column],
        'sss'
    );

    return $row !== null;
}

function addColumnIfMissing(string $table, string $column, string $definition): void {
    if (tableColumnExists($table, $column)) return;
    try {
        DB::get()->rawQuery("ALTER TABLE {$table} ADD COLUMN {$column} {$definition}");
    } catch (mysqli_sql_exception $e) {
        if ((int)$e->getCode() !== 1060) {
            throw $e;
        }
    }
}

function ensureQuestionImageColumnCapacity(): void {
    static $done = false;
    if ($done) return;
    $done = true;

    $row = DB::get()->one(
        "SELECT DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'questions' AND COLUMN_NAME = 'question_img'
         LIMIT 1",
        [DB_NAME],
        's'
    );

    if (!$row) return;
    $dataType = strtolower((string)($row['DATA_TYPE'] ?? ''));
    $maxLen = (int)($row['CHARACTER_MAXIMUM_LENGTH'] ?? 0);
    if ($dataType !== 'mediumtext' || $maxLen > 0) {
        DB::get()->rawQuery("ALTER TABLE questions MODIFY COLUMN question_img MEDIUMTEXT NULL");
    }
}

function ensureAdvancedSchema(): void {
    static $done = false;
    if ($done) return;
    $done = true;

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

function inferSkillMeta(array $game): array {
    $subjectId = (int)($game['subject_id'] ?? 0);
    $gameName = mb_strtolower(trim((string)($game['name'] ?? '')), 'UTF-8');

    $map = [
        1 => ['key' => 'math_foundation', 'name' => 'เธเธทเนเธเธเธฒเธเธเธ“เธดเธ•เธจเธฒเธชเธ•เธฃเน'],
        2 => ['key' => 'science_concepts', 'name' => 'เนเธเธงเธเธดเธ”เธงเธดเธ—เธขเธฒเธจเธฒเธชเธ•เธฃเน'],
        3 => ['key' => 'thai_language', 'name' => 'เธ เธฒเธฉเธฒเนเธ—เธข'],
        4 => ['key' => 'english_language', 'name' => 'เธ เธฒเธฉเธฒเธญเธฑเธเธเธคเธฉ'],
        5 => ['key' => 'social_studies', 'name' => 'เธชเธฑเธเธเธกเธจเธถเธเธฉเธฒ'],
        6 => ['key' => 'health_education', 'name' => 'เธชเธธเธเธจเธถเธเธฉเธฒ'],
    ];

    $skill = $map[$subjectId] ?? ['key' => 'general_learning', 'name' => 'เธ—เธฑเธเธฉเธฐเธเธฒเธฃเน€เธฃเธตเธขเธเธฃเธนเน'];

    $keywordMap = [
        'เธเธงเธ' => ['addition', 'เธเธฒเธฃเธเธงเธเน€เธฅเธ'],
        'เธฅเธ' => ['subtraction', 'เธเธฒเธฃเธฅเธเน€เธฅเธ'],
        'เน€เธฅเธ' => ['number_sense', 'เธเธงเธฒเธกเน€เธเนเธฒเนเธเธเธณเธเธงเธ'],
        'เธเธณเธจเธฑเธเธ—เน' => ['vocabulary', 'เธเธณเธจเธฑเธเธ—เน'],
        'เธชเธฐเธเธ”' => ['spelling', 'เธเธฒเธฃเธชเธฐเธเธ”เธเธณ'],
        'เธญเนเธฒเธ' => ['reading', 'เธเธฒเธฃเธญเนเธฒเธ'],
        'เธเธฃเธฐเนเธขเธ' => ['sentence_building', 'เธเธฒเธฃเน€เธฃเธตเธขเธเธเธฃเธฐเนเธขเธ'],
        'world search' => ['word_search', 'เธเธฒเธฃเธเนเธเธซเธฒเธเธณ'],
        'english' => ['english_reading', 'เธเธฒเธฃเธญเนเธฒเธเธ เธฒเธฉเธฒเธญเธฑเธเธเธคเธฉ'],
        'เธงเธดเธ—เธขเน' => ['science_reasoning', 'เธเธฒเธฃเธเธดเธ”เน€เธเธดเธเธงเธดเธ—เธขเธฒเธจเธฒเธชเธ•เธฃเน'],
    ];

    foreach ($keywordMap as $needle => $mapped) {
        if ($gameName !== '' && mb_strpos($gameName, $needle, 0, 'UTF-8') !== false) {
            return ['key' => $mapped[0], 'name' => $mapped[1]];
        }
    }

    return $skill;
}

function upsertMastery(int $studentId, int $subjectId, string $skillKey, string $skillName, float $latestScore, int $attemptsCount, int $wrongCount): void {
    ensureAdvancedSchema();
    $db = DB::get();
    $row = $db->one(
        "SELECT mastery_id, mastery_score, weak_streak, strong_streak, attempts_count
         FROM student_mastery WHERE student_id=? AND skill_key=?",
        [$studentId, $skillKey], 'is'
    );

    if ($row) {
        $prev = (float)$row['mastery_score'];
        $newScore = round(($prev * 0.65) + ($latestScore * 0.35), 2);
        $weakStreak = $latestScore < 60 ? ((int)$row['weak_streak'] + 1) : 0;
        $strongStreak = $latestScore >= 85 ? ((int)$row['strong_streak'] + 1) : 0;
        $db->run(
            "UPDATE student_mastery
             SET subject_id=?, skill_name=?, mastery_score=?, last_score=?, attempts_count=attempts_count+?,
                 weak_streak=?, strong_streak=?, updated_at=NOW()
             WHERE mastery_id=?",
            [$subjectId, $skillName, $newScore, $latestScore, max(1, $attemptsCount), $weakStreak, $strongStreak, $row['mastery_id']],
            'isddiiii'
        );
        return;
    }

    $db->run(
        "INSERT INTO student_mastery
         (student_id, subject_id, skill_key, skill_name, mastery_score, last_score, attempts_count, weak_streak, strong_streak)
         VALUES (?,?,?,?,?,?,?,?,?)",
        [$studentId, $subjectId, $skillKey, $skillName, $latestScore, $latestScore, max(1, $attemptsCount), $latestScore < 60 ? 1 : 0, $latestScore >= 85 ? 1 : 0],
        'iissddiii'
    );
}

function createParentNotification(int $studentId, string $title, string $message, string $type = 'info', string $icon = '๐””', string $eventKey = ''): void {
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

function awardBadge(int $studentId, string $badgeCode, string $title, string $description, array $meta = []): bool {
    ensureAdvancedSchema();
    $db = DB::get();
    $exists = $db->one("SELECT badge_id FROM student_badges WHERE student_id=? AND badge_code=?", [$studentId, $badgeCode], 'is');
    if ($exists) return false;
    $db->run(
        "INSERT INTO student_badges (student_id, badge_code, badge_title, description, meta_json)
         VALUES (?,?,?,?,?)",
        [$studentId, $badgeCode, $title, $description, jsonEncodeSafe($meta)],
        'issss'
    );
    createParentNotification($studentId, 'เนเธ”เนเธฃเธฑเธเน€เธซเธฃเธตเธขเธเนเธซเธกเน', "เน€เธ”เนเธเนเธ”เนเธฃเธฑเธเน€เธซเธฃเธตเธขเธ \"$title\" เนเธฅเนเธง", 'praise', '๐…', 'badge_' . $badgeCode);
    return true;
}

function recalcStudentBadges(int $studentId): void {
    ensureAdvancedSchema();
    $db = DB::get();
    $summary = $db->one(
        "SELECT COUNT(*) AS total_plays, MAX(score) AS best_score, COUNT(DISTINCT DATE(played_at)) AS active_days
         FROM scores WHERE student_id=?",
        [$studentId], 'i'
    ) ?: ['total_plays' => 0, 'best_score' => 0, 'active_days' => 0];

    if ((int)$summary['total_plays'] >= 1) {
        awardBadge($studentId, 'first_steps', 'เธเนเธฒเธงเนเธฃเธเธเธญเธเธเธฑเธเน€เธฃเธตเธขเธ', 'เน€เธฃเธดเนเธกเน€เธฅเนเธเนเธฅเธฐเธเธฑเธเธ—เธถเธเธเธฐเนเธเธเธเธฃเธฑเนเธเนเธฃเธ');
    }
    if ((int)$summary['total_plays'] >= 5) {
        awardBadge($studentId, 'five_sessions', 'เธเธฑเธเธเธถเธเธเธฃเธฐเธเธณ', 'เน€เธฅเนเธเธเธฃเธ 5 เธเธฃเธฑเนเธ');
    }
    if ((int)$summary['best_score'] >= 100) {
        awardBadge($studentId, 'perfect_score', 'เธเธฐเนเธเธเน€เธ•เนเธก 100', 'เธ—เธณเธเธฐเนเธเธเน€เธ•เนเธกเนเธเน€เธเธกเธญเธขเนเธฒเธเธเนเธญเธข 1 เธเธฃเธฑเนเธ');
    }
    if ((int)$summary['active_days'] >= 3) {
        awardBadge($studentId, 'three_day_streak', 'เธชเธกเนเธณเน€เธชเธกเธญ 3 เธงเธฑเธ', 'เน€เธเนเธฒเน€เธฃเธตเธขเธเธญเธขเนเธฒเธเธเนเธญเธข 3 เธงเธฑเธ');
    }
}

// โ”€โ”€ ROUTER โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€
$action = $_GET['action'] ?? '';
$body   = json_decode(file_get_contents('php://input'), true) ?? [];

ensureAdvancedSchema();

match ($action) {
    'login'           => handleLogin(),
    'logout'          => handleLogout(),
    'register'        => handleRegister(),
    'me'              => handleMe(),
    'update_profile'  => handleUpdateProfile(),
    'change_password' => handleChangePassword(),
    'subjects'        => handleSubjects(),
    'games'           => handleGames(),
    'save_score'      => handleSaveScoreV2(),
    'scores'          => handleScores(),
    'lesson_content'  => handleLessonContentV2(),
    'get_content'     => handleGetContent(),
    'my_children'     => handleMyChildren(),
    'link_child'      => handleLinkChild(),
    'auto_link'       => handleAutoLink(),
    'unlink_child'    => handleUnlinkChild(),
    'recommendations' => handleRecommendations(),
    'notifications'   => handleNotificationsV2(),
    'mark_notif_read' => handleMarkNotifRead(),
    'teacher_stats'   => handleTeacherStats(),
    'all_students'    => handleAllStudents(),
    'save_lesson'     => handleSaveLessonV2(),
    'lesson_history'  => handleLessonHistory(),
    'delete_lesson'   => handleDeleteLesson(),
    'save_game_settings' => handleSaveGameSettings(),
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
    // 4.0 game questions
    'game_questions'     => handleGetGameQuestions(),
    'play_questions'     => handlePlayQuestions(),   // เนเธซเธฅเธ”เธเธณเธ–เธฒเธกเธชเธณเธซเธฃเธฑเธเน€เธฅเนเธเน€เธเธก
    'save_question'      => handleSaveQuestion(),
    'delete_question'    => handleDeleteQuestion(),
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
    $u    = trim($body['username'] ?? $_POST['username'] ?? '');
    $pass = $body['password'] ?? $_POST['password'] ?? '';
    if (!$u || !$pass) DB::fail('เธเธฃเธธเธ“เธฒเธเธฃเธญเธเธเนเธญเธกเธนเธฅเนเธซเนเธเธฃเธ', 400);

    $user = $db->one(
        "SELECT u.*, s.student_id, s.grade, s.parent_phone,
                p.parent_id, p.phone,
                t.teacher_id, t.department,
                o.officer_id, o.permissions as officer_permissions,
                e.executive_id, e.title as executive_title, e.permissions as executive_permissions
         FROM users u
         LEFT JOIN students s ON s.user_id = u.user_id
         LEFT JOIN parents  p ON p.user_id = u.user_id
         LEFT JOIN teachers t ON t.user_id = u.user_id
         LEFT JOIN officers o ON o.user_id = u.user_id
         LEFT JOIN executives e ON e.user_id = u.user_id
         WHERE (u.username=? OR u.email=?) AND u.is_active=1",
        [$u, $u], 'ss'
    );
    if (!$user || !password_verify($pass, $user['password']))
        DB::fail('เธเธทเนเธญเธเธนเนเนเธเนเธซเธฃเธทเธญเธฃเธซเธฑเธชเธเนเธฒเธเนเธกเนเธ–เธนเธเธ•เนเธญเธ', 401);

    unset($user['password']);

    // เธ”เธถเธ children list เธ–เนเธฒเน€เธเนเธ parent
    if ($user['role'] === 'parent' && $user['parent_id']) {
        $kids = $db->all(
            "SELECT student_id FROM parent_student WHERE parent_id=?",
            [$user['parent_id']], 'i'
        );
        $user['children'] = array_column($kids, 'student_id');
    } else {
        $user['children'] = [];
    }

    $_SESSION['user'] = $user;
    DB::ok(['user' => $user]);
}

function handleLogout(): never {
    session_destroy();
    DB::ok();
}

// โ”€โ”€ normalize เน€เธเธญเธฃเนเนเธ—เธฃเนเธซเนเน€เธเนเธ 10 เธซเธฅเธฑเธเน€เธชเธกเธญ โ”€โ”€
function normalizePhone(string $raw): string {
    $p = preg_replace('/\D/', '', $raw);
    if (strlen($p) === 9) $p = '0' . $p;  // 812345678 โ’ 0812345678
    return $p;
}

function handleRegister(): never {
    global $body;
    $db    = DB::get();
    $name  = trim($body['full_name']  ?? '');
    $uname = trim($body['username']   ?? '');
    $email = trim($body['email']      ?? '');
    $pass  = $body['password']        ?? '';
    $role  = $body['role']            ?? 'student';

    if (!$name || !$uname || !$email || !$pass) DB::fail('เธเธฃเธธเธ“เธฒเธเธฃเธญเธเธเนเธญเธกเธนเธฅเนเธซเนเธเธฃเธ', 400);
    if (strlen($pass) < 6)                      DB::fail('เธฃเธซเธฑเธชเธเนเธฒเธเธ•เนเธญเธเธกเธตเธญเธขเนเธฒเธเธเนเธญเธข 6 เธ•เธฑเธงเธญเธฑเธเธฉเธฃ', 400);
    if (!in_array($role, ['student','parent','teacher','officer','executive'])) DB::fail('role เนเธกเนเธ–เธนเธเธ•เนเธญเธ', 400);

    if ($db->one("SELECT 1 FROM users WHERE username=?", [$uname], 's'))
        DB::fail('เธเธทเนเธญเธเธนเนเนเธเนเธเธตเนเธ–เธนเธเนเธเนเนเธฅเนเธง', 409);
    if ($db->one("SELECT 1 FROM users WHERE email=?", [$email], 's'))
        DB::fail('เธญเธตเน€เธกเธฅเธเธตเนเธ–เธนเธเนเธเนเนเธฅเนเธง', 409);

    $hash = password_hash($pass, PASSWORD_BCRYPT);

    // INSERT users
    $db->run("INSERT INTO users (username,email,password,role,full_name) VALUES (?,?,?,?,?)",
        [$uname, $email, $hash, $role, $name], 'sssss');
    $uid = $db->insertId();

    // INSERT role-specific table
    if ($role === 'student') {
        $grade = $body['grade'] ?? 'เธ.1';
        $pp = normalizePhone($body['parent_phone'] ?? '');
        if (!$pp || strlen($pp) < 9) DB::fail('เธเธฃเธธเธ“เธฒเธเธฃเธญเธเน€เธเธญเธฃเนเนเธ—เธฃเธเธนเนเธเธเธเธฃเธญเธเนเธซเนเธ–เธนเธเธ•เนเธญเธ', 400);
        $db->run("INSERT INTO students (user_id,grade,parent_phone) VALUES (?,?,?)",
            [$uid, $grade, $pp], 'iss');
        $sid = $db->insertId();
        // auto-link parent
        $parent = $db->one("SELECT parent_id FROM parents WHERE phone=?", [$pp], 's');
        if ($parent) {
            $db->run("INSERT IGNORE INTO parent_student (parent_id,student_id) VALUES (?,?)",
                [$parent['parent_id'], $sid], 'ii');
        }
    }

    if ($role === 'parent') {
        $phone = normalizePhone($body['phone'] ?? '');
        if (!$phone || strlen($phone) < 9) DB::fail('เธเธฃเธธเธ“เธฒเธเธฃเธญเธเน€เธเธญเธฃเนเนเธ—เธฃเนเธซเนเธ–เธนเธเธ•เนเธญเธ', 400);
        if ($db->one("SELECT 1 FROM parents WHERE phone=?", [$phone], 's'))
            DB::fail('เน€เธเธญเธฃเนเนเธ—เธฃเธเธตเนเธ–เธนเธเนเธเนเนเธฅเนเธง', 409);
        $db->run("INSERT INTO parents (user_id,phone) VALUES (?,?)", [$uid, $phone], 'is');
        $pid = $db->insertId();
        // auto-link existing students โ€” match เธ—เธฑเนเธ 10 เธซเธฅเธฑเธ เนเธฅเธฐ 9 เธซเธฅเธฑเธ
        $phone9 = ltrim($phone, '0');
        $students = $db->all(
            "SELECT student_id FROM students WHERE parent_phone=? OR parent_phone=?",
            [$phone, $phone9], 'ss'
        );
        foreach ($students as $s) {
            $db->run("INSERT IGNORE INTO parent_student (parent_id,student_id) VALUES (?,?)",
                [$pid, $s['student_id']], 'ii');
        }
    }

    if ($role === 'teacher') {
        $dept = trim($body['department'] ?? '');
        $db->run("INSERT INTO teachers (user_id,department) VALUES (?,?)", [$uid, $dept], 'is');
    }

    if ($role === 'officer') {
        $dept = trim($body['department'] ?? 'เธเนเธฒเธขเธเธธเธเธเธฅ');
        $db->run("INSERT INTO officers (user_id,department) VALUES (?,?)", [$uid, $dept], 'is');
    }

    if ($role === 'executive') {
        $title = trim($body['title'] ?? 'เธเธนเนเธเธฃเธดเธซเธฒเธฃ');
        $dept  = trim($body['department'] ?? 'เธเธฃเธดเธซเธฒเธฃ');
        $db->run("INSERT INTO executives (user_id,title,department) VALUES (?,?,?)", [$uid, $title, $dept], 'iss');
    }

    DB::ok(['user_id' => $uid]);
}

function handleMe(): never {
    auth();
    $user = DB::get()->one(
        "SELECT u.user_id, u.username, u.email, u.role, u.full_name,
                s.student_id, s.grade, s.parent_phone,
                p.parent_id, p.phone,
                t.teacher_id, t.department,
                o.officer_id, o.permissions as officer_permissions,
                e.executive_id, e.title as executive_title, e.permissions as executive_permissions
         FROM users u
         LEFT JOIN students s ON s.user_id = u.user_id
         LEFT JOIN parents  p ON p.user_id = u.user_id
         LEFT JOIN teachers t ON t.user_id = u.user_id
         LEFT JOIN officers o ON o.user_id = u.user_id
         LEFT JOIN executives e ON e.user_id = u.user_id
         WHERE u.user_id=?", [myId()], 'i'
    );
    if (!$user) DB::fail('เนเธกเนเธเธเธเธนเนเนเธเน', 404);

    if ($user['role'] === 'parent' && $user['parent_id']) {
        $kids = DB::get()->all("SELECT student_id FROM parent_student WHERE parent_id=?",
            [$user['parent_id']], 'i');
        $user['children'] = array_column($kids, 'student_id');
    } else {
        $user['children'] = [];
    }
    DB::ok($user);
}

function handleUpdateProfile(): never {
    global $body;
    auth();
    $db   = DB::get();
    $id   = myId();
    $role = myRole();
    $name  = trim($body['full_name'] ?? '');
    $email = trim($body['email']     ?? '');
    if (!$name || !$email) DB::fail('เธเธฃเธธเธ“เธฒเธเธฃเธญเธเธเนเธญเธกเธนเธฅเนเธซเนเธเธฃเธ', 400);

    $db->run("UPDATE users SET full_name=?,email=? WHERE user_id=?", [$name, $email, $id], 'ssi');

    if ($role === 'student') {
        $grade    = $body['grade']        ?? null;
        $pp       = preg_replace('/\D/', '', $body['parent_phone'] ?? '');
        $oldPhone = preg_replace('/\D/', '', $body['old_phone']    ?? '');
        $db->run("UPDATE students SET grade=?,parent_phone=? WHERE user_id=?",
            [$grade, $pp ?: null, $id], 'ssi');
        // re-link
        if ($pp && $pp !== $oldPhone) {
            $st = $db->one("SELECT student_id FROM students WHERE user_id=?", [$id], 'i');
            if ($st) {
                $db->run("DELETE FROM parent_student WHERE student_id=?", [$st['student_id']], 'i');
                $p2 = $db->one("SELECT parent_id FROM parents WHERE phone=?", [$pp], 's');
                if ($p2) {
                    $db->run("INSERT IGNORE INTO parent_student (parent_id,student_id) VALUES (?,?)",
                        [$p2['parent_id'], $st['student_id']], 'ii');
                }
            }
        }
    }

    if ($role === 'parent') {
        $phone    = preg_replace('/\D/', '', $body['phone']     ?? '');
        $oldPhone = preg_replace('/\D/', '', $body['old_phone'] ?? '');
        if ($phone && strlen($phone) < 9) DB::fail('เน€เธเธญเธฃเนเนเธ—เธฃเนเธกเนเธ–เธนเธเธ•เนเธญเธ', 400);
        if ($phone) $db->run("UPDATE parents SET phone=? WHERE user_id=?", [$phone, $id], 'si');
        // re-link students using new phone
        if ($phone && $phone !== $oldPhone) {
            $p = $db->one("SELECT parent_id FROM parents WHERE user_id=?", [$id], 'i');
            if ($p) {
                $students = $db->all("SELECT student_id FROM students WHERE parent_phone=?", [$phone], 's');
                foreach ($students as $s) {
                    $db->run("INSERT IGNORE INTO parent_student (parent_id,student_id) VALUES (?,?)",
                        [$p['parent_id'], $s['student_id']], 'ii');
                }
            }
        }
    }

    if ($role === 'teacher') {
        $dept = trim($body['department'] ?? '');
        $db->run("UPDATE teachers SET department=? WHERE user_id=?", [$dept, $id], 'si');
    }

    // เธญเธฑเธเน€เธ”เธ• session
    $_SESSION['user']['full_name'] = $name;
    DB::ok();
}

function handleChangePassword(): never {
    global $body;
    auth();
    $old = $body['old_password'] ?? '';
    $new = $body['new_password'] ?? '';
    if (!$old || !$new) DB::fail('เธเธฃเธธเธ“เธฒเธเธฃเธญเธเธเนเธญเธกเธนเธฅเนเธซเนเธเธฃเธ', 400);
    if (strlen($new) < 6) DB::fail('เธฃเธซเธฑเธชเธเนเธฒเธเนเธซเธกเนเธ•เนเธญเธเธกเธตเธญเธขเนเธฒเธเธเนเธญเธข 6 เธ•เธฑเธงเธญเธฑเธเธฉเธฃ', 400);
    $user = DB::get()->one("SELECT password FROM users WHERE user_id=?", [myId()], 'i');
    if (!password_verify($old, $user['password'])) DB::fail('เธฃเธซเธฑเธชเธเนเธฒเธเน€เธ”เธดเธกเนเธกเนเธ–เธนเธเธ•เนเธญเธ', 401);
    DB::get()->run("UPDATE users SET password=? WHERE user_id=?",
        [password_hash($new, PASSWORD_BCRYPT), myId()], 'si');
    DB::ok();
}

// ============================================================
// GAME / SCORES
// ============================================================

function handleSubjects(): never {
    auth();
    DB::ok(['subjects' => DB::get()->all("SELECT * FROM subjects ORDER BY order_no")]);
}

function handleGames(): never {
    auth();
    $sid = (int)($_GET['subject_id'] ?? 0);
    if (!$sid) DB::fail('เธ•เนเธญเธเธชเนเธ subject_id', 400);
    DB::ok(['games' => DB::get()->all(
        "SELECT * FROM games WHERE subject_id=? ORDER BY game_id", [$sid], 'i'
    )]);
}

function handleSaveScore(): never {
    global $body;
    auth();
    $db = DB::get();

    $gameId    = (int)($body['game_id']    ?? 0);
    $score     = (int)($body['score']      ?? 0);
    $timeSpent = (int)($body['time_spent'] ?? 0);
    $lessonNo  = (int)($body['lesson_no']  ?? 1);   // โ เธฃเธฑเธเธเธ—เธ—เธตเนเธ”เนเธงเธข
    if ($lessonNo < 1 || $lessonNo > 6) $lessonNo = 1;

    // เธซเธฒ student_id เธเธฒเธ user_id เธเธฑเธเธเธธเธเธฑเธ
    $st = $db->one("SELECT student_id FROM students WHERE user_id=?", [myId()], 'i');
    if (!$st) DB::fail('เธ•เนเธญเธเน€เธเนเธเธเธฑเธเน€เธฃเธตเธขเธเน€เธ—เนเธฒเธเธฑเนเธ', 403);
    $studentId = $st['student_id'];

    if (!$gameId) DB::fail('เธ•เนเธญเธเธชเนเธ game_id', 400);

    $db->run("INSERT INTO scores (student_id,game_id,lesson_no,score,time_spent) VALUES (?,?,?,?,?)",
        [$studentId, $gameId, $lessonNo, $score, $timeSpent], 'iiiii');
    $scoreId = $db->insertId();

    // เธญเธฑเธเน€เธ”เธ• progress cache เธเนเธฒเธ rawQuery (เนเธกเน exit เธ–เนเธฒ SP เนเธกเนเธกเธต)
    $game = $db->one("SELECT subject_id FROM games WHERE game_id=?", [$gameId], 'i');
    if ($game) {
        $db->rawQuery("CALL sp_update_progress($studentId,{$game['subject_id']})");
    }

    // Generate recommendations (เนเธเน try/catch เธเธฑเธเธเธฃเธ“เธต table เธขเธฑเธเนเธกเนเธกเธต)
    try { generateRecommendations($studentId, myId()); } catch (Exception $e) {}

    DB::ok(['score_id' => $scoreId, 'score' => $score]);
}

function handleSaveScoreV2(): never {
    global $body;
    auth();
    $db = DB::get();

    $gameId    = (int)($body['game_id'] ?? 0);
    $score     = (int)($body['score'] ?? 0);
    $timeSpent = (int)($body['time_spent'] ?? 0);
    $lessonNo  = (int)($body['lesson_no'] ?? 1);
    $attempts  = is_array($body['attempts'] ?? null) ? $body['attempts'] : [];
    if ($lessonNo < 1 || $lessonNo > 6) $lessonNo = 1;

    $st = $db->one("SELECT student_id FROM students WHERE user_id=?", [myId()], 'i');
    if (!$st) DB::fail('เธ•เนเธญเธเน€เธเนเธเธเธฑเธเน€เธฃเธตเธขเธเน€เธ—เนเธฒเธเธฑเนเธ', 403);
    $studentId = (int)$st['student_id'];
    if (!$gameId) DB::fail('เธ•เนเธญเธเธชเนเธ game_id', 400);

    $db->run(
        "INSERT INTO scores (student_id,game_id,lesson_no,score,time_spent) VALUES (?,?,?,?,?)",
        [$studentId, $gameId, $lessonNo, $score, $timeSpent],
        'iiiii'
    );
    $scoreId = $db->insertId();

    $game = $db->one("SELECT game_id, subject_id, name, game_type FROM games WHERE game_id=?", [$gameId], 'i');
    if ($game) {
        $db->rawQuery("CALL sp_update_progress($studentId,{$game['subject_id']})");
    }

    $skillMeta = inferSkillMeta($game ?: []);
    $correctCount = 0;

    foreach ($attempts as $idx => $attempt) {
        if (!is_array($attempt)) continue;
        $isCorrect = !empty($attempt['is_correct']) ? 1 : 0;
        $correctCount += $isCorrect;
        $db->run(
            "INSERT INTO score_attempt_details
             (score_id, student_id, game_id, subject_id, skill_key, skill_name, question_key, prompt_text, correct_answer, student_answer, is_correct)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            [
                $scoreId,
                $studentId,
                $gameId,
                (int)($game['subject_id'] ?? 0),
                trim((string)($attempt['skill_key'] ?? $skillMeta['key'])),
                trim((string)($attempt['skill_name'] ?? $skillMeta['name'])),
                trim((string)($attempt['question_key'] ?? ('q' . ($idx + 1)))),
                trim((string)($attempt['prompt'] ?? '')),
                trim((string)($attempt['correct_answer'] ?? '')),
                trim((string)($attempt['student_answer'] ?? '')),
                $isCorrect
            ],
            'iiiissssssi'
        );
    }

    if ($game) {
        $latestSkillScore = count($attempts) > 0
            ? round(($correctCount / max(1, count($attempts))) * 100, 2)
            : (float)$score;
        upsertMastery(
            $studentId,
            (int)$game['subject_id'],
            $skillMeta['key'],
            $skillMeta['name'],
            $latestSkillScore,
            count($attempts),
            max(0, count($attempts) - $correctCount)
        );
    }

    recalcStudentBadges($studentId);
    logAudit('score_saved', 'score', (string)$scoreId, 'เธเธฑเธเธ—เธถเธเธเธฅเธเธฒเธฃเน€เธฅเนเธเน€เธเธก', [
        'student_id' => $studentId,
        'game_id' => $gameId,
        'lesson_no' => $lessonNo,
        'score' => $score,
        'attempt_count' => count($attempts),
    ]);

    try { generateRecommendationsV2($studentId, myId()); } catch (Exception $e) {}
    try { refreshStudentNotifications($studentId); } catch (Exception $e) {}

    DB::ok(['score_id' => $scoreId, 'score' => $score]);
}

// โ”€โ”€ เธ”เธถเธเน€เธเธทเนเธญเธซเธฒเธเธ—เน€เธฃเธตเธขเธ (GET ?action=lesson_content&game_id=X&lesson_no=Y) โ”€โ”€
function handleLessonContent(): never {
    // soft auth โ€” เธ–เนเธฒ session เธซเธกเธ”เธขเธฑเธเธ”เธถเธเน€เธเธทเนเธญเธซเธฒเนเธ”เน (เน€เธเธทเนเธญเธซเธฒเน€เธเนเธ public)
    $db       = DB::get();
    $gameId   = (int)($_GET['game_id']   ?? 0);
    $lessonNo = (int)($_GET['lesson_no'] ?? 0);

    if (!$gameId) DB::fail('เธ•เนเธญเธเธชเนเธ game_id', 400);

    // เธ”เธถเธเธ—เธธเธเธเธ—เธเธญเธเน€เธเธกเธเธฑเนเธ (เนเธกเนเธฃเธฐเธเธธ lesson_no) เธซเธฃเธทเธญเธเธ—เน€เธ”เธตเธขเธง
    if ($lessonNo) {
        $content = $db->one(
            "SELECT content_id, game_id, lesson_no, title, body, summary, read_time
             FROM lesson_content
             WHERE game_id=? AND lesson_no=?
             LIMIT 1",
            [$gameId, $lessonNo], 'ii'
        );
        if (!$content) {
            DB::ok(['content' => null, 'placeholder' => true]);
        }
        DB::ok(['content' => $content]);
    } else {
        // เธ”เธถเธเธฃเธฒเธขเธเธทเนเธญเธ—เธธเธเธเธ—เธเธญเธเน€เธเธกเธเธตเน (เธชเธณเธซเธฃเธฑเธ lesson selector)
        $list = $db->all(
            "SELECT content_id, lesson_no, title, summary, read_time FROM lesson_content
             WHERE game_id=? ORDER BY lesson_no",
            [$gameId], 'i'
        );
        DB::ok(['lessons' => $list]);
    }
}

function handleLessonContentV2(): never {
    $db       = DB::get();
    $gameId   = (int)($_GET['game_id'] ?? 0);
    $lessonNo = (int)($_GET['lesson_no'] ?? 0);
    if (!$gameId) DB::fail('เธ•เนเธญเธเธชเนเธ game_id', 400);

    if ($lessonNo) {
        $content = $db->one(
            "SELECT content_id, game_id, lesson_no, title, body, summary, read_time, status, version_no, published_at, updated_by, approved_by
             FROM lesson_content
             WHERE game_id=? AND lesson_no=?
             LIMIT 1",
            [$gameId, $lessonNo], 'ii'
        );
        if (!$content) DB::ok(['content' => null, 'placeholder' => true]);
        DB::ok(['content' => $content]);
    }

    $list = $db->all(
        "SELECT content_id, lesson_no, title, summary, read_time, status, version_no, published_at
         FROM lesson_content
         WHERE game_id=? ORDER BY lesson_no",
        [$gameId], 'i'
    );
    DB::ok(['lessons' => $list]);
}

function handleLessonHistory(): never {
    authRole('teacher', 'admin', 'officer');
    $gameId = (int)($_GET['game_id'] ?? 0);
    $lessonNo = (int)($_GET['lesson_no'] ?? 1);
    if (!$gameId) DB::fail('เธ•เนเธญเธเธชเนเธ game_id', 400);
    $rows = DB::get()->all(
        "SELECT history_id, title, status, version_no, snapshot_at
         FROM lesson_content_history
         WHERE game_id=? AND lesson_no=?
         ORDER BY snapshot_at DESC
         LIMIT 20",
        [$gameId, $lessonNo], 'ii'
    );
    DB::ok(['history' => $rows]);
}

// โ”€โ”€ เธ”เธถเธเธเธฐเนเธเธเธชเธนเธเธชเธธเธ”เนเธ•เนเธฅเธฐเธเธ—เธเธญเธเธเธฑเธเน€เธฃเธตเธขเธเธเธเธเธตเน โ”€โ”€
function handleGetContent(): never {
    // soft auth
    $db     = DB::get();
    $gameId = (int)($_GET['game_id'] ?? 0);
    if (!$gameId) DB::fail('เธ•เนเธญเธเธชเนเธ game_id', 400);

    // best score per lesson_no
    $scores = [];
    if (myRole() === 'student') {
        $st = $db->one("SELECT student_id FROM students WHERE user_id=?", [myId()], 'i');
        if ($st) {
            $rows = $db->all(
                "SELECT lesson_no, MAX(score) AS best_score
                 FROM scores WHERE student_id=? AND game_id=?
                 GROUP BY lesson_no",
                [$st['student_id'], $gameId], 'ii'
            );
            foreach ($rows as $r) $scores[(int)$r['lesson_no']] = (int)$r['best_score'];
        }
    }

    // lesson list with has_content flag
    $lessons = $db->all(
        "SELECT lesson_no, title, summary, read_time FROM lesson_content
         WHERE game_id=? ORDER BY lesson_no",
        [$gameId], 'i'
    );
    // เธชเธฃเนเธฒเธ map lesson_no => has_content
    $hasContent = [];
    foreach ($lessons as $l) $hasContent[(int)$l['lesson_no']] = true;

    DB::ok(['lessons' => $lessons, 'best_scores' => $scores, 'has_content' => $hasContent]);
}

function handleScores(): never {
    auth();
    $db        = DB::get();
    $studentId = (int)($_GET['student_id'] ?? 0);

    if (myRole() === 'student') {
        // เธเธฑเธเน€เธฃเธตเธขเธเธ”เธนเธเธฐเนเธเธเธ•เธฑเธงเน€เธญเธ
        $st = $db->one("SELECT student_id FROM students WHERE user_id=?", [myId()], 'i');
        $studentId = $st ? $st['student_id'] : 0;
    } elseif (myRole() === 'parent' && $studentId) {
        // เธเธนเนเธเธเธเธฃเธญเธเธ•เนเธญเธเน€เธเธทเนเธญเธกเธเธฑเธเธเธตเธเนเธญเธ
        $p = $db->one("SELECT parent_id FROM parents WHERE user_id=?", [myId()], 'i');
        if ($p) {
            $link = $db->one("SELECT 1 FROM parent_student WHERE parent_id=? AND student_id=?",
                [$p['parent_id'], $studentId], 'ii');
            if (!$link) DB::fail('เนเธกเนเธกเธตเธชเธดเธ—เธเธดเน', 403);
        }
    }
    // teacher/admin เธชเนเธ student_id เธกเธฒเธ•เธฃเธเน เนเธกเนเธ•เนเธญเธ convert

    // เธฃเธญเธเธฃเธฑเธ filter subject_id (เธเธฃเธนเธเธฃเธญเธเธ•เธฒเธกเธงเธดเธเธฒ)
    $subjectId = (int)($_GET['subject_id'] ?? 0);

    $where  = 'WHERE 1=1';
    $params = [];
    $types  = '';
    if ($studentId) { $where .= ' AND sc.student_id=?'; $params[] = $studentId; $types .= 'i'; }
    if ($subjectId) { $where .= ' AND sub.subject_id=?'; $params[] = $subjectId; $types .= 'i'; }

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
    $p = DB::get()->one("SELECT parent_id FROM parents WHERE user_id=?", [myId()], 'i');
    if (!$p) DB::ok(['children' => []]);

    $kids = DB::get()->all(
        "SELECT u.user_id, u.full_name, st.grade, st.student_id,
                COALESCE(pr.avg_score, 0)   AS avg_score,
                COALESCE(pr.total_plays, 0) AS total_plays,
                (SELECT COUNT(*) FROM scores sc WHERE sc.student_id = st.student_id) AS total_games
         FROM parent_student ps
         JOIN students st ON st.student_id = ps.student_id
         JOIN users    u  ON u.user_id     = st.user_id
         LEFT JOIN (
             SELECT student_id, AVG(score) AS avg_score, COUNT(*) AS total_plays
             FROM scores GROUP BY student_id
         ) pr ON pr.student_id = st.student_id
         WHERE ps.parent_id=?",
        [$p['parent_id']], 'i'
    );
    DB::ok(['children' => $kids]);
}

function handleLinkChild(): never {
    global $body;
    authRole('parent');
    $phone = normalizePhone($body['parent_phone'] ?? '');
    if (!$phone || strlen($phone) < 9) DB::fail('เธเธฃเธธเธ“เธฒเธเธฃเธญเธเน€เธเธญเธฃเนเนเธ—เธฃเธ—เธตเนเธ–เธนเธเธ•เนเธญเธ', 400);

    $db = DB::get();
    $p  = $db->one("SELECT parent_id, phone FROM parents WHERE user_id=?", [myId()], 'i');
    if (!$p) DB::fail('เนเธกเนเธเธเธเนเธญเธกเธนเธฅเธเธนเนเธเธเธเธฃเธญเธ', 404);

    // normalize เน€เธเธญเธฃเนเนเธ DB เธ”เนเธงเธข เนเธฅเนเธงเน€เธ—เธตเธขเธเนเธซเนเธขเธทเธ”เธซเธขเธธเนเธ
    $dbPhone  = normalizePhone($p['phone'] ?? '');
    $phone9   = ltrim($phone, '0');
    $dbPhone9 = ltrim($dbPhone, '0');
    if ($dbPhone !== $phone && $dbPhone9 !== $phone9)
        DB::fail('เน€เธเธญเธฃเนเนเธ—เธฃเนเธกเนเธ•เธฃเธเธเธฑเธเธเธฑเธเธเธตเธเธญเธเธเธธเธ“', 400);

    // เธเนเธเธซเธฒเธเธฑเธเน€เธฃเธตเธขเธเธ—เธตเนเธเธฃเธญเธเน€เธเธญเธฃเนเธเธตเน (เธ—เธฑเนเธ 10 เธซเธฅเธฑเธเนเธฅเธฐ 9 เธซเธฅเธฑเธ)
    $students = $db->all(
        "SELECT st.student_id, u.full_name, st.grade FROM students st
         JOIN users u ON u.user_id=st.user_id
         WHERE st.parent_phone=? OR st.parent_phone=?",
        [$phone, $phone9], 'ss'
    );
    if (!$students) DB::fail('เนเธกเนเธเธเธเธฑเธเน€เธฃเธตเธขเธเธ—เธตเนเธเธฃเธญเธเน€เธเธญเธฃเนเธเธตเนเนเธงเน โ€” เธ•เธฃเธงเธเธชเธญเธเธงเนเธฒเธเธฑเธเน€เธฃเธตเธขเธเธเธฃเธญเธเน€เธเธญเธฃเนเธ–เธนเธเธ•เนเธญเธ', 404);

    $linked = 0;
    foreach ($students as $s) {
        $db->run("INSERT IGNORE INTO parent_student (parent_id,student_id) VALUES (?,?)",
            [$p['parent_id'], $s['student_id']], 'ii');
        if ($db->affected() > 0) $linked++;
    }
    DB::ok(['linked' => $linked, 'students' => $students]);
}

// auto-link: parent เน€เธฃเธตเธขเธเน€เธญเธเน€เธเธทเนเธญ sync เธเธธเธ•เธฃเธซเธฅเธฒเธเธ—เธตเนเธเธฃเธญเธเน€เธเธญเธฃเนเธ•เธฃเธเธเธฑเธ
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
        $db->run("INSERT IGNORE INTO parent_student (parent_id,student_id) VALUES (?,?)",
            [$p['parent_id'], $s['student_id']], 'ii');
        if ($db->affected() > 0) $linked++;
    }
    DB::ok(['linked' => $linked]);
}

function handleUnlinkChild(): never {
    global $body;
    authRole('parent');
    $sid = (int)($body['student_id'] ?? 0);
    if (!$sid) DB::fail('เธ•เนเธญเธเธชเนเธ student_id', 400);
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
        if ($avg >= 80)     { $type='praise';    $msg='เน€เธขเธตเนเธขเธกเธกเธฒเธ! เธ—เธณเธเธฐเนเธเธเนเธ”เนเธ”เธตเนเธเธงเธดเธเธฒเธเธตเน เนเธซเนเธเธณเธฅเธฑเธเนเธเธ•เนเธญเนเธเน€เธฅเธข!'; }
        elseif ($avg >= 55) { $type='improve';   $msg='เธเธณเธฅเธฑเธเธเธฑเธ’เธเธฒเธ”เธตเธเธถเนเธ! เน€เธฅเนเธเน€เธเธกเธงเธดเธเธฒเธเธตเนเธเนเธญเธขเธเธถเนเธเธญเธตเธเธเธดเธ”เธเธฐเธเธฃเธฑเธ'; }
        else                { $type='low_score'; $msg='เธเธฐเนเธเธเธขเธฑเธเธเนเธญเธข เธเธงเธฃเธเธถเธเน€เธฅเนเธเน€เธเธกเนเธเธงเธดเธเธฒเธเธตเนเน€เธเธดเนเธกเน€เธ•เธดเธกเธเธฐเธเธฃเธฑเธ'; }

        $db->run(
            "INSERT INTO recommendations (student_id,subject_id,message,rec_type)
             VALUES (?,?,?,?)
             ON DUPLICATE KEY UPDATE message=VALUES(message),rec_type=VALUES(rec_type),created_at=NOW()",
            [$studentId, $sub['subject_id'], $msg, $type], 'iiss'
        );
    }

    // Notifications เนเธซเนเธเธนเนเธเธเธเธฃเธญเธ
    $sName   = $db->one("SELECT full_name FROM users WHERE user_id=?", [$userId], 'i')['full_name'] ?? 'เธเธฑเธเน€เธฃเธตเธขเธ';
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
                 VALUES (?,?,'โ ๏ธ','เธ•เนเธญเธเธเธฒเธฃเธเธงเธฒเธกเธเนเธงเธขเน€เธซเธฅเธทเธญ',?,'warn')",
                [$par['parent_id'], $studentId,
                 "$sName เธกเธตเธงเธดเธเธฒเธ—เธตเนเธเธฐเนเธเธเธ•เนเธณเธเธงเนเธฒ 50% เธฅเธญเธเธเนเธงเธขเธ—เธเธ—เธงเธเธเธ—เน€เธฃเธตเธขเธเธฃเนเธงเธกเธเธฑเธเธ—เธตเนเธเนเธฒเธเธ”เธนเธเธฃเธฑเธ"],
                'iis'
            );
        }
        if ($highSubs) {
            $db->run(
                "INSERT INTO parent_notifications (parent_id,student_id,ico,title,message,notif_type)
                 VALUES (?,?,'โญ','เธเธฅเธเธฒเธฃเน€เธฃเธตเธขเธเธ”เธตเน€เธขเธตเนเธขเธก!',?,'praise')",
                [$par['parent_id'], $studentId,
                 "$sName เธ—เธณเธเธฐเนเธเธเนเธ”เนเธขเธญเธ”เน€เธขเธตเนเธขเธก! เนเธซเนเธเธณเธฅเธฑเธเนเธเธเธฑเธเธ”เนเธงเธขเธเธฐเธเธฃเธฑเธ"],
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
            $msg = 'เธเธฃเนเธญเธกเธ•เนเธญเธขเธญเธ”เนเธฅเนเธง';
        } elseif ($avg >= 55) {
            $type = 'improve';
            $msg = 'เธเธณเธฅเธฑเธเธ”เธตเธเธถเนเธ';
        } else {
            $type = 'low_score';
            $msg = 'เธเธงเธฃเธ—เธเธ—เธงเธเธเนเธญเธเน€เธฃเธตเธขเธเธ•เนเธญ';
        }

        if ($weakSkill) {
            $msg .= ' เนเธ”เธขเน€เธเนเธเธซเธฑเธงเธเนเธญ "' . $weakSkill['skill_name'] . '"';
        }
        if ($nextGame) {
            $msg .= ' เนเธฅเธฐเน€เธฅเนเธเน€เธเธก "' . $nextGame['name'] . '" เน€เธเนเธเธฅเธณเธ”เธฑเธเธ–เธฑเธ”เนเธ';
        }

        $db->run(
            "INSERT INTO recommendations (student_id,subject_id,message,rec_type)
             VALUES (?,?,?,?)
             ON DUPLICATE KEY UPDATE message=VALUES(message),rec_type=VALUES(rec_type),created_at=NOW()",
            [$studentId, $sub['subject_id'], $msg, $type], 'iiss'
        );
    }

    $studentName = $db->one(
        "SELECT u.full_name
         FROM students st
         JOIN users u ON u.user_id = st.user_id
         WHERE st.student_id=?",
        [$studentId], 'i'
    )['full_name'] ?? 'เธเธฑเธเน€เธฃเธตเธขเธ';

    $weakest = $weakSkills[0] ?? null;
    if ($weakest && (float)$weakest['mastery_score'] < 60) {
        createParentNotification(
            $studentId,
            'เธกเธตเธซเธฑเธงเธเนเธญเธ—เธตเนเธเธงเธฃเธ—เธเธ—เธงเธ',
            $studentName . ' เธขเธฑเธเธญเนเธญเธเนเธเน€เธฃเธทเนเธญเธ "' . $weakest['skill_name'] . '" เธฅเธญเธเน€เธเธดเธ”เธเธถเธเน€เธเธเธฒเธฐเธเธธเธ”เธซเธฃเธทเธญเธกเธญเธเธซเธกเธฒเธขเนเธเธเธฃเธฒเธขเธชเธฑเธเธ”เธฒเธซเนเน€เธเธดเนเธก',
            'warn',
            'โ ๏ธ',
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
    if (!$sid) DB::fail('เธ•เนเธญเธเธชเนเธ student_id', 400);

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
        DB::get()->run("UPDATE parent_notifications SET is_read=1 WHERE notif_id=? AND parent_id=?",
            [$nid, $p['parent_id']], 'ii');
    } else {
        DB::get()->run("UPDATE parent_notifications SET is_read=1 WHERE parent_id=?",
            [$p['parent_id']], 'i');
    }
    DB::ok();
}

// ============================================================
// TEACHER
// ============================================================

function handleTeacherStats(): never {
    authRole('teacher', 'admin');
    $stats = DB::get()->all("SELECT * FROM v_teacher_stats ORDER BY subject_id");
    $total = DB::get()->one("SELECT COUNT(*) AS c FROM users WHERE role='student' AND is_active=1");
    DB::ok(['subjects' => $stats, 'total_students' => (int)$total['c']]);
}

function handleAllStudents(): never {
    authRole('teacher', 'admin');
    $db       = DB::get();
    $students = $db->all(
        "SELECT u.user_id, st.student_id, u.full_name, st.grade,
                COUNT(DISTINCT sc.score_id)  AS games_played,
                ROUND(AVG(sc.score), 1)      AS avg_score,
                MAX(sc.played_at)            AS last_active
         FROM students st
         JOIN users u ON u.user_id=st.user_id
         LEFT JOIN scores sc ON sc.student_id=st.student_id
         WHERE u.is_active=1
         GROUP BY st.student_id ORDER BY st.grade, u.full_name"
    );
    DB::ok(['students' => $students]);
}

// ============================================================
// LESSON CONTENT EDITOR (เธเธฃเธนเนเธเนเนเธเนเธ”เน)
// ============================================================

function handleSaveLesson(): never {
    global $body;
    authRole('teacher', 'admin', 'officer');
    $db       = DB::get();
    $gameId   = (int)($body['game_id']   ?? 0);
    $lessonNo = (int)($body['lesson_no'] ?? 1);
    $title    = trim($body['title']      ?? '');
    $bodyHtml = trim($body['body']       ?? '');
    $summary  = trim($body['summary']    ?? '');
    $readTime = (int)($body['read_time'] ?? 5);

    if (!$gameId || !$title) DB::fail('เธ•เนเธญเธเธชเนเธ game_id เนเธฅเธฐ title', 400);

    // upsert
    $exists = $db->one(
        "SELECT content_id FROM lesson_content WHERE game_id=? AND lesson_no=?",
        [$gameId, $lessonNo], 'ii'
    );
    if ($exists) {
        $db->run(
            "UPDATE lesson_content SET title=?,body=?,summary=?,read_time=? WHERE content_id=?",
            [$title, $bodyHtml, $summary, $readTime, $exists['content_id']], 'sssii'
        );
    } else {
        $db->run(
            "INSERT INTO lesson_content (game_id,lesson_no,title,body,summary,read_time) VALUES (?,?,?,?,?,?)",
            [$gameId, $lessonNo, $title, $bodyHtml, $summary, $readTime], 'iisssi'
        );
    }
    DB::ok(['message' => 'เธเธฑเธเธ—เธถเธเธชเธณเน€เธฃเนเธ']);
}

function handleSaveLessonV2(): never {
    global $body;
    authRole('teacher', 'admin', 'officer');
    $db       = DB::get();
    $gameId   = (int)($body['game_id'] ?? 0);
    $lessonNo = (int)($body['lesson_no'] ?? 1);
    $title    = trim($body['title'] ?? '');
    $bodyHtml = trim($body['body'] ?? '');
    $summary  = trim($body['summary'] ?? '');
    $readTime = (int)($body['read_time'] ?? 5);
    $status   = trim((string)($body['status'] ?? 'draft'));
    if (!in_array($status, ['draft', 'published'], true)) $status = 'draft';
    if (!$gameId || !$title) DB::fail('เธ•เนเธญเธเธชเนเธ game_id เนเธฅเธฐ title', 400);

    $exists = $db->one(
        "SELECT * FROM lesson_content WHERE game_id=? AND lesson_no=?",
        [$gameId, $lessonNo], 'ii'
    );

    $approvedBy = $status === 'published' ? myId() : null;
    $publishedAt = $status === 'published' ? date('Y-m-d H:i:s') : null;

    if ($exists) {
        $db->run(
            "INSERT INTO lesson_content_history
             (content_id, game_id, lesson_no, title, summary, body, read_time, status, version_no, snapshot_by)
             VALUES (?,?,?,?,?,?,?,?,?,?)",
            [
                $exists['content_id'],
                $exists['game_id'],
                $exists['lesson_no'],
                $exists['title'],
                $exists['summary'],
                $exists['body'],
                $exists['read_time'],
                $exists['status'] ?? 'draft',
                (int)($exists['version_no'] ?? 1),
                myId()
            ],
            'iiisssssii'
        );

        $db->run(
            "UPDATE lesson_content
             SET title=?, body=?, summary=?, read_time=?, status=?, version_no=version_no+1,
                 updated_by=?, approved_by=?, published_at=?
             WHERE content_id=?",
            [$title, $bodyHtml, $summary, $readTime, $status, myId(), $approvedBy, $publishedAt, $exists['content_id']],
            'sssissssi'
        );
        $contentId = (int)$exists['content_id'];
    } else {
        $db->run(
            "INSERT INTO lesson_content
             (game_id, lesson_no, title, body, summary, read_time, status, version_no, updated_by, approved_by, published_at)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            [$gameId, $lessonNo, $title, $bodyHtml, $summary, $readTime, $status, 1, myId(), $approvedBy, $publishedAt],
            'iisssisiiss'
        );
        $contentId = $db->insertId();
    }

    logAudit(
        $status === 'published' ? 'lesson_published' : 'lesson_saved_draft',
        'lesson_content',
        (string)$contentId,
        $title,
        ['game_id' => $gameId, 'lesson_no' => $lessonNo, 'status' => $status]
    );

    DB::ok(['message' => 'เธเธฑเธเธ—เธถเธเธชเธณเน€เธฃเนเธ', 'content_id' => $contentId, 'status' => $status]);
}

function handleDeleteLesson(): never {
    global $body;
    authRole('teacher', 'admin', 'officer');
    $gameId   = (int)($body['game_id']   ?? 0);
    $lessonNo = (int)($body['lesson_no'] ?? 1);
    if (!$gameId) DB::fail('เธ•เนเธญเธเธชเนเธ game_id', 400);
    DB::get()->run(
        "DELETE FROM lesson_content WHERE game_id=? AND lesson_no=?",
        [$gameId, $lessonNo], 'ii'
    );
    DB::ok(['message' => 'เธฅเธเธชเธณเน€เธฃเนเธ']);
}

function handleSaveGameSettings(): never {
    global $body;
    authRole('teacher', 'admin', 'officer');
    $db        = DB::get();
    $gameId    = (int)($body['game_id'] ?? 0);
    $timeLimit = (int)($body['time_limit'] ?? 0);

    if (!$gameId) DB::fail('เธ•เนเธญเธเธชเนเธ game_id', 400);
    if ($timeLimit < 10 || $timeLimit > 3600) {
        DB::fail('เน€เธงเธฅเธฒเน€เธฅเนเธเธ•เนเธญเธเธญเธขเธนเนเธฃเธฐเธซเธงเนเธฒเธ 10 เธ–เธถเธ 3600 เธงเธดเธเธฒเธ—เธต', 400);
    }

    $db->run(
        "UPDATE games SET time_limit=? WHERE game_id=?",
        [$timeLimit, $gameId],
        'ii'
    );
    DB::ok(['message' => 'เธเธฑเธเธ—เธถเธเน€เธงเธฅเธฒเน€เธฅเนเธเธชเธณเน€เธฃเนเธ', 'time_limit' => $timeLimit]);
}


// ============================================================
// 2.0 เธเธฑเธ”เธเธฒเธฃเธเนเธญเธกเธนเธฅเธเธนเนเนเธเน (admin)
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
    return $requestedStudentId;
}

function handleStudentAnalytics(): never {
    authRole('student', 'parent', 'teacher', 'admin');
    $db = DB::get();
    $studentId = resolveStudentScope((int)($_GET['student_id'] ?? 0));
    if (!$studentId) DB::fail('เนเธกเนเธเธ student_id', 404);

    $overview = $db->one(
        "SELECT COUNT(*) AS total_plays, ROUND(AVG(score),1) AS avg_score, SUM(time_spent) AS total_time,
                MAX(played_at) AS last_played
         FROM scores WHERE student_id=?",
        [$studentId], 'i'
    ) ?: [];
    $trend = $db->all(
        "SELECT DATE_FORMAT(played_at, '%Y-%m-%d') AS played_day, score
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
         WHERE student_id=? AND is_correct=0
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
                SUM(CASE WHEN IFNULL(best.best_score, 0) >= lpi.target_score THEN 1 ELSE 0 END) AS completed_items
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
    if ($daysSince !== null && $daysSince >= 7) $alerts[] = 'เนเธกเนเนเธ”เนเน€เธเนเธฒเน€เธฃเธตเธขเธเน€เธเธดเธ 7 เธงเธฑเธ';
    if (!empty($mastery) && (float)$mastery[0]['mastery_score'] < 60) $alerts[] = 'เธกเธตเธซเธฑเธงเธเนเธญเธญเนเธญเธเธ—เธตเนเธเธงเธฃเธ—เธเธ—เธงเธเธ—เธฑเธเธ—เธต';

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
    if (!$studentId) DB::fail('เนเธกเนเธเธ student_id', 404);
    $plans = $db->all(
        "SELECT lp.plan_id, lp.title, lp.description, lp.week_start, lp.due_at, lp.status,
                lpi.item_id, lpi.game_id, lpi.lesson_no, lpi.target_score, lpi.sort_order,
                g.name AS game_name, g.icon AS game_icon, sub.name AS subject_name,
                IFNULL(best.best_score, 0) AS best_score
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
    $title = trim((string)($body['title'] ?? 'เนเธเธเธฃเธฒเธขเธชเธฑเธเธ”เธฒเธซเน'));
    $description = trim((string)($body['description'] ?? ''));
    $weekStart = trim((string)($body['week_start'] ?? date('Y-m-d')));
    $dueAt = trim((string)($body['due_at'] ?? ''));
    $items = is_array($body['items'] ?? null) ? $body['items'] : [];
    if (!$studentId || !$items) DB::fail('เธ•เนเธญเธเธกเธต student_id เนเธฅเธฐเธฃเธฒเธขเธเธฒเธฃเน€เธเธก', 400);

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

    createParentNotification($studentId, 'เธกเธตเนเธเธเธเธฒเธฃเน€เธฃเธตเธขเธเนเธซเธกเน', 'เธเธฃเธนเนเธ”เนเธกเธญเธเธซเธกเธฒเธขเนเธเธเธฃเธฒเธขเธชเธฑเธเธ”เธฒเธซเนเนเธซเธกเนเนเธซเนเนเธฅเนเธง', 'info', '๐“', 'plan_' . $planId);
    logAudit('plan_created', 'learning_plan', (string)$planId, $title, ['student_id' => $studentId, 'item_count' => count($items)]);
    try { refreshStudentNotifications($studentId); } catch (Exception $e) {}

    DB::ok(['plan_id' => $planId]);
}

function createParentNotificationUnique(int $studentId, string $title, string $message, string $type = 'info', string $icon = '๐””', string $eventKey = ''): void {
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
                     SET title=?, message=?, notif_type=?, ico=?, created_at=NOW(), is_read=0
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
                'เธเธฐเนเธเธเธกเธตเนเธเธงเนเธเนเธกเธฅเธ”เธฅเธ',
                'เธเธฅเน€เธฅเนเธเธฅเนเธฒเธชเธธเธ”เธฅเธ”เธฅเธเธเธฒเธเธเนเธงเธเธเนเธญเธเธซเธเนเธฒเธญเธขเนเธฒเธเน€เธซเนเธเนเธ”เนเธเธฑเธ” เธเธงเธฃเธเนเธงเธขเธ—เธเธ—เธงเธเน€เธเนเธเธเธดเน€เธจเธฉ',
                'warn',
                '๐“',
                'score_drop'
            );
        }
    }

    $activePlan = $db->one(
        "SELECT lp.plan_id, lp.title,
                COUNT(lpi.item_id) AS total_items,
                SUM(CASE WHEN IFNULL(best.best_score, 0) >= lpi.target_score THEN 1 ELSE 0 END) AS completed_items
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
            'เธ—เธณเน€เธเนเธฒเธซเธกเธฒเธขเธเธฃเธเนเธฅเนเธง',
            'เธเธฑเธเน€เธฃเธตเธขเธเธ—เธณเนเธเธ "' . $activePlan['title'] . '" เธเธฃเธเนเธฅเนเธง',
            'praise',
            '๐ฏ',
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
        "SELECT COUNT(*) AS total, SUM(CASE WHEN is_read=0 THEN 1 ELSE 0 END) AS unread
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
        DB::fail('เธฃเธฐเธเธเธเธตเนเธกเธญเธเธซเธกเธฒเธขเนเธเธเนเธ”เนเธ—เธตเธฅเธฐเธเธฑเธเน€เธฃเธตเธขเธ 1 เธเธเน€เธ—เนเธฒเธเธฑเนเธ', 400);
    }

    $studentId = (int)($body['student_id'] ?? 0);
    $title = trim((string)($body['title'] ?? 'เนเธเธเธฃเธฒเธขเธชเธฑเธเธ”เธฒเธซเน'));
    $description = trim((string)($body['description'] ?? ''));
    $weekStart = trim((string)($body['week_start'] ?? date('Y-m-d')));
    $dueAt = trim((string)($body['due_at'] ?? ''));
    $items = is_array($body['items'] ?? null) ? $body['items'] : [];
    if (!$studentId || !$items) DB::fail('เธ•เนเธญเธเธกเธต student_id เนเธฅเธฐเธฃเธฒเธขเธเธฒเธฃเน€เธเธก', 400);

    $student = $db->one(
        "SELECT st.student_id, u.full_name
         FROM students st JOIN users u ON u.user_id = st.user_id
         WHERE st.student_id=?",
        [$studentId], 'i'
    );
    if (!$student) DB::fail('เนเธกเนเธเธเธเธฑเธเน€เธฃเธตเธขเธเธ—เธตเนเน€เธฅเธทเธญเธ', 404);

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
        'เธกเธตเนเธเธเธเธฒเธฃเน€เธฃเธตเธขเธเนเธซเธกเน',
        'เธเธฃเธนเนเธ”เนเธกเธญเธเธซเธกเธฒเธขเนเธเธ "' . $title . '" เนเธซเนเธเธฑเธ ' . $student['full_name'],
        'info',
        '๐“',
        'plan_' . $planId
    );
    logAudit('plan_created', 'learning_plan', (string)$planId, $title, ['student_id' => $studentId, 'item_count' => count($items)]);

    DB::ok(['plan_id' => $planId]);
}

function handleHealthCheck(): never {
    ensureAdvancedSchema();
    $db = DB::get();
    $dbCheck = $db->one("SELECT 1 AS ok");
    $students = $db->one("SELECT COUNT(*) AS c FROM students");
    $scores = $db->one("SELECT COUNT(*) AS c FROM scores");
    DB::ok([
        'status' => 'healthy',
        'db' => (bool)($dbCheck['ok'] ?? false),
        'counts' => [
            'students' => (int)($students['c'] ?? 0),
            'scores' => (int)($scores['c'] ?? 0),
        ],
        'timestamp' => date('c'),
    ]);
}

function handleReportV2(): never {
    authRole('admin', 'teacher');
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
             WHERE sc.played_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
             GROUP BY DATE(sc.played_at)
             ORDER BY day ASC"
        );
        DB::ok(['engagement' => $rows]);
    }

    if ($type === 'at_risk') {
        $rows = $db->all(
            "SELECT u.full_name, st.grade, st.student_id,
                    ROUND(AVG(sc.score),1) AS avg_score,
                    MAX(sc.played_at) AS last_active,
                    COALESCE(MIN(sm.mastery_score), 0) AS weakest_mastery,
                    DATEDIFF(NOW(), MAX(sc.played_at)) AS inactive_days
             FROM students st
             JOIN users u ON u.user_id = st.user_id
             LEFT JOIN scores sc ON sc.student_id = st.student_id
             LEFT JOIN student_mastery sm ON sm.student_id = st.student_id
             GROUP BY st.student_id
             HAVING avg_score < 60 OR inactive_days >= 7 OR weakest_mastery < 60
             ORDER BY inactive_days DESC, weakest_mastery ASC, avg_score ASC
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
                    SUM(CASE WHEN IFNULL(best.best_score, 0) >= lpi.target_score THEN 1 ELSE 0 END) AS completed_items
             FROM learning_plans lp
             JOIN students st ON st.student_id = lp.student_id
             JOIN users u ON u.user_id = st.user_id
             LEFT JOIN learning_plan_items lpi ON lpi.plan_id = lp.plan_id
             LEFT JOIN (
                SELECT student_id, game_id, MAX(score) AS best_score
                FROM scores
                GROUP BY student_id, game_id
             ) best ON best.student_id = lp.student_id AND best.game_id = lpi.game_id
             GROUP BY lp.plan_id
             ORDER BY lp.created_at DESC"
        );
        DB::ok(['plans' => $rows]);
    }

    if ($type === 'notifications') {
        $rows = $db->all(
            "SELECT notif_type, COUNT(*) AS total, SUM(CASE WHEN is_read=0 THEN 1 ELSE 0 END) AS unread
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
    $db   = DB::get();
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = 50;
    $offset = ($page - 1) * $limit;
    $role   = $_GET['role'] ?? '';
    $search = $_GET['search'] ?? '';

    $where = 'WHERE 1=1';
    $params = []; $types = '';
    if ($role)   { $where .= ' AND u.role=?';          $params[] = $role;   $types .= 's'; }
    if ($search) { $where .= ' AND (u.full_name LIKE ? OR u.username LIKE ?)';
                   $s = "%$search%"; $params[] = $s; $params[] = $s; $types .= 'ss'; }

    $users = $db->all("SELECT u.user_id, u.username, u.full_name, u.email, u.role,
            u.is_active, u.created_at,
            COALESCE(s.grade,'โ€”') AS grade,
            COALESCE(p.phone,'โ€”') AS phone,
            COALESCE(t.department,'โ€”') AS department
        FROM users u
        LEFT JOIN students s ON s.user_id=u.user_id
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
    if (!$uid || $uid === myId()) DB::fail('เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธ”เธณเน€เธเธดเธเธเธฒเธฃเนเธ”เน', 400);
    $u = DB::get()->one("SELECT is_active FROM users WHERE user_id=?", [$uid], 'i');
    if (!$u) DB::fail('เนเธกเนเธเธเธเธนเนเนเธเน', 404);
    $newState = $u['is_active'] ? 0 : 1;
    DB::get()->run("UPDATE users SET is_active=? WHERE user_id=?", [$newState, $uid], 'ii');
    DB::ok(['is_active' => $newState]);
}

function handleAdminDeleteUser(): never {
    global $body;
    authRole('admin');
    $uid = (int)($body['user_id'] ?? 0);
    if (!$uid || $uid === myId()) DB::fail('เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธฅเธเธ•เธฑเธงเน€เธญเธเนเธ”เน', 400);
    DB::get()->run("DELETE FROM users WHERE user_id=?", [$uid], 'i');
    DB::ok();
}

function handleAdminResetPassword(): never {
    global $body;
    authRole('admin');
    $uid  = (int)($body['user_id'] ?? 0);
    $pass = $body['new_password'] ?? 'kidlearn123';
    if (!$uid) DB::fail('เธ•เนเธญเธเธชเนเธ user_id', 400);
    DB::get()->run("UPDATE users SET password=? WHERE user_id=?",
        [password_hash($pass, PASSWORD_BCRYPT), $uid], 'si');
    DB::ok(['message' => 'เธฃเธตเน€เธเนเธ•เธฃเธซเธฑเธชเธเนเธฒเธเธชเธณเน€เธฃเนเธ']);
}

// ============================================================
// 3.0 เธเธฑเธ”เธเธฒเธฃเธงเธดเธเธฒ/เธซเธฅเธฑเธเธชเธนเธ•เธฃ (admin/teacher)
// ============================================================
function handleSaveSubject(): never {
    global $body;
    authRole('admin', 'teacher');
    $db   = DB::get();
    $sid  = (int)($body['subject_id'] ?? 0);
    $name = trim($body['name'] ?? '');
    $desc = trim($body['description'] ?? '');
    $icon = trim($body['icon'] ?? '๐“');
    $color = trim($body['color'] ?? '#4CAF50');
    $order = (int)($body['order_no'] ?? 1);
    if (!$name) DB::fail('เธ•เนเธญเธเนเธชเนเธเธทเนเธญเธงเธดเธเธฒ', 400);
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
    if (!$sid) DB::fail('เธ•เนเธญเธเธชเนเธ subject_id', 400);
    $s = DB::get()->one("SELECT is_active FROM subjects WHERE subject_id=?", [$sid], 'i');
    if (!$s) DB::fail('เนเธกเนเธเธเธงเธดเธเธฒ', 404);
    DB::get()->run("UPDATE subjects SET is_active=? WHERE subject_id=?", [$s['is_active']?0:1, $sid], 'ii');
    DB::ok(['is_active' => $s['is_active'] ? 0 : 1]);
}

// ============================================================
// 4.0 เธเธฃเธนเนเธเนเนเธเธเธณเธ–เธฒเธก-เธเธณเธ•เธญเธเนเธเน€เธเธก
// ============================================================
function handleGetGameQuestions(): never {
    auth();
    ensureQuestionImageColumnCapacity();
    $gid  = (int)($_GET['game_id'] ?? 0);
    if (!$gid) DB::fail('เธ•เนเธญเธเธชเนเธ game_id', 400);
    $db   = DB::get();
    $game = $db->one("SELECT * FROM games WHERE game_id=? LIMIT 1", [$gid], 'i');
    $qs   = $db->all("SELECT * FROM questions WHERE game_id=? ORDER BY order_no", [$gid], 'i');
    foreach ($qs as &$q) {
        $q['answers'] = $db->all("SELECT * FROM answers WHERE question_id=? ORDER BY answer_id",
            [$q['question_id']], 'i');
    }
    DB::ok(['game' => $game, 'questions' => $qs]);
}

function handleSaveQuestion(): never {
    global $body;
    authRole('teacher', 'admin', 'officer');
    ensureQuestionImageColumnCapacity();
    $db   = DB::get();
    $qid  = (int)($body['question_id'] ?? 0);
    $gid  = (int)($body['game_id'] ?? 0);
    $text = trim($body['question_text'] ?? '');
    $hint = trim($body['hint'] ?? '');
    $questionImg = trim($body['question_img'] ?? '');
    $order = (int)($body['order_no'] ?? 1);
    $answers = $body['answers'] ?? [];
    if (!$gid || !$text) DB::fail('เธ•เนเธญเธเธชเนเธ game_id เนเธฅเธฐ question_text', 400);

    if ($qid) {
        $db->run("UPDATE questions SET question_text=?,question_img=?,hint=?,order_no=? WHERE question_id=?",
            [$text, $questionImg ?: null, $hint ?: null, $order, $qid], 'sssii');
        // เธฅเธ answers เน€เธ”เธดเธกเนเธฅเนเธงเนเธชเนเนเธซเธกเน
        $db->run("DELETE FROM answers WHERE question_id=?", [$qid], 'i');
    } else {
        $db->run("INSERT INTO questions (game_id,question_text,question_img,hint,order_no) VALUES (?,?,?,?,?)",
            [$gid, $text, $questionImg ?: null, $hint ?: null, $order], 'isssi');
        $qid = $db->insertId();
    }
    foreach ($answers as $ans) {
        $atext     = trim($ans['answer_text'] ?? '');
        $correct   = (int)($ans['is_correct']  ?? 0);
        $pairLeft  = trim($ans['pair_left']    ?? '') ?: null;
        $pairRight = trim($ans['pair_right']   ?? '') ?: null;
        $seqOrder  = isset($ans['seq_order']) ? (int)$ans['seq_order'] : null;
        if (!$atext) continue;
        $db->run(
            "INSERT INTO answers (question_id,answer_text,is_correct,pair_left,pair_right,seq_order)
             VALUES (?,?,?,?,?,?)",
            [$qid, $atext, $correct, $pairLeft, $pairRight, $seqOrder],
            'isiiss'
        );
    }
    DB::ok(['question_id' => $qid]);
}

function handleDeleteQuestion(): never {
    global $body;
    authRole('teacher', 'admin', 'officer');
    $qid = (int)($body['question_id'] ?? 0);
    if (!$qid) DB::fail('เธ•เนเธญเธเธชเนเธ question_id', 400);
    DB::get()->run("DELETE FROM questions WHERE question_id=?", [$qid], 'i');
    DB::ok();
}

// ============================================================
// 8.0 เธญเธญเธเธฃเธฒเธขเธเธฒเธ (เธเธนเนเธเธฃเธดเธซเธฒเธฃ/เธเธฃเธน)
// ============================================================
function handleReport(): never {
    authRole('admin', 'teacher');
    $db   = DB::get();
    $type = $_GET['type'] ?? 'summary';

    if ($type === 'summary') {
        $students = $db->one("SELECT COUNT(*) AS c FROM users WHERE role='student' AND is_active=1");
        $parents  = $db->one("SELECT COUNT(*) AS c FROM users WHERE role='parent'  AND is_active=1");
        $teachers = $db->one("SELECT COUNT(*) AS c FROM users WHERE role='teacher' AND is_active=1");
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
            WHERE u.is_active=1
            GROUP BY st.student_id ORDER BY avg_score DESC LIMIT 100");
        DB::ok(['students' => $rows]);
    }
    if ($type === 'by_game') {
        $rows = $db->all("SELECT g.game_id, g.name AS game_name, g.game_type, g.level,
            sub.name AS subject_name,
            COUNT(sc.score_id) AS total_plays,
            ROUND(AVG(sc.score),1) AS avg_score,
            MAX(sc.score) AS best_score
            FROM games g JOIN subjects sub ON sub.subject_id=g.subject_id
            LEFT JOIN scores sc ON sc.game_id=g.game_id
            GROUP BY g.game_id ORDER BY total_plays DESC");
        DB::ok(['games' => $rows]);
    }
    if ($type === 'daily') {
        $days = (int)($_GET['days'] ?? 30);
        $rows = $db->all("SELECT DATE(played_at) AS day, COUNT(*) AS plays,
            ROUND(AVG(score),1) AS avg_score,
            COUNT(DISTINCT student_id) AS active_students
            FROM scores WHERE played_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY DATE(played_at) ORDER BY day ASC",
            [$days], 'i');
        DB::ok(['daily' => $rows]);
    }
    DB::fail('เธเธฃเธฐเน€เธ เธ—เธฃเธฒเธขเธเธฒเธเนเธกเนเธ–เธนเธเธ•เนเธญเธ', 400);
}


// ============================================================
// FORGOT / RESET PASSWORD
// ============================================================

function handleForgotPassword(): never {
    global $body;
    $db    = DB::get();
    $email = trim($body['email'] ?? '');
    if (!$email) DB::fail('เธเธฃเธธเธ“เธฒเธเธฃเธญเธเธญเธตเน€เธกเธฅ', 400);

    $user = $db->one("SELECT user_id, full_name FROM users WHERE email=? AND is_active=1", [$email], 's');
    // เนเธกเนเธเธญเธเธงเนเธฒเธญเธตเน€เธกเธฅเธกเธตเธซเธฃเธทเธญเนเธกเน (security)
    if (!$user) DB::ok(['message' => 'เธซเธฒเธเธญเธตเน€เธกเธฅเธเธตเนเธกเธตเนเธเธฃเธฐเธเธ เธเธฐเนเธ”เนเธฃเธฑเธเธฃเธซเธฑเธชเธฃเธตเน€เธเนเธ•']);

    // เธชเธฃเนเธฒเธ token 6 เธซเธฅเธฑเธ (OTP style โ€” เธเนเธฒเธขเธ•เนเธญเธเธฒเธฃเนเธเนเธเธฒเธเนเธเธฃเธฐเธเธเนเธฃเธเน€เธฃเธตเธขเธ)
    $token = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expires = date('Y-m-d H:i:s', time() + 1800); // 30 เธเธฒเธ—เธต

    // เธฅเธ token เน€เธเนเธฒ
    $db->run("DELETE FROM password_resets WHERE user_id=?", [$user['user_id']], 'i');
    $db->run("INSERT INTO password_resets (user_id,token,expires_at) VALUES (?,?,?)",
        [$user['user_id'], $token, $expires], 'iss');

    // เนเธเธฃเธฐเธเธเธเธฃเธดเธเธเธงเธฃเธชเนเธเธญเธตเน€เธกเธฅ โ€” เธฃเธฐเธเธเธเธตเน return token เนเธ”เธขเธ•เธฃเธ (เธชเธณเธซเธฃเธฑเธ demo/เนเธฃเธเน€เธฃเธตเธขเธ)
    DB::ok([
        'message' => 'เธฃเธซเธฑเธช OTP เธชเธณเธซเธฃเธฑเธเธฃเธตเน€เธเนเธ•เธฃเธซเธฑเธชเธเนเธฒเธ (เนเธเนเนเธ”เน 30 เธเธฒเธ—เธต)',
        'otp'     => $token,   // production: เธชเนเธเธญเธตเน€เธกเธฅเนเธ—เธ
        'name'    => $user['full_name'],
    ]);
}

function handleResetPassword(): never {
    global $body;
    $db    = DB::get();
    $email = trim($body['email']    ?? '');
    $token = trim($body['token']    ?? '');
    $pass  = $body['new_password']  ?? '';

    if (!$email || !$token || !$pass) DB::fail('เธเธฃเธธเธ“เธฒเธเธฃเธญเธเธเนเธญเธกเธนเธฅเนเธซเนเธเธฃเธ', 400);
    if (strlen($pass) < 6)           DB::fail('เธฃเธซเธฑเธชเธเนเธฒเธเธ•เนเธญเธเธกเธตเธญเธขเนเธฒเธเธเนเธญเธข 6 เธ•เธฑเธงเธญเธฑเธเธฉเธฃ', 400);

    $user = $db->one("SELECT user_id FROM users WHERE email=? AND is_active=1", [$email], 's');
    if (!$user) DB::fail('เนเธกเนเธเธเธญเธตเน€เธกเธฅเธเธตเนเนเธเธฃเธฐเธเธ', 404);

    $reset = $db->one(
        "SELECT reset_id FROM password_resets
         WHERE user_id=? AND token=? AND expires_at>NOW() AND used=0",
        [$user['user_id'], $token], 'is'
    );
    if (!$reset) DB::fail('เธฃเธซเธฑเธช OTP เนเธกเนเธ–เธนเธเธ•เนเธญเธเธซเธฃเธทเธญเธซเธกเธ”เธญเธฒเธขเธธเนเธฅเนเธง', 400);

    // เธญเธฑเธเน€เธ”เธ•เธฃเธซเธฑเธชเธเนเธฒเธ
    $db->run("UPDATE users SET password=? WHERE user_id=?",
        [password_hash($pass, PASSWORD_BCRYPT), $user['user_id']], 'si');
    $db->run("UPDATE password_resets SET used=1 WHERE reset_id=?", [$reset['reset_id']], 'i');

    DB::ok(['message' => 'เน€เธเธฅเธตเนเธขเธเธฃเธซเธฑเธชเธเนเธฒเธเธชเธณเน€เธฃเนเธ']);
}

// เธ•เธฃเธงเธเธชเธญเธเธญเธตเน€เธกเธฅเน€เธเธทเนเธญเธเธ•เนเธ (format + เนเธกเนเธเนเธณเนเธเธฃเธฐเธเธ)
function handleValidateEmail(): never {
    $email = trim($_GET['email'] ?? '');
    if (!$email) DB::fail('เธ•เนเธญเธเธชเนเธ email', 400);

    // เธ•เธฃเธงเธ format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL))
        DB::ok(['valid' => false, 'reason' => 'เธฃเธนเธเนเธเธเธญเธตเน€เธกเธฅเนเธกเนเธ–เธนเธเธ•เนเธญเธ']);

    // เธ•เธฃเธงเธเธเนเธณเนเธเธฃเธฐเธเธ
    $exists = DB::get()->one("SELECT 1 FROM users WHERE email=?", [$email], 's');
    if ($exists)
        DB::ok(['valid' => false, 'reason' => 'เธญเธตเน€เธกเธฅเธเธตเนเธ–เธนเธเนเธเนเธเธฒเธเนเธฅเนเธง']);

    // เธ•เธฃเธงเธ domain เธเธฒเธ MX record (basic)
    $domain = substr(strrchr($email, '@'), 1);
    $hasMX  = checkdnsrr($domain, 'MX');
    $hasA   = checkdnsrr($domain, 'A');

    if (!$hasMX && !$hasA)
        DB::ok(['valid' => false, 'reason' => "เนเธ”เน€เธกเธ $domain เนเธกเนเธเธเนเธเธฃเธฐเธเธ DNS"]);

    DB::ok(['valid' => true, 'reason' => 'เธญเธตเน€เธกเธฅเธ–เธนเธเธ•เนเธญเธ']);
}


// ============================================================
// เนเธซเธฅเธ”เธเธณเธ–เธฒเธกเธชเธณเธซเธฃเธฑเธเน€เธฅเนเธเน€เธเธก (public โ€” เนเธกเนเธ•เนเธญเธ auth)
// เธฃเธญเธเธฃเธฑเธเธ—เธธเธเธเธฃเธฐเน€เธ เธ—: mcq, truefalse, fill, matching, sequence, wordsearch
// ============================================================
function handlePlayQuestions(): never {
    ensureQuestionImageColumnCapacity();
    $db    = DB::get();
    $gid   = (int)($_GET['game_id'] ?? 0);
    if (!$gid) DB::fail('เธ•เนเธญเธเธชเนเธ game_id', 400);

    // เธเนเธญเธกเธนเธฅเน€เธเธก
    $game = $db->one("SELECT * FROM games WHERE game_id=?", [$gid], 'i');
    if (!$game) DB::fail('เนเธกเนเธเธเน€เธเธก', 404);

    $type = $game['game_type'];

    // เนเธซเธฅเธ”เธเธณเธ–เธฒเธกเธ—เธฑเนเธเธซเธกเธ”
    $qs = $db->all(
        "SELECT question_id, question_text, question_img, hint, question_type, order_no
         FROM questions WHERE game_id=? ORDER BY order_no",
        [$gid], 'i'
    );
    if (!$qs) DB::ok(['game' => $game, 'questions' => [], 'type' => $type]);

    $result = [];

    foreach ($qs as $q) {
        $qid = $q['question_id'];
        $answers = $db->all(
            "SELECT answer_id, answer_text, is_correct, pair_left, pair_right, seq_order
             FROM answers WHERE question_id=? ORDER BY COALESCE(seq_order, 999999), answer_id",
            [$qid], 'i'
        );

        if ($type === 'mcq') {
            $opts   = array_column($answers, 'answer_text');
            $ans_idx = 0;
            foreach ($answers as $i => $a) {
                if ($a['is_correct']) { $ans_idx = $i; break; }
            }
            $result[] = [
                'q'    => $q['question_text'],
                'img'  => $q['question_img'],
                'opts' => $opts,
                'ans'  => $ans_idx,
                'hint' => $q['hint'],
            ];
        } elseif ($type === 'truefalse') {
            $correct_ans = null;
            foreach ($answers as $a) {
                if ($a['is_correct']) {
                    $text = mb_strtolower(trim((string)$a['answer_text']), 'UTF-8');
                    if (in_array($text, ['เธ–เธนเธ', 'เธเธฃเธดเธ', 'true', 'yes', 'เนเธเน'], true)) {
                        $correct_ans = true;
                    } elseif (in_array($text, ['เธเธดเธ”', 'เน€เธ—เนเธ', 'false', 'no', 'เนเธกเนเนเธเน'], true)) {
                        $correct_ans = false;
                    }
                    break;
                }
            }
            $result[] = [
                'q'   => $q['question_text'],
                'img' => $q['question_img'],
                'ans' => $correct_ans ?? true,
            ];
        } elseif ($type === 'fill') {
            $ans_text = '';
            foreach ($answers as $a) {
                if ($a['is_correct']) { $ans_text = $a['answer_text']; break; }
            }
            $result[] = [
                'q'    => $q['question_text'],
                'img'  => $q['question_img'],
                'ans'  => $ans_text,
                'hint' => $q['hint'] ?? '',
            ];
        } elseif ($type === 'matching') {
            if ($answers) {
                foreach ($answers as $i => $a) {
                    $left = trim((string)($a['pair_left'] ?? ''));
                    $right = trim((string)($a['pair_right'] ?? ''));
                    if ($left === '' && $right === '') {
                        $left = $i === 0 ? trim((string)$q['question_text']) : '';
                        $right = trim((string)$a['answer_text']);
                    }
                    if ($left !== '' && $right !== '') {
                        $result[] = ['left' => $left, 'right' => $right];
                    }
                }
            } elseif (trim((string)$q['question_text']) !== '') {
                $result[] = ['left' => trim((string)$q['question_text']), 'right' => ''];
            }
        } elseif ($type === 'sequence') {
            if ($answers) {
                foreach ($answers as $i => $a) {
                    $text = trim((string)$a['answer_text']);
                    if ($text === '') continue;
                    $result[] = [
                        'id'    => 'q' . $qid . '_a' . ($a['answer_id'] ?? $i),
                        'text'  => $text,
                        'order' => (int)($a['seq_order'] ?? ($i + 1)),
                    ];
                }
            } elseif (trim((string)$q['question_text']) !== '') {
                $result[] = [
                    'id'    => 'q' . $qid,
                    'text'  => trim((string)$q['question_text']),
                    'order' => (int)($q['order_no'] ?? 1),
                ];
            }
        } elseif ($type === 'wordsearch') {
            if ($answers) {
                foreach ($answers as $a) {
                    $word = trim((string)$a['answer_text']);
                    if ($word !== '') $result[] = $word;
                }
            } else {
                $word = trim((string)$q['question_text']);
                if ($word !== '') $result[] = $word;
            }
        }
    }

    if ($type === 'sequence') {
        usort($result, fn($a, $b) => ($a['order'] ?? 0) <=> ($b['order'] ?? 0));
    } elseif ($type === 'wordsearch') {
        $result = array_values(array_unique($result));
    }

    // เธเธฑเธ”เธฃเธนเธเนเธเธ response เธ•เธฒเธก type
    $formatted = [];
    if ($type === 'matching') {
        $formatted = ['pairs' => $result];
    } elseif ($type === 'sequence') {
        $formatted = ['items' => $result];
    } elseif ($type === 'wordsearch') {
        $formatted = ['words' => $result];
    } else {
        $formatted = ['qs' => $result];
    }

    DB::ok(array_merge(['game' => $game, 'type' => $type], $formatted));
}

// ============================================================
// OFFICER HANDLERS โ€” เน€เธเนเธฒเธซเธเนเธฒเธ—เธตเนเธเธฑเธ”เธเธฒเธฃเธเธนเนเนเธเน
// ============================================================

function handleOfficerUsers(): never {
    authRole('officer', 'admin');
    $db = DB::get();
    
    // เธ”เธถเธเธฃเธฒเธขเธเธทเนเธญเธเธนเนเนเธเนเธ—เธฑเนเธเธซเธกเธ”
    $users = $db->all(
        "SELECT u.user_id, u.username, u.email, u.full_name, u.role, u.is_active, 
                u.created_at, s.grade, p.phone, t.department
         FROM users u
         LEFT JOIN students s ON s.user_id = u.user_id
         LEFT JOIN parents p ON p.user_id = u.user_id
         LEFT JOIN teachers t ON t.user_id = u.user_id
         WHERE u.role IN ('student', 'parent', 'teacher', 'officer', 'executive')
         ORDER BY u.created_at DESC"
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
    $grade = trim($body['grade'] ?? '');
    $phone = trim($body['phone'] ?? '');
    $dept  = trim($body['department'] ?? '');
    
    if (!$uid || !$name) DB::fail('เธ•เนเธญเธเธชเนเธ user_id เนเธฅเธฐ full_name', 400);
    
    $user = $db->one("SELECT role FROM users WHERE user_id=?", [$uid], 'i');
    if (!$user) DB::fail('เนเธกเนเธเธเธเธนเนเนเธเน', 404);
    
    // เธญเธฑเธเน€เธ”เธ• users table
    if ($email) {
        $existing = $db->one("SELECT 1 FROM users WHERE email=? AND user_id!=?", [$email, $uid], 'si');
        if ($existing) DB::fail('เธญเธตเน€เธกเธฅเธเธตเนเธ–เธนเธเนเธเนเนเธฅเนเธง', 409);
        $db->run("UPDATE users SET full_name=?, email=? WHERE user_id=?", [$name, $email, $uid], 'ssi');
    } else {
        $db->run("UPDATE users SET full_name=? WHERE user_id=?", [$name, $uid], 'si');
    }
    
    // เธญเธฑเธเน€เธ”เธ• role-specific tables
    if ($user['role'] === 'student' && $grade) {
        $db->run("UPDATE students SET grade=? WHERE user_id=?", [$grade, $uid], 'si');
    }
    if ($user['role'] === 'parent' && $phone) {
        $phone = normalizePhone($phone);
        if (strlen($phone) < 9) DB::fail('เน€เธเธญเธฃเนเนเธ—เธฃเนเธกเนเธ–เธนเธเธ•เนเธญเธ', 400);
        $db->run("UPDATE parents SET phone=? WHERE user_id=?", [$phone, $uid], 'si');
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
    
    DB::ok(['message' => 'เธญเธฑเธเน€เธ”เธ•เธชเธณเน€เธฃเนเธ']);
}

function handleOfficerDeleteUser(): never {
    global $body;
    authRole('officer', 'admin');
    $db = DB::get();
    
    $uid = (int)($body['user_id'] ?? 0);
    if (!$uid) DB::fail('เธ•เนเธญเธเธชเนเธ user_id', 400);
    
    $user = $db->one("SELECT role FROM users WHERE user_id=?", [$uid], 'i');
    if (!$user) DB::fail('เนเธกเนเธเธเธเธนเนเนเธเน', 404);
    if ($user['role'] === 'admin') DB::fail('เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธฅเธเธเธนเนเธ”เธนเนเธฅเธฃเธฐเธเธเนเธ”เน', 403);
    
    // เธฅเธเธเธนเนเนเธเน (CASCADE เธเธฐเธฅเธเธเนเธญเธกเธนเธฅเธ—เธตเนเน€เธเธตเนเธขเธงเธเนเธญเธ)
    $db->run("DELETE FROM users WHERE user_id=?", [$uid], 'i');
    
    DB::ok(['message' => 'เธฅเธเธเธนเนเนเธเนเธชเธณเน€เธฃเนเธ']);
}

// ============================================================
// EXECUTIVE HANDLERS โ€” เธเธนเนเธเธฃเธดเธซเธฒเธฃ (View-only)
// ============================================================

function handleExecutiveDashboard(): never {
    authRole('executive', 'admin');
    $db = DB::get();
    
    // เธชเธฃเธธเธเธเนเธญเธกเธนเธฅเธฃเธงเธก
    $students = $db->one("SELECT COUNT(*) AS c FROM students WHERE user_id IN (SELECT user_id FROM users WHERE is_active=1)");
    $teachers = $db->one("SELECT COUNT(*) AS c FROM teachers WHERE user_id IN (SELECT user_id FROM users WHERE is_active=1)");
    $totalPlays = $db->one("SELECT COUNT(*) AS c FROM scores");
    $avgScore = $db->one("SELECT ROUND(AVG(score),1) AS a FROM scores");
    
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
    
    // เธ”เธถเธเธเนเธญเธกเธนเธฅเธเธนเนเนเธเนเธ—เธฑเนเธเธซเธกเธ” (View-only)
    $users = $db->all(
        "SELECT u.user_id, u.username, u.full_name, u.role, u.is_active, u.created_at,
                s.grade, p.phone, t.department
         FROM users u
         LEFT JOIN students s ON s.user_id = u.user_id
         LEFT JOIN parents p ON p.user_id = u.user_id
         LEFT JOIN teachers t ON t.user_id = u.user_id
         WHERE u.is_active = 1
         ORDER BY u.role, u.full_name"
    );
    
    DB::ok(['users' => $users]);
}

function handleExecutiveContent(): never {
    authRole('executive', 'admin');
    $db = DB::get();

    $type = $_GET['type'] ?? 'all';
    
    if ($type === 'all' || $type === 'summary') {
        $subjects = $db->all(
            "SELECT sub.subject_id, sub.name, sub.icon, sub.color,
                    COUNT(DISTINCT g.game_id) AS game_count,
                    COUNT(DISTINCT q.question_id) AS question_count
             FROM subjects sub
             LEFT JOIN games g ON g.subject_id = sub.subject_id
             LEFT JOIN questions q ON q.game_id = g.game_id
             GROUP BY sub.subject_id
             ORDER BY sub.order_no"
        );
        
        DB::ok([
            'type' => 'summary',
            'subjects' => $subjects
        ]);
    }
    
    if ($type === 'games') {
        $games = $db->all(
            "SELECT g.game_id, g.name, g.game_type, g.level,
                    sub.name AS subject_name, sub.icon AS subject_icon,
                    COUNT(q.question_id) AS question_count,
                    COUNT(DISTINCT s.score_id) AS play_count,
                    ROUND(AVG(s.score), 1) AS avg_score
             FROM games g
             LEFT JOIN subjects sub ON sub.subject_id = g.subject_id
             LEFT JOIN questions q ON q.game_id = g.game_id
             LEFT JOIN scores s ON s.game_id = g.game_id
             WHERE g.is_active = 1
             GROUP BY g.game_id
             ORDER BY sub.subject_id, g.game_id"
        );
        
        DB::ok([
            'type' => 'games',
            'games' => $games
        ]);
    }
}


// ============================================================
// เธชเธฃเนเธฒเธเน€เธเนเธฒเธซเธเนเธฒเธ—เธตเน/เธเธนเนเธเธฃเธดเธซเธฒเธฃ โ€” Admin เน€เธฃเธตเธขเธเนเธ”เน
// ============================================================
function handleAdminCreateStaff(): never {
    global $body;
    authRole('admin');
    _doCreateStaff($body);
}

// ============================================================
// เธชเธฃเนเธฒเธเน€เธเนเธฒเธซเธเนเธฒเธ—เธตเน/เธเธนเนเธเธฃเธดเธซเธฒเธฃ โ€” Officer เน€เธฃเธตเธขเธเนเธ”เน
// ============================================================
function handleOfficerCreateStaff(): never {
    global $body;
    authRole('officer', 'admin');
    _doCreateStaff($body);
}

// โ”€โ”€ เธเธฑเธเธเนเธเธฑเธเธเธฅเธฒเธเธชเธฃเนเธฒเธ officer / executive โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€
function _doCreateStaff(array $body): never {
    $db         = DB::get();
    $role       = $body['role']       ?? '';
    $username   = trim($body['username']   ?? '');
    $email      = trim($body['email']      ?? '');
    $password   = $body['password']   ?? 'kidlearn123';
    $full_name  = trim($body['full_name']  ?? '');
    $department = trim($body['department'] ?? '');
    $title      = trim($body['title']      ?? '');      // executive เน€เธ—เนเธฒเธเธฑเนเธ
    $permissions= trim($body['permissions']?? '');

    // validation
    if (!in_array($role, ['officer', 'executive'], true))
        DB::fail('role เธ•เนเธญเธเน€เธเนเธ officer เธซเธฃเธทเธญ executive', 400);
    if (!$username || !$email || !$full_name)
        DB::fail('เธ•เนเธญเธเธเธฃเธญเธ username, email, เธเธทเนเธญ-เธเธฒเธกเธชเธเธธเธฅ', 400);

    // เธ•เธฃเธงเธ username / email เธเนเธณ
    if ($db->one("SELECT user_id FROM users WHERE username=?", [$username], 's'))
        DB::fail("username '$username' เธกเธตเธญเธขเธนเนเนเธฅเนเธง", 409);
    if ($db->one("SELECT user_id FROM users WHERE email=?", [$email], 's'))
        DB::fail("email '$email' เธกเธตเธญเธขเธนเนเนเธฅเนเธง", 409);

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

    DB::ok(['user_id' => $uid, 'message' => "เธชเธฃเนเธฒเธ $role เธชเธณเน€เธฃเนเธ"]);
}

function handleStudentPlansV2(): never {
    authRole('student', 'parent', 'teacher', 'admin');
    $db = DB::get();
    $requestedStudentId = (int)($_GET['student_id'] ?? 0);
    $role = myRole();

    if (in_array($role, ['teacher', 'admin'], true)) {
        if ($requestedStudentId > 0) {
            $plans = $db->all(
                "SELECT lp.plan_id, lp.student_id, u.full_name AS student_name, lp.title, lp.description, lp.week_start, lp.due_at, lp.status,
                        lpi.item_id, lpi.game_id, lpi.lesson_no, lpi.target_score, lpi.sort_order,
                        g.name AS game_name, g.icon AS game_icon, sub.name AS subject_name,
                        IFNULL(best.best_score, 0) AS best_score
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
                        IFNULL(best.best_score, 0) AS best_score
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
                IFNULL(best.best_score, 0) AS best_score
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
        if (!$student) continue;

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

