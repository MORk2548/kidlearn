// ══════════════════════════════════════════════════════
// ครูสร้างบัญชีนักเรียน: กรอกเอง หรือนำเข้าจากไฟล์/คลิปบอร์ด
// ไฟล์ทุกแบบถูกแปลงเป็น grid (string[][]) แล้วใช้การจับคู่คอลัมน์ชุดเดียวกัน
// ══════════════════════════════════════════════════════
if(typeof A.si==='undefined') A.si = null;

const SI_LIBS = {
  xlsx: ['https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js'],
  docx: ['https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js'],
  pdf:  ['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'],
};
const SI_PDF_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const SI_MAX_ROWS = 200;
const SI_MAX_FILE_BYTES = 5 * 1024 * 1024;
const SI_FIELDS = [
  { key: 'prefix', label: 'คำนำหน้า', optional: true },
  { key: 'name',   label: 'ชื่อ' },
  { key: 'last',   label: 'นามสกุล', optional: true },
  { key: 'phone',  label: 'เบอร์ผู้ปกครอง' },
];

const _siScripts = {};
function siLoadScript(url){
  return _siScripts[url] ||= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = url; s.onload = resolve;
    s.onerror = () => { delete _siScripts[url]; reject(new Error('โหลดตัวอ่านไฟล์ไม่สำเร็จ ตรวจสอบอินเทอร์เน็ต')); };
    document.head.appendChild(s);
  });
}
const siLoadLib = (name) => Promise.all(SI_LIBS[name].map(siLoadScript));

function siDecodeText(buf){
  // CSV ภาษาไทยจาก Excel มักบันทึกเป็น Windows-874 ไม่ใช่ UTF-8
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); }
  catch { return new TextDecoder('windows-874').decode(buf); }
}

function siParseDelimited(text){
  text = text.replace(/^﻿/, '');
  const firstLine = text.split(/\r?\n/, 1)[0];
  const delim = firstLine.includes('\t') ? '\t' : (firstLine.split(';').length > firstLine.split(',').length ? ';' : ',');
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === '') quoted = true;
    else if (ch === delim) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

async function siReadSheet(buf){
  await siLoadLib('xlsx');
  const wb = XLSX.read(buf, { type: 'array' });
  return wb.SheetNames.map(name => ({
    sheet: wb.SheetNames.length > 1 ? name : '',
    grid: XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: false, defval: '' }),
  }));
}

async function siReadDocx(buf){
  await siLoadLib('docx');
  const { value } = await mammoth.convertToHtml({ arrayBuffer: buf });
  const tables = [...new DOMParser().parseFromString(value, 'text/html').querySelectorAll('table')];
  if (!tables.length) throw new Error('ไม่พบตารางในไฟล์ Word');
  return tables.map((t, i) => ({
    sheet: tables.length > 1 ? `ตารางที่ ${i + 1}` : '',
    grid: [...t.rows].map(tr => [...tr.cells].map(td => td.textContent.trim())),
  }));
}

async function siReadPdf(buf){
  await siLoadLib('pdf');
  pdfjsLib.GlobalWorkerOptions.workerSrc = SI_PDF_WORKER;
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const grid = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const items = (await (await pdf.getPage(p)).getTextContent()).items.filter(it => it.str.trim());
    const lines = [];
    items.forEach(it => {
      const y = it.transform[5];
      let line = lines.find(l => Math.abs(l.y - y) < 3);
      if (!line) lines.push(line = { y, items: [] });
      line.items.push(it);
    });
    lines.sort((a, b) => b.y - a.y).forEach(line => {
      const cells = []; let end = -Infinity;
      line.items.sort((a, b) => a.transform[4] - b.transform[4]).forEach(it => {
        const x = it.transform[4];
        // ช่องว่างกว้างคือขึ้นคอลัมน์ใหม่ ช่องแคบคือคำถัดไปในช่องเดิม
        if (!cells.length || x - end > 8) cells.push(it.str);
        else cells[cells.length - 1] += (x - end > 1.5 ? ' ' : '') + it.str;
        end = x + it.width;
      });
      grid.push(cells.map(c => c.trim()));
    });
  }
  if (!grid.length) throw new Error('ไฟล์ PDF นี้เป็นภาพสแกน อ่านข้อความไม่ได้ กรุณาใช้ไฟล์ Excel หรือกรอกเอง');
  return [{ sheet: '', grid }];
}

