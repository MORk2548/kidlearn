// SCORES
// นักเรียนและผู้ปกครองเห็นการ์ดเกมละใบชุดเดียวกัน ผู้ปกครองมีสรุปสัปดาห์และเกมที่ควรช่วยฝึกเพิ่ม
async function loadScores() {
  const childWrap = document.getElementById('child-sel-wrap');
  const el = document.getElementById('score-games');
  childWrap.style.display = A.role === 'parent' ? 'block' : 'none';
  el.innerHTML = '<div class="ts" style="color:var(--mu)">กำลังโหลด...</div>';

  if (A.role === 'student') {
    loadScoreGames(null);
    return;
  }
  if (A.role !== 'parent') {
    el.innerHTML = '<div class="ts" style="color:var(--mu)">ดูคะแนนรายเกมได้ที่เมนูแผงควบคุม</div>';
    return;
  }

  const cres = await apiMyChildren().catch(() => ({ ok: false }));
  const kids = cres.ok ? (cres.children || []) : [];
  const btns = document.getElementById('child-btns');
  if (!kids.length) {
    btns.innerHTML = '';
    el.innerHTML = '<div class="ts"><div class="gb-empty">ยังไม่มีบุตรหลานที่เชื่อมบัญชี</div></div>';
    return;
  }
  if (!kids.find(k => k.student_id == A.selChild)) A.selChild = kids[0].student_id;
  btns.innerHTML = kids.map(k =>
    `<button class="child-btn${A.selChild == k.student_id ? ' active' : ''}" onclick="A.selChild=${k.student_id};loadScores()">${_esc(k.full_name)}</button>`).join('');
  loadScoreGames(kids.find(k => k.student_id == A.selChild));
}

// ดาว 5 ดวงจากคะแนนเกม (เต็ม 100 เฉลี่ยคะแนนสูงสุดของทุกด่าน): 1-39 = 1 ดาว, ทุก 20 คะแนนได้เพิ่ม 1 ดาว, 5 ดาวต้องได้เต็ม 100
function scoreStars(best) {
  if (best == null || best <= 0) return 0;
  return best >= 100 ? 5 : Math.max(1, Math.floor(best / 20));
}

