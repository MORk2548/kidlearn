// ══════════════════════════════════════════════════════
// MISSION EDITOR — ครูแก้ไขภารกิจหลายขั้นตอน คณิต และสุขศึกษาและพลศึกษา (เก็บเป็น JSON ใน questions.question_img)
// ══════════════════════════════════════════════════════
let _meMission=null, _meIdx=-1;
const meEsc=v=>_geEsc(v==null?'':String(v));

const ME_KINDS={number:'ตอบเป็นจำนวนเต็ม',fraction:'ตอบเป็นเศษส่วน',fixed:'ตอบเป็นทศนิยม',choice:'เลือกคำตอบ',plan:'วางแผนหลายหัวข้อ',pizza:'จัดชิ้นพิซซ่า',chart:'สร้างกราฟ',
  multi:'เลือกได้หลายข้อ',order:'เรียงลำดับ',sort:'จัดกลุ่ม',scene:'ตัดสินใจตามเรื่องราว',meal:'จัดเมนูอาหาร',schedule:'จัดตารางกิจวัตร'};
const meBlankStep=(kind,skill,extra)=>()=>({kind,prompt:'',skill,points:10,hints:[],solution:[],...extra});
const ME_NEW_STEPS={
  number:meBlankStep('number','calculation',{answer:0}),
  fraction:meBlankStep('fraction','calculation',{answer:{n:1,d:2}}),
  fixed:meBlankStep('fixed','calculation',{answer:0,places:2,unit:'บาท',money:true}),
  choice:meBlankStep('choice','analysis',{answer:0,options:[{text:'',ok:true,why:''},{text:'',ok:false,why:''}]})
};
const ME_NEW_HEALTH_STEPS={
  choice:meBlankStep('choice','reason',{answer:0,options:[{text:'',ok:true,why:''},{text:'',ok:false,why:''},{text:'',ok:false,why:''}]}),
  multi:meBlankStep('multi','analysis',{options:[{text:'',ok:true,why:''},{text:'',ok:false,why:''},{text:'',ok:false,why:''}]}),
  order:meBlankStep('order','planning',{items:['','','']}),
  sort:meBlankStep('sort','analysis',{bins:['ทำได้ด้วยตนเอง','ต้องแจ้งผู้ใหญ่'],items:[{text:'',bin:0,why:''},{text:'',bin:1,why:''},{text:'',bin:0,why:''}]}),
  scene:meBlankStep('scene','decision',{options:[{text:'',score:1,result:''},{text:'',score:0,result:''}]})
};
const ME_MEAL_RULES={groups:()=>({type:'groups',groups:[1,2,3,4,5],scope:'all'}),budget:()=>({type:'budget',max:100}),maxTag:()=>({type:'maxTag',tag:'fried',tagLabel:'ของทอด',max:1}),minTag:()=>({type:'minTag',tag:'water',tagLabel:'น้ำเปล่า',min:1}),noRepeat:()=>({type:'noRepeat'})};
const ME_MEAL_RULE_NAMES={groups:'ต้องมีหมู่อาหาร',budget:'งบประมาณ',maxTag:'ป้ายอาหารไม่เกิน',minTag:'ป้ายอาหารอย่างน้อย',noRepeat:'ห้ามเมนูซ้ำ'};
const ME_SCHEDULE_RULES={total:()=>({type:'total',max:1440}),catMin:()=>({type:'catMin',cat:'sleep',min:540}),catMax:()=>({type:'catMax',cat:'screen',max:120}),include:()=>({type:'include',card:0}),exclude:()=>({type:'exclude',card:0}),before:()=>({type:'before',a:0,b:1}),notAfter:()=>({type:'notAfter',a:0,b:1}),first:()=>({type:'first',card:0}),last:()=>({type:'last',card:0}),startBy:()=>({type:'startBy',card:0,time:'21:00'})};
const ME_SCHEDULE_RULE_NAMES={total:'เวลารวม',catMin:'ประเภทอย่างน้อย',catMax:'ประเภทไม่เกิน',include:'ต้องมีการ์ด',exclude:'ห้ามมีการ์ด',before:'การ์ด A ก่อน B',notAfter:'B ห้ามต่อจาก A ทันที',first:'การ์ดแรกของวัน',last:'การ์ดสุดท้ายของวัน',startBy:'เริ่มไม่เกินเวลา'};

