import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Loader2, MessageSquare, Eye, Calendar, DollarSign, Home, AlertCircle } from 'lucide-react';
import webSocketService from '../services/websocketService';

interface PropertyInquiry {
  id: number;
  status: string;
  offeredPrice?: number;
  agreedPrice?: number;
  createdAt: string;
  updatedAt: string;
  property: {
    id: number;
    title: string;
    price: number;
    imageUrl?: string;
  };
  owner: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

const MyInquiriesPage: React.FC = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inquiries, setInquiries] = useState<PropertyInquiry[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<{ [key: number]: number }>({});
  const [wsConnected, setWsConnected] = useState(false);

  const RAW_BASE = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8888';
  const base = RAW_BASE.replace(/\/+$/, '');
  const apiBase = base.endsWith('/api') ? base : `${base}/api`;

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (token && user?.id) {
      webSocketService.connect(token, user.id.toString())
        .then(() => {
          console.log('WebSocket connected for user:', user.id);
          setWsConnected(true);
        })
        .catch(error => {
          console.error('WebSocket connection failed:', error);
          setWsConnected(false);
        });

      // Listen for connection changes
      const unsubscribe = webSocketService.onConnectionChange(setWsConnected);

      // Listen for new messages to update unread counts
      const unsubscribeMessages = webSocketService.onMessage((message) => {
        if (message.inquiryId) {
          loadUnreadCounts();
        }
      });

      return () => {
        unsubscribe();
        unsubscribeMessages();
      };
    }
  }, [token, user?.id]);

  const loadInquiries = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!token) {
        setError('Please login to view your inquiries');
        return;
      }

      const response = await fetch(`${apiBase}/inquiries/my`, { headers });
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('Please login to view your inquiries');
          navigate('/login');
          return;
        }
        if (response.status === 403) {
          setError('You are not authorized to view inquiries');
          return;
        }
        throw new Error(`Failed to load inquiries (${response.status})`);
      }

      const data = await response.json();
      console.log('Loaded inquiries:', data);
      setInquiries(data);
    } catch (e: any) {
      console.error('Failed to load inquiries:', e);
      setError(e.message || 'Failed to load inquiries');
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCounts = async () => {
    try {
      if (!token) return;
      
      const response = await fetch(`${apiBase}/inquiries/unread-count`, { headers });
      if (response.ok) {
        const data = await response.json();
        // For now, we'll just track total unread count
        // In a more advanced implementation, we could track per-inquiry counts
      }
    } catch (error) {
      console.error('Failed to load unread counts:', error);
    }
  };

  useEffect(() => {
    if (token) {
      loadInquiries();
      loadUnreadCounts();
    }
  }, [token]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-blue-100 text-blue-800';
      case 'NEGOTIATING':
        return 'bg-yellow-100 text-yellow-800';
      case 'AGREED':
        return 'bg-green-100 text-green-800';
      case 'PURCHASED':
        return 'bg-purple-100 text-purple-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'CLOSED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <MessageSquare className="w-4 h-4" />;
      case 'NEGOTIATING':
        return <DollarSign className="w-4 h-4" />;
      case 'AGREED':
        return <Calendar className="w-4 h-4" />;
      case 'PURCHASED':
        return <Home className="w-4 h-4" />;
      case 'CANCELLED':
      case 'CLOSED':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewInquiry = (inquiryId: number) => {
    navigate(`/inquiries/${inquiryId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <MessageSquare className="w-8 h-8 mr-3 text-blue-600" />
                My Property Inquiries
              </h1>
              <p className="text-gray-600 mt-2">
                Track your property inquiries and negotiate with owners in real-time.
              </p>
            </div>
            
            {/* Connection status */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-gray-600">
                  {wsConnected ? 'Real-time connected' : 'Offline mode'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="py-20 text-center text-gray-500">
            <Loader2 className="w-8 h-8 inline animate-spin mr-2" />
            Loading your inquiries...
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && inquiries.length === 0 && (
          <div className="text-center py-16">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No inquiries yet</h3>
            <p className="text-gray-600 mb-6">
              Start by browsing properties and sending inquiries to owners.
            </p>
            <button
              onClick={() => navigate('/properties')}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Home className="w-5 h-5 mr-2" />
              Browse Properties
            </button>
          </div>
        )}

        {/* Inquiries list */}
        {!loading && !error && inquiries.length > 0 && (
          <div className="space-y-6">
            {inquiries.map((inquiry) => (
              <div
                key={inquiry.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    {/* Property info */}
                    <div className="flex-1">
                      <div className="flex items-start space-x-4">
                        {inquiry.property.imageUrl && (
                          <img
                            src={inquiry.property.imageUrl}
                            alt={inquiry.property.title}
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                        )}
                        
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {inquiry.property.title}
                          </h3>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                            <span className="flex items-center">
                              <Home className="w-4 h-4 mr-1" />
                              Property Price: ₹{inquiry.property.price.toLocaleString()}
                            </span>
                            
                            <span className="flex items-center">
                              Owner: {inquiry.owner.firstName} {inquiry.owner.lastName}
                            </span>
                          </div>
                          
                          {/* Price information */}
                          <div className="flex items-center space-x-4 text-sm mb-3">
                            {inquiry.offeredPrice && (
                              <span className="flex items-center text-blue-600 font-medium">
                                <DollarSign className="w-4 h-4 mr-1" />
                                Your Offer: ₹{inquiry.offeredPrice.toLocaleString()}
                              </span>
                            )}
                            
                            {inquiry.agreedPrice && (
                              <span className="flex items-center text-green-600 font-medium">
                                <Calendar className="w-4 h-4 mr-1" />
                                Agreed Price: ₹{inquiry.agreedPrice.toLocaleString()}
                              </span>
                            )}
                          </div>
                          
                          {/* Dates */}
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>Created: {formatDate(inquiry.createdAt)}</span>
                            <span>Updated: {formatDate(inquiry.updatedAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Status and actions */}
                    <div className="flex flex-col items-end space-y-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(inquiry.status)}`}>
                        {getStatusIcon(inquiry.status)}
                        <span className="ml-1">{inquiry.status}</span>
                      </span>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewInquiry(inquiry.id)}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Chat
                        </button>
                        
                        {inquiry.status === 'AGREED' && (
                          <button
                            onClick={() => handleViewInquiry(inquiry.id)}
                            className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors animate-pulse"
                          >
                            <Home className="w-4 h-4 mr-1" />
                            Purchase Ready
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress indicator for negotiating inquiries */}
                  {inquiry.status === 'NEGOTIATING' && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Negotiation in progress</span>
                        <span className="text-blue-600 font-medium">
                          Continue the conversation to reach an agreement
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Purchase ready indicator */}
                  {inquiry.status === 'AGREED' && (
                    <div className="mt-4 pt-4 border-t border-green-100 bg-green-50 -mx-6 -mb-6 px-6 py-3 rounded-b-xl">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-green-700 font-medium">
                          🎉 Price agreed! You can now proceed with the purchase.
                        </span>
                        <span className="text-green-600 text-xs">
                          Click "View Chat" to complete the purchase
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Completed purchase indicator */}
                  {inquiry.status === 'PURCHASED' && (
                    <div className="mt-4 pt-4 border-t border-purple-100 bg-purple-50 -mx-6 -mb-6 px-6 py-3 rounded-b-xl">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-purple-700 font-medium">
                          ✅ Purchase completed successfully!
                        </span>
                        <span className="text-purple-600 text-xs">
                          Property has been marked as SOLD
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyInquiriesPage;
