// Writes api/kidlearn_patch_health_missions.sql: replaces the six old health games with the
// grade-5 health and PE mission games, stored as JSON in questions.question_img so teachers can edit them.
// Usage: node scripts/seed/seed_health_missions.js [--check]
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..');
const sandbox = { window: {}, Math, console, JSON };
const load = file => vm.runInNewContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox, { filename: file });
load('js/health_missions.js');
const bankDir = path.join(root, 'js', 'health');
fs.readdirSync(bankDir).filter(f => f.endsWith('.js')).sort().forEach(f => load(`js/health/${f}`));
const kit = sandbox.window.HealthKit;

const GAMES = [
  ['health_detective', 'นักสืบสุขภาพ พิชิตภารกิจร่างกาย', '🕵️'],
  ['health_meal_chef', 'เชฟน้อยจัดจานสุขภาพ', '🍱'],
  ['health_routine', 'นักวางแผนชีวิตสุขภาพดี', '⏰'],
  ['health_sports', 'สนามกีฬาอัจฉริยะ', '⚽'],
  ['health_safety', 'ฮีโร่พิทักษ์ความปลอดภัย', '🦸'],
  ['health_teamwork', 'ภารกิจทีมเวิร์ก พิชิตปัญหา', '🤝']
];
const sql = value => `'${String(value).replace(/'/g, "''")}'`;
const LESSONS = {
  health_detective: ['นักสืบสุขภาพ: ดูแลร่างกายให้แข็งแรง', 'หาพฤติกรรมที่เป็นสาเหตุ แล้ววางแผนแก้ไขทีละขั้น', [
    ['หลักดูแลร่างกาย', ['นอนหลับวันละ 9–11 ชั่วโมง เข้านอนเป็นเวลา', 'กินอาหารเช้าทุกวัน และกินให้ครบ 5 หมู่', 'ดื่มน้ำเปล่าให้เพียงพอ', 'ล้างมือด้วยสบู่ก่อนกินอาหารและหลังเข้าห้องน้ำ แปรงฟันวันละ 2 ครั้ง ครั้งละอย่างน้อย 2 นาที', 'ขยับร่างกายอย่างน้อยวันละ 60 นาที']],
    ['วิธีคิดแบบนักสืบ', ['อ่านข้อมูลทุกส่วน: เรื่องราว ตาราง และคำพูดของตัวละคร', 'แยกว่าอะไรคือ "อาการ" และอะไรคือ "พฤติกรรมที่เป็นสาเหตุ"', 'แก้สาเหตุที่ส่งผลมากที่สุดก่อน แล้วเรียงแผนให้ทำได้จริง', 'ถ้ามีอาการเจ็บป่วย ให้บอกพ่อแม่ ครู หรือผู้ใหญ่ที่ไว้ใจ']]]],
  health_meal_chef: ['เชฟน้อย: จัดจานให้ครบ 5 หมู่', 'เลือกอาหารหลากหลาย สมดุล และเหมาะกับกิจกรรม', [
    ['อาหารหลัก 5 หมู่', ['หมู่ 1 โปรตีน: เนื้อสัตว์ ไข่ นม ถั่วเมล็ดแห้ง ช่วยสร้างและซ่อมแซมร่างกาย', 'หมู่ 2 คาร์โบไฮเดรต: ข้าว แป้ง เผือก มัน ให้พลังงาน', 'หมู่ 3 เกลือแร่: ผักต่าง ๆ', 'หมู่ 4 วิตามิน: ผลไม้ต่าง ๆ', 'หมู่ 5 ไขมัน: น้ำมัน กะทิ ไขมันจากสัตว์ ให้พลังงานและความอบอุ่น']],
    ['เคล็ดลับจัดเมนู', ['แต่ละวันควรได้ครบ 5 หมู่ และไม่กินเมนูเดิมซ้ำทุกมื้อ', 'ลดของทอด ของหวาน และน้ำหวาน เลือกดื่มน้ำเปล่าหรือนมจืด', 'วันที่ออกแรงมาก ต้องการพลังงานจากข้าวแป้งและโปรตีนมากขึ้น', 'ระดับยากมีงบประมาณ: ตรวจราคารวมก่อนเสิร์ฟ']]]],
  health_routine: ['นักวางแผน: กิจวัตรประจำวันเพื่อสุขภาพดี', 'จัดเวลาให้ครบทั้งการเรียน การเล่น การออกกำลังกาย และการพักผ่อน', [
    ['เป้าหมายใน 1 วัน (24 ชั่วโมง)', ['นอนหลับ 9–11 ชั่วโมง', 'ออกกำลังกายหรือเคลื่อนไหวอย่างน้อย 60 นาที', 'ดูจอเพื่อความบันเทิงไม่เกิน 2 ชั่วโมง', 'กินอาหาร 3 มื้อตรงเวลา']],
    ['วิธีจัดตาราง', ['แตะการ์ดกิจกรรมเพื่อเพิ่มลงตาราง เวลาจะต่อกันอัตโนมัติ', 'ใช้ปุ่ม ↑ ↓ เพื่อสลับลำดับ และ ✕ เพื่อนำออก', 'ไม่ควรออกกำลังกายหนักทันทีหลังกินอิ่ม', 'ทำการบ้านก่อนเล่นเกม และเข้านอนให้ตรงเวลา']]]],
  health_sports: ['สนามกีฬาอัจฉริยะ: เล่นเก่ง เล่นปลอดภัย', 'อบอุ่นร่างกาย เลือกทักษะให้ตรงสถานการณ์ และเล่นเป็นทีม', [
    ['ก่อน ระหว่าง และหลังเล่น', ['อบอุ่นร่างกาย 5–10 นาทีให้ตรงกับส่วนที่จะใช้', 'แต่งกายและใช้อุปกรณ์ให้เหมาะสม ดื่มน้ำเป็นระยะ', 'คลายกล้ามเนื้อหลังเล่นเสร็จ', 'เจ็บหรือเหนื่อยมากให้หยุดพักและบอกครู']],
    ['คิดก่อนเล่น', ['ดูตำแหน่งเพื่อนและคู่แข่ง หาเพื่อนที่ว่าง', 'ส่งต่อให้เพื่อนที่ได้เปรียบกว่า แทนการเล่นคนเดียว', 'เคารพกติกาและกรรมการ']]]],
  health_safety: ['ฮีโร่ความปลอดภัย: ตัดสินใจให้ปลอดภัย', 'ตั้งสติ ออกห่างจากอันตราย และขอความช่วยเหลือ', [
    ['ขั้นตอนเมื่อเจอเหตุไม่ปลอดภัย', ['ตั้งสติ ไม่ตื่นตกใจ', 'ออกห่างจากสิ่งที่เป็นอันตราย และไม่เข้าไปเสี่ยงเอง', 'บอกผู้ใหญ่ที่ไว้ใจ หรือโทรขอความช่วยเหลือ', 'บอกว่าเกิดอะไรขึ้น ที่ไหน แล้วรอความช่วยเหลือ']],
    ['เบอร์ฉุกเฉิน', ['1669 เจ็บป่วยฉุกเฉิน', '199 ไฟไหม้', '191 เหตุด่วนเหตุร้าย (ตำรวจ)']],
    ['จำไว้', ['ทางเลือกที่ดูเหมือนช่วยได้เร็ว อาจมีความเสี่ยงซ่อนอยู่ คิดถึงผลที่ตามมาก่อนเลือก', 'เรื่องเล็กที่ทำเองได้อย่างปลอดภัยทำได้ แต่ถ้าไม่แน่ใจให้แจ้งผู้ใหญ่ทุกครั้ง']]]],
  health_teamwork: ['ภารกิจทีมเวิร์ก: ร่วมมือ แก้ปัญหา มีน้ำใจนักกีฬา', 'ฟังทุกคน แบ่งหน้าที่ให้เหมาะ และตัดสินใจอย่างเป็นธรรม', [
    ['หลักทำงานเป็นทีม', ['ฟังความคิดเห็นของทุกคนก่อนตัดสินใจ', 'แบ่งหน้าที่ตามความถนัด และให้ทุกคนได้มีส่วนร่วม', 'พูดอย่างสุภาพ ใช้เหตุผล ไม่ตำหนิกัน', 'เคารพกติกา และปลอดภัยไว้ก่อนเสมอ']],
    ['ขั้นตอนแก้ความขัดแย้ง', ['ตั้งสติ ฟังทุกฝ่าย', 'ระบุว่าปัญหาจริงคืออะไร', 'ช่วยกันเสนอทางเลือก', 'ตกลงร่วมกันอย่างเป็นธรรม แล้วลงมือทำและทบทวน']],
    ['น้ำใจนักกีฬา', ['รู้แพ้ รู้ชนะ รู้อภัย', 'ชื่นชมเพื่อนและคู่แข่ง ไม่ซ้ำเติมผู้แพ้']]]]
};
const lessonBody = sections => sections.map(([head, items]) => `<h2>${head}</h2><ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>`).join('')
  + '<h2>วิธีเล่น</h2><p>เลือกระดับ ง่าย ปานกลาง หรือยาก แล้วทำภารกิจ 10 ภารกิจ แต่ละขั้นตรวจได้ 3 ครั้ง ขอคำใบ้ได้แต่จะหักคะแนนเล็กน้อย ดูคำอธิบายหลังตอบทุกครั้งเพื่อนำไปใช้ในภารกิจต่อไป</p>';