function meKit(){
  return missionKit(GAMES_DB[_geGid]?.code);
}
function meIsMissionGame(){
  return Boolean(meKit());
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
  _meMission=idx>=0?meParse(_geQuestions[idx]):meKit().makeMission(GAMES_DB[_geGid].code,'medium');
  const overlay=document.createElement('div');
  overlay.className='overlay show';overlay.id='ge-modal';
  overlay.innerHTML=`
    <div class="modal me-modal" role="dialog" aria-modal="true" aria-labelledby="me-title">
      <div class="modal-t" id="me-title">${idx>=0?'✏️ แก้ไขภารกิจ':'➕ เพิ่มภารกิจใหม่'}
        <span class="me-sub">${GAMES_DB[_geGid]?.name}</span></div>
      <p class="me-intro">แก้ข้อความ ตัวเลข และคำตอบได้ทุกขั้น ระบบจะตรวจว่าคำตอบเล่นได้จริงก่อนบันทึก ${meKit()===window.HealthKit?'ขั้นจัดเมนูและจัดตารางต้องมีตัวอย่างที่ผ่านทุกเงื่อนไข ระบบจะสร้างคำอธิบายเฉลยให้อัตโนมัติ':'ส่วนวิธีทำของขั้นจัดพิซซ่าและสร้างกราฟคำนวณใหม่ให้อัตโนมัติ'}</p>
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
  _meMission=meKit().makeMission(GAMES_DB[_geGid].code,_meMission.difficulty);
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
const meGroupName=p=>`me-ok-${p.replace(/\./g,'-')}`;
function meMultiRows(path,options){
  return `<div class="me-options">${options.map((o,i)=>`<div class="me-option">
      <label class="me-ok"><input type="checkbox" data-p="${path}.${i}.ok" data-t="bool" ${o.ok?'checked':''}> ใช่</label>
      <input class="fc" data-p="${path}.${i}.text" data-t="s" data-l="ข้อความตัวเลือก" value="${meEsc(o.text)}" placeholder="ข้อความตัวเลือก" aria-label="ตัวเลือกที่ ${i+1}">
      <input class="fc" data-p="${path}.${i}.why" data-t="s" value="${meEsc(o.why||'')}" placeholder="อธิบายเมื่อนักเรียนเลือกข้อนี้ผิด" aria-label="คำอธิบายตัวเลือกที่ ${i+1}">
      ${options.length>2?`<button type="button" class="me-x" aria-label="ลบตัวเลือก" onclick="meAct('remove','${path}',${i})">×</button>`:''}
    </div>`).join('')}<button type="button" class="me-add" onclick="meAct('addOption','${path}')">+ เพิ่มตัวเลือก</button></div>`;
}
const meNumbered=list=>list.map((x,i)=>`${i+1}. ${x}`).join(' · ');
function meMealHtml(s,p){
  const groups=HealthKit.FOOD_GROUPS;
  const scopes=[['all','ทั้งวัน'],...s.meals.map((m,k)=>[k,m.label||`มื้อที่ ${k+1}`])];
  const ruleRow=(r,k)=>{
    const rp=`${p}.rules.${k}`, fields=[];
    if(r.type==='groups') fields.push(meInput('หมู่อาหารที่ต้องมี (เลข 1–5 คั่นด้วยจุลภาค)',`${rp}.groups`,r.groups.join(', '),'ints'));
    if(r.type==='budget') fields.push(meInput('งบสูงสุด (บาท)',`${rp}.max`,r.max,'int'));
    if(r.type==='maxTag'||r.type==='minTag') fields.push(meInput('ป้ายอาหาร (ตรงกับป้ายในเมนู)',`${rp}.tag`,r.tag),meInput('ชื่อที่แสดง',`${rp}.tagLabel`,r.tagLabel||''),
      meInput(r.type==='maxTag'?'ไม่เกิน (อย่าง)':'อย่างน้อย (อย่าง)',`${rp}.${r.type==='maxTag'?'max':'min'}`,r.type==='maxTag'?r.max:r.min,'int'));
    if(r.type!=='noRepeat'&&r.type!=='budget') fields.push(meSelect('ใช้กับ',`${rp}.scope`,r.scope??'all',scopes,'scope'));
    return `<div class="me-sub-card"><div class="me-step-head"><b>${ME_MEAL_RULE_NAMES[r.type]}</b><button type="button" class="me-del" onclick="meAct('remove','${p}.rules',${k})">ลบเงื่อนไข</button></div>
      <div class="me-row">${fields.join('')}</div>${meInput(`ข้อความเงื่อนไข (เว้นว่างให้ระบบเขียน: "${meEsc(HealthKit.mealRuleText({...r,label:''}))}")`,`${rp}.label`,r.label||'')}</div>`;
  };
  return `<div class="me-label">เมนูให้เลือก (หมู่อาหาร: ${Object.entries(groups).map(([g,v])=>`${g}=${v.short}`).join(' ')})</div>
    <div class="me-pairs">${s.foods.map((f,k)=>`<div class="me-food-row"><b>${k+1}</b>
      <input class="fc" data-p="${p}.foods.${k}.icon" data-t="s" value="${meEsc(f.icon||'')}" aria-label="ไอคอนเมนูที่ ${k+1}" maxlength="4">
      <input class="fc" data-p="${p}.foods.${k}.name" data-t="s" data-l="ชื่อเมนู" value="${meEsc(f.name)}" aria-label="ชื่อเมนูที่ ${k+1}">
      <input class="fc" data-p="${p}.foods.${k}.price" data-t="int" data-l="ราคา ${meEsc(f.name)}" value="${f.price}" inputmode="numeric" aria-label="ราคาเมนูที่ ${k+1}">
      <input class="fc" data-p="${p}.foods.${k}.groups" data-t="ints" data-l="หมู่อาหารของ ${meEsc(f.name)}" value="${f.groups.join(',')}" aria-label="หมู่อาหารของเมนูที่ ${k+1}">
      <input class="fc" data-p="${p}.foods.${k}.tags" data-t="csv" value="${meEsc((f.tags||[]).join(','))}" placeholder="ป้าย เช่น fried" aria-label="ป้ายของเมนูที่ ${k+1}">
      ${s.foods.length>3?`<button type="button" class="me-x" aria-label="ลบเมนู" onclick="meAct('removeFood','${p}',${k})">×</button>`:''}</div>`).join('')}
      <button type="button" class="me-add" onclick="meAct('addFood','${p}')">+ เพิ่มเมนู</button></div>
    <div class="me-label">มื้ออาหาร</div>${s.meals.map((m,k)=>`<div class="me-row">${meInput('ชื่อมื้อ',`${p}.meals.${k}.label`,m.label)}${meInput('เลือกอย่างน้อย',`${p}.meals.${k}.min`,m.min,'int')}${meInput('เลือกได้ไม่เกิน',`${p}.meals.${k}.max`,m.max,'int')}
      ${meInput(`เมนูตัวอย่างที่ถูก (เลขเมนู คั่นด้วยจุลภาค)`,`${p}.example.${k}`,(s.example?.[k]||[]).map(f=>f+1).join(', '),'idxs')}</div>`).join('')}
    <label class="me-check"><input type="checkbox" data-p="${p}.showGroups" data-t="bool" ${s.showGroups?'checked':''}> แสดงสัญลักษณ์หมู่อาหารบนเมนู (เหมาะกับระดับง่าย)</label>
    <div class="me-label">เงื่อนไขที่ระบบตรวจ</div>${s.rules.map(ruleRow).join('')}
    <div class="me-add-step"><span>เพิ่มเงื่อนไข:</span>${Object.keys(ME_MEAL_RULES).map(type=>`<button type="button" class="me-add" onclick="meAct('addMealRule','${p}','${type}')">+ ${ME_MEAL_RULE_NAMES[type]}</button>`).join('')}</div>`;
}
function meScheduleHtml(s,p){
  const cats=Object.entries(HealthKit.ACTIVITY_CATS);
  const cards=s.cards.map((c,k)=>[k,`${k+1}. ${c.label||'?'}`]);
  const ruleRow=(r,k)=>{
    const rp=`${p}.rules.${k}`, fields=[];
    if(r.type==='total') fields.push(meInput('สูงสุด (นาที)',`${rp}.max`,r.max,'int'),meInput('อย่างน้อย (นาที, เว้นว่างได้)',`${rp}.min`,r.min??'','optint'));
    if(r.type==='catMin'||r.type==='catMax') fields.push(meSelect('ประเภทกิจกรรม',`${rp}.cat`,r.cat,cats),meInput(r.type==='catMin'?'อย่างน้อย (นาที)':'ไม่เกิน (นาที)',`${rp}.${r.type==='catMin'?'min':'max'}`,r.type==='catMin'?r.min:r.max,'int'));
    if(['include','exclude','first','last','startBy'].includes(r.type)) fields.push(meSelect('การ์ด',`${rp}.card`,r.card,cards,'opt'));
    if(r.type==='startBy') fields.push(meInput('เริ่มไม่เกินเวลา (เช่น 21:00)',`${rp}.time`,r.time));
    if(r.type==='before'||r.type==='notAfter') fields.push(meSelect('การ์ด A',`${rp}.a`,r.a,cards,'opt'),meSelect('การ์ด B',`${rp}.b`,r.b,cards,'opt'));
    return `<div class="me-sub-card"><div class="me-step-head"><b>${ME_SCHEDULE_RULE_NAMES[r.type]}</b><button type="button" class="me-del" onclick="meAct('remove','${p}.rules',${k})">ลบเงื่อนไข</button></div>
      <div class="me-row">${fields.join('')}</div>${meInput(`ข้อความเงื่อนไข (เว้นว่างให้ระบบเขียน: "${meEsc(HealthKit.scheduleRuleText({...r,label:''}))}")`,`${rp}.label`,r.label||'')}</div>`;
  };
  return `<div class="me-row">${meInput('เวลาเริ่มของตาราง (เช่น 06:00)',`${p}.start`,s.start)}</div>
    <div class="me-label">การ์ดกิจกรรม (เวลาเป็นนาที)</div>
    <div class="me-pairs">${s.cards.map((c,k)=>`<div class="me-food-row"><b>${k+1}</b>
      <input class="fc" data-p="${p}.cards.${k}.icon" data-t="s" value="${meEsc(c.icon||'')}" aria-label="ไอคอนการ์ดที่ ${k+1}" maxlength="4">
      <input class="fc" data-p="${p}.cards.${k}.label" data-t="s" data-l="ชื่อกิจกรรม" value="${meEsc(c.label)}" aria-label="ชื่อการ์ดที่ ${k+1}">
      <input class="fc" data-p="${p}.cards.${k}.minutes" data-t="int" data-l="เวลาของ ${meEsc(c.label)}" value="${c.minutes}" inputmode="numeric" aria-label="นาทีของการ์ดที่ ${k+1}">
      <select class="fc" data-p="${p}.cards.${k}.cat" data-t="s" aria-label="ประเภทของการ์ดที่ ${k+1}">${cats.map(([v,t])=>`<option value="${v}" ${v===c.cat?'selected':''}>${t}</option>`).join('')}</select>
      ${s.cards.length>3?`<button type="button" class="me-x" aria-label="ลบการ์ด" onclick="meAct('removeCard','${p}',${k})">×</button>`:''}</div>`).join('')}
      <button type="button" class="me-add" onclick="meAct('addCard','${p}')">+ เพิ่มการ์ด</button></div>
    ${meInput('ตารางตัวอย่างที่ถูก (เลขการ์ดตามลำดับเวลา คั่นด้วยจุลภาค)',`${p}.example`,(s.example||[]).map(c=>c+1).join(', '),'idxs')}
    ${meInput('ตารางที่มีปัญหาให้นักเรียนแก้ (ระดับยาก เว้นว่างได้)',`${p}.preset`,(s.preset||[]).map(c=>c+1).join(', '),'idxs')}
    <div class="me-label">เงื่อนไขที่ระบบตรวจ</div>${s.rules.map(ruleRow).join('')}
    <div class="me-add-step"><span>เพิ่มเงื่อนไข:</span>${Object.keys(ME_SCHEDULE_RULES).map(type=>`<button type="button" class="me-add" onclick="meAct('addScheduleRule','${p}','${type}')">+ ${ME_SCHEDULE_RULE_NAMES[type]}</button>`).join('')}</div>`;
}
function meAnswerHtml(s,p,nested){
  if(s.kind==='number') return `<div class="me-row">${meInput('คำตอบที่ถูก',`${p}.answer`,s.answer,'int')}${meInput('หน่วย',`${p}.unit`,s.unit||'')}</div>`;
  if(s.kind==='fraction') return `<div class="me-row">${meInput('คำตอบที่ถูก (เช่น 3/4 หรือ 1 1/2)',`${p}.answer`,MathKit.fText(s.answer),'frac')}${meInput('หน่วย',`${p}.unit`,s.unit||'')}</div>`;
  if(s.kind==='fixed') return `<div class="me-row">${meInput(`คำตอบที่ถูก (ทศนิยมไม่เกิน ${s.places} ตำแหน่ง)`,`${p}.answer`,MathKit.decText(s.answer,s.places),'fixed',`data-places="${s.places}"`)}${meInput('หน่วย',`${p}.unit`,s.unit||'')}</div>`;
  if(s.kind==='choice') return `<div class="me-label">ตัวเลือก (เลือกข้อที่ถูก 1 ข้อ)</div>${meOptionRows(`${p}.options`,s.options,meGroupName(p))}`;
  if(s.kind==='plan') return s.fields.map((f,k)=>`<div class="me-sub-card">${meInput('หัวข้อ',`${p}.fields.${k}.label`,f.label)}${meOptionRows(`${p}.fields.${k}.options`,f.options,meGroupName(`${p}.fields.${k}`),false)}</div>`).join('');
  if(s.kind==='multi') return `<div class="me-label">ตัวเลือก (ติ๊ก "ใช่" ทุกข้อที่นักเรียนต้องเลือก)</div>${meMultiRows(`${p}.options`,s.options)}`;
  if(s.kind==='order') return meInput('ขั้นตอนเรียงตามลำดับที่ถูก (บรรทัดละ 1 ขั้น ระบบจะสลับให้นักเรียนเอง)',`${p}.items`,s.items.join('\n'),'lines');
  if(s.kind==='sort') return `${meInput('ชื่อกลุ่ม (บรรทัดละ 1 กลุ่ม)',`${p}.bins`,s.bins.join('\n'),'lines')}
    <div class="me-label">การ์ดที่ต้องจัดกลุ่ม</div><div class="me-options">${s.items.map((it,k)=>`<div class="me-option">
      <select class="fc" data-p="${p}.items.${k}.bin" data-t="opt" aria-label="กลุ่มที่ถูกของการ์ดที่ ${k+1}">${s.bins.map((b,g)=>`<option value="${g}" ${g===it.bin?'selected':''}>${meEsc(b)}</option>`).join('')}</select>
      <input class="fc" data-p="${p}.items.${k}.text" data-t="s" data-l="ข้อความการ์ด" value="${meEsc(it.text)}" placeholder="ข้อความการ์ด" aria-label="การ์ดที่ ${k+1}">
      <input class="fc" data-p="${p}.items.${k}.why" data-t="s" value="${meEsc(it.why||'')}" placeholder="อธิบายเมื่อจัดผิดกลุ่ม" aria-label="คำอธิบายการ์ดที่ ${k+1}">
      ${s.items.length>3?`<button type="button" class="me-x" aria-label="ลบการ์ด" onclick="meAct('remove','${p}.items',${k})">×</button>`:''}</div>`).join('')}
      <button type="button" class="me-add" onclick="meAct('addSortItem','${p}')">+ เพิ่มการ์ด</button></div>`;
  if(s.kind==='scene') return `<div class="me-label">ทางเลือก (คะแนน 1 = ปลอดภัยที่สุด, 0.5 = พอใช้แต่ยังเสี่ยง, 0 = เสี่ยงอันตราย)</div>${s.options.map((o,k)=>{
      const op=`${p}.options.${k}`;
      return `<div class="me-sub-card"><div class="me-row">${meInput(`ทางเลือกที่ ${k+1}`,`${op}.text`,o.text)}${meSelect('คะแนน',`${op}.score`,o.score,[[1,'1 ดีที่สุด'],[0.5,'0.5 พอใช้'],[0,'0 เสี่ยง']],'num')}</div>
        ${meInput('ผลที่เกิดขึ้นเมื่อเลือกทางนี้',`${op}.result`,o.result,'text')}
        ${o.then?meStepHtml(o.then,`${op}.then`,'เหตุการณ์ต่อเนื่องเมื่อเลือกทางนี้',true)
          :nested?'':`<button type="button" class="me-add" onclick="meAct('addThen','${op}')">+ เพิ่มเหตุการณ์ต่อเนื่องเมื่อเลือกทางนี้</button>`}
        ${s.options.length>2?`<button type="button" class="me-del" onclick="meAct('remove','${p}.options',${k})">ลบทางเลือก</button>`:''}</div>`;
    }).join('')}<button type="button" class="me-add" onclick="meAct('addSceneOption','${p}')">+ เพิ่มทางเลือก</button>`;
  if(s.kind==='meal') return meMealHtml(s,p);
  if(s.kind==='schedule') return meScheduleHtml(s,p);
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
// path is "steps.<i>" for a mission step, or "<scene option>.then" for a branch step.
function meStepHtml(s,p,heading,nested=false){
  const derived=['pizza','chart','meal','schedule'].includes(s.kind);
  const kit=meKit();
  const skills=Object.entries(MISSION_SKILLS).filter(([key])=>!kit.SKILLS||kit.SKILLS.includes(key));
  const parent=p.slice(0,p.lastIndexOf('.')), index=Number(p.slice(p.lastIndexOf('.')+1));
  const removable=nested||(!['pizza','chart','plan'].includes(s.kind)&&_meMission.steps.length>1);
  const removeCall=nested?`meAct('removeThen','${parent}')`:`meAct('remove','${parent}',${index})`;
  return `<div class="me-card me-step${nested?' me-branch':''}">
    <div class="me-step-head"><b>${heading}</b> · ${ME_KINDS[s.kind]}
      ${removable?`<button type="button" class="me-del" onclick="${removeCall}">ลบขั้นนี้</button>`:''}</div>
    ${meInput('คำถาม',`${p}.prompt`,s.prompt,'text')}
    <div class="me-row">${meSelect('ทักษะที่วัด',`${p}.skill`,s.skill,skills)}${meInput('คะแนน',`${p}.points`,s.points,'int')}</div>
    ${meAnswerHtml(s,p,nested)}
    ${meInput('คำใบ้ (บรรทัดละ 1 ระดับ)',`${p}.hints`,(s.hints||[]).join('\n'),'lines')}
    ${derived?`<div class="me-auto"><b>วิธีทำ (สร้างอัตโนมัติ)</b><ol>${(s.solution||[]).map(line=>`<li>${meEsc(line)}</li>`).join('')}</ol></div>`
      :meInput('วิธีทำ/คำอธิบายที่แสดงหลังตอบ (บรรทัดละ 1 ขั้น)',`${p}.solution`,(s.solution||[]).join('\n'),'lines')}
  </div>`;
}
function meFormHtml(m){
  const kit=meKit();
  const levels=Object.entries(MISSION_LEVELS).filter(([key])=>!kit.LEVELS||kit.LEVELS.includes(key));
  const newSteps=kit===window.HealthKit?ME_NEW_HEALTH_STEPS:ME_NEW_STEPS;
  return `<div class="me-row">${meInput('ชื่อภารกิจ','title',m.title)}${meInput('ไอคอน','icon',m.icon||'','s','maxlength="4"')}
      ${meSelect('ระดับ','difficulty',m.difficulty,levels)}</div>
    ${meInput('เรื่องราว (บรรทัดละ 1 ย่อหน้า)','story',(m.story||[]).join('\n'),'lines')}
    ${meInput('เคล็ดลับก่อนเริ่ม','tip',m.tip||'')}
    ${(m.context||[]).length?`<h4 class="me-h">ข้อมูลประกอบโจทย์</h4>${m.context.map(meBlockHtml).join('')}`:''}
    ${kit===window.HealthKit?`<div class="me-add-step"><span>เพิ่มข้อมูลประกอบ:</span><button type="button" class="me-add" onclick="meAct('addNote','context')">+ ข้อความ</button><button type="button" class="me-add" onclick="meAct('addTable','context')">+ ตาราง</button>${(m.context||[]).length?`<button type="button" class="me-add" onclick="meAct('remove','context',${m.context.length-1})">ลบข้อมูลประกอบอันสุดท้าย</button>`:''}</div>`:''}
    <h4 class="me-h">ขั้นตอนของภารกิจ</h4>${m.steps.map((s,i)=>meStepHtml(s,`steps.${i}`,`ขั้นที่ ${i+1}`)).join('')}
    <div class="me-add-step"><span>เพิ่มขั้นคำถาม:</span>${Object.keys(newSteps).map(kind=>`<button type="button" class="me-add" onclick="meAct('addStep','${kind}')">+ ${ME_KINDS[kind]}</button>`).join('')}</div>`;
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
  optint:el=>el.value.trim()===''?null:/^\d+$/.test(el.value.trim())?Number(el.value.trim()):undefined,
  ints:el=>{ const parts=el.value.split(',').map(v=>v.trim()).filter(Boolean); return parts.every(v=>/^-?\d+$/.test(v))?parts.map(Number):undefined; },
  idxs:el=>{ const parts=el.value.split(',').map(v=>v.trim()).filter(Boolean); return parts.every(v=>/^\d+$/.test(v)&&Number(v)>0)?parts.map(v=>Number(v)-1):undefined; },
  csv:el=>el.value.split(',').map(v=>v.trim()).filter(Boolean),
  num:el=>Number(el.value),
  scope:el=>el.value==='all'?'all':Number(el.value),
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
    if(value===undefined){ errors.push(`${el.dataset.l||'ช่องตัวเลข'}: รูปแบบตัวเลขไม่ถูกต้อง`); el.setAttribute('aria-invalid','true'); return; }
    el.removeAttribute('aria-invalid');
    meSet(el.dataset.p,value);
  });
  if(_meMission.tip==='') delete _meMission.tip;
  const prune=s=>{
    if(s.kind==='schedule'&&!s.preset?.length) delete s.preset;
    (s.rules||[]).forEach(r=>{ if(!r.label) delete r.label; if(r.min===null) delete r.min; });
    (s.options||[]).forEach(o=>{ if(o.then) prune(o.then); });
  };
  _meMission.steps.forEach(prune);
  return errors;
}
// Removing a menu item or activity card renumbers every reference to the cards after it.
function meRemoveIndex(s,list,index){
  const shift=k=>k>index?k-1:k;
  s[list].splice(index,1);
  if(list==='foods') s.example=(s.example||[]).map(meal=>meal.filter(f=>f!==index).map(shift));
  if(list==='cards'){
    s.example=(s.example||[]).filter(c=>c!==index).map(shift);
    if(s.preset) s.preset=s.preset.filter(c=>c!==index).map(shift);
    s.rules=s.rules.filter(r=>![r.card,r.a,r.b].includes(index)).map(r=>{
      ['card','a','b'].forEach(key=>{ if(Number.isInteger(r[key])) r[key]=shift(r[key]); });
      return r;
    });
  }
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
  if(action==='addStep') _meMission.steps.push((meKit()===window.HealthKit?ME_NEW_HEALTH_STEPS:ME_NEW_STEPS)[path]());
  if(action==='addSortItem') target.items.push({text:'',bin:0,why:''});
  if(action==='addSceneOption') target.options.push({text:'',score:0,result:''});
  if(action==='addThen') target.then=ME_NEW_HEALTH_STEPS.choice();
  if(action==='removeThen') delete target.then;
  if(action==='addFood') target.foods.push({name:'',icon:'🍽️',price:10,groups:[3],tags:[]});
  if(action==='removeFood') meRemoveIndex(target,'foods',index);
  if(action==='addCard') target.cards.push({label:'',icon:'⭐',minutes:30,cat:'free'});
  if(action==='removeCard') meRemoveIndex(target,'cards',index);
  if(action==='addMealRule') target.rules.push(ME_MEAL_RULES[index]());
  if(action==='addScheduleRule') target.rules.push(ME_SCHEDULE_RULES[index]());
  if(action==='addNote') _meMission.context.push({type:'note',text:''});
  if(action==='addTable') _meMission.context.push({type:'table',title:'',head:['หัวข้อ','รายละเอียด'],rows:[['','']]});
  meRender();
}

async function meSave(){
  const msg=document.getElementById('ge-form-msg');
  const parseErrors=meSync();
  const errors=parseErrors.length?parseErrors:meKit().validateMission(meKit().normalizeMission(_meMission));
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
