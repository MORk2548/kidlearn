// ══════════════════════════════════════════════════════
// HOME
// ══════════════════════════════════════════════════════
function loadHome(){
  const r=A.role;
  let html='';
  if(r==='student'){
    html=`<div class="stat"><div class="si">⭐</div><div><div class="sv" id="home-stat-avg">…</div><div class="sl2">คะแนนเฉลี่ย</div></div></div>
          <div class="stat"><div class="si">📚</div><div><div class="sv">6</div><div class="sl2">วิชา</div></div></div>`;
  } else if(r==='parent'){
    const kids=A.user.children||[];
    const allSc=kids.flatMap(id=>SCORES[id]||[]);
    const avg=allSc.length?Math.round(allSc.reduce((s,x)=>s+x.score,0)/allSc.length):0;
    html=`<div class="stat"><div class="si">👦</div><div><div class="sv">${kids.length}</div><div class="sl2">บุตรหลาน</div></div></div>
          <div class="stat"><div class="si">🏆</div><div><div class="sv">${avg}</div><div class="sl2">คะแนนเฉลี่ยบุตร</div></div></div>
          <div class="stat"><div class="si">💡</div><div><div class="sv">3</div><div class="sl2">คำแนะนำใหม่</div></div></div>`;
  } else {
    html=`<div class="stat"><div class="si">👦</div><div><div class="sv" id="home-stat-students">…</div><div class="sl2">นักเรียน</div></div></div>
          <div class="stat"><div class="si">📚</div><div><div class="sv">6</div><div class="sl2">วิชา</div></div></div>
          <div class="stat"><div class="si">📊</div><div><div class="sv">77%</div><div class="sl2">คะแนนเฉลี่ย</div></div></div>`;
  }
  document.getElementById('home-stats').innerHTML=html;
  if (r !== 'student' && r !== 'parent') {
    apiAllStudents().then(res => {
      const el = document.getElementById('home-stat-students');
      if (!el) return;
      const count = res.ok && Array.isArray(res.students) ? res.students.length : 0;
      el.textContent = count;
    }).catch(() => {
      const el = document.getElementById('home-stat-students');
      if (el) el.textContent = '0';
    });
  }
  if (r === 'student') {
    apiScores().then(res => {
      if (!res.ok || !res.scores) return;
      const sc = res.scores;
      const played = sc.length;
      const avg = played ? Math.round(sc.reduce((a,s) => a + (+s.score / (+s.max_score||100)), 0) / played * 100) : 0;
      const elAvg = document.getElementById('home-stat-avg');
      if (elAvg) elAvg.textContent = avg + '%';
    }).catch(() => {
      const elAvg = document.getElementById('home-stat-avg');
      if (elAvg) elAvg.textContent = '0%';
    });
  }
}
