// CustomerProfilePage: Real profile viewing and editing for household customer
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, MapPin, Save, CheckCircle2, ArrowLeft, ShieldCheck, LogOut } from 'lucide-react';
import useAuth from '../../hooks/useAuth';

export const CustomerProfilePage = () => {
  const { user, updateProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [address, setAddress] = useState(user?.address || '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      return setError('Please enter your full name');
    }

    setSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        address: address.trim(),
      });
      setSuccess('Profile updated successfully! Your real name will now appear on scrap pickup requests.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/customer')}
            className="p-1.5 hover:bg-slate-200 rounded-xl transition-colors text-slate-600 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-black text-slate-900 leading-tight">My Profile & Address</h2>
            <p className="text-2xs text-slate-500">Your real account details for doorstep scrap visits</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" /> Logout
        </button>
      </div>

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Profile Form Card */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <form onSubmit={handleSave} className="space-y-4">
          {/* Phone Number (Read Only) */}
          <div>
            <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Registered Mobile Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                disabled
                value={`+91 ${user?.phone || ''}`}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 cursor-not-allowed"
              />
            </div>
            <p className="text-3xs text-slate-400 mt-1">
              Verified by SMS OTP authentication. Used for doorstep arrival calls.
            </p>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Your Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="e.g. Ramesh / Priya / Selvaboopathi"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>
            <p className="text-3xs text-slate-400 mt-1">
              This name will be displayed to the collector when they accept your pickup request.
            </p>
          </div>

          {/* Default Pickup Address */}
          <div>
            <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Default Doorstep Pickup Address
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <textarea
                rows={3}
                placeholder="e.g. 12, 2nd Avenue, Anna Nagar East, Chennai 600102"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white resize-none"
              />
            </div>
            <p className="text-3xs text-slate-400 mt-1">
              Pre-fills automatically when requesting scrap pickups.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving Profile...' : 'Save Real Profile'}
          </button>
        </form>
      </div>

      {/* Account Info Card */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-800">Verified Household Account:</span>
          <p className="text-2xs text-slate-500 mt-0.5">
            Your profile is linked directly to certified scrap rates and digital scale photo verification in your zone.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CustomerProfilePage;
