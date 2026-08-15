import React, { useState, useEffect, useMemo } from 'react';
import useAuthStore from '../store/authStore';
import useAppStore from '../store/appStore';
import api from '../services/api';
import Modal from '../components/ui/Modal';
import { 
  Beaker, Plus, Clock, CheckCircle2, XCircle, Search, 
  BookOpen, User, Award, ShieldAlert, FileText, Check, Download,
  Activity, ArrowUpRight, Sparkles, ChevronRight, Layers
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
    <div className="min-h-screen bg-[#f7f9f2] dark:bg-[#141711] text-[#2c3320] dark:text-[#eef4e8] p-4 md:p-8 space-y-8 font-sans pb-24 transition-colors duration-300">
      
      {/* Premium Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#e4ebda] dark:border-[#2a3321] pb-5">
        <div className="space-y-1 text-left">
          <h1 className="text-2xl sm:text-3xl font-black text-[#3c4e23] dark:text-[#eef4e8] tracking-tight flex items-center gap-2">
            <span>Welcome back, {user?.name || 'PhD Scholar'}!</span>
            <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#71805a] dark:text-[#c5d0b5]">
            <span className="bg-[#556b2f] text-white px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
              <Award size={13} /> PhD Research Scholar
            </span>
            <span className="bg-[#eef4e4] dark:bg-[#28301f] text-[#556b2f] dark:text-[#c5d0b5] px-2.5 py-0.5 rounded-full text-xs font-bold border border-[#d5e0c2] dark:border-[#38432a]">
              Direct Central Store Access
            </span>
            <span className="text-[#87996c] dark:text-[#9fb384] font-medium">{currentDate}</span>
          </div>
        </div>
      </div>

      {/* Styled Gradient Banner Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#2e3d19] via-[#3c4e23] to-[#556b2f] p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none hidden md:block">
          <Beaker className="w-48 h-48 text-white" />
        </div>
        <div className="relative z-10 space-y-3 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 bg-[#c8a030] text-black text-xs font-black rounded-full uppercase tracking-wider shadow-sm">
              Higher Scholar Portal
            </span>
            <span className="px-3 py-1 bg-white/20 text-white text-xs font-extrabold rounded-full backdrop-blur-sm">
              Bypasses Lab Admin Verification
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black leading-tight">
            Direct Central Store Requisition
          </h2>
          <p className="text-xs sm:text-sm font-medium text-emerald-100/90 leading-relaxed">
            As a PhD Scholar, your chemical requests bypass intermediate laboratory quotas and are routed <strong>directly to the Central Store Manager</strong> for immediate issuance and receipt logging.
          </p>
        </div>
      </div>

      {/* Structured Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Action Button Card */}
        <div className="relative overflow-hidden p-5 rounded-2xl bg-white dark:bg-[#1c2117] border-2 border-[#556b2f]/30 dark:border-[#c8a030]/30 shadow-md hover:shadow-lg transition-all flex flex-col justify-between space-y-3">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#556b2f]"></div>
          <div>
            <span className="text-[11px] font-black text-[#556b2f] dark:text-[#c8a030] uppercase tracking-wider">Direct Action</span>
            <h3 className="text-base font-black text-[#3c4e23] dark:text-[#eef4e8] mt-0.5">Request Chemical</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">Direct requisition to Central Store</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full py-2.5 px-4 bg-[#556b2f] hover:bg-[#3c4e23] text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-md hover:scale-[1.02]"
          >
            <Plus size={16} /> New Direct Request
          </button>
        </div>

        {/* Card 1: Total Requests */}
        <div className="relative overflow-hidden p-5 rounded-2xl bg-white dark:bg-[#1c2117] border border-[#e4ebda] dark:border-[#38432a] shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-3">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500"></div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400 shrink-0">
            <Beaker className="w-5 h-5" />
          </div>
          <div className="flex-1 text-right">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
              Total Requests
            </p>
            <p className="text-2xl font-black text-[#3c4e23] dark:text-[#eef4e8] leading-none">
              {stats.total}
            </p>
            <p className="text-[10px] font-bold text-gray-400 mt-1">Direct Requisitions</p>
          </div>
        </div>

        {/* Card 2: Pending Store */}
        <div className="relative overflow-hidden p-5 rounded-2xl bg-white dark:bg-[#1c2117] border border-[#e4ebda] dark:border-[#38432a] shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-3">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-600 dark:text-amber-400 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="flex-1 text-right">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
              Pending Store
            </p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 leading-none">
              {stats.pending}
            </p>
            <p className="text-[10px] font-bold text-amber-600/80 mt-1">Awaiting Manager</p>
          </div>
        </div>

        {/* Card 3: Approved */}
        <div className="relative overflow-hidden p-5 rounded-2xl bg-white dark:bg-[#1c2117] border border-[#e4ebda] dark:border-[#38432a] shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-3">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500"></div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1 text-right">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">
              Issued & Approved
            </p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none">
              {stats.approved}
            </p>
            <p className="text-[10px] font-bold text-emerald-600/80 mt-1">With Receipt Code</p>
          </div>
        </div>
      </div>

      {/* Border Divider */}
      <div className="w-full my-6 border-t-2 border-dashed border-[#dce5cc] dark:border-[#333d26]"></div>

      {/* Main Section Container for Research Requisitions */}
      <div className="rounded-3xl p-5 sm:p-7 bg-[#fcfdfa] dark:bg-[#181d13] border-2 border-[#d0dcb8] dark:border-[#38432a] shadow-lg shadow-[#556b2f]/5 space-y-6 text-left">
        
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b-2 border-[#e4ebda] dark:border-[#38432a]">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <Activity className="w-6 h-6 text-[#556b2f] dark:text-[#c8a030] shrink-0" />
              <h2 className="text-2xl sm:text-3xl font-black text-[#3c4e23] dark:text-[#c8a030] tracking-tight">
                My Direct Store Requisitions
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">
              Real-time audit log of direct chemical requests submitted to the Central Store Manager
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search chemical or purpose..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-3 py-2 w-full bg-white dark:bg-[#141711] border-2 border-[#cfd8bd] dark:border-[#4e5d35] text-xs font-bold text-[#3c4e23] dark:text-[#eef4e8] rounded-xl outline-none"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-[#f0f4e8] dark:bg-[#20251a] p-1 rounded-xl border border-[#cfd8bd] dark:border-[#38432a]">
              {['All', 'Pending', 'Approved', 'Rejected'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    statusFilter === st 
                      ? 'bg-[#556b2f] text-white shadow-sm' 
                      : 'text-[#556b2f] hover:bg-[#e4eed3] dark:text-[#a8be8a]'
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
          <div className="p-12 bg-white dark:bg-[#1c2117] border border-dashed border-[#d9e1ca] dark:border-[#414a33] rounded-2xl text-center space-y-3">
            <div className="p-4 bg-[#f4f6ee] dark:bg-[#28301f] w-fit mx-auto rounded-2xl text-[#556b2f] dark:text-[#c8a030]">
              <Beaker size={36} />
            </div>
            <h3 className="text-lg font-bold text-[#3c4e23] dark:text-[#eef4e8]">No Requisitions Found</h3>
            <p className="text-xs font-medium text-gray-500 max-w-sm mx-auto">
              You haven't submitted any direct chemical requisitions to the Central Store yet. Click "New Direct Request" to submit one!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((req) => {
              const formattedDate = new Date(req.requestedAt || req.createdAt || Date.now()).toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric'
              });

              return (
                <div 
                  key={req._id || req.requestId}
                  className="bg-white dark:bg-[#1c2117] border-2 border-[#b8c99d] dark:border-[#4a5836] shadow-md rounded-2xl p-5 space-y-4 transition-all"
                >
                  {/* Card Top Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#f0f2eb] dark:border-[#28301f]">
                    <div className="flex items-center gap-2.5">
                      <span className="px-3 py-1 bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 text-xs font-black rounded-lg border border-purple-200 uppercase tracking-wider flex items-center gap-1">
                        <Award size={12} /> PhD Direct Request
                      </span>
                      <span className="text-base font-extrabold text-[#3c4e23] dark:text-[#eef4e8]">
                        {req.chemicalName}
                      </span>
                      {req.casNumber && (
                        <span className="text-xs font-mono font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                          CAS: {req.casNumber}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-gray-500">
                        {formattedDate}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black border ${
                        req.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300' :
                        req.status === 'Rejected' ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300' :
                        'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {req.status === 'Approved' ? <CheckCircle2 size={13} /> : req.status === 'Rejected' ? <XCircle size={13} /> : <Clock size={13} />}
                        {req.status}
                      </span>
                    </div>
                  </div>

                  {/* Card Main Info Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    {/* Requested Qty & Unit */}
                    <div className="p-3 bg-[#fcfdfa] dark:bg-[#141711] rounded-xl border border-[#e4ebda] dark:border-[#2f3823]">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Requested Quantity</span>
                      <span className="font-mono text-sm font-black text-[#556b2f] dark:text-[#c8a030] mt-0.5 block">
                        {req.quantityRequested || req.quantity} {req.unit}
                      </span>
                    </div>

                    {/* Thesis & Supervisor */}
                    <div className="p-3 bg-[#fcfdfa] dark:bg-[#141711] rounded-xl border border-[#e4ebda] dark:border-[#2f3823]">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Project / Thesis & Guide</span>
                      <span className="font-bold text-[#3c4e23] dark:text-[#eef4e8] mt-0.5 block truncate">
                        {req.projectThesisName || 'Independent PhD Research'}
                      </span>
                      {req.supervisorName && (
                        <span className="text-[10px] text-gray-500 font-medium block mt-0.5">Guide: {req.supervisorName}</span>
                      )}
                    </div>

                    {/* Receipt Code */}
                    <div className="p-3 bg-[#fcfdfa] dark:bg-[#141711] rounded-xl border border-[#e4ebda] dark:border-[#2f3823]">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Store Receipt Code</span>
                      {req.receiptNumber ? (
                        <span className="font-mono text-sm font-black text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                          {req.receiptNumber}
                        </span>
                      ) : (
                        <span className="text-xs text-amber-600 font-bold mt-0.5 block">Pending Store Issue</span>
                      )}
                    </div>
                  </div>

                  {/* Purpose Box */}
                  <div className="p-3 bg-[#f8faee] dark:bg-[#20251a] rounded-xl border border-[#e4eed3] dark:border-[#38432a] text-xs">
                    <span className="text-[10px] font-black text-[#556b2f] dark:text-[#c8a030] uppercase tracking-wider block mb-1">
                      Research Purpose / Reaction Objective:
                    </span>
                    <p className="text-xs font-semibold text-[#3c4e23] dark:text-[#eef4e8]">
                      {req.reason || 'Synthesize research practical compound.'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* NEW DIRECT PHD CHEMICAL REQUEST MODAL */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Direct PhD Chemical Request to Central Store" panelClassName="max-w-xl w-full">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold text-[#37412a] dark:text-[#e4e9d8]">
          <div className="bg-[#f4f6ee] dark:bg-[#20251a] p-3 rounded.xl border border-[#cfd8bd] dark:border-[#414a33] text-[11px] text-[#556b2f] dark:text-[#a8be8a]">
            ℹ️ As a PhD Scholar, this requisition bypasses laboratory admin validation and is submitted <strong>directly to the Central Store Manager</strong>.
          </div>

          {/* Chemical Name with Auto-Suggest */}
          <div className="relative">
            <label className="block text-xs font-black text-[#556b2f] mb-1">
              Chemical Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Silver Nitrate, Ethanol 99.9%, Sodium Hydroxide..."
              value={formData.chemicalName}
              onChange={handleChemicalNameChange}
              onFocus={() => formData.chemicalName && setShowSuggestions(true)}
              className="w-full p-3 rounded-xl border-2 border-[#cfd8bd] dark:border-[#414a33] bg-white dark:bg-[#1a1d16] text-xs font-bold outline-none focus:border-[#556b2f]"
            />
            {showSuggestions && chemicalSuggestions.length > 0 && (
              <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white dark:bg-[#20251a] border-2 border-[#cfd8bd] dark:border-[#414a33] rounded-xl shadow-xl max-h-48 overflow-y-auto">
                {chemicalSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectChemicalSuggestion(item)}
                    className="w-full text-left p-2.5 hover:bg-[#f4f6ee] dark:hover:bg-[#2e3722] border-b border-[#e4eed3] dark:border-[#2e3722] last:border-0 flex justify-between items-center"
                  >
                    <div>
                      <div className="font-extrabold text-xs text-[#37412a] dark:text-[#e4e9d8]">{item.name}</div>
                      {item.cas && <div className="text-[10px] text-[#71805a]">CAS: {item.cas}</div>}
                    </div>
                    <span className="text-[10px] font-mono font-bold text-[#556b2f] bg-[#f4f6ee] px-2 py-0.5 rounded-lg border border-[#cfd8bd]">
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
              <label className="block text-xs font-black text-[#556b2f] mb-1">CAS Number (Optional)</label>
              <input
                type="text"
                placeholder="e.g. 7761-88-8"
                value={formData.casNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, casNumber: e.target.value }))}
                className="w-full p-3 rounded-xl border-2 border-[#cfd8bd] dark:border-[#414a33] bg-white dark:bg-[#1a1d16] text-xs font-bold outline-none focus:border-[#556b2f]"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-[#556b2f] mb-1">
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
                className="w-full p-3 rounded-xl border-2 border-[#cfd8bd] dark:border-[#414a33] bg-white dark:bg-[#1a1d16] text-xs font-bold outline-none focus:border-[#556b2f]"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-[#556b2f] mb-1">Unit</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                className="w-full p-3 rounded-xl border-2 border-[#cfd8bd] dark:border-[#414a33] bg-white dark:bg-[#1a1d16] text-xs font-bold outline-none focus:border-[#556b2f]"
              >
                {COMMON_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Research Purpose */}
          <div>
            <label className="block text-xs font-black text-[#556b2f] mb-1">
              Research Purpose / Synthesis Details <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="Detail the research thesis objective or reaction synthesis requirement..."
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              className="w-full p-3 rounded-xl border-2 border-[#cfd8bd] dark:border-[#414a33] bg-white dark:bg-[#1a1d16] text-xs font-bold outline-none focus:border-[#556b2f]"
            />
          </div>

          {/* Optional Project & Supervisor Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#e4eed3] dark:border-[#2e3722]">
            <div>
              <label className="block text-xs font-black text-[#556b2f] mb-1">Project / Thesis Title (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Nanoparticle Targeted Drug Delivery"
                value={formData.projectThesisName}
                onChange={(e) => setFormData(prev => ({ ...prev, projectThesisName: e.target.value }))}
                className="w-full p-3 rounded-xl border-2 border-[#cfd8bd] dark:border-[#414a33] bg-white dark:bg-[#1a1d16] text-xs font-bold outline-none focus:border-[#556b2f]"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-[#556b2f] mb-1">Supervisor / Guide Name (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Dr. Omprakash Tanwar"
                value={formData.supervisorName}
                onChange={(e) => setFormData(prev => ({ ...prev, supervisorName: e.target.value }))}
                className="w-full p-3 rounded-xl border-2 border-[#cfd8bd] dark:border-[#414a33] bg-white dark:bg-[#1a1d16] text-xs font-bold outline-none focus:border-[#556b2f]"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#e4eed3] dark:border-[#2e3722]">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-extrabold border border-[#cfd8bd] hover:bg-[#f4f6ee] text-[#556b2f]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#556b2f] text-white hover:bg-[#3c4e23] shadow-md disabled:opacity-50"
            >
              {isSubmitting ? 'Sending Request...' : 'Submit to Store Manager'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
