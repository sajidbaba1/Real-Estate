import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, Users, Home, DollarSign, Calendar, TrendingUp, 
  AlertTriangle, CheckCircle, Clock, XCircle, Filter,
  Eye, MessageSquare, Star, BarChart3, PieChart,
  RefreshCw, Download, Search
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

interface BookingStats {
  totalActive: number;
  totalRevenue: number;
  pendingApprovals: number;
  overduePayments: number;
  monthlyGrowth: number;
}

interface BookingNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
}

interface QuickStats {
  label: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
}

const BookingManagementDashboard: React.FC = () => {
  const [stats, setStats] = useState<BookingStats>({
    totalActive: 0,
    totalRevenue: 0,
    pendingApprovals: 0,
    overduePayments: 0,
    monthlyGrowth: 0,
  });
  const [notifications, setNotifications] = useState<BookingNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread' | 'high'>('unread');
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month'>('week');

  useEffect(() => {
    loadDashboardData();
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to view dashboard');
        return;
      }

      // Load multiple data sources in parallel
      const [
        pendingApprovalsRes,
        notificationsRes,
        unreadCountRes
      ] = await Promise.all([
        fetch(`${API_BASE_URL}/api/booking-management/pending-approvals`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/api/booking-notifications/unread`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/api/booking-notifications/unread-count`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      // Process pending approvals
      if (pendingApprovalsRes.ok) {
        const approvalsData = await pendingApprovalsRes.json();
        const pendingCount = (approvalsData.rentBookings?.length || 0) + (approvalsData.pgBookings?.length || 0);
        
        setStats(prev => ({
          ...prev,
          pendingApprovals: pendingCount,
          totalActive: Math.floor(Math.random() * 50) + 20, // Mock data
          totalRevenue: Math.floor(Math.random() * 500000) + 100000, // Mock data
          overduePayments: Math.floor(Math.random() * 10), // Mock data
          monthlyGrowth: Math.floor(Math.random() * 30) + 5, // Mock data
        }));
      }

      // Process notifications
      if (notificationsRes.ok) {
        const notificationsData = await notificationsRes.json();
        setNotifications(notificationsData);
      }

      // Process unread count
      if (unreadCountRes.ok) {
        const countData = await unreadCountRes.json();
        setUnreadCount(countData.unreadCount || 0);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markNotificationAsRead = async (notificationId: number) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE_URL}/api/booking-notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE_URL}/api/booking-notifications/mark-all-read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const getFilteredNotifications = () => {
    let filtered = notifications;
    
    if (notificationFilter === 'unread') {
      filtered = filtered.filter(n => !n.isRead);
    } else if (notificationFilter === 'high') {
      filtered = filtered.filter(n => n.priority === 'HIGH');
    }
    
    return filtered;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'BOOKING_CREATED': return <Calendar className="h-4 w-4" />;
      case 'BOOKING_APPROVED': return <CheckCircle className="h-4 w-4" />;
      case 'BOOKING_REJECTED': return <XCircle className="h-4 w-4" />;
      case 'PAYMENT_DUE': return <DollarSign className="h-4 w-4" />;
      case 'PAYMENT_OVERDUE': return <AlertTriangle className="h-4 w-4" />;
      case 'PAYMENT_RECEIVED': return <DollarSign className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (priority: string, type: string) => {
    if (priority === 'HIGH') return 'border-l-red-500 bg-red-50';
    if (type === 'PAYMENT_RECEIVED') return 'border-l-green-500 bg-green-50';
    if (type === 'BOOKING_APPROVED') return 'border-l-green-500 bg-green-50';
    if (type === 'BOOKING_REJECTED') return 'border-l-red-500 bg-red-50';
    return 'border-l-blue-500 bg-blue-50';
  };

  const quickStats: QuickStats[] = [
    {
      label: 'Active Bookings',
      value: stats.totalActive,
      change: '+12% this month',
      icon: <Home className="h-6 w-6" />,
      color: 'bg-blue-500',
      trend: 'up'
    },
    {
      label: 'Monthly Revenue',
      value: formatCurrency(stats.totalRevenue),
      change: `+${stats.monthlyGrowth}% growth`,
      icon: <DollarSign className="h-6 w-6" />,
      color: 'bg-green-500',
      trend: 'up'
    },
    {
      label: 'Pending Approvals',
      value: stats.pendingApprovals,
      change: 'Requires attention',
      icon: <Clock className="h-6 w-6" />,
      color: 'bg-yellow-500',
      trend: 'neutral'
    },
    {
      label: 'Overdue Payments',
      value: stats.overduePayments,
      change: stats.overduePayments > 0 ? 'Action needed' : 'All up to date',
      icon: <AlertTriangle className="h-6 w-6" />,
      color: stats.overduePayments > 0 ? 'bg-red-500' : 'bg-gray-500',
      trend: stats.overduePayments > 0 ? 'down' : 'neutral'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadDashboardData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <BarChart3 className="h-8 w-8 text-blue-600 mr-3" />
                Booking Management Dashboard
              </h1>
              <p className="text-gray-600 mt-2">
                Monitor and manage your property bookings in real-time
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
                >
                  <Bell className="h-6 w-6" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </div>
              
              {/* Refresh Button */}
              <button
                onClick={loadDashboardData}
                disabled={refreshing}
                className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  <p className={`text-sm mt-2 ${
                    stat.trend === 'up' ? 'text-green-600' : 
                    stat.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {stat.trend === 'up' && '↗'} 
                    {stat.trend === 'down' && '↘'} 
                    {stat.change}
                  </p>
                </div>
                <div className={`${stat.color} text-white p-3 rounded-lg`}>
                  {stat.icon}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Charts and Analytics */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => window.location.href = '/booking-approvals'}
                  className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Clock className="h-6 w-6 text-blue-600 mb-2" />
                  <span className="text-sm font-medium text-blue-900">Approvals</span>
                  {stats.pendingApprovals > 0 && (
                    <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full mt-1">
                      {stats.pendingApprovals}
                    </span>
                  )}
                </button>
                
                <button
                  onClick={() => window.location.href = '/bookings'}
                  className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <Home className="h-6 w-6 text-green-600 mb-2" />
                  <span className="text-sm font-medium text-green-900">My Bookings</span>
                </button>
                
                <button
                  onClick={() => window.location.href = '/properties'}
                  className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <Search className="h-6 w-6 text-purple-600 mb-2" />
                  <span className="text-sm font-medium text-purple-900">Properties</span>
                </button>
                
                <button
                  className="flex flex-col items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Download className="h-6 w-6 text-gray-600 mb-2" />
                  <span className="text-sm font-medium text-gray-900">Reports</span>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {getFilteredNotifications().slice(0, 5).map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border-l-4 ${getNotificationColor(notification.priority, notification.type)} ${
                      !notification.isRead ? 'shadow-sm' : 'opacity-70'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="text-gray-600 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{notification.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                          <p className="text-xs text-gray-500 mt-2">{formatDate(notification.createdAt)}</p>
                        </div>
                      </div>
                      {!notification.isRead && (
                        <button
                          onClick={() => markNotificationAsRead(notification.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                
                {notifications.length === 0 && (
                  <div className="text-center py-8">
                    <Bell className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No recent activity</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Notifications Panel */}
          <div className="space-y-6">
            {/* Notifications Panel */}
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                
                {/* Notification Filters */}
                <div className="flex space-x-2">
                  {['all', 'unread', 'high'].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setNotificationFilter(filter as any)}
                      className={`px-3 py-1 rounded-full text-sm capitalize ${
                        notificationFilter === filter
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {filter}
                      {filter === 'unread' && unreadCount > 0 && (
                        <span className="ml-1 bg-blue-600 text-white text-xs rounded-full px-1">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {getFilteredNotifications().map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                      !notification.isRead ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => !notification.isRead && markNotificationAsRead(notification.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="text-gray-600 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-sm ${!notification.isRead ? 'font-semibold' : 'font-medium'} text-gray-900`}>
                          {notification.title}
                        </h4>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-2">{formatDate(notification.createdAt)}</p>
                      </div>
                      {notification.priority === 'HIGH' && (
                        <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
                      )}
                    </div>
                  </div>
                ))}
                
                {getFilteredNotifications().length === 0 && (
                  <div className="p-8 text-center">
                    <Bell className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No notifications found</p>
                  </div>
                )}
              </div>
            </div>

            {/* Performance Summary */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">This Month Summary</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Bookings Approved
                  </span>
                  <span className="font-semibold text-gray-900">
                    {Math.floor(Math.random() * 20) + 10}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center text-sm text-gray-600">
                    <DollarSign className="h-4 w-4 text-green-600 mr-2" />
                    Payments Received
                  </span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(Math.floor(Math.random() * 100000) + 50000)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center text-sm text-gray-600">
                    <Star className="h-4 w-4 text-yellow-600 mr-2" />
                    Avg Rating
                  </span>
                  <span className="font-semibold text-gray-900">4.8/5</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 text-blue-600 mr-2" />
                    Active Tenants
                  </span>
                  <span className="font-semibold text-gray-900">{stats.totalActive}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingManagementDashboard;
