// App.jsx: Main routing and authentication provider hierarchy
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import useAuth from './hooks/useAuth';
import ProtectedRoute from './routes/ProtectedRoute';

// Layouts
import CustomerLayout from './layouts/CustomerLayout';
import CollectorLayout from './layouts/CollectorLayout';
import AdminLayout from './layouts/AdminLayout';
import StoreLayout from './layouts/StoreLayout';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import CustomerHome from './pages/customer/CustomerHome';
import CustomerProfilePage from './pages/customer/CustomerProfilePage';
import NewPickupPage from './pages/customer/NewPickupPage';
import PickupHistoryPage from './pages/customer/PickupHistoryPage';
import LiveTrackingPage from './pages/customer/LiveTrackingPage';
import CollectorHome from './pages/collector/CollectorHome';
import CollectorJobCard from './pages/collector/CollectorJobCard';
import CollectorBatchPage from './pages/collector/CollectorBatchPage';
import CollectorProfilePage from './pages/collector/CollectorProfilePage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminRatesPage from './pages/admin/AdminRatesPage';
import AdminFraudPage from './pages/admin/AdminFraudPage';
import StoreIntakePage from './pages/store/StoreIntakePage';
import StoreSortingPage from './pages/store/StoreSortingPage';

// Helper component: Root index router based on authentication state
const RootRedirect = () => {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-600">Loading WasteWallet...</p>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  const roleRoutes = {
    customer: '/customer',
    collector: '/collector',
    store_staff: '/store',
    admin: '/admin',
  };

  return <Navigate to={roleRoutes[user.role] || '/customer'} replace />;
};

export const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            {/* Public Landing & Authentication Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Customer Routes (Guarded for customer role) */}
            <Route element={<ProtectedRoute allowedRoles={['customer']} />}>
              <Route element={<CustomerLayout />}>
                <Route path="/customer" element={<CustomerHome />} />
                <Route path="/customer/pickups" element={<PickupHistoryPage />} />
                <Route path="/customer/pickups/:id" element={<LiveTrackingPage />} />
                <Route path="/customer/new-pickup" element={<NewPickupPage />} />
                <Route path="/customer/profile" element={<CustomerProfilePage />} />
              </Route>
            </Route>

            {/* Collector Partner Routes (Guarded for collector role) */}
            <Route element={<ProtectedRoute allowedRoles={['collector']} />}>
              <Route element={<CollectorLayout />}>
                <Route path="/collector" element={<CollectorHome />} />
                <Route path="/collector/pickups/:id" element={<CollectorJobCard />} />
                <Route path="/collector/batch" element={<CollectorBatchPage />} />
                <Route path="/collector/batches" element={<CollectorBatchPage />} />
                <Route path="/collector/profile" element={<CollectorProfilePage />} />
              </Route>
            </Route>

            {/* Admin Operations Routes (Guarded for admin role) */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/rates" element={<AdminRatesPage />} />
                <Route path="/admin/zones" element={<AdminRatesPage />} />
                <Route path="/admin/reports" element={<AdminDashboard />} />
                <Route path="/admin/fraud-alerts" element={<AdminFraudPage />} />
              </Route>
            </Route>

            {/* Store / Warehouse Reception Staff */}
            <Route element={<ProtectedRoute allowedRoles={['store_staff', 'admin', 'collector']} />}>
              <Route element={<StoreLayout />}>
                <Route path="/store" element={<StoreIntakePage />} />
                <Route path="/store/sort" element={<StoreSortingPage />} />
                <Route path="/store/batches/:id/sort" element={<StoreSortingPage />} />
                <Route path="/store/batches" element={<StoreIntakePage />} />
              </Route>
            </Route>

            {/* Fallback for unmapped routes */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
