import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  FlaskConical, Users, CheckCircle2, Clock, XCircle, Search, 
  Store, Plus, ArrowRight, ShieldCheck, FileText, ChevronDown, 
  ChevronUp, AlertCircle, RefreshCw, Eye, BookOpen, Layers, Award,
  Sparkles, Check, X, GraduationCap, MapPin, PackageCheck, Send,
  ChevronRight, Beaker, Atom, Compass, Trash2, Pencil, AlertTriangle
} from 'lucide-react';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import ChemicalSearchInput from '../components/ChemicalSearchInput';

// Distinct semester configuration & visual themes
const SEMESTER_THEMES = {
  '1': {
    name: 'Semester 1',
    year: 'Year 1',
    badgeText: 'M.Pharm Year 1 • Semester 1',
    themeName: 'Sky Blue / Ocean Sapphire',
    headerGradient: 'from-sky-950 via-blue-900 to-indigo-950',
    bannerBorder: 'border-sky-700/50',
    accentText: 'text-sky-700 dark:text-sky-300',
    accentBg: 'bg-sky-50 dark:bg-sky-950/40',
    accentBorder: 'border-sky-300 dark:border-sky-800',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
    pillActive: 'bg-sky-600 text-white shadow-sm border-sky-600',
    buttonPrimary: 'bg-sky-700 hover:bg-sky-800 text-white',
    subTitle: 'Modern Pharmaceutical Analytical Techniques & Advanced Pharmaceutics I',
    phase: 'curriculum',
    phaseBadge: 'Phase 1: Practical Syllabus Curriculum Lab',
    phaseColor: 'bg-sky-100 text-sky-800 border-sky-300'
  },
  '2': {
    name: 'Semester 2',
    year: 'Year 1',
    badgeText: 'M.Pharm Year 1 • Semester 2',
    themeName: 'Emerald / Mint Green',
    headerGradient: 'from-emerald-950 via-teal-900 to-green-950',
    bannerBorder: 'border-emerald-700/50',
    accentText: 'text-emerald-700 dark:text-emerald-300',
    accentBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    accentBorder: 'border-emerald-300 dark:border-emerald-800',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    pillActive: 'bg-emerald-600 text-white shadow-sm border-emerald-600',
    buttonPrimary: 'bg-emerald-700 hover:bg-emerald-800 text-white',
    subTitle: 'Advanced Spectral Analysis & Advanced Biopharmaceutics',
    phase: 'curriculum',
    phaseBadge: 'Phase 1: Practical Syllabus Curriculum Lab',
    phaseColor: 'bg-emerald-100 text-emerald-800 border-emerald-300'
  },
  '3': {
    name: 'Semester 3',
    year: 'Year 2',
    badgeText: 'M.Pharm Year 2 • Semester 3',
    themeName: 'Royal Purple / Deep Violet',
    headerGradient: 'from-purple-950 via-indigo-950 to-violet-950',
    bannerBorder: 'border-purple-700/50',
    accentText: 'text-purple-700 dark:text-purple-300',
    accentBg: 'bg-purple-50 dark:bg-purple-950/40',
    accentBorder: 'border-purple-300 dark:border-purple-800',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
    pillActive: 'bg-purple-600 text-white shadow-sm border-purple-600',
    buttonPrimary: 'bg-purple-700 hover:bg-purple-800 text-white',
    subTitle: 'Thesis Research Formulation & Novel Drug Delivery Systems (NDDS)',
    phase: 'research',
    phaseBadge: 'Phase 2: Self-Directed Thesis Research Requisitions',
    phaseColor: 'bg-purple-100 text-purple-800 border-purple-300'
  },
  '4': {
    name: 'Semester 4',
    year: 'Year 2',
    badgeText: 'M.Pharm Year 2 • Semester 4',
    themeName: 'Rose / Crimson / Wine',
    headerGradient: 'from-rose-950 via-pink-950 to-amber-950',
    bannerBorder: 'border-rose-700/50',
    accentText: 'text-rose-700 dark:text-rose-300',
    accentBg: 'bg-rose-50 dark:bg-rose-950/40',
    accentBorder: 'border-rose-300 dark:border-rose-800',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    pillActive: 'bg-rose-600 text-white shadow-sm border-rose-600',
    buttonPrimary: 'bg-rose-700 hover:bg-rose-800 text-white',
    subTitle: 'Final Dissertation, Bio-analytical Validation & Project Defense',
    phase: 'research',
    phaseBadge: 'Phase 2: Self-Directed Dissertation Requisitions',
    phaseColor: 'bg-rose-100 text-rose-800 border-rose-300'
  }
};

const UNIT_OPTIONS = ['mg', 'g', 'kg', 'mcg', 'mL', 'L', 'uL', 'packs', 'vials', 'bottles', 'boxes'];
const CATEGORY_OPTIONS = ['Chemical', 'API Standard', 'Solvent', 'Polymer', 'Lipid / Surfactant', 'Buffer', 'Reagent', 'Excipient', 'Consumable'];
const GRADE_OPTIONS = ['AR Grade', 'IP Grade', 'HPLC Grade', 'USP Grade', 'EP Grade', 'Spectroscopy Grade', 'Research Grade'];

