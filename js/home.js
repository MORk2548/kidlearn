// ══════════════════════════════════════════════════════
// HOME
// ══════════════════════════════════════════════════════
// ── แปลง JS game key '1_1' → DB integer game_id ──────────────
// key format: '{subjectIndex}_{gameIndex}' เช่น '1_1', '2_3', '6_6'
// DB game_id  = (subjectIndex-1)*6 + gameIndex
const GAME_DB_IDS = Object.create(null);
function jsKeyToDbId(key) {
  const game = typeof GAMES_DB !== 'undefined' ? GAMES_DB[key] : null;
  if (game?.code) return GAME_DB_IDS[game.code] || 0;
  const parts = String(key).split('_');
  if (parts.length === 2) {
    const s = parseInt(parts[0]);
    const g = parseInt(parts[1]);
    if (!isNaN(s) && !isNaN(g)) return (s-1)*6 + g;
  }
  return parseInt(key) || 1; // fallback ถ้าเป็นตัวเลขอยู่แล้ว
}

// ══════════════════════════════════════════════════════
// PROGRESS CACHE — fetch ครั้งเดียว ไม่หายเมื่อสลับแท็บ
// ══════════════════════════════════════════════════════
async function fetchProgCache(force=false) {
  if (!force && !A.progDirty && A.progCache) return;
  if (A.role !== 'student') return;
  try {
    const res = await apiScores();
    if (!res.ok || !res.scores) return;
    const cache = {};
    SUBS.forEach(sub => {
      // match ด้วย subject_id หรือ subject_name ก็ได้
      const sc = res.scores.filter(s =>
        Number(s.subject_id) === sub.id || s.subject_name === sub.name
      );
      const played = sc.length;
      const pct = played
        ? Math.min(100, Math.round(
            sc.reduce((a,s) => a + (s.score / (parseInt(s.max_score)||100)), 0) / played * 100
          ))
        : 0;
      cache[sub.id] = { pct, played };
    });
    A.progCache = cache;
    A.progDirty = false;
  } catch(e) { console.warn('[progCache]', e); }
}

function getProgData(subId) {
  // ใช้ cache ถ้ามี ไม่งั้นคืน 0
  return A.progCache?.[subId] || { pct: 0, played: 0 };
}

function renderSubCards(containerId) {
  const g = document.getElementById(containerId);
  if (!g) return;
  g.innerHTML = '';
  SUBS.forEach((sub, i) => {
    const { pct, played } = A.role === 'student' ? getProgData(sub.id) : { pct:0, played:0 };
    g.innerHTML += subCard(sub, pct, played, i);
  });
}

