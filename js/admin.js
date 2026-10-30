// ══════════════════════════════════════════════════════
// ADMIN — จัดการผู้ใช้ (2.0) + ออกรายงาน (8.0)
// ══════════════════════════════════════════════════════
if(typeof A.adminTab==='undefined') A.adminTab='users';
if(typeof A.adminRole==='undefined') A.adminRole='';
if(typeof A.adminSearch==='undefined') A.adminSearch='';
if(typeof A.adminDateRange==='undefined') A.adminDateRange='all';
if(typeof A.reportTab==='undefined') A.reportTab='summary';

async function loadAdmin() {
  if(A.role!=='admin') return;
  _renderAdminTabs();
  if(A.adminTab==='users') await _loadAdminUsers();
  else if(A.adminTab==='subjects') await _loadAdminSubjects();
  else await _loadReports();
}

function _renderAdminTabs(){
  const wrap=document.getElementById('adm-tabs');
  if(!wrap)return;
  wrap.innerHTML=`
    <button class="rec-tab${A.adminTab==='users'?' active':''}"   onclick="switchAdminTab('users')">👥 จัดการผู้ใช้</button>
    <button class="rec-tab${A.adminTab==='subjects'?' active':''}" onclick="switchAdminTab('subjects')">📚 วิชา</button>
    <button class="rec-tab${A.adminTab==='reports'?' active':''}" onclick="switchAdminTab('reports')">📊 รายงาน</button>`;
  document.getElementById('adm-users-panel').style.display  =A.adminTab==='users'  ?'block':'none';
  document.getElementById('adm-subject-panel').style.display=A.adminTab==='subjects'?'block':'none';
  document.getElementById('adm-report-panel').style.display =A.adminTab==='reports'?'block':'none';
}
function switchAdminTab(t){A.adminTab=t;_renderAdminTabs();loadAdmin();}

// ════════ 3.0 จัดการวิชา ════════
async function _loadAdminSubjects(){
  const el=document.getElementById('adm-subject-list');
  const res=await apiSubjects().catch(()=>({ok:false}));
  if(!res.ok){el.innerHTML='<div style="color:#EF4444">โหลดวิชาไม่สำเร็จ</div>';return;}
  el.innerHTML=`
    <div style="display:flex;gap:.4rem;margin-bottom:.75rem">
      <input class="fc" id="adm-new-subject" placeholder="ชื่อวิชาใหม่" maxlength="100" onkeydown="if(event.key==='Enter')adminAddSubject()">
      <button class="btn btn-p" style="white-space:nowrap" onclick="adminAddSubject()">➕ เพิ่มวิชา</button>
    </div>
    ${(res.subjects||[]).map(s=>`<div style="display:flex;align-items:center;gap:.5rem;padding:.5rem .25rem;border-bottom:1px solid #F1F5F9">
      <span>${s.icon||'📚'} ${_esc(s.name)}</span>
      <button class="btn" style="margin-left:auto" onclick="adminDeleteSubject(${s.subject_id},this.previousElementSibling.textContent)">🗑️ ลบ</button>
    </div>`).join('')}`;
}
async function adminAddSubject(){
  const name=document.getElementById('adm-new-subject').value.trim();
  if(!name)return;
  const res=await apiAddSubject(name).catch(()=>({ok:false}));
  if(!res.ok){alert(res.error||'เพิ่มวิชาไม่สำเร็จ');return;}
  _loadAdminSubjects();
}
async function adminDeleteSubject(id, name){
  if(!confirm(`ยืนยันลบวิชา "${name}"?`))return;
  const res=await apiDeleteSubject(id).catch(()=>({ok:false}));
  if(!res.ok){alert(res.error||'ลบวิชาไม่สำเร็จ');return;}
  _loadAdminSubjects();
}

