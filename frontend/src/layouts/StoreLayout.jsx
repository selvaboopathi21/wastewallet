// StoreLayout: Warehouse staff layout with hub header, receipt notification bell and navigation
import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { Building2, QrCode, Boxes, History, LogOut, Truck, Bell, CheckCircle2, X } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import api from '../api/axios';
import { useSocket } from '../context/SocketContext';

export const StoreLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await api.get('/company-dispatch/notifications');
      const data = res?.data?.data || res?.data;
      setNotifications(data?.notifications || []);
      setUnreadCount(data?.unreadCount || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Listen to real-time company receipt socket
  useEffect(() => {
    if (!socket) return;

    const onReceipt = (data) => {
      fetchNotifications();
    };

    socket.on('company.dispatch.received', onReceipt);
    return () => {
      socket.off('company.dispatch.received', onReceipt);
    };
  }, [socket]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const markAllRead = async () => {
    try {
      await api.patch('/company-dispatch/notifications/read', { notificationId: 'all' });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col pb-20">
      {/* Top Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 px-4 py-3 shadow-md">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-emerald-500 text-slate-950 rounded-xl flex items-center justify-center font-bold shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-black leading-tight">WasteWallet Warehouse Hub</h1>
              <p className="text-2xs text-emerald-400 font-mono">Anna Nagar Central Store</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notification Bell with Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsNotifOpen(!isNotifOpen);
                  if (unreadCount > 0 && !isNotifOpen) {
                    markAllRead();
                  }
                }}
                className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Company Receipt Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white font-black text-3xs rounded-full flex items-center justify-center animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Flyout */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 text-slate-900 p-3 z-50 animate-fadeIn">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-emerald-600" />
                      Company Receipt Messages
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsNotifOpen(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-1.5 text-2xs">
                    {notifications.length === 0 ? (
                      <p className="text-slate-400 text-center py-4">No receipt messages yet.</p>
                    ) : (
                      notifications.slice(0, 5).map((n) => (
                        <div key={n._id} className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="font-bold text-slate-800 block">{n.title}</span>
                          <p className="text-3xs text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                          <span className="text-3xs text-slate-400 font-mono block mt-1">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 mt-2 text-center">
                    <Link
                      to="/store/handover"
                      onClick={() => setIsNotifOpen(false)}
                      className="text-3xs font-bold text-emerald-700 hover:underline"
                    >
                      View All in Handover Center ➔
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <span className="text-2xs font-bold bg-white/10 px-2.5 py-1 rounded-full text-slate-200 hidden sm:inline">
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
      <main className="flex-1 max-w-3xl w-full mx-auto p-4">
        <Outlet />
      </main>

      {/* Mobile / Desktop Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 shadow-lg">
        <div className="max-w-3xl mx-auto flex items-center justify-around py-1.5">
          <NavLink
            to="/store"
            end
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-2xs font-bold py-1 px-3 rounded-xl transition-all ${
                isActive ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            <QrCode className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-3xs sm:text-2xs">QR Intake</span>
          </NavLink>

          <NavLink
            to="/store/sort"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-2xs font-bold py-1 px-3 rounded-xl transition-all ${
                isActive ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            <Boxes className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-3xs sm:text-2xs">Sorting</span>
          </NavLink>

          <NavLink
            to="/store/handover"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-2xs font-bold py-1 px-3 rounded-xl transition-all relative ${
                isActive ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
            <span className="text-3xs sm:text-2xs">Company Handover</span>
            {unreadCount > 0 && (
              <span className="absolute top-0 right-2 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
            )}
          </NavLink>

          <NavLink
            to="/store/batches"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-2xs font-bold py-1 px-3 rounded-xl transition-all ${
                isActive ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            <History className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-3xs sm:text-2xs">Batch Audits</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
};

export default StoreLayout;
