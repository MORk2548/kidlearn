// ══════════════════════════════════════════════════════
// auth.js — Login / Logout / Register  (PHP API)
// ══════════════════════════════════════════════════════

async function doLogin() {
  const u = document.getElementById('lu').value.trim();
  const p = document.getElementById('lp').value;
  if (!u||!p){ showAl('login-err','กรุณากรอกข้อมูลให้ครบ'); return; }
  const btn = document.querySelector('button[onclick="doLogin()"]');
  if(btn){ btn.disabled=true; btn.textContent='⏳ กำลังเข้าสู่ระบบ...'; }
  const res = await apiLogin(u,p);
  if(btn){ btn.disabled=false; btn.textContent='เข้าสู่ระบบ 🚀'; }
  if(!res.ok){ showAl('login-err', res.error||'เข้าสู่ระบบไม่สำเร็จ'); return; }
  A.user = normalizeUser(res.user);
  A.role = A.user.role;
  A.selChild = null;
  sessionSave();
  window.location.href = 'app.html';
}

async function doLogout() {
  await apiLogout();
  sessionClear();
  A.user=null; A.role='';
  window.location.href='index.html';
}

function selRole(r) {
  A.selRole=r;
  ['student','parent','teacher'].forEach(ro=>{
    document.getElementById('ro-'+ro).classList.toggle('sel',ro===r);
    document.getElementById('ri-'+ro).style.display=ro===r?'block':'none';
  });
}
function nextStep() {
  document.getElementById('rs1').style.display='none';
  document.getElementById('rs2').style.display='block';
  const chip={student:'👦 นักเรียน',parent:'👨‍👩‍👧 ผู้ปกครอง',teacher:'👩‍🏫 ครู'}[A.selRole];
  document.getElementById('reg-chip').textContent=chip;
  document.getElementById('st-extra').style.display =A.selRole==='student'?'block':'none';
  document.getElementById('tc-extra').style.display =A.selRole==='teacher'?'block':'none';
  document.getElementById('par-extra').style.display=A.selRole==='parent'?'block':'none';
}
function backStep() {
  document.getElementById('rs2').style.display='none';
  document.getElementById('rs1').style.display='block';
}

async function doRegister() {
  const name =document.getElementById('rn').value.trim();
  const uname=document.getElementById('ru').value.trim();
  const email=document.getElementById('re').value.trim();
  const pass =document.getElementById('rp').value;
  if(!name||!uname||!email||!pass){ showAl('reg-err','กรุณากรอกข้อมูลให้ครบ'); return; }
  if(pass.length<6){ showAl('reg-err','รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'); return; }
  const d={full_name:name,username:uname,email,password:pass,role:A.selRole};
  if(A.selRole==='student'){
    d.grade=document.getElementById('rg').value||'ป.1';
    const pp=document.getElementById('r-pphone').value.trim().replace(/\D/g,'');
    if(!pp||pp.length<9){ showAl('reg-err','กรุณากรอกเบอร์โทรผู้ปกครองให้ถูกต้อง'); return; }
    d.parent_phone=pp;
  }
  if(A.selRole==='parent'){
    const ph=document.getElementById('r-phone').value.trim().replace(/\D/g,'');
    if(!ph||ph.length<9){ showAl('reg-err','กรุณากรอกเบอร์โทรของคุณให้ถูกต้อง'); return; }
    d.phone=ph;
  }
  if(A.selRole==='teacher') d.department=document.getElementById('rd').value||'';
  const btn=document.querySelector('#rs2 .btn-p');
  if(btn){ btn.disabled=true; btn.textContent='⏳ กำลังสมัคร...'; }
  const res=await apiRegister(d);
  if(btn){ btn.disabled=false; btn.textContent='สมัครสมาชิก ✅'; }
  if(!res.ok){ showAl('reg-err',res.error||'สมัครสมาชิกไม่สำเร็จ'); return; }
  const ok=document.getElementById('reg-ok');
  ok.textContent='✅ สมัครสมาชิกสำเร็จ! กำลังไปหน้าเข้าสู่ระบบ...';
  ok.style.display='block';
  setTimeout(()=>window.location.href='index.html',1800);
}

// ── SESSION ────────────────────────────────────────────
function sessionSave(){ if(A.user) sessionStorage.setItem('kl_uid',String(A.user.id)); }
function sessionClear(){ sessionStorage.removeItem('kl_uid'); }
async function sessionLoad(){
  const uid=sessionStorage.getItem('kl_uid');
  if(!uid) return false;
  const res=await apiMe();
  if(!res.ok){ sessionClear(); return false; }
  A.user=normalizeUser(res);
  A.role=A.user.role;
  return true;
}

// แปลง field PHP → JS
function normalizeUser(u){
  if(!u) return u;
  return {
    id:u.user_id??u.id, user_id:u.user_id??u.id,
    username:u.username, name:u.full_name??u.name,
    full_name:u.full_name??u.name, email:u.email, role:u.role,
    grade:u.grade, parentPhone:u.parent_phone, phone:u.phone,
    department:u.department, student_id:u.student_id,
    parent_id:u.parent_id, children:u.children??[],
  };
}
