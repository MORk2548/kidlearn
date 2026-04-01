-- ============================================================
-- lessons.sql — เนื้อหาบทเรียน KidLearn
-- วิธีใช้: phpMyAdmin → kidlearn_db → แท็บ SQL → วาง → Execute
-- ============================================================
-- แก้ไขไฟล์นี้ใน VS Code แล้ว import ใน phpMyAdmin
-- ดูรูปแบบ HTML ที่ใส่ได้ใน CONTENT_GUIDE.md
-- ============================================================

USE kidlearn_db;

-- ── วิธีเพิ่มเนื้อหา ──────────────────────────────────────
-- INSERT INTO lesson_content (game_id, lesson_no, title, summary, read_time, body)
-- VALUES (game_id, 1-6, 'ชื่อบท', 'สรุปสั้น', นาที, '<p>HTML</p>')
-- ON DUPLICATE KEY UPDATE title=VALUES(title), summary=VALUES(summary),
--   read_time=VALUES(read_time), body=VALUES(body);

-- ── game_id reference ──────────────────────────────────────
-- คณิตศาสตร์: 1(MCQ) 2(T/F) 3(Fill) 4(Match) 5(Seq) 6(WS)
-- วิทยาศาสตร์: 7-12  ภาษาไทย: 13-18  อังกฤษ: 19-24
-- สังคมศึกษา: 25-30  สุขศึกษา: 31-36

-- ── ตัวอย่าง: คณิตศาสตร์ MCQ (game_id=1) บทที่ 1-6 ──────
INSERT INTO lesson_content (game_id, lesson_no, title, summary, read_time, body) VALUES
(1,1,'บวกเลขหลักเดียว','เรียนรู้การบวกเลข 1-9 พร้อมเทคนิคช่วยจำ',3,
'<h2>การบวกเลขหลักเดียว</h2>
<p>การบวกเลขหลักเดียวคือพื้นฐานสำคัญ ผลบวกไม่เกิน <strong>18</strong></p>
<h3>📌 ตัวอย่าง</h3>
<ul>
  <li>3 + 4 = <strong>7</strong></li>
  <li>6 + 5 = <strong>11</strong></li>
  <li>9 + 9 = <strong>18</strong></li>
</ul>
<div style="background:#EEF2FF;border-left:4px solid #4F46E5;padding:1rem;border-radius:8px;margin:1rem 0">
  💡 <strong>เทคนิค:</strong> ถ้าผลบวกเกิน 10 ให้แตกตัวเลข<br>
  เช่น 7+6 = 7+3+3 = 10+3 = <strong>13</strong>
</div>'),
(1,2,'ลบเลขหลักเดียว','การลบเลข 1-9 และความสัมพันธ์กับการบวก',3,
'<h2>การลบเลขหลักเดียว</h2>
<p>การลบคือการนับถอยหลัง — เริ่มที่ตัวตั้งแล้วนับถอยหลังตามตัวลบ</p>
<h3>📌 ตัวอย่าง</h3>
<ul><li>9 - 4 = <strong>5</strong></li><li>8 - 3 = <strong>5</strong></li></ul>
<div style="background:#F0FDF4;border-left:4px solid #10B981;padding:1rem;border-radius:8px;margin:1rem 0">
  💡 <strong>เทคนิค:</strong> ถ้า 3+4=7 แล้ว 7-4=3 และ 7-3=4
</div>'),
(1,3,'บวกลบสองหลัก','การบวกลบเลขสองหลัก แบบมีและไม่มีทด',5,
'<h2>บวกลบสองหลัก</h2>
<p>เลขสองหลัง = <strong>หลักสิบ</strong> + <strong>หลักหน่วย</strong></p>
<h3>บวกไม่ทด: 23 + 15</h3>
<p>(20+10) + (3+5) = 30+8 = <strong>38</strong></p>
<h3>บวกมีทด: 27 + 15</h3>
<p>27+10+5 = 37+5 = <strong>42</strong></p>
<h3>ลบมียืม: 52 - 18</h3>
<p>ยืมจากหลักสิบ → 12-8=4, (5-1)-1=3 → <strong>34</strong></p>'),
(1,4,'คูณตารางสูตร','ท่องตารางสูตรคูณ 1-12 พร้อมเทคนิค',6,
'<h2>ตารางสูตรคูณ</h2>
<p>การคูณ = การบวกซ้ำ: 3×4 = 3+3+3+3 = <strong>12</strong></p>
<h3>💡 เทคนิคพิเศษ</h3>
<ul>
  <li>สูตร <strong>2</strong>: คือบวกตัวเอง</li>
  <li>สูตร <strong>5</strong>: ลงท้ายด้วย 0 หรือ 5 เสมอ</li>
  <li>สูตร <strong>9</strong>: หลักสิบ+หลักหน่วย = 9 เสมอ (9×3=27, 2+7=9)</li>
  <li>สูตร <strong>10</strong>: เพิ่มเลข 0 ข้างหลัง</li>
</ul>'),
(1,5,'หารเบื้องต้น','การหารและความสัมพันธ์กับการคูณ',5,
'<h2>การหารเบื้องต้น</h2>
<p>การหาร = การแบ่งเป็นกลุ่มเท่าๆ กัน</p>
<p>ถ้า 3×4=12 แล้ว → 12÷3=<strong>4</strong> และ 12÷4=<strong>3</strong></p>
<div style="background:#FFF7ED;border-left:4px solid #F59E0B;padding:1rem;border-radius:8px;margin:1rem 0">
  ⚠️ <strong>ข้อควรจำ:</strong><br>
  • หารด้วย 0 ไม่ได้<br>
  • 0 ÷ ตัวเลขใดๆ = 0<br>
  • ตัวเลขใดๆ ÷ 1 = ตัวเลขนั้น
</div>'),
(1,6,'โจทย์ผสม','ลำดับการคำนวณ BODMAS',7,
'<h2>โจทย์ผสม — BODMAS</h2>
<ol>
  <li><strong>B</strong>rackets — วงเล็บก่อนเสมอ</li>
  <li><strong>O</strong>rders — เลขยกกำลัง</li>
  <li><strong>D/M</strong> — หาร/คูณ จากซ้ายไปขวา</li>
  <li><strong>A/S</strong> — บวก/ลบ จากซ้ายไปขวา</li>
</ol>
<h3>📌 ตัวอย่าง</h3>
<ul>
  <li>(4+6)×3 = 10×3 = <strong>30</strong> ✓</li>
  <li>2+3×4 = 2+12 = <strong>14</strong> ✓ (ไม่ใช่ 5×4=20)</li>
  <li>20÷4+3 = 5+3 = <strong>8</strong> ✓</li>
</ul>')
ON DUPLICATE KEY UPDATE
  title=VALUES(title), summary=VALUES(summary),
  read_time=VALUES(read_time), body=VALUES(body);

-- ── เพิ่มวิชาอื่นต่อจากนี้ ─────────────────────────────────
-- คัดลอก block ด้านบนแล้วเปลี่ยน game_id และเนื้อหา
