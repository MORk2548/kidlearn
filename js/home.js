// ══════════════════════════════════════════════════════
// HOME
// ══════════════════════════════════════════════════════
function loadHome(){
  const gamesEl=document.getElementById('home-games');
  if(gamesEl) gamesEl.innerHTML='';
  closeProfileEdit();
  if(A.role==='student') loadStudentGames();
}

const HOME_PROFILE_EXTRA={
  teacher:  ['กลุ่มสาระ / แผนก', u=>u.department],
  student:  ['ชั้นเรียน',        u=>classLabel(u)],
  parent:   ['เบอร์โทร',         u=>u.phone],
  executive:['ตำแหน่ง',          u=>u.executive_title],
};

function renderHomeProfile(){
  const el=document.getElementById('home-user');
  if(!el)return;
  const u=A.user;
  const row=(label,value)=>`<div class="hu-row"><span class="hu-label">${label}</span><span class="hu-value">${_esc(value||'—')}</span></div>`;
  const extra=HOME_PROFILE_EXTRA[u.role];
  el.innerHTML=`<div class="ts hu-card">
    <div class="hu-head">
      <div class="avatar ${u.role} hu-av" id="hu-av"></div>
      <div>
        <div class="hu-name">${_esc(u.name)}</div>
        <span class="rb ${u.role}">${ROLE_LABEL[u.role]||u.role}</span>
      </div>
      <button class="btn btn-s btn-sm hu-edit" onclick="openProfileEdit()">แก้ไขข้อมูล</button>
    </div>
    ${row('ชื่อผู้ใช้',u.username)}
    ${row('อีเมล',u.email)}
    ${extra?row(extra[0],extra[1](u)):''}
    ${row('เป็นสมาชิกตั้งแต่',formatDateTimeTH(u.created_at))}
  </div>`;
  applyAvatar(document.getElementById('hu-av'),u.name?.charAt(0));
}

function openProfileEdit(){
  loadProfile();
  document.getElementById('home-user').innerHTML='';
  document.getElementById('home-profile-edit').style.display='block';
}

function closeProfileEdit(){
  document.getElementById('home-profile-edit').style.display='none';
  renderHomeProfile();
}

// ── เกมที่ครูมอบหมายให้ห้องของนักเรียน ──
async function loadStudentGames(){
  const el=document.getElementById('home-games');
  if(!el)return;
  el.innerHTML='<div class="ts" style="color:var(--mu)">กำลังโหลดเกม...</div>';
  const res=await apiStudentGames().catch(()=>({ok:false}));
  if(!res.ok){el.innerHTML=`<div class="ts" style="color:#EF4444">${_esc(res.error||'โหลดเกมไม่สำเร็จ')}</div>`;return;}
  const bySubject={};
  res.games.forEach(g=>(bySubject[g.subject_id] ||= {name:g.subject_name,games:[]}).games.push(g));
  const card=g=>{
    const type=GAME_TYPES[g.game_type];
    const best=g.best_score==null?null:+g.best_score;
    return `<button class="sg-card" onclick="playStudentGame(${g.game_id})">
      <span class="sg-body">
        <span class="sg-name">${_esc(g.name)}</span>
        ${g.description?`<span class="sg-meta">${_esc(g.description)}</span>`:''}
        <span class="sg-meta">${_esc(type?.label||'')} · ${g.question_count} ข้อ · ${Math.round(g.time_limit/60)} นาที</span>
        ${best==null?'<span class="sg-meta">ยังไม่เคยเล่น</span>':`${starsHtml(scoreStars(best))}<span class="sg-meta">ดีที่สุด ${best}/100</span>`}
      </span>
      <span class="sg-play">เล่น</span>
    </button>`;
  };
  el.innerHTML=`<div class="ts"><h3>เกมจากครู</h3>
    ${Object.values(bySubject).map(s=>`
      <div class="sg-subject">${_esc(s.name)}</div>
      <div class="sg-grid">${s.games.map(card).join('')}</div>`).join('')
      ||'<div class="gb-empty">ยังไม่มีเกมจากครู</div>'}
  </div>`;
}

// ── หน้าบทเรียน: บทเรียนที่ครูมอบหมายให้ห้องของนักเรียน แยกตามวิชา ──
let _studentLessons=[];
async function loadStudentLessons(){
  const el=document.getElementById('lessons-list');
  el.innerHTML='<div class="ts" style="color:var(--mu)">กำลังโหลดบทเรียน...</div>';
  const res=await apiStudentLessons().catch(()=>({ok:false}));
  if(!res.ok){el.innerHTML=`<div class="ts" style="color:#EF4444">${_esc(res.error||'โหลดบทเรียนไม่สำเร็จ')}</div>`;return;}
  _studentLessons=res.lessons;
  if(!_studentLessons.length){el.innerHTML='<div class="ts"><div class="gb-empty">ยังไม่มีบทเรียนจากครู</div></div>';return;}
  const bySubject={};
  _studentLessons.forEach((l,i)=>(bySubject[l.subject_name] ||= {items:[]}).items.push([l,i]));
  const subjects=Object.entries(bySubject);
  el.innerHTML=`<div class="ts">
    ${subjects.map(([name,s])=>`
      <div class="sg-subject">${_esc(name)}</div>
      <div class="sg-grid">${s.items.map(([l,i])=>`
        <button class="sg-card" onclick="openLessonReader(_studentLessons[${i}])">
          <span class="sg-body"><span class="sg-name">${_esc(l.title)}</span>${l.game_name?`<span class="sg-meta">ใช้กับเกม ${_esc(l.game_name)}</span>`:''}</span>
          <span class="sg-play">อ่าน</span>
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
      ?'<div class="gp-saved">บันทึกคะแนนแล้ว</div>'
      :`<div class="gp-saved err">บันทึกคะแนนไม่สำเร็จ: ${_esc(saved.error||'ลองใหม่อีกครั้ง')}</div>`);
    if(saved.ok) document.getElementById('s-scores').style.display==='block' ? loadScores() : loadHome();
  }});
}
