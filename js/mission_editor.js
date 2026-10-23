// ══════════════════════════════════════════════════════
// MISSION EDITOR — ครูแก้ไขภารกิจคณิตหลายขั้นตอน (เก็บเป็น JSON ใน questions.question_img)
// ══════════════════════════════════════════════════════
let _meMission=null, _meIdx=-1;
const meEsc=v=>_geEsc(v==null?'':String(v));

const ME_KINDS={number:'ตอบเป็นจำนวนเต็ม',fraction:'ตอบเป็นเศษส่วน',fixed:'ตอบเป็นทศนิยม',choice:'เลือกคำตอบ',plan:'วางแผนหลายหัวข้อ',pizza:'จัดชิ้นพิซซ่า',chart:'สร้างกราฟ'};
const ME_NEW_STEPS={
  number:()=>({kind:'number',prompt:'',skill:'calculation',points:10,hints:[],solution:[],answer:0}),
  fraction:()=>({kind:'fraction',prompt:'',skill:'calculation',points:10,hints:[],solution:[],answer:{n:1,d:2}}),
  fixed:()=>({kind:'fixed',prompt:'',skill:'calculation',points:10,hints:[],solution:[],answer:0,places:2,unit:'บาท',money:true}),
  choice:()=>({kind:'choice',prompt:'',skill:'analysis',points:10,hints:[],solution:[],answer:0,options:[{text:'',ok:true,why:''},{text:'',ok:false,why:''}]})
};

function meIsMissionGame(){
  return Boolean(window.MathKit?.hasMissions(GAMES_DB[_geGid]?.code));
}
function meParse(q){
  try {
    const body=JSON.parse(q?.question_img||'');
    return Array.isArray(body?.steps)?{...body,title:q.question_text,difficulty:q.difficulty||'medium'}:null;
  } catch(e){ return null; }
}
function meSummaryHtml(q){
  const m=meParse(q);
  if(!m) return '';
  return `<div class="me-summary"><span class="me-badge">${MISSION_LEVELS[m.difficulty]||m.difficulty}</span> ${m.steps.length} ขั้น · ${m.steps.map(s=>ME_KINDS[s.kind]).filter((k,i,a)=>a.indexOf(k)===i).join(', ')}
    ${m.story?.[0]?`<div class="me-summary-story">${meEsc(m.story[0])}</div>`:''}</div>`;
}

