// StoreHome: Central warehouse staff dashboard for batch QR reception & material sorting
import React from 'react';
import { QrCode, Scale, Boxes, ArrowRightLeft, ShieldCheck, AlertCircle } from 'lucide-react';
import useAuth from '../../hooks/useAuth';

export const StoreHome = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-5">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Warehouse Reception Staff
          </span>
          <span className="text-xs text-slate-400 font-mono">Hub: Anna Nagar Central</span>
        </div>
        <h2 className="text-xl font-black">
          Store Operations: {user?.name || 'Staff Member'} 📦
        </h2>
        <p className="text-xs text-slate-300 mt-1">
          Scan collector QR codes, record intake weights, and sort into recycler streams.
        </p>
      </div>

      {/* Main Action: Scan Collector Batch QR */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center shrink-0">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Scan Collector Deposit Batch</h3>
            <p className="text-xs text-slate-500">
              Receive daily scrap bags, weigh on warehouse gross scales, and compute loss %.
            </p>
          </div>
        </div>

        <button className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 text-sm cursor-pointer">
          <QrCode className="w-4 h-4" />
          Open QR Camera Scanner
        </button>
      </div>

      {/* Material Sorting Streams */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Boxes className="w-4 h-4 text-emerald-600" />
            Active Sorting Streams
          </h3>
          <span className="text-xs font-semibold text-slate-500">Recycler Bins</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            { name: 'Copper & Wiring', buyer: 'Metro Smelters Ltd.', status: 'Ready for Pickup' },
            { name: 'Batteries & Acid', buyer: 'Tamil Nadu Lead Recyclers', status: 'Hazard Safe Flag' },
            { name: 'E-Waste PCB', buyer: 'Green Tech Recyclers', status: 'Special Handling' },
            { name: 'Mixed Plastics', buyer: 'Adyar Polymers', status: 'Baling' },
          ].map((bin, idx) => (
            <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
              <span className="font-bold text-slate-800">{bin.name}</span>
              <p className="text-slate-500 mt-1">{bin.buyer}</p>
              <span className="mt-2 text-emerald-700 font-semibold">{bin.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StoreHome;
