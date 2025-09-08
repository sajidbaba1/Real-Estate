import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, otpSend, otpLogin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [useOtp, setUseOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
    if (success) {
      setSuccess('');
    }
  };

  // Handle OTP code input change
  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6));
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (useOtp) {
      // OTP login flow
      if (!formData.email) {
        setError('Please enter your email to receive an OTP');
        return;
      }
      if (!otpSent) {
        setError('Please request an OTP first');
        return;
      }
      if (!otpCode || otpCode.length !== 6) {
        setError('Please enter the 6-digit OTP code');
        return;
      }
      try {
        setOtpLoading(true);
        setError('');
        setSuccess('');
        await otpLogin!(formData.email, otpCode);
        navigate('/');
      } catch (err: any) {
        setError(err.response?.data || 'OTP verification failed. Please try again.');
      } finally {
        setOtpLoading(false);
      }
    } else {
      // Password login flow
      if (!formData.email || !formData.password) {
        setError('Please fill in all fields');
        return;
      }
      try {
        setLoading(true);
        setError('');
        await login(formData.email, formData.password);
        // After normal login, send user to home; role-based demo buttons handle their own navigation
        navigate('/');
      } catch (error: any) {
        setError(error.response?.data || 'Login failed. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  // Send OTP to email
  const handleSendOtp = async () => {
    if (!formData.email) {
      setError('Please enter your email first');
      return;
    }
    try {
      setOtpLoading(true);
      setError('');
      setSuccess('');
      const res = await otpSend!(formData.email);
      if (res.success) {
        setOtpSent(true);
        setSuccess(res.message || 'OTP sent successfully');
        setCountdown((res.expiryMinutes || 10) * 60);
      } else {
        setError(res.message || 'Failed to send OTP');
      }
    } catch (err: any) {
      setError(err.response?.data || 'Failed to send OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  // countdown timer for resend
  useEffect(() => {
    if (!otpSent || countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [otpSent, countdown]);

  const quickLogin = async (role: 'ADMIN' | 'AGENT' | 'USER') => {
    try {
      setLoading(true);
      setError('');
      const creds = {
        // Redirect ADMIN to home to show the admin welcome banner
        ADMIN: { email: 'admin@demo.com', password: 'Demo@12345', redirect: '/' },
        AGENT: { email: 'agent@demo.com', password: 'Demo@12345', redirect: '/dashboard/agent' },
        USER: { email: 'user@demo.com', password: 'Demo@12345', redirect: '/dashboard/client' },
      }[role];

      // Persist in form for transparency
      setFormData({ email: creds.email, password: creds.password });
      await login(creds.email, creds.password);
      navigate(creds.redirect);
    } catch (error: any) {
      setError('Demo login failed. Ensure backend is running and demo users are seeded.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8"
      >
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              to="/register"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              create a new account
            </Link>
          </p>
        </div>
        
        <motion.form 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mt-8 space-y-6" 
          onSubmit={handleSubmit}
        >
          <div className="space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="input-field pl-10"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            {/* Password or OTP Field */}
            {!useOtp ? (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required={!useOtp}
                    value={formData.password}
                    onChange={handleInputChange}
                    className="input-field pl-10 pr-10"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
                  One-Time Password (OTP)
                </label>
                <div className="flex space-x-2">
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={otpCode}
                    onChange={handleOtpChange}
                    className="flex-1 input-field"
                    placeholder="Enter 6-digit code"
                  />
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={otpLoading || (otpSent && countdown > 0)}
                    className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    {otpSent && countdown > 0 ? `Resend in ${Math.floor(countdown/60)}:${String(countdown%60).padStart(2,'0')}` : (otpLoading ? 'Sending...' : 'Send OTP')}
                  </button>
                </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => quickLogin('ADMIN')}
                disabled={loading}
                className="w-full py-2 px-3 rounded-lg bg-gray-900 text-white hover:bg-black transition disabled:opacity-50"
                title="admin@demo.com / Demo@12345"
              >
                Login as Admin
              </button>
              <button
                type="button"
                onClick={() => quickLogin('AGENT')}
                disabled={loading}
                className="w-full py-2 px-3 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition disabled:opacity-50"
                title="agent@demo.com / Demo@12345"
              >
                Login as Agent
              </button>
              <button
                type="button"
                onClick={() => quickLogin('USER')}
                disabled={loading}
                className="w-full py-2 px-3 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                title="user@demo.com / Demo@12345"
              >
                Login as Client
              </button>
            </div>
            <div className="text-xs text-gray-400 text-center">Credentials: email shown in tooltip • Password: Demo@12345</div>
          </div>

          {/* Toggle auth mode */}
          <div className="text-center text-sm text-gray-600">
            {useOtp ? (
              <>
                Prefer password?{' '}
                <button type="button" className="text-primary-600 hover:text-primary-700 font-medium" onClick={() => { setUseOtp(false); setError(''); setSuccess(''); }}>
                  Use password instead
                </button>
              </>
            ) : (
              <>
                No password?{' '}
                <button type="button" className="text-primary-600 hover:text-primary-700 font-medium" onClick={() => { setUseOtp(true); setError(''); setSuccess(''); }}>
                  Login with OTP
                </button>
              </>
            )}
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={useOtp ? otpLoading || !formData.email || !otpCode : loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {useOtp ? (
                otpLoading ? 'Verifying...' : 'Verify OTP'
              ) : loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </div>
        </motion.form>
      </motion.div>
    </div>
  );
};

export default LoginPage;
