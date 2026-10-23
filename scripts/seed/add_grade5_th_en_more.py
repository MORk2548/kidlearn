import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from add_grade5_extra_content import add_content, connect


MORE = {
    13: {"type": "mcq", "items": [
        ("อ่านข้อความ: สมชายตื่นเช้าไปรดน้ำต้นไม้ทุกวัน ต้นไม้ของเขาจึงเติบโตงดงาม ใจความสำคัญคือข้อใด", ["การดูแลต้นไม้สม่ำเสมอทำให้ต้นไม้เติบโตดี", "สมชายตื่นสายทุกวัน", "ต้นไม้ไม่ต้องการน้ำ", "สมชายไม่ชอบต้นไม้"], 0),
        ("อ่านข้อความ: แม่ให้เงินนิดสิบบาท นิดหยอดกระปุกห้าบาทและซื้อขนมห้าบาท นิดเป็นเด็กอย่างไร", ["รู้จักเก็บออม", "ใช้เงินฟุ่มเฟือย", "ไม่ชอบกินขนม", "ขี้เกียจ"], 0),
        ("คำเชื่อม แม้ว่า ... แต่ ... ใช้เชื่อมข้อความแบบใด", ["ข้อความที่ขัดแย้งกัน", "ข้อความที่เป็นเหตุเป็นผลกัน", "ข้อความที่คล้อยตามกัน", "ข้อความที่บอกเวลา"], 0),
        ("ข้อใดเป็นข้อเท็จจริง", ["ประเทศไทยมี 77 จังหวัด", "ทะเลภาคใต้สวยที่สุดในโลก", "ฤดูหนาวน่าเที่ยวที่สุด", "ข้าวเหนียวมะม่วงอร่อยกว่าขนมทุกชนิด"], 0),
        ("ข้อใดเป็นความคิดเห็น", ["หนังสือเล่มนี้น่าอ่านมาก", "หนังสือเล่มนี้มี 120 หน้า", "หนังสือเล่มนี้เขียนเป็นภาษาไทย", "หนังสือเล่มนี้มีรูปภาพประกอบ"], 0),
        ("อ่านข้อความ: ก่อนฝนจะตก มดมักขนไข่ขึ้นที่สูง ชาวบ้านจึงสังเกตมดเพื่อคาดว่าฝนจะตก ข้อความนี้กล่าวถึงเรื่องใด", ["การสังเกตธรรมชาติเพื่อคาดการณ์ฝน", "วิธีเลี้ยงมด", "การปลูกข้าว", "อันตรายของฝน"], 0),
        ("นิทานที่จบว่า ความพยายามอยู่ที่ไหน ความสำเร็จอยู่ที่นั่น ต้องการสอนเรื่องใด", ["ความขยันและอดทน", "ความซื่อสัตย์ต่อเพื่อน", "การประหยัดเงิน", "การรักษาความสะอาด"], 0),
        ("เมื่ออ่านพบคำที่ไม่รู้ความหมาย ควรทำอย่างไร", ["เดาจากบริบทหรือเปิดพจนานุกรม", "ข้ามเรื่องทั้งหมด", "หยุดอ่านทันที", "เปลี่ยนคำนั้นเป็นคำอื่นเอง"], 0),
        ("อ่านประกาศ: ห้องสมุดเปิดเวลา 08.00 น. ถึง 16.00 น. ปิดวันเสาร์และวันอาทิตย์ ข้อใดถูกต้อง", ["วันจันทร์ไปยืมหนังสือได้ตอนบ่ายสองโมง", "วันอาทิตย์ห้องสมุดเปิดตามปกติ", "ห้องสมุดเปิดตอนสองทุ่ม", "ห้องสมุดเปิดทุกวันไม่มีวันหยุด"], 0),
        ("อ่านประกาศ: ขอเชิญนักเรียนร่วมปลูกต้นไม้วันศุกร์นี้ ให้นำจอบและถุงมือมาด้วย จุดประสงค์ของประกาศคืออะไร", ["เชิญชวนให้ร่วมกิจกรรม", "เล่านิทาน", "ขายอุปกรณ์ทำสวน", "แจ้งผลการสอบ"], 0),
    ]},
    14: {"type": "truefalse", "items": [
        ("พยัญชนะไทยมี 44 ตัว", True),
        ("สระในภาษาไทยมีเพียง 10 รูป", False),
        ("คำว่า ครู มีอักษรควบกล้ำ คร", True),
        ("คำว่า ทราย เป็นอักษรควบไม่แท้ ออกเสียง ซ", True),
        ("คำสรรพนามใช้แทนคำนาม เช่น ฉัน เขา เรา", True),
        ("ประโยค ช่วยปิดประตูด้วย เป็นประโยคคำถาม", False),
        ("เครื่องหมาย ๆ เรียกว่าไม้ยมก ใช้เขียนแทนการซ้ำคำ", True),
        ("คำว่า ใน บน ใต้ ใช้บอกตำแหน่ง", True),
        ("มาตราตัวสะกดแม่กก ใช้ ด เป็นตัวสะกด", False),
        ("คำว่า ร้อน มีความหมายตรงข้ามกับ หนาว", True),
    ]},
    15: {"type": "fill", "items": [
        ("คำที่มีความหมายตรงกันข้ามกับ ขึ้น คือ ___", "ลง"),
        ("คำที่ใช้แทนชื่อคน เช่น ฉัน เขา เรา เรียกว่าคำ ___", "สรรพนาม"),
        ("เครื่องหมาย ๆ เรียกว่า ไม้ ___", "ยมก"),
        ("ตัวสะกดในคำว่า นก อยู่ในมาตราแม่ ___", "กก"),
        ("ตัวสะกดในคำว่า กิน อยู่ในมาตราแม่ ___", "กน"),
        ("คำที่ใช้บอกตำแหน่ง เช่น ใน บน ใต้ เรียกว่าคำ ___", "บุพบท"),
        ("พยัญชนะไทยมีทั้งหมด ___ ตัว", "44"),
        ("คำที่มีความหมายตรงกันข้ามกับ ใหม่ คือ ___", "เก่า"),
        ("เครื่องหมาย ! เรียกว่าเครื่องหมาย ___", "อัศเจรีย์"),
        ("คำว่า และ หรือ แต่ จัดเป็นคำ ___", "สันธาน"),
    ]},
    16: {"type": "matching", "items": [
        ("คำนาม", "คำที่ใช้เรียกคน สัตว์ สิ่งของ สถานที่"),
        ("คำกริยา", "คำที่บอกการกระทำ"),
        ("คำสรรพนาม", "คำที่ใช้แทนคำนาม"),
        ("คำวิเศษณ์", "คำที่บอกลักษณะ เช่น สวย เร็ว"),
        ("คำบุพบท", "คำที่บอกตำแหน่ง เช่น ใน บน ใต้"),
        ("คำอุทาน", "คำที่แสดงอารมณ์ เช่น โอ๊ย ว้าว"),
        ("คำพ้องรูป", "คำที่เขียนเหมือนกันแต่อ่านต่างกัน"),
        ("คำตรงข้าม", "คำที่มีความหมายตรงกันข้าม เช่น ใหญ่ เล็ก"),
        ("ไม้ยมก", "เครื่องหมาย ๆ ใช้ซ้ำคำ"),
        ("อักษรควบกล้ำ", "พยัญชนะสองตัวออกเสียงพร้อมกัน เช่น กร คล"),
    ]},
    17: {"type": "sequence", "items": [
        ("เรียงประโยค: น้องชายเตะฟุตบอลที่สนาม", ["น้องชาย", "เตะ", "ฟุตบอล", "ที่สนาม"]),
        ("เรียงประโยค: ครูสอนภาษาไทยในห้องเรียน", ["ครู", "สอน", "ภาษาไทย", "ในห้องเรียน"]),
        ("เรียงประโยค: ปลาว่ายน้ำอยู่ในคลอง", ["ปลา", "ว่ายน้ำ", "อยู่ในคลอง"]),
        ("เรียงประโยค: คุณตารดน้ำต้นไม้ทุกเช้า", ["คุณตา", "รดน้ำ", "ต้นไม้", "ทุกเช้า"]),
        ("เรียงประโยค: นักเรียนเข้าแถวเคารพธงชาติ", ["นักเรียน", "เข้าแถว", "เคารพ", "ธงชาติ"]),
        ("เรียงประโยค: พี่สาวทำอาหารให้ครอบครัว", ["พี่สาว", "ทำอาหาร", "ให้ครอบครัว"]),
        ("เรียงประโยค: แมวนอนหลับอยู่บนโซฟา", ["แมว", "นอนหลับ", "อยู่บนโซฟา"]),
        ("เรียงประโยค: ชาวนาปลูกข้าวในหน้าฝน", ["ชาวนา", "ปลูก", "ข้าว", "ในหน้าฝน"]),
        ("เรียงประโยค: เราไปเที่ยวทะเลเมื่อวันหยุด", ["เรา", "ไปเที่ยว", "ทะเล", "เมื่อวันหยุด"]),
        ("เรียงประโยค: หมอตรวจคนไข้ที่โรงพยาบาล", ["หมอ", "ตรวจ", "คนไข้", "ที่โรงพยาบาล"]),
    ]},
    18: {"type": "letterorder", "items": [
        ("เรียงตัวอักษรให้เป็นคำ: เครื่องเขียนที่เขียนแล้วลบได้", ["ดิ", "น", "ส", "อ"]),
        ("เรียงตัวอักษรให้เป็นคำ: สถานที่ที่นักเรียนมาเรียนทุกวัน", ["โ", "ร", "ง", "เ", "รี", "ย", "น"]),
        ("เรียงตัวอักษรให้เป็นคำ: ผู้สอนหนังสือในห้องเรียน", ["คุ", "ณ", "ค", "รู"]),
        ("เรียงตัวอักษรให้เป็นคำ: สิ่งที่คนใช้สื่อสารกัน", ["ภ", "า", "ษ", "า"]),
        ("เรียงตัวอักษรให้เป็นคำ: เรื่องเล่าที่มักมีข้อคิดตอนจบ", ["นิ", "ท", "า", "น"]),
        ("เรียงตัวอักษรให้เป็นคำ: กลุ่มคำที่มีใจความสมบูรณ์", ["ป", "ระ", "โ", "ย", "ค"]),
        ("เรียงตัวอักษรให้เป็นคำ: ใช้จดบันทึกการบ้าน", ["ส", "มุ", "ด"]),
        ("เรียงตัวอักษรให้เป็นคำ: ห้องที่ครูใช้สอนนักเรียน", ["ห้", "อ", "ง", "เ", "รี", "ย", "น"]),
        ("เรียงตัวอักษรให้เป็นคำ: หนังสือที่ใช้ค้นหาความหมายของคำ", ["พ", "จ", "น", "า", "นุ", "ก", "ร", "ม"]),
        ("เรียงตัวอักษรให้เป็นคำ: เครื่องหมายกำกับเสียงสูงต่ำ", ["ว", "ร", "ร", "ณ", "ยุ", "ก", "ต์"]),
    ]},
    19: {"type": "mcq", "items": [
        ("Which word means ไม้บรรทัด?", ["ruler", "eraser", "marker", "stapler"], 0),
        ("Where do students borrow books?", ["library", "canteen", "playground", "bathroom"], 0),
        ("Which word means ครูใหญ่?", ["principal", "student", "classmate", "driver"], 0),
        ("What do you use to cut paper?", ["scissors", "glue", "ruler", "chalk"], 0),
        ("Which word means กาว?", ["glue", "tape", "paint", "paper"], 0),
        ("What does a teacher use to write on a whiteboard?", ["marker", "crayon", "spoon", "brush"], 0),
        ("Which subject teaches numbers?", ["Math", "Art", "Music", "P.E."], 0),
        ("Which word means ห้องเรียน?", ["classroom", "bedroom", "kitchen", "garage"], 0),
        ("What do you say when you want to ask your teacher something?", ["May I ask a question?", "Go away.", "I am hungry.", "See you tomorrow."], 0),
        ("Which word means เพื่อนร่วมชั้น?", ["classmate", "neighbor", "cousin", "stranger"], 0),
    ]},
    20: {"type": "truefalse", "items": [
        ("Scissors are used to cut paper.", True),
        ("The plural of box is boxs.", False),
        ("He has a red pen is a correct sentence.", True),
        ("They is in the classroom is a correct sentence.", False),
        ("A ruler is used to measure length.", True),
        ("The word teacher means นักเรียน.", False),
        ("We say Good morning before noon.", True),
        ("The plural of child is children.", True),
        ("Sunday comes after Saturday.", True),
        ("A canteen is a place to sleep.", False),
    ]},
    21: {"type": "fill", "items": [
        ("I cut paper with ___.", "scissors"),
        ("We eat lunch in the ___.", "canteen"),
        ("Two plus three is ___.", "five"),
        ("He ___ to school by bus every day.", "goes"),
        ("There ___ thirty students in my class.", "are"),
        ("The opposite of big is ___.", "small"),
        ("I use a ___ to draw a straight line.", "ruler"),
        ("We play games in the ___ at break time.", "playground"),
        ("I like numbers. My favorite subject is ___.", "math"),
        ("She ___ a student.", "is"),
    ]},
    22: {"type": "matching", "items": [
        ("ruler", "ไม้บรรทัด"),
        ("eraser", "ยางลบ"),
        ("pencil", "ดินสอ"),
        ("scissors", "กรรไกร"),
        ("glue", "กาว"),
        ("library", "ห้องสมุด"),
        ("teacher", "ครู"),
        ("student", "นักเรียน"),
        ("classroom", "ห้องเรียน"),
        ("notebook", "สมุดบันทึก"),
    ]},
    23: {"type": "sequence", "items": [
        ("Arrange the words: My father drives a car.", ["My father", "drives", "a car"]),
        ("Arrange the words: The students sing a song.", ["The students", "sing", "a song"]),
        ("Arrange the words: I brush my teeth every night.", ["I", "brush", "my teeth", "every night"]),
        ("Arrange the words: She rides a bike to school.", ["She", "rides", "a bike", "to school"]),
        ("Arrange the words: We play badminton after school.", ["We", "play", "badminton", "after school"]),
        ("Arrange the words: The bird sings in the tree.", ["The bird", "sings", "in the tree"]),
        ("Arrange the words: My mother cooks dinner.", ["My mother", "cooks", "dinner"]),
        ("Arrange the words: He writes a letter to his friend.", ["He", "writes", "a letter", "to his friend"]),
        ("Arrange the words: They watch TV in the evening.", ["They", "watch", "TV", "in the evening"]),
        ("Arrange the words: I help my grandmother on Sunday.", ["I", "help", "my grandmother", "on Sunday"]),
    ]},
    24: {"type": "wordsearch", "items": ["ruler", "eraser", "pencil", "scissors", "glue", "library", "teacher", "student", "classroom", "notebook"]},
}