// ════════ 2.0 จัดการผู้ใช้ ════════
async function _loadAdminUsers(){
  const el=document.getElementById('adm-user-list');
  if(!el)return;
  el.innerHTML='<div style="color:var(--mu);padding:1rem">⏳ กำลังโหลด...</div>';
  const res=await apiAdminUsers({role:A.adminRole,search:A.adminSearch,date_range:A.adminDateRange}).catch(()=>({ok:false,users:[]}));
  const users=res.ok?(res.users||[]):[];
  const total=res.total||0;

  const roleOpts=['','student','parent','teacher','admin'].map(r=>
    `<option value="${r}"${A.adminRole===r?' selected':''}>${r||'ทุก role'}</option>`).join('');

  el.innerHTML=`
    <div style="display:flex;gap:.65rem;flex-wrap:wrap;margin-bottom:1rem;align-items:center">
      <select class="fc" style="width:140px;padding:.5rem .75rem;font-size:.85rem" onchange="A.adminRole=this.value;_loadAdminUsers()">${roleOpts}</select>
      <select class="fc" style="width:170px;padding:.5rem .75rem;font-size:.85rem" onchange="A.adminDateRange=this.value;_loadAdminUsers()">
        <option value="all"${A.adminDateRange==='all'?' selected':''}>สมัครทุกช่วง</option>
        <option value="7d"${A.adminDateRange==='7d'?' selected':''}>ย้อนหลัง 7 วัน</option>
        <option value="1m"${A.adminDateRange==='1m'?' selected':''}>ย้อนหลัง 1 เดือนจากเวลานี้</option>
        <option value="1y"${A.adminDateRange==='1y'?' selected':''}>ย้อนหลัง 1 ปีจากเวลานี้</option>
      </select>
      <input class="fc" type="text" placeholder="ค้นหาชื่อ/username..." value="${A.adminSearch}"
        style="flex:1;min-width:160px;padding:.5rem .75rem;font-size:.85rem"
        oninput="A.adminSearch=this.value" onkeydown="if(event.key==='Enter')_loadAdminUsers()">
      <button class="btn btn-s btn-sm" onclick="_loadAdminUsers()">🔍 ค้นหา</button>
      <button class="lp-btn-play" style="padding:.45rem 1rem;font-size:.82rem;white-space:nowrap" onclick="adminOpenCreateStaff()">➕ เพิ่มเจ้าหน้าที่/ผู้บริหาร</button>
      <span style="font-size:.82rem;color:var(--mu)">ทั้งหมด ${total} คน</span>
    </div>
    <div style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:.82rem;min-width:900px">
      <thead><tr style="background:var(--s);color:#fff">
        <th style="padding:.55rem .75rem;text-align:left">ชื่อ</th>
        <th style="padding:.55rem .75rem;text-align:left">Username</th>
        <th style="padding:.55rem .75rem;text-align:center">Role</th>
        <th style="padding:.55rem .75rem;text-align:center">สถานะ</th>
        <th style="padding:.55rem .75rem;text-align:center">วันที่สมัคร</th>
        <th style="padding:.55rem .75rem;text-align:center">แก้ไขล่าสุด</th>
        <th style="padding:.55rem .75rem;text-align:left">ข้อมูลเพิ่มเติม</th>
        <th style="padding:.55rem .75rem;text-align:center">จัดการ</th>
      </tr></thead>
      <tbody>${users.map(u=>_renderUserRow(u)).join('')}</tbody>
    </table></div>`;
}

function _renderUserRow(u){
  const roleColor={student:'#10B981',parent:'#3B82F6',teacher:'#F59E0B',admin:'#EF4444'};
  const extra=u.role==='student'?`ชั้น ${classLabel(u)}`:u.role==='parent'?`โทร ${u.phone}`:u.role==='teacher'?u.department:'—';
  return `<tr style="border-bottom:1px solid #F1F5F9">
    <td style="padding:.55rem .75rem;font-weight:600">${u.full_name}</td>
    <td style="padding:.55rem .75rem;color:var(--mu)">${u.username}</td>
    <td style="padding:.55rem .75rem;text-align:center">
      <span style="background:${roleColor[u.role]||'#888'}22;color:${roleColor[u.role]||'#888'};
        padding:.15rem .55rem;border-radius:99px;font-size:.75rem;font-weight:700">${u.role}</span>
    </td>
    <td style="padding:.55rem .75rem;text-align:center">
      <span style="color:${u.is_active?'#10B981':'#EF4444'};font-weight:700;font-size:.82rem">
        ${u.is_active?'✅ ใช้งาน':'⛔ ระงับ'}</span>
    </td>
    <td style="padding:.55rem .75rem;text-align:center;white-space:nowrap">${formatDateTimeTH(u.created_at)}</td>
    <td style="padding:.55rem .75rem;text-align:center;white-space:nowrap">${formatDateTimeTH(u.updated_at)}</td>
    <td style="padding:.55rem .75rem;font-size:.78rem;color:var(--mu)">${extra}</td>
    <td style="padding:.55rem .75rem;text-align:center">
      <div style="display:flex;gap:.3rem;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-sm" style="background:#FEF3C7;color:#92400E;border:1px solid #FCD34D;font-size:.72rem"
          onclick="adminToggleUser(${u.user_id},${u.is_active})">${u.is_active?'⛔ ระงับ':'✅ เปิดใช้'}</button>
        <button class="btn btn-sm" style="background:#EEF2FF;color:var(--s);border:1px solid #C7D2FE;font-size:.72rem"
          onclick="adminResetPass(${u.user_id},'${u.full_name}')">🔑 รีเซ็ต</button>
        ${u.role!=='admin'?`<button class="btn btn-sm" style="background:#FEE2E2;color:#991B1B;border:1px solid #FCA5A5;font-size:.72rem"
          onclick="adminDeleteUser(${u.user_id},'${u.full_name}')">🗑 ลบ</button>`:''}
      </div>
    </td>
  </tr>`;
}

