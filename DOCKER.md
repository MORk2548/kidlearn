# KidLearn — วิธีรันด้วย Docker

## ความต้องการ
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac/Linux)

---

## รันครั้งแรก

```bash
# 1. เปิด Terminal ที่โฟลเดอร์ kidlearn/
cd kidlearn

# 2. รัน Docker (ครั้งแรกจะโหลด image ~2-3 นาที)
docker compose up -d

# 3. รอประมาณ 20 วินาที แล้วเปิดเบราว์เซอร์
```

| บริการ | URL |
|--------|-----|
| 🌐 เว็บไซต์ KidLearn | http://localhost:8080 |
| 🩺 API health check | http://localhost:8080/api/backend.php?action=health |

---

## คำสั่งที่ใช้บ่อย

```bash
# เริ่มรัน
docker compose up -d

# หยุด
docker compose down

# ดู log
docker compose logs -f

# restart เฉพาะ web
docker compose restart web

# สร้าง/เริ่ม web container หลังตั้งค่า .env
docker compose up -d --build web
```

---

## ข้อมูล Database

Docker ไม่ได้สร้างฐานข้อมูล local เองแล้ว แต่ให้ `web` เชื่อมต่อ Supabase PostgreSQL
ผ่านค่า `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS` และ `DB_NAME` ในไฟล์ `.env`

---

## โครงสร้างไฟล์

```
kidlearn/
├── docker-compose.yml     ← ไฟล์หลัก Docker
├── docker/
│   └── php.ini            ← PHP config
├── .env                   ← ค่าเชื่อมต่อ Supabase (ห้าม commit)
├── index.html
├── app.html
├── api/
│   └── backend.php        ← PHP API (อ่าน env vars)
└── js/
```

---

## หมายเหตุ

- Schema และข้อมูลอยู่ใน Supabase ต้อง import SQL ผ่าน Supabase SQL Editor
- ตรวจการเชื่อมต่อได้ที่ API health check ด้านบน
- backend.php ใช้ PostgreSQL ผ่าน `pdo_pgsql`