function loadHome(){
  const r=A.role;
  let html='';
  if(r==='student'){
    // แสดง placeholder ก่อน แล้ว fetch จาก API
    html=`<div class="stat"><div class="si">🎮</div><div><div class="sv" id="home-stat-played">…</div><div class="sl2">เกมที่เล่น</div></div></div>
          <div class="stat"><div class="si">⭐</div><div><div class="sv" id="home-stat-avg">…</div><div class="sl2">คะแนนเฉลี่ย</div></div></div>
          <div class="stat"><div class="si">📚</div><div><div class="sv">6</div><div class="sl2">วิชา</div></div></div>
          <div class="stat"><div class="si">🎯</div><div><div class="sv">36</div><div class="sl2">เกมทั้งหมด</div></div></div>`;
  } else if(r==='parent'){
    const kids=A.user.children||[];
    const allSc=kids.flatMap(id=>SCORES[id]||[]);
    const avg=allSc.length?Math.round(allSc.reduce((s,x)=>s+x.score,0)/allSc.length):0;
    html=`<div class="stat"><div class="si">👦</div><div><div class="sv">${kids.length}</div><div class="sl2">บุตรหลาน</div></div></div>
          <div class="stat"><div class="si">🏆</div><div><div class="sv">${avg}</div><div class="sl2">คะแนนเฉลี่ยบุตร</div></div></div>
          <div class="stat"><div class="si">📊</div><div><div class="sv">${allSc.length}</div><div class="sl2">เกมที่เล่นรวม</div></div></div>
          <div class="stat"><div class="si">💡</div><div><div class="sv">3</div><div class="sl2">คำแนะนำใหม่</div></div></div>`;
  } else {
    html=`<div class="stat"><div class="si">👦</div><div><div class="sv" id="home-stat-students">…</div><div class="sl2">นักเรียน</div></div></div>
          <div class="stat"><div class="si">📚</div><div><div class="sv">6</div><div class="sl2">วิชา</div></div></div>
          <div class="stat"><div class="si">🎮</div><div><div class="sv">36</div><div class="sl2">เกมทั้งหมด</div></div></div>
          <div class="stat"><div class="si">📊</div><div><div class="sv">77%</div><div class="sl2">คะแนนเฉลี่ย</div></div></div>`;
  }
  document.getElementById('home-stats').innerHTML=html;
  // render ทันทีจาก cache (ถ้ามี) แล้ว fetch ใหม่ถ้า dirty
  renderSubCards('home-subs');
  if (r !== 'student' && r !== 'parent') {
    apiAllStudents().then(res => {
      const el = document.getElementById('home-stat-students');
      if (!el) return;
      const count = res.ok && Array.isArray(res.students) ? res.students.length : 0;
      el.textContent = count;
    }).catch(() => {
      const el = document.getElementById('home-stat-students');
      if (el) el.textContent = '0';
    });
  }
  if (r === 'student') {
    fetchProgCache().then(() => renderSubCards('home-subs'));
    apiScores().then(res => {
      if (!res.ok || !res.scores) return;
      const sc = res.scores;
      const played = sc.length;
      const avg = played ? Math.round(sc.reduce((a,s) => a + (+s.score / (+s.max_score||100)), 0) / played * 100) : 0;
      const elPlayed = document.getElementById('home-stat-played');
      const elAvg = document.getElementById('home-stat-avg');
      if (elPlayed) elPlayed.textContent = played;
      if (elAvg) elAvg.textContent = avg + '%';
    }).catch(() => {
      const elPlayed = document.getElementById('home-stat-played');
      const elAvg = document.getElementById('home-stat-avg');
      if (elPlayed) elPlayed.textContent = '0';
      if (elAvg) elAvg.textContent = '0%';
    });
  }
}

function getSubProgress(uid, subId){ return getProgData(subId).pct; }

function subCard(sub, prog, played, i){
  if (played === undefined) { played = 0; } // backward compat
  const color = prog>=80?'#10B981':prog>=50?sub.color:prog>0?'#F59E0B':'#D1D5DB';
  return `<div class="subcard" style="border-color:${sub.color};animation-delay:${i*.07}s" onclick="openSub(${sub.id})">
    <div class="sub-ico">${sub.icon}</div>
    <div class="sub-nm">${sub.name}</div>
    <div class="sub-ds">${sub.desc}</div>
    <div class="pb-w">
      <div class="pb-l"><span>ความก้าวหน้า</span><span style="font-weight:700;color:${color}">${prog}%</span></div>
      <div class="pb"><div class="pf" style="width:${prog}%;background:${color}"></div></div>
    </div>
  </div>`;
}

