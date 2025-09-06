import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authApi';
import { Property } from '../types/Property';
import PropertyCard from '../components/PropertyCard';

const FavoritesPage: React.FC = () => {
  const { isAuthenticated, token } = useAuth();
  const [favorites, setFavorites] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [authRequired, setAuthRequired] = useState(false);

  useEffect(() => {
    // Static implementation - fetch from localStorage for now
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      
      // Static implementation - get favorites from localStorage
      const staticFavoriteIds = JSON.parse(localStorage.getItem('staticFavorites') || '[]');
      
      // Get all properties and filter by favorite IDs
      // For now, we'll simulate this with sample data
      const allProperties = await import('../data/sampleProperties').then(m => m.sampleProperties);
      const favoriteProperties = allProperties.filter(property => staticFavoriteIds.includes(property.id));
      
      setFavorites(favoriteProperties);
      setAuthRequired(false);
    } catch (error: any) {
      console.error('Error fetching favorites:', error);
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (propertyId: number) => {
    try {
      setRemovingId(propertyId);
      
      // Static implementation - remove from localStorage
      const staticFavorites = JSON.parse(localStorage.getItem('staticFavorites') || '[]');
      const updatedFavorites = staticFavorites.filter((id: number) => id !== propertyId);
      localStorage.setItem('staticFavorites', JSON.stringify(updatedFavorites));
      
      // Update UI
      setFavorites(prev => prev.filter(property => property.id !== propertyId));
    } catch (error) {
      console.error('Error removing favorite:', error);
    } finally {
      setRemovingId(null);
    }
  };

  const handlePropertyClick = (propertyId: number) => {
    window.location.href = `/properties/${propertyId}`;
  };

  // Static implementation - no auth required for now
  // if (!isAuthenticated || authRequired) {
  //   return (
  //     <div className="min-h-screen bg-gray-50 flex items-center justify-center">
  //       <div className="text-center">
  //         <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
  //         <h2 className="text-2xl font-bold text-gray-900 mb-4">Please log in to view your favorites</h2>
  //         <button 
  //           onClick={() => window.location.href = '/login'}
  //           className="btn-primary"
  //         >
  //           Go to Login
  //         </button>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <Heart className="w-8 h-8 text-red-500" />
              <h1 className="text-3xl font-bold text-gray-900">My Favorites</h1>
            </div>
            <p className="text-gray-600">
              {loading ? 'Loading...' : `${favorites.length} saved ${favorites.length === 1 ? 'property' : 'properties'}`}
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          )}

          {/* Empty State */}
          {!loading && favorites.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center py-16"
            >
              <div className="bg-white rounded-xl shadow-card p-12">
                <Heart className="w-20 h-20 text-gray-300 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-gray-900 mb-4">No favorites yet</h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Start exploring properties and save your favorites by clicking the heart icon on any property card.
                </p>
                <button 
                  onClick={() => window.location.href = '/properties'}
                  className="btn-primary"
                >
                  Browse Properties
                </button>
              </div>
            </motion.div>
          )}

          {/* Favorites Grid */}
          {!loading && favorites.length > 0 && (
            <motion.div 
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              <AnimatePresence>
                {favorites.map((property) => (
                  <motion.div
                    key={property.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    className="relative group"
                  >
                    {/* Remove Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFavorite(property.id);
                      }}
                      disabled={removingId === property.id}
                      className="absolute top-4 left-4 z-10 p-2 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600 disabled:opacity-50"
                      title="Remove from favorites"
                    >
                      {removingId === property.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>

                    {/* Favorite Heart Badge */}
                    <div className="absolute top-4 right-4 z-10 p-2 bg-red-500 text-white rounded-full shadow-lg">
                      <Heart className="w-4 h-4 fill-current" />
                    </div>

                    {/* Property Card */}
                    <PropertyCard 
                      property={property} 
                      onClick={() => handlePropertyClick(property.id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Quick Actions */}
          {!loading && favorites.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-12 bg-white rounded-xl shadow-card p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={() => window.location.href = '/properties'}
                  className="btn-secondary"
                >
                  Browse More Properties
                </button>
                <button 
                  onClick={() => window.location.href = '/add-property'}
                  className="btn-primary"
                >
                  List Your Property
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default FavoritesPage;
