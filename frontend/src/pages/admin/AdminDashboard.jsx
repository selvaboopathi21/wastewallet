// AdminDashboard: Real-time operations overview, platform metrics, and recent fraud alerts
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  AlertTriangle,
  Scale,
  DollarSign,
  Users,
  PackageCheck,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  ShieldAlert,
  Check,
  X,
  Phone,
  Mail,
  MapPin,
  Clock,
  Search,
  RefreshCw,
} from 'lucide-react';
import api from '../../api/axios';

export const AdminDashboard = () => {
  const navigate = useNavigate();

  const [reports, setReports] = useState(null);
  const [fraudAlerts, setFraudAlerts] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [collectorFilter, setCollectorFilter] = useState('all'); // 'all' | 'pending' | 'approved'
  const [searchQuery, setSearchQuery] = useState('');
  const [approvalFeedback, setApprovalFeedback] = useState('');
  const [updatingCollectorId, setUpdatingCollectorId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    try {
      const [repRes, alertsRes, colRes] = await Promise.allSettled([
        api.get('/admin/reports'),
        api.get('/admin/fraud-alerts'),
        api.get('/admin/collectors'),
      ]);

      if (repRes.status === 'fulfilled') {
        setReports(repRes.value?.data?.data || repRes.value?.data || repRes.value);
      }
      if (alertsRes.status === 'fulfilled') {
        setFraudAlerts(
          alertsRes.value?.data?.alerts ||
          alertsRes.value?.data?.data?.alerts ||
          alertsRes.value?.alerts ||
          []
        );
      }
      if (colRes.status === 'fulfilled') {
        const list =
          colRes.value?.data?.collectors ||
          colRes.value?.data?.data?.collectors ||
          colRes.value?.collectors ||
          [];
        setCollectors(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      console.error('Error fetching admin dashboard:', err);
      setError(err.message || 'Failed to load operations metrics');
    } finally {
      setLoading(false);
    }
  };

  // Explicit Accept (Right Tick ✓) or Reject/Revoke (Wrong Symbol ✗)
  const handleSetApproval = async (collectorId, shouldApprove, collectorName = 'Partner') => {
    setUpdatingCollectorId(collectorId);
    setApprovalFeedback('');
    try {
      await api.patch(`/admin/collectors/${collectorId}/approve`, {
        isApproved: shouldApprove,
      });

      setCollectors((prev) =>
        prev.map((c) =>
          c._id === collectorId
            ? { ...c, isApproved: shouldApprove, isOnline: shouldApprove ? c.isOnline : false }
            : c
        )
      );

      setApprovalFeedback(
        shouldApprove
          ? `✓ "${collectorName}" ACCEPTED! Collector partner can now go online and receive scrap pickup jobs.`
          : `✗ "${collectorName}" REJECTED / REVOKED! Collector cannot go online or accept pickups.`
      );

      setTimeout(() => setApprovalFeedback(''), 5000);
    } catch (err) {
      alert(err.message || 'Failed to update collector approval');
    } finally {
      setUpdatingCollectorId(null);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);


  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            WasteWallet Operations Control
          </h2>
          <p className="text-xs text-slate-500">
            Real-time platform metrics, material recovery, and fraud anomaly intelligence
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            System Live (Connected to MongoDB)
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Pickups',
            value: reports?.totalPickups ?? '...',
            change: 'Lifecycle tracked',
            icon: PackageCheck,
            color: 'text-blue-600 bg-blue-50',
          },
          {
            label: 'Scrap Collected',
            value: reports?.totalScrapWeightKg ? `${reports.totalScrapWeightKg} kg` : '0 kg',
            change: 'Recovered materials',
            icon: Scale,
            color: 'text-emerald-600 bg-emerald-50',
          },
          {
            label: 'Disbursed Payouts',
            value: reports?.totalDisbursedPaise
              ? `₹${(reports.totalDisbursedPaise / 100).toFixed(0)}`
              : '₹0',
            change: '100% Cash / UPI',
            icon: DollarSign,
            color: 'text-teal-600 bg-teal-50',
          },
          {
            label: 'Fraud Divergences',
            value: `${fraudAlerts.length} Flagged`,
            change: fraudAlerts.length > 0 ? 'Requires Review' : 'Clean audit',
            icon: AlertTriangle,
            color: fraudAlerts.length > 0 ? 'text-rose-600 bg-rose-50' : 'text-slate-600 bg-slate-50',
          },
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider">
                  {kpi.label}
                </span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${kpi.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl font-black text-slate-900 tracking-tight">{kpi.value}</p>
              <p className="text-2xs text-slate-400 font-medium">{kpi.change}</p>
            </div>
          );
        })}
      </div>

      {/* Fraud Anomaly Alert Panel */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Fraud & Anomaly Intelligence
            </h3>
          </div>

          <button
            onClick={() => navigate('/admin/fraud-alerts')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
          >
            View All ({fraudAlerts.length}) <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <p className="text-xs text-slate-400 text-center py-4">Checking audit records...</p>
        ) : fraudAlerts.length === 0 ? (
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center gap-3 text-xs text-emerald-900 font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Zero fraud anomalies detected across recent batches and pickups!</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {fraudAlerts.slice(0, 3).map((alert, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-rose-950 uppercase tracking-wider text-2xs bg-rose-200 px-2 py-0.5 rounded">
                      {alert.type}
                    </span>
                    <span className="font-bold text-rose-900">
                      Collector ID: {alert.collectorId || 'Unassigned'}
                    </span>
                  </div>
                  <p className="text-rose-800 mt-1">{alert.message || alert.details}</p>
                </div>

                <button
                  onClick={() => navigate('/admin/fraud-alerts')}
                  className="self-start md:self-auto bg-white border border-rose-300 text-rose-800 font-bold px-3 py-1.5 rounded-xl hover:bg-rose-100 transition-colors cursor-pointer"
                >
                  Investigate
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Collector Partner Approvals Management */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Collector Partner Verification & Approvals
              </h3>
              <p className="text-2xs text-slate-500">
                New collectors must be accepted by Admin before they can go online and receive scrap pickups
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-black px-3 py-1 rounded-full border ${
                collectors.filter((c) => !c.isApproved).length > 0
                  ? 'bg-amber-100 border-amber-300 text-amber-900 animate-pulse'
                  : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}
            >
              ⏳ {collectors.filter((c) => !c.isApproved).length} Pending Review
            </span>
            <button
              onClick={fetchDashboardData}
              className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
              title="Refresh list"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Feedback Toast */}
        {approvalFeedback && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 border transition-all ${
              approvalFeedback.startsWith('✓')
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            {approvalFeedback.startsWith('✓') ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{approvalFeedback}</span>
          </div>
        )}

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setCollectorFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                collectorFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All ({collectors.length})
            </button>
            <button
              type="button"
              onClick={() => setCollectorFilter('pending')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                collectorFilter === 'pending'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'text-amber-800 hover:text-amber-950'
              }`}
            >
              <span>Pending</span>
              <span className="text-2xs bg-black/10 px-1.5 py-0.2 rounded-full font-mono">
                {collectors.filter((c) => !c.isApproved).length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setCollectorFilter('approved')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                collectorFilter === 'approved'
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'text-emerald-700 hover:text-emerald-900'
              }`}
            >
              Approved ({collectors.filter((c) => c.isApproved).length})
            </button>
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, phone, zone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Collectors List */}
        {collectors.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No registered collectors found.</p>
        ) : (
          <div className="space-y-3 pt-2">
            {collectors
              .filter((c) => {
                if (collectorFilter === 'pending') return !c.isApproved;
                if (collectorFilter === 'approved') return c.isApproved;
                return true;
              })
              .filter((c) => {
                if (!searchQuery.trim()) return true;
                const query = searchQuery.toLowerCase();
                const zoneName = c.zoneId?.name || (c.zoneId === '6aca7449ac0dfcc7a63a591b' ? 'Chennai South' : 'Chennai Central');
                return (
                  c.name?.toLowerCase().includes(query) ||
                  c.phone?.includes(query) ||
                  c.email?.toLowerCase().includes(query) ||
                  zoneName.toLowerCase().includes(query)
                );
              })
              .map((c) => {
                const zoneName =
                  c.zoneId?.name ||
                  (c.zoneId === '6aca7449ac0dfcc7a63a591b'
                    ? 'Chennai South (Guindy / Adyar)'
                    : 'Chennai Central (Anna Nagar)');

                const isBusyUpdating = updatingCollectorId === c._id;

                return (
                  <div
                    key={c._id}
                    className={`p-4 rounded-2xl border transition-all ${
                      !c.isApproved
                        ? 'bg-amber-50/60 border-amber-300 shadow-xs'
                        : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      {/* Left: Collector Details */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-sm text-slate-900">
                            {c.name || 'New Collector'}
                          </span>

                          {/* Approval Status Badge */}
                          <span
                            className={`text-3xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                              c.isApproved
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-amber-200 text-amber-950 border border-amber-300 animate-pulse'
                            }`}
                          >
                            {c.isApproved ? '✓ Approved Partner' : '⏳ Pending Admin Approval'}
                          </span>

                          {/* Work Status Badge */}
                          {c.isApproved ? (
                            <span
                              className={`text-3xs font-bold px-2 py-0.5 rounded-md ${
                                c.isOnline
                                  ? 'bg-emerald-500 text-white animate-pulse'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {c.isOnline ? '🟢 Online & Ready' : '⚪ Currently Offline'}
                            </span>
                          ) : (
                            <span className="text-3xs font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800">
                              ⛔ Work Locked (Not Approved)
                            </span>
                          )}

                          <span className="text-3xs font-mono font-bold bg-white text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                            ★ {c.rating?.avg?.toFixed(1) || '5.0'}
                          </span>
                        </div>

                        {/* Contact & Territory Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 text-2xs text-slate-600 pt-0.5">
                          <div className="flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span className="font-bold text-slate-800">+91 {c.phone}</span>
                          </div>

                          {c.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span className="text-slate-600 truncate">{c.email}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span className="font-semibold text-emerald-800">{zoneName}</span>
                          </div>
                        </div>

                        {c.address && (
                          <p className="text-3xs text-slate-500 italic">
                            Doorstep / Base: {c.address}
                          </p>
                        )}
                      </div>

                      {/* Right: Accept (Right Tick ✓) & Reject (Wrong Symbol ✗) Action Buttons */}
                      <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                        {/* RIGHT TICK: Accept / Approve Button */}
                        <button
                          type="button"
                          onClick={() => handleSetApproval(c._id, true, c.name)}
                          disabled={isBusyUpdating || c.isApproved}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 ${
                            c.isApproved
                              ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 hover:shadow-md'
                          }`}
                          title="Accept collector: Grants permission to go online and receive scrap collection orders"
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>{c.isApproved ? 'Accepted ✓' : '✓ Accept Partner'}</span>
                        </button>

                        {/* WRONG SYMBOL: Reject / Revoke Button */}
                        <button
                          type="button"
                          onClick={() => handleSetApproval(c._id, false, c.name)}
                          disabled={isBusyUpdating || (!c.isApproved && false)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                            !c.isApproved
                              ? 'bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300'
                              : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                          }`}
                          title="Reject or revoke: Disables collector account from taking pickups"
                        >
                          <X className="w-4 h-4 stroke-[3]" />
                          <span>{c.isApproved ? '✗ Revoke' : '✗ Reject'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Quick Nav Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <div
          onClick={() => navigate('/admin/rates')}
          className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs hover:border-emerald-400 transition-all cursor-pointer space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Scrap Rate Card Controls
            </span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-xs text-slate-500">
            Edit price per kilogram in paise for Iron, Copper, E-Waste, Battery, Plastic, and Mixed scrap.
          </p>
        </div>

        <div
          onClick={() => navigate('/admin/rates')}
          className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs hover:border-emerald-400 transition-all cursor-pointer space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-emerald-600" />
              Geospatial Collection Zones
            </span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-xs text-slate-500">
            Inspect GeoJSON 2dsphere boundaries for Chennai Central (Anna Nagar) and Chennai South (Guindy).
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
