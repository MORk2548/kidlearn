// Profile page helpers.

function applyAvatar(el, fallbackChar) {
  if (!el) return;
  const saved = A.user?.avatar_url;
  if (saved) {
    el.textContent = '';
    el.style.backgroundImage = `url("${saved}")`;
    el.style.backgroundSize = 'cover';
    el.style.backgroundPosition = 'center';
  } else {
    el.textContent = fallbackChar || '?';
    el.style.backgroundImage = '';
  }
}

async function handleAvatarUpload(event) {
  const input = event.target;
  const file = input.files[0];
  if (!file) return;
  input.disabled = true;
  const res = await apiUploadImage(file, 'avatar').catch(() => ({ ok: false }));
  input.disabled = false;
  input.value = '';
  if (!res.ok) {
    showAl('pf-err', res.error || 'อัปโหลดรูปโปรไฟล์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    return;
  }
  A.user.avatar_url = res.url;
  applyAvatar(document.getElementById('pf-av'), A.user?.name?.charAt(0));
  applyAvatar(document.getElementById('sb-av'), A.user?.name?.charAt(0));
}

function loadProfile() {
  const u = A.user;
  document.getElementById('pf-name').value = u.name || '';
  document.getElementById('pf-email').value = u.email || '';
  const pu = document.getElementById('pf-user');
  if (pu) pu.value = u.username || '';
  const createdAt = document.getElementById('pf-created-at');
  const updatedAt = document.getElementById('pf-updated-at');
  if (createdAt) createdAt.textContent = formatDateTimeTH(u.created_at);
  if (updatedAt) updatedAt.textContent = formatDateTimeTH(u.updated_at);

  const nd = document.getElementById('pf-nm-display');
  const rd = document.getElementById('pf-rb-display');
  if (nd) nd.textContent = u.name || '';
  if (rd) {
    rd.textContent = {
      student: 'นักเรียน',
      parent: 'ผู้ปกครอง',
      teacher: 'ครู',
      officer: 'เจ้าหน้าที่',
      executive: 'ผู้บริหาร',
      admin: 'ผู้ดูแลระบบ',
    }[u.role] || u.role;
    rd.className = 'rb ' + u.role;
  }

  applyAvatar(document.getElementById('pf-av'), u.name?.charAt(0));

  const grp = document.getElementById('pf-grade-grp');
  const php = document.getElementById('pf-pphone-grp');
  const dep = document.getElementById('pf-dept-grp');
  const phg = document.getElementById('pf-phone-grp');
  if (grp) grp.style.display = u.role === 'student' ? 'block' : 'none';
  if (php) php.style.display = u.role === 'student' ? 'block' : 'none';
  if (dep) dep.style.display = u.role === 'teacher' ? 'block' : 'none';
  if (phg) phg.style.display = u.role === 'parent' ? 'block' : 'none';

  const se = document.getElementById('pf-student-extra');
  const pe2 = document.getElementById('pf-parent-extra');
  const te = document.getElementById('pf-teacher-extra');
  if (se) se.style.display = u.role === 'student' ? 'block' : 'none';
  if (pe2) pe2.style.display = u.role === 'parent' ? 'block' : 'none';
  if (te) te.style.display = u.role === 'teacher' ? 'block' : 'none';

  if (u.role === 'student') {
    const ge = document.getElementById('pf-grade');
    if (ge) ge.value = classLabel(u);
    const pe = document.getElementById('pf-pphone');
    if (pe) pe.value = u.parentPhone || '';
  }
  if (u.role === 'teacher') {
    const de = document.getElementById('pf-dept');
    if (de) de.value = u.department || '';
  }
  if (u.role === 'parent') {
    const ph = document.getElementById('pf-phone');
    if (ph) ph.value = u.phone || '';
  }
}

async function saveProfile() {
  const u = A.user;
  const name = document.getElementById('pf-name').value.trim();
  const email = document.getElementById('pf-email').value.trim();
  if (!name || !email) {
    showAl('pf-err', 'กรุณากรอกชื่อและอีเมล');
    return;
  }

  const body = { full_name: name, email };
  if (u.role === 'teacher') {
    body.department = document.getElementById('pf-dept')?.value || u.department;
  }
  if (u.role === 'parent') {
    body.phone = document.getElementById('pf-phone')?.value || u.phone;
  }

  const res = await apiUpdateProfile(body).catch(() => ({ ok: false, error: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' }));
  if (!res.ok) {
    showAl('pf-err', res.error || 'บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    return;
  }

  A.user.name = name;
  A.user.full_name = name;
  A.user.email = email;
  if (body.phone) A.user.phone = body.phone;
  A.user.created_at = res.created_at || A.user.created_at;
  A.user.updated_at = res.updated_at || A.user.updated_at;
  const updatedAt = document.getElementById('pf-updated-at');
  if (updatedAt) updatedAt.textContent = formatDateTimeTH(A.user.updated_at);
  document.getElementById('sb-nm').textContent = name;
  document.getElementById('wn').textContent = name.split(' ')[0];
  const nd = document.getElementById('pf-nm-display');
  if (nd) nd.textContent = name;
  showAl('pf-ok', 'บันทึกข้อมูลโปรไฟล์สำเร็จ');
}

async function changePassword() {
  const op = document.getElementById('pf-old-pw')?.value || document.getElementById('pf-op')?.value;
  const np = document.getElementById('pf-new-pw')?.value || document.getElementById('pf-np')?.value;
  const cp = document.getElementById('pf-cfm-pw')?.value || document.getElementById('pf-cp')?.value;
  if (!op || !np || !cp) {
    showAl('pw-err', 'กรุณากรอกรหัสผ่านให้ครบ');
    return;
  }
  if (np.length < 6) {
    showAl('pw-err', 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
    return;
  }
  if (np !== cp) {
    showAl('pw-err', 'รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
    return;
  }

  const res = await apiChangePassword({ old_password: op, new_password: np });
  if (!res.ok) {
    showAl('pw-err', res.error || 'เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    return;
  }

  A.user.updated_at = res.updated_at || A.user.updated_at;
  const updatedAt = document.getElementById('pf-updated-at');
  if (updatedAt) updatedAt.textContent = formatDateTimeTH(A.user.updated_at);
  showAl('pw-ok', 'เปลี่ยนรหัสผ่านสำเร็จ');
  ['pf-old-pw', 'pf-new-pw', 'pf-cfm-pw', 'pf-op', 'pf-np', 'pf-cp'].forEach((id) => {
    const e = document.getElementById(id);
    if (e) e.value = '';
  });
}
