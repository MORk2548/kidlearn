// ══════════════════════════════════════════════════════
// OFFICER DASHBOARD — เจ้าหน้าที่จัดการข้อมูลผู้ใช้
// ══════════════════════════════════════════════════════

let _ofUsers = [];
let _ofFilter = 'all';
let _ofDateRange = 'all';

function _renderOfficerPanel(){
  const panel = document.getElementById('of-dashboard');
  if(!panel) return;
  panel.innerHTML = '<div id="of-tab-users"></div>';
  _ofRenderUsersTab();
}




async function ofLoadUsers() {
  const content = document.getElementById('of-users-content');
  if(!content) return;
  content.innerHTML = '⏳ กำลังโหลด...';
  
  try {
    const res = await apiOfficerUsers(_ofDateRange);
    if(!res.ok) {
      content.innerHTML = `<div style="color: #EF4444; padding: 1.5rem; background: #FEF2F2; border-radius: 12px;">❌ ${res.error || 'โหลดข้อมูลไม่สำเร็จ'}</div>`;
      return;
    }
    
    _ofUsers = res.users || [];
    ofRenderUsersList();
  } catch(e) {
    content.innerHTML = `<div style="color: #EF4444; padding: 1.5rem; background: #FEF2F2; border-radius: 12px;">
      ❌ เชื่อมต่อไม่ได้<br>
      <span style="font-size: .82rem;">ตรวจสอบว่า kidlearn_web รันอยู่</span>
    </div>`;
  }
}

function ofRenderUsersList() {
  const content = document.getElementById('of-users-content');
  if(!content) return;
  
  let filtered = _ofUsers;
  if(_ofFilter !== 'all') {
    filtered = _ofUsers.filter(u => u.role === _ofFilter);
  }
  
  if(!filtered.length) {
    content.innerHTML = `<div style="text-align: center; color: var(--mu); padding: 2rem;">
      <div style="font-size: 2rem; margin-bottom: .4rem;">👤</div>
      <div style="font-weight: 600;">ไม่พบผู้ใช้</div>
    </div>`;
    return;
  }
  
  const ROLE_ICON = {
    student: '👦',
    parent: '👨‍👩',
    teacher: '👩‍🏫',
    officer: '👔',
    executive: '💼',
    admin: '🛡️'
  };
  
  content.innerHTML = filtered.map(u => {
    const meta = [];
    if(u.grade) meta.push(`📚 ${classLabel(u)}`);
    if(u.phone) meta.push(`📱 ${u.phone}`);
    if(u.department) meta.push(`🏢 ${u.department}`);
    
    const icon = ROLE_ICON[u.role] || '👤';
    const roleText = {'student':'นักเรียน','parent':'ผู้ปกครอง','teacher':'ครู','officer':'เจ้าหน้าที่','executive':'ผู้บริหาร','admin':'ผู้ดูแล'}[u.role] || u.role;
    
    return `<div class="of-user-card">
      <div class="of-user-head">
        <div class="of-user-av">${(u.full_name||'?').charAt(0)}</div>
        <div class="of-user-info">
          <div class="of-user-name">${u.full_name}</div>
          <div class="of-user-role">${icon} ${roleText} · ${u.username}</div>
        </div>
        <span style="font-size: .72rem; padding: .2rem .6rem; border-radius: 99px; 
          background: ${u.is_active ? '#DCFCE7' : '#FEE2E2'}; 
          color: ${u.is_active ? '#166534' : '#991B1B'}; font-weight: 700;">
          ${u.is_active ? '✅ ใช้งาน' : '❌ ปิด'}
        </span>
      </div>
      <div class="of-user-meta">
        <div>${meta.join(' · ')}</div>
        <div style="text-align: right;">${u.email}</div>
        <div style="grid-column:1/-1">สมัคร ${formatDateTimeTH(u.created_at)} · แก้ไขล่าสุด ${formatDateTimeTH(u.updated_at)}</div>
      </div>
      <div class="of-user-actions">
        <button class="of-btn-sm" onclick="ofEditUser(${u.user_id})">✏️ แก้ไข</button>
        <button class="of-btn-sm of-btn-danger" onclick="ofDeleteUser(${u.user_id}, '${u.full_name}')">🗑 ลบ</button>
      </div>
    </div>`;
  }).join('');
}

function ofSetFilter(role) {
  _ofFilter = role;
  _renderOfficerPanel();
}

function ofSetDateRange(range) {
  _ofDateRange = range;
  ofLoadUsers();
}

