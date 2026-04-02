// ══════════════════════════════════════════════════════
// GAME EDITOR — ครูแก้ไขคำถาม-คำตอบ (4.0)
// ══════════════════════════════════════════════════════
let _geGid=null, _geDbGid=null, _geQuestions=[], _geAnsCount=4, _geGameMeta=null;

function _renderGameEditor(){
  const panel=document.getElementById('tc-game-panel');
  if(!panel)return;
  const subHtml=[1,2,3,4,5,6].map(sid=>{
    const sub=SUBS.find(s=>s.id===sid);if(!sub)return'';
    const games=Object.values(GAMES_DB).filter(g=>g.sid===sid);
    return `<div style="margin-bottom:.9rem">
      <div style="font-weight:800;font-size:.8rem;color:${sub.color};margin-bottom:.3rem">${sub.icon} ${sub.name}</div>
      <div style="display:flex;flex-wrap:wrap;gap:.3rem">
        ${games.map(gm=>`<button class="ge-btn${_geGid===gm.id?' ge-active':''}"
          onclick="selectGeGame('${gm.id}')">${gm.icon} ${gm.name}</button>`).join('')}
      </div></div>`;
  }).join('');

  panel.innerHTML=`
    <style>
      .ge-btn{font-size:.72rem;padding:.3rem .55rem;border-radius:8px;border:1.5px solid #E5E7EB;
        background:#fff;color:var(--tx);cursor:pointer;font-family:'Kanit',sans-serif;transition:all .15s}
      .ge-btn:hover{border-color:var(--s);background:#EEF2FF;color:var(--s)}
      .ge-active{background:var(--s)!important;color:#fff!important;border-color:var(--s)!important}
      .ge-q-card{background:#fff;border:1.5px solid #E5E7EB;border-radius:12px;margin-bottom:.75rem;overflow:hidden;transition:border-color .2s}
      .ge-q-card:hover{border-color:#C7D2FE}
      .ge-q-head{background:#F8FAFF;padding:.65rem 1rem;display:flex;align-items:center;gap:.5rem;border-bottom:1px solid #E5E7EB}
      .ge-q-body{padding:.65rem 1rem}
    </style>
    <div style="display:grid;grid-template-columns:220px 1fr;gap:1rem;align-items:start" id="ge-grid">
      <div style="background:#fff;border-radius:14px;padding:1rem;box-shadow:0 2px 8px rgba(0,0,0,.06);max-height:76vh;overflow-y:auto">
        <div style="font-weight:800;font-size:.88rem;color:var(--s);margin-bottom:.85rem">🎮 เลือกเกม</div>
        ${subHtml}
      </div>
      <div id="ge-editor">
        <div style="display:flex;align-items:center;justify-content:center;height:250px;color:var(--mu);flex-direction:column;gap:.75rem">
          <div style="font-size:2.5rem">🎮</div>
          <div style="font-weight:600">เลือกเกมจากรายการทางซ้าย</div>
        </div>
      </div>
    </div>`;
  if(window.innerWidth<768){const g=document.getElementById('ge-grid');if(g)g.style.gridTemplateColumns='1fr';}
  if(_geGid) selectGeGame(_geGid);
}

