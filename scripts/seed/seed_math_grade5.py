"""Seed the replacement grade-5 mathematics games into PostgreSQL."""
import json
import os
import sys
from decimal import Decimal
from fractions import Fraction

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.join(os.getcwd(), ".tmp_pydeps2"))
import psycopg2

GAMES = [
    ("math_fraction_quest", "ภารกิจพิชิตอาณาจักรเศษส่วน", "🏰", 120,
     "เศษส่วน", "ฝึกเปรียบเทียบและบวกเศษส่วน", "<h2>เศษส่วน</h2><p>เศษส่วนมีตัวเศษบอกจำนวนส่วนที่เลือก และตัวส่วนบอกจำนวนส่วนเท่า ๆ กันทั้งหมด เมื่อตัวส่วนต่างกัน ให้ทำส่วนให้เท่ากันก่อนเปรียบเทียบหรือบวก</p>"),
    ("math_pizza_chef", "เชฟน้อยพิชิตพิซซ่า", "🍕", 120,
     "เศษส่วนกับพิซซ่า", "เลือกชิ้นพิซซ่าให้ตรงกับเศษส่วน", "<h2>พิซซ่าเศษส่วน</h2><p>แบ่งพิซซ่าเป็นชิ้นขนาดเท่ากัน ตัวส่วนคือจำนวนชิ้นทั้งหมด และตัวเศษคือจำนวนชิ้นที่เลือก</p>"),
    ("math_decimal_shop", "ร้านค้าคณิตคิดเงินไว", "🛍️", 120,
     "คิดราคารวมและเงินทอน", "คำนวณเงินซื้อสินค้าและเงินทอน", "<h2>ทศนิยมกับเงิน</h2><p>จัดตำแหน่งจุดทศนิยมให้ตรงกันเมื่อนำจำนวนเงินมาบวกหรือลบ ตรวจสอบว่าราคารวมไม่มากกว่าเงินที่จ่าย</p>"),
    ("math_decimal_treasure", "นักล่าสมบัติทศนิยม", "🗝️", 120,
     "กุญแจทศนิยม", "แก้โจทย์บวกและลบทศนิยมเพื่อเปิดหีบ", "<h2>บวกและลบทศนิยม</h2><p>เขียนจำนวนให้จุดทศนิยมตรงกัน เติมศูนย์ท้ายได้เมื่อจำเป็น แล้วคำนวณตามหลักเดียวกับจำนวนเต็ม</p>"),
    ("math_data_detective", "นักสืบข้อมูลมหัศจรรย์", "🕵️", 120,
     "อ่านตารางและแผนภูมิ", "ค้นหาค่าสูงสุด ผลรวม และผลต่างจากข้อมูล", "<h2>อ่านข้อมูล</h2><p>อ่านชื่อหมวดหมู่และค่าของแต่ละรายการให้ครบก่อนหาค่าสูงสุด ผลรวม หรือผลต่าง</p>"),
    ("math_chart_builder", "สร้างกราฟพิชิตคะแนน", "📊", 150,
     "สร้างกราฟแท่ง", "สร้างกราฟจากข้อมูลและตรวจสอบแท่งข้อมูล", "<h2>สร้างกราฟแท่ง</h2><p>กราฟแท่งใช้เปรียบเทียบข้อมูลแต่ละหมวดหมู่ ความสูงของแท่งต้องตรงกับค่าที่ให้มา และแต่ละแท่งต้องมีป้ายกำกับถูกต้อง</p>"),
]
LEVELS = ("easy", "medium", "hard")


def options(correct, candidates):
    values = [str(correct)]
    for item in candidates:
        text = str(item)
        if text not in values:
            values.append(text)
    while len(values) < 4:
        values.append(f"{values[-1]} (ตรวจอีกครั้ง)")
    return [(value, value == str(correct)) for value in values[:4]]


def money(cents):
    return f"{Decimal(cents) / 100:.2f}"


def fraction_text(value):
    return f"{value.numerator}/{value.denominator}"


