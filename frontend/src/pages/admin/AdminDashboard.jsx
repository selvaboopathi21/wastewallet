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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    try {
      const [repRes, alertsRes] = await Promise.all([
        api.get('/admin/reports'),
        api.get('/admin/fraud-alerts'),
      ]);

      setReports(repRes?.data?.data || repRes?.data);
      setFraudAlerts(alertsRes?.data?.data?.alerts || alertsRes?.data?.alerts || []);
    } catch (err) {
      console.error('Error fetching admin dashboard:', err);
      setError(err.message || 'Failed to load operations metrics');
    } finally {
      setLoading(false);
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
