import { useEffect, useState, useMemo } from 'react';
import { Download, Search } from 'lucide-react';
import useAppStore from '../store/appStore';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import api from '../services/api';

const safeRound = (num) => {
  if (isNaN(num) || num === null || num === undefined) return 0;
  return Math.round(num * 100) / 100;
};

const formatPrice = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);

function toCsvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export default function LabHistory() {
  const [activeTab, setActiveTab] = useState('received');
  const [storeHistory, setStoreHistory] = useState([]);
  const [labHistory, setLabHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const setToast = useAppStore((state) => state.setToast);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/lab/history');
      setStoreHistory(res.data.receivedFromStore || []);
      setLabHistory(res.data.issuedToStudents || []);
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to fetch lab history' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const storeRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return storeHistory.filter(r => !q || r.chemicalName?.toLowerCase().includes(q) || r.receiptNumber?.toLowerCase().includes(q));
  }, [storeHistory, search]);

  const labRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return labHistory.filter(r => !q || r.chemicalName?.toLowerCase().includes(q) || r.studentName?.toLowerCase().includes(q));
  }, [labHistory, search]);

  const exportStoreCsv = () => {
    const lines = [
      ['Chemical', 'Qty Received', 'Base Unit', 'Original Req Unit', 'Store UNT Deducted', 'Value (₹)', 'Date', 'Receipt'].map(toCsvCell).join(','),
      ...storeRows.map(r => [
        r.chemicalName,
        safeRound(r.qtyRequestedBase),
        r.baseUnit,
        r.unit,
        safeRound((r.qtyBeforeUNT || 0) - (r.qtyAfterUNT || 0)),
        safeRound(r.valueReleased),
        new Date(r.timestamp).toLocaleString(),
        r.receiptNumber
      ].map(toCsvCell).join(','))
    ];
    downloadCsv(lines, 'Lab_Received_From_Store.csv');
  };

  const exportLabCsv = () => {
    const lines = [
      ['Chemical', 'Student Name', 'Group', 'Qty Issued', 'Qty Before', 'Qty After', 'Unit', 'Value Used (₹)', 'Purpose', 'Date', 'Status'].map(toCsvCell).join(','),
      ...labRows.map(r => [
        r.chemicalName,
        r.studentName,
        r.groupName || 'N/A',
        safeRound(r.qtyRequested),
        safeRound(r.qtyBefore),
        safeRound(r.qtyAfter),
        r.unit,
        safeRound(r.valueUsed),
        r.purpose,
        new Date(r.timestamp).toLocaleString(),
        r.action
      ].map(toCsvCell).join(','))
    ];
    downloadCsv(lines, 'Lab_Issued_To_Students.csv');
  };

  const downloadCsv = (lines, filename) => {
    const blob = new Blob([`${lines.join('\n')}\n`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const storeHeaders = [
    { key: 'chemicalName', label: 'Chemical' },
    { key: 'qtyReceived', label: 'Qty Received', render: r => `${safeRound(r.qtyRequestedBase).toLocaleString()} ${r.baseUnit}` },
    { key: 'fromStore', label: 'From Store (UNT)', render: r => `${safeRound(r.qtyBeforeUNT)} → ${safeRound(r.qtyAfterUNT)}` },
    { key: 'value', label: 'Value (₹)', render: r => formatPrice(safeRound(r.valueReleased)) },
    { key: 'date', label: 'Date', render: r => new Date(r.timestamp).toLocaleString() },
    { key: 'receipt', label: 'Receipt No.', render: r => r.receiptNumber }
  ];

  const labHeaders = [
    { key: 'chemicalName', label: 'Chemical' },
    { key: 'studentName', label: 'Student Name' },
    { key: 'group', label: 'Group', render: r => r.groupName || 'N/A' },
    { key: 'qtyIssued', label: 'Qty Issued', render: r => `${safeRound(r.qtyRequested).toLocaleString()} ${r.unit}` },
    { key: 'qtyBeforeAfter', label: 'Stock Change', render: r => `${safeRound(r.qtyBefore)} → ${safeRound(r.qtyAfter)} ${r.unit}` },
    { key: 'valueUsed', label: 'Value Used', render: r => formatPrice(safeRound(r.valueUsed)) },
    { key: 'purpose', label: 'Purpose', render: r => r.purpose || 'N/A' },
    { key: 'date', label: 'Date', render: r => new Date(r.timestamp).toLocaleString() },
    { key: 'status', label: 'Status', render: r => r.action }
  ];

  return (
    <div className="space-y-6 pb-10 max-w-7xl mx-auto">
      <div>
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Lab History</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Complete audit log of chemicals received from the store and issued to students.</p>
      </div>

      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'received'
              ? 'border-indigo-500 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
          }`}
          onClick={() => setActiveTab('received')}
        >
          Received from Store
        </button>
        <button
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'issued'
              ? 'border-indigo-500 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
          }`}
          onClick={() => setActiveTab('issued')}
        >
          Issued to Students
        </button>
      </div>

      <Card>
        <div className="mb-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <Input className="pl-9" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search history..." />
          </div>
          <Button 
            variant="outline" 
            onClick={activeTab === 'received' ? exportStoreCsv : exportLabCsv}
            disabled={activeTab === 'received' ? !storeRows.length : !labRows.length}
          >
            <Download size={16} className="mr-2" /> Export CSV
          </Button>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
          <style>{`table th, table td { white-space: nowrap; }`}</style>
          {loading ? (
            <div className="flex justify-center p-8 text-slate-500">Loading history...</div>
          ) : (
            <Table 
              headers={activeTab === 'received' ? storeHeaders : labHeaders} 
              rows={activeTab === 'received' ? storeRows : labRows} 
            />
          )}
        </div>
      </Card>
    </div>
  );
}
