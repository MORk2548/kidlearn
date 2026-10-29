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
if(typeof A.tcBookView ==='undefined') A.tcBookView = { search: '', sort: 'name', attentionOnly: false };
let _edGid=null, _edDbGid=null;

// ════════════════════════════════════════════════════════
function renderAssignmentForm(el, classrooms, subjects, assignments=[]){
  const homeroom=assignments.find(a=>a.subject_id==null)?.classroom_id;
  const taught=assignments.filter(a=>a.subject_id!=null);
  const subjIds=new Set(taught.map(a=>+a.subject_id));
  const roomIds=new Set(taught.map(a=>+a.classroom_id));
  const grades=[...new Set(classrooms.map(r=>r.grade))];
  const box=(name,val,label,checked)=>`<label class="child-btn" style="cursor:pointer"><input type="checkbox" name="${name}" value="${val}"${checked?' checked':''}> ${label}</label>`;
  el.innerHTML=`
    <div class="fg">
      <label class="fl">🏠 ครูประจำชั้น (เห็นทุกวิชาของห้องนี้)</label>
      <select class="fc" name="homeroom">
        <option value="">ไม่ได้เป็นครูประจำชั้น</option>
        ${classrooms.map(r=>`<option value="${r.classroom_id}"${r.classroom_id==homeroom?' selected':''}>${classLabel(r)}</option>`).join('')}
      </select>
    </div>
    <div class="fg">
      <label class="fl">📚 วิชาที่สอน</label>
      <div style="display:flex;gap:.4rem;flex-wrap:wrap">${subjects.map(s=>box('subject',s.subject_id,`${s.icon||'📚'} ${s.name}`,subjIds.has(+s.subject_id))).join('')}</div>
    </div>
    <div class="fg">
      <label class="fl">🏫 ห้องที่สอนวิชาเหล่านี้</label>
      ${grades.map(g=>`<div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:.4rem">
        ${classrooms.filter(r=>r.grade===g).map(r=>box('room',r.classroom_id,classLabel(r),roomIds.has(+r.classroom_id))).join('')}
      </div>`).join('')}
    </div>`;
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
  assignments.filter(a=>a.subject_id!=null).forEach(a=>(bySubject[`${a.icon||'📚'} ${a.subject_name}`] ||= []).push(classLabel(a)));
  return [
    ...homeroom.map(r=>`🏠 ครูประจำชั้น ${r}`),
    ...Object.entries(bySubject).map(([s,rooms])=>`${s}: ${rooms.join(', ')}`),
  ].join(' · ');
}
async function _renderTcSetup(){
  const setup=document.getElementById('tc-setup');
  const [roomRes,subRes]=await Promise.all([apiClassrooms(),apiSubjects()]);
  setup.innerHTML=`<div class="ts">
    <h3>👋 ยินดีต้อนรับ! เลือกห้องและวิชาที่คุณสอน</h3>
    <div style="font-size:.82rem;color:var(--mu);margin-bottom:.75rem">เลือกได้ครั้งเดียว ถ้าต้องการแก้ไขภายหลังให้ติดต่อเจ้าหน้าที่</div>
    <div id="tc-setup-form"></div>
    <div id="tc-setup-err" class="al ae" style="display:none"></div>
    <button class="btn btn-p btn-fw" onclick="saveTcSetup()">💾 บันทึกห้องและวิชาที่สอน</button>
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
    if(setup) setup.innerHTML=`<div class="ts" style="font-size:.85rem">📌 ${assignmentSummary(assignments)}
      <div style="font-size:.72rem;color:var(--mu);margin-top:.25rem">ต้องการเปลี่ยนห้องหรือวิชา ให้ติดต่อเจ้าหน้าที่</div></div>`;
  } else if(setup) setup.innerHTML='';
  if(main) main.style.display='';

  const el=document.getElementById('tc-stats');
  if(el) el.innerHTML='<div style="color:var(--mu)">⏳ กำลังโหลด...</div>';

  const [statsRes,stuRes,roomRes,cardRes]=await Promise.all([
    apiTeacherStats().catch(()=>({ok:false})),
    apiAllStudents().catch(()=>({ok:false})),
    apiClassrooms().catch(()=>({ok:false})),
    apiTeacherClassSummary().catch(()=>({ok:false}))
  ]);
  A.tcClassrooms=roomRes.ok?(roomRes.classrooms||[]):[];
  A.tcSubjects=statsRes.ok?(statsRes.subjects||[]):[];
  A.tcStudents=stuRes.ok?(stuRes.students||[]):[];

  const total  = statsRes.ok ? (+statsRes.total_students || A.tcStudents.length) : A.tcStudents.length;
  const allPlay=A.tcStudents.reduce((s,x)=>s+(+x.games_played||0),0);
  const avgAll =total?Math.round(A.tcStudents.reduce((s,x)=>s+(+x.avg_score||0),0)/total):0;

  if(el) el.innerHTML=`
    <div class="stat"><div class="si">👦</div><div><div class="sv">${total}</div><div class="sl2">นักเรียน</div></div></div>
    <div class="stat"><div class="si">📚</div><div><div class="sv">${A.tcSubjects.length}</div><div class="sl2">วิชา</div></div></div>
    <div class="stat"><div class="si">🎮</div><div><div class="sv">${allPlay}</div><div class="sl2">เล่นรวม</div></div></div>
    <div class="stat"><div class="si">📊</div><div><div class="sv">${avgAll}%</div><div class="sl2">คะแนนเฉลี่ย</div></div></div>`;

  _renderTcTabs();
  ensureTcPlanPanel();
  renderTcCards(cardRes.ok?(cardRes.cards||[]):[]);
  renderTcPlanPanel();
  if(A.tcBook) openTcCard(A.tcBook.classroom_id, A.tcBook.subject_id);
}

function scoreColor(v){ return v>=80?'#10B981':v>=50?'#F59E0B':'#EF4444'; }
function _tcCardTitle(c){ return `${classLabel(c)} · ${c.subject_id?`${c.icon||'📚'} ${c.subject_name}`:'🏠 ทุกวิชา'}`; }

function renderTcCards(cards){
  const el=document.getElementById('tc-cards');
  if(!el)return;
  el.innerHTML=`<h3>🏫 ห้องที่ฉันสอน</h3>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:.75rem">
      ${cards.map(c=>{
        const avg=c.avg_score==null?null:Math.round(+c.avg_score);
        return `<button onclick="openTcCard(${c.classroom_id},${c.subject_id??'null'})"
          style="text-align:left;background:#fff;border:2px solid #E2E8F0;border-radius:14px;padding:.85rem;cursor:pointer;font:inherit">
          <div style="font-weight:800;font-size:.95rem">${_tcCardTitle(c)}</div>
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin:.4rem 0">
            <span style="font-size:.78rem;color:var(--mu)">👦 ${c.student_count} คน</span>
            <span style="font-size:1.3rem;font-weight:900;color:${avg==null?'var(--mu)':scoreColor(avg)}">${avg==null?'–':avg+'%'}</span>
          </div>
          <div style="font-size:.78rem;color:${c.needs_attention?'#B91C1C':'#047857'};font-weight:700">
            ${c.needs_attention?`🔴 ต้องดูแล ${c.needs_attention} คน`:'🟢 ทุกคนไปได้ดี'}</div>
          <div style="font-size:.72rem;color:var(--mu);margin-top:.2rem">เล่นล่าสุด ${c.last_played?new Date(c.last_played).toLocaleDateString('th-TH'):'–'}</div>
        </button>`;
      }).join('')||'<div style="color:var(--mu)">ยังไม่มีห้องเรียน</div>'}
    </div>
    <div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.75rem">
      <button class="child-btn" onclick="addTcRoom()">➕ เพิ่มห้องทุกชั้น</button>
      <button class="child-btn" onclick="deleteTcRoom()">🗑️ ลบห้องสุดท้ายทุกชั้น</button>
    </div>`;
}

async function openTcCard(classroomId, subjectId){
  const book=document.getElementById('tc-gradebook');
  document.getElementById('tc-history').style.display='none';
  book.style.display='block';
  book.innerHTML='<div style="color:var(--mu)">⏳ กำลังโหลดสมุดคะแนน...</div>';
  const res=await apiTeacherGradebook(classroomId, subjectId).catch(()=>({ok:false}));
  if(!res.ok){book.innerHTML=`<div style="color:#EF4444">${res.error||'โหลดสมุดคะแนนไม่สำเร็จ'}</div>`;return;}
  const cells={};
  res.cells.forEach(c=>{(cells[c.student_id] ||= {})[c.col]=Math.round(+c.val);});
  const room=A.tcClassrooms.find(r=>r.classroom_id==classroomId)||{};
  const subject=subjectId?A.tcSubjects.find(s=>s.subject_id==subjectId):null;
  A.tcSubject=subjectId;
  A.tcBook={...res, cells, classroom_id:classroomId, subject_id:subjectId,
    title:_tcCardTitle({...room, subject_id:subjectId, subject_name:subject?.subject_name, icon:subject?.icon})};
  book.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.6rem">
      <h3 style="margin:0">📒 สมุดคะแนน ${A.tcBook.title}</h3>
      <button class="btn btn-sm" onclick="closeTcCard()">✕ ปิด</button>
    </div>
    <div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;margin-bottom:.5rem">
      <input class="fc" style="flex:1;min-width:150px" placeholder="🔍 ค้นหาชื่อนักเรียน" value="${_esc(A.tcBookView.search)}"
        oninput="A.tcBookView.search=this.value;_renderTcBookRows()">
      <select class="fc" style="width:auto" onchange="A.tcBookView.sort=this.value;_renderTcBookRows()">
        ${[['name','เรียงตามชื่อ'],['avg_asc','คะแนนน้อย → มาก'],['avg_desc','คะแนนมาก → น้อย'],['recent','เล่นล่าสุด']]
          .map(([v,l])=>`<option value="${v}"${A.tcBookView.sort===v?' selected':''}>${l}</option>`).join('')}
      </select>
      <label style="font-size:.82rem;cursor:pointer"><input type="checkbox"${A.tcBookView.attentionOnly?' checked':''}
        onchange="A.tcBookView.attentionOnly=this.checked;_renderTcBookRows()"> เฉพาะคนที่ต้องดูแล</label>
    </div>
    <div style="font-size:.72rem;color:var(--mu);margin-bottom:.5rem">🔴 ต้องดูแล = คะแนนเฉลี่ยต่ำกว่า ${res.attention_rule.min_score}% หรือไม่ได้เล่นเกิน ${res.attention_rule.inactive_days} วัน ·
      ช่องในตาราง = ${subjectId?'คะแนนดีที่สุดของแต่ละเกม':'คะแนนเฉลี่ยของแต่ละวิชา'} · กดชื่อเพื่อดูประวัติ</div>
    <div id="tc-book-rows"></div>`;
  _renderTcBookRows();
  book.scrollIntoView({behavior:'smooth',block:'start'});
}

