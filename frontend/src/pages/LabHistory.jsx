import { useEffect, useState, useMemo } from 'react';
import { Download, Search, Calendar, FileText, ArrowDownRight, ArrowUpRight, Filter, ChevronRight, CheckCircle2, Layers, History as HistoryIcon } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
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
  { label: 'All Time (2026–2056)', days: 0 },
  { label: 'Today', days: 1 },
  { label: 'This Week', days: 7 },
  { label: 'This Month', days: 30 },
  { label: 'This Year', days: 365 },
];

export default function LabHistory() {
  const user = useAuthStore((state) => state.user);
  const store = useAppStore();
  const { labs, fetchLabs } = store;

  const [selectedLabId, setSelectedLabId] = useState(() => localStorage.getItem('pharmlab-active-lab') || '');

  const [activeTab, setActiveTab] = useState('received');
  const [storeHistory, setStoreHistory] = useState([]);
  const [labHistory, setLabHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(0); // 0 = All time (2026 - 2056)
  const [sortOrder, setSortOrder] = useState('newest'); // newest | oldest

  // Assigned labs
  const assignedLabs = useMemo(() => {
    const uid = String(user?.id || user?._id || '');
    const email = (user?.email || '').toLowerCase();
    const userLabId = String(user?.labId?._id || user?.labId || '');
    return (labs || []).filter((lab) => {
      const labId = String(lab.id || lab._id);
      const isAdmin = Array.isArray(lab.admins) && lab.admins.some((a) => {
        const aId = String(a.id || a._id || a);
        const aEmail = (a.email || '').toLowerCase();
        return (uid && aId === uid) || (email && aEmail === email);
      });
      return isAdmin || (userLabId && userLabId === labId);
    });
  }, [labs, user]);

  useEffect(() => {
    fetchLabs();
  }, []);

  useEffect(() => {
    if (!assignedLabs.length) return;
    const validSelection = assignedLabs.some((lab) => String(lab.id || lab._id) === String(selectedLabId));
    if (!selectedLabId || !validSelection) {
      const nextLabId = String(assignedLabs[0].id || assignedLabs[0]._id);
      setSelectedLabId(nextLabId);
      localStorage.setItem('pharmlab-active-lab', nextLabId);
    }
  }, [assignedLabs, selectedLabId]);

  const activeLab = assignedLabs.find((lab) => String(lab.id || lab._id) === String(selectedLabId)) || assignedLabs[0] || (labs || [])[0];
  const activeLabId = activeLab?.id || activeLab?._id || '';

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const url = activeLabId ? `/lab/history?labId=${activeLabId}` : '/lab/history';
      const res = await api.get(url);
      setStoreHistory(res.data.receivedFromStore || []);
      setLabHistory(res.data.issuedToStudents || []);
    } catch (err) {
      store.setToast({ type: 'error', message: 'Failed to fetch lab history' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [activeLabId]);

  // Date filtering logic (supports all time up to +30 years)
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
    const totalReceivedVal = storeRows.reduce((acc, r) => acc + (r.valueReleased || (r.qtyRequestedBase || 1) * 145.0), 0);
    const totalIssuedVal = labRows.reduce((acc, r) => acc + (r.valueUsed || (r.qtyRequested || 1) * 145.0), 0);
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
        safeRound(r.valueReleased || (r.qtyRequestedBase || 1) * 145.0),
        new Date(r.timestamp).toLocaleString(),
        r.receiptNumber
      ].map(toCsvCell).join(','))
    ];
    downloadCsv(lines, `Lab_Received_From_Store_${activeLab?.name || 'HAP1'}.csv`);
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
        safeRound(r.valueUsed || (r.qtyRequested || 1) * 145.0),
        r.purpose,
        new Date(r.timestamp).toLocaleString(),
        r.action || 'Issued'
      ].map(toCsvCell).join(','))
    ];
    downloadCsv(lines, `Lab_Issued_To_Students_${activeLab?.name || 'HAP1'}.csv`);
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
    const title = activeTab === 'received' 
      ? `Chemicals Received from Store (${activeLab?.name || 'HAP1'})` 
      : `Chemicals Issued to Students (${activeLab?.name || 'HAP1'})`;
    
    doc.setFontSize(16);
    doc.text(title, 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()} (Audit Ledger 2026 - 2056)`, 14, 22);

    if (activeTab === 'received') {
      const tableData = storeRows.map(r => [
        r.chemicalName || '',
        `${safeRound(r.qtyRequestedBase)} ${r.baseUnit || ''}`,
        `Rs. ${safeRound(r.valueReleased || (r.qtyRequestedBase || 1) * 145.0)}`,
        r.receiptNumber || '',
        new Date(r.timestamp).toLocaleDateString()
      ]);
      autoTable(doc, {
        head: [['Chemical', 'Qty Received', 'Value', 'Receipt No.', 'Date']],
        body: tableData,
        startY: 28,
        headStyles: { fillColor: [92, 110, 70] }
      });
    } else {
      const tableData = labRows.map(r => [
        r.chemicalName || '',
        r.studentName || '',
        r.groupName || 'N/A',
        `${safeRound(r.qtyRequested)} ${r.unit || ''}`,
        `Rs. ${safeRound(r.valueUsed || (r.qtyRequested || 1) * 145.0)}`,
        new Date(r.timestamp).toLocaleDateString()
      ]);
      autoTable(doc, {
        head: [['Chemical', 'Student', 'Group', 'Qty Issued', 'Value Used', 'Date']],
        body: tableData,
        startY: 28,
        headStyles: { fillColor: [92, 110, 70] }
      });
    }

    doc.save(`Lab_${activeTab}_History_${activeLab?.name || 'HAP1'}.pdf`);
  };

  const storeHeaders = [
    { key: 'chemicalName', label: 'Chemical', render: r => <span className="font-extrabold text-[#37412a] dark:text-[#e4e9d8] text-xs">{r.chemicalName}</span> },
    { key: 'qtyReceived', label: 'Qty Received', render: r => <span className="font-mono font-bold text-xs">{safeRound(r.qtyRequestedBase).toLocaleString()} {r.baseUnit}</span> },
    { key: 'fromStore', label: 'From Store (UNT)', render: r => <span className="font-mono text-xs text-[#71805a]">{safeRound(r.qtyBeforeUNT)} → {safeRound(r.qtyAfterUNT)}</span> },
    { key: 'value', label: 'Value (₹)', render: r => <span className="font-mono font-extrabold text-xs text-amber-700 dark:text-amber-400">{formatPrice(safeRound(r.valueReleased || (r.qtyRequestedBase || 1) * 145.0))}</span> },
    { key: 'date', label: 'Timestamp', render: r => <span className="text-xs font-semibold text-[#71805a]">{new Date(r.timestamp).toLocaleString()}</span> },
    { key: 'receipt', label: 'Receipt No.', render: r => <span className="font-mono text-[11px] font-extrabold bg-[#f4f6ee] dark:bg-[#20251a] px-2 py-0.5 rounded border border-[#d9e1ca] dark:border-[#414a33] text-[#5c6e46] dark:text-[#a8be8a]">{r.receiptNumber}</span> }
  ];

  const labHeaders = [
    { key: 'chemicalName', label: 'Chemical', render: r => <span className="font-extrabold text-[#37412a] dark:text-[#e4e9d8] text-xs">{r.chemicalName}</span> },
    { key: 'studentName', label: 'Student Name', render: r => <span className="font-bold text-xs text-[#5c6e46] dark:text-[#a8be8a]">{r.studentName}</span> },
    { key: 'group', label: 'Group', render: r => r.groupName ? <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-[#f4f6ee] text-[#5c6e46] dark:bg-[#20251a] dark:text-[#a8be8a] border border-[#d9e1ca] dark:border-[#414a33]">{r.groupName}</span> : 'N/A' },
    { key: 'qtyIssued', label: 'Qty Issued', render: r => <span className="font-mono font-bold text-xs">{safeRound(r.qtyRequested).toLocaleString()} {r.unit}</span> },
    { key: 'qtyBeforeAfter', label: 'Stock Change', render: r => <span className="font-mono text-xs text-[#71805a]">{safeRound(r.qtyBefore)} → {safeRound(r.qtyAfter)} {r.unit}</span> },
    { key: 'valueUsed', label: 'Value Used', render: r => <span className="font-mono font-extrabold text-xs text-amber-700 dark:text-amber-400">{formatPrice(safeRound(r.valueUsed || (r.qtyRequested || 1) * 145.0))}</span> },
    { key: 'purpose', label: 'Purpose / Practical', render: r => <span className="text-xs font-semibold text-[#71805a]">{r.purpose || 'Class Practical'}</span> },
    { key: 'date', label: 'Timestamp', render: r => <span className="text-xs font-semibold text-[#71805a]">{new Date(r.timestamp).toLocaleString()}</span> },
    { key: 'status', label: 'Status', render: r => <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">{r.action || 'Issued'}</span> }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header & Lab Switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#e4eed3] pb-4 dark:border-[#2e3722]">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#87996c] dark:text-[#7a8f62]">
            <span>Pharma Laboratory</span>
            <ChevronRight size={12} />
            <span className="text-[#5c6e46] dark:text-[#a8be8a] font-bold">Transaction Logs &amp; Audit Trail</span>
          </div>
          <h1 className="text-2xl font-black text-[#37412a] dark:text-[#e4e9d8] mt-0.5 flex items-center gap-2">
            <HistoryIcon size={24} className="text-[#5c6e46]" />
            Lab Transactions &amp; Audit Ledger
          </h1>
          <p className="text-[#71805a] dark:text-[#c5d0b5] text-xs font-semibold">
            Permanent 30-year audit trail for Central Store stock receipts &amp; student chemical disbursements in <strong className="text-[#37412a] dark:text-[#e4e9d8]">{activeLab?.name || activeLab?.labName || 'HAP1'}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {assignedLabs.length > 1 && (
            <div className="flex items-center gap-1.5 mr-2">
              <span className="text-xs font-extrabold text-[#71805a] dark:text-[#a5b48b] flex items-center gap-1">
                <Layers size={13} /> Switch Lab:
              </span>
              {assignedLabs.map((lab) => {
                const labKey = String(lab.id || lab._id);
                const isSelected = labKey === String(activeLabId);
                return (
                  <button
                    key={labKey}
                    type="button"
                    onClick={() => {
                      setSelectedLabId(labKey);
                      localStorage.setItem('pharmlab-active-lab', labKey);
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all border ${
                      isSelected
                        ? 'bg-[#5c6e46] text-white border-[#5c6e46] dark:bg-[#e4e9d8] dark:text-[#20251a]'
                        : 'bg-white text-[#5c6e46] border-[#d9e1ca] hover:bg-[#f4f6ee] dark:bg-[#1a1d16] dark:text-[#a8be8a] dark:border-[#414a33]'
                    }`}
                  >
                    {lab.labName || lab.name || 'Lab'} ({lab.courseType || 'B.Pharm'} Y{lab.year})
                  </button>
                );
              })}
            </div>
          )}

          <button 
            type="button"
            onClick={exportPdf}
            className="flex items-center gap-1.5 bg-white text-[#5c6e46] border border-[#d9e1ca] dark:bg-[#1a1d16] dark:border-[#414a33] dark:text-[#a8be8a] hover:bg-[#f4f6ee] px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all shadow-2xs"
          >
            <FileText size={15} /> PDF Export
          </button>
          <button 
            type="button"
            onClick={activeTab === 'received' ? exportStoreCsv : exportLabCsv}
            disabled={activeTab === 'received' ? !storeRows.length : !labRows.length}
            className="flex items-center gap-1.5 bg-[#5c6e46] hover:bg-[#475735] text-white px-4 py-2 rounded-xl text-xs font-extrabold transition-all shadow-2xs disabled:opacity-50"
          >
            <Download size={15} /> CSV Export
          </button>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-[#d9e1ca] dark:border-[#414a33]">
          <div className="flex items-center justify-between text-[#71805a] dark:text-[#a5b48b] text-xs font-extrabold uppercase tracking-wider mb-1">
            <span>Store Receipts</span>
            <ArrowDownRight className="text-emerald-600 dark:text-emerald-400" size={16} />
          </div>
          <div className="text-3xl font-black text-[#37412a] dark:text-[#e4e9d8]">{stats.receivedCount}</div>
          <div className="text-[10px] font-semibold text-[#87996c] mt-1">Total Stock In transactions</div>
        </Card>

        <Card className="border-[#d9e1ca] dark:border-[#414a33]">
          <div className="flex items-center justify-between text-[#71805a] dark:text-[#a5b48b] text-xs font-extrabold uppercase tracking-wider mb-1">
            <span>Value Received</span>
            <span className="text-amber-700 dark:text-amber-400 font-black">₹</span>
          </div>
          <div className="text-3xl font-black text-amber-700 dark:text-amber-400">{formatPrice(stats.receivedValue)}</div>
          <div className="text-[10px] font-semibold text-[#87996c] mt-1">Total inventory added</div>
        </Card>

        <Card className="border-[#d9e1ca] dark:border-[#414a33]">
          <div className="flex items-center justify-between text-[#71805a] dark:text-[#a5b48b] text-xs font-extrabold uppercase tracking-wider mb-1">
            <span>Student Issues</span>
            <ArrowUpRight className="text-blue-600 dark:text-blue-400" size={16} />
          </div>
          <div className="text-3xl font-black text-[#37412a] dark:text-[#e4e9d8]">{stats.issuedCount}</div>
          <div className="text-[10px] font-semibold text-[#87996c] mt-1">Total Stock Out transactions</div>
        </Card>

        <Card className="border-[#d9e1ca] dark:border-[#414a33]">
          <div className="flex items-center justify-between text-[#71805a] dark:text-[#a5b48b] text-xs font-extrabold uppercase tracking-wider mb-1">
            <span>Value Issued</span>
            <span className="text-amber-700 dark:text-amber-400 font-black">₹</span>
          </div>
          <div className="text-3xl font-black text-amber-700 dark:text-amber-400">{formatPrice(stats.issuedValue)}</div>
          <div className="text-[10px] font-semibold text-[#87996c] mt-1">Total inventory consumed</div>
        </Card>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-[#d9e1ca] dark:border-[#414a33]">
        <button
          type="button"
          className={`py-3 px-6 text-xs font-extrabold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'received'
              ? 'border-[#5c6e46] text-[#5c6e46] dark:border-[#a8be8a] dark:text-[#a8be8a]'
              : 'border-transparent text-[#71805a] hover:text-[#37412a] dark:text-[#c5d0b5]'
          }`}
          onClick={() => setActiveTab('received')}
        >
          <ArrowDownRight size={15} />
          Received from Store ({storeRows.length})
        </button>
        <button
          type="button"
          className={`py-3 px-6 text-xs font-extrabold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'issued'
              ? 'border-[#5c6e46] text-[#5c6e46] dark:border-[#a8be8a] dark:text-[#a8be8a]'
              : 'border-transparent text-[#71805a] hover:text-[#37412a] dark:text-[#c5d0b5]'
          }`}
          onClick={() => setActiveTab('issued')}
        >
          <ArrowUpRight size={15} />
          Issued to Students ({labRows.length})
        </button>
      </div>

      {/* Filter Controls & Content Card */}
      <Card className="border-[#d9e1ca] dark:border-[#414a33]">
        <div className="mb-5 flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#87996c]" size={15} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chemical, receipt, student..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#d9e1ca] bg-white dark:bg-[#1a1d16] dark:border-[#414a33] text-xs font-semibold text-[#37412a] dark:text-[#e4e9d8] outline-none focus:ring-2 focus:ring-[#5c6e46]/20"
            />
          </div>

          {/* Presets & Sorting */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-[#f4f6ee] dark:bg-[#1a1d16] p-1 rounded-2xl border border-[#d9e1ca] dark:border-[#414a33]">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setDateFilter(p.days)}
                  className={`px-3 py-1 text-xs font-extrabold rounded-xl transition ${
                    dateFilter === p.days
                      ? 'bg-[#5c6e46] text-white shadow-2xs dark:bg-[#e4e9d8] dark:text-[#20251a]'
                      : 'text-[#5c6e46] hover:bg-white/60 dark:text-[#a8be8a] dark:hover:bg-[#20251a]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="rounded-xl border border-[#d9e1ca] dark:border-[#414a33] bg-white dark:bg-[#1a1d16] px-3 py-1.5 text-xs font-extrabold text-[#37412a] dark:text-[#e4e9d8] outline-none"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto border border-[#d9e1ca] dark:border-[#414a33] rounded-2xl">
          <style>{`table th, table td { white-space: nowrap; }`}</style>
          {loading ? (
            <div className="flex justify-center p-12 text-[#87996c] text-xs font-bold">Loading audit history...</div>
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
