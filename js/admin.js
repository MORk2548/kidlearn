// ══════════════════════════════════════════════════════
// ADMIN — จัดการผู้ใช้ (2.0) + ออกรายงาน (8.0)
// ══════════════════════════════════════════════════════
if(typeof A.adminTab==='undefined') A.adminTab='users';
if(typeof A.adminRole==='undefined') A.adminRole='';
if(typeof A.adminSearch==='undefined') A.adminSearch='';
if(typeof A.reportTab==='undefined') A.reportTab='summary';

async function loadAdmin() {
  if(A.role!=='admin') return;
  _renderAdminTabs();
  if(A.adminTab==='users') await _loadAdminUsers();
  else await _loadReports();
}

function _renderAdminTabs(){
  const wrap=document.getElementById('adm-tabs');
  if(!wrap)return;
  wrap.innerHTML=`
    <button class="rec-tab${A.adminTab==='users'?' active':''}"   onclick="switchAdminTab('users')">👥 จัดการผู้ใช้</button>
    <button class="rec-tab${A.adminTab==='reports'?' active':''}" onclick="switchAdminTab('reports')">📊 รายงาน</button>`;
  document.getElementById('adm-users-panel').style.display  =A.adminTab==='users'  ?'block':'none';
  document.getElementById('adm-report-panel').style.display =A.adminTab==='reports'?'block':'none';
}
function switchAdminTab(t){A.adminTab=t;_renderAdminTabs();loadAdmin();}

// ════════ 2.0 จัดการผู้ใช้ ════════
async function _loadAdminUsers(){
  const el=document.getElementById('adm-user-list');
  if(!el)return;
  el.innerHTML='<div style="color:var(--mu);padding:1rem">⏳ กำลังโหลด...</div>';
  const res=await apiAdminUsers({role:A.adminRole,search:A.adminSearch}).catch(()=>({ok:false,users:[]}));
  const users=res.ok?(res.users||[]):[];
  const total=res.total||0;

  const roleOpts=['','student','parent','teacher','admin'].map(r=>
    `<option value="${r}"${A.adminRole===r?' selected':''}>${r||'ทุก role'}</option>`).join('');

  el.innerHTML=`
    <div style="display:flex;gap:.65rem;flex-wrap:wrap;margin-bottom:1rem;align-items:center">
      <select class="fc" style="width:140px;padding:.5rem .75rem;font-size:.85rem" onchange="A.adminRole=this.value;_loadAdminUsers()">${roleOpts}</select>
      <input class="fc" type="text" placeholder="ค้นหาชื่อ/username..." value="${A.adminSearch}"
        style="flex:1;min-width:160px;padding:.5rem .75rem;font-size:.85rem"
        oninput="A.adminSearch=this.value" onkeydown="if(event.key==='Enter')_loadAdminUsers()">
      <button class="btn btn-s btn-sm" onclick="_loadAdminUsers()">🔍 ค้นหา</button>
      <span style="font-size:.82rem;color:var(--mu)">ทั้งหมด ${total} คน</span>
    </div>
    <div style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:.82rem;min-width:560px">
      <thead><tr style="background:var(--s);color:#fff">
        <th style="padding:.55rem .75rem;text-align:left">ชื่อ</th>
        <th style="padding:.55rem .75rem;text-align:left">Username</th>
        <th style="padding:.55rem .75rem;text-align:center">Role</th>
        <th style="padding:.55rem .75rem;text-align:center">สถานะ</th>
        <th style="padding:.55rem .75rem;text-align:left">ข้อมูลเพิ่มเติม</th>
        <th style="padding:.55rem .75rem;text-align:center">จัดการ</th>
      </tr></thead>
      <tbody>${users.map(u=>_renderUserRow(u)).join('')}</tbody>
    </table></div>`;
}

