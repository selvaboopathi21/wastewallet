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

  // 1. If not authenticated, redirect to login page with matching role parameter
  if (!token || !user) {
    const path = window.location.pathname;
    let roleParam = '';
    if (path.startsWith('/admin')) {
      roleParam = '?role=admin';
    } else if (path.startsWith('/store')) {
      roleParam = '?role=store_staff';
    } else if (path.startsWith('/collector')) {
      roleParam = '?role=collector';
    } else if (path.startsWith('/customer')) {
      roleParam = '?role=customer';
    }
    return <Navigate to={`/login${roleParam}`} replace />;
  }

  // 2. If collector is not yet approved by Admin, restrict to dashboard overview only
  if (user.role === 'collector' && !user.isApproved) {
    const path = window.location.pathname;
    if (
      path.startsWith('/collector/pickups') ||
      path.startsWith('/collector/batch') ||
      path.startsWith('/collector/batches')
    ) {
      return <Navigate to="/collector" replace />;
    }
  }

  // 3. If specific roles are required, ensure user has permission
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
