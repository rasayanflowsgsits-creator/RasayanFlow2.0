import { create } from 'zustand';
import api from '../services/api';
import useAppStore from './appStore';
import { saveToken, saveRefreshToken, saveUser, clearAuthSession, onAuthCleared, getUser, getToken } from '../utils/auth';

const initial = {
  initialized: false,
  user: getUser(),
  token: null,
  loading: false,
  error: null
};

const clearedAuthState = {
  user: null,
  token: null,
  loading: false,
  error: null,
  initialized: true,
};

const normalizeRole = (role) => {
  if (role === 'superAdmin') return 'super-admin';
  if (role === 'labAdmin') return 'lab-admin';
  if (role === 'storeAdmin') return 'store-admin';
  if (role === 'store_admin') return 'store-admin';
  return role || 'student';
};

const normalizeUser = (user) => {
  if (!user) return null;
  // onboardingComplete only when the student actually has all three fields saved
  const isComplete = Boolean(
    user.isPreview ||
    (user.role && user.role !== 'student') ||
    (
      (user.onboardingComplete ||
        (typeof localStorage !== 'undefined' && user._id && localStorage.getItem(`pharmlab-onboarding-complete-${user._id}`) === 'true') ||
        (typeof localStorage !== 'undefined' && localStorage.getItem('pharmlab-onboarding-complete') === 'true')
      ) &&
      user.rollNumber &&
      user.year &&
      user.semester
    )
  );
  return { 
    ...user, 
    role: normalizeRole(user.role),
    onboardingComplete: isComplete
  };
};

const useAuthStore = create((set) => ({
  ...initial,
  setUser: (user) => set({ user: normalizeUser(user), error: null }),
  updateUser: (updates) => set((state) => {
    if (!state.user) return state;
    const updatedUser = { ...state.user, ...updates };
    saveUser(updatedUser);
    return { user: updatedUser };
  }),
  register: async (values) => {
    set({ loading: true, error: null });
    try {
      const resp = await api.post('/auth/register', values);
      const payload = resp.data?.data || resp.data;
      const user = normalizeUser(payload);
      set({ loading: false, error: null });
      return user;
    } catch (error) {
      const message = error?.response?.data?.message || 'Registration failed';
      set({ loading: false, error: message });
      throw new Error(message);
    }
  },
  login: async (values) => {
    set({ loading: true, error: null });
    try {
      const resp = await api.post('/auth/login', values);
      const payload = resp.data?.data || resp.data;
      const token = payload?.accessToken || payload?.token || null;
      const refreshToken = payload?.refreshToken || null;
      const user = normalizeUser(payload);

      saveToken(token);
      if (refreshToken) saveRefreshToken(refreshToken);
      saveUser(user);
      set({ user, token, loading: false, error: null });
      return user;
    } catch (error) {
      const message = error?.response?.data?.message || 'Login failed';
      set({ loading: false, error: message });
      throw new Error(message);
    }
  },
  changePassword: async ({ currentPassword, newPassword }) => {
    set({ loading: true, error: null });
    try {
      const resp = await api.put('/auth/password', { currentPassword, newPassword });
      set({ loading: false, error: null });
      return resp.data?.data || resp.data;
    } catch (error) {
      const message = error?.response?.data?.message || 'Password update failed';
      set({ loading: false, error: message });
      throw new Error(message);
    }
  },
  loginAsPreviewStudent: () => {
    const previewUser = {
      id: 'preview-student-id',
      _id: 'preview-student-id',
      name: 'Student Preview',
      email: 'student.preview@rasayanflow.local',
      role: 'student',
      isApproved: true,
      onboardingComplete: true,
      course: 'B.Pharm',
      year: '1',
      semester: '1',
      group: 'Group A',
      rollNumber: '0832PH211001',
      isPreview: true,
    };
    const dummyToken = 'preview-token';
    saveToken(dummyToken);
    saveUser(previewUser);
    set({ user: previewUser, token: dummyToken, loading: false, error: null, initialized: true });
    return previewUser;
  },
  loginAsPreviewPhDStudent: () => {
    const previewUser = {
      id: 'preview-phd-id',
      _id: 'preview-phd-id',
      name: 'Harsh Scholar (PhD)',
      email: 'phd.scholar@rasayanflow.local',
      role: 'student',
      course: 'PhD',
      year: '1',
      isApproved: true,
      onboardingComplete: true,
      isPreview: true,
      isPhD: true
    };
    const dummyToken = 'preview-phd-token';
    saveToken(dummyToken);
    saveUser(previewUser);
    set({ user: previewUser, token: dummyToken, loading: false, error: null, initialized: true });
    return previewUser;
  },
  logout: () => {
    clearAuthSession();
  },
  ensureAuth: async () => {
    const cachedUser = normalizeUser(getUser());
    const token = getToken();

    if (cachedUser?.isPreview) {
      set({ user: cachedUser, token: token || 'preview-token', initialized: true });
      return;
    }

    if (!token) {
      set({ user: null, token: null, initialized: true });
      return;
    }

    set({ user: cachedUser, token, initialized: true });

    try {
      const resp = await api.get('/auth/me');
      const user = normalizeUser(resp.data?.data || resp.data);
      saveUser(user);
      set({ user, token, initialized: true, error: null });
    } catch {
      clearAuthSession();
      set(clearedAuthState);
    }
  }
}));

if (typeof window !== 'undefined') {
  onAuthCleared(() => {
    useAuthStore.setState(clearedAuthState);
    useAppStore.getState().resetAppState();
  });
}

export default useAuthStore;
