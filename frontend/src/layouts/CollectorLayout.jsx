// CollectorLayout: Mobile-first navigation layout for scrap collectors
import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Truck, Layers, Star, LogOut, ShieldCheck, User } from 'lucide-react';
import useAuth from '../hooks/useAuth';

export const CollectorLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20">
      {/* Top Header with Collector Status */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 py-3 shadow-xs">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-amber-600 text-white rounded-xl flex items-center justify-center shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">WasteWallet</h1>
              <p className="text-xs text-amber-700 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                {user?.storeName || 'Collector Partner'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>{user?.rating?.avg || 5.0}</span>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="text-slate-500 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-md w-full mx-auto p-4">
        <Outlet />
      </main>

      {/* Mobile-First Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-around py-2">
          <NavLink
            to="/collector"
            end
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-xs font-medium py-1 px-3 rounded-lg transition-colors ${
                isActive ? 'text-amber-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            <Truck className="w-5 h-5" />
            <span>Active Jobs</span>
          </NavLink>

          <NavLink
            to="/collector/batches"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-xs font-medium py-1 px-3 rounded-lg transition-colors ${
                isActive ? 'text-amber-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            <Layers className="w-5 h-5" />
            <span>Daily Batches</span>
          </NavLink>

          <NavLink
            to="/collector/profile"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-xs font-medium py-1 px-3 rounded-lg transition-colors ${
                isActive ? 'text-amber-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            <User className="w-5 h-5" />
            <span>Profile</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
};

export default CollectorLayout;
