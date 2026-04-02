// ══════════════════════════════════════════════════════
// MODAL
// ══════════════════════════════════════════════════════
let pendingGid=null, pendingLesson=1;
function openModal(gid, lessonNo){
  pendingGid=gid; pendingLesson=lessonNo||1;
  const gm=GAMES_DB[gid], sub=SUBS.find(s=>s.id===gm.sid);
  const TYPE_LBL={mcq:'ตอบปรนัย',truefalse:'จริง/เท็จ',fill:'เติมคำ',matching:'จับคู่',sequence:'เรียงลำดับ',wordsearch:'ค้นหาคำ'};
  const lessonNames=LESSON_NAMES||{};
  const lname=(lessonNames[gid]||[])[lessonNo-1]||`บทที่ ${lessonNo}`;
  document.getElementById('m-title').textContent=`${gm.icon} ${gm.name}`;
  document.getElementById('m-body').innerHTML=`
    <div style="font-size:.88rem;line-height:2.2;color:#374151">
      📚 <strong>${sub.name}</strong><br>
      📖 บทเรียน: <strong>${lessonNo}/6 — ${lname}</strong><br>
      🎯 ประเภท: ${TYPE_LBL[gm.type]}<br>
      ⏱ เวลา: ${gm.time} วิ<br>
      🏆 คะแนนเต็ม: 100
    </div>`;
  document.getElementById('gmodal').classList.add('show');
}
function closeModal(){
  document.getElementById('gmodal').classList.remove('show');
}
function startFromModal(){closeModal();startGame(pendingGid);}

// ══════════════════════════════════════════════════════
// GAME ENGINE — โหลดคำถามจาก DB
// ══════════════════════════════════════════════════════
async function startGame(gid){
  clearInterval(A.tmr);
  const gmStatic = GAMES_DB[gid];  // metadata เกม (icon, name, type ฯลฯ)
  A.curDbGameId  = typeof jsKeyToDbId==='function' ? jsKeyToDbId(gid) : parseInt(gid);

  // แสดง loading
  sec('game');
  document.getElementById('g-title').textContent = gmStatic?.name || 'กำลังโหลด...';
  document.getElementById('g-result').style.display  = 'none';
  document.getElementById('g-content').style.display = 'block';
  document.getElementById('g-content').innerHTML =
    '<div style="text-align:center;padding:3rem;color:var(--mu)">⏳ กำลังโหลดคำถาม...</div>';

  // โหลดคำถามจาก DB
  let gameData = null;
  try {
    const res = await apiPlayQuestions(A.curDbGameId);
    if (res.ok) gameData = res;
  } catch(e) { console.warn('[game] DB load failed, fallback to static:', e); }

  // Fallback: ใช้คำถามจาก data.js ถ้า DB ไม่มีหรือโหลดไม่ได้
  if (!gameData || _countQ(gameData) === 0) {
    console.log('[game] using static questions for', gid);
    gameData = _staticToGameData(gmStatic);
  }

  // merge metadata จาก static (icon, sid ฯลฯ)
  A.curGame = {
    ...gmStatic,
    // ข้อมูลจาก DB
    ...(gameData.game || {}),
    // คำถาม
    qs:    gameData.qs    || gmStatic?.qs    || [],
    pairs: gameData.pairs || gmStatic?.pairs || [],
    items: gameData.items || gmStatic?.items || [],
    words: gameData.words || gmStatic?.words || [],
    gridData: gmStatic?.gridData || null,
    // ใช้ type จาก static เป็นหลัก (DB อาจใช้ชื่อต่างกัน)
    type:  gmStatic?.type || gameData.type,
    time:  (parseInt(gameData.game?.time_limit, 10) > 0
      ? parseInt(gameData.game?.time_limit, 10)
      : (parseInt(gmStatic?.time, 10) > 0 ? parseInt(gmStatic.time, 10) : 60)),
  };

  const qCount = _countQ({
    qs: A.curGame.qs, pairs: A.curGame.pairs,
    items: A.curGame.items, words: A.curGame.words
  });

  A.gs = { gid, qi:0, earned:0, timeLeft:A.curGame.time, totalQ:qCount, lessonNo:pendingLesson };
  document.getElementById('g-title').textContent = A.curGame.name || gmStatic?.name;
  runTimer();
  renderGame();
}

function _countQ(d){
  return d?.qs?.length || d?.pairs?.length || d?.items?.length || d?.words?.length || 0;
}

// แปลง static game data เป็น format เดียวกับ DB response
function _staticToGameData(gm){
  if(!gm) return {};
  if(gm.type==='matching')  return { pairs: gm.pairs||[] };
  if(gm.type==='sequence')  return { items: gm.items||[] };
  if(gm.type==='wordsearch') return { words: gm.words||[] };
  return { qs: gm.qs||[] };
}

