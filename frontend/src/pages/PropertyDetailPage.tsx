import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  Bed, 
  Bath, 
  Square, 
  Calendar, 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Phone, 
  Mail,
  Share2
} from 'lucide-react';
import { propertyApi } from '../services/api';
import { Property, PropertyStatus } from '../types/Property';
import GoogleMap from '../components/GoogleMap';
import { GeocodingService } from '../services/geocoding';

const PropertyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (id) {
      fetchProperty(parseInt(id));
    }
  }, [id]);

  const fetchProperty = async (propertyId: number) => {
    try {
      setLoading(true);
      const data = await propertyApi.getPropertyById(propertyId);
      setProperty(data);
      
      // Get coordinates for the property location
      await getPropertyCoordinates(data);
    } catch (err) {
      console.error('Error fetching property:', err);
      setError('Failed to load property details');
    } finally {
      setLoading(false);
    }
  };

  const getPropertyCoordinates = async (property: Property) => {
    try {
      // Use existing coordinates if available
      if (property.latitude && property.longitude) {
        setCoordinates({ lat: property.latitude, lng: property.longitude });
        return;
      }

      // Try to geocode the full address
      const fullAddress = `${property.address}, ${property.city}, ${property.state} ${property.zipCode}`;
      const geocodeResult = await GeocodingService.geocodeAddress(fullAddress);
      
      if (geocodeResult) {
        setCoordinates({ lat: geocodeResult.lat, lng: geocodeResult.lng });
      } else {
        // Fallback to city/state default coordinates
        const defaultCoords = GeocodingService.getDefaultCoordinates(property.city, property.state);
        setCoordinates(defaultCoords);
      }
    } catch (error) {
      console.error('Error getting property coordinates:', error);
      // Fallback to city/state default coordinates
      const defaultCoords = GeocodingService.getDefaultCoordinates(property.city, property.state);
      setCoordinates(defaultCoords);
    }
  };

  const handleDelete = async () => {
    if (!property || !id) return;
    
    if (window.confirm('Are you sure you want to delete this property?')) {
      try {
        await propertyApi.deleteProperty(parseInt(id));
        navigate('/properties');
      } catch (err) {
        console.error('Error deleting property:', err);
        alert('Failed to delete property');
      }
    }
  };

  const getStatusBadgeClass = (status: PropertyStatus) => {
    switch (status) {
      case PropertyStatus.FOR_SALE:
        return 'bg-green-100 text-green-800';
      case PropertyStatus.FOR_RENT:
        return 'bg-blue-100 text-blue-800';
      case PropertyStatus.SOLD:
        return 'bg-gray-100 text-gray-800';
      case PropertyStatus.RENTED:
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-green-100 text-green-800';
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Error loading property</h3>
          <p className="text-gray-500 mb-4">{error || 'Property not found'}</p>
          <button 
            onClick={() => navigate('/properties')}
            className="btn-primary"
          >
            Back to Properties
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button 
          onClick={() => navigate('/properties')}
          className="flex items-center text-primary-600 hover:text-primary-800 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Properties
        </button>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-xl shadow-card overflow-hidden"
        >
          {/* Property Image */}
          <div className="h-96 bg-gray-200 relative">
            {property.imageUrl ? (
              <img 
                src={property.imageUrl} 
                alt={property.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                <div className="text-white text-6xl font-bold">{property.title.charAt(0)}</div>
              </div>
            )}
            
            {/* Status Badge */}
            <div className={`absolute top-6 right-6 px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadgeClass(property.status)}`}>
              {getStatusText(property.status)}
            </div>
          </div>

          <div className="p-6 md:p-8">
            {/* Property Header */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{property.title}</h1>
                <div className="flex items-center text-gray-600 mb-4">
                  <MapPin className="w-5 h-5 mr-2" />
                  <span>{property.address}, {property.city}, {property.state} {property.zipCode}</span>
                </div>
                <div className="text-3xl font-bold text-primary-600 mb-4">{formatPrice(property.price)}</div>
              </div>
              
              <div className="flex space-x-3 mt-4 md:mt-0">
                <button className="p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200">
                  <Share2 className="w-5 h-5 text-gray-600" />
                </button>
                <button 
                  onClick={() => navigate(`/edit-property/${id}`)}
                  className="p-3 bg-primary-100 hover:bg-primary-200 rounded-lg transition-colors duration-200"
                >
                  <Edit className="w-5 h-5 text-primary-600" />
                </button>
                <button 
                  onClick={handleDelete}
                  className="p-3 bg-red-100 hover:bg-red-200 rounded-lg transition-colors duration-200"
                >
                  <Trash2 className="w-5 h-5 text-red-600" />
                </button>
              </div>
            </div>

            {/* Property Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <Bed className="w-6 h-6 text-primary-600" />
                </div>
                <div className="text-lg font-semibold">{property.bedrooms}</div>
                <div className="text-sm text-gray-600">Bedrooms</div>
              </div>
              
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <Bath className="w-6 h-6 text-primary-600" />
                </div>
                <div className="text-lg font-semibold">{property.bathrooms}</div>
                <div className="text-sm text-gray-600">Bathrooms</div>
              </div>
              
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <Square className="w-6 h-6 text-primary-600" />
                </div>
                <div className="text-lg font-semibold">{property.squareFeet}</div>
                <div className="text-sm text-gray-600">Sq Ft</div>
              </div>
              
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <Calendar className="w-6 h-6 text-primary-600" />
                </div>
                <div className="text-lg font-semibold">{property.propertyType.replace('_', ' ')}</div>
                <div className="text-sm text-gray-600">Type</div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Description</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">{property.description}</p>
            </div>

            {/* Location Map */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Location</h2>
              <div className="bg-white rounded-lg shadow-card overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center text-gray-700">
                    <MapPin className="w-5 h-5 mr-2 text-primary-600" />
                    <span className="font-medium">
                      {property.address}, {property.city}, {property.state} {property.zipCode}
                    </span>
                  </div>
                </div>
                <div className="h-96">
                  {coordinates ? (
                    <GoogleMap
                      center={coordinates}
                      zoom={16}
                      markers={[
                        {
                          position: coordinates,
                          title: property.title,
                          info: `${formatPrice(property.price)} • ${property.bedrooms} bed, ${property.bathrooms} bath`,
                        },
                      ]}
                      height="384px"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gray-100">
                      <div className="text-center">
                        <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600">Loading map...</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Section */}
            <div className="border-t border-gray-200 pt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Agent</h2>
              <div className="bg-primary-50 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mr-4">
                    <span className="text-white text-xl font-bold">SS</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Sajid Shaikh</h3>
                    <p className="text-gray-600">Real Estate Agent</p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                  <button className="flex items-center justify-center btn-primary flex-1">
                    <Phone className="w-4 h-4 mr-2" />
                    Call Agent
                  </button>
                  <button className="flex items-center justify-center bg-white border border-primary-600 text-primary-600 font-medium py-2 px-4 rounded-lg hover:bg-primary-50 transition-colors duration-200 flex-1">
                    <Mail className="w-4 h-4 mr-2" />
                    Email Agent
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PropertyDetailPage;
