// StoreSortingPage: Sort received scrap into material streams and automatically route to verified recycling buyers
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Boxes,
  Truck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Building2,
  Layers,
} from 'lucide-react';
import api from '../../api/axios';

const MATERIAL_STREAMS = [
  {
    type: 'copper_wire',
    name: 'Copper & Heavy Wiring',
    expectedBuyer: 'Metro Smelters Ltd.',
    isSpecialHandling: false,
    icon: '🔌',
  },
  {
    type: 'battery',
    name: 'Lead-Acid & Inverter Batteries',
    expectedBuyer: 'Tamil Nadu Lead Recyclers',
    isSpecialHandling: true,
    warning: 'Hazardous Materials Handling Protocol Required',
    icon: '🔋',
  },
  {
    type: 'ewaste',
    name: 'Electronic PCBs & Components',
    expectedBuyer: 'Green Tech Recyclers',
    isSpecialHandling: true,
    warning: 'Toxic Heavy Metals Protocol Required',
    icon: '💻',
  },
  {
    type: 'plastic',
    name: 'Rigid & Flexible Plastics',
    expectedBuyer: 'Adyar Polymers',
    isSpecialHandling: false,
    icon: '🧴',
  },
  {
    type: 'iron',
    name: 'Scrap Iron & Structural Steel',
    expectedBuyer: 'Metro Smelters Ltd.',
    isSpecialHandling: false,
    icon: '🔩',
  },
];

