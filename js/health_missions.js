// ══════════════════════════════════════════════════════
// HEALTH MISSIONS — ภารกิจสุขศึกษาและพลศึกษา ป.5
// A mission is { title, icon, difficulty, story:[...], tip?, context:[blocks], steps:[step] }.
// It is stored as JSON in questions.question_img (title and difficulty live in their own columns),
// so the same shape is played by js/game.js, edited by js/mission_editor.js and seeded by
// scripts/seed/seed_health_missions.js. Mission banks live in js/health/*.js.
// ══════════════════════════════════════════════════════
(function () {
  const LEVELS = ['easy', 'medium', 'hard'];
  const ROUND_SIZE = 10;
  const FOOD_GROUPS = {
    1: { name: 'หมู่ 1 โปรตีน', short: 'โปรตีน', icon: '🥚' },
    2: { name: 'หมู่ 2 คาร์โบไฮเดรต', short: 'คาร์โบไฮเดรต', icon: '🍚' },
    3: { name: 'หมู่ 3 เกลือแร่ (ผัก)', short: 'ผัก', icon: '🥦' },
    4: { name: 'หมู่ 4 วิตามิน (ผลไม้)', short: 'ผลไม้', icon: '🍎' },
    5: { name: 'หมู่ 5 ไขมัน', short: 'ไขมัน', icon: '🥑' }
  };
  const ACTIVITY_CATS = {
    sleep: 'นอนหลับ', school: 'เรียนที่โรงเรียน', study: 'ทบทวน/การบ้าน', exercise: 'ออกกำลังกาย', meal: 'รับประทานอาหาร',
    hygiene: 'ดูแลความสะอาด', travel: 'เดินทาง', free: 'เวลาว่าง/งานอดิเรก', screen: 'ดูจอ/เล่นเกม', chore: 'ช่วยงานบ้าน'
  };
  const ADVICE = {
    analysis: 'อ่านข้อมูลทุกส่วนก่อนตัดสินใจ แล้วถามตัวเองว่า "ข้อมูลไหนเป็นสาเหตุ ข้อมูลไหนเป็นผลที่ตามมา"',
    planning: 'ก่อนวางแผน ให้เขียนเงื่อนไขทั้งหมดไว้ แล้วตรวจทีละข้อหลังจัดเสร็จ',
    reason: 'ฝึกอธิบายว่าทำไมจึงเลือกแบบนั้น โดยอ้างหลักสุขภาพหรือความปลอดภัย ไม่ใช่แค่ความชอบ',
    decision: 'เมื่อต้องตัดสินใจ ให้คิดถึงผลที่ตามมาของแต่ละทางเลือก และเลือกทางที่ปลอดภัยที่สุดก่อนเสมอ',
    rules: 'ทบทวนเงื่อนไขของโจทย์ให้ครบ เช่น เวลา งบประมาณ และกติกา ก่อนกดส่งคำตอบ'
  };

  const isText = v => typeof v === 'string' && v.trim() !== '';
  const isInt = v => Number.isInteger(v);
  const clone = v => JSON.parse(JSON.stringify(v));
  const shuffle = list => {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  const okCount = options => options.filter(o => o.ok).length;
  const toMin = hhmm => { const [h, m] = String(hhmm).split(':').map(Number); return h * 60 + m; };
  const clock = minutes => { const m = ((minutes % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
  const hours = minutes => { const h = Math.floor(minutes / 60), m = minutes % 60; return h && m ? `${h} ชม. ${m} นาที` : h ? `${h} ชม.` : `${m} นาที`; };

  // ── Meal planner ───────────────────────────────────────
  const scopeMeals = (s, scope) => scope === undefined || scope === null || scope === 'all' ? s.meals.map((_, i) => i) : [scope];
  const mealFoods = (s, picks, scope) => scopeMeals(s, scope).flatMap(i => (picks[i] || []).map(f => s.foods[f]));
  const MEAL_RULES = {
    groups: (s, picks, r) => {
      const have = new Set(mealFoods(s, picks, r.scope).flatMap(f => f.groups));
      const missing = r.groups.filter(g => !have.has(g));
      return missing.length ? `ยังขาด${missing.map(g => FOOD_GROUPS[g].name).join(', ')}` : null;
    },
    budget: (s, picks, r) => {
      const total = mealFoods(s, picks, r.scope).reduce((n, f) => n + f.price, 0);
      return total > r.max ? `ใช้เงิน ${total} บาท เกินงบ ${r.max} บาทไป ${total - r.max} บาท` : null;
    },
    maxTag: (s, picks, r) => {
      const n = mealFoods(s, picks, r.scope).filter(f => (f.tags || []).includes(r.tag)).length;
      return n > r.max ? `มีอาหารประเภท "${r.tagLabel || r.tag}" ${n} อย่าง แต่ให้มีได้ไม่เกิน ${r.max} อย่าง` : null;
    },
    minTag: (s, picks, r) => {
      const n = mealFoods(s, picks, r.scope).filter(f => (f.tags || []).includes(r.tag)).length;
      return n < r.min ? `ต้องมีอาหารประเภท "${r.tagLabel || r.tag}" อย่างน้อย ${r.min} อย่าง (ตอนนี้มี ${n})` : null;
    },
    noRepeat: (s, picks) => {
      const all = picks.flat();
      const dup = all.find((f, i) => all.indexOf(f) !== i);
      return dup === undefined ? null : `เลือก "${s.foods[dup].name}" ซ้ำกันหลายมื้อ ควรเปลี่ยนให้หลากหลาย`;
    }
  };
  const MEAL_RULE_LABELS = {
    groups: r => `${r.scope === 'all' || r.scope == null ? 'ทั้งวัน' : 'มื้อนี้'}มีอาหาร ${r.groups.map(g => FOOD_GROUPS[g].short).join(' ')}`,
    budget: r => `ใช้เงินรวมไม่เกิน ${r.max} บาท`,
    maxTag: r => r.max === 0 ? `ไม่มี"${r.tagLabel || r.tag}"` : `"${r.tagLabel || r.tag}" ไม่เกิน ${r.max} อย่าง`,
    minTag: r => `มี"${r.tagLabel || r.tag}" อย่างน้อย ${r.min} อย่าง`,
    noRepeat: () => 'ไม่เลือกเมนูเดิมซ้ำ'
  };
  const ruleLabel = (table, r) => isText(r.label) ? r.label : table[r.type](r);
  function mealProblems(s, picks) {
    const why = [];
    s.meals.forEach((meal, i) => {
      const n = (picks[i] || []).length;
      if (n < meal.min) why.push(`${meal.label}: เลือกอย่างน้อย ${meal.min} อย่าง (ตอนนี้ ${n})`);
      if (n > meal.max) why.push(`${meal.label}: เลือกได้ไม่เกิน ${meal.max} อย่าง (ตอนนี้ ${n})`);
    });
    s.rules.forEach(r => {
      const problem = MEAL_RULES[r.type](s, picks, r);
      if (problem) why.push(`${ruleLabel(MEAL_RULE_LABELS, r)}: ${problem}`);
    });
    return why;
  }
  const mealText = (s, picks) => s.meals.map((meal, i) => `${meal.label}: ${(picks[i] || []).map(f => s.foods[f].name).join(' + ') || '-'}`).join(' · ');

  // ── Daily routine ──────────────────────────────────────
  // A schedule is an ordered list of card indexes starting at s.start; each card runs back to back.
  const timeline = (s, order) => {
    let t = toMin(s.start);
    return order.map(c => { const row = { card: c, from: t, to: t + s.cards[c].minutes }; t = row.to; return row; });
  };
  const catMinutes = (s, order, cat) => order.filter(c => s.cards[c].cat === cat).reduce((n, c) => n + s.cards[c].minutes, 0);
  const cardName = (s, c) => s.cards[c]?.label || '?';
  const SCHEDULE_RULES = {
    total: (s, order, r) => {
      const total = order.reduce((n, c) => n + s.cards[c].minutes, 0);
      if (total > r.max) return `เวลารวม ${hours(total)} เกิน ${hours(r.max)}`;
      if (r.min && total < r.min) return `เวลารวมเพียง ${hours(total)} ยังไม่ครบ ${hours(r.min)}`;
      return null;
    },
    catMin: (s, order, r) => { const n = catMinutes(s, order, r.cat); return n < r.min ? `${ACTIVITY_CATS[r.cat]}รวม ${hours(n)} ยังน้อยกว่า ${hours(r.min)}` : null; },
    catMax: (s, order, r) => { const n = catMinutes(s, order, r.cat); return n > r.max ? `${ACTIVITY_CATS[r.cat]}รวม ${hours(n)} มากกว่า ${hours(r.max)}` : null; },
    include: (s, order, r) => order.includes(r.card) ? null : `ยังไม่มี "${cardName(s, r.card)}" ในตาราง`,
    exclude: (s, order, r) => order.includes(r.card) ? `"${cardName(s, r.card)}" ไม่ควรอยู่ในตารางวันนี้` : null,
    before: (s, order, r) => {
      const a = order.indexOf(r.a), b = order.indexOf(r.b);
      return a >= 0 && b >= 0 && a > b ? `"${cardName(s, r.a)}" ต้องมาก่อน "${cardName(s, r.b)}"` : null;
    },
    notAfter: (s, order, r) => {
      const a = order.indexOf(r.a);
      return a >= 0 && order[a + 1] === r.b ? `"${cardName(s, r.b)}" ไม่ควรต่อจาก "${cardName(s, r.a)}" ทันที` : null;
    },
    first: (s, order, r) => order[0] === r.card ? null : `กิจกรรมแรกของวันควรเป็น "${cardName(s, r.card)}"`,
    last: (s, order, r) => order[order.length - 1] === r.card ? null : `กิจกรรมสุดท้ายของวันควรเป็น "${cardName(s, r.card)}"`,
    startBy: (s, order, r) => {
      const row = timeline(s, order).find(x => x.card === r.card);
      const deadline = toMin(r.time) + (toMin(r.time) < toMin(s.start) ? 1440 : 0);
      return row && row.from > deadline ? `"${cardName(s, r.card)}" เริ่ม ${clock(row.from)} ช้ากว่า ${r.time}` : null;
    }
  };
  const SCHEDULE_RULE_LABELS = {
    total: r => r.min ? `เวลารวม ${hours(r.min)} พอดี` : `เวลารวมไม่เกิน ${hours(r.max)}`,
    catMin: r => `${ACTIVITY_CATS[r.cat]}อย่างน้อย ${hours(r.min)}`,
    catMax: r => `${ACTIVITY_CATS[r.cat]}ไม่เกิน ${hours(r.max)}`,
    include: () => 'มีกิจกรรมที่จำเป็น',
    exclude: () => 'ไม่มีกิจกรรมที่ไม่เหมาะสม',
    before: () => 'เรียงลำดับก่อนหลังให้เหมาะสม',
    notAfter: () => 'ไม่จัดกิจกรรมที่ขัดกันต่อกัน',
    first: () => 'เริ่มวันอย่างเหมาะสม',
    last: () => 'จบวันอย่างเหมาะสม',
    startBy: r => `เริ่มตามเวลาที่กำหนด (ไม่เกิน ${r.time})`
  };
  function scheduleProblems(s, order) {
    return s.rules.map(r => {
      const problem = SCHEDULE_RULES[r.type](s, order, r);
      return problem && `${ruleLabel(SCHEDULE_RULE_LABELS, r)}: ${problem}`;
    }).filter(Boolean);
  }
  const scheduleText = (s, order) => timeline(s, order).map(r => `${clock(r.from)} ${cardName(s, r.card)}`).join(' → ');

  // ── Checking ───────────────────────────────────────────
  const STEP_CHECKS = {
    choice(s, index) {
      if (!isInt(index)) return { invalid: 'เลือกคำตอบก่อน' };
      const option = s.options[index];
      return { ok: index === s.answer, why: index === s.answer ? [] : [option.why || 'ยังไม่ถูก ลองพิจารณาอีกครั้ง'], shown: option.text };
    },
    plan(s, picks) {
      if (s.fields.some(f => !isInt(picks?.[f.id]))) return { invalid: 'เลือกให้ครบทุกหัวข้อก่อนส่ง' };
      const wrong = s.fields.filter(f => picks[f.id] !== f.answer);
      return { ok: !wrong.length, why: wrong.map(f => `${f.label}: ${f.options[picks[f.id]].why || 'ยังไม่เหมาะ'}`), wrongFields: wrong.map(f => f.id), shown: s.fields.map(f => `${f.label}: ${f.options[picks[f.id]].text}`).join(' · ') };
    },
    multi(s, picked) {
      if (!picked?.length) return { invalid: 'เลือกอย่างน้อย 1 ข้อก่อนส่ง' };
      const extra = picked.filter(i => !s.options[i].ok);
      const missing = s.options.map((o, i) => i).filter(i => s.options[i].ok && !picked.includes(i));
      const why = extra.map(i => `"${s.options[i].text}" ${s.options[i].why || 'ไม่ใช่คำตอบของข้อนี้'}`);
      if (missing.length) why.push(`ยังขาดอีก ${missing.length} ข้อที่ควรเลือก อ่านข้อมูลอีกครั้ง`);
      return { ok: !why.length, why, wrongItems: extra, shown: picked.map(i => s.options[i].text).join(', ') };
    },
    order(s, order) {
      if (!Array.isArray(order) || order.length !== s.items.length || order.some(i => !isInt(i))) return { invalid: 'วางให้ครบทุกช่องก่อนส่ง' };
      const right = order.filter((item, pos) => item === pos).length;
      return { ok: right === s.items.length, why: right === s.items.length ? [] : [`อยู่ถูกตำแหน่ง ${right} จาก ${s.items.length} ลำดับ ลองคิดว่าอะไรต้องทำก่อนจึงจะทำขั้นต่อไปได้`], wrongSlots: order.map((item, pos) => item === pos ? -1 : pos).filter(p => p >= 0), shown: order.map(i => s.items[i]).join(' → ') };
    },
    sort(s, bins) {
      if (!Array.isArray(bins) || bins.length !== s.items.length || bins.some(b => !isInt(b))) return { invalid: 'จัดให้ครบทุกการ์ดก่อนส่ง' };
      const wrong = s.items.map((it, i) => i).filter(i => bins[i] !== s.items[i].bin);
      return { ok: !wrong.length, why: wrong.map(i => `"${s.items[i].text}" ${s.items[i].why || `ควรอยู่ในกลุ่ม ${s.bins[s.items[i].bin]}`}`), wrongItems: wrong, shown: s.bins.map((b, k) => `${b}: ${s.items.filter((_, i) => bins[i] === k).map(it => it.text).join(', ') || '-'}`).join(' · ') };
    },
    scene(s, index) {
      if (!isInt(index)) return { invalid: 'เลือกทางที่จะทำก่อน' };
      const option = s.options[index];
      return { ok: option.score === 1, credit: option.score, final: true, why: [], shown: option.text, result: option.result, then: option.then || null };
    },
    meal(s, picks) {
      if (!Array.isArray(picks) || picks.every(p => !p?.length)) return { invalid: 'เลือกอาหารใส่จานก่อนส่ง' };
      const why = mealProblems(s, picks);
      return { ok: !why.length, why, shown: mealText(s, picks) };
    },
    schedule(s, order) {
      if (!Array.isArray(order) || !order.length) return { invalid: 'วางการ์ดกิจกรรมลงในตารางก่อนส่ง' };
      const why = scheduleProblems(s, order);
      return { ok: !why.length, why, shown: scheduleText(s, order) };
    }
  };
  const checkStep = (s, input) => STEP_CHECKS[s.kind](s, input);

  function answerText(s) {
    if (s.kind === 'choice') return s.options[s.answer].text;
    if (s.kind === 'plan') return s.fields.map(f => `${f.label}: ${f.options[f.answer].text}`).join(' · ');
    if (s.kind === 'multi') return s.options.filter(o => o.ok).map(o => o.text).join(', ');
    if (s.kind === 'order') return s.items.join(' → ');
    if (s.kind === 'sort') return s.bins.map((b, k) => `${b}: ${s.items.filter(it => it.bin === k).map(it => it.text).join(', ')}`).join(' · ');
    if (s.kind === 'scene') return s.options.filter(o => o.score === 1).map(o => o.text).join(' / ');
    if (s.kind === 'meal') return mealText(s, s.example);
    if (s.kind === 'schedule') return scheduleText(s, s.example);
    return '';
  }

  // ── Missions and rounds ────────────────────────────────
  const bank = code => (window.HEALTH_BANK || {})[code];
  const hasMissions = code => Boolean(bank(code));
  function makeMission(code, level, index) {
    const pool = bank(code)?.[level] || bank(code)?.medium || [];
    const source = isInt(index) ? pool[index % pool.length] : pool[Math.floor(Math.random() * pool.length)];
    return { ...clone(source), difficulty: level };
  }
  function buildRound(code, level) {
    const pool = bank(code)?.[level] || [];
    return shuffle(pool).slice(0, ROUND_SIZE).map(m => normalizeMission({ ...clone(m), difficulty: level }));
  }

  // Recomputes derived fields so a teacher-edited mission stays self-consistent. Rule labels are
  // not stored: an empty label is rebuilt from the rule's numbers each time, so edits never go stale.
  function normalizeStep(s) {
    if (s.kind === 'choice' && Array.isArray(s.options)) s.answer = s.options.findIndex(o => o.ok);
    if (s.kind === 'plan' && Array.isArray(s.fields)) s.fields.forEach(f => { f.answer = f.options.findIndex(o => o.ok); });
    if (s.kind === 'scene' && Array.isArray(s.options)) s.options.forEach(o => { o.score = Number(o.score) || 0; if (o.then) normalizeStep(o.then); });
    if (s.kind === 'meal' && Array.isArray(s.rules) && Array.isArray(s.meals)) {
      if (Array.isArray(s.example)) s.solution = [`ตัวอย่างที่ผ่านทุกเงื่อนไข: ${mealText(s, s.example)}`, ...s.rules.map(r => `✓ ${ruleLabel(MEAL_RULE_LABELS, r)}`), ...(s.notes || [])];
    }
    if (s.kind === 'schedule' && Array.isArray(s.rules) && Array.isArray(s.cards)) {
      if (Array.isArray(s.example)) s.solution = [`ตัวอย่างตารางที่ผ่านทุกเงื่อนไข: ${scheduleText(s, s.example)}`, ...s.rules.map(r => `✓ ${ruleLabel(SCHEDULE_RULE_LABELS, r)}`), ...(s.notes || [])];
    }
    return s;
  }
  function normalizeMission(m) {
    if (!Array.isArray(m.context)) m.context = [];
    (m.steps || []).forEach(normalizeStep);
    return m;
  }

  const validCard = (s, c) => isInt(c) && c >= 0 && c < s.cards.length;
  function validateStep(s, bad, nested) {
    if (!STEP_CHECKS[s.kind]) return bad('ชนิดคำถามไม่รู้จัก');
    if (!isText(s.prompt)) bad('ใส่คำถาม');
    if (!isInt(s.points) || s.points < 1) bad('คะแนนต้องเป็นจำนวนเต็มบวก');
    if (!Array.isArray(s.hints) || !s.hints.every(isText)) bad('คำใบ้ต้องเป็นข้อความทีละบรรทัด');
    if (!Array.isArray(s.solution) || !s.solution.length || !s.solution.every(isText)) bad('ใส่คำอธิบายเฉลยอย่างน้อย 1 บรรทัด');
    const optionsOk = list => Array.isArray(list) && list.length >= 2 && list.every(o => isText(o.text));
    if (s.kind === 'choice' && (!optionsOk(s.options) || okCount(s.options) !== 1)) bad('ต้องมีตัวเลือกอย่างน้อย 2 ข้อ และคำตอบถูกเพียง 1 ข้อ');
    if (s.kind === 'plan') (s.fields || []).forEach(f => {
      if (!isText(f.id) || !isText(f.label) || !optionsOk(f.options) || okCount(f.options) !== 1) bad(`หัวข้อ "${f.label || '?'}" ต้องมีตัวเลือกอย่างน้อย 2 ข้อ และคำตอบถูกเพียง 1 ข้อ`);
    });
    if (s.kind === 'plan' && !(s.fields || []).length) bad('ต้องมีอย่างน้อย 1 หัวข้อ');
    if (s.kind === 'multi' && (!optionsOk(s.options) || okCount(s.options) < 1 || okCount(s.options) === s.options.length)) bad('ต้องมีตัวเลือกที่ถูกอย่างน้อย 1 ข้อ และตัวเลือกที่ไม่ถูกอย่างน้อย 1 ข้อ');
    if (s.kind === 'order' && (!Array.isArray(s.items) || s.items.length < 3 || !s.items.every(isText) || new Set(s.items).size !== s.items.length)) bad('ต้องมีอย่างน้อย 3 ขั้น และข้อความไม่ซ้ำกัน');
    if (s.kind === 'sort') {
      if (!Array.isArray(s.bins) || s.bins.length < 2 || !s.bins.every(isText)) bad('ต้องมีกลุ่มอย่างน้อย 2 กลุ่ม');
      else if (!Array.isArray(s.items) || s.items.length < 3 || !s.items.every(it => isText(it.text) && isInt(it.bin) && it.bin >= 0 && it.bin < s.bins.length)) bad('ทุกการ์ดต้องมีข้อความและเลือกกลุ่มที่ถูก (อย่างน้อย 3 การ์ด)');
    }
    if (s.kind === 'scene') {
      if (!optionsOk(s.options) || !s.options.every(o => [0, 0.5, 1].includes(o.score) && isText(o.result))) bad('ทุกทางเลือกต้องมีข้อความ ผลที่เกิดขึ้น และคะแนน 0, 0.5 หรือ 1');
      else if (!s.options.some(o => o.score === 1)) bad('ต้องมีทางเลือกที่ดีที่สุด (คะแนน 1) อย่างน้อย 1 ทาง');
      (s.options || []).forEach((o, k) => {
        if (!o.then) return;
        if (nested) return bad('ทางเลือกในเหตุการณ์ต่อเนื่องแตกเรื่องต่อไม่ได้อีก');
        validateStep(o.then, text => bad(`เหตุการณ์ต่อจากทางเลือกที่ ${k + 1}: ${text}`), true);
      });
    }
    if (s.kind === 'meal') {
      if (!Array.isArray(s.foods) || s.foods.length < 3 || !s.foods.every(f => isText(f.name) && isInt(f.price) && f.price >= 0 && Array.isArray(f.groups) && f.groups.every(g => FOOD_GROUPS[g]))) return bad('อาหารทุกเมนูต้องมีชื่อ ราคาเป็นจำนวนเต็ม และหมู่อาหาร 1–5 หรือเว้นว่างสำหรับน้ำเปล่า (อย่างน้อย 3 เมนู)');
      if (!Array.isArray(s.meals) || !s.meals.length || !s.meals.every(m => isText(m.label) && isInt(m.min) && isInt(m.max) && m.min >= 1 && m.max >= m.min)) return bad('ทุกมื้อต้องมีชื่อ และจำนวนอาหารต่ำสุด/สูงสุดที่ถูกต้อง');
      if (!Array.isArray(s.rules) || !s.rules.every(r => MEAL_RULES[r.type])) return bad('เงื่อนไขอาหารมีชนิดที่ไม่รู้จัก');
      const scopeOk = r => r.scope == null || r.scope === 'all' || (isInt(r.scope) && r.scope >= 0 && r.scope < s.meals.length);
      s.rules.forEach((r, k) => {
        if (!scopeOk(r)) bad(`เงื่อนไขที่ ${k + 1}: เลือกมื้อให้ถูกต้อง`);
        if (r.type === 'groups' && !(Array.isArray(r.groups) && r.groups.length && r.groups.every(g => FOOD_GROUPS[g]))) bad(`เงื่อนไขที่ ${k + 1}: เลือกหมู่อาหาร`);
        if (r.type === 'budget' && !(isInt(r.max) && r.max > 0)) bad(`เงื่อนไขที่ ${k + 1}: งบประมาณต้องเป็นจำนวนเต็มบวก`);
        if ((r.type === 'maxTag' || r.type === 'minTag') && !(isText(r.tag) && isInt(r.type === 'maxTag' ? r.max : r.min))) bad(`เงื่อนไขที่ ${k + 1}: ใส่ป้ายอาหารและจำนวน`);
      });
      if (!Array.isArray(s.example) || s.example.length !== s.meals.length || !s.example.every(p => Array.isArray(p) && p.every(f => isInt(f) && f >= 0 && f < s.foods.length) && new Set(p).size === p.length)) return bad('ใส่เมนูตัวอย่างที่ถูกต้องให้ครบทุกมื้อ');
      if (s.rules.length && !errorsFree(() => mealProblems(s, s.example), bad, 'เมนูตัวอย่าง')) return;
    }
    if (s.kind === 'schedule') {
      if (!/^\d{2}:\d{2}$/.test(String(s.start))) return bad('เวลาเริ่มต้องเป็นรูปแบบ 06:00');
      if (!Array.isArray(s.cards) || s.cards.length < 3 || !s.cards.every(c => isText(c.label) && isInt(c.minutes) && c.minutes > 0 && ACTIVITY_CATS[c.cat])) return bad('การ์ดกิจกรรมทุกใบต้องมีชื่อ เวลาเป็นนาที และประเภท (อย่างน้อย 3 ใบ)');
      if (!Array.isArray(s.rules) || !s.rules.length || !s.rules.every(r => SCHEDULE_RULES[r.type])) return bad('ต้องมีเงื่อนไขของตารางที่ระบบรู้จักอย่างน้อย 1 ข้อ');
      s.rules.forEach((r, k) => {
        const at = `เงื่อนไขที่ ${k + 1}`;
        if (['include', 'exclude', 'first', 'last', 'startBy'].includes(r.type) && !validCard(s, r.card)) bad(`${at}: เลือกการ์ดกิจกรรม`);
        if (['before', 'notAfter'].includes(r.type) && !(validCard(s, r.a) && validCard(s, r.b) && r.a !== r.b)) bad(`${at}: เลือกการ์ดสองใบที่ต่างกัน`);
        if (['catMin', 'catMax'].includes(r.type) && !(ACTIVITY_CATS[r.cat] && isInt(r.type === 'catMin' ? r.min : r.max))) bad(`${at}: เลือกประเภทกิจกรรมและเวลาเป็นนาที`);
        if (r.type === 'total' && !isInt(r.max)) bad(`${at}: เวลารวมสูงสุดต้องเป็นนาที`);
        if (r.type === 'startBy' && !/^\d{2}:\d{2}$/.test(String(r.time))) bad(`${at}: เวลาต้องเป็นรูปแบบ 21:00`);
      });
      const listOk = list => Array.isArray(list) && list.every(c => validCard(s, c)) && new Set(list).size === list.length;
      if (s.preset !== undefined && !listOk(s.preset)) bad('ตารางเริ่มต้นใช้การ์ดที่ไม่มีอยู่หรือซ้ำกัน');
      if (!listOk(s.example) || !s.example.length) return bad('ใส่ตารางตัวอย่างที่ถูกต้อง');
      errorsFree(() => scheduleProblems(s, s.example), bad, 'ตารางตัวอย่าง');
      if (s.preset && !scheduleProblems(s, s.preset).length) bad('ตารางเริ่มต้นผ่านทุกเงื่อนไขอยู่แล้ว ผู้เล่นไม่ต้องแก้อะไร');
    }
  }
  function errorsFree(run, bad, what) {
    let problems;
    try { problems = run(); } catch (e) { bad(`${what}: ตรวจไม่ได้ (${e.message})`); return false; }
    problems.forEach(p => bad(`${what}ยังไม่ผ่าน: ${p}`));
    return !problems.length;
  }

  // Thai messages a teacher can act on; an empty list means the mission is playable.
  function validateMission(m) {
    const errors = [];
    if (!m || typeof m !== 'object') return ['ข้อมูลภารกิจไม่ถูกต้อง'];
    if (!isText(m.title)) errors.push('ใส่ชื่อภารกิจ');
    if (!LEVELS.includes(m.difficulty)) errors.push('เลือกระดับความยาก');
    if (!Array.isArray(m.story) || !m.story.length || !m.story.every(isText)) errors.push('เรื่องราวต้องเป็นข้อความทีละบรรทัด');
    (Array.isArray(m.context) ? m.context : []).forEach((b, i) => {
      const at = `ข้อมูลประกอบที่ ${i + 1}`;
      if (b.type === 'table' && !(Array.isArray(b.head) && b.head.length && Array.isArray(b.rows) && b.rows.every(r => r.length === b.head.length))) errors.push(`${at}: ทุกแถวต้องมีจำนวนช่องเท่ากับหัวตาราง`);
      else if (b.type === 'note' && !isText(b.text)) errors.push(`${at}: ใส่ข้อความ`);
      else if (!['table', 'note'].includes(b.type)) errors.push(`${at}: ชนิดข้อมูลไม่รู้จัก`);
    });
    if (!Array.isArray(m.steps) || !m.steps.length) return errors.concat('ภารกิจต้องมีอย่างน้อย 1 ขั้น');
    m.steps.forEach((s, i) => validateStep(s, text => errors.push(`ขั้นที่ ${i + 1}: ${text}`), false));
    return errors;
  }

  window.HealthKit = {
    LEVELS, ROUND_SIZE, FOOD_GROUPS, ACTIVITY_CATS, ADVICE, SKILLS: ['analysis', 'planning', 'reason', 'decision', 'rules'],
    mealRuleText: r => ruleLabel(MEAL_RULE_LABELS, r), scheduleRuleText: r => ruleLabel(SCHEDULE_RULE_LABELS, r),
    hasMissions, roundSize: () => ROUND_SIZE, buildRound, makeMission, normalizeMission, validateMission,
    checkStep, answerText, timeline, clock, hours, toMin, mealProblems, scheduleProblems,
    codes: () => Object.keys(window.HEALTH_BANK || {})
  };
})();
