// ══════════════════════════════════════════════════════
// RECOMMENDATIONS — คำแนะนำสำหรับผู้ปกครอง คิดจากข้อมูลรายเกมของลูกทุกครั้งที่เปิดหน้า
// ══════════════════════════════════════════════════════
const REC_INACTIVE_DAYS = 3;

// กฎเรียงตามความสำคัญ แต่ละกฎคืนรายการคำแนะนำ { title, body, stars? } จากเกมและประวัติการเล่นของลูก
const REC_RULES = [
  { tone: 'urgent', icon: 'fa-clock', pick: ({ name, games, attempts }) => {
      if (!games.length) return [];
      const last = attempts.reduce((m, a) => (a.played_at > m ? a.played_at : m), '');
      if (!last) return [{ title: `${name}ยังไม่ได้เริ่มเล่นเกม`, body: 'ลองชวนเล่นสักเกมวันละ 10 นาที เริ่มจากเกมที่ครูเพิ่งมอบหมาย' }];
      const days = _daysAgo(last);
      return days >= REC_INACTIVE_DAYS
        ? [{ title: `${name}ไม่ได้เล่นมา ${days} วันแล้ว`, body: 'ลองชวนเล่นวันละ 10 นาที เริ่มจากเกมที่ได้ดาวเยอะเพื่อให้สนุกก่อน' }]
        : [];
    } },
  { tone: 'help', icon: 'fa-hand-holding-heart', pick: ({ games }) =>
      games.filter(g => g.stars >= 1 && g.stars <= 2 && g.plays >= 2).map(g => ({
        title: `นั่งเล่นด้วยกันสักรอบ: ${g.name}`,
        body: `${g.subject_name} · เล่นแล้ว ${g.plays} ครั้งยังได้ ${g.stars} ดาว อาจยังไม่เข้าใจโจทย์ ลองอ่านโจทย์ให้ฟังแล้วให้ลูกตอบเอง`,
        stars: g.stars,
      })) },
  { tone: 'new', icon: 'fa-wand-magic-sparkles', pick: ({ games }) =>
      games.filter(g => g.plays === 0).map(g => ({
        title: `ครูมอบหมายเกมใหม่: ${g.name}`,
        body: `${g.subject_name} · ยังไม่เคยเล่น`,
      })) },
  { tone: 'praise', icon: 'fa-award', pick: ({ games, attempts }) =>
      games.flatMap(g => {
        const full = attempts.filter(a => a.game_id == g.game_id && +a.score >= 100 && _daysAgo(a.played_at) < 7)
          .sort((a, b) => (a.played_at < b.played_at ? -1 : 1))[0];
        return full ? [{
          title: `ชมได้เลย: ได้ 5 ดาวเกม ${g.name}`,
          body: `ได้เต็ม ${_playedLabel(full.played_at)} หลังเล่นไป ${g.plays} ครั้ง ความพยายามได้ผล`,
          stars: 5,
        }] : [];
      }) },
];

function buildParentRecs(ctx) {
  return REC_RULES.flatMap(r => r.pick(ctx).map(rec => ({ ...rec, tone: r.tone, icon: r.icon })));
}

async function loadRec() {
  if (A.role !== 'parent') return;
  const cont = document.getElementById('rec-cont');
  if (!cont) return;
  cont.innerHTML = '<div style="color:var(--mu);padding:1rem">กำลังโหลด...</div>';

  const cres = await apiMyChildren().catch(() => ({ ok: false, children: [] }));
  const kids = cres.ok ? (cres.children || []) : [];
  if (!kids.length) {
    try {
      const linkRes = await apiAutoLink();
      if (linkRes.ok && linkRes.linked > 0) { loadRec(); return; }
    } catch (e) {}
    const myPhone = A.user?.phone || A.user?.parentPhone || '';
    const displayPhone = myPhone ? formatPhone(myPhone) : '(ยังไม่ได้ลงทะเบียนเบอร์)';
    cont.innerHTML = `<div style="text-align:center;padding:2.5rem 1rem;color:var(--mu)">
      <div style="font-weight:700;font-size:1rem;color:var(--tx);margin-bottom:.5rem">ยังไม่มีบุตรหลานที่เชื่อมบัญชี</div>
      <div style="font-size:.88rem;line-height:1.8;margin-bottom:1.25rem">
        ให้บุตรหลานกรอกเบอร์โทรของคุณ<br>
        <strong style="font-size:1rem;color:var(--s)">${_esc(displayPhone)}</strong><br>
        ตอนสมัครสมาชิก หรือกรอกในหน้าแก้ไขโปรไฟล์
      </div>
      <div style="display:flex;flex-direction:column;gap:.5rem;align-items:center">
        <button class="btn btn-s btn-sm" onclick="syncChildrenRec()">ค้นหาบุตรหลานอัตโนมัติ</button>
        <button class="btn btn-sm" style="background:var(--tint);color:var(--s)" onclick="sec('children')">จัดการบุตรหลาน</button>
      </div>
    </div>`;
    return;
  }

  if (!kids.find(k => k.student_id == A.selChild)) A.selChild = kids[0].student_id;
  const child = kids.find(k => k.student_id == A.selChild);
  const picker = kids.length > 1 ? `<div class="sc-filters">${kids.map(k =>
    `<button class="child-btn${k.student_id == A.selChild ? ' active' : ''}" onclick="A.selChild=${k.student_id};loadRec()">${_esc(k.full_name)}</button>`).join('')}</div>` : '';

  const data = await childScoreData(child);
  if (data.error) { cont.innerHTML = `${picker}<div style="color:#EF4444">${_esc(data.error)}</div>`; return; }
  const recs = buildParentRecs({ name: child.full_name, ...data });
  cont.innerHTML = `${picker}
    <h3>คำแนะนำสำหรับ${_esc(child.full_name)}</h3>
    ${recs.length ? recs.map(r => `<div class="rec-card rec-${r.tone}">
        <span class="rec-ic"><i class="fa-solid ${r.icon}" aria-hidden="true"></i></span>
        <div class="rec-body">
          <div class="rec-title">${_esc(r.title)}</div>
          <div class="sc-meta">${_esc(r.body)}</div>
        </div>
        ${r.stars ? starsHtml(r.stars) : ''}
        ${r.tone === 'urgent' ? '<span class="rec-tag">ควรทำก่อน</span>' : ''}
      </div>`).join('')
    : `<div class="gb-empty">ตอนนี้ยังไม่มีเรื่องที่ต้องช่วย ${_esc(child.full_name)}เล่นได้ดีแล้ว</div>`}
    <div style="margin-top:1rem"><button class="btn btn-sm" style="background:var(--sf);color:var(--tx)" onclick="sec('scores')">ดูคะแนนรายเกม</button></div>`;
}

async function syncChildrenRec() {
  try {
    const res = await apiAutoLink();
    if (res.ok && res.linked > 0) loadRec();
    else alert('ยังไม่พบบุตรหลานที่กรอกเบอร์ของคุณ\nโปรดตรวจสอบว่านักเรียนกรอกเบอร์ถูกต้องตอนสมัคร');
  } catch (e) {
    alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
  }
}