// ══════════════════════════════════════════════════════
// บทเรียน 6 บทต่อเกม (ทุกวิชา ทุกเกม)
// ══════════════════════════════════════════════════════
const LESSON_NAMES = {
  '1_1':['เปรียบเทียบเศษส่วน','เรียงลำดับเศษส่วน','เศษส่วนที่เท่ากัน','บวกตัวส่วนเท่ากัน','บวกตัวส่วนต่างกัน','โจทย์ปัญหาเศษส่วน'],
  '1_2':['ตัวเศษและตัวส่วน','แบ่งพิซซ่าเป็นส่วนเท่า ๆ กัน','เลือกชิ้นตามเศษส่วน','เศษส่วนอย่างง่าย','เศษส่วนมากกว่า 1','ทบทวนเศษส่วนจากภาพ'],
  '1_3':['อ่านราคาทศนิยม','รวมราคาสินค้า','บวกจำนวนเงิน','ทอนเงินอย่างถูกต้อง','ตรวจยอดชำระ','โจทย์ซื้อขาย'],
  '1_4':['อ่านค่าทศนิยม','บวกทศนิยม','ลบทศนิยม','จัดตำแหน่งจุดทศนิยม','ตรวจคำตอบ','โจทย์ทศนิยม'],
  '1_5':['อ่านตารางข้อมูล','หาค่าสูงสุด','หาค่าต่ำสุด','หาผลรวมข้อมูล','หาผลต่างข้อมูล','ตอบคำถามจากแผนภูมิ'],
  '1_6':['เลือกข้อมูลลงกราฟ','ใส่ค่าบนแกน','เทียบสเกลกราฟ','สร้างกราฟแท่ง','ตรวจความสูงแท่ง','ตรวจป้ายกำกับกราฟ'],
  '2_1':['ระบบสุริยะ','ดาวและกาแล็กซี','บรรยากาศโลก','สิ่งมีชีวิตในน้ำ','สิ่งมีชีวิตบนบก','ระบบนิเวศ'],
  '2_2':['สัตว์มีกระดูกสันหลัง','สัตว์ไม่มีกระดูกสันหลัง','พืชดอก','พืชไม่มีดอก','สภาวะอากาศ','แหล่งน้ำ'],
  '2_3':['ก๊าซในอากาศ','วงจรชีวิตสัตว์','วงจรชีวิตพืช','สารและสมบัติ','การเปลี่ยนแปลงสาร','พลังงานแสง'],
  '2_4':['อาณาจักรพืช','อาณาจักรสัตว์','อาณาจักรเชื้อรา','โปรติสต์','โมเนอรา','ไวรัส'],
  '2_5':['วัฏจักรน้ำ','วัฏจักรคาร์บอน','ห่วงโซ่อาหาร','การสืบพันธุ์พืช','การสืบพันธุ์สัตว์','การถ่ายทอดลักษณะ'],
  '2_6':['คำศัพท์เซลล์','คำศัพท์โลก','คำศัพท์ฟิสิกส์','คำศัพท์เคมี','คำศัพท์ชีวิต','คำศัพท์สิ่งแวดล้อม'],
  '3_1':['ประเพณีไทย','ภูมิศาสตร์ไทย','สถาบันชาติ','วัฒนธรรมไทย','ศาสนาในไทย','สัญลักษณ์ชาติ'],
  '3_2':['วรรณยุกต์','ไตรยางศ์','มาตราตัวสะกด','การอ่านทำนอง','วรรณคดี','สำนวนสุภาษิต'],
  '3_3':['คำนาม','คำกริยา','คำวิเศษณ์','คำสันธาน','คำบุพบท','คำอุทาน'],
  '3_4':['ประเภทคำ','ชนิดประโยค','การเว้นวรรค','เครื่องหมายวรรคตอน','คำราชาศัพท์','คำยืมต่างประเทศ'],
  '3_5':['ส่วนประกอบประโยค','ประโยคบอกเล่า','ประโยคปฏิเสธ','ประโยคคำถาม','ประโยคเหตุผล','ประโยคเปรียบเทียบ'],
  '3_6':['คำพื้นฐาน','คำกริยา','คำบ้าน','คำโรงเรียน','คำธรรมชาติ','คำสัตว์'],
  '4_1':['สัตว์ (Animals)','อาหาร (Food)','สี (Colors)','ตัวเลข (Numbers)','วันในสัปดาห์','เดือนและฤดูกาล'],
  '4_2':['คำศัพท์บ้าน','คำศัพท์โรงเรียน','Verb to be','Present Simple','Past Simple','Future Simple'],
  '4_3':['Subject Pronouns','Object Pronouns','Possessives','Articles','Prepositions','Conjunctions'],
  '4_4':['Nouns (คำนาม)','Verbs (คำกริยา)','Adjectives','Adverbs','คำแปลผลไม้','คำแปลผัก'],
  '4_5':['ตัวอักษร A-F','ตัวอักษร G-L','ตัวอักษร M-R','ตัวอักษร S-Z','เรียงคำศัพท์','เรียงประโยค'],
  '4_6':['คำศัพท์สัตว์','คำศัพท์อาหาร','คำศัพท์สถานที่','คำศัพท์อาชีพ','คำศัพท์กีฬา','คำศัพท์ธรรมชาติ'],
  '5_1':['ก่อนประวัติศาสตร์','สมัยสุโขทัย','สมัยอยุธยา','สมัยธนบุรี','สมัยรัตนโกสินทร์','ยุคปัจจุบัน'],
  '5_2':['บุคคลสำคัญ','สงครามในไทย','การค้าสมัยโบราณ','ระบอบการปกครอง','ความสัมพันธ์ต่างชาติ','เหตุการณ์สำคัญ'],
  '5_3':['ราชวงศ์ไทย','กษัตริย์สำคัญ','สนธิสัญญา','การปฏิรูปประเทศ','วัฒนธรรมโบราณ','ศิลปกรรม'],
  '5_4':['ยุคสมัยไทย','ยุคสมัยโลก','อารยธรรมโบราณ','ยุคอาณานิคม','สงครามโลก','ยุคสมัยใหม่'],
  '5_5':['ลำดับสุโขทัย','ลำดับอยุธยา','ลำดับรัตนโกสินทร์','เหตุการณ์โลก','การปฏิรูป','ยุคปัจจุบัน'],
  '5_6':['คำศัพท์ราชวงศ์','คำศัพท์สงคราม','คำศัพท์วัฒนธรรม','คำศัพท์เมือง','คำศัพท์ยุคสมัย','คำศัพท์บุคคล'],
  '6_1':['โภชนาการ 5 หมู่','วิตามินและแร่ธาตุ','การออกกำลังกาย','ระบบร่างกาย','โรคและการป้องกัน','สุขอนามัย'],
  '6_2':['สุขภาพกาย','สุขภาพจิต','สุขภาพสิ่งแวดล้อม','การป้องกันโรค','ยาและการใช้','ความปลอดภัย'],
  '6_3':['อาหาร 5 หมู่','สารอาหาร','ระบบย่อยอาหาร','ระบบไหลเวียนโลหิต','ระบบหายใจ','ระบบขับถ่าย'],
  '6_4':['โปรตีน','คาร์โบไฮเดรต','ไขมัน','วิตามิน','แร่ธาตุ','น้ำและใยอาหาร'],
  '6_5':['CPR ขั้นตอน 1-2','CPR ขั้นตอน 3-4','ปฐมพยาบาลเบื้องต้น','การห้ามเลือด','การช่วยคนจมน้ำ','การเคลื่อนย้ายผู้ป่วย'],
  '6_6':['คำศัพท์สุขภาพ','คำศัพท์อาหาร','คำศัพท์กีฬา','คำศัพท์ร่างกาย','คำศัพท์โรค','คำศัพท์ยา'],
};

