import { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Filter, FileText, CheckCircle2, Clock, XCircle, FileDown, Eye } from 'lucide-react';
import useAuthStore from '../store/authStore';
import api from '../services/api';
import useAppStore from '../store/appStore';
import { toFrontendRequest } from '../utils/storeMapper';

export default function LabStoreRequests() {
  const user = useAuthStore((state) => state.user);
  const labName = user?.labName || 'harsh lab';
  
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const setToast = useAppStore((state) => state.setToast);
  
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewReceipt, setPreviewReceipt] = useState(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/store/requests/my');
      setRequests((res.data || []).map(toFrontendRequest));
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to fetch requests' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // New Request Form State
  const [formData, setFormData] = useState({
    chemicalName: '',
    casNumber: '',
    quantity: '',
    unit: 'ml',
    reason: ''
  });

  const labRequests = useMemo(() => requests.filter(r => r.lab === labName), [requests, labName]);
  
  const filteredRequests = useMemo(() => {
    return labRequests.filter(req => {
      const matchesSearch = req.chemicalName.toLowerCase().includes(search.toLowerCase()) || (req.casNumber || '').toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === 'All' || req.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [labRequests, search, filter]);

  const stats = [
    { label: 'Total Requests', value: labRequests.length, icon: FileText, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Pending', value: labRequests.filter(r => r.status === 'Pending').length, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { label: 'Approved', value: labRequests.filter(r => r.status === 'Approved').length, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { label: 'Rejected', value: labRequests.filter(r => r.status === 'Rejected').length, icon: XCircle, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-900/30' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(!formData.chemicalName || !formData.quantity) return;

    try {
      await api.post('/store/requests', {
        chemicalName: formData.chemicalName,
        casNumber: formData.casNumber,
        quantityRequested: Number(formData.quantity),
        unit: formData.unit,
        reason: formData.reason,
        labName: labName
      });
      setToast({ type: 'success', message: 'Request submitted successfully' });
      setIsModalOpen(false);
      setFormData({ chemicalName: '', casNumber: '', quantity: '', unit: 'ml', reason: '' });
      fetchRequests();
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to submit request' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#3c4e23] dark:text-[#eef4e8]">Store Requests</h1>
          <p className="text-[#71805a] dark:text-[#c5d0b5] text-sm mt-1">Manage chemical requests from Central Store</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[#556b2f] text-white px-4 py-2 rounded-lg hover:bg-[#4a5e29] transition-colors"
        >
          <Plus size={18} /> New Request
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-[#fffef8] dark:bg-[#1c2117] border border-[#d9e1ca] dark:border-[#3c452f] rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-[#71805a] dark:text-[#c5d0b5]">{stat.label}</p>
              <p className="text-2xl font-bold text-[#3c4e23] dark:text-[#eef4e8]">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#fffef8] dark:bg-[#1c2117] border border-[#d9e1ca] dark:border-[#3c452f] rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#d9e1ca] dark:border-[#3c452f] flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#fdfdf7] dark:bg-[#1a1d16]">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71805a] dark:text-[#8b9874]" size={18} />
            <input 
              type="text" 
              placeholder="Search by chemical name or CAS..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-[#cfd8bd] bg-white dark:bg-[#23281d] dark:border-[#4e5d35] text-[#3c4e23] dark:text-[#eef4e8] focus:outline-none focus:ring-2 focus:ring-[#8b9874]"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">
            {['All', 'Pending', 'Approved', 'Rejected'].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filter === f ? 'bg-[#556b2f] text-white' : 'bg-[#f4f5eb] text-[#71805a] hover:bg-[#e8efd9] dark:bg-[#28301f] dark:text-[#c5d0b5] dark:hover:bg-[#313a26]'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#4e5d35] dark:text-[#c5d0b5]">
            <thead className="bg-[#f4f5eb] text-xs uppercase text-[#71805a] dark:bg-[#28301f] dark:text-[#a8be8a]">
              <tr>
                <th className="px-6 py-4 font-semibold">Request ID</th>
                <th className="px-6 py-4 font-semibold">Chemical Name</th>
                <th className="px-6 py-4 font-semibold">CAS No.</th>
                <th className="px-6 py-4 font-semibold">Quantity</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d9e1ca] dark:divide-[#3c452f]">
              {filteredRequests.length > 0 ? (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-[#fdfdf7] dark:hover:bg-[#20251a] transition-colors">
                    <td className="px-6 py-4 font-medium text-[#3c4e23] dark:text-[#eef4e8]">{req.id}</td>
                    <td className="px-6 py-4 font-medium text-[#3c4e23] dark:text-[#eef4e8]">{req.chemicalName}</td>
                    <td className="px-6 py-4">{req.casNumber || '-'}</td>
                    <td className="px-6 py-4">{req.quantity} {req.unit}</td>
                    <td className="px-6 py-4">{new Date(req.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold
                        ${req.status === 'Approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-500' : 
                          req.status === 'Rejected' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-500' : 
                          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500'}`}
                      >
                        {req.status === 'Approved' && <CheckCircle2 size={12} />}
                        {req.status === 'Rejected' && <XCircle size={12} />}
                        {req.status === 'Pending' && <Clock size={12} />}
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex justify-end gap-2">
                      {req.status === 'Approved' && (
                        <>
                          <button 
                            onClick={() => setPreviewReceipt(req)}
                            className="flex items-center gap-1.5 rounded-lg border border-[#556b2f] bg-transparent px-3 py-1.5 text-xs font-semibold text-[#556b2f] hover:bg-[#556b2f] hover:text-white transition-colors dark:border-[#8b9874] dark:text-[#8b9874] dark:hover:bg-[#8b9874] dark:hover:text-[#1c2117]"
                          >
                            <Eye size={14} /> View
                          </button>
                          <button className="flex items-center gap-1.5 rounded-lg bg-[#556b2f] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#4a5e29] transition-colors">
                            <FileDown size={14} /> Receipt
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-[#71805a] dark:text-[#8b9874]">
                    No requests found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[#fffef8] dark:bg-[#1c2117] rounded-xl w-full max-w-md p-6 border border-[#d9e1ca] dark:border-[#3c452f]">
            <h2 className="text-xl font-bold text-[#3c4e23] dark:text-[#eef4e8] mb-4">New Store Request</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#71805a] dark:text-[#c5d0b5] mb-1">Chemical Name *</label>
                <input required type="text" value={formData.chemicalName} onChange={(e) => setFormData({...formData, chemicalName: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-[#cfd8bd] bg-white dark:bg-[#23281d] dark:border-[#4e5d35] text-[#3c4e23] dark:text-[#eef4e8] focus:ring-2 focus:ring-[#8b9874] focus:outline-none" placeholder="e.g. Sodium Chloride" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#71805a] dark:text-[#c5d0b5] mb-1">CAS Number</label>
                <input type="text" value={formData.casNumber} onChange={(e) => setFormData({...formData, casNumber: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-[#cfd8bd] bg-white dark:bg-[#23281d] dark:border-[#4e5d35] text-[#3c4e23] dark:text-[#eef4e8] focus:ring-2 focus:ring-[#8b9874] focus:outline-none" placeholder="e.g. 7647-14-5" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#71805a] dark:text-[#c5d0b5] mb-1">Quantity *</label>
                  <input required type="number" min="0.1" step="0.1" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-[#cfd8bd] bg-white dark:bg-[#23281d] dark:border-[#4e5d35] text-[#3c4e23] dark:text-[#eef4e8] focus:ring-2 focus:ring-[#8b9874] focus:outline-none" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#71805a] dark:text-[#c5d0b5] mb-1">Unit *</label>
                  <select required value={formData.unit} onChange={(e) => setFormData({...formData, unit: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-[#cfd8bd] bg-white dark:bg-[#23281d] dark:border-[#4e5d35] text-[#3c4e23] dark:text-[#eef4e8] focus:ring-2 focus:ring-[#8b9874] focus:outline-none">
                    <option value="ml">ml</option>
                    <option value="L">L</option>
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="pcs">pcs</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 text-[#71805a] hover:bg-[#f4f5eb] rounded-lg transition-colors dark:text-[#c5d0b5] dark:hover:bg-[#28301f]">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-[#556b2f] text-white rounded-lg hover:bg-[#4a5e29] transition-colors">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Receipt Modal */}
      {previewReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-[#fffef8] dark:bg-[#1c2117] rounded-xl w-full max-w-lg p-6 border border-[#d9e1ca] dark:border-[#3c452f] shadow-xl relative overflow-hidden">
            {/* Header Pattern */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-[#556b2f]"></div>
            
            <div className="flex justify-between items-start mb-6 mt-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-[#e8efd9] dark:bg-[#2a3320] rounded-lg flex items-center justify-center text-[#556b2f] dark:text-[#a8be8a]">
                  <FileText size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#3c4e23] dark:text-[#eef4e8]">Store Receipt</h2>
                  <p className="text-[#71805a] dark:text-[#c5d0b5] text-xs font-mono">{previewReceipt.receiptNumber || `RF-2026-${Math.floor(Math.random()*1000)}`}</p>
                </div>
              </div>
              <button 
                onClick={() => setPreviewReceipt(null)}
                className="text-[#71805a] hover:bg-[#f4f5eb] p-2 rounded-lg transition-colors dark:text-[#c5d0b5] dark:hover:bg-[#28301f]"
              >
                <XCircle size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#fdfdf7] dark:bg-[#1a1d16] p-3 rounded-lg border border-[#cfd8bd] dark:border-[#4e5d35]">
                  <p className="text-[10px] uppercase font-bold text-[#71805a] dark:text-[#8b9874] mb-1">Lab Details</p>
                  <p className="text-sm font-semibold text-[#3c4e23] dark:text-[#eef4e8]">{previewReceipt.lab}</p>
                </div>
                <div className="bg-[#fdfdf7] dark:bg-[#1a1d16] p-3 rounded-lg border border-[#cfd8bd] dark:border-[#4e5d35]">
                  <p className="text-[10px] uppercase font-bold text-[#71805a] dark:text-[#8b9874] mb-1">Date Approved</p>
                  <p className="text-sm font-semibold text-[#3c4e23] dark:text-[#eef4e8]">{new Date(previewReceipt.date).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="bg-[#fdfdf7] dark:bg-[#1a1d16] p-4 rounded-lg border border-[#cfd8bd] dark:border-[#4e5d35]">
                <table className="w-full text-left text-sm">
                  <tbody>
                    <tr className="border-b border-dashed border-[#cfd8bd] dark:border-[#4e5d35]">
                      <td className="py-2 text-[#71805a] dark:text-[#a8be8a]">Item Name</td>
                      <td className="py-2 font-bold text-[#3c4e23] dark:text-[#eef4e8] text-right">{previewReceipt.chemicalName}</td>
                    </tr>
                    <tr className="border-b border-dashed border-[#cfd8bd] dark:border-[#4e5d35]">
                      <td className="py-2 text-[#71805a] dark:text-[#a8be8a]">Quantity Allocated</td>
                      <td className="py-2 font-bold text-[#3c4e23] dark:text-[#eef4e8] text-right">{previewReceipt.quantity} {previewReceipt.unit}</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-[#71805a] dark:text-[#a8be8a]">Status</td>
                      <td className="py-2 text-right">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-500">
                          <CheckCircle2 size={12} /> Approved
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button 
                className="flex items-center gap-2 bg-[#556b2f] text-white px-5 py-2 rounded-lg hover:bg-[#4a5e29] transition-colors font-medium text-sm shadow-sm"
              >
                <FileDown size={16} /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