function runTimer(){
  clearInterval(A.tmr);upTimer();
  A.tmr=setInterval(()=>{A.gs.timeLeft--;upTimer();if(A.gs.timeLeft<=0){clearInterval(A.tmr);finishGame();}},1000);
}
function upTimer(){
  const el=document.getElementById('g-timer');
  el.textContent=`⏱ ${A.gs.timeLeft}`;
  el.classList.toggle('warn',A.gs.timeLeft<=10);
}
function renderGame(){
  const t=A.curGame.type;
  if(t==='mcq')          renderMCQ();
  else if(t==='truefalse') renderTF();
  else if(t==='fill')    renderFill();
  else if(t==='matching')  renderMatch();
  else if(t==='sequence')  renderSeq();
  else if(t==='wordsearch') renderWS();
}
function upQP(cur,tot){
  document.getElementById('g-qno').textContent=`${cur}/${tot}`;
  document.getElementById('g-qf').style.width=(tot?cur/tot*100:0)+'%';
  document.getElementById('g-live').textContent='คะแนน: '+A.gs.earned;
}

/* ── MCQ ── */
function renderMCQ(){
  const{qi,totalQ}=A.gs, q=A.curGame.qs[qi];
  if(!q){finishGame();return;}
  upQP(qi+1,totalQ);
  const letters=['A','B','C','D','E','F'];
  document.getElementById('g-content').innerHTML=`
    <div class="qt">${q.q}</div>
    <div class="choices">
      ${q.opts.map((o,i)=>`
        <button class="ch" onclick="ansMCQ(this,${i},${q.ans})" data-idx="${i}">
          <span class="ch-letter">${letters[i]||i+1}</span>
          <span class="ch-text">${o}</span>
        </button>`).join('')}
    </div>`;
}
function ansMCQ(btn,chose,correct){
  document.querySelectorAll('.ch').forEach(b=>b.disabled=true);
  if(chose===correct){
    btn.classList.add('ok');
    btn.innerHTML=`<span class="ch-letter ch-letter-ok">✓</span><span class="ch-text">${btn.querySelector('.ch-text').textContent}</span><span class="ch-fb">+${Math.round(100/A.gs.totalQ)}</span>`;
    A.gs.earned+=Math.round(100/A.gs.totalQ);
  } else {
    btn.classList.add('no');
    btn.innerHTML=`<span class="ch-letter ch-letter-no">✗</span><span class="ch-text">${btn.querySelector('.ch-text').textContent}</span>`;
    const cb=document.querySelectorAll('.ch')[correct];
    if(cb){cb.classList.add('ok');cb.innerHTML=`<span class="ch-letter ch-letter-ok">✓</span><span class="ch-text">${cb.querySelector('.ch-text').textContent}</span>`;}
  }
  document.getElementById('g-live').textContent='คะแนน: '+A.gs.earned;
  setTimeout(()=>{A.gs.qi++;renderMCQ();},1100);
}

/* ── TRUE/FALSE ── */
function renderTF(){
  const{qi,totalQ}=A.gs, q=A.curGame.qs[qi];
  if(!q){finishGame();return;}
  upQP(qi+1,totalQ);
  document.getElementById('g-content').innerHTML=`
    <div class="qt">${q.q}</div>
    <div class="tf">
      <button class="tfb t" onclick="ansTF(this,true,${q.ans})">
        <span style="font-size:2rem;display:block;margin-bottom:.3rem">✅</span>
        <span style="font-size:1.1rem;font-weight:800">จริง</span>
      </button>
      <button class="tfb f" onclick="ansTF(this,false,${q.ans})">
        <span style="font-size:2rem;display:block;margin-bottom:.3rem">❌</span>
        <span style="font-size:1.1rem;font-weight:800">เท็จ</span>
      </button>
    </div>`;
}
function ansTF(btn,chose,correct){
  document.querySelectorAll('.tfb').forEach(b=>b.disabled=true);
  const ok=chose===correct;
  btn.classList.add(ok?'ok':'no');
  if(ok){A.gs.earned+=Math.round(100/A.gs.totalQ);document.getElementById('g-live').textContent='คะแนน: '+A.gs.earned;}
  setTimeout(()=>{A.gs.qi++;renderTF();},1100);
}

