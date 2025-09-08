import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Filter, MapPin, DollarSign, Home } from 'lucide-react';
import PropertyCard from '../components/PropertyCard';
import { propertyApi } from '../services/api';
import { Property, PropertyStatus } from '../types/Property';
import { useAuth } from '../contexts/AuthContext';

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<PropertyStatus | 'all'>('all');

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const data = await propertyApi.getAllProperties();
      setProperties(data);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (searchTerm.trim() === '' && selectedStatus === 'all') {
      fetchProperties();
      return;
    }

    try {
      setLoading(true);
      let results: Property[] = [];
      
      if (searchTerm.trim() !== '') {
        results = await propertyApi.searchProperties({ keyword: searchTerm });
      } else {
        results = await propertyApi.getAllProperties();
      }
      
      if (selectedStatus !== 'all') {
        results = results.filter(property => property.status === selectedStatus);
      }
      
      setProperties(results);
    } catch (error) {
      console.error('Error searching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const featuredProperties = properties.slice(0, 6);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl md:text-6xl font-bold mb-6"
          >
            Find Your Dream Home
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto"
          >
            Discover the perfect property that matches your lifestyle and budget
          </motion.p>
          
          {/* Search Bar */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-2 flex flex-col md:flex-row gap-2"
          >
            <div className="flex-1 flex items-center px-4 border border-gray-200 rounded-lg">
              <Search className="text-gray-400 mr-2" />
              <input
                type="text"
                placeholder="Search by city, address, or property name..."
                className="w-full py-3 text-gray-800 focus:outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

      {/* Admin Welcome Banner */}
      {user?.role === 'ADMIN' && (
        <div className="bg-yellow-50 border-y border-yellow-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col md:flex-row md:items-center md:justify-between gap-3"
            >
              <div>
                <p className="text-sm text-yellow-800 font-semibold">Welcome back, Admin</p>
                <p className="text-yellow-700 text-sm">Use your quick actions to manage the platform.</p>
              </div>
              <div className="flex items-center gap-2">
                <a href="/admin/users" className="px-3 py-2 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">Manage Users</a>
                <a href="/admin/analytics" className="px-3 py-2 text-sm bg-white text-yellow-800 border border-yellow-300 rounded-lg hover:bg-yellow-100">View Analytics</a>
              </div>
            </motion.div>
          </div>
        </div>
      )}
            
            <div className="flex items-center px-4 border border-gray-200 rounded-lg">
              <Filter className="text-gray-400 mr-2" />
              <select
                className="w-full py-3 text-gray-800 focus:outline-none"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as PropertyStatus | 'all')}
              >
                <option value="all">All Status</option>
                <option value={PropertyStatus.FOR_SALE}>For Sale</option>
                <option value={PropertyStatus.FOR_RENT}>For Rent</option>
                <option value={PropertyStatus.SOLD}>Sold</option>
                <option value={PropertyStatus.RENTED}>Rented</option>
              </select>
            </div>
            
            <button 
              onClick={handleSearch}
              className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              <Search className="mr-2" />
              Search
            </button>
          </motion.div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="p-6"
            >
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Home className="text-primary-600 w-8 h-8" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">10,000+</h3>
              <p className="text-gray-600">Properties Listed</p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="p-6"
            >
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="text-primary-600 w-8 h-8" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">50+</h3>
              <p className="text-gray-600">Cities Covered</p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="p-6"
            >
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="text-primary-600 w-8 h-8" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2">98%</h3>
              <p className="text-gray-600">Customer Satisfaction</p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Featured Properties */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-3xl font-bold text-gray-900 mb-4"
            >
              Featured Properties
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-xl text-gray-600 max-w-2xl mx-auto"
            >
              Discover our handpicked selection of premium properties
            </motion.p>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <motion.div 
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {featuredProperties.map((property) => (
                <PropertyCard 
                  key={property.id} 
                  property={property} 
                  onClick={() => navigate(`/properties/${property.id}`)}
                />
              ))}
            </motion.div>
          )}
          
          <div className="text-center mt-12">
            <button 
              onClick={() => navigate('/properties')}
              className="btn-primary inline-flex items-center"
            >
              View All Properties
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
