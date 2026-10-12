// StoreIntakePage: Warehouse reception scanning collector batch QR & recording received weight (computing loss %)
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  QrCode,
  Scale,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Truck,
  Building,
  Sparkles,
  Search,
  UserCheck,
  MapPin,
  Clock,
  Phone,
  Layers,
} from 'lucide-react';
import api from '../../api/axios';
import useSocket from '../../hooks/useSocket';

export const StoreIntakePage = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [qrInput, setQrInput] = useState('');
  const [receivedWeight, setReceivedWeight] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receptionResult, setReceptionResult] = useState(null);
  const [error, setError] = useState('');
  const [liveAlert, setLiveAlert] = useState(null);

  // Fetch active pending batches
  const fetchBatches = async () => {
    try {
      const res = await api.get('/batches?view=store');
      const list = res?.data?.data?.batches || res?.data?.batches || [];
      setBatches(list);
      // Auto-select first pending batch if nothing selected yet
      const pending = list.filter((b) => ['deposited', 'created'].includes(b.status));
      if (pending.length > 0) {
        setSelectedBatch((prev) => {
          if (!prev) {
            const first = pending[0];
            setQrInput(first.qrCode);
            const weight = first.depositedWeightKg ?? first.totalWeightDepositedKg ?? '';
            setReceivedWeight(weight ? weight.toString() : '');
            return first;
          }
          return prev;
        });
      }
    } catch (err) {
      console.error('Error fetching batches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
    // 5-second polling interval as a backup
    const interval = setInterval(fetchBatches, 5000);
    return () => clearInterval(interval);
  }, []);

  // Real-time socket events for new batches and received batches
  useEffect(() => {
    if (!socket) return;

    const handleBatchCreated = ({ batch }) => {
      if (!batch) return;
      const collectorName = batch.collectorId?.name || 'Collector Partner';
      const weight = batch.depositedWeightKg ?? batch.totalWeightDepositedKg ?? 0;
      setLiveAlert(`🔔 New Batch: ${collectorName} deposited ${weight} kg (${batch.qrCode})`);

      setBatches((prev) => [batch, ...prev.filter((b) => b._id !== batch._id && b.qrCode !== batch.qrCode)]);
      setSelectedBatch(batch);
      setQrInput(batch.qrCode);
      setReceivedWeight(weight ? weight.toString() : '');
      setReceptionResult(null);

      setTimeout(() => setLiveAlert(null), 8000);
    };

    const handleBatchReceived = ({ batch }) => {
      if (!batch) return;
      setBatches((prev) =>
        prev.map((b) => (b._id === batch._id || b.qrCode === batch.qrCode ? batch : b))
      );
      if (selectedBatch && (selectedBatch._id === batch._id || selectedBatch.qrCode === batch.qrCode)) {
        setSelectedBatch(batch);
      }
    };

    socket.on('batch.created', handleBatchCreated);
    socket.on('batch.received', handleBatchReceived);

    return () => {
      socket.off('batch.created', handleBatchCreated);
      socket.off('batch.received', handleBatchReceived);
    };
  }, [socket, selectedBatch]);

  // Handle selecting a pending batch
  const handleSelectBatch = (batch) => {
    setSelectedBatch(batch);
    setQrInput(batch.qrCode);
    const weight = batch.depositedWeightKg ?? batch.totalWeightDepositedKg ?? '';
    setReceivedWeight(weight ? weight.toString() : '');
    setReceptionResult(null);
    setError('');
  };

  const pendingBatches = batches.filter((b) => ['deposited', 'created'].includes(b.status));

  // Submit batch intake reception
  const handleReceiveBatch = async (e) => {
    e.preventDefault();
    setError('');
    const code = qrInput.trim();
    const wt = parseFloat(receivedWeight);

    if (!code) {
      return setError('Please enter or select a batch QR code');
    }

    if (!wt || wt <= 0) {
      return setError('Please enter a valid received weight in kilograms');
    }

    setSubmitting(true);
    try {
      const res = await api.post(`/batches/${encodeURIComponent(code)}/receive`, {
        receivedWeightKg: wt,
      });

      const updated = res?.data?.batch || res?.data?.data?.batch;
      setReceptionResult(updated);
      setSelectedBatch(updated);
      await fetchBatches();
    } catch (err) {
      setError(err.message || 'Failed to receive batch. Check QR code or status.');
    } finally {
      setSubmitting(false);
    }
  };

  // Live scale comparison
  const depositedKg = selectedBatch?.depositedWeightKg ?? selectedBatch?.totalWeightDepositedKg ?? 0;
  const receivedKg = parseFloat(receivedWeight) || 0;
  const diffKg = depositedKg > 0 && receivedKg > 0 ? depositedKg - receivedKg : null;
  const isSurplus = diffKg !== null && diffKg < 0; // scale received > deposited
  const lossPct =
    diffKg !== null && depositedKg > 0
      ? (((depositedKg - receivedKg) / depositedKg) * 100).toFixed(1)
      : null;
  const isHighLoss = lossPct !== null && parseFloat(lossPct) > 15;

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <h2 className="text-base font-black text-slate-900 leading-tight">
          Collector Batch Intake & Weighing
        </h2>
        <p className="text-2xs text-slate-500">
          Scan collector deposit QR codes, verify gross weights, and calculate loss percentage
        </p>
      </div>

      {liveAlert && (
        <div className="p-3 bg-emerald-900 text-white border border-emerald-700 rounded-2xl text-xs font-bold flex items-center justify-between shadow-md animate-bounce">
          <span>{liveAlert}</span>
          <button
            onClick={() => setLiveAlert(null)}
            className="text-2xs text-emerald-300 hover:text-white px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Selected Batch Details Card (Collector & Customer Visits) */}
      {selectedBatch && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-5 rounded-3xl shadow-sm border border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
                📦
              </div>
              <div>
                <span className="text-3xs uppercase font-bold text-slate-400 block tracking-wider">
                  Collector Handover Details
                </span>
                <h3 className="text-xs font-black text-white">
                  {selectedBatch.collectorId?.name || 'Murugan (Top Collector)'}
                </h3>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xs font-mono font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full block">
                {selectedBatch.qrCode}
              </span>
              <span className="text-3xs text-slate-400 mt-0.5 block">
                Phone: {selectedBatch.collectorId?.phone || '9876500001'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700/60 text-xs">
            <div className="p-2.5 bg-white/5 rounded-xl">
              <span className="text-3xs text-slate-400 block uppercase font-bold">
                Total Scrap Delivered
              </span>
              <span className="text-base font-black text-emerald-400">
                {depositedKg.toFixed(1)} kg
              </span>
            </div>
            <div className="p-2.5 bg-white/5 rounded-xl">
              <span className="text-3xs text-slate-400 block uppercase font-bold">
                Customer Visits
              </span>
              <span className="text-base font-black text-white">
                {selectedBatch.pickupRequestIds?.length || 1} Doorstep Homes
              </span>
            </div>
          </div>

          {/* Included Customer Visits Breakdown */}
          {selectedBatch.pickupRequestIds && selectedBatch.pickupRequestIds.length > 0 && (
            <div className="pt-2 border-t border-slate-700/60 space-y-1.5">
              <span className="text-3xs font-bold uppercase tracking-wider text-slate-300 block">
                Delivered Customer Bags Breakdown
              </span>
              <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                {selectedBatch.pickupRequestIds.map((p, idx) => (
                  <div
                    key={p._id || idx}
                    className="p-2 bg-slate-800/80 rounded-xl border border-slate-700 flex items-center justify-between text-2xs"
                  >
                    <div className="min-w-0 pr-2">
                      <span className="font-bold text-white block truncate">
                        {p.customerId?.name || 'Customer'}
                      </span>
                      <span className="text-slate-400 truncate block">
                        {p.address}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-emerald-400 block">
                        {p.totalPickupWeightKg || 0} kg
                      </span>
                      <span className="text-slate-400 text-3xs">
                        ₹{((p.totalAmountPaise || 0) / 100).toFixed(0)} paid
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reception Form Card */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <form onSubmit={handleReceiveBatch} className="space-y-3">
          {/* QR Code Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-2xs font-bold text-slate-600 uppercase">
                Batch QR Code / Identifier
              </label>
              {pendingBatches.length > 0 && (
                <span className="text-2xs text-emerald-700 font-bold">
                  {pendingBatches.length} batch(es) awaiting scale
                </span>
              )}
            </div>
            <div className="relative">
              <QrCode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="e.g. BATCH-MV4003YF-6883"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value.toUpperCase())}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            {/* Quick-tap pills for pending batches */}
            {pendingBatches.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                <span className="text-2xs text-slate-400 font-bold">Tap to fill:</span>
                {pendingBatches.map((b) => (
                  <button
                    key={b._id}
                    type="button"
                    onClick={() => handleSelectBatch(b)}
                    className={`text-2xs font-mono font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                      qrInput === b.qrCode
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-slate-100 hover:bg-emerald-50 hover:border-emerald-300 text-slate-700 border-slate-200'
                    }`}
                  >
                    {b.collectorId?.name ? `${b.collectorId.name.split(' ')[0]}: ` : ''}
                    {b.qrCode.slice(-8)} • {b.depositedWeightKg ?? b.totalWeightDepositedKg ?? 0} kg
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Warehouse Gross Scale Weight */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-2xs font-bold text-slate-600 uppercase">
                Gross Received Scale Weight (Kg)
              </label>
              {depositedKg > 0 && (
                <button
                  type="button"
                  onClick={() => setReceivedWeight(depositedKg.toString())}
                  className="text-2xs text-emerald-700 hover:text-emerald-800 font-bold underline cursor-pointer"
                >
                  Match Collector Deposited ({depositedKg} kg)
                </button>
              )}
            </div>
            <div className="relative">
              <Scale className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="Enter gross scale kg"
                value={receivedWeight}
                onChange={(e) => setReceivedWeight(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Live Loss / Surplus Comparison Card */}
          {diffKg !== null && (
            <div>
              {isSurplus ? (
                <div className="p-3.5 rounded-2xl border text-xs bg-amber-50 border-amber-300 text-amber-950 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">Scale Comparison:</span>
                    <span className="text-2xs font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                      ⚠️ Weight Surplus (+{Math.abs(diffKg).toFixed(1)} kg)
                    </span>
                  </div>
                  <p className="text-2xs text-amber-800">
                    Gross scale weight ({receivedKg} kg) is higher than collector deposited weight ({depositedKg} kg). Check for scale calibration drift or foreign non-recyclables.
                  </p>
                </div>
              ) : isHighLoss ? (
                <div className="p-3.5 rounded-2xl border text-xs bg-rose-50 border-rose-300 text-rose-950 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">
                      Calculated Loss: <span className="font-mono font-black">{lossPct}%</span> (-{diffKg.toFixed(1)} kg)
                    </span>
                    <span className="text-2xs font-bold bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full">
                      ⚠️ High Loss Divergence (&gt;15%)
                    </span>
                  </div>
                  <p className="text-2xs text-rose-800">
                    Loss exceeds standard 15% threshold. Audit bags for missing items or excess moisture loss.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl border text-xs bg-emerald-50 border-emerald-300 text-emerald-950 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">
                      Calculated Loss: <span className="font-mono font-black">{lossPct}%</span> (-{diffKg.toFixed(1)} kg)
                    </span>
                    <span className="text-2xs font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                      ✓ Normal Tolerance (0 - 15%)
                    </span>
                  </div>
                  <p className="text-2xs text-emerald-800">
                    Weight difference is within standard doorstep-to-warehouse tolerance.
                  </p>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {submitting ? 'Recording Reception...' : 'Confirm Intake & Record Gross Scale'}
          </button>
        </form>
      </div>

      {/* Reception Result Celebration Card */}
      {receptionResult && (
        <div className="bg-emerald-50 border-2 border-emerald-400 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
            <div>
              <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                Batch Successfully Received!
              </h4>
              <p className="text-2xs text-emerald-800 mt-0.5">
                QR: {receptionResult.qrCode} • Net Loss: {receptionResult.lossPercent}%
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate(`/store/batches/${receptionResult._id}/sort`)}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Proceed to Sort This Batch into Recycler Streams <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Pending / Active Batches Quick Picker */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Pending Collector Batches ({pendingBatches.length})
          </h4>
          <span className="text-2xs text-slate-400 font-medium">Awaiting Scale Intake</span>
        </div>

        {loading ? (
          <p className="text-xs text-slate-400 py-3 text-center">Loading batches...</p>
        ) : pendingBatches.length === 0 ? (
          <div className="p-6 bg-slate-50 rounded-2xl text-center space-y-2">
            <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
              <Truck className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-700">No Batches Awaiting Scale Intake</p>
            <p className="text-2xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              When a collector finishes their collection route and generates their End-of-Day Deposit QR from the Collector app, it will appear here instantly for weighing.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {batches
              .filter((b) => ['deposited', 'created'].includes(b.status))
              .map((b) => (
                <div
                  key={b._id}
                  onClick={() => handleSelectBatch(b)}
                  className={`p-3.5 rounded-2xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                    selectedBatch?._id === b._id
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-xs'
                      : 'border-slate-200 bg-slate-50/70 hover:border-emerald-400 hover:bg-emerald-50/30 text-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-mono font-bold text-slate-900">{b.qrCode}</p>
                      <span className="text-2xs font-bold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded uppercase">
                        {b.status}
                      </span>
                    </div>
                    <p className="text-2xs text-slate-500 font-normal mt-0.5">
                      Collector: {b.collectorId?.name || 'Partner'} • {b.pickupRequestIds?.length || 1} Visits • Tap to auto-fill
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-emerald-700 block">
                      {b.depositedWeightKg ?? b.totalWeightDepositedKg ?? 0} kg
                    </span>
                    <span className="text-2xs text-emerald-600 font-bold underline">
                      Select for Intake ➔
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreIntakePage;
