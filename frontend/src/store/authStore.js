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
  loginAsPreviewMPharmStudent: (semester = '1') => {
    const semNum = String(semester);
    const yr = semNum === '3' || semNum === '4' ? '2' : '1';
    const labMapping = {
      '1': { code: 'MPHARM-101L', name: 'M.Pharm Advanced Pharmaceutics Lab - I', email: 'mpharm.student1@rasayanflow.local', studentName: 'Ananya Sen (M.Pharm Sem 1)' },
      '2': { code: 'MPHARM-201L', name: 'M.Pharm Advanced Spectral Analysis Lab', email: 'mpharm.student2@rasayanflow.local', studentName: 'Rohit Mehta (M.Pharm Sem 2)' },
      '3': { code: 'MPHARM-301L', name: 'M.Pharm Novel Drug Delivery Research Lab', email: 'mpharm.student3@rasayanflow.local', studentName: 'Tanvi Deshmukh (M.Pharm Thesis Scholar)' },
      '4': { code: 'MPHARM-401L', name: 'M.Pharm Dissertation & Final Defense Lab', email: 'mpharm.student4@rasayanflow.local', studentName: 'Aman Verma (M.Pharm Dissertation Scholar)' },
    };
    const target = labMapping[semNum] || labMapping['1'];
    const labs = useAppStore.getState().labs || [];
    const matchedLab = labs.find((l) => l.labCode === target.code) || labs.find((l) => (l.courseType || '').toLowerCase().includes('m.pharm'));
    const labId = matchedLab ? (matchedLab._id || matchedLab.id) : `preview-lab-mpharm-sem${semNum}`;

    const previewUser = {
      id: matchedLab ? `mpharm-student-${semNum}` : 'preview-mpharm-id',
      _id: matchedLab ? `mpharm-student-${semNum}` : 'preview-mpharm-id',
      name: target.studentName,
      email: target.email,
      role: 'student',
      course: 'M.Pharm',
      courseType: 'M.Pharm',
      year: yr,
      semester: semNum,
      rollNumber: `0832MP25100${semNum}`,
      group: 'Group A',
      labId: labId,
      labName: matchedLab?.labName || matchedLab?.name || target.name,
      labCode: target.code,
      isApproved: true,
      onboardingComplete: true,
      isPreview: true,
    };
    const dummyToken = 'preview-mpharm-token';
    saveToken(dummyToken);
    saveUser(previewUser);
    set({ user: previewUser, token: dummyToken, loading: false, error: null, initialized: true });
    return previewUser;
  },
  loginAsPreviewMPharmSupervisor: (semester = '1') => {
    const semNum = String(semester);
    const yr = semNum === '3' || semNum === '4' ? '2' : '1';
    const supervisorProfiles = {
      '1': {
        name: 'Dr. Rajesh Sharma (Sem 1 Supervisor)',
        email: 'supervisor.sem1@rasayanflow.local',
        labName: 'M.Pharm Advanced Pharmaceutics Lab - I',
        labCode: 'MPHARM-101L'
      },
      '2': {
        name: 'Dr. Priya Nair (Sem 2 Supervisor)',
        email: 'supervisor.sem2@rasayanflow.local',
        labName: 'M.Pharm Advanced Spectral Analysis Lab',
        labCode: 'MPHARM-201L'
      },
      '3': {
        name: 'Dr. Arun Verma (Sem 3 Research Supervisor)',
        email: 'supervisor.sem3@rasayanflow.local',
        labName: 'M.Pharm Novel Drug Delivery Research Lab',
        labCode: 'MPHARM-301L'
      },
      '4': {
        name: 'Dr. Neha Gupta (Sem 4 Dissertation Supervisor)',
        email: 'supervisor.sem4@rasayanflow.local',
        labName: 'M.Pharm Dissertation & Final Defense Lab',
        labCode: 'MPHARM-401L'
      }
    };
    const profile = supervisorProfiles[semNum] || supervisorProfiles['1'];
    const labs = useAppStore.getState().labs || [];
    const matchedLab = labs.find((l) => l.labCode === profile.labCode) || labs.find((l) => (l.courseType || '').toLowerCase().includes('m.pharm'));
    const labId = matchedLab ? (matchedLab._id || matchedLab.id) : `preview-lab-mpharm-sem${semNum}`;

    const previewUser = {
      id: `preview-supervisor-sem${semNum}-id`,
      _id: `preview-supervisor-sem${semNum}-id`,
      name: profile.name,
      email: profile.email,
      role: 'labAdmin',
      course: 'M.Pharm',
      courseType: 'M.Pharm',
      year: yr,
      semester: semNum,
      isSupervisor: true,
      labId: labId,
      labName: matchedLab?.labName || matchedLab?.name || profile.labName,
      labCode: profile.labCode,
      isApproved: true,
      onboardingComplete: true,
      isPreview: true,
    };
    const dummyToken = 'preview-supervisor-token';
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
