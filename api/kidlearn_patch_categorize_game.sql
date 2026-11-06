-- เพิ่มแบบเกม categorize (แยกหมวดหมู่) ให้ games.game_type รันซ้ำได้
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_game_type_check;
ALTER TABLE games ADD CONSTRAINT games_game_type_check
  CHECK (game_type IN ('mcq','truefalse','fill','matching','linematch','sequence','wordsearch','letterorder','categorize'));
