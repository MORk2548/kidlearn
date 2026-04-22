// ══════════════════════════════════════════════════════
// DATA — USERS
// ══════════════════════════════════════════════════════
let USERS = []; // ข้อมูลมาจาก PHP API

// ══════════════════════════════════════════════════════
// DATA — SUBJECTS
// ══════════════════════════════════════════════════════
const SUBS = [
  { id:1, name:'คณิตศาสตร์', icon:'🔢', color:'#FF9800', desc:'ตัวเลข การคำนวณ โจทย์ปัญหา' },
  { id:2, name:'วิทยาศาสตร์', icon:'🔬', color:'#9C27B0', desc:'ธรรมชาติ สิ่งแวดล้อม การทดลอง' },
  { id:3, name:'ภาษาไทย',    icon:'🇹🇭', color:'#4CAF50', desc:'อ่าน เขียน ความรู้ภาษาไทย' },
  { id:4, name:'ภาษาอังกฤษ', icon:'🇬🇧', color:'#2196F3', desc:'คำศัพท์ ไวยากรณ์ สื่อสาร' },
  { id:5, name:'ประวัติศาสตร์',icon:'📜', color:'#795548', desc:'เหตุการณ์ บุคคลสำคัญ ยุคสมัย' },
  { id:6, name:'สุขศึกษา',   icon:'💪', color:'#E91E63', desc:'สุขภาพ ออกกำลังกาย โภชนาการ' },
];

// ══════════════════════════════════════════════════════
// WORD SEARCH GRID BUILDERS (must be before GAMES_DB)
// ══════════════════════════════════════════════════════
function wsGrid(words) {
  const SIZE=10, th='กขคงจฉชซดตถทนบปผพฝฟมยรวสหอฮ';
  const grid=Array.from({length:SIZE},()=>Array.from({length:SIZE},()=>th[Math.floor(Math.random()*th.length)]));
  const placed=[];
  words.forEach((w,i)=>{
    const chars=[...w];
    if(chars.length<=SIZE){
      const row=i%SIZE;
      chars.forEach((ch,ci)=>grid[row][ci]=ch);
      placed.push({word:w,row,cols:chars.map((_,ci)=>ci)});
    }
  });
  return{grid,placed};
}
function wsGridEn(words) {
  const SIZE=10, alpha='abcdefghijklmnopqrstuvwxyz';
  const grid=Array.from({length:SIZE},()=>Array.from({length:SIZE},()=>alpha[Math.floor(Math.random()*26)]));
  const placed=[];
  words.forEach((w,i)=>{
    if(w.length<=SIZE){
      const row=i%SIZE;
      [...w].forEach((ch,ci)=>grid[row][ci]=ch);
      placed.push({word:w,row,cols:[...w].map((_,ci)=>ci)});
    }
  });
  return{grid,placed};
}

