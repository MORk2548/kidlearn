-- Add stable codes and lifecycle metadata so replacement games do not reuse
-- IDs referenced by historical scores and learning plans.
ALTER TABLE games ADD COLUMN IF NOT EXISTS game_code VARCHAR(80);
ALTER TABLE games ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS difficulty VARCHAR(10) NOT NULL DEFAULT 'medium';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS explanation TEXT;

DO $$ BEGIN
    ALTER TABLE questions ADD CONSTRAINT questions_difficulty_check
        CHECK (difficulty IN ('easy', 'medium', 'hard'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_games_game_code_unique
    ON games (game_code);

UPDATE games
SET is_active = FALSE
WHERE subject_id = 1 AND game_id BETWEEN 1 AND 6 AND game_code IS NULL;

INSERT INTO games (subject_id, game_code, is_active, name, game_type, level, icon, time_limit, question_count)
VALUES
    (1, 'math_fraction_quest', TRUE, 'ภารกิจพิชิตอาณาจักรเศษส่วน', 'mcq', 'medium', '🏰', 120, NULL),
    (1, 'math_pizza_chef', TRUE, 'เชฟน้อยพิชิตพิซซ่า', 'mcq', 'medium', '🍕', 120, NULL),
    (1, 'math_decimal_shop', TRUE, 'ร้านค้าคณิตคิดเงินไว', 'mcq', 'medium', '🛍️', 120, NULL),
    (1, 'math_decimal_treasure', TRUE, 'นักล่าสมบัติทศนิยม', 'mcq', 'medium', '🗝️', 120, NULL),
    (1, 'math_data_detective', TRUE, 'นักสืบข้อมูลมหัศจรรย์', 'mcq', 'medium', '🕵️', 120, NULL),
    (1, 'math_chart_builder', TRUE, 'สร้างกราฟพิชิตคะแนน', 'mcq', 'medium', '📊', 150, NULL)
ON CONFLICT (game_code) DO UPDATE SET
    is_active = TRUE,
    name = EXCLUDED.name,
    game_type = EXCLUDED.game_type,
    level = EXCLUDED.level,
    icon = EXCLUDED.icon,
    time_limit = EXCLUDED.time_limit,
    question_count = NULL;