async function adminToggleUser(uid, isActive){
  if(!confirm(`${isActive?'ระงับ':'เปิดใช้'}บัญชีนี้?`))return;
  const res=await apiAdminToggleUser({user_id:uid});
  if(res.ok)_loadAdminUsers();
}
async function adminResetPass(uid, name){
  const pass=prompt(`รีเซ็ตรหัสผ่านของ "${name}" เป็น:`, 'kidlearn123');
  if(!pass)return;
  const res=await apiAdminResetPass({user_id:uid,new_password:pass});
  if(res.ok)alert('✅ รีเซ็ตรหัสผ่านสำเร็จ');
}
async function adminDeleteUser(uid, name){
  if(!confirm(`ยืนยันลบบัญชี "${name}" ออกจากระบบ?\nข้อมูลทั้งหมดจะถูกลบถาวร`))return;
  const res=await apiAdminDeleteUser({user_id:uid});
  if(res.ok)_loadAdminUsers();
}

// ════════ 8.0 ออกรายงาน ════════


// ════════ เพิ่มเจ้าหน้าที่ / ผู้บริหาร (Admin) ════════
function adminOpenCreateStaff() {
  const overlay = document.createElement('div');
  overlay.className = 'overlay show';
  overlay.id = 'adm-create-staff-modal';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML = `
    <div class="modal" style="max-width:520px;width:100%;padding:1.5rem">
      <div class="modal-t" style="font-size:1.05rem;margin-bottom:1.1rem">➕ เพิ่มเจ้าหน้าที่ / ผู้บริหาร</div>

      <div style="margin-bottom:.75rem">
        <label style="font-weight:700;font-size:.82rem;display:block;margin-bottom:.3rem">ตำแหน่ง *</label>
        <select id="cs-role" class="fc" style="font-size:.88rem;padding:.6rem .85rem" onchange="adminToggleStaffFields()">
          <option value="officer">👔 เจ้าหน้าที่ (Officer)</option>
          <option value="executive">💼 ผู้บริหาร (Executive)</option>
        </select>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.65rem;margin-bottom:.75rem">
        <div>
          <label style="font-weight:700;font-size:.82rem;display:block;margin-bottom:.3rem">ชื่อ-นามสกุล *</label>
          <input id="cs-name" type="text" class="fc" placeholder="สมหญิง ใจดี" style="font-size:.88rem;padding:.6rem .85rem">
        </div>
        <div>
          <label style="font-weight:700;font-size:.82rem;display:block;margin-bottom:.3rem">Username *</label>
          <input id="cs-username" type="text" class="fc" placeholder="officer01" style="font-size:.88rem;padding:.6rem .85rem">
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.65rem;margin-bottom:.75rem">
        <div>
          <label style="font-weight:700;font-size:.82rem;display:block;margin-bottom:.3rem">อีเมล *</label>
          <input id="cs-email" type="email" class="fc" placeholder="officer@school.ac.th" style="font-size:.88rem;padding:.6rem .85rem">
        </div>
        <div>
          <label style="font-weight:700;font-size:.82rem;display:block;margin-bottom:.3rem">รหัสผ่านเริ่มต้น</label>
          <input id="cs-password" type="text" class="fc" value="kidlearn123" style="font-size:.88rem;padding:.6rem .85rem">
        </div>
      </div>

      <div style="margin-bottom:.75rem">
        <label style="font-weight:700;font-size:.82rem;display:block;margin-bottom:.3rem">แผนก / ฝ่าย</label>
        <input id="cs-dept" type="text" class="fc" placeholder="เช่น ฝ่ายวิชาการ" style="font-size:.88rem;padding:.6rem .85rem">
      </div>

      <div id="cs-title-wrap" style="margin-bottom:.75rem;display:none">
        <label style="font-weight:700;font-size:.82rem;display:block;margin-bottom:.3rem">ตำแหน่งพิเศษ (executive)</label>
        <input id="cs-title" type="text" class="fc" placeholder="เช่น ผู้อำนวยการ" style="font-size:.88rem;padding:.6rem .85rem">
      </div>

      <div style="margin-bottom:.75rem">
        <label style="font-weight:700;font-size:.82rem;display:block;margin-bottom:.3rem">สิทธิ์พิเศษ (เว้นว่างได้)</label>
        <input id="cs-permissions" type="text" class="fc" placeholder="เช่น manage_users,view_reports" style="font-size:.88rem;padding:.6rem .85rem">
      </div>

      <div style="display:flex;gap:.65rem;justify-content:flex-end;padding-top:.75rem;border-top:1px solid #F1F5F9;margin-top:.5rem">
        <button class="btn btn-sm" onclick="document.getElementById('adm-create-staff-modal').remove()">ยกเลิก</button>
        <button class="lp-btn-play" style="padding:.6rem 1.4rem;font-size:.88rem" onclick="adminSubmitCreateStaff()">💾 สร้างบัญชี</button>
      </div>
      <div id="cs-msg" style="font-size:.85rem;margin-top:.5rem;text-align:center"></div>
    </div>`;
  document.body.appendChild(overlay);
}