function makePictureQuizImage(emoji, label, bgA='#DBEAFE', bgB='#BFDBFE') {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${bgA}"/>
          <stop offset="100%" stop-color="${bgB}"/>
        </linearGradient>
      </defs>
      <rect width="320" height="240" rx="28" fill="url(#g)"/>
      <circle cx="65" cy="60" r="26" fill="rgba(255,255,255,.32)"/>
      <circle cx="270" cy="52" r="18" fill="rgba(255,255,255,.28)"/>
      <rect x="28" y="24" width="264" height="192" rx="22" fill="rgba(255,255,255,.30)"/>
      <text x="160" y="128" text-anchor="middle" font-size="90">${emoji}</text>
      <text x="160" y="198" text-anchor="middle" font-size="26" font-family="Arial, sans-serif" fill="#1E3A8A">${label}</text>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

// ══════════════════════════════════════════════════════
// DATA — GAMES (6 per subject = 36 total)
// ══════════════════════════════════════════════════════
const GAMES_DB = {

// ╔═══════════════════════════════════════╗
// ║  วิชา 1 — คณิตศาสตร์                   ║
// ╚═══════════════════════════════════════╝
'1_1':{ id:'1_1', sid:1, name:'บวกลบคล่อง',       type:'mcq',       icon:'➕', lvl:'easy',   time:60,
  qs:[
    {q:'15 + 27 = ?',         opts:['40','42','41','43'], ans:1},
    {q:'56 - 19 = ?',         opts:['37','35','38','36'], ans:0},
    {q:'8 × 7 = ?',           opts:['54','56','58','52'], ans:1},
    {q:'81 ÷ 9 = ?',          opts:['8','9','7','10'],   ans:1},
    {q:'(4 + 6) × 3 = ?',     opts:['30','28','32','24'],ans:0},
    {q:'100 - 47 = ?',        opts:['53','55','57','51'],ans:0},
  ]},
'1_2':{ id:'1_2', sid:1, name:'จริงหรือเท็จ เลขคณิต', type:'truefalse', icon:'✅', lvl:'easy', time:60,
  qs:[
    {q:'7 × 8 = 56',                    ans:true},
    {q:'12 + 13 = 26',                  ans:false},
    {q:'100 ÷ 5 = 20',                  ans:true},
    {q:'จำนวนคู่คือ 2, 4, 6, 8, 10',   ans:true},
    {q:'15 เป็นจำนวนเฉพาะ',             ans:false},
    {q:'0.5 = 1/2',                     ans:true},
  ]},
'1_3':{ id:'1_3', sid:1, name:'เติมสมการ',         type:'fill',      icon:'✏️', lvl:'medium', time:90,
  qs:[
    {q:'___ + 15 = 30',         hint:'30 - 15',                ans:'15'},
    {q:'7 × ___ = 63',          hint:'63 ÷ 7',                 ans:'9'},
    {q:'พื้นที่สี่เหลี่ยม กว้าง 5 ยาว 8 = ___', hint:'กว้าง×ยาว', ans:'40'},
    {q:'0.25 = ___/100',        hint:'0.25 × 100',             ans:'25'},
    {q:'ครึ่งของ 64 คือ ___',   hint:'64 ÷ 2',                 ans:'32'},
    {q:'3² + 4² = ___²  (ทฤษฎีพีทาโกรัส)', hint:'9+16=25', ans:'5'},
  ]},
'1_4':{ id:'1_4', sid:1, name:'จับคู่สัญลักษณ์',   type:'matching',  icon:'🔗', lvl:'easy',   time:90,
  pairs:[
    {left:'บวก',    right:'+'},
    {left:'ลบ',     right:'-'},
    {left:'คูณ',    right:'×'},
    {left:'หาร',    right:'÷'},
    {left:'เท่ากับ',right:'='},
    {left:'ไม่เท่ากับ',right:'≠'},
  ]},
'1_5':{ id:'1_5', sid:1, name:'เรียงตัวเลข',        type:'sequence',  icon:'📋', lvl:'medium', time:90,
  items:[
    {id:'a',text:'½ (0.5)',    order:1},
    {id:'b',text:'¾ (0.75)',   order:2},
    {id:'c',text:'1',          order:3},
    {id:'d',text:'1.5',        order:4},
    {id:'e',text:'2',          order:5},
    {id:'f',text:'3',          order:6},
  ]},
'1_6':{ id:'1_6', sid:1, name:'ค้นหาตัวเลข',        type:'wordsearch', icon:'🔍', lvl:'easy',  time:120,
  words:['บวก','ลบ','คูณ','หาร','เลข','จำนวน'],
  gridData:wsGrid(['บวก','ลบ','คูณ','หาร','เลข','จำนวน'])},

// ╔═══════════════════════════════════════╗
// ║  วิชา 2 — วิทยาศาสตร์                  ║
// ╚═══════════════════════════════════════╝
'2_1':{ id:'2_1', sid:2, name:'แรงในชีวิตประจำวัน',        type:'mcq',       icon:'💪', lvl:'easy',  time:60,
  qs:[
    {q:'ดาวเคราะห์ที่อยู่ใกล้ดวงอาทิตย์ที่สุดคือ?', opts:['ดาวศุกร์','ดาวพุธ','โลก','ดาวอังคาร'], ans:1},
    {q:'ดวงจันทร์โคจรรอบ?',                         opts:['ดวงอาทิตย์','โลก','ดาวอังคาร','ดาวพฤหัส'],ans:1},
    {q:'สิ่งมีชีวิตใช้ก๊าซใดในการหายใจ?',            opts:['CO₂','N₂','O₂','H₂'],               ans:2},
    {q:'น้ำแข็งละลายเป็นน้ำเรียกว่า?',              opts:['การระเหย','การหลอมเหลว','การควบแน่น','การแข็งตัว'],ans:1},
    {q:'เซลล์พืชแต่ต่างจากเซลล์สัตว์คือมี?',        opts:['นิวเคลียส','เยื่อหุ้มเซลล์','ผนังเซลล์','ไซโตพลาซึม'],ans:2},
    {q:'การสังเคราะห์แสงเกิดขึ้นใน?',               opts:['ราก','ลำต้น','ใบ','ดอก'],            ans:2},
  ]},
'2_2':{ id:'2_2', sid:2, name:'เสียงกับการได้ยิน', type:'truefalse', icon:'🔊', lvl:'easy',  time:60,
  qs:[
    {q:'☀️ ดวงอาทิตย์เป็นดาวเคราะห์',                ans:false},
    {q:'💧 สูตรเคมีของน้ำคือ H₂O',                   ans:true},
    {q:'🌱 พืชสังเคราะห์แสงโดยใช้แสงอาทิตย์',        ans:true},
    {q:'🔴 เลือดมีสีแดงเพราะมีฮีโมโกลบิน',            ans:true},
    {q:'🌕 ดวงจันทร์ออกแสงสว่างเองได้',               ans:false},
    {q:'⚡ ฟ้าผ่าคือการปล่อยประจุไฟฟ้า',              ans:true},
  ]},
'2_3':{ id:'2_3', sid:2, name:'การเปลี่ยนแปลงสารในชีวิตประจำวัน',  type:'fill',      icon:'🔬', lvl:'medium', time:90,
  qs:[
    {q:'ก๊าซที่พืชปล่อยออกมาในระหว่างสังเคราะห์แสงคือ', hint:'สิ่งที่เราหายใจ', ans:'ออกซิเจน'},
    {q:'สัตว์ที่มีกระดูกสันหลังเรียกว่า?',              hint:'Vertebrate',       ans:'สัตว์มีกระดูกสันหลัง'},
    {q:'หน่วยพื้นฐานของสิ่งมีชีวิตคือ',                 hint:'Cell',             ans:'เซลล์'},
    {q:'แรงดึงดูดของโลกที่ดึงวัตถุลงคือ',               hint:'Gravity',          ans:'แรงโน้มถ่วง'},
    {q:'อุณหภูมิที่น้ำเดือดในหน่วย °C คือ',             hint:'100',              ans:'100'},
    {q:'ธาตุที่เบาที่สุดในตารางธาตุคือ',                 hint:'H',               ans:'ไฮโดรเจน'},
  ]},
'2_4':{ id:'2_4', sid:2, name:'น้ำในท้องถิ่มของเรา', type:'matching', icon:'💧', lvl:'medium', time:90,
  pairs:[
    {left:'🌳 ต้นไม้',    right:'Plantae'},
    {left:'🐶 สุนัข',     right:'Animalia'},
    {left:'🍄 เห็ด',      right:'Fungi'},
    {left:'🦠 แบคทีเรีย', right:'Monera'},
    {left:'🟢 สาหร่าย',   right:'Protista'},
    {left:'🧫 ยีสต์',     right:'Fungi'},
  ]},
'2_5':{ id:'2_5', sid:2, name:'ปรากฏการณ์ธรรมชาติที่เกี่ยวข้องกับวัฏจักรน้ำ',    type:'sequence',  icon:'🌊', lvl:'medium', time:90,
  items:[
    {id:'a',text:'☀️ การระเหย (Evaporation)',    order:1},
    {id:'b',text:'☁️ การก่อตัวของเมฆ',            order:2},
    {id:'c',text:'🌧️ ฝนตก (Precipitation)',      order:3},
    {id:'d',text:'🏔️ น้ำไหลลงสู่แม่น้ำ',          order:4},
    {id:'e',text:'🌊 น้ำสะสมในทะเล/แหล่งน้ำ',    order:5},
    {id:'f',text:'🔄 วัฏจักรเริ่มใหม่',            order:6},
  ]},
'2_6':{ id:'2_6', sid:2, name:'ค้นหาคำวิทย์',      type:'wordsearch', icon:'🔍', lvl:'easy',  time:120,
  words:['เซลล์','แสง','น้ำ','ดิน','อากาศ','พลังงาน'],
  gridData:wsGrid(['เซลล์','แสง','น้ำ','ดิน','อากาศ','พลังงาน'])},

// ╔═══════════════════════════════════════╗
// ║  วิชา 3 — ภาษาไทย                     ║
// ╚═══════════════════════════════════════╝
'3_1':{ id:'3_1', sid:3, name:'คำถามภาษาไทย',       type:'mcq',       icon:'📖', lvl:'easy',  time:60,
  qs:[
    {q:'ประเทศไทยมีกี่จังหวัด?',               opts:['75','76','77','78'],     ans:2},
    {q:'ดอกไม้ประจำชาติไทยคืออะไร?',           opts:['กล้วยไม้','ดอกบัว','ราชพฤกษ์','มะลิ'],ans:2},
    {q:'ภาษาไทยมีพยัญชนะกี่ตัว?',             opts:['42','44','44','46'],     ans:1},
    {q:'วันภาษาไทยแห่งชาติตรงกับวันที่?',      opts:['29 ก.ค.','23 ก.ย.','5 ธ.ค.','1 ม.ค.'],ans:0},
    {q:'"สุนัข" ภาษาราชการเรียกว่าอะไร?',      opts:['แมว','โค','หมา','กวาง'],ans:2},
    {q:'คำว่า "ประชาธิปไตย" มีกี่พยางค์?',     opts:['5','6','7','4'],         ans:1},
  ]},
'3_2':{ id:'3_2', sid:3, name:'จริงหรือเท็จ ภาษาไทย',type:'truefalse',icon:'✔️', lvl:'easy', time:60,
  qs:[
    {q:'ภาษาไทยมีวรรณยุกต์ 5 รูป 4 เสียง',    ans:false},
    {q:'พระบิดาแห่งภาษาไทยคือรัชกาลที่ 9',    ans:true},
    {q:'คำว่า "รัก" เป็นคำกริยา',               ans:true},
    {q:'ไตรยางศ์มี 3 หมู่ คือ สูง กลาง ต่ำ',  ans:true},
    {q:'อักษรสูงมี 12 ตัว',                    ans:false},
    {q:'"กา" และ "ก้า" ออกเสียงต่างกันด้วยวรรณยุกต์', ans:true},
  ]},
'3_3':{ id:'3_3', sid:3, name:'เติมคำภาษาไทย',      type:'fill',      icon:'✏️', lvl:'medium', time:90,
  qs:[
    {q:'ดิฉัน_____ไปโรงเรียนทุกวัน (กริยา)',   hint:'การเดินทาง',  ans:'ไป'},
    {q:'นกมีปีก สุนัขมี___',                    hint:'ขา 4 ข้าง',  ans:'ขา'},
    {q:'"สวรรค์" อ่านว่า',                      hint:'ออกเสียง สะ-วัน', ans:'สะหวัน'},
    {q:'คำว่า "เขียว" เป็นคำ_____',             hint:'บอกลักษณะ',  ans:'วิเศษณ์'},
    {q:'วลีที่มีความหมายว่า "ขยัน" คือ',        hint:'มดหรือผึ้ง',  ans:'ขยันเหมือนมด'},
    {q:'ประโยค "แมวกินปลา" มีประธานคือ',        hint:'ใครทำอะไร',  ans:'แมว'},
  ]},
'3_4':{ id:'3_4', sid:3, name:'จับคู่ประเภทคำ',     type:'matching',  icon:'📝', lvl:'medium', time:90,
  pairs:[
    {left:'วิ่ง',     right:'คำกริยา'},
    {left:'สวย',     right:'คำวิเศษณ์'},
    {left:'โต๊ะ',    right:'คำนาม'},
    {left:'และ',     right:'คำสันธาน'},
    {left:'ใน',      right:'คำบุพบท'},
    {left:'โอ้โห',   right:'คำอุทาน'},
  ]},
'3_5':{ id:'3_5', sid:3, name:'เรียงประโยค',         type:'sequence',  icon:'📋', lvl:'medium', time:90,
  items:[
    {id:'a',text:'📌 ประธาน (Subject)',          order:1},
    {id:'b',text:'🏃 กริยา (Verb)',               order:2},
    {id:'c',text:'🎯 กรรม (Object)',              order:3},
    {id:'d',text:'📍 ส่วนขยาย (Modifier)',       order:4},
    {id:'e',text:'❓ คำถาม (Question word)',      order:5},
    {id:'f',text:'🔚 เครื่องหมายวรรคตอน',         order:6},
  ]},
'3_6':{ id:'3_6', sid:3, name:'ค้นหาคำภาษาไทย',     type:'wordsearch', icon:'🔍', lvl:'easy', time:120,
  words:['กิน','นอน','วิ่ง','เล่น','เรียน','อ่าน'],
  gridData:wsGrid(['กิน','นอน','วิ่ง','เล่น','เรียน','อ่าน'])},

// ╔═══════════════════════════════════════╗
// ║  วิชา 4 — ภาษาอังกฤษ                  ║
// ╚═══════════════════════════════════════╝
'4_1':{ id:'4_1', sid:4, name:'คำศัพท์สัตว์',       type:'mcq',       icon:'🐾', lvl:'easy',  time:60,
  qs:[
    {q:'🐶 Dog คืออะไร?',   opts:['แมว','สุนัข','กระต่าย','หมู'],  ans:1},
    {q:'🐘 Elephant คืออะไร?',opts:['เสือ','สิงโต','ช้าง','ยีราฟ'],ans:2},
    {q:'🦁 Lion คืออะไร?',  opts:['เสือ','สิงโต','หมี','หมาป่า'],  ans:1},
    {q:'🐟 Fish คืออะไร?',  opts:['นก','งู','ปลา','กบ'],           ans:2},
    {q:'🐦 Bird คืออะไร?',  opts:['ผึ้ง','แมลง','นก','ผีเสื้อ'],   ans:2},
    {q:'🐇 Rabbit คืออะไร?',opts:['กระแต','กระต่าย','กระรอก','หนู'],ans:1},
  ]},
'4_2':{ id:'4_2', sid:4, name:'จริงหรือเท็จ English',type:'truefalse',icon:'🅰️', lvl:'easy',  time:60,
  qs:[
    {q:'"Apple" หมายถึง ส้ม',               ans:false},
    {q:'"Monday" เป็นวันแรกของสัปดาห์',     ans:true},
    {q:'"Red" หมายถึง สีแดง',               ans:true},
    {q:'"Book" เป็น verb (กริยา)',           ans:false},
    {q:'"Happy" หมายถึง เศร้า',             ans:false},
    {q:'"12 months = 1 year" is correct',  ans:true},
  ]},
'4_3':{ id:'4_3', sid:4, name:'เติมคำศัพท์',         type:'fill',      icon:'✏️', lvl:'medium', time:90,
  qs:[
    {q:'I ___ a student. (to be)',           hint:'am / is / are',  ans:'am'},
    {q:'She ___ to school everyday.',        hint:'go / goes / gone',ans:'goes'},
    {q:'The color of the sky is ___.',       hint:'สีท้องฟ้า',       ans:'blue'},
    {q:'1+1 = ___ (in English)',             hint:'สอง',              ans:'two'},
    {q:'"สุนัข" in English is ___.',         hint:'man\'s best friend',ans:'dog'},
    {q:'Opposite of "big" is ___.',          hint:'ตรงข้ามกับใหญ่',   ans:'small'},
  ]},
'4_4':{ id:'4_4', sid:4, name:'จับคู่คำแปล',         type:'matching',  icon:'🔗', lvl:'easy',  time:90,
  pairs:[
    {left:'🍎 Apple',  right:'แอปเปิ้ล'},
    {left:'📚 Book',   right:'หนังสือ'},
    {left:'🌟 Star',   right:'ดาว'},
    {left:'🏠 House',  right:'บ้าน'},
    {left:'🌈 Rainbow',right:'รุ้งกินน้ำ'},
    {left:'🎵 Music',  right:'ดนตรี'},
  ]},
'4_5':{ id:'4_5', sid:4, name:'เรียง A-Z',            type:'sequence',  icon:'🔤', lvl:'easy',  time:60,
  items:[
    {id:'a',text:'🔵 Blue',    order:1},
    {id:'b',text:'🟢 Green',   order:2},
    {id:'c',text:'🟠 Orange',  order:3},
    {id:'d',text:'🔴 Red',     order:4},
    {id:'e',text:'🌸 Rose',    order:5},
    {id:'f',text:'🟡 Yellow',  order:6},
  ]},
'4_6':{ id:'4_6', sid:4, name:'Word Search',           type:'wordsearch', icon:'🔍', lvl:'easy', time:120,
  words:['cat','dog','fish','bird','book','pen'],
  gridData:wsGridEn(['cat','dog','fish','bird','book','pen'])},

// ╔═══════════════════════════════════════╗
// ║  วิชา 5 — สังคมศึกษา                ║
// ╚═══════════════════════════════════════╝
'5_1':{ id:'5_1', sid:5, name:'ถามประวัติศาสตร์',     type:'mcq',       icon:'📜', lvl:'medium',time:60,
  qs:[
    {q:'กรุงสุโขทัยถูกสถาปนาในปี พ.ศ. ใด?',       opts:['พ.ศ.1800','พ.ศ.1893','พ.ศ.1762','พ.ศ.2310'], ans:0},
    {q:'พ่อขุนรามคำแหงทรงประดิษฐ์สิ่งใด?',         opts:['เงินตรา','ตัวอักษรไทย','ระบบชลประทาน','กฎหมาย'],ans:1},
    {q:'กรุงศรีอยุธยาเป็นเมืองหลวงของไทยกี่ปี?',   opts:['400','417','350','450'],                    ans:1},
    {q:'ไทยเปลี่ยนการปกครองเป็นระบอบประชาธิปไตยปี?',opts:['พ.ศ.2475','พ.ศ.2500','พ.ศ.2490','พ.ศ.2460'],ans:0},
    {q:'รัชกาลที่ 1 ทรงสถาปนากรุงใด?',             opts:['กรุงธนบุรี','กรุงเทพฯ','กรุงศรีอยุธยา','กรุงสุโขทัย'],ans:1},
    {q:'วันชาติไทยตรงกับวันที่?',                   opts:['5 ธ.ค.','28 ก.ค.','23 ต.ค.','5 พ.ค.'],       ans:1},
  ]},
'5_2':{ id:'5_2', sid:5, name:'จริงหรือเท็จ ประวัติ', type:'truefalse', icon:'⚔️', lvl:'medium',time:60,
  qs:[
    {q:'กรุงสุโขทัยเป็นราชธานีแรกของไทย',          ans:true},
    {q:'สมเด็จพระนเรศวรทรงกอบกู้เอกราชจากพม่า',    ans:true},
    {q:'กรุงรัตนโกสินทร์สถาปนาในปี พ.ศ.2310',      ans:false},
    {q:'รัชกาลที่ 5 ทรงยกเลิกทาสในไทย',            ans:true},
    {q:'ไทยเคยตกเป็นเมืองขึ้นของอังกฤษ',           ans:false},
    {q:'วันปิยมหาราชตรงกับวันที่ 23 ตุลาคม',       ans:true},
  ]},
'5_3':{ id:'5_3', sid:5, name:'เติมคำประวัติศาสตร์', type:'fill',      icon:'✏️', lvl:'hard',   time:90,
  qs:[
    {q:'พ่อขุนรามคำแหงเป็นกษัตริย์ราชวงศ์?',        hint:'ผู้ก่อตั้งสุโขทัย',          ans:'ศรีนาวนำถุม'},
    {q:'กรุงศรีอยุธยาเสียครั้งที่ 2 ปี พ.ศ.___',   hint:'ปีที่ถูกพม่าตี ครั้งสุดท้าย',ans:'2310'},
    {q:'รัชกาลที่ 4 ทรงพระนามว่า___',               hint:'มงกุฎ',                       ans:'พระจอมเกล้าเจ้าอยู่หัว'},
    {q:'วันฉัตรมงคลตรงกับวันที่ ___ พฤษภาคม',      hint:'ต้นเดือน',                    ans:'4'},
    {q:'ประเทศไทยมีพระมหากษัตริย์รัชกาลที่ ___ ปัจจุบัน',hint:'10',                  ans:'10'},
    {q:'สนธิสัญญาเบาว์ริ่งทำกับประเทศ?',            hint:'ชาติตะวันตก',                 ans:'อังกฤษ'},
  ]},
'5_4':{ id:'5_4', sid:5, name:'จับคู่ยุคสมัย',       type:'matching',  icon:'🏛️', lvl:'medium', time:90,
  pairs:[
    {left:'สุโขทัย',        right:'พ่อขุนรามคำแหง'},
    {left:'อยุธยา',         right:'สมเด็จพระนเรศวร'},
    {left:'ธนบุรี',         right:'สมเด็จพระเจ้าตากสิน'},
    {left:'รัตนโกสินทร์ตอนต้น',right:'รัชกาลที่ 1'},
    {left:'รัชกาลที่ 5',    right:'ปฏิรูปประเทศ'},
    {left:'พ.ศ.2475',       right:'เปลี่ยนการปกครอง'},
  ]},
'5_5':{ id:'5_5', sid:5, name:'เรียงยุคสมัยไทย',     type:'sequence',  icon:'⏳', lvl:'medium', time:90,
  items:[
    {id:'a',text:'🏯 สมัยสุโขทัย (ราวพ.ศ.1800)',     order:1},
    {id:'b',text:'⚔️ สมัยอยุธยา (พ.ศ.1893-2310)',    order:2},
    {id:'c',text:'🏰 สมัยธนบุรี (พ.ศ.2310-2325)',    order:3},
    {id:'d',text:'👑 สมัยรัตนโกสินทร์ (พ.ศ.2325-)',  order:4},
    {id:'e',text:'🗳️ ประชาธิปไตย (พ.ศ.2475)',        order:5},
    {id:'f',text:'🇹🇭 ยุคปัจจุบัน',                  order:6},
  ]},
'5_6':{ id:'5_6', sid:5, name:'ค้นหาคำประวัติ',      type:'wordsearch', icon:'🔍', lvl:'medium',time:120,
  words:['ไทย','กษัตริย์','ราชวงศ์','อยุธยา','ประวัติ','ชาติ'],
  gridData:wsGrid(['ไทย','กษัตริย์','ราชวงศ์','อยุธยา','ประวัติ','ชาติ'])},

// ╔═══════════════════════════════════════╗
// ║  วิชา 6 — สุขศึกษา                   ║
// ╚═══════════════════════════════════════╝
'6_1':{ id:'6_1', sid:6, name:'ถามสุขศึกษา',          type:'mcq',       icon:'💊', lvl:'easy',  time:60,
  qs:[
    {q:'ควรนอนหลับวันละกี่ชั่วโมง (เด็ก)?',        opts:['6','7','8-10','5'],    ans:2},
    {q:'อาหารประเภทใดให้พลังงานมากที่สุด?',         opts:['โปรตีน','ไขมัน','คาร์โบไฮเดรต','วิตามิน'],ans:2},
    {q:'การออกกำลังกายควรทำสัปดาห์ละกี่วัน?',      opts:['1','2','3-5','7'],     ans:2},
    {q:'วิตามินซีพบมากในอาหารใด?',                 opts:['เนื้อสัตว์','ส้ม','ข้าว','นม'],       ans:1},
    {q:'อวัยวะใดที่ทำหน้าที่กรองเลือด?',           opts:['หัวใจ','ปอด','ไต','ตับ'],             ans:2},
    {q:'BMI ย่อมาจากอะไร?',                        opts:['Body Mass Index','Brain Mind Indicator','Blood Metabolism Index','Body Muscle Index'],ans:0},
  ]},
'6_2':{ id:'6_2', sid:6, name:'จริงหรือเท็จ สุขภาพ', type:'truefalse', icon:'🏃', lvl:'easy',  time:60,
  qs:[
    {q:'🏃 การวิ่งช่วยให้หัวใจแข็งแรง',           ans:true},
    {q:'🍬 น้ำตาลมากเกินไปทำให้ฟันผุ',            ans:true},
    {q:'😴 การนอนน้อยไม่มีผลต่อสุขภาพ',           ans:false},
    {q:'🥦 ผักใบเขียวมีวิตามินและแร่ธาตุสูง',      ans:true},
    {q:'💧 ควรดื่มน้ำอย่างน้อย 2 ลิตรต่อวัน',    ans:true},
    {q:'🚬 การสูบบุหรี่ไม่มีโทษต่อสุขภาพ',        ans:false},
  ]},
'6_3':{ id:'6_3', sid:6, name:'เติมคำสุขภาพ',        type:'fill',      icon:'✏️', lvl:'medium', time:90,
  qs:[
    {q:'อาหาร 5 หมู่ หมู่ที่ 1 คือ',               hint:'เนื้อสัตว์ ไข่ นม',      ans:'โปรตีน'},
    {q:'หัวใจสูบฉีดเลือดไปทั่วร่างกายโดยใช้___',   hint:'อวัยวะกลางอก',           ans:'การหดตัว'},
    {q:'อุณหภูมิร่างกายปกติประมาณ ___ °C',         hint:'36-37',                  ans:'36.5'},
    {q:'การล้างมือด้วย___ ช่วยฆ่าเชื้อโรคได้ดี',   hint:'ของเหลวทำความสะอาด',     ans:'สบู่'},
    {q:'การยืดเหยียดก่อนออกกำลังกายเรียกว่า',      hint:'Warm up',                ans:'การอบอุ่นร่างกาย'},
    {q:'เด็กอายุ 6-12 ปีควรดื่มนมวันละ ___ แก้ว', hint:'2-3',                    ans:'3'},
  ]},
'6_4':{ id:'6_4', sid:6, name:'จับคู่โภชนาการ',      type:'matching',  icon:'🥗', lvl:'easy',  time:90,
  pairs:[
    {left:'🥩 เนื้อสัตว์', right:'โปรตีน'},
    {left:'🍚 ข้าว',        right:'คาร์โบไฮเดรต'},
    {left:'🥑 อาโวคาโด',   right:'ไขมันดี'},
    {left:'🥦 บรอกโคลี',   right:'วิตามิน'},
    {left:'🦴 นม',          right:'แคลเซียม'},
    {left:'🍊 ส้ม',         right:'วิตามินซี'},
  ]},
'6_5':{ id:'6_5', sid:6, name:'เรียงขั้นตอน CPR',    type:'sequence',  icon:'❤️', lvl:'hard',   time:90,
  items:[
    {id:'a',text:'📞 โทรเรียกรถพยาบาล 1669',        order:1},
    {id:'b',text:'🧍 ตรวจสอบความปลอดภัยของสถานที่', order:2},
    {id:'c',text:'👐 เริ่มกดหน้าอก 30 ครั้ง',       order:3},
    {id:'d',text:'👄 เป่าลมเข้าปาก 2 ครั้ง',        order:4},
    {id:'e',text:'🔄 ทำซ้ำ 30:2 จนกว่ารถพยาบาลจะมา',order:5},
    {id:'f',text:'✅ ส่งต่อให้ทีมแพทย์',             order:6},
  ]},
'6_6':{ id:'6_6', sid:6, name:'ค้นหาคำสุขภาพ',      type:'wordsearch', icon:'🔍', lvl:'easy',  time:120,
  words:['วิ่ง','นอน','อาหาร','น้ำ','สุขภาพ','ออกกำลัง'],
  gridData:wsGrid(['วิ่ง','นอน','อาหาร','น้ำ','สุขภาพ','ออกกำลัง'])},
};

// ══════════════════════════════════════════════════════
// MOCK SCORES (per student id)
// ══════════════════════════════════════════════════════
GAMES_DB['4_1'] = {
  ...GAMES_DB['4_1'],
  name:'เติมคำจากภาพ',
  type:'fill',
  icon:'🖼️',
  preferStatic:true,
  qs:[
    {q:'Look at the picture and type the English word.', img:makePictureQuizImage('🐘','Elephant'), hint:'Starts with e', ans:'elephant'},
    {q:'Look at the picture and type the English word.', img:makePictureQuizImage('🐕','Dog','#DCFCE7','#BBF7D0'), hint:'Starts with d', ans:'dog'},
    {q:'Look at the picture and type the English word.', img:makePictureQuizImage('🦁','Lion','#FEF3C7','#FDE68A'), hint:'Starts with l', ans:'lion'},
    {q:'Look at the picture and type the English word.', img:makePictureQuizImage('🐟','Fish','#E0F2FE','#BAE6FD'), hint:'Starts with f', ans:'fish'},
    {q:'Look at the picture and type the English word.', img:makePictureQuizImage('🐦','Bird','#F3E8FF','#E9D5FF'), hint:'Starts with b', ans:'bird'},
    {q:'Look at the picture and type the English word.', img:makePictureQuizImage('🐇','Rabbit','#FCE7F3','#FBCFE8'), hint:'Starts with r', ans:'rabbit'},
  ]
};

let SCORES = {}; // ข้อมูลมาจาก PHP API

// ══════════════════════════════════════════════════════
// APP STATE
