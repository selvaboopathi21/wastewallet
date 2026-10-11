// LiveTrackingPage: Real-time pickup status, live weighing feed, separate price toggle & OTP confirmation
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  Star,
  MapPin,
  Clock,
  Scale,
  CheckCircle2,
  AlertCircle,
  Truck,
  Sparkles,
  Lock,
  Layers,
  Send,
  MessageSquare,
} from 'lucide-react';
import api from '../../api/axios';
import useAuth from '../../hooks/useAuth';
import useSocket from '../../hooks/useSocket';

const STEPS = [
  { key: 'offered', label: 'Matching' },
  { key: 'accepted', label: 'Assigned' },
  { key: 'on_the_way', label: 'On The Way' },
  { key: 'arrived', label: 'At Doorstep' },
  { key: 'weighed', label: 'Weighed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'completed', label: 'Completed' },
];

export const LiveTrackingPage = () => {
  const { id: pickupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, isConnected, joinPickup } = useSocket();

  const [pickup, setPickup] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Real-time state updates
  const [liveAmountPaise, setLiveAmountPaise] = useState(0);
  const [liveWeightKg, setLiveWeightKg] = useState(0);
  const [pricingMode, setPricingMode] = useState('separate');
  const [separateRequestStatus, setSeparateRequestStatus] = useState(null); // 'pending' | 'accepted' | 'declined'
  const [declineReason, setDeclineReason] = useState('');

  // Confirmation OTP state
  const [confirmationOtp, setConfirmationOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [confirmingOtp, setConfirmingOtp] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState('');

  // Post-completion rating state
  const [ratingStars, setRatingStars] = useState(5);
  const [selectedTags, setSelectedTags] = useState(['Accurate Scale', 'Punctual']);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);

  // Fetch initial pickup details
  const fetchPickupData = async () => {
    try {
      const res = await api.get(`/pickups/${pickupId}`);
      const data = res?.data?.data || res?.data;
      if (data?.pickup) {
        setPickup(data.pickup);
        setItems(data.items || []);
        setLiveAmountPaise(data.pickup.totalAmountPaise || 0);
        setLiveWeightKg(data.pickup.totalPickupWeightKg || 0);
        setPricingMode(data.pickup.pricingMode || 'separate');
        if (data.pickup.separateRequest?.requested) {
          setSeparateRequestStatus(data.pickup.separateRequest.status);
          setDeclineReason(data.pickup.separateRequest.declineReason || '');
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load pickup details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPickupData();
  }, [pickupId]);

  // Socket.io real-time listener setup
  useEffect(() => {
    if (!socket || !pickupId) return;

    // Join room for this pickup
    joinPickup(pickupId);

    // 1. Live status changed
    const handleStatusChanged = (data) => {
      const incomingId = String(data?.requestId || data?.pickupId || '');
      if (!incomingId || incomingId === String(pickupId)) {
        setPickup((prev) => (prev ? { ...prev, status: data.newStatus } : prev));
      }
    };

    // 2. Live weight and amount updated
    const handleWeightUpdated = (data) => {
      const incomingId = String(data?.requestId || data?.pickupId || '');
      if (!incomingId || incomingId === String(pickupId)) {
        setLiveWeightKg(data.totalPickupWeightKg || 0);
        setLiveAmountPaise(data.totalAmountPaise || 0);
        if (data.mode) setPricingMode(data.mode);
        if (data.items) setItems(data.items);
        setPickup((prev) => (prev ? { ...prev, status: 'weighed' } : prev));
      }
    };

    // 3. Collector accepted separate mode
    const handleSeparateAccepted = (data) => {
      const incomingId = String(data?.requestId || data?.pickupId || '');
      if (!incomingId || incomingId === String(pickupId)) {
        setPricingMode('separate');
        setSeparateRequestStatus('accepted');
      }
    };

    // 4. Collector declined separate mode
    const handleSeparateDeclined = (data) => {
      const incomingId = String(data?.requestId || data?.pickupId || '');
      if (!incomingId || incomingId === String(pickupId)) {
        setSeparateRequestStatus('declined');
        setDeclineReason(data?.reason || 'Collector prefers flat mixed rate');
      }
    };

    // 5. Pickup confirmed by OTP
    const handlePickupConfirmed = (data) => {
      const incomingId = String(data?.requestId || data?.pickupId || '');
      if (!incomingId || incomingId === String(pickupId)) {
        setPickup((prev) => (prev ? { ...prev, status: 'confirmed', customerConfirmed: true } : prev));
      }
    };

    // 6. Live OTP received
    const handleOtpSent = (data) => {
      const incomingId = String(data?.requestId || data?.pickupId || '');
      if (!incomingId || incomingId === String(pickupId)) {
        if (data?.otp) {
          setDevOtp(String(data.otp));
          setConfirmationOtp(String(data.otp));
        }
      }
    };

    socket.on('pickup.status.changed', handleStatusChanged);
    socket.on('weight.updated', handleWeightUpdated);
    socket.on('pricing.separate.accepted', handleSeparateAccepted);
    socket.on('pricing.separate.declined', handleSeparateDeclined);
    socket.on('pickup.confirmed', handlePickupConfirmed);
    socket.on('pickup.otp.sent', handleOtpSent);

    return () => {
      socket.off('pickup.status.changed', handleStatusChanged);
      socket.off('weight.updated', handleWeightUpdated);
      socket.off('pricing.separate.accepted', handleSeparateAccepted);
      socket.off('pricing.separate.declined', handleSeparateDeclined);
      socket.off('pickup.confirmed', handlePickupConfirmed);
      socket.off('pickup.otp.sent', handleOtpSent);
    };
  }, [socket, pickupId]);

  // Customer triggers "See separate price"
  const handleRequestSeparatePrice = async () => {
    try {
      setSeparateRequestStatus('pending');
      await api.post(`/pickups/${pickupId}/request-separate`);
    } catch (err) {
      alert(err.message || 'Could not request separate price');
      setSeparateRequestStatus(null);
    }
  };

  // Customer confirms on-site weights with OTP
  const handleConfirmOtp = async (e) => {
    e.preventDefault();
    if (!confirmationOtp || confirmationOtp.length !== 6) {
      return alert('Please enter the 6-digit confirmation OTP');
    }

    setConfirmingOtp(true);
    try {
      const res = await api.post(`/pickups/${pickupId}/confirm-otp`, {
        otp: confirmationOtp.trim(),
      });
      setConfirmSuccess(res?.message || 'Pickup confirmed successfully!');
      setPickup((prev) => ({ ...prev, status: 'confirmed', customerConfirmed: true }));
    } catch (err) {
      alert(err.message || 'Invalid confirmation OTP');
    } finally {
      setConfirmingOtp(false);
    }
  };

  // Customer submits rating after pickup is completed
  const handleSubmitRating = async (e) => {
    e.preventDefault();
    setSubmittingRating(true);
    try {
      await api.post('/ratings', {
        requestId: pickupId,
        stars: ratingStars,
        tags: selectedTags,
        comment: ratingComment.trim(),
      });
      setRatingSubmitted(true);
    } catch (err) {
      alert(err.message || 'Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  const toggleRatingTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-600">Connecting to live pickup feed...</p>
      </div>
    );
  }

  if (error || !pickup) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-2">
        <p className="text-xs font-bold text-rose-800">{error || 'Pickup not found'}</p>
        <button
          onClick={() => navigate('/customer/pickups')}
          className="text-xs font-bold text-emerald-700 underline"
        >
          Return to My Pickups
        </button>
      </div>
    );
  }

  // Calculate current step index for the stepper
  const normalizedStatus = ['paid', 'completed'].includes(pickup.status) ? 'completed' : pickup.status;
  const currentStepIndex = Math.max(
    0,
    STEPS.findIndex((s) => s.key === normalizedStatus)
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/customer/pickups')}
            className="p-1.5 hover:bg-slate-200 rounded-xl transition-colors text-slate-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-black text-slate-900 leading-tight">Live Scrap Pickup</h2>
            <p className="text-2xs text-slate-400 font-mono">ID: #{pickup._id.slice(-6).toUpperCase()}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full text-2xs font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          Live Sync
        </div>
      </div>

      {/* Real-time Status Stepper */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Status: <span className="text-emerald-700 font-black">{pickup.status.replace('_', ' ')}</span>
          </span>
          <span className="text-2xs font-semibold text-slate-400">
            Step {currentStepIndex + 1} of {STEPS.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-3">
          <div
            className="bg-emerald-600 h-full transition-all duration-500"
            style={{ width: `${((currentStepIndex + 1) / STEPS.length) * 100}%` }}
          ></div>
        </div>

        <div className="flex justify-between text-2xs font-semibold text-slate-500">
          <span>Requested</span>
          <span>Weighing</span>
          <span>Cash Paid</span>
        </div>
      </div>

      {/* Collector Partner Card */}
      {pickup.collectorId ? (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-teal-100 text-teal-800 rounded-xl flex items-center justify-center font-black text-base shadow-xs">
              🚚
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-slate-900">{pickup.collectorId.name}</h4>
                <div className="flex items-center gap-0.5 text-2xs font-bold bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded">
                  <Star className="w-2.5 h-2.5 fill-current" />
                  <span>{pickup.collectorId.rating?.avg?.toFixed(1) || '4.9'}</span>
                </div>
              </div>
              <p className="text-2xs text-slate-500 mt-0.5">Kaalaankadai Certified Partner</p>
            </div>
          </div>

          <a
            href={`tel:${pickup.collectorId.phone}`}
            className="w-9 h-9 bg-emerald-600 text-white rounded-xl flex items-center justify-center hover:bg-emerald-700 shadow-xs transition-colors"
            title="Call Collector"
          >
            <Phone className="w-4 h-4" />
          </a>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-xs text-amber-900">
          <Truck className="w-5 h-5 text-amber-600 shrink-0 animate-bounce" />
          <div>
            <span className="font-bold">Locating Nearest Collector...</span>
            <p className="text-2xs text-amber-800 mt-0.5">
              Evaluating collector ratings, distance, and real-time workload in your zone.
            </p>
          </div>
        </div>
      )}

      {/* Live Amount & Digital Scale Display */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-3xl shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Digital Scale Live Feed
            </span>
          </div>
          <span className="text-2xs font-mono font-bold bg-white/10 px-2 py-0.5 rounded uppercase">
            {pricingMode} mode
          </span>
        </div>

        {/* Amount in Rupees */}
        <div className="text-center py-2">
          <p className="text-3xl font-black text-emerald-400 tracking-tight">
            ₹{(liveAmountPaise / 100).toFixed(2)}
          </p>
          <p className="text-xs font-semibold text-slate-300 mt-1">
            Total Weight: <span className="text-white font-bold">{liveWeightKg.toFixed(2)} kg</span>
          </p>
        </div>

        {/* Mode & 'See Separate Price' Request Action */}
        {pricingMode === 'mixed' && pickup.status !== 'confirmed' && pickup.status !== 'completed' && (
          <div className="pt-3 border-t border-white/10">
            {separateRequestStatus === 'pending' ? (
              <div className="p-2.5 bg-amber-500/20 border border-amber-400/30 rounded-xl text-center text-xs text-amber-200 font-semibold animate-pulse">
                ⏳ Separate price requested. Waiting for collector response...
              </div>
            ) : separateRequestStatus === 'declined' ? (
              <div className="p-2.5 bg-rose-500/20 border border-rose-400/30 rounded-xl text-center text-xs text-rose-200 font-semibold">
                ⚠️ Collector declined separate weighing: {declineReason}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleRequestSeparatePrice}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                See Separate Price (Itemized Breakdown)
              </button>
            )}
          </div>
        )}
      </div>

      {/* Weighed Items Breakdown (If available) */}
      {items.length > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              Scale Itemized Breakdown
            </h4>
            <span className="text-2xs text-slate-400 font-mono">{items.length} items weighed</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {items.map((item, idx) => (
              <div key={idx} className="py-2 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800 capitalize">
                    {item.category.replace('_', ' ')}
                  </p>
                  <p className="text-2xs text-slate-400">
                    {item.weightKg} kg × ₹{(item.pricePerKgPaise / 100).toFixed(2)}/kg
                  </p>
                </div>
                <span className="font-mono font-bold text-slate-900">
                  ₹{(item.totalPricePaise / 100).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation OTP Dialog (Customer locks the amount) */}
      {pickup.status === 'weighed' && !pickup.customerConfirmed && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-700" />
            <div>
              <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                Confirm Bill Amount & Handover
              </h4>
              <p className="text-2xs text-amber-800 mt-0.5">
                Weighing complete! Enter confirmation OTP to lock the ₹
                {(liveAmountPaise / 100).toFixed(2)} payout before cash handover.
              </p>
            </div>
          </div>

          {devOtp && (
            <div className="bg-white border-2 border-amber-400 rounded-2xl p-3 flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-2xs font-bold text-amber-800 uppercase tracking-wider block">🔑 Your Confirmation Code</span>
                <span className="font-mono text-lg font-black text-amber-950 tracking-widest">{devOtp}</span>
              </div>
              <button
                type="button"
                onClick={() => setConfirmationOtp(devOtp)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs transition-all"
              >
                Auto-Fill Code
              </button>
            </div>
          )}

          <form onSubmit={handleConfirmOtp} className="space-y-2">
            <div className="relative">
              <input
                type="text"
                maxLength={6}
                value={confirmationOtp}
                onChange={(e) => setConfirmationOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 6-digit confirmation OTP"
                className="w-full text-center tracking-widest font-mono text-base font-bold py-2.5 px-3 bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={confirmingOtp}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              {confirmingOtp ? 'Confirming...' : 'Lock Amount & Confirm Bill'}
            </button>
          </form>

          <p className="text-2xs text-amber-700 text-center font-semibold">
            💡 The 6-digit verification code is shown above. Tap "Lock Amount & Confirm Bill" to approve payout.
          </p>
        </div>
      )}

      {confirmSuccess && (
        <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          <span>{confirmSuccess}</span>
        </div>
      )}

      {/* Post-Completion Rating Card */}
      {(pickup.status === 'completed' || pickup.status === 'paid') && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Rate Your Collector Partner
            </h4>
          </div>

          {ratingSubmitted ? (
            <div className="p-3 bg-emerald-50 rounded-xl text-center text-xs font-bold text-emerald-800">
              🎉 Thank you! Your review helps maintain transparent service standards.
            </div>
          ) : (
            <form onSubmit={handleSubmitRating} className="space-y-3">
              {/* Star selector */}
              <div className="flex items-center justify-center gap-2 py-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingStars(star)}
                    className="p-1 cursor-pointer transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        star <= ratingStars
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* Feedback tags */}
              <div className="flex flex-wrap gap-1.5 justify-center">
                {['Accurate Scale', 'Punctual', 'Polite', 'Prompt Cash', 'Fast Sorting'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleRatingTag(tag)}
                    className={`text-2xs font-semibold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                      selectedTags.includes(tag)
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <textarea
                rows={2}
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder="Optional feedback..."
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />

              <button
                type="submit"
                disabled={submittingRating}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                {submittingRating ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default LiveTrackingPage;
