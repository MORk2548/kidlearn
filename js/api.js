// api.js - JavaScript wrapper for the PHP backend.
const API_URL = 'api/backend.php';
let API_CSRF_TOKEN = sessionStorage.getItem('kl_csrf_token') || '';
const API_GET_CACHE = new Map();

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

function _apiCached(action, params = {}, ttlMs = 30000) {
  const key = `${action}:${JSON.stringify(params)}`;
  const now = Date.now();
  const cached = API_GET_CACHE.get(key);
  if (cached && cached.expires > now) return cached.promise || Promise.resolve(cached.data);

  const promise = _api(action, { params }).then(res => {
    if (res?.ok) {
      API_GET_CACHE.set(key, { data: res, expires: Date.now() + ttlMs });
    } else {
      API_GET_CACHE.delete(key);
    }
    return res;
  }).catch(err => {
    API_GET_CACHE.delete(key);
    throw err;
  });
  API_GET_CACHE.set(key, { promise, expires: now + ttlMs });
  return promise;
}

function _apiClearCache(actions = []) {
  if (!actions.length) {
    API_GET_CACHE.clear();
    return;
  }
  for (const key of API_GET_CACHE.keys()) {
    if (actions.some(action => key.startsWith(`${action}:`))) API_GET_CACHE.delete(key);
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
const apiSubjects = () => _apiCached('subjects', {}, 60000);
const apiGames = (sid) => _apiCached('games', { subject_id: sid }, 60000);

// Scores
const apiSaveScore = (d) => _api('save_score', { body: d });
const apiScores = (sid) => _api('scores', sid ? { params: { student_id: sid } } : {});

// Lesson content
const apiGetContent = (gid) => _apiCached('get_content', { game_id: gid }, 60000);
const apiLessonContent = (gid, lno) => _apiCached('lesson_content', { game_id: gid, lesson_no: lno }, 60000);
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
const apiSaveLesson = (d) => _api('save_lesson', { body: d }).then(res => { if(res?.ok) _apiClearCache(['get_content','lesson_content']); return res; });
const apiDeleteLesson = (d) => _api('delete_lesson', { body: d }).then(res => { if(res?.ok) _apiClearCache(['get_content','lesson_content']); return res; });

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
const apiGameQuestions = (gid) => _apiCached('game_questions', { game_id: gid }, 15000);
const apiSaveQuestion = (d) => _api('save_question', { body: d }).then(res => { if(res?.ok) _apiClearCache(['game_questions','play_questions']); return res; });
const apiDeleteQuestion = (d) => _api('delete_question', { body: d }).then(res => { if(res?.ok) _apiClearCache(['game_questions','play_questions']); return res; });
const apiSaveGameSettings = (d) => _api('save_game_settings', { body: d }).then(res => { if(res?.ok) _apiClearCache(['games','game_questions','play_questions']); return res; });

// Reports
const apiReport = (type, extra = {}) => _api('report', { params: { type, ...extra } });

// Forgot/reset password and email validation
const apiForgotPassword = (d) => _api('forgot_password', { body: d });
const apiResetPassword = (d) => _api('reset_password', { body: d });
const apiValidateEmail = (email) => _api('validate_email', { params: { email } });

const apiPlayQuestions = (gid) => _apiCached('play_questions', { game_id: gid }, 15000);

// Staff and executive APIs
const apiAdminCreateStaff = (d) => _api('admin_create_staff', { body: d });
const apiOfficerCreateStaff = (d) => _api('officer_create_staff', { body: d });
const apiExecutiveDashboard = (dateRange = 'all') => _api('executive_dashboard', { params: { date_range: dateRange } });
const apiExecutiveUsers = (dateRange = 'all') => _api('executive_users', { params: { date_range: dateRange } });
const apiExecutiveContent = (type, dateRange = 'all') => _api('executive_content', { params: { type, date_range: dateRange } });
const apiOfficerUsers = (dateRange = 'all') => _api('officer_users', { params: { date_range: dateRange } });
const apiOfficerUpdateUser = (d) => _api('officer_update_user', { body: d });
const apiOfficerDeleteUser = (d) => _api('officer_delete_user', { body: d });
