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


QUESTIONS = [
    ("เรียงตัวอักษรให้เป็นคำศัพท์ภาษาไทย", ["ห", "นั", "ง", "สื", "อ"]),
    ("เรียงตัวอักษรให้เป็นคำศัพท์ภาษาไทย", ["นั", "ก", "เ", "รี", "ย", "น"]),
    ("เรียงตัวอักษรให้เป็นคำศัพท์ภาษาไทย", ["ภ", "า", "ษ", "า"]),
    ("เรียงตัวอักษรให้เป็นชนิดของคำ", ["คำ", "น", "า", "ม"]),
    ("เรียงตัวอักษรให้เป็นชนิดของคำ", ["ก", "ริ", "ย", "า"]),
    ("เรียงตัวอักษรให้เป็นคำเกี่ยวกับประโยค", ["ป", "ระ", "โ", "ย", "ค"]),
    ("เรียงตัวอักษรให้เป็นคำเกี่ยวกับการอ่าน", ["ใ", "จ", "ค", "ว", "า", "ม"]),
    ("เรียงตัวอักษรให้เป็นคำเกี่ยวกับงานเขียน", ["ผู้", "เ", "ขี", "ย", "น"]),
    ("เรียงตัวอักษรให้เป็นทักษะการอ่าน", ["ส", "รุ", "ป"]),
    ("เรียงตัวอักษรให้เป็นคำกริยา", ["อ่", "า", "น"]),
]


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
            cur.execute("UPDATE games SET name=%s, game_type='letterorder', question_count=%s, time_limit=120 WHERE game_id=18", ("เรียงตัวอักษรภาษาไทย", len(QUESTIONS)))
            cur.execute("DELETE FROM answers WHERE question_id IN (SELECT question_id FROM questions WHERE game_id=18)")
            cur.execute("DELETE FROM questions WHERE game_id=18")
            for order_no, (prompt, letters) in enumerate(QUESTIONS, 1):
                cur.execute(
                    "INSERT INTO questions (game_id, question_text, question_type, order_no, point) VALUES (18,%s,'letterorder',%s,1) RETURNING question_id",
                    (prompt, order_no),
                )
                question_id = cur.fetchone()[0]
                for seq_order, letter in enumerate(letters, 1):
                    cur.execute(
                        "INSERT INTO answers (question_id, answer_text, is_correct, seq_order) VALUES (%s,%s,true,%s)",
                        (question_id, letter, seq_order),
                    )
            cur.execute(
                """
                SELECT g.game_id, g.name, g.game_type, g.question_count, COUNT(DISTINCT q.question_id), COUNT(a.answer_id)
                FROM games g
                LEFT JOIN questions q ON q.game_id = g.game_id
                LEFT JOIN answers a ON a.question_id = q.question_id
                WHERE g.game_id = 18
                GROUP BY g.game_id, g.name, g.game_type, g.question_count
                """
            )
            row = cur.fetchone()
    conn.close()
    print(row)


if __name__ == "__main__":
    main()