async function selectGeGame(jsKey){
  _geGid=jsKey;
  _geDbGid=typeof jsKeyToDbId==='function'?jsKeyToDbId(jsKey):parseInt(jsKey);
  document.querySelectorAll('.ge-btn').forEach(b=>{
    const isA=(b.getAttribute('onclick')||'').includes(`'${jsKey}'`);
    b.classList.toggle('ge-active',isA);
  });
  const ed=document.getElementById('ge-editor');
  if(!ed)return;
  ed.innerHTML='<div style="color:var(--mu);padding:2rem;text-align:center">⏳ กำลังโหลด...</div>';

  let res;
  try {
    res = await apiGameQuestions(_geDbGid);
  } catch(e) {
    ed.innerHTML=`<div style="color:#EF4444;padding:1.5rem;background:#FEF2F2;border-radius:12px;margin:1rem">
      ❌ เชื่อมต่อ Docker container ไม่ได้<br>
      <span style="font-size:.82rem">ตรวจสอบว่า kidlearn_web รันอยู่: <code>docker compose ps</code></span>
    </div>`;
    return;
  }
  if(!res.ok){
    ed.innerHTML=`<div style="color:#EF4444;padding:1.5rem;background:#FEF2F2;border-radius:12px;margin:1rem">❌ ${res.error||'โหลดคำถามไม่สำเร็จ'}</div>`;
    return;
  }
  _geQuestions=res.questions||[];
  _geGameMeta=res.game||null;

  const gm=GAMES_DB[jsKey],sub=SUBS.find(s=>s.id===gm.sid);
  const TYPE_LBL={mcq:'ตอบปรนัย',truefalse:'จริง/เท็จ',fill:'เติมคำ',matching:'จับคู่',sequence:'เรียงลำดับ',wordsearch:'ค้นหาคำ'};
  const timeLimit=parseInt(_geGameMeta?.time_limit,10)>0?parseInt(_geGameMeta.time_limit,10):(parseInt(gm?.time,10)||60);

  ed.innerHTML=`
    <div style="background:#fff;border-radius:14px;padding:1.25rem;box-shadow:0 2px 8px rgba(0,0,0,.06)">
      <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:1.1rem;padding:.75rem 1rem;
        background:linear-gradient(135deg,${sub.color}18,${sub.color}06);border-radius:12px;border-left:4px solid ${sub.color}">
        <span style="font-size:1.6rem">${gm.icon}</span>
        <div style="flex:1">
          <div style="font-weight:800;font-size:.95rem">${gm.name}</div>
          <div style="font-size:.73rem;color:var(--mu)">${sub?.name} · ${TYPE_LBL[gm.type]||gm.type} · <span id="ge-qcount">${_geQuestions.length}</span> คำถาม</div>
        </div>
        <div style="display:flex;align-items:center;gap:.45rem;flex-wrap:wrap;justify-content:flex-end">
          <label for="ge-time-limit" style="font-size:.75rem;color:var(--mu);font-weight:700">เวลาเล่น</label>
          <input id="ge-time-limit" type="number" min="10" max="3600" value="${timeLimit}"
            style="width:88px;padding:.45rem .55rem;border:1px solid #CBD5E1;border-radius:10px;font-family:'Kanit',sans-serif">
          <span style="font-size:.75rem;color:var(--mu)">วินาที</span>
          <button class="btn btn-sm" style="background:#F8FAFC;border:1px solid #CBD5E1;font-size:.75rem"
            onclick="geSaveGameSettings()">บันทึกเวลา</button>
        </div>
        <button class="lp-btn-play" style="padding:.5rem 1.25rem;font-size:.85rem" onclick="geOpenForm(-1)">+ เพิ่มคำถาม</button>
      </div>
      <div id="ge-game-msg" style="min-height:1.1rem;font-size:.8rem;margin:-.35rem 0 .75rem;text-align:right"></div>
      <div id="ge-q-list">${_geRenderQList(gm.type)}</div>
    </div>`;
}

function _geRenderQList(type){
  if(!_geQuestions.length) return`
    <div style="text-align:center;color:var(--mu);padding:3rem 1rem">
      <div style="font-size:2.5rem;margin-bottom:.6rem">📝</div>
      <div style="font-weight:600">ยังไม่มีคำถามในเกมนี้</div>
      <div style="font-size:.85rem;margin-top:.4rem">กด "+ เพิ่มคำถาม" เพื่อเริ่มต้น</div>
    </div>`;
  return _geQuestions.map((q,i)=>`
    <div class="ge-q-card">
      <div class="ge-q-head">
        <span style="background:var(--s);color:#fff;width:26px;height:26px;border-radius:50%;
          display:flex;align-items:center;justify-content:center;font-size:.78rem;font-weight:800;flex-shrink:0">${i+1}</span>
        <span style="flex:1;font-size:.88rem;font-weight:600">${q.question_text}</span>
        <button class="btn btn-sm" style="background:#EEF2FF;color:var(--s);border:1px solid #C7D2FE;font-size:.75rem"
          onclick="geOpenForm(${i})">✏️ แก้ไข</button>
        <button class="btn btn-sm" style="background:#FEE2E2;color:#991B1B;border:1px solid #FCA5A5;font-size:.75rem"
          onclick="geDeleteQ(${i})">🗑</button>
      </div>
      <div class="ge-q-body">
        ${(q.answers||[]).map(a=>`
          <div style="display:flex;align-items:center;gap:.5rem;padding:.18rem 0">
            <span style="width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;
              font-size:.75rem;background:${a.is_correct?'#10B981':'#E5E7EB'};
              color:${a.is_correct?'#fff':'#9CA3AF'};flex-shrink:0">${a.is_correct?'✓':'○'}</span>
            <span style="font-size:.84rem;color:${a.is_correct?'#065F46':'var(--tx)'};
              font-weight:${a.is_correct?700:400}">
              ${a.pair_left?`<b>${a.pair_left}</b> → ${a.pair_right}`:a.answer_text}
              ${a.seq_order?` <span style="color:var(--mu);font-size:.75rem">(ลำดับ ${a.seq_order})</span>`:''}
            </span>
          </div>`).join('')}
        ${q.hint?`<div style="font-size:.75rem;color:#92400E;background:#FEF3C7;border-radius:6px;padding:.22rem .65rem;margin-top:.45rem;display:inline-block">💡 ${q.hint}</div>`:''}
      </div>
    </div>`).join('');
}

