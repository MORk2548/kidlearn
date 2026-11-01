// ══════════════════════════════════════════════════════
// THEME — 'light' | 'dark' | 'auto' เก็บแยกต่อเครื่อง
// โหลดใน <head> เพื่อให้หน้าไม่กระพริบเป็นธีมผิดก่อน
// ══════════════════════════════════════════════════════
const THEME_KEY = 'kl-theme';
const _darkMq = matchMedia('(prefers-color-scheme: dark)');

function themePref() {
  try { return localStorage.getItem(THEME_KEY) || 'light'; } catch (e) { return 'light'; }
}

function applyTheme(pref = themePref()) {
  document.documentElement.dataset.theme = pref === 'auto' ? (_darkMq.matches ? 'dark' : 'light') : pref;
}

function setTheme(pref) {
  try { localStorage.setItem(THEME_KEY, pref); } catch (e) {}
  applyTheme(pref);
  loadSettings();
}

function loadSettings() {
  const pref = themePref();
  document.querySelectorAll('.theme-opt').forEach(b => {
    const on = b.dataset.themePref === pref;
    b.classList.toggle('on', on);
    b.setAttribute('aria-checked', on);
  });
}

_darkMq.addEventListener('change', () => applyTheme());
applyTheme();
