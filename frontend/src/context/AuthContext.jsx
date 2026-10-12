// AuthContext: Manages phone + OTP login state, JWT token persistence, and active user role
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  // Load user profile on startup if token exists
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        try {
          const res = await api.get('/auth/me');
          if (res?.data?.user) {
            setUser(res.data.user);
            localStorage.setItem('user', JSON.stringify(res.data.user));
          }
        } catch {
          // Token invalid or expired
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Step 1: Send OTP to phone number
  const requestOtp = async (phone) => {
    const res = await api.post('/auth/send-otp', { phone });
    return res;
  };

  // Step 2: Verify OTP and save JWT token
  const verifyOtp = async ({ phone, otp, name, email, address, role }) => {
    const res = await api.post('/auth/verify-otp', { phone, otp, name, email, address, role });
    const payload = res?.data?.data || res?.data;
    if (payload?.token && payload?.user) {
      const newToken = payload.token;
      const newUser = payload.user;

      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));

      setToken(newToken);
      setUser(newUser);
      return newUser;
    }
    throw new Error('Invalid login response from server');
  };

  // Step 3: Google Login & Registration (Requires both compulsory Email and Mobile Number)
  const loginWithGoogle = async ({ email, phone, name, googleId, role, address }) => {
    const res = await api.post('/auth/google', { email, phone, name, googleId, role, address });
    const payload = res?.data?.data || res?.data;
    if (payload?.token && payload?.user) {
      const newToken = payload.token;
      const newUser = payload.user;

      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));

      setToken(newToken);
      setUser(newUser);
      return newUser;
    }
    throw new Error('Invalid Google login response from server');
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  // Update profile
  const updateProfile = async ({ name, address, language }) => {
    const res = await api.patch('/auth/profile', { name, address, language });
    const updated = res?.data?.data?.user || res?.data?.user;
    if (updated) {
      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
      return updated;
    }
  };

  // Refresh profile details (e.g. after rating change or approval status update)
  const refreshProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      const u = res?.data?.data?.user || res?.data?.user;
      if (u) {
        setUser(u);
        localStorage.setItem('user', JSON.stringify(u));
      }
    } catch (err) {
      console.error('Error refreshing profile:', err);
    }
  };

  // Direct 1-click login with token
  const loginWithToken = (tokenStr, userObj) => {
    localStorage.setItem('token', tokenStr);
    localStorage.setItem('user', JSON.stringify(userObj));
    setToken(tokenStr);
    setUser(userObj);
    return userObj;
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    requestOtp,
    verifyOtp,
    loginWithGoogle,
    updateProfile,
    loginWithToken,
    logout,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
