import { Eye, FileDown, FileSpreadsheet, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Table from '../components/ui/Table';
import { parseCsv } from '../utils/csv';
import useAppStore from './appStore';
import StoreImportModal from './StoreImportModal';
import StoreLayout from './StoreLayout';
import useStoreManagerMock, { formatQuantity, getChemicalStatus, SHEET_IMPORT_HEADERS } from './storeManagerMock';
import api from '../services/api';
import { toFrontendChemical, toBackendChemical } from '../utils/storeMapper';

const EMPTY_CHEMICAL = SHEET_IMPORT_HEADERS.reduce((acc, header) => {
  acc[header] = '';
  return acc;
}, {});
EMPTY_CHEMICAL['Grade'] = 'LR';
EMPTY_CHEMICAL['Standard Unit'] = 'UNT';
EMPTY_CHEMICAL['Purchase Price (INR)'] = '';
EMPTY_CHEMICAL['Received Quantity'] = '';
EMPTY_CHEMICAL['Available Quantity'] = '';
EMPTY_CHEMICAL['Unit Price (INR)'] = '';

const badgeClasses = {
  'In Stock': 'bg-emerald-500 text-white dark:bg-emerald-600',
  'Low Stock': 'bg-amber-500 text-white dark:bg-amber-600',
  'Out of Stock': 'bg-rose-500 text-white dark:bg-rose-600',
};

function StatusBadge({ status }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClasses[status] || badgeClasses['In Stock']} inline-block shadow-sm`}>{status}</span>;
}

function SectionHeading({ title }) {
  return (
    <div className="col-span-full mb-3 mt-4 border-b border-[#e3e9d8] dark:border-[#343b2b] pb-2">
      <h3 className="text-sm font-bold text-[#556b2f] dark:text-[#a8be8a]">{title}</h3>
    </div>
  );
}



export default function StoreInventory() {
  const [chemicals, setChemicals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const setToast = useAppStore((state) => state.setToast);

  const [addOpen, setAddOpen] = useState(false);
  const [sheetImportOpen, setSheetImportOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [chemicalForm, setChemicalForm] = useState(EMPTY_CHEMICAL);
  // Tracking history could be fetched separately, for now we will just show empty or mock
  const trackingLogs = []; // Placeholder or you could fetch it if a history endpoint exists

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/store/inventory');
      setChemicals((res.data || []).map(toFrontendChemical));
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to fetch inventory.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const rows = useMemo(() => chemicals.map((chemical) => ({ ...chemical })), [chemicals]);

  const closeAdd = () => {
    setAddOpen(false);
    setChemicalForm(EMPTY_CHEMICAL);
  };

  const handleFormChange = (setter) => (e) => {
    const { name, value } = e.target;
    setter((state) => ({ ...state, [name]: value }));
  };

  const validateForm = (form) => {
    if (!form['Chemical ID']?.trim() || !form['Chemical Name']?.trim()) {
      setToast({ type: 'error', message: 'Chemical ID and Chemical Name are required.' });
      return false;
    }
    return true;
  };

  const saveChemical = async () => {
    if (!validateForm(chemicalForm)) return;
    try {
      // For create, we use import API endpoint since there is no single POST
      const backendChem = toBackendChemical(chemicalForm);
      await api.post('/store/inventory/import', [backendChem]);
      setToast({ type: 'success', message: `${chemicalForm['Chemical Name'].trim()} added to inventory.` });
      closeAdd();
      fetchInventory();
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to add chemical.' });
    }
  };

  const openEdit = (chemical) => {
    setEditTarget({ ...EMPTY_CHEMICAL, ...chemical });
  };

  const saveEdit = async () => {
    if (!validateForm(editTarget)) return;
    try {
      const backendChem = toBackendChemical(editTarget);
      await api.put(`/store/inventory/${editTarget.id}`, backendChem);
      setToast({ type: 'success', message: `${editTarget['Chemical Name']} updated.` });
      setEditTarget(null);
      fetchInventory();
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to update chemical.' });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/store/inventory/${deleteTarget.id}`);
      setToast({ type: 'success', message: `${deleteTarget['Chemical Name']} removed from inventory.` });
      setDeleteTarget(null);
      fetchInventory();
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to delete chemical.' });
    }
  };

  const headers = [
    { key: 'Chemical ID', label: 'Chemical ID' },
    { key: 'Chemical Name', label: 'Chemical Name' },
    { key: 'CAS Number', label: 'CAS Number' },
    { key: 'Synonyms', label: 'Synonyms' },
    { key: 'SMILES ID', label: 'SMILES ID' },
    { key: 'PubChem Link URL', label: 'PubChem Link URL' },
    { key: 'Molecular Formula', label: 'Molecular Formula' },
    { key: 'Molecular Weight', label: 'Molecular Weight' },
    { key: 'InChI Key', label: 'InChI Key' },
    { key: 'Supplier', label: 'Supplier' },
    { key: 'Batch Number', label: 'Batch Number' },
    { key: 'Invoice Number', label: 'Invoice Number' },
    { key: 'Grade', label: 'Grade' },
    { key: 'Pack Size', label: 'Pack Size' },
    { key: 'Standard Unit', label: 'Standard Unit' },
    { key: 'Purchase Price (INR)', label: 'Purchase Price (INR)' },
    { key: 'Unit Price (INR)', label: 'Unit Price (INR)' },
    { key: 'Price Per Unit (1g / 1ml)', label: 'Price Per Unit (1g/1ml)' },
    { key: 'Received Quantity', label: 'Received Quantity' },
    { key: 'Available Quantity', label: 'Available Quantity' },
    { key: 'Hazard Class', label: 'Hazard Class' },
    { key: 'Safety Wear', label: 'Safety Wear' },
    { key: 'Total Current Value (INR)', label: 'Total Value (INR)' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className='flex gap-2 min-w-[210px] items-center justify-center'>
          <Button variant='outline' className='px-2 py-1 text-xs border-[#71805a] text-[#556b2f] hover:bg-[#eef4e4] bg-white dark:bg-[#20251a] dark:text-[#c5d0b5]' onClick={() => { setViewTarget(row); setActiveTab('details'); }}>
            <Eye size={14} className="mr-1" /> View
          </Button>
          <Button variant='outline' className='px-2 py-1 text-xs border-[#71805a] text-[#556b2f] hover:bg-[#eef4e4] bg-white dark:bg-[#20251a] dark:text-[#c5d0b5]' onClick={() => openEdit(row)}>
            <Pencil size={14} className="mr-1" /> Edit
          </Button>
          <Button variant='outline' className='px-2 py-1 text-xs border-red-500 text-red-600 hover:bg-red-50 bg-white dark:bg-[#20251a] dark:hover:bg-red-900/30 dark:text-red-400' onClick={() => setDeleteTarget(row)}>
            <Trash2 size={14} className="mr-1" /> Delete
          </Button>
        </div>
      ),
    },
  ];

  const renderFormFields = (form, setter) => {
    const handleChange = handleFormChange(setter);
    
    const packSize = String(form['Pack Size'] || '').trim();
    const packSizeValueMatch = packSize.match(/[\d.]+/);
    const packSizeValue = packSizeValueMatch ? Number(packSizeValueMatch[0]) : 0;
    const packSizeUnit = packSize.replace(/[\d.\s]/g, '');
    const receivedQty = Number(form['Received Quantity'] || 0);
    const availableQty = Number(form['Available Quantity'] || 0);
    const unitPrice = Number(form['Unit Price (INR)'] || 0);
    
    const liveTotalValue = unitPrice * availableQty;

    return (
      <div className='grid gap-4 sm:grid-cols-2 max-h-[65vh] overflow-y-auto p-1 pr-3'>
        <SectionHeading title='Section 1 — Basic Info' />
        <Input label='Chemical ID *' name='Chemical ID' value={form['Chemical ID']} onChange={handleChange} required />
        <Input label='Chemical Name *' name='Chemical Name' value={form['Chemical Name']} onChange={handleChange} required />
        <Input label='CAS Number' name='CAS Number' value={form['CAS Number']} onChange={handleChange} />
        <Input label='Synonyms' name='Synonyms' value={form['Synonyms']} onChange={handleChange} />

        <SectionHeading title='Section 2 — Scientific Data' />
        <Input label='SMILES ID' name='SMILES ID' value={form['SMILES ID']} onChange={handleChange} />
        <Input label='PubChem Link URL' name='PubChem Link URL' type='url' value={form['PubChem Link URL']} onChange={handleChange} />
        <Input label='Molecular Formula' name='Molecular Formula' value={form['Molecular Formula']} onChange={handleChange} />
        <Input label='Molecular Weight' name='Molecular Weight' value={form['Molecular Weight']} onChange={handleChange} />
        <Input label='InChI Key' name='InChI Key' value={form['InChI Key']} onChange={handleChange} />
        <div></div>
        
        <SectionHeading title='Section 3 — Supplier Info' />
        <Input label='Supplier' name='Supplier' value={form['Supplier']} onChange={handleChange} />
        <Input label='Batch Number' name='Batch Number' value={form['Batch Number']} onChange={handleChange} />
        <Input label='Invoice Number' name='Invoice Number' value={form['Invoice Number']} onChange={handleChange} />
        <div></div>
        
        <SectionHeading title='Section 4 — Stock & Pricing' />
        <div>
          <label className='mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200'>Grade</label>
          <select 
            name='Grade' 
            value={form['Grade']} 
            onChange={handleChange}
            className='w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#556b2f] focus:outline-none focus:ring-1 focus:ring-[#556b2f] dark:border-slate-600 dark:bg-slate-800 dark:text-white'
          >
            <option value='LR'>LR</option>
            <option value='AR'>AR</option>
            <option value='EP'>EP</option>
          </select>
        </div>
        <Input label='Pack Size' name='Pack Size' value={form['Pack Size']} onChange={handleChange} />
        <div>
          <label className='mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200'>Standard Unit</label>
          <select 
            name='Standard Unit' 
            value={form['Standard Unit']} 
            onChange={handleChange}
            className='w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#556b2f] focus:outline-none focus:ring-1 focus:ring-[#556b2f] dark:border-slate-600 dark:bg-slate-800 dark:text-white'
          >
            <option value='UNT'>UNT</option>
            <option value='ml'>ml</option>
            <option value='L'>L</option>
            <option value='g'>g</option>
            <option value='kg'>kg</option>
          </select>
        </div>
        <Input label='Purchase Price (INR)' name='Purchase Price (INR)' type='number' value={form['Purchase Price (INR)']} onChange={handleChange} />
        <Input label='Unit Price (INR)' name='Unit Price (INR)' type='number' value={form['Unit Price (INR)']} onChange={handleChange} />
        <Input label='Price Per Unit (1g / 1ml)' name='Price Per Unit (1g / 1ml)' type='number' value={form['Price Per Unit (1g / 1ml)']} onChange={handleChange} />
        <Input label='Received Quantity' name='Received Quantity' type='number' value={form['Received Quantity']} onChange={handleChange} />
        <Input label='Available Quantity' name='Available Quantity' type='number' value={form['Available Quantity']} onChange={handleChange} />
        
        <div className='opacity-70 pointer-events-none'>
          <Input label='Total Value (INR) (Computed)' name='Total Current Value' value={`${liveTotalValue}`} onChange={() => {}} disabled className="bg-slate-100" />
        </div>
        <div></div>

        <SectionHeading title='Section 5 — Safety & Status' />
        <Input label='Hazard Class' name='Hazard Class' value={form['Hazard Class']} onChange={handleChange} />
        
        <div className='sm:col-span-2'>
          <label className='mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200'>Safety Wear</label>
          <textarea 
            name='Safety Wear' 
            value={form['Safety Wear']} 
            onChange={handleChange}
            rows={3}
            className='w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#556b2f] focus:outline-none focus:ring-1 focus:ring-[#556b2f] dark:border-slate-600 dark:bg-slate-800 dark:text-white'
          />
        </div>
      </div>
    );
  };

  const renderDetailField = (label, value) => (
    <div className='pb-3'>
      <p className='text-[11px] font-semibold uppercase tracking-wide text-[#71805a] dark:text-[#c5d0b5]'>{label}</p>
      <p className='mt-1 text-sm text-slate-900 dark:text-slate-100 break-words'>{value || '--'}</p>
    </div>
  );

  return (
    <StoreLayout
      title='Inventory'
      subtitle='Manage store inventory with full tracking.'
      actions={
        <>
          <Button variant='outline' onClick={() => setSheetImportOpen(true)}>
            <FileSpreadsheet size={16} className='mr-2' /> Import / Bulk Upload
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus size={16} className='mr-2' /> Add Chemical
          </Button>
        </>
      }
    >
      <Card title='Chemicals Table' subtitle='View, edit, or remove chemicals from the store inventory.'>
        <div className="inventory-table-container relative overflow-hidden w-full max-w-full">
          <style>{`
            .inventory-table-container table {
              border-collapse: collapse;
              width: max-content;
            }
            .inventory-table-container th,
            .inventory-table-container td {
              border: 1px solid #e3e9d8 !important;
              white-space: nowrap;
            }
            .dark .inventory-table-container th,
            .dark .inventory-table-container td {
              border: 1px solid #343b2b !important;
            }
            .inventory-table-container tr:nth-child(even) td {
              background-color: #f9f9f9 !important;
            }
            .dark .inventory-table-container tr:nth-child(even) td {
              background-color: #20251a !important;
            }
            
            /* Actions column sticky */
            .inventory-table-container th:last-child,
            .inventory-table-container td:last-child {
              position: sticky;
              right: 0;
              z-index: 5;
              border-left: 2px solid #cfd8bd !important;
            }
            .inventory-table-container th:last-child {
              background-color: #f4f5eb !important;
              z-index: 20;
            }
            .inventory-table-container td:last-child {
              background-color: white !important;
            }
            .inventory-table-container tr:nth-child(even) td:last-child {
              background-color: #f9f9f9 !important;
            }

            .dark .inventory-table-container th:last-child {
              background-color: #242a1d !important;
              border-left: 2px solid #4e5d35 !important;
            }
            .dark .inventory-table-container td:last-child {
              background-color: #1a1e15 !important;
              border-left: 2px solid #4e5d35 !important;
            }
            .dark .inventory-table-container tr:nth-child(even) td:last-child {
              background-color: #20251a !important;
            }
          `}</style>
          <div className="overflow-x-auto w-full">
            {loading ? (
              <div className="flex justify-center p-8"><span className="text-[#556b2f]">Loading inventory...</span></div>
            ) : (
              <Table 
                headers={headers} 
                rows={rows} 
              />
            )}
          </div>
        </div>
      </Card>

      <StoreImportModal open={sheetImportOpen} onClose={() => { setSheetImportOpen(false); fetchInventory(); }} />

      <Modal open={addOpen} onClose={closeAdd} title='Add Chemical' panelClassName='max-w-3xl'>
        <div className='space-y-4'>
          {renderFormFields(chemicalForm, setChemicalForm)}
          <Button className='w-full' onClick={saveChemical}>Save chemical</Button>
        </div>
      </Modal>

      <Modal open={Boolean(editTarget)} onClose={() => setEditTarget(null)} title='Edit Chemical' panelClassName='max-w-3xl'>
        {editTarget ? (
          <div className='space-y-4'>
            {renderFormFields(editTarget, setEditTarget)}
            <Button className='w-full' onClick={saveEdit}>Save changes</Button>
          </div>
        ) : null}
      </Modal>

      <Modal open={Boolean(viewTarget)} onClose={() => setViewTarget(null)} title='Chemical Details' panelClassName='max-w-[750px] w-full'>
        {viewTarget ? (
          <div className='flex flex-col gap-4'>
            <div className='flex gap-4 border-b border-[#cfd8bd] dark:border-[#414a33] mb-2'>
              <button
                className={`pb-2 font-semibold text-sm transition-colors ${activeTab === 'details' ? 'border-b-2 border-[#556b2f] text-[#3c4e23] dark:border-[#a8be8a] dark:text-[#eef4e8]' : 'text-[#71805a] hover:text-[#556b2f] dark:text-[#9ca3af] dark:hover:text-[#c5d0b5]'}`}
                onClick={() => setActiveTab('details')}
              >
                Details
              </button>
              <button
                className={`pb-2 font-semibold text-sm transition-colors ${activeTab === 'history' ? 'border-b-2 border-[#556b2f] text-[#3c4e23] dark:border-[#a8be8a] dark:text-[#eef4e8]' : 'text-[#71805a] hover:text-[#556b2f] dark:text-[#9ca3af] dark:hover:text-[#c5d0b5]'}`}
                onClick={() => setActiveTab('history')}
              >
                History
              </button>
            </div>

            {activeTab === 'details' ? (
              <div className='grid gap-x-6 sm:grid-cols-3 text-sm'>
                <SectionHeading title='Section 1 — Basic Info' />
              {renderDetailField('Chemical ID', viewTarget['Chemical ID'])}
              {renderDetailField('Chemical Name', viewTarget['Chemical Name'])}
              {renderDetailField('CAS Number', viewTarget['CAS Number'])}
              {renderDetailField('Synonyms', viewTarget['Synonyms'])}
  
              <SectionHeading title='Section 2 — Scientific Data' />
              {renderDetailField('SMILES ID', viewTarget['SMILES ID'])}
              {renderDetailField('PubChem Link URL', viewTarget['PubChem Link URL'])}
              {renderDetailField('Molecular Formula', viewTarget['Molecular Formula'])}
              {renderDetailField('Molecular Weight', viewTarget['Molecular Weight'])}
              {renderDetailField('InChI Key', viewTarget['InChI Key'])}
  
              <SectionHeading title='Section 3 — Supplier Info' />
              {renderDetailField('Supplier', viewTarget['Supplier'])}
              {renderDetailField('Batch Number', viewTarget['Batch Number'])}
              {renderDetailField('Invoice Number', viewTarget['Invoice Number'])}
  
              <SectionHeading title='Section 4 — Stock & Pricing' />
              {renderDetailField('Grade', viewTarget['Grade'])}
              {renderDetailField('Pack Size', viewTarget['Pack Size'])}
              {renderDetailField('Standard Unit', viewTarget['Standard Unit'])}
              {renderDetailField('Purchase Price (INR)', viewTarget['Purchase Price (INR)'] ? `${viewTarget['Purchase Price (INR)']} ₹` : '--')}
              {renderDetailField('Unit Price (INR)', viewTarget['Unit Price (INR)'] ? `${viewTarget['Unit Price (INR)']} ₹` : '--')}
              {renderDetailField('Price Per Unit (1g/1ml)', viewTarget['Price Per Unit (1g / 1ml)'] ? `${viewTarget['Price Per Unit (1g / 1ml)']} ₹` : '--')}
              {renderDetailField('Received Quantity', viewTarget['Received Quantity'])}
              {renderDetailField('Available Quantity', viewTarget['Available Quantity'])}
              {renderDetailField('Total Value (INR)', `${viewTarget['Total Current Value (INR)']} ₹`)}
  
              <SectionHeading title='Section 5 — Safety & Status' />
              {renderDetailField('Hazard Class', viewTarget['Hazard Class'])}
              <div className='sm:col-span-2'>
                {renderDetailField('Safety Wear', viewTarget['Safety Wear'])}
              </div>
              <div className='pb-3 col-span-full'>
                <p className='text-[11px] font-semibold uppercase tracking-wide text-[#71805a] dark:text-[#c5d0b5]'>Status</p>
                <p className='mt-1'><StatusBadge status={viewTarget.status} /></p>
              </div>
            </div>
            ) : (
              <div className='flex flex-col gap-4 text-sm max-h-[60vh] overflow-y-auto pr-2'>
                {trackingLogs.filter(l => l.chemicalId === viewTarget['Chemical ID']).length === 0 ? (
                  <p className='text-slate-500'>No history available for this chemical.</p>
                ) : (
                  <div className='relative border-l-2 border-[#e3e9d8] dark:border-[#343b2b] ml-3 space-y-6'>
                    {trackingLogs
                      .filter(l => l.chemicalId === viewTarget['Chemical ID'])
                      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                      .map(log => (
                        <div key={log.trackId} className='relative pl-6'>
                          <div className='absolute -left-[9px] top-1.5 h-4 w-4 rounded-full bg-[#556b2f] dark:bg-[#a8be8a] border-2 border-white dark:border-[#1a1d16]' />
                          <div className='flex flex-col gap-1'>
                            <div className='flex flex-wrap items-center gap-3'>
                              <span className='font-bold text-[#3c4e23] dark:text-[#eef4e8]'>{new Date(log.timestamp).toLocaleString()}</span>
                              <span className='px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'>{log.updateType}</span>
                            </div>
                            <div className='mt-2 grid grid-cols-2 gap-4 rounded-lg bg-[#f9faef] p-3 border border-[#e3e9d8] dark:bg-[#1f2419] dark:border-[#343b2b]'>
                              <div>
                                <p className='text-xs text-[#71805a] dark:text-[#c5d0b5]'>Quantity</p>
                                <p className='font-semibold text-slate-800 dark:text-slate-200'>{log.previousQty} &rarr; {log.newQty}</p>
                              </div>
                              <div>
                                <p className='text-xs text-[#71805a] dark:text-[#c5d0b5]'>Total Value</p>
                                <p className='font-semibold text-slate-800 dark:text-slate-200'>{log.totalValue} ₹ (at {log.newPrice} ₹/unit)</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
            
            <div className='mt-4 flex justify-center pt-2'>
              <Button variant='outline' className='w-full max-w-[200px]' onClick={() => setViewTarget(null)}>Close</Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title='Delete Chemical'>
        <div className='space-y-4'>
          <p className='text-sm text-slate-600 dark:text-slate-300'>{deleteTarget ? `Delete ${deleteTarget['Chemical Name']} from store inventory?` : ''}</p>
          <div className='flex gap-3'>
            <Button variant='outline' className='w-full' onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant='danger' className='w-full' onClick={confirmDelete}>Delete</Button>
          </div>
        </div>
      </Modal>
    </StoreLayout>
  );
}
