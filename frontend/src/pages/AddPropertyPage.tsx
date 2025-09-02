import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { propertyApi } from '../services/api';
import { Property, PropertyType, PropertyStatus } from '../types/Property';

const AddPropertyPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [property, setProperty] = useState<Omit<Property, 'id' | 'createdAt' | 'updatedAt'>>({
    title: '',
    description: '',
    price: 0,
    address: '',
    city: '',
    state: '',
    zipCode: '',
    bedrooms: 0,
    bathrooms: 0,
    squareFeet: 0,
    propertyType: PropertyType.HOUSE,
    status: PropertyStatus.FOR_SALE,
    imageUrl: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Handle numeric fields
    if (['price', 'bedrooms', 'bathrooms', 'squareFeet'].includes(name)) {
      setProperty({
        ...property,
        [name]: value === '' ? 0 : Number(value),
      });
    } else {
      setProperty({
        ...property,
        [name]: value,
      });
    }
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!property.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!property.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (property.price <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }
    
    if (!property.address.trim()) {
      newErrors.address = 'Address is required';
    }
    
    if (!property.city.trim()) {
      newErrors.city = 'City is required';
    }
    
    if (!property.state.trim()) {
      newErrors.state = 'State is required';
    }
    
    if (!property.zipCode.trim()) {
      newErrors.zipCode = 'ZIP code is required';
    }
    
    if (property.bedrooms <= 0) {
      newErrors.bedrooms = 'Bedrooms must be greater than 0';
    }
    
    if (property.bathrooms <= 0) {
      newErrors.bathrooms = 'Bathrooms must be greater than 0';
    }
    
    if (property.squareFeet <= 0) {
      newErrors.squareFeet = 'Square feet must be greater than 0';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      await propertyApi.createProperty(property);
      navigate('/properties');
    } catch (error) {
      console.error('Error creating property:', error);
      alert('Failed to create property. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button 
            onClick={() => navigate('/properties')}
            className="flex items-center text-primary-600 hover:text-primary-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Properties
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Add New Property</h1>
          <p className="text-gray-600 mt-2">Fill in the details below to add a new property to the listing</p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-xl shadow-card overflow-hidden"
        >
          <form onSubmit={handleSubmit} className="p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Title */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Title</label>
                <input
                  type="text"
                  name="title"
                  value={property.title}
                  onChange={handleInputChange}
                  className={`w-full input-field ${errors.title ? 'border-red-500' : ''}`}
                  placeholder="e.g., Beautiful Family Home with Garden"
                />
                {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
              </div>
              
              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={property.description}
                  onChange={handleInputChange}
                  rows={4}
                  className={`w-full input-field ${errors.description ? 'border-red-500' : ''}`}
                  placeholder="Describe the property in detail..."
                />
                {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
              </div>
              
              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                <input
                  type="number"
                  name="price"
                  value={property.price || ''}
                  onChange={handleInputChange}
                  min="0"
                  step="1000"
                  className={`w-full input-field ${errors.price ? 'border-red-500' : ''}`}
                  placeholder="e.g., 500000"
                />
                {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price}</p>}
              </div>
              
              {/* Property Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
                <select
                  name="propertyType"
                  value={property.propertyType}
                  onChange={handleInputChange}
                  className="w-full input-field"
                >
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
                  value={property.status}
                  onChange={handleInputChange}
                  className="w-full input-field"
                >
                  <option value={PropertyStatus.FOR_SALE}>For Sale</option>
                  <option value={PropertyStatus.FOR_RENT}>For Rent</option>
                  <option value={PropertyStatus.SOLD}>Sold</option>
                  <option value={PropertyStatus.RENTED}>Rented</option>
                </select>
              </div>
              
              {/* Bedrooms */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
                <input
                  type="number"
                  name="bedrooms"
                  value={property.bedrooms || ''}
                  onChange={handleInputChange}
                  min="0"
                  className={`w-full input-field ${errors.bedrooms ? 'border-red-500' : ''}`}
                  placeholder="e.g., 3"
                />
                {errors.bedrooms && <p className="mt-1 text-sm text-red-600">{errors.bedrooms}</p>}
              </div>
              
              {/* Bathrooms */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
                <input
                  type="number"
                  name="bathrooms"
                  value={property.bathrooms || ''}
                  onChange={handleInputChange}
                  min="0"
                  step="0.5"
                  className={`w-full input-field ${errors.bathrooms ? 'border-red-500' : ''}`}
                  placeholder="e.g., 2.5"
                />
                {errors.bathrooms && <p className="mt-1 text-sm text-red-600">{errors.bathrooms}</p>}
              </div>
              
              {/* Square Feet */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Square Feet</label>
                <input
                  type="number"
                  name="squareFeet"
                  value={property.squareFeet || ''}
                  onChange={handleInputChange}
                  min="0"
                  className={`w-full input-field ${errors.squareFeet ? 'border-red-500' : ''}`}
                  placeholder="e.g., 2500"
                />
                {errors.squareFeet && <p className="mt-1 text-sm text-red-600">{errors.squareFeet}</p>}
              </div>
              
              {/* Address */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  name="address"
                  value={property.address}
                  onChange={handleInputChange}
                  className={`w-full input-field ${errors.address ? 'border-red-500' : ''}`}
                  placeholder="e.g., 123 Main Street"
                />
                {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
              </div>
              
              {/* City */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  name="city"
                  value={property.city}
                  onChange={handleInputChange}
                  className={`w-full input-field ${errors.city ? 'border-red-500' : ''}`}
                  placeholder="e.g., New York"
                />
                {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
              </div>
              
              {/* State */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  name="state"
                  value={property.state}
                  onChange={handleInputChange}
                  className={`w-full input-field ${errors.state ? 'border-red-500' : ''}`}
                  placeholder="e.g., NY"
                />
                {errors.state && <p className="mt-1 text-sm text-red-600">{errors.state}</p>}
              </div>
              
              {/* ZIP Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                <input
                  type="text"
                  name="zipCode"
                  value={property.zipCode}
                  onChange={handleInputChange}
                  className={`w-full input-field ${errors.zipCode ? 'border-red-500' : ''}`}
                  placeholder="e.g., 10001"
                />
                {errors.zipCode && <p className="mt-1 text-sm text-red-600">{errors.zipCode}</p>}
              </div>
              
              {/* Image URL */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL (Optional)</label>
                <input
                  type="text"
                  name="imageUrl"
                  value={property.imageUrl}
                  onChange={handleInputChange}
                  className="w-full input-field"
                  placeholder="https://example.com/property-image.jpg"
                />
              </div>
            </div>
            
            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/properties')}
                className="btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              
              <button
                type="submit"
                className="btn-primary flex items-center justify-center"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Add Property'
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default AddPropertyPage;
