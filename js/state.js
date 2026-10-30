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
