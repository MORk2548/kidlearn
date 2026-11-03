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
  // ด่านที่ยังล็อกกดไม่ได้ เซิร์ฟเวอร์ตรวจซ้ำตอนเปิดเกม
  const level=(g,lv)=>`<button class="sg-play sg-level" onclick="playStudentGame(${g.game_id},'${lv.level}')"${lv.unlocked?'':' disabled'}
      aria-label="ด่าน${GAME_LEVELS[lv.level]}${lv.unlocked?(lv.best_score==null?' ยังไม่เคยเล่น':` ดีที่สุด ${lv.best_score} คะแนน`):' ล็อกอยู่'}">
      ${lv.unlocked?'':'<i class="fa-solid fa-lock" aria-hidden="true"></i> '}${GAME_LEVELS[lv.level]}${lv.best_score==null?'':` · ${lv.best_score}`}</button>`;
  const card=g=>{
    const type=GAME_TYPES[g.game_type];
    const best=g.best_score==null?null:+g.best_score;
    return `<div class="sg-card" data-search-item="${_esc(g.subject_name)}">
      <span class="sg-body">
        <span class="sg-name">${_esc(g.name)}</span>
        ${g.description?`<span class="sg-meta">${_esc(g.description)}</span>`:''}
        <span class="sg-meta">${_esc(type?.label||'')} · ${g.question_count} ข้อ · ${Math.round(g.time_limit/60)} นาทีต่อด่าน</span>
        ${best==null?'<span class="sg-meta">ยังไม่เคยเล่น</span>':`${starsHtml(scoreStars(best))}<span class="sg-meta">ดีที่สุด ${best}/100</span>`}
        ${g.levels.length>1?'<span class="sg-meta">ได้ 80 คะแนนขึ้นไปเพื่อปลดด่านถัดไป</span>':''}
      </span>
      <span class="sg-levels">${g.levels.map(lv=>level(g,lv)).join('')}</span>
    </div>`;
  };
  el.innerHTML=`<div class="ts"><h3>เกมจากครู</h3>
    ${res.games.length?searchBoxHtml('ค้นหาเกม เช่น ชื่อเกม หรือวิชา'):''}
    ${Object.values(bySubject).map(s=>`<div data-search-group>
      <div class="sg-subject">${_esc(s.name)}</div>
      <div class="sg-grid">${s.games.map(card).join('')}</div></div>`).join('')
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
    ${searchBoxHtml('ค้นหาบทเรียน เช่น ชื่อบท วิชา หรือชื่อเกม')}
    ${subjects.map(([name,s])=>`<div data-search-group>
      <div class="sg-subject">${_esc(name)}</div>
      <div class="sg-grid">${s.items.map(([l,i])=>`
        <button class="sg-card" data-search-item="${_esc(name)}" onclick="openLessonReader(_studentLessons[${i}])">
          <span class="sg-body"><span class="sg-name">${_esc(l.title)}</span>${l.game_name?`<span class="sg-meta">ใช้กับเกม ${_esc(l.game_name)}</span>`:''}</span>
          <span class="sg-play">อ่าน</span>
        </button>`).join('')}</div></div>`).join('')}
  </div>`;
}

async function playStudentGame(gameId,level='easy'){
  const res=await apiGamePlay(gameId,level).catch(()=>({ok:false}));
  if(!res.ok){alert(res.error||'เปิดเกมไม่สำเร็จ');return;}
  // ด่านถัดไปปลดได้หลังบันทึกคะแนนเสร็จ ปุ่มไปด่านต่อไปจึงต้องรอการบันทึกนี้
  let saving=Promise.resolve();
  openGamePlayerOverlay(res.game,{
    onFinish:({score,timeSpent})=>{saving=(async()=>{
      const saved=await apiSaveScore({game_id:gameId,level,score,time_spent:timeSpent}).catch(()=>({ok:false}));
      const msg=document.querySelector('.gp-overlay .gp-msg');
      if(msg) msg.insertAdjacentHTML('beforeend',saved.ok
        ?'<div class="gp-saved">บันทึกคะแนนแล้ว</div>'
        :`<div class="gp-saved err">บันทึกคะแนนไม่สำเร็จ: ${_esc(saved.error||'ลองใหม่อีกครั้ง')}</div>`);
      if(saved.ok) document.getElementById('s-scores').style.display==='block' ? loadScores() : loadHome();
    })();},
    onNextLevel:async()=>{await saving;playStudentGame(gameId,res.game.next_level);},
  });
}
