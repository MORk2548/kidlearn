-- บัญชีทดลองเพิ่ม: ครู นักเรียน ผู้ปกครอง อย่างละ 5 (รหัสผ่าน: "password")
-- รันซ้ำได้ ไม่สร้างซ้ำ; ใช้หลัง kidlearn_full.sql

INSERT INTO users (username, email, password, role, full_name) VALUES
('teacher02','teacher02@kidlearn.local','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','teacher','ครูวิชัย รักเรียน'),
('teacher03','teacher03@kidlearn.local','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','teacher','ครูมาลี ศรีสุข'),
('teacher04','teacher04@kidlearn.local','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','teacher','ครูประเสริฐ ดีงาม'),
('teacher05','teacher05@kidlearn.local','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','teacher','ครูสุดา แสงทอง'),
('teacher06','teacher06@kidlearn.local','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','teacher','ครูอนันต์ มั่นคง'),
('student02','student02@kidlearn.local','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','student','เด็กหญิงน้ำฝน ใจงาม'),
('student03','student03@kidlearn.local','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','student','เด็กชายภูมิ เก่งกล้า'),
('student04','student04@kidlearn.local','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','student','เด็กหญิงใบเตย สดใส'),
('student05','student05@kidlearn.local','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','student','เด็กชายต้นกล้า พากเพียร'),
('student06','student06@kidlearn.local','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','student','เด็กหญิงดาวใจ ยิ้มแย้ม'),
('parent02','parent02@kidlearn.local','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','parent','นางวันดี ใจงาม'),
('parent03','parent03@kidlearn.local','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','parent','นายสมศักดิ์ เก่งกล้า'),
('parent04','parent04@kidlearn.local','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','parent','นางพรทิพย์ สดใส'),
('parent05','parent05@kidlearn.local','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','parent','นายบุญมี พากเพียร'),
('parent06','parent06@kidlearn.local','$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi','parent','นางรัตนา ยิ้มแย้ม')
ON CONFLICT (username) DO NOTHING;

INSERT INTO teachers (user_id, department)
SELECT u.user_id, v.dept
FROM (VALUES ('teacher02','คณิตศาสตร์'),('teacher03','วิทยาศาสตร์'),('teacher04','ภาษาไทย'),
             ('teacher05','ภาษาอังกฤษ'),('teacher06','สังคมศึกษา')) AS v(uname, dept)
JOIN users u ON u.username = v.uname
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO parents (user_id, phone)
SELECT u.user_id, v.phone
FROM (VALUES ('parent02','0800000002'),('parent03','0800000003'),('parent04','0800000004'),
             ('parent05','0800000005'),('parent06','0800000006')) AS v(uname, phone)
JOIN users u ON u.username = v.uname
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO students (user_id, grade, classroom_id, parent_phone)
SELECT u.user_id, c.grade, c.classroom_id, v.phone
FROM (VALUES ('student02','ป.1',1,'0800000002'),('student03','ป.2',1,'0800000003'),
             ('student04','ป.3',1,'0800000004'),('student05','ป.4',1,'0800000005'),
             ('student06','ป.5',1,'0800000006')) AS v(uname, grade, room_no, phone)
JOIN users u ON u.username = v.uname
JOIN classrooms c ON c.grade = v.grade AND c.room_no = v.room_no
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO parent_student (parent_id, student_id)
SELECT p.parent_id, s.student_id
FROM parents p JOIN students s ON s.parent_phone = p.phone
ON CONFLICT DO NOTHING;
