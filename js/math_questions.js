// Question bank used when the API is unavailable. The PostgreSQL seed script
// contains the same six game codes and stores the full bank in the question tables.
(() => {
  const gcd = (a, b) => b ? gcd(b, a % b) : a;
  const fraction = (n, d) => {
    const g = gcd(Math.abs(n), d);
    return `${n / g}/${d / g}`;
  };
  const cents = value => (value / 100).toFixed(2);
  const shuffled = values => values.map(value => [Math.random(), value]).sort((a, b) => a[0] - b[0]).map(row => row[1]);
  const makeQuestion = (q, correct, wrong, difficulty, hint, explanation, img = '') => {
    const candidates = [...new Set([String(correct), ...wrong.map(String)])];
    while (candidates.length < 4) {
      const fractionMatch=String(correct).match(/^(-?\d+)\/(\d+)$/);
      const numericMatch=String(correct).match(/^(-?\d+(?:\.\d+)?)(.*)$/);
      const fallback=fractionMatch
        ? `${Number(fractionMatch[1])+candidates.length}/${fractionMatch[2]}`
        : numericMatch
          ? `${Number(numericMatch[1])+candidates.length}${numericMatch[2]}`
          : `ตัวเลือกอื่น ${candidates.length+1}`;
      if (!candidates.includes(fallback)) candidates.push(fallback);
    }
    const answers = shuffled(candidates).slice(0, 4);
    return { q, opts: answers, ans: answers.indexOf(String(correct)), difficulty, hint, explanation, img };
  };
  const bank = {};
  const levels = ['easy', 'medium', 'hard'];

  const fractionRows = [];
  levels.forEach((difficulty, levelIndex) => {
    for (let i = 0; i < 10; i++) {
      const a = i + 1;
      if (levelIndex === 0) {
        const d = 5 + (i % 6), left = (i % (d - 1)) + 1, right = Math.min(d - 1, left + 1);
        const correct = left >= right ? `${left}/${d}` : `${right}/${d}`;
        const wrong = [`${Math.max(1, left - 1)}/${d}`, `${Math.max(1, right - 1)}/${d}`, `${d - 1}/${d}`];
        fractionRows.push(makeQuestion(`เศษส่วนใดมีค่ามากกว่า: ${left}/${d} หรือ ${right}/${d}?`, correct, wrong, difficulty, 'เมื่อตัวส่วนเท่ากัน ให้เปรียบเทียบตัวเศษ', 'ตัวส่วนเท่ากัน เศษส่วนที่มีตัวเศษมากกว่าจะมีค่ามากกว่า'));
      } else if (levelIndex === 1) {
        const d = 4 + (i % 7), left = 1 + (i % (d - 2)), right = 1 + ((i + 2) % (d - 1));
        const n = left + right, correct = fraction(n, d);
        const wrong = [fraction(n + 1, d), fraction(Math.max(1, n - 1), d), fraction(n, d + 1)];
        fractionRows.push(makeQuestion(`${left}/${d} + ${right}/${d} = เท่าไร?`, correct, wrong, difficulty, 'บวกตัวเศษและคงตัวส่วนเดิม', `(${left}+${right})/${d} = ${n}/${d} แล้วตัดทอนถ้าทำได้`));
      } else {
        const d1 = 3 + (i % 5), d2 = d1 + 2, n1 = 1 + (i % (d1 - 1)), n2 = 1 + ((i * 2) % (d2 - 1));
        const numerator = n1 * d2 + n2 * d1, denominator = d1 * d2, correct = fraction(numerator, denominator);
        const wrong = [fraction(numerator + 1, denominator), fraction(Math.max(1, numerator - d1), denominator), fraction(n1 + n2, d1 + d2)];
        fractionRows.push(makeQuestion(`${n1}/${d1} + ${n2}/${d2} = เท่าไร?`, correct, wrong, difficulty, `หา ค.ร.น. ของ ${d1} และ ${d2} ก่อน`, `ทำส่วนให้เท่ากัน: ${n1}/${d1}=${n1 * d2}/${denominator} และ ${n2}/${d2}=${n2 * d1}/${denominator}`));
      }
    }
  });
  bank.math_fraction_quest = fractionRows;

  bank.math_pizza_chef = levels.flatMap((difficulty, levelIndex) => Array.from({ length: 10 }, (_, i) => {
    const denominator = 4 + levelIndex * 3 + (i % 3), numerator = 1 + ((i * 2 + levelIndex) % (denominator - 1));
    const choices = shuffled([numerator, Math.max(1, numerator - 1), Math.min(denominator, numerator + 1), denominator - numerator]);
    return {
      q: `พิซซ่าถูกแบ่งเป็น ${denominator} ชิ้นเท่ากัน ต้องเลือกกี่ชิ้นจึงจะได้ ${numerator}/${denominator} ถาด?`,
      opts: choices.map(String), ans: choices.indexOf(numerator), difficulty,
      hint: `ตัวส่วน ${denominator} บอกจำนวนชิ้นทั้งหมด ส่วนตัวเศษ ${numerator} บอกจำนวนชิ้นที่เลือก`,
      explanation: `เลือก ${numerator} จาก ${denominator} ชิ้น จึงได้ ${numerator}/${denominator} ถาด`,
      img: JSON.stringify({ numerator, denominator })
    };
  }));

  bank.math_decimal_shop = levels.flatMap((difficulty, levelIndex) => Array.from({ length: 10 }, (_, i) => {
    const count = levelIndex + 1, prices = Array.from({ length: count }, (_, j) => 125 + ((i * 37 + j * 83) % 875));
    const total = prices.reduce((sum, price) => sum + price, 0), paid = Math.ceil(total / 500) * 500 + (i % 2 ? 0 : 500);
    const products = prices.map((price, j) => `${['นม', 'ขนมปัง', 'น้ำผลไม้'][j]} ${cents(price)} บาท`).join(' + ');
    const correct = cents(paid - total), wrong = [cents(paid - total + 100), cents(Math.abs(total - 100)), cents(total)];
    return makeQuestion(`ซื้อ ${products} จ่าย ${cents(paid)} บาท จะได้เงินทอนเท่าไร?`, correct, wrong, difficulty, 'รวมราคาสินค้าก่อน แล้วนำเงินที่จ่ายลบด้วยราคารวม', `ราคารวม ${cents(total)} บาท; เงินทอน ${cents(paid)} − ${cents(total)} = ${correct} บาท`);
  }));

  bank.math_decimal_treasure = levels.flatMap((difficulty, levelIndex) => Array.from({ length: 10 }, (_, i) => {
    const x = 135 + i * 27 + levelIndex * 41, y = 75 + (i % 5) * 36;
    const add = (i + levelIndex) % 2 === 0, answer = add ? x + y : Math.abs(x - y);
    const left = cents(Math.max(x, y)), right = cents(Math.min(x, y));
    const correct = cents(answer), wrong = [cents(answer + 10), cents(Math.max(0, answer - 10)), cents(answer + 100)];
    return makeQuestion(`${add ? 'กุญแจบวก' : 'กุญแจลบ'}: ${left} ${add ? '+' : '−'} ${right} = ? บาท`, correct, wrong, difficulty, 'จัดตำแหน่งจุดทศนิยมให้ตรงกันก่อนคำนวณ', `${left} ${add ? '+' : '−'} ${right} = ${correct} บาท`);
  }));

  const dataRows = [];
  levels.forEach((difficulty, levelIndex) => {
    for (let i = 0; i < 10; i++) {
      const values = [3, 5, 7, 9].map((base, j) => base + ((i * (j + 2) + levelIndex * (j + 1)) % 8));
      const labels = ['แมว', 'สุนัข', 'กระต่าย', 'นก'];
      const mode = i % 3;
      let prompt, correct, hint, explanation;
      if (mode === 0) {
        const max = Math.max(...values), index = values.indexOf(max);
        prompt = 'สัตว์ชนิดใดได้รับคะแนนโหวตมากที่สุด?'; correct = labels[index]; hint = 'เปรียบเทียบจำนวนในแต่ละแถว'; explanation = `${labels[index]} มี ${max} คะแนน มากที่สุด`;
      } else if (mode === 1) {
        const total = values.reduce((sum, value) => sum + value, 0);
        prompt = 'มีคะแนนโหวตรวมทั้งหมดเท่าไร?'; correct = `${total} คะแนน`; hint = 'บวกจำนวนคะแนนของทุกแถว'; explanation = `${values.join(' + ')} = ${total} คะแนน`;
      } else {
        const high = Math.max(...values), low = Math.min(...values);
        prompt = 'จำนวนคะแนนสูงสุดมากกว่าต่ำสุดกี่คะแนน?'; correct = `${high - low} คะแนน`; hint = 'นำค่ามากที่สุดลบค่าที่น้อยที่สุด'; explanation = `${high} − ${low} = ${high - low} คะแนน`;
      }
      dataRows.push(makeQuestion(prompt, correct, mode === 0 ? labels.filter(label => label !== correct).slice(0, 3) : [`${Number.parseInt(correct, 10) + 1} คะแนน`, `${Math.max(0, Number.parseInt(correct, 10) - 1)} คะแนน`, '10 คะแนน'], difficulty, hint, explanation, JSON.stringify({ labels, values })));
    }
  });
  bank.math_data_detective = dataRows;

  bank.math_chart_builder = levels.flatMap((difficulty, levelIndex) => Array.from({ length: 10 }, (_, i) => {
    const labels = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัส'];
    const values = labels.map((_, j) => 2 + ((i * (j + 1) + levelIndex * 3 + j * 2) % 9));
    return makeQuestion('สร้างกราฟแท่งจากข้อมูลในตาราง กรอกจำนวนให้ตรงกับแต่ละวัน', 'กราฟถูกต้อง', ['ลองตรวจข้อมูลอีกครั้ง', 'ดูจำนวนแต่ละวัน', 'ตรวจแท่งกราฟ'], difficulty,
      'ความสูงของแท่งกราฟแต่ละแท่งต้องตรงกับจำนวนในตาราง', 'ตรวจค่าของแต่ละวันให้ตรงกับข้อมูลก่อนส่งคำตอบ', JSON.stringify({ labels, values }));
  }));

  window.GRADE5_MATH_QUESTIONS = bank;
  Object.values(GAMES_DB).filter(game => game.code).forEach(game => {
    game.qs = bank[game.code] || [];
  });
})();