function closeTcCard(){
  A.tcBook=null;
  A.tcStudent=null;
  document.getElementById('tc-gradebook').style.display='none';
  document.getElementById('tc-history').style.display='none';
}

function _renderTcBookRows(){
  const el=document.getElementById('tc-book-rows');
  if(!el||!A.tcBook)return;
  const {columns,cells,students}=A.tcBook, v=A.tcBookView;
  const q=v.search.trim().toLowerCase();
  const avg=s=>s.avg_score==null?-1:+s.avg_score;
  const sorters={name:(a,b)=>a.full_name.localeCompare(b.full_name,'th'), avg_asc:(a,b)=>avg(a)-avg(b),
    avg_desc:(a,b)=>avg(b)-avg(a), recent:(a,b)=>new Date(b.last_played||0)-new Date(a.last_played||0)};
  const rows=students.filter(s=>(!q||s.full_name.toLowerCase().includes(q))&&(!v.attentionOnly||s.needs_attention)).sort(sorters[v.sort]);
  const cell=val=>val==null?'<span style="color:#CBD5E1">–</span>'
    :`<span style="display:inline-block;min-width:2.4rem;padding:.15rem .35rem;border-radius:6px;font-weight:700;color:#fff;background:${scoreColor(val)}">${val}</span>`;
  const th='padding:.5rem .6rem;white-space:nowrap;font-weight:700';
  const sticky='position:sticky;left:0;z-index:1';
  el.innerHTML=`<div style="font-size:.78rem;color:var(--mu);margin-bottom:.35rem">แสดง ${rows.length} จาก ${students.length} คน ·
      ต้องดูแล ${students.filter(s=>s.needs_attention).length} คน</div>
    <div style="overflow-x:auto;border:1px solid #E2E8F0;border-radius:10px">
    <table style="border-collapse:collapse;font-size:.8rem;width:100%">
      <thead><tr style="background:#F1F5F9;color:#334155">
        <th style="${th};${sticky};background:#F1F5F9;color:#334155;text-align:left">นักเรียน</th>
        ${columns.map(c=>`<th style="${th};max-width:7rem;overflow:hidden;text-overflow:ellipsis" title="${_esc(c.name)}">${c.icon||''} ${_esc(c.name)}</th>`).join('')}
        <th style="${th}">เฉลี่ย</th><th style="${th}">เล่นล่าสุด</th>
      </tr></thead>
      <tbody>${rows.map(s=>{
        const bg=A.tcStudent==s.student_id?'#EEF2FF':'#fff';
        return `<tr style="border-top:1px solid #F1F5F9;cursor:pointer;background:${bg}" onclick="selectTcStudent(${s.student_id})">
        <td style="padding:.45rem .6rem;${sticky};background:${bg};white-space:nowrap;font-weight:600">${s.needs_attention?'🔴 ':''}${_esc(s.full_name)}</td>
        ${columns.map(c=>`<td style="padding:.45rem .6rem;text-align:center">${cell(cells[s.student_id]?.[c.id])}</td>`).join('')}
        <td style="padding:.45rem .6rem;text-align:center">${cell(s.avg_score==null?null:Math.round(+s.avg_score))}</td>
        <td style="padding:.45rem .6rem;text-align:center;white-space:nowrap;color:var(--mu)">${s.last_played?new Date(s.last_played).toLocaleDateString('th-TH'):'ยังไม่เคยเล่น'}</td>
      </tr>`;}).join('')||`<tr><td colspan="${columns.length+3}" style="padding:1rem;text-align:center;color:var(--mu)">ไม่พบนักเรียน</td></tr>`}</tbody>
    </table></div>`;
}


