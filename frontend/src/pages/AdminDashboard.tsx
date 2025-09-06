import React from 'react';
import { Shield, Users, Home, Map } from 'lucide-react';

const AdminDashboard: React.FC = () => {
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
            <button className="btn-primary">Manage Users</button>
          </div>

          <div className="bg-white rounded-xl shadow-card p-6">
            <Home className="w-8 h-8 text-primary-600 mb-3" />
            <h3 className="text-lg font-semibold mb-1">Properties</h3>
            <p className="text-gray-600 mb-3">Moderate listings, approve agents, and review reports.</p>
            <button className="btn-primary">View Properties</button>
          </div>

          <div className="bg-white rounded-xl shadow-card p-6">
            <Map className="w-8 h-8 text-primary-600 mb-3" />
            <h3 className="text-lg font-semibold mb-1">Reports & Analytics</h3>
            <p className="text-gray-600 mb-3">Platform KPIs, growth stats, and activity heatmaps.</p>
            <button className="btn-primary">Open Reports</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