function starsHtml(n) {
  return `<span class="sc-stars" role="img" aria-label="${n} ดาวจาก 5">${
    [1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? 'fa-solid on' : 'fa-regular'} fa-star" aria-hidden="true"></i>`).join('')}</span>`;
}

function nextStarHint(best, stars) {
  if (stars >= 5) return 'ได้ดาวเต็มแล้ว เก่งมาก';
  const target = stars === 4 ? 100 : (stars + 1) * 20;
  return `อีก ${target - best} คะแนนได้ ${stars + 1} ดาว`;
}

function _daysAgo(date) {
  const day = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  return Math.round((day(new Date()) - day(date)) / 864e5);
}

function _playedLabel(date) {
  const n = _daysAgo(date);
  return n <= 0 ? 'วันนี้' : n === 1 ? 'เมื่อวาน' : n < 7 ? `${n} วันก่อน` : new Date(date).toLocaleDateString('th-TH');
}

// child = null คือนักเรียนดูของตัวเอง, ไม่งั้นคือบุตรหลานที่ผู้ปกครองเลือก
const _scoreView = { games: [], filter: 'all', child: null, week: null, recCount: 0 };

// เกมที่ครูมอบหมายพร้อมดาวและวันที่เล่นล่าสุด + ประวัติการเล่น 7 วัน (child = null คือนักเรียนดูของตัวเอง)
// ใช้ร่วมกับหน้าคำแนะนำของผู้ปกครอง
async function childScoreData(child) {
  const sid = child?.student_id;
  const [res, hist, lessonRes] = await Promise.all([
    apiStudentGames(sid).catch(() => ({ ok: false })),
    child ? apiScores(sid).catch(() => ({ ok: false })) : null,
    apiStudentLessons(sid).catch(() => ({ ok: false })),
  ]);
  if (!res.ok) return { error: res.error || 'โหลดคะแนนไม่สำเร็จ' };
  const attempts = hist?.ok ? hist.scores : [];
  const lessons = lessonRes.ok ? lessonRes.lessons : [];
  const lastPlayed = {};
  attempts.forEach(a => { if (!lastPlayed[a.game_id] || a.played_at > lastPlayed[a.game_id]) lastPlayed[a.game_id] = a.played_at; });
  const games = res.games.map(g => {
    const best = g.best_score == null ? null : +g.best_score;
    return { ...g, best, plays: +g.play_count || 0, stars: scoreStars(best), lastPlayed: lastPlayed[g.game_id] || null,
      lessons: lessons.filter(l => l.game_id == g.game_id) };
  });
  return { games, attempts };
}

async function loadScoreGames(child) {
  const el = document.getElementById('score-games');
  const data = await childScoreData(child);
  if (data.error) { el.innerHTML = `<div class="ts" style="color:#EF4444">${_esc(data.error)}</div>`; return; }
  Object.assign(_scoreView, { child: child || null, filter: 'all', games: data.games,
    week: child ? _scoreWeek(data.attempts) : null,
    recCount: child ? buildParentRecs({ name: child.full_name, ...data }).length : 0 });
  renderScoreGames();
}

// สรุป 7 วันล่าสุด (ระบบเก็บประวัติไว้ 7 วัน): จำนวนครั้ง และวันไหนได้เล่น
function _scoreWeek(attempts) {
  const recent = attempts.filter(a => _daysAgo(a.played_at) < 7);
  const playedDays = new Set(recent.map(a => _daysAgo(a.played_at)));
  const days = [6, 5, 4, 3, 2, 1, 0].map(n => {
    const d = new Date(); d.setDate(d.getDate() - n);
    return { label: ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'][d.getDay()], played: playedDays.has(n) };
  });
  return { plays: recent.length, dayCount: playedDays.size, days };
}

function renderScoreGames() {
  const el = document.getElementById('score-games');
  const { games, child, week } = _scoreView;
  if (!games.length) { el.innerHTML = '<div class="ts"><div class="gb-empty">ยังไม่มีเกมจากครู</div></div>'; return; }

  const subjects = [...new Map(games.map(g => [String(g.subject_id), g.subject_name])).entries()];
  const filters = [['all', 'ทุกวิชา'], ...subjects, ...(child ? [] : [['notfull', 'ยังได้ดาวไม่เต็ม']])];
  const f = _scoreView.filter;
  const shown = games.filter(g => f === 'all' || (f === 'notfull' ? g.stars < 5 : String(g.subject_id) === f));
  const totalStars = games.reduce((t, g) => t + g.stars, 0);
  const starLine = `สะสมดาวได้ ${totalStars} จาก ${games.length * 5} ดวง`;
  const name = child ? _esc(child.full_name) : '';

  const card = g => {
    const type = GAME_TYPES[g.game_type];
    const played = g.plays > 0;
    return `<div class="sc-card${played ? '' : ' new'}">
      <div class="sc-name">${_esc(g.name)}</div>
      <div class="sc-meta">${_esc(g.subject_name)}${type ? ' · ' + _esc(type.label) : ''}</div>
      ${played ? `${starsHtml(g.stars)}
        <div class="sc-meta">คะแนนเกม ${g.best}/100 · เล่น ${g.plays} ครั้ง</div>
        ${child ? (g.lastPlayed ? `<div class="sc-meta">เล่นล่าสุด ${_playedLabel(g.lastPlayed)}</div>` : '')
          : `<div class="sc-hint">${nextStarHint(g.best, g.stars)}</div>`}`
      : '<div class="sc-meta" style="margin:.6rem 0">ยังไม่เคยเล่น</div>'}
      ${child ? '' : `<button class="btn ${played ? 'btn-s' : 'btn-p'} btn-sm sc-play" onclick="playStudentGame(${g.game_id})">${played ? 'เล่นอีกครั้ง' : 'เริ่มเล่น'}</button>`}
    </div>`;
  };

  const summary = child ? `<div class="ts">
      <div class="pw-week">
        <div style="flex:1;min-width:200px">
          <div class="pw-title">${week.plays ? `สัปดาห์นี้${name}เล่น ${week.plays} ครั้ง ใน ${week.dayCount} วัน` : `สัปดาห์นี้${name}ยังไม่ได้เล่นเกม`}</div>
          <div class="sc-meta">${starLine}</div>
        </div>
        <div class="pw-days" role="img" aria-label="ได้เล่น ${week.dayCount} วันจาก 7 วันล่าสุด">${week.days.map(d =>
          `<span class="pw-day"><i class="${d.played ? 'on' : ''}"></i>${_esc(d.label)}</span>`).join('')}</div>
      </div>
    </div>
    ${_scoreView.recCount ? `<div class="ts rec-link">
      <span>มีคำแนะนำ ${_scoreView.recCount} เรื่องสำหรับ${name}</span>
      <button class="btn btn-s btn-sm" onclick="sec('rec')">ดูคำแนะนำ</button>
    </div>` : ''}` : '';

  el.innerHTML = `${summary}<div class="ts">
      ${child ? `<h3>เกมทั้งหมด ${games.length} เกม</h3>` : `<div class="sc-total">${starLine}</div>`}
      <div class="sc-filters">${filters.map(([v, l]) =>
        `<button class="child-btn${f === v ? ' active' : ''}" onclick="_scoreView.filter='${v}';renderScoreGames()">${_esc(l)}</button>`).join('')}</div>
      <div class="sc-grid">${shown.map(card).join('') || '<div class="gb-empty">ได้ดาวเต็มทุกเกมแล้ว</div>'}</div>
      ${child ? '<div class="sc-meta" style="margin-top:.75rem">ประวัติการเล่นแสดงย้อนหลัง 7 วัน ส่วนคะแนนสูงสุดของทุกด่านเก็บไว้ตลอด</div>' : ''}
    </div>`;
}