def fraction_questions(level):
    rows = []
    for i in range(10):
        if level == "easy":
            denominator = 5 + i % 6
            left = 1 + i % (denominator - 2)
            right = left + 1
            correct = Fraction(max(left, right), denominator)
            wrong = [Fraction(max(1, left - 1), denominator), Fraction(max(1, right - 1), denominator), Fraction(denominator - 1, denominator)]
            prompt = f"เศษส่วนใดมีค่ามากกว่า: {left}/{denominator} หรือ {right}/{denominator}?"
            hint = "เมื่อตัวส่วนเท่ากัน ให้เปรียบเทียบตัวเศษ"
            explanation = "ตัวส่วนเท่ากัน เศษส่วนที่มีตัวเศษมากกว่าจะมีค่ามากกว่า"
        elif level == "medium":
            denominator = 4 + i % 7
            left = 1 + i % (denominator - 2)
            right = 1 + (i + 2) % (denominator - 1)
            correct = Fraction(left + right, denominator)
            wrong = [Fraction(left + right + 1, denominator), Fraction(max(1, left + right - 1), denominator), Fraction(left + right, denominator + 1)]
            prompt = f"{left}/{denominator} + {right}/{denominator} = เท่าไร?"
            hint = "บวกตัวเศษและคงตัวส่วนเดิม"
            explanation = f"({left}+{right})/{denominator} = {fraction_text(correct)} แล้วตัดทอนถ้าทำได้"
        else:
            d1 = 3 + i % 5
            d2 = d1 + 2
            n1 = 1 + i % (d1 - 1)
            n2 = 1 + (i * 2) % (d2 - 1)
            correct = Fraction(n1, d1) + Fraction(n2, d2)
            wrong = [correct + Fraction(1, d1 * d2), max(Fraction(1, d1 * d2), correct - Fraction(1, d1)), Fraction(n1 + n2, d1 + d2)]
            prompt = f"{n1}/{d1} + {n2}/{d2} = เท่าไร?"
            hint = f"หา ค.ร.น. ของ {d1} และ {d2} ก่อน"
            explanation = f"ทำตัวส่วนให้เท่ากันแล้วบวกตัวเศษ ได้ {fraction_text(correct)}"
        correct_text = fraction_text(correct)
        rows.append((prompt, hint, explanation, "", options(correct_text, map(fraction_text, wrong))))
    return rows


def pizza_questions(level_index):
    rows = []
    for i in range(10):
        denominator = 4 + level_index * 3 + i % 3
        numerator = 1 + (i * 2 + level_index) % (denominator - 1)
        payload = json.dumps({"numerator": numerator, "denominator": denominator}, ensure_ascii=False)
        prompt = f"พิซซ่าถูกแบ่งเป็น {denominator} ชิ้นเท่ากัน ต้องเลือกกี่ชิ้นจึงจะได้ {numerator}/{denominator} ถาด?"
        hint = f"ตัวส่วน {denominator} บอกจำนวนชิ้นทั้งหมด ส่วนตัวเศษ {numerator} บอกจำนวนชิ้นที่เลือก"
        explanation = f"เลือก {numerator} จาก {denominator} ชิ้น จึงได้ {numerator}/{denominator} ถาด"
        rows.append((prompt, hint, explanation, payload, options(numerator, [max(1, numerator - 1), min(denominator, numerator + 1), denominator - numerator])))
    return rows


