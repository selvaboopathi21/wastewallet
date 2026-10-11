// CollectorHome: Real-time dashboard for scrap collector partner
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  Star,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Phone,
  Scale,
  QrCode,
  DollarSign,
  PackageCheck,
  Sparkles,
} from 'lucide-react';
import api from '../../api/axios';
import useAuth from '../../hooks/useAuth';
import useSocket from '../../hooks/useSocket';

export const CollectorHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();

  const [isOnline, setIsOnline] = useState(user?.isOnline ?? true);
  const [offers, setOffers] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [respondingOfferId, setRespondingOfferId] = useState(null);
  const [stats, setStats] = useState({
    completedToday: 0,
    totalWeightKg: 0,
    totalCashPaid: 0,
  });

  // Fetch incoming offers & active jobs
  const fetchCollectorData = async () => {
    try {
      const [offersRes, jobsRes] = await Promise.all([
        api.get('/collector/offers'),
        api.get('/collector/active-jobs'),
      ]);

      const rawOffers = offersRes?.data?.offers || offersRes?.offers || [];
      setOffers(rawOffers);
      const jobs = jobsRes?.data?.activeJobs || jobsRes?.activeJobs || [];
      setActiveJobs(jobs);

      // Compute simple stats from jobs
      const confirmedOrPaid = jobs.filter((j) => ['confirmed', 'paid', 'completed'].includes(j.status));
      setStats({
        completedToday: confirmedOrPaid.length,
        totalWeightKg: confirmedOrPaid.reduce((acc, j) => acc + (j.totalPickupWeightKg || 0), 0),
        totalCashPaid: confirmedOrPaid.reduce((acc, j) => acc + (j.totalAmountPaise || 0) / 100, 0),
      });
    } catch (err) {
      console.error('Error fetching collector dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollectorData();
    // Poll offers every 4 seconds for fast offer pickup
    const interval = setInterval(fetchCollectorData, 4000);
    return () => clearInterval(interval);
  }, []);

  // Listen for socket events
  useEffect(() => {
    if (!socket) return;

    const handleOfferOrStatus = () => {
      fetchCollectorData();
    };

    socket.on('pickup.offered', handleOfferOrStatus);
    socket.on('pickup.status.changed', handleOfferOrStatus);

    return () => {
      socket.off('pickup.offered', handleOfferOrStatus);
      socket.off('pickup.status.changed', handleOfferOrStatus);
    };
  }, [socket]);

  // Toggle online availability
  const handleToggleOnline = async () => {
    try {
      const nextStatus = !isOnline;
      await api.patch('/collector/status', { isOnline: nextStatus });
      setIsOnline(nextStatus);
    } catch (err) {
      alert(err.message || 'Failed to update online status');
    }
  };

  // Accept incoming offer
  const handleAcceptOffer = async (pickupId) => {
    setRespondingOfferId(pickupId);
    try {
      await api.post(`/collector/pickups/${pickupId}/accept`);
      await fetchCollectorData();
      navigate(`/collector/pickups/${pickupId}`);
    } catch (err) {
      alert(err.message || 'Offer already expired or accepted by another collector');
      fetchCollectorData();
    } finally {
      setRespondingOfferId(null);
    }
  };

  // Decline incoming offer
  const handleDeclineOffer = async (pickupId) => {
    setRespondingOfferId(pickupId);
    try {
      await api.post(`/collector/pickups/${pickupId}/decline`);
      setOffers((prev) => prev.filter((o) => o._id !== pickupId));
    } catch (err) {
      console.error('Error declining offer:', err);
    } finally {
      setRespondingOfferId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Collector Profile & Status Card */}
      <div className="bg-gradient-to-br from-teal-800 to-emerald-900 text-white rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-2xs font-semibold bg-white/20 text-white px-2.5 py-1 rounded-full uppercase tracking-wider">
            Kaalaankadai Partner
          </span>
          <div className="flex items-center gap-1 bg-amber-400 text-amber-950 font-bold text-xs px-2.5 py-1 rounded-full shadow-xs">
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>{user?.rating?.avg?.toFixed(1) || '4.9'} / 5.0</span>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-black">
            Vanakkam, {user?.name || 'Partner'}! 🚚
          </h2>
          <p className="text-xs text-teal-200 mt-0.5">
            Zone: <span className="font-semibold text-white">Chennai Central</span>
          </p>
        </div>

        {/* Online/Offline Toggle */}
        <div className="pt-3 border-t border-white/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
              }`}
            ></span>
            <span className="text-xs font-bold text-white">
              {isOnline ? 'Active & Ready for Pickups' : 'Currently Offline'}
            </span>
          </div>

          <button
            onClick={handleToggleOnline}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs ${
              isOnline
                ? 'bg-rose-500 hover:bg-rose-600 text-white'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white'
            }`}
          >
            {isOnline ? 'Go Offline' : 'Go Online'}
          </button>
        </div>
      </div>

      {/* Daily Performance Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center shadow-xs">
          <p className="text-2xs text-slate-500 font-semibold uppercase">Visits Today</p>
          <p className="text-lg font-black text-slate-900 mt-0.5">{stats.completedToday}</p>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center shadow-xs">
          <p className="text-2xs text-slate-500 font-semibold uppercase">Scrap (Kg)</p>
          <p className="text-lg font-black text-emerald-600 mt-0.5">
            {stats.totalWeightKg.toFixed(1)}
          </p>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center shadow-xs">
          <p className="text-2xs text-slate-500 font-semibold uppercase">Cash Paid</p>
          <p className="text-lg font-black text-slate-900 mt-0.5">
            ₹{stats.totalCashPaid.toFixed(0)}
          </p>
        </div>
      </div>

      {/* 60-Second Incoming Offer Modal / Card */}
      {offers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
              Incoming Pickup Offers ({offers.length})
            </h3>
            <span className="text-2xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
              60s Timer Active
            </span>
          </div>

          {offers.map((offer) => (
            <div
              key={offer._id}
              className="bg-amber-50/80 border-2 border-amber-400 rounded-3xl p-4 shadow-md space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-2xs font-black bg-amber-200 text-amber-950 px-2 py-0.5 rounded-md uppercase">
                  New Match
                </span>
                <span className="text-xs font-mono font-bold text-amber-900">
                  Prefer: {offer.pricingMode} mode
                </span>
              </div>

              <div>
                <h4 className="text-sm font-black text-slate-900">
                  {offer.customerId?.name || 'Customer Pickup'}
                </h4>
                <p className="text-xs text-slate-700 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  {offer.address}
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => handleAcceptOffer(offer._id)}
                  disabled={respondingOfferId === offer._id}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {respondingOfferId === offer._id ? 'Accepting...' : 'Accept Job'}
                </button>

                <button
                  onClick={() => handleDeclineOffer(offer._id)}
                  disabled={respondingOfferId === offer._id}
                  className="px-4 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Pass
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active Jobs List */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-emerald-600" />
            Active Collection Route ({activeJobs.length})
          </h3>
          <span className="text-2xs font-semibold text-slate-400">Doorstep Visits</span>
        </div>

        {activeJobs.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
              <Truck className="w-5 h-5" />
            </div>
            <p className="text-xs text-slate-500 font-medium">
              No active pickups right now. Stay online to receive jobs in your zone!
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {activeJobs.map((job) => (
              <div
                key={job._id}
                onClick={() => navigate(`/collector/pickups/${job._id}`)}
                className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 hover:border-emerald-400 transition-all cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xs font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md uppercase">
                    {job.status.replace('_', ' ')}
                  </span>
                  <span className="text-2xs font-mono text-slate-400">
                    #{job._id.slice(-6).toUpperCase()}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-900">{job.customerId?.name}</h4>
                  <p className="text-2xs text-slate-600 flex items-center gap-1 mt-0.5 truncate">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    {job.address}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-2xs">
                  <span className="text-slate-500 capitalize">{job.pricingMode} mode</span>
                  <span className="font-bold text-emerald-700 flex items-center gap-0.5">
                    Open Job Card <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* End of Day Batch QR Button */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-400" />
            <div>
              <h4 className="text-xs font-bold">End-of-Day Central Store Deposit</h4>
              <p className="text-2xs text-slate-400">Handover collected scrap bags at warehouse</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/collector/batch')}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <QrCode className="w-3.5 h-3.5" />
          Generate Deposit QR Code
        </button>
      </div>
    </div>
  );
};

export default CollectorHome;
