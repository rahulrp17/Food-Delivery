import apiClient from './client';

export const cartApi = {
  get: (guestToken) => {
    const headers = guestToken ? { 'X-Guest-Token': guestToken } : {};
    return apiClient.get('/cart', { headers });
  },

  addItem: (productId, quantity = 1, guestToken) => {
    const headers = guestToken ? { 'X-Guest-Token': guestToken } : {};
    return apiClient.post('/cart/items', { productId, quantity }, { headers });
  },

  updateItem: (productId, quantity, guestToken) => {
    const headers = guestToken ? { 'X-Guest-Token': guestToken } : {};
    return apiClient.patch(`/cart/items/${productId}`, { quantity }, { headers });
  },

  removeItem: (productId, guestToken) => {
    const headers = guestToken ? { 'X-Guest-Token': guestToken } : {};
    return apiClient.delete(`/cart/items/${productId}`, { headers });
  },

  clear: (guestToken) => {
    const headers = guestToken ? { 'X-Guest-Token': guestToken } : {};
    return apiClient.delete('/cart', { headers });
  },

  applyCoupon: (code, guestToken) => {
    const headers = guestToken ? { 'X-Guest-Token': guestToken } : {};
    return apiClient.post('/cart/coupon', { code }, { headers });
  },

  removeCoupon: (guestToken) => {
    const headers = guestToken ? { 'X-Guest-Token': guestToken } : {};
    return apiClient.delete('/cart/coupon', { headers });
  },

  merge: (guestToken) => apiClient.post('/cart/merge', { guestToken }),
};

export default cartApi;