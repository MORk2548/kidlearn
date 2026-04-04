// ══════════════════════════════════════════════════════
// MODAL
// ══════════════════════════════════════════════════════
let pendingGid=null, pendingLesson=1;
async function openModal(gid, lessonNo){
  pendingGid=gid; pendingLesson=lessonNo||1;
  const gm=GAMES_DB[gid], sub=SUBS.find(s=>s.id===gm.sid);
  const TYPE_LBL={mcq:'ตอบปรนัย',truefalse:'จริง/เท็จ',fill:'เติมคำ',matching:'จับคู่',sequence:'เรียงลำดับ',wordsearch:'ค้นหาคำ'};
  const lessonNames=LESSON_NAMES||{};
  const lname=(lessonNames[gid]||[])[lessonNo-1]||`บทที่ ${lessonNo}`;
  let gameName=gm.name;
  let gameType=gm.type;
  let timeLimit=gm.time;
  const dbGameId=A.curDbGameId || (typeof jsKeyToDbId==='function' ? jsKeyToDbId(gid) : parseInt(gid));
  if (dbGameId) {
    try {
      const res = await apiPlayQuestions(dbGameId);
      if (res?.ok) {
        gameName = res.game?.name || gameName;
        gameType = res.game?.game_type || gameType;
        timeLimit = parseInt(res.game?.time_limit, 10) > 0 ? parseInt(res.game.time_limit, 10) : timeLimit;
      }
    } catch(e) {
      console.warn('[openModal] failed to load DB game meta', e);
    }
  }
  document.getElementById('m-title').textContent=`${gm.icon} ${gameName}`;
  document.getElementById('m-body').innerHTML=`
    <div style="font-size:.88rem;line-height:2.2;color:#374151">
      📚 <strong>${sub.name}</strong><br>
      📖 บทเรียน: <strong>${lessonNo}/6 — ${lname}</strong><br>
      🎯 ประเภท: ${TYPE_LBL[gameType]||gameType}<br>
      ⏱ เวลา: ${timeLimit} วิ<br>
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
  cleanupGameInteraction();
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
function cleanupGameInteraction(){
  if(typeof A.gameCleanup==='function'){
    try{A.gameCleanup();}catch(e){console.warn('[game] cleanup failed',e);}
  }
  A.gameCleanup=null;
}
function shuffleItems(arr){
  const copy=[...arr];
  for(let i=copy.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [copy[i],copy[j]]=[copy[j],copy[i]];
  }
  return copy;
}
function wsLineKey(cells){
  return cells.map(cell=>`${cell.r},${cell.c}`).join('|');
}
function wsBuildGridLocal(words, alphabet){
  const cleaned=(words||[]).map(w=>String(w||'').trim()).filter(Boolean);
  const longest=Math.max(1,...cleaned.map(w=>[...w].length));
  const minSize=Math.max(10,longest+2,Math.ceil(Math.sqrt(cleaned.join('').length))+2);
  const dirs=[
    {dr:0,dc:1},{dr:1,dc:0},{dr:1,dc:1},{dr:1,dc:-1},
    {dr:0,dc:-1},{dr:-1,dc:0},{dr:-1,dc:-1},{dr:-1,dc:1}
  ];

  for(let size=minSize;size<=minSize+4;size++){
    const grid=Array.from({length:size},()=>Array.from({length:size},()=>null));
    const placed=[];
    let ok=true;

    for(const word of shuffleItems(cleaned).sort((a,b)=>[...b].length-[...a].length)){
      const chars=[...word];
      let placedWord=false;

      for(let tries=0;tries<300 && !placedWord;tries++){
        const dir=dirs[Math.floor(Math.random()*dirs.length)];
        const startR=Math.floor(Math.random()*size);
        const startC=Math.floor(Math.random()*size);
        const endR=startR+(chars.length-1)*dir.dr;
        const endC=startC+(chars.length-1)*dir.dc;
        if(endR<0||endR>=size||endC<0||endC>=size) continue;

        const cells=chars.map((ch,idx)=>({
          r:startR+idx*dir.dr,
          c:startC+idx*dir.dc,
          ch
        }));
        if(!cells.every(cell=>{
          const existing=grid[cell.r][cell.c];
          return existing===null || existing===cell.ch;
        })) continue;

        cells.forEach(cell=>{grid[cell.r][cell.c]=cell.ch;});
        const line=cells.map(({r,c})=>({r,c}));
        placed.push({
          word,
          cells: line,
          key: wsLineKey(line),
          reverseKey: wsLineKey([...line].reverse())
        });
        placedWord=true;
      }

      if(!placedWord){
        ok=false;
        break;
      }
    }

    if(!ok) continue;

    for(let r=0;r<size;r++){
      for(let c=0;c<size;c++){
        if(grid[r][c]===null){
          grid[r][c]=alphabet[Math.floor(Math.random()*alphabet.length)];
        }
      }
    }
    return {grid,placed};
  }

  const fallbackSize=Math.max(minSize,longest);
  const fallbackGrid=Array.from({length:fallbackSize},()=>Array.from({length:fallbackSize},()=>alphabet[Math.floor(Math.random()*alphabet.length)]));
  const fallbackPlaced=[];
  cleaned.forEach((word,rowIdx)=>{
    const row=rowIdx%fallbackSize;
    const line=[...word].slice(0,fallbackSize).map((ch,colIdx)=>{
      fallbackGrid[row][colIdx]=ch;
      return {r:row,c:colIdx};
    });
    fallbackPlaced.push({
      word,
      cells: line,
      key: wsLineKey(line),
      reverseKey: wsLineKey([...line].reverse())
    });
  });
  return {grid:fallbackGrid,placed:fallbackPlaced};
}
function getWSGrid(words, sid){
  return sid===4
    ? wsBuildGridLocal(words,'abcdefghijklmnopqrstuvwxyz')
    : wsBuildGridLocal(words,'กขคงจฉชซดตถทธนบปผพฝฟมยรลวศษสหอฮ');
}
function getLineCells(start,end){
  if(!start||!end) return [];
  const dRow=end.r-start.r;
  const dCol=end.c-start.c;
  const stepRow=Math.sign(dRow);
  const stepCol=Math.sign(dCol);
  if(!(dRow===0 || dCol===0 || Math.abs(dRow)===Math.abs(dCol))) return [start];
  const len=Math.max(Math.abs(dRow),Math.abs(dCol));
  return Array.from({length:len+1},(_,idx)=>({
    r:start.r+(stepRow*idx),
    c:start.c+(stepCol*idx)
  }));
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
  cleanupGameInteraction();
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

function renderSeq(){
  const items=A.curGame.items;
  if(!items?.length){finishGame();return;}
  cleanupGameInteraction();
  let cur=shuffleItems(items);
  const drag={active:false,id:null,pointerId:null};
  upQP(0,items.length);

  const draw=()=>{
    document.getElementById('g-content').innerHTML=`
      <div style="font-size:.83rem;color:var(--mu);margin-bottom:.75rem">ลากด้วยนิ้วหรือเมาส์เพื่อเรียงลำดับ และใช้ปุ่มขึ้นลงได้ถ้าต้องการ</div>
      <div class="seq">${cur.map((it,i)=>`
        <div class="si2${drag.active&&drag.id===(it.id||it.text)?' dragging':''}" data-id="${it.id||it.text}">
          <div class="sn">${i+1}</div>
          <div class="si2-text">${it.text}</div>
          <div class="si2-tools">
            <span class="si2-grip" aria-hidden="true">⋮⋮</span>
            <div style="display:flex;flex-direction:column;gap:.15rem">
              <button type="button" onclick="mvSeq('${it.id||it.text}',-1)" style="border:none;background:#EEF2FF;border-radius:6px;cursor:pointer;padding:.15rem .5rem;font-size:.85rem;color:#3730A3">โฌ</button>
              <button type="button" onclick="mvSeq('${it.id||it.text}',1)"  style="border:none;background:#EEF2FF;border-radius:6px;cursor:pointer;padding:.15rem .5rem;font-size:.85rem;color:#3730A3">โฌ</button>
            </div>
          </div>
        </div>`).join('')}
      </div>
      <button class="btn btn-p btn-sm" style="margin-top:.75rem;width:100%;padding:.75rem;border-radius:12px" onclick="chkSeq()">โ” เธ•เธฃเธงเธเธเธณเธ•เธญเธ</button>`;

    document.querySelectorAll('.si2').forEach(el=>{
      el.addEventListener('pointerdown',ev=>{
        if(ev.target.closest('button')) return;
        drag.active=true;
        drag.id=el.dataset.id;
        drag.pointerId=ev.pointerId;
        el.setPointerCapture?.(ev.pointerId);
        ev.preventDefault();
        draw();
      });
    });
  };

  window.mvSeq=(id,dir)=>{
    const idx=cur.findIndex(it=>(it.id||it.text)===id);
    const nextIdx=idx+dir;
    if(idx<0 || nextIdx<0 || nextIdx>=cur.length) return;
    [cur[idx],cur[nextIdx]]=[cur[nextIdx],cur[idx]];
    draw();
  };
  window.chkSeq=()=>{
    document.querySelectorAll('.si2').forEach((el,i)=>el.classList.add(
      (cur[i].id||cur[i].text)===(items[i].id||items[i].text)?'ok':'no'
    ));
    A.gs.earned=Math.round(cur.filter((it,i)=>(it.id||it.text)===(items[i].id||items[i].text)).length/items.length*100);
    document.getElementById('g-live').textContent='เธเธฐเนเธเธ: '+A.gs.earned;
    document.querySelector('#g-content .btn')?.remove();
    setTimeout(finishGame,1500);
  };

  const moveDragged=(clientX,clientY)=>{
    if(!drag.active) return;
    const target=document.elementFromPoint(clientX,clientY)?.closest('.si2');
    if(!target || target.dataset.id===drag.id) return;
    const fromIdx=cur.findIndex(it=>(it.id||it.text)===drag.id);
    const targetIdx=cur.findIndex(it=>(it.id||it.text)===target.dataset.id);
    if(fromIdx<0 || targetIdx<0) return;
    const rect=target.getBoundingClientRect();
    let insertIdx=targetIdx+(clientY>(rect.top+rect.height/2)?1:0);
    if(fromIdx<insertIdx) insertIdx--;
    if(insertIdx===fromIdx) return;
    const [moved]=cur.splice(fromIdx,1);
    cur.splice(insertIdx,0,moved);
    draw();
  };
  const onPointerMove=ev=>{
    if(!drag.active || (drag.pointerId!==null && ev.pointerId!==drag.pointerId)) return;
    ev.preventDefault();
    moveDragged(ev.clientX,ev.clientY);
  };
  const onPointerUp=ev=>{
    if(!drag.active || (drag.pointerId!==null && ev.pointerId!==drag.pointerId)) return;
    drag.active=false;
    drag.id=null;
    drag.pointerId=null;
    draw();
  };

  window.addEventListener('pointermove',onPointerMove,{passive:false});
  window.addEventListener('pointerup',onPointerUp);
  window.addEventListener('pointercancel',onPointerUp);
  A.gameCleanup=()=>{
    window.removeEventListener('pointermove',onPointerMove);
    window.removeEventListener('pointerup',onPointerUp);
    window.removeEventListener('pointercancel',onPointerUp);
    delete window.mvSeq;
    delete window.chkSeq;
  };
  draw();
}

function renderWS(){
  const words=A.curGame.words;
  if(!words?.length){finishGame();return;}
  cleanupGameInteraction();
  const {grid,placed}=getWSGrid(words,A.curGame.sid);
  const placedMap=new Map(placed.map(p=>[p.word,p]));
  let found=[];
  let selection=[];
  const drag={active:false,start:null,pointerId:null};
  upQP(0,words.length);

  const isFoundCell=(r,c)=>found.some(word=>placedMap.get(word)?.cells.some(cell=>cell.r===r&&cell.c===c));
  const finishSelection=()=>{
    if(!selection.length) return;
    const key=wsLineKey(selection);
    const match=placed.find(p=>!found.includes(p.word) && (p.key===key || p.reverseKey===key));
    if(match){
      found.push(match.word);
      A.gs.earned=Math.round(found.length/words.length*100);
      document.getElementById('g-live').textContent='เธเธฐเนเธเธ: '+A.gs.earned;
      upQP(found.length,words.length);
      if(found.length===words.length){
        draw();
        clearInterval(A.tmr);
        setTimeout(finishGame,600);
        return;
      }
    }
    selection=[];
    draw();
  };
  const updateSelection=(endCell)=>{
    if(!drag.start || !endCell) return;
    selection=getLineCells(drag.start,endCell);
    draw();
  };
  const getCellFromPoint=(clientX,clientY)=>{
    const cell=document.elementFromPoint(clientX,clientY)?.closest('.wsc');
    if(!cell) return null;
    return {r:Number(cell.dataset.r),c:Number(cell.dataset.c)};
  };
  const draw=()=>{
    document.getElementById('g-content').innerHTML=`
      <div class="ws-wl">${words.map(w=>`<span class="wsw ${found.includes(w)?'fd':''}">${w}</span>`).join('')}</div>
      <div class="wsg" style="grid-template-columns:repeat(${grid[0].length},1fr)">
        ${grid.map((row,r)=>row.map((ch,c)=>{
          const isSel=selection.some(cell=>cell.r===r&&cell.c===c);
          return `<div class="wsc${isFoundCell(r,c)?' fd':isSel?' hl':''}" data-r="${r}" data-c="${c}">${ch}</div>`;
        }).join('')).join('')}
      </div>
      <div style="font-size:.78rem;color:var(--mu);margin-top:.5rem">ลากผ่านคำในตารางเพื่อเลือกคำที่ต้องหา พบแล้ว ${found.length}/${words.length} คำ</div>`;

    document.querySelector('.wsg')?.addEventListener('pointerdown',ev=>{
      const cell=ev.target.closest('.wsc');
      if(!cell) return;
      drag.active=true;
      drag.pointerId=ev.pointerId;
      drag.start={r:Number(cell.dataset.r),c:Number(cell.dataset.c)};
      selection=[drag.start];
      cell.setPointerCapture?.(ev.pointerId);
      ev.preventDefault();
      draw();
    });
  };

  const onPointerMove=ev=>{
    if(!drag.active || (drag.pointerId!==null && ev.pointerId!==drag.pointerId)) return;
    ev.preventDefault();
    updateSelection(getCellFromPoint(ev.clientX,ev.clientY));
  };
  const onPointerUp=ev=>{
    if(!drag.active || (drag.pointerId!==null && ev.pointerId!==drag.pointerId)) return;
    drag.active=false;
    drag.pointerId=null;
    drag.start=null;
    finishSelection();
  };

  window.addEventListener('pointermove',onPointerMove,{passive:false});
  window.addEventListener('pointerup',onPointerUp);
  window.addEventListener('pointercancel',onPointerUp);
  A.gameCleanup=()=>{
    window.removeEventListener('pointermove',onPointerMove);
    window.removeEventListener('pointerup',onPointerUp);
    window.removeEventListener('pointercancel',onPointerUp);
  };
  draw();
}