function _renderUserRow(u){
  const roleColor={student:'#10B981',parent:'#3B82F6',teacher:'#F59E0B',admin:'#EF4444'};
  const extra=u.role==='student'?`ชั้น ${u.grade}`:u.role==='parent'?`โทร ${u.phone}`:u.role==='teacher'?u.department:'—';
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
async function _loadReports(){
  const el=document.getElementById('adm-report-panel');
  if(!el)return;

  const tabsHtml=`<div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:1rem">
    ${[['summary','📋 ภาพรวม'],['by_subject','📚 รายวิชา'],['by_student','👦 รายนักเรียน'],['by_game','🎮 รายเกม'],['daily','📈 รายวัน']]
      .map(([t,l])=>`<button class="child-btn${A.reportTab===t?' active':''}" onclick="switchReportTab('${t}')">${l}</button>`).join('')}
  </div>
  <div id="report-content"><div style="color:var(--mu);padding:1rem">⏳ กำลังโหลด...</div></div>`;

  el.innerHTML=tabsHtml;
  await _renderReport(A.reportTab);
}
function switchReportTab(t){A.reportTab=t;
  document.querySelectorAll('#adm-report-panel .child-btn').forEach(b=>b.classList.toggle('active',(b.onclick+'').includes(`'${t}'`)));
  _renderReport(t);}

async function _renderReport(type){
  const el=document.getElementById('report-content');
  if(!el)return;
  el.innerHTML='<div style="color:var(--mu);padding:1rem">⏳ กำลังโหลด...</div>';
  const res=await apiReport(type).catch(()=>({ok:false}));
  if(!res.ok){el.innerHTML='<div style="color:#EF4444;padding:1rem">⚠️ โหลดข้อมูลไม่สำเร็จ</div>';return;}

  if(type==='summary'){
    el.innerHTML=`<div class="stats" style="margin:0">
      <div class="stat"><div class="si">👦</div><div><div class="sv">${res.total_students}</div><div class="sl2">นักเรียน</div></div></div>
      <div class="stat"><div class="si">👨‍👩‍👧</div><div><div class="sv">${res.total_parents}</div><div class="sl2">ผู้ปกครอง</div></div></div>
      <div class="stat"><div class="si">👩‍🏫</div><div><div class="sv">${res.total_teachers}</div><div class="sl2">ครู</div></div></div>
      <div class="stat"><div class="si">🎮</div><div><div class="sv">${res.total_plays}</div><div class="sl2">ครั้งที่เล่น</div></div></div>
      <div class="stat"><div class="si">⭐</div><div><div class="sv">${res.avg_score}%</div><div class="sl2">คะแนนเฉลี่ย</div></div></div>
    </div>`; return;}

  if(type==='by_subject'){
    const rows=(res.subjects||[]).map(s=>{const avg=Math.round(+s.avg_score||0);const c=avg>=80?'#10B981':avg>=50?'#F59E0B':'#EF4444';
      return `<tr style="border-bottom:1px solid #F1F5F9">
        <td style="padding:.6rem .75rem;font-weight:700">${s.icon||'📚'} ${s.subject_name}</td>
        <td style="padding:.6rem .75rem;text-align:center">${s.student_count||0}</td>
        <td style="padding:.6rem .75rem;text-align:center">${s.total_plays||0}</td>
        <td style="padding:.6rem .75rem"><div style="display:flex;align-items:center;gap:.5rem">
          <div style="flex:1;height:7px;background:#E2E8F0;border-radius:4px"><div style="width:${avg}%;height:100%;background:${c};border-radius:4px"></div></div>
          <span style="font-weight:700;color:${c};font-size:.82rem;min-width:36px">${avg}%</span></div></td>
        <td style="padding:.6rem .75rem;text-align:center;font-weight:700;color:${c}">${s.best_score||0}</td>
      </tr>`;}).join('');
    el.innerHTML=`<div class="tw"><table><thead><tr>
      <th>วิชา</th><th style="text-align:center">นักเรียน</th><th style="text-align:center">เล่นแล้ว</th>
      <th style="min-width:140px">คะแนนเฉลี่ย</th><th style="text-align:center">สูงสุด</th>
    </tr></thead><tbody>${rows}</tbody></table></div>`; return;}

  if(type==='by_student'){
    const rows=(res.students||[]).map((s,i)=>{const avg=Math.round(+s.avg_score||0);const c=avg>=80?'#10B981':avg>=50?'#F59E0B':'#EF4444';
      return `<tr style="border-bottom:1px solid #F1F5F9">
        <td style="padding:.6rem .75rem;text-align:center;color:var(--mu)">${i+1}</td>
        <td style="padding:.6rem .75rem;font-weight:600">${s.full_name}</td>
        <td style="padding:.6rem .75rem;text-align:center">${s.grade||'—'}</td>
        <td style="padding:.6rem .75rem;text-align:center">${s.total_plays||0}</td>
        <td style="padding:.6rem .75rem"><div style="display:flex;align-items:center;gap:.5rem">
          <div style="flex:1;height:7px;background:#E2E8F0;border-radius:4px"><div style="width:${avg}%;height:100%;background:${c};border-radius:4px"></div></div>
          <span style="font-weight:700;color:${c};font-size:.82rem;min-width:36px">${avg}%</span></div></td>
        <td style="padding:.6rem .75rem;font-size:.78rem;color:var(--mu)">${s.last_active?new Date(s.last_active).toLocaleDateString('th-TH'):'—'}</td>
      </tr>`;}).join('');
    el.innerHTML=`<div class="tw"><table><thead><tr>
      <th style="text-align:center">#</th><th>ชื่อ</th><th style="text-align:center">ชั้น</th>
      <th style="text-align:center">เล่นแล้ว</th><th style="min-width:140px">คะแนนเฉลี่ย</th><th>เล่นล่าสุด</th>
    </tr></thead><tbody>${rows}</tbody></table></div>`; return;}

  if(type==='by_game'){
    const TYPE_LBL={mcq:'MCQ',truefalse:'จริง/เท็จ',fill:'เติมคำ',matching:'จับคู่',sequence:'เรียงลำดับ',wordsearch:'ค้นหาคำ'};
    const rows=(res.games||[]).map(g=>{const avg=Math.round(+g.avg_score||0);const c=avg>=80?'#10B981':avg>=50?'#F59E0B':'#EF4444';
      return `<tr style="border-bottom:1px solid #F1F5F9">
        <td style="padding:.6rem .75rem;font-weight:600">${g.game_name}</td>
        <td style="padding:.6rem .75rem">${g.subject_name}</td>
        <td style="padding:.6rem .75rem;text-align:center"><span style="font-size:.75rem;background:#EEF2FF;color:var(--s);padding:.1rem .4rem;border-radius:6px">${TYPE_LBL[g.game_type]||g.game_type}</span></td>
        <td style="padding:.6rem .75rem;text-align:center">${g.total_plays||0}</td>
        <td style="padding:.6rem .75rem"><div style="display:flex;align-items:center;gap:.5rem">
          <div style="flex:1;height:7px;background:#E2E8F0;border-radius:4px"><div style="width:${avg}%;height:100%;background:${c};border-radius:4px"></div></div>
          <span style="font-weight:700;color:${c};font-size:.82rem;min-width:36px">${avg}%</span></div></td>
      </tr>`;}).join('');
    el.innerHTML=`<div class="tw"><table><thead><tr>
      <th>ชื่อเกม</th><th>วิชา</th><th style="text-align:center">ประเภท</th>
      <th style="text-align:center">เล่นแล้ว</th><th style="min-width:140px">คะแนนเฉลี่ย</th>
    </tr></thead><tbody>${rows}</tbody></table></div>`; return;}

  if(type==='daily'){
    const rows=(res.daily||[]).map(d=>{const avg=Math.round(+d.avg_score||0);
      return `<tr style="border-bottom:1px solid #F1F5F9">
        <td style="padding:.6rem .75rem">${d.day}</td>
        <td style="padding:.6rem .75rem;text-align:center">${d.active_students}</td>
        <td style="padding:.6rem .75rem;text-align:center">${d.plays}</td>
        <td style="padding:.6rem .75rem;text-align:center;font-weight:700;color:${avg>=80?'#10B981':avg>=50?'#F59E0B':'#EF4444'}">${avg}%</td>
      </tr>`;}).join('');
    el.innerHTML=`<div class="tw"><table><thead><tr>
      <th>วันที่</th><th style="text-align:center">นักเรียนที่เล่น</th>
      <th style="text-align:center">ครั้งที่เล่น</th><th style="text-align:center">คะแนนเฉลี่ย</th>
    </tr></thead><tbody>${rows||'<tr><td colspan="4" style="text-align:center;color:var(--mu);padding:1rem">ยังไม่มีข้อมูล</td></tr>'}</tbody></table></div>`; return;}
}
