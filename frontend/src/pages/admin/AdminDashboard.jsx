// AdminDashboard: Platform oversight, scrap rates, zones, and fraud alerts
import React from 'react';
import { BarChart3, AlertTriangle, ShieldCheck, Map, DollarSign, Users, PackageCheck } from 'lucide-react';
import useAuth from '../../hooks/useAuth';

export const AdminDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h2 className="text-xl font-black text-slate-900">WasteWallet Operations Control</h2>
          <p className="text-xs text-slate-500">
            Real-time scrap collection metrics, price cards, and anomaly monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            System Live
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Pickups', value: '1,420', change: '+12% this week', icon: PackageCheck, color: 'text-blue-600 bg-blue-50' },
          { label: 'Scrap Collected', value: '18.4 Tons', change: 'Across 2 Zones', icon: BarChart3, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Disbursed (Paise)', value: '₹5,82,400', change: '100% Cash/UPI', icon: DollarSign, color: 'text-teal-600 bg-teal-50' },
          { label: 'Fraud Alerts', value: '2 Flagged', change: 'Requires Review', icon: AlertTriangle, color: 'text-rose-600 bg-rose-50' },
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">{kpi.label}</span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${kpi.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-lg font-black text-slate-900 mt-2">{kpi.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{kpi.change}</p>
            </div>
          );
        })}
      </div>

      {/* Fraud Alert Panel */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <h3 className="text-sm font-bold text-slate-900">Fraud & Weight Divergence Alerts</h3>
          </div>
          <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full">
            2 Unresolved
          </span>
        </div>

        <div className="space-y-2">
          <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200 flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-rose-900">Excessive Batch Weight Loss: Collector #6aca7fcd</p>
              <p className="text-xs text-rose-700">
                Deposit reported 22.5% loss vs pickup scale receipts (Threshold is 15.0%).
              </p>
            </div>
            <button className="text-xs font-bold bg-white text-rose-700 border border-rose-300 px-3 py-1.5 rounded-lg hover:bg-rose-50 cursor-pointer self-start md:self-auto">
              Investigate Batch
            </button>
          </div>

          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-amber-900">High Mixed Mode Conversion: Collector #6aca7fd0</p>
              <p className="text-xs text-amber-800">
                85% of separate items downgraded to flat mixed rate on-site.
              </p>
            </div>
            <button className="text-xs font-bold bg-white text-amber-800 border border-amber-300 px-3 py-1.5 rounded-lg hover:bg-amber-50 cursor-pointer self-start md:self-auto">
              Review Audits
            </button>
          </div>
        </div>
      </div>

      {/* Quick Ops Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Scrap Rate Card Control</h3>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Update category prices per kilogram in paise. Changes immediately reflect on active pickups.
          </p>
          <div className="text-xs text-slate-400 font-mono">
            8 categories active • Latest update: Iron ₹34/kg
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <Map className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Geospatial Service Zones</h3>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            MongoDB 2dsphere GeoJSON polygons bounding Chennai Central and Chennai South.
          </p>
          <div className="text-xs text-slate-400 font-mono">
            2 active zones • 100% boundary coverage
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
