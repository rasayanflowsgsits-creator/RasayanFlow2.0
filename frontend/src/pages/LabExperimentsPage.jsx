import { useEffect, useState, useMemo } from 'react';
import { Upload, Download, Plus, AlertCircle, FileText } from 'lucide-react';
import { parseCsv } from '../utils/csv';
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

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    parseCsv(file, (data) => {
      const issues = [];
      const parsedStructures = [];

      // Group by subject and experimentNo
      const grouped = {};

      data.forEach((row, i) => {
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
                <div className="flex flex-col text-sm">
                  {row.chemicals.map((c, i) => (
                    <span key={i}>{c.chemicalName}: {c.quantityPerStudent} {c.unit}</span>
                  ))}
                </div>
              )
            }
          ]}
          rows={labStructure}
        />
      </Card>

      <Modal open={importOpen} onClose={() => { setImportOpen(false); setImportData([]); setImportIssues([]); }} title="Upload Lab Structure">
        <div className="space-y-4">
          <div className="rounded-xl border border-dashed border-[#cfd8bd] bg-[#fdfdf7] p-8 text-center dark:border-[#4e5d35] dark:bg-[#1a1d16]">
            <Upload size={24} className="mx-auto mb-3 text-[#87996c]" />
            <p className="text-sm font-medium text-[#3c4e23] dark:text-[#eef4e8]">Select a CSV file to upload</p>
            <p className="mt-1 text-xs text-[#71805a]">File must match the template structure.</p>
            <div className="mt-4 flex justify-center gap-3">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download size={14} /> Download Template
              </Button>
              <label className="cursor-pointer rounded-lg bg-[#556b2f] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#465825]">
                Browse File
                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          </div>

          {importIssues.length > 0 && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
              <p className="font-semibold mb-2 flex items-center gap-2"><AlertCircle size={16} /> Import Issues found:</p>
              <ul className="list-disc pl-5 max-h-32 overflow-y-auto">
                {importIssues.map((iss, i) => <li key={i}>{iss}</li>)}
              </ul>
            </div>
          )}

          {importData.length > 0 && (
            <div className="rounded-lg border border-[#cfd8bd] p-4 dark:border-[#4e5d35]">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <FileText size={16} /> Parsed {importData.length} experiments
              </h4>
              <div className="max-h-40 overflow-y-auto text-xs space-y-2">
                {importData.map((d, i) => (
                  <div key={i} className="bg-slate-50 dark:bg-[#20251a] p-2 rounded">
                    <strong>{d.subject} - Exp {d.experimentNo}:</strong> {d.experimentName} ({d.chemicals.length} chemicals)
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-[#d9e1ca] dark:border-[#4e5d35]">
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button onClick={confirmImport} disabled={importing || importData.length === 0}>
              {importing ? 'Importing...' : 'Confirm Upload'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
