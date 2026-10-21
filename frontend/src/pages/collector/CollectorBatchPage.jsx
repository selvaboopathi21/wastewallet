// CollectorBatchPage: End-of-day scrap batch deposit QR code for warehouse reception
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  QrCode,
  PackageCheck,
  Scale,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Building,
  MapPin,
  Truck,
  UserCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import api from '../../api/axios';
import useSocket from '../../hooks/useSocket';

export const CollectorBatchPage = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [batches, setBatches] = useState([]);
  const [completedPickups, setCompletedPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeBatch, setActiveBatch] = useState(null);
  const [showPickupsList, setShowPickupsList] = useState(true);
  const [error, setError] = useState('');

  // 1. Fetch completed visits and existing batches
  const loadData = async () => {
    try {
      const [batchRes, activeRes] = await Promise.allSettled([
        api.get('/batches'),
        api.get('/collector/active'),
      ]);

      if (batchRes.status === 'fulfilled') {
        const list = batchRes.value?.data?.data?.batches || batchRes.value?.data?.batches || [];
        setBatches(list);
        if (!activeBatch) {
          // Only automatically select a batch if it is currently in progress (deposited or received)
          const inProgressBatch = list.find((b) => ['deposited', 'received'].includes(b.status));
          if (inProgressBatch) {
            setActiveBatch(inProgressBatch);
          }
        }
      }

      if (activeRes.status === 'fulfilled') {
        const jobs = activeRes.value?.data?.data?.completedJobs || [];
        setCompletedPickups(jobs);
      }
    } catch (err) {
      console.error('Error loading collector batch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 6000);
    return () => clearInterval(interval);
  }, []);

  // 2. Real-time socket event for when warehouse staff receives/weighs the batch
  useEffect(() => {
    if (!socket) return;

    const handleBatchReceived = ({ batch }) => {
      if (!batch) return;
      setBatches((prev) =>
        prev.map((b) => (b._id === batch._id || b.qrCode === batch.qrCode ? batch : b))
      );
      if (activeBatch && (activeBatch._id === batch._id || activeBatch.qrCode === batch.qrCode)) {
        setActiveBatch(batch);
      }
    };

    socket.on('batch.received', handleBatchReceived);
    return () => {
      socket.off('batch.received', handleBatchReceived);
    };
  }, [socket, activeBatch]);

  // 3. Generate new deposit batch
  const handleGenerateBatch = async () => {
    setGenerating(true);
    setError('');
    try {
      const res = await api.post('/batches');
      const newBatch = res?.data?.batch || res?.data?.data?.batch;
      if (newBatch) {
        setActiveBatch(newBatch);
        setBatches((prev) => [newBatch, ...prev]);
        await loadData();
      }
    } catch (err) {
      setError(err.message || 'Failed to create deposit batch. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  // Calculate unbatched totals from completed visits
  const totalCompletedWeight = completedPickups.reduce(
    (sum, p) => sum + (p.totalPickupWeightKg || 0),
    0
  );
  const totalCompletedCash = completedPickups.reduce(
    (sum, p) => sum + (p.totalAmountPaise || 0) / 100,
    0
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/collector')}
          className="p-1.5 hover:bg-slate-200 rounded-xl transition-colors text-slate-600 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-base font-black text-slate-900 leading-tight">
            Central Store Deposit QR
          </h2>
          <p className="text-2xs text-slate-500">Warehouse Reception & Intake Handover</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Action: Generate Deposit QR Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white p-5 rounded-3xl shadow-sm space-y-4 border border-slate-700/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              End-of-Day Handover
            </span>
          </div>
          <span className="text-2xs font-mono font-bold bg-white/10 px-2 py-0.5 rounded text-emerald-300">
            Warehouse Hub
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Bundle all completed doorstep pickups into an intake deposit batch. The store staff will scan this QR, re-weigh your bags on the gross intake scale, and verify weight loss.
        </p>

        {completedPickups.length > 0 && (
          <div className="grid grid-cols-2 gap-2 p-3 bg-white/10 rounded-2xl border border-white/10 text-xs">
            <div>
              <span className="text-3xs uppercase font-bold text-slate-300 block">Today's Pickups</span>
              <span className="text-sm font-black text-emerald-300">
                {completedPickups.length} Visits Completed
              </span>
            </div>
            <div className="text-right">
              <span className="text-3xs uppercase font-bold text-slate-300 block">Total Weight Collected</span>
              <span className="text-sm font-black text-white">
                {totalCompletedWeight.toFixed(1)} kg
              </span>
            </div>
          </div>
        )}

        <button
          onClick={handleGenerateBatch}
          disabled={generating}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
        >
          <QrCode className="w-4 h-4" />
          {generating
            ? 'Bundling Pickups...'
            : `Generate Today's Deposit QR (${totalCompletedWeight > 0 ? `${completedPickups.length} Visits • ${totalCompletedWeight.toFixed(1)} kg` : 'All Pickups'})`}
        </button>
      </div>

      {/* Active QR Card Display */}
      {activeBatch && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-md space-y-4">
          {activeBatch.status === 'sorted' && (
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                📦 Archived Batch Details
              </span>
              <button
                type="button"
                onClick={() => setActiveBatch(null)}
                className="text-2xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
              >
                ✕ Close Details
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">
              {activeBatch.status === 'sorted' ? 'Batch Deposit Code' : 'Active Deposit Code'}
            </span>
            <span
              className={`text-2xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                activeBatch.status === 'sorted'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : activeBatch.status === 'received'
                  ? 'bg-blue-100 text-blue-900 border border-blue-300'
                  : 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
              }`}
            >
              {activeBatch.status === 'sorted'
                ? '✓ Sorted & Routed'
                : activeBatch.status === 'received'
                ? '✓ Received by Warehouse'
                : '⏳ Awaiting Store Intake'}
            </span>
          </div>

          <div className="text-center">
            <div className="inline-block bg-slate-900 p-4 rounded-3xl shadow-inner">
              <div className="w-44 h-44 bg-white p-3 rounded-2xl mx-auto flex flex-col items-center justify-center border-4 border-slate-800">
                <QrCode className="w-32 h-32 text-slate-950" />
              </div>
              <p className="text-xs font-mono font-black text-emerald-400 mt-2.5 tracking-widest">
                {activeBatch.qrCode}
              </p>
            </div>
          </div>

          {activeBatch.status === 'deposited' && (
            <div className="p-3 bg-amber-50/90 border border-amber-300/80 rounded-2xl text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-amber-950 font-bold">
                <span>📲 Show This QR to Warehouse Staff</span>
              </div>
              <p className="text-2xs text-amber-900 leading-relaxed">
                The warehouse staff will scan this QR at the gross intake scale to accept all your collected doorstep scrap bags.
              </p>
            </div>
          )}

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="p-2.5 bg-slate-50 rounded-2xl text-center">
              <p className="text-2xs text-slate-400 font-semibold uppercase">Visits</p>
              <p className="text-sm font-black text-slate-900 mt-0.5">
                {activeBatch.pickupRequestIds?.length || 1}
              </p>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-2xl text-center">
              <p className="text-2xs text-slate-400 font-semibold uppercase">Total Scrap</p>
              <p className="text-sm font-black text-emerald-600 mt-0.5">
                {activeBatch.depositedWeightKg ?? activeBatch.totalWeightDepositedKg ?? 0} kg
              </p>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-2xl text-center">
              <p className="text-2xs text-slate-400 font-semibold uppercase">Warehouse Status</p>
              <p className="text-2xs font-bold text-slate-800 uppercase mt-1">
                {activeBatch.status === 'sorted'
                  ? `Sorted (${activeBatch.lossPercent ?? 0}% Loss)`
                  : activeBatch.status === 'received'
                  ? `Recvd (${activeBatch.lossPercent ?? 0}% Loss)`
                  : 'Deposited'}
              </p>
            </div>
          </div>

          {/* Reception Details Confirmation Banner */}
          {(activeBatch.status === 'received' || activeBatch.status === 'sorted') && activeBatch.receivedWeightKg !== undefined && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-900 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>Gross Scale Verified by Store Staff!</span>
              </div>
              <p className="text-2xs text-emerald-800">
                Gross weight received: <strong>{activeBatch.receivedWeightKg} kg</strong> • Loss:{' '}
                <strong>{activeBatch.lossPercent ?? 0}%</strong>
              </p>
            </div>
          )}

          {/* Bundled Pickups Itemized List */}
          {activeBatch.pickupRequestIds && activeBatch.pickupRequestIds.length > 0 && (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div
                onClick={() => setShowPickupsList(!showPickupsList)}
                className="flex items-center justify-between cursor-pointer"
              >
                <span className="text-2xs font-bold uppercase text-slate-600 tracking-wider flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Included Doorstep Visits ({activeBatch.pickupRequestIds.length})
                </span>
                {showPickupsList ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>

              {showPickupsList && (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {activeBatch.pickupRequestIds.map((pickup, idx) => (
                    <div
                      key={pickup._id || idx}
                      className="p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-bold text-slate-900 truncate">
                          {pickup.customerName || pickup.customerId?.name || 'Customer'}
                        </p>
                        <p className="text-2xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          {pickup.address}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-emerald-700 block">
                          {pickup.totalPickupWeightKg || 0} kg
                        </span>
                        <span className="text-3xs text-slate-400">
                          ₹{((pickup.totalAmountPaise || 0) / 100).toFixed(0)} paid
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Completed Visits List from Today */}
      {completedPickups.length > 0 && (
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Completed Doorstep Visits ({completedPickups.length})
            </h4>
            <span className="text-2xs font-mono font-bold text-emerald-700">
              ₹{totalCompletedCash.toFixed(0)} Paid
            </span>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {completedPickups.map((job) => (
              <div
                key={job._id}
                className="p-3 bg-emerald-50/40 rounded-2xl border border-emerald-100 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900">
                      {job.customerName || job.customerId?.name || 'Customer'}
                    </span>
                    <span className="text-2xs font-mono text-slate-400">
                      #{job._id.slice(-6).toUpperCase()}
                    </span>
                  </div>
                  <p className="text-2xs text-slate-500 truncate max-w-[210px] mt-0.5">
                    {job.address}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-emerald-800 block">
                    {job.totalPickupWeightKg || 0} kg
                  </span>
                  <span className="text-2xs text-emerald-600 font-semibold">
                    ₹{((job.totalAmountPaise || 0) / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past Batches History */}
      {batches.length > 0 && (
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Previous Deposit Batches ({batches.length})
            </h4>
            <span className="text-3xs text-slate-400">Tap to inspect past batch</span>
          </div>
          <div className="divide-y divide-slate-100 text-xs">
            {batches.map((b) => (
              <div
                key={b._id}
                onClick={() => setActiveBatch(b)}
                className={`py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 px-2.5 rounded-xl transition-all ${
                  activeBatch?._id === b._id ? 'bg-emerald-50/70 border border-emerald-200' : ''
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-mono font-bold text-slate-900">{b.qrCode}</p>
                    {activeBatch?._id === b._id && (
                      <span className="text-3xs bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded-full">
                        Viewing
                      </span>
                    )}
                  </div>
                  <p className="text-2xs text-slate-400">
                    {new Date(b.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-700">
                    {b.depositedWeightKg ?? b.totalWeightDepositedKg ?? 0} kg
                  </p>
                  <span
                    className={`text-3xs px-2 py-0.5 rounded-full uppercase font-bold ${
                      b.status === 'sorted'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : b.status === 'received'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {b.status}
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

export default CollectorBatchPage;
