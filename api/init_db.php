<?php
// ============================================================
// init_db.php — ใส่ข้อมูลเริ่มต้น (games + questions + answers)
// เปิด: http://localhost:8080/api/init_db.php
// รันหลังจาก Docker up แล้ว DB พร้อม
// ============================================================
header('Content-Type: application/json; charset=utf-8');

define('DB_HOST', getenv('DB_HOST') ?: 'db');
define('DB_USER', getenv('DB_USER') ?: 'kidlearn');
define('DB_PASS', getenv('DB_PASS') ?: 'kidlearn123');
define('DB_NAME', getenv('DB_NAME') ?: 'kidlearn_db');

$c = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
$c->set_charset('utf8mb4');
if ($c->connect_error) {
    echo json_encode(['ok'=>false,'error'=>'DB: '.$c->connect_error]);
    exit;
}

$log = [];
$c->query("SET FOREIGN_KEY_CHECKS=0");

// ── 1. ตรวจสอบ / แก้ schema ──
$cols = $c->query("SHOW COLUMNS FROM answers")->fetch_all(MYSQLI_ASSOC);
$colNames = array_column($cols,'Field');
if(!in_array('pair_left',$colNames))  { $c->query("ALTER TABLE answers ADD COLUMN pair_left  VARCHAR(300) DEFAULT NULL"); $log[]='Added pair_left'; }
if(!in_array('pair_right',$colNames)) { $c->query("ALTER TABLE answers ADD COLUMN pair_right VARCHAR(300) DEFAULT NULL"); $log[]='Added pair_right'; }
if(!in_array('seq_order',$colNames))  { $c->query("ALTER TABLE answers ADD COLUMN seq_order  INT          DEFAULT NULL"); $log[]='Added seq_order'; }

$qcols = $c->query("SHOW COLUMNS FROM questions")->fetch_all(MYSQLI_ASSOC);
$qcolNames = array_column($qcols,'Field');
if(!in_array('hint',$qcolNames))          { $c->query("ALTER TABLE questions ADD COLUMN hint TEXT DEFAULT NULL"); $log[]='Added hint'; }
if(!in_array('question_type',$qcolNames)) { $c->query("ALTER TABLE questions ADD COLUMN question_type VARCHAR(20) DEFAULT 'text'"); $log[]='Added question_type'; }

// ── 2. INSERT games (ถ้ายังไม่มี) ──
$gameCount = $c->query("SELECT COUNT(*) AS c FROM games")->fetch_assoc()['c'];
if ($gameCount == 0) {
    $games = [
        [1,1,'บวกลบคล่อง','mcq','easy','➕',60],
        [2,1,'จริงหรือเท็จ เลขคณิต','truefalse','easy','✅',60],
        [3,1,'เติมสมการ','fill','medium','✏️',90],
        [4,1,'จับคู่สัญลักษณ์','matching','easy','🔗',90],
        [5,1,'เรียงตัวเลข','sequence','medium','📋',90],
        [6,1,'ค้นหาตัวเลข','wordsearch','easy','🔍',120],
        [7,2,'โลกและอวกาศ','mcq','easy','🌍',60],
        [8,2,'จริงหรือเท็จ วิทย์','truefalse','easy','🧪',60],
        [9,2,'เติมคำวิทยาศาสตร์','fill','medium','🔬',90],
        [10,2,'จับคู่อาณาจักรสิ่งมีชีวิต','matching','medium','🌿',90],
        [11,2,'เรียงวัฏจักรน้ำ','sequence','medium','🌊',90],
        [12,2,'ค้นหาคำวิทย์','wordsearch','easy','🔍',120],
        [13,3,'คำถามภาษาไทย','mcq','easy','📖',60],
        [14,3,'จริงหรือเท็จ ภาษาไทย','truefalse','easy','✔️',60],
        [15,3,'เติมคำภาษาไทย','fill','medium','✏️',90],
        [16,3,'จับคู่ประเภทคำ','matching','medium','📝',90],
        [17,3,'เรียงประโยค','sequence','medium','📋',90],
        [18,3,'ค้นหาคำภาษาไทย','wordsearch','easy','🔍',120],
        [19,4,'คำศัพท์สัตว์','mcq','easy','🐾',60],
        [20,4,'จริงหรือเท็จ English','truefalse','easy','🅰️',60],
        [21,4,'เติมคำศัพท์','fill','medium','✏️',90],
        [22,4,'จับคู่คำแปล','matching','easy','🔗',90],
        [23,4,'เรียง A-Z','sequence','easy','🔤',60],
        [24,4,'Word Search','wordsearch','easy','🔍',120],
        [25,5,'ถามประวัติศาสตร์','mcq','medium','📜',60],
        [26,5,'จริงหรือเท็จ ประวัติ','truefalse','medium','⚔️',60],
        [27,5,'เติมคำประวัติศาสตร์','fill','hard','✏️',90],
        [28,5,'จับคู่ยุคสมัย','matching','medium','🏛️',90],
        [29,5,'เรียงยุคสมัยไทย','sequence','medium','⏳',90],
        [30,5,'ค้นหาคำประวัติ','wordsearch','medium','🔍',120],
        [31,6,'ถามสุขศึกษา','mcq','easy','💊',60],
        [32,6,'จริงหรือเท็จ สุขภาพ','truefalse','easy','🏃',60],
        [33,6,'เติมคำสุขภาพ','fill','medium','✏️',90],
        [34,6,'จับคู่โภชนาการ','matching','easy','🥗',90],
        [35,6,'เรียงขั้นตอน CPR','sequence','hard','❤️',90],
        [36,6,'ค้นหาคำสุขภาพ','wordsearch','easy','🔍',120],
    ];
    $stmt = $c->prepare("INSERT IGNORE INTO games (game_id,subject_id,name,game_type,level,icon,time_limit) VALUES (?,?,?,?,?,?,?)");
    foreach ($games as $g) {
        $stmt->bind_param('iisssis', $g[0],$g[1],$g[2],$g[3],$g[4],$g[5],$g[6]);
        $stmt->execute();
    }
    $log[] = '✅ Inserted 36 games';
} else {
    $log[] = "⏭ Games already exist ($gameCount rows)";
}

