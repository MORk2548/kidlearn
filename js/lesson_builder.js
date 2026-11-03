// lesson_builder.js - แท็บ "บทเรียนของฉัน" ในแดชบอร์ดครู และตัวอ่านบทเรียนที่ใช้ทั้งครูและนักเรียน
// บทเรียนแยกจากเกม ใช้ขอบเขตวิชา/ชั้น/ห้องเดียวกับเกม จึงยืม helper gb* และ A.gb.assignments จาก game_builder.js

if (typeof A.lb === 'undefined') A.lb = { view: 'list', lessons: [], draft: null };

async function loadLessonBuilder() {
  const panel = document.getElementById('tc-lesson-panel');
  if (!panel) return;
  panel.innerHTML = '<div class="ts" style="color:var(--mu)">กำลังโหลดบทเรียน...</div>';
  const [lessonRes, asgRes, subRes, gameRes] = await Promise.all([
    apiTeacherLessons().catch(() => ({ ok: false })),
    apiTeacherAssignments().catch(() => ({ ok: false })),
    apiSubjects().catch(() => ({ ok: false })),
    apiTeacherGames().catch(() => ({ ok: false })),
  ]);
  if (!lessonRes.ok) { panel.innerHTML = `<div class="ts" style="color:#EF4444">${_esc(lessonRes.error || 'โหลดบทเรียนไม่สำเร็จ')}</div>`; return; }
  A.lb.lessons = lessonRes.lessons || [];
  A.gb.assignments = asgRes.ok ? (asgRes.assignments || []) : [];
  A.gb.subjects = subRes.ok ? (subRes.subjects || []) : [];
  A.gb.games = gameRes.ok ? (gameRes.games || []) : [];
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
  lbImageTools(q);
  A.lb.quill = q;
}

