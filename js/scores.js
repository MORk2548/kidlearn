// SCORES
async function loadScores() {
  const childWrap = document.getElementById('child-sel-wrap');
  const tb = document.getElementById('score-tb');
  ensureScoreInsightsHost();
  tb.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--mu);padding:2rem">กำลังโหลด...</td></tr>';

  if (A.role === 'parent') {
    childWrap.style.display = 'block';
    const cres = await apiMyChildren().catch(() => ({ ok: false }));
    const kids = cres.ok ? (cres.children || []) : [];
    const btns = document.getElementById('child-btns');
    btns.innerHTML = '';

    if (!kids.length) {
      btns.innerHTML = '<div style="color:var(--mu);font-size:.85rem">ยังไม่มีบุตรหลานที่เชื่อมบัญชี</div>';
      renderScoreInsights(null);
      tb.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--mu);padding:2.5rem">ยังไม่มีข้อมูลคะแนน</td></tr>';
      return;
    }

    if (!A.selChild || !kids.find(k => k.student_id == A.selChild)) {
      A.selChild = kids[0].student_id;
    }

    kids.forEach(k => {
      const btn = document.createElement('button');
      btn.className = 'child-btn' + (A.selChild == k.student_id ? ' active' : '');
      btn.textContent = k.full_name;
      btn.onclick = () => {
        A.selChild = k.student_id;
        loadScores();
      };
      btns.appendChild(btn);
    });

    const [res, analytics] = await Promise.all([
      apiScores(A.selChild).catch(() => ({ ok: false, scores: [] })),
      apiStudentAnalytics(A.selChild).catch(() => ({ ok: false })),
    ]);
    renderScoreInsights(analytics.ok ? analytics : null);
    renderScoreTable(res.ok ? res.scores : []);
    return;
  }

  if (A.role === 'student') {
    childWrap.style.display = 'none';
    const [res, analytics] = await Promise.all([
      apiScores().catch(() => ({ ok: false, scores: [] })),
      apiStudentAnalytics().catch(() => ({ ok: false })),
    ]);
    renderScoreInsights(analytics.ok ? analytics : null);
    renderScoreTable(res.ok ? res.scores : []);
    return;
  }

  childWrap.style.display = 'none';
  renderScoreInsights(null);
  tb.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--mu);padding:2rem">ครูดูคะแนนรวมได้ที่เมนูแผงครู</td></tr>';
}

function ensureScoreInsightsHost() {
  const scoreSection = document.getElementById('s-scores');
  if (!scoreSection || document.getElementById('score-insights')) return;
  const wrap = document.createElement('div');
  wrap.id = 'score-insights';
  wrap.style.margin = '0 0 1rem';
  const tableWrap = scoreSection.querySelector('.tw');
  if (tableWrap) scoreSection.insertBefore(wrap, tableWrap);
}

