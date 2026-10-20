# KidLearn Project Structure

เอกสารนี้สรุปหน้าที่ของไฟล์และโฟลเดอร์หลักในโปรเจกต์ เพื่อให้ดูแลง่ายขึ้นและลดไฟล์ที่ปนกันอยู่ที่ root.

## Entry Pages

- `index.html` - หน้าเข้าสู่ระบบ โหลด `js/api.js`, `js/data.js`, `js/state.js`, `js/auth.js` แล้วเรียกตรวจ session ก่อนพาผู้ใช้เข้า `app.html`.
- `register.html` - หน้าสมัครสมาชิก เลือกบทบาทนักเรียน/ผู้ปกครอง/ครู แล้วส่งข้อมูลสมัครผ่านฟังก์ชันใน `js/auth.js`.
- `app.html` - หน้าแอปหลักหลังเข้าสู่ระบบ มีโครง HTML ของ dashboard, game, scores, role panels และโหลดไฟล์ JavaScript หลักทุกโมดูล.
- `style.css` - stylesheet รวมของทั้งระบบ ใช้ร่วมกันทั้งหน้า login, register และ app.

## Frontend JavaScript

- `js/api.js` - wrapper สำหรับเรียก API ไปที่ `api/backend.php`.
- `js/state.js` - state กลางของ session/user/context ที่ไฟล์อื่นใช้อ่านร่วมกัน.
- `js/auth.js` - login, logout, register, forgot/reset password และ session loading.
- `js/router.js` - สลับ section ใน `app.html` และควบคุมเมนูตามบทบาทผู้ใช้.
- `js/data.js` - metadata/fallback data ของวิชา เกม และข้อมูลที่ frontend ใช้ประกอบการแสดงผล.
- `js/home.js` - โหลดภาพรวมหน้าแรกและรายการวิชา.
- `js/game.js` - logic การเล่นเกมและการส่งคะแนน.
- `js/scores.js` - แสดงประวัติคะแนนและตารางผลการเล่น.
- `js/recommendations.js` - คำแนะนำสำหรับผู้ปกครองจากข้อมูลคะแนน.
- `js/children.js` - จัดการความสัมพันธ์ผู้ปกครองกับนักเรียน.
- `js/teacher.js` - dashboard ครู รายงานนักเรียน และเครื่องมือจัดเนื้อหา.
- `js/game_editor.js` - เครื่องมือแก้ไขคลังคำถาม/เกมสำหรับครู.
- `js/officer.js` - dashboard เจ้าหน้าที่สำหรับจัดการข้อมูลผู้ใช้/ระบบ.
- `js/executive.js` - dashboard ผู้บริหารและรายงานภาพรวม.
- `js/admin.js` - dashboard ผู้ดูแลระบบ.
- `js/profile.js` - แก้ไขข้อมูลส่วนตัวและรหัสผ่าน.

## Backend And Database

- `api/backend.php` - API หลักของระบบ รับ request จาก frontend และเชื่อมต่อฐานข้อมูล.
- `api/init_db.php` - script เตรียมฐานข้อมูลเริ่มต้น.
- `api/init_admin.php` - script สร้าง admin เริ่มต้น ควรใช้เฉพาะช่วง setup.
- `api/kidlearn_patch_v3.sql` - patch SQL สำหรับปรับ schema/data เพิ่มเติมจากชุดหลัก.
- `api/kidlearn_patch_v4.sql` - migration สำหรับวันแก้ไขบัญชีและเจ้าของเนื้อหา; ใช้กับฐานข้อมูลเดิมหลัง patch ก่อนหน้า.
- `kidlearn_full.sql` - schema และ seed หลักที่ Docker ใช้ตอนสร้างฐานข้อมูล.
- `content/questions_seed.sql` - seed คำถามเพิ่มเติมที่ Docker import ต่อจาก `kidlearn_full.sql`.
- `content/lessons.sql` - seed บทเรียนแยกสำหรับ import เองเมื่อจำเป็น.