function geOpenForm(idx){
  const q=idx>=0?_geQuestions[idx]:null;
  const gm=GAMES_DB[_geGid];
  const type=gm?.type||'mcq';
  _geAnsCount=4;

  const formHtml=_geFormHtml(type,q);

  const overlay=document.createElement('div');
  overlay.className='overlay show';overlay.id='ge-modal';
  overlay.onclick=(e)=>{if(e.target===overlay)overlay.remove();};
  overlay.innerHTML=`
    <div class="modal" style="max-width:580px;width:100%;max-height:90vh;overflow-y:auto;padding:1.5rem">
      <div class="modal-t" style="font-size:1.05rem;margin-bottom:1.1rem">
        ${q?'✏️ แก้ไขคำถาม':'➕ เพิ่มคำถามใหม่'}
        <span style="font-size:.75rem;color:var(--mu);font-weight:400;margin-left:.5rem">
          ${GAMES_DB[_geGid]?.name} (${type})
        </span>
      </div>
      ${formHtml}
      <div style="display:flex;gap:.65rem;justify-content:flex-end;padding-top:.75rem;border-top:1px solid #F1F5F9;margin-top:.75rem">
        <button class="btn btn-sm" onclick="document.getElementById('ge-modal').remove()">ยกเลิก</button>
        <button class="lp-btn-play" style="padding:.6rem 1.4rem;font-size:.88rem" onclick="geSaveQ(${idx})">💾 บันทึก</button>
      </div>
      <div id="ge-form-msg" style="font-size:.85rem;margin-top:.5rem;text-align:center"></div>
    </div>`;
  document.body.appendChild(overlay);
}