// ── helper: ดึงคะแนนสูงสุดที่เคยได้ในบทนั้น ──
function getLessonBestScore(gameId, lessonNo){
  const key=`${gameId}_L${lessonNo}`;
  const uid=A.user?.id;
  const sc=(SCORES[uid]||[]).filter(s=>s.lessonKey===key);
  return sc.length?Math.max(...sc.map(s=>s.score)):0;
}

// ══════════════════════════════════════════════════════
// SUBJECTS + GAMES LIST
// ══════════════════════════════════════════════════════
function loadSubs(){
  renderSubCards('subs-grid');
  if (A.role === 'student') fetchProgCache().then(() => renderSubCards('subs-grid'));
}

function openSub(id){
  A.curSub=SUBS.find(s=>s.id===id);
  document.getElementById('games-hd').innerHTML=`${A.curSub.icon} ${A.curSub.name}`;
  document.getElementById('games-back-btn').textContent='← กลับ';
  document.getElementById('games-badge').style.display='none';
  const grid=document.getElementById('games-grid'); grid.innerHTML='';
  const TYPE_LBL={mcq:'🅰 ตอบปรนัย',truefalse:'✅ จริง/เท็จ',fill:'✏️ เติมคำ',
    matching:'🔗 จับคู่',sequence:'📋 เรียงลำดับ',letterorder:'🔤 เรียงตัวอักษร',wordsearch:'🔍 ค้นหาคำ'};
  const TYPE_BG={mcq:'#FFF3E0',truefalse:'#E8F5E9',fill:'#EDE7F6',
    matching:'#E3F2FD',sequence:'#FFF8E1',letterorder:'#EEF2FF',wordsearch:'#FCE4EC'};
  const TYPE_COL={mcq:'#E65100',truefalse:'#1B5E20',fill:'#4527A0',
    matching:'#0D47A1',sequence:'#F57F17',letterorder:'#3730A3',wordsearch:'#880E4F'};
  const lvlLbl={easy:'ง่าย',medium:'ปานกลาง',hard:'ยาก'};
  const myGames=Object.values(GAMES_DB).filter(g=>g.sid===id);
  myGames.forEach((gm,i)=>{
    const tbg=TYPE_BG[gm.type]||'#F3F4F6';
    const tc=TYPE_COL[gm.type]||'#374151';
    grid.innerHTML+=`<div class="gc" style="animation-delay:${i*.07}s">
      <div class="gc-thumb" style="background:linear-gradient(135deg,${A.curSub.color}25,${A.curSub.color}50)">
        <span style="font-size:2.6rem">${gm.icon}</span>
        <span class="gc-tag" style="background:${tbg};color:${tc}">${TYPE_LBL[gm.type]||gm.type}</span>
      </div>
      <div class="gc-body">
        <div class="gc-title">${gm.name}</div>
        <div class="gc-meta">
          <span class="badge ${gm.lvl==='easy'?'be':gm.lvl==='medium'?'bm':'bh'}">${lvlLbl[gm.lvl]}</span>
          <span>⏱ ${gm.time}วิ</span>
        </div>
        ${A.role==='student'
          ?`<div class="gc-lesson-btns">
              <button class="lp-btn-read" onclick="openGameContent('${gm.id}')">📖 อ่านบทเรียน</button>
              <button class="lp-btn-play" onclick="startLesson('${gm.id}',1)">🎮 เล่นเกม</button>
            </div>`
          :'<div style="font-size:.78rem;color:var(--mu);text-align:center;padding:.4rem 0">เฉพาะนักเรียนเล่นได้</div>'}
      </div>
    </div>`;
  });
  sec('games');
}

