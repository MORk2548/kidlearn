ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE users ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE lesson_content ADD COLUMN IF NOT EXISTS created_by INT DEFAULT NULL;
ALTER TABLE lesson_content ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS created_by INT DEFAULT NULL;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS updated_by INT DEFAULT NULL;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE lesson_content SET created_by = updated_by WHERE created_by IS NULL AND updated_by IS NOT NULL;
ALTER TABLE lesson_content ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE questions ALTER COLUMN updated_at SET DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lesson_content_created_by_fkey') THEN
    ALTER TABLE lesson_content ADD CONSTRAINT lesson_content_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'questions_created_by_fkey') THEN
    ALTER TABLE questions ADD CONSTRAINT questions_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'questions_updated_by_fkey') THEN
    ALTER TABLE questions ADD CONSTRAINT questions_updated_by_fkey
      FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_lesson_content_updated_at ON lesson_content;
CREATE TRIGGER trg_lesson_content_updated_at
  BEFORE UPDATE ON lesson_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_questions_updated_at ON questions;
CREATE TRIGGER trg_questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
