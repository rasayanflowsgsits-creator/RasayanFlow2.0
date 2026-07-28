import { useEffect, useState } from 'react';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import { Beaker, Clock, FileCheck2, PackageOpen } from 'lucide-react';

export default function BPharmDashboard() {
  const { 
    labStructure, fetchLabStructure, 
    studentRequests, fetchMyStudentRequests, createStudentRequest,
    fetchLabs, labs
  } = useAppStore();
  
  const user = useAuthStore((state) => state.user);
  const [selectedExperiment, setSelectedExperiment] = useState(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  useEffect(() => {
    fetchLabs();
    fetchMyStudentRequests();
    if (user?.labId) {
      fetchLabStructure(user.labId);
    }
  }, [fetchLabs, fetchMyStudentRequests, fetchLabStructure, user?.labId]);

  const handleRequestClick = (exp) => {
    setSelectedExperiment(exp);
    setIsRequestModalOpen(true);
  };

  const submitRequest = async () => {
    if (!selectedExperiment) return;

    try {
      await createStudentRequest({
        labId: selectedExperiment.labId,
        labName: selectedExperiment.labName,
        year: selectedExperiment.year,
        semester: selectedExperiment.semester,
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

  return (
    <div className='space-y-6 pb-10'>
      <div>
        <h2 className='text-2xl font-semibold text-[#3c4e23] dark:text-[#eef4e8]'>Student Dashboard</h2>
        <p className='text-[#71805a] dark:text-[#c5d0b5]'>
          {user.course} - {user.year} - {user.semester} | Lab: {user.labName}
        </p>
      </div>

      <div className='grid gap-4 md:grid-cols-3'>
        <Card title='Total Experiments' subtitle='Available in your lab'>
          <div className='flex items-center gap-3'>
            <Beaker size={24} className='text-[#556b2f]' />
            <p className='text-3xl font-semibold'>{labStructure.length}</p>
          </div>
        </Card>
        <Card title='Pending Requests' subtitle='Awaiting Lab Admin approval'>
          <div className='flex items-center gap-3'>
            <Clock size={24} className='text-amber-600' />
            <p className='text-3xl font-semibold'>{pendingCount}</p>
          </div>
        </Card>
        <Card title='Approved Requests' subtitle='Ready for experiment'>
          <div className='flex items-center gap-3'>
            <FileCheck2 size={24} className='text-emerald-600' />
            <p className='text-3xl font-semibold'>{approvedCount}</p>
          </div>
        </Card>
      </div>

      <Card title='Available Experiments' subtitle='Select an experiment to request chemicals'>
        {labStructure.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {labStructure.map((exp) => (
              <div key={exp._id} className="border border-[#d9e1ca] dark:border-[#414a33] rounded-xl p-4 bg-white dark:bg-[#20251a]">
                <h4 className="font-semibold text-[#3c4e23] dark:text-[#eef4e8]">{exp.subject}</h4>
                <p className="text-sm font-medium mb-2">Exp {exp.experimentNo}: {exp.experimentName}</p>
                <div className="text-xs text-[#71805a] dark:text-[#c5d0b5] mb-4 h-16 overflow-y-auto">
                  {exp.chemicals.length} Chemicals:
                  <ul className="list-disc pl-4 mt-1">
                    {exp.chemicals.map((c, i) => (
                      <li key={i}>{c.chemicalName} ({c.quantityPerStudent} {c.unit})</li>
                    ))}
                  </ul>
                </div>
                <Button className="w-full" onClick={() => handleRequestClick(exp)}>Request Chemicals</Button>
              </div>
            ))}
          </div>
        ) : (
          <div className='p-6 text-center text-slate-500'>No experiments assigned to this lab yet.</div>
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
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  row.overallStatus === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                  row.overallStatus === 'Rejected' ? 'bg-red-100 text-red-700' :
                  row.overallStatus === 'Partial' ? 'bg-amber-100 text-amber-700' :
                  'bg-blue-100 text-blue-700'
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
            <p>You are about to request chemicals for:</p>
            <div className="p-3 bg-[#f6f7ef] dark:bg-[#1a1d16] rounded-lg">
              <p className="font-semibold">{selectedExperiment.subject} - Exp {selectedExperiment.experimentNo}</p>
              <p>{selectedExperiment.experimentName}</p>
            </div>
            <p className="text-sm text-[#71805a]">This request will be sent to the Lab Admin for approval.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="w-full" onClick={() => setIsRequestModalOpen(false)}>Cancel</Button>
              <Button className="w-full" onClick={submitRequest}>Confirm Request</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
