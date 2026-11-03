// lesson_builder.js - แท็บ "บทเรียนของฉัน" ในแดชบอร์ดครู และตัวอ่านบทเรียนที่ใช้ทั้งครูและนักเรียน
// บทเรียนแยกจากเกม ใช้ขอบเขตวิชา/ชั้น/ห้องเดียวกับเกม จึงยืม helper gb* และ A.gb.assignments จาก game_builder.js

if (typeof A.lb === 'undefined') A.lb = { view: 'list', lessons: [], draft: null };

async function loadLessonBuilder() {
  const panel = document.getElementById('tc-lesson-panel');
  if (!panel) return;
  panel.innerHTML = '<div class="ts" style="color:var(--mu)">กำลังโหลดบทเรียน...</div>';
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
  if (!panel) return;
  A.lb.quill = null;
  panel.innerHTML = A.lb.view === 'edit' ? lbEditHtml() : lbListHtml();
  if (A.lb.view === 'edit') lbMountEditor();
}

const LB_QUILL = 'https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/';
let _lbQuillReady = null;

// โหลด Quill เฉพาะตอนครูเปิดตัวแก้ไข นักเรียนไม่ต้องโหลด
function lbLoadQuill() {
  return _lbQuillReady ??= new Promise((ok, fail) => {
    const css = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: LB_QUILL + 'quill.snow.css' });
    const js = Object.assign(document.createElement('script'), { src: LB_QUILL + 'quill.js', onload: ok, onerror: fail });
    document.head.append(css, js);
  });
}

async function lbMountEditor() {
  const el = document.getElementById('lb-body');
  try { await lbLoadQuill(); } catch {
    _lbQuillReady = null;
    showAl('lb-err', 'โหลดตัวแก้ไขไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วเปิดใหม่อีกครั้ง');
    return;
  }
  if (!el.isConnected) return;
  const q = new Quill(el, {
    theme: 'snow',
    placeholder: 'พิมพ์เนื้อหาบทเรียน เศษส่วนพิมพ์เป็น 1/4 นักเรียนจะเห็นแบบซ้อนบนล่าง',
    formats: ['header', 'bold', 'italic', 'underline', 'list', 'align', 'image'],
    modules: {
      toolbar: {
        container: [[{ header: [2, 3, false] }], ['bold', 'italic', 'underline'],
          [{ list: 'ordered' }, { list: 'bullet' }], [{ align: [] }], ['image'], ['clean']],
        handlers: { image: lbPickImages },
      },
      uploader: { handler: (range, files) => lbInsertImages(files, range.index) },
    },
  });
  q.setContents(q.clipboard.convert({ html: A.lb.draft.body }));
  A.lb.quill = q;
}

function lbListHtml() {
  const card = l => `<div class="gb-card">
      <div class="gb-card-body">
        <div class="gb-card-name">${_esc(l.title)}</div>
        <div class="gb-card-meta">${_esc(l.subject_name)} · ${_esc(l.grade)}</div>
        <div class="gb-card-meta">${l.classroom_ids.length ? `ห้อง ${l.classroom_ids.map(gbRoomLabel).join(', ')}` : 'ยังไม่ได้เลือกห้อง นักเรียนยังไม่เห็น'}</div>
      </div>
      <div class="gb-card-actions">
        <button class="btn btn-sm btn-s" onclick="lbEdit(${l.lesson_id})">แก้ไข</button>
        <button class="btn btn-sm btn-g" onclick="openLessonReader(A.lb.lessons.find(x => x.lesson_id == ${l.lesson_id}))">ดูตัวอย่าง</button>
        <button class="btn-del" onclick="lbDelete(${l.lesson_id})" title="ลบบทเรียน" aria-label="ลบบทเรียน ${_esc(l.title)}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
      </div>
    </div>`;
  return `<div class="ts">
    <div class="gb-head">
      <h3 style="margin:0">บทเรียนของฉัน</h3>
      <button class="btn btn-p" onclick="lbNew()">สร้างบทเรียนใหม่</button>
    </div>
    <div id="lb-list-msg" class="al ao" style="display:none"></div>
    ${A.lb.lessons.map(card).join('') || '<div class="gb-empty">ยังไม่มีบทเรียน กด "สร้างบทเรียนใหม่" เพื่อเริ่ม</div>'}
  </div>`;
}

