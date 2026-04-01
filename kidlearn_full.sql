-- ============================================================
-- KidLearn — kidlearn_full.sql
-- ไฟล์รวมทั้งหมด: Schema + Patch + ตัวอย่างเนื้อหา
-- วิธีใช้: phpMyAdmin → New → สร้าง kidlearn_db → แท็บ Import → เลือกไฟล์นี้
-- หรือ: mysql -u root -p < kidlearn_full.sql
-- ============================================================

-- ============================================================
-- KidLearn — database_normalized.sql
-- แบบ "แยกตารางตาม Role" (Normalized / Table-Per-Role)
-- ============================================================
-- ข้อดี:
--   + โครงสร้างชัดเจน แต่ละ role มี column เฉพาะของตัวเอง
--   + ไม่มี NULL column เกลื่อนตาราง
--   + ง่ายต่อการเพิ่ม column เฉพาะ role ในอนาคต
--   + ตรงตามหลัก 3NF (Third Normal Form)
-- ข้อเสีย:
--   - Query ต้อง JOIN หลายตาราง
--   - INSERT/UPDATE ต้องเขียน 2 ตาราง เสมอ
--   - Foreign key ซับซ้อนขึ้นเล็กน้อย
-- ============================================================
-- วิธีใช้: mysql -u root -p < database_normalized.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS kidlearn_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE kidlearn_db;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 1. USERS — ข้อมูลกลาง (ทุก role ใช้ร่วมกัน)
--    เก็บเฉพาะ: auth + ชื่อ + role flag
-- ============================================================
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  user_id     INT AUTO_INCREMENT PRIMARY KEY,
  username    VARCHAR(50)  NOT NULL UNIQUE,
  email       VARCHAR(100) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,             -- bcrypt hash
  role        ENUM('student','parent','teacher','admin','officer','executive') NOT NULL DEFAULT 'student',
  full_name   VARCHAR(100) NOT NULL,
  profile_img VARCHAR(255) DEFAULT NULL,
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_role (role)
) ENGINE=InnoDB;

-- ============================================================
-- 2. STUDENTS — ข้อมูลเฉพาะนักเรียน (1:1 กับ users)
-- ============================================================
DROP TABLE IF EXISTS students;
CREATE TABLE students (
  student_id   INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL UNIQUE,              -- 1:1 กับ users
  grade        VARCHAR(20) NOT NULL DEFAULT 'ป.1',
  parent_phone VARCHAR(20) DEFAULT NULL,         -- เชื่อมผู้ปกครอง
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_parent_phone (parent_phone)
) ENGINE=InnoDB;

-- ============================================================
-- 3. PARENTS — ข้อมูลเฉพาะผู้ปกครอง (1:1 กับ users)
-- ============================================================
DROP TABLE IF EXISTS parents;
CREATE TABLE parents (
  parent_id  INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL UNIQUE,                -- 1:1 กับ users
  phone      VARCHAR(20) NOT NULL UNIQUE,        -- เบอร์ที่นักเรียนใช้เชื่อม
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_phone (phone)
) ENGINE=InnoDB;

