# KidLearn

> โครงสร้างไฟล์ล่าสุดดูได้ที่ `PROJECT_STRUCTURE.md`

KidLearn เป็นเว็บเกมการเรียนรู้สำหรับนักเรียน ครู ผู้ปกครอง และผู้ดูแลระบบ โดยโปรเจกต์นี้ใช้หน้าเว็บแบบ HTML/CSS/JavaScript และ backend PHP + MySQL

## สิ่งที่ระบบทำได้ตอนนี้

- เกมทุกประเภทดึงข้อมูลจากฐานข้อมูลได้
- ครูตั้งเวลาเล่นและจำนวนข้อสุ่มต่อเกมได้
- `mcq` รองรับตัวเลือกที่เป็นรูปภาพ
- `matching` รองรับการจับคู่ข้อความกับรูปภาพ หรือรูปภาพกับรูปภาพ
- `sequence` ใช้รูปแบบกรอบต้นทางและกรอบปลายทาง เรียงง่ายกว่าเดิม
- `wordsearch` ใช้คลังคำจากฐานข้อมูล และสุ่มคำใหม่รอบละ 10 คำ

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
- `js/game.js`
  logic การเล่นเกมทั้งหมด
- `js/game_editor.js`
  หน้าแก้ไขคลังคำถามของครู
- `js/teacher.js`
  dashboard ครู
- `js/router.js`
  สลับหน้าในแอป
- `js/auth.js`
  ล็อกอิน/เซสชัน
- `js/data.js`
  ข้อมูล static/fallback และ metadata เกม
- `js/admin.js`, `js/officer.js`, `js/executive.js`
  dashboard ตามบทบาท

### Backend / Database

- `api/backend.php`
  API หลักทั้งหมดของระบบ
- `kidlearn_full.sql`
  schema + seed data สำหรับติดตั้งใหม่
- `api/init_db.php`
  ใช้ช่วยสร้าง/เตรียมฐานข้อมูล
- `api/init_admin.php`
  ใช้ตั้ง admin ครั้งแรก แล้วควรลบออกจากเครื่องที่ deploy

### เนื้อหาและไฟล์ช่วยงาน

- `content/lessons.sql`
  seed เนื้อหาบทเรียน
- `content/questions_seed.sql`
  seed คำถามเพิ่มเติม
- `images/`
  รูปภาพตัวอย่าง
- `scripts/db/backup-db.ps1`
  สำรองฐานข้อมูล
- `scripts/db/restore-db.ps1`
  กู้คืนฐานข้อมูล
- `scripts/db/smoke-test.ps1`
  ทดสอบระบบแบบเร็ว
- `backups/`
  ที่เก็บไฟล์ backup ในเครื่อง

## ไฟล์ที่สำคัญมาก

ถ้าจะอ่านระบบให้เร็วที่สุด ให้เริ่มจาก 5 ไฟล์นี้ก่อน

1. `api/backend.php`
2. `js/game.js`
3. `js/game_editor.js`
4. `js/teacher.js`
5. `kidlearn_full.sql`

## ไฟล์ที่รวมกันได้ในอนาคต

อันนี้เป็นข้อเสนอสำหรับจัดระเบียบรอบถัดไป ยังไม่จำเป็นต้องรีบทำในรอบนี้

- `js/admin.js`, `js/officer.js`, `js/executive.js`
  รวมเป็นโฟลเดอร์ `js/roles/` หรือใช้ helper กลางร่วมกันได้ เพราะเป็น dashboard role-based คล้ายกัน
- `scripts/db/backup-db.ps1` และ `scripts/db/restore-db.ps1`
  รวมเป็น script เดียวที่รับ mode `backup` / `restore` ได้
- `CONTENT_GUIDE.md`, `DOCKER.md`, `UPDATE_DOCKER.md`
  รวมเป็นเอกสาร deployment/setup เดียวได้
- code UI เฉพาะเกมใน `js/game.js`
  ระยะยาวแยกเป็น `js/games/mcq.js`, `js/games/matching.js`, `js/games/sequence.js` จะดูแลง่ายกว่า

## ไฟล์ที่ไม่ควรขึ้น GitHub

ควร ignore หรือไม่ควร commit ไฟล์ประเภทนี้

- `backups/` ทั้งโฟลเดอร์ ยกเว้น `.gitkeep`
- ไฟล์ `.env` และ `.env.*`
- log, temp, backup เช่น `*.log`, `*.tmp`, `*.bak`
- ไฟล์ IDE เช่น `.vscode/`, `.idea/`
- `api/init_admin.php` หลังใช้งานจริง
  ถ้าจะ deploy production ควรลบออก ไม่ควรปล่อยไว้ให้เรียกซ้ำได้
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
- ถ้าจะ refactor ใหญ่ แนะนำแยก `backend.php` เป็นหลายไฟล์ตาม domain เช่น auth, games, scores, reports
