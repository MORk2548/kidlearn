// ══════════════════════════════════════════════════════
// PROFILE — PHP API
// ══════════════════════════════════════════════════════
function loadProfile() {
  const u = A.user;
  document.getElementById('pf-name').value  = u.name   || '';
  document.getElementById('pf-email').value = u.email  || '';
  document.getElementById('pf-uname').value = u.username || '';
  const grp = document.getElementById('pf-grade-grp');
  const php = document.getElementById('pf-pphone-grp');
  const dep = document.getElementById('pf-dept-grp');
  const phg = document.getElementById('pf-phone-grp');
  if(grp) grp.style.display  = u.role==='student' ? 'block' : 'none';
  if(php) php.style.display  = u.role==='student' ? 'block' : 'none';
  if(dep) dep.style.display  = u.role==='teacher' ? 'block' : 'none';
  if(phg) phg.style.display  = u.role==='parent'  ? 'block' : 'none';
  if(u.role==='student'){
    const ge = document.getElementById('pf-grade');  if(ge) ge.value = u.grade||'ป.1';
    const pe = document.getElementById('pf-pphone'); if(pe) pe.value = u.parentPhone||'';
  }
  if(u.role==='teacher'){
    const de = document.getElementById('pf-dept'); if(de) de.value = u.department||'';
  }
  if(u.role==='parent'){
    const ph = document.getElementById('pf-phone'); if(ph) ph.value = u.phone||'';
  }
}

async function saveProfile() {
  const u    = A.user;
  const name  = document.getElementById('pf-name').value.trim();
  const email = document.getElementById('pf-email').value.trim();
  if (!name||!email) { showAl('pf-err','กรุณากรอกชื่อและอีเมล'); return; }

  const body = { full_name:name, email, old_phone:u.parentPhone||u.phone||'' };
  if(u.role==='student'){
    body.grade        = document.getElementById('pf-grade')?.value  || u.grade;
    body.parent_phone = document.getElementById('pf-pphone')?.value || u.parentPhone;
  }
  if(u.role==='teacher'){
    body.department = document.getElementById('pf-dept')?.value || u.department;
  }
  if(u.role==='parent'){
    body.phone = document.getElementById('pf-phone')?.value || u.phone;
  }

  const res = await apiUpdateProfile(body).catch(()=>({ok:false,error:'เกิดข้อผิดพลาด'}));
  if (!res.ok) { showAl('pf-err', res.error||'บันทึกไม่สำเร็จ'); return; }

  A.user.name       = name;
  A.user.full_name  = name;
  A.user.email      = email;
  document.getElementById('sb-nm').textContent = name;
  document.getElementById('wn').textContent    = name.split(' ')[0];
  showAl('pf-ok', '✅ บันทึกเรียบร้อย');
}

async function changePassword() {
  const op = document.getElementById('pf-op').value;
  const np = document.getElementById('pf-np').value;
  const cp = document.getElementById('pf-cp').value;
  if(!op||!np||!cp)    { showAl('pw-err','กรุณากรอกรหัสผ่านให้ครบ'); return; }
  if(np.length < 6)    { showAl('pw-err','รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัว'); return; }
  if(np !== cp)        { showAl('pw-err','รหัสผ่านใหม่ไม่ตรงกัน'); return; }
  const res = await apiChangePassword({ old_password:op, new_password:np });
  if(!res.ok){ showAl('pw-err', res.error||'เปลี่ยนรหัสผ่านไม่สำเร็จ'); return; }
  showAl('pw-ok','✅ เปลี่ยนรหัสผ่านสำเร็จ');
  ['pf-op','pf-np','pf-cp'].forEach(id=>{ const e=document.getElementById(id); if(e) e.value=''; });
}
