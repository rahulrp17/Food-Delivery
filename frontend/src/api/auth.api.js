import apiClient from './client';

export const authApi = {
  register: (data) => apiClient.post('/auth/register', data),

  login: (data) => apiClient.post('/auth/login', data),

  logout: () => apiClient.post('/auth/logout'),

  logoutAll: () => apiClient.post('/auth/logout-all'),

  refresh: () => apiClient.post('/auth/refresh'),

  me: () => apiClient.get('/auth/me'),

  updateProfile: (data) => apiClient.patch('/auth/profile', data),

  sessions: () => apiClient.get('/auth/sessions'),

  revokeSession: (id) => apiClient.delete(`/auth/sessions/${id}`),

  getCsrf: () => apiClient.get('/auth/csrf'),

  verifyEmail: (token) => apiClient.post('/auth/verify-email', { token }),

  resendVerification: () => apiClient.post('/auth/resend-verification'),

  forgotPassword: (email) => apiClient.post('/auth/forgot-password', { email }),

  resetPassword: (token, password) =>
    apiClient.post('/auth/reset-password', { token, password }),

  updatePassword: (currentPassword, newPassword) =>
    apiClient.patch('/auth/password', { currentPassword, newPassword }),
};

export default authApi;