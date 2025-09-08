import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Home, User, Calendar, DollarSign, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import ChatComponent from '../components/ChatComponent';
import webSocketService from '../services/websocketService';

interface ChatMessage {
  id: number;
  content: string;
  messageType: string;
  priceAmount?: number;
  sender: {
    id: number;
    firstName: string;
    lastName: string;
  };
  sentAt: string;
  isRead: boolean;
}

interface PropertyInquiry {
  id: number;
  status: string;
  agreedPrice?: number;
  offeredPrice?: number;
  createdAt: string;
  updatedAt: string;
  property: {
    id: number;
    title: string;
    price: number;
    imageUrl?: string;
    address?: string;
    city?: string;
    state?: string;
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
    email?: string;
    phone?: string;
  };
}

const InquiryDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const inquiryId = Number(id);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inquiry, setInquiry] = useState<PropertyInquiry | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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
          console.log('WebSocket connected for inquiry detail');
          setWsConnected(true);
        })
        .catch(error => {
          console.error('WebSocket connection failed:', error);
          setWsConnected(false);
        });

      // Listen for connection changes
      const unsubscribe = webSocketService.onConnectionChange(setWsConnected);

      return () => {
        unsubscribe();
      };
    }
  }, [token, user?.id]);

  const loadInquiry = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!token) {
        setError('Please login to view this inquiry');
        navigate('/login');
        return;
      }

      if (!inquiryId || isNaN(inquiryId)) {
        setError('Invalid inquiry ID');
        return;
      }

      const response = await fetch(`${apiBase}/inquiries/${inquiryId}`, { headers });
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('Please login to view this inquiry');
          navigate('/login');
          return;
        }
        if (response.status === 403) {
          setError('You are not authorized to view this inquiry');
          return;
        }
        if (response.status === 404) {
          setError('Inquiry not found');
          return;
        }
        throw new Error(`Failed to load inquiry (${response.status})`);
      }

      const data = await response.json();
      console.log('Loaded inquiry detail:', data);
      setInquiry(data.inquiry);
      setMessages(data.messages || []);
    } catch (e: any) {
      console.error('Failed to load inquiry:', e);
      setError(e.message || 'Failed to load inquiry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && inquiryId) {
      loadInquiry();
    }
  }, [token, inquiryId]);

  const handleMessagesUpdate = (updatedMessages: ChatMessage[]) => {
    setMessages(updatedMessages);
  };

  const handleInquiryUpdate = (updatedInquiry: PropertyInquiry) => {
    setInquiry(updatedInquiry);
  };

  const handleGoBack = () => {
    if (user?.role === 'USER') {
      navigate('/inquiries');
    } else {
      navigate('/inquiries/owner');
    }
  };

  const handleViewProperty = () => {
    if (inquiry) {
      navigate(`/properties/${inquiry.property.id}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'NEGOTIATING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'AGREED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'PURCHASED':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'CLOSED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isClient = user?.id === inquiry?.client?.id;
  const isOwner = user?.id === inquiry?.owner?.id;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading inquiry details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={handleGoBack}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!inquiry) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">Inquiry not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <button
              onClick={handleGoBack}
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Inquiries
            </button>
            
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-600">
                {wsConnected ? 'Real-time connected' : 'Offline mode'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Inquiry #{inquiry.id}
              </h1>
              <p className="text-gray-600 mt-1">
                {isClient ? `Your inquiry for ${inquiry.property.title}` : 
                 isOwner ? `Inquiry from ${inquiry.client.firstName} ${inquiry.client.lastName}` :
                 `Inquiry for ${inquiry.property.title}`}
              </p>
            </div>
            
            <div className={`inline-flex items-center px-4 py-2 rounded-lg border font-medium ${getStatusColor(inquiry.status)}`}>
              {inquiry.status === 'PURCHASED' && <CheckCircle className="w-5 h-5 mr-2" />}
              {inquiry.status}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Property and Participants Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Property Card */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Property Details</h3>
                <button
                  onClick={handleViewProperty}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  View Property
                </button>
              </div>
              
              {inquiry.property.imageUrl && (
                <img
                  src={inquiry.property.imageUrl}
                  alt={inquiry.property.title}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              )}
              
              <h4 className="font-semibold text-gray-900 mb-2">{inquiry.property.title}</h4>
              
              {inquiry.property.address && (
                <p className="text-gray-600 text-sm mb-2">
                  {inquiry.property.address}
                  {inquiry.property.city && `, ${inquiry.property.city}`}
                  {inquiry.property.state && `, ${inquiry.property.state}`}
                </p>
              )}
              
              <div className="flex items-center text-lg font-semibold text-green-600 mb-4">
                <DollarSign className="w-5 h-5 mr-1" />
                ₹{inquiry.property.price.toLocaleString()}
              </div>
              
              {/* Price negotiations */}
              {inquiry.offeredPrice && (
                <div className="bg-blue-50 rounded-lg p-3 mb-3">
                  <div className="text-sm font-medium text-blue-800">Current Offer</div>
                  <div className="text-lg font-semibold text-blue-900">
                    ₹{inquiry.offeredPrice.toLocaleString()}
                  </div>
                </div>
              )}
              
              {inquiry.agreedPrice && (
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-sm font-medium text-green-800">Agreed Price</div>
                  <div className="text-lg font-semibold text-green-900">
                    ₹{inquiry.agreedPrice.toLocaleString()}
                  </div>
                </div>
              )}
            </div>

            {/* Participants */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Participants</h3>
              
              {/* Client Info */}
              <div className="mb-4 pb-4 border-b border-gray-100">
                <div className="flex items-center mb-2">
                  <User className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="font-medium text-gray-900">Buyer</span>
                  {isClient && <span className="ml-2 text-sm text-blue-600">(You)</span>}
                </div>
                <div className="text-gray-700">
                  {inquiry.client.firstName} {inquiry.client.lastName}
                </div>
                {inquiry.client.email && (
                  <div className="text-sm text-gray-600">{inquiry.client.email}</div>
                )}
                {inquiry.client.phone && (
                  <div className="text-sm text-gray-600">{inquiry.client.phone}</div>
                )}
              </div>
              
              {/* Owner Info */}
              <div>
                <div className="flex items-center mb-2">
                  <Home className="w-5 h-5 text-green-600 mr-2" />
                  <span className="font-medium text-gray-900">Property Owner</span>
                  {isOwner && <span className="ml-2 text-sm text-green-600">(You)</span>}
                </div>
                <div className="text-gray-700">
                  {inquiry.owner.firstName} {inquiry.owner.lastName}
                </div>
                {inquiry.owner.email && (
                  <div className="text-sm text-gray-600">{inquiry.owner.email}</div>
                )}
                {inquiry.owner.phone && (
                  <div className="text-sm text-gray-600">{inquiry.owner.phone}</div>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
              
              <div className="space-y-3">
                <div className="flex items-start">
                  <Calendar className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Inquiry Created</div>
                    <div className="text-xs text-gray-600">{formatDate(inquiry.createdAt)}</div>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Calendar className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Last Updated</div>
                    <div className="text-xs text-gray-600">{formatDate(inquiry.updatedAt)}</div>
                  </div>
                </div>
                
                {inquiry.status === 'PURCHASED' && (
                  <div className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-green-900">Purchase Completed</div>
                      <div className="text-xs text-green-600">Property successfully sold</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Chat */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Real-time Chat</h3>
                <p className="text-gray-600 text-sm mt-1">
                  Negotiate and discuss details with the {isClient ? 'property owner' : 'interested buyer'}
                </p>
              </div>
              
              {inquiry && (
                <div className="p-6">
                  <ChatComponent
                    inquiryId={inquiry.id}
                    inquiry={inquiry}
                    messages={messages}
                    onMessagesUpdate={handleMessagesUpdate}
                    onInquiryUpdate={handleInquiryUpdate}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InquiryDetailPage;
