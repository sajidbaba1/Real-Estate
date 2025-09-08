import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Loader2, MessageSquare, Eye, Calendar, DollarSign, Home, AlertCircle, Users, Bell } from 'lucide-react';
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
  client: {
    id: number;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  owner: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

const OwnerInquiriesPage: React.FC = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inquiries, setInquiries] = useState<PropertyInquiry[]>([]);
  const [filteredInquiries, setFilteredInquiries] = useState<PropertyInquiry[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [wsConnected, setWsConnected] = useState(false);
  const [newInquiryCount, setNewInquiryCount] = useState(0);

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
          console.log('WebSocket connected for owner:', user.id);
          setWsConnected(true);
        })
        .catch(error => {
          console.error('WebSocket connection failed:', error);
          setWsConnected(false);
        });

      // Listen for connection changes
      const unsubscribe = webSocketService.onConnectionChange(setWsConnected);

      // Listen for new inquiries and messages
      const unsubscribeNotifications = webSocketService.onNotification((notification) => {
        if (notification.type === 'NEW_INQUIRY') {
          setNewInquiryCount(prev => prev + 1);
          loadInquiries(); // Refresh the list
        }
      });

      const unsubscribeMessages = webSocketService.onMessage((message) => {
        if (message.inquiryId) {
          loadInquiries(); // Refresh to show updated timestamps
        }
      });

      return () => {
        unsubscribe();
        unsubscribeNotifications();
        unsubscribeMessages();
      };
    }
  }, [token, user?.id]);

  // Filter inquiries based on status
  useEffect(() => {
    if (statusFilter === 'ALL') {
      setFilteredInquiries(inquiries);
    } else {
      setFilteredInquiries(inquiries.filter(inquiry => inquiry.status === statusFilter));
    }
  }, [inquiries, statusFilter]);

  const loadInquiries = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!token) {
        setError('Please login to view inquiries');
        return;
      }

      const response = await fetch(`${apiBase}/inquiries/owner`, { headers });
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('Please login to view inquiries');
          navigate('/login');
          return;
        }
        if (response.status === 403) {
          setError('You are not authorized to view owner inquiries');
          return;
        }
        throw new Error(`Failed to load inquiries (${response.status})`);
      }

      const data = await response.json();
      console.log('Loaded owner inquiries:', data);
      setInquiries(data);
      setNewInquiryCount(0); // Reset new inquiry count
    } catch (e: any) {
      console.error('Failed to load inquiries:', e);
      setError(e.message || 'Failed to load inquiries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && (user?.role === 'AGENT' || user?.role === 'ADMIN')) {
      loadInquiries();
    } else if (user?.role === 'USER') {
      setError('This page is for property owners and agents only');
      navigate('/inquiries');
    }
  }, [token, user?.role]);

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

  const getPriorityLevel = (inquiry: PropertyInquiry) => {
    const now = new Date();
    const updated = new Date(inquiry.updatedAt);
    const hoursDiff = (now.getTime() - updated.getTime()) / (1000 * 3600);

    if (inquiry.status === 'AGREED') return 'high';
    if (inquiry.status === 'NEGOTIATING' && hoursDiff < 24) return 'medium';
    if (inquiry.status === 'ACTIVE' && hoursDiff > 48) return 'low';
    return 'normal';
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

  const getTimeSinceUpdate = (dateString: string) => {
    const now = new Date();
    const updated = new Date(dateString);
    const diffMs = now.getTime() - updated.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 3600));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const handleViewInquiry = (inquiryId: number) => {
    navigate(`/inquiries/${inquiryId}`);
  };

  const getStatusCounts = () => {
    const counts = inquiries.reduce((acc, inquiry) => {
      acc[inquiry.status] = (acc[inquiry.status] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
    
    return {
      total: inquiries.length,
      ...counts
    };
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Users className="w-8 h-8 mr-3 text-green-600" />
                Property Inquiries
                {newInquiryCount > 0 && (
                  <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    <Bell className="w-4 h-4 mr-1" />
                    {newInquiryCount} new
                  </span>
                )}
              </h1>
              <p className="text-gray-600 mt-2">
                {user?.role === 'ADMIN' 
                  ? 'Manage all property inquiries across the platform'
                  : 'Manage inquiries for your properties and negotiate with potential buyers'
                }
              </p>
            </div>
            
            {/* Connection status and stats */}
            <div className="flex flex-col items-end space-y-2">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-gray-600">
                  {wsConnected ? 'Real-time connected' : 'Offline mode'}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                Total: {statusCounts.total} inquiries
              </div>
            </div>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {['ALL', 'ACTIVE', 'NEGOTIATING', 'AGREED', 'PURCHASED', 'CANCELLED'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    statusFilter === status
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {status}
                  {status !== 'ALL' && statusCounts[status] && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {statusCounts[status]}
                    </span>
                  )}
                  {status === 'ALL' && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {statusCounts.total}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="py-20 text-center text-gray-500">
            <Loader2 className="w-8 h-8 inline animate-spin mr-2" />
            Loading inquiries...
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
        {!loading && !error && filteredInquiries.length === 0 && (
          <div className="text-center py-16">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {statusFilter === 'ALL' ? 'No inquiries yet' : `No ${statusFilter.toLowerCase()} inquiries`}
            </h3>
            <p className="text-gray-600 mb-6">
              {statusFilter === 'ALL' 
                ? 'Inquiries from interested buyers will appear here.'
                : `There are no inquiries with ${statusFilter.toLowerCase()} status.`
              }
            </p>
          </div>
        )}

        {/* Inquiries list */}
        {!loading && !error && filteredInquiries.length > 0 && (
          <div className="space-y-6">
            {filteredInquiries.map((inquiry) => {
              const priority = getPriorityLevel(inquiry);
              return (
                <div
                  key={inquiry.id}
                  className={`bg-white rounded-xl shadow-sm border-l-4 hover:shadow-md transition-shadow ${
                    priority === 'high' ? 'border-l-green-500' :
                    priority === 'medium' ? 'border-l-yellow-500' :
                    priority === 'low' ? 'border-l-red-500' :
                    'border-l-blue-500'
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      {/* Property and client info */}
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
                            
                            {/* Client information */}
                            <div className="bg-gray-50 rounded-lg p-3 mb-3">
                              <h4 className="text-sm font-medium text-gray-700 mb-2">Interested Buyer</h4>
                              <div className="flex items-center space-x-4 text-sm text-gray-600">
                                <span className="font-medium">
                                  {inquiry.client.firstName} {inquiry.client.lastName}
                                </span>
                                {inquiry.client.email && (
                                  <a href={`mailto:${inquiry.client.email}`} className="text-blue-600 hover:underline">
                                    {inquiry.client.email}
                                  </a>
                                )}
                                {inquiry.client.phone && (
                                  <a href={`tel:${inquiry.client.phone}`} className="text-blue-600 hover:underline">
                                    {inquiry.client.phone}
                                  </a>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                              <span className="flex items-center">
                                <Home className="w-4 h-4 mr-1" />
                                Listed Price: ₹{inquiry.property.price.toLocaleString()}
                              </span>
                            </div>
                            
                            {/* Price information */}
                            <div className="flex items-center space-x-4 text-sm mb-3">
                              {inquiry.offeredPrice && (
                                <span className="flex items-center text-blue-600 font-medium">
                                  <DollarSign className="w-4 h-4 mr-1" />
                                  Client Offer: ₹{inquiry.offeredPrice.toLocaleString()}
                                </span>
                              )}
                              
                              {inquiry.agreedPrice && (
                                <span className="flex items-center text-green-600 font-medium">
                                  <Calendar className="w-4 h-4 mr-1" />
                                  Agreed Price: ₹{inquiry.agreedPrice.toLocaleString()}
                                </span>
                              )}
                            </div>
                            
                            {/* Dates and time info */}
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>Created: {formatDate(inquiry.createdAt)}</span>
                              <span>Last activity: {getTimeSinceUpdate(inquiry.updatedAt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Status and actions */}
                      <div className="flex flex-col items-end space-y-3">
                        <div className="flex items-center space-x-2">
                          {priority === 'high' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              High Priority
                            </span>
                          )}
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(inquiry.status)}`}>
                            {getStatusIcon(inquiry.status)}
                            <span className="ml-1">{inquiry.status}</span>
                          </span>
                        </div>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewInquiry(inquiry.id)}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <MessageSquare className="w-4 h-4 mr-1" />
                            Open Chat
                          </button>
                          
                          {inquiry.status === 'AGREED' && (
                            <button
                              onClick={() => handleViewInquiry(inquiry.id)}
                              className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors animate-pulse"
                            >
                              <Calendar className="w-4 h-4 mr-1" />
                              Finalize Sale
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Action indicators */}
                    {inquiry.status === 'ACTIVE' && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">New inquiry - respond to start negotiation</span>
                          <span className="text-blue-600 font-medium">Action needed</span>
                        </div>
                      </div>
                    )}
                    
                    {inquiry.status === 'NEGOTIATING' && (
                      <div className="mt-4 pt-4 border-t border-yellow-100 bg-yellow-50 -mx-6 -mb-6 px-6 py-3 rounded-b-xl">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-yellow-800">
                            Price negotiation in progress - client offered ₹{inquiry.offeredPrice?.toLocaleString()}
                          </span>
                          <span className="text-yellow-600 font-medium">Awaiting your response</span>
                        </div>
                      </div>
                    )}
                    
                    {inquiry.status === 'AGREED' && (
                      <div className="mt-4 pt-4 border-t border-green-100 bg-green-50 -mx-6 -mb-6 px-6 py-3 rounded-b-xl">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-green-700 font-medium">
                            🎉 Price agreed at ₹{inquiry.agreedPrice?.toLocaleString()}! Client is ready to purchase.
                          </span>
                          <span className="text-green-600 text-xs">Click "Finalize Sale" to complete</span>
                        </div>
                      </div>
                    )}
                    
                    {inquiry.status === 'PURCHASED' && (
                      <div className="mt-4 pt-4 border-t border-purple-100 bg-purple-50 -mx-6 -mb-6 px-6 py-3 rounded-b-xl">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-purple-700 font-medium">
                            ✅ Sale completed for ₹{inquiry.agreedPrice?.toLocaleString()}!
                          </span>
                          <span className="text-purple-600 text-xs">Property marked as SOLD</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerInquiriesPage;