const SI_READERS = {
  xlsx: siReadSheet, xls: siReadSheet, ods: siReadSheet,
  csv: async buf => [{ sheet: '', grid: siParseDelimited(siDecodeText(buf)) }],
  tsv: async buf => [{ sheet: '', grid: siParseDelimited(siDecodeText(buf)) }],
  txt: async buf => [{ sheet: '', grid: siParseDelimited(siDecodeText(buf)) }],
  docx: siReadDocx,
  pdf: siReadPdf,
};
const SI_UNSUPPORTED = {
  doc: 'ไฟล์ Word รุ่นเก่า (.doc) อ่านไม่ได้ กรุณาบันทึกเป็น .docx ก่อน',
  jpg: 'ไฟล์รูปภาพอ่านรายชื่อไม่ได้ กรุณาใช้ไฟล์ Excel หรือกรอกเอง',
  jpeg: 'ไฟล์รูปภาพอ่านรายชื่อไม่ได้ กรุณาใช้ไฟล์ Excel หรือกรอกเอง',
  png: 'ไฟล์รูปภาพอ่านรายชื่อไม่ได้ กรุณาใช้ไฟล์ Excel หรือกรอกเอง',
};

const siCell = (row, col) => col >= 0 ? String(row?.[col] ?? '').trim() : '';
const siDigits = (s) => String(s).replace(/\D/g, '');
const siLooksPhone = (s) => /^\d{9,10}$/.test(siDigits(s)) && !/[a-zก-๙]/i.test(s);

function siDetect(grid){
  for (let r = 0; r < Math.min(grid.length, 15); r++) {
    const cells = (grid[r] || []).map(c => String(c).trim());
    const find = (test, skip = []) => cells.findIndex((c, i) => c && !skip.includes(i) && test(c));
    const phone = find(c => /เบอร์|โทร|phone|tel|มือถือ/i.test(c));
    if (phone < 0) continue;
    const prefix = find(c => /คำนำหน้า|prefix|title/i.test(c), [phone]);
    const isName = c => /ชื่อ|name/i.test(c) && !/ผู้ปกครอง|parent|เล่น|nick|โรงเรียน|school/i.test(c);
    let name = find(c => isName(c) && /นักเรียน|student/i.test(c), [phone, prefix]);
    if (name < 0) name = find(c => isName(c) && !/^(นาม)?สกุล/.test(c), [phone, prefix]);
    if (name < 0) continue;
    // "ชื่อ-นามสกุล" อยู่ในคอลัมน์เดียว ไม่ต้องหาคอลัมน์นามสกุลแยก
    const last = /สกุล|full/i.test(cells[name]) ? -1
      : find(c => /นามสกุล|^สกุล|surname|last ?name/i.test(c), [phone, prefix, name]);
    return { header: r, prefix, name, last, phone };
  }
  const width = Math.max(0, ...grid.map(r => r.length));
  const score = test => [...Array(width).keys()].map(c => grid.filter(r => test(siCell(r, c))).length);
  const phoneScore = score(siLooksPhone);
  const phone = phoneScore.indexOf(Math.max(...phoneScore));
  const nameScore = score(s => /[a-zก-๙]{2}/i.test(s)).map((v, c) => c === phone ? -1 : v);
  const name = nameScore.indexOf(Math.max(...nameScore));
  return { header: -1, prefix: -1, name, last: -1, phone: phoneScore[phone] ? phone : -1 };
}

