import React, { useState, useEffect, useMemo } from 'react';
import useAuthStore from '../store/authStore';
import useAppStore from '../store/appStore';
import api from '../services/api';
import Modal from '../components/ui/Modal';
import { 
  Beaker, Plus, Clock, CheckCircle2, XCircle, Search, 
  Award, Activity, Sparkles, FlaskConical
} from 'lucide-react';

const COMMON_UNITS = ['g', 'mg', 'kg', 'mL', 'L'];

export default function PhDResearchDashboard() {
  const { user } = useAuthStore();
  const { setToast } = useAppStore();

  const [requests, setRequests] = useState([]);
  const [storeInventory, setStoreInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Form State for PhD Chemical Request
  const [formData, setFormData] = useState({
    chemicalName: '',
    casNumber: '',
    quantityRequested: '',
    unit: 'g',
    reason: '',
    projectThesisName: '',
    supervisorName: ''
  });

  const [chemicalSuggestions, setChemicalSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch student's direct research requests & store inventory for autocomplete
  const fetchPhDData = async () => {
    try {
      setLoading(true);
      const [reqRes, invRes] = await Promise.all([
        api.get('/store/requests'),
        api.get('/store/inventory')
      ]);
      
      const allReqs = reqRes.data || [];
      // Filter requests relevant to this PhD student
      const myReqs = allReqs.filter(r => 
        r.requestType === 'PhD Research' || 
        r.course === 'PhD' || 
        r.studentId === user?._id ||
        (r.studentName && user?.name && r.studentName.toLowerCase().includes(user.name.toLowerCase()))
      );
      
      setRequests(myReqs);
      setStoreInventory(invRes.data || []);
    } catch (err) {
      console.error('Failed to fetch PhD requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhDData();
  }, []);

  // Filter requests for display table
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        (req.chemicalName || '').toLowerCase().includes(q) ||
        (req.reason || '').toLowerCase().includes(q) ||
        (req.projectThesisName || '').toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'All' || req.status === statusFilter;
      return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(b.requestedAt || b.createdAt) - new Date(a.requestedAt || a.createdAt));
  }, [requests, searchQuery, statusFilter]);

  // Handle chemical input & suggestions
  const handleChemicalNameChange = (e) => {
    const val = e.target.value;
    setFormData(prev => ({ ...prev, chemicalName: val }));
    
    if (val.trim().length > 1) {
      const matches = storeInventory.filter(item => 
        (item.name || '').toLowerCase().includes(val.toLowerCase()) ||
        (item.cas || '').toLowerCase().includes(val.toLowerCase())
      );
      setChemicalSuggestions(matches.slice(0, 6));
      setShowSuggestions(true);
    } else {
      setChemicalSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectChemicalSuggestion = (item) => {
    setFormData(prev => ({
      ...prev,
      chemicalName: item.name || '',
      casNumber: item.cas || '',
      unit: item.unit === 'mL' || item.unit === 'L' ? 'mL' : 'g'
    }));
    setShowSuggestions(false);
  };

  // Submit direct PhD request to store
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.chemicalName || !formData.quantityRequested || !formData.reason) {
      setToast({ type: 'error', message: 'Please fill in all required fields (Chemical, Quantity, Purpose)' });
      return;
    }

    if (Number(formData.quantityRequested) <= 0) {
      setToast({ type: 'error', message: 'Quantity must be greater than 0' });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        chemicalName: formData.chemicalName,
        casNumber: formData.casNumber,
        quantityRequested: Number(formData.quantityRequested),
        unit: formData.unit,
        reason: formData.reason,
        projectThesisName: formData.projectThesisName,
        supervisorName: formData.supervisorName,
        requestType: 'PhD Research',
        course: 'PhD',
        labName: 'PhD Research Scholar',
        isPhDRequest: true
      };

      await api.post('/store/requests', payload);
      setToast({ type: 'success', message: 'Direct request submitted to Central Store Manager!' });
      setIsModalOpen(false);
      setFormData({
        chemicalName: '',
        casNumber: '',
        quantityRequested: '',
        unit: 'g',
        reason: '',
        projectThesisName: '',
        supervisorName: ''
      });
      fetchPhDData();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to send request' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stats
  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter(r => r.status === 'Pending').length;
    const approved = requests.filter(r => r.status === 'Approved').length;
    return { total, pending, approved };
  }, [requests]);

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-[#fdfdf7] dark:bg-[#141811] text-[#37412a] dark:text-[#e4e9d8] p-4 md:p-6 space-y-6 font-sans pb-20">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#cfd8bd] dark:border-[#38432a] pb-4">
        <div className="space-y-1 text-left">
          <h1 className="text-2xl font-black text-[#37412a] dark:text-[#e4e9d8] tracking-tight flex items-center gap-2">
            <span>Welcome back, {user?.name || 'PhD Scholar'}!</span>
            <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#5c6e46] dark:text-[#a8be8a]">
            <span className="bg-[#5c6e46] text-white px-2.5 py-0.5 rounded text-xs font-black uppercase tracking-wider flex items-center gap-1">
              <Award size={13} /> PhD Research Scholar
            </span>
            <span className="bg-white dark:bg-[#20251a] text-[#5c6e46] dark:text-[#a8be8a] px-2.5 py-0.5 rounded text-xs font-black border border-[#cfd8bd] dark:border-[#414a33]">
              Direct Central Store Access
            </span>
            <span className="text-[#87996c] dark:text-[#9fb384] font-semibold">{currentDate}</span>
          </div>
        </div>
      </div>

      {/* Prominent Mobile & Desktop Call-To-Action Banner (Crisp Squarish) */}
      <div className="w-full bg-[#fffef8] dark:bg-[#1a1d16] border-2 border-[#5c6e46] rounded-lg p-4 sm:p-5 text-[#37412a] dark:text-[#e4e9d8] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded border border-[#5c6e46] bg-[#f4f6ee] dark:bg-[#20251a] flex items-center justify-center shrink-0 text-[#5c6e46] dark:text-[#a8be8a]">
            <FlaskConical className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[#5c6e46] text-white text-[10px] font-black uppercase tracking-wider">
                Direct PhD Requisition
              </span>
              <span className="text-[11px] font-bold text-[#5c6e46] dark:text-[#a8be8a] hidden xs:inline">
                Skips Lab Admin
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black mt-1 text-[#37412a] dark:text-[#e4e9d8] leading-tight">
              Request Chemical Directly to Store Manager
            </h2>
            <p className="text-xs text-[#71805a] dark:text-[#a5b48b] mt-0.5 font-semibold">
              Submit your research synthesis requirements directly to the Central Store for fast issuance.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto shrink-0 px-5 py-2.5 bg-[#5c6e46] hover:bg-[#475735] text-white font-black text-xs rounded transition-all shadow-2xs flex items-center justify-center gap-2 uppercase tracking-wider"
        >
          <Plus size={16} /> New Chemical Request
        </button>
      </div>

      {/* 3 Stat Cards Grid (Space-Efficient Compact Layout) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Total Requisitions */}
        <div className="rounded-lg bg-white dark:bg-[#1a1d16] border border-[#cfd8bd] dark:border-[#414a33] p-4 shadow-2xs hover:shadow-md transition-all flex items-center gap-3.5">
          <div className="w-11 h-11 rounded border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Beaker className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider truncate">
              Total Requisitions
            </p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-2xl font-black text-[#37412a] dark:text-[#e4e9d8] leading-none">
                {stats.total}
              </span>
              <span className="text-[10px] font-bold text-indigo-800 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                Direct Store
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Pending Store */}
        <div className="rounded-lg bg-white dark:bg-[#1a1d16] border border-[#cfd8bd] dark:border-[#414a33] p-4 shadow-2xs hover:shadow-md transition-all flex items-center gap-3.5">
          <div className="w-11 h-11 rounded border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider truncate">
              Pending Store
            </p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400 leading-none">
                {stats.pending}
              </span>
              <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                Awaiting Manager
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Issued & Approved */}
        <div className="rounded-lg bg-white dark:bg-[#1a1d16] border border-[#cfd8bd] dark:border-[#414a33] p-4 shadow-2xs hover:shadow-md transition-all flex items-center gap-3.5">
          <div className="w-11 h-11 rounded border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider truncate">
              Issued & Approved
            </p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none">
                {stats.approved}
              </span>
              <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                Receipt Issued
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Section Container for Research Requisitions (Squarish Box) */}
      <div className="rounded-lg p-4 sm:p-5 bg-[#fffef8] dark:bg-[#1a1d16] border border-[#cfd8bd] dark:border-[#414a33] shadow-2xs space-y-5 text-left">
        
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#e4eed3] dark:border-[#2e3722]">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#5c6e46] dark:text-[#a8be8a] shrink-0" />
              <h2 className="text-xl font-black text-[#37412a] dark:text-[#e4e9d8]">
                My Direct Store Requisitions
              </h2>
            </div>
            <p className="text-xs text-[#71805a] dark:text-[#a5b48b] font-semibold">
              Real-time audit log of direct chemical requests submitted to the Central Store Manager
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#87996c]" />
              <input
                type="text"
                placeholder="Search chemical or purpose..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 w-full bg-white dark:bg-[#20251a] border border-[#cfd8bd] dark:border-[#414a33] text-xs font-bold text-[#37412a] dark:text-[#e4e9d8] rounded outline-none focus:border-[#5c6e46]"
              />
            </div>

            {/* Filter Tabs (Squarish Segmented Buttons) */}
            <div className="flex items-center gap-1 bg-[#f4f6ee] dark:bg-[#20251a] p-1 rounded border border-[#cfd8bd] dark:border-[#414a33]">
              {['All', 'Pending', 'Approved', 'Rejected'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded text-xs font-black transition-all border ${
                    statusFilter === st 
                      ? 'bg-[#5c6e46] text-white border-[#5c6e46]' 
                      : 'bg-white text-[#5c6e46] border-[#cfd8bd] hover:bg-[#e4eed3] dark:bg-[#1a1d16] dark:text-[#a8be8a] dark:border-[#414a33]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Requests List Cards */}
        {loading ? (
          <div className="p-8 text-center text-xs font-bold text-[#71805a]">Loading research requisitions...</div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-10 bg-[#fffef8] dark:bg-[#1a1d16] border border-dashed border-[#cfd8bd] dark:border-[#414a33] rounded text-center space-y-2.5">
            <div className="p-3 bg-[#f4f6ee] dark:bg-[#20251a] w-fit mx-auto rounded border border-[#cfd8bd] dark:border-[#414a33] text-[#5c6e46] dark:text-[#a8be8a]">
              <Beaker size={32} />
            </div>
            <h3 className="text-base font-black text-[#37412a] dark:text-[#e4e9d8]">No Requisitions Found</h3>
            <p className="text-xs font-semibold text-[#71805a] max-w-sm mx-auto">
              You haven't submitted any direct chemical requisitions to the Central Store yet. Click "New Chemical Request" to submit one!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map((req) => {
              const formattedDate = new Date(req.requestedAt || req.createdAt || Date.now()).toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric'
              });

              return (
                <div 
                  key={req._id || req.requestId}
                  className="bg-white dark:bg-[#1a1d16] border border-[#cfd8bd] dark:border-[#414a33] rounded p-4 space-y-3 transition-all"
                >
                  {/* Card Top Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#e4eed3] dark:border-[#2e3722]">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 text-[11px] font-black rounded border border-purple-300 dark:border-purple-800 uppercase tracking-wider flex items-center gap-1">
                        <Award size={11} /> PhD Direct Request
                      </span>
                      <span className="text-sm font-black text-[#37412a] dark:text-[#e4e9d8]">
                        {req.chemicalName}
                      </span>
                      {req.casNumber && (
                        <span className="text-[11px] font-mono font-bold text-[#71805a] bg-[#f4f6ee] dark:bg-[#20251a] px-2 py-0.5 rounded border border-[#cfd8bd] dark:border-[#414a33]">
                          CAS: {req.casNumber}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#71805a]">
                        {formattedDate}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-black border ${
                        req.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300' :
                        req.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-300' :
                        'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {req.status === 'Approved' ? <CheckCircle2 size={12} /> : req.status === 'Rejected' ? <XCircle size={12} /> : <Clock size={12} />}
                        {req.status}
                      </span>
                    </div>
                  </div>

                  {/* Card Main Info Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-semibold">
                    {/* Requested Qty & Unit */}
                    <div className="p-2.5 bg-[#f4f6ee] dark:bg-[#20251a] rounded border border-[#cfd8bd] dark:border-[#414a33]">
                      <span className="text-[10px] font-black text-[#5c6e46] dark:text-[#a8be8a] uppercase tracking-wider block">Requested Quantity</span>
                      <span className="font-mono text-xs font-black text-[#37412a] dark:text-[#e4e9d8] mt-0.5 block">
                        {req.quantityRequested || req.quantity} {req.unit}
                      </span>
                    </div>

                    {/* Thesis & Supervisor */}
                    <div className="p-2.5 bg-[#f4f6ee] dark:bg-[#20251a] rounded border border-[#cfd8bd] dark:border-[#414a33]">
                      <span className="text-[10px] font-black text-[#5c6e46] dark:text-[#a8be8a] uppercase tracking-wider block">Project / Thesis & Guide</span>
                      <span className="font-bold text-[#37412a] dark:text-[#e4e9d8] mt-0.5 block truncate">
                        {req.projectThesisName || 'Independent PhD Research'}
                      </span>
                      {req.supervisorName && (
                        <span className="text-[10px] text-[#71805a] font-semibold block mt-0.5">Guide: {req.supervisorName}</span>
                      )}
                    </div>

                    {/* Receipt Code */}
                    <div className="p-2.5 bg-[#f4f6ee] dark:bg-[#20251a] rounded border border-[#cfd8bd] dark:border-[#414a33]">
                      <span className="text-[10px] font-black text-[#5c6e46] dark:text-[#a8be8a] uppercase tracking-wider block">Store Receipt Code</span>
                      {req.receiptNumber ? (
                        <span className="font-mono text-xs font-black text-[#5c6e46] dark:text-[#a8be8a] mt-0.5 block">
                          {req.receiptNumber}
                        </span>
                      ) : (
                        <span className="text-xs text-amber-700 font-bold mt-0.5 block">Pending Store Issue</span>
                      )}
                    </div>
                  </div>

                  {/* Purpose Box */}
                  <div className="p-2.5 bg-[#fffef8] dark:bg-[#1a1d16] rounded border border-[#cfd8bd] dark:border-[#414a33] text-xs">
                    <span className="text-[10px] font-black text-[#5c6e46] dark:text-[#a8be8a] uppercase tracking-wider block mb-0.5">
                      Research Purpose / Reaction Objective:
                    </span>
                    <p className="text-xs font-bold text-[#37412a] dark:text-[#e4e9d8]">
                      {req.reason || 'Synthesize research practical compound.'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* NEW DIRECT PHD CHEMICAL REQUEST MODAL (Squarish Modal) */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Direct PhD Chemical Request to Central Store" panelClassName="max-w-xl w-full">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold text-[#37412a] dark:text-[#e4e9d8]">
          <div className="bg-[#f4f6ee] dark:bg-[#20251a] p-3 rounded border border-[#cfd8bd] dark:border-[#414a33] text-[11px] text-[#5c6e46] dark:text-[#a8be8a]">
            ℹ️ As a PhD Scholar, this requisition bypasses laboratory admin validation and is submitted <strong>directly to the Central Store Manager</strong>.
          </div>

          {/* Chemical Name with Auto-Suggest */}
          <div className="relative">
            <label className="block text-xs font-black text-[#5c6e46] mb-1">
              Chemical Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Silver Nitrate, Ethanol 99.9%, Sodium Hydroxide..."
              value={formData.chemicalName}
              onChange={handleChemicalNameChange}
              onFocus={() => formData.chemicalName && setShowSuggestions(true)}
              className="w-full p-2.5 rounded border border-[#cfd8bd] dark:border-[#414a33] bg-white dark:bg-[#1a1d16] text-xs font-bold outline-none focus:border-[#5c6e46]"
            />
            {showSuggestions && chemicalSuggestions.length > 0 && (
              <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white dark:bg-[#20251a] border border-[#cfd8bd] dark:border-[#414a33] rounded shadow-lg max-h-48 overflow-y-auto">
                {chemicalSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectChemicalSuggestion(item)}
                    className="w-full text-left p-2 hover:bg-[#f4f6ee] dark:hover:bg-[#2e3722] border-b border-[#e4eed3] dark:border-[#2e3722] last:border-0 flex justify-between items-center"
                  >
                    <div>
                      <div className="font-extrabold text-xs text-[#37412a] dark:text-[#e4e9d8]">{item.name}</div>
                      {item.cas && <div className="text-[10px] text-[#71805a]">CAS: {item.cas}</div>}
                    </div>
                    <span className="text-[10px] font-mono font-bold text-[#5c6e46] bg-[#f4f6ee] px-2 py-0.5 rounded border border-[#cfd8bd]">
                      Available: {item.availableQty} {item.unit}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CAS & Quantity + Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-black text-[#5c6e46] mb-1">CAS Number (Optional)</label>
              <input
                type="text"
                placeholder="e.g. 7761-88-8"
                value={formData.casNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, casNumber: e.target.value }))}
                className="w-full p-2.5 rounded border border-[#cfd8bd] dark:border-[#414a33] bg-white dark:bg-[#1a1d16] text-xs font-bold outline-none focus:border-[#5c6e46]"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-[#5c6e46] mb-1">
                Quantity <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="e.g. 100"
                value={formData.quantityRequested}
                onChange={(e) => setFormData(prev => ({ ...prev, quantityRequested: e.target.value }))}
                className="w-full p-2.5 rounded border border-[#cfd8bd] dark:border-[#414a33] bg-white dark:bg-[#1a1d16] text-xs font-bold outline-none focus:border-[#5c6e46]"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-[#5c6e46] mb-1">Unit</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                className="w-full p-2.5 rounded border border-[#cfd8bd] dark:border-[#414a33] bg-white dark:bg-[#1a1d16] text-xs font-bold outline-none focus:border-[#5c6e46]"
              >
                {COMMON_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Research Purpose */}
          <div>
            <label className="block text-xs font-black text-[#5c6e46] mb-1">
              Research Purpose / Synthesis Details <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="Detail the research thesis objective or reaction synthesis requirement..."
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              className="w-full p-2.5 rounded border border-[#cfd8bd] dark:border-[#414a33] bg-white dark:bg-[#1a1d16] text-xs font-bold outline-none focus:border-[#5c6e46]"
            />
          </div>

          {/* Optional Project & Supervisor Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#e4eed3] dark:border-[#2e3722]">
            <div>
              <label className="block text-xs font-black text-[#5c6e46] mb-1">Project / Thesis Title (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Nanoparticle Targeted Drug Delivery"
                value={formData.projectThesisName}
                onChange={(e) => setFormData(prev => ({ ...prev, projectThesisName: e.target.value }))}
                className="w-full p-2.5 rounded border border-[#cfd8bd] dark:border-[#414a33] bg-white dark:bg-[#1a1d16] text-xs font-bold outline-none focus:border-[#5c6e46]"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-[#5c6e46] mb-1">Supervisor / Guide Name (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Dr. Omprakash Tanwar"
                value={formData.supervisorName}
                onChange={(e) => setFormData(prev => ({ ...prev, supervisorName: e.target.value }))}
                className="w-full p-2.5 rounded border border-[#cfd8bd] dark:border-[#414a33] bg-white dark:bg-[#1a1d16] text-xs font-bold outline-none focus:border-[#5c6e46]"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#e4eed3] dark:border-[#2e3722]">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded text-xs font-extrabold border border-[#cfd8bd] hover:bg-[#f4f6ee] text-[#5c6e46]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded text-xs font-black bg-[#5c6e46] text-white hover:bg-[#475735] shadow-2xs disabled:opacity-50"
            >
              {isSubmitting ? 'Sending Request...' : 'Submit to Store Manager'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
