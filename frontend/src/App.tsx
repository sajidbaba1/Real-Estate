import { Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import AdminRagChatbot from './components/AdminRagChatbot';
import EnhancedPropertyAssistant from './components/EnhancedPropertyAssistant';
import HomePage from './pages/HomePage';
import PropertiesPage from './pages/PropertiesPage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import AddPropertyPage from './pages/AddPropertyPage';
import EditPropertyPage from './pages/EditPropertyPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import FavoritesPage from './pages/FavoritesPage';
import AdminDashboard from './pages/AdminDashboard';
import AgentDashboard from './pages/AgentDashboard';
import ClientDashboard from './pages/ClientDashboard';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminAnalyticsPage from './pages/AdminAnalyticsPage';
import AdminLocationsPage from './pages/AdminLocationsPage';
import AdminPropertiesApprovalPage from './pages/AdminPropertiesApprovalPage';
import ProtectedRoute from './components/ProtectedRoute';
import MyListingsPage from './pages/MyListingsPage';
import ManagePgPage from './pages/ManagePgPage';
import MyInquiriesPage from './pages/MyInquiriesPage';
import OwnerInquiriesPage from './pages/OwnerInquiriesPage';
import AdminInquiriesPage from './pages/AdminInquiriesPage';
import InquiryDetailPage from './pages/InquiryDetailPage';
import WalletPage from './pages/WalletPage';
import MyBookingsPage from './pages/MyBookingsPage';
import ChatbotWidget from './components/ChatbotWidget';

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="pt-16"
        >
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/properties" element={<PropertiesPage />} />
            <Route path="/properties/:id" element={<PropertyDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            {/* Protected Routes - Require Authentication */}
            <Route path="/add-property" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'AGENT']}>
                <AddPropertyPage />
              </ProtectedRoute>
            } />
            <Route path="/edit-property/:id" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'AGENT']}>
                <EditPropertyPage />
              </ProtectedRoute>
            } />
            <Route path="/my-listings" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'AGENT']}>
                <MyListingsPage />
              </ProtectedRoute>
            } />
            <Route path="/properties/:id/manage-pg" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'AGENT']}>
                <ManagePgPage />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } />
            <Route path="/favorites" element={
              <ProtectedRoute>
                <FavoritesPage />
              </ProtectedRoute>
            } />

            {/* Property Inquiries */}
            <Route path="/inquiries" element={
              <ProtectedRoute>
                <MyInquiriesPage />
              </ProtectedRoute>
            } />
            <Route path="/inquiries/owner" element={
              <ProtectedRoute allowedRoles={['ADMIN','AGENT']}>
                <OwnerInquiriesPage />
              </ProtectedRoute>
            } />
            <Route path="/inquiries/:id" element={
              <ProtectedRoute>
                <InquiryDetailPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/inquiries" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminInquiriesPage />
              </ProtectedRoute>
            } />

            {/* Wallet and Bookings */}
            <Route path="/wallet" element={
              <ProtectedRoute>
                <WalletPage />
              </ProtectedRoute>
            } />
            <Route path="/bookings" element={
              <ProtectedRoute>
                <MyBookingsPage />
              </ProtectedRoute>
            } />
            
            {/* Role-Specific Dashboards */}
            <Route path="/dashboard/admin" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/agent" element={
              <ProtectedRoute allowedRoles={['AGENT']}>
                <AgentDashboard />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/client" element={
              <ProtectedRoute allowedRoles={['USER']}>
                <ClientDashboard />
              </ProtectedRoute>
            } />
            
            {/* Admin-Only Routes */}
            <Route path="/admin/users" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminUsersPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/analytics" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminAnalyticsPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/locations" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminLocationsPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/properties" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminPropertiesApprovalPage />
              </ProtectedRoute>
            } />
          </Routes>
          <ChatbotWidget />
          <AdminRagChatbot />
          <EnhancedPropertyAssistant />
        </motion.main>
      </div>
    </AuthProvider>
  );
}

export default App;
