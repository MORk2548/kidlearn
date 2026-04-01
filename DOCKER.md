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
| 🗄️ phpMyAdmin (ดู DB) | http://localhost:8081 |

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

# เข้า MySQL โดยตรง
docker exec -it kidlearn_db mysql -ukidlearn -pkidlearn123 kidlearn_db
```

---

## ข้อมูล Database

| | ค่า |
|-|-----|
| Host | `db` (ภายใน Docker) / `localhost:3306` (ภายนอก) |
| Database | `kidlearn_db` |
| Username | `kidlearn` |
| Password | `kidlearn123` |

---

## โครงสร้างไฟล์

```
kidlearn/
├── docker-compose.yml     ← ไฟล์หลัก Docker
├── docker/
│   └── php.ini            ← PHP config
├── kidlearn_full.sql      ← ฐานข้อมูล (import อัตโนมัติ)
├── index.html
├── app.html
├── api/
│   └── backend.php        ← PHP API (อ่าน env vars)
└── js/
```

---

## หมายเหตุ

- ข้อมูล DB เก็บใน Docker volume (`db_data`) — ไม่หายแม้ restart
- ถ้าต้องการ reset DB: `docker compose down -v` แล้ว `up -d` ใหม่
- backend.php รองรับทั้ง Docker และ XAMPP โดยอัตโนมัติ
