import { useState, useMemo, useEffect } from 'react';
import { Bell, CheckCircle2, XCircle, Trash2, Check, Filter } from 'lucide-react';
import api from '../services/api';
import socket from '../services/socket';
import useAppStore from '../store/appStore';

const formatTimeAgo = (date) => {
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
  return Math.floor(seconds) + ' seconds ago';
};

export default function LabNotifications() {
  const notifications = useAppStore((state) => state.notifications);
  const fetchNotifications = useAppStore((state) => state.fetchNotifications);
  const markNotificationAsRead = useAppStore((state) => state.markNotificationAsRead);
  const markAllNotificationsAsRead = useAppStore((state) => state.markAllNotificationsAsRead);
  const setToast = useAppStore((state) => state.setToast);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);
  
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (filter === 'Unread') return !n.isRead;
      if (filter === 'Read') return n.isRead;
      return true;
    });
  }, [notifications, filter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#3c4e23] dark:text-[#eef4e8] flex items-center gap-2">
            <Bell size={24} className="text-[#556b2f] dark:text-[#8b9874]" /> Notifications
          </h1>
          <p className="text-[#71805a] dark:text-[#c5d0b5] text-sm mt-1">Updates on your store requests and inventory</p>
        </div>
        <button 
          onClick={markAllNotificationsAsRead}
          disabled={notifications.every(n => n.isRead)}
          className="flex items-center gap-2 bg-[#f4f5eb] text-[#556b2f] border border-[#cfd8bd] px-4 py-2 rounded-lg hover:bg-[#e8efd9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:bg-[#28301f] dark:border-[#4e5d35] dark:text-[#c5d0b5] dark:hover:bg-[#313a26]"
        >
          <Check size={18} /> Mark all as read
        </button>
      </div>

      <div className="bg-[#fffef8] dark:bg-[#1c2117] border border-[#d9e1ca] dark:border-[#3c452f] rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#d9e1ca] dark:border-[#3c452f] flex gap-2 bg-[#fdfdf7] dark:bg-[#1a1d16]">
          {['All', 'Unread', 'Read'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-[#556b2f] text-white' : 'bg-transparent text-[#71805a] hover:bg-[#f4f5eb] dark:text-[#c5d0b5] dark:hover:bg-[#28301f]'}`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="divide-y divide-[#d9e1ca] dark:divide-[#3c452f]">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notif) => (
              <div 
                key={notif.id} 
                className={`p-4 flex items-start gap-4 transition-colors ${notif.isRead ? 'bg-[#fffef8] dark:bg-[#1c2117]' : 'bg-[#f4f6ee] dark:bg-[#232a1a]'}`}
              >
                <div className={`p-2 rounded-full mt-1 ${notif.type === 'request_approved' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                  {notif.type === 'request_approved' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <p className={`text-base font-medium ${notif.isRead ? 'text-[#4e5d35] dark:text-[#c5d0b5]' : 'text-[#2e3d19] dark:text-[#eef4e8]'}`}>
                      {notif.type === 'request_approved' ? 'Request Approved' : 'Request Rejected'}
                    </p>
                    <span className="text-xs text-[#8b9874] dark:text-[#a8be8a]">
                      {formatTimeAgo(notif.createdAt)}
                    </span>
                  </div>
                  <p className={`mt-1 text-sm ${notif.isRead ? 'text-[#71805a] dark:text-[#8b9874]' : 'text-[#4e5d35] dark:text-[#c5d0b5]'}`}>
                    {notif.message}
                  </p>
                  {notif.receiptNumber && (
                    <p className="mt-1 text-xs font-mono text-[#8b9874] dark:text-[#a8be8a]">
                      Receipt: {notif.receiptNumber}
                    </p>
                  )}
                  
                  {!notif.isRead && (
                    <button 
                      onClick={() => markNotificationAsRead(notif._id)}
                      className="mt-3 text-xs font-semibold text-[#556b2f] hover:text-[#3c4e23] dark:text-[#8b9874] dark:hover:text-[#c5d0b5] transition-colors"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <div className="bg-[#f4f5eb] p-4 rounded-full text-[#a3b18a] mb-4 dark:bg-[#28301f] dark:text-[#4e5d35]">
                <Bell size={32} />
              </div>
              <p className="text-lg font-medium text-[#3c4e23] dark:text-[#eef4e8]">No notifications</p>
              <p className="text-sm text-[#71805a] mt-1 dark:text-[#8b9874]">You're all caught up! No {filter.toLowerCase()} notifications found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