function _geFormHtml(type, q){
  const qt = q?.question_text||'';
  const hint = q?.hint||'';
  const answers = q?.answers||[];

  // คำถามข้อความ (ทุก type)
  let html=`
    <div style="margin-bottom:.85rem">
      <label style="font-weight:700;font-size:.82rem;display:block;margin-bottom:.3rem">คำถาม *</label>
      <textarea id="ge-qtext" rows="3"
        style="width:100%;padding:.65rem .8rem;border:1.5px solid #E2E8F0;border-radius:10px;
          font-family:'Kanit',sans-serif;font-size:.88rem;resize:vertical;outline:none;box-sizing:border-box"
        onfocus="this.style.borderColor='var(--s)'" onblur="this.style.borderColor='#E2E8F0'"
      >${_geEsc(qt)}</textarea>
    </div>`;

  // hint (fill เท่านั้น)
  if(type==='fill'){
    html+=`<div style="margin-bottom:.85rem">
      <label style="font-weight:700;font-size:.82rem;display:block;margin-bottom:.3rem">💡 คำใบ้</label>
      <input id="ge-hint" type="text" class="fc" value="${_geEsc(hint)}"
        placeholder="เช่น สูตรคือ..." style="font-size:.85rem;padding:.55rem .8rem">
    </div>`;
  }

  // ตัวเลือก ตาม type
  html+='<div style="margin-bottom:1rem"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.5rem">';

  if(type==='mcq'){
    html+=`<label style="font-weight:700;font-size:.82rem">ตัวเลือก (เลือก ○ คำตอบที่ถูก)</label>
      <button type="button" onclick="geAddAnsRow()"
        style="background:#EEF2FF;color:var(--s);border:1px solid #C7D2FE;border-radius:8px;
          padding:.28rem .7rem;font-size:.78rem;font-family:'Kanit',sans-serif;cursor:pointer">+ เพิ่มตัวเลือก</button>`;
    html+='</div><div id="ge-ans-wrap">';
    const opts = answers.length ? answers : [{answer_text:'',is_correct:1},{answer_text:'',is_correct:0},{answer_text:'',is_correct:0},{answer_text:'',is_correct:0}];
    opts.forEach((a,i)=>{ html+=_geAnsRowMCQ(i,a.answer_text,a.is_correct); _geAnsCount=i+1; });
    html+='</div>';

  } else if(type==='truefalse'){
    const correctAns = answers.find(a=>a.is_correct)?.answer_text||'ถูก';
    html+=`<label style="font-weight:700;font-size:.82rem">คำตอบที่ถูก</label></div>
      <div id="ge-ans-wrap" style="display:flex;gap:1rem">
        <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;font-size:.9rem;font-weight:600">
          <input type="radio" name="ge-tf" value="ถูก" ${correctAns==='ถูก'?'checked':''} style="accent-color:var(--g)"> ✅ ถูก
        </label>
        <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;font-size:.9rem;font-weight:600">
          <input type="radio" name="ge-tf" value="ผิด" ${correctAns==='ผิด'?'checked':''} style="accent-color:#EF4444"> ❌ ผิด
        </label>
      </div>`;

  } else if(type==='fill'){
    const ans = answers.find(a=>a.is_correct)?.answer_text||'';
    html+=`<label style="font-weight:700;font-size:.82rem">คำตอบที่ถูกต้อง *</label></div>
      <div id="ge-ans-wrap">
        <input id="ge-fill-ans" type="text" class="fc" value="${_geEsc(ans)}"
          placeholder="คำตอบที่ถูก" style="font-size:.88rem;padding:.6rem .8rem">
      </div>`;

  } else if(type==='matching'){
    html+=`<label style="font-weight:700;font-size:.82rem">คู่จับคู่ (ซ้าย → ขวา)</label>
      <button type="button" onclick="geAddPairRow()"
        style="background:#EEF2FF;color:var(--s);border:1px solid #C7D2FE;border-radius:8px;
          padding:.28rem .7rem;font-size:.78rem;font-family:'Kanit',sans-serif;cursor:pointer">+ เพิ่มคู่</button>`;
    html+='</div><div id="ge-ans-wrap">';
    const pairs = answers.length ? answers : [{pair_left:'',pair_right:''}];
    pairs.forEach((a,i)=>{ html+=_gePairRow(i,a.pair_left||'',a.pair_right||''); _geAnsCount=i+1; });
    html+='</div>';

  } else if(type==='sequence'){
    html+=`<label style="font-weight:700;font-size:.82rem">รายการเรียงลำดับ</label>
      <button type="button" onclick="geAddSeqRow()"
        style="background:#EEF2FF;color:var(--s);border:1px solid #C7D2FE;border-radius:8px;
          padding:.28rem .7rem;font-size:.78rem;font-family:'Kanit',sans-serif;cursor:pointer">+ เพิ่มรายการ</button>`;
    html+='</div><div id="ge-ans-wrap">';
    const items = answers.length ? answers : [{answer_text:'',seq_order:1}];
    items.sort((a,b)=>(a.seq_order||0)-(b.seq_order||0));
    items.forEach((a,i)=>{ html+=_geSeqRow(i,a.answer_text,i+1); _geAnsCount=i+1; });
    html+='</div>';

  } else if(type==='wordsearch'){
    html+=`<label style="font-weight:700;font-size:.82rem">คำที่ต้องหา</label>
      <button type="button" onclick="geAddWordRow()"
        style="background:#EEF2FF;color:var(--s);border:1px solid #C7D2FE;border-radius:8px;
          padding:.28rem .7rem;font-size:.78rem;font-family:'Kanit',sans-serif;cursor:pointer">+ เพิ่มคำ</button>`;
    html+='</div><div id="ge-ans-wrap">';
    const words = answers.length ? answers : [{answer_text:''}];
    words.forEach((a,i)=>{ html+=_geWordRow(i,a.answer_text); _geAnsCount=i+1; });
    html+='</div>';
  } else {
    html+='</div>';
  }

  return html;
}

