// StoreSortingPage: Sort received scrap into material streams and automatically route to verified recycling buyers
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Boxes,
  Truck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Building2,
  Layers,
  User,
  Scale,
  RotateCcw,
  Clock,
  ExternalLink,
} from 'lucide-react';
import api from '../../api/axios';

const MATERIAL_STREAMS = [
  {
    type: 'iron',
    name: 'Scrap Iron & Structural Steel',
    expectedBuyer: 'Chennai Metal Recyclers Ltd',
    isSpecialHandling: false,
    icon: '🔩',
  },
  {
    type: 'plastic',
    name: 'Rigid & Flexible Plastics',
    expectedBuyer: 'Tamil Nadu Plastic Processing Plant',
    isSpecialHandling: false,
    icon: '🧴',
  },
  {
    type: 'copper_wire',
    name: 'Copper & Heavy Wiring',
    expectedBuyer: 'Apex Copper Recovery Unit',
    isSpecialHandling: false,
    icon: '🔌',
  },
  {
    type: 'ewaste',
    name: 'Electronic PCBs & Components',
    expectedBuyer: 'Eco-Green E-Waste Recyclers',
    isSpecialHandling: true,
    warning: 'Toxic Heavy Metals Protocol Required',
    icon: '💻',
  },
  {
    type: 'battery',
    name: 'Lead-Acid & Inverter Batteries',
    expectedBuyer: 'VoltPower Battery Safe Recovery',
    isSpecialHandling: true,
    warning: 'Hazardous Materials Handling Protocol Required',
    icon: '🔋',
  },
  {
    type: 'paper',
    name: 'Cardboard & Paper Pulp',
    expectedBuyer: 'South Paper Mill Reclaimers',
    isSpecialHandling: false,
    icon: '📰',
  },
  {
    type: 'other',
    name: 'Other Segregated Scrap',
    expectedBuyer: 'Chennai Metal Recyclers Ltd',
    isSpecialHandling: false,
    icon: '📦',
  },
  {
    type: 'mixed',
    name: 'Mixed Domestic Scrap',
    expectedBuyer: 'Tamil Nadu Plastic Processing Plant',
    isSpecialHandling: false,
    icon: '♻️',
  },
];