function ofReloadUsers() {
  ofLoadUsers();
}

function ofEditUser(uid) {
  const user = _ofUsers.find(u => u.user_id === uid);
  if(!user) return;
  
  const overlay = document.createElement('div');
  overlay.className = 'overlay show';
  overlay.id = 'of-modal';
  overlay.onclick = (e) => {
    if(e.target === overlay) overlay.remove();
  };
  
  overlay.innerHTML = `
    <div class="modal" style="max-width: 520px; width: 100%; padding: 1.5rem; max-height: 90vh; overflow-y: auto;">
      <div class="modal-t" style="font-size: 1.05rem; margin-bottom: 1.1rem;">
        ✏️ แก้ไขข้อมูลผู้ใช้
      </div>
      
      <div style="margin-bottom: .85rem;">
        <label style="font-weight: 700; font-size: .82rem; display: block; margin-bottom: .3rem;">ชื่อ-นามสกุล *</label>
        <input id="of-name" type="text" class="fc" value="${_esc(user.full_name)}" style="font-size: .88rem; padding: .6rem .85rem;">
      </div>
      
      <div style="margin-bottom: .85rem;">
        <label style="font-weight: 700; font-size: .82rem; display: block; margin-bottom: .3rem;">อีเมล *</label>
        <input id="of-email" type="email" class="fc" value="${_esc(user.email)}" style="font-size: .88rem; padding: .6rem .85rem;">
      </div>
      
      ${user.role === 'student' ? `
        <div style="margin-bottom: .85rem;">
          <label style="font-weight: 700; font-size: .82rem; display: block; margin-bottom: .3rem;">ห้องเรียน</label>
          <select id="of-grade" class="fc" style="font-size: .88rem; padding: .6rem .85rem;"></select>
        </div>
        <div style="margin-bottom: .85rem;">
          <label style="font-weight: 700; font-size: .82rem; display: block; margin-bottom: .3rem;">เลขที่ (เว้นว่างได้)</label>
          <input id="of-student-no" class="fc" inputmode="numeric" maxlength="2" value="${user.student_no ?? ''}" style="font-size: .88rem; padding: .6rem .85rem;">
        </div>
      ` : user.role === 'parent' ? `
        <div style="margin-bottom: .85rem;">
          <label style="font-weight: 700; font-size: .82rem; display: block; margin-bottom: .3rem;">เบอร์โทร</label>
          <input id="of-phone" type="text" class="fc" value="${_esc(user.phone || '')}" 
            placeholder="0812345678" style="font-size: .88rem; padding: .6rem .85rem;">
        </div>
      ` : `
        <div style="margin-bottom: .85rem;">
          <label style="font-weight: 700; font-size: .82rem; display: block; margin-bottom: .3rem;">แผนก/ฝ่าย</label>
          <input id="of-dept" type="text" class="fc" value="${_esc(user.department || '')}" 
            placeholder="เช่น กลุ่มสาระหลัก" style="font-size: .88rem; padding: .6rem .85rem;">
        </div>
      `}
      
      ${user.role === 'teacher' ? '<div id="of-assign" style="margin-bottom: .85rem;">⏳ กำลังโหลดห้องและวิชาที่สอน...</div>' : ''}

      <div style="display: flex; gap: .65rem; justify-content: flex-end; padding-top: .75rem; border-top: 1px solid #F1F5F9; margin-top: .75rem;">
        <button class="btn btn-sm" onclick="document.getElementById('of-modal').remove()">ยกเลิก</button>
        <button class="lp-btn-play" style="padding: .6rem 1.4rem; font-size: .88rem;" 
          onclick="ofSaveUser(${uid})">💾 บันทึก</button>
      </div>
      <div id="of-msg" style="font-size: .85rem; margin-top: .5rem; text-align: center;"></div>
    </div>`;

  document.body.appendChild(overlay);
  fillClassroomSelect(document.getElementById('of-grade'), user.classroom_id);
  if (user.role === 'teacher') ofLoadAssignments(uid);
}

async function ofLoadAssignments(uid) {
  const [roomRes, subRes, asgRes] = await Promise.all([apiClassrooms(), apiSubjects(), apiTeacherAssignments(uid)]);
  const el = document.getElementById('of-assign');
  if (!el) return;
  if (!roomRes.ok || !subRes.ok || !asgRes.ok) {
    el.textContent = 'โหลดห้องและวิชาที่สอนไม่สำเร็จ';
    return;
  }
  renderAssignmentForm(el, roomRes.classrooms, subRes.subjects, asgRes.assignments);
}