// ══════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════
// LESSON SELECTOR — ดึง API + ปุ่ม "อ่านเนื้อหา" / "เล่นเกม"

// ══════════════════════════════════════════════════════
// LESSON — 1 บทต่อเกม (ไม่มี sidebar)
// ══════════════════════════════════════════════════════
let _lgid   = null;
let _lcache = {};

// เปิดหน้าอ่านเนื้อหา (จากการ์ดเกม)
async function openGameContent(gameId) {
  _lgid   = gameId;
  _lcache = {};
  const gm  = GAMES_DB[gameId];
  const col = A.curSub?.color || '#2D4059';

  // อัปเดต header
  const hd    = document.getElementById('games-hd');
  const bb    = document.getElementById('games-back-btn');
  const badge = document.getElementById('games-badge');
  if(hd) hd.innerHTML = `<span style="font-size:1.1rem">${gm.icon}</span> ${gm.name}`;
  if(bb) bb.textContent = '← กลับ';
  if(badge){
    badge.textContent = {easy:'ง่าย',medium:'ปานกลาง',hard:'ยาก'}[gm.lvl]||'';
    badge.className   = 'badge '+({easy:'be',medium:'bm',hard:'bh'}[gm.lvl]||'be');
    badge.style.display = 'inline-block';
  }

  // สลับ panel
  document.getElementById('games-grid').style.display = 'none';
  let wrap = document.getElementById('lesson-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'lesson-wrap';
    document.getElementById('s-games').appendChild(wrap);
  }
  wrap.style.display = 'block';
  wrap.innerHTML = `
    <div class="gl-panel">
      <div style="text-align:center;padding:3rem;color:var(--mu)">⏳ กำลังโหลดเนื้อหา...</div>
    </div>`;

  // แปลง JS key '1_1' → DB game_id (integer)
  const dbGameId = jsKeyToDbId(gameId);

  // ดึงเนื้อหา lesson_no=1 (1 บทต่อเกม)
  let html = '', title = gm.name, readTime = 5;
  try {
    const res = await apiLessonContent(dbGameId, 1);
    if (res.ok && res.content) {
      html     = res.content.body      || '';
      title    = res.content.title     || gm.name;
      readTime = res.content.read_time || 5;
    }
  } catch(e) { console.error('[KidLearn] fetch error:', e); }

  wrap.innerHTML = `
    <div class="gl-panel">
      <!-- header บน panel -->
      <div style="display:flex;align-items:center;justify-content:space-between;
        gap:.75rem;margin-bottom:1.25rem;flex-wrap:wrap">
        <div>
          <div style="font-size:1rem;font-weight:800;color:#1E293B">${title}</div>
          <div style="font-size:.75rem;color:var(--mu)">⏱ อ่านประมาณ ${readTime} นาที</div>
        </div>
        <button class="lp-btn-play" style="padding:.55rem 1.25rem;font-size:.88rem"
          onclick="startLesson('${gameId}',1)">🎮 เล่นเกม</button>
      </div>

      <!-- เนื้อหา -->
      <div class="content-body">
        ${html.trim() ? html : `
          <div style="text-align:center;padding:3rem 1rem;color:var(--mu)">
            <div style="font-size:3.5rem;margin-bottom:.75rem">📝</div>
            <div style="font-weight:700;font-size:1rem;margin-bottom:.4rem">ยังไม่มีเนื้อหาบทเรียนนี้</div>
            <div style="font-size:.84rem;line-height:1.8">
              เพิ่มเนื้อหาได้ที่ไฟล์ <strong>content/lessons.sql</strong><br>
              แล้ว import ใน phpMyAdmin
            </div>
          </div>`}
      </div>

      <!-- sticky bar ด้านล่าง -->
      <div class="lp-finish-bar" style="background:linear-gradient(135deg,${col},${col}CC);
        margin:1.5rem -1.75rem -1.75rem;border-radius:0 0 16px 16px">
        <span style="color:#fff;font-size:.9rem;font-weight:600">✅ อ่านครบแล้ว? เริ่มเล่นเลย!</span>
        <button class="lp-finish-btn" style="color:${col}"
          onclick="startLesson('${gameId}',1)">▶ เล่นเกม</button>
      </div>
    </div>`;
}

