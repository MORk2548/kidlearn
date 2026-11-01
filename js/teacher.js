// ══════════════════════════════════════════════════════
// TEACHER DASHBOARD
// ══════════════════════════════════════════════════════
if(typeof A.tcStudent  ==='undefined') A.tcStudent  = null;
if(typeof A.tcSubject  ==='undefined') A.tcSubject  = null;
if(typeof A.tcStudents ==='undefined') A.tcStudents = [];
if(typeof A.tcSubjects ==='undefined') A.tcSubjects = [];
if(typeof A.tcTab      ==='undefined') A.tcTab      = 'scores';
if(typeof A.tcClassrooms==='undefined') A.tcClassrooms = [];
if(typeof A.tcBook     ==='undefined') A.tcBook     = null;
if(typeof A.tcCardSubject==='undefined') A.tcCardSubject = null;
if(typeof A.tcBookView ==='undefined') A.tcBookView = { search: '', sort: 'no', attentionOnly: false };

// ════════════════════════════════════════════════════════
function renderAssignmentForm(el, classrooms, subjects, assignments=[]){
  const homeroom=assignments.find(a=>a.subject_id==null)?.classroom_id;
  const taught=assignments.filter(a=>a.subject_id!=null);
  const subjIds=new Set(taught.map(a=>+a.subject_id));
  const roomIds=new Set(taught.map(a=>+a.classroom_id));
  const grades=[...new Set(classrooms.map(r=>r.grade))];
  const box=(name,val,label,checked)=>`<label style="cursor:pointer;display:flex;gap:.4rem;align-items:center;padding:.3rem .2rem"><input type="checkbox" name="${name}" value="${val}"${checked?' checked':''}> ${label}</label>`;
  const dropdown=(placeholder,count,body)=>`<details class="asg-dd" data-ph="${placeholder}" onchange="const n=this.querySelectorAll('input:checked').length;this.querySelector('summary').textContent=n?'เลือกแล้ว '+n+' รายการ':this.dataset.ph">
    <summary class="fc" style="cursor:pointer">${count?`เลือกแล้ว ${count} รายการ`:placeholder}</summary>
    <div style="border:1px solid var(--bd,#ddd);border-radius:10px;padding:.4rem .6rem;margin-top:.3rem;max-height:260px;overflow-y:auto">${body}</div>
  </details>`;
  el.innerHTML=`
    <div class="fg">
      <label class="fl">ครูประจำชั้น (เห็นทุกวิชาของห้องนี้)</label>
      <select class="fc" name="homeroom">
        <option value="">ไม่ได้เป็นครูประจำชั้น</option>
        ${classrooms.map(r=>`<option value="${r.classroom_id}"${r.classroom_id==homeroom?' selected':''}>${classLabel(r)}</option>`).join('')}
      </select>
    </div>
    <div class="fg">
      <label class="fl">วิชาที่สอน</label>
      ${dropdown('-- เลือกวิชา --',subjIds.size,subjects.map(s=>box('subject',s.subject_id,`${_esc(s.name)}${s.created_by==A.user.id?subjectDelBtn(s.subject_id):''}`,subjIds.has(+s.subject_id))).join('')+(A.role!=='teacher'?'':`
        <div style="display:flex;gap:.4rem;margin-top:.4rem;border-top:1px dashed var(--bd,#eee);padding-top:.5rem">
          <input class="fc" name="new-subject" placeholder="ไม่มีวิชาที่สอน? พิมพ์ชื่อวิชาใหม่" maxlength="100" onkeydown="if(event.key==='Enter'){event.preventDefault();addTcSubject(this)}">
          <button type="button" class="btn btn-p" style="white-space:nowrap" onclick="addTcSubject(this.previousElementSibling)">เพิ่มวิชา</button>
        </div>`))}
    </div>
    <div class="fg">
      <label class="fl">ห้องที่สอนวิชาเหล่านี้</label>
      ${dropdown('-- เลือกห้อง --',roomIds.size,grades.map(g=>`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:0 .4rem;border-bottom:1px dashed var(--bd,#eee)">
        ${classrooms.filter(r=>r.grade===g).map(r=>box('room',r.classroom_id,classLabel(r),roomIds.has(+r.classroom_id))).join('')}
      </div>`).join(''))}
    </div>`;
}
async function addTcSubject(input){
  const name=input.value.trim();
  if(!name) return;
  const res=await apiAddSubject(name).catch(()=>({ok:false}));
  if(!res.ok){ alert(res.error||'เพิ่มวิชาไม่สำเร็จ'); return; }
  const row=input.parentElement;
  let cb=row.parentElement.querySelector(`input[name="subject"][value="${res.subject_id}"]`);
  if(!cb){
    row.insertAdjacentHTML('beforebegin',`<label style="cursor:pointer;display:flex;gap:.4rem;align-items:center;padding:.3rem .2rem"><input type="checkbox" name="subject" value="${res.subject_id}"> ${_esc(name)}${subjectDelBtn(res.subject_id)}</label>`);
    cb=row.previousElementSibling.querySelector('input');
  }
  cb.checked=true;
  cb.dispatchEvent(new Event('change',{bubbles:true}));
  input.value='';
}
const subjectDelBtn=id=>`<button type="button" class="btn-del" title="ลบวิชา" aria-label="ลบวิชา" style="margin-left:auto" onclick="event.preventDefault();delTcSubject(this,${id})"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>`;
async function delTcSubject(btn,id){
  if(!confirm('ลบวิชานี้?')) return;
  const res=await apiDeleteSubject(id).catch(()=>({ok:false}));
  if(!res.ok){ alert(res.error||'ลบวิชาไม่สำเร็จ'); return; }
  const details=btn.closest('details');
  btn.closest('label').remove();
  details.dispatchEvent(new Event('change'));
}
function readAssignmentForm(el){
  const checked=name=>[...el.querySelectorAll(`input[name="${name}"]:checked`)].map(i=>+i.value);
  return {
    homeroom_classroom_id: +el.querySelector('select[name="homeroom"]').value || null,
    subject_ids: checked('subject'),
    classroom_ids: checked('room'),
  };
}
function assignmentSummary(assignments){
  const homeroom=assignments.filter(a=>a.subject_id==null).map(classLabel);
  const bySubject={};
  assignments.filter(a=>a.subject_id!=null).forEach(a=>(bySubject[`${a.subject_name}`] ||= []).push(classLabel(a)));
  return [
    ...homeroom.map(r=>`ครูประจำชั้น ${r}`),
    ...Object.entries(bySubject).map(([s,rooms])=>`${s}: ${rooms.join(', ')}`),
  ].join(' · ');
}
async function _renderTcSetup(){
  const setup=document.getElementById('tc-setup');
  const [roomRes,subRes]=await Promise.all([apiClassrooms(),apiSubjects()]);
  setup.innerHTML=`<div class="ts">
    <h3>ยินดีต้อนรับ! เลือกห้องและวิชาที่คุณสอน</h3>
    <div style="font-size:.82rem;color:var(--mu);margin-bottom:.75rem">เพิ่มหรือลบห้องที่สอนได้ภายหลังในแท็บคะแนนนักเรียน</div>
    <div id="tc-setup-form"></div>
    <div id="tc-setup-err" class="al ae" style="display:none"></div>
    <button class="btn btn-p btn-fw" onclick="saveTcSetup()">บันทึกห้องและวิชาที่สอน</button>
  </div>`;
  renderAssignmentForm(document.getElementById('tc-setup-form'),roomRes.classrooms||[],subRes.subjects||[]);
}
async function saveTcSetup(){
  const d=readAssignmentForm(document.getElementById('tc-setup-form'));
  if(!d.homeroom_classroom_id&&(!d.subject_ids.length||!d.classroom_ids.length)){
    showAl('tc-setup-err','กรุณาเลือกห้องประจำชั้น หรือเลือกทั้งวิชาและห้องที่สอน');
    return;
  }
  const res=await apiSaveTeacherAssignments(d).catch(()=>({ok:false}));
  if(!res.ok){showAl('tc-setup-err',res.error||'บันทึกไม่สำเร็จ');return;}
  loadTeach();
}

async function loadTeach() {
  const setup=document.getElementById('tc-setup');
  const main=document.getElementById('tc-main');
  if(A.role==='teacher'){
    const asg=await apiTeacherAssignments().catch(()=>({ok:false}));
    const assignments=asg.ok?(asg.assignments||[]):[];
    if(asg.ok&&!assignments.length){
      if(main) main.style.display='none';
      await _renderTcSetup();
      return;
    }
  } else if(setup) setup.innerHTML='';
  if(main) main.style.display='';

  const [statsRes,stuRes,roomRes,cardRes,subRes]=await Promise.all([
    apiTeacherStats().catch(()=>({ok:false})),
    apiAllStudents().catch(()=>({ok:false})),
    apiClassrooms().catch(()=>({ok:false})),
    apiTeacherClassSummary().catch(()=>({ok:false})),
    apiSubjects().catch(()=>({ok:false}))
  ]);
  A.tcClassrooms=roomRes.ok?(roomRes.classrooms||[]):[];
  A.tcAllSubjects=subRes.ok?(subRes.subjects||[]):[];
  A.tcSubjects=statsRes.ok?(statsRes.subjects||[]):[];
  A.tcStudents=stuRes.ok?(stuRes.students||[]):[];

  _renderTcTabs();
  renderTcCards(cardRes.ok?(cardRes.cards||[]):[]);
  if(A.tcBook) openTcCard(A.tcBook.classroom_id, A.tcBook.subject_id);
}

function scoreColor(v){ return v>=80?'#10B981':v>=50?'#F59E0B':'#EF4444'; }
function _tcCardTitle(c){ return `${classLabel(c)} · ${c.subject_id?`${c.subject_name}`:'ทุกวิชา'}`; }

function renderTcCards(cards){
  A.tcCards=cards;
  const el=document.getElementById('tc-cards');
  if(!el)return;
  const bySubject={};
  cards.forEach(c=>{
    const key=String(c.subject_id??'all');
    const s=(bySubject[key] ||= {key, title:c.subject_id?`${c.subject_name}`:'ทุกวิชา', grades:{}, cards:[]});
    (s.grades[c.grade||'—'] ||= []).push(c);
    s.cards.push(c);
  });
  const all=Object.values(bySubject);
  const multi=all.length>1;
  if(!bySubject[A.tcCardSubject]) A.tcCardSubject=null;
  const roomButtons=A.role!=='teacher'?'':`<div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.75rem">
      <select class="fc" id="tc-add-subject" style="width:auto">
        <option value="">ครูประจำชั้น (ทุกวิชา)</option>
        ${(A.tcAllSubjects||[]).map(s=>`<option value="${s.subject_id}"${String(s.subject_id)===A.tcCardSubject?' selected':''}>${_esc(s.name)}</option>`).join('')}
      </select>
      <select class="fc" id="tc-add-room" style="width:auto">
        ${A.tcClassrooms.map(r=>`<option value="${r.classroom_id}">${classLabel(r)}</option>`).join('')}
      </select>
      <button class="child-btn" onclick="addTcRoom()">เพิ่มห้องที่สอน</button>
    </div>`;
  if(multi&&!A.tcCardSubject){
    el.innerHTML=`<h3>เลือกวิชาที่ต้องการดูคะแนน</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:.6rem">
        ${all.map(s=>`<button onclick="openTcSubject('${s.key}')"
            style="text-align:left;background:var(--cb);border:2px solid var(--bd);border-radius:14px;padding:.85rem;cursor:pointer;font:inherit">
            <div style="display:flex;justify-content:space-between;align-items:baseline;gap:.5rem;font-size:1rem">
              <span style="font-weight:800">${s.title}</span>
              <span style="color:var(--mu);white-space:nowrap">${s.cards.length} ห้อง</span>
            </div>
          </button>`).join('')}
      </div>${roomButtons}`;
    return;
  }
  const subjects=multi?[bySubject[A.tcCardSubject]]:all;
  const card=c=>{
    return `<div style="position:relative;display:grid"><button onclick="openTcCard(${c.classroom_id},${c.subject_id??'null'})"
      style="text-align:left;background:var(--cb);border:2px solid var(--bd);border-radius:14px;padding:.85rem;cursor:pointer;font:inherit">
      <div style="font-weight:800;font-size:.95rem;padding-right:1.5rem">${multi?classLabel(c):_tcCardTitle(c)}</div>
      <div style="font-size:.78rem;color:var(--mu);margin:.4rem 0">${c.student_count} คน</div>
    </button>${A.role!=='teacher'?'':`<button title="เลิกสอนห้องนี้" aria-label="เลิกสอนห้องนี้" onclick="deleteTcRoom(${c.classroom_id},${c.subject_id??'null'})"
      class="btn-del" style="position:absolute;top:.45rem;right:.45rem"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>`}</div>`;
  };
  el.innerHTML=`${multi?`<div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">
        <button class="btn btn-sm" onclick="openTcSubject(null)">← ทุกวิชา</button>
        <h3 style="margin:0">${subjects[0].title}</h3>
      </div>`:'<h3>ห้องที่ฉันสอน</h3>'}
    ${subjects.map(s=>`
      ${Object.entries(s.grades).map(([grade,list])=>`
        <div style="font-size:.82rem;font-weight:700;color:var(--mu);margin:.6rem 0 .35rem">${grade}</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:.6rem">
          ${list.map(card).join('')}
        </div>`).join('')}`).join('')||'<div style="color:var(--mu)">ยังไม่มีห้องเรียน</div>'}
    ${roomButtons}`;
}

function openTcSubject(key){
  A.tcCardSubject=key;
  closeTcCard();
  renderTcCards(A.tcCards||[]);
}

async function openTcCard(classroomId, subjectId){
  const book=document.getElementById('tc-gradebook');
  document.getElementById('tc-history').style.display='none';
  book.style.display='block';
  book.innerHTML='<div style="color:var(--mu)">กำลังโหลดคะแนน...</div>';
  const res=await apiTeacherGameResults(classroomId, subjectId).catch(()=>({ok:false}));
  if(!res.ok){book.innerHTML=`<div style="color:#EF4444">${res.error||'โหลดคะแนนไม่สำเร็จ'}</div>`;return;}
  const room=A.tcClassrooms.find(r=>r.classroom_id==classroomId)||{};
  const subject=subjectId?A.tcSubjects.find(s=>s.subject_id==subjectId):null;
  const games=_tcGameStats(res);
  A.tcSubject=subjectId;
  A.tcBook={students:res.students, games, gameId:games.keys().next().value??null,
    classroom_id:classroomId, subject_id:subjectId,
    title:_tcCardTitle({...room, subject_id:subjectId, subject_name:subject?.subject_name})};
  book.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.6rem">
      <h3 style="margin:0">คะแนนรายเกม ${A.tcBook.title}</h3>
      <div style="display:flex;gap:.4rem">
        <button class="btn btn-sm" onclick="exportTcBookCsv()">ส่งออก CSV</button>
        <button class="btn btn-sm" onclick="closeTcCard()">✕ ปิด</button>
      </div>
    </div>
    ${games.size?`<div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;margin-bottom:.5rem">
      <input class="fc" style="flex:1;min-width:150px" placeholder="ค้นหาชื่อหรือเลขที่" value="${_esc(A.tcBookView.search)}"
        oninput="A.tcBookView.search=this.value;_renderTcBookRows()">
      <select class="fc" style="width:auto" onchange="A.tcBookView.sort=this.value;_renderTcBookRows()">
        ${[['no','เรียงตามเลขที่'],['name','เรียงตามชื่อ'],['avg_asc','คะแนนน้อย → มาก'],['avg_desc','คะแนนมาก → น้อย'],['recent','เล่นล่าสุด']]
          .map(([v,l])=>`<option value="${v}"${A.tcBookView.sort===v?' selected':''}>${l}</option>`).join('')}
      </select>
      <label style="font-size:.82rem;cursor:pointer"><input type="checkbox"${A.tcBookView.attentionOnly?' checked':''}
        onchange="A.tcBookView.attentionOnly=this.checked;_renderTcBookRows()"> เฉพาะคนที่ต้องดูแล</label>
    </div>
    <div style="font-size:.72rem;color:var(--mu);margin-bottom:.6rem"><span class="att-dot"></span>ต้องดูแล = คะแนนเฉลี่ยต่ำกว่า ${res.attention_rule.min_score} หรือไม่ได้เล่นเกิน ${res.attention_rule.inactive_days} วัน · กดชื่อเพื่อดูประวัติ</div>
    <div class="tc-games">
      <div class="tc-game-list" id="tc-game-list"></div>
      <div class="tc-game-detail" id="tc-book-rows"></div>
    </div>`
    :'<div class="gb-empty">ยังไม่มีเกมที่มอบหมายให้ห้องนี้</div>'}`;
  _renderTcGameList();
  _renderTcBookRows();
  book.scrollIntoView({behavior:'smooth',block:'start'});
}

// รวมทุกครั้งที่เล่นเป็นสถิติต่อเกม ต่อนักเรียน (attempts เรียงตามเวลาจาก backend)
function _tcGameStats(res){
  const avg=xs=>xs.length?Math.round(xs.reduce((t,x)=>t+x,0)/xs.length):null;
  const games=new Map(res.games.map(g=>[g.game_id,{...g, byStudent:new Map()}]));
  for(const a of res.attempts){
    const g=games.get(a.game_id);
    if(!g)continue;
    const s=g.byStudent.get(a.student_id)||{series:[],times:[]};
    s.series.push(+a.score);
    if(+a.time_spent) s.times.push(+a.time_spent);
    s.lastPlayed=a.played_at;
    g.byStudent.set(a.student_id,s);
  }
  for(const g of games.values()){
    for(const s of g.byStudent.values()) Object.assign(s,{best:Math.max(...s.series), last:s.series.at(-1), plays:s.series.length, avgTime:avg(s.times)});
    const stats=[...g.byStudent.values()], bests=stats.map(s=>s.best);
    g.summary={played:stats.length, avg:avg(bests), max:bests.length?Math.max(...bests):null,
      min:bests.length?Math.min(...bests):null, avgTime:avg(stats.flatMap(s=>s.times))};
  }
  return games;
}

function _tcTime(sec){
  if(sec==null)return '—';
  return sec<60?`${sec} วิ`:`${Math.round(sec/60)} นาที`;
}

function selectTcGame(gameId){
  A.tcBook.gameId=gameId;
  _renderTcGameList();
  _renderTcBookRows();
}

function _renderTcGameList(){
  const el=document.getElementById('tc-game-list');
  if(!el||!A.tcBook)return;
  const total=A.tcBook.students.length;
  el.innerHTML=[...A.tcBook.games.values()].map(g=>`
    <button class="tc-game-item${g.game_id===A.tcBook.gameId?' active':''}" onclick="selectTcGame(${g.game_id})">
      <span class="tc-game-name">${_esc(g.name)}</span>
      <span class="tc-game-sub">${A.tcBook.subject_id?'':_esc(g.subject_name)+' · '}${g.summary.played
        ?`เล่นแล้ว ${g.summary.played}/${total} คน · เฉลี่ย ${g.summary.avg}`:'ยังไม่มีใครเล่น'}</span>
    </button>`).join('');
}

function closeTcCard(){
  A.tcBook=null;
  A.tcStudent=null;
  document.getElementById('tc-gradebook').style.display='none';
  document.getElementById('tc-history').style.display='none';
}

// นักเรียนที่ยังไม่ได้เล่นเกมนี้อยู่ท้ายเสมอเมื่อเรียงตามคะแนนหรือเวลา
function _tcBookVisibleRows(){
  const {students,games,gameId}=A.tcBook, v=A.tcBookView;
  const stat=s=>games.get(gameId)?.byStudent.get(s.student_id);
  const q=v.search.trim().toLowerCase();
  const byName=(a,b)=>a.full_name.localeCompare(b.full_name,'th');
  const byNo=(a,b)=>(a.student_no??999)-(b.student_no??999)||byName(a,b);
  const unplayedLast=f=>(a,b)=>(!stat(a)-!stat(b))||(stat(a)&&stat(b)?f(stat(a),stat(b)):byNo(a,b));
  const sorters={no:byNo, name:byName, avg_asc:unplayedLast((x,y)=>x.best-y.best),
    avg_desc:unplayedLast((x,y)=>y.best-x.best), recent:unplayedLast((x,y)=>new Date(y.lastPlayed)-new Date(x.lastPlayed))};
  // พิมพ์ตัวเลขล้วน = หาเลขที่ตรงตัว ไม่งั้น "1" จะไปเจอเลขที่ 10-19 ด้วย
  const match=s=>/^\d+$/.test(q)?s.student_no==q:s.full_name.toLowerCase().includes(q);
  return students.filter(s=>(!q||match(s))&&(!v.attentionOnly||s.needs_attention)).sort(sorters[v.sort]).map(s=>({...s, stat:stat(s)}));
}

function exportTcBookCsv(){
  const g=A.tcBook?.games.get(A.tcBook.gameId);
  if(!g)return;
  const q=v=>`"${String(v??'').replace(/"/g,'""')}"`;
  const lines=[
    ['เลขที่','นักเรียน','ดีที่สุด','ล่าสุด','จำนวนครั้ง','คะแนนทุกครั้ง','เวลาเฉลี่ย (วินาที)','เล่นล่าสุด','ต้องดูแล'],
    ..._tcBookVisibleRows().map(({stat:s,...st})=>[st.student_no??'',st.full_name,s?.best,s?.last,s?.plays??0,s?.series.join(' '),
      s?.avgTime,s?new Date(s.lastPlayed).toLocaleDateString('th-TH'):'',st.needs_attention?'ใช่':'']),
  ].map(r=>r.map(q).join(','));
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob(['﻿'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}));
  a.download=`คะแนน ${g.name} ${A.tcBook.title} ${new Date().toISOString().slice(0,10)}.csv`.replace(/[\\/:*?"<>|]/g,'-');
  a.click();
  URL.revokeObjectURL(a.href);
}

async function editTcStudentNo(sid){
  const s=A.tcBook?.students.find(x=>x.student_id==sid);
  if(!s)return;
  const val=prompt(`เลขที่ของ ${s.full_name} (1-99, เว้นว่างเพื่อลบ)`,s.student_no??'');
  if(val===null)return;
  const res=await apiSetStudentNo(sid,val.trim()).catch(()=>({ok:false}));
  if(!res.ok){alert(res.error||'บันทึกเลขที่ไม่สำเร็จ');return;}
  s.student_no=val.trim()?+val.trim():null;
  _renderTcBookRows();
}

function _renderTcBookRows(){
  const el=document.getElementById('tc-book-rows');
  const g=A.tcBook?.games.get(A.tcBook.gameId);
  if(!el||!g)return;
  const rows=_tcBookVisibleRows(), sm=g.summary;
  const pill=val=>`<span class="tc-pill" style="background:${scoreColor(val)}">${val}/100</span>`;
  const bars=series=>`<span class="tc-bars" role="img" aria-label="คะแนนทุกครั้ง ${series.join(', ')}">${
    series.slice(-10).map(v=>`<i style="height:${Math.max(3,v/100*22)}px;background:${scoreColor(v)}"></i>`).join('')}</span>`;
  const th='padding:.5rem .6rem;white-space:nowrap;font-weight:700';
  const td='padding:.45rem .6rem;text-align:center;white-space:nowrap';
  el.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:baseline;gap:.5rem;flex-wrap:wrap;margin-bottom:.5rem">
      <strong style="font-size:1rem">${_esc(g.name)}</strong>
      <span style="font-size:.8rem;color:var(--mu)">${sm.played?`เฉลี่ย ${sm.avg} · สูงสุด ${sm.max} · ต่ำสุด ${sm.min} · เวลาเฉลี่ย ${_tcTime(sm.avgTime)}`:'ยังไม่มีใครเล่นเกมนี้'}</span>
    </div>
    <div style="overflow-x:auto;border:1px solid var(--bd);border-radius:10px">
    <table style="border-collapse:collapse;font-size:.8rem;width:100%">
      <thead><tr style="background:var(--sf);color:var(--tx)">
        <th style="${th};text-align:left">เลขที่ · นักเรียน</th><th style="${th}">ดีที่สุด</th><th style="${th}">ล่าสุด</th>
        <th style="${th}">เล่น</th><th style="${th}">ทุกครั้ง</th><th style="${th}">เวลาเฉลี่ย</th><th style="${th}">เล่นล่าสุด</th>
      </tr></thead>
      <tbody>${rows.map(({stat:s,...st})=>{
        const bg=A.tcStudent==st.student_id?'var(--tint)':'var(--cb)';
        return `<tr style="border-top:1px solid var(--sf);cursor:pointer;background:${bg}" onclick="selectTcStudent(${st.student_id})">
        <td style="padding:.45rem .6rem;white-space:nowrap;font-weight:600"><span title="กดเพื่อแก้เลขที่" onclick="event.stopPropagation();editTcStudentNo(${st.student_id})" style="display:inline-block;min-width:1.8rem;margin-right:.35rem;padding:.05rem .3rem;border:1px dashed var(--bd);border-radius:6px;text-align:center;color:var(--tx)">${st.student_no??'–'}</span>${st.needs_attention?'<span class="att-dot" title="ต้องดูแล"></span>':''}${_esc(st.full_name)}</td>
        ${s?`<td style="${td}">${pill(s.best)}</td><td style="${td}">${s.last}/100</td><td style="${td}">${s.plays}</td>
          <td style="${td}">${bars(s.series)}</td><td style="${td};color:var(--mu)">${_tcTime(s.avgTime)}</td>
          <td style="${td};color:var(--mu)">${new Date(s.lastPlayed).toLocaleDateString('th-TH')}</td>`
        :`<td colspan="6" style="padding:.45rem .6rem;color:var(--mu)">ยังไม่ได้เล่นเกมนี้</td>`}
      </tr>`;}).join('')||'<tr><td colspan="7" style="padding:1rem;text-align:center;color:var(--mu)">ไม่พบนักเรียน</td></tr>'}</tbody>
    </table></div>`;
}


// ════════ SCORES ════════
async function _applyTcRoomChange(req,failMsg){
  const res=await req().catch(()=>({ok:false}));
  if(!res.ok){alert(res.error||failMsg);return;}
  loadTeach();
}
function addTcRoom(){
  const room=+document.getElementById('tc-add-room').value;
  const subject=+document.getElementById('tc-add-subject').value||null;
  _applyTcRoomChange(()=>apiAddTeacherRoom(room,subject),'เพิ่มห้องไม่สำเร็จ');
}
function deleteTcRoom(classroomId,subjectId){
  const card=(A.tcCards||[]).find(c=>c.classroom_id==classroomId&&c.subject_id==subjectId)||{};
  if(!confirm(`เลิกสอน ${_tcCardTitle(card)}? (นักเรียนและคะแนนยังอยู่ครบ)`))return;
  closeTcCard();
  _applyTcRoomChange(()=>apiRemoveTeacherRoom(classroomId,subjectId),'ลบห้องไม่สำเร็จ');
}
async function selectTcStudent(sid){
  A.tcStudent=sid;
  _renderTcBookRows();
  const hist=document.getElementById('tc-history');
  if(!hist)return;
  hist.style.display='block';

  hist.innerHTML='<div style="color:var(--mu);padding:.5rem">กำลังโหลด...</div>';
  // ส่ง student_id (จาก students table) ไป API
  const res=await apiStudentScores(sid,A.tcSubject||null).catch(()=>({ok:false,scores:[]}));
  const sc=res.ok?(res.scores||[]):[];
  const stu=A.tcBook?.students.find(s=>s.student_id==sid)||A.tcStudents.find(s=>s.student_id==sid);

  if(!sc.length){
    hist.innerHTML=`<div style="text-align:center;padding:1.5rem;color:var(--mu)">
      <div style="font-weight:600">${stu?.full_name||'นักเรียน'} ยังไม่มีคะแนน${A.tcSubject?' ในวิชานี้':''}</div>
    </div>`;
    return;
  }

  // สรุปรายเกม
  const bySub={};
  sc.forEach(s=>{
    const k=s.game_name||'อื่นๆ';
    if(!bySub[k])bySub[k]={plays:0,total:0,totalMax:0};
    bySub[k].plays++;bySub[k].total+=(+s.score||0);bySub[k].totalMax+=(+s.max_score||100);
  });
  const sumHtml=Object.entries(bySub).map(([n,d])=>{
    const avg=d.totalMax?Math.round(d.total/d.totalMax*100):0,c=avg>=80?'#10B981':avg>=50?'#F59E0B':'#EF4444';
    return `<div style="display:flex;align-items:center;gap:.6rem;padding:.3rem 0">
      <div style="font-size:.8rem;color:var(--tx);min-width:100px">${n}</div>
      <div style="flex:1;height:7px;background:var(--bd);border-radius:4px">
        <div style="width:${avg}%;height:100%;background:${c};border-radius:4px"></div>
      </div>
      <div style="font-weight:700;color:${c};font-size:.82rem;min-width:40px;text-align:right">${avg}</div>
      <div style="font-size:.72rem;color:var(--mu);min-width:48px">${d.plays} ครั้ง</div>
    </div>`;
  }).join('');

  // จัดกลุ่มตามเกม
  const groups={};
  sc.forEach(s=>{
    const k=s.game_name||'อื่นๆ';
    if(!groups[k])groups[k]={name:k,plays:0,totalScore:0,totalMax:0,time:0,best:0,rows:[]};
    const score=+s.score||0,max=+s.max_score||100;
    groups[k].plays++;groups[k].totalScore+=score;groups[k].totalMax+=max;
    groups[k].time+=+s.time_spent||0;
    groups[k].best=Math.max(groups[k].best,Math.round(score/max*100));
    groups[k].rows.push(s);
  });
  const tableRows=Object.values(groups).map(g=>({...g,avg:g.totalMax?Math.round(g.totalScore/g.totalMax*100):0})).map(group=>{
    const header=`<tr><td colspan="4" style="background:var(--sf);padding:.75rem 1rem;border-bottom:1px solid var(--bd)">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:.5rem">
        <div><strong style="font-size:.88rem">${group.name}</strong>
          <div style="font-size:.73rem;color:var(--mu)">เล่น ${group.plays} ครั้ง • เฉลี่ย ${group.avg} • Best ${group.best}/100</div>
        </div>
        <div style="font-size:.76rem;color:var(--mu)">${Math.round(group.time/60)} นาที</div>
      </div></td></tr>`;
    const rows=group.rows.sort((a,b)=>new Date(b.played_at||0)-new Date(a.played_at||0)).map(s=>{
      const pct=Math.round((+s.score||0)/(+s.max_score||100)*100),c=pct>=80?'#065F46':pct>=50?'#92400E':'#991B1B';
      return `<tr style="border-bottom:1px solid var(--sf)">
        <td style="padding:.5rem .75rem">${s.subject_name||'—'}<br><span style="font-size:.7rem;color:var(--mu)">${GAME_TYPES[s.game_type]?.label||''}</span></td>
        <td style="padding:.5rem .75rem;text-align:center">
          <strong style="color:${c}">${s.score}/${s.max_score||100}</strong>
        </td>
        <td style="padding:.5rem .75rem;text-align:center;color:var(--mu)">${s.time_spent?s.time_spent+'วิ':'—'}</td>
        <td style="padding:.5rem .75rem">${s.played_at?new Date(s.played_at).toLocaleDateString('th-TH'):'—'}</td>
      </tr>`;
    }).join('');
    return header+rows;
  }).join('');

  hist.innerHTML=`
    <div style="font-weight:800;font-size:.95rem;margin-bottom:.85rem;display:flex;align-items:center;gap:.5rem">
      <div class="sa" style="width:32px;height:32px;font-size:.85rem">${(stu?.full_name||'?').charAt(0)}</div>
      ${stu?.full_name||''} — ประวัติคะแนน
    </div>
    <div style="font-size:.78rem;font-weight:700;color:var(--mu);margin-bottom:.4rem">ประวัติทั้งหมด ${sc.length} ครั้ง</div>
    <div style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:.82rem;min-width:350px">
      <thead><tr style="background:var(--sf);color:var(--tx)">
        <th style="padding:.5rem .75rem;text-align:left">วิชา</th>
        <th style="padding:.5rem .75rem;text-align:center">คะแนน</th>
        <th style="padding:.5rem .75rem;text-align:center">เวลา</th>
        <th style="padding:.5rem .75rem;text-align:left">วันที่</th>
      </tr></thead>
      <tbody>${tableRows}</tbody>
    </table></div>`;
}

function _esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function _renderTcTabs(){
  const wrap=document.getElementById('tc-tabs');
  if(!wrap)return;
  wrap.innerHTML=`
    <button class="rec-tab${A.tcTab==='scores'?' active':''}"  onclick="switchTcTab('scores')">คะแนนนักเรียน</button>
    <button class="rec-tab${A.tcTab==='games'?' active':''}"   onclick="switchTcTab('games')">สร้างเกม</button>
    <button class="rec-tab${A.tcTab==='lessons'?' active':''}" onclick="switchTcTab('lessons')">เพิ่มบทเรียน</button>
    <button class="rec-tab${A.tcTab==='students'?' active':''}" onclick="switchTcTab('students')">เพิ่มนักเรียน</button>`;
  const scorePanel=document.getElementById('tc-score-panel');
  const gamePanel=document.getElementById('tc-game-panel');
  if(scorePanel) scorePanel.style.display=A.tcTab==='scores'?'block':'none';
  if(gamePanel) gamePanel.style.display=A.tcTab==='games'?'block':'none';
  const lessonPanel=document.getElementById('tc-lesson-panel');
  if(lessonPanel) lessonPanel.style.display=A.tcTab==='lessons'?'block':'none';
  const studentPanel=document.getElementById('tc-student-panel');
  if(studentPanel) studentPanel.style.display=A.tcTab==='students'?'block':'none';
}

function switchTcTab(tab){
  A.tcTab=tab;
  _renderTcTabs();
  if(tab==='games') loadGameBuilder();
  if(tab==='lessons') loadLessonBuilder();
  if(tab==='students') loadStudentImport();
}