/* ── FILL ── */
function renderFill(){
  const{qi,totalQ}=A.gs, q=A.curGame.qs[qi];
  if(!q){finishGame();return;}
  upQP(qi+1,totalQ);
  document.getElementById('g-content').innerHTML=`
    <div class="qt">${q.q}</div>
    ${q.hint?`<div class="hint-box">💡 คำใบ้: ${q.hint}</div>`:''}
    <input id="fi-inp" class="fi" placeholder="พิมพ์คำตอบ..." onkeydown="if(event.key==='Enter')chkFill()">
    <button class="btn btn-p" style="margin-top:.75rem;width:100%;padding:.9rem;font-size:1rem;border-radius:12px;font-weight:700" onclick="chkFill()">✔ ตรวจคำตอบ</button>`;
  setTimeout(()=>document.getElementById('fi-inp')?.focus(),80);
}
function chkFill(){
  const inp=document.getElementById('fi-inp');if(!inp)return;
  const ans=inp.value.trim(), correct=A.curGame.qs[A.gs.qi].ans;
  const ok=ans.toLowerCase()===String(correct).toLowerCase();
  inp.classList.add(ok?'ok':'no'); inp.disabled=true;
  document.querySelector('#g-content .btn')?.remove();
  if(ok){A.gs.earned+=Math.round(100/A.gs.totalQ);}
  else{
    const n=document.createElement('div');
    n.style.cssText='color:#991B1B;font-size:.85rem;margin-top:.6rem;font-weight:600;background:#FEF2F2;padding:.5rem .75rem;border-radius:8px;border-left:3px solid #EF4444';
    n.textContent='✅ เฉลย: '+correct;
    document.getElementById('g-content').appendChild(n);
  }
  document.getElementById('g-live').textContent='คะแนน: '+A.gs.earned;
  setTimeout(()=>{A.gs.qi++;renderFill();},1300);
}

/* ── MATCHING ── */
function renderMatch(){
  const pairs=A.curGame.pairs;
  if(!pairs?.length){finishGame();return;}
  const left=[...pairs].sort(()=>Math.random()-.5);
  const right=[...pairs].sort(()=>Math.random()-.5);
  let selL=null, matched=0;
  upQP(0,pairs.length);
  document.getElementById('g-content').innerHTML=`
    <div style="font-size:.83rem;color:var(--mu);margin-bottom:.8rem">คลิกฝั่งซ้าย → แล้วคลิกฝั่งขวาเพื่อจับคู่</div>
    <div class="mg">
      <div class="mc" id="ml">${left.map(p=>`<div class="mi" data-k="${p.left}" onclick="mL(this)">${p.left}</div>`).join('')}</div>
      <div class="mc" id="mr">${right.map(p=>`<div class="mi" data-k="${p.left}" onclick="mR(this)">${p.right}</div>`).join('')}</div>
    </div>`;
  window.mL=el=>{document.querySelectorAll('#ml .mi:not(.matched)').forEach(e=>e.classList.remove('sel'));el.classList.add('sel');selL=el.dataset.k;};
  window.mR=el=>{
    if(!selL||el.classList.contains('matched'))return;
    if(selL===el.dataset.k){
      document.querySelector(`#ml [data-k="${selL}"]`).classList.replace('sel','matched');
      el.classList.add('matched');matched++;
      A.gs.earned=Math.round(matched/pairs.length*100);
      document.getElementById('g-live').textContent='คะแนน: '+A.gs.earned;
      upQP(matched,pairs.length);
      if(matched===pairs.length){clearInterval(A.tmr);setTimeout(finishGame,600);}
    } else {el.classList.add('bad');setTimeout(()=>el.classList.remove('bad'),600);}
    selL=null;document.querySelectorAll('#ml .mi').forEach(e=>e.classList.remove('sel'));
  };
}

/* ── SEQUENCE ── */
function renderSeq(){
  const items=A.curGame.items;
  if(!items?.length){finishGame();return;}
  let cur=[...items].sort(()=>Math.random()-.5);
  upQP(0,items.length);
  const draw=()=>{
    document.getElementById('g-content').innerHTML=`
      <div style="font-size:.83rem;color:var(--mu);margin-bottom:.75rem">กดลูกศรเพื่อเรียงจากบนไปล่าง</div>
      <div class="seq">${cur.map((it,i)=>`
        <div class="si2" data-id="${it.id||it.text}">
          <div class="sn">${i+1}</div>
          <div style="flex:1">${it.text}</div>
          <div style="display:flex;flex-direction:column;gap:.15rem">
            <button onclick="mvSeq('${it.id||it.text}',-1)" style="border:none;background:#EEF2FF;border-radius:6px;cursor:pointer;padding:.15rem .5rem;font-size:.85rem;color:#3730A3">⬆</button>
            <button onclick="mvSeq('${it.id||it.text}',1)"  style="border:none;background:#EEF2FF;border-radius:6px;cursor:pointer;padding:.15rem .5rem;font-size:.85rem;color:#3730A3">⬇</button>
          </div>
        </div>`).join('')}
      </div>
      <button class="btn btn-p btn-sm" style="margin-top:.75rem;width:100%;padding:.75rem;border-radius:12px" onclick="chkSeq()">✔ ตรวจคำตอบ</button>`;
  };
  window.mvSeq=(id,dir)=>{const idx=cur.findIndex(it=>(it.id||it.text)===id),n=idx+dir;if(n<0||n>=cur.length)return;[cur[idx],cur[n]]=[cur[n],cur[idx]];draw();};
  window.chkSeq=()=>{
    document.querySelectorAll('.si2').forEach((el,i)=>el.classList.add(
      (cur[i].id||cur[i].text)===(items[i].id||items[i].text)?'ok':'no'
    ));
    A.gs.earned=Math.round(cur.filter((it,i)=>(it.id||it.text)===(items[i].id||items[i].text)).length/items.length*100);
    document.getElementById('g-live').textContent='คะแนน: '+A.gs.earned;
    document.querySelector('#g-content .btn')?.remove();
    setTimeout(finishGame,1500);
  };
  draw();
}

