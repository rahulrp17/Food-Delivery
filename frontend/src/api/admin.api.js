import apiClient from './client';

const cleanParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ''
    )
  );

export const adminApi = {
  overview: (params = {}) => apiClient.get('/admin/overview', { params: cleanParams(params) }),

  products: (params = {}) =>
    apiClient.get('/admin/products', { params: cleanParams(params) }),

  product: (id) => apiClient.get(`/admin/products/${id}`),

  createProduct: (data) => apiClient.post('/admin/products', data),

  updateProduct: (id, data) => apiClient.patch(`/admin/products/${id}`, data),

  deleteProduct: (id) => apiClient.delete(`/admin/products/${id}`),

  restoreProduct: (id) => apiClient.post(`/admin/products/${id}/restore`),

  duplicateProduct: (id) => apiClient.post(`/admin/products/${id}/duplicate`),

  updateProductStock: (id, data) => apiClient.patch(`/admin/products/${id}/stock`, data),

  bulkUpdateProducts: (data) => apiClient.post('/admin/products/bulk', data),

  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return apiClient.post('/admin/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  categories: (params = {}) =>
    apiClient.get('/admin/categories', { params: cleanParams(params) }),

  createCategory: (data) => apiClient.post('/admin/categories', data),

  updateCategory: (id, data) => apiClient.patch(`/admin/categories/${id}`, data),

  reorderCategory: (id, direction) =>
    apiClient.patch(`/admin/categories/${id}/reorder`, { direction }),

  reorderCategories: (order) => apiClient.patch('/admin/categories/reorder', { order }),

  deleteCategory: (id) => apiClient.delete(`/admin/categories/${id}`),

  orders: (params = {}) =>
    apiClient.get('/admin/orders', { params: cleanParams(params) }),

  order: (id) => apiClient.get(`/admin/orders/${id}`),

  updateOrderStatus: (id, status, note) =>
    apiClient.patch(`/admin/orders/${id}/status`, { status, note: note || undefined }),

  updateOrderNotes: (id, adminNotes) =>
    apiClient.patch(`/admin/orders/${id}/notes`, { adminNotes }),

  cancelOrder: (id, reason) => apiClient.post(`/admin/orders/${id}/cancel`, { reason }),

  customers: (params = {}) =>
    apiClient.get('/admin/customers', { params: cleanParams(params) }),

  customer: (id) => apiClient.get(`/admin/customers/${id}`),

  exportCustomers: (params = {}) =>
    apiClient.get('/admin/customers/export', {
      params: cleanParams(params),
      responseType: 'blob',
    }),

  updateCustomerRole: (id, role) => apiClient.patch(`/admin/customers/${id}/role`, { role }),

  updateCustomerStatus: (id, status) =>
    apiClient.patch(`/admin/customers/${id}/status`, { status }),

  coupons: (params = {}) =>
    apiClient.get('/admin/coupons', { params: cleanParams(params) }),

  createCoupon: (data) => apiClient.post('/admin/coupons', data),

  updateCoupon: (id, data) => apiClient.patch(`/admin/coupons/${id}`, data),

  deleteCoupon: (id) => apiClient.delete(`/admin/coupons/${id}`),

  couponRedemptions: (id, params = {}) =>
    apiClient.get(`/admin/coupons/${id}/redemptions`, { params: cleanParams(params) }),

  exportCouponRedemptions: (id, params = {}) =>
    apiClient.get(`/admin/coupons/${id}/redemptions/export`, {
      params: cleanParams(params),
      responseType: 'blob',
    }),

  reviews: (params = {}) =>
    apiClient.get('/admin/reviews', { params: cleanParams(params) }),

  moderateReview: (id, status) => apiClient.patch(`/admin/reviews/${id}`, { status }),
  replyReview: (id, reply) => apiClient.patch(`/admin/reviews/${id}/reply`, { reply }),

  reportReview: (id) => apiClient.patch(`/admin/reviews/${id}/report`),

  settings: () => apiClient.get('/admin/settings'),

  auditLogs: (params = {}) =>
    apiClient.get('/admin/audit-logs', { params: cleanParams(params) }),

  notifications: (params = {}) =>
    apiClient.get('/admin/notifications', { params: cleanParams(params) }),

  markNotificationRead: (id) => apiClient.patch(`/admin/notifications/${id}/read`),

  markAllNotificationsRead: () => apiClient.post('/admin/notifications/read-all'),

  deleteNotification: (id) => apiClient.delete(`/admin/notifications/${id}`),

  inventory: (params = {}) =>
    apiClient.get('/admin/inventory/logs', { params: cleanParams(params) }),

  exportInventory: (params = {}) =>
    apiClient.get('/admin/inventory/export', {
      params: cleanParams(params),
      responseType: 'blob',
    }),

  staff: (params = {}) =>
    apiClient.get('/admin/staff', { params: cleanParams(params) }),

  createStaff: (data) => apiClient.post('/admin/staff', data),

  updateStaff: (id, data) => apiClient.patch(`/admin/staff/${id}`, data),

  updateSettings: (data) => apiClient.patch('/admin/settings', data),
};

export default adminApi;