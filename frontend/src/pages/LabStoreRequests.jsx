import { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Filter, FileText, CheckCircle2, Clock, XCircle, FileDown, Eye, AlertCircle, Calendar, FlaskConical, ChevronRight, Layers } from 'lucide-react';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import useAppStore from '../store/appStore';
import { toFrontendRequest } from '../utils/storeMapper';
import StoreRequestReceiptModal from '../components/StoreRequestReceiptModal';

const UNIT_OPTIONS = ['ml', 'L', 'g', 'kg', 'mg', 'pcs', 'bottles', 'boxes', 'vials', 'packs', 'UNT'];

export default function LabStoreRequests() {
  const user = useAuthStore((state) => state.user);
  const labName = user?.labName || 'Pharmacy Lab';
  
  const [selectedLabId, setSelectedLabId] = useState(() => localStorage.getItem('pharmlab-active-lab') || '');
  
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const { inventory, smartInventory, fetchSmartInventory, createLabStoreRequest, setToast, labs, fetchLabs } = useAppStore();
  
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewReceipt, setPreviewReceipt] = useState(null);

  // Assigned labs
  const assignedLabs = useMemo(() => {
    const uid = String(user?.id || user?._id || '');
    const email = (user?.email || '').toLowerCase();
    const userLabId = String(user?.labId?._id || user?.labId || '');
    return (labs || []).filter((lab) => {
      const labId = String(lab.id || lab._id);
      const isAdmin = Array.isArray(lab.admins) && lab.admins.some((a) => {
        const aId = String(a.id || a._id || a);
        const aEmail = (a.email || '').toLowerCase();
        return (uid && aId === uid) || (email && aEmail === email);
      });
      return isAdmin || (userLabId && userLabId === labId);
    });
  }, [labs, user]);

  useEffect(() => {
    fetchLabs();
  }, []);

  useEffect(() => {
    if (!assignedLabs.length) return;
    const validSelection = assignedLabs.some((lab) => String(lab.id || lab._id) === String(selectedLabId));
    if (!selectedLabId || !validSelection) {
      const nextLabId = String(assignedLabs[0].id || assignedLabs[0]._id);
      setSelectedLabId(nextLabId);
      localStorage.setItem('pharmlab-active-lab', nextLabId);
    }
  }, [assignedLabs, selectedLabId]);

  const activeLab = assignedLabs.find((lab) => String(lab.id || lab._id) === String(selectedLabId)) || assignedLabs[0] || (labs || [])[0];
  const activeLabId = activeLab?.id || activeLab?._id || '';

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/store/requests/my');
      setRequests((res.data || []).map(toFrontendRequest));
    } catch (err) {
      // Fallback request loading
      try {
        const resAlt = await api.get('/lab/requests');
        setRequests((resAlt.data || []).map(toFrontendRequest));
      } catch (e) {
        setToast({ type: 'error', message: 'Failed to fetch store requests' });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    if (activeLabId) {
      if (fetchSmartInventory) fetchSmartInventory(activeLabId);
    }
  }, [activeLabId]);

  // Clean Store Request Form State (4 Fields: Chemical Name, CAS Number, Quantity, Unit)
  const [formData, setFormData] = useState({
    chemicalName: '',
    casNumber: '',
    quantity: '',
    unit: 'g'
  });

  // Filter requests for the active lab
  const labRequests = useMemo(() => {
    if (!requests.length) return [];
    if (!activeLabId) return requests;
    return requests.filter(r => {
      const reqLabId = String(r.labId || r._raw?.labId?._id || r._raw?.labId || '');
      const reqLabName = (r.lab || r.labName || '').toLowerCase();
      const currentLabName = (activeLab?.name || activeLab?.labName || labName || '').toLowerCase();
      return (
        (reqLabId && reqLabId === String(activeLabId)) ||
        (reqLabName && reqLabName === currentLabName) ||
        !reqLabId
      );
    });
  }, [requests, activeLabId, activeLab, labName]);
  
  const filteredRequests = useMemo(() => {
    return labRequests.filter(req => {
      const matchesSearch = !search || 
        req.chemicalName.toLowerCase().includes(search.toLowerCase()) || 
        (req.casNumber || '').toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === 'All' || req.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [labRequests, search, filter]);

  // Low stock reorder suggestions
  const lowStockItems = useMemo(() => {
    return (inventory || []).filter(item => Number(item.quantity || 0) <= Number(item.minThreshold || 5));
  }, [inventory]);

  const stats = [
    { label: 'Total Requests', value: labRequests.length, icon: FileText, color: 'text-[#37412a] dark:text-[#e4e9d8]', bg: 'bg-[#f4f6ee] dark:bg-[#28301f]' },
    { label: 'Pending', value: labRequests.filter(r => r.status === 'Pending').length, icon: Clock, color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { label: 'Approved', value: labRequests.filter(r => r.status === 'Approved').length, icon: CheckCircle2, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { label: 'Low Stock Alerts', value: lowStockItems.length, icon: AlertCircle, color: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-900/30' }
  ];

  const handleQuickReorder = (item) => {
    setFormData({
      chemicalName: item.chemicalName || item.itemName || '',
      casNumber: item.casNumber || '',
      quantity: String(item.minThreshold ? item.minThreshold * 2 : 100),
      unit: item.unit || item.quantityUnit || 'g'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.chemicalName.trim() || !formData.quantity) {
      setToast({ type: 'error', message: 'Please enter chemical name and quantity.' });
      return;
    }

    setSubmitting(true);
    try {
      if (createLabStoreRequest) {
        await createLabStoreRequest({
          chemicalName: formData.chemicalName.trim(),
          casNumber: formData.casNumber.trim(),
          quantityRequested: String(formData.quantity),
          unit: formData.unit,
          labId: activeLabId,
          labName: activeLab?.name || activeLab?.labName || labName
        });
      } else {
        await api.post('/store/requests', {
          chemicalName: formData.chemicalName.trim(),
          casNumber: formData.casNumber.trim(),
          quantityRequested: Number(formData.quantity),
          unit: formData.unit,
          labId: activeLabId,
          labName: activeLab?.name || activeLab?.labName || labName
        });
      }
      setToast({ type: 'success', message: `Store request submitted for ${formData.chemicalName}` });
      setIsModalOpen(false);
      setFormData({ chemicalName: '', casNumber: '', quantity: '', unit: 'g' });
      fetchRequests();
    } catch (err) {
      setToast({ type: 'error', message: err?.response?.data?.message || 'Failed to submit request to Central Store.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleBatchRequestAllMissing = async () => {
    if (!smartInventory || !smartInventory.chemicals) return;
    const missing = smartInventory.chemicals.filter(c => c.status === 'Not Available' || c.status === 'Low');
    if (!missing.length) return;

    try {
      if (createLabStoreRequest) {
        const promises = missing.map(c => {
          const shortage = Math.max(0, c.quantityPerStudent - (c.labStock || 0));
          if (shortage <= 0) return null;
          return createLabStoreRequest({
            chemicalName: c.chemicalName,
            casNumber: c.casNumber || '',
            quantityRequested: String(shortage),
            unit: c.unit || 'g',
            labId: activeLabId
          });
        }).filter(Boolean);
        
        await Promise.all(promises);
        setToast({ type: 'success', message: `Requested ${promises.length} missing chemicals from Central Store` });
        fetchRequests();
      }
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to batch request missing chemicals' });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header & Lab Switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#e4eed3] pb-4 dark:border-[#2e3722]">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#87996c] dark:text-[#7a8f62]">
            <span>Pharma Laboratory</span>
            <ChevronRight size={12} />
            <span className="text-[#5c6e46] dark:text-[#a8be8a] font-bold">Central Store Requisitions</span>
          </div>
          <h1 className="text-2xl font-black text-[#37412a] dark:text-[#e4e9d8] mt-0.5 flex items-center gap-2">
            <FlaskConical size={24} className="text-[#5c6e46]" />
            Store Requisitions
          </h1>
          <p className="text-[#71805a] dark:text-[#c5d0b5] text-xs font-semibold">
            Manage &amp; request chemical stock replenishment from Central Store for <strong className="text-[#37412a] dark:text-[#e4e9d8]">{activeLab?.name || activeLab?.labName || 'HAP1'}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {assignedLabs.length > 1 && (
            <div className="flex items-center gap-1.5 mr-2">
              <span className="text-xs font-extrabold text-[#71805a] dark:text-[#a5b48b] flex items-center gap-1">
                <Layers size={13} /> Switch Lab:
              </span>
              {assignedLabs.map((lab) => {
                const labKey = String(lab.id || lab._id);
                const isSelected = labKey === String(activeLabId);
                return (
                  <button
                    key={labKey}
                    type="button"
                    onClick={() => {
                      setSelectedLabId(labKey);
                      localStorage.setItem('pharmlab-active-lab', labKey);
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all border ${
                      isSelected
                        ? 'bg-[#5c6e46] text-white border-[#5c6e46] dark:bg-[#e4e9d8] dark:text-[#20251a]'
                        : 'bg-white text-[#5c6e46] border-[#d9e1ca] hover:bg-[#f4f6ee] dark:bg-[#1a1d16] dark:text-[#a8be8a] dark:border-[#414a33]'
                    }`}
                  >
                    {lab.labName || lab.name || 'Lab'} ({lab.courseType || 'B.Pharm'} Y{lab.year})
                  </button>
                );
              })}
            </div>
          )}

          <button 
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-[#556b2f] hover:bg-[#435525] text-white px-4 py-2.5 rounded-xl text-xs font-extrabold shadow-2xs transition-all"
          >
            <Plus size={16} /> New Store Request
          </button>
        </div>
      </div>

      {/* Missing for Experiments Banner */}
      {smartInventory && smartInventory.chemicals && smartInventory.chemicals.some(c => c.status === 'Not Available' || c.status === 'Low') && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 rounded-2xl p-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-rose-800 dark:text-rose-400 font-extrabold text-xs mb-1 uppercase tracking-wider">
                <AlertCircle size={16} />
                Missing Chemicals for Uploaded Practical Experiments
              </div>
              <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                Reagents required for syllabus experiments are low or out of stock in {activeLab?.name || 'HAP1'}.
              </p>
            </div>
            <button
              type="button"
              onClick={handleBatchRequestAllMissing}
              className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-extrabold transition shadow-2xs whitespace-nowrap"
            >
              Request All Missing
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {smartInventory.chemicals.filter(c => c.status === 'Not Available' || c.status === 'Low').map((item, i) => {
              const shortage = Math.max(0, item.quantityPerStudent - (item.labStock || 0));
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setFormData({
                      chemicalName: item.chemicalName,
                      casNumber: item.casNumber || '',
                      quantity: String(shortage || 100),
                      unit: item.unit || 'g'
                    });
                    setIsModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 bg-white dark:bg-[#1a1d16] text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40 hover:bg-rose-100 px-3 py-1 rounded-xl text-xs font-extrabold transition"
                >
                  + Request {item.chemicalName} ({shortage} {item.unit})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Low Stock Smart Reorder Banner */}
      {lowStockItems.length > 0 && (
        <div className="bg-[#fffdf0] dark:bg-[#282415] border border-[#e6c875] dark:border-[#5e4f20] rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center gap-2 text-[#996b00] dark:text-[#f0ca65] font-extrabold text-xs mb-2 uppercase tracking-wider">
            <AlertCircle size={16} />
            Smart Reorder Suggestions ({lowStockItems.length} Low Stock Chemicals)
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockItems.map((item, i) => (
              <button
                key={item.id || item._id || i}
                type="button"
                onClick={() => handleQuickReorder(item)}
                className="flex items-center gap-1.5 bg-white dark:bg-[#1a1d16] border border-amber-300 dark:border-amber-800/40 text-[#664700] dark:text-[#f2d98d] hover:bg-amber-100 px-3 py-1 rounded-xl text-xs font-extrabold transition"
              >
                + Reorder {item.chemicalName} ({item.quantity} {item.unit || item.quantityUnit} left)
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-[#fffef8] dark:bg-[#1c2117] border border-[#d9e1ca] dark:border-[#3c452f] rounded-2xl p-4 flex items-center gap-4 shadow-2xs">
            <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={22} />
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#71805a] dark:text-[#a5b48b]">{stat.label}</p>
              <p className="text-2xl font-black text-[#37412a] dark:text-[#e4e9d8]">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Requests Data Table Card */}
      <div className="bg-[#fffef8] dark:bg-[#1c2117] border border-[#d9e1ca] dark:border-[#3c452f] rounded-3xl shadow-sm overflow-hidden p-5">
        <div className="pb-4 border-b border-[#e8efd9] dark:border-[#2e3d19] flex flex-col sm:flex-row gap-3 justify-between items-center mb-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#87996c]" size={15} />
            <input 
              type="text" 
              placeholder="Search by chemical name or CAS..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#d9e1ca] bg-white dark:bg-[#1a1d16] dark:border-[#414a33] text-xs font-semibold text-[#37412a] dark:text-[#e4e9d8] outline-none focus:ring-2 focus:ring-[#5c6e46]/20"
            />
          </div>
          
          <div className="flex gap-1.5 bg-[#f4f6ee] dark:bg-[#1a1d16] p-1 rounded-2xl border border-[#d9e1ca] dark:border-[#414a33]">
            {['All', 'Pending', 'Approved', 'Rejected'].map(f => (
              <button 
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all ${
                  filter === f 
                    ? 'bg-[#5c6e46] text-white shadow-2xs dark:bg-[#e4e9d8] dark:text-[#20251a]' 
                    : 'text-[#5c6e46] hover:bg-white/60 dark:text-[#a8be8a] dark:hover:bg-[#20251a]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto border border-[#d9e1ca] dark:border-[#414a33] rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f4f6ee] text-xs uppercase font-extrabold text-[#71805a] dark:bg-[#20251a] dark:text-[#a8be8a] border-b border-[#d9e1ca] dark:border-[#414a33]">
              <tr>
                <th className="px-5 py-3 font-extrabold">Request ID</th>
                <th className="px-5 py-3 font-extrabold">Chemical Name</th>
                <th className="px-5 py-3 font-extrabold">CAS Number</th>
                <th className="px-5 py-3 font-extrabold">Quantity</th>
                <th className="px-5 py-3 font-extrabold">Date Submitted</th>
                <th className="px-5 py-3 font-extrabold">Status</th>
                <th className="px-5 py-3 font-extrabold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8efd9] dark:divide-[#2e3d19] font-semibold text-[#37412a] dark:text-[#e4e9d8]">
              {filteredRequests.length > 0 ? (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-[#f4f6ee]/50 dark:hover:bg-[#20251a]/50 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs font-extrabold text-[#5c6e46] dark:text-[#a8be8a]">{req.id}</td>
                    <td className="px-5 py-3.5 font-extrabold text-[#37412a] dark:text-[#e4e9d8] text-xs">{req.chemicalName}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-[#71805a]">{req.casNumber || 'N/A'}</td>
                    <td className="px-5 py-3.5 font-mono font-extrabold">{req.quantity} {req.unit}</td>
                    <td className="px-5 py-3.5 text-[#71805a] text-xs">{new Date(req.date).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold
                        ${req.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' : 
                          req.status === 'Rejected' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300' : 
                          'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 animate-pulse'}`}
                      >
                        {req.status === 'Approved' && <CheckCircle2 size={12} />}
                        {req.status === 'Rejected' && <XCircle size={12} />}
                        {req.status === 'Pending' && <Clock size={12} />}
                        {req.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 flex justify-end">
                      {req.status === 'Approved' ? (
                        <button 
                          type="button"
                          onClick={() => setPreviewReceipt(req)}
                          className="flex items-center gap-1 rounded-lg border border-[#5c6e46] bg-white px-2.5 py-1 text-[11px] font-extrabold text-[#5c6e46] hover:bg-[#5c6e46] hover:text-white transition-all dark:border-[#a8be8a] dark:bg-[#1a1d16] dark:text-[#a8be8a]"
                        >
                          <Eye size={13} /> View Receipt
                        </button>
                      ) : (
                        <span className="text-[11px] font-semibold text-[#71805a]">Processing</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-xs font-semibold text-[#71805a] dark:text-[#a5b48b]">
                    No store requests found matching criteria. Click "+ New Store Request" to send a request to Central Store.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ELEGANT SQUARISH NEW STORE REQUEST MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 sm:p-6 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#fffef8] dark:bg-[#1a1d16] rounded-2xl w-full max-w-xl p-6 sm:p-8 border border-[#d9e1ca] dark:border-[#414a33] shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 relative">
            
            {/* Top Close Button */}
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute right-6 top-6 p-2 rounded-lg text-[#71805a] hover:text-[#37412a] hover:bg-[#f4f6ee] dark:hover:bg-[#28301f] transition-all"
            >
              <XCircle size={22} />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3.5 border-b border-[#e4eed3] pb-4 dark:border-[#2e3722]">
              <div className="p-3 rounded-xl bg-[#5c6e46]/10 text-[#5c6e46] dark:bg-[#e4e9d8]/10 dark:text-[#a8be8a]">
                <FlaskConical size={26} />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-[#37412a] dark:text-[#e4e9d8]">
                  New Store Request
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-[#71805a] dark:text-[#a5b48b] mt-0.5">
                  Send a chemical stock transfer request to Central Store
                </p>
              </div>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Field 1: Chemical Name */}
              <div className="space-y-1.5">
                <label className="block text-sm font-bold tracking-wide text-[#37412a] dark:text-[#e4e9d8]">
                  Chemical Name <span className="text-rose-600">*</span>
                </label>
                <input 
                  required 
                  type="text" 
                  value={formData.chemicalName} 
                  onChange={(e) => setFormData({...formData, chemicalName: e.target.value})} 
                  className="w-full px-4 py-3 rounded-lg border border-[#cfd8bd] bg-white dark:bg-[#20251a] dark:border-[#414a33] text-sm font-semibold text-[#37412a] dark:text-[#e4e9d8] placeholder:text-[#8a9970] focus:ring-2 focus:ring-[#5c6e46]/20 focus:border-[#5c6e46] transition-all outline-none" 
                  placeholder="e.g. Sodium Chloride, Acetone, Ethanol..." 
                />
              </div>

              {/* Field 2: CAS Number */}
              <div className="space-y-1.5">
                <label className="block text-sm font-bold tracking-wide text-[#37412a] dark:text-[#e4e9d8]">
                  CAS Number <span className="text-[#71805a] font-normal text-xs">(Optional)</span>
                </label>
                <input 
                  type="text" 
                  value={formData.casNumber} 
                  onChange={(e) => setFormData({...formData, casNumber: e.target.value})} 
                  className="w-full px-4 py-3 rounded-lg border border-[#cfd8bd] bg-white dark:bg-[#20251a] dark:border-[#414a33] text-sm font-mono font-semibold text-[#37412a] dark:text-[#e4e9d8] placeholder:text-[#8a9970] focus:ring-2 focus:ring-[#5c6e46]/20 focus:border-[#5c6e46] transition-all outline-none" 
                  placeholder="e.g. 7647-14-5" 
                />
              </div>

              {/* Fields 3 & 4: Quantity & Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold tracking-wide text-[#37412a] dark:text-[#e4e9d8]">
                    Quantity <span className="text-rose-600">*</span>
                  </label>
                  <input 
                    required 
                    type="number" 
                    min="0.01" 
                    step="any" 
                    value={formData.quantity} 
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})} 
                    className="w-full px-4 py-3 rounded-lg border border-[#cfd8bd] bg-white dark:bg-[#20251a] dark:border-[#414a33] text-sm font-mono font-semibold text-[#37412a] dark:text-[#e4e9d8] placeholder:text-[#8a9970] focus:ring-2 focus:ring-[#5c6e46]/20 focus:border-[#5c6e46] transition-all outline-none" 
                    placeholder="e.g. 500" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-bold tracking-wide text-[#37412a] dark:text-[#e4e9d8]">
                    Unit <span className="text-rose-600">*</span>
                  </label>
                  <select 
                    required 
                    value={formData.unit} 
                    onChange={(e) => setFormData({...formData, unit: e.target.value})} 
                    className="w-full px-4 py-3 rounded-lg border border-[#cfd8bd] bg-white dark:bg-[#20251a] dark:border-[#414a33] text-sm font-bold text-[#37412a] dark:text-[#e4e9d8] focus:ring-2 focus:ring-[#5c6e46]/20 focus:border-[#5c6e46] transition-all outline-none"
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e4eed3] dark:border-[#2e3722]">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="rounded-lg border border-[#cfd8bd] bg-white px-5 py-2.5 text-sm font-bold text-[#5c6e46] hover:bg-[#f4f6ee] dark:border-[#414a33] dark:bg-[#20251a] dark:text-[#a8be8a] transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="rounded-lg bg-[#5c6e46] hover:bg-[#4a5e2a] px-6 py-2.5 text-sm font-extrabold text-white shadow-md transition-all flex items-center gap-2"
                >
                  {submitting ? 'Submitting...' : 'Submit Store Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Authorized Signature Store Receipt Modal */}
      <StoreRequestReceiptModal
        open={Boolean(previewReceipt)}
        onClose={() => setPreviewReceipt(null)}
        request={previewReceipt}
      />
    </div>
  );
}
