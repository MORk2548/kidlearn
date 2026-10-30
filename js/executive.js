// EXECUTIVE DASHBOARD

let _exTab = 'dashboard';
let _exCache = null;
let _exDateRange = 'all';

function exSelectTab(tab) {
  _exTab = tab;
  _renderExecutivePanel();
}

function exReload() {
  _exCache = null;
  _renderExecutivePanel();
}

function exSetDateRange(range) {
  _exDateRange = range;
  _exCache = null;
  _renderExecutivePanel();
}

function _exDateRangeFilter() {
  return `<label style="display:flex;align-items:center;gap:.5rem;font-size:.82rem;color:var(--mu)">
    ช่วงข้อมูล
    <select class="fc" style="width:auto;padding:.45rem .65rem;font-size:.82rem" onchange="exSetDateRange(this.value)">
      <option value="all"${_exDateRange==='all'?' selected':''}>ทุกช่วง</option>
      <option value="7d"${_exDateRange==='7d'?' selected':''}>ย้อนหลัง 7 วัน</option>
      <option value="1m"${_exDateRange==='1m'?' selected':''}>ย้อนหลัง 1 เดือน</option>
      <option value="1y"${_exDateRange==='1y'?' selected':''}>ย้อนหลัง 1 ปี</option>
    </select><span style="font-size:.7rem">1 เดือน/ปีนับย้อนหลังจากเวลาปัจจุบัน</span>
  </label>`;
}

function _exScoreColor(pct) {
  if (pct >= 80) return '#16A34A';
  if (pct >= 60) return '#D97706';
  return '#DC2626';
}

function _exBadgeStyle(tone) {
  const styles = {
    blue: 'background:#DBEAFE;color:#1D4ED8',
    green: 'background:#DCFCE7;color:#15803D',
    amber: 'background:#FEF3C7;color:#B45309',
    rose: 'background:#FFE4E6;color:#BE123C',
    slate: 'background:#E2E8F0;color:#334155'
  };
  return styles[tone] || styles.slate;
}

function _exEmptyState(message) {
  return `<div style="padding:2rem 1rem;text-align:center;color:var(--mu)">${message}</div>`;
}

async function _exLoadAllData() {
  if (_exCache) return _exCache;

  const [dashboard, users, scores] = await Promise.all([
    apiExecutiveDashboard(_exDateRange).catch(() => ({ ok: false })),
    apiExecutiveUsers(_exDateRange).catch(() => ({ ok: false, users: [] })),
    apiExecutiveContent('scores', _exDateRange).catch(() => ({ ok: false, scores: [] }))
  ]);

  _exCache = {
    dashboard: dashboard.ok ? dashboard : { total_students: 0, total_teachers: 0, total_plays: 0, avg_score: 0 },
    users: users.ok ? (users.users || []) : [],
    scores: scores.ok ? (scores.scores || []) : []
  };

  return _exCache;
}

function _exTopSummary(data) {
  const scores = data.scores || [];
  const lowScores = scores.filter(item => {
    const maxScore = +item.max_score || 100;
    return Math.round(((+item.score || 0) / maxScore) * 100) < 60;
  }).length;

  return `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;margin-bottom:1.25rem">
      <div class="ex-stat-card">
        <div class="ex-stat-icon" style="background:#DBEAFE;color:#1D4ED8">👦</div>
        <div class="ex-stat-value">${data.dashboard.total_students || 0}</div>
        <div class="ex-stat-label">นักเรียนใหม่ที่ใช้งาน</div>
      </div>
      <div class="ex-stat-card">
        <div class="ex-stat-icon" style="background:#DCFCE7;color:#15803D">👩‍🏫</div>
        <div class="ex-stat-value">${data.dashboard.total_teachers || 0}</div>
        <div class="ex-stat-label">ครูใหม่ที่ใช้งาน</div>
      </div>
      <div class="ex-stat-card">
        <div class="ex-stat-icon" style="background:#EDE9FE;color:#6D28D9">🎮</div>
        <div class="ex-stat-value">${data.dashboard.total_plays || 0}</div>
        <div class="ex-stat-label">ครั้งที่เล่นในช่วงที่เลือก</div>
      </div>
      <div class="ex-stat-card">
        <div class="ex-stat-icon" style="background:#FEF3C7;color:#B45309">🏆</div>
        <div class="ex-stat-value">${data.dashboard.avg_score || 0}%</div>
        <div class="ex-stat-label">คะแนนเฉลี่ยในช่วงที่เลือก</div>
      </div>
      <div class="ex-stat-card">
        <div class="ex-stat-icon" style="background:#FFE4E6;color:#BE123C">📌</div>
        <div class="ex-stat-value">${lowScores}</div>
        <div class="ex-stat-label">คะแนนต่ำกว่า 60%</div>
      </div>
    </div>
  `;
}

