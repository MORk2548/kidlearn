<?php
// ============================================================
// init_admin.php — ตั้งค่า Admin + ตรวจสอบระบบ
// เปิด: http://localhost:8080/api/init_admin.php
// ============================================================
header('Content-Type: application/json; charset=utf-8');

define('DB_HOST', getenv('DB_HOST') ?: 'db');
define('DB_USER', getenv('DB_USER') ?: 'kidlearn');
define('DB_PASS', getenv('DB_PASS') ?: 'kidlearn123');
define('DB_NAME', getenv('DB_NAME') ?: 'kidlearn_db');

$result = ['steps' => [], 'ok' => true];

// เชื่อม DB
$c = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
$c->set_charset('utf8mb4');
if ($c->connect_error) {
    echo json_encode(['ok' => false, 'error' => 'DB Error: ' . $c->connect_error]);
    exit;
}
$result['steps'][] = '✅ เชื่อมต่อ Database สำเร็จ';

// ตรวจว่า table users มีอยู่
$check = $c->query("SHOW TABLES LIKE 'users'");
if (!$check || $check->num_rows === 0) {
    echo json_encode(['ok' => false, 'error' => 'ไม่พบตาราง users — กรุณา import kidlearn_full.sql ก่อน']);
    exit;
}
$result['steps'][] = '✅ ตารางครบ';

// ตรวจ/สร้าง admin user
$admin = $c->query("SELECT user_id, password FROM users WHERE username='admin' LIMIT 1")->fetch_assoc();
$hash  = password_hash('admin01', PASSWORD_BCRYPT);

if ($admin) {
    // อัปเดตรหัสผ่านและ email
    $stmt = $c->prepare("UPDATE users SET password=?, email='admin@kidlearn.local', is_active=1 WHERE username='admin'");
    $stmt->bind_param('s', $hash);
    $stmt->execute();
    $result['steps'][] = '✅ อัปเดตรหัสผ่าน admin สำเร็จ';
    $uid = $admin['user_id'];
} else {
    // สร้าง admin ใหม่
    $stmt = $c->prepare("INSERT INTO users (username,email,password,role,full_name,is_active) VALUES ('admin','admin@kidlearn.local',?,'admin','ผู้ดูแลระบบ',1)");
    $stmt->bind_param('s', $hash);
    $stmt->execute();
    $uid = $c->insert_id;
    $result['steps'][] = '✅ สร้าง admin user ใหม่';
}

// เพิ่ม admins table record
$c->query("INSERT IGNORE INTO admins (user_id,level) VALUES ($uid,'super')");
$result['steps'][] = '✅ ตั้งค่า admins table';

// ตรวจสอบ column hint ใน questions
$cols = $c->query("SHOW COLUMNS FROM questions LIKE 'hint'");
if ($cols->num_rows === 0) {
    $c->query("ALTER TABLE questions ADD COLUMN hint TEXT DEFAULT NULL");
    $result['steps'][] = '✅ เพิ่ม column hint ใน questions';
} else {
    $result['steps'][] = '✅ column hint มีอยู่แล้ว';
}

// ตรวจสอบ column question_type
$cols2 = $c->query("SHOW COLUMNS FROM questions LIKE 'question_type'");
if ($cols2->num_rows === 0) {
    $c->query("ALTER TABLE questions ADD COLUMN question_type VARCHAR(20) DEFAULT 'text'");
    $result['steps'][] = '✅ เพิ่ม column question_type';
}

// ตรวจ table password_resets
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
    $result['steps'][] = '✅ สร้างตาราง password_resets';
} else {
    $result['steps'][] = '✅ ตาราง password_resets มีอยู่แล้ว';
}

$result['account'] = [
    'username' => 'admin',
    'password' => 'admin01',
    'role'     => 'admin',
    'note'     => 'ลบไฟล์ init_admin.php หลังใช้งาน'
];
$result['next'] = 'เปิด http://localhost:8080 แล้ว login ด้วย admin / admin01';

echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
