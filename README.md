# KidLearn — ระบบเรียนรู้สนุกสำหรับเด็ก

แอปพลิเคชันเว็บสำหรับการเรียนรู้ผ่านเกม รองรับ 4 บทบาท: นักเรียน, ผู้ปกครอง, ครู และผู้ดูแลระบบ

---

## การติดตั้งด้วย Docker

### ความต้องการ
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### ขั้นตอน

```bash
# 1. เข้าโฟลเดอร์
cd kidlearn

# 2. รัน Docker (ครั้งแรก build ~2-3 นาที)
docker compose up -d

# 3. รอ ~30 วินาที แล้วเปิดเบราว์เซอร์
```

| บริการ | URL |
|--------|-----|
| 🌐 เว็บไซต์ | http://localhost:8080 |
| 🗄️ phpMyAdmin | http://localhost:8081 |

### ตั้งค่า Admin Account (ครั้งแรก)
```
เปิด: http://localhost:8080/api/init_admin.php
```
จากนั้นลบไฟล์ `api/init_admin.php` ทิ้ง

### บัญชีทดสอบ

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin01` |
| ครู | `teacher01` | `password` |
| นักเรียน | `student01` | `password` |
| ผู้ปกครอง | `parent01` | `password` |

### คำสั่งที่ใช้บ่อย

```bash
docker compose up -d          # เริ่มรัน
docker compose down           # หยุด
docker compose down -v        # หยุด + reset ฐานข้อมูล
docker compose logs -f web    # ดู PHP log
docker compose restart web    # restart PHP
```

---

## โครงสร้างไฟล์

```
kidlearn/
├── index.html              # หน้า Login + ลืมรหัสผ่าน
├── register.html           # หน้าสมัครสมาชิก
├── app.html                # แอปหลัก (SPA — โหลดครั้งเดียว)
├── style.css               # CSS ทั้งหมด
├── kidlearn_full.sql       # Database schema + ข้อมูลเริ่มต้น
├── docker-compose.yml      # กำหนด services: db, web, phpmyadmin
├── docker/
│   ├── Dockerfile          # PHP 8.2 + Apache image
│   ├── php.ini             # ตั้งค่า PHP (timezone, upload size ฯลฯ)
│   └── apache.conf         # Apache VirtualHost
├── api/
│   ├── backend.php         # PHP API ทั้งหมด (36 endpoints)
│   └── init_admin.php      # ตั้งรหัส admin (รันครั้งเดียว แล้วลบ)
├── js/
│   ├── api.js              # HTTP client ส่ง request ไป backend.php
│   ├── state.js            # Global state (object A)
│   ├── auth.js             # Login / Logout / Register / Session
│   ├── router.js           # SPA routing + แสดงเมนูตาม role
│   ├── data.js             # ข้อมูลเกม/วิชา (static ไม่ต้องดึง DB)
│   ├── home.js             # หน้าหลัก + progress bar
│   ├── game.js             # Engine เกม 6 ประเภท
│   ├── scores.js           # หน้าคะแนน
│   ├── teacher.js          # แผงครู
│   ├── game_editor.js      # ครูแก้ไขคำถาม-คำตอบ
│   ├── admin.js            # แผง Admin
│   ├── recommendations.js  # คำแนะนำผู้ปกครอง
│   ├── children.js         # จัดการบุตรหลาน
│   └── profile.js          # แก้ไขโปรไฟล์
└── content/
    └── lessons.sql         # ตัวอย่างเนื้อหาบทเรียน
