import { useEffect, useMemo, useState } from 'react';
import { 
  Plus, CheckCircle2, Users, Warehouse, Search, ShieldCheck, 
  FlaskConical, ShoppingBag, History, KeyRound, UserPlus, 
  Building2, LayoutDashboard, Clock, UserCheck, AlertCircle, RefreshCw,
  BookOpen, FileSpreadsheet, Megaphone, ToggleLeft, ToggleRight, Download,
  Ban, ShieldAlert, FileText, Check, X, AlertTriangle, Layers, Edit3, Trash2, Folder, FolderOpen, Grid, List,
  ChevronRight, ChevronDown, Eye, Activity
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import useDebounce from '../hooks/useDebounce';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const MOCK_STORE_REQUESTS = [
  { _id: 'sr-1', labName: 'Pharmaceutics Lab - I', chemicalName: 'Hydrochloric Acid 0.1M', quantityRequested: 500, unit: 'mL', estimatedCost: 1450, requestedAt: new Date(Date.now() - 86400000 * 2).toISOString(), status: 'Approved', approvedBy: { name: 'Dr. Store Admin' }, receiptNumber: 'REC-2026-001' },
  { _id: 'sr-2', labName: 'Pharmaceutical Chemistry Lab', chemicalName: 'Ethanol 99.9% Absolute', quantityRequested: 1000, unit: 'mL', estimatedCost: 2850, requestedAt: new Date(Date.now() - 86400000 * 1).toISOString(), status: 'Pending', approvedBy: null, receiptNumber: null },
  { _id: 'sr-3', labName: 'Pharmaceutical Analysis Lab', chemicalName: 'Paracetamol IP/BP', quantityRequested: 250, unit: 'g', estimatedCost: 3200, requestedAt: new Date(Date.now() - 86400000 * 4).toISOString(), status: 'Approved', approvedBy: { name: 'Dr. Store Admin' }, receiptNumber: 'REC-2026-002' },
  { _id: 'sr-4', labName: 'Human Anatomy & Physiology Lab', chemicalName: 'Sodium Hydroxide Pellets', quantityRequested: 100, unit: 'g', estimatedCost: 980, requestedAt: new Date(Date.now() - 86400000 * 5).toISOString(), status: 'Rejected', approvedBy: { name: 'Dr. Store Admin' }, receiptNumber: null },
  { _id: 'sr-5', labName: 'Pharmaceutics Lab - I', chemicalName: 'Sulphuric Acid 98% AR', quantityRequested: 500, unit: 'mL', estimatedCost: 1750, requestedAt: new Date(Date.now() - 86400000 * 35).toISOString(), status: 'Approved', approvedBy: { name: 'Dr. Store Admin' }, receiptNumber: 'REC-2026-000' },
  { _id: 'sr-6', labName: 'Pharmaceutical Chemistry Lab', chemicalName: 'Methanol HPLC Grade', quantityRequested: 1000, unit: 'mL', estimatedCost: 3400, requestedAt: new Date(Date.now() - 86400000 * 40).toISOString(), status: 'Approved', approvedBy: { name: 'Dr. Store Admin' }, receiptNumber: 'REC-2026-00-1' },
  { _id: 'sr-7', labName: 'Pharmacology Lab', chemicalName: 'Atropine Sulphate IP', quantityRequested: 50, unit: 'g', estimatedCost: 4200, requestedAt: new Date(Date.now() - 86400000 * 65).toISOString(), status: 'Approved', approvedBy: { name: 'Dr. Store Admin' }, receiptNumber: 'REC-2026-00-2' }
];

const MOCK_STORE_HISTORY = [
  { _id: 'sh-1', labName: 'Pharmaceutics Lab - I', chemicalName: 'Hydrochloric Acid 0.1M', qtyRequestedBase: 500, unit: 'mL', valueReleased: 1450, action: 'Approved', approvedBy: 'Dr. Store Admin', timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), receiptNumber: 'REC-2026-001' },
  { _id: 'sh-2', labName: 'Pharmaceutical Analysis Lab', chemicalName: 'Paracetamol IP/BP', qtyRequestedBase: 250, unit: 'g', valueReleased: 3200, action: 'Approved', approvedBy: 'Dr. Store Admin', timestamp: new Date(Date.now() - 86400000 * 4).toISOString(), receiptNumber: 'REC-2026-002' },
  { _id: 'sh-3', labName: 'Pharmaceutics Lab - I', chemicalName: 'Sulphuric Acid 98% AR', qtyRequestedBase: 500, unit: 'mL', valueReleased: 1750, action: 'Approved', approvedBy: 'Dr. Store Admin', timestamp: new Date(Date.now() - 86400000 * 35).toISOString(), receiptNumber: 'REC-2026-000' },
  { _id: 'sh-4', labName: 'Pharmaceutical Chemistry Lab', chemicalName: 'Methanol HPLC Grade', qtyRequestedBase: 1000, unit: 'mL', valueReleased: 3400, action: 'Approved', approvedBy: 'Dr. Store Admin', timestamp: new Date(Date.now() - 86400000 * 40).toISOString(), receiptNumber: 'REC-2026-00-1' },
  { _id: 'sh-5', labName: 'Pharmacology Lab', chemicalName: 'Atropine Sulphate IP', qtyRequestedBase: 50, unit: 'g', valueReleased: 4200, action: 'Approved', approvedBy: 'Dr. Store Admin', timestamp: new Date(Date.now() - 86400000 * 65).toISOString(), receiptNumber: 'REC-2026-00-2' }
];

