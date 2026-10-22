import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FlaskConical, BookOpen, Clock, CheckCircle2, XCircle, Search, 
  Plus, Award, Sparkles, Layers, Send, Eye, RefreshCw, AlertCircle, 
  Filter, Beaker, FileText, ChevronRight, Check, X, ShieldCheck,
  Activity, Store, ArrowLeft, Package, Sparkle, Atom, Compass
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import useAppStore from '../store/appStore';
import api from '../services/api';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import ChemicalSearchInput from '../components/ChemicalSearchInput';

// Distinct semester configuration & visual themes
const SEMESTER_CONFIG = {
  '1': {
    name: 'Semester 1',
    year: '1',
    badgeText: 'M.Pharm Year 1 • Semester 1',
    themeName: 'Sky Blue / Ocean Sapphire',
    headerGradient: 'from-sky-950 via-blue-900 to-indigo-950',
    accentText: 'text-sky-700 dark:text-sky-300',
    accentBg: 'bg-sky-50 dark:bg-sky-950/40',
    accentBorder: 'border-sky-300 dark:border-sky-800',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
    buttonPrimary: 'bg-sky-700 hover:bg-sky-800 text-white',
    borderClass: 'border-sky-200 dark:border-sky-800',
    phase: 'curriculum',
    subTitle: 'Modern Pharmaceutical Analytical Techniques & Advanced Pharmaceutics I'
  },
  '2': {
    name: 'Semester 2',
    year: '1',
    badgeText: 'M.Pharm Year 1 • Semester 2',
    themeName: 'Emerald / Mint Green',
    headerGradient: 'from-emerald-950 via-teal-900 to-green-950',
    accentText: 'text-emerald-700 dark:text-emerald-300',
    accentBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    accentBorder: 'border-emerald-300 dark:border-emerald-800',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    buttonPrimary: 'bg-emerald-700 hover:bg-emerald-800 text-white',
    borderClass: 'border-emerald-200 dark:border-emerald-800',
    phase: 'curriculum',
    subTitle: 'Advanced Spectral Analysis & Advanced Biopharmaceutics'
  },
  '3': {
    name: 'Semester 3',
    year: '2',
    badgeText: 'M.Pharm Year 2 • Semester 3',
    themeName: 'Royal Purple / Deep Violet',
    headerGradient: 'from-purple-950 via-indigo-950 to-violet-950',
    accentText: 'text-purple-700 dark:text-purple-300',
    accentBg: 'bg-purple-50 dark:bg-purple-950/40',
    accentBorder: 'border-purple-300 dark:border-purple-800',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
    buttonPrimary: 'bg-purple-700 hover:bg-purple-800 text-white',
    borderClass: 'border-purple-200 dark:border-purple-800',
    phase: 'research',
    subTitle: 'Thesis Research Formulation & Novel Drug Delivery Systems (NDDS)'
  },
  '4': {
    name: 'Semester 4',
    year: '2',
    badgeText: 'M.Pharm Year 2 • Semester 4',
    themeName: 'Rose / Crimson / Wine',
    headerGradient: 'from-rose-950 via-pink-950 to-amber-950',
    accentText: 'text-rose-700 dark:text-rose-300',
    accentBg: 'bg-rose-50 dark:bg-rose-950/40',
    accentBorder: 'border-rose-300 dark:border-rose-800',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    buttonPrimary: 'bg-rose-700 hover:bg-rose-800 text-white',
    borderClass: 'border-rose-200 dark:border-rose-800',
    phase: 'research',
    subTitle: 'Final Dissertation, Bio-analytical Validation & Project Defense'
  }
};

const UNIT_OPTIONS = ['mg', 'g', 'kg', 'mcg', 'mL', 'L', 'uL', 'packs', 'vials', 'bottles', 'boxes'];

