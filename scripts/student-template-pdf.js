// สร้าง files/student-list-template.pdf ที่ปุ่ม "ไฟล์ตัวอย่าง" ในแท็บเพิ่มนักเรียนให้ดาวน์โหลด
// ใช้: npm i pdfkit แล้ว node scripts/student-template-pdf.js <โฟลเดอร์ที่มี Sarabun-Regular.ttf และ Sarabun-Bold.ttf>
// ฟอนต์ Sarabun (OFL) ดาวน์โหลดได้จาก https://github.com/google/fonts/tree/main/ofl/sarabun
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const fontDir = process.argv[2];
const out = path.join(__dirname, '..', 'files', 'student-list-template.pdf');
const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: 'ตัวอย่างรายชื่อนักเรียน KidLearn' } });
doc.registerFont('r', path.join(fontDir, 'Sarabun-Regular.ttf'));
doc.registerFont('b', path.join(fontDir, 'Sarabun-Bold.ttf'));
fs.mkdirSync(path.dirname(out), { recursive: true });
doc.pipe(fs.createWriteStream(out));

doc.font('b').fontSize(20).text('ตัวอย่างรายชื่อนักเรียนสำหรับนำเข้า KidLearn');
doc.font('r').fontSize(12).fillColor('#555')
  .text('จัดรายชื่อเป็นตารางตามตัวอย่างนี้ ใน Excel, Google Sheets หรือ Word แล้วนำเข้าที่แท็บ "เพิ่มนักเรียน"')
  .moveDown();

const cols = [{ title: 'ที่', w: 40 }, { title: 'ชื่อ-นามสกุล', w: 260 }, { title: 'เบอร์ผู้ปกครอง', w: 195 }];
const rows = [
  ['1', 'ด.ช.สมชาย ใจดี', '0812345678'],
  ['2', 'ด.ญ.สมหญิง รักเรียน', '0898765432'],
  ['3', 'ด.ช.ปิติ มีสุข', '0861112222'],
];
const rowH = 26;
let y = doc.y;
[cols.map(c => c.title), ...rows].forEach((cells, i) => {
  let x = 50;
  if (i === 0) doc.rect(50, y, 495, rowH).fill('#1E3A5F');
  cells.forEach((text, c) => {
    doc.rect(x, y, cols[c].w, rowH).lineWidth(.5).stroke('#CBD5E1');
    doc.font(i === 0 ? 'b' : 'r').fontSize(12).fillColor(i === 0 ? '#fff' : '#111')
      .text(text, x + 8, y + 5, { width: cols[c].w - 16, lineBreak: false });
    x += cols[c].w;
  });
  y += rowH;
});

doc.x = 50;
doc.y = y + 20;
doc.font('b').fontSize(14).fillColor('#111').text('ข้อกำหนด');
doc.font('r').fontSize(12).list([
  'ต้องมีคอลัมน์ชื่อนักเรียน และคอลัมน์เบอร์ผู้ปกครอง',
  'หัวคอลัมน์ใช้คำว่า "ชื่อ", "ชื่อ-นามสกุล" หรือ "ชื่อนักเรียน" และ "เบอร์", "โทร" หรือ "เบอร์ผู้ปกครอง"',
  'จะแยกคอลัมน์ "คำนำหน้า" และ "นามสกุล" ออกมาก็ได้ ระบบจะรวมให้',
  'เบอร์โทรใส่ขีดได้ และถ้า Excel ตัดเลข 0 ตัวหน้าทิ้ง ระบบจะเติมให้',
  'นำเข้าได้ครั้งละไม่เกิน 200 คน ใช้ได้กับนักเรียนห้องเดียวต่อครั้ง',
], { bulletRadius: 2, paragraphGap: 4 });

doc.moveDown().font('b').fontSize(14).text('ไฟล์ที่รองรับ');
doc.font('r').fontSize(12).list([
  'Excel (.xlsx, .xls), .ods และ .csv',
  'Word (.docx) ที่รายชื่ออยู่ในตาราง',
  'PDF ที่เลือกข้อความได้ (ไม่รองรับไฟล์สแกนหรือรูปถ่าย)',
  'คัดลอกตารางจาก Excel หรือ Google Sheets แล้ววางในหน้าเพิ่มนักเรียน',
], { bulletRadius: 2, paragraphGap: 4 });

doc.end();
