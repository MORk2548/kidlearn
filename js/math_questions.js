// Grade-5 math missions. Every mission is generated from constraints and every
// answer is computed from the generated data, so a mission is always solvable.
(() => {
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
  const lcm = (a, b) => a / gcd(a, b) * b;
  const rnd = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  const pick = list => list[Math.floor(Math.random() * list.length)];
  const shuffle = list => {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  const sample = (list, count) => shuffle(list).slice(0, count);
  const sum = list => list.reduce((total, value) => total + value, 0);
  const retry = (make, label) => {
    for (let i = 0; i < 2000; i++) {
      const result = make();
      if (result) return result;
    }
    throw new Error(`cannot generate ${label}`);
  };

  // Fractions are {n, d} in lowest terms with d > 0.
  const fr = (n, d = 1) => {
    if (d < 0) { n = -n; d = -d; }
    const g = gcd(n, d);
    return { n: n / g, d: d / g };
  };
  const fAdd = (a, b) => fr(a.n * b.d + b.n * a.d, a.d * b.d);
  const fSub = (a, b) => fr(a.n * b.d - b.n * a.d, a.d * b.d);
  const fTimes = (a, k) => fr(a.n * k, a.d);
  const fCmp = (a, b) => a.n * b.d - b.n * a.d;
  const fSum = list => list.reduce(fAdd, fr(0));
  const fAbs = f => fr(Math.abs(f.n), f.d);
  const fCeil = f => Math.ceil(f.n / f.d);
  const fText = f => {
    if (f.d === 1) return String(f.n);
    const whole = Math.trunc(f.n / f.d), rest = Math.abs(f.n % f.d);
    return whole ? `${whole} ${rest}/${f.d}` : `${f.n}/${f.d}`;
  };
  const fOver = (f, den) => `${f.n * den / f.d}/${den}`;
  const lcdOf = fracs => fracs.reduce((acc, f) => lcm(acc, f.d), 1);
  const parseFraction = text => {
    const t = String(text ?? '').trim().replace(/\s+/g, ' ');
    let m = t.match(/^(-?\d+)$/);
    if (m) return fr(Number(m[1]));
    m = t.match(/^(-?\d+) ?\/ ?(\d+)$/);
    if (m && Number(m[2]) > 0) return fr(Number(m[1]), Number(m[2]));
    m = t.match(/^(\d+) (\d+) ?\/ ?(\d+)$/);
    if (m && Number(m[3]) > 0) return fr(Number(m[1]) * Number(m[3]) + Number(m[2]), Number(m[3]));
    return null;
  };

  // Decimals are integers in units of 10^-places, so arithmetic stays exact.
  const fixedText = (units, places) => {
    const scale = 10 ** places, sign = units < 0 ? '-' : '';
    const abs = Math.abs(units);
    return `${sign}${Math.floor(abs / scale)}.${String(abs % scale).padStart(places, '0')}`;
  };
  const decText = (units, places) => fixedText(units, places).replace(/\.?0+$/, '');
  const baht = satang => fixedText(satang, 2);
  const parseFixed = (text, places) => {
    const m = String(text ?? '').trim().replace(/,/g, '').match(/^(\d+)(?:\.(\d*))?$/);
    if (!m || (m[2] || '').length > places) return null;
    return Number(m[1]) * 10 ** places + Number((m[2] || '').padEnd(places, '0') || 0);
  };

  const step = (kind, prompt, extra) => ({ kind, prompt, skill: 'calculation', points: 10, hints: [], solution: [], ...extra });
  const numberStep = (prompt, answer, extra) => step('number', prompt, { answer, ...extra });
  const fractionStep = (prompt, answer, extra) => step('fraction', prompt, { answer, ...extra });
  const fixedStep = (prompt, answer, places, extra) => step('fixed', prompt, { answer, places, ...extra });
  const moneyStep = (prompt, answer, extra) => fixedStep(prompt, answer, 2, { unit: 'บาท', money: true, ...extra });
  const choiceStep = (prompt, options, extra = {}) => {
    const ordered = extra.keepOrder ? options : shuffle(options);
    return step('choice', prompt, { skill: 'analysis', options: ordered, answer: ordered.findIndex(option => option.ok), ...extra });
  };
  const table = (title, head, rows) => ({ type: 'table', title, head, rows });
  const note = text => ({ type: 'note', text });
  const NAMES = ['ต้นกล้า', 'ใบเฟิร์น', 'ภูผา', 'น้ำใส', 'ขิง', 'มะปราง', 'ก้อง', 'พลอย', 'ธาม', 'แพรว', 'ข้าวหอม', 'นที'];

  // ── Pizza ─────────────────────────────────────────────
  const CUTS = [2, 4, 8, 12, 16];
  const PIZZA_MAX_ORDERS = 5;
  const bestCut = fracs => CUTS.find(cut => fracs.every(f => cut % f.d === 0));
  const divisorsOf = cut => [2, 3, 4, 6, 8, 12, 16].filter(d => d <= cut && cut % d === 0);
  const properFraction = d => { let n; do n = rnd(1, d - 1); while (gcd(n, d) !== 1); return fr(n, d); };
  const makeFracs = (count, cut, minKinds) => retry(() => {
    const fracs = Array.from({ length: count }, () => properFraction(pick(divisorsOf(cut))));
    if (new Set(fracs.map(fText)).size !== count) return null;
    if (new Set(fracs.map(f => f.d)).size < minKinds) return null;
    return fracs;
  }, 'pizza orders');
  const makeOrders = fracs => sample(NAMES, fracs.length).map((name, i) => ({ name, f: fracs[i] }));
  const slicesOf = (f, cut) => f.n * cut / f.d;
  const orderTable = (orders, rules = {}) => table('🧾 ออเดอร์ของลูกค้า', ['ลูกค้า', 'สั่ง', 'เงื่อนไข'],
    orders.map((o, i) => [o.name, `${fText(o.f)} ถาด`, rules[i] || '-']));
  const totalLines = (fracs, lcd) => [
    `ทำตัวส่วนให้เท่ากันเป็น ${lcd}: ${fracs.map(f => `${fText(f)} = ${fOver(f, lcd)}`).join(', ')}`,
    `บวกตัวเศษ: ${fracs.map(f => f.n * lcd / f.d).join(' + ')} = ${sum(fracs.map(f => f.n * lcd / f.d))} จึงได้ ${sum(fracs.map(f => f.n * lcd / f.d))}/${lcd} = ${fText(fSum(fracs))} ถาด`
  ];
  const totalStep = (fracs, extra = {}) => {
    const lcd = lcdOf(fracs), total = fSum(fracs);
    const naive = fr(sum(fracs.map(f => f.n)), sum(fracs.map(f => f.d)));
    return fractionStep('ลูกค้าทุกคนสั่งพิซซ่ารวมกันกี่ถาด', total, {
      skill: 'analysis', unit: 'ถาด',
      hints: [`ตัวส่วนไม่เท่ากัน ต้องหาเศษส่วนที่เท่ากันซึ่งมีตัวส่วนเป็น ${lcd} ก่อน`, `แปลงทีละออเดอร์ เช่น ${fText(fracs[0])} = ${fOver(fracs[0], lcd)} แล้วบวกเฉพาะตัวเศษ`],
      solution: totalLines(fracs, lcd),
      mistakes: [{ value: naive, why: 'ห้ามบวกตัวส่วนเข้าด้วยกัน ต้องทำตัวส่วนให้เท่ากันก่อน แล้วบวกเฉพาะตัวเศษ' }],
      ...extra
    });
  };
  const cutStep = (fracs, prompt) => {
    const cut = bestCut(fracs);
    const options = CUTS.map(c => {
      const bad = fracs.find(f => c % f.d !== 0);
      return {
        text: `ตัดถาดละ ${c} ชิ้น (ชิ้นละ 1/${c} ถาด)`, value: c, ok: c === cut,
        why: bad ? `${c} หารด้วย ${bad.d} ไม่ลงตัว จึงแบ่ง ${fText(bad)} ถาดให้พอดีไม่ได้`
          : `แบ่งได้พอดี แต่ชิ้นเล็กเกินจำเป็น 1 ชิ้นแบบ ${cut} ชิ้นเท่ากับ ${c / cut} ชิ้นแบบนี้ ต้องหั่นและหยิบหลายชิ้นขึ้น`
      };
    });
    return choiceStep(prompt || 'ควรตัดพิซซ่าถาดละกี่ชิ้น จึงแบ่งได้พอดีทุกออเดอร์และชิ้นใหญ่ที่สุด', options, {
      keepOrder: true, skill: 'planning', store: 'cut',
      hints: ['จำนวนชิ้นต่อถาดต้องหารด้วยตัวส่วนของทุกออเดอร์ได้ลงตัว', `ตัวส่วนของออเดอร์คือ ${[...new Set(fracs.map(f => f.d))].join(', ')} หาจำนวนที่น้อยที่สุดในตัวเลือกที่ทุกตัวหารลงตัว`],
      solution: [`ตัวส่วนของออเดอร์: ${[...new Set(fracs.map(f => f.d))].join(', ')}`, `${cut} เป็นจำนวนชิ้นที่น้อยที่สุดในตัวเลือกที่ทุกตัวส่วนหารลงตัว จึงได้ชิ้นใหญ่ที่สุด`]
    });
  };
  const pizzaStep = ({ orders, trays, together = null, own = null, minTrays = null }) => {
    const cut = bestCut(orders.map(o => o.f));
    const slices = orders.map(o => slicesOf(o.f, cut));
    const used = minTrays || trays;
    const lines = [`ตัดถาดละ ${cut} ชิ้น 1 ชิ้น = 1/${cut} ถาด`,
      ...orders.map((o, i) => `${o.name}: ${fText(o.f)} = ${slices[i]}/${cut} ถาด จึงได้ ${slices[i]} ชิ้น`),
      `รวม ${sum(slices)} ชิ้น จาก ${used * cut} ชิ้นใน ${used} ถาด เหลือ ${used * cut - sum(slices)} ชิ้น`];
    if (together) lines.push(`${orders[together[0]].name} กับ ${orders[together[1]].name} ใช้ ${slices[together[0]] + slices[together[1]]} ชิ้น ไม่เกิน ${cut} ชิ้น จึงวางในถาดเดียวกันได้`);
    if (own) lines.push(`${orders[own].name} ได้ถาดของตัวเอง 1 ถาด ส่วนที่เหลือในถาดนั้นห้ามให้คนอื่น`);
    return step('pizza', minTrays
      ? `จัดชิ้นพิซซ่าให้ครบทุกออเดอร์ ตามเงื่อนไข โดยใช้ถาดน้อยที่สุด (มีให้ใช้ ${trays} ถาด)`
      : `จัดชิ้นพิซซ่าให้ลูกค้าแต่ละคนตรงตามออเดอร์ (มี ${trays} ถาด)`, {
      skill: 'final', points: 20, orders, trays, defaultCut: cut, together, own, minTrays,
      hints: ['เลือกชื่อลูกค้าก่อน แล้วแตะชิ้นพิซซ่าเพื่อมอบให้ แตะซ้ำเพื่อยกเลิก', `แปลงออเดอร์เป็นจำนวนชิ้น เช่น ${fText(orders[0].f)} ถาด = ${slices[0]}/${cut} ถาด คือ ${slices[0]} ชิ้น`],
      solution: lines
    });
  };
  const minTraysFor = (orders, together, own) => {
    const cut = bestCut(orders.map(o => o.f));
    const slices = orders.map(o => slicesOf(o.f, cut));
    const ownCount = own === null ? 0 : 1;
    const groupSlices = together ? slices[together[0]] + slices[together[1]] : 0;
    const free = sum(slices.filter((_, i) => i !== own && !(together || []).includes(i)));
    const spare = together ? cut - groupSlices : 0;
    return ownCount + (together ? 1 : 0) + Math.ceil(Math.max(0, free - spare) / cut);
  };

  function pizzaSupply(level) {
    const count = { easy: 2, medium: 3, hard: 4, challenge: 5 }[level];
    const cut0 = level === 'easy' ? 8 : pick([8, 12, 16]);
    return retry(() => {
      const fracs = makeFracs(count, cut0, level === 'easy' ? 1 : 2);
      const cut = bestCut(fracs);
      if (level === 'easy' && fracs.every(f => f.d === cut)) return null;
      const total = fSum(fracs);
      const short = level !== 'easy' && Math.random() < 0.55;
      const trays = short ? fCeil(total) - 1 : fCeil(total);
      if (trays < 1) return null;
      const orders = makeOrders(fracs), diff = fSub(fr(trays), total), lcd = lcdOf(fracs);
      const verdict = diff.n > 0 ? 'left' : diff.n === 0 ? 'exact' : 'short';
      const compare = `${trays} ถาด = ${trays * lcd}/${lcd} ส่วนออเดอร์รวม = ${total.n * lcd / total.d}/${lcd}`;
      const steps = [];
      if (level === 'easy') {
        const o = orders.find(x => x.f.d !== cut);
        steps.push(numberStep(`ถ้าตัดพิซซ่าถาดละ ${cut} ชิ้น ออเดอร์ของ${o.name} ${fText(o.f)} ถาด เท่ากับกี่ชิ้น`, slicesOf(o.f, cut), {
          unit: 'ชิ้น', skill: 'calculation',
          hints: [`หาเศษส่วนที่เท่ากับ ${fText(o.f)} และมีตัวส่วนเป็น ${cut}`, `${o.f.d} × ${cut / o.f.d} = ${cut} ตัวเศษจึงต้องคูณ ${cut / o.f.d} ด้วย`],
          solution: [`${fText(o.f)} = ${o.f.n}×${cut / o.f.d} / ${o.f.d}×${cut / o.f.d} = ${fOver(o.f, cut)}`, `จึงต้องใช้ ${slicesOf(o.f, cut)} ชิ้น`],
          mistakes: [{ value: o.f.n, why: `${o.f.n} คือจำนวนชิ้นเมื่อตัดถาดละ ${o.f.d} ชิ้น ต้องแปลงเป็นชิ้นขนาด 1/${cut} ก่อน` }]
        }));
      }
      steps.push(totalStep(fracs));
      steps.push(choiceStep(`เชฟมีพิซซ่า ${trays} ถาด เพียงพอสำหรับทุกออเดอร์หรือไม่`, [
        { text: 'พอ และยังมีพิซซ่าเหลือ', ok: verdict === 'left', why: `ยังไม่ใช่ ลองเทียบ: ${compare}` },
        { text: 'พอดี ไม่เหลือเลย', ok: verdict === 'exact', why: `ยังไม่ใช่ ลองเทียบ: ${compare}` },
        { text: 'ไม่พอ ต้องอบเพิ่ม', ok: verdict === 'short', why: `ยังไม่ใช่ ลองเทียบ: ${compare}` }
      ], { keepOrder: true, hints: [`เขียน ${trays} ถาดเป็นเศษส่วนที่มีตัวส่วนเดียวกับผลรวม`], solution: [compare] }));
      if (verdict === 'left') {
        steps.push(fractionStep('หลังส่งทุกออเดอร์ จะเหลือพิซซ่ากี่ถาด', diff, {
          unit: 'ถาด', hints: [`นำ ${trays} ลบด้วย ${fText(total)}`, `${trays} = ${trays * total.d}/${total.d}`],
          solution: [`${trays} − ${fText(total)} = ${trays * total.d}/${total.d} − ${total.n}/${total.d} = ${fText(diff)} ถาด`]
        }));
      } else if (verdict === 'short') {
        const lack = fAbs(diff), extraTrays = fCeil(lack);
        steps.push(fractionStep('พิซซ่าขาดอยู่กี่ถาด', lack, {
          unit: 'ถาด', hints: [`นำผลรวมออเดอร์ ${fText(total)} ลบด้วย ${trays}`, `${trays} = ${trays * total.d}/${total.d}`],
          solution: [`${fText(total)} − ${trays} = ${total.n}/${total.d} − ${trays * total.d}/${total.d} = ${fText(lack)} ถาด`]
        }));
        steps.push(numberStep('เชฟต้องอบพิซซ่าเพิ่มอย่างน้อยกี่ถาด (นับเป็นถาดเต็ม)', extraTrays, {
          unit: 'ถาด', skill: 'planning', hints: ['ร้านอบได้ทีละถาดเต็ม ถ้าขาดไม่ถึง 1 ถาดก็ต้องอบ 1 ถาด'],
          solution: [`ขาด ${fText(lack)} ถาด ต้องปัดขึ้นเป็นถาดเต็ม จึงอบเพิ่ม ${extraTrays} ถาด`]
        }));
      }
      steps.push(cutStep(fracs));
      const allTrays = trays + (verdict === 'short' ? fCeil(fAbs(diff)) : 0);
      steps.push(pizzaStep({ orders, trays: allTrays }));
      return {
        title: verdict === 'short' ? 'ออเดอร์ล้นร้าน!' : 'คืนวันศุกร์ที่ร้านพิซซ่า',
        icon: '🍕',
        story: [`ร้านได้รับออเดอร์ ${count} รายการ เชฟมีพิซซ่าอยู่ ${trays} ถาด`, 'คำนวณก่อนว่าพิซซ่าพอหรือไม่ แล้ววางแผนตัดและจัดชิ้นให้ตรงทุกออเดอร์'],
        tip: level === 'easy' ? `เศษส่วนที่เท่ากัน: คูณตัวเศษและตัวส่วนด้วยจำนวนเดียวกัน เช่น 1/2 = 2/4 = 4/8` : '',
        context: [orderTable(orders)],
        steps
      };
    }, 'pizza supply');
  }

  function pizzaCompare(level) {
    const count = { easy: 2, medium: 3, hard: 4, challenge: 4 }[level];
    return retry(() => {
      const fracs = makeFracs(count, level === 'easy' ? 8 : pick([8, 12, 16]), 2);
      const total = fSum(fracs);
      const orders = makeOrders(fracs);
      const sorted = [...orders].sort((a, b) => fCmp(b.f, a.f));
      const most = sorted[0], least = sorted[sorted.length - 1];
      const lcd = lcdOf(fracs), diff = fSub(most.f, least.f);
      const trays = fCeil(total) + (level === 'easy' ? 0 : 1);
      const minTrays = level === 'easy' ? null : fCeil(total);
      const steps = [
        choiceStep('ลูกค้าคนใดสั่งพิซซ่ามากที่สุด', orders.map(o => ({
          text: `${o.name} (${fText(o.f)} ถาด)`, ok: o === most,
          why: `${o.name} สั่ง ${fOver(o.f, lcd)} ถาด แต่${most.name}สั่ง ${fOver(most.f, lcd)} ถาด`
        })), { hints: [`ทำตัวส่วนให้เท่ากันเป็น ${lcd} แล้วเทียบตัวเศษ`], solution: orders.map(o => `${o.name}: ${fText(o.f)} = ${fOver(o.f, lcd)}`) }),
        fractionStep(`${most.name}สั่งมากกว่า${least.name}กี่ถาด`, diff, {
          unit: 'ถาด', hints: [`ลบเศษส่วน: ${fText(most.f)} − ${fText(least.f)}`, `ทำตัวส่วนให้เท่ากันก่อน: ${fOver(most.f, lcd)} − ${fOver(least.f, lcd)}`],
          solution: [`${fOver(most.f, lcd)} − ${fOver(least.f, lcd)} = ${fText(diff)} ถาด`],
          mistakes: [{ value: fr(Math.abs(most.f.n - least.f.n), Math.max(1, Math.abs(most.f.d - least.f.d))), why: 'ห้ามลบตัวส่วนกัน ทำตัวส่วนให้เท่ากันก่อนแล้วลบเฉพาะตัวเศษ' }]
        }),
        totalStep(fracs),
        cutStep(fracs),
        pizzaStep({ orders, trays, minTrays }),
        fractionStep(`ร้านมีพิซซ่า ${trays} ถาด หลังจัดออเดอร์ครบ จะเหลือกี่ถาด`, fSub(fr(trays), total), {
          unit: 'ถาด', skill: 'final', hints: [`${trays} − ${fText(total)}`],
          solution: [`${trays} − ${fText(total)} = ${fText(fSub(fr(trays), total))} ถาด`]
        })
      ];
      return {
        title: 'ใครหิวที่สุด?', icon: '🧑‍🍳',
        story: [`ลูกค้า ${count} คนสั่งพิซซ่าคนละไม่เท่ากัน ร้านมีพิซซ่า ${trays} ถาด`, minTrays ? 'เปรียบเทียบออเดอร์ แล้วจัดชิ้นโดยใช้ถาดให้น้อยที่สุด ถาดที่ไม่ได้แตะจะเก็บไว้ขายต่อได้' : 'เปรียบเทียบออเดอร์ แล้วจัดชิ้นให้ถูกต้อง'],
        tip: level === 'easy' ? 'เปรียบเทียบเศษส่วนที่ตัวส่วนต่างกัน ให้ทำตัวส่วนให้เท่ากันก่อน แล้วเทียบตัวเศษ' : '',
        context: [orderTable(orders)],
        steps
      };
    }, 'pizza compare');
  }

  function pizzaShare(level) {
    const count = level === 'easy' ? 2 : 3;
    return retry(() => {
      const fracs = makeFracs(count, level === 'easy' ? pick([4, 8]) : pick([8, 12]), 2);
      const total = fSum(fracs);
      if (fCmp(total, fr(1)) >= 0) return null;
      const orders = makeOrders(fracs), rest = fSub(fr(1), total), lcd = lcdOf(fracs);
      const big = [...orders].sort((a, b) => fCmp(b.f, a.f))[0];
      return {
        title: 'ถาดเดียวแบ่งทั้งโต๊ะ', icon: '🍽️',
        story: ['ครอบครัวหนึ่งสั่งพิซซ่าเพียง 1 ถาด แต่ละคนอยากได้ไม่เท่ากัน', 'ส่วนที่เหลือเชฟจะห่อให้กลับบ้าน ต้องรู้ว่าเหลือเท่าไร'],
        tip: level === 'easy' ? 'ทั้งถาดคือ 1 = 8/8 = 4/4 ใช้เศษส่วนที่เท่ากันช่วยคิด' : '',
        context: [orderTable(orders), note('ข้อมูลเพิ่มเติม: ถาดพิซซ่ามีเส้นผ่านศูนย์กลาง 12 นิ้ว และราคา 299 บาท')],
        steps: [
          choiceStep('ข้อมูลใดไม่จำเป็นต่อการหาว่าพิซซ่าเหลือเท่าไร', [
            { text: 'ขนาดและราคาของพิซซ่า', ok: true, why: '' },
            { text: 'ปริมาณที่แต่ละคนสั่ง', ok: false, why: 'ต้องใช้ปริมาณที่สั่งเพื่อหาผลรวม' },
            { text: 'จำนวนถาดที่สั่ง (1 ถาด)', ok: false, why: 'ต้องใช้ 1 ถาดเป็นปริมาณทั้งหมดเพื่อหาส่วนที่เหลือ' }
          ], { points: 5, solution: ['คำถามถามปริมาณที่เหลือ ใช้เพียงปริมาณทั้งหมด (1 ถาด) และปริมาณที่แต่ละคนสั่ง ขนาดและราคาไม่เกี่ยว'] }),
          choiceStep('ใครได้พิซซ่ามากที่สุด', orders.map(o => ({ text: o.name, ok: o === big, why: `${o.name} ได้ ${fOver(o.f, lcd)} ถาด น้อยกว่า${big.name}ที่ได้ ${fOver(big.f, lcd)} ถาด` })),
            { hints: [`แปลงทุกออเดอร์ให้มีตัวส่วน ${lcd}`], solution: orders.map(o => `${o.name}: ${fText(o.f)} = ${fOver(o.f, lcd)}`) }),
          totalStep(fracs),
          fractionStep('เหลือพิซซ่าห่อกลับบ้านกี่ถาด', rest, {
            unit: 'ถาด', skill: 'final', hints: ['ทั้งถาดคือ 1 นำ 1 ลบด้วยผลรวม', `1 = ${total.d}/${total.d}`],
            solution: [`1 − ${fText(total)} = ${total.d}/${total.d} − ${total.n}/${total.d} = ${fText(rest)} ถาด`]
          }),
          cutStep(fracs),
          pizzaStep({ orders, trays: 1 })
        ]
      };
    }, 'pizza share');
  }

  function pizzaRules(level) {
    const count = level === 'challenge' ? 5 : 4;
    return retry(() => {
      const fracs = makeFracs(count, pick([8, 12, 16]), 3);
      const orders = makeOrders(fracs);
      const pairs = [];
      for (let i = 0; i < count; i++) for (let j = i + 1; j < count; j++) if (fCmp(fAdd(fracs[i], fracs[j]), fr(1)) < 0) pairs.push([i, j]);
      if (!pairs.length) return null;
      const together = pick(pairs);
      const own = pick(orders.map((_, i) => i).filter(i => !together.includes(i)));
      const minTrays = minTraysFor(orders, together, own);
      const total = fSum(fracs);
      if (minTrays === fCeil(total)) return null;
      const cut = bestCut(fracs), slices = orders.map(o => slicesOf(o.f, cut));
      const groupSlices = slices[together[0]] + slices[together[1]];
      const free = sum(slices) - groupSlices - slices[own];
      const rules = { [together[0]]: `ต้องได้จากถาดเดียวกับ${orders[together[1]].name}`, [together[1]]: `ต้องได้จากถาดเดียวกับ${orders[together[0]].name}`, [own]: 'ขอถาดแยก ห้ามปนกับคนอื่น' };
      return {
        title: 'ออเดอร์มีเงื่อนไข', icon: '📋',
        story: [`มีลูกค้า ${count} คน บางคนมีเงื่อนไขพิเศษ ร้านมีพิซซ่า ${minTrays + 1} ถาด`, 'วางแผนให้ใช้ถาดน้อยที่สุดโดยทำตามเงื่อนไขทุกข้อ'],
        context: [orderTable(orders, rules)],
        steps: [
          totalStep(fracs),
          cutStep(fracs, 'เปรียบเทียบแผนการตัด: แผนใดแบ่งได้พอดีทุกออเดอร์และหั่นชิ้นน้อยที่สุด'),
          numberStep('ภายใต้เงื่อนไขทั้งหมด ต้องใช้พิซซ่าอย่างน้อยกี่ถาด', minTrays, {
            unit: 'ถาด', skill: 'planning', points: 15,
            hints: [`${orders[own].name}ใช้ 1 ถาดเต็ม คนอื่นใช้ส่วนที่เหลือไม่ได้`, `${orders[together[0]].name}กับ${orders[together[1]].name}อยู่ถาดเดียวกัน ที่ว่างในถาดนั้นให้คนอื่นใช้ได้`],
            solution: [`ตัดถาดละ ${cut} ชิ้น: ${orders.map((o, i) => `${o.name} ${slices[i]}`).join(', ')} ชิ้น`,
              `${orders[own].name} ใช้ถาดแยก 1 ถาด`,
              `${orders[together[0]].name}+${orders[together[1]].name} = ${groupSlices} ชิ้น อยู่ถาดเดียวกัน เหลือที่ว่าง ${cut - groupSlices} ชิ้น`,
              `คนอื่นรวม ${free} ชิ้น ใส่ในที่ว่าง ${cut - groupSlices} ชิ้นก่อน ส่วนที่เกินต้องใช้ถาดใหม่`,
              `รวมใช้อย่างน้อย ${minTrays} ถาด (ผลรวมทั้งหมด ${fText(total)} ถาด แต่เงื่อนไขทำให้ต้องใช้ถาดมากขึ้น)`],
            mistakes: [{ value: fCeil(total), why: `${fCeil(total)} ถาดพอเมื่อไม่มีเงื่อนไข แต่ถาดของ${orders[own].name}ใช้ร่วมกับคนอื่นไม่ได้` }]
          }),
          pizzaStep({ orders, trays: minTrays + 1, together, own, minTrays })
        ]
      };
    }, 'pizza rules');
  }

  function pizzaExact(level) {
    const count = 4;
    return retry(() => {
      const trays = pick([2, 3]), cut = pick([8, 12, 16]);
      const parts = Array.from({ length: count - 1 }, () => rnd(1, cut - 1));
      parts.push(trays * cut - sum(parts));
      if (parts[count - 1] < 1 || parts[count - 1] >= cut) return null;
      const fracs = parts.map(p => fr(p, cut));
      if (fracs.some(f => f.d === 1) || new Set(fracs.map(f => f.d)).size < 3 || new Set(fracs.map(fText)).size !== count) return null;
      const realCut = bestCut(fracs);
      const pairs = [];
      for (let i = 0; i < count; i++) for (let j = i + 1; j < count; j++) if (fCmp(fAdd(fracs[i], fracs[j]), fr(1)) <= 0) pairs.push([i, j]);
      if (!pairs.length) return null;
      const together = pick(pairs);
      const orders = makeOrders(fracs);
      const slices = fracs.map(f => slicesOf(f, realCut));
      const groupSlices = slices[together[0]] + slices[together[1]];
      const rules = { [together[0]]: `ต้องได้จากถาดเดียวกับ${orders[together[1]].name}`, [together[1]]: `ต้องได้จากถาดเดียวกับ${orders[together[0]].name}` };
      const [a, b] = together.map(i => orders[i].name);
      return {
        title: 'แป้งหมด! ห้ามขาดห้ามเกิน', icon: '🏆',
        story: [`วันนี้แป้งเหลือพอทำพิซซ่าได้แค่ ${trays} ถาดเท่านั้น`, 'ต้องจัดทุกออเดอร์ให้ครบ ห้ามขาดและห้ามเกิน และอธิบายได้ว่าทำไมแผนนี้ใช้ได้'],
        context: [orderTable(orders, rules)],
        steps: [
          totalStep(fracs),
          choiceStep(`พิซซ่า ${trays} ถาด เพียงพอหรือไม่`, [
            { text: 'พอดี ไม่ขาดไม่เกิน', ok: true, why: '' },
            { text: 'พอ และยังเหลือ', ok: false, why: `ออเดอร์รวม ${fText(fSum(fracs))} ถาด เท่ากับพิซซ่าที่มี จึงไม่เหลือ` },
            { text: 'ไม่พอ', ok: false, why: `ออเดอร์รวม ${fText(fSum(fracs))} ถาด ไม่มากกว่า ${trays} ถาด` }
          ], { keepOrder: true, solution: [`ออเดอร์รวม = ${fText(fSum(fracs))} ถาด = ${trays} ถาด พอดี`] }),
          cutStep(fracs),
          choiceStep('เหตุผลใดอธิบายได้ถูกต้องว่าแผนนี้จัดได้ครบโดยไม่ขาดไม่เกิน', [
            { text: `แปลงเป็นชิ้นละ 1/${realCut} ทุกออเดอร์รวมกันได้ ${trays * realCut} ชิ้น เท่ากับ ${trays} ถาดพอดี และ${a}กับ${b}ใช้ ${groupSlices} ชิ้น ไม่เกินถาดเดียว`, ok: true, why: '' },
            { text: `เพราะตัวเศษรวมกันได้ ${sum(fracs.map(f => f.n))} ซึ่งมากพอ`, ok: false, why: 'บวกตัวเศษที่ตัวส่วนต่างกันโดยตรงไม่ได้ ต้องทำตัวส่วนให้เท่ากันก่อน' },
            { text: `เพราะลูกค้าทุกคนสั่งไม่ถึง 1 ถาด จึงใช้ไม่เกิน ${trays} ถาดแน่นอน`, ok: false, why: `ลูกค้า ${count} คนที่สั่งคนละไม่ถึง 1 ถาด อาจรวมกันเกิน ${trays} ถาดได้ ต้องหาผลรวมจริง` },
            { text: `เพราะทุกตัวส่วนหาร ${realCut} ลงตัว`, ok: false, why: 'เป็นเพียงเหตุผลว่าตัดชิ้นได้พอดี ยังไม่ได้แสดงว่าปริมาณรวมพอดีและเงื่อนไขถาดเดียวกันทำได้' }
          ], { skill: 'planning', solution: [`ตัดถาดละ ${realCut} ชิ้น: ${orders.map((o, i) => `${o.name} ${slices[i]}`).join(' + ')} = ${sum(slices)} ชิ้น = ${trays} ถาด`, `${a}+${b} = ${groupSlices} ≤ ${realCut} ชิ้น วางถาดเดียวกันได้`] }),
          pizzaStep({ orders, trays, together })
        ]
      };
    }, 'pizza exact');
  }

  // ── Chart builder ─────────────────────────────────────
  const SCALE_LADDER = [1, 2, 5, 10, 20, 25, 50, 100, 200];
  const CHART_SCENARIOS = [
    { id: 'books', kind: 'compare', subject: 'จำนวนหนังสือที่แต่ละห้องอ่านในเดือนนี้', x: 'ห้องเรียน', y: 'จำนวนหนังสือ', unit: 'เล่ม', labels: ['ป.5/1', 'ป.5/2', 'ป.5/3', 'ป.5/4', 'ป.5/5', 'ป.5/6', 'ป.5/7', 'ป.5/8'], extra: 'จำนวนนักเรียน (คน)', extraRange: [24, 40] },
    { id: 'fruit', kind: 'compare', subject: 'ผลไม้ที่นักเรียนชั้น ป.5 ชอบ', x: 'ชนิดผลไม้', y: 'จำนวนนักเรียน', unit: 'คน', labels: ['มะม่วง', 'กล้วย', 'ส้ม', 'แตงโม', 'มังคุด', 'ทุเรียน', 'สับปะรด', 'ลำไย'], extra: 'ราคาต่อกิโลกรัม (บาท)', extraRange: [20, 150], shuffleLabels: true },
    { id: 'cans', kind: 'compare', subject: 'กระป๋องที่แต่ละห้องเก็บไปรีไซเคิล', x: 'ห้องเรียน', y: 'จำนวนกระป๋อง', unit: 'กระป๋อง', labels: ['ป.4/1', 'ป.4/2', 'ป.5/1', 'ป.5/2', 'ป.6/1', 'ป.6/2', 'ป.6/3', 'ป.6/4'], extra: 'จำนวนถุงที่ใช้ (ถุง)', extraRange: [3, 15] },
    { id: 'temp', kind: 'trend', subject: 'อุณหภูมิตอนเที่ยงในแต่ละวัน', x: 'วัน', y: 'อุณหภูมิ', unit: 'องศาเซลเซียส', labels: ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'], extra: 'ความชื้น (%)', extraRange: [40, 90], temp: true },
    { id: 'plant', kind: 'trend', subject: 'ความสูงของต้นถั่วในแต่ละสัปดาห์', x: 'สัปดาห์', y: 'ความสูง', unit: 'เซนติเมตร', labels: ['สัปดาห์ที่ 1', 'สัปดาห์ที่ 2', 'สัปดาห์ที่ 3', 'สัปดาห์ที่ 4', 'สัปดาห์ที่ 5', 'สัปดาห์ที่ 6', 'สัปดาห์ที่ 7', 'สัปดาห์ที่ 8'], extra: 'น้ำที่รด (มิลลิลิตร)', extraRange: [100, 300], growing: true },
    { id: 'savings', kind: 'trend', subject: 'เงินออมสะสมของห้อง ป.5/2 ในแต่ละเดือน', x: 'เดือน', y: 'เงินออมสะสม', unit: 'บาท', labels: ['มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.', 'ม.ค.'], extra: 'จำนวนวันเรียน (วัน)', extraRange: [18, 23], growing: true }
  ];
  const CHART_LEVEL = {
    easy: { count: [4, 4], units: [1], grid: 10, maxK: [11, 20] },
    medium: { count: [5, 6], units: [1, 5], grid: 10, maxK: [12, 30] },
    hard: { count: [6, 8], units: [10, 25], grid: 8, maxK: [14, 24] },
    challenge: { count: [6, 7], units: [5, 10], grid: 8, maxK: [12, 22] }
  };
  const scaleFor = (max, grid) => SCALE_LADDER.find(s => Math.ceil(max / s) <= grid);

  function chartData(level, scenario) {
    const cfg = CHART_LEVEL[level];
    return retry(() => {
      const count = rnd(cfg.count[0], Math.min(cfg.count[1], scenario.labels.length));
      const labels = scenario.shuffleLabels ? sample(scenario.labels, count) : scenario.labels.slice(0, count);
      const unit = scenario.temp ? 1 : pick(cfg.units);
      const topK = rnd(cfg.maxK[0], cfg.maxK[1]);
      let ks;
      if (scenario.temp) ks = labels.map(() => rnd(24, 38));
      else if (scenario.growing) {
        ks = [rnd(1, 3)];
        while (ks.length < count) ks.push(ks[ks.length - 1] + rnd(1, Math.max(2, Math.floor(topK / count))));
      } else ks = labels.map(() => rnd(1, topK));
      const values = ks.map(k => k * unit);
      if (new Set(values).size !== values.length) return null;
      const max = Math.max(...values);
      const scale = scaleFor(max, cfg.grid);
      const at = SCALE_LADDER.indexOf(scale);
      if (at < 1 || at > SCALE_LADDER.length - 3) return null;
      if (scenario.kind === 'trend') {
        const rises = values.slice(1).map((v, i) => v - values[i]);
        const best = Math.max(...rises);
        if (best <= 0 || rises.filter(r => r === best).length > 1) return null;
      }
      return { labels, values, unit, scale, grid: cfg.grid };
    }, 'chart data');
  }

  const dataTable = (scenario, data, opts = {}) => {
    const head = [scenario.x, `${scenario.y} (${scenario.unit})`];
    if (opts.extraValues) head.push(scenario.extra);
    return table('📋 ตารางข้อมูล', head, data.labels.map((label, i) => {
      const row = [label, i === opts.hide ? '?' : String(data.values[i])];
      if (opts.extraValues) row.push(String(opts.extraValues[i]));
      return row;
    }));
  };

  function planStep(level, scenario, data) {
    const other = pick(CHART_SCENARIOS.filter(s => s.id !== scenario.id && s.unit !== scenario.unit && s.x !== scenario.x));
    const { scale, grid } = data;
    const max = Math.max(...data.values);
    const at = SCALE_LADDER.indexOf(scale);
    const scaleOptions = SCALE_LADDER.slice(at - 1, at + (level === 'easy' ? 2 : 3)).map(s => {
      const rows = Math.ceil(max / s);
      return {
        text: `ช่องละ ${s} ${scenario.unit} (ใช้ ${rows} ช่อง)`, value: s, ok: s === scale,
        why: rows > grid ? `ต้องใช้ ${rows} ช่อง เกินพื้นที่กราฟที่มี ${grid} ช่อง` : `ใช้ได้ แต่แท่งจะเตี้ยและอ่านค่าละเอียดได้ยาก สเกลที่ละเอียดกว่าและยังพอดีพื้นที่คือ ${scale}`
      };
    });
    const isTrend = scenario.kind === 'trend';
    const fields = [
      { id: 'type', label: 'ชนิดกราฟ', store: 'chartType', options: [
        { text: 'แผนภูมิแท่ง', value: 'bar', ok: !isTrend, why: isTrend ? 'ข้อมูลนี้เปลี่ยนแปลงตามเวลา กราฟเส้นแสดงการขึ้นลงต่อเนื่องได้ชัดกว่า' : '' },
        { text: 'กราฟเส้น', value: 'line', ok: isTrend, why: isTrend ? '' : 'กราฟเส้นใช้แสดงการเปลี่ยนแปลงตามเวลา แต่ข้อมูลนี้เป็นการเปรียบเทียบหมวดหมู่ที่ไม่ต่อเนื่องกัน' },
        { text: 'แผนภูมิรูปวงกลม', value: 'pie', ok: false, why: 'แผนภูมิรูปวงกลมใช้แสดงส่วนของทั้งหมด (เรียนในชั้น ป.6) และอ่านจำนวนของแต่ละหมวดได้ยาก' }
      ] },
      { id: 'title', label: 'ชื่อกราฟ', options: shuffle([
        { text: scenario.subject, ok: true, why: '' },
        { text: other.subject, ok: false, why: 'ชื่อกราฟไม่ตรงกับข้อมูลในตาราง' },
        { text: 'กราฟของฉัน', ok: false, why: 'ชื่อกราฟต้องบอกว่ากราฟแสดงข้อมูลเรื่องอะไร' }
      ]) },
      { id: 'x', label: 'ชื่อแกน X (แนวนอน)', options: shuffle([
        { text: scenario.x, ok: true, why: '' },
        { text: `${scenario.y} (${scenario.unit})`, ok: false, why: `แกน X ใช้แสดงหมวดหมู่ (${scenario.x}) ส่วนจำนวนอยู่บนแกน Y` },
        { text: other.x, ok: false, why: 'ไม่ตรงกับหมวดหมู่ในตาราง' }
      ]) },
      { id: 'y', label: 'ชื่อแกน Y (แนวตั้ง) พร้อมหน่วย', options: shuffle([
        { text: `${scenario.y} (${scenario.unit})`, ok: true, why: '' },
        { text: `${scenario.y} (${other.unit})`, ok: false, why: `หน่วยไม่ถูกต้อง ข้อมูลนี้มีหน่วยเป็น${scenario.unit}` },
        { text: scenario.x, ok: false, why: 'แกน Y ต้องแสดงจำนวนพร้อมหน่วย ไม่ใช่หมวดหมู่' }
      ]) },
      { id: 'scale', label: `สเกลแกน Y (พื้นที่กราฟมีได้สูงสุด ${grid} ช่อง)`, store: 'scale', options: scaleOptions }
    ];
    const used = level === 'easy' ? ['type', 'y', 'scale'] : fields.map(f => f.id);
    const chosen = fields.filter(f => used.includes(f.id)).map(f => ({ ...f, answer: f.options.findIndex(o => o.ok) }));
    return step('plan', 'วางแผนกราฟ: เลือกให้ครบทุกหัวข้อ', {
      skill: 'planning', points: 15, fields: chosen,
      hints: [isTrend ? 'ข้อมูลที่วัดซ้ำตามเวลา เหมาะกับกราฟเส้น' : 'ข้อมูลที่เปรียบเทียบหมวดหมู่ เหมาะกับแผนภูมิแท่ง',
        `ค่ามากที่สุดคือ ${max} หาร ${max} ด้วยแต่ละสเกล แล้วเลือกสเกลที่ละเอียดที่สุดที่ใช้ไม่เกิน ${grid} ช่อง`],
      solution: [`ชนิดกราฟ: ${isTrend ? 'กราฟเส้น เพราะข้อมูลเปลี่ยนตามเวลา' : 'แผนภูมิแท่ง เพราะเปรียบเทียบหมวดหมู่'}`,
        `แกน X: ${scenario.x} · แกน Y: ${scenario.y} (${scenario.unit})`,
        `สเกล: ${max} ÷ ${scale} ≈ ${Math.ceil(max / scale)} ช่อง ไม่เกิน ${grid} ช่อง แต่ ${SCALE_LADDER[SCALE_LADDER.indexOf(scale) - 1]} ต้องใช้ ${Math.ceil(max / SCALE_LADDER[SCALE_LADDER.indexOf(scale) - 1])} ช่อง`]
    });
  }

  function chartBuildStep(scenario, data, order) {
    const target = order === 'desc'
      ? data.labels.map((label, i) => [label, data.values[i]]).sort((a, b) => b[1] - a[1]).map(r => r[0])
      : data.labels;
    return step('chart', order === 'desc'
      ? 'สร้างกราฟ: วางหมวดหมู่บนแกน X โดยเรียงจากค่ามากไปน้อย แล้วปรับความสูงทุกแท่งให้ตรงข้อมูล'
      : 'สร้างกราฟ: วางหมวดหมู่บนแกน X ตามลำดับในตาราง แล้วปรับความสูงทุกแท่งให้ตรงข้อมูล', {
      skill: 'final', points: 20, labels: data.labels, values: data.values, order: target, orderRule: order,
      unit: scenario.unit, fine: data.unit, defaultScale: data.scale, defaultType: scenario.kind === 'trend' ? 'line' : 'bar', grid: data.grid,
      hints: ['แตะชื่อหมวดหมู่ด้านล่างเพื่อวางบนแกน X ตามลำดับ แตะป้ายใต้แท่งเพื่อเอาออก', 'แตะหรือลากในคอลัมน์เพื่อกำหนดความสูง แล้วใช้ปุ่ม − / + ปรับละเอียด'],
      solution: [`ลำดับแกน X: ${target.join(' → ')}`, ...data.labels.map((label, i) => `${label} = ${data.values[i]} ${scenario.unit}`)]
    });
  }

  function interpretSteps(scenario, data, count) {
    const { labels, values } = data;
    const u = scenario.unit, pool = [];
    const idx = labels.map((_, i) => i);
    const [a, b] = sample(idx, 2);
    const hi = values[a] >= values[b] ? a : b, lo = hi === a ? b : a;
    pool.push(() => numberStep(`จากกราฟ ${labels[hi]} มากกว่า ${labels[lo]} อยู่กี่${u}`, values[hi] - values[lo], {
      unit: u, skill: 'interpretation', hints: ['อ่านค่าของทั้งสองแท่ง แล้วนำค่ามากลบค่าน้อย'],
      solution: [`${labels[hi]} = ${values[hi]}, ${labels[lo]} = ${values[lo]}`, `${values[hi]} − ${values[lo]} = ${values[hi] - values[lo]} ${u}`]
    }));
    if (scenario.kind === 'trend') {
      const rises = values.slice(1).map((v, i) => v - values[i]);
      const best = rises.indexOf(Math.max(...rises));
      const span = i => `${labels[i]} → ${labels[i + 1]}`;
      pool.push(() => choiceStep('ช่วงใดที่ค่าเพิ่มขึ้นมากที่สุด', sample(rises.map((_, i) => i).filter(i => i !== best), 3).concat(best).map(i => ({
        text: span(i), ok: i === best, why: `${span(i)} ${rises[i] >= 0 ? 'เพิ่มขึ้น' : 'ลดลง'} ${Math.abs(rises[i])} ${u} แต่ ${span(best)} เพิ่มขึ้น ${rises[best]} ${u}`
      })), { skill: 'interpretation', hints: ['ช่วงที่เส้นชันขึ้นมากที่สุดคือช่วงที่เพิ่มขึ้นมากที่สุด', 'หาผลต่างของค่าที่อยู่ติดกันทุกช่วง'], solution: rises.map((r, i) => `${span(i)}: ${r >= 0 ? '+' : ''}${r}`) }));
    } else {
      const sorted = idx.slice().sort((x, y) => values[y] - values[x]);
      const top2 = values[sorted[0]] + values[sorted[1]];
      pool.push(() => numberStep(`2 หมวดที่มีค่ามากที่สุดรวมกันได้กี่${u}`, top2, {
        unit: u, skill: 'interpretation', hints: ['หาแท่งที่สูงที่สุดและสูงเป็นอันดับสอง แล้วบวกกัน'],
        solution: [`${labels[sorted[0]]} ${values[sorted[0]]} + ${labels[sorted[1]]} ${values[sorted[1]]} = ${top2} ${u}`]
      }));
    }
    const maxI = values.indexOf(Math.max(...values)), minI = values.indexOf(Math.min(...values));
    const d = values[hi] - values[lo];
    pool.push(() => choiceStep('ข้อสรุปใดถูกต้องตามกราฟ', [
      { text: `${labels[maxI]} มีค่ามากที่สุด คือ ${values[maxI]} ${u}`, ok: true, why: '' },
      { text: `${labels[minI]} มีค่ามากที่สุด`, ok: false, why: `${labels[minI]} มีค่าน้อยที่สุด (${values[minI]} ${u})` },
      { text: `${labels[hi]} มากกว่า ${labels[lo]} อยู่ ${d + data.unit} ${u}`, ok: false, why: `${values[hi]} − ${values[lo]} = ${d} ไม่ใช่ ${d + data.unit}` },
      { text: `${labels[lo]} มากกว่า ${labels[hi]}`, ok: false, why: `${labels[lo]} มี ${values[lo]} น้อยกว่า ${labels[hi]} ที่มี ${values[hi]}` }
    ], { skill: 'interpretation', hints: ['ตรวจข้อสรุปทีละข้อกับค่าในกราฟ'], solution: [`แท่งสูงสุดคือ ${labels[maxI]} = ${values[maxI]} ${u}`] }));
    return sample(pool, count).map(make => make());
  }

  function analysisSteps(level, scenario, data, extraValues, hide) {
    const { labels, values } = data, u = scenario.unit, steps = [];
    const total = sum(values);
    if (hide !== null) {
      steps.push(numberStep(`ค่าของ ${labels[hide]} ที่หายไปเท่ากับกี่${u}`, values[hide], {
        unit: u, skill: 'analysis', points: 15,
        hints: ['รู้ผลรวมทั้งหมด และรู้ค่าของหมวดอื่น', `นำผลรวม ${total} ลบด้วยผลรวมของหมวดที่รู้ค่า`],
        solution: [`หมวดที่รู้ค่ารวมกัน = ${values.filter((_, i) => i !== hide).join(' + ')} = ${total - values[hide]}`, `${total} − ${total - values[hide]} = ${values[hide]} ${u}`]
      }));
    }
    if (extraValues) {
      steps.push(choiceStep(`ต้องการสร้างกราฟแสดง${scenario.subject} ต้องใช้คอลัมน์ใด`, [
        { text: `${scenario.y} (${u})`, ok: true, why: '' },
        { text: scenario.extra, ok: false, why: `${scenario.extra} เป็นข้อมูลส่วนเกิน ไม่ได้บอก${scenario.y}` },
        { text: 'ใช้ทั้งสองคอลัมน์บวกกัน', ok: false, why: 'สองคอลัมน์มีหน่วยต่างกัน บวกกันไม่ได้และไม่ตรงกับเรื่องของกราฟ' }
      ], { points: 5, solution: [`กราฟเรื่อง${scenario.subject} ใช้เฉพาะคอลัมน์${scenario.y}`] }));
    }
    const maxI = values.indexOf(Math.max(...values)), minI = values.indexOf(Math.min(...values));
    const pool = [
      () => numberStep(`${scenario.y}รวมทุกหมวดเท่ากับกี่${u}`, total, {
        unit: u, hints: ['บวกค่าทุกแถวในตาราง', 'บวกทีละคู่แล้วตรวจอีกครั้ง'], solution: [`${values.join(' + ')} = ${total} ${u}`]
      }),
      () => choiceStep('หมวดใดมีค่ามากที่สุด', sample(labels.map((_, i) => i).filter(i => i !== maxI), 3).concat(maxI).map(i => ({
        text: labels[i], ok: i === maxI, why: `${labels[i]} มี ${values[i]} น้อยกว่า ${labels[maxI]} ที่มี ${values[maxI]}`
      })), { hints: ['เทียบค่าทีละแถว จำค่าที่มากที่สุดไว้'], solution: [`${labels[maxI]} = ${values[maxI]} ${u} มากที่สุด`] }),
      () => numberStep(`ค่ามากที่สุดกับค่าน้อยที่สุดต่างกันกี่${u}`, values[maxI] - values[minI], {
        unit: u, hints: ['หาค่ามากที่สุดและน้อยที่สุดก่อน', 'นำค่ามากที่สุดลบค่าน้อยที่สุด'],
        solution: [`มากที่สุด ${labels[maxI]} = ${values[maxI]}, น้อยที่สุด ${labels[minI]} = ${values[minI]}`, `${values[maxI]} − ${values[minI]} = ${values[maxI] - values[minI]} ${u}`]
      })
    ];
    const take = level === 'easy' ? 3 : 2;
    return steps.concat(sample(pool, take).map(make => make()).map(s => ({ ...s, skill: 'analysis' })));
  }

  // A flawed sample chart: one bar wrong, axis not starting at 0, or uneven tick spacing.
  function flawSample(scenario, data, flaw) {
    const { labels, values, scale, unit } = data;
    const shown = [...values];
    let wrongIndex = null;
    if (flaw === 'bar') {
      wrongIndex = rnd(0, labels.length - 1);
      shown[wrongIndex] = values[wrongIndex] + (Math.random() < 0.5 && values[wrongIndex] > 2 * unit ? -2 : 2) * unit;
    }
    const top = Math.ceil(Math.max(...shown) / scale) * scale;
    let ticks = Array.from({ length: top / scale + 1 }, (_, i) => i * scale);
    if (flaw === 'axis') {
      const base = Math.floor(Math.min(...values) / scale) * scale - scale;
      ticks = ticks.filter(t => t >= Math.max(scale, base));
    } else {
      const cut = rnd(1, ticks.length - 3);
      ticks = ticks.map((t, i) => i > cut ? t + scale : t);
    }
    return { block: { type: 'chart', title: '🧐 กราฟตัวอย่างที่เพื่อนส่งมา', labels, values: shown, ticks, chartType: scenario.kind === 'trend' ? 'line' : 'bar', unit: scenario.unit }, wrongIndex, shown };
  }

  function flawSteps(scenario, data, flaw, sampleInfo) {
    const u = scenario.unit;
    const options = [
      { key: 'axis', text: 'แกน Y ไม่เริ่มที่ 0 ทำให้ความแตกต่างดูมากเกินจริง' },
      { key: 'uneven', text: 'ระยะห่างของตัวเลขบนแกน Y ไม่เท่ากัน' },
      ...(flaw === 'bar' ? [{ key: 'bar', text: `แท่ง${data.labels[sampleInfo.wrongIndex]}แสดงค่าไม่ตรงกับตาราง` }] : [{ key: 'bar', text: `แท่ง${pick(data.labels)}แสดงค่าไม่ตรงกับตาราง` }]),
      { key: 'none', text: 'กราฟถูกต้องแล้ว' }
    ];
    const why = {
      axis: 'ดูตัวเลขล่างสุดของแกน Y ว่าเริ่มที่ 0 หรือไม่',
      uneven: 'ดูว่าตัวเลขบนแกน Y เพิ่มทีละเท่ากันทุกช่องหรือไม่',
      bar: 'เทียบความสูงของแต่ละแท่งกับตารางทีละแถว',
      none: 'กราฟนี้มีจุดผิดอย่างน้อย 1 จุด ลองตรวจแกน Y และความสูงของแท่ง'
    };
    const steps = [choiceStep('กราฟตัวอย่างนี้ผิดพลาดอย่างไร', options.map(o => ({ text: o.text, ok: o.key === flaw, why: why[o.key] })), {
      skill: 'interpretation', points: 15, hints: ['ตรวจ 3 อย่าง: แกนเริ่มที่ 0 ไหม, ช่องสเกลเท่ากันไหม, แท่งตรงตารางไหม'],
      solution: [flaw === 'axis' ? `แกน Y เริ่มที่ ${sampleInfo.block.ticks[0]} ไม่ใช่ 0 แท่งจึงดูต่างกันมากเกินจริง`
        : flaw === 'uneven' ? `ตัวเลขบนแกน Y: ${sampleInfo.block.ticks.join(', ')} เพิ่มไม่เท่ากันทุกช่อง`
          : `แท่ง${data.labels[sampleInfo.wrongIndex]}แสดง ${sampleInfo.shown[sampleInfo.wrongIndex]} แต่ตารางบอก ${data.values[sampleInfo.wrongIndex]}`]
    })];
    if (flaw === 'bar') {
      const i = sampleInfo.wrongIndex, gap = sampleInfo.shown[i] - data.values[i];
      steps.push(numberStep(`แท่ง${data.labels[i]}ในกราฟตัวอย่างคลาดจากค่าจริงกี่${u}`, Math.abs(gap), {
        unit: u, skill: 'analysis', hints: ['อ่านค่าแท่งในกราฟตัวอย่าง แล้วเทียบกับตาราง'],
        solution: [`กราฟตัวอย่าง ${sampleInfo.shown[i]} ค่าจริง ${data.values[i]} ต่างกัน ${Math.abs(gap)} ${u}`]
      }));
    } else if (flaw === 'axis') {
      steps.push(numberStep('แกน Y ที่ถูกต้องควรเริ่มที่ค่าใด', 0, {
        skill: 'analysis', points: 5, hints: ['แท่งกราฟต้องวัดความสูงจากศูนย์ จึงเปรียบเทียบได้ถูกต้อง'], solution: ['แกน Y ของแผนภูมิแท่งและกราฟเส้นในโจทย์นี้ต้องเริ่มที่ 0']
      }));
    } else {
      const t = sampleInfo.block.ticks, jump = t.findIndex((v, i) => i > 0 && v - t[i - 1] !== t[1] - t[0]);
      steps.push(numberStep(`ระหว่าง ${t[jump - 1]} กับ ${t[jump]} บนแกน Y หายไปหนึ่งค่า ค่านั้นคือเท่าใด`, t[jump - 1] + data.scale, {
        skill: 'analysis', points: 5, hints: [`ช่องอื่นเพิ่มทีละ ${data.scale}`], solution: [`${t[jump - 1]} + ${data.scale} = ${t[jump - 1] + data.scale}`]
      }));
    }
    return steps;
  }

  function chartMission(level, template, scenario) {
    const data = chartData(level, scenario);
    const extraValues = level === 'hard' && template === 'build' ? data.labels.map(() => rnd(scenario.extraRange[0], scenario.extraRange[1])) : null;
    const hide = level === 'medium' && template === 'build' ? rnd(0, data.labels.length - 1) : null;
    const context = [dataTable(scenario, data, { extraValues, hide })];
    if (hide !== null) context.push(note(`ข้อมูลเพิ่มเติม: ${scenario.y}รวมทุกหมวดเท่ากับ ${sum(data.values)} ${scenario.unit}`));
    const order = scenario.kind === 'compare' && level !== 'easy' && (template === 'build' ? level !== 'medium' : Math.random() < 0.5) ? 'desc' : 'table';
    let steps;
    if (template === 'build') {
      steps = [...analysisSteps(level, scenario, data, extraValues, hide), planStep(level, scenario, data), chartBuildStep(scenario, data, order), ...interpretSteps(scenario, data, level === 'easy' ? 1 : 2)];
    } else if (template === 'fix') {
      const flaw = ['easy', 'medium'].includes(level) ? 'bar' : pick(['bar', 'axis', 'uneven']);
      const info = flawSample(scenario, data, flaw);
      context.push(info.block);
      steps = [...flawSteps(scenario, data, flaw, info), planStep(level, scenario, data), chartBuildStep(scenario, data, order), ...interpretSteps(scenario, data, 1)];
    } else {
      let ai, bi, truth;
      retry(() => {
        const fresh = chartData(level, scenario);
        [ai, bi] = sample(fresh.labels.map((_, i) => i), 2);
        if (fresh.values[ai] <= fresh.values[bi]) return null;
        truth = Math.random() < 0.5;
        const values = [...fresh.values];
        values[ai] = 2 * values[bi] + (truth ? 0 : pick([-3, -2, -1, 1, 2, 3]) * fresh.unit);
        const below = SCALE_LADDER[SCALE_LADDER.indexOf(fresh.scale) - 1];
        if (values[ai] <= values[bi] || new Set(values).size !== values.length) return null;
        if (Math.ceil(Math.max(...values) / fresh.scale) > fresh.grid || Math.ceil(Math.max(...values) / below) <= fresh.grid) return null;
        Object.assign(data, fresh, { values });
        return true;
      }, 'claim data');
      const { labels, values } = data;
      context[0] = dataTable(scenario, data);
      const info = flawSample(scenario, data, 'axis');
      info.block.title = '📣 กราฟที่ใช้ประกอบคำกล่าวอ้าง';
      context.push(info.block, note(`คำกล่าวอ้าง: “${labels[ai]} มากกว่า ${labels[bi]} สองเท่า ดูจากกราฟก็เห็นชัด”`));
      const doubled = 2 * values[bi];
      steps = [
        numberStep(`${labels[bi]} × 2 เท่ากับกี่${scenario.unit}`, doubled, { skill: 'analysis', unit: scenario.unit, hints: ['ถ้าเป็นสองเท่าจริง ค่าของหมวดที่มากกว่าต้องเท่ากับผลนี้'], solution: [`${values[bi]} × 2 = ${doubled}`] }),
        choiceStep('คำกล่าวอ้างนี้ถูกต้องหรือไม่ เพราะอะไร', [
          { text: `ถูกต้อง เพราะ ${values[bi]} × 2 = ${doubled} เท่ากับค่าของ${labels[ai]}`, ok: truth, why: `ค่าของ${labels[ai]}คือ ${values[ai]} ไม่ใช่ ${doubled}` },
          { text: `ไม่ถูกต้อง เพราะ${labels[ai]}มี ${values[ai]} ไม่เท่ากับ ${values[bi]} × 2 = ${doubled}`, ok: !truth, why: `${labels[ai]}มี ${values[ai]} เท่ากับ ${doubled} จริง` },
          { text: 'ถูกต้อง เพราะในกราฟ แท่งหนึ่งสูงกว่าอีกแท่งมาก', ok: false, why: 'กราฟนี้แกน Y ไม่เริ่มที่ 0 ความสูงจึงหลอกตา ต้องเทียบตัวเลขจริง' },
          { text: 'บอกไม่ได้ เพราะไม่มีข้อมูล', ok: false, why: 'ตารางมีค่าของทั้งสองหมวด ตรวจสอบได้' }
        ], { skill: 'interpretation', points: 15, hints: ['อย่าดูเพียงความสูงในกราฟที่แกนไม่เริ่มที่ 0 ให้ใช้ตัวเลขในตาราง'], solution: [`${labels[ai]} = ${values[ai]}, ${labels[bi]} × 2 = ${doubled}`, truth ? 'เท่ากัน คำกล่าวอ้างจึงถูก' : 'ไม่เท่ากัน คำกล่าวอ้างจึงไม่ถูก', 'กราฟประกอบแกน Y ไม่เริ่มที่ 0 จึงทำให้ดูต่างกันมากเกินจริง'] }),
        ...flawSteps(scenario, data, 'axis', info).slice(1),
        planStep(level, scenario, data),
        chartBuildStep(scenario, data, 'table'),
        ...interpretSteps(scenario, data, 1)
      ];
    }
    return {
      title: { build: 'นักวิเคราะห์ข้อมูลมือโปร', fix: 'จับผิดกราฟเพื่อน', claim: 'ตรวจคำกล่าวอ้าง' }[template],
      icon: { build: '📊', fix: '🔍', claim: '📣' }[template],
      story: [`ข้อมูล: ${scenario.subject}`, template === 'build' ? 'วิเคราะห์ข้อมูล วางแผน สร้างกราฟ แล้วตีความ' : template === 'fix' ? 'เพื่อนสร้างกราฟมาแต่มีจุดผิด หาให้เจอแล้วสร้างกราฟที่ถูกต้อง' : 'มีคนกล่าวอ้างจากกราฟ ตรวจด้วยตัวเลขจริง แล้วสร้างกราฟที่ถูกต้อง'],
      context, steps
    };
  }
  const chartTemplate = template => level => {
    const used = chartTemplate.used || (chartTemplate.used = new Set());
    const pool = CHART_SCENARIOS.filter(s => !used.has(s.id) && (template !== 'claim' || s.kind === 'compare') && (!s.temp || ['easy', 'medium'].includes(level)));
    const scenario = pick(pool.length ? pool : CHART_SCENARIOS.filter(s => s.kind === 'compare'));
    used.add(scenario.id);
    return chartMission(level, template, scenario);
  };

  // ── Fraction quest ────────────────────────────────────
  const fracFor = level => {
    const dens = { easy: [2, 4, 8], medium: [2, 3, 4, 5, 6, 8, 10], hard: [3, 4, 5, 6, 8, 9, 10, 12], challenge: [3, 4, 5, 6, 7, 8, 9, 12] }[level];
    return properFraction(pick(dens));
  };
  const twoFracs = (level, test) => retry(() => {
    const a = fracFor(level), b = fracFor(level);
    if (fCmp(a, b) === 0 || (level !== 'easy' && a.d === b.d)) return null;
    return test(a, b) ? [a, b] : null;
  }, 'fraction pair');
  const addLines = (a, b, op = '+') => {
    const L = lcm(a.d, b.d), r = op === '+' ? fAdd(a, b) : fSub(a, b);
    return [`ค.ร.น. ของ ${a.d} และ ${b.d} คือ ${L}`, `${fText(a)} ${op} ${fText(b)} = ${fOver(a, L)} ${op} ${fOver(b, L)} = ${fText(r)}`];
  };

  function fracRibbon(level) {
    return retry(() => {
      const pieces = level === 'hard' || level === 'challenge' ? 3 : 2;
      const fracs = Array.from({ length: pieces }, () => fracFor(level));
      if (new Set(fracs.map(f => f.d)).size < (level === 'easy' ? 1 : 2)) return null;
      const used = fSum(fracs), have = fr(rnd(2, 3)), left = fSub(have, used);
      if (left.n <= 0) return null;
      const L = lcdOf(fracs), price = rnd(12, 25);
      const steps = [
        choiceStep('ข้อมูลใดไม่จำเป็นต่อการหาความยาวริบบิ้นที่เหลือ', [
          { text: `ราคาริบบิ้นเมตรละ ${price} บาท`, ok: true, why: '' },
          { text: `ความยาวริบบิ้นที่มี ${fText(have)} เมตร`, ok: false, why: 'ต้องใช้ความยาวที่มีเป็นตัวตั้ง' },
          { text: 'ความยาวที่ใช้ผูกกล่องแต่ละใบ', ok: false, why: 'ต้องใช้หาความยาวที่ใช้ไปทั้งหมด' }
        ], { points: 5, solution: ['คำถามถามความยาว ไม่เกี่ยวกับราคา'] }),
        fractionStep('ใช้ริบบิ้นไปทั้งหมดกี่เมตร', used, {
          unit: 'เมตร', hints: [`ทำตัวส่วนให้เท่ากันเป็น ${L}`, `${fracs.map(f => fOver(f, L)).join(' + ')}`],
          solution: totalLines(fracs, L).map(line => line.replace('ถาด', 'เมตร')),
          mistakes: [{ value: fr(sum(fracs.map(f => f.n)), sum(fracs.map(f => f.d))), why: 'บวกตัวส่วนเข้าด้วยกันไม่ได้ ต้องทำตัวส่วนให้เท่ากันก่อน' }]
        }),
        fractionStep('เหลือริบบิ้นกี่เมตร', left, {
          unit: 'เมตร', skill: 'final', hints: [`${fText(have)} − ${fText(used)}`, `${fText(have)} = ${have.n * used.d}/${used.d}`],
          solution: [`${fText(have)} − ${fText(used)} = ${have.n * used.d}/${used.d} − ${used.n}/${used.d} = ${fText(left)} เมตร`]
        })
      ];
      if (level === 'challenge' || level === 'hard') {
        const need = fr(1, 2), enough = fCmp(left, need) >= 0;
        steps.push(choiceStep('ต้องเก็บริบบิ้นอย่างน้อย 1/2 เมตรไว้ผูกโบว์ใหญ่ ริบบิ้นที่เหลือพอหรือไม่', [
          { text: 'พอ', ok: enough, why: `${fText(left)} = ${fOver(left, lcm(left.d, 2))} น้อยกว่า 1/2 = ${fOver(need, lcm(left.d, 2))}` },
          { text: 'ไม่พอ', ok: !enough, why: `${fText(left)} = ${fOver(left, lcm(left.d, 2))} ไม่น้อยกว่า 1/2 = ${fOver(need, lcm(left.d, 2))}` }
        ], { keepOrder: true, skill: 'final', solution: [`เทียบ ${fText(left)} กับ 1/2 โดยทำตัวส่วนเป็น ${lcm(left.d, 2)}`] }));
      }
      return {
        title: 'ห่อของขวัญวันเกิด', icon: '🎀',
        story: [`มีริบบิ้นยาว ${fText(have)} เมตร ราคาเมตรละ ${price} บาท`, `ผูกกล่องของขวัญ ${pieces} ใบ ใช้ ${fracs.map(f => `${fText(f)} เมตร`).join(', ')}`],
        context: [], steps
      };
    }, 'ribbon');
  }

  function fracCritique(level) {
    const [a, b] = twoFracs(level, () => true);
    const right = fAdd(a, b), wrong = fr(a.n + b.n, a.d + b.d), gap = fSub(right, wrong);
    const friend = pick(NAMES);
    return {
      title: 'ตรวจการบ้านเพื่อน', icon: '📝',
      story: [`${friend}คิดว่า ${fText(a)} + ${fText(b)} = ${a.n + b.n}/${a.d + b.d} โดยบวกตัวเศษกับตัวเศษ และตัวส่วนกับตัวส่วน`],
      context: [],
      steps: [
        choiceStep(`วิธีของ${friend}ถูกหรือไม่`, [
          { text: 'ผิด เพราะต้องทำตัวส่วนให้เท่ากันก่อน แล้วบวกเฉพาะตัวเศษ', ok: true, why: '' },
          { text: 'ถูก เพราะบวกทั้งตัวเศษและตัวส่วนครบแล้ว', ok: false, why: `ลองเช็ก: 1/2 + 1/2 ต้องได้ 1 แต่วิธีนี้ได้ 2/4 = 1/2` },
          { text: 'ถูก ถ้าตัดทอนเป็นเศษส่วนอย่างต่ำก่อน', ok: false, why: 'การตัดทอนไม่ช่วย เพราะการบวกตัวส่วนผิดตั้งแต่ต้น' }
        ], { skill: 'planning', solution: ['เศษส่วนบวกกันได้เมื่อแบ่งเป็นส่วนขนาดเท่ากัน จึงต้องทำตัวส่วนให้เท่ากันก่อน'] }),
        fractionStep(`คำตอบที่ถูกต้องของ ${fText(a)} + ${fText(b)} คือเท่าไร`, right, { hints: [`หา ค.ร.น. ของ ${a.d} และ ${b.d}`, `${fOver(a, lcm(a.d, b.d))} + ${fOver(b, lcm(a.d, b.d))}`], solution: addLines(a, b), mistakes: [{ value: wrong, why: 'นี่คือคำตอบที่ผิดแบบเดียวกับเพื่อน' }] }),
        choiceStep(`ตรวจด้วยการประมาณ: ผลบวกที่ถูกต้องต้องมากกว่า ${fText(fCmp(a, b) > 0 ? a : b)} หรือไม่`, [
          { text: `ต้องมากกว่า เพราะบวกจำนวนที่มากกว่า 0 เข้าไป และคำตอบของ${friend}ไม่มากกว่า จึงผิดแน่นอน`, ok: true, why: '' },
          { text: 'ไม่จำเป็นต้องมากกว่า', ok: false, why: 'การบวกจำนวนบวกเพิ่มเข้าไป ผลลัพธ์ต้องมากกว่าตัวตั้งเสมอ' }
        ], { keepOrder: true, skill: 'analysis', points: 5, solution: [`${a.n + b.n}/${a.d + b.d} ไม่มากกว่า ${fText(fCmp(a, b) > 0 ? a : b)} จึงเป็นไปไม่ได้`] }),
        fractionStep(`คำตอบของ${friend}น้อยกว่าคำตอบที่ถูกอยู่เท่าไร`, gap, { skill: 'final', hints: [`${fText(right)} − ${fText(wrong)}`], solution: addLines(right, wrong, '−') })
      ]
    };
  }

  function fracTank(level) {
    return retry(() => {
      const start = fracFor(level), used = fracFor(level), added = fracFor(level);
      const afterUse = fSub(start, used);
      if (afterUse.n <= 0) return null;
      const after = fAdd(afterUse, added), cmp = fCmp(after, fr(1));
      if (level === 'easy' && cmp > 0) return null;
      const diff = fAbs(fSub(fr(1), after));
      const steps = [
        fractionStep(`หลังใช้น้ำ เหลือน้ำในถังกี่ถัง`, afterUse, { unit: 'ถัง', hints: [`${fText(start)} − ${fText(used)}`], solution: addLines(start, used, '−') }),
        fractionStep('ถ้าถังใหญ่พอ หลังเติมน้ำจะมีน้ำรวมกี่ถัง', after, { unit: 'ถัง', hints: ['นำคำตอบขั้นก่อนบวกน้ำที่เติม'], solution: addLines(afterUse, added) }),
        choiceStep('น้ำในถังเป็นอย่างไร', [
          { text: 'ยังไม่เต็มถัง', ok: cmp < 0, why: `${fText(after)} เทียบกับ 1 ถัง` },
          { text: 'เต็มถังพอดี', ok: cmp === 0, why: `${fText(after)} เทียบกับ 1 ถัง` },
          { text: 'ล้นถัง', ok: cmp > 0, why: `${fText(after)} เทียบกับ 1 ถัง` }
        ], { keepOrder: true, solution: [`${fText(after)} ${cmp < 0 ? 'น้อยกว่า' : cmp === 0 ? 'เท่ากับ' : 'มากกว่า'} 1`] })
      ];
      if (cmp !== 0) steps.push(fractionStep(cmp < 0 ? 'ต้องเติมน้ำอีกกี่ถังจึงจะเต็มพอดี' : 'น้ำล้นออกมากี่ถัง', diff, { unit: 'ถัง', skill: 'final', hints: [cmp < 0 ? `1 − ${fText(after)}` : `${fText(after)} − 1`], solution: [`${cmp < 0 ? `1 − ${fText(after)}` : `${fText(after)} − 1`} = ${fText(diff)} ถัง`] }));
      return {
        title: 'ถังน้ำรดผัก', icon: '🪣',
        story: [`ถังน้ำมีน้ำ ${fText(start)} ถัง ใช้รดผักไป ${fText(used)} ถัง แล้วเติมน้ำฝนลงไปอีก ${fText(added)} ถัง`, `แปลงผักมี 6 แปลง และถังใบนี้สูง 60 เซนติเมตร`],
        context: [], steps
      };
    }, 'tank');
  }

  function fracRecipe(level) {
    return retry(() => {
      const [a, b] = twoFracs(level, () => true), c = fracFor(level);
      const planA = fAdd(a, b), planB = fAdd(fr(1), c);
      const cmp = fCmp(planA, planB);
      if (cmp === 0) return null;
      const less = cmp < 0 ? 'A' : 'B', gap = fAbs(fSub(planA, planB));
      return {
        title: 'สองสูตรขนมปัง', icon: '🥖',
        story: [`สูตร A ใช้แป้งสาลี ${fText(a)} ถ้วย และแป้งข้าว ${fText(b)} ถ้วย`, `สูตร B ใช้แป้งสาลี 1 ถ้วย และแป้งข้าว ${fText(c)} ถ้วย`, 'ทั้งสองสูตรอบที่ 180 องศาเซลเซียส นาน 25 นาที'],
        context: [],
        steps: [
          fractionStep('สูตร A ใช้แป้งรวมกี่ถ้วย', planA, { unit: 'ถ้วย', hints: [`หา ค.ร.น. ของ ${a.d} และ ${b.d}`], solution: addLines(a, b) }),
          fractionStep('สูตร B ใช้แป้งรวมกี่ถ้วย', planB, { unit: 'ถ้วย', hints: [`1 = ${c.d}/${c.d}`], solution: [`1 + ${fText(c)} = ${fText(planB)} ถ้วย`] }),
          choiceStep('สูตรใดใช้แป้งน้อยกว่า', [
            { text: 'สูตร A', ok: less === 'A', why: `${fText(planA)} กับ ${fText(planB)} ทำตัวส่วนให้เท่ากันแล้วเทียบ` },
            { text: 'สูตร B', ok: less === 'B', why: `${fText(planA)} กับ ${fText(planB)} ทำตัวส่วนให้เท่ากันแล้วเทียบ` }
          ], { keepOrder: true, solution: [`${fText(planA)} ${cmp < 0 ? '<' : '>'} ${fText(planB)}`] }),
          fractionStep('สูตรที่ใช้แป้งน้อยกว่า ประหยัดแป้งได้กี่ถ้วย', gap, { unit: 'ถ้วย', skill: 'final', hints: ['นำปริมาณที่มากกว่าลบปริมาณที่น้อยกว่า'], solution: addLines(cmp > 0 ? planA : planB, cmp > 0 ? planB : planA, '−') })
        ]
      };
    }, 'recipe');
  }

  function fracBatch(level) {
    return retry(() => {
      const per = fracFor(level), k = rnd(3, level === 'challenge' ? 7 : 5), have = fr(rnd(2, 4));
      const need = fTimes(per, k), cmp = fCmp(have, need);
      if (cmp === 0) return null;
      const maxCakes = Math.floor(have.n * per.d / per.n);
      const diff = fAbs(fSub(have, need));
      return {
        title: 'ร้านเค้กวันเด็ก', icon: '🎂',
        story: [`เค้ก 1 ก้อนใช้น้ำตาล ${fText(per)} กิโลกรัม ต้องทำ ${k} ก้อน`, `ร้านมีน้ำตาล ${fText(have)} กิโลกรัม และมีไข่ 30 ฟอง`],
        context: [],
        steps: [
          fractionStep(`ทำเค้ก ${k} ก้อน ต้องใช้น้ำตาลกี่กิโลกรัม`, need, { unit: 'กิโลกรัม', hints: ['คูณเศษส่วนกับจำนวนนับ: คูณเฉพาะตัวเศษ'], solution: [`${fText(per)} × ${k} = ${per.n * k}/${per.d} = ${fText(need)} กิโลกรัม`] }),
          fractionStep(cmp > 0 ? 'น้ำตาลเหลือกี่กิโลกรัม' : 'น้ำตาลขาดกี่กิโลกรัม', diff, { unit: 'กิโลกรัม', hints: ['นำปริมาณที่มากกว่าลบปริมาณที่น้อยกว่า'], solution: addLines(cmp > 0 ? have : need, cmp > 0 ? need : have, '−') }),
          numberStep('ด้วยน้ำตาลที่มี ทำเค้กได้มากที่สุดกี่ก้อน', maxCakes, {
            unit: 'ก้อน', skill: 'planning', hints: [`หาว่า ${fText(have)} มี ${fText(per)} อยู่กี่ส่วนเต็ม`, `${fText(have)} = ${have.n * per.d}/${per.d} แล้วหารด้วย ${per.n}`],
            solution: [`${fText(have)} = ${have.n * per.d}/${per.d} กิโลกรัม`, `${have.n * per.d} ÷ ${per.n} = ${fText(fr(have.n * per.d, per.n))} ทำได้เต็มก้อน ${maxCakes} ก้อน`]
          })
        ]
      };
    }, 'batch');
  }

  // ── Decimal shop ──────────────────────────────────────
  const SHOP_ITEMS = [
    { name: 'นมกล่อง', unit: 'กล่อง', range: [12, 25], extra: 'ขนาด 200 มิลลิลิตร' },
    { name: 'ขนมปัง', unit: 'ถุง', range: [18, 45], extra: 'หนัก 300 กรัม' },
    { name: 'สมุด', unit: 'เล่ม', range: [15, 39], extra: 'มี 60 แผ่น' },
    { name: 'ดินสอสี', unit: 'กล่อง', range: [35, 89], extra: 'มี 12 สี' },
    { name: 'น้ำผลไม้', unit: 'ขวด', range: [15, 35], extra: 'ขนาด 350 มิลลิลิตร' },
    { name: 'กล้วยหอม', unit: 'หวี', range: [25, 60], extra: 'หวีละ 6 ลูก' },
    { name: 'ปากกา', unit: 'ด้าม', range: [8, 22], extra: 'หมึกสีน้ำเงิน' }
  ];
  const priceOf = item => rnd(item.range[0] * 4, item.range[1] * 4) * 25;
  const shopTable = rows => table('🏷️ ป้ายราคา', ['สินค้า', 'ราคา (บาท)', 'รายละเอียด'], rows.map(r => [`${r.item.name} (${r.item.unit})`, baht(r.price), r.item.extra]));
  const centsLine = (a, op, b, r) => `${baht(a)} ${op} ${baht(b)} = ${baht(r)} บาท (ตั้งจุดทศนิยมให้ตรงกัน)`;

  function shopCart(level) {
    return retry(() => {
      const kinds = level === 'easy' ? 2 : 3;
      const rows = sample(SHOP_ITEMS, kinds).map(item => ({ item, price: priceOf(item), qty: level === 'easy' ? rnd(1, 2) : rnd(1, 4) }));
      const costs = rows.map(r => r.price * r.qty), total = sum(costs);
      const budget = Math.round((total + rnd(-15, 25) * 100) / 1000) * 1000;
      if (budget <= 0 || budget === total || (level === 'easy' && budget < total)) return null;
      const multi = rows.find(r => r.qty > 1);
      if (!multi) return null;
      const steps = [
        moneyStep(`ซื้อ${multi.item.name} ${multi.qty} ${multi.item.unit} เป็นเงินกี่บาท`, multi.price * multi.qty, { hints: [`${baht(multi.price)} × ${multi.qty}`], solution: [`${baht(multi.price)} × ${multi.qty} = ${baht(multi.price * multi.qty)} บาท`] }),
        moneyStep('ราคารวมของทั้งตะกร้าเป็นเงินกี่บาท', total, { skill: 'analysis', hints: ['หาราคาแต่ละรายการ (ราคา × จำนวน) แล้วบวกกัน', 'ตั้งจุดทศนิยมให้ตรงกันก่อนบวก'], solution: [...rows.map(r => `${r.item.name}: ${baht(r.price)} × ${r.qty} = ${baht(r.price * r.qty)}`), `รวม ${costs.map(baht).join(' + ')} = ${baht(total)} บาท`] }),
        choiceStep(`มีงบ ${baht(budget)} บาท พอซื้อทั้งหมดหรือไม่`, [
          { text: 'พอ', ok: budget > total, why: `ราคารวม ${baht(total)} มากกว่างบ ${baht(budget)}` },
          { text: 'ไม่พอ', ok: budget < total, why: `ราคารวม ${baht(total)} ไม่เกินงบ ${baht(budget)}` }
        ], { keepOrder: true, skill: 'planning', solution: [`${baht(total)} ${budget > total ? '<' : '>'} ${baht(budget)}`] }),
        moneyStep(budget > total ? 'จะได้รับเงินทอนกี่บาท' : 'ต้องหาเงินเพิ่มอีกกี่บาท', Math.abs(budget - total), { skill: 'final', hints: ['นำจำนวนที่มากกว่าลบจำนวนที่น้อยกว่า'], solution: [budget > total ? centsLine(budget, '−', total, budget - total) : centsLine(total, '−', budget, total - budget)] })
      ];
      return {
        title: 'จ่ายตลาดให้คุณแม่', icon: '🧺',
        story: [`คุณแม่ให้เงิน ${baht(budget)} บาท และรายการที่ต้องซื้อ: ${rows.map(r => `${r.item.name} ${r.qty} ${r.item.unit}`).join(', ')}`],
        context: [shopTable(rows)], steps
      };
    }, 'shop cart');
  }

  function shopPromo(level) {
    return retry(() => {
      const item = pick(SHOP_ITEMS), price = priceOf(item), packSize = 3;
      const packPrice = 3 * price - rnd(-2, 8) * 50;
      const need = rnd(4, level === 'easy' ? 6 : 8);
      const packs = Math.floor(need / packSize), singles = need % packSize;
      const planA = need * price, planB = packs * packPrice + singles * price;
      if (planA === planB || packPrice <= 0) return null;
      const cheaper = planA < planB ? 'A' : 'B';
      return {
        title: 'โปรโมชันคุ้มจริงไหม', icon: '🏷️',
        story: [`ต้องซื้อ${item.name} ${need} ${item.unit} สำหรับงานเลี้ยงห้อง`, `ราคา${item.unit}ละ ${baht(price)} บาท หรือโปรโมชันแพ็ก 3 ${item.unit} ราคา ${baht(packPrice)} บาท`],
        context: [note(`แผน A: ซื้อทีละ${item.unit} ${need} ${item.unit} · แผน B: ซื้อแพ็ก 3 ให้มากที่สุด ที่ขาดซื้อทีละ${item.unit}`), note(`ข้อมูลอื่น: ${item.extra} และร้านเปิด 08.30 น.`)],
        steps: [
          moneyStep('แผน A ต้องจ่ายกี่บาท', planA, { hints: [`${baht(price)} × ${need}`], solution: [`${baht(price)} × ${need} = ${baht(planA)} บาท`] }),
          numberStep(`แผน B ซื้อแพ็ก 3 ได้กี่แพ็ก`, packs, { unit: 'แพ็ก', skill: 'planning', hints: [`${need} ÷ 3 เอาเฉพาะส่วนเต็ม`], solution: [`${need} ÷ 3 = ${packs} เศษ ${singles} จึงซื้อ ${packs} แพ็ก และซื้อเพิ่มทีละ${item.unit} ${singles} ${item.unit}`] }),
          moneyStep('แผน B ต้องจ่ายกี่บาท', planB, { hints: ['ราคาแพ็ก × จำนวนแพ็ก แล้วบวกราคาที่ซื้อเพิ่มทีละชิ้น'], solution: [`${baht(packPrice)} × ${packs} + ${baht(price)} × ${singles} = ${baht(planB)} บาท`] }),
          choiceStep('แผนใดคุ้มกว่า และถูกกว่ากี่บาท', [
            { text: `แผน A ถูกกว่า ${baht(Math.abs(planA - planB))} บาท`, ok: cheaper === 'A', why: `แผน A ${baht(planA)} เทียบแผน B ${baht(planB)}` },
            { text: `แผน B ถูกกว่า ${baht(Math.abs(planA - planB))} บาท`, ok: cheaper === 'B', why: `แผน A ${baht(planA)} เทียบแผน B ${baht(planB)}` },
            { text: `แผน B ถูกกว่า ${baht(Math.abs(planA - planB) + 100)} บาท`, ok: false, why: `ผลต่างคือ ${baht(planA)} กับ ${baht(planB)} ลบกัน` },
            { text: 'โปรโมชันถูกกว่าเสมอ ไม่ต้องคำนวณ', ok: false, why: 'โปรโมชันบางแบบไม่คุ้ม ต้องคำนวณเทียบทุกครั้ง' }
          ], { keepOrder: true, skill: 'final', points: 15, solution: [`|${baht(planA)} − ${baht(planB)}| = ${baht(Math.abs(planA - planB))} บาท แผน ${cheaper} ถูกกว่า`] })
        ]
      };
    }, 'shop promo');
  }

  function shopMax(level) {
    return retry(() => {
      const [main, small] = sample(SHOP_ITEMS, 2);
      const mainPrice = priceOf(main), smallPrice = priceOf(small);
      const budget = rnd(10, 20) * 1000;
      const rest = budget - mainPrice;
      if (rest <= smallPrice * 2) return null;
      const count = Math.floor(rest / smallPrice), change = rest - count * smallPrice;
      return {
        title: 'งบจำกัด ซื้อให้ได้มากที่สุด', icon: '🪙',
        story: [`มีเงิน ${baht(budget)} บาท ต้องซื้อ${main.name} 1 ${main.unit}`, `เงินที่เหลือทั้งหมดจะซื้อ${small.name}ให้ได้มากที่สุด`],
        context: [shopTable([{ item: main, price: mainPrice }, { item: small, price: smallPrice }])],
        steps: [
          moneyStep(`ซื้อ${main.name}แล้วเหลือเงินกี่บาท`, rest, { hints: ['ตั้งจุดทศนิยมให้ตรงกันแล้วลบ'], solution: [centsLine(budget, '−', mainPrice, rest)] }),
          numberStep(`ซื้อ${small.name}ได้มากที่สุดกี่${small.unit}`, count, {
            unit: small.unit, skill: 'planning', points: 15, hints: [`ลองคูณ ${baht(smallPrice)} กับจำนวนต่าง ๆ ให้ใกล้ ${baht(rest)} ที่สุดแต่ไม่เกิน`],
            solution: [`${baht(smallPrice)} × ${count} = ${baht(count * smallPrice)} ไม่เกิน ${baht(rest)}`, `${baht(smallPrice)} × ${count + 1} = ${baht((count + 1) * smallPrice)} เกินงบ`],
            mistakes: [{ value: count + 1, why: `${count + 1} ${small.unit} ต้องจ่าย ${baht((count + 1) * smallPrice)} บาท เกินเงินที่เหลือ` }]
          }),
          moneyStep('หลังซื้อทั้งหมดจะเหลือเงินกี่บาท', change, { skill: 'final', hints: ['เงินที่เหลือหลังซื้อสินค้าหลัก ลบด้วยค่าสินค้าชิ้นเล็กทั้งหมด'], solution: [centsLine(rest, '−', count * smallPrice, change)] })
        ]
      };
    }, 'shop max');
  }

  function shopPlans(level) {
    return retry(() => {
      const items = sample(SHOP_ITEMS, 3);
      const choices = items.map(item => [priceOf(item), priceOf(item)]);
      const planOf = picks => picks.map((p, i) => ({ item: items[i], price: choices[i][p] }));
      const plans = [
        { name: 'แผน 1', rows: planOf([0, 0, 0]) },
        { name: 'แผน 2', rows: planOf([1, 1, 1]) },
        { name: 'แผน 3', rows: planOf([0, 1, 0]).slice(0, 2) },
        { name: 'แผน 4', rows: planOf([1, 0, 1]) }
      ].map(p => ({ ...p, total: sum(p.rows.map(r => r.price)) }));
      const complete = plans.filter(p => p.rows.length === 3).sort((a, b) => a.total - b.total);
      if (new Set(complete.map(p => p.total)).size !== 3) return null;
      const budget = Math.ceil((complete[1].total - 50) / 100) * 100;
      if (budget <= complete[0].total || budget >= complete[1].total) return null;
      if (plans[2].total > budget) return null;
      const best = complete[0];
      return {
        title: 'จัดซื้ออุปกรณ์ค่าย', icon: '🗒️',
        story: [`ต้องซื้อ${items.map(i => i.name).join(', ')} อย่างละ 1 ชิ้น งบไม่เกิน ${baht(budget)} บาท`, 'มีหลายแผนให้เลือก ต้องตรวจทั้งงบและความครบของรายการ'],
        context: [table('🧮 แผนการซื้อ', ['แผน', 'รายการ', 'ราคา (บาท)'], plans.map(p => [p.name, p.rows.map(r => r.item.name).join(' + '), p.rows.map(r => baht(r.price)).join(' + ')]))],
        steps: [
          ...[plans[0], plans[1]].map(p => moneyStep(`${p.name} รวมเป็นเงินกี่บาท`, p.total, { skill: 'calculation', hints: ['ตั้งจุดทศนิยมให้ตรงกันแล้วบวก'], solution: [`${p.rows.map(r => baht(r.price)).join(' + ')} = ${baht(p.total)} บาท`] })),
          choiceStep('แผนใดทำตามเงื่อนไขครบทุกข้อและจ่ายน้อยที่สุด', plans.map(p => ({
            text: p.name, ok: p === best,
            why: p.rows.length < 3 ? `${p.name} ราคา ${baht(p.total)} อยู่ในงบ แต่ซื้อของไม่ครบ 3 อย่าง` : p.total > budget ? `${p.name} ราคา ${baht(p.total)} เกินงบ ${baht(budget)}` : `${p.name} ราคา ${baht(p.total)} อยู่ในงบ แต่ยังมีแผนที่ถูกกว่า`
          })), { keepOrder: true, skill: 'planning', points: 15, hints: ['ตัดแผนที่ซื้อไม่ครบออกก่อน', 'จากแผนที่ครบ เทียบกับงบแล้วเลือกที่ถูกที่สุด'], solution: plans.map(p => `${p.name}: ${baht(p.total)} บาท ${p.rows.length < 3 ? '(ไม่ครบ)' : p.total > budget ? '(เกินงบ)' : '(ผ่าน)'}`) }),
          moneyStep('ถ้าใช้แผนที่เลือก จะเหลือเงินจากงบกี่บาท', budget - best.total, { skill: 'final', hints: ['งบ − ราคาแผนที่เลือก'], solution: [centsLine(budget, '−', best.total, budget - best.total)] })
        ]
      };
    }, 'shop plans');
  }

  // ── Decimal treasure ──────────────────────────────────
  const TREASURE_STORIES = [
    { title: 'แผนที่เกาะลับ', icon: '🗺️', unit: 'กิโลเมตร', a: 'เดินจากท่าเรือ', b: 'เดินต่อ', c: 'ย้อนกลับ', extra: 'แผนที่นี้วาดไว้เมื่อ 125 ปีก่อน' },
    { title: 'น้ำยาวิเศษ', icon: '🧪', unit: 'ลิตร', a: 'เทน้ำยาสีฟ้า', b: 'เติมน้ำยาสีม่วง', c: 'ระเหยไป', extra: 'ขวดน้ำยามีทั้งหมด 7 ขวด' },
    { title: 'เหรียญทองโจรสลัด', icon: '🪙', unit: 'กรัม', a: 'ชั่งเหรียญกองแรกได้', b: 'เพิ่มเหรียญกองที่สอง', c: 'แบ่งให้ลูกเรือไป', extra: 'กัปตันอายุ 48 ปี' }
  ];
  function treasureChain(level) {
    const places = { easy: 1, medium: 2, hard: 2, challenge: 3 }[level];
    const used = treasureChain.used || (treasureChain.used = new Set());
    const story = pick(TREASURE_STORIES.filter(x => !used.has(x.title)));
    used.add(story.title);
    const scale = 10 ** places, t = units => decText(units, places);
    return retry(() => {
      const a = rnd(2 * scale, 30 * scale), b = rnd(scale / 2, 15 * scale), c = rnd(scale / 2, 10 * scale);
      const key1 = a + b, key2 = key1 - c;
      if (key2 <= 0) return null;
      const useMul = level !== 'easy';
      const k = rnd(2, 4);
      const divide = level === 'challenge';
      if (divide && key2 % k !== 0) return null;
      const key3 = !useMul ? key2 + c * 2 : divide ? key2 / k : key2 * k;
      const opText = !useMul ? `+ ${t(c * 2)}` : divide ? `÷ ${k}` : `× ${k}`;
      const shifted = key3 * 10, misOp = !useMul ? key2 - c * 2 : divide ? key2 * k : key2 + k * scale;
      const chests = shuffle([key3, shifted, misOp, key3 + scale]).filter((v, i, list) => list.indexOf(v) === i && v > 0);
      if (chests.length < 4) return null;
      const unitDec = (prompt, ans, extra) => fixedStep(prompt, ans, places, { unit: story.unit, ...extra });
      const steps = [];
      if (level === 'challenge') {
        const near = Math.round(key1 / scale), guesses = [near, near + 10, near * 10, Math.max(1, near - 7)];
        if (new Set(guesses).size !== 4) return null;
        steps.push(choiceStep(`ประมาณก่อนคำนวณ: ${t(a)} + ${t(b)} มีค่าใกล้เคียงกับข้อใดมากที่สุด`, guesses.map((v, i) => ({
          text: String(v), ok: i === 0, why: `ปัด ${t(a)} ≈ ${Math.round(a / scale)} และ ${t(b)} ≈ ${Math.round(b / scale)} แล้วบวกกัน`
        })), { skill: 'planning', points: 5, solution: [`${Math.round(a / scale)} + ${Math.round(b / scale)} ≈ ${Math.round(key1 / scale)}`] }));
      }
      steps.push(
        unitDec(`กุญแจ 1: ${story.a} ${t(a)} ${story.unit} แล้ว${story.b}อีก ${t(b)} ${story.unit} รวมเป็นเท่าไร`, key1, { hints: ['ตั้งจุดทศนิยมให้ตรงกัน เติม 0 ให้ตำแหน่งเท่ากัน'], solution: [`${t(a)} + ${t(b)} = ${t(key1)} ${story.unit}`] }),
        unitDec(`กุญแจ 2: นำคำตอบกุญแจ 1 ไป${story.c} ${t(c)} ${story.unit} เหลือเท่าไร`, key2, { hints: ['ใช้คำตอบจากกุญแจ 1 เป็นตัวตั้ง', 'ตั้งจุดทศนิยมให้ตรงกันแล้วลบ'], solution: [`${t(key1)} − ${t(c)} = ${t(key2)} ${story.unit}`] }),
        unitDec(`กุญแจ 3: นำคำตอบกุญแจ 2 ${opText} ได้เท่าไร`, key3, { hints: [divide ? `หารทีละหลักแล้ววางจุดทศนิยมตรงกับตัวตั้ง` : useMul ? 'คูณเหมือนจำนวนนับ แล้วนับตำแหน่งทศนิยมของตัวตั้ง' : 'ตั้งจุดทศนิยมให้ตรงกันแล้วบวก'], solution: [`${t(key2)} ${opText} = ${t(key3)} ${story.unit}`] }),
        choiceStep('ก่อนเปิดหีบ ต้องตรวจคำตอบกุญแจ 3 วิธีใดถูกต้อง', [
          { text: `นำคำตอบกุญแจ 3 ${!useMul ? `− ${t(c * 2)}` : divide ? `× ${k}` : `÷ ${k}`} ต้องได้คำตอบกุญแจ 2`, ok: true, why: '' },
          { text: `นำคำตอบกุญแจ 3 ${opText} อีกครั้ง ต้องได้คำตอบกุญแจ 2`, ok: false, why: 'การตรวจต้องใช้การดำเนินการตรงข้าม (บวกกับลบ คูณกับหาร)' },
          { text: 'ดูว่าคำตอบมีทศนิยมหรือไม่ก็พอ', ok: false, why: 'การมีทศนิยมไม่ได้บอกว่าคำนวณถูก ต้องคำนวณย้อนกลับ' }
        ], { skill: 'planning', solution: [`${t(key3)} ${!useMul ? `− ${t(c * 2)}` : divide ? `× ${k}` : `÷ ${k}`} = ${t(key2)} ตรงกับกุญแจ 2 แสดงว่าถูกต้อง`] }),
        choiceStep('หีบที่ถูกต้องคือหีบที่มีรหัสเท่ากับคำตอบกุญแจ 3 จะเปิดหีบใด', chests.map((v, i) => ({
          text: `หีบที่ ${i + 1}: รหัส ${t(v)}`, ok: v === key3,
          why: v === shifted ? 'รหัสนี้วางจุดทศนิยมผิดตำแหน่ง' : v === misOp ? 'รหัสนี้ใช้การดำเนินการผิด' : 'รหัสนี้คลาดจากคำตอบที่ตรวจแล้ว'
        })), { keepOrder: true, skill: 'final', points: 5, solution: [`กุญแจ 3 = ${t(key3)} จึงเปิดหีบที่มีรหัส ${t(key3)}`] })
      );
      return {
        title: story.title, icon: story.icon,
        story: ['ไขกุญแจทีละดอก คำตอบของกุญแจแต่ละดอกเป็นข้อมูลของดอกถัดไป', `ข้อมูลที่พบ: ${story.extra}`],
        context: [], steps
      };
    }, 'treasure');
  }

  // ── Data detective ────────────────────────────────────
  const DETECTIVE_TOPICS = [
    { topic: 'ผลไม้ที่ชอบ', unit: 'คน', cats: ['มะม่วง', 'กล้วย', 'ส้ม', 'แตงโม', 'มังคุด'], groups: ['ห้อง ป.5/1', 'ห้อง ป.5/2', 'ห้อง ป.5/3'], priceTitle: 'ราคาผลไม้ (บาทต่อผล)', priceRange: [5, 25] },
    { topic: 'กีฬาที่อยากเล่น', unit: 'คน', cats: ['ฟุตบอล', 'แบดมินตัน', 'ว่ายน้ำ', 'บาสเกตบอล', 'วิ่ง'], groups: ['ห้อง ป.5/1', 'ห้อง ป.5/2', 'ห้อง ป.5/3'], priceTitle: 'ค่าอุปกรณ์ต่อคน (บาท)', priceRange: [20, 90] },
    { topic: 'หนังสือที่ยืมจากห้องสมุด', unit: 'เล่ม', cats: ['นิทาน', 'การ์ตูนความรู้', 'สารคดี', 'นิยาย', 'วิทยาศาสตร์'], groups: ['เดือนมิถุนายน', 'เดือนกรกฎาคม', 'เดือนสิงหาคม'], priceTitle: 'ค่าปรับคืนช้า (บาทต่อเล่ม)', priceRange: [2, 10] }
  ];
  const detectiveData = (level, topic) => {
    const count = level === 'easy' ? 4 : 5, top = level === 'easy' ? 12 : 30;
    return retry(() => {
      const cats = topic.cats.slice(0, count);
      const groups = topic.groups.map(() => cats.map(() => rnd(2, top)));
      const both = cats.map((_, i) => groups[0][i] + groups[1][i]);
      if (new Set(both).size !== count || new Set(groups[0]).size !== count) return null;
      const changes = cats.map((_, i) => groups[1][i] - groups[0][i]);
      const best = Math.max(...changes);
      if (best <= 0 || changes.filter(c => c === best).length > 1 || sum(changes) <= 0) return null;
      return { cats, groups, both, changes, prices: cats.map(() => rnd(topic.priceRange[0], topic.priceRange[1])) };
    }, 'detective data');
  };
  const groupTable = (topic, data, gi, n) => table(`ตาราง ${n}: ${topic.topic} (${topic.groups[gi]})`, ['รายการ', `จำนวน (${topic.unit})`], data.cats.map((c, i) => [c, String(data.groups[gi][i])]));
  const priceTable = (topic, data, n) => table(`ตาราง ${n}: ${topic.priceTitle}`, ['รายการ', 'ราคา'], data.cats.map((c, i) => [c, String(data.prices[i])]));

  function detectiveCombine(level) {
    const topic = pick(DETECTIVE_TOPICS), d = detectiveData(level, topic), u = topic.unit;
    const best = d.both.indexOf(Math.max(...d.both));
    const cat = rnd(0, d.cats.length - 1);
    const [g1, g2] = topic.groups;
    const gap = d.groups[0][cat] - d.groups[1][cat];
    const context = [groupTable(topic, d, 0, 1), groupTable(topic, d, 1, 2)];
    if (level !== 'easy') context.push(priceTable(topic, d, 3));
    return {
      title: 'รวมข้อมูลสองตาราง', icon: '🕵️',
      story: [`นักสืบได้ตารางข้อมูล${topic.topic}${level !== 'easy' ? ' และตารางอื่นที่อาจไม่เกี่ยวข้อง' : ''}`, `ภารกิจ: หาว่ารายการใดได้รับความนิยมมากที่สุดเมื่อรวม${g1}และ${g2}`],
      context,
      steps: [
        choiceStep(`ต้องใช้ตารางใดเพื่อหาจำนวนรวมของ${g1}และ${g2}`, [
          { text: 'ตาราง 1 และตาราง 2', ok: true, why: '' },
          { text: 'ตาราง 1 อย่างเดียว', ok: false, why: `ตาราง 1 มีเฉพาะ${g1} ยังขาด${g2}` },
          ...(level !== 'easy' ? [{ text: 'ตาราง 2 และตาราง 3', ok: false, why: `ตาราง 3 เป็นราคา ไม่ใช่จำนวน${u}` }] : [{ text: 'ตาราง 2 อย่างเดียว', ok: false, why: `ตาราง 2 มีเฉพาะ${g2}` }])
        ], { keepOrder: true, points: 5, solution: ['ต้องใช้ทั้งสองกลุ่ม จึงใช้ตาราง 1 และ 2 เท่านั้น'] }),
        choiceStep('เมื่อรวมสองกลุ่ม รายการใดมีจำนวนมากที่สุด', d.cats.map((c, i) => ({ text: c, ok: i === best, why: `${c} รวมได้ ${d.groups[0][i]} + ${d.groups[1][i]} = ${d.both[i]} ${u} น้อยกว่า ${d.cats[best]} ที่รวมได้ ${d.both[best]}` })),
          { keepOrder: true, hints: ['บวกจำนวนของแต่ละรายการจากทั้งสองตารางก่อนเปรียบเทียบ', 'อย่าดูเพียงตารางเดียว รายการที่มากที่สุดในตารางเดียวอาจไม่มากที่สุดเมื่อรวม'], solution: d.cats.map((c, i) => `${c}: ${d.groups[0][i]} + ${d.groups[1][i]} = ${d.both[i]}`) }),
        numberStep(`รายการนั้นมีจำนวนรวมกี่${u}`, d.both[best], { hints: ['ใช้ผลบวกจากขั้นก่อน'], solution: [`${d.groups[0][best]} + ${d.groups[1][best]} = ${d.both[best]} ${u}`] }),
        numberStep(`${d.cats[cat]}: ${gap >= 0 ? g1 : g2}มากกว่า${gap >= 0 ? g2 : g1}กี่${u}`, Math.abs(gap), { skill: 'final', hints: ['หาค่าของรายการนี้ในทั้งสองตาราง แล้วลบกัน'], solution: [`${Math.max(d.groups[0][cat], d.groups[1][cat])} − ${Math.min(d.groups[0][cat], d.groups[1][cat])} = ${Math.abs(gap)} ${u}`] })
      ]
    };
  }

  function detectiveChange(level) {
    const topic = DETECTIVE_TOPICS[2], d = detectiveData(level, topic), u = topic.unit;
    const best = d.changes.indexOf(Math.max(...d.changes));
    return {
      title: 'ห้องสมุดคึกคักขึ้นไหม', icon: '📚',
      story: ['บรรณารักษ์อยากรู้ว่าหนังสือประเภทใดถูกยืมเพิ่มขึ้นมากที่สุด จากเดือนมิถุนายนไปเดือนกรกฎาคม'],
      context: [groupTable(topic, d, 0, 1), groupTable(topic, d, 1, 2), ...(level === 'easy' ? [] : [priceTable(topic, d, 3)])],
      steps: [
        choiceStep('ประเภทใดถูกยืมเพิ่มขึ้นมากที่สุด', d.cats.map((c, i) => ({ text: c, ok: i === best, why: `${c}: ${d.groups[1][i]} − ${d.groups[0][i]} = ${d.changes[i]}` })),
          { keepOrder: true, hints: ['หาผลต่าง (ก.ค. − มิ.ย.) ของทุกประเภท', 'ผลต่างที่ติดลบแปลว่าลดลง'], solution: d.cats.map((c, i) => `${c}: ${d.groups[1][i]} − ${d.groups[0][i]} = ${d.changes[i]}`) }),
        numberStep('ประเภทนั้นเพิ่มขึ้นกี่เล่ม', d.changes[best], { unit: u, solution: [`${d.groups[1][best]} − ${d.groups[0][best]} = ${d.changes[best]} ${u}`] }),
        numberStep('เดือนกรกฎาคมมีการยืมรวมทุกประเภทมากกว่าเดือนมิถุนายนกี่เล่ม', sum(d.changes), {
          unit: u, skill: 'final', hints: ['หาผลรวมของแต่ละเดือนก่อน แล้วลบกัน'],
          solution: [`มิ.ย. รวม ${sum(d.groups[0])} · ก.ค. รวม ${sum(d.groups[1])}`, `${sum(d.groups[1])} − ${sum(d.groups[0])} = ${sum(d.changes)} ${u}`]
        })
      ]
    };
  }

  function detectiveCost(level) {
    const topic = pick(DETECTIVE_TOPICS.slice(0, 2)), d = detectiveData(level, topic), u = topic.unit;
    const best = d.groups[0].indexOf(Math.max(...d.groups[0])), count = d.groups[0][best], cost = count * d.prices[best];
    return {
      title: 'งบเลี้ยงห้อง', icon: '💰',
      story: [`ครูจะซื้อ${topic.topic === 'ผลไม้ที่ชอบ' ? 'ผลไม้' : 'อุปกรณ์'}ที่${topic.groups[0]}เลือกมากที่สุด ให้ทุกคนที่เลือกรายการนั้น คนละ 1 ชิ้น`],
      context: [groupTable(topic, d, 0, 1), groupTable(topic, d, 1, 2), priceTable(topic, d, 3)],
      steps: [
        choiceStep('ตารางใดไม่จำเป็นต่อการคำนวณครั้งนี้', [
          { text: 'ตาราง 2', ok: true, why: '' },
          { text: 'ตาราง 1', ok: false, why: `ต้องใช้ตาราง 1 หาว่า${topic.groups[0]}เลือกอะไรมากที่สุด` },
          { text: 'ตาราง 3', ok: false, why: 'ต้องใช้ตาราง 3 หาราคา' }
        ], { keepOrder: true, points: 5, solution: [`ภารกิจถามเฉพาะ${topic.groups[0]} ตาราง 2 จึงเป็นข้อมูลส่วนเกิน`] }),
        choiceStep(`${topic.groups[0]}เลือกรายการใดมากที่สุด`, d.cats.map((c, i) => ({ text: c, ok: i === best, why: `${c} มี ${d.groups[0][i]} ${u} ในตาราง 1` })), { keepOrder: true, solution: [`${d.cats[best]} = ${count} ${u} มากที่สุดในตาราง 1`] }),
        numberStep('ครูต้องจ่ายเงินกี่บาท', cost, { unit: 'บาท', skill: 'final', points: 15, hints: [`จำนวนคน × ราคาต่อชิ้นของ${d.cats[best]}`, 'ราคาอยู่ในตาราง 3'], solution: [`${count} × ${d.prices[best]} = ${cost} บาท`] })
      ]
    };
  }

  function detectiveClaim(level) {
    const topic = pick(DETECTIVE_TOPICS.slice(0, 2)), d = detectiveData(level, topic), u = topic.unit;
    const more = d.cats.filter((_, i) => d.groups[1][i] > d.groups[0][i]);
    const truth = more.length === d.cats.length;
    const exception = d.cats.find((_, i) => d.groups[1][i] <= d.groups[0][i]);
    const totalGap = sum(d.groups[1]) - sum(d.groups[0]);
    return {
      title: 'ข่าวลือในโรงเรียน', icon: '📣',
      story: [`มีคนกล่าวว่า “${topic.groups[1]}มีคนเลือกมากกว่า${topic.groups[0]}ทุกรายการ เพราะรวมแล้วมากกว่า”`],
      context: [groupTable(topic, d, 0, 1), groupTable(topic, d, 1, 2), priceTable(topic, d, 3)],
      steps: [
        numberStep(`${topic.groups[1]}รวมมากกว่า${topic.groups[0]}กี่${u}`, totalGap, { unit: u, hints: ['หาผลรวมของแต่ละตารางก่อน'], solution: [`${sum(d.groups[1])} − ${sum(d.groups[0])} = ${totalGap}`] }),
        choiceStep('คำกล่าวนี้ถูกต้องหรือไม่ เพราะอะไร', [
          { text: 'ถูก เพราะผลรวมมากกว่า แสดงว่ามากกว่าทุกรายการ', ok: false, why: 'ผลรวมมากกว่าไม่ได้แปลว่าทุกรายการมากกว่า ต้องตรวจทีละรายการ' },
          { text: truth ? 'ถูก เพราะตรวจแล้วทุกรายการในตาราง 2 มากกว่าตาราง 1' : `ไม่ถูก เพราะ${exception}ในตาราง 2 ไม่ได้มากกว่าตาราง 1`, ok: true, why: '' },
          { text: 'ตอบไม่ได้ เพราะต้องใช้ตาราง 3', ok: false, why: 'ตาราง 3 เป็นราคา ไม่เกี่ยวกับจำนวนคนที่เลือก' }
        ], { skill: 'interpretation', points: 15, hints: ['เทียบทีละรายการระหว่างตาราง 1 และ 2'], solution: d.cats.map((c, i) => `${c}: ${d.groups[0][i]} กับ ${d.groups[1][i]}`) }),
        numberStep(`มีกี่รายการที่${topic.groups[1]}มากกว่า${topic.groups[0]}จริง`, more.length, { unit: 'รายการ', skill: 'final', solution: [`รายการที่มากกว่า: ${more.join(', ') || 'ไม่มี'}`] })
      ]
    };
  }

  const GENERATORS = {
    math_pizza_chef: { size: 3, pools: {
      easy: [pizzaShare, pizzaSupply, pizzaCompare], medium: [pizzaSupply, pizzaCompare, pizzaShare],
      hard: [pizzaRules, pizzaSupply, pizzaCompare], challenge: [pizzaExact, pizzaRules, pizzaSupply] } },
    math_chart_builder: { size: 2, pools: {
      easy: [chartTemplate('build'), chartTemplate('fix')], medium: [chartTemplate('build'), chartTemplate('fix')],
      hard: [chartTemplate('build'), chartTemplate('fix')], challenge: [chartTemplate('claim'), chartTemplate('fix')] } },
    math_fraction_quest: { size: 3, pools: {
      easy: [fracRibbon, fracTank, fracRecipe], medium: [fracRibbon, fracCritique, fracTank, fracRecipe],
      hard: [fracCritique, fracTank, fracRecipe, fracBatch, fracRibbon], challenge: [fracBatch, fracRibbon, fracCritique, fracRecipe] } },
    math_decimal_shop: { size: 3, pools: {
      easy: [shopCart, shopPromo, shopMax], medium: [shopCart, shopPromo, shopMax],
      hard: [shopPromo, shopMax, shopPlans, shopCart], challenge: [shopPlans, shopPromo, shopMax] } },
    math_decimal_treasure: { size: 2, pools: { easy: [treasureChain, treasureChain], medium: [treasureChain, treasureChain], hard: [treasureChain, treasureChain], challenge: [treasureChain, treasureChain] } },
    math_data_detective: { size: 3, pools: {
      easy: [detectiveCombine, detectiveChange, detectiveCost], medium: [detectiveCombine, detectiveChange, detectiveCost],
      hard: [detectiveCombine, detectiveCost, detectiveChange, detectiveClaim], challenge: [detectiveClaim, detectiveCombine, detectiveCost] } }
  };

  function buildRound(code, level) {
    const gen = GENERATORS[code];
    if (!gen) return null;
    chartTemplate.used = new Set();
    treasureChain.used = new Set();
    const pool = gen.pools[level] || gen.pools.medium;
    const chosen = pool.length > gen.size ? sample(pool, gen.size) : shuffle(pool);
    return chosen.map(make => ({ ...make(level), difficulty: level }));
  }

  // ── Checking ──────────────────────────────────────────
  const unitSuffix = s => s.unit ? ` ${s.unit}` : '';
  const valueText = (s, v) => s.kind === 'fraction' ? fText(v) : s.kind === 'fixed' ? (s.money ? baht(v) : decText(v, s.places)) : String(v);
  function answerText(s) {
    if (s.kind === 'choice') return s.options[s.answer].text;
    if (s.kind === 'plan') return s.fields.map(f => `${f.label}: ${f.options[f.answer].text}`).join(' · ');
    if (s.kind === 'pizza' || s.kind === 'chart') return s.solution.join(' · ');
    return valueText(s, s.answer) + unitSuffix(s);
  }
  const sameValue = (s, a, b) => s.kind === 'fraction' ? fCmp(a, b) === 0 : a === b;
  const compareValue = (s, v) => {
    if (sameValue(s, v, s.answer)) return { ok: true, why: [] };
    const known = (s.mistakes || []).find(m => sameValue(s, m.value, v));
    if (known) return { ok: false, why: [known.why] };
    const bigger = s.kind === 'fraction' ? fCmp(v, s.answer) > 0 : v > s.answer;
    return { ok: false, why: [`คำตอบนี้${bigger ? 'มากเกินไป' : 'น้อยเกินไป'} ลองตรวจการคำนวณทีละขั้นอีกครั้ง`] };
  };
  const STEP_CHECKS = {
    number(s, text) {
      const t = String(text ?? '').trim().replace(/,/g, '');
      if (!/^-?\d+$/.test(t)) return { invalid: 'พิมพ์คำตอบเป็นจำนวนเต็ม' };
      return { ...compareValue(s, Number(t)), shown: `${t}${unitSuffix(s)}` };
    },
    fixed(s, text) {
      const v = parseFixed(text, s.places);
      if (v === null) return { invalid: `พิมพ์เป็นทศนิยมไม่เกิน ${s.places} ตำแหน่ง เช่น ${decText(12 * 10 ** s.places + 5, s.places)}` };
      return { ...compareValue(s, v), shown: valueText(s, v) + unitSuffix(s) };
    },
    fraction(s, text) {
      const v = parseFraction(text);
      if (!v) return { invalid: 'พิมพ์เศษส่วน เช่น 3/4 หรือจำนวนคละ เช่น 1 1/2 (เว้นวรรคหลังจำนวนเต็ม)' };
      return { ...compareValue(s, v), shown: String(text).trim() + unitSuffix(s) };
    },
    choice(s, index) {
      if (!Number.isInteger(index)) return { invalid: 'เลือกคำตอบก่อน' };
      const option = s.options[index];
      return { ok: index === s.answer, why: index === s.answer ? [] : [option.why || 'ยังไม่ถูก ลองพิจารณาอีกครั้ง'], shown: option.text };
    },
    plan(s, picks) {
      if (s.fields.some(f => !Number.isInteger(picks?.[f.id]))) return { invalid: 'เลือกให้ครบทุกหัวข้อก่อนส่ง' };
      const wrong = s.fields.filter(f => picks[f.id] !== f.answer);
      return { ok: !wrong.length, why: wrong.map(f => `${f.label}: ${f.options[picks[f.id]].why}`), wrongFields: wrong.map(f => f.id), shown: s.fields.map(f => f.options[picks[f.id]].text).join(' · ') };
    },
    pizza(s, board) {
      const { cut, assign } = board, why = [];
      const counts = s.orders.map((_, i) => assign.flat().filter(v => v === i).length);
      const bad = s.orders.find(o => cut % o.f.d !== 0);
      if (bad) why.push(`ตัดถาดละ ${cut} ชิ้นแบ่ง ${fText(bad.f)} ถาดให้พอดีไม่ได้ เพราะ ${cut} หารด้วย ${bad.f.d} ไม่ลงตัว ลองเปลี่ยนวิธีตัด`);
      else s.orders.forEach((o, i) => {
        const need = slicesOf(o.f, cut);
        if (counts[i] !== need) why.push(`${o.name} สั่ง ${fText(o.f)} ถาด แต่ได้ ${fText(fr(counts[i], cut))} ถาด (${counts[i] < need ? 'ขาด' : 'เกิน'} ${Math.abs(need - counts[i])} ชิ้น)`);
      });
      const traysWith = i => assign.map((tray, t) => tray.includes(i) ? t : -1).filter(t => t >= 0);
      if (s.together) {
        const used = new Set(s.together.flatMap(traysWith));
        if (used.size > 1) why.push(`${s.orders[s.together[0]].name} กับ ${s.orders[s.together[1]].name} ต้องได้จากถาดเดียวกัน`);
      }
      if (s.own !== null && s.own !== undefined && traysWith(s.own).some(t => assign[t].some(v => v >= 0 && v !== s.own))) why.push(`ถาดของ${s.orders[s.own].name}ต้องไม่มีชิ้นของคนอื่น`);
      const usedTrays = assign.filter(tray => tray.some(v => v >= 0)).length;
      if (!why.length && s.minTrays && usedTrays > s.minTrays) why.push(`ใช้ไป ${usedTrays} ถาด แต่จัดได้ด้วย ${s.minTrays} ถาด ลองรวมชิ้นให้อยู่ถาดเดียวกันมากขึ้น`);
      return { ok: !why.length, why, shown: `${s.orders.map((o, i) => `${o.name} ${counts[i]}/${cut}`).join(', ')} · ใช้ ${usedTrays} ถาด` };
    },
    chart(s, build) {
      const why = [];
      if (build.order.some(label => !label)) return { invalid: 'วางหมวดหมู่บนแกน X ให้ครบทุกช่องก่อน' };
      if (build.order.join('|') !== s.order.join('|')) why.push(s.orderRule === 'desc' ? 'ลำดับบนแกน X ต้องเรียงจากค่ามากไปน้อย' : 'ลำดับบนแกน X ต้องเรียงตามลำดับในตาราง');
      s.labels.forEach((label, i) => {
        const v = build.values[label] ?? 0;
        if (v !== s.values[i]) why.push(`${label}: ${s.defaultType === 'line' ? 'จุด' : 'แท่ง'}${v > s.values[i] ? 'สูงเกินไป' : 'ต่ำเกินไป'} ตรวจกับตารางอีกครั้ง`);
      });
      return { ok: !why.length, why, shown: build.order.map(label => `${label} ${build.values[label] ?? 0}`).join(', ') };
    }
  };
  const checkStep = (s, input) => STEP_CHECKS[s.kind](s, input);

  // ── Stored missions (Supabase rows edited by teachers) ──
  function makeMission(code, level, index) {
    const pool = GENERATORS[code].pools[level] || GENERATORS[code].pools.medium;
    chartTemplate.used = new Set();
    treasureChain.used = new Set();
    const make = Number.isInteger(index) ? pool[index % pool.length] : pick(pool);
    return { ...make(level), difficulty: level };
  }

  const isText = v => typeof v === 'string' && v.trim() !== '';
  const isInt = v => Number.isInteger(v);
  const isFrac = f => f && isInt(f.n) && isInt(f.d) && f.d > 0;
  const okCount = options => options.filter(o => o.ok).length;
  const pizzaFeasible = s => {
    const fracs = s.orders.map(o => o.f), cut = bestCut(fracs);
    const slices = fracs.map(f => slicesOf(f, cut));
    if (s.together && slices[s.together[0]] + slices[s.together[1]] > cut) return 'สองออเดอร์ที่ต้องอยู่ถาดเดียวกันรวมกันเกิน 1 ถาด';
    if (minTraysFor(s.orders, s.together, s.own) > s.trays) return `ถาดไม่พอ ต้องใช้อย่างน้อย ${minTraysFor(s.orders, s.together, s.own)} ถาด`;
    return null;
  };

  // Recomputes every field a teacher should not hand-edit, so a saved mission stays self-consistent.
  function normalizeMission(m) {
    m.steps.forEach(s => {
      if (s.kind === 'fraction' && isFrac(s.answer)) s.answer = fr(s.answer.n, s.answer.d);
      if (s.kind === 'choice' && Array.isArray(s.options)) s.answer = s.options.findIndex(o => o.ok);
      if (s.kind === 'plan' && Array.isArray(s.fields)) s.fields.forEach(f => { f.answer = f.options.findIndex(o => o.ok); });
      if (s.mistakes) s.mistakes = s.mistakes.filter(x => !sameValue(s, x.value, s.answer));
      if (s.kind === 'pizza' && Array.isArray(s.orders) && s.orders.every(o => isFrac(o.f))) {
        s.orders.forEach(o => { o.f = fr(o.f.n, o.f.d); });
        if (!s.together || s.together.length !== 2) s.together = null;
        if (!isInt(s.own)) s.own = null;
        if (bestCut(s.orders.map(o => o.f))) {
          const built = pizzaStep({ orders: s.orders, trays: s.trays, together: s.together, own: s.own, minTrays: s.minTrays ? minTraysFor(s.orders, s.together, s.own) : null });
          Object.assign(s, { defaultCut: built.defaultCut, minTrays: built.minTrays, solution: built.solution });
        }
      }
      if (s.kind === 'chart' && Array.isArray(s.labels) && Array.isArray(s.values)) {
        const max = Math.max(...s.values);
        s.order = s.orderRule === 'desc' ? s.labels.map((l, i) => [l, s.values[i]]).sort((a, b) => b[1] - a[1]).map(r => r[0]) : [...s.labels];
        s.defaultScale = scaleFor(max, s.grid) || s.defaultScale;
        if (!s.fine || s.values.some(v => v % s.fine)) s.fine = s.values.reduce(gcd, 0) || 1;
        s.solution = [`ลำดับแกน X: ${s.order.join(' → ')}`, ...s.labels.map((l, i) => `${l} = ${s.values[i]} ${s.unit}`)];
      }
    });
    return m;
  }

  // Thai messages a teacher can act on; an empty list means the mission is playable.
  function validateMission(m) {
    const errors = [];
    if (!m || typeof m !== 'object') return ['ข้อมูลภารกิจไม่ถูกต้อง'];
    if (!isText(m.title)) errors.push('ใส่ชื่อภารกิจ');
    if (!['easy', 'medium', 'hard', 'challenge'].includes(m.difficulty)) errors.push('เลือกระดับความยาก');
    if (!Array.isArray(m.story) || !m.story.every(isText)) errors.push('เรื่องราวต้องเป็นข้อความทีละบรรทัด');
    (Array.isArray(m.context) ? m.context : []).forEach((b, i) => {
      const at = `ข้อมูลประกอบที่ ${i + 1}`;
      if (b.type === 'table' && !(b.head.length && b.rows.every(r => r.length === b.head.length))) errors.push(`${at}: ทุกแถวต้องมีจำนวนช่องเท่ากับหัวตาราง`);
      if (b.type === 'note' && !isText(b.text)) errors.push(`${at}: ใส่ข้อความ`);
      if (b.type === 'chart') {
        if (b.labels.length !== b.values.length || !b.values.every(isInt)) errors.push(`${at}: ค่ากราฟต้องเป็นจำนวนเต็มครบทุกหมวด`);
        if (b.ticks.length < 2 || !b.ticks.every((t, k) => isInt(t) && (!k || t > b.ticks[k - 1]))) errors.push(`${at}: ตัวเลขแกน Y ต้องเป็นจำนวนเต็มเรียงจากน้อยไปมาก`);
      }
    });
    if (!Array.isArray(m.steps) || !m.steps.length) return errors.concat('ภารกิจต้องมีอย่างน้อย 1 ขั้น');
    m.steps.forEach((s, i) => {
      const at = `ขั้นที่ ${i + 1}`, bad = text => errors.push(`${at}: ${text}`);
      if (!STEP_CHECKS[s.kind]) return bad('ชนิดคำถามไม่รู้จัก');
      if (!isText(s.prompt)) bad('ใส่คำถาม');
      if (!isInt(s.points) || s.points < 1) bad('คะแนนต้องเป็นจำนวนเต็มบวก');
      if (!Array.isArray(s.hints) || !s.hints.every(isText)) bad('คำใบ้ต้องเป็นข้อความทีละบรรทัด');
      if (!Array.isArray(s.solution) || !s.solution.length || !s.solution.every(isText)) bad('ใส่วิธีทำอย่างน้อย 1 บรรทัด');
      if (s.kind === 'number' && !isInt(s.answer)) bad('คำตอบต้องเป็นจำนวนเต็ม');
      if (s.kind === 'fixed' && !isInt(s.answer)) bad(`คำตอบต้องเป็นทศนิยมไม่เกิน ${s.places} ตำแหน่ง`);
      if (s.kind === 'fraction' && !isFrac(s.answer)) bad('คำตอบต้องเป็นเศษส่วน เช่น 3/4');
      if (s.kind === 'choice' && (s.options.length < 2 || !s.options.every(o => isText(o.text)) || okCount(s.options) !== 1)) bad('ต้องมีตัวเลือกอย่างน้อย 2 ข้อ และคำตอบถูกเพียง 1 ข้อ');
      if (s.kind === 'plan') s.fields.forEach(f => {
        if (!isText(f.label) || f.options.length < 2 || !f.options.every(o => isText(o.text)) || okCount(f.options) !== 1) bad(`หัวข้อ "${f.label || '?'}" ต้องมีตัวเลือกอย่างน้อย 2 ข้อ และคำตอบถูกเพียง 1 ข้อ`);
      });
      if (s.kind === 'pizza') {
        if (s.orders.length < 1 || s.orders.length > PIZZA_MAX_ORDERS) return bad(`ออเดอร์ต้องมี 1–${PIZZA_MAX_ORDERS} รายการ`);
        if (!s.orders.every(o => isText(o.name))) bad('ใส่ชื่อลูกค้าทุกคน');
        if (new Set(s.orders.map(o => o.name)).size !== s.orders.length) bad('ชื่อลูกค้าต้องไม่ซ้ำกัน');
        if (!s.orders.every(o => isFrac(o.f) && o.f.n > 0 && o.f.n <= o.f.d)) return bad('แต่ละออเดอร์ต้องเป็นเศษส่วนที่มากกว่า 0 และไม่เกิน 1 ถาด');
        if (!bestCut(s.orders.map(o => o.f))) return bad(`ตัวส่วนของออเดอร์ต้องแบ่งได้ด้วยการตัดถาดละ ${CUTS.join(', ')} ชิ้น`);
        if (!isInt(s.trays) || s.trays < 1 || s.trays > 6) return bad('จำนวนถาดต้องเป็น 1–6');
        const idx = k => isInt(k) && k >= 0 && k < s.orders.length;
        if (s.together && !(s.together.every(idx) && s.together[0] !== s.together[1])) return bad('เลือกคู่ลูกค้าที่ต้องได้จากถาดเดียวกันใหม่');
        if (s.own !== null && s.own !== undefined && (!idx(s.own) || (s.together || []).includes(s.own))) return bad('ลูกค้าที่ขอถาดแยกต้องไม่อยู่ในคู่ถาดเดียวกัน');
        const why = pizzaFeasible(s);
        if (why) bad(why);
      }
      if (s.kind === 'chart') {
        if (s.labels.length < 2 || s.labels.length > 8 || !s.labels.every(isText) || new Set(s.labels).size !== s.labels.length) bad('หมวดหมู่ต้องมี 2–8 ชื่อและไม่ซ้ำกัน');
        if (s.labels.length !== s.values.length || !s.values.every(v => isInt(v) && v >= 0)) return bad('ค่าของทุกหมวดต้องเป็นจำนวนเต็มตั้งแต่ 0');
        if (!scaleFor(Math.max(...s.values), s.grid)) bad(`ค่ามากเกินกว่าจะวาดใน ${s.grid} ช่อง`);
        if (s.orderRule === 'desc' && new Set(s.values).size !== s.values.length) bad('เรียงจากมากไปน้อยได้เมื่อค่าไม่ซ้ำกัน');
      }
    });
    const chart = m.steps.find(s => s.kind === 'chart');
    const plan = m.steps.find(s => s.kind === 'plan');
    if (chart && plan && !errors.length) {
      const answerOf = id => { const f = plan.fields.find(x => x.id === id); return f && f.options.find(o => o.ok).value; };
      const scale = scaleFor(Math.max(...chart.values), chart.grid);
      if (answerOf('scale') !== undefined && answerOf('scale') !== scale) errors.push(`สเกลที่ถูกในขั้นวางแผนควรเป็น ${scale} ให้ตรงกับค่าในขั้นสร้างกราฟ`);
      if (answerOf('type') !== undefined && answerOf('type') !== chart.defaultType) errors.push('ชนิดกราฟที่ถูกในขั้นวางแผนต้องตรงกับชนิดกราฟในขั้นสร้างกราฟ');
    }
    return errors;
  }

  window.MathKit = {
    fr, fText, fCmp, bestCut, CUTS, buildRound, checkStep, answerText, hasMissions: code => Boolean(GENERATORS[code]), GENERATORS,
    roundSize: code => GENERATORS[code].size,
    makeMission, normalizeMission, validateMission, parseFraction, parseFixed, decText, PIZZA_MAX_ORDERS
  };
})();
