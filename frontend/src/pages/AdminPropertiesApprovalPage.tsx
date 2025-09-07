import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, ListChecks } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export type Property = {
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
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  imageUrl?: string;
  createdAt: string;
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }>
  = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium border ${active ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
    >
      {children}
    </button>
);

const AdminPropertiesApprovalPage: React.FC = () => {
  const { token } = useAuth();
  const RAW_BASE = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8080';
  const base = (RAW_BASE as string).replace(/\/+$/, '');
  const apiBase = base.endsWith('/api') ? base : `${base}/api`;

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  const [activeTab, setActiveTab] = useState<'PENDING'|'APPROVED'|'REJECTED'>('PENDING');
  const [data, setData] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [busyId, setBusyId] = useState<number|null>(null);

  const load = async (tab: 'PENDING'|'APPROVED'|'REJECTED') => {
    try {
      setLoading(true);
      setError(null);
      const path = tab === 'PENDING' ? 'pending' : (tab === 'APPROVED' ? 'approved' : 'rejected');
      const res = await fetch(`${apiBase}/properties/approval/${path}`, { headers });
      if (!res.ok) throw new Error(`Failed to load ${tab.toLowerCase()} properties (${res.status})`);
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(activeTab); /* eslint-disable-next-line */ }, [activeTab]);

  const act = async (id: number, action: 'approve'|'reject') => {
    try {
      setBusyId(id);
      const res = await fetch(`${apiBase}/properties/${id}/${action}`, { method: 'PATCH', headers });
      if (!res.ok) throw new Error(`${action} failed (${res.status})`);
      await load(activeTab);
    } catch (e: any) {
      alert(e.message || `${action} failed`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <ListChecks className="w-7 h-7 mr-2 text-primary-600" /> Property Approvals
            </h1>
            <p className="text-gray-600 mt-1">Review and manage property approvals.</p>
          </div>
          <div className="flex gap-2">
            <TabButton active={activeTab==='PENDING'} onClick={()=>setActiveTab('PENDING')}>Pending</TabButton>
            <TabButton active={activeTab==='APPROVED'} onClick={()=>setActiveTab('APPROVED')}>Approved</TabButton>
            <TabButton active={activeTab==='REJECTED'} onClick={()=>setActiveTab('REJECTED')}>Rejected</TabButton>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>}

        <div className="bg-white rounded-xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      <Loader2 className="w-5 h-5 inline animate-spin mr-2" /> Loading...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No {activeTab.toLowerCase()} properties</td>
                  </tr>
                ) : data.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{p.title}</div>
                      <div className="text-xs text-gray-500 truncate max-w-md">{p.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{p.city}, {p.state}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{p.propertyType}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">₹{Number(p.price || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${p.approvalStatus==='APPROVED' ? 'bg-green-100 text-green-700' : p.approvalStatus==='REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {p.approvalStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      {activeTab === 'PENDING' && (
                        <>
                          <button
                            disabled={busyId===p.id}
                            onClick={() => act(p.id, 'approve')}
                            className="inline-flex items-center px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                          </button>
                          <button
                            disabled={busyId===p.id}
                            onClick={() => act(p.id, 'reject')}
                            className="inline-flex items-center px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4 mr-1" /> Reject
                          </button>
                        </>
                      )}
                      {activeTab === 'REJECTED' && (
                        <button
                          disabled={busyId===p.id}
                          onClick={() => act(p.id, 'approve')}
                          className="inline-flex items-center px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPropertiesApprovalPage;
