// CompanyPortalPage: Dedicated portal for Tie-Up Recycling Companies to view incoming waste dispatches, confirm receipt & transmit acknowledgment messages to store staff
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  Truck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Boxes,
  Scale,
  MapPin,
  Phone,
  User,
  ShieldCheck,
  Send,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Layers,
  Sparkles,
  ArrowLeft,
  X,
  FileCheck2,
} from 'lucide-react';
import api from '../../api/axios';
import { useSocket } from '../../context/SocketContext';
import useAuth from '../../hooks/useAuth';

export const CompanyPortalPage = () => {
  const { id: urlCompanyId } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { user } = useAuth();

  // All tie-up companies for selector
  const [allCompanies, setAllCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(urlCompanyId || '');

  // Active Company Portal Data
  const [companyData, setCompanyData] = useState(null);
  const [pendingDispatches, setPendingDispatches] = useState([]);
  const [receivedHistory, setReceivedHistory] = useState([]);
  const [metrics, setMetrics] = useState({
    pendingCount: 0,
    pendingWeightKg: 0,
    receivedCount: 0,
    totalReceivedKg: 0,
  });

  // Active Tab: 'incoming' | 'history'
  const [activeTab, setActiveTab] = useState('incoming');

  // Receive Modal
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [activeDispatchToReceive, setActiveDispatchToReceive] = useState(null);
  const [verifiedWeight, setVerifiedWeight] = useState('');
  const [receivedNotes, setReceivedNotes] = useState('');

  // UI state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Fetch all companies for the switcher
  const fetchAllCompanies = async () => {
    try {
      const res = await api.get('/company-dispatch/companies');
      const list = res?.data?.data?.companies || res?.data?.companies || [];
      setAllCompanies(list);

      // Resolve initial company ID: URL param -> Logged in user match -> First company in list
      if (!selectedCompanyId) {
        if (urlCompanyId && list.some((c) => c._id === urlCompanyId)) {
          setSelectedCompanyId(urlCompanyId);
        } else if (user && user.role === 'buyer') {
          const matched = list.find((c) => c.contact?.phone === user.phone || c.name.toLowerCase().includes(user.name.toLowerCase()));
          if (matched) setSelectedCompanyId(matched._id);
          else if (list.length > 0) setSelectedCompanyId(list[0]._id);
        } else if (list.length > 0) {
          setSelectedCompanyId(list[0]._id);
        }
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
    }
  };

  useEffect(() => {
    fetchAllCompanies();
  }, [urlCompanyId]);

  // 2. Fetch specific company portal details
  const fetchPortalData = async (compId) => {
    if (!compId) return;
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/company-dispatch/portal/${compId}`);
      const data = res?.data?.data || res?.data;

      setCompanyData(data?.company || null);
      setPendingDispatches(data?.pendingDispatches || []);
      setReceivedHistory(data?.receivedHistory || []);
      setMetrics(
        data?.metrics || {
          pendingCount: 0,
          pendingWeightKg: 0,
          receivedCount: 0,
          totalReceivedKg: 0,
        }
      );
    } catch (err) {
      console.error('Error loading company portal:', err);
      setError(err?.response?.data?.message || err.message || 'Could not load company portal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCompanyId) {
      fetchPortalData(selectedCompanyId);
    }
  }, [selectedCompanyId]);

  // 3. Socket real-time listener for incoming scrap shipments
  useEffect(() => {
    if (!socket) return;

    const handleNewDispatch = (payload) => {
      console.log('📡 Real-time new dispatch detected:', payload);
      if (selectedCompanyId) {
        fetchPortalData(selectedCompanyId);
      }
      setSuccessMsg('📦 New scrap consignment dispatched to your facility by WasteWallet Store Staff!');
      setTimeout(() => setSuccessMsg(''), 6000);
    };

    socket.on('company.dispatch.created', handleNewDispatch);

    return () => {
      socket.off('company.dispatch.created', handleNewDispatch);
    };
  }, [socket, selectedCompanyId]);

  // Open Receive Modal
  const openReceiveModal = (disp) => {
    setActiveDispatchToReceive(disp);
    setVerifiedWeight(disp.weightKg?.toString() || '10.0');
    setReceivedNotes('Verified on weighbridge. Quality and weight match consignment.');
    setIsReceiveModalOpen(true);
    setError('');
  };

  // Submit Receipt Confirmation
  const handleConfirmReceive = async (e) => {
    e.preventDefault();
    if (!activeDispatchToReceive) return;

    const numWeight = parseFloat(verifiedWeight);
    if (!numWeight || numWeight <= 0) {
      return setError('Please enter a valid verified received weight in kg');
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await api.post(`/company-dispatch/receive/${activeDispatchToReceive._id}`, {
        receivedWeightKg: numWeight,
        receivedNotes,
      });

      const resultMsg = res?.data?.message || 'Receipt acknowledged and message transmitted to store staff!';
      setSuccessMsg(resultMsg);
      setIsReceiveModalOpen(false);
      setActiveDispatchToReceive(null);

      // Refresh data
      await fetchPortalData(selectedCompanyId);
      setActiveTab('history');
      setTimeout(() => setSuccessMsg(''), 8000);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to acknowledge receipt');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar */}
      <header className="bg-slate-950/90 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/store/handover"
              className="w-9 h-9 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer"
              title="Return to Store Depot"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm font-black leading-tight text-white flex items-center gap-1.5">
                  <span>WasteWallet Recycler Portal</span>
                  <span className="text-3xs bg-emerald-500/20 text-emerald-300 font-mono font-bold px-1.5 py-0.2 rounded border border-emerald-500/30">
                    B2B Plant Gateway
                  </span>
                </h1>
                <p className="text-3xs text-slate-400">
                  Tie-up recycling plant intake & scrap consignment receipt system
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => selectedCompanyId && fetchPortalData(selectedCompanyId)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Refresh Portal Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            <Link
              to="/login"
              className="px-2.5 py-1.5 text-2xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors"
            >
              Switch Account
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 space-y-4">
        {/* Company Switcher Bar */}
        <div className="bg-slate-850 p-3.5 rounded-3xl border border-slate-750 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <span>🏢</span>
              <span>Viewing Plant:</span>
            </span>
            <div className="relative flex-1 sm:w-80">
              <select
                value={selectedCompanyId}
                onChange={(e) => {
                  setSelectedCompanyId(e.target.value);
                  navigate(`/company/${e.target.value}`);
                }}
                className="w-full pl-3 pr-8 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {allCompanies.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} — Accepts: {c.acceptedMaterials.join(', ').toUpperCase()}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <span className="text-3xs text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700 self-start sm:self-auto">
            ⚡ Switch between companies to test receiving items
          </span>
        </div>

        {/* Global Notifications / Alerts */}
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-gradient-to-r from-emerald-950 to-slate-900 border-2 border-emerald-400 rounded-3xl text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-xl animate-pulse">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Company Profile Hero Card */}
        {companyData && (
          <div className="bg-gradient-to-br from-slate-850 via-slate-850 to-slate-900 p-5 rounded-3xl border border-slate-750 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-white">{companyData.name}</h2>
                  <span className="text-3xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    Licensed Recycler
                  </span>
                </div>
                <p className="text-2xs text-slate-400 flex items-center gap-1.5 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>{companyData.location || 'Ambattur Industrial Estate, Chennai'}</span>
                </p>
              </div>

              {/* Requirements Badges */}
              <div className="flex flex-wrap gap-1.5 self-start sm:self-auto">
                <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block w-full sm:w-auto">
                  Accepted Streams:
                </span>
                {companyData.acceptedMaterials?.map((mat) => (
                  <span
                    key={mat}
                    className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl text-3xs font-black uppercase tracking-wider flex items-center gap-1"
                  >
                    <span>✓</span>
                    <span>{mat.replace('_', ' ')}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Plant In-Charge Details & Key Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-800 text-2xs">
              <div className="bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800">
                <span className="text-3xs text-slate-500 uppercase font-bold block">Plant In-Charge</span>
                <span className="font-bold text-slate-200 block mt-0.5">
                  {companyData.contact?.person || 'Manager'}
                </span>
                <span className="text-3xs font-mono text-slate-400">{companyData.contact?.phone}</span>
              </div>

              <div className="bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800">
                <span className="text-3xs text-slate-500 uppercase font-bold block">Awaiting Receipt</span>
                <span className="font-mono font-black text-amber-400 text-base block mt-0.5">
                  {metrics.pendingCount} <span className="text-3xs text-slate-400">shipments</span>
                </span>
                <span className="text-3xs text-slate-400">{metrics.pendingWeightKg} kg in transit</span>
              </div>

              <div className="bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800">
                <span className="text-3xs text-slate-500 uppercase font-bold block">Total Received</span>
                <span className="font-mono font-black text-emerald-400 text-base block mt-0.5">
                  {metrics.totalReceivedKg} <span className="text-3xs text-slate-400">kg</span>
                </span>
                <span className="text-3xs text-slate-400">Processed at facility</span>
              </div>

              <div className="bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800">
                <span className="text-3xs text-slate-500 uppercase font-bold block">Completed Orders</span>
                <span className="font-mono font-black text-slate-200 text-base block mt-0.5">
                  {metrics.receivedCount} <span className="text-3xs text-slate-400">orders</span>
                </span>
                <span className="text-3xs text-emerald-400">100% verified</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab Selector */}
        <div className="flex bg-slate-850 p-1 rounded-2xl border border-slate-750 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('incoming')}
            className={`flex-1 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'incoming'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Incoming Shipments Awaiting Receipt ({pendingDispatches.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'history'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Received & Processed History ({receivedHistory.length})</span>
          </button>
        </div>

        {/* TAB 1: INCOMING SHIPMENTS AWAITING RECEIPT */}
        {activeTab === 'incoming' && (
          <div className="space-y-3">
            {pendingDispatches.length === 0 ? (
              <div className="bg-slate-850 p-8 rounded-3xl border border-slate-750 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-xl">
                  🚚
                </div>
                <h3 className="text-sm font-bold text-white">No Shipments Currently In Transit</h3>
                <p className="text-2xs text-slate-400 max-w-md mx-auto">
                  When WasteWallet Store Staff dispatches separated scrap (such as{' '}
                  <span className="text-emerald-300 font-bold">
                    {companyData?.acceptedMaterials?.join(' or ') || 'iron/plastic'}
                  </span>
                  ) to this company, the consignment will appear here with a "Confirm Received" button.
                </p>
                <Link
                  to="/store/handover"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs cursor-pointer shadow-md shadow-emerald-500/20"
                >
                  <span>Go to Store Staff Depot to Dispatch Scrap ➔</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingDispatches.map((disp) => (
                  <div
                    key={disp._id}
                    className="bg-slate-850 p-4 rounded-3xl border-2 border-amber-500/60 shadow-xl space-y-3 hover:border-amber-400 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-750">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-sm">
                          🚚
                        </span>
                        <div>
                          <span className="font-mono font-black text-amber-300 text-xs">
                            {disp.dispatchCode}
                          </span>
                          <span className="text-3xs text-slate-400 ml-2 font-mono">
                            Dispatched: {new Date(disp.dispatchedAt || disp.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <span className="text-3xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full self-start sm:self-auto animate-pulse">
                        ● In Transit from WasteWallet Store
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-2xs">
                      <div>
                        <span className="text-3xs uppercase font-bold text-slate-500 block">Waste Category</span>
                        <span className="font-black text-white capitalize text-sm">
                          {disp.materialType.replace('_', ' ')}
                        </span>
                      </div>
                      <div>
                        <span className="text-3xs uppercase font-bold text-slate-500 block">Dispatched Weight</span>
                        <span className="font-mono font-black text-emerald-400 text-sm">
                          {disp.weightKg} kg
                        </span>
                      </div>
                      <div>
                        <span className="text-3xs uppercase font-bold text-slate-500 block">Transport Vehicle</span>
                        <span className="font-mono font-bold text-slate-300">
                          {disp.vehicleNumber || 'Standard Logistics'}
                        </span>
                      </div>
                      <div>
                        <span className="text-3xs uppercase font-bold text-slate-500 block">Dispatched By</span>
                        <span className="font-bold text-slate-300">
                          {disp.storeStaffId?.name || 'Central Store Staff'}
                        </span>
                      </div>
                    </div>

                    {disp.dispatchNotes && (
                      <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-2xs text-slate-300">
                        <span className="font-bold text-slate-400">Store Staff Notes: </span>
                        <span>{disp.dispatchNotes}</span>
                      </div>
                    )}

                    {/* Receive Action Button */}
                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => openReceiveModal(disp)}
                        className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/25 active:scale-95 transition-transform"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm Received & Transmit Receipt Message to Staff ➔</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: RECEIVED & PROCESSED HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {receivedHistory.length === 0 ? (
              <div className="bg-slate-850 p-8 rounded-3xl border border-slate-750 text-center text-slate-400 text-xs">
                No past received consignments recorded for this facility yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {receivedHistory.map((disp) => (
                  <div
                    key={disp._id}
                    className="bg-slate-850 p-4 rounded-3xl border border-emerald-500/30 shadow-md space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-white text-xs">
                          {disp.dispatchCode}
                        </span>
                        <span className="text-3xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                          ✓ Received & Verified
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-black text-emerald-400 text-sm">
                          {disp.receivedWeightKg || disp.weightKg} kg
                        </span>
                        <span className="text-3xs uppercase font-bold text-slate-400 ml-1">
                          {disp.materialType}
                        </span>
                      </div>
                    </div>

                    <div className="text-2xs text-slate-400 grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1 border-t border-slate-750">
                      <div>
                        Dispatched: <span className="text-slate-300 font-mono">{disp.weightKg} kg</span> by{' '}
                        <span className="text-slate-200">{disp.storeStaffId?.name || 'Staff'}</span>
                      </div>
                      <div>
                        Received At:{' '}
                        <span className="text-slate-300 font-mono">
                          {disp.receivedAt ? new Date(disp.receivedAt).toLocaleString() : 'Confirmed'}
                        </span>
                      </div>
                    </div>

                    {/* Receipt Message Dispatched to Staff */}
                    <div className="bg-slate-900/90 p-2.5 rounded-xl border border-emerald-500/20 text-3xs text-emerald-200 space-y-0.5">
                      <span className="font-bold text-emerald-400 flex items-center gap-1">
                        <Send className="w-3 h-3 text-emerald-400" />
                        Receipt Message Sent to Store Staff:
                      </span>
                      <p className="font-mono">{disp.receiptMessage || disp.receivedNotes}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* CONFIRM RECEIPT MODAL */}
      {isReceiveModalOpen && activeDispatchToReceive && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-850 rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-750 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-750 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white leading-tight">
                    Confirm Waste Consignment Reception
                  </h3>
                  <p className="text-3xs text-slate-400">
                    Verify weight & transmit receipt message to WasteWallet Staff
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReceiveModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-2xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleConfirmReceive} className="space-y-3.5 text-xs">
              {/* Consignment Snapshot */}
              <div className="bg-slate-900 p-3 rounded-2xl border border-slate-750 space-y-1">
                <div className="flex justify-between">
                  <span className="text-3xs uppercase font-bold text-slate-400">Consignment Code:</span>
                  <span className="font-mono font-bold text-amber-300">{activeDispatchToReceive.dispatchCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-3xs uppercase font-bold text-slate-400">Material Category:</span>
                  <span className="font-bold text-white capitalize">{activeDispatchToReceive.materialType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-3xs uppercase font-bold text-slate-400">Dispatched By Staff:</span>
                  <span className="font-mono font-bold text-emerald-400">{activeDispatchToReceive.weightKg} kg</span>
                </div>
              </div>

              {/* Verified Received Weight */}
              <div>
                <label className="block text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Weighbridge / Gate Scale Verified Weight (kg) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    placeholder="0.0"
                    value={verifiedWeight}
                    onChange={(e) => setVerifiedWeight(e.target.value)}
                    className="w-full pl-3 pr-8 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-2xs font-bold text-slate-500">
                    kg
                  </span>
                </div>
              </div>

              {/* Plant Receipt / Inspection Notes */}
              <div>
                <label className="block text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Plant Gate Inspection Notes / Acknowledgment
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Scrap received and verified at gate scale."
                  value={receivedNotes}
                  onChange={(e) => setReceivedNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-3xs text-emerald-300">
                <span className="font-bold block mb-0.5">ℹ️ Automated Staff Notification:</span>
                <span>
                  Confirming reception will immediately transmit a verified receipt message back to the WasteWallet Store Staff dashboard!
                </span>
              </div>

              <div className="pt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsReceiveModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-98 shadow-lg shadow-emerald-500/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Transmitting...' : 'Confirm Received ➔'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyPortalPage;
