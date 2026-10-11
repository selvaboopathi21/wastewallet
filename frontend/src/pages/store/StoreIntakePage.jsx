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
} from 'lucide-react';
import api from '../../api/axios';

export const StoreIntakePage = () => {
  const navigate = useNavigate();

  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [qrInput, setQrInput] = useState('');
  const [receivedWeight, setReceivedWeight] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receptionResult, setReceptionResult] = useState(null);
  const [error, setError] = useState('');

  // Fetch active pending batches
  const fetchBatches = async () => {
    try {
      const res = await api.get('/batches');
      const list = res?.data?.data?.batches || res?.data?.batches || [];
      setBatches(list);
    } catch (err) {
      console.error('Error fetching batches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  // Handle selecting a pending batch
  const handleSelectBatch = (batch) => {
    setSelectedBatch(batch);
    setQrInput(batch.qrCode);
    const weight = batch.depositedWeightKg ?? batch.totalWeightDepositedKg ?? '';
    setReceivedWeight(weight ? weight.toString() : '');
    setReceptionResult(null);
    setError('');
  };

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

  // Calculate live loss % preview
  const depositedKg = selectedBatch?.depositedWeightKg ?? selectedBatch?.totalWeightDepositedKg ?? 0;
  const receivedKg = parseFloat(receivedWeight) || 0;
  const liveLossPercent =
    depositedKg > 0 && receivedKg > 0
      ? (((depositedKg - receivedKg) / depositedKg) * 100).toFixed(1)
      : null;

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

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Reception Form Card */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <form onSubmit={handleReceiveBatch} className="space-y-3">
          {/* QR Code Input */}
          <div>
            <label className="block text-2xs font-bold text-slate-600 uppercase mb-1">
              Batch QR Code / Identifier
            </label>
            <div className="relative">
              <QrCode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="e.g. BATCH-MV3IA5CP-9033"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value.toUpperCase())}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Warehouse Gross Scale Weight */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-2xs font-bold text-slate-600 uppercase">
                Gross Received Scale Weight (Kg)
              </label>
              {depositedKg > 0 && (
                <span className="text-2xs text-slate-400">
                  Deposited by collector: <strong className="text-slate-700">{depositedKg} kg</strong>
                </span>
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

          {/* Live Loss % Preview */}
          {liveLossPercent !== null && (
            <div
              className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${
                parseFloat(liveLossPercent) > 15
                  ? 'bg-rose-50 border-rose-300 text-rose-900'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-950'
              }`}
            >
              <div>
                <span className="font-bold">Calculated Weight Loss: </span>
                <span className="font-mono font-black text-sm">{liveLossPercent}%</span>
              </div>
              {parseFloat(liveLossPercent) > 15 ? (
                <span className="text-2xs font-bold bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full">
                  ⚠️ High Loss Divergence
                </span>
              ) : (
                <span className="text-2xs font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                  Normal Tolerance (&lt;15%)
                </span>
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
            Pending Collector Batches ({batches.filter((b) => ['deposited', 'created'].includes(b.status)).length})
          </h4>
          <span className="text-2xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
            Awaiting Scale Intake
          </span>
        </div>

        {loading ? (
          <p className="text-xs text-slate-400 py-3 text-center">Loading batches...</p>
        ) : batches.filter((b) => ['deposited', 'created'].includes(b.status)).length === 0 ? (
          <div className="p-4 bg-slate-50 rounded-2xl text-center text-xs text-slate-500 font-medium space-y-1">
            <p>No pending batches awaiting intake.</p>
            <p className="text-2xs text-slate-400">
              When a collector completes pickups and clicks "Generate Deposit QR Code", it will appear here for 1-click scanning!
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
                      Collector: {b.collectorId?.name || 'Partner'} • Tap to auto-fill
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
