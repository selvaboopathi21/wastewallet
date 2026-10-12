// CustomerHome: Household scrap seller main landing view
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, TrendingUp, Sparkles, MapPin, ShieldCheck, ArrowRight } from 'lucide-react';
import useAuth from '../../hooks/useAuth';

export const CustomerHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-5">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-xs font-semibold bg-emerald-500/30 text-emerald-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Household Seller
            </span>
            <h2 className="text-xl font-black mt-2">
              Vanakkam, {user?.name || 'Friend'}! 👋
            </h2>
            <p className="text-xs text-emerald-100 mt-1">
              Turn your household scrap into instant cash at certified rate cards.
            </p>
          </div>
          <button
            onClick={() => navigate('/customer/profile')}
            className="text-xs font-bold bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-2xs shrink-0 self-start"
            title="Edit Profile & Zone"
          >
            <span>Profile</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Action: Request Pickup */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center shrink-0">
            <PlusCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Sell Scrap at Your Doorstep</h3>
            <p className="text-xs text-slate-500">
              Verified local collector visits, weighs with digital scale, and pays cash instantly.
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/customer/new-pickup')}
          className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          Request Scrap Pickup
        </button>
      </div>

      {/* Today's Market Rates Preview */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-800">Today's Scrap Rate Card</h3>
          </div>
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            Live Rates
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            { name: 'Copper Wire', rate: '₹450 / kg', tag: 'High Value' },
            { name: 'E-Waste', rate: '₹80 / kg', tag: 'Eco Bonus' },
            { name: 'Battery', rate: '₹65 / kg', tag: 'Hazard Safe' },
            { name: 'Iron / Steel', rate: '₹32 / kg', tag: 'Popular' },
            { name: 'Plastic', rate: '₹18 / kg', tag: 'Sorted' },
            { name: 'Paper / Cartons', rate: '₹12 / kg', tag: 'Daily' },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">{item.name}</span>
              </div>
              <p className="text-sm font-bold text-slate-900 mt-1">{item.rate}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Trust & Transparency Guarantee */}
      <div className="bg-slate-100 rounded-2xl p-4 border border-slate-200 flex items-start gap-3 text-xs text-slate-600">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-800">WasteWallet Guarantee:</span>
          <p className="mt-0.5">
            100% digital scale photo verification, live on-screen price calculation, and 6-digit confirmation OTP before cash handover.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CustomerHome;
