import React, { useEffect, useMemo, useState } from 'react';
import { 
  CheckCircle2, Clock, XCircle, RefreshCw, Search, Filter, 
  ChevronRight, Building2, Layers, Download, Check, X, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Table from '../components/ui/Table';

export default function LabTransactionsPage() {
  const user = useAuthStore(state => state.user);
  const store = useAppStore();

  const [selectedLabId, setSelectedLabId] = useState(() => localStorage.getItem('pharmlab-active-lab') || '');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'pending', 'approved', 'rejected'
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  // Assigned labs
  const assignedLabs = useMemo(() => {
    const currentUserId = String(user?.id || user?._id || '');
    const currentUserEmail = (user?.email || '').toLowerCase();
    const currentUserLabId = String(user?.labId?._id || user?.labId || '');
    return (store.labs || []).filter(lab => {
      const labIdStr = String(lab.id || lab._id || '');
      const isDirectAdmin = Array.isArray(lab.admins) && lab.admins.some(admin => {
        const adminIdStr = String(admin.id || admin._id || admin);
        const adminEmailStr = (admin.email || '').toLowerCase();
        return (adminIdStr && adminIdStr === currentUserId) || (adminEmailStr && adminEmailStr === currentUserEmail);
      });
      const matchesUserLabId = Boolean(currentUserLabId && currentUserLabId === labIdStr);
      return isDirectAdmin || matchesUserLabId;
    });
  }, [store.labs, user]);

  useEffect(() => {
    store.fetchLabs();
  }, []);

  useEffect(() => {
    if (!assignedLabs.length) return;
    const validSelection = assignedLabs.some((lab) => String(lab.id || lab._id) === String(selectedLabId));
    if (!selectedLabId || !validSelection) {
      const nextLabId = String(assignedLabs[0].id || assignedLabs[0]._id);
      setSelectedLabId(nextLabId);
      localStorage.setItem('pharmlab-active-lab', nextLabId);
    }
  }, [assignedLabs, selectedLabId]);

  const activeLab = assignedLabs.find((lab) => String(lab.id || lab._id) === String(selectedLabId)) || assignedLabs[0] || (store.labs || [])[0];
  const labId = activeLab?.id || activeLab?._id || '';

  // Fetch transactions for active lab
  useEffect(() => {
    if (labId) {
      store.fetchTransactions({ labId });
    }
  }, [labId]);

  const rawTransactions = store.transactions || [];

  // Filtered transactions for active lab
  const labTransactions = useMemo(() => {
    if (!labId) return rawTransactions;
    return rawTransactions.filter(tx => {
      const txLabId = String(tx.labId?._id || tx.labId || '');
      return !txLabId || txLabId === String(labId);
    });
  }, [rawTransactions, labId]);

  // Derived metrics
  const totalCount = labTransactions.length;
  const pendingCount = useMemo(() => labTransactions.filter(t => t.status === 'pending').length, [labTransactions]);
  const approvedCount = useMemo(() => labTransactions.filter(t => t.status === 'approved' || t.status === 'completed').length, [labTransactions]);
  const rejectedCount = useMemo(() => labTransactions.filter(t => t.status === 'rejected').length, [labTransactions]);

  // Search & Tab Filter
  const filteredTransactions = useMemo(() => {
    return labTransactions.filter(tx => {
      // Tab filter
      if (activeTab === 'pending' && tx.status !== 'pending') return false;
      if (activeTab === 'approved' && tx.status !== 'approved' && tx.status !== 'completed') return false;
      if (activeTab === 'rejected' && tx.status !== 'rejected') return false;

      // Search term filter
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const itemName = tx.itemName || tx.itemId?.itemName || tx.chemicalName || tx.experimentTitle || '';
      const requester = tx.requesterName || tx.userId?.name || tx.requesterEmail || '';
      const purpose = tx.purpose || '';
      
      return (
        itemName.toLowerCase().includes(q) ||
        requester.toLowerCase().includes(q) ||
        purpose.toLowerCase().includes(q)
      );
    });
  }, [labTransactions, activeTab, searchTerm]);

  // Approve Transaction Handler
  const handleApprove = async (txId) => {
    setActionLoading(txId);
    try {
      if (store.approveBorrowRequest) {
        await store.approveBorrowRequest(txId);
      } else {
        await store.fetchTransactions({ labId });
      }
      store.setToast({ type: 'success', message: 'Transaction request approved successfully.' });
      store.fetchTransactions({ labId });
      store.fetchInventory(labId);
    } catch (err) {
      store.setToast({ type: 'error', message: err?.response?.data?.message || 'Failed to approve request.' });
    } finally {
      setActionLoading(null);
    }
  };

  // Reject Transaction Handler
  const handleReject = async (txId) => {
    setActionLoading(txId);
    try {
      if (store.rejectBorrowRequest) {
        await store.rejectBorrowRequest(txId);
      } else {
        await store.fetchTransactions({ labId });
      }
      store.setToast({ type: 'info', message: 'Transaction request rejected.' });
      store.fetchTransactions({ labId });
    } catch (err) {
      store.setToast({ type: 'error', message: err?.response?.data?.message || 'Failed to reject request.' });
    } finally {
      setActionLoading(null);
    }
  };

  const tableHeaders = [
    { key: 'item', label: 'Item / Reagent', render: tx => (
      <div>
        <span className="font-extrabold text-[#37412a] dark:text-[#e4e9d8] text-xs">
          {tx.itemName || tx.itemId?.itemName || tx.chemicalName || tx.experimentTitle || 'Reagent / Experiment'}
        </span>
        {tx.experimentTitle && (
          <span className="block text-[10px] text-[#71805a] font-semibold">Practical: {tx.experimentTitle}</span>
        )}
      </div>
    )},
    { key: 'requester', label: 'Requester / Student', render: tx => (
      <div>
        <span className="font-extrabold text-[#5c6e46] dark:text-[#a8be8a] text-xs">
          {tx.requesterName || tx.userId?.name || 'Student'}
        </span>
        <span className="block text-[10px] text-[#71805a]">
          {tx.requesterEmail || tx.userId?.email || 'Student Account'}
        </span>
      </div>
    )},
    { key: 'qty', label: 'Quantity', render: tx => (
      <span className="font-mono font-extrabold text-xs text-[#37412a] dark:text-[#e4e9d8]">
        {tx.quantity || 1} {tx.quantityUnit || tx.itemId?.quantityUnit || 'units'}
      </span>
    )},
    { key: 'type', label: 'Transaction Type', render: tx => {
      const isBorrow = tx.type === 'borrow';
      return (
        <span className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-md border ${
          isBorrow 
            ? 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
            : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
        }`}>
          {isBorrow ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
          {isBorrow ? 'Borrowing' : 'Stock Return'}
        </span>
      );
    }},
    { key: 'status', label: 'Status', render: tx => {
      const s = tx.status || 'pending';
      return (
        <span className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
          s === 'approved' || s === 'completed'
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
            : s === 'rejected'
            ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 animate-pulse'
        }`}>
          {s === 'approved' || s === 'completed' ? <CheckCircle2 size={12} /> : s === 'rejected' ? <XCircle size={12} /> : <Clock size={12} />}
          <span className="capitalize">{s}</span>
        </span>
      );
    }},
    { key: 'date', label: 'Timestamp', render: tx => (
      <span className="text-[11px] font-semibold text-[#71805a]">
        {new Date(tx.timestamp || tx.createdAt || Date.now()).toLocaleString()}
      </span>
    )},
    { key: 'actions', label: 'Action Controls', render: tx => {
      const isPending = tx.status === 'pending';
      const txId = tx._id || tx.id;
      if (!isPending) {
        return <span className="text-[11px] font-bold text-[#71805a]">✓ Processed</span>;
      }
      return (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={actionLoading === txId}
            onClick={() => handleApprove(txId)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold shadow-2xs transition-colors"
          >
            <Check size={13} /> Approve
          </button>
          <button
            type="button"
            disabled={actionLoading === txId}
            onClick={() => handleReject(txId)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-extrabold shadow-2xs transition-colors"
          >
            <X size={13} /> Reject
          </button>
        </div>
      );
    }}
  ];

  return (
    <div className="space-y-6 pb-10 max-w-7xl mx-auto">
      {/* Header & Title Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#e4eed3] pb-4 dark:border-[#2e3722]">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#87996c] dark:text-[#7a8f62]">
            <span>Pharma Laboratory</span>
            <ChevronRight size={12} />
            <span className="text-[#5c6e46] dark:text-[#a8be8a] font-bold">Real-time Transactions &amp; Approvals</span>
          </div>
          <h1 className="text-2xl font-black text-[#37412a] dark:text-[#e4e9d8] flex items-center gap-2 mt-0.5">
            <CheckCircle2 size={24} className="text-[#5c6e46]" />
            Live Transactions Manager
          </h1>
          <p className="text-xs font-semibold text-[#71805a] dark:text-[#a5b48b]">
            Manage student borrowing requisitions, approvals, and chemical issuances for <strong className="text-[#37412a] dark:text-[#e4e9d8]">{activeLab?.name || activeLab?.labName || 'HAP1'}</strong>
          </p>
        </div>

        {/* Right Controls: Switch Lab */}
        {assignedLabs.length > 1 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-extrabold text-[#71805a] dark:text-[#a5b48b] flex items-center gap-1">
              <Layers size={13} /> Switch Lab:
            </span>
            {assignedLabs.map((lab) => {
              const labKey = String(lab.id || lab._id);
              const isSelected = labKey === String(selectedLabId);
              return (
                <button
                  key={labKey}
                  type="button"
                  onClick={() => {
                    setSelectedLabId(labKey);
                    localStorage.setItem('pharmlab-active-lab', labKey);
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all border ${
                    isSelected
                      ? 'bg-[#5c6e46] text-white border-[#5c6e46] dark:bg-[#e4e9d8] dark:text-[#20251a]'
                      : 'bg-white text-[#5c6e46] border-[#d9e1ca] hover:bg-[#f4f6ee] dark:bg-[#1a1d16] dark:text-[#a8be8a] dark:border-[#414a33]'
                  }`}
                >
                  {lab.labName || lab.name || 'Lab'} ({lab.courseType || 'B.Pharm'} Y{lab.year})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-[#d9e1ca] dark:border-[#414a33]">
          <div className="text-[#71805a] dark:text-[#a5b48b] text-xs font-extrabold uppercase tracking-wider mb-1">Total Requisitions</div>
          <div className="text-3xl font-black text-[#37412a] dark:text-[#e4e9d8]">{totalCount}</div>
          <p className="text-[10px] font-semibold text-[#87996c] mt-1">Recorded in {activeLab?.name || 'HAP1'}</p>
        </Card>

        <Card className="border-[#d9e1ca] dark:border-[#414a33]">
          <div className="text-amber-700 dark:text-amber-400 text-xs font-extrabold uppercase tracking-wider mb-1">Pending Approval</div>
          <div className="text-3xl font-black text-amber-600 dark:text-amber-400">{pendingCount}</div>
          <p className="text-[10px] font-semibold text-amber-600 mt-1">Awaiting lab sign-off</p>
        </Card>

        <Card className="border-[#d9e1ca] dark:border-[#414a33]">
          <div className="text-emerald-700 dark:text-emerald-400 text-xs font-extrabold uppercase tracking-wider mb-1">Approved / Issued</div>
          <div className="text-3xl font-black text-emerald-700 dark:text-emerald-300">{approvedCount}</div>
          <p className="text-[10px] font-semibold text-emerald-600 mt-1">Disbursed to students</p>
        </Card>

        <Card className="border-[#d9e1ca] dark:border-[#414a33]">
          <div className="text-rose-700 dark:text-rose-400 text-xs font-extrabold uppercase tracking-wider mb-1">Rejected Requests</div>
          <div className="text-3xl font-black text-rose-700 dark:text-rose-400">{rejectedCount}</div>
          <p className="text-[10px] font-semibold text-rose-600 mt-1">Declined requisitions</p>
        </Card>
      </div>

      {/* Main Filter & Data Table Card */}
      <Card className="border-[#d9e1ca] dark:border-[#414a33]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          {/* Tab Filter Pills */}
          <div className="flex items-center gap-1.5 bg-[#f4f6ee] dark:bg-[#1a1d16] p-1 rounded-2xl border border-[#d9e1ca] dark:border-[#414a33]">
            {[
              { id: 'all', label: `All Transactions (${totalCount})` },
              { id: 'pending', label: `Pending (${pendingCount})` },
              { id: 'approved', label: `Approved (${approvedCount})` },
              { id: 'rejected', label: `Rejected (${rejectedCount})` },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#5c6e46] text-white shadow-2xs dark:bg-[#e4e9d8] dark:text-[#20251a]'
                    : 'text-[#5c6e46] hover:bg-white/60 dark:text-[#a8be8a] dark:hover:bg-[#20251a]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 max-w-xs">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#87996c]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by student name, chemical or practical..."
              className="w-full rounded-xl border border-[#d9e1ca] bg-white py-1.5 pl-9 pr-3 text-xs font-semibold text-[#37412a] outline-none focus:border-[#5c6e46] focus:ring-2 focus:ring-[#5c6e46]/20 dark:border-[#414a33] dark:bg-[#1a1d16] dark:text-[#e4e9d8]"
            />
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto border border-[#d9e1ca] dark:border-[#414a33] rounded-2xl">
          <Table headers={tableHeaders} rows={filteredTransactions} />
        </div>
      </Card>
    </div>
  );
}
