// ══════════════════════════════════════════════════════
// DATA — USERS
// ══════════════════════════════════════════════════════
let USERS = []; // ข้อมูลมาจาก PHP API

function formatDateTimeTH(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
}

// ══════════════════════════════════════════════════════
// MOCK SCORES (per student id)
// ══════════════════════════════════════════════════════
let SCORES = {}; // ข้อมูลมาจาก PHP API