```

---

## สถาปัตยกรรมระบบ

```
┌─────────────────────────────────────────┐
│  Browser                                │
│                                         │
│  index.html / register.html             │
│  app.html (SPA)                         │
│    ├── js/api.js  ──── fetch() ──────┐  │
│    ├── js/state.js (A object)        │  │
│    ├── js/router.js                  │  │
│    └── js/*.js (features)            │  │
└──────────────────────────────────────┼──┘
                                       │ HTTP JSON
                     ┌─────────────────▼──────────────┐
                     │  Docker: kidlearn_web           │
                     │  PHP 8.2 + Apache               │
                     │  api/backend.php                │
                     │    ├── Session (PHP)            │
                     │    ├── class DB (mysqli)        │
                     │    └── 36 handler functions     │
                     └─────────────────┬───────────────┘
                                       │ mysqli
                     ┌─────────────────▼───────────────┐
                     │  Docker: kidlearn_db             │
                     │  MySQL 8.0                      │
                     │  kidlearn_db                    │
                     └─────────────────────────────────┘
```

---

## การทำงานของแต่ละไฟล์

### `docker-compose.yml` — กำหนด 3 containers

```yaml
db:          # MySQL 8.0 — import kidlearn_full.sql อัตโนมัติตอนสร้างครั้งแรก
web:         # PHP+Apache — build จาก docker/Dockerfile, mount โฟลเดอร์ทั้งหมด
phpmyadmin:  # GUI จัดการ DB
```

containers คุยกันผ่าน Docker network อัตโนมัติ โดย `web` เชื่อม DB ด้วย hostname `db` (ชื่อ service)

---

### `api/backend.php` — จุดศูนย์กลาง API

รับ request ทุกอย่างผ่าน `?action=...` แล้วเรียก function:

```php
// routing
match ($action) {
    'login'      => handleLogin(),
    'save_score' => handleSaveScore(),
    'scores'     => handleScores(),
    ...
}
```

**โครงสร้างภายใน:**

```
backend.php
├── CONFIG — อ่าน DB_HOST/USER/PASS จาก env (Docker) หรือ fallback localhost (XAMPP)
├── class DB — Singleton mysqli
│   ├── run()  — execute query with prepared statement
│   ├── one()  — fetch แถวเดียว
│   ├── all()  — fetch ทุกแถว
│   └── rawQuery() — ใช้กับ CALL stored procedure (ไม่ throw ถ้า error)
├── SESSION — me(), myId(), myRole(), auth(), authRole()
└── HANDLERS (36 functions)
    ├── Auth: handleLogin, handleLogout, handleRegister, handleMe
    ├── Auth: handleForgotPassword, handleResetPassword, handleValidateEmail
    ├── Content: handleSubjects, handleGames, handleLessonContent
    ├── Content: handleSaveLesson, handleDeleteLesson
    ├── Scores: handleSaveScore, handleScores
    ├── Parent: handleMyChildren, handleLinkChild, handleAutoLink
    ├── Parent: handleRecommendations, handleNotifications
    ├── Teacher: handleTeacherStats, handleAllStudents
    ├── Game: handleGetGameQuestions, handleSaveQuestion, handleDeleteQuestion
    └── Admin: handleAdminUsers, handleAdminToggleUser, handleReport ...
```

---

### `js/api.js` — HTTP Client

ทุก JS call ไป backend ผ่านที่นี่:

```javascript
// ฟังก์ชันกลาง
async function _api(action, { method='GET', body, params } = {}) {
  // ต่อ URL: api/backend.php?action=login&param=value
  // ใส่ credentials:'include' สำหรับ session cookie
  // แปลง response เป็น JSON
  // คืน { ok: false, error: '...' } ถ้าเชื่อมต่อไม่ได้
}

// ตัวอย่าง API functions
const apiLogin         = (u, p) => _api('login',      { body: {username:u, password:p} });
const apiSaveScore     = (d)    => _api('save_score',  { body: d });
const apiGameQuestions = (gid)  => _api('game_questions', { params: {game_id:gid} });
```

---

### `js/state.js` — Global State

เก็บ state ทั้งหมดใน object `A`:

```javascript
A = {
  user,           // ข้อมูล user ที่ login (จาก normalizeUser())
  role,           // 'student' | 'parent' | 'teacher' | 'admin'
  curSub,         // วิชาที่เปิดอยู่
  curGame,        // เกมที่กำลังเล่น
  curDbGameId,    // game_id ใน DB (แปลงจาก JS key '1_1' → 1)
  gs,             // game state (คำถาม, คะแนน, เวลา timer)
  progCache,      // { subId: {pct, played} } cache progress ต่อวิชา
  progDirty,      // true = ต้อง fetch progress ใหม่หลังเล่นเกม
  selChild,       // student_id ที่ผู้ปกครองเลือก
  tcStudent,      // student_id ที่ครูกำลังดู
  tcSubject,      // subject_id ที่ครูกรองอยู่
  adminTab,       // 'users' | 'reports'
  reportTab,      // 'summary' | 'by_subject' | ...
}
```

---

### `js/router.js` — SPA Routing

```javascript
sec('home')   // → ซ่อนทุก section → แสดง #s-home → active nav → loadHome()
sec('teach')  // → ... → แสดง #s-teach → loadTeach()
sec('admin')  // → ... → แสดง #s-admin → loadAdmin()
```

`applyRoleUI()` แสดง/ซ่อนเมนูตาม role — เรียกครั้งเดียวหลัง login:

```
student → หน้าหลัก, วิชา, คะแนน, โปรไฟล์
parent  → หน้าหลัก, คำแนะนำ, จัดการบุตรหลาน, โปรไฟล์
teacher → หน้าหลัก, แผงครู, โปรไฟล์
admin   → ผู้ดูแลระบบ, โปรไฟล์
```

---

### `js/data.js` — ข้อมูลเกม Static

เก็บข้อมูลเกม 36 เกมใน `GAMES_DB`:

```javascript
GAMES_DB = {
  '1_1': { id:'1_1', sid:1, name:'บวกลบคล่อง', type:'mcq', qs:[...] },
  '1_2': { id:'1_2', sid:1, type:'truefalse', ... },
  // key: '{subjectId}_{gameIndex}'  →  sid 1-6, game 1-6
}
```

**JS key → DB game_id:**
```javascript
jsKeyToDbId('1_1') // → 1
jsKeyToDbId('2_3') // → 9   formula: (subject-1)*6 + game
jsKeyToDbId('6_6') // → 36
```

เหตุที่ใช้ static data: คำถาม-คำตอบในเกมโหลดได้เลยโดยไม่ต้อง API call ทำให้เร็วขึ้น ส่วน DB เก็บเฉพาะ คะแนน, เนื้อหาบทเรียน, และคำถามที่ครูแก้ไขเพิ่ม

---

### `js/auth.js` — Authentication

**Login:**
```
doLogin()
  → apiLogin(username, password)
  → normalizeUser(res.user)     // แปลง user_id→id, full_name→name
  → A.user = user, A.role = role
  → sessionStorage.setItem('kl_uid', uid)
  → redirect → app.html
```

**Session restore (เปิดหน้าใหม่/refresh):**
```
sessionLoad()
  → มี kl_uid ใน sessionStorage?
  → apiMe()   // ถาม PHP session ว่ายัง valid ไหม
  → A.user = normalizeUser(res)
```

---

### `js/home.js` — Progress Bar

```
loadHome()
  → renderSubCards()          // render จาก A.progCache ทันที (0% ถ้าไม่มี)
  → fetchProgCache()          // ถ้า progDirty หรือยังไม่มี cache
      → apiScores()           // GET ?action=scores
      → คำนวณ pct ต่อ subject
      → A.progCache = cache
      → A.progDirty = false
  → renderSubCards()          // re-render พร้อม % จริง
```

`A.progDirty = true` ถูกตั้งใน `game.js` หลัง `apiSaveScore()` สำเร็จ

---

### `js/game.js` — Engine เกม 6 ประเภท

```
startGame(jsKey)
  → โหลดคำถามจาก GAMES_DB
  → A.curDbGameId = jsKeyToDbId(jsKey)
  → เริ่ม timer countdown
  → renderQuestion(0)

checkAnswer(ans)
  → ตรวจคำตอบ → แสดง feedback (สี, animation)
  → nextQuestion() หรือ endGame()

endGame()
  → คำนวณคะแนน
  → แสดง result screen
  → apiSaveScore({ game_id: A.curDbGameId, score, time_spent })
  → A.progDirty = true
```

**6 ประเภทเกม:**
| type | การเล่น |
|------|---------|
| `mcq` | เลือกตอบ 4 ตัวเลือก |
| `truefalse` | ถูก/ผิด |
| `fill` | พิมพ์คำตอบ |
| `matching` | จับคู่ซ้าย-ขวา |
| `sequence` | ลากเรียงลำดับ |
| `wordsearch` | หาคำในตาราง |

---

### `js/teacher.js` + `js/game_editor.js`

**teacher.js** — 3 tab:

```
loadTeach()
  → apiTeacherStats()    // สถิติรายวิชา
  → apiAllStudents()     // รายชื่อนักเรียน
  → render tabs, student list, subject table

Tab "แก้ไขเกม" → _renderGameEditor() → game_editor.js:

selectGeGame(jsKey)
  → apiGameQuestions(dbGameId)   // โหลดคำถามที่มีอยู่
  → แสดงทุกคำถามพร้อมตัวเลือก

geOpenForm(idx)   // -1 = เพิ่มใหม่, ≥0 = แก้ไข
  → modal พร้อมข้อมูลเดิม (ถ้าแก้ไข)

geSaveQ(idx)
  → apiSaveQuestion(payload)    // POST upsert
  → reload คำถาม
```

---

### `js/admin.js` — แผง Admin

```
Tab "จัดการผู้ใช้":
  _loadAdminUsers({ role, search })
    → apiAdminUsers()          // ค้นหา + กรอง
    → render ตาราง
    → adminToggleUser()        // ระงับ/เปิด
    → adminResetPass()         // รีเซ็ตรหัสผ่าน
    → adminDeleteUser()        // ลบบัญชี

Tab "รายงาน" (5 ประเภท):
  apiReport('summary')         // จำนวนผู้ใช้, เล่นรวม, avg
  apiReport('by_subject')      // คะแนนแยกวิชา
  apiReport('by_student')      // ranking นักเรียน
  apiReport('by_game')         // เกมยอดนิยม
  apiReport('daily')           // กราฟ 30 วันล่าสุด
```

---

### `js/recommendations.js` — คำแนะนำผู้ปกครอง

```
loadRec()
  → apiAutoLink()              // silent: เชื่อมบุตรหลานอัตโนมัติถ้าเบอร์ตรง
  → apiMyChildren()            // รายชื่อบุตรหลาน
  → ถ้าไม่มี:
      แสดงวิธีเชื่อม + ปุ่ม "ค้นหาอัตโนมัติ"
  → apiRecommendations(sid)    // คำแนะนำจาก DB
  → apiScores(sid)             // ถ้าไม่มี rec → สร้างจากคะแนนเอง
  → render cards + สรุปรายวิชา
```

---

## Database Schema

**15 ตาราง** แบ่งเป็น 4 กลุ่ม:

```
ผู้ใช้:
  users ──┬── students (parent_phone)
          ├── parents  (phone)
          ├── teachers
          └── admins

  parents }──────────────────{ students
              parent_student

เนื้อหา:
  subjects → games → questions → answers
                  └── lesson_content

คะแนน:
  students → scores ← games
  students → progress (cache avg ต่อวิชา)

การแจ้งเตือน:
  parents → recommendations (+ students + subjects)
  parents → parent_notifications
  users   → activity_log
  users   → password_resets (OTP ลืมรหัสผ่าน 30 นาที)
```

---

## การเชื่อมผู้ปกครอง ↔ นักเรียน

จับคู่อัตโนมัติผ่านเบอร์โทร:

```
นักเรียนสมัคร  → กรอก parent_phone
                → ค้นหา parents.phone ที่ตรงกัน
                → INSERT parent_student อัตโนมัติ

ผู้ปกครองสมัคร → กรอก phone
                → ค้นหา students.parent_phone ที่ตรงกัน
                → INSERT parent_student อัตโนมัติ
```

รองรับทั้ง 9 หลัก (081234567) และ 10 หลัก (0812345678) ผ่าน `normalizePhone()`

---

## เพิ่มเนื้อหาบทเรียน

**ผ่านหน้าเว็บ (ครู):**
> Login ครู → แผงครู → แท็บ "📝 แก้ไขบทเรียน" → เลือกเกม → เขียน HTML → บันทึก

**ผ่าน SQL:**
```sql
-- game_id = (subject_no - 1) × 6 + game_no
-- วิชา 1 เกม 1 = 1,  วิชา 2 เกม 3 = 9,  วิชา 6 เกม 6 = 36
INSERT INTO lesson_content (game_id, lesson_no, title, body, read_time)
VALUES (1, 1, 'บวกเลขหลักเดียว', '<h2>การบวก</h2><p>...</p>', 5);
```

---

## Troubleshooting

**"เชื่อมต่อ server ไม่ได้"**
```bash
docker compose ps              # ตรวจสถานะ
docker compose logs web        # ดู PHP error
```

**DB ยังไม่พร้อม**
```bash
docker compose logs db         # รอเห็น "ready for connections"
docker compose restart web     # restart PHP หลัง DB พร้อม
```

**Reset ทุกอย่าง**
```bash
docker compose down -v         # ลบ volume (ข้อมูลหาย)
docker compose up -d           # สร้างใหม่
```

**Session หมดเร็ว** — แก้ `docker/php.ini`:
```ini
session.gc_maxlifetime = 86400
```
