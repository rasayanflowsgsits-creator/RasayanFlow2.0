import { FileDown, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Table from '../components/ui/Table';
import { parseCsv } from '../utils/csv';
import useAppStore from './appStore';
import StoreLayout from './StoreLayout';
import useStoreManagerMock, { formatQuantity, getChemicalStatus } from './storeManagerMock';

const EMPTY_CHEMICAL = { name: '', category: '', quantity: '', unit: 'ml', status: 'In Stock' };

const badgeClasses = {
  'In Stock': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
  'Low Stock': 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
  'Out of Stock': 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300',
};

function StatusBadge({ status }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClasses[status] || badgeClasses['In Stock']}`}>{status}</span>;
}

function toCsvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export default function StoreInventory() {
  const chemicals = useStoreManagerMock((state) => state.chemicals);
  const addChemical = useStoreManagerMock((state) => state.addChemical);
  const addChemicals = useStoreManagerMock((state) => state.addChemicals);
  const updateChemical = useStoreManagerMock((state) => state.updateChemical);
  const deleteChemical = useStoreManagerMock((state) => state.deleteChemical);
  const setToast = useAppStore((state) => state.setToast);

  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [chemicalForm, setChemicalForm] = useState(EMPTY_CHEMICAL);
  const [bulkFileName, setBulkFileName] = useState('');
  const [bulkPreview, setBulkPreview] = useState([]);
  const [bulkIssues, setBulkIssues] = useState([]);

  const rows = useMemo(
    () =>
      chemicals.map((chemical) => ({
        ...chemical,
        quantityDisplay: formatQuantity(chemical.quantity, chemical.unit),
      })),
    [chemicals]
  );

  const closeAdd = () => {
    setAddOpen(false);
    setChemicalForm(EMPTY_CHEMICAL);
  };

  const saveChemical = () => {
    if (!chemicalForm.name.trim() || !chemicalForm.category.trim()) {
      setToast({ type: 'error', message: 'Chemical name and category are required.' });
      return;
    }

    addChemical({
      ...chemicalForm,
      quantity: Number(chemicalForm.quantity || 0),
      status: getChemicalStatus(chemicalForm.quantity, chemicalForm.status),
    });
    setToast({ type: 'success', message: `${chemicalForm.name.trim()} added to inventory.` });
    closeAdd();
  };

  const openEdit = (chemical) => {
    setEditTarget({
      ...chemical,
      quantity: String(chemical.quantity),
    });
  };

  const saveEdit = () => {
    if (!editTarget?.name?.trim() || !editTarget?.category?.trim()) return;
    updateChemical(editTarget.id, {
      name: editTarget.name,
      category: editTarget.category,
      quantity: Number(editTarget.quantity || 0),
      unit: editTarget.unit,
      status: getChemicalStatus(editTarget.quantity, editTarget.status),
    });
    setToast({ type: 'success', message: `${editTarget.name} updated.` });
    setEditTarget(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteChemical(deleteTarget.id);
    setToast({ type: 'success', message: `${deleteTarget.name} removed from inventory.` });
    setDeleteTarget(null);
  };

  const downloadTemplate = () => {
    const csv = [
      ['name', 'category', 'quantity', 'unit', 'status'].map(toCsvCell).join(','),
      ['Hydrogen Peroxide', 'Oxidizer', '100', 'ml', 'In Stock'].map(toCsvCell).join(','),
    ].join('\n');
    const blob = new Blob([`${csv}\n`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'store-chemicals-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const parseBulkFile = async (file) => {
    setBulkFileName(file?.name || '');
    setBulkPreview([]);
    setBulkIssues([]);
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();
    const records = extension === 'xlsx' || extension === 'xls'
      ? (() => {
          const readerPromise = file.arrayBuffer();
          return readerPromise.then((buffer) => {
            const workbook = XLSX.read(buffer, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            if (!firstSheetName) return [];
            return XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], { defval: '' });
          });
        })()
      : file.text().then((text) => parseCsv(text).records);
    const parsedRecords = await records;
    const issues = [];
    const preview = parsedRecords.map((record, index) => {
      const quantity = Number(record.quantity || 0);
      if (!String(record.name || '').trim()) issues.push(`Row ${index + 2}: Missing name`);
      if (!String(record.category || '').trim()) issues.push(`Row ${index + 2}: Missing category`);
      if (!Number.isFinite(quantity) || quantity < 0) issues.push(`Row ${index + 2}: Invalid quantity`);
      return {
        id: `preview-${index}`,
        name: String(record.name || record.chemicalName || '').trim(),
        category: String(record.category || '').trim(),
        quantity,
        unit: String(record.unit || record.quantityUnit || 'ml').trim(),
        status: String(record.status || getChemicalStatus(quantity)).trim(),
      };
    });

    setBulkPreview(preview);
    setBulkIssues(issues);
  };

  const confirmUpload = () => {
    const validRows = bulkPreview.filter((entry) => entry.name && entry.category && Number.isFinite(Number(entry.quantity)));
    if (!validRows.length) {
      setToast({ type: 'error', message: 'No valid rows to upload.' });
      return;
    }
    const count = addChemicals(validRows);
    setToast({ type: 'success', message: `${count} chemical${count === 1 ? '' : 's'} added from upload.` });
    setBulkOpen(false);
    setBulkFileName('');
    setBulkPreview([]);
    setBulkIssues([]);
  };

  const headers = [
    { key: 'name', label: 'Chemical' },
    { key: 'category', label: 'Category' },
    { key: 'quantityDisplay', label: 'Quantity' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className='flex flex-wrap gap-2'>
          <Button variant='outline' className='px-3 py-1 text-xs' onClick={() => openEdit(row)}>
            <Pencil size={14} /> Edit
          </Button>
          <Button variant='outline' className='px-3 py-1 text-xs text-red-700 dark:text-red-300' onClick={() => setDeleteTarget(row)}>
            <Trash2 size={14} /> Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <StoreLayout
      title='Inventory'
      subtitle='Dummy chemicals with local add, bulk upload, edit, and delete actions.'
      actions={
        <>
          <Button variant='outline' onClick={() => setBulkOpen(true)}>
            <Upload size={16} /> Bulk Upload
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus size={16} /> Add Chemical
          </Button>
        </>
      }
    >
      <Card title='Chemicals Table' subtitle='Status badges use the same green, yellow, and red visual language.'>
        <Table headers={headers} rows={rows} />
      </Card>

      <Modal open={addOpen} onClose={closeAdd} title='Add Chemical'>
        <div className='space-y-4'>
          <Input label='Chemical name' value={chemicalForm.name} onChange={(event) => setChemicalForm((state) => ({ ...state, name: event.target.value }))} />
          <div className='grid gap-4 sm:grid-cols-2'>
            <Input label='Category' value={chemicalForm.category} onChange={(event) => setChemicalForm((state) => ({ ...state, category: event.target.value }))} />
            <Input label='Unit' value={chemicalForm.unit} onChange={(event) => setChemicalForm((state) => ({ ...state, unit: event.target.value }))} />
          </div>
          <Input label='Quantity' type='number' value={chemicalForm.quantity} onChange={(event) => setChemicalForm((state) => ({ ...state, quantity: event.target.value }))} />
          <Button className='w-full' onClick={saveChemical}>Save chemical</Button>
        </div>
      </Modal>

      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title='Bulk Upload Chemicals'>
        <div className='space-y-4'>
          <div className='rounded-lg border border-[#d9e1ca] bg-[#f7f8f1] p-4 text-sm text-[#71805a] dark:border-[#414a33] dark:bg-[#28301f] dark:text-[#c5d0b5]'>
            <p className='font-medium text-[#3c4e23] dark:text-[#eef4e8]'>Upload a CSV or Excel-exported CSV file.</p>
            <p className='mt-1 text-xs'>Columns: name, category, quantity, unit, status.</p>
          </div>
          <Button variant='outline' onClick={downloadTemplate}>
            <FileDown size={16} /> Download Template
          </Button>
          <label className='block text-sm text-[#4e5d35] dark:text-[#d5ddbf]'>
            <span className='mb-1 block text-xs font-medium tracking-wide'>Upload CSV or Excel file</span>
            <input
              type='file'
              accept='.csv,.xlsx,.xls,text/csv'
              className='block w-full cursor-pointer rounded-lg border border-[#cfd8bd] bg-white px-3 py-2 text-sm text-[#3c4e23] file:mr-3 file:rounded-md file:border-0 file:bg-[#556b2f] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#f0f4e8] hover:file:bg-[#6f7d45] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]'
              onChange={(event) => parseBulkFile(event.target.files?.[0])}
            />
          </label>
          {bulkFileName ? <p className='text-xs text-[#71805a] dark:text-[#c5d0b5]'>Selected: {bulkFileName}</p> : null}
          {bulkIssues.length ? (
            <div className='rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-200'>
              {bulkIssues.slice(0, 6).map((issue) => <p key={issue}>{issue}</p>)}
            </div>
          ) : null}
          {bulkPreview.length ? (
            <Table
              headers={[
                { key: 'name', label: 'Chemical' },
                { key: 'category', label: 'Category' },
                { key: 'quantity', label: 'Quantity', render: (row) => formatQuantity(row.quantity, row.unit) },
                { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
              ]}
              rows={bulkPreview}
            />
          ) : null}
          <Button className='w-full' onClick={confirmUpload} disabled={!bulkPreview.length}>Confirm Upload</Button>
        </div>
      </Modal>

      <Modal open={Boolean(editTarget)} onClose={() => setEditTarget(null)} title='Edit Chemical'>
        {editTarget ? (
          <div className='space-y-4'>
            <Input label='Chemical name' value={editTarget.name} onChange={(event) => setEditTarget((state) => ({ ...state, name: event.target.value }))} />
            <div className='grid gap-4 sm:grid-cols-2'>
              <Input label='Category' value={editTarget.category} onChange={(event) => setEditTarget((state) => ({ ...state, category: event.target.value }))} />
              <Input label='Unit' value={editTarget.unit} onChange={(event) => setEditTarget((state) => ({ ...state, unit: event.target.value }))} />
            </div>
            <Input label='Quantity' type='number' value={editTarget.quantity} onChange={(event) => setEditTarget((state) => ({ ...state, quantity: event.target.value }))} />
            <Button className='w-full' onClick={saveEdit}>Save changes</Button>
          </div>
        ) : null}
      </Modal>

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title='Delete Chemical'>
        <div className='space-y-4'>
          <p className='text-sm text-slate-600 dark:text-slate-300'>{deleteTarget ? `Delete ${deleteTarget.name} from store inventory?` : ''}</p>
          <div className='flex gap-3'>
            <Button variant='outline' className='w-full' onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant='danger' className='w-full' onClick={confirmDelete}>Delete</Button>
          </div>
        </div>
      </Modal>
    </StoreLayout>
  );
}