function adminToggleStaffFields() {
  const role = document.getElementById('cs-role')?.value;
  const titleWrap = document.getElementById('cs-title-wrap');
  if (titleWrap) titleWrap.style.display = role === 'executive' ? 'block' : 'none';
}

async function _loadReports(){
  const el=document.getElementById('adm-report-panel');
  if(!el)return;
  const tabs = [
    ['summary','ภาพรวม'],
    ['by_subject','รายวิชา'],
    ['by_student','รายนักเรียน'],
    ['daily','รายวัน'],
    ['engagement','Engagement'],
    ['at_risk','At Risk'],
    ['mastery','Mastery'],
    ['plans','Plans'],
    ['notifications','Notifications']
  ];
  el.innerHTML=`<div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:1rem">
    ${tabs.map(([t,l])=>`<button class="child-btn${A.reportTab===t?' active':''}" onclick="switchReportTab('${t}')">${l}</button>`).join('')}
  </div>
  <div id="report-content"><div style="color:var(--mu);padding:1rem">กำลังโหลด...</div></div>`;
  await _renderReport(A.reportTab);
}

function switchReportTab(t){
  A.reportTab=t;
  document.querySelectorAll('#adm-report-panel .child-btn').forEach((b,i)=>{
    const labels=['summary','by_subject','by_student','daily','engagement','at_risk','mastery','plans','notifications'];
    b.classList.toggle('active', labels[i]===t);
  });
  _renderReport(t);
}

