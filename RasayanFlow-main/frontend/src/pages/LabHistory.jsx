import { useEffect, useState, useMemo } from 'react';
import { Download, Search, Calendar, FileText, ArrowDownRight, ArrowUpRight, Filter } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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

const PRESETS = [
  { label: 'All Time', days: 0 },
  { label: 'Today', days: 1 },
  { label: 'This Week', days: 7 },
  { label: 'This Month', days: 30 },
];

export default function LabHistory() {
  const [activeTab, setActiveTab] = useState('received');
  const [storeHistory, setStoreHistory] = useState([]);
  const [labHistory, setLabHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(0); // 0 = All time
  const [sortOrder, setSortOrder] = useState('newest'); // newest | oldest

  const setToast = useAppStore((state) => state.toast);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/lab/history');
      setStoreHistory(res.data.receivedFromStore || []);
      setLabHistory(res.data.issuedToStudents || []);
    } catch (err) {
      useAppStore.getState().setToast({ type: 'error', message: 'Failed to fetch lab history' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Date filtering logic
  const filterByPreset = (timestamp) => {
    if (!dateFilter || dateFilter === 0) return true;
    if (!timestamp) return false;
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= dateFilter;
  };

  // Filtered & Sorted Rows
  const storeRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = storeHistory.filter(r => {
      const matchesSearch = !q || r.chemicalName?.toLowerCase().includes(q) || r.receiptNumber?.toLowerCase().includes(q);
      return matchesSearch && filterByPreset(r.timestamp);
    });

    rows.sort((a, b) => {
      const da = new Date(a.timestamp || 0);
      const db = new Date(b.timestamp || 0);
      return sortOrder === 'newest' ? db - da : da - db;
    });

    return rows;
  }, [storeHistory, search, dateFilter, sortOrder]);

  const labRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = labHistory.filter(r => {
      const matchesSearch = !q || r.chemicalName?.toLowerCase().includes(q) || r.studentName?.toLowerCase().includes(q);
      return matchesSearch && filterByPreset(r.timestamp);
    });

    rows.sort((a, b) => {
      const da = new Date(a.timestamp || 0);
      const db = new Date(b.timestamp || 0);
      return sortOrder === 'newest' ? db - da : da - db;
    });

    return rows;
  }, [labHistory, search, dateFilter, sortOrder]);

  // Statistics Summary
  const stats = useMemo(() => {
    const totalReceivedVal = storeRows.reduce((acc, r) => acc + (r.valueReleased || 0), 0);
    const totalIssuedVal = labRows.reduce((acc, r) => acc + (r.valueUsed || 0), 0);
    return {
      receivedCount: storeRows.length,
      issuedCount: labRows.length,
      receivedValue: totalReceivedVal,
      issuedValue: totalIssuedVal,
    };
  }, [storeRows, labRows]);

  // Export CSV
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

  // Export PDF
  const exportPdf = () => {
    const doc = new jsPDF();
    const title = activeTab === 'received' ? 'Chemicals Received from Store' : 'Chemicals Issued to Students';
    
    doc.setFontSize(16);
    doc.text(title, 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

    if (activeTab === 'received') {
      const tableData = storeRows.map(r => [
        r.chemicalName || '',
        `${safeRound(r.qtyRequestedBase)} ${r.baseUnit || ''}`,
        `Rs. ${safeRound(r.valueReleased)}`,
        r.receiptNumber || '',
        new Date(r.timestamp).toLocaleDateString()
      ]);
      autoTable(doc, {
        head: [['Chemical', 'Qty Received', 'Value', 'Receipt No.', 'Date']],
        body: tableData,
        startY: 28,
        headStyles: { fillColor: [85, 107, 47] }
      });
    } else {
      const tableData = labRows.map(r => [
        r.chemicalName || '',
        r.studentName || '',
        r.groupName || 'N/A',
        `${safeRound(r.qtyRequested)} ${r.unit || ''}`,
        `Rs. ${safeRound(r.valueUsed)}`,
        new Date(r.timestamp).toLocaleDateString()
      ]);
      autoTable(doc, {
        head: [['Chemical', 'Student', 'Group', 'Qty Issued', 'Value Used', 'Date']],
        body: tableData,
        startY: 28,
        headStyles: { fillColor: [85, 107, 47] }
      });
    }

    doc.save(`Lab_${activeTab}_History.pdf`);
  };

  const storeHeaders = [
    { key: 'chemicalName', label: 'Chemical', render: r => <span className="font-semibold text-[#3c4e23] dark:text-[#eef4e8]">{r.chemicalName}</span> },
    { key: 'qtyReceived', label: 'Qty Received', render: r => `${safeRound(r.qtyRequestedBase).toLocaleString()} ${r.baseUnit}` },
    { key: 'fromStore', label: 'From Store (UNT)', render: r => `${safeRound(r.qtyBeforeUNT)} → ${safeRound(r.qtyAfterUNT)}` },
    { key: 'value', label: 'Value (₹)', render: r => <span className="font-medium text-[#c8a030]">{formatPrice(safeRound(r.valueReleased))}</span> },
    { key: 'date', label: 'Date', render: r => new Date(r.timestamp).toLocaleString() },
    { key: 'receipt', label: 'Receipt No.', render: r => <span className="font-mono text-xs bg-[#f4f5eb] dark:bg-[#28301f] px-2 py-1 rounded border border-[#d9e1ca] dark:border-[#414a33]">{r.receiptNumber}</span> }
  ];

  const labHeaders = [
    { key: 'chemicalName', label: 'Chemical', render: r => <span className="font-semibold text-[#3c4e23] dark:text-[#eef4e8]">{r.chemicalName}</span> },
    { key: 'studentName', label: 'Student Name', render: r => r.studentName },
    { key: 'group', label: 'Group', render: r => r.groupName ? <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[#f0f4e8] text-[#556b2f] dark:bg-[#28301f] dark:text-[#a5b48b]">{r.groupName}</span> : 'N/A' },
    { key: 'qtyIssued', label: 'Qty Issued', render: r => `${safeRound(r.qtyRequested).toLocaleString()} ${r.unit}` },
    { key: 'qtyBeforeAfter', label: 'Stock Change', render: r => `${safeRound(r.qtyBefore)} → ${safeRound(r.qtyAfter)} ${r.unit}` },
    { key: 'valueUsed', label: 'Value Used', render: r => <span className="font-medium text-[#c8a030]">{formatPrice(safeRound(r.valueUsed))}</span> },
    { key: 'purpose', label: 'Purpose', render: r => r.purpose || 'N/A' },
    { key: 'date', label: 'Date', render: r => new Date(r.timestamp).toLocaleString() },
    { key: 'status', label: 'Status', render: r => <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">{r.action}</span> }
  ];

  return (
    <div className="space-y-6 pb-10 max-w-7xl mx-auto">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#3c4e23] dark:text-[#eef4e8]">Lab History & Audit Log</h2>
          <p className="mt-1 text-sm text-[#71805a] dark:text-[#c5d0b5]">
            Complete chronological record of all stock receipts and chemical disbursements.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportPdf} className="border-[#556b2f] text-[#556b2f] dark:text-[#a5b48b]">
            <FileText size={16} className="mr-2" /> PDF Export
          </Button>
          <Button 
            className="bg-[#556b2f] hover:bg-[#435525] text-white" 
            onClick={activeTab === 'received' ? exportStoreCsv : exportLabCsv}
            disabled={activeTab === 'received' ? !storeRows.length : !labRows.length}
          >
            <Download size={16} className="mr-2" /> CSV Export
          </Button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between text-[#71805a] dark:text-[#a5b48b] text-xs font-medium mb-1">
            <span>Store Receipts</span>
            <ArrowDownRight className="text-emerald-600 dark:text-emerald-400" size={16} />
          </div>
          <div className="text-2xl font-bold text-[#3c4e23] dark:text-[#eef4e8]">{stats.receivedCount}</div>
          <div className="text-xs text-[#87996c] mt-1">Total Stock In transactions</div>
        </Card>
        <Card>
          <div className="flex items-center justify-between text-[#71805a] dark:text-[#a5b48b] text-xs font-medium mb-1">
            <span>Value Received</span>
            <span className="text-[#c8a030] font-bold">₹</span>
          </div>
          <div className="text-2xl font-bold text-[#c8a030]">{formatPrice(stats.receivedValue)}</div>
          <div className="text-xs text-[#87996c] mt-1">Total inventory added</div>
        </Card>
        <Card>
          <div className="flex items-center justify-between text-[#71805a] dark:text-[#a5b48b] text-xs font-medium mb-1">
            <span>Student Issues</span>
            <ArrowUpRight className="text-blue-600 dark:text-blue-400" size={16} />
          </div>
          <div className="text-2xl font-bold text-[#3c4e23] dark:text-[#eef4e8]">{stats.issuedCount}</div>
          <div className="text-xs text-[#87996c] mt-1">Total Stock Out transactions</div>
        </Card>
        <Card>
          <div className="flex items-center justify-between text-[#71805a] dark:text-[#a5b48b] text-xs font-medium mb-1">
            <span>Value Issued</span>
            <span className="text-[#8fad5a] font-bold">₹</span>
          </div>
          <div className="text-2xl font-bold text-[#8fad5a]">{formatPrice(stats.issuedValue)}</div>
          <div className="text-xs text-[#87996c] mt-1">Total inventory consumed</div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#d9e1ca] dark:border-[#414a33]">
        <button
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'received'
              ? 'border-[#556b2f] text-[#556b2f] dark:border-[#a5b48b] dark:text-[#a5b48b]'
              : 'border-transparent text-[#71805a] hover:text-[#3c4e23] dark:text-[#c5d0b5]'
          }`}
          onClick={() => setActiveTab('received')}
        >
          <ArrowDownRight size={16} />
          Received from Store ({storeRows.length})
        </button>
        <button
          className={`py-3 px-6 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'issued'
              ? 'border-[#556b2f] text-[#556b2f] dark:border-[#a5b48b] dark:text-[#a5b48b]'
              : 'border-transparent text-[#71805a] hover:text-[#3c4e23] dark:text-[#c5d0b5]'
          }`}
          onClick={() => setActiveTab('issued')}
        >
          <ArrowUpRight size={16} />
          Issued to Students ({labRows.length})
        </button>
      </div>

      {/* Filter Controls & Content Card */}
      <Card>
        <div className="mb-6 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#87996c]" size={16} />
            <Input className="pl-9" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search chemical, receipt, student..." />
          </div>

          {/* Presets & Sorting */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-[#f4f5eb] dark:bg-[#1c2117] p-1 rounded-lg border border-[#d9e1ca] dark:border-[#4e5d35]">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setDateFilter(p.days)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                    dateFilter === p.days
                      ? 'bg-[#556b2f] text-white shadow-sm'
                      : 'text-[#71805a] dark:text-[#c5d0b5] hover:bg-[#e8ede0] dark:hover:bg-[#28301f]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="rounded-lg border border-[#cfd8bd] dark:border-[#4e5d35] bg-white dark:bg-[#1a1d16] px-3 py-1.5 text-xs text-[#3c4e23] dark:text-[#eef4e8] outline-none"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto border border-[#d9e1ca] dark:border-[#414a33] rounded-xl">
          <style>{`table th, table td { white-space: nowrap; }`}</style>
          {loading ? (
            <div className="flex justify-center p-12 text-[#87996c] font-medium">Loading audit history...</div>
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
