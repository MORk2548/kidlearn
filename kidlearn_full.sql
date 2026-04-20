-- ============================================================
-- kidlearn_full.sql — Database Schema + Seed Data
-- สร้างโดยอัตโนมัติจาก backend.php / README
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET time_zone = '+07:00';

-- ── สร้าง Database ──────────────────────────────────────────
CREATE DATABASE IF NOT EXISTS kidlearn_db
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE kidlearn_db;

-- ============================================================
-- GROUP 1: Users
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  user_id    INT AUTO_INCREMENT PRIMARY KEY,
  username   VARCHAR(50)  NOT NULL UNIQUE,
  email      VARCHAR(100) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  role       ENUM('student','parent','teacher','officer','executive','admin') NOT NULL DEFAULT 'student',
  full_name  VARCHAR(100) NOT NULL DEFAULT '',
  is_active  TINYINT(1)   NOT NULL DEFAULT 1,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS students (
  student_id   INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL UNIQUE,
  grade        VARCHAR(20) NOT NULL DEFAULT 'ป.1',
  parent_phone VARCHAR(20) DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS parents (
  parent_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id   INT NOT NULL UNIQUE,
  phone     VARCHAR(20) DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS teachers (
  teacher_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL UNIQUE,
  department VARCHAR(100) DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS officers (
  officer_id  INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL UNIQUE,
  department  VARCHAR(100) DEFAULT NULL,
  permissions TEXT         DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS executives (
  executive_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL UNIQUE,
  title        VARCHAR(100) DEFAULT NULL,
  department   VARCHAR(100) DEFAULT NULL,
  permissions  TEXT         DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS admins (
  admin_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id  INT NOT NULL UNIQUE,
  level    ENUM('super','normal') NOT NULL DEFAULT 'normal',
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS parent_student (
  parent_id  INT NOT NULL,
  student_id INT NOT NULL,
  PRIMARY KEY (parent_id, student_id),
  FOREIGN KEY (parent_id)  REFERENCES parents(parent_id)  ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- GROUP 2: Content
-- ============================================================

CREATE TABLE IF NOT EXISTS subjects (
  subject_id  INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  description VARCHAR(300) DEFAULT NULL,
  icon        VARCHAR(10)  DEFAULT '📚',
  color       VARCHAR(20)  DEFAULT '#4F46E5',
  order_no    INT          NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS games (
  game_id    INT AUTO_INCREMENT PRIMARY KEY,
  subject_id INT NOT NULL,
  name       VARCHAR(100) NOT NULL,
  game_type  ENUM('mcq','truefalse','fill','matching','sequence','wordsearch') NOT NULL DEFAULT 'mcq',
  level      ENUM('easy','medium','hard') NOT NULL DEFAULT 'easy',
  icon       VARCHAR(10) DEFAULT '🎮',
  time_limit INT         NOT NULL DEFAULT 60,
  FOREIGN KEY (subject_id) REFERENCES subjects(subject_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS questions (
  question_id   INT AUTO_INCREMENT PRIMARY KEY,
  game_id       INT          NOT NULL,
  question_text TEXT         NOT NULL,
  question_img  MEDIUMTEXT   DEFAULT NULL,
  question_type VARCHAR(20)  NOT NULL DEFAULT 'text',
  hint          TEXT         DEFAULT NULL,
  order_no      INT          NOT NULL DEFAULT 0,
  point         INT          NOT NULL DEFAULT 10,
  FOREIGN KEY (game_id) REFERENCES games(game_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS answers (
  answer_id   INT AUTO_INCREMENT PRIMARY KEY,
  question_id INT          NOT NULL,
  answer_text VARCHAR(500) NOT NULL,
  is_correct  TINYINT(1)   NOT NULL DEFAULT 0,
  pair_left   VARCHAR(300) DEFAULT NULL,
  pair_right  VARCHAR(300) DEFAULT NULL,
  seq_order   INT          DEFAULT NULL,
  FOREIGN KEY (question_id) REFERENCES questions(question_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS lesson_content (
  content_id INT AUTO_INCREMENT PRIMARY KEY,
  game_id    INT          NOT NULL,
  lesson_no  TINYINT UNSIGNED NOT NULL DEFAULT 1,
  title      VARCHAR(200) NOT NULL DEFAULT '',
  summary    VARCHAR(500) DEFAULT NULL,
  body       LONGTEXT     DEFAULT NULL,
  read_time  INT          NOT NULL DEFAULT 5,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_game_lesson (game_id, lesson_no),
  FOREIGN KEY (game_id) REFERENCES games(game_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- GROUP 3: Scores & Progress
-- ============================================================

CREATE TABLE IF NOT EXISTS scores (
  score_id    INT AUTO_INCREMENT PRIMARY KEY,
  student_id  INT NOT NULL,
  game_id     INT NOT NULL,
  lesson_no   INT NOT NULL DEFAULT 1,
  score       INT NOT NULL DEFAULT 0,
  time_spent  INT NOT NULL DEFAULT 0,
  played_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  FOREIGN KEY (game_id)    REFERENCES games(game_id)    ON DELETE CASCADE,
  INDEX idx_student (student_id),
  INDEX idx_played  (played_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- GROUP 4: Notifications & Recommendations
-- ============================================================

CREATE TABLE IF NOT EXISTS recommendations (
  rec_id     INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT          NOT NULL,
  subject_id INT          NOT NULL,
  message    TEXT         DEFAULT NULL,
  rec_type   VARCHAR(30)  DEFAULT 'general',
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_rec (student_id, subject_id),
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(subject_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS parent_notifications (
  notif_id   INT AUTO_INCREMENT PRIMARY KEY,
  parent_id  INT          NOT NULL,
  student_id INT          NOT NULL,
  ico        VARCHAR(10)  DEFAULT '🔔',
  title      VARCHAR(200) NOT NULL DEFAULT '',
  message    TEXT         DEFAULT NULL,
  notif_type VARCHAR(30)  DEFAULT 'info',
  is_read    TINYINT(1)   NOT NULL DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id)  REFERENCES parents(parent_id)   ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  INDEX idx_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS password_resets (
  reset_id   INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT          NOT NULL,
  token      VARCHAR(64)  NOT NULL UNIQUE,
  expires_at DATETIME     NOT NULL,
  used       TINYINT(1)   NOT NULL DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_token (token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- SEED DATA: Subjects (6 วิชา)
-- ============================================================

INSERT IGNORE INTO subjects (subject_id, name, description, icon, color, order_no) VALUES
(1, 'คณิตศาสตร์',   'บวก ลบ คูณ หาร และโจทย์คณิตศาสตร์',     '🔢', '#4F46E5', 1),
(2, 'วิทยาศาสตร์',  'ธรรมชาติ สิ่งมีชีวิต และปรากฏการณ์',      '🔬', '#10B981', 2),
(3, 'ภาษาไทย',     'ไวยากรณ์ คำศัพท์ และการอ่านเขียน',         '📖', '#F59E0B', 3),
(4, 'ภาษาอังกฤษ',  'คำศัพท์ ไวยากรณ์ และการสื่อสาร',           '🌍', '#3B82F6', 4),
(5, 'สังคมศึกษา',   'ประวัติศาสตร์ ภูมิศาสตร์ และหน้าที่พลเมือง','🏛️', '#8B5CF6', 5),
(6, 'สุขศึกษา',    'สุขภาพ โภชนาการ และการออกกำลังกาย',         '💊', '#EF4444', 6);

-- ============================================================
-- SEED DATA: Games (36 เกม)
-- ============================================================

INSERT IGNORE INTO games (game_id, subject_id, name, game_type, level, icon, time_limit) VALUES
(1,  1, 'บวกลบคล่อง',           'mcq',        'easy',   '➕', 60),
(2,  1, 'จริงหรือเท็จ เลขคณิต', 'truefalse',  'easy',   '✅', 60),
(3,  1, 'เติมสมการ',             'fill',       'medium', '✏️', 90),
(4,  1, 'จับคู่สัญลักษณ์',       'matching',   'easy',   '🔗', 90),
(5,  1, 'เรียงตัวเลข',           'sequence',   'medium', '📋', 90),
(6,  1, 'ค้นหาตัวเลข',           'wordsearch', 'easy',   '🔍', 120),
(7,  2, 'โลกและอวกาศ',           'mcq',        'easy',   '🌍', 60),
(8,  2, 'จริงหรือเท็จ วิทย์',    'truefalse',  'easy',   '🧪', 60),
(9,  2, 'เติมคำวิทยาศาสตร์',     'fill',       'medium', '🔬', 90),
(10, 2, 'จับคู่อาณาจักรสิ่งมีชีวิต','matching','medium', '🌿', 90),
(11, 2, 'เรียงวัฏจักรน้ำ',        'sequence',   'medium', '🌊', 90),
(12, 2, 'ค้นหาคำวิทย์',          'wordsearch', 'easy',   '🔍', 120),
(13, 3, 'คำถามภาษาไทย',          'mcq',        'easy',   '📖', 60),
(14, 3, 'จริงหรือเท็จ ภาษาไทย',  'truefalse',  'easy',   '✔️', 60),
(15, 3, 'เติมคำภาษาไทย',         'fill',       'medium', '✏️', 90),
(16, 3, 'จับคู่ประเภทคำ',         'matching',   'medium', '📝', 90),
(17, 3, 'เรียงประโยค',            'sequence',   'medium', '📋', 90),
(18, 3, 'ค้นหาคำภาษาไทย',        'wordsearch', 'easy',   '🔍', 120),
(19, 4, 'คำศัพท์สัตว์',           'mcq',        'easy',   '🐾', 60),
(20, 4, 'จริงหรือเท็จ English',  'truefalse',  'easy',   '🅰️', 60),
(21, 4, 'เติมคำศัพท์',            'fill',       'medium', '✏️', 90),
(22, 4, 'จับคู่คำแปล',            'matching',   'easy',   '🔗', 90),
(23, 4, 'เรียง A-Z',              'sequence',   'easy',   '🔤', 60),
(24, 4, 'Word Search',            'wordsearch', 'easy',   '🔍', 120),
(25, 5, 'ถามประวัติศาสตร์',       'mcq',        'medium', '📜', 60),
(26, 5, 'จริงหรือเท็จ ประวัติ',   'truefalse',  'medium', '⚔️', 60),
(27, 5, 'เติมคำประวัติศาสตร์',    'fill',       'hard',   '✏️', 90),
(28, 5, 'จับคู่ยุคสมัย',          'matching',   'medium', '🏛️', 90),
(29, 5, 'เรียงยุคสมัยไทย',        'sequence',   'medium', '⏳', 90),
(30, 5, 'ค้นหาคำประวัติ',         'wordsearch', 'medium', '🔍', 120),
(31, 6, 'ถามสุขศึกษา',            'mcq',        'easy',   '💊', 60),
(32, 6, 'จริงหรือเท็จ สุขภาพ',   'truefalse',  'easy',   '🏃', 60),
(33, 6, 'เติมคำสุขภาพ',           'fill',       'medium', '✏️', 90),
(34, 6, 'จับคู่โภชนาการ',         'matching',   'easy',   '🥗', 90),
(35, 6, 'เรียงขั้นตอน CPR',       'sequence',   'hard',   '❤️', 90),
(36, 6, 'ค้นหาคำสุขภาพ',          'wordsearch', 'easy',   '🔍', 120);

-- ============================================================
-- SEED DATA: Default Users (Admin + Test Accounts)
-- ============================================================
-- รหัสผ่านทุกบัญชี: "password" (BCrypt hash)
-- admin → "admin01"

INSERT IGNORE INTO users (user_id, username, email, password, role, full_name, is_active) VALUES
(1,  'admin',      'admin@kidlearn.local',    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin',    'ผู้ดูแลระบบ', 1),
(2,  'teacher01',  'teacher01@kidlearn.local','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'teacher',  'ครูสมหญิง ใจดี', 1),
(3,  'student01',  'student01@kidlearn.local','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'student',  'เด็กชายสมชาย มีสุข', 1),
(4,  'parent01',   'parent01@kidlearn.local', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'parent',   'นางสาวสมใจ มีสุข', 1);

INSERT IGNORE INTO admins   (user_id, level)          VALUES (1, 'super');
INSERT IGNORE INTO teachers (user_id, department)      VALUES (2, 'วิชาการ');
INSERT IGNORE INTO students (user_id, grade, parent_phone) VALUES (3, 'ป.4', '0812345678');
INSERT IGNORE INTO parents  (user_id, phone)           VALUES (4, '0812345678');

-- เชื่อม parent ↔ student
INSERT IGNORE INTO parent_student (parent_id, student_id)
  SELECT p.parent_id, s.student_id
  FROM parents p JOIN students s ON s.parent_phone = p.phone;

SET FOREIGN_KEY_CHECKS = 1;
