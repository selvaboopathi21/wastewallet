// CollectorProfilePage: Full profile viewing, editing, and zone selection for collector partner
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  User,
  Phone,
  Mail,
  MapPin,
  Save,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
  LogOut,
  Star,
  Sparkles,
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

export const CollectorProfilePage = () => {
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
      return setError('Please enter your full partner name');
    }

    setSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        address: address.trim(),
        zoneId,
      });
      setSuccess('Partner profile updated successfully! Real name and operating zone saved.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to update partner profile');
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
            onClick={() => navigate('/collector')}
            className="w-9 h-9 flex items-center justify-center bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all text-slate-700 shadow-xs cursor-pointer active:scale-95"
            title="Go Back to Active Jobs"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-black text-slate-900 leading-tight">Partner Profile & Zone</h2>
            <p className="text-2xs text-slate-500">Edit collector credentials and assigned pickup territory</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 cursor-pointer shadow-2xs"
        >
          <LogOut className="w-3.5 h-3.5" /> Logout
        </button>
      </div>

      {/* Collector Partner Hero Badge */}
      <div className="bg-gradient-to-br from-amber-600 to-amber-800 text-white p-4 rounded-3xl shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black">{user?.name || 'Collector Partner'}</h3>
              <p className="text-3xs text-amber-100">Certified Kaalaankadai Doorstep Collector</p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-white text-amber-950 font-black text-xs px-2.5 py-1 rounded-full shadow-xs">
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span>{user?.rating?.avg?.toFixed(1) || '5.0'} / 5.0</span>
          </div>
        </div>
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
              SMS verified number used to authenticate scale readings and customer communications.
            </p>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Full Partner Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="e.g. Murugan / Selvaboopathi V"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
              />
            </div>
            <p className="text-3xs text-slate-400 mt-1">
              Displayed on customer job cards and warehouse scale handover slips.
            </p>
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
                placeholder="e.g. partner@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Operating Collection Zone Selector */}
          <div>
            <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Operating Collection Zone *</span>
              <span className="text-3xs text-amber-700 font-bold">Live Job Routing</span>
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
                        ? 'bg-amber-50 border-amber-600 shadow-xs'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-2xs font-black uppercase tracking-wider text-amber-700">
                        {zone.tag}
                      </span>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? 'border-amber-600 bg-amber-600 text-white'
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
            <p className="text-3xs text-slate-500 mt-1">
              You will automatically receive incoming doorstep pickup requests created in this territory.
            </p>
          </div>

          {/* Base Station / Service Address */}
          <div>
            <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Base Station / Parking Address
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <textarea
                rows={2}
                placeholder="e.g. 5, Market Road, Anna Nagar West, Chennai"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white resize-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all disabled:opacity-50 active:scale-98"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving Partner Profile...' : 'Save Partner Profile Changes ➔'}
          </button>
        </form>
      </div>

      {/* Trust & Guarantee Card */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 text-xs text-slate-600 flex items-start gap-3 shadow-2xs">
        <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-800">Direct Digital Payments & Transparent Scale:</span>
          <p className="text-2xs text-slate-500 mt-0.5">
            Every weighed scrap category is verified via OTP and synchronised directly with daily gross scale warehouse batches.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CollectorProfilePage;
