// ══════════════════════════════════════════════════════
// MODAL
// ══════════════════════════════════════════════════════
let pendingGid=null, pendingLesson=1, pendingDifficulty='medium';
async function openModal(gid, lessonNo){
  pendingGid=gid; pendingLesson=lessonNo||1;
  const gm=GAMES_DB[gid], sub=SUBS.find(s=>s.id===gm.sid);
  const TYPE_LBL={mcq:'ตอบปรนัย',truefalse:'จริง/เท็จ',fill:'เติมคำ',matching:'จับคู่',sequence:'เรียงลำดับ',letterorder:'เรียงตัวอักษร',wordsearch:'ค้นหาคำ'};
  const lessonNames=LESSON_NAMES||{};
  const lname=(lessonNames[gid]||[])[lessonNo-1]||`บทที่ ${lessonNo}`;
  let gameName=gm.name;
  let gameType=gm.type;
  let timeLimit=gm.time;
  const dbGameId=A.curDbGameId || (typeof jsKeyToDbId==='function' ? jsKeyToDbId(gid) : parseInt(gid));
  renderGameModal(gm, sub, TYPE_LBL, gameName, gameType, timeLimit);
  document.getElementById('gmodal').classList.add('show');
  if (gm.code && window.MathKit?.hasMissions(gm.code)) return;

  if (dbGameId) {
    loadPlayQuestionsFast(dbGameId, gm).then(res=>{
      if (res?.ok) {
        if (pendingGid !== gid) return;
        gameName = res.game?.name || gameName;
        gameType = res.game?.game_type || gameType;
        timeLimit = parseInt(res.game?.time_limit, 10) > 0 ? parseInt(res.game.time_limit, 10) : timeLimit;
        renderGameModal(gm, sub, TYPE_LBL, gameName, gameType, timeLimit);
      }
    }).catch(e=>{
      console.warn('[openModal] failed to load DB game meta', e);
    });
  }
}
function renderGameModal(gm, sub, typeLabel, gameName, gameType, timeLimit){
  const missionGame=Boolean(gm.code && window.MathKit?.hasMissions(gm.code));
  document.getElementById('m-title').textContent=`${gm.icon} ${gameName}`;
  document.getElementById('m-body').innerHTML=`
    <div style="font-size:.88rem;line-height:2.2;color:#374151">
      📚 <strong>${sub.name}</strong><br>
      ${missionGame
        ?`🧩 ภารกิจหลายขั้นตอน: คำนวณ วางแผน และตรวจคำตอบ<br>⏱ เวลา: ${Math.round(timeLimit/60)} นาที (ไม่เน้นความเร็ว)<br>🏆 คะแนนเต็ม: 100 รวมโบนัสไม่ใช้คำใบ้`
        :`🎯 ประเภท: ${typeLabel[gameType]||gameType}<br>⏱ เวลา: ${timeLimit} วิ<br>🏆 คะแนนเต็ม: 100`}
    </div>
    ${gm.code?`<label class="math-difficulty-label" for="math-difficulty">เลือกระดับความยาก</label>
      <select id="math-difficulty" class="math-difficulty" onchange="pendingDifficulty=this.value">
        <option value="easy" ${pendingDifficulty==='easy'?'selected':''}>🌱 ง่าย</option>
        <option value="medium" ${pendingDifficulty==='medium'?'selected':''}>🚀 ปานกลาง</option>
        <option value="hard" ${pendingDifficulty==='hard'?'selected':''}>🐉 ยาก</option>
        ${missionGame?`<option value="challenge" ${pendingDifficulty==='challenge'?'selected':''}>🏆 ท้าทายพิเศษ</option>`:''}
      </select>`:''}`;
}
function closeModal(){
  document.getElementById('gmodal').classList.remove('show');
}
function startFromModal(){
  const selected=document.getElementById('math-difficulty');
  if(selected) pendingDifficulty=selected.value;
  closeModal();startGame(pendingGid);
}

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
  document.getElementById('g-feedback').hidden = true;
  document.getElementById('s-game').classList.remove('mission-complete');
  document.getElementById('g-content').innerHTML =
    '<div style="text-align:center;padding:3rem;color:var(--mu)">⏳ กำลังโหลดคำถาม...</div>';
  if (gmStatic?.code && window.MathKit?.hasMissions(gmStatic.code)) {
    startMissionGame(gid, gmStatic);
    return;
  }

  // โหลดคำถามจาก DB แต่ fallback ให้เร็วถ้า API ช้า เพื่อไม่ให้เกมค้างที่ loading
  let gameData = null;
  try {
    if(!A.curDbGameId) throw new Error('เกมนี้ยังไม่ได้เชื่อมกับฐานข้อมูล');
    const res = await loadPlayQuestionsFast(A.curDbGameId, gmStatic);
    if (res.ok) gameData = res;
  } catch(e) { console.warn('[game] DB load failed, fallback to static:', e); }
  gameData = normalizePreferredGameData(gmStatic, gameData);

  // Fallback: ใช้คำถามจาก data.js ถ้า DB ไม่มีหรือโหลดไม่ได้
  if (!gameData || _countQ(gameData) === 0 || shouldUseStaticGameData(gmStatic, gameData)) {
    console.log('[game] using static questions for', gid);
    gameData = _staticToGameData(gmStatic);
  }

  // merge metadata จาก static (icon, sid ฯลฯ)
  const questionSource = Array.isArray(gameData?.qs) && gameData.qs.length ? gameData.qs : (gmStatic?.qs||[]);
  // Only games with a difficulty picker (gm.code) filter by level; others play every question.
  const levelQuestions = gmStatic?.code
    ? questionSource.filter(q=>!q.difficulty || q.difficulty===pendingDifficulty)
    : questionSource;
  const selectedQuestions = shuffleItems(levelQuestions).slice(0,10).map(question=>{
    if(!Array.isArray(question.opts))return question;
    const choices=shuffleItems(question.opts.map((option,index)=>({option,isCorrect:index===Number(question.ans)})));
    return {...question,opts:choices.map(choice=>choice.option),ans:choices.findIndex(choice=>choice.isCorrect)};
  });
  A.curGame = {
    ...gmStatic,
    // ข้อมูลจาก DB
    ...(gameData.game || {}),
    // คำถาม
    qs:    selectedQuestions,
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
  if (gmStatic?.preferStatic) {
    A.curGame.name = gmStatic?.name || A.curGame.name;
    A.curGame.icon = gmStatic?.icon || A.curGame.icon;
    A.curGame.type = gmStatic?.type || A.curGame.type;
  }

  const qCount = _countQ({
    qs: A.curGame.qs, pairs: A.curGame.pairs,
    items: A.curGame.items, words: A.curGame.words
  });

  A.gs = { gid, qi:0, earned:0, timeLeft:A.curGame.time, totalQ:qCount, lessonNo:pendingLesson, attempts:[], wrongQuestions:[] };
  document.getElementById('g-title').textContent = A.curGame.name || gmStatic?.name;
  runTimer();
  renderGame();
}

function _countQ(d){
  return d?.qs?.length || d?.pairs?.length || d?.items?.length || d?.words?.length || 0;
}
function loadPlayQuestionsFast(dbGameId, gmStatic){
  const hasStaticQuestions = _countQ(gmStatic) > 0;
  if(!hasStaticQuestions) return apiPlayQuestions(dbGameId);
  const timeoutMs = 2500;
  return Promise.race([
    apiPlayQuestions(dbGameId),
    new Promise(resolve=>setTimeout(()=>resolve({ok:false,error:'โหลดคำถามจากเซิร์ฟเวอร์ช้า ใช้ชุดคำถามสำรอง'}), timeoutMs))
  ]);
}
function hasQuestionImageData(qs){
  return Array.isArray(qs) && qs.some(q=>String(q?.img || '').trim() !== '');
}
function shouldUseStaticGameData(gmStatic, gameData){
  if(!gmStatic?.preferStatic) return false;
  if(gmStatic.type === 'fill'){
    return !hasQuestionImageData(gameData?.qs);
  }
  return true;
}
function normalizePreferredGameData(gmStatic, gameData){
  if(!gmStatic?.preferStatic || gmStatic?.type !== 'fill' || !Array.isArray(gameData?.qs)) return gameData;
  const normalizedQs = gameData.qs.map(q=>{
    const hasOptions = Array.isArray(q?.opts);
    const answerFromOptions = hasOptions
      ? q.opts?.[Number.isInteger(q?.ans) ? q.ans : parseInt(q?.ans,10)] ?? ''
      : '';
    return {
      q: q?.q || '',
      img: q?.img || '',
      hint: q?.hint || '',
      ans: String(q?.ans ?? '').trim() && !hasOptions ? q.ans : answerFromOptions
    };
  }).filter(q=>q.q || q.img || q.ans);
  return { ...gameData, qs: normalizedQs };
}

