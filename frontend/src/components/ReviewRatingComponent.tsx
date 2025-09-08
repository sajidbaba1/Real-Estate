import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Star, User, Calendar, ThumbsUp, MessageSquare, Shield, 
  Award, Filter, Search, ChevronDown, Plus, Eye, Edit, Trash2
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

interface Review {
  id: number;
  reviewer: {
    id: number;
    firstName: string;
    lastName: string;
  };
  reviewee: {
    id: number;
    firstName: string;
    lastName: string;
  };
  rating: number;
  comment: string;
  cleanlinessRating?: number;
  communicationRating?: number;
  reliabilityRating?: number;
  propertyConditionRating?: number;
  neighborhoodRating?: number;
  reviewType: 'TENANT_REVIEW' | 'OWNER_REVIEW' | 'PROPERTY_REVIEW';
  isAnonymous: boolean;
  isVerified: boolean;
  helpfulCount: number;
  createdAt: string;
  rentBooking?: any;
  pgBooking?: any;
}

interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  averageCleanliness: number;
  averageCommunication: number;
  averageReliability: number;
  ratingBreakdown: { [key: number]: number };
}

interface CreateReviewData {
  rentBookingId?: number;
  pgBookingId?: number;
  revieweeId: number;
  reviewType: 'TENANT_REVIEW' | 'OWNER_REVIEW' | 'PROPERTY_REVIEW';
  rating: number;
  comment: string;
  cleanlinessRating?: number;
  communicationRating?: number;
  reliabilityRating?: number;
  propertyConditionRating?: number;
  neighborhoodRating?: number;
  isAnonymous: boolean;
}

interface ReviewRatingComponentProps {
  userId?: number;
  showCreateButton?: boolean;
  allowCreate?: boolean;
  bookingId?: number;
  bookingType?: 'rent' | 'pg';
  revieweeId?: number;
}