export const StoreSortingPage = () => {
  const { id: urlBatchId } = useParams();
  const navigate = useNavigate();

  // Tab: 'received' (awaiting stream sorting) vs 'sorted' (manifest generated)
  const [tab, setTab] = useState('received');

  const [allBatches, setAllBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState(urlBatchId || '');
  const [batchDetails, setBatchDetails] = useState(null);
  const [pickupItems, setPickupItems] = useState([]);
  const [savedSortedMaterials, setSavedSortedMaterials] = useState([]);
  const [isEditingSorted, setIsEditingSorted] = useState(false);

  const [weights, setWeights] = useState({
    iron: '',
    plastic: '',
    copper_wire: '',
    ewaste: '',
    battery: '',
    paper: '',
    other: '',
    mixed: '',
  });

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [quickIntaking, setQuickIntaking] = useState(false);
  const [routingResults, setRoutingResults] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch batches from backend
  const fetchBatches = async () => {
    try {
      const res = await api.get('/batches?view=store');
      const list = res?.data?.data?.batches || res?.data?.batches || [];
      setAllBatches(list);

      const receivedList = list.filter((b) => b.status === 'received');
      const sortedList = list.filter((b) => b.status === 'sorted');

      // Auto-select batch if none selected
      setSelectedBatchId((prevId) => {
        if (prevId && list.some((b) => b._id === prevId)) {
          return prevId;
        }
        if (urlBatchId && list.some((b) => b._id === urlBatchId)) {
          return urlBatchId;
        }
        if (receivedList.length > 0) {
          setTab('received');
          return receivedList[0]._id;
        }
        if (sortedList.length > 0) {
          setTab('sorted');
          return sortedList[0]._id;
        }
        return '';
      });
    } catch (err) {
      console.error('Error fetching batches:', err);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [urlBatchId]);

  // Fetch specific batch details
  const fetchBatchDetails = async (bId) => {
    if (!bId) {
      setBatchDetails(null);
      setPickupItems([]);
      setSavedSortedMaterials([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/batches/${bId}`);
      const data = res?.data?.data || res?.data;
      const bObj = data?.batch || data;
      setBatchDetails(bObj);
      setPickupItems(data?.pickupItems || []);
      const existingSorted = data?.sortedMaterials || [];
      setSavedSortedMaterials(existingSorted);

      // Pre-fill weights if already sorted
      if (existingSorted.length > 0) {
        const prefill = {
          iron: '',
          plastic: '',
          copper_wire: '',
          ewaste: '',
          battery: '',
          paper: '',
          other: '',
          mixed: '',
        };
        existingSorted.forEach((sm) => {
          if (prefill[sm.materialType] !== undefined) {
            prefill[sm.materialType] = sm.weightKg?.toString() || '';
          }
        });
        setWeights(prefill);
      } else {
        // Clear weights for new un-sorted batch
        setWeights({
          iron: '',
          plastic: '',
          copper_wire: '',
          ewaste: '',
          battery: '',
          paper: '',
          other: '',
          mixed: '',
        });
      }

      setRoutingResults(null);
      setIsEditingSorted(false);
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

  // Auto-fill weights from Doorstep Collected Items
  const handleAutoFillFromDoorstep = () => {
    if (!pickupItems || pickupItems.length === 0) return;
    const newWeights = {
      iron: '',
      plastic: '',
      copper_wire: '',
      ewaste: '',
      battery: '',
      paper: '',
      other: '',
      mixed: '',
    };
    pickupItems.forEach((item) => {
      const cat = item.category || item.materialType;
      if (newWeights[cat] !== undefined) {
        const cur = parseFloat(newWeights[cat]) || 0;
        newWeights[cat] = (cur + (item.weightKg || 0)).toFixed(1);
      }
    });
    setWeights(newWeights);
    setSuccessMsg('✓ Stream weights auto-filled from doorstep pickup items!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Quick-Intake a deposited batch directly from this page
  const handleQuickIntake = async (batchToReceive) => {
    setQuickIntaking(true);
    setError('');
    try {
      const targetWeight =
        batchToReceive.depositedWeightKg ?? batchToReceive.totalWeightDepositedKg ?? 1.0;
      const res = await api.post(`/batches/${encodeURIComponent(batchToReceive.qrCode)}/receive`, {
        receivedWeightKg: targetWeight,
      });
      const received = res?.data?.batch || res?.data?.data?.batch;
      setSuccessMsg(`✓ Batch ${batchToReceive.qrCode} received at ${targetWeight} kg!`);
      await fetchBatches();
      if (received?._id) {
        setSelectedBatchId(received._id);
        setTab('received');
      }
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to intake batch');
    } finally {
      setQuickIntaking(false);
    }
  };

  // Submit sorting
  const handleSortSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

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
      const createdSorted = data?.sortedMaterials || [];
      setRoutingResults(createdSorted);
      setSavedSortedMaterials(createdSorted);
      setIsEditingSorted(false);

      if (batchDetails) {
        setBatchDetails({ ...batchDetails, status: 'sorted' });
      }

      await fetchBatches();
      setSuccessMsg('✓ Material streams sorted and dispatched to industrial buyers successfully!');
    } catch (err) {
      setError(err.message || 'Failed to sort batch');
    } finally {
      setSubmitting(false);
    }
  };

  const receivedBatches = allBatches.filter((b) => b.status === 'received');
  const sortedBatches = allBatches.filter((b) => b.status === 'sorted');
  const depositedBatches = allBatches.filter((b) => ['deposited', 'created'].includes(b.status));

  const currentList = tab === 'received' ? receivedBatches : sortedBatches;

  const totalSortedKg = Object.values(weights).reduce(
    (sum, val) => sum + (parseFloat(val) || 0),
    0
  );

  const scaleDeliveredKg = batchDetails
    ? batchDetails.receivedWeightKg ?? batchDetails.depositedWeightKg ?? 0
    : 0;

  const weightDiff = (totalSortedKg - scaleDeliveredKg).toFixed(1);
  const isPerfectMatch = Math.abs(totalSortedKg - scaleDeliveredKg) < 0.05 && scaleDeliveredKg > 0;

  return (
    <div className="space-y-4">
      {/* Header with Back Button */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => navigate('/store')}
          className="w-9 h-9 flex items-center justify-center bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all text-slate-700 shadow-xs cursor-pointer active:scale-95 shrink-0"
          title="Go Back to Intake"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-base font-black text-slate-900 leading-tight">
            Material Stream Sorting & Recycler Routing
          </h2>
          <p className="text-2xs text-slate-500">
            Separate bulk warehouse intake bags and automatically dispatch to licensed recyclers
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Deposited Batches Notice (Quick-Intake Available) */}
      {depositedBatches.length > 0 && (
        <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-3xl text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-amber-900 flex items-center gap-1.5">
              <span>🚚</span>
              <span>
                {depositedBatches.length} Collector Batch{depositedBatches.length > 1 ? 'es' : ''} Awaiting Warehouse Intake
              </span>
            </span>
            <Link
              to="/store"
              className="text-2xs font-bold text-amber-800 hover:text-amber-950 underline flex items-center gap-0.5"
            >
              <span>Scan in Intake</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-1.5">
            {depositedBatches.map((db) => (
              <div
                key={db._id}
                className="bg-white/90 p-2.5 rounded-2xl border border-amber-200 flex items-center justify-between text-2xs"
              >
                <div>
                  <span className="font-mono font-bold text-slate-900">{db.qrCode}</span>
                  <span className="text-slate-500 ml-1.5">
                    ({db.collectorId?.name || 'Collector'}) • Deposited: <strong>{db.depositedWeightKg} kg</strong>
                  </span>
                </div>
                <button
                  type="button"
                  disabled={quickIntaking}
                  onClick={() => handleQuickIntake(db)}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-3xs transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  ⚡ Quick Intake & Sort
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Switcher: Ready for Sorting vs Already Sorted */}
      <div className="flex bg-slate-200/80 p-1 rounded-2xl text-xs font-bold">
        <button
          type="button"
          onClick={() => {
            setTab('received');
            if (receivedBatches.length > 0) {
              setSelectedBatchId(receivedBatches[0]._id);
            }
          }}
          className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            tab === 'received'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Boxes className="w-4 h-4 text-emerald-600" />
          <span>Ready for Sorting ({receivedBatches.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setTab('sorted');
            if (sortedBatches.length > 0) {
              setSelectedBatchId(sortedBatches[0]._id);
            }
          }}
          className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            tab === 'sorted'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Sorted & Dispatched ({sortedBatches.length})</span>
        </button>
      </div>

      {/* Batch Selector */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-2.5">
        <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider">
          {tab === 'received' ? 'Select Received Batch to Sort' : 'Select Sorted Batch Manifest'}
        </label>

        {currentList.length === 0 ? (
          <div className="p-4 bg-slate-50 rounded-2xl text-xs text-slate-500 text-center font-medium space-y-2">
            <p>
              {tab === 'received'
                ? 'No batches currently awaiting sorting in "received" status.'
                : 'No batches sorted yet.'}
            </p>
            {tab === 'received' && (
              <button
                onClick={() => navigate('/store')}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 cursor-pointer"
              >
                Go to QR Intake to Receive Batches ➔
              </button>
            )}
          </div>
        ) : (
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {currentList.map((b) => {
              const customerNames = b.pickupRequestIds?.map((p) => p.customerId?.name).filter(Boolean).join(', ') || '';
              const weightVal = b.receivedWeightKg ?? b.depositedWeightKg ?? 0;
              return (
                <option key={b._id} value={b._id}>
                  {b.qrCode} — {b.collectorId?.name || 'Collector'} {customerNames ? `[${customerNames}]` : ''} ({weightVal} kg)
                </option>
              );
            })}
          </select>
        )}

        {/* Selected Batch Traceability Summary Card */}
        {batchDetails && (
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-2xs space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <div>
                <span className="text-3xs uppercase font-bold text-slate-400 block">Collector Handover</span>
                <span className="font-bold text-slate-900 text-xs">
                  {batchDetails.collectorId?.name || 'Partner Collector'} ({batchDetails.collectorId?.phone || 'Verified'})
                </span>
              </div>
              <div className="text-right">
                <span className="text-3xs uppercase font-bold text-slate-400 block">Warehouse Scale</span>
                <span className="font-mono font-black text-emerald-700 text-xs">
                  {scaleDeliveredKg.toFixed(1)} kg
                </span>
                <span className="text-3xs text-slate-400 ml-1">
                  (Loss: {batchDetails.lossPercent ?? 0}%)
                </span>
              </div>
            </div>

            {/* Customer Doorstep Visits Included */}
            {batchDetails.pickupRequestIds && batchDetails.pickupRequestIds.length > 0 && (
              <div>
                <span className="text-3xs uppercase font-bold text-slate-400 block mb-1">
                  Doorstep Customer Visits in this Batch ({batchDetails.pickupRequestIds.length})
                </span>
                <div className="space-y-1">
                  {batchDetails.pickupRequestIds.map((p, pIdx) => (
                    <div
                      key={p._id || pIdx}
                      className="bg-white p-2 rounded-xl border border-slate-200/70 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-slate-800">
                          {p.customerId?.name || 'Customer'}
                        </span>
                        <span className="text-slate-400 ml-1.5 font-mono">
                          • {p.address || 'Address on record'}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-slate-700">
                        {p.totalPickupWeightKg || 0} kg
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Doorstep Collected Scrap Categories & Auto-Fill button */}
            {pickupItems.length > 0 && (
              <div className="pt-2 border-t border-slate-200/60">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-3xs uppercase font-bold text-slate-500">
                    Doorstep Scrap Items Collected ({pickupItems.length})
                  </span>
                  {(!batchDetails || batchDetails.status === 'received' || isEditingSorted) && (
                    <button
                      type="button"
                      onClick={handleAutoFillFromDoorstep}
                      className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold rounded-lg text-3xs cursor-pointer flex items-center gap-1 active:scale-95"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-700" />
                      <span>Auto-Fill Stream Weights</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {pickupItems.map((pi, piIdx) => (
                    <span
                      key={pi._id || piIdx}
                      className="px-2 py-1 bg-white rounded-lg border border-slate-200 font-mono font-bold text-slate-800 text-3xs flex items-center gap-1"
                    >
                      <span className="capitalize">{(pi.category || pi.materialType || '').replace('_', ' ')}:</span>
                      <span className="text-emerald-700">{pi.weightKg} kg</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* VIEW A: Active Sorting Form for Received Batch (or when re-sorting) */}
      {batchDetails && (batchDetails.status === 'received' || isEditingSorted) && !routingResults && (
        <form onSubmit={handleSortSubmit} className="space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-emerald-600" />
                Sort into Certified Streams
              </h3>

              <div className="text-right">
                <span className="text-2xs font-mono font-bold block text-slate-700">
                  Sorted: <span className="text-emerald-700 font-black">{totalSortedKg.toFixed(1)} kg</span> / {scaleDeliveredKg.toFixed(1)} kg
                </span>
                {isPerfectMatch ? (
                  <span className="text-3xs font-bold text-emerald-700 block">✓ Perfectly Balanced</span>
                ) : (
                  <span className="text-3xs text-slate-400 block font-mono">
                    {weightDiff > 0 ? `+${weightDiff} kg surplus` : `${weightDiff} kg remaining`}
                  </span>
                )}
              </div>
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
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-50 active:scale-98"
            >
              <Sparkles className="w-4 h-4 text-emerald-200" />
              <span>{submitting ? 'Routing to Industrial Recyclers...' : 'Confirm Sorting & Route to Buyers ➔'}</span>
            </button>
          </div>
        </form>
      )}

      {/* VIEW B: Newly Generated Routing Manifest Celebration Card */}
      {routingResults && routingResults.length > 0 && (
        <div className="bg-emerald-50 border-2 border-emerald-400 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0" />
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
                    Buyer Channel: <strong className="text-slate-800">{mat.destinationBuyerId?.name || 'Metro Smelters / Licensed Partner'}</strong>
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-emerald-700 text-sm">{mat.weightKg} kg</span>
                  {mat.isSpecialHandling && (
                    <span className="block text-3xs font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                      ⚠️ Special Handling
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Link
              to="/store/handover"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 px-3 rounded-xl text-xs cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all"
            >
              <Truck className="w-4 h-4 text-emerald-200" />
              <span>Handover Stock to Tie-Up Company ➔</span>
            </Link>
            <button
              onClick={() => {
                setRoutingResults(null);
                fetchBatches();
              }}
              className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer text-center"
            >
              Sort Another Batch
            </button>
            <button
              onClick={() => {
                setIsEditingSorted(true);
                setRoutingResults(null);
              }}
              className="px-3 py-2.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-50 cursor-pointer"
            >
              Adjust Weights
            </button>
          </div>
        </div>
      )}

      {/* VIEW C: Inspection of Already Sorted Batch (When tab === 'sorted' and not editing) */}
      {batchDetails && batchDetails.status === 'sorted' && !routingResults && !isEditingSorted && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Completed Recycler Dispatch Manifest
                </h3>
                <p className="text-2xs text-slate-500">
                  This batch was separated and successfully dispatched to industrial recycling buyers.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsEditingSorted(true)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Adjust Weights</span>
            </button>
          </div>

          {savedSortedMaterials.length > 0 ? (
            <div className="space-y-2">
              {savedSortedMaterials.map((mat, idx) => (
                <div
                  key={mat._id || idx}
                  className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-900 capitalize">
                      {mat.materialType.replace('_', ' ')}
                    </p>
                    <p className="text-2xs text-slate-500">
                      Licensed Recycler: <strong className="text-slate-800">{mat.destinationBuyerId?.name || 'Metro Smelters Ltd. / Licensed Recycler'}</strong>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-emerald-700 text-sm">{mat.weightKg} kg</span>
                    {mat.isSpecialHandling && (
                      <span className="block text-3xs font-bold text-amber-700">⚠️ Segregated Safe</span>
                    )}
                  </div>
                </div>
              ))}
              <div className="pt-2">
                <Link
                  to="/store/handover"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-98"
                >
                  <Truck className="w-4 h-4 text-emerald-200" />
                  <span>Handover Available Stock to Recycler Companies ➔</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-2xl text-center text-xs text-slate-500">
              <p>No itemized streams recorded for this historical batch.</p>
              <button
                type="button"
                onClick={() => setIsEditingSorted(true)}
                className="mt-2 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 cursor-pointer"
              >
                Enter Stream Breakdown Now ➔
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StoreSortingPage;
