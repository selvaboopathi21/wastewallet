// PickupHistoryPage: List of past and active scrap pickups for customer
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  Scale,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
} from 'lucide-react';
import api from '../../api/axios';

const STATUS_CONFIG = {
  offered: { label: 'Finding Collector', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  accepted: { label: 'Collector Assigned', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  on_the_way: { label: 'On The Way', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  arrived: { label: 'At Doorstep', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  weighing: { label: 'Weighing Live', color: 'bg-teal-100 text-teal-800 border-teal-200 animate-pulse' },
  weighed: { label: 'Weighed - Awaiting OTP', color: 'bg-amber-100 text-amber-900 border-amber-300' },
  confirmed: { label: 'OTP Confirmed', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  paid: { label: 'Cash Paid', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  completed: { label: 'Completed', color: 'bg-slate-100 text-slate-800 border-slate-200' },
  cancelled: { label: 'Cancelled', color: 'bg-rose-100 text-rose-800 border-rose-200' },
};

export const PickupHistoryPage = () => {
  const navigate = useNavigate();
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'active' | 'completed'

  const fetchPickups = async () => {
    try {
      const res = await api.get('/pickups');
      setPickups(res?.data?.pickups || []);
    } catch (err) {
      console.error('Error fetching pickups:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPickups();
  }, []);

  const filteredPickups = pickups.filter((p) => {
    if (filter === 'active') {
      return ['offered', 'accepted', 'on_the_way', 'arrived', 'weighing', 'weighed', 'confirmed'].includes(p.status);
    }
    if (filter === 'completed') {
      return ['paid', 'completed'].includes(p.status);
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900">My Scrap Pickups</h2>
          <p className="text-xs text-slate-500">Track pickups and review past sales</p>
        </div>
        <button
          onClick={() => navigate('/customer/new-pickup')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3 rounded-xl flex items-center gap-1 shadow-xs cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          New Pickup
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 p-1 bg-slate-200/60 rounded-xl text-xs font-semibold">
        {[
          { id: 'all', label: 'All' },
          { id: 'active', label: 'Active Jobs' },
          { id: 'completed', label: 'Completed' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={`flex-1 py-1.5 rounded-lg text-center transition-all cursor-pointer ${
              filter === t.id ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List Content */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500">Loading your pickups...</p>
        </div>
      ) : filteredPickups.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">No pickups found</h3>
            <p className="text-xs text-slate-500 mt-1">
              Ready to turn household scrap into cash? Create your first pickup now!
            </p>
          </div>
          <button
            onClick={() => navigate('/customer/new-pickup')}
            className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-600 text-white px-4 py-2 rounded-xl"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Request Pickup Now
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPickups.map((p) => {
            const statusMeta = STATUS_CONFIG[p.status] || {
              label: p.status,
              color: 'bg-slate-100 text-slate-700 border-slate-200',
            };
            const isActive = !['completed', 'cancelled'].includes(p.status);

            return (
              <div
                key={p._id}
                onClick={() => navigate(`/customer/pickups/${p._id}`)}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all cursor-pointer space-y-2.5"
              >
                {/* Status + Mode Header */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-2xs font-bold px-2 py-0.5 rounded-md border ${statusMeta.color}`}
                  >
                    {statusMeta.label}
                  </span>
                  <span className="text-2xs text-slate-400 font-mono">
                    {new Date(p.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>

                {/* Address Snippet */}
                <div>
                  <p className="text-xs font-bold text-slate-800 truncate flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {p.address}
                  </p>
                  <p className="text-2xs text-slate-500 mt-0.5">
                    Zone: {p.zoneId?.name || 'Chennai Zone'}
                  </p>
                </div>

                {/* Weight & Total Amount */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Scale className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{p.totalPickupWeightKg > 0 ? `${p.totalPickupWeightKg} kg` : 'To be weighed'}</span>
                    <span className="text-slate-300">•</span>
                    <span className="capitalize">{p.pricingMode} Mode</span>
                  </div>

                  <div className="flex items-center gap-1 font-black text-slate-900">
                    {p.totalAmountPaise > 0 ? (
                      <span className="text-emerald-700 text-sm">
                        ₹{(p.totalAmountPaise / 100).toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs font-normal">Pending weight</span>
                    )}
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PickupHistoryPage;