const ReviewRatingComponent: React.FC<ReviewRatingComponentProps> = ({
  userId,
  showCreateButton = true,
  allowCreate = true,
  bookingId,
  bookingType,
  revieweeId
}) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    totalReviews: 0,
    averageRating: 0,
    averageCleanliness: 0,
    averageCommunication: 0,
    averageReliability: 0,
    ratingBreakdown: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Create review states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createData, setCreateData] = useState<CreateReviewData>({
    revieweeId: revieweeId || 0,
    reviewType: 'TENANT_REVIEW',
    rating: 5,
    comment: '',
    isAnonymous: false
  });
  
  // Filter states
  const [filterType, setFilterType] = useState<'all' | 'TENANT_REVIEW' | 'OWNER_REVIEW' | 'PROPERTY_REVIEW'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (userId) {
      loadReviews();
    }
  }, [userId, filterType, sortBy]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      let url = `${API_BASE_URL}/api/reviews/user/${userId}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load reviews');
      }

      const data = await response.json();
      setReviews(data.reviews || []);
      setStats({
        totalReviews: data.totalReviews || 0,
        averageRating: data.averageRating || 0,
        averageCleanliness: data.averageCleanliness || 0,
        averageCommunication: data.averageCommunication || 0,
        averageReliability: data.averageReliability || 0,
        ratingBreakdown: data.ratingBreakdown || {}
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReview = async () => {
    if (!createData.comment.trim() || createData.rating < 1) {
      alert('Please provide a rating and comment');
      return;
    }

    try {
      setCreating(true);
      const token = localStorage.getItem('token');
      
      const payload: any = {
        ...createData,
        ...(bookingType === 'rent' && { rentBookingId: bookingId }),
        ...(bookingType === 'pg' && { pgBookingId: bookingId })
      };

      const response = await fetch(`${API_BASE_URL}/api/reviews`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Failed to create review');
      }

      alert('Review submitted successfully!');
      setShowCreateModal(false);
      setCreateData({
        revieweeId: revieweeId || 0,
        reviewType: 'TENANT_REVIEW',
        rating: 5,
        comment: '',
        isAnonymous: false
      });
      
      if (userId) {
        await loadReviews();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create review');
    } finally {
      setCreating(false);
    }
  };

  const markHelpful = async (reviewId: number) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE_URL}/api/reviews/${reviewId}/helpful`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      // Update local state
      setReviews(prev => prev.map(review => 
        review.id === reviewId 
          ? { ...review, helpfulCount: review.helpfulCount + 1 }
          : review
      ));
    } catch (err) {
      console.error('Failed to mark review as helpful:', err);
    }
  };

  const getFilteredReviews = () => {
    let filtered = reviews;
    
    if (filterType !== 'all') {
      filtered = filtered.filter(review => review.reviewType === filterType);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(review => 
        review.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.reviewer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.reviewer.lastName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Sort reviews
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'highest':
          return b.rating - a.rating;
        case 'lowest':
          return a.rating - b.rating;
        default:
          return 0;
      }
    });
    
    return filtered;
  };

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClass = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-6 w-6' : 'h-4 w-4';
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClass} ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const renderInteractiveStars = (rating: number, onChange: (rating: number) => void, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClass = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-8 w-8' : 'h-6 w-6';
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`${sizeClass} transition-colors ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300 hover:text-yellow-300'
            }`}
          >
            <Star className="w-full h-full" />
          </button>
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getReviewTypeColor = (type: string) => {
    switch (type) {
      case 'TENANT_REVIEW': return 'bg-blue-100 text-blue-800';
      case 'OWNER_REVIEW': return 'bg-green-100 text-green-800';
      case 'PROPERTY_REVIEW': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getReviewTypeLabel = (type: string) => {
    switch (type) {
      case 'TENANT_REVIEW': return 'Tenant Review';
      case 'OWNER_REVIEW': return 'Owner Review';
      case 'PROPERTY_REVIEW': return 'Property Review';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading reviews...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadReviews}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const filteredReviews = getFilteredReviews();

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center">
            <Star className="h-6 w-6 text-yellow-500 mr-2" />
            Reviews & Ratings
          </h3>
          {showCreateButton && allowCreate && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Write Review
            </button>
          )}
        </div>

        {/* Stats Overview */}
        {stats.totalReviews > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                {renderStars(Math.round(stats.averageRating), 'lg')}
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.averageRating.toFixed(1)}</p>
              <p className="text-sm text-gray-600">{stats.totalReviews} reviews</p>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Cleanliness</p>
              <div className="flex items-center justify-center mb-1">
                {renderStars(Math.round(stats.averageCleanliness))}
              </div>
              <p className="text-lg font-semibold text-gray-900">{stats.averageCleanliness.toFixed(1)}</p>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Communication</p>
              <div className="flex items-center justify-center mb-1">
                {renderStars(Math.round(stats.averageCommunication))}
              </div>
              <p className="text-lg font-semibold text-gray-900">{stats.averageCommunication.toFixed(1)}</p>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Reliability</p>
              <div className="flex items-center justify-center mb-1">
                {renderStars(Math.round(stats.averageReliability))}
              </div>
              <p className="text-lg font-semibold text-gray-900">{stats.averageReliability.toFixed(1)}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search reviews..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Reviews</option>
            <option value="TENANT_REVIEW">Tenant Reviews</option>
            <option value="OWNER_REVIEW">Owner Reviews</option>
            <option value="PROPERTY_REVIEW">Property Reviews</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest">Highest Rating</option>
            <option value="lowest">Lowest Rating</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
      <div className="divide-y divide-gray-200">
        {filteredReviews.length === 0 ? (
          <div className="p-8 text-center">
            <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No reviews yet</h4>
            <p className="text-gray-600">
              {allowCreate ? 'Be the first to write a review!' : 'Check back later for reviews.'}
            </p>
          </div>
        ) : (
          filteredReviews.map((review) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {review.isAnonymous ? 'Anonymous User' : `${review.reviewer.firstName} ${review.reviewer.lastName}`}
                    </h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getReviewTypeColor(review.reviewType)}`}>
                        {getReviewTypeLabel(review.reviewType)}
                      </span>
                      {review.isVerified && (
                        <span className="flex items-center text-green-600 text-xs">
                          <Shield className="h-3 w-3 mr-1" />
                          Verified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center space-x-2 mb-1">
                    {renderStars(review.rating)}
                    <span className="text-sm font-medium text-gray-900">{review.rating}.0</span>
                  </div>
                  <p className="text-xs text-gray-500 flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDate(review.createdAt)}
                  </p>
                </div>
              </div>

              {/* Review Content */}
              <div className="mb-4">
                <p className="text-gray-700 leading-relaxed">{review.comment}</p>
              </div>

              {/* Detailed Ratings */}
              {(review.cleanlinessRating || review.communicationRating || review.reliabilityRating) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                  {review.cleanlinessRating && (
                    <div className="text-center">
                      <p className="text-xs text-gray-600 mb-1">Cleanliness</p>
                      {renderStars(review.cleanlinessRating, 'sm')}
                    </div>
                  )}
                  {review.communicationRating && (
                    <div className="text-center">
                      <p className="text-xs text-gray-600 mb-1">Communication</p>
                      {renderStars(review.communicationRating, 'sm')}
                    </div>
                  )}
                  {review.reliabilityRating && (
                    <div className="text-center">
                      <p className="text-xs text-gray-600 mb-1">Reliability</p>
                      {renderStars(review.reliabilityRating, 'sm')}
                    </div>
                  )}
                  {review.propertyConditionRating && (
                    <div className="text-center">
                      <p className="text-xs text-gray-600 mb-1">Property</p>
                      {renderStars(review.propertyConditionRating, 'sm')}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => markHelpful(review.id)}
                  className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <ThumbsUp className="h-4 w-4" />
                  <span className="text-sm">Helpful ({review.helpfulCount})</span>
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Create Review Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Write a Review</h3>
              
              <div className="space-y-4">
                {/* Review Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Review Type</label>
                  <select
                    value={createData.reviewType}
                    onChange={(e) => setCreateData({ ...createData, reviewType: e.target.value as any })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="TENANT_REVIEW">Review Tenant</option>
                    <option value="OWNER_REVIEW">Review Owner</option>
                    <option value="PROPERTY_REVIEW">Review Property</option>
                  </select>
                </div>

                {/* Overall Rating */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Overall Rating</label>
                  <div className="flex items-center space-x-2">
                    {renderInteractiveStars(createData.rating, (rating) => setCreateData({ ...createData, rating }))}
                    <span className="text-lg font-medium text-gray-900">{createData.rating}.0</span>
                  </div>
                </div>

                {/* Detailed Ratings */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cleanliness</label>
                    {renderInteractiveStars(createData.cleanlinessRating || 0, (rating) => 
                      setCreateData({ ...createData, cleanlinessRating: rating })
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Communication</label>
                    {renderInteractiveStars(createData.communicationRating || 0, (rating) => 
                      setCreateData({ ...createData, communicationRating: rating })
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reliability</label>
                    {renderInteractiveStars(createData.reliabilityRating || 0, (rating) => 
                      setCreateData({ ...createData, reliabilityRating: rating })
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Property Condition</label>
                    {renderInteractiveStars(createData.propertyConditionRating || 0, (rating) => 
                      setCreateData({ ...createData, propertyConditionRating: rating })
                    )}
                  </div>
                </div>

                {/* Comment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Your Review</label>
                  <textarea
                    value={createData.comment}
                    onChange={(e) => setCreateData({ ...createData, comment: e.target.value })}
                    placeholder="Share your experience..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                    required
                  />
                </div>

                {/* Anonymous Option */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="anonymous"
                    checked={createData.isAnonymous}
                    onChange={(e) => setCreateData({ ...createData, isAnonymous: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="anonymous" className="ml-2 text-sm text-gray-700">
                    Post anonymously
                  </label>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateReview}
                  disabled={creating || !createData.comment.trim()}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReviewRatingComponent;
