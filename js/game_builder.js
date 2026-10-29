// game_builder.js - แท็บ "เกมของฉัน" ในแดชบอร์ดครู: รายการเกม เลือกแบบเกม กรอกคำถาม เลือกห้อง แล้วบันทึก
// ครูเลือกได้เฉพาะวิชา ชั้น และห้องที่ตัวเองสอนตาม teacher_assignments เซิร์ฟเวอร์ตรวจซ้ำอีกชั้น

if (typeof A.gb === 'undefined') A.gb = { view: 'list', games: [], assignments: [], subjects: [], filter: { grade: '', subject: '' }, draft: null };

const GB_TIME_OPTIONS = [60, 120, 180, 300, 600, 900];

async function loadGameBuilder() {
  const panel = document.getElementById('tc-game-panel');
  if (!panel) return;
  panel.innerHTML = '<div class="ts" style="color:var(--mu)">⏳ กำลังโหลดเกม...</div>';
  const [gamesRes, asgRes, subRes] = await Promise.all([
    apiTeacherGames().catch(() => ({ ok: false })),
    apiTeacherAssignments().catch(() => ({ ok: false })),
    apiSubjects().catch(() => ({ ok: false })),
  ]);
  if (!gamesRes.ok) { panel.innerHTML = `<div class="ts" style="color:#EF4444">${_esc(gamesRes.error || 'โหลดเกมไม่สำเร็จ')}</div>`; return; }
  A.gb.games = gamesRes.games || [];
  A.gb.assignments = asgRes.ok ? (asgRes.assignments || []) : [];
  A.gb.subjects = subRes.ok ? (subRes.subjects || []) : [];
  A.gb.view = 'list';
  gbRender();
}

// ── ขอบเขตที่ครูสอน ──
function gbAssignmentsFor(subjectId) {
  return A.gb.assignments.filter(a => a.subject_id == null || a.subject_id == subjectId);
}
function gbSubjectsAllowed() {
  if (A.gb.assignments.some(a => a.subject_id == null)) return A.gb.subjects;
  const ids = new Set(A.gb.assignments.map(a => +a.subject_id));
  return A.gb.subjects.filter(s => ids.has(+s.subject_id));
}
function gbGradesFor(subjectId) {
  return [...new Set(gbAssignmentsFor(subjectId).map(a => a.grade))].sort();
}
function gbRoomsFor(subjectId, grade) {
  const rooms = {};
  gbAssignmentsFor(subjectId).filter(a => a.grade === grade).forEach(a => { rooms[a.classroom_id] = a; });
  return Object.values(rooms).sort((a, b) => a.room_no - b.room_no);
}
function gbRoomLabel(id) {
  const r = A.gb.assignments.find(a => a.classroom_id == id) || (A.tcClassrooms || []).find(c => c.classroom_id == id);
  return r ? classLabel(r) : `ห้อง ${id}`;
}

function gbRender() {
  const panel = document.getElementById('tc-game-panel');
  if (!panel) return;
  if (A.gb.view === 'pick') panel.innerHTML = gbPickHtml();
  else if (A.gb.view === 'edit') panel.innerHTML = gbEditHtml();
  else panel.innerHTML = gbListHtml();
}

