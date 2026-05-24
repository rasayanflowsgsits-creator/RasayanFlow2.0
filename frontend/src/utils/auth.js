const TOKEN_KEY = 'pharmlab-token';
const USER_KEY = 'pharmlab-user';
const AUTH_CLEARED_EVENT = 'pharmlab:auth-cleared';
const REFRESH_KEY = 'rf_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const saveToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const destroyToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};
export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY);
export const saveRefreshToken = (token) => localStorage.setItem(REFRESH_KEY, token);
export const destroyRefreshToken = () => localStorage.removeItem(REFRESH_KEY);
export const clearAuthSession = () => {
  destroyToken();
  destroyRefreshToken();
  window.dispatchEvent(new Event(AUTH_CLEARED_EVENT));
};
export const onAuthCleared = (callback) => {
  window.addEventListener(AUTH_CLEARED_EVENT, callback);
  return () => window.removeEventListener(AUTH_CLEARED_EVENT, callback);
};

export const getUser = () => {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch {
    return null;
  }
};

export const saveUser = (user) => localStorage.setItem(USER_KEY, JSON.stringify(user));
