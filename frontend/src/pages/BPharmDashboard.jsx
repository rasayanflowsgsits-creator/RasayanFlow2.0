import { useEffect, useState, useMemo } from 'react';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import { Beaker, Clock, FileCheck2, PackageOpen, CheckCircle2, AlertTriangle, XCircle, Search } from 'lucide-react';

export default function BPharmDashboard() {
  const { 
    labStructure, fetchStudentLabStructure, 
    studentRequests, fetchMyStudentRequests, createStudentRequest,
    fetchLabs
  } = useAppStore();
  
  const user = useAuthStore((state) => state.user);
  const [selectedExperiment, setSelectedExperiment] = useState(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLabs();
    fetchMyStudentRequests();
    if (user?.labId && user?.onboardingComplete) {
      fetchStudentLabStructure();
    }
  }, [fetchLabs, fetchMyStudentRequests, fetchStudentLabStructure, user?.labId, user?.onboardingComplete]);

  const handleRequestClick = (subject, exp) => {
    setSelectedExperiment({ ...exp, subject });
    setIsRequestModalOpen(true);
  };

  const submitRequest = async () => {
    if (!selectedExperiment) return;

    try {
      await createStudentRequest({
        labId: user.labId,
        labName: user.labName,
        year: user.year,
        semester: user.semester,
        subject: selectedExperiment.subject,
        experimentNo: selectedExperiment.experimentNo,
        experimentName: selectedExperiment.experimentName,
        chemicalsRequested: selectedExperiment.chemicals.map(c => ({
          chemicalName: c.chemicalName,
          quantityRequested: c.quantityPerStudent,
          unit: c.unit
        }))
      });
      setIsRequestModalOpen(false);
      fetchMyStudentRequests();
    } catch (e) {
      // error handled by toast in store
    }
  };

  const pendingCount = studentRequests.filter(r => r.overallStatus === 'Pending').length;
  const approvedCount = studentRequests.filter(r => r.overallStatus === 'Approved').length;
  const totalExperiments = labStructure.reduce((acc, sub) => acc + sub.experiments.length, 0);

  const getStockIcon = (status) => {
    if (status === 'Available') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    if (status === 'Low Stock') return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  const filteredStructure = useMemo(() => {
    if (!searchTerm) return labStructure;
    return labStructure.map(subject => {
      const filteredExps = subject.experiments.filter(exp => 
        exp.experimentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        exp.experimentNo.toString().includes(searchTerm)
      );
      return { ...subject, experiments: filteredExps };
    }).filter(sub => sub.experiments.length > 0);
  }, [labStructure, searchTerm]);

  return (
    <div className='space-y-6 pb-10 animate-in fade-in'>
      <div>
        <h2 className='text-2xl font-bold text-[#37412a] dark:text-[#e4e9d8]'>Student Dashboard</h2>
        <p className='text-sm text-[#71805a] dark:text-[#a5b48b]'>
          {user.course} • Year {user.year} • Sem {user.semester} {user.group !== 'No Group' && `• ${user.group}`} | Lab: {user.labName || 'Not Assigned'}
        </p>
      </div>

      <div className='grid gap-4 md:grid-cols-3'>
        <Card title='Total Experiments' subtitle='Available in your lab'>
          <div className='flex items-center gap-3'>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4f6ee] dark:bg-[#20251a]">
              <Beaker size={24} className='text-[#5c6e46] dark:text-[#a5b48b]' />
            </div>
            <p className='text-3xl font-bold text-[#37412a] dark:text-[#e4e9d8]'>{totalExperiments}</p>
          </div>
        </Card>
        <Card title='Pending Requests' subtitle='Awaiting Lab Admin approval'>
          <div className='flex items-center gap-3'>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/30">
              <Clock size={24} className='text-amber-600 dark:text-amber-500' />
            </div>
            <p className='text-3xl font-bold text-[#37412a] dark:text-[#e4e9d8]'>{pendingCount}</p>
          </div>
        </Card>
        <Card title='Approved Requests' subtitle='Ready for experiment'>
          <div className='flex items-center gap-3'>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/30">
              <FileCheck2 size={24} className='text-emerald-600 dark:text-emerald-500' />
            </div>
            <p className='text-3xl font-bold text-[#37412a] dark:text-[#e4e9d8]'>{approvedCount}</p>
          </div>
        </Card>
      </div>

      <Card 
        title='Available Experiments' 
        subtitle='Select an experiment to request chemicals'
        headerAction={
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#87996c]" />
            <input 
              type="text" 
              placeholder="Search experiments..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-[#d9e1ca] rounded-lg bg-white dark:bg-[#1a1d16] dark:border-[#414a33] focus:outline-none focus:ring-1 focus:ring-[#5c6e46]"
            />
          </div>
        }
      >
        {filteredStructure.length > 0 ? (
          <div className="space-y-8">
            {filteredStructure.map((subjectGroup) => (
              <div key={subjectGroup._id}>
                <h3 className="mb-4 text-lg font-bold text-[#5c6e46] dark:text-[#c5d0b5] border-b border-[#e8ece1] dark:border-[#3c452f] pb-2">
                  {subjectGroup._id}
                </h3>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {subjectGroup.experiments.map((exp) => {
                    // Check if requested already
                    const isRequested = studentRequests.some(r => r.experimentNo === exp.experimentNo && r.subject === subjectGroup._id && (r.overallStatus === 'Pending' || r.overallStatus === 'Approved'));
                    
                    return (
                      <div key={exp.experimentNo} className="flex flex-col border border-[#d9e1ca] dark:border-[#414a33] rounded-2xl p-5 bg-white dark:bg-[#20251a] hover:shadow-md transition-all">
                        <div className="flex-1">
                          <p className="text-xs font-bold uppercase tracking-wider text-[#87996c] mb-1">Exp {exp.experimentNo}</p>
                          <h4 className="font-bold text-[#37412a] dark:text-[#e4e9d8] mb-3 line-clamp-2">{exp.experimentName}</h4>
                          <div className="space-y-2 mb-4">
                            {exp.chemicals.map((c, i) => (
                              <div key={i} className="flex items-center justify-between text-sm p-2 rounded-lg bg-[#f4f6ee] dark:bg-[#1a1d16]">
                                <span className="font-medium text-[#4a5538] dark:text-[#c5d0b5] truncate pr-2">{c.chemicalName}</span>
                                <div className="flex items-center gap-2 whitespace-nowrap">
                                  <span className="text-xs text-[#71805a] dark:text-[#a5b48b]">{c.quantityPerStudent} {c.unit}</span>
                                  {getStockIcon(c.stockStatus)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <Button 
                          className="w-full mt-4" 
                          onClick={() => handleRequestClick(subjectGroup._id, exp)}
                          disabled={isRequested}
                          variant={isRequested ? 'outline' : 'primary'}
                        >
                          {isRequested ? 'Requested' : 'Request Chemicals'}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#d9e1ca] bg-[#fdfdf7] py-16 text-center dark:border-[#414a33] dark:bg-[#1a1d16]">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f4f6ee] dark:bg-[#20251a]">
              <PackageOpen size={28} className="text-[#87996c]" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-[#37412a] dark:text-[#e4e9d8]">No Experiments Found</h3>
            <p className="max-w-sm text-sm text-[#71805a] dark:text-[#a5b48b]">
              {searchTerm ? "No experiments match your search criteria." : "Your Lab Admin hasn't uploaded any experiments for this lab yet."}
            </p>
          </div>
        )}
      </Card>

      <Card title='My Requests' subtitle='Track your chemical request history'>
        <Table
          headers={[
            { key: 'subject', label: 'Subject' },
            { key: 'experimentNo', label: 'Exp No' },
            { key: 'experimentName', label: 'Experiment Name' },
            { key: 'requestedAt', label: 'Requested At', render: (row) => new Date(row.requestedAt).toLocaleString() },
            { 
              key: 'overallStatus', 
              label: 'Status',
              render: (row) => (
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  row.overallStatus === 'Approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' :
                  row.overallStatus === 'Rejected' ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400' :
                  row.overallStatus === 'Partial' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' :
                  'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
                }`}>
                  {row.overallStatus}
                </span>
              )
            }
          ]}
          rows={studentRequests}
        />
      </Card>

      <Modal open={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} title="Confirm Request">
        {selectedExperiment && (
          <div className="space-y-4">
            <p className="text-[#4a5538] dark:text-[#c5d0b5]">You are about to request chemicals for:</p>
            <div className="p-4 bg-[#f4f6ee] dark:bg-[#1a1d16] rounded-xl border border-[#d9e1ca] dark:border-[#414a33]">
              <p className="text-xs font-bold uppercase tracking-wider text-[#87996c] mb-1">{selectedExperiment.subject} - Exp {selectedExperiment.experimentNo}</p>
              <p className="font-bold text-[#37412a] dark:text-[#e4e9d8]">{selectedExperiment.experimentName}</p>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium text-[#4a5538] dark:text-[#c5d0b5]">Chemicals Included:</p>
              <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                {selectedExperiment.chemicals.map((c, i) => (
                  <div key={i} className="flex justify-between text-sm py-1 border-b border-[#e8ece1] dark:border-[#3c452f] last:border-0">
                    <span className="text-[#37412a] dark:text-[#e4e9d8]">{c.chemicalName}</span>
                    <span className="text-[#71805a] dark:text-[#a5b48b]">{c.quantityPerStudent} {c.unit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="w-full" onClick={() => setIsRequestModalOpen(false)}>Cancel</Button>
              <Button className="w-full" onClick={submitRequest}>Confirm Request</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
