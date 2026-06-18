import { CheckCircle2, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import useAppStore from './appStore';
import StoreLayout from './StoreLayout';
import useStoreManagerMock, { formatQuantity } from './storeManagerMock';

const filters = ['All', 'Pending', 'Approved', 'Rejected'];

const statusClass = {
  Pending: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
  Approved: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
  Rejected: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300',
};

export default function StoreRequests() {
  const requests = useStoreManagerMock((state) => state.requests);
  const reviewRequest = useStoreManagerMock((state) => state.reviewRequest);
  const setToast = useAppStore((state) => state.setToast);
  const [activeFilter, setActiveFilter] = useState('All');

  const rows = useMemo(
    () =>
      requests
        .filter((request) => activeFilter === 'All' || request.status === activeFilter)
        .map((request) => ({
          ...request,
          quantityDisplay: formatQuantity(request.quantity, request.unit),
        })),
    [activeFilter, requests]
  );

  const handleReview = (requestId, status) => {
    const request = reviewRequest(requestId, status);
    if (!request) return;
    setToast({ type: status === 'Approved' ? 'success' : 'warning', message: `${request.chemicalName} request ${status.toLowerCase()}.` });
  };

  const headers = [
    { key: 'lab', label: 'Lab' },
    { key: 'chemicalName', label: 'Chemical' },
    { key: 'quantityDisplay', label: 'Quantity' },
    { key: 'status', label: 'Status', render: (row) => <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass[row.status]}`}>{row.status}</span> },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) =>
        row.status === 'Pending' ? (
          <div className='flex flex-wrap gap-2'>
            <Button className='px-3 py-1 text-xs' onClick={() => handleReview(row.id, 'Approved')}>
              <CheckCircle2 size={14} /> Approve
            </Button>
            <Button variant='outline' className='px-3 py-1 text-xs text-red-700 dark:text-red-300' onClick={() => handleReview(row.id, 'Rejected')}>
              <XCircle size={14} /> Reject
            </Button>
          </div>
        ) : (
          <span className='text-xs text-[#71805a] dark:text-[#c5d0b5]'>Reviewed</span>
        ),
    },
  ];

  return (
    <StoreLayout title='Lab Requests' subtitle='Review dummy lab requests and update inventory locally on approvals.'>
      <Card title='Request Queue' subtitle='Filter by status before approving or rejecting requests.'>
        <div className='mb-4 flex flex-wrap gap-2'>
          {filters.map((filter) => (
            <Button key={filter} variant={activeFilter === filter ? 'primary' : 'outline'} className='px-3 py-1 text-xs' onClick={() => setActiveFilter(filter)}>
              {filter}
            </Button>
          ))}
        </div>
        <Table headers={headers} rows={rows} />
      </Card>
    </StoreLayout>
  );
}
