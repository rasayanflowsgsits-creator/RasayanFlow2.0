import { Activity, Download, Eye, Search, Calendar, Filter, RefreshCw, Layers } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Table from '../components/ui/Table';
import api from '../services/api';
import { toFrontendChemical } from '../utils/storeMapper';
import StoreLayout from './StoreLayout';
import { parsePackSize, safeRound, totalStock } from '../utils/storeHelpers';

function StatusBadge({ status }) {
  const colors = {
    'In Stock': 'bg-emerald-500 text-white dark:bg-emerald-600',
    'Low Stock': 'bg-amber-500 text-white dark:bg-amber-600',
    'Out of Stock': 'bg-rose-500 text-white dark:bg-rose-600',
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold shadow-xs ${colors[status] || colors['In Stock']}`}>
      {status || 'In Stock'}
    </span>
  );
}

export function UpdateTypeBadge({ type }) {
  const colors = {
    'Bulk Import': 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800',
    'Bulk Upload': 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800',
    'Lab Transfer': 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800',
    'Issued to Lab': 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800',
    'Issued to PhD Scholar': 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800',
    'Manual Edit': 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    'Stock Replenishment': 'bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/70 dark:text-teal-300 dark:border-teal-800',
    'Stock Restock (Quantity Added)': 'bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/70 dark:text-teal-300 dark:border-teal-800',
    'Initial Import': 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800',
    'Added New': 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800',
    'Added New Chemical': 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800',
    'Deleted': 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800',
  };
  return (
    <span className={`inline-block rounded-md border px-2 py-0.5 text-xs font-bold ${colors[type] || colors['Manual Edit']}`}>
      {type || 'Manual Edit'}
    </span>
  );
}

const formatINR = (val) => {
  const num = safeRound(val);
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

function normalizeTrackingLog(log) {
  const snapshot = log.snapshot || {};
  const frontendSnapshot = snapshot && Object.keys(snapshot).length ? toFrontendChemical(snapshot) : null;
  const timestamp = log.timestamp || log.createdAt || new Date().toISOString();
  const id = log._id || log.id || log.trackId || `${log.chemicalId || log.chemicalName}-${timestamp}`;

  const packStr = log.packSize || snapshot.packSize || frontendSnapshot?.['Pack Size'] || '';
  const packData = parsePackSize(packStr);
  const nQty = safeRound(log.newQty);
  const pQty = safeRound(log.previousQty);
  const uPrice = safeRound(log.unitPrice || log.newPrice || snapshot.unitPrice || 0);

  const totalVolNum = safeRound(nQty * packData.baseValue);
  const totalVolStr = log.totalVolume || (nQty ? `${totalVolNum.toLocaleString('en-IN')} ${packData.baseUnit}` : '--');

  return {
    ...log,
    id,
    trackId: id,
    timestamp,
    chemicalId: log.chemicalId || snapshot.chemicalId || frontendSnapshot?.['Chemical ID'] || 'N/A',
    chemicalName: log.chemicalName || snapshot.name || frontendSnapshot?.['Chemical Name'] || 'Unknown Chemical',
    casNumber: log.casNumber || log.cas || snapshot.cas || frontendSnapshot?.['CAS Number'] || '--',
    formula: log.formula || snapshot.formula || frontendSnapshot?.['Molecular Formula'] || '--',
    grade: log.grade || snapshot.grade || frontendSnapshot?.Grade || 'LR',
    packSize: packStr || '--',
    updateType: log.updateType || 'Manual Edit',
    previousQty: pQty,
    newQty: nQty,
    qtyChange: safeRound(log.qtyChange !== undefined ? log.qtyChange : (nQty - pQty)),
    unitPrice: uPrice,
    totalVolume: totalVolStr,
    totalPrice: safeRound(log.totalPrice || (nQty * uPrice)),
    totalValue: safeRound(log.totalValue || (nQty * uPrice)),
    status: log.status || snapshot.status || frontendSnapshot?.status || 'In Stock',
    updatedBy: log.updatedBy || 'Store Manager',
    snapshot,
    frontendSnapshot,
  };
}

export default function StoreTracking() {
  const [trackingLogs, setTrackingLogs] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterDate, setFilterDate] = useState('All Time');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [viewTarget, setViewTarget] = useState(null);

  const fetchTrackingData = async () => {
    setLoading(true);
    setError('');
    try {
      const [trackingRes, inventoryRes] = await Promise.all([
        api.get('/store/tracking'),
        api.get('/store/inventory'),
      ]);
      setTrackingLogs((trackingRes.data || []).map(normalizeTrackingLog));
      setInventory((inventoryRes.data || []).map(toFrontendChemical));
    } catch (requestError) {
      console.error('Failed to load tracking data:', requestError);
      setError(requestError?.response?.data?.message || 'Failed to load tracking data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackingData();
  }, []);

  const filteredLogs = useMemo(() => {
    return trackingLogs.filter((log) => {
      const query = search.trim().toLowerCase();
      if (query) {
        const searchable = [log.chemicalName, log.chemicalId, log.formula, log.casNumber].join(' ').toLowerCase();
        if (!searchable.includes(query)) return false;
      }

      if (filterType !== 'All') {
        if (filterType === 'Bulk Import' && !(log.updateType.includes('Bulk') || log.updateType.includes('Import'))) return false;
        if (filterType === 'Lab Transfer' && !(log.updateType.includes('Lab') || log.updateType.includes('Issued'))) return false;
        if (filterType === 'Manual Edit' && log.updateType !== 'Manual Edit') return false;
        if (filterType === 'Stock Replenishment' && !(log.updateType.includes('Replenish') || log.updateType.includes('Restock'))) return false;
        if (filterType === 'Initial Import' && !(log.updateType.includes('Initial') || log.updateType.includes('Added'))) return false;
      }

      if (filterStatus !== 'All' && log.status !== filterStatus) return false;

      if (filterDate !== 'All Time') {
        const logDate = new Date(log.timestamp);
        const now = new Date();

        if (filterDate === 'Today') {
          const startToday = new Date();
          startToday.setHours(0, 0, 0, 0);
          const endToday = new Date();
          endToday.setHours(23, 59, 59, 999);
          if (logDate < startToday || logDate > endToday) return false;
        } else if (filterDate === 'This Week') {
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (logDate < oneWeekAgo) return false;
        } else if (filterDate === 'This Month') {
          if (logDate.getMonth() !== now.getMonth() || logDate.getFullYear() !== now.getFullYear()) return false;
        } else if (filterDate === 'Last 3 Months') {
          const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          if (logDate < threeMonthsAgo) return false;
        } else if (filterDate === 'Custom Range') {
          if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            if (logDate < start) return false;
          }
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (logDate > end) return false;
          }
        }
      }

      return true;
    });
  }, [trackingLogs, search, filterType, filterDate, startDate, endDate, filterStatus]);

  // FIX 2: Updates today calculation with robust 00:00:00 to 23:59:59 filtering
  const updatesToday = useMemo(() => {
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    const endToday = new Date();
    endToday.setHours(23, 59, 59, 999);

    return trackingLogs.filter((log) => {
      const d = new Date(log.timestamp);
      return d >= startToday && d <= endToday;
    }).length;
  }, [trackingLogs]);

  // FIX 1: Inventory Value display calculation
  const totalInventoryValue = useMemo(() => {
    return inventory.reduce((sum, chemical) => {
      const val = Number(chemical['Total Current Value (INR)'] || chemical.totalValue || 0);
      return sum + val;
    }, 0);
  }, [inventory]);

  const totalTracked = new Set(trackingLogs.map((log) => log.chemicalId || log.chemicalName).filter(Boolean)).size || trackingLogs.length;

  const mostUpdated = useMemo(() => {
    const counts = trackingLogs.reduce((acc, log) => {
      acc[log.chemicalName] = (acc[log.chemicalName] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '--';
  }, [trackingLogs]);

  // FIX 7: Export CSV with all 16 requested columns in exact order
  const downloadCSV = () => {
    const exportData = filteredLogs.map((log, idx) => ({
      '#': idx + 1,
      Timestamp: new Date(log.timestamp).toLocaleString('en-IN'),
      'Chemical ID': log.chemicalId,
      'Chemical Name': log.chemicalName,
      'CAS Number': log.casNumber,
      Formula: log.formula,
      Grade: log.grade,
      'Pack Size': log.packSize,
      'Previous Qty (UNT)': safeRound(log.previousQty),
      'New Qty (UNT)': safeRound(log.newQty),
      'Total Volume': log.totalVolume,
      'Total Price (INR)': safeRound(log.totalPrice),
      'Qty Change': safeRound(log.qtyChange) > 0 ? `+${safeRound(log.qtyChange)} UNT` : `${safeRound(log.qtyChange)} UNT`,
      'Update Type': log.updateType,
      Status: log.status,
      'Updated By': log.updatedBy,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tracking_Logs');
    const todayStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `RasayanFlow_Tracking_${todayStr}.csv`);
  };

  // FIX 3: Add missing columns to Audit Log Table
  const headers = [
    { key: 'index', label: '#', render: (_row, index) => index + 1 },
    { key: 'timestamp', label: 'Timestamp', render: (row) => new Date(row.timestamp).toLocaleString('en-IN') },
    { key: 'chemicalId', label: 'Chemical ID' },
    { key: 'chemicalName', label: 'Chemical Name' },
    { key: 'casNumber', label: 'CAS Number' },
    { key: 'formula', label: 'Formula' },
    { key: 'grade', label: 'Grade' },
    { key: 'packSize', label: 'Pack Size' },
    { key: 'previousQty', label: 'PREV QTY', render: (row) => `${safeRound(row.previousQty)} UNT` },
    { key: 'newQty', label: 'NEW QTY', render: (row) => `${safeRound(row.newQty)} UNT` },
    { key: 'totalVolume', label: 'TOTAL VOLUME', render: (row) => row.totalVolume },
    { key: 'totalPrice', label: 'TOTAL PRICE', render: (row) => formatINR(row.totalPrice) },
    {
      key: 'qtyChange',
      label: 'QTY CHANGE',
      render: (row) => {
        const change = safeRound(row.qtyChange);
        if (change === 0) return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">0</span>;
        if (change > 0) return <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">+{change} UNT</span>;
        return <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800 dark:bg-rose-950/70 dark:text-rose-300">{change} UNT</span>;
      },
    },
    { key: 'updateType', label: 'UPDATE TYPE', render: (row) => <UpdateTypeBadge type={row.updateType} /> },
    { key: 'status', label: 'STATUS', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'updatedBy', label: 'UPDATED BY', render: (row) => <span className="font-semibold text-xs text-[#556b2f] dark:text-[#a8be8a]">{row.updatedBy}</span> },
    {
      key: 'view',
      label: 'ACTION',
      render: (row) => (
        <Button variant="outline" className="px-2.5 py-1 text-xs border-[#71805a] text-[#556b2f] hover:bg-[#eef4e4]" onClick={(e) => { e.stopPropagation(); setViewTarget(row); }}>
          <Eye size={13} className="mr-1" /> View
        </Button>
      ),
    },
  ];

  const renderDetailField = (label, value) => (
    <div className="pb-3">
      <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#71805a] dark:text-[#c5d0b5]">{label}</p>
      <p className="mt-1 break-words text-xs font-bold text-slate-900 dark:text-slate-100">{value || '--'}</p>
    </div>
  );

  return (
    <StoreLayout
      title="Chemical Tracking"
      subtitle="Full audit log of store inventory imports, edits, and lab issue activity."
      actions={
        <Button variant="outline" className="border-[#71805a] text-[#556b2f] hover:bg-[#eef4e4] dark:border-[#4e5d35] dark:text-[#c5d0b5] dark:hover:bg-[#28301f] font-bold" onClick={downloadCSV} disabled={!filteredLogs.length}>
          <Download size={16} className="mr-1.5" /> Export CSV
        </Button>
      }
    >
      {/* STAT CARDS (FIX 1 & FIX 2) */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Tracked Card */}
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#eef4e4] p-3 text-[#556b2f] dark:bg-[#28301f] dark:text-[#a8be8a]">
              <Layers size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#71805a] dark:text-[#c5d0b5]">Total Tracked</p>
              <h3 className="text-2xl font-black text-[#3c4e23] dark:text-[#eef4e8]">{totalTracked}</h3>
            </div>
          </div>
        </Card>

        {/* Updates Today Card (FIX 2) */}
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-teal-50 p-3 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
              <RefreshCw size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#71805a] dark:text-[#c5d0b5]">Updates Today</p>
              <h3 className="text-2xl font-black text-[#3c4e23] dark:text-[#eef4e8]">{updatesToday}</h3>
            </div>
          </div>
        </Card>

        {/* Inventory Value Card (FIX 1 — FULL RUPEE SYMBOL & PROPER READABLE FORMAT) */}
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <Activity size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#71805a] dark:text-[#c5d0b5]">Inventory Value</p>
              <h3 className="text-xl sm:text-2xl font-black text-[#3c4e23] dark:text-[#eef4e8] tracking-tight whitespace-nowrap overflow-visible">
                {formatINR(totalInventoryValue)}
              </h3>
            </div>
          </div>
        </Card>

        {/* Most Updated Card */}
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-50 p-3 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              <Calendar size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#71805a] dark:text-[#c5d0b5]">Most Updated</p>
              <h3 className="truncate text-base font-black text-[#3c4e23] dark:text-[#eef4e8]" title={mostUpdated}>{mostUpdated}</h3>
            </div>
          </div>
        </Card>
      </div>

      {/* AUDIT LOGS TABLE & FILTERS (FIX 3 & FIX 6) */}
      <Card title="Audit Logs" subtitle="View and search historical updates from the store database.">
        <div className="mb-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#556b2f] dark:text-[#a8be8a]" size={16} />
              <Input className="pl-9 text-xs font-bold" placeholder="Search name, ID, CAS, formula..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            {/* All Types Dropdown */}
            <select className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold focus:border-[#556b2f] focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="All">All Types</option>
              <option value="Bulk Import">Bulk Import</option>
              <option value="Lab Transfer">Lab Transfer</option>
              <option value="Manual Edit">Manual Edit</option>
              <option value="Stock Replenishment">Stock Replenishment</option>
              <option value="Initial Import">Initial Import</option>
            </select>

            {/* All Time Dropdown */}
            <select className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold focus:border-[#556b2f] focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}>
              <option value="All Time">All Time</option>
              <option value="Today">Today</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
              <option value="Last 3 Months">Last 3 Months</option>
              <option value="Custom Range">Custom Range</option>
            </select>

            {/* All Statuses Dropdown */}
            <select className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold focus:border-[#556b2f] focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-white" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="All">All Statuses</option>
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
          </div>

          {/* Custom Date Range Pickers if selected */}
          {filterDate === 'Custom Range' && (
            <div className="flex flex-wrap items-center gap-3 p-3 bg-[#f4f6ee] dark:bg-[#20251a] rounded-xl border border-[#cfd8bd] dark:border-[#414a33] text-xs font-bold">
              <span className="text-[#556b2f] dark:text-[#a8be8a]">Custom Date Range:</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-md border p-1 bg-white dark:bg-slate-800" />
              <span>to</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-md border p-1 bg-white dark:bg-slate-800" />
            </div>
          )}

          {/* Results Count Counter */}
          <div className="flex justify-between items-center px-1 text-xs font-bold text-[#556b2f] dark:text-[#a8be8a]">
            <span>Showing {filteredLogs.length} of {trackingLogs.length} entries</span>
            {search && <button onClick={() => setSearch('')} className="hover:underline">Clear Search</button>}
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-dashed border-[#cfd8bd] px-5 py-10 text-center text-xs font-bold text-[#71805a] dark:border-[#4e5d35] dark:text-[#c5d0b5]">
            Loading audit tracking logs...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-xs font-bold text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">{error}</div>
        ) : (
          <div className="tracking-table-container relative w-full max-w-full overflow-hidden rounded-xl border border-[#e3e9d8] dark:border-[#343b2b]">
            <style>{`
              .tracking-table-container table { border-collapse: collapse; width: max-content; }
              .tracking-table-container th, .tracking-table-container td { border: 1px solid #e3e9d8 !important; white-space: nowrap; font-size: 11px; font-weight: 700; padding: 8px 12px; }
              .dark .tracking-table-container th, .dark .tracking-table-container td { border: 1px solid #343b2b !important; }
              .tracking-table-container thead { position: sticky; top: 0; z-index: 10; background-color: #f4f5eb; }
              .dark .tracking-table-container thead { background-color: #242a1d; }
              .tracking-table-container tr:nth-child(even) td { background-color: #f9fdf5; }
              .dark .tracking-table-container tr:nth-child(even) td { background-color: #1f2419; }
            `}</style>
            <div className="max-h-[600px] w-full overflow-x-auto overflow-y-auto">
              <Table headers={headers} rows={filteredLogs} onRowClick={(row) => setViewTarget(row)} />
            </div>
          </div>
        )}
      </Card>

      {/* FIX 5: STOCK OVERVIEW CARDS SECTION */}
      <div className="mt-8">
        <div className="mb-4">
          <h2 className="text-lg font-black text-[#2e3d19] dark:text-[#eef4e8]">Chemical Stock Overview</h2>
          <p className="text-xs font-bold text-[#71805a] dark:text-[#a5b48b]">Visual stock levels for all tracked chemicals</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {inventory.map((chem) => {
            const receivedQty = Number(chem['Received Quantity'] || chem.receivedQty || chem['Available Quantity'] || chem.availableQty || 0);
            const availableQty = Number(chem['Available Quantity'] || chem.availableQty || 0);
            const packStr = chem['Pack Size'] || chem.packSize || '';
            const packData = parsePackSize(packStr);

            const percentage = receivedQty > 0 ? safeRound((availableQty / receivedQty) * 100) : 0;
            const totalBase = safeRound(receivedQty * packData.baseValue);
            const availableBase = safeRound(availableQty * packData.baseValue);
            const usedBase = safeRound(Math.max(receivedQty - availableQty, 0) * packData.baseValue);

            // Progress bar color rules:
            // > 50%: green, 25-50%: yellow, < 25%: red, 0%: dark red
            let barColor = 'bg-emerald-500';
            if (percentage <= 0) barColor = 'bg-rose-950';
            else if (percentage < 25) barColor = 'bg-rose-500';
            else if (percentage < 50) barColor = 'bg-amber-500';

            return (
              <Card key={chem.id || chem._id || chem['Chemical ID'] || chem['Chemical Name']}>
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-black text-[#2e3d19] dark:text-[#eef4e8] truncate" title={chem['Chemical Name'] || chem.name}>
                        {chem['Chemical Name'] || chem.name}
                      </h4>
                      <span className="font-mono text-[10px] font-bold text-[#71805a] dark:text-[#a5b48b] block">
                        ID: {chem['Chemical ID'] || chem.chemicalId || 'N/A'}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-[#5c6e46] text-white text-[10px] font-black uppercase shrink-0">
                      {chem.Grade || chem.grade || 'LR'}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-black">
                      <span className="text-[#5c6e46] dark:text-[#a8be8a]">Available Stock Ratio</span>
                      <span className="text-[#37412a] dark:text-[#e4e9d8]">{percentage}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden p-0.5">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                        style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* 3 Values Below Bar */}
                  <div className="grid grid-cols-3 gap-1 pt-2 border-t border-[#e4eeb5] dark:border-[#38432a] text-center">
                    <div className="bg-[#f4f6ee] dark:bg-[#1a1d16] p-1.5 rounded-lg">
                      <span className="text-[9px] font-black uppercase text-[#71805a] dark:text-[#a5b48b] block">Total</span>
                      <span className="text-[11px] font-extrabold text-[#2e3d19] dark:text-[#eef4e8]">
                        {totalBase.toLocaleString('en-IN')} {packData.baseUnit}
                      </span>
                    </div>

                    <div className="bg-[#f4f6ee] dark:bg-[#1a1d16] p-1.5 rounded-lg">
                      <span className="text-[9px] font-black uppercase text-[#71805a] dark:text-[#a5b48b] block">Available</span>
                      <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400">
                        {availableBase.toLocaleString('en-IN')} {packData.baseUnit}
                      </span>
                    </div>

                    <div className="bg-[#f4f6ee] dark:bg-[#1a1d16] p-1.5 rounded-lg">
                      <span className="text-[9px] font-black uppercase text-[#71805a] dark:text-[#a5b48b] block">Used</span>
                      <span className="text-[11px] font-extrabold text-amber-700 dark:text-amber-400">
                        {usedBase.toLocaleString('en-IN')} {packData.baseUnit}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* DETAIL MODAL FOR HISTORICAL RECORD */}
      <Modal open={Boolean(viewTarget)} onClose={() => setViewTarget(null)} title="Historical Record Details" panelClassName="max-w-[750px] w-full">
        {viewTarget ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-[#d9e1ca] bg-[#f9faef] p-4 dark:border-[#414a33] dark:bg-[#1f2419]">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide text-[#71805a] dark:text-[#c5d0b5]">Update Type</p>
                <div className="mt-1"><UpdateTypeBadge type={viewTarget.updateType} /></div>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide text-[#71805a] dark:text-[#c5d0b5]">Date & Time</p>
                <p className="mt-1 text-xs font-bold">{new Date(viewTarget.timestamp).toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide text-[#71805a] dark:text-[#c5d0b5]">Quantity Change</p>
                <p className="mt-1 text-xs font-black">{viewTarget.previousQty} UNT &rarr; {viewTarget.newQty} UNT</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide text-[#71805a] dark:text-[#c5d0b5]">Total Value</p>
                <p className="mt-1 text-xs font-black text-emerald-700 dark:text-emerald-400">{formatINR(viewTarget.totalPrice || viewTarget.totalValue)}</p>
              </div>
            </div>

            <div className="grid max-h-[50vh] gap-x-6 overflow-y-auto pr-3 text-xs sm:grid-cols-3">
              {renderDetailField('Chemical ID', viewTarget.chemicalId)}
              {renderDetailField('Chemical Name', viewTarget.chemicalName)}
              {renderDetailField('CAS Number', viewTarget.casNumber)}
              {renderDetailField('Molecular Formula', viewTarget.formula)}
              {renderDetailField('Grade', viewTarget.grade)}
              {renderDetailField('Pack Size', viewTarget.packSize)}
              {renderDetailField('PREV QTY', `${viewTarget.previousQty} UNT`)}
              {renderDetailField('NEW QTY', `${viewTarget.newQty} UNT`)}
              {renderDetailField('TOTAL VOLUME', viewTarget.totalVolume)}
              {renderDetailField('Unit Price', formatINR(viewTarget.unitPrice))}
              {renderDetailField('TOTAL PRICE', formatINR(viewTarget.totalPrice))}
              {renderDetailField('Updated By', viewTarget.updatedBy)}
              <div className="col-span-full pb-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-[#71805a] dark:text-[#c5d0b5]">Status</p>
                <p className="mt-1"><StatusBadge status={viewTarget.status} /></p>
              </div>
            </div>

            <div className="mt-4 flex justify-center pt-2">
              <Button variant="outline" className="w-full max-w-[200px] font-bold" onClick={() => setViewTarget(null)}>Close</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </StoreLayout>
  );
}
