// ══════════════════════════════════════════════════════
// ROUTER
// ══════════════════════════════════════════════════════
function sec(name) {
  // ซ่อนทุก section รวมถึง s-lessons และ s-content
  ['home','subs','games','game','scores','rec','children','teach','officer','executive','admin','profile'].forEach(s => {
    const e = document.getElementById('s-' + s);
    if (e) e.style.display = 'none';
  });
  // ซ่อน lesson page เมื่อสลับแท็บ
  ['s-lessons','s-content'].forEach(id => {
    const e = document.getElementById(id);
    if (e) e.style.display = 'none';
  });
  // ปิด modal ด้วย
  const gm = document.getElementById('gmodal');
  if (gm) gm.classList.remove('show');

  const el = document.getElementById('s-' + name);
  if (el) el.style.display = 'block';

  // active: navbar + sidebar + bottom nav
  document.querySelectorAll('.nav-links a, .sl, .bn-item').forEach(a => a.classList.remove('active'));
  ['nl-' + name, 'sl-' + name, 'bn-' + name].forEach(id => {
    const e = document.getElementById(id);
    if (e) e.classList.add('active');
  });

  if (name === 'home')     loadHome();
  if (name === 'subs')     loadSubs();
  if (name === 'scores')   loadScores();
  if (name === 'rec')      loadRec();
  if (name === 'children') loadChildren();
  if (name === 'teach')    loadTeach();
  if (name === 'officer')  _renderOfficerPanel();
  if (name === 'executive') _renderExecutivePanel();
  if (name === 'profile')  loadProfile();
  if (name === 'admin')    loadAdmin();
}

function applyRoleUI() {
  const u = A.user;
  document.getElementById('sb-av').className    = 'avatar ' + u.role;
  applyAvatar(document.getElementById('sb-av'), u.name.charAt(0));
  document.getElementById('sb-nm').textContent  = u.name;
  document.getElementById('wn').textContent     = u.name.split(' ')[0];

  const rb = document.getElementById('sb-rb');
  rb.className   = 'rb ' + u.role;
  rb.textContent = { student:'👦 นักเรียน', parent:'👨‍👩‍👧 ผู้ปกครอง', teacher:'👩‍🏫 ครู', officer:'👔 เจ้าหน้าที่', executive:'💼 ผู้บริหาร', admin:'🛡️ ผู้ดูแล' }[u.role];

  const isTc = u.role === 'teacher';
  const isPa = u.role === 'parent';
  const isOf = u.role === 'officer';
  const isEx = u.role === 'executive';
  const isAd = u.role === 'admin';

  // Navbar
  document.getElementById('nli-rec').style.display      = isPa ? 'block' : 'none';
  document.getElementById('nli-children').style.display = isPa ? 'block' : 'none';
  document.getElementById('nli-teach').style.display    = isTc ? 'block' : 'none';
  document.getElementById('nli-officer').style.display  = isOf || isAd ? 'block' : 'none';
  document.getElementById('nli-executive').style.display = isEx || isAd ? 'block' : 'none';
  document.getElementById('nli-scores').style.display   = (isTc || isOf) ? 'none'  : 'block';
  // Sidebar
  document.getElementById('sl-rec').style.display       = isPa ? 'flex'  : 'none';
  document.getElementById('sl-children').style.display  = isPa ? 'flex'  : 'none';
  document.getElementById('sl-teach').style.display     = isTc ? 'flex'  : 'none';
  document.getElementById('sl-officer').style.display   = isOf || isAd ? 'flex' : 'none';
  document.getElementById('sl-executive').style.display = isEx || isAd ? 'flex' : 'none';
  document.getElementById('sl-scores').style.display    = (isTc || isOf) ? 'none'  : 'flex';
  // Admin nav
  ['nli-admin','sl-admin'].forEach(id=>{const e=document.getElementById(id);if(e)e.style.display=isAd?'block':'none';});
  ['sl-admin'].forEach(id=>{const e=document.getElementById(id);if(e)e.style.display=isAd?'flex':'none';});
  const bnAdmin=document.getElementById('bn-admin');
  if(bnAdmin) bnAdmin.style.display=isAd?'flex':'none';
  // Bottom nav
  const bnRec      = document.getElementById('bn-rec');
  const bnChildren = document.getElementById('bn-children');
  const bnTeach    = document.getElementById('bn-teach');
  const bnScores   = document.getElementById('bn-scores');
  if (bnRec)      bnRec.style.display      = isPa ? 'flex' : 'none';
  if (bnChildren) bnChildren.style.display = isPa ? 'flex' : 'none';
  if (bnTeach)    bnTeach.style.display    = isTc ? 'flex' : 'none';
  if (bnScores)   bnScores.style.display   = isTc ? 'none' : 'flex';
}
