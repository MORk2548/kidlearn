DELETE FROM answers WHERE question_id IN (19,20,21,22,23,24,55,56,57,58,59,60,91,92,93,94,95,96,127,128,129,130,131,132,163,164,165,166,167,168,199,200,201,202,203,204,217,218,219,220);
DELETE FROM questions WHERE question_id IN (217,218,219,220);

UPDATE questions SET question_text='Which place has many books to read?', hint=NULL, order_no=1 WHERE question_id=19 AND game_id=19;
UPDATE questions SET question_text='What do you use to tell the time?', hint=NULL, order_no=2 WHERE question_id=20 AND game_id=19;
UPDATE questions SET question_text='Who teaches students in the classroom?', hint=NULL, order_no=3 WHERE question_id=21 AND game_id=19;
UPDATE questions SET question_text='Which word means "eraser"?', hint=NULL, order_no=4 WHERE question_id=22 AND game_id=19;
UPDATE questions SET question_text='Where do students study every day?', hint=NULL, order_no=5 WHERE question_id=23 AND game_id=19;
UPDATE questions SET question_text='Which subject helps us learn new English words?', hint=NULL, order_no=6 WHERE question_id=24 AND game_id=19;

UPDATE questions SET question_text='"Library" means ห้องสมุด.', hint=NULL, order_no=1 WHERE question_id=55 AND game_id=20;
UPDATE questions SET question_text='The sentence "She go to school every day." is correct.', hint=NULL, order_no=2 WHERE question_id=56 AND game_id=20;
UPDATE questions SET question_text='"Breakfast" is the first meal of the day.', hint=NULL, order_no=3 WHERE question_id=57 AND game_id=20;
UPDATE questions SET question_text='"Yesterday" means วันพรุ่งนี้.', hint=NULL, order_no=4 WHERE question_id=58 AND game_id=20;
UPDATE questions SET question_text='There are 7 days in a week.', hint=NULL, order_no=5 WHERE question_id=59 AND game_id=20;
UPDATE questions SET question_text='"Teacher" means นักเรียน.', hint=NULL, order_no=6 WHERE question_id=60 AND game_id=20;

UPDATE questions SET question_text='My mother ___ dinner every evening.', hint='cook / cooks / cooking', order_no=1 WHERE question_id=91 AND game_id=21;
UPDATE questions SET question_text='We study English on ___.', hint='Monday', order_no=2 WHERE question_id=92 AND game_id=21;
UPDATE questions SET question_text='The opposite of "easy" is ___.', hint='not difficult', order_no=3 WHERE question_id=93 AND game_id=21;
UPDATE questions SET question_text='There are twelve ___ in one year.', hint='January to December', order_no=4 WHERE question_id=94 AND game_id=21;
UPDATE questions SET question_text='I write with a ___.', hint='school object', order_no=5 WHERE question_id=95 AND game_id=21;
UPDATE questions SET question_text='A person who teaches students is a ___.', hint='job at school', order_no=6 WHERE question_id=96 AND game_id=21;

UPDATE questions SET question_text='Library → ห้องสมุด', order_no=1 WHERE question_id=127 AND game_id=22;
UPDATE questions SET question_text='Homework → การบ้าน', order_no=2 WHERE question_id=128 AND game_id=22;
UPDATE questions SET question_text='Subject → วิชา', order_no=3 WHERE question_id=129 AND game_id=22;
UPDATE questions SET question_text='Question → คำถาม', order_no=4 WHERE question_id=130 AND game_id=22;
UPDATE questions SET question_text='Answer → คำตอบ', order_no=5 WHERE question_id=131 AND game_id=22;
UPDATE questions SET question_text='Vacation → วันหยุด', order_no=6 WHERE question_id=132 AND game_id=22;

UPDATE questions SET question_text='Friday', order_no=1 WHERE question_id=163 AND game_id=23;
UPDATE questions SET question_text='Monday', order_no=2 WHERE question_id=164 AND game_id=23;
UPDATE questions SET question_text='Saturday', order_no=3 WHERE question_id=165 AND game_id=23;
UPDATE questions SET question_text='Thursday', order_no=4 WHERE question_id=166 AND game_id=23;
UPDATE questions SET question_text='Tuesday', order_no=5 WHERE question_id=167 AND game_id=23;
UPDATE questions SET question_text='Wednesday', order_no=6 WHERE question_id=168 AND game_id=23;

