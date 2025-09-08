import axios from 'axios';
import { Property, PropertyFilters } from '../types/Property';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8888/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

export const propertyApi = {
  // Get all properties
  getAllProperties: async (): Promise<Property[]> => {
    const response = await api.get('/properties/approved');
    return response.data;
  },

  // Get property by ID
  getPropertyById: async (id: number): Promise<Property> => {
    const response = await api.get(`/properties/${id}`);
    return response.data;
  },

  // Create new property
  createProperty: async (property: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>): Promise<Property> => {
    const response = await api.post('/properties', property);
    return response.data;
  },

  // Update property
  updateProperty: async (id: number, property: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>): Promise<Property> => {
    const response = await api.put(`/properties/${id}`, property);
    return response.data;
  },

  // Delete property
  deleteProperty: async (id: number): Promise<void> => {
    await api.delete(`/properties/${id}`);
  },

  // Advanced search properties with multiple filters
  searchProperties: async (filters: PropertyFilters): Promise<Property[]> => {
    const params = new URLSearchParams();
    
    if (filters.keyword) params.append('keyword', filters.keyword);
    if (filters.city) params.append('city', filters.city);
    if (filters.state) params.append('state', filters.state);
    if (filters.minPrice) params.append('minPrice', filters.minPrice.toString());
    if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
    if (filters.minBedrooms) params.append('bedrooms', filters.minBedrooms.toString());
    if (filters.minBathrooms) params.append('bathrooms', filters.minBathrooms.toString());
    if (filters.propertyType) params.append('type', filters.propertyType);
    if (filters.status) params.append('status', filters.status);
    
    const response = await api.get(`/properties/search?${params.toString()}`);
    return response.data;
  },

  // Claim ownership of a property (ADMIN/AGENT only)
  claimOwnership: async (id: number): Promise<Property> => {
    const response = await api.patch(`/properties/${id}/assign-owner`);
    return response.data;
  },

  // Counts
  getTotalCount: async (): Promise<number> => {
    const response = await api.get('/properties/count');
    return response.data.total as number;
  },

  getApprovedCount: async (): Promise<number> => {
    const response = await api.get('/properties/approved/count');
    return response.data.approved as number;
  },

  // Get filter metadata
  getCities: async (): Promise<string[]> => {
    const response = await api.get('/properties/cities');
    return response.data;
  },

  getStates: async (): Promise<string[]> => {
    const response = await api.get('/properties/states');
    return response.data;
  },

  getPriceRange: async (): Promise<{ minPrice: number; maxPrice: number }> => {
    const response = await api.get('/properties/price-range');
    return response.data;
  },

  // Claim ownership of a property (ADMIN/AGENT only)
  claimOwnership: async (id: number): Promise<Property> => {
    const response = await api.patch(`/properties/${id}/assign-owner`);
    return response.data;
  },
};

export default api;