-- ============================================================
-- 4. TEACHERS — ข้อมูลเฉพาะครู (1:1 กับ users)
-- ============================================================
DROP TABLE IF EXISTS teachers;
CREATE TABLE teachers (
  teacher_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL UNIQUE,                -- 1:1 กับ users
  department VARCHAR(100) DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 4.1 OFFICERS — เจ้าหน้าที่จัดการผู้ใช้ (1:1 กับ users)
-- ============================================================
DROP TABLE IF EXISTS officers;
CREATE TABLE officers (
  officer_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL UNIQUE,                -- 1:1 กับ users
  department VARCHAR(100) DEFAULT 'ฝ่ายบุคคล',
  permissions JSON DEFAULT '{"manage_users":true,"view_reports":true}',
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 4.2 EXECUTIVES — ผู้บริหาร ดูข้อมูลได้ทั้งหมด (1:1 กับ users)
-- ============================================================
DROP TABLE IF EXISTS executives;
CREATE TABLE executives (
  executive_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL UNIQUE,               -- 1:1 กับ users
  title        VARCHAR(100) DEFAULT 'ผู้บริหาร',
  department   VARCHAR(100) DEFAULT 'บริหาร',
  permissions  JSON DEFAULT '{"view_all":true,"view_content":true,"view_reports":true}',
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 5. PARENT_STUDENT — ความสัมพันธ์ผู้ปกครอง-นักเรียน
--    ผู้ปกครอง 1 คน มีลูกได้หลายคน (many-to-many ผ่าน parent_id+student_id)
-- ============================================================
DROP TABLE IF EXISTS parent_student;
CREATE TABLE parent_student (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  parent_id  INT NOT NULL,                       -- FK → parents.parent_id
  student_id INT NOT NULL,                       -- FK → students.student_id
  linked_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_link (parent_id, student_id),
  FOREIGN KEY (parent_id)  REFERENCES parents(parent_id)  ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 6. SUBJECTS — วิชา 6 วิชา
-- ============================================================
DROP TABLE IF EXISTS subjects;
CREATE TABLE subjects (
  subject_id  INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  icon        VARCHAR(20)  DEFAULT '📚',
  color       VARCHAR(10)  DEFAULT '#4CAF50',
  order_no    INT DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- 7. GAMES — 6 ประเภท × 6 วิชา = 36 เกม
-- ============================================================
DROP TABLE IF EXISTS games;
CREATE TABLE games (
  game_id    INT AUTO_INCREMENT PRIMARY KEY,
  subject_id INT NOT NULL,
  name       VARCHAR(100) NOT NULL,
  game_type  ENUM('mcq','truefalse','fill','matching','sequence','wordsearch') NOT NULL,
  level      ENUM('easy','medium','hard') NOT NULL DEFAULT 'easy',
  icon       VARCHAR(20)  DEFAULT '🎮',
  time_limit INT DEFAULT 60,
  max_score  INT DEFAULT 100,
  is_active  TINYINT(1)   NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  extra_data   JSON         DEFAULT NULL,  -- wordsearch: {words:[], grid:[]}
  updated_by   INT          DEFAULT NULL,
  updated_at   DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(subject_id) ON DELETE CASCADE,
  INDEX idx_subject (subject_id)
) ENGINE=InnoDB;

-- ============================================================
-- 8. QUESTIONS + ANSWERS
-- ============================================================
DROP TABLE IF EXISTS answers;
DROP TABLE IF EXISTS questions;
CREATE TABLE questions (
  question_id    INT AUTO_INCREMENT PRIMARY KEY,
  game_id        INT NOT NULL,
  question_text  TEXT NOT NULL,
  question_img   VARCHAR(255) DEFAULT NULL,
  question_type  VARCHAR(20)  DEFAULT 'text',
  hint           TEXT         DEFAULT NULL,
  order_no       INT DEFAULT 1,
  point          INT DEFAULT 10,
  FOREIGN KEY (game_id) REFERENCES games(game_id) ON DELETE CASCADE,
  INDEX idx_game (game_id)
) ENGINE=InnoDB;

CREATE TABLE answers (
  answer_id     INT AUTO_INCREMENT PRIMARY KEY,
  question_id   INT NOT NULL,
  answer_text   VARCHAR(500) NOT NULL,
  is_correct    TINYINT(1)   NOT NULL DEFAULT 0,
  -- matching: left_text/right_text, sequence: order_no, wordsearch: ใช้ answer_text
  pair_left     VARCHAR(300) DEFAULT NULL,  -- matching: ฝั่งซ้าย
  pair_right    VARCHAR(300) DEFAULT NULL,  -- matching: ฝั่งขวา
  seq_order     INT          DEFAULT NULL,  -- sequence: ลำดับที่ถูกต้อง
  FOREIGN KEY (question_id) REFERENCES questions(question_id) ON DELETE CASCADE,
  INDEX idx_q (question_id)
) ENGINE=InnoDB;

-- ============================================================
-- 9. SCORES — บันทึกผลการเล่น
-- ============================================================
DROP TABLE IF EXISTS scores;
CREATE TABLE scores (
  score_id   INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  game_id    INT NOT NULL,
  lesson_no  TINYINT UNSIGNED NOT NULL DEFAULT 1,
  score      INT NOT NULL DEFAULT 0,
  max_score  INT NOT NULL DEFAULT 100,
  time_spent INT DEFAULT 0,
  played_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  FOREIGN KEY (game_id)    REFERENCES games(game_id)       ON DELETE CASCADE,
  INDEX idx_student (student_id),
  INDEX idx_played  (played_at)
) ENGINE=InnoDB;

-- ============================================================
-- 10. PROGRESS — cache ความก้าวหน้าต่อวิชา
-- ============================================================
DROP TABLE IF EXISTS progress;
CREATE TABLE progress (
  progress_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id  INT NOT NULL,                      -- FK → students.student_id
  subject_id  INT NOT NULL,
  avg_score   DECIMAL(5,2) DEFAULT 0,
  total_plays INT DEFAULT 0,
  last_played DATETIME,
  UNIQUE KEY uq_ss (student_id, subject_id),
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(subject_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 11. RECOMMENDATIONS
-- ============================================================
DROP TABLE IF EXISTS recommendations;
CREATE TABLE recommendations (
  rec_id     INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,                       -- FK → students.student_id
  subject_id INT NOT NULL,
  message    TEXT NOT NULL,
  rec_type   ENUM('low_score','improve','praise','activity','remind') NOT NULL DEFAULT 'activity',
  is_read    TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(subject_id) ON DELETE CASCADE,
  INDEX idx_student (student_id)
) ENGINE=InnoDB;

-- ============================================================
-- 12. PARENT_NOTIFICATIONS
-- ============================================================
DROP TABLE IF EXISTS parent_notifications;
CREATE TABLE parent_notifications (
  notif_id   INT AUTO_INCREMENT PRIMARY KEY,
  parent_id  INT NOT NULL,                       -- FK → parents.parent_id
  student_id INT NOT NULL,                       -- FK → students.student_id
  ico        VARCHAR(10)  DEFAULT '🔔',
  title      VARCHAR(200) NOT NULL,
  message    TEXT NOT NULL,
  notif_type ENUM('praise','warn','info','suggest','remind') NOT NULL DEFAULT 'info',
  is_read    TINYINT(1)   NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id)  REFERENCES parents(parent_id)   ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  INDEX idx_parent (parent_id),
  INDEX idx_unread (parent_id, is_read)
) ENGINE=InnoDB;

-- ============================================================
-- 13. ACTIVITY_LOG
-- ============================================================
DROP TABLE IF EXISTS activity_log;
CREATE TABLE activity_log (
  log_id     INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,                       -- FK → users.user_id
  action     VARCHAR(100) NOT NULL,
  ref_id     INT DEFAULT NULL,
  ref_type   VARCHAR(50)  DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_user (user_id)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- STORED PROCEDURE — อัปเดต progress cache
-- ============================================================
DROP PROCEDURE IF EXISTS sp_update_progress;
DELIMITER $$
CREATE PROCEDURE sp_update_progress(IN p_student_id INT, IN p_subject_id INT)
BEGIN
  INSERT INTO progress (student_id, subject_id, avg_score, total_plays, last_played)
  SELECT s.student_id, g.subject_id,
         ROUND(AVG(s.score), 2), COUNT(*), MAX(s.played_at)
  FROM scores s JOIN games g ON g.game_id = s.game_id
  WHERE s.student_id = p_student_id AND g.subject_id = p_subject_id
  ON DUPLICATE KEY UPDATE
    avg_score   = VALUES(avg_score),
    total_plays = VALUES(total_plays),
    last_played = VALUES(last_played);
END$$
DELIMITER ;

-- ============================================================
-- VIEWS
-- ============================================================

-- คะแนนพร้อม metadata ทั้งหมด
DROP VIEW IF EXISTS v_scores_full;
CREATE VIEW v_scores_full AS
SELECT
  sc.score_id,
  sc.student_id,
  sc.score, sc.max_score, sc.time_spent, sc.played_at,
  g.game_id, g.name AS game_name, g.game_type, g.level,
  sub.subject_id, sub.name AS subject_name, sub.color AS subject_color,
  u.full_name AS student_name, st.grade
FROM scores sc
JOIN students st  ON st.student_id = sc.student_id
JOIN users    u   ON u.user_id     = st.user_id
JOIN games    g   ON g.game_id     = sc.game_id
JOIN subjects sub ON sub.subject_id = g.subject_id;

-- สถิติครู
DROP VIEW IF EXISTS v_teacher_stats;
CREATE VIEW v_teacher_stats AS
SELECT
  sub.subject_id, sub.name AS subject_name, sub.icon, sub.color,
  COUNT(sc.score_id)              AS total_plays,
  ROUND(AVG(sc.score), 1)         AS avg_score,
  MAX(sc.score)                   AS best_score,
  COUNT(DISTINCT sc.student_id)   AS student_count
FROM subjects sub
LEFT JOIN games   g   ON g.subject_id  = sub.subject_id
LEFT JOIN scores  sc  ON sc.game_id    = g.game_id
GROUP BY sub.subject_id;

-- รายชื่อนักเรียนพร้อมชื่อเต็ม (JOIN บ่อย)
DROP VIEW IF EXISTS v_students_full;
CREATE VIEW v_students_full AS
SELECT
  st.student_id, st.grade, st.parent_phone,
  u.user_id, u.username, u.email, u.full_name, u.is_active
FROM students st
JOIN users u ON u.user_id = st.user_id;

-- รายชื่อผู้ปกครองพร้อมชื่อเต็ม
DROP VIEW IF EXISTS v_parents_full;
CREATE VIEW v_parents_full AS
SELECT
  p.parent_id, p.phone,
  u.user_id, u.username, u.email, u.full_name
FROM parents p
JOIN users u ON u.user_id = p.user_id;

-- ============================================================
-- SEED DATA (password = "1234")
-- ============================================================
SET @h = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

-- 1. ใส่ users ก่อน
INSERT INTO users (username, email, password, role, full_name) VALUES
('student01', 'student01@school.th', @h, 'student', 'ด.ช.สมศักดิ์ เรียนดี'),  -- user_id=1
('student02', 'student02@school.th', @h, 'student', 'ด.ญ.สมหญิง เก่งมาก'),   -- user_id=2
('parent01',  'parent01@school.th',  @h, 'parent',  'นายสมชาย ใจดี'),         -- user_id=3
('parent02',  'parent02@school.th',  @h, 'parent',  'นางสมศรี รักลูก'),       -- user_id=4
('teacher01', 'teacher01@school.th', @h, 'teacher', 'ครูสมใจ รักเด็ก'),       -- user_id=5
('admin',     'admin@kidlearn.local', @h, 'admin',   'ผู้ดูแลระบบ'),            -- user_id=6
('officer01', 'officer01@school.th', @h, 'officer', 'ด.ญ.วารีนา จัดการข้อมูล'), -- user_id=7
('executive01', 'executive01@school.th', @h, 'executive', 'นายสุขสวัสดิ์ ผู้บริหาร'); -- user_id=8
-- หมายเหตุ: รหัสผ่าน admin จะถูกตั้งเป็น 'admin01' โดย init_admin.php
-- รัน: http://localhost:8080/api/init_admin.php หลัง import

-- ตั้งรหัสผ่าน admin01 (hash ของ 'admin01' ด้วย bcrypt cost 10)
-- admin01 hash จะถูกตั้งโดย init_admin.php อัตโนมัติ (ดู docker-compose.yml)
-- หรือรัน: http://localhost:8080/api/init_admin.php
-- หมายเหตุ: ถ้า hash ด้านบนใช้ไม่ได้ ให้รัน http://localhost:8080/api/init_admin.php

-- 2. ใส่ role-specific tables
INSERT INTO students (user_id, grade, parent_phone) VALUES
(1, 'ป.4', '0812345678'),   -- student_id=1
(2, 'ป.5', '0898765432');   -- student_id=2

INSERT INTO parents (user_id, phone) VALUES
(3, '0812345678'),           -- parent_id=1
(4, '0898765432');           -- parent_id=2

INSERT INTO teachers (user_id, department) VALUES
(5, 'กลุ่มสาระหลัก');       -- teacher_id=1

INSERT INTO officers (user_id, department, permissions) VALUES
(7, 'ฝ่ายบุคคล', '{"manage_users":true,"view_reports":true}');  -- officer_id=1

INSERT INTO executives (user_id, title, department, permissions) VALUES
(8, 'ผู้บริหากักเรียน', 'บริหาร', '{"view_all":true,"view_content":true,"view_reports":true}');  -- executive_id=1

-- admin record
INSERT IGNORE INTO admins (user_id, level) VALUES (6, 'super');

INSERT INTO admins (user_id, level) VALUES
(6, 'super');                 -- admin_id=1

-- 3. เชื่อมผู้ปกครอง-นักเรียน
INSERT INTO parent_student (parent_id, student_id) VALUES
(1, 1),  -- parent01 → student01
(2, 2);  -- parent02 → student02

-- 4. วิชา 6 วิชา
INSERT INTO subjects (subject_id, name, description, icon, color, order_no) VALUES
(1,'คณิตศาสตร์', 'ตัวเลข การคำนวณ โจทย์ปัญหา','🔢','#FF9800',1),
(2,'วิทยาศาสตร์','ธรรมชาติ สิ่งแวดล้อม การทดลอง','🔬','#9C27B0',2),
(3,'ภาษาไทย',   'อ่าน เขียน ความรู้ภาษาไทย',    '🇹🇭','#4CAF50',3),
(4,'ภาษาอังกฤษ','คำศัพท์ ไวยากรณ์ สื่อสาร',      '🇬🇧','#2196F3',4),
(5,'ประวัติศาสตร์','เหตุการณ์ บุคคลสำคัญ ยุคสมัย','📜','#795548',5),
(6,'สุขศึกษา',  'สุขภาพ ออกกำลังกาย โภชนาการ',   '💪','#E91E63',6);

-- 5. เกม 36 เกม
INSERT INTO games (game_id,subject_id,name,game_type,level,icon,time_limit) VALUES
(1,1,'บวกลบคล่อง','mcq','easy','➕',60),
(2,1,'จริงหรือเท็จ เลขคณิต','truefalse','easy','✅',60),
(3,1,'เติมสมการ','fill','medium','✏️',90),
(4,1,'จับคู่สัญลักษณ์','matching','easy','🔗',90),
(5,1,'เรียงตัวเลข','sequence','medium','📋',90),
(6,1,'ค้นหาตัวเลข','wordsearch','easy','🔍',120),
(7,2,'โลกและอวกาศ','mcq','easy','🌍',60),
(8,2,'จริงหรือเท็จ วิทย์','truefalse','easy','🧪',60),
(9,2,'เติมคำวิทยาศาสตร์','fill','medium','🔬',90),
(10,2,'จับคู่อาณาจักรสิ่งมีชีวิต','matching','medium','🌿',90),
(11,2,'เรียงวัฏจักรน้ำ','sequence','medium','🌊',90),
(12,2,'ค้นหาคำวิทย์','wordsearch','easy','🔍',120),
(13,3,'คำถามภาษาไทย','mcq','easy','📖',60),
(14,3,'จริงหรือเท็จ ภาษาไทย','truefalse','easy','✔️',60),
(15,3,'เติมคำภาษาไทย','fill','medium','✏️',90),
(16,3,'จับคู่ประเภทคำ','matching','medium','📝',90),
(17,3,'เรียงประโยค','sequence','medium','📋',90),
(18,3,'ค้นหาคำภาษาไทย','wordsearch','easy','🔍',120),
(19,4,'คำศัพท์สัตว์','mcq','easy','🐾',60),
(20,4,'จริงหรือเท็จ English','truefalse','easy','🅰️',60),
(21,4,'เติมคำศัพท์','fill','medium','✏️',90),
(22,4,'จับคู่คำแปล','matching','easy','🔗',90),
(23,4,'เรียง A-Z','sequence','easy','🔤',60),
(24,4,'Word Search','wordsearch','easy','🔍',120),
(25,5,'ถามประวัติศาสตร์','mcq','medium','📜',60),
(26,5,'จริงหรือเท็จ ประวัติ','truefalse','medium','⚔️',60),
(27,5,'เติมคำประวัติศาสตร์','fill','hard','✏️',90),
(28,5,'จับคู่ยุคสมัย','matching','medium','🏛️',90),
(29,5,'เรียงยุคสมัยไทย','sequence','medium','⏳',90),
(30,5,'ค้นหาคำประวัติ','wordsearch','medium','🔍',120),
(31,6,'ถามสุขศึกษา','mcq','easy','💊',60),
(32,6,'จริงหรือเท็จ สุขภาพ','truefalse','easy','🏃',60),
(33,6,'เติมคำสุขภาพ','fill','medium','✏️',90),
(34,6,'จับคู่โภชนาการ','matching','easy','🥗',90),
(35,6,'เรียงขั้นตอน CPR','sequence','hard','❤️',90),
(36,6,'ค้นหาคำสุขภาพ','wordsearch','easy','🔍',120);

-- ============================================================
-- SEED: คำถามและคำตอบ 216 คำถาม จาก 36 เกม
-- ต้อง import หลัง INSERT games
-- ============================================================
INSERT INTO questions (question_id,game_id,question_text,question_img,question_type,hint,order_no,point) VALUES
  (1,1,'15 + 27 = ?',NULL,'text',NULL,1,10),
  (2,1,'56 - 19 = ?',NULL,'text',NULL,2,10),
  (3,1,'8 × 7 = ?',NULL,'text',NULL,3,10),
  (4,1,'81 ÷ 9 = ?',NULL,'text',NULL,4,10),
  (5,1,'(4 + 6) × 3 = ?',NULL,'text',NULL,5,10),
  (6,1,'100 - 47 = ?',NULL,'text',NULL,6,10),
  (7,7,'ดาวเคราะห์ที่อยู่ใกล้ดวงอาทิตย์ที่สุดคือ?',NULL,'text',NULL,1,10),
  (8,7,'ดวงจันทร์โคจรรอบ?',NULL,'text',NULL,2,10),
  (9,7,'สิ่งมีชีวิตใช้ก๊าซใดในการหายใจ?',NULL,'text',NULL,3,10),
  (10,7,'น้ำแข็งละลายเป็นน้ำเรียกว่า?',NULL,'text',NULL,4,10),
  (11,7,'เซลล์พืชแต่ต่างจากเซลล์สัตว์คือมี?',NULL,'text',NULL,5,10),
  (12,7,'การสังเคราะห์แสงเกิดขึ้นใน?',NULL,'text',NULL,6,10),
  (13,13,'ประเทศไทยมีกี่จังหวัด?',NULL,'text',NULL,1,10),
  (14,13,'ดอกไม้ประจำชาติไทยคืออะไร?',NULL,'text',NULL,2,10),
  (15,13,'ภาษาไทยมีพยัญชนะกี่ตัว?',NULL,'text',NULL,3,10),
  (16,13,'วันภาษาไทยแห่งชาติตรงกับวันที่?',NULL,'text',NULL,4,10),
  (17,13,'"สุนัข" ภาษาราชการเรียกว่าอะไร?',NULL,'text',NULL,5,10),
  (18,13,'คำว่า "ประชาธิปไตย" มีกี่พยางค์?',NULL,'text',NULL,6,10),
  (19,19,'🐶 Dog คืออะไร?',NULL,'text',NULL,1,10),
  (20,19,'🐘 Elephant คืออะไร?',NULL,'text',NULL,2,10),
  (21,19,'🦁 Lion คืออะไร?',NULL,'text',NULL,3,10),
  (22,19,'🐟 Fish คืออะไร?',NULL,'text',NULL,4,10),
  (23,19,'🐦 Bird คืออะไร?',NULL,'text',NULL,5,10),
  (24,19,'🐇 Rabbit คืออะไร?',NULL,'text',NULL,6,10),
  (25,25,'กรุงสุโขทัยถูกสถาปนาในปี พ.ศ. ใด?',NULL,'text',NULL,1,10),
  (26,25,'พ่อขุนรามคำแหงทรงประดิษฐ์สิ่งใด?',NULL,'text',NULL,2,10),
  (27,25,'กรุงศรีอยุธยาเป็นเมืองหลวงของไทยกี่ปี?',NULL,'text',NULL,3,10),
  (28,25,'ไทยเปลี่ยนการปกครองเป็นระบอบประชาธิปไตยปี?',NULL,'text',NULL,4,10),
  (29,25,'รัชกาลที่ 1 ทรงสถาปนากรุงใด?',NULL,'text',NULL,5,10),
  (30,25,'วันชาติไทยตรงกับวันที่?',NULL,'text',NULL,6,10),
  (31,31,'ควรนอนหลับวันละกี่ชั่วโมง (เด็ก)?',NULL,'text',NULL,1,10),
  (32,31,'อาหารประเภทใดให้พลังงานมากที่สุด?',NULL,'text',NULL,2,10),
  (33,31,'การออกกำลังกายควรทำสัปดาห์ละกี่วัน?',NULL,'text',NULL,3,10),
  (34,31,'วิตามินซีพบมากในอาหารใด?',NULL,'text',NULL,4,10),
  (35,31,'อวัยวะใดที่ทำหน้าที่กรองเลือด?',NULL,'text',NULL,5,10),
  (36,31,'BMI ย่อมาจากอะไร?',NULL,'text',NULL,6,10),
  (37,2,'7 × 8 = 56',NULL,'text',NULL,1,10),
  (38,2,'12 + 13 = 26',NULL,'text',NULL,2,10),
  (39,2,'100 ÷ 5 = 20',NULL,'text',NULL,3,10),
  (40,2,'จำนวนคู่คือ 2, 4, 6, 8, 10',NULL,'text',NULL,4,10),
  (41,2,'15 เป็นจำนวนเฉพาะ',NULL,'text',NULL,5,10),
  (42,2,'0.5 = 1/2',NULL,'text',NULL,6,10),
  (43,8,'☀️ ดวงอาทิตย์เป็นดาวเคราะห์',NULL,'text',NULL,1,10),
  (44,8,'💧 สูตรเคมีของน้ำคือ H₂O',NULL,'text',NULL,2,10),
  (45,8,'🌱 พืชสังเคราะห์แสงโดยใช้แสงอาทิตย์',NULL,'text',NULL,3,10),
  (46,8,'🔴 เลือดมีสีแดงเพราะมีฮีโมโกลบิน',NULL,'text',NULL,4,10),
  (47,8,'🌕 ดวงจันทร์ออกแสงสว่างเองได้',NULL,'text',NULL,5,10),
  (48,8,'⚡ ฟ้าผ่าคือการปล่อยประจุไฟฟ้า',NULL,'text',NULL,6,10),
  (49,14,'ภาษาไทยมีวรรณยุกต์ 5 รูป 4 เสียง',NULL,'text',NULL,1,10),
  (50,14,'พระบิดาแห่งภาษาไทยคือรัชกาลที่ 9',NULL,'text',NULL,2,10),
  (51,14,'คำว่า "รัก" เป็นคำกริยา',NULL,'text',NULL,3,10),
  (52,14,'ไตรยางศ์มี 3 หมู่ คือ สูง กลาง ต่ำ',NULL,'text',NULL,4,10),
  (53,14,'อักษรสูงมี 12 ตัว',NULL,'text',NULL,5,10),
  (54,14,'"กา" และ "ก้า" ออกเสียงต่างกันด้วยวรรณยุกต์',NULL,'text',NULL,6,10),
  (55,20,'"Apple" หมายถึง ส้ม',NULL,'text',NULL,1,10),
  (56,20,'"Monday" เป็นวันแรกของสัปดาห์',NULL,'text',NULL,2,10),
  (57,20,'"Red" หมายถึง สีแดง',NULL,'text',NULL,3,10),
  (58,20,'"Book" เป็น verb (กริยา)',NULL,'text',NULL,4,10),
  (59,20,'"Happy" หมายถึง เศร้า',NULL,'text',NULL,5,10),
  (60,20,'"12 months = 1 year" is correct',NULL,'text',NULL,6,10),
  (61,26,'กรุงสุโขทัยเป็นราชธานีแรกของไทย',NULL,'text',NULL,1,10),
  (62,26,'สมเด็จพระนเรศวรทรงกอบกู้เอกราชจากพม่า',NULL,'text',NULL,2,10),
  (63,26,'กรุงรัตนโกสินทร์สถาปนาในปี พ.ศ.2310',NULL,'text',NULL,3,10),
  (64,26,'รัชกาลที่ 5 ทรงยกเลิกทาสในไทย',NULL,'text',NULL,4,10),
  (65,26,'ไทยเคยตกเป็นเมืองขึ้นของอังกฤษ',NULL,'text',NULL,5,10),
  (66,26,'วันปิยมหาราชตรงกับวันที่ 23 ตุลาคม',NULL,'text',NULL,6,10),
  (67,32,'🏃 การวิ่งช่วยให้หัวใจแข็งแรง',NULL,'text',NULL,1,10),
  (68,32,'🍬 น้ำตาลมากเกินไปทำให้ฟันผุ',NULL,'text',NULL,2,10),
  (69,32,'😴 การนอนน้อยไม่มีผลต่อสุขภาพ',NULL,'text',NULL,3,10),
  (70,32,'🥦 ผักใบเขียวมีวิตามินและแร่ธาตุสูง',NULL,'text',NULL,4,10),
  (71,32,'💧 ควรดื่มน้ำอย่างน้อย 2 ลิตรต่อวัน',NULL,'text',NULL,5,10),
  (72,32,'🚬 การสูบบุหรี่ไม่มีโทษต่อสุขภาพ',NULL,'text',NULL,6,10),
  (73,3,'___ + 15 = 30',NULL,'text','30 - 15',1,10),
  (74,3,'7 × ___ = 63',NULL,'text','63 ÷ 7',2,10),
  (75,3,'พื้นที่สี่เหลี่ยม กว้าง 5 ยาว 8 = ___',NULL,'text','กว้าง×ยาว',3,10),
  (76,3,'0.25 = ___/100',NULL,'text','0.25 × 100',4,10),
  (77,3,'ครึ่งของ 64 คือ ___',NULL,'text','64 ÷ 2',5,10),
  (78,3,'3² + 4² = ___²  (ทฤษฎีพีทาโกรัส)',NULL,'text','9+16=25',6,10),
  (79,9,'ก๊าซที่พืชปล่อยออกมาในระหว่างสังเคราะห์แสงคือ',NULL,'text','สิ่งที่เราหายใจ',1,10),
  (80,9,'สัตว์ที่มีกระดูกสันหลังเรียกว่า?',NULL,'text','Vertebrate',2,10),
  (81,9,'หน่วยพื้นฐานของสิ่งมีชีวิตคือ',NULL,'text','Cell',3,10),
  (82,9,'แรงดึงดูดของโลกที่ดึงวัตถุลงคือ',NULL,'text','Gravity',4,10),
  (83,9,'อุณหภูมิที่น้ำเดือดในหน่วย °C คือ',NULL,'text','100',5,10),
  (84,9,'ธาตุที่เบาที่สุดในตารางธาตุคือ',NULL,'text','H',6,10),
  (85,15,'ดิฉัน_____ไปโรงเรียนทุกวัน (กริยา)',NULL,'text','การเดินทาง',1,10),
  (86,15,'นกมีปีก สุนัขมี___',NULL,'text','ขา 4 ข้าง',2,10),
  (87,15,'"สวรรค์" อ่านว่า',NULL,'text','ออกเสียง สะ-วัน',3,10),
  (88,15,'คำว่า "เขียว" เป็นคำ_____',NULL,'text','บอกลักษณะ',4,10),
  (89,15,'วลีที่มีความหมายว่า "ขยัน" คือ',NULL,'text','มดหรือผึ้ง',5,10),
  (90,15,'ประโยค "แมวกินปลา" มีประธานคือ',NULL,'text','ใครทำอะไร',6,10),
  (91,21,'I ___ a student. (to be)',NULL,'text','am / is / are',1,10),
  (92,21,'She ___ to school everyday.',NULL,'text','go / goes / gone',2,10),
  (93,21,'The color of the sky is ___.',NULL,'text','สีท้องฟ้า',3,10),
  (94,21,'1+1 = ___ (in English)',NULL,'text','สอง',4,10),
  (95,21,'"สุนัข" in English is ___.',NULL,'text','man''s best friend',5,10),
  (96,21,'Opposite of "big" is ___.',NULL,'text','ตรงข้ามกับใหญ่',6,10),
  (97,27,'พ่อขุนรามคำแหงเป็นกษัตริย์ราชวงศ์?',NULL,'text','ผู้ก่อตั้งสุโขทัย',1,10),
  (98,27,'กรุงศรีอยุธยาเสียครั้งที่ 2 ปี พ.ศ.___',NULL,'text','ปีที่ถูกพม่าตี ครั้งสุดท้าย',2,10),
  (99,27,'รัชกาลที่ 4 ทรงพระนามว่า___',NULL,'text','มงกุฎ',3,10),
  (100,27,'วันฉัตรมงคลตรงกับวันที่ ___ พฤษภาคม',NULL,'text','ต้นเดือน',4,10),
  (101,27,'ประเทศไทยมีพระมหากษัตริย์รัชกาลที่ ___ ปัจจุบัน',NULL,'text','10',5,10),
  (102,27,'สนธิสัญญาเบาว์ริ่งทำกับประเทศ?',NULL,'text','ชาติตะวันตก',6,10),
  (103,33,'อาหาร 5 หมู่ หมู่ที่ 1 คือ',NULL,'text','เนื้อสัตว์ ไข่ นม',1,10),
  (104,33,'หัวใจสูบฉีดเลือดไปทั่วร่างกายโดยใช้___',NULL,'text','อวัยวะกลางอก',2,10),
  (105,33,'อุณหภูมิร่างกายปกติประมาณ ___ °C',NULL,'text','36-37',3,10),
  (106,33,'การล้างมือด้วย___ ช่วยฆ่าเชื้อโรคได้ดี',NULL,'text','ของเหลวทำความสะอาด',4,10),
  (107,33,'การยืดเหยียดก่อนออกกำลังกายเรียกว่า',NULL,'text','Warm up',5,10),
  (108,33,'เด็กอายุ 6-12 ปีควรดื่มนมวันละ ___ แก้ว',NULL,'text','2-3',6,10),
  (109,4,'บวก → +',NULL,'pair',NULL,1,10),
  (110,4,'ลบ → -',NULL,'pair',NULL,2,10),
  (111,4,'คูณ → ×',NULL,'pair',NULL,3,10),
  (112,4,'หาร → ÷',NULL,'pair',NULL,4,10),
  (113,4,'เท่ากับ → =',NULL,'pair',NULL,5,10),
  (114,4,'ไม่เท่ากับ → ≠',NULL,'pair',NULL,6,10),
  (115,10,'🌳 ต้นไม้ → Plantae',NULL,'pair',NULL,1,10),
  (116,10,'🐶 สุนัข → Animalia',NULL,'pair',NULL,2,10),
  (117,10,'🍄 เห็ด → Fungi',NULL,'pair',NULL,3,10),
  (118,10,'🦠 แบคทีเรีย → Monera',NULL,'pair',NULL,4,10),
  (119,10,'🟢 สาหร่าย → Protista',NULL,'pair',NULL,5,10),
  (120,10,'🧫 ยีสต์ → Fungi',NULL,'pair',NULL,6,10),
  (121,16,'วิ่ง → คำกริยา',NULL,'pair',NULL,1,10),
  (122,16,'สวย → คำวิเศษณ์',NULL,'pair',NULL,2,10),
  (123,16,'โต๊ะ → คำนาม',NULL,'pair',NULL,3,10),
  (124,16,'และ → คำสันธาน',NULL,'pair',NULL,4,10),
  (125,16,'ใน → คำบุพบท',NULL,'pair',NULL,5,10),
  (126,16,'โอ้โห → คำอุทาน',NULL,'pair',NULL,6,10),
  (127,22,'🍎 Apple → แอปเปิ้ล',NULL,'pair',NULL,1,10),
  (128,22,'📚 Book → หนังสือ',NULL,'pair',NULL,2,10),
  (129,22,'🌟 Star → ดาว',NULL,'pair',NULL,3,10),
  (130,22,'🏠 House → บ้าน',NULL,'pair',NULL,4,10),
  (131,22,'🌈 Rainbow → รุ้งกินน้ำ',NULL,'pair',NULL,5,10),
  (132,22,'🎵 Music → ดนตรี',NULL,'pair',NULL,6,10),
  (133,28,'สุโขทัย → พ่อขุนรามคำแหง',NULL,'pair',NULL,1,10),
  (134,28,'อยุธยา → สมเด็จพระนเรศวร',NULL,'pair',NULL,2,10),
  (135,28,'ธนบุรี → สมเด็จพระเจ้าตากสิน',NULL,'pair',NULL,3,10),
  (136,28,'รัตนโกสินทร์ตอนต้น → รัชกาลที่ 1',NULL,'pair',NULL,4,10),
  (137,28,'รัชกาลที่ 5 → ปฏิรูปประเทศ',NULL,'pair',NULL,5,10),
  (138,28,'พ.ศ.2475 → เปลี่ยนการปกครอง',NULL,'pair',NULL,6,10),
  (139,34,'🥩 เนื้อสัตว์ → โปรตีน',NULL,'pair',NULL,1,10),
  (140,34,'🍚 ข้าว → คาร์โบไฮเดรต',NULL,'pair',NULL,2,10),
  (141,34,'🥑 อาโวคาโด → ไขมันดี',NULL,'pair',NULL,3,10),
  (142,34,'🥦 บรอกโคลี → วิตามิน',NULL,'pair',NULL,4,10),
  (143,34,'🦴 นม → แคลเซียม',NULL,'pair',NULL,5,10),
  (144,34,'🍊 ส้ม → วิตามินซี',NULL,'pair',NULL,6,10),
  (145,5,'½ (0.5)',NULL,'item',NULL,1,10),
  (146,5,'¾ (0.75)',NULL,'item',NULL,2,10),
  (147,5,'1',NULL,'item',NULL,3,10),
  (148,5,'1.5',NULL,'item',NULL,4,10),
  (149,5,'2',NULL,'item',NULL,5,10),
  (150,5,'3',NULL,'item',NULL,6,10),
  (151,11,'☀️ การระเหย (Evaporation)',NULL,'item',NULL,1,10),
  (152,11,'☁️ การก่อตัวของเมฆ',NULL,'item',NULL,2,10),
  (153,11,'🌧️ ฝนตก (Precipitation)',NULL,'item',NULL,3,10),
  (154,11,'🏔️ น้ำไหลลงสู่แม่น้ำ',NULL,'item',NULL,4,10),
  (155,11,'🌊 น้ำสะสมในทะเล/แหล่งน้ำ',NULL,'item',NULL,5,10),
  (156,11,'🔄 วัฏจักรเริ่มใหม่',NULL,'item',NULL,6,10),
  (157,17,'📌 ประธาน (Subject)',NULL,'item',NULL,1,10),
  (158,17,'🏃 กริยา (Verb)',NULL,'item',NULL,2,10),
  (159,17,'🎯 กรรม (Object)',NULL,'item',NULL,3,10),
  (160,17,'📍 ส่วนขยาย (Modifier)',NULL,'item',NULL,4,10),
  (161,17,'❓ คำถาม (Question word)',NULL,'item',NULL,5,10),
  (162,17,'🔚 เครื่องหมายวรรคตอน',NULL,'item',NULL,6,10),
  (163,23,'🔵 Blue',NULL,'item',NULL,1,10),
  (164,23,'🟢 Green',NULL,'item',NULL,2,10),
  (165,23,'🟠 Orange',NULL,'item',NULL,3,10),
  (166,23,'🔴 Red',NULL,'item',NULL,4,10),
  (167,23,'🌸 Rose',NULL,'item',NULL,5,10),
  (168,23,'🟡 Yellow',NULL,'item',NULL,6,10),
  (169,29,'🏯 สมัยสุโขทัย (ราวพ.ศ.1800)',NULL,'item',NULL,1,10),
  (170,29,'⚔️ สมัยอยุธยา (พ.ศ.1893-2310)',NULL,'item',NULL,2,10),
  (171,29,'🏰 สมัยธนบุรี (พ.ศ.2310-2325)',NULL,'item',NULL,3,10),
  (172,29,'👑 สมัยรัตนโกสินทร์ (พ.ศ.2325-)',NULL,'item',NULL,4,10),
  (173,29,'🗳️ ประชาธิปไตย (พ.ศ.2475)',NULL,'item',NULL,5,10),
  (174,29,'🇹🇭 ยุคปัจจุบัน',NULL,'item',NULL,6,10),
  (175,35,'📞 โทรเรียกรถพยาบาล 1669',NULL,'item',NULL,1,10),
  (176,35,'🧍 ตรวจสอบความปลอดภัยของสถานที่',NULL,'item',NULL,2,10),
  (177,35,'👐 เริ่มกดหน้าอก 30 ครั้ง',NULL,'item',NULL,3,10),
  (178,35,'👄 เป่าลมเข้าปาก 2 ครั้ง',NULL,'item',NULL,4,10),
  (179,35,'🔄 ทำซ้ำ 30:2 จนกว่ารถพยาบาลจะมา',NULL,'item',NULL,5,10),
  (180,35,'✅ ส่งต่อให้ทีมแพทย์',NULL,'item',NULL,6,10),
  (181,6,'บวก',NULL,'word',NULL,1,10),
  (182,6,'ลบ',NULL,'word',NULL,2,10),
  (183,6,'คูณ',NULL,'word',NULL,3,10),
  (184,6,'หาร',NULL,'word',NULL,4,10),
  (185,6,'เลข',NULL,'word',NULL,5,10),
  (186,6,'จำนวน',NULL,'word',NULL,6,10),
  (187,12,'เซลล์',NULL,'word',NULL,1,10),
  (188,12,'แสง',NULL,'word',NULL,2,10),
  (189,12,'น้ำ',NULL,'word',NULL,3,10),
  (190,12,'ดิน',NULL,'word',NULL,4,10),
  (191,12,'อากาศ',NULL,'word',NULL,5,10),
  (192,12,'พลังงาน',NULL,'word',NULL,6,10),
  (193,18,'กิน',NULL,'word',NULL,1,10),
  (194,18,'นอน',NULL,'word',NULL,2,10),
  (195,18,'วิ่ง',NULL,'word',NULL,3,10),
  (196,18,'เล่น',NULL,'word',NULL,4,10),
  (197,18,'เรียน',NULL,'word',NULL,5,10),
  (198,18,'อ่าน',NULL,'word',NULL,6,10),
  (199,24,'cat',NULL,'word',NULL,1,10),
  (200,24,'dog',NULL,'word',NULL,2,10),
  (201,24,'fish',NULL,'word',NULL,3,10),
  (202,24,'bird',NULL,'word',NULL,4,10),
  (203,24,'book',NULL,'word',NULL,5,10),
  (204,24,'pen',NULL,'word',NULL,6,10),
  (205,30,'ไทย',NULL,'word',NULL,1,10),
  (206,30,'กษัตริย์',NULL,'word',NULL,2,10),
  (207,30,'ราชวงศ์',NULL,'word',NULL,3,10),
  (208,30,'อยุธยา',NULL,'word',NULL,4,10),
  (209,30,'ประวัติ',NULL,'word',NULL,5,10),
  (210,30,'ชาติ',NULL,'word',NULL,6,10),
  (211,36,'วิ่ง',NULL,'word',NULL,1,10),
  (212,36,'นอน',NULL,'word',NULL,2,10),
  (213,36,'อาหาร',NULL,'word',NULL,3,10),
  (214,36,'น้ำ',NULL,'word',NULL,4,10),
  (215,36,'สุขภาพ',NULL,'word',NULL,5,10),
  (216,36,'ออกกำลัง',NULL,'word',NULL,6,10);

INSERT INTO answers (question_id,answer_text,is_correct,pair_left,pair_right,seq_order) VALUES
  (1,'40',0,NULL,NULL,NULL),
  (1,'42',1,NULL,NULL,NULL),
  (1,'41',0,NULL,NULL,NULL),
  (1,'43',0,NULL,NULL,NULL),
  (2,'37',1,NULL,NULL,NULL),
  (2,'35',0,NULL,NULL,NULL),
  (2,'38',0,NULL,NULL,NULL),
  (2,'36',0,NULL,NULL,NULL),
  (3,'54',0,NULL,NULL,NULL),
  (3,'56',1,NULL,NULL,NULL),
  (3,'58',0,NULL,NULL,NULL),
  (3,'52',0,NULL,NULL,NULL),
  (4,'8',0,NULL,NULL,NULL),
  (4,'9',1,NULL,NULL,NULL),
  (4,'7',0,NULL,NULL,NULL),
  (4,'10',0,NULL,NULL,NULL),
  (5,'30',1,NULL,NULL,NULL),
  (5,'28',0,NULL,NULL,NULL),
  (5,'32',0,NULL,NULL,NULL),
  (5,'24',0,NULL,NULL,NULL),
  (6,'53',1,NULL,NULL,NULL),
  (6,'55',0,NULL,NULL,NULL),
  (6,'57',0,NULL,NULL,NULL),
  (6,'51',0,NULL,NULL,NULL),
  (7,'ดาวศุกร์',0,NULL,NULL,NULL),
  (7,'ดาวพุธ',1,NULL,NULL,NULL),
  (7,'โลก',0,NULL,NULL,NULL),
  (7,'ดาวอังคาร',0,NULL,NULL,NULL),
  (8,'ดวงอาทิตย์',0,NULL,NULL,NULL),
  (8,'โลก',1,NULL,NULL,NULL),
  (8,'ดาวอังคาร',0,NULL,NULL,NULL),
  (8,'ดาวพฤหัส',0,NULL,NULL,NULL),
  (9,'CO₂',0,NULL,NULL,NULL),
  (9,'N₂',0,NULL,NULL,NULL),
  (9,'O₂',1,NULL,NULL,NULL),
  (9,'H₂',0,NULL,NULL,NULL),
  (10,'การระเหย',0,NULL,NULL,NULL),
  (10,'การหลอมเหลว',1,NULL,NULL,NULL),
  (10,'การควบแน่น',0,NULL,NULL,NULL),
  (10,'การแข็งตัว',0,NULL,NULL,NULL),
  (11,'นิวเคลียส',0,NULL,NULL,NULL),
  (11,'เยื่อหุ้มเซลล์',0,NULL,NULL,NULL),
  (11,'ผนังเซลล์',1,NULL,NULL,NULL),
  (11,'ไซโตพลาซึม',0,NULL,NULL,NULL),
  (12,'ราก',0,NULL,NULL,NULL),
  (12,'ลำต้น',0,NULL,NULL,NULL),
  (12,'ใบ',1,NULL,NULL,NULL),
  (12,'ดอก',0,NULL,NULL,NULL),
  (13,'75',0,NULL,NULL,NULL),
  (13,'76',0,NULL,NULL,NULL),
  (13,'77',1,NULL,NULL,NULL),
  (13,'78',0,NULL,NULL,NULL),
  (14,'กล้วยไม้',0,NULL,NULL,NULL),
  (14,'ดอกบัว',0,NULL,NULL,NULL),
  (14,'ราชพฤกษ์',1,NULL,NULL,NULL),
  (14,'มะลิ',0,NULL,NULL,NULL),
  (15,'42',0,NULL,NULL,NULL),
  (15,'44',1,NULL,NULL,NULL),
  (15,'44',0,NULL,NULL,NULL),
  (15,'46',0,NULL,NULL,NULL),
  (16,'29 ก.ค.',1,NULL,NULL,NULL),
  (16,'23 ก.ย.',0,NULL,NULL,NULL),
  (16,'5 ธ.ค.',0,NULL,NULL,NULL),
  (16,'1 ม.ค.',0,NULL,NULL,NULL),
  (17,'แมว',0,NULL,NULL,NULL),
  (17,'โค',0,NULL,NULL,NULL),
  (17,'หมา',1,NULL,NULL,NULL),
  (17,'กวาง',0,NULL,NULL,NULL),
  (18,'5',0,NULL,NULL,NULL),
  (18,'6',1,NULL,NULL,NULL),
  (18,'7',0,NULL,NULL,NULL),
  (18,'4',0,NULL,NULL,NULL),
  (19,'แมว',0,NULL,NULL,NULL),
  (19,'สุนัข',1,NULL,NULL,NULL),
  (19,'กระต่าย',0,NULL,NULL,NULL),
  (19,'หมู',0,NULL,NULL,NULL),
  (20,'เสือ',0,NULL,NULL,NULL),
  (20,'สิงโต',0,NULL,NULL,NULL),
  (20,'ช้าง',1,NULL,NULL,NULL),
  (20,'ยีราฟ',0,NULL,NULL,NULL),
  (21,'เสือ',0,NULL,NULL,NULL),
  (21,'สิงโต',1,NULL,NULL,NULL),
  (21,'หมี',0,NULL,NULL,NULL),
  (21,'หมาป่า',0,NULL,NULL,NULL),
  (22,'นก',0,NULL,NULL,NULL),
  (22,'งู',0,NULL,NULL,NULL),
  (22,'ปลา',1,NULL,NULL,NULL),
  (22,'กบ',0,NULL,NULL,NULL),
  (23,'ผึ้ง',0,NULL,NULL,NULL),
  (23,'แมลง',0,NULL,NULL,NULL),
  (23,'นก',1,NULL,NULL,NULL),
  (23,'ผีเสื้อ',0,NULL,NULL,NULL),
  (24,'กระแต',0,NULL,NULL,NULL),
  (24,'กระต่าย',1,NULL,NULL,NULL),
  (24,'กระรอก',0,NULL,NULL,NULL),
  (24,'หนู',0,NULL,NULL,NULL),
  (25,'พ.ศ.1800',1,NULL,NULL,NULL),
  (25,'พ.ศ.1893',0,NULL,NULL,NULL),
  (25,'พ.ศ.1762',0,NULL,NULL,NULL),
  (25,'พ.ศ.2310',0,NULL,NULL,NULL),
  (26,'เงินตรา',0,NULL,NULL,NULL),
  (26,'ตัวอักษรไทย',1,NULL,NULL,NULL),
  (26,'ระบบชลประทาน',0,NULL,NULL,NULL),
  (26,'กฎหมาย',0,NULL,NULL,NULL),
  (27,'400',0,NULL,NULL,NULL),
  (27,'417',1,NULL,NULL,NULL),
  (27,'350',0,NULL,NULL,NULL),
  (27,'450',0,NULL,NULL,NULL),
  (28,'พ.ศ.2475',1,NULL,NULL,NULL),
  (28,'พ.ศ.2500',0,NULL,NULL,NULL),
  (28,'พ.ศ.2490',0,NULL,NULL,NULL),
  (28,'พ.ศ.2460',0,NULL,NULL,NULL),
  (29,'กรุงธนบุรี',0,NULL,NULL,NULL),
  (29,'กรุงเทพฯ',1,NULL,NULL,NULL),
  (29,'กรุงศรีอยุธยา',0,NULL,NULL,NULL),
  (29,'กรุงสุโขทัย',0,NULL,NULL,NULL),
  (30,'5 ธ.ค.',0,NULL,NULL,NULL),
  (30,'28 ก.ค.',1,NULL,NULL,NULL),
  (30,'23 ต.ค.',0,NULL,NULL,NULL),
  (30,'5 พ.ค.',0,NULL,NULL,NULL),
  (31,'6',0,NULL,NULL,NULL),
  (31,'7',0,NULL,NULL,NULL),
  (31,'8-10',1,NULL,NULL,NULL),
  (31,'5',0,NULL,NULL,NULL),
  (32,'โปรตีน',0,NULL,NULL,NULL),
  (32,'ไขมัน',0,NULL,NULL,NULL),
  (32,'คาร์โบไฮเดรต',1,NULL,NULL,NULL),
  (32,'วิตามิน',0,NULL,NULL,NULL),
  (33,'1',0,NULL,NULL,NULL),
  (33,'2',0,NULL,NULL,NULL),
  (33,'3-5',1,NULL,NULL,NULL),
  (33,'7',0,NULL,NULL,NULL),
  (34,'เนื้อสัตว์',0,NULL,NULL,NULL),
  (34,'ส้ม',1,NULL,NULL,NULL),
  (34,'ข้าว',0,NULL,NULL,NULL),
  (34,'นม',0,NULL,NULL,NULL),
  (35,'หัวใจ',0,NULL,NULL,NULL),
  (35,'ปอด',0,NULL,NULL,NULL),
  (35,'ไต',1,NULL,NULL,NULL),
  (35,'ตับ',0,NULL,NULL,NULL),
  (36,'Body Mass Index',1,NULL,NULL,NULL),
  (36,'Brain Mind Indicator',0,NULL,NULL,NULL),
  (36,'Blood Metabolism Index',0,NULL,NULL,NULL),
  (36,'Body Muscle Index',0,NULL,NULL,NULL),
  (37,'ถูก',1,NULL,NULL,NULL),
  (37,'ผิด',0,NULL,NULL,NULL),
  (38,'ถูก',0,NULL,NULL,NULL),
  (38,'ผิด',1,NULL,NULL,NULL),
  (39,'ถูก',1,NULL,NULL,NULL),
  (39,'ผิด',0,NULL,NULL,NULL),
  (40,'ถูก',1,NULL,NULL,NULL),
  (40,'ผิด',0,NULL,NULL,NULL),
  (41,'ถูก',0,NULL,NULL,NULL),
  (41,'ผิด',1,NULL,NULL,NULL),
  (42,'ถูก',1,NULL,NULL,NULL),
  (42,'ผิด',0,NULL,NULL,NULL),
  (43,'ถูก',0,NULL,NULL,NULL),
  (43,'ผิด',1,NULL,NULL,NULL),
  (44,'ถูก',1,NULL,NULL,NULL),
  (44,'ผิด',0,NULL,NULL,NULL),
  (45,'ถูก',1,NULL,NULL,NULL),
  (45,'ผิด',0,NULL,NULL,NULL),
  (46,'ถูก',1,NULL,NULL,NULL),
  (46,'ผิด',0,NULL,NULL,NULL),
  (47,'ถูก',0,NULL,NULL,NULL),
  (47,'ผิด',1,NULL,NULL,NULL),
  (48,'ถูก',1,NULL,NULL,NULL),
  (48,'ผิด',0,NULL,NULL,NULL),
  (49,'ถูก',0,NULL,NULL,NULL),
  (49,'ผิด',1,NULL,NULL,NULL),
  (50,'ถูก',1,NULL,NULL,NULL),
  (50,'ผิด',0,NULL,NULL,NULL),
  (51,'ถูก',1,NULL,NULL,NULL),
  (51,'ผิด',0,NULL,NULL,NULL),
  (52,'ถูก',1,NULL,NULL,NULL),
  (52,'ผิด',0,NULL,NULL,NULL),
  (53,'ถูก',0,NULL,NULL,NULL),
  (53,'ผิด',1,NULL,NULL,NULL),
  (54,'ถูก',1,NULL,NULL,NULL),
  (54,'ผิด',0,NULL,NULL,NULL),
  (55,'ถูก',0,NULL,NULL,NULL),
  (55,'ผิด',1,NULL,NULL,NULL),
  (56,'ถูก',1,NULL,NULL,NULL),
  (56,'ผิด',0,NULL,NULL,NULL),
  (57,'ถูก',1,NULL,NULL,NULL),
  (57,'ผิด',0,NULL,NULL,NULL),
  (58,'ถูก',0,NULL,NULL,NULL),
  (58,'ผิด',1,NULL,NULL,NULL),
  (59,'ถูก',0,NULL,NULL,NULL),
  (59,'ผิด',1,NULL,NULL,NULL),
  (60,'ถูก',1,NULL,NULL,NULL),
  (60,'ผิด',0,NULL,NULL,NULL),
  (61,'ถูก',1,NULL,NULL,NULL),
  (61,'ผิด',0,NULL,NULL,NULL),
  (62,'ถูก',1,NULL,NULL,NULL),
  (62,'ผิด',0,NULL,NULL,NULL),
  (63,'ถูก',0,NULL,NULL,NULL),
  (63,'ผิด',1,NULL,NULL,NULL),
  (64,'ถูก',1,NULL,NULL,NULL),
  (64,'ผิด',0,NULL,NULL,NULL),
  (65,'ถูก',0,NULL,NULL,NULL),
  (65,'ผิด',1,NULL,NULL,NULL),
  (66,'ถูก',1,NULL,NULL,NULL),
  (66,'ผิด',0,NULL,NULL,NULL),
  (67,'ถูก',1,NULL,NULL,NULL),
  (67,'ผิด',0,NULL,NULL,NULL),
  (68,'ถูก',1,NULL,NULL,NULL),
  (68,'ผิด',0,NULL,NULL,NULL),
  (69,'ถูก',0,NULL,NULL,NULL),
  (69,'ผิด',1,NULL,NULL,NULL),
  (70,'ถูก',1,NULL,NULL,NULL),
  (70,'ผิด',0,NULL,NULL,NULL),
  (71,'ถูก',1,NULL,NULL,NULL),
  (71,'ผิด',0,NULL,NULL,NULL),
  (72,'ถูก',0,NULL,NULL,NULL),
  (72,'ผิด',1,NULL,NULL,NULL),
  (73,'15',1,NULL,NULL,NULL),
  (74,'9',1,NULL,NULL,NULL),
  (75,'40',1,NULL,NULL,NULL),
  (76,'25',1,NULL,NULL,NULL),
  (77,'32',1,NULL,NULL,NULL),
  (78,'5',1,NULL,NULL,NULL),
  (79,'ออกซิเจน',1,NULL,NULL,NULL),
  (80,'สัตว์มีกระดูกสันหลัง',1,NULL,NULL,NULL),
  (81,'เซลล์',1,NULL,NULL,NULL),
  (82,'แรงโน้มถ่วง',1,NULL,NULL,NULL),
  (83,'100',1,NULL,NULL,NULL),
  (84,'ไฮโดรเจน',1,NULL,NULL,NULL),
  (85,'ไป',1,NULL,NULL,NULL),
  (86,'ขา',1,NULL,NULL,NULL),
  (87,'สะหวัน',1,NULL,NULL,NULL),
  (88,'วิเศษณ์',1,NULL,NULL,NULL),
  (89,'ขยันเหมือนมด',1,NULL,NULL,NULL),
  (90,'แมว',1,NULL,NULL,NULL),
  (91,'am',1,NULL,NULL,NULL),
  (92,'goes',1,NULL,NULL,NULL),
  (93,'blue',1,NULL,NULL,NULL),
  (94,'two',1,NULL,NULL,NULL),
  (95,'dog',1,NULL,NULL,NULL),
  (96,'small',1,NULL,NULL,NULL),
  (97,'ศรีนาวนำถุม',1,NULL,NULL,NULL),
  (98,'2310',1,NULL,NULL,NULL),
  (99,'พระจอมเกล้าเจ้าอยู่หัว',1,NULL,NULL,NULL),
  (100,'4',1,NULL,NULL,NULL),
  (101,'10',1,NULL,NULL,NULL),
  (102,'อังกฤษ',1,NULL,NULL,NULL),
  (103,'โปรตีน',1,NULL,NULL,NULL),
  (104,'การหดตัว',1,NULL,NULL,NULL),
  (105,'36.5',1,NULL,NULL,NULL),
  (106,'สบู่',1,NULL,NULL,NULL),
  (107,'การอบอุ่นร่างกาย',1,NULL,NULL,NULL),
  (108,'3',1,NULL,NULL,NULL),
  (109,'บวก',1,'บวก','+',NULL),
  (110,'ลบ',1,'ลบ','-',NULL),
  (111,'คูณ',1,'คูณ','×',NULL),
  (112,'หาร',1,'หาร','÷',NULL),
  (113,'เท่ากับ',1,'เท่ากับ','=',NULL),
  (114,'ไม่เท่ากับ',1,'ไม่เท่ากับ','≠',NULL),
  (115,'🌳 ต้นไม้',1,'🌳 ต้นไม้','Plantae',NULL),
  (116,'🐶 สุนัข',1,'🐶 สุนัข','Animalia',NULL),
  (117,'🍄 เห็ด',1,'🍄 เห็ด','Fungi',NULL),
  (118,'🦠 แบคทีเรีย',1,'🦠 แบคทีเรีย','Monera',NULL),
  (119,'🟢 สาหร่าย',1,'🟢 สาหร่าย','Protista',NULL),
  (120,'🧫 ยีสต์',1,'🧫 ยีสต์','Fungi',NULL),
  (121,'วิ่ง',1,'วิ่ง','คำกริยา',NULL),
  (122,'สวย',1,'สวย','คำวิเศษณ์',NULL),
  (123,'โต๊ะ',1,'โต๊ะ','คำนาม',NULL),
  (124,'และ',1,'และ','คำสันธาน',NULL),
  (125,'ใน',1,'ใน','คำบุพบท',NULL),
  (126,'โอ้โห',1,'โอ้โห','คำอุทาน',NULL),
  (127,'🍎 Apple',1,'🍎 Apple','แอปเปิ้ล',NULL),
  (128,'📚 Book',1,'📚 Book','หนังสือ',NULL),
  (129,'🌟 Star',1,'🌟 Star','ดาว',NULL),
  (130,'🏠 House',1,'🏠 House','บ้าน',NULL),
  (131,'🌈 Rainbow',1,'🌈 Rainbow','รุ้งกินน้ำ',NULL),
  (132,'🎵 Music',1,'🎵 Music','ดนตรี',NULL),
  (133,'สุโขทัย',1,'สุโขทัย','พ่อขุนรามคำแหง',NULL),
  (134,'อยุธยา',1,'อยุธยา','สมเด็จพระนเรศวร',NULL),
  (135,'ธนบุรี',1,'ธนบุรี','สมเด็จพระเจ้าตากสิน',NULL),
  (136,'รัตนโกสินทร์ตอนต้น',1,'รัตนโกสินทร์ตอนต้น','รัชกาลที่ 1',NULL),
  (137,'รัชกาลที่ 5',1,'รัชกาลที่ 5','ปฏิรูปประเทศ',NULL),
  (138,'พ.ศ.2475',1,'พ.ศ.2475','เปลี่ยนการปกครอง',NULL),
  (139,'🥩 เนื้อสัตว์',1,'🥩 เนื้อสัตว์','โปรตีน',NULL),
  (140,'🍚 ข้าว',1,'🍚 ข้าว','คาร์โบไฮเดรต',NULL),
  (141,'🥑 อาโวคาโด',1,'🥑 อาโวคาโด','ไขมันดี',NULL),
  (142,'🥦 บรอกโคลี',1,'🥦 บรอกโคลี','วิตามิน',NULL),
  (143,'🦴 นม',1,'🦴 นม','แคลเซียม',NULL),
  (144,'🍊 ส้ม',1,'🍊 ส้ม','วิตามินซี',NULL),
  (145,'½ (0.5)',1,NULL,NULL,1),
  (146,'¾ (0.75)',1,NULL,NULL,2),
  (147,'1',1,NULL,NULL,3),
  (148,'1.5',1,NULL,NULL,4),
  (149,'2',1,NULL,NULL,5),
  (150,'3',1,NULL,NULL,6),
  (151,'☀️ การระเหย (Evaporation)',1,NULL,NULL,1),
  (152,'☁️ การก่อตัวของเมฆ',1,NULL,NULL,2),
  (153,'🌧️ ฝนตก (Precipitation)',1,NULL,NULL,3),
  (154,'🏔️ น้ำไหลลงสู่แม่น้ำ',1,NULL,NULL,4),
  (155,'🌊 น้ำสะสมในทะเล/แหล่งน้ำ',1,NULL,NULL,5),
  (156,'🔄 วัฏจักรเริ่มใหม่',1,NULL,NULL,6),
  (157,'📌 ประธาน (Subject)',1,NULL,NULL,1),
  (158,'🏃 กริยา (Verb)',1,NULL,NULL,2),
  (159,'🎯 กรรม (Object)',1,NULL,NULL,3),
  (160,'📍 ส่วนขยาย (Modifier)',1,NULL,NULL,4),
  (161,'❓ คำถาม (Question word)',1,NULL,NULL,5),
  (162,'🔚 เครื่องหมายวรรคตอน',1,NULL,NULL,6),
  (163,'🔵 Blue',1,NULL,NULL,1),
  (164,'🟢 Green',1,NULL,NULL,2),
  (165,'🟠 Orange',1,NULL,NULL,3),
  (166,'🔴 Red',1,NULL,NULL,4),
  (167,'🌸 Rose',1,NULL,NULL,5),
  (168,'🟡 Yellow',1,NULL,NULL,6),
  (169,'🏯 สมัยสุโขทัย (ราวพ.ศ.1800)',1,NULL,NULL,1),
  (170,'⚔️ สมัยอยุธยา (พ.ศ.1893-2310)',1,NULL,NULL,2),
  (171,'🏰 สมัยธนบุรี (พ.ศ.2310-2325)',1,NULL,NULL,3),
  (172,'👑 สมัยรัตนโกสินทร์ (พ.ศ.2325-)',1,NULL,NULL,4),
  (173,'🗳️ ประชาธิปไตย (พ.ศ.2475)',1,NULL,NULL,5),
  (174,'🇹🇭 ยุคปัจจุบัน',1,NULL,NULL,6),
  (175,'📞 โทรเรียกรถพยาบาล 1669',1,NULL,NULL,1),
  (176,'🧍 ตรวจสอบความปลอดภัยของสถานที่',1,NULL,NULL,2),
  (177,'👐 เริ่มกดหน้าอก 30 ครั้ง',1,NULL,NULL,3),
  (178,'👄 เป่าลมเข้าปาก 2 ครั้ง',1,NULL,NULL,4),
  (179,'🔄 ทำซ้ำ 30:2 จนกว่ารถพยาบาลจะมา',1,NULL,NULL,5),
  (180,'✅ ส่งต่อให้ทีมแพทย์',1,NULL,NULL,6),
  (181,'บวก',1,NULL,NULL,NULL),
  (182,'ลบ',1,NULL,NULL,NULL),
  (183,'คูณ',1,NULL,NULL,NULL),
  (184,'หาร',1,NULL,NULL,NULL),
  (185,'เลข',1,NULL,NULL,NULL),
  (186,'จำนวน',1,NULL,NULL,NULL),
  (187,'เซลล์',1,NULL,NULL,NULL),
  (188,'แสง',1,NULL,NULL,NULL),
  (189,'น้ำ',1,NULL,NULL,NULL),
  (190,'ดิน',1,NULL,NULL,NULL),
  (191,'อากาศ',1,NULL,NULL,NULL),
  (192,'พลังงาน',1,NULL,NULL,NULL),
  (193,'กิน',1,NULL,NULL,NULL),
  (194,'นอน',1,NULL,NULL,NULL),
  (195,'วิ่ง',1,NULL,NULL,NULL),
  (196,'เล่น',1,NULL,NULL,NULL),
  (197,'เรียน',1,NULL,NULL,NULL),
  (198,'อ่าน',1,NULL,NULL,NULL),
  (199,'cat',1,NULL,NULL,NULL),
  (200,'dog',1,NULL,NULL,NULL),
  (201,'fish',1,NULL,NULL,NULL),
  (202,'bird',1,NULL,NULL,NULL),
  (203,'book',1,NULL,NULL,NULL),
  (204,'pen',1,NULL,NULL,NULL),
  (205,'ไทย',1,NULL,NULL,NULL),
  (206,'กษัตริย์',1,NULL,NULL,NULL),
  (207,'ราชวงศ์',1,NULL,NULL,NULL),
  (208,'อยุธยา',1,NULL,NULL,NULL),
  (209,'ประวัติ',1,NULL,NULL,NULL),
  (210,'ชาติ',1,NULL,NULL,NULL),
  (211,'วิ่ง',1,NULL,NULL,NULL),
  (212,'นอน',1,NULL,NULL,NULL),
  (213,'อาหาร',1,NULL,NULL,NULL),
  (214,'น้ำ',1,NULL,NULL,NULL),
  (215,'สุขภาพ',1,NULL,NULL,NULL),
  (216,'ออกกำลัง',1,NULL,NULL,NULL);
-- รวม 216 คำถาม 360 คำตอบ

-- ============================================================
-- SEED: คำถามและคำตอบ 216 คำถาม จาก 36 เกม
-- ต้อง import หลัง INSERT games
-- ============================================================
INSERT INTO questions (question_id,game_id,question_text,question_img,question_type,hint,order_no,point) VALUES
  (1,1,'15 + 27 = ?',NULL,'text',NULL,1,10),
  (2,1,'56 - 19 = ?',NULL,'text',NULL,2,10),
  (3,1,'8 × 7 = ?',NULL,'text',NULL,3,10),
  (4,1,'81 ÷ 9 = ?',NULL,'text',NULL,4,10),
  (5,1,'(4 + 6) × 3 = ?',NULL,'text',NULL,5,10),
  (6,1,'100 - 47 = ?',NULL,'text',NULL,6,10),
  (7,7,'ดาวเคราะห์ที่อยู่ใกล้ดวงอาทิตย์ที่สุดคือ?',NULL,'text',NULL,1,10),
  (8,7,'ดวงจันทร์โคจรรอบ?',NULL,'text',NULL,2,10),
  (9,7,'สิ่งมีชีวิตใช้ก๊าซใดในการหายใจ?',NULL,'text',NULL,3,10),
  (10,7,'น้ำแข็งละลายเป็นน้ำเรียกว่า?',NULL,'text',NULL,4,10),
  (11,7,'เซลล์พืชแต่ต่างจากเซลล์สัตว์คือมี?',NULL,'text',NULL,5,10),
  (12,7,'การสังเคราะห์แสงเกิดขึ้นใน?',NULL,'text',NULL,6,10),
  (13,13,'ประเทศไทยมีกี่จังหวัด?',NULL,'text',NULL,1,10),
  (14,13,'ดอกไม้ประจำชาติไทยคืออะไร?',NULL,'text',NULL,2,10),
  (15,13,'ภาษาไทยมีพยัญชนะกี่ตัว?',NULL,'text',NULL,3,10),
  (16,13,'วันภาษาไทยแห่งชาติตรงกับวันที่?',NULL,'text',NULL,4,10),
  (17,13,'"สุนัข" ภาษาราชการเรียกว่าอะไร?',NULL,'text',NULL,5,10),
  (18,13,'คำว่า "ประชาธิปไตย" มีกี่พยางค์?',NULL,'text',NULL,6,10),
  (19,19,'🐶 Dog คืออะไร?',NULL,'text',NULL,1,10),
  (20,19,'🐘 Elephant คืออะไร?',NULL,'text',NULL,2,10),
  (21,19,'🦁 Lion คืออะไร?',NULL,'text',NULL,3,10),
  (22,19,'🐟 Fish คืออะไร?',NULL,'text',NULL,4,10),
  (23,19,'🐦 Bird คืออะไร?',NULL,'text',NULL,5,10),
  (24,19,'🐇 Rabbit คืออะไร?',NULL,'text',NULL,6,10),
  (25,25,'กรุงสุโขทัยถูกสถาปนาในปี พ.ศ. ใด?',NULL,'text',NULL,1,10),
  (26,25,'พ่อขุนรามคำแหงทรงประดิษฐ์สิ่งใด?',NULL,'text',NULL,2,10),
  (27,25,'กรุงศรีอยุธยาเป็นเมืองหลวงของไทยกี่ปี?',NULL,'text',NULL,3,10),
  (28,25,'ไทยเปลี่ยนการปกครองเป็นระบอบประชาธิปไตยปี?',NULL,'text',NULL,4,10),
  (29,25,'รัชกาลที่ 1 ทรงสถาปนากรุงใด?',NULL,'text',NULL,5,10),
  (30,25,'วันชาติไทยตรงกับวันที่?',NULL,'text',NULL,6,10),
  (31,31,'ควรนอนหลับวันละกี่ชั่วโมง (เด็ก)?',NULL,'text',NULL,1,10),
  (32,31,'อาหารประเภทใดให้พลังงานมากที่สุด?',NULL,'text',NULL,2,10),
  (33,31,'การออกกำลังกายควรทำสัปดาห์ละกี่วัน?',NULL,'text',NULL,3,10),
  (34,31,'วิตามินซีพบมากในอาหารใด?',NULL,'text',NULL,4,10),
  (35,31,'อวัยวะใดที่ทำหน้าที่กรองเลือด?',NULL,'text',NULL,5,10),
  (36,31,'BMI ย่อมาจากอะไร?',NULL,'text',NULL,6,10),
  (37,2,'7 × 8 = 56',NULL,'text',NULL,1,10),
  (38,2,'12 + 13 = 26',NULL,'text',NULL,2,10),
  (39,2,'100 ÷ 5 = 20',NULL,'text',NULL,3,10),
  (40,2,'จำนวนคู่คือ 2, 4, 6, 8, 10',NULL,'text',NULL,4,10),
  (41,2,'15 เป็นจำนวนเฉพาะ',NULL,'text',NULL,5,10),
  (42,2,'0.5 = 1/2',NULL,'text',NULL,6,10),
  (43,8,'☀️ ดวงอาทิตย์เป็นดาวเคราะห์',NULL,'text',NULL,1,10),
  (44,8,'💧 สูตรเคมีของน้ำคือ H₂O',NULL,'text',NULL,2,10),
  (45,8,'🌱 พืชสังเคราะห์แสงโดยใช้แสงอาทิตย์',NULL,'text',NULL,3,10),
  (46,8,'🔴 เลือดมีสีแดงเพราะมีฮีโมโกลบิน',NULL,'text',NULL,4,10),
  (47,8,'🌕 ดวงจันทร์ออกแสงสว่างเองได้',NULL,'text',NULL,5,10),
  (48,8,'⚡ ฟ้าผ่าคือการปล่อยประจุไฟฟ้า',NULL,'text',NULL,6,10),
  (49,14,'ภาษาไทยมีวรรณยุกต์ 5 รูป 4 เสียง',NULL,'text',NULL,1,10),
  (50,14,'พระบิดาแห่งภาษาไทยคือรัชกาลที่ 9',NULL,'text',NULL,2,10),
  (51,14,'คำว่า "รัก" เป็นคำกริยา',NULL,'text',NULL,3,10),
  (52,14,'ไตรยางศ์มี 3 หมู่ คือ สูง กลาง ต่ำ',NULL,'text',NULL,4,10),
  (53,14,'อักษรสูงมี 12 ตัว',NULL,'text',NULL,5,10),
  (54,14,'"กา" และ "ก้า" ออกเสียงต่างกันด้วยวรรณยุกต์',NULL,'text',NULL,6,10),
  (55,20,'"Apple" หมายถึง ส้ม',NULL,'text',NULL,1,10),
  (56,20,'"Monday" เป็นวันแรกของสัปดาห์',NULL,'text',NULL,2,10),
  (57,20,'"Red" หมายถึง สีแดง',NULL,'text',NULL,3,10),
  (58,20,'"Book" เป็น verb (กริยา)',NULL,'text',NULL,4,10),
  (59,20,'"Happy" หมายถึง เศร้า',NULL,'text',NULL,5,10),
  (60,20,'"12 months = 1 year" is correct',NULL,'text',NULL,6,10),
  (61,26,'กรุงสุโขทัยเป็นราชธานีแรกของไทย',NULL,'text',NULL,1,10),
  (62,26,'สมเด็จพระนเรศวรทรงกอบกู้เอกราชจากพม่า',NULL,'text',NULL,2,10),
  (63,26,'กรุงรัตนโกสินทร์สถาปนาในปี พ.ศ.2310',NULL,'text',NULL,3,10),
  (64,26,'รัชกาลที่ 5 ทรงยกเลิกทาสในไทย',NULL,'text',NULL,4,10),
  (65,26,'ไทยเคยตกเป็นเมืองขึ้นของอังกฤษ',NULL,'text',NULL,5,10),
  (66,26,'วันปิยมหาราชตรงกับวันที่ 23 ตุลาคม',NULL,'text',NULL,6,10),
  (67,32,'🏃 การวิ่งช่วยให้หัวใจแข็งแรง',NULL,'text',NULL,1,10),
  (68,32,'🍬 น้ำตาลมากเกินไปทำให้ฟันผุ',NULL,'text',NULL,2,10),
  (69,32,'😴 การนอนน้อยไม่มีผลต่อสุขภาพ',NULL,'text',NULL,3,10),
  (70,32,'🥦 ผักใบเขียวมีวิตามินและแร่ธาตุสูง',NULL,'text',NULL,4,10),
  (71,32,'💧 ควรดื่มน้ำอย่างน้อย 2 ลิตรต่อวัน',NULL,'text',NULL,5,10),
  (72,32,'🚬 การสูบบุหรี่ไม่มีโทษต่อสุขภาพ',NULL,'text',NULL,6,10),
  (73,3,'___ + 15 = 30',NULL,'text','30 - 15',1,10),
  (74,3,'7 × ___ = 63',NULL,'text','63 ÷ 7',2,10),
  (75,3,'พื้นที่สี่เหลี่ยม กว้าง 5 ยาว 8 = ___',NULL,'text','กว้าง×ยาว',3,10),
  (76,3,'0.25 = ___/100',NULL,'text','0.25 × 100',4,10),
  (77,3,'ครึ่งของ 64 คือ ___',NULL,'text','64 ÷ 2',5,10),
  (78,3,'3² + 4² = ___²  (ทฤษฎีพีทาโกรัส)',NULL,'text','9+16=25',6,10),
  (79,9,'ก๊าซที่พืชปล่อยออกมาในระหว่างสังเคราะห์แสงคือ',NULL,'text','สิ่งที่เราหายใจ',1,10),
  (80,9,'สัตว์ที่มีกระดูกสันหลังเรียกว่า?',NULL,'text','Vertebrate',2,10),
  (81,9,'หน่วยพื้นฐานของสิ่งมีชีวิตคือ',NULL,'text','Cell',3,10),
  (82,9,'แรงดึงดูดของโลกที่ดึงวัตถุลงคือ',NULL,'text','Gravity',4,10),
  (83,9,'อุณหภูมิที่น้ำเดือดในหน่วย °C คือ',NULL,'text','100',5,10),
  (84,9,'ธาตุที่เบาที่สุดในตารางธาตุคือ',NULL,'text','H',6,10),
  (85,15,'ดิฉัน_____ไปโรงเรียนทุกวัน (กริยา)',NULL,'text','การเดินทาง',1,10),
  (86,15,'นกมีปีก สุนัขมี___',NULL,'text','ขา 4 ข้าง',2,10),
  (87,15,'"สวรรค์" อ่านว่า',NULL,'text','ออกเสียง สะ-วัน',3,10),
  (88,15,'คำว่า "เขียว" เป็นคำ_____',NULL,'text','บอกลักษณะ',4,10),
  (89,15,'วลีที่มีความหมายว่า "ขยัน" คือ',NULL,'text','มดหรือผึ้ง',5,10),
  (90,15,'ประโยค "แมวกินปลา" มีประธานคือ',NULL,'text','ใครทำอะไร',6,10),
  (91,21,'I ___ a student. (to be)',NULL,'text','am / is / are',1,10),
  (92,21,'She ___ to school everyday.',NULL,'text','go / goes / gone',2,10),
  (93,21,'The color of the sky is ___.',NULL,'text','สีท้องฟ้า',3,10),
  (94,21,'1+1 = ___ (in English)',NULL,'text','สอง',4,10),
  (95,21,'"สุนัข" in English is ___.',NULL,'text','man''s best friend',5,10),
  (96,21,'Opposite of "big" is ___.',NULL,'text','ตรงข้ามกับใหญ่',6,10),
  (97,27,'พ่อขุนรามคำแหงเป็นกษัตริย์ราชวงศ์?',NULL,'text','ผู้ก่อตั้งสุโขทัย',1,10),
  (98,27,'กรุงศรีอยุธยาเสียครั้งที่ 2 ปี พ.ศ.___',NULL,'text','ปีที่ถูกพม่าตี ครั้งสุดท้าย',2,10),
  (99,27,'รัชกาลที่ 4 ทรงพระนามว่า___',NULL,'text','มงกุฎ',3,10),
  (100,27,'วันฉัตรมงคลตรงกับวันที่ ___ พฤษภาคม',NULL,'text','ต้นเดือน',4,10),
  (101,27,'ประเทศไทยมีพระมหากษัตริย์รัชกาลที่ ___ ปัจจุบัน',NULL,'text','10',5,10),
  (102,27,'สนธิสัญญาเบาว์ริ่งทำกับประเทศ?',NULL,'text','ชาติตะวันตก',6,10),
  (103,33,'อาหาร 5 หมู่ หมู่ที่ 1 คือ',NULL,'text','เนื้อสัตว์ ไข่ นม',1,10),
  (104,33,'หัวใจสูบฉีดเลือดไปทั่วร่างกายโดยใช้___',NULL,'text','อวัยวะกลางอก',2,10),
  (105,33,'อุณหภูมิร่างกายปกติประมาณ ___ °C',NULL,'text','36-37',3,10),
  (106,33,'การล้างมือด้วย___ ช่วยฆ่าเชื้อโรคได้ดี',NULL,'text','ของเหลวทำความสะอาด',4,10),
  (107,33,'การยืดเหยียดก่อนออกกำลังกายเรียกว่า',NULL,'text','Warm up',5,10),
  (108,33,'เด็กอายุ 6-12 ปีควรดื่มนมวันละ ___ แก้ว',NULL,'text','2-3',6,10),
  (109,4,'บวก → +',NULL,'pair',NULL,1,10),
  (110,4,'ลบ → -',NULL,'pair',NULL,2,10),
  (111,4,'คูณ → ×',NULL,'pair',NULL,3,10),
  (112,4,'หาร → ÷',NULL,'pair',NULL,4,10),
  (113,4,'เท่ากับ → =',NULL,'pair',NULL,5,10),
  (114,4,'ไม่เท่ากับ → ≠',NULL,'pair',NULL,6,10),
  (115,10,'🌳 ต้นไม้ → Plantae',NULL,'pair',NULL,1,10),
  (116,10,'🐶 สุนัข → Animalia',NULL,'pair',NULL,2,10),
  (117,10,'🍄 เห็ด → Fungi',NULL,'pair',NULL,3,10),
  (118,10,'🦠 แบคทีเรีย → Monera',NULL,'pair',NULL,4,10),
  (119,10,'🟢 สาหร่าย → Protista',NULL,'pair',NULL,5,10),
  (120,10,'🧫 ยีสต์ → Fungi',NULL,'pair',NULL,6,10),
  (121,16,'วิ่ง → คำกริยา',NULL,'pair',NULL,1,10),
  (122,16,'สวย → คำวิเศษณ์',NULL,'pair',NULL,2,10),
  (123,16,'โต๊ะ → คำนาม',NULL,'pair',NULL,3,10),
  (124,16,'และ → คำสันธาน',NULL,'pair',NULL,4,10),
  (125,16,'ใน → คำบุพบท',NULL,'pair',NULL,5,10),
  (126,16,'โอ้โห → คำอุทาน',NULL,'pair',NULL,6,10),
  (127,22,'🍎 Apple → แอปเปิ้ล',NULL,'pair',NULL,1,10),
  (128,22,'📚 Book → หนังสือ',NULL,'pair',NULL,2,10),
  (129,22,'🌟 Star → ดาว',NULL,'pair',NULL,3,10),
  (130,22,'🏠 House → บ้าน',NULL,'pair',NULL,4,10),
  (131,22,'🌈 Rainbow → รุ้งกินน้ำ',NULL,'pair',NULL,5,10),
  (132,22,'🎵 Music → ดนตรี',NULL,'pair',NULL,6,10),
  (133,28,'สุโขทัย → พ่อขุนรามคำแหง',NULL,'pair',NULL,1,10),
  (134,28,'อยุธยา → สมเด็จพระนเรศวร',NULL,'pair',NULL,2,10),
  (135,28,'ธนบุรี → สมเด็จพระเจ้าตากสิน',NULL,'pair',NULL,3,10),
  (136,28,'รัตนโกสินทร์ตอนต้น → รัชกาลที่ 1',NULL,'pair',NULL,4,10),
  (137,28,'รัชกาลที่ 5 → ปฏิรูปประเทศ',NULL,'pair',NULL,5,10),
  (138,28,'พ.ศ.2475 → เปลี่ยนการปกครอง',NULL,'pair',NULL,6,10),
  (139,34,'🥩 เนื้อสัตว์ → โปรตีน',NULL,'pair',NULL,1,10),
  (140,34,'🍚 ข้าว → คาร์โบไฮเดรต',NULL,'pair',NULL,2,10),
  (141,34,'🥑 อาโวคาโด → ไขมันดี',NULL,'pair',NULL,3,10),
  (142,34,'🥦 บรอกโคลี → วิตามิน',NULL,'pair',NULL,4,10),
  (143,34,'🦴 นม → แคลเซียม',NULL,'pair',NULL,5,10),
  (144,34,'🍊 ส้ม → วิตามินซี',NULL,'pair',NULL,6,10),
  (145,5,'½ (0.5)',NULL,'item',NULL,1,10),
  (146,5,'¾ (0.75)',NULL,'item',NULL,2,10),
  (147,5,'1',NULL,'item',NULL,3,10),
  (148,5,'1.5',NULL,'item',NULL,4,10),
  (149,5,'2',NULL,'item',NULL,5,10),
  (150,5,'3',NULL,'item',NULL,6,10),
  (151,11,'☀️ การระเหย (Evaporation)',NULL,'item',NULL,1,10),
  (152,11,'☁️ การก่อตัวของเมฆ',NULL,'item',NULL,2,10),
  (153,11,'🌧️ ฝนตก (Precipitation)',NULL,'item',NULL,3,10),
  (154,11,'🏔️ น้ำไหลลงสู่แม่น้ำ',NULL,'item',NULL,4,10),
  (155,11,'🌊 น้ำสะสมในทะเล/แหล่งน้ำ',NULL,'item',NULL,5,10),
  (156,11,'🔄 วัฏจักรเริ่มใหม่',NULL,'item',NULL,6,10),
  (157,17,'📌 ประธาน (Subject)',NULL,'item',NULL,1,10),
  (158,17,'🏃 กริยา (Verb)',NULL,'item',NULL,2,10),
  (159,17,'🎯 กรรม (Object)',NULL,'item',NULL,3,10),
  (160,17,'📍 ส่วนขยาย (Modifier)',NULL,'item',NULL,4,10),
  (161,17,'❓ คำถาม (Question word)',NULL,'item',NULL,5,10),
  (162,17,'🔚 เครื่องหมายวรรคตอน',NULL,'item',NULL,6,10),
  (163,23,'🔵 Blue',NULL,'item',NULL,1,10),
  (164,23,'🟢 Green',NULL,'item',NULL,2,10),
  (165,23,'🟠 Orange',NULL,'item',NULL,3,10),
  (166,23,'🔴 Red',NULL,'item',NULL,4,10),
  (167,23,'🌸 Rose',NULL,'item',NULL,5,10),
  (168,23,'🟡 Yellow',NULL,'item',NULL,6,10),
  (169,29,'🏯 สมัยสุโขทัย (ราวพ.ศ.1800)',NULL,'item',NULL,1,10),
  (170,29,'⚔️ สมัยอยุธยา (พ.ศ.1893-2310)',NULL,'item',NULL,2,10),
  (171,29,'🏰 สมัยธนบุรี (พ.ศ.2310-2325)',NULL,'item',NULL,3,10),
  (172,29,'👑 สมัยรัตนโกสินทร์ (พ.ศ.2325-)',NULL,'item',NULL,4,10),
  (173,29,'🗳️ ประชาธิปไตย (พ.ศ.2475)',NULL,'item',NULL,5,10),
  (174,29,'🇹🇭 ยุคปัจจุบัน',NULL,'item',NULL,6,10),
  (175,35,'📞 โทรเรียกรถพยาบาล 1669',NULL,'item',NULL,1,10),
  (176,35,'🧍 ตรวจสอบความปลอดภัยของสถานที่',NULL,'item',NULL,2,10),
  (177,35,'👐 เริ่มกดหน้าอก 30 ครั้ง',NULL,'item',NULL,3,10),
  (178,35,'👄 เป่าลมเข้าปาก 2 ครั้ง',NULL,'item',NULL,4,10),
  (179,35,'🔄 ทำซ้ำ 30:2 จนกว่ารถพยาบาลจะมา',NULL,'item',NULL,5,10),
  (180,35,'✅ ส่งต่อให้ทีมแพทย์',NULL,'item',NULL,6,10),
  (181,6,'บวก',NULL,'word',NULL,1,10),
  (182,6,'ลบ',NULL,'word',NULL,2,10),
  (183,6,'คูณ',NULL,'word',NULL,3,10),
  (184,6,'หาร',NULL,'word',NULL,4,10),
  (185,6,'เลข',NULL,'word',NULL,5,10),
  (186,6,'จำนวน',NULL,'word',NULL,6,10),
  (187,12,'เซลล์',NULL,'word',NULL,1,10),
  (188,12,'แสง',NULL,'word',NULL,2,10),
  (189,12,'น้ำ',NULL,'word',NULL,3,10),
  (190,12,'ดิน',NULL,'word',NULL,4,10),
  (191,12,'อากาศ',NULL,'word',NULL,5,10),
  (192,12,'พลังงาน',NULL,'word',NULL,6,10),
  (193,18,'กิน',NULL,'word',NULL,1,10),
  (194,18,'นอน',NULL,'word',NULL,2,10),
  (195,18,'วิ่ง',NULL,'word',NULL,3,10),
  (196,18,'เล่น',NULL,'word',NULL,4,10),
  (197,18,'เรียน',NULL,'word',NULL,5,10),
  (198,18,'อ่าน',NULL,'word',NULL,6,10),
  (199,24,'cat',NULL,'word',NULL,1,10),
  (200,24,'dog',NULL,'word',NULL,2,10),
  (201,24,'fish',NULL,'word',NULL,3,10),
  (202,24,'bird',NULL,'word',NULL,4,10),
  (203,24,'book',NULL,'word',NULL,5,10),
  (204,24,'pen',NULL,'word',NULL,6,10),
  (205,30,'ไทย',NULL,'word',NULL,1,10),
  (206,30,'กษัตริย์',NULL,'word',NULL,2,10),
  (207,30,'ราชวงศ์',NULL,'word',NULL,3,10),
  (208,30,'อยุธยา',NULL,'word',NULL,4,10),
  (209,30,'ประวัติ',NULL,'word',NULL,5,10),
  (210,30,'ชาติ',NULL,'word',NULL,6,10),
  (211,36,'วิ่ง',NULL,'word',NULL,1,10),
  (212,36,'นอน',NULL,'word',NULL,2,10),
  (213,36,'อาหาร',NULL,'word',NULL,3,10),
  (214,36,'น้ำ',NULL,'word',NULL,4,10),
  (215,36,'สุขภาพ',NULL,'word',NULL,5,10),
  (216,36,'ออกกำลัง',NULL,'word',NULL,6,10);

INSERT INTO answers (question_id,answer_text,is_correct,pair_left,pair_right,seq_order) VALUES
  (1,'40',0,NULL,NULL,NULL),
  (1,'42',1,NULL,NULL,NULL),
  (1,'41',0,NULL,NULL,NULL),
  (1,'43',0,NULL,NULL,NULL),
  (2,'37',1,NULL,NULL,NULL),
  (2,'35',0,NULL,NULL,NULL),
  (2,'38',0,NULL,NULL,NULL),
  (2,'36',0,NULL,NULL,NULL),
  (3,'54',0,NULL,NULL,NULL),
  (3,'56',1,NULL,NULL,NULL),
  (3,'58',0,NULL,NULL,NULL),
  (3,'52',0,NULL,NULL,NULL),
  (4,'8',0,NULL,NULL,NULL),
  (4,'9',1,NULL,NULL,NULL),
  (4,'7',0,NULL,NULL,NULL),
  (4,'10',0,NULL,NULL,NULL),
  (5,'30',1,NULL,NULL,NULL),
  (5,'28',0,NULL,NULL,NULL),
  (5,'32',0,NULL,NULL,NULL),
  (5,'24',0,NULL,NULL,NULL),
  (6,'53',1,NULL,NULL,NULL),
  (6,'55',0,NULL,NULL,NULL),
  (6,'57',0,NULL,NULL,NULL),
  (6,'51',0,NULL,NULL,NULL),
  (7,'ดาวศุกร์',0,NULL,NULL,NULL),
  (7,'ดาวพุธ',1,NULL,NULL,NULL),
  (7,'โลก',0,NULL,NULL,NULL),
  (7,'ดาวอังคาร',0,NULL,NULL,NULL),
  (8,'ดวงอาทิตย์',0,NULL,NULL,NULL),
  (8,'โลก',1,NULL,NULL,NULL),
  (8,'ดาวอังคาร',0,NULL,NULL,NULL),
  (8,'ดาวพฤหัส',0,NULL,NULL,NULL),
  (9,'CO₂',0,NULL,NULL,NULL),
  (9,'N₂',0,NULL,NULL,NULL),
  (9,'O₂',1,NULL,NULL,NULL),
  (9,'H₂',0,NULL,NULL,NULL),
  (10,'การระเหย',0,NULL,NULL,NULL),
  (10,'การหลอมเหลว',1,NULL,NULL,NULL),
  (10,'การควบแน่น',0,NULL,NULL,NULL),
  (10,'การแข็งตัว',0,NULL,NULL,NULL),
  (11,'นิวเคลียส',0,NULL,NULL,NULL),
  (11,'เยื่อหุ้มเซลล์',0,NULL,NULL,NULL),
  (11,'ผนังเซลล์',1,NULL,NULL,NULL),
  (11,'ไซโตพลาซึม',0,NULL,NULL,NULL),
  (12,'ราก',0,NULL,NULL,NULL),
  (12,'ลำต้น',0,NULL,NULL,NULL),
  (12,'ใบ',1,NULL,NULL,NULL),
  (12,'ดอก',0,NULL,NULL,NULL),
  (13,'75',0,NULL,NULL,NULL),
  (13,'76',0,NULL,NULL,NULL),
  (13,'77',1,NULL,NULL,NULL),
  (13,'78',0,NULL,NULL,NULL),
  (14,'กล้วยไม้',0,NULL,NULL,NULL),
  (14,'ดอกบัว',0,NULL,NULL,NULL),
  (14,'ราชพฤกษ์',1,NULL,NULL,NULL),
  (14,'มะลิ',0,NULL,NULL,NULL),
  (15,'42',0,NULL,NULL,NULL),
  (15,'44',1,NULL,NULL,NULL),
  (15,'44',0,NULL,NULL,NULL),
  (15,'46',0,NULL,NULL,NULL),
  (16,'29 ก.ค.',1,NULL,NULL,NULL),
  (16,'23 ก.ย.',0,NULL,NULL,NULL),
  (16,'5 ธ.ค.',0,NULL,NULL,NULL),
  (16,'1 ม.ค.',0,NULL,NULL,NULL),
  (17,'แมว',0,NULL,NULL,NULL),
  (17,'โค',0,NULL,NULL,NULL),
  (17,'หมา',1,NULL,NULL,NULL),
  (17,'กวาง',0,NULL,NULL,NULL),
  (18,'5',0,NULL,NULL,NULL),
  (18,'6',1,NULL,NULL,NULL),
  (18,'7',0,NULL,NULL,NULL),
  (18,'4',0,NULL,NULL,NULL),
  (19,'แมว',0,NULL,NULL,NULL),
  (19,'สุนัข',1,NULL,NULL,NULL),
  (19,'กระต่าย',0,NULL,NULL,NULL),
  (19,'หมู',0,NULL,NULL,NULL),
  (20,'เสือ',0,NULL,NULL,NULL),
  (20,'สิงโต',0,NULL,NULL,NULL),
  (20,'ช้าง',1,NULL,NULL,NULL),
  (20,'ยีราฟ',0,NULL,NULL,NULL),
  (21,'เสือ',0,NULL,NULL,NULL),
  (21,'สิงโต',1,NULL,NULL,NULL),
  (21,'หมี',0,NULL,NULL,NULL),
  (21,'หมาป่า',0,NULL,NULL,NULL),
  (22,'นก',0,NULL,NULL,NULL),
  (22,'งู',0,NULL,NULL,NULL),
  (22,'ปลา',1,NULL,NULL,NULL),
  (22,'กบ',0,NULL,NULL,NULL),
  (23,'ผึ้ง',0,NULL,NULL,NULL),
  (23,'แมลง',0,NULL,NULL,NULL),
  (23,'นก',1,NULL,NULL,NULL),
  (23,'ผีเสื้อ',0,NULL,NULL,NULL),
  (24,'กระแต',0,NULL,NULL,NULL),
  (24,'กระต่าย',1,NULL,NULL,NULL),
  (24,'กระรอก',0,NULL,NULL,NULL),
  (24,'หนู',0,NULL,NULL,NULL),
  (25,'พ.ศ.1800',1,NULL,NULL,NULL),
  (25,'พ.ศ.1893',0,NULL,NULL,NULL),
  (25,'พ.ศ.1762',0,NULL,NULL,NULL),
  (25,'พ.ศ.2310',0,NULL,NULL,NULL),
  (26,'เงินตรา',0,NULL,NULL,NULL),
  (26,'ตัวอักษรไทย',1,NULL,NULL,NULL),
  (26,'ระบบชลประทาน',0,NULL,NULL,NULL),
  (26,'กฎหมาย',0,NULL,NULL,NULL),
  (27,'400',0,NULL,NULL,NULL),
  (27,'417',1,NULL,NULL,NULL),
  (27,'350',0,NULL,NULL,NULL),
  (27,'450',0,NULL,NULL,NULL),
  (28,'พ.ศ.2475',1,NULL,NULL,NULL),
  (28,'พ.ศ.2500',0,NULL,NULL,NULL),
  (28,'พ.ศ.2490',0,NULL,NULL,NULL),
  (28,'พ.ศ.2460',0,NULL,NULL,NULL),
  (29,'กรุงธนบุรี',0,NULL,NULL,NULL),
  (29,'กรุงเทพฯ',1,NULL,NULL,NULL),
  (29,'กรุงศรีอยุธยา',0,NULL,NULL,NULL),
  (29,'กรุงสุโขทัย',0,NULL,NULL,NULL),
  (30,'5 ธ.ค.',0,NULL,NULL,NULL),
  (30,'28 ก.ค.',1,NULL,NULL,NULL),
  (30,'23 ต.ค.',0,NULL,NULL,NULL),
  (30,'5 พ.ค.',0,NULL,NULL,NULL),
  (31,'6',0,NULL,NULL,NULL),
  (31,'7',0,NULL,NULL,NULL),
  (31,'8-10',1,NULL,NULL,NULL),
  (31,'5',0,NULL,NULL,NULL),
  (32,'โปรตีน',0,NULL,NULL,NULL),
  (32,'ไขมัน',0,NULL,NULL,NULL),
  (32,'คาร์โบไฮเดรต',1,NULL,NULL,NULL),
  (32,'วิตามิน',0,NULL,NULL,NULL),
  (33,'1',0,NULL,NULL,NULL),
  (33,'2',0,NULL,NULL,NULL),
  (33,'3-5',1,NULL,NULL,NULL),
  (33,'7',0,NULL,NULL,NULL),
  (34,'เนื้อสัตว์',0,NULL,NULL,NULL),
  (34,'ส้ม',1,NULL,NULL,NULL),
  (34,'ข้าว',0,NULL,NULL,NULL),
  (34,'นม',0,NULL,NULL,NULL),
  (35,'หัวใจ',0,NULL,NULL,NULL),
  (35,'ปอด',0,NULL,NULL,NULL),
  (35,'ไต',1,NULL,NULL,NULL),
  (35,'ตับ',0,NULL,NULL,NULL),
  (36,'Body Mass Index',1,NULL,NULL,NULL),
  (36,'Brain Mind Indicator',0,NULL,NULL,NULL),
  (36,'Blood Metabolism Index',0,NULL,NULL,NULL),
  (36,'Body Muscle Index',0,NULL,NULL,NULL),
  (37,'ถูก',1,NULL,NULL,NULL),
  (37,'ผิด',0,NULL,NULL,NULL),
  (38,'ถูก',0,NULL,NULL,NULL),
  (38,'ผิด',1,NULL,NULL,NULL),
  (39,'ถูก',1,NULL,NULL,NULL),
  (39,'ผิด',0,NULL,NULL,NULL),
  (40,'ถูก',1,NULL,NULL,NULL),
  (40,'ผิด',0,NULL,NULL,NULL),
  (41,'ถูก',0,NULL,NULL,NULL),
  (41,'ผิด',1,NULL,NULL,NULL),
  (42,'ถูก',1,NULL,NULL,NULL),
  (42,'ผิด',0,NULL,NULL,NULL),
  (43,'ถูก',0,NULL,NULL,NULL),
  (43,'ผิด',1,NULL,NULL,NULL),
  (44,'ถูก',1,NULL,NULL,NULL),
  (44,'ผิด',0,NULL,NULL,NULL),
  (45,'ถูก',1,NULL,NULL,NULL),
  (45,'ผิด',0,NULL,NULL,NULL),
  (46,'ถูก',1,NULL,NULL,NULL),
  (46,'ผิด',0,NULL,NULL,NULL),
  (47,'ถูก',0,NULL,NULL,NULL),
  (47,'ผิด',1,NULL,NULL,NULL),
  (48,'ถูก',1,NULL,NULL,NULL),
  (48,'ผิด',0,NULL,NULL,NULL),
  (49,'ถูก',0,NULL,NULL,NULL),
  (49,'ผิด',1,NULL,NULL,NULL),
  (50,'ถูก',1,NULL,NULL,NULL),
  (50,'ผิด',0,NULL,NULL,NULL),
  (51,'ถูก',1,NULL,NULL,NULL),
  (51,'ผิด',0,NULL,NULL,NULL),
  (52,'ถูก',1,NULL,NULL,NULL),
  (52,'ผิด',0,NULL,NULL,NULL),
  (53,'ถูก',0,NULL,NULL,NULL),
  (53,'ผิด',1,NULL,NULL,NULL),
  (54,'ถูก',1,NULL,NULL,NULL),
  (54,'ผิด',0,NULL,NULL,NULL),
  (55,'ถูก',0,NULL,NULL,NULL),
  (55,'ผิด',1,NULL,NULL,NULL),
  (56,'ถูก',1,NULL,NULL,NULL),
  (56,'ผิด',0,NULL,NULL,NULL),
  (57,'ถูก',1,NULL,NULL,NULL),
  (57,'ผิด',0,NULL,NULL,NULL),
  (58,'ถูก',0,NULL,NULL,NULL),
  (58,'ผิด',1,NULL,NULL,NULL),
  (59,'ถูก',0,NULL,NULL,NULL),
  (59,'ผิด',1,NULL,NULL,NULL),
  (60,'ถูก',1,NULL,NULL,NULL),
  (60,'ผิด',0,NULL,NULL,NULL),
  (61,'ถูก',1,NULL,NULL,NULL),
  (61,'ผิด',0,NULL,NULL,NULL),
  (62,'ถูก',1,NULL,NULL,NULL),
  (62,'ผิด',0,NULL,NULL,NULL),
  (63,'ถูก',0,NULL,NULL,NULL),
  (63,'ผิด',1,NULL,NULL,NULL),
  (64,'ถูก',1,NULL,NULL,NULL),
  (64,'ผิด',0,NULL,NULL,NULL),
  (65,'ถูก',0,NULL,NULL,NULL),
  (65,'ผิด',1,NULL,NULL,NULL),
  (66,'ถูก',1,NULL,NULL,NULL),
  (66,'ผิด',0,NULL,NULL,NULL),
  (67,'ถูก',1,NULL,NULL,NULL),
  (67,'ผิด',0,NULL,NULL,NULL),
  (68,'ถูก',1,NULL,NULL,NULL),
  (68,'ผิด',0,NULL,NULL,NULL),
  (69,'ถูก',0,NULL,NULL,NULL),
  (69,'ผิด',1,NULL,NULL,NULL),
  (70,'ถูก',1,NULL,NULL,NULL),
  (70,'ผิด',0,NULL,NULL,NULL),
  (71,'ถูก',1,NULL,NULL,NULL),
  (71,'ผิด',0,NULL,NULL,NULL),
  (72,'ถูก',0,NULL,NULL,NULL),
  (72,'ผิด',1,NULL,NULL,NULL),
  (73,'15',1,NULL,NULL,NULL),
  (74,'9',1,NULL,NULL,NULL),
  (75,'40',1,NULL,NULL,NULL),
  (76,'25',1,NULL,NULL,NULL),
  (77,'32',1,NULL,NULL,NULL),
  (78,'5',1,NULL,NULL,NULL),
  (79,'ออกซิเจน',1,NULL,NULL,NULL),
  (80,'สัตว์มีกระดูกสันหลัง',1,NULL,NULL,NULL),
  (81,'เซลล์',1,NULL,NULL,NULL),
  (82,'แรงโน้มถ่วง',1,NULL,NULL,NULL),
  (83,'100',1,NULL,NULL,NULL),
  (84,'ไฮโดรเจน',1,NULL,NULL,NULL),
  (85,'ไป',1,NULL,NULL,NULL),
  (86,'ขา',1,NULL,NULL,NULL),
  (87,'สะหวัน',1,NULL,NULL,NULL),
  (88,'วิเศษณ์',1,NULL,NULL,NULL),
  (89,'ขยันเหมือนมด',1,NULL,NULL,NULL),
  (90,'แมว',1,NULL,NULL,NULL),
  (91,'am',1,NULL,NULL,NULL),
  (92,'goes',1,NULL,NULL,NULL),
  (93,'blue',1,NULL,NULL,NULL),
  (94,'two',1,NULL,NULL,NULL),
  (95,'dog',1,NULL,NULL,NULL),
  (96,'small',1,NULL,NULL,NULL),
  (97,'ศรีนาวนำถุม',1,NULL,NULL,NULL),
  (98,'2310',1,NULL,NULL,NULL),
  (99,'พระจอมเกล้าเจ้าอยู่หัว',1,NULL,NULL,NULL),
  (100,'4',1,NULL,NULL,NULL),
  (101,'10',1,NULL,NULL,NULL),
  (102,'อังกฤษ',1,NULL,NULL,NULL),
  (103,'โปรตีน',1,NULL,NULL,NULL),
  (104,'การหดตัว',1,NULL,NULL,NULL),
  (105,'36.5',1,NULL,NULL,NULL),
  (106,'สบู่',1,NULL,NULL,NULL),
  (107,'การอบอุ่นร่างกาย',1,NULL,NULL,NULL),
  (108,'3',1,NULL,NULL,NULL),
  (109,'บวก',1,'บวก','+',NULL),
  (110,'ลบ',1,'ลบ','-',NULL),
  (111,'คูณ',1,'คูณ','×',NULL),
  (112,'หาร',1,'หาร','÷',NULL),
  (113,'เท่ากับ',1,'เท่ากับ','=',NULL),
  (114,'ไม่เท่ากับ',1,'ไม่เท่ากับ','≠',NULL),
  (115,'🌳 ต้นไม้',1,'🌳 ต้นไม้','Plantae',NULL),
  (116,'🐶 สุนัข',1,'🐶 สุนัข','Animalia',NULL),
  (117,'🍄 เห็ด',1,'🍄 เห็ด','Fungi',NULL),
  (118,'🦠 แบคทีเรีย',1,'🦠 แบคทีเรีย','Monera',NULL),
  (119,'🟢 สาหร่าย',1,'🟢 สาหร่าย','Protista',NULL),
  (120,'🧫 ยีสต์',1,'🧫 ยีสต์','Fungi',NULL),
  (121,'วิ่ง',1,'วิ่ง','คำกริยา',NULL),
  (122,'สวย',1,'สวย','คำวิเศษณ์',NULL),
  (123,'โต๊ะ',1,'โต๊ะ','คำนาม',NULL),
  (124,'และ',1,'และ','คำสันธาน',NULL),
  (125,'ใน',1,'ใน','คำบุพบท',NULL),
  (126,'โอ้โห',1,'โอ้โห','คำอุทาน',NULL),
  (127,'🍎 Apple',1,'🍎 Apple','แอปเปิ้ล',NULL),
  (128,'📚 Book',1,'📚 Book','หนังสือ',NULL),
  (129,'🌟 Star',1,'🌟 Star','ดาว',NULL),
  (130,'🏠 House',1,'🏠 House','บ้าน',NULL),
  (131,'🌈 Rainbow',1,'🌈 Rainbow','รุ้งกินน้ำ',NULL),
  (132,'🎵 Music',1,'🎵 Music','ดนตรี',NULL),
  (133,'สุโขทัย',1,'สุโขทัย','พ่อขุนรามคำแหง',NULL),
  (134,'อยุธยา',1,'อยุธยา','สมเด็จพระนเรศวร',NULL),
  (135,'ธนบุรี',1,'ธนบุรี','สมเด็จพระเจ้าตากสิน',NULL),
  (136,'รัตนโกสินทร์ตอนต้น',1,'รัตนโกสินทร์ตอนต้น','รัชกาลที่ 1',NULL),
  (137,'รัชกาลที่ 5',1,'รัชกาลที่ 5','ปฏิรูปประเทศ',NULL),
  (138,'พ.ศ.2475',1,'พ.ศ.2475','เปลี่ยนการปกครอง',NULL),
  (139,'🥩 เนื้อสัตว์',1,'🥩 เนื้อสัตว์','โปรตีน',NULL),
  (140,'🍚 ข้าว',1,'🍚 ข้าว','คาร์โบไฮเดรต',NULL),
  (141,'🥑 อาโวคาโด',1,'🥑 อาโวคาโด','ไขมันดี',NULL),
  (142,'🥦 บรอกโคลี',1,'🥦 บรอกโคลี','วิตามิน',NULL),
  (143,'🦴 นม',1,'🦴 นม','แคลเซียม',NULL),
  (144,'🍊 ส้ม',1,'🍊 ส้ม','วิตามินซี',NULL),
  (145,'½ (0.5)',1,NULL,NULL,1),
  (146,'¾ (0.75)',1,NULL,NULL,2),
  (147,'1',1,NULL,NULL,3),
  (148,'1.5',1,NULL,NULL,4),
  (149,'2',1,NULL,NULL,5),
  (150,'3',1,NULL,NULL,6),
  (151,'☀️ การระเหย (Evaporation)',1,NULL,NULL,1),
  (152,'☁️ การก่อตัวของเมฆ',1,NULL,NULL,2),
  (153,'🌧️ ฝนตก (Precipitation)',1,NULL,NULL,3),
  (154,'🏔️ น้ำไหลลงสู่แม่น้ำ',1,NULL,NULL,4),
  (155,'🌊 น้ำสะสมในทะเล/แหล่งน้ำ',1,NULL,NULL,5),
  (156,'🔄 วัฏจักรเริ่มใหม่',1,NULL,NULL,6),
  (157,'📌 ประธาน (Subject)',1,NULL,NULL,1),
  (158,'🏃 กริยา (Verb)',1,NULL,NULL,2),
  (159,'🎯 กรรม (Object)',1,NULL,NULL,3),
  (160,'📍 ส่วนขยาย (Modifier)',1,NULL,NULL,4),
  (161,'❓ คำถาม (Question word)',1,NULL,NULL,5),
  (162,'🔚 เครื่องหมายวรรคตอน',1,NULL,NULL,6),
  (163,'🔵 Blue',1,NULL,NULL,1),
  (164,'🟢 Green',1,NULL,NULL,2),
  (165,'🟠 Orange',1,NULL,NULL,3),
  (166,'🔴 Red',1,NULL,NULL,4),
  (167,'🌸 Rose',1,NULL,NULL,5),
  (168,'🟡 Yellow',1,NULL,NULL,6),
  (169,'🏯 สมัยสุโขทัย (ราวพ.ศ.1800)',1,NULL,NULL,1),
  (170,'⚔️ สมัยอยุธยา (พ.ศ.1893-2310)',1,NULL,NULL,2),
  (171,'🏰 สมัยธนบุรี (พ.ศ.2310-2325)',1,NULL,NULL,3),
  (172,'👑 สมัยรัตนโกสินทร์ (พ.ศ.2325-)',1,NULL,NULL,4),
  (173,'🗳️ ประชาธิปไตย (พ.ศ.2475)',1,NULL,NULL,5),
  (174,'🇹🇭 ยุคปัจจุบัน',1,NULL,NULL,6),
  (175,'📞 โทรเรียกรถพยาบาล 1669',1,NULL,NULL,1),
  (176,'🧍 ตรวจสอบความปลอดภัยของสถานที่',1,NULL,NULL,2),
  (177,'👐 เริ่มกดหน้าอก 30 ครั้ง',1,NULL,NULL,3),
  (178,'👄 เป่าลมเข้าปาก 2 ครั้ง',1,NULL,NULL,4),
  (179,'🔄 ทำซ้ำ 30:2 จนกว่ารถพยาบาลจะมา',1,NULL,NULL,5),
  (180,'✅ ส่งต่อให้ทีมแพทย์',1,NULL,NULL,6),
  (181,'บวก',1,NULL,NULL,NULL),
  (182,'ลบ',1,NULL,NULL,NULL),
  (183,'คูณ',1,NULL,NULL,NULL),
  (184,'หาร',1,NULL,NULL,NULL),
  (185,'เลข',1,NULL,NULL,NULL),
  (186,'จำนวน',1,NULL,NULL,NULL),
  (187,'เซลล์',1,NULL,NULL,NULL),
  (188,'แสง',1,NULL,NULL,NULL),
  (189,'น้ำ',1,NULL,NULL,NULL),
  (190,'ดิน',1,NULL,NULL,NULL),
  (191,'อากาศ',1,NULL,NULL,NULL),
  (192,'พลังงาน',1,NULL,NULL,NULL),
  (193,'กิน',1,NULL,NULL,NULL),
  (194,'นอน',1,NULL,NULL,NULL),
  (195,'วิ่ง',1,NULL,NULL,NULL),
  (196,'เล่น',1,NULL,NULL,NULL),
  (197,'เรียน',1,NULL,NULL,NULL),
  (198,'อ่าน',1,NULL,NULL,NULL),
  (199,'cat',1,NULL,NULL,NULL),
  (200,'dog',1,NULL,NULL,NULL),
  (201,'fish',1,NULL,NULL,NULL),
  (202,'bird',1,NULL,NULL,NULL),
  (203,'book',1,NULL,NULL,NULL),
  (204,'pen',1,NULL,NULL,NULL),
  (205,'ไทย',1,NULL,NULL,NULL),
  (206,'กษัตริย์',1,NULL,NULL,NULL),
  (207,'ราชวงศ์',1,NULL,NULL,NULL),
  (208,'อยุธยา',1,NULL,NULL,NULL),
  (209,'ประวัติ',1,NULL,NULL,NULL),
  (210,'ชาติ',1,NULL,NULL,NULL),
  (211,'วิ่ง',1,NULL,NULL,NULL),
  (212,'นอน',1,NULL,NULL,NULL),
  (213,'อาหาร',1,NULL,NULL,NULL),
  (214,'น้ำ',1,NULL,NULL,NULL),
  (215,'สุขภาพ',1,NULL,NULL,NULL),
  (216,'ออกกำลัง',1,NULL,NULL,NULL);
-- รวม 216 คำถาม 360 คำตอบ

-- ============================================================
-- PATCH v2: เพิ่มตาราง lesson_content และ lesson_no ใน scores
-- ============================================================

-- ============================================================
-- kidlearn_patch_v2.sql
-- วิธีใช้: phpMyAdmin → เลือก kidlearn_db → แท็บ SQL → วาง → Execute
-- ============================================================


-- lesson_no อยู่ใน CREATE TABLE scores แล้ว (ข้าม ALTER)

-- 2) ตาราง lesson_content
CREATE TABLE IF NOT EXISTS lesson_content (
  content_id  INT AUTO_INCREMENT PRIMARY KEY,
  game_id     INT NOT NULL,
  lesson_no   TINYINT UNSIGNED NOT NULL DEFAULT 1,
  title       VARCHAR(200) NOT NULL,
  body        LONGTEXT COMMENT 'เนื้อหา HTML ใส่เพิ่มเองได้',
  summary     VARCHAR(300) DEFAULT NULL,
  read_time   TINYINT UNSIGNED DEFAULT 5,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_game_lesson (game_id, lesson_no),
  FOREIGN KEY (game_id) REFERENCES games(game_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3) Seed ตัวอย่าง game_id=1 ทั้ง 6 บท
INSERT IGNORE INTO lesson_content (game_id,lesson_no,title,summary,read_time,body) VALUES
(1,1,'บวกเลขหลักเดียว','เรียนรู้การบวกเลข 1-9 พร้อมเทคนิคช่วยจำ',3,'<h2>การบวกเลขหลักเดียว</h2><p>พื้นฐานสำคัญของคณิตศาสตร์ ผลบวกไม่เกิน <strong>18</strong></p><h3>ตัวอย่าง</h3><ul><li>3+4=<b>7</b></li><li>6+5=<b>11</b></li><li>9+9=<b>18</b></li></ul><h3>💡 เทคนิค</h3><p>ถ้าเกิน 10 ให้แตก เช่น 7+6=7+3+3=10+3=<b>13</b></p>'),
(1,2,'ลบเลขหลักเดียว','การลบเลข 1-9 และความสัมพันธ์กับการบวก',3,'<h2>การลบเลขหลักเดียว</h2><p>การลบคือการนับถอยหลัง</p><ul><li>9-4=<b>5</b></li><li>8-3=<b>5</b></li><li>7-7=<b>0</b></li></ul><h3>💡 เทคนิค</h3><p>ถ้า 3+4=7 แล้ว 7-4=3 และ 7-3=4</p>'),
(1,3,'บวกลบสองหลัก','การบวกลบเลขสองหลัก ทั้งแบบทดและไม่ทด',5,'<h2>บวกลบสองหลัก</h2><p>เลขสองหลัก = หลักสิบ + หลักหน่วย</p><h3>ไม่ทด</h3><p>23+15=(20+10)+(3+5)=<b>38</b></p><h3>มีทด</h3><p>27+15=27+10+5=<b>42</b></p><h3>ลบมียืม</h3><p>52-18 ยืมจากหลักสิบ → <b>34</b></p>'),
(1,4,'คูณตารางสูตร','ท่องตารางสูตรคูณ 1-12 พร้อมเทคนิค',6,'<h2>ตารางสูตรคูณ</h2><p>การคูณคือการบวกซ้ำ: 3×4=3+3+3+3=12</p><ul><li>สูตร <b>2</b>: บวกตัวเอง</li><li>สูตร <b>5</b>: ลงท้าย 0 หรือ 5</li><li>สูตร <b>9</b>: หลักสิบ+หลักหน่วย=9 เสมอ</li><li>สูตร <b>10</b>: เพิ่ม 0 ข้างหลัง</li></ul>'),
(1,5,'หารเบื้องต้น','การหารและความสัมพันธ์กับการคูณ',5,'<h2>การหารเบื้องต้น</h2><p>การหารคือการแบ่งเป็นกลุ่มเท่าๆ กัน</p><p>ถ้า 3×4=12 แล้ว 12÷3=<b>4</b>, 12÷4=<b>3</b></p><ul><li>หารด้วย 0 ไม่ได้</li><li>0÷ตัวเลขใดๆ=0</li><li>ตัวเลขใดๆ÷1=ตัวเลขนั้น</li></ul>'),
(1,6,'โจทย์ผสม','ลำดับการคำนวณ BODMAS',7,'<h2>โจทย์ผสม (BODMAS)</h2><ol><li><b>B</b>rackets วงเล็บก่อน</li><li><b>O</b>rders เลขยกกำลัง</li><li><b>D/M</b> หาร/คูณ ซ้ายไปขวา</li><li><b>A/S</b> บวก/ลบ ซ้ายไปขวา</li></ol><p>(4+6)×3=<b>30</b> | 2+3×4=<b>14</b> | 20÷4+3=<b>8</b></p>');

-- ============================================================
-- ตัวอย่างเนื้อหาบทเรียน (lessons.sql)
-- ============================================================

-- ============================================================
-- lessons.sql — เนื้อหาบทเรียน KidLearn
-- วิธีใช้: phpMyAdmin → kidlearn_db → แท็บ SQL → วาง → Execute
-- ============================================================
-- แก้ไขไฟล์นี้ใน VS Code แล้ว import ใน phpMyAdmin
-- ดูรูปแบบ HTML ที่ใส่ได้ใน CONTENT_GUIDE.md
-- ============================================================

USE kidlearn_db;

-- ── วิธีเพิ่มเนื้อหา ──────────────────────────────────────
-- INSERT INTO lesson_content (game_id, lesson_no, title, summary, read_time, body)
-- VALUES (game_id, 1-6, 'ชื่อบท', 'สรุปสั้น', นาที, '<p>HTML</p>')
-- ON DUPLICATE KEY UPDATE title=VALUES(title), summary=VALUES(summary),
--   read_time=VALUES(read_time), body=VALUES(body);

-- ── game_id reference ──────────────────────────────────────
-- คณิตศาสตร์: 1(MCQ) 2(T/F) 3(Fill) 4(Match) 5(Seq) 6(WS)
-- วิทยาศาสตร์: 7-12  ภาษาไทย: 13-18  อังกฤษ: 19-24
-- สังคมศึกษา: 25-30  สุขศึกษา: 31-36

-- ── ตัวอย่าง: คณิตศาสตร์ MCQ (game_id=1) บทที่ 1-6 ──────
INSERT INTO lesson_content (game_id, lesson_no, title, summary, read_time, body) VALUES
(1,1,'บวกเลขหลักเดียว','เรียนรู้การบวกเลข 1-9 พร้อมเทคนิคช่วยจำ',3,
'<h2>การบวกเลขหลักเดียว</h2>
<p>การบวกเลขหลักเดียวคือพื้นฐานสำคัญ ผลบวกไม่เกิน <strong>18</strong></p>
<h3>📌 ตัวอย่าง</h3>
<ul>
  <li>3 + 4 = <strong>7</strong></li>
  <li>6 + 5 = <strong>11</strong></li>
  <li>9 + 9 = <strong>18</strong></li>
</ul>
<div style="background:#EEF2FF;border-left:4px solid #4F46E5;padding:1rem;border-radius:8px;margin:1rem 0">
  💡 <strong>เทคนิค:</strong> ถ้าผลบวกเกิน 10 ให้แตกตัวเลข<br>
  เช่น 7+6 = 7+3+3 = 10+3 = <strong>13</strong>
</div>'),
(1,2,'ลบเลขหลักเดียว','การลบเลข 1-9 และความสัมพันธ์กับการบวก',3,
'<h2>การลบเลขหลักเดียว</h2>
<p>การลบคือการนับถอยหลัง — เริ่มที่ตัวตั้งแล้วนับถอยหลังตามตัวลบ</p>
<h3>📌 ตัวอย่าง</h3>
<ul><li>9 - 4 = <strong>5</strong></li><li>8 - 3 = <strong>5</strong></li></ul>
<div style="background:#F0FDF4;border-left:4px solid #10B981;padding:1rem;border-radius:8px;margin:1rem 0">
  💡 <strong>เทคนิค:</strong> ถ้า 3+4=7 แล้ว 7-4=3 และ 7-3=4
</div>'),
(1,3,'บวกลบสองหลัก','การบวกลบเลขสองหลัก แบบมีและไม่มีทด',5,
'<h2>บวกลบสองหลัก</h2>
<p>เลขสองหลัง = <strong>หลักสิบ</strong> + <strong>หลักหน่วย</strong></p>
<h3>บวกไม่ทด: 23 + 15</h3>
<p>(20+10) + (3+5) = 30+8 = <strong>38</strong></p>
<h3>บวกมีทด: 27 + 15</h3>
<p>27+10+5 = 37+5 = <strong>42</strong></p>
<h3>ลบมียืม: 52 - 18</h3>
<p>ยืมจากหลักสิบ → 12-8=4, (5-1)-1=3 → <strong>34</strong></p>'),
(1,4,'คูณตารางสูตร','ท่องตารางสูตรคูณ 1-12 พร้อมเทคนิค',6,
'<h2>ตารางสูตรคูณ</h2>
<p>การคูณ = การบวกซ้ำ: 3×4 = 3+3+3+3 = <strong>12</strong></p>
<h3>💡 เทคนิคพิเศษ</h3>
<ul>
  <li>สูตร <strong>2</strong>: คือบวกตัวเอง</li>
  <li>สูตร <strong>5</strong>: ลงท้ายด้วย 0 หรือ 5 เสมอ</li>
  <li>สูตร <strong>9</strong>: หลักสิบ+หลักหน่วย = 9 เสมอ (9×3=27, 2+7=9)</li>
  <li>สูตร <strong>10</strong>: เพิ่มเลข 0 ข้างหลัง</li>
</ul>'),
(1,5,'หารเบื้องต้น','การหารและความสัมพันธ์กับการคูณ',5,
'<h2>การหารเบื้องต้น</h2>
<p>การหาร = การแบ่งเป็นกลุ่มเท่าๆ กัน</p>
<p>ถ้า 3×4=12 แล้ว → 12÷3=<strong>4</strong> และ 12÷4=<strong>3</strong></p>
<div style="background:#FFF7ED;border-left:4px solid #F59E0B;padding:1rem;border-radius:8px;margin:1rem 0">
  ⚠️ <strong>ข้อควรจำ:</strong><br>
  • หารด้วย 0 ไม่ได้<br>
  • 0 ÷ ตัวเลขใดๆ = 0<br>
  • ตัวเลขใดๆ ÷ 1 = ตัวเลขนั้น
</div>'),
(1,6,'โจทย์ผสม','ลำดับการคำนวณ BODMAS',7,
'<h2>โจทย์ผสม — BODMAS</h2>
<ol>
  <li><strong>B</strong>rackets — วงเล็บก่อนเสมอ</li>
  <li><strong>O</strong>rders — เลขยกกำลัง</li>
  <li><strong>D/M</strong> — หาร/คูณ จากซ้ายไปขวา</li>
  <li><strong>A/S</strong> — บวก/ลบ จากซ้ายไปขวา</li>
</ol>
<h3>📌 ตัวอย่าง</h3>
<ul>
  <li>(4+6)×3 = 10×3 = <strong>30</strong> ✓</li>
  <li>2+3×4 = 2+12 = <strong>14</strong> ✓ (ไม่ใช่ 5×4=20)</li>
  <li>20÷4+3 = 5+3 = <strong>8</strong> ✓</li>
</ul>')
ON DUPLICATE KEY UPDATE
  title=VALUES(title), summary=VALUES(summary),
  read_time=VALUES(read_time), body=VALUES(body);

-- ── เพิ่มวิชาอื่นต่อจากนี้ ─────────────────────────────────
-- คัดลอก block ด้านบนแล้วเปลี่ยน game_id และเนื้อหา



-- ============================================================
-- PATCH v3: เพิ่มตารางสำหรับระบบใหม่
-- ============================================================

-- เพิ่ม role admin ในตาราง users (ถ้ายังไม่มี)
ALTER TABLE users MODIFY COLUMN role ENUM('student','parent','teacher','admin') NOT NULL DEFAULT 'student';

-- เพิ่มตาราง admins (2.0 จัดการข้อมูลผู้ใช้)
CREATE TABLE IF NOT EXISTS admins (
  admin_id   INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL UNIQUE,
  level      ENUM('super','normal') NOT NULL DEFAULT 'normal',
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- เพิ่ม field ใน subjects สำหรับ 3.0 จัดการหลักสูตร
ALTER TABLE subjects
  ADD COLUMN IF NOT EXISTS is_active TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- เพิ่ม field ใน games สำหรับครูแก้ไขคำถาม
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS updated_by INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- question_type และ hint อยู่ใน CREATE TABLE questions แล้ว

-- ตาราง reports สำหรับ 8.0 ออกรายงาน
CREATE TABLE IF NOT EXISTS reports (
  report_id   INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  report_type ENUM('score','progress','user','subject','game','recommendation') NOT NULL,
  title       VARCHAR(200) NOT NULL,
  params      JSON DEFAULT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;


-- ============================================================
-- PATCH v4: password_resets + admin user fix
-- ============================================================

-- ตาราง password_resets สำหรับระบบลืมรหัสผ่าน
CREATE TABLE IF NOT EXISTS password_resets (
  reset_id   INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  token      VARCHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used       TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_token (token)
) ENGINE=InnoDB;

-- อัปเดต admin password เป็น admin01 (รัน PHP script แยก หรือใช้ phpMyAdmin)
-- UPDATE users SET password = '$2y$10$...' WHERE username = 'admin';
-- ** ดู init_admin.php สำหรับ setup admin account **
