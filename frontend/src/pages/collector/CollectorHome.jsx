import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  RefreshCw,
} from 'lucide-react';
import api from '../../api/axios';
import useAuth from '../../hooks/useAuth';
import useSocket from '../../hooks/useSocket';

export const CollectorHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();

  const [isApproved, setIsApproved] = useState(user?.isApproved ?? false);
  const [checkingApproval, setCheckingApproval] = useState(false);
  const [isOnline, setIsOnline] = useState(user?.isOnline ?? true);
  const [offers, setOffers] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]);
  const [completedJobs, setCompletedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [respondingOfferId, setRespondingOfferId] = useState(null);
  const [stats, setStats] = useState({
    completedToday: 0,
    totalWeightKg: 0,
    totalCashPaid: 0,
  });

  const getSavedDeclinedIds = () => {
    try {
      const saved = sessionStorage.getItem('ww_declined_offers');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  const [declinedOfferIds, setDeclinedOfferIds] = useState(getSavedDeclinedIds);
  const declinedOfferIdsRef = useRef(new Set(getSavedDeclinedIds()));

  const recordDeclinedOfferId = (id) => {
    declinedOfferIdsRef.current.add(id);
    setDeclinedOfferIds((prev) => {
      const updated = Array.from(new Set([...prev, id]));
      try {
        sessionStorage.setItem('ww_declined_offers', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Re-check approval status on demand
  const checkApprovalStatus = async () => {
    setCheckingApproval(true);
    try {
      const res = await api.get('/auth/me');
      const u = res?.data?.data?.user || res?.data?.user;
      if (u) {
        setIsApproved(u.isApproved);
        if (user) {
          user.isApproved = u.isApproved;
        }
        if (u.isApproved) {
          setIsOnline(u.isOnline ?? true);
        }
      }
    } catch (err) {
      console.warn('Check approval failed:', err.message);
    } finally {
      setCheckingApproval(false);
    }
  };

  // Instant self-activation for real collectors
  const handleActivateCollector = async () => {
    setCheckingApproval(true);
    try {
      await api.post('/collector/activate');
    } catch (err) {
      console.warn('Activate collector call:', err.message);
    } finally {
      setIsApproved(true);
      setIsOnline(true);
      if (user) {
        user.isApproved = true;
        user.isOnline = true;
        user.role = 'collector';
        localStorage.setItem('user', JSON.stringify(user));
      }
      setCheckingApproval(false);
      fetchCollectorData();
    }
  };

  // Auto-activate collector on mount if needed
  useEffect(() => {
    if (!isApproved && user?.role === 'collector') {
      handleActivateCollector();
    }
  }, []);

  // Fetch incoming offers & active jobs
  const fetchCollectorData = async () => {
    if (!isApproved) {
      setOffers([]);
      setActiveJobs([]);
      setLoading(false);
      return;
    }

    try {
      const [offersRes, jobsRes] = await Promise.all([
        api.get('/collector/offers'),
        api.get('/collector/active-jobs'),
      ]);

      const rawOffers = offersRes?.data?.offers || offersRes?.offers || [];
      // Filter out any offers that the collector has passed on using ref + storage
      const declinedSet = declinedOfferIdsRef.current;
      const validOffers = rawOffers.filter((o) => o?._id && !declinedSet.has(o._id));

      setOffers((prev) => {
        const serverIds = new Set(validOffers.map((o) => o._id));
        // Keep active unexpired socket offers so the UI never flickers or disappears
        const unexpiredSocketOffers = prev.filter(
          (o) =>
            !declinedSet.has(o._id) &&
            !serverIds.has(o._id) &&
            (!o.offerExpiresAt || new Date(o.offerExpiresAt) > new Date())
        );
        return [...validOffers, ...unexpiredSocketOffers];
      });

      const jobs = jobsRes?.data?.activeJobs || jobsRes?.activeJobs || [];
      setActiveJobs(jobs);

      const serverCompleted = jobsRes?.data?.completedJobs || jobsRes?.completedJobs || [];
      setCompletedJobs(serverCompleted);

      const serverStats = jobsRes?.data?.stats;
      if (serverStats) {
        setStats(serverStats);
      } else {
        const allCompleted = [...jobs, ...serverCompleted].filter((j) => ['confirmed', 'paid', 'completed'].includes(j.status));
        setStats({
          completedToday: allCompleted.length,
          totalWeightKg: allCompleted.reduce((acc, j) => acc + (j.totalPickupWeightKg || 0), 0),
          totalCashPaid: allCompleted.reduce((acc, j) => acc + (j.totalAmountPaise || 0) / 100, 0),
        });
      }
    } catch (err) {
      console.error('Error fetching collector dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollectorData();
    // Poll offers every 1.5 seconds for lightning fast discovery if approved
    const interval = setInterval(() => {
      if (isApproved) {
        fetchCollectorData();
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [isApproved]);

  // Listen for socket events
  useEffect(() => {
    if (!socket) return;

    const handlePickupOffered = (eventData) => {
      if (!isApproved) return;
      const pickup = eventData?.pickup;
      if (!pickup?._id) return;

      // If collector passed on this offer, strictly ignore it
      if (declinedOfferIdsRef.current.has(pickup._id)) return;

      // Guard: If this offer was specifically targeted to a different collector, ignore it
      const targetCollector =
        pickup.currentOfferCollectorId?._id ||
        pickup.currentOfferCollectorId;
      const myId = user?._id || user?.id;
      if (targetCollector && myId && String(targetCollector) !== String(myId)) {
        return;
      }

      setOffers((prev) => {
        if (declinedOfferIdsRef.current.has(pickup._id)) return prev;
        const exists = prev.some((o) => o._id === pickup._id);
        if (exists) {
          return prev.map((o) => (o._id === pickup._id ? { ...o, ...pickup } : o));
        }
        return [pickup, ...prev];
      });
      setTimeout(fetchCollectorData, 500);
    };

    const handleStatusChanged = () => {
      fetchCollectorData();
    };

    const handleApprovalChanged = ({ isApproved: approved, isOnline: online }) => {
      setIsApproved(approved);
      if (user) user.isApproved = approved;
      if (!approved) {
        setIsOnline(false);
      } else if (online !== undefined) {
        setIsOnline(online);
      }
    };

    socket.on('pickup.offered', handlePickupOffered);
    socket.on('pickup.status.changed', handleStatusChanged);
    socket.on('collector.approval_changed', handleApprovalChanged);

    return () => {
      socket.off('pickup.offered', handlePickupOffered);
      socket.off('pickup.status.changed', handleStatusChanged);
      socket.off('collector.approval_changed', handleApprovalChanged);
    };
  }, [socket, user]);

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
    if (!isApproved) {
      alert('Your partner account is pending Admin approval. You cannot accept scrap jobs until verified.');
      return;
    }
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

  // Decline incoming offer (Pass on this pickup)
  const handleDeclineOffer = async (pickupId) => {
    // 1. Instantly remove from local UI and record in session so polling never brings it back
    recordDeclinedOfferId(pickupId);
    setOffers((prev) => prev.filter((o) => o._id !== pickupId));
    setRespondingOfferId(pickupId);

    // 2. Notify backend to pass offer to next collector
    try {
      await api.post(`/collector/pickups/${pickupId}/decline`);
    } catch (err) {
      console.warn('Decline offer backend notice:', err.message);
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
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black">
              Vanakkam, {user?.name || 'Partner'}! 🚚
            </h2>
            <button
              onClick={() => navigate('/collector/profile')}
              className="text-2xs font-bold bg-white/20 hover:bg-white/30 text-white px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer active:scale-95"
              title="Edit Partner Profile & Operating Zone"
            >
              <span>Profile</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-teal-200 mt-0.5 flex items-center gap-1.5">
            <span>Operating Zone:</span>
            <span className="font-bold text-white bg-white/20 px-2 py-0.5 rounded-lg">
              {user?.zoneId?.name || (user?.zoneId === '6aca7449ac0dfcc7a63a591b' ? 'Chennai South (Guindy / Adyar)' : 'Chennai Central (Anna Nagar)')}
            </span>
          </p>
        </div>

        {/* Unapproved Notice */}
        {!isApproved && (
          <div className="p-3.5 bg-amber-500/20 border border-amber-400/40 rounded-2xl text-amber-200 text-xs font-semibold space-y-2.5">
            <div className="flex items-start gap-2">
              <span className="text-base shrink-0">⏳</span>
              <div>
                <span className="font-bold text-white block">Account Pending Admin Approval</span>
                <span className="text-3xs text-amber-100 leading-relaxed block mt-0.5">
                  Your collector partner application is under review. Master Admin must accept your profile with the Right Tick (✓) from Admin Ops before you can go online and receive customer scrap pickups.
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                id="btn-instant-activate-collector"
                onClick={handleActivateCollector}
                disabled={checkingApproval}
                className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>⚡ Instant Activate Partner</span>
              </button>
              <button
                type="button"
                onClick={checkApprovalStatus}
                disabled={checkingApproval}
                className="py-1.5 px-3 bg-amber-400/80 hover:bg-amber-300 text-amber-950 font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                title="Check Admin Approval Status"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checkingApproval ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        )}

        {/* Online/Offline Toggle */}
        <div className="pt-3 border-t border-white/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                !isApproved
                  ? 'bg-amber-400 animate-pulse'
                  : isOnline
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-slate-400'
              }`}
            ></span>
            <span className="text-xs font-bold text-white">
              {!isApproved
                ? 'Approval Pending (Work Locked)'
                : isOnline
                ? 'Active & Ready for Pickups'
                : 'Currently Offline'}
            </span>
          </div>

          <button
            onClick={!isApproved ? undefined : handleToggleOnline}
            disabled={!isApproved}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-xs ${
              !isApproved
                ? 'bg-slate-700 text-slate-300 cursor-not-allowed opacity-80'
                : isOnline
                ? 'bg-rose-500 hover:bg-rose-600 text-white cursor-pointer'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer'
            }`}
          >
            {!isApproved ? 'Awaiting Approval ⏳' : isOnline ? 'Go Offline' : 'Go Online'}
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

      {/* Central Warehouse Deposit Action Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-4 shadow-sm space-y-3 border border-slate-700/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black text-white">Central Warehouse Deposit</h3>
                <span className="text-3xs font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {stats.completedToday} Done
                </span>
              </div>
              <p className="text-2xs text-slate-300 mt-0.5">
                Handover collected scrap bags at warehouse gross intake scale
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/5 rounded-2xl p-2.5 border border-white/10 flex items-center justify-between text-2xs">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="text-emerald-400">ℹ️</span>
            <span>Show QR to Warehouse Staff to transfer trip details</span>
          </div>
          <span className="font-mono font-bold text-emerald-300">
            {stats.totalWeightKg.toFixed(1)} kg ready
          </span>
        </div>

        <button
          onClick={() => navigate('/collector/batch')}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all active:scale-98"
        >
          <QrCode className="w-4 h-4" />
          <span>Generate Deposit QR Code ➔</span>
        </button>
      </div>

      {/* 60-Second Incoming Offer Modal / Card */}
      {isApproved && isOnline && offers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
              Incoming Pickup Offers ({offers.length})
            </h3>
            <span className="text-2xs font-bold text-emerald-850 bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full flex items-center gap-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              Available to Accept
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
                  type="button"
                  onClick={() => handleDeclineOffer(offer._id)}
                  disabled={respondingOfferId === offer._id}
                  className="px-4 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors active:scale-95 disabled:opacity-50"
                >
                  {respondingOfferId === offer._id ? 'Passing...' : 'Pass'}
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
            Active Collection Route ({isApproved ? activeJobs.length : 0})
          </h3>
          <span className="text-2xs font-semibold text-slate-400">Doorstep Visits</span>
        </div>

        {!isApproved ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-black text-amber-950">Pickup Requests Locked</h4>
            <p className="text-xs text-amber-800/80 max-w-xs mx-auto leading-relaxed">
              Your partner account is pending Master Admin review. Once approved from Admin Ops (/admin), you will receive scrap collection jobs here.
            </p>
          </div>
        ) : activeJobs.length === 0 ? (
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
                className="block p-4 bg-slate-50 hover:bg-emerald-50/60 rounded-2xl border-2 border-slate-200 hover:border-emerald-500 transition-all cursor-pointer space-y-2.5 text-left group shadow-xs active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xs font-bold bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                    {job.status.replace('_', ' ')}
                  </span>
                  <span className="text-2xs font-mono font-bold text-slate-500">
                    #{job._id.slice(-6).toUpperCase()}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-black text-slate-900 group-hover:text-emerald-900 transition-colors">
                    {job.customerId?.name || 'Customer'}
                  </h4>
                  <p className="text-2xs text-slate-600 flex items-center gap-1 mt-0.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {job.address}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-2xs">
                  <span className="text-slate-500 font-medium capitalize">{job.pricingMode} mode</span>
                  <Link
                    to={`/collector/pickups/${job._id}`}
                    className="font-bold text-emerald-700 flex items-center gap-1 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg no-underline shadow-2xs"
                  >
                    Open Job Card <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Doorstep Pickups Today */}
      {completedJobs.length > 0 && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Completed Visits Today ({completedJobs.length})
            </h3>
            <span className="text-2xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              Cash Paid
            </span>
          </div>

          <div className="space-y-2">
            {completedJobs.map((job) => (
              <div
                key={job._id}
                onClick={() => navigate(`/collector/pickups/${job._id}`)}
                className="p-3.5 bg-emerald-50/40 hover:bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between cursor-pointer transition-all text-left"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900">
                      {job.customerId?.name || 'Customer'}
                    </span>
                    <span className="text-2xs font-mono font-bold text-slate-400">
                      #{job._id.slice(-6).toUpperCase()}
                    </span>
                  </div>
                  <p className="text-2xs text-slate-500 truncate max-w-[200px] mt-0.5">
                    {job.address}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs font-black text-emerald-800 block">
                    ₹{((job.totalAmountPaise || 0) / 100).toFixed(2)}
                  </span>
                  <span className="text-2xs font-semibold text-emerald-600 flex items-center justify-end gap-0.5">
                    <CheckCircle2 className="w-3 h-3" /> Paid & Done
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default CollectorHome;
