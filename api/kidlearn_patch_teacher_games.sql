-- ครูสร้างเกมเองได้: ระดับชั้น เจ้าของ สถานะ แบบเกมโยงเส้น และห้องที่มอบหมาย
-- รันหลัง kidlearn_patch_v4.sql รันซ้ำได้

ALTER TABLE games ADD COLUMN IF NOT EXISTS grade VARCHAR(20) DEFAULT NULL;
ALTER TABLE games ADD COLUMN IF NOT EXISTS created_by INT DEFAULT NULL;
-- เกมเดิมที่มีอยู่ได้ค่า published เพื่อให้หน้าคะแนนทำงานเหมือนเดิม เกมใหม่เริ่มเป็น draft
ALTER TABLE games ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'published';
ALTER TABLE games ALTER COLUMN status SET DEFAULT 'draft';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'games_grade_check') THEN
    ALTER TABLE games ADD CONSTRAINT games_grade_check
      CHECK (grade IN ('ป.1','ป.2','ป.3','ป.4','ป.5','ป.6'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'games_status_check') THEN
    ALTER TABLE games ADD CONSTRAINT games_status_check
      CHECK (status IN ('draft','published'));
  END IF;
  -- เกมที่ครูสร้างต้องมีระดับชั้น เกมเดิมก่อน patch นี้ไม่มีเจ้าของจึงเว้นได้
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'games_teacher_grade_check') THEN
    ALTER TABLE games ADD CONSTRAINT games_teacher_grade_check
      CHECK (created_by IS NULL OR grade IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'games_created_by_fkey') THEN
    ALTER TABLE games ADD CONSTRAINT games_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL;
  END IF;
END;
$$;

ALTER TABLE games DROP CONSTRAINT IF EXISTS games_game_type_check;
ALTER TABLE games ADD CONSTRAINT games_game_type_check
  CHECK (game_type IN ('mcq','truefalse','fill','matching','linematch','sequence','wordsearch','letterorder'));

CREATE INDEX IF NOT EXISTS idx_games_grade_subject ON games(grade, subject_id);

CREATE TABLE IF NOT EXISTS game_classrooms (
  game_id      INT NOT NULL REFERENCES games(game_id) ON DELETE CASCADE,
  classroom_id INT NOT NULL REFERENCES classrooms(classroom_id) ON DELETE CASCADE,
  PRIMARY KEY (game_id, classroom_id)
);

CREATE INDEX IF NOT EXISTS idx_game_classrooms_classroom ON game_classrooms(classroom_id);
-- ปิดการเข้าถึงผ่าน REST API ของ Supabase แบบเดียวกับตาราง games ส่วน backend เชื่อมต่อในฐานะเจ้าของตารางจึงไม่ติด RLS
ALTER TABLE game_classrooms ENABLE ROW LEVEL SECURITY;