function currentSkillMeta(){
  const sid = A.curGame?.sid;
  const skillMap = {
    1: { key:'math_foundation', name:'พื้นฐานคณิตศาสตร์' },
    2: { key:'science_concepts', name:'แนวคิดวิทยาศาสตร์' },
    3: { key:'thai_language', name:'ภาษาไทย' },
    4: { key:'english_language', name:'ภาษาอังกฤษ' },
    5: { key:'social_studies', name:'สังคมศึกษา' },
    6: { key:'health_education', name:'สุขศึกษา' }
  };
  return skillMap[sid] || { key:'general_learning', name:'ทักษะการเรียนรู้' };
}

function recordAttempt({ prompt='', correctAnswer='', studentAnswer='', isCorrect=false, questionKey='', wrongQuestion=null }){
  if(!A.gs) return;
  const skill=currentSkillMeta();
  A.gs.attempts = A.gs.attempts || [];
  A.gs.attempts.push({
    question_key: questionKey || `q${A.gs.qi + 1}`,
    prompt,
    correct_answer: String(correctAnswer ?? ''),
    student_answer: String(studentAnswer ?? ''),
    is_correct: !!isCorrect,
    skill_key: skill.key,
    skill_name: skill.name
  });
  if(!isCorrect && wrongQuestion){
    A.gs.wrongQuestions = A.gs.wrongQuestions || [];
    A.gs.wrongQuestions.push(wrongQuestion);
  }
}

// แปลง static game data เป็น format เดียวกับ DB response
function _staticToGameData(gm){
  if(!gm) return {};
  if(gm.type==='matching')  return { pairs: gm.pairs||[] };
  if(gm.type==='sequence' || gm.type==='letterorder')  return { items: gm.items||[] };
  if(gm.type==='wordsearch') return { words: gm.words||[] };
  return { qs: gm.qs||[] };
}
function cleanupGameInteraction(){
  if(typeof A.gameCleanup==='function'){
    try{A.gameCleanup();}catch(e){console.warn('[game] cleanup failed',e);}
  }
  A.gameCleanup=null;
}
function renderQuestionImage(q){
  if(!q?.img) return '';
  const alt = q?.imgAlt || 'question image';
  return `
    <div style="margin-bottom:1rem;text-align:center">
      <img src="${q.img}" alt="${alt}" style="max-width:100%;width:min(100%,320px);border-radius:18px;border:1px solid #DBEAFE;box-shadow:0 10px 24px rgba(37,99,235,.12);background:#F8FAFC">
    </div>`;
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
  const t=A.gs.timeLeft;
  el.textContent=A.curGame?.missions?`⏱ ${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`:`⏱ ${t}`;
  el.setAttribute('aria-label',`เวลาที่เหลือ ${A.gs.timeLeft} วินาที`);
  el.classList.toggle('warn',A.gs.timeLeft<=10);
}
function animateQuestionEntry(){
  const content=document.getElementById('g-content');
  const feedback=document.getElementById('g-feedback');
  if(feedback) feedback.hidden=true;
  content.classList.remove('question-enter');
  void content.offsetWidth;
  content.classList.add('question-enter');
}
function announceGameFeedback(isCorrect, customMessage){
  const feedback=document.getElementById('g-feedback');
  if(!feedback) return;
  feedback.hidden=false;
  feedback.classList.toggle('is-correct',!!isCorrect);
  feedback.classList.toggle('is-incorrect',!isCorrect);
  feedback.textContent=customMessage || (isCorrect ? '✨ ถูกต้อง! เดินทางต่อกันเลย' : '🌱 ไม่เป็นไร ลองดูเฉลยแล้วไปต่อ');
}
function renderGame(){
  if(A.curGame?.missions){renderMission();return;}
  const t=A.curGame.type;
  if(t==='mcq')          renderMCQ();
  else if(t==='truefalse') renderTF();
  else if(t==='fill')    renderFill();
  else if(t==='matching')  renderMatch();
  else if(t==='sequence' || t==='letterorder')  renderSeq();
  else if(t==='wordsearch') renderWS();
  else finishGame();
}
function upQP(cur,tot){
  document.getElementById('g-qno').textContent=`${cur}/${tot}`;
  const pct=tot?Math.round(cur/tot*100):0;
  document.getElementById('g-qf').style.width=pct+'%';
  document.querySelector('.qpb').setAttribute('aria-valuenow',pct);
  document.getElementById('g-live').innerHTML=`<span aria-hidden="true">⭐</span> คะแนน ${A.gs.earned}`;
}