function siRowsFromSource(src, srcIndex){
  const m = src.map;
  return src.grid.slice(m.header + 1).map(r => ({
    name: (siCell(r, m.prefix) + siCell(r, m.name) + (siCell(r, m.last) ? ' ' + siCell(r, m.last) : '')).trim(),
    phone: siCell(r, m.phone),
    src: srcIndex, err: null,
  })).filter(r => r.name || r.phone);
}

async function loadStudentImport(){
  const panel = document.getElementById('tc-student-panel');
  if (!panel) return;
  let rooms = A.tcClassrooms || [];
  if (A.role === 'teacher') {
    const asg = await apiTeacherAssignments().catch(() => ({ ok: false }));
    const ids = new Set((asg.assignments || []).map(a => +a.classroom_id));
    rooms = rooms.filter(r => ids.has(+r.classroom_id));
  }
  A.si ||= { classroomId: rooms.length === 1 ? rooms[0].classroom_id : '', rows: [], sources: [], checked: false, accounts: null, msg: '' };
  A.si.rooms = rooms;
  if (!A.si.rows.length) siAddRows(5, false);
  siRender();
}

function siAddRows(n, render = true){
  for (let i = 0; i < n; i++) A.si.rows.push({ name: '', phone: '', src: -1, err: null });
  if (render) siRender();
}

function siFilledRows(){ return A.si.rows.filter(r => r.name.trim() || r.phone.trim()); }

