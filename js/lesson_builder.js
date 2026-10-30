// lesson_builder.js - แท็บ "บทเรียนของฉัน" ในแดชบอร์ดครู และตัวอ่านบทเรียนที่ใช้ทั้งครูและนักเรียน
// บทเรียนแยกจากเกม ใช้ขอบเขตวิชา/ชั้น/ห้องเดียวกับเกม จึงยืม helper gb* และ A.gb.assignments จาก game_builder.js

if (typeof A.lb === 'undefined') A.lb = { view: 'list', lessons: [], draft: null };

async function loadLessonBuilder() {
  const panel = document.getElementById('tc-lesson-panel');
  if (!panel) return;
  panel.innerHTML = '<div class="ts" style="color:var(--mu)">⏳ กำลังโหลดบทเรียน...</div>';
  const [lessonRes, asgRes, subRes] = await Promise.all([
    apiTeacherLessons().catch(() => ({ ok: false })),
    apiTeacherAssignments().catch(() => ({ ok: false })),
    apiSubjects().catch(() => ({ ok: false })),
  ]);
  if (!lessonRes.ok) { panel.innerHTML = `<div class="ts" style="color:#EF4444">${_esc(lessonRes.error || 'โหลดบทเรียนไม่สำเร็จ')}</div>`; return; }
  A.lb.lessons = lessonRes.lessons || [];
  A.gb.assignments = asgRes.ok ? (asgRes.assignments || []) : [];
  A.gb.subjects = subRes.ok ? (subRes.subjects || []) : [];
  A.lb.view = 'list';
  lbRender();
}

function lbRender() {
  const panel = document.getElementById('tc-lesson-panel');
  if (panel) panel.innerHTML = A.lb.view === 'edit' ? lbEditHtml() : lbListHtml();
}

function lbListHtml() {
  const card = l => `<div class="gb-card">
      <div class="gb-card-ico" aria-hidden="true">📖</div>
      <div class="gb-card-body">
        <div class="gb-card-name">${_esc(l.title)}</div>
        <div class="gb-card-meta">${_esc(l.subject_name)} · ${_esc(l.grade)}</div>
        <div class="gb-card-meta">${l.classroom_ids.length ? `ห้อง ${l.classroom_ids.map(gbRoomLabel).join(', ')}` : 'ยังไม่ได้เลือกห้อง นักเรียนยังไม่เห็น'}</div>
      </div>
      <div class="gb-card-actions">
        <button class="btn btn-sm btn-s" onclick="lbEdit(${l.lesson_id})">✏️ แก้ไข</button>
        <button class="btn btn-sm btn-g" onclick="openLessonReader(A.lb.lessons.find(x => x.lesson_id == ${l.lesson_id}))">👀 ดูตัวอย่าง</button>
        <button class="btn btn-sm" onclick="lbDelete(${l.lesson_id})" aria-label="ลบบทเรียน ${_esc(l.title)}">🗑️</button>
      </div>
    </div>`;
  return `<div class="ts">
    <div class="gb-head">
      <h3 style="margin:0">📖 บทเรียนของฉัน</h3>
      <button class="btn btn-p" onclick="lbNew()">➕ สร้างบทเรียนใหม่</button>
    </div>
    <div id="lb-list-msg" class="al ao" style="display:none"></div>
    ${A.lb.lessons.map(card).join('') || '<div class="gb-empty">ยังไม่มีบทเรียน กด "สร้างบทเรียนใหม่" เพื่อเริ่ม</div>'}
  </div>`;
}

function lbNew() {
  if (!gbSubjectsAllowed().length) { alert('ยังไม่มีวิชาที่คุณสอน ติดต่อเจ้าหน้าที่เพื่อกำหนดห้องและวิชา'); return; }
  const subjectId = +gbSubjectsAllowed()[0].subject_id;
  const grade = gbGradesFor(subjectId)[0];
  A.lb.draft = { lesson_id: 0, title: '', body: '', subject_id: subjectId, grade,
    classroom_ids: gbRoomsFor(subjectId, grade).map(r => +r.classroom_id) };
  A.lb.view = 'edit';
  lbRender();
}

function lbEdit(lessonId) {
  const l = A.lb.lessons.find(x => x.lesson_id == lessonId);
  A.lb.draft = { lesson_id: +l.lesson_id, title: l.title, body: l.body, subject_id: +l.subject_id, grade: l.grade,
    classroom_ids: l.classroom_ids.map(Number) };
  A.lb.view = 'edit';
  lbRender();
}

