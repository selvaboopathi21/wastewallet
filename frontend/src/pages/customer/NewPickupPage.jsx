// NewPickupPage: Create scrap pickup request with location, address, categories, and pricing mode
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Sparkles,
  Layers,
  Scale,
  Clock,
  CheckCircle2,
  AlertCircle,
  Camera,
} from 'lucide-react';
import api from '../../api/axios';
import useAuth from '../../hooks/useAuth';

const PRESET_LOCATIONS = [
  {
    name: 'Anna Nagar (Chennai Central)',
    address: '12, 2nd Avenue, Anna Nagar East, Chennai 600102',
    coords: [80.215, 13.085],
  },
  {
    name: 'Kilpauk (Chennai Central)',
    address: '45, Kilpauk Garden Road, Chennai 600010',
    coords: [80.240, 13.080],
  },
  {
    name: 'Guindy (Chennai South)',
    address: '8, Industrial Estate Road, Guindy, Chennai 600032',
    coords: [80.205, 13.006],
  },
];

const CATEGORIES = [
  { id: 'iron', name: 'Iron & Steel', rate: '₹32/kg', icon: '🔩' },
  { id: 'copper_wire', name: 'Copper Wire', rate: '₹450/kg', icon: '🔌' },
  { id: 'plastic', name: 'Plastic', rate: '₹18/kg', icon: '🧴' },
  { id: 'paper', name: 'Paper & Cardboard', rate: '₹12/kg', icon: '📦' },
  { id: 'ewaste', name: 'E-Waste', rate: '₹80/kg', icon: '💻' },
  { id: 'battery', name: 'Battery', rate: '₹65/kg', icon: '🔋' },
];

export const NewPickupPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Form states
  const [selectedLocation, setSelectedLocation] = useState(PRESET_LOCATIONS[0]);
  const [address, setAddress] = useState(user?.address || PRESET_LOCATIONS[0].address);

  const [coordinates, setCoordinates] = useState(PRESET_LOCATIONS[0].coords);
  const [selectedCategories, setSelectedCategories] = useState(['iron', 'paper']);
  const [pricingMode, setPricingMode] = useState('separate'); // 'separate' | 'mixed'
  const [preferredTime, setPreferredTime] = useState('anytime');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleCategory = (catId) => {
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const handleSelectPreset = (preset) => {
    setSelectedLocation(preset);
    setAddress(preset.address);
    setCoordinates(preset.coords);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!address.trim()) {
      return setError('Please enter your pickup address');
    }

    if (selectedCategories.length === 0) {
      return setError('Please select at least one scrap category');
    }

    setLoading(true);
    try {
      const payload = {
        address: address.trim(),
        coordinates: coordinates,
        customerPricingPreference: pricingMode === 'mixed' ? 'quick_mixed' : 'best_price_separate',
        preferredTime,
      };

      const res = await api.post('/pickups', payload);
      const newPickup = res?.data?.pickup;

      if (newPickup?._id) {
        navigate(`/customer/pickups/${newPickup._id}`);
      } else {
        navigate('/customer/pickups');
      }
    } catch (err) {
      setError(err.message || 'Failed to create pickup request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/customer')}
          className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-600"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-lg font-black text-slate-900 leading-tight">Request Scrap Pickup</h2>
          <p className="text-xs text-slate-500">Certified local collector visits your doorstep</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step 1: Service Location & Zone */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              1. Pickup Location (Select Zone)
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {PRESET_LOCATIONS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  selectedLocation.name === preset.name
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-semibold'
                    : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">{preset.name}</span>
                  {selectedLocation.name === preset.name && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
                <p className="text-2xs text-slate-500 mt-0.5 truncate">{preset.address}</p>
              </button>
            ))}
          </div>

          <div>
            <label className="block text-2xs font-bold text-slate-500 uppercase mb-1">
              Door / Street Address
            </label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="House/Flat number, Street name, Landmark"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Step 2: Scrap Categories */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                2. Select Scrap Items
              </h3>
            </div>
            <span className="text-2xs text-slate-400 font-medium">
              {selectedCategories.length} selected
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategories.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                      : 'border-slate-200 bg-slate-50/40 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base">{cat.icon}</span>
                    <span className="text-2xs font-black text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded">
                      {cat.rate}
                    </span>
                  </div>
                  <p className="text-xs font-bold mt-1 text-slate-800">{cat.name}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 3: Pricing Preference */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              3. Pricing Mode Preference
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPricingMode('separate')}
              className={`p-3 rounded-xl border text-left transition-all ${
                pricingMode === 'separate'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                  : 'border-slate-200 bg-slate-50/40 text-slate-600'
              }`}
            >
              <p className="text-xs font-bold text-slate-900">Separate Weighing</p>
              <p className="text-2xs text-slate-500 mt-0.5 leading-snug">
                Each category weighed individually for maximum earnings.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setPricingMode('mixed')}
              className={`p-3 rounded-xl border text-left transition-all ${
                pricingMode === 'mixed'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                  : 'border-slate-200 bg-slate-50/40 text-slate-600'
              }`}
            >
              <p className="text-xs font-bold text-slate-900">Mixed Flat Rate</p>
              <p className="text-2xs text-slate-500 mt-0.5 leading-snug">
                Quick single weigh for everything mixed together (₹15/kg).
              </p>
            </button>
          </div>
        </div>

        {/* Step 4: Preferred Time */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              4. Preferred Time
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { id: 'anytime', label: 'Anytime Today' },
              { id: 'morning', label: 'Morning (9AM - 12PM)' },
              { id: 'afternoon', label: 'Afternoon (12PM - 3PM)' },
              { id: 'evening', label: 'Evening (3PM - 6PM)' },
            ].map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => setPreferredTime(slot.id)}
                className={`py-2 px-3 rounded-xl border text-center font-medium transition-all ${
                  preferredTime === slot.id
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                    : 'border-slate-200 bg-slate-50/40 text-slate-600'
                }`}
              >
                {slot.label}
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            'Dispatching Collector...'
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Confirm & Request Pickup
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default NewPickupPage;
