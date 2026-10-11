// AdminLayout: Administration portal layout
import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Coins, AlertTriangle, Users, LogOut, ShieldAlert } from 'lucide-react';
import useAuth from '../hooks/useAuth';

export const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Admin Navbar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 px-6 py-3.5 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-500 text-slate-950 font-black rounded-lg flex items-center justify-center">
              WW
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-wide">WasteWallet Admin</h1>
              <p className="text-xs text-slate-400">Master Operations Control</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full font-mono">
              {user?.name || 'Administrator'}
            </span>
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-rose-400 flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-md hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Admin Subnav */}
      <nav className="bg-white border-b border-slate-200 px-6">
        <div className="max-w-6xl mx-auto flex items-center gap-6 overflow-x-auto text-sm font-medium">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `py-3 border-b-2 flex items-center gap-2 transition-colors ${
                isActive
                  ? 'border-emerald-600 text-emerald-600 font-semibold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`
            }
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard & Reports</span>
          </NavLink>

          <NavLink
            to="/admin/rates"
            className={({ isActive }) =>
              `py-3 border-b-2 flex items-center gap-2 transition-colors ${
                isActive
                  ? 'border-emerald-600 text-emerald-600 font-semibold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`
            }
          >
            <Coins className="w-4 h-4" />
            <span>Rates & Zones</span>
          </NavLink>

          <NavLink
            to="/admin/fraud-alerts"
            className={({ isActive }) =>
              `py-3 border-b-2 flex items-center gap-2 transition-colors ${
                isActive
                  ? 'border-emerald-600 text-emerald-600 font-semibold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`
            }
          >
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Fraud Alerts</span>
          </NavLink>
        </div>
      </nav>

      {/* Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
