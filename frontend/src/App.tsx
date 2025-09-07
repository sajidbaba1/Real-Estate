import { Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import PropertiesPage from './pages/PropertiesPage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import AddPropertyPage from './pages/AddPropertyPage';
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
        </motion.main>
      </div>
    </AuthProvider>
  );
}

export default App;
