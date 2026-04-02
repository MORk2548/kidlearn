<?php
// ============================================================
// api/backend.php — KidLearn PHP API
// ใช้กับ database_normalized.sql (แยกตาราง students/parents/teachers)
// Docker: รันด้วย docker compose up -d
// ============================================================

// ── CONFIG ────────────────────────────────────────────────────
define('DB_HOST', getenv('DB_HOST') ?: 'db');
define('DB_USER', getenv('DB_USER') ?: 'kidlearn');
define('DB_PASS', getenv('DB_PASS') ?: 'kidlearn123');
define('DB_NAME', getenv('DB_NAME') ?: 'kidlearn_db');

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
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

// ── DATABASE ──────────────────────────────────────────────────
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

    // rawQuery — ไม่ throw/exit เมื่อ error (ใช้กับ CALL SP)
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

// ── SESSION ────────────────────────────────────────────────────
if (session_status() === PHP_SESSION_NONE) {
    // session config มาจาก docker/php.ini
    // เปิด session
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

// ── ROUTER ────────────────────────────────────────────────────
$action = $_GET['action'] ?? '';
$body   = json_decode(file_get_contents('php://input'), true) ?? [];

match ($action) {
    'login'           => handleLogin(),
    'logout'          => handleLogout(),
    'register'        => handleRegister(),
    'me'              => handleMe(),
    'update_profile'  => handleUpdateProfile(),
    'change_password' => handleChangePassword(),
    'subjects'        => handleSubjects(),
    'games'           => handleGames(),
    'save_score'      => handleSaveScore(),
    'scores'          => handleScores(),
    'lesson_content'  => handleLessonContent(),
    'get_content'     => handleGetContent(),
    'my_children'     => handleMyChildren(),
    'link_child'      => handleLinkChild(),
    'auto_link'       => handleAutoLink(),
    'unlink_child'    => handleUnlinkChild(),
    'recommendations' => handleRecommendations(),
    'notifications'   => handleNotifications(),
    'mark_notif_read' => handleMarkNotifRead(),
    'teacher_stats'   => handleTeacherStats(),
    'all_students'    => handleAllStudents(),
    'save_lesson'     => handleSaveLesson(),
    'delete_lesson'   => handleDeleteLesson(),
    'save_game_settings' => handleSaveGameSettings(),
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
    'play_questions'     => handlePlayQuestions(),   // โหลดคำถามสำหรับเล่นเกม
    'save_question'      => handleSaveQuestion(),
    'delete_question'    => handleDeleteQuestion(),
    // 8.0 reports
    'report'             => handleReport(),
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
    if (!$u || !$pass) DB::fail('กรุณากรอกข้อมูลให้ครบ', 400);

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

    $_SESSION['user'] = $user;
    DB::ok(['user' => $user]);
}

function handleLogout(): never {
    session_destroy();
    DB::ok();
}

// ── normalize เบอร์โทรให้เป็น 10 หลักเสมอ ──
function normalizePhone(string $raw): string {
    $p = preg_replace('/\D/', '', $raw);
    if (strlen($p) === 9) $p = '0' . $p;  // 812345678 → 0812345678
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

    if (!$name || !$uname || !$email || !$pass) DB::fail('กรุณากรอกข้อมูลให้ครบ', 400);
    if (strlen($pass) < 6)                      DB::fail('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', 400);
    if (!in_array($role, ['student','parent','teacher','officer','executive'])) DB::fail('role ไม่ถูกต้อง', 400);

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
        $grade = $body['grade'] ?? 'ป.1';
        $pp = normalizePhone($body['parent_phone'] ?? '');
        if (!$pp || strlen($pp) < 9) DB::fail('กรุณากรอกเบอร์โทรผู้ปกครองให้ถูกต้อง', 400);
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
            $db->run("INSERT IGNORE INTO parent_student (parent_id,student_id) VALUES (?,?)",
                [$pid, $s['student_id']], 'ii');
        }
    }

    if ($role === 'teacher') {
        $dept = trim($body['department'] ?? '');
        $db->run("INSERT INTO teachers (user_id,department) VALUES (?,?)", [$uid, $dept], 'is');
    }

    if ($role === 'officer') {
        $dept = trim($body['department'] ?? 'ฝ่ายบุคคล');
        $db->run("INSERT INTO officers (user_id,department) VALUES (?,?)", [$uid, $dept], 'is');
    }

    if ($role === 'executive') {
        $title = trim($body['title'] ?? 'ผู้บริหาร');
        $dept  = trim($body['department'] ?? 'บริหาร');
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

function handleUpdateProfile(): never {
    global $body;
    auth();
    $db   = DB::get();
    $id   = myId();
    $role = myRole();
    $name  = trim($body['full_name'] ?? '');
    $email = trim($body['email']     ?? '');
    if (!$name || !$email) DB::fail('กรุณากรอกข้อมูลให้ครบ', 400);

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
        if ($phone && strlen($phone) < 9) DB::fail('เบอร์โทรไม่ถูกต้อง', 400);
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

    // อัปเดต session
    $_SESSION['user']['full_name'] = $name;
    DB::ok();
}

function handleChangePassword(): never {
    global $body;
    auth();
    $old = $body['old_password'] ?? '';
    $new = $body['new_password'] ?? '';
    if (!$old || !$new) DB::fail('กรุณากรอกข้อมูลให้ครบ', 400);
    if (strlen($new) < 6) DB::fail('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร', 400);
    $user = DB::get()->one("SELECT password FROM users WHERE user_id=?", [myId()], 'i');
    if (!password_verify($old, $user['password'])) DB::fail('รหัสผ่านเดิมไม่ถูกต้อง', 401);
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
    if (!$sid) DB::fail('ต้องส่ง subject_id', 400);
    DB::ok(['games' => DB::get()->all(
        "SELECT * FROM games WHERE subject_id=? AND is_active=1 ORDER BY game_id", [$sid], 'i'
    )]);
}

function handleSaveScore(): never {
    global $body;
    auth();
    $db = DB::get();

    $gameId    = (int)($body['game_id']    ?? 0);
    $score     = (int)($body['score']      ?? 0);
    $timeSpent = (int)($body['time_spent'] ?? 0);
    $lessonNo  = (int)($body['lesson_no']  ?? 1);   // ← รับบทที่ด้วย
    if ($lessonNo < 1 || $lessonNo > 6) $lessonNo = 1;

    // หา student_id จาก user_id ปัจจุบัน
    $st = $db->one("SELECT student_id FROM students WHERE user_id=?", [myId()], 'i');
    if (!$st) DB::fail('ต้องเป็นนักเรียนเท่านั้น', 403);
    $studentId = $st['student_id'];

    if (!$gameId) DB::fail('ต้องส่ง game_id', 400);

    $db->run("INSERT INTO scores (student_id,game_id,lesson_no,score,time_spent) VALUES (?,?,?,?,?)",
        [$studentId, $gameId, $lessonNo, $score, $timeSpent], 'iiiii');
    $scoreId = $db->insertId();

    // อัปเดต progress cache ผ่าน rawQuery (ไม่ exit ถ้า SP ไม่มี)
    $game = $db->one("SELECT subject_id FROM games WHERE game_id=?", [$gameId], 'i');
    if ($game) {
        $db->rawQuery("CALL sp_update_progress($studentId,{$game['subject_id']})");
    }

    // Generate recommendations (ใช้ try/catch กันกรณี table ยังไม่มี)
    try { generateRecommendations($studentId, myId()); } catch (Exception $e) {}

    DB::ok(['score_id' => $scoreId, 'score' => $score]);
}

// ── ดึงเนื้อหาบทเรียน (GET ?action=lesson_content&game_id=X&lesson_no=Y) ──
function handleLessonContent(): never {
    // soft auth — ถ้า session หมดยังดึงเนื้อหาได้ (เนื้อหาเป็น public)
    $db       = DB::get();
    $gameId   = (int)($_GET['game_id']   ?? 0);
    $lessonNo = (int)($_GET['lesson_no'] ?? 0);

    if (!$gameId) DB::fail('ต้องส่ง game_id', 400);

    // ดึงทุกบทของเกมนั้น (ไม่ระบุ lesson_no) หรือบทเดียว
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
        // ดึงรายชื่อทุกบทของเกมนี้ (สำหรับ lesson selector)
        $list = $db->all(
            "SELECT content_id, lesson_no, title, summary, read_time FROM lesson_content
             WHERE game_id=? ORDER BY lesson_no",
            [$gameId], 'i'
        );
        DB::ok(['lessons' => $list]);
    }
}

