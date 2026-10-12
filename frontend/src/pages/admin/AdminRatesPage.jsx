// AdminRatesPage: Real-time scrap rate card editor in paise & service zone status toggles
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Save,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowLeft,
} from 'lucide-react';
import api from '../../api/axios';

export const AdminRatesPage = () => {
  const navigate = useNavigate();
  const [rates, setRates] = useState([]);
  const [zones, setZones] = useState([]);
  const [editingRates, setEditingRates] = useState({});
  const [updatingCategory, setUpdatingCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      const [ratesRes, zonesRes] = await Promise.all([
        api.get('/rates'),
        api.get('/zones'),
      ]);

      const rateList = ratesRes?.data?.data?.rates || ratesRes?.data?.rates || [];
      const zoneList = zonesRes?.data?.data?.zones || zonesRes?.data?.zones || [];

      setRates(rateList);
      setZones(zoneList);

      // Pre-fill editing inputs
      const initialMap = {};
      rateList.forEach((r) => {
        initialMap[r.category] = (r.ratePerKgPaise / 100).toFixed(2);
      });
      setEditingRates(initialMap);
    } catch (err) {
      console.error('Error fetching rates and zones:', err);
      setError(err.message || 'Failed to load rate cards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update a single scrap rate
  const handleUpdateRate = async (category) => {
    setError('');
    setMessage('');
    const rupeeValue = parseFloat(editingRates[category]);

    if (!rupeeValue || rupeeValue <= 0) {
      return setError(`Please enter a valid price in rupees for ${category}`);
    }

    const paise = Math.round(rupeeValue * 100);
    setUpdatingCategory(category);

    try {
      const res = await api.post('/admin/rates', {
        category,
        ratePerKgPaise: paise,
      });

      setMessage(res?.message || `Rate for "${category}" updated to ₹${rupeeValue.toFixed(2)}/kg`);
      await fetchData();
    } catch (err) {
      setError(err.message || `Failed to update rate for ${category}`);
    } finally {
      setUpdatingCategory(null);
    }
  };

  // Toggle zone active status
  const handleToggleZone = async (zoneId, currentStatus) => {
    try {
      await api.patch(`/admin/zones/${zoneId}/status`, {
        isActive: !currentStatus,
      });
      setZones((prev) =>
        prev.map((z) => (z._id === zoneId ? { ...z, isActive: !currentStatus } : z))
      );
      setMessage(`Zone status updated!`);
    } catch (err) {
      alert(err.message || 'Failed to update zone status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/admin')}
          className="w-10 h-10 flex items-center justify-center bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all text-slate-700 shadow-xs cursor-pointer active:scale-95 shrink-0"
          title="Go Back to Admin Dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Scrap Rate Cards & Geospatial Zones
          </h2>
          <p className="text-xs text-slate-500">
            Modify per-kilogram price cards in real-time and toggle service zone boundaries
          </p>
        </div>
      </div>

      {message && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-2xl text-rose-900 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Section 1: Rate Cards Grid */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Scrap Category Rate Cards (₹/kg)
            </h3>
          </div>
          <span className="text-2xs font-semibold text-slate-400">
            Stored in integer paise • Frozen on weigh
          </span>
        </div>

        {loading ? (
          <p className="text-xs text-slate-400 text-center py-4">Loading rate cards...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {rates.map((rate) => {
              const cat = rate.category;
              return (
                <div
                  key={cat}
                  className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 capitalize">
                      {cat.replace('_', ' ')}
                    </span>
                    <span className="text-2xs font-mono font-bold text-slate-400">
                      {rate.ratePerKgPaise} paise
                    </span>
                  </div>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={editingRates[cat] ?? ''}
                      onChange={(e) =>
                        setEditingRates({ ...editingRates, [cat]: e.target.value })
                      }
                      className="w-full pl-7 pr-12 py-2 bg-white border border-slate-300 rounded-xl font-mono text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-2xs font-bold text-slate-400">
                      / kg
                    </span>
                  </div>

                  <button
                    onClick={() => handleUpdateRate(cat)}
                    disabled={updatingCategory === cat}
                    className="w-full bg-slate-900 hover:bg-emerald-600 text-white font-bold py-2 px-3 rounded-xl text-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {updatingCategory === cat ? 'Saving...' : 'Update Rate'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Geospatial Service Zones */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Geospatial Collection Zones (MongoDB 2dsphere)
            </h3>
          </div>
          <span className="text-2xs font-semibold text-slate-400">
            Auto-detected via $geoIntersects
          </span>
        </div>

        {zones.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">No active zones configured.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {zones.map((zone) => (
              <div
                key={zone._id}
                className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-900">{zone.name}</h4>
                  <span
                    className={`text-2xs font-bold px-2 py-0.5 rounded-full ${
                      zone.isActive
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {zone.isActive ? 'Active Service' : 'Disabled'}
                  </span>
                </div>

                <p className="text-xs text-slate-500">
                  GeoJSON Polygon covering residential & commercial collection boundaries.
                </p>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-2xs font-mono text-slate-400">ID: {zone._id}</span>
                  <button
                    onClick={() => handleToggleZone(zone._id, zone.isActive)}
                    className={`text-2xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                      zone.isActive
                        ? 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                        : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                    }`}
                  >
                    {zone.isActive ? 'Deactivate Zone' : 'Activate Zone'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminRatesPage;
