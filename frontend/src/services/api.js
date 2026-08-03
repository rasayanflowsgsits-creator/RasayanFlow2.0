import axios from 'axios';
import { getToken, getRefreshToken, saveToken, saveRefreshToken, clearAuthSession, getUser } from '../utils/auth';
import { navigate } from '../utils/navigate';

// Support both VITE_API_BASE and VITE_API_BASE_URL for compatibility
const API_BASE = 
  import.meta.env.VITE_API_BASE_URL || 
  import.meta.env.VITE_API_BASE || 
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? window.location.origin : 'http://localhost:5000');

const TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || '30000', 10);
let refreshPromise = null;

const api = axios.create({
  baseURL: API_BASE,
  timeout: TIMEOUT,
  headers: { 
    'Content-Type': 'application/json',
    'X-Client-Version': import.meta.env.VITE_APP_VERSION || '1.0.0',
  }
});

/**
 * Request interceptor: Add auth token and handle setup
 */
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request setup failed:', error);
    return Promise.reject(error);
  }
);

/**
 * Response interceptor: Handle errors and auth
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config;
    const requestUrl = originalRequest?.url || '';
    const isAuthRoute = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register') || requestUrl.includes('/auth/refresh');

    // Attempt a single refresh when access token expired
    if (status === 401 && originalRequest && !originalRequest._retry && !isAuthRoute) {
      const user = getUser();
      if (user?.isPreview) {
        return Promise.reject(error);
      }
      originalRequest._retry = true;
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        clearAuthSession();
        navigate('/login');
        return Promise.reject(error);
      }

      if (!refreshPromise) {
        const refreshClient = axios.create({ baseURL: API_BASE });
        refreshPromise = refreshClient
          .post('/auth/refresh', { refreshToken })
          .then((resp) => {
            const newAccess = resp?.data?.data?.accessToken || resp?.data?.accessToken;
            const newRefresh = resp?.data?.data?.refreshToken || resp?.data?.refreshToken;
            if (newAccess) saveToken(newAccess);
            if (newRefresh) saveRefreshToken(newRefresh);
            return { accessToken: newAccess, refreshToken: newRefresh };
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      return refreshPromise
        .then(({ accessToken }) => {
          if (accessToken && originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }
          return axios(originalRequest);
        })
        .catch((refreshErr) => {
          clearAuthSession();
          navigate('/login');
          return Promise.reject(refreshErr);
        });
    }

    // Log error for debugging in development
    if (import.meta.env.DEV) {
      console.error(`[API Error ${status}]`, error?.response?.data?.message || error?.message);
    }

    // Return original error so all handlers work correctly
    return Promise.reject(error);
  }
);

export default api;
