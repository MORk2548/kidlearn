// ══════════════════════════════════════════════════════════════
// api.js  —  ตัวกลาง JS ↔ PHP/MySQL (Docker)
// ══════════════════════════════════════════════════════════════
const API_URL = 'api/backend.php';

async function _api(action, { method='GET', body, params }={}) {
  let url = `${API_URL}?action=${action}`;
  if (params) Object.entries(params).forEach(([k,v])=>{ if(v!=null) url+=`&${k}=${encodeURIComponent(v)}`; });
  const opt = { method, credentials:'include', headers:{} };
  if (body){ opt.method='POST'; opt.headers['Content-Type']='application/json'; opt.body=JSON.stringify(body); }
  try {
    const r = await fetch(url, opt);
    const data = await r.json();
    // แปลง HTTP error เป็น error message ที่ชัดเจน
    if (!data.ok && r.status === 401) return { ok:false, error:'กรุณาเข้าสู่ระบบใหม่ (session หมดอายุ)' };
    if (!data.ok && r.status === 403) return { ok:false, error:'ไม่มีสิทธิ์ดำเนินการนี้' };
    return data;
  } catch(e) {
    console.error('[KidLearn API]', action, e);
    return { ok:false, error:'เชื่อมต่อ server ไม่ได้ — ตรวจสอบว่า Docker container (kidlearn_web) รันอยู่' };
  }
}

// AUTH
const apiLogin          = (u,p) => _api('login',           {body:{username:u,password:p}});
const apiLogout         = ()    => _api('logout',          {method:'POST'});
const apiRegister       = (d)   => _api('register',        {body:d});
const apiMe             = ()    => _api('me');
const apiUpdateProfile  = (d)   => _api('update_profile',  {body:d});
const apiChangePassword = (d)   => _api('change_password', {body:d});

// SUBJECTS / GAMES
const apiSubjects = ()    => _api('subjects');
const apiGames    = (sid) => _api('games', {params:{subject_id:sid}});

// SCORES
const apiSaveScore = (d)   => _api('save_score', {body:d});
const apiScores    = (sid) => _api('scores', sid?{params:{student_id:sid}}:{});

// LESSON CONTENT
const apiGetContent    = (gid)      => _api('get_content',    {params:{game_id:gid}});
const apiLessonContent = (gid,lno)  => _api('lesson_content', {params:{game_id:gid,lesson_no:lno}});

// PARENT
const apiMyChildren      = ()    => _api('my_children');
const apiLinkChild       = (d)   => _api('link_child',      {body:d});
const apiUnlinkChild     = (d)   => _api('unlink_child',    {body:d});
const apiRecommendations = (sid) => _api('recommendations', sid?{params:{student_id:sid}}:{});
const apiNotifications   = ()    => _api('notifications');
const apiMarkNotifRead   = (id)  => _api('mark_notif_read', {body:id?{notif_id:id}:{}});

// TEACHER
const apiTeacherStats  = ()    => _api('teacher_stats');
const apiAllStudents   = ()    => _api('all_students');
const apiStudentScores = (sid, subjectId) => {
  const params = {student_id:sid};
  if(subjectId) params.subject_id = subjectId;
  return _api('scores', {params});
};

// LESSON EDITOR (ครู)
const apiSaveLesson   = (d) => _api('save_lesson',   {body:d});
const apiDeleteLesson = (d) => _api('delete_lesson', {body:d});

// auto-link parent ↔ student
const apiAutoLink = () => _api('auto_link', {method:'POST', body:{}});

// 2.0 ADMIN USERS
const apiAdminUsers       = (p={}) => _api('admin_users', {params:p});
const apiAdminToggleUser  = (d)    => _api('admin_toggle_user',  {body:d});
const apiAdminDeleteUser  = (d)    => _api('admin_delete_user',  {body:d});
const apiAdminResetPass   = (d)    => _api('admin_reset_pass',   {body:d});
// 3.0 SUBJECTS
const apiSaveSubject      = (d)    => _api('save_subject',   {body:d});
const apiToggleSubject    = (d)    => _api('toggle_subject', {body:d});
// 4.0 GAME QUESTIONS
const apiGameQuestions    = (gid)  => _api('game_questions', {params:{game_id:gid}});
const apiSaveQuestion     = (d)    => _api('save_question',  {body:d});
const apiDeleteQuestion   = (d)    => _api('delete_question',{body:d});
const apiSaveGameSettings = (d)    => _api('save_game_settings', {body:d});
// 8.0 REPORTS
const apiReport           = (type, extra={}) => _api('report', {params:{type, ...extra}});

// forgot/reset password + validate email
const apiForgotPassword = (d)    => _api('forgot_password',  {body:d});
const apiResetPassword  = (d)    => _api('reset_password',   {body:d});
const apiValidateEmail  = (email)=> _api('validate_email',   {params:{email}});

// โหลดคำถามสำหรับเล่นเกม (ใช้ใน game.js)
const apiPlayQuestions = (gid) => _api('play_questions', {params:{game_id:gid}});

// สร้างเจ้าหน้าที่/ผู้บริหาร
const apiAdminCreateStaff   = (d) => _api('admin_create_staff',   {body:d});
const apiOfficerCreateStaff = (d) => _api('officer_create_staff', {body:d});

// EXECUTIVE DASHBOARD API
const apiExecutiveDashboard = ()        => _api('executive_dashboard');
const apiExecutiveUsers     = ()        => _api('executive_users');
const apiExecutiveContent   = (type)    => _api('executive_content', {params:{type}});

// OFFICER USER MANAGEMENT API
const apiOfficerUsers       = ()        => _api('officer_users');
const apiOfficerUpdateUser  = (d)       => _api('officer_update_user',  {body:d});
const apiOfficerDeleteUser  = (d)       => _api('officer_delete_user',  {body:d});