## Scripts

- `scripts/db/backup-db.ps1` - สำรองฐานข้อมูลจาก Docker/MySQL.
- `scripts/db/restore-db.ps1` - กู้คืนฐานข้อมูลจากไฟล์ backup.
- `scripts/db/smoke-test.ps1` - ตรวจแบบเร็วว่า web/API ตอบสนองได้.
- `scripts/db/supabase_pg_client.py` - PostgreSQL client แบบไม่พึ่ง library ภายนอก ใช้กับ Supabase/Postgres.
- `scripts/db/update_english_grade5.sql` - SQL เพิ่ม/แก้ข้อมูลภาษาอังกฤษ ป.5.
- `scripts/seed/add_grade5_extra_content.py` - เพิ่มบทเรียนและคำถามเสริม ป.5 เข้า Postgres.
- `scripts/seed/seed_grade5_th_en.py` - seed เนื้อหา ป.5 ภาษาไทยและอังกฤษ.
- `scripts/seed/seed_sequence_grade5.py` - seed เกมเรียงลำดับสำหรับ ป.5.
- `scripts/seed/seed_thai_letterorder.py` - seed เกมเรียงตัวอักษรภาษาไทย.
- `scripts/debug/debug_login.php` - script ตรวจข้อมูล login admin แบบเฉพาะกิจ.
- `scripts/debug/test_supabase.php` - script ทดสอบการเชื่อมต่อ Supabase/Postgres แบบเฉพาะกิจ.

## Deployment And Config

- `docker-compose.yml` - กำหนดบริการ MySQL, PHP/Apache และ phpMyAdmin.
- `docker/Dockerfile` - image PHP/Apache พร้อม extension MySQL/Postgres.
- `docker/apache.conf` - Apache virtual host/rewrite config.
- `docker/php.ini` - PHP runtime settings.
- `.htaccess` - rewrite/security settings สำหรับ Apache เมื่อรันแบบ non-Docker.
- `.env` - config database/runtime เฉพาะเครื่อง ไม่ควร commit.
- `.gitignore` - รายการไฟล์ local/cache/secret ที่ไม่ควรเข้า Git.

## Documentation And Assets

- `README.md` - คู่มือภาพรวมและวิธีรันโปรเจกต์.
- `CONTENT_GUIDE.md` - คู่มือจัดการเนื้อหา/คำถาม.
- `DOCKER.md` - คู่มือ Docker เดิม.
- `UPDATE_DOCKER.md` - บันทึกการอัปเดต Docker.
- `images/` - รูปประกอบเกม/ตัวอย่าง.
- `backups/` - พื้นที่เก็บ backup local โดยเก็บใน Git แค่ `.gitkeep`.

## Removed Or Ignored Local Files

- `.tmp_pydeps/` และ `.tmp_pydeps2/` เป็น dependency ชั่วคราวของ Python ที่สร้างบนเครื่อง ไม่ควรเก็บใน repo.
- `scripts/**/__pycache__/` และ `*.pyc` เป็น cache ของ Python ไม่จำเป็นต่อการรันระบบ.

## Files That Could Be Combined Later

- `DOCKER.md` และ `UPDATE_DOCKER.md` รวมเข้า README หรือเอกสาร deployment เดียวได้.
- `scripts/db/backup-db.ps1` และ `scripts/db/restore-db.ps1` รวมเป็น script เดียวที่รับ argument `backup`/`restore` ได้.
- `js/admin.js`, `js/officer.js`, `js/executive.js` สามารถดึง helper dashboard/report ที่ซ้ำกันออกมาใช้ร่วมกันได้ แต่ไม่ควรรวมทันทีถ้ายังไม่มี test.
- `api/backend.php` ใหญ่เกินไปในระยะยาว ควรแยกตาม domain เช่น auth, users, games, scores, reports เมื่อพร้อม refactor backend.