// ════════ SCORES ════════
async function _applyTcRoomChange(req,failMsg){
  const res=await req().catch(()=>({ok:false}));
  if(!res.ok){alert(res.error||failMsg);return;}
  loadTeach();
}
function addTcRoom(){
  if(!confirm('เพิ่มห้องใหม่ให้ทุกระดับชั้น (ป.1–ป.6)?'))return;
  _applyTcRoomChange(apiAddClassroom,'เพิ่มห้องไม่สำเร็จ');
}
function deleteTcRoom(){
  const last=Math.max(0,...A.tcClassrooms.map(r=>r.room_no));
  if(!confirm(`ลบห้องที่ ${last} ของทุกระดับชั้น? (ลบได้เฉพาะห้องที่ไม่มีนักเรียน)`))return;
  _applyTcRoomChange(apiDeleteClassroom,'ลบห้องไม่สำเร็จ');
}
async function selectTcStudent(sid){
  A.tcStudent=sid;
  _renderTcBookRows();
  const hist=document.getElementById('tc-history');
  if(!hist)return;
  hist.style.display='block';

  hist.innerHTML='<div style="color:var(--mu);padding:.5rem">⏳ กำลังโหลด...</div>';
  // ส่ง student_id (จาก students table) ไป API
  const res=await apiStudentScores(sid,A.tcSubject||null).catch(()=>({ok:false,scores:[]}));
  const sc=res.ok?(res.scores||[]):[];
  const stu=A.tcBook?.students.find(s=>s.student_id==sid)||A.tcStudents.find(s=>s.student_id==sid);

  if(!sc.length){
    hist.innerHTML=`<div style="text-align:center;padding:1.5rem;color:var(--mu)">
      <div style="font-size:2rem;margin-bottom:.4rem">🎮</div>
      <div style="font-weight:600">${stu?.full_name||'นักเรียน'} ยังไม่มีคะแนน${A.tcSubject?' ในวิชานี้':''}</div>
    </div>`;
    return;
  }

  const TYPE_LBL={mcq:'MCQ',truefalse:'จริง/เท็จ',fill:'เติมคำ',matching:'จับคู่',sequence:'เรียงลำดับ',letterorder:'เรียงตัวอักษร',wordsearch:'Search'};
  // สรุปรายวิชา
  const bySub={};
  sc.forEach(s=>{
    const k=s.subject_name||'อื่นๆ';
    if(!bySub[k])bySub[k]={plays:0,total:0,totalMax:0};
    bySub[k].plays++;bySub[k].total+=(+s.score||0);bySub[k].totalMax+=(+s.max_score||100);
  });
  const sumHtml=Object.entries(bySub).map(([n,d])=>{
    const avg=d.totalMax?Math.round(d.total/d.totalMax*100):0,c=avg>=80?'#10B981':avg>=50?'#F59E0B':'#EF4444';
    return `<div style="display:flex;align-items:center;gap:.6rem;padding:.3rem 0">
      <div style="font-size:.8rem;color:#374151;min-width:100px">${n}</div>
      <div style="flex:1;height:7px;background:#E2E8F0;border-radius:4px">
        <div style="width:${avg}%;height:100%;background:${c};border-radius:4px"></div>
      </div>
      <div style="font-weight:700;color:${c};font-size:.82rem;min-width:40px;text-align:right">${avg}%</div>
      <div style="font-size:.72rem;color:var(--mu);min-width:48px">${d.plays} ครั้ง</div>
    </div>`;
  }).join('');

  // Group by subject for table
  const groups={};
  sc.forEach(s=>{
    const k=s.subject_name||'อื่นๆ';
    if(!groups[k])groups[k]={name:k,plays:0,totalScore:0,totalMax:0,time:0,best:0,rows:[]};
    const score=+s.score||0,max=+s.max_score||100;
    groups[k].plays++;groups[k].totalScore+=score;groups[k].totalMax+=max;
    groups[k].time+=+s.time_spent||0;
    groups[k].best=Math.max(groups[k].best,Math.round(score/max*100));
    groups[k].rows.push(s);
  });
  const tableRows=Object.values(groups).map(g=>({...g,avg:g.totalMax?Math.round(g.totalScore/g.totalMax*100):0})).map(group=>{
    const header=`<tr><td colspan="4" style="background:#F8FAFC;padding:.75rem 1rem;border-bottom:1px solid #E2E8F0">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:.5rem">
        <div><strong style="font-size:.88rem">${group.name}</strong>
          <div style="font-size:.73rem;color:var(--mu)">เล่น ${group.plays} ครั้ง • เฉลี่ย ${group.avg}% • Best ${group.best}%</div>
        </div>
        <div style="font-size:.76rem;color:#475569">${Math.round(group.time/60)} นาที</div>
      </div></td></tr>`;
    const rows=group.rows.sort((a,b)=>new Date(b.played_at||0)-new Date(a.played_at||0)).map(s=>{
      const pct=Math.round((+s.score||0)/(+s.max_score||100)*100),c=pct>=80?'#065F46':pct>=50?'#92400E':'#991B1B';
      return `<tr style="border-bottom:1px solid #F1F5F9">
        <td style="padding:.5rem .75rem">${s.game_name||'—'}<br><span style="font-size:.7rem;color:var(--mu)">${TYPE_LBL[s.game_type]||''}</span></td>
        <td style="padding:.5rem .75rem;text-align:center">
          <strong style="color:${c}">${pct}%</strong><span style="color:#9CA3AF"> (${s.score}/${s.max_score||100})</span>
          ${pct>=80?' ⭐⭐⭐':pct>=50?' ⭐⭐':pct>0?' ⭐':''}
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
      <thead><tr style="background:#1E3A5F;color:#fff">
        <th style="padding:.5rem .75rem;text-align:left">เกม</th>
        <th style="padding:.5rem .75rem;text-align:center">คะแนน</th>
        <th style="padding:.5rem .75rem;text-align:center">เวลา</th>
        <th style="padding:.5rem .75rem;text-align:left">วันที่</th>
      </tr></thead>
      <tbody>${tableRows}</tbody>
    </table></div>`;
}

// ════════ LESSON EDITOR ════════
function _renderLessonEditor(){
  const panel=document.getElementById('tc-lesson-panel');
  if(!panel)return;

  const subHtml=[1,2,3,4,5,6].map(sid=>{
    const sub=SUBS.find(s=>s.id===sid);
    if(!sub)return'';
    const games=Object.values(GAMES_DB).filter(g=>g.sid===sid);
    return `<div style="margin-bottom:1rem">
      <div style="font-weight:800;font-size:.82rem;color:${sub.color};margin-bottom:.35rem;display:flex;align-items:center;gap:.35rem">
        <span>${sub.icon}</span>${sub.name}
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:.3rem">
        ${games.map(gm=>{
          const hasC=(_edHasContent||{})[gm.id];
          return `<button class="ed-game-btn${_edGid===gm.id?' active':''}"
            onclick="selectEdGame('${gm.id}')"
            style="font-size:.72rem;padding:.3rem .55rem;border-radius:8px;border:1.5px solid ${_edGid===gm.id?'var(--s)':'#E5E7EB'};
              background:${_edGid===gm.id?'var(--s)':hasC?'#F0FDF4':'#fff'};
              color:${_edGid===gm.id?'#fff':'var(--tx)'};cursor:pointer;
              font-family:'Kanit',sans-serif;transition:all .15s;position:relative">
            ${gm.icon} ${gm.name}
            ${hasC?'<span style="position:absolute;top:-4px;right:-4px;width:8px;height:8px;border-radius:50%;background:#10B981"></span>':''}
          </button>`;
        }).join('')}
      </div></div>`;
  }).join('');

  panel.innerHTML=`
    <div style="display:grid;grid-template-columns:260px 1fr;gap:1rem;min-height:500px" id="ed-grid">
      <!-- ซ้าย: เลือกเกม -->
      <div class="ts" style="max-height:75vh;overflow-y:auto;padding-right:.3rem">
        <div style="font-weight:800;font-size:.88rem;color:var(--s);margin-bottom:.85rem">
          📚 เลือกบทเรียนที่ต้องการแก้ไข
        </div>
        <div style="font-size:.72rem;color:var(--mu);margin-bottom:.75rem;display:flex;align-items:center;gap:.4rem">
          <span style="width:8px;height:8px;border-radius:50%;background:#10B981;display:inline-block"></span>มีเนื้อหาแล้ว
        </div>
        ${subHtml}
      </div>
      <!-- ขวา: editor -->
      <div id="tc-editor-form">
        <div style="display:flex;align-items:center;justify-content:center;height:300px;color:var(--mu);flex-direction:column;gap:.75rem">
          <div style="font-size:2.5rem">📝</div>
          <div style="font-weight:600">เลือกบทเรียนจากรายการทางซ้าย</div>
        </div>
      </div>
    </div>`;

  // responsive: stack ถ้าหน้าจอแคบ
  const grid=document.getElementById('ed-grid');
  if(grid&&window.innerWidth<768) grid.style.gridTemplateColumns='1fr';

  if(_edGid) selectEdGame(_edGid);
}

async function selectEdGame(jsKey){
  _edGid=jsKey;
  _edDbGid=await resolveGameDbId(jsKey);

  // อัป active state ปุ่ม
  document.querySelectorAll('.ed-game-btn').forEach(b=>{
    const isA=(b.getAttribute('onclick')||'').includes(`'${jsKey}'`);
    const gid=b.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
    const hasC=(_edHasContent||{})[gid];
    b.classList.toggle('active',isA);
    b.style.background=isA?'var(--s)':hasC?'#F0FDF4':'#fff';
    b.style.color=isA?'#fff':'var(--tx)';
    b.style.border=`1.5px solid ${isA?'var(--s)':'#E5E7EB'}`;
  });

  const form=document.getElementById('tc-editor-form');
  if(!form)return;
  form.innerHTML='<div style="color:var(--mu);padding:2rem;text-align:center">⏳ กำลังโหลด...</div>';

  let title='',body='',summary='',readTime=5,canEdit=true,canDelete=true,updatedAt=null;
  try{
    const res=await apiLessonContent(_edDbGid,1);
    if(res.ok&&res.content){
      title=res.content.title||'';
      body=res.content.body||'';
      summary=res.content.summary||'';
      readTime=res.content.read_time||5;
      canEdit=res.content.can_edit!==false;
      canDelete=res.content.can_delete!==false;
      updatedAt=res.content.updated_at||null;
    }
  }catch(e){}

  const gm=GAMES_DB[jsKey],sub=SUBS.find(s=>s.id===gm.sid);
  const hasCon=!!title;
  if(!_edHasContent) _edHasContent={};
  _edHasContent[jsKey]=hasCon;

  // ---- toolbar HTML ----
  const toolbarHtml=`
    <div style="display:flex;gap:.3rem;flex-wrap:wrap;background:#F8FAFF;border:1px solid #E2E8F0;
      border-radius:10px 10px 0 0;padding:.5rem .7rem;border-bottom:none">
      <button type="button" onclick="edFmt('bold')"      title="ตัวหนา"     class="ed-tb">𝐁</button>
      <button type="button" onclick="edFmt('italic')"    title="ตัวเอียง"   class="ed-tb"><em>I</em></button>
      <button type="button" onclick="edFmt('underline')" title="ขีดเส้นใต้" class="ed-tb"><u>U</u></button>
      <div style="width:1px;background:#E2E8F0;margin:0 .2rem"></div>
      <button type="button" onclick="edInsH(2)"  title="หัวข้อใหญ่" class="ed-tb">H2</button>
      <button type="button" onclick="edInsH(3)"  title="หัวข้อเล็ก" class="ed-tb">H3</button>
      <div style="width:1px;background:#E2E8F0;margin:0 .2rem"></div>
      <button type="button" onclick="edInsList('ul')" title="รายการ"       class="ed-tb">≡</button>
      <button type="button" onclick="edInsList('ol')" title="รายการตัวเลข" class="ed-tb">1.</button>
      <div style="width:1px;background:#E2E8F0;margin:0 .2rem"></div>
      <button type="button" onclick="edInsTable()" title="ตาราง" class="ed-tb">⊞</button>
      <button type="button" onclick="edInsHighlight()" title="ไฮไลท์" class="ed-tb" style="background:#FEF3C7">HL</button>
      <button type="button" onclick="edInsImg()" title="รูปภาพ" class="ed-tb">🖼</button>
      <div style="width:1px;background:#E2E8F0;margin:0 .2rem"></div>
      <button type="button" onclick="edTogglePreview()" id="ed-prev-btn" title="ดูตัวอย่าง"
        style="margin-left:auto;background:#EEF2FF;color:var(--s);border-color:#C7D2FE">👁 Preview</button>
    </div>`;

  form.innerHTML=`
    <div class="ts">
      <!-- header -->
      <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:1rem;padding:.75rem 1rem;
        background:linear-gradient(135deg,${sub.color}15,${sub.color}08);border-radius:12px;
        border-left:4px solid ${sub.color}">
        <span style="font-size:1.6rem">${gm.icon}</span>
        <div style="flex:1">
          <div style="font-weight:800;font-size:.95rem">${gm.name}</div>
          <div style="font-size:.73rem;color:var(--mu)">${sub?.name||''} · ${gm.type}</div>
          <div style="font-size:.72rem;color:var(--mu);margin-top:.2rem">แก้ไขล่าสุด ${formatDateTimeTH(updatedAt)}</div>
        </div>
        ${hasCon
          ?'<span style="font-size:.72rem;background:#DCFCE7;color:#166534;padding:.22rem .65rem;border-radius:99px;font-weight:700">✅ มีเนื้อหาแล้ว</span>'
          :'<span style="font-size:.72rem;background:#FEF3C7;color:#92400E;padding:.22rem .65rem;border-radius:99px;font-weight:700">⚠️ ยังไม่มีเนื้อหา</span>'}
      </div>

      <!-- meta fields -->
      <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:.65rem;margin-bottom:.75rem;align-items:end">
        <div>
          <label style="display:block;font-weight:700;font-size:.8rem;margin-bottom:.28rem">📌 ชื่อบทเรียน *</label>
          <input id="ed-title" type="text" class="fc" value="${_esc(title)}"
            placeholder="เช่น การบวกเลขหลักเดียว"
            style="padding:.6rem .85rem;font-size:.88rem">
        </div>
        <div>
          <label style="display:block;font-weight:700;font-size:.8rem;margin-bottom:.28rem">📝 สรุปสั้นๆ</label>
          <input id="ed-summary" type="text" class="fc" value="${_esc(summary)}"
            placeholder="สรุปเนื้อหา 1-2 บรรทัด"
            style="padding:.6rem .85rem;font-size:.88rem">
        </div>
        <div>
          <label style="display:block;font-weight:700;font-size:.8rem;margin-bottom:.28rem">⏱ นาที</label>
          <input id="ed-readtime" type="number" min="1" max="60" class="fc" value="${readTime}"
            style="width:72px;padding:.6rem .8rem;font-size:.88rem;text-align:center">
        </div>
      </div>

      <!-- editor area (split layout) -->
      <div id="ed-split" style="display:grid;grid-template-columns:1fr;gap:.75rem">
        <!-- textarea + toolbar -->
        <div>
          <label style="display:block;font-weight:700;font-size:.8rem;margin-bottom:.28rem">
            📄 เนื้อหา (HTML)
            <span style="font-weight:400;color:var(--mu);font-size:.73rem;margin-left:.4rem">
              รองรับแท็ก h2 h3 p ul ol table strong em
            </span>
          </label>
          ${toolbarHtml}
          <textarea id="ed-body"
            style="width:100%;height:320px;padding:.8rem;border:1.5px solid #E2E8F0;border-radius:0 0 10px 10px;
              font-size:.82rem;font-family:monospace;resize:vertical;line-height:1.7;outline:none;
              border-top:none"
            onfocus="this.style.borderColor='var(--s)'"
            onblur="this.style.borderColor='#E2E8F0'"
            oninput="edAutoPreview()"
          >${_esc(body)}</textarea>
        </div>
        <!-- preview pane (hidden by default) -->
        <div id="ed-preview-pane" style="display:none">
          <label style="display:block;font-weight:700;font-size:.8rem;margin-bottom:.28rem">👁 ตัวอย่าง</label>
          <div id="ed-preview-content" class="content-body"
            style="min-height:200px;border:1.5px dashed #C7D2FE;border-radius:10px;padding:1.1rem"></div>
        </div>
      </div>

      <!-- action bar -->
      <div style="display:flex;gap:.6rem;align-items:center;margin-top:.85rem;flex-wrap:wrap;
        padding:.75rem 1rem;background:#F8FAFF;border-radius:10px;border:1px solid #E5E7EB">
        <button class="lp-btn-play" style="padding:.6rem 1.4rem;font-size:.88rem" onclick="saveLesson()">
          💾 บันทึกบทเรียน
        </button>
        <button class="btn btn-sm" onclick="edClearAll()"
          style="background:#F9FAFB;color:var(--mu);border:1px solid #E5E7EB">
          🗑 ล้างเนื้อหา
        </button>
        ${hasCon&&canDelete?`<button class="btn btn-sm" onclick="deleteLesson()"
          style="background:#FEE2E2;color:#991B1B;border:1px solid #FCA5A5">
          ❌ ลบบทเรียนนี้
        </button>`:''}
        <button class="btn btn-sm" onclick="edInsTemplate()" style="margin-left:auto;background:#EEF2FF;color:var(--s);border:1px solid #C7D2FE">
          📋 ใส่เทมเพลต
        </button>
        <div id="ed-msg" style="font-size:.85rem;min-width:120px"></div>
      </div>
    </div>`;

  if(!canEdit){
    form.insertAdjacentHTML('afterbegin','<div style="padding:.7rem 1rem;margin-bottom:.75rem;border-radius:10px;background:#FEF3C7;color:#92400E;font-size:.82rem">ดูได้อย่างเดียว เพราะเนื้อหานี้เป็นของผู้ใช้อื่น</div>');
    form.querySelectorAll('input,textarea,select,button').forEach(control=>control.disabled=true);
  }

  // ใส่ style toolbar button ถ้ายังไม่มี
  if(!document.getElementById('ed-tb-style')){
    const st=document.createElement('style');
    st.id='ed-tb-style';
    st.textContent=`.ed-tb{background:#fff;border:1px solid #E2E8F0;border-radius:6px;padding:.28rem .55rem;
      font-size:.82rem;font-weight:700;cursor:pointer;font-family:'Kanit',sans-serif;
      transition:background .12s;color:var(--tx);line-height:1.4}
    .ed-tb:hover{background:#EEF2FF;border-color:#A5B4FC;color:var(--s)}`;
    document.head.appendChild(st);
  }
}

// ── Toolbar helpers ──
function _edTA(){ return document.getElementById('ed-body'); }
function _edIns(before,after=''){
  const ta=_edTA();if(!ta)return;
  const s=ta.selectionStart,e=ta.selectionEnd,v=ta.value;
  const sel=v.slice(s,e)||'ข้อความ';
  ta.value=v.slice(0,s)+before+sel+after+v.slice(e);
  ta.selectionStart=s+before.length;
  ta.selectionEnd=s+before.length+sel.length;
  ta.focus();edAutoPreview();
}
function edFmt(cmd){
  const m={bold:['<strong>','</strong>'],italic:['<em>','</em>'],underline:['<u>','</u>']};
  if(m[cmd])_edIns(m[cmd][0],m[cmd][1]);
}
function edInsH(n){_edIns(`<h${n}>`,[`</h${n}>`]);}
function edInsList(t){
  const ta=_edTA();if(!ta)return;
  const item=t==='ol'?'<li>ข้อ 1</li>\n  <li>ข้อ 2</li>':'<li>รายการ 1</li>\n  <li>รายการ 2</li>';
  const html=`\n<${t}>\n  ${item}\n</${t}>\n`;
  const p=ta.selectionStart;ta.value=ta.value.slice(0,p)+html+ta.value.slice(p);ta.focus();edAutoPreview();
}
function edInsTable(){
  const html=`\n<table>\n  <tr><th>หัวข้อ 1</th><th>หัวข้อ 2</th></tr>\n  <tr><td>ข้อมูล 1</td><td>ข้อมูล 2</td></tr>\n  <tr><td>ข้อมูล 3</td><td>ข้อมูล 4</td></tr>\n</table>\n`;
  const ta=_edTA();if(!ta)return;const p=ta.selectionStart;
  ta.value=ta.value.slice(0,p)+html+ta.value.slice(p);ta.focus();edAutoPreview();
}
function edInsHighlight(){_edIns('<mark>','</mark>');}
function edInsImg(){
  const src=prompt('URL หรือ path รูปภาพ (เช่น images/math.jpg)','');
  if(!src)return;
  const alt=prompt('คำอธิบายรูป','ภาพประกอบ')||'ภาพประกอบ';
  _edIns(`<img src="${src}" alt="${alt}" style="max-width:100%;border-radius:8px;margin:.5rem 0">`,'');
}
function edInsTemplate(){
  const gm=GAMES_DB[_edGid];
  const tmpl=`<h2>${gm?.name||'ชื่อบทเรียน'}</h2>\n<p>เนื้อหาหลักของบทเรียนนี้ อธิบายแนวคิดสำคัญ...</p>\n\n<h3>📌 สิ่งที่จะได้เรียนรู้</h3>\n<ul>\n  <li>เนื้อหาที่ 1</li>\n  <li>เนื้อหาที่ 2</li>\n  <li>เนื้อหาที่ 3</li>\n</ul>\n\n<h3>💡 ตัวอย่าง</h3>\n<p>อธิบายตัวอย่างที่ชัดเจน...</p>\n\n<h3>📝 สรุป</h3>\n<p>สรุปประเด็นสำคัญของบทเรียน...</p>`;
  const ta=_edTA();if(!ta)return;
  if(ta.value.trim()&&!confirm('แทนที่เนื้อหาปัจจุบันด้วยเทมเพลต?'))return;
  ta.value=tmpl;ta.focus();edAutoPreview();
}
function edClearAll(){
  if(!confirm('ล้างเนื้อหาทั้งหมดในช่องนี้?'))return;
  const ta=_edTA();if(ta){ta.value='';ta.focus();edAutoPreview();}
}
let _edPrevOpen=false;
function edTogglePreview(){
  const pane=document.getElementById('ed-preview-pane');
  const split=document.getElementById('ed-split');
  const btn=document.getElementById('ed-prev-btn');
  if(!pane)return;
  _edPrevOpen=!_edPrevOpen;
  pane.style.display=_edPrevOpen?'block':'none';
  if(_edPrevOpen){
    edAutoPreview();
    if(split)split.style.gridTemplateColumns='1fr 1fr';
    if(btn)btn.textContent='✖ ปิด Preview';
  }else{
    if(split)split.style.gridTemplateColumns='1fr';
    if(btn)btn.textContent='👁 Preview';
  }
}
function edAutoPreview(){
  if(!_edPrevOpen)return;
  const ta=_edTA(),pv=document.getElementById('ed-preview-content');
  if(ta&&pv)pv.innerHTML=ta.value||'<span style="color:var(--mu)">ยังไม่มีเนื้อหา...</span>';
}

// compat: เก็บข้อมูลว่าเกมไหนมีเนื้อหา
let _edHasContent={};

async function deleteLesson(){
  if(!confirm('ยืนยันลบเนื้อหาบทเรียนนี้?'))return;
  const res=await apiDeleteLesson({game_id:_edDbGid,lesson_no:1});
  if(res.ok){_edHasContent[_edGid]=false;selectEdGame(_edGid);}
}
function _esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function _renderTcTabs(){
  const wrap=document.getElementById('tc-tabs');
  if(!wrap)return;
  wrap.innerHTML=`
    <button class="rec-tab${A.tcTab==='scores'?' active':''}"  onclick="switchTcTab('scores')">คะแนนนักเรียน</button>
    <button class="rec-tab${A.tcTab==='plans'?' active':''}"   onclick="switchTcTab('plans')">แผนรายสัปดาห์</button>
    <button class="rec-tab${A.tcTab==='lessons'?' active':''}" onclick="switchTcTab('lessons')">แก้ไขบทเรียน</button>
    <button class="rec-tab${A.tcTab==='games'?' active':''}"   onclick="switchTcTab('games')">แก้ไขเกม</button>`;
  const scorePanel=document.getElementById('tc-score-panel');
  const lessonPanel=document.getElementById('tc-lesson-panel');
  const gamePanel=document.getElementById('tc-game-panel');
  const planPanel=document.getElementById('tc-plan-panel');
  if(scorePanel) scorePanel.style.display=A.tcTab==='scores'?'block':'none';
  if(lessonPanel) lessonPanel.style.display=A.tcTab==='lessons'?'block':'none';
  if(gamePanel) gamePanel.style.display=A.tcTab==='games'?'block':'none';
  if(planPanel) planPanel.style.display=A.tcTab==='plans'?'block':'none';
}

function switchTcTab(tab){
  A.tcTab=tab;
  _renderTcTabs();
  if(tab==='plans') renderTcPlanPanel();
  if(tab==='lessons') _renderLessonEditor();
  if(tab==='games') _renderGameEditor();
}

function ensureTcPlanPanel(){
  const teach=document.getElementById('s-teach');
  if(!teach || document.getElementById('tc-plan-panel')) return;
  const panel=document.createElement('div');
  panel.id='tc-plan-panel';
  panel.style.display='none';
  const lessonPanel=document.getElementById('tc-lesson-panel');
  if(lessonPanel) lessonPanel.parentNode.insertBefore(panel, lessonPanel);
  else teach.appendChild(panel);
}



async function saveLesson(status='draft'){
  const title=document.getElementById('ed-title')?.value.trim();
  const body=document.getElementById('ed-body')?.value.trim();
  const summary=document.getElementById('ed-summary')?.value.trim();
  const readTime=parseInt(document.getElementById('ed-readtime')?.value)||5;
  const msg=document.getElementById('ed-msg');
  if(!title){if(msg)msg.innerHTML='<span style="color:#EF4444">ใส่ชื่อบทเรียนด้วย</span>';return;}
  if(msg)msg.innerHTML='<span style="color:var(--mu)">กำลังบันทึก...</span>';
  const res=await apiSaveLesson({game_id:_edDbGid,lesson_no:1,title,body,summary,read_time:readTime,status}).catch(()=>({ok:false,error:'เชื่อมต่อไม่ได้'}));
  if(res.ok){
    _edHasContent[_edGid]=true;
    if(msg)msg.innerHTML=`<span style="color:#10B981">บันทึก${status==='published'?'และเผยแพร่':'ฉบับร่าง'}สำเร็จ</span>`;
    setTimeout(()=>{if(msg)msg.innerHTML='';},3000);
    selectEdGame(_edGid);
  }else{
    if(msg)msg.innerHTML=`<span style="color:#EF4444">${res.error||'ไม่สำเร็จ'}</span>`;
  }
}

const _origSelectEdGame = selectEdGame;
selectEdGame = async function(jsKey){
  await _origSelectEdGame(jsKey);
  enhanceLessonEditorWorkflow();
};

async function enhanceLessonEditorWorkflow(){
  const bar=document.querySelector('#tc-editor-form [id="ed-msg"]')?.parentElement;
  if(!bar || document.getElementById('ed-publish-btn')) return;
  const publishBtn=document.createElement('button');
  publishBtn.id='ed-publish-btn';
  publishBtn.className='btn btn-sm';
  publishBtn.textContent='เผยแพร่';
  publishBtn.style.cssText='background:#DCFCE7;color:#166534;border:1px solid #86EFAC';
  publishBtn.onclick=()=>saveLesson('published');
  bar.insertBefore(publishBtn, document.getElementById('ed-msg'));

  const historyBtn=document.createElement('button');
  historyBtn.className='btn btn-sm';
  historyBtn.textContent='ดูประวัติ';
  historyBtn.style.cssText='background:#F8FAFC;color:#334155;border:1px solid #CBD5E1';
  historyBtn.onclick=async()=>{
    const res=await apiLessonHistory(_edDbGid,1).catch(()=>({ok:false,history:[]}));
    const rows=res.ok?(res.history||[]):[];
    alert(rows.length ? rows.map(r=>`v${r.version_no} • ${r.status} • ${new Date(r.snapshot_at).toLocaleString('th-TH')}`).join('\n') : 'ยังไม่มีประวัติ');
  };
  bar.insertBefore(historyBtn, document.getElementById('ed-msg'));
}

if(typeof A.tcPlanStudents === 'undefined') A.tcPlanStudents = [];
if(typeof A.tcPlanFilter === 'undefined') A.tcPlanFilter = null;

function getSelectedTcPlanStudents(){
  const picked=[...new Set((A.tcPlanStudents||[]).map(x=>+x).filter(Boolean))];
  if(!picked.length && A.tcStudent) return [+A.tcStudent];
  return picked;
}

function toggleTcPlanStudent(studentId, checked){
  const sid=+studentId;
  const current=new Set(getSelectedTcPlanStudents());
  if(checked) current.add(sid);
  else current.delete(sid);
  A.tcPlanStudents=[...current];
}

function selectOnlyTcPlanStudent(studentId){
  const sid=+studentId;
  A.tcPlanStudents=sid?[sid]:[];
  A.tcPlanFilter=sid||null;
  if(sid) A.tcStudent=sid;
  renderTcPlanPanel();
}

function selectAllTcPlanStudents(){
  A.tcPlanStudents=(A.tcStudents||[]).map(s=>+s.student_id).filter(Boolean);
  renderTcPlanPanel();
}

function clearTcPlanStudents(){
  A.tcPlanStudents=[];
  renderTcPlanPanel();
}

function setTcPlanFilter(studentId){
  const sid=studentId?+studentId:null;
  A.tcPlanFilter=sid||null;
  if(sid) A.tcStudent=sid;
  renderTcPlanPanel();
}



const TC_PLAN_TEXT = {
  heading: '\u0e21\u0e2d\u0e1a\u0e2b\u0e21\u0e32\u0e22\u0e41\u0e1c\u0e19\u0e01\u0e32\u0e23\u0e40\u0e23\u0e35\u0e22\u0e19/\u0e20\u0e32\u0e23\u0e01\u0e34\u0e08\u0e23\u0e32\u0e22\u0e2a\u0e31\u0e1b\u0e14\u0e32\u0e2b\u0e4c',
  selectHint: '\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e19\u0e31\u0e01\u0e40\u0e23\u0e35\u0e22\u0e19\u0e43\u0e19\u0e2b\u0e19\u0e49\u0e32\u0e19\u0e35\u0e49\u0e44\u0e14\u0e49\u0e40\u0e25\u0e22',
  selectSubhint: '\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e17\u0e35\u0e25\u0e30\u0e04\u0e19\u0e2b\u0e23\u0e37\u0e2d\u0e2b\u0e25\u0e32\u0e22\u0e04\u0e19\u0e01\u0e47\u0e44\u0e14\u0e49 \u0e41\u0e25\u0e49\u0e27\u0e43\u0e0a\u0e49\u0e41\u0e1c\u0e19\u0e40\u0e14\u0e35\u0e22\u0e27\u0e01\u0e31\u0e19\u0e2a\u0e48\u0e07\u0e1e\u0e23\u0e49\u0e2d\u0e21\u0e01\u0e31\u0e19',
  selectAll: '\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14',
  clear: '\u0e25\u0e49\u0e32\u0e07\u0e17\u0e35\u0e48\u0e40\u0e25\u0e37\u0e2d\u0e01',
  allPlans: '\u0e14\u0e39\u0e17\u0e38\u0e01\u0e41\u0e1c\u0e19',
  viewPlan: '\u0e14\u0e39\u0e41\u0e1c\u0e19',
  noStudents: '\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e19\u0e31\u0e01\u0e40\u0e23\u0e35\u0e22\u0e19',
  noneSelected: '\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e44\u0e14\u0e49\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e19\u0e31\u0e01\u0e40\u0e23\u0e35\u0e22\u0e19\u0e2a\u0e33\u0e2b\u0e23\u0e31\u0e1a\u0e21\u0e2d\u0e1a\u0e2b\u0e21\u0e32\u0e22',
  readyPrefix: '\u0e1e\u0e23\u0e49\u0e2d\u0e21\u0e21\u0e2d\u0e1a\u0e2b\u0e21\u0e32\u0e22\u0e43\u0e2b\u0e49',
  people: '\u0e04\u0e19',
  titlePlaceholder: '\u0e40\u0e0a\u0e48\u0e19 \u0e17\u0e1a\u0e17\u0e27\u0e19\u0e04\u0e13\u0e34\u0e15\u0e2a\u0e31\u0e1b\u0e14\u0e32\u0e2b\u0e4c\u0e19\u0e35\u0e49',
  descPlaceholder: '\u0e2d\u0e18\u0e34\u0e1a\u0e32\u0e22\u0e40\u0e1b\u0e49\u0e32\u0e2b\u0e21\u0e32\u0e22\u0e2b\u0e23\u0e37\u0e2d\u0e04\u0e33\u0e41\u0e19\u0e30\u0e19\u0e33\u0e2a\u0e33\u0e2b\u0e23\u0e31\u0e1a\u0e1c\u0e39\u0e49\u0e1b\u0e01\u0e04\u0e23\u0e2d\u0e07',
  chooseGames: '\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e40\u0e01\u0e21\u0e2a\u0e33\u0e2b\u0e23\u0e31\u0e1a\u0e41\u0e1c\u0e19',
  viewingAll: '\u0e01\u0e33\u0e25\u0e31\u0e07\u0e14\u0e39\u0e41\u0e1c\u0e19\u0e02\u0e2d\u0e07\u0e19\u0e31\u0e01\u0e40\u0e23\u0e35\u0e22\u0e19\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14',
  viewingOne: '\u0e01\u0e33\u0e25\u0e31\u0e07\u0e14\u0e39\u0e41\u0e1c\u0e19\u0e02\u0e2d\u0e07',
  fallbackStudent: '\u0e19\u0e31\u0e01\u0e40\u0e23\u0e35\u0e22\u0e19\u0e17\u0e35\u0e48\u0e40\u0e25\u0e37\u0e2d\u0e01',
  assign: '\u0e21\u0e2d\u0e1a\u0e2b\u0e21\u0e32\u0e22\u0e41\u0e1c\u0e19',
  assigned: '\u0e41\u0e1c\u0e19\u0e17\u0e35\u0e48\u0e21\u0e2d\u0e1a\u0e2b\u0e21\u0e32\u0e22\u0e41\u0e25\u0e49\u0e27',
  noPlans: '\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e41\u0e1c\u0e19\u0e17\u0e35\u0e48\u0e21\u0e2d\u0e1a\u0e2b\u0e21\u0e32\u0e22',
  student: '\u0e19\u0e31\u0e01\u0e40\u0e23\u0e35\u0e22\u0e19',
  week: '\u0e2a\u0e31\u0e1b\u0e14\u0e32\u0e2b\u0e4c',
  due: '\u0e04\u0e23\u0e1a\u0e01\u0e33\u0e2b\u0e19\u0e14',
  chooseStudentAlert: '\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e19\u0e31\u0e01\u0e40\u0e23\u0e35\u0e22\u0e19\u0e2d\u0e22\u0e48\u0e32\u0e07\u0e19\u0e49\u0e2d\u0e22 1 \u0e04\u0e19',
  chooseGameAlert: '\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e40\u0e01\u0e21\u0e2d\u0e22\u0e48\u0e32\u0e07\u0e19\u0e49\u0e2d\u0e22 1 \u0e40\u0e01\u0e21',
  planTitle: '\u0e41\u0e1c\u0e19\u0e23\u0e32\u0e22\u0e2a\u0e31\u0e1b\u0e14\u0e32\u0e2b\u0e4c',
  networkError: '\u0e40\u0e0a\u0e37\u0e48\u0e2d\u0e21\u0e15\u0e48\u0e2d\u0e44\u0e21\u0e48\u0e44\u0e14\u0e49',
  createFailed: '\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e41\u0e1c\u0e19\u0e44\u0e21\u0e48\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08',
  createdPrefix: '\u0e21\u0e2d\u0e1a\u0e2b\u0e21\u0e32\u0e22\u0e41\u0e1c\u0e19\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08'
};

async function renderTcPlanPanel(){
  ensureTcPlanPanel();
  const panel=document.getElementById('tc-plan-panel');
  if(!panel) return;

  if((!A.tcPlanStudents || !A.tcPlanStudents.length) && A.tcStudent) A.tcPlanStudents=[+A.tcStudent];
  const filterId=A.tcPlanFilter || A.tcStudent || null;
  const plansRes=await apiStudentPlans(filterId).catch(()=>({ok:false,plans:[]}));
  const rows=plansRes.ok ? (plansRes.plans||[]) : [];
  const grouped={};
  rows.forEach(row=>{
    if(!grouped[row.plan_id]) grouped[row.plan_id]={...row,items:[]};
    if(row.item_id) grouped[row.plan_id].items.push(row);
  });

  const selectedStudentIds=getSelectedTcPlanStudents();
  const selectedStudentNames=selectedStudentIds.map(id=>(A.tcStudents||[]).find(s=>+s.student_id===+id)?.full_name).filter(Boolean);
  const selectedGames=Object.values(GAMES_DB).filter(g=>A.tcSubject?g.sid==A.tcSubject:true).slice(0,12);
  const planList=Object.values(grouped);

  panel.innerHTML=`
    <div class="ts">
      <h3>${TC_PLAN_TEXT.heading}</h3>
      <div style="margin-bottom:.75rem;padding:.75rem;border-radius:14px;background:#F8FAFC;border:1px solid #E2E8F0">
        <div style="display:flex;justify-content:space-between;gap:.75rem;align-items:center;flex-wrap:wrap">
          <div>
            <div style="font-size:.82rem;font-weight:800;color:#0F172A">${TC_PLAN_TEXT.selectHint}</div>
            <div style="font-size:.76rem;color:#64748B">${TC_PLAN_TEXT.selectSubhint}</div>
          </div>
          <div style="display:flex;gap:.45rem;flex-wrap:wrap">
            <button class="btn btn-sm" onclick="selectAllTcPlanStudents()">${TC_PLAN_TEXT.selectAll}</button>
            <button class="btn btn-sm" onclick="clearTcPlanStudents()">${TC_PLAN_TEXT.clear}</button>
            <button class="btn btn-sm" onclick="setTcPlanFilter(null)">${TC_PLAN_TEXT.allPlans}</button>
          </div>
        </div>
        <div style="margin-top:.7rem;display:flex;flex-wrap:wrap;gap:.5rem">
          ${(A.tcStudents||[]).map(student=>{
            const sid=+student.student_id;
            const checked=selectedStudentIds.includes(sid);
            const active=filterId===sid;
            return `
              <label style="display:flex;align-items:center;gap:.45rem;padding:.55rem .75rem;border:1px solid ${active?'#818CF8':'#CBD5E1'};border-radius:999px;background:${active?'#EEF2FF':'#fff'};cursor:pointer">
                <input type="checkbox" class="tc-plan-student" value="${sid}" ${checked?'checked':''} onchange="toggleTcPlanStudent(${sid}, this.checked)">
                <span style="font-weight:700;color:#0F172A">${student.full_name}</span>
                <button type="button" class="btn btn-sm" style="padding:.2rem .5rem" onclick="event.preventDefault();event.stopPropagation();selectOnlyTcPlanStudent(${sid})">${TC_PLAN_TEXT.viewPlan}</button>
              </label>`;
          }).join('') || `<div style="color:var(--mu)">${TC_PLAN_TEXT.noStudents}</div>`}
        </div>
        <div style="margin-top:.7rem;font-size:.78rem;color:${selectedStudentIds.length?'#166534':'#92400E'};font-weight:700">
          ${selectedStudentIds.length ? `${TC_PLAN_TEXT.readyPrefix} ${selectedStudentIds.length} ${TC_PLAN_TEXT.people}: ${selectedStudentNames.join(', ')}` : TC_PLAN_TEXT.noneSelected}
        </div>
      </div>
      <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:.75rem">
        <input id="tc-plan-title" class="fc" placeholder="${TC_PLAN_TEXT.titlePlaceholder}">
        <input id="tc-plan-week" class="fc" type="date" value="${new Date().toISOString().slice(0,10)}">
        <input id="tc-plan-due" class="fc" type="datetime-local">
      </div>
      <textarea id="tc-plan-desc" class="fc" style="margin-top:.75rem;min-height:88px" placeholder="${TC_PLAN_TEXT.descPlaceholder}"></textarea>
      <div style="margin-top:.75rem;font-size:.8rem;font-weight:700;color:var(--s)">${TC_PLAN_TEXT.chooseGames}</div>
      <div style="display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.5rem">
        ${selectedGames.map(g=>`
          <label style="display:flex;align-items:center;gap:.4rem;padding:.5rem .75rem;border:1px solid #E5E7EB;border-radius:999px;background:#fff">
            <input type="checkbox" class="tc-plan-game" value="${typeof jsKeyToDbId==='function' ? jsKeyToDbId(g.id) : parseInt(g.id,10)}">
            <span>${g.icon||'🎮'} ${g.name}</span>
          </label>`).join('')}
      </div>
      <div style="margin-top:.85rem;display:flex;justify-content:space-between;gap:.75rem;align-items:center;flex-wrap:wrap">
        <div style="font-size:.76rem;color:var(--mu)">${filterId ? `${TC_PLAN_TEXT.viewingOne} ${(A.tcStudents||[]).find(s=>+s.student_id===+filterId)?.full_name || TC_PLAN_TEXT.fallbackStudent}` : TC_PLAN_TEXT.viewingAll}</div>
        <button class="btn btn-p" onclick="submitWeeklyPlan()" ${selectedStudentIds.length?'':'disabled style="opacity:.55;cursor:not-allowed"'}>${TC_PLAN_TEXT.assign}</button>
      </div>
    </div>
    <div class="ts">
      <h3>${TC_PLAN_TEXT.assigned}</h3>
      ${planList.length?planList.map(plan=>`
        <div style="padding:.8rem 0;border-bottom:1px solid #F1F5F9">
          <div style="display:flex;justify-content:space-between;gap:.75rem;align-items:flex-start">
            <div>
              <strong>${plan.title}</strong>
              <div style="font-size:.76rem;color:#475569;margin-top:.2rem">${plan.student_name||TC_PLAN_TEXT.student} • ${TC_PLAN_TEXT.week} ${plan.week_start||'-'} ${plan.due_at?`• ${TC_PLAN_TEXT.due} ${new Date(plan.due_at).toLocaleDateString('th-TH')}`:''}</div>
            </div>
            <span class="badge" style="background:#EEF2FF;color:var(--s)">${plan.items.filter(i=>(+i.best_score||0) >= (+i.target_score||80)).length}/${plan.items.length}</span>
          </div>
          <div style="font-size:.78rem;color:#475569;margin-top:.35rem">${plan.description||''}</div>
          <div style="margin-top:.45rem;display:flex;flex-wrap:wrap;gap:.35rem">
            ${plan.items.map(item=>`<span class="badge" style="background:${(+item.best_score||0) >= (+item.target_score||80)?'#DCFCE7':'#FEF3C7'};color:${(+item.best_score||0) >= (+item.target_score||80)?'#166534':'#92400E'}">${item.game_name} ${item.best_score||0}/${item.target_score||80}</span>`).join('')}
          </div>
        </div>`).join(''):`<div style="color:var(--mu)">${TC_PLAN_TEXT.noPlans}</div>`}
    </div>`;
}

async function submitWeeklyPlan(){
  const selectedStudentIds=[...new Set([...[...document.querySelectorAll('.tc-plan-student:checked')].map(el=>+el.value), ...getSelectedTcPlanStudents()])].filter(Boolean);
  if(!selectedStudentIds.length){ alert(TC_PLAN_TEXT.chooseStudentAlert); return; }
  const title=document.getElementById('tc-plan-title')?.value.trim() || TC_PLAN_TEXT.planTitle;
  const description=document.getElementById('tc-plan-desc')?.value.trim() || '';
  const weekStart=document.getElementById('tc-plan-week')?.value || new Date().toISOString().slice(0,10);
  const dueAt=document.getElementById('tc-plan-due')?.value || '';
  const items=[...document.querySelectorAll('.tc-plan-game:checked')].map((el,idx)=>({ game_id:+el.value, lesson_no:1, target_score:80, sort_order:idx+1 }));
  if(!items.length){ alert(TC_PLAN_TEXT.chooseGameAlert); return; }

  A.tcPlanStudents=selectedStudentIds;
  const payload={ title, description, week_start:weekStart, due_at:dueAt, items };
  if(selectedStudentIds.length===1) payload.student_id=selectedStudentIds[0];
  else payload.student_ids=selectedStudentIds;

  const res=await apiCreatePlan(payload).catch(()=>({ok:false,error:TC_PLAN_TEXT.networkError}));
  if(!res.ok){ alert(res.error||TC_PLAN_TEXT.createFailed); return; }

  A.tcPlanFilter=selectedStudentIds.length===1 ? selectedStudentIds[0] : null;
  alert(`${TC_PLAN_TEXT.createdPrefix} ${res.created_count || selectedStudentIds.length} ${TC_PLAN_TEXT.people}`);
  renderTcPlanPanel();
}

// ════════ LESSON/GAME EDITOR WRAPPERS FOR OFFICER ════════
function _renderLessonEditorIn(targetPanelId) {
  // Temporarily alias the target panel as tc-lesson-panel, render, then restore id
  const target = document.getElementById(targetPanelId);
  if (!target) return;
  const orig = document.getElementById('tc-lesson-panel');
  if (orig && orig !== target) orig.id = '_tc-lesson-panel-hidden';
  target.id = 'tc-lesson-panel';
  _renderLessonEditor();
  target.id = targetPanelId;
  if (document.getElementById('_tc-lesson-panel-hidden'))
    document.getElementById('_tc-lesson-panel-hidden').id = 'tc-lesson-panel';
}

function _renderGameEditorIn(targetPanelId) {
  const target = document.getElementById(targetPanelId);
  if (!target) return;
  const orig = document.getElementById('tc-game-panel');
  if (orig && orig !== target) orig.id = '_tc-game-panel-hidden';
  target.id = 'tc-game-panel';
  _renderGameEditor();
  target.id = targetPanelId;
  if (document.getElementById('_tc-game-panel-hidden'))
    document.getElementById('_tc-game-panel-hidden').id = 'tc-game-panel';
}
