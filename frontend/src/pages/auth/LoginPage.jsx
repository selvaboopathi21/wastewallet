// LoginPage: Phone number + 6-digit OTP login with role switching
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Recycle, Phone, KeyRound, ArrowRight, CheckCircle2, UserCheck } from 'lucide-react';
import useAuth from '../../hooks/useAuth';

export const LoginPage = () => {
  const { requestOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('customer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // Step 1: Send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    const cleanPhone = phone.trim();

    if (!cleanPhone || cleanPhone.length !== 10 || !/^\d+$/.test(cleanPhone)) {
      return setError('Please enter a valid 10-digit mobile number');
    }

    setLoading(true);
    try {
      const res = await requestOtp(cleanPhone);
      const code = res?.data?.otp || '123456';
      setDevOtp(code);
      setOtp(code);
      setInfoMessage(res?.data?.otp ? `Demo OTP: ${code}` : 'Enter OTP 123456 to continue');
      setStep('otp');
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Fast Demo Login
  const handleQuickDemo = async (demoRole, demoPhone) => {
    setRole(demoRole);
    setPhone(demoPhone);
    setError('');
    setLoading(true);
    try {
      const res = await requestOtp(demoPhone);
      const code = res?.data?.otp || '123456';
      setDevOtp(code);
      setOtp(code);
      setInfoMessage(res?.data?.otp ? `Demo OTP: ${code}` : 'Enter OTP 123456 to continue');
      setStep('otp');
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    const cleanOtp = otp.trim();

    if (!cleanOtp || cleanOtp.length !== 6) {
      return setError('Please enter the 6-digit OTP code');
    }

    setLoading(true);
    try {
      const user = await verifyOtp({
        phone: phone.trim(),
        otp: cleanOtp,
        name: name.trim() || undefined,
        role,
      });

      // Role-based immediate redirection
      const destination = {
        customer: '/customer',
        collector: '/collector',
        store_staff: '/store',
        admin: '/admin',
      }[user.role] || '/customer';

      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid OTP code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Brand Banner */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-800 text-white p-6 text-center">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Recycle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white m-0">WasteWallet</h1>
          <p className="text-emerald-100 text-sm mt-1 font-medium">
            Smart Scrap Collection & Transparent Rates
          </p>
        </div>

        {/* Content Box */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {infoMessage && step === 'otp' && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{infoMessage}</span>
            </div>
          )}

          {step === 'phone' ? (
            /* STEP 1: Phone & Role Selection */
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select Your Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'customer', label: 'Household (Seller)' },
                    { id: 'collector', label: 'Collector Partner' },
                    { id: 'store_staff', label: 'Store Staff' },
                    { id: 'admin', label: 'Admin' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRole(r.id)}
                      className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all text-left ${
                        role === r.id
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Mobile Number
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Sending OTP...' : 'Get OTP Code'}
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-3 border-t border-slate-100 space-y-2">
                <p className="text-2xs font-bold text-slate-500 uppercase tracking-wider text-center">
                  ⚡ 1-Click Fast Demo Accounts
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleQuickDemo('customer', '9876543210')}
                    className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-200 rounded-xl text-left transition-all cursor-pointer shadow-2xs"
                  >
                    <div className="text-xs font-black">👤 Customer</div>
                    <div className="text-2xs text-emerald-700 font-medium">Ravi (Anna Nagar)</div>
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleQuickDemo('collector', '9876500001')}
                    className="p-2.5 bg-teal-50 hover:bg-teal-100 text-teal-950 border border-teal-200 rounded-xl text-left transition-all cursor-pointer shadow-2xs"
                  >
                    <div className="text-xs font-black">🚚 Collector</div>
                    <div className="text-2xs text-teal-700 font-medium">Murugan (Chennai Central)</div>
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleQuickDemo('store_staff', '9876500002')}
                    className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-950 border border-blue-200 rounded-xl text-left transition-all cursor-pointer shadow-2xs"
                  >
                    <div className="text-xs font-black">🏬 Store Staff</div>
                    <div className="text-2xs text-blue-700 font-medium">Warehouse Staff</div>
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleQuickDemo('admin', '9999999999')}
                    className="p-2.5 bg-purple-50 hover:bg-purple-100 text-purple-950 border border-purple-200 rounded-xl text-left transition-all cursor-pointer shadow-2xs"
                  >
                    <div className="text-xs font-black">👑 Admin</div>
                    <div className="text-2xs text-purple-700 font-medium">Lakshmi (Ops)</div>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* STEP 2: 6-Digit OTP Verification */
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Your Name (Optional for new users)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. Ramesh"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Enter 6-Digit OTP
                  </label>
                  <button
                    type="button"
                    onClick={() => setStep('phone')}
                    className="text-xs text-emerald-600 font-bold hover:underline"
                  >
                    Change Number
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono tracking-widest text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify & Continue'}
                <UserCheck className="w-4 h-4" />
              </button>

              {devOtp ? (
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 text-xs text-emerald-950 flex items-center justify-between shadow-xs">
                  <div>
                    <span className="font-bold text-emerald-800">🔑 Dev OTP Code: </span>
                    <span className="font-mono text-base font-black text-emerald-700 tracking-wider ml-1">{devOtp}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOtp(devOtp)}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs"
                  >
                    Auto-Fill
                  </button>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                  <span className="font-bold">💡 Dev Tip:</span> Check your backend terminal for the generated OTP, or use demo codes.
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