function lbNew() {
  if (!gbSubjectsAllowed().length) { alert('ยังไม่มีวิชาที่คุณสอน ติดต่อเจ้าหน้าที่เพื่อกำหนดห้องและวิชา'); return; }
  const subjectId = +gbSubjectsAllowed()[0].subject_id;
  const grade = gbGradesFor(subjectId)[0];
  A.lb.draft = { lesson_id: 0, title: '', body: '', body_format: 'html', subject_id: subjectId, grade,
    classroom_ids: gbRoomsFor(subjectId, grade).map(r => +r.classroom_id) };
  A.lb.view = 'edit';
  lbRender();
}

function lbEdit(lessonId) {
  const l = A.lb.lessons.find(x => x.lesson_id == lessonId);
  A.lb.draft = { lesson_id: +l.lesson_id, title: l.title, body_format: 'html',
    body: l.body_format === 'html' ? l.body : lbTextToHtml(l.body), subject_id: +l.subject_id, grade: l.grade,
    classroom_ids: l.classroom_ids.map(Number) };
  A.lb.view = 'edit';
  lbRender();
}

function lbEditHtml() {
  const d = A.lb.draft;
  const rooms = gbRoomsFor(d.subject_id, d.grade);
  return `<div class="gp-overlay lb-full" role="dialog" aria-modal="true" aria-labelledby="lb-head"><div class="ts">
    <div class="gb-head">
      <h3 id="lb-head" style="margin:0">${d.lesson_id ? 'แก้ไขบทเรียน' : 'สร้างบทเรียน'}</h3>
      <button class="btn btn-sm" onclick="lbCancel()">✕ ยกเลิก</button>
    </div>
    <div class="fg"><label class="fl" for="lb-title">ชื่อบทเรียน</label>
      <input class="fc" id="lb-title" value="${_esc(d.title)}" maxlength="200" placeholder="เช่น การบวกเศษส่วน"></div>
    <div class="gb-row">
      <div class="fg"><label class="fl" for="lb-subject">วิชา</label>
        <select class="fc" id="lb-subject" onchange="lbSetScope(+this.value, null)">
          ${gbSubjectsAllowed().map(s => `<option value="${s.subject_id}"${s.subject_id == d.subject_id ? ' selected' : ''}>${_esc(s.name)}</option>`).join('')}
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
    <div class="fg"><div class="fl">เนื้อหาบทเรียน</div>
      <div id="lb-body"></div></div>
    <div id="lb-err" class="al ae" style="display:none;margin-top:1rem"></div>
    <div class="gb-actions">
      <button class="btn btn-g" onclick="lbSync(); openLessonReader({ ...A.lb.draft, subject_name: gbSubjectsAllowed().find(s => s.subject_id == A.lb.draft.subject_id)?.name })">ดูตัวอย่าง</button>
      <button class="btn btn-p" onclick="lbSave()">บันทึกบทเรียน</button>
    </div>
  </div></div>`;
}

function lbSync() {
  const d = A.lb.draft;
  d.title = document.getElementById('lb-title').value.trim();
  // Quill 2.0.3 เปลี่ยนทุกช่องว่างเป็น &nbsp; ทำให้เศษส่วนแบบมีจำนวนเต็ม เช่น 3 1/2 ไม่ถูกแปลง
  if (A.lb.quill) d.body = A.lb.quill.getSemanticHTML().replace(/&nbsp;/g, ' ');
  d.classroom_ids = [...document.querySelectorAll('.lb-room:checked')].map(el => +el.value);
}

function lbPickImages() {
  const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/png,image/jpeg,image/gif,image/webp', multiple: true });
  input.onchange = () => lbInsertImages([...input.files]);
  input.click();
}

