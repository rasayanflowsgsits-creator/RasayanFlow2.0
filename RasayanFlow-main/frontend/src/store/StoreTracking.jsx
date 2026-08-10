import { Activity, Download, Eye, Search } from 'lucide-react';
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
import { calcTotalChemical, safeRound } from './storeManagerMock';

function StatusBadge({ status }) {
  const colors = {
    'In Stock': 'bg-emerald-500 text-white dark:bg-emerald-600',
    'Low Stock': 'bg-amber-500 text-white dark:bg-amber-600',
    'Out of Stock': 'bg-rose-500 text-white dark:bg-rose-600',
  };
  return <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${colors[status] || colors['In Stock']}`}>{status || 'In Stock'}</span>;
}

export function UpdateTypeBadge({ type }) {
  const colors = {
    'Bulk Upload': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
    Import: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
    'Manual Edit': 'bg-[#eef4e4] text-[#556b2f] border-[#d9e1ca] dark:bg-[#28301f] dark:text-[#c5d0b5] dark:border-[#414a33]',
    'Added New': 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800',
    'Issued to Lab': 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800',
    'Stock Replenishment': 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  };
  return <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${colors[type] || colors['Manual Edit']}`}>{type || 'Manual Edit'}</span>;
}

const money = (value) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(value || 0));
const moneyWithCurrency = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value || 0));

function getSnapshotValue(snapshot, frontendSnapshot, backendKey, frontendKey) {
  return frontendSnapshot?.[frontendKey] ?? snapshot?.[backendKey] ?? '--';
}

