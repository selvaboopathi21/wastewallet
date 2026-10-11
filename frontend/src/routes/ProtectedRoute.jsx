// ProtectedRoute: Guards client-side routes based on login status and user role
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

export const ProtectedRoute = ({ allowedRoles = [] }) => {
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

  // 1. If not authenticated, redirect to login page
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // 2. If specific roles are required, ensure user has permission
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect user to their own role's home view
    const roleRoutes = {
      customer: '/customer',
      collector: '/collector',
      store_staff: '/store',
      admin: '/admin',
    };
    return <Navigate to={roleRoutes[user.role] || '/'} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