function siRender(){
  const panel = document.getElementById('tc-student-panel');
  const si = A.si;
  if (!panel || !si) return;
  if (si.accounts) { siRenderAccounts(panel); return; }
  const groups = {};
  si.rooms.forEach(r => (groups[r.grade] ||= []).push(r));
  const filled = siFilledRows().length;
  const errCount = si.rows.filter(r => r.err).length;
  const colOptions = (src, sel) => {
    const head = src.map.header >= 0 ? src.grid[src.map.header] : src.grid[0] || [];
    const width = Math.max(0, ...src.grid.map(r => r.length));
    return [...Array(width).keys()].map(c =>
      `<option value="${c}"${c === sel ? ' selected' : ''}>คอลัมน์ ${c + 1}${head[c] ? ': ' + _esc(String(head[c]).slice(0, 20)) : ''}</option>`).join('');
  };
  panel.innerHTML = `<div class="ts">
    <h3>👦 เพิ่มบัญชีนักเรียน</h3>
    <div class="fg">
      <label class="fl">🏫 ชั้นและห้อง</label>
      <select class="fc" onchange="A.si.classroomId=this.value;siDirty()">
        <option value="">-- เลือกห้อง --</option>
        ${Object.entries(groups).map(([g, list]) => `<optgroup label="${g}">${list.map(r =>
          `<option value="${r.classroom_id}"${r.classroom_id == si.classroomId ? ' selected' : ''}>${classLabel(r)}</option>`).join('')}</optgroup>`).join('')}
      </select>
      ${si.rooms.length ? '' : '<div style="font-size:.8rem;color:var(--mu);margin-top:.3rem">ยังไม่มีห้องที่คุณสอน</div>'}
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:.75rem">
      <label class="btn btn-s btn-sm" style="cursor:pointer">📂 นำเข้าไฟล์
        <input type="file" multiple accept=".xlsx,.xls,.ods,.csv,.tsv,.txt,.docx,.pdf" style="display:none" onchange="siPickFiles(this)">
      </label>
      <button class="btn btn-s btn-sm" onclick="document.getElementById('si-paste').style.display='block'">📋 วางจาก Excel / Sheets</button>
      <button class="btn btn-s btn-sm" onclick="siDownloadTemplate()">⬇️ ไฟล์ตัวอย่าง</button>
    </div>
    <div style="font-size:.78rem;color:var(--mu);margin-bottom:.75rem">รองรับ Excel (.xlsx .xls) · .ods · .csv · Word (.docx ที่มีตาราง) · PDF ที่เลือกข้อความได้ · ไฟล์ต้องมีชื่อนักเรียนและเบอร์ผู้ปกครอง</div>
    <div id="si-paste" style="display:none;margin-bottom:.75rem">
      <textarea class="fc" rows="5" placeholder="คัดลอกตารางจาก Excel, Word หรือ Google Sheets แล้ววางที่นี่"></textarea>
      <button class="btn btn-p btn-sm" style="margin-top:.4rem" onclick="siPaste(this.previousElementSibling.value)">ใช้ข้อมูลที่วาง</button>
    </div>
    ${si.sources.map((src, i) => `<div style="border:1px dashed var(--bd,#ddd);border-radius:10px;padding:.5rem .7rem;margin-bottom:.5rem;font-size:.8rem">
      <strong>📄 ${_esc(src.label)}</strong>
      <div style="display:flex;flex-wrap:wrap;gap:.4rem .8rem;margin-top:.35rem">
        ${SI_FIELDS.map(f => `<label style="display:flex;gap:.3rem;align-items:center">${f.label}
          <select class="fc" style="padding:.2rem .4rem;width:auto" onchange="siRemap(${i},'${f.key}',+this.value)">
            <option value="-1">${f.optional ? '— ไม่มี —' : '— เลือก —'}</option>${colOptions(src, src.map[f.key])}
          </select></label>`).join('')}
      </div></div>`).join('')}
    ${si.msg ? `<div class="al ae">${_esc(si.msg)}</div>` : ''}
    <div style="overflow-x:auto">
      <table style="border-collapse:collapse;font-size:.82rem;width:100%;min-width:420px">
        <thead><tr>
          <th style="padding:.4rem;text-align:left;width:2rem">#</th>
          <th style="padding:.4rem;text-align:left">ชื่อ-นามสกุล</th>
          <th style="padding:.4rem;text-align:left;width:9rem">เบอร์ผู้ปกครอง</th>
          <th style="width:2rem"></th>
        </tr></thead>
        <tbody>${si.rows.map((r, i) => `<tr style="border-top:1px solid #F1F5F9${r.err ? ';background:#FEF2F2' : ''}">
          <td style="padding:.3rem;vertical-align:top;color:var(--mu)">${i + 1}</td>
          <td style="padding:.3rem;vertical-align:top"><input class="fc" style="padding:.3rem .5rem" value="${_esc(r.name)}" oninput="siEdit(${i},'name',this.value)">
            ${r.err ? `<div style="color:#B91C1C;font-size:.74rem;margin-top:.15rem">⚠️ ${_esc(r.err)}</div>` : ''}
            ${r.src >= 0 ? `<div style="color:var(--mu);font-size:.7rem">จาก ${_esc(si.sources[r.src]?.label || '')}</div>` : ''}</td>
          <td style="padding:.3rem;vertical-align:top"><input class="fc" style="padding:.3rem .5rem" inputmode="tel" value="${_esc(r.phone)}" oninput="siEdit(${i},'phone',this.value)"></td>
          <td style="vertical-align:top"><button class="btn btn-s btn-sm" title="ลบแถว" onclick="siRemoveRow(${i})">✕</button></td>
        </tr>`).join('')}</tbody>
      </table>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin-top:.75rem">
      <button class="btn btn-s btn-sm" onclick="siAddRows(5)">➕ เพิ่ม 5 แถว</button>
      ${si.sources.length || filled ? '<button class="btn btn-s btn-sm" onclick="siClear()">🗑️ ล้างทั้งหมด</button>' : ''}
      <span style="font-size:.8rem;color:var(--mu)">${filled} คน${errCount ? ` · <span style="color:#B91C1C">ต้องแก้ ${errCount} แถว</span>` : ''}</span>
    </div>
    <div style="display:flex;gap:.5rem;margin-top:1rem">
      <button class="btn btn-s" style="flex:1" onclick="siCheck()">🔍 ตรวจสอบ</button>
      <button class="btn btn-p" style="flex:1" id="si-submit" onclick="siSubmit()"${si.checked ? '' : ' disabled'}>✅ สร้างบัญชี ${filled} คน</button>
    </div>
  </div>`;
}

