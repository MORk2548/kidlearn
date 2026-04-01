// ══════════════════════════════════════════════════════
// EXECUTIVE DASHBOARD — ผู้บริหาร (View-only)
// ══════════════════════════════════════════════════════

let _exTab = 'dashboard';
let _exData = { users: [], games: [], summary: {} };

function _renderExecutivePanel(){
  const panel = document.getElementById('tc-game-panel');
  if(!panel) return;
  
  panel.innerHTML = `
    <style>
      .ex-stat { background: #fff; border: 1.5px solid #E5E7EB; border-radius: 12px; 
        padding: 1.25rem; text-align: center; }
      .ex-stat-val { font-size: 2rem; font-weight: 800; color: var(--s); }
      .ex-stat-lbl { font-size: .82rem; color: var(--mu); margin-top: .3rem; }
      .ex-table { width: 100%; border-collapse: collapse; font-size: .85rem; }
      .ex-table th { background: #F8FAFF; padding: .75rem; text-align: left; font-weight: 700; border-bottom: 2px solid #E5E7EB; }
      .ex-table td { padding: .65rem .75rem; border-bottom: 1px solid #F1F5F9; }
      .ex-tab-btn { padding: .5rem 1rem; border: none; background: none; cursor: pointer; 
        font-family: 'Kanit',sans-serif; font-size: .9rem; font-weight: 600; color: var(--mu);
        border-bottom: 2px solid transparent; }
      .ex-tab-btn.active { color: var(--s); border-bottom-color: var(--s); }
    </style>
    
    <div style="display: flex; align-items: center; gap: .75rem; margin-bottom: 1.5rem; 
      padding: .75rem 1rem; background: linear-gradient(135deg,#F0F9FF,#F3E8FF); border-radius: 12px;">
      <span style="font-size: 1.8rem;">💼</span>
      <div style="flex: 1;">
        <div style="font-weight: 800; font-size: .95rem;">แผงผู้บริหาร</div>
        <div style="font-size: .73rem; color: var(--mu);">ดูข้อมูล วิเคราะห์ เนื้อหา และสถิติ (View-only)</div>
      </div>
      <button class="lp-btn-play" style="padding: .5rem 1.25rem; font-size: .85rem;" onclick="exReload()">🔄 รีโหลด</button>
    </div>
    
    <!-- Tabs -->
    <div style="display: flex; gap: 2rem; border-bottom: 2px solid #E5E7EB; margin-bottom: 1.5rem; padding-right: 1rem;">
      <button class="ex-tab-btn ${_exTab === 'dashboard' ? 'active' : ''}" onclick="exSelectTab('dashboard')">📊 dashboard</button>
      <button class="ex-tab-btn ${_exTab === 'users' ? 'active' : ''}" onclick="exSelectTab('users')">👥 ผู้ใช้</button>
      <button class="ex-tab-btn ${_exTab === 'content' ? 'active' : ''}" onclick="exSelectTab('content')">📚 เนื้อหา</button>
      <button class="ex-tab-btn ${_exTab === 'games' ? 'active' : ''}" onclick="exSelectTab('games')">🎮 เกม</button>
    </div>
    
    <!-- Dashboard -->
    <div id="ex-dashboard" style="display: ${_exTab === 'dashboard' ? 'block' : 'none'};">
      <div style="display: grid; grid-template-columns: repeat(auto-fit,minmax(180px,1fr)); gap: 1rem; margin-bottom: 2rem;">
        <div class="ex-stat">
          <div class="ex-stat-val" id="ex-students">—</div>
          <div class="ex-stat-lbl">👦 นักเรียน</div>
        </div>
        <div class="ex-stat">
          <div class="ex-stat-val" id="ex-teachers">—</div>
          <div class="ex-stat-lbl">👩‍🏫 ครู</div>
        </div>
        <div class="ex-stat">
          <div class="ex-stat-val" id="ex-plays">—</div>
          <div class="ex-stat-lbl">🎮 เล่นทั้งหมด</div>
        </div>
        <div class="ex-stat">
          <div class="ex-stat-val" id="ex-avg">—</div>
          <div class="ex-stat-lbl">📈 คะแนนเฉลี่ย</div>
        </div>
      </div>
    </div>
    
    <!-- Users -->
    <div id="ex-users" style="display: ${_exTab === 'users' ? 'block' : 'none'};">
      <div style="overflow-x: auto;">
        <table class="ex-table">
          <thead>
            <tr>
              <th>👤 ชื่อ-นามสกุล</th>
              <th>👥 Role</th>
              <th>📧 อีเมล</th>
              <th>🔗 เพิ่มเติม</th>
            </tr>
          </thead>
          <tbody id="ex-users-tbody">
            <tr><td colspan="4" style="text-align: center; color: var(--mu);">⏳ กำลังโหลด...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- Content -->
    <div id="ex-content" style="display: ${_exTab === 'content' ? 'block' : 'none'};">
      <div style="overflow-x: auto;">
        <table class="ex-table">
          <thead>
            <tr>
              <th>📚 วิชา</th>
              <th style="text-align: center;">🎮 เกม</th>
              <th style="text-align: center;">❓ คำถาม</th>
              <th>📊 สถิติ</th>
            </tr>
          </thead>
          <tbody id="ex-content-tbody">
            <tr><td colspan="4" style="text-align: center; color: var(--mu);">⏳ กำลังโหลด...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- Games -->
    <div id="ex-games" style="display: ${_exTab === 'games' ? 'block' : 'none'};">
      <div style="overflow-x: auto;">
        <table class="ex-table">
          <thead>
            <tr>
              <th>🎮 เกม</th>
              <th>📚 วิชา</th>
              <th style="text-align: center;">⚡ Type</th>
              <th style="text-align: center;">❓ ข้อ</th>
              <th style="text-align: center;">📈 เล่น</th>
              <th style="text-align: center;">⭐ คะแนน</th>
            </tr>
          </thead>
          <tbody id="ex-games-tbody">
            <tr><td colspan="6" style="text-align: center; color: var(--mu);">⏳ กำลังโหลด...</td></tr>
          </tbody>
        </table>
      </div>
    </div>`;
  
  exLoadData();
}

