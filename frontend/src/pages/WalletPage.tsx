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
  const { token, isAuthenticated } = useAuth();
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

  const RZP_KEY_ID = (import.meta as any).env.VITE_RAZORPAY_KEY_ID as string | undefined;
  const [showDiag, setShowDiag] = useState(false);
  const [diagMsg, setDiagMsg] = useState<string>('');

  // Dynamically load Razorpay script
  const loadRazorpay = () => new Promise<boolean>((resolve) => {
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  const loadWallet = async () => {
    try {
      setLoading(true);
      if (!token) throw new Error('Not authenticated');
      const res = await fetch(`${apiBase}/wallet`, { headers });
      if (!res.ok) throw new Error(`Failed to load wallet (${res.status})`);
      setWallet(await res.json());
    } catch (e: any) {
      console.error('Failed to load wallet:', e);
      if (String(e.message).includes('(401)') || String(e.message).includes('(403)') || e.message === 'Not authenticated') {
        setWallet(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      if (!token) throw new Error('Not authenticated');
      const res = await fetch(`${apiBase}/wallet/transactions`, { headers });
      if (!res.ok) throw new Error(`Failed to load transactions (${res.status})`);
      setTransactions(await res.json());
    } catch (e: any) {
      console.error('Failed to load transactions:', e);
      if (String(e.message).includes('(401)') || String(e.message).includes('(403)') || e.message === 'Not authenticated') {
        setTransactions([]);
      }
    }
  };

  const addMoney = async () => {
    if (!addAmount || parseFloat(addAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    try {
      setBusy(true);
      // Load Razorpay SDK
      const ok = await loadRazorpay();
      if (!ok) throw new Error('Razorpay SDK failed to load');

      // Create server-side order
      const createOrder = await fetch(`${apiBase}/wallet/pay/order`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ amount: Math.round(parseFloat(addAmount)), description: addDescription || 'Wallet top-up' })
      });
      if (!createOrder.ok) throw new Error(await createOrder.text());
      const orderData = await createOrder.json();

      const amountInPaise = orderData.amount as number; // from server
      const options: any = {
        key: orderData.keyId || RZP_KEY_ID,
        amount: amountInPaise,
        currency: 'INR',
        name: 'RealEstate Hub',
        description: addDescription || 'Add money to wallet',
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            // Verify with server (signature verification + wallet credit)
            const verify = await fetch(`${apiBase}/wallet/pay/verify`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                amount: Math.round(parseFloat(addAmount)),
                description: addDescription || 'Wallet top-up via Razorpay',
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              })
            });
            if (!verify.ok) throw new Error(await verify.text());
            setAddAmount('');
            setAddDescription('');
            await loadWallet();
            await loadTransactions();
            alert('Payment successful and verified. Wallet updated.');
          } catch (err: any) {
            alert(err?.message || 'Payment captured but verification failed');
          }
        },
        modal: {
          ondismiss: () => {
            setBusy(false);
          }
        },
        prefill: {
          name: 'Test User',
          email: 'test@example.com',
          contact: '9999999999',
        },
        notes: { purpose: 'Wallet top-up' },
        theme: { color: '#2563eb' },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (e: any) {
      alert(e.message || 'Failed to initiate payment');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadWallet();
      loadTransactions();
    }
    /* eslint-disable-next-line */
  }, [token]);

  const testServerOrder = async () => {
    try {
      setDiagMsg('');
      const res = await fetch(`${apiBase}/wallet/pay/order`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ amount: 1, description: 'diag' })
      });
      const text = await res.text();
      if (!res.ok) {
        setDiagMsg(`Server responded ${res.status}: ${text}`);
      } else {
        setDiagMsg(`OK ${res.status}: ${text}`);
      }
    } catch (e: any) {
      setDiagMsg(e?.message || 'Failed to call /wallet/pay/order');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Wallet className="w-7 h-7 mr-2 text-primary-600"/> My Wallet
          </h1>
          <p className="text-gray-600 mt-1">Manage your wallet balance and view transaction history.</p>
        </div>

        {!isAuthenticated ? (
          <div className="py-20 text-center text-gray-500">
            Please log in to view your wallet.
          </div>
        ) : loading ? (
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
              <div className="mt-2 flex gap-2 text-sm">
                <button type="button" className="px-2 py-1 bg-gray-100 rounded" onClick={() => setAddAmount('100')}>₹100</button>
                <button type="button" className="px-2 py-1 bg-gray-100 rounded" onClick={() => setAddAmount('500')}>₹500</button>
                <button type="button" className="px-2 py-1 bg-gray-100 rounded" onClick={() => setAddAmount('1000')}>₹1,000</button>
              </div>
              <div className="mt-4">
                <button
                  onClick={addMoney}
                  disabled={busy}
                  className="btn-primary disabled:opacity-50"
                >
                  {busy ? 'Adding...' : 'Add Money'}
                </button>
                <div className="text-xs text-gray-500 mt-2">
                  Use Razorpay test cards/UPI. Example card: 4111 1111 1111 1111 • Any future expiry • Any CVV • Name: Test.
                </div>
                <div className="mt-4">
                  <button type="button" onClick={() => setShowDiag(!showDiag)} className="text-xs text-gray-500 underline">
                    {showDiag ? 'Hide diagnostics' : 'Show diagnostics'}
                  </button>
                  {showDiag && (
                    <div className="mt-2 p-3 bg-gray-50 border rounded text-xs text-gray-700 space-y-2">
                      <div><strong>Frontend key present:</strong> {RZP_KEY_ID ? 'Yes' : 'No'}</div>
                      <div><strong>API Base:</strong> {apiBase}</div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={testServerOrder} className="px-2 py-1 bg-gray-100 rounded">Ping /wallet/pay/order</button>
                        <span className="text-[11px] text-gray-500">(amount: 1)</span>
                      </div>
                      {diagMsg && (
                        <pre className="whitespace-pre-wrap break-words bg-white border rounded p-2 max-h-48 overflow-auto">{diagMsg}</pre>
                      )}
                    </div>
                  )}
                </div>
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
