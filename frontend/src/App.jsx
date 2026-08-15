import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import useAuthStore from './store/authStore';
import useAppStore from './store/appStore';
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import Toast from './components/ui/Toast';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import LabAdminDashboard from './pages/LabAdminDashboard';
import StoreDashboard from './pages/StoreDashboard';
import StoreManagerDashboard from './store/StoreDashboard';
import StoreInventory from './store/StoreInventory';
import StoreTracking from './store/StoreTracking';
import StoreAlerts from './store/StoreAlerts';
import StoreStockOverview from './store/StoreStockOverview';
import StoreRequests from './store/StoreRequests';
import StoreHistory from './store/StoreHistory';
import StoreReports from './store/StoreReports';
import StudentDashboard from './pages/StudentDashboard';
import StudentBorrowingsPage from './pages/StudentBorrowingsPage';
import StudentLabDetail from './pages/StudentLabDetail';
import StudentStorePage from './pages/StudentStorePage';
import LabStoreRequests from './pages/LabStoreRequests';
import LabNotifications from './pages/LabNotifications';
import LabHistory from './pages/LabHistory';
import LabTransactionsPage from './pages/LabTransactionsPage';
import LabExperimentsPage from './pages/LabExperimentsPage';
import LabStudentRequestsPage from './pages/LabStudentRequestsPage';
import LabGroupsPage from './pages/LabGroupsPage';
import LabLiveMonitorPage from './pages/LabLiveMonitorPage';
import LabAnalyticsPage from './pages/LabAnalyticsPage';
import AboutPage from './pages/AboutPage';
import NotFound from './pages/NotFound';
import socket from './services/socket';
import './index.css';

