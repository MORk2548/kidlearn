// game_types.js - แบบเกมที่ครูเลือกได้ หน้าสร้างเกมและหน้าเล่นเกมอ่านจากตารางนี้ที่เดียว
// รูปแบบคำถามของแต่ละแบบตรงกับที่ save_teacher_game / game_play ใน backend.php รับและคืน
//
// แต่ละแบบมี
//   label, icon, desc       ใช้ในการ์ดเลือกแบบเกม
//   emptyQuestion()         คำถามว่างสำหรับปุ่ม "เพิ่มข้อ"
//   editorHtml(q)           ช่องกรอกของคำถามหนึ่งข้อ
//   readEditor(root)        อ่านช่องกรอกกลับเป็นคำถาม
//   points(q)               จำนวนจุดที่ให้คะแนนในข้อนั้น (ข้อแบบเลือกตอบ = 1, จับคู่ = จำนวนคู่)
//   render(q, root, done)   หน้าเล่นคำถามหนึ่งข้อ ตอบเสร็จเรียก done(จำนวนจุดที่ถูก)
//                           คะแนนเกม = จุดที่ถูกทั้งหมด / points ของทุกข้อ × 100

function _gtEsc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function _gtTextField(label, key, value, placeholder = '') {
  return `<label class="fg" style="display:block"><span class="fl">${label}</span>
    <input class="fc" data-k="${key}" value="${_gtEsc(value)}" placeholder="${_gtEsc(placeholder)}"></label>`;
}

// radio ของแต่ละข้อต้องมี name ไม่ซ้ำกัน ไม่อย่างนั้นทุกข้อในหน้าจะเป็นกลุ่มเดียวกัน
let _gtRadioSeq = 0;
const _gtRadioName = () => `gt-radio-${++_gtRadioSeq}`;

const _gtExplanationField = (q) => _gtTextField('คำอธิบายเฉลย (ไม่บังคับ)', 'explanation', q.explanation);
const _gtRead = (root, key) => root.querySelector(`[data-k="${key}"]`)?.value.trim() ?? '';

function _gtQuestionText(q) {
  return `<div class="gq-text">${_gtEsc(q.text)}</div>`;
}

// ปิดปุ่มทั้งหมด ระบายสีถูก/ผิด แล้วแจ้งผล
function _gtFinishChoice(root, picked, correctBtn, done) {
  root.querySelectorAll('button').forEach(b => { b.disabled = true; });
  correctBtn.classList.add('ok');
  if (picked !== correctBtn) picked.classList.add('no');
  done(picked === correctBtn ? 1 : 0);
}

// ── แถวที่เพิ่ม/ลบได้ (คู่ของจับคู่/โยงเส้น และรายการของเรียงลำดับ) ต้องมี 3-6 แถวตามที่ backend รับ ──
const GT_MIN_ROWS = 3, GT_MAX_ROWS = 6;

function _gtRowsField(label, addLabel, rows) {
  return `<div class="fl">${label}</div>
    <div class="ge-rows">${rows.join('')}</div>
    <button type="button" class="btn btn-sm ge-add" onclick="_gtAddRow(this)"${rows.length >= GT_MAX_ROWS ? ' hidden' : ''}>➕ ${addLabel}</button>`;
}

const _gtRemoveBtn = (count) =>
  `<button type="button" class="btn btn-sm ge-remove" onclick="_gtRemoveRow(this)" aria-label="ลบแถวนี้"${count <= GT_MIN_ROWS ? ' disabled' : ''}>✕</button>`;

function _gtSyncRows(rowsEl) {
  const rows = rowsEl.querySelectorAll('.ge-row');
  rowsEl.parentElement.querySelector('.ge-add').hidden = rows.length >= GT_MAX_ROWS;
  rowsEl.querySelectorAll('.ge-remove').forEach(b => { b.disabled = rows.length <= GT_MIN_ROWS; });
}

function _gtAddRow(btn) {
  const rowsEl = btn.parentElement.querySelector('.ge-rows');
  const row = rowsEl.lastElementChild.cloneNode(true);
  row.querySelectorAll('input').forEach(el => { el.value = ''; });
  rowsEl.appendChild(row);
  _gtSyncRows(rowsEl);
  row.querySelector('input').focus();
}

