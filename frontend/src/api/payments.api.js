import apiClient from './client';

export const paymentsApi = {
  checkout: (orderId) => apiClient.post('/payments/checkout', { orderId }),

  getSession: (sessionId) => apiClient.get(`/payments/session/${sessionId}`),
};

export default paymentsApi;