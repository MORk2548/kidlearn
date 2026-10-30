-- เลขที่ของนักเรียนในห้อง: ไม่บังคับ แต่ห้ามซ้ำในห้องเดียวกัน (NULL ซ้ำกันได้)
-- รันหลัง kidlearn_full.sql รันซ้ำได้
ALTER TABLE students ADD COLUMN IF NOT EXISTS student_no SMALLINT CHECK (student_no BETWEEN 1 AND 99);
CREATE UNIQUE INDEX IF NOT EXISTS uq_students_classroom_no ON students (classroom_id, student_no);