/* ── MCQ ── */
function renderMCQ(){
  const{qi,totalQ}=A.gs, q=A.curGame.qs[qi];
  if(!q){finishGame();return;}
  upQP(qi+1,totalQ);
  const letters=['A','B','C','D','E','F'];
  document.getElementById('g-content').innerHTML=`
    ${renderQuestionImage(q)}
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
  const q = A.curGame.qs[A.gs.qi];
  if(chose===correct){
    recordAttempt({
      prompt: q?.q || '',
      correctAnswer: q?.opts?.[correct] ?? correct,
      studentAnswer: q?.opts?.[chose] ?? chose,
      isCorrect: true
    });
    btn.classList.add('ok');
    btn.innerHTML=`<span class="ch-letter ch-letter-ok">✓</span><span class="ch-text">${btn.querySelector('.ch-text').textContent}</span><span class="ch-fb">+${Math.round(100/A.gs.totalQ)}</span>`;
    A.gs.earned+=Math.round(100/A.gs.totalQ);
  } else {
    recordAttempt({
      prompt: q?.q || '',
      correctAnswer: q?.opts?.[correct] ?? correct,
      studentAnswer: q?.opts?.[chose] ?? chose,
      isCorrect: false,
      wrongQuestion: q ? { ...q } : null
    });
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
  const trueLabel=q.trueLabel||'จริง';
  const falseLabel=q.falseLabel||'เท็จ';
  document.getElementById('g-content').innerHTML=`
    ${renderQuestionImage(q)}
    <div class="qt">${q.q}</div>
    <div class="tf">
      <button class="tfb t" onclick="ansTF(this,true,${q.ans})">
        <span style="font-size:2rem;display:block;margin-bottom:.3rem">✅</span>
        <span style="font-size:1.1rem;font-weight:800">${trueLabel}</span>
      </button>
      <button class="tfb f" onclick="ansTF(this,false,${q.ans})">
        <span style="font-size:2rem;display:block;margin-bottom:.3rem">❌</span>
        <span style="font-size:1.1rem;font-weight:800">${falseLabel}</span>
      </button>
      </div>`;
  animateQuestionEntry();
}
function ansTF(btn,chose,correct){
  document.querySelectorAll('.tfb').forEach(b=>b.disabled=true);
  const ok=chose===correct;
  const q=A.curGame.qs[A.gs.qi];
  const trueLabel=q?.trueLabel||'จริง';
  const falseLabel=q?.falseLabel||'เท็จ';
  recordAttempt({
    prompt: q?.q || '',
    correctAnswer: correct ? trueLabel : falseLabel,
    studentAnswer: chose ? trueLabel : falseLabel,
    isCorrect: ok,
    wrongQuestion: ok || !q ? null : { ...q }
  });
  btn.classList.add(ok?'ok':'no');
  if(ok){A.gs.earned+=Math.round(100/A.gs.totalQ);document.getElementById('g-live').innerHTML=`<span aria-hidden="true">⭐</span> คะแนน ${A.gs.earned}`;}
  announceGameFeedback(ok);
  setTimeout(()=>{A.gs.qi++;renderTF();},1100);
}

/* ── FILL ── */
function renderFill(){
  const{qi,totalQ}=A.gs, q=A.curGame.qs[qi];
  if(!q){finishGame();return;}
  upQP(qi+1,totalQ);
  document.getElementById('g-content').innerHTML=`
    ${renderQuestionImage(q)}
    <div class="qt">${q.q}</div>
    ${q.hint?`<div class="hint-box">💡 คำใบ้: ${q.hint}</div>`:''}
    <input id="fi-inp" class="fi" placeholder="พิมพ์คำตอบ..." onkeydown="if(event.key==='Enter')chkFill()">
    <button class="btn btn-p" style="margin-top:.75rem;width:100%;padding:.9rem;font-size:1rem;border-radius:12px;font-weight:700" onclick="chkFill()">✔ ตรวจคำตอบ</button>`;
  animateQuestionEntry();
  setTimeout(()=>document.getElementById('fi-inp')?.focus(),80);
}
function chkFill(){
  const inp=document.getElementById('fi-inp');if(!inp)return;
  const q=A.curGame.qs[A.gs.qi];
  const ans=inp.value.trim(), correct=q.ans;
  const ok=ans.toLowerCase()===String(correct).trim().toLowerCase();
  recordAttempt({
    prompt: q?.q || '',
    correctAnswer: correct,
    studentAnswer: ans,
    isCorrect: ok,
    wrongQuestion: ok || !q ? null : { ...q }
  });
  inp.classList.add(ok?'ok':'no'); inp.disabled=true;
  announceGameFeedback(ok);
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
    } else {
      const pair = pairs.find(p=>p.left===selL);
      recordAttempt({
        prompt: 'จับคู่คำให้ถูกต้อง',
        correctAnswer: pair?.right || '',
        studentAnswer: el.textContent || '',
        isCorrect: false
      });
      el.classList.add('bad');setTimeout(()=>el.classList.remove('bad'),600);
    }
    selL=null;document.querySelectorAll('#ml .mi').forEach(e=>e.classList.remove('sel'));
  };
}

/* ── SEQUENCE ── */

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
      if(found.length===words.length){
        recordAttempt({
          prompt:'ค้นหาคำทั้งหมดในตาราง',
          correctAnswer:words.join(', '),
          studentAnswer:found.join(', '),
          isCorrect:true
        });
        clearInterval(A.tmr);setTimeout(finishGame,600);
      }
    }
  };
  draw();
}

/* ── FINISH ── */
function finishGame(){
  if(!A.gs || A.gs.finished) return;
  A.gs.finished=true;
  clearInterval(A.tmr);
  cleanupGameInteraction();
  const sc=Math.min(100,Math.max(0,A.gs.earned)), pct=sc;
  document.getElementById('g-content').style.display='none';
  document.getElementById('g-result').style.display='block';
  document.getElementById('g-result').classList.remove('result-arrive');
  void document.getElementById('g-result').offsetWidth;
  document.getElementById('g-result').classList.add('result-arrive');
  document.getElementById('s-game').classList.add('mission-complete');
  document.getElementById('r-sc').textContent=sc;
  document.getElementById('r-mx').textContent='/ 100';
  document.getElementById('r-ring').style.background=`conic-gradient(var(--p) ${pct}%,#E5E7EB 0%)`;
  const correctCount=(A.gs?.attempts||[]).filter(attempt=>attempt.is_correct).length;
  const stars=pct>=90?3:pct>=70?2:1;
  const[title,msg]=pct>=80?['🎉 ยอดเยี่ยม!','คุณทำได้ดีมากเลย!']:pct>=50?['👍 ดีทีเดียว!','ฝึกอีกนิดจะเก่งมาก!']:['💪 สู้ๆ!','ลองใหม่นะ ทำได้แน่!'];
  document.getElementById('r-ti').textContent=title;
  document.getElementById('r-mg').textContent=msg;
  document.getElementById('r-emblem').textContent='⭐'.repeat(stars);
  document.getElementById('r-trail').textContent=`ตอบถูก ${correctCount} จาก ${A.gs.totalQ} ข้อ · ได้รับ ${stars} ดาว · ${pct>=80?'ยอดนักผจญภัย! ความพยายามของคุณพาไปได้ไกลมาก ✨':pct>=50?'ฝึกอีกนิดแล้วจะเก่งขึ้นอีก ⭐':'ทุกการลองคือก้าวใหม่ เริ่มภารกิจอีกครั้งได้เลย 🌱'}`;
  document.getElementById('g-result').focus({preventScroll:true});
  let reviewBox=document.getElementById('g-review-box');
  if(!reviewBox){
    reviewBox=document.createElement('div');
    reviewBox.id='g-review-box';
    document.getElementById('g-result').appendChild(reviewBox);
  }
  if(reviewBox && A.gs?.mission){
    reviewBox.style.display='block';
    reviewBox.innerHTML=missionReviewHtml();
  } else if(reviewBox){
    const wrongs=(A.gs?.attempts||[]).filter(a=>!a.is_correct).slice(0,5);
    reviewBox.style.display=wrongs.length?'block':'none';
    reviewBox.innerHTML=wrongs.length?`
      <div style="margin-top:1rem;text-align:left;background:#FFF7ED;border:1px solid #FED7AA;border-radius:14px;padding:1rem">
        <div style="font-weight:800;color:#9A3412;margin-bottom:.55rem">ข้อที่ยังพลาด</div>
        ${wrongs.map(item=>`
          <div style="padding:.55rem 0;border-bottom:1px solid #FDE68A">
            <div style="font-size:.82rem;font-weight:700;color:#7C2D12">${item.prompt||'โจทย์'}</div>
            <div style="font-size:.78rem;color:#92400E">ตอบ: ${item.student_answer||'-'}</div>
            <div style="font-size:.78rem;color:#166534">เฉลย: ${item.correct_answer||'-'}</div>
          </div>`).join('')}
      </div>`:'';
  }
  let weakBtn=document.getElementById('r-weak-btn');
  if(!weakBtn){
    weakBtn=document.createElement('button');
    weakBtn.id='r-weak-btn';
    weakBtn.className='btn btn-sm';
    weakBtn.textContent='ฝึกเฉพาะข้อที่ยังอ่อน';
    weakBtn.style.cssText='display:none;background:#FFF7ED;color:#9A3412;border:1px solid #FDBA74';
    weakBtn.onclick=practiceWeakness;
    document.querySelector('#g-result .rbtns')?.insertBefore(weakBtn, document.querySelector('#g-result .rbtns .btn-s'));
  }
  if(weakBtn) weakBtn.style.display=(A.gs?.wrongQuestions?.length&&['mcq','truefalse','fill'].includes(A.curGame?.type))?'inline-flex':'none';

  if (A.role==='student') {
    const dbGid = A.curDbGameId || (typeof jsKeyToDbId==='function' ? jsKeyToDbId(A.gs.gid) : parseInt(A.gs.gid)) || 0;
    if(dbGid){
      apiSaveScore({
        game_id:    dbGid,
        lesson_no:  A.gs.lessonNo||1,
        score:      sc,
        time_spent: (A.curGame?.time||0)-(A.gs.timeLeft||0),
        attempts:   A.gs.attempts||[]
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

function practiceWeakness(){
  const wrongs=A.gs?.wrongQuestions||[];
  if(!wrongs.length||!['mcq','truefalse','fill'].includes(A.curGame?.type)) return;
  A.curGame={...A.curGame,qs:wrongs.map(q=>({...q}))};
  A.gs={gid:A.gs.gid,qi:0,earned:0,timeLeft:Math.max(30,Math.min(A.curGame.time||60,wrongs.length*25)),totalQ:wrongs.length,lessonNo:A.gs.lessonNo,attempts:[],wrongQuestions:[]};
  document.getElementById('g-result').style.display='none';
  document.getElementById('g-content').style.display='block';
  runTimer();
  renderGame();
}

function renderWS(){
  const words=A.curGame.words;
  if(!words?.length){finishGame();return;}
  cleanupGameInteraction();
  const {grid,placed}=getWSGrid(words,A.curGame.sid);
  const placedMap=new Map(placed.map(p=>[p.word,p]));
  let found=[];
  let selection=[];
  let firstDraw=true;
  const drag={active:false,start:null,pointerId:null};
  upQP(0,words.length);

  const isFoundCell=(r,c)=>found.some(word=>placedMap.get(word)?.cells.some(cell=>cell.r===r&&cell.c===c));
  const finishSelection=()=>{
    if(!selection.length) return;
    const foundBefore=found.length;
    const key=wsLineKey(selection);
    const match=placed.find(p=>!found.includes(p.word) && (p.key===key || p.reverseKey===key));
    if(match){
      found.push(match.word);
      A.gs.earned=Math.round(found.length/words.length*100);
      document.getElementById('g-live').textContent='เธเธฐเนเธเธ: '+A.gs.earned;
      announceGameFeedback(true,`🔎 เจอคำว่า ${match.word} แล้ว!`);
      upQP(found.length,words.length);
      if(found.length===words.length){
        recordAttempt({
          prompt: 'ค้นหาคำทั้งหมดในตาราง',
          correctAnswer: words.join(', '),
          studentAnswer: found.join(', '),
          isCorrect: true
        });
        draw();
        clearInterval(A.tmr);
        setTimeout(finishGame,600);
        return;
      }
    }
    if(found.length===foundBefore) announceGameFeedback(false,'🔎 ลองลากเลือกคำที่ซ่อนอยู่ในตาราง');
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
      <div style="font-size:.78rem;color:var(--mu);margin-top:.5rem">\u0e25\u0e32\u0e01\u0e1c\u0e48\u0e32\u0e19\u0e04\u0e33\u0e43\u0e19\u0e15\u0e32\u0e23\u0e32\u0e07\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e04\u0e33\u0e17\u0e35\u0e48\u0e15\u0e49\u0e2d\u0e07\u0e2b\u0e32 \u0e1e\u0e1a\u0e41\u0e25\u0e49\u0e27 ${found.length}/${words.length} \u0e04\u0e33</div>`;
    if(firstDraw){animateQuestionEntry();firstDraw=false;}

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

function gameChoiceText(opt){
  return opt && typeof opt==='object' ? String(opt.text||'') : String(opt||'');
}
function gameChoiceImg(opt){
  return opt && typeof opt==='object' ? String(opt.img||'') : '';
}
function gameChoiceAnswerLabel(opt){
  const text=gameChoiceText(opt);
  const img=gameChoiceImg(opt);
  if(text && img) return `${text} [image]`;
  if(text) return text;
  if(img) return '[image]';
  return '-';
}
function renderChoiceBody(opt){
  const text=gameChoiceText(opt);
  const img=gameChoiceImg(opt);
  return `
    <div class="ch-body${img?' has-image':''}">
      ${img?`<img src="${img}" alt="${text||'choice image'}" class="ch-img">`:''}
      ${text?`<span class="ch-text">${text}</span>`:''}
      ${!text&&!img?`<span class="ch-text">-</span>`:''}
    </div>`;
}
function matchSideLabel(pair, side){
  const text=String(pair?.[side]||'').trim();
  const img=String(pair?.[`${side}_img`]||'').trim();
  if(text && img) return `${text} [image]`;
  if(text) return text;
  if(img) return '[image]';
  return '-';
}
function renderMatchSide(pair, side){
  const text=String(pair?.[side]||'').trim();
  const img=String(pair?.[`${side}_img`]||'').trim();
  return `
    <div class="match-side${img?' media':''}">
      ${img?`<img src="${img}" alt="${text||'match image'}" class="match-side-img">`:''}
      ${text?`<span class="match-side-text">${text}</span>`:''}
    </div>`;
}

function renderMCQ(){ 
  const{qi,totalQ}=A.gs, q=A.curGame.qs[qi];
  if(!q){finishGame();return;}
  A.gs.answered=false;
  upQP(qi+1,totalQ);
  const letters=['A','B','C','D','E','F'];
  document.getElementById('g-content').innerHTML=`
    <div class="qt">${q.q}</div>
    ${renderMathHint(q)}
    <div class="choices choices-media">
      ${(q.opts||[]).map((opt,i)=>`
        <button class="ch${gameChoiceImg(opt)?' ch-media':''}" onclick="ansMCQ(this,${i},${q.ans})" data-idx="${i}">
          <span class="ch-letter">${letters[i]||i+1}</span>
          ${renderChoiceBody(opt)}
        </button>`).join('')}
      </div>`;
  animateQuestionEntry();
}

function ansMCQ(btn,chose,correct){
  if(!A.gs || A.gs.answered) return;
  A.gs.answered=true;
  document.querySelectorAll('.ch').forEach(b=>b.disabled=true);
  const q = A.curGame.qs[A.gs.qi];
  const chosenOpt=q?.opts?.[chose];
  const correctOpt=q?.opts?.[correct];
  const ok=chose===correct;
  recordAttempt({
    prompt: q?.q || '',
    correctAnswer: gameChoiceAnswerLabel(correctOpt),
    studentAnswer: gameChoiceAnswerLabel(chosenOpt),
    isCorrect: ok,
    wrongQuestion: ok || !q ? null : { ...q }
  });
  if(ok){
    btn.classList.add('ok');
    A.gs.earned+=Math.round(100/A.gs.totalQ);
  } else {
    btn.classList.add('no');
    const cb=document.querySelectorAll('.ch')[correct];
    cb?.classList.add('ok');
  }
  const correctText=gameChoiceAnswerLabel(correctOpt);
  announceGameFeedback(ok,ok?'⭐ ถูกต้อง! ไปต่อกันเลย':`เฉลย: ${correctText}${q?.explanation?` — ${q.explanation}`:''}`);
  document.getElementById('g-live').innerHTML=`<span aria-hidden="true">⭐</span> คะแนน ${A.gs.earned}`;
  setTimeout(()=>{A.gs.qi++;A.gs.answered=false;renderGame();},1100);
}

function renderMathHint(question){
  return question?.hint?`<div class="math-hint-wrap"><button type="button" class="math-hint-btn" onclick="toggleMathHint(this)">💡 ดูคำใบ้</button><div class="hint-box math-hint" hidden>${question.hint}</div></div>`:'';
}
function toggleMathHint(button){
  const hint=button?.nextElementSibling;
  if(!hint)return;
  hint.hidden=!hint.hidden;
  button.textContent=hint.hidden?'💡 ดูคำใบ้':'🙈 ซ่อนคำใบ้';
}
function pizzaWedgePath(index,count){
  const start=-90+index*360/count, end=-90+(index+1)*360/count, points=[];
  for(let angle=start;angle<=end;angle+=Math.max(3,360/count/8)){
    const rad=angle*Math.PI/180;
    points.push(`${50+45*Math.cos(rad)} ${50+45*Math.sin(rad)}`);
  }
  const last=end*Math.PI/180;
  points.push(`${50+45*Math.cos(last)} ${50+45*Math.sin(last)}`);
  return `M50 50 L${points.join(' L')} Z`;
}

/* ── MATH MISSIONS ──
   A round is a list of multi-step missions from MathKit. Each step is scored once:
   full credit on the first try, less on retries and per hint, and nothing after
   MISSION_MAX_ATTEMPTS misses, when the worked solution is revealed. */
const MISSION_MAX_ATTEMPTS=3;
const MISSION_ATTEMPT_CREDIT=[1,0.6,0.3];
const MISSION_HINT_COST=0.15;
const MISSION_BONUS={multiStep:5,noHint:5};
const MISSION_SKILLS={analysis:'วิเคราะห์ข้อมูล',calculation:'วิธีคำนวณ',planning:'วางแผน',final:'คำตอบสุดท้าย',interpretation:'ตีความ'};
const MISSION_LEVELS={easy:'🌱 ง่าย',medium:'🚀 ปานกลาง',hard:'🐉 ยาก',challenge:'🏆 ท้าทายพิเศษ'};
const PIZZA_COLORS=['#F97316','#2563EB','#059669','#9333EA','#DC2626'];

function missionBonusMax(mission){
  return mission.steps.length>=3?MISSION_BONUS.multiStep+MISSION_BONUS.noHint:0;
}
// Teacher-edited missions from the database come first; generated ones fill any shortfall.
async function missionRound(gm, level){
  const size=MathKit.GENERATORS[gm.code].size;
  let stored=[];
  try{
    const res=A.curDbGameId?await Promise.race([apiPlayQuestions(A.curDbGameId),new Promise(resolve=>setTimeout(()=>resolve(null),4000))]):null;
    stored=(res?.missions||[]).filter(m=>m.difficulty===level).map(m=>MathKit.normalizeMission(JSON.parse(JSON.stringify(m)))).filter(m=>{
      const errors=MathKit.validateMission(m);
      if(errors.length) console.warn('[mission] skipped stored mission',m.id,errors);
      return !errors.length;
    });
  }catch(e){ console.warn('[mission] DB load failed, using generated missions:',e); }
  const picked=shuffleItems(stored).slice(0,size);
  return picked.length<size?picked.concat(MathKit.buildRound(gm.code,level).slice(0,size-picked.length)):picked;
}
async function startMissionGame(gid, gm){
  const list=await missionRound(gm,pendingDifficulty);
  A.curGame={...gm,missions:true,qs:[],time:gm.time};
  const max=list.reduce((total,mission)=>total+mission.steps.reduce((s,step)=>s+step.points,0)+missionBonusMax(mission),0);
  A.gs={gid,qi:0,earned:0,timeLeft:gm.time,totalQ:list.reduce((n,m)=>n+m.steps.length,0),lessonNo:pendingLesson,attempts:[],wrongQuestions:[],
    mission:{list,mi:0,si:0,store:{},cur:null,board:null,results:[],bonuses:[],points:0,max}};
  document.getElementById('g-title').textContent=gm.name;
  runTimer();
  renderGame();
}
function missionCurrent(){
  const M=A.gs?.mission, mission=M?.list[M.mi];
  return {M,mission,step:mission?.steps[M.si]};
}
function missionStepsDone(){
  return A.gs.mission.results.length;
}
function missionContextHtml(block){
  if(block.type==='table') return `<div class="math-data-card"><div class="math-data-title">${block.title}</div><div class="ms-table-scroll"><table><thead><tr>${block.head.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${block.rows.map(row=>`<tr>${row.map((cell,i)=>i?`<td>${cell}</td>`:`<th scope="row">${cell}</th>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
  if(block.type==='note') return `<div class="ms-note">${block.text}</div>`;
  if(block.type==='chart') return `<div class="math-chart-card"><div class="math-data-title">${block.title}</div>${staticChartHtml(block)}</div>`;
  return '';
}
function staticChartHtml(block){
  const ticks=block.ticks, top=ticks[ticks.length-1], span=ticks.length-1;
  const pos=value=>{
    if(value<=ticks[0]) return 0;
    for(let i=1;i<ticks.length;i++) if(value<=ticks[i]) return (i-1+(value-ticks[i-1])/(ticks[i]-ticks[i-1]))/span*100;
    return 100;
  };
  const heights=block.values.map(value=>Math.min(100,pos(value)));
  return `<div class="cb-area cb-static" style="--n:${block.labels.length}">
    <div class="cb-yaxis" aria-hidden="true">${ticks.map((t,i)=>`<span style="bottom:${i/span*100}%">${t}</span>`).join('')}</div>
    <div class="cb-plot">${ticks.map((_,i)=>`<i class="cb-grid" style="bottom:${i/span*100}%"></i>`).join('')}
      ${block.labels.map((label,i)=>`<div class="cb-col${block.chartType==='line'?' line':''}"><div class="cb-bar" style="height:${heights[i]}%"></div></div>`).join('')}
      ${block.chartType==='line'?chartLineSvg(heights):''}
    </div>
  </div>
  <div class="cb-xlabels static" style="--n:${block.labels.length}">${block.labels.map(label=>`<span>${label}</span>`).join('')}</div>
  <div class="ms-chart-caption">หน่วย: ${block.unit} · แกน Y สูงสุด ${top}</div>`;
}
function chartLineSvg(heights){
  if(heights.some(h=>h===null)) return '';
  const n=heights.length;
  return `<svg class="cb-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="${heights.map((h,i)=>`${(i+.5)/n*100},${100-h}`).join(' ')}" vector-effect="non-scaling-stroke"/></svg>`;
}

function renderMission(){
  const {M,mission,step}=missionCurrent();
  if(!mission){finishGame();return;}
  if(!M.cur){
    M.cur={attempts:0,hints:0,phase:'open',wrongChoices:[],feedback:null};
    M.board=missionInitialBoard(step);
  }
  upQP(missionStepsDone()+1,A.gs.totalQ);
  const doneHere=M.results.filter(r=>r.mi===M.mi);
  document.getElementById('g-content').innerHTML=`
    <div class="ms-head">
      <span class="ms-icon" aria-hidden="true">${mission.icon}</span>
      <div><div class="ms-kicker">ภารกิจที่ ${M.mi+1} จาก ${M.list.length} · ${MISSION_LEVELS[mission.difficulty]||''}</div><h2 class="ms-title">${mission.title}</h2></div>
    </div>
    <div class="ms-story">${mission.story.map(line=>`<p>${line}</p>`).join('')}${mission.tip?`<p class="ms-tip">💡 เคล็ดลับ: ${mission.tip}</p>`:''}</div>
    ${mission.context.length?`<div class="ms-context">${mission.context.map(missionContextHtml).join('')}</div>`:''}
    <ol class="ms-track" aria-label="ขั้นตอนของภารกิจ">${mission.steps.map((s,i)=>{
      const r=doneHere.find(x=>x.si===i);
      const state=r?(r.ok?'ok':'miss'):i===M.si?'now':'todo';
      return `<li class="ms-dot ${state}" aria-current="${i===M.si?'step':'false'}"><span>${r?(r.ok?'✓':'!'):i+1}</span><small>${MISSION_SKILLS[s.skill]}</small></li>`;
    }).join('')}</ol>
    ${doneHere.length?`<details class="ms-done"><summary>ขั้นที่ทำแล้ว (${doneHere.length})</summary>${doneHere.map(r=>`<div class="ms-done-row ${r.ok?'ok':'miss'}"><b>ขั้นที่ ${r.si+1}</b> ${mission.steps[r.si].prompt}<br><span>คำตอบ: ${MathKit.answerText(mission.steps[r.si])}</span></div>`).join('')}</details>`:''}
    <section class="ms-step" aria-labelledby="ms-prompt">
      <div class="ms-step-label">ขั้นที่ ${M.si+1}/${mission.steps.length} · ${MISSION_SKILLS[step.skill]} · ${step.points} คะแนน</div>
      <div class="qt" id="ms-prompt">${step.prompt}</div>
      <div id="ms-input">${missionInputHtml(step)}</div>
      <div id="ms-hints">${missionHintsHtml(step)}</div>
      <div id="ms-feedback" aria-live="polite">${M.cur.feedback||''}</div>
      <div class="ms-actions" id="ms-actions">${missionActionsHtml(step)}</div>
    </section>`;
  animateQuestionEntry();
  if(step.kind==='chart') bindChartBuilder();
}
function missionInitialBoard(step){
  const M=A.gs.mission;
  if(step.kind==='pizza'){
    const cut=M.store.cut||step.defaultCut;
    return {cut,active:0,assign:Array.from({length:step.trays},()=>Array(cut).fill(-1))};
  }
  if(step.kind==='chart') return {order:Array(step.labels.length).fill(null),values:Object.fromEntries(step.labels.map(l=>[l,0])),selected:null};
  if(step.kind==='plan') return {picks:{},wrong:[]};
  return null;
}
function missionActionsHtml(step){
  const M=A.gs.mission, cur=M.cur;
  if(cur.phase==='done'){
    const lastStep=M.si===M.list[M.mi].steps.length-1, lastMission=M.mi===M.list.length-1;
    return `<button type="button" class="btn btn-p math-check-btn" onclick="missionNext()">${lastStep?(lastMission?'🏁 ดูผลสรุปภารกิจ':'➜ ภารกิจถัดไป'):'➜ ไปขั้นต่อไป'}</button>`;
  }
  const hintLeft=step.hints.length-cur.hints;
  return `${step.kind==='choice'?'':`<button type="button" class="btn btn-p math-check-btn" onclick="missionCheck()">✔ ${step.kind==='pizza'?'ส่งแผนจัดออเดอร์':step.kind==='chart'?'ส่งกราฟ':'ตรวจคำตอบ'}</button>`}
    ${hintLeft>0?`<button type="button" class="math-hint-btn ms-hint-btn" onclick="missionHint()">💡 ขอคำใบ้ (${cur.hints+1}/${step.hints.length}) · หักคะแนนเล็กน้อย</button>`:''}
    <div class="ms-attempts">ตรวจได้อีก ${MISSION_MAX_ATTEMPTS-cur.attempts} ครั้งก่อนเฉลย</div>`;
}
function missionHintsHtml(step){
  const used=A.gs.mission.cur.hints;
  return step.hints.slice(0,used).map((hint,i)=>`<div class="hint-box ms-hint">💡 คำใบ้ระดับ ${i+1}: ${hint}</div>`).join('');
}
function missionInputHtml(step){
  const M=A.gs.mission, done=M.cur.phase==='done';
  if(['number','fixed','fraction'].includes(step.kind)){
    const help=step.kind==='fraction'?'พิมพ์ เช่น 5/8 หรือจำนวนคละ 1 3/8':step.kind==='fixed'?`ทศนิยมไม่เกิน ${step.places} ตำแหน่ง`:'จำนวนเต็ม';
    return `<div class="ms-answer-row"><input id="ms-answer" class="fi ms-answer" autocomplete="off" inputmode="${step.kind==='fraction'?'text':step.kind==='fixed'?'decimal':'numeric'}" aria-label="คำตอบ" aria-describedby="ms-answer-help" placeholder="คำตอบ" ${done?'disabled':''} onkeydown="if(event.key==='Enter')missionCheck()">${step.unit?`<span class="ms-unit">${step.unit}</span>`:''}</div><div class="ms-help" id="ms-answer-help">${help}</div>`;
  }
  if(step.kind==='choice'){
    return `<div class="choices ms-choices">${step.options.map((option,i)=>{
      const wrong=M.cur.wrongChoices.includes(i), right=done&&i===step.answer;
      return `<button type="button" class="ch${wrong?' no':''}${right?' ok':''}" ${done||wrong?'disabled':''} onclick="missionChoose(${i})"><span class="ch-letter">${'ABCDE'[i]}</span><span class="ch-text">${option.text}</span></button>`;
    }).join('')}</div>`;
  }
  if(step.kind==='plan'){
    return step.fields.map(field=>`<fieldset class="ms-field${M.board.wrong.includes(field.id)?' is-wrong':''}"><legend>${field.label}</legend><div class="ms-options">${field.options.map((option,k)=>{
      const on=M.board.picks[field.id]===k;
      return `<button type="button" class="ms-option${on?' on':''}" aria-pressed="${on}" ${done?'disabled':''} onclick="missionPlanPick('${field.id}',${k})">${option.text}</button>`;
    }).join('')}</div></fieldset>`).join('');
  }
  if(step.kind==='pizza') return `<div id="ms-board">${pizzaBoardHtml(step)}</div>`;
  if(step.kind==='chart') return `<div id="ms-board">${chartBoardHtml(step)}</div>`;
  return '';
}
function missionRefresh(part){
  const {step}=missionCurrent();
  if(part==='board'){
    const el=document.getElementById('ms-board');
    if(el) el.innerHTML=step.kind==='pizza'?pizzaBoardHtml(step):chartBoardHtml(step);
    document.querySelector('#ms-feedback .ms-fb.warn')?.remove();
    if(step.kind==='chart') bindChartBuilder();
    return;
  }
  document.getElementById('ms-input').innerHTML=missionInputHtml(step);
  document.getElementById('ms-hints').innerHTML=missionHintsHtml(step);
  document.getElementById('ms-feedback').innerHTML=A.gs.mission.cur.feedback||'';
  document.getElementById('ms-actions').innerHTML=missionActionsHtml(step);
  if(step.kind==='chart') bindChartBuilder();
}
function missionReadInput(step){
  const board=A.gs.mission.board;
  if(['number','fixed','fraction'].includes(step.kind)) return document.getElementById('ms-answer')?.value||'';
  if(step.kind==='plan') return board.picks;
  if(step.kind==='pizza') return {cut:board.cut,assign:board.assign};
  if(step.kind==='chart') return {order:board.order,values:board.values};
  return null;
}
function missionChoose(index){
  const {M,step}=missionCurrent();
  if(M.cur.phase!=='open'||M.cur.wrongChoices.includes(index)) return;
  missionSubmit(index);
}
function missionPlanPick(fieldId,index){
  const {M}=missionCurrent();
  if(M.cur.phase!=='open') return;
  M.board.picks[fieldId]=index;
  M.board.wrong=M.board.wrong.filter(id=>id!==fieldId);
  missionRefresh();
}
function missionCheck(){
  const {M,step}=missionCurrent();
  if(!M||M.cur.phase!=='open') return;
  missionSubmit(missionReadInput(step));
}
function missionSubmit(input){
  const {M,mission,step}=missionCurrent();
  const result=MathKit.checkStep(step,input);
  if(result.invalid){
    document.getElementById('ms-feedback').innerHTML=`<div class="ms-fb warn">✋ ${result.invalid}</div>`;
    return;
  }
  M.cur.attempts++;
  if(result.ok||M.cur.attempts>=MISSION_MAX_ATTEMPTS){
    missionComplete(result);
    return;
  }
  if(step.kind==='choice') M.cur.wrongChoices.push(input);
  if(step.kind==='plan') M.board.wrong=result.wrongFields;
  const nudge=M.cur.hints<step.hints.length?'ลองขอคำใบ้ถัดไปถ้ายังไม่แน่ใจ':'ทบทวนคำใบ้ด้านบนแล้วลองอีกครั้ง';
  M.cur.feedback=`<div class="ms-fb retry"><b>ยังไม่ถูก (ครั้งที่ ${M.cur.attempts}/${MISSION_MAX_ATTEMPTS})</b><ul>${result.why.map(w=>`<li>${w}</li>`).join('')}</ul><div>แก้คำตอบได้เลย ${nudge}</div></div>`;
  announceGameFeedback(false,'🌱 ยังไม่ถูก ลองแก้ไขอีกครั้ง');
  missionRefresh();
}
function missionComplete(result){
  const {M,mission,step}=missionCurrent();
  const ok=result.ok;
  const credit=ok?Math.max(0.2,MISSION_ATTEMPT_CREDIT[M.cur.attempts-1]-MISSION_HINT_COST*M.cur.hints):0;
  const earned=Math.round(step.points*credit);
  M.cur.phase='done';
  M.results.push({mi:M.mi,si:M.si,skill:step.skill,points:step.points,earned,ok,attempts:M.cur.attempts,hints:M.cur.hints});
  M.points+=earned;
  if(step.store) M.store[step.store]=step.options[step.answer].value;
  (step.fields||[]).forEach(field=>{if(field.store) M.store[field.store]=field.options[field.answer].value;});
  recordAttempt({prompt:`${mission.title}: ${step.prompt}`,correctAnswer:MathKit.answerText(step),studentAnswer:result.shown,isCorrect:ok,questionKey:`m${M.mi+1}s${M.si+1}`});
  let bonusHtml='';
  if(M.si===mission.steps.length-1){
    const mine=M.results.filter(r=>r.mi===M.mi);
    const allOk=mine.every(r=>r.ok), noHints=mine.every(r=>!r.hints);
    const bonus=missionBonusMax(mission)?(allOk?MISSION_BONUS.multiStep:0)+(allOk&&noHints?MISSION_BONUS.noHint:0):0;
    M.points+=bonus;
    M.bonuses.push({mi:M.mi,bonus});
    bonusHtml=`<div class="ms-bonus">🏅 จบภารกิจ! ${bonus?`โบนัสโจทย์หลายขั้นตอน +${allOk?MISSION_BONUS.multiStep:0}${allOk&&noHints?` · โบนัสไม่ใช้คำใบ้ +${MISSION_BONUS.noHint}`:''}`:'ภารกิจหน้าลองทำให้ถูกทุกขั้นเพื่อรับโบนัส'}</div>`;
  }
  A.gs.earned=Math.round(100*M.points/M.max);
  document.getElementById('g-live').innerHTML=`<span aria-hidden="true">⭐</span> คะแนน ${A.gs.earned}`;
  const head=ok
    ?`<b>✓ ถูกต้อง! +${earned} คะแนน</b>${M.cur.attempts>1||M.cur.hints?' (คะแนนลดลงตามจำนวนครั้งที่ตรวจและคำใบ้)':''}`
    :`<b>เฉลย: ${MathKit.answerText(step)}</b><div>ไม่เป็นไร ดูวิธีคิดด้านล่าง แล้วนำไปใช้ในขั้นต่อไป</div>`;
  M.cur.feedback=`<div class="ms-fb ${ok?'ok':'reveal'}">${head}<div class="ms-solution"><div class="ms-solution-title">🧠 วิธีคิดทีละขั้น</div><ol>${step.solution.map(line=>`<li>${line}</li>`).join('')}</ol></div>${bonusHtml}</div>`;
  announceGameFeedback(ok,ok?'✨ ถูกต้อง! ดูวิธีคิดแล้วไปขั้นต่อไป':'📘 ดูเฉลยและวิธีคิดก่อนไปต่อ');
  upQP(missionStepsDone(),A.gs.totalQ);
  missionRefresh();
  document.getElementById('ms-feedback')?.scrollIntoView({block:'nearest',behavior:'smooth'});
}
function missionHint(){
  const {M,step}=missionCurrent();
  if(M.cur.phase!=='open'||M.cur.hints>=step.hints.length) return;
  M.cur.hints++;
  missionRefresh();
}
function missionNext(){
  const {M,mission}=missionCurrent();
  if(!M||M.cur?.phase!=='done') return;
  M.cur=null;
  M.si++;
  if(M.si>=mission.steps.length){M.mi++;M.si=0;M.store={};}
  if(M.mi>=M.list.length){finishGame();return;}
  renderMission();
  document.getElementById('g-content')?.scrollIntoView({block:'start',behavior:'smooth'});
}
function missionReviewHtml(){
  const M=A.gs?.mission;
  if(!M) return '';
  const bySkill={};
  M.results.forEach(r=>{
    const s=bySkill[r.skill]||(bySkill[r.skill]={earned:0,points:0});
    s.earned+=r.earned; s.points+=r.points;
  });
  const noHint=M.results.filter(r=>!r.hints).length;
  const bonus=M.bonuses.reduce((n,b)=>n+b.bonus,0);
  const missed=M.results.filter(r=>!r.ok).slice(0,5);
  return `<div class="ms-review">
    <div class="ms-review-title">คะแนนแยกตามทักษะการคิด</div>
    ${Object.entries(MISSION_SKILLS).filter(([key])=>bySkill[key]).map(([key,label])=>{
      const s=bySkill[key], pct=Math.round(100*s.earned/s.points);
      return `<div class="ms-skill"><span>${label}</span><span class="ms-skill-bar"><i style="width:${pct}%"></i></span><b>${pct}%</b></div>`;
    }).join('')}
    <div class="ms-skill"><span>ใช้คำใบ้น้อย</span><span class="ms-skill-bar"><i style="width:${M.results.length?Math.round(100*noHint/M.results.length):0}%"></i></span><b>${noHint}/${M.results.length}</b></div>
    <div class="ms-review-note">โบนัสภารกิจหลายขั้นตอนและไม่ใช้คำใบ้: +${bonus} คะแนน · ทำเสร็จ ${M.results.length} จาก ${A.gs.totalQ} ขั้น</div>
    ${missed.length?`<div class="ms-review-title">ขั้นที่ควรทบทวน</div>${missed.map(r=>{
      const step=M.list[r.mi].steps[r.si];
      return `<div class="ms-review-row"><b>${M.list[r.mi].title}</b> ${step.prompt}<br><span>เฉลย: ${MathKit.answerText(step)}</span></div>`;
    }).join('')}`:''}
  </div>`;
}

/* Pizza allocation board: pick a customer, then tap slices to give or take back. */
function pizzaBoardHtml(step){
  const board=A.gs.mission.board, done=A.gs.mission.cur.phase==='done';
  const {cut,assign,active}=board;
  const counts=step.orders.map((_,i)=>assign.flat().filter(v=>v===i).length);
  const free=assign.flat().filter(v=>v<0).length;
  return `
    <div class="pz-cuts" role="group" aria-label="วิธีตัดพิซซ่า">
      <span>ตัดถาดละ</span>${MathKit.CUTS.map(c=>`<button type="button" class="pz-cut${c===cut?' on':''}" aria-pressed="${c===cut}" ${done?'disabled':''} onclick="pizzaSetCut(${c})">${c} ชิ้น</button>`).join('')}
    </div>
    <div class="pz-customers" role="group" aria-label="เลือกลูกค้าที่จะมอบชิ้นพิซซ่า">
      ${step.orders.map((order,i)=>`<button type="button" class="pz-cust${i===active?' on':''}" style="--c:${PIZZA_COLORS[i%PIZZA_COLORS.length]}" aria-pressed="${i===active}" ${done?'disabled':''} onclick="pizzaPickCustomer(${i})">
        <b>${order.name}</b><small>สั่ง ${MathKit.fText(order.f)} ถาด · ได้แล้ว ${counts[i]}/${cut} ถาด</small>
        ${step.together?.includes(i)?'<em>ถาดเดียวกับคู่</em>':''}${step.own===i?'<em>ถาดแยก</em>':''}
      </button>`).join('')}
    </div>
    <div class="pz-trays">
      ${assign.map((tray,t)=>`<figure class="pz-tray"><svg viewBox="0 0 100 100" role="group" aria-label="ถาดที่ ${t+1}">
        <circle cx="50" cy="50" r="48" fill="#E7B36A"/>
        ${tray.map((owner,j)=>`<path d="${pizzaWedgePath(j,cut)}" class="pz-slice${owner>=0?' taken':''}" fill="${owner>=0?PIZZA_COLORS[owner%PIZZA_COLORS.length]:'#FDE68A'}" role="button" tabindex="${done?-1:0}"
          aria-label="ถาด ${t+1} ชิ้นที่ ${j+1} ${owner>=0?'ของ'+step.orders[owner].name:'ว่าง'}" onclick="pizzaTap(${t},${j})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();pizzaTap(${t},${j})}"/>`).join('')}
      </svg><figcaption>ถาดที่ ${t+1} · ว่าง ${tray.filter(v=>v<0).length}/${cut}</figcaption></figure>`).join('')}
    </div>
    <div class="pz-summary">ชิ้นละ 1/${cut} ถาด · ยังว่างทั้งหมด ${free} ชิ้น ${done?'':`<button type="button" class="pz-clear" onclick="pizzaClear()">↺ ล้างถาดแล้ววางแผนใหม่</button>`}</div>`;
}
function pizzaBoardOpen(){
  const {M}=missionCurrent();
  return M?.cur?.phase==='open'&&M.board?.assign;
}
function pizzaSetCut(cut){
  if(!pizzaBoardOpen()) return;
  const {M,step}=missionCurrent();
  M.board={...M.board,cut,assign:Array.from({length:step.trays},()=>Array(cut).fill(-1))};
  missionRefresh('board');
}
function pizzaPickCustomer(index){
  if(!pizzaBoardOpen()) return;
  A.gs.mission.board.active=index;
  missionRefresh('board');
}
function pizzaTap(tray,slice){
  if(!pizzaBoardOpen()) return;
  const board=A.gs.mission.board, owner=board.assign[tray][slice];
  board.assign[tray][slice]=owner===board.active?-1:board.active;
  missionRefresh('board');
}
function pizzaClear(){
  if(!pizzaBoardOpen()) return;
  const board=A.gs.mission.board;
  board.assign=board.assign.map(tray=>tray.map(()=>-1));
  missionRefresh('board');
}

/* Chart builder: place categories on the X axis, then set each bar by tapping or dragging. */
function chartSetup(step){
  const M=A.gs.mission;
  const scale=M.store.scale||step.defaultScale, type=M.store.chartType||step.defaultType;
  const rows=Math.min(step.grid,Math.ceil(Math.max(...step.values)/scale)+1);
  return {scale,type,top:rows*scale,rows};
}
function chartBoardHtml(step){
  const board=A.gs.mission.board, done=A.gs.mission.cur.phase==='done';
  const {scale,type,top,rows}=chartSetup(step);
  const n=step.labels.length;
  const heights=board.order.map(label=>label===null?null:board.values[label]/top*100);
  const bank=step.labels.filter(label=>!board.order.includes(label));
  const sel=board.selected;
  return `
    <div class="cb-meta">${type==='line'?'กราฟเส้น':'แผนภูมิแท่ง'} · สเกลช่องละ ${scale} ${step.unit}</div>
    <div class="cb-area" style="--n:${n}">
      <div class="cb-yaxis" aria-hidden="true">${Array.from({length:rows+1},(_,i)=>`<span style="bottom:${i/rows*100}%">${i*scale}</span>`).join('')}</div>
      <div class="cb-plot" id="cb-plot">${Array.from({length:rows+1},(_,i)=>`<i class="cb-grid" style="bottom:${i/rows*100}%"></i>`).join('')}
        ${board.order.map((label,i)=>`<div class="cb-col${type==='line'?' line':''}${sel===i?' sel':''}${label===null?' empty':''}" data-i="${i}" role="slider" tabindex="${label===null||done?-1:0}"
          aria-label="${label===null?`ช่องที่ ${i+1} ยังว่าง`:`ค่าของ ${label}`}" aria-valuemin="0" aria-valuemax="${top}" aria-valuenow="${label===null?0:board.values[label]}">
          ${label===null?'':`<div class="cb-bar" style="height:${heights[i]}%"></div><span class="cb-val" style="bottom:${heights[i]}%">${board.values[label]}</span>`}
        </div>`).join('')}
        ${type==='line'&&board.order.every(label=>label!==null)?chartLineSvg(heights):''}
      </div>
    </div>
    <div class="cb-xlabels" style="--n:${n}">${board.order.map((label,i)=>`<button type="button" class="cb-slot${label===null?'':' filled'}" ${done||label===null?'disabled':''} onclick="chartUnplace(${i})" aria-label="${label===null?`ช่องที่ ${i+1} ว่าง`:`เอา ${label} ออกจากแกน X`}">${label??`ช่อง ${i+1}`}</button>`).join('')}</div>
    <div class="cb-axis-title">แกน X: แตะชื่อหมวดหมู่ด้านล่างเพื่อวางทีละช่อง</div>
    <div class="cb-bank">${bank.map(label=>`<button type="button" class="chip" ${done?'disabled':''} onclick="chartPlace('${label}')">${label}</button>`).join('')||'<span class="ms-help">วางหมวดหมู่ครบแล้ว</span>'}</div>
    ${sel!==null&&board.order[sel]!==null&&!done?`<div class="cb-tune"><span>${board.order[sel]}</span>
      <button type="button" onclick="chartNudge(-1)" aria-label="ลดค่า">−</button><b>${board.values[board.order[sel]]} ${step.unit}</b><button type="button" onclick="chartNudge(1)" aria-label="เพิ่มค่า">+</button>
      <small>ปรับทีละ ${step.fine}</small></div>`:'<div class="cb-tune muted">แตะหรือลากในคอลัมน์เพื่อกำหนดความสูง</div>'}`;
}
function chartBoardOpen(){
  const {M,step}=missionCurrent();
  return step?.kind==='chart'&&M.cur?.phase==='open';
}
function chartPlace(label){
  if(!chartBoardOpen()) return;
  const board=A.gs.mission.board, slot=board.order.indexOf(null);
  if(slot<0||board.order.includes(label)) return;
  board.order[slot]=label;
  board.selected=slot;
  missionRefresh('board');
}
function chartUnplace(slot){
  if(!chartBoardOpen()) return;
  const board=A.gs.mission.board;
  board.order[slot]=null;
  if(board.selected===slot) board.selected=null;
  missionRefresh('board');
}
function chartSetValue(slot,value,redraw){
  const {M,step}=missionCurrent(), board=M.board, label=board.order[slot];
  if(label===null) return;
  const {top}=chartSetup(step);
  board.values[label]=Math.max(0,Math.min(top,Math.round(value/step.fine)*step.fine));
  board.selected=slot;
  if(redraw){missionRefresh('board');return;}
  const col=document.querySelector(`.cb-col[data-i="${slot}"]`);
  const h=board.values[label]/top*100;
  col?.querySelector('.cb-bar')?.style.setProperty('height',`${h}%`);
  const val=col?.querySelector('.cb-val');
  if(val){val.style.bottom=`${h}%`;val.textContent=board.values[label];}
}
function chartNudge(dir){
  if(!chartBoardOpen()) return;
  const {M,step}=missionCurrent(), board=M.board;
  if(board.selected===null) return;
  chartSetValue(board.selected,board.values[board.order[board.selected]]+dir*step.fine,true);
}
function bindChartBuilder(){
  const plot=document.getElementById('cb-plot');
  if(!plot||!chartBoardOpen()) return;
  let dragSlot=null;
  const valueAt=ev=>{
    const rect=plot.getBoundingClientRect(), {top}=chartSetup(missionCurrent().step);
    return (rect.bottom-ev.clientY)/rect.height*top;
  };
  plot.addEventListener('pointerdown',ev=>{
    const col=ev.target.closest('.cb-col');
    if(!col||col.classList.contains('empty')||!chartBoardOpen()) return;
    dragSlot=Number(col.dataset.i);
    plot.setPointerCapture?.(ev.pointerId);
    ev.preventDefault();
    chartSetValue(dragSlot,valueAt(ev),false);
  });
  plot.addEventListener('pointermove',ev=>{
    if(dragSlot===null) return;
    ev.preventDefault();
    chartSetValue(dragSlot,valueAt(ev),false);
  });
  const end=()=>{if(dragSlot===null) return;dragSlot=null;missionRefresh('board');};
  plot.addEventListener('pointerup',end);
  plot.addEventListener('pointercancel',end);
  plot.addEventListener('keydown',ev=>{
    const col=ev.target.closest('.cb-col');
    if(!col||col.classList.contains('empty')) return;
    const delta={ArrowUp:1,ArrowRight:1,ArrowDown:-1,ArrowLeft:-1}[ev.key];
    if(!delta) return;
    ev.preventDefault();
    const slot=Number(col.dataset.i), board=A.gs.mission.board;
    chartSetValue(slot,board.values[board.order[slot]]+delta*missionCurrent().step.fine,true);
    document.querySelector(`.cb-col[data-i="${slot}"]`)?.focus();
  });
}

function renderMatch(){
  const pairs=A.curGame.pairs;
  if(!pairs?.length){finishGame();return;}
  const left=shuffleItems(pairs);
  const right=shuffleItems(pairs);
  let selLeftId=null, matched=0;
  upQP(0,pairs.length);
  document.getElementById('g-content').innerHTML=`
    <div style="font-size:.83rem;color:var(--mu);margin-bottom:.8rem">เลือกการ์ดฝั่งซ้าย แล้วเลือกฝั่งขวาที่ตรงกัน</div>
    <div class="mg">
      <div class="mc" id="ml">${left.map(p=>`<div class="mi match-card" data-k="${p.id}" onclick="mL(this)">${renderMatchSide(p,'left')}</div>`).join('')}</div>
      <div class="mc" id="mr">${right.map(p=>`<div class="mi match-card" data-k="${p.id}" onclick="mR(this)">${renderMatchSide(p,'right')}</div>`).join('')}</div>
    </div>`;
  animateQuestionEntry();
  window.mL=el=>{
    document.querySelectorAll('#ml .mi:not(.matched)').forEach(e=>e.classList.remove('sel'));
    el.classList.add('sel');
    selLeftId=el.dataset.k;
  };
  window.mR=el=>{
    if(!selLeftId||el.classList.contains('matched'))return;
    const pair=pairs.find(p=>String(p.id)===String(selLeftId));
    if(String(selLeftId)===String(el.dataset.k)){
      document.querySelector(`#ml [data-k="${selLeftId}"]`)?.classList.replace('sel','matched');
      el.classList.add('matched');
      matched++;
      recordAttempt({
        prompt:'จับคู่ให้ถูกต้อง',
        correctAnswer:matchSideLabel(pair,'right'),
        studentAnswer:matchSideLabel(pair,'right'),
        isCorrect:true
      });
      A.gs.earned=Math.round(matched/pairs.length*100);
      document.getElementById('g-live').innerHTML=`<span aria-hidden="true">⭐</span> คะแนน ${A.gs.earned}`;
      announceGameFeedback(true,`🧩 จับคู่สำเร็จ! พบแล้ว ${matched} จาก ${pairs.length} คู่`);
      upQP(matched,pairs.length);
      if(matched===pairs.length){clearInterval(A.tmr);setTimeout(finishGame,600);}
    }else{
      const wrongPair=right.find(p=>String(p.id)===String(el.dataset.k));
      recordAttempt({
        prompt:'จับคู่ให้ถูกต้อง',
        correctAnswer:matchSideLabel(pair,'right'),
        studentAnswer:matchSideLabel(wrongPair,'right'),
        isCorrect:false
      });
      el.classList.add('bad');setTimeout(()=>el.classList.remove('bad'),600);
      announceGameFeedback(false,'🧩 คู่นี้ยังไม่ตรงกัน ลองอีกครั้งได้เลย');
    }
    selLeftId=null;
    document.querySelectorAll('#ml .mi').forEach(e=>e.classList.remove('sel'));
  };
}

function renderSeq(){
  // รองรับ 2 format: qs=[{prompt,items},...] หรือ items=[...] (legacy/static)
  const seqQs = A.curGame.qs?.length
    ? A.curGame.qs
    : (A.curGame.items?.length ? [{prompt:'เรียงลำดับให้ถูกต้อง', items:A.curGame.items}] : []);

  if(!seqQs?.length){finishGame();return;}

  const totalQ = seqQs.length;
  let qi = A.gs.qi || 0;

  function renderOneSeq(){
    if(qi>=totalQ){finishGame();return;}
    cleanupGameInteraction();
    const q = seqQs[qi];
    const items = q.items||[];
    if(!items.length){qi++;renderOneSeq();return;}

    const bank=shuffleItems(items);
    const placed=Array(items.length).fill(null);
    let firstDraw=true;
    upQP(qi+1,totalQ);

    const draw=()=>{
      const remaining=bank.filter(item=>!placed.some(slot=>(slot?.id||slot?.text)===(item?.id||item?.text)));
      document.getElementById('g-content').innerHTML=`
        <div style="display:grid;gap:.85rem">
          ${q.prompt?`<div style="font-weight:700;font-size:1rem;color:var(--txt);margin-bottom:.1rem">${q.prompt}</div>`:''}
          <div>
            <div style="font-size:.82rem;color:var(--mu);margin-bottom:.45rem">คลิกคำจากกรอบนี้เพื่อย้ายไปเรียง</div>
            <div class="dd-chips">
              ${remaining.map(item=>`<button type="button" class="chip" onclick="seqPick('${item.id||item.text}')">${item.text}</button>`).join('')}
              ${!remaining.length?'<div style="font-size:.78rem;color:var(--mu)">ย้ายครบแล้ว</div>':''}
            </div>
          </div>
          <div>
            <div style="font-size:.82rem;color:var(--mu);margin-bottom:.45rem">เรียงคำตอบในกรอบนี้จากข้อแรกไปข้อสุดท้าย</div>
            <div class="dd-slots">
              ${placed.map((item,idx)=>`
                <button type="button" class="slot${item?' filled':''}" onclick="seqRemove(${idx})">
                  ${item?item.text:`ช่อง ${idx+1}`}
                </button>`).join('')}
            </div>
          </div>
          <button class="btn btn-p btn-sm" style="width:100%;padding:.75rem;border-radius:12px" onclick="chkSeq()">ตรวจคำตอบ</button>
        </div>`;
      if(firstDraw){animateQuestionEntry();firstDraw=false;}
    };

    window.seqPick=id=>{
      const nextIdx=placed.findIndex(slot=>!slot);
      if(nextIdx<0) return;
      const item=bank.find(entry=>String(entry.id||entry.text)===String(id));
      if(!item) return;
      placed[nextIdx]=item;
      draw();
    };
    window.seqRemove=idx=>{
      if(!placed[idx]) return;
      placed[idx]=null;
      draw();
    };
    window.chkSeq=()=>{
      const correctItems=placed.filter((it,i)=>it&&(it.id||it.text)===(items[i].id||items[i].text)).length;
      const isCorrect=correctItems===items.length;
      const pts=Math.round(correctItems/items.length*(100/totalQ));
      recordAttempt({
        prompt:q.prompt||'เรียงลำดับให้ถูกต้อง',
        correctAnswer:items.map(it=>it.text).join(' > '),
        studentAnswer:placed.map(it=>it?.text||'_').join(' > '),
        isCorrect
      });
      document.querySelectorAll('.slot').forEach((el,i)=>{
        if(!placed[i]){el.classList.add('no');return;}
        el.classList.add((placed[i].id||placed[i].text)===(items[i].id||items[i].text)?'ok':'no');
      });
      A.gs.earned=(A.gs.earned||0)+pts;
      document.getElementById('g-live').textContent='คะแนน: '+A.gs.earned;
      announceGameFeedback(isCorrect, isCorrect ? '✨ เรียงลำดับถูกต้อง!' : `🧩 ตำแหน่งถูก ${correctItems} จาก ${items.length} ลำดับ`);
      document.querySelector('#g-content .btn')?.remove();
      setTimeout(()=>{
        qi++;
        A.gs.qi=qi;
        delete window.seqPick;
        delete window.seqRemove;
        delete window.chkSeq;
        renderOneSeq();
      },1500);
    };
    A.gameCleanup=()=>{
      delete window.seqPick;
      delete window.seqRemove;
      delete window.chkSeq;
    };
    draw();
  }

  renderOneSeq();
}
