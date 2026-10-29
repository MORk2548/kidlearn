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
  const avgAll =total?Math.round(A.tcStudents.reduce((s,x)=>s+(+x.avg_score||0),0)/total):0;

  if(el) el.innerHTML=`
    <div class="stat"><div class="si">👦</div><div><div class="sv">${total}</div><div class="sl2">นักเรียน</div></div></div>
    <div class="stat"><div class="si">📚</div><div><div class="sv">${A.tcSubjects.length}</div><div class="sl2">วิชา</div></div></div>
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
  A.tcCards=cards;
  const el=document.getElementById('tc-cards');
  if(!el)return;
  const bySubject={};
  cards.forEach(c=>{
    const s=(bySubject[c.subject_id??'all'] ||= {title:c.subject_id?`${c.icon||'📚'} ${c.subject_name}`:'🏠 ทุกวิชา', grades:{}});
    (s.grades[c.grade||'—'] ||= []).push(c);
  });
  const subjects=Object.values(bySubject);
  const multi=subjects.length>1;
  const card=c=>{
    const avg=c.avg_score==null?null:Math.round(+c.avg_score);
    return `<button onclick="openTcCard(${c.classroom_id},${c.subject_id??'null'})"
      style="text-align:left;background:#fff;border:2px solid #E2E8F0;border-radius:14px;padding:.85rem;cursor:pointer;font:inherit">
      <div style="font-weight:800;font-size:.95rem">${multi?classLabel(c):_tcCardTitle(c)}</div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin:.4rem 0">
        <span style="font-size:.78rem;color:var(--mu)">👦 ${c.student_count} คน</span>
        <span style="font-size:1.3rem;font-weight:900;color:${avg==null?'var(--mu)':scoreColor(avg)}">${avg==null?'–':avg+'%'}</span>
      </div>
    </button>`;
  };
  el.innerHTML=`<h3>🏫 ห้องที่ฉันสอน</h3>
    ${subjects.map(s=>`
      ${multi?`<h4 style="margin:1rem 0 .4rem;font-size:1rem">${s.title}</h4>`:''}
      ${Object.entries(s.grades).map(([grade,list])=>`
        <div style="font-size:.82rem;font-weight:700;color:var(--mu);margin:.6rem 0 .35rem">${grade}</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:.6rem">
          ${list.map(card).join('')}
        </div>`).join('')}`).join('')||'<div style="color:var(--mu)">ยังไม่มีห้องเรียน</div>'}
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
      <div style="display:flex;gap:.4rem">
        <button class="btn btn-sm" onclick="exportTcBookCsv()">⬇️ ส่งออก CSV</button>
        <button class="btn btn-sm" onclick="closeTcCard()">✕ ปิด</button>
      </div>
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

function _tcBookVisibleRows(){
  const {students}=A.tcBook, v=A.tcBookView;
  const q=v.search.trim().toLowerCase();
  const avg=s=>s.avg_score==null?-1:+s.avg_score;
  const sorters={name:(a,b)=>a.full_name.localeCompare(b.full_name,'th'), avg_asc:(a,b)=>avg(a)-avg(b),
    avg_desc:(a,b)=>avg(b)-avg(a), recent:(a,b)=>new Date(b.last_played||0)-new Date(a.last_played||0)};
  return students.filter(s=>(!q||s.full_name.toLowerCase().includes(q))&&(!v.attentionOnly||s.needs_attention)).sort(sorters[v.sort]);
}

function exportTcBookCsv(){
  if(!A.tcBook)return;
  const {columns,cells}=A.tcBook;
  const q=v=>`"${String(v??'').replace(/"/g,'""')}"`;
  const lines=[
    ['นักเรียน',...columns.map(c=>c.name),'เฉลี่ย','เล่นล่าสุด','ต้องดูแล'],
    ..._tcBookVisibleRows().map(s=>[s.full_name,...columns.map(c=>cells[s.student_id]?.[c.id]),
      s.avg_score==null?'':Math.round(+s.avg_score),
      s.last_played?new Date(s.last_played).toLocaleDateString('th-TH'):'',
      s.needs_attention?'ใช่':'']),
  ].map(r=>r.map(q).join(','));
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob(['﻿'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}));
  a.download=`คะแนน ${A.tcBook.title.replace(/[\\/:*?"<>|]/g,'-')} ${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function _renderTcBookRows(){
  const el=document.getElementById('tc-book-rows');
  if(!el||!A.tcBook)return;
  const {columns,cells,students}=A.tcBook;
  const rows=_tcBookVisibleRows();
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

function _esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function _renderTcTabs(){
  const wrap=document.getElementById('tc-tabs');
  if(!wrap)return;
  wrap.innerHTML=`
    <button class="rec-tab${A.tcTab==='scores'?' active':''}"  onclick="switchTcTab('scores')">คะแนนนักเรียน</button>
    <button class="rec-tab${A.tcTab==='plans'?' active':''}"   onclick="switchTcTab('plans')">แผนรายสัปดาห์</button>`;
  const scorePanel=document.getElementById('tc-score-panel');
  const planPanel=document.getElementById('tc-plan-panel');
  if(scorePanel) scorePanel.style.display=A.tcTab==='scores'?'block':'none';
  if(planPanel) planPanel.style.display=A.tcTab==='plans'?'block':'none';
}

function switchTcTab(tab){
  A.tcTab=tab;
  _renderTcTabs();
  if(tab==='plans') renderTcPlanPanel();
}

function ensureTcPlanPanel(){
  const teach=document.getElementById('s-teach');
  if(!teach || document.getElementById('tc-plan-panel')) return;
  const panel=document.createElement('div');
  panel.id='tc-plan-panel';
  panel.style.display='none';
  teach.appendChild(panel);
}



async function renderTcPlanPanel(){
  ensureTcPlanPanel();
  const panel=document.getElementById('tc-plan-panel');
  if(!panel) return;
  const plansRes=await apiStudentPlans(A.tcStudent||null).catch(()=>({ok:false,plans:[]}));
  const grouped={};
  (plansRes.ok ? (plansRes.plans||[]) : []).forEach(row=>{
    if(!grouped[row.plan_id]) grouped[row.plan_id]={...row,items:[]};
    if(row.item_id) grouped[row.plan_id].items.push(row);
  });
  const planList=Object.values(grouped);
  panel.innerHTML=`
    <div class="ts">
      <h3>แผนที่มอบหมายแล้ว</h3>
      ${planList.length?planList.map(plan=>`
        <div style="padding:.8rem 0;border-bottom:1px solid #F1F5F9">
          <strong>${plan.title}</strong>
          <div style="font-size:.76rem;color:#475569;margin-top:.2rem">${plan.student_name||'นักเรียน'} • สัปดาห์ ${plan.week_start||'-'} ${plan.due_at?`• ครบกำหนด ${new Date(plan.due_at).toLocaleDateString('th-TH')}`:''}</div>
          <div style="font-size:.78rem;color:#475569;margin-top:.35rem">${plan.description||''}</div>
        </div>`).join(''):'<div style="color:var(--mu)">ยังไม่มีแผนที่มอบหมาย</div>'}
    </div>`;
}
