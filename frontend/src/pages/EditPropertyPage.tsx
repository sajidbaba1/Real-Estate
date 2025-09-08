import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ShieldPlus, Mail, Phone } from 'lucide-react';
import { propertyApi } from '../services/api';
import { Property, PropertyType, PropertyStatus, ListingType, PriceType } from '../types/Property';
import GoogleMap from '../components/GoogleMap';
import { GeocodingService } from '../services/geocoding';
import { useAuth } from '../contexts/AuthContext';

const EditPropertyPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState<number | null>(null);
  const [ownerInfo, setOwnerInfo] = useState<{ firstName?: string; lastName?: string; email?: string; phone?: string; contactNumber?: string } | null>(null);

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
    listingType: ListingType.SALE,
    priceType: PriceType.ONE_TIME,
    imageUrl: '',
    latitude: undefined,
    longitude: undefined,
  });

  const [showMap, setShowMap] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 39.8283, lng: -98.5795 });
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationSearch, setLocationSearch] = useState('');
  const [searchingLocation, setSearchingLocation] = useState(false);

  useEffect(() => {
    const fetchProperty = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await propertyApi.getPropertyById(parseInt(id));
        // Map backend data into our form state
        setProperty({
          title: data.title,
          description: data.description,
          price: Number(data.price),
          address: data.address,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          bedrooms: data.bedrooms,
          bathrooms: data.bathrooms,
          squareFeet: data.squareFeet,
          propertyType: data.propertyType,
          status: data.status,
          listingType: data.listingType || (data.status === PropertyStatus.FOR_RENT ? ListingType.RENT : ListingType.SALE),
          priceType: data.priceType || (data.status === PropertyStatus.FOR_RENT ? PriceType.MONTHLY : PriceType.ONE_TIME),
          imageUrl: data.imageUrl || '',
          latitude: data.latitude,
          longitude: data.longitude,
        });
        const owner = (data as any)?.owner || null;
        setOwnerId(owner?.id ?? null);
        setOwnerInfo(owner ? {
          firstName: owner.firstName,
          lastName: owner.lastName,
          email: owner.email,
          phone: owner.phone || owner.contactNumber || ''
        } : null);
        if (data.latitude && data.longitude) {
          setSelectedLocation({ lat: data.latitude, lng: data.longitude });
          setMapCenter({ lat: data.latitude, lng: data.longitude });
        }
      } catch (e: any) {
        setApiError(e?.message || 'Failed to load property');
      } finally {
        setLoading(false);
      }
    };
    fetchProperty();
  }, [id]);

  const handleClaimOwnership = async () => {
    if (!id) return;
    try {
      await propertyApi.claimOwnership(parseInt(id));
      // refetch to update owner state
      const data = await propertyApi.getPropertyById(parseInt(id));
      const owner = (data as any)?.owner || null;
      setOwnerId(owner?.id ?? null);
      setOwnerInfo(owner ? {
        firstName: owner.firstName,
        lastName: owner.lastName,
        email: owner.email,
        phone: owner.phone || owner.contactNumber || ''
      } : null);
      alert('Ownership claimed. You can now update this property.');
    } catch (e: any) {
      alert(e?.message || 'Failed to claim ownership');
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!property.title.trim()) newErrors.title = 'Title is required';
    if (!property.description.trim()) newErrors.description = 'Description is required';
    if (property.price <= 0) newErrors.price = 'Price must be greater than 0';
    if (!property.address.trim()) newErrors.address = 'Address is required';
    if (!property.city.trim()) newErrors.city = 'City is required';
    if (!property.state.trim()) newErrors.state = 'State is required';
    if (!property.zipCode.trim()) newErrors.zipCode = 'ZIP code is required';
    if (property.bedrooms <= 0) newErrors.bedrooms = 'Bedrooms must be greater than 0';
    if (property.bathrooms <= 0) newErrors.bathrooms = 'Bathrooms must be greater than 0';
    if (property.squareFeet <= 0) newErrors.squareFeet = 'Square feet must be greater than 0';
    if (!property.listingType) newErrors.listingType = 'Listing type is required';
    if (!property.priceType) newErrors.priceType = 'Price type is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (["price", "bedrooms", "bathrooms", "squareFeet"].includes(name)) {
      setProperty(prev => ({ ...prev, [name]: value === '' ? 0 : Number(value) }));
      return;
    }
    if (name === 'status') {
      const newStatus = value as PropertyStatus;
      setProperty(prev => ({
        ...prev,
        status: newStatus,
        listingType: newStatus === PropertyStatus.FOR_RENT ? ListingType.RENT : ListingType.SALE,
        priceType: newStatus === PropertyStatus.FOR_RENT ? PriceType.MONTHLY : PriceType.ONE_TIME,
      }));
      return;
    }
    setProperty(prev => ({ ...prev, [name]: value }));

    if (errors[name]) setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
  };

  const handleLocationSearch = async () => {
    if (!locationSearch.trim()) return;
    setSearchingLocation(true);
    try {
      const result = await GeocodingService.geocodeAddress(locationSearch);
      if (result) {
        setMapCenter({ lat: result.lat, lng: result.lng });
        setSelectedLocation({ lat: result.lat, lng: result.lng });
        setProperty(prev => ({ ...prev, latitude: result.lat, longitude: result.lng }));
      }
    } finally {
      setSearchingLocation(false);
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    setProperty(prev => ({ ...prev, latitude: lat, longitude: lng }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!isAuthenticated) {
      alert('Please log in to update a property.');
      navigate('/login');
      return;
    }
    if (!validateForm()) return;
    try {
      setSaving(true);
      const updated = await propertyApi.updateProperty(parseInt(id), property);
      alert('Property updated successfully!');
      navigate(`/properties/${updated.id}`);
    } catch (e: any) {
      alert(e?.message || 'Failed to update property.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {apiError}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button onClick={() => navigate(-1)} className="flex items-center text-primary-600 hover:text-primary-800 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Edit Property</h1>
          <p className="text-gray-600 mt-2">Update details for your listing</p>
          {/* Owner/Agent Contact for this listing */}
          {(ownerId || ownerInfo || user) && (
            <div className="mt-4 p-4 bg-gray-50 border rounded-xl">
              <div className="text-sm font-semibold text-gray-900 mb-1">Agent Contact (from Profile)</div>
              <div className="text-sm text-gray-700 flex flex-col sm:flex-row sm:items-center sm:gap-4">
                <div>
                  {(ownerInfo?.firstName || ownerInfo?.lastName) ? (
                    <span>{ownerInfo?.firstName} {ownerInfo?.lastName}</span>
                  ) : (
                    <span>{(user?.firstName || '') + ' ' + (user?.lastName || '')}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>{ownerInfo?.email || user?.email}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{ownerInfo?.phone || user?.phone || 'Not set'}</span>
                </div>
                <Link to="/profile" className="text-primary-600 hover:underline ml-auto text-sm">Update in Profile</Link>
              </div>
              <div className="text-xs text-gray-500 mt-2">These details are shown to buyers on the property page. Edit them in your Profile.</div>
            </div>
          )}
          {(user && (user.role === 'ADMIN' || user.role === 'AGENT') && ownerId !== user.id) && (
            <div className="mt-3">
              <button onClick={handleClaimOwnership} type="button" className="inline-flex items-center px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
                <ShieldPlus className="w-4 h-4 mr-2" /> Claim Ownership
              </button>
            </div>
          )}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="bg-white rounded-xl shadow-card overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input name="title" value={property.title} onChange={handleInputChange} className={`w-full input-field ${errors.title ? 'border-red-500' : ''}`} />
                {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea name="description" value={property.description} onChange={handleInputChange} rows={4} className={`w-full input-field ${errors.description ? 'border-red-500' : ''}`} />
                {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                <input type="number" name="price" value={property.price || ''} onChange={handleInputChange} min="0" step="1000" className={`w-full input-field ${errors.price ? 'border-red-500' : ''}`} />
                {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
                <select name="propertyType" value={property.propertyType} onChange={handleInputChange} className="w-full input-field">
                  {Object.values(PropertyType).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select name="status" value={property.status} onChange={handleInputChange} className="w-full input-field">
                  {Object.values(PropertyStatus).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Listing Type</label>
                <select name="listingType" value={property.listingType} onChange={handleInputChange} className={`w-full input-field ${errors.listingType ? 'border-red-500' : ''}`}>
                  {Object.values(ListingType).map((lt) => (
                    <option key={lt} value={lt}>{lt}</option>
                  ))}
                </select>
                {errors.listingType && <p className="mt-1 text-sm text-red-600">{errors.listingType}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price Type</label>
                <select name="priceType" value={property.priceType} onChange={handleInputChange} className={`w-full input-field ${errors.priceType ? 'border-red-500' : ''}`}>
                  {Object.values(PriceType).map((pt) => (
                    <option key={pt} value={pt}>{pt}</option>
                  ))}
                </select>
                {errors.priceType && <p className="mt-1 text-sm text-red-600">{errors.priceType}</p>}
              </div>
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input name="address" value={property.address} onChange={handleInputChange} className={`w-full input-field ${errors.address ? 'border-red-500' : ''}`} />
                  {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input name="city" value={property.city} onChange={handleInputChange} className={`w-full input-field ${errors.city ? 'border-red-500' : ''}`} />
                  {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input name="state" value={property.state} onChange={handleInputChange} className={`w-full input-field ${errors.state ? 'border-red-500' : ''}`} />
                  {errors.state && <p className="mt-1 text-sm text-red-600">{errors.state}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                  <input name="zipCode" value={property.zipCode} onChange={handleInputChange} className={`w-full input-field ${errors.zipCode ? 'border-red-500' : ''}`} />
                  {errors.zipCode && <p className="mt-1 text-sm text-red-600">{errors.zipCode}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:col-span-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
                  <input type="number" name="bedrooms" value={property.bedrooms || 0} onChange={handleInputChange} min="0" className={`w-full input-field ${errors.bedrooms ? 'border-red-500' : ''}`} />
                  {errors.bedrooms && <p className="mt-1 text-sm text-red-600">{errors.bedrooms}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
                  <input type="number" name="bathrooms" value={property.bathrooms || 0} onChange={handleInputChange} min="0" className={`w-full input-field ${errors.bathrooms ? 'border-red-500' : ''}`} />
                  {errors.bathrooms && <p className="mt-1 text-sm text-red-600">{errors.bathrooms}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Square Feet</label>
                  <input type="number" name="squareFeet" value={property.squareFeet || 0} onChange={handleInputChange} min="0" className={`w-full input-field ${errors.squareFeet ? 'border-red-500' : ''}`} />
                  {errors.squareFeet && <p className="mt-1 text-sm text-red-600">{errors.squareFeet}</p>}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input name="imageUrl" value={property.imageUrl || ''} onChange={handleInputChange} className="w-full input-field" />
              </div>
            </div>

            {/* Map and location */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <button type="button" onClick={() => setShowMap(!showMap)} className="btn-primary">
                  {showMap ? 'Hide Map' : 'Pick on Map'}
                </button>
                <div className="flex-1 flex gap-2">
                  <input className="input-field flex-1" placeholder="Search address..." value={locationSearch} onChange={(e) => setLocationSearch(e.target.value)} />
                  <button type="button" onClick={handleLocationSearch} className="btn-secondary" disabled={searchingLocation}>
                    {searchingLocation ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </div>
              {showMap && (
                <div className="rounded-lg overflow-hidden border">
                  <div className="h-80">
                    <GoogleMap
                      center={selectedLocation || mapCenter}
                      zoom={selectedLocation ? 16 : 4}
                      markers={selectedLocation ? [{ position: selectedLocation, title: property.title } ] : []}
                      height="320px"
                      onMapClick={handleMapClick}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3">
              <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default EditPropertyPage;