// ── Row builders ──
function _geAnsRowMCQ(i,text='',correct=false){
  return `<div id="ge-ar-${i}" style="display:flex;align-items:center;gap:.5rem;margin-bottom:.4rem">
    <input type="radio" name="ge-correct" value="${i}" ${correct?'checked':''} style="accent-color:var(--g);cursor:pointer;flex-shrink:0">
    <input type="text" value="${_geEsc(text)}" placeholder="ตัวเลือก ${i+1}" id="ge-at-${i}" class="fc"
      style="flex:1;padding:.5rem .75rem;font-size:.85rem">
    <button type="button" onclick="document.getElementById('ge-ar-${i}').remove()"
      style="background:none;border:none;color:#EF4444;cursor:pointer;font-size:1.1rem;padding:.1rem">✕</button>
  </div>`;
}
function _gePairRow(i,left='',right=''){
  return `<div id="ge-ar-${i}" style="display:flex;align-items:center;gap:.5rem;margin-bottom:.4rem">
    <input type="text" value="${_geEsc(left)}" placeholder="ฝั่งซ้าย" id="ge-pl-${i}" class="fc"
      style="flex:1;padding:.5rem .75rem;font-size:.85rem">
    <span style="color:var(--mu);font-weight:700">→</span>
    <input type="text" value="${_geEsc(right)}" placeholder="ฝั่งขวา" id="ge-pr-${i}" class="fc"
      style="flex:1;padding:.5rem .75rem;font-size:.85rem">
    <button type="button" onclick="document.getElementById('ge-ar-${i}').remove()"
      style="background:none;border:none;color:#EF4444;cursor:pointer;font-size:1.1rem;padding:.1rem">✕</button>
  </div>`;
}
function _geSeqRow(i,text='',order=1){
  return `<div id="ge-ar-${i}" style="display:flex;align-items:center;gap:.5rem;margin-bottom:.4rem">
    <span style="background:var(--s);color:#fff;width:24px;height:24px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;font-size:.78rem;font-weight:800;flex-shrink:0">${order}</span>
    <input type="text" value="${_geEsc(text)}" placeholder="รายการที่ ${order}" id="ge-at-${i}" class="fc"
      style="flex:1;padding:.5rem .75rem;font-size:.85rem">
    <button type="button" onclick="document.getElementById('ge-ar-${i}').remove()"
      style="background:none;border:none;color:#EF4444;cursor:pointer;font-size:1.1rem;padding:.1rem">✕</button>
  </div>`;
}
function _geWordRow(i,word=''){
  return `<div id="ge-ar-${i}" style="display:flex;align-items:center;gap:.5rem;margin-bottom:.4rem">
    <input type="text" value="${_geEsc(word)}" placeholder="คำที่ ${i+1}" id="ge-at-${i}" class="fc"
      style="flex:1;padding:.5rem .75rem;font-size:.85rem">
    <button type="button" onclick="document.getElementById('ge-ar-${i}').remove()"
      style="background:none;border:none;color:#EF4444;cursor:pointer;font-size:1.1rem;padding:.1rem">✕</button>
  </div>`;
}

function geAddAnsRow(){ const w=document.getElementById('ge-ans-wrap');if(!w)return;const d=document.createElement('div');d.innerHTML=_geAnsRowMCQ(_geAnsCount++);w.appendChild(d.firstElementChild); }
function geAddPairRow(){ const w=document.getElementById('ge-ans-wrap');if(!w)return;const d=document.createElement('div');d.innerHTML=_gePairRow(_geAnsCount++);w.appendChild(d.firstElementChild); }
function geAddSeqRow(){ const w=document.getElementById('ge-ans-wrap');if(!w)return;const cnt=document.querySelectorAll('[id^="ge-ar-"]').length+1;const d=document.createElement('div');d.innerHTML=_geSeqRow(_geAnsCount,``,cnt);w.appendChild(d.firstElementChild);_geAnsCount++; }
function geAddWordRow(){ const w=document.getElementById('ge-ans-wrap');if(!w)return;const d=document.createElement('div');d.innerHTML=_geWordRow(_geAnsCount++);w.appendChild(d.firstElementChild); }

async function geSaveGameSettings(){
  const input=document.getElementById('ge-time-limit');
  const msg=document.getElementById('ge-game-msg');
  const timeLimit=parseInt(input?.value,10);
  if(!Number.isFinite(timeLimit)||timeLimit<10||timeLimit>3600){
    if(msg) msg.innerHTML='<span style="color:#EF4444">❌ เวลาเล่นต้องอยู่ระหว่าง 10 ถึง 3600 วินาที</span>';
    return;
  }
  if(msg) msg.innerHTML='<span style="color:var(--mu)">⏳ กำลังบันทึกเวลาเล่น...</span>';
  const res=await apiSaveGameSettings({game_id:_geDbGid,time_limit:timeLimit}).catch(()=>({ok:false,error:'เชื่อมต่อไม่ได้'}));
  if(res.ok){
    if(_geGameMeta) _geGameMeta.time_limit=timeLimit;
    if(msg) msg.innerHTML='<span style="color:#10B981">✅ บันทึกเวลาเล่นสำเร็จ</span>';
    setTimeout(()=>{ if(msg) msg.innerHTML=''; },3000);
  }else{
    if(msg) msg.innerHTML=`<span style="color:#EF4444">❌ ${res.error||'บันทึกไม่สำเร็จ'}</span>`;
  }
}

