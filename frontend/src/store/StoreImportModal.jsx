import { FileDown, FileSpreadsheet, Link as LinkIcon, UploadCloud } from 'lucide-react';
import Papa from 'papaparse';
import { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import useAppStore from './appStore';
import useStoreManagerMock, { SHEET_IMPORT_HEADERS, getChemicalStatus } from './storeManagerMock';

function toCsvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function normalizeHeader(value) {
  return String(value || '').trim();
}

function parseNumber(value) {
  const cleaned = String(value ?? '').replace(/,/g, '').trim();
  if (!cleaned) return 0;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : 0;
}

function isEmptyRecord(record) {
  return SHEET_IMPORT_HEADERS.every((header) => String(record[header] ?? '').trim() === '');
}

function getMissingFields(record) {
  const missing = [];
  if (!String(record['Chemical ID'] ?? '').trim()) missing.push('Chemical ID');
  if (!String(record['Chemical Name'] ?? '').trim()) missing.push('Chemical Name');
  return missing;
}

function mapSheetRowToChemical(record, index) {
  return {
    ...record,
    id: String(record['Chemical ID'] || `sheet-${Date.now()}-${index}`).trim(),
    sheetData: { ...record },
  };
}

export default function StoreImportModal({ open, onClose }) {
  const addChemicals = useStoreManagerMock((state) => state.addChemicals);
  const setToast = useAppStore((state) => state.setToast);
  const fileInputRef = useRef(null);
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetMessage, setSheetMessage] = useState('');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [dragging, setDragging] = useState(false);

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
    setSheetUrl('');
    setSheetMessage('');
    onClose();
  };

  const downloadTemplate = () => {
    const headers = SHEET_IMPORT_HEADERS.map(toCsvCell).join(',');
    const row1 = ['37022-125', 'ACETONE LR', '67-64-1', 'Dimethyl ketone', 'CC(=O)C', 'https://pubchem.ncbi.nlm.nih.gov/#query=67-64-1', 'C3H6O', '58.08 g/mol', 'CSCPPUNOUOLXCY-UHFFFAOYSA-N', 'S.K. Traders', 'B-SGSITS-37022-302', 'IR2521728', 'LR', '2.5L', 'UNT', '15210', '1521', '0.61', '10', '10', 'Flammable Liquid', 'Anti-static Lab Coat Goggles Nitrile Gloves'].map(toCsvCell).join(',');
    const row2 = ['37035-L02', 'ACETYLACETONE LR', '123-54-6', '2-4-Pentanedione', 'CC(=O)CC(=O)C', 'https://pubchem.ncbi.nlm.nih.gov/#query=123-54-6', 'C5H8O2', '100.12 g/mol', 'HHLFWLYXYJOAMK-UHFFFAOYSA-N', 'S.K. Traders', 'B-SGSITS-37035-303', 'IR2521728', 'LR', '250ml', 'UNT', '1810', '905', '3.62', '2', '2', 'Flammable Toxic', 'Anti-static Lab Coat Goggles Nitrile Gloves'].map(toCsvCell).join(',');
    
    const csv = `${headers}\n${row1}\n${row2}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'RasayanFlow_Chemical_Template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const validateHeaders = (incomingHeaders) => {
    const cleanedHeaders = incomingHeaders.map(normalizeHeader).filter(Boolean);
    const unknownHeaders = cleanedHeaders.filter((header) => !SHEET_IMPORT_HEADERS.includes(header));
    const missingHeaders = SHEET_IMPORT_HEADERS.filter((header) => !cleanedHeaders.includes(header));
    const nextWarnings = [
      ...unknownHeaders.map((header) => `Column ${header} not recognized. Please use the correct template.`),
      ...missingHeaders.map((header) => `Column ${header} is missing. Please use the correct template.`),
    ];
    setHeaders(cleanedHeaders);
    setWarnings(nextWarnings);
    return nextWarnings;
  };

  const normalizeRecords = (records) =>
    records.map((record) =>
      SHEET_IMPORT_HEADERS.reduce((acc, header) => {
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
    const chemicals = validRows.map((row, index) => mapSheetRowToChemical(row.record, index));
    if (!chemicals.length) {
      setToast({ type: 'error', message: 'No valid chemicals ready to import.' });
      return;
    }

    try {
      // Map to backend keys before sending
      const { toBackendChemical } = await import('../utils/storeMapper');
      const backendChemicals = chemicals.map(toBackendChemical);
      
      const { data } = await (await import('../services/api')).default.post('/store/inventory/import', backendChemicals);
      
      setToast({ 
        type: 'success', 
        message: `Import complete:
${data.added} chemicals added,
${data.updated} chemicals updated,
${invalidRows.length} rows skipped (missing Chemical ID)` 
      });
      closeModal();
    } catch (error) {
      setToast({ type: 'error', message: 'Import failed. Please try again.' });
    }
  };

  return (
    <Modal open={open} onClose={closeModal} title='Import from Google Sheets' panelClassName='max-w-6xl'>
      <div className='space-y-5'>
        <div className='rounded-xl border border-[#d9e1ca] bg-[#f7f8f1] p-4 dark:border-[#414a33] dark:bg-[#28301f]'>
          <div className='mb-3 flex items-center gap-2 text-sm font-semibold text-[#3c4e23] dark:text-[#eef4e8]'>
            <LinkIcon size={16} /> Option 1 - Google Sheet Link
          </div>
          <div className='grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end'>
            <Input label='Google Sheet URL' value={sheetUrl} onChange={(event) => setSheetUrl(event.target.value)} placeholder='Paste Google Sheet URL' />
            <Button
              onClick={() => setSheetMessage('Google Sheets API will be connected by backend team. Use Excel upload below.')}
            >
              Connect & Preview
            </Button>
          </div>
          {sheetMessage ? <p className='mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200'>{sheetMessage}</p> : null}
        </div>

        <div className='rounded-xl border border-[#d9e1ca] bg-white p-4 dark:border-[#414a33] dark:bg-[#20251a]'>
          <div className='mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex items-center gap-2 text-sm font-semibold text-[#3c4e23] dark:text-[#eef4e8]'>
              <FileSpreadsheet size={16} /> Option 2 - Upload Excel or CSV
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
                    <th className='px-3 py-3 text-xs font-semibold uppercase text-[#71805a] dark:text-[#c5d0b5]'>Chemical ID</th>
                    <th className='px-3 py-3 text-xs font-semibold uppercase text-[#71805a] dark:text-[#c5d0b5]'>Chemical Name</th>
                    <th className='px-3 py-3 text-xs font-semibold uppercase text-[#71805a] dark:text-[#c5d0b5]'>CAS Number</th>
                    <th className='px-3 py-3 text-xs font-semibold uppercase text-[#71805a] dark:text-[#c5d0b5]'>Grade</th>
                    <th className='px-3 py-3 text-xs font-semibold uppercase text-[#71805a] dark:text-[#c5d0b5]'>Available Qty</th>
                    <th className='px-3 py-3 text-xs font-semibold uppercase text-[#71805a] dark:text-[#c5d0b5]'>Unit Price (INR)</th>
                    <th className='px-3 py-3 text-xs font-semibold uppercase text-[#71805a] dark:text-[#c5d0b5]'>Hazard Class</th>
                    <th className='px-3 py-3 text-xs font-semibold uppercase text-[#71805a] dark:text-[#c5d0b5]'>Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row) => (
                    <tr key={row.id} className={`border-t border-[#e3e9d8] dark:border-[#343b2b] ${row.invalid ? 'bg-rose-50 dark:bg-rose-900/20' : ''}`}>
                      <td className='px-3 py-3 text-sm text-slate-700 dark:text-slate-100'>{row.rowNumber}</td>
                      <td className='px-3 py-3 text-sm text-slate-700 dark:text-slate-100'>{row.record['Chemical ID'] || '--'}</td>
                      <td className='px-3 py-3 text-sm text-slate-700 dark:text-slate-100'>{row.record['Chemical Name'] || '--'}</td>
                      <td className='px-3 py-3 text-sm text-slate-700 dark:text-slate-100'>{row.record['CAS Number'] || '--'}</td>
                      <td className='px-3 py-3 text-sm text-slate-700 dark:text-slate-100'>{row.record['Grade'] || '--'}</td>
                      <td className='px-3 py-3 text-sm text-slate-700 dark:text-slate-100'>{row.record['Available Quantity'] || '--'}</td>
                      <td className='px-3 py-3 text-sm text-slate-700 dark:text-slate-100'>{row.record['Unit Price (INR)'] || '--'}</td>
                      <td className='px-3 py-3 text-sm text-slate-700 dark:text-slate-100'>{row.record['Hazard Class'] || '--'}</td>
                      <td className='px-3 py-3 text-xs text-rose-700 dark:text-rose-300'>{row.errors.join(', ') || '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className='rounded-xl border border-[#d9e1ca] bg-[#f7f8f1] p-4 dark:border-[#414a33] dark:bg-[#28301f]'>
              <p className='text-sm font-semibold text-[#3c4e23] dark:text-[#eef4e8]'>Confirm Import</p>
              <p className='mt-1 text-xs text-[#71805a] dark:text-[#c5d0b5]'>Choose how to apply valid chemicals to the current inventory.</p>
              <div className='mt-3 flex flex-col gap-2 sm:flex-row'>
                <Button className='w-full' onClick={() => confirmImport('replace')} disabled={!validRows.length}>
                  Replace All
                </Button>
                <Button variant='outline' className='w-full' onClick={() => confirmImport('merge')} disabled={!validRows.length}>
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
