# KidLearn

> โครงสร้างไฟล์ล่าสุดดูได้ที่ `PROJECT_STRUCTURE.md`

KidLearn เป็นเว็บการเรียนรู้สำหรับนักเรียน ครู ผู้ปกครอง และผู้ดูแลระบบ โดยโปรเจกต์นี้ใช้หน้าเว็บแบบ HTML/CSS/JavaScript และ backend PHP + MySQL


## โครงสร้างไฟล์สำคัญ

### หน้าเว็บหลัก

- `index.html`
  หน้าล็อกอิน
- `register.html`
  หน้าสมัครสมาชิก
- `app.html`
  หน้าแอปหลักหลังล็อกอิน
- `style.css`
  CSS รวมของทั้งระบบ

### JavaScript

- `js/api.js`
  จุดรวมการเรียก API ไป `api/backend.php`
- `js/teacher.js`
  dashboard ครู
- `js/router.js`
  สลับหน้าในแอป
- `js/auth.js`
  ล็อกอิน/เซสชัน
- `js/data.js`
  ข้อมูล static/fallback เช่น รายวิชา
- `js/admin.js`, `js/officer.js`, `js/executive.js`
  dashboard ตามบทบาท

### Backend / Database

- `api/backend.php`
  API หลักทั้งหมดของระบบ
- `kidlearn_full.sql`
  schema + seed data สำหรับติดตั้งใหม่
- `api/kidlearn_patch_v4.sql`
  migration สำหรับฐานข้อมูลเดิม เพิ่มวันแก้ไขบัญชีและเจ้าของเนื้อหา
- `api/kidlearn_patch_teacher_games.sql`
  migration สำหรับฐานข้อมูลเดิม ให้ครูสร้างเกมเองได้ (ระดับชั้น เจ้าของ สถานะ เกมโยงเส้น ห้องที่มอบหมาย) รันหลัง patch v4
- `api/kidlearn_patch_lessons.sql`
  migration สำหรับฐานข้อมูลเดิม เพิ่มคำอธิบายเกม และตารางบทเรียนที่แยกจากเกม (`lessons`, `lesson_classrooms`) รันหลัง patch teacher_games

### เนื้อหาและไฟล์ช่วยงาน

- `images/`
  รูปภาพตัวอย่าง
- `scripts/db/smoke-test.ps1`
  ทดสอบระบบแบบเร็ว

ฐานข้อมูลเดิมต้องรัน `api/kidlearn_patch_v4.sql`, `api/kidlearn_patch_teacher_games.sql` แล้วตามด้วย `api/kidlearn_patch_lessons.sql` ก่อนอัปเดตแอป ส่วนการติดตั้งใหม่ใช้ `kidlearn_full.sql` ที่มีคอลัมน์เหล่านี้แล้ว

## ไฟล์ที่สำคัญมาก

ถ้าจะอ่านระบบให้เร็วที่สุด ให้เริ่มจาก 3 ไฟล์นี้ก่อน

1. `api/backend.php`
2. `js/teacher.js`
3. `kidlearn_full.sql`

## ไฟล์ที่รวมกันได้ในอนาคต

อันนี้เป็นข้อเสนอสำหรับจัดระเบียบรอบถัดไป ยังไม่จำเป็นต้องรีบทำในรอบนี้

- `js/admin.js`, `js/officer.js`, `js/executive.js`
  รวมเป็นโฟลเดอร์ `js/roles/` หรือใช้ helper กลางร่วมกันได้ เพราะเป็น dashboard role-based คล้ายกัน

## ไฟล์ที่ไม่ควรขึ้น GitHub

ควร ignore หรือไม่ควร commit ไฟล์ประเภทนี้

- ไฟล์ `.env` และ `.env.*`
- log, temp, backup เช่น `*.log`, `*.tmp`, `*.bak`
- ไฟล์ IDE เช่น `.vscode/`, `.idea/`
- ไฟล์ SQL dump ที่เกิดจากการ backup จริง
  อย่าเอาขึ้น GitHub ถ้ามีข้อมูลผู้ใช้หรือคะแนนจริง
- รูป/ไฟล์สื่อที่มีลิขสิทธิ์หรือข้อมูลส่วนตัว
  ให้แยกเก็บนอก repo

## `.gitignore`

โปรเจกต์มี `.gitignore` แล้วสำหรับของที่ควรเป็น local เช่น backup, log, `.env` และไฟล์จาก editor

## วิธีรันแบบย่อ

```bash
docker compose up -d
```

จากนั้นเปิด

- เว็บ: `http://localhost:8080`
- phpMyAdmin: `http://localhost:8081`

## หมายเหตุการพัฒนาต่อ

- ถ้าจะต่อยอดระบบอัปโหลดรูปจริง ควรแยกไปเก็บไฟล์ใน `uploads/` หรือ object storage แทนการเก็บ base64 ยาว ๆ ในฐานข้อมูล
- ถ้าจะ refactor ใหญ่ แนะนำแยก `backend.php` เป็นหลายไฟล์ตาม domain เช่น auth, scores, reports