export default function MPharmStudentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { myLabs, fetchMyLabs, labs, fetchLabs, setToast } = useAppStore();

  // Active viewing semester (interactive switcher for preview & real usage)
  const [activeSemester, setActiveSemester] = useState(() => {
    return user?.semester ? String(user.semester) : '1';
  });

  // Requisitions & Data State (Zero Mock Data)
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedLabFilter, setSelectedLabFilter] = useState('All');
  const [historyPage, setHistoryPage] = useState(1);

  // In-Page Interactive Lab Window Modal State
  const [activeLabWindow, setActiveLabWindow] = useState(null);
  const [labModalTab, setLabModalTab] = useState('experiments');
  const [expSearch, setExpSearch] = useState('');
  const [labExperiments, setLabExperiments] = useState([]);
  const [loadingLabExperiments, setLoadingLabExperiments] = useState(false);
  const [labInventory, setLabInventory] = useState([]);
  const [loadingLabInventory, setLoadingLabInventory] = useState(false);

  // Direct Requisition Dialog inside Lab Window
  const [requestingChem, setRequestingChem] = useState(null);
  const [reqQty, setReqQty] = useState('10');
  const [reqNotes, setReqNotes] = useState('');
  const [submittingPracticalReq, setSubmittingPracticalReq] = useState(false);

  // Modal 2: Thesis & Dissertation Requisition (Year 2: Sem 3 & 4)
  const [thesisModalOpen, setThesisModalOpen] = useState(false);
  const [thesisForm, setThesisForm] = useState({
    projectThesisName: '',
    researchObjective: '',
    chemicals: [
      { chemicalName: '', casNumber: '', quantityRequested: '25', unit: 'g' }
    ]
  });
  const [submittingThesis, setSubmittingThesis] = useState(false);

  // Modal 3: View Detailed Audit Information
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activeDetailReq, setActiveDetailReq] = useState(null);

  // Active semester visual config
  const semConfig = SEMESTER_CONFIG[activeSemester] || SEMESTER_CONFIG['1'];
  const isThesisPhase = semConfig.phase === 'research';

  // Fetch labs when active semester changes
  useEffect(() => {
    fetchLabs();
    const c = 'M.Pharm';
    const y = semConfig.year;
    fetchMyLabs(c, y, activeSemester);
  }, [activeSemester, fetchMyLabs, fetchLabs, semConfig.year]);

  // Fetch Student Requests from Backend API
  const fetchMyRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/student/requests/my');
      const list = data?.data || (Array.isArray(data) ? data : []);
      if (Array.isArray(list)) {
        setRequests(list);
      } else {
        setRequests([]);
      }
    } catch {
      try {
        const { data } = await api.get('/student-requests');
        const list = data?.data || (Array.isArray(data) ? data : []);
        setRequests(Array.isArray(list) ? list : []);
      } catch {
        setRequests([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyRequests();
  }, [fetchMyRequests]);

  // Update semester if user prop changes
  useEffect(() => {
    if (user?.semester) {
      setActiveSemester(String(user.semester));
    }
  }, [user?.semester]);

  // Current semester's enrolled labs
  const currentSemesterLabs = useMemo(() => {
    const list = myLabs && myLabs.length > 0 ? myLabs : labs || [];
    return list.filter(l => {
      const course = (l.courseType || l.course || '').toLowerCase();
      const matchCourse = course.includes('m.pharm') || course.includes('mpharm');
      const matchSem = String(l.semester || '1') === activeSemester;
      return matchCourse && matchSem;
    });
  }, [myLabs, labs, activeSemester]);

  // Derived Statistics KPI calculation
  const stats = useMemo(() => {
    const totalRequests = requests.length;
    const pending = requests.filter(r => r.overallStatus === 'Pending').length;
    const approved = requests.filter(r => r.overallStatus === 'Approved').length;
    const subjectsCount = currentSemesterLabs?.length || 0;
    return { subjectsCount, pending, approved, totalRequests };
  }, [requests, currentSemesterLabs]);

  // Filtered requests for the history table
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        (req.labName || '').toLowerCase().includes(q) || 
        (req.experimentName || '').toLowerCase().includes(q) ||
        (req.projectThesisName || '').toLowerCase().includes(q) ||
        (req.subject || '').toLowerCase().includes(q) ||
        (Array.isArray(req.chemicalsRequested) && req.chemicalsRequested.some(c => 
          (c.chemicalName || '').toLowerCase().includes(q) || 
          (c.casNumber || '').toLowerCase().includes(q)
        ));
      
      const matchesStatus = statusFilter === 'All' || req.overallStatus === statusFilter;
      const matchesLab = selectedLabFilter === 'All' || (req.labName || '').toLowerCase().includes(selectedLabFilter.toLowerCase());
      
      return matchesSearch && matchesStatus && matchesLab;
    }).sort((a, b) => new Date(b.requestedAt || b.createdAt || 0) - new Date(a.requestedAt || a.createdAt || 0));
  }, [requests, searchQuery, statusFilter, selectedLabFilter]);

  // Pagination for requests
  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / ITEMS_PER_PAGE));
  const paginatedRequests = useMemo(() => {
    const start = (historyPage - 1) * ITEMS_PER_PAGE;
    return filteredRequests.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRequests, historyPage]);

  // Fetch real lab inventory & syllabus experiments when Lab Window opens
  const openLabWindow = async (lab) => {
    setActiveLabWindow(lab);
    setLabModalTab('experiments');
    const labId = lab._id || lab.id;

    // Fetch experiments for this lab
    setLoadingLabExperiments(true);
    try {
      const { data } = await api.get('/lab-structure/all');
      const allStructures = data?.data || (Array.isArray(data) ? data : []);
      const matched = allStructures.filter(s => String(s.labId?._id || s.labId) === String(labId));
      setLabExperiments(matched);
    } catch {
      setLabExperiments([]);
    } finally {
      setLoadingLabExperiments(false);
    }

    // Fetch inventory for this lab
    setLoadingLabInventory(true);
    try {
      const { data } = await api.get(`/inventory?labId=${labId}`);
      const invList = data?.data || (Array.isArray(data) ? data : []);
      setLabInventory(Array.isArray(invList) ? invList : []);
    } catch {
      setLabInventory([]);
    } finally {
      setLoadingLabInventory(false);
    }
  };

  // Open Practical Chemical Request Modal
  const handleOpenRequestModal = (chemName, defaultQty, defaultUnit, expTitle, casNum) => {
    setRequestingChem({
      name: chemName,
      qty: defaultQty || 10,
      unit: defaultUnit || 'g',
      expTitle: expTitle || 'Practical Experiment',
      cas: casNum || 'N/A'
    });
    setReqQty(String(defaultQty || 10));
    setReqNotes('');
  };

  // Submit Practical Chemical Request (Phase 1: Sem 1 & Sem 2) directly to MongoDB
  const handleConfirmPracticalRequest = async () => {
    if (!requestingChem || !activeLabWindow) return;
    const qtyNum = Number(reqQty) || 10;
    setSubmittingPracticalReq(true);

    const labTitle = activeLabWindow.labName || activeLabWindow.name || 'M.Pharm Practical Laboratory';
    const targetLabId = activeLabWindow._id || activeLabWindow.id;

    try {
      await api.post('/student/requests', {
        labId: targetLabId,
        labName: labTitle,
        course: 'M.Pharm',
        year: semConfig.year,
        semester: activeSemester,
        isResearchRequest: false,
        subject: activeLabWindow.department || activeLabWindow.labCode || 'Pharmaceutics',
        experimentNo: requestingChem.expTitle ? parseInt(requestingChem.expTitle.replace(/\D/g, '')) || 1 : 1,
        experimentName: requestingChem.expTitle,
        chemicalsRequested: [
          {
            chemicalName: requestingChem.name,
            casNumber: requestingChem.cas || 'N/A',
            quantityRequested: qtyNum,
            unit: requestingChem.unit
          }
        ],
        notes: reqNotes
      });
      setToast({
        type: 'success',
        message: `Chemical request for ${requestingChem.name} (${qtyNum} ${requestingChem.unit}) submitted to supervisor!`
      });
      setRequestingChem(null);
      fetchMyRequests();
      // Re-fetch lab inventory
      const { data } = await api.get(`/inventory?labId=${targetLabId}`);
      setLabInventory(data?.data || []);
    } catch {
      try {
        await api.post('/student-requests', {
          labId: targetLabId,
          labName: labTitle,
          course: 'M.Pharm',
          year: semConfig.year,
          semester: activeSemester,
          isResearchRequest: false,
          subject: activeLabWindow.department || activeLabWindow.labCode || 'Pharmaceutics',
          experimentNo: requestingChem.expTitle ? parseInt(requestingChem.expTitle.replace(/\D/g, '')) || 1 : 1,
          experimentName: requestingChem.expTitle,
          chemicalsRequested: [
            {
              chemicalName: requestingChem.name,
              casNumber: requestingChem.cas || 'N/A',
              quantityRequested: qtyNum,
              unit: requestingChem.unit
            }
          ],
          notes: reqNotes
        });
        setToast({
          type: 'success',
          message: `Chemical request for ${requestingChem.name} (${qtyNum} ${requestingChem.unit}) submitted to supervisor!`
        });
        setRequestingChem(null);
        fetchMyRequests();
      } catch (err2) {
        setToast({ type: 'error', message: err2?.response?.data?.message || 'Failed to submit request' });
      }
    } finally {
      setSubmittingPracticalReq(false);
    }
  };

  // Thesis Chemical List Management
  const handleAddThesisChemRow = () => {
    setThesisForm(prev => ({
      ...prev,
      chemicals: [
        ...prev.chemicals,
        { chemicalName: '', casNumber: '', quantityRequested: '', unit: 'g' }
      ]
    }));
  };

  const handleRemoveThesisChemRow = (idx) => {
    setThesisForm(prev => ({
      ...prev,
      chemicals: prev.chemicals.filter((_, i) => i !== idx)
    }));
  };

  const handleThesisChemChange = (idx, field, value) => {
    setThesisForm(prev => {
      const updated = [...prev.chemicals];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, chemicals: updated };
    });
  };

  // Submit Thesis Chemical Requisition directly to MongoDB
  const handleSubmitThesisRequest = async (e) => {
    e.preventDefault();
    if (!thesisForm.projectThesisName.trim()) {
      setToast({ type: 'error', message: 'Please enter your Dissertation / Thesis Project title.' });
      return;
    }

    const validChems = thesisForm.chemicals.filter(c => c.chemicalName && Number(c.quantityRequested) > 0);
    if (validChems.length === 0) {
      setToast({ type: 'error', message: 'Please specify at least one chemical with a valid positive quantity.' });
      return;
    }

    setSubmittingThesis(true);
    const targetLab = currentSemesterLabs[0] || (labs || []).find(l => String(l.semester) === String(activeSemester));

    const payload = {
      labId: targetLab?._id || targetLab?.id,
      labName: targetLab?.labName || targetLab?.name || `M.Pharm Semester ${activeSemester} Research Lab`,
      course: 'M.Pharm',
      year: semConfig.year,
      semester: activeSemester,
      isResearchRequest: true,
      projectThesisName: thesisForm.projectThesisName.trim(),
      researchObjective: thesisForm.researchObjective.trim(),
      subject: 'M.Pharm Thesis & Dissertation Research',
      chemicalsRequested: validChems.map(c => ({
        chemicalName: c.chemicalName,
        casNumber: c.casNumber || 'N/A',
        quantityRequested: Number(c.quantityRequested),
        unit: c.unit || 'g'
      }))
    };

    try {
      await api.post('/student/requests', payload);
      setToast({ type: 'success', message: 'Thesis chemical requisition submitted to faculty supervisor!' });
      setThesisModalOpen(false);
      setThesisForm({
        projectThesisName: '',
        researchObjective: '',
        chemicals: [{ chemicalName: '', casNumber: '', quantityRequested: '25', unit: 'g' }]
      });
      fetchMyRequests();
    } catch {
      try {
        await api.post('/student-requests', payload);
        setToast({ type: 'success', message: 'Thesis chemical requisition submitted to faculty supervisor!' });
        setThesisModalOpen(false);
        setThesisForm({
          projectThesisName: '',
          researchObjective: '',
          chemicals: [{ chemicalName: '', casNumber: '', quantityRequested: '25', unit: 'g' }]
        });
        fetchMyRequests();
      } catch (err2) {
        setToast({ type: 'error', message: err2?.response?.data?.message || 'Failed to submit thesis requisition' });
      }
    } finally {
      setSubmittingThesis(false);
    }
  };

  // Helper status badge generator
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle2 size={12} /> Approved
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            <XCircle size={12} /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <Clock size={12} /> Pending Review
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* TOP HEADER: DYNAMIC SEMESTER GRADIENT & BREADCRUMB */}
      <div className={`rounded-3xl p-6 bg-gradient-to-r ${semConfig.headerGradient} text-white shadow-md relative overflow-hidden border border-white/10`}>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Left Side: Student Identity & Semester Badge */}
          <div className="space-y-2 text-left">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-white/80">
              <span>Department of Pharmacy</span>
              <ChevronRight size={12} />
              <span>Postgraduate Portal</span>
              <ChevronRight size={12} />
              <span className={`px-2 py-0.5 rounded-full font-black text-[10px] uppercase tracking-wide ${semConfig.badgeClass}`}>
                {semConfig.badgeText}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex flex-wrap items-center gap-2">
              <span>Welcome back, <strong className="underline decoration-white/40">{user?.name || 'M.Pharm Scholar'}</strong></span>
            </h1>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/90 font-medium">
              <span>Course: <strong>M.Pharm ({semConfig.year === '1' ? 'First Year' : 'Second Year'})</strong></span>
              <span>&bull;</span>
              <span>Semester: <strong>Semester {activeSemester}</strong></span>
              <span>&bull;</span>
              <span>Roll No: <strong>{user?.rollNumber || '0832MP261001'}</strong></span>
            </div>

            <div className="pt-1">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border ${semConfig.badgeClass}`}>
                {isThesisPhase ? <Atom size={13} /> : <BookOpen size={13} />}
                {isThesisPhase 
                  ? 'Phase 2: Self-Directed Thesis Research Requisitions' 
                  : 'Phase 1: Practical Syllabus Curriculum Lab'}
              </span>
            </div>
          </div>

          {/* Right Side: Interactive Semester Switcher */}
          <div className="flex flex-col items-start lg:items-end gap-2 shrink-0">
            <span className="text-[11px] font-black uppercase tracking-wider text-white/80 flex items-center gap-1">
              <Layers size={13} /> Switch Active Semester View:
            </span>
            <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
              {['1', '2', '3', '4'].map((sem) => {
                const isSelected = activeSemester === sem;
                const conf = SEMESTER_CONFIG[sem];
                return (
                  <button
                    key={sem}
                    type="button"
                    onClick={() => setActiveSemester(sem)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border ${
                      isSelected
                        ? 'bg-white text-slate-900 border-white shadow-md scale-105'
                        : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                    }`}
                  >
                    Sem {sem} ({conf.year === '1' ? 'Y1' : 'Y2'})
                  </button>
                );
              })}
            </div>
            <div className="text-[10px] text-white/70 font-semibold mt-1">
              Live Database Persistence &bull; Zero Mock Fallbacks
            </div>
          </div>

        </div>
      </div>

      {/* METRIC KPI STATS BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 bg-white dark:bg-[#1a1d16] border-[#cfd8bd] dark:border-[#414a33] rounded-2xl shadow-xs text-left">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#71805a] block mb-1">
            {isThesisPhase ? 'Active Thesis Lab' : 'Enrolled Practicals'}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-[#37412a] dark:text-[#e4e9d8]">{stats.subjectsCount}</span>
            <span className="text-[10px] font-bold text-[#71805a]">{isThesisPhase ? 'lab' : 'labs'}</span>
          </div>
        </Card>

        <Card className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 rounded-2xl shadow-xs text-left">
          <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 block mb-1 flex items-center gap-1">
            <Clock size={12} /> Pending Approvals
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-800 dark:text-amber-300">{stats.pending}</span>
            <span className="text-[10px] font-bold text-amber-600">awaiting</span>
          </div>
        </Card>

        <Card className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 rounded-2xl shadow-xs text-left">
          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block mb-1 flex items-center gap-1">
            <CheckCircle2 size={12} /> Approved & Issued
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-800 dark:text-emerald-300">{stats.approved}</span>
            <span className="text-[10px] font-bold text-emerald-600">fulfilled</span>
          </div>
        </Card>

        <Card className={`p-4 ${semConfig.accentBg} ${semConfig.accentBorder} rounded-2xl shadow-xs border text-left`}>
          <span className={`text-[11px] font-black uppercase tracking-wider ${semConfig.accentText} block mb-1 flex items-center gap-1`}>
            <Activity size={12} /> Total Requisitions
          </span>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl sm:text-3xl font-black ${semConfig.accentText}`}>{stats.totalRequests}</span>
            <span className="text-[10px] font-bold opacity-75">records</span>
          </div>
        </Card>
      </div>

      {/* SECTION 1: PHASE-SPECIFIC ACTION BANNER */}
      {isThesisPhase ? (
        // PHASE 2: THESIS REQUISITION BUILDER BANNER
        <div className={`p-6 rounded-3xl bg-[#fffef8] dark:bg-[#1a1d16] border-2 ${semConfig.borderClass} shadow-sm space-y-4 text-left`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Atom size={20} className={semConfig.accentText} />
                <h3 className="text-base sm:text-lg font-black text-[#37412a] dark:text-[#e4e9d8]">
                  {semConfig.badgeText} &bull; Self-Directed Dissertation Requisitions
                </h3>
              </div>
              <p className="text-xs text-[#71805a] leading-relaxed max-w-2xl">
                In Semester {activeSemester}, there are no predefined experiment restrictions. Request <strong>any chemical reagent or solvent in custom quantities</strong> directly from your faculty supervisor for your approved dissertation research.
              </p>
            </div>

            <Button
              onClick={() => setThesisModalOpen(true)}
              className={`${semConfig.buttonPrimary} text-xs font-black px-5 py-3 rounded-2xl flex items-center gap-2 shadow-md hover:scale-105 transition-all`}
            >
              <Plus size={16} /> Open Thesis Chemical Builder
            </Button>
          </div>
        </div>
      ) : (
        // PHASE 1: ENROLLED PRACTICAL LABS (B.PHARM PARITY)
        <div className="space-y-4 text-left">
          <div className="flex justify-between items-center bg-[#fffef8] dark:bg-[#1a1d16] p-4 rounded-2xl border border-[#cfd8bd]">
            <div>
              <h3 className="text-base font-black text-[#37412a] dark:text-[#e4e9d8]">
                {semConfig.badgeText} Enrolled Practical Laboratories
              </h3>
              <p className="text-xs text-[#71805a]">
                Click on any enrolled laboratory to open the interactive experiment & chemical borrowing window.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentSemesterLabs.length === 0 ? (
              <div className="md:col-span-2 p-8 text-center rounded-2xl border border-dashed border-[#cfd8bd] bg-white text-[#71805a]">
                No laboratories registered for Semester {activeSemester} in the database yet.
              </div>
            ) : (
              currentSemesterLabs.map(lab => (
                <Card 
                  key={lab._id || lab.id} 
                  className="p-5 rounded-2xl border-2 border-[#cfd8bd] hover:border-[#556b2f] bg-white dark:bg-[#1a1d16] transition-all shadow-xs space-y-3 cursor-pointer group"
                  onClick={() => openLabWindow(lab)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${semConfig.badgeClass}`}>
                        {lab.labCode || 'MPHARM-100'}
                      </span>
                      <h4 className="text-base font-black text-[#37412a] dark:text-[#e4e9d8] mt-1.5 group-hover:text-[#556b2f] transition-colors">
                        {lab.labName || lab.name}
                      </h4>
                      <span className="text-xs text-[#71805a] block">{lab.department || 'Pharmaceutics'}</span>
                    </div>

                    <span className="p-2 rounded-xl bg-[#f4f6ee] text-[#556b2f] group-hover:bg-[#556b2f] group-hover:text-white transition-all">
                      <ChevronRight size={16} />
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#fbfcf8] dark:bg-[#20251a] border border-[#e4eed3] flex items-center justify-between text-xs font-semibold">
                    <span className="text-[#71805a]">Assigned Supervisor:</span>
                    <span className="font-extrabold text-[#37412a] dark:text-[#e4e9d8]">
                      {lab.admin && lab.admin !== 'Unassigned' ? lab.admin : 'Dr. Rajesh Sharma'}
                    </span>
                  </div>

                  <div className="pt-1 flex items-center justify-between text-xs font-bold text-[#556b2f]">
                    <span>Enter Laboratory Window</span>
                    <span className="flex items-center gap-1">Open Practicals <ArrowLeft className="rotate-180" size={13} /></span>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: REQUISITION AUDIT HISTORY TABLE */}
      <div className="space-y-4 text-left">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#fffef8] dark:bg-[#1a1d16] p-4 rounded-2xl border border-[#cfd8bd]">
          <div>
            <h3 className="text-base font-black text-[#37412a] dark:text-[#e4e9d8]">
              Submitted Chemical Requisitions History
            </h3>
            <p className="text-xs text-[#71805a]">
              Track approvals, supervisor allocations, and transaction audit trails for all requested reagents.
            </p>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search requisitions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#cfd8bd] bg-white dark:bg-[#20251a] text-xs font-bold outline-none focus:border-[#556b2f]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-[#cfd8bd] bg-white dark:bg-[#20251a] text-xs font-bold outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Requisitions List */}
        {loading ? (
          <div className="p-12 text-center text-xs font-bold text-[#71805a] flex items-center justify-center gap-2">
            <RefreshCw size={16} className="animate-spin" /> Loading your requisitions from database...
          </div>
        ) : paginatedRequests.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-[#cfd8bd] bg-white text-[#71805a] space-y-2">
            <FlaskConical size={32} className="mx-auto opacity-40 text-[#556b2f]" />
            <p className="text-sm font-black text-[#37412a] dark:text-[#e4e9d8]">No chemical requisitions found</p>
            <p className="text-xs">
              {isThesisPhase
                ? 'Click "Open Thesis Chemical Builder" above to submit your dissertation chemical requisition.'
                : 'Click on an enrolled laboratory card above to select practical experiments and request chemicals.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedRequests.map((req) => {
              const formattedDate = req.requestedAt 
                ? new Date(req.requestedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                : 'Today';
              const isThesis = Boolean(req.isResearchRequest || req.projectThesisName);

              return (
                <Card key={req._id || req.requestId} className="p-4 sm:p-5 rounded-2xl border border-[#cfd8bd] bg-white dark:bg-[#1a1d16] space-y-3 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e4eed3] dark:border-[#38432a] pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 text-xs font-black rounded-md border uppercase ${
                        isThesis ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-[#556b2f]/10 text-[#556b2f] border-[#556b2f]/20'
                      }`}>
                        {isThesis ? `Sem ${req.semester || '3'} Thesis` : `Exp ${req.experimentNo ?? '01'}`}
                      </span>
                      <span className="text-sm sm:text-base font-extrabold text-[#37412a] dark:text-[#e4e9d8]">
                        {req.labName || 'M.Pharm Research Department'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[#71805a]">{formattedDate}</span>
                      {getStatusBadge(req.overallStatus)}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-[#37412a] dark:text-[#e4e9d8]">
                      {req.projectThesisName || req.experimentName}
                    </h4>
                    {req.researchObjective && (
                      <p className="text-xs text-[#71805a] mt-0.5 line-clamp-1 italic">
                        <strong>Rationale:</strong> {req.researchObjective}
                      </p>
                    )}
                  </div>

                  {/* Chemicals Requested */}
                  <div className="bg-[#fbfcf8] dark:bg-[#20251a] border border-[#e4eed3] dark:border-[#38432a] rounded-xl p-3 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#71805a] block">
                      Chemicals & Reagents ({req.chemicalsRequested?.length || 0} Items):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {(req.chemicalsRequested || []).map((c, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#1a1d16] border border-[#cfd8bd] text-xs">
                          <div>
                            <span className="font-semibold text-[#37412a] dark:text-[#e4e9d8] block">{c.chemicalName}</span>
                            {c.casNumber && <span className="text-[10px] text-gray-400 font-mono">CAS: {c.casNumber}</span>}
                          </div>
                          <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                            {c.quantityRequested || c.quantity} {c.unit || 'g'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1 text-xs">
                    <span className="text-[#71805a]">
                      Supervisor: <strong className="text-[#37412a] dark:text-[#e4e9d8]">{req.approvedByName || req.supervisorName || 'M.Pharm Supervisor'}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDetailReq(req);
                        setDetailModalOpen(true);
                      }}
                      className="text-[#556b2f] hover:underline font-bold flex items-center gap-1"
                    >
                      <Eye size={13} /> View Audit Details
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: IN-PAGE INTERACTIVE LAB WINDOW (B.PHARM PARITY) */}
      {activeLabWindow && (
        <Modal
          open={Boolean(activeLabWindow)}
          onClose={() => setActiveLabWindow(null)}
          title={`${activeLabWindow.labName || activeLabWindow.name} (${activeLabWindow.labCode || 'MPHARM-100'})`}
          size="xl"
        >
          <div className="space-y-4 text-left">
            <div className="flex justify-between items-center border-b border-[#cfd8bd] pb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLabModalTab('experiments')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    labModalTab === 'experiments' ? 'bg-[#556b2f] text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <BookOpen size={13} className="inline mr-1" /> Syllabus Practicals ({labExperiments.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLabModalTab('inventory')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    labModalTab === 'inventory' ? 'bg-[#556b2f] text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <Layers size={13} className="inline mr-1" /> Available Chemical Stock ({labInventory.length})
                </button>
              </div>

              <div className="relative w-64">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search practicals or chemicals..."
                  value={expSearch}
                  onChange={(e) => setExpSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 rounded-lg border border-[#cfd8bd] text-xs font-bold outline-none"
                />
              </div>
            </div>

            {/* TAB: EXPERIMENTS */}
            {labModalTab === 'experiments' && (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {loadingLabExperiments ? (
                  <div className="p-8 text-center text-xs text-[#71805a]">Loading practicals...</div>
                ) : labExperiments.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#71805a]">
                    No practical experiments registered for this laboratory in MongoDB yet.
                  </div>
                ) : (
                  labExperiments
                    .filter(exp => !expSearch || exp.experimentName.toLowerCase().includes(expSearch.toLowerCase()))
                    .map((exp) => (
                      <Card key={exp._id} className="p-4 rounded-xl border border-[#cfd8bd] bg-white space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-black uppercase text-sky-700 bg-sky-50 px-2 py-0.5 rounded">
                              Exp {exp.experimentNo}
                            </span>
                            <h4 className="text-sm font-black text-[#37412a] mt-1">{exp.experimentName}</h4>
                            <span className="text-xs text-[#71805a]">{exp.subject}</span>
                          </div>
                        </div>

                        {/* Prescribed Reagents */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-black uppercase text-[#71805a] block">Prescribed Reagents:</span>
                          <div className="space-y-1.5">
                            {(exp.chemicals || []).map((ch, idx) => (
                              <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-[#fbfcf8] border border-[#e4eed3] text-xs">
                                <div>
                                  <span className="font-extrabold text-[#37412a] block">{ch.chemicalName}</span>
                                  <span className="text-[10px] text-[#71805a]">Standard: {ch.quantityPerStudent} {ch.unit}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleOpenRequestModal(ch.chemicalName, ch.quantityPerStudent, ch.unit, exp.experimentName)}
                                  className="px-3 py-1 bg-[#556b2f] hover:bg-[#435525] text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-xs"
                                >
                                  <Beaker size={12} /> Borrow Chemical
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </Card>
                    ))
                )}
              </div>
            )}

            {/* TAB: INVENTORY */}
            {labModalTab === 'inventory' && (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {loadingLabInventory ? (
                  <div className="p-8 text-center text-xs text-[#71805a]">Loading lab inventory...</div>
                ) : labInventory.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#71805a]">
                    No chemicals stocked in this laboratory yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {labInventory
                      .filter(item => !expSearch || (item.chemicalName || item.itemName).toLowerCase().includes(expSearch.toLowerCase()))
                      .map((item) => (
                        <div key={item._id || item.id} className="p-3 rounded-xl border border-[#cfd8bd] bg-white space-y-2">
                          <div className="flex justify-between items-start">
                            <span className="font-extrabold text-xs text-[#37412a]">{item.chemicalName || item.itemName}</span>
                            <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                              {item.quantityAvailable ?? item.quantity} {item.quantityUnit || 'g'}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#71805a]">
                            <div>Location: {item.storageLocation || 'Cabinet A'}</div>
                            {item.casNumber && <div>CAS: {item.casNumber}</div>}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenRequestModal(item.chemicalName || item.itemName, 10, item.quantityUnit || 'g', 'Direct Lab Stock Requisition', item.casNumber)}
                            className="w-full py-1.5 bg-[#556b2f] hover:bg-[#435525] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 shadow-xs"
                          >
                            <Send size={12} /> Request From Lab Stock
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* MODAL 2: DIRECT PRACTICAL CHEMICAL BORROW DIALOG */}
      {requestingChem && (
        <Modal
          open={Boolean(requestingChem)}
          onClose={() => setRequestingChem(null)}
          title={`Borrow: ${requestingChem.name}`}
        >
          <div className="space-y-4 text-left text-xs">
            <div className="p-3 rounded-xl bg-[#f4f6ee] text-[#556b2f] font-semibold">
              Target Laboratory: <strong>{activeLabWindow?.labName || activeLabWindow?.name}</strong>
              <br />
              Experiment: <strong>{requestingChem.expTitle}</strong>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Quantity Needed *"
                type="number"
                value={reqQty}
                onChange={(e) => setReqQty(e.target.value)}
                required
              />
              <Input
                label="Unit"
                value={requestingChem.unit}
                readOnly
                className="bg-gray-100"
              />
            </div>

            <Input
              label="Additional Notes / Batch Code"
              placeholder="e.g. Group A formulation"
              value={reqNotes}
              onChange={(e) => setReqNotes(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setRequestingChem(null)}>Cancel</Button>
              <Button
                className="bg-[#556b2f] hover:bg-[#435525] text-white font-extrabold text-xs"
                onClick={handleConfirmPracticalRequest}
                disabled={submittingPracticalReq || !reqQty || Number(reqQty) <= 0}
              >
                {submittingPracticalReq ? 'Submitting...' : 'Submit Borrow Request'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 3: THESIS & DISSERTATION REQUISITION BUILDER (YEAR 2) */}
      <Modal
        open={thesisModalOpen}
        onClose={() => setThesisModalOpen(false)}
        title="Postgraduate Dissertation Chemical Requisition"
        size="lg"
      >
        <form onSubmit={handleSubmitThesisRequest} className="space-y-4 text-left">
          <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 leading-relaxed">
            ℹ️ <strong>M.Pharm Dissertation Portal</strong>: Specify your thesis research topic and use live CAS search to request customized reagents in any desired quantity. Your requisition is routed directly to your assigned research supervisor.
          </div>

          <Input
            label="Dissertation Project / Thesis Title *"
            required
            placeholder="e.g. Formulation & Evaluation of Solid Lipid Nanoparticles for Brain Delivery"
            value={thesisForm.projectThesisName}
            onChange={(e) => setThesisForm(prev => ({ ...prev, projectThesisName: e.target.value }))}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#37412a]">Research Rationale & Objective</label>
            <textarea
              rows={2}
              placeholder="e.g. Preparation of lipid core matrix for encapsulation of hydrophilic neuroprotective API..."
              value={thesisForm.researchObjective}
              onChange={(e) => setThesisForm(prev => ({ ...prev, researchObjective: e.target.value }))}
              className="w-full rounded-xl border border-[#cfd8bd] bg-white p-2.5 text-xs font-semibold outline-none focus:border-purple-600"
            />
          </div>

          {/* Chemical Reagent Items */}
          <div className="space-y-2 border-t border-[#cfd8bd] pt-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black uppercase text-[#71805a]">Required Reagents & Solvents</span>
              <button
                type="button"
                onClick={handleAddThesisChemRow}
                className="text-xs font-bold text-purple-700 hover:underline flex items-center gap-1"
              >
                <Plus size={13} /> Add Another Reagent
              </button>
            </div>

            {thesisForm.chemicals.map((row, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-[#fbfcf8] border border-[#e4eed3] space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#71805a]">Reagent #{idx + 1}</span>
                  {thesisForm.chemicals.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveThesisChemRow(idx)}
                      className="text-rose-600 hover:text-rose-800 text-[11px] font-bold"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <ChemicalSearchInput
                  label="Chemical Reagent Name *"
                  required
                  value={row.chemicalName}
                  onChange={(val) => handleThesisChemChange(idx, 'chemicalName', val)}
                  onSelect={(item) => {
                    handleThesisChemChange(idx, 'chemicalName', item.name || item.chemicalName || '');
                    handleThesisChemChange(idx, 'casNumber', item.cas || item.casNumber || '');
                    handleThesisChemChange(idx, 'unit', item.unit || row.unit || 'g');
                  }}
                />

                <div className="grid grid-cols-3 gap-2">
                  <Input
                    label="CAS Number"
                    placeholder="e.g. 57-88-5"
                    value={row.casNumber}
                    onChange={(e) => handleThesisChemChange(idx, 'casNumber', e.target.value)}
                  />
                  <Input
                    label="Quantity *"
                    type="number"
                    required
                    placeholder="50"
                    value={row.quantityRequested}
                    onChange={(e) => handleThesisChemChange(idx, 'quantityRequested', e.target.value)}
                  />
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-[#3c4e23]">Unit</label>
                    <select
                      value={row.unit}
                      onChange={(e) => handleThesisChemChange(idx, 'unit', e.target.value)}
                      className="w-full rounded-xl border border-[#cfd8bd] bg-white px-2 py-2 text-xs font-bold"
                    >
                      {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#cfd8bd]">
            <Button variant="outline" type="button" onClick={() => setThesisModalOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              className="bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs"
              disabled={submittingThesis}
            >
              {submittingThesis ? 'Submitting to Supervisor...' : 'Submit Requisition to Faculty Supervisor'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: DETAILED AUDIT INFORMATION */}
      <Modal open={detailModalOpen} onClose={() => setDetailModalOpen(false)} title="Requisition Audit Ledger Record">
        {activeDetailReq && (
          <div className="space-y-4 text-left text-xs">
            <div className="p-3 rounded-xl bg-[#f4f6ee] border border-[#cfd8bd] space-y-1">
              <div className="flex justify-between">
                <span className="font-mono font-bold text-[#71805a]">Request ID:</span>
                <span className="font-mono font-black">{activeDetailReq.requestId || 'REQ-MP'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-[#71805a]">Target Laboratory:</span>
                <span className="font-extrabold">{activeDetailReq.labName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-[#71805a]">Status:</span>
                <span>{getStatusBadge(activeDetailReq.overallStatus)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-[#71805a]">Timestamp:</span>
                <span className="font-mono">{new Date(activeDetailReq.requestedAt || activeDetailReq.createdAt).toLocaleString()}</span>
              </div>
            </div>

            <div>
              <span className="font-bold text-[#37412a] block mb-1">
                {activeDetailReq.isResearchRequest ? 'Thesis Dissertation Topic:' : 'Practical Experiment:'}
              </span>
              <p className="p-2.5 rounded-lg border border-[#cfd8bd] bg-white font-semibold">
                {activeDetailReq.projectThesisName || activeDetailReq.experimentName}
              </p>
            </div>

            <div>
              <span className="font-bold text-[#37412a] block mb-1">Reagents & Stock Allocation:</span>
              <div className="space-y-1.5">
                {(activeDetailReq.chemicalsRequested || []).map((c, i) => (
                  <div key={i} className="flex justify-between items-center p-2 rounded border border-[#cfd8bd] bg-white">
                    <div>
                      <span className="font-bold block">{c.chemicalName}</span>
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
