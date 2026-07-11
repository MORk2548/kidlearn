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
    13: ("อ่านจับใจความและแยกข้อเท็จจริง", "ฝึกหาใจความสำคัญ แยกข้อเท็จจริงกับความคิดเห็น และตอบคำถามจากเรื่องที่อ่าน", "<h2>อ่านจับใจความ</h2><p>การอ่านจับใจความคือการหาสาระสำคัญของเรื่องว่าใคร ทำอะไร ที่ไหน เมื่อไร อย่างไร และเพราะเหตุใด</p><h3>สิ่งที่ควรรู้</h3><ul><li>ข้อเท็จจริงคือข้อมูลที่ตรวจสอบได้</li><li>ความคิดเห็นคือความรู้สึกหรือความเชื่อของผู้พูด</li><li>การสรุปควรใช้ภาษาของตนเองและเก็บใจความสำคัญไว้</li></ul>"),
    14: ("หลักภาษาไทยที่ต้องรู้", "ทบทวนพยัญชนะ วรรณยุกต์ ชนิดของคำ และเครื่องหมายวรรคตอน", "<h2>หลักภาษาไทยพื้นฐาน</h2><p>ภาษาไทยมีพยัญชนะ สระ วรรณยุกต์ และชนิดของคำหลายแบบ การเข้าใจหน้าที่ของคำช่วยให้อ่านและเขียนได้ชัดเจนขึ้น</p><ul><li>คำนามใช้เรียกคน สัตว์ สิ่งของ และสถานที่</li><li>คำกริยาใช้บอกการกระทำหรือสภาพ</li><li>เครื่องหมายวรรคตอนช่วยให้ประโยคอ่านง่าย</li></ul>"),
    15: ("ชนิดของคำและการเติมคำ", "ฝึกเติมคำสำคัญเกี่ยวกับคำนาม คำกริยา คำวิเศษณ์ และใจความสำคัญ", "<h2>เติมคำให้ถูกต้อง</h2><p>ก่อนเติมคำควรอ่านประโยคให้ครบ แล้วดูว่าช่องว่างต้องการคำชนิดใด เช่น คำนาม คำกริยา หรือคำวิเศษณ์</p><ul><li>คำนามเป็นชื่อของคน สัตว์ สิ่งของ</li><li>คำกริยาบอกการกระทำ</li><li>คำวิเศษณ์ช่วยขยายความหมายให้ชัดเจนขึ้น</li></ul>"),
    16: ("จับคู่หน้าที่ของคำในประโยค", "เรียนรู้ความหมายและหน้าที่ของคำ เช่น ประธาน กรรม และใจความสำคัญ", "<h2>จับคู่หลักภาษา</h2><p>การจับคู่ช่วยให้เห็นความสัมพันธ์ระหว่างคำกับหน้าที่ของคำนั้นในประโยค</p><ul><li>ประธานคือผู้ทำกริยา</li><li>กรรมคือผู้ถูกกระทำ</li><li>ใจความสำคัญคือสาระหลักของเรื่อง</li></ul>"),
    17: ("ลำดับขั้นตอนการย่อความ", "ฝึกเรียงขั้นตอนตั้งแต่การอ่านเรื่องจนถึงการตรวจทานงานเขียน", "<h2>การย่อความ</h2><p>การย่อความเป็นการเขียนสรุปเรื่องให้สั้นลง โดยยังคงสาระสำคัญครบถ้วน</p><ol><li>อ่านเรื่องทั้งหมด</li><li>หาใจความสำคัญ</li><li>ขีดเส้นคำสำคัญ</li><li>เรียบเรียงด้วยภาษาของตนเอง</li><li>ตรวจความถูกต้อง</li></ol>"),
    18: ("คำศัพท์ภาษาไทย ป.5", "ทบทวนคำสำคัญในวิชาภาษาไทยผ่านเกมค้นหาคำ", "<h2>คำศัพท์ภาษาไทย</h2><p>เกมค้นหาคำช่วยให้จดจำคำศัพท์และสะกดคำได้แม่นยำขึ้น ก่อนเล่นให้อ่านรายการคำ แล้วค่อยลากตัวอักษรในตารางตามลำดับคำ</p>"),
    19: ("Classroom Vocabulary", "Learn common classroom words and choose the correct meaning or use.", "<h2>Classroom Vocabulary</h2><p>Classroom words help students talk about people, objects, and places at school.</p><ul><li>A teacher helps students learn.</li><li>A library is a place for reading and borrowing books.</li><li>A pencil, ruler, and eraser are useful school objects.</li></ul>"),
    20: ("True or False in Everyday English", "Practice simple facts about English words, grammar, and school routines.", "<h2>True or False</h2><p>Read each sentence carefully. Decide if the sentence is correct or not.</p><ul><li>Look for grammar clues such as is, am, are, and plural nouns.</li><li>Check the meaning before choosing an answer.</li></ul>"),
    21: ("Present Simple and Useful Words", "Fill in missing English words in common grade-5 sentences.", "<h2>Fill in the Blank</h2><p>Use the context of the sentence to choose the missing word. Present simple sentences often use everyday verbs such as read, write, play, and study.</p>"),
    22: ("Vocabulary Matching", "Match English words with their Thai meanings.", "<h2>Vocabulary Matching</h2><p>Matching English words with Thai meanings builds vocabulary and helps students remember words faster.</p>"),
    23: ("Alphabetical Order", "Practice arranging English words in A to Z order.", "<h2>Alphabetical Order</h2><p>To arrange words alphabetically, compare the first letter. If the first letters are the same, compare the next letters.</p>"),
    24: ("School Word Search", "Find English school words in a letter grid.", "<h2>Word Search</h2><p>Look for each word in the grid. Words may appear horizontally, vertically, or diagonally. Reading each word aloud can help with spelling.</p>"),
}

