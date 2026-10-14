// Centralized Axios HTTP client with dynamic API resolution and JWT Authorization header
import axios from 'axios';

// Dynamic API base URL resolution:
// 1. If running in production (Vercel, Render, or any non-localhost domain) -> Use Render production backend
// 2. If testing locally over Wi-Fi on a phone (192.168.x.x / 10.x.x.x) -> Connect to laptop backend on port 5000
// 3. If running on desktop localhost -> Use localhost:5000 or env variable
const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  const isBrowser = typeof window !== 'undefined';
  const hostname = isBrowser ? window.location.hostname : '';

  // 1. If running on desktop localhost -> ALWAYS use localhost backend on port 5000!
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '') {
    return 'http://localhost:5000/api/v1';
  }

  // 2. Mobile testing on local Wi-Fi (e.g. phone accessing http://192.168.1.5:5173)
  if (hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
    return `http://${hostname}:5000/api/v1`;
  }

  // 3. Remote production or Vercel deployment (e.g. wastewallet.vercel.app)
  if (
    hostname.endsWith('.vercel.app') ||
    (hostname && !hostname.startsWith('192.168.') && !hostname.startsWith('10.'))
  ) {
    return envUrl && !envUrl.includes('localhost')
      ? envUrl
      : 'https://wastewallet-backend-93py.onrender.com/api/v1';
  }

  return envUrl || 'http://localhost:5000/api/v1';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 45000, // 45 seconds to handle Render free-tier cold starts smoothly
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Attach JWT token from localStorage if logged in
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle global 401 token expirations gracefully
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    const message = error.response?.data?.message || error.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export default api;
