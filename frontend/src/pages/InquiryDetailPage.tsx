import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Send, CheckCircle2, XCircle } from 'lucide-react';

type Negotiation = {
  id: number;
  offeredBy: 'CUSTOMER' | 'OWNER';
  amount?: number;
  message?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
};

type Inquiry = {
  id: number;
  property: { id: number; title: string };
  customer: { id: number };
  owner: { id: number };
  status: 'ACTIVE' | 'CANCELLED' | 'CLOSED';
  dealStatus: 'PENDING' | 'ACCEPTED' | 'BOOKED';
  createdAt: string;
  negotiations: Negotiation[];
};

const InquiryDetailPage: React.FC = () => {
  const { id } = useParams();
  const inquiryId = Number(id);
  const { token, user } = useAuth();

  const RAW_BASE = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8080';
  const base = (RAW_BASE as string).replace(/\/+$/, '');
  const apiBase = base.endsWith('/api') ? base : `${base}/api`;

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [inq, setInq] = useState<Inquiry | null>(null);
  const [offer, setOffer] = useState({ amount: '', message: '' });
  const [busy, setBusy] = useState<string|null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${apiBase}/sales/inquiries/${inquiryId}`, { headers });
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      setInq(await res.json());
    } catch (e: any) { setError(e.message || 'Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (inquiryId) load(); /* eslint-disable-next-line */ }, [inquiryId]);

  const isCustomer = user?.role === 'USER' || (!!user && inq && user.id === (inq.customer as any)?.id);
  const isOwner = user?.role === 'ADMIN' || user?.role === 'AGENT' || (!!user && inq && user.id === (inq.owner as any)?.id);

  const sendOffer = async () => {
    if (!inq) return;
    try {
      setBusy('offer');
      const res = await fetch(`${apiBase}/sales/inquiries/${inq.id}/offer/customer`, {
        method: 'POST', headers, body: JSON.stringify({ amount: offer.amount ? Number(offer.amount) : null, message: offer.message })
      });
      if (!res.ok) throw new Error('Failed to send offer');
      setOffer({ amount: '', message: '' });
      await load();
    } catch (e: any) { alert(e.message || 'Failed to send offer'); }
    finally { setBusy(null); }
  };

  const ownerAction = async (action: 'accept'|'reject') => {
    if (!inq) return;
    try {
      setBusy(action);
      const res = await fetch(`${apiBase}/sales/inquiries/${inq.id}/owner/${action}`, {
        method: 'POST', headers, body: JSON.stringify({ amount: offer.amount ? Number(offer.amount) : null, message: offer.message })
      });
      if (!res.ok) throw new Error(`${action} failed`);
      setOffer({ amount: '', message: '' });
      await load();
    } catch (e: any) { alert(e.message || `${action} failed`); }
    finally { setBusy(null); }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Inquiry #{inquiryId}</h1>
        {loading && <div className="text-center text-gray-500 py-16"><Loader2 className="w-5 h-5 inline animate-spin mr-2"/>Loading...</div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>}
        {inq && (
          <div className="bg-white rounded-xl shadow-card p-4">
            <div className="mb-4">
              <div className="font-semibold text-gray-900">{inq.property?.title || `Property #${inq.property?.id}`}</div>
              <div className="text-sm text-gray-600">Status: {inq.status} • Deal: {inq.dealStatus}</div>
            </div>

            <div className="space-y-3 mb-6">
              {inq.negotiations?.map(n => (
                <div key={n.id} className="border rounded-lg p-3">
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">{n.offeredBy}:</span> {n.message || '—'}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                    {typeof n.amount === 'number' && <span>₹{Number(n.amount).toLocaleString()}</span>}
                    <span className="px-2 py-0.5 rounded bg-gray-100">{n.status}</span>
                    <span>{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input className="input-field" placeholder="Amount (optional)" value={offer.amount} onChange={e=>setOffer(o=>({ ...o, amount: e.target.value }))} />
                <input className="input-field md:col-span-2" placeholder="Message (optional)" value={offer.message} onChange={e=>setOffer(o=>({ ...o, message: e.target.value }))} />
              </div>
              <div className="mt-3 flex items-center gap-2">
                {isCustomer && (
                  <button disabled={busy==='offer'} onClick={sendOffer} className="inline-flex items-center px-3 py-1.5 rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50">
                    <Send className="w-4 h-4 mr-1"/> Send Offer
                  </button>
                )}
                {isOwner && (
                  <>
                    <button disabled={busy==='accept'} onClick={()=>ownerAction('accept')} className="inline-flex items-center px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
                      <CheckCircle2 className="w-4 h-4 mr-1"/> Accept
                    </button>
                    <button disabled={busy==='reject'} onClick={()=>ownerAction('reject')} className="inline-flex items-center px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                      <XCircle className="w-4 h-4 mr-1"/> Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InquiryDetailPage;
