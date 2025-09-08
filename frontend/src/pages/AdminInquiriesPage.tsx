import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Loader2, MessageSquare, Eye, Calendar, DollarSign, Home, AlertCircle, Users, Bell, Filter, Search, Download, BarChart3 } from 'lucide-react';
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

interface InquiryStats {
  total: number;
  active: number;
  negotiating: number;
  agreed: number;
  purchased: number;
  cancelled: number;
  closed: number;
  totalSalesValue: number;
  averageNegotiationTime: number;
}

const AdminInquiriesPage: React.FC = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inquiries, setInquiries] = useState<PropertyInquiry[]>([]);
  const [filteredInquiries, setFilteredInquiries] = useState<PropertyInquiry[]>([]);
  const [stats, setStats] = useState<InquiryStats | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('ALL');
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
          console.log('WebSocket connected for admin');
          setWsConnected(true);
        })
        .catch(error => {
          console.error('WebSocket connection failed:', error);
          setWsConnected(false);
        });

      // Listen for connection changes
      const unsubscribe = webSocketService.onConnectionChange(setWsConnected);

      // Listen for new inquiries and updates
      const unsubscribeNotifications = webSocketService.onNotification((notification) => {
        if (notification.type === 'NEW_INQUIRY' || notification.type === 'INQUIRY_STATUS_CHANGE') {
          loadInquiries(); // Refresh the list
        }
      });

      return () => {
        unsubscribe();
        unsubscribeNotifications();
      };
    }
  }, [token, user?.id]);

  // Apply filters
  useEffect(() => {
    let filtered = [...inquiries];

    // Status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(inquiry => inquiry.status === statusFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(inquiry => 
        inquiry.property.title.toLowerCase().includes(query) ||
        inquiry.client.firstName.toLowerCase().includes(query) ||
        inquiry.client.lastName.toLowerCase().includes(query) ||
        inquiry.owner.firstName.toLowerCase().includes(query) ||
        inquiry.owner.lastName.toLowerCase().includes(query) ||
        inquiry.property.city?.toLowerCase().includes(query) ||
        inquiry.property.state?.toLowerCase().includes(query)
      );
    }

    // Date filter
    if (dateFilter !== 'ALL') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'TODAY':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'WEEK':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'MONTH':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        default:
          filterDate.setFullYear(1900); // Show all
      }
      
      filtered = filtered.filter(inquiry => 
        new Date(inquiry.createdAt) >= filterDate
      );
    }

    setFilteredInquiries(filtered);
  }, [inquiries, statusFilter, searchQuery, dateFilter]);

  const loadInquiries = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!token) {
        setError('Please login to view inquiries');
        return;
      }

      if (user?.role !== 'ADMIN') {
        setError('Access denied. Admin privileges required.');
        return;
      }

      const response = await fetch(`${apiBase}/inquiries/admin/all`, { headers });
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('Please login to view inquiries');
          navigate('/login');
          return;
        }
        if (response.status === 403) {
          setError('Access denied. Admin privileges required.');
          return;
        }
        throw new Error(`Failed to load inquiries (${response.status})`);
      }

      const data = await response.json();
      console.log('Loaded admin inquiries:', data);
      setInquiries(data);
      
      // Calculate stats
      calculateStats(data);
    } catch (e: any) {
      console.error('Failed to load inquiries:', e);
      setError(e.message || 'Failed to load inquiries');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (inquiriesData: PropertyInquiry[]) => {
    const stats: InquiryStats = {
      total: inquiriesData.length,
      active: 0,
      negotiating: 0,
      agreed: 0,
      purchased: 0,
      cancelled: 0,
      closed: 0,
      totalSalesValue: 0,
      averageNegotiationTime: 0,
    };

    let totalNegotiationTime = 0;
    let negotiationCount = 0;

    inquiriesData.forEach(inquiry => {
      switch (inquiry.status) {
        case 'ACTIVE':
          stats.active++;
          break;
        case 'NEGOTIATING':
          stats.negotiating++;
          break;
        case 'AGREED':
          stats.agreed++;
          break;
        case 'PURCHASED':
          stats.purchased++;
          if (inquiry.agreedPrice) {
            stats.totalSalesValue += inquiry.agreedPrice;
          }
          break;
        case 'CANCELLED':
          stats.cancelled++;
          break;
        case 'CLOSED':
          stats.closed++;
          break;
      }

      // Calculate negotiation time for completed negotiations
      if (inquiry.status === 'PURCHASED' || inquiry.status === 'AGREED') {
        const created = new Date(inquiry.createdAt);
        const updated = new Date(inquiry.updatedAt);
        const timeDiff = updated.getTime() - created.getTime();
        totalNegotiationTime += timeDiff;
        negotiationCount++;
      }
    });

    if (negotiationCount > 0) {
      stats.averageNegotiationTime = totalNegotiationTime / negotiationCount / (1000 * 3600 * 24); // Convert to days
    }

    setStats(stats);
  };

  useEffect(() => {
    if (token && user?.role === 'ADMIN') {
      loadInquiries();
    }
  }, [token, user?.role]);

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
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString()}`;
  };

  const handleViewInquiry = (inquiryId: number) => {
    navigate(`/inquiries/${inquiryId}`);
  };

  const handleExportData = () => {
    // Create CSV data
    const csvData = filteredInquiries.map(inquiry => ({
      'Inquiry ID': inquiry.id,
      'Property': inquiry.property.title,
      'Client': `${inquiry.client.firstName} ${inquiry.client.lastName}`,
      'Owner': `${inquiry.owner.firstName} ${inquiry.owner.lastName}`,
      'Status': inquiry.status,
      'Property Price': inquiry.property.price,
      'Offered Price': inquiry.offeredPrice || '',
      'Agreed Price': inquiry.agreedPrice || '',
      'Created': formatDate(inquiry.createdAt),
      'Updated': formatDate(inquiry.updatedAt),
      'Location': `${inquiry.property.city || ''}, ${inquiry.property.state || ''}`,
    }));

    // Convert to CSV string
    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inquiries_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">You need admin privileges to access this page.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Users className="w-8 h-8 mr-3 text-red-600" />
                Admin - All Property Inquiries
              </h1>
              <p className="text-gray-600 mt-2">
                Monitor and manage all property inquiries across the platform
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleExportData}
                disabled={filteredInquiries.length === 0}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </button>
              
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-gray-600">
                  {wsConnected ? 'Real-time connected' : 'Offline mode'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Inquiries</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <MessageSquare className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Negotiations</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.negotiating}</p>
                </div>
                <DollarSign className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed Sales</p>
                  <p className="text-2xl font-bold text-green-600">{stats.purchased}</p>
                </div>
                <Home className="w-8 h-8 text-green-600" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Sales Value</p>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.totalSalesValue)}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by property, client, owner, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="NEGOTIATING">Negotiating</option>
                <option value="AGREED">Agreed</option>
                <option value="PURCHASED">Purchased</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            
            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="WEEK">Last 7 Days</option>
              <option value="MONTH">Last 30 Days</option>
            </select>
          </div>
          
          {/* Filter Results Summary */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-600">
              Showing {filteredInquiries.length} of {inquiries.length} inquiries
              {statusFilter !== 'ALL' && ` • Status: ${statusFilter}`}
              {searchQuery && ` • Search: "${searchQuery}"`}
              {dateFilter !== 'ALL' && ` • Time: ${dateFilter}`}
            </p>
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
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {inquiries.length === 0 ? 'No inquiries found' : 'No inquiries match your filters'}
            </h3>
            <p className="text-gray-600 mb-6">
              {inquiries.length === 0 
                ? 'Property inquiries from users will appear here.'
                : 'Try adjusting your search or filter criteria.'
              }
            </p>
            {searchQuery || statusFilter !== 'ALL' || dateFilter !== 'ALL' ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setDateFilter('ALL');
                }}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Clear Filters
              </button>
            ) : null}
          </div>
        )}

        {/* Inquiries list */}
        {!loading && !error && filteredInquiries.length > 0 && (
          <div className="space-y-6">
            {filteredInquiries.map((inquiry) => (
              <div
                key={inquiry.id}
                className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    {/* Main Info */}
                    <div className="flex-1">
                      <div className="flex items-start space-x-4">
                        {inquiry.property.imageUrl && (
                          <img
                            src={inquiry.property.imageUrl}
                            alt={inquiry.property.title}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        )}
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              #{inquiry.id} - {inquiry.property.title}
                            </h3>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(inquiry.status)}`}>
                              {inquiry.status}
                            </span>
                          </div>
                          
                          {/* Participants */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                            <div className="bg-blue-50 rounded-lg p-3">
                              <div className="text-xs font-medium text-blue-700 mb-1">Client</div>
                              <div className="text-sm font-medium text-blue-900">
                                {inquiry.client.firstName} {inquiry.client.lastName}
                              </div>
                              {inquiry.client.email && (
                                <div className="text-xs text-blue-600">{inquiry.client.email}</div>
                              )}
                            </div>
                            
                            <div className="bg-green-50 rounded-lg p-3">
                              <div className="text-xs font-medium text-green-700 mb-1">Property Owner</div>
                              <div className="text-sm font-medium text-green-900">
                                {inquiry.owner.firstName} {inquiry.owner.lastName}
                              </div>
                              {inquiry.owner.email && (
                                <div className="text-xs text-green-600">{inquiry.owner.email}</div>
                              )}
                            </div>
                          </div>
                          
                          {/* Price Info */}
                          <div className="flex items-center space-x-6 text-sm mb-3">
                            <span className="flex items-center text-gray-600">
                              <Home className="w-4 h-4 mr-1" />
                              Listed: {formatCurrency(inquiry.property.price)}
                            </span>
                            
                            {inquiry.offeredPrice && (
                              <span className="flex items-center text-blue-600 font-medium">
                                <DollarSign className="w-4 h-4 mr-1" />
                                Offered: {formatCurrency(inquiry.offeredPrice)}
                              </span>
                            )}
                            
                            {inquiry.agreedPrice && (
                              <span className="flex items-center text-green-600 font-semibold">
                                <Calendar className="w-4 h-4 mr-1" />
                                Agreed: {formatCurrency(inquiry.agreedPrice)}
                              </span>
                            )}
                          </div>
                          
                          {/* Location and dates */}
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            {inquiry.property.city && (
                              <span>{inquiry.property.city}, {inquiry.property.state}</span>
                            )}
                            <span>Created: {formatDate(inquiry.createdAt)}</span>
                            <span>Updated: {formatDate(inquiry.updatedAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex flex-col items-end space-y-2 ml-4">
                      <button
                        onClick={() => handleViewInquiry(inquiry.id)}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </button>
                      
                      {inquiry.status === 'PURCHASED' && (
                        <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                          Sale Completed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminInquiriesPage;
