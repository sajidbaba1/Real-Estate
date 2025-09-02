import axios from 'axios';
import { Property, PropertyFilters } from '../types/Property';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const propertyApi = {
  // Get all properties
  getAllProperties: async (): Promise<Property[]> => {
    const response = await api.get('/properties');
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

  // Search properties by filters
  searchProperties: async (filters: PropertyFilters): Promise<Property[]> => {
    
    if (filters.keyword) {
      const response = await api.get(`/properties/search?keyword=${filters.keyword}`);
      return response.data;
    }
    
    if (filters.minPrice && filters.maxPrice) {
      const response = await api.get(`/properties/price-range?minPrice=${filters.minPrice}&maxPrice=${filters.maxPrice}`);
      return response.data;
    }
    
    if (filters.city) {
      const response = await api.get(`/properties/city/${filters.city}`);
      return response.data;
    }
    
    if (filters.propertyType) {
      const response = await api.get(`/properties/type/${filters.propertyType}`);
      return response.data;
    }
    
    if (filters.status) {
      const response = await api.get(`/properties/status/${filters.status}`);
      return response.data;
    }
    
    if (filters.minBedrooms) {
      const response = await api.get(`/properties/bedrooms/${filters.minBedrooms}`);
      return response.data;
    }
    
    if (filters.minBathrooms) {
      const response = await api.get(`/properties/bathrooms/${filters.minBathrooms}`);
      return response.data;
    }
    
    // Default to all properties if no filters
    return await propertyApi.getAllProperties();
  },
};

export default api;
