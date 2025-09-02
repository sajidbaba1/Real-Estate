import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Property, PropertyStatus } from '../types/Property';
import { MapPin, Bed, Bath, Square, Heart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authApi';

interface PropertyCardProps {
  property: Property;
  onClick?: () => void;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property, onClick }) => {
  const { isAuthenticated } = useAuth();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      checkFavoriteStatus();
    }
  }, [isAuthenticated, property.id]);

  const checkFavoriteStatus = async () => {
    try {
      const favorited = await authService.isFavorited(property.id);
      setIsFavorited(favorited);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isAuthenticated) {
      window.location.href = '/login';
      return;
    }

    setIsToggling(true);
    try {
      if (isFavorited) {
        await authService.removeFromFavorites(property.id);
        setIsFavorited(false);
      } else {
        await authService.addToFavorites(property.id);
        setIsFavorited(true);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsToggling(false);
    }
  };

  const getStatusBadgeClass = (status: PropertyStatus) => {
    switch (status) {
      case PropertyStatus.FOR_SALE:
        return 'badge-for-sale';
      case PropertyStatus.FOR_RENT:
        return 'badge-for-rent';
      case PropertyStatus.SOLD:
        return 'badge-sold';
      case PropertyStatus.RENTED:
        return 'badge-rented';
      default:
        return 'badge-for-sale';
    }
  };

  const getStatusText = (status: PropertyStatus) => {
    switch (status) {
      case PropertyStatus.FOR_SALE:
        return 'For Sale';
      case PropertyStatus.FOR_RENT:
        return 'For Rent';
      case PropertyStatus.SOLD:
        return 'Sold';
      case PropertyStatus.RENTED:
        return 'Rented';
      default:
        return 'For Sale';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
      className="property-card"
      onClick={onClick}
    >
      <div className="relative">
        {/* Property Image */}
        <div className="h-48 bg-gray-200 rounded-t-xl overflow-hidden">
          {property.imageUrl ? (
            <img 
              src={property.imageUrl} 
              alt={property.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
              <div className="text-white text-4xl font-bold">{property.title.charAt(0)}</div>
            </div>
          )}
        </div>
        
        {/* Status Badge */}
        <div className={`absolute top-4 right-4 ${getStatusBadgeClass(property.status)}`}>
          {getStatusText(property.status)}
        </div>

        {/* Favorite Heart Button */}
        <button
          onClick={handleFavoriteToggle}
          disabled={isToggling}
          className={`absolute top-4 left-4 p-2 rounded-full shadow-lg transition-all duration-200 ${
            isFavorited 
              ? 'bg-red-500 text-white hover:bg-red-600' 
              : 'bg-white bg-opacity-90 text-gray-600 hover:bg-red-50 hover:text-red-500'
          } ${isToggling ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}`}
          title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          {isToggling ? (
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current"></div>
          ) : (
            <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
          )}
        </button>
      </div>

      <div className="p-5">
        {/* Price */}
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold text-gray-900">{formatPrice(property.price)}</h3>
          <span className="text-sm text-gray-500">{property.propertyType.replace('_', ' ')}</span>
        </div>

        {/* Title */}
        <h4 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-1">{property.title}</h4>
        
        {/* Address */}
        <div className="flex items-center text-gray-600 mb-4">
          <MapPin className="w-4 h-4 mr-1" />
          <span className="text-sm">{property.city}, {property.state}</span>
        </div>

        {/* Property Details */}
        <div className="flex justify-between border-t border-gray-100 pt-4">
          <div className="flex items-center text-gray-600">
            <Bed className="w-4 h-4 mr-1" />
            <span className="text-sm">{property.bedrooms} beds</span>
          </div>
          <div className="flex items-center text-gray-600">
            <Bath className="w-4 h-4 mr-1" />
            <span className="text-sm">{property.bathrooms} baths</span>
          </div>
          <div className="flex items-center text-gray-600">
            <Square className="w-4 h-4 mr-1" />
            <span className="text-sm">{property.squareFeet} sqft</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PropertyCard;