UPDATE questions SET question_text='teacher', order_no=1 WHERE question_id=199 AND game_id=24;
UPDATE questions SET question_text='student', order_no=2 WHERE question_id=200 AND game_id=24;
UPDATE questions SET question_text='pencil', order_no=3 WHERE question_id=201 AND game_id=24;
UPDATE questions SET question_text='eraser', order_no=4 WHERE question_id=202 AND game_id=24;
UPDATE questions SET question_text='ruler', order_no=5 WHERE question_id=203 AND game_id=24;
UPDATE questions SET question_text='school', order_no=6 WHERE question_id=204 AND game_id=24;

INSERT INTO questions (question_id,game_id,question_text,question_img,question_type,hint,order_no,point) VALUES
  (217,24,'library',NULL,'word',NULL,7,10),
  (218,24,'lesson',NULL,'word',NULL,8,10),
  (219,24,'english',NULL,'word',NULL,9,10),
  (220,24,'notebook',NULL,'word',NULL,10,10);

INSERT INTO answers (question_id,answer_text,is_correct,pair_left,pair_right,seq_order) VALUES
  (19,'Library',1,NULL,NULL,NULL),(19,'Playground',0,NULL,NULL,NULL),(19,'Hospital',0,NULL,NULL,NULL),(19,'Kitchen',0,NULL,NULL,NULL),
  (20,'Clock',1,NULL,NULL,NULL),(20,'Pencil',0,NULL,NULL,NULL),(20,'Desk',0,NULL,NULL,NULL),(20,'Window',0,NULL,NULL,NULL),
  (21,'Doctor',0,NULL,NULL,NULL),(21,'Teacher',1,NULL,NULL,NULL),(21,'Driver',0,NULL,NULL,NULL),(21,'Farmer',0,NULL,NULL,NULL),
  (22,'pencil',0,NULL,NULL,NULL),(22,'eraser',1,NULL,NULL,NULL),(22,'school',0,NULL,NULL,NULL),(22,'teacher',0,NULL,NULL,NULL),
  (23,'Library',0,NULL,NULL,NULL),(23,'School',1,NULL,NULL,NULL),(23,'Market',0,NULL,NULL,NULL),(23,'Garden',0,NULL,NULL,NULL),
  (24,'Math',0,NULL,NULL,NULL),(24,'Art',0,NULL,NULL,NULL),(24,'English',1,NULL,NULL,NULL),(24,'Music',0,NULL,NULL,NULL),
  (55,'ถูก',1,NULL,NULL,NULL),(55,'ผิด',0,NULL,NULL,NULL),
  (56,'ถูก',0,NULL,NULL,NULL),(56,'ผิด',1,NULL,NULL,NULL),
  (57,'ถูก',1,NULL,NULL,NULL),(57,'ผิด',0,NULL,NULL,NULL),
  (58,'ถูก',0,NULL,NULL,NULL),(58,'ผิด',1,NULL,NULL,NULL),
  (59,'ถูก',1,NULL,NULL,NULL),(59,'ผิด',0,NULL,NULL,NULL),
  (60,'ถูก',0,NULL,NULL,NULL),(60,'ผิด',1,NULL,NULL,NULL),
  (91,'cooks',1,NULL,NULL,NULL),(92,'monday',1,NULL,NULL,NULL),(93,'hard',1,NULL,NULL,NULL),
  (94,'months',1,NULL,NULL,NULL),(95,'pencil',1,NULL,NULL,NULL),(96,'teacher',1,NULL,NULL,NULL),
  (127,'Library',1,'Library','ห้องสมุด',NULL),(128,'Homework',1,'Homework','การบ้าน',NULL),
  (129,'Subject',1,'Subject','วิชา',NULL),(130,'Question',1,'Question','คำถาม',NULL),
  (131,'Answer',1,'Answer','คำตอบ',NULL),(132,'Vacation',1,'Vacation','วันหยุด',NULL),
  (163,'Friday',1,NULL,NULL,1),(164,'Monday',1,NULL,NULL,2),(165,'Saturday',1,NULL,NULL,3),
  (166,'Thursday',1,NULL,NULL,4),(167,'Tuesday',1,NULL,NULL,5),(168,'Wednesday',1,NULL,NULL,6),
  (199,'teacher',1,NULL,NULL,NULL),(200,'student',1,NULL,NULL,NULL),(201,'pencil',1,NULL,NULL,NULL),
  (202,'eraser',1,NULL,NULL,NULL),(203,'ruler',1,NULL,NULL,NULL),(204,'school',1,NULL,NULL,NULL),
  (217,'library',1,NULL,NULL,NULL),(218,'lesson',1,NULL,NULL,NULL),(219,'english',1,NULL,NULL,NULL),(220,'notebook',1,NULL,NULL,NULL);