// ── รายการเกม ──
function gbListHtml() {
  const { grade, subject } = A.gb.filter;
  const games = A.gb.games.filter(g => (!grade || g.grade === grade) && (!subject || g.subject_id == subject));
  const grades = [...new Set(A.gb.games.map(g => g.grade))].sort();
  const subjects = [...new Map(A.gb.games.map(g => [g.subject_id, g.subject_name])).entries()];
  const card = g => {
    const type = GAME_TYPES[g.game_type];
    const published = g.status === 'published';
    return `<div class="gb-card">
      <div class="gb-card-ico" aria-hidden="true">${_esc(g.icon || type?.icon || '🎮')}</div>
      <div class="gb-card-body">
        <div class="gb-card-name">${_esc(g.name)}</div>
        <div class="gb-card-meta">${_esc(type?.label || g.game_type)} · ${_esc(g.subject_name)} · ${_esc(g.grade)} · ${g.question_count} ข้อ</div>
        <div class="gb-card-meta">
          <span class="badge ${published ? 'be' : 'bm'}">${published ? 'เผยแพร่แล้ว' : 'ร่าง'}</span>
          ${g.classroom_ids.length ? `ห้อง ${g.classroom_ids.map(gbRoomLabel).join(', ')}` : 'ยังไม่ได้เลือกห้อง'}
        </div>
      </div>
      <div class="gb-card-actions">
        <button class="btn btn-sm btn-s" onclick="gbEdit(${g.game_id})">✏️ แก้ไข</button>
        <button class="btn btn-sm btn-g" onclick="gbPreviewSaved(${g.game_id})">▶️ ทดลองเล่น</button>
        <button class="btn btn-sm" onclick="gbDelete(${g.game_id})" aria-label="ลบเกม ${_esc(g.name)}">🗑️</button>
      </div>
    </div>`;
  };
  return `<div class="ts">
    <div class="gb-head">
      <h3 style="margin:0">🎮 เกมของฉัน</h3>
      <button class="btn btn-p" onclick="gbNew()">➕ สร้างเกมใหม่</button>
    </div>
    ${A.gb.games.length ? `<div class="gb-filters">
      <select class="fc" aria-label="กรองตามระดับชั้น" onchange="A.gb.filter.grade=this.value;gbRender()">
        <option value="">ทุกระดับชั้น</option>
        ${grades.map(g => `<option${g === grade ? ' selected' : ''}>${_esc(g)}</option>`).join('')}
      </select>
      <select class="fc" aria-label="กรองตามวิชา" onchange="A.gb.filter.subject=this.value;gbRender()">
        <option value="">ทุกวิชา</option>
        ${subjects.map(([id, name]) => `<option value="${id}"${id == subject ? ' selected' : ''}>${_esc(name)}</option>`).join('')}
      </select>
    </div>` : ''}
    <div id="gb-list-msg" class="al ao" style="display:none"></div>
    ${games.map(card).join('') || `<div class="gb-empty">${A.gb.games.length ? 'ไม่มีเกมตามตัวกรองนี้' : 'ยังไม่มีเกม กด "สร้างเกมใหม่" เพื่อเริ่ม'}</div>`}
  </div>`;
}

// ── เลือกแบบเกม ──
function gbNew() {
  if (!gbSubjectsAllowed().length) { alert('ยังไม่มีวิชาที่คุณสอน ติดต่อเจ้าหน้าที่เพื่อกำหนดห้องและวิชา'); return; }
  A.gb.view = 'pick';
  gbRender();
}

function gbPickHtml() {
  return `<div class="ts">
    <div class="gb-head">
      <h3 style="margin:0">เลือกแบบเกม</h3>
      <button class="btn btn-sm" onclick="A.gb.view='list';gbRender()">✕ ยกเลิก</button>
    </div>
    <div class="gb-types">
      ${Object.entries(GAME_TYPES).map(([key, t]) => `
        <button class="gb-type" onclick="gbPickType('${key}')">
          <span class="gb-type-ico" aria-hidden="true">${t.icon}</span>
          <span class="gb-type-name">${t.label}</span>
          <span class="gb-type-desc">${t.desc}</span>
        </button>`).join('')}
    </div>
  </div>`;
}

function gbPickType(type) {
  const subjectId = +gbSubjectsAllowed()[0].subject_id;
  const grade = gbGradesFor(subjectId)[0];
  A.gb.draft = {
    game_id: 0, name: '', game_type: type, subject_id: subjectId, grade, time_limit: 180, status: 'draft',
    classroom_ids: gbRoomsFor(subjectId, grade).map(r => +r.classroom_id),
    questions: [GAME_TYPES[type].emptyQuestion()],
  };
  A.gb.view = 'edit';
  gbRender();
}

