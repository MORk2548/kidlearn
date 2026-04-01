// ══════════════════════════════════════════════════════
// RECOMMENDATIONS — คำแนะนำสำหรับผู้ปกครอง
// ══════════════════════════════════════════════════════
async function loadRec() {
  if (A.role !== 'parent') return;
  const cont = document.getElementById('rec-cont');
  if (!cont) return;
  cont.innerHTML = '<div style="color:var(--mu);padding:1rem">⏳ กำลังโหลด...</div>';

  // ดึงบุตรหลาน
  const cres = await apiMyChildren().catch(()=>({ok:false,children:[]}));
  const kids  = cres.ok ? (cres.children||[]) : [];

  if (!kids.length) {
    // ลอง auto-link ก่อน
    try {
      const linkRes = await apiAutoLink();
      if (linkRes.ok && linkRes.linked > 0) {
        loadRec(); return; // โหลดใหม่หลัง link สำเร็จ
      }
    } catch(e) {}

    const myPhone = A.user?.phone || A.user?.parentPhone || '';
    const displayPhone = myPhone ? formatPhone(myPhone) : '(ยังไม่ได้ลงทะเบียนเบอร์)';
    cont.innerHTML = `<div style="text-align:center;padding:2.5rem 1rem;color:var(--mu)">
      <div style="font-size:3rem;margin-bottom:.75rem">👨‍👩‍👧</div>
      <div style="font-weight:700;font-size:1rem;color:var(--tx);margin-bottom:.5rem">ยังไม่มีบุตรหลานที่เชื่อมบัญชี</div>
      <div style="font-size:.88rem;line-height:1.8;margin-bottom:1.25rem">
        ให้บุตรหลานกรอกเบอร์โทรของคุณ<br>
        <strong style="font-size:1rem;color:var(--s)">${displayPhone}</strong><br>
        ตอนสมัครสมาชิก หรือกรอกในหน้าแก้ไขโปรไฟล์
      </div>
      <div style="display:flex;flex-direction:column;gap:.5rem;align-items:center">
        <button class="btn btn-s btn-sm" onclick="syncChildrenRec()">🔄 ค้นหาบุตรหลานอัตโนมัติ</button>
        <button class="btn btn-sm" style="background:#EEF2FF;color:var(--s)" onclick="sec('children')">
          ➕ จัดการบุตรหลาน
        </button>
      </div>
    </div>`;
    return;
  }

  // เลือกคนแรกถ้ายังไม่ได้เลือก
  if (!A.selChild || !kids.find(k=>k.student_id==A.selChild))
    A.selChild = kids[0].student_id;

  // ── selector ──
  let html = `<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1.25rem">`;
  kids.forEach(k => {
    html += `<button class="child-btn${A.selChild==k.student_id?' active':''}"
      onclick="A.selChild=${k.student_id};loadRec()">
      👦 ${k.full_name||k.full_name}
    </button>`;
  });
  html += '</div>';

  // ดึงคะแนนเพื่อสร้าง rec เอง (ถ้า API recommendations ว่าง)
  const [recRes, scoreRes] = await Promise.all([
    apiRecommendations(A.selChild).catch(()=>({ok:false,recs:[]})),
    apiScores(A.selChild).catch(()=>({ok:false,scores:[]}))
  ]);

  const recs   = recRes.ok   ? (recRes.recs   || []) : [];
  const scores = scoreRes.ok ? (scoreRes.scores|| []) : [];

  // ── วิเคราะห์จากคะแนนถ้าไม่มี rec ใน DB ──
  let recCards = '';
  if (recs.length) {
    const TYPE_STYLE = {
      praise    : { bg:'#ECFDF5', border:'#10B981', icon:'⭐', label:'ยอดเยี่ยม!' },
      improve   : { bg:'#FFF7ED', border:'#F59E0B', icon:'📈', label:'กำลังพัฒนา' },
      low_score : { bg:'#FFF1F2', border:'#EF4444', icon:'⚠️', label:'ต้องพัฒนา' },
    };
    recCards = recs.map(r => {
      const st = TYPE_STYLE[r.rec_type] || TYPE_STYLE.improve;
      return `<div style="background:${st.bg};border:1.5px solid ${st.border};
        border-radius:14px;padding:1rem 1.2rem;margin-bottom:.75rem">
        <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.3rem">
          <span style="font-size:1.2rem">${r.icon||st.icon}</span>
          <strong style="font-size:.9rem">${r.subject_name||''}</strong>
          <span style="margin-left:auto;font-size:.72rem;background:${st.border};
            color:#fff;padding:.1rem .5rem;border-radius:99px">${st.label}</span>
        </div>
        <div style="font-size:.85rem;color:#374151">${r.message}</div>
      </div>`;
    }).join('');
  } else if (scores.length) {
    // สร้าง rec จากคะแนนที่มี
    const bySubject = {};
    scores.forEach(s => {
      const sub = s.subject_name||'อื่นๆ';
      if(!bySubject[sub]) bySubject[sub]={name:sub,scores:[],color:s.subject_color||'#4F46E5'};
      bySubject[sub].scores.push(+s.score||0);
    });

    recCards = Object.values(bySubject).map(sub => {
      const avg = Math.round(sub.scores.reduce((a,b)=>a+b,0)/sub.scores.length);
      const good = avg >= 80, ok = avg >= 50;
      const bg     = good ? '#ECFDF5' : ok ? '#FFF7ED' : '#FFF1F2';
      const border = good ? '#10B981' : ok ? '#F59E0B' : '#EF4444';
      const icon   = good ? '⭐' : ok ? '📈' : '⚠️';
      const label  = good ? 'ยอดเยี่ยม!' : ok ? 'กำลังพัฒนา' : 'ต้องพัฒนา';
      const msg    = good ? `บุตรหลานทำได้ดีมากในวิชา${sub.name} คะแนนเฉลี่ย ${avg}% 🎉`
                   : ok   ? `บุตรหลานมีความก้าวหน้าในวิชา${sub.name} คะแนนเฉลี่ย ${avg}% ควรฝึกเพิ่มเติม`
                           : `บุตรหลานต้องการความช่วยเหลือในวิชา${sub.name} คะแนนเฉลี่ย ${avg}% ควรทบทวน`;
      return `<div style="background:${bg};border:1.5px solid ${border};
        border-radius:14px;padding:1rem 1.2rem;margin-bottom:.75rem">
        <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.3rem">
          <span style="font-size:1.2rem">${icon}</span>
          <strong style="font-size:.9rem">${sub.name}</strong>
          <span style="font-size:.82rem;color:#6B7280;margin-left:.25rem">เล่น ${sub.scores.length} ครั้ง</span>
          <span style="margin-left:auto;font-size:.72rem;background:${border};
            color:#fff;padding:.1rem .5rem;border-radius:99px">${label}</span>
        </div>
        <div style="font-size:.85rem;color:#374151">${msg}</div>
        <div style="margin-top:.5rem">
          <div style="height:6px;background:#E2E8F0;border-radius:3px">
            <div style="width:${avg}%;height:100%;background:${border};border-radius:3px"></div>
          </div>
        </div>
      </div>`;
    }).join('');
  } else {
    recCards = `<div style="color:var(--mu);font-size:.88rem;padding:1rem 0;text-align:center">
      <div style="font-size:2rem;margin-bottom:.5rem">🎮</div>
      ยังไม่มีคำแนะนำ — ให้บุตรหลานเล่นเกมก่อนนะครับ
    </div>`;
  }

  // ── สรุปคะแนนรายวิชา ──
  const bySubScore = {};
  scores.forEach(s => {
    const sub = s.subject_name||'อื่นๆ';
    if(!bySubScore[sub]) bySubScore[sub]={plays:0,total:0,color:s.subject_color};
    bySubScore[sub].plays++;
    bySubScore[sub].total += +s.score||0;
  });
  const summaryHtml = Object.entries(bySubScore).length ? `
    <div style="margin-top:1.5rem">
      <div style="font-weight:700;margin-bottom:.75rem;font-size:.9rem">📊 สรุปผลการเรียนรายวิชา</div>
      ${Object.entries(bySubScore).map(([name,d])=>{
        const avg = Math.round(d.total/d.plays);
        const c = avg>=80?'#10B981':avg>=50?'#F59E0B':'#EF4444';
        return `<div style="display:flex;align-items:center;gap:.75rem;
          padding:.6rem 0;border-bottom:1px solid #F1F5F9">
          <div style="width:90px;font-size:.82rem;color:#374151;font-weight:600">${name}</div>
          <div style="flex:1;height:8px;background:#E2E8F0;border-radius:4px">
            <div style="width:${avg}%;height:100%;background:${c};border-radius:4px"></div>
          </div>
          <div style="font-weight:700;color:${c};font-size:.85rem;width:48px;text-align:right">${avg}%</div>
          <div style="font-size:.75rem;color:var(--mu);width:48px">${d.plays} ครั้ง</div>
        </div>`;
      }).join('')}
    </div>` : '';

  cont.innerHTML = html + recCards + summaryHtml;
}

async function syncChildrenRec() {
  try {
    const res = await apiAutoLink();
    if (res.ok && res.linked > 0) {
      loadRec();
    } else {
      alert('ยังไม่พบบุตรหลานที่กรอกเบอร์ของคุณ\nโปรดตรวจสอบว่านักเรียนกรอกเบอร์ถูกต้องตอนสมัคร');
    }
  } catch(e) {
    alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
  }
}