async function geSaveQ(idx){
  const text=document.getElementById('ge-qtext')?.value.trim();
  const msg=document.getElementById('ge-form-msg');
  if(!text){if(msg)msg.innerHTML='<span style="color:#EF4444">⚠️ กรุณาใส่คำถาม</span>';return;}

  const gm=GAMES_DB[_geGid];
  const type=gm?.type||'mcq';
  const q=idx>=0?_geQuestions[idx]:null;
  const hint=document.getElementById('ge-hint')?.value.trim()||'';

  // สร้าง answers ตาม type
  let answers=[];
  if(type==='mcq'){
    const correctVal=document.querySelector('input[name="ge-correct"]:checked')?.value;
    document.querySelectorAll('[id^="ge-at-"]').forEach((el,i)=>{
      const t=el.value.trim();
      if(t) answers.push({answer_text:t,is_correct:String(i)===correctVal?1:0});
    });
  } else if(type==='truefalse'){
    const correct=document.querySelector('input[name="ge-tf"]:checked')?.value||'ถูก';
    answers=[{answer_text:'ถูก',is_correct:correct==='ถูก'?1:0},{answer_text:'ผิด',is_correct:correct==='ผิด'?1:0}];
  } else if(type==='fill'){
    const ans=document.getElementById('ge-fill-ans')?.value.trim();
    if(!ans){if(msg)msg.innerHTML='<span style="color:#EF4444">⚠️ ใส่คำตอบที่ถูก</span>';return;}
    answers=[{answer_text:ans,is_correct:1}];
  } else if(type==='matching'){
    for(let i=0;i<20;i++){
      const pl=document.getElementById(`ge-pl-${i}`);
      const pr=document.getElementById(`ge-pr-${i}`);
      if(!pl||!pr)continue;
      const l=pl.value.trim(),r=pr.value.trim();
      if(l&&r) answers.push({answer_text:l,is_correct:1,pair_left:l,pair_right:r});
    }
  } else if(type==='sequence'){
    document.querySelectorAll('[id^="ge-at-"]').forEach((el,i)=>{
      const t=el.value.trim();
      if(t) answers.push({answer_text:t,is_correct:1,seq_order:i+1});
    });
  } else if(type==='wordsearch'){
    document.querySelectorAll('[id^="ge-at-"]').forEach(el=>{
      const t=el.value.trim();
      if(t) answers.push({answer_text:t,is_correct:1});
    });
  }

  if(!answers.length){if(msg)msg.innerHTML='<span style="color:#EF4444">⚠️ ใส่คำตอบอย่างน้อย 1 รายการ</span>';return;}

  const payload={game_id:_geDbGid,question_text:text,hint,
    order_no:idx>=0?idx+1:_geQuestions.length+1,answers};
  if(q?.question_id) payload.question_id=q.question_id;

  if(msg)msg.innerHTML='<span style="color:var(--mu)">⏳ กำลังบันทึก...</span>';

  let res;
  try { res=await apiSaveQuestion(payload); }
  catch(e){ res={ok:false,error:'เชื่อมต่อ Docker container ไม่ได้ — ตรวจสอบว่า kidlearn_web รันอยู่'}; }

  if(res.ok){
    document.getElementById('ge-modal')?.remove();
    await selectGeGame(_geGid);
  } else {
    if(msg)msg.innerHTML=`<span style="color:#EF4444">❌ ${res.error||'บันทึกไม่สำเร็จ'}</span>`;
  }
}

async function geDeleteQ(idx){
  const q=_geQuestions[idx];if(!q)return;
  if(!confirm(`ลบคำถาม "${q.question_text}"?`))return;
  if(q.question_id){
    let res;
    try { res=await apiDeleteQuestion({question_id:q.question_id}); }
    catch(e){ alert('เชื่อมต่อไม่ได้');return; }
    if(!res.ok){alert('❌ ลบไม่สำเร็จ');return;}
  }
  await selectGeGame(_geGid);
}

function _geEsc(s){ return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
