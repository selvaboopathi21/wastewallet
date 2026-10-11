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
} from 'lucide-react';
import api from '../../api/axios';

export const CollectorBatchPage = () => {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeBatch, setActiveBatch] = useState(null);
  const [error, setError] = useState('');

  const fetchBatches = async () => {
    try {
      const res = await api.get('/batches');
      const list = res?.data?.data?.batches || res?.data?.batches || [];
      setBatches(list);
      if (list.length > 0 && !activeBatch) {
        setActiveBatch(list[0]);
      }
    } catch (err) {
      console.error('Error fetching batches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleGenerateBatch = async () => {
    setGenerating(true);
    setError('');
    try {
      const res = await api.post('/batches');
      const newBatch = res?.data?.batch || res?.data?.data?.batch;
      if (newBatch) {
        setActiveBatch(newBatch);
        setBatches((prev) => [newBatch, ...prev]);
        alert(`Deposit batch created: ${newBatch.qrCode}`);
      }
    } catch (err) {
      setError(err.message || 'No completed pickups found to deposit, or failed to create batch.');
    } finally {
      setGenerating(false);
    }
  };

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
          <p className="text-2xs text-slate-400">Warehouse Reception & Intake Handover</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Action: Generate Deposit QR */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              End-of-Day Handover
            </span>
          </div>
          <span className="text-2xs font-mono font-bold bg-white/10 px-2 py-0.5 rounded text-emerald-400">
            Warehouse Hub
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Bundle all completed doorstep pickups from today into a verifiable deposit batch. The store staff will scan this QR, re-weigh the bags on warehouse gross scales, and compute loss %.
        </p>

        <button
          onClick={handleGenerateBatch}
          disabled={generating}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
        >
          <QrCode className="w-4 h-4" />
          {generating ? 'Bundling Pickups...' : 'Generate Today\'s Deposit QR'}
        </button>
      </div>

      {/* Active QR Card Display */}
      {activeBatch && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md text-center space-y-4">
          <div className="inline-block bg-slate-900 p-6 rounded-3xl shadow-inner">
            {/* Visual Simulated QR Code Box */}
            <div className="w-48 h-48 bg-white p-3 rounded-2xl mx-auto flex flex-col items-center justify-center border-4 border-slate-800">
              <QrCode className="w-36 h-36 text-slate-950" />
            </div>
            <p className="text-xs font-mono font-black text-emerald-400 mt-3 tracking-widest">
              {activeBatch.qrCode}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="p-2 bg-slate-50 rounded-xl">
              <p className="text-2xs text-slate-400 font-semibold uppercase">Pickups</p>
              <p className="text-sm font-black text-slate-900 mt-0.5">
                {activeBatch.pickups?.length || 0}
              </p>
            </div>
            <div className="p-2 bg-slate-50 rounded-xl">
              <p className="text-2xs text-slate-400 font-semibold uppercase">Total Weight</p>
              <p className="text-sm font-black text-emerald-600 mt-0.5">
                {activeBatch.totalWeightDepositedKg || 0} kg
              </p>
            </div>
            <div className="p-2 bg-slate-50 rounded-xl">
              <p className="text-2xs text-slate-400 font-semibold uppercase">Status</p>
              <p className="text-2xs font-bold text-slate-800 uppercase mt-1">
                {activeBatch.status}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Past Batches History */}
      {batches.length > 1 && (
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Previous Deposit Batches
          </h4>
          <div className="divide-y divide-slate-100 text-xs">
            {batches.map((b) => (
              <div
                key={b._id}
                onClick={() => setActiveBatch(b)}
                className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 px-2 rounded-xl"
              >
                <div>
                  <p className="font-mono font-bold text-slate-900">{b.qrCode}</p>
                  <p className="text-2xs text-slate-400">
                    {new Date(b.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-700">{b.totalWeightDepositedKg} kg</p>
                  <span className="text-2xs text-slate-400 uppercase font-semibold">{b.status}</span>
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