function normalizePathname(pathname) {
  const collapsedPath = pathname.replace(/\/{2,}/g, '/');

  if (collapsedPath.length > 1) {
    return collapsedPath.replace(/\/+$/, '');
  }

  return collapsedPath || '/';
}

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false));
  const [darkMode, setDarkMode] = useState(localStorage.getItem('pharmlab-dark') === 'true');

  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);
  const ensureAuth = useAuthStore((state) => state.ensureAuth);
  const logout = useAuthStore((state) => state.logout);

  const toast = useAppStore((state) => state.toast);
  const removeToast = useAppStore((state) => state.removeToast);
  const setToast = useAppStore((state) => state.setToast);
  const setHighlight = useAppStore((state) => state.setHighlight);

  useEffect(() => {
    ensureAuth();
  }, [ensureAuth]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('pharmlab-dark', darkMode ? 'true' : 'false');
  }, [darkMode]);

  useEffect(() => {
    if (user && !socket.connected) {
      socket.connect();
    }

    if (!user && socket.connected) {
      socket.disconnect();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    socket.on('inventory.updated', (payload) => {
      const itemName = payload?.item?.itemName || payload?.item?.name || payload?.name || 'Item';
      const highlightId = payload?.item?._id || payload?.item?.id || payload?.itemId || payload?.id || itemName;
      setToast({ type: 'success', message: `${itemName} updated` });
      setHighlight(highlightId);
    });

    socket.on('store:new_request', (payload) => {
      // Notify all users and refresh store allotments for store admin
      if (user?.role === 'store-admin' || user?.role === 'store_admin') {
        setToast({ 
          type: 'info', 
          message: `New store request: ${payload.itemName} from ${payload.studentName}` 
        });
        const appStore = useAppStore.getState();
        appStore.fetchStoreAllotments();
      }
    });

    socket.on('store:request_approved', (payload) => {
      setToast({ 
        type: 'success', 
        message: `Store request approved: ${payload.itemName} for ${payload.studentName}` 
      });
      // Refresh store allotments if on store admin dashboard
      if (user?.role === 'store-admin' || user?.role === 'store_admin') {
        const appStore = useAppStore.getState();
        appStore.fetchStoreAllotments();
      }
    });

    socket.on('store:request_rejected', (payload) => {
      setToast({ 
        type: 'warning', 
        message: `Store request rejected: ${payload.itemName} for ${payload.studentName}` 
      });
      // Refresh store allotments if on store admin dashboard
      if (user?.role === 'store-admin' || user?.role === 'store_admin') {
        const appStore = useAppStore.getState();
        appStore.fetchStoreAllotments();
      }
    });

    socket.on('request-approved', (payload) => {
      if (user?.role === 'lab-admin') {
        const message = `${payload.chemical} ${payload.quantity}${payload.unit} has been approved by Store Manager`;
        setToast({ type: 'success', message });
        const appStore = useAppStore.getState();
        appStore.fetchUnreadNotificationCount();
        appStore.fetchNotifications();
      }
    });

    socket.on('request-rejected', (payload) => {
      if (user?.role === 'lab-admin') {
        const message = `Your request for ${payload.chemicalName} has been rejected.`;
        setToast({ type: 'error', message });
        const appStore = useAppStore.getState();
        appStore.fetchUnreadNotificationCount();
        appStore.fetchNotifications();
      }
    });

    socket.on('new-student-request', (payload) => {
      if (user?.role === 'lab-admin') {
        setToast({ type: 'info', message: `New experiment request from ${payload.studentName}` });
        const appStore = useAppStore.getState();
        if (payload.labId) {
          appStore.fetchStudentRequests(payload.labId);
        }
      }
    });

    socket.on('new-store-request', (payload) => {
      if (user?.role === 'store-admin' || user?.role === 'store_admin') {
        setToast({ type: 'info', message: `New direct research request from ${payload?.studentName || 'a student'}` });
      }
    });

    socket.on('notification', (payload) => {
      setToast({ type: 'info', message: payload.message || payload.title });
      if (user?.role === 'student') {
        const appStore = useAppStore.getState();
        appStore.fetchMyStudentRequests();
        appStore.fetchMyResearchRequests();
      }
    });

    return () => {
      socket.off('inventory.updated');
      socket.off('store:new_request');
      socket.off('store:request_approved');
      socket.off('store:request_rejected');
      socket.off('request-approved');
      socket.off('request-rejected');
      socket.off('new-student-request');
      socket.off('new-store-request');
      socket.off('notification');
    };
  }, [user?._id, user?.role, setHighlight, setToast]);

  if (!initialized) {
    return (
      <div className='grid min-h-screen place-items-center bg-[#fdfdf7] text-sm text-[#71805a] dark:bg-[#1a1d16] dark:text-[#c5d0b5]'>
        Loading...
      </div>
    );
  }

  const rawRole = user?.role || 'student';
  const isSuperAdmin = rawRole === 'super-admin' || rawRole === 'superAdmin' || rawRole === 'super_admin';
  const isLabAdmin = rawRole === 'lab-admin' || rawRole === 'labAdmin' || rawRole === 'lab_admin';
  const isStoreAdmin = rawRole === 'store-admin' || rawRole === 'store_admin' || rawRole === 'storeAdmin';
  const isStudent = !isSuperAdmin && !isLabAdmin && !isStoreAdmin;

  function AppRoutes() {
    const location = useLocation();
    const normalizedPathname = normalizePathname(location.pathname);

    if (normalizedPathname !== location.pathname) {
      return <Navigate to={`${normalizedPathname}${location.search}${location.hash}`} replace />;
    }

    return (
      <Routes>
        <Route path='/login' element={user ? <Navigate to='/' replace /> : <LoginPage />} />
        <Route path='/register' element={user ? <Navigate to='/' replace /> : <RegisterPage />} />
        <Route
          path='*'
          element={!user ? (
            <Navigate to='/login' replace />
          ) : (
            <div className='min-h-screen bg-[#fdfdf7] text-[#3c4e23] dark:bg-[#1a1d16] dark:text-[#eef4e8]'>
              <Sidebar collapsed={sidebarCollapsed} isDark={darkMode} toggleTheme={() => setDarkMode((value) => !value)} />
              {!sidebarCollapsed ? <div className='fixed inset-0 z-10 bg-[#23281d]/20 md:hidden' onClick={() => setSidebarCollapsed(true)} /> : null}
              <div className={sidebarCollapsed ? 'ml-0 md:ml-20' : 'ml-0 md:ml-64'}>
                <Navbar onToggleSidebar={() => setSidebarCollapsed((value) => !value)} isDark={darkMode} toggleTheme={() => setDarkMode((value) => !value)} />
                <main className='mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8'>
                  <Routes>
                    <Route index element={isSuperAdmin ? <SuperAdminDashboard /> : isLabAdmin ? <LabAdminDashboard /> : isStoreAdmin ? <StoreManagerDashboard /> : <StudentDashboard />} />
                    <Route path='labs' element={isSuperAdmin ? <SuperAdminDashboard /> : <Navigate to='/' replace />} />
                    <Route path='inventory' element={isLabAdmin ? <LabAdminDashboard /> : <Navigate to='/' replace />} />
                    <Route path='analytics' element={isLabAdmin ? <LabAnalyticsPage /> : <Navigate to='/' replace />} />
                    <Route path='transactions' element={isLabAdmin ? <LabTransactionsPage /> : <Navigate to='/' replace />} />
                    <Route path='lab/experiments' element={isLabAdmin ? <LabExperimentsPage /> : <Navigate to='/' replace />} />
                    <Route path='lab/student-requests' element={isLabAdmin ? <LabStudentRequestsPage /> : <Navigate to='/' replace />} />
                    <Route path='lab/groups' element={isLabAdmin ? <LabGroupsPage /> : <Navigate to='/' replace />} />
                    <Route path='lab/live' element={isLabAdmin ? <LabLiveMonitorPage /> : <Navigate to='/' replace />} />
                    <Route path='lab/store-requests' element={isLabAdmin ? <LabStoreRequests /> : <Navigate to='/' replace />} />
                    <Route path='lab/history' element={isLabAdmin ? <LabHistory /> : <Navigate to='/' replace />} />
                    <Route path='lab/notifications' element={isLabAdmin ? <LabNotifications /> : <Navigate to='/' replace />} />
                    <Route path='store-dashboard' element={isStoreAdmin ? <StoreDashboard /> : <Navigate to='/' replace />} />
                    <Route path='store/dashboard' element={isStoreAdmin ? <StoreManagerDashboard /> : <Navigate to='/' replace />} />
                    <Route path='store/inventory' element={isStoreAdmin ? <StoreInventory /> : <Navigate to='/' replace />} />
                    <Route path='store/tracking' element={isStoreAdmin ? <StoreTracking /> : <Navigate to='/' replace />} />
                    <Route path='store/lowstock' element={isStoreAdmin ? <StoreAlerts /> : <Navigate to='/' replace />} />
                    <Route path='store/overview' element={isStoreAdmin ? <StoreStockOverview /> : <Navigate to='/' replace />} />
                    <Route path='store/requests' element={isStoreAdmin ? <StoreRequests /> : <Navigate to='/' replace />} />
                    <Route path='store/history' element={isStoreAdmin ? <StoreHistory /> : <Navigate to='/' replace />} />
                    <Route path='store/reports' element={isStoreAdmin ? <StoreReports /> : <Navigate to='/' replace />} />
                    <Route path='store' element={<Navigate to='/' replace />} />
                    <Route path='my-borrowings' element={isStudent ? <StudentBorrowingsPage /> : <Navigate to='/' replace />} />
                    <Route path='approval' element={isSuperAdmin ? <SuperAdminDashboard /> : <Navigate to='/' replace />} />
                    <Route path='user-credentials' element={isSuperAdmin ? <SuperAdminDashboard /> : <Navigate to='/' replace />} />
                    <Route path='master-chemicals' element={isSuperAdmin ? <SuperAdminDashboard /> : <Navigate to='/' replace />} />
                    <Route path='curriculum' element={isSuperAdmin ? <SuperAdminDashboard /> : <Navigate to='/' replace />} />
                    <Route path='store-oversight' element={isSuperAdmin ? <SuperAdminDashboard /> : <Navigate to='/' replace />} />
                    <Route path='activity' element={isSuperAdmin ? <SuperAdminDashboard /> : <Navigate to='/' replace />} />
                    <Route path='settings' element={isSuperAdmin ? <SuperAdminDashboard /> : <Navigate to='/' replace />} />
                    <Route path='labs/:id' element={isStudent ? <StudentLabDetail /> : <Navigate to='/' replace />} />
                    <Route path='student/lab/:id' element={isStudent ? <StudentLabDetail /> : <Navigate to='/' replace />} />
                    <Route path='student/subjects/:id' element={isStudent ? <StudentLabDetail /> : <Navigate to='/' replace />} />
                    <Route path='about' element={<AboutPage />} />
                    <Route path='*' element={<NotFound />} />
                  </Routes>

                  {/* Minimal Single-Line Footer Bar */}
                  <footer className="mt-10 pt-6 pb-6 border-t border-[#e4ebda] dark:border-[#38432a] text-xs font-medium text-gray-500 dark:text-gray-400 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                    <p>&copy; {new Date().getFullYear()} RasayanFlow &bull; Department of Pharmacy. All Rights Reserved.</p>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200/80 dark:border-emerald-800/40 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Live
                      </span>
                      <span>&bull;</span>
                      <span className="font-semibold text-gray-600 dark:text-gray-300">IP 2026 Compliant</span>
                      <span>&bull;</span>
                      <button onClick={() => window.location.href = '/about'} className="font-semibold text-[#556b2f] dark:text-[#c8a030] hover:underline">Support</button>
                    </div>
                  </footer>
                </main>
              </div>
              {toast && <Toast {...toast} onClose={removeToast} />}
            </div>
          )}
        />
      </Routes>
    );
  }

  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