async function gbEdit(gameId) {
  const res = await apiTeacherGame(gameId).catch(() => ({ ok: false }));
  if (!res.ok) { alert(res.error || 'โหลดเกมไม่สำเร็จ'); return; }
  const g = res.game;
  A.gb.draft = {
    game_id: +g.game_id, name: g.name, game_type: g.game_type, subject_id: +g.subject_id, grade: g.grade,
    time_limit: +g.time_limit, status: g.status, classroom_ids: g.classroom_ids, questions: g.questions,
  };
  A.gb.view = 'edit';
  gbRender();
}

// ── ฟอร์มสร้าง/แก้ไขเกม ──
function gbEditHtml() {
  const d = A.gb.draft;
  const type = GAME_TYPES[d.game_type];
  const grades = gbGradesFor(d.subject_id);
  const rooms = gbRoomsFor(d.subject_id, d.grade);
  const times = GB_TIME_OPTIONS.includes(d.time_limit) ? GB_TIME_OPTIONS : [...GB_TIME_OPTIONS, d.time_limit].sort((a, b) => a - b);
  return `<div class="ts">
    <div class="gb-head">
      <h3 style="margin:0">${type.icon} ${d.game_id ? 'แก้ไขเกม' : 'สร้างเกม'} · ${type.label}</h3>
      <button class="btn btn-sm" onclick="gbCancel()">✕ ยกเลิก</button>
    </div>
    <div class="fg"><label class="fl" for="gb-name">ชื่อเกม</label>
      <input class="fc" id="gb-name" value="${_esc(d.name)}" maxlength="100" placeholder="เช่น บวกเลขสองหลัก"></div>
    <div class="gb-row">
      <div class="fg"><label class="fl" for="gb-subject">วิชา</label>
        <select class="fc" id="gb-subject" onchange="gbSetScope(+this.value, null)">
          ${gbSubjectsAllowed().map(s => `<option value="${s.subject_id}"${s.subject_id == d.subject_id ? ' selected' : ''}>${s.icon || '📚'} ${_esc(s.name)}</option>`).join('')}
        </select></div>
      <div class="fg"><label class="fl" for="gb-grade">ระดับชั้น</label>
        <select class="fc" id="gb-grade" onchange="gbSetScope(${d.subject_id}, this.value)">
          ${grades.map(g => `<option${g === d.grade ? ' selected' : ''}>${_esc(g)}</option>`).join('')}
        </select></div>
      <div class="fg"><label class="fl" for="gb-time">เวลาทั้งเกม</label>
        <select class="fc" id="gb-time">
          ${times.map(s => `<option value="${s}"${s === d.time_limit ? ' selected' : ''}>${s % 60 ? `${s} วินาที` : `${s / 60} นาที`}</option>`).join('')}
        </select></div>
    </div>
    <div class="fg"><div class="fl">ห้องที่ให้เล่นเกมนี้</div>
      <div class="gb-rooms">
        ${rooms.map(r => `<label class="child-btn"><input type="checkbox" class="gb-room" value="${r.classroom_id}"${d.classroom_ids.includes(+r.classroom_id) ? ' checked' : ''}> ${classLabel(r)}</label>`).join('') || '<span style="color:var(--mu)">ไม่มีห้องที่คุณสอนในชั้นนี้</span>'}
      </div></div>
    <div id="gb-questions">
      ${d.questions.map((q, i) => `
        <div class="gb-q" data-i="${i}">
          <div class="gb-q-head"><strong>ข้อ ${i + 1}</strong>
            ${d.questions.length > 1 ? `<button class="btn btn-sm" onclick="gbRemoveQuestion(${i})" aria-label="ลบข้อ ${i + 1}">🗑️ ลบข้อนี้</button>` : ''}</div>
          ${type.editorHtml(q)}
        </div>`).join('')}
    </div>
    <button class="btn btn-s" onclick="gbAddQuestion()">➕ เพิ่มข้อ</button>
    <div id="gb-err" class="al ae" style="display:none;margin-top:1rem"></div>
    <div class="gb-actions">
      <button class="btn btn-g" onclick="gbPreviewDraft()">▶️ ทดลองเล่น</button>
      <button class="btn btn-s" onclick="gbSave('draft')">💾 บันทึกร่าง</button>
      <button class="btn btn-p" onclick="gbSave('published')">🚀 ${d.status === 'published' ? 'บันทึกและเผยแพร่' : 'เผยแพร่'}</button>
    </div>
  </div>`;
}

