import { Download, Search, Eye } from 'lucide-react';
import { useMemo, useState } from 'react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Table from '../components/ui/Table';
import StoreLayout from './StoreLayout';
import useStoreManagerMock from './storeManagerMock';
import { generateReceiptPDF } from '../utils/pdfGenerator';
import ReceiptPreviewModal from './ReceiptPreviewModal';

function toCsvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export default function StoreHistory() {
  const history = useStoreManagerMock((state) => state.history);
  const chemicals = useStoreManagerMock((state) => state.chemicals);
  const requests = useStoreManagerMock((state) => state.requests);
  const [search, setSearch] = useState('');
  const [previewData, setPreviewData] = useState(null);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return history.filter((entry) => !query || entry.chemicalName?.toLowerCase().includes(query) || entry.lab?.toLowerCase().includes(query));
  }, [history, search]);

    const exportCsv = () => {
      const lines = [
        ['Chemical ID', 'Chemical Name', 'Lab Name', 'Qty Before', 'Requested', 'Qty After', 'Unit Price (₹)', 'Value Before (₹)', 'Value After (₹)', 'Action By', 'Date', 'Status'].map(toCsvCell).join(','),
        ...rows.map((entry) => [
          entry.chemicalId,
          entry.chemicalName,
          entry.lab,
          `${(entry.qtyBeforeBase || 0).toLocaleString()} ${entry.baseUnit || 'ml'}`,
          `${(entry.qtyRequestedBase || entry.qtyRequested || 0).toLocaleString()} ${entry.baseUnit || 'ml'}`,
          `${(entry.qtyAfterBase || 0).toLocaleString()} ${entry.baseUnit || 'ml'}`,
          entry.unitPrice,
          entry.totalValueBefore,
          entry.totalValueAfter,
          entry.actionBy,
          new Date(entry.date).toLocaleString(),
          entry.status
        ].map(toCsvCell).join(',')),
      ];
      const blob = new Blob([`${lines.join('\n')}\n`], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'RasayanFlow_History.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const statusClass = {
    Approved: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
    Rejected: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800',
  };

  const formatPrice = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);

  const headers = [
    { key: 'chemicalName', label: 'Chemical Name' },
    { key: 'chemicalId', label: 'Chemical ID' },
    { key: 'lab', label: 'Lab Name' },
    { key: 'qtyBefore', label: 'Qty Before', render: (r) => `Before: ${(r.qtyBeforeBase || 0).toLocaleString()} ${r.baseUnit || 'ml'}` },
    { key: 'qtyRequested', label: 'Requested', render: (r) => `Req: ${(r.qtyRequestedBase || r.qtyRequested || 0).toLocaleString()} ${r.baseUnit || 'ml'}` },
    { key: 'qtyAfter', label: 'Qty After', render: (r) => `After: ${(r.qtyAfterBase || 0).toLocaleString()} ${r.baseUnit || 'ml'}` },
    { key: 'unitPrice', label: 'Unit Price (₹)', render: (r) => formatPrice(r.unitPrice) },
    { key: 'totalValueBefore', label: 'Value Before', render: (r) => formatPrice(r.totalValueBefore) },
    { key: 'totalValueAfter', label: 'Value After', render: (r) => formatPrice(r.totalValueAfter) },
    { key: 'actionBy', label: 'Action By' },
    { key: 'date', label: 'Date', render: (r) => new Date(r.date).toLocaleString() },
    { key: 'status', label: 'Status', render: (r) => (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold border ${statusClass[r.status] || ''}`}>
        {r.status === 'Approved' ? '✅' : '❌'} {r.status}
      </span>
    ) },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => {
        if (r.status !== 'Approved') return null;
        return (
          <div className="flex gap-2">
            <Button 
              variant='outline'
              className="px-3 py-1 text-xs border-[#71805a] text-[#556b2f] hover:bg-[#eef4e4] dark:border-[#4e5d35] dark:text-[#c5d0b5] dark:hover:bg-[#28301f]"
              onClick={(e) => {
                e.stopPropagation();
                const chem = chemicals.find(c => c['Chemical ID'] === r.chemicalId || c['Chemical Name'] === r.chemicalName) || {};
                const req = requests.find(req => req.receiptNumber === r.receiptNumber) || { id: 'N/A' };
                setPreviewData({ requestData: req, chemicalData: chem, historyData: r });
              }}
            >
              <Eye size={14} className="mr-1" /> View
            </Button>
            <Button 
              className="px-3 py-1 text-xs bg-[#556b2f] text-white hover:bg-[#3d4d22]"
              onClick={(e) => {
                e.stopPropagation();
                const chem = chemicals.find(c => c['Chemical ID'] === r.chemicalId || c['Chemical Name'] === r.chemicalName) || {};
                const req = requests.find(req => req.receiptNumber === r.receiptNumber) || { id: 'N/A' };
                generateReceiptPDF(req, chem, r);
              }}
            >
              <Download size={14} className="mr-1" /> Receipt
            </Button>
          </div>
        );
      }
    }
  ];

  return (
    <StoreLayout
      title='History'
      subtitle='Full audit log of all lab requests and allotments.'
      actions={
        <Button variant='outline' onClick={exportCsv} disabled={!rows.length} className='border-[#71805a] text-[#556b2f] hover:bg-[#eef4e4] dark:border-[#4e5d35] dark:text-[#c5d0b5] dark:hover:bg-[#28301f]'>
          <Download size={16} className='mr-2' /> Export CSV
        </Button>
      }
    >
      <Card title='Request History' subtitle='Search by chemical name or lab name.'>
        <div className='mb-4 max-w-md'>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder='Search chemical or lab...' />
          </div>
          <div className='mt-2 flex items-center gap-2 text-xs text-[#71805a] dark:text-[#c5d0b5]'>
            {rows.length} matching row{rows.length === 1 ? '' : 's'}
          </div>
        </div>
        <div className="overflow-x-auto border border-[#e3e9d8] dark:border-[#343b2b] rounded-lg">
          <style>{`
            table th, table td { white-space: nowrap; }
          `}</style>
          <Table headers={headers} rows={rows} />
        </div>
      </Card>
      
      <ReceiptPreviewModal 
        isOpen={Boolean(previewData)} 
        onClose={() => setPreviewData(null)} 
        {...(previewData || {})}
      />
    </StoreLayout>
  );
}
