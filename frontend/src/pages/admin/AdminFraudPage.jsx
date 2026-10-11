// AdminFraudPage: Fraud anomaly triage, weight divergence analysis, and collector audit
import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Scale,
  CheckCircle2,
  UserX,
  UserCheck,
  Search,
  Building,
  RefreshCw,
} from 'lucide-react';
import api from '../../api/axios';

export const AdminFraudPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');
  const [error, setError] = useState('');

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/fraud-alerts');
      setAlerts(res?.data?.data?.alerts || res?.data?.alerts || []);
    } catch (err) {
      console.error('Error fetching fraud alerts:', err);
      setError(err.message || 'Failed to load fraud anomalies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleBlockUser = async (userId, shouldBlock) => {
    if (!userId) return;
    try {
      await api.patch(`/admin/users/${userId}/block`, { isBlocked: shouldBlock });
      setActionMessage(
        `User ${userId} successfully ${shouldBlock ? 'suspended' : 're-activated'}.`
      );
      fetchAlerts();
    } catch (err) {
      alert(err.message || 'Failed to update user block status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Fraud & Anomaly Intelligence
          </h2>
          <p className="text-xs text-slate-500">
            Real-time heuristic auditing of collector weight loss divergence and rate downgrading
          </p>
        </div>

        <button
          onClick={fetchAlerts}
          className="self-start md:self-auto bg-white border border-slate-300 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 hover:bg-slate-50 cursor-pointer shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Audits
        </button>
      </div>

      {actionMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-300 rounded-2xl text-rose-900 text-xs font-bold">
          {error}
        </div>
      )}

      {/* Heuristic Rules Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-rose-600 font-black text-xs uppercase tracking-wider">
            <Scale className="w-4 h-4" />
            Rule 1: Batch Loss Divergence (&gt;15%)
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Flags batches where warehouse reception scales record more than 15% missing scrap compared to customer scale receipts.
          </p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-amber-600 font-black text-xs uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" />
            Rule 2: Excessive Mixed Conversion (&gt;75%)
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Flags collectors who convert more than 75% of customer pickups into flat mixed rate on-site, depriving customers of itemized rates.
          </p>
        </div>
      </div>

      {/* Active Alerts List */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            Flagged Anomaly Audit Logs ({alerts.length})
          </h3>
          <span className="text-2xs font-semibold text-slate-400">Automated Heuristic Engine</span>
        </div>

        {loading ? (
          <p className="text-xs text-slate-400 text-center py-8">Auditing transactions...</p>
        ) : alerts.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <h4 className="text-xs font-bold text-slate-800">All Operations Clean</h4>
            <p className="text-2xs text-slate-500 max-w-sm mx-auto">
              No collectors or batches currently exceed fraud tolerance thresholds.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert, idx) => (
              <div
                key={idx}
                className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xs font-bold uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-200">
                      {alert.type || 'Loss Divergence'}
                    </span>
                    <span className="font-mono font-bold text-slate-700">
                      Collector ID: {alert.collectorId}
                    </span>
                  </div>
                  <p className="text-slate-800 font-semibold">{alert.message || alert.details}</p>
                </div>

                <div className="flex items-center gap-2 self-start md:self-auto">
                  <button
                    onClick={() => handleBlockUser(alert.collectorId, true)}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-xl text-2xs flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    Suspend Partner
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminFraudPage;