function _gtRemoveRow(btn) {
  const rowsEl = btn.closest('.ge-rows');
  btn.closest('.ge-row').remove();
  _gtSyncRows(rowsEl);
}

function _gtShuffle(items) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// สลับจนลำดับไม่เหมือนเฉลย ไม่อย่างนั้นบางครั้งเด็กจะได้ข้อที่เรียงถูกอยู่แล้ว
function _gtShuffleNotSame(items) {
  let out = _gtShuffle(items);
  while (items.length > 1 && out.every((x, i) => x === items[i])) out = _gtShuffle(items);
  return out;
}

const _gtPairsEditor = {
  points: (q) => q.pairs.length,
  emptyQuestion: () => ({ text: '', pairs: Array.from({ length: GT_MIN_ROWS }, () => ({ left: '', right: '' })), explanation: '' }),
  editorHtml(q) {
    const rows = q.pairs.map((p, i) => `
      <div class="ge-row">
        <input class="fc" data-k="left" value="${_gtEsc(p.left)}" placeholder="ฝั่งซ้าย" aria-label="คู่ที่ ${i + 1} ฝั่งซ้าย">
        <span aria-hidden="true">↔</span>
        <input class="fc" data-k="right" value="${_gtEsc(p.right)}" placeholder="ฝั่งขวา" aria-label="คู่ที่ ${i + 1} ฝั่งขวา">
        ${_gtRemoveBtn(q.pairs.length)}
      </div>`);
    return `${_gtTextField('คำสั่ง (ไม่บังคับ)', 'text', q.text, 'เช่น จับคู่คำศัพท์กับความหมาย')}
      ${_gtRowsField('คู่ที่ถูกต้อง (3-6 คู่) ตอนเล่นฝั่งขวาจะถูกสลับลำดับ', 'เพิ่มคู่', rows)}
      ${_gtExplanationField(q)}`;
  },
  readEditor(root) {
    return {
      text: _gtRead(root, 'text'),
      pairs: [...root.querySelectorAll('.ge-row')].map(row => ({
        left: row.querySelector('[data-k="left"]').value.trim(),
        right: row.querySelector('[data-k="right"]').value.trim(),
      })),
      explanation: _gtRead(root, 'explanation'),
    };
  },
};

