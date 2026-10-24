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

const _origLoadRec = loadRec;
loadRec = async function(){
  await _origLoadRec();
  await renderRecNotifications();
};

async function renderRecNotifications(){
  if (A.role !== 'parent') return;
  const cont = document.getElementById('rec-cont');
  if (!cont) return;
  const res = await apiNotifications().catch(() => ({ ok:false, notifications:[], summary:{ unread:0 } }));
  if (!res.ok || !(res.notifications||[]).length) return;
  const list = (res.notifications || []).slice(0, 5);
  const block = document.createElement('div');
  block.className = 'ts';
  block.style.marginTop = '1rem';
  block.innerHTML = `
    <h3>การแจ้งเตือนล่าสุด ${res.summary?.unread ? `<span class="badge" style="background:#FEE2E2;color:#B91C1C">${res.summary.unread} ใหม่</span>` : ''}</h3>
    ${list.map(item => `
      <div style="padding:.6rem 0;border-bottom:1px solid #F1F5F9">
        <div style="display:flex;justify-content:space-between;gap:.75rem">
          <strong style="font-size:.82rem">${item.title}</strong>
          <span style="font-size:.72rem;color:var(--mu)">${item.student_name || ''}</span>
        </div>
        <div style="font-size:.78rem;color:#475569">${item.message || ''}</div>
      </div>`).join('')}
    <div style="margin-top:.6rem;display:flex;justify-content:flex-end">
      <button class="btn btn-sm" onclick="apiMarkNotifRead().then(()=>loadRec())" style="background:#EEF2FF;color:var(--s);border:1px solid #C7D2FE">ทำเครื่องหมายว่าอ่านแล้ว</button>
    </div>`;
  cont.appendChild(block);
}

const REC_UI_TEXT = {
  loading: '\u0e01\u0e33\u0e25\u0e31\u0e07\u0e42\u0e2b\u0e25\u0e14...',
  noChildren: '\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e1a\u0e38\u0e15\u0e23\u0e2b\u0e25\u0e32\u0e19\u0e17\u0e35\u0e48\u0e40\u0e0a\u0e37\u0e48\u0e2d\u0e21\u0e1a\u0e31\u0e0d\u0e0a\u0e35',
  overview: '\u0e20\u0e32\u0e1e\u0e23\u0e27\u0e21\u0e2a\u0e33\u0e2b\u0e23\u0e31\u0e1a\u0e27\u0e31\u0e19\u0e19\u0e35\u0e49',
  priority: '\u0e2a\u0e34\u0e48\u0e07\u0e17\u0e35\u0e48\u0e04\u0e27\u0e23\u0e17\u0e33\u0e01\u0e48\u0e2d\u0e19',
  notifications: '\u0e41\u0e08\u0e49\u0e07\u0e40\u0e15\u0e37\u0e2d\u0e19\u0e25\u0e48\u0e32\u0e2a\u0e38\u0e14',
  recommendations: '\u0e04\u0e33\u0e41\u0e19\u0e30\u0e19\u0e33\u0e08\u0e32\u0e01\u0e1c\u0e25\u0e01\u0e32\u0e23\u0e40\u0e25\u0e48\u0e19',
  subjectSummary: '\u0e2a\u0e23\u0e38\u0e1b\u0e15\u0e32\u0e21\u0e27\u0e34\u0e0a\u0e32',
  openScores: '\u0e40\u0e1b\u0e34\u0e14\u0e2b\u0e19\u0e49\u0e32\u0e04\u0e30\u0e41\u0e19\u0e19',
  markRead: '\u0e17\u0e33\u0e40\u0e04\u0e23\u0e37\u0e48\u0e2d\u0e07\u0e2b\u0e21\u0e32\u0e22\u0e27\u0e48\u0e32\u0e2d\u0e48\u0e32\u0e19\u0e41\u0e25\u0e49\u0e27',
  unread: '\u0e43\u0e2b\u0e21\u0e48',
  noItems: '\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23',
  playCount: '\u0e04\u0e23\u0e31\u0e49\u0e07',
  avgScore: '\u0e40\u0e09\u0e25\u0e35\u0e48\u0e22',
  totalPlans: '\u0e41\u0e1c\u0e19\u0e17\u0e35\u0e48\u0e01\u0e33\u0e25\u0e31\u0e07\u0e40\u0e14\u0e34\u0e19',
  reviewSoon: '\u0e04\u0e27\u0e23\u0e17\u0e1a\u0e17\u0e27\u0e19\u0e15\u0e48\u0e2d',
  strongArea: '\u0e08\u0e38\u0e14\u0e41\u0e02\u0e47\u0e07',
  needsHelp: '\u0e08\u0e38\u0e14\u0e17\u0e35\u0e48\u0e15\u0e49\u0e2d\u0e07\u0e0a\u0e48\u0e27\u0e22',
  noData: '\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e40\u0e1e\u0e35\u0e22\u0e07\u0e1e\u0e2d'
};

function recOpenScores(){ if(typeof sec==='function') sec('scores'); }

function recLooksBroken(text){
  const value = String(text || '').trim();
  if(!value) return true;
  return /[\u0080-\u009f]|โ€|โ”|เน€|ยท|�/.test(value);
}

