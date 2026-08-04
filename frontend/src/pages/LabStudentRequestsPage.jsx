import { useEffect, useState, useMemo } from 'react';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import {
  AlertCircle, CheckCircle, PackageSearch, Search, Filter,
  Users, ClipboardList, ChevronDown, ChevronUp, Calendar,
  CheckSquare, Square, Clock, FlaskConical, Layers
} from 'lucide-react';

const STATUS_COLORS = {
  Approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  Partial: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Pending: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

export default function LabStudentRequestsPage() {
  const user = useAuthStore((s) => s.user);
  const {
    labs, studentRequests, fetchLabs, fetchStudentRequests,
    approveStudentRequest, rejectStudentRequest, inventory,
    fetchInventory, bulkApproveStudentRequests, loading,
    createLabStoreRequest, setToast
  } = useAppStore();

  const [activeLabId, setActiveLabId] = useState(
    () => localStorage.getItem('pharmlab-active-lab') || ''
  );
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [groupView, setGroupView] = useState(true); // grouped by experiment
  const [expandedGroups, setExpandedGroups] = useState({});
  const [selectedRequests, setSelectedRequests] = useState(new Set());
  const [scheduleModal, setScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [schedulingGroupKey, setSchedulingGroupKey] = useState('');

  const [storeModalOpen, setStoreModalOpen] = useState(false);
  const [storeModalData, setStoreModalData] = useState({ chemicalName: '', quantityRequested: '', unit: '', reason: '' });
  const [submittingStoreReq, setSubmittingStoreReq] = useState(false);

  const currentLab = labs.find((l) => (l.id || l._id) === activeLabId) || labs[0];

  // Assigned labs for current lab admin
  const assignedLabs = useMemo(() => {
    const uid = String(user?.id || user?._id || '');
    const email = (user?.email || '').toLowerCase();
    const userLabId = String(user?.labId?._id || user?.labId || '');
    return labs.filter((lab) => {
      const labId = String(lab.id || lab._id);
      const isAdmin = Array.isArray(lab.admins) && lab.admins.some((a) => {
        const aId = String(a.id || a._id || a);
        const aEmail = (a.email || '').toLowerCase();
        return (uid && aId === uid) || (email && aEmail === email);
      });
      return isAdmin || (userLabId && userLabId === labId);
    });
  }, [labs, user]);

  useEffect(() => { fetchLabs(); }, [fetchLabs]);

  useEffect(() => {
    const targetId = activeLabId || assignedLabs[0]?.id || assignedLabs[0]?._id || labs[0]?.id;
    if (targetId && !activeLabId) setActiveLabId(targetId);
    if (targetId) {
      fetchStudentRequests(targetId);
      fetchInventory(targetId);
    }
  }, [activeLabId, assignedLabs, labs]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return studentRequests.filter((r) => {
      const matchesSearch = !search ||
        (r.studentName || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.rollNumber || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.subject || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.experimentName || '').toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'All' || r.overallStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [studentRequests, search, statusFilter]);

  // Group by experiment
  const groupedRequests = useMemo(() => {
    const groups = {};
    filteredRequests.forEach((req) => {
      const key = `${req.subject || 'Unknown'}-Exp${req.experimentNo || '0'}`;
      if (!groups[key]) {
        groups[key] = {
          key,
          subject: req.subject,
          experimentNo: req.experimentNo,
          experimentName: req.experimentName,
          requests: [],
          chemicals: [],
        };
      }
      groups[key].requests.push(req);
      // Merge chemicals
      (req.chemicalsRequested || []).forEach((c) => {
        const existing = groups[key].chemicals.find(
          (x) => x.chemicalName.toLowerCase() === c.chemicalName.toLowerCase()
        );
        if (existing) {
          existing.totalQuantity = (existing.totalQuantity || 0) + Number(c.quantityRequested || 0);
        } else {
          groups[key].chemicals.push({ ...c, totalQuantity: Number(c.quantityRequested || 0) });
        }
      });
    });
    return Object.values(groups);
  }, [filteredRequests]);

  // Stock check
  const checkGroupStock = (chemicals) => {
    return chemicals.map((c) => {
      const inv = inventory.find(
        (i) => (i.chemicalName || i.itemName || '').toLowerCase() === c.chemicalName.toLowerCase()
      );
      const avail = inv ? Number(inv.quantity || 0) : 0;
      return { ...c, available: avail, ok: avail >= (c.totalQuantity || c.quantityRequested) };
    });
  };

  // Stats
  const stats = useMemo(() => ({
    total: studentRequests.length,
    pending: studentRequests.filter((r) => r.overallStatus === 'Pending').length,
    approved: studentRequests.filter((r) => r.overallStatus === 'Approved').length,
    rejected: studentRequests.filter((r) => r.overallStatus === 'Rejected').length,
  }), [studentRequests]);

  const handleReviewClick = (req) => {
    setSelectedRequest(req);
    setRejectReason('');
    setIsReviewModalOpen(true);
  };

  const handleApprove = async (approveType) => {
    if (!selectedRequest) return;
    await approveStudentRequest(selectedRequest._id, approveType);
    setIsReviewModalOpen(false);
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    await rejectStudentRequest(selectedRequest._id, rejectReason || 'Not specified');
    setIsReviewModalOpen(false);
  };

  const handleStoreRequestSubmit = async () => {
    setSubmittingStoreReq(true);
    try {
      if (createLabStoreRequest) {
        await createLabStoreRequest({
          chemicalName: storeModalData.chemicalName,
          quantityRequested: storeModalData.quantityRequested,
          unit: storeModalData.unit,
          reason: storeModalData.reason,
          labId: activeLabId
        });
      }
      setStoreModalOpen(false);
      if (setToast) setToast({ type: 'success', message: `Store request submitted for ${storeModalData.chemicalName}` });
    } catch (e) {
      if (setToast) setToast({ type: 'error', message: 'Failed to submit store request' });
    } finally {
      setSubmittingStoreReq(false);
    }
  };

  // Batch operations
  const toggleSelectRequest = (id) => {
    setSelectedRequests((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGroupSelect = (group) => {
    const ids = group.requests.filter((r) => r.overallStatus === 'Pending').map((r) => r._id);
    setSelectedRequests((prev) => {
      const next = new Set(prev);
      const allSelected = ids.every((id) => next.has(id));
      ids.forEach((id) => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const handleBatchApprove = async () => {
    const ids = Array.from(selectedRequests);
    if (!ids.length) return;
    if (bulkApproveStudentRequests) {
      await bulkApproveStudentRequests(ids);
    } else {
      for (const id of ids) await approveStudentRequest(id, 'available');
    }
    setSelectedRequests(new Set());
  };

  const toggleGroupExpand = (key) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Review modal stock check
  const availability = useMemo(() => {
    if (!selectedRequest) return { hasAll: false, chemicals: [] };
    let hasAll = true;
    const chemicals = (selectedRequest.chemicalsRequested || []).map((c) => {
      const inv = inventory.find(
        (i) => (i.chemicalName || i.itemName || '').toLowerCase() === c.chemicalName.toLowerCase()
      );
      const available = inv ? Number(inv.quantity || 0) : 0;
      const required = Number(c.quantityRequested || 0);
      const isAvailable = available >= required;
      if (!isAvailable) hasAll = false;
      return { ...c, available, isAvailable };
    });
    return { hasAll, chemicals };
  }, [selectedRequest, inventory]);

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#3c4e23] dark:text-[#eef4e8]">
            Student Experiment Requests
          </h2>
          <p className="text-sm text-[#71805a] dark:text-[#c5d0b5]">
            Manage and schedule student lab chemical access — {currentLab?.name || currentLab?.labName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedRequests.size > 0 && (
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleBatchApprove}
              >
                <CheckCircle size={14} className="mr-1" />
                Approve Selected ({selectedRequests.size})
              </Button>
            </div>
          )}
          <select
            value={activeLabId}
            onChange={(e) => {
              setActiveLabId(e.target.value);
              localStorage.setItem('pharmlab-active-lab', e.target.value);
            }}
            className="rounded-xl border border-[#cfd8bd] bg-white px-3 py-2 text-sm text-[#3c4e23] outline-none focus:ring-2 focus:ring-[#6f7d45] dark:border-[#4e5d35] dark:bg-[#1a1d16] dark:text-[#eef4e8]"
          >
            {assignedLabs.map((l) => (
              <option key={l.id || l._id} value={l.id || l._id}>
                {l.labName || l.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Requests', value: stats.total, color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', icon: ClipboardList },
          { label: 'Pending Review', value: stats.pending, color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Clock },
          { label: 'Approved', value: stats.approved, color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle },
          { label: 'Rejected', value: stats.rejected, color: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: AlertCircle },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className={`rounded-2xl border border-[#e8efd9] dark:border-[#3c452f] p-4 ${color}`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon size={16} />
              <span className="text-xs font-medium">{label}</span>
            </div>
            <div className="text-2xl font-bold">{value}</div>
          </div>
        ))}
      </div>

      {/* Filters & View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#87996c]" />
          <input
            type="text"
            placeholder="Search by student, roll no, subject, experiment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-[#cfd8bd] bg-white pl-9 pr-3 py-2 text-sm text-[#3c4e23] outline-none focus:ring-2 focus:ring-[#6f7d45] dark:border-[#4e5d35] dark:bg-[#1a1d16] dark:text-[#eef4e8] dark:placeholder-[#8a9e72]"
          />
        </div>
        <div className="flex gap-2">
          {['All', 'Pending', 'Approved', 'Rejected', 'Partial'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                statusFilter === s
                  ? 'bg-[#556b2f] text-white'
                  : 'border border-[#cfd8bd] text-[#556b2f] hover:bg-[#f4f6ee] dark:border-[#4e5d35] dark:text-[#c5d0b5]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <button
          onClick={() => setGroupView(!groupView)}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium border transition ${
            groupView
              ? 'bg-[#556b2f] text-white border-[#556b2f]'
              : 'border-[#cfd8bd] text-[#556b2f] dark:border-[#4e5d35] dark:text-[#c5d0b5]'
          }`}
        >
          <Layers size={14} />
          {groupView ? 'Grouped View' : 'Flat View'}
        </button>
      </div>

      {/* Content */}
      {loading && !studentRequests.length ? (
        <div className="flex items-center justify-center py-20 text-[#87996c] text-sm">Loading requests...</div>
      ) : filteredRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#cfd8bd] bg-[#fdfdf7] py-16 text-center dark:border-[#4e5d35] dark:bg-[#1a1d16]">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f4f5eb] dark:bg-[#28301f]">
            <PackageSearch size={28} className="text-[#87996c]" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-[#3c4e23] dark:text-[#eef4e8]">No Requests Found</h3>
          <p className="max-w-sm text-sm text-[#71805a] dark:text-[#c5d0b5]">
            {search || statusFilter !== 'All' ? 'Try adjusting your search or filters.' : `No student experiment requests for ${currentLab?.labName || currentLab?.name}.`}
          </p>
        </div>
      ) : groupView ? (
        /* Grouped by Experiment */
        <div className="space-y-4">
          {groupedRequests.map((group) => {
            const stockChecked = checkGroupStock(group.chemicals);
            const allOk = stockChecked.every((c) => c.ok);
            const isExpanded = expandedGroups[group.key] !== false; // default expanded
            const pendingCount = group.requests.filter((r) => r.overallStatus === 'Pending').length;
            const pendingIds = group.requests.filter((r) => r.overallStatus === 'Pending').map((r) => r._id);
            const allGroupSelected = pendingIds.length > 0 && pendingIds.every((id) => selectedRequests.has(id));

            return (
              <div
                key={group.key}
                className="rounded-2xl border border-[#d9e1ca] bg-white dark:border-[#3c452f] dark:bg-[#1a1d16] overflow-hidden"
              >
                {/* Group Header */}
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer hover:bg-[#f6f8f0] dark:hover:bg-[#20261a] transition"
                  onClick={() => toggleGroupExpand(group.key)}
                >
                  <div
                    className="flex-shrink-0 p-2 rounded-xl bg-[#f4f5eb] dark:bg-[#28301f]"
                    onClick={(e) => { e.stopPropagation(); if (pendingCount > 0) toggleGroupSelect(group); }}
                  >
                    {allGroupSelected ? (
                      <CheckSquare size={18} className="text-[#556b2f]" />
                    ) : (
                      <Square size={18} className="text-[#87996c]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <FlaskConical size={16} className="text-[#556b2f] flex-shrink-0" />
                      <span className="font-semibold text-[#2e3d19] dark:text-[#eef4e8]">
                        {group.subject} — Experiment {group.experimentNo}
                      </span>
                      {group.experimentName && (
                        <span className="text-sm text-[#71805a] dark:text-[#c5d0b5] truncate">
                          "{group.experimentName}"
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-[#71805a] dark:text-[#c5d0b5]">
                        <Users size={12} /> {group.requests.length} student{group.requests.length !== 1 ? 's' : ''}
                      </span>
                      {pendingCount > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium">
                          {pendingCount} pending
                        </span>
                      )}
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                        allOk
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                      }`}>
                        {allOk ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
                        {allOk ? 'All chemicals available' : 'Some chemicals low/missing'}
                      </span>
                    </div>
                  </div>
                  {pendingCount > 0 && (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRequests((prev) => {
                          const next = new Set(prev);
                          pendingIds.forEach((id) => next.add(id));
                          return next;
                        });
                      }}
                    >
                      Select All ({pendingCount})
                    </Button>
                  )}
                  {isExpanded ? <ChevronUp size={16} className="text-[#87996c]" /> : <ChevronDown size={16} className="text-[#87996c]" />}
                </div>

                {/* Chemicals Needed Summary */}
                {isExpanded && (
                  <div className="border-t border-[#e8efd9] dark:border-[#2e3d19]">
                    {/* Chemicals row */}
                    <div className="px-4 py-3 bg-[#fafbf5] dark:bg-[#1c2117] flex flex-col gap-2">
                      <div className="text-xs font-semibold text-[#556b2f] dark:text-[#c5d0b5]">Total Chemicals Required for this Group:</div>
                      <div className="flex flex-wrap gap-2 items-center">
                        {stockChecked.map((c, i) => (
                          <div key={i} className="flex items-center gap-1">
                            <span
                              className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center ${
                                c.ok
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800'
                              }`}
                            >
                              {c.chemicalName}: {c.totalQuantity} {c.unit}
                              {!c.ok && ` (avail: ${c.available})`}
                            </span>
                            {!c.ok && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setStoreModalData({
                                    chemicalName: c.chemicalName,
                                    quantityRequested: String(Math.max(0, c.totalQuantity - c.available)),
                                    unit: c.unit || 'g',
                                    reason: `Required for ${group.subject} - Exp ${group.experimentNo} (Missing ${c.totalQuantity - c.available} ${c.unit})`
                                  });
                                  setStoreModalOpen(true);
                                }}
                                className="text-xs px-2 py-1 bg-[#556b2f] text-white rounded-md hover:bg-[#4a5f28] transition"
                              >
                                🏪 Request Missing
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Student rows */}
                    <div className="divide-y divide-[#e8efd9] dark:divide-[#2e3d19]">
                      {group.requests.map((req) => (
                        <div key={req._id} className="flex items-center gap-4 px-4 py-3 hover:bg-[#fafbf5] dark:hover:bg-[#1c2117] transition">
                          {req.overallStatus === 'Pending' && (
                            <div
                              className="flex-shrink-0 cursor-pointer"
                              onClick={() => toggleSelectRequest(req._id)}
                            >
                              {selectedRequests.has(req._id) ? (
                                <CheckSquare size={16} className="text-[#556b2f]" />
                              ) : (
                                <Square size={16} className="text-[#aab89a]" />
                              )}
                            </div>
                          )}
                          <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                            <div>
                              <div className="font-medium text-[#2e3d19] dark:text-[#eef4e8] truncate">{req.studentName}</div>
                              <div className="text-xs text-[#87996c]">{req.rollNumber}</div>
                            </div>
                            <div>
                              <div className="text-xs text-[#87996c]">Group</div>
                              <div className="font-medium text-[#4e5d35] dark:text-[#c5d0b5]">{req.group || '—'}</div>
                            </div>
                            <div>
                              <div className="text-xs text-[#87996c]">Requested</div>
                              <div className="text-xs text-[#71805a] dark:text-[#c5d0b5]">
                                {req.requestedAt ? new Date(req.requestedAt).toLocaleDateString() : '—'}
                              </div>
                            </div>
                            <div>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[req.overallStatus] || STATUS_COLORS.Pending}`}>
                                {req.overallStatus}
                              </span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant={req.overallStatus === 'Pending' ? 'primary' : 'outline'}
                            className={req.overallStatus === 'Pending' ? 'bg-[#556b2f] hover:bg-[#4a5f28] text-white flex-shrink-0' : 'flex-shrink-0'}
                            onClick={() => handleReviewClick(req)}
                          >
                            {req.overallStatus === 'Pending' ? 'Review' : 'Details'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Flat Table View */
        <div className="rounded-2xl border border-[#d9e1ca] dark:border-[#3c452f] overflow-hidden bg-white dark:bg-[#1a1d16]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#f6f8f0] dark:bg-[#20261a] border-b border-[#d9e1ca] dark:border-[#3c452f]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#556b2f] uppercase tracking-wider">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#556b2f] uppercase tracking-wider">Roll No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#556b2f] uppercase tracking-wider">Group</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#556b2f] uppercase tracking-wider">Subject</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#556b2f] uppercase tracking-wider">Exp No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#556b2f] uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#556b2f] uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#556b2f] uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8efd9] dark:divide-[#2e3d19]">
                {filteredRequests.map((req) => (
                  <tr key={req._id} className="hover:bg-[#fafbf5] dark:hover:bg-[#1c2117] transition">
                    <td className="px-4 py-3 font-medium text-[#2e3d19] dark:text-[#eef4e8]">{req.studentName}</td>
                    <td className="px-4 py-3 text-[#71805a] dark:text-[#c5d0b5]">{req.rollNumber}</td>
                    <td className="px-4 py-3 text-[#71805a] dark:text-[#c5d0b5]">{req.group || '—'}</td>
                    <td className="px-4 py-3 text-[#71805a] dark:text-[#c5d0b5]">{req.subject || '—'}</td>
                    <td className="px-4 py-3 text-[#71805a] dark:text-[#c5d0b5]">{req.experimentNo || '—'}</td>
                    <td className="px-4 py-3 text-xs text-[#87996c]">{req.requestedAt ? new Date(req.requestedAt).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[req.overallStatus] || STATUS_COLORS.Pending}`}>
                        {req.overallStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant={req.overallStatus === 'Pending' ? 'primary' : 'outline'}
                        className={req.overallStatus === 'Pending' ? 'bg-[#556b2f] hover:bg-[#4a5f28] text-white' : ''}
                        onClick={() => handleReviewClick(req)}
                      >
                        {req.overallStatus === 'Pending' ? 'Review' : 'Details'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review/Detail Modal */}
      <Modal open={isReviewModalOpen} onClose={() => setIsReviewModalOpen(false)} title="Review Student Request">
        {selectedRequest && (
          <div className="space-y-4">
            {/* Student Info Grid */}
            <div className="grid grid-cols-2 gap-3 text-sm bg-[#f6f8f0] dark:bg-[#1c2117] p-3 rounded-xl border border-[#e8efd9] dark:border-[#2e3d19]">
              <div><span className="text-[#87996c] text-xs">Student</span><div className="font-semibold text-[#2e3d19] dark:text-[#eef4e8]">{selectedRequest.studentName}</div></div>
              <div><span className="text-[#87996c] text-xs">Roll No</span><div className="font-medium text-[#4e5d35] dark:text-[#c5d0b5]">{selectedRequest.rollNumber}</div></div>
              <div><span className="text-[#87996c] text-xs">Subject</span><div className="font-medium text-[#4e5d35] dark:text-[#c5d0b5]">{selectedRequest.subject || '—'}</div></div>
              <div><span className="text-[#87996c] text-xs">Experiment No</span><div className="font-medium text-[#4e5d35] dark:text-[#c5d0b5]">{selectedRequest.experimentNo || '—'}</div></div>
              {selectedRequest.experimentName && (
                <div className="col-span-2"><span className="text-[#87996c] text-xs">Experiment</span><div className="font-medium text-[#4e5d35] dark:text-[#c5d0b5]">{selectedRequest.experimentName}</div></div>
              )}
              <div><span className="text-[#87996c] text-xs">Group</span><div className="font-medium text-[#4e5d35] dark:text-[#c5d0b5]">{selectedRequest.group || '—'}</div></div>
              <div><span className="text-[#87996c] text-xs">Requested On</span><div className="font-medium text-[#4e5d35] dark:text-[#c5d0b5]">{selectedRequest.requestedAt ? new Date(selectedRequest.requestedAt).toLocaleString() : '—'}</div></div>
            </div>

            {/* Chemicals Table */}
            <div>
              <h4 className="font-semibold text-sm text-[#2e3d19] dark:text-[#eef4e8] mb-2">Required Chemicals & Stock Status</h4>
              <div className="border border-[#d9e1ca] dark:border-[#3c452f] rounded-xl overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#f4f6ee] dark:bg-[#20261a]">
                    <tr>
                      <th className="p-3 font-semibold text-[#556b2f] text-xs uppercase">Chemical</th>
                      <th className="p-3 font-semibold text-[#556b2f] text-xs uppercase">Required</th>
                      <th className="p-3 font-semibold text-[#556b2f] text-xs uppercase">In Stock</th>
                      <th className="p-3 font-semibold text-[#556b2f] text-xs uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availability.chemicals.map((c, i) => (
                      <tr key={i} className="border-t border-[#e8efd9] dark:border-[#2e3d19]">
                        <td className="p-3 font-medium text-[#2e3d19] dark:text-[#eef4e8]">{c.chemicalName}</td>
                        <td className="p-3 text-[#4e5d35] dark:text-[#c5d0b5]">{c.quantityRequested} {c.unit}</td>
                        <td className={`p-3 font-semibold ${c.isAvailable ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {c.available} {c.unit}
                        </td>
                        <td className="p-3">
                          {c.isAvailable
                            ? <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-medium"><CheckCircle size={14} /> Available</span>
                            : <span className="flex items-center gap-1 text-red-600 dark:text-red-400 text-xs font-medium"><AlertCircle size={14} /> Insufficient</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions for Pending */}
            {selectedRequest.overallStatus === 'Pending' && (
              <div className="space-y-3 pt-2 border-t border-[#e8efd9] dark:border-[#2e3d19]">
                {!availability.hasAll && (
                  <div className="flex gap-2 bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400 p-3 rounded-xl text-sm">
                    <PackageSearch size={18} className="flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Insufficient Stock for Some Chemicals</p>
                      <p className="text-xs mt-0.5">If you choose "Approve All & Request Store", missing quantities will be auto-forwarded to the Central Store.</p>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Rejection reason (optional)"
                    className="flex-1 rounded-xl border border-[#cfd8bd] p-2 text-sm dark:bg-[#1a1d16] dark:border-[#4e5d35] dark:text-[#eef4e8] outline-none focus:ring-2 focus:ring-[#6f7d45]"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 flex-shrink-0" onClick={handleReject}>
                    Reject
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    className="bg-[#4a7c59] hover:bg-[#3d6849] text-white"
                    onClick={() => handleApprove('available')}
                  >
                    <CheckCircle size={15} className="mr-1.5" />
                    Approve Available Only
                  </Button>
                  <Button
                    className="bg-[#556b2f] hover:bg-[#4a5f28] text-white"
                    onClick={() => handleApprove('all_and_store')}
                  >
                    <CheckCircle size={15} className="mr-1.5" />
                    Approve All & Request Store
                  </Button>
                </div>
              </div>
            )}
            {selectedRequest.overallStatus !== 'Pending' && (
              <div className="pt-2 border-t border-[#e8efd9] dark:border-[#2e3d19] text-center text-sm text-[#87996c]">
                This request has already been <strong>{selectedRequest.overallStatus.toLowerCase()}</strong>.
                {selectedRequest.rejectionReason && (
                  <p className="mt-1 text-red-600 dark:text-red-400">Reason: {selectedRequest.rejectionReason}</p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Schedule Modal */}
      <Modal open={scheduleModal} onClose={() => setScheduleModal(false)} title="Schedule Experiment">
        <div className="space-y-4 pt-2">
          <Input
            label="Schedule Date"
            type="date"
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setScheduleModal(false)}>Cancel</Button>
            <Button className="bg-[#556b2f] hover:bg-[#4a5f28] text-white" onClick={() => {
              // handle schedule submit
              setScheduleModal(false);
            }}>Confirm Schedule</Button>
          </div>
        </div>
      </Modal>

      {/* Store Request Modal */}
      <Modal open={storeModalOpen} onClose={() => setStoreModalOpen(false)} title="Request Chemical From Central Store">
        <div className="space-y-4 text-left">
          <Input
            label="Chemical Name"
            value={storeModalData.chemicalName}
            onChange={(e) => setStoreModalData({ ...storeModalData, chemicalName: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quantity Requested"
              type="number"
              value={storeModalData.quantityRequested}
              onChange={(e) => setStoreModalData({ ...storeModalData, quantityRequested: e.target.value })}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#3c4e23] dark:text-[#eef4e8]">Unit</label>
              <select
                className="rounded-lg border border-[#cfd8bd] bg-white px-3 py-2 text-sm text-[#2e3d19] focus:border-[#556b2f] focus:outline-none focus:ring-1 focus:ring-[#556b2f] dark:border-[#414a33] dark:bg-[#131610] dark:text-[#eef4e8]"
                value={storeModalData.unit}
                onChange={(e) => setStoreModalData({ ...storeModalData, unit: e.target.value })}
              >
                <option value="g">g</option>
                <option value="kg">kg</option>
                <option value="mL">mL</option>
                <option value="L">L</option>
                <option value="units">units</option>
                <option value="mg">mg</option>
              </select>
            </div>
          </div>
          <Input
            label="Reason / Note"
            value={storeModalData.reason}
            onChange={(e) => setStoreModalData({ ...storeModalData, reason: e.target.value })}
          />
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setStoreModalOpen(false)}>Cancel</Button>
            <Button className="bg-[#556b2f] text-white hover:bg-[#4a5f28]" onClick={handleStoreRequestSubmit} disabled={submittingStoreReq}>
              {submittingStoreReq ? 'Submitting...' : 'Submit Store Request'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