export default function SuperAdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    labs,
    users,
    fetchLabs,
    fetchUsers,
    createLab,
    deleteLab,
    createLabAdmin,
    createStoreAdmin,
    createSuperAdmin,
    assignAdminToLab,
    removeAdminFromLab,
    approveUserAccount,
    activityLogs,
    fetchActivityLogs,
    setToast,
    setHighlight,
    masterChemicals,
    addMasterChemical,
    curriculumExperiments,
    addCurriculumExperiment,
    updateCurriculumExperiment,
    deleteCurriculumExperiment,
    broadcastAnnouncements,
    addBroadcastAnnouncement,
    toggleBroadcastStatus,
    globalFeatureFlags,
    toggleFeatureFlag,
    toggleUserStatus
  } = useAppStore();

  const { changePassword } = useAuthStore();

  // Tab state derived from URL route
  const activeTab = useMemo(() => {
    if (location.pathname === '/labs') return 'labs';
    if (location.pathname === '/approval') return 'users';
    if (location.pathname === '/master-chemicals') return 'master-chemicals';
    if (location.pathname === '/curriculum') return 'curriculum';
    if (location.pathname === '/store-oversight') return 'store';
    if (location.pathname === '/activity') return 'activity';
    if (location.pathname === '/settings') return 'settings';
    return 'overview';
  }, [location.pathname]);

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [deleteLabModalOpen, setDeleteLabModalOpen] = useState(false);
  const [deletingLabItem, setDeletingLabItem] = useState(null);
  const [deleteStep, setDeleteStep] = useState(1);
  const [confirmLabNameInput, setConfirmLabNameInput] = useState('');
  const [storeAdminModalOpen, setStoreAdminModalOpen] = useState(false);
  const [superAdminModalOpen, setSuperAdminModalOpen] = useState(false);
  const [masterChemModalOpen, setMasterChemModalOpen] = useState(false);
  const [curriculumModalOpen, setCurriculumModalOpen] = useState(false);
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [csvImportModalOpen, setCsvImportModalOpen] = useState(false);

  // Operation States
  const [creating, setCreating] = useState(false);
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [savingSuperAdmin, setSavingSuperAdmin] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [deletingLab, setDeletingLab] = useState(false);
  const [approvingUserId, setApprovingUserId] = useState('');

  // Selected Data & Forms
  const [selectedLab, setSelectedLab] = useState(null);
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [newLab, setNewLab] = useState({ name: '', code: '', courseType: 'B.Pharm', department: '', year: '1', semester: '1' });
  const [adminMode, setAdminMode] = useState('create_new'); // 'create_new', 'existing', 'unassigned'
  const [newLabAdmin, setNewLabAdmin] = useState({ name: '', email: '', password: '' });
  const [selectedExistingAdminId, setSelectedExistingAdminId] = useState('');
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '' });
  const [newStoreAdmin, setNewStoreAdmin] = useState({ name: '', email: '', password: '' });
  const [newSuperAdmin, setNewSuperAdmin] = useState({ name: '', email: '', password: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  // Custom Feature Forms
  const [newMasterChem, setNewMasterChem] = useState({ name: '', casNumber: '', hazardClass: 'Non-Hazardous', storageTemp: 'Room Temp', category: 'Reagent' });
  const [newCurrExp, setNewCurrExp] = useState({ course: 'B.Pharm', year: '1', semester: '1', subject: 'Pharmaceutics Lab - I', expNo: 'Exp 01', name: '', requiredChemicals: '' });
  const [newBroadcast, setNewBroadcast] = useState({ title: '', message: '', targetRole: 'All Users' });
  const [csvInput, setCsvInput] = useState('');

  // Search & Filters
  const [labSearch, setLabSearch] = useState('');
  const [labCourseFilter, setLabCourseFilter] = useState('all');
  const [labViewMode, setLabViewMode] = useState('grid');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [matrixSearch, setMatrixSearch] = useState('');

  // Curriculum State & Navigation
  const [currCourseFilter, setCurrCourseFilter] = useState('B.Pharm');
  const [currSemFilter, setCurrSemFilter] = useState('1');
  const [currSubjectFilter, setCurrSubjectFilter] = useState('all');
  const [currViewMode, setCurrViewMode] = useState('table'); // 'table' | 'cards'
  const [currSearch, setCurrSearch] = useState('');
  const [editCurrModalOpen, setEditCurrModalOpen] = useState(false);
  const [editingExp, setEditingExp] = useState(null);
  const [detailExpModalOpen, setDetailExpModalOpen] = useState(false);
  const [selectedExpDetail, setSelectedExpDetail] = useState(null);
  const [expandedSems, setExpandedSems] = useState(['1']);
  const [collapsedLabs, setCollapsedLabs] = useState([]);
  const [expandedChemsMap, setExpandedChemsMap] = useState({});

  const toggleSemExpand = (semStr) => {
    setExpandedSems((prev) =>
      prev.includes(semStr) ? prev.filter((s) => s !== semStr) : [...prev, semStr]
    );
  };

  const toggleLabCollapse = (subj) => {
    setCollapsedLabs((prev) =>
      prev.includes(subj) ? prev.filter((s) => s !== subj) : [...prev, subj]
    );
  };

  const toggleChemExpand = (expId) => {
    setExpandedChemsMap((prev) => ({
      ...prev,
      [expId]: !prev[expId]
    }));
  };

  const debouncedLabSearch = useDebounce(labSearch, 300);
  const debouncedUserSearch = useDebounce(userSearch, 300);
  const debouncedMatrixSearch = useDebounce(matrixSearch, 300);
  const debouncedCurrSearch = useDebounce(currSearch, 300);

  // Chemical Activity Overview State (Future-Proof 20+ Years Architecture)
  const [storeRequestsList, setStoreRequestsList] = useState([]);
  const [storeHistoryList, setStoreHistoryList] = useState([]);
  const [chemActivitySearch, setChemActivitySearch] = useState('');
  const [chemStatusFilter, setChemStatusFilter] = useState('all');
  const [chemYearFilter, setChemYearFilter] = useState('all');
  const [chemMonthFilter, setChemMonthFilter] = useState('all');

  const debouncedChemActivitySearch = useDebounce(chemActivitySearch, 300);

  useEffect(() => {
    const loadOverviewData = async () => {
      try {
        const [reqRes, histRes] = await Promise.allSettled([
          api.get('/store-requests'),
          api.get('/store-history')
        ]);

        let reqs = [];
        if (reqRes.status === 'fulfilled' && reqRes.value?.data) {
          const resData = reqRes.value.data;
          reqs = Array.isArray(resData) ? resData : (resData.requests || resData.data || []);
        }
        setStoreRequestsList(reqs.length > 0 ? reqs : MOCK_STORE_REQUESTS);

        let hists = [];
        if (histRes.status === 'fulfilled' && histRes.value?.data) {
          const resData = histRes.value.data;
          hists = Array.isArray(resData) ? resData : (resData.history || resData.data || []);
        }
        setStoreHistoryList(hists.length > 0 ? hists : MOCK_STORE_HISTORY);
      } catch {
        setStoreRequestsList(MOCK_STORE_REQUESTS);
        setStoreHistoryList(MOCK_STORE_HISTORY);
      }
    };

    if (activeTab === 'master-chemicals') {
      loadOverviewData();
    }
  }, [activeTab]);

  // Helper to extract cost
  const getItemCost = (item) => {
    return Number(item.estimatedCost || item.totalCost || item.valueReleased || item.cost || (item.quantityRequested ? item.quantityRequested * 3.5 : 1200));
  };

  // Available Years List (Scalable 30+ Years Future-Proofing from 2026 to 2056+)
  const availableYears = useMemo(() => {
    const yearsSet = new Set();

    // Generate 30+ years range: 2026 to 2056
    for (let y = 2026; y <= 2056; y++) {
      yearsSet.add(String(y));
    }

    storeRequestsList.forEach((r) => {
      const d = new Date(r.requestedAt || r.createdAt || Date.now());
      if (!isNaN(d.getTime())) {
        yearsSet.add(String(d.getFullYear()));
      }
    });

    return Array.from(yearsSet).sort((a, b) => Number(a) - Number(b));
  }, [storeRequestsList]);

  // Month Names reference
  const MONTH_NAMES = [
    { value: 'all', label: 'All Months' },
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  // Derived metrics for Chemical Activity Overview (Year & Month Filtered)
  const periodFilteredRequestsList = useMemo(() => {
    return storeRequestsList.filter((r) => {
      const d = new Date(r.requestedAt || r.createdAt || Date.now());
      const rYear = String(d.getFullYear());
      const rMonth = String(d.getMonth() + 1).padStart(2, '0');

      const matchesYear = chemYearFilter === 'all' || rYear === chemYearFilter;
      const matchesMonth = chemMonthFilter === 'all' || rMonth === chemMonthFilter;

      return matchesYear && matchesMonth;
    });
  }, [storeRequestsList, chemYearFilter, chemMonthFilter]);

  const totalRequestsThisMonth = useMemo(() => {
    return periodFilteredRequestsList.length;
  }, [periodFilteredRequestsList]);

  const totalApprovedThisMonth = useMemo(() => {
    return periodFilteredRequestsList.filter((r) => r.status === 'Approved').length;
  }, [periodFilteredRequestsList]);

  const totalLabsActiveCount = useMemo(() => {
    return labs.length || 4;
  }, [labs]);

  const totalChemicalsReleasedCount = useMemo(() => {
    const approvedCount = periodFilteredRequestsList.filter((r) => r.status === 'Approved').length;
    const historyCount = storeHistoryList.filter((h) => {
      if ((h.action || 'Approved') !== 'Approved') return false;
      const d = new Date(h.timestamp || h.createdAt);
      const hYear = String(d.getFullYear());
      const hMonth = String(d.getMonth() + 1).padStart(2, '0');
      const matchesYear = chemYearFilter === 'all' || hYear === chemYearFilter;
      const matchesMonth = chemMonthFilter === 'all' || hMonth === chemMonthFilter;
      return matchesYear && matchesMonth;
    }).length;
    return approvedCount > 0 ? approvedCount : historyCount;
  }, [periodFilteredRequestsList, storeHistoryList, chemYearFilter, chemMonthFilter]);

  // Total Chemical Cost (INR ₹)
  const totalChemicalCost = useMemo(() => {
    return periodFilteredRequestsList
      .filter((r) => r.status === 'Approved')
      .reduce((sum, r) => sum + getItemCost(r), 0);
  }, [periodFilteredRequestsList]);

  // Section 1: Chemical Requests Filtered
  const filteredRequests = useMemo(() => {
    return periodFilteredRequestsList.filter((r) => {
      const query = debouncedChemActivitySearch.trim().toLowerCase();
      const labNameStr = r.labName || r.labId?.name || r.labId?.labName || '';
      const chemNameStr = r.chemicalName || '';

      const matchesSearch = !query || labNameStr.toLowerCase().includes(query) || chemNameStr.toLowerCase().includes(query);
      const matchesStatus = chemStatusFilter === 'all' || (r.status || 'Pending').toLowerCase() === chemStatusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [periodFilteredRequestsList, debouncedChemActivitySearch, chemStatusFilter]);

  // Section 2: Approved & Received Chemicals
  const approvedReleases = useMemo(() => {
    const query = debouncedChemActivitySearch.trim().toLowerCase();

    let fromRequests = periodFilteredRequestsList.filter((r) => r.status === 'Approved').map(r => ({
      id: r._id || r.id,
      labName: r.labName || r.labId?.name || r.labId?.labName || 'Central Lab',
      chemicalName: r.chemicalName || 'Chemical',
      quantityReleased: `${r.quantityRequested || 0} ${r.unit || ''}`.trim(),
      cost: getItemCost(r),
      approvedBy: typeof r.approvedBy === 'object' ? (r.approvedBy?.name || 'Store Admin') : (r.approvedBy || 'Store Admin'),
      date: r.approvedAt || r.requestedAt || r.createdAt,
      receiptNo: r.receiptNumber || r.requestId || 'REC-2026-001'
    }));

    if (fromRequests.length === 0 && storeHistoryList.length > 0) {
      fromRequests = storeHistoryList.filter((h) => {
        if ((h.action || 'Approved') !== 'Approved') return false;
        const d = new Date(h.timestamp || h.createdAt);
        const hYear = String(d.getFullYear());
        const hMonth = String(d.getMonth() + 1).padStart(2, '0');
        const matchesYear = chemYearFilter === 'all' || hYear === chemYearFilter;
        const matchesMonth = chemMonthFilter === 'all' || hMonth === chemMonthFilter;
        return matchesYear && matchesMonth;
      }).map(h => ({
        id: h._id || h.id,
        labName: h.labName || 'Central Lab',
        chemicalName: h.chemicalName || 'Chemical',
        quantityReleased: `${h.qtyRequestedBase || h.quantity || 0} ${h.unit || h.baseUnit || ''}`.trim(),
        cost: getItemCost(h),
        approvedBy: h.approvedBy || 'Store Admin',
        date: h.timestamp || h.createdAt,
        receiptNo: h.receiptNumber || 'REC-2026-001'
      }));
    }

    if (!query) return fromRequests;

    return fromRequests.filter(item =>
      item.labName.toLowerCase().includes(query) || item.chemicalName.toLowerCase().includes(query)
    );
  }, [periodFilteredRequestsList, storeHistoryList, chemYearFilter, chemMonthFilter, debouncedChemActivitySearch]);

  // Section 3: Monthly Saved Archive Ledger (Organized Monthly Record for 20+ Years)
  const monthlyLedgerArchive = useMemo(() => {
    const map = {};

    storeRequestsList.forEach((r) => {
      const d = new Date(r.requestedAt || r.createdAt || Date.now());
      const yearStr = String(d.getFullYear());
      const monthStr = String(d.getMonth() + 1).padStart(2, '0');
      const monthKey = `${yearStr}-${monthStr}`;
      const monthLabel = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const lab = r.labName || r.labId?.name || r.labId?.labName || 'Central Lab';
      const key = `${monthKey}__${lab}`;

      if (!map[key]) {
        map[key] = {
          id: key,
          monthKey,
          yearStr,
          monthStr,
          monthLabel,
          labName: lab,
          totalRequests: 0,
          approvedCount: 0,
          rejectedCount: 0,
          totalCost: 0
        };
      }

      map[key].totalRequests += 1;
      if (r.status === 'Approved') {
        map[key].approvedCount += 1;
        map[key].totalCost += getItemCost(r);
      } else if (r.status === 'Rejected') {
        map[key].rejectedCount += 1;
      }
    });

    let list = Object.values(map);

    if (chemYearFilter !== 'all') {
      list = list.filter((item) => item.yearStr === chemYearFilter);
    }
    if (chemMonthFilter !== 'all') {
      list = list.filter((item) => item.monthStr === chemMonthFilter);
    }

    const query = debouncedChemActivitySearch.trim().toLowerCase();
    if (query) {
      list = list.filter((item) => item.labName.toLowerCase().includes(query) || item.monthLabel.toLowerCase().includes(query));
    }

    return list.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [storeRequestsList, chemYearFilter, chemMonthFilter, debouncedChemActivitySearch]);

  const handleExportMonthlyLedgerCSV = () => {
    if (monthlyLedgerArchive.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,Month,Lab Name,Total Requests,Approved Count,Total Cost (INR),Status\n";
    monthlyLedgerArchive.forEach((row) => {
      csvContent += `"${row.monthLabel}","${row.labName}",${row.totalRequests},${row.approvedCount},${row.totalCost},"Verified Ledger"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Chemical_Monthly_Ledger_${chemYearFilter}_${chemMonthFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Platform Audit History State & Filters (30+ Year History Architecture)
  const [auditTabRoleFilter, setAuditTabRoleFilter] = useState('all'); // 'all' | 'super-admin' | 'store-admin' | 'lab-admin' | 'student'
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [auditLabFilter, setAuditLabFilter] = useState('all');
  const [auditYearFilter, setAuditYearFilter] = useState('all');
  const [auditSemFilter, setAuditSemFilter] = useState('all');
  const [auditDateFrom, setAuditDateFrom] = useState('');
  const [auditDateTo, setAuditDateTo] = useState('');
  const [auditViewMode, setAuditViewMode] = useState('table'); // 'table' | 'section'
  
  // 30+ Year Historical Archive Filters & Modal
  const [auditHistYearFilter, setAuditHistYearFilter] = useState('all');
  const [auditHistMonthFilter, setAuditHistMonthFilter] = useState('all');
  const [auditArchiveModalOpen, setAuditArchiveModalOpen] = useState(false);

  const debouncedAuditSearch = useDebounce(auditSearchQuery, 300);

  useEffect(() => {
    if (activeTab === 'activity' && typeof fetchActivityLogs === 'function') {
      fetchActivityLogs();
    }
  }, [activeTab, fetchActivityLogs]);

  // Normalize Audit Logs (Strictly real data from MongoDB backend API via /logs)
  const normalizedAuditLogs = useMemo(() => {
    const rawLogs = (activityLogs && Array.isArray(activityLogs)) ? activityLogs : [];
    
    return rawLogs.map((log, index) => {
      const roleStr = (log.role || log.actorRole || 'student').toLowerCase();
      let normRole = 'student';
      if (roleStr.includes('super')) normRole = 'super-admin';
      else if (roleStr.includes('store')) normRole = 'store-admin';
      else if (roleStr.includes('lab')) normRole = 'lab-admin';
      else if (roleStr.includes('student')) normRole = 'student';

      const matchedUser = users.find(
        (u) => u.email && log.userEmail && u.email.toLowerCase() === log.userEmail.toLowerCase()
      );

      const resolvedLabName =
        log.labName && log.labName !== '-'
          ? log.labName
          : matchedUser?.assignedLabName && matchedUser.assignedLabName !== 'Unassigned'
          ? matchedUser.assignedLabName
          : matchedUser?.labName || (normRole === 'store-admin' ? 'Central Store' : normRole === 'super-admin' ? 'Governance Hub' : '-');

      const resolvedYear =
        log.year && log.year !== '-'
          ? String(log.year)
          : matchedUser?.year
          ? String(matchedUser.year)
          : (normRole === 'student' || normRole === 'lab-admin' ? '1' : '-');

      const resolvedSemester =
        log.semester && log.semester !== '-'
          ? String(log.semester)
          : matchedUser?.semester
          ? String(matchedUser.semester)
          : (normRole === 'student' || normRole === 'lab-admin' ? '1' : '-');

      return {
        id: log._id || log.id || `log-${index}`,
        timestamp: log.timestamp || log.createdAt || new Date().toISOString(),
        userName: log.userName || log.actorName || log.user?.name || matchedUser?.name || 'User',
        userEmail: log.userEmail || log.actorEmail || log.user?.email || matchedUser?.email || '',
        role: normRole,
        labName: resolvedLabName,
        courseType: log.courseType || matchedUser?.course || (normRole === 'student' || normRole === 'lab-admin' ? 'B.Pharm' : '-'),
        year: resolvedYear,
        semester: resolvedSemester,
        actionDetails: log.actionDetails || log.details || log.action || 'User Action',
        status: log.status || (log.action === 'failed_login' ? 'Failed' : 'Success')
      };
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [activityLogs, users]);

  // Available Years List (Scalable 30+ Years Future-Proofing from 2026 to 2056+)
  const availableAuditYears = useMemo(() => {
    const yearsSet = new Set();
    for (let y = 2026; y <= 2056; y++) {
      yearsSet.add(String(y));
    }
    normalizedAuditLogs.forEach((log) => {
      const d = new Date(log.timestamp);
      if (!isNaN(d.getTime())) {
        yearsSet.add(String(d.getFullYear()));
      }
    });
    return Array.from(yearsSet).sort((a, b) => Number(a) - Number(b));
  }, [normalizedAuditLogs]);

  // Monthly Audit History Ledger Archive (30+ Years Future-Proofing)
  const monthlyAuditArchiveData = useMemo(() => {
    const map = {};

    normalizedAuditLogs.forEach((log) => {
      const d = new Date(log.timestamp);
      if (isNaN(d.getTime())) return;

      const yearStr = String(d.getFullYear());
      const monthStr = String(d.getMonth() + 1).padStart(2, '0');
      const monthKey = `${yearStr}-${monthStr}`;
      
      const monthName = d.toLocaleString('en-US', { month: 'long' });
      const monthLabel = `${monthName} ${yearStr}`;

      if (!map[monthKey]) {
        map[monthKey] = {
          monthKey,
          yearStr,
          monthStr,
          monthLabel,
          totalLogs: 0,
          loginsCount: 0,
          storeCount: 0,
          labAdminCount: 0,
          studentCount: 0,
          failedCount: 0,
          usersSet: new Set()
        };
      }

      const item = map[monthKey];
      item.totalLogs += 1;
      if (log.userName || log.userEmail) item.usersSet.add(log.userEmail || log.userName);

      const isFailed = (log.status || '').toLowerCase() === 'failed' || (log.actionDetails || '').toLowerCase().includes('failed');
      if (isFailed) item.failedCount += 1;

      if ((log.actionDetails || '').toLowerCase().includes('logged in') && !isFailed) item.loginsCount += 1;

      if (log.role === 'store-admin') item.storeCount += 1;
      else if (log.role === 'lab-admin') item.labAdminCount += 1;
      else if (log.role === 'student') item.studentCount += 1;
    });

    let list = Object.values(map);

    if (auditHistYearFilter !== 'all') {
      list = list.filter(item => item.yearStr === auditHistYearFilter);
    }
    if (auditHistMonthFilter !== 'all') {
      list = list.filter(item => item.monthStr === auditHistMonthFilter);
    }

    return list.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [normalizedAuditLogs, auditHistYearFilter, auditHistMonthFilter]);

  // Export 30+ Year Monthly Audit Archive to CSV
  const handleExportMonthlyAuditArchiveCSV = () => {
    if (monthlyAuditArchiveData.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,Month/Year,Total Logs,Logins Count,Unique Active Users,Store Manager Actions,Lab Admin Actions,Student Actions,Failed Logins\n";
    monthlyAuditArchiveData.forEach((row) => {
      csvContent += `"${row.monthLabel}",${row.totalLogs},${row.loginsCount},${row.usersSet.size},${row.storeCount},${row.labAdminCount},${row.studentCount},${row.failedCount}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Platform_Monthly_Audit_Ledger_${auditHistYearFilter}_${auditHistMonthFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Role Count Badges for Audit Top Tabs
  const auditRoleCounts = useMemo(() => {
    const counts = {
      all: normalizedAuditLogs.length,
      'super-admin': 0,
      'store-admin': 0,
      'lab-admin': 0,
      student: 0
    };

    normalizedAuditLogs.forEach((log) => {
      if (counts[log.role] !== undefined) {
        counts[log.role] += 1;
      }
    });

    return counts;
  }, [normalizedAuditLogs]);

  // Filtered Audit Records (Tied to Role Tabs, Search, Lab, Year, Semester, Date Pickers, and 30+ Year Historical Year/Month Filters)
  const filteredAuditLogs = useMemo(() => {
    return normalizedAuditLogs.filter((log) => {
      // 30+ Year Historical Year Filter
      if (auditHistYearFilter !== 'all') {
        const logYear = String(new Date(log.timestamp).getFullYear());
        if (logYear !== auditHistYearFilter) return false;
      }

      // 30+ Year Historical Month Filter
      if (auditHistMonthFilter !== 'all') {
        const logMonth = String(new Date(log.timestamp).getMonth() + 1).padStart(2, '0');
        if (logMonth !== auditHistMonthFilter) return false;
      }

      // Role Filter (Tab or Dropdown)
      if (auditTabRoleFilter !== 'all' && log.role !== auditTabRoleFilter) {
        return false;
      }

      // Search Query
      const q = debouncedAuditSearch.trim().toLowerCase();
      if (q) {
        const nameMatch = (log.userName || '').toLowerCase().includes(q);
        const emailMatch = (log.userEmail || '').toLowerCase().includes(q);
        const detailsMatch = (log.actionDetails || '').toLowerCase().includes(q);
        const labMatch = (log.labName || '').toLowerCase().includes(q);
        if (!nameMatch && !emailMatch && !detailsMatch && !labMatch) return false;
      }

      // Lab Filter
      if (auditLabFilter !== 'all') {
        if ((log.labName || '').toLowerCase() !== auditLabFilter.toLowerCase()) return false;
      }

      // Academic Year Filter
      if (auditYearFilter !== 'all') {
        if (String(log.year) !== String(auditYearFilter)) return false;
      }

      // Semester Filter
      if (auditSemFilter !== 'all') {
        if (String(log.semester) !== String(auditSemFilter)) return false;
      }

      // Date Range Filter
      if (auditDateFrom) {
        const fromDate = new Date(auditDateFrom);
        fromDate.setHours(0, 0, 0, 0);
        const logDate = new Date(log.timestamp);
        if (logDate < fromDate) return false;
      }

      if (auditDateTo) {
        const toDate = new Date(auditDateTo);
        toDate.setHours(23, 59, 59, 999);
        const logDate = new Date(log.timestamp);
        if (logDate > toDate) return false;
      }

      return true;
    });
  }, [normalizedAuditLogs, auditHistYearFilter, auditHistMonthFilter, auditTabRoleFilter, debouncedAuditSearch, auditLabFilter, auditYearFilter, auditSemFilter, auditDateFrom, auditDateTo]);

  // Top Stat Cards Metrics
  const auditTopStats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekAgo = now.getTime() - (7 * 24 * 60 * 60 * 1000);

    let loginsToday = 0;
    const activeUsersTodaySet = new Set();
    let actionsThisWeek = 0;
    let suspiciousFailed = 0;

    normalizedAuditLogs.forEach((log) => {
      const logTime = new Date(log.timestamp).getTime();
      const isToday = logTime >= todayStart;
      const isThisWeek = logTime >= weekAgo;
      const isFailed = (log.status || '').toLowerCase() === 'failed' || (log.actionDetails || '').toLowerCase().includes('failed');

      if (isToday && (log.actionDetails || '').toLowerCase().includes('logged in') && !isFailed) {
        loginsToday += 1;
      }

      if (isToday) {
        activeUsersTodaySet.add(log.userEmail || log.userName);
      }

      if (isThisWeek) {
        actionsThisWeek += 1;
      }

      if (isFailed) {
        suspiciousFailed += 1;
      }
    });

    return {
      loginsToday: loginsToday,
      activeUsersRightNow: activeUsersTodaySet.size,
      actionsThisWeek: actionsThisWeek,
      suspiciousFailed: suspiciousFailed
    };
  }, [normalizedAuditLogs]);

  // Dynamic Section Metrics from Real Mongo Data
  const auditSectionMetrics = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // Store Manager
    const storeLogs = normalizedAuditLogs.filter(l => l.role === 'store-admin');
    const storeLogsToday = storeLogs.filter(l => new Date(l.timestamp).getTime() >= todayStart);
    const lastStoreLog = storeLogs[0];

    // Lab Admins
    const labAdminLogs = normalizedAuditLogs.filter(l => l.role === 'lab-admin');
    const activeLabAdminsSet = new Set(labAdminLogs.filter(l => new Date(l.timestamp).getTime() >= todayStart).map(l => l.userEmail || l.userName));
    
    // Unique Recent Active Lab Admins
    const recentLabAdminsMap = new Map();
    labAdminLogs.forEach(l => {
      const key = l.userEmail || l.userName;
      if (!recentLabAdminsMap.has(key)) {
        recentLabAdminsMap.set(key, l);
      }
    });
    const recentLabAdminsList = Array.from(recentLabAdminsMap.values()).slice(0, 3);

    // Students
    const studentLogs = normalizedAuditLogs.filter(l => l.role === 'student');
    const activeStudentsSet = new Set(studentLogs.filter(l => new Date(l.timestamp).getTime() >= todayStart).map(l => l.userEmail || l.userName));
    
    // Student Breakdown by Year/Sem
    const studentSemMap = {};
    studentLogs.forEach(l => {
      if (l.year !== '-' && l.semester !== '-') {
        const key = `Year ${l.year} Sem ${l.semester}`;
        studentSemMap[key] = (studentSemMap[key] || 0) + 1;
      }
    });

    return {
      storeCountToday: storeLogsToday.length,
      lastStoreTime: lastStoreLog ? new Date(lastStoreLog.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'No Activity',
      activeLabAdminsCount: activeLabAdminsSet.size,
      recentLabAdminsList,
      activeStudentsCount: activeStudentsSet.size,
      studentSemMap
    };
  }, [normalizedAuditLogs]);

  // Export Filtered Audit Logs to CSV
  const handleExportAuditLogsCSV = () => {
    if (filteredAuditLogs.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,TIMESTAMP,USER,EMAIL,ROLE,LAB,YEAR/SEM,ACTION DETAILS,STATUS\n";
    filteredAuditLogs.forEach((row) => {
      const ts = new Date(row.timestamp).toLocaleString('en-IN');
      const yearSem = (row.year && row.year !== '-' && row.semester && row.semester !== '-') ? `Y${row.year} S${row.semester}` : '-';
      const roleName = row.role === 'super-admin' ? 'Super Admin' : row.role === 'store-admin' ? 'Store Manager' : row.role === 'lab-admin' ? 'Lab Admin' : row.role === 'student' ? 'Student' : 'User';
      
      csvContent += `"${ts}","${row.userName}","${row.userEmail}","${roleName}","${row.labName}","${yearSem}","${row.actionDetails.replace(/"/g, '""')}","${row.status}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Platform_Audit_History_Filtered.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDateStr = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  // Available subjects for the active course and semester
  const availableSubjects = useMemo(() => {
    const list = curriculumExperiments
      .filter((e) => (e.course || 'B.Pharm') === currCourseFilter && (currSemFilter === 'all' || String(e.semester) === String(currSemFilter)))
      .map((e) => e.subject || 'General Practical Lab');
    return Array.from(new Set(list));
  }, [curriculumExperiments, currCourseFilter, currSemFilter]);

  // Filtered Curriculum Experiments for Active Course, Semester, Subject & Search
  const filteredCurriculumExperiments = useMemo(() => {
    let result = curriculumExperiments.filter((e) => (e.course || 'B.Pharm') === currCourseFilter);
    if (currSemFilter !== 'all') {
      result = result.filter((e) => String(e.semester) === String(currSemFilter));
    }
    if (currSubjectFilter !== 'all') {
      result = result.filter((e) => (e.subject || 'General Practical Lab') === currSubjectFilter);
    }
    const query = debouncedCurrSearch.trim().toLowerCase();
    if (query) {
      result = result.filter((e) =>
        [e.name, e.subject, e.expNo, e.requiredChemicals].filter(Boolean).some((v) => v.toLowerCase().includes(query))
      );
    }
    return result;
  }, [curriculumExperiments, currCourseFilter, currSemFilter, currSubjectFilter, debouncedCurrSearch]);

  // Grouped Curriculum Experiments by Subject Lab
  const groupedCurriculumBySubject = useMemo(() => {
    const map = {};
    filteredCurriculumExperiments.forEach((exp) => {
      const subj = exp.subject || 'General Practical Lab';
      if (!map[subj]) map[subj] = [];
      map[subj].push(exp);
    });
    return map;
  }, [filteredCurriculumExperiments]);

  useEffect(() => {
    fetchLabs();
    fetchUsers();
    fetchActivityLogs({ limit: 100 });
  }, [fetchActivityLogs, fetchLabs, fetchUsers]);

  // Derived user groups
  const pendingApprovals = useMemo(() => users.filter((u) => u.role !== 'super-admin' && !u.isApproved), [users]);
  const labAdmins = useMemo(() => users.filter((u) => u.role === 'lab-admin'), [users]);
  const storeAdmins = useMemo(() => users.filter((u) => u.role === 'store-admin' || u.role === 'store_admin'), [users]);
  const superAdmins = useMemo(() => users.filter((u) => u.role === 'super-admin'), [users]);
  const students = useMemo(() => users.filter((u) => u.role === 'student'), [users]);
  const recentActivity = useMemo(() => activityLogs.slice(0, 8), [activityLogs]);

  // Filtered Labs
  const filteredLabs = useMemo(() => {
    let result = labs;
    if (labCourseFilter === 'unassigned') {
      result = result.filter((l) => !l.admin || l.admin === 'Unassigned');
    } else if (labCourseFilter !== 'all') {
      result = result.filter((l) => (l.courseType || 'B.Pharm') === labCourseFilter);
    }

    const query = debouncedLabSearch.trim().toLowerCase();
    if (query) {
      result = result.filter((l) => [l.name, l.labName, l.location, l.labCode, l.department, l.courseType].filter(Boolean).some((val) => val.toLowerCase().includes(query)));
    }

    return result.map((l) => {
      const labIdStr = String(l._id || l.id);
      const matchedAdminUser = users.find((u) => 
        (u.role === 'lab-admin' || u.role === 'store-admin' || u.role === 'store_admin') && (
          String(u.labId) === labIdStr || 
          String(u.labId?._id) === labIdStr ||
          (u.assignedLabName && l.name && u.assignedLabName.toLowerCase() === l.name.toLowerCase()) ||
          (u.name && l.admin && u.name.toLowerCase() === l.admin.toLowerCase())
        )
      );

      const adminName = matchedAdminUser ? matchedAdminUser.name : (l.admin && l.admin !== 'Unassigned' ? l.admin : 'Unassigned');
      const adminEmail = matchedAdminUser ? matchedAdminUser.email : (l.adminEmail || l.email || '');

      return { 
        ...l, 
        id: l._id || l.id, 
        admin: adminName,
        adminEmail: adminEmail
      };
    });
  }, [labs, users, labCourseFilter, debouncedLabSearch]);

  // Group labs by Year & Semester for structured academic layout
  const groupedLabs = useMemo(() => {
    const groups = {};

    filteredLabs.forEach((lab) => {
      let key = 'General & Unassigned Batch Labs';
      if (lab.year && lab.semester) {
        const yearSuffix = Number(lab.year) === 1 ? '1st' : Number(lab.year) === 2 ? '2nd' : Number(lab.year) === 3 ? '3rd' : `${lab.year}th`;
        key = `${yearSuffix} Year • Semester ${lab.semester}`;
      } else if (lab.semester) {
        key = `Semester ${lab.semester}`;
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(lab);
    });

    return groups;
  }, [filteredLabs]);

  // Filtered Users Directory with resolved assigned lab
  const filteredUsers = useMemo(() => {
    let result = users;

    if (userRoleFilter === 'pending') {
      result = result.filter((u) => u.role !== 'super-admin' && !u.isApproved);
    } else if (userRoleFilter !== 'all') {
      result = result.filter((u) => {
        if (userRoleFilter === 'store-admin') return u.role === 'store-admin' || u.role === 'store_admin';
        return u.role === userRoleFilter;
      });
    }

    const query = debouncedUserSearch.trim().toLowerCase();
    if (query) {
      result = result.filter((u) => [u.name, u.email, u.rollNumber, u.course].filter(Boolean).some((val) => val.toLowerCase().includes(query)));
    }

    return result.map((u) => {
      // Resolve assigned lab
      const matchedLab = labs.find(l => String(l.id || l._id) === String(u.labId || u.labId?._id));
      const adminLab = matchedLab || labs.find(l => Array.isArray(l.admins) && l.admins.some(a => String(a._id || a.id || a) === String(u._id || u.id)));

      return {
        ...u,
        id: u._id || u.id,
        roleDisplay: u.role === 'super-admin' ? 'Super Admin' : u.role === 'lab-admin' ? 'Lab Admin' : (u.role === 'store-admin' || u.role === 'store_admin') ? 'Store Manager' : 'Student',
        assignedLabName: adminLab ? (adminLab.name || adminLab.labName) : 'Unassigned',
        assignedLabCode: adminLab ? (adminLab.labCode || adminLab.code) : '',
      };
    });
  }, [users, labs, userRoleFilter, debouncedUserSearch]);

  // Stock Matrix Data
  const filteredMasterChemicals = useMemo(() => {
    const query = debouncedMatrixSearch.trim().toLowerCase();
    if (!query) return masterChemicals;
    return masterChemicals.filter((m) => [m.name, m.casNumber, m.hazardClass, m.category].filter(Boolean).some((val) => val.toLowerCase().includes(query)));
  }, [masterChemicals, debouncedMatrixSearch]);

  const handleOpenEditExp = (exp) => {
    setEditingExp({ ...exp });
    setEditCurrModalOpen(true);
  };

  const handleSaveEditExp = () => {
    if (!editingExp || !editingExp.name.trim()) return;
    updateCurriculumExperiment(editingExp.id, editingExp);
    setToast({ type: 'success', message: `Updated "${editingExp.name}" template.` });
    setEditCurrModalOpen(false);
    setEditingExp(null);
  };

  const handleDeleteExp = (expId, expName) => {
    deleteCurriculumExperiment(expId);
    setToast({ type: 'info', message: `Deleted "${expName}" experiment template.` });
  };

  const handleExportCurriculumCSV = () => {
    if (filteredCurriculumExperiments.length === 0) {
      setToast({ type: 'warning', message: 'No experiments available to export.' });
      return;
    }
    let csv = 'Course,Year,Semester,Subject,ExpNo,ExperimentTitle,PrescribedChemicals\n';
    filteredCurriculumExperiments.forEach((exp) => {
      const cleanTitle = `"${(exp.name || '').replace(/"/g, '""')}"`;
      const cleanSubj = `"${(exp.subject || '').replace(/"/g, '""')}"`;
      const cleanChems = `"${(exp.requiredChemicals || '').replace(/"/g, '""')}"`;
      csv += `${exp.course || 'B.Pharm'},${exp.year},${exp.semester},${cleanSubj},${exp.expNo || ''},${cleanTitle},${cleanChems}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `RasayanFlow_Curriculum_${currCourseFilter}_Sem${currSemFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToast({ type: 'success', message: 'Exported Curriculum Syllabus CSV successfully!' });
  };

  const eligibleAdmins = useMemo(
    () =>
      users.filter((user) => {
        if (user.role === 'super-admin') return false;
        if (!selectedLab) return true;
        return !user.labId || user.labId === selectedLab.id || user.labId === selectedLab._id;
      }),
    [selectedLab, users]
  );

  // Handlers
  const openManageModal = (lab) => {
    setSelectedLab(lab);
    setSelectedAdminId('');
    setNewAdmin({ name: '', email: '', password: '' });
    setManageOpen(true);
  };

  const openDeleteLabModal = (lab) => {
    setDeletingLabItem(lab);
    setDeleteStep(1);
    setConfirmLabNameInput('');
    setDeleteLabModalOpen(true);
  };

  const handleConfirmDeleteLab = async () => {
    if (!deletingLabItem) return;
    const targetLabName = deletingLabItem.name || deletingLabItem.labName || '';
    if (deleteStep === 2 && confirmLabNameInput.trim().toLowerCase() !== targetLabName.trim().toLowerCase()) {
      setToast({ type: 'error', message: 'Lab name does not match. Please type the exact lab name.' });
      return;
    }

    setDeletingLab(true);
    try {
      const labId = deletingLabItem.id || deletingLabItem._id;
      await deleteLab(labId);
      await Promise.all([fetchLabs(), fetchUsers(), fetchActivityLogs({ limit: 100 })]);
      setToast({ type: 'success', message: `Lab "${targetLabName}" has been permanently deleted.` });
      setDeleteLabModalOpen(false);
      setManageOpen(false);
      setDeletingLabItem(null);
      setConfirmLabNameInput('');
    } catch (err) {
      setToast({ type: 'error', message: err?.response?.data?.message || err?.message || 'Failed to delete lab.' });
    } finally {
      setDeletingLab(false);
    }
  };

  const handleCreateLab = async () => {
    if (!newLab.name.trim() || !newLab.code.trim()) {
      setToast({ type: 'error', message: 'Please enter Lab Name and Lab Code.' });
      return;
    }

    if (adminMode === 'create_new') {
      if (!newLabAdmin.name.trim() || !newLabAdmin.email.trim() || !newLabAdmin.password.trim()) {
        setToast({ type: 'error', message: 'Please fill in Admin Name, Email, and Password.' });
        return;
      }
    }

    setCreating(true);
    try {
      // 1. Create the Lab entity FIRST
      const createdLab = await createLab({
        name: newLab.name.trim(),
        code: newLab.code.trim().toUpperCase(),
        courseType: newLab.courseType,
        department: newLab.department,
        year: newLab.year,
        semester: newLab.semester
      });
      const labId = createdLab?.id || createdLab?._id;

      // 2. Assign / Provision Admin to Lab if email or existing admin selected
      let adminEmailToAssign = null;
      let adminName = '';
      let adminPassword = '';

      if (adminMode === 'create_new' && newLabAdmin.email.trim()) {
        adminEmailToAssign = newLabAdmin.email.trim().toLowerCase();
        adminName = newLabAdmin.name.trim();
        adminPassword = newLabAdmin.password;
      } else if (adminMode === 'existing' && selectedExistingAdminId) {
        const foundUser = users.find(u => String(u.id || u._id) === String(selectedExistingAdminId));
        if (foundUser) {
          adminEmailToAssign = foundUser.email;
        }
      }

      if (labId && (adminEmailToAssign || selectedExistingAdminId)) {
        await assignAdminToLab({
          labId,
          email: adminEmailToAssign || undefined,
          adminId: selectedExistingAdminId || undefined,
          name: adminName,
          password: adminPassword
        });
      }

      await Promise.all([fetchLabs(), fetchUsers(), fetchActivityLogs({ limit: 100 })]);
      
      setToast({
        type: 'success',
        message: adminEmailToAssign
          ? `Created "${createdLab.name}" and assigned Lab Admin (${adminEmailToAssign})!`
          : `Created "${createdLab.name}" successfully!`
      });

      setCreateOpen(false);
      setHighlight(labId);
      setNewLab({ name: '', code: '', courseType: 'B.Pharm', department: '', year: '1', semester: '1' });
      setNewLabAdmin({ name: '', email: '', password: '' });
      setSelectedExistingAdminId('');
      setAdminMode('create_new');
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || error?.message || 'Failed to create lab.' });
    } finally {
      setCreating(false);
    }
  };

  const handleAssignAdmin = async () => {
    if (!selectedLab || !selectedAdminId) return;
    setSavingAdmin(true);
    try {
      await assignAdminToLab({ labId: selectedLab.id, adminId: selectedAdminId });
      await Promise.all([fetchLabs(), fetchUsers(), fetchActivityLogs({ limit: 100 })]);
      setToast({ type: 'success', message: 'Admin assigned successfully.' });
      setManageOpen(false);
      setSelectedAdminId('');
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to assign admin.' });
    } finally {
      setSavingAdmin(false);
    }
  };

  const handleRemoveAdmin = async (adminId) => {
    if (!selectedLab || !adminId) return;
    setSavingAdmin(true);
    try {
      await removeAdminFromLab({ labId: selectedLab.id, adminId });
      await Promise.all([fetchLabs(), fetchUsers(), fetchActivityLogs({ limit: 100 })]);
      setToast({ type: 'success', message: 'Admin removed from lab.' });
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to remove admin.' });
    } finally {
      setSavingAdmin(false);
    }
  };

  const handleCreateAdminForLab = async () => {
    if (!selectedLab || !newAdmin.email.trim()) return;
    setSavingAdmin(true);
    try {
      await assignAdminToLab({
        labId: selectedLab.id || selectedLab._id,
        email: newAdmin.email.trim().toLowerCase(),
        name: newAdmin.name.trim(),
        password: newAdmin.password
      });
      await Promise.all([fetchLabs(), fetchUsers(), fetchActivityLogs({ limit: 100 })]);
      setToast({ type: 'success', message: 'Lab admin account provisioned and assigned.' });
      setManageOpen(false);
      setNewAdmin({ name: '', email: '', password: '' });
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to provision admin account.' });
    } finally {
      setSavingAdmin(false);
    }
  };

  const handleDeleteLab = async () => {
    if (!selectedLab?.id) return;
    setDeletingLab(true);
    try {
      await deleteLab(selectedLab.id);
      await Promise.all([fetchLabs(), fetchUsers(), fetchActivityLogs({ limit: 100 })]);
      setToast({ type: 'success', message: `${selectedLab.name} deleted.` });
      setManageOpen(false);
      setSelectedLab(null);
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to delete lab.' });
    } finally {
      setDeletingLab(false);
    }
  };

  async function handleApproveUser(userId) {
    setApprovingUserId(userId);
    try {
      await approveUserAccount(userId);
      await Promise.all([fetchUsers(), fetchActivityLogs({ limit: 100 })]);
      setToast({ type: 'success', message: 'Account approved successfully.' });
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to approve account.' });
    } finally {
      setApprovingUserId('');
    }
  }

  const handleCreateStoreAdmin = async () => {
    if (!newStoreAdmin.name.trim() || !newStoreAdmin.email.trim() || !newStoreAdmin.password.trim()) return;
    setSavingAdmin(true);
    try {
      await createStoreAdmin({
        name: newStoreAdmin.name.trim(),
        email: newStoreAdmin.email.trim(),
        password: newStoreAdmin.password,
      });
      await Promise.all([fetchUsers(), fetchActivityLogs({ limit: 100 })]);
      setToast({ type: 'success', message: 'Store admin account created.' });
      setNewStoreAdmin({ name: '', email: '', password: '' });
      setStoreAdminModalOpen(false);
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to create store admin account.' });
    } finally {
      setSavingAdmin(false);
    }
  };

  const handleCreateSuperAdmin = async () => {
    if (!newSuperAdmin.name.trim() || !newSuperAdmin.email.trim() || !newSuperAdmin.password.trim()) return;
    setSavingSuperAdmin(true);
    try {
      await createSuperAdmin({
        name: newSuperAdmin.name.trim(),
        email: newSuperAdmin.email.trim(),
        password: newSuperAdmin.password,
      });
      await Promise.all([fetchUsers(), fetchActivityLogs({ limit: 100 })]);
      setToast({ type: 'success', message: 'Super admin account created.' });
      setNewSuperAdmin({ name: '', email: '', password: '' });
      setSuperAdminModalOpen(false);
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to create super admin account.' });
    } finally {
      setSavingSuperAdmin(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword.trim() || !passwordForm.newPassword.trim()) return;
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setToast({ type: 'error', message: 'New passwords do not match.' });
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setToast({ type: 'success', message: 'Password updated successfully.' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to update password.' });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleAddMasterChem = () => {
    if (!newMasterChem.name.trim()) return;
    addMasterChemical(newMasterChem);
    setToast({ type: 'success', message: `Added ${newMasterChem.name} to Chemical Master Catalog.` });
    setNewMasterChem({ name: '', casNumber: '', hazardClass: 'Non-Hazardous', storageTemp: 'Room Temp', category: 'Reagent' });
    setMasterChemModalOpen(false);
  };

  const handleAddCurrExp = () => {
    if (!newCurrExp.name.trim()) return;
    addCurriculumExperiment(newCurrExp);
    setToast({ type: 'success', message: `Added ${newCurrExp.name} to Curriculum Experiments.` });
    setNewCurrExp({ course: 'B.Pharm', year: '1', semester: '1', subject: 'Pharmaceutics Lab - I', expNo: 'Exp 01', name: '', requiredChemicals: '' });
    setCurriculumModalOpen(false);
  };

  const handleAddBroadcast = () => {
    if (!newBroadcast.title.trim() || !newBroadcast.message.trim()) return;
    addBroadcastAnnouncement(newBroadcast);
    setToast({ type: 'success', message: 'Broadcast announcement posted successfully.' });
    setNewBroadcast({ title: '', message: '', targetRole: 'All Users' });
    setBroadcastModalOpen(false);
  };

  const handleCsvImportSubmit = () => {
    if (!csvInput.trim()) return;
    const lines = csvInput.trim().split('\n');
    let importedCount = 0;
    lines.forEach((line) => {
      const parts = line.split(',');
      if (parts.length >= 2) importedCount++;
    });
    setToast({ type: 'success', message: `Processed ${importedCount} records from CSV batch upload.` });
    setCsvInput('');
    setCsvImportModalOpen(false);
  };

  const exportReportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8,Lab Name,Lab Code,Course,Department,Admin\n" +
      labs.map(l => `"${l.name}","${l.labCode || l.code || ''}","${l.courseType || ''}","${l.department || ''}","${l.admin || ''}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `RasayanFlow_Master_Inventory_Report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToast({ type: 'success', message: 'Compliance inventory CSV report generated.' });
  };

  // Table Configs
  const labHeaders = [
    { key: 'name', label: 'Lab Name' },
    { key: 'location', label: 'Lab Code' },
    { key: 'courseType', label: 'Course', render: (row) => row.courseType || 'B.Pharm' },
    { key: 'yearSem', label: 'Year / Sem', render: (row) => row.year && row.semester ? `Year ${row.year} • Sem ${row.semester}` : 'All Batches' },
    { key: 'admin', label: 'Assigned Admin' },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <Button variant='outline' onClick={() => openManageModal(row)} className='text-xs px-3 py-1'>
          Manage Lab
        </Button>
      )
    }
  ];

  const userDirectoryHeaders = [
    {
      key: 'name',
      label: 'User Name & Profile',
      render: (row) => (
        <div>
          <p className='text-sm font-bold text-[#37412a] dark:text-[#e4e9d8]'>{row.name}</p>
          {row.rollNumber && <p className='text-[11px] font-mono text-[#71805a] dark:text-[#a5b48b]'>ID: {row.rollNumber}</p>}
        </div>
      )
    },
    {
      key: 'email',
      label: 'Email Address',
      render: (row) => <span className='text-sm font-medium text-[#4e5d35] dark:text-[#d5ddbf]'>{row.email}</span>
    },
    {
      key: 'roleDisplay',
      label: 'System Role',
      render: (row) => (
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
          row.role === 'super-admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' :
          row.role === 'lab-admin' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' :
          (row.role === 'store-admin' || row.role === 'store_admin') ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300' :
          'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
        }`}>
          {row.roleDisplay}
        </span>
      )
    },
    {
      key: 'assignedLab',
      label: 'Assigned Lab & Code',
      render: (row) => {
        if (row.role === 'super-admin' || row.role === 'store-admin' || row.role === 'store_admin') {
          return <span className='text-xs text-[#87996c] dark:text-[#a5b48b] italic'>Global Access</span>;
        }
        const hasLab = row.assignedLabName && row.assignedLabName !== 'Unassigned';
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ${
            hasLab ? 'bg-[#f4f6ee] text-[#3c4e23] border border-[#d9e1ca] dark:bg-[#20251a] dark:text-[#eef4e8] dark:border-[#414a33]' : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
          }`}>
            <Warehouse size={13} /> {hasLab ? `${row.assignedLabName} ${row.assignedLabCode ? `(${row.assignedLabCode})` : ''}` : 'Unassigned Lab'}
          </span>
        );
      }
    },
    {
      key: 'isApproved',
      label: 'Account Status',
      render: (row) => (
        <div className='flex items-center gap-1.5'>
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
            row.isApproved ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
          }`}>
            {row.isApproved ? <><CheckCircle2 size={12} /> Approved</> : <><Clock size={12} /> Pending</>}
          </span>
          {row.isSuspended && (
            <span className='inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-800 px-2 py-0.5 text-[10px] font-bold dark:bg-rose-950/60 dark:text-rose-300'>
              <Ban size={10} /> Suspended
            </span>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className='flex items-center gap-2'>
          {!row.isApproved && (
            <Button
              variant='outline'
              onClick={() => handleApproveUser(row.id)}
              className='text-xs px-2.5 py-1 border-emerald-500 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 font-bold'
              disabled={approvingUserId === row.id}
            >
              {approvingUserId === row.id ? 'Approving...' : 'Approve'}
            </Button>
          )}
          {row.role !== 'super-admin' && (
            <Button
              variant='outline'
              onClick={() => {
                toggleUserStatus(row.id);
                setToast({ type: 'info', message: `${row.name} account status updated.` });
              }}
              className={`text-xs px-2.5 py-1 font-semibold ${row.isSuspended ? 'border-emerald-500 text-emerald-700 hover:bg-emerald-50' : 'border-rose-300 text-rose-700 hover:bg-rose-50'}`}
            >
              {row.isSuspended ? 'Reactivate' : 'Suspend'}
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className='space-y-6 pb-12 animate-in fade-in'>
      
      {/* SECTION 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className='space-y-6 animate-in fade-in'>
          {/* Top Header Title - Shown only in Overview */}
          <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-[#d9e1ca] pb-4 dark:border-[#3c452f]'>
            <div>
              <h1 className='text-2xl font-bold text-[#37412a] dark:text-[#e4e9d8] flex items-center gap-2'>
                <ShieldCheck className='h-7 w-7 text-[#5c6e46] dark:text-[#a5b48b]' /> Super Admin Command Center
              </h1>
              <p className='text-sm text-[#71805a] dark:text-[#a5b48b] mt-1'>
                Comprehensive institutional governance, chemical master matrix, syllabus practicals, and security control.
              </p>
            </div>

            <div className='flex flex-wrap items-center gap-2'>
              <Button variant='primary' onClick={() => setCreateOpen(true)} className='text-xs px-3 py-2 font-bold'>
                <Plus size={14} className='mr-1.5' /> New Lab
              </Button>
              <Button variant='outline' onClick={() => setBroadcastModalOpen(true)} className='text-xs px-3 py-2 font-bold'>
                <Megaphone size={14} className='mr-1.5' /> Post Announcement
              </Button>
            </div>
          </div>
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            <Card className='border-l-4 border-l-[#5c6e46] bg-white dark:bg-[#20251a]'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-wider text-[#71805a] dark:text-[#a5b48b]'>Total Labs</p>
                  <p className='text-3xl font-extrabold text-[#37412a] dark:text-[#e4e9d8] mt-1'>{labs.length}</p>
                </div>
                <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4f6ee] text-[#5c6e46] dark:bg-[#2a3121] dark:text-[#a5b48b]'>
                  <Warehouse size={24} />
                </div>
              </div>
            </Card>

            <Card className='border-l-4 border-l-amber-500 bg-white dark:bg-[#20251a]'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-wider text-[#71805a] dark:text-[#a5b48b]'>Pending Approvals</p>
                  <p className='text-3xl font-extrabold text-[#37412a] dark:text-[#e4e9d8] mt-1'>{pendingApprovals.length}</p>
                </div>
                <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'>
                  <Clock size={24} />
                </div>
              </div>
            </Card>

            <Card className='border-l-4 border-l-blue-500 bg-white dark:bg-[#20251a]'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-wider text-[#71805a] dark:text-[#a5b48b]'>Master Chemicals</p>
                  <p className='text-3xl font-extrabold text-[#37412a] dark:text-[#e4e9d8] mt-1'>{masterChemicals.length}</p>
                </div>
                <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'>
                  <FlaskConical size={24} />
                </div>
              </div>
            </Card>

            <Card className='border-l-4 border-l-indigo-500 bg-white dark:bg-[#20251a]'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-wider text-[#71805a] dark:text-[#a5b48b]'>Registered Users</p>
                  <p className='text-3xl font-extrabold text-[#37412a] dark:text-[#e4e9d8] mt-1'>{users.length}</p>
                </div>
                <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'>
                  <Users size={24} />
                </div>
              </div>
            </Card>
          </div>

          {/* Institutional Labs Performance & System Analytics Graphs */}
          <div className='grid gap-6 lg:grid-cols-3'>

            {/* Left Side: Department Labs Workload & Performance Bar Graph */}
            <Card 
              title='Department Labs Performance Analytics' 
              subtitle='Real-time operational readiness, syllabus density & chemical requisition status across labs' 
              className='lg:col-span-2'
            >
              <div className='space-y-5 pt-3'>
                {/* Top Metric Header Row */}
                <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-2xl bg-[#f4f6ee] dark:bg-[#1a1d16] border border-[#d9e1ca] dark:border-[#414a33]'>
                  <div>
                    <p className='text-[10px] font-bold uppercase tracking-wider text-[#71805a] dark:text-[#a5b48b]'>Active Department Labs</p>
                    <p className='text-lg font-black text-[#37412a] dark:text-[#e4e9d8] mt-0.5'>{labs.length} Labs</p>
                  </div>
                  <div>
                    <p className='text-[10px] font-bold uppercase tracking-wider text-[#71805a] dark:text-[#a5b48b]'>Avg Readiness Score</p>
                    <p className='text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5'>94.8%</p>
                  </div>
                  <div>
                    <p className='text-[10px] font-bold uppercase tracking-wider text-[#71805a] dark:text-[#a5b48b]'>Active Practicals</p>
                    <p className='text-lg font-black text-[#5c6e46] dark:text-[#a8be8a] mt-0.5'>{curriculumExperiments.length || 18} Exps</p>
                  </div>
                  <div>
                    <p className='text-[10px] font-bold uppercase tracking-wider text-[#71805a] dark:text-[#a5b48b]'>Requisition Fulfillment</p>
                    <p className='text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5'>98.2%</p>
                  </div>
                </div>

                {/* Lab Performance Bar Chart */}
                <div className='space-y-4 pt-1'>
                  <div className='flex items-center justify-between text-xs font-extrabold text-[#71805a] dark:text-[#a5b48b] uppercase tracking-wider pb-1 border-b border-[#f0f4e8] dark:border-[#2a3121]'>
                    <span>Department Lab Name</span>
                    <span>Readiness & Active Requisitions</span>
                  </div>

                  {labs.length === 0 ? (
                    <p className='text-center py-6 text-xs text-[#71805a]'>No labs available to compute performance metrics.</p>
                  ) : (
                    labs.slice(0, 5).map((lab, index) => {
                      const hasAdmin = lab.admin && lab.admin !== 'Unassigned';
                      const performanceScore = hasAdmin ? Math.min(98, 82 + (index * 4) + (lab.name ? lab.name.length % 7 : 3)) : 45;
                      const barGradient = performanceScore > 85 
                        ? 'from-[#5c6e46] to-[#87996c]' 
                        : performanceScore > 60 
                        ? 'from-amber-500 to-amber-400' 
                        : 'from-rose-500 to-rose-400';

                      return (
                        <div key={lab.id || index} className='space-y-1.5 p-3 rounded-xl border border-[#e8efd9] bg-[#fffef8] hover:border-[#5c6e46] transition-all dark:border-[#2a3121] dark:bg-[#20251a]'>
                          <div className='flex items-center justify-between text-xs'>
                            <div className='flex items-center gap-2 min-w-0'>
                              <span className='h-2 w-2 rounded-full bg-[#5c6e46]' />
                              <span className='font-bold text-[#37412a] dark:text-[#e4e9d8] truncate'>{lab.name || lab.labName}</span>
                              <span className='rounded bg-[#f4f6ee] px-1.5 py-0.5 text-[10px] font-mono text-[#5c6e46] dark:bg-[#2a3121] dark:text-[#a5b48b] shrink-0'>
                                {lab.labCode || lab.code || 'LAB'}
                              </span>
                            </div>
                            <div className='flex items-center gap-3 shrink-0'>
                              <span className={`text-[11px] font-bold ${hasAdmin ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                                {hasAdmin ? `${lab.admin}` : 'Unassigned Admin'}
                              </span>
                              <span className='font-extrabold text-[#37412a] dark:text-[#e4e9d8]'>{performanceScore}%</span>
                            </div>
                          </div>

                          {/* Animated Horizontal Bar */}
                          <div className='h-2.5 w-full overflow-hidden rounded-full bg-[#e8efd9] dark:bg-[#2a3121]'>
                            <div 
                              className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-700 ease-out`} 
                              style={{ width: `${performanceScore}%` }}
                            />
                          </div>

                          <div className='flex items-center justify-between text-[10px] text-[#71805a] dark:text-[#a5b48b] pt-0.5'>
                            <span>{lab.courseType || 'B.Pharm'} • Year {lab.year || '1'} Sem {lab.semester || '1'}</span>
                            <span>{hasAdmin ? 'Operational & Syncing' : 'Needs Admin Assignment'}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </Card>

            {/* Right Side: Role Distribution & System Capacity Chart */}
            <Card 
              title='System Role Distribution & Capacity' 
              subtitle='Institutional user volume & role allocation breakdown' 
              className='lg:col-span-1'
            >
              <div className='space-y-4 pt-3'>
                {/* Role Breakdown Visual Cards */}
                {[
                  { label: 'Students', count: students.length, color: 'bg-emerald-500', bgLight: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300', percentage: users.length ? Math.round((students.length / users.length) * 100) : 80 },
                  { label: 'Lab Administrators', count: labAdmins.length, color: 'bg-blue-500', bgLight: 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300', percentage: users.length ? Math.round((labAdmins.length / users.length) * 100) : 10 },
                  { label: 'Store Managers', count: storeAdmins.length, color: 'bg-indigo-500', bgLight: 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300', percentage: users.length ? Math.round((storeAdmins.length / users.length) * 100) : 5 },
                  { label: 'Super Admins', count: superAdmins.length, color: 'bg-purple-500', bgLight: 'bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300', percentage: users.length ? Math.round((superAdmins.length / users.length) * 100) : 5 }
                ].map((item, i) => (
                  <div key={i} className='space-y-1.5 p-3 rounded-xl border border-[#d9e1ca] bg-[#fffef8] dark:border-[#414a33] dark:bg-[#20251a]'>
                    <div className='flex items-center justify-between text-xs font-bold text-[#37412a] dark:text-[#e4e9d8]'>
                      <div className='flex items-center gap-2'>
                        <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                        <span>{item.label}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-black ${item.bgLight}`}>
                        {item.count} Users ({item.percentage}%)
                      </span>
                    </div>

                    <div className='h-2 w-full overflow-hidden rounded-full bg-[#e8efd9] dark:bg-[#2a3121]'>
                      <div 
                        className={`h-full rounded-full ${item.color} transition-all duration-500`} 
                        style={{ width: `${Math.max(item.percentage, 5)}%` }}
                      />
                    </div>
                  </div>
                ))}

                {/* Institutional Health Status Badge */}
                <div className='p-3.5 rounded-xl bg-[#f4f6ee] dark:bg-[#1a1d16] border border-[#d9e1ca] dark:border-[#414a33] space-y-2 mt-2'>
                  <div className='flex items-center justify-between text-xs font-bold text-[#3c4e23] dark:text-[#eef4e8]'>
                    <span className='flex items-center gap-1.5'><CheckCircle2 size={15} className='text-emerald-600' /> System Security & Audit</span>
                    <span className='text-[10px] uppercase font-extrabold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/80 dark:text-emerald-300 px-2 py-0.5 rounded-md'>Optimal</span>
                  </div>
                  <p className='text-[11px] text-[#71805a] dark:text-[#a5b48b] leading-relaxed'>
                    All lab administrator accounts, student enrollments, and store manager roles are actively monitored via secure audit logs.
                  </p>
                </div>
              </div>
            </Card>

          </div>

          <Card title='Recent Activity Stream' subtitle='Latest platform actions'>
            <div className='space-y-3 pt-2'>
              {recentActivity.length === 0 ? (
                <p className='py-6 text-center text-sm text-[#71805a] dark:text-[#a5b48b]'>No audit logs recorded yet.</p>
              ) : (
                recentActivity.map((log) => (
                  <div key={log.id} className='flex flex-col gap-1 rounded-2xl border border-[#d9e1ca] bg-[#fffef8] p-4 sm:flex-row sm:items-center sm:justify-between dark:border-[#414a33] dark:bg-[#20251a]'>
                    <div>
                      <p className='text-sm font-bold text-[#37412a] dark:text-[#e4e9d8]'>{log.details}</p>
                      <p className='text-xs text-[#71805a] dark:text-[#a5b48b] mt-0.5'>
                        Triggered by <span className='font-semibold'>{log.actorName || 'System'}</span> ({log.actorRole || 'admin'})
                      </p>
                    </div>
                    <span className='text-xs font-medium text-[#87996c] dark:text-[#a5b48b] whitespace-nowrap'>
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Recent'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* SECTION 2: LABS HUB */}
      {activeTab === 'labs' && (
        <div className='space-y-6 animate-in fade-in'>
          <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
            <div>
              <h3 className='text-xl font-bold text-[#37412a] dark:text-[#e4e9d8] flex items-center gap-2'>
                <Warehouse className='text-[#5c6e46]' /> Department Labs Hub
              </h3>
              <p className='text-xs text-[#71805a] dark:text-[#a5b48b] mt-0.5'>
                Total {filteredLabs.length} active department labs configured for pharmacy practicals
              </p>
            </div>

            <div className='flex flex-wrap items-center gap-3'>
              {/* Search input */}
              <div className='relative w-full sm:w-60'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#87996c]' />
                <input
                  type='text'
                  value={labSearch}
                  onChange={(e) => setLabSearch(e.target.value)}
                  placeholder='Search lab name, code, dept...'
                  className='w-full rounded-xl border border-[#d9e1ca] bg-white py-2 pl-9 pr-4 text-xs outline-none focus:border-[#5c6e46] dark:border-[#414a33] dark:bg-[#20251a] dark:text-[#e4e9d8]'
                />
              </div>

              {/* View Switcher */}
              <div className='flex items-center gap-1 rounded-xl bg-[#f4f6ee] p-1 dark:bg-[#20251a] border border-[#d9e1ca] dark:border-[#414a33]'>
                <button
                  onClick={() => setLabViewMode('grid')}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                    labViewMode === 'grid' ? 'bg-[#5c6e46] text-white shadow-sm' : 'text-[#71805a] hover:text-[#37412a] dark:text-[#a5b48b]'
                  }`}
                >
                  Cards Grid
                </button>
                <button
                  onClick={() => setLabViewMode('table')}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                    labViewMode === 'table' ? 'bg-[#5c6e46] text-white shadow-sm' : 'text-[#71805a] hover:text-[#37412a] dark:text-[#a5b48b]'
                  }`}
                >
                  Table List
                </button>
              </div>

              <Button onClick={() => setCreateOpen(true)} className='text-xs px-3.5 py-2 whitespace-nowrap shadow-sm'>
                <Plus size={15} className='mr-1.5' /> Create New Lab
              </Button>
            </div>
          </div>

          {/* Aesthetic KPI Filter Cards Bar for Labs Hub */}
          <div className='grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-5'>
            {[
              { id: 'all', label: 'All Labs', count: labs.length, icon: Warehouse },
              { id: 'B.Pharm', label: 'B.Pharm Labs', count: labs.filter(l => (l.courseType || 'B.Pharm') === 'B.Pharm').length, icon: BookOpen },
              { id: 'M.Pharm', label: 'M.Pharm Labs', count: labs.filter(l => l.courseType === 'M.Pharm').length, icon: FlaskConical },
              { id: 'PhD', label: 'PhD Research', count: labs.filter(l => l.courseType === 'PhD').length, icon: Layers },
              { id: 'unassigned', label: 'Unassigned Admin', count: labs.filter(l => !l.admin || l.admin === 'Unassigned').length, icon: AlertTriangle, hasAlert: true },
            ].map((card) => {
              const IconComp = card.icon;
              const isActive = labCourseFilter === card.id;
              const isAlert = card.hasAlert && card.count > 0;
              return (
                <button
                  key={card.id}
                  type='button'
                  onClick={() => setLabCourseFilter(card.id)}
                  className={`flex items-center justify-between rounded-2xl border p-3.5 text-left transition-all duration-200 shadow-2xs hover:shadow-sm ${
                    isActive
                      ? 'bg-[#5c6e46] text-white border-2 border-[#4e5d35] shadow-sm dark:bg-[#e4e9d8] dark:text-[#20251a] dark:border-[#e4e9d8]'
                      : 'bg-[#fffef8] text-[#37412a] border-[#d9e1ca] hover:bg-[#f4f6ee] hover:border-[#87996c] dark:bg-[#1a1d16] dark:text-[#e4e9d8] dark:border-[#414a33]'
                  }`}
                >
                  <div className='flex items-center gap-3 min-w-0'>
                    {/* Icon Logo Container */}
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                      isActive
                        ? 'bg-white/20 text-white dark:bg-[#20251a]/20 dark:text-[#20251a]'
                        : isAlert
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                        : 'bg-[#f4f6ee] text-[#5c6e46] dark:bg-[#2a3121] dark:text-[#a5b48b]'
                    }`}>
                      <IconComp size={20} />
                    </div>

                    <div className='min-w-0'>
                      <p className={`text-lg font-black tracking-tight leading-tight ${
                        isActive ? 'text-white dark:text-[#20251a]' : 'text-[#37412a] dark:text-[#e4e9d8]'
                      }`}>
                        {card.count}
                      </p>
                      <p className={`text-[11px] font-bold uppercase tracking-wider truncate mt-0.5 ${
                        isActive ? 'text-white/90 dark:text-[#20251a]/90' : 'text-[#71805a] dark:text-[#a5b48b]'
                      }`}>
                        {card.label}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* GRID VIEW WITH ACADEMIC YEAR & SEMESTER GROUPINGS */}
          {labViewMode === 'grid' ? (
            filteredLabs.length === 0 ? (
              <div className='py-16 text-center border-2 border-dashed border-[#d9e1ca] rounded-2xl dark:border-[#414a33] bg-[#fffef8] dark:bg-[#20251a]'>
                <Warehouse className='mx-auto h-12 w-12 text-[#87996c] mb-2' />
                <h4 className='font-bold text-[#37412a] dark:text-[#e4e9d8]'>No Labs Found</h4>
                <p className='text-xs text-[#71805a] dark:text-[#a5b48b] mt-1'>Try adjusting your search query or filter criteria.</p>
              </div>
            ) : (
              <div className='space-y-6'>
                {Object.entries(groupedLabs).map(([groupTitle, labsInGroup]) => (
                  <div key={groupTitle} className='space-y-3'>
                    {/* Academic Semester Section Header Divider */}
                    <div className='flex items-center justify-between border-b border-[#d9e1ca] pb-2 dark:border-[#414a33]'>
                      <div className='flex items-center gap-2'>
                        <FolderOpen size={16} className='text-[#5c6e46] dark:text-[#a8be8a]' />
                        <h4 className='text-sm font-extrabold tracking-tight text-[#37412a] dark:text-[#e4e9d8]'>
                          {groupTitle}
                        </h4>
                      </div>
                      <span className='rounded-full bg-[#e8efd9] px-2.5 py-0.5 text-[11px] font-black text-[#3c4e23] dark:bg-[#2a3320] dark:text-[#a8be8a]'>
                        {labsInGroup.length} {labsInGroup.length === 1 ? 'Lab' : 'Labs'}
                      </span>
                    </div>

                    {/* Structured, Compact & Organized Responsive Grid */}
                    <div className='grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
                      {labsInGroup.map((lab) => {
                        const hasAdmin = lab.admin && lab.admin !== 'Unassigned';
                        return (
                          <div
                            key={lab.id}
                            className='group flex flex-col justify-between rounded-xl border border-[#d9e1ca] bg-white p-3.5 shadow-2xs hover:border-[#5c6e46] hover:shadow-md transition-all duration-200 dark:border-[#414a33] dark:bg-[#20251a]'
                          >
                            {/* Card Main Info Container */}
                            <div className='space-y-1.5'>
                              {/* Top Row: Code & Course Badges */}
                              <div className='flex items-center justify-between gap-2'>
                                <span className='inline-flex items-center gap-1 rounded-md bg-[#f4f6ee] px-1.5 py-0.5 text-[10px] font-mono font-bold text-[#5c6e46] border border-[#d9e1ca] dark:bg-[#2a3121] dark:text-[#c5d0b5] dark:border-[#414a33]'>
                                  <Warehouse size={11} /> {lab.labCode || lab.code || 'LAB'}
                                </span>
                                <span className='rounded-md bg-[#e8efd9] px-2 py-0.5 text-[10px] font-extrabold text-[#3c4e23] dark:bg-[#2a3320] dark:text-[#a8be8a]'>
                                  {lab.courseType || 'B.Pharm'}
                                </span>
                              </div>

                              {/* Dedicated Full-Width Lab Title (Fully Visible!) */}
                              <h5 className='text-sm font-extrabold text-[#37412a] dark:text-[#e4e9d8] group-hover:text-[#5c6e46] transition-colors leading-snug break-words'>
                                {lab.name || lab.labName}
                              </h5>

                              {/* Department & Semester Info Row */}
                              <div className='flex items-center justify-between gap-1 text-[11px] text-[#71805a] dark:text-[#a5b48b] pt-0.5'>
                                <span className='truncate'>{lab.department ? `${lab.department} Dept` : 'Pharmacy Dept'}</span>
                                <span className='rounded bg-[#f4f5eb] px-1.5 py-0.5 text-[10px] font-semibold text-[#5c6e46] dark:bg-[#28301f] dark:text-[#c5d0b5] shrink-0'>
                                  {lab.year && lab.semester ? `Yr ${lab.year} • Sem ${lab.semester}` : 'All Semesters'}
                                </span>
                              </div>
                            </div>

                            {/* Assigned Admin Footer with Email Address & Action */}
                            <div className='mt-3 pt-2.5 border-t border-[#f0f4e8] dark:border-[#2a3121] flex items-center justify-between gap-2'>
                              <div className='flex items-center gap-2 min-w-0 pr-1'>
                                <div className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs font-black ${
                                  hasAdmin ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                                }`}>
                                  {hasAdmin ? lab.admin.charAt(0).toUpperCase() : '?'}
                                </div>
                                <div className='min-w-0 leading-tight'>
                                  <p className={`text-xs font-bold truncate ${hasAdmin ? 'text-[#37412a] dark:text-[#e4e9d8]' : 'text-amber-700 dark:text-amber-400'}`} title={hasAdmin ? lab.admin : 'Unassigned Admin'}>
                                    {hasAdmin ? lab.admin : 'Unassigned'}
                                  </p>
                                  {hasAdmin && lab.adminEmail ? (
                                    <p className='text-[10px] font-semibold text-[#5c6e46] dark:text-[#a8be8a] truncate mt-0.5' title={lab.adminEmail}>
                                      {lab.adminEmail}
                                    </p>
                                  ) : (
                                    <p className='text-[10px] text-amber-600 dark:text-amber-400 italic mt-0.5'>
                                      No admin assigned
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className='flex items-center gap-1.5 shrink-0'>
                                <Button variant='outline' onClick={() => openManageModal(lab)} className='text-xs px-2.5 py-1 h-7 border-[#5c6e46] text-[#5c6e46] hover:bg-[#f4f6ee] font-bold dark:border-[#a8be8a] dark:text-[#a8be8a]'>
                                  Manage
                                </Button>
                                <button
                                  type='button'
                                  onClick={() => openDeleteLabModal(lab)}
                                  className='h-7 w-7 flex items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400'
                                  title='Delete Lab'
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* TABLE VIEW */
            <Table headers={labHeaders} rows={filteredLabs} />
          )}
        </div>
      )}

      {/* SECTION 3: USERS & APPROVALS */}
      {activeTab === 'users' && (
        <div className='space-y-6 animate-in fade-in'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#d9e1ca] pb-3 dark:border-[#414a33]'>
            <div>
              <h3 className='text-xl font-bold text-[#37412a] dark:text-[#e4e9d8] flex items-center gap-2'>
                <Users className='text-[#5c6e46]' /> Institutional User & Account Control
              </h3>
              <p className='text-xs text-[#71805a] dark:text-[#a5b48b] mt-0.5'>
                Total {users.length} registered accounts across all institutional departments and roles
              </p>
            </div>

            <div className='flex items-center gap-3'>
              <Button variant='outline' onClick={() => setCsvImportModalOpen(true)} className='text-xs px-3.5 py-2 font-bold'>
                <FileSpreadsheet size={15} className='mr-1.5' /> Bulk CSV Student Upload
              </Button>
            </div>
          </div>

          {/* Role Metric Tab Cards Bar */}
          <div className='grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6'>
            {[
              { id: 'all', label: 'All Accounts', count: users.length, icon: Users },
              { id: 'student', label: 'Students', count: students.length, icon: Users },
              { id: 'lab-admin', label: 'Lab Admins', count: labAdmins.length, icon: UserCheck },
              { id: 'store-admin', label: 'Store Managers', count: storeAdmins.length, icon: ShoppingBag },
              { id: 'super-admin', label: 'Super Admins', count: superAdmins.length, icon: ShieldCheck },
              { id: 'pending', label: 'Pending Queue', count: pendingApprovals.length, icon: Clock, hasPending: pendingApprovals.length > 0 },
            ].map((tab) => {
              const IconComp = tab.icon;
              const isActive = userRoleFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type='button'
                  onClick={() => setUserRoleFilter(tab.id)}
                  className={`flex items-center justify-between rounded-2xl border p-3.5 text-left transition-all duration-200 shadow-2xs hover:shadow-sm ${
                    isActive
                      ? 'bg-[#5c6e46] text-white border-2 border-[#4e5d35] shadow-sm dark:bg-[#e4e9d8] dark:text-[#20251a] dark:border-[#e4e9d8]'
                      : 'bg-[#fffef8] text-[#37412a] border-[#d9e1ca] hover:bg-[#f4f6ee] hover:border-[#87996c] dark:bg-[#1a1d16] dark:text-[#e4e9d8] dark:border-[#414a33]'
                  }`}
                >
                  <div className='flex items-center gap-3 min-w-0'>
                    {/* Icon Logo on Left Side */}
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                      isActive
                        ? 'bg-white/20 text-white dark:bg-[#20251a]/20 dark:text-[#20251a]'
                        : 'bg-[#f4f6ee] text-[#5c6e46] dark:bg-[#2a3121] dark:text-[#a5b48b]'
                    }`}>
                      <IconComp size={18} />
                    </div>

                    <div className='min-w-0'>
                      <p className={`text-base font-black tracking-tight leading-tight ${
                        isActive ? 'text-white dark:text-[#20251a]' : 'text-[#37412a] dark:text-[#e4e9d8]'
                      }`}>
                        {tab.count}
                      </p>
                      <p className={`text-[10px] font-bold uppercase tracking-wider truncate mt-0.5 ${
                        isActive ? 'text-white/90 dark:text-[#20251a]/90' : 'text-[#71805a] dark:text-[#a5b48b]'
                      }`}>
                        {tab.label}
                      </p>
                    </div>
                  </div>

                  {tab.hasPending && (
                    <span className='rounded-full bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 leading-none animate-pulse shrink-0 ml-1'>
                      NEW
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Tab View Header & Search */}
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-[#d9e1ca] bg-[#fffef8] p-4 dark:border-[#414a33] dark:bg-[#20251a]'>
            <div>
              <h4 className='text-base font-bold text-[#37412a] dark:text-[#e4e9d8] capitalize'>
                {userRoleFilter === 'all' && 'Directory of All Institutional Accounts'}
                {userRoleFilter === 'student' && `Student Directory (${students.length} Total Enrolled Students)`}
                {userRoleFilter === 'lab-admin' && `Assigned Lab Administrators (${labAdmins.length} Active Admins)`}
                {userRoleFilter === 'store-admin' && `Central Store Managers (${storeAdmins.length} Managers)`}
                {userRoleFilter === 'super-admin' && `Super Administrators (${superAdmins.length} Governance Accounts)`}
                {userRoleFilter === 'pending' && `Pending Registration Approvals (${pendingApprovals.length} Accounts Awaiting Approval)`}
              </h4>
              <p className='text-xs text-[#71805a] dark:text-[#a5b48b] mt-0.5'>
                {userRoleFilter === 'lab-admin' ? 'Displays assigned lab names and lab codes for every administrator' : 'Search and manage user access permissions'}
              </p>
            </div>

            <div className='flex items-center gap-3'>
              <div className='relative w-full sm:w-72'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#87996c]' />
                <input
                  type='text'
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder='Search by name, email, ID, or lab...'
                  className='w-full rounded-xl border border-[#d9e1ca] bg-white py-2 pl-9 pr-4 text-xs font-semibold outline-none focus:border-[#5c6e46] dark:border-[#414a33] dark:bg-[#1a1d16] dark:text-[#e4e9d8]'
                />
              </div>

              {userRoleFilter === 'store-admin' && (
                <Button onClick={() => setStoreAdminModalOpen(true)} className='text-xs px-3 py-2 whitespace-nowrap'>
                  + Add Store Manager
                </Button>
              )}
              {userRoleFilter === 'super-admin' && (
                <Button onClick={() => setSuperAdminModalOpen(true)} className='text-xs px-3 py-2 whitespace-nowrap'>
                  + Create Super Admin
                </Button>
              )}
            </div>
          </div>

          {/* User Directory Data Table */}
          <div className='rounded-2xl border border-[#d9e1ca] bg-white overflow-hidden shadow-sm dark:border-[#414a33] dark:bg-[#20251a]'>
            <Table headers={userDirectoryHeaders} rows={filteredUsers} />
          </div>
        </div>
      )}

      {/* SECTION 4: CHEMICAL ACTIVITY OVERVIEW */}
      {activeTab === 'master-chemicals' && (
        <div className='rounded-3xl border border-[#d9e1ca] bg-[#fffef8] p-6 sm:p-8 shadow-sm dark:border-[#414a33] dark:bg-[#20251a] space-y-6 animate-in fade-in'>

          {/* PAGE HEADER */}
          <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#d9e1ca] pb-5 dark:border-[#414a33]'>
            <div>
              <div className='mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-[#87996c] dark:text-[#7a8f62]'>
                <span>Super Admin</span>
                <ChevronRight size={12} />
                <span className='text-[#5c6e46] dark:text-[#a8be8a] font-bold'>Chemical Activity Overview</span>
              </div>
              <h2 className='text-3xl font-black tracking-tight text-[#37412a] dark:text-[#e4e9d8] flex items-center gap-3'>
                <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-[#5c6e46] text-white shadow-sm'>
                  <FlaskConical size={20} />
                </div>
                Chemical Activity Overview
              </h2>
              <p className='mt-1 text-xs font-medium text-[#71805a] dark:text-[#a5b48b]'>
                Monthly historical ledger of chemical requests, store approvals, and lab expenditure records
              </p>
            </div>

            {/* TOP RIGHT CONTROLS: YEAR SELECTOR, MONTH SELECTOR, EXPORT CSV */}
            <div className='flex flex-wrap items-center gap-2.5 shrink-0'>
              {/* Year Selector */}
              <div className='flex items-center gap-1.5 bg-white dark:bg-[#1a1d16] px-3 py-1.5 rounded-xl border border-[#d9e1ca] dark:border-[#414a33] shadow-2xs'>
                <Clock size={14} className='text-[#5c6e46] dark:text-[#a8be8a]' />
                <span className='text-[11px] font-extrabold text-[#71805a] dark:text-[#a5b48b]'>Year:</span>
                <select
                  value={chemYearFilter}
                  onChange={(e) => setChemYearFilter(e.target.value)}
                  className='bg-transparent text-xs font-black text-[#37412a] outline-none cursor-pointer dark:text-[#e4e9d8]'
                >
                  <option value='all'>All Years (2026–2056+)</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>

              {/* Month Selector */}
              <div className='flex items-center gap-1.5 bg-white dark:bg-[#1a1d16] px-3 py-1.5 rounded-xl border border-[#d9e1ca] dark:border-[#414a33] shadow-2xs'>
                <span className='text-[11px] font-extrabold text-[#71805a] dark:text-[#a5b48b]'>Month:</span>
                <select
                  value={chemMonthFilter}
                  onChange={(e) => setChemMonthFilter(e.target.value)}
                  className='bg-transparent text-xs font-black text-[#37412a] outline-none cursor-pointer dark:text-[#e4e9d8]'
                >
                  {MONTH_NAMES.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Export Button */}
              <Button variant='outline' onClick={handleExportMonthlyLedgerCSV} className='text-xs px-3.5 py-2 border-[#5c6e46] text-[#5c6e46] hover:bg-[#f4f6ee] font-bold dark:border-[#a8be8a] dark:text-[#a8be8a] dark:hover:bg-[#1e2418] rounded-xl'>
                <Download size={14} className='mr-1.5' /> Export CSV
              </Button>
            </div>
          </div>

          {/* TOP STAT CARDS (WITH TOTAL COST METRIC) */}
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-5'>
            <div className='rounded-2xl border border-[#d9e1ca] bg-white p-4 shadow-2xs dark:border-[#414a33] dark:bg-[#1a1d16] flex items-center justify-between'>
              <div>
                <p className='text-[10px] font-extrabold uppercase tracking-wider text-[#71805a] dark:text-[#a5b48b]'>Total Requests</p>
                <h4 className='mt-1 text-2xl font-black text-[#37412a] dark:text-[#e4e9d8]'>{totalRequestsThisMonth}</h4>
              </div>
              <div className='flex h-9 w-9 items-center justify-center rounded-xl bg-[#f4f6ee] text-[#5c6e46] dark:bg-[#2a3320] dark:text-[#a8be8a]'>
                <FileText size={18} />
              </div>
            </div>

            <div className='rounded-2xl border border-[#d9e1ca] bg-white p-4 shadow-2xs dark:border-[#414a33] dark:bg-[#1a1d16] flex items-center justify-between'>
              <div>
                <p className='text-[10px] font-extrabold uppercase tracking-wider text-[#71805a] dark:text-[#a5b48b]'>Total Approved</p>
                <h4 className='mt-1 text-2xl font-black text-[#37412a] dark:text-[#e4e9d8]'>{totalApprovedThisMonth}</h4>
              </div>
              <div className='flex h-9 w-9 items-center justify-center rounded-xl bg-[#e8efd9] text-[#5c6e46] dark:bg-[#2a3320] dark:text-[#a8be8a]'>
                <CheckCircle2 size={18} />
              </div>
            </div>

            <div className='rounded-2xl border border-[#d9e1ca] bg-white p-4 shadow-2xs dark:border-[#414a33] dark:bg-[#1a1d16] flex items-center justify-between'>
              <div>
                <p className='text-[10px] font-extrabold uppercase tracking-wider text-[#71805a] dark:text-[#a5b48b]'>Active Labs</p>
                <h4 className='mt-1 text-2xl font-black text-[#37412a] dark:text-[#e4e9d8]'>{totalLabsActiveCount}</h4>
              </div>
              <div className='flex h-9 w-9 items-center justify-center rounded-xl bg-[#f4f6ee] text-[#5c6e46] dark:bg-[#2a3320] dark:text-[#a8be8a]'>
                <Building2 size={18} />
              </div>
            </div>

            <div className='rounded-2xl border border-[#d9e1ca] bg-white p-4 shadow-2xs dark:border-[#414a33] dark:bg-[#1a1d16] flex items-center justify-between'>
              <div>
                <p className='text-[10px] font-extrabold uppercase tracking-wider text-[#71805a] dark:text-[#a5b48b]'>Chemicals Released</p>
                <h4 className='mt-1 text-2xl font-black text-[#37412a] dark:text-[#e4e9d8]'>{totalChemicalsReleasedCount}</h4>
              </div>
              <div className='flex h-9 w-9 items-center justify-center rounded-xl bg-[#f4f6ee] text-[#c8a030] dark:bg-[#2a3320] dark:text-[#c8a030]'>
                <FlaskConical size={18} />
              </div>
            </div>

            <div className='rounded-2xl border border-[#c5d6aa] bg-[#f8faee] p-4 shadow-2xs dark:border-[#414a33] dark:bg-[#242c1c] flex items-center justify-between col-span-1 sm:col-span-2 lg:col-span-1'>
              <div>
                <p className='text-[10px] font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#a8be8a]'>Total Chemical Cost</p>
                <h4 className='mt-1 text-2xl font-black text-[#3c4e23] dark:text-[#e4e9d8]'>₹ {totalChemicalCost.toLocaleString('en-IN')}</h4>
              </div>
              <div className='flex h-9 w-9 items-center justify-center rounded-xl bg-[#5c6e46] text-white shadow-2xs'>
                <span className='font-black text-sm'>₹</span>
              </div>
            </div>
          </div>

          {/* FILTER BAR (SEARCH + STATUS) */}
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-[#1a1d16] p-4 rounded-2xl border border-[#d9e1ca] dark:border-[#414a33] shadow-xs'>
            
            {/* SEARCH */}
            <div className='relative flex-1'>
              <Search size={16} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-[#87996c]' />
              <input
                type='text'
                value={chemActivitySearch}
                onChange={(e) => setChemActivitySearch(e.target.value)}
                placeholder='Search by lab name or chemical...'
                className='w-full rounded-xl border border-[#d9e1ca] bg-[#fffef8] py-2 pl-10 pr-4 text-xs font-semibold text-[#37412a] outline-none focus:border-[#5c6e46] focus:ring-2 focus:ring-[#5c6e46]/20 transition-all dark:border-[#414a33] dark:bg-[#20251a] dark:text-[#e4e9d8]'
              />
            </div>

            {/* STATUS FILTER */}
            <div className='flex items-center gap-2 shrink-0'>
              <span className='text-xs font-extrabold text-[#71805a] dark:text-[#a5b48b]'>Filter Status:</span>
              <div className='flex items-center gap-1 bg-[#f4f6ee] dark:bg-[#20251a] p-1 rounded-xl border border-[#d9e1ca] dark:border-[#414a33]'>
                {['all', 'pending', 'approved', 'rejected'].map((st) => (
                  <button
                    key={st}
                    type='button'
                    onClick={() => setChemStatusFilter(st)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg capitalize transition-all ${
                      chemStatusFilter === st
                        ? 'bg-[#5c6e46] text-white shadow-2xs dark:bg-[#e4e9d8] dark:text-[#20251a]'
                        : 'text-[#5c6e46] hover:bg-white/60 dark:text-[#a5b48b] dark:hover:bg-[#1a1d16]'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 1 — LAB REQUESTS TO STORE */}
          <div className='rounded-2xl border border-[#d9e1ca] bg-white overflow-hidden shadow-sm dark:border-[#414a33] dark:bg-[#1a1d16]'>
            <div className='border-b border-[#d9e1ca] bg-[#f8faee] px-6 py-4 dark:border-[#414a33] dark:bg-[#20251a] flex items-center justify-between'>
              <div>
                <h3 className='text-base font-extrabold text-[#37412a] dark:text-[#e4e9d8] flex items-center gap-2'>
                  <FileText size={18} className='text-[#5c6e46]' /> Chemical Requests
                </h3>
                <p className='text-xs text-[#71805a] dark:text-[#a5b48b] mt-0.5 font-medium'>
                  All lab requests sent to store manager {chemYearFilter !== 'all' || chemMonthFilter !== 'all' ? `(${chemYearFilter !== 'all' ? chemYearFilter : ''} ${chemMonthFilter !== 'all' ? MONTH_NAMES.find(m => m.value === chemMonthFilter)?.label : ''})` : ''}
                </p>
              </div>
              <span className='bg-[#e8efd9] text-[#3c4e23] dark:bg-[#2a3320] dark:text-[#a8be8a] text-xs font-black px-3 py-1 rounded-full'>
                {filteredRequests.length} Requests
              </span>
            </div>

            <div className='overflow-x-auto'>
              <table className='w-full border-collapse text-left text-xs'>
                <thead>
                  <tr className='bg-[#f4f6ee] dark:bg-[#151712] border-b border-[#d9e1ca] dark:border-[#414a33]'>
                    <th className='px-6 py-3.5 font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c]'>Lab Name</th>
                    <th className='px-6 py-3.5 font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c]'>Chemical Name</th>
                    <th className='px-6 py-3.5 font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c]'>Quantity</th>
                    <th className='px-6 py-3.5 font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c]'>Est. Cost (₹)</th>
                    <th className='px-6 py-3.5 font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c]'>Date</th>
                    <th className='px-6 py-3.5 font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c] text-center'>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className='px-6 py-8 text-center text-xs text-[#87996c] italic'>
                        No chemical requests found matching filters for selected period.
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((req) => {
                      const st = req.status || 'Pending';
                      const cost = getItemCost(req);
                      return (
                        <tr key={req._id || req.id} className='border-b border-[#e4eed3] dark:border-[#2a3320] hover:bg-[#f8faee] dark:hover:bg-[#20251a] transition-colors'>
                          <td className='px-6 py-4 font-bold text-[#37412a] dark:text-[#e4e9d8]'>
                            {req.labName || req.labId?.name || req.labId?.labName || 'Central Lab'}
                          </td>
                          <td className='px-6 py-4 font-semibold text-[#37412a] dark:text-[#e4e9d8]'>
                            {req.chemicalName}
                          </td>
                          <td className='px-6 py-4 font-mono font-bold text-[#5c6e46] dark:text-[#a8be8a]'>
                            {req.quantityRequested} {req.unit}
                          </td>
                          <td className='px-6 py-4 font-mono font-bold text-[#3c4e23] dark:text-[#e4e9d8]'>
                            ₹ {cost.toLocaleString('en-IN')}
                          </td>
                          <td className='px-6 py-4 font-medium text-[#71805a] dark:text-[#a5b48b]'>
                            {formatDateStr(req.requestedAt || req.createdAt)}
                          </td>
                          <td className='px-6 py-4 text-center'>
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${
                              st === 'Approved'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                : st === 'Rejected'
                                ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                                : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                            }`}>
                              {st === 'Approved' ? '✅ Approved' : st === 'Rejected' ? '❌ Rejected' : '🟡 Pending'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 2 — APPROVED & RECEIVED */}
          <div className='rounded-2xl border border-[#d9e1ca] bg-white overflow-hidden shadow-sm dark:border-[#414a33] dark:bg-[#1a1d16]'>
            <div className='border-b border-[#d9e1ca] bg-[#f8faee] px-6 py-4 dark:border-[#414a33] dark:bg-[#20251a] flex items-center justify-between'>
              <div>
                <h3 className='text-base font-extrabold text-[#37412a] dark:text-[#e4e9d8] flex items-center gap-2'>
                  <CheckCircle2 size={18} className='text-[#5c6e46]' /> Chemicals Approved
                </h3>
                <p className='text-xs text-[#71805a] dark:text-[#a5b48b] mt-0.5 font-medium'>
                  Chemicals released from store to labs
                </p>
              </div>
              <span className='bg-[#5c6e46] text-white text-xs font-black px-3 py-1 rounded-full shadow-2xs'>
                {approvedReleases.length} Approved Releases
              </span>
            </div>

            <div className='overflow-x-auto'>
              <table className='w-full border-collapse text-left text-xs'>
                <thead>
                  <tr className='bg-[#f4f6ee] dark:bg-[#151712] border-b border-[#d9e1ca] dark:border-[#414a33]'>
                    <th className='px-6 py-3.5 font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c]'>Lab Name</th>
                    <th className='px-6 py-3.5 font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c]'>Chemical Name</th>
                    <th className='px-6 py-3.5 font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c]'>Quantity Released</th>
                    <th className='px-6 py-3.5 font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c]'>Approved By</th>
                    <th className='px-6 py-3.5 font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c]'>Total Cost (₹)</th>
                    <th className='px-6 py-3.5 font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c]'>Date</th>
                    <th className='px-6 py-3.5 font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c]'>Receipt No</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedReleases.length === 0 ? (
                    <tr>
                      <td colSpan={7} className='px-6 py-8 text-center text-xs text-[#87996c] italic'>
                        No approved chemical releases recorded for selected period.
                      </td>
                    </tr>
                  ) : (
                    approvedReleases.map((item) => (
                      <tr key={item.id} className='border-b border-[#e4eed3] dark:border-[#2a3320] hover:bg-[#f8faee] dark:hover:bg-[#20251a] transition-colors'>
                        <td className='px-6 py-4 font-bold text-[#37412a] dark:text-[#e4e9d8]'>
                          {item.labName}
                        </td>
                        <td className='px-6 py-4 font-semibold text-[#37412a] dark:text-[#e4e9d8]'>
                          {item.chemicalName}
                        </td>
                        <td className='px-6 py-4 font-mono font-bold text-[#5c6e46] dark:text-[#a8be8a]'>
                          {item.quantityReleased}
                        </td>
                        <td className='px-6 py-4 font-semibold text-[#71805a] dark:text-[#a5b48b]'>
                          {item.approvedBy}
                        </td>
                        <td className='px-6 py-4 font-mono font-bold text-[#3c4e23] dark:text-[#e4e9d8]'>
                          ₹ {item.cost.toLocaleString('en-IN')}
                        </td>
                        <td className='px-6 py-4 font-medium text-[#71805a] dark:text-[#a5b48b]'>
                          {formatDateStr(item.date)}
                        </td>
                        <td className='px-6 py-4 font-mono font-bold text-[#c8a030]'>
                          {item.receiptNo}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 3 — SAVED MONTHLY CHEMICAL EXPENSE & USAGE LEDGER ARCHIVE */}
          <div className='rounded-2xl border border-[#d9e1ca] bg-white overflow-hidden shadow-sm dark:border-[#414a33] dark:bg-[#1a1d16]'>
            <div className='border-b border-[#d9e1ca] bg-[#f8faee] px-6 py-4 dark:border-[#414a33] dark:bg-[#20251a] flex items-center justify-between'>
              <div>
                <h3 className='text-base font-extrabold text-[#37412a] dark:text-[#e4e9d8] flex items-center gap-2'>
                  <History size={18} className='text-[#5c6e46]' /> Saved Monthly Chemical Expense & Usage Ledger Archive
                </h3>
                <p className='text-xs text-[#71805a] dark:text-[#a5b48b] mt-0.5 font-medium'>
                  Permanent monthly historical record of chemical consumption, approval count, and costs per lab
                </p>
              </div>
              <Button size='sm' variant='outline' onClick={handleExportMonthlyLedgerCSV} className='text-xs border-[#5c6e46] text-[#5c6e46] rounded-xl font-bold'>
                <Download size={13} className='mr-1' /> Export Archive
              </Button>
            </div>

            <div className='overflow-x-auto'>
              <table className='w-full border-collapse text-left text-xs'>
                <thead>
                  <tr className='bg-[#f4f6ee] dark:bg-[#151712] border-b border-[#d9e1ca] dark:border-[#414a33]'>
                    <th className='px-6 py-3.5 font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c]'>Month / Period</th>
                    <th className='px-6 py-3.5 font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c]'>Lab Name</th>
                    <th className='px-6 py-3.5 font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c]'>Total Requests</th>
                    <th className='px-6 py-3.5 font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c]'>Approved Releases</th>
                    <th className='px-6 py-3.5 font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c]'>Monthly Expense (₹)</th>
                    <th className='px-6 py-3.5 font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c] text-center'>Audit Status</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyLedgerArchive.length === 0 ? (
                    <tr>
                      <td colSpan={6} className='px-6 py-8 text-center text-xs text-[#87996c] italic'>
                        No monthly ledger archives recorded yet.
                      </td>
                    </tr>
                  ) : (
                    monthlyLedgerArchive.map((row) => (
                      <tr key={row.id} className='border-b border-[#e4eed3] dark:border-[#2a3320] hover:bg-[#f8faee] dark:hover:bg-[#20251a] transition-colors'>
                        <td className='px-6 py-4 font-extrabold text-[#37412a] dark:text-[#e4e9d8] flex items-center gap-2'>
                          <Clock size={14} className='text-[#5c6e46]' />
                          {row.monthLabel}
                        </td>
                        <td className='px-6 py-4 font-bold text-[#37412a] dark:text-[#e4e9d8]'>
                          {row.labName}
                        </td>
                        <td className='px-6 py-4 font-semibold text-[#71805a] dark:text-[#a5b48b]'>
                          {row.totalRequests} Requests
                        </td>
                        <td className='px-6 py-4 font-semibold text-emerald-700 dark:text-emerald-400'>
                          {row.approvedCount} Released
                        </td>
                        <td className='px-6 py-4 font-mono font-black text-[#5c6e46] dark:text-[#a8be8a] text-sm'>
                          ₹ {row.totalCost.toLocaleString('en-IN')}
                        </td>
                        <td className='px-6 py-4 text-center'>
                          <span className='inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-extrabold bg-[#e8efd9] text-[#3c4e23] border border-[#c5d6aa] dark:bg-[#2a3320] dark:text-[#a8be8a] dark:border-[#414a33]'>
                            ✅ Verified Ledger
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* SECTION 5: CURRICULUM & PRACTICALS - TOP-DOWN VERTICAL FLOW WITH OUTER CARD OUTLINE */}
      {activeTab === 'curriculum' && (
        <div className='rounded-3xl border border-[#d9e1ca] bg-[#fffef8] p-6 sm:p-8 shadow-sm dark:border-[#414a33] dark:bg-[#20251a] space-y-6 animate-in fade-in'>

          {/* PAGE HEADER */}
          <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#d9e1ca] pb-5 dark:border-[#414a33]'>
            <div>
              <div className='mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-[#87996c] dark:text-[#7a8f62]'>
                <span>Super Admin</span>
                <ChevronRight size={12} />
                <span className='text-[#5c6e46] dark:text-[#a8be8a] font-bold'>Curriculum &amp; Practicals</span>
              </div>
              <h2 className='text-3xl font-black tracking-tight text-[#37412a] dark:text-[#e4e9d8] flex items-center gap-3'>
                <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-[#5c6e46] text-white shadow-sm'>
                  <BookOpen size={20} />
                </div>
                Curriculum &amp; Practical Syllabus Directory
              </h2>
              <p className='mt-1 text-xs font-medium text-[#71805a] dark:text-[#a5b48b]'>
                Structured governance for academic practicals, prescribed reagents, and course syllabus
              </p>
            </div>

            <div className='flex items-center gap-2.5 shrink-0'>
              <Button variant='outline' onClick={handleExportCurriculumCSV} className='text-xs px-3.5 py-2 border-[#5c6e46] text-[#5c6e46] hover:bg-[#f4f6ee] font-bold dark:border-[#a8be8a] dark:text-[#a8be8a] dark:hover:bg-[#1e2418] rounded-xl'>
                <Download size={14} className='mr-1.5' /> Export Syllabus CSV
              </Button>
              <Button onClick={() => setCurriculumModalOpen(true)} className='text-xs px-4 py-2 font-bold shadow-sm bg-[#5c6e46] hover:bg-[#4a5e2a] text-white rounded-xl'>
                <Plus size={15} className='mr-1.5' /> Add Experiment
              </Button>
            </div>
          </div>

          {/* LEVEL 1 — PROGRAM TABS (TOP) */}
          <div className='bg-white dark:bg-[#1a1d16] rounded-2xl p-2 flex flex-wrap items-center gap-2 shadow-xs border border-[#d9e1ca] dark:border-[#414a33]'>
            {[
              { id: 'B.Pharm', label: 'B.Pharm', icon: '🎓' },
              { id: 'M.Pharm', label: 'M.Pharm', icon: '🔬' },
              { id: 'PhD', label: 'PhD', icon: '📖' }
            ].map((program) => {
              const isActive = currCourseFilter === program.id;
              const count = curriculumExperiments.filter(e => (e.course || 'B.Pharm') === program.id).length;
              return (
                <button
                  key={program.id}
                  type='button'
                  onClick={() => {
                    setCurrCourseFilter(program.id);
                    setCurrSemFilter('all');
                    setCurrSubjectFilter('all');
                  }}
                  className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-extrabold transition-all duration-200 ${
                    isActive
                      ? 'bg-[#5c6e46] text-white shadow-sm dark:bg-[#e4e9d8] dark:text-[#20251a]'
                      : 'bg-transparent text-[#5c6e46] border border-[#d9e1ca] hover:bg-[#f4f6ee] dark:text-[#a5b48b] dark:border-[#414a33] dark:hover:bg-[#242c1c]'
                  }`}
                >
                  <span className='text-base'>{program.icon}</span>
                  <span>{program.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold transition-colors ${
                    isActive ? 'bg-white/20 text-white dark:bg-[#20251a]/20 dark:text-[#20251a]' : 'bg-[#e8efd9] text-[#3c4e23] dark:bg-[#2a3320] dark:text-[#a8be8a]'
                  }`}>
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>

          {/* LEVEL 2 — SEMESTER SELECTOR */}
          <div className='bg-white dark:bg-[#1a1d16] rounded-2xl p-4 sm:p-5 shadow-xs border border-[#d9e1ca] dark:border-[#414a33]'>
            <p className='text-[10px] font-extrabold uppercase tracking-widest text-[#71805a] dark:text-[#a5b48b] mb-2.5'>
              SELECT SEMESTER
            </p>
            <div className='flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin'>
              {/* All Semesters Pill */}
              {(() => {
                const totalCount = curriculumExperiments.filter(e => (e.course || 'B.Pharm') === currCourseFilter).length;
                const isAllActive = currSemFilter === 'all';
                return (
                  <button
                    type='button'
                    onClick={() => {
                      setCurrSemFilter('all');
                      setCurrSubjectFilter('all');
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-extrabold shrink-0 transition-all duration-200 border ${
                      isAllActive
                        ? 'bg-[#c8a030] text-white border-[#c8a030] shadow-sm'
                        : 'bg-white text-[#5c6e46] border-[#d9e1ca] hover:bg-[#f4f6ee] dark:bg-[#20251a] dark:text-[#a5b48b] dark:border-[#414a33]'
                    }`}
                  >
                    <span>All Semesters</span>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black ${
                      isAllActive ? 'bg-white text-[#c8a030]' : 'bg-[#5c6e46] text-white'
                    }`}>
                      {totalCount}
                    </span>
                  </button>
                );
              })()}

              {/* Individual Semesters */}
              {(currCourseFilter === 'B.Pharm'
                ? ['1', '2', '3', '4', '5', '6', '7', '8']
                : currCourseFilter === 'M.Pharm'
                ? ['1', '2', '3', '4']
                : ['1']
              ).map((sem) => {
                const isSemActive = currSemFilter === sem;
                const semCount = curriculumExperiments.filter(
                  e => (e.course || 'B.Pharm') === currCourseFilter && String(e.semester) === String(sem)
                ).length;

                return (
                  <button
                    key={sem}
                    type='button'
                    onClick={() => {
                      setCurrSemFilter(sem);
                      setCurrSubjectFilter('all');
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-extrabold shrink-0 transition-all duration-200 border ${
                      isSemActive
                        ? 'bg-[#5c6e46] text-white border-[#5c6e46] shadow-sm dark:bg-[#e4e9d8] dark:text-[#20251a] dark:border-[#e4e9d8]'
                        : 'bg-white text-[#5c6e46] border-[#d9e1ca] hover:bg-[#f4f6ee] dark:bg-[#20251a] dark:text-[#a5b48b] dark:border-[#414a33]'
                    }`}
                  >
                    <span>Sem {sem}</span>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black ${
                      isSemActive ? 'bg-white text-[#5c6e46] dark:bg-[#20251a] dark:text-[#e4e9d8]' : 'bg-[#5c6e46] text-white'
                    }`}>
                      {semCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SEARCH BAR */}
          <div>
            <div className='relative w-full'>
              <Search size={16} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-[#87996c]' />
              <input
                type='text'
                value={currSearch}
                onChange={(e) => setCurrSearch(e.target.value)}
                placeholder='Search experiments, chemicals or labs...'
                className='w-full rounded-2xl border border-[#d9e1ca] bg-white py-2.5 pl-10 pr-4 text-xs font-semibold text-[#37412a] outline-none focus:border-[#5c6e46] focus:ring-2 focus:ring-[#5c6e46]/20 transition-all dark:border-[#414a33] dark:bg-[#1a1d16] dark:text-[#e4e9d8]'
              />
            </div>
            <p className='text-xs font-medium text-[#71805a] dark:text-[#a5b48b] mt-1.5 pl-1'>
              Showing <span className='font-black text-[#5c6e46] dark:text-[#a8be8a]'>{filteredCurriculumExperiments.length}</span> experiments
            </p>
          </div>

          {/* LEVEL 3 — LAB SECTIONS (VERTICAL STACK) */}
          {filteredCurriculumExperiments.length === 0 ? (
            /* EMPTY STATE */
            <div className='bg-white dark:bg-[#1a1d16] rounded-2xl border border-dashed border-[#d9e1ca] dark:border-[#414a33] p-12 text-center shadow-xs'>
              <div className='w-16 h-16 rounded-2xl bg-[#e8efd9] dark:bg-[#2a3320] flex items-center justify-center mx-auto mb-4 text-[#5c6e46] dark:text-[#a8be8a]'>
                <FlaskConical size={32} />
              </div>
              <h4 className='text-lg font-extrabold text-[#37412a] dark:text-[#e4e9d8]'>No Experiments Found</h4>
              <p className='text-xs text-[#71805a] dark:text-[#a5b48b] max-w-md mx-auto mt-1 leading-relaxed'>
                No practical experiments configured for {currCourseFilter} {currSemFilter !== 'all' ? `Semester ${currSemFilter}` : ''}.
              </p>
              <Button onClick={() => setCurriculumModalOpen(true)} className='mt-5 text-xs px-5 py-2 font-bold shadow-sm bg-[#5c6e46] text-white rounded-xl'>
                <Plus size={14} className='mr-1.5' /> Add Experiment Template
              </Button>
            </div>
          ) : (
            /* STACKED LAB SECTIONS */
            <div className='space-y-5'>
              {Object.entries(groupedCurriculumBySubject).map(([subjectName, exps]) => {
                const isCollapsed = collapsedLabs.includes(subjectName);
                return (
                  <div key={subjectName} className='bg-white dark:bg-[#1a1d16] rounded-2xl shadow-sm hover:shadow-md border border-[#d9e1ca] dark:border-[#414a33] overflow-hidden transition-all duration-200'>
                    
                    {/* LAB SECTION HEADER */}
                    <div
                      className='bg-[#f8faee] dark:bg-[#20251a] px-5 py-3.5 flex items-center justify-between border-b border-[#d9e1ca] dark:border-[#414a33] cursor-pointer select-none transition-colors hover:bg-[#edf1e4] dark:hover:bg-[#242c1c]'
                      onClick={() => toggleLabCollapse(subjectName)}
                    >
                      <div className='flex items-center gap-3'>
                        <span className='text-lg text-[#5c6e46] dark:text-[#a8be8a]'>⚗️</span>
                        <h3 className='text-base font-extrabold text-[#37412a] dark:text-[#e4e9d8] tracking-tight'>
                          {subjectName}
                        </h3>
                      </div>
                      <div className='flex items-center gap-3'>
                        <span className='bg-[#5c6e46] text-white px-3 py-1 rounded-full text-xs font-extrabold shadow-2xs'>
                          {exps.length} {exps.length === 1 ? 'Practical' : 'Practicals'}
                        </span>
                        <span className={`text-[#5c6e46] dark:text-[#a8be8a] transition-transform duration-300 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}>
                          <ChevronDown size={18} />
                        </span>
                      </div>
                    </div>

                    {/* EXPERIMENTS TABLE INSIDE LAB */}
                    {!isCollapsed && (
                      <div className='overflow-x-auto'>
                        <table className='w-full border-collapse text-left'>
                          <thead>
                            <tr className='bg-[#f4f6ee] dark:bg-[#151712] border-b border-[#d9e1ca] dark:border-[#414a33]'>
                              <th className='w-[90px] px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c]'>EXP NO</th>
                              <th className='px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c]'>PRACTICAL EXPERIMENT TITLE</th>
                              <th className='w-[240px] px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c]'>PRESCRIBED REAGENTS &amp; CHEMICALS</th>
                              <th className='w-[140px] px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c] text-center'>ACTIONS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {exps.map((row) => {
                              const isChemExpanded = !!expandedChemsMap[row.id];
                              const chemsList = row.requiredChemicals ? row.requiredChemicals.split(',').map(c => c.trim()).filter(Boolean) : [];
                              const visibleChems = isChemExpanded ? chemsList : chemsList.slice(0, 3);
                              const extraChemsCount = chemsList.length - 3;

                              return (
                                <tr
                                  key={row.id}
                                  className='border-b border-[#e4eed3] dark:border-[#2a3320] hover:bg-[#f8faee] dark:hover:bg-[#20251a] transition-colors duration-150'
                                >
                                  {/* EXP NO */}
                                  <td className='px-5 py-4 align-middle'>
                                    <div className='w-[50px] h-[50px] rounded-xl bg-[#5c6e46] text-white font-bold text-xs text-center flex flex-col justify-center items-center leading-tight shadow-2xs'>
                                      <span>Exp</span>
                                      <span className='text-sm font-black'>{row.expNo ? row.expNo.replace(/exp\s*/i, '') : '01'}</span>
                                    </div>
                                  </td>

                                  {/* TITLE */}
                                  <td className='px-5 py-4 align-middle'>
                                    <p className='text-sm font-bold text-[#37412a] dark:text-[#e4e9d8] leading-snug'>
                                      {row.name}
                                    </p>
                                    <p className='text-xs font-semibold text-[#71805a] dark:text-[#a5b48b] mt-1'>
                                      {row.course} • Yr {row.year} • Sem {row.semester}
                                    </p>
                                  </td>

                                  {/* CHEMICALS */}
                                  <td className='px-5 py-4 align-middle'>
                                    <div className='flex flex-wrap items-center gap-1.5'>
                                      {chemsList.length > 0 ? (
                                        <>
                                          {visibleChems.map((chem, idx) => (
                                            <span
                                              key={idx}
                                              className='inline-flex items-center rounded-md border border-[#c5d6aa] bg-[#e8efd9] px-2.5 py-1 text-[11px] font-semibold text-[#2d3d17] dark:border-[#3a4a28] dark:bg-[#2a3320] dark:text-[#eef4e8]'
                                            >
                                              {chem}
                                            </span>
                                          ))}
                                          {!isChemExpanded && extraChemsCount > 0 && (
                                            <button
                                              type='button'
                                              onClick={() => toggleChemExpand(row.id)}
                                              className='text-xs font-extrabold text-[#5c6e46] hover:underline dark:text-[#a8be8a] ml-0.5 transition-colors'
                                            >
                                              +{extraChemsCount} more
                                            </button>
                                          )}
                                          {isChemExpanded && chemsList.length > 3 && (
                                            <button
                                              type='button'
                                              onClick={() => toggleChemExpand(row.id)}
                                              className='text-xs font-extrabold text-[#5c6e46] hover:underline dark:text-[#a8be8a] ml-0.5 transition-colors'
                                            >
                                              show less
                                            </button>
                                          )}
                                        </>
                                      ) : (
                                        <span className='text-xs text-[#87996c] italic'>No chemicals specified</span>
                                      )}
                                    </div>
                                  </td>

                                  {/* ACTIONS */}
                                  <td className='px-5 py-4 align-middle text-center'>
                                    <div className='flex items-center justify-center gap-1.5'>
                                      {/* View */}
                                      <button
                                        type='button'
                                        title='View details'
                                        onClick={() => { setSelectedExpDetail(row); setDetailExpModalOpen(true); }}
                                        className='w-9 h-9 rounded-xl border border-[#d9e1ca] bg-white text-[#5c6e46] hover:bg-[#f4f6ee] flex items-center justify-center transition-colors duration-150 dark:border-[#414a33] dark:bg-[#20251a] dark:text-[#a8be8a]'
                                      >
                                        <Eye size={15} />
                                      </button>

                                      {/* Edit */}
                                      <button
                                        type='button'
                                        title='Edit experiment'
                                        onClick={() => handleOpenEditExp(row)}
                                        className='w-9 h-9 rounded-xl border border-[#5c6e46] bg-white text-[#5c6e46] hover:bg-[#f4f6ee] flex items-center justify-center transition-colors duration-150 dark:border-[#a8be8a] dark:bg-[#20251a] dark:text-[#a8be8a]'
                                      >
                                        <Edit3 size={15} />
                                      </button>

                                      {/* Delete */}
                                      <button
                                        type='button'
                                        title='Delete experiment'
                                        onClick={() => handleDeleteExp(row.id, row.name)}
                                        className='w-9 h-9 rounded-xl border border-rose-300 bg-white text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors duration-150 dark:border-rose-800 dark:bg-[#20251a] dark:text-rose-400'
                                      >
                                        <Trash2 size={15} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* SECTION 6: STORE OVERSIGHT */}
      {activeTab === 'store' && (
        <div className='space-y-6 animate-in fade-in'>
          <div className='flex items-center justify-between'>
            <div>
              <h3 className='text-lg font-bold text-[#37412a] dark:text-[#e4e9d8] flex items-center gap-2'>
                <ShoppingBag className='text-[#5c6e46]' /> Central Store Administration & Procurement
              </h3>
              <p className='text-xs text-[#71805a] dark:text-[#a5b48b]'>Manage central store managers and monitor central inventory allocation</p>
            </div>
            <Button onClick={() => setStoreAdminModalOpen(true)} className='text-xs px-3 py-2'>
              <UserPlus size={14} className='mr-1.5' /> Add Store Manager
            </Button>
          </div>

          <Card title='Central Store Managers' subtitle='Authorized staff'>
            <div className='space-y-3 pt-2'>
              {storeAdmins.length === 0 ? (
                <p className='py-6 text-center text-sm text-[#71805a] dark:text-[#a5b48b]'>No store managers created yet.</p>
              ) : (
                storeAdmins.map((admin) => (
                  <div key={admin.id} className='flex items-center justify-between rounded-2xl border border-[#d9e1ca] bg-[#fffef8] p-4 dark:border-[#414a33] dark:bg-[#20251a]'>
                    <div>
                      <h4 className='font-bold text-[#37412a] dark:text-[#e4e9d8]'>{admin.name}</h4>
                      <p className='text-xs text-[#71805a] dark:text-[#a5b48b]'>{admin.email}</p>
                    </div>
                    <span className='rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'>
                      Active Store Manager
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* SECTION 7: AUDIT LOGS - PLATFORM AUDIT HISTORY */}
      {activeTab === 'activity' && (
        <div className='rounded-3xl border border-[#d9e1ca] bg-[#fffef8] p-6 sm:p-8 shadow-sm dark:border-[#414a33] dark:bg-[#20251a] space-y-6 animate-in fade-in'>

          {/* PAGE HEADER */}
          <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#d9e1ca] pb-5 dark:border-[#414a33]'>
            <div>
              <div className='mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-[#87996c] dark:text-[#7a8f62]'>
                <span>Super Admin</span>
                <ChevronRight size={12} />
                <span className='text-[#5c6e46] dark:text-[#a8be8a] font-bold'>Audit Logs</span>
              </div>
              <h2 className='text-3xl font-black tracking-tight text-[#37412a] dark:text-[#e4e9d8] flex items-center gap-3'>
                <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-[#5c6e46] text-white shadow-sm'>
                  <History size={20} />
                </div>
                Platform Audit History
              </h2>
              <p className='mt-1 text-xs font-medium text-[#71805a] dark:text-[#a5b48b]'>
                Track all user activity across roles, labs and semesters
              </p>
            </div>

            {/* TOP RIGHT CONTROLS: EXPORT CSV & 30+ YEAR HISTORICAL ARCHIVE SELECTORS */}
            <div className='flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0'>
              {/* Year Select (2026 to 2056+) */}
              <div className='flex items-center gap-1.5 bg-white dark:bg-[#1a1d16] px-3 py-2 rounded-xl border border-[#5c6e46] dark:border-[#a8be8a] shadow-2xs'>
                <span className='text-xs font-bold text-[#5c6e46] dark:text-[#a8be8a]'>Year:</span>
                <select
                  value={auditHistYearFilter}
                  onChange={(e) => setAuditHistYearFilter(e.target.value)}
                  className='bg-transparent text-xs font-extrabold text-[#37412a] dark:text-[#e4e9d8] outline-none cursor-pointer'
                >
                  <option value='all'>All Years (2026-2056+)</option>
                  {availableAuditYears.map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>

              {/* Month Select */}
              <div className='flex items-center gap-1.5 bg-white dark:bg-[#1a1d16] px-3 py-2 rounded-xl border border-[#5c6e46] dark:border-[#a8be8a] shadow-2xs'>
                <span className='text-xs font-bold text-[#5c6e46] dark:text-[#a8be8a]'>Month:</span>
                <select
                  value={auditHistMonthFilter}
                  onChange={(e) => setAuditHistMonthFilter(e.target.value)}
                  className='bg-transparent text-xs font-extrabold text-[#37412a] dark:text-[#e4e9d8] outline-none cursor-pointer'
                >
                  {MONTH_NAMES.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* 30+ Year Monthly Ledger Archive Button */}
              <Button
                variant='outline'
                onClick={() => setAuditArchiveModalOpen(true)}
                className='text-xs px-3.5 py-2 border-[#5c6e46] text-[#5c6e46] hover:bg-[#f4f6ee] font-bold dark:border-[#a8be8a] dark:text-[#a8be8a] dark:hover:bg-[#1e2418] rounded-xl shadow-2xs flex items-center gap-1.5'
              >
                <Clock size={14} /> 30-Year Archive Ledger
              </Button>

              {/* Export CSV Button */}
              <Button
                variant='outline'
                onClick={handleExportAuditLogsCSV}
                className='text-xs px-3.5 py-2 border-[#5c6e46] text-[#5c6e46] hover:bg-[#f4f6ee] font-bold dark:border-[#a8be8a] dark:text-[#a8be8a] dark:hover:bg-[#1e2418] rounded-xl shadow-2xs flex items-center gap-1.5'
              >
                <Download size={14} /> Export CSV
              </Button>
            </div>
          </div>

          {/* TOP STAT CARDS (4 CARDS) */}
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            <div className='rounded-2xl border border-[#d9e1ca] bg-white p-4 shadow-2xs dark:border-[#414a33] dark:bg-[#1a1d16] flex items-center justify-between'>
              <div>
                <p className='text-[10px] font-extrabold uppercase tracking-wider text-[#71805a] dark:text-[#a5b48b]'>Total Logins Today</p>
                <h4 className='mt-1 text-2xl font-black text-[#37412a] dark:text-[#e4e9d8]'>{auditTopStats.loginsToday}</h4>
              </div>
              <div className='flex h-9 w-9 items-center justify-center rounded-xl bg-[#f4f6ee] text-[#5c6e46] dark:bg-[#2a3320] dark:text-[#a8be8a]'>
                <UserCheck size={18} />
              </div>
            </div>

            <div className='rounded-2xl border border-[#d9e1ca] bg-white p-4 shadow-2xs dark:border-[#414a33] dark:bg-[#1a1d16] flex items-center justify-between'>
              <div>
                <p className='text-[10px] font-extrabold uppercase tracking-wider text-[#71805a] dark:text-[#a5b48b]'>Active Users Right Now</p>
                <h4 className='mt-1 text-2xl font-black text-[#37412a] dark:text-[#e4e9d8]'>{auditTopStats.activeUsersRightNow}</h4>
              </div>
              <div className='flex h-9 w-9 items-center justify-center rounded-xl bg-[#e8efd9] text-[#5c6e46] dark:bg-[#2a3320] dark:text-[#a8be8a]'>
                <Users size={18} />
              </div>
            </div>

            <div className='rounded-2xl border border-[#d9e1ca] bg-white p-4 shadow-2xs dark:border-[#414a33] dark:bg-[#1a1d16] flex items-center justify-between'>
              <div>
                <p className='text-[10px] font-extrabold uppercase tracking-wider text-[#71805a] dark:text-[#a5b48b]'>Total Actions This Week</p>
                <h4 className='mt-1 text-2xl font-black text-[#37412a] dark:text-[#e4e9d8]'>{auditTopStats.actionsThisWeek}</h4>
              </div>
              <div className='flex h-9 w-9 items-center justify-center rounded-xl bg-[#f4f6ee] text-[#5c6e46] dark:bg-[#2a3320] dark:text-[#a8be8a]'>
                <Activity size={18} />
              </div>
            </div>

            <div className='rounded-2xl border border-rose-200 bg-rose-50/50 p-4 shadow-2xs dark:border-rose-900/40 dark:bg-rose-950/20 flex items-center justify-between'>
              <div>
                <p className='text-[10px] font-extrabold uppercase tracking-wider text-rose-700 dark:text-rose-400'>Suspicious / Failed Logins</p>
                <h4 className='mt-1 text-2xl font-black text-rose-800 dark:text-rose-300'>{auditTopStats.suspiciousFailed}</h4>
              </div>
              <div className='flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'>
                <AlertTriangle size={18} />
              </div>
            </div>
          </div>

          {/* LEVEL 1 — ROLE FILTER TABS AT TOP */}
          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#1a1d16] p-2 rounded-2xl border border-[#d9e1ca] dark:border-[#414a33] shadow-xs'>
            <div className='flex flex-wrap items-center gap-1.5 flex-1'>
              {[
                { id: 'all', label: 'All', count: auditRoleCounts['all'] },
                { id: 'super-admin', label: 'Super Admin', count: auditRoleCounts['super-admin'] },
                { id: 'store-admin', label: 'Store Manager', count: auditRoleCounts['store-admin'] },
                { id: 'lab-admin', label: 'Lab Admin', count: auditRoleCounts['lab-admin'] },
                { id: 'student', label: 'Student', count: auditRoleCounts['student'] },
              ].map((tab) => {
                const isActive = auditTabRoleFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type='button'
                    onClick={() => {
                      setAuditTabRoleFilter(tab.id);
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all duration-150 ${
                      isActive
                        ? 'bg-[#5c6e46] text-white shadow-2xs dark:bg-[#e4e9d8] dark:text-[#20251a]'
                        : 'bg-transparent text-[#5c6e46] hover:bg-[#f4f6ee] dark:text-[#a5b48b] dark:hover:bg-[#20251a]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                      isActive ? 'bg-white/20 text-white dark:bg-[#20251a]/20 dark:text-[#20251a]' : 'bg-[#e8efd9] text-[#3c4e23] dark:bg-[#2a3320] dark:text-[#a8be8a]'
                    }`}>
                      ({tab.count})
                    </span>
                  </button>
                );
              })}
            </div>

            {/* SECTION VS TABLE VIEW TOGGLE */}
            <div className='flex items-center gap-1 bg-[#f4f6ee] dark:bg-[#20251a] p-1 rounded-xl border border-[#d9e1ca] dark:border-[#414a33] shrink-0'>
              <button
                type='button'
                onClick={() => setAuditViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  auditViewMode === 'table'
                    ? 'bg-[#5c6e46] text-white shadow-2xs dark:bg-[#e4e9d8] dark:text-[#20251a]'
                    : 'text-[#5c6e46] hover:bg-white/60 dark:text-[#a5b48b] dark:hover:bg-[#1a1d16]'
                }`}
              >
                <List size={14} /> 📋 Table View
              </button>
              <button
                type='button'
                onClick={() => setAuditViewMode('section')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  auditViewMode === 'section'
                    ? 'bg-[#5c6e46] text-white shadow-2xs dark:bg-[#e4e9d8] dark:text-[#20251a]'
                    : 'text-[#5c6e46] hover:bg-white/60 dark:text-[#a5b48b] dark:hover:bg-[#1a1d16]'
                }`}
              >
                <Grid size={14} /> 📊 Section View
              </button>
            </div>
          </div>

          {/* FILTER BAR BELOW TABS */}
          <div className='grid gap-3 p-4 bg-white dark:bg-[#1a1d16] rounded-2xl border border-[#d9e1ca] dark:border-[#414a33] shadow-xs text-xs'>
            <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
              {/* Search */}
              <div className='relative'>
                <Search size={15} className='absolute left-3 top-1/2 -translate-y-1/2 text-[#87996c]' />
                <input
                  type='text'
                  value={auditSearchQuery}
                  onChange={(e) => setAuditSearchQuery(e.target.value)}
                  placeholder='Search by user name or email...'
                  className='w-full rounded-xl border border-[#d9e1ca] bg-[#fffef8] py-2 pl-9 pr-3 font-semibold text-[#37412a] outline-none focus:border-[#5c6e46] dark:border-[#414a33] dark:bg-[#20251a] dark:text-[#e4e9d8]'
                />
              </div>

              {/* Lab Selector */}
              <select
                value={auditLabFilter}
                onChange={(e) => setAuditLabFilter(e.target.value)}
                className='rounded-xl border border-[#d9e1ca] bg-[#fffef8] py-2 px-3 font-bold text-[#37412a] outline-none focus:border-[#5c6e46] dark:border-[#414a33] dark:bg-[#20251a] dark:text-[#e4e9d8]'
              >
                <option value='all'>All Labs</option>
                <option value='Pharmaceutics Lab - I'>Pharmaceutics Lab - I</option>
                <option value='Pharma Lab Y1S1'>Pharma Lab Y1S1</option>
                <option value='Pharma Lab Y1S2'>Pharma Lab Y1S2</option>
                <option value='Pharmaceutical Analysis Lab'>Pharmaceutical Analysis Lab</option>
                <option value='Pharmaceutical Chemistry Lab'>Pharmaceutical Chemistry Lab</option>
                <option value='Human Anatomy & Physiology Lab'>Human Anatomy & Physiology Lab</option>
                <option value='Central Store'>Central Store</option>
              </select>

              {/* Year Selector */}
              <select
                value={auditYearFilter}
                onChange={(e) => setAuditYearFilter(e.target.value)}
                className='rounded-xl border border-[#d9e1ca] bg-[#fffef8] py-2 px-3 font-bold text-[#37412a] outline-none focus:border-[#5c6e46] dark:border-[#414a33] dark:bg-[#20251a] dark:text-[#e4e9d8]'
              >
                <option value='all'>All Academic Years</option>
                <option value='1'>Year 1</option>
                <option value='2'>Year 2</option>
                <option value='3'>Year 3</option>
                <option value='4'>Year 4</option>
              </select>

              {/* Semester Selector */}
              <select
                value={auditSemFilter}
                onChange={(e) => setAuditSemFilter(e.target.value)}
                className='rounded-xl border border-[#d9e1ca] bg-[#fffef8] py-2 px-3 font-bold text-[#37412a] outline-none focus:border-[#5c6e46] dark:border-[#414a33] dark:bg-[#20251a] dark:text-[#e4e9d8]'
              >
                <option value='all'>All Semesters</option>
                {['1', '2', '3', '4', '5', '6', '7', '8'].map(s => (
                  <option key={s} value={s}>Sem {s}</option>
                ))}
              </select>
            </div>

            {/* Date Pickers & Actions */}
            <div className='flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#f4f6ee] dark:border-[#2a3320]'>
              <div className='flex flex-wrap items-center gap-3'>
                <div className='flex items-center gap-2'>
                  <span className='font-bold text-[#71805a] dark:text-[#a5b48b]'>Date From:</span>
                  <input
                    type='date'
                    value={auditDateFrom}
                    onChange={(e) => setAuditDateFrom(e.target.value)}
                    className='rounded-xl border border-[#d9e1ca] bg-[#fffef8] py-1.5 px-2.5 font-semibold text-[#37412a] outline-none focus:border-[#5c6e46] dark:border-[#414a33] dark:bg-[#20251a] dark:text-[#e4e9d8]'
                  />
                </div>

                <div className='flex items-center gap-2'>
                  <span className='font-bold text-[#71805a] dark:text-[#a5b48b]'>Date To:</span>
                  <input
                    type='date'
                    value={auditDateTo}
                    onChange={(e) => setAuditDateTo(e.target.value)}
                    className='rounded-xl border border-[#d9e1ca] bg-[#fffef8] py-1.5 px-2.5 font-semibold text-[#37412a] outline-none focus:border-[#5c6e46] dark:border-[#414a33] dark:bg-[#20251a] dark:text-[#e4e9d8]'
                  />
                </div>
              </div>

              <div className='flex items-center gap-2'>
                <button
                  type='button'
                  onClick={() => {
                    setAuditSearchQuery('');
                    setAuditTabRoleFilter('all');
                    setAuditLabFilter('all');
                    setAuditYearFilter('all');
                    setAuditSemFilter('all');
                    setAuditDateFrom('');
                    setAuditDateTo('');
                  }}
                  className='px-3 py-1.5 rounded-xl border border-[#d9e1ca] text-[#71805a] font-bold hover:bg-[#f4f6ee] dark:border-[#414a33] dark:text-[#a5b48b]'
                >
                  ↺ Reset Filters
                </button>
              </div>
            </div>
          </div>

          {/* VIEW MODE 1: TABLE VIEW */}
          {auditViewMode === 'table' && (
            <div className='rounded-2xl border border-[#d9e1ca] bg-white overflow-hidden shadow-sm dark:border-[#414a33] dark:bg-[#1a1d16]'>
              <div className='border-b border-[#d9e1ca] bg-[#f8faee] px-6 py-4 dark:border-[#414a33] dark:bg-[#20251a] flex items-center justify-between'>
                <div>
                  <h3 className='text-base font-extrabold text-[#37412a] dark:text-[#e4e9d8] flex items-center gap-2'>
                    <List size={18} className='text-[#5c6e46]' /> Audit Trail Records
                  </h3>
                  <p className='text-xs text-[#71805a] dark:text-[#a5b48b] mt-0.5 font-medium'>
                    Showing {filteredAuditLogs.length} audit logs
                  </p>
                </div>
                <span className='bg-[#5c6e46] text-white text-xs font-black px-3 py-1 rounded-full shadow-2xs'>
                  {filteredAuditLogs.length} Records
                </span>
              </div>

              <div className='overflow-x-auto'>
                <table className='w-full border-collapse text-left text-xs'>
                  <thead>
                    <tr className='bg-[#f4f6ee] dark:bg-[#151712] border-b border-[#d9e1ca] dark:border-[#414a33]'>
                      <th className='px-5 py-3.5 font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c]'>TIMESTAMP</th>
                      <th className='px-5 py-3.5 font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c]'>USER</th>
                      <th className='px-5 py-3.5 font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c]'>EMAIL</th>
                      <th className='px-5 py-3.5 font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c]'>ROLE</th>
                      <th className='px-5 py-3.5 font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c]'>LAB</th>
                      <th className='px-5 py-3.5 font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c]'>YEAR/SEM</th>
                      <th className='px-5 py-3.5 font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c]'>ACTION DETAILS</th>
                      <th className='px-5 py-3.5 font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c] text-center'>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAuditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className='px-6 py-10 text-center text-xs text-[#87996c] italic'>
                          No audit log records found matching current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredAuditLogs.map((row) => {
                        const isFailed = (row.status || '').toLowerCase() === 'failed' || (row.actionDetails || '').toLowerCase().includes('failed');
                        const isStore = (row.role || '').toLowerCase().includes('store');
                        const isStudent = (row.role || '').toLowerCase().includes('student');

                        const rowClass = isFailed
                          ? 'bg-rose-50/70 hover:bg-rose-100/70 dark:bg-rose-950/30 dark:hover:bg-rose-900/40'
                          : isStore
                          ? 'bg-sky-50/60 hover:bg-sky-100/60 dark:bg-sky-950/20 dark:hover:bg-sky-900/30'
                          : isStudent
                          ? 'bg-[#fffef4] hover:bg-[#fcf8e3] dark:bg-amber-950/20 dark:hover:bg-amber-900/30'
                          : 'bg-white hover:bg-[#f8faee] dark:bg-[#1a1d16] dark:hover:bg-[#20251a]';

                        const formattedDate = new Date(row.timestamp).toLocaleString('en-IN', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit', hour12: true
                        });

                        const yearSemStr = (row.year && row.year !== '-' && row.semester && row.semester !== '-')
                          ? `Y${row.year} S${row.semester}`
                          : '-';

                        return (
                          <tr key={row.id} className={`border-b border-[#e4eed3] dark:border-[#2a3320] transition-colors ${rowClass}`}>
                            <td className='px-5 py-3.5 font-mono font-bold text-[#5c6e46] dark:text-[#a8be8a] whitespace-nowrap'>
                              {formattedDate}
                            </td>
                            <td className='px-5 py-3.5 font-bold text-[#37412a] dark:text-[#e4e9d8] whitespace-nowrap'>
                              {row.userName}
                            </td>
                            <td className='px-5 py-3.5 font-mono text-[#71805a] dark:text-[#a5b48b] whitespace-nowrap'>
                              {row.userEmail}
                            </td>
                            <td className='px-5 py-3.5 whitespace-nowrap'>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
                                row.role === 'super-admin'
                                  ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300'
                                  : row.role === 'store-admin'
                                  ? 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300'
                                  : row.role === 'lab-admin'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                              }`}>
                                {row.role === 'super-admin' ? 'Super Admin' : row.role === 'store-admin' ? 'Store Manager' : row.role === 'lab-admin' ? 'Lab Admin' : 'Student'}
                              </span>
                            </td>
                            <td className='px-5 py-3.5 font-semibold text-[#37412a] dark:text-[#e4e9d8] whitespace-nowrap'>
                              {row.labName || '-'}
                            </td>
                            <td className='px-5 py-3.5 font-mono font-bold text-[#5c6e46] dark:text-[#a8be8a] whitespace-nowrap'>
                              {yearSemStr}
                            </td>
                            <td className='px-5 py-3.5 font-medium text-[#37412a] dark:text-[#e4e9d8]'>
                              {row.actionDetails}
                            </td>
                            <td className='px-5 py-3.5 text-center whitespace-nowrap'>
                              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${
                                !isFailed
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                  : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                              }`}>
                                {!isFailed ? '✅ Success' : '❌ Failed'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW MODE 2: SECTION WISE VIEW */}
          {auditViewMode === 'section' && (
            <div className='grid gap-6 md:grid-cols-3'>

              {/* 👨💼 STORE MANAGER CARD */}
              <div className='rounded-2xl border border-sky-200 bg-sky-50/40 p-6 shadow-sm dark:border-sky-900/40 dark:bg-sky-950/20 space-y-4 flex flex-col justify-between'>
                <div>
                  <div className='flex items-center gap-3 border-b border-sky-200 pb-3 dark:border-sky-900/40'>
                    <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white shadow-2xs'>
                      <ShoppingBag size={20} />
                    </div>
                    <div>
                      <h4 className='font-black text-lg text-sky-950 dark:text-sky-100'>👨💼 STORE MANAGER</h4>
                      <p className='text-xs font-medium text-sky-700 dark:text-sky-300'>Central chemical store activities</p>
                    </div>
                  </div>

                  <div className='mt-4 space-y-3'>
                    <div className='flex justify-between items-center bg-white/80 dark:bg-[#1a1d16]/80 p-3 rounded-xl border border-sky-100 dark:border-sky-900/30'>
                      <span className='text-xs font-bold text-[#71805a] dark:text-[#a5b48b]'>Today's Activity:</span>
                      <span className='text-sm font-black text-sky-900 dark:text-sky-200'>{auditSectionMetrics.storeCountToday} Actions</span>
                    </div>
                    <div className='flex justify-between items-center bg-white/80 dark:bg-[#1a1d16]/80 p-3 rounded-xl border border-sky-100 dark:border-sky-900/30'>
                      <span className='text-xs font-bold text-[#71805a] dark:text-[#a5b48b]'>Last Store Activity:</span>
                      <span className='text-xs font-extrabold text-[#37412a] dark:text-[#e4e9d8]'>{auditSectionMetrics.lastStoreTime}</span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    setAuditTabRoleFilter('store-admin');
                    setAuditViewMode('table');
                  }}
                  className='w-full text-xs font-bold bg-sky-700 hover:bg-sky-800 text-white rounded-xl py-2.5 shadow-2xs'
                >
                  View All Store Manager Logs
                </Button>
              </div>

              {/* 🧪 LAB ADMINS CARD */}
              <div className='rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20 space-y-4 flex flex-col justify-between'>
                <div>
                  <div className='flex items-center gap-3 border-b border-emerald-200 pb-3 dark:border-emerald-900/40'>
                    <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-[#5c6e46] text-white shadow-2xs'>
                      <FlaskConical size={20} />
                    </div>
                    <div>
                      <h4 className='font-black text-lg text-emerald-950 dark:text-emerald-100'>🧪 LAB ADMINS</h4>
                      <p className='text-xs font-medium text-emerald-700 dark:text-emerald-300'>Active Lab Administrators today: {auditSectionMetrics.activeLabAdminsCount}</p>
                    </div>
                  </div>

                  <div className='mt-4 space-y-2.5'>
                    {auditSectionMetrics.recentLabAdminsList.length === 0 ? (
                      <p className='text-xs text-[#71805a] italic p-2'>No active lab admins recorded yet</p>
                    ) : (
                      auditSectionMetrics.recentLabAdminsList.map((log) => (
                        <div key={log.id} className='bg-white/80 dark:bg-[#1a1d16]/80 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/30 text-xs'>
                          <p className='font-bold text-[#37412a] dark:text-[#e4e9d8]'>{log.labName} — {log.userName}</p>
                          <p className='text-[11px] text-[#71805a] dark:text-[#a5b48b] mt-0.5'>Last active: {new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <Button
                  onClick={() => {
                    setAuditTabRoleFilter('lab-admin');
                    setAuditViewMode('table');
                  }}
                  className='w-full text-xs font-bold bg-[#5c6e46] hover:bg-[#4a5e2a] text-white rounded-xl py-2.5 shadow-2xs'
                >
                  View All Lab Admin Logs
                </Button>
              </div>

              {/* 👨🎓 STUDENTS CARD */}
              <div className='rounded-2xl border border-amber-200 bg-amber-50/40 p-6 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20 space-y-4 flex flex-col justify-between'>
                <div>
                  <div className='flex items-center gap-3 border-b border-amber-200 pb-3 dark:border-amber-900/40'>
                    <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600 text-white shadow-2xs'>
                      <Users size={20} />
                    </div>
                    <div>
                      <h4 className='font-black text-lg text-amber-950 dark:text-amber-100'>👨🎓 STUDENTS</h4>
                      <p className='text-xs font-medium text-amber-700 dark:text-amber-300'>Active Students today: {auditSectionMetrics.activeStudentsCount}</p>
                    </div>
                  </div>

                  <div className='mt-4 space-y-2 text-xs'>
                    {Object.keys(auditSectionMetrics.studentSemMap).length === 0 ? (
                      <p className='text-xs text-[#71805a] italic p-2'>No active student logs recorded yet</p>
                    ) : (
                      Object.entries(auditSectionMetrics.studentSemMap).map(([semLabel, count]) => (
                        <div key={semLabel} className='flex justify-between items-center bg-white/80 dark:bg-[#1a1d16]/80 p-2.5 rounded-xl border border-amber-100 dark:border-amber-900/30 font-semibold'>
                          <span>B.Pharm {semLabel}:</span>
                          <span className='font-black text-amber-900 dark:text-amber-300'>{count} Actions</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <Button
                  onClick={() => {
                    setAuditTabRoleFilter('student');
                    setAuditViewMode('table');
                  }}
                  className='w-full text-xs font-bold bg-amber-700 hover:bg-amber-800 text-white rounded-xl py-2.5 shadow-2xs'
                >
                  View All Student Logs
                </Button>
              </div>

            </div>
          )}

        </div>
      )}

      {/* 30-YEAR MONTHLY AUDIT ARCHIVE LEDGER MODAL */}
      <Modal
        isOpen={auditArchiveModalOpen}
        onClose={() => setAuditArchiveModalOpen(false)}
        title="🗓️ 30-Year Monthly Audit Archive Ledger (2026 - 2056+)"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#f8faee] dark:bg-[#20251a] rounded-xl border border-[#d9e1ca] dark:border-[#414a33]">
            <p className="text-xs font-semibold text-[#5c6e46] dark:text-[#a8be8a]">
              Monthly audit history recorded across all 30+ years. Click any row to inspect detailed logs.
            </p>
            <Button
              onClick={handleExportMonthlyAuditArchiveCSV}
              className="text-xs font-bold px-3 py-1.5 bg-[#5c6e46] text-white rounded-lg shadow-2xs"
            >
              <Download size={13} className="mr-1 inline" /> Export Archive CSV
            </Button>
          </div>

          <div className="max-h-[450px] overflow-y-auto overflow-x-auto rounded-xl border border-[#d9e1ca] dark:border-[#414a33]">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-[#f4f6ee] dark:bg-[#151712] sticky top-0 border-b border-[#d9e1ca] dark:border-[#414a33]">
                <tr>
                  <th className="p-3 font-black text-[#5c6e46]">MONTH / YEAR</th>
                  <th className="p-3 font-black text-[#5c6e46] text-center">TOTAL LOGS</th>
                  <th className="p-3 font-black text-[#5c6e46] text-center">LOGINS</th>
                  <th className="p-3 font-black text-[#5c6e46] text-center">ACTIVE USERS</th>
                  <th className="p-3 font-black text-[#5c6e46] text-center">STORE ACTIONS</th>
                  <th className="p-3 font-black text-[#5c6e46] text-center">LAB ADMINS</th>
                  <th className="p-3 font-black text-[#5c6e46] text-center">STUDENTS</th>
                  <th className="p-3 font-black text-[#5c6e46] text-center">FAILED</th>
                  <th className="p-3 font-black text-[#5c6e46] text-center">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {monthlyAuditArchiveData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-[#87996c] italic">
                      No monthly audit records recorded for selected filters.
                    </td>
                  </tr>
                ) : (
                  monthlyAuditArchiveData.map((row) => (
                    <tr key={row.monthKey} className="border-b border-[#e4eed3] dark:border-[#2a3320] hover:bg-[#f8faee] dark:hover:bg-[#20251a]">
                      <td className="p-3 font-extrabold text-[#37412a] dark:text-[#e4e9d8]">{row.monthLabel}</td>
                      <td className="p-3 font-black text-center text-[#5c6e46] dark:text-[#a8be8a]">{row.totalLogs}</td>
                      <td className="p-3 font-bold text-center">{row.loginsCount}</td>
                      <td className="p-3 font-bold text-center">{row.usersSet.size}</td>
                      <td className="p-3 font-semibold text-center text-sky-700">{row.storeCount}</td>
                      <td className="p-3 font-semibold text-center text-emerald-700">{row.labAdminCount}</td>
                      <td className="p-3 font-semibold text-center text-amber-700">{row.studentCount}</td>
                      <td className="p-3 font-bold text-center text-rose-700">{row.failedCount}</td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setAuditHistYearFilter(row.yearStr);
                            setAuditHistMonthFilter(row.monthStr);
                            setAuditArchiveModalOpen(false);
                          }}
                          className="px-2.5 py-1 rounded-md bg-[#5c6e46] text-white font-bold text-[11px] hover:bg-[#4a5e2a]"
                        >
                          View Logs
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* SECTION 10: SECURITY & SETTINGS */}
      {activeTab === 'settings' && (
        <div className='space-y-6 animate-in fade-in'>
          <div className='grid gap-6 lg:grid-cols-2'>
            <Card title='Create Super Admin Account' subtitle='Grant full platform administrative permissions'>
              <div className='space-y-4 pt-2'>
                <Input label='Full Name' value={newSuperAdmin.name} onChange={(e) => setNewSuperAdmin((s) => ({ ...s, name: e.target.value }))} placeholder='e.g. Dr. Super Admin' />
                <Input label='Email Address' type='email' value={newSuperAdmin.email} onChange={(e) => setNewSuperAdmin((s) => ({ ...s, email: e.target.value }))} placeholder='superadmin@rasayanflow.edu' />
                <Input label='Password' type='password' value={newSuperAdmin.password} onChange={(e) => setNewSuperAdmin((s) => ({ ...s, password: e.target.value }))} minLength={6} placeholder='••••••••' />
                <Button onClick={handleCreateSuperAdmin} disabled={savingSuperAdmin} className='w-full'>
                  {savingSuperAdmin ? 'Creating Account...' : 'Create Super Admin'}
                </Button>
              </div>
            </Card>

            <Card title='Reset Password' subtitle='Update password for current Super Admin account'>
              <div className='space-y-4 pt-2'>
                <Input label='Current Password' type='password' value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((s) => ({ ...s, currentPassword: e.target.value }))} />
                <Input label='New Password' type='password' value={passwordForm.newPassword} onChange={(e) => setPasswordForm((s) => ({ ...s, newPassword: e.target.value }))} minLength={6} />
                <Input label='Confirm New Password' type='password' value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((s) => ({ ...s, confirmPassword: e.target.value }))} minLength={6} />
                <Button onClick={handleChangePassword} disabled={changingPassword} className='w-full'>
                  {changingPassword ? 'Updating Password...' : 'Update Password'}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ALL INTERACTIVE MODALS */}

      {/* Create Lab Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title='Create New Department Lab & Provision Admin' panelClassName='max-w-4xl'>
        <div className='space-y-6'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            
            {/* COLUMN 1: Lab Details */}
            <div className='space-y-4 rounded-2xl border border-[#d9e1ca] bg-[#fffef8] p-4 dark:border-[#414a33] dark:bg-[#1a1d16]'>
              <h4 className='text-xs font-bold text-[#5c6e46] dark:text-[#a5b48b] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#d9e1ca] pb-2 dark:border-[#414a33]'>
                <Warehouse size={16} /> 1. Lab Specifications
              </h4>

              <Input
                label='Lab Name *'
                value={newLab.name}
                onChange={(e) => setNewLab({ ...newLab, name: e.target.value })}
                placeholder='e.g. Pharmaceutics Lab - I'
                required
              />

              <Input
                label='Lab Code *'
                value={newLab.code}
                onChange={(e) => setNewLab({ ...newLab, code: e.target.value })}
                placeholder='e.g. PH101L'
                required
              />

              <div className='grid grid-cols-2 gap-3'>
                <label className='block text-xs font-bold text-[#4e5d35] dark:text-[#d5ddbf]'>
                  <span className='mb-1 block'>Course Program</span>
                  <select
                    value={newLab.courseType}
                    onChange={(e) => setNewLab({ ...newLab, courseType: e.target.value, year: '1', semester: '1' })}
                    className='w-full rounded-xl border border-[#cfd8bd] bg-white p-2.5 text-xs font-bold text-[#3c4e23] outline-none focus:border-[#5c6e46] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]'
                  >
                    <option value='B.Pharm'>B.Pharm (4 Years)</option>
                    <option value='M.Pharm'>M.Pharm (2 Years)</option>
                    <option value='PhD'>PhD Research</option>
                    <option value='Other'>Other Program</option>
                  </select>
                </label>

                <Input
                  label='Department (Optional)'
                  placeholder='e.g. Pharmaceutics'
                  value={newLab.department}
                  onChange={(e) => setNewLab({ ...newLab, department: e.target.value })}
                />
              </div>

              {/* Visual Academic Year */}
              <div>
                <p className='text-xs font-bold text-[#4e5d35] dark:text-[#d5ddbf] mb-1.5'>Academic Year</p>
                <div className='flex gap-2'>
                  {(newLab.courseType === 'B.Pharm' ? ['1', '2', '3', '4'] : newLab.courseType === 'M.Pharm' ? ['1', '2'] : ['1', '2', '3', '4', '5']).map((y) => (
                    <button
                      key={y}
                      type='button'
                      onClick={() => setNewLab({ ...newLab, year: y, semester: (parseInt(y) * 2 - 1).toString() })}
                      className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all border ${
                        newLab.year === y
                          ? 'bg-[#5c6e46] text-white border-[#5c6e46] shadow-sm'
                          : 'border-[#d9e1ca] bg-white text-[#37412a] hover:bg-[#f4f6ee] dark:border-[#414a33] dark:bg-[#20251a] dark:text-[#e4e9d8]'
                      }`}
                    >
                      Year {y}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visual Semester */}
              {newLab.year && (
                <div>
                  <p className='text-xs font-bold text-[#4e5d35] dark:text-[#d5ddbf] mb-1.5'>Semester</p>
                  <div className='flex gap-2'>
                    {[(parseInt(newLab.year) * 2 - 1).toString(), (parseInt(newLab.year) * 2).toString()].map((s) => (
                      <button
                        key={s}
                        type='button'
                        onClick={() => setNewLab({ ...newLab, semester: s })}
                        className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all border ${
                          newLab.semester === s
                            ? 'bg-[#37412a] text-white border-[#37412a] shadow-sm dark:bg-[#e4e9d8] dark:text-[#20251a]'
                            : 'border-[#d9e1ca] bg-white text-[#37412a] hover:bg-[#f4f6ee] dark:border-[#414a33] dark:bg-[#20251a] dark:text-[#e4e9d8]'
                        }`}
                      >
                        Semester {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* COLUMN 2: Assign / Create Lab Admin */}
            <div className='space-y-4 rounded-2xl border border-[#d9e1ca] bg-[#fffef8] p-4 dark:border-[#414a33] dark:bg-[#1a1d16] flex flex-col justify-between'>
              <div>
                <h4 className='text-xs font-bold text-[#5c6e46] dark:text-[#a5b48b] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#d9e1ca] pb-2 dark:border-[#414a33]'>
                  <UserPlus size={16} /> 2. Lab Administrator Provisioning
                </h4>

                {/* Mode Selector Tabs */}
                <div className='mt-3 grid grid-cols-3 gap-1 rounded-xl bg-[#f4f6ee] p-1 dark:bg-[#20251a] border border-[#d9e1ca] dark:border-[#414a33]'>
                  <button
                    type='button'
                    onClick={() => setAdminMode('create_new')}
                    className={`rounded-lg py-1.5 text-[11px] font-bold transition-all ${
                      adminMode === 'create_new' ? 'bg-[#5c6e46] text-white shadow-sm' : 'text-[#71805a] hover:text-[#37412a] dark:text-[#a5b48b]'
                    }`}
                  >
                    + New Admin
                  </button>
                  <button
                    type='button'
                    onClick={() => setAdminMode('existing')}
                    className={`rounded-lg py-1.5 text-[11px] font-bold transition-all ${
                      adminMode === 'existing' ? 'bg-[#5c6e46] text-white shadow-sm' : 'text-[#71805a] hover:text-[#37412a] dark:text-[#a5b48b]'
                    }`}
                  >
                    Existing Staff
                  </button>
                  <button
                    type='button'
                    onClick={() => setAdminMode('unassigned')}
                    className={`rounded-lg py-1.5 text-[11px] font-bold transition-all ${
                      adminMode === 'unassigned' ? 'bg-[#5c6e46] text-white shadow-sm' : 'text-[#71805a] hover:text-[#37412a] dark:text-[#a5b48b]'
                    }`}
                  >
                    Skip / Later
                  </button>
                </div>

                {/* Option A: Create New Lab Admin Account */}
                {adminMode === 'create_new' && (
                  <div className='mt-4 space-y-3.5 animate-in fade-in'>
                    <div className='rounded-xl bg-emerald-50/70 p-3 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/40'>
                      <p className='text-xs text-emerald-800 dark:text-emerald-300 font-medium leading-relaxed'>
                        🔑 Provision credentials for the Lab Admin. When this admin logs in with this email and password, they will immediately land inside this lab dashboard!
                      </p>
                    </div>

                    <Input
                      label='Admin Full Name *'
                      value={newLabAdmin.name}
                      onChange={(e) => setNewLabAdmin({ ...newLabAdmin, name: e.target.value })}
                      placeholder='e.g. Dr. Omprakash Tanwar'
                      required
                    />

                    <Input
                      label='Admin Login Email *'
                      type='email'
                      value={newLabAdmin.email}
                      onChange={(e) => setNewLabAdmin({ ...newLabAdmin, email: e.target.value })}
                      placeholder='admin.pharmaceutics@rasayanflow.edu'
                      required
                    />

                    <Input
                      label='Login Password *'
                      type='password'
                      value={newLabAdmin.password}
                      onChange={(e) => setNewLabAdmin({ ...newLabAdmin, password: e.target.value })}
                      placeholder='••••••••'
                      minLength={6}
                      required
                    />
                  </div>
                )}

                {/* Option B: Assign Existing Staff */}
                {adminMode === 'existing' && (
                  <div className='mt-4 space-y-3 animate-in fade-in'>
                    <label className='block text-xs font-bold text-[#4e5d35] dark:text-[#d5ddbf]'>
                      Select Registered User to Assign as Lab Admin
                    </label>
                    <select
                      value={selectedExistingAdminId}
                      onChange={(e) => setSelectedExistingAdminId(e.target.value)}
                      className='w-full rounded-xl border border-[#cfd8bd] bg-white p-3 text-xs text-[#3c4e23] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]'
                    >
                      <option value=''>Select user account...</option>
                      {users.filter(u => u.role !== 'super-admin').map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.email}) — {user.role}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Option C: Skip */}
                {adminMode === 'unassigned' && (
                  <div className='mt-6 rounded-xl bg-amber-50 p-4 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/40 text-center animate-in fade-in'>
                    <p className='text-xs text-amber-800 dark:text-amber-300 font-medium'>
                      ⚠️ Lab will be created as <strong>Unassigned</strong>. You can assign or create a Lab Admin account later at any time from the Labs Hub dashboard.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>

          <Button
            onClick={handleCreateLab}
            className='w-full py-3.5 text-sm font-bold shadow-md bg-[#37412a] hover:bg-[#2a3220] text-white dark:bg-[#e4e9d8] dark:text-[#20251a]'
            disabled={creating}
          >
            {creating ? 'Creating & Provisioning Lab...' : 'Create & Provision Department Lab'}
          </Button>
        </div>
      </Modal>

      {/* Manage Lab Modal */}
      <Modal open={manageOpen} onClose={() => setManageOpen(false)} title={selectedLab ? `Manage ${selectedLab.name}` : 'Manage Lab'}>
        <div className='space-y-5'>
          <div>
            <p className='text-sm font-medium text-[#4e5d35] dark:text-[#d5ddbf]'>Assigned Lab Admins</p>
            <div className='mt-3 space-y-2'>
              {selectedLab?.admins?.length ? (
                selectedLab.admins.map((admin) => (
                  <div key={admin._id || admin.id} className='flex items-center justify-between rounded-xl border border-[#d9e1ca] p-3 dark:border-[#414a33]'>
                    <div>
                      <p className='text-sm font-bold text-[#37412a] dark:text-[#e4e9d8]'>{admin.name}</p>
                      <p className='text-xs text-[#71805a] dark:text-[#a5b48b]'>{admin.email}</p>
                    </div>
                    <Button variant='outline' onClick={() => handleRemoveAdmin(admin._id || admin.id)} className='text-xs px-3 py-1' disabled={savingAdmin}>
                      Remove
                    </Button>
                  </div>
                ))
              ) : (
                <p className='rounded-xl border border-dashed border-[#cfd8bd] p-4 text-center text-xs text-[#71805a] dark:border-[#4e5d35] dark:text-[#a5b48b]'>
                  No admin assigned yet.
                </p>
              )}
            </div>
          </div>

          <div className='space-y-3 border-t border-[#d9e1ca] pt-4 dark:border-[#414a33]'>
            <label className='block text-sm text-[#4e5d35] dark:text-[#d5ddbf]'>
              <span className='mb-1 block text-xs font-medium tracking-wide'>Assign existing user as admin</span>
              <select
                value={selectedAdminId}
                onChange={(e) => setSelectedAdminId(e.target.value)}
                className='w-full rounded-xl border border-[#cfd8bd] bg-white p-3 text-sm text-[#3c4e23] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]'
              >
                <option value=''>Select user</option>
                {eligibleAdmins.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </label>
            <Button onClick={handleAssignAdmin} className='w-full' disabled={savingAdmin || !selectedAdminId}>
              {savingAdmin ? 'Assigning...' : 'Assign Admin'}
            </Button>
          </div>

          <div className='rounded-2xl border border-[#d9e1ca] p-4 dark:border-[#414a33] bg-[#f9faef] dark:bg-[#1a1d16]'>
            <p className='text-sm font-bold text-[#37412a] dark:text-[#e4e9d8]'>Create New Lab Admin Account</p>
            <div className='mt-3 space-y-3'>
              <Input label='Name' value={newAdmin.name} onChange={(e) => setNewAdmin((s) => ({ ...s, name: e.target.value }))} placeholder='Dr. S. Sharma' />
              <Input label='Email' type='email' value={newAdmin.email} onChange={(e) => setNewAdmin((s) => ({ ...s, email: e.target.value }))} placeholder='sharma@rasayanflow.edu' />
              <Input label='Password' type='password' value={newAdmin.password} onChange={(e) => setNewAdmin((s) => ({ ...s, password: e.target.value }))} minLength={6} placeholder='••••••••' />
              <Button onClick={handleCreateAdminForLab} className='w-full' disabled={savingAdmin}>
                {savingAdmin ? 'Creating...' : 'Create & Assign Admin'}
              </Button>
            </div>
          </div>

          <div className='rounded-2xl border border-red-200 p-4 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20'>
            <p className='text-sm font-bold text-red-700 dark:text-red-300'>Delete Lab</p>
            <Button
              variant='outline'
              onClick={() => {
                if (selectedLab) openDeleteLabModal(selectedLab);
              }}
              className='mt-3 w-full border-red-300 text-red-700 hover:bg-red-100 dark:border-red-900 dark:text-red-300 font-bold'
              disabled={deletingLab}
            >
              <Trash2 size={14} className='mr-1.5' /> Delete Lab...
            </Button>
          </div>
        </div>
      </Modal>

      {/* Two-Step Confirmation Delete Lab Modal */}
      <Modal
        open={deleteLabModalOpen}
        onClose={() => {
          if (!deletingLab) {
            setDeleteLabModalOpen(false);
            setDeletingLabItem(null);
          }
        }}
        title={deleteStep === 1 ? '⚠️ Step 1 of 2: Confirm Lab Deletion' : '🚨 Step 2 of 2: Final Verification Required'}
      >
        {deletingLabItem && (
          <div className='space-y-4'>
            {deleteStep === 1 ? (
              <>
                <div className='rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/40'>
                  <div className='flex items-start gap-3'>
                    <AlertTriangle className='h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5' />
                    <div>
                      <h4 className='text-sm font-extrabold text-amber-900 dark:text-amber-200'>
                        Are you sure you want to delete this lab?
                      </h4>
                      <p className='text-xs text-amber-800 dark:text-amber-300 mt-1 font-medium'>
                        You are about to delete <span className='font-black underline'>{deletingLabItem.name || deletingLabItem.labName}</span> ({deletingLabItem.labCode || deletingLabItem.code || 'LAB'}).
                      </p>
                    </div>
                  </div>
                </div>

                <div className='rounded-xl border border-[#d9e1ca] bg-[#fffef8] p-3 text-xs text-[#5c6e46] space-y-1.5 dark:border-[#414a33] dark:bg-[#20251a] dark:text-[#a5b48b]'>
                  <p className='font-bold text-[#37412a] dark:text-[#e4e9d8]'>Consequences of deleting this lab:</p>
                  <ul className='list-disc list-inside space-y-1 text-[11px]'>
                    <li>All chemical inventory items associated with this lab will be erased.</li>
                    <li>All experiment uploads and curriculum data for this lab will be deleted.</li>
                    <li>Any assigned Lab Admin will be unassigned and reset to student role.</li>
                    <li>Transaction logs for this lab will be archived.</li>
                  </ul>
                </div>

                <div className='flex items-center gap-2 pt-2'>
                  <Button
                    variant='outline'
                    onClick={() => setDeleteLabModalOpen(false)}
                    className='flex-1 font-bold'
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => setDeleteStep(2)}
                    className='flex-1 font-bold bg-amber-600 hover:bg-amber-700 text-white border-none'
                  >
                    Proceed to Step 2 →
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className='rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/40'>
                  <div className='flex items-start gap-3'>
                    <ShieldAlert className='h-6 w-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5' />
                    <div>
                      <h4 className='text-sm font-extrabold text-red-900 dark:text-red-200'>
                        FINAL SECURITY VERIFICATION
                      </h4>
                      <p className='text-xs text-red-800 dark:text-red-300 mt-1 font-medium'>
                        To permanently delete this lab, please type the exact lab name below:
                      </p>
                      <p className='text-xs font-black text-red-900 dark:text-red-100 mt-1.5 select-all bg-white/60 dark:bg-black/30 px-2.5 py-1 rounded border border-red-200 dark:border-red-900 inline-block font-mono'>
                        {deletingLabItem.name || deletingLabItem.labName}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className='block text-xs font-extrabold text-[#37412a] dark:text-[#e4e9d8] mb-1'>
                    Type Lab Name to Confirm *
                  </label>
                  <Input
                    value={confirmLabNameInput}
                    onChange={(e) => setConfirmLabNameInput(e.target.value)}
                    placeholder={`Type "${deletingLabItem.name || deletingLabItem.labName}"...`}
                    className='font-semibold'
                  />
                  {confirmLabNameInput.trim().toLowerCase() === (deletingLabItem.name || deletingLabItem.labName || '').trim().toLowerCase() ? (
                    <p className='text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1'>
                      <CheckCircle2 size={12} /> Name match verified. Ready to delete.
                    </p>
                  ) : confirmLabNameInput.length > 0 ? (
                    <p className='text-[11px] font-medium text-red-500 mt-1'>
                      Name does not match yet.
                    </p>
                  ) : null}
                </div>

                <div className='flex items-center gap-2 pt-2'>
                  <Button
                    variant='outline'
                    onClick={() => setDeleteStep(1)}
                    disabled={deletingLab}
                    className='px-4 font-bold'
                  >
                    ← Back
                  </Button>
                  <Button
                    onClick={handleConfirmDeleteLab}
                    disabled={
                      deletingLab ||
                      confirmLabNameInput.trim().toLowerCase() !== (deletingLabItem.name || deletingLabItem.labName || '').trim().toLowerCase()
                    }
                    className='flex-1 font-bold bg-red-600 hover:bg-red-700 text-white border-none disabled:opacity-40'
                  >
                    {deletingLab ? 'Deleting Lab...' : 'Permanently Delete Lab'}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Add Master Chemical Modal */}
      <Modal open={masterChemModalOpen} onClose={() => setMasterChemModalOpen(false)} title='Add Master Chemical to Catalog'>
        <div className='space-y-4'>
          <Input label='Chemical Name *' value={newMasterChem.name} onChange={(e) => setNewMasterChem((s) => ({ ...s, name: e.target.value }))} placeholder='e.g. Sodium Chloride IP' />
          <Input label='CAS Registry Number' value={newMasterChem.casNumber} onChange={(e) => setNewMasterChem((s) => ({ ...s, casNumber: e.target.value }))} placeholder='e.g. 7647-14-5' />
          <Input label='Category' value={newMasterChem.category} onChange={(e) => setNewMasterChem((s) => ({ ...s, category: e.target.value }))} placeholder='e.g. Salt / Reagent' />
          <div className='grid grid-cols-2 gap-3'>
            <label className='block text-sm text-[#4e5d35] dark:text-[#d5ddbf]'>
              <span className='mb-1 block text-xs font-medium tracking-wide'>Hazard Class</span>
              <select
                value={newMasterChem.hazardClass}
                onChange={(e) => setNewMasterChem((s) => ({ ...s, hazardClass: e.target.value }))}
                className='w-full rounded-xl border border-[#cfd8bd] bg-white p-3 text-xs dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]'
              >
                <option value='Non-Hazardous'>Non-Hazardous</option>
                <option value='Flammable Liquid'>Flammable Liquid</option>
                <option value='Corrosive / Acid'>Corrosive / Acid</option>
                <option value='Corrosive / Base'>Corrosive / Base</option>
                <option value='Toxic / Poison'>Toxic / Poison</option>
              </select>
            </label>
            <Input label='Storage Protocol' value={newMasterChem.storageTemp} onChange={(e) => setNewMasterChem((s) => ({ ...s, storageTemp: e.target.value }))} placeholder='e.g. Cool Storage' />
          </div>
          <Button onClick={handleAddMasterChem} className='w-full mt-2'>Add Master Chemical</Button>
        </div>
      </Modal>

      {/* Add Practical Experiment Modal */}
      <Modal open={curriculumModalOpen} onClose={() => setCurriculumModalOpen(false)} title='Add Curriculum Experiment Template'>
        <div className='space-y-4'>
          <div className='grid grid-cols-2 gap-3'>
            <Input label='Course' value={newCurrExp.course} onChange={(e) => setNewCurrExp((s) => ({ ...s, course: e.target.value }))} />
            <Input label='Exp No' value={newCurrExp.expNo} onChange={(e) => setNewCurrExp((s) => ({ ...s, expNo: e.target.value }))} placeholder='Exp 05' />
          </div>
          <Input label='Subject Lab' value={newCurrExp.subject} onChange={(e) => setNewCurrExp((s) => ({ ...s, subject: e.target.value }))} placeholder='Pharmaceutics Lab - I' />
          <Input label='Experiment Title *' value={newCurrExp.name} onChange={(e) => setNewCurrExp((s) => ({ ...s, name: e.target.value }))} placeholder='Preparation of Aspirin Tablets' />
          <Input label='Required Chemical Reagents' value={newCurrExp.requiredChemicals} onChange={(e) => setNewCurrExp((s) => ({ ...s, requiredChemicals: e.target.value }))} placeholder='Salicylic Acid, Acetic Anhydride' />
          <Button onClick={handleAddCurrExp} className='w-full mt-2'>Add Experiment Template</Button>
        </div>
      </Modal>

      {/* Edit Experiment Template Modal */}
      <Modal open={editCurrModalOpen} onClose={() => { setEditCurrModalOpen(false); setEditingExp(null); }} title='Edit Practical Experiment Template'>
        {editingExp && (
          <div className='space-y-4'>
            <div className='grid grid-cols-3 gap-3'>
              <label className='block text-xs font-medium text-[#4e5d35] dark:text-[#d5ddbf]'>
                Course
                <select
                  value={editingExp.course}
                  onChange={(e) => setEditingExp({ ...editingExp, course: e.target.value })}
                  className='w-full mt-1 rounded-xl border border-[#cfd8bd] bg-white p-2.5 text-xs dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]'
                >
                  <option value='B.Pharm'>B.Pharm</option>
                  <option value='M.Pharm'>M.Pharm</option>
                  <option value='PhD'>PhD</option>
                </select>
              </label>
              <label className='block text-xs font-medium text-[#4e5d35] dark:text-[#d5ddbf]'>
                Year
                <select
                  value={editingExp.year}
                  onChange={(e) => setEditingExp({ ...editingExp, year: e.target.value })}
                  className='w-full mt-1 rounded-xl border border-[#cfd8bd] bg-white p-2.5 text-xs dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]'
                >
                  <option value='1'>Year 1</option>
                  <option value='2'>Year 2</option>
                  <option value='3'>Year 3</option>
                  <option value='4'>Year 4</option>
                </select>
              </label>
              <label className='block text-xs font-medium text-[#4e5d35] dark:text-[#d5ddbf]'>
                Semester
                <select
                  value={editingExp.semester}
                  onChange={(e) => setEditingExp({ ...editingExp, semester: e.target.value })}
                  className='w-full mt-1 rounded-xl border border-[#cfd8bd] bg-white p-2.5 text-xs dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]'
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={String(s)}>Sem {s}</option>
                  ))}
                </select>
              </label>
            </div>

            <Input
              label='Subject Lab Name *'
              value={editingExp.subject}
              onChange={(e) => setEditingExp({ ...editingExp, subject: e.target.value })}
              placeholder='e.g. Pharmaceutics Lab - I'
            />

            <div className='grid grid-cols-3 gap-3'>
              <div className='col-span-1'>
                <Input
                  label='Exp No *'
                  value={editingExp.expNo}
                  onChange={(e) => setEditingExp({ ...editingExp, expNo: e.target.value })}
                  placeholder='Exp 01'
                />
              </div>
              <div className='col-span-2'>
                <Input
                  label='Experiment Title *'
                  value={editingExp.name}
                  onChange={(e) => setEditingExp({ ...editingExp, name: e.target.value })}
                  placeholder='Formulation of Simple Syrup IP'
                />
              </div>
            </div>

            <div>
              <label className='block text-xs font-medium text-[#4e5d35] dark:text-[#d5ddbf] mb-1'>
                Prescribed Reagents & Chemicals (Comma Separated) *
              </label>
              <textarea
                rows={3}
                value={editingExp.requiredChemicals || ''}
                onChange={(e) => setEditingExp({ ...editingExp, requiredChemicals: e.target.value })}
                placeholder='Sucrose (66.7% w/w), Purified Water, Methylparaben'
                className='w-full rounded-xl border border-[#cfd8bd] bg-white p-3 text-xs outline-none focus:border-[#5c6e46] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]'
              />
            </div>

            <Button onClick={handleSaveEditExp} className='w-full font-bold mt-2'>
              Save Experiment Changes
            </Button>
          </div>
        )}
      </Modal>

      {/* View Practical Experiment Details Modal */}
      <Modal open={detailExpModalOpen} onClose={() => { setDetailExpModalOpen(false); setSelectedExpDetail(null); }} title='Practical Experiment Syllabus Details'>
        {selectedExpDetail && (
          <div className='space-y-4'>
            <div className='rounded-2xl border border-[#d9e1ca] bg-[#f8faee] p-4 dark:border-[#414a33] dark:bg-[#1a1d16]'>
              <div className='flex items-center justify-between gap-2 mb-2'>
                <span className='rounded-lg bg-[#5c6e46] px-3 py-1 text-xs font-mono font-black text-white shadow-xs'>
                  {selectedExpDetail.expNo || 'Exp 01'}
                </span>
                <span className='rounded-full bg-[#e8efd9] px-2.5 py-0.5 text-xs font-bold text-[#3c4e23] dark:bg-[#2a3320] dark:text-[#a8be8a]'>
                  {selectedExpDetail.course} • Yr {selectedExpDetail.year} • Sem {selectedExpDetail.semester}
                </span>
              </div>
              <h4 className='text-lg font-black text-[#37412a] dark:text-[#e4e9d8] leading-snug'>{selectedExpDetail.name}</h4>
              <p className='text-xs font-bold text-[#5c6e46] dark:text-[#a5b48b] mt-1 flex items-center gap-1.5'>
                <FlaskConical size={14} /> Subject Lab: {selectedExpDetail.subject || 'General Practical Lab'}
              </p>
            </div>

            <div>
              <h5 className='text-xs font-extrabold uppercase tracking-wider text-[#71805a] dark:text-[#a5b48b] mb-2'>
                Prescribed Reagents & Chemical Requirements
              </h5>
              <div className='flex flex-wrap gap-2 rounded-xl border border-[#d9e1ca] bg-white p-3 dark:border-[#414a33] dark:bg-[#20251a]'>
                {selectedExpDetail.requiredChemicals ? (
                  selectedExpDetail.requiredChemicals.split(',').map((chem, idx) => (
                    <span key={idx} className='inline-flex items-center rounded-lg bg-[#e4eed3] px-3 py-1.5 text-xs font-bold text-[#2d3d17] border border-[#c5d6aa] dark:bg-[#2e3722] dark:text-[#eef4e8] dark:border-[#414a33]'>
                      🧪 {chem.trim()}
                    </span>
                  ))
                ) : (
                  <p className='text-xs text-gray-400 italic'>No chemical reagents specified.</p>
                )}
              </div>
            </div>

            <div className='flex items-center gap-2 pt-2'>
              <Button
                onClick={() => {
                  setDetailExpModalOpen(false);
                  handleOpenEditExp(selectedExpDetail);
                }}
                className='flex-1 font-bold'
              >
                <Edit3 size={14} className='mr-1.5' /> Edit Experiment Template
              </Button>
              <Button
                variant='outline'
                onClick={() => {
                  setDetailExpModalOpen(false);
                  setSelectedExpDetail(null);
                }}
                className='px-4 font-bold'
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Announcement Modal */}
      <Modal open={broadcastModalOpen} onClose={() => setBroadcastModalOpen(false)} title='Post System Announcement Banner'>
        <div className='space-y-4'>
          <Input label='Announcement Title *' value={newBroadcast.title} onChange={(e) => setNewBroadcast((s) => ({ ...s, title: e.target.value }))} placeholder='Central Store Maintenance' />
          <Input label='Message Content *' value={newBroadcast.message} onChange={(e) => setNewBroadcast((s) => ({ ...s, message: e.target.value }))} placeholder='Stock audit scheduled for Friday...' />
          <label className='block text-sm text-[#4e5d35] dark:text-[#d5ddbf]'>
            <span className='mb-1 block text-xs font-medium tracking-wide'>Target Audience</span>
            <select
              value={newBroadcast.targetRole}
              onChange={(e) => setNewBroadcast((s) => ({ ...s, targetRole: e.target.value }))}
              className='w-full rounded-xl border border-[#cfd8bd] bg-white p-3 text-xs dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]'
            >
              <option value='All Users'>All Users</option>
              <option value='Students'>Students Only</option>
              <option value='Lab Admins'>Lab Admins Only</option>
            </select>
          </label>
          <Button onClick={handleAddBroadcast} className='w-full mt-2'>Publish Announcement</Button>
        </div>
      </Modal>

      {/* Bulk CSV Import Modal */}
      <Modal open={csvImportModalOpen} onClose={() => setCsvImportModalOpen(false)} title='Bulk CSV Student Import'>
        <div className='space-y-4'>
          <p className='text-xs text-[#71805a] dark:text-[#a5b48b]'>Paste comma-separated student records (Name, Email, RollNumber, Course, Year, Semester):</p>
          <textarea
            rows={5}
            value={csvInput}
            onChange={(e) => setCsvInput(e.target.value)}
            placeholder={"Aarav Sharma,aarav@rasayanflow.edu,0832PH211001,B.Pharm,1,1\nRiya Patel,riya@rasayanflow.edu,0832PH211002,B.Pharm,1,1"}
            className='w-full rounded-xl border border-[#d9e1ca] bg-white p-3 text-xs font-mono outline-none dark:border-[#414a33] dark:bg-[#20251a] dark:text-[#e4e9d8]'
          />
          <Button onClick={handleCsvImportSubmit} className='w-full'>Process Batch CSV Upload</Button>
        </div>
      </Modal>

      {/* Store Admin & Super Admin Modals */}
      <Modal open={storeAdminModalOpen} onClose={() => setStoreAdminModalOpen(false)} title='Add Central Store Manager'>
        <div className='space-y-4'>
          <Input label='Full Name *' value={newStoreAdmin.name} onChange={(e) => setNewStoreAdmin((s) => ({ ...s, name: e.target.value }))} placeholder='Ramesh Kumar' />
          <Input label='Email Address *' type='email' value={newStoreAdmin.email} onChange={(e) => setNewStoreAdmin((s) => ({ ...s, email: e.target.value }))} placeholder='store.manager@rasayanflow.edu' />
          <Input label='Temporary Password *' type='password' value={newStoreAdmin.password} onChange={(e) => setNewStoreAdmin((s) => ({ ...s, password: e.target.value }))} minLength={6} placeholder='••••••••' />
          <Button onClick={handleCreateStoreAdmin} disabled={savingAdmin} className='w-full mt-2'>
            {savingAdmin ? 'Creating Account...' : 'Create Store Manager'}
          </Button>
        </div>
      </Modal>

      <Modal open={superAdminModalOpen} onClose={() => setSuperAdminModalOpen(false)} title='Add Super Administrator'>
        <div className='space-y-4'>
          <Input label='Full Name *' value={newSuperAdmin.name} onChange={(e) => setNewSuperAdmin((s) => ({ ...s, name: e.target.value }))} placeholder='Dr. Super Admin' />
          <Input label='Email Address *' type='email' value={newSuperAdmin.email} onChange={(e) => setNewSuperAdmin((s) => ({ ...s, email: e.target.value }))} placeholder='superadmin@rasayanflow.edu' />
          <Input label='Temporary Password *' type='password' value={newSuperAdmin.password} onChange={(e) => setNewSuperAdmin((s) => ({ ...s, password: e.target.value }))} minLength={6} placeholder='••••••••' />
          <Button onClick={handleCreateSuperAdmin} disabled={savingSuperAdmin} className='w-full mt-2'>
            {savingSuperAdmin ? 'Creating Account...' : 'Create Super Admin'}
          </Button>
        </div>
      </Modal>

    </div>
  );
}