// ── 3. INSERT questions + answers ──
$qCount = $c->query("SELECT COUNT(*) AS c FROM questions")->fetch_assoc()['c'];
if ($qCount == 0) {
    // โหลด SQL seed file
    $seedFile = __DIR__ . '/../content/questions_seed.sql';
    if (file_exists($seedFile)) {
        $seedSql = file_get_contents($seedFile);
        // รัน multi-query
        if ($c->multi_query($seedSql)) {
            do { $c->store_result(); } while ($c->next_result());
            $log[] = '✅ Seeded questions from questions_seed.sql';
        } else {
            $log[] = '❌ Seed error: '.$c->error;
        }
    } else {
        $log[] = '⚠️ questions_seed.sql not found — run inline seed';
        // inline seed ตัวอย่าง MCQ เกม 1
        $qStmt = $c->prepare("INSERT INTO questions (question_id,game_id,question_text,question_type,hint,order_no,point) VALUES (?,?,?,'text',?,?,10)");
        $aStmt = $c->prepare("INSERT INTO answers (question_id,answer_text,is_correct,pair_left,pair_right,seq_order) VALUES (?,?,?,NULL,NULL,NULL)");
        $sample = [
            [1,1,'15 + 27 = ?',null,1,['42'=>1,'40'=>0,'41'=>0,'43'=>0]],
            [2,1,'56 - 19 = ?',null,2,['37'=>1,'35'=>0,'38'=>0,'36'=>0]],
            [3,1,'8 × 7 = ?',null,3,['56'=>1,'54'=>0,'58'=>0,'52'=>0]],
        ];
        foreach ($sample as [$qid,$gid,$qt,$hint,$ord,$opts]) {
            $qStmt->bind_param('iissi',$qid,$gid,$qt,$hint,$ord);
            $qStmt->execute();
            foreach ($opts as $text=>$correct) {
                $aStmt->bind_param('isi',$qid,$text,$correct);
                $aStmt->execute();
            }
        }
        $log[] = 'Inserted sample questions';
    }
} else {
    $log[] = "⏭ Questions already exist ($qCount rows)";
}

// ── 4. สร้างตาราง admins (ถ้ายังไม่มี) ──
$c->query("CREATE TABLE IF NOT EXISTS admins (
    admin_id   INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NOT NULL UNIQUE,
    level      ENUM('super','normal') NOT NULL DEFAULT 'normal',
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB");
$log[] = '✅ Ensured admins table exists';

// ── 4b. สร้างตาราง lesson_content (ถ้ายังไม่มี) ──
$c->query("CREATE TABLE IF NOT EXISTS lesson_content (
    content_id  INT AUTO_INCREMENT PRIMARY KEY,
    game_id     INT NOT NULL,
    lesson_no   INT NOT NULL DEFAULT 1,
    title       VARCHAR(200) NOT NULL DEFAULT '',
    summary     VARCHAR(500) DEFAULT NULL,
    body        LONGTEXT DEFAULT NULL,
    read_time   INT NOT NULL DEFAULT 5,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_game_lesson (game_id, lesson_no),
    FOREIGN KEY (game_id) REFERENCES games(game_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
$log[] = '✅ Ensured lesson_content table exists';

// ── 4c. เพิ่ม lesson_no ใน scores (ถ้ายังไม่มี) ──
$scols = $c->query("SHOW COLUMNS FROM scores")->fetch_all(MYSQLI_ASSOC);
$scolNames = array_column($scols, 'Field');
if (!in_array('lesson_no', $scolNames)) {
    $c->query("ALTER TABLE scores ADD COLUMN lesson_no INT NOT NULL DEFAULT 1 AFTER game_id");
    $log[] = '✅ Added lesson_no to scores';
}

// ── 4d. Admin account ──
$admin = $c->query("SELECT user_id FROM users WHERE username='admin' LIMIT 1")->fetch_assoc();
if ($admin) {
    $hash = password_hash('admin01', PASSWORD_BCRYPT);
    $c->query("UPDATE users SET password='$hash', is_active=1 WHERE username='admin'");
    $c->query("INSERT IGNORE INTO admins (user_id,level) VALUES ({$admin['user_id']},'super')");
    $log[] = '✅ Admin password set to admin01';
} else {
    $log[] = '⚠️ Admin user not found in users table';
}

// ── 5. password_resets table ──
$pr = $c->query("SHOW TABLES LIKE 'password_resets'")->num_rows;
if (!$pr) {
    $c->query("CREATE TABLE password_resets (
        reset_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(64) NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        used TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        INDEX idx_token (token)
    ) ENGINE=InnoDB");
    $log[] = '✅ Created password_resets table';
}

$c->query("SET FOREIGN_KEY_CHECKS=1");

echo json_encode([
    'ok'      => true,
    'log'     => $log,
    'account' => ['username'=>'admin','password'=>'admin01'],
    'next'    => 'เปิด http://localhost:8080 แล้ว login ด้วย admin / admin01'
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
