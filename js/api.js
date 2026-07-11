// api.js - JavaScript wrapper for the PHP backend.
const API_URL = 'api/backend.php';
let API_CSRF_TOKEN = sessionStorage.getItem('kl_csrf_token') || '';

async function _api(action, { method = 'GET', body, params } = {}) {
  let url = `${API_URL}?action=${action}`;
  if (params) Object.entries(params).forEach(([k, v]) => {
    if (v != null) url += `&${k}=${encodeURIComponent(v)}`;
  });

  const opt = { method, credentials: 'include', headers: {} };
  if (opt.method !== 'GET' && API_CSRF_TOKEN) {
    opt.headers['X-CSRF-Token'] = API_CSRF_TOKEN;
  }
  if (body) {
    opt.method = 'POST';
    opt.headers['Content-Type'] = 'application/json';
    if (API_CSRF_TOKEN) opt.headers['X-CSRF-Token'] = API_CSRF_TOKEN;
    opt.body = JSON.stringify(body);
  }

  try {
    const r = await fetch(url, opt);
    const data = await r.json();
    if (data.csrf_token) {
      API_CSRF_TOKEN = data.csrf_token;
      sessionStorage.setItem('kl_csrf_token', API_CSRF_TOKEN);
    }
    if (action === 'logout' && data.ok) {
      API_CSRF_TOKEN = '';
      sessionStorage.removeItem('kl_csrf_token');
    }
    if (!data.ok && r.status === 401) {
      return {
        ok: false,
        error: action === 'login'
          ? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
          : 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง',
      };
    }
    if (!data.ok && r.status === 403) {
      return { ok: false, error: 'บัญชีนี้ไม่มีสิทธิ์ใช้งานส่วนนี้' };
    }
    return data;
  } catch (e) {
    console.error('[KidLearn API]', action, e);
    return { ok: false, error: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่อหรือลองใหม่อีกครั้ง' };
  }
}

// Auth
const apiLogin = (u, p) => _api('login', { body: { username: u, password: p } });
const apiLogout = () => _api('logout', { method: 'POST' });
const apiRegister = (d) => _api('register', { body: d });
const apiMe = () => _api('me');
const apiUpdateProfile = (d) => _api('update_profile', { body: d });
const apiChangePassword = (d) => _api('change_password', { body: d });

// Subjects and games
const apiSubjects = () => _api('subjects');
const apiGames = (sid) => _api('games', { params: { subject_id: sid } });

// Scores
const apiSaveScore = (d) => _api('save_score', { body: d });
const apiScores = (sid) => _api('scores', sid ? { params: { student_id: sid } } : {});

// Lesson content
const apiGetContent = (gid) => _api('get_content', { params: { game_id: gid } });
const apiLessonContent = (gid, lno) => _api('lesson_content', { params: { game_id: gid, lesson_no: lno } });
const apiLessonHistory = (gid, lno) => _api('lesson_history', { params: { game_id: gid, lesson_no: lno } });

// Parent
const apiMyChildren = () => _api('my_children');
const apiLinkChild = (d) => _api('link_child', { body: d });
const apiUnlinkChild = (d) => _api('unlink_child', { body: d });
const apiRecommendations = (sid) => _api('recommendations', sid ? { params: { student_id: sid } } : {});
const apiNotifications = () => _api('notifications');
const apiMarkNotifRead = (id) => _api('mark_notif_read', { body: id ? { notif_id: id } : {} });

// Teacher
const apiTeacherStats = () => _api('teacher_stats');
const apiAllStudents = () => _api('all_students');
const apiStudentScores = (sid, subjectId) => {
  const params = { student_id: sid };
  if (subjectId) params.subject_id = subjectId;
  return _api('scores', { params });
};
const apiStudentAnalytics = (sid) => _api('student_analytics', sid ? { params: { student_id: sid } } : {});
const apiStudentPlans = (sid) => _api('student_plans', sid ? { params: { student_id: sid } } : {});
const apiCreatePlan = (d) => _api('create_plan', { body: d });

// Lesson editor
const apiSaveLesson = (d) => _api('save_lesson', { body: d });
const apiDeleteLesson = (d) => _api('delete_lesson', { body: d });

const apiAutoLink = () => _api('auto_link', { method: 'POST', body: {} });

// Admin users
const apiAdminUsers = (p = {}) => _api('admin_users', { params: p });
const apiAdminToggleUser = (d) => _api('admin_toggle_user', { body: d });
const apiAdminDeleteUser = (d) => _api('admin_delete_user', { body: d });
const apiAdminResetPass = (d) => _api('admin_reset_pass', { body: d });

// Subjects
const apiSaveSubject = (d) => _api('save_subject', { body: d });
const apiToggleSubject = (d) => _api('toggle_subject', { body: d });

// Game questions
const apiGameQuestions = (gid) => _api('game_questions', { params: { game_id: gid } });
const apiSaveQuestion = (d) => _api('save_question', { body: d });
const apiDeleteQuestion = (d) => _api('delete_question', { body: d });
const apiSaveGameSettings = (d) => _api('save_game_settings', { body: d });

// Reports
const apiReport = (type, extra = {}) => _api('report', { params: { type, ...extra } });

// Forgot/reset password and email validation
const apiForgotPassword = (d) => _api('forgot_password', { body: d });
const apiResetPassword = (d) => _api('reset_password', { body: d });
const apiValidateEmail = (email) => _api('validate_email', { params: { email } });

const apiPlayQuestions = (gid) => _api('play_questions', { params: { game_id: gid } });

// Staff and executive APIs
const apiAdminCreateStaff = (d) => _api('admin_create_staff', { body: d });
const apiOfficerCreateStaff = (d) => _api('officer_create_staff', { body: d });
const apiExecutiveDashboard = () => _api('executive_dashboard');
const apiExecutiveUsers = () => _api('executive_users');
const apiExecutiveContent = (type) => _api('executive_content', { params: { type } });
const apiOfficerUsers = () => _api('officer_users');
const apiOfficerUpdateUser = (d) => _api('officer_update_user', { body: d });
const apiOfficerDeleteUser = (d) => _api('officer_delete_user', { body: d });
