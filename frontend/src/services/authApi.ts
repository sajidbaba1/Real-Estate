import axios from 'axios';
import { LoginRequest, RegisterRequest, AuthResponse, User } from '../types/Auth';
import { Property } from '../types/Property';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

const authApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
authApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  // Login user
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await authApi.post('/auth/login', credentials);
    return response.data;
  },

  // Register user
  register: async (userData: RegisterRequest): Promise<AuthResponse> => {
    const response = await authApi.post('/auth/register', userData);
    return response.data;
  },

  // Get current user
  getCurrentUser: async (): Promise<User> => {
    const response = await authApi.get('/users/me');
    return response.data;
  },

  // Update user profile
  updateProfile: async (userData: Partial<User>): Promise<User> => {
    const response = await authApi.put('/users/me', userData);
    return response.data;
  },

  // Get user favorites
  getFavorites: async (): Promise<Property[]> => {
    const response = await authApi.get('/users/me/favorites');
    return response.data;
  },

  // Add property to favorites
  addToFavorites: async (propertyId: number): Promise<void> => {
    await authApi.post(`/users/me/favorites/${propertyId}`);
  },

  // Remove property from favorites
  removeFromFavorites: async (propertyId: number): Promise<void> => {
    await authApi.delete(`/users/me/favorites/${propertyId}`);
  },

  // Check if property is favorited
  isFavorited: async (propertyId: number): Promise<boolean> => {
    const response = await authApi.get(`/users/me/favorites/${propertyId}`);
    return response.data.favorited;
  },

  // Logout (client-side only)
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};

export default authApi;