/* ── WORD SEARCH ── */
function renderWS(){
  // ถ้ามี gridData จาก static data
  const gridData = A.curGame.gridData;
  const words    = A.curGame.words;
  if(!words?.length){finishGame();return;}

  // สร้าง grid ใหม่ถ้าไม่มี gridData
  const gd = gridData || (A.curGame.sid===4 ? wsGridEn(words) : wsGrid(words));
  const{grid,placed}=gd;
  let found=[], sel=[];
  upQP(0,words.length);

  const draw=()=>{
    document.getElementById('g-content').innerHTML=`
      <div class="ws-wl">${words.map(w=>`<span class="wsw ${found.includes(w)?'fd':''}">${w}</span>`).join('')}</div>
      <div class="wsg" style="grid-template-columns:repeat(${grid[0].length},1fr)">
        ${grid.map((row,r)=>row.map((ch,c)=>{
          const isFd=found.some(fw=>{const p=placed.find(pl=>pl.word===fw);return p&&p.row===r&&p.cols.includes(c);});
          const isSel=sel.some(s=>s.r===r&&s.c===c);
          return `<div class="wsc${isFd?' fd':isSel?' hl':''}" data-r="${r}" data-c="${c}" onclick="wsClick(${r},${c})">${ch}</div>`;
        }).join('')).join('')}
      </div>
      <div style="font-size:.78rem;color:var(--mu);margin-top:.5rem">พบแล้ว ${found.length}/${words.length} คำ</div>`;
  };
  window.wsClick=(r,c)=>{
    sel.push({r,c});draw();
    if(sel.length===2){
      placed.forEach(p=>{
        if(!found.includes(p.word)){
          const covered=p.cols.every(col=>sel.some(s=>s.r===p.row&&s.c===col));
          if(covered&&sel.every(s=>s.r===p.row)){
            found.push(p.word);A.gs.earned=Math.round(found.length/words.length*100);
            document.getElementById('g-live').textContent='คะแนน: '+A.gs.earned;
          }
        }
      });
      sel=[];draw();upQP(found.length,words.length);
      if(found.length===words.length){clearInterval(A.tmr);setTimeout(finishGame,600);}
    }
  };
  draw();
}

/* ── FINISH ── */
function finishGame(){
  clearInterval(A.tmr);
  const sc=Math.min(100,Math.max(0,A.gs.earned)), pct=sc;
  document.getElementById('g-content').style.display='none';
  document.getElementById('g-result').style.display='block';
  document.getElementById('r-sc').textContent=sc;
  document.getElementById('r-mx').textContent='/ 100';
  document.getElementById('r-ring').style.background=`conic-gradient(var(--p) ${pct}%,#E5E7EB 0%)`;
  const[title,msg]=pct>=80?['🎉 ยอดเยี่ยม!','คุณทำได้ดีมากเลย!']:pct>=50?['👍 ดีทีเดียว!','ฝึกอีกนิดจะเก่งมาก!']:['💪 สู้ๆ!','ลองใหม่นะ ทำได้แน่!'];
  document.getElementById('r-ti').textContent=title;
  document.getElementById('r-mg').textContent=msg;

  if (A.role==='student') {
    const dbGid = A.curDbGameId || (typeof jsKeyToDbId==='function' ? jsKeyToDbId(A.gs.gid) : parseInt(A.gs.gid)) || 0;
    if(dbGid){
      apiSaveScore({
        game_id:    dbGid,
        lesson_no:  A.gs.lessonNo||1,
        score:      sc,
        time_spent: (A.curGame?.time||0)-(A.gs.timeLeft||0)
      }).then(res=>{
        if(res.ok) A.progDirty=true;
        else console.warn('[save_score]',res.error);
      }).catch(e=>console.error('[save_score]',e));
    }
  }
}

function replayGame(){
  document.getElementById('g-result').style.display='none';
  document.getElementById('g-content').style.display='block';
  startGame(A.gs.gid);
}