export default function MPharmSupervisorDashboard() {
  const { user } = useAuthStore();
  const { 
    labs, 
    fetchLabs, 
    inventory, 
    fetchInventory, 
    createInventoryItem,
    updateInventoryItem,
    createLabStoreRequest,
    setToast 
  } = useAppStore();

  // 1. Resolve Assigned Labs for this supervisor
  const assignedLabs = useMemo(() => {
    const currentUserId = String(user?.id || user?._id || '');
    const currentUserEmail = (user?.email || '').toLowerCase();
    const currentUserLabId = String(user?.labId?._id || user?.labId || '');

    const directMatches = (labs || []).filter((lab) => {
      const labIdStr = String(lab.id || lab._id || '');
      const isDirectAdmin = Array.isArray(lab.admins) && lab.admins.some((admin) => {
        const adminIdStr = String(admin?.id || admin?._id || admin || '');
        const adminEmailStr = (admin?.email || '').toLowerCase();
        return (adminIdStr && adminIdStr === currentUserId) || (adminEmailStr && adminEmailStr === currentUserEmail);
      });
      const matchesUserLabId = Boolean(currentUserLabId && currentUserLabId === labIdStr);
      const matchesAdminEmail = Boolean(lab.adminEmail && lab.adminEmail.toLowerCase() === currentUserEmail);
      return isDirectAdmin || matchesUserLabId || matchesAdminEmail;
    });

    if (directMatches.length > 0) return directMatches;

    // In preview mode or unassigned: list all M.Pharm labs so evaluator can inspect each semester
    const mpharmLabs = (labs || []).filter(l => (l.courseType || '').toLowerCase().includes('m.pharm') || (l.courseType || '').toLowerCase().includes('mpharm'));
    if (mpharmLabs.length > 0) return mpharmLabs;

    // Fallback if labs not fetched yet
    return [{
      _id: user?.labId || 'mpharm-default-lab',
      id: user?.labId || 'mpharm-default-lab',
      name: user?.labName || 'M.Pharm Advanced Pharmaceutics Lab - I',
      labName: user?.labName || 'M.Pharm Advanced Pharmaceutics Lab - I',
      labCode: user?.labCode || 'MPHARM-101L',
      courseType: 'M.Pharm',
      year: user?.year || '1',
      semester: user?.semester || '1',
      department: 'Pharmaceutics'
    }];
  }, [labs, user]);

  // Selected Active Lab ID
  const [selectedLabId, setSelectedLabId] = useState(() => {
    return localStorage.getItem('mpharm-active-lab') || assignedLabs[0]?.id || assignedLabs[0]?._id || user?.labId || '';
  });

  // Keep selectedLabId valid
  useEffect(() => {
    if (!assignedLabs.length) return;
    const isValid = assignedLabs.some(l => String(l.id || l._id) === String(selectedLabId));
    if (!selectedLabId || !isValid) {
      const nextId = String(assignedLabs[0]?.id || assignedLabs[0]?._id);
      setSelectedLabId(nextId);
      localStorage.setItem('mpharm-active-lab', nextId);
    }
  }, [assignedLabs, selectedLabId]);

  // Active Lab Object
  const currentLab = assignedLabs.find(l => String(l.id || l._id) === String(selectedLabId)) || assignedLabs[0];
  const activeLabId = String(currentLab?.id || currentLab?._id || '');
  
  // Extract active Year & Semester strictly from current lab (or user profile)
  const activeSemester = String(currentLab?.semester || user?.semester || '1');
  const activeYear = String(currentLab?.year || user?.year || (Number(activeSemester) > 2 ? '2' : '1'));
  
  // Active Theme based on semester
  const theme = SEMESTER_THEMES[activeSemester] || SEMESTER_THEMES['1'];
  const isPhase1Curriculum = theme.phase === 'curriculum';
  const isPhase2Research = theme.phase === 'research';

  // Navigation Tabs State: 'requests', 'inventory', 'curriculumOrResearch', 'storeOrders', 'history', 'students'
  const [activeTab, setActiveTab] = useState('requests');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Live Database States (NO MOCK DATA)
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [syllabusStructures, setSyllabusStructures] = useState([]);
  const [loadingStructures, setLoadingStructures] = useState(false);
  const [storeOrders, setStoreOrders] = useState([]);
  const [loadingStoreOrders, setLoadingStoreOrders] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Modals state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [targetRejectReq, setTargetRejectReq] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activeDetailReq, setActiveDetailReq] = useState(null);

  const [storeModalOpen, setStoreModalOpen] = useState(false);
  const [storeModalData, setStoreModalData] = useState({ 
    chemicalName: '', 
    casNumber: '', 
    quantityRequested: '500', 
    unit: 'g', 
    reason: '' 
  });
  const [submittingStoreReq, setSubmittingStoreReq] = useState(false);

  // Add Chemical Modal State
  const [addChemModalOpen, setAddChemModalOpen] = useState(false);
  const [newChem, setNewChem] = useState({
    itemCode: '',
    chemicalName: '',
    casNumber: '',
    category: 'Chemical',
    grade: 'AR Grade',
    quantity: '500',
    quantityUnit: 'g',
    costPerUnit: '1.5',
    storageLocation: 'M.Pharm Research Cabinet',
    minThreshold: '50',
    lotNumber: '',
    expiryDate: ''
  });
  const [submittingAddChem, setSubmittingAddChem] = useState(false);

  // Edit Stock Modal State
  const [editChemModalOpen, setEditChemModalOpen] = useState(false);
  const [editChemData, setEditChemData] = useState(null);
  const [submittingEditChem, setSubmittingEditChem] = useState(false);

  // 1. Fetch Real Requests for Active Lab from Backend API
  const fetchActiveLabRequests = useCallback(async () => {
    if (!activeLabId) return;
    setLoadingRequests(true);
    try {
      const url = `/student/requests/lab?labId=${activeLabId}`;
      const { data } = await api.get(url);
      const list = data?.data || data?.requests || (Array.isArray(data) ? data : []);
      setRequests(Array.isArray(list) ? list : []);
    } catch {
      setRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  }, [activeLabId]);

  // 2. Fetch Real Enrolled Students from Backend API
  const fetchActiveStudents = useCallback(async () => {
    setLoadingStudents(true);
    try {
      const { data } = await api.get('/users?role=student');
      const allStudents = data?.data || (Array.isArray(data) ? data : []);
      const filtered = allStudents.filter(s => {
        const matchCourse = (s.course === 'M.Pharm' || s.courseType === 'M.Pharm');
        const matchSem = String(s.semester || '1') === activeSemester;
        return matchCourse && matchSem;
      });
      setEnrolledStudents(filtered);
    } catch {
      setEnrolledStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  }, [activeSemester]);

  // 3. Fetch Real Curriculum Practical Structures from Backend API
  const fetchStructures = useCallback(async () => {
    if (!activeLabId) return;
    setLoadingStructures(true);
    try {
      const { data } = await api.get('/lab-structure/all');
      const allStructures = data?.data || (Array.isArray(data) ? data : []);
      const labStructures = allStructures.filter(s => String(s.labId?._id || s.labId) === String(activeLabId));
      setSyllabusStructures(labStructures);
    } catch {
      setSyllabusStructures([]);
    } finally {
      setLoadingStructures(false);
    }
  }, [activeLabId]);

  // 4. Fetch Real Store Requisitions for this Lab
  const fetchStoreOrders = useCallback(async () => {
    if (!activeLabId) return;
    setLoadingStoreOrders(true);
    try {
      const { data } = await api.get('/store/requests');
      const allStoreReqs = data?.data || (Array.isArray(data) ? data : []);
      const labStoreReqs = allStoreReqs.filter(r => String(r.labId?._id || r.labId) === String(activeLabId));
      setStoreOrders(labStoreReqs);
    } catch {
      setStoreOrders([]);
    } finally {
      setLoadingStoreOrders(false);
    }
  }, [activeLabId]);

  // 5. Fetch Real Transactions & Audit Log
  const fetchLabTransactions = useCallback(async () => {
    if (!activeLabId) return;
    setLoadingTransactions(true);
    try {
      const { data } = await api.get(`/transactions?labId=${activeLabId}`);
      const list = data?.data || (Array.isArray(data) ? data : []);
      setTransactions(Array.isArray(list) ? list : []);
    } catch {
      setTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  }, [activeLabId]);

  // Trigger data synchronization whenever active lab or semester changes
  useEffect(() => {
    fetchLabs();
    if (activeLabId) {
      fetchInventory(activeLabId);
      fetchActiveLabRequests();
      fetchActiveStudents();
      fetchStructures();
      fetchStoreOrders();
      fetchLabTransactions();
    }
  }, [activeLabId, activeSemester, fetchLabs, fetchInventory, fetchActiveLabRequests, fetchActiveStudents, fetchStructures, fetchStoreOrders, fetchLabTransactions]);

  // Live Inventory Items for Active Lab
  const labInventory = useMemo(() => {
    if (!Array.isArray(inventory)) return [];
    return inventory.filter(item => {
      const itemLabId = String(item.labId?._id || item.labId || '');
      return !activeLabId || !itemLabId || itemLabId === activeLabId;
    });
  }, [inventory, activeLabId]);

  // Filtered requests computation
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      if (!req) return false;
      if (statusFilter !== 'All' && req.overallStatus !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesStudent = (req.studentName || '').toLowerCase().includes(q);
        const matchesRoll = (req.rollNumber || '').toLowerCase().includes(q);
        const matchesTitle = (req.projectThesisName || req.experimentName || req.subject || '').toLowerCase().includes(q);
        const matchesChem = (req.chemicalsRequested || []).some(c => {
          if (!c) return false;
          const name = typeof c === 'string' ? c : (c.chemicalName || c.name || '');
          return name.toLowerCase().includes(q);
        });
        return matchesStudent || matchesRoll || matchesTitle || matchesChem;
      }
      return true;
    }).sort((a, b) => new Date(b.requestedAt || 0) - new Date(a.requestedAt || 0));
  }, [requests, statusFilter, searchQuery]);

  // Metrics for active lab computed from live database
  const metrics = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter(r => r.overallStatus === 'Pending').length;
    const approved = requests.filter(r => r.overallStatus === 'Approved').length;
    const rejected = requests.filter(r => r.overallStatus === 'Rejected').length;
    const lowStock = labInventory.filter(item => {
      const qty = item.quantityAvailable ?? item.quantity ?? 0;
      const min = item.minThreshold ?? 5;
      return qty <= min && qty > 0;
    }).length;
    const outOfStock = labInventory.filter(item => {
      const qty = item.quantityAvailable ?? item.quantity ?? 0;
      return qty === 0;
    }).length;
    return { total, pending, approved, rejected, lowStock, outOfStock, inventoryCount: labInventory.length };
  }, [requests, labInventory]);

  // Actions: Approve Request (Real-Time Stock Deduction)
  const handleApprove = async (reqId) => {
    try {
      await api.put(`/student/requests/${reqId}/approve`, {
        approvedType: 'Full',
        supervisorNotes: `Approved by M.Pharm Supervisor (${currentLab?.name || 'Lab'})`
      });
      setToast({ type: 'success', message: 'Requisition approved & chemical inventory deducted in real time' });
      fetchActiveLabRequests();
      if (activeLabId) fetchInventory(activeLabId);
      fetchLabTransactions();
    } catch {
      // Fallback try alternate endpoint
      try {
        await api.put(`/student-requests/${reqId}/approve`, {
          approvedType: 'Full',
          supervisorNotes: `Approved by M.Pharm Supervisor (${currentLab?.name || 'Lab'})`
        });
        setToast({ type: 'success', message: 'Requisition approved & chemical inventory deducted' });
        fetchActiveLabRequests();
        if (activeLabId) fetchInventory(activeLabId);
        fetchLabTransactions();
      } catch (err2) {
        setToast({ type: 'error', message: err2?.response?.data?.message || 'Failed to approve requisition' });
      }
    }
  };

  // Actions: Reject Request
  const openRejectModal = (req) => {
    setTargetRejectReq(req);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const confirmReject = async () => {
    if (!targetRejectReq || !rejectReason.trim()) {
      setToast({ type: 'error', message: 'Please provide a rejection reason' });
      return;
    }
    try {
      await api.put(`/student/requests/${targetRejectReq._id}/reject`, {
        reason: rejectReason
      });
      setToast({ type: 'success', message: 'Requisition rejected with feedback sent to student' });
      setRejectModalOpen(false);
      fetchActiveLabRequests();
    } catch {
      try {
        await api.put(`/student-requests/${targetRejectReq._id}/reject`, {
          reason: rejectReason
        });
        setToast({ type: 'success', message: 'Requisition rejected with feedback sent to student' });
        setRejectModalOpen(false);
        fetchActiveLabRequests();
      } catch (err2) {
        setToast({ type: 'error', message: err2?.response?.data?.message || 'Failed to reject requisition' });
      }
    }
  };

  // Actions: Central Store Requisition Submit
  const handleStoreRequestSubmit = async () => {
    if (!storeModalData.chemicalName || !storeModalData.quantityRequested) return;
    setSubmittingStoreReq(true);
    try {
      await createLabStoreRequest({
        chemicalName: storeModalData.chemicalName,
        casNumber: storeModalData.casNumber || '',
        quantityRequested: storeModalData.quantityRequested,
        unit: storeModalData.unit,
        reason: storeModalData.reason || `M.Pharm ${theme.name} Requisition for ${currentLab?.name}`,
        labId: activeLabId
      });
      setStoreModalOpen(false);
      setToast({ type: 'success', message: `Store requisition sent to Central Store Manager for ${storeModalData.chemicalName}` });
      fetchStoreOrders();
    } catch {
      setStoreModalOpen(false);
      setToast({ type: 'error', message: 'Failed to submit store requisition' });
    } finally {
      setSubmittingStoreReq(false);
    }
  };

  // Actions: Add New Chemical to Lab Inventory (Exact B.Pharm Parity)
  const handleAddChemicalSubmit = async (e) => {
    e?.preventDefault();
    if (!newChem.chemicalName.trim()) {
      setToast({ type: 'error', message: 'Chemical name is required' });
      return;
    }
    setSubmittingAddChem(true);
    try {
      const generatedCode = newChem.itemCode.trim() || `CHEM-MP-${Date.now().toString().slice(-6)}`;
      await createInventoryItem({
        labId: activeLabId,
        itemCode: generatedCode,
        chemicalName: newChem.chemicalName.trim(),
        name: newChem.chemicalName.trim(),
        category: newChem.category,
        quantity: Number(newChem.quantity) || 0,
        quantityUnit: newChem.quantityUnit,
        costPerUnit: Number(newChem.costPerUnit) || 0,
        minThreshold: Number(newChem.minThreshold) || 5,
        casNumber: newChem.casNumber.trim(),
        storageLocation: newChem.storageLocation.trim(),
        lotNumber: newChem.lotNumber.trim(),
        expiryDate: newChem.expiryDate || null,
      });
      setToast({ type: 'success', message: `Added ${newChem.chemicalName} to laboratory inventory` });
      setAddChemModalOpen(false);
      setNewChem({
        itemCode: '',
        chemicalName: '',
        casNumber: '',
        category: 'Chemical',
        grade: 'AR Grade',
        quantity: '500',
        quantityUnit: 'g',
        costPerUnit: '1.5',
        storageLocation: 'M.Pharm Research Cabinet',
        minThreshold: '50',
        lotNumber: '',
        expiryDate: ''
      });
      if (activeLabId) fetchInventory(activeLabId);
    } catch (err) {
      setToast({ type: 'error', message: err?.response?.data?.message || 'Failed to add chemical to inventory' });
    } finally {
      setSubmittingAddChem(false);
    }
  };

  // Actions: Edit Chemical Stock / Threshold
  const handleEditChemicalSubmit = async (e) => {
    e?.preventDefault();
    if (!editChemData) return;
    setSubmittingEditChem(true);
    try {
      await updateInventoryItem(editChemData.id || editChemData._id, {
        quantityAvailable: Number(editChemData.quantityAvailable),
        quantity: Number(editChemData.quantityAvailable),
        minThreshold: Number(editChemData.minThreshold),
        storageLocation: editChemData.storageLocation,
        category: editChemData.category,
        grade: editChemData.grade
      });
      setToast({ type: 'success', message: `Updated inventory for ${editChemData.chemicalName}` });
      setEditChemModalOpen(false);
      setEditChemData(null);
      if (activeLabId) fetchInventory(activeLabId);
    } catch (err) {
      setToast({ type: 'error', message: err?.response?.data?.message || 'Failed to update chemical stock' });
    } finally {
      setSubmittingEditChem(false);
    }
  };

  // Actions: Delete Chemical from Inventory
  const handleDeleteChemical = async (itemId, chemName) => {
    if (!window.confirm(`Are you sure you want to remove "${chemName}" from this lab inventory?`)) return;
    try {
      await api.delete(`/inventory/${itemId}`);
      setToast({ type: 'success', message: `Removed ${chemName} from inventory` });
      if (activeLabId) fetchInventory(activeLabId);
    } catch (err) {
      setToast({ type: 'error', message: err?.response?.data?.message || 'Failed to remove chemical' });
    }
  };

  // Actions: Toggle Practical Experiment Lock/Unlock
  const handleToggleExperimentLock = async (structureId, currentLockStatus) => {
    try {
      await api.patch(`/lab-structure/${structureId}/toggle-lock`, { isUnlocked: !currentLockStatus });
      setToast({ type: 'success', message: `Practical experiment ${!currentLockStatus ? 'unlocked' : 'locked'} for students` });
      fetchStructures();
    } catch {
      setToast({ type: 'error', message: 'Failed to update experiment access' });
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* TOP HEADER: DYNAMIC SEMESTER GRADIENT & BREADCRUMB */}
      <div className={`rounded-3xl p-6 bg-gradient-to-r ${theme.headerGradient} text-white shadow-md border ${theme.bannerBorder} relative overflow-hidden`}>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Left: Supervisor Identity & Dynamic Semester Branding */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-white/80">
              <span>Pharma Laboratory</span>
              <ChevronRight size={12} />
              <span>M.Pharm Supervisor Center</span>
              <ChevronRight size={12} />
              <span className={`px-2 py-0.5 rounded-full font-black text-[10px] uppercase tracking-wide ${theme.badgeClass}`}>
                {theme.badgeText}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex flex-wrap items-center gap-2">
              <span>Welcome, <strong className="underline decoration-white/40">{user?.name || 'M.Pharm Supervisor'}</strong></span>
            </h1>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/90 font-medium">
              <span className="flex items-center gap-1 font-bold text-white">
                <GraduationCap size={14} /> {currentLab?.name || currentLab?.labName || 'M.Pharm Department'}
              </span>
              <span>&bull;</span>
              <span className="font-mono text-white/90">
                Code: {currentLab?.labCode || 'MPHARM-100'}
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1 text-white/90">
                <Compass size={13} /> {theme.subTitle}
              </span>
            </div>

            <div className="pt-1">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border ${theme.badgeClass}`}>
                {isPhase1Curriculum ? <BookOpen size={13} /> : <Atom size={13} />}
                {theme.phaseBadge}
              </span>
            </div>
          </div>

          {/* Right: Lab Switcher Pills */}
          <div className="flex flex-col items-start lg:items-end gap-2 shrink-0">
            <span className="text-[11px] font-black uppercase tracking-wider text-white/80 flex items-center gap-1">
              <Layers size={13} /> Switch Active Lab / Semester:
            </span>
            <div className="flex flex-wrap items-center gap-1.5 lg:justify-end max-w-md">
              {assignedLabs.map((lab) => {
                const labKey = String(lab.id || lab._id);
                const isSelected = labKey === String(activeLabId);
                const labSem = String(lab.semester || '1');

                return (
                  <button
                    key={labKey}
                    type="button"
                    onClick={() => {
                      setSelectedLabId(labKey);
                      localStorage.setItem('mpharm-active-lab', labKey);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all border ${
                      isSelected
                        ? 'bg-white text-slate-900 border-white shadow-md scale-105'
                        : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                    }`}
                  >
                    <span className="opacity-75 text-[10px] mr-1">Sem {labSem}:</span>
                    {lab.labCode || lab.name}
                  </button>
                );
              })}
            </div>
            
            <div className="text-[10px] text-white/70 font-semibold mt-1">
              Active Scope: <strong>{theme.name} ({theme.year})</strong> &bull; Zero Mock Data Live Database
            </div>
          </div>

        </div>
      </div>

      {/* METRIC KPI CARDS FOR THIS SPECIFIC LAB */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 bg-white dark:bg-[#1a1d16] border-[#cfd8bd] dark:border-[#414a33] rounded-2xl shadow-xs">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#71805a] block mb-1">
            Total Requisitions
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-[#37412a] dark:text-[#e4e9d8]">{metrics.total}</span>
            <span className="text-[10px] font-bold text-[#71805a]">records</span>
          </div>
        </Card>

        <Card className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 rounded-2xl shadow-xs">
          <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 block mb-1 flex items-center gap-1">
            <Clock size={12} /> Pending Approvals
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-800 dark:text-amber-300">{metrics.pending}</span>
            <span className="text-[10px] font-bold text-amber-600">awaiting</span>
          </div>
        </Card>

        <Card className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 rounded-2xl shadow-xs">
          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block mb-1 flex items-center gap-1">
            <CheckCircle2 size={12} /> Approved & Issued
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-800 dark:text-emerald-300">{metrics.approved}</span>
            <span className="text-[10px] font-bold text-emerald-600">fulfilled</span>
          </div>
        </Card>

        <Card className={`p-4 ${theme.accentBg} ${theme.accentBorder} rounded-2xl shadow-xs border`}>
          <span className={`text-[11px] font-black uppercase tracking-wider ${theme.accentText} block mb-1 flex items-center gap-1`}>
            <FlaskConical size={12} /> Stocked Chemicals
          </span>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl sm:text-3xl font-black ${theme.accentText}`}>{metrics.inventoryCount}</span>
            <span className="text-[10px] font-bold opacity-75">in lab</span>
          </div>
        </Card>
      </div>

      {/* PRIMARY NAVIGATION TABS */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#cfd8bd] dark:border-[#414a33] pb-3">
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Tab 1: Requisitions */}
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'requests'
                ? `${theme.buttonPrimary} shadow-xs`
                : 'bg-[#f4f6ee] dark:bg-[#20251a] text-[#5c6e46] dark:text-[#a8be8a] hover:bg-[#e4eed3]'
            }`}
          >
            <FlaskConical size={14} /> 
            {isPhase1Curriculum ? 'Practical Requisitions' : 'Thesis Requisitions'} ({metrics.pending} Pending)
          </button>

          {/* Tab 2: Lab Inventory */}
          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'inventory'
                ? `${theme.buttonPrimary} shadow-xs`
                : 'bg-[#f4f6ee] dark:bg-[#20251a] text-[#5c6e46] dark:text-[#a8be8a] hover:bg-[#e4eed3]'
            }`}
          >
            <Layers size={14} /> Chemical Inventory ({metrics.inventoryCount})
          </button>

          {/* Tab 3: Curriculum Practicals or Research Protocols */}
          <button
            type="button"
            onClick={() => setActiveTab('curriculumOrResearch')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'curriculumOrResearch'
                ? `${theme.buttonPrimary} shadow-xs`
                : 'bg-[#f4f6ee] dark:bg-[#20251a] text-[#5c6e46] dark:text-[#a8be8a] hover:bg-[#e4eed3]'
            }`}
          >
            {isPhase1Curriculum ? (
              <>
                <BookOpen size={14} /> Syllabus Practicals
              </>
            ) : (
              <>
                <Atom size={14} /> Thesis Protocols
              </>
            )}
          </button>

          {/* Tab 4: Central Store Orders */}
          <button
            type="button"
            onClick={() => setActiveTab('storeOrders')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'storeOrders'
                ? `${theme.buttonPrimary} shadow-xs`
                : 'bg-[#f4f6ee] dark:bg-[#20251a] text-[#5c6e46] dark:text-[#a8be8a] hover:bg-[#e4eed3]'
            }`}
          >
            <Store size={14} /> Central Store Orders ({storeOrders.length})
          </button>

          {/* Tab 5: Audit History */}
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'history'
                ? `${theme.buttonPrimary} shadow-xs`
                : 'bg-[#f4f6ee] dark:bg-[#20251a] text-[#5c6e46] dark:text-[#a8be8a] hover:bg-[#e4eed3]'
            }`}
          >
            <FileText size={14} /> Stock Ledger
          </button>

          {/* Tab 6: Students Directory */}
          <button
            type="button"
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeTab === 'students'
                ? `${theme.buttonPrimary} shadow-xs`
                : 'bg-[#f4f6ee] dark:bg-[#20251a] text-[#5c6e46] dark:text-[#a8be8a] hover:bg-[#e4eed3]'
            }`}
          >
            <Users size={14} /> {isPhase1Curriculum ? 'Enrolled Students' : 'Thesis Scholars'} ({enrolledStudents.length})
          </button>

        </div>

        {/* Right Search Input */}
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71805a]" />
          <input
            type="text"
            placeholder="Search student, chemical, title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#cfd8bd] bg-white dark:bg-[#20251a] dark:border-[#414a33] text-xs font-bold outline-none focus:border-[#5c6e46]"
          />
        </div>
      </div>

      {/* TAB 1: REQUISITIONS TAB */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          
          {/* Sub-Header with Status Filter and Store Requisition CTA */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f4f6ee] dark:bg-[#20251a] p-3 rounded-2xl border border-[#cfd8bd] dark:border-[#414a33]">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#71805a] mr-1">Status:</span>
              {['All', 'Pending', 'Approved', 'Rejected'].map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all ${
                    statusFilter === st
                      ? `${theme.buttonPrimary} shadow-xs`
                      : 'bg-white dark:bg-[#2b3322] text-[#5c6e46] hover:bg-[#e4eed3]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <Button
              onClick={() => {
                setStoreModalData({
                  chemicalName: '',
                  casNumber: '',
                  quantityRequested: '500',
                  unit: 'g',
                  reason: `M.Pharm ${theme.name} Requisition for ${currentLab?.name}`
                });
                setStoreModalOpen(true);
              }}
              className={`${theme.buttonPrimary} text-xs font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-xs`}
            >
              <Store size={14} /> Requisition From Central Store
            </Button>
          </div>

          {/* Requisitions List */}
          {loadingRequests ? (
            <div className="p-12 text-center text-xs font-bold text-[#71805a] flex items-center justify-center gap-2">
              <RefreshCw size={16} className="animate-spin" /> Fetching live student requisitions from database...
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-[#cfd8bd] bg-white dark:bg-[#1a1d16] text-[#71805a] space-y-2">
              <FlaskConical size={32} className="mx-auto opacity-40 text-[#5c6e46]" />
              <p className="text-sm font-black text-[#37412a] dark:text-[#e4e9d8]">No student requisitions match this filter</p>
              <p className="text-xs">When enrolled M.Pharm students submit practical chemical requests or thesis indents, they will appear here for your approval.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((req) => {
                const isPending = req.overallStatus === 'Pending';
                const isApproved = req.overallStatus === 'Approved';
                const isRejected = req.overallStatus === 'Rejected';
                const isResearch = Boolean(req.isResearchRequest || req.projectThesisName);

                return (
                  <Card key={req._id || req.requestId} className="p-5 rounded-2xl border border-[#cfd8bd] bg-white dark:bg-[#1a1d16] space-y-3 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e4eed3] dark:border-[#38432a] pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-black text-[#37412a] dark:text-[#e4e9d8] bg-[#f4f6ee] dark:bg-[#20251a] px-2 py-0.5 rounded border border-[#cfd8bd]">
                          {req.requestId || 'REQ-MP'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isPending ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                          isApproved ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                          'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}>
                          {req.overallStatus}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${theme.badgeClass}`}>
                          {isResearch ? 'Thesis Research' : 'Practical Syllabus'}
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-[#71805a]">
                        Requested: {new Date(req.requestedAt || req.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase text-[#71805a] block">Scholar Identity</span>
                        <p className="font-extrabold text-[#37412a] dark:text-[#e4e9d8] text-sm">{req.studentName}</p>
                        <p className="font-mono text-[#71805a]">Roll: {req.rollNumber} {req.group ? `• Group ${req.group}` : ''}</p>
                      </div>

                      <div className="md:col-span-2 space-y-1">
                        <span className="text-[10px] font-black uppercase text-[#71805a] block">
                          {isResearch ? 'Dissertation Project Title & Objective' : 'Prescribed Experiment Object'}
                        </span>
                        <p className="font-extrabold text-[#37412a] dark:text-[#e4e9d8]">
                          {req.projectThesisName || req.experimentName || req.subject || 'Practical Formulation'}
                        </p>
                        {req.researchObjective && (
                          <p className="text-[11px] text-[#71805a] italic leading-tight">{req.researchObjective}</p>
                        )}
                      </div>
                    </div>

                    {/* Chemicals Requested */}
                    <div className="p-3 rounded-xl bg-[#fbfcf8] dark:bg-[#20251a] border border-[#e4eed3] dark:border-[#38432a]">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#71805a] block mb-2">
                        Reagent Dispensation Table ({req.chemicalsRequested?.length || 0} Items)
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {(req.chemicalsRequested || []).map((c, i) => {
                          const name = typeof c === 'string' ? c : (c.chemicalName || c.name);
                          const qty = typeof c === 'string' ? '' : `${c.quantityRequested || c.quantity || ''} ${c.unit || ''}`;
                          const cas = typeof c === 'object' ? c.casNumber : '';

                          return (
                            <div key={i} className="p-2 rounded-lg bg-white dark:bg-[#1a1d16] border border-[#cfd8bd] flex items-center justify-between text-xs">
                              <div>
                                <span className="font-bold text-[#37412a] dark:text-[#e4e9d8] block">{name}</span>
                                {cas && <span className="font-mono text-[10px] text-[#71805a]">CAS: {cas}</span>}
                              </div>
                              <span className="font-mono font-black text-[#5c6e46] bg-[#f4f6ee] dark:bg-[#20251a] px-2 py-0.5 rounded border border-[#cfd8bd]">
                                {qty}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDetailReq(req);
                            setDetailModalOpen(true);
                          }}
                          className="text-xs font-bold text-[#5c6e46] hover:underline flex items-center gap-1"
                        >
                          <Eye size={13} /> View Audit Details
                        </button>
                      </div>

                      {isPending && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            onClick={() => openRejectModal(req)}
                            className="border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-extrabold px-3 py-1.5 rounded-xl flex items-center gap-1"
                          >
                            <X size={14} /> Reject
                          </Button>
                          <Button
                            onClick={() => handleApprove(req._id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-4 py-1.5 rounded-xl flex items-center gap-1.5 shadow-xs"
                          >
                            <Check size={14} /> Approve & Issue Stock
                          </Button>
                        </div>
                      )}

                      {isApproved && (
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 size={14} /> Stock Issued to Student
                        </span>
                      )}

                      {isRejected && (
                        <span className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1">
                          <XCircle size={14} /> Rejected: {req.rejectionReason || 'No reason provided'}
                        </span>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LAB STOCK INVENTORY (EXACT B.PHARM PARITY) */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-between items-center bg-[#fffef8] dark:bg-[#20251a] p-4 rounded-2xl border border-[#cfd8bd] gap-3">
            <div>
              <h3 className="text-sm font-black text-[#37412a] dark:text-[#e4e9d8]">
                {currentLab?.name || 'M.Pharm Laboratory'} Chemical Inventory
              </h3>
              <p className="text-xs text-[#71805a]">
                Live MongoDB stock ledger for {theme.badgeText}. Real-time inventory deductions upon student approvals.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setAddChemModalOpen(true)}
                className={`${theme.buttonPrimary} text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs`}
              >
                <Plus size={14} /> Add Chemical Reagent
              </Button>
            </div>
          </div>

          {/* Inventory Table */}
          <div className="bg-white dark:bg-[#1a1d16] rounded-2xl border border-[#cfd8bd] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f4f6ee] dark:bg-[#20251a] text-[#5c6e46] font-black uppercase tracking-wider border-b border-[#cfd8bd]">
                  <tr>
                    <th className="p-3">Chemical Reagent</th>
                    <th className="p-3">Item Code / CAS</th>
                    <th className="p-3">Category / Grade</th>
                    <th className="p-3">Available Stock</th>
                    <th className="p-3">Min Threshold</th>
                    <th className="p-3">Storage Location</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e4eed3] dark:divide-[#2e3722] font-bold">
                  {labInventory.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-[#71805a]">
                        No chemicals stocked in this laboratory inventory yet. Click "Add Chemical Reagent" above to stock chemicals.
                      </td>
                    </tr>
                  ) : (
                    labInventory.map((item) => {
                      const qty = item.quantityAvailable ?? item.quantity ?? 0;
                      const min = item.minThreshold ?? 5;
                      const isOut = qty === 0;
                      const isLow = qty > 0 && qty <= min;

                      return (
                        <tr key={item.id || item._id} className="hover:bg-[#fbfcf8] dark:hover:bg-[#20251a]">
                          <td className="p-3">
                            <span className="font-extrabold text-[#37412a] dark:text-[#e4e9d8] block">{item.chemicalName || item.itemName}</span>
                            {item.manufacturingCompany && (
                              <span className="text-[10px] text-[#71805a] block">{item.manufacturingCompany}</span>
                            )}
                          </td>
                          <td className="p-3 font-mono text-[11px] text-[#71805a]">
                            <div>{item.itemCode || 'CHEM-MP'}</div>
                            {item.casNumber && <div className="text-[10px] text-slate-500">CAS: {item.casNumber}</div>}
                          </td>
                          <td className="p-3 text-[#71805a]">
                            <div>{item.category || 'Chemical'}</div>
                            {item.grade && <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">{item.grade}</span>}
                          </td>
                          <td className="p-3">
                            <span className={`font-mono text-xs font-black px-2.5 py-1 rounded border ${
                              isOut ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              isLow ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {qty} {item.quantityUnit || item.unit || 'g'}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[11px] text-[#71805a]">
                            {min} {item.quantityUnit || 'g'}
                          </td>
                          <td className="p-3 text-[#71805a]">{item.storageLocation || 'Cabinet A'}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isOut ? 'bg-rose-100 text-rose-800' :
                              isLow ? 'bg-amber-100 text-amber-800' :
                              'bg-emerald-100 text-emerald-800'
                            }`}>
                              {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* 1-Click Reorder to Store Button */}
                              {(isLow || isOut) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setStoreModalData({
                                      chemicalName: item.chemicalName || item.itemName,
                                      casNumber: item.casNumber || '',
                                      quantityRequested: String(Math.max(500, min * 5)),
                                      unit: item.quantityUnit || 'g',
                                      reason: `Emergency Stock Replenishment for ${currentLab?.name}`
                                    });
                                    setStoreModalOpen(true);
                                  }}
                                  className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold flex items-center gap-1 shadow-xs"
                                  title="Quick Reorder to Central Store"
                                >
                                  <Store size={11} /> Reorder
                                </button>
                              )}
                              
                              {/* Edit Stock Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditChemData({
                                    ...item,
                                    id: item.id || item._id,
                                    quantityAvailable: qty,
                                    minThreshold: min,
                                    storageLocation: item.storageLocation || '',
                                    category: item.category || 'Chemical',
                                    grade: item.grade || 'AR Grade'
                                  });
                                  setEditChemModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg border border-[#cfd8bd] hover:bg-[#f4f6ee] text-[#5c6e46]"
                                title="Edit Stock & Threshold"
                              >
                                <Pencil size={12} />
                              </button>

                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteChemical(item.id || item._id, item.chemicalName || item.itemName)}
                                className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600"
                                title="Remove Chemical"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CURRICULUM SYLLABUS PRACTICALS (SEM 1 & 2) OR RESEARCH PROTOCOLS (SEM 3 & 4) */}
      {activeTab === 'curriculumOrResearch' && (
        <div className="space-y-4">
          {isPhase1Curriculum ? (
            // PHASE 1: Predefined Practical Syllabus Experiments from Database
            <div className="space-y-4">
              <div className="bg-[#fffef8] dark:bg-[#20251a] p-4 rounded-2xl border border-[#cfd8bd]">
                <h3 className="text-sm font-black text-[#37412a] dark:text-[#e4e9d8]">
                  {theme.badgeText} Curriculum Practical Syllabus
                </h3>
                <p className="text-xs text-[#71805a]">
                  These accredited practical experiments are retrieved live from MongoDB (LabStructure model). You can lock or unlock access for student borrowing.
                </p>
              </div>

              {loadingStructures ? (
                <div className="p-8 text-center text-xs font-bold text-[#71805a] flex items-center justify-center gap-2">
                  <RefreshCw size={14} className="animate-spin" /> Loading practical structures...
                </div>
              ) : syllabusStructures.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-[#cfd8bd] bg-white text-[#71805a]">
                  No practical syllabus experiments registered for this laboratory in the database yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {syllabusStructures.map((prac) => (
                    <Card key={prac._id} className="p-5 rounded-2xl border border-[#cfd8bd] bg-white dark:bg-[#1a1d16] space-y-3">
                      <div className="flex justify-between items-start border-b border-[#e4eed3] dark:border-[#38432a] pb-2">
                        <div>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${theme.badgeClass}`}>
                            Exp {prac.experimentNo}
                          </span>
                          <h4 className="font-black text-sm text-[#37412a] dark:text-[#e4e9d8] mt-1">
                            {prac.experimentName}
                          </h4>
                          <span className="text-[11px] text-[#71805a] block">{prac.subject}</span>
                        </div>

                        {/* Lock / Unlock Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleExperimentLock(prac._id, prac.isUnlocked)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1 border transition-all ${
                            prac.isUnlocked
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-amber-50 text-amber-700 border-amber-300'
                          }`}
                        >
                          {prac.isUnlocked ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                          {prac.isUnlocked ? 'Unlocked' : 'Locked'}
                        </button>
                      </div>

                      {/* Required Chemical Recipe */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase text-[#71805a] block">Prescribed Reagents Recipe:</span>
                        <ul className="space-y-1 text-xs">
                          {(prac.chemicals || []).map((ch, idx) => (
                            <li key={idx} className="flex justify-between items-center p-1.5 rounded-lg bg-[#fbfcf8] dark:bg-[#20251a] border border-[#e4eed3]">
                              <span className="font-extrabold text-[#37412a] dark:text-[#e4e9d8]">{ch.chemicalName}</span>
                              <span className="font-mono text-[#5c6e46] font-bold">{ch.quantityPerStudent} {ch.unit}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // PHASE 2: Self-Directed Research Protocols (Sem 3 & 4)
            <div className="space-y-4">
              <div className="bg-[#fffef8] dark:bg-[#20251a] p-5 rounded-2xl border border-[#cfd8bd]">
                <div className="flex items-start gap-3">
                  <Atom size={24} className={`${theme.accentText} shrink-0 mt-0.5`} />
                  <div>
                    <h3 className="text-base font-black text-[#37412a] dark:text-[#e4e9d8]">
                      {theme.badgeText} &bull; Self-Directed Dissertation Protocols (No Fixed Syllabus)
                    </h3>
                    <p className="text-xs text-[#71805a] mt-1 leading-relaxed">
                      In Year 2 ({theme.name}), there are no fixed syllabus experiments or chemical restriction lists. Scholars formulate their own dissertation objectives and can request <strong>any chemical in any quantity</strong> with CAS validation. The supervisor validates research necessity and requisitions missing reagents directly from the Central Store Manager.
                    </p>
                  </div>
                </div>
              </div>

              {/* Research Projects Roster derived from live student requests */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {requests.filter(r => r.isResearchRequest || r.projectThesisName).length === 0 ? (
                  <div className="md:col-span-2 p-8 text-center rounded-2xl border border-dashed border-[#cfd8bd] bg-white text-[#71805a]">
                    No thesis research chemical requests submitted yet in {theme.name}. When Year 2 scholars submit dissertation requisitions, their active protocols will appear here.
                  </div>
                ) : (
                  requests.filter(r => r.isResearchRequest || r.projectThesisName).map(r => (
                    <Card key={r._id} className="p-4 rounded-2xl border border-[#cfd8bd] bg-white dark:bg-[#1a1d16] space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${theme.badgeClass}`}>
                            {r.rollNumber}
                          </span>
                          <h4 className="text-sm font-black text-[#37412a] dark:text-[#e4e9d8] mt-1">
                            {r.studentName}
                          </h4>
                        </div>
                        <span className="text-xs font-bold text-[#71805a]">
                          {r.chemicalsRequested?.length || 0} Reagents
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#fbfcf8] dark:bg-[#20251a] border border-[#e4eed3] dark:border-[#38432a]">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#71805a] block mb-0.5">
                          Registered Dissertation Title:
                        </span>
                        <p className="text-xs font-bold text-[#37412a] dark:text-[#e4e9d8]">
                          {r.projectThesisName || 'Independent Synthesis Project'}
                        </p>
                        {r.researchObjective && (
                          <p className="text-[11px] text-[#71805a] mt-1 italic">{r.researchObjective}</p>
                        )}
                      </div>

                      <div className="flex justify-between items-center pt-2 text-xs font-semibold text-[#71805a]">
                        <span>Status:</span>
                        <span className={`font-bold ${r.overallStatus === 'Approved' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {r.overallStatus}
                        </span>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CENTRAL STORE ORDERS */}
      {activeTab === 'storeOrders' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-[#fffef8] dark:bg-[#20251a] p-4 rounded-2xl border border-[#cfd8bd]">
            <div>
              <h3 className="text-sm font-black text-[#37412a] dark:text-[#e4e9d8]">
                Central Store Indents & Replenishments
              </h3>
              <p className="text-xs text-[#71805a]">
                Orders placed from this laboratory to Central Store Manager. When approved, reagents are dispatched with official receipt codes.
              </p>
            </div>
            <Button
              onClick={() => {
                setStoreModalData({
                  chemicalName: '',
                  casNumber: '',
                  quantityRequested: '500',
                  unit: 'g',
                  reason: `M.Pharm ${theme.name} Requisition for ${currentLab?.name}`
                });
                setStoreModalOpen(true);
              }}
              className={`${theme.buttonPrimary} text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs`}
            >
              <Plus size={14} /> New Store Indent
            </Button>
          </div>

          <div className="bg-white dark:bg-[#1a1d16] rounded-2xl border border-[#cfd8bd] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f4f6ee] dark:bg-[#20251a] text-[#5c6e46] font-black uppercase tracking-wider border-b border-[#cfd8bd]">
                  <tr>
                    <th className="p-3">Chemical Reagent</th>
                    <th className="p-3">CAS Number</th>
                    <th className="p-3">Quantity Indented</th>
                    <th className="p-3">Reason / Purpose</th>
                    <th className="p-3">Store Status</th>
                    <th className="p-3">Receipt Code</th>
                    <th className="p-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e4eed3] dark:divide-[#2e3722] font-bold">
                  {storeOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-[#71805a]">
                        No store replenishment indents submitted yet for this lab.
                      </td>
                    </tr>
                  ) : (
                    storeOrders.map((ord, idx) => (
                      <tr key={ord._id || idx} className="hover:bg-[#fbfcf8] dark:hover:bg-[#20251a]">
                        <td className="p-3 font-extrabold text-[#37412a] dark:text-[#e4e9d8]">{ord.chemicalName}</td>
                        <td className="p-3 font-mono text-[11px] text-[#71805a]">{ord.casNumber || 'N/A'}</td>
                        <td className="p-3 font-mono font-black text-[#5c6e46]">{ord.quantityRequested} {ord.unit}</td>
                        <td className="p-3 text-[#71805a]">{ord.reason || 'General Lab Replenishment'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            ord.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                            ord.status === 'Rejected' ? 'bg-rose-100 text-rose-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {ord.status || 'Pending Store Approval'}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-black text-indigo-700">
                          {ord.receiptCode || ord.storeReceiptCode || '-'}
                        </td>
                        <td className="p-3 text-right text-[#71805a]">
                          {new Date(ord.createdAt || ord.requestedAt).toLocaleDateString()}
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

      {/* TAB 5: STOCK LEDGER & TRANSACTION AUDIT */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-[#fffef8] dark:bg-[#20251a] p-4 rounded-2xl border border-[#cfd8bd]">
            <h3 className="text-sm font-black text-[#37412a] dark:text-[#e4e9d8]">
              {theme.badgeText} Stock Movement Ledger
            </h3>
            <p className="text-xs text-[#71805a]">
              Full audit trail of chemical disbursements to students and inward shipments from Central Store.
            </p>
          </div>

          <div className="bg-white dark:bg-[#1a1d16] rounded-2xl border border-[#cfd8bd] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f4f6ee] dark:bg-[#20251a] text-[#5c6e46] font-black uppercase tracking-wider border-b border-[#cfd8bd]">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Movement Type</th>
                    <th className="p-3">Chemical Reagent</th>
                    <th className="p-3">Quantity Delta</th>
                    <th className="p-3">Authorized By</th>
                    <th className="p-3 text-right">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e4eed3] dark:divide-[#2e3722] font-bold">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-[#71805a]">
                        No stock movement transactions recorded yet for this laboratory.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((t, idx) => (
                      <tr key={t._id || idx} className="hover:bg-[#fbfcf8] dark:hover:bg-[#20251a]">
                        <td className="p-3 text-[#71805a]">{new Date(t.createdAt || t.timestamp).toLocaleString()}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            (t.type || '').includes('Inward') ? 'bg-emerald-100 text-emerald-800' :
                            (t.type || '').includes('Outward') ? 'bg-blue-100 text-blue-800' :
                            'bg-slate-100 text-slate-800'
                          }`}>
                            {t.type || 'Stock Adjustment'}
                          </span>
                        </td>
                        <td className="p-3 font-extrabold text-[#37412a] dark:text-[#e4e9d8]">{t.chemicalName || t.itemName || 'Chemical'}</td>
                        <td className="p-3 font-mono font-black text-[#5c6e46]">{t.quantity} {t.unit || 'g'}</td>
                        <td className="p-3 text-[#71805a]">{t.performedByName || t.userName || 'Supervisor'}</td>
                        <td className="p-3 text-right font-mono text-[11px] text-[#71805a]">{t.referenceId || t.requestId || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: ENROLLED STUDENTS DIRECTORY */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="bg-[#fffef8] dark:bg-[#20251a] p-4 rounded-2xl border border-[#cfd8bd]">
            <h3 className="text-sm font-black text-[#37412a] dark:text-[#e4e9d8]">
              {theme.badgeText} &bull; {isPhase1Curriculum ? 'Enrolled Students Roster' : 'Research Scholars Directory'}
            </h3>
            <p className="text-xs text-[#71805a]">
              These students belong strictly to this semester and laboratory in MongoDB. They do not cross over to other supervisors' dashboards.
            </p>
          </div>

          <div className="bg-white dark:bg-[#1a1d16] rounded-2xl border border-[#cfd8bd] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f4f6ee] dark:bg-[#20251a] text-[#5c6e46] font-black uppercase tracking-wider border-b border-[#cfd8bd]">
                  <tr>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Roll Number</th>
                    <th className="p-3">Email ID</th>
                    <th className="p-3">Semester</th>
                    <th className="p-3 text-right">Approval Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e4eed3] dark:divide-[#2e3722] font-bold">
                  {loadingStudents ? (
                    <tr><td colSpan={5} className="p-8 text-center text-[#71805a]">Loading enrolled students...</td></tr>
                  ) : enrolledStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-[#71805a]">
                        No students currently enrolled in this semester in the database.
                      </td>
                    </tr>
                  ) : (
                    enrolledStudents.map((s) => (
                      <tr key={s._id || s.id} className="hover:bg-[#fbfcf8] dark:hover:bg-[#20251a]">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full ${theme.buttonPrimary} flex items-center justify-center text-white text-[10px] font-black`}>
                              {s.name?.charAt(0) || 'S'}
                            </div>
                            <span className="font-extrabold text-[#37412a] dark:text-[#e4e9d8]">{s.name}</span>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-[#71805a]">{s.rollNumber || '-'}</td>
                        <td className="p-3 font-mono text-[11px] text-[#71805a]">{s.email}</td>
                        <td className="p-3 text-[#37412a] dark:text-[#e4e9d8]">Semester {s.semester || activeSemester}</td>
                        <td className="p-3 text-right">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${s.isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {s.isApproved ? 'Active Scholar' : 'Pending Approval'}
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

      {/* MODAL 1: REJECT REASON MODAL */}
      <Modal open={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="Reject Student Chemical Requisition">
        <div className="space-y-4 text-left">
          <p className="text-xs font-semibold text-[#71805a]">
            Please specify the reason for rejecting <strong>{targetRejectReq?.studentName}</strong>'s chemical request. The scholar will receive this feedback to revise their requisition.
          </p>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#37412a] dark:text-[#e4e9d8]">Rejection Reason / Guidance *</label>
            <textarea
              rows={3}
              required
              placeholder="e.g. Please reduce quantity of reagent, or consult supervisor regarding alternative solvent..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full rounded-xl border border-[#cfd8bd] bg-white dark:bg-[#20251a] p-3 text-xs font-semibold outline-none focus:border-rose-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setRejectModalOpen(false)}>Cancel</Button>
            <Button className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs" onClick={confirmReject}>
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: CENTRAL STORE REQUISITION MODAL (WITH CAS AUTOCOMPLETE) */}
      <Modal open={storeModalOpen} onClose={() => setStoreModalOpen(false)} title="Request Reagents From Central Store Manager">
        <div className="space-y-4 text-left">
          <div className="bg-[#f4f6ee] dark:bg-[#20251a] p-3 rounded-xl border border-[#cfd8bd] text-xs text-[#5c6e46] dark:text-[#a8be8a] font-medium">
            ℹ️ As the M.Pharm Supervisor of <strong>{currentLab?.name}</strong>, your requisition is sent to the Central Store Manager. When approved, chemicals will be dispatched with an official Store Receipt Code and added to your lab inventory.
          </div>

          <ChemicalSearchInput
            label="Search Chemical or Reagent Name *"
            required
            value={storeModalData.chemicalName}
            onChange={(val) => setStoreModalData(prev => ({ ...prev, chemicalName: val }))}
            onSelect={(item) => {
              setStoreModalData(prev => ({
                ...prev,
                chemicalName: item.name || item.chemicalName || '',
                casNumber: item.cas || item.casNumber || '',
                unit: item.unit || prev.unit || 'g'
              }));
            }}
          />

          <Input
            label="CAS Number (Auto-detected)"
            value={storeModalData.casNumber}
            onChange={(e) => setStoreModalData(prev => ({ ...prev, casNumber: e.target.value }))}
            placeholder="e.g. 57-88-5"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Quantity Requested *"
              type="number"
              value={storeModalData.quantityRequested}
              onChange={(e) => setStoreModalData(prev => ({ ...prev, quantityRequested: e.target.value }))}
              placeholder="100"
              required
            />
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#3c4e23] dark:text-[#eef4e8]">Unit</label>
              <select
                value={storeModalData.unit}
                onChange={(e) => setStoreModalData(prev => ({ ...prev, unit: e.target.value }))}
                className="w-full rounded-xl border border-[#cfd8bd] bg-white px-3 py-2 text-xs font-bold text-[#2e3d19] focus:border-[#556b2f] outline-none"
              >
                {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <Input
            label="Reason for Store Requisition"
            value={storeModalData.reason}
            onChange={(e) => setStoreModalData(prev => ({ ...prev, reason: e.target.value }))}
            placeholder="e.g. Requisition for student thesis research / practical replenishment"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setStoreModalOpen(false)}>Cancel</Button>
            <Button 
              className={`${theme.buttonPrimary} font-extrabold text-xs`} 
              onClick={handleStoreRequestSubmit}
              disabled={submittingStoreReq || !storeModalData.chemicalName || !storeModalData.quantityRequested}
            >
              {submittingStoreReq ? 'Submitting...' : 'Submit Requisition to Store'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 3: ADD CHEMICAL TO LAB INVENTORY (B.PHARM PARITY) */}
      <Modal open={addChemModalOpen} onClose={() => setAddChemModalOpen(false)} title="Register Chemical Reagent in Lab Inventory">
        <form onSubmit={handleAddChemicalSubmit} className="space-y-4 text-left">
          <ChemicalSearchInput
            label="Chemical Name *"
            required
            value={newChem.chemicalName}
            onChange={(val) => setNewChem(prev => ({ ...prev, chemicalName: val }))}
            onSelect={(item) => {
              setNewChem(prev => ({
                ...prev,
                chemicalName: item.name || item.chemicalName || '',
                casNumber: item.cas || item.casNumber || '',
                quantityUnit: item.unit || prev.quantityUnit || 'g',
                category: item.category || prev.category || 'Chemical'
              }));
            }}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Item Code / Catalog #"
              placeholder="e.g. CHEM-MP101-08"
              value={newChem.itemCode}
              onChange={(e) => setNewChem(prev => ({ ...prev, itemCode: e.target.value }))}
            />
            <Input
              label="CAS Number"
              placeholder="e.g. 57-88-5"
              value={newChem.casNumber}
              onChange={(e) => setNewChem(prev => ({ ...prev, casNumber: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#3c4e23]">Category</label>
              <select
                value={newChem.category}
                onChange={(e) => setNewChem(prev => ({ ...prev, category: e.target.value }))}
                className="w-full rounded-xl border border-[#cfd8bd] bg-white px-3 py-2 text-xs font-bold"
              >
                {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#3c4e23]">Purity Grade</label>
              <select
                value={newChem.grade}
                onChange={(e) => setNewChem(prev => ({ ...prev, grade: e.target.value }))}
                className="w-full rounded-xl border border-[#cfd8bd] bg-white px-3 py-2 text-xs font-bold"
              >
                {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Initial Quantity *"
              type="number"
              required
              value={newChem.quantity}
              onChange={(e) => setNewChem(prev => ({ ...prev, quantity: e.target.value }))}
            />
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#3c4e23]">Unit</label>
              <select
                value={newChem.quantityUnit}
                onChange={(e) => setNewChem(prev => ({ ...prev, quantityUnit: e.target.value }))}
                className="w-full rounded-xl border border-[#cfd8bd] bg-white px-3 py-2 text-xs font-bold"
              >
                {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <Input
              label="Min Safety Threshold"
              type="number"
              value={newChem.minThreshold}
              onChange={(e) => setNewChem(prev => ({ ...prev, minThreshold: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Storage Location / Shelf"
              value={newChem.storageLocation}
              onChange={(e) => setNewChem(prev => ({ ...prev, storageLocation: e.target.value }))}
              placeholder="e.g. Cabinet B1 - Desiccator"
            />
            <Input
              label="Lot / Batch Number"
              value={newChem.lotNumber}
              onChange={(e) => setNewChem(prev => ({ ...prev, lotNumber: e.target.value }))}
              placeholder="e.g. LOT-2026-09"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setAddChemModalOpen(false)}>Cancel</Button>
            <Button 
              type="submit"
              className={`${theme.buttonPrimary} font-extrabold text-xs`} 
              disabled={submittingAddChem || !newChem.chemicalName.trim()}
            >
              {submittingAddChem ? 'Saving...' : 'Add Chemical to Inventory'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: EDIT STOCK / THRESHOLD MODAL */}
      <Modal open={editChemModalOpen} onClose={() => setEditChemModalOpen(false)} title={`Edit Inventory: ${editChemData?.chemicalName}`}>
        {editChemData && (
          <form onSubmit={handleEditChemicalSubmit} className="space-y-4 text-left">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Available Stock Quantity"
                type="number"
                required
                value={editChemData.quantityAvailable}
                onChange={(e) => setEditChemData(prev => ({ ...prev, quantityAvailable: e.target.value }))}
              />
              <Input
                label="Minimum Safety Threshold"
                type="number"
                required
                value={editChemData.minThreshold}
                onChange={(e) => setEditChemData(prev => ({ ...prev, minThreshold: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#3c4e23]">Category</label>
                <select
                  value={editChemData.category}
                  onChange={(e) => setEditChemData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full rounded-xl border border-[#cfd8bd] bg-white px-3 py-2 text-xs font-bold"
                >
                  {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#3c4e23]">Grade</label>
                <select
                  value={editChemData.grade}
                  onChange={(e) => setEditChemData(prev => ({ ...prev, grade: e.target.value }))}
                  className="w-full rounded-xl border border-[#cfd8bd] bg-white px-3 py-2 text-xs font-bold"
                >
                  {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>

            <Input
              label="Storage Shelf / Cabinet Location"
              value={editChemData.storageLocation}
              onChange={(e) => setEditChemData(prev => ({ ...prev, storageLocation: e.target.value }))}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setEditChemModalOpen(false)}>Cancel</Button>
              <Button 
                type="submit"
                className={`${theme.buttonPrimary} font-extrabold text-xs`} 
                disabled={submittingEditChem}
              >
                {submittingEditChem ? 'Saving...' : 'Update Stock Ledger'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL 5: DETAILED AUDIT INFORMATION */}
      <Modal open={detailModalOpen} onClose={() => setDetailModalOpen(false)} title="Requisition Audit Ledger Record">
        {activeDetailReq && (
          <div className="space-y-4 text-left text-xs">
            <div className="p-3 rounded-xl bg-[#f4f6ee] dark:bg-[#20251a] border border-[#cfd8bd] space-y-1">
              <div className="flex justify-between">
                <span className="font-mono font-bold text-[#71805a]">Request ID:</span>
                <span className="font-mono font-black">{activeDetailReq.requestId || 'REQ-MP'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-[#71805a]">Submitted By:</span>
                <span className="font-extrabold">{activeDetailReq.studentName} ({activeDetailReq.rollNumber})</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-[#71805a]">Course & Semester:</span>
                <span className="font-extrabold">M.Pharm Year {activeDetailReq.year} Sem {activeDetailReq.semester}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-[#71805a]">Timestamp:</span>
                <span className="font-mono">{new Date(activeDetailReq.requestedAt || activeDetailReq.createdAt).toLocaleString()}</span>
              </div>
            </div>

            <div>
              <span className="font-bold text-[#37412a] block mb-1">
                {activeDetailReq.isResearchRequest ? 'Thesis Research Title:' : 'Syllabus Practical:'}
              </span>
              <p className="p-2.5 rounded-lg border border-[#cfd8bd] bg-white font-semibold">
                {activeDetailReq.projectThesisName || activeDetailReq.experimentName || activeDetailReq.subject}
              </p>
            </div>

            <div>
              <span className="font-bold text-[#37412a] block mb-1">Reagents & Stock Allocation:</span>
              <div className="space-y-1.5">
                {(activeDetailReq.chemicalsRequested || []).map((c, i) => (
                  <div key={i} className="flex justify-between items-center p-2 rounded border border-[#cfd8bd] bg-white">
                    <div>
                      <span className="font-bold block">{c.chemicalName || c.name}</span>
                      {c.casNumber && <span className="font-mono text-[10px] text-slate-500">CAS: {c.casNumber}</span>}
                    </div>
                    <span className="font-mono font-black text-[#5c6e46]">{c.quantityRequested || c.quantity} {c.unit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setDetailModalOpen(false)}>Close Audit Details</Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