// ── ดึงคะแนนสูงสุดแต่ละบทของนักเรียนคนนี้ ──
function handleGetContent(): never {
    // soft auth
    $db     = DB::get();
    $gameId = (int)($_GET['game_id'] ?? 0);
    if (!$gameId) DB::fail('ต้องส่ง game_id', 400);

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
    // สร้าง map lesson_no => has_content
    $hasContent = [];
    foreach ($lessons as $l) $hasContent[(int)$l['lesson_no']] = true;

    DB::ok(['lessons' => $lessons, 'best_scores' => $scores, 'has_content' => $hasContent]);
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
    if (!$phone || strlen($phone) < 9) DB::fail('กรุณากรอกเบอร์โทรที่ถูกต้อง', 400);

    $db = DB::get();
    $p  = $db->one("SELECT parent_id, phone FROM parents WHERE user_id=?", [myId()], 'i');
    if (!$p) DB::fail('ไม่พบข้อมูลผู้ปกครอง', 404);

    // normalize เบอร์ใน DB ด้วย แล้วเทียบให้ยืดหยุ่น
    $dbPhone  = normalizePhone($p['phone'] ?? '');
    $phone9   = ltrim($phone, '0');
    $dbPhone9 = ltrim($dbPhone, '0');
    if ($dbPhone !== $phone && $dbPhone9 !== $phone9)
        DB::fail('เบอร์โทรไม่ตรงกับบัญชีของคุณ', 400);

    // ค้นหานักเรียนที่กรอกเบอร์นี้ (ทั้ง 10 หลักและ 9 หลัก)
    $students = $db->all(
        "SELECT st.student_id, u.full_name, st.grade FROM students st
         JOIN users u ON u.user_id=st.user_id
         WHERE st.parent_phone=? OR st.parent_phone=?",
        [$phone, $phone9], 'ss'
    );
    if (!$students) DB::fail('ไม่พบนักเรียนที่กรอกเบอร์นี้ไว้ — ตรวจสอบว่านักเรียนกรอกเบอร์ถูกต้อง', 404);

    $linked = 0;
    foreach ($students as $s) {
        $db->run("INSERT IGNORE INTO parent_student (parent_id,student_id) VALUES (?,?)",
            [$p['parent_id'], $s['student_id']], 'ii');
        if ($db->affected() > 0) $linked++;
    }
    DB::ok(['linked' => $linked, 'students' => $students]);
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
             ON DUPLICATE KEY UPDATE message=VALUES(message),rec_type=VALUES(rec_type),created_at=NOW()",
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
// LESSON CONTENT EDITOR (ครูแก้ไขได้)
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

    if (!$gameId || !$title) DB::fail('ต้องส่ง game_id และ title', 400);

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
    DB::ok(['message' => 'บันทึกสำเร็จ']);
}

