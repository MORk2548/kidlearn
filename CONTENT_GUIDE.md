# 📖 คู่มือแก้ไขเนื้อหาบทเรียน (Content Guide)

## วิธีเพิ่ม/แก้ไขเนื้อหาบทเรียนใน VS Code

เนื้อหาบทเรียนเก็บไว้ในฐานข้อมูล MySQL ตาราง `lesson_content`  
แต่คุณสามารถแก้ไขได้ง่ายๆ ผ่านไฟล์ SQL ด้านล่าง

---

## 📁 ไฟล์ที่เกี่ยวข้อง

```
kidlearn/
├── api/
│   ├── backend.php          ← PHP API (ไม่ต้องแก้)
│   └── kidlearn_patch_v2.sql ← SQL สำหรับ import ฐานข้อมูล
├── content/
│   └── lessons.sql          ← ✅ แก้เนื้อหาบทเรียนที่ไฟล์นี้
└── ...
```

---

## ✏️ วิธีเพิ่มเนื้อหาบทเรียน

### ขั้นตอนที่ 1: เปิดไฟล์ `content/lessons.sql` ใน VS Code

### ขั้นตอนที่ 2: เพิ่ม/แก้ไข SQL ตามรูปแบบนี้

```sql
-- รูปแบบ: game_id, lesson_no (1-6), title, summary, read_time (นาที), body (HTML)
INSERT INTO lesson_content (game_id, lesson_no, title, summary, read_time, body)
VALUES (1, 1, 'ชื่อบทเรียน', 'สรุปสั้นๆ', 5, '<p>เนื้อหา HTML ที่นี่</p>')
ON DUPLICATE KEY UPDATE
  title=VALUES(title), summary=VALUES(summary),
  read_time=VALUES(read_time), body=VALUES(body);
```

### ขั้นตอนที่ 3: Import ใน phpMyAdmin
1. เปิด `http://localhost/phpmyadmin`
2. เลือก database `kidlearn_db`
3. คลิก **SQL** แล้ววางโค้ด → กด **Execute**

---

## 🖼️ ใส่รูปภาพในเนื้อหา

วางรูปภาพไว้ที่โฟลเดอร์ `kidlearn/images/` แล้วใช้ใน HTML:

```html
<img src="images/บทเรียน1.jpg" alt="รูปประกอบ" 
     style="max-width:100%;border-radius:12px;margin:1rem 0">
```

---

## 📝 รูปแบบ HTML ที่ใช้ได้

```html
<!-- หัวข้อ -->
<h2>หัวข้อใหญ่</h2>
<h3>หัวข้อย่อย</h3>

<!-- ย่อหน้า -->
<p>เนื้อหาปกติ <strong>ตัวหนา</strong> <em>เอียง</em></p>

<!-- รายการ -->
<ul>
  <li>รายการที่ 1</li>
  <li>รายการที่ 2</li>
</ul>
<ol>
  <li>ลำดับที่ 1</li>
  <li>ลำดับที่ 2</li>
</ol>

<!-- กล่องเน้น -->
<div style="background:#EEF2FF;border-left:4px solid #4F46E5;
            padding:1rem;border-radius:8px;margin:1rem 0">
  💡 <strong>เคล็ดลับ:</strong> เนื้อหาสำคัญ
</div>

<!-- กล่องตัวอย่าง -->
<div style="background:#F0FDF4;border-left:4px solid #10B981;
            padding:1rem;border-radius:8px;margin:1rem 0">
  📌 <strong>ตัวอย่าง:</strong> 3 + 4 = 7
</div>

<!-- ตาราง -->
<table style="width:100%;border-collapse:collapse;margin:1rem 0">
  <tr style="background:#EEF2FF">
    <th style="padding:.5rem;border:1px solid #E2E8F0">คอลัมน์ 1</th>
    <th style="padding:.5rem;border:1px solid #E2E8F0">คอลัมน์ 2</th>
  </tr>
  <tr>
    <td style="padding:.5rem;border:1px solid #E2E8F0">ข้อมูล 1</td>
    <td style="padding:.5rem;border:1px solid #E2E8F0">ข้อมูล 2</td>
  </tr>
</table>

<!-- รูปภาพ -->
<img src="images/example.jpg" alt="คำอธิบาย" 
     style="max-width:100%;border-radius:12px;margin:1rem 0">

<!-- วีดีโอ YouTube -->
<div style="position:relative;padding-bottom:56.25%;height:0;margin:1rem 0">
  <iframe src="https://www.youtube.com/embed/VIDEO_ID" 
    style="position:absolute;top:0;left:0;width:100%;height:100%;border-radius:12px"
    frameborder="0" allowfullscreen></iframe>
</div>
```

---

## 🗺️ game_id ของแต่ละวิชา

| วิชา | เกม MCQ | เกม T/F | เกม Fill | เกม Match | เกม Seq | เกม WordSearch |
|------|---------|---------|----------|-----------|---------|----------------|
| คณิตศาสตร์ | 1 | 2 | 3 | 4 | 5 | 6 |
| วิทยาศาสตร์ | 7 | 8 | 9 | 10 | 11 | 12 |
| ภาษาไทย | 13 | 14 | 15 | 16 | 17 | 18 |
| ภาษาอังกฤษ | 19 | 20 | 21 | 22 | 23 | 24 |
| สังคมศึกษา | 25 | 26 | 27 | 28 | 29 | 30 |
| สุขศึกษา | 31 | 32 | 33 | 34 | 35 | 36 |

---

## ✅ ตัวอย่างสมบูรณ์

```sql
-- เนื้อหา: วิชาภาษาอังกฤษ เกม MCQ (game_id=19) บทที่ 1
INSERT INTO lesson_content (game_id, lesson_no, title, summary, read_time, body)
VALUES (19, 1, 'Animals (สัตว์)', 'คำศัพท์สัตว์พื้นฐาน 10 คำ', 5,
'<h2>🐾 Animals — คำศัพท์สัตว์</h2>
<p>คำศัพท์สัตว์เป็นพื้นฐานสำคัญของภาษาอังกฤษ</p>
<h3>📋 คำศัพท์หลัก</h3>
<ul>
  <li><strong>Dog</strong> = สุนัข 🐕</li>
  <li><strong>Cat</strong> = แมว 🐱</li>
  <li><strong>Bird</strong> = นก 🐦</li>
  <li><strong>Fish</strong> = ปลา 🐟</li>
  <li><strong>Elephant</strong> = ช้าง 🐘</li>
</ul>
<div style="background:#EEF2FF;border-left:4px solid #4F46E5;padding:1rem;border-radius:8px;margin:1rem 0">
  💡 <strong>เคล็ดลับจำ:</strong> Dog ออกเสียง "ด็อก" แปลว่าสุนัข เหมือนเสียงหมาเห่า!
</div>
<img src="images/animals.jpg" alt="รูปสัตว์" style="max-width:100%;border-radius:12px;margin:1rem 0">
')
ON DUPLICATE KEY UPDATE title=VALUES(title), body=VALUES(body);
```
