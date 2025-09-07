import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Wallet, Plus, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

type WalletInfo = {
  id: number;
  balance: number;
  userId: number;
};

type Transaction = {
  id: number;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  description: string;
  referenceId?: string;
  createdAt: string;
};

const WalletPage: React.FC = () => {
  const { token } = useAuth();
  const RAW_BASE = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8080';
  const base = (RAW_BASE as string).replace(/\/+$/, '');
  const apiBase = base.endsWith('/api') ? base : `${base}/api`;

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [addAmount, setAddAmount] = useState('');
  const [addDescription, setAddDescription] = useState('');
  const [busy, setBusy] = useState(false);

  const loadWallet = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/wallet`, { headers });
      if (!res.ok) throw new Error(`Failed to load wallet (${res.status})`);
      setWallet(await res.json());
    } catch (e: any) {
      console.error('Failed to load wallet:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const res = await fetch(`${apiBase}/wallet/transactions`, { headers });
      if (!res.ok) throw new Error(`Failed to load transactions (${res.status})`);
      setTransactions(await res.json());
    } catch (e: any) {
      console.error('Failed to load transactions:', e);
    }
  };

  const addMoney = async () => {
    if (!addAmount || parseFloat(addAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    try {
      setBusy(true);
      const res = await fetch(`${apiBase}/wallet/add`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          amount: parseFloat(addAmount),
          description: addDescription || 'Money added to wallet'
        })
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to add money');
      }
      setAddAmount('');
      setAddDescription('');
      await loadWallet();
      await loadTransactions();
    } catch (e: any) {
      alert(e.message || 'Failed to add money');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    loadWallet();
    loadTransactions();
    /* eslint-disable-next-line */
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Wallet className="w-7 h-7 mr-2 text-primary-600"/> My Wallet
          </h1>
          <p className="text-gray-600 mt-1">Manage your wallet balance and view transaction history.</p>
        </div>

        {loading ? (
          <div className="py-20 text-center text-gray-500">
            <Loader2 className="w-5 h-5 inline animate-spin mr-2"/>Loading...
          </div>
        ) : (
          <>
            {/* Wallet Balance Card */}
            <div className="bg-white rounded-xl shadow-card p-6 mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Current Balance</h2>
                  <div className="text-3xl font-bold text-primary-600 mt-2">
                    ₹{wallet?.balance?.toLocaleString() || '0'}
                  </div>
                </div>
                <div className="bg-primary-100 p-4 rounded-full">
                  <Wallet className="w-8 h-8 text-primary-600"/>
                </div>
              </div>
            </div>

            {/* Add Money Form */}
            <div className="bg-white rounded-xl shadow-card p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Plus className="w-5 h-5 mr-2 text-green-600"/> Add Money
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  className="input-field"
                  placeholder="Amount (₹)"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  type="number"
                  min="1"
                />
                <input
                  className="input-field md:col-span-2"
                  placeholder="Description (optional)"
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value)}
                />
              </div>
              <div className="mt-4">
                <button
                  onClick={addMoney}
                  disabled={busy}
                  className="btn-primary disabled:opacity-50"
                >
                  {busy ? 'Adding...' : 'Add Money'}
                </button>
              </div>
            </div>

            {/* Transaction History */}
            <div className="bg-white rounded-xl shadow-card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction History</h3>
              {transactions.length === 0 ? (
                <div className="text-center text-gray-500 py-8">No transactions yet.</div>
              ) : (
                <div className="space-y-3">
                  {transactions.map(txn => (
                    <div key={txn.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center">
                        {txn.type === 'CREDIT' ? (
                          <ArrowUpCircle className="w-5 h-5 text-green-600 mr-3"/>
                        ) : (
                          <ArrowDownCircle className="w-5 h-5 text-red-600 mr-3"/>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{txn.description}</div>
                          <div className="text-sm text-gray-500">
                            {new Date(txn.createdAt).toLocaleString()}
                            {txn.referenceId && ` • Ref: ${txn.referenceId}`}
                          </div>
                        </div>
                      </div>
                      <div className={`font-semibold ${txn.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                        {txn.type === 'CREDIT' ? '+' : '-'}₹{txn.amount.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WalletPage;