async function ofSaveUser(uid) {
  const name = document.getElementById('of-name')?.value.trim();
  const email = document.getElementById('of-email')?.value.trim();
  const grade = document.getElementById('of-grade')?.value.trim();
  const phone = document.getElementById('of-phone')?.value.trim();
  const dept = document.getElementById('of-dept')?.value.trim();
  const msg = document.getElementById('of-msg');
  
  if(!name || !email) {
    if(msg) msg.innerHTML = '<span style="color: #EF4444;">⚠️ ต้องกรอกชื่อและอีเมล</span>';
    return;
  }
  
  if(msg) msg.innerHTML = '<span style="color: var(--mu);">⏳ กำลังบันทึก...</span>';
  
  const payload = { user_id: uid, full_name: name, email };
  if(grade) payload.classroom_id = grade;
  const studentNo = document.getElementById('of-student-no');
  if(studentNo) payload.student_no = studentNo.value.trim();
  if(phone) payload.phone = phone;
  if(dept) payload.department = dept;
  
  let res;
  try {
    res = await apiOfficerUpdateUser(payload);
  } catch(e) {
    res = { ok: false, error: 'เชื่อมต่อไม่ได้' };
  }
  
  const assignEl = document.getElementById('of-assign');
  if(res.ok && assignEl?.querySelector('select')) {
    res = await apiSaveTeacherAssignments({ user_id: uid, ...readAssignmentForm(assignEl) }).catch(() => ({ ok: false }));
  }

  if(res.ok) {
    document.getElementById('of-modal')?.remove();
    await ofLoadUsers();
  } else {
    if(msg) msg.innerHTML = `<span style="color: #EF4444;">❌ ${res.error || 'บันทึกไม่สำเร็จ'}</span>`;
  }
}

async function ofDeleteUser(uid, name) {
  if(!confirm(`ลบผู้ใช้ "${name}" ?`)) return;
  
  let res;
  try {
    res = await apiOfficerDeleteUser({ user_id: uid });
  } catch(e) {
    alert('❌ เชื่อมต่อไม่ได้');
    return;
  }
  
  if(res.ok) {
    await ofLoadUsers();
  } else {
    alert('❌ ลบไม่สำเร็จ: ' + (res.error || 'Unknown error'));
  }
}

