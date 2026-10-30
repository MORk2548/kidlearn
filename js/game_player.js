// game_player.js - ตัวเล่นเกมที่ใช้ทั้งตอนครูทดลองเล่นและตอนนักเรียนเล่นจริง
// game: { name, icon, game_type, time_limit, questions } รูปแบบเดียวกับที่ game_play ใน backend.php คืน
// onFinish({ score, timeSpent }) เรียกครั้งเดียวเมื่อตอบครบหรือหมดเวลา onClose เรียกเมื่อกดปิด

function startGamePlayer(root, game, { onFinish = () => {}, onClose = () => {} } = {}) {
  const type = GAME_TYPES[game.game_type];
  const totalPoints = game.questions.reduce((sum, q) => sum + type.points(q), 0);
  const startedAt = Date.now();
  let index = 0, earned = 0, finished = false, timer = null;

  root.innerHTML = `
    <div class="gp">
      <div class="gp-top">
        <div class="gp-title"><span aria-hidden="true">${_gtEsc(game.icon || type.icon)}</span> ${_gtEsc(game.name)}</div>
        <div class="gp-timer" role="timer" aria-label="เวลาที่เหลือ"></div>
        <button type="button" class="gp-close" aria-label="ปิดเกม">✕</button>
      </div>
      <div class="gp-progress"><div class="gp-bar"></div></div>
      <div class="gp-body"></div>
    </div>`;
  const body = root.querySelector('.gp-body');
  const timerEl = root.querySelector('.gp-timer');
  const close = () => { clearInterval(timer); onClose(); };
  root.querySelector('.gp-close').addEventListener('click', close);

  const secondsLeft = () => Math.max(0, game.time_limit - Math.floor((Date.now() - startedAt) / 1000));
  const tick = () => {
    const s = secondsLeft();
    timerEl.textContent = `⏱ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    timerEl.classList.toggle('warn', s <= 10);
    if (!s) finish(true);
  };

  function showQuestion() {
    root.querySelector('.gp-bar').style.width = `${index / game.questions.length * 100}%`;
    const q = game.questions[index];
    body.innerHTML = `
      <div class="gp-count">ข้อ ${index + 1} / ${game.questions.length}</div>
      ${q.images?.length ? `<div class="gp-imgs">${q.images.map((url, k) =>
        `<img src="${_gtEsc(url)}" alt="รูปที่ ${k + 1} ของข้อ ${index + 1}">`).join('')}</div>` : ''}
      <div class="gp-q"></div>
      <div class="gp-feedback" aria-live="polite" hidden></div>
      <button type="button" class="btn btn-p gp-next" hidden>${index + 1 < game.questions.length ? 'ข้อถัดไป ➜' : 'ดูคะแนน 🏁'}</button>`;
    type.render(q, body.querySelector('.gp-q'), (correct) => {
      if (finished) return;
      earned += correct;
      const points = type.points(q);
      const fb = body.querySelector('.gp-feedback');
      const allRight = correct === points;
      fb.className = `gp-feedback ${allRight ? 'ok' : 'no'}`;
      fb.innerHTML = (allRight ? '⭐ ถูกต้อง!' : correct ? `ถูก ${correct} จาก ${points}` : 'ยังไม่ถูก')
        + (!allRight && q.explanation ? ` · ${_gtRich(q.explanation)}` : '');
      fb.hidden = false;
      const next = body.querySelector('.gp-next');
      next.hidden = false;
      next.focus();
      next.addEventListener('click', () => { index++; index < game.questions.length ? showQuestion() : finish(false); });
    });
  }

  function finish(timeUp) {
    if (finished) return;
    finished = true;
    clearInterval(timer);
    const score = totalPoints ? Math.round(earned / totalPoints * 100) : 0;
    const timeSpent = Math.min(game.time_limit, Math.round((Date.now() - startedAt) / 1000));
    root.querySelector('.gp-bar').style.width = '100%';
    const stars = score >= 80 ? '⭐⭐⭐' : score >= 50 ? '⭐⭐' : score > 0 ? '⭐' : '';
    body.innerHTML = `
      <div class="gp-result">
        ${timeUp ? '<div class="gp-timeup">⏰ หมดเวลา</div>' : ''}
        <div class="gp-score">${score}%</div>
        <div class="gp-stars" aria-hidden="true">${stars}</div>
        <div class="gp-msg">${score >= 80 ? 'เก่งมาก!' : score >= 50 ? 'ดีแล้ว ลองอีกครั้งให้ได้เต็ม!' : 'ไม่เป็นไร ลองใหม่อีกครั้งนะ'}</div>
        <div class="gp-actions">
          <button type="button" class="btn btn-s gp-again">🔁 เล่นอีกครั้ง</button>
          <button type="button" class="btn btn-p gp-done">ปิด</button>
        </div>
      </div>`;
    body.querySelector('.gp-again').addEventListener('click', () => startGamePlayer(root, game, { onFinish, onClose }));
    body.querySelector('.gp-done').addEventListener('click', close);
    onFinish({ score, timeSpent });
  }

  showQuestion();
  tick();
  timer = setInterval(tick, 1000);
}

// เปิดตัวเล่นเต็มจอ ปิดแล้วลบทิ้ง
function openGamePlayerOverlay(game, { onFinish } = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'gp-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  document.body.appendChild(overlay);
  startGamePlayer(overlay, game, { onFinish, onClose: () => overlay.remove() });
}