def decimal_shop_questions(level_index):
    rows = []
    for i in range(10):
        count = level_index + 1
        prices = [125 + ((i * 37 + j * 83) % 875) for j in range(count)]
        total = sum(prices)
        paid = ((total + 499) // 500) * 500 + (0 if i % 2 else 500)
        products = " + ".join(f"{['นม', 'ขนมปัง', 'น้ำผลไม้'][j]} {money(price)} บาท" for j, price in enumerate(prices))
        correct = money(paid - total)
        prompt = f"ซื้อ {products} จ่าย {money(paid)} บาท จะได้เงินทอนเท่าไร?"
        hint = "รวมราคาสินค้าก่อน แล้วนำเงินที่จ่ายลบด้วยราคารวม"
        explanation = f"ราคารวม {money(total)} บาท; เงินทอน {money(paid)} − {money(total)} = {correct} บาท"
        rows.append((prompt, hint, explanation, "", options(correct, [money(paid - total + 100), money(abs(total - 100)), money(total)])))
    return rows


def treasure_questions(level_index):
    rows = []
    for i in range(10):
        left_cents = 135 + i * 27 + level_index * 41
        right_cents = 75 + (i % 5) * 36
        add = (i + level_index) % 2 == 0
        high, low = max(left_cents, right_cents), min(left_cents, right_cents)
        answer_cents = high + low if add else high - low
        op = "+" if add else "−"
        correct = money(answer_cents)
        prompt = f"กุญแจ{('บวก' if add else 'ลบ')}: {money(high)} {op} {money(low)} = ? บาท"
        hint = "จัดตำแหน่งจุดทศนิยมให้ตรงกันก่อนคำนวณ"
        explanation = f"{money(high)} {op} {money(low)} = {correct} บาท"
        rows.append((prompt, hint, explanation, "", options(correct, [money(answer_cents + 10), money(max(0, answer_cents - 10)), money(answer_cents + 100)])))
    return rows


def data_questions(level_index):
    rows = []
    labels = ["แมว", "สุนัข", "กระต่าย", "นก"]
    for i in range(10):
        values = [base + ((i * (j + 2) + level_index * (j + 1)) % 8) for j, base in enumerate([3, 5, 7, 9])]
        payload = json.dumps({"labels": labels, "values": values}, ensure_ascii=False)
        mode = i % 3
        if mode == 0:
            index = values.index(max(values))
            correct, prompt = labels[index], "สัตว์ชนิดใดได้รับคะแนนโหวตมากที่สุด?"
            wrong = [label for label in labels if label != correct]
            hint, explanation = "เปรียบเทียบจำนวนในแต่ละแถว", f"{correct} มี {max(values)} คะแนน มากที่สุด"
        elif mode == 1:
            total = sum(values)
            correct, prompt = f"{total} คะแนน", "มีคะแนนโหวตรวมทั้งหมดเท่าไร?"
            wrong = [f"{total + 1} คะแนน", f"{max(0,total - 1)} คะแนน", "10 คะแนน"]
            hint, explanation = "บวกจำนวนคะแนนของทุกแถว", f"{' + '.join(map(str, values))} = {total} คะแนน"
        else:
            difference = max(values) - min(values)
            correct, prompt = f"{difference} คะแนน", "จำนวนคะแนนสูงสุดมากกว่าต่ำสุดกี่คะแนน?"
            wrong = [f"{difference + 1} คะแนน", f"{max(0,difference - 1)} คะแนน", "10 คะแนน"]
            hint, explanation = "นำค่ามากที่สุดลบค่าที่น้อยที่สุด", f"{max(values)} − {min(values)} = {difference} คะแนน"
        rows.append((prompt, hint, explanation, payload, options(correct, wrong)))
    return rows


def chart_questions(level_index):
    rows = []
    labels = ["จันทร์", "อังคาร", "พุธ", "พฤหัส"]
    for i in range(10):
        values = [2 + ((i * (j + 1) + level_index * 3 + j * 2) % 9) for j in range(4)]
        payload = json.dumps({"labels": labels, "values": values}, ensure_ascii=False)
        rows.append(("สร้างกราฟแท่งจากข้อมูลในตาราง กรอกจำนวนให้ตรงกับแต่ละวัน", "ความสูงของแท่งกราฟแต่ละแท่งต้องตรงกับจำนวนในตาราง", "ตรวจค่าของแต่ละวันให้ตรงกับข้อมูลก่อนส่งคำตอบ", payload,
                     options("กราฟถูกต้อง", ["ลองตรวจข้อมูลอีกครั้ง", "ดูจำนวนแต่ละวัน", "ตรวจแท่งกราฟ"])))
    return rows


GENERATORS = [fraction_questions, pizza_questions, decimal_shop_questions, treasure_questions, data_questions, chart_questions]


def load_env(path):
    result = {}
    with open(path, encoding="utf-8") as stream:
        for line in stream:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                result[key.strip()] = value.strip().strip('"').strip("'")
    return result


def main():
    env = load_env(os.path.join(os.getcwd(), ".env"))
    conn = psycopg2.connect(host=env.get("DB_HOST", "localhost"), port=env.get("DB_PORT", "5432"),
                            dbname=env.get("DB_NAME", "postgres"), user=env.get("DB_USER", "postgres"),
                            password=env.get("DB_PASS", ""), sslmode="prefer")
    seeded = 0
    try:
        with conn:
            with conn.cursor() as cur:
                for old_id in range(1, 7):
                    cur.execute("UPDATE games SET is_active=FALSE WHERE game_id=%s AND subject_id=1 AND game_code IS NULL", (old_id,))
                for game_index, (code, name, icon, seconds, lesson, summary, body) in enumerate(GAMES):
                    cur.execute("SELECT game_id FROM games WHERE game_code=%s", (code,))
                    row = cur.fetchone()
                    if not row:
                        raise RuntimeError(f"Run api/kidlearn_patch_math_grade5.sql first; missing {code}")
                    game_id = row[0]
                    cur.execute("UPDATE games SET subject_id=1, is_active=TRUE, name=%s, game_type='mcq', level='medium', icon=%s, time_limit=%s, question_count=NULL WHERE game_id=%s",
                                (name, icon, seconds, game_id))
                    cur.execute("DELETE FROM answers WHERE question_id IN (SELECT question_id FROM questions WHERE game_id=%s)", (game_id,))
                    cur.execute("DELETE FROM questions WHERE game_id=%s", (game_id,))
                    cur.execute("INSERT INTO lesson_content (game_id,lesson_no,title,summary,body,read_time,status,version_no,published_at,updated_at) VALUES (%s,1,%s,%s,%s,5,'published',1,NOW(),NOW()) ON CONFLICT (game_id,lesson_no) DO UPDATE SET title=EXCLUDED.title,summary=EXCLUDED.summary,body=EXCLUDED.body,status='published',version_no=lesson_content.version_no+1,published_at=NOW(),updated_at=NOW()",
                                (game_id, lesson, summary, body))
                    order_no = 1
                    for level_index, level in enumerate(LEVELS):
                        level_arg = level if game_index == 0 else level_index
                        for question, hint, explanation, image_data, answer_rows in GENERATORS[game_index](level_arg):
                            cur.execute("INSERT INTO questions (game_id,question_text,question_img,hint,question_type,difficulty,explanation,order_no,point) VALUES (%s,%s,%s,%s,'text',%s,%s,%s,10) RETURNING question_id",
                                        (game_id, question, image_data or None, hint, level, explanation, order_no))
                            question_id = cur.fetchone()[0]
                            for seq, (answer, correct) in enumerate(answer_rows, 1):
                                cur.execute("INSERT INTO answers (question_id,answer_text,is_correct,seq_order) VALUES (%s,%s,%s,%s)",
                                            (question_id, answer, correct, seq))
                            order_no += 1
                    seeded += 1
        print(f"Seeded {seeded} replacement games with 30 questions each.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