// อ่านค่าทั้งหมดในฟอร์มกลับเข้า draft ก่อนวาดใหม่ทุกครั้ง ไม่อย่างนั้นสิ่งที่ครูพิมพ์จะหาย
function gbSync() {
  const d = A.gb.draft;
  const type = GAME_TYPES[d.game_type];
  d.name = document.getElementById('gb-name').value.trim();
  d.time_limit = +document.getElementById('gb-time').value;
  d.classroom_ids = [...document.querySelectorAll('.gb-room:checked')].map(el => +el.value);
  d.questions = [...document.querySelectorAll('.gb-q')].map(el => type.readEditor(el));
}

function gbSetScope(subjectId, grade) {
  gbSync();
  const d = A.gb.draft;
  const grades = gbGradesFor(subjectId);
  d.subject_id = subjectId;
  d.grade = grades.includes(grade ?? d.grade) ? (grade ?? d.grade) : grades[0];
  d.classroom_ids = gbRoomsFor(d.subject_id, d.grade).map(r => +r.classroom_id);
  gbRender();
}

function gbAddQuestion() {
  gbSync();
  A.gb.draft.questions.push(GAME_TYPES[A.gb.draft.game_type].emptyQuestion());
  gbRender();
  document.querySelector('.gb-q:last-child input')?.focus();
}

function gbRemoveQuestion(i) {
  gbSync();
  A.gb.draft.questions.splice(i, 1);
  gbRender();
}

function gbCancel() {
  if (!confirm('ออกจากหน้านี้? สิ่งที่ยังไม่ได้บันทึกจะหายไป')) return;
  A.gb.view = 'list';
  gbRender();
}

async function gbSaveDraft(status) {
  gbSync();
  const d = A.gb.draft;
  const res = await apiSaveTeacherGame({ ...d, status, icon: GAME_TYPES[d.game_type].icon }).catch(() => ({ ok: false }));
  if (!res.ok) { showAl('gb-err', res.error || 'บันทึกไม่สำเร็จ'); return null; }
  d.game_id = res.game_id;
  d.status = status;
  return res.game_id;
}

async function gbSave(status) {
  if (!await gbSaveDraft(status)) return;
  await loadGameBuilder();
  showAl('gb-list-msg', status === 'published' ? '🚀 เผยแพร่เกมแล้ว นักเรียนในห้องที่เลือกเล่นได้ทันที' : '💾 บันทึกร่างแล้ว');
}

// ทดลองเล่นจากข้อมูลที่บันทึกแล้วเท่านั้น เซิร์ฟเวอร์จะตรวจคำถามให้ครบก่อน ตัวเล่นจึงไม่เจอข้อที่กรอกไม่ครบ
async function gbPreviewDraft() {
  const gameId = await gbSaveDraft(A.gb.draft.status);
  if (gameId) gbPreviewSaved(gameId);
}

async function gbPreviewSaved(gameId) {
  const res = await apiGamePlay(gameId).catch(() => ({ ok: false }));
  if (!res.ok) { alert(res.error || 'เปิดเกมไม่สำเร็จ'); return; }
  openGamePlayerOverlay(res.game);
}

async function gbDelete(gameId) {
  const g = A.gb.games.find(x => x.game_id == gameId);
  if (!confirm(`ลบเกม "${g?.name || ''}"? นักเรียนจะเล่นเกมนี้ไม่ได้อีก แต่คะแนนที่เล่นไปแล้วยังอยู่`)) return;
  const res = await apiDeleteTeacherGame(gameId).catch(() => ({ ok: false }));
  if (!res.ok) { alert(res.error || 'ลบไม่สำเร็จ'); return; }
  await loadGameBuilder();
  showAl('gb-list-msg', '🗑️ ลบเกมแล้ว');
}