function siDirty(){
  A.si.checked = false;
  const btn = document.getElementById('si-submit');
  if (btn) btn.disabled = true;
}

function siEdit(i, key, value){ A.si.rows[i][key] = value; siDirty(); }
function siRemoveRow(i){ A.si.rows.splice(i, 1); A.si.checked = false; siRender(); }
function siClear(){ A.si.rows = []; A.si.sources = []; A.si.msg = ''; A.si.checked = false; siAddRows(5); }

function siAddSource(label, grid){
  grid = grid.map(r => (r || []).map(c => String(c ?? '')));
  const src = { label, grid, map: siDetect(grid) };
  const index = A.si.sources.push(src) - 1;
  A.si.rows = A.si.rows.filter(r => r.name.trim() || r.phone.trim()).concat(siRowsFromSource(src, index));
}

function siRemap(srcIndex, key, col){
  const src = A.si.sources[srcIndex];
  src.map[key] = col;
  const rows = siRowsFromSource(src, srcIndex);
  const first = A.si.rows.findIndex(r => r.src === srcIndex);
  A.si.rows = A.si.rows.filter(r => r.src !== srcIndex);
  A.si.rows.splice(first < 0 ? A.si.rows.length : first, 0, ...rows);
  A.si.checked = false;
  siRender();
}

async function siPickFiles(input){
  const files = [...input.files];
  input.value = '';
  const problems = [];
  for (const file of files) {
    const ext = file.name.split('.').pop().toLowerCase();
    try {
      if (SI_UNSUPPORTED[ext]) throw new Error(SI_UNSUPPORTED[ext]);
      if (!SI_READERS[ext]) throw new Error('ไม่รองรับไฟล์ชนิดนี้');
      if (file.size > SI_MAX_FILE_BYTES) throw new Error('ไฟล์ใหญ่เกิน 5 MB');
      A.si.msg = `⏳ กำลังอ่าน ${file.name}...`; siRender();
      const parts = await SI_READERS[ext](await file.arrayBuffer());
      parts.forEach(p => siAddSource(p.sheet ? `${file.name} (${p.sheet})` : file.name, p.grid));
    } catch (e) {
      problems.push(`${file.name}: ${e.message || 'อ่านไฟล์ไม่สำเร็จ'}`);
    }
  }
  A.si.msg = problems.join(' · ');
  A.si.checked = false;
  siRender();
}

function siPaste(text){
  if (!text.trim()) return;
  siAddSource(`ข้อมูลที่วาง ${A.si.sources.length + 1}`, siParseDelimited(text));
  A.si.msg = ''; A.si.checked = false;
  siRender();
}

function siRequest(dryRun){
  const rows = siFilledRows();
  if (!A.si.classroomId) return Promise.resolve({ ok: false, error: 'กรุณาเลือกชั้นและห้อง' });
  if (!rows.length) return Promise.resolve({ ok: false, error: 'ยังไม่มีรายชื่อนักเรียน' });
  if (rows.length > SI_MAX_ROWS) return Promise.resolve({ ok: false, error: `เพิ่มได้ครั้งละไม่เกิน ${SI_MAX_ROWS} คน` });
  return apiTeacherCreateStudents({
    classroom_id: +A.si.classroomId, dry_run: dryRun,
    students: rows.map(r => ({ full_name: r.name, parent_phone: r.phone })),
  }).then(res => {
    if (res.ok) rows.forEach((r, i) => { r.err = res.errors[i] || null; });
    return res;
  });
}

async function siCheck(){
  const res = await siRequest(true);
  A.si.rows = siFilledRows();
  A.si.msg = res.ok ? '' : res.error;
  A.si.checked = res.ok && !res.errors.some(Boolean);
  siRender();
}