function renderScoreInsights(data) {
  const host = document.getElementById('score-insights');
  if (!host) return;
  if (!data) {
    host.innerHTML = '';
    return;
  }

  const overview = data.overview || {};
  const mastery = (data.mastery || []).slice(0, 4);
  const review = (data.review_items || []).slice(0, 3);
  const plans = (data.plans || []).slice(0, 2);
  const alerts = data.alerts || [];

  host.innerHTML = `
    <div class="stats" style="margin-bottom:1rem">
      <div class="stat"><div class="sv">${overview.total_plays || 0}</div><div class="sl2">ครั้งที่เล่น</div></div>
      <div class="stat"><div class="sv">${Math.round(overview.avg_score || 0)}%</div><div class="sl2">คะแนนเฉลี่ย</div></div>
      <div class="stat"><div class="sv">${Math.round((overview.total_time || 0) / 60)}</div><div class="sl2">นาทีสะสม</div></div>
      <div class="stat"><div class="sv">${overview.badge_count || 0}</div><div class="sl2">เหรียญที่ได้รับ</div></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1rem">
      <div class="ts" style="margin:0">
        <h3>Mastery Tracking</h3>
        ${(mastery.length ? mastery : [{ skill_name: 'ยังไม่มีข้อมูล', mastery_score: 0, subject_name: '' }]).map(item => `
          <div style="padding:.45rem 0;border-bottom:1px solid #F1F5F9">
            <div style="display:flex;justify-content:space-between;gap:.75rem;font-size:.82rem">
              <strong>${item.skill_name}</strong><span>${Math.round(item.mastery_score || 0)}%</span>
            </div>
            <div style="font-size:.73rem;color:var(--mu);margin:.15rem 0">${item.subject_name || ''}</div>
            <div style="height:7px;background:#E2E8F0;border-radius:999px">
              <div style="width:${Math.max(0, Math.min(100, Math.round(item.mastery_score || 0)))}%;height:100%;background:${(item.mastery_score || 0) >= 80 ? '#10B981' : (item.mastery_score || 0) >= 60 ? '#F59E0B' : '#EF4444'};border-radius:999px"></div>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="ts" style="margin:0">
        <h3>ข้อที่ควรทบทวน</h3>
        ${review.length ? review.map(item => `
          <div style="padding:.5rem 0;border-bottom:1px solid #F1F5F9">
            <div style="font-size:.8rem;font-weight:700">${item.skill_name || 'หัวข้อฝึก'}</div>
            <div style="font-size:.76rem;color:#7C2D12">${item.prompt_text || 'โจทย์ที่พลาด'}</div>
            <div style="font-size:.72rem;color:var(--mu)">พลาด ${item.miss_count} ครั้ง</div>
          </div>
        `).join('') : '<div style="color:var(--mu)">ยังไม่มีข้อพลาดสะสม</div>'}
      </div>
      <div class="ts" style="margin:0">
        <h3>แผนรายสัปดาห์</h3>
        ${plans.length ? plans.map(plan => `
          <div style="padding:.5rem 0;border-bottom:1px solid #F1F5F9">
            <div style="display:flex;justify-content:space-between;gap:.75rem">
              <strong style="font-size:.82rem">${plan.title}</strong>
              <span class="badge" style="background:#EEF2FF;color:var(--s)">${plan.completed_items || 0}/${plan.total_items || 0}</span>
            </div>
            <div style="font-size:.72rem;color:var(--mu)">เริ่ม ${plan.week_start || '-'}</div>
          </div>
        `).join('') : '<div style="color:var(--mu)">ยังไม่มีแผนที่มอบหมาย</div>'}
        ${alerts.length ? `<div style="margin-top:.75rem;font-size:.76rem;color:#B45309">${alerts.join(' • ')}</div>` : ''}
      </div>
    </div>
  `;
}

function renderScoreTable(sc) {
  const tb = document.getElementById('score-tb');
  if (!sc || !sc.length) {
    tb.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--mu);padding:2.5rem">ยังไม่มีคะแนน</td></tr>';
    return;
  }
  const TYPE_LBL = { mcq: 'MCQ', truefalse: 'จริง/เท็จ', fill: 'เติมคำ', matching: 'จับคู่', sequence: 'เรียงลำดับ', letterorder: 'เรียงตัวอักษร', wordsearch: 'ค้นหาคำ' };
  tb.innerHTML = sc.map(s => {
    const score = s.score ?? s.score;
    const max = s.max_score ?? 100;
    const pct = Math.round(score / max * 100);
    const c = pct >= 80 ? '#065F46' : pct >= 50 ? '#92400E' : '#991B1B';
    const stars = pct >= 80 ? '★★★' : pct >= 50 ? '★★' : pct > 0 ? '★' : '';
    const date = s.played_at ? new Date(s.played_at).toLocaleDateString('th-TH') : (s.date || '-');
    const time = s.time_spent ? `${s.time_spent}วิ` : (s.time || '-');
    return `<tr>
      <td>${s.subject_name || s.sub || '-'}</td>
      <td>${s.game_name || s.game || '-'}</td>
      <td>${TYPE_LBL[s.game_type || s.type] || s.type || '-'}</td>
      <td><strong style="color:${c}">${score}</strong><span style="color:#9CA3AF">/${max}</span> ${stars}</td>
      <td>${time}</td>
      <td>${date}</td>
    </tr>`;
  }).join('');
}

if(typeof A.scoreSubjectFilter==='undefined') A.scoreSubjectFilter='all';

const SCORE_UI_TEXT = {
  all: '\u0e17\u0e38\u0e01\u0e27\u0e34\u0e0a\u0e32',
  scoreOverview: '\u0e20\u0e32\u0e1e\u0e23\u0e27\u0e21\u0e1c\u0e25\u0e01\u0e32\u0e23\u0e40\u0e23\u0e35\u0e22\u0e19',
  subjectView: '\u0e14\u0e39\u0e04\u0e30\u0e41\u0e19\u0e19\u0e41\u0e22\u0e01\u0e15\u0e32\u0e21\u0e27\u0e34\u0e0a\u0e32',
  weakSkills: '\u0e08\u0e38\u0e14\u0e17\u0e35\u0e48\u0e04\u0e27\u0e23\u0e17\u0e1a\u0e17\u0e27\u0e19\u0e01\u0e48\u0e2d\u0e19',
  activePlans: '\u0e41\u0e1c\u0e19\u0e17\u0e35\u0e48\u0e01\u0e33\u0e25\u0e31\u0e07\u0e40\u0e14\u0e34\u0e19\u0e2d\u0e22\u0e39\u0e48',
  alerts: '\u0e41\u0e08\u0e49\u0e07\u0e40\u0e15\u0e37\u0e2d\u0e19\u0e17\u0e35\u0e48\u0e04\u0e27\u0e23\u0e23\u0e39\u0e49',
  attempts: '\u0e04\u0e23\u0e31\u0e49\u0e07',
  avgScore: '\u0e40\u0e09\u0e25\u0e35\u0e48\u0e22',
  timeMinutes: '\u0e19\u0e32\u0e17\u0e35',
  mastery: 'Mastery',
  badges: '\u0e40\u0e2b\u0e23\u0e35\u0e22\u0e0d',
  noWeakSkills: '\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e08\u0e38\u0e14\u0e2d\u0e48\u0e2d\u0e19\u0e2a\u0e30\u0e2a\u0e21\u0e17\u0e35\u0e48\u0e15\u0e49\u0e2d\u0e07\u0e40\u0e15\u0e37\u0e2d\u0e19',
  noPlans: '\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e41\u0e1c\u0e19\u0e17\u0e35\u0e48\u0e44\u0e14\u0e49\u0e23\u0e31\u0e1a\u0e21\u0e2d\u0e1a\u0e2b\u0e21\u0e32\u0e22',
  noAlerts: '\u0e44\u0e21\u0e48\u0e21\u0e35\u0e41\u0e08\u0e49\u0e07\u0e40\u0e15\u0e37\u0e2d\u0e19\u0e1e\u0e34\u0e40\u0e28\u0e29',
  allScores: '\u0e04\u0e30\u0e41\u0e19\u0e19\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14',
  noScores: '\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e04\u0e30\u0e41\u0e19\u0e19',
  lesson: '\u0e1a\u0e17',
  due: '\u0e04\u0e23\u0e1a\u0e01\u0e33\u0e2b\u0e19\u0e14',
  plays: '\u0e40\u0e25\u0e48\u0e19',
  openAdvice: '\u0e14\u0e39\u0e04\u0e33\u0e41\u0e19\u0e30\u0e19\u0e33'
};

function setScoreSubjectFilter(subject){
  A.scoreSubjectFilter=subject||'all';
  if(Array.isArray(window.__scoreRows)) renderScoreTable(window.__scoreRows);
  if(window.__scoreAnalytics) renderScoreInsights(window.__scoreAnalytics);
}

function buildScoreSubjectSummary(rows){
  const grouped={};
  (rows||[]).forEach(row=>{
    const name=row.subject_name || row.sub || SCORE_UI_TEXT.all;
    if(!grouped[name]) grouped[name]={
      name,
      plays:0,
      totalScore:0,
      totalMax:0,
      time:0,
      best:0,
      rows:[]
    };
    const score=+row.score||0;
    const max=+row.max_score||100;
    grouped[name].plays+=1;
    grouped[name].totalScore+=score;
    grouped[name].totalMax+=max;
    grouped[name].time+=+row.time_spent||0;
    grouped[name].best=Math.max(grouped[name].best, Math.round((score/max)*100));
    grouped[name].rows.push(row);
  });
  return Object.values(grouped)
    .map(item=>({
      ...item,
      avg:item.totalMax?Math.round((item.totalScore/item.totalMax)*100):0
    }))
    .sort((a,b)=>b.avg-a.avg || b.plays-a.plays);
}

function renderScoreInsights(data){
  const host=document.getElementById('score-insights');
  if(!host) return;
  window.__scoreAnalytics=data;
  if(!data){ host.innerHTML=''; return; }

  const overview=data.overview||{};
  const mastery=data.mastery||[];
  const review=(data.review_items||[]).slice(0,4);
  const plans=(data.plans||[]).slice(0,3);
  const alerts=data.alerts||[];
  const subjects=mastery.reduce((acc,item)=>{
    const name=item.subject_name||SCORE_UI_TEXT.all;
    if(!acc[name]) acc[name]={name,total:0,count:0,weak:0};
    acc[name].total += +item.mastery_score||0;
    acc[name].count += 1;
    if((+item.mastery_score||0) < 60) acc[name].weak += 1;
    return acc;
  },{});
  const subjectCards=Object.values(subjects).map(item=>({
    ...item,
    avg: item.count ? Math.round(item.total/item.count) : 0
  })).sort((a,b)=>b.avg-a.avg);

  host.innerHTML=`
    <div class="ts" style="margin-bottom:1rem">
      <div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap">
        <div>
          <h3 style="margin:0 0 .25rem">${SCORE_UI_TEXT.scoreOverview}</h3>
          <div style="font-size:.78rem;color:var(--mu)">${SCORE_UI_TEXT.subjectView}</div>
        </div>
        <button class="btn btn-sm" onclick="sec && sec('recommendations')" style="background:#EEF2FF;color:var(--s);border:1px solid #C7D2FE">${SCORE_UI_TEXT.openAdvice}</button>
      </div>
      <div class="stats" style="margin:1rem 0 0">
        <div class="stat"><div class="sv">${overview.total_plays||0}</div><div class="sl2">${SCORE_UI_TEXT.attempts}</div></div>
        <div class="stat"><div class="sv">${Math.round(overview.avg_score||0)}%</div><div class="sl2">${SCORE_UI_TEXT.avgScore}</div></div>
        <div class="stat"><div class="sv">${Math.round((overview.total_time||0)/60)}</div><div class="sl2">${SCORE_UI_TEXT.timeMinutes}</div></div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1rem;margin-bottom:1rem">
      <div class="ts" style="margin:0">
        <h3>${SCORE_UI_TEXT.mastery}</h3>
        ${subjectCards.length?subjectCards.map(subject=>`
          <div style="padding:.5rem 0;border-bottom:1px solid #F1F5F9">
            <div style="display:flex;justify-content:space-between;gap:.75rem;font-size:.82rem"><strong>${subject.name}</strong><span>${subject.avg}%</span></div>
            <div style="font-size:.73rem;color:var(--mu)">${subject.count} skill${subject.count>1?'s':''} • ${subject.weak||0} \u0e08\u0e38\u0e14\u0e17\u0e35\u0e48\u0e22\u0e31\u0e07\u0e2d\u0e48\u0e2d\u0e19</div>
            <div style="height:7px;background:#E2E8F0;border-radius:999px;margin-top:.3rem"><div style="width:${Math.max(0,Math.min(100,subject.avg))}%;height:100%;background:${subject.avg>=80?'#10B981':subject.avg>=60?'#F59E0B':'#EF4444'};border-radius:999px"></div></div>
          </div>`).join(''):'<div style="color:var(--mu)">'+SCORE_UI_TEXT.noScores+'</div>'}
      </div>
      <div class="ts" style="margin:0">
        <h3>${SCORE_UI_TEXT.weakSkills}</h3>
        ${review.length?review.map(item=>`
          <div style="padding:.55rem 0;border-bottom:1px solid #F1F5F9">
            <div style="font-size:.82rem;font-weight:700">${item.skill_name||SCORE_UI_TEXT.student}</div>
            <div style="font-size:.74rem;color:#B45309">${item.subject_name||''}</div>
            <div style="font-size:.76rem;color:#475569;margin-top:.2rem">${item.prompt_text||''}</div>
            <div style="font-size:.72rem;color:var(--mu)">พลาด ${item.miss_count||0} ครั้ง</div>
          </div>`).join(''):`<div style="color:var(--mu)">${SCORE_UI_TEXT.noWeakSkills}</div>`}
      </div>
      <div class="ts" style="margin:0">
        <h3>${SCORE_UI_TEXT.activePlans}</h3>
        ${plans.length?plans.map(plan=>`
          <div style="padding:.55rem 0;border-bottom:1px solid #F1F5F9">
            <div style="display:flex;justify-content:space-between;gap:.75rem"><strong style="font-size:.82rem">${plan.title}</strong><span class="badge" style="background:#EEF2FF;color:var(--s)">${plan.completed_items||0}/${plan.total_items||0}</span></div>
            <div style="font-size:.72rem;color:var(--mu)">${SCORE_UI_TEXT.due} ${plan.due_at ? new Date(plan.due_at).toLocaleDateString('th-TH') : (plan.week_start||'-')}</div>
          </div>`).join(''):`<div style="color:var(--mu)">${SCORE_UI_TEXT.noPlans}</div>`}
        <div style="margin-top:.85rem;border-top:1px solid #F1F5F9;padding-top:.75rem">
          <div style="font-size:.78rem;font-weight:700;margin-bottom:.4rem">${SCORE_UI_TEXT.alerts}</div>
          ${alerts.length?alerts.map(msg=>`<div style="font-size:.75rem;color:#92400E;margin-bottom:.28rem">• ${msg}</div>`).join(''):`<div style="font-size:.75rem;color:var(--mu)">${SCORE_UI_TEXT.noAlerts}</div>`}
        </div>
      </div>
    </div>`;
}

function renderScoreTable(sc){
  const tb=document.getElementById('score-tb');
  window.__scoreRows=sc||[];
  if(!sc || !sc.length){
    tb.innerHTML=`<tr><td colspan="6" style="text-align:center;color:var(--mu);padding:2.5rem">${SCORE_UI_TEXT.noScores}</td></tr>`;
    return;
  }

  const typeLabel={mcq:'MCQ',truefalse:'True/False',fill:'Fill',matching:'Match',sequence:'Sequence',wordsearch:'Search'};
  const filtered=A.scoreSubjectFilter==='all' ? sc : sc.filter(s=>(s.subject_name||s.sub||SCORE_UI_TEXT.all)===A.scoreSubjectFilter);
  const groups=buildScoreSubjectSummary(filtered);
  if(!groups.length){
    tb.innerHTML=`<tr><td colspan="6" style="text-align:center;color:var(--mu);padding:2.5rem">${SCORE_UI_TEXT.noScores}</td></tr>`;
    return;
  }

  tb.innerHTML=groups.map(group=>{
    const header=`<tr><td colspan="6" style="background:#F8FAFC;padding:.85rem 1rem;border-bottom:1px solid #E2E8F0"><div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap"><div><strong style="font-size:.88rem">${group.name}</strong><div style="font-size:.74rem;color:var(--mu)">${SCORE_UI_TEXT.plays} ${group.plays} ${SCORE_UI_TEXT.attempts} • ${SCORE_UI_TEXT.avgScore} ${group.avg}% • Best ${group.best}%</div></div><div style="font-size:.76rem;color:#475569">${Math.round(group.time/60)} ${SCORE_UI_TEXT.timeMinutes}</div></div></td></tr>`;
    const rows=group.rows.sort((a,b)=>new Date(b.played_at||0)-new Date(a.played_at||0)).map(s=>{
      const score=+s.score||0;
      const max=+s.max_score||100;
      const pct=Math.round((score/max)*100);
      const c=pct>=80?'#065F46':pct>=50?'#92400E':'#991B1B';
      const date=s.played_at ? new Date(s.played_at).toLocaleDateString('th-TH') : (s.date||'-');
      const time=s.time_spent ? `${s.time_spent} วินาที` : (s.time||'-');
      return `<tr>
        <td>${s.subject_name||s.sub||'-'}</td>
        <td>${s.game_name||s.game||'-'}</td>
        <td>${typeLabel[s.game_type||s.type] || s.type || '-'}</td>
        <td><strong style="color:${c}">${pct}%</strong><span style="color:#9CA3AF"> (${score}/${max})</span></td>
        <td>${time}</td>
        <td>${date}</td>
      </tr>`;
    }).join('');
    return header+rows;
  }).join('');
}