function recSafeText(text){
  const value = String(text || '').trim();
  return recLooksBroken(value) ? '' : value;
}

function recTypeLabel(type){
  const labels = {
    praise: 'ทำได้ดี',
    improve: 'กำลังพัฒนา',
    low_score: 'ควรทบทวน'
  };
  return labels[type] || 'คำแนะนำ';
}

function recBuildRecommendationMessage(rec){
  const original = recSafeText(rec?.message);
  if(original) return original;
  const subject = recSafeText(rec?.subject_name) || 'วิชานี้';
  switch(rec?.rec_type){
    case 'praise':
      return `${subject} ทำได้ดีมากแล้ว ลองต่อยอดด้วยการเล่นด่านถัดไปได้เลย`;
    case 'low_score':
      return `${subject} ควรทบทวนพื้นฐานและลองฝึกซ้ำอีกครั้งเพื่อให้แม่นขึ้น`;
    default:
      return `${subject} กำลังก้าวหน้า ฝึกต่ออีกนิดเพื่อให้คล่องและมั่นใจมากขึ้น`;
  }
}

function recBuildNotification(item){
  const title = recSafeText(item?.title);
  const message = recSafeText(item?.message);
  if(title && message) return { title, message };

  const student = recSafeText(item?.student_name) || 'นักเรียน';
  const eventKey = String(item?.event_key || '');
  if(eventKey.startsWith('score_drop')){
    return {
      title: 'คะแนนช่วงหลังลดลง',
      message: `${student} มีผลการเล่นช่วงหลังลดลง ควรชวนทบทวนเพิ่มเติม`
    };
  }
  if(eventKey.startsWith('plan_complete_')){
    return {
      title: 'ทำแผนการเรียนสำเร็จ',
      message: `${student} ทำตามแผนการเรียนได้ครบแล้ว`
    };
  }
  if(eventKey.startsWith('weak_skill_')){
    return {
      title: 'มีหัวข้อที่ควรทบทวน',
      message: `${student} ยังมีบางหัวข้อที่ควรฝึกซ้ำเพิ่มเติม`
    };
  }
  if(eventKey.startsWith('badge_')){
    return {
      title: 'ได้รับเหรียญใหม่',
      message: `${student} ได้รับเหรียญรางวัลใหม่`
    };
  }

  if(item?.notif_type === 'praise'){
    return {
      title: title || 'ทำได้ดีมาก',
      message: message || `${student} มีพัฒนาการที่ดี น่าชื่นชมมาก`
    };
  }
  if(item?.notif_type === 'warn'){
    return {
      title: title || 'มีเรื่องที่ควรติดตาม',
      message: message || `${student} มีจุดที่ควรทบทวนเพิ่มเติม`
    };
  }
  return {
    title: title || 'อัปเดตการเรียนล่าสุด',
    message: message || `มีความเคลื่อนไหวใหม่ของ ${student}`
  };
}

