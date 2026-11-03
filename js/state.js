// ══════════════════════════════════════════════════════
// state.js — Global state (ข้อมูลมาจาก PHP แล้ว)
// ══════════════════════════════════════════════════════
let A = {
  user: null, role: '', selRole: 'student',
  selChild: null, tcStudent: null,
};

function showAl(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 4500);
}

function formatPhone(p) {
  if (!p) return '—';
  const s = String(p).replace(/\D/g,'');
  if (s.length===10) return s.slice(0,3)+'-'+s.slice(3,6)+'-'+s.slice(6);
  if (s.length===9)  return s.slice(0,2)+'-'+s.slice(2,5)+'-'+s.slice(5);
  return s;
}

if(typeof A.tcSubject==='undefined') A.tcSubject = null;

function classLabel(o) {
  if (!o?.grade) return '—';
  const room = o.room_no ? `${o.grade}/${o.room_no}` : o.grade;
  return o.student_no ? `${room} เลขที่ ${o.student_no}` : room;
}

// ช่องค้นหารายการ: ซ่อนการ์ดที่ไม่ตรงคำค้นแทนการ render ใหม่ ช่องค้นหาจึงไม่หลุดโฟกัสขณะพิมพ์
// การ์ดต้องมี data-search-item (ค้นจากข้อความบนการ์ดรวมกับค่าใน attribute) และกลุ่มที่มี data-search-group จะซ่อนเมื่อไม่เหลือการ์ด
function searchBoxHtml(placeholder, value = '', oninput = '') {
  const v = String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  return `<div class="list-search"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
      <input type="search" class="fc" placeholder="${placeholder}" aria-label="${placeholder}" value="${v}" oninput="${oninput}filterCards(this)">
    </div>
    <div class="gb-empty search-empty" hidden>ไม่พบรายการที่ตรงกับคำค้น</div>`;
}

function filterCards(input) {
  const scope = input.closest('.ts');
  const words = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const items = scope.querySelectorAll('[data-search-item]');
  let shown = 0;
  items.forEach(el => {
    const text = `${el.textContent} ${el.dataset.searchItem}`.toLowerCase();
    el.hidden = !words.every(w => text.includes(w));
    if (!el.hidden) shown++;
  });
  scope.querySelectorAll('[data-search-group]').forEach(g => { g.hidden = !g.querySelector('[data-search-item]:not([hidden])'); });
  // รายการว่างอยู่แล้ว (เช่นตัวกรองอื่นไม่เหลือเกม) มีข้อความของตัวเอง ไม่ต้องแสดงซ้ำ
  scope.querySelector('.search-empty').hidden = shown > 0 || !items.length;
}

async function fillClassroomSelect(el, selectedId) {
  if (!el) return;
  const res = await apiClassrooms().catch(() => ({ ok: false }));
  const rooms = res.ok ? (res.classrooms || []) : [];
  const groups = {};
  rooms.forEach(r => (groups[r.grade] ||= []).push(r));
  el.innerHTML = '<option value="">เลือกห้องเรียน</option>' + Object.entries(groups).map(([grade, list]) =>
    `<optgroup label="${grade}">${list.map(r =>
      `<option value="${r.classroom_id}"${r.classroom_id == selectedId ? ' selected' : ''}>${classLabel(r)}</option>`
    ).join('')}</optgroup>`
  ).join('');
}
