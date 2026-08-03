import { useEffect, useState, useMemo } from 'react';
import { Upload, Download, Plus, AlertCircle, FileText, CheckCircle2, XCircle, Search, LayoutGrid, Table as TableIcon, Tag, FlaskConical, Edit3, Trash2 } from 'lucide-react';
import Papa from 'papaparse';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import api from '../services/api';

export default function LabExperimentsPage() {
  const { 
    labs, 
    labStructure, 
    inventory,
    fetchLabs, 
    fetchLabStructure, 
    uploadLabStructure,
    fetchInventory
  } = useAppStore();

  const user = useAuthStore((state) => state.user);

  const [activeLabId, setActiveLabId] = useState(() => localStorage.getItem('pharmlab-active-lab') || user?.labId || '');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');

  // Modal / Import state
  const [importOpen, setImportOpen] = useState(false);
  const [importStep, setImportStep] = useState(1); // 1: Upload, 2: Preview & Edit, 3: Success
  const [importData, setImportData] = useState([]);
  const [importIssues, setImportIssues] = useState([]);
  const [importing, setImporting] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [fetchingSheet, setFetchingSheet] = useState(false);
  
  const currentLab = labs.find(l => (l.id === activeLabId || l._id === activeLabId)) || labs[0];

  useEffect(() => {
    fetchLabs();
  }, [fetchLabs]);

  useEffect(() => {
    const targetLab = activeLabId || user?.labId || (labs.length > 0 ? (labs[0]._id || labs[0].id) : '');
    if (targetLab && targetLab !== activeLabId) {
      setActiveLabId(targetLab);
    }
    fetchLabStructure(targetLab);
    if (fetchInventory) fetchInventory(targetLab);
  }, [activeLabId, user?.labId, labs, fetchLabStructure, fetchInventory]);

  // Unique subjects for filter
  const subjects = useMemo(() => {
    const set = new Set((labStructure || []).map(item => item.subject).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [labStructure]);

  // Filtered experiments
  const filteredExperiments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (labStructure || []).filter(item => {
      const matchesSearch = !q || item.experimentName?.toLowerCase().includes(q) || item.subject?.toLowerCase().includes(q);
      const matchesSubject = selectedSubject === 'All' || item.subject === selectedSubject;
      return matchesSearch && matchesSubject;
    });
  }, [labStructure, search, selectedSubject]);

  // Stock check lookup for experiment chemicals
  const getStockStatus = (chemName) => {
    const item = (inventory || []).find(i => i.chemicalName?.toLowerCase() === chemName?.toLowerCase());
    if (!item) return { status: 'missing', label: 'Not in Stock', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' };
    const qty = Number(item.quantity || 0);
    const min = Number(item.minThreshold || 5);
    if (qty === 0) return { status: 'out', label: 'Out of Stock', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' };
    if (qty <= min) return { status: 'low', label: `Low (${qty} ${item.unit || ''})`, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
    return { status: 'ok', label: `In Stock (${qty} ${item.unit || ''})`, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
  };

  const getCol = (row, ...aliases) => {
    if (!row || typeof row !== 'object') return '';
    const keys = Object.keys(row);
    for (const alias of aliases) {
      const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
      const match = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanAlias);
      if (match && row[match] !== undefined && row[match] !== null && String(row[match]).trim() !== '') {
        return String(row[match]).trim();
      }
    }
    return '';
  };

  const processParsedData = (data) => {
    const issues = [];
    const grouped = {};
    let fallbackExpNo = 1;

    data.forEach((row, i) => {
      if (!row || typeof row !== 'object') return;
      
      const subject = getCol(row, 'subject', 'lab', 'course', 'department') || currentLab?.labName || currentLab?.name || 'General';
      let expNo = parseInt(getCol(row, 'experimentnumber', 'experimentno', 'expno', 'expnum', 'exp', 'sno', 'no', 'number'), 10);
      const expName = getCol(row, 'experimentname', 'experimenttitle', 'title', 'name', 'objective', 'experiment');
      const chemName = getCol(row, 'chemicalname', 'chemical', 'reagent', 'item', 'ingredient', 'name');
      const qtyStr = getCol(row, 'quantity', 'qty', 'amount', 'quantityperstudent');
      const qty = parseFloat(qtyStr) || 1;
      const unit = getCol(row, 'unit', 'units', 'uom') || 'g';

      if (isNaN(expNo)) {
        expNo = fallbackExpNo;
      }

      if (!expName && !chemName) return;

      const finalExpName = expName || `Experiment #${expNo}`;
      const key = `${subject}-${expNo}-${finalExpName}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          subject,
          experimentNo: expNo,
          experimentName: finalExpName,
          chemicals: []
        };
        fallbackExpNo += 1;
      }

      if (chemName) {
        grouped[key].chemicals.push({
          chemicalName: chemName,
          quantityPerStudent: qty,
          unit: unit
        });
      }
    });

    const parsedList = Object.values(grouped);
    setImportData(parsedList);
    setImportIssues(issues);
    if (parsedList.length > 0) {
      setImportStep(2);
    } else {
      setImportIssues(['No valid experiment rows found in CSV. Please check column headers.']);
    }
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
      await uploadLabStructure(importData, activeLabId);
      setImportStep(3);
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

  const [addOpen, setAddOpen] = useState(false);
  const [addingExp, setAddingExp] = useState(false);
  const [newExp, setNewExp] = useState({
    subject: 'HAP1',
    experimentNo: '1',
    experimentName: '',
    chemicals: [{ chemicalName: '', quantityPerStudent: '10', unit: 'mL' }]
  });

  const handleAddChemicalRow = () => {
    setNewExp(prev => ({
      ...prev,
      chemicals: [...prev.chemicals, { chemicalName: '', quantityPerStudent: '10', unit: 'mL' }]
    }));
  };

  const handleRemoveChemicalRow = (idx) => {
    setNewExp(prev => ({
      ...prev,
      chemicals: prev.chemicals.filter((_, i) => i !== idx)
    }));
  };

  const [editingExpId, setEditingExpId] = useState(null);

  const handleOpenAddModal = () => {
    const defaultSubj = currentLab?.labName || currentLab?.name || 'HAP1';
    setEditingExpId(null);
    setNewExp({
      subject: defaultSubj,
      experimentNo: String((labStructure?.length || 0) + 1),
      experimentName: '',
      chemicals: [{ chemicalName: '', quantityPerStudent: '10', unit: 'mL' }]
    });
    setAddOpen(true);
  };

  const handleOpenEditModal = (exp) => {
    setEditingExpId(exp._id || exp.id);
    setNewExp({
      subject: exp.subject || 'HAP1',
      experimentNo: String(exp.experimentNo || '1'),
      experimentName: exp.experimentName || '',
      chemicals: exp.chemicals?.length 
        ? exp.chemicals.map(c => ({ chemicalName: c.chemicalName, quantityPerStudent: String(c.quantityPerStudent || 10), unit: c.unit || 'mL' }))
        : [{ chemicalName: '', quantityPerStudent: '10', unit: 'mL' }]
    });
    setAddOpen(true);
  };

  const handleDeleteExperiment = async (expId, expName) => {
    if (!window.confirm(`Are you sure you want to delete "${expName}"?`)) return;
    try {
      await api.delete(`/lab/structure/experiment/${expId}`);
      if (activeLabId) fetchLabStructure(activeLabId);
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete experiment');
    }
  };

  const handleSaveManualExperiment = async () => {
    if (!newExp.subject || !newExp.experimentName) {
      alert('Please fill in the subject and experiment name');
      return;
    }
    setAddingExp(true);
    try {
      if (editingExpId) {
        await api.put(`/lab/structure/experiment/${editingExpId}`, {
          ...newExp,
          labId: activeLabId
        });
      } else {
        await api.post('/lab/structure/experiment', {
          ...newExp,
          labId: activeLabId
        });
      }
      setAddOpen(false);
      setEditingExpId(null);
      if (activeLabId) fetchLabStructure(activeLabId);
      setNewExp({
        subject: 'HAP1',
        experimentNo: '1',
        experimentName: '',
        chemicals: [{ chemicalName: '', quantityPerStudent: '10', unit: 'mL' }]
      });
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to save experiment');
    } finally {
      setAddingExp(false);
    }
  };

  return (
    <div className='space-y-6 pb-10'>
      {/* Page Header */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h2 className='text-2xl font-semibold text-[#3c4e23] dark:text-[#eef4e8]'>Lab Experiments</h2>
          <p className='text-[#71805a] dark:text-[#c5d0b5]'>
            {currentLab?.courseType || 'B.Pharm'} {currentLab?.year || '1'} {currentLab?.semester || '1'} Curriculum Structure
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-3'>
          <div className="flex bg-[#f4f5eb] dark:bg-[#1c2117] p-1 rounded-lg border border-[#d9e1ca] dark:border-[#4e5d35]">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition ${viewMode === 'grid' ? 'bg-[#556b2f] text-white' : 'text-[#71805a]'}`}
              title="Grid Cards View"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition ${viewMode === 'table' ? 'bg-[#556b2f] text-white' : 'text-[#71805a]'}`}
              title="Table View"
            >
              <TableIcon size={16} />
            </button>
          </div>
          <Button onClick={handleOpenAddModal} className="bg-[#556b2f] text-white">
            <Plus size={16} className="mr-1" /> Add Experiment
          </Button>
          <Button variant='outline' onClick={() => { setImportStep(1); setImportOpen(true); }}>
            <Upload size={16} /> Upload CSV Wizard
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#fffef8] dark:bg-[#1c2117] p-4 rounded-xl border border-[#d9e1ca] dark:border-[#3c452f] shadow-sm">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#87996c]" size={16} />
          <Input 
            className="pl-9" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Search experiment name, subject..." 
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          <Tag size={14} className="text-[#87996c] flex-shrink-0" />
          {subjects.map(subj => (
            <button
              key={subj}
              onClick={() => setSelectedSubject(subj)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition ${
                selectedSubject === subj
                  ? 'bg-[#556b2f] text-white'
                  : 'bg-[#f4f5eb] dark:bg-[#28301f] text-[#71805a] hover:bg-[#e8efd9]'
              }`}
            >
              {subj}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {labStructure.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#cfd8bd] bg-[#fdfdf7] py-16 text-center dark:border-[#4e5d35] dark:bg-[#1a1d16]">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f4f5eb] dark:bg-[#28301f]">
            <FlaskConical size={28} className="text-[#87996c]" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-[#3c4e23] dark:text-[#eef4e8]">No Experiments Found</h3>
          <p className="mb-6 max-w-sm text-sm text-[#71805a] dark:text-[#c5d0b5]">
            There are currently no experiments loaded for this lab. Upload a CSV file containing the lab structure to get started.
          </p>
          <Button onClick={() => { setImportStep(1); setImportOpen(true); }}>
            <Upload size={16} className="mr-2" /> Upload CSV Wizard
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Cards Layout with Chemical Stock Status Badges */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredExperiments.map((exp, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-[#d9e1ca] dark:border-[#3c452f] bg-[#fffef8] dark:bg-[#1c2117] p-5 shadow-sm hover:shadow-md hover:-translate-y-1 transition duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#556b2f] dark:text-[#a5b48b] bg-[#f0f4e8] dark:bg-[#28301f] px-2.5 py-1 rounded-md">
                    {exp.subject}
                  </span>
                  <span className="text-xs font-semibold text-[#87996c]">
                    Exp #{exp.experimentNo}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#3c4e23] dark:text-[#eef4e8] mb-4">
                  {exp.experimentName}
                </h3>

                <div className="space-y-2 mb-4">
                  <p className="text-xs font-semibold text-[#71805a] uppercase tracking-wider">Required Chemicals</p>
                  {(exp.chemicals || []).map((c, ci) => {
                    const stock = getStockStatus(c.chemicalName);
                    return (
                      <div key={ci} className="flex items-center justify-between text-xs p-2 rounded-lg bg-[#fdfdf7] dark:bg-[#1a1d16] border border-[#e8ece1] dark:border-[#3c452f]">
                        <div className="font-medium text-[#3c4e23] dark:text-[#eef4e8]">
                          {c.chemicalName} <span className="text-[#87996c]">({c.quantityPerStudent} {c.unit})</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${stock.color}`}>
                          {stock.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-[#e8ece1] dark:border-[#3c452f] flex justify-between items-center text-xs text-[#87996c]">
                <span className="font-semibold">{exp.chemicals?.length || 0} Ingredients</span>
                <div className="flex items-center gap-1.5">
                  <button 
                    type="button" 
                    onClick={() => handleOpenEditModal(exp)}
                    className="p-1 rounded hover:bg-[#e8efd9] text-[#556b2f] dark:hover:bg-[#28301f] transition"
                    title="Edit Experiment"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleDeleteExperiment(exp._id || exp.id, exp.experimentName)}
                    className="p-1 rounded hover:bg-rose-100 text-rose-600 dark:hover:bg-rose-950/40 transition"
                    title="Delete Experiment"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <Card title='Experiment List'>
          <Table
            headers={[
              { key: 'subject', label: 'Subject' },
              { key: 'experimentNo', label: 'Exp No' },
              { key: 'experimentName', label: 'Experiment Name' },
              { 
                key: 'chemicals', 
                label: 'Chemicals Required & Stock Status',
                render: (row) => (
                  <div className="flex flex-col text-sm space-y-1">
                    {row.chemicals.map((c, i) => {
                      const stock = getStockStatus(c.chemicalName);
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#87996c]" />
                          <span className="font-medium text-[#3c4e23] dark:text-[#eef4e8]">{c.chemicalName}:</span>
                          <span className="text-[#71805a] dark:text-[#c5d0b5]">{c.quantityPerStudent} {c.unit}</span>
                          <span className={`px-2 py-0.2 text-[10px] font-semibold rounded ${stock.color}`}>
                            {stock.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )
              },
              {
                key: 'actions',
                label: 'Actions',
                render: (row) => (
                  <div className="flex items-center gap-1.5">
                    <button 
                      type="button" 
                      onClick={() => handleOpenEditModal(row)}
                      className="p-1.5 rounded-lg hover:bg-[#e8efd9] text-[#556b2f] dark:hover:bg-[#28301f] transition"
                      title="Edit Experiment"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleDeleteExperiment(row._id || row.id, row.experimentName)}
                      className="p-1.5 rounded-lg hover:bg-rose-100 text-rose-600 dark:hover:bg-rose-950/40 transition"
                      title="Delete Experiment"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )
              }
            ]}
            rows={filteredExperiments}
          />
        </Card>
      )}

      {/* 3-Step Drag & Drop Excel Import Wizard Modal */}
      <Modal open={importOpen} onClose={() => { setImportOpen(false); setImportData([]); setImportIssues([]); }} title="Import Experiments Wizard">
        <div className="space-y-6">
          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-4 border-b border-[#e8ece1] dark:border-[#3c452f] pb-4">
            <div className={`flex items-center gap-1.5 text-xs font-semibold ${importStep >= 1 ? 'text-[#556b2f]' : 'text-[#87996c]'}`}>
              <span className={`h-5 w-5 rounded-full flex items-center justify-center text-white ${importStep >= 1 ? 'bg-[#556b2f]' : 'bg-slate-300'}`}>1</span>
              <span>Upload CSV</span>
            </div>
            <span className="text-slate-300">•</span>
            <div className={`flex items-center gap-1.5 text-xs font-semibold ${importStep >= 2 ? 'text-[#556b2f]' : 'text-[#87996c]'}`}>
              <span className={`h-5 w-5 rounded-full flex items-center justify-center text-white ${importStep >= 2 ? 'bg-[#556b2f]' : 'bg-slate-300'}`}>2</span>
              <span>Preview & Validate</span>
            </div>
            <span className="text-slate-300">•</span>
            <div className={`flex items-center gap-1.5 text-xs font-semibold ${importStep >= 3 ? 'text-[#556b2f]' : 'text-[#87996c]'}`}>
              <span className={`h-5 w-5 rounded-full flex items-center justify-center text-white ${importStep >= 3 ? 'bg-[#556b2f]' : 'bg-slate-300'}`}>3</span>
              <span>Complete</span>
            </div>
          </div>

          {/* STEP 1: Upload */}
          {importStep === 1 && (
            <div className="space-y-6">
              <div className="rounded-xl border-2 border-dashed border-[#cfd8bd] bg-[#fdfdf7] p-8 text-center transition-colors hover:border-[#87996c] dark:border-[#4e5d35] dark:bg-[#1a1d16]">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#f4f5eb] dark:bg-[#28301f]">
                  <Upload size={28} className="text-[#87996c]" />
                </div>
                <h3 className="mb-1 text-lg font-semibold text-[#3c4e23] dark:text-[#eef4e8]">Drag & Drop CSV File</h3>
                <p className="mb-6 text-sm text-[#71805a] dark:text-[#c5d0b5]">Upload a file matching the curriculum structure.</p>
                
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <Button variant="outline" onClick={downloadTemplate}>
                    <Download size={16} className="mr-2" /> Download Template
                  </Button>
                  <label className="relative flex cursor-pointer items-center justify-center rounded-lg bg-[#556b2f] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#465825]">
                    <Upload size={16} className="mr-2" /> Browse CSV
                    <input type="file" accept=".csv" className="sr-only" onChange={handleFileUpload} />
                  </label>
                </div>
              </div>

              <div className="rounded-xl border border-[#cfd8bd] bg-[#fdfdf7] p-4 dark:border-[#4e5d35] dark:bg-[#1a1d16]">
                <label className="text-xs font-semibold text-[#3c4e23] dark:text-[#eef4e8] mb-2 block">Or Google Sheets Public Link</label>
                <div className="flex gap-2">
                  <Input 
                    placeholder="https://docs.google.com/spreadsheets/d/..." 
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    className="flex-1 bg-white dark:bg-[#20251a]"
                  />
                  <Button onClick={handleUrlFetch} disabled={fetchingSheet || !sheetUrl}>
                    {fetchingSheet ? 'Fetching...' : 'Fetch'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Preview & Validation Badges */}
          {importStep === 2 && (
            <div className="space-y-4">
              <h4 className="font-semibold text-sm text-[#3c4e23] dark:text-[#eef4e8]">
                Preview Parsed Experiments ({importData.length} total)
              </h4>

              {importIssues.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                  <p className="font-bold mb-1 flex items-center gap-1"><AlertCircle size={14} /> Issues / Warnings:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {importIssues.map((iss, i) => <li key={i}>{iss}</li>)}
                  </ul>
                </div>
              )}

              <div className="max-h-60 overflow-y-auto space-y-2">
                {importData.map((exp, i) => (
                  <div key={i} className="p-3 rounded-lg border border-[#cfd8bd] bg-white dark:bg-[#1a1d16] dark:border-[#4e5d35]">
                    <div className="flex justify-between font-semibold text-xs text-[#3c4e23] dark:text-[#eef4e8]">
                      <span>{exp.subject} - Exp #{exp.experimentNo}: {exp.experimentName}</span>
                      <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 size={12} /> Valid</span>
                    </div>
                    <div className="mt-1 text-[11px] text-[#71805a]">
                      Chemicals: {exp.chemicals.map(c => `${c.chemicalName} (${c.quantityPerStudent} ${c.unit})`).join(', ')}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setImportStep(1)}>Back</Button>
                <Button onClick={confirmImport} disabled={importing} className="bg-[#556b2f] text-white">
                  {importing ? 'Saving Structure...' : 'Confirm & Save All'}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Complete */}
          {importStep === 3 && (
            <div className="text-center py-8 space-y-4">
              <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-lg font-bold text-[#3c4e23] dark:text-[#eef4e8]">Experiments Uploaded Successfully!</h3>
              <p className="text-xs text-[#71805a]">The curriculum structure has been updated for this lab.</p>
              <Button onClick={() => setImportOpen(false)} className="bg-[#556b2f] text-white">Done</Button>
            </div>
          )}
        </div>
      </Modal>

      {/* Add Single Experiment Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={editingExpId ? "Edit Experiment" : "Add Single Experiment"}>
        <div className="space-y-4 text-left">
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Subject / Lab Code" 
              value={newExp.subject} 
              onChange={(e) => setNewExp({ ...newExp, subject: e.target.value })} 
              placeholder="e.g. HAP1 or Pharmaceutics-I" 
            />
            <Input 
              label="Experiment No." 
              type="number" 
              value={newExp.experimentNo} 
              onChange={(e) => setNewExp({ ...newExp, experimentNo: e.target.value })} 
              placeholder="e.g. 1" 
            />
          </div>

          <Input 
            label="Experiment Title / Objective" 
            value={newExp.experimentName} 
            onChange={(e) => setNewExp({ ...newExp, experimentName: e.target.value })} 
            placeholder="e.g. Study of Compound Microscope" 
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#3c4e23] dark:text-[#c8a030] uppercase tracking-wider">Required Chemicals</label>
              <button 
                type="button" 
                onClick={handleAddChemicalRow} 
                className="text-xs font-semibold text-[#556b2f] hover:underline"
              >
                + Add Chemical
              </button>
            </div>

            {newExp.chemicals.map((chem, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input 
                  type="text" 
                  placeholder="Chemical Name" 
                  value={chem.chemicalName} 
                  onChange={(e) => {
                    const updated = [...newExp.chemicals];
                    updated[idx].chemicalName = e.target.value;
                    setNewExp({ ...newExp, chemicals: updated });
                  }} 
                  className="flex-1 rounded-xl border border-[#cfd8bd] px-3 py-1.5 text-xs bg-white dark:bg-[#20251a]" 
                />
                <input 
                  type="number" 
                  placeholder="Qty" 
                  value={chem.quantityPerStudent} 
                  onChange={(e) => {
                    const updated = [...newExp.chemicals];
                    updated[idx].quantityPerStudent = e.target.value;
                    setNewExp({ ...newExp, chemicals: updated });
                  }} 
                  className="w-20 rounded-xl border border-[#cfd8bd] px-3 py-1.5 text-xs bg-white dark:bg-[#20251a]" 
                />
                <input 
                  type="text" 
                  placeholder="Unit" 
                  value={chem.unit} 
                  onChange={(e) => {
                    const updated = [...newExp.chemicals];
                    updated[idx].unit = e.target.value;
                    setNewExp({ ...newExp, chemicals: updated });
                  }} 
                  className="w-16 rounded-xl border border-[#cfd8bd] px-3 py-1.5 text-xs bg-white dark:bg-[#20251a]" 
                />
                {newExp.chemicals.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => handleRemoveChemicalRow(idx)} 
                    className="text-rose-500 text-xs font-bold p-1"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          <Button 
            onClick={handleSaveManualExperiment} 
            disabled={addingExp} 
            className="w-full bg-[#556b2f] text-white font-bold py-2.5 rounded-xl mt-4"
          >
            {addingExp ? 'Saving...' : (editingExpId ? 'Save Changes' : 'Save Experiment to Lab Structure')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
