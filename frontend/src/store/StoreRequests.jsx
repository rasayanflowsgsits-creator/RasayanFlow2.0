import { CheckCircle2, XCircle, Download, Eye, GraduationCap, Award } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import useAppStore from './appStore';
import StoreLayout from './StoreLayout';
import { formatQuantity } from './storeManagerMock';
import { parsePackSize, safeRound } from '../utils/storeHelpers';
import { generateReceiptPDF } from '../utils/pdfGenerator';
import ReceiptPreviewModal from './ReceiptPreviewModal';
import api from '../services/api';
import { toFrontendRequest, toFrontendChemical, toFrontendHistory } from '../utils/storeMapper';

const filters = ['All', 'Pending', 'Approved', 'Rejected'];

const statusClass = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:text-amber-300',
  Approved: 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-300',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-900/20 dark:text-rose-300',
};

function toCsvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export default function StoreRequests() {
  const [requests, setRequests] = useState([]);
  const [chemicals, setChemicals] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const setToast = useAppStore((state) => state.setToast);
  
  const [activeFilter, setActiveFilter] = useState('All');
  
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [previewData, setPreviewData] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reqsRes, chemRes, histRes] = await Promise.all([
        api.get('/store/requests'),
        api.get('/store/inventory'),
        api.get('/store/history')
      ]);
      setRequests((reqsRes.data || []).map(toFrontendRequest));
      setChemicals((chemRes.data || []).map(toFrontendChemical));
      setHistory((histRes.data || []).map(toFrontendHistory));
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to fetch data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
          dateDisplay: new Date(request.date || Date.now()).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
          })
        };
      });
  }, [activeFilter, requests, chemicals]);

  let approveData = null;
  if (approveTarget) {
    const packData = parsePackSize(approveTarget.chem?.['Pack Size']);
    const totalBaseAvailable = safeRound(approveTarget.currentStock * packData.value);
    const requestedBase = approveTarget.quantity;
    const remainingBase = Math.max(0, safeRound(totalBaseAvailable - requestedBase));
    const newUNT = safeRound(remainingBase / packData.value);
    const newPrice = safeRound(newUNT * Number(approveTarget.chem?.['Unit Price (INR)'] || 0));

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

  const confirmApprove = async () => {
    if (!approveTarget) return;
    try {
      await api.put(`/store/requests/${approveTarget.id}/approve`);
      setToast({ 
        type: 'success', 
        message: `Approved! Chemical stock released from Central Store.` 
      });
      setApproveTarget(null);
      fetchData();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to approve request' });
    }
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    try {
      await api.put(`/store/requests/${rejectTarget.id}/reject`, { rejectionReason: rejectReason });
      setToast({ type: 'warning', message: `Request rejected` });
      setRejectTarget(null);
      setRejectReason('');
      fetchData();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to reject request' });
    }
  };

  const headers = [
    { key: 'id', label: 'Request ID' },
    { 
      key: 'lab', 
      label: 'Request Origin',
      render: (row) => (
        <div>
          <div className="font-extrabold text-[#37412a] dark:text-[#e4e9d8] flex items-center gap-1.5">
            <span>{row.lab}</span>
          </div>
          {row.requestType === 'PhD Research' ? (
            <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-black text-[10px] border border-purple-300 dark:border-purple-800 uppercase tracking-wider">
              <Award size={10} /> PhD Research
            </span>
          ) : (
            <span className="inline-block mt-1 px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
              Lab Requisition
            </span>
          )}
          {row.studentName && <div className="text-[10px] font-semibold text-[#71805a]">By: {row.studentName}</div>}
        </div>
      )
    },
    { key: 'chemicalName', label: 'Chemical Name' },
    { 
      key: 'currentStockBase', 
      label: 'Store Stock', 
      render: (r) => (
        <span className="font-mono text-xs font-bold text-[#5c6e46] dark:text-[#a8be8a]">
          {(r.currentStockBase || 0).toLocaleString()} {r.baseUnit || 'ml'}
        </span>
      ) 
    },
    { key: 'quantityDisplay', label: 'Requested Qty' },
    { key: 'dateDisplay', label: 'Date' },
    { 
      key: 'status', 
      label: 'Status', 
      render: (row) => (
        <span className={`rounded px-2.5 py-1 text-xs font-black border ${statusClass[row.status]}`}>
          {row.status}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => {
        if (row.status === 'Pending') {
          return (
            <div className='flex flex-wrap gap-2'>
              <Button className='px-3 py-1 text-xs bg-[#5c6e46] hover:bg-[#475735] text-white' onClick={() => setApproveTarget(row)}>
                <CheckCircle2 size={14} className="mr-1" /> Approve
              </Button>
              <Button variant='outline' className='px-3 py-1 text-xs text-rose-700 border-rose-300 hover:bg-rose-50' onClick={() => setRejectTarget(row)}>
                <XCircle size={14} className="mr-1" /> Reject
              </Button>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-2">
            {row.status === 'Approved' && (
              <>
                <Button 
                  variant='outline'
                  className="px-2.5 py-1 text-xs border-[#71805a] text-[#556b2f] hover:bg-[#eef4e4]"
                  onClick={(e) => {
                    e.stopPropagation();
                    const matchingHistory = history.find(h => h.receiptNumber === row.receiptNumber);
                    setPreviewData({ requestData: row, chemicalData: row.chem || {}, historyData: matchingHistory });
                  }}
                >
                  <Eye size={13} className="mr-1" /> View
                </Button>
                <Button 
                  className="px-2.5 py-1 text-xs bg-[#556b2f] text-white hover:bg-[#3d4d22]"
                  onClick={(e) => {
                    e.stopPropagation();
                    const matchingHistory = history.find(h => h.receiptNumber === row.receiptNumber);
                    generateReceiptPDF(row, row.chem || {}, matchingHistory);
                  }}
                >
                  <Download size={13} className="mr-1" /> Receipt
                </Button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  const exportCsv = () => {
    const lines = [
      ['Request ID', 'Lab Name', 'Type', 'Student', 'Chemical Name', 'Current Stock', 'Qty Requested', 'Date', 'Status'].map(toCsvCell).join(','),
      ...rows.map((r) => [
        r.id,
        r.lab,
        r.requestType || 'Lab Requisition',
        r.studentName || '',
        r.chemicalName,
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
    link.download = 'RasayanFlow_Store_Requests.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <StoreLayout 
      title='Central Store Requisitions' 
      subtitle='Review laboratory stock requests and direct PhD research requisitions.'
      actions={
        <Button variant='outline' onClick={exportCsv} disabled={!rows.length} className='border-[#71805a] text-[#556b2f] hover:bg-[#eef4e4]'>
          <Download size={16} className='mr-2' /> Export CSV
        </Button>
      }
    >
      <Card title='Requisition Queue' subtitle='Process incoming lab requisitions and PhD research requests.'>
        <div className='mb-4 flex flex-wrap gap-2'>
          {filters.map((filter) => (
            <Button key={filter} variant={activeFilter === filter ? 'primary' : 'outline'} className='px-3 py-1 text-xs' onClick={() => setActiveFilter(filter)}>
              {filter}
            </Button>
          ))}
        </div>
        <div className="overflow-x-auto border border-[#e3e9d8] dark:border-[#343b2b] rounded-lg w-full">
          {loading ? (
            <div className="flex justify-center p-8"><span className="text-[#556b2f]">Loading requisitions...</span></div>
          ) : (
            <Table headers={headers} rows={rows} />
          )}
        </div>
      </Card>

      {/* APPROVE MODAL */}
      <Modal open={Boolean(approveTarget)} onClose={() => setApproveTarget(null)} title='Approve Store Requisition?' panelClassName='max-w-md w-full'>
        {approveData && (
          <div className='flex flex-col gap-4 text-xs font-bold text-[#37412a] dark:text-[#e4e9d8]'>
            {approveData.requestType === 'PhD Research' && (
              <div className="p-3 rounded bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-300">
                <div className="font-black text-xs uppercase flex items-center gap-1">
                  <Award size={14} /> PhD Direct Research Request
                </div>
                {approveData.studentName && <div className="mt-1">Scholar: <strong>{approveData.studentName}</strong></div>}
                {approveData.projectThesisName && <div>Thesis: <strong>{approveData.projectThesisName}</strong></div>}
                {approveData.supervisorName && <div>Guide: <strong>{approveData.supervisorName}</strong></div>}
              </div>
            )}

            <div className='bg-[#f9faef] p-4 rounded-lg border border-[#e3e9d8] dark:bg-[#1f2419] dark:border-[#343b2b] space-y-2'>
              <p><strong className="text-[#556b2f]">Request Origin:</strong> {approveData.lab}</p>
              <p><strong className="text-[#556b2f]">Chemical:</strong> {approveData.chemicalName}</p>
              <p><strong className="text-[#556b2f]">Total Available Store Stock:</strong> {approveData.totalBaseAvailable.toLocaleString()} {approveData.baseUnit}</p>
              <p><strong className="text-[#556b2f]">Requested Base Qty:</strong> {approveData.requestedBase.toLocaleString()} {approveData.baseUnit}</p>
              <div className="mt-3 pt-3 border-t border-[#d9e1ca] dark:border-[#414a33]">
                <p className="text-sm font-black text-slate-800 dark:text-slate-200">
                  Remaining Store Stock: <span className="text-emerald-600 font-mono">{approveData.remainingBase.toLocaleString()} {approveData.baseUnit}</span>
                </p>
              </div>
            </div>

            <div className='mt-2 flex gap-3 justify-end'>
              <Button variant='outline' onClick={() => setApproveTarget(null)}>Cancel</Button>
              <Button className="bg-[#5c6e46] hover:bg-[#475735] text-white font-black" onClick={confirmApprove}>Confirm & Issue Stock</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* REJECT MODAL */}
      <Modal open={Boolean(rejectTarget)} onClose={() => setRejectTarget(null)} title='Reject Requisition' panelClassName='max-w-md w-full'>
        {rejectTarget && (
          <div className='flex flex-col gap-4 text-xs font-bold'>
            <p className='text-slate-600 dark:text-slate-300'>Specify rejection reason for {rejectTarget.chemicalName} requested by {rejectTarget.lab}:</p>
            <textarea
              className='w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
              rows={4}
              placeholder='Enter reason here...'
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className='mt-2 flex gap-3 justify-end'>
              <Button variant='outline' onClick={() => setRejectTarget(null)}>Cancel</Button>
              <Button className='bg-rose-600 hover:bg-rose-700 text-white' onClick={confirmReject}>Reject Requisition</Button>
            </div>
          </div>
        )}
      </Modal>

      <ReceiptPreviewModal 
        isOpen={Boolean(previewData)} 
        onClose={() => setPreviewData(null)} 
        {...(previewData || {})}
      />
    </StoreLayout>
  );
}