function _exRenderDashboard(data) {
  const topScores = data.scores.slice(0, 6);

  return `
    <div style="display:flex;justify-content:flex-end;margin-bottom:.75rem">${_exDateRangeFilter()}</div>
    ${_exTopSummary(data)}
    <div style="display:grid;grid-template-columns:1.2fr .9fr;gap:1rem">
      <div class="ex-surface">
        <div class="ex-section-head">
          <div>
            <div class="ex-section-title">คะแนนล่าสุดของนักเรียน</div>
            <div class="ex-section-sub">อัปเดตจากการเล่นล่าสุดในระบบ</div>
          </div>
          <button class="ex-link-btn" onclick="exSelectTab('scores')">ดูทั้งหมด</button>
        </div>
        ${topScores.length ? `
          <div class="ex-list">
            ${topScores.map(item => {
              const maxScore = +item.max_score || 100;
              const pct = Math.round(((+item.score || 0) / maxScore) * 100);
              return `
                <div class="ex-list-item">
                  <div>
                    <div class="ex-item-title">${item.student_name || '-'}</div>
                    <div class="ex-item-sub">${item.subject_icon || '📚'} ${item.subject_name || '-'} · ${item.game_name || '-'}</div>
                  </div>
                  <div style="text-align:right">
                    <div style="font-weight:800;color:${_exScoreColor(pct)}">${pct}%</div>
                    <div class="ex-note">${item.score}/${maxScore}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : _exEmptyState('ยังไม่มีข้อมูลคะแนน')}
      </div>
    </div>
  `;
}

function _exRenderUsers(data) {
  return `
    <div class="ex-surface">
      <div class="ex-section-head">
        <div>
          <div class="ex-section-title">ผู้ใช้ในระบบ</div>
          <div class="ex-section-sub">วันที่ในตัวกรองหมายถึงวันสมัคร</div>
        </div>
        ${_exDateRangeFilter()}
      </div>
      ${data.users.length ? `
        <div class="ex-table-wrap">
          <table class="ex-table">
            <thead>
              <tr><th>ชื่อ</th><th>บทบาท</th><th>อีเมล</th><th>ข้อมูลเพิ่ม</th><th>วันที่สมัคร</th><th>แก้ไขล่าสุด</th></tr>
            </thead>
            <tbody>
              ${data.users.map(user => {
                const extra = user.grade ? `ชั้น ${classLabel(user)}` : user.phone ? user.phone : user.department ? user.department : '-';
                const tone = user.role === 'student' ? 'green' : user.role === 'teacher' ? 'blue' : user.role === 'parent' ? 'amber' : 'slate';
                return `
                  <tr>
                    <td>${user.full_name || '-'}</td>
                    <td><span class="ex-role-pill" style="${_exBadgeStyle(tone)}">${user.role || '-'}</span></td>
                    <td>${user.email || '-'}</td>
                    <td>${extra}</td>
                    <td style="white-space:nowrap">${formatDateTimeTH(user.created_at)}</td>
                    <td style="white-space:nowrap">${formatDateTimeTH(user.updated_at)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      ` : _exEmptyState('ยังไม่มีข้อมูลผู้ใช้')}
    </div>
  `;
}

function _exRenderScores(data) {
  return `
    <div class="ex-surface">
      <div class="ex-section-head">
        <div>
          <div class="ex-section-title">คะแนนของนักเรียน</div>
          <div class="ex-section-sub">แสดงผลคะแนนล่าสุดพร้อมเกมและเวลาที่ใช้</div>
        </div>
      </div>
      ${data.scores.length ? `
        <div class="ex-table-wrap">
          <table class="ex-table">
            <thead>
              <tr><th>นักเรียน</th><th>วิชา / เกม</th><th style="text-align:center">คะแนน</th><th style="text-align:center">เวลา</th><th>วัน/เวลา</th></tr>
            </thead>
            <tbody>
              ${data.scores.map(score => {
                const maxScore = +score.max_score || 100;
                const pct = Math.round(((+score.score || 0) / maxScore) * 100);
                return `
                  <tr>
                    <td>${score.student_name || '-'}</td>
                    <td>
                      <div>${score.subject_icon || '📚'} ${score.subject_name || '-'}</div>
                      <div class="ex-note">${score.game_name || '-'}</div>
                    </td>
                    <td style="text-align:center">
                      <div style="font-weight:800;color:${_exScoreColor(pct)}">${pct}%</div>
                      <div class="ex-note">${score.score}/${maxScore}</div>
                    </td>
                    <td style="text-align:center">${score.time_spent || 0} วิ</td>
                    <td>${score.played_at ? new Date(score.played_at).toLocaleString('th-TH') : '-'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      ` : _exEmptyState('ยังไม่มีข้อมูลคะแนน')}
    </div>
  `;
}

function _exBuildPanelHtml(data) {
  if (_exTab === 'users') return _exRenderUsers(data);
  if (_exTab === 'scores') return _exRenderScores(data);
  return _exRenderDashboard(data);
}

function _renderExecutivePanel() {
  const panel = document.getElementById('ex-dashboard');
  if (!panel) return;

  panel.innerHTML = `
    <style>
      .ex-shell { display:grid; gap:1rem; }
      .ex-hero {
        display:flex; align-items:center; gap:1rem; padding:1.2rem 1.35rem;
        background:linear-gradient(135deg,#F8FBFF 0%, #EEF4FF 100%);
        border:1px solid #DCE6F5; border-radius:20px;
      }
      .ex-hero-icon {
        width:52px; height:52px; border-radius:16px; display:flex; align-items:center; justify-content:center;
        background:linear-gradient(135deg,#1D4ED8,#3B82F6); color:#fff; font-size:1.35rem; flex-shrink:0;
        box-shadow:0 14px 28px rgba(37,99,235,.18);
      }
      .ex-hero-title { font-size:1.15rem; font-weight:900; color:#0F172A; }
      .ex-hero-sub { font-size:.82rem; color:#64748B; margin-top:.15rem; }
      .ex-toolbar-btn {
        border:1px solid #BFDBFE; background:#fff; color:#1D4ED8; border-radius:999px;
        padding:.55rem 1rem; font-family:'Kanit',sans-serif; font-weight:700; cursor:pointer;
      }
      .ex-tabs {
        display:flex; gap:.4rem; flex-wrap:wrap; padding:.35rem;
        background:rgba(255,255,255,.65); border:1px solid #E2E8F0; border-radius:18px;
      }
      .ex-tab-btn {
        padding:.7rem 1rem; border:none; border-radius:14px; background:transparent; color:#64748B;
        font-family:'Kanit',sans-serif; font-size:.92rem; font-weight:800; cursor:pointer; transition:.18s ease;
      }
      .ex-tab-btn.active { background:#fff; color:#0F4C81; box-shadow:0 10px 24px rgba(15,76,129,.12); }
      .ex-surface {
        background:rgba(255,255,255,.92); border:1px solid #E2E8F0; border-radius:20px; padding:1.1rem 1.15rem;
        box-shadow:0 10px 26px rgba(148,163,184,.10);
      }
      .ex-stat-card {
        background:linear-gradient(180deg,#FFFFFF 0%, #F8FBFF 100%);
        border:1px solid #E5EEF9; border-radius:18px; padding:1.1rem; position:relative;
      }
      .ex-stat-icon {
        width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center;
        font-size:1.05rem; margin-bottom:.75rem;
      }
      .ex-stat-value { font-size:1.9rem; font-weight:900; color:#0F4C81; line-height:1; }
      .ex-stat-label { margin-top:.45rem; font-size:.82rem; color:#64748B; }
      .ex-section-head { display:flex; justify-content:space-between; gap:1rem; align-items:flex-start; margin-bottom:.9rem; }
      .ex-section-title { font-size:1rem; font-weight:900; color:#0F172A; }
      .ex-section-sub { font-size:.8rem; color:#64748B; margin-top:.12rem; }
      .ex-link-btn {
        border:none; background:#EFF6FF; color:#1D4ED8; border-radius:999px; padding:.5rem .85rem;
        font-family:'Kanit',sans-serif; font-weight:700; cursor:pointer;
      }
      .ex-list { display:grid; gap:.75rem; }
      .ex-list-item {
        display:flex; justify-content:space-between; gap:1rem; align-items:center;
        padding:.9rem 1rem; background:#F8FBFF; border:1px solid #E5EEF9; border-radius:16px;
      }
      .ex-item-title { font-size:.92rem; font-weight:800; color:#0F172A; }
      .ex-item-sub { font-size:.78rem; color:#64748B; margin-top:.2rem; }
      .ex-note { font-size:.76rem; color:#64748B; }
      .ex-role-pill {
        display:inline-flex; align-items:center; border-radius:999px; padding:.28rem .65rem;
        font-size:.76rem; font-weight:800;
      }
      .ex-table-wrap { overflow-x:auto; border-radius:16px; border:1px solid #EAF0F7; }
      .ex-table { width:100%; border-collapse:collapse; min-width:720px; font-size:.84rem; }
      .ex-table th {
        background:#F7FAFC; color:#64748B; text-align:left; font-size:.78rem; font-weight:800;
        padding:.9rem .85rem; border-bottom:1px solid #E5E7EB;
      }
      .ex-table td {
        padding:.9rem .85rem; border-bottom:1px solid #EEF2F7; vertical-align:top; color:#0F172A;
      }
      .ex-table tr:hover td { background:#FBFDFF; }
      @media (max-width: 980px) {
        .ex-hero { flex-wrap:wrap; }
      }
      @media (max-width: 860px) {
        .ex-two-col, .ex-scores-grid { grid-template-columns:1fr !important; }
      }
    </style>

    <div class="ex-shell">
      <div class="ex-hero">
        <div class="ex-hero-icon">💼</div>
        <div style="flex:1">
          <div class="ex-hero-title">แผงผู้บริหาร</div>
          <div class="ex-hero-sub">ดูภาพรวมระบบ คะแนนนักเรียนในหน้าที่อ่านง่ายขึ้น</div>
        </div>
        <button class="ex-toolbar-btn" onclick="exReload()">รีโหลด</button>
      </div>

      <div class="ex-tabs">
        <button class="ex-tab-btn ${_exTab === 'dashboard' ? 'active' : ''}" onclick="exSelectTab('dashboard')">📊 ภาพรวม</button>
        <button class="ex-tab-btn ${_exTab === 'users' ? 'active' : ''}" onclick="exSelectTab('users')">👥 ผู้ใช้</button>
        <button class="ex-tab-btn ${_exTab === 'scores' ? 'active' : ''}" onclick="exSelectTab('scores')">🏆 คะแนน</button>
      </div>

      <div id="ex-body" style="display:grid;gap:1rem">
        <div class="ex-surface"><div style="color:var(--mu);padding:1rem">กำลังโหลด...</div></div>
      </div>
    </div>
  `;

  const body = document.getElementById('ex-body');
  if (!body) return;

  _exLoadAllData().then(data => {
    body.innerHTML = _exBuildPanelHtml(data);
  }).catch(err => {
    console.error('Error loading executive data:', err);
    body.innerHTML = `<div class="ex-surface"><div style="color:#B91C1C;padding:1rem">โหลดข้อมูลผู้บริหารไม่สำเร็จ</div></div>`;
  });
}
