import React, { useEffect, useState, useMemo } from 'react';
import { 
  Beaker, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Search,
  Activity,
  FlaskConical,
  BookOpen
} from 'lucide-react';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';

export default function StudentBorrowingsPage() {
  const { 
    myLabs, 
    fetchMyLabs, 
    studentRequests, 
    fetchMyStudentRequests 
  } = useAppStore();
  const user = useAuthStore((state) => state.user);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Approved'); // Default to Approved per user request
  const [selectedLabFilter, setSelectedLabFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const c = user?.course || 'B.Pharm';
    const y = user?.year;
    const s = user?.semester;
    if (y && s) {
      fetchMyLabs(c, y, s);
    }
    fetchMyStudentRequests();
  }, [user?.course, user?.year, user?.semester, fetchMyLabs, fetchMyStudentRequests]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, selectedLabFilter]);

  // All Requests array
  const allReqs = useMemo(() => studentRequests || [], [studentRequests]);

  // Summary Metrics
  const stats = useMemo(() => {
    const totalRequests = allReqs.length;
    const approved = allReqs.filter(r => r.overallStatus === 'Approved').length;
    const pending = allReqs.filter(r => r.overallStatus === 'Pending').length;
    const totalLabs = myLabs?.length || 0;

    return { totalRequests, approved, pending, totalLabs };
  }, [allReqs, myLabs]);

  // Filtered Activity Requests
  const filteredRequests = useMemo(() => {
    return allReqs.filter(req => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        req.labName?.toLowerCase().includes(q) || 
        req.experimentName?.toLowerCase().includes(q) ||
        (Array.isArray(req.chemicalsRequested) && req.chemicalsRequested.some(c => c.chemicalName?.toLowerCase().includes(q)));
      
      const matchesStatus = statusFilter === 'All' || req.overallStatus === statusFilter;
      const matchesLab = selectedLabFilter === 'All' || req.labName?.toLowerCase().includes(selectedLabFilter.toLowerCase());
      
      return matchesSearch && matchesStatus && matchesLab;
    }).sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
  }, [allReqs, searchQuery, statusFilter, selectedLabFilter]);

  // Pagination Controls for 100+ Requests
  const ITEMS_PER_PAGE = 6;
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / ITEMS_PER_PAGE));
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRequests.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRequests, currentPage]);

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Approved
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Pending
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40">
            <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
            {status || 'Submitted'}
          </span>
        );
    }
  };

  const is24CharHex = (val) => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val);

  const getAdminDisplayName = (req) => {
    let adminName = req.approvedByName;
    if (!adminName || is24CharHex(adminName)) {
      if (req.approvedBy && typeof req.approvedBy === 'object' && req.approvedBy?.name) {
        adminName = req.approvedBy.name;
      } else if (req.approvedBy && typeof req.approvedBy === 'string' && !is24CharHex(req.approvedBy)) {
        adminName = req.approvedBy;
      } else {
        const matchingLab = myLabs?.find(l => 
          (l.labName && req.labName && l.labName.toLowerCase() === req.labName.toLowerCase()) ||
          (l.name && req.labName && l.name.toLowerCase() === req.labName.toLowerCase()) ||
          (l.labCode && req.labName && l.labCode.toLowerCase() === req.labName.toLowerCase())
        );
        if (matchingLab) {
          const labAdmin = matchingLab.admin && matchingLab.admin !== 'Unassigned'
            ? matchingLab.admin
            : (Array.isArray(matchingLab.admins) && matchingLab.admins.length 
                ? (typeof matchingLab.admins[0] === 'object' ? matchingLab.admins[0].name : matchingLab.admins[0]) 
                : null);
          if (labAdmin && !is24CharHex(labAdmin)) adminName = labAdmin;
        }
      }
    }
    if (!adminName || is24CharHex(adminName)) {
      adminName = 'harsh sir';
    }
    return adminName;
  };

  return (
    <div className="space-y-6 pb-12 text-left animate-in fade-in">
      
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <Activity className="w-7 h-7 text-[#556b2f] dark:text-[#c8a030]" />
          <h1 className="text-2xl sm:text-3xl font-black text-[#3c4e23] dark:text-[#c8a030] tracking-tight">
            My Chemical Activity & Requisitions
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">
          Structured overview of approved chemical quantities, lab allotments, and requisition history
        </p>
      </div>

      {/* Structured Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-5">
        
        {/* Approved Allotments Card */}
        <div className="bg-white dark:bg-[#1c2117] border-2 border-[#b8c99d] dark:border-[#4a5836] shadow-md rounded-2xl p-4 sm:p-5 flex items-center gap-3">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Approved Chemicals</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 leading-tight">{stats.approved}</p>
          </div>
        </div>

        {/* Pending Requests Card */}
        <div className="bg-white dark:bg-[#1c2117] border-2 border-[#b8c99d] dark:border-[#4a5836] shadow-md rounded-2xl p-4 sm:p-5 flex items-center gap-3">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-xl text-amber-600 dark:text-amber-400 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pending Approvals</p>
            <p className="text-xl sm:text-2xl font-black text-amber-700 dark:text-amber-400 leading-tight">{stats.pending}</p>
          </div>
        </div>

        {/* Total Requisitions Card */}
        <div className="bg-white dark:bg-[#1c2117] border-2 border-[#b8c99d] dark:border-[#4a5836] shadow-md rounded-2xl p-4 sm:p-5 flex items-center gap-3">
          <div className="p-3 bg-[#556b2f]/10 dark:bg-[#c8a030]/15 rounded-xl text-[#556b2f] dark:text-[#c8a030] shrink-0">
            <FlaskConical className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Requisitions</p>
            <p className="text-xl sm:text-2xl font-black text-[#3c4e23] dark:text-[#c8a030] leading-tight">{stats.totalRequests}</p>
          </div>
        </div>

        {/* Enrolled Practical Labs Card */}
        <div className="bg-white dark:bg-[#1c2117] border-2 border-[#b8c99d] dark:border-[#4a5836] shadow-md rounded-2xl p-4 sm:p-5 flex items-center gap-3">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl text-indigo-600 dark:text-indigo-400 shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Enrolled Labs</p>
            <p className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 leading-tight">{stats.totalLabs}</p>
          </div>
        </div>

      </div>

      {/* Main Activity Section Box */}
      <div className="rounded-3xl p-5 sm:p-7 bg-[#fcfdfa] dark:bg-[#181d13] border-2 border-[#d0dcb8] dark:border-[#38432a] shadow-lg shadow-[#556b2f]/5 space-y-6">
        
        {/* Filter Bar */}
        <div className="space-y-3 pb-4 border-b-2 border-[#e4ebda] dark:border-[#38432a]">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by experiment title or chemical name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full bg-white dark:bg-[#141711] border-2 border-[#cfd8bd] dark:border-[#4e5d35] focus:ring-2 focus:ring-[#556b2f] text-xs py-2.5 rounded-xl font-medium"
              />
            </div>

            {/* Lab Filter Selector */}
            <div className="w-full sm:w-64">
              <select
                value={selectedLabFilter}
                onChange={(e) => setSelectedLabFilter(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-[#141711] border-2 border-[#cfd8bd] dark:border-[#4e5d35] text-xs font-bold text-[#3c4e23] dark:text-[#eef4e8] rounded-xl outline-none focus:ring-2 focus:ring-[#556b2f]"
              >
                <option value="All">All Enrolled Labs ({myLabs?.length || 0})</option>
                {myLabs?.map(lab => (
                  <option key={lab._id || lab.labCode || lab.name} value={lab.labName || lab.name}>
                    {lab.labCode ? `${lab.labCode} - ` : ''}{lab.labName || lab.name}
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* Structured Mobile-First Status Filter Grid */}
          <div className="space-y-1.5 pt-1">
            <p className="text-[11px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Filter Activity Status:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['Approved', 'Pending', 'All', 'Rejected'].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`py-2 px-3 rounded-xl text-xs font-extrabold text-center transition-all ${
                    statusFilter === status 
                      ? 'bg-[#556b2f] text-white shadow-md dark:bg-[#c8a030] dark:text-black border-2 border-[#556b2f] dark:border-[#c8a030]' 
                      : 'bg-white dark:bg-[#20251a] text-gray-700 dark:text-gray-300 border-2 border-[#cfd8bd] dark:border-[#4e5d35] hover:bg-gray-50'
                  }`}
                >
                  {status === 'Approved' ? '✅ Approved' : status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Activity Card List */}
        {paginatedRequests.length > 0 ? (
          <div className="space-y-4">
            {paginatedRequests.map(req => {
              const formattedDate = req.requestedAt 
                ? new Date(req.requestedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                : '12 Aug 2026';

              const expNoStr = String(req.experimentNo ?? '1');
              const expBadgeLabel = expNoStr.toLowerCase().startsWith('exp') ? expNoStr : `Exp ${expNoStr}`;
              const adminDisplayName = getAdminDisplayName(req);

              const chemList = req.chemicalsRequested && req.chemicalsRequested.length > 0 
                ? req.chemicalsRequested 
                : (req.chemicalName ? [{ chemicalName: req.chemicalName, quantityRequested: req.quantityRequested || 10, unit: req.quantityUnit || 'mL', status: req.overallStatus }] : []);

              return (
                <div 
                  key={req._id || req.id}
                  className="bg-white dark:bg-[#1c2117] border-2 border-[#b8c99d] dark:border-[#4a5836] shadow-md rounded-2xl p-4 sm:p-5 space-y-3 transition-all text-left"
                >
                  {/* Line 1 (Top Line): Exp Badge, Lab Name, Date, Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#f0f2eb] dark:border-[#28301f]">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-[#556b2f]/10 dark:bg-[#c8a030]/15 text-[#556b2f] dark:text-[#c8a030] text-xs font-black rounded-md border border-[#556b2f]/20 uppercase">
                        {expBadgeLabel}
                      </span>
                      <span className="text-base font-extrabold text-[#3c4e23] dark:text-[#eef4e8]">
                        {req.labName || 'HAP1'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-medium text-gray-500 dark:text-gray-400">
                        {formattedDate}
                      </span>
                      {getStatusBadge(req.overallStatus)}
                    </div>
                  </div>

                  {/* Line 2: Approved By Lab Admin */}
                  <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 font-semibold pt-0.5">
                    <span className="text-gray-400 dark:text-gray-500 font-medium">Approved by:</span>
                    <span className="font-bold text-[#556b2f] dark:text-[#c8a030]">
                      {adminDisplayName}
                    </span>
                  </div>

                  {/* Line 3: Experiment Object / Name */}
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-[#3c4e23] dark:text-[#eef4e8]">
                      {req.experimentName}
                    </h4>
                  </div>

                  {/* Line 4: Approved Chemical Consumption Breakdown */}
                  {chemList.length > 0 && (
                    <div className="bg-[#fcfdfa] dark:bg-[#141711] border border-[#e4ebda] dark:border-[#2f3823] rounded-xl p-3 space-y-2">
                      <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Beaker className="w-3.5 h-3.5 text-[#556b2f]" /> Chemical Requisition & Approved Quantities:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {chemList.map((c, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#1c2117] border border-[#e8eadf] dark:border-[#38432a] text-xs">
                            <span className="font-semibold text-[#3c4e23] dark:text-[#eef4e8] truncate mr-2">
                              {c.chemicalName}
                            </span>
                            <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/40 shrink-0">
                              {c.quantityRequested || c.quantity} {c.unit || c.quantityUnit || 'mL'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-[#e4ebda] dark:border-[#38432a]">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 font-mono">
                  Page {currentPage} of {totalPages} &bull; {filteredRequests.length} total records
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-[#1c2117] border border-[#cfd8bd] dark:border-[#4e5d35] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    &larr; Previous
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#556b2f] text-white dark:bg-[#c8a030] dark:text-black disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
                  >
                    Next &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center bg-white dark:bg-[#1c2117] border border-dashed border-[#d9e1ca] dark:border-[#414a33] rounded-2xl space-y-2">
            <Beaker className="w-8 h-8 text-gray-400 mx-auto" />
            <h3 className="text-base font-bold text-[#3c4e23] dark:text-[#eef4e8]">No activity records found</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              No chemical requests match your current lab filter or search query.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
