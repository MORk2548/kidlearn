-- ============================================================
-- kidlearn_patch_v2.sql
-- วิธีใช้: phpMyAdmin → เลือก kidlearn_db → แท็บ SQL → วาง → Execute
-- ============================================================

USE kidlearn_db;

-- 1) เพิ่ม lesson_no ในตาราง scores
ALTER TABLE scores
  ADD COLUMN IF NOT EXISTS lesson_no TINYINT UNSIGNED NOT NULL DEFAULT 1 AFTER game_id;

-- 2) ตาราง lesson_content
CREATE TABLE IF NOT EXISTS lesson_content (
  content_id  INT AUTO_INCREMENT PRIMARY KEY,
  game_id     INT NOT NULL,
  lesson_no   TINYINT UNSIGNED NOT NULL DEFAULT 1,
  title       VARCHAR(200) NOT NULL,
  body        LONGTEXT COMMENT 'เนื้อหา HTML ใส่เพิ่มเองได้',
  summary     VARCHAR(300) DEFAULT NULL,
  read_time   TINYINT UNSIGNED DEFAULT 5,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_game_lesson (game_id, lesson_no),
  FOREIGN KEY (game_id) REFERENCES games(game_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3) Seed ตัวอย่าง game_id=1 ทั้ง 6 บท
INSERT IGNORE INTO lesson_content (game_id,lesson_no,title,summary,read_time,body) VALUES
(1,1,'บวกเลขหลักเดียว','เรียนรู้การบวกเลข 1-9 พร้อมเทคนิคช่วยจำ',3,'<h2>การบวกเลขหลักเดียว</h2><p>พื้นฐานสำคัญของคณิตศาสตร์ ผลบวกไม่เกิน <strong>18</strong></p><h3>ตัวอย่าง</h3><ul><li>3+4=<b>7</b></li><li>6+5=<b>11</b></li><li>9+9=<b>18</b></li></ul><h3>💡 เทคนิค</h3><p>ถ้าเกิน 10 ให้แตก เช่น 7+6=7+3+3=10+3=<b>13</b></p>'),
(1,2,'ลบเลขหลักเดียว','การลบเลข 1-9 และความสัมพันธ์กับการบวก',3,'<h2>การลบเลขหลักเดียว</h2><p>การลบคือการนับถอยหลัง</p><ul><li>9-4=<b>5</b></li><li>8-3=<b>5</b></li><li>7-7=<b>0</b></li></ul><h3>💡 เทคนิค</h3><p>ถ้า 3+4=7 แล้ว 7-4=3 และ 7-3=4</p>'),
(1,3,'บวกลบสองหลัก','การบวกลบเลขสองหลัก ทั้งแบบทดและไม่ทด',5,'<h2>บวกลบสองหลัก</h2><p>เลขสองหลัก = หลักสิบ + หลักหน่วย</p><h3>ไม่ทด</h3><p>23+15=(20+10)+(3+5)=<b>38</b></p><h3>มีทด</h3><p>27+15=27+10+5=<b>42</b></p><h3>ลบมียืม</h3><p>52-18 ยืมจากหลักสิบ → <b>34</b></p>'),
(1,4,'คูณตารางสูตร','ท่องตารางสูตรคูณ 1-12 พร้อมเทคนิค',6,'<h2>ตารางสูตรคูณ</h2><p>การคูณคือการบวกซ้ำ: 3×4=3+3+3+3=12</p><ul><li>สูตร <b>2</b>: บวกตัวเอง</li><li>สูตร <b>5</b>: ลงท้าย 0 หรือ 5</li><li>สูตร <b>9</b>: หลักสิบ+หลักหน่วย=9 เสมอ</li><li>สูตร <b>10</b>: เพิ่ม 0 ข้างหลัง</li></ul>'),
(1,5,'หารเบื้องต้น','การหารและความสัมพันธ์กับการคูณ',5,'<h2>การหารเบื้องต้น</h2><p>การหารคือการแบ่งเป็นกลุ่มเท่าๆ กัน</p><p>ถ้า 3×4=12 แล้ว 12÷3=<b>4</b>, 12÷4=<b>3</b></p><ul><li>หารด้วย 0 ไม่ได้</li><li>0÷ตัวเลขใดๆ=0</li><li>ตัวเลขใดๆ÷1=ตัวเลขนั้น</li></ul>'),
(1,6,'โจทย์ผสม','ลำดับการคำนวณ BODMAS',7,'<h2>โจทย์ผสม (BODMAS)</h2><ol><li><b>B</b>rackets วงเล็บก่อน</li><li><b>O</b>rders เลขยกกำลัง</li><li><b>D/M</b> หาร/คูณ ซ้ายไปขวา</li><li><b>A/S</b> บวก/ลบ ซ้ายไปขวา</li></ol><p>(4+6)×3=<b>30</b> | 2+3×4=<b>14</b> | 20÷4+3=<b>8</b></p>');
