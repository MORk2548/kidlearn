-- รหัสประจำตัวครู: admin/officer สร้างให้ครูทีละคน ใช้สมัครบัญชีครูได้ครั้งเดียว แล้วผูกกับครูคนที่ใช้
-- รันซ้ำได้ backend.php สร้างตารางให้เองตอนเรียกครั้งแรกด้วย

CREATE TABLE IF NOT EXISTS teacher_codes (
  code       VARCHAR(100) PRIMARY KEY,
  note       VARCHAR(255) NOT NULL DEFAULT '',
  created_by INT          REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  used_by    INT          REFERENCES users(user_id) ON DELETE SET NULL,
  used_at    TIMESTAMPTZ  DEFAULT NULL
);

ALTER TABLE teacher_codes ENABLE ROW LEVEL SECURITY;