async function siSubmit(){
  const btn = document.getElementById('si-submit');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ กำลังสร้างบัญชี...'; }
  const res = await siRequest(false);
  A.si.msg = res.ok ? '' : res.error;
  if (res.ok && res.accounts.length) {
    A.si.accounts = res.accounts;
    A.si.accountRoom = classLabel(A.si.rooms.find(r => r.classroom_id == A.si.classroomId));
    loadTeach();
  }
  A.si.checked = false;
  siRender();
}

function siRenderAccounts(panel){
  const si = A.si;
  panel.innerHTML = `<div class="ts">
    <h3>✅ สร้างบัญชีแล้ว ${si.accounts.length} คน · ${_esc(si.accountRoom)}</h3>
    <div class="al ae">รหัสผ่านแสดงครั้งเดียว กรุณาดาวน์โหลดหรือพิมพ์เก็บไว้ก่อนออกจากหน้านี้</div>
    <div style="overflow-x:auto"><table style="border-collapse:collapse;font-size:.85rem;width:100%">
      <thead><tr><th style="padding:.4rem;text-align:left">ชื่อ</th><th style="padding:.4rem;text-align:left">ชื่อผู้ใช้</th><th style="padding:.4rem;text-align:left">รหัสผ่าน</th></tr></thead>
      <tbody>${si.accounts.map(a => `<tr style="border-top:1px solid #F1F5F9"><td style="padding:.4rem">${_esc(a.full_name)}</td><td style="padding:.4rem;font-family:monospace">${a.username}</td><td style="padding:.4rem;font-family:monospace">${a.password}</td></tr>`).join('')}</tbody>
    </table></div>
    <div style="display:flex;flex-wrap:wrap;gap:.5rem;margin-top:1rem">
      <button class="btn btn-p" onclick="siDownloadAccounts()">⬇️ ดาวน์โหลด CSV</button>
      <button class="btn btn-s" onclick="siPrintAccounts()">🖨️ พิมพ์บัตรแจกนักเรียน</button>
      <button class="btn btn-s" onclick="if(confirm('ดาวน์โหลดหรือพิมพ์รหัสผ่านไว้แล้วใช่ไหม?')){A.si=null;loadStudentImport();}">➕ เพิ่มนักเรียนชุดใหม่</button>
    </div>
  </div>`;
}

function siDownloadCsv(filename, rows){
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function siDownloadTemplate(){
  siDownloadCsv('ตัวอย่างรายชื่อนักเรียน.csv', [['ชื่อ-นามสกุล', 'เบอร์ผู้ปกครอง'], ['ด.ช.สมชาย ใจดี', '0812345678']]);
}

function siDownloadAccounts(){
  const si = A.si;
  siDownloadCsv(`บัญชีนักเรียน ${si.accountRoom.replace(/[\\/:*?"<>|]/g, '-')}.csv`,
    [['ชื่อ', 'ชื่อผู้ใช้', 'รหัสผ่าน'], ...si.accounts.map(a => [a.full_name, a.username, a.password])]);
}

function siPrintAccounts(){
  const si = A.si;
  const w = window.open('', '_blank');
  if (!w) { alert('เบราว์เซอร์บล็อกหน้าต่างพิมพ์ กรุณาอนุญาตป๊อปอัป'); return; }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>บัญชีนักเรียน ${_esc(si.accountRoom)}</title>
    <style>body{font-family:sans-serif;display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:12px}
    .c{border:1px dashed #999;border-radius:8px;padding:10px;break-inside:avoid}.c b{font-size:1.05rem}.k{font-family:monospace;font-size:1.1rem}</style></head><body>
    ${si.accounts.map(a => `<div class="c"><b>${_esc(a.full_name)}</b> · ${_esc(si.accountRoom)}<br>KidLearn<br>ชื่อผู้ใช้: <span class="k">${a.username}</span><br>รหัสผ่าน: <span class="k">${a.password}</span></div>`).join('')}
    </body></html>`);
  w.document.close();
  w.print();
}
