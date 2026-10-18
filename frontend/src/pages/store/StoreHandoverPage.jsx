// StoreHandoverPage: Staff separated scrap inventory, tie-up recycling companies list, handover dispatches & company receipt notifications
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  Truck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Boxes,
  Sparkles,
  ShieldAlert,
  Bell,
  RefreshCw,
  Send,
  ExternalLink,
  MapPin,
  Phone,
  User,
  AlertTriangle,
  X,
  Layers,
  ChevronRight,
  Scale,
} from 'lucide-react';
import api from '../../api/axios';
import { useSocket } from '../../context/SocketContext';

export const StoreHandoverPage = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();

  // State
  const [inventorySummary, setInventorySummary] = useState(null);
  const [categoryStreams, setCategoryStreams] = useState([]);
  const [recentSortedBatches, setRecentSortedBatches] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'companies' | 'dispatches' | 'messages'
  const [companyCategoryFilter, setCompanyCategoryFilter] = useState('all');

  // Modal State for Dispatch Handover
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('iron');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [dispatchWeight, setDispatchWeight] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');

  // UI status
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch all data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [invRes, compRes, dispRes, notifRes] = await Promise.all([
        api.get('/company-dispatch/inventory'),
        api.get('/company-dispatch/companies'),
        api.get('/company-dispatch/dispatches'),
        api.get('/company-dispatch/notifications'),
      ]);

      const invData = invRes?.data?.data || invRes?.data;
      setInventorySummary(invData?.summary || null);
      setCategoryStreams(invData?.inventory || []);
      setRecentSortedBatches(invData?.recentSortedBatches || []);

      const compData = compRes?.data?.data?.companies || compRes?.data?.companies || [];
      setCompanies(compData);

      const dispData = dispRes?.data?.data?.dispatches || dispRes?.data?.dispatches || [];
      setDispatches(dispData);

      const notifData = notifRes?.data?.data || notifRes?.data;
      setNotifications(notifData?.notifications || []);
      setUnreadNotifCount(notifData?.unreadCount || 0);

      // Pre-select first matching company if available
      if (compData.length > 0 && !selectedCompanyId) {
        setSelectedCompanyId(compData[0]._id);
      }
    } catch (err) {
      console.error('Failed to load handover data:', err);
      setError(err?.response?.data?.message || err.message || 'Could not load inventory data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Listen to real-time socket events for company receipt messages
  useEffect(() => {
    if (!socket) return;

    const handleReceiptEvent = (payload) => {
      console.log('📡 Real-time receipt received from company:', payload);
      const message = payload?.notification?.message || payload?.dispatch?.receiptMessage || 'A company confirmed receipt of waste!';
      setSuccessMsg(`🔔 New Company Receipt: ${message}`);
      // Refresh notifications & dispatches
      fetchData();
      setTimeout(() => setSuccessMsg(''), 8000);
    };

    const handleDispatchCreated = () => {
      fetchData();
    };

    socket.on('company.dispatch.received', handleReceiptEvent);
    socket.on('company.dispatch.created', handleDispatchCreated);

    return () => {
      socket.off('company.dispatch.received', handleReceiptEvent);
      socket.off('company.dispatch.created', handleDispatchCreated);
    };
  }, [socket]);

  // Open Handover Modal for specific category
  const openDispatchForCategory = (cat) => {
    setSelectedCategory(cat.category);
    setSelectedBatchId('');
    // Find matching companies that accept this category
    const matching = companies.filter((c) => c.acceptedMaterials.includes(cat.category));
    if (matching.length > 0) {
      setSelectedCompanyId(matching[0]._id);
    } else if (companies.length > 0) {
      setSelectedCompanyId(companies[0]._id);
    }
    setDispatchWeight(cat.availableKg > 0 ? cat.availableKg.toString() : '');
    setVehicleNumber('TN 09 AB 4812');
    setDispatchNotes(`Dispatch of sorted ${cat.label} from Central Store`);
    setIsModalOpen(true);
    setError('');
  };

  // Open Handover Modal for specific company
  const openDispatchForCompany = (comp) => {
    setSelectedCompanyId(comp._id);
    setSelectedBatchId('');
    const firstCat = comp.acceptedMaterials[0] || 'iron';
    setSelectedCategory(firstCat);
    const catObj = categoryStreams.find((s) => s.category === firstCat);
    setDispatchWeight(catObj && catObj.availableKg > 0 ? catObj.availableKg.toString() : '');
    setVehicleNumber('TN 02 BB 5566');
    setDispatchNotes(`Consignment allocated to ${comp.name}`);
    setIsModalOpen(true);
    setError('');
  };

  // Open Handover Modal for a specific sorted batch item
  const openDispatchForBatchMaterial = (batch, mat) => {
    setSelectedCategory(mat.materialType);
    setSelectedBatchId(batch._id);
    const matching = companies.filter((c) => c.acceptedMaterials.includes(mat.materialType));
    if (matching.length > 0) {
      setSelectedCompanyId(matching[0]._id);
    } else if (companies.length > 0) {
      setSelectedCompanyId(companies[0]._id);
    }
    setDispatchWeight(mat.weightKg ? mat.weightKg.toString() : '');
    setVehicleNumber('TN 09 AB 4812');
    setDispatchNotes(`Consignment of ${mat.weightKg}kg ${mat.materialType.toUpperCase()} from batch ${batch.qrCode}`);
    setIsModalOpen(true);
    setError('');
  };

  // Submit Handover Dispatch
  const handleDispatchSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const weightNum = parseFloat(dispatchWeight);
    if (!weightNum || weightNum <= 0) {
      return setError('Please enter a valid weight in kg (greater than 0)');
    }
    const catObj = categoryStreams.find((s) => s.category === selectedCategory);
    const available = catObj ? catObj.availableKg : 0;
    if (weightNum > available) {
      return setError(
        `Cannot export ${weightNum} kg. Only ${available} kg of ${selectedCategory.toUpperCase()} is currently available in real store inventory.`
      );
    }
    if (!selectedCompanyId) {
      return setError('Please select a tie-up destination company');
    }

    setSubmitting(true);
    try {
      const res = await api.post('/company-dispatch/dispatch', {
        companyId: selectedCompanyId,
        materialType: selectedCategory,
        weightKg: weightNum,
        vehicleNumber,
        dispatchNotes,
        batchId: selectedBatchId || undefined,
      });

      const dispatch = res?.data?.data?.dispatch || res?.data?.dispatch;
      setSuccessMsg(`✓ Successfully dispatched ${weightNum} kg of ${selectedCategory.toUpperCase()} to ${dispatch?.companyName}!`);
      setIsModalOpen(false);
      setSelectedBatchId('');
      await fetchData();
      setActiveTab('dispatches');
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to dispatch scrap to company');
    } finally {
      setSubmitting(false);
    }
  };

  // Mark all notifications as read
  const handleMarkNotificationsRead = async () => {
    try {
      await api.patch('/company-dispatch/notifications/read', { notificationId: 'all' });
      setUnreadNotifCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Error marking notifications as read:', err);
    }
  };

  // Filter companies by accepted category
  const filteredCompanies =
    companyCategoryFilter === 'all'
      ? companies
      : companies.filter((c) => c.acceptedMaterials.includes(companyCategoryFilter));

  const selectedCategoryObj = categoryStreams.find((s) => s.category === selectedCategory);
  const selectedCompanyObj = companies.find((c) => c._id === selectedCompanyId);
  const matchingCompaniesForSelectedCat = companies.filter((c) =>
    c.acceptedMaterials.includes(selectedCategory)
  );

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-slate-900 leading-tight">
              Scrap Stock & Tie-Up Company Handover
            </h2>
            <span className="text-3xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
              Live Warehouse Store
            </span>
          </div>
          <p className="text-2xs text-slate-500">
            View separated bulk items by kilogram and handover consignments directly to specialized recycling tie-up companies
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchData}
            title="Refresh Stock & Dispatches"
            className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            to="/company"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Open Company Portal</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </Link>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border-2 border-emerald-400 rounded-2xl text-emerald-900 text-xs font-bold flex items-center gap-2 animate-pulse">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Key Metric Cards */}
      {inventorySummary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-700 text-white p-3.5 rounded-3xl shadow-sm border border-emerald-600">
            <span className="text-3xs uppercase tracking-wider font-black text-emerald-100 block">
              Available Store Stock
            </span>
            <span className="text-xl font-black block mt-0.5 font-mono">
              {inventorySummary.totalAvailableKg} <span className="text-xs font-bold">kg</span>
            </span>
            <span className="text-3xs text-emerald-100 block mt-1">Ready for company handover</span>
          </div>

          <div className="bg-white p-3.5 rounded-3xl border border-slate-200 shadow-xs">
            <span className="text-3xs uppercase tracking-wider font-bold text-slate-400 block">
              Total Sorted Intake
            </span>
            <span className="text-xl font-black text-slate-900 block mt-0.5 font-mono">
              {inventorySummary.totalSortedKg} <span className="text-xs text-slate-400 font-bold">kg</span>
            </span>
            <span className="text-3xs text-slate-500 block mt-1">From collector bulk deposits</span>
          </div>

          <div className="bg-white p-3.5 rounded-3xl border border-slate-200 shadow-xs">
            <span className="text-3xs uppercase tracking-wider font-bold text-slate-400 block">
              Dispatched / Handed Over
            </span>
            <span className="text-xl font-black text-amber-700 block mt-0.5 font-mono">
              {inventorySummary.totalDispatchedKg} <span className="text-xs text-slate-400 font-bold">kg</span>
            </span>
            <span className="text-3xs text-amber-600 block mt-1">Sent to licensed recyclers</span>
          </div>

          <div className="bg-white p-3.5 rounded-3xl border border-slate-200 shadow-xs">
            <span className="text-3xs uppercase tracking-wider font-bold text-slate-400 block">
              Confirmed Received
            </span>
            <span className="text-xl font-black text-emerald-700 block mt-0.5 font-mono">
              {inventorySummary.totalReceivedKg} <span className="text-xs text-slate-400 font-bold">kg</span>
            </span>
            <span className="text-3xs text-emerald-600 block mt-1">Acknowledged by companies</span>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex bg-slate-200/80 p-1 rounded-2xl text-xs font-bold overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'inventory' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Boxes className="w-4 h-4 text-emerald-600" />
          <span>Separated Stock List</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('companies')}
          className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'companies' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4 text-blue-600" />
          <span>Tie-Up Companies ({companies.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dispatches')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'dispatches' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Truck className="w-4 h-4 text-amber-600" />
          <span>Dispatches ({dispatches.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('messages')}
          className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 relative ${
            activeTab === 'messages' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Bell className="w-4 h-4 text-purple-600" />
          <span>Receipt Messages</span>
          {unreadNotifCount > 0 && (
            <span className="bg-rose-500 text-white font-black text-3xs px-1.5 py-0.2 rounded-full">
              {unreadNotifCount}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: SEPARATED STOCK LIST */}
      {activeTab === 'inventory' && (
        <div className="space-y-3">
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-emerald-600" />
                <span>Warehouse Sorted Inventory Breakdown</span>
              </h3>
              <p className="text-2xs text-slate-500 mt-0.5">
                Exact kilograms in stock ready to handover to specialized tie-up companies
              </p>
            </div>
            <Link
              to="/store/sort"
              className="text-2xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1"
            >
              <span>+ Sort More Batches</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {categoryStreams.map((stream) => (
              <div
                key={stream.category}
                className={`p-4 rounded-3xl border transition-all shadow-xs flex flex-col justify-between ${
                  stream.specialHandling
                    ? 'bg-gradient-to-br from-amber-50/50 to-orange-50/30 border-amber-300'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{stream.icon}</span>
                      <div>
                        <h4 className="font-black text-slate-900 text-xs sm:text-sm">
                          {stream.label}
                        </h4>
                        <span className="text-3xs uppercase font-mono font-bold text-slate-400">
                          Stream: {stream.category}
                        </span>
                      </div>
                    </div>

                    {stream.specialHandling && (
                      <span className="text-3xs font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                        <ShieldAlert className="w-3 h-3 text-amber-600" />
                        Special Handling
                      </span>
                    )}
                  </div>

                  {/* Stock Metrics */}
                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 grid grid-cols-3 gap-2 text-center my-2.5">
                    <div>
                      <span className="text-3xs uppercase font-bold text-slate-400 block">Available</span>
                      <span className="font-mono font-black text-emerald-700 text-sm sm:text-base">
                        {stream.availableKg} <span className="text-3xs">kg</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-3xs uppercase font-bold text-slate-400 block">Dispatched</span>
                      <span className="font-mono font-bold text-amber-700 text-xs sm:text-sm">
                        {stream.totalDispatchedKg} <span className="text-3xs">kg</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-3xs uppercase font-bold text-slate-400 block">Received</span>
                      <span className="font-mono font-bold text-slate-700 text-xs sm:text-sm">
                        {stream.totalReceivedKg} <span className="text-3xs">kg</span>
                      </span>
                    </div>
                  </div>

                  <div className="text-2xs text-slate-500 mb-3 flex items-center justify-between">
                    <span>
                      Tie-Up Partner: <strong className="text-slate-800">{stream.defaultBuyer}</strong>
                    </span>
                    {stream.activeInTransitKg > 0 && (
                      <span className="text-3xs font-bold text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded">
                        🚚 {stream.activeInTransitKg} kg in transit
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openDispatchForCategory(stream)}
                  disabled={stream.availableKg <= 0}
                  className={`w-full py-2.5 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all ${
                    stream.availableKg > 0
                      ? 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer active:scale-98'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                  }`}
                >
                  <Send className={`w-3.5 h-3.5 ${stream.availableKg > 0 ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>
                    {stream.availableKg > 0
                      ? `Handover ${stream.category.toUpperCase()} to Tie-Up Company ➔`
                      : `0.0 kg in Stock — Sort Batches First`}
                  </span>
                </button>
              </div>
            ))}
          </div>

          {/* SECTION: REAL BATCHES SORTED BY STAFF */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3.5 mt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  <span>Real Batches Sorted by Staff ({recentSortedBatches.filter((b) => b.materials && b.materials.length > 0).length})</span>
                </h3>
                <p className="text-2xs text-slate-500 mt-0.5">
                  Every batch you separate appears here with its exact kilograms, ready to export to tie-up companies
                </p>
              </div>

              <Link
                to="/store/sort"
                className="text-2xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>+ Sort More Batches</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {recentSortedBatches.length === 0 ? (
              <div className="p-6 bg-slate-50 rounded-2xl text-center space-y-1.5 text-xs">
                <p className="font-bold text-slate-700">No Sorted Batches in Warehouse Yet</p>
                <p className="text-2xs text-slate-400 max-w-sm mx-auto">
                  When collectors deposit doorstep scrap, staff receives and separates them in the Sorting tab to add real stock!
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentSortedBatches
                  .filter((b) => b.materials && b.materials.length > 0)
                  .map((b) => (
                  <div
                    key={b._id}
                    className="p-3.5 sm:p-4 bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200 rounded-2xl transition-all space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-slate-900 bg-white px-2.5 py-1 rounded-xl border border-slate-200 text-xs shadow-2xs">
                          {b.qrCode}
                        </span>
                        <span className="text-2xs text-slate-600">
                          Collector: <strong className="text-slate-900">{b.collectorName}</strong>
                        </span>
                        <span className="text-3xs text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">
                          ✓ Separated & Weighed
                        </span>
                      </div>
                      <span className="text-3xs text-slate-400 font-mono">
                        {new Date(b.sortedAt).toLocaleString()}
                      </span>
                    </div>

                    {/* Separated Streams inside this Batch */}
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-200/80">
                      {b.materials.map((m) => {
                        const isDispatched = m.status === 'dispatched' || m.status === 'delivered';
                        return (
                          <div
                            key={m._id}
                            className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-2xs ${
                              isDispatched
                                ? 'bg-slate-200/60 border-slate-300 text-slate-500'
                                : 'bg-white border-emerald-300 text-slate-900 shadow-2xs'
                            }`}
                          >
                            <span className="font-black capitalize">
                              {m.materialType.replace('_', ' ')}:
                            </span>
                            <span className="font-mono font-bold text-emerald-700">
                              {m.weightKg} kg
                            </span>
                            {isDispatched ? (
                              <span className="text-3xs font-bold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded">
                                Handed Over
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openDispatchForBatchMaterial(b, m)}
                                className="text-3xs font-bold bg-slate-900 hover:bg-slate-800 text-white px-2 py-0.5 rounded-lg cursor-pointer flex items-center gap-1 active:scale-95 shadow-xs transition-transform"
                                title={`Handover this ${m.weightKg}kg ${m.materialType} to tie-up company`}
                              >
                                <Send className="w-2.5 h-2.5 text-emerald-400" />
                                <span>Export ➔</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TIE-UP COMPANIES DIRECTORY */}
      {activeTab === 'companies' && (
        <div className="space-y-3">
          {/* Category Filter Pills */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-1.5 overflow-x-auto text-2xs font-bold">
            <span className="text-slate-400 uppercase text-3xs font-mono mr-1">Filter Waste:</span>
            {[
              { id: 'all', label: 'All Companies' },
              { id: 'iron', label: '🔩 Iron Require' },
              { id: 'plastic', label: '🧴 Plastic Require' },
              { id: 'ewaste', label: '💻 E-Waste Require' },
              { id: 'copper_wire', label: '🔌 Copper Require' },
              { id: 'battery', label: '🔋 Battery Require' },
              { id: 'paper', label: '📰 Paper Require' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setCompanyCategoryFilter(f.id)}
                className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  companyCategoryFilter === f.id
                    ? 'bg-slate-900 text-white font-black'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="space-y-2.5">
            {filteredCompanies.map((comp) => (
              <div
                key={comp._id}
                className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🏢</span>
                    <div>
                      <h4 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                        <span>{comp.name}</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      </h4>
                      <p className="text-2xs text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{comp.location || 'Tamil Nadu Industrial Zone'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Accepted Requirements Tags */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-3xs font-bold text-slate-400 uppercase">Requires:</span>
                    {comp.acceptedMaterials.map((mat) => (
                      <span
                        key={mat}
                        className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-3xs uppercase tracking-wider"
                      >
                        ✓ {mat.replace('_', ' ')}
                      </span>
                    ))}
                  </div>

                  {/* Contact Info */}
                  <div className="text-2xs text-slate-500 flex items-center gap-3 pt-0.5">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>{comp.contact?.person || 'Plant In-Charge'}</span>
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{comp.contact?.phone || 'Verified'}</span>
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-2 shrink-0">
                  <div className="text-right hidden sm:block">
                    <span className="text-3xs uppercase font-bold text-slate-400 block">Total Received</span>
                    <span className="font-mono font-black text-emerald-700 text-sm">
                      {comp.stats?.totalReceivedKg || 0} kg
                    </span>
                    <span className="text-3xs text-slate-400 block font-mono">
                      ({comp.stats?.completedReceivedCount || 0} consignments)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openDispatchForCompany(comp)}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Handover Waste ➔</span>
                    </button>

                    <Link
                      to={`/company/${comp._id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                      title="View Company's Portal Page"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">View Page</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: DISPATCHES & CONSIGNMENTS TABLE */}
      {activeTab === 'dispatches' && (
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-amber-600" />
                <span>Handover Consignments Manifest ({dispatches.length})</span>
              </h3>
              <p className="text-2xs text-slate-500">
                Track scrap handovers from warehouse intake to recycling plants
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                const firstStream = categoryStreams[0] || { category: 'iron', availableKg: 10 };
                openDispatchForCategory(firstStream);
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
            >
              <span>+ New Handover</span>
            </button>
          </div>

          {dispatches.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-medium space-y-2">
              <p>No scrap consignments dispatched yet.</p>
              <button
                onClick={() => setActiveTab('inventory')}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold"
              >
                Select Stock to Handover ➔
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {dispatches.map((disp) => {
                const isReceived = disp.status === 'received';
                return (
                  <div
                    key={disp._id}
                    className={`p-3.5 rounded-2xl border transition-all text-xs ${
                      isReceived
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : 'bg-amber-50/40 border-amber-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-slate-900 text-xs">
                          {disp.dispatchCode}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-3xs font-black uppercase tracking-wider ${
                            isReceived
                              ? 'bg-emerald-200/80 text-emerald-900'
                              : 'bg-amber-200/80 text-amber-900 animate-pulse'
                          }`}
                        >
                          {isReceived ? '✓ Received by Company' : '🚚 Dispatched / In Transit'}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-black text-slate-900 text-sm">
                          {disp.weightKg} kg
                        </span>
                        <span className="text-3xs uppercase font-bold text-slate-500 ml-1">
                          {disp.materialType}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-2xs text-slate-600 pt-1 border-t border-slate-200/60">
                      <div>
                        Destination Plant: <strong className="text-slate-900">{disp.companyName}</strong>
                      </div>
                      <div>
                        Dispatched By: <strong className="text-slate-900">{disp.storeStaffId?.name || 'Store Staff'}</strong>
                      </div>
                      {disp.vehicleNumber && (
                        <div>
                          Vehicle: <span className="font-mono font-bold text-slate-800">{disp.vehicleNumber}</span>
                        </div>
                      )}
                      <div>
                        Date:{' '}
                        <span className="text-slate-500 font-mono">
                          {new Date(disp.dispatchedAt || disp.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Receipt Message from Company if received */}
                    {isReceived && (
                      <div className="mt-2 p-2 bg-white rounded-xl border border-emerald-300 text-3xs text-emerald-950 font-medium">
                        <span className="font-bold text-emerald-800 block">
                          Company Receipt Acknowledgment ({new Date(disp.receivedAt).toLocaleTimeString()}):
                        </span>
                        <span>{disp.receiptMessage || disp.receivedNotes}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: RECEIPT MESSAGES & NOTIFICATIONS */}
      {activeTab === 'messages' && (
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-purple-600" />
                <span>Company Receipt Messages & Alerts</span>
              </h3>
              <p className="text-2xs text-slate-500">
                Direct messages received whenever a tie-up company confirms receiving waste consignments
              </p>
            </div>

            {unreadNotifCount > 0 && (
              <button
                type="button"
                onClick={handleMarkNotificationsRead}
                className="text-2xs font-bold text-emerald-700 hover:underline cursor-pointer"
              >
                Mark all as read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-medium">
              No receipt messages from companies yet. When a company clicks "Receive", their acknowledgment message will appear here!
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notif) => (
                <div
                  key={notif._id}
                  className={`p-3 rounded-2xl border text-xs transition-all ${
                    !notif.isRead
                      ? 'bg-purple-50/70 border-purple-200 shadow-xs'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="text-base">🏢</span>
                      <span>{notif.title}</span>
                    </span>
                    <span className="text-3xs text-slate-400 font-mono">
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-2xs text-slate-700 font-medium leading-relaxed pl-6">
                    {notif.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DISPATCH HANDOVER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-tight">
                    Handover Scrap to Tie-Up Company
                  </h3>
                  <p className="text-3xs text-slate-500">Dispatch consignment from warehouse intake</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-2xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleDispatchSubmit} className="space-y-3 text-xs">
              {/* Category Selection */}
              <div>
                <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Waste Material Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    const newCat = e.target.value;
                    setSelectedCategory(newCat);
                    const matching = companies.filter((c) => c.acceptedMaterials.includes(newCat));
                    if (matching.length > 0) setSelectedCompanyId(matching[0]._id);
                    const catObj = categoryStreams.find((s) => s.category === newCat);
                    if (catObj && catObj.availableKg > 0) setDispatchWeight(catObj.availableKg.toString());
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                >
                  {categoryStreams.map((s) => (
                    <option key={s.category} value={s.category}>
                      {s.icon} {s.label} ({s.availableKg} kg available)
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination Tie-Up Company (Auto-Filtered) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider">
                    Tie-Up Partner Company
                  </label>
                  <span className="text-3xs text-emerald-700 font-bold">
                    {matchingCompaniesForSelectedCat.length} specialized recyclers
                  </span>
                </div>
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                >
                  {matchingCompaniesForSelectedCat.length > 0 ? (
                    matchingCompaniesForSelectedCat.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} — ({c.location || 'Industrial Estate'})
                      </option>
                    ))
                  ) : (
                    companies.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} (Accepts: {c.acceptedMaterials.join(', ')})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Weight in kg */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider">
                    Handover Weight in Kilograms
                  </label>
                  {selectedCategoryObj && (
                    <button
                      type="button"
                      onClick={() => setDispatchWeight(selectedCategoryObj.availableKg.toString())}
                      className="text-3xs text-emerald-700 font-bold hover:underline"
                    >
                      Fill Max ({selectedCategoryObj.availableKg} kg)
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    placeholder="e.g. 25.0"
                    value={dispatchWeight}
                    onChange={(e) => setDispatchWeight(e.target.value)}
                    className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-2xs font-bold text-slate-400">
                    kg
                  </span>
                </div>
              </div>

              {/* Vehicle Number */}
              <div>
                <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Transport Vehicle Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. TN 09 AB 4812"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Dispatch Notes */}
              <div>
                <label className="block text-2xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Consignment Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Sorted domestic scrap iron beams"
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-98"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Dispatching...' : 'Confirm Handover ➔'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreHandoverPage;
