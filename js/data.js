// ══════════════════════════════════════════════════════
// DATA — USERS
// ══════════════════════════════════════════════════════
let USERS = []; // ข้อมูลมาจาก PHP API

function formatDateTimeTH(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
}

// ══════════════════════════════════════════════════════
// DATA — SUBJECTS
// ══════════════════════════════════════════════════════
const SUBS = [
  { id:1, name:'คณิตศาสตร์', icon:'🔢', cover:'images/covers/math-p5.jpg', color:'#FF9800', desc:'ตัวเลข การคำนวณ โจทย์ปัญหา' },
  { id:2, name:'วิทยาศาสตร์', icon:'🔬', cover:'images/covers/sci-p5.jpg', color:'#9C27B0', desc:'ธรรมชาติ สิ่งแวดล้อม การทดลอง' },
  { id:3, name:'ภาษาไทย',    icon:'🇹🇭', cover:'images/covers/thai-p5.webp', color:'#4CAF50', desc:'อ่าน เขียน ความรู้ภาษาไทย' },
  { id:4, name:'ภาษาอังกฤษ', icon:'🇬🇧', cover:'images/covers/eng-p5.webp', color:'#2196F3', desc:'คำศัพท์ ไวยากรณ์ สื่อสาร' },
  { id:5, name:'สังคมศึกษา',icon:'📜', cover:'images/covers/social-p5.png', color:'#795548', desc:'เหตุการณ์ บุคคลสำคัญ ยุคสมัย' },
  { id:6, name:'สุขศึกษาและพลศึกษา', icon:'💪', cover:'images/covers/health-p5.png', color:'#E91E63', desc:'สุขภาพ อาหาร กีฬา ความปลอดภัย ทีมเวิร์ก' },
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

// ══════════════════════════════════════════════════════
// DATA — GAMES (6 per subject = 36 total)
// ══════════════════════════════════════════════════════
const GAMES_DB = {

// ╔═══════════════════════════════════════╗
// ║  วิชา 1 — คณิตศาสตร์                     ║
// ╚═══════════════════════════════════════╝
'1_1':{ id:'1_1', code:'math_fraction_quest', sid:1, name:'ภารกิจพิชิตอาณาจักรเศษส่วน', type:'mcq', mode:'fraction-quest', icon:'🏰', cover:'images/covers/math-fraction-quest.webp', lvl:'medium', time:1200 },
'1_2':{ id:'1_2', code:'math_pizza_chef', sid:1, name:'เชฟน้อยพิชิตพิซซ่า: ภารกิจร้านอาหารมหัศจรรย์', type:'mcq', mode:'pizza', icon:'🍕', lvl:'medium', time:1500 },
'1_3':{ id:'1_3', code:'math_decimal_shop', sid:1, name:'ร้านค้าคณิตคิดเงินไว', type:'mcq', mode:'decimal-shop', icon:'🛍️', lvl:'medium', time:1200 },
'1_4':{ id:'1_4', code:'math_decimal_treasure', sid:1, name:'นักล่าสมบัติทศนิยม', type:'mcq', mode:'treasure', icon:'🗝️', lvl:'medium', time:1200 },
'1_5':{ id:'1_5', code:'math_data_detective', sid:1, name:'นักสืบข้อมูลมหัศจรรย์', type:'mcq', mode:'data-detective', icon:'🕵️', lvl:'medium', time:1200 },
'1_6':{ id:'1_6', code:'math_chart_builder', sid:1, name:'สร้างกราฟพิชิตคะแนน: นักวิเคราะห์ข้อมูลมือโปร', type:'mcq', mode:'chart-builder', icon:'📊', lvl:'medium', time:1500 },

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
'3_6':{ id:'3_6', sid:3, name:'เรียงตัวอักษรภาษาไทย', type:'letterorder', icon:'🔤', lvl:'easy', time:120,
  items:[
    {id:'a',text:'ห',order:1},{id:'b',text:'นั',order:2},{id:'c',text:'ง',order:3},{id:'d',text:'สื',order:4},{id:'e',text:'อ',order:5}
  ]},

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
'5_1':{ id:'5_1', sid:5, name:'สังคมศึกษา',     type:'mcq',       icon:'📜', lvl:'medium',time:60,
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
'6_1':{ id:'6_1', code:'health_detective', sid:6, name:'นักสืบสุขภาพ พิชิตภารกิจร่างกาย', type:'mcq', icon:'🕵️', lvl:'medium', time:1800 },
'6_2':{ id:'6_2', code:'health_meal_chef', sid:6, name:'เชฟน้อยจัดจานสุขภาพ', type:'mcq', icon:'🍱', lvl:'medium', time:1800 },
'6_3':{ id:'6_3', code:'health_routine', sid:6, name:'นักวางแผนชีวิตสุขภาพดี', type:'mcq', icon:'⏰', lvl:'medium', time:1800 },
'6_4':{ id:'6_4', code:'health_sports', sid:6, name:'สนามกีฬาอัจฉริยะ', type:'mcq', icon:'⚽', lvl:'medium', time:1800 },
'6_5':{ id:'6_5', code:'health_safety', sid:6, name:'ฮีโร่พิทักษ์ความปลอดภัย', type:'mcq', icon:'🦸', lvl:'medium', time:1800 },
'6_6':{ id:'6_6', code:'health_teamwork', sid:6, name:'ภารกิจทีมเวิร์ก พิชิตปัญหา', type:'mcq', icon:'🤝', lvl:'medium', time:1800 },
};

// ══════════════════════════════════════════════════════
// MOCK SCORES (per student id)
// ══════════════════════════════════════════════════════
let SCORES = {}; // ข้อมูลมาจาก PHP API

// ══════════════════════════════════════════════════════
// APP STATE
