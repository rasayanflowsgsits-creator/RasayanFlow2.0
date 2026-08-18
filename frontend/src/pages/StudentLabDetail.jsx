import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, FlaskConical, Beaker, CheckCircle2, Clock, 
  XCircle, AlertTriangle, FileText, RefreshCw, Send, Check,
  Search, Filter, Layers, Info, ShieldCheck, Tag, MapPin
} from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import useAppStore from '../store/appStore';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';

export default function StudentLabDetail() {
  const { id: routeLabId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const stateLab = location.state?.lab;

  const user = useAuthStore((state) => state.user);
  const setToast = useAppStore((state) => state.setToast);

  const [loading, setLoading] = useState(true);
  const [labInfo, setLabInfo] = useState(null);
  const [labInventory, setLabInventory] = useState([]);
  const [experiments, setExperiments] = useState([]);
  const [requests, setRequests] = useState([]);

  // Active View Tab: 'inventory' (default real lab chemicals) or 'experiments'
  const [activeTab, setActiveTab] = useState('inventory');
  const [searchQuery, setSearchQuery] = useState('');

  // Requisition Modal State
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [requestedQty, setRequestedQty] = useState(1);
  const [requestedUnit, setRequestedUnit] = useState('mL');
  const [studentGroup, setStudentGroup] = useState(user?.group || 'Group A');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Duplicate Warning Modal State
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState(null);

  // Details Modal State
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [activeRequestDetails, setActiveRequestDetails] = useState(null);

  const labId = routeLabId || stateLab?._id || stateLab?.id;

  // Fetch Lab Details, Real Lab Chemical Inventory, Experiments, and Student Requests
  const fetchLabData = async () => {
    if (!labId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      // 1. Fetch Lab Metadata
      try {
        const labRes = await api.get(`/labs/${labId}`);
        if (labRes.data?.data || labRes.data?.lab) {
          setLabInfo(labRes.data.data || labRes.data.lab);
        }
      } catch (e) {
        console.warn('[StudentLabDetail] Metadata fetch fallback via stateLab');
      }

      // 2. Fetch REAL Lab Chemical Inventory (Added by Lab Admin for this lab)
      try {
        const invRes = await api.get(`/inventory?labId=${labId}&limit=500`);
        if (invRes.data?.data) {
          setLabInventory(invRes.data.data);
        } else if (Array.isArray(invRes.data)) {
          setLabInventory(invRes.data);
        }
      } catch (e) {
        console.error('[StudentLabDetail] Error fetching lab inventory:', e);
      }

      // 3. Fetch Custom Lab Experiments (configured by Lab Admin)
      try {
        const expRes = await api.get(`/experiments/lab/${labId}`);
        if (expRes.data?.success && Array.isArray(expRes.data?.experiments)) {
          setExperiments(expRes.data.experiments);
        } else if (expRes.data?.data && Array.isArray(expRes.data.data)) {
          setExperiments(expRes.data.data);
        }
      } catch (e) {
        console.warn('[StudentLabDetail] No custom experiments for lab');
      }

      // 4. Fetch Student's Requests for this Lab
      try {
        const reqRes = await api.get(`/student/requests/lab/${labId}`);
        if (reqRes.data?.data && Array.isArray(reqRes.data.data)) {
          setRequests(reqRes.data.data);
        }
      } catch (e) {
        console.warn('[StudentLabDetail] Error fetching student requests');
      }

    } catch (err) {
      console.error('[StudentLabDetail] Error loading lab details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabData();
  }, [labId]);

  // Derived display information for target lab
  const currentLab = useMemo(() => {
    if (labInfo) return labInfo;
    if (stateLab) return stateLab;
    return {
      _id: labId,
      id: labId,
      name: 'Pharmacy Laboratory',
      labName: 'Pharmacy Laboratory',
      labCode: 'LAB-001',
      courseType: 'B.Pharm',
      admin: 'Lab Admin',
      department: 'Pharmaceutical Sciences'
    };
  }, [labInfo, stateLab, labId]);

  // Filtered Inventory (Real Chemicals added by Lab Admin)
  const filteredInventory = useMemo(() => {
    if (!searchQuery.trim()) return labInventory;
    const q = searchQuery.toLowerCase().trim();
    return labInventory.filter((item) => 
      (item.chemicalName || item.itemName || '').toLowerCase().includes(q) ||
      (item.casNumber || '').toLowerCase().includes(q) ||
      (item.category || '').toLowerCase().includes(q) ||
      (item.storageLocation || '').toLowerCase().includes(q)
    );
  }, [labInventory, searchQuery]);

  // Filtered Experiments
  const filteredExperiments = useMemo(() => {
    if (!searchQuery.trim()) return experiments;
    const q = searchQuery.toLowerCase().trim();
    return experiments.filter((exp) =>
      (exp.experimentName || '').toLowerCase().includes(q) ||
      (exp.subject || '').toLowerCase().includes(q) ||
      (exp.experimentNo || '').toString().includes(q)
    );
  }, [experiments, searchQuery]);

  // Stat Card Counts
  const pendingRequestsCount = useMemo(() => 
    requests.filter((r) => r.overallStatus === 'Pending').length,
  [requests]);

  const approvedRequestsCount = useMemo(() => 
    requests.filter((r) => r.overallStatus === 'Approved' || r.overallStatus === 'Partial').length,
  [requests]);

  // Open Requisition Modal for a specific Real Chemical
  const handleOpenRequestModalForChemical = (chem) => {
    // Check if there is already a PENDING request for this chemical
    const existingPending = requests.find((r) => 
      (r.experimentName === (chem.chemicalName || chem.itemName)) && r.overallStatus === 'Pending'
    );

    if (existingPending) {
      const formattedDate = new Date(existingPending.requestedAt).toLocaleDateString('en-GB', { 
        day: 'numeric', month: 'long', year: 'numeric' 
      });
      setDuplicateInfo({
        requestId: existingPending.requestId || 'STU-REQ-PENDING',
        submittedAt: formattedDate
      });
      setDuplicateModalOpen(true);
      return;
    }

    setSelectedItem({
      type: 'chemical',
      chemicalName: chem.chemicalName || chem.itemName,
      itemName: chem.itemName || chem.chemicalName,
      quantityAvailable: chem.quantityAvailable !== undefined ? chem.quantityAvailable : chem.quantity,
      quantityUnit: chem.quantityUnit || 'mL',
      casNumber: chem.casNumber || '',
      category: chem.category || 'General Reagent',
      storageLocation: chem.storageLocation || 'Shelf A'
    });
    setRequestedQty(1);
    setRequestedUnit(chem.quantityUnit || 'mL');
    setStudentGroup(user?.group || 'Group A');
    setNotes('');
    setRequestModalOpen(true);
  };

  // Open Requisition Modal for an Experiment
  const handleOpenRequestModalForExperiment = (exp) => {
    const existingPending = requests.find((r) => 
      (Number(r.experimentNo) === Number(exp.experimentNo) || r.experimentName === exp.experimentName) &&
      r.overallStatus === 'Pending'
    );

    if (existingPending) {
      const formattedDate = new Date(existingPending.requestedAt).toLocaleDateString('en-GB', { 
        day: 'numeric', month: 'long', year: 'numeric' 
      });
      setDuplicateInfo({
        requestId: existingPending.requestId || 'STU-REQ-PENDING',
        submittedAt: formattedDate
      });
      setDuplicateModalOpen(true);
      return;
    }

    setSelectedItem({
      type: 'experiment',
      experimentNo: exp.experimentNo || 1,
      experimentName: exp.experimentName || 'Practical Experiment',
      subject: exp.subject || 'Lab Practical',
      chemicals: (exp.chemicals || []).map(c => ({
        chemicalName: c.chemicalName || c.name,
        quantityRequested: Number(c.quantityPerStudent || c.quantity || 1),
        unit: c.unit || c.quantityUnit || 'mL'
      }))
    });
    setRequestedQty(1);
    setRequestedUnit('mL');
    setStudentGroup(user?.group || 'Group A');
    setNotes('');
    setRequestModalOpen(true);
  };

  // Submit Chemical Request safely without site crashes
  const handleConfirmRequest = async () => {
    if (!selectedItem) return;
    setSubmitting(true);

    try {
      let payload = {};

      if (selectedItem.type === 'chemical') {
        payload = {
          labId: currentLab._id || currentLab.id || labId,
          labName: currentLab.labName || currentLab.name || 'Lab',
          year: currentLab.year || user?.year || '1',
          semester: currentLab.semester || user?.semester || '1',
          subject: selectedItem.category || 'Lab Requisition',
          experimentNo: 1,
          experimentName: selectedItem.chemicalName,
          chemicalsRequested: [
            {
              chemicalName: selectedItem.chemicalName,
              quantityRequested: Number(requestedQty || 1),
              unit: requestedUnit || selectedItem.quantityUnit || 'mL'
            }
          ],
          group: studentGroup || user?.group || 'Group A',
          notes: notes.trim()
        };
      } else {
        payload = {
          labId: currentLab._id || currentLab.id || labId,
          labName: currentLab.labName || currentLab.name || 'Lab',
          year: currentLab.year || user?.year || '1',
          semester: currentLab.semester || user?.semester || '1',
          subject: selectedItem.subject || 'Practical Session',
          experimentNo: Number(selectedItem.experimentNo || 1),
          experimentName: selectedItem.experimentName,
          chemicalsRequested: (selectedItem.chemicals || []).map(c => ({
            chemicalName: c.chemicalName,
            quantityRequested: Number(c.quantityRequested || 1),
            unit: c.unit || 'mL'
          })),
          group: studentGroup || user?.group || 'Group A',
          notes: notes.trim()
        };
      }

      const res = await api.post('/student/requests', payload);

      if (res.data && (res.data.success || res.status === 201)) {
        setToast({ 
          type: 'success', 
          message: '✅ Request submitted! Lab Admin will review shortly.' 
        });
        setRequestModalOpen(false);
        fetchLabData();
      }
    } catch (err) {
      if (err.response?.status === 409 || err.response?.data?.isDuplicate) {
        setRequestModalOpen(false);
        const dup = err.response?.data?.data;
        const formattedDate = dup?.requestedAt 
          ? new Date(dup.requestedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
          : 'Today';

        setDuplicateInfo({
          requestId: dup?.requestId || 'STU-REQ-PENDING',
          submittedAt: formattedDate
        });
        setDuplicateModalOpen(true);
      } else {
        setToast({ 
          type: 'error', 
          message: err.response?.data?.message || 'Failed to submit request.' 
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetails = (req) => {
    setActiveRequestDetails(req);
    setDetailsModalOpen(true);
  };

  return (
    <div className="min-h-screen pb-16">
      {/* STICKY TOP BAR */}
      <div className="sticky top-0 z-20 bg-[#fdfdf7]/95 dark:bg-[#1a1d16]/95 backdrop-blur-md pb-4 pt-2 border-b border-[#e8eadf] dark:border-[#3c452f] mb-6">
        <div className="flex flex-col gap-1">
          {/* Back Button */}
          <button 
            onClick={() => navigate(-1)} 
            className="self-start inline-flex items-center gap-1.5 text-sm font-semibold text-[#556b2f] hover:text-[#3c4e23] dark:text-[#c8a030] dark:hover:text-[#e5ba45] hover:underline transition-all mb-1"
          >
            <ArrowLeft size={16} /> Back to My Dashboard
          </button>
          
          {/* Lab Title Header */}
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold text-[#3c4e23] dark:text-[#eef4e8] flex items-center gap-2">
                <Beaker className="w-6 h-6 text-[#556b2f] dark:text-[#c8a030]" />
                {currentLab.labName || currentLab.name || 'Pharmacy Lab'}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Lab Code: <span className="font-semibold text-gray-700 dark:text-gray-300">{currentLab.labCode || 'LAB-001'}</span> • Course: <span className="font-semibold text-gray-700 dark:text-gray-300">{currentLab.courseType || 'B.Pharm'}</span> • Lab Admin: <span className="font-semibold text-gray-700 dark:text-gray-300">{currentLab.admin || 'Assigned In-Charge'}</span>
              </p>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex bg-[#f0f4e8] dark:bg-[#28301f] p-1 rounded-xl border border-[#dce5cc] dark:border-[#3c452f]">
              <button
                onClick={() => setActiveTab('inventory')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'inventory'
                    ? 'bg-[#556b2f] text-white shadow-sm'
                    : 'text-[#556b2f] dark:text-[#c5d0b5] hover:bg-[#e2ead3] dark:hover:bg-[#343e2a]'
                }`}
              >
                <Beaker size={14} /> Lab Chemicals ({labInventory.length})
              </button>
              <button
                onClick={() => setActiveTab('experiments')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'experiments'
                    ? 'bg-[#556b2f] text-white shadow-sm'
                    : 'text-[#556b2f] dark:text-[#c5d0b5] hover:bg-[#e2ead3] dark:hover:bg-[#343e2a]'
                }`}
              >
                <FlaskConical size={14} /> Experiments ({experiments.length})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* STAT CARDS (4 CARDS) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Lab Chemicals */}
        <div className="bg-white dark:bg-[#1f2419] p-4 rounded-xl border border-[#e8eadf] dark:border-[#3c452f] shadow-sm flex items-center gap-3">
          <div className="p-3 bg-[#556b2f]/10 dark:bg-[#c8a030]/10 rounded-xl text-[#556b2f] dark:text-[#c8a030]">
            <Beaker className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-[#71805a] dark:text-[#a5b48b] font-medium">Lab Inventory Stock</p>
            <p className="text-xl font-bold text-[#3c4e23] dark:text-[#eef4e8]">{labInventory.length} Chemicals</p>
          </div>
        </div>

        {/* Total Experiments */}
        <div className="bg-white dark:bg-[#1f2419] p-4 rounded-xl border border-[#e8eadf] dark:border-[#3c452f] shadow-sm flex items-center gap-3">
          <div className="p-3 bg-[#556b2f]/10 dark:bg-[#c8a030]/10 rounded-xl text-[#556b2f] dark:text-[#c8a030]">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-[#71805a] dark:text-[#a5b48b] font-medium">Configured Experiments</p>
            <p className="text-xl font-bold text-[#3c4e23] dark:text-[#eef4e8]">{experiments.length}</p>
          </div>
        </div>

        {/* My Pending Requests */}
        <div className="bg-white dark:bg-[#1f2419] p-4 rounded-xl border border-[#e8eadf] dark:border-[#3c452f] shadow-sm flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-600 dark:text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-[#71805a] dark:text-[#a5b48b] font-medium">My Pending Requests</p>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{pendingRequestsCount}</p>
          </div>
        </div>

        {/* My Approved Requests */}
        <div className="bg-white dark:bg-[#1f2419] p-4 rounded-xl border border-[#e8eadf] dark:border-[#3c452f] shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-[#71805a] dark:text-[#a5b48b] font-medium">My Approved Requests</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{approvedRequestsCount}</p>
          </div>
        </div>
      </div>

      {/* SEARCH & FILTER BAR */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={activeTab === 'inventory' ? "Search lab chemicals by name, CAS, category..." : "Search experiments..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-[#dce5cc] bg-white pl-10 pr-4 py-2 text-xs text-[#3c4e23] outline-none focus:ring-2 focus:ring-[#556b2f] dark:border-[#3c452f] dark:bg-[#1f2419] dark:text-[#eef4e8]"
          />
        </div>
      </div>

      {/* TAB 1: REAL LAB CHEMICAL INVENTORY */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#3c4e23] dark:text-[#eef4e8] flex items-center gap-2">
              <Beaker className="w-5 h-5 text-[#556b2f] dark:text-[#c8a030]" />
              Actual Lab Chemical Stock ({filteredInventory.length})
            </h2>
            <span className="text-xs text-[#71805a] dark:text-[#a5b48b]">
              Added by Lab Admin for {currentLab.labName || currentLab.name}
            </span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-[#71805a] dark:text-[#c5d0b5]">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#556b2f] border-t-transparent mb-3" />
              <p className="text-sm font-medium">Loading lab inventory...</p>
            </div>
          ) : filteredInventory.length === 0 ? (
            <div className="bg-white dark:bg-[#1f2419] border border-dashed border-[#d9e1ca] dark:border-[#414a33] rounded-2xl p-12 text-center my-6 max-w-xl mx-auto shadow-sm">
              <div className="w-16 h-16 rounded-full bg-[#f4f6ee] dark:bg-[#2a3121] text-[#556b2f] dark:text-[#c8a030] flex items-center justify-center mx-auto mb-4">
                <Beaker className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-[#3c4e23] dark:text-[#eef4e8] mb-2">No Chemicals Listed Yet</h3>
              <p className="text-sm text-[#71805a] dark:text-[#c5d0b5] max-w-md mx-auto">
                {searchQuery ? "No chemicals match your search query." : "Your Lab Admin hasn't added any chemicals to this lab's inventory yet. Please contact your Lab Admin."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredInventory.map((item) => {
                const chemName = item.chemicalName || item.itemName;
                const qty = item.quantityAvailable !== undefined ? item.quantityAvailable : item.quantity;
                const unit = item.quantityUnit || 'mL';
                const isAvailable = qty > 0;
                const existingReq = requests.find(r => r.experimentName === chemName);
                const reqStatus = existingReq ? existingReq.overallStatus : null;

                return (
                  <div 
                    key={item._id || item.id || item.itemCode}
                    className="bg-white dark:bg-[#1f2419] rounded-xl shadow-sm p-4 border border-[#e8eadf] dark:border-[#3c452f] flex flex-col justify-between transition-all hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="inline-block px-2 py-0.5 bg-[#f0f4e8] dark:bg-[#28301f] text-[#556b2f] dark:text-[#c8a030] text-[10px] font-bold rounded uppercase tracking-wider">
                          {item.category || 'Reagent'}
                        </span>
                        {item.casNumber && (
                          <span className="text-[10px] text-gray-400 font-mono">
                            CAS: {item.casNumber}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-[#3c4e23] dark:text-[#eef4e8] mb-1">
                        {chemName}
                      </h3>

                      {item.storageLocation && (
                        <p className="text-[11px] text-gray-500 flex items-center gap-1 mb-3">
                          <MapPin size={12} className="text-[#556b2f]" /> Location: {item.storageLocation}
                        </p>
                      )}

                      <div className="bg-[#fafdf7] dark:bg-[#1a1d16] p-2.5 rounded-lg border border-[#f0ede6] dark:border-[#3c452f] mb-3 text-xs flex justify-between items-center">
                        <span className="text-gray-500 font-medium">Available Stock:</span>
                        <span className={`font-bold ${isAvailable ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'}`}>
                          {qty} {unit}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#f0f2eb] dark:border-[#3c452f]/60">
                      {reqStatus === 'Pending' ? (
                        <div className="flex items-center justify-between text-xs text-amber-600 font-bold">
                          <span>⏳ Request Pending</span>
                          <button onClick={() => handleViewDetails(existingReq)} className="underline text-[11px]">View</button>
                        </div>
                      ) : reqStatus === 'Approved' ? (
                        <div className="flex items-center justify-between text-xs text-emerald-600 font-bold">
                          <span>✅ Approved</span>
                          <button onClick={() => handleViewDetails(existingReq)} className="underline text-[11px]">Details</button>
                        </div>
                      ) : (
                        <Button 
                          onClick={() => handleOpenRequestModalForChemical(item)}
                          disabled={!isAvailable}
                          className="w-full bg-[#556b2f] hover:bg-[#435525] text-white font-bold py-1.5 rounded-lg shadow-sm text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          📋 Request This Chemical
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CONFIGURED EXPERIMENTS */}
      {activeTab === 'experiments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#3c4e23] dark:text-[#eef4e8] flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-[#556b2f] dark:text-[#c8a030]" />
              Lab Experiments ({filteredExperiments.length})
            </h2>
          </div>

          {loading ? (
            <div className="py-16 text-center text-[#71805a] dark:text-[#c5d0b5]">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#556b2f] border-t-transparent mb-3" />
              <p className="text-sm font-medium">Loading experiments...</p>
            </div>
          ) : filteredExperiments.length === 0 ? (
            <div className="bg-white dark:bg-[#1f2419] border border-dashed border-[#d9e1ca] dark:border-[#414a33] rounded-2xl p-12 text-center my-6 max-w-xl mx-auto shadow-sm">
              <div className="w-16 h-16 rounded-full bg-[#f4f6ee] dark:bg-[#2a3121] text-[#556b2f] dark:text-[#c8a030] flex items-center justify-center mx-auto mb-4">
                <FlaskConical className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-[#3c4e23] dark:text-[#eef4e8] mb-2">No Experiments Configured</h3>
              <p className="text-sm text-[#71805a] dark:text-[#c5d0b5] max-w-md mx-auto">
                Your Lab Admin hasn't configured custom practical experiments for this lab yet. You can request chemicals directly from the <button onClick={() => setActiveTab('inventory')} className="text-[#556b2f] font-bold underline">Lab Chemicals</button> tab.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredExperiments.map((exp) => {
                const isUnlocked = Boolean(exp.isUnlocked);
                const hasRequestedToday = (requests || []).some(r => {
                  const reqDate = new Date(r.requestedAt || r.createdAt || Date.now()).toDateString();
                  const todayDate = new Date().toDateString();
                  if (reqDate !== todayDate) return false;
                  
                  return (
                    r.experimentNo == exp.experimentNo ||
                    (r.notes && r.notes.toLowerCase().includes(`exp ${exp.experimentNo}`)) ||
                    (r.chemicalsRequested || []).some(cr => 
                      (exp.chemicals || []).some(ec => ec.chemicalName?.toLowerCase() === cr.chemicalName?.toLowerCase())
                    )
                  );
                });

                return (
                  <div 
                    key={exp._id || exp.id || exp.experimentNo}
                    className="bg-white dark:bg-[#1f2419] rounded-xl shadow-sm p-4 border border-[#e8eadf] dark:border-[#3c452f] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="inline-block px-2 py-0.5 bg-[#f0f4e8] dark:bg-[#28301f] text-[#556b2f] dark:text-[#c8a030] text-[10px] font-bold rounded uppercase">
                          Exp {exp.experimentNo}
                        </span>
                        
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          isUnlocked 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' 
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}>
                          {isUnlocked ? '🔓 Unlocked for Practical' : '🔒 Locked by Admin'}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-[#3c4e23] dark:text-[#eef4e8] mb-2">
                        {exp.experimentName}
                      </h3>
                      <p className="text-xs text-gray-500 mb-3">Subject: {exp.subject || 'Practical'}</p>

                      {/* Chemicals List */}
                      <div className="space-y-1 mb-4 p-2 bg-[#fafdf7] dark:bg-[#1a1d16] rounded-lg border border-[#e8eadf] dark:border-[#3c452f]">
                        <p className="text-[10px] font-bold text-[#71805a] dark:text-[#a5b48b] uppercase tracking-wider mb-1">Required Chemicals:</p>
                        {(exp.chemicals || []).map((c, i) => (
                          <div key={i} className="text-xs flex justify-between text-gray-700 dark:text-gray-300">
                            <span>• {c.chemicalName}</span>
                            <span className="font-semibold">{c.quantityPerStudent || c.quantity || 1} {c.unit || 'mL'}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {!isUnlocked ? (
                      <Button 
                        disabled
                        className="w-full bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-not-allowed border border-amber-200 dark:border-amber-800 opacity-80"
                      >
                        🔒 Locked (Practical Not Unlocked Yet)
                      </Button>
                    ) : hasRequestedToday ? (
                      <Button 
                        disabled
                        className="w-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-not-allowed border border-emerald-200 dark:border-emerald-800 opacity-90"
                      >
                        ✅ Requested Once for Today's Session
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => handleOpenRequestModalForExperiment(exp)}
                        className="w-full bg-[#556b2f] hover:bg-[#435525] text-white font-bold py-2 rounded-lg text-xs shadow-sm flex items-center justify-center gap-1.5"
                      >
                        🧪 Request Experiment Chemicals
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* REQUEST MODAL */}
      <Modal 
        open={requestModalOpen} 
        onClose={() => setRequestModalOpen(false)} 
        title="Request Chemical from Lab Admin"
      >
        {selectedItem && (
          <div className="space-y-5 text-left">
            <div>
              <p className="text-sm font-bold text-[#556b2f] dark:text-[#c8a030]">
                {selectedItem.type === 'chemical' ? selectedItem.chemicalName : selectedItem.experimentName}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Lab: {currentLab.labName || currentLab.name} • Student: {user?.name} ({user?.rollNumber || 'RN-1001'})
              </p>
            </div>

            {/* CHEMICAL QUANTITY & UNIT SELECTOR */}
            {selectedItem.type === 'chemical' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#3c4e23] dark:text-[#c8a030] uppercase tracking-wider mb-1 block">
                    Requested Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={requestedQty}
                    onChange={(e) => setRequestedQty(Math.max(1, Number(e.target.value)))}
                    className="w-full rounded-xl border border-[#cfd8bd] bg-white px-3 py-2 text-xs font-bold text-[#3c4e23] outline-none focus:ring-2 focus:ring-[#556b2f] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#3c4e23] dark:text-[#c8a030] uppercase tracking-wider mb-1 block">
                    Unit
                  </label>
                  <select
                    value={requestedUnit}
                    onChange={(e) => setRequestedUnit(e.target.value)}
                    className="w-full rounded-xl border border-[#cfd8bd] bg-white px-3 py-2 text-xs font-bold text-[#3c4e23] outline-none focus:ring-2 focus:ring-[#556b2f] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]"
                  >
                    <option value="mL">mL (Milliliters)</option>
                    <option value="L">L (Liters)</option>
                    <option value="g">g (Grams)</option>
                    <option value="kg">kg (Kilograms)</option>
                    <option value="mg">mg (Milligrams)</option>
                    <option value="units">units (Apparatus/Items)</option>
                  </select>
                </div>
              </div>
            )}

            {/* GROUP SELECTOR */}
            <div>
              <label className="text-xs font-bold text-[#3c4e23] dark:text-[#c8a030] uppercase tracking-wider mb-1 block">
                Student Group
              </label>
              <select
                value={studentGroup}
                onChange={(e) => setStudentGroup(e.target.value)}
                className="w-full rounded-xl border border-[#cfd8bd] bg-white px-3 py-2 text-xs text-[#3c4e23] outline-none focus:ring-2 focus:ring-[#556b2f] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]"
              >
                <option value="Group A">Group A</option>
                <option value="Group B">Group B</option>
                <option value="Group C">Group C</option>
                <option value="Group D">Group D</option>
              </select>
            </div>

            {/* NOTES / INSTRUCTIONS */}
            <div>
              <label className="text-xs font-bold text-[#3c4e23] dark:text-[#c8a030] uppercase tracking-wider mb-1 block">
                Purpose / Practical Instructions
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="E.g., Synthesis practical session, titration experiment..."
                className="w-full rounded-xl border border-[#cfd8bd] bg-white px-3 py-2 text-xs text-[#3c4e23] outline-none focus:ring-2 focus:ring-[#556b2f] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8] h-20 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setRequestModalOpen(false)} className="flex-1 py-2">
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmRequest} 
                disabled={submitting}
                className="flex-1 bg-[#556b2f] hover:bg-[#435525] text-white font-bold py-2 rounded-xl"
              >
                {submitting ? 'Submitting...' : '✅ Confirm Request'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* DUPLICATE WARNING MODAL */}
      <Modal
        open={duplicateModalOpen}
        onClose={() => setDuplicateModalOpen(false)}
        title="Duplicate Request Notice"
      >
        <div className="space-y-4 text-center py-2">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-base text-gray-800 dark:text-gray-100">
              You already have a pending request for this chemical!
            </h4>
            {duplicateInfo && (
              <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 p-3 rounded-xl text-xs font-mono border border-amber-200 dark:border-amber-800/40 mt-3 text-left space-y-1">
                <p><strong>Request ID:</strong> {duplicateInfo.requestId}</p>
                <p><strong>Submitted:</strong> {duplicateInfo.submittedAt}</p>
              </div>
            )}
          </div>
          <Button onClick={() => setDuplicateModalOpen(false)} className="w-full bg-[#556b2f] text-white font-bold py-2 rounded-xl mt-4">
            OK
          </Button>
        </div>
      </Modal>

      {/* VIEW DETAILS MODAL */}
      <Modal
        open={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title="Request Details"
      >
        {activeRequestDetails && (
          <div className="space-y-4 text-left text-xs">
            <div className="flex justify-between items-center border-b border-[#e8eadf] pb-2">
              <div>
                <p className="font-bold text-sm text-[#3c4e23] dark:text-[#eef4e8]">{activeRequestDetails.experimentName}</p>
                <p className="text-gray-500">Request ID: <span className="font-mono font-bold">{activeRequestDetails.requestId}</span></p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                activeRequestDetails.overallStatus === 'Pending' ? 'bg-amber-100 text-amber-800' :
                activeRequestDetails.overallStatus === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                activeRequestDetails.overallStatus === 'Rejected' ? 'bg-rose-100 text-rose-800' : 'bg-gray-100'
              }`}>
                {activeRequestDetails.overallStatus}
              </span>
            </div>

            <div>
              <p className="font-bold text-[#556b2f] mb-1">Requested Chemicals:</p>
              <div className="space-y-1 bg-[#fdfdf7] dark:bg-[#1a1d16] p-3 rounded-xl border border-[#e8eadf]">
                {(activeRequestDetails.chemicalsRequested || []).map((c, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{c.chemicalName}</span>
                    <strong className="font-semibold">{c.quantityRequested} {c.unit}</strong>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={() => setDetailsModalOpen(false)} className="w-full bg-[#556b2f] text-white font-bold py-2 mt-2">
              Close
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