function handleDeleteLesson(): never {
    global $body;
    authRole('teacher', 'admin', 'officer');
    $gameId   = (int)($body['game_id']   ?? 0);
    $lessonNo = (int)($body['lesson_no'] ?? 1);
    if (!$gameId) DB::fail('ต้องส่ง game_id', 400);
    DB::get()->run(
        "DELETE FROM lesson_content WHERE game_id=? AND lesson_no=?",
        [$gameId, $lessonNo], 'ii'
    );
    DB::ok(['message' => 'ลบสำเร็จ']);
}

function handleSaveGameSettings(): never {
    global $body;
    authRole('teacher', 'admin', 'officer');
    $db        = DB::get();
    $gameId    = (int)($body['game_id'] ?? 0);
    $timeLimit = (int)($body['time_limit'] ?? 0);

    if (!$gameId) DB::fail('ต้องส่ง game_id', 400);
    if ($timeLimit < 10 || $timeLimit > 3600) {
        DB::fail('เวลาเล่นต้องอยู่ระหว่าง 10 ถึง 3600 วินาที', 400);
    }

    $db->run(
        "UPDATE games SET time_limit=? WHERE game_id=?",
        [$timeLimit, $gameId],
        'ii'
    );
    DB::ok(['message' => 'บันทึกเวลาเล่นสำเร็จ', 'time_limit' => $timeLimit]);
}


