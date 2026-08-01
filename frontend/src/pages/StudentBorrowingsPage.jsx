import React, { useEffect, useState, useMemo } from 'react';
import { 
  PackageCheck, 
  TestTube2, 
  Clock3, 
  Search,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';

export default function StudentBorrowingsPage() {
  const { 
    transactions, 
    storeAllotments, 
    fetchTransactions, 
    fetchStoreAllotments 
  } = useAppStore();
  const user = useAuthStore((state) => state.user);

  const [activeTab, setActiveTab] = useState('lab');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    fetchTransactions();
    fetchStoreAllotments();
  }, [fetchTransactions, fetchStoreAllotments]);

  // Derived metrics
  const now = new Date();

  // Lab Borrowings stats
  const labTransactions = useMemo(() => transactions.filter(t => t.type === 'borrow'), [transactions]);
  const activeLabBorrowings = useMemo(() => labTransactions.filter(t => t.status === 'approved'), [labTransactions]);
  
  // Store issues
  const approvedAllotments = useMemo(() => storeAllotments.filter(a => a.status === 'approved'), [storeAllotments]);

  // Pending
  const pendingTransactions = useMemo(() => labTransactions.filter(t => t.status === 'pending'), [labTransactions]);
  const pendingAllotments = useMemo(() => storeAllotments.filter(a => a.status === 'pending'), [storeAllotments]);
  const totalPending = pendingTransactions.length + pendingAllotments.length;

  // Overdue
  const overdueTransactions = useMemo(() => activeLabBorrowings.filter(t => t.neededUntil && new Date(t.neededUntil) < now), [activeLabBorrowings, now]);
  const overdueAllotments = useMemo(() => approvedAllotments.filter(a => a.dueDate && new Date(a.dueDate) < now), [approvedAllotments, now]);
  const totalOverdue = overdueTransactions.length + overdueAllotments.length;

  // Filtered data
  const filteredLabTransactions = useMemo(() => {
    return labTransactions.filter(t => {
      const matchesSearch = (t.itemName || t.experimentTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (t.teamName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (t.purpose || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All' || t.status?.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [labTransactions, searchQuery, statusFilter]);

  const filteredStoreAllotments = useMemo(() => {
    return storeAllotments.filter(a => {
      const matchesSearch = (a.itemName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (a.purpose || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All' || a.status?.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [storeAllotments, searchQuery, statusFilter]);

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400"><CheckCircle2 className="w-3 h-3" /> Approved</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"><Clock className="w-3 h-3" /> Pending</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-400"><XCircle className="w-3 h-3" /> Rejected</span>;
      case 'completed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"><CheckCircle2 className="w-3 h-3" /> Completed</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">{status}</span>;
    }
  };

  const isOverdue = (dateStr, status) => {
    if (status !== 'approved') return false;
    if (!dateStr) return false;
    return new Date(dateStr) < now;
  };

  const renderFilterPills = () => {
    const statuses = ['All', 'Pending', 'Approved', 'Completed', 'Rejected'];
    return (
      <div className="flex gap-2 overflow-x-auto pb-1">
        {statuses.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              statusFilter === s 
                ? 'bg-[#556b2f] text-white shadow-sm' 
                : 'bg-[#f4f6ee] text-[#71805a] hover:bg-[#e8ece1] dark:bg-[#20251a] dark:text-[#a5b48b] dark:hover:bg-[#28301f]'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-10 animate-in fade-in">
      <div>
        <h2 className="text-2xl font-bold text-[#37412a] dark:text-[#e4e9d8]">My Activity & Borrowings</h2>
        <p className="text-sm text-[#71805a] dark:text-[#a5b48b]">Track your lab requests, borrowings, and central store allotments</p>
      </div>

      {/* Stat Cards - 2x2 grid on mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card title="Lab Borrowings" subtitle="Active approved requests">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4f6ee] dark:bg-[#20251a]">
              <PackageCheck size={24} className="text-[#5c6e46] dark:text-[#a5b48b]" />
            </div>
            <p className="text-3xl font-bold text-[#37412a] dark:text-[#e4e9d8]">{activeLabBorrowings.length}</p>
          </div>
        </Card>

        <Card title="Store Issues" subtitle="Approved central store items">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/30">
              <TestTube2 size={24} className="text-emerald-600 dark:text-emerald-500" />
            </div>
            <p className="text-3xl font-bold text-[#37412a] dark:text-[#e4e9d8]">{approvedAllotments.length}</p>
          </div>
        </Card>

        <Card title="Pending Requests" subtitle="Awaiting admin approval">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/30">
              <Clock3 size={24} className="text-amber-600 dark:text-amber-500" />
            </div>
            <p className="text-3xl font-bold text-[#37412a] dark:text-[#e4e9d8]">{totalPending}</p>
          </div>
        </Card>

        <Card title="Overdue Returns" subtitle="Past return deadline">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/30">
              <AlertCircle size={24} className="text-rose-600 dark:text-rose-500" />
            </div>
            <p className="text-3xl font-bold text-[#37412a] dark:text-[#e4e9d8]">{totalOverdue}</p>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#d9e1ca] dark:border-[#414a33]">
        <button
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'lab'
              ? 'border-[#556b2f] text-[#556b2f] dark:border-[#87996c] dark:text-[#eef4e8]'
              : 'border-transparent text-[#71805a] hover:text-[#37412a] dark:text-[#a5b48b] dark:hover:text-[#eef4e8]'
          }`}
          onClick={() => {
            setActiveTab('lab');
            setStatusFilter('All');
            setSearchQuery('');
          }}
        >
          Lab Borrowings ({labTransactions.length})
        </button>
        <button
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'store'
              ? 'border-[#556b2f] text-[#556b2f] dark:border-[#87996c] dark:text-[#eef4e8]'
              : 'border-transparent text-[#71805a] hover:text-[#37412a] dark:text-[#a5b48b] dark:hover:text-[#eef4e8]'
          }`}
          onClick={() => {
            setActiveTab('store');
            setStatusFilter('All');
            setSearchQuery('');
          }}
        >
          Store Allotments ({storeAllotments.length})
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#87996c]" />
          <input 
            type="text"
            placeholder="Search items, teams, purposes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-[#d9e1ca] bg-white py-2 pl-9 pr-4 text-sm text-[#37412a] outline-none focus:border-[#5c6e46] focus:ring-1 focus:ring-[#5c6e46] dark:border-[#414a33] dark:bg-[#20251a] dark:text-[#e4e9d8]"
          />
        </div>
        {renderFilterPills()}
      </div>

      {/* Tables */}
      <Card className="overflow-hidden border border-[#d9e1ca] bg-white dark:border-[#414a33] dark:bg-[#1a1d16]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-[#f4f6ee] text-[#5c6e46] dark:bg-[#20251a] dark:text-[#a5b48b]">
              {activeTab === 'lab' ? (
                <tr>
                  <th className="px-6 py-3">Item / Experiment</th>
                  <th className="px-6 py-3">Team</th>
                  <th className="px-6 py-3">Quantity</th>
                  <th className="px-6 py-3">Purpose</th>
                  <th className="px-6 py-3">Need By</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              ) : (
                <tr>
                  <th className="px-6 py-3">Item</th>
                  <th className="px-6 py-3">Quantity</th>
                  <th className="px-6 py-3">Purpose</th>
                  <th className="px-6 py-3">Return Before</th>
                  <th className="px-6 py-3">Notes</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-[#e8ece1] dark:divide-[#2a3121]">
              {activeTab === 'lab' ? (
                filteredLabTransactions.length > 0 ? (
                  filteredLabTransactions.map(t => {
                    const overdue = isOverdue(t.neededUntil, t.status);
                    return (
                      <tr key={t._id || t.id} className={`hover:bg-[#fdfdf7] dark:hover:bg-[#20251a] transition-colors ${
                        overdue ? 'bg-rose-50/50 dark:bg-rose-950/20 border-l-4 border-l-rose-500' : 'border-l-4 border-l-transparent'
                      }`}>
                        <td className="px-6 py-4 font-semibold text-[#37412a] dark:text-[#e4e9d8] whitespace-nowrap">
                          {overdue && <AlertCircle className="inline-block w-4 h-4 text-rose-500 mr-2 mb-0.5" />}
                          {t.experimentTitle || t.itemName || 'Item Request'}
                        </td>
                        <td className="px-6 py-4 text-[#71805a] dark:text-[#a5b48b]">{t.teamName || '—'}</td>
                        <td className="px-6 py-4 text-[#71805a] dark:text-[#a5b48b]">
                          {t.requestCategory === 'experiment' ? `${t.memberCount || 1} members` : `${t.quantity} ${t.itemId?.quantityUnit || ''}`}
                        </td>
                        <td className="px-6 py-4 text-[#71805a] dark:text-[#a5b48b] max-w-xs truncate" title={t.purpose}>
                          {t.purpose || '—'}
                        </td>
                        <td className="px-6 py-4 text-[#71805a] dark:text-[#a5b48b]">
                          {t.neededUntil ? new Date(t.neededUntil).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(t.status)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-[#71805a] dark:text-[#a5b48b]">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <PackageCheck className="w-8 h-8 text-[#87996c]" />
                        <p>No lab borrowings found matching criteria.</p>
                      </div>
                    </td>
                  </tr>
                )
              ) : (
                filteredStoreAllotments.length > 0 ? (
                  filteredStoreAllotments.map(a => {
                    const overdue = isOverdue(a.dueDate, a.status);
                    return (
                      <tr key={a._id || a.id} className={`hover:bg-[#fdfdf7] dark:hover:bg-[#20251a] transition-colors ${
                        overdue ? 'bg-rose-50/50 dark:bg-rose-950/20 border-l-4 border-l-rose-500' : 'border-l-4 border-l-transparent'
                      }`}>
                        <td className="px-6 py-4 font-semibold text-[#37412a] dark:text-[#e4e9d8] whitespace-nowrap">
                          {overdue && <AlertCircle className="inline-block w-4 h-4 text-rose-500 mr-2 mb-0.5" />}
                          {a.itemName}
                        </td>
                        <td className="px-6 py-4 text-[#71805a] dark:text-[#a5b48b]">
                          {a.quantity} {a.quantityUnit}
                        </td>
                        <td className="px-6 py-4 text-[#71805a] dark:text-[#a5b48b] max-w-xs truncate" title={a.purpose}>
                          {a.purpose || '—'}
                        </td>
                        <td className="px-6 py-4 text-[#71805a] dark:text-[#a5b48b]">
                          {a.dueDate ? new Date(a.dueDate).toLocaleDateString() : 'No limit'}
                        </td>
                        <td className="px-6 py-4 text-[#71805a] dark:text-[#a5b48b] max-w-xs truncate" title={a.notes || a.requestNotes}>
                          {a.notes || a.requestNotes || '—'}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(a.status)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-[#71805a] dark:text-[#a5b48b]">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <TestTube2 className="w-8 h-8 text-[#87996c]" />
                        <p>No store allotments found matching criteria.</p>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