function normalizeTrackingLog(log) {
  const snapshot = log.snapshot || {};
  const frontendSnapshot = snapshot && Object.keys(snapshot).length ? toFrontendChemical(snapshot) : null;
  const timestamp = log.timestamp || log.createdAt || new Date().toISOString();
  const id = log._id || log.id || log.trackId || `${log.chemicalId || log.chemicalName}-${timestamp}`;

  return {
    ...log,
    id,
    trackId: id,
    timestamp,
    chemicalId: log.chemicalId || snapshot.chemicalId || frontendSnapshot?.['Chemical ID'] || '',
    chemicalName: log.chemicalName || snapshot.name || frontendSnapshot?.['Chemical Name'] || 'Unknown chemical',
    casNumber: log.casNumber || snapshot.cas || frontendSnapshot?.['CAS Number'] || '',
    formula: log.formula || snapshot.formula || frontendSnapshot?.['Molecular Formula'] || '',
    smiles: log.smiles || snapshot.smiles || frontendSnapshot?.['SMILES ID'] || '',
    grade: log.grade || snapshot.grade || frontendSnapshot?.Grade || '',
    packSize: log.packSize || snapshot.packSize || frontendSnapshot?.['Pack Size'] || '',
    updateType: log.updateType || 'Manual Edit',
    previousQty: Number(log.previousQty || 0),
    newQty: Number(log.newQty || 0),
    qtyChange: Number(log.qtyChange || 0),
    previousPrice: Number(log.previousPrice || 0),
    newPrice: Number(log.newPrice || 0),
    totalChemical: log.totalChemical || '--',
    totalPrice: Number(log.totalPrice || 0),
    totalValue: Number(log.totalValue || 0),
    status: log.status || snapshot.status || frontendSnapshot?.status || 'In Stock',
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
  const [filterStatus, setFilterStatus] = useState('All');
  const [viewTarget, setViewTarget] = useState(null);

  useEffect(() => {
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

    fetchTrackingData();
  }, []);

  const filteredLogs = useMemo(() => {
    return trackingLogs.filter((log) => {
      const query = search.trim().toLowerCase();
      if (query) {
        const searchable = [log.chemicalName, log.chemicalId, log.formula, log.casNumber].join(' ').toLowerCase();
        if (!searchable.includes(query)) return false;
      }

      if (filterType !== 'All' && log.updateType !== filterType) return false;
      if (filterStatus !== 'All' && log.status !== filterStatus) return false;

      if (filterDate !== 'All Time') {
        const date = new Date(log.timestamp);
        const now = new Date();
        if (filterDate === 'Today' && date.toDateString() !== now.toDateString()) return false;
        if (filterDate === 'This Week' && now - date > 7 * 24 * 60 * 60 * 1000) return false;
        if (filterDate === 'This Month' && (date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear())) return false;
      }

      return true;
    });
  }, [trackingLogs, search, filterType, filterDate, filterStatus]);

  const updateTypes = useMemo(() => ['All', ...Array.from(new Set(trackingLogs.map((log) => log.updateType).filter(Boolean)))], [trackingLogs]);
  const totalTracked = new Set(trackingLogs.map((log) => log.chemicalId || log.chemicalName).filter(Boolean)).size;
  const updatesToday = trackingLogs.filter((log) => new Date(log.timestamp).toDateString() === new Date().toDateString()).length;
  const totalInventoryValue = inventory.reduce((sum, chemical) => sum + Number(chemical['Total Current Value (INR)'] || 0), 0);
  const mostUpdated = useMemo(() => {
    const counts = trackingLogs.reduce((acc, log) => {
      acc[log.chemicalName] = (acc[log.chemicalName] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '--';
  }, [trackingLogs]);

  const downloadCSV = () => {
    const exportData = filteredLogs.map((log) => ({
      Timestamp: new Date(log.timestamp).toLocaleString(),
      'Chemical ID': log.chemicalId,
      'Chemical Name': log.chemicalName,
      'CAS Number': log.casNumber,
      Formula: log.formula,
      SMILES: log.smiles,
      Grade: log.grade,
      'Pack Size': log.packSize,
      'Prev Qty': log.previousQty,
      'New Qty': log.newQty,
      'Qty Change': log.qtyChange,
      'Previous Unit Price INR': log.previousPrice,
      'New Unit Price INR': log.newPrice,
      'Total Chemical': log.totalChemical,
      'Total Price INR': log.totalPrice,
      'Total Value INR': log.totalValue,
      'Update Type': log.updateType,
      Status: log.status,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tracking_Logs');
    XLSX.writeFile(wb, 'Chemical_Tracking_Logs.xlsx');
  };

  const headers = [
    { key: 'index', label: '#', render: (_row, index) => index + 1 },
    { key: 'timestamp', label: 'Timestamp', render: (row) => new Date(row.timestamp).toLocaleString() },
    { key: 'chemicalId', label: 'Chemical ID' },
    { key: 'chemicalName', label: 'Chemical Name' },
    { key: 'casNumber', label: 'CAS Number' },
    { key: 'formula', label: 'Formula' },
    { key: 'grade', label: 'Grade' },
    { key: 'packSize', label: 'Pack Size' },
    { key: 'previousQty', label: 'Prev Qty', render: (row) => `${safeRound(row.previousQty)} UNT (${calcTotalChemical(row.previousQty, row.packSize)})` },
    { key: 'newQty', label: 'New Qty', render: (row) => `${safeRound(row.newQty)} UNT (${calcTotalChemical(row.newQty, row.packSize)})` },
    {
      key: 'qtyChange',
      label: 'Qty Change',
      render: (row) => {
        const change = safeRound(row.qtyChange);
        if (change === 0) return <span className='rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400'>0</span>;
        if (change > 0) return <span className='rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400'>+{change}</span>;
        return <span className='rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400'>{change}</span>;
      },
    },
    { key: 'newPrice', label: 'Unit Price', render: (row) => moneyWithCurrency(row.newPrice) },
    { key: 'totalValue', label: 'Total Value', render: (row) => moneyWithCurrency(row.totalValue) },
    { key: 'updateType', label: 'Update Type', render: (row) => <UpdateTypeBadge type={row.updateType} /> },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'view',
      label: 'View',
      render: (row) => (
        <Button variant='outline' className='px-3 py-1 text-xs' onClick={(event) => { event.stopPropagation(); setViewTarget(row); }}>
          <Eye size={14} /> View
        </Button>
      ),
    },
  ];

  const renderDetailField = (label, value) => (
    <div className='pb-3'>
      <p className='text-[11px] font-semibold uppercase tracking-wide text-[#71805a] dark:text-[#c5d0b5]'>{label}</p>
      <p className='mt-1 break-words text-sm text-slate-900 dark:text-slate-100'>{value || '--'}</p>
    </div>
  );

  return (
    <StoreLayout
      title='Chemical Tracking'
      subtitle='Full audit log of store inventory imports, edits, and lab issue activity.'
      actions={
        <Button variant='outline' className='border-[#71805a] text-[#556b2f] hover:bg-[#eef4e4] dark:border-[#4e5d35] dark:text-[#c5d0b5] dark:hover:bg-[#28301f]' onClick={downloadCSV} disabled={!filteredLogs.length}>
          <Download size={16} /> Export CSV
        </Button>
      }
    >
      <div className='mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {[
          ['Total Tracked', totalTracked],
          ['Updates Today', updatesToday],
          ['Inventory Value', `${money(totalInventoryValue)} INR`],
          ['Most Updated', mostUpdated],
        ].map(([label, value]) => (
          <Card key={label}>
            <div className='flex items-center gap-3'>
              <div className='rounded-xl bg-[#eef4e4] p-3 text-[#556b2f] dark:bg-[#28301f] dark:text-[#a8be8a]'>
                <Activity size={24} />
              </div>
              <div className='min-w-0'>
                <p className='text-sm font-medium text-[#71805a] dark:text-[#c5d0b5]'>{label}</p>
                <h3 className='truncate text-2xl font-bold text-[#3c4e23] dark:text-[#eef4e8]'>{value}</h3>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card title='Audit Logs' subtitle='View and search historical updates from the store database.'>
        <div className='mb-4 grid gap-3 md:grid-cols-4'>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400' size={16} />
            <Input className='pl-9' placeholder='Search name, ID, CAS, formula...' value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <select className='w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#556b2f] focus:outline-none focus:ring-1 focus:ring-[#556b2f] dark:border-slate-600 dark:bg-slate-800 dark:text-white' value={filterType} onChange={(event) => setFilterType(event.target.value)}>
            {updateTypes.map((type) => <option key={type} value={type}>{type === 'All' ? 'All Types' : type}</option>)}
          </select>
          <select className='w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#556b2f] focus:outline-none focus:ring-1 focus:ring-[#556b2f] dark:border-slate-600 dark:bg-slate-800 dark:text-white' value={filterDate} onChange={(event) => setFilterDate(event.target.value)}>
            <option value='All Time'>All Time</option>
            <option value='Today'>Today</option>
            <option value='This Week'>This Week</option>
            <option value='This Month'>This Month</option>
          </select>
          <select className='w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#556b2f] focus:outline-none focus:ring-1 focus:ring-[#556b2f] dark:border-slate-600 dark:bg-slate-800 dark:text-white' value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
            <option value='All'>All Statuses</option>
            <option value='In Stock'>In Stock</option>
            <option value='Low Stock'>Low Stock</option>
            <option value='Out of Stock'>Out of Stock</option>
          </select>
        </div>

        {loading ? (
          <div className='rounded-xl border border-dashed border-[#cfd8bd] px-5 py-10 text-center text-[#71805a] dark:border-[#4e5d35] dark:text-[#c5d0b5]'>Loading tracking logs...</div>
        ) : error ? (
          <div className='rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300'>{error}</div>
        ) : (
          <div className='tracking-table-container relative w-full max-w-full overflow-hidden rounded-xl border border-[#e3e9d8] dark:border-[#343b2b]'>
            <style>{`
              .tracking-table-container table { border-collapse: collapse; width: max-content; }
              .tracking-table-container th, .tracking-table-container td { border-bottom: 1px solid #e3e9d8 !important; white-space: nowrap; }
              .dark .tracking-table-container th, .dark .tracking-table-container td { border-bottom: 1px solid #343b2b !important; }
              .tracking-table-container thead { position: sticky; top: 0; z-index: 10; background-color: #f4f5eb; }
              .dark .tracking-table-container thead { background-color: #242a1d; }
            `}</style>
            <div className='max-h-[600px] w-full overflow-x-auto overflow-y-auto'>
              <Table headers={headers} rows={filteredLogs} onRowClick={(row) => setViewTarget(row)} />
            </div>
          </div>
        )}
      </Card>

      <Modal open={Boolean(viewTarget)} onClose={() => setViewTarget(null)} title='Historical Record Details' panelClassName='max-w-[750px] w-full'>
        {viewTarget ? (
          <div className='flex flex-col gap-4'>
            <div className='flex flex-wrap justify-between gap-6 rounded-xl border border-[#d9e1ca] bg-[#f9faef] p-4 dark:border-[#414a33] dark:bg-[#1f2419]'>
              <div>
                <p className='text-[11px] font-semibold uppercase tracking-wide text-[#71805a] dark:text-[#c5d0b5]'>Update Type</p>
                <div className='mt-1'><UpdateTypeBadge type={viewTarget.updateType} /></div>
              </div>
              <div>
                <p className='text-[11px] font-semibold uppercase tracking-wide text-[#71805a] dark:text-[#c5d0b5]'>Date & Time</p>
                <p className='mt-1 text-sm font-semibold'>{new Date(viewTarget.timestamp).toLocaleString()}</p>
              </div>
              <div>
                <p className='text-[11px] font-semibold uppercase tracking-wide text-[#71805a] dark:text-[#c5d0b5]'>Quantity Change</p>
                <p className='mt-1 text-sm font-bold'>{viewTarget.previousQty} &rarr; {viewTarget.newQty}</p>
              </div>
              <div>
                <p className='text-[11px] font-semibold uppercase tracking-wide text-[#71805a] dark:text-[#c5d0b5]'>Total Value</p>
                <p className='mt-1 text-sm font-bold'>{moneyWithCurrency(viewTarget.totalValue)}</p>
              </div>
            </div>

            <div className='grid max-h-[50vh] gap-x-6 overflow-y-auto pr-3 text-sm sm:grid-cols-3'>
              {renderDetailField('Chemical ID', viewTarget.chemicalId)}
              {renderDetailField('Chemical Name', viewTarget.chemicalName)}
              {renderDetailField('CAS Number', viewTarget.casNumber)}
              {renderDetailField('Synonyms', getSnapshotValue(viewTarget.snapshot, viewTarget.frontendSnapshot, 'synonyms', 'Synonyms'))}
              {renderDetailField('Molecular Formula', viewTarget.formula)}
              {renderDetailField('Molecular Weight', getSnapshotValue(viewTarget.snapshot, viewTarget.frontendSnapshot, 'molecularWeight', 'Molecular Weight'))}
              {renderDetailField('Supplier', getSnapshotValue(viewTarget.snapshot, viewTarget.frontendSnapshot, 'supplier', 'Supplier'))}
              {renderDetailField('Batch Number', getSnapshotValue(viewTarget.snapshot, viewTarget.frontendSnapshot, 'batchNumber', 'Batch Number'))}
              {renderDetailField('Grade', viewTarget.grade)}
              {renderDetailField('Pack Size', viewTarget.packSize)}
              {renderDetailField('Standard Unit', getSnapshotValue(viewTarget.snapshot, viewTarget.frontendSnapshot, 'unit', 'Standard Unit'))}
              {renderDetailField('Unit Price', moneyWithCurrency(viewTarget.newPrice))}
              {renderDetailField('Available Quantity', viewTarget.newQty)}
              {renderDetailField('Total Chemical', viewTarget.totalChemical)}
              {renderDetailField('Hazard Class', getSnapshotValue(viewTarget.snapshot, viewTarget.frontendSnapshot, 'hazard', 'Hazard Class'))}
              <div className='sm:col-span-2'>{renderDetailField('Safety Wear', getSnapshotValue(viewTarget.snapshot, viewTarget.frontendSnapshot, 'safety', 'Safety Wear'))}</div>
              <div className='col-span-full pb-3'>
                <p className='text-[11px] font-semibold uppercase tracking-wide text-[#71805a] dark:text-[#c5d0b5]'>Status</p>
                <p className='mt-1'><StatusBadge status={viewTarget.status} /></p>
              </div>
            </div>

            <div className='mt-4 flex justify-center pt-2'>
              <Button variant='outline' className='w-full max-w-[200px]' onClick={() => setViewTarget(null)}>Close</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </StoreLayout>
  );
}