loadRec = async function(){
  if(A.role!=='parent') return;
  const cont=document.getElementById('rec-cont');
  if(!cont) return;
  cont.innerHTML=`<div style="color:var(--mu);padding:1rem">${REC_UI_TEXT.loading}</div>`;

  const cres=await apiMyChildren().catch(()=>({ok:false,children:[]}));
  const kids=cres.ok ? (cres.children||[]) : [];
  if(!kids.length){
    cont.innerHTML=`<div style="text-align:center;padding:2.5rem 1rem;color:var(--mu)"><div style="font-size:2.5rem;margin-bottom:.75rem">👨‍👩‍👧</div><div style="font-weight:700;color:var(--tx);margin-bottom:.5rem">${REC_UI_TEXT.noChildren}</div></div>`;
    return;
  }

  if(!A.selChild || !kids.find(k=>k.student_id==A.selChild)) A.selChild=kids[0].student_id;
  const selectedChild=kids.find(k=>k.student_id==A.selChild) || kids[0];

  const [recRes, scoreRes, notifRes, analyticsRes] = await Promise.all([
    apiRecommendations(A.selChild).catch(()=>({ok:false,recs:[]})),
    apiScores(A.selChild).catch(()=>({ok:false,scores:[]})),
    apiNotifications().catch(()=>({ok:false,notifications:[],summary:{}})),
    apiStudentAnalytics(A.selChild).catch(()=>({ok:false}))
  ]);

  const recs=recRes.ok ? (recRes.recs||[]) : [];
  const scores=scoreRes.ok ? (scoreRes.scores||[]) : [];
  const notifications=notifRes.ok ? (notifRes.notifications||[]).filter(n=>!A.selChild || +n.student_id===+A.selChild) : [];
  const summary=notifRes.ok ? (notifRes.summary||{}) : {};
  const analytics=analyticsRes.ok ? analyticsRes : null;

  const bySubject={};
  scores.forEach(s=>{
    const name=s.subject_name || '\u0e2d\u0e37\u0e48\u0e19\u0e46';
    if(!bySubject[name]) bySubject[name]={name,plays:0,total:0,max:0};
    bySubject[name].plays += 1;
    bySubject[name].total += +s.score||0;
    bySubject[name].max += +s.max_score||100;
  });
  const subjectSummary=Object.values(bySubject).map(item=>({
    ...item,
    avg:item.max?Math.round((item.total/item.max)*100):0
  })).sort((a,b)=>a.avg-b.avg);

  const weakSubject=subjectSummary[0] || null;
  const strongSubject=subjectSummary.slice().sort((a,b)=>b.avg-a.avg)[0] || null;
  const plans=(analytics?.plans||[]).filter(p=>(p.total_items||0) > (p.completed_items||0));
  const reviewItems=(analytics?.review_items||[]).slice(0,3);
  const priorityItems=[];
  if(weakSubject) priorityItems.push({title:REC_UI_TEXT.needsHelp, body:`${weakSubject.name} • ${REC_UI_TEXT.avgScore} ${weakSubject.avg}%`, tone:'#F97316'});
  if(reviewItems[0]) priorityItems.push({title:REC_UI_TEXT.reviewSoon, body:`${reviewItems[0].skill_name || ''} • พลาด ${reviewItems[0].miss_count || 0} ครั้ง`, tone:'#DC2626'});
  if(plans[0]) priorityItems.push({title:REC_UI_TEXT.totalPlans, body:`${plans[0].title} • ${plans[0].completed_items||0}/${plans[0].total_items||0}`, tone:'#2563EB'});
  if(strongSubject) priorityItems.push({title:REC_UI_TEXT.strongArea, body:`${strongSubject.name} • ${REC_UI_TEXT.avgScore} ${strongSubject.avg}%`, tone:'#16A34A'});

  const recCards=recs.length ? recs.slice(0,5).map(r=>{
    const subject = recSafeText(r.subject_name) || 'วิชานี้';
    return `<div style="padding:.75rem;border:1px solid #E5E7EB;border-radius:14px;background:#fff"><div style="display:flex;justify-content:space-between;gap:.75rem"><strong style="font-size:.85rem">${subject}</strong><span style="font-size:.75rem;color:var(--mu)">${recTypeLabel(r.rec_type)}</span></div><div style="font-size:.82rem;color:#475569;margin-top:.3rem">${recBuildRecommendationMessage(r)}</div></div>`;
  }).join('') : `<div style="color:var(--mu)">${REC_UI_TEXT.noItems}</div>`;
  const notifCards=notifications.length ? notifications.slice(0,5).map(n=>{
    const display = recBuildNotification(n);
    return `<div style="padding:.75rem;border-bottom:1px solid #F1F5F9"><div style="display:flex;justify-content:space-between;gap:.75rem"><strong style="font-size:.84rem">${display.title}</strong><span style="font-size:.74rem;color:var(--mu)">${recSafeText(n.student_name) || ''}</span></div><div style="font-size:.8rem;color:#475569;margin-top:.25rem">${display.message}</div></div>`;
  }).join('') : `<div style="color:var(--mu)">${REC_UI_TEXT.noItems}</div>`;

  cont.innerHTML=`
    <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1rem">${kids.map(k=>`<button class="child-btn${A.selChild==k.student_id?' active':''}" onclick="A.selChild=${k.student_id};loadRec()">${k.full_name}</button>`).join('')}</div>
    <div class="ts" style="margin-bottom:1rem">
      <div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap">
        <div>
          <h3 style="margin:0 0 .25rem">${REC_UI_TEXT.overview}</h3>
          <div style="font-size:.78rem;color:var(--mu)">${selectedChild.full_name||''}</div>
        </div>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap">
          <button class="btn btn-sm" style="background:#EEF2FF;color:var(--s);border:1px solid #C7D2FE" onclick="recOpenScores()">${REC_UI_TEXT.openScores}</button>
        </div>
      </div>
      <div class="stats" style="margin-top:1rem">
        <div class="stat"><div class="sv">${scores.length}</div><div class="sl2">${REC_UI_TEXT.playCount}</div></div>
        <div class="stat"><div class="sv">${subjectSummary.length?Math.round(subjectSummary.reduce((sum,s)=>sum+s.avg,0)/subjectSummary.length):0}%</div><div class="sl2">${REC_UI_TEXT.avgScore}</div></div>
        <div class="stat"><div class="sv">${plans.length}</div><div class="sl2">${REC_UI_TEXT.totalPlans}</div></div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1rem;margin-bottom:1rem">
      <div class="ts" style="margin:0">
        <h3>${REC_UI_TEXT.priority}</h3>
        ${priorityItems.length?priorityItems.map(item=>`<div style="padding:.7rem 0;border-bottom:1px solid #F1F5F9"><div style="font-size:.78rem;font-weight:800;color:${item.tone}">${item.title}</div><div style="font-size:.82rem;color:#475569;margin-top:.25rem">${item.body}</div></div>`).join(''):`<div style="color:var(--mu)">${REC_UI_TEXT.noData}</div>`}
      </div>
      <div class="ts" style="margin:0">
        <h3>${REC_UI_TEXT.recommendations}</h3>
        <div style="display:grid;gap:.6rem">${recCards}</div>
      </div>
    </div>`;
};
