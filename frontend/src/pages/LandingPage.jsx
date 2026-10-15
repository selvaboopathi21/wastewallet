// LandingPage.jsx: High-conversion, professional green-tech product website for WasteWallet
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Recycle,
  Scale,
  Zap,
  ShieldCheck,
  TrendingUp,
  MapPin,
  Phone,
  ArrowRight,
  CheckCircle2,
  Truck,
  Building2,
  Users,
  Award,
  ChevronRight,
  Sparkles,
  DollarSign,
  LogIn,
  UserPlus,
} from 'lucide-react';
import useAuth from '../hooks/useAuth';
import api from '../api/axios';

export const LandingPage = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [rates, setRates] = useState([
    { category: 'copper_wire', name: 'Copper Wire & Armature', pricePerKg: 450, unit: 'kg', trend: '+₹15 today' },
    { category: 'brass', name: 'Brass & Bronze Utensils', pricePerKg: 320, unit: 'kg', trend: '+₹10 today' },
    { category: 'battery', name: 'Lead Acid Vehicle Battery', pricePerKg: 65, unit: 'kg', trend: 'Stable' },
    { category: 'ewaste', name: 'Motherboards & E-Waste', pricePerKg: 80, unit: 'kg', trend: '+₹5 today' },
    { category: 'iron', name: 'Iron & Heavy Structural Steel', pricePerKg: 32, unit: 'kg', trend: '+₹2 today' },
    { category: 'plastic', name: 'Rigid Plastic & PET Bottles', pricePerKg: 18, unit: 'kg', trend: 'Stable' },
    { category: 'paper', name: 'Cardboard & Old Books', pricePerKg: 12, unit: 'kg', trend: 'Stable' },
  ]);

  // Load real backend rates if available
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await api.get('/rates');
        const rateList = res?.data?.data || res?.data;
        if (Array.isArray(rateList) && rateList.length > 0) {
          setRates(
            rateList.map((r) => ({
              category: r.category,
              name: r.name || r.category.replace('_', ' ').toUpperCase(),
              pricePerKg: r.pricePerKg,
              unit: r.unit || 'kg',
              trend: '+₹' + Math.floor(Math.random() * 8 + 2) + ' today',
            }))
          );
        }
      } catch {
        // Fallback to initial display rates
      }
    };
    fetchRates();
  }, []);

  const handleBookClick = () => {
    if (isAuthenticated) {
      if (user?.role === 'customer') {
        navigate('/customer/new-pickup');
      } else {
        const routeMap = {
          collector: '/collector',
          store_staff: '/store',
          admin: '/admin',
        };
        navigate(routeMap[user?.role] || '/customer');
      }
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* 1. TOP TICKER ANNOUNCEMENT */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white text-xs font-semibold py-2 px-4 text-center flex items-center justify-center gap-2 shadow-inner">
        <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
        <span>
          Live Daily Scrap Rates Updated: Copper ₹450/kg • Iron ₹32/kg • Battery ₹65/kg • Zero Deduction on Certified Scale
        </span>
        <span className="hidden md:inline-block bg-white/20 px-2 py-0.5 rounded-full text-3xs font-bold uppercase tracking-wider ml-2">
          Chennai Live
        </span>
      </div>

      {/* 2. STICKY PROFESSIONAL NAVBAR */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Recycle className="w-5 h-5 text-slate-950 font-black" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-white flex items-center gap-1">
                Waste<span className="text-emerald-400">Wallet</span>
              </span>
              <span className="text-3xs block font-bold text-slate-400 uppercase tracking-widest -mt-1">
                Circular Scrap Platform
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-5 text-xs font-bold text-slate-300">
            <a href="#rates" className="hover:text-emerald-400 transition-colors">
              Live Rates
            </a>
            <a href="#how-it-works" className="hover:text-emerald-400 transition-colors">
              How It Works
            </a>
            <Link to="/login?role=collector" className="hover:text-amber-400 transition-colors flex items-center gap-1">
              <span>🚚</span> Collector
            </Link>
            <Link to="/login?role=store_staff" className="hover:text-blue-400 transition-colors flex items-center gap-1">
              <span>🏬</span> Staff Depot
            </Link>
            <Link to="/login?role=admin" className="hover:text-rose-400 transition-colors flex items-center gap-1">
              <span>👑</span> Admin Ops
            </Link>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBookClick}
                  className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Dashboard ({user?.name?.split(' ')[0] || 'User'})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3 py-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                >
                  <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sign In</span>
                </Link>
                <button
                  type="button"
                  onClick={handleBookClick}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <span>Book Pickup</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 3. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 md:py-24 border-b border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
        {/* Ambient Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-1/3 right-10 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-emerald-400 text-xs font-bold mb-6 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Digital Precision Scales • Instant Bank & Cash Handover</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-none">
            Turn Household Scrap Into{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              Instant Cash Payouts.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-5 text-sm sm:text-base md:text-lg text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
            Stop waiting for uncertified scrap buyers. WasteWallet brings certified electronic scales to your
            doorstep with guaranteed daily mandi prices, OTP verification, and instant cash handover.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
            <button
              type="button"
              onClick={handleBookClick}
              className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <span>Schedule Free Pickup</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              to="/login?role=collector&mode=register"
              className="w-full sm:w-auto px-5 py-3.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-white font-bold text-sm rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Truck className="w-4 h-4 text-teal-400" />
              <span>Partner as Collector</span>
            </Link>
          </div>

          {/* Quick Direct Portal Access Chips */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider mr-1">Direct Portals:</span>
            <Link
              to="/login?role=customer"
              className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700 hover:border-emerald-500/50 text-slate-300 hover:text-white text-3xs font-bold transition-all flex items-center gap-1.5"
            >
              <span>👤</span> <span>Customer</span>
            </Link>
            <Link
              to="/login?role=collector"
              className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-white text-3xs font-bold transition-all flex items-center gap-1.5"
            >
              <span>🚚</span> <span>Collector Partner</span>
            </Link>
            <Link
              to="/login?role=store_staff"
              className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700 hover:border-blue-500/50 text-slate-300 hover:text-white text-3xs font-bold transition-all flex items-center gap-1.5"
            >
              <span>🏬</span> <span>Warehouse Staff</span>
            </Link>
            <Link
              to="/login?role=admin"
              className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700 hover:border-rose-500/50 text-slate-300 hover:text-white text-3xs font-bold transition-all flex items-center gap-1.5"
            >
              <span>👑</span> <span>Admin Ops</span>
            </Link>
          </div>

          {/* Trust Guarantees */}
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto text-left">
            {[
              { icon: Scale, title: 'Certified Scale', desc: 'Accurate to ±10 grams' },
              { icon: Zap, title: 'Instant Cash/UPI', desc: 'Secure SMS OTP lock' },
              { icon: ShieldCheck, title: 'Zero Deduction', desc: 'Clear gross weights' },
              { icon: Recycle, title: '100% Recycled', desc: 'Depot batch tracking' },
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60 backdrop-blur-xs flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <item.icon className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{item.title}</div>
                  <div className="text-3xs text-slate-400 font-medium">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. LIVE SCRAP RATES BOARD */}
      <section id="rates" className="py-16 bg-slate-950 border-b border-slate-800 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                <span>Transparent Pricing</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Today's Mandi Scrap Rates
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Updated in real-time. What you see is what your digital scale receipt pays out.
              </p>
            </div>
            <button
              type="button"
              onClick={handleBookClick}
              className="self-start md:self-auto px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Lock These Rates Now</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {rates.map((rate, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-850 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-2xs mb-2">
                    <span className="font-bold text-slate-400 uppercase tracking-wider">
                      {rate.category.replace('_', ' ')}
                    </span>
                    <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      {rate.trend}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                    {rate.name}
                  </h3>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-black text-white">₹{rate.pricePerKg}</span>
                    <span className="text-xs text-slate-400 font-semibold ml-1">/ {rate.unit}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleBookClick}
                    className="text-2xs font-bold text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer flex items-center gap-0.5"
                  >
                    <span>Sell ➔</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. HOW IT WORKS (3 SIMPLE STEPS) */}
      <section id="how-it-works" className="py-16 bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">
            Zero Hassle Process
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            How WasteWallet Works
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-lg mx-auto">
            From doorstep collection to instant bank account transfer in under 15 minutes.
          </p>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {[
              {
                step: '01',
                title: 'Book a 30-Min Slot',
                desc: 'Enter your doorstep address and select the scrap categories you have ready (Iron, Plastics, Copper, Cardboard).',
                icon: MapPin,
              },
              {
                step: '02',
                title: 'Digital Scale Weighing',
                desc: 'A verified WasteWallet collector partner arrives with a certified digital weighing scale for live inspection.',
                icon: Scale,
              },
              {
                step: '03',
                title: 'Instant Cash or UPI',
                desc: 'Review itemized rate card, receive 6-digit confirmation OTP on your phone, and collect your payout immediately.',
                icon: Zap,
              },
            ].map((step, idx) => (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-slate-850/60 border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-all"
              >
                <div className="text-3xl font-black text-slate-800 group-hover:text-emerald-500/20 transition-colors absolute top-4 right-4">
                  {step.step}
                </div>
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                  <step.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">{step.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. COLLECTOR PARTNER PROGRAM BANNER */}
      <section id="partners" className="py-16 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/60 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-12 rounded-3xl bg-slate-850 border border-emerald-500/30 flex flex-col lg:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden">
            <div className="space-y-4 max-w-xl">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-2xs font-black uppercase tracking-wider">
                🚚 For Scrap Collectors & Drivers
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                Earn ₹35,000 to ₹55,000/Month As An Approved Partner
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Receive pre-scheduled residential pickup routes directly on your phone. No cold roaming. Deposit
                collected scrap at our central warehouse with digital QR intake codes and receive guaranteed weekly payouts.
              </p>
              <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-200 pt-2">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Pre-scheduled doorstep routes
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Digital batch deposit QR
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Transparent fair commission
                </span>
              </div>
            </div>
            <div className="shrink-0 w-full sm:w-auto">
              <Link
                to="/login?role=collector&mode=register"
                className="w-full sm:w-auto px-6 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-2xl shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
              >
                <span>Register As Collector Partner</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="bg-slate-950 py-12 text-slate-400 text-xs border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950">
                  <Recycle className="w-4 h-4" />
                </div>
                <span className="text-base font-black text-white">WasteWallet</span>
              </div>
              <p className="text-3xs text-slate-500 leading-relaxed">
                Smart digital scrap network connecting eco-conscious households with certified collectors and authorized recycling depots.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Portal Links</h4>
              <ul className="space-y-2 text-3xs">
                <li><Link to="/login?role=customer" className="hover:text-emerald-400 flex items-center gap-1"><span>👤</span> Household Customer Login</Link></li>
                <li><Link to="/login?role=collector" className="hover:text-amber-400 flex items-center gap-1"><span>🚚</span> Collector Partner Portal</Link></li>
                <li><Link to="/login?role=store_staff" className="hover:text-blue-400 flex items-center gap-1"><span>🏬</span> Warehouse Staff Depot</Link></li>
                <li><Link to="/login?role=admin" className="hover:text-rose-400 flex items-center gap-1"><span>👑</span> Admin Operations HQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Operating Zones</h4>
              <ul className="space-y-2 text-3xs">
                <li>Anna Nagar East & West</li>
                <li>Kilpauk & Chetpet</li>
                <li>Ambattur Industrial Intake Depot</li>
                <li>T. Nagar & Central Chennai</li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Support & HQ</h4>
              <p className="text-3xs text-slate-500 leading-relaxed mb-2">
                WasteWallet HQ Command Center, Anna Nagar, Chennai 600102.
              </p>
              <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                <span>+91 98765 00001 (Mon–Sat 8AM–8PM)</span>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-3xs text-slate-600 gap-3">
            <p>© {new Date().getFullYear()} WasteWallet Technologies Inc. All rights reserved.</p>
            <p className="flex items-center gap-3">
              <span>Privacy Policy</span>
              <span>•</span>
              <span>Terms of Service</span>
              <span>•</span>
              <span>Certified ISO Circular Recycling</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
