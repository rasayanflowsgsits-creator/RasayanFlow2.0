import { useEffect, useState } from 'react';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import { Microscope, Clock, FileCheck2, FlaskConical } from 'lucide-react';

export default function ResearchDashboard() {
  const { researchRequests, fetchMyResearchRequests, createResearchRequest } = useAppStore();
  const user = useAuthStore((state) => state.user);
  
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [form, setForm] = useState({ chemicalName: '', quantityRequested: '', unit: '', purpose: '' });

  useEffect(() => {
    fetchMyResearchRequests();
  }, [fetchMyResearchRequests]);

  const submitRequest = async (e) => {
    e.preventDefault();
    if (!form.chemicalName || !form.quantityRequested || !form.unit) return;

    try {
      await createResearchRequest(form);
      setIsRequestModalOpen(false);
      setForm({ chemicalName: '', quantityRequested: '', unit: '', purpose: '' });
      fetchMyResearchRequests();
    } catch (e) {
      // error handled by toast
    }
  };

  const pendingCount = researchRequests.filter(r => r.overallStatus === 'Pending').length;
  const approvedCount = researchRequests.filter(r => r.overallStatus === 'Approved').length;

  return (
    <div className='space-y-6 pb-10'>
      <div>
        <h2 className='text-2xl font-semibold text-[#3c4e23] dark:text-[#eef4e8]'>Research Dashboard</h2>
        <p className='text-[#71805a] dark:text-[#c5d0b5]'>
          {user.course} - {user.year} | Direct Store Access
        </p>
      </div>

      <div className='grid gap-4 md:grid-cols-3'>
        <Card title='Direct Requests' subtitle='Request chemicals from store'>
          <div className='flex items-center gap-3'>
            <Microscope size={24} className='text-[#556b2f]' />
            <Button size="sm" onClick={() => setIsRequestModalOpen(true)}>New Request</Button>
          </div>
        </Card>
        <Card title='Pending Store Approval' subtitle='Awaiting Store Admin'>
          <div className='flex items-center gap-3'>
            <Clock size={24} className='text-amber-600' />
            <p className='text-3xl font-semibold'>{pendingCount}</p>
          </div>
        </Card>
        <Card title='Approved by Store' subtitle='Ready for collection'>
          <div className='flex items-center gap-3'>
            <FileCheck2 size={24} className='text-emerald-600' />
            <p className='text-3xl font-semibold'>{approvedCount}</p>
          </div>
        </Card>
      </div>

      <Card title='My Research Requests' subtitle='Track your direct-to-store requests'>
        <Table
          headers={[
            { key: 'chemicalDetails', label: 'Chemical Requested' },
            { key: 'subject', label: 'Purpose / Topic' },
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
          rows={researchRequests.map(req => ({
            ...req,
            chemicalDetails: req.chemicalsRequested && req.chemicalsRequested[0] 
              ? `${req.chemicalsRequested[0].chemicalName} (${req.chemicalsRequested[0].quantityRequested} ${req.chemicalsRequested[0].unit})`
              : 'Unknown'
          }))}
        />
      </Card>

      <Modal open={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} title="New Research Request">
        <form onSubmit={submitRequest} className="space-y-4">
          <Input label="Chemical Name" required value={form.chemicalName} onChange={e => setForm({...form, chemicalName: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Quantity" type="number" required value={form.quantityRequested} onChange={e => setForm({...form, quantityRequested: e.target.value})} />
            <Input label="Unit" required placeholder="e.g. ml, mg" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} />
          </div>
          <Input label="Purpose / Research Topic" required value={form.purpose} onChange={e => setForm({...form, purpose: e.target.value})} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="w-full" onClick={() => setIsRequestModalOpen(false)}>Cancel</Button>
            <Button type="submit" className="w-full">Submit Request</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