// Proves each step through the same checker the game uses: the intended answer passes, a wrong one fails.
const answerOf = s => ({
  choice: () => s.answer,
  plan: () => Object.fromEntries(s.fields.map(f => [f.id, f.answer])),
  multi: () => s.options.map((o, i) => o.ok ? i : -1).filter(i => i >= 0),
  order: () => s.items.map((_, i) => i),
  sort: () => s.items.map(it => it.bin),
  scene: () => s.options.findIndex(o => o.score === 1),
  meal: () => s.example,
  schedule: () => s.example
})[s.kind]();
const wrongOf = s => ({
  choice: () => s.options.findIndex(o => !o.ok),
  plan: () => Object.fromEntries(s.fields.map(f => [f.id, f.options.findIndex(o => !o.ok)])),
  multi: () => s.options.map((_, i) => i),
  order: () => s.items.map((_, i) => i).reverse(),
  sort: () => s.items.map(it => (it.bin + 1) % s.bins.length),
  scene: () => s.options.findIndex(o => o.score !== 1),
  meal: () => s.meals.map(() => []),
  schedule: () => s.preset || []
})[s.kind]();
function proveStep(s, at) {
  const right = kit.checkStep(s, answerOf(s));
  if (!right.ok) problems.push(`${at}: intended answer fails (${(right.why || [right.invalid]).join('; ')})`);
  const wrongInput = wrongOf(s);
  if (s.kind === 'scene' && wrongInput < 0) problems.push(`${at}: scene needs at least one option that is not the best`);
  else if (!(s.kind === 'schedule' && !s.preset) && !(s.kind === 'meal')) {
    const wrong = kit.checkStep(s, wrongInput);
    if (wrong.ok) problems.push(`${at}: a wrong answer is accepted`);
  }
  (s.options || []).forEach((o, k) => { if (o.then) proveStep(o.then, `${at} branch ${k + 1}`); });
}

