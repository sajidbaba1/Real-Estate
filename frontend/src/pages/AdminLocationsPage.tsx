import React, { useEffect, useMemo, useState } from 'react';
import { MapPin, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type Location = {
  id: number;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

const AdminLocationsPage: React.FC = () => {
  const { token } = useAuth();
  const RAW_BASE = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8080';
  const base = (RAW_BASE as string).replace(/\/+$/, '');
  const apiBase = base.endsWith('/api') ? base : `${base}/api`;

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<Location[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
  });

  const fetchLocations = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${apiBase}/locations`, { headers });
      if (!res.ok) throw new Error(`Failed to load locations (${res.status})`);
      const data = await res.json();
      setLocations(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => setForm({ name: '', description: '' });

  const openEdit = (location: Location) => {
    setEditing(location);
    setForm({ name: location.name, description: location.description });
  };

  const createLocation = async () => {
    try {
      setBusyId(-1);
      const res = await fetch(`${apiBase}/locations`, {
        method: 'POST',
        headers,
        body: JSON.stringify(form),
      });
      if (res.status === 201) {
        setShowAdd(false);
        resetForm();
        fetchLocations();
      } else if (res.status === 409) {
        const errorText = await res.text();
        alert(errorText || 'Location already exists');
      } else {
        alert('Create location failed');
      }
    } finally {
      setBusyId(null);
    }
  };

  const updateLocation = async () => {
    if (!editing) return;
    try {
      setBusyId(editing.id);
      const res = await fetch(`${apiBase}/locations/${editing.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setEditing(null);
        resetForm();
        fetchLocations();
      } else if (res.status === 409) {
        const errorText = await res.text();
        alert(errorText || 'Location name already exists');
      } else {
        alert('Update failed');
      }
    } finally {
      setBusyId(null);
    }
  };

  const deleteLocation = async (location: Location) => {
    if (!confirm(`Delete location "${location.name}"? This will also delete all properties in this location.`)) return;
    try {
      setBusyId(location.id);
      const res = await fetch(`${apiBase}/locations/${location.id}`, { method: 'DELETE', headers });
      if (res.status === 204) fetchLocations();
      else alert('Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <MapPin className="w-7 h-7 mr-2 text-primary-600" /> Location Management
            </h1>
            <p className="text-gray-600 mt-1">Manage locations where properties can be listed.</p>
          </div>
          <button onClick={() => { resetForm(); setShowAdd(true); }} className="btn-primary flex items-center">
            <Plus className="w-4 h-4 mr-2" />
            Add Location
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>
        )}

        <div className="bg-white rounded-xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500"><Loader2 className="w-5 h-5 inline animate-spin mr-2" /> Loading locations...</td></tr>
                ) : locations.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-6 text-center text-gray-500">No locations found</td></tr>
                ) : locations.map((location) => (
                  <tr key={location.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{location.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700 max-w-xs truncate">{location.description || 'No description'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{new Date(location.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <button
                        onClick={() => openEdit(location)}
                        disabled={busyId === location.id}
                        className="text-primary-600 hover:text-primary-900 inline-flex items-center disabled:opacity-50"
                      >
                        <Pencil className="w-4 h-4 mr-1" /> Edit
                      </button>
                      <button 
                        onClick={() => deleteLocation(location)} 
                        disabled={busyId === location.id} 
                        className="text-red-600 hover:text-red-900 inline-flex items-center disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Modal */}
        {showAdd && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Add Location</h3>
              <div className="space-y-4">
                <input 
                  value={form.name} 
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
                  className="input-field w-full" 
                  placeholder="Location name (e.g., Mumbai, Delhi)" 
                />
                <textarea 
                  value={form.description} 
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} 
                  className="input-field w-full h-24 resize-none" 
                  placeholder="Description (optional)" 
                />
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg border">Cancel</button>
                <button 
                  onClick={createLocation} 
                  disabled={busyId === -1 || !form.name.trim()} 
                  className="btn-primary disabled:opacity-50"
                >
                  {busyId === -1 ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editing && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Edit Location</h3>
              <div className="space-y-4">
                <input 
                  value={form.name} 
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
                  className="input-field w-full" 
                  placeholder="Location name" 
                />
                <textarea 
                  value={form.description} 
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} 
                  className="input-field w-full h-24 resize-none" 
                  placeholder="Description (optional)" 
                />
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg border">Cancel</button>
                <button 
                  onClick={updateLocation} 
                  disabled={busyId === editing.id || !form.name.trim()} 
                  className="btn-primary disabled:opacity-50"
                >
                  {busyId === editing.id ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLocationsPage;