async function openSub(id){
  A.curSub=SUBS.find(s=>s.id===id);
  document.getElementById('games-hd').innerHTML=`${A.curSub.icon} ${A.curSub.name}`;
  document.getElementById('games-back-btn').textContent='← กลับ';
  document.getElementById('games-badge').style.display='none';
  const grid=document.getElementById('games-grid');
  grid.innerHTML='';
  const wrap = document.getElementById('lesson-wrap');
  if(wrap) wrap.style.display='none';
  grid.style.display='';
  const TYPE_LBL={mcq:'🅰️ ตอบปรนัย',truefalse:'✅ จริง/เท็จ',fill:'✏️ เติมคำ',matching:'🔗 จับคู่',sequence:'📋 เรียงลำดับ',letterorder:'🔤 เรียงตัวอักษร',wordsearch:'🔍 ค้นหาคำ'};
  const TYPE_BG={mcq:'#FFF3E0',truefalse:'#E8F5E9',fill:'#EDE7F6',matching:'#E3F2FD',sequence:'#FFF8E1',letterorder:'#EEF2FF',wordsearch:'#FCE4EC'};
  const TYPE_COL={mcq:'#E65100',truefalse:'#1B5E20',fill:'#4527A0',matching:'#0D47A1',sequence:'#F57F17',letterorder:'#3730A3',wordsearch:'#880E4F'};
  const lvlLbl={easy:'ง่าย',medium:'ปานกลาง',hard:'ยาก'};
  const myGames=Object.values(GAMES_DB).filter(g=>g.sid===id);

  const renderGameCards=(dbGamesMap={})=>{
    grid.innerHTML='';
    myGames.forEach((gm,i)=>{
    const dbMeta=dbGamesMap[gm.code ? String(GAME_DB_IDS[gm.code]) : String(jsKeyToDbId(gm.id))]||{};
    const gameName=dbMeta.name||gm.name;
    const timeLimit=parseInt(dbMeta.time_limit,10)>0?parseInt(dbMeta.time_limit,10):(parseInt(gm.time,10)||60);
    const tbg=TYPE_BG[gm.type]||'#F3F4F6';
    const tc=TYPE_COL[gm.type]||'#374151';
    grid.innerHTML+=`<div class="gc" style="animation-delay:${i*.07}s">
      <div class="gc-thumb" style="background:linear-gradient(135deg,${A.curSub.color}25,${A.curSub.color}50)">
        <span style="font-size:2.6rem">${gm.icon}</span>
        <span class="gc-tag" style="background:${tbg};color:${tc}">${TYPE_LBL[gm.type]||gm.type}</span>
      </div>
      <div class="gc-body">
        <div class="gc-title">${gameName}</div>
        <div class="gc-meta">
          <span class="badge ${gm.lvl==='easy'?'be':gm.lvl==='medium'?'bm':'bh'}">${lvlLbl[gm.lvl]}</span>
          <span>⏱ ${timeLimit} วิ</span>
        </div>
        ${A.role==='student'
          ?`<div class="gc-lesson-btns">
              <button class="lp-btn-read" onclick="openGameContent('${gm.id}')">📖 อ่านบทเรียน</button>
              <button class="lp-btn-play" onclick="startLesson('${gm.id}',1)">🎮 เล่นเกม</button>
            </div>`
          :'<div style="font-size:.78rem;color:var(--mu);text-align:center;padding:.4rem 0">เฉพาะนักเรียนเล่นได้</div>'}
      </div>
    </div>`;
    });
  };

  sec('games');
  renderGameCards();

  try{
    const res=await apiGames(id);
    if(A.curSub?.id!==id) return;
    if(res?.ok && Array.isArray(res.games)){
      res.games.forEach(game=>{
        if(game.game_code) GAME_DB_IDS[game.game_code]=Number(game.game_id);
      });
      const dbGamesMap=Object.fromEntries(res.games.map(game=>[String(game.game_id),game]));
      renderGameCards(dbGamesMap);
    }
  }catch(e){
    console.warn('[openSub] failed to load dynamic game meta',e);
  }
}

