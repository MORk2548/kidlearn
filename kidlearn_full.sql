-- ============================================================
-- kidlearn_supabase_schema.sql
-- แปลงจาก MySQL → PostgreSQL สำหรับ Supabase
-- วิธี import: Supabase Dashboard → SQL Editor → วางทั้งหมด → Run
-- ============================================================

SET session_replication_role = replica;

-- ============================================================
-- GROUP 1: Users
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  user_id    SERIAL PRIMARY KEY,
  username   VARCHAR(50)  NOT NULL UNIQUE,
  email      VARCHAR(100) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  role       TEXT NOT NULL DEFAULT 'student'
             CHECK (role IN ('student','parent','teacher','officer','executive','admin')),
  full_name  VARCHAR(100) NOT NULL DEFAULT '',
  is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classrooms (
  classroom_id SERIAL PRIMARY KEY,
  grade        VARCHAR(20) NOT NULL CHECK (grade IN ('ป.1','ป.2','ป.3','ป.4','ป.5','ป.6')),
  room_no      SMALLINT    NOT NULL CHECK (room_no > 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (grade, room_no)
);

INSERT INTO classrooms (grade, room_no)
SELECT g, r FROM unnest(ARRAY['ป.1','ป.2','ป.3','ป.4','ป.5','ป.6']) AS g, generate_series(1, 3) AS r
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS students (
  student_id   SERIAL PRIMARY KEY,
  user_id      INT NOT NULL UNIQUE,
  grade        VARCHAR(20) NOT NULL DEFAULT 'ป.1',
  classroom_id INT DEFAULT NULL REFERENCES classrooms(classroom_id),
  parent_phone VARCHAR(20) DEFAULT NULL,
  student_no   SMALLINT DEFAULT NULL CHECK (student_no BETWEEN 1 AND 99),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_students_classroom_no ON students (classroom_id, student_no);

CREATE TABLE IF NOT EXISTS parents (
  parent_id SERIAL PRIMARY KEY,
  user_id   INT NOT NULL UNIQUE,
  phone     VARCHAR(20) DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS teachers (
  teacher_id SERIAL PRIMARY KEY,
  user_id    INT NOT NULL UNIQUE,
  department VARCHAR(100) DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS officers (
  officer_id  SERIAL PRIMARY KEY,
  user_id     INT NOT NULL UNIQUE,
  department  VARCHAR(100) DEFAULT NULL,
  permissions TEXT         DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS executives (
  executive_id SERIAL PRIMARY KEY,
  user_id      INT NOT NULL UNIQUE,
  title        VARCHAR(100) DEFAULT NULL,
  department   VARCHAR(100) DEFAULT NULL,
  permissions  TEXT         DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admins (
  admin_id SERIAL PRIMARY KEY,
  user_id  INT NOT NULL UNIQUE,
  level    TEXT NOT NULL DEFAULT 'normal'
           CHECK (level IN ('super','normal')),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS parent_student (
  parent_id  INT NOT NULL,
  student_id INT NOT NULL,
  PRIMARY KEY (parent_id, student_id),
  FOREIGN KEY (parent_id)  REFERENCES parents(parent_id)   ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
);

-- ============================================================
-- GROUP 2: Content
-- ============================================================

CREATE TABLE IF NOT EXISTS subjects (
  subject_id  SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  description VARCHAR(300) DEFAULT NULL,
  icon        VARCHAR(10)  DEFAULT '📚',
  color       VARCHAR(20)  DEFAULT '#4F46E5',
  order_no    INT          NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS games (
  game_id        SERIAL PRIMARY KEY,
  subject_id     INT NOT NULL,
  game_code      VARCHAR(80) UNIQUE,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  name           VARCHAR(100) NOT NULL,
  game_type      TEXT NOT NULL DEFAULT 'mcq'
                 CONSTRAINT games_game_type_check
                 CHECK (game_type IN ('mcq','truefalse','fill','matching','linematch','sequence','wordsearch','letterorder')),
  level          TEXT NOT NULL DEFAULT 'easy'
                 CHECK (level IN ('easy','medium','hard')),
  icon           VARCHAR(10) DEFAULT '🎮',
  time_limit     INT         NOT NULL DEFAULT 60,
  question_count INT         DEFAULT NULL,
  grade          VARCHAR(20) DEFAULT NULL
                 CONSTRAINT games_grade_check CHECK (grade IN ('ป.1','ป.2','ป.3','ป.4','ป.5','ป.6')),
  created_by     INT         DEFAULT NULL
                 CONSTRAINT games_created_by_fkey REFERENCES users(user_id) ON DELETE SET NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'draft'
                 CONSTRAINT games_status_check CHECK (status IN ('draft','published')),
  -- เกมที่ครูสร้างต้องมีระดับชั้น เกมเดิมที่ไม่มีเจ้าของเว้นได้
  CONSTRAINT games_teacher_grade_check CHECK (created_by IS NULL OR grade IS NOT NULL),
  FOREIGN KEY (subject_id) REFERENCES subjects(subject_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_games_grade_subject ON games(grade, subject_id);

CREATE TABLE IF NOT EXISTS game_classrooms (
  game_id      INT NOT NULL REFERENCES games(game_id) ON DELETE CASCADE,
  classroom_id INT NOT NULL REFERENCES classrooms(classroom_id) ON DELETE CASCADE,
  PRIMARY KEY (game_id, classroom_id)
);

CREATE INDEX IF NOT EXISTS idx_game_classrooms_classroom ON game_classrooms(classroom_id);
ALTER TABLE game_classrooms ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS questions (
  question_id   SERIAL PRIMARY KEY,
  game_id       INT  NOT NULL,
  question_text TEXT NOT NULL,
  question_img  TEXT DEFAULT NULL,
  question_type VARCHAR(20) NOT NULL DEFAULT 'text',
  difficulty    VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  explanation   TEXT DEFAULT NULL,
  hint          TEXT DEFAULT NULL,
  order_no      INT  NOT NULL DEFAULT 0,
  point         INT  NOT NULL DEFAULT 10,
  created_by    INT  DEFAULT NULL REFERENCES users(user_id) ON DELETE SET NULL,
  updated_by    INT  DEFAULT NULL REFERENCES users(user_id) ON DELETE SET NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (game_id) REFERENCES games(game_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS answers (
  answer_id      SERIAL PRIMARY KEY,
  question_id    INT          NOT NULL,
  answer_text    VARCHAR(500) NOT NULL,
  answer_img     TEXT         DEFAULT NULL,
  is_correct     BOOLEAN      NOT NULL DEFAULT FALSE,
  pair_left      VARCHAR(300) DEFAULT NULL,
  pair_left_img  TEXT         DEFAULT NULL,
  pair_right     VARCHAR(300) DEFAULT NULL,
  pair_right_img TEXT         DEFAULT NULL,
  seq_order      INT          DEFAULT NULL,
  FOREIGN KEY (question_id) REFERENCES questions(question_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lesson_content (
  content_id   SERIAL PRIMARY KEY,
  game_id      INT          NOT NULL,
  lesson_no    SMALLINT     NOT NULL DEFAULT 1,
  title        VARCHAR(200) NOT NULL DEFAULT '',
  summary      VARCHAR(500) DEFAULT NULL,
  body         TEXT         DEFAULT NULL,
  read_time    INT          NOT NULL DEFAULT 5,
  status       VARCHAR(20)  NOT NULL DEFAULT 'published',
  version_no   INT          NOT NULL DEFAULT 1,
  created_by   INT          DEFAULT NULL REFERENCES users(user_id) ON DELETE SET NULL,
  updated_by   INT          DEFAULT NULL,
  approved_by  INT          DEFAULT NULL,
  published_at TIMESTAMPTZ  DEFAULT NULL,
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (game_id, lesson_no),
  FOREIGN KEY (game_id) REFERENCES games(game_id) ON DELETE CASCADE
);

-- Trigger แทน ON UPDATE CURRENT_TIMESTAMP ของ MySQL
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lesson_content_updated_at
  BEFORE UPDATE ON lesson_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_questions_updated_at ON questions;
CREATE TRIGGER trg_questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- subject_id ว่าง = ครูประจำชั้น เห็นทุกวิชาของห้องนั้น
CREATE TABLE IF NOT EXISTS teacher_assignments (
  assignment_id   SERIAL PRIMARY KEY,
  teacher_user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  classroom_id    INT NOT NULL REFERENCES classrooms(classroom_id) ON DELETE CASCADE,
  subject_id      INT REFERENCES subjects(subject_id) ON DELETE CASCADE,
  UNIQUE NULLS NOT DISTINCT (teacher_user_id, classroom_id, subject_id)
);

-- ============================================================
-- GROUP 3: Scores & Progress
-- ============================================================

CREATE TABLE IF NOT EXISTS scores (
  score_id   SERIAL PRIMARY KEY,
  student_id INT NOT NULL,
  game_id    INT NOT NULL,
  lesson_no  INT NOT NULL DEFAULT 1,
  score      INT NOT NULL DEFAULT 0,
  time_spent INT NOT NULL DEFAULT 0,
  played_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  FOREIGN KEY (game_id)    REFERENCES games(game_id)       ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_scores_student ON scores(student_id);
CREATE INDEX IF NOT EXISTS idx_scores_played  ON scores(played_at);

-- ============================================================
-- GROUP 4: Notifications & Recommendations
-- ============================================================

CREATE TABLE IF NOT EXISTS recommendations (
  rec_id     SERIAL PRIMARY KEY,
  student_id INT  NOT NULL,
  subject_id INT  NOT NULL,
  message    TEXT DEFAULT NULL,
  rec_type   VARCHAR(30) DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, subject_id),
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(subject_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS parent_notifications (
  notif_id   SERIAL PRIMARY KEY,
  parent_id  INT          NOT NULL,
  student_id INT          NOT NULL,
  ico        VARCHAR(10)  DEFAULT '🔔',
  title      VARCHAR(200) NOT NULL DEFAULT '',
  message    TEXT         DEFAULT NULL,
  notif_type VARCHAR(30)  DEFAULT 'info',
  event_key  VARCHAR(80)  DEFAULT NULL,
  is_read    BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  FOREIGN KEY (parent_id)  REFERENCES parents(parent_id)   ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notif_parent ON parent_notifications(parent_id);

CREATE TABLE IF NOT EXISTS password_resets (
  reset_id   SERIAL PRIMARY KEY,
  user_id    INT         NOT NULL,
  token      VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reset_token ON password_resets(token);

-- ============================================================
-- GROUP 5: Advanced (Patch v3)
-- ============================================================

CREATE TABLE IF NOT EXISTS student_mastery (
  mastery_id     SERIAL PRIMARY KEY,
  student_id     INT          NOT NULL,
  subject_id     INT          NOT NULL,
  skill_key      VARCHAR(100) NOT NULL,
  skill_name     VARCHAR(160) NOT NULL,
  mastery_score  DECIMAL(5,2) NOT NULL DEFAULT 0,
  last_score     DECIMAL(5,2) NOT NULL DEFAULT 0,
  attempts_count INT          NOT NULL DEFAULT 0,
  weak_streak    INT          NOT NULL DEFAULT 0,
  strong_streak  INT          NOT NULL DEFAULT 0,
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, skill_key)
);

CREATE TRIGGER trg_mastery_updated_at
  BEFORE UPDATE ON student_mastery
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS score_attempt_details (
  attempt_id     SERIAL PRIMARY KEY,
  score_id       INT          NOT NULL,
  student_id     INT          NOT NULL,
  game_id        INT          NOT NULL,
  subject_id     INT          NOT NULL,
  skill_key      VARCHAR(100) DEFAULT NULL,
  skill_name     VARCHAR(160) DEFAULT NULL,
  question_key   VARCHAR(80)  DEFAULT NULL,
  prompt_text    TEXT         DEFAULT NULL,
  correct_answer TEXT         DEFAULT NULL,
  student_answer TEXT         DEFAULT NULL,
  is_correct     BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learning_plans (
  plan_id         SERIAL PRIMARY KEY,
  student_id      INT          NOT NULL,
  teacher_user_id INT          NOT NULL,
  title           VARCHAR(200) NOT NULL,
  description     TEXT         DEFAULT NULL,
  week_start      DATE         NOT NULL,
  due_at          TIMESTAMPTZ  DEFAULT NULL,
  status          VARCHAR(30)  NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_plans_updated_at
  BEFORE UPDATE ON learning_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS learning_plan_items (
  item_id      SERIAL PRIMARY KEY,
  plan_id      INT      NOT NULL,
  game_id      INT      NOT NULL,
  lesson_no    SMALLINT NOT NULL DEFAULT 1,
  target_score INT      NOT NULL DEFAULT 80,
  sort_order   INT      NOT NULL DEFAULT 1,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_badges (
  badge_id    SERIAL PRIMARY KEY,
  student_id  INT          NOT NULL,
  badge_code  VARCHAR(80)  NOT NULL,
  badge_title VARCHAR(160) NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  awarded_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  meta_json   JSONB        DEFAULT NULL,
  UNIQUE (student_id, badge_code)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  audit_id    SERIAL PRIMARY KEY,
  user_id     INT          DEFAULT NULL,
  actor_role  VARCHAR(40)  DEFAULT NULL,
  action_type VARCHAR(80)  NOT NULL,
  entity_type VARCHAR(80)  NOT NULL,
  entity_id   VARCHAR(80)  DEFAULT NULL,
  summary     VARCHAR(255) DEFAULT NULL,
  meta_json   JSONB        DEFAULT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lesson_content_history (
  history_id  SERIAL PRIMARY KEY,
  content_id  INT      NOT NULL,
  game_id     INT      NOT NULL,
  lesson_no   SMALLINT NOT NULL DEFAULT 1,
  title       VARCHAR(200) NOT NULL DEFAULT '',
  summary     VARCHAR(500) DEFAULT NULL,
  body        TEXT         DEFAULT NULL,
  read_time   INT          NOT NULL DEFAULT 5,
  status      VARCHAR(20)  NOT NULL DEFAULT 'draft',
  version_no  INT          NOT NULL DEFAULT 1,
  snapshot_by INT          DEFAULT NULL,
  snapshot_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SEED DATA: Subjects
-- ============================================================

INSERT INTO subjects (subject_id, name, description, icon, color, order_no) VALUES
(1,'คณิตศาสตร์', 'บวก ลบ คูณ หาร และโจทย์คณิตศาสตร์',      '🔢','#4F46E5',1),
(2,'วิทยาศาสตร์','ธรรมชาติ สิ่งมีชีวิต และปรากฏการณ์',      '🔬','#10B981',2),
(3,'ภาษาไทย',   'ไวยากรณ์ คำศัพท์ และการอ่านเขียน',         '📖','#F59E0B',3),
(4,'ภาษาอังกฤษ','คำศัพท์ ไวยากรณ์ และการสื่อสาร',           '🌍','#3B82F6',4),
(5,'สังคมศึกษา', 'ประวัติศาสตร์ ภูมิศาสตร์ และหน้าที่พลเมือง','🏛️','#8B5CF6',5),
(6,'สุขศึกษา',  'สุขภาพ โภชนาการ และการออกกำลังกาย',         '💊','#EF4444',6)
ON CONFLICT (subject_id) DO NOTHING;

SELECT setval('subjects_subject_id_seq', (SELECT MAX(subject_id) FROM subjects));

-- ============================================================
-- SEED DATA: Default Users (รหัสผ่าน: "password")
-- ============================================================

INSERT INTO users (user_id, username, email, password, role, full_name, is_active) VALUES
(1,'admin',    'admin@kidlearn.local',    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','admin',  'ผู้ดูแลระบบ',       TRUE),
(2,'teacher01','teacher01@kidlearn.local','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','teacher','ครูสมหญิง ใจดี',   TRUE),
(3,'student01','student01@kidlearn.local','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','student','เด็กชายสมชาย มีสุข',TRUE),
(4,'parent01', 'parent01@kidlearn.local', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','parent', 'นางสาวสมใจ มีสุข', TRUE)
ON CONFLICT (user_id) DO NOTHING;

SELECT setval('users_user_id_seq', (SELECT MAX(user_id) FROM users));

INSERT INTO admins   (user_id, level)               VALUES (1,'super')        ON CONFLICT DO NOTHING;
INSERT INTO teachers (user_id, department)          VALUES (2,'วิชาการ')       ON CONFLICT DO NOTHING;
INSERT INTO students (user_id, grade, parent_phone) VALUES (3,'ป.4','0812345678') ON CONFLICT DO NOTHING;
INSERT INTO parents  (user_id, phone)               VALUES (4,'0812345678')   ON CONFLICT DO NOTHING;

INSERT INTO parent_student (parent_id, student_id)
  SELECT p.parent_id, s.student_id
  FROM parents p JOIN students s ON s.parent_phone = p.phone
ON CONFLICT DO NOTHING;

SET session_replication_role = DEFAULT;