// รูปขึ้น Supabase ทันทีที่เลือก แต่ผูกกับบทเรียนตอนบันทึก รูปที่ลบออกจากเนื้อหาจะถูกลบจากที่เก็บตอนบันทึก
async function lbInsertImages(files, index) {
  const q = A.lb.quill;
  if (!q || !files.length) return;
  const at = index ?? (q.getSelection(true) || { index: q.getLength() }).index;
  const results = await Promise.all(files.map(f => apiUploadImage(f, 'lesson').catch(() => ({ ok: false }))));
  results.filter(r => r.ok).reverse().forEach(r => q.insertEmbed(at, 'image', r.url, 'user'));
  const failed = results.find(r => !r.ok);
  if (failed) showAl('lb-err', failed.error || 'อัปโหลดรูปไม่สำเร็จ');
}

const LB_IMAGE_LINE = /\n?!\[[^\]\n]*\]\(([^)\s]+)\)\n?/;

// บทเรียนเก่าเป็นข้อความ แปลงเป็นย่อหน้าก่อนเปิดในตัวแก้ไข
function lbTextToHtml(body) {
  return String(body ?? '').split(LB_IMAGE_LINE).map((part, i) => i % 2
    ? `<p><img src="${_gtEsc(part)}"></p>`
    : part ? part.split('\n').map(line => `<p>${_gtEsc(line) || '<br>'}</p>`).join('') : '').join('');
}

// เนื้อหาแสดงแบบเดียวกับข้อความในเกม (เศษส่วนซ้อนบนล่าง) HTML ผ่านการคัดกรองจาก server แล้ว
function lbBodyHtml(body, format) {
  if (format !== 'html') return String(body ?? '').split(LB_IMAGE_LINE).map((part, i) => i % 2
    ? (/^https?:\/\//.test(part) ? `<img class="lesson-img" src="${_gtEsc(part)}" alt="รูปประกอบบทเรียน" loading="lazy">` : '')
    : _gtRich(part)).join('');
  const t = document.createElement('template');
  t.innerHTML = body;
  const walker = document.createTreeWalker(t.content, NodeFilter.SHOW_TEXT);
  const texts = [];
  while (walker.nextNode()) texts.push(walker.currentNode);
  for (const n of texts) {
    const rich = _gtRich(n.data);
    if (rich !== _gtEsc(n.data)) n.replaceWith(document.createRange().createContextualFragment(rich));
  }
  t.content.querySelectorAll('img').forEach(img => Object.assign(img, { className: 'lesson-img', alt: 'รูปประกอบบทเรียน', loading: 'lazy' }));
  return t.innerHTML;
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
  if (/<img src="(?!https?:)/.test(A.lb.draft.body)) {
    showAl('lb-err', 'มีรูปที่วางมาจากที่อื่นซึ่งบันทึกไม่ได้ ลบรูปนั้นแล้วใช้ปุ่มรูปภาพบนแถบเครื่องมือแทน');
    return;
  }
  const res = await apiSaveLesson(A.lb.draft).catch(() => ({ ok: false }));
  if (!res.ok) { showAl('lb-err', res.error || 'บันทึกไม่สำเร็จ'); return; }
  await loadLessonBuilder();
  showAl('lb-list-msg', 'บันทึกบทเรียนแล้ว');
}

async function lbDelete(lessonId) {
  const l = A.lb.lessons.find(x => x.lesson_id == lessonId);
  if (!confirm(`ลบบทเรียน "${l?.title || ''}"? นักเรียนจะไม่เห็นบทเรียนนี้อีก`)) return;
  const res = await apiDeleteLesson(lessonId).catch(() => ({ ok: false }));
  if (!res.ok) { alert(res.error || 'ลบไม่สำเร็จ'); return; }
  await loadLessonBuilder();
  showAl('lb-list-msg', 'ลบบทเรียนแล้ว');
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
        <div class="gp-title">${_gtEsc(lesson.subject_name)} · ${_gtEsc(lesson.grade)}</div>
        <button type="button" class="gp-close" aria-label="ปิดบทเรียน">✕</button>
      </div>
      <div class="gp-body lesson-read">
        <h2>${_gtEsc(lesson.title)}</h2>
        <div class="lesson-body${lesson.body_format === 'html' ? ' is-html' : ''}">${lbBodyHtml(lesson.body, lesson.body_format)}</div>
      </div>
    </div>`;
  overlay.querySelector('.gp-close').addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
}