export const StoreSortingPage = () => {
  const { id: urlBatchId } = useParams();
  const navigate = useNavigate();

  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState(urlBatchId || '');
  const [batchDetails, setBatchDetails] = useState(null);
  const [weights, setWeights] = useState({
    copper_wire: '',
    battery: '',
    ewaste: '',
    plastic: '',
    iron: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [routingResults, setRoutingResults] = useState(null);
  const [error, setError] = useState('');

  // Fetch batches ready for sorting (status: 'received')
  const fetchBatches = async () => {
    try {
      const res = await api.get('/batches');
      const list = res?.data?.data?.batches || res?.data?.batches || [];
      const receivedList = list.filter((b) => b.status === 'received');
      setBatches(receivedList);

      if (!selectedBatchId && receivedList.length > 0) {
        setSelectedBatchId(receivedList[0]._id);
      }
    } catch (err) {
      console.error('Error fetching batches:', err);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  // Fetch specific batch details
  const fetchBatchDetails = async (bId) => {
    if (!bId) return;
    setLoading(true);
    try {
      const res = await api.get(`/batches/${bId}`);
      const data = res?.data?.data || res?.data;
      setBatchDetails(data?.batch || data);
      setRoutingResults(null);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load batch details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBatchId) {
      fetchBatchDetails(selectedBatchId);
    }
  }, [selectedBatchId]);

  // Submit sorting
  const handleSortSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedBatchId) {
      return setError('Please select a batch to sort');
    }

    const items = [];
    Object.entries(weights).forEach(([mat, wt]) => {
      const num = parseFloat(wt);
      if (num && num > 0) {
        items.push({ materialType: mat, weightKg: num });
      }
    });

    if (items.length === 0) {
      return setError('Please enter weight for at least one sorted stream');
    }

    setSubmitting(true);
    try {
      const res = await api.post(`/batches/${selectedBatchId}/sort`, { items });
      const data = res?.data?.data || res?.data;
      setRoutingResults(data?.sortedMaterials || []);
      await fetchBatches();
    } catch (err) {
      setError(err.message || 'Failed to sort batch');
    } finally {
      setSubmitting(false);
    }
  };

  const totalSortedKg = Object.values(weights).reduce(
    (sum, val) => sum + (parseFloat(val) || 0),
    0
  );

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <h2 className="text-base font-black text-slate-900 leading-tight">
          Material Stream Sorting & Recycler Routing
        </h2>
        <p className="text-2xs text-slate-500">
          Separate bulk warehouse intake bags and automatically dispatch to licensed recyclers
        </p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Batch Selector */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-2">
        <label className="block text-2xs font-bold text-slate-600 uppercase">
          Select Received Batch for Sorting
        </label>
        {batches.length === 0 && !batchDetails ? (
          <div className="p-3 bg-slate-50 rounded-2xl text-xs text-slate-500 text-center font-medium">
            No batches in "received" status. Scan and weigh a batch in the QR Intake tab first!
          </div>
        ) : (
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {batches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.qrCode} ({b.totalWeightReceivedKg || b.totalWeightDepositedKg} kg)
              </option>
            ))}
          </select>
        )}

        {batchDetails && (
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-2xs">
            <span className="text-slate-500">
              Warehouse Scale Weight: <strong className="text-slate-800">{batchDetails.totalWeightReceivedKg} kg</strong>
            </span>
            <span className="text-slate-500">
              Loss: <strong className="text-emerald-700">{batchDetails.lossPercent}%</strong>
            </span>
          </div>
        )}
      </div>

      {/* Sorting Form */}
      {batchDetails && batchDetails.status === 'received' && !routingResults && (
        <form onSubmit={handleSortSubmit} className="space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-emerald-600" />
                Sort into Certified Streams
              </h3>
              <span className="text-2xs font-mono font-bold text-slate-500">
                Sorted: {totalSortedKg.toFixed(1)} kg / {batchDetails.totalWeightReceivedKg} kg
              </span>
            </div>

            <div className="space-y-2.5">
              {MATERIAL_STREAMS.map((mat) => (
                <div
                  key={mat.type}
                  className={`p-3 rounded-2xl border text-xs transition-all ${
                    mat.isSpecialHandling
                      ? 'border-amber-300 bg-amber-50/40'
                      : 'border-slate-200 bg-slate-50/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{mat.icon}</span>
                      <div>
                        <p className="font-bold text-slate-900">{mat.name}</p>
                        <p className="text-2xs text-slate-500">Buyer: {mat.expectedBuyer}</p>
                      </div>
                    </div>

                    {mat.isSpecialHandling && (
                      <span className="text-2xs font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3 text-amber-600" />
                        Special Handling
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="0.0"
                      value={weights[mat.type]}
                      onChange={(e) => setWeights({ ...weights, [mat.type]: e.target.value })}
                      className="w-full pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-xl font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-2xs font-bold text-slate-400">
                      kg
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {submitting ? 'Routing to Recyclers...' : 'Confirm Sorting & Route to Buyers'}
            </button>
          </div>
        </form>
      )}

      {/* Recycler Buyer Routing Results Card */}
      {routingResults && routingResults.length > 0 && (
        <div className="bg-emerald-50 border-2 border-emerald-400 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
            <div>
              <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                Recycler Routing Manifest Generated!
              </h4>
              <p className="text-2xs text-emerald-800 mt-0.5">
                Batch sorted into {routingResults.length} certified industrial recovery channels.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {routingResults.map((mat, idx) => (
              <div
                key={idx}
                className="bg-white p-3 rounded-2xl border border-emerald-200 flex items-center justify-between text-xs shadow-xs"
              >
                <div>
                  <p className="font-bold text-slate-900 capitalize">
                    {mat.materialType.replace('_', ' ')}
                  </p>
                  <p className="text-2xs text-slate-500">
                    Destination: <strong className="text-slate-800">{mat.destinationBuyerId?.name || 'Assigned Recycler Partner'}</strong>
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-emerald-700">{mat.weightKg} kg</span>
                  {mat.isSpecialHandling && (
                    <span className="block text-2xs font-bold text-amber-700">⚠️ Special Safe</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              setRoutingResults(null);
              fetchBatches();
            }}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-3 rounded-xl text-xs cursor-pointer"
          >
            Sort Another Batch
          </button>
        </div>
      )}
    </div>
  );
};

export default StoreSortingPage;
