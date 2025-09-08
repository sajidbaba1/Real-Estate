import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Building, Plus, Search, User, Menu, X, LogOut, LogIn, Heart, UserCircle, Shield, Briefcase, Users, BarChart3, MapPin, ListChecks, MessageSquare, Wallet, Calendar, Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, token } = useAuth();

  // Notifications state
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [recentNotifs, setRecentNotifs] = useState<any[]>([]);

  const RAW_BASE = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8888';
  const base = (RAW_BASE as string).replace(/\/+$/, '');
  const apiBase = base.endsWith('/api') ? base : `${base}/api`;
  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  }), [token]);

  const fetchUnread = async () => {
    // Avoid firing without a valid token to prevent 401/403
    if (!isAuthenticated || !token) return;
    try {
      const res = await fetch(`${apiBase}/notifications/unread-count`, { headers });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          // Likely an invalid/expired token or missing auth; user may need to re-login
          console.warn('Notifications unread-count request not authorized. Status:', res.status);
        }
        return;
      }
      const data = await res.json();
      setUnreadCount(data.unread || 0);
    } catch (_) {}
  };

  const fetchRecent = async () => {
    // Avoid firing without a valid token to prevent 401/403
    if (!isAuthenticated || !token) return;
    try {
      const res = await fetch(`${apiBase}/notifications/recent`, { headers });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          console.warn('Notifications recent request not authorized. Status:', res.status);
        }
        return;
      }
      const list = await res.json();
      setRecentNotifs(Array.isArray(list) ? list.slice(0, 8) : []);
    } catch (_) {}
  };

  const markRead = async (id: number) => {
    try {
      if (!isAuthenticated || !token) return;
      await fetch(`${apiBase}/notifications/${id}/read`, { method: 'PATCH', headers });
      await fetchUnread();
      await fetchRecent();
    } catch (_) {}
  };

  useEffect(() => {
    // Wait until both auth and token are available
    if (!isAuthenticated || !token) return;
    fetchUnread();
    fetchRecent();
    const iv = setInterval(fetchUnread, 30000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token]);

  // Role-based navigation items
  const getNavItems = () => {
    if (!isAuthenticated || !user) {
      return [
        { path: '/', label: 'Home', icon: Home },
        { path: '/properties', label: 'Properties', icon: Building },
      ];
    }

    switch (user.role) {
      case 'ADMIN':
        // Admin main nav is intentionally minimal
        return [
          { path: '/', label: 'Home', icon: Home },
          { path: '/dashboard/admin', label: 'Admin Dashboard', icon: Shield },
        ];
      case 'AGENT':
        return [
          { path: '/', label: 'Home', icon: Home },
          { path: '/properties', label: 'Properties', icon: Building },
          { path: '/dashboard/agent', label: 'Agent Dashboard', icon: Briefcase },
          { path: '/add-property', label: 'Add Property', icon: Plus },
        ];
      case 'USER':
      default:
        return [
          { path: '/', label: 'Home', icon: Home },
          { path: '/properties', label: 'Properties', icon: Building },
          { path: '/dashboard/client', label: 'My Dashboard', icon: User },
        ];
    }
  };

  const getUserNavItems = () => {
    if (!isAuthenticated || !user) return [];
    
    const baseUserItems = [
      { path: '/profile', label: 'Profile', icon: UserCircle },
    ];

    switch (user.role) {
      case 'ADMIN':
        return [
          ...baseUserItems,
          { path: '/admin/users', label: 'Manage Users', icon: Users },
          { path: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
          { path: '/admin/properties', label: 'Approvals', icon: ListChecks },
          { path: '/admin/locations', label: 'Locations', icon: MapPin },
          { path: '/admin/inquiries', label: 'All Inquiries', icon: MessageSquare },
          { path: '/inquiries/owner', label: 'Property Inquiries', icon: MessageSquare },
        ];
      case 'AGENT':
        return [
          ...baseUserItems,
          { path: '/favorites', label: 'Favorites', icon: Heart },
          { path: '/inquiries/owner', label: 'Property Inquiries', icon: MessageSquare },
        ];
      case 'USER':
      default:
        return [
          ...baseUserItems,
          { path: '/favorites', label: 'Favorites', icon: Heart },
          { path: '/inquiries', label: 'My Inquiries', icon: MessageSquare },
          { path: '/wallet', label: 'My Wallet', icon: Wallet },
          { path: '/bookings', label: 'My Bookings', icon: Calendar },
        ];
    }
  };

  const navItems = getNavItems();
  const userNavItems = getUserNavItems();

  const isActive = (path: string) => location.pathname === path;

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 bg-white shadow-lg"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <Building className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">RealEstate Hub</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors duration-200 ${
                    isActive(item.path)
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:text-primary-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
            
            {/* (desktop) role-agnostic nav items rendered above; user menu will hold profile/actions */}
          </div>

          {/* Search and User */}
          <div className="hidden md:flex items-center space-x-4">
            <button className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors duration-200">
              <Search className="w-5 h-5" />
            </button>
            {isAuthenticated && (
              <div className="relative">
                <button
                  onClick={async () => { setNotifOpen(v => !v); if (!notifOpen) { await fetchRecent(); } }}
                  className="relative p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 text-[10px] bg-red-600 text-white rounded-full px-1.5 py-0.5">{unreadCount > 9 ? '9+' : unreadCount}</span>
                  )}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-100 py-2 z-50">
                    <div className="px-4 py-2 text-sm font-semibold text-gray-700 border-b">Notifications</div>
                    {recentNotifs.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-gray-500">No notifications</div>
                    ) : (
                      <ul className="max-h-96 overflow-auto">
                        {recentNotifs.map((n: any) => (
                          <li key={n.id} className={`px-4 py-3 text-sm hover:bg-gray-50 cursor-pointer ${n.read ? 'text-gray-600' : 'text-gray-900'}`}
                              onClick={async () => { await markRead(n.id); setNotifOpen(false); if (n.link) navigate(n.link); }}>
                            <div className="font-medium">{n.title}</div>
                            {n.body && <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</div>}
                            <div className="mt-1 text-[11px] text-gray-400">{new Date(n.createdAt).toLocaleString()}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(v => !v)}
                  className="flex items-center space-x-2 bg-primary-600 text-white px-3 py-2 rounded-lg hover:bg-primary-700"
                >
                  {user?.role === 'ADMIN' && <Shield className="w-5 h-5" />}
                  {user?.role === 'AGENT' && <Briefcase className="w-5 h-5" />}
                  {user?.role === 'USER' && <User className="w-5 h-5" />}
                  <span className="text-sm font-medium">{user?.firstName} {user?.lastName}</span>
                  <span className="text-xs bg-white/20 px-2 py-1 rounded">
                    {user?.role === 'USER' ? 'CLIENT' : user?.role}
                  </span>
                </button>
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-100 py-2">
                    {userNavItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setIsUserMenuOpen(false)}
                          className={`flex items-center space-x-2 px-4 py-2 text-sm hover:bg-gray-50 ${isActive(item.path) ? 'text-primary-700' : 'text-gray-700'}`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                    <button
                      onClick={() => { setIsUserMenuOpen(false); logout(); navigate('/login'); }}
                      className="w-full text-left flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="text-sm font-medium">Login</span>
                </Link>
                <Link
                  to="/register"
                  className="flex items-center space-x-2 px-3 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg transition-colors duration-200"
                >
                  <User className="w-4 h-4" />
                  <span className="text-sm font-medium">Sign Up</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden border-t border-gray-200 py-4"
          >
            <div className="flex flex-col space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                      isActive(item.path)
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:text-primary-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
              
              {/* User Navigation Items in Mobile */}
              {isAuthenticated && userNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                      isActive(item.path)
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:text-primary-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
              {isAuthenticated ? (
                <>
                  <div className="flex items-center space-x-3 px-4 py-3 bg-primary-600 text-white rounded-lg mt-4">
                    {user?.role === 'ADMIN' && <Shield className="w-5 h-5" />}
                    {user?.role === 'AGENT' && <Briefcase className="w-5 h-5" />}
                    {user?.role === 'USER' && <User className="w-5 h-5" />}
                    <div className="flex flex-col">
                      <span className="font-medium">{user?.firstName} {user?.lastName}</span>
                      <span className="text-xs text-white/80">
                        {user?.role === 'USER' ? 'CLIENT' : user?.role}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setIsMenuOpen(false);
                      navigate('/login');
                    }}
                    className="flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 mt-2"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Logout</span>
                  </button>
                </>
              ) : (
                <div className="flex flex-col space-y-2 mt-4">
                  <Link
                    to="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center space-x-3 px-4 py-3 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                  >
                    <LogIn className="w-5 h-5" />
                    <span className="font-medium">Login</span>
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center space-x-3 px-4 py-3 bg-primary-600 text-white hover:bg-primary-700 rounded-lg transition-colors duration-200"
                  >
                    <User className="w-5 h-5" />
                    <span className="font-medium">Sign Up</span>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
};

export default Navbar;
