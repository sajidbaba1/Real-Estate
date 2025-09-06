import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, TrendingUp, Users, Building, Eye, Heart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type DashboardStats = {
  users: { total: number; admins: number; agents: number; clients: number };
  properties: { total: number; forSale: number; forRent: number; sold: number; rented: number };
  pricing: { average: number; minimum: number; maximum: number };
};

const formatNumber = (n: number | undefined) => {
  if (n === undefined || n === null) return '-';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
};

const TinyBar: React.FC<{ value: number; max: number; label: string }> = ({ value, max, label }) => {
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center space-x-3">
      <div className="flex-1 h-3 bg-gray-100 rounded">
        <div className="h-3 bg-primary-500 rounded" style={{ width: `${pct}%` }} />
      </div>
      <div className="w-24 text-sm text-gray-600">{label}</div>
      <div className="w-12 text-sm font-semibold text-gray-900 text-right">{value}</div>
    </div>
  );
};

const TinyColumn: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <div className="h-56 flex items-end space-x-2">
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center" style={{ width: `${100 / Math.max(6, data.length)}%` }}>
          <div className="w-full bg-primary-500 rounded-t" style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 6 : 0 }} />
          <div className="text-[10px] text-gray-500 mt-1 truncate w-full text-center" title={d.label}>{d.label}</div>
          <div className="text-[10px] text-gray-700">{d.value}</div>
        </div>
      ))}
    </div>
  );
};

const AdminAnalyticsPage: React.FC = () => {
  const { token } = useAuth();
  const RAW_BASE = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8080';
  const base = (RAW_BASE as string).replace(/\/+$/, '');
  const apiBase = base.endsWith('/api') ? base : `${base}/api`;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [typeDist, setTypeDist] = useState<Record<string, number>>({});
  const [cityStats, setCityStats] = useState<Record<string, number>>({});
  const [userTrends, setUserTrends] = useState<{ month: number; year: number; count: number }[]>([]);
  const [propertyTrends, setPropertyTrends] = useState<{ month: number; year: number; count: number }[]>([]);

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [d, t, c, ut, pt] = await Promise.all([
          fetch(`${apiBase}/analytics/dashboard`, { headers }).then(r => r.json()),
          fetch(`${apiBase}/analytics/property-types`, { headers }).then(r => r.json()),
          fetch(`${apiBase}/analytics/properties-by-city`, { headers }).then(r => r.json()),
          fetch(`${apiBase}/analytics/user-trends`, { headers }).then(r => r.json()),
          fetch(`${apiBase}/analytics/property-trends`, { headers }).then(r => r.json()),
        ]);

        setDashboard(d);
        setTypeDist(t);
        setCityStats(c);
        setUserTrends(ut);
        setPropertyTrends(pt);
      } catch (e: any) {
        setError(e.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [apiBase, headers]);

  const statCards = useMemo(() => {
    const cards = [] as { label: string; value: number | string; icon: any; help?: string }[];
    if (dashboard) {
      cards.push({ label: 'Total Users', value: dashboard.users.total, icon: Users });
      cards.push({ label: 'Active Properties', value: dashboard.properties.total, icon: Building });
      cards.push({ label: 'Avg Price', value: dashboard.pricing.average, icon: Eye, help: 'Average listing price' });
      cards.push({ label: 'Max Price', value: dashboard.pricing.maximum, icon: Heart, help: 'Highest listing price' });
    }
    return cards;
  }, [dashboard]);

  const typeData = useMemo(() => Object.entries(typeDist).map(([k, v]) => ({ label: k, value: v })), [typeDist]);
  const topCities = useMemo(() => Object.entries(cityStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([k, v]) => ({ label: k, value: v })), [cityStats]);

  const fmtTrend = (t: { month: number; year: number; count: number }[]) => t.map(x => ({ label: `${x.month}/${String(x.year).slice(-2)}`, value: x.count })).slice(-12);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <BarChart3 className="w-7 h-7 mr-2 text-primary-600" /> Analytics Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Platform performance metrics and insights.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">{error}</div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {loading && !dashboard && (
            <div className="col-span-4 text-center text-gray-500">Loading metrics...</div>
          )}
          {!loading && dashboard && statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white rounded-xl shadow-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(Number(stat.value))}</p>
                  </div>
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary-600" />
                  </div>
                </div>
                {stat.help && <div className="mt-3 text-xs text-gray-500">{stat.help}</div>}
              </div>
            );
          })}
        </div>

        {/* Distribution and Cities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-card p-6">
            <h3 className="text-lg font-semibold mb-4">Property Type Distribution</h3>
            {typeData.length === 0 ? (
              <div className="text-gray-500">No data</div>
            ) : (
              <div className="space-y-3">
                {(() => {
                  const max = Math.max(1, ...typeData.map(d => d.value));
                  return typeData.map((d, i) => (
                    <TinyBar key={i} value={d.value} max={max} label={d.label} />
                  ));
                })()}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-card p-6">
            <h3 className="text-lg font-semibold mb-4">Top Cities by Listings</h3>
            {topCities.length === 0 ? (
              <div className="text-gray-500">No data</div>
            ) : (
              <TinyColumn data={topCities} />
            )}
          </div>
        </div>

        {/* Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-card p-6">
            <h3 className="text-lg font-semibold mb-4">User Growth (12 months)</h3>
            {userTrends.length === 0 ? (
              <div className="text-gray-500">No data</div>
            ) : (
              <TinyColumn data={fmtTrend(userTrends)} />
            )}
          </div>

          <div className="bg-white rounded-xl shadow-card p-6">
            <h3 className="text-lg font-semibold mb-4">Property Activity (12 months)</h3>
            {propertyTrends.length === 0 ? (
              <div className="text-gray-500">No data</div>
            ) : (
              <TinyColumn data={fmtTrend(propertyTrends)} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalyticsPage;
