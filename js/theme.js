// ══════════════════════════════════════════════════════
// PREFS — ค่าที่ผู้ใช้ตั้งเองต่อเครื่อง (ธีม, ขนาดตัวอักษร)
// โหลดใน <head> เพื่อให้หน้าไม่กระพริบเป็นค่าผิดก่อน
// ══════════════════════════════════════════════════════
const PREFS = {
  theme: { key: 'kl-theme', def: 'light' },
  font:  { key: 'kl-font',  def: 'md' },
};
const _darkMq = matchMedia('(prefers-color-scheme: dark)');

function getPref(name) {
  try { return localStorage.getItem(PREFS[name].key) || PREFS[name].def; } catch (e) { return PREFS[name].def; }
}

function applyPrefs() {
  const html = document.documentElement;
  const theme = getPref('theme');
  html.dataset.theme = theme === 'auto' ? (_darkMq.matches ? 'dark' : 'light') : theme;
  html.dataset.font = getPref('font');
}

function setPref(name, value) {
  try { localStorage.setItem(PREFS[name].key, value); } catch (e) {}
  applyPrefs();
  loadSettings();
}

function loadSettings() {
  document.querySelectorAll('[data-pref]').forEach(b => {
    const on = getPref(b.dataset.pref) === b.dataset.value;
    b.classList.toggle('on', on);
    b.setAttribute('aria-checked', on);
  });
}

_darkMq.addEventListener('change', applyPrefs);
applyPrefs();
