// CustomerProfilePage: Full profile viewing and editing with zone selection for household customer
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Save,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
  LogOut,
  Map,
} from 'lucide-react';
import useAuth from '../../hooks/useAuth';

const AVAILABLE_ZONES = [
  {
    id: '6aca7449ac0dfcc7a63a5918',
    name: 'Chennai Central',
    locality: 'Anna Nagar, Kilpauk, Shenoy Nagar, Aminjikarai',
    tag: 'Zone 1',
  },
  {
    id: '6aca7449ac0dfcc7a63a591b',
    name: 'Chennai South',
    locality: 'Guindy, Adyar, Saidapet, Velachery',
    tag: 'Zone 2',
  },
];

export const CustomerProfilePage = () => {
  const { user, updateProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [address, setAddress] = useState(user?.address || '');
  const [zoneId, setZoneId] = useState(user?.zoneId?._id || user?.zoneId || '6aca7449ac0dfcc7a63a5918');
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
        email: email.trim().toLowerCase(),
        address: address.trim(),
        zoneId,
      });
      setSuccess('Profile updated successfully! Real name and zone saved.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Prominent Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/customer')}
            className="w-9 h-9 flex items-center justify-center bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all text-slate-700 shadow-xs cursor-pointer active:scale-95"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-black text-slate-900 leading-tight">My Profile & Zone</h2>
            <p className="text-2xs text-slate-500">Edit your scrap selling details and neighborhood</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 cursor-pointer shadow-2xs"
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
          {/* Phone Number (Verified) */}
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
              Verified by SMS OTP authentication. Used by collectors to contact you upon arrival.
            </p>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="e.g. Selvaboopathi / Ramesh Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                placeholder="e.g. name@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>
            <p className="text-3xs text-slate-400 mt-1">
              Used for digital receipts and pickup confirmation notices.
            </p>
          </div>

          {/* Neighborhood Scrap Zone Selector */}
          <div>
            <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Your Neighborhood Collection Zone *</span>
              <span className="text-3xs text-emerald-600 font-bold">Guaranteed Match</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AVAILABLE_ZONES.map((zone) => {
                const isSelected = zoneId === zone.id;
                return (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => setZoneId(zone.id)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-600 shadow-xs'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-2xs font-black uppercase tracking-wider text-emerald-700">
                        {zone.tag}
                      </span>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-slate-400'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                    <h4 className="text-xs font-black text-slate-900 leading-tight">
                      {zone.name}
                    </h4>
                    <p className="text-3xs text-slate-500 mt-0.5 leading-snug">
                      {zone.locality}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Default Pickup Address */}
          <div>
            <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Default Doorstep Pickup Address
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <textarea
                rows={2}
                placeholder="e.g. 12, 2nd Avenue, Anna Nagar East, Chennai 600102"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white resize-none"
              />
            </div>
            <p className="text-3xs text-slate-400 mt-1">
              Pre-fills automatically when requesting scrap pickups.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all disabled:opacity-50 active:scale-98"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving Profile...' : 'Save Profile Changes ➔'}
          </button>
        </form>
      </div>

      {/* Account Info Card */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 text-xs text-slate-600 flex items-start gap-3 shadow-2xs">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-800">Verified Household Seller:</span>
          <p className="text-2xs text-slate-500 mt-0.5">
            Your profile guarantees certified digital scale accuracy and transparent scrap rates with verified local collectors.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CustomerProfilePage;
