import React, { useState, useEffect, useMemo } from 'react';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { Search, Plus, Clock, CheckCircle, XCircle, Beaker, FileText, Award } from 'lucide-react';

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
    case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
    case 'partial': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
    case 'pending': default: return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800';
  }
};

const getStatusIcon = (status) => {
  switch (status?.toLowerCase()) {
    case 'approved': return <CheckCircle className="w-4 h-4 mr-1" />;
    case 'rejected': return <XCircle className="w-4 h-4 mr-1" />;
    case 'partial': return <Beaker className="w-4 h-4 mr-1" />;
    case 'pending': default: return <Clock className="w-4 h-4 mr-1" />;
  }
};

export default function ResearchDashboard() {
  const { researchRequests, fetchMyResearchRequests, createResearchRequest, setToast } = useAppStore();
  const { user } = useAuthStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  const [formData, setFormData] = useState({
    chemicalName: '',
    quantityRequested: '',
    unit: 'ml',
    subject: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchMyResearchRequests();
  }, [fetchMyResearchRequests]);

  const stats = useMemo(() => {
    const total = researchRequests.length;
    const pending = researchRequests.filter(r => r.overallStatus === 'Pending').length;
    const approved = researchRequests.filter(r => r.overallStatus === 'Approved').length;
    return { total, pending, approved };
  }, [researchRequests]);

  const filteredRequests = useMemo(() => {
    return researchRequests.filter(req => {
      const matchesSearch = 
        req.subject?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        req.chemicalsRequested?.some(c => c.chemicalName?.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'All' || req.overallStatus === statusFilter;
      return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
  }, [researchRequests, searchQuery, statusFilter]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.chemicalName || !formData.quantityRequested || !formData.subject) {
      setToast({ type: 'error', message: 'Please fill in all required fields' });
      return;
    }
    
    if (Number(formData.quantityRequested) <= 0) {
      setToast({ type: 'error', message: 'Quantity must be greater than 0' });
      return;
    }

    setIsSubmitting(true);
    try {
      // The API expects an array of chemicalsRequested and a subject
      const requestPayload = {
        subject: formData.subject,
        chemicalsRequested: [{
          chemicalName: formData.chemicalName,
          quantityRequested: Number(formData.quantityRequested),
          unit: formData.unit
        }]
      };
      
      await createResearchRequest(requestPayload);
      setToast({ type: 'success', message: 'Research request submitted successfully' });
      setIsModalOpen(false);
      setFormData({ chemicalName: '', quantityRequested: '', unit: 'ml', subject: '' });
      fetchMyResearchRequests();
    } catch (error) {
      setToast({ type: 'error', message: error.response?.data?.message || error.message || 'Failed to submit request' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfdf7] dark:bg-[#1a1d16] text-gray-900 dark:text-[#eef4e8] p-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#556b2f] to-[#3c4e23] rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
          <Beaker className="w-32 h-32 text-[#c8a030]" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">Welcome back, {user?.name || 'Scholar'}!</h1>
            <span className="px-3 py-1 bg-[#c8a030] text-black text-xs font-bold rounded-full uppercase tracking-wider shadow-sm">
              Direct Store Access
            </span>
          </div>
          <p className="text-green-100 flex items-center gap-2">
            <Award className="w-5 h-5" /> 
            {user?.course || 'Research'} • {user?.year || 'Program'}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white dark:bg-[#1c2117] border-[#e2e8f0] dark:border-[#3c452f] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="p-6 flex flex-col h-full justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total Direct Requests</p>
              <p className="text-4xl font-bold text-[#556b2f] dark:text-[#c8a030]">{stats.total}</p>
            </div>
            <div className="mt-4">
              <Button onClick={() => setIsModalOpen(true)} className="w-full bg-[#556b2f] hover:bg-[#3c4e23] text-white flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> New Request
              </Button>
            </div>
          </div>
        </Card>

        <Card className="bg-white dark:bg-[#1c2117] border-[#e2e8f0] dark:border-[#3c452f] shadow-sm hover:shadow-md transition-shadow">
          <div className="p-6 flex flex-col h-full justify-center">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Approval</p>
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-800 dark:text-white">{stats.pending}</p>
          </div>
        </Card>

        <Card className="bg-white dark:bg-[#1c2117] border-[#e2e8f0] dark:border-[#3c452f] shadow-sm hover:shadow-md transition-shadow">
          <div className="p-6 flex flex-col h-full justify-center">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Approved</p>
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-800 dark:text-white">{stats.approved}</p>
          </div>
        </Card>
      </div>

      {/* Main Content Area */}
      <Card className="bg-white dark:bg-[#1c2117] border-[#e2e8f0] dark:border-[#3c452f] shadow-sm">
        <div className="p-6 border-b border-gray-100 dark:border-[#3c452f] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#556b2f] dark:text-[#c8a030]" />
            My Research Requests
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search chemicals or purpose..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full sm:w-64 bg-gray-50 dark:bg-[#252b1e] border-gray-200 dark:border-[#414a33]"
              />
            </div>
          </div>
        </div>

        <div className="p-0">
          {/* Tabs */}
          <div className="flex overflow-x-auto border-b border-gray-100 dark:border-[#3c452f] px-6 gap-6">
            {['All', 'Pending', 'Approved', 'Rejected'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  statusFilter === status 
                    ? 'border-[#556b2f] text-[#556b2f] dark:border-[#c8a030] dark:text-[#c8a030]' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#252b1e] text-gray-500 dark:text-gray-400 text-sm uppercase tracking-wider">
                  <th className="px-6 py-4 font-medium">Chemicals Requested</th>
                  <th className="px-6 py-4 font-medium">Purpose / Topic</th>
                  <th className="px-6 py-4 font-medium">Requested At</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#3c452f]">
                {filteredRequests.length > 0 ? (
                  filteredRequests.map((req) => (
                    <tr key={req._id || Math.random().toString()} className="hover:bg-gray-50 dark:hover:bg-[#252b1e]/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          {req.chemicalsRequested?.map((chem, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <Beaker className="w-4 h-4 text-[#556b2f] dark:text-[#c8a030] opacity-70" />
                              <span className="font-medium text-gray-800 dark:text-gray-200">{chem.chemicalName}</span>
                              <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#3c452f] px-2 py-0.5 rounded-full">
                                {chem.quantityRequested} {chem.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300 max-w-xs truncate" title={req.subject}>
                        {req.subject}
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {new Date(req.requestedAt).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(req.overallStatus)}`}>
                          {getStatusIcon(req.overallStatus)}
                          {req.overallStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      <div className="flex flex-col items-center justify-center">
                        <Beaker className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                        <p className="text-lg font-medium">No requests found</p>
                        <p className="text-sm">Try adjusting your filters or search query.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </div>
      </Card>

      {/* New Request Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="p-6 w-full max-w-md mx-auto bg-white dark:bg-[#1c2117] rounded-xl shadow-2xl border border-gray-100 dark:border-[#3c452f]">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#556b2f] dark:text-[#c8a030]" />
            New Research Request
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Chemical Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                name="chemicalName"
                required
                value={formData.chemicalName}
                onChange={handleInputChange}
                placeholder="e.g. Sodium Chloride"
                className="w-full bg-gray-50 dark:bg-[#252b1e] border-gray-200 dark:border-[#414a33]"
              />
            </div>
            
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  name="quantityRequested"
                  min="0.01"
                  step="0.01"
                  required
                  value={formData.quantityRequested}
                  onChange={handleInputChange}
                  placeholder="0"
                  className="w-full bg-gray-50 dark:bg-[#252b1e] border-gray-200 dark:border-[#414a33]"
                />
              </div>
              <div className="w-1/3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Unit <span className="text-red-500">*</span>
                </label>
                <select
                  name="unit"
                  value={formData.unit}
                  onChange={handleInputChange}
                  className="w-full h-10 px-3 rounded-md border border-gray-200 dark:border-[#414a33] bg-gray-50 dark:bg-[#252b1e] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#556b2f] dark:focus:ring-[#c8a030]"
                >
                  <option value="ml">ml</option>
                  <option value="L">L</option>
                  <option value="g">g</option>
                  <option value="mg">mg</option>
                  <option value="kg">kg</option>
                  <option value="units">units</option>
                  <option value="pcs">pcs</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Purpose / Research Topic <span className="text-red-500">*</span>
              </label>
              <textarea
                name="subject"
                required
                value={formData.subject}
                onChange={handleInputChange}
                rows={3}
                placeholder="Briefly explain the research purpose..."
                className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-[#414a33] bg-gray-50 dark:bg-[#252b1e] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#556b2f] dark:focus:ring-[#c8a030] resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-[#3c452f] mt-6">
              <Button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-[#3c452f] dark:hover:bg-[#4a5538] dark:text-gray-200"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-[#556b2f] hover:bg-[#3c4e23] text-white disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
