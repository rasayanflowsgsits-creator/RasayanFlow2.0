import { useState, useEffect, useRef, useMemo } from 'react';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import socket from '../services/socket';
import {
  Radio, Users, Clock, Download, Send, Activity,
  MapPin, FlaskConical, AlertTriangle, UserCheck
} from 'lucide-react';

function formatDuration(ms) {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

function getStatusColor(status) {
  if (status === 'active') return 'bg-emerald-400';
  if (status === 'idle') return 'bg-amber-400';
  return 'bg-slate-400';
}

const AVATAR_COLORS = [
  'bg-[#556b2f]', 'bg-[#c8a030]', 'bg-[#4a7c59]', 'bg-[#6b4226]',
  'bg-[#2a4a6b]', 'bg-[#6b2a4a]', 'bg-[#4a6b2a]', 'bg-[#8b6914]',
];

export default function LabLiveMonitorPage() {
  const user = useAuthStore((s) => s.user);
  const store = useAppStore();
  const [time, setTime] = useState(new Date());
  const [activeSessions, setActiveSessions] = useState([]);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const LAB_CAPACITY = 30;
  const timerRef = useRef(null);

  // Live clock
  useEffect(() => {
    timerRef.current = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // Heartbeat checker — mark idle if no heartbeat in 5 min
  useEffect(() => {
    const checker = setInterval(() => {
      const now = Date.now();
      setActiveSessions((prev) =>
        prev.map((s) => {
          const sinceHeartbeat = now - new Date(s.lastHeartbeat).getTime();
          if (sinceHeartbeat > 10 * 60 * 1000) return { ...s, status: 'offline' };
          if (sinceHeartbeat > 5 * 60 * 1000) return { ...s, status: 'idle' };
          return { ...s, status: 'active' };
        }).filter((s) => s.status !== 'offline')
      );
    }, 30000);
    return () => clearInterval(checker);
  }, []);

  // Socket listeners
  useEffect(() => {
    const handleCheckin = (data) => {
      setActiveSessions((prev) => {
        const exists = prev.find((s) => s.studentId === data.studentId);
        if (exists) {
          return prev.map((s) =>
            s.studentId === data.studentId
              ? { ...s, status: 'active', lastHeartbeat: new Date(), currentExperiment: data.currentExperiment }
              : s
          );
        }
        return [
          ...prev,
          {
            studentId: data.studentId,
            name: data.name || 'Unknown',
            rollNumber: data.rollNumber || '—',
            group: data.group || '—',
            checkInTime: new Date(),
            lastHeartbeat: new Date(),
            currentExperiment: data.currentExperiment || null,
            status: 'active',
          },
        ];
      });
    };

    const handleHeartbeat = (data) => {
      setActiveSessions((prev) =>
        prev.map((s) =>
          s.studentId === data.studentId
            ? { ...s, lastHeartbeat: new Date(), status: 'active', currentExperiment: data.currentExperiment || s.currentExperiment }
            : s
        )
      );
    };

    const handleCheckout = (data) => {
      setActiveSessions((prev) => prev.filter((s) => s.studentId !== data.studentId));
    };

    socket.on('student:checkin', handleCheckin);
    socket.on('student:heartbeat', handleHeartbeat);
    socket.on('student:checkout', handleCheckout);

    return () => {
      socket.off('student:checkin', handleCheckin);
      socket.off('student:heartbeat', handleHeartbeat);
      socket.off('student:checkout', handleCheckout);
    };
  }, []);

  // Derive today's activity from store
  const todayRequests = useMemo(() => {
    const today = new Date();
    return (store.studentRequests || []).filter((r) => {
      const d = r.requestedAt ? new Date(r.requestedAt) : null;
      return d && d.toDateString() === today.toDateString();
    });
  }, [store.studentRequests]);

  const uniqueStudentsToday = useMemo(() => {
    const ids = new Set(todayRequests.map((r) => r.studentId || r.rollNumber));
    return ids.size;
  }, [todayRequests]);

  // Download attendance CSV
  const downloadAttendance = () => {
    const rows = [
      ['Name', 'Roll Number', 'Group', 'Check-In Time', 'Status', 'Current Experiment'].join(','),
      ...activeSessions.map((s) =>
        [
          s.name,
          s.rollNumber,
          s.group,
          new Date(s.checkInTime).toLocaleTimeString(),
          s.status,
          s.currentExperiment || '—',
        ].join(',')
      ),
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${new Date().toLocaleDateString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBroadcast = () => {
    if (!broadcastMsg.trim()) return;
    socket.emit('lab:broadcast', { message: broadcastMsg, labId: store.labs[0]?.id });
    store.setToast({ type: 'success', message: 'Message broadcast to all active students!' });
    setBroadcastMsg('');
  };

  const activeCount = activeSessions.filter((s) => s.status === 'active').length;
  const idleCount = activeSessions.filter((s) => s.status === 'idle').length;
  const occupancy = Math.min(100, Math.round((activeSessions.length / LAB_CAPACITY) * 100));
  const occupancyColor = occupancy > 85 ? 'bg-red-500' : occupancy > 60 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-2xl font-bold text-[#3c4e23] dark:text-[#eef4e8]">Live Lab Monitor</h2>
          </div>
          <p className="text-sm text-[#71805a] dark:text-[#c5d0b5]">
            Real-time student presence & activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-xl border border-[#cfd8bd] dark:border-[#4e5d35] bg-[#f6f8f0] dark:bg-[#1c2117] px-4 py-2 text-sm font-mono text-[#556b2f] dark:text-[#a5b48b]">
            {time.toLocaleTimeString()}
          </div>
          <button
            onClick={downloadAttendance}
            className="flex items-center gap-1.5 rounded-xl border border-[#cfd8bd] dark:border-[#4e5d35] px-3 py-2 text-sm font-medium text-[#556b2f] hover:bg-[#f0f4e8] dark:text-[#a5b48b] transition"
          >
            <Download size={15} />
            Take Attendance
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 rounded-2xl bg-[#f0f9f4] dark:bg-[#1a2a1f] border border-[#b8d8c0] dark:border-[#2a4a35] p-4 text-sm text-[#2d5a3d] dark:text-[#7dbf94]">
        <Radio size={18} className="flex-shrink-0 mt-0.5" />
        <div>
          <strong>How it works:</strong> Students who open the lab detail page are automatically tracked here.
          Their status updates in real-time via WebSocket. <strong>Green</strong> = active in last 5 min,
          <strong> Yellow</strong> = idle 5–10 min, <strong>Grey</strong> = left.
        </div>
      </div>

      {/* Capacity & Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#d9e1ca] dark:border-[#3c452f] bg-white dark:bg-[#1a1d16] p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-[#87996c] mb-1"><Activity size={14} /> Active Now</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{activeCount}</div>
          <div className="text-xs text-[#87996c]">of {LAB_CAPACITY} capacity</div>
        </div>
        <div className="rounded-2xl border border-[#d9e1ca] dark:border-[#3c452f] bg-white dark:bg-[#1a1d16] p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-[#87996c] mb-1"><Users size={14} /> Idle</div>
          <div className="text-2xl font-bold text-amber-500">{idleCount}</div>
          <div className="text-xs text-[#87996c]">no heartbeat 5+ min</div>
        </div>
        <div className="rounded-2xl border border-[#d9e1ca] dark:border-[#3c452f] bg-white dark:bg-[#1a1d16] p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-[#87996c] mb-1"><UserCheck size={14} /> Today's Activity</div>
          <div className="text-2xl font-bold text-[#556b2f] dark:text-[#a5b48b]">{uniqueStudentsToday}</div>
          <div className="text-xs text-[#87996c]">unique students requested</div>
        </div>
        <div className="rounded-2xl border border-[#d9e1ca] dark:border-[#3c452f] bg-white dark:bg-[#1a1d16] p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-[#87996c] mb-1"><MapPin size={14} /> Occupancy</div>
          <div className="text-2xl font-bold text-[#3c4e23] dark:text-[#eef4e8]">{occupancy}%</div>
          <div className="w-full h-1.5 rounded-full bg-[#e8efd9] dark:bg-[#2e3d19] mt-2">
            <div className={`h-1.5 rounded-full ${occupancyColor} transition-all`} style={{ width: `${occupancy}%` }} />
          </div>
        </div>
      </div>

      {/* Student Presence Grid */}
      {activeSessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#cfd8bd] bg-[#fdfdf7] py-20 text-center dark:border-[#4e5d35] dark:bg-[#1a1d16]">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f4f5eb] dark:bg-[#28301f]">
            <Radio size={28} className="text-[#87996c]" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-[#3c4e23] dark:text-[#eef4e8]">No Students Online</h3>
          <p className="max-w-sm text-sm text-[#71805a] dark:text-[#c5d0b5]">
            When students open their lab page, they will appear here automatically.
            Their activity and session time will be tracked in real-time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {activeSessions.map((session, idx) => {
            const duration = Date.now() - new Date(session.checkInTime).getTime();
            return (
              <div
                key={session.studentId}
                className={`relative rounded-2xl border p-4 bg-white dark:bg-[#1a1d16] transition hover:shadow-md ${
                  session.status === 'active'
                    ? 'border-emerald-200 dark:border-emerald-900/40'
                    : session.status === 'idle'
                    ? 'border-amber-200 dark:border-amber-900/40'
                    : 'border-[#d9e1ca] dark:border-[#3c452f]'
                }`}
              >
                {/* Status dot */}
                <div className={`absolute top-3 right-3 h-2.5 w-2.5 rounded-full ${getStatusColor(session.status)} ${session.status === 'active' ? 'animate-pulse' : ''}`} />

                {/* Avatar */}
                <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm mb-3 ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                  {session.name.charAt(0).toUpperCase()}
                </div>

                <div className="font-semibold text-[#2e3d19] dark:text-[#eef4e8] text-sm truncate">{session.name}</div>
                <div className="text-xs text-[#87996c] mb-2">{session.rollNumber}</div>

                {session.group && session.group !== '—' && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f0f4e8] dark:bg-[#28301f] text-xs text-[#556b2f] dark:text-[#a5b48b] mb-2">
                    <Users size={10} /> {session.group}
                  </div>
                )}

                {session.currentExperiment && (
                  <div className="flex items-center gap-1 text-xs text-[#71805a] dark:text-[#c5d0b5] truncate">
                    <FlaskConical size={11} className="flex-shrink-0" />
                    <span className="truncate">{session.currentExperiment}</span>
                  </div>
                )}

                <div className="flex items-center gap-1 text-xs text-[#87996c] mt-2">
                  <Clock size={11} /> {formatDuration(duration)}
                </div>

                <div className={`mt-2 text-xs font-medium ${
                  session.status === 'active' ? 'text-emerald-600 dark:text-emerald-400' :
                  session.status === 'idle' ? 'text-amber-600 dark:text-amber-400' :
                  'text-slate-500'
                }`}>
                  {session.status === 'active' ? '🟢 Active' : session.status === 'idle' ? '🟡 Idle' : '⚫ Offline'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Broadcast Message */}
      <div className="rounded-2xl border border-[#d9e1ca] dark:border-[#3c452f] bg-white dark:bg-[#1a1d16] p-4">
        <h3 className="font-semibold text-[#2e3d19] dark:text-[#eef4e8] mb-3 flex items-center gap-2">
          <Send size={16} className="text-[#556b2f]" />
          Broadcast Message to All Active Students
        </h3>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Type a message to broadcast... (e.g. 'Lab closing in 15 minutes')"
            value={broadcastMsg}
            onChange={(e) => setBroadcastMsg(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleBroadcast()}
            className="flex-1 rounded-xl border border-[#cfd8bd] bg-[#fafbf5] px-4 py-2.5 text-sm text-[#2e3d19] outline-none focus:ring-2 focus:ring-[#6f7d45] dark:border-[#4e5d35] dark:bg-[#1c2117] dark:text-[#eef4e8]"
          />
          <button
            onClick={handleBroadcast}
            disabled={!broadcastMsg.trim()}
            className="flex items-center gap-2 rounded-xl bg-[#556b2f] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#4a5f28] disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Send size={15} />
            Send
          </button>
        </div>
      </div>

      {/* Today's Requests Summary */}
      {todayRequests.length > 0 && (
        <div className="rounded-2xl border border-[#d9e1ca] dark:border-[#3c452f] bg-white dark:bg-[#1a1d16] p-4">
          <h3 className="font-semibold text-[#2e3d19] dark:text-[#eef4e8] mb-3 flex items-center gap-2">
            <Activity size={16} className="text-[#556b2f]" />
            Today's Lab Activity ({new Date().toLocaleDateString()})
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-[#556b2f] dark:text-[#a5b48b]">{todayRequests.length}</div>
              <div className="text-xs text-[#87996c]">Total Requests</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {todayRequests.filter((r) => r.overallStatus === 'Approved').length}
              </div>
              <div className="text-xs text-[#87996c]">Approved</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {todayRequests.filter((r) => r.overallStatus === 'Pending').length}
              </div>
              <div className="text-xs text-[#87996c]">Pending</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
