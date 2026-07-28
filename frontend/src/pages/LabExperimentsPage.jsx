import { useEffect, useState, useMemo } from 'react';
import { Upload, Download, Plus, AlertCircle, FileText } from 'lucide-react';
import Papa from 'papaparse';
import useAppStore from '../store/appStore';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';

export default function LabExperimentsPage() {
  const { 
    labs, 
    labStructure, 
    fetchLabs, 
    fetchLabStructure, 
    uploadLabStructure 
  } = useAppStore();

  const [activeLabId, setActiveLabId] = useState(() => localStorage.getItem('pharmlab-active-lab') || '');
  const [importOpen, setImportOpen] = useState(false);
  const [importData, setImportData] = useState([]);
  const [importIssues, setImportIssues] = useState([]);
  const [importing, setImporting] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [fetchingSheet, setFetchingSheet] = useState(false);
  
  const currentLab = labs.find(l => l.id === activeLabId) || labs[0];

  useEffect(() => {
    fetchLabs();
  }, [fetchLabs]);

  useEffect(() => {
    if (activeLabId) {
      fetchLabStructure(activeLabId);
    } else if (labs.length > 0) {
      setActiveLabId(labs[0].id);
    }
  }, [activeLabId, labs, fetchLabStructure]);

  const processParsedData = (data) => {
    const issues = [];
    const grouped = {};

    data.forEach((row, i) => {
      // Handle empty rows
      if (!row.Subject && !row['Experiment Name'] && !row['Chemical Name']) return;

      const subject = row.Subject?.trim();
      const expNo = parseInt(row['Experiment Number'], 10);
      const expName = row['Experiment Name']?.trim();
      const chemName = row['Chemical Name']?.trim();
      const qty = parseFloat(row.Quantity);
      const unit = row.Unit?.trim();

      if (!subject || isNaN(expNo) || !expName) {
        issues.push(`Row ${i + 2}: Missing required subject/experiment details.`);
        return;
      }

      const key = `${subject}-${expNo}`;
      if (!grouped[key]) {
        grouped[key] = {
          subject,
          experimentNo: expNo,
          experimentName: expName,
          chemicals: []
        };
      }

      if (chemName && !isNaN(qty) && unit) {
        grouped[key].chemicals.push({
          chemicalName: chemName,
          quantityPerStudent: qty,
          unit
        });
      } else if (chemName || !isNaN(qty) || unit) {
        issues.push(`Row ${i + 2}: Incomplete chemical details for ${chemName}.`);
      }
    });

    setImportData(Object.values(grouped));
    setImportIssues(issues);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        processParsedData(results.data);
      },
      error: (error) => {
        setImportIssues([`Failed to parse CSV file: ${error.message}`]);
      }
    });
  };

  const handleUrlFetch = () => {
    if (!sheetUrl) return;
    setFetchingSheet(true);
    setImportIssues([]);
    setImportData([]);

    // Extract ID from URL
    const match = sheetUrl.match(/\/d\/(.*?)(\/|$)/);
    if (!match || !match[1]) {
      setImportIssues(["Invalid Google Sheets URL. Please provide a full link to the sheet."]);
      setFetchingSheet(false);
      return;
    }

    const docId = match[1];
    const exportUrl = `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv`;

    Papa.parse(exportUrl, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        processParsedData(results.data);
        setFetchingSheet(false);
      },
      error: (error) => {
        setImportIssues([`Failed to fetch sheet (ensure it is publicly accessible). Error: ${error.message || 'Unknown'}`]);
        setFetchingSheet(false);
      }
    });
  };

  const confirmImport = async () => {
    if (importData.length === 0) return;
    setImporting(true);
    try {
      await uploadLabStructure(importData);
      setImportOpen(false);
      setImportData([]);
      if (activeLabId) fetchLabStructure(activeLabId);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,Subject,Experiment Number,Experiment Name,Chemical Name,Quantity,Unit\nPharmaceutical Analysis,1,Preparation of 0.1 N HCl,Hydrochloric Acid,5,ml\nPharmaceutical Analysis,1,Preparation of 0.1 N HCl,Distilled Water,100,ml";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "lab_structure_template.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className='space-y-6 pb-10'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h2 className='text-2xl font-semibold text-[#3c4e23] dark:text-[#eef4e8]'>Lab Experiments</h2>
          <p className='text-[#71805a] dark:text-[#c5d0b5]'>
            {currentLab?.courseType} {currentLab?.year} {currentLab?.semester} Structure
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <select 
            value={activeLabId} 
            onChange={e => {
              setActiveLabId(e.target.value);
              localStorage.setItem('pharmlab-active-lab', e.target.value);
            }}
            className='rounded-lg border border-[#cfd8bd] bg-white px-3 py-2 text-sm text-[#3c4e23] outline-none focus:ring-2 focus:ring-[#6f7d45] dark:border-[#4e5d35] dark:bg-[#1a1d16] dark:text-[#eef4e8]'
          >
            {labs.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <Button variant='outline' onClick={() => setImportOpen(true)}>
            <Upload size={16} /> Upload CSV
          </Button>
        </div>
      </div>

      {labStructure.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#cfd8bd] bg-[#fdfdf7] py-16 text-center dark:border-[#4e5d35] dark:bg-[#1a1d16]">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f4f5eb] dark:bg-[#28301f]">
            <FileText size={28} className="text-[#87996c]" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-[#3c4e23] dark:text-[#eef4e8]">No Experiments Found</h3>
          <p className="mb-6 max-w-sm text-sm text-[#71805a] dark:text-[#c5d0b5]">
            There are currently no experiments loaded for this lab. Upload a CSV file containing the lab structure to get started.
          </p>
          <Button onClick={() => setImportOpen(true)}>
            <Upload size={16} className="mr-2" /> Upload CSV
          </Button>
        </div>
      ) : (
        <Card title='Experiment List'>
          <Table
            headers={[
              { key: 'subject', label: 'Subject' },
              { key: 'experimentNo', label: 'Exp No' },
              { key: 'experimentName', label: 'Experiment Name' },
              { 
                key: 'chemicals', 
                label: 'Chemicals Required',
                render: (row) => (
                  <div className="flex flex-col text-sm space-y-1">
                    {row.chemicals.map((c, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#87996c]" />
                        <span className="font-medium text-[#3c4e23] dark:text-[#eef4e8]">{c.chemicalName}:</span>
                        <span className="text-[#71805a] dark:text-[#c5d0b5]">{c.quantityPerStudent} {c.unit}</span>
                      </div>
                    ))}
                  </div>
                )
              }
            ]}
            rows={labStructure}
          />
        </Card>
      )}

      <Modal open={importOpen} onClose={() => { setImportOpen(false); setImportData([]); setImportIssues([]); }} title="Upload Lab Structure">
        <div className="space-y-6">
          <div className="rounded-xl border-2 border-dashed border-[#cfd8bd] bg-[#fdfdf7] p-10 text-center transition-colors hover:border-[#87996c] dark:border-[#4e5d35] dark:bg-[#1a1d16] dark:hover:border-[#87996c]">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#f4f5eb] dark:bg-[#28301f]">
              <Upload size={28} className="text-[#87996c]" />
            </div>
            <h3 className="mb-1 text-lg font-semibold text-[#3c4e23] dark:text-[#eef4e8]">Select a CSV file to upload</h3>
            <p className="mb-6 text-sm text-[#71805a] dark:text-[#c5d0b5]">File must match the provided template structure.</p>
            
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button variant="outline" onClick={downloadTemplate}>
                <Download size={16} className="mr-2" /> Download Template
              </Button>
              <label className="relative flex cursor-pointer items-center justify-center rounded-lg bg-[#556b2f] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#465825] focus-within:ring-2 focus-within:ring-[#6f7d45] focus-within:ring-offset-2">
                <Upload size={16} className="mr-2" /> Browse File
                <input type="file" accept=".csv" className="sr-only" onChange={handleFileUpload} />
              </label>
            </div>
            
            <div className="relative my-6 text-center">
              <span className="relative z-10 bg-[#fdfdf7] px-3 text-xs text-[#71805a] dark:bg-[#1a1d16] dark:text-[#c5d0b5]">OR UPLOAD VIA URL</span>
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#cfd8bd] dark:border-[#4e5d35]"></div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
              <Input 
                placeholder="Paste public Google Sheets link..." 
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                className="flex-1"
              />
              <Button 
                variant="outline" 
                onClick={handleUrlFetch} 
                disabled={fetchingSheet || !sheetUrl}
              >
                {fetchingSheet ? 'Fetching...' : 'Fetch Sheet'}
              </Button>
            </div>
          </div>

          {importIssues.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
              <p className="mb-3 flex items-center font-semibold"><AlertCircle size={18} className="mr-2" /> Import Issues found:</p>
              <ul className="list-inside list-disc space-y-1 max-h-32 overflow-y-auto pl-1">
                {importIssues.map((iss, i) => <li key={i}>{iss}</li>)}
              </ul>
            </div>
          )}

          {importData.length > 0 && (
            <div className="rounded-lg border border-[#cfd8bd] bg-white p-4 dark:border-[#4e5d35] dark:bg-[#20251a]">
              <h4 className="mb-3 flex items-center text-sm font-semibold text-[#3c4e23] dark:text-[#eef4e8]">
                <FileText size={18} className="mr-2 text-[#87996c]" /> Parsed {importData.length} experiments successfully
              </h4>
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {importData.map((d, i) => (
                  <div key={i} className="rounded-lg border border-[#e8ece1] bg-[#fdfdf7] p-3 text-sm dark:border-[#3c452f] dark:bg-[#1a1d16]">
                    <div className="font-semibold text-[#3c4e23] dark:text-[#eef4e8]">
                      {d.subject} <span className="text-[#87996c]">—</span> Exp {d.experimentNo}
                    </div>
                    <div className="mt-1 text-[#71805a] dark:text-[#c5d0b5]">
                      {d.experimentName} <span className="mx-2 text-slate-300 dark:text-slate-600">•</span> 
                      <span className="font-medium text-[#556b2f] dark:text-[#d5ddbf]">{d.chemicals.length} chemicals</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button onClick={confirmImport} disabled={importing || importData.length === 0} className="px-6">
              {importing ? 'Importing...' : 'Confirm Upload'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
