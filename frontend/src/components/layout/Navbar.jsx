import { useMemo, useState, useEffect } from 'react';
import { Moon, Sun, LogOut, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useAppStore from '../../store/appStore';
import useStoreManagerMock, { parsePackSize } from '../../store/storeManagerMock';
import { getUserAvatarUrl } from '../../utils/avatar';

export default function Navbar({ onToggleSidebar, isDark, toggleTheme }) {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const inventory = useAppStore((state) => state.inventory);
  const transactions = useAppStore((state) => state.transactions);
  const userName = user?.name || 'PharmLab User';
  const avatarUrl = getUserAvatarUrl(user);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const navigate = useNavigate();
  
  const chemicals = useStoreManagerMock((state) => state.chemicals);
  const alertThreshold = useStoreManagerMock((state) => state.alertThreshold);

  const storeLowStockAlerts = useMemo(() => {
    if (user?.role !== 'store-admin' && user?.role !== 'store_admin') return [];
    
    const alerts = [];
    chemicals.forEach(chem => {
      const received = Number(chem['Received Quantity'] || 0);
      const available = Number(chem['Available Quantity'] || 0);
      const packData = parsePackSize(chem['Pack Size']);
      
      const totalBase = received * packData.value;
      const availableBase = available * packData.value;
      
      if (totalBase > 0) {
        const percentage = (availableBase / totalBase) * 100;
        if (percentage < alertThreshold) {
          alerts.push({ chem, percentage });
        }
      }
    });
    
    return alerts.sort((a, b) => a.percentage - b.percentage);
  }, [chemicals, alertThreshold, user?.role]);

  const notificationsState = useAppStore((state) => state.notifications);
  const unreadNotificationCount = useAppStore((state) => state.unreadNotificationCount);
  const markNotificationAsRead = useAppStore((state) => state.markNotificationAsRead);
  const markAllNotificationsAsRead = useAppStore((state) => state.markAllNotificationsAsRead);
  const fetchUnreadNotificationCount = useAppStore((state) => state.fetchUnreadNotificationCount);
  const fetchNotifications = useAppStore((state) => state.fetchNotifications);

  useEffect(() => {
    if (user?.role === 'lab-admin') {
      fetchUnreadNotificationCount();
      // Fetch initial notifications for the dropdown
      fetchNotifications();
    }
  }, [user?.role, fetchUnreadNotificationCount, fetchNotifications]);

  const notifications = useMemo(() => {
    const lowStockItems = inventory.filter((item) => Number(item.quantity || 0) <= Number(item.minThreshold || 5));
    const pendingTransactions = transactions.filter((tx) => tx.status === 'pending');
    const recentTransactions = transactions.slice(0, 3);
    const canSeeInventoryAlerts = user?.role === 'lab-admin' || user?.role === 'super-admin';

    const items = [];

    if (canSeeInventoryAlerts && lowStockItems.length) {
      items.push({
        id: 'low-stock',
        title: 'Low stock alert',
        detail: `${lowStockItems.length} item${lowStockItems.length > 1 ? 's are' : ' is'} below threshold.`
      });
    }

    if (pendingTransactions.length) {
      items.push({
        id: 'pending',
        title: 'Pending requests',
        detail: `${pendingTransactions.length} transaction${pendingTransactions.length > 1 ? 's need' : ' needs'} attention.`
      });
    }

    recentTransactions.forEach((tx) => {
      items.push({
        id: tx.id,
        title: tx.itemName || 'Inventory update',
        detail: `${tx.type || 'transaction'} • ${tx.status || 'updated'}`
      });
    });

    return items.slice(0, 5);
  }, [inventory, transactions, user?.role]);

  return (
    <header className='sticky top-0 z-30 border-b border-[#d9e1ca] bg-[#fffef8]/92 backdrop-blur-md dark:border-[#3c452f] dark:bg-[#1c2117]/92'>
      {user?.isPreview && (
        <div className="bg-[#5c6e46] px-3 py-1.5 text-center text-xs font-semibold text-white flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[9px] uppercase tracking-wider text-emerald-200 shrink-0">Preview</span>
            <span className="truncate text-[11px] sm:text-xs">Student Mode ({user?.course || 'B.Pharm'} • Y{user?.year || 1} S{user?.semester || 1})</span>
          </div>
          <button 
            onClick={logout}
            className="flex items-center gap-1 rounded-lg bg-white/20 px-2.5 py-1 text-[11px] font-bold hover:bg-white/30 transition-colors shrink-0 whitespace-nowrap"
          >
            <LogOut size={12} /> <span className="hidden sm:inline">Exit Preview</span><span className="sm:hidden">Exit</span>
          </button>
        </div>
      )}
      <div className='mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8'>
        <div className='flex items-center gap-2 sm:gap-3 min-w-0'>
          <button className='rounded-lg p-1.5 text-[#71805a] hover:bg-[#f4f6ee] dark:text-[#c5d0b5] dark:hover:bg-[#28301f] shrink-0' onClick={onToggleSidebar}>
            <span className='sr-only'>Toggle sidebar</span>
            <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path d='M4 6h16M4 12h16M4 18h16' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' /></svg>
          </button>
          <img
            src={avatarUrl}
            alt={`${userName} avatar`}
            className='h-8 w-8 sm:h-10 sm:w-10 rounded-full border border-[#d9e1ca] bg-[#f4f5eb] object-cover dark:border-[#4e5d35] dark:bg-[#28301f] shrink-0'
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = 'https://api.dicebear.com/9.x/initials/svg?seed=PharmLab';
            }}
          />
          <div className="min-w-0 truncate">
            <p className='text-[10px] sm:text-xs font-medium text-[#8b9874] hidden xs:block'>Welcome back</p>
            <p className='text-xs sm:text-sm font-semibold text-[#3c4e23] dark:text-[#eef4e8] truncate'>{userName}</p>
          </div>
        </div>
        <div className='flex items-center gap-1.5 sm:gap-2 shrink-0'>
          <div className='relative'>
            <button
              className='rounded-lg p-1.5 sm:p-2 text-[#71805a] hover:bg-[#f4f6ee] dark:text-[#c5d0b5] dark:hover:bg-[#28301f]'
              onClick={() => setNotificationsOpen((value) => !value)}
              aria-label='Toggle notifications'
            >
              <Bell size={18} />
              {(user?.role === 'store-admin' || user?.role === 'store_admin') && storeLowStockAlerts.length > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full shadow-sm">
                  {storeLowStockAlerts.length}
                </span>
              )}
              {user?.role === 'lab-admin' && unreadNotificationCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full shadow-sm">
                  {unreadNotificationCount}
                </span>
              )}
            </button>
            {notificationsOpen ? (
              <div className='fixed left-4 right-4 top-20 z-40 max-h-[70vh] overflow-y-auto rounded-xl border border-[#d9e1ca] bg-[#fffef8] p-3 shadow-soft md:absolute md:left-auto md:right-0 md:top-12 md:w-80 dark:border-[#414a33] dark:bg-[#20251a]'>
                <p className='mb-2 text-sm font-semibold text-[#3c4e23] dark:text-[#eef4e8]'>
                  {(user?.role === 'store-admin' || user?.role === 'store_admin') ? 'Low Stock Alerts' : user?.role === 'lab-admin' ? 'Store Notifications' : 'Notifications'}
                </p>
                {(user?.role === 'store-admin' || user?.role === 'store_admin') ? (
                  storeLowStockAlerts.length > 0 ? (
                    <div className='space-y-2'>
                      {storeLowStockAlerts.slice(0, 5).map((item) => (
                        <div key={item.chem.id} className='rounded-lg bg-rose-50 px-3 py-2 border border-rose-100 dark:bg-rose-900/10 dark:border-rose-900/30 flex justify-between items-center'>
                          <p className='text-sm font-medium text-slate-800 dark:text-slate-200 truncate pr-2'>{item.chem['Chemical Name']}</p>
                          <p className='text-xs font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap'>{item.percentage === 0 ? '0%' : `${item.percentage.toFixed(1)}%`} rem {item.percentage === 0 ? '❌' : item.percentage < 5 ? '🔴' : '⚠️'}</p>
                        </div>
                      ))}
                      <button 
                        onClick={() => {
                          setNotificationsOpen(false);
                          navigate('/store/lowstock');
                        }}
                        className='w-full mt-2 rounded-lg bg-[#556b2f] px-3 py-2 text-xs font-semibold text-white hover:bg-[#6f7d45] transition-colors'
                      >
                        View All Alerts
                      </button>
                    </div>
                  ) : (
                    <p className='text-sm text-[#71805a] dark:text-[#c5d0b5]'>All stock is currently safe.</p>
                  )
                ) : user?.role === 'lab-admin' ? (
                  notificationsState.length > 0 ? (
                    <div className='space-y-2'>
                      {notificationsState.slice(0, 5).map((item) => (
                        <div key={item.id} className={`rounded-lg px-3 py-2 cursor-pointer ${item.isRead ? 'bg-[#f4f5eb] dark:bg-[#28301f]' : 'bg-[#e8efd9] dark:bg-[#313a26]'}`} onClick={() => {
                          markNotificationAsRead(item.id);
                          setNotificationsOpen(false);
                          navigate('/lab/store-requests');
                        }}>
                          <div className='flex items-start gap-2'>
                            <span className="mt-0.5">{item.type === 'approved' ? '✅' : '❌'}</span>
                            <div>
                              <p className='text-sm font-medium text-[#3c4e23] dark:text-[#eef4e8] line-clamp-2'>{item.message}</p>
                              <p className='text-[10px] mt-1 text-[#71805a] dark:text-[#c5d0b5]'>{new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => markAllNotificationsAsRead()} className='flex-1 rounded-lg border border-[#cfd8bd] bg-transparent px-3 py-2 text-xs font-semibold text-[#556b2f] hover:bg-[#f4f6ee] dark:border-[#4e5d35] dark:text-[#c5d0b5] dark:hover:bg-[#28301f] transition-colors'>Mark all read</button>
                        <button onClick={() => { setNotificationsOpen(false); navigate('/lab/notifications'); }} className='flex-1 rounded-lg bg-[#556b2f] px-3 py-2 text-xs font-semibold text-white hover:bg-[#6f7d45] transition-colors'>View All</button>
                      </div>
                    </div>
                  ) : (
                    <p className='text-sm text-[#71805a] dark:text-[#c5d0b5]'>No store notifications.</p>
                  )
                ) : (
                  notifications.length ? (
                    <div className='space-y-2'>
                      {notifications.map((item) => (
                        <div key={item.id} className='rounded-lg bg-[#f4f5eb] px-3 py-2 dark:bg-[#28301f]'>
                          <p className='text-sm font-medium text-[#3c4e23] dark:text-[#eef4e8]'>{item.title}</p>
                          <p className='text-xs text-[#71805a] dark:text-[#c5d0b5]'>{item.detail}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className='text-sm text-[#71805a] dark:text-[#c5d0b5]'>No new notifications.</p>
                  )
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
