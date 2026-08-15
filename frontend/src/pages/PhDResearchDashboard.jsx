import React, { useState, useEffect, useMemo } from 'react';
import useAuthStore from '../store/authStore';
import useAppStore from '../store/appStore';
import api from '../services/api';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import { 
  Beaker, Plus, Clock, CheckCircle2, XCircle, Search, 
  BookOpen, User, Award, ShieldAlert, FileText, Check, Download
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
      const matchesSearch = 
        (req.chemicalName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (req.reason || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (req.projectThesisName || '').toLowerCase().includes(searchQuery.toLowerCase());
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
      setToast({ type: 'success', message: 'Request sent directly to Central Store Manager!' });
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner: Direct Store Access for PhD Scholars */}
      <div className="rounded-xl border border-[#cfd8bd] bg-gradient-to-r from-[#3c4e23] via-[#4d632c] to-[#5c6e46] p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-4 bottom-2 opacity-15 pointer-events-none hidden md:block">
          <Award size={140} />
        </div>
        <div className="relative z-10 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-0.5 rounded-full bg-[#c8a030] text-black text-xs font-black uppercase tracking-wider shadow-2xs">
              PhD & Higher Scholar Portal
            </span>
            <span className="px-3 py-0.5 rounded-full bg-white/20 text-white text-xs font-bold">
              Direct Central Store Access
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Welcome, {user?.name || 'PhD Scholar'}
          </h1>
          <p className="text-xs sm:text-sm font-medium text-emerald-100 max-w-2xl">
            As a PhD / Higher Research Scholar, your chemical requests bypass laboratory limits and are routed <strong>directly to the Central Store Manager</strong> for fast approval and issuance.
          </p>
        </div>
      </div>

      {/* Direct Action & Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Big Action Box */}
        <div className="md:col-span-1 bg-[#fffef8] dark:bg-[#1a1d16] border border-[#cfd8bd] dark:border-[#414a33] rounded-xl p-4 flex flex-col justify-between shadow-2xs">
          <div>
            <div className="text-xs font-black text-[#5c6e46] uppercase tracking-wider mb-1">Direct Requisition</div>
            <div className="text-base font-black text-[#37412a] dark:text-[#e4e9d8]">Request Chemical to Store</div>
            <p className="text-[11px] font-semibold text-[#71805a] mt-1">Direct submission to Central Store Manager</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 w-full py-2.5 px-4 bg-[#5c6e46] hover:bg-[#475735] text-white rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 shadow-2xs"
          >
            <Plus size={16} /> New Direct Request
          </button>
        </div>

        {/* Stat Cards */}
        <div className="bg-[#fffef8] dark:bg-[#1a1d16] border border-[#cfd8bd] dark:border-[#414a33] rounded-xl p-4 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-xs font-black text-[#71805a] uppercase">Total Requests</span>
            <div className="text-2xl font-black text-[#37412a] dark:text-[#e4e9d8] mt-1">{stats.total}</div>
            <span className="text-[11px] font-bold text-[#87996c]">Direct Store Requisitions</span>
          </div>
          <div className="p-3 rounded-lg bg-[#f4f6ee] dark:bg-[#20251a] text-[#5c6e46]">
            <Beaker size={24} />
          </div>
        </div>

        <div className="bg-[#fffef8] dark:bg-[#1a1d16] border border-[#cfd8bd] dark:border-[#414a33] rounded-xl p-4 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase">Pending Store</span>
            <div className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">{stats.pending}</div>
            <span className="text-[11px] font-bold text-amber-600/80">Awaiting Store Manager</span>
          </div>
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600">
            <Clock size={24} />
          </div>
        </div>

        <div className="bg-[#fffef8] dark:bg-[#1a1d16] border border-[#cfd8bd] dark:border-[#414a33] rounded-xl p-4 flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase">Approved</span>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">{stats.approved}</div>
            <span className="text-[11px] font-bold text-emerald-600/80">Issued with Receipt</span>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
        </div>
      </div>

      {/* Main Request History Table Section */}
      <div className="bg-[#fffef8] dark:bg-[#1a1d16] border border-[#cfd8bd] dark:border-[#414a33] rounded-xl shadow-2xs p-4 space-y-4">
        {/* Header Controls */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pb-3 border-b border-[#e4eed3] dark:border-[#2e3722]">
          <div className="flex items-center gap-2">
            <Beaker className="text-[#5c6e46]" size={20} />
            <h2 className="text-base font-black text-[#37412a] dark:text-[#e4e9d8]">My Direct Store Requisitions</h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#87996c]" size={14} />
              <input
                type="text"
                placeholder="Search chemical or purpose..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded border border-[#cfd8bd] dark:border-[#414a33] bg-white dark:bg-[#20251a] text-xs font-bold text-[#37412a] dark:text-[#e4e9d8] outline-none"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-[#f4f6ee] dark:bg-[#20251a] p-1 rounded border border-[#cfd8bd] dark:border-[#414a33]">
              {['All', 'Pending', 'Approved', 'Rejected'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded text-xs font-black transition-all ${
                    statusFilter === st 
                      ? 'bg-[#5c6e46] text-white shadow-2xs' 
                      : 'text-[#5c6e46] hover:bg-[#e4eed3] dark:text-[#a8be8a]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Requests Table */}
        <div className="overflow-x-auto border border-[#e4eed3] dark:border-[#2e3722] rounded-lg">
          {loading ? (
            <div className="p-8 text-center text-xs font-bold text-[#71805a]">Loading store requisitions...</div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Beaker size={36} className="mx-auto text-[#87996c] opacity-60" />
              <div className="text-sm font-black text-[#37412a] dark:text-[#e4e9d8]">No Research Requisitions Found</div>
              <p className="text-xs font-semibold text-[#71805a]">
                Submit your first direct chemical request to the Central Store Manager!
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f4f6ee] dark:bg-[#20251a] text-[#5c6e46] dark:text-[#a8be8a] text-[11px] font-black uppercase tracking-wider border-b border-[#e4eed3]">
                  <th className="p-3">Chemical & CAS</th>
                  <th className="p-3">Requested Qty</th>
                  <th className="p-3">Research Purpose</th>
                  <th className="p-3">Project / Supervisor</th>
                  <th className="p-3">Date Sent</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Receipt Code</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4eed3] dark:divide-[#2e3722] text-xs font-bold text-[#37412a] dark:text-[#e4e9d8]">
                {filteredRequests.map((req) => (
                  <tr key={req._id || req.requestId} className="hover:bg-[#fcfdf8] dark:hover:bg-[#20251a]/50">
                    <td className="p-3">
                      <div className="font-black text-sm text-[#37412a] dark:text-[#e4e9d8]">{req.chemicalName}</div>
                      {req.casNumber && <div className="text-[10px] font-mono text-[#71805a]">CAS: {req.casNumber}</div>}
                    </td>
                    <td className="p-3">
                      <span className="px-2.5 py-1 rounded bg-[#f4f6ee] dark:bg-[#20251a] border border-[#cfd8bd] text-[#5c6e46] font-mono font-black">
                        {req.quantityRequested || req.quantity} {req.unit}
                      </span>
                    </td>
                    <td className="p-3 max-w-xs truncate" title={req.reason}>
                      {req.reason || 'Research practical work'}
                    </td>
                    <td className="p-3">
                      <div className="text-xs font-extrabold">{req.projectThesisName || 'Independent Research'}</div>
                      {req.supervisorName && <div className="text-[10px] text-[#71805a]">Guide: {req.supervisorName}</div>}
                    </td>
                    <td className="p-3 text-[11px] text-[#71805a]">
                      {new Date(req.requestedAt || req.createdAt || Date.now()).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-black border ${
                        req.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300' :
                        req.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-300' :
                        'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {req.status === 'Approved' ? <CheckCircle2 size={12} /> : req.status === 'Rejected' ? <XCircle size={12} /> : <Clock size={12} />}
                        {req.status}
                      </span>
                    </td>
                    <td className="p-3">
                      {req.receiptNumber ? (
                        <span className="font-mono text-xs font-black text-[#5c6e46] dark:text-[#a8be8a]">
                          {req.receiptNumber}
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400 font-semibold">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* NEW DIRECT PHD CHEMICAL REQUEST MODAL */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Direct Chemical Request to Central Store" panelClassName="max-w-xl w-full">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold text-[#37412a] dark:text-[#e4e9d8]">
          <div className="bg-[#f4f6ee] dark:bg-[#20251a] p-3 rounded border border-[#cfd8bd] dark:border-[#414a33] text-[11px] text-[#5c6e46] dark:text-[#a8be8a]">
            ℹ️ This request skips lab admin validation and is submitted <strong>directly to the Central Store Manager</strong>.
          </div>

          {/* Chemical Name with Auto-Suggest */}
          <div className="relative">
            <label className="block text-xs font-black text-[#5c6e46] mb-1">
              Chemical Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Silver Nitrate, Ethanol, Sodium Hydroxide..."
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
                      <div className="font-bold text-xs text-[#37412a] dark:text-[#e4e9d8]">{item.name}</div>
                      {item.cas && <div className="text-[10px] text-[#71805a]">CAS: {item.cas}</div>}
                    </div>
                    <span className="text-[10px] font-mono text-[#5c6e46] bg-[#f4f6ee] px-2 py-0.5 rounded">
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
              className="px-5 py-2 rounded text-xs font-black bg-[#5c6e46] text-white hover:bg-[#475735] disabled:opacity-50"
            >
              {isSubmitting ? 'Sending Request...' : 'Submit to Store Manager'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
