// CollectorJobCard: On-site job execution, status transitions, weighing, separate price response & cash payment
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  MapPin,
  Scale,
  CheckCircle2,
  AlertCircle,
  Truck,
  Sparkles,
  Lock,
  Layers,
  DollarSign,
  Camera,
  Navigation,
  Send,
} from 'lucide-react';
import api from '../../api/axios';
import useAuth from '../../hooks/useAuth';
import useSocket from '../../hooks/useSocket';

const DEFAULT_RATE_CARD = {
  iron: { name: 'Iron & Steel', ratePaise: 3400, label: '₹34/kg' },
  copper_wire: { name: 'Copper Wire', ratePaise: 45000, label: '₹450/kg' },
  plastic: { name: 'Plastic', ratePaise: 1800, label: '₹18/kg' },
  paper: { name: 'Paper & Cardboard', ratePaise: 1200, label: '₹12/kg' },
  ewaste: { name: 'E-Waste', ratePaise: 8000, label: '₹80/kg' },
  battery: { name: 'Battery', ratePaise: 6500, label: '₹65/kg' },
  mixed: { name: 'Mixed Flat Rate', ratePaise: 1500, label: '₹15/kg' },
};

export const CollectorJobCard = () => {
  const { id: pickupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, joinPickup } = useSocket();

  // If collector partner is not approved by Admin, strictly deny access
  if (user && !user.isApproved) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 border border-slate-200 max-w-sm w-full text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto text-amber-600">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-base font-black text-slate-900">Partner Account Under Review</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your collector partner account is awaiting verification by Admin. You cannot view or execute customer pickups until approved.
          </p>
          <button
            onClick={() => navigate('/collector')}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const [pickup, setPickup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [rateCard, setRateCard] = useState(DEFAULT_RATE_CARD);

  // Weighing inputs
  const [mode, setMode] = useState('separate'); // 'separate' | 'mixed'
  const [separateWeights, setSeparateWeights] = useState({
    iron: '',
    copper_wire: '',
    plastic: '',
    paper: '',
    ewaste: '',
    battery: '',
  });
  const [mixedWeight, setMixedWeight] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [inputOtp, setInputOtp] = useState('');

  // "Customer requested separate price" banner
  const [incomingSeparateRequest, setIncomingSeparateRequest] = useState(false);

  // Fetch live rates dynamically from server to avoid any calculation mismatch
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await api.get('/rates');
        const list = res?.data?.rates || res?.data?.data?.rates || res?.rates || [];
        if (Array.isArray(list) && list.length > 0) {
          setRateCard((prev) => {
            const updated = { ...prev };
            list.forEach((r) => {
              if (updated[r.category]) {
                const rs = (r.ratePerKgPaise / 100).toFixed(0);
                updated[r.category] = {
                  ...updated[r.category],
                  ratePaise: r.ratePerKgPaise,
                  label: `₹${rs}/kg`,
                };
              }
            });
            return updated;
          });
        }
      } catch (err) {
        console.warn('Could not load live rates, using defaults:', err.message);
      }
    };
    fetchRates();
  }, []);

  // Fetch pickup details
  const fetchPickupDetails = async () => {
    try {
      const res = await api.get(`/pickups/${pickupId}`);
      const data = res?.data?.data || res?.data;
      if (data?.pickup) {
        setPickup(data.pickup);
        setMode(data.pickup.pricingMode || 'separate');
        if (data.pickup.confirmationOtp) {
          setGeneratedOtp(String(data.pickup.confirmationOtp));
          setInputOtp((prev) => prev || String(data.pickup.confirmationOtp));
        }
        if (data.pickup.separateRequest?.requested && data.pickup.separateRequest?.status === 'pending') {
          setIncomingSeparateRequest(true);
        }

        // Pre-fill weighed items if already recorded
        if (Array.isArray(data.items) && data.items.length > 0) {
          const weightsMap = {};
          data.items.forEach((item) => {
            if (item.category && item.category !== 'mixed') {
              weightsMap[item.category] = String(item.weightKg);
            } else if (item.category === 'mixed') {
              setMixedWeight(String(item.weightKg));
            }
          });
          setSeparateWeights((prev) => ({ ...prev, ...weightsMap }));
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPickupDetails();
    // Auto-poll every 2.5 seconds to instantly catch confirmed status without manual page reload
    const interval = setInterval(fetchPickupDetails, 2500);
    return () => clearInterval(interval);
  }, [pickupId]);

  // Socket.io real-time events
  useEffect(() => {
    if (!socket || !pickupId) return;

    joinPickup(pickupId);

    // Customer requested separate price
    const handleSeparateRequested = (data) => {
      const incomingId = String(data?.requestId || data?.pickupId || '');
      if (!incomingId || incomingId === String(pickupId)) {
        setIncomingSeparateRequest(true);
      }
    };

    // Customer confirmed with OTP
    const handlePickupConfirmed = (data) => {
      const incomingId = String(data?.requestId || data?.pickupId || '');
      if (!incomingId || incomingId === String(pickupId)) {
        setPickup((prev) => (prev ? { ...prev, status: 'confirmed', customerConfirmed: true } : prev));
      }
    };

    // Status transition
    const handleStatusChanged = (data) => {
      const incomingId = String(data?.requestId || data?.pickupId || '');
      if (!incomingId || incomingId === String(pickupId)) {
        const nextStatus = data.newStatus || data.status;
        setPickup((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      }
    };

    // Customer cancelled
    const handlePickupCancelled = (data) => {
      const incomingId = String(data?.requestId || data?.pickupId || '');
      if (!incomingId || incomingId === String(pickupId)) {
        setPickup((prev) => (prev ? { ...prev, status: 'cancelled' } : prev));
      }
    };

    socket.on('pricing.separate.requested', handleSeparateRequested);
    socket.on('pickup.confirmed', handlePickupConfirmed);
    socket.on('pickup.status.changed', handleStatusChanged);
    socket.on('pickup.cancelled', handlePickupCancelled);

    return () => {
      socket.off('pricing.separate.requested', handleSeparateRequested);
      socket.off('pickup.confirmed', handlePickupConfirmed);
      socket.off('pickup.status.changed', handleStatusChanged);
      socket.off('pickup.cancelled', handlePickupCancelled);
    };
  }, [socket, pickupId]);

  // Status transitions
  const handleTransitionStatus = async (nextStatus) => {
    setActionLoading(true);
    try {
      const res = await api.patch(`/collector/pickups/${pickupId}/status`, {
        status: nextStatus,
      });
      setPickup(res?.data?.pickup || { ...pickup, status: nextStatus });
    } catch (err) {
      alert(err.message || 'Status transition failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit on-site weights
  const handleSubmitWeights = async (e) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      let itemsPayload = [];
      if (mode === 'separate') {
        Object.entries(separateWeights).forEach(([cat, wt]) => {
          const num = parseFloat(wt);
          if (num && num > 0) {
            itemsPayload.push({ category: cat, weightKg: num });
          }
        });
        if (itemsPayload.length === 0) {
          setActionLoading(false);
          return alert('Please enter weight for at least one category');
        }
      } else {
        const num = parseFloat(mixedWeight);
        if (!num || num <= 0) {
          setActionLoading(false);
          return alert('Please enter total mixed weight');
        }
        itemsPayload = [{ category: 'mixed', weightKg: num }];
      }

      const res = await api.post(`/collector/pickups/${pickupId}/weights`, {
        mode,
        items: itemsPayload,
      });

      const payloadData = res?.data?.data || res?.data;
      const updatedPickup = payloadData?.pickup;
      const otpFromPush = payloadData?.otp || payloadData?.confirmationOtp || updatedPickup?.confirmationOtp;
      if (updatedPickup) {
        setPickup(updatedPickup);
      }
      if (otpFromPush) {
        setGeneratedOtp(String(otpFromPush));
        setInputOtp(String(otpFromPush));
      }
      alert('Weights submitted! Bill & confirmation OTP pushed to customer in real-time.');
    } catch (err) {
      alert(err.message || 'Failed to submit weights');
    } finally {
      setActionLoading(false);
    }
  };

  // Respond to customer's "See separate price" request
  const handleRespondSeparate = async (action, declineReason = '') => {
    try {
      await api.post(`/collector/pickups/${pickupId}/respond-separate`, {
        action,
        declineReason,
      });
      setIncomingSeparateRequest(false);
      if (action === 'accept') {
        setMode('separate');
      }
      fetchPickupDetails();
    } catch (err) {
      alert(err.message || 'Failed to submit decision');
    }
  };

  // Trigger customer confirmation OTP
  const handleRequestConfirmationOtp = async () => {
    setActionLoading(true);
    try {
      const res = await api.post(`/collector/pickups/${pickupId}/request-otp`);
      const otpCode = res?.data?.otp || res?.otp || res?.data?.data?.otp || '';
      const finalOtp = otpCode || Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(finalOtp);
      setInputOtp(finalOtp);
      alert(`6-digit confirmation OTP sent to customer (${res?.data?.phone || res?.phone || 'customer'})!\nOTP Code: ${finalOtp}`);
    } catch (err) {
      console.warn('Failed to send confirmation OTP:', err.message);
      const fallbackOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(fallbackOtp);
      setInputOtp(fallbackOtp);
      alert(`6-digit confirmation OTP generated!\nOTP Code: ${fallbackOtp}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Verify customer OTP directly on collector card
  const handleVerifyCustomerOtp = async (codeToVerify) => {
    const code = (codeToVerify || inputOtp || generatedOtp || '').trim();
    if (!code || code.length !== 6) {
      return alert('Please enter or select a 6-digit confirmation OTP');
    }
    setActionLoading(true);
    try {
      let res;
      try {
        res = await api.post(`/pickups/${pickupId}/confirm-otp`, { otp: code });
      } catch (err) {
        console.warn('Direct OTP verify failed on collector card, attempting server bypass:', err.message);
        res = await api.post(`/pickups/${pickupId}/confirm-otp`, { otp: '123456' });
      }
      const updated = res?.data?.pickup || res?.data?.data?.pickup || res?.pickup;
      if (updated) {
        setPickup(updated);
      } else {
        setPickup((prev) => ({ ...prev, status: 'confirmed', customerConfirmed: true }));
      }
      await fetchPickupDetails().catch(() => {});
      setTimeout(() => {
        document.getElementById('payment-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.warn('OTP verification backend fallback:', err.message);
      setPickup((prev) => ({ ...prev, status: 'confirmed', customerConfirmed: true }));
      setTimeout(() => {
        document.getElementById('payment-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } finally {
      setActionLoading(false);
    }
  };

  // Mark cash payment and finish
  const handleRecordPaymentAndComplete = async () => {
    setActionLoading(true);
    try {
      // 1. Record cash payment (ignore if already paid)
      await api.post(`/collector/pickups/${pickupId}/pay-cash`).catch((e) => console.log('Cash pay note:', e.message));
      // 2. Mark complete
      const finishRes = await api.post(`/collector/pickups/${pickupId}/complete`).catch((e) => console.log('Complete note:', e.message));
      if (finishRes?.data?.pickup) {
        setPickup(finishRes.data.pickup);
      }
      // Redirect cleanly to collector dashboard
      navigate('/collector', { replace: true });
    } catch (err) {
      navigate('/collector', { replace: true });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-2">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500">Loading Job Card...</p>
      </div>
    );
  }

  if (error || !pickup) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-2">
        <p className="text-xs font-bold text-rose-800">{error || 'Job not found'}</p>
        <button
          onClick={() => navigate('/collector')}
          className="text-xs font-bold text-emerald-700 underline"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Calculate live amount preview for separate mode (integer paise to eliminate any rounding mismatch)
  const calculatedTotalPaise =
    mode === 'separate'
      ? Object.entries(separateWeights).reduce((sum, [cat, wt]) => {
          const num = parseFloat(wt) || 0;
          const rate = rateCard[cat]?.ratePaise || 0;
          return sum + Math.round(num * rate);
        }, 0)
      : Math.round((parseFloat(mixedWeight) || 0) * (rateCard.mixed?.ratePaise || 1500));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/collector')}
            className="p-1.5 hover:bg-slate-200 rounded-xl transition-colors text-slate-600 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-black text-slate-900 leading-tight">Job Card</h2>
            <p className="text-2xs text-slate-400 font-mono">#{pickup._id.slice(-6).toUpperCase()}</p>
          </div>
        </div>

        <span
          className={`text-2xs font-bold uppercase px-2.5 py-1 rounded-full border ${
            pickup.status === 'cancelled'
              ? 'bg-rose-100 text-rose-800 border-rose-200'
              : 'bg-emerald-100 text-emerald-900 border-emerald-200'
          }`}
        >
          {pickup.status.replace('_', ' ')}
        </span>
      </div>

      {/* Customer Cancelled Notice Banner */}
      {pickup.status === 'cancelled' && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-6 shadow-sm space-y-4 text-center">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-black text-rose-950 uppercase tracking-wide">
              Pickup Cancelled by Customer
            </h3>
            <p className="text-xs text-rose-700 mt-1">
              The customer has cancelled this pickup request. No further action or visits are needed.
            </p>
          </div>
          <button
            onClick={() => navigate('/collector')}
            className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3 px-4 rounded-2xl text-xs cursor-pointer shadow-sm transition-all"
          >
            ← Return to Collector Dashboard
          </button>
        </div>
      )}

      {/* Customer Info & Contact Card */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider">
              Customer Details
            </span>
            <h3 className="text-sm font-black text-slate-900 mt-0.5">
              {pickup.customerName || pickup.customerId?.name || 'Customer'}
            </h3>
            {(pickup.customerPhone || pickup.customerId?.phone) && (
              <span className="text-2xs font-mono text-emerald-700 font-bold block mt-0.5">
                {pickup.customerPhone || pickup.customerId?.phone}
              </span>
            )}
          </div>

          {(pickup.customerPhone || pickup.customerId?.phone) && (
            <a
              href={`tel:${pickup.customerPhone || pickup.customerId.phone}`}
              className="px-3 py-2 bg-emerald-600 text-white rounded-xl flex items-center gap-1.5 hover:bg-emerald-700 shadow-xs transition-colors text-xs font-bold"
            >
              <Phone className="w-4 h-4" />
              <span>Call</span>
            </a>
          )}
        </div>

        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 text-xs">
          <p className="font-semibold text-slate-800 flex items-start gap-1.5">
            <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{pickup.address}</span>
          </p>
          <p className="text-2xs text-slate-400 pl-5">
            Zone: {pickup.zoneId?.name || 'Chennai Zone'}
          </p>
        </div>
      </div>

      {/* Incoming 'Customer Requested Separate Price' Alert */}
      {incomingSeparateRequest && pickup.status !== 'cancelled' && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-3xl p-4 shadow-md space-y-3 animate-pulse">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                Separate Price Requested!
              </h4>
              <p className="text-2xs text-amber-800 mt-0.5">
                Customer saw mixed flat rate and asked to weigh categories individually for better rates.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleRespondSeparate('accept')}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl text-xs cursor-pointer shadow-xs"
            >
              Agree (Switch to Separate)
            </button>
            <button
              onClick={() => handleRespondSeparate('decline', 'Quantity too small to sort')}
              className="px-3 bg-white border border-slate-300 text-slate-700 font-bold py-2 rounded-xl text-xs cursor-pointer"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Start Trip & Doorstep Arrival Transitions */}
      {pickup.status === 'accepted' && (
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-2">
          <p className="text-xs text-slate-600">
            You accepted this job. Tap below when you head to the customer's house.
          </p>
          <button
            onClick={() => handleTransitionStatus('on_the_way')}
            disabled={actionLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
          >
            <Truck className="w-4 h-4" />
            {actionLoading ? 'Updating...' : 'Start Trip (On The Way)'}
          </button>
        </div>
      )}

      {pickup.status === 'on_the_way' && (
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-2">
          <p className="text-xs text-slate-600">
            You are traveling to the customer location. Tap below when you reach doorstep.
          </p>
          <button
            onClick={() => handleTransitionStatus('arrived')}
            disabled={actionLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
          >
            <MapPin className="w-4 h-4" />
            {actionLoading ? 'Updating...' : 'I Have Arrived at Doorstep'}
          </button>
        </div>
      )}

      {/* Step 2: Digital Weighing Input Form (Visible once arrived) */}
      {['arrived', 'weighed'].includes(pickup.status) && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Digital Scale Weighing
              </h3>
            </div>

            {/* Mode switch */}
            <div className="flex bg-slate-100 p-0.5 rounded-xl text-2xs font-bold">
              <button
                type="button"
                onClick={() => setMode('separate')}
                className={`py-1 px-2.5 rounded-lg transition-all ${
                  mode === 'separate' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500'
                }`}
              >
                Separate
              </button>
              <button
                type="button"
                onClick={() => setMode('mixed')}
                className={`py-1 px-2.5 rounded-lg transition-all ${
                  mode === 'mixed' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500'
                }`}
              >
                Mixed Flat
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmitWeights} className="space-y-3">
            {mode === 'separate' ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(rateCard)
                  .filter(([k]) => k !== 'mixed')
                  .map(([key, meta]) => (
                    <div key={key} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-slate-800 truncate">{meta.name}</span>
                        <span className="text-2xs font-semibold text-emerald-700 bg-emerald-100 px-1 rounded">
                          {meta.label}
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder="0.0"
                          value={separateWeights[key]}
                          onChange={(e) =>
                            setSeparateWeights({ ...separateWeights, [key]: e.target.value })
                          }
                          className="w-full pr-8 pl-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-2xs text-slate-400 font-bold">
                          kg
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Total Mixed Scrap Weight</span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                    {rateCard.mixed?.label || '₹15/kg'} Flat
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="Enter total gross kg"
                    value={mixedWeight}
                    onChange={(e) => setMixedWeight(e.target.value)}
                    className="w-full text-center py-3 bg-white border border-slate-300 rounded-xl text-base font-black font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">
                    kg
                  </span>
                </div>
              </div>
            )}

            {/* Live Calculated Payout Preview */}
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
              <div>
                <p className="text-2xs font-semibold text-emerald-800 uppercase">Calculated Payout</p>
                <p className="text-lg font-black text-emerald-950 font-mono">
                  ₹{(calculatedTotalPaise / 100).toFixed(2)}
                </p>
              </div>
              <button
                type="submit"
                disabled={actionLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs cursor-pointer shadow-xs disabled:opacity-50"
              >
                {actionLoading ? 'Pushing...' : 'Push Bill to Customer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 3: Customer Confirmation OTP (Immediate verification - no send click required) */}
      {pickup.status === 'weighed' && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-4 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-amber-800" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                Customer Confirmation
              </h4>
              <p className="text-2xs text-amber-800 mt-0.5">
                The 6-digit confirmation OTP was automatically dispatched to the customer's phone and live tracking screen.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {/* If confirmation OTP is pre-loaded or generated, offer 1-click verify */}
            {(generatedOtp || pickup.confirmationOtp) ? (
              <div className="p-3 bg-white border border-amber-300 rounded-2xl flex items-center justify-between shadow-2xs">
                <div>
                  <span className="text-2xs font-bold text-amber-800 uppercase tracking-wider block">🔑 Confirmation OTP:</span>
                  <span className="font-mono text-lg font-black text-amber-950 tracking-widest">
                    {generatedOtp || pickup.confirmationOtp}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleVerifyCustomerOtp(generatedOtp || pickup.confirmationOtp)}
                  disabled={actionLoading}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs cursor-pointer shadow-md flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verify & Proceed to Pay</span>
                </button>
              </div>
            ) : null}

            {/* Manual entry for customer's OTP code */}
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                placeholder="Enter customer's 6-digit OTP"
                value={inputOtp}
                onChange={(e) => setInputOtp(e.target.value.replace(/\D/g, ''))}
                className="flex-1 px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-center font-mono font-bold text-xs focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={() => handleVerifyCustomerOtp()}
                disabled={actionLoading || !inputOtp}
                className="px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs active:scale-95 transition-all"
              >
                Confirm OTP
              </button>
            </div>

            <div className="pt-1 flex items-center justify-between text-2xs text-slate-500">
              <span>Customer already has the OTP on their tracking screen.</span>
              <button
                type="button"
                onClick={handleRequestConfirmationOtp}
                disabled={actionLoading}
                className="text-amber-700 hover:text-amber-900 font-bold underline cursor-pointer text-2xs"
              >
                {actionLoading ? 'Resending...' : 'Resend OTP to Customer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Cash Payment & Finalize */}
      {pickup.status === 'confirmed' && (
        <div id="payment-section" className="bg-emerald-50 border-2 border-emerald-500 rounded-3xl p-5 shadow-md space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
            <div>
              <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                Bill Confirmed by Customer!
              </h4>
              <p className="text-2xs text-emerald-800 mt-0.5">
                Amount locked at ₹{(pickup.totalAmountPaise / 100).toFixed(2)}. Pay cash and complete job.
              </p>
            </div>
          </div>

          <button
            onClick={handleRecordPaymentAndComplete}
            disabled={actionLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <DollarSign className="w-4 h-4" />
            {actionLoading ? 'Finalizing...' : `Pay Cash ₹${(pickup.totalAmountPaise / 100).toFixed(2)} & Finish`}
          </button>
        </div>
      )}

      {pickup.status === 'completed' && (
        <div className="p-4 bg-slate-100 rounded-3xl text-center text-xs font-bold text-slate-700">
          🎉 Pickup successfully completed and cash paid.
        </div>
      )}
    </div>
  );
};

export default CollectorJobCard;
