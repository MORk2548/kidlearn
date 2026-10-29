# KidLearn Project Structure

เอกสารนี้สรุปหน้าที่ของไฟล์และโฟลเดอร์หลักในโปรเจกต์ เพื่อให้ดูแลง่ายขึ้นและลดไฟล์ที่ปนกันอยู่ที่ root.

## Entry Pages

- `index.html` - หน้าเข้าสู่ระบบ โหลด `js/api.js`, `js/data.js`, `js/state.js`, `js/auth.js` แล้วเรียกตรวจ session ก่อนพาผู้ใช้เข้า `app.html`.
- `register.html` - หน้าสมัครสมาชิก เลือกบทบาทนักเรียน/ผู้ปกครอง/ครู แล้วส่งข้อมูลสมัครผ่านฟังก์ชันใน `js/auth.js`.
- `app.html` - หน้าแอปหลักหลังเข้าสู่ระบบ มีโครง HTML ของ dashboard, scores, role panels และโหลดไฟล์ JavaScript หลักทุกโมดูล.
- `style.css` - stylesheet รวมของทั้งระบบ ใช้ร่วมกันทั้งหน้า login, register และ app.

## Frontend JavaScript

- `js/api.js` - wrapper สำหรับเรียก API ไปที่ `api/backend.php`.
- `js/state.js` - state กลางของ session/user/context ที่ไฟล์อื่นใช้อ่านร่วมกัน.
- `js/auth.js` - login, logout, register, forgot/reset password และ session loading.
- `js/router.js` - สลับ section ใน `app.html` และควบคุมเมนูตามบทบาทผู้ใช้.
- `js/data.js` - metadata/fallback data ของวิชาและข้อมูลที่ frontend ใช้ประกอบการแสดงผล.
- `js/home.js` - โหลดภาพรวมหน้าแรกและสถิติตามบทบาท.
- `js/scores.js` - แสดงประวัติคะแนนและตารางผลการเล่น.
- `js/recommendations.js` - คำแนะนำสำหรับผู้ปกครองจากข้อมูลคะแนน.
- `js/children.js` - จัดการความสัมพันธ์ผู้ปกครองกับนักเรียน.
- `js/teacher.js` - dashboard ครู รายงานนักเรียน และสมุดคะแนน.
- `js/officer.js` - dashboard เจ้าหน้าที่สำหรับจัดการข้อมูลผู้ใช้/ระบบ.
- `js/executive.js` - dashboard ผู้บริหารและรายงานภาพรวม.
- `js/admin.js` - dashboard ผู้ดูแลระบบ.
- `js/profile.js` - แก้ไขข้อมูลส่วนตัวและรหัสผ่าน.

## Backend And Database

- `api/backend.php` - API หลักของระบบ รับ request จาก frontend และเชื่อมต่อฐานข้อมูล.
- `api/kidlearn_patch_v4.sql` - migration สำหรับวันแก้ไขบัญชีและเจ้าของเนื้อหา; ใช้กับฐานข้อมูลเดิมหลัง patch ก่อนหน้า.
- `kidlearn_full.sql` - schema และข้อมูลตั้งต้นสำหรับติดตั้งฐานข้อมูลใหม่.

## Scripts

- `scripts/db/smoke-test.ps1` - ตรวจแบบเร็วว่า web/API ตอบสนองได้.
- `scripts/db/supabase_pg_client.py` - PostgreSQL client แบบไม่พึ่ง library ภายนอก ใช้กับ Supabase/Postgres.

## Deployment And Config

- `docker-compose.yml` - กำหนดบริการ PHP/Apache ที่เชื่อมต่อ Supabase PostgreSQL ผ่าน `.env`.
- `docker/Dockerfile` - image PHP/Apache พร้อม extension PostgreSQL.
- `docker/apache.conf` - Apache virtual host/rewrite config.
- `docker/php.ini` - PHP runtime settings.
- `.htaccess` - ตั้งค่า Apache: cache ของ JS/CSS และบล็อกไฟล์ที่ไม่ใช่หน้าเว็บ (`.env`, `.git`, `*.sql`, `scripts/` ฯลฯ) ไม่ให้เปิดผ่านเว็บ.
- `.env` - config database/runtime เฉพาะเครื่อง ไม่ควร commit.
- `.gitignore` - รายการไฟล์ local/cache/secret ที่ไม่ควรเข้า Git.

## Documentation And Assets

- `README.md` - คู่มือภาพรวมและวิธีรันโปรเจกต์.
- `DOCKER.md` - คู่มือรันด้วย Docker.
- `SUPABASE_SETUP.md` - วิธีตั้งค่าการเชื่อมต่อ Supabase.
- `images/` - รูปประกอบ/ตัวอย่าง.

## Removed Or Ignored Local Files

- `.tmp_pydeps/` และ `.tmp_pydeps2/` เป็น dependency ชั่วคราวของ Python ที่สร้างบนเครื่อง ไม่ควรเก็บใน repo.
- `scripts/**/__pycache__/` และ `*.pyc` เป็น cache ของ Python ไม่จำเป็นต่อการรันระบบ.

## Files That Could Be Combined Later

- `js/admin.js`, `js/officer.js`, `js/executive.js` สามารถดึง helper dashboard/report ที่ซ้ำกันออกมาใช้ร่วมกันได้ แต่ไม่ควรรวมทันทีถ้ายังไม่มี test.
- `api/backend.php` ใหญ่เกินไปในระยะยาว ควรแยกตาม domain เช่น auth, users, scores, reports เมื่อพร้อม refactor backend.
