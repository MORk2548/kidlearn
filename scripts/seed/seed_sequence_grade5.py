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


THAI_SEQUENCE = [
    ("เรียงคำให้เป็นประโยค: นักเรียนอ่านหนังสือในห้องสมุด", ["นักเรียน", "อ่าน", "หนังสือ", "ในห้องสมุด"]),
    ("เรียงคำให้เป็นประโยค: คุณครูสอนภาษาไทยอย่างสนุก", ["คุณครู", "สอน", "ภาษาไทย", "อย่างสนุก"]),
    ("เรียงคำให้เป็นประโยค: เด็กชายช่วยแม่ล้างจาน", ["เด็กชาย", "ช่วย", "แม่", "ล้างจาน"]),
    ("เรียงคำให้เป็นประโยค: น้องปลูกต้นไม้หน้าบ้าน", ["น้อง", "ปลูก", "ต้นไม้", "หน้าบ้าน"]),
    ("เรียงคำให้เป็นประโยค: พวกเราไปโรงเรียนแต่เช้า", ["พวกเรา", "ไป", "โรงเรียน", "แต่เช้า"]),
    ("เรียงคำให้เป็นประโยค: แมวตัวเล็กนอนบนเก้าอี้", ["แมวตัวเล็ก", "นอน", "บนเก้าอี้"]),
    ("เรียงคำให้เป็นประโยค: ฉันเขียนจดหมายถึงเพื่อน", ["ฉัน", "เขียน", "จดหมาย", "ถึงเพื่อน"]),
    ("เรียงคำให้เป็นประโยค: นักกีฬาออกกำลังกายทุกวัน", ["นักกีฬา", "ออกกำลังกาย", "ทุกวัน"]),
    ("เรียงคำให้เป็นประโยค: ชาวสวนเก็บผลไม้ตอนเช้า", ["ชาวสวน", "เก็บ", "ผลไม้", "ตอนเช้า"]),
    ("เรียงคำให้เป็นประโยค: นักเรียนตั้งใจฟังครูอธิบาย", ["นักเรียน", "ตั้งใจฟัง", "ครู", "อธิบาย"]),
]

ENGLISH_SEQUENCE = [
    ("Arrange the words: I study English every day.", ["I", "study", "English", "every day"]),
    ("Arrange the words: She reads a book in class.", ["She", "reads", "a book", "in class"]),
    ("Arrange the words: We play football after school.", ["We", "play", "football", "after school"]),
    ("Arrange the words: The teacher writes on the board.", ["The teacher", "writes", "on the board"]),
    ("Arrange the words: My friend likes science.", ["My friend", "likes", "science"]),
    ("Arrange the words: They go to the library.", ["They", "go", "to the library"]),
    ("Arrange the words: He uses a pencil.", ["He", "uses", "a pencil"]),
    ("Arrange the words: The students sing a song.", ["The students", "sing", "a song"]),
    ("Arrange the words: I have lunch at noon.", ["I", "have lunch", "at noon"]),
    ("Arrange the words: We clean the classroom.", ["We", "clean", "the classroom"]),
]


def reset_sequence_game(cur, game_id, name, rows):
    cur.execute("UPDATE games SET name=%s, game_type='sequence', question_count=%s WHERE game_id=%s", (name, len(rows), game_id))
    cur.execute("DELETE FROM answers WHERE question_id IN (SELECT question_id FROM questions WHERE game_id=%s)", (game_id,))
    cur.execute("DELETE FROM questions WHERE game_id=%s", (game_id,))
    for order_no, (prompt, answers) in enumerate(rows, 1):
        cur.execute(
            "INSERT INTO questions (game_id, question_text, question_type, order_no, point) VALUES (%s,%s,'sequence',%s,1) RETURNING question_id",
            (game_id, prompt, order_no),
        )
        question_id = cur.fetchone()[0]
        for seq_order, answer in enumerate(answers, 1):
            cur.execute(
                "INSERT INTO answers (question_id, answer_text, is_correct, seq_order) VALUES (%s,%s,true,%s)",
                (question_id, answer, seq_order),
            )


def main():
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
            reset_sequence_game(cur, 17, "เรียงประโยคภาษาไทย", THAI_SEQUENCE)
            reset_sequence_game(cur, 23, "Sentence Order", ENGLISH_SEQUENCE)
            cur.execute(
                """
                SELECT g.game_id, g.name, g.game_type, g.question_count, COUNT(DISTINCT q.question_id), COUNT(a.answer_id)
                FROM games g
                LEFT JOIN questions q ON q.game_id = g.game_id
                LEFT JOIN answers a ON a.question_id = q.question_id
                WHERE g.game_id IN (17, 23)
                GROUP BY g.game_id, g.name, g.game_type, g.question_count
                ORDER BY g.game_id
                """
            )
            rows = cur.fetchall()
    conn.close()
    for row in rows:
        print(row)


if __name__ == "__main__":
    main()
