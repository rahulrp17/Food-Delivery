import apiClient from './client';

export const userApi = {
  updateProfile: (data) => apiClient.patch('/users/me', data),

  listAddresses: () => apiClient.get('/users/me/addresses'),

  createAddress: (data) => apiClient.post('/users/me/addresses', data),

  updateAddress: (id, data) => apiClient.patch(`/users/me/addresses/${id}`, data),

  deleteAddress: (id) => apiClient.delete(`/users/me/addresses/${id}`),

  listWishlist: () => apiClient.get('/users/me/wishlist'),

  addToWishlist: (productId) => apiClient.post(`/users/me/wishlist/${productId}`),

  removeFromWishlist: (productId) => apiClient.delete(`/users/me/wishlist/${productId}`),
};

export default userApi;