// คลิกรูปเพื่อเลือก ลากมุมขวาล่างเพื่อปรับขนาด กดถังขยะหรือปุ่ม Delete เพื่อลบ ขนาดเก็บเป็น width ของ <img>
function lbImageTools(q) {
  const box = document.createElement('div');
  box.className = 'lb-img-box';
  box.hidden = true;
  box.innerHTML = `<button type="button" class="lb-img-del" title="ลบรูป" aria-label="ลบรูป"><i class="fa-solid fa-trash" aria-hidden="true"></i></button>
    <span class="lb-img-handle" title="ลากเพื่อปรับขนาด"></span>`;
  q.container.appendChild(box);
  const handle = box.querySelector('.lb-img-handle');
  let img = null;

  const place = () => {
    const c = q.container.getBoundingClientRect(), r = img.getBoundingClientRect();
    Object.assign(box.style, { left: `${r.left - c.left}px`, top: `${r.top - c.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  };
  const select = el => {
    img = el;
    box.hidden = !el;
    if (el) place();
  };
  const remove = () => {
    q.deleteText(q.getIndex(Quill.find(img)), 1, 'user');
    select(null);
  };

  q.root.addEventListener('click', e => select(e.target.tagName === 'IMG' ? e.target : null));
  q.on('text-change', () => { if (img) img.isConnected ? place() : select(null); });
  box.querySelector('.lb-img-del').addEventListener('click', remove);
  // capture บน container เพื่อให้ทำงานก่อน keyboard ของ Quill ไม่อย่างนั้น Backspace จะลบตัวอักษรหน้าเคอร์เซอร์แทนรูป
  q.container.addEventListener('keydown', e => {
    if (!img) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      e.stopPropagation();
      remove();
    } else select(null);
  }, true);

  handle.addEventListener('pointerdown', e => {
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    const startX = e.clientX, startW = img.getBoundingClientRect().width, maxW = q.root.clientWidth - 30;
    let width = startW;
    const move = ev => {
      width = Math.round(Math.max(40, Math.min(maxW, startW + ev.clientX - startX)));
      img.style.width = `${width}px`;
      place();
    };
    const up = () => {
      handle.removeEventListener('pointermove', move);
      img.removeAttribute('style');
      q.formatText(q.getIndex(Quill.find(img)), 1, 'width', String(width), 'user');
      place();
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up, { once: true });
  });
}

function lbListHtml() {
  const card = l => `<div class="gb-card" data-search-item="">
      <div class="gb-card-body">
        <div class="gb-card-name">${_esc(l.title)}</div>
        <div class="gb-card-meta">${_esc(l.subject_name)} · ${_esc(l.grade)}${l.game_name ? ` · เกม ${_esc(l.game_name)}` : ''}</div>
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
    ${A.lb.lessons.length ? searchBoxHtml('ค้นหาบทเรียน เช่น ชื่อบท วิชา ชั้น หรือชื่อเกม') : ''}
    <div id="lb-list-msg" class="al ao" style="display:none"></div>
    ${A.lb.lessons.map(card).join('') || '<div class="gb-empty">ยังไม่มีบทเรียน กด "สร้างบทเรียนใหม่" เพื่อเริ่ม</div>'}
  </div>`;
}

function lbNew() {
  if (!gbSubjectsAllowed().length) { alert('ยังไม่มีวิชาที่คุณสอน ติดต่อเจ้าหน้าที่เพื่อกำหนดห้องและวิชา'); return; }
  const subjectId = +gbSubjectsAllowed()[0].subject_id;
  const grade = gbGradesFor(subjectId)[0];
  A.lb.draft = { lesson_id: 0, title: '', body: '', body_format: 'html', subject_id: subjectId, grade, game_id: null, attachments: [],
    classroom_ids: gbRoomsFor(subjectId, grade).map(r => +r.classroom_id) };
  A.lb.view = 'edit';
  lbRender();
}

function lbEdit(lessonId) {
  const l = A.lb.lessons.find(x => x.lesson_id == lessonId);
  A.lb.draft = { lesson_id: +l.lesson_id, title: l.title, body_format: 'html',
    body: l.body_format === 'html' ? l.body : lbTextToHtml(l.body), subject_id: +l.subject_id, grade: l.grade,
    game_id: l.game_id ? +l.game_id : null, attachments: [...(l.attachments || [])],
    classroom_ids: l.classroom_ids.map(Number) };
  A.lb.view = 'edit';
  lbRender();
}

// บทเรียนผูกได้เฉพาะเกมวิชาและชั้นเดียวกัน server ตรวจซ้ำตอนบันทึก
const lbGamesFor = d => A.gb.games.filter(g => g.subject_id == d.subject_id && g.grade === d.grade);

function lbEditHtml() {
  const d = A.lb.draft;
  const rooms = gbRoomsFor(d.subject_id, d.grade);
  const games = lbGamesFor(d);
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
    <div class="fg"><label class="fl" for="lb-game">บทเรียนนี้ใช้กับเกม</label>
      <select class="fc" id="lb-game">
        <option value="">ไม่ผูกกับเกม</option>
        ${games.map(g => `<option value="${g.game_id}"${g.game_id == d.game_id ? ' selected' : ''}>${_esc(g.name)}</option>`).join('')}
      </select>
      ${games.length ? '' : `<div class="ge-hint">ยังไม่มีเกม${_esc(gbSubjectsAllowed().find(s => s.subject_id == d.subject_id)?.name || '')} ${_esc(d.grade)} ที่คุณสร้าง</div>`}</div>
    <div class="fg"><div class="fl">ห้องที่ให้อ่านบทเรียนนี้</div>
      <div class="gb-rooms">
        ${rooms.map(r => `<label class="child-btn"><input type="checkbox" class="lb-room" value="${r.classroom_id}"${d.classroom_ids.includes(+r.classroom_id) ? ' checked' : ''}> ${classLabel(r)}</label>`).join('') || '<span style="color:var(--mu)">ไม่มีห้องที่คุณสอนในชั้นนี้</span>'}
      </div></div>
    <div class="fg"><div class="fl">เนื้อหาบทเรียน</div>
      <div id="lb-body"></div></div>
    <div class="fg"><div class="fl">ไฟล์ประกอบบทเรียน</div>
      <div id="lb-files">${lbFilesHtml(d.attachments, true)}</div>
      <label class="btn btn-sm btn-s" style="margin:.5rem 0 1rem">แนบไฟล์
        <input type="file" hidden multiple accept="${LB_FILE_ACCEPT}" onchange="lbAttachFiles(this)"></label>
      <div class="ge-hint">PDF, Word, PowerPoint, Excel หรือ .txt ไฟล์ละไม่เกิน 10 MB แนบได้สูงสุด ${LB_FILE_MAX} ไฟล์</div></div>
    <div id="lb-err" class="al ae" style="display:none;margin-top:1rem"></div>
    <div class="gb-actions">
      <button class="btn btn-g" onclick="lbSync(); openLessonReader({ ...A.lb.draft, subject_name: gbSubjectsAllowed().find(s => s.subject_id == A.lb.draft.subject_id)?.name, game_name: A.gb.games.find(g => g.game_id == A.lb.draft.game_id)?.name })">ดูตัวอย่าง</button>
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
  d.game_id = +document.getElementById('lb-game').value || null;
}

const LB_FILE_ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt';
const LB_FILE_MAX = 10;
const LB_FILE_ICONS = { pdf: 'fa-file-pdf', doc: 'fa-file-word', docx: 'fa-file-word', ppt: 'fa-file-powerpoint',
  pptx: 'fa-file-powerpoint', xls: 'fa-file-excel', xlsx: 'fa-file-excel' };

const lbFileSize = n => n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

// ใช้ทั้งในตัวแก้ไข (ลบได้) และหน้าอ่าน (เปิดดูหรือดาวน์โหลด)
function lbFilesHtml(files, editable = false) {
  return (files || []).map((f, i) => {
    const icon = LB_FILE_ICONS[f.path.split('.').pop()] || 'fa-file-lines';
    return `<div class="lesson-file">
      <i class="fa-solid ${icon}" aria-hidden="true"></i>
      <a href="${_gtEsc(f.url)}" target="_blank" rel="noopener">${_gtEsc(f.name)}</a>
      <span class="lesson-file-size">${lbFileSize(f.size)}</span>
      ${editable
        ? `<button type="button" class="btn-del" onclick="lbRemoveFile(${i})" aria-label="เอาไฟล์ ${_gtEsc(f.name)} ออก"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>`
        : `<a class="btn btn-sm btn-g" href="${_gtEsc(f.url)}?download=${encodeURIComponent(f.name)}" aria-label="ดาวน์โหลด ${_gtEsc(f.name)}"><i class="fa-solid fa-download" aria-hidden="true"></i></a>`}
    </div>`;
  }).join('');
}

const lbRenderFiles = () => { document.getElementById('lb-files').innerHTML = lbFilesHtml(A.lb.draft.attachments, true); };

// ไฟล์ขึ้น Supabase ทันทีที่เลือก แต่ผูกกับบทเรียนตอนบันทึก ไฟล์ที่เอาออกจะถูกลบจากที่เก็บตอนบันทึก
async function lbAttachFiles(input) {
  const files = [...input.files];
  input.value = '';
  const d = A.lb.draft;
  if (d.attachments.length + files.length > LB_FILE_MAX) { showAl('lb-err', `แนบไฟล์ได้ไม่เกิน ${LB_FILE_MAX} ไฟล์`); return; }
  const label = input.closest('label');
  label.firstChild.textContent = 'กำลังอัปโหลด... ';
  const results = await Promise.all(files.map(f => apiUploadLessonFile(f).catch(() => ({ ok: false }))));
  label.firstChild.textContent = 'แนบไฟล์';
  d.attachments.push(...results.filter(r => r.ok).map(r => r.file));
  lbRenderFiles();
  const failed = results.find(r => !r.ok);
  if (failed) showAl('lb-err', failed.error || 'อัปโหลดไฟล์ไม่สำเร็จ');
}

function lbRemoveFile(i) {
  A.lb.draft.attachments.splice(i, 1);
  lbRenderFiles();
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
  if (!lbGamesFor(d).some(g => g.game_id == d.game_id)) d.game_id = null;
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
  const res = await apiSaveLesson({ ...A.lb.draft, files: A.lb.draft.attachments.map(f => f.path) }).catch(() => ({ ok: false }));
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
        ${lesson.game_name ? `<div class="lesson-game"><i class="fa-solid fa-gamepad" aria-hidden="true"></i> ใช้กับเกม ${_gtEsc(lesson.game_name)}</div>` : ''}
        <div class="lesson-body${lesson.body_format === 'html' ? ' is-html' : ''}">${lbBodyHtml(lesson.body, lesson.body_format)}</div>
        ${lesson.attachments?.length ? `<div class="lesson-files"><h3>ไฟล์ประกอบบทเรียน</h3>${lbFilesHtml(lesson.attachments)}</div>` : ''}
      </div>
    </div>`;
  overlay.querySelector('.gp-close').addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
}
