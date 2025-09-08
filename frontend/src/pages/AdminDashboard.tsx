import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, Home, Map, BarChart2 } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Shield className="w-7 h-7 mr-2 text-primary-600" /> Admin Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Manage users, properties, and platform settings.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-card p-6">
            <Users className="w-8 h-8 text-primary-600 mb-3" />
            <h3 className="text-lg font-semibold mb-1">Users</h3>
            <p className="text-gray-600 mb-3">Create, edit, or deactivate users and assign roles.</p>
            <button className="btn-primary" onClick={() => navigate('/admin/users')}>Manage Users</button>
          </div>

          <div className="bg-white rounded-xl shadow-card p-6">
            <Home className="w-8 h-8 text-primary-600 mb-3" />
            <h3 className="text-lg font-semibold mb-1">Properties</h3>
            <p className="text-gray-600 mb-3">Browse all public listings and manage approvals.</p>
            <div className="flex gap-2 flex-wrap">
              <button className="btn-primary" onClick={() => navigate('/properties')}>View All Properties</button>
              <button className="btn-secondary border px-4 py-2 rounded-lg" onClick={() => navigate('/admin/properties')}>Manage Approvals</button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-card p-6">
            <BarChart2 className="w-8 h-8 text-primary-600 mb-3" />
            <h3 className="text-lg font-semibold mb-1">Reports & Analytics</h3>
            <p className="text-gray-600 mb-3">Platform KPIs, growth stats, and activity heatmaps.</p>
            <button className="btn-primary" onClick={() => navigate('/admin/analytics')}>Open Reports</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
