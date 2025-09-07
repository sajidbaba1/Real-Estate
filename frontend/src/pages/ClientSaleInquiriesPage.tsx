import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, MessageSquare } from 'lucide-react';

type Inquiry = {
  id: number;
  property: { id: number; title: string };
  owner: { id: number };
  status: 'ACTIVE' | 'CANCELLED' | 'CLOSED';
  dealStatus: 'PENDING' | 'ACCEPTED' | 'BOOKED';
  createdAt: string;
};

const ClientSaleInquiriesPage: React.FC = () => {
  const { token } = useAuth();
  const RAW_BASE = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8080';
  const base = (RAW_BASE as string).replace(/\/+$/, '');
  const apiBase = base.endsWith('/api') ? base : `${base}/api`;

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [items, setItems] = useState<Inquiry[]>([]);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${apiBase}/sales/inquiries/my`, { headers });
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      setItems(await res.json());
    } catch (e: any) { setError(e.message || 'Failed to load'); }
    finally { setLoading(false); }
  };

  const cancel = async (id: number) => {
    if (!confirm('Cancel this inquiry?')) return;
    try {
      const res = await fetch(`${apiBase}/sales/inquiries/${id}/cancel`, { method: 'PATCH', headers });
      if (!res.ok) throw new Error('Cancel failed');
      await load();
    } catch (e: any) { alert(e.message || 'Cancel failed'); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <MessageSquare className="w-7 h-7 mr-2 text-primary-600"/> My Sale Inquiries
          </h1>
          <p className="text-gray-600 mt-1">Track and manage your purchase negotiations.</p>
        </div>

        {loading && <div className="py-20 text-center text-gray-500"><Loader2 className="w-5 h-5 inline animate-spin mr-2"/>Loading...</div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>}

        {!loading && items.length === 0 && (
          <div className="text-center text-gray-500 py-12">No sale inquiries yet.</div>
        )}

        <div className="space-y-3">
          {items.map(i => (
            <div key={i.id} className="bg-white rounded-xl shadow-card p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-900">{i.property?.title || 'Property #' + i.property?.id}</div>
                <div className="text-sm text-gray-600">Status: {i.status} • Deal: {i.dealStatus}</div>
                <div className="text-xs text-gray-500">Created {new Date(i.createdAt).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <a href={`/sales/inquiries/${i.id}`} className="px-3 py-1.5 rounded bg-primary-600 text-white hover:bg-primary-700 text-sm">View</a>
                {i.status === 'ACTIVE' && (
                  <button onClick={()=>cancel(i.id)} className="px-3 py-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100 text-sm">Cancel</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ClientSaleInquiriesPage;
