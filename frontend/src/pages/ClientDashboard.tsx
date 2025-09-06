import React from 'react';
import { Heart, Home, Map, Search } from 'lucide-react';

const ClientDashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Home className="w-7 h-7 mr-2 text-primary-600" /> Client Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Browse properties, manage favorites, and explore the map.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-card p-6">
            <Search className="w-8 h-8 text-primary-600 mb-3" />
            <h3 className="text-lg font-semibold mb-1">Search Properties</h3>
            <p className="text-gray-600 mb-3">Use powerful search and filters to find your dream home.</p>
            <a href="/properties" className="btn-primary">Browse Properties</a>
          </div>

          <div className="bg-white rounded-xl shadow-card p-6">
            <Heart className="w-8 h-8 text-primary-600 mb-3" />
            <h3 className="text-lg font-semibold mb-1">Favorites</h3>
            <p className="text-gray-600 mb-3">Review and manage the properties you love.</p>
            <a href="/favorites" className="btn-primary">View Favorites</a>
          </div>

          <div className="bg-white rounded-xl shadow-card p-6">
            <Map className="w-8 h-8 text-primary-600 mb-3" />
            <h3 className="text-lg font-semibold mb-1">Explore Map</h3>
            <p className="text-gray-600 mb-3">See listings on the interactive Google Map.</p>
            <a href="/properties" className="btn-primary">Open Map</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;