NAMES = {
    13: "อ่านจับใจความ",
    14: "จริงหรือเท็จ ภาษาไทย",
    15: "เติมคำภาษาไทย",
    16: "จับคู่หลักภาษา",
    17: "เรียงลำดับการย่อความ",
    18: "ค้นหาคำภาษาไทย",
    19: "Classroom Quiz",
    20: "True or False English",
    21: "Fill in the Blank",
    22: "Vocabulary Matching",
    23: "Alphabetical Order",
    24: "Word Search",
}

CONTENT = {
    13: [("ใจความสำคัญของเรื่องคืออะไร?", ["สาระสำคัญที่ผู้เขียนต้องการบอก", "คำที่ยาวที่สุดในเรื่อง", "ชื่อผู้แต่ง", "ประโยคสุดท้ายของเรื่อง"], 0), ("ข้อใดเป็นข้อเท็จจริง?", ["น้ำเดือดที่ประมาณ 100 องศาเซลเซียส", "ฉันคิดว่าวันนี้อากาศดีที่สุด", "หนังสือเล่มนี้สนุกมาก", "สีฟ้าสวยกว่าสีเขียว"], 0), ("ประโยคใดเป็นความคิดเห็น?", ["ฉันคิดว่าหนังสือเล่มนี้สนุกมาก", "ประเทศไทยมี 77 จังหวัด", "ปลาว่ายน้ำได้", "นักเรียนไปโรงเรียนวันจันทร์"], 0), ("การอ่านอย่างมีวิจารณญาณควรทำสิ่งใด?", ["ตรวจสอบเหตุผลและหลักฐาน", "เชื่อทุกข้อความทันที", "อ่านเฉพาะชื่อเรื่อง", "เลือกคำตอบที่สั้นที่สุด"], 0), ("คำว่า สรุป หมายถึงอะไร?", ["ย่อสาระสำคัญให้สั้นลง", "คัดลอกทุกประโยค", "เขียนเรื่องใหม่ทั้งหมด", "อ่านออกเสียงดังขึ้น"], 0), ("ข้อใดเหมาะกับการตั้งชื่อเรื่อง?", ["ใช้คำสั้น กระชับ ตรงเนื้อหา", "ใช้ประโยคยาวที่สุด", "ตั้งชื่อไม่เกี่ยวกับเรื่อง", "ใช้คำยากเสมอ"], 0)],
    14: [("ภาษาไทยมีพยัญชนะ 44 ตัว", True), ("ไม้เอก ไม้โท ไม้ตรี และไม้จัตวา เป็นวรรณยุกต์", True), ("คำกริยาคือคำที่ใช้เรียกคน สัตว์ สิ่งของ", False), ("ประโยคที่ดีควรมีใจความสมบูรณ์", True), ("คำควบกล้ำแท้มีพยัญชนะต้นสองตัวออกเสียงกล้ำกัน", True), ("เครื่องหมายคำถามใช้ท้ายประโยคบอกเล่าเสมอ", False)],
    15: [("คำที่ใช้เรียกคน สัตว์ สิ่งของ เรียกว่า ___", "คำนาม"), ("คำที่แสดงอาการหรือการกระทำ เรียกว่า ___", "คำกริยา"), ("ประโยค นักเรียนอ่านหนังสือ คำว่า อ่าน เป็น ___", "คำกริยา"), ("คำที่ขยายคำนามหรือคำกริยา เรียกว่า ___", "คำวิเศษณ์"), ("เครื่องหมาย ___ ใช้ท้ายประโยคคำถาม", "ปรัศนี"), ("การย่อความต้องเก็บ ___ ของเรื่อง", "ใจความสำคัญ")],
    16: [("คำนาม", "ใช้เรียกคน สัตว์ สิ่งของ"), ("คำกริยา", "บอกการกระทำหรือสภาพ"), ("คำวิเศษณ์", "ขยายคำอื่นให้ชัดเจน"), ("ประธาน", "ผู้ทำกริยา"), ("กรรม", "ผู้ถูกกระทำ"), ("ใจความสำคัญ", "สาระหลักของเรื่อง")],
    17: ["อ่านเรื่องทั้งหมด", "หาใจความสำคัญ", "ขีดเส้นคำสำคัญ", "เรียบเรียงด้วยภาษาของตนเอง", "ตรวจความถูกต้อง", "ตั้งชื่อเรื่อง"],
    18: ["คำนาม", "กริยา", "วิเศษณ์", "ประโยค", "ใจความ", "สรุป", "ผู้เขียน", "อ่าน", "เขียน", "ภาษา"],
    19: [("Who teaches students in a classroom?", ["teacher", "student", "doctor", "farmer"], 0), ("Which object do you use to write?", ["pencil", "ruler", "chair", "window"], 0), ("Where can students read and borrow books?", ["library", "canteen", "playground", "office"], 0), ("What do you use to remove pencil marks?", ["eraser", "pen", "bag", "desk"], 0), ("Which word means ผู้เรียน?", ["student", "teacher", "lesson", "school"], 0), ("Which object helps you draw a straight line?", ["ruler", "book", "fish", "bird"], 0)],
    20: [("A teacher helps students learn.", True), ("A pencil is used for eating soup.", False), ("Students read books in a library.", True), ("An eraser removes pencil marks.", True), ("The plural of book is bookes.", False), ("Good morning is a greeting.", True)],
    21: [("I ___ English every Monday.", "study"), ("She reads a ___ in the library.", "book"), ("We write with a ___.", "pencil"), ("The teacher stands in front of the ___.", "classroom"), ("Please open your ___ to page ten.", "notebook"), ("He uses a ruler to draw a straight ___.", "line")],
    22: [("teacher", "ครู"), ("student", "นักเรียน"), ("library", "ห้องสมุด"), ("pencil", "ดินสอ"), ("eraser", "ยางลบ"), ("ruler", "ไม้บรรทัด")],
    23: ["Friday", "Monday", "Saturday", "Thursday", "Tuesday", "Wednesday"],
    24: ["teacher", "student", "pencil", "eraser", "ruler", "school", "library", "lesson", "english", "notebook"],
}