// ============================================================
// 2.0 จัดการข้อมูลผู้ใช้ (admin)
// ============================================================
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
            COALESCE(s.grade,'—') AS grade,
            COALESCE(p.phone,'—') AS phone,
            COALESCE(t.department,'—') AS department
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
    if (!$uid || $uid === myId()) DB::fail('ไม่สามารถดำเนินการได้', 400);
    $u = DB::get()->one("SELECT is_active FROM users WHERE user_id=?", [$uid], 'i');
    if (!$u) DB::fail('ไม่พบผู้ใช้', 404);
    $newState = $u['is_active'] ? 0 : 1;
    DB::get()->run("UPDATE users SET is_active=? WHERE user_id=?", [$newState, $uid], 'ii');
    DB::ok(['is_active' => $newState]);
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
    $pass = $body['new_password'] ?? 'kidlearn123';
    if (!$uid) DB::fail('ต้องส่ง user_id', 400);
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
    $s = DB::get()->one("SELECT is_active FROM subjects WHERE subject_id=?", [$sid], 'i');
    if (!$s) DB::fail('ไม่พบวิชา', 404);
    DB::get()->run("UPDATE subjects SET is_active=? WHERE subject_id=?", [$s['is_active']?0:1, $sid], 'ii');
    DB::ok(['is_active' => $s['is_active'] ? 0 : 1]);
}

