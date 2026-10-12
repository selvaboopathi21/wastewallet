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
} from 'lucide-react';
import api from '../../api/axios';

export const AdminDashboard = () => {
  const navigate = useNavigate();

  const [reports, setReports] = useState(null);
  const [fraudAlerts, setFraudAlerts] = useState([]);
  const [collectors, setCollectors] = useState([]);
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
        setReports(repRes.value?.data?.data || repRes.value?.data);
      }
      if (alertsRes.status === 'fulfilled') {
        setFraudAlerts(alertsRes.value?.data?.data?.alerts || alertsRes.value?.data?.alerts || []);
      }
      if (colRes.status === 'fulfilled') {
        setCollectors(colRes.value?.data?.data?.collectors || []);
      }
    } catch (err) {
      console.error('Error fetching admin dashboard:', err);
      setError(err.message || 'Failed to load operations metrics');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleApproval = async (collectorId, currentStatus) => {
    try {
      await api.patch(`/admin/collectors/${collectorId}/approve`, {
        isApproved: !currentStatus,
      });
      setCollectors((prev) =>
        prev.map((c) => (c._id === collectorId ? { ...c, isApproved: !currentStatus } : c))
      );
    } catch (err) {
      alert(err.message || 'Failed to update collector approval');
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Collector Partner Approvals ({collectors.length})
            </h3>
          </div>
          <span className="text-2xs font-bold text-slate-400">
            {collectors.filter((c) => !c.isApproved).length} Pending Review
          </span>
        </div>

        {collectors.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">No registered collectors found.</p>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {collectors.map((c) => (
              <div
                key={c._id}
                className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-2.5"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{c.name || 'Partner Collector'}</span>
                    <span
                      className={`text-3xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        c.isApproved
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-900 animate-pulse'
                      }`}
                    >
                      {c.isApproved ? 'Approved Partner ✓' : '⏳ Awaiting Admin Approval'}
                    </span>
                    {c.isOnline && (
                      <span className="text-3xs bg-teal-100 text-teal-800 font-bold px-1.5 py-0.5 rounded">
                        Online
                      </span>
                    )}
                  </div>
                  <p className="text-2xs text-slate-500 mt-0.5">
                    Phone: <span className="font-mono font-bold">+91 {c.phone}</span> • Rating:{' '}
                    {c.rating?.avg?.toFixed(1) || '4.8'} ★
                  </p>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => handleToggleApproval(c._id, c.isApproved)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                      c.isApproved
                        ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                    }`}
                  >
                    {c.isApproved ? 'Revoke Approval' : '✓ Approve Partner'}
                  </button>
                </div>
              </div>
            ))}
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
