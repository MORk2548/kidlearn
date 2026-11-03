-- เกมมี 3 ด่าน ง่าย → ปานกลาง → ยาก ด่านของแต่ละข้อเก็บใน questions.difficulty และคะแนนเก็บแยกด่านใน scores.level
-- ต้องได้คะแนนสูงสุดของด่านก่อนหน้าตั้งแต่ 80 ขึ้นไปถึงเล่นด่านถัดไปได้ (ตรวจใน backend.php ไม่ได้เก็บสถานะไว้ในตาราง)
-- รันหลัง kidlearn_patch_teacher_games.sql รันซ้ำได้ backend.php เพิ่มคอลัมน์ให้เองตอนเรียกครั้งแรกด้วย

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'scores' AND column_name = 'level') THEN
    ALTER TABLE scores ADD COLUMN level VARCHAR(10) NOT NULL DEFAULT 'easy'
      CHECK (level IN ('easy','medium','hard'));
    -- ก่อน patch นี้ไม่มีอะไรใช้ difficulty ทุกข้อจึงเป็นค่าเริ่มต้น medium ย้ายไปด่านง่ายเพื่อให้นักเรียนเริ่มเล่นเกมเดิมได้
    UPDATE questions SET difficulty = 'easy';
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_scores_game_level ON scores(game_id, level);
