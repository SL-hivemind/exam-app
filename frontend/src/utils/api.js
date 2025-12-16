import axios from 'axios';
import useAuth from '../hooks/useAuth'; // if you have one; otherwise set header where you call.

const api = axios.create({
  baseURL: "https://sl-exams.onrender.com",
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