def prompt_of(qtype, item):
    if qtype == "matching":
        return f"จับคู่: {item[0]}"
    if qtype == "wordsearch":
        return item
    return item[0]


def main():
    conn = connect()
    with conn:
        with conn.cursor() as cur:
            cur.execute("SELECT setval(pg_get_serial_sequence('questions','question_id'), GREATEST((SELECT COALESCE(MAX(question_id), 0) FROM questions), 1), true)")
            cur.execute("SELECT setval(pg_get_serial_sequence('answers','answer_id'), GREATEST((SELECT COALESCE(MAX(answer_id), 0) FROM answers), 1), true)")
            summary = []
            for game_id, payload in MORE.items():
                cur.execute("SELECT question_text FROM questions WHERE game_id=%s", (game_id,))
                existing = {row[0] for row in cur.fetchall()}
                fresh = [item for item in payload["items"] if prompt_of(payload["type"], item) not in existing]
                inserted = add_content(cur, game_id, {"type": payload["type"], "items": fresh})
                summary.append((game_id, inserted))
            cur.execute("SELECT game_id, COUNT(*) FROM questions WHERE game_id BETWEEN 13 AND 24 GROUP BY game_id ORDER BY game_id")
            rows = cur.fetchall()
    conn.close()
    print("inserted:", summary)
    print("totals:", rows)


if __name__ == "__main__":
    main()
