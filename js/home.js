// ══════════════════════════════════════════════════════
// HOME
// ══════════════════════════════════════════════════════
function loadHome(){
  const gamesEl=document.getElementById('home-games');
  if(gamesEl) gamesEl.innerHTML='';
  if(A.role==='student') loadStudentGames();
}

// ── เกมที่ครูมอบหมายให้ห้องของนักเรียน ──
async function loadStudentGames(){
  const el=document.getElementById('home-games');
  if(!el)return;
  el.innerHTML='<div class="ts" style="color:var(--mu)">⏳ กำลังโหลดเกม...</div>';
  const res=await apiStudentGames().catch(()=>({ok:false}));
  if(!res.ok){el.innerHTML=`<div class="ts" style="color:#EF4444">${_esc(res.error||'โหลดเกมไม่สำเร็จ')}</div>`;return;}
  const bySubject={};
  res.games.forEach(g=>(bySubject[g.subject_id] ||= {name:g.subject_name,icon:g.subject_icon,games:[]}).games.push(g));
  const card=g=>{
    const type=GAME_TYPES[g.game_type];
    const best=g.best_score==null?null:+g.best_score;
    return `<button class="sg-card" onclick="playStudentGame(${g.game_id})">
      <span class="sg-ico" aria-hidden="true">${_esc(g.icon||type?.icon||'🎮')}</span>
      <span class="sg-body">
        <span class="sg-name">${_esc(g.name)}</span>
        ${g.description?`<span class="sg-meta">${_esc(g.description)}</span>`:''}
        <span class="sg-meta">${_esc(type?.label||'')} · ${g.question_count} ข้อ · ${Math.round(g.time_limit/60)} นาที</span>
        <span class="sg-meta">${best==null?'ยังไม่เคยเล่น':`คะแนนสูงสุด <strong style="color:${scoreColor(best)}">${best}%</strong>`}</span>
      </span>
      <span class="sg-play">▶️ เล่น</span>
    </button>`;
  };
  el.innerHTML=`<div class="ts"><h3>🎮 เกมจากครู</h3>
    ${Object.values(bySubject).map(s=>`
      <div class="sg-subject">${_esc(s.icon||'📚')} ${_esc(s.name)}</div>
      <div class="sg-grid">${s.games.map(card).join('')}</div>`).join('')
      ||'<div class="gb-empty">ยังไม่มีเกมจากครู</div>'}
  </div>`;
}

// ── หน้าบทเรียน: บทเรียนที่ครูมอบหมายให้ห้องของนักเรียน แยกตามวิชา ──
let _studentLessons=[];
async function loadStudentLessons(){
  const el=document.getElementById('lessons-list');
  el.innerHTML='<div class="ts" style="color:var(--mu)">⏳ กำลังโหลดบทเรียน...</div>';
  const res=await apiStudentLessons().catch(()=>({ok:false}));
  if(!res.ok){el.innerHTML=`<div class="ts" style="color:#EF4444">${_esc(res.error||'โหลดบทเรียนไม่สำเร็จ')}</div>`;return;}
  _studentLessons=res.lessons;
  if(!_studentLessons.length){el.innerHTML='<div class="ts"><div class="gb-empty">ยังไม่มีบทเรียนจากครู</div></div>';return;}
  const bySubject={};
  _studentLessons.forEach((l,i)=>(bySubject[l.subject_name] ||= {icon:l.subject_icon,items:[]}).items.push([l,i]));
  const subjects=Object.entries(bySubject);
  el.innerHTML=`<div class="ts">
    ${subjects.map(([name,s])=>`
      <div class="sg-subject">${_esc(s.icon||'📚')} ${_esc(name)}</div>
      <div class="sg-grid">${s.items.map(([l,i])=>`
        <button class="sg-card" onclick="openLessonReader(_studentLessons[${i}])">
          <span class="sg-ico" aria-hidden="true">${_esc(l.subject_icon||'📖')}</span>
          <span class="sg-body"><span class="sg-name">${_esc(l.title)}</span></span>
          <span class="sg-play">📖 อ่าน</span>
        </button>`).join('')}</div>`).join('')}
  </div>`;
}

async function playStudentGame(gameId){
  const res=await apiGamePlay(gameId).catch(()=>({ok:false}));
  if(!res.ok){alert(res.error||'เปิดเกมไม่สำเร็จ');return;}
  openGamePlayerOverlay(res.game,{onFinish:async({score,timeSpent})=>{
    const saved=await apiSaveScore({game_id:gameId,score,time_spent:timeSpent}).catch(()=>({ok:false}));
    const msg=document.querySelector('.gp-overlay .gp-msg');
    if(msg) msg.insertAdjacentHTML('beforeend',saved.ok
      ?'<div class="gp-saved">✅ บันทึกคะแนนแล้ว</div>'
      :`<div class="gp-saved err">บันทึกคะแนนไม่สำเร็จ: ${_esc(saved.error||'ลองใหม่อีกครั้ง')}</div>`);
    if(saved.ok) loadHome();
  }});
}
