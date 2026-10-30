-- รูปประกอบคำถามในเกมมีได้หลายรูป: เปลี่ยน questions.question_img (รูปเดียว) เป็น question_images (อาร์เรย์ URL)
-- รันหลัง kidlearn_patch_image_storage.sql รันซ้ำได้
-- docker compose exec -T web php scripts/db/apply-sql.php api/kidlearn_patch_question_images.sql
ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_images TEXT[] NOT NULL DEFAULT '{}';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'questions' AND column_name = 'question_img') THEN
    UPDATE questions SET question_images = ARRAY[question_img] WHERE question_img IS NOT NULL;
    ALTER TABLE questions DROP COLUMN question_img;
  END IF;
END $$;