function meOpenForm(idx){
  _meIdx=idx;
  _meMission=idx>=0?meParse(_geQuestions[idx]):MathKit.makeMission(GAMES_DB[_geGid].code,'medium');
  const overlay=document.createElement('div');
  overlay.className='overlay show';overlay.id='ge-modal';
  overlay.innerHTML=`
    <div class="modal me-modal" role="dialog" aria-modal="true" aria-labelledby="me-title">
      <div class="modal-t" id="me-title">${idx>=0?'✏️ แก้ไขภารกิจ':'➕ เพิ่มภารกิจใหม่'}
        <span class="me-sub">${GAMES_DB[_geGid]?.name}</span></div>
      <p class="me-intro">แก้ข้อความ ตัวเลข และคำตอบได้ทุกขั้น ระบบจะตรวจว่าคำตอบเล่นได้จริงก่อนบันทึก ส่วนวิธีทำของขั้นจัดพิซซ่าและสร้างกราฟคำนวณใหม่ให้อัตโนมัติ</p>
      ${idx<0?`<button type="button" class="btn btn-sm me-reroll" onclick="meReroll()">🎲 สุ่มแม่แบบใหม่ตามระดับที่เลือก</button>`:''}
      <div id="me-form"></div>
      <div id="ge-form-msg" class="me-msg" role="alert"></div>
      <div class="me-foot">
        <button class="btn btn-sm" onclick="document.getElementById('ge-modal').remove()">ยกเลิก</button>
        <button class="lp-btn-play" onclick="meSave()">💾 บันทึก</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  meRender();
}
function meRender(){
  const form=document.getElementById('me-form');
  if(form) form.innerHTML=meFormHtml(_meMission);
}
function meReroll(){
  meSync();
  _meMission=MathKit.makeMission(GAMES_DB[_geGid].code,_meMission.difficulty);
  meRender();
}

// ── Form markup: every editable value is an input bound to a path in _meMission ──
function meInput(label,path,value,type='s',extra=''){
  const id=`me-${path.replace(/\./g,'-')}`;
  const attrs=`id="${id}" data-p="${path}" data-t="${type}" data-l="${meEsc(label)}" ${extra}`;
  const field=type==='lines'||type==='text'
    ? `<textarea ${attrs} rows="${Math.max(2,String(value??'').split('\n').length)}" class="fc">${meEsc(value)}</textarea>`
    : `<input ${attrs} class="fc" value="${meEsc(value)}" ${type==='int'?'inputmode="numeric"':''}>`;
  return `<label class="me-field" for="${id}"><span>${label}</span>${field}</label>`;
}
function meSelect(label,path,value,options,type='s'){
  const id=`me-${path.replace(/\./g,'-')}`;
  return `<label class="me-field" for="${id}"><span>${label}</span><select id="${id}" class="fc" data-p="${path}" data-t="${type}" data-l="${meEsc(label)}">
    ${options.map(([v,text])=>`<option value="${meEsc(String(v))}" ${String(v)===String(value)?'selected':''}>${meEsc(text)}</option>`).join('')}</select></label>`;
}
function meOptionRows(path,options,group,canEdit=true){
  return `<div class="me-options">${options.map((o,i)=>`<div class="me-option">
      <label class="me-ok"><input type="radio" name="${group}" data-p="${path}.${i}.ok" data-t="ok" ${o.ok?'checked':''}> ถูก</label>
      <input class="fc" data-p="${path}.${i}.text" data-t="s" data-l="ข้อความตัวเลือก" value="${meEsc(o.text)}" placeholder="ข้อความตัวเลือก" aria-label="ตัวเลือกที่ ${i+1}">
      <input class="fc" data-p="${path}.${i}.why" data-t="s" value="${meEsc(o.why||'')}" placeholder="อธิบายเมื่อนักเรียนเลือกข้อนี้ผิด" aria-label="คำอธิบายตัวเลือกที่ ${i+1}">
      ${canEdit&&options.length>2?`<button type="button" class="me-x" aria-label="ลบตัวเลือก" onclick="meAct('remove','${path}',${i})">×</button>`:''}
    </div>`).join('')}
    ${canEdit?`<button type="button" class="me-add" onclick="meAct('addOption','${path}')">+ เพิ่มตัวเลือก</button>`:''}</div>`;
}
function meBlockHtml(b,i){
  const p=`context.${i}`;
  if(b.type==='note') return `<div class="me-card">${meInput('ข้อความประกอบ',`${p}.text`,b.text,'text')}</div>`;
  if(b.type==='table') return `<div class="me-card">${meInput('ชื่อตาราง',`${p}.title`,b.title)}
    <div class="me-table" style="--cols:${b.head.length}">
      ${b.head.map((h,c)=>`<input class="fc me-th" data-p="${p}.head.${c}" data-t="s" value="${meEsc(h)}" aria-label="หัวคอลัมน์ ${c+1}">`).join('')}<span></span>
      ${b.rows.map((row,r)=>row.map((cell,c)=>`<input class="fc" data-p="${p}.rows.${r}.${c}" data-t="s" value="${meEsc(cell)}" aria-label="แถว ${r+1} คอลัมน์ ${c+1}">`).join('')
        +`<button type="button" class="me-x" aria-label="ลบแถว" onclick="meAct('remove','${p}.rows',${r})">×</button>`).join('')}
    </div><button type="button" class="me-add" onclick="meAct('addRow','${p}')">+ เพิ่มแถว</button></div>`;
  if(b.type==='chart') return `<div class="me-card">${meInput('ชื่อกราฟตัวอย่าง',`${p}.title`,b.title)}
    ${meDatasetRows(p,b.labels,b.values)}
    ${meInput('ตัวเลขบนแกน Y (คั่นด้วยจุลภาค)',`${p}.ticks`,b.ticks.join(', '),'ints')}
    <div class="me-row">${meSelect('ชนิดกราฟ',`${p}.chartType`,b.chartType,[['bar','แผนภูมิแท่ง'],['line','กราฟเส้น']])}${meInput('หน่วย',`${p}.unit`,b.unit)}</div></div>`;
  return '';
}
function meDatasetRows(p,labels,values){
  return `<div class="me-pairs">${labels.map((label,i)=>`<div class="me-pair">
      <input class="fc" data-p="${p}.labels.${i}" data-t="s" data-l="ชื่อหมวด" value="${meEsc(label)}" aria-label="ชื่อหมวดที่ ${i+1}">
      <input class="fc" data-p="${p}.values.${i}" data-t="int" data-l="ค่าของ ${meEsc(label)}" value="${values[i]}" inputmode="numeric" aria-label="ค่าของหมวดที่ ${i+1}">
      ${labels.length>2?`<button type="button" class="me-x" aria-label="ลบหมวด" onclick="meAct('removeData','${p}',${i})">×</button>`:''}
    </div>`).join('')}<button type="button" class="me-add" onclick="meAct('addData','${p}')">+ เพิ่มหมวด</button></div>`;
}
function meAnswerHtml(s,i){
  const p=`steps.${i}`;
  if(s.kind==='number') return `<div class="me-row">${meInput('คำตอบที่ถูก',`${p}.answer`,s.answer,'int')}${meInput('หน่วย',`${p}.unit`,s.unit||'')}</div>`;
  if(s.kind==='fraction') return `<div class="me-row">${meInput('คำตอบที่ถูก (เช่น 3/4 หรือ 1 1/2)',`${p}.answer`,MathKit.fText(s.answer),'frac')}${meInput('หน่วย',`${p}.unit`,s.unit||'')}</div>`;
  if(s.kind==='fixed') return `<div class="me-row">${meInput(`คำตอบที่ถูก (ทศนิยมไม่เกิน ${s.places} ตำแหน่ง)`,`${p}.answer`,MathKit.decText(s.answer,s.places),'fixed',`data-places="${s.places}"`)}${meInput('หน่วย',`${p}.unit`,s.unit||'')}</div>`;
  if(s.kind==='choice') return `<div class="me-label">ตัวเลือก (เลือกข้อที่ถูก 1 ข้อ)</div>${meOptionRows(`${p}.options`,s.options,`me-ok-${i}`)}`;
  if(s.kind==='plan') return s.fields.map((f,k)=>`<div class="me-sub-card">${meInput('หัวข้อ',`${p}.fields.${k}.label`,f.label)}${meOptionRows(`${p}.fields.${k}.options`,f.options,`me-ok-${i}-${k}`,false)}</div>`).join('');
  if(s.kind==='pizza'){
    const names=s.orders.map((o,k)=>[k,o.name||`ลูกค้า ${k+1}`]);
    const pairs=[];
    names.forEach(([a,an])=>names.forEach(([b,bn])=>{ if(a<b) pairs.push([`${a},${b}`,`${an} + ${bn}`]); }));
    return `<div class="me-label">ออเดอร์ (เศษส่วนของถาด)</div><div class="me-pairs">${s.orders.map((o,k)=>`<div class="me-pair">
        <input class="fc" data-p="${p}.orders.${k}.name" data-t="s" data-l="ชื่อลูกค้า" value="${meEsc(o.name)}" aria-label="ชื่อลูกค้าที่ ${k+1}">
        <input class="fc" data-p="${p}.orders.${k}.f" data-t="frac" data-l="ออเดอร์ของ ${meEsc(o.name)}" value="${MathKit.fText(o.f)}" aria-label="ออเดอร์ของลูกค้าที่ ${k+1}">
        ${s.orders.length>1?`<button type="button" class="me-x" aria-label="ลบลูกค้า" onclick="meAct('removeOrder','${p}',${k})">×</button>`:''}
      </div>`).join('')}${s.orders.length<MathKit.PIZZA_MAX_ORDERS?`<button type="button" class="me-add" onclick="meAct('addOrder','${p}')">+ เพิ่มลูกค้า</button>`:''}</div>
      <div class="me-row">${meInput('จำนวนถาดที่มี',`${p}.trays`,s.trays,'int')}
        ${meSelect('ต้องได้จากถาดเดียวกัน',`${p}.together`,s.together?s.together.join(','):'',[['','ไม่มีเงื่อนไข'],...pairs],'pair')}
        ${meSelect('ขอถาดแยก',`${p}.own`,s.own??'',[['','ไม่มี'],...names],'opt')}</div>
      <label class="me-check"><input type="checkbox" data-p="${p}.minTrays" data-t="bool" ${s.minTrays?'checked':''}> ต้องจัดโดยใช้ถาดน้อยที่สุด (ระบบคำนวณจำนวนถาดให้)</label>`;
  }
  if(s.kind==='chart') return `<div class="me-label">ข้อมูลที่ต้องสร้างกราฟ</div>${meDatasetRows(p,s.labels,s.values)}
    <div class="me-row">${meSelect('ลำดับบนแกน X',`${p}.orderRule`,s.orderRule,[['table','ตามลำดับในตาราง'],['desc','จากค่ามากไปน้อย']])}
      ${meSelect('ชนิดกราฟที่ถูก',`${p}.defaultType`,s.defaultType,[['bar','แผนภูมิแท่ง'],['line','กราฟเส้น']])}
      ${meInput('หน่วย',`${p}.unit`,s.unit)}${meInput('จำนวนช่องแกน Y',`${p}.grid`,s.grid,'int')}</div>`;
  return '';
}
function meStepHtml(s,i,count){
  const p=`steps.${i}`, derived=s.kind==='pizza'||s.kind==='chart';
  const removable=!derived&&s.kind!=='plan'&&count>1;
  return `<div class="me-card me-step">
    <div class="me-step-head"><b>ขั้นที่ ${i+1}</b> · ${ME_KINDS[s.kind]}
      ${removable?`<button type="button" class="me-del" onclick="meAct('remove','steps',${i})">ลบขั้นนี้</button>`:''}</div>
    ${meInput('คำถาม',`${p}.prompt`,s.prompt,'text')}
    <div class="me-row">${meSelect('ทักษะที่วัด',`${p}.skill`,s.skill,Object.entries(MISSION_SKILLS))}${meInput('คะแนน',`${p}.points`,s.points,'int')}</div>
    ${meAnswerHtml(s,i)}
    ${meInput('คำใบ้ (บรรทัดละ 1 ระดับ)',`${p}.hints`,(s.hints||[]).join('\n'),'lines')}
    ${derived?`<div class="me-auto"><b>วิธีทำ (สร้างอัตโนมัติ)</b><ol>${s.solution.map(line=>`<li>${meEsc(line)}</li>`).join('')}</ol></div>`
      :meInput('วิธีทำที่แสดงหลังตอบ (บรรทัดละ 1 ขั้น)',`${p}.solution`,(s.solution||[]).join('\n'),'lines')}
  </div>`;
}
function meFormHtml(m){
  return `<div class="me-row">${meInput('ชื่อภารกิจ','title',m.title)}${meInput('ไอคอน','icon',m.icon||'','s','maxlength="4"')}
      ${meSelect('ระดับ','difficulty',m.difficulty,Object.entries(MISSION_LEVELS))}</div>
    ${meInput('เรื่องราว (บรรทัดละ 1 ย่อหน้า)','story',(m.story||[]).join('\n'),'lines')}
    ${meInput('เคล็ดลับก่อนเริ่ม','tip',m.tip||'')}
    ${(m.context||[]).length?`<h4 class="me-h">ข้อมูลประกอบโจทย์</h4>${m.context.map(meBlockHtml).join('')}`:''}
    <h4 class="me-h">ขั้นตอนของภารกิจ</h4>${m.steps.map((s,i)=>meStepHtml(s,i,m.steps.length)).join('')}
    <div class="me-add-step"><span>เพิ่มขั้นคำถาม:</span>${Object.keys(ME_NEW_STEPS).map(kind=>`<button type="button" class="me-add" onclick="meAct('addStep','${kind}')">+ ${ME_KINDS[kind]}</button>`).join('')}</div>`;
}

// ── Reading the form back ──
function meGet(path){ return path.split('.').reduce((o,k)=>o?.[k],_meMission); }
function meSet(path,value){
  const keys=path.split('.'), last=keys.pop();
  keys.reduce((o,k)=>o[k],_meMission)[last]=value;
}
const ME_PARSE={
  s:el=>el.value.trim(),
  text:el=>el.value.trim(),
  lines:el=>el.value.split('\n').map(line=>line.trim()).filter(Boolean),
  int:el=>/^-?\d+$/.test(el.value.trim())?Number(el.value.trim()):undefined,
  ints:el=>{ const parts=el.value.split(',').map(v=>v.trim()); return parts.every(v=>/^-?\d+$/.test(v))?parts.map(Number):undefined; },
  frac:el=>MathKit.parseFraction(el.value)||undefined,
  fixed:el=>MathKit.parseFixed(el.value,Number(el.dataset.places)) ?? undefined,
  ok:el=>el.checked,
  bool:el=>el.checked,
  opt:el=>el.value===''?null:Number(el.value),
  pair:el=>el.value===''?null:el.value.split(',').map(Number)
};
function meSync(){
  const errors=[];
  document.querySelectorAll('#me-form [data-p]').forEach(el=>{
    const value=ME_PARSE[el.dataset.t](el);
    if(value===undefined){ errors.push(`${el.dataset.l}: รูปแบบตัวเลขไม่ถูกต้อง`); el.setAttribute('aria-invalid','true'); return; }
    el.removeAttribute('aria-invalid');
    meSet(el.dataset.p,value);
  });
  if(_meMission.tip==='') delete _meMission.tip;
  return errors;
}
function meAct(action,path,index){
  meSync();
  const target=meGet(path);
  if(action==='remove') target.splice(index,1);
  if(action==='addOption') target.push({text:'',ok:false,why:''});
  if(action==='addRow') target.rows.push(target.head.map(()=>''));
  if(action==='addData'){ target.labels.push(`หมวด ${target.labels.length+1}`); target.values.push(0); }
  if(action==='removeData'){ target.labels.splice(index,1); target.values.splice(index,1); }
  if(action==='addOrder') target.orders.push({name:`ลูกค้า ${target.orders.length+1}`,f:{n:1,d:4}});
  if(action==='removeOrder'){
    target.orders.splice(index,1);
    const shift=k=>k>index?k-1:k;
    target.together=target.together&&!target.together.includes(index)?target.together.map(shift):null;
    target.own=target.own===null||target.own===index?null:shift(target.own);
  }
  if(action==='addStep') _meMission.steps.push(ME_NEW_STEPS[path]());
  meRender();
}

async function meSave(){
  const msg=document.getElementById('ge-form-msg');
  const parseErrors=meSync();
  const errors=parseErrors.length?parseErrors:MathKit.validateMission(MathKit.normalizeMission(_meMission));
  if(errors.length){
    if(!parseErrors.length) meRender();
    msg.innerHTML=`<div class="me-errors"><b>ยังบันทึกไม่ได้ แก้ ${errors.length} จุดนี้ก่อน</b><ul>${errors.map(e=>`<li>${meEsc(e)}</li>`).join('')}</ul></div>`;
    return;
  }
  const {title,difficulty,id,...body}=_meMission;
  const q=_meIdx>=0?_geQuestions[_meIdx]:null;
  const payload={game_id:_geDbGid,question_text:title,question_img:JSON.stringify(body),hint:'',difficulty,explanation:'',
    order_no:q?.order_no||_geQuestions.length+1,answers:[]};
  if(q?.question_id) payload.question_id=q.question_id;
  msg.innerHTML='<span style="color:var(--mu)">กำลังบันทึก...</span>';
  let res;
  try { res=await apiSaveQuestion(payload); } catch(e){ res={ok:false,error:'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้'}; }
  if(!res.ok){ msg.innerHTML=`<span style="color:#EF4444">❌ ${meEsc(res.error||'บันทึกไม่สำเร็จ')}</span>`; return; }
  document.getElementById('ge-modal')?.remove();
  await selectGeGame(_geGid);
}
