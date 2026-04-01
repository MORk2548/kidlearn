// ══════════════════════════════════════════════════════
// SCORES — ใช้ PHP API
// ══════════════════════════════════════════════════════
async function loadScores() {
  const childWrap = document.getElementById('child-sel-wrap');
  const tb        = document.getElementById('score-tb');
  tb.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--mu);padding:2rem">⏳ กำลังโหลด...</td></tr>';

  if (A.role === 'parent') {
    childWrap.style.display = 'block';
    // ดึงรายชื่อบุตรหลาน
    const cres = await apiMyChildren().catch(()=>({ok:false}));
    const kids = cres.ok ? cres.children : [];
    const btns = document.getElementById('child-btns');
    btns.innerHTML = '';

    if (!kids.length) {
      btns.innerHTML = '<div style="color:var(--mu);font-size:.85rem">ยังไม่ได้เชื่อมบัญชีบุตรหลาน</div>';
      tb.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--mu);padding:2.5rem">ไม่มีข้อมูล — กรอกเบอร์โทรให้ตรงกับที่บุตรหลานกรอกตอนสมัคร</td></tr>';
      return;
    }

    if (!A.selChild || !kids.find(k=>k.student_id==A.selChild))
      A.selChild = kids[0].student_id;

    kids.forEach(k => {
      const btn = document.createElement('button');
      btn.className = 'child-btn' + (A.selChild==k.student_id?' active':'');
      btn.innerHTML = `👦 ${k.full_name}`;
      btn.onclick = () => { A.selChild = k.student_id; loadScores(); };
      btns.appendChild(btn);
    });

    const res = await apiScores(A.selChild).catch(()=>({ok:false,scores:[]}));
    renderScoreTable(res.ok ? res.scores : []);

  } else if (A.role === 'student') {
    childWrap.style.display = 'none';
    const res = await apiScores().catch(()=>({ok:false,scores:[]}));
    renderScoreTable(res.ok ? res.scores : []);

  } else {
    childWrap.style.display = 'none';
    tb.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--mu);padding:2rem">⚠️ ครูดูคะแนนรวมได้ที่เมนู "แผงครู"</td></tr>';
  }
}

function renderScoreTable(sc) {
  const tb = document.getElementById('score-tb');
  if (!sc || !sc.length) {
    tb.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--mu);padding:2.5rem">ยังไม่มีคะแนน</td></tr>';
    return;
  }
  const TYPE_LBL={mcq:'MCQ',truefalse:'จริง/เท็จ',fill:'เติมคำ',matching:'จับคู่',sequence:'เรียงลำดับ',wordsearch:'ค้นหาคำ'};
  tb.innerHTML = sc.map(s => {
    const score = s.score ?? s.score;
    const max   = s.max_score ?? 100;
    const pct   = Math.round(score/max*100);
    const c     = pct>=80?'#065F46':pct>=50?'#92400E':'#991B1B';
    const stars = pct>=80?'⭐⭐⭐':pct>=50?'⭐⭐':pct>0?'⭐':'';
    const date  = s.played_at ? new Date(s.played_at).toLocaleDateString('th-TH') : (s.date||'—');
    const time  = s.time_spent ? s.time_spent+'วิ' : (s.time||'—');
    return `<tr>
      <td>${s.subject_name||s.sub||'—'}</td>
      <td>${s.game_name||s.game||'—'}</td>
      <td>${TYPE_LBL[s.game_type||s.type]||s.type||'—'}</td>
      <td><strong style="color:${c}">${score}</strong><span style="color:#9CA3AF">/${max}</span> ${stars}</td>
      <td>${time}</td>
      <td>${date}</td>
    </tr>`;
  }).join('');
}