function closeLessons() {
  const wrap = document.getElementById('lesson-wrap');
  if (wrap) wrap.style.display = 'none';
  document.getElementById('games-grid').style.display = '';
  const hd    = document.getElementById('games-hd');
  const badge = document.getElementById('games-badge');
  if(A.curSub && hd) hd.innerHTML = `${A.curSub.icon} ${A.curSub.name}`;
  if(badge) badge.style.display = 'none';
}

function startLesson(gameId, lessonNo) {
  A.curLessonNo = lessonNo || 1;
  // เก็บ dbGameId ไว้ใช้ตอน save score
  A.curDbGameId = jsKeyToDbId(gameId);
  openModal(gameId, lessonNo || 1);
}

function backToGames() {
  clearInterval(A.tmr);
  const wrap = document.getElementById('lesson-wrap');
  if (wrap) wrap.style.display = 'none';
  document.getElementById('games-grid').style.display = '';
  if (A.curSub) openSub(A.curSub.id);
  else sec('subs');
}

function gamesBack() {
  const wrap = document.getElementById('lesson-wrap');
  if (wrap && wrap.style.display !== 'none') {
    closeLessons();
  } else {
    sec('subs');
  }
}

// legacy stubs
function openLessons(gid){ openGameContent(gid); }
function openContent(gid){ openGameContent(gid); }
function closeContent(){ closeLessons(); }
