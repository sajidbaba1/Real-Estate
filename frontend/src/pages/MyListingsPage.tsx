import React, { useEffect, useState } from 'react';
import { Trash2, Loader2, Home, BedSingle, Pencil, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { propertyApi } from '../services/api';

interface Property {
  id: number;
  title: string;
  description: string;
  price: number;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  propertyType: string;
  status: string;
  imageUrl?: string;
  isPgListing?: boolean;
  owner?: { id: number } | null;
}

const MyListingsPage: React.FC = () => {
  const { token, user } = useAuth();
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const RAW_BASE = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8080';
  const base = (RAW_BASE as string).replace(/\/+$/, '');
  const apiBase = base.endsWith('/api') ? base : `${base}/api`;

  const fetchMyListings = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${apiBase}/properties/my`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      if (!res.ok) throw new Error(`Failed to load listings (${res.status})`);
      const data = await res.json();
      setItems(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this property?')) return;
    try {
      setDeletingId(id);
      const res = await fetch(`${apiBase}/properties/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      if (res.status === 204) {
        setItems(prev => prev.filter(p => p.id !== id));
      } else if (res.status === 403) {
        alert('You do not have permission to delete this property.');
      } else {
        alert('Delete failed.');
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Home className="w-7 h-7 mr-2 text-primary-600" /> My Listings
          </h1>
          <p className="text-gray-600 mt-1">View and manage properties you own.</p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20 text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading your listings...
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="text-center text-gray-600 py-20">
            You have no listings yet.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((p) => (
            <div key={p.id} className="bg-white rounded-xl shadow-card overflow-hidden flex flex-col">
              {p.imageUrl ? (
                <img src={p.imageUrl} alt={p.title} className="h-44 w-full object-cover" />
              ) : (
                <div className="h-44 w-full bg-gray-100 flex items-center justify-center text-gray-400">
                  No Image
                </div>
              )}
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="text-lg font-semibold text-gray-900">{p.title}</h3>
                <p className="text-primary-600 font-bold mt-1">${Number(p.price).toLocaleString()}</p>
                <p className="text-sm text-gray-600 mt-1">{p.address}, {p.city}, {p.state} {p.zipCode}</p>
                <div className="text-xs text-gray-500 mt-2">{p.bedrooms} bd • {p.bathrooms} ba • {p.squareFeet} sqft</div>
                <div className="mt-3 text-xs text-gray-500">Type: {p.propertyType} • Status: {p.status}</div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <a href={`/properties/${p.id}`} className="text-primary-600 hover:text-primary-800 font-medium">View</a>
                    {(user?.role === 'ADMIN' || user?.role === 'AGENT') && (
                      <a
                        href={`/edit-property/${p.id}`}
                        className="inline-flex items-center text-gray-700 hover:text-gray-900"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4 mr-1" /> Edit
                      </a>
                    )}
                    {(user?.role === 'ADMIN' || user?.role === 'AGENT') && !p.owner && (
                      <button
                        onClick={async () => {
                          try {
                            await propertyApi.claimOwnership(p.id);
                            await fetchMyListings();
                            alert('Ownership claimed. You can now edit this property.');
                          } catch (e) {
                            alert('Failed to claim ownership');
                          }
                        }}
                        className="inline-flex items-center text-blue-600 hover:text-blue-800"
                      >
                        <UserPlus className="w-4 h-4 mr-1" /> Claim
                      </button>
                    )}
                  </div>
                </div>
                {(user?.role === 'ADMIN' || user?.role === 'AGENT') && p.isPgListing && (
                  <div className="mt-3">
                    <a href={`/properties/${p.id}/manage-pg`} className="inline-flex items-center px-3 py-2 rounded bg-primary-600 text-white hover:bg-primary-700">
                      <BedSingle className="w-4 h-4 mr-2" /> Manage PG
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MyListingsPage;
