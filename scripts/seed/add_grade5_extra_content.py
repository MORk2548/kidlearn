import os
import sys

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.join(os.getcwd(), ".tmp_pydeps2"))

import psycopg2


def load_env(path):
    data = {}
    with open(path, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            data[key.strip()] = value.strip().strip('"').strip("'")
    return data


LESSONS = {
    13: ("อ่านจับใจความอย่างเป็นขั้นตอน", "เรียนรู้การอ่านเพื่อหาใจความสำคัญ แยกข้อเท็จจริง ความคิดเห็น และสรุปก่อนตอบคำถาม", "<h2>อ่านก่อนเล่น: จับใจความสำคัญ</h2><p>ก่อนตอบคำถาม ให้อ่านเรื่องหรือประโยคอย่างตั้งใจ แล้วถามตนเองว่า ใคร ทำอะไร ที่ไหน เมื่อไร และเพราะเหตุใด คำตอบเหล่านี้จะช่วยให้เห็นใจความสำคัญของเรื่อง</p><h3>จำให้แม่น</h3><ul><li>ใจความสำคัญคือสิ่งที่ผู้เขียนต้องการบอกมากที่สุด</li><li>ข้อเท็จจริงตรวจสอบได้ เช่น วันที่ จำนวน หรือเหตุการณ์จริง</li><li>ความคิดเห็นเป็นความรู้สึกหรือความเชื่อ เช่น ดี สนุก น่าจะ</li><li>การสรุปควรใช้คำของตนเองและไม่ใส่รายละเอียดเกินจำเป็น</li></ul><p><strong>วิธีเล่นเกม:</strong> อ่านโจทย์ให้ครบก่อนเลือกคำตอบ แล้วมองหาคำสำคัญในโจทย์ เช่น เพราะว่า ดังนั้น ฉันคิดว่า หรือข้อมูลที่ตรวจสอบได้</p>"),
    14: ("หลักภาษาไทยก่อนตอบจริงหรือเท็จ", "ทบทวนชนิดของคำ ประโยค เครื่องหมายวรรคตอน และคำควบกล้ำก่อนเล่นเกมจริงหรือเท็จ", "<h2>อ่านก่อนเล่น: หลักภาษาไทย</h2><p>ภาษาไทยมีส่วนประกอบหลายอย่าง เช่น พยัญชนะ สระ วรรณยุกต์ ชนิดของคำ และรูปประโยค การเข้าใจหน้าที่ของคำช่วยให้อ่านและเขียนได้ถูกต้อง</p><ul><li>คำนามใช้เรียกคน สัตว์ สิ่งของ สถานที่ หรือความคิด</li><li>คำกริยาใช้บอกการกระทำหรือสภาพ</li><li>คำวิเศษณ์ใช้ขยายคำอื่นให้ชัดเจนขึ้น</li><li>ประโยคที่สมบูรณ์ควรมีใจความครบถ้วน</li></ul><p><strong>วิธีเล่นเกม:</strong> อ่านข้อความแล้วพิจารณาว่าถูกต้องตามหลักภาษาหรือไม่ ถ้าโจทย์ใช้คำว่า เสมอ ทุกครั้ง หรือทั้งหมด ต้องตรวจให้รอบคอบเป็นพิเศษ</p>"),
    15: ("เติมคำให้ถูกต้องตามบริบท", "ฝึกใช้บริบทของประโยคเพื่อเติมคำนาม คำกริยา คำวิเศษณ์ และคำสำคัญทางภาษาไทย", "<h2>อ่านก่อนเล่น: เติมคำจากบริบท</h2><p>การเติมคำต้องดูคำที่อยู่หน้าและหลังช่องว่าง หากช่องว่างเป็นผู้ทำกริยา มักต้องเติมคำนาม หากช่องว่างเป็นการกระทำ มักต้องเติมคำกริยา</p><h3>แนวคิดสำคัญ</h3><ul><li>อ่านประโยคทั้งประโยคก่อนตอบ</li><li>ดูว่าคำตอบควรเป็นคน สิ่งของ การกระทำ หรือคำขยาย</li><li>สะกดคำให้ถูกต้อง โดยเฉพาะคำที่มีสระหรือวรรณยุกต์</li></ul><p><strong>วิธีเล่นเกม:</strong> พิมพ์คำตอบให้ตรงกับความหมายและสะกดให้ถูกต้อง</p>"),
    16: ("จับคู่คำกับหน้าที่ในประโยค", "เรียนรู้คำศัพท์หลักภาษาและหน้าที่ของคำเพื่อจับคู่ให้ถูกต้อง", "<h2>อ่านก่อนเล่น: จับคู่หลักภาษา</h2><p>คำแต่ละชนิดมีหน้าที่ต่างกันในประโยค เช่น ประธานเป็นผู้ทำกริยา กริยาเป็นการกระทำ และกรรมเป็นผู้ถูกกระทำ</p><ul><li>มองหาคำหลักด้านซ้ายก่อน</li><li>นึกถึงหน้าที่หรือความหมายของคำนั้น</li><li>เลือกคำอธิบายด้านขวาที่สัมพันธ์กันที่สุด</li></ul><p><strong>วิธีเล่นเกม:</strong> คลิกคำด้านซ้ายแล้วจับคู่กับความหมายหรือหน้าที่ด้านขวา</p>"),
    17: ("เรียงประโยคภาษาไทยให้ถูกลำดับ", "เรียนรู้โครงสร้างประโยคไทยแบบง่ายก่อนฝึกเรียงคำ", "<h2>อ่านก่อนเล่น: เรียงคำเป็นประโยค</h2><p>ประโยคไทยทั่วไปมักเรียงจากผู้กระทำ ไปสู่การกระทำ แล้วตามด้วยสิ่งที่ถูกกระทำหรือส่วนขยาย เช่น นักเรียน อ่าน หนังสือ ในห้องสมุด</p><h3>ลำดับที่ควรสังเกต</h3><ul><li>ประธาน: ใครหรือสิ่งใดเป็นผู้ทำ</li><li>กริยา: ทำอะไร</li><li>กรรมหรือส่วนเติมเต็ม: ทำกับอะไร</li><li>ส่วนขยาย: ที่ไหน เมื่อไร อย่างไร</li></ul><p><strong>วิธีเล่นเกม:</strong> แตะคำจากคลังคำแล้วเรียงลงช่องให้เป็นประโยคที่อ่านรู้เรื่อง</p>"),
    18: ("เรียงตัวอักษรภาษาไทยให้เป็นคำ", "ฝึกมองรูปคำ พยางค์ และการสะกดคำภาษาไทยก่อนเล่นเกมเรียงตัวอักษร", "<h2>อ่านก่อนเล่น: เรียงตัวอักษรเป็นคำ</h2><p>ภาษาไทยมีพยัญชนะ สระ และวรรณยุกต์ที่ต้องวางรวมกันให้ถูกต้อง บางคำอาจแบ่งเป็นตัวอักษรหรือพยางค์ เช่น หนั-ง-สื-อ เมื่อนำมาเรียงถูกจะเป็นคำว่า หนังสือ</p><ul><li>อ่านโจทย์เพื่อเดาว่าเป็นคำเกี่ยวกับเรื่องใด</li><li>มองหาพยางค์ต้นของคำก่อน</li><li>เรียงตัวอักษรหรือพยางค์ให้เป็นคำที่มีความหมาย</li><li>อ่านคำที่เรียงเสร็จอีกครั้งก่อนกดตรวจ</li></ul><p><strong>วิธีเล่นเกม:</strong> แตะบัตรตัวอักษรด้านบนเพื่อวางลงช่องคำตอบด้านล่าง ถ้าวางผิดให้แตะช่องนั้นเพื่อนำออก</p>"),
    19: ("Classroom Vocabulary Before the Quiz", "Study common classroom words before choosing the correct answer.", "<h2>Learn Before Playing: Classroom Words</h2><p>Classroom vocabulary helps students talk about school life. Read each word and meaning before playing.</p><ul><li>A teacher helps students learn.</li><li>A student learns in class.</li><li>A library is a place for reading books.</li><li>A ruler helps draw straight lines.</li><li>An eraser removes pencil marks.</li></ul><p><strong>How to play:</strong> Read the question carefully, look for the keyword, and choose the best answer.</p>"),
    20: ("True or False English Practice", "Review simple English facts, grammar, and vocabulary before deciding true or false.", "<h2>Learn Before Playing: True or False</h2><p>In a true-or-false game, every word matters. Check the subject, verb, plural form, and meaning before answering.</p><ul><li>Use is with one person or thing.</li><li>Use are with plural nouns.</li><li>Many plural nouns end with s, such as books and pencils.</li><li>A sentence should begin with a capital letter.</li></ul><p><strong>How to play:</strong> Choose True if the whole sentence is correct. Choose False if one part is wrong.</p>"),
    21: ("Fill in the Blank with Context Clues", "Practice using sentence clues to complete English sentences.", "<h2>Learn Before Playing: Fill in the Blank</h2><p>When a word is missing, read the whole sentence first. The words around the blank can tell you if you need a noun, verb, place, or object.</p><ul><li>I, you, we, and they often use the base verb: I study.</li><li>He, she, and it often add s: She reads.</li><li>School objects include pencil, book, notebook, ruler, and eraser.</li></ul><p><strong>How to play:</strong> Type the missing word. Check spelling before submitting.</p>"),
    22: ("Match English Words with Thai Meanings", "Build vocabulary by matching English words with Thai meanings.", "<h2>Learn Before Playing: Vocabulary Matching</h2><p>Matching words helps memory because you connect a new English word with a meaning you already know in Thai.</p><ul><li>Read the English word aloud.</li><li>Think of where you see or use that thing.</li><li>Match it with the Thai meaning that fits best.</li></ul><p><strong>How to play:</strong> Click a word on the left, then click its meaning on the right.</p>"),
    23: ("Sentence Order in English", "Learn basic English word order before arranging words into sentences.", "<h2>Learn Before Playing: English Sentence Order</h2><p>Simple English sentences often follow this order: subject + verb + object or place/time. For example, I study English every day.</p><h3>Remember</h3><ul><li>Subject: who or what the sentence is about</li><li>Verb: the action</li><li>Object or place: what, where, or when</li></ul><p><strong>How to play:</strong> Tap the words in the correct order to make a complete sentence.</p>"),
    24: ("School Word Search Vocabulary", "Study school vocabulary before finding words in the word-search grid.", "<h2>Learn Before Playing: Word Search</h2><p>Word search helps spelling and word recognition. Before playing, read each word aloud and notice its letters.</p><ul><li>Words may go across, down, or diagonally.</li><li>Look for the first and last letter of each word.</li><li>Long words are often easier to find because they have a clearer shape.</li></ul><p><strong>How to play:</strong> Drag across the letters in the grid to select each word.</p>"),
}


EXTRA = {
    13: {"type": "mcq", "items": [
        ("ข้อใดเป็นใจความสำคัญของข้อความ: ฝนตกหนักตลอดคืน ทำให้น้ำท่วมถนนหลายสาย นักเรียนจึงมาโรงเรียนสาย", ["ฝนตกหนักทำให้น้ำท่วมและนักเรียนมาโรงเรียนสาย", "นักเรียนทุกคนชอบฝน", "ถนนทุกสายในประเทศน้ำท่วม", "โรงเรียนปิดตลอดวัน"], 0),
        ("คำว่า เพราะว่า มักบอกความสัมพันธ์แบบใด", ["เหตุผล", "เวลา", "สถานที่", "คำถาม"], 0),
        ("ประโยคใดเป็นข้อเท็จจริง", ["ดวงอาทิตย์ขึ้นทางทิศตะวันออก", "ฉันว่าท้องฟ้าวันนี้สวยที่สุด", "อาหารจานนี้อร่อยมาก", "สีแดงน่าจะเหมาะที่สุด"], 0),
        ("ประโยคใดเป็นความคิดเห็น", ["ฉันคิดว่าการอ่านหนังสือสนุก", "น้ำเป็นของเหลว", "แมวเป็นสัตว์เลี้ยงลูกด้วยนม", "ประเทศไทยมีจังหวัด"], 0),
        ("ถ้าต้องการสรุปเรื่อง ควรทำสิ่งใดก่อน", ["หาใจความสำคัญ", "คัดลอกทุกคำ", "อ่านเฉพาะบรรทัดสุดท้าย", "เลือกประโยคที่ยาวที่สุด"], 0),
        ("รายละเอียดสนับสนุนมีหน้าที่อะไร", ["ช่วยอธิบายใจความสำคัญให้ชัดขึ้น", "แทนชื่อเรื่องเสมอ", "ทำให้เรื่องไม่มีสาระ", "เป็นคำตอบเดียวเท่านั้น"], 0),
        ("ชื่อเรื่องที่ดีควรเป็นอย่างไร", ["สั้น ชัดเจน และตรงเนื้อหา", "ยาวที่สุดเท่าที่ทำได้", "ไม่เกี่ยวกับเนื้อเรื่อง", "มีแต่คำยาก"], 0),
        ("คำว่า ดังนั้น มักนำไปสู่ส่วนใดของข้อความ", ["ผลหรือข้อสรุป", "ตัวละครใหม่", "สถานที่", "คำอุทาน"], 0),
        ("การอ่านจับใจความควรหลีกเลี่ยงสิ่งใด", ["เดาคำตอบโดยไม่อ่านเรื่อง", "อ่านคำถามให้เข้าใจ", "ขีดเส้นคำสำคัญ", "ตรวจหลักฐานในเรื่อง"], 0),
        ("ข้อใดช่วยให้ตอบคำถามจากเรื่องอ่านได้ดี", ["อ่านโจทย์และย้อนดูหลักฐานในเรื่อง", "เลือกคำตอบที่ดูยาวที่สุด", "ตอบตามความชอบเสมอ", "ไม่ต้องอ่านตัวเลือก"], 0),
    ]},
    14: {"type": "truefalse", "items": [
        ("คำนามใช้เรียกคน สัตว์ สิ่งของ สถานที่ หรือความคิด", True),
        ("คำกริยาใช้บอกการกระทำหรือสภาพ", True),
        ("คำวิเศษณ์ใช้ขยายความหมายของคำอื่น", True),
        ("ประโยคคำถามควรใช้เครื่องหมายคำถามเมื่อเขียน", True),
        ("คำว่า วิ่ง เป็นคำนามเสมอ", False),
        ("ประธานคือส่วนที่มักบอกว่าใครหรือสิ่งใดทำกริยา", True),
        ("คำว่า แต่ มักใช้เชื่อมข้อความที่มีความขัดแย้งกัน", True),
        ("การเว้นวรรคไม่จำเป็นต่อความเข้าใจในการเขียนภาษาไทย", False),
        ("คำควบกล้ำช่วยให้การออกเสียงบางคำชัดเจนขึ้น", True),
        ("ประโยคที่สมบูรณ์ต้องไม่มีความหมาย", False),
    ]},
    15: {"type": "fill", "items": [
        ("คำที่บอกว่าใครเป็นผู้ทำกริยาในประโยค เรียกว่า ___", "ประธาน"),
        ("ส่วนของประโยคที่บอกการกระทำ เรียกว่า ___", "กริยา"),
        ("คำว่า โรงเรียน เป็นคำชนิด ___", "คำนาม"),
        ("คำว่า อย่างรวดเร็ว ทำหน้าที่เป็นคำ ___", "วิเศษณ์"),
        ("ข้อความที่นำมาอ้างอิงได้และตรวจสอบได้ เรียกว่า ___", "ข้อเท็จจริง"),
        ("ข้อความที่แสดงความรู้สึกหรือความเชื่อ เรียกว่า ___", "ความคิดเห็น"),
        ("การเขียนให้สั้นลงโดยยังคงสาระสำคัญ เรียกว่า ___", "ย่อความ"),
        ("เครื่องหมาย ? ในภาษาไทยเรียกว่าเครื่องหมาย ___", "ปรัศนี"),
        ("คำที่มีความหมายตรงกันข้ามกับ มาก คือ ___", "น้อย"),
        ("คำเชื่อม เพราะว่า ใช้บอก ___", "เหตุผล"),
    ]},
    16: {"type": "matching", "items": [
        ("ข้อเท็จจริง", "ข้อมูลที่ตรวจสอบได้"),
        ("ความคิดเห็น", "ความรู้สึกหรือความเชื่อของผู้พูด"),
        ("ย่อความ", "เขียนสาระสำคัญให้สั้นลง"),
        ("ชื่อเรื่อง", "ข้อความสั้นที่บอกภาพรวมของเรื่อง"),
        ("คำเชื่อม", "คำที่เชื่อมข้อความหรือประโยค"),
        ("คำถาม", "ประโยคที่ต้องการคำตอบ"),
        ("คำสั่ง", "ประโยคที่บอกให้ทำสิ่งใดสิ่งหนึ่ง"),
        ("ส่วนขยาย", "คำหรือกลุ่มคำที่เพิ่มรายละเอียด"),
        ("วรรณยุกต์", "เครื่องหมายกำกับเสียงสูงต่ำ"),
        ("คำพ้องเสียง", "คำที่ออกเสียงเหมือนกันแต่ความหมายต่างกัน"),
    ]},
    17: {"type": "sequence", "items": [
        ("เรียงประโยค: เด็กหญิงทำการบ้านหลังเลิกเรียน", ["เด็กหญิง", "ทำการบ้าน", "หลังเลิกเรียน"]),
        ("เรียงประโยค: พ่ออ่านข่าวในโทรศัพท์", ["พ่อ", "อ่าน", "ข่าว", "ในโทรศัพท์"]),
        ("เรียงประโยค: นกบินอยู่บนท้องฟ้า", ["นก", "บิน", "อยู่บนท้องฟ้า"]),
        ("เรียงประโยค: คุณยายเล่านิทานให้หลานฟัง", ["คุณยาย", "เล่านิทาน", "ให้หลานฟัง"]),
        ("เรียงประโยค: นักเรียนช่วยกันทำความสะอาดห้อง", ["นักเรียน", "ช่วยกัน", "ทำความสะอาด", "ห้อง"]),
        ("เรียงประโยค: ลมพัดแรงในตอนบ่าย", ["ลม", "พัดแรง", "ในตอนบ่าย"]),
        ("เรียงประโยค: แม่ซื้อผลไม้ที่ตลาด", ["แม่", "ซื้อ", "ผลไม้", "ที่ตลาด"]),
        ("เรียงประโยค: เพื่อนของฉันร้องเพลงไพเราะ", ["เพื่อนของฉัน", "ร้องเพลง", "ไพเราะ"]),
        ("เรียงประโยค: ช้างเดินช้าๆ ในป่า", ["ช้าง", "เดิน", "ช้าๆ", "ในป่า"]),
        ("เรียงประโยค: เราควรอ่านหนังสือทุกวัน", ["เรา", "ควรอ่าน", "หนังสือ", "ทุกวัน"]),
    ]},
    18: {"type": "letterorder", "items": [
        ("เรียงตัวอักษรให้เป็นคำเกี่ยวกับการเรียน", ["บ", "ท", "เ", "รี", "ย", "น"]),
        ("เรียงตัวอักษรให้เป็นคำเกี่ยวกับภาษา", ["อั", "ก", "ษ", "ร"]),
        ("เรียงตัวอักษรให้เป็นคำเกี่ยวกับการอ่าน", ["เ", "รื่", "อ", "ง"]),
        ("เรียงตัวอักษรให้เป็นคำเกี่ยวกับข้อความ", ["ข้", "อ", "ค", "ว", "า", "ม"]),
        ("เรียงตัวอักษรให้เป็นคำเกี่ยวกับการเขียน", ["ส", "ะ", "ก", "ด"]),
        ("เรียงตัวอักษรให้เป็นคำเกี่ยวกับประโยค", ["ป", "ระ", "ธ", "า", "น"]),
        ("เรียงตัวอักษรให้เป็นคำเกี่ยวกับประโยค", ["ก", "ร", "ร", "ม"]),
        ("เรียงตัวอักษรให้เป็นคำเกี่ยวกับการอ่าน", ["อ", "ธิ", "บ", "า", "ย"]),
        ("เรียงตัวอักษรให้เป็นคำเกี่ยวกับความหมาย", ["ค", "ว", "า", "ม", "ห", "ม", "า", "ย"]),
        ("เรียงตัวอักษรให้เป็นคำเกี่ยวกับหนังสือ", ["ห้", "อ", "ง", "ส", "มุ", "ด"]),
    ]},
    19: {"type": "mcq", "items": [
        ("Which word means กระดาน?", ["board", "window", "floor", "door"], 0),
        ("What do students carry books in?", ["bag", "cup", "plate", "shoe"], 0),
        ("Which word means โต๊ะเรียน?", ["desk", "tree", "fish", "hat"], 0),
        ("Who studies in a classroom?", ["student", "pilot", "chef", "nurse"], 0),
        ("Which object tells time?", ["clock", "eraser", "pencil", "ruler"], 0),
        ("What do you open to read?", ["book", "ball", "spoon", "shirt"], 0),
        ("Which place is for eating lunch at school?", ["canteen", "library", "bedroom", "garden"], 0),
        ("Which word means สมุดบันทึก?", ["notebook", "school", "teacher", "lesson"], 0),
        ("What do you use to color a picture?", ["crayon", "ruler", "chair", "door"], 0),
        ("Which word means บทเรียน?", ["lesson", "student", "pencil", "window"], 0),
    ]},
    20: {"type": "truefalse", "items": [
        ("A desk is a thing students can write on.", True),
        ("A clock is used to tell time.", True),
        ("The plural of pencil is pencils.", True),
        ("She are my teacher is a correct sentence.", False),
        ("I am a student is a correct sentence.", True),
        ("A library is a place to swim.", False),
        ("Good afternoon is a greeting.", True),
        ("An eraser is used to cut paper.", False),
        ("We use capital letters at the beginning of a sentence.", True),
        ("The word classroom means ห้องครัว.", False),
    ]},
    21: {"type": "fill", "items": [
        ("I write in my ___ every day.", "notebook"),
        ("The ___ writes on the board.", "teacher"),
        ("We read books in the ___.", "library"),
        ("She ___ English after school.", "studies"),
        ("A ___ tells us the time.", "clock"),
        ("Please sit on your ___.", "chair"),
        ("He puts his books in a ___.", "bag"),
        ("I use an ___ to remove pencil marks.", "eraser"),
        ("They ___ football in the playground.", "play"),
        ("Open your book to ___ five.", "page"),
    ]},
    22: {"type": "matching", "items": [
        ("board", "กระดาน"),
        ("desk", "โต๊ะเรียน"),
        ("chair", "เก้าอี้"),
        ("clock", "นาฬิกา"),
        ("bag", "กระเป๋า"),
        ("crayon", "สีเทียน"),
        ("page", "หน้าในหนังสือ"),
        ("canteen", "โรงอาหาร"),
        ("playground", "สนามเด็กเล่น"),
        ("homework", "การบ้าน"),
    ]},
    23: {"type": "sequence", "items": [
        ("Arrange the words: The boy reads a story.", ["The boy", "reads", "a story"]),
        ("Arrange the words: My sister likes music.", ["My sister", "likes", "music"]),
        ("Arrange the words: We study Thai at school.", ["We", "study", "Thai", "at school"]),
        ("Arrange the words: The dog runs fast.", ["The dog", "runs", "fast"]),
        ("Arrange the words: I drink milk every morning.", ["I", "drink", "milk", "every morning"]),
        ("Arrange the words: She draws a beautiful picture.", ["She", "draws", "a beautiful picture"]),
        ("Arrange the words: They visit the museum.", ["They", "visit", "the museum"]),
        ("Arrange the words: He cleans his room.", ["He", "cleans", "his room"]),
        ("Arrange the words: We listen to the teacher.", ["We", "listen", "to the teacher"]),
        ("Arrange the words: The cat sleeps under the table.", ["The cat", "sleeps", "under the table"]),
    ]},
    24: {"type": "wordsearch", "items": ["board", "desk", "chair", "clock", "bag", "crayon", "page", "canteen", "playground", "homework"]},
}


def connect():
    env = load_env(os.path.join(os.getcwd(), ".env"))
    return psycopg2.connect(
        host=env["DB_HOST"],
        port=env.get("DB_PORT", "5432"),
        dbname=env.get("DB_NAME", "postgres"),
        user=env["DB_USER"],
        password=env["DB_PASS"],
        sslmode="require",
    )


def next_order(cur, game_id):
    cur.execute("SELECT COALESCE(MAX(order_no), 0) + 1 FROM questions WHERE game_id=%s", (game_id,))
    return cur.fetchone()[0]


def question_exists(cur, game_id, prompt):
    cur.execute("SELECT 1 FROM questions WHERE game_id=%s AND question_text=%s LIMIT 1", (game_id, prompt))
    return cur.fetchone() is not None


def insert_question(cur, game_id, prompt, question_type, order_no):
    cur.execute(
        "INSERT INTO questions (game_id, question_text, question_type, order_no, point) VALUES (%s,%s,%s,%s,1) RETURNING question_id",
        (game_id, prompt, question_type, order_no),
    )
    return cur.fetchone()[0]


def add_content(cur, game_id, payload):
    qtype = payload["type"]
    order_no = next_order(cur, game_id)
    inserted = 0
    if qtype == "mcq":
        for prompt, choices, correct_idx in payload["items"]:
            if question_exists(cur, game_id, prompt):
                continue
            qid = insert_question(cur, game_id, prompt, qtype, order_no)
            order_no += 1
            for idx, choice in enumerate(choices, 1):
                cur.execute("INSERT INTO answers (question_id, answer_text, is_correct, seq_order) VALUES (%s,%s,%s,%s)", (qid, choice, idx - 1 == correct_idx, idx))
            inserted += 1
    elif qtype == "truefalse":
        for prompt, is_true in payload["items"]:
            if question_exists(cur, game_id, prompt):
                continue
            qid = insert_question(cur, game_id, prompt, qtype, order_no)
            order_no += 1
            cur.execute("INSERT INTO answers (question_id, answer_text, is_correct, seq_order) VALUES (%s,'ถูก',%s,1)", (qid, is_true))
            cur.execute("INSERT INTO answers (question_id, answer_text, is_correct, seq_order) VALUES (%s,'ผิด',%s,2)", (qid, not is_true))
            inserted += 1
    elif qtype == "fill":
        for prompt, answer in payload["items"]:
            if question_exists(cur, game_id, prompt):
                continue
            qid = insert_question(cur, game_id, prompt, qtype, order_no)
            order_no += 1
            cur.execute("INSERT INTO answers (question_id, answer_text, is_correct, seq_order) VALUES (%s,%s,true,1)", (qid, answer))
            inserted += 1
    elif qtype == "matching":
        for left, right in payload["items"]:
            prompt = f"จับคู่: {left}"
            if question_exists(cur, game_id, prompt):
                continue
            qid = insert_question(cur, game_id, prompt, qtype, order_no)
            order_no += 1
            cur.execute(
                "INSERT INTO answers (question_id, answer_text, pair_left, pair_right, is_correct, seq_order) VALUES (%s,%s,%s,%s,true,1)",
                (qid, f"{left} - {right}", left, right),
            )
            inserted += 1
    elif qtype in ("sequence", "letterorder"):
        for prompt, parts in payload["items"]:
            if question_exists(cur, game_id, prompt):
                continue
            qid = insert_question(cur, game_id, prompt, qtype, order_no)
            order_no += 1
            for seq_order, part in enumerate(parts, 1):
                cur.execute("INSERT INTO answers (question_id, answer_text, is_correct, seq_order) VALUES (%s,%s,true,%s)", (qid, part, seq_order))
            inserted += 1
    elif qtype == "wordsearch":
        for word in payload["items"]:
            prompt = f"ค้นหาคำ: {word}"
            if question_exists(cur, game_id, prompt):
                continue
            qid = insert_question(cur, game_id, word, qtype, order_no)
            order_no += 1
            cur.execute("INSERT INTO answers (question_id, answer_text, is_correct, seq_order) VALUES (%s,%s,true,1)", (qid, word))
            inserted += 1
    return inserted


def main():
    conn = connect()
    with conn:
        with conn.cursor() as cur:
            cur.execute("SELECT setval(pg_get_serial_sequence('questions','question_id'), GREATEST((SELECT COALESCE(MAX(question_id), 0) FROM questions), 1), true)")
            cur.execute("SELECT setval(pg_get_serial_sequence('answers','answer_id'), GREATEST((SELECT COALESCE(MAX(answer_id), 0) FROM answers), 1), true)")
            for game_id, (title, summary, body) in LESSONS.items():
                cur.execute(
                    """
                    INSERT INTO lesson_content (game_id, lesson_no, title, summary, body, read_time, status, version_no, published_at, updated_at)
                    VALUES (%s, 1, %s, %s, %s, 7, 'published', 1, now(), now())
                    ON CONFLICT (game_id, lesson_no) DO UPDATE SET
                        title=EXCLUDED.title,
                        summary=EXCLUDED.summary,
                        body=EXCLUDED.body,
                        read_time=EXCLUDED.read_time,
                        status='published',
                        version_no=lesson_content.version_no + 1,
                        published_at=now(),
                        updated_at=now()
                    """,
                    (game_id, title, summary, body),
                )
            summary = []
            for game_id, payload in EXTRA.items():
                inserted = add_content(cur, game_id, payload)
                cur.execute("UPDATE games SET question_count=(SELECT COUNT(*) FROM questions WHERE game_id=%s) WHERE game_id=%s", (game_id, game_id))
                summary.append((game_id, inserted))
            cur.execute(
                """
                SELECT g.game_id, g.name, g.game_type, g.question_count, COUNT(DISTINCT q.question_id) AS q_count, COUNT(a.answer_id) AS a_count
                FROM games g
                LEFT JOIN questions q ON q.game_id=g.game_id
                LEFT JOIN answers a ON a.question_id=q.question_id
                WHERE g.game_id BETWEEN 13 AND 24
                GROUP BY g.game_id, g.name, g.game_type, g.question_count
                ORDER BY g.game_id
                """
            )
            rows = cur.fetchall()
    conn.close()
    print("inserted:", summary)
    for row in rows:
        print(row)


if __name__ == "__main__":
    main()
