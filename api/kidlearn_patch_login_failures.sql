-- กันเดารหัสผ่าน: นับครั้งที่เข้าสู่ระบบไม่สำเร็จต่อชื่อผู้ใช้ ผิดครบ 5 ครั้งล็อก 3 นาที (กติกาอยู่ใน handleLogin ของ backend.php)
-- นับตามชื่อที่พิมพ์ ไม่นับตาม IP เพราะนักเรียนทั้งโรงเรียนมักออกเน็ตผ่าน IP เดียวกัน
-- รันซ้ำได้ backend.php สร้างตารางให้เองตอนเรียกครั้งแรกด้วย

CREATE TABLE IF NOT EXISTS login_failures (
  login_key    VARCHAR(255) PRIMARY KEY,
  fails        INT          NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ  DEFAULT NULL,
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE login_failures ENABLE ROW LEVEL SECURITY;