function lbEditHtml() {
  const d = A.lb.draft;
  const rooms = gbRoomsFor(d.subject_id, d.grade);
  return `<div class="ts">
    <div class="gb-head">
      <h3 style="margin:0">📖 ${d.lesson_id ? 'แก้ไขบทเรียน' : 'สร้างบทเรียน'}</h3>
      <button class="btn btn-sm" onclick="lbCancel()">✕ ยกเลิก</button>
    </div>
    <div class="fg"><label class="fl" for="lb-title">ชื่อบทเรียน</label>
      <input class="fc" id="lb-title" value="${_esc(d.title)}" maxlength="200" placeholder="เช่น การบวกเศษส่วน"></div>
    <div class="gb-row">
      <div class="fg"><label class="fl" for="lb-subject">วิชา</label>
        <select class="fc" id="lb-subject" onchange="lbSetScope(+this.value, null)">
          ${gbSubjectsAllowed().map(s => `<option value="${s.subject_id}"${s.subject_id == d.subject_id ? ' selected' : ''}>${s.icon || '📚'} ${_esc(s.name)}</option>`).join('')}
        </select></div>
      <div class="fg"><label class="fl" for="lb-grade">ระดับชั้น</label>
        <select class="fc" id="lb-grade" onchange="lbSetScope(${d.subject_id}, this.value)">
          ${gbGradesFor(d.subject_id).map(g => `<option${g === d.grade ? ' selected' : ''}>${_esc(g)}</option>`).join('')}
        </select></div>
    </div>
    <div class="fg"><div class="fl">ห้องที่ให้อ่านบทเรียนนี้</div>
      <div class="gb-rooms">
        ${rooms.map(r => `<label class="child-btn"><input type="checkbox" class="lb-room" value="${r.classroom_id}"${d.classroom_ids.includes(+r.classroom_id) ? ' checked' : ''}> ${classLabel(r)}</label>`).join('') || '<span style="color:var(--mu)">ไม่มีห้องที่คุณสอนในชั้นนี้</span>'}
      </div></div>
    <div class="fg"><label class="fl" for="lb-body">เนื้อหาบทเรียน</label>
      <textarea class="fc" id="lb-body" rows="12" maxlength="10000" placeholder="พิมพ์เศษส่วนเป็น 1/4 จะแสดงแบบซ้อนบนล่าง">${_esc(d.body)}</textarea></div>
    <div id="lb-err" class="al ae" style="display:none;margin-top:1rem"></div>
    <div class="gb-actions">
      <button class="btn btn-p" onclick="lbSave()">💾 บันทึกบทเรียน</button>
    </div>
  </div>`;
}

function lbSync() {
  const d = A.lb.draft;
  d.title = document.getElementById('lb-title').value.trim();
  d.body = document.getElementById('lb-body').value.trim();
  d.classroom_ids = [...document.querySelectorAll('.lb-room:checked')].map(el => +el.value);
}

function lbSetScope(subjectId, grade) {
  lbSync();
  const d = A.lb.draft;
  const grades = gbGradesFor(subjectId);
  d.subject_id = subjectId;
  d.grade = grades.includes(grade ?? d.grade) ? (grade ?? d.grade) : grades[0];
  d.classroom_ids = gbRoomsFor(d.subject_id, d.grade).map(r => +r.classroom_id);
  lbRender();
}

function lbCancel() {
  if (!confirm('ออกจากหน้านี้? สิ่งที่ยังไม่ได้บันทึกจะหายไป')) return;
  A.lb.view = 'list';
  lbRender();
}

async function lbSave() {
  lbSync();
  const res = await apiSaveLesson(A.lb.draft).catch(() => ({ ok: false }));
  if (!res.ok) { showAl('lb-err', res.error || 'บันทึกไม่สำเร็จ'); return; }
  await loadLessonBuilder();
  showAl('lb-list-msg', '💾 บันทึกบทเรียนแล้ว');
}

async function lbDelete(lessonId) {
  const l = A.lb.lessons.find(x => x.lesson_id == lessonId);
  if (!confirm(`ลบบทเรียน "${l?.title || ''}"? นักเรียนจะไม่เห็นบทเรียนนี้อีก`)) return;
  const res = await apiDeleteLesson(lessonId).catch(() => ({ ok: false }));
  if (!res.ok) { alert(res.error || 'ลบไม่สำเร็จ'); return; }
  await loadLessonBuilder();
  showAl('lb-list-msg', '🗑️ ลบบทเรียนแล้ว');
}

// เปิดบทเรียนเต็มจอ ใช้กรอบเดียวกับตัวเล่นเกม
function openLessonReader(lesson) {
  const overlay = document.createElement('div');
  overlay.className = 'gp-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `
    <div class="gp">
      <div class="gp-top">
        <div class="gp-title"><span aria-hidden="true">📖</span> ${_gtEsc(lesson.subject_name)} · ${_gtEsc(lesson.grade)}</div>
        <button type="button" class="gp-close" aria-label="ปิดบทเรียน">✕</button>
      </div>
      <div class="gp-body lesson-read">
        <h2>${_gtEsc(lesson.title)}</h2>
        <div class="lesson-body">${_gtRich(lesson.body)}</div>
      </div>
    </div>`;
  overlay.querySelector('.gp-close').addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
}