QTYPES = {
    13: "mcq",
    14: "truefalse",
    15: "fill",
    16: "matching",
    17: "sequence",
    18: "wordsearch",
    19: "mcq",
    20: "truefalse",
    21: "fill",
    22: "matching",
    23: "sequence",
    24: "wordsearch",
}


def add_question(cur, game_id, text, question_type, order_no):
    cur.execute(
        "INSERT INTO questions (game_id, question_text, question_type, order_no, point) VALUES (%s,%s,%s,%s,1) RETURNING question_id",
        (game_id, text, question_type, order_no),
    )
    return cur.fetchone()[0]


def seed():
    env = load_env(os.path.join(os.getcwd(), ".env"))
    conn = psycopg2.connect(
        host=env["DB_HOST"],
        port=env.get("DB_PORT", "5432"),
        dbname=env.get("DB_NAME", "postgres"),
        user=env["DB_USER"],
        password=env["DB_PASS"],
        sslmode="require",
    )
    with conn:
        with conn.cursor() as cur:
            cur.execute("SELECT setval(pg_get_serial_sequence('questions','question_id'), GREATEST((SELECT COALESCE(MAX(question_id), 0) FROM questions), 1), true)")
            cur.execute("SELECT setval(pg_get_serial_sequence('answers','answer_id'), GREATEST((SELECT COALESCE(MAX(answer_id), 0) FROM answers), 1), true)")
            for game_id in range(13, 25):
                question_type = QTYPES[game_id]
                question_count = 1 if question_type == "sequence" else len(CONTENT[game_id])
                cur.execute("UPDATE games SET name=%s, question_count=%s WHERE game_id=%s", (NAMES[game_id], question_count, game_id))
                title, summary, body = LESSONS[game_id]
                cur.execute(
                    """
                    INSERT INTO lesson_content (game_id, lesson_no, title, summary, body, read_time, status, version_no, published_at, updated_at)
                    VALUES (%s, 1, %s, %s, %s, 5, 'published', 1, now(), now())
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
                cur.execute("DELETE FROM answers WHERE question_id IN (SELECT question_id FROM questions WHERE game_id=%s)", (game_id,))
                cur.execute("DELETE FROM questions WHERE game_id=%s", (game_id,))
                if question_type == "mcq":
                    for order_no, (prompt, choices, correct_index) in enumerate(CONTENT[game_id], 1):
                        question_id = add_question(cur, game_id, prompt, question_type, order_no)
                        for choice_order, choice in enumerate(choices, 1):
                            cur.execute("INSERT INTO answers (question_id, answer_text, is_correct, seq_order) VALUES (%s,%s,%s,%s)", (question_id, choice, choice_order - 1 == correct_index, choice_order))
                elif question_type == "truefalse":
                    for order_no, (prompt, is_true) in enumerate(CONTENT[game_id], 1):
                        question_id = add_question(cur, game_id, prompt, question_type, order_no)
                        cur.execute("INSERT INTO answers (question_id, answer_text, is_correct, seq_order) VALUES (%s,%s,%s,1)", (question_id, "ถูก", is_true))
                        cur.execute("INSERT INTO answers (question_id, answer_text, is_correct, seq_order) VALUES (%s,%s,%s,2)", (question_id, "ผิด", not is_true))
                elif question_type == "fill":
                    for order_no, (prompt, answer) in enumerate(CONTENT[game_id], 1):
                        question_id = add_question(cur, game_id, prompt, question_type, order_no)
                        cur.execute("INSERT INTO answers (question_id, answer_text, is_correct, seq_order) VALUES (%s,%s,true,1)", (question_id, answer))
                elif question_type == "matching":
                    for order_no, (left, right) in enumerate(CONTENT[game_id], 1):
                        question_id = add_question(cur, game_id, "จับคู่คำศัพท์ให้ถูกต้อง", question_type, order_no)
                        cur.execute(
                            "INSERT INTO answers (question_id, answer_text, pair_left, pair_right, is_correct, seq_order) VALUES (%s,%s,%s,%s,true,%s)",
                            (question_id, f"{left} - {right}", left, right, order_no),
                        )
                elif question_type == "sequence":
                    prompt = "เรียงลำดับให้ถูกต้อง" if game_id == 17 else "Arrange these words in alphabetical order."
                    question_id = add_question(cur, game_id, prompt, question_type, 1)
                    for order_no, item in enumerate(CONTENT[game_id], 1):
                        cur.execute("INSERT INTO answers (question_id, answer_text, is_correct, seq_order) VALUES (%s,%s,true,%s)", (question_id, item, order_no))
                elif question_type == "wordsearch":
                    for order_no, word in enumerate(CONTENT[game_id], 1):
                        question_id = add_question(cur, game_id, word, question_type, order_no)
                        cur.execute("INSERT INTO answers (question_id, answer_text, is_correct, seq_order) VALUES (%s,%s,true,%s)", (question_id, word, order_no))
            cur.execute(
                """
                SELECT g.game_id, g.name, g.question_count, COUNT(DISTINCT q.question_id), COUNT(a.answer_id)
                FROM games g
                LEFT JOIN questions q ON q.game_id = g.game_id
                LEFT JOIN answers a ON a.question_id = q.question_id
                WHERE g.game_id BETWEEN 13 AND 24
                GROUP BY g.game_id, g.name, g.question_count
                ORDER BY g.game_id
                """
            )
            rows = cur.fetchall()
            cur.execute("SELECT game_id, title FROM lesson_content WHERE game_id BETWEEN 13 AND 24 AND lesson_no=1 ORDER BY game_id")
            lessons = cur.fetchall()
    conn.close()
    print("seeded games:")
    for row in rows:
        print(row)
    print("lesson titles:")
    for row in lessons:
        print(row)


if __name__ == "__main__":
    seed()
