import { useState, useMemo, useEffect } from 'react';
import { Bell, CheckCircle2, XCircle, AlertTriangle, UserCheck, Check, ChevronRight } from 'lucide-react';
import useAppStore from '../store/appStore';

const formatTimeAgo = (date) => {
  if (!date) return 'Recently';
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + ' years ago';
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' months ago';
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' days ago';
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' hours ago';
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' minutes ago';
  return Math.max(1, Math.floor(seconds)) + ' seconds ago';
};

export default function LabNotifications() {
  const notifications = useAppStore((state) => state.notifications);
  const fetchNotifications = useAppStore((state) => state.fetchNotifications);
  const markNotificationAsRead = useAppStore((state) => state.markNotificationAsRead);
  const markAllNotificationsAsRead = useAppStore((state) => state.markAllNotificationsAsRead);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);
  
  const filteredNotifications = useMemo(() => {
    return (notifications || []).filter(n => {
      if (filter === 'Unread') return !n.isRead;
      if (filter === 'Read') return n.isRead;
      return true;
    });
  }, [notifications, filter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#e4eed3] pb-4 dark:border-[#2e3722]">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#87996c] dark:text-[#7a8f62]">
            <span>Pharma Laboratory</span>
            <ChevronRight size={12} />
            <span className="text-[#5c6e46] dark:text-[#a8be8a] font-bold">Activity Feed</span>
          </div>
          <h1 className="text-2xl font-black text-[#37412a] dark:text-[#e4e9d8] mt-0.5 flex items-center gap-2">
            <Bell size={24} className="text-[#5c6e46]" /> System Notifications
          </h1>
          <p className="text-[#71805a] dark:text-[#c5d0b5] text-xs font-semibold">
            Real-time store approvals, student borrow requisitions, and low-stock alerts
          </p>
        </div>

        <button 
          onClick={markAllNotificationsAsRead}
          disabled={!notifications?.length || notifications.every(n => n.isRead)}
          className="flex items-center gap-2 bg-[#5c6e46] text-white px-4 py-2 rounded-xl text-xs font-extrabold hover:bg-[#475735] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
        >
          <Check size={16} /> Mark All as Read
        </button>
      </div>

      {/* Main Container Card */}
      <div className="bg-[#fffef8] dark:bg-[#1a1d16] border border-[#d9e1ca] dark:border-[#414a33] rounded-xl shadow-2xs overflow-hidden">
        {/* Filter Tabs */}
        <div className="p-3 border-b border-[#e4eed3] dark:border-[#2e3722] flex items-center gap-2 bg-[#f4f6ee] dark:bg-[#20251a]">
          {['All', 'Unread', 'Read'].map((f) => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all border ${
                filter === f 
                  ? 'bg-[#5c6e46] text-white border-[#5c6e46] dark:bg-[#e4e9d8] dark:text-[#20251a]' 
                  : 'bg-white text-[#5c6e46] border-[#cfd8bd] hover:bg-[#e8efd9] dark:bg-[#1a1d16] dark:text-[#a8be8a] dark:border-[#414a33]'
              }`}
            >
              {f} ({
                f === 'All' ? notifications.length :
                f === 'Unread' ? notifications.filter(n => !n.isRead).length :
                notifications.filter(n => n.isRead).length
              })
            </button>
          ))}
        </div>

        {/* Notifications Feed List */}
        <div className="divide-y divide-[#e4eed3] dark:divide-[#2e3722]">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notif) => {
              const isApproved = notif.type === 'request_approved';
              const isStudentReq = notif.type === 'student_request';
              const isLowStock = notif.title?.includes('Low Stock') || notif.type === 'low_stock';

              return (
                <div 
                  key={notif._id || notif.id} 
                  className={`p-4 flex items-start gap-4 transition-colors ${
                    notif.isRead ? 'bg-[#fffef8] dark:bg-[#1a1d16]' : 'bg-[#f4f6ee]/70 dark:bg-[#20251a]'
                  }`}
                >
                  <div className={`p-2.5 rounded-lg shrink-0 ${
                    isApproved ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                    isStudentReq ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                    isLowStock ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' :
                    'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                  }`}>
                    {isApproved ? <CheckCircle2 size={18} /> :
                     isStudentReq ? <UserCheck size={18} /> :
                     isLowStock ? <AlertTriangle size={18} /> :
                     <XCircle size={18} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <div className="font-extrabold text-sm text-[#37412a] dark:text-[#e4e9d8] flex items-center gap-2">
                        <span>{notif.title || (isApproved ? 'Request Approved' : isStudentReq ? 'Student Request' : 'System Alert')}</span>
                        {!notif.isRead && (
                          <span className="px-2 py-0.2 text-[10px] font-black bg-[#5c6e46] text-white rounded">NEW</span>
                        )}
                      </div>
                      <span className="text-[11px] font-semibold text-[#71805a] shrink-0">
                        {formatTimeAgo(notif.createdAt)}
                      </span>
                    </div>

                    <p className={`mt-1 text-xs font-semibold ${notif.isRead ? 'text-[#71805a] dark:text-[#a5b48b]' : 'text-[#37412a] dark:text-[#e4e9d8]'}`}>
                      {notif.message}
                    </p>

                    {notif.receiptNumber && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white dark:bg-[#20251a] border border-[#cfd8bd] dark:border-[#414a33] text-[11px] font-mono font-extrabold text-[#5c6e46] dark:text-[#a8be8a]">
                        Receipt: <span>{notif.receiptNumber}</span>
                      </div>
                    )}
                    
                    {!notif.isRead && (
                      <div className="mt-2.5">
                        <button 
                          onClick={() => markNotificationAsRead(notif._id || notif.id)}
                          className="text-xs font-extrabold text-[#5c6e46] hover:underline dark:text-[#a8be8a]"
                        >
                          Mark as Read
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 flex flex-col items-center justify-center text-center space-y-2">
              <div className="bg-[#f4f6ee] dark:bg-[#20251a] p-4 rounded-xl text-[#5c6e46]">
                <Bell size={32} />
              </div>
              <h3 className="text-base font-extrabold text-[#37412a] dark:text-[#e4e9d8]">No Notifications Found</h3>
              <p className="text-xs font-semibold text-[#71805a]">
                You're all caught up! No {filter.toLowerCase()} notifications found.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
