import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Property } from '../types/Property';
import GoogleMap from './GoogleMap';
import { GeocodingService } from '../services/geocoding';
import { MapPin, DollarSign, Bed, Bath, Heart, Eye } from 'lucide-react';

interface PropertiesMapViewProps {
  properties: Property[];
  onPropertyClick: (property: Property) => void;
  className?: string;
}

interface PropertyWithCoordinates extends Property {
  coordinates?: { lat: number; lng: number };
}

const PropertiesMapView: React.FC<PropertiesMapViewProps> = ({
  properties,
  onPropertyClick,
  className = '',
}) => {
  const [propertiesWithCoords, setPropertiesWithCoords] = useState<PropertyWithCoordinates[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<PropertyWithCoordinates | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 39.8283, lng: -98.5795 }); // Center of US

  useEffect(() => {
    geocodeProperties();
  }, [properties]);

  const geocodeProperties = async () => {
    setLoading(true);
    const propertiesWithCoordinates: PropertyWithCoordinates[] = [];

    for (const property of properties) {
      let coordinates: { lat: number; lng: number } | null = null;

      // Use existing coordinates if available
      if (property.latitude && property.longitude) {
        coordinates = { lat: property.latitude, lng: property.longitude };
      } else {
        // Try to geocode the address
        const fullAddress = `${property.address}, ${property.city}, ${property.state} ${property.zipCode}`;
        const geocodeResult = await GeocodingService.geocodeAddress(fullAddress);
        
        if (geocodeResult) {
          coordinates = { lat: geocodeResult.lat, lng: geocodeResult.lng };
        } else {
          // Fallback to city/state default coordinates
          coordinates = GeocodingService.getDefaultCoordinates(property.city, property.state);
        }
      }

      propertiesWithCoordinates.push({
        ...property,
        coordinates,
      });
    }

    setPropertiesWithCoords(propertiesWithCoordinates);

    // Set map center to the first property with coordinates or average of all properties
    if (propertiesWithCoordinates.length > 0) {
      const validCoords = propertiesWithCoordinates
        .filter(p => p.coordinates)
        .map(p => p.coordinates!);

      if (validCoords.length > 0) {
        const avgLat = validCoords.reduce((sum, coord) => sum + coord.lat, 0) / validCoords.length;
        const avgLng = validCoords.reduce((sum, coord) => sum + coord.lng, 0) / validCoords.length;
        setMapCenter({ lat: avgLat, lng: avgLng });
      }
    }

    setLoading(false);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'FOR_SALE':
        return 'text-green-600';
      case 'FOR_RENT':
        return 'text-blue-600';
      case 'SOLD':
        return 'text-gray-600';
      case 'RENTED':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  const markers = propertiesWithCoords
    .filter(property => property.coordinates)
    .map(property => ({
      position: property.coordinates!,
      title: property.title,
      info: `
        <div class="p-3 max-w-xs">
          <h3 class="font-semibold text-gray-900 mb-2">${property.title}</h3>
          <p class="text-lg font-bold text-primary-600 mb-2">${formatPrice(property.price)}</p>
          <div class="flex items-center text-sm text-gray-600 mb-2">
            <span class="mr-3">${property.bedrooms} bed</span>
            <span class="mr-3">${property.bathrooms} bath</span>
            <span>${property.squareFeet} sqft</span>
          </div>
          <p class="text-sm text-gray-600 mb-3">${property.city}, ${property.state}</p>
          <button 
            onclick="window.handlePropertyClick(${property.id})" 
            class="w-full bg-primary-600 text-white px-3 py-2 rounded text-sm hover:bg-primary-700 transition-colors"
          >
            View Details
          </button>
        </div>
      `,
    }));

  // Expose property click handler to global scope for map info windows
  useEffect(() => {
    (window as any).handlePropertyClick = (propertyId: number) => {
      const property = propertiesWithCoords.find(p => p.id === propertyId);
      if (property) {
        onPropertyClick(property);
      }
    };

    return () => {
      delete (window as any).handlePropertyClick;
    };
  }, [propertiesWithCoords, onPropertyClick]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-96 bg-gray-100 rounded-lg ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className="h-96 lg:h-[600px] rounded-lg overflow-hidden shadow-card">
        <GoogleMap
          center={mapCenter}
          zoom={10}
          markers={markers}
          height="100%"
        />
      </div>

      {/* Property Info Panel */}
      {selectedProperty && (
        <motion.div
          initial={{ opacity: 0, x: -300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -300 }}
          className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-sm z-10"
        >
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-semibold text-gray-900 text-lg">{selectedProperty.title}</h3>
            <button
              onClick={() => setSelectedProperty(null)}
              className="text-gray-400 hover:text-gray-600 ml-2"
            >
              ×
            </button>
          </div>
          
          <div className="mb-3">
            <p className="text-2xl font-bold text-primary-600 mb-1">
              {formatPrice(selectedProperty.price)}
            </p>
            <p className={`text-sm font-medium ${getStatusColor(selectedProperty.status)}`}>
              {selectedProperty.status.replace('_', ' ')}
            </p>
          </div>

          <div className="flex items-center text-sm text-gray-600 mb-3">
            <Bed className="w-4 h-4 mr-1" />
            <span className="mr-3">{selectedProperty.bedrooms}</span>
            <Bath className="w-4 h-4 mr-1" />
            <span className="mr-3">{selectedProperty.bathrooms}</span>
            <span>{selectedProperty.squareFeet} sqft</span>
          </div>

          <div className="flex items-center text-sm text-gray-600 mb-4">
            <MapPin className="w-4 h-4 mr-1" />
            <span>{selectedProperty.city}, {selectedProperty.state}</span>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => onPropertyClick(selectedProperty)}
              className="flex-1 flex items-center justify-center bg-primary-600 text-white px-3 py-2 rounded text-sm hover:bg-primary-700 transition-colors"
            >
              <Eye className="w-4 h-4 mr-1" />
              View Details
            </button>
            <button className="p-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
              <Heart className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Map Stats */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 z-10">
        <div className="flex items-center text-sm text-gray-600">
          <MapPin className="w-4 h-4 mr-1" />
          <span>{propertiesWithCoords.length} properties shown</span>
        </div>
      </div>
    </div>
  );
};

export default PropertiesMapView;