function _esc(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ════════ เพิ่มเจ้าหน้าที่ / ผู้บริหาร (Officer) ════════
function ofOpenCreateStaff() {
  const overlay = document.createElement('div');
  overlay.className = 'overlay show';
  overlay.id = 'of-create-staff-modal';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML = `
    <div class="modal" style="max-width:520px;width:100%;padding:1.5rem">
      <div class="modal-t" style="font-size:1.05rem;margin-bottom:1.1rem">➕ เพิ่มเจ้าหน้าที่ / ผู้บริหาร</div>

      <div style="margin-bottom:.75rem">
        <label style="font-weight:700;font-size:.82rem;display:block;margin-bottom:.3rem">ตำแหน่ง *</label>
        <select id="ocs-role" class="fc" style="font-size:.88rem;padding:.6rem .85rem" onchange="ofToggleStaffFields()">
          <option value="officer">👔 เจ้าหน้าที่ (Officer)</option>
          <option value="executive">💼 ผู้บริหาร (Executive)</option>
        </select>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.65rem;margin-bottom:.75rem">
        <div>
          <label style="font-weight:700;font-size:.82rem;display:block;margin-bottom:.3rem">ชื่อ-นามสกุล *</label>
          <input id="ocs-name" type="text" class="fc" placeholder="สมหญิง ใจดี" style="font-size:.88rem;padding:.6rem .85rem">
        </div>
        <div>
          <label style="font-weight:700;font-size:.82rem;display:block;margin-bottom:.3rem">Username *</label>
          <input id="ocs-username" type="text" class="fc" placeholder="officer02" style="font-size:.88rem;padding:.6rem .85rem">
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.65rem;margin-bottom:.75rem">
        <div>
          <label style="font-weight:700;font-size:.82rem;display:block;margin-bottom:.3rem">อีเมล *</label>
          <input id="ocs-email" type="email" class="fc" placeholder="staff@school.ac.th" style="font-size:.88rem;padding:.6rem .85rem">
        </div>
        <div>
          <label style="font-weight:700;font-size:.82rem;display:block;margin-bottom:.3rem">รหัสผ่านเริ่มต้น</label>
          <input id="ocs-password" type="text" class="fc" value="kidlearn123" style="font-size:.88rem;padding:.6rem .85rem">
        </div>
      </div>

      <div style="margin-bottom:.75rem">
        <label style="font-weight:700;font-size:.82rem;display:block;margin-bottom:.3rem">แผนก / ฝ่าย</label>
        <input id="ocs-dept" type="text" class="fc" placeholder="เช่น ฝ่ายวิชาการ" style="font-size:.88rem;padding:.6rem .85rem">
      </div>

      <div id="ocs-title-wrap" style="margin-bottom:.75rem;display:none">
        <label style="font-weight:700;font-size:.82rem;display:block;margin-bottom:.3rem">ตำแหน่งพิเศษ (executive)</label>
        <input id="ocs-title" type="text" class="fc" placeholder="เช่น ผู้อำนวยการ" style="font-size:.88rem;padding:.6rem .85rem">
      </div>

      <div style="margin-bottom:.75rem">
        <label style="font-weight:700;font-size:.82rem;display:block;margin-bottom:.3rem">สิทธิ์พิเศษ (เว้นว่างได้)</label>
        <input id="ocs-permissions" type="text" class="fc" placeholder="เช่น manage_users,view_reports" style="font-size:.88rem;padding:.6rem .85rem">
      </div>

      <div style="display:flex;gap:.65rem;justify-content:flex-end;padding-top:.75rem;border-top:1px solid #F1F5F9;margin-top:.5rem">
        <button class="btn btn-sm" onclick="document.getElementById('of-create-staff-modal').remove()">ยกเลิก</button>
        <button class="lp-btn-play" style="padding:.6rem 1.4rem;font-size:.88rem" onclick="ofSubmitCreateStaff()">💾 สร้างบัญชี</button>
      </div>
      <div id="ocs-msg" style="font-size:.85rem;margin-top:.5rem;text-align:center"></div>
    </div>`;
  document.body.appendChild(overlay);
}

function ofToggleStaffFields() {
  const role = document.getElementById('ocs-role')?.value;
  const w = document.getElementById('ocs-title-wrap');
  if (w) w.style.display = role === 'executive' ? 'block' : 'none';
}

async function ofSubmitCreateStaff() {
  const msg = document.getElementById('ocs-msg');
  const payload = {
    role:        document.getElementById('ocs-role')?.value,
    full_name:   document.getElementById('ocs-name')?.value.trim(),
    username:    document.getElementById('ocs-username')?.value.trim(),
    email:       document.getElementById('ocs-email')?.value.trim(),
    password:    document.getElementById('ocs-password')?.value.trim() || 'kidlearn123',
    department:  document.getElementById('ocs-dept')?.value.trim(),
    title:       document.getElementById('ocs-title')?.value.trim(),
    permissions: document.getElementById('ocs-permissions')?.value.trim(),
  };
  if (!payload.full_name || !payload.username || !payload.email) {
    msg.innerHTML = '<span style="color:#EF4444">⚠️ ต้องกรอกชื่อ, username, อีเมล</span>'; return;
  }
  msg.innerHTML = '<span style="color:var(--mu)">⏳ กำลังสร้าง...</span>';
  const res = await _api('officer_create_staff', { body: payload }).catch(() => ({ ok: false, error: 'เชื่อมต่อไม่ได้' }));
  if (res.ok) {
    document.getElementById('of-create-staff-modal')?.remove();
    alert(`✅ สร้างบัญชี ${payload.role} "${payload.full_name}" สำเร็จ\nรหัสผ่าน: ${payload.password}`);
    ofLoadUsers();
  } else {
    msg.innerHTML = `<span style="color:#EF4444">❌ ${res.error || 'สร้างไม่สำเร็จ'}</span>`;
  }
}
function _ofRenderUsersTab() {
  const wrap = document.getElementById('of-tab-users');
  if (!wrap) return;
  wrap.innerHTML = `
    <style>
      .of-user-card{border:1.5px solid #E5E7EB;border-radius:12px;padding:1rem;margin-bottom:.75rem;background:#fff;transition:all .2s}
      .of-user-card:hover{border-color:#C7D2FE;box-shadow:0 4px 12px rgba(0,0,0,.08)}
      .of-user-head{display:flex;align-items:center;gap:.75rem;margin-bottom:.75rem}
      .of-user-av{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--s),#A5B4FC);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700}
      .of-user-info{flex:1}
      .of-user-name{font-weight:700;font-size:.95rem}
      .of-user-role{font-size:.82rem;color:var(--mu)}
      .of-user-meta{display:grid;grid-template-columns:1fr auto;gap:.4rem;font-size:.8rem;color:#666}
      .of-user-actions{display:flex;gap:.4rem;flex-wrap:wrap}
      .of-btn-sm{padding:.4rem .7rem;font-size:.75rem;border:1px solid #E2E8F0;border-radius:6px;background:#fff;cursor:pointer;font-family:'KoHo',sans-serif;transition:all .15s}
      .of-btn-sm:hover{background:#EEF2FF;border-color:#A5B4FC;color:var(--s)}
      .of-btn-danger:hover{background:#FEE2E2;border-color:#FECACA;color:#DC2626}
    </style>
    <div style="display:grid;grid-template-columns:220px 1fr;gap:1rem;align-items:start" id="of-grid">
      <div style="background:#fff;border-radius:14px;padding:1rem;box-shadow:0 2px 8px rgba(0,0,0,.06);max-height:76vh;overflow-y:auto">
        <div style="font-weight:800;font-size:.88rem;color:var(--s);margin-bottom:.85rem">🔍 กรองตาม Role</div>
        <div style="display:flex;flex-direction:column;gap:.4rem">
          ${['all','student','parent','teacher','officer','executive'].map(r=>{
            const labels={'all':'👥 ทั้งหมด','student':'👦 นักเรียน','parent':'👨‍👩 ผู้ปกครอง','teacher':'👩‍🏫 ครู','officer':'👔 เจ้าหน้าที่','executive':'💼 ผู้บริหาร'};
            const active=_ofFilter===r;
            return `<button class="of-btn-sm" onclick="ofSetFilter('${r}')"
              style="border:${active?'2px solid var(--s)':'1px solid #E2E8F0'};background:${active?'#EEF2FF':'#fff'};color:${active?'var(--s)':'var(--tx)'};text-align:left">
              ${labels[r]}</button>`;
          }).join('')}
        </div>
        <div style="font-weight:800;font-size:.88rem;color:var(--s);margin:.9rem 0 .5rem">📅 ช่วงวันที่สมัคร</div>
        <select class="fc" style="padding:.5rem;font-size:.82rem" onchange="ofSetDateRange(this.value)">
          <option value="all"${_ofDateRange==='all'?' selected':''}>ทุกช่วง</option>
          <option value="7d"${_ofDateRange==='7d'?' selected':''}>ย้อนหลัง 7 วัน</option>
          <option value="1m"${_ofDateRange==='1m'?' selected':''}>ย้อนหลัง 1 เดือน</option>
          <option value="1y"${_ofDateRange==='1y'?' selected':''}>ย้อนหลัง 1 ปี</option>
        </select>
        <div style="font-size:.72rem;color:var(--mu);margin-top:.35rem">นับย้อนหลังจากเวลาปัจจุบัน ไม่ใช่เดือนหรือปีปฏิทิน</div>
      </div>
      <div id="of-users-list" style="background:#fff;border-radius:14px;padding:1.25rem;box-shadow:0 2px 8px rgba(0,0,0,.06)">
        <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:1rem;padding:.75rem 1rem;background:linear-gradient(135deg,#EEF2FF,#F0F9FF);border-radius:12px">
          <span style="font-size:1.5rem">👔</span>
          <div style="flex:1">
            <div style="font-weight:800;font-size:.95rem">จัดการข้อมูลผู้ใช้</div>
            <div style="font-size:.73rem;color:var(--mu)">ดูแลและอัปเดตข้อมูลสมาชิก</div>
          </div>
          <button class="lp-btn-play" style="padding:.5rem 1.25rem;font-size:.85rem" onclick="ofReloadUsers()">🔄 รีโหลด</button>
          <button class="lp-btn-play" style="padding:.5rem 1.25rem;font-size:.85rem;background:var(--g)" onclick="ofOpenCreateStaff()">➕ เพิ่มบุคลากร</button>
        </div>
        <div id="of-users-content" style="color:var(--mu);padding:2rem;text-align:center">⏳ กำลังโหลด...</div>
      </div>
    </div>`;
  if (window.innerWidth < 768) {
    const g = document.getElementById('of-grid');
    if (g) g.style.gridTemplateColumns = '1fr';
  }
  ofLoadUsers();
}
