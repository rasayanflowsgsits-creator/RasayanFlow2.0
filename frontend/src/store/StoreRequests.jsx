import { CheckCircle2, XCircle, Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import useAppStore from './appStore';
import StoreLayout from './StoreLayout';
import useStoreManagerMock, { formatQuantity, parsePackSize } from './storeManagerMock';
import { generateReceiptPDF } from '../utils/pdfGenerator';

const filters = ['All', 'Pending', 'Approved', 'Rejected'];

const statusClass = {
  Pending: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
  Approved: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
  Rejected: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300',
};

function toCsvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export default function StoreRequests() {
  const requests = useStoreManagerMock((state) => state.requests);
  const chemicals = useStoreManagerMock((state) => state.chemicals);
  const history = useStoreManagerMock((state) => state.history);
  const reviewRequest = useStoreManagerMock((state) => state.reviewRequest);
  const setToast = useAppStore((state) => state.setToast);
  
  const [activeFilter, setActiveFilter] = useState('All');
  
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const rows = useMemo(() => {
    return requests
      .filter((request) => activeFilter === 'All' || request.status === activeFilter)
      .map((request) => {
        const chem = chemicals.find(c => c['Chemical ID'] === request.chemicalId || c['Chemical Name'] === request.chemicalName);
        const currentStockUNT = chem ? Number(chem['Available Quantity'] || 0) : 0;
        let currentStockBase = 0;
        let baseUnit = 'ml';
        if (chem) {
          const packData = parsePackSize(chem['Pack Size']);
          currentStockBase = currentStockUNT * packData.value;
          baseUnit = packData.unit;
        }
        return {
          ...request,
          chem,
          currentStock: currentStockUNT,
          currentStockBase,
          baseUnit,
          quantityDisplay: formatQuantity(request.quantity, request.unit),
          dateDisplay: new Date(request.date || Date.now()).toLocaleDateString()
        };
      });
  }, [activeFilter, requests, chemicals]);

  let approveData = null;
  if (approveTarget) {
    const packData = parsePackSize(approveTarget.chem?.['Pack Size']);
    const totalBaseAvailable = approveTarget.currentStock * packData.value;
    const requestedBase = approveTarget.quantity;
    const remainingBase = Math.max(0, totalBaseAvailable - requestedBase);
    const newUNT = Math.round((remainingBase / packData.value) * 100) / 100;
    const newPrice = newUNT * Number(approveTarget.chem?.['Unit Price (INR)'] || 0);

    approveData = {
      ...approveTarget,
      totalBaseAvailable,
      requestedBase,
      remainingBase,
      newUNT,
      newPrice,
      baseUnit: packData.unit
    };
  }

  const confirmApprove = () => {
    if (!approveTarget) return;
    const request = reviewRequest(approveTarget.id, 'Approved');
    if (request && approveData) {
      setToast({ 
        type: 'success', 
        message: `Approved! ${request.chemicalName}: ${approveTarget.currentStock} UNT \u2192 ${approveData.newUNT} UNT` 
      });
    }
    setApproveTarget(null);
  };

  const confirmReject = () => {
    if (!rejectTarget) return;
    const request = reviewRequest(rejectTarget.id, 'Rejected', rejectReason);
    if (request) {
      setToast({ type: 'warning', message: `Request rejected` });
    }
    setRejectTarget(null);
    setRejectReason('');
  };

  const headers = [
    { key: 'id', label: 'Request ID' },
    { key: 'lab', label: 'Lab Name' },
    { key: 'chemicalName', label: 'Chemical Name' },
    { key: 'chemicalId', label: 'Chemical ID' },
    { key: 'currentStockBase', label: 'Current Stock', render: (r) => `${(r.currentStockBase || 0).toLocaleString()} ${r.baseUnit || 'ml'}` },
    { key: 'quantityDisplay', label: 'Requested' },
    { key: 'dateDisplay', label: 'Date' },
    { key: 'status', label: 'Status', render: (row) => <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass[row.status]}`}>{row.status}</span> },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => {
        if (row.status === 'Pending') {
          return (
            <div className='flex flex-wrap gap-2'>
              <Button className='px-3 py-1 text-xs' onClick={() => setApproveTarget(row)}>
                <CheckCircle2 size={14} className="mr-1" /> Approve
              </Button>
              <Button variant='outline' className='px-3 py-1 text-xs text-red-700 dark:text-red-300 border-red-200 hover:bg-red-50' onClick={() => setRejectTarget(row)}>
                <XCircle size={14} className="mr-1" /> Reject
              </Button>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-3">
            <span className='text-xs font-semibold text-[#71805a] dark:text-[#c5d0b5] uppercase'>Reviewed</span>
            {row.status === 'Approved' && (
              <Button 
                variant='outline'
                className="px-3 py-1 text-xs border-[#71805a] text-[#556b2f] hover:bg-[#eef4e4] dark:border-[#4e5d35] dark:text-[#c5d0b5] dark:hover:bg-[#28301f]"
                onClick={(e) => {
                  e.stopPropagation();
                  const matchingHistory = history.find(h => h.receiptNumber === row.receiptNumber);
                  generateReceiptPDF(row, row.chem || {}, matchingHistory);
                }}
              >
                <Download size={14} className="mr-1" /> Receipt
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const exportCsv = () => {
    const lines = [
      ['Request ID', 'Lab Name', 'Chemical Name', 'Chemical ID', 'Current Stock', 'Qty Requested', 'Date', 'Status'].map(toCsvCell).join(','),
      ...rows.map((r) => [
        r.id,
        r.lab,
        r.chemicalName,
        r.chemicalId,
        `${(r.currentStockBase || 0).toLocaleString()} ${r.baseUnit || 'ml'}`,
        `${(r.quantity || 0).toLocaleString()} ${r.unit || 'ml'}`,
        r.dateDisplay,
        r.status
      ].map(toCsvCell).join(','))
    ];
    const blob = new Blob([`${lines.join('\n')}\n`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'RasayanFlow_Requests.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <StoreLayout 
      title='Lab Requests' 
      subtitle='Review dummy lab requests and update inventory locally on approvals.'
      actions={
        <Button variant='outline' onClick={exportCsv} disabled={!rows.length} className='border-[#71805a] text-[#556b2f] hover:bg-[#eef4e4] dark:border-[#4e5d35] dark:text-[#c5d0b5] dark:hover:bg-[#28301f]'>
          <Download size={16} className='mr-2' /> Export CSV
        </Button>
      }
    >
      <Card title='Request Queue' subtitle='Filter by status before approving or rejecting requests.'>
        <div className='mb-4 flex flex-wrap gap-2'>
          {filters.map((filter) => (
            <Button key={filter} variant={activeFilter === filter ? 'primary' : 'outline'} className='px-3 py-1 text-xs' onClick={() => setActiveFilter(filter)}>
              {filter}
            </Button>
          ))}
        </div>
        <div className="overflow-x-auto border border-[#e3e9d8] dark:border-[#343b2b] rounded-lg">
          <Table headers={headers} rows={rows} />
        </div>
      </Card>

      <Modal open={Boolean(approveTarget)} onClose={() => setApproveTarget(null)} title='Approve this request?' panelClassName='max-w-md w-full'>
        {approveData && (
          <div className='flex flex-col gap-4 text-sm'>
            <div className='bg-[#f9faef] p-4 rounded-lg border border-[#e3e9d8] dark:bg-[#1f2419] dark:border-[#343b2b] space-y-2'>
              <p><strong className="text-[#556b2f] dark:text-[#a8be8a]">Lab:</strong> {approveData.lab}</p>
              <p><strong className="text-[#556b2f] dark:text-[#a8be8a]">Chemical:</strong> {approveData.chemicalName}</p>
              <p><strong className="text-[#556b2f] dark:text-[#a8be8a]">Total Available:</strong> {approveData.totalBaseAvailable.toLocaleString()} {approveData.baseUnit}</p>
              <p><strong className="text-[#556b2f] dark:text-[#a8be8a]">Requested:</strong> {approveData.requestedBase.toLocaleString()} {approveData.baseUnit}</p>
              <div className="mt-4 pt-4 border-t border-[#d9e1ca] dark:border-[#414a33]">
                <p className="text-[15px] font-bold text-slate-800 dark:text-slate-200">
                  Remaining: <span className="text-emerald-600">{approveData.remainingBase.toLocaleString()} {approveData.baseUnit}</span>
                </p>
                <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400 mt-1">
                  New Unit Price Total: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(approveData.newPrice)}
                </p>
              </div>
            </div>
            <div className='mt-2 flex gap-3 justify-end'>
              <Button variant='outline' onClick={() => setApproveTarget(null)}>Cancel</Button>
              <Button onClick={confirmApprove}>Confirm Approve</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={Boolean(rejectTarget)} onClose={() => setRejectTarget(null)} title='Reject Request' panelClassName='max-w-md w-full'>
        {rejectTarget && (
          <div className='flex flex-col gap-4 text-sm'>
            <p className='text-slate-600 dark:text-slate-300'>Please provide a reason for rejecting the request from {rejectTarget.lab} for {rejectTarget.chemicalName}.</p>
            <textarea
              className='w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
              rows={4}
              placeholder='Enter reason here...'
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className='mt-2 flex gap-3 justify-end'>
              <Button variant='outline' onClick={() => setRejectTarget(null)}>Cancel</Button>
              <Button className='bg-rose-600 hover:bg-rose-700 text-white' onClick={confirmReject}>Reject Request</Button>
            </div>
          </div>
        )}
      </Modal>
    </StoreLayout>
  );
}
