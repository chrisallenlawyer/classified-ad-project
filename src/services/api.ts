import axios from 'axios';

const API_BASE_URL = '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  // Health check
  getHealth: () => apiClient.get('/health'),
  
  // Categories
  getCategories: () => apiClient.get('/categories').then(response => response.data),
  
  // Admin Categories
  getAdminCategories: () => {
    console.log('Making request to /admin/categories');
    return apiClient.get('/admin/categories').then(response => {
      console.log('Admin categories response:', response.data);
      return response.data; // Return just the data, not the full response
    }).catch(error => {
      console.error('Admin categories error:', error);
      throw error;
    });
  },
  createCategory: (data: any) => apiClient.post('/admin/categories', data).then(response => response.data),
  updateCategory: (id: string, data: any) => apiClient.put(`/admin/categories/${id}`, data).then(response => response.data),
  deleteCategory: (id: string) => apiClient.delete(`/admin/categories/${id}`).then(response => response.data),
  
  // Listings
  getListings: (params?: any) => apiClient.get('/listings', { params }).then(response => response.data),
  getListing: (id: string) => apiClient.get(`/listings/${id}`),
  getFeaturedListings: (limit = 6) => apiClient.get('/listings', { params: { featured: true, limit } }).then(response => response.data),
  getPromotedListings: (limit = 4) => apiClient.get('/listings', { params: { promoted: true, limit } }).then(response => response.data),
  getPopularListings: (limit = 8) => apiClient.get('/listings', { params: { sort: 'views', limit } }).then(response => response.data),
  createListing: (data: any) => apiClient.post('/listings', data),
  updateListing: (id: string, data: any) => apiClient.put(`/listings/${id}`, data),
  deleteListing: (id: string) => apiClient.delete(`/listings/${id}`),
  
  // Search
  searchListings: (query: string, filters?: any) => 
    apiClient.get('/search', { params: { q: query, ...filters } }),
  
  // Users
  login: (email: string, password: string) => 
    apiClient.post('/auth/login', { email, password }),
  register: (userData: any) => apiClient.post('/auth/register', userData),
  getProfile: () => apiClient.get('/auth/profile'),
  
  // Messages
  getMessages: () => apiClient.get('/messages'),
  sendMessage: (data: any) => apiClient.post('/messages', data),
  
  // Favorites
  getFavorites: () => apiClient.get('/favorites'),
  addFavorite: (listingId: string) => apiClient.post('/favorites', { listingId }),
  removeFavorite: (listingId: string) => apiClient.delete(`/favorites/${listingId}`),
};
