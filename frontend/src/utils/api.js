import axios from 'axios';
import useAuth from '../hooks/useAuth'; // if you have one; otherwise set header where you call.

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "https://sl-exams.onrender.com",
});

// attach token if you already do it globally; else keep as-is
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;

// --- repository ---
export const repoApi = {
  list: (params) => api.get('/admin/repository/questions', { params }),
  create: (data) => api.post('/admin/repository/questions', data),
  update: (id, data) => api.put(`/admin/repository/questions/${id}`, data),
  disable: (id) => api.delete(`/admin/repository/questions/${id}`),
  autoGenerate: (payload) => api.post(`/admin/repository/auto-generate`, payload),
};

// --- exams (extras) ---
export const examApi = {
  list: () => api.get('/admin/exams'),
  create: (payload) => api.post('/admin/exams', payload),
  update: (id, payload) => api.put(`/admin/exams/${id}`, payload),
  remove: (id) => api.delete(`/admin/exams/${id}`),

  getQuestions: (id) => api.get(`/admin/exams/${id}/questions`),
  addQuestion: (id, payload) => api.post(`/admin/exams/${id}/questions`, payload),
  importCsv: (id, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post(`/admin/exams/${id}/questions`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  pickFromRepo: (id, repoIds) => api.post(`/admin/exams/${id}/questions/pick`, { repository_ids: repoIds }),
  clone: (id) => api.post(`/admin/exams/${id}/clone`),

  assign: (id, payload) => api.post(`/admin/exams/${id}/assign`, payload),
  assignedStudents: (id) => api.get(`/admin/exams/${id}/students`),
};

// --- schools (for school_admin dashboard) ---
export const schoolApi = {
  list: () => api.get('/admin/schools'),
  create: (payload) => api.post('/admin/schools', payload),
  update: (id, payload) => api.put(`/admin/schools/${id}`, payload),
  remove: (id) => api.delete(`/admin/schools/${id}`),
};

// --- students (minor fix: default params) ---
export const studentsApi = {
  list: ({ page = 1, per_page = 20, search = '' } = {}) =>
    api.get('/admin/students', { params: { page, per_page, search } }),
  get: (userId) => api.get(`/admin/students/${userId}`),
  update: (userId, payload) => api.put(`/admin/students/${userId}`, payload),
  remove: (userId) => api.delete(`/admin/students/${userId}`),
  create: (payload) => api.post('/admin/students', payload),
  importCsv: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/admin/students/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

// --- public catalog ---
export const publicApi = {
  // Auth
  registerInit: (data) => api.post('/public/register/init', data),
  registerVerify: (data) => api.post('/public/register/verify', data),
  login: (data) => api.post('/public/login', data),
  forgotInit: (data) => api.post('/public/forgot-password/init', data),
  forgotReset: (data) => api.post('/public/forgot-password/reset', data),

  // Public catalog
  listCourses: () => api.get('/public/courses'),
  getCourse: (id) => api.get(`/public/courses/${id}`),

  // Enrollment & Payment
  enrollFree: (courseId) => api.post(`/public/courses/${courseId}/enroll`),
  createOrder: (courseId) => api.post(`/public/courses/${courseId}/create-order`),
  verifyPayment: (data) => api.post('/public/payment/verify', data),

  // Content & Exams
  getContentFile: (contentId) => api.get(`/public/content/${contentId}/file`, { responseType: 'blob' }),
  startExam: (contentId) => api.post(`/public/content/${contentId}/start-exam`),
  submitExam: (attemptId, answers) => api.post(`/public/attempts/${attemptId}/submit`, { answers }),
  reviewExam: (attemptId) => api.get(`/public/attempts/${attemptId}/review`),

  // User dashboard
  myProfile: () => api.get('/public/me/profile'),
  updateProfile: (data) => api.put('/public/me/profile', data),
  mySubscriptions: () => api.get('/public/me/subscriptions'),
  myAttempts: () => api.get('/public/me/attempts'),
  myDashboardData: () => api.get('/public/me/dashboard-data'),

  // Admin
  adminListCourses: () => api.get('/admin/public/courses'),
  adminCreateCourse: (data) => api.post('/admin/public/courses', data),
  adminUpdateCourse: (id, data) => api.put(`/admin/public/courses/${id}`, data),
  adminDeleteCourse: (id) => api.delete(`/admin/public/courses/${id}`),
  adminListContents: (courseId) => api.get(`/admin/public/courses/${courseId}/contents`),
  adminUploadContent: (courseId, formData) =>
    api.post(`/admin/public/courses/${courseId}/contents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  adminUpdateContent: (contentId, data) => api.put(`/admin/public/contents/${contentId}`, data),
  adminDeleteContent: (contentId) => api.delete(`/admin/public/contents/${contentId}`),
  adminSubscriptions: () => api.get('/admin/public/subscriptions'),
  adminSmartPaste: (contentId, rawText) => api.post(`/admin/public/contents/${contentId}/smart-questions`, { raw_text: rawText }),
  adminListQuestions: (contentId) => api.get(`/admin/public/contents/${contentId}/questions`),

  // Central Public Question Repository (Admin)
  adminRepoList: (params) => api.get('/admin/public/repository', { params }),
  // Chapters/topics only come back once a subject is given — the same names
  // recur across subjects, so an unscoped list is ambiguous.
  adminRepoMeta: (params) => api.get('/admin/public/repository/meta', { params }),
  adminRepoAdd: (data) => api.post('/admin/public/repository', data),
  adminRepoUpdate: (id, data) => api.put(`/admin/public/repository/${id}`, data),
  adminRepoDelete: (id) => api.delete(`/admin/public/repository/${id}`),
  adminRepoSmartPaste: (data) => api.post('/admin/public/repository/smart-paste', data),

  // CBT Questions (student-facing)
  getQuestions: (contentId) => api.get(`/public/content/${contentId}/questions`),

  // Dynamic Practice Engine
  practiceStart: (data) => api.post('/public/practice/start', data),
  practiceSubmit: (attemptId, answers) => api.post(`/public/practice/${attemptId}/submit`, { answers }),
  practiceReview: (attemptId) => api.get(`/public/practice/${attemptId}/review`),

  // Custom + Adaptive Practice (user-built sessions)
  practiceMeta: () => api.get('/public/practice/meta'),
  practiceAdaptiveStart: (data) => api.post('/public/practice/adaptive/start', data),
  practiceAdaptiveSubmit: (attemptId, data) => api.post(`/public/practice/${attemptId}/submit-adaptive`, data),

  // Daily Challenge & Streak
  challengeStart: () => api.post('/public/challenge/start'),
  challengeSubmit: (challengeId, answers) => api.post(`/public/challenge/${challengeId}/submit`, { answers }),

  // Course Structure & Search
  courseStructure: (courseId) => api.get(`/public/courses/${courseId}/structure`),
  contentSearch: (params) => api.get('/public/content/search', { params }),

  // Study mode (practice with answers, no attempt recorded)
  studySession: (contentId) => api.post(`/public/content/${contentId}/study-session`),

  // Admin: batch reorder content items
  adminReorderContents: (courseId, orderedIds) => api.put(`/admin/public/courses/${courseId}/reorder`, { order: orderedIds }),
};


// ─── MODULE 3: QUICK EXAM (Zero-Auth) ───
export const quickApi = {
  // Admin
  createExam: (data) => api.post('/admin/quick/exams', data),
  listExams: () => api.get('/admin/quick/exams'),
  getExam: (id) => api.get(`/admin/quick/exams/${id}`),
  toggleExam: (id, data) => api.patch(`/admin/quick/exams/${id}`, data),
  deleteExam: (id) => api.delete(`/admin/quick/exams/${id}`),

  // Public (no auth needed — but axios will still send token if present, which is fine)
  getInfo: (code) => api.get(`/quick/${code}`),
  getQuestions: (code) => api.get(`/quick/${code}/questions`),
  submit: (code, data) => api.post(`/quick/${code}/submit`, data),
};


// ─── MODULE 4: DAILY PUZZLE GAMES (school students, classes 6-10) ───
export const gamesApi = {
  // Public (no account) — guest puzzles for the marketing site. Ships the
  // solution so the browser can grade locally; nothing is stored either side.
  publicList: () => api.get('/public/games'),

  // Student
  list: () => api.get('/student/games'),
  start: (key) => api.post(`/student/games/${key}/start`),
  saveState: (key, state) => api.post(`/student/games/${key}/state`, { state }),
  hint: (key, state) => api.post(`/student/games/${key}/hint`, { state }),
  reveal: (key) => api.post(`/student/games/${key}/reveal`),
  submit: (key, submission) => api.post(`/student/games/${key}/submit`, { submission }),
  standings: (key) => api.get(`/student/games/${key}/standings`),

  // Admin
  overview: (date) => api.get('/admin/games/overview', { params: date ? { date } : {} }),
  preview: (key, params) => api.get(`/admin/games/${key}/preview`, { params }),
  reroll: (key, data) => api.post(`/admin/games/${key}/reroll`, data),
  toggleSchool: (schoolId, enabled) =>
    api.patch(`/admin/schools/${schoolId}/games`, { enabled }),
};
