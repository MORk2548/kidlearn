// ══════════════════════════════════════════════════════
// MANAGE CHILDREN — PHP API
// ══════════════════════════════════════════════════════
async function loadChildren() {
  if (A.role !== 'parent') return;

  // normalize phone จาก user object
  const myPhone = A.user?.phone || A.user?.parentPhone || '';
  const phoneEl = document.getElementById('my-phone-display');
  if (phoneEl) phoneEl.textContent = myPhone ? formatPhone(myPhone) : '(ยังไม่ได้ลงทะเบียนเบอร์)';

  const list = document.getElementById('ch-list');
  if (list) list.innerHTML = '<div style="color:var(--mu)">⏳ กำลังโหลด...</div>';

  // ลอง auto-link ก่อนเสมอ (silent)
  apiAutoLink().catch(()=>{});

  const res = await apiMyChildren().catch(()=>({ok:false,children:[]}));
  const kids = res.ok ? res.children : [];

  if (!kids.length) {
    const displayPhone = myPhone ? formatPhone(myPhone) : 'ของคุณ';
    if (list) list.innerHTML = `
      <div style="background:#FFF7ED;border:1.5px solid #FED7AA;border-radius:12px;padding:1.1rem 1.25rem">
        <div style="font-weight:700;color:#92400E;margin-bottom:.4rem">⚠️ ยังไม่มีบุตรหลานที่เชื่อมบัญชี</div>
        <div style="font-size:.85rem;color:#78350F;line-height:1.8">
          นักเรียนต้องกรอกเบอร์โทร <strong>${displayPhone}</strong> ตอนสมัครสมาชิก<br>
          หรือแก้ไขโปรไฟล์ของนักเรียนให้ใส่เบอร์นี้
        </div>
        <button class="btn btn-sm" style="margin-top:.65rem;background:#FEF3C7;color:#92400E;border:1px solid #FCD34D"
          onclick="syncChildren()">🔄 ค้นหาบุตรหลานอัตโนมัติ</button>
      </div>`;
    return;
  }

  if(list) list.innerHTML = kids.map(k => {
    const avg = Math.round(+k.avg_score||0);
    return `<div class="sr">
      <div class="sa">${(k.full_name||'?').charAt(0)}</div>
      <div style="flex:1">
        <div class="sn2">${k.full_name}</div>
        <div class="si3">ชั้น ${classLabel(k)} · เล่นแล้ว ${k.total_games||0} ครั้ง</div>
        <div class="mp" style="width:120px"><div class="mf" style="width:${avg}%"></div></div>
      </div>
      <div style="text-align:right">
        <div style="font-size:.82rem;font-weight:700;color:var(--p);margin-bottom:.4rem">${avg}%</div>
        <button class="btn btn-sm" style="background:#FEE2E2;color:#991B1B;border:1px solid #FCA5A5"
          onclick="removeChild(${k.student_id})">🗑 ลบออก</button>
      </div>
    </div>`;
  }).join('');
}

async function syncChildren() {
  try {
    const res = await apiAutoLink();
    if (res.ok && res.linked > 0) {
      showAl('ch-ok', `✅ พบและเชื่อมบุตรหลาน ${res.linked} คนอัตโนมัติ`);
      setTimeout(loadChildren, 600);
    } else {
      showAl('ch-err', 'ไม่พบบุตรหลานที่กรอกเบอร์ของคุณ — ลองใส่เบอร์ด้านล่างแทน');
    }
  } catch(e) {
    showAl('ch-err', 'เกิดข้อผิดพลาด กรุณาลองใหม่');
  }
}

async function removeChild(sid) {
  if (!confirm('ยืนยันลบบุตรหลานนี้ออก?')) return;
  const res = await apiUnlinkChild({ student_id: sid }).catch(()=>({ok:false}));
  if (res.ok) loadChildren();
  else showAl('ch-err','ลบไม่สำเร็จ');
}
