// ══════════════════════════════════════════════════════
// OFFICER DASHBOARD — เจ้าหน้าที่จัดการข้อมูลผู้ใช้
// ══════════════════════════════════════════════════════

let _ofUsers = [];
let _ofFilter = 'all';

function _renderOfficerPanel(){
  const panel = document.getElementById('tc-game-panel');
  if(!panel) return;
  
  panel.innerHTML = `
    <style>
      .of-user-card { border: 1.5px solid #E5E7EB; border-radius: 12px; padding: 1rem; margin-bottom: 0.75rem;
        background: #fff; transition: all .2s; }
      .of-user-card:hover { border-color: #C7D2FE; box-shadow: 0 4px 12px rgba(0,0,0,.08); }
      .of-user-head { display: flex; align-items: center; gap: .75rem; margin-bottom: .75rem; }
      .of-user-av { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg,var(--s),#A5B4FC);
        display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; }
      .of-user-info { flex: 1; }
      .of-user-name { font-weight: 700; font-size: .95rem; }
      .of-user-role { font-size: .82rem; color: var(--mu); }
      .of-user-meta { display: grid; grid-template-columns: 1fr auto; gap: .4rem; 
        font-size: .8rem; color: #666; }
      .of-user-actions { display: flex; gap: .4rem; flex-wrap: wrap; }
      .of-btn-sm { padding: .4rem .7rem; font-size: .75rem; border: 1px solid #E2E8F0; 
        border-radius: 6px; background: #fff; cursor: pointer; font-family: 'Kanit',sans-serif;
        transition: all .15s; }
      .of-btn-sm:hover { background: #EEF2FF; border-color: #A5B4FC; color: var(--s); }
      .of-btn-danger:hover { background: #FEE2E2; border-color: #FECACA; color: #DC2626; }
    </style>
    
    <div style="display: grid; grid-template-columns: 220px 1fr; gap: 1rem; align-items: start;" id="of-grid">
      <!-- ซ้าย: ตัวกรอง -->
      <div style="background: #fff; border-radius: 14px; padding: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,.06); max-height: 76vh; overflow-y: auto;">
        <div style="font-weight: 800; font-size: .88rem; color: var(--s); margin-bottom: .85rem;">🔍 กรองตาม Role</div>
        <div style="display: flex; flex-direction: column; gap: .4rem;">
          <button class="of-btn-sm ${_ofFilter === 'all' ? 'active' : ''}" 
            onclick="ofSetFilter('all')" 
            style="border: ${_ofFilter === 'all' ? '2px solid var(--s)' : '1px solid #E2E8F0'}; 
                   background: ${_ofFilter === 'all' ? '#EEF2FF' : '#fff'}; 
                   color: ${_ofFilter === 'all' ? 'var(--s)' : 'var(--tx)'}; text-align: left;">
            👥 ทั้งหมด
          </button>
          <button class="of-btn-sm" onclick="ofSetFilter('student')" 
            style="border: ${_ofFilter === 'student' ? '2px solid var(--s)' : '1px solid #E2E8F0'}; 
                   background: ${_ofFilter === 'student' ? '#EEF2FF' : '#fff'}; 
                   color: ${_ofFilter === 'student' ? 'var(--s)' : 'var(--tx)'}; text-align: left;">
            👦 นักเรียน
          </button>
          <button class="of-btn-sm" onclick="ofSetFilter('parent')" 
            style="border: ${_ofFilter === 'parent' ? '2px solid var(--s)' : '1px solid #E2E8F0'}; 
                   background: ${_ofFilter === 'parent' ? '#EEF2FF' : '#fff'}; 
                   color: ${_ofFilter === 'parent' ? 'var(--s)' : 'var(--tx)'}; text-align: left;">
            👨‍👩 ผู้ปกครอง
          </button>
          <button class="of-btn-sm" onclick="ofSetFilter('teacher')" 
            style="border: ${_ofFilter === 'teacher' ? '2px solid var(--s)' : '1px solid #E2E8F0'}; 
                   background: ${_ofFilter === 'teacher' ? '#EEF2FF' : '#fff'}; 
                   color: ${_ofFilter === 'teacher' ? 'var(--s)' : 'var(--tx)'}; text-align: left;">
            👩‍🏫 ครู
          </button>
          <button class="of-btn-sm" onclick="ofSetFilter('officer')" 
            style="border: ${_ofFilter === 'officer' ? '2px solid var(--s)' : '1px solid #E2E8F0'}; 
                   background: ${_ofFilter === 'officer' ? '#EEF2FF' : '#fff'}; 
                   color: ${_ofFilter === 'officer' ? 'var(--s)' : 'var(--tx)'}; text-align: left;">
            👔 เจ้าหน้าที่
          </button>
          <button class="of-btn-sm" onclick="ofSetFilter('executive')" 
            style="border: ${_ofFilter === 'executive' ? '2px solid var(--s)' : '1px solid #E2E8F0'}; 
                   background: ${_ofFilter === 'executive' ? '#EEF2FF' : '#fff'}; 
                   color: ${_ofFilter === 'executive' ? 'var(--s)' : 'var(--tx)'}; text-align: left;">
            💼 ผู้บริหาร
          </button>
        </div>
      </div>
      
      <!-- ขวา: รายชื่อผู้ใช้ -->
      <div id="of-users-list" style="background: #fff; border-radius: 14px; padding: 1.25rem; box-shadow: 0 2px 8px rgba(0,0,0,.06);">
        <div style="display: flex; align-items: center; gap: .75rem; margin-bottom: 1rem; padding: .75rem 1rem; 
          background: linear-gradient(135deg,#EEF2FF,#F0F9FF); border-radius: 12px;">
          <span style="font-size: 1.5rem;">👔</span>
          <div style="flex: 1;">
            <div style="font-weight: 800; font-size: .95rem;">จัดการข้อมูลผู้ใช้</div>
            <div style="font-size: .73rem; color: var(--mu);">ดูแลและอัปเดตข้อมูลสมาชิก</div>
          </div>
          <button class="lp-btn-play" style="padding: .5rem 1.25rem; font-size: .85rem;" onclick="ofReloadUsers()">🔄 รีโหลด</button>
        </div>
        <div id="of-users-content" style="color: var(--mu); padding: 2rem; text-align: center;">⏳ กำลังโหลด...</div>
      </div>
    </div>`;
  
  if(window.innerWidth < 768) {
    const g = document.getElementById('of-grid');
    if(g) g.style.gridTemplateColumns = '1fr';
  }
  
  ofLoadUsers();
}

