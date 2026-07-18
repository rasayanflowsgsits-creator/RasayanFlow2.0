import { FileDown, FileSpreadsheet, UploadCloud } from 'lucide-react';
import Papa from 'papaparse';
import { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import Button from './ui/Button';
import Modal from './ui/Modal';
import useAppStore from '../store/appStore';
import api from '../services/api';

const LAB_IMPORT_HEADERS = [
  'Item Code',
  'Chemical Name',
  'Quantity',
  'Quantity Unit',
  'Min Threshold',
  'Cost Per Unit (INR)',
  'CAS Number',
  'Chemical Formula',
  'SMILES',
  'InChI',
  'Manufacturing Company',
  'Storage Location',
  'Lot Number',
  'Entry Date',
  'Expiry Date',
];

function toCsvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function normalizeHeader(value) {
  return String(value || '').trim();
}

function isEmptyRecord(record) {
  return LAB_IMPORT_HEADERS.every((header) => String(record[header] ?? '').trim() === '');
}

function getMissingFields(record) {
  const missing = [];
  if (!String(record['Chemical Name'] ?? '').trim()) missing.push('Chemical Name');
  if (!String(record['Quantity Unit'] ?? '').trim()) missing.push('Quantity Unit');
  return missing;
}

function mapSheetRowToChemical(record, index) {
  return {
    ...record,
    id: String(record['Item Code'] || `sheet-${Date.now()}-${index}`).trim(),
    sheetData: { ...record },
  };
}

export default function LabImportModal({ open, onClose, labId }) {
  const setToast = useAppStore((state) => state.setToast);
  const fetchInventory = useAppStore((state) => state.fetchInventory);
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);

  const previewRows = useMemo(
    () =>
      rows.map((record, index) => {
        const missingFields = getMissingFields(record);
        return {
          id: `sheet-row-${index}`,
          rowNumber: index + 2,
          record,
          invalid: isEmptyRecord(record) || missingFields.length > 0,
          errors: isEmptyRecord(record) ? ['Empty row'] : missingFields.map((field) => `Missing ${field}`),
        };
      }),
    [rows]
  );

  const validRows = previewRows.filter((row) => !row.invalid);
  const invalidRows = previewRows.filter((row) => row.invalid);

  const resetImportState = () => {
    setFileName('');
    setHeaders([]);
    setRows([]);
    setWarnings([]);
    setDragging(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const closeModal = () => {
    resetImportState();
    onClose();
  };

  const downloadTemplate = () => {
    const headers = LAB_IMPORT_HEADERS.map(toCsvCell).join(',');
    const row1 = ['CHEM001', 'Acetone', '500', 'mL', '5', '120.5', '67-64-1', 'C3H6O', 'CC(=O)C', '1S/C3H6O/c1-3(2)4/h1-2H3', 'Merck', 'Shelf A1', 'LOT-123', '2025-01-01', '2028-01-01'].map(toCsvCell).join(',');
    const row2 = ['CHEM002', 'Sodium Chloride', '1000', 'g', '10', '45', '7647-14-5', 'NaCl', '[Na+].[Cl-]', '1S/ClH.Na/h1H;/q;+1/p-1', 'Sigma', 'Shelf B2', 'LOT-456', '2025-02-01', '2030-02-01'].map(toCsvCell).join(',');
    
    const csv = `${headers}\n${row1}\n${row2}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Lab_Inventory_Template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const validateHeaders = (incomingHeaders) => {
    const cleanedHeaders = incomingHeaders.map(normalizeHeader).filter(Boolean);
    const unknownHeaders = cleanedHeaders.filter((header) => !LAB_IMPORT_HEADERS.includes(header));
    const missingHeaders = LAB_IMPORT_HEADERS.filter((header) => !cleanedHeaders.includes(header));
    const nextWarnings = [
      ...unknownHeaders.map((header) => `Column "${header}" not recognized.`),
      ...missingHeaders.map((header) => `Column "${header}" is missing.`),
    ];
    setHeaders(cleanedHeaders);
    setWarnings(nextWarnings);
    return nextWarnings;
  };

  const normalizeRecords = (records) =>
    records.map((record) =>
      LAB_IMPORT_HEADERS.reduce((acc, header) => {
        acc[header] = record[header] ?? '';
        return acc;
      }, {})
    );

  const handleRecords = (incomingHeaders, records) => {
    validateHeaders(incomingHeaders);
    setRows(normalizeRecords(records));
  };

  const parseCsvFile = (file) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: false,
      complete: (result) => {
        handleRecords(result.meta.fields || [], result.data || []);
      },
      error: () => {
        setWarnings(['Unable to parse CSV file. Please use the correct template.']);
      },
    });
  };

  const parseExcelFile = async (file) => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      setWarnings(['Workbook has no sheets. Please use the correct template.']);
      return;
    }

    const sheet = workbook.Sheets[firstSheetName];
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const incomingHeaders = (matrix[0] || []).map(normalizeHeader);
    const records = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    handleRecords(incomingHeaders, records);
  };

  const handleFile = async (file) => {
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx'].includes(extension)) {
      setWarnings(['Only .xlsx and .csv files are supported.']);
      setRows([]);
      setFileName(file.name);
      return;
    }

    setFileName(file.name);
    setRows([]);
    setWarnings([]);

    if (extension === 'csv') {
      parseCsvFile(file);
      return;
    }

    await parseExcelFile(file);
  };

  const confirmImport = async (mode) => {
    if (!labId) {
      setToast({ type: 'error', message: 'No lab selected.' });
      return;
    }

    const chemicals = validRows.map((row, index) => mapSheetRowToChemical(row.record, index));
    if (!chemicals.length) {
      setToast({ type: 'error', message: 'No valid chemicals ready to import.' });
      return;
    }

    setImporting(true);
    try {
      const { toBackendLabInventory } = await import('../utils/labMapper');
      const backendChemicals = chemicals.map(toBackendLabInventory);
      
      const payload = {
        labId,
        items: backendChemicals,
        importMode: mode
      };
      
      const { data } = await api.post('/inventory/bulk-import', payload);
      
      setToast({ 
        type: 'success', 
        message: `Import complete:
${data.data.createdCount} chemicals added,
${data.data.updatedCount} chemicals updated,
${invalidRows.length + data.data.errorCount} skipped or failed` 
      });
      await fetchInventory(labId);
      closeModal();
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Import failed. Please try again.' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal open={open} onClose={closeModal} title='Bulk Import Lab Inventory' panelClassName='max-w-6xl'>
      <div className='space-y-5'>
        <div className='rounded-xl border border-[#d9e1ca] bg-white p-4 dark:border-[#414a33] dark:bg-[#20251a]'>
          <div className='mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex items-center gap-2 text-sm font-semibold text-[#3c4e23] dark:text-[#eef4e8]'>
              <FileSpreadsheet size={16} /> Upload Excel or CSV
            </div>
            <Button variant='outline' onClick={downloadTemplate}>
              <FileDown size={16} /> Download Template
            </Button>
          </div>

          <button
            type='button'
            className={`flex min-h-[9rem] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition ${
              dragging
                ? 'border-[#556b2f] bg-[#eef4e4] dark:bg-[#28301f]'
                : 'border-[#cfd8bd] bg-[#f9faef] hover:bg-[#f4f6ee] dark:border-[#4e5d35] dark:bg-[#1f2419] dark:hover:bg-[#28301f]'
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              handleFile(event.dataTransfer.files?.[0]);
            }}
          >
            <UploadCloud size={28} className='text-[#556b2f] dark:text-[#c5d0b5]' />
            <span className='text-sm font-semibold text-[#3c4e23] dark:text-[#eef4e8]'>Drop .xlsx or .csv here, or click to upload</span>
            <span className='text-xs text-[#71805a] dark:text-[#c5d0b5]'>Headers must match the provided template exactly.</span>
          </button>
          <input
            ref={fileInputRef}
            type='file'
            accept='.xlsx,.csv,text/csv'
            className='hidden'
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
          {fileName ? <p className='mt-3 text-xs text-[#71805a] dark:text-[#c5d0b5]'>Selected: <span className='font-semibold'>{fileName}</span></p> : null}
        </div>

        {warnings.length ? (
          <div className='rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-200'>
            <div className='max-h-28 space-y-1 overflow-y-auto'>
              {warnings.map((warning) => <p key={warning}>{warning}</p>)}
            </div>
          </div>
        ) : null}

        {previewRows.length ? (
          <div className='space-y-4'>
            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='rounded-xl bg-[#eef4e4] p-4 text-sm font-semibold text-[#3c4e23] dark:bg-[#28301f] dark:text-[#eef4e8]'>
                {validRows.length} chemicals ready to import
              </div>
              <div className='rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-700 dark:bg-rose-900/20 dark:text-rose-300'>
                {invalidRows.length} rows skipped due to errors
              </div>
            </div>

            <div className='max-h-[420px] overflow-auto rounded-xl border border-[#d9e1ca] shadow-soft dark:border-[#414a33]'>
              <table className='min-w-[1200px] table-auto text-left'>
                <thead className='sticky top-0 bg-[#f4f5eb] dark:bg-[#242a1d]'>
                  <tr>
                    <th className='px-3 py-3 text-xs font-semibold uppercase text-[#71805a] dark:text-[#c5d0b5]'>Row</th>
                    <th className='px-3 py-3 text-xs font-semibold uppercase text-[#71805a] dark:text-[#c5d0b5]'>Item Code</th>
                    <th className='px-3 py-3 text-xs font-semibold uppercase text-[#71805a] dark:text-[#c5d0b5]'>Chemical Name</th>
                    <th className='px-3 py-3 text-xs font-semibold uppercase text-[#71805a] dark:text-[#c5d0b5]'>CAS Number</th>
                    <th className='px-3 py-3 text-xs font-semibold uppercase text-[#71805a] dark:text-[#c5d0b5]'>Quantity</th>
                    <th className='px-3 py-3 text-xs font-semibold uppercase text-[#71805a] dark:text-[#c5d0b5]'>Unit</th>
                    <th className='px-3 py-3 text-xs font-semibold uppercase text-[#71805a] dark:text-[#c5d0b5]'>Cost/Unit</th>
                    <th className='px-3 py-3 text-xs font-semibold uppercase text-[#71805a] dark:text-[#c5d0b5]'>Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row) => (
                    <tr key={row.id} className={`border-t border-[#e3e9d8] dark:border-[#343b2b] ${row.invalid ? 'bg-rose-50 dark:bg-rose-900/20' : ''}`}>
                      <td className='px-3 py-3 text-sm text-slate-700 dark:text-slate-100'>{row.rowNumber}</td>
                      <td className='px-3 py-3 text-sm text-slate-700 dark:text-slate-100'>{row.record['Item Code'] || '--'}</td>
                      <td className='px-3 py-3 text-sm text-slate-700 dark:text-slate-100'>{row.record['Chemical Name'] || '--'}</td>
                      <td className='px-3 py-3 text-sm text-slate-700 dark:text-slate-100'>{row.record['CAS Number'] || '--'}</td>
                      <td className='px-3 py-3 text-sm text-slate-700 dark:text-slate-100'>{row.record['Quantity'] || '--'}</td>
                      <td className='px-3 py-3 text-sm text-slate-700 dark:text-slate-100'>{row.record['Quantity Unit'] || '--'}</td>
                      <td className='px-3 py-3 text-sm text-slate-700 dark:text-slate-100'>{row.record['Cost Per Unit (INR)'] || '--'}</td>
                      <td className='px-3 py-3 text-xs text-rose-700 dark:text-rose-300'>{row.errors.join(', ') || '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className='rounded-xl border border-[#d9e1ca] bg-[#f7f8f1] p-4 dark:border-[#414a33] dark:bg-[#28301f]'>
              <p className='text-sm font-semibold text-[#3c4e23] dark:text-[#eef4e8]'>Confirm Import</p>
              <p className='mt-1 text-xs text-[#71805a] dark:text-[#c5d0b5]'>Choose how to apply valid chemicals to the current lab inventory.</p>
              <div className='mt-3 flex flex-col gap-2 sm:flex-row'>
                <Button className='w-full' onClick={() => confirmImport('replace')} disabled={!validRows.length || importing}>
                  Replace All
                </Button>
                <Button variant='outline' className='w-full' onClick={() => confirmImport('merge')} disabled={!validRows.length || importing}>
                  Merge with existing
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {!previewRows.length && headers.length ? (
          <p className='rounded-lg border border-dashed border-[#cfd8bd] px-4 py-6 text-center text-sm text-[#71805a] dark:border-[#4e5d35] dark:text-[#c5d0b5]'>No rows found in the uploaded sheet.</p>
        ) : null}
      </div>
    </Modal>
  );
}
