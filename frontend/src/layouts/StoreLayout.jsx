// StoreLayout: Warehouse staff layout with hub header and bottom/top navigation
import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Building2, QrCode, Boxes, History, LogOut } from 'lucide-react';
import useAuth from '../hooks/useAuth';

export const StoreLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col pb-20">
      {/* Top Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 px-4 py-3 shadow-md">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-emerald-500 text-slate-950 rounded-xl flex items-center justify-center font-bold shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-black leading-tight">WasteWallet Warehouse Hub</h1>
              <p className="text-2xs text-emerald-400 font-mono">Anna Nagar Central Store</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-2xs font-bold bg-white/10 px-2.5 py-1 rounded-full text-slate-200">
              {user?.name || 'Staff Member'}
            </span>
            <button
              onClick={handleLogout}
              title="Logout"
              className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4">
        <Outlet />
      </main>

      {/* Mobile / Desktop Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center justify-around py-2">
          <NavLink
            to="/store"
            end
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-2xs font-bold py-1 px-4 rounded-xl transition-all ${
                isActive ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            <QrCode className="w-5 h-5" />
            <span>QR Intake</span>
          </NavLink>

          <NavLink
            to="/store/sort"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-2xs font-bold py-1 px-4 rounded-xl transition-all ${
                isActive ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            <Boxes className="w-5 h-5" />
            <span>Material Sorting</span>
          </NavLink>

          <NavLink
            to="/store/batches"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-2xs font-bold py-1 px-4 rounded-xl transition-all ${
                isActive ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            <History className="w-5 h-5" />
            <span>Batch Audits</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
};

export default StoreLayout;
