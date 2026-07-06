import { Download, Search, Activity, Eye, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import StoreLayout from './StoreLayout';
import useStoreManagerMock from './storeManagerMock';

function SectionHeading({ title }) {
  return (
    <div className="col-span-full mb-3 mt-4 border-b border-[#e3e9d8] dark:border-[#343b2b] pb-2">
      <h3 className="text-sm font-bold text-[#556b2f] dark:text-[#a8be8a]">{title}</h3>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    'In Stock': 'bg-emerald-500 text-white dark:bg-emerald-600',
    'Low Stock': 'bg-amber-500 text-white dark:bg-amber-600',
    'Out of Stock': 'bg-rose-500 text-white dark:bg-rose-600',
  };
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${colors[status] || colors['In Stock']} inline-block shadow-sm`}>{status}</span>;
}

export function UpdateTypeBadge({ type }) {
  const colors = {
    'Bulk Upload': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
    'Import': 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
    'Manual Edit': 'bg-[#eef4e4] text-[#556b2f] border-[#d9e1ca] dark:bg-[#28301f] dark:text-[#c5d0b5] dark:border-[#414a33]',
    'Added New': 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800',
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium border ${colors[type] || colors['Manual Edit']} inline-block`}>{type}</span>;
}

export default function StoreTracking() {
  const trackingLogs = useStoreManagerMock((state) => state.trackingLogs);
  const chemicals = useStoreManagerMock((state) => state.chemicals);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterDate, setFilterDate] = useState('All Time');
  const [filterStatus, setFilterStatus] = useState('All');
  const [viewTarget, setViewTarget] = useState(null);

  const filteredLogs = useMemo(() => {
    return trackingLogs.filter(log => {
      if (search) {
        const q = search.toLowerCase();
        if (!log.chemicalName?.toLowerCase().includes(q) &&
            !log.chemicalId?.toLowerCase().includes(q) &&
            !log.formula?.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (filterType !== 'All' && log.updateType !== filterType) return false;
      if (filterStatus !== 'All' && log.status !== filterStatus) return false;
      
      if (filterDate !== 'All Time') {
        const d = new Date(log.timestamp);
        const now = new Date();
        if (filterDate === 'Today') {
          if (d.toDateString() !== now.toDateString()) return false;
        } else if (filterDate === 'This Week') {
          const diff = now - d;
          if (diff > 7 * 24 * 60 * 60 * 1000) return false;
        } else if (filterDate === 'This Month') {
          if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
        }
      }
      return true;
    });
  }, [trackingLogs, search, filterType, filterDate, filterStatus]);

  // Summary Stats
  const totalTracked = new Set(trackingLogs.map(l => l.chemicalId)).size;
  const updatesToday = trackingLogs.filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString()).length;
  const totalValue = chemicals.reduce((acc, c) => acc + (c['Total Value (INR)'] || 0), 0);
  
  const mostUpdatedObj = trackingLogs.reduce((acc, l) => {
    acc[l.chemicalName] = (acc[l.chemicalName] || 0) + 1;
    return acc;
  }, {});
  let mostUpdated = '--';
  let maxUpdates = 0;
  Object.entries(mostUpdatedObj).forEach(([name, count]) => {
    if (count > maxUpdates) {
      maxUpdates = count;
      mostUpdated = name;
    }
  });

  const downloadCSV = () => {
    const exportData = filteredLogs.map(l => ({
      Timestamp: new Date(l.timestamp).toLocaleString(),
      'Chemical ID': l.chemicalId,
      'Chemical Name': l.chemicalName,
      'CAS Number': l.casNumber,
      'Formula': l.formula,
      'SMILES': l.smiles,
      'Grade': l.grade,
      'Pack Size': l.packSize,
      'Prev Qty': l.previousQty,
      'New Qty': l.newQty,
      'Total Chemical': l.totalChemical,
      'Total Price': new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(l.totalPrice),
      'Qty Change': l.qtyChange,
      'Unit Price (₹)': l.newPrice,
      'Total Value (₹)': l.totalValue,
      'Update Type': l.updateType,
      'Status': l.status
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tracking_Logs");
    XLSX.writeFile(wb, "Chemical_Tracking_Logs.csv");
  };

  const headers = [
    { key: 'index', label: '#', render: (_, idx) => idx + 1 },
    { key: 'timestamp', label: 'Timestamp', render: (row) => new Date(row.timestamp).toLocaleString() },
    { key: 'chemicalId', label: 'Chemical ID' },
    { key: 'chemicalName', label: 'Chemical Name' },
    { key: 'casNumber', label: 'CAS Number' },
    { key: 'formula', label: 'Formula' },
    { key: 'smiles', label: 'SMILES' },
    { key: 'grade', label: 'Grade' },
    { key: 'packSize', label: 'Pack Size' },
    { key: 'previousQty', label: 'Prev Qty' },
    { key: 'newQty', label: 'New Qty' },
    { key: 'totalChemical', label: 'Total Chemical' },
    { 
      key: 'totalPrice', 
      label: 'Total Price', 
      render: (row) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(row.totalPrice)
    },
    { 
      key: 'qtyChange', 
      label: 'Qty Change',
      render: (row) => {
        const val = row.qtyChange;
        if (val === 0) return <span className="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded-full text-xs font-semibold">0</span>;
        if (val > 0) return <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full text-xs font-semibold">+{val}</span>;
        return <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full text-xs font-semibold">{val}</span>;
      }
    },
    { key: 'newPrice', label: 'Unit Price (₹)' },
    { key: 'totalValue', label: 'Total Value (₹)' },
    { key: 'updateType', label: 'Update Type', render: (row) => <UpdateTypeBadge type={row.updateType} /> },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];

  const renderDetailField = (label, value) => (
    <div className='pb-3'>
      <p className='text-[11px] font-semibold uppercase tracking-wide text-[#71805a] dark:text-[#c5d0b5]'>{label}</p>
      <p className='mt-1 text-sm text-slate-900 dark:text-slate-100 break-words'>{value || '--'}</p>
    </div>
  );

  return (
    <StoreLayout
      title='Chemical Tracking'
      subtitle='Full audit log of all chemical updates and changes.'
      actions={
        <Button variant='outline' className='border-[#71805a] text-[#556b2f] hover:bg-[#eef4e4] dark:border-[#4e5d35] dark:text-[#c5d0b5] dark:hover:bg-[#28301f]' onClick={downloadCSV}>
          <Download size={16} className='mr-2' /> Export CSV
        </Button>
      }
    >
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6'>
        <Card>
          <div className='flex items-center gap-3'>
            <div className='rounded-xl bg-[#eef4e4] p-3 text-[#556b2f] dark:bg-[#28301f] dark:text-[#a8be8a]'>
              <Activity size={24} />
            </div>
            <div>
              <p className='text-sm font-medium text-[#71805a] dark:text-[#c5d0b5]'>Total Tracked</p>
              <h3 className='text-2xl font-bold text-[#3c4e23] dark:text-[#eef4e8]'>{totalTracked}</h3>
            </div>
          </div>
        </Card>
        <Card>
          <div className='flex items-center gap-3'>
            <div className='rounded-xl bg-[#eef4e4] p-3 text-[#556b2f] dark:bg-[#28301f] dark:text-[#a8be8a]'>
              <Activity size={24} />
            </div>
            <div>
              <p className='text-sm font-medium text-[#71805a] dark:text-[#c5d0b5]'>Updates Today</p>
              <h3 className='text-2xl font-bold text-[#3c4e23] dark:text-[#eef4e8]'>{updatesToday}</h3>
            </div>
          </div>
        </Card>
        <Card>
          <div className='flex items-center gap-3'>
            <div className='rounded-xl bg-[#eef4e4] p-3 text-[#556b2f] dark:bg-[#28301f] dark:text-[#a8be8a]'>
              <Activity size={24} />
            </div>
            <div>
              <p className='text-sm font-medium text-[#71805a] dark:text-[#c5d0b5]'>Total Inventory Value</p>
              <h3 className='text-2xl font-bold text-[#3c4e23] dark:text-[#eef4e8]'>{totalValue.toLocaleString()} ₹</h3>
            </div>
          </div>
        </Card>
        <Card>
          <div className='flex items-center gap-3'>
            <div className='rounded-xl bg-[#eef4e4] p-3 text-[#556b2f] dark:bg-[#28301f] dark:text-[#a8be8a]'>
              <Activity size={24} />
            </div>
            <div>
              <p className='text-sm font-medium text-[#71805a] dark:text-[#c5d0b5]'>Most Updated</p>
              <h3 className='text-lg font-bold text-[#3c4e23] dark:text-[#eef4e8] truncate w-[150px]'>{mostUpdated}</h3>
            </div>
          </div>
        </Card>
      </div>

      <Card title='Audit Logs' subtitle='View and search historical updates.'>
        <div className='mb-4 grid gap-3 md:grid-cols-4'>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <Input className="pl-9" placeholder='Search Name/ID/Formula...' value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className='w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#556b2f] focus:outline-none focus:ring-1 focus:ring-[#556b2f] dark:border-slate-600 dark:bg-slate-800 dark:text-white' value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value='All'>All Types</option>
            <option value='Added New'>Added New</option>
            <option value='Manual Edit'>Manual Edit</option>
            <option value='Bulk Upload'>Bulk Upload</option>
            <option value='Import'>Import</option>
          </select>
          <select className='w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#556b2f] focus:outline-none focus:ring-1 focus:ring-[#556b2f] dark:border-slate-600 dark:bg-slate-800 dark:text-white' value={filterDate} onChange={e => setFilterDate(e.target.value)}>
            <option value='All Time'>All Time</option>
            <option value='Today'>Today</option>
            <option value='This Week'>This Week</option>
            <option value='This Month'>This Month</option>
          </select>
          <select className='w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#556b2f] focus:outline-none focus:ring-1 focus:ring-[#556b2f] dark:border-slate-600 dark:bg-slate-800 dark:text-white' value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value='All'>All Statuses</option>
            <option value='In Stock'>In Stock</option>
            <option value='Low Stock'>Low Stock</option>
            <option value='Out of Stock'>Out of Stock</option>
          </select>
        </div>
        
        <div className="tracking-table-container relative overflow-hidden w-full max-w-full rounded-xl border border-[#e3e9d8] dark:border-[#343b2b]">
          <style>{`
            .tracking-table-container table { border-collapse: collapse; width: max-content; }
            .tracking-table-container th, .tracking-table-container td { border-bottom: 1px solid #e3e9d8 !important; white-space: nowrap; }
            .dark .tracking-table-container th, .dark .tracking-table-container td { border-bottom: 1px solid #343b2b !important; }
            .tracking-table-container thead { position: sticky; top: 0; z-index: 10; background-color: #f4f5eb; }
            .dark .tracking-table-container thead { background-color: #242a1d; }
            .tracking-table-container tbody tr { cursor: pointer; transition: background 0.2s; }
            .tracking-table-container tbody tr:hover { background-color: #f9f9f9; }
            .dark .tracking-table-container tbody tr:hover { background-color: #20251a; }
          `}</style>
          <div className="overflow-x-auto w-full max-h-[600px] overflow-y-auto">
            <Table headers={headers} rows={filteredLogs} onRowClick={(row) => setViewTarget(row)} />
          </div>
        </div>
      </Card>

      <Modal open={Boolean(viewTarget)} onClose={() => setViewTarget(null)} title='Historical Record Details' panelClassName='max-w-[750px] w-full'>
        {viewTarget && viewTarget.snapshot ? (
          <div className='flex flex-col gap-4'>
            <div className='rounded-xl bg-[#f9faef] dark:bg-[#1f2419] border border-[#d9e1ca] dark:border-[#414a33] p-4 flex gap-6 justify-between flex-wrap'>
              <div>
                <p className='text-[11px] font-semibold uppercase tracking-wide text-[#71805a] dark:text-[#c5d0b5]'>Update Type</p>
                <div className="mt-1"><UpdateTypeBadge type={viewTarget.updateType} /></div>
              </div>
              <div>
                <p className='text-[11px] font-semibold uppercase tracking-wide text-[#71805a] dark:text-[#c5d0b5]'>Date & Time</p>
                <p className='mt-1 text-sm font-semibold'>{new Date(viewTarget.timestamp).toLocaleString()}</p>
              </div>
              <div>
                <p className='text-[11px] font-semibold uppercase tracking-wide text-[#71805a] dark:text-[#c5d0b5]'>Quantity Change</p>
                <p className='mt-1 text-sm font-bold'>
                  {viewTarget.previousQty} &rarr; {viewTarget.newQty}
                </p>
              </div>
              <div>
                <p className='text-[11px] font-semibold uppercase tracking-wide text-[#71805a] dark:text-[#c5d0b5]'>Total Value</p>
                <p className='mt-1 text-sm font-bold'>
                  {viewTarget.totalValue} ₹
                </p>
              </div>
            </div>

            <div className='grid gap-x-6 sm:grid-cols-3 text-sm max-h-[50vh] overflow-y-auto pr-3'>
              <SectionHeading title='Section 1 — Basic Info' />
              {renderDetailField('Chemical ID', viewTarget.snapshot['Chemical ID'])}
              {renderDetailField('Chemical Name', viewTarget.snapshot['Chemical Name'])}
              {renderDetailField('CAS Number', viewTarget.snapshot['CAS Number'])}
              {renderDetailField('Synonyms', viewTarget.snapshot['Synonyms'])}
  
              <SectionHeading title='Section 2 — Scientific Data' />
              {renderDetailField('SMILES ID', viewTarget.snapshot['SMILES ID'])}
              {renderDetailField('PubChem Link URL', viewTarget.snapshot['PubChem Link URL'])}
              {renderDetailField('Molecular Formula', viewTarget.snapshot['Molecular Formula'])}
              {renderDetailField('Molecular Weight', viewTarget.snapshot['Molecular Weight'])}
              {renderDetailField('InChI Key', viewTarget.snapshot['InChI Key'])}
  
              <SectionHeading title='Section 3 — Supplier Info' />
              {renderDetailField('Supplier', viewTarget.snapshot['Supplier'])}
              {renderDetailField('Batch Number', viewTarget.snapshot['Batch Number'])}
              {renderDetailField('Invoice Number', viewTarget.snapshot['Invoice Number'])}
  
              <SectionHeading title='Section 4 — Stock & Pricing' />
              {renderDetailField('Grade', viewTarget.snapshot['Grade'])}
              {renderDetailField('Pack Size', viewTarget.snapshot['Pack Size'])}
              {renderDetailField('Standard Unit', viewTarget.snapshot['Standard Unit'])}
              {renderDetailField('Purchase Price (INR)', viewTarget.snapshot['Purchase Price (INR)'] ? `${viewTarget.snapshot['Purchase Price (INR)']} ₹` : '--')}
              {renderDetailField('Unit Price (INR)', viewTarget.snapshot['Unit Price (INR)'] ? `${viewTarget.snapshot['Unit Price (INR)']} ₹` : '--')}
              {renderDetailField('Price Per Unit (1g/1ml)', viewTarget.snapshot['Price Per Unit (1g / 1ml)'] ? `${viewTarget.snapshot['Price Per Unit (1g / 1ml)']} ₹` : '--')}
              {renderDetailField('Received Quantity', viewTarget.snapshot['Received Quantity'])}
              {renderDetailField('Available Quantity', viewTarget.snapshot['Available Quantity'])}
              {renderDetailField('Total Value (INR)', `${viewTarget.snapshot['Total Current Value (INR)']} ₹`)}
  
              <SectionHeading title='Section 5 — Safety & Status' />
              {renderDetailField('Hazard Class', viewTarget.snapshot['Hazard Class'])}
              <div className='sm:col-span-2'>
                {renderDetailField('Safety Wear', viewTarget.snapshot['Safety Wear'])}
              </div>
              <div className='pb-3 col-span-full'>
                <p className='text-[11px] font-semibold uppercase tracking-wide text-[#71805a] dark:text-[#c5d0b5]'>Status</p>
                <p className='mt-1'><StatusBadge status={viewTarget.snapshot.status} /></p>
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