async function ofLoadUsers() {
  const content = document.getElementById('of-users-content');
  if(!content) return;
  content.innerHTML = '⏳ กำลังโหลด...';
  
  try {
    const res = await apiOfficerUsers();
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
    if(u.grade) meta.push(`📚 ${u.grade}`);
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
    <div class="modal" style="max-width: 520px; width: 100%; padding: 1.5rem;">
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
          <label style="font-weight: 700; font-size: .82rem; display: block; margin-bottom: .3rem;">ชั้นเรียน</label>
          <input id="of-grade" type="text" class="fc" value="${_esc(user.grade || '')}" 
            placeholder="เช่น ป.1" style="font-size: .88rem; padding: .6rem .85rem;">
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
      
      <div style="display: flex; gap: .65rem; justify-content: flex-end; padding-top: .75rem; border-top: 1px solid #F1F5F9; margin-top: .75rem;">
        <button class="btn btn-sm" onclick="document.getElementById('of-modal').remove()">ยกเลิก</button>
        <button class="lp-btn-play" style="padding: .6rem 1.4rem; font-size: .88rem;" 
          onclick="ofSaveUser(${uid})">💾 บันทึก</button>
      </div>
      <div id="of-msg" style="font-size: .85rem; margin-top: .5rem; text-align: center;"></div>
    </div>`;
  
  document.body.appendChild(overlay);
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
  if(grade) payload.grade = grade;
  if(phone) payload.phone = phone;
  if(dept) payload.department = dept;
  
  let res;
  try {
    res = await apiOfficerUpdateUser(payload);
  } catch(e) {
    res = { ok: false, error: 'เชื่อมต่อไม่ได้' };
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
