-- คำอธิบายเกม และบทเรียนที่ครูสร้างแยกจากเกม มอบหมายให้ห้องแบบเดียวกับเกม
-- รันหลัง kidlearn_patch_teacher_games.sql รันซ้ำได้

ALTER TABLE games ADD COLUMN IF NOT EXISTS description VARCHAR(500) DEFAULT NULL;

CREATE TABLE IF NOT EXISTS lessons (
  lesson_id   SERIAL PRIMARY KEY,
  subject_id  INT          NOT NULL REFERENCES subjects(subject_id) ON DELETE CASCADE,
  grade       VARCHAR(20)  NOT NULL CHECK (grade IN ('ป.1','ป.2','ป.3','ป.4','ป.5','ป.6')),
  title       VARCHAR(200) NOT NULL,
  body        TEXT         NOT NULL,
  created_by  INT          NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lessons_created_by ON lessons(created_by);

CREATE TABLE IF NOT EXISTS lesson_classrooms (
  lesson_id    INT NOT NULL REFERENCES lessons(lesson_id) ON DELETE CASCADE,
  classroom_id INT NOT NULL REFERENCES classrooms(classroom_id) ON DELETE CASCADE,
  PRIMARY KEY (lesson_id, classroom_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_classrooms_classroom ON lesson_classrooms(classroom_id);
-- ปิดการเข้าถึงผ่าน REST API ของ Supabase backend เชื่อมต่อในฐานะเจ้าของตารางจึงไม่ติด RLS
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_classrooms ENABLE ROW LEVEL SECURITY;
