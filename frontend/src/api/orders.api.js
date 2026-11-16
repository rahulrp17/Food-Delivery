import apiClient from './client';

export const ordersApi = {
  create: (data) => apiClient.post('/orders', data),

  list: (params = {}) => apiClient.get('/orders', { params }),

  get: (id) => apiClient.get(`/orders/${id}`),

  cancel: (id, reason) => apiClient.post(`/orders/${id}/cancel`, { reason }),

  reorder: (id) => apiClient.post(`/orders/${id}/reorder`),
};

export default ordersApi;