// ============================================================
// 4.0 ครูแก้ไขคำถาม-คำตอบในเกม
// ============================================================
function handleGetGameQuestions(): never {
    auth();
    $gid  = (int)($_GET['game_id'] ?? 0);
    if (!$gid) DB::fail('ต้องส่ง game_id', 400);
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
    $db   = DB::get();
    $qid  = (int)($body['question_id'] ?? 0);
    $gid  = (int)($body['game_id'] ?? 0);
    $text = trim($body['question_text'] ?? '');
    $hint = trim($body['hint'] ?? '');
    $order = (int)($body['order_no'] ?? 1);
    $answers = $body['answers'] ?? [];
    if (!$gid || !$text) DB::fail('ต้องส่ง game_id และ question_text', 400);

    if ($qid) {
        $db->run("UPDATE questions SET question_text=?,hint=?,order_no=? WHERE question_id=?",
            [$text, $hint ?: null, $order, $qid], 'ssii');
        // ลบ answers เดิมแล้วใส่ใหม่
        $db->run("DELETE FROM answers WHERE question_id=?", [$qid], 'i');
    } else {
        $db->run("INSERT INTO questions (game_id,question_text,hint,order_no) VALUES (?,?,?,?)",
            [$gid, $text, $hint ?: null, $order], 'issi');
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
    if (!$qid) DB::fail('ต้องส่ง question_id', 400);
    DB::get()->run("DELETE FROM questions WHERE question_id=?", [$qid], 'i');
    DB::ok();
}

// ============================================================
// 8.0 ออกรายงาน (ผู้บริหาร/ครู)
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

    $user = $db->one("SELECT user_id, full_name FROM users WHERE email=? AND is_active=1", [$email], 's');
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

    $user = $db->one("SELECT user_id FROM users WHERE email=? AND is_active=1", [$email], 's');
    if (!$user) DB::fail('ไม่พบอีเมลนี้ในระบบ', 404);

    $reset = $db->one(
        "SELECT reset_id FROM password_resets
         WHERE user_id=? AND token=? AND expires_at>NOW() AND used=0",
        [$user['user_id'], $token], 'is'
    );
    if (!$reset) DB::fail('รหัส OTP ไม่ถูกต้องหรือหมดอายุแล้ว', 400);

    // อัปเดตรหัสผ่าน
    $db->run("UPDATE users SET password=? WHERE user_id=?",
        [password_hash($pass, PASSWORD_BCRYPT), $user['user_id']], 'si');
    $db->run("UPDATE password_resets SET used=1 WHERE reset_id=?", [$reset['reset_id']], 'i');

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
function handlePlayQuestions(): never {
    $db    = DB::get();
    $gid   = (int)($_GET['game_id'] ?? 0);
    if (!$gid) DB::fail('ต้องส่ง game_id', 400);

    // ข้อมูลเกม
    $game = $db->one("SELECT * FROM games WHERE game_id=? AND is_active=1", [$gid], 'i');
    if (!$game) DB::fail('ไม่พบเกม', 404);

    $type = $game['game_type'];

    // โหลดคำถามทั้งหมด
    $qs = $db->all(
        "SELECT question_id, question_text, hint, question_type, order_no
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
                'opts' => $opts,
                'ans'  => $ans_idx,
                'hint' => $q['hint'],
            ];
        } elseif ($type === 'truefalse') {
            $correct_ans = null;
            foreach ($answers as $a) {
                if ($a['is_correct']) {
                    $text = mb_strtolower(trim((string)$a['answer_text']), 'UTF-8');
                    if (in_array($text, ['ถูก', 'จริง', 'true', 'yes', 'ใช่'], true)) {
                        $correct_ans = true;
                    } elseif (in_array($text, ['ผิด', 'เท็จ', 'false', 'no', 'ไม่ใช่'], true)) {
                        $correct_ans = false;
                    }
                    break;
                }
            }
            $result[] = [
                'q'   => $q['question_text'],
                'ans' => $correct_ans ?? true,
            ];
        } elseif ($type === 'fill') {
            $ans_text = '';
            foreach ($answers as $a) {
                if ($a['is_correct']) { $ans_text = $a['answer_text']; break; }
            }
            $result[] = [
                'q'    => $q['question_text'],
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

    // จัดรูปแบบ response ตาม type
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
// OFFICER HANDLERS — เจ้าหน้าที่จัดการผู้ใช้
// ============================================================

function handleOfficerUsers(): never {
    authRole('officer', 'admin');
    $db = DB::get();
    
    // ดึงรายชื่อผู้ใช้ทั้งหมด
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
    
    if (!$uid || !$name) DB::fail('ต้องส่ง user_id และ full_name', 400);
    
    $user = $db->one("SELECT role FROM users WHERE user_id=?", [$uid], 'i');
    if (!$user) DB::fail('ไม่พบผู้ใช้', 404);
    
    // อัปเดต users table
    if ($email) {
        $existing = $db->one("SELECT 1 FROM users WHERE email=? AND user_id!=?", [$email, $uid], 'si');
        if ($existing) DB::fail('อีเมลนี้ถูกใช้แล้ว', 409);
        $db->run("UPDATE users SET full_name=?, email=? WHERE user_id=?", [$name, $email, $uid], 'ssi');
    } else {
        $db->run("UPDATE users SET full_name=? WHERE user_id=?", [$name, $uid], 'si');
    }
    
    // อัปเดต role-specific tables
    if ($user['role'] === 'student' && $grade) {
        $db->run("UPDATE students SET grade=? WHERE user_id=?", [$grade, $uid], 'si');
    }
    if ($user['role'] === 'parent' && $phone) {
        $phone = normalizePhone($phone);
        if (strlen($phone) < 9) DB::fail('เบอร์โทรไม่ถูกต้อง', 400);
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
    
    // สรุปข้อมูลรวม
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
    
    // ดึงข้อมูลผู้ใช้ทั้งหมด (View-only)
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
    
    // ดึงข้อมูลเนื้อหาบทเรียนทั้งหมด (View-only)
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
    $password   = $body['password']   ?? 'kidlearn123';
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
