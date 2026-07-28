import { useEffect, useState } from 'react';
import useAppStore from '../store/appStore';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import { AlertCircle, CheckCircle, PackageSearch } from 'lucide-react';

export default function LabStudentRequestsPage() {
  const { 
    labs, 
    studentRequests, 
    fetchLabs, 
    fetchStudentRequests, 
    approveStudentRequest, 
    rejectStudentRequest,
    inventory,
    fetchInventory
  } = useAppStore();

  const [activeLabId, setActiveLabId] = useState(() => localStorage.getItem('pharmlab-active-lab') || '');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  
  const currentLab = labs.find(l => l.id === activeLabId) || labs[0];

  useEffect(() => {
    fetchLabs();
  }, [fetchLabs]);

  useEffect(() => {
    if (activeLabId) {
      fetchStudentRequests(activeLabId);
      fetchInventory(activeLabId);
    } else if (labs.length > 0) {
      setActiveLabId(labs[0].id);
    }
  }, [activeLabId, labs, fetchStudentRequests, fetchInventory]);

  const handleReviewClick = (req) => {
    setSelectedRequest(req);
    setRejectReason('');
    setIsReviewModalOpen(true);
  };

  const handleApprove = async (approveType) => {
    if (!selectedRequest) return;
    await approveStudentRequest(selectedRequest._id, approveType);
    setIsReviewModalOpen(false);
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    await rejectStudentRequest(selectedRequest._id, rejectReason || 'Not specified');
    setIsReviewModalOpen(false);
  };

  // Check availability mapping
  const checkAvailability = () => {
    if (!selectedRequest) return { hasAll: false, chemicals: [] };

    let hasAll = true;
    const chems = selectedRequest.chemicalsRequested.map(reqChem => {
      // Find chemical in lab inventory (case insensitive)
      const invItem = inventory.find(i => 
        (i.chemicalName || i.name).toLowerCase() === reqChem.chemicalName.toLowerCase()
      );

      const available = invItem ? Number(invItem.quantity) : 0;
      const required = Number(reqChem.quantityRequested);
      const isAvailable = available >= required;
      
      if (!isAvailable) hasAll = false;

      return {
        ...reqChem,
        available,
        isAvailable
      };
    });

    return { hasAll, chemicals: chems };
  };

  const availability = checkAvailability();

  return (
    <div className='space-y-6 pb-10'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h2 className='text-2xl font-semibold text-[#3c4e23] dark:text-[#eef4e8]'>Student Requests</h2>
          <p className='text-[#71805a] dark:text-[#c5d0b5]'>
            Review chemical requirements for {currentLab?.name}
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <select 
            value={activeLabId} 
            onChange={e => {
              setActiveLabId(e.target.value);
              localStorage.setItem('pharmlab-active-lab', e.target.value);
            }}
            className='rounded-lg border border-[#cfd8bd] bg-white px-3 py-2 text-sm text-[#3c4e23] outline-none focus:ring-2 focus:ring-[#6f7d45] dark:border-[#4e5d35] dark:bg-[#1a1d16] dark:text-[#eef4e8]'
          >
            {labs.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      </div>

      {studentRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#cfd8bd] bg-[#fdfdf7] py-16 text-center dark:border-[#4e5d35] dark:bg-[#1a1d16]">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f4f5eb] dark:bg-[#28301f]">
            <PackageSearch size={28} className="text-[#87996c]" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-[#3c4e23] dark:text-[#eef4e8]">No Requests Yet</h3>
          <p className="max-w-sm text-sm text-[#71805a] dark:text-[#c5d0b5]">
            There are currently no student experiment requests for {currentLab?.name}. When students request chemicals, they will appear here for your review.
          </p>
        </div>
      ) : (
        <Card title='Pending & Recent Requests' subtitle='Review and approve student chemical requirements'>
          <Table
            headers={[
              { key: 'studentName', label: 'Student' },
              { key: 'rollNumber', label: 'Roll No' },
              { key: 'group', label: 'Group' },
              { key: 'subject', label: 'Subject' },
              { key: 'experimentNo', label: 'Exp No' },
              { 
                key: 'overallStatus', 
                label: 'Status',
                render: (row) => (
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    row.overallStatus === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                    row.overallStatus === 'Rejected' ? 'bg-red-100 text-red-700' :
                    row.overallStatus === 'Partial' ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {row.overallStatus}
                  </span>
                )
              },
              {
                key: 'actions',
                label: 'Actions',
                render: (row) => (
                  row.overallStatus === 'Pending' ? (
                    <Button size="sm" onClick={() => handleReviewClick(row)}>Review</Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => handleReviewClick(row)}>View Details</Button>
                  )
                )
              }
            ]}
            rows={studentRequests}
          />
        </Card>
      )}

      <Modal open={isReviewModalOpen} onClose={() => setIsReviewModalOpen(false)} title="Review Request">
        {selectedRequest && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 dark:bg-[#1a1d16] p-3 rounded-lg">
              <div><span className="text-gray-500">Student:</span> {selectedRequest.studentName}</div>
              <div><span className="text-gray-500">Roll No:</span> {selectedRequest.rollNumber}</div>
              <div><span className="text-gray-500">Subject:</span> {selectedRequest.subject}</div>
              <div><span className="text-gray-500">Experiment:</span> {selectedRequest.experimentNo}</div>
            </div>

            <h4 className="font-semibold text-sm">Required Chemicals</h4>
            <div className="border border-[#cfd8bd] dark:border-[#4e5d35] rounded-lg overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#f6f7ef] dark:bg-[#20251a]">
                  <tr>
                    <th className="p-2">Chemical</th>
                    <th className="p-2">Required</th>
                    <th className="p-2">Available</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {availability.chemicals.map((c, i) => (
                    <tr key={i} className="border-t border-[#cfd8bd] dark:border-[#4e5d35]">
                      <td className="p-2">{c.chemicalName}</td>
                      <td className="p-2">{c.quantityRequested} {c.unit}</td>
                      <td className={`p-2 font-medium ${c.isAvailable ? 'text-emerald-600' : 'text-red-600'}`}>
                        {c.available} {c.unit}
                      </td>
                      <td className="p-2">
                        {c.isAvailable ? <CheckCircle size={16} className="text-emerald-600" /> : <AlertCircle size={16} className="text-red-600" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedRequest.overallStatus === 'Pending' && (
              <div className="pt-4 border-t border-[#cfd8bd] dark:border-[#4e5d35]">
                {!availability.hasAll && (
                  <div className="mb-4 bg-amber-50 text-amber-800 p-3 rounded-lg text-sm flex gap-2">
                    <PackageSearch size={18} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Insufficient Stock</p>
                      <p>If you approve, missing quantities will automatically be sent to the Central Store as a new request.</p>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2 mb-4">
                  <input 
                    type="text" 
                    placeholder="Rejection reason (optional)" 
                    className="flex-1 rounded-lg border border-[#cfd8bd] p-2 text-sm dark:bg-[#1a1d16] dark:border-[#4e5d35]"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <Button variant="outline" className="text-red-600 hover:bg-red-50" onClick={handleReject}>Reject</Button>
                </div>

                <div className="flex gap-3">
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700" 
                    onClick={() => handleApprove('available')}
                  >
                    Approve Available Only
                  </Button>
                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-700" 
                    onClick={() => handleApprove('all_and_store')}
                  >
                    Approve All & Request Store
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