async function exLoadData() {
  try {
    // Load Dashboard
    const dashboard = await apiExecutiveDashboard();
    if(dashboard.ok) {
      document.getElementById('ex-students').textContent = dashboard.total_students || '0';
      document.getElementById('ex-teachers').textContent = dashboard.total_teachers || '0';
      document.getElementById('ex-plays').textContent = dashboard.total_plays || '0';
      document.getElementById('ex-avg').textContent = (dashboard.avg_score || '0') + '%';
    }
    
    // Load Users
    const users = await apiExecutiveUsers();
    if(users.ok) {
      const tbody = document.getElementById('ex-users-tbody');
      if(!users.users || !users.users.length) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--mu);">ไม่มีข้อมูล</td></tr>';
      } else {
        tbody.innerHTML = users.users.map(u => {
          const extra = u.grade ? `📚 ${u.grade}` : u.phone ? `📱 ${u.phone}` : u.department ? `🏢 ${u.department}` : '—';
          return `<tr>
            <td>${u.full_name}</td>
            <td><span style="font-size: .75rem; padding: .2rem .5rem; background: #EEF2FF; color: var(--s); 
              border-radius: 4px; font-weight: 600;">${u.role}</span></td>
            <td>${u.email}</td>
            <td>${extra}</td>
          </tr>`;
        }).join('');
      }
    }
    
    // Load Content
    const content = await apiExecutiveContent('summary');
    if(content.ok && content.subjects) {
      const tbody = document.getElementById('ex-content-tbody');
      tbody.innerHTML = content.subjects.map(s => {
        const pct = (s.question_count || 0);
        return `<tr>
          <td>${s.icon} ${s.name}</td>
          <td style="text-align: center;">${s.game_count || 0}</td>
          <td style="text-align: center;">${pct}</td>
          <td style="font-size: .75rem; color: var(--mu);">${s.game_count ? '✅ มีเนื้อหา' : '⚠️ ยังไม่สมบูรณ์'}</td>
        </tr>`;
      }).join('');
    }
    
    // Load Games
    const games = await apiExecutiveContent('games');
    if(games.ok && games.games) {
      const tbody = document.getElementById('ex-games-tbody');
      tbody.innerHTML = games.games.map(g => {
        const TYPE = {'mcq':'MCQ','truefalse':'จริง/เท็จ','fill':'เติมคำ',
                     'matching':'จับคู่','sequence':'เรียง','wordsearch':'ค้นหา'};
        return `<tr>
          <td>${g.subject_icon} ${g.name}</td>
          <td>${g.subject_name}</td>
          <td style="text-align: center; font-size: .75rem;">${TYPE[g.game_type] || g.game_type}</td>
          <td style="text-align: center;">${g.question_count || 0}</td>
          <td style="text-align: center;">${g.play_count || 0}</td>
          <td style="text-align: center; font-weight: 700; color: ${(g.avg_score || 0) >= 70 ? '#10B981' : (g.avg_score || 0) >= 50 ? '#F59E0B' : '#EF4444'};">
            ${g.avg_score || 0}%
          </td>
        </tr>`;
      }).join('');
    }
  } catch(e) {
    console.error('Error loading executive data:', e);
    alert('❌ เชื่อมต่อไม่ได้');
  }
}

function exSelectTab(tab) {
  _exTab = tab;
  _renderExecutivePanel();
}

function exReload() {
  exLoadData();
}
