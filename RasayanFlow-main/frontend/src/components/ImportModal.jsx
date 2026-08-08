import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import useAppStore from '../store/appStore';
import { UploadCloud, Link as LinkIcon, Download, AlertCircle, CheckCircle } from 'lucide-react';

const REQUIRED_HEADERS = [
  'Chemical ID', 'Chemical Name', 'CAS Number', 'Synonyms', 'Molecular Formula',
  'Molecular Weight', 'Supplier', 'Batch Number', 'Grade', 'Pack Size',
  'Standard Unit', 'Purchase Price INR', 'Unit Price INR', 'Received Quantity',
  'Available Quantity', 'Hazard Class', 'Safety Wear', 'Reorder Level',
  'Storage Block', 'Rack No', 'Shelf No', 'Location Code', 'Status', 'Remarks'
];

export default function ImportModal({ open, onClose, onImportSuccess }) {
  const { bulkImportStoreItems, setToast } = useAppStore();
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' or 'link'
  const [googleSheetLink, setGoogleSheetLink] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [headerError, setHeaderError] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const resetState = () => {
    setActiveTab('upload');
    setGoogleSheetLink('');
    setPreviewData(null);
    setHeaderError('');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleDownloadTemplate = () => {
    const csvContent = REQUIRED_HEADERS.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Store_Inventory_Template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const processData = (headers, rows) => {
    // Validate headers
    const missingHeaders = REQUIRED_HEADERS.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      setHeaderError(`Column(s) not recognized: ${missingHeaders.join(', ')}. Please use the correct template.`);
      setPreviewData(null);
      return;
    }

    setHeaderError('');

    const parsedRows = rows.map(row => {
      // Validate row (basic validation)
      const chemicalName = row['Chemical Name'];
      const chemicalId = row['Chemical ID'];
      const isValid = Boolean(chemicalName && chemicalId);
      return { data: row, isValid };
    });

    setPreviewData({
      headers,
      rows: parsedRows,
      validCount: parsedRows.filter(r => r.isValid).length,
      invalidCount: parsedRows.filter(r => !r.isValid).length
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop().toLowerCase();
    
    if (fileExt === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.meta.fields) {
            processData(results.meta.fields, results.data);
          }
        }
      });
    } else if (fileExt === 'xlsx') {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
        if (data.length > 0) {
          const headers = Object.keys(data[0]);
          processData(headers, data);
        }
      };
      reader.readAsBinaryString(file);
    } else {
      setHeaderError('Please upload a valid .csv or .xlsx file.');
    }
  };

  const handleGoogleSheetConnect = () => {
    if (!googleSheetLink) return;
    setToast({ type: 'info', message: 'Google Sheets API will be connected by backend team. Use Excel upload below.' });
  };

  const handleConfirmImport = async (mode) => {
    if (!previewData || previewData.validCount === 0) return;
    
    setImporting(true);
    try {
      // Map rows to backend schema
      const itemsToImport = previewData.rows
        .filter(r => r.isValid)
        .map(r => ({
          itemCode: r.data['Chemical ID'],
          itemName: r.data['Chemical Name'],
          category: 'Chemical',
          subCategory: r.data['Hazard Class'] || 'General',
          quantity: Number(r.data['Available Quantity']) || 0,
          quantityUnit: r.data['Standard Unit'] || 'units',
          storageLocation: [r.data['Storage Block'], r.data['Rack No'], r.data['Shelf No'], r.data['Location Code']].filter(Boolean).join('-'),
          description: r.data['Remarks'] || '',
        }));

      const result = await bulkImportStoreItems({ items: itemsToImport, importMode: mode });
      setToast({ type: 'success', message: `${result.summary.imported} chemicals imported successfully.` });
      
      if (onImportSuccess) onImportSuccess();
      handleClose();
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Import failed.' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Import from Google Sheets / Excel">
      <div className="space-y-6">
        
        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          <button
            className={`flex-1 py-2 text-sm font-medium ${activeTab === 'upload' ? 'border-b-2 border-[#4e5d35] text-[#4e5d35] dark:border-[#a3b87a] dark:text-[#a3b87a]' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            onClick={() => setActiveTab('upload')}
          >
            Upload Excel/CSV
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium ${activeTab === 'link' ? 'border-b-2 border-[#4e5d35] text-[#4e5d35] dark:border-[#a3b87a] dark:text-[#a3b87a]' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            onClick={() => setActiveTab('link')}
          >
            Google Sheet Link
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'link' && (
          <div className="space-y-4">
            <Input 
              label="Google Sheet URL" 
              placeholder="https://docs.google.com/spreadsheets/d/..." 
              value={googleSheetLink}
              onChange={(e) => setGoogleSheetLink(e.target.value)}
            />
            <Button className="w-full" onClick={handleGoogleSheetConnect}>
              <LinkIcon size={16} className="mr-2" /> Connect & Preview
            </Button>
            <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
              Google Sheets API will be connected by backend team. Use Excel upload below for now.
            </div>
          </div>
        )}

        {activeTab === 'upload' && !previewData && (
          <div className="space-y-4">
            <div 
              className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#cfd8bd] bg-[#f4f5eb] p-10 text-center dark:border-[#414a33] dark:bg-[#20251a]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) handleFileUpload({ target: { files: [file] } });
              }}
            >
              <UploadCloud size={48} className="text-[#8b9e6c]" />
              <p className="mt-4 text-lg font-medium text-[#3c4e23] dark:text-[#eef4e8]">Drag and drop your file here</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Accepts .xlsx and .csv only</p>
              <Button variant="outline" className="mt-6" onClick={() => fileInputRef.current?.click()}>
                Browse Files
              </Button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                onChange={handleFileUpload} 
              />
            </div>
            
            {headerError && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Header Mismatch Warning</p>
                  <p>{headerError}</p>
                  <Button variant="outline" className="mt-3 bg-white text-red-700 hover:bg-red-50 dark:bg-transparent dark:text-red-300 dark:border-red-800" onClick={handleDownloadTemplate}>
                    <Download size={14} className="mr-1" /> Download Correct Template
                  </Button>
                </div>
              </div>
            )}
            
            {!headerError && (
              <div className="flex justify-end">
                <Button variant="ghost" className="text-sm" onClick={handleDownloadTemplate}>
                  <Download size={14} className="mr-1" /> Download Template
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Preview Section */}
        {previewData && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[#3c4e23] dark:text-[#eef4e8]">Preview Data</h3>
              <Button variant="ghost" size="sm" onClick={() => setPreviewData(null)}>Cancel</Button>
            </div>
            
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                <CheckCircle size={14} /> {previewData.validCount} chemicals ready
              </div>
              {previewData.invalidCount > 0 && (
                <div className="flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300">
                  <AlertCircle size={14} /> {previewData.invalidCount} rows skipped
                </div>
              )}
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium whitespace-nowrap">Chemical ID</th>
                    <th className="px-3 py-2 font-medium whitespace-nowrap">Chemical Name</th>
                    <th className="px-3 py-2 font-medium whitespace-nowrap">Available Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {previewData.rows.slice(0, 10).map((row, idx) => (
                    <tr key={idx} className={row.isValid ? 'bg-white dark:bg-[#23281d]' : 'bg-red-50 dark:bg-red-900/20'}>
                      <td className="px-3 py-2">
                        {row.isValid ? 
                          <span className="text-emerald-600 dark:text-emerald-400">Valid</span> : 
                          <span className="text-red-600 dark:text-red-400 font-medium">Invalid</span>
                        }
                      </td>
                      <td className="px-3 py-2">{row.data['Chemical ID'] || '-'}</td>
                      <td className="px-3 py-2">{row.data['Chemical Name'] || '-'}</td>
                      <td className="px-3 py-2">{row.data['Available Quantity'] || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewData.rows.length > 10 && (
                <div className="bg-slate-50 p-2 text-center text-xs text-slate-500 dark:bg-slate-800/50">
                  Showing first 10 rows of {previewData.rows.length} total
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 pt-2">
              <Button variant="outline" className="w-full" onClick={() => handleConfirmImport('merge')} disabled={importing}>
                {importing ? 'Importing...' : 'Merge with existing'}
              </Button>
              <Button variant="outline" className="w-full bg-[#3c4e23] hover:bg-[#2d3a1a] text-white border-transparent" onClick={() => handleConfirmImport('replace')} disabled={importing}>
                {importing ? 'Importing...' : 'Replace All'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
