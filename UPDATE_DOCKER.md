# วิธีอัปเดตโค้ดใน Docker

## ถ้าแก้ไขไฟล์ JS / HTML / PHP (ไม่เปลี่ยน DB)
```bash
# ไม่ต้องทำอะไร — ไฟล์ mount เข้า container โดยตรง
# แค่ refresh browser (Ctrl+Shift+R เพื่อ clear cache)
```

## ถ้าแก้ไข Dockerfile หรือ docker-compose.yml
```bash
docker compose down
docker compose up -d --build
```

## ถ้าต้องการ reset ฐานข้อมูลใหม่ทั้งหมด
```bash
docker compose down -v          # ลบ volume ด้วย
docker compose up -d            # สร้างใหม่ (import SQL ใหม่)

# จากนั้นรัน init_admin.php เพื่อตั้งรหัสผ่าน admin
# เปิด: http://localhost:8080/api/init_admin.php
```

## หลังอัปโหลดโค้ดใหม่ (ZIP ใหม่)
```bash
# 1. แตก ZIP ทับโฟลเดอร์เดิม
# 2. รัน rebuild เฉพาะ web (ถ้า Dockerfile เปลี่ยน)
docker compose up -d --build web
# 3. Refresh browser ด้วย Ctrl+Shift+R
```