const rows = [], problems = [];
for (const [code] of GAMES) {
  if (!kit.hasMissions(code)) { problems.push(`${code}: no bank in js/health/`); continue; }
  let order = 1;
  for (const level of kit.LEVELS) {
    const pool = sandbox.window.HEALTH_BANK[code][level] || [];
    if (pool.length < kit.ROUND_SIZE) problems.push(`${code}/${level}: ${pool.length} missions, need at least ${kit.ROUND_SIZE}`);
    pool.forEach((_, i) => {
      const mission = kit.normalizeMission(kit.makeMission(code, level, i));
      const errors = kit.validateMission(mission);
      errors.forEach(e => problems.push(`${code}/${level}#${i + 1} "${mission.title}": ${e}`));
      if (!errors.length) mission.steps.forEach((s, k) => proveStep(s, `${code}/${level}#${i + 1} step ${k + 1}`));
      const { title, difficulty, ...body } = mission;
      rows.push(`(${sql(code)}, ${sql(title)}, ${sql(JSON.stringify(body))}, ${sql(difficulty)}, ${order++})`);
    });
  }
}
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
if (process.argv.includes('--check')) {
  console.log(`OK: ${rows.length} missions valid`);
  process.exit(0);
}

const codeList = GAMES.map(([code]) => sql(code)).join(', ');
const out = `-- Generated by scripts/seed/seed_health_missions.js. Apply after api/kidlearn_patch_math_grade5.sql.
-- Hides the six original health games (rows, questions and scores are kept) and adds the grade-5
-- health and PE mission games. Rerunning replaces only missions no teacher has created or edited.
-- Each mission is one questions row: question_text is the title, question_img holds the mission JSON.
BEGIN;

UPDATE games SET is_active = FALSE WHERE subject_id = 6 AND game_code IS NULL;

INSERT INTO games (subject_id, game_code, is_active, name, game_type, level, icon, time_limit, question_count)
VALUES
${GAMES.map(([code, name, icon]) => `    (6, ${sql(code)}, TRUE, ${sql(name)}, 'mcq', 'medium', ${sql(icon)}, 1800, NULL)`).join(',\n')}
ON CONFLICT (game_code) DO UPDATE SET
    is_active = TRUE,
    name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    question_count = NULL;

DELETE FROM questions
WHERE game_id IN (SELECT game_id FROM games WHERE game_code IN (${codeList}))
  AND created_by IS NULL AND updated_by IS NULL;

INSERT INTO questions (game_id, question_text, question_img, difficulty, order_no, point)
SELECT g.game_id, m.title, m.body, m.difficulty, m.order_no, 10
FROM (VALUES
${rows.join(',\n')}
) AS m(game_code, title, body, difficulty, order_no)
JOIN games g ON g.game_code = m.game_code;

INSERT INTO lesson_content (game_id, lesson_no, title, body, summary, read_time)
SELECT g.game_id, 1, l.title, l.body, l.summary, 3
FROM (VALUES
${GAMES.map(([code]) => { const [title, summary, sections] = LESSONS[code]; return `(${sql(code)}, ${sql(title)}, ${sql(lessonBody(sections))}, ${sql(summary)})`; }).join(',\n')}
) AS l(game_code, title, body, summary)
JOIN games g ON g.game_code = l.game_code
ON CONFLICT (game_id, lesson_no) DO NOTHING;

COMMIT;
`;
const target = path.join(root, 'api', 'kidlearn_patch_health_missions.sql');
fs.writeFileSync(target, out);
console.log(`Wrote ${rows.length} missions (${(out.length / 1024).toFixed(0)} KB) to ${path.relative(root, target)}`);
