import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const DebugAuthPage: React.FC = () => {
  const { user, token, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const clearStorage = () => {
    console.log('🧹 Clearing all authentication data...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
    console.log('✅ Storage cleared');
    window.location.href = '/login';
  };

  const forceLogout = () => {
    console.log('🚪 Force logout initiated...');
    localStorage.clear();
    sessionStorage.clear();
    // Clear any cookies if they exist
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    console.log('✅ All data cleared, redirecting to login...');
    window.location.href = '/login';
  };

  const debugToken = () => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    console.log('=== AUTH DEBUG ===');
    console.log('Current auth state:', {
      hasToken: !!token,
      hasStoredToken: !!storedToken,
      hasUser: !!user,
      hasStoredUser: !!storedUser,
      tokenLength: storedToken?.length,
      isAuthenticated
    });
    
    if (storedToken) {
      try {
        const payload = JSON.parse(atob(storedToken.split('.')[1]));
        const now = Date.now() / 1000;
        console.log('Token payload:', {
          exp: payload.exp,
          iat: payload.iat,
          sub: payload.sub,
          isExpired: payload.exp < now,
          expiresIn: Math.round(payload.exp - now) + 's'
        });
        
        if (payload.exp < now) {
          console.log('🚨 TOKEN IS EXPIRED! This explains the 403 errors.');
        }
      } catch (e) {
        console.log('❌ Token decode error:', e);
        console.log('🚨 TOKEN IS MALFORMED! This explains the 403 errors.');
      }
    } else {
      console.log('❌ No token found in localStorage');
    }
    console.log('==================');
  };

  const testNotifications = async () => {
    if (!token) {
      console.log('❌ No token available for test');
      return;
    }

    const apiBase = 'http://localhost:8888/api';
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    try {
      console.log('Testing notifications API...');
      const res = await fetch(`${apiBase}/notifications/unread-count`, { headers });
      console.log('Response status:', res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log('✅ Notifications API working:', data);
      } else {
        console.log('❌ Notifications API failed:', res.status, res.statusText);
        const text = await res.text();
        console.log('Response body:', text);
      }
    } catch (e) {
      console.log('❌ Notifications API error:', e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🔧 Auth Debug</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Auth State</h2>
          <div className="space-y-2 text-sm">
            <div>Authenticated: <span className={isAuthenticated ? 'text-green-600' : 'text-red-600'}>{isAuthenticated ? 'Yes' : 'No'}</span></div>
            <div>Has Token: <span className={token ? 'text-green-600' : 'text-red-600'}>{token ? 'Yes' : 'No'}</span></div>
            <div>Has User: <span className={user ? 'text-green-600' : 'text-red-600'}>{user ? 'Yes' : 'No'}</span></div>
            {user && (
              <div>User: {user.firstName} {user.lastName} ({user.role})</div>
            )}
            <div>Token Length: {token?.length || 'N/A'}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Debug Actions</h2>
          <div className="space-y-3">
            <button 
              onClick={debugToken}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mr-3"
            >
              Debug Token (Check Console)
            </button>
            
            <button 
              onClick={testNotifications}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 mr-3"
            >
              Test Notifications API
            </button>
            
            <button 
              onClick={clearStorage}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 mr-3"
            >
              Clear Storage & Reload
            </button>
            
            <button 
              onClick={() => { logout(); navigate('/login'); }}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 mr-3"
            >
              Logout & Go to Login
            </button>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">🚨 If you're seeing 403 errors:</h3>
          <ol className="list-decimal list-inside text-yellow-700 space-y-1">
            <li>Click "Debug Token" and check the console</li>
            <li>If token is expired/malformed, click "Logout & Go to Login"</li>
            <li>Log in again with fresh credentials</li>
            <li>If still failing, click "Clear Storage & Reload" first</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default DebugAuthPage;
