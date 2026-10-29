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
};