async function _renderReport(type){
  const el=document.getElementById('report-content');
  if(!el)return;
  el.innerHTML='<div style="color:var(--mu);padding:1rem">กำลังโหลด...</div>';
  const res=await apiReport(type).catch(()=>({ok:false}));
  if(!res.ok){el.innerHTML='<div style="color:#EF4444;padding:1rem">โหลดข้อมูลไม่สำเร็จ</div>';return;}

  if(type==='summary'){
    el.innerHTML=`<div class="stats" style="margin:0">
      <div class="stat"><div class="sv">${res.total_students||0}</div><div class="sl2">นักเรียน</div></div>
      <div class="stat"><div class="sv">${res.total_parents||0}</div><div class="sl2">ผู้ปกครอง</div></div>
      <div class="stat"><div class="sv">${res.total_teachers||0}</div><div class="sl2">ครู</div></div>
      <div class="stat"><div class="sv">${res.total_plays||0}</div><div class="sl2">ครั้งที่เล่น</div></div>
      <div class="stat"><div class="sv">${Math.round(res.avg_score||0)}%</div><div class="sl2">คะแนนเฉลี่ย</div></div>
    </div>`;
    return;
  }
  if(type==='by_subject'){
    const rows=(res.subjects||[]).map(s=>`
      <tr style="border-bottom:1px solid #F1F5F9">
        <td style="padding:.6rem .75rem;font-weight:600">${s.subject_name}</td>
        <td style="padding:.6rem .75rem;text-align:center">${s.student_count||0}</td>
        <td style="padding:.6rem .75rem;text-align:center">${s.total_plays||0}</td>
        <td style="padding:.6rem .75rem;text-align:center">${Math.round(+s.avg_score||0)}%</td>
        <td style="padding:.6rem .75rem;text-align:center">${s.best_score||0}</td>
      </tr>`).join('');
    el.innerHTML=`<div class="tw"><table><thead><tr><th>วิชา</th><th style="text-align:center">นักเรียน</th><th style="text-align:center">เล่นแล้ว</th><th style="text-align:center">Avg Score</th><th style="text-align:center">Best</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    return;
  }
  if(type==='by_student'){
    const rows=(res.students||[]).map(s=>`
      <tr style="border-bottom:1px solid #F1F5F9">
        <td style="padding:.6rem .75rem;font-weight:600">${s.full_name}</td>
        <td style="padding:.6rem .75rem;text-align:center">${s.grade||'-'}</td>
        <td style="padding:.6rem .75rem;text-align:center">${s.total_plays||0}</td>
        <td style="padding:.6rem .75rem;text-align:center">${Math.round(+s.avg_score||0)}%</td>
        <td style="padding:.6rem .75rem">${s.last_active?new Date(s.last_active).toLocaleDateString('th-TH'):'-'}</td>
      </tr>`).join('');
    el.innerHTML=`<div class="tw"><table><thead><tr><th>นักเรียน</th><th style="text-align:center">ชั้น</th><th style="text-align:center">เล่นแล้ว</th><th style="text-align:center">Avg Score</th><th>ล่าสุด</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    return;
  }
  if(type==='daily'){
    const rows=(res.daily||[]).map(d=>`
      <tr style="border-bottom:1px solid #F1F5F9">
        <td style="padding:.6rem .75rem">${d.day}</td>
        <td style="padding:.6rem .75rem;text-align:center">${d.active_students||0}</td>
        <td style="padding:.6rem .75rem;text-align:center">${d.plays||0}</td>
        <td style="padding:.6rem .75rem;text-align:center">${Math.round(+d.avg_score||0)}%</td>
      </tr>`).join('');
    el.innerHTML=`<div class="tw"><table><thead><tr><th>วัน</th><th style="text-align:center">นักเรียนที่เล่น</th><th style="text-align:center">Plays</th><th style="text-align:center">Avg Score</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    return;
  }

  if(type==='engagement'){
    const rows=(res.engagement||[]).map(r=>`
      <tr style="border-bottom:1px solid #F1F5F9">
        <td style="padding:.6rem .75rem">${r.day}</td>
        <td style="padding:.6rem .75rem;text-align:center">${r.active_students}</td>
        <td style="padding:.6rem .75rem;text-align:center">${r.plays}</td>
        <td style="padding:.6rem .75rem;text-align:center">${Math.round(+r.avg_score||0)}%</td>
        <td style="padding:.6rem .75rem;text-align:center">${Math.round(+r.avg_time||0)} วิ</td>
      </tr>`).join('');
    el.innerHTML=`<div class="tw"><table><thead><tr><th>วัน</th><th style="text-align:center">Active</th><th style="text-align:center">Plays</th><th style="text-align:center">Avg Score</th><th style="text-align:center">Avg Time</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    return;
  }
  if(type==='at_risk'){
    const rows=(res.students||[]).map(s=>`
      <tr style="border-bottom:1px solid #F1F5F9">
        <td style="padding:.6rem .75rem;font-weight:600">${s.full_name}</td>
        <td style="padding:.6rem .75rem;text-align:center">${s.grade||'-'}</td>
        <td style="padding:.6rem .75rem;text-align:center">${Math.round(+s.avg_score||0)}%</td>
        <td style="padding:.6rem .75rem;text-align:center">${Math.round(+s.weakest_mastery||0)}%</td>
        <td style="padding:.6rem .75rem;text-align:center">${s.inactive_days||0}</td>
      </tr>`).join('');
    el.innerHTML=`<div class="tw"><table><thead><tr><th>นักเรียน</th><th style="text-align:center">ชั้น</th><th style="text-align:center">Avg Score</th><th style="text-align:center">Weakest Mastery</th><th style="text-align:center">Inactive Days</th></tr></thead><tbody>${rows||'<tr><td colspan="5" style="padding:1rem;text-align:center;color:var(--mu)">ไม่มีรายการเสี่ยง</td></tr>'}</tbody></table></div>`;
    return;
  }
  if(type==='mastery'){
    const rows=(res.mastery||[]).map(m=>`
      <tr style="border-bottom:1px solid #F1F5F9">
        <td style="padding:.6rem .75rem">${m.subject_name}</td>
        <td style="padding:.6rem .75rem">${m.skill_name}</td>
        <td style="padding:.6rem .75rem;text-align:center">${Math.round(+m.avg_mastery||0)}%</td>
        <td style="padding:.6rem .75rem;text-align:center">${m.student_count||0}</td>
      </tr>`).join('');
    el.innerHTML=`<div class="tw"><table><thead><tr><th>วิชา</th><th>หัวข้อ</th><th style="text-align:center">Avg Mastery</th><th style="text-align:center">Students</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    return;
  }
  if(type==='plans'){
    const rows=(res.plans||[]).map(p=>`
      <tr style="border-bottom:1px solid #F1F5F9">
        <td style="padding:.6rem .75rem;font-weight:600">${p.title}</td>
        <td style="padding:.6rem .75rem">${p.student_name}</td>
        <td style="padding:.6rem .75rem;text-align:center">${p.completed_items||0}/${p.total_items||0}</td>
        <td style="padding:.6rem .75rem;text-align:center">${p.status}</td>
        <td style="padding:.6rem .75rem">${p.week_start||'-'}</td>
      </tr>`).join('');
    el.innerHTML=`<div class="tw"><table><thead><tr><th>แผน</th><th>นักเรียน</th><th style="text-align:center">Progress</th><th style="text-align:center">Status</th><th>Week</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    return;
  }
  if(type==='notifications'){
    const rows=(res.notifications||[]).map(n=>`
      <tr style="border-bottom:1px solid #F1F5F9">
        <td style="padding:.6rem .75rem">${n.notif_type||'info'}</td>
        <td style="padding:.6rem .75rem;text-align:center">${n.total||0}</td>
        <td style="padding:.6rem .75rem;text-align:center">${n.unread||0}</td>
      </tr>`).join('');
    el.innerHTML=`<div class="tw"><table><thead><tr><th>Type</th><th style="text-align:center">Total</th><th style="text-align:center">Unread</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    return;
  }

  el.innerHTML='<div style="color:var(--mu);padding:1rem">ยังไม่มีรูปแบบรายงานนี้</div>';
}

async function adminSubmitCreateStaff() {
  const msg = document.getElementById('cs-msg');
  const payload = {
    role:        document.getElementById('cs-role')?.value,
    full_name:   document.getElementById('cs-name')?.value.trim(),
    username:    document.getElementById('cs-username')?.value.trim(),
    email:       document.getElementById('cs-email')?.value.trim(),
    password:    document.getElementById('cs-password')?.value.trim() || 'kidlearn123',
    department:  document.getElementById('cs-dept')?.value.trim(),
    title:       document.getElementById('cs-title')?.value.trim(),
    permissions: document.getElementById('cs-permissions')?.value.trim(),
  };
  if (!payload.full_name || !payload.username || !payload.email) {
    msg.innerHTML = '<span style="color:#EF4444">⚠️ ต้องกรอกชื่อ, username, อีเมล</span>'; return;
  }
  msg.innerHTML = '<span style="color:var(--mu)">⏳ กำลังสร้าง...</span>';
  const res = await _api('admin_create_staff', { body: payload }).catch(() => ({ ok: false, error: 'เชื่อมต่อไม่ได้' }));
  if (res.ok) {
    document.getElementById('adm-create-staff-modal')?.remove();
    alert(`✅ สร้างบัญชี ${payload.role} "${payload.full_name}" สำเร็จ\nรหัสผ่าน: ${payload.password}`);
    _loadAdminUsers();
  } else {
    msg.innerHTML = `<span style="color:#EF4444">❌ ${res.error || 'สร้างไม่สำเร็จ'}</span>`;
  }
}
