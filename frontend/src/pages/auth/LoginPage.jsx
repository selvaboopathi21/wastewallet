// LoginPage: Phone number + 6-digit OTP login & registration with real user profile support
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Recycle,
  Phone,
  KeyRound,
  ArrowRight,
  CheckCircle2,
  UserCheck,
  UserPlus,
  LogIn,
  MapPin,
  User,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import useAuth from '../../hooks/useAuth';

export const LoginPage = () => {
  const { requestOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();

  // Mode: 'login' | 'register'
  const [mode, setMode] = useState('login');
  // Step: 'form' | 'otp'
  const [step, setStep] = useState('form');

  const [role, setRole] = useState('customer');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [collectorPendingNotice, setCollectorPendingNotice] = useState(false);

  // Step 1: Send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    const cleanPhone = phone.trim();

    if (!cleanPhone || cleanPhone.length !== 10 || !/^\d+$/.test(cleanPhone)) {
      return setError('Please enter a valid 10-digit mobile number');
    }

    if (mode === 'register' && !name.trim()) {
      return setError('Please enter your full name');
    }

    setLoading(true);
    try {
      const res = await requestOtp(cleanPhone);
      const code = res?.data?.otp || res?.data?.data?.otp || '123456';
      setDevOtp(code);
      setOtp(code);
      setInfoMessage(`Verification code sent! [OTP: ${code}]`);
      setStep('otp');
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please check phone number.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and Login/Register
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    const cleanOtp = otp ? otp.trim() : '';
    const cleanPhone = phone ? phone.trim() : '';

    if (!cleanPhone) {
      return setError('Phone number is missing. Please tap Change Number.');
    }

    if (!cleanOtp || cleanOtp.length !== 6) {
      return setError('Please enter the 6-digit OTP code');
    }

    setLoading(true);
    try {
      const user = await verifyOtp({
        phone: cleanPhone,
        otp: cleanOtp,
        name: name.trim() || undefined,
        address: address.trim() || undefined,
        role,
      });

      // If collector is unapproved, show pending notice
      if (user.role === 'collector' && user.isApproved === false) {
        setCollectorPendingNotice(true);
        setTimeout(() => {
          navigate('/collector', { replace: true });
        }, 2500);
        return;
      }

      // Role-based immediate redirection
      const destination = {
        customer: '/customer',
        collector: '/collector',
        store_staff: '/store',
        admin: '/admin',
      }[user.role] || '/customer';

      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid OTP code. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fast Phone Fill for Testing Real Accounts
  const handleQuickFill = (targetRole, targetPhone, targetName = '') => {
    setRole(targetRole);
    setPhone(targetPhone);
    setName(targetName);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Brand Banner */}
        <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white p-6 text-center">
          <div className="w-13 h-13 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-2.5 shadow-inner">
            <Recycle className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-white m-0">WasteWallet</h1>
          <p className="text-emerald-100 text-xs mt-0.5 font-medium">
            Smart Scrap Collection & Transparent Rates
          </p>
        </div>

        {/* Mode Switcher Tabs (Login vs Register) */}
        {step === 'form' && (
          <div className="flex border-b border-slate-200 bg-slate-50">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-emerald-800 border-b-2 border-emerald-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-emerald-800 border-b-2 border-emerald-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Register Account
            </button>
          </div>
        )}

        {/* Content Box */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {collectorPendingNotice && (
            <div className="mb-4 p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl text-amber-950 text-xs font-semibold space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Partner Application Under Review</span>
              </div>
              <p className="text-2xs text-amber-800">
                Your collector partner account has been created and is pending approval by the Admin. Once approved, you can start accepting routes.
              </p>
            </div>
          )}

          {infoMessage && step === 'otp' && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{infoMessage}</span>
            </div>
          )}

          {step === 'form' ? (
            /* STEP 1: Phone / Registration Form */
            <form onSubmit={handleSendOtp} className="space-y-4">
              {/* Role Selection */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {mode === 'register' ? 'Register As' : 'Select Your Role'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'customer', label: 'Household Seller' },
                    { id: 'collector', label: 'Collector Partner' },
                    ...(mode === 'login'
                      ? [
                          { id: 'store_staff', label: 'Warehouse Staff' },
                          { id: 'admin', label: 'Admin Ops' },
                        ]
                      : []),
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRole(r.id)}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all text-left cursor-pointer ${
                        role === r.id
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Real Name Input (Shown in Register Mode or Optional in Login) */}
              {mode === 'register' && (
                <div>
                  <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Your Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh / Selvaboopathi / Priya"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                    />
                  </div>
                  <p className="text-3xs text-slate-400 mt-1">
                    This name will appear on doorstep pickups and receipts.
                  </p>
                </div>
              )}

              {/* Mobile Number Input */}
              <div>
                <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  10-Digit Mobile Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-11 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Default Address Input (Shown in Register Mode) */}
              {mode === 'register' && (
                <div>
                  <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Default Address / Area
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <textarea
                      rows={2}
                      placeholder="e.g. 15, 3rd Main Road, Anna Nagar East, Chennai"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white resize-none"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-xs cursor-pointer disabled:opacity-50"
              >
                {loading
                  ? 'Sending OTP...'
                  : mode === 'register'
                  ? 'Register & Get OTP ➔'
                  : 'Send Login OTP ➔'}
              </button>

              {/* Fast Test Account Quick Fills */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <p className="text-3xs font-bold text-slate-400 uppercase tracking-wider text-center">
                  ⚡ Quick Test Fill (Real Accounts)
                </p>
                <div className="grid grid-cols-2 gap-1.5 text-2xs">
                  <button
                    type="button"
                    onClick={() => handleQuickFill('customer', '9876543210', 'Ramesh')}
                    className="p-2 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-left cursor-pointer transition-all"
                  >
                    <span className="font-bold text-slate-900 block">👤 Customer</span>
                    <span className="text-3xs text-slate-500">9876543210</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('collector', '9876500001', 'Murugan (Top Collector)')}
                    className="p-2 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-xl text-left cursor-pointer transition-all"
                  >
                    <span className="font-bold text-slate-900 block">🚚 Collector</span>
                    <span className="text-3xs text-slate-500">9876500001</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('store_staff', '9876599999', 'Store Manager Selvam')}
                    className="p-2 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl text-left cursor-pointer transition-all"
                  >
                    <span className="font-bold text-slate-900 block">🏬 Store Staff</span>
                    <span className="text-3xs text-slate-500">9876599999</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('admin', '9999999999', 'Master Admin')}
                    className="p-2 bg-slate-50 hover:bg-purple-50 border border-slate-200 hover:border-purple-300 rounded-xl text-left cursor-pointer transition-all"
                  >
                    <span className="font-bold text-slate-900 block">👑 Admin</span>
                    <span className="text-3xs text-slate-500">9999999999</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* STEP 2: 6-Digit OTP Verification */
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-2xs text-slate-400 block font-semibold uppercase">
                    Verifying Phone
                  </span>
                  <span className="text-xs font-black text-slate-900">+91 {phone}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="text-xs text-emerald-600 font-bold hover:underline cursor-pointer"
                >
                  Change Number
                </button>
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Enter 6-Digit Verification OTP
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono tracking-widest text-lg font-black text-center focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-xs cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify & Continue ➔'}
              </button>

              {devOtp && (
                <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-3 text-xs text-emerald-950 flex items-center justify-between shadow-2xs">
                  <div>
                    <span className="font-bold text-emerald-900">SMS OTP: </span>
                    <span className="font-mono text-sm font-black text-emerald-700 ml-1">
                      {devOtp}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOtp(devOtp)}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-2xs cursor-pointer"
                  >
                    Auto-Fill
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
