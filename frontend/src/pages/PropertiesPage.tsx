import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, MapPin, DollarSign, Bed, Bath, Map, List } from 'lucide-react';
import PropertyCard from '../components/PropertyCard';
import PropertiesMapView from '../components/PropertiesMapView';
import { propertyApi } from '../services/api';
import { Property, PropertyType, PropertyStatus } from '../types/Property';

const PropertiesPage: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  
  // Filter states
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    city: '',
    propertyType: '' as PropertyType | '',
    status: '' as PropertyStatus | '',
    minBedrooms: '',
    minBathrooms: '',
  });

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [properties, filters]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const data = await propertyApi.getAllProperties();
      setProperties(data);
      setFilteredProperties(data);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...properties];
    
    if (filters.minPrice) {
      const minPrice = parseFloat(filters.minPrice);
      result = result.filter(property => property.price >= minPrice);
    }
    
    if (filters.maxPrice) {
      const maxPrice = parseFloat(filters.maxPrice);
      result = result.filter(property => property.price <= maxPrice);
    }
    
    if (filters.city) {
      result = result.filter(property => 
        property.city.toLowerCase().includes(filters.city.toLowerCase())
      );
    }
    
    if (filters.propertyType) {
      result = result.filter(property => property.propertyType === filters.propertyType);
    }
    
    if (filters.status) {
      result = result.filter(property => property.status === filters.status);
    }
    
    if (filters.minBedrooms) {
      const minBedrooms = parseInt(filters.minBedrooms);
      result = result.filter(property => property.bedrooms >= minBedrooms);
    }
    
    if (filters.minBathrooms) {
      const minBathrooms = parseInt(filters.minBathrooms);
      result = result.filter(property => property.bathrooms >= minBathrooms);
    }
    
    setFilteredProperties(result);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      minPrice: '',
      maxPrice: '',
      city: '',
      propertyType: '',
      status: '',
      minBedrooms: '',
      minBathrooms: '',
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  const handlePropertyClick = (property: Property) => {
    window.location.href = `/properties/${property.id}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Properties</h1>
          <p className="text-gray-600">Browse our extensive collection of properties</p>
        </div>

        {/* Filters Section */}
        <div className="mb-8 bg-white rounded-xl shadow-card p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 md:mb-0">
              {filteredProperties.length} Properties Found
            </h2>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* View Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <List className="w-4 h-4 mr-1" />
                  List
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'map'
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Map className="w-4 h-4 mr-1" />
                  Map
                </button>
              </div>

              {hasActiveFilters && (
                <button 
                  onClick={clearFilters}
                  className="flex items-center text-gray-600 hover:text-gray-900"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear Filters
                </button>
              )}
              
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center btn-primary"
              >
                <Filter className="w-4 h-4 mr-2" />
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="border-t border-gray-200 pt-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Price Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Price</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="number"
                        name="minPrice"
                        value={filters.minPrice}
                        onChange={handleFilterChange}
                        className="pl-10 w-full input-field"
                        placeholder="Min price"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Price</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="number"
                        name="maxPrice"
                        value={filters.maxPrice}
                        onChange={handleFilterChange}
                        className="pl-10 w-full input-field"
                        placeholder="Max price"
                      />
                    </div>
                  </div>
                  
                  {/* City */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        name="city"
                        value={filters.city}
                        onChange={handleFilterChange}
                        className="pl-10 w-full input-field"
                        placeholder="Enter city"
                      />
                    </div>
                  </div>
                  
                  {/* Property Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
                    <select
                      name="propertyType"
                      value={filters.propertyType}
                      onChange={handleFilterChange}
                      className="w-full input-field"
                    >
                      <option value="">All Types</option>
                      <option value={PropertyType.HOUSE}>House</option>
                      <option value={PropertyType.APARTMENT}>Apartment</option>
                      <option value={PropertyType.CONDO}>Condo</option>
                      <option value={PropertyType.TOWNHOUSE}>Townhouse</option>
                      <option value={PropertyType.VILLA}>Villa</option>
                      <option value={PropertyType.LAND}>Land</option>
                    </select>
                  </div>
                  
                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      name="status"
                      value={filters.status}
                      onChange={handleFilterChange}
                      className="w-full input-field"
                    >
                      <option value="">All Status</option>
                      <option value={PropertyStatus.FOR_SALE}>For Sale</option>
                      <option value={PropertyStatus.FOR_RENT}>For Rent</option>
                      <option value={PropertyStatus.SOLD}>Sold</option>
                      <option value={PropertyStatus.RENTED}>Rented</option>
                    </select>
                  </div>
                  
                  {/* Bedrooms */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Bedrooms</label>
                    <div className="relative">
                      <Bed className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="number"
                        name="minBedrooms"
                        value={filters.minBedrooms}
                        onChange={handleFilterChange}
                        className="pl-10 w-full input-field"
                        placeholder="Min bedrooms"
                        min="0"
                      />
                    </div>
                  </div>
                  
                  {/* Bathrooms */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Bathrooms</label>
                    <div className="relative">
                      <Bath className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="number"
                        name="minBathrooms"
                        value={filters.minBathrooms}
                        onChange={handleFilterChange}
                        className="pl-10 w-full input-field"
                        placeholder="Min bathrooms"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Properties Content */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : viewMode === 'list' ? (
          <motion.div 
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            <AnimatePresence>
              {filteredProperties.map((property) => (
                <PropertyCard 
                  key={property.id} 
                  property={property} 
                  onClick={() => handlePropertyClick(property)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <PropertiesMapView
            properties={filteredProperties}
            onPropertyClick={handlePropertyClick}
            className="mb-8"
          />
        )}

        {!loading && filteredProperties.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No properties found</h3>
            <p className="text-gray-500">Try adjusting your filters to see more results</p>
            <button 
              onClick={clearFilters}
              className="mt-4 btn-primary"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertiesPage;
