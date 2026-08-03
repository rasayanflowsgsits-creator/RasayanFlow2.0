import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, FlaskConical, Beaker, CheckCircle2, Clock, 
  XCircle, AlertTriangle, FileText, RefreshCw, Send, Check
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
  const [structure, setStructure] = useState([]);
  const [labInfo, setLabInfo] = useState(null);
  const [requests, setRequests] = useState([]);

  // Modal States
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedExp, setSelectedExp] = useState(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Duplicate Warning Modal State
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState(null);

  // Details Modal State (for Approved / Rejected / Pending view)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [activeRequestDetails, setActiveRequestDetails] = useState(null);

  const labId = routeLabId || stateLab?._id || stateLab?.id;

  // Fetch Lab Details & Experiments
  const fetchLabData = async () => {
    if (!labId) return;
    setLoading(true);
    try {
      const res = await api.get(`/lab/structure/student/${labId}`);
      if (res.data.success) {
        setStructure(res.data.data || []);
        setLabInfo(res.data.lab || null);
        setRequests(res.data.studentRequests || []);
      }
    } catch (err) {
      console.error('Failed to load student lab structure:', err);
      // Fallback request list load
      try {
        const reqRes = await api.get(`/student/requests/lab/${labId}`);
        if (reqRes.data.success) {
          setRequests(reqRes.data.data || []);
        }
      } catch (e) {
        console.error('Failed to load lab requests:', e);
      }
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
      name: 'HAP1',
      labName: 'HAP1',
      labCode: '0001',
      courseType: 'B.Pharm',
      admin: 'user10',
      adminEmail: 'user10@gmail.com',
      department: 'Pharmaceutics'
    };
  }, [labInfo, stateLab, labId]);

  // Unique chemicals count
  const uniqueChemicalsCount = useMemo(() => {
    const set = new Set();
    structure.forEach((exp) => {
      (exp.chemicals || []).forEach((c) => {
        if (c.chemicalName) set.add(c.chemicalName.toLowerCase().trim());
      });
    });
    return set.size;
  }, [structure]);

  // Group experiments by subject
  const groupedExperiments = useMemo(() => {
    const groups = {};
    structure.forEach((exp) => {
      const subj = exp.subject || exp.labName || 'HAP - I (Human Anatomy & Physiology 1)';
      if (!groups[subj]) groups[subj] = [];
      groups[subj].push(exp);
    });
    return groups;
  }, [structure]);

  // Find latest student request for a specific experiment
  const getExperimentRequest = (exp) => {
    return requests.find((r) => 
      Number(r.experimentNo) === Number(exp.experimentNo) || 
      (r.experimentName && exp.experimentName && r.experimentName.toLowerCase().trim() === exp.experimentName.toLowerCase().trim())
    );
  };

  // Stat Card Counts
  const pendingRequestsCount = useMemo(() => 
    requests.filter((r) => r.overallStatus === 'Pending').length,
  [requests]);

  const approvedRequestsCount = useMemo(() => 
    requests.filter((r) => r.overallStatus === 'Approved' || r.overallStatus === 'Partial').length,
  [requests]);

  // Open Request Modal
  const handleOpenRequestModal = (exp) => {
    // Check if there is already a PENDING request locally
    const existingPending = requests.find((r) => 
      (Number(r.experimentNo) === Number(exp.experimentNo) || r.experimentName === exp.experimentName) &&
      r.overallStatus === 'Pending'
    );

    if (existingPending) {
      const formattedDate = new Date(existingPending.requestedAt).toLocaleDateString('en-GB', { 
        day: 'numeric', month: 'long', year: 'numeric' 
      });
      setDuplicateInfo({
        requestId: existingPending.requestId || 'STU-REQ-123',
        submittedAt: formattedDate
      });
      setDuplicateModalOpen(true);
      return;
    }

    setSelectedExp(exp);
    setNotes('');
    setRequestModalOpen(true);
  };

  // Submit Chemical Request
  const handleConfirmRequest = async () => {
    if (!selectedExp) return;
    setSubmitting(true);
    try {
      const payload = {
        labId: currentLab._id || currentLab.id || labId,
        labName: currentLab.labName || currentLab.name || 'HAP1',
        year: currentLab.year || user?.year || '1',
        semester: currentLab.semester || user?.semester || '1',
        subject: selectedExp.subject || 'HAP - I',
        experimentNo: selectedExp.experimentNo,
        experimentName: selectedExp.experimentName,
        chemicalsRequested: (selectedExp.chemicals || []).map((c) => ({
          chemicalName: c.chemicalName,
          quantityRequested: Number(c.quantityPerStudent || c.quantity || 1),
          unit: c.unit || 'mL'
        })),
        notes: notes.trim()
      };

      const res = await api.post('/student/requests', payload);

      if (res.data.success) {
        setToast({ 
          type: 'success', 
          message: '✅ Request submitted! Lab Admin will review shortly.' 
        });
        setRequestModalOpen(false);
        // Immediately add/update request in local state without full page refresh
        const newReq = res.data.data;
        setRequests((prev) => [newReq, ...prev.filter((r) => r.requestId !== newReq.requestId)]);
      }
    } catch (err) {
      if (err.response?.status === 409 || err.response?.data?.isDuplicate) {
        setRequestModalOpen(false);
        const dup = err.response?.data?.data;
        const formattedDate = dup?.requestedAt 
          ? new Date(dup.requestedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
          : '31 July 2026';

        setDuplicateInfo({
          requestId: dup?.requestId || 'STU-REQ-123',
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

  // View Details Modal
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
            <ArrowLeft size={16} /> Back to My Labs
          </button>
          
          {/* Lab Title Header */}
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold text-[#3c4e23] dark:text-[#eef4e8] flex items-center gap-2">
                <Beaker className="w-6 h-6 text-[#556b2f] dark:text-[#c8a030]" />
                {currentLab.labName || currentLab.name || 'HAP1'}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Lab Code: <span className="font-semibold text-gray-700 dark:text-gray-300">{currentLab.labCode || '0001'}</span> • Course: <span className="font-semibold text-gray-700 dark:text-gray-300">{currentLab.courseType || 'B.Pharm'}</span> • Admins: <span className="font-semibold text-gray-700 dark:text-gray-300">{currentLab.admin || 'user10'} ({currentLab.adminEmail || 'user10@gmail.com'})</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* STAT CARDS (4 CARDS) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Experiments */}
        <div className="bg-white dark:bg-[#1f2419] p-4 rounded-xl border border-[#e8eadf] dark:border-[#3c452f] shadow-sm flex items-center gap-3">
          <div className="p-3 bg-[#556b2f]/10 dark:bg-[#c8a030]/10 rounded-xl text-[#556b2f] dark:text-[#c8a030]">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-[#71805a] dark:text-[#a5b48b] font-medium">Total Experiments</p>
            <p className="text-xl font-bold text-[#3c4e23] dark:text-[#eef4e8]">{structure.length}</p>
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

        {/* Chemicals Available */}
        <div className="bg-white dark:bg-[#1f2419] p-4 rounded-xl border border-[#e8eadf] dark:border-[#3c452f] shadow-sm flex items-center gap-3">
          <div className="p-3 bg-[#556b2f]/10 dark:bg-[#c8a030]/10 rounded-xl text-[#556b2f] dark:text-[#c8a030]">
            <Beaker className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-[#71805a] dark:text-[#a5b48b] font-medium">Chemicals Available</p>
            <p className="text-xl font-bold text-[#3c4e23] dark:text-[#eef4e8]">{uniqueChemicalsCount}</p>
          </div>
        </div>
      </div>

      {/* SUBJECTS AND EXPERIMENTS SECTION */}
      {loading ? (
        <div className="py-16 text-center text-[#71805a] dark:text-[#c5d0b5]">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#556b2f] border-t-transparent mb-3" />
          <p className="text-sm font-medium">Loading lab experiments...</p>
        </div>
      ) : structure.length === 0 ? (
        /* IF NO EXPERIMENTS UPLOADED */
        <div className="bg-white dark:bg-[#1f2419] border border-dashed border-[#d9e1ca] dark:border-[#414a33] rounded-2xl p-12 text-center my-6 max-w-xl mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-full bg-[#f4f6ee] dark:bg-[#2a3121] text-[#556b2f] dark:text-[#c8a030] flex items-center justify-center mx-auto mb-4">
            <FlaskConical className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-[#3c4e23] dark:text-[#eef4e8] mb-2">No Experiments Yet</h3>
          <p className="text-sm text-[#71805a] dark:text-[#c5d0b5] max-w-md mx-auto">
            Your Lab Admin hasn't uploaded any experiments for this lab yet. Please check back later or contact your Lab Admin.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {Object.entries(groupedExperiments).map(([subjectName, exps]) => (
            <div key={subjectName} className="space-y-5">
              {/* SUBJECT SECTION HEADER */}
              <div className="border-b-2 border-[#e8f0dc] dark:border-[#3c452f] pb-2 mb-4 flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-[#556b2f] dark:text-[#c8a030]" />
                <h2 className="text-lg font-semibold text-[#556b2f] dark:text-[#c8a030]">
                  Subject: {subjectName}
                </h2>
              </div>

              {/* EXPERIMENT CARDS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {exps.map((exp) => {
                  const existingReq = getExperimentRequest(exp);
                  const status = existingReq ? existingReq.overallStatus : 'NOT_REQUESTED';

                  // Card border colors based on state
                  let cardBorderClass = 'border-l-4 border-l-gray-300 dark:border-l-gray-600';
                  if (status === 'Pending') cardBorderClass = 'border-l-4 border-l-[#f0c040]';
                  else if (status === 'Approved' || status === 'Partial') cardBorderClass = 'border-l-4 border-l-[#4a9a4a]';
                  else if (status === 'Rejected') cardBorderClass = 'border-l-4 border-l-[#c04040]';

                  return (
                    <div 
                      key={exp._id || exp.id || exp.experimentNo}
                      className={`bg-white dark:bg-[#1f2419] rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-5 mb-4 border border-[#e8eadf] dark:border-[#3c452f] ${cardBorderClass} flex flex-col justify-between transition-all duration-200 hover:shadow-md`}
                    >
                      <div>
                        {/* Exp No & Title */}
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <span className="inline-block px-2.5 py-0.5 bg-[#f0f4e8] dark:bg-[#28301f] text-[#556b2f] dark:text-[#c8a030] text-xs font-bold rounded-md uppercase tracking-wider">
                            Exp {String(exp.experimentNo).padStart(2, '0')}
                          </span>
                        </div>
                        
                        <h3 className="text-base font-bold text-[#3c4e23] dark:text-[#eef4e8] mb-4">
                          {exp.experimentName}
                        </h3>

                        {/* Chemicals Required Table */}
                        <div className="mb-5">
                          <p className="text-xs font-semibold text-[#71805a] dark:text-[#a5b48b] mb-2 uppercase tracking-wider">
                            Chemicals / Reagents Required:
                          </p>
                          <div className="overflow-hidden rounded-lg border border-[#f0ede6] dark:border-[#3c452f]">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-[#f4f6ee] dark:bg-[#28301f] text-[#3c4e23] dark:text-[#eef4e8] font-bold">
                                <tr>
                                  <th className="px-3 py-2 border-b border-[#f0ede6] dark:border-[#3c452f]">Chemical Name</th>
                                  <th className="px-3 py-2 border-b border-[#f0ede6] dark:border-[#3c452f] w-28">Quantity</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(exp.chemicals || []).map((chem, idx) => (
                                  <tr 
                                    key={idx} 
                                    className={`${idx % 2 === 0 ? 'bg-white dark:bg-[#1a1d16]' : 'bg-[#fafdf7] dark:bg-[#20251a]'} border-b last:border-none border-[#f0ede6] dark:border-[#3c452f]`}
                                  >
                                    <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200">
                                      {chem.chemicalName}
                                    </td>
                                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400 font-semibold">
                                      {chem.quantityPerStudent || chem.quantity || 1} {chem.unit || 'mL'}
                                    </td>
                                  </tr>
                                ))}
                                {(!exp.chemicals || exp.chemicals.length === 0) && (
                                  <tr>
                                    <td colSpan="2" className="px-3 py-2 text-gray-400 italic text-center">
                                      No chemicals configured
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* CARD FOOTER & ACTIONS BASED ON STATE */}
                      <div className="pt-3 border-t border-[#f0f2eb] dark:border-[#3c452f]/60">
                        {/* STATE 1: NOT REQUESTED */}
                        {(!existingReq || status === 'NOT_REQUESTED') && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                              <span>Status: <strong className="text-gray-700 dark:text-gray-300">Not Requested</strong></span>
                            </div>
                            <Button 
                              onClick={() => handleOpenRequestModal(exp)}
                              className="w-full bg-[#556b2f] hover:bg-[#435525] text-white font-bold py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-2"
                            >
                              📋 Request These Chemicals
                            </Button>
                          </div>
                        )}

                        {/* STATE 2: PENDING */}
                        {status === 'Pending' && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs text-[#f0c040] font-bold">
                              <span className="flex items-center gap-1">⏳ Request Pending</span>
                              <span className="text-[11px] text-gray-400">ID: {existingReq.requestId}</span>
                            </div>
                            <button 
                              onClick={() => handleViewDetails(existingReq)}
                              className="w-full border-2 border-[#f0c040] text-[#b88c14] dark:text-[#f0c040] hover:bg-[#f0c040]/10 font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                            >
                              View Request Status
                            </button>
                          </div>
                        )}

                        {/* STATE 3: APPROVED */}
                        {(status === 'Approved' || status === 'Partial') && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs text-[#4a9a4a] font-bold">
                              <span className="flex items-center gap-1">✅ Chemicals Approved</span>
                              {existingReq.approvedAt && (
                                <span className="text-[11px] text-gray-400 font-normal">
                                  {new Date(existingReq.approvedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <button 
                              onClick={() => handleViewDetails(existingReq)}
                              className="w-full border-2 border-[#4a9a4a] text-[#4a9a4a] hover:bg-[#4a9a4a]/10 font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                            >
                              View Details
                            </button>
                          </div>
                        )}

                        {/* STATE 4: REJECTED */}
                        {status === 'Rejected' && (
                          <div className="space-y-2">
                            <div className="text-xs text-[#c04040]">
                              <div className="font-bold flex items-center gap-1">❌ Request Rejected</div>
                              {existingReq.rejectionReason && (
                                <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5 line-clamp-1">
                                  Reason: {existingReq.rejectionReason}
                                </p>
                              )}
                            </div>
                            <button 
                              onClick={() => handleOpenRequestModal(exp)}
                              className="w-full border-2 border-[#c04040] text-[#c04040] hover:bg-[#c04040]/10 font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                            >
                              🔄 Request Again
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* REQUEST MODAL */}
      <Modal 
        open={requestModalOpen} 
        onClose={() => setRequestModalOpen(false)} 
        title="Request Chemicals"
      >
        {selectedExp && (
          <div className="space-y-5 text-left">
            <div>
              <p className="text-sm font-bold text-[#556b2f] dark:text-[#c8a030]">
                Exp {String(selectedExp.experimentNo).padStart(2, '0')} — {selectedExp.experimentName}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Lab: {currentLab.labName || currentLab.name || 'HAP1'}
              </p>
            </div>

            {/* Chemicals Table */}
            <div>
              <label className="text-xs font-bold text-[#3c4e23] dark:text-[#c8a030] uppercase tracking-wider mb-1.5 block">
                Required Chemicals
              </label>
              <div className="overflow-hidden rounded-xl border border-[#cfd8bd] dark:border-[#4e5d35]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#f4f6ee] dark:bg-[#28301f] text-[#3c4e23] dark:text-[#eef4e8] font-bold">
                    <tr>
                      <th className="px-3 py-2 border-b border-[#cfd8bd] dark:border-[#4e5d35]">Chemical Name</th>
                      <th className="px-3 py-2 border-b border-[#cfd8bd] dark:border-[#4e5d35] w-16">Qty</th>
                      <th className="px-3 py-2 border-b border-[#cfd8bd] dark:border-[#4e5d35] w-16">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedExp.chemicals || []).map((c, i) => (
                      <tr key={i} className="border-b last:border-none border-[#e8eadf] dark:border-[#3c452f] bg-white dark:bg-[#1a1d16]">
                        <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200">{c.chemicalName}</td>
                        <td className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">{c.quantityPerStudent || c.quantity || 1}</td>
                        <td className="px-3 py-2 text-gray-500">{c.unit || 'mL'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Student Details Card */}
            <div className="bg-[#fdfdf7] dark:bg-[#1f2419] p-3.5 rounded-xl border border-[#e8eadf] dark:border-[#3c452f] text-xs space-y-1">
              <p className="font-bold text-[#3c4e23] dark:text-[#eef4e8]">Student Requisition Details:</p>
              <div className="grid grid-cols-2 gap-2 pt-1 text-gray-600 dark:text-gray-300">
                <p>Name: <strong className="text-gray-800 dark:text-gray-100">{user?.name || 'Harsh Parmar'}</strong></p>
                <p>Roll No: <strong className="text-gray-800 dark:text-gray-100">{user?.rollNumber || 'RN-1001'}</strong></p>
                <p>Group: <strong className="text-gray-800 dark:text-gray-100">{user?.group || 'Group A'}</strong></p>
                <p>Lab: <strong className="text-gray-800 dark:text-gray-100">{currentLab.labName || currentLab.name || 'HAP1'}</strong></p>
              </div>
            </div>

            {/* Notes Textarea */}
            <div>
              <label className="text-xs font-bold text-[#3c4e23] dark:text-[#c8a030] uppercase tracking-wider mb-1 block">
                Additional Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes for Lab Admin..."
                className="w-full rounded-xl border border-[#cfd8bd] bg-white px-3 py-2 text-xs text-[#3c4e23] outline-none focus:ring-2 focus:ring-[#6f7d45] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8] h-20 resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setRequestModalOpen(false)}
                className="flex-1 py-2.5"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmRequest} 
                disabled={submitting}
                className="flex-1 bg-[#556b2f] hover:bg-[#435525] text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5"
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
        title="Duplicate Request Warning"
      >
        <div className="space-y-4 text-center py-2">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-base text-gray-800 dark:text-gray-100">
              You already have a pending request for this experiment!
            </h4>
            {duplicateInfo && (
              <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 p-3 rounded-xl text-xs font-mono border border-amber-200 dark:border-amber-800/40 mt-3 text-left space-y-1">
                <p><strong>Request ID:</strong> {duplicateInfo.requestId}</p>
                <p><strong>Submitted:</strong> {duplicateInfo.submittedAt}</p>
              </div>
            )}
          </div>
          <Button 
            onClick={() => setDuplicateModalOpen(false)}
            className="w-full bg-[#556b2f] text-white font-bold py-2.5 rounded-xl mt-4"
          >
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

            {activeRequestDetails.rejectionReason && (
              <div className="p-3 bg-rose-50 text-rose-800 rounded-xl border border-rose-200">
                <strong>Rejection Reason:</strong> {activeRequestDetails.rejectionReason}
              </div>
            )}

            <Button onClick={() => setDetailsModalOpen(false)} className="w-full bg-[#556b2f] text-white font-bold py-2 mt-2">
              Close
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