const GT_PAIR_COLORS = ['#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

// จับคู่และโยงเส้นใช้การเล่นเดียวกัน: แตะฝั่งหนึ่งแล้วแตะอีกฝั่ง (เริ่มฝั่งไหนก็ได้) แตะของที่จับคู่แล้วเพื่อยกเลิก
// withLines = true วาดเส้นเชื่อมด้วย SVG และลากจากฝั่งซ้ายไปปล่อยที่ฝั่งขวาได้
function _gtRenderPairs(q, root, done, withLines) {
  const lefts = q.pairs.map(p => p.left);
  const rights = _gtShuffleNotSame(q.pairs.map(p => p.right));
  const pairs = new Map();
  let selected = null, checked = false;

  root.innerHTML = `${_gtQuestionText(q)}
    <div class="gq-pairs${withLines ? ' lines' : ''}">
      ${withLines ? '<svg class="gq-lines" aria-hidden="true"></svg>' : ''}
      <div class="gq-col">${lefts.map((t, i) => `<button type="button" class="gq-item" data-side="L" data-i="${i}">${_gtEsc(t)}</button>`).join('')}</div>
      <div class="gq-col">${rights.map((t, i) => `<button type="button" class="gq-item" data-side="R" data-i="${i}">${_gtEsc(t)}</button>`).join('')}</div>
    </div>
    <button type="button" class="btn btn-p gq-check" disabled>ตรวจคำตอบ</button>`;
  const wrap = root.querySelector('.gq-pairs');
  const svg = root.querySelector('.gq-lines');
  const item = (side, i) => root.querySelector(`.gq-item[data-side="${side}"][data-i="${i}"]`);
  const checkBtn = root.querySelector('.gq-check');
  const leftOf = (r) => [...pairs].find(([, rr]) => rr === r)?.[0];

  function center(el, side) {
    const box = el.getBoundingClientRect(), base = wrap.getBoundingClientRect();
    return { x: (side === 'L' ? box.right : box.left) - base.left, y: box.top + box.height / 2 - base.top };
  }
  function line(a, b, color, extra = '') {
    return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${color}" stroke-width="4" stroke-linecap="round" ${extra}/>`;
  }

  function paint(dragTo = null) {
    const colorOf = new Map([...pairs.keys()].sort((a, b) => a - b).map((l, n) => [l, GT_PAIR_COLORS[n % GT_PAIR_COLORS.length]]));
    root.querySelectorAll('.gq-item').forEach(el => {
      const side = el.dataset.side, i = +el.dataset.i;
      const l = side === 'L' ? (pairs.has(i) ? i : undefined) : leftOf(i);
      el.style.setProperty('--pair', l === undefined ? '' : colorOf.get(l));
      el.classList.toggle('paired', l !== undefined);
      el.classList.toggle('sel', selected?.side === side && selected.i === i);
      el.setAttribute('aria-pressed', String(selected?.side === side && selected.i === i));
      el.dataset.n = l === undefined ? '' : [...colorOf.keys()].indexOf(l) + 1;
    });
    checkBtn.disabled = checked || pairs.size !== lefts.length;
    if (!svg) return;
    svg.setAttribute('width', wrap.clientWidth);
    svg.setAttribute('height', wrap.clientHeight);
    svg.innerHTML = [...pairs].map(([l, r]) => {
      const color = checked ? (rights[r] === q.pairs[l].right ? '#10B981' : '#EF4444') : colorOf.get(l);
      return line(center(item('L', l), 'L'), center(item('R', r), 'R'), color);
    }).join('') + (dragTo ? line(dragTo.from, dragTo.to, '#94A3B8', 'stroke-dasharray="6 6"') : '');
  }

  function connect(l, r) {
    pairs.delete(l);
    const oldLeft = leftOf(r);
    if (oldLeft !== undefined) pairs.delete(oldLeft);
    pairs.set(l, r);
    selected = null;
  }

  function tap(side, i) {
    if (checked) return;
    const pairedHere = side === 'L' ? pairs.has(i) : leftOf(i) !== undefined;
    if (selected && selected.side !== side) {
      side === 'L' ? connect(i, selected.i) : connect(selected.i, i);
    } else if (pairedHere) {
      pairs.delete(side === 'L' ? i : leftOf(i));
      selected = { side, i };
    } else {
      selected = selected?.side === side && selected.i === i ? null : { side, i };
    }
    paint();
  }

  let suppressClick = false;
  root.querySelectorAll('.gq-item').forEach(el => el.addEventListener('click', () => {
    if (suppressClick) { suppressClick = false; return; }
    tap(el.dataset.side, +el.dataset.i);
  }));

  if (withLines) {
    root.querySelectorAll('.gq-item[data-side="L"]').forEach(el => {
      el.addEventListener('pointerdown', (e) => {
        if (checked) return;
        const start = { x: e.clientX, y: e.clientY };
        let dragging = false;
        const move = (ev) => {
          if (!dragging && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 8) return;
          dragging = true;
          const base = wrap.getBoundingClientRect();
          paint({ from: center(el, 'L'), to: { x: ev.clientX - base.left, y: ev.clientY - base.top } });
        };
        const up = (ev) => {
          el.removeEventListener('pointermove', move);
          el.removeEventListener('pointerup', up);
          el.removeEventListener('pointercancel', up);
          if (!dragging) return;
          suppressClick = true;
          setTimeout(() => { suppressClick = false; });
          const target = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.gq-item[data-side="R"]');
          if (target && wrap.contains(target)) connect(+el.dataset.i, +target.dataset.i);
          paint();
        };
        el.setPointerCapture(e.pointerId);
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerup', up);
        el.addEventListener('pointercancel', up);
      });
    });
    // วาดเส้นใหม่เมื่อขนาดเปลี่ยน (หมุนจอ ฟอนต์โหลดเสร็จ) และหยุดเมื่อข้อนี้ถูกลบออกจากหน้า
    const ro = new ResizeObserver(() => { if (!wrap.isConnected) ro.disconnect(); else paint(); });
    ro.observe(wrap);
  }

  checkBtn.addEventListener('click', () => {
    checked = true;
    selected = null;
    let correct = 0;
    pairs.forEach((r, l) => {
      const ok = rights[r] === q.pairs[l].right;
      correct += ok;
      item('L', l).classList.add(ok ? 'ok' : 'no');
      item('R', r).classList.add(ok ? 'ok' : 'no');
    });
    root.querySelectorAll('.gq-item').forEach(el => { el.disabled = true; });
    paint();
    done(correct);
  });
  paint();
}

const GAME_TYPES = {
  mcq: {
    label: 'ตอบคำถามสี่ตัวเลือก',
    icon: '🔤',
    desc: 'โจทย์ 1 ข้อ มี 4 ตัวเลือก ถูก 1 ข้อ',
    points: () => 1,
    emptyQuestion: () => ({ text: '', choices: ['', '', '', ''], correct: null, explanation: '' }),
    editorHtml(q) {
      const name = _gtRadioName();
      return `${_gtTextField('โจทย์', 'text', q.text)}
        <div class="fl">ตัวเลือก (กดวงกลมหน้าคำตอบที่ถูก)</div>
        <div class="ge-choices">
          ${q.choices.map((c, i) => `
            <label class="ge-choice">
              <input type="radio" name="${name}" data-k="correct" value="${i}" ${q.correct === i ? 'checked' : ''}
                     aria-label="ตัวเลือกที่ ${i + 1} เป็นคำตอบที่ถูก">
              <input class="fc" data-k="choice" value="${_gtEsc(c)}" placeholder="ตัวเลือกที่ ${i + 1}">
            </label>`).join('')}
        </div>
        ${_gtExplanationField(q)}`;
    },
    readEditor(root) {
      const picked = root.querySelector('[data-k="correct"]:checked');
      return {
        text: _gtRead(root, 'text'),
        choices: [...root.querySelectorAll('[data-k="choice"]')].map(el => el.value.trim()),
        correct: picked ? Number(picked.value) : null,
        explanation: _gtRead(root, 'explanation'),
      };
    },
    render(q, root, done) {
      const letters = ['ก', 'ข', 'ค', 'ง'];
      root.innerHTML = `${_gtQuestionText(q)}
        <div class="gq-choices">
          ${q.choices.map((c, i) => `
            <button type="button" class="gq-choice" data-i="${i}">
              <span class="gq-letter">${letters[i]}</span><span>${_gtEsc(c)}</span>
            </button>`).join('')}
        </div>`;
      const buttons = [...root.querySelectorAll('.gq-choice')];
      buttons.forEach(b => b.addEventListener('click', () => _gtFinishChoice(root, b, buttons[q.correct], done)));
    },
  },

  truefalse: {
    label: 'ถูกหรือผิด',
    icon: '⭕',
    desc: 'ข้อความ 1 ข้อ ให้ตอบว่าถูกหรือผิด',
    points: () => 1,
    emptyQuestion: () => ({ text: '', answer: null, explanation: '' }),
    editorHtml(q) {
      const name = _gtRadioName();
      return `${_gtTextField('ข้อความ', 'text', q.text)}
        <div class="fl">คำตอบที่ถูก</div>
        <div class="ge-tf">
          <label class="ge-choice"><input type="radio" name="${name}" data-k="answer" value="true" ${q.answer === true ? 'checked' : ''}> ถูก</label>
          <label class="ge-choice"><input type="radio" name="${name}" data-k="answer" value="false" ${q.answer === false ? 'checked' : ''}> ผิด</label>
        </div>
        ${_gtExplanationField(q)}`;
    },
    readEditor(root) {
      const picked = root.querySelector('[data-k="answer"]:checked');
      return {
        text: _gtRead(root, 'text'),
        answer: picked ? picked.value === 'true' : null,
        explanation: _gtRead(root, 'explanation'),
      };
    },
    render(q, root, done) {
      root.innerHTML = `${_gtQuestionText(q)}
        <div class="gq-tf">
          <button type="button" class="gq-tf-btn t" data-v="true"><span aria-hidden="true">✅</span>ถูก</button>
          <button type="button" class="gq-tf-btn f" data-v="false"><span aria-hidden="true">❌</span>ผิด</button>
        </div>`;
      const correctBtn = root.querySelector(`[data-v="${q.answer}"]`);
      root.querySelectorAll('.gq-tf-btn').forEach(b => b.addEventListener('click', () => _gtFinishChoice(root, b, correctBtn, done)));
    },
  },

  matching: {
    label: 'จับคู่โจทย์กับคำตอบ',
    icon: '🧩',
    desc: 'แตะฝั่งซ้ายแล้วแตะฝั่งขวาเพื่อจับคู่ 3-6 คู่',
    ..._gtPairsEditor,
    render: (q, root, done) => _gtRenderPairs(q, root, done, false),
  },

  linematch: {
    label: 'เกมโยงเส้น',
    icon: '〰️',
    desc: 'ลากเส้นเชื่อมฝั่งซ้ายกับฝั่งขวา 3-6 คู่',
    ..._gtPairsEditor,
    render: (q, root, done) => _gtRenderPairs(q, root, done, true),
  },

  sequence: {
    label: 'เรียงลำดับ',
    icon: '🔢',
    desc: 'เรียง 3-6 รายการให้อยู่ในลำดับที่ถูกต้อง',
    points: (q) => q.items.length,
    emptyQuestion: () => ({ text: '', items: Array(GT_MIN_ROWS).fill(''), explanation: '' }),
    editorHtml(q) {
      const rows = q.items.map((item, i) => `
        <div class="ge-row ge-seq">
          <input class="fc" data-k="item" value="${_gtEsc(item)}" placeholder="รายการ" aria-label="ลำดับที่ ${i + 1}">
          ${_gtRemoveBtn(q.items.length)}
        </div>`);
      return `${_gtTextField('คำสั่ง (ไม่บังคับ)', 'text', q.text, 'เช่น เรียงจากน้อยไปมาก')}
        ${_gtRowsField('รายการตามลำดับที่ถูกต้อง (3-6 รายการ) ตอนเล่นจะถูกสลับลำดับ', 'เพิ่มรายการ', rows)}
        ${_gtExplanationField(q)}`;
    },
    readEditor(root) {
      return {
        text: _gtRead(root, 'text'),
        items: [...root.querySelectorAll('[data-k="item"]')].map(el => el.value.trim()),
        explanation: _gtRead(root, 'explanation'),
      };
    },
    render(q, root, done) {
      let order = _gtShuffleNotSame(q.items);
      root.innerHTML = `${_gtQuestionText(q)}<ol class="gq-seq"></ol>
        <button type="button" class="btn btn-p gq-check">ตรวจคำตอบ</button>`;
      const list = root.querySelector('.gq-seq');
      const paint = (focus) => {
        list.innerHTML = order.map((item, i) => `
          <li class="gq-seq-row">
            <span class="gq-seq-n">${i + 1}</span>
            <span class="gq-seq-text">${_gtEsc(item)}</span>
            <button type="button" class="gq-seq-move" data-i="${i}" data-d="-1" aria-label="เลื่อน ${_gtEsc(item)} ขึ้น"${i === 0 ? ' disabled' : ''}>▲</button>
            <button type="button" class="gq-seq-move" data-i="${i}" data-d="1" aria-label="เลื่อน ${_gtEsc(item)} ลง"${i === order.length - 1 ? ' disabled' : ''}>▼</button>
          </li>`).join('');
        if (focus) list.querySelector(`[data-i="${focus.i}"][data-d="${focus.d}"]:not(:disabled)`)?.focus();
      };
      list.addEventListener('click', (e) => {
        const btn = e.target.closest('.gq-seq-move');
        if (!btn) return;
        const i = +btn.dataset.i, d = +btn.dataset.d;
        [order[i], order[i + d]] = [order[i + d], order[i]];
        paint({ i: i + d, d });
      });
      root.querySelector('.gq-check').addEventListener('click', (e) => {
        e.target.disabled = true;
        let correct = 0;
        list.querySelectorAll('.gq-seq-row').forEach((row, i) => {
          const ok = order[i] === q.items[i];
          correct += ok;
          row.classList.add(ok ? 'ok' : 'no');
          if (!ok) row.querySelector('.gq-seq-text').insertAdjacentHTML('beforeend',
            `<span class="gq-seq-hint">ควรเป็นลำดับที่ ${q.items.indexOf(order[i]) + 1}</span>`);
          row.querySelectorAll('button').forEach(b => { b.disabled = true; });
        });
        done(correct);
      });
      paint();
    },
  },
};
