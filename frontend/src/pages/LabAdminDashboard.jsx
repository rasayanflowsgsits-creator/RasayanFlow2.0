import { useEffect, useMemo, useState } from 'react';
import { 
  Download, FileDown, Pencil, Plus, Trash2, Upload, Search, 
  FlaskConical, AlertTriangle, CheckCircle2, PackageCheck, 
  Building2, Boxes, Store, RefreshCw, ChevronRight, Filter, Layers,
  GraduationCap, MapPin
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { parseCsv } from '../utils/csv';
import LabImportModal from '../components/LabImportModal';
import ChemicalIntakeModal from '../components/ChemicalIntakeModal';

const UNIT_OPTIONS = ['mg', 'g', 'kg', 'mcg', 'mL', 'L', 'uL', 'tablets', 'capsules', 'bottles', 'boxes', 'packs', 'vials', 'ampoules', 'units'];
const getTodayDate = () => new Date().toISOString().slice(0, 10);
const EMPTY_ITEM = { itemCode: '', chemicalName: '', category: 'Chemical', quantity: '', quantityUnit: 'mL', costPerUnit: '', minThreshold: '5', casNumber: '', smiles: '', inchi: '', chemicalFormula: '', manufacturingCompany: '', entryDate: getTodayDate(), storageLocation: '', lotNumber: '', expiryDate: '', abstract: '', pubmedId: '' };
const EMPTY_EXPERIMENT = { experimentNumber: '', experimentObject: '', requiredInventory: [{ inventoryItemId: '', quantity: '', quantityUnit: 'mL' }] };

const SelectUnit = ({ value, onChange }) => (
  <label className='relative block text-sm text-slate-700 dark:text-slate-300'>
    <span className='mb-1 block text-xs font-medium tracking-wide'>Quantity unit</span>
    <select value={value} onChange={onChange} className='w-full rounded-xl border border-[#cfd8bd] bg-[#fffef8] px-3 py-2 text-xs text-[#3c4e23] focus:outline-none focus:ring-2 focus:ring-[#5c6e46] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8] font-bold'>
      {UNIT_OPTIONS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
    </select>
  </label>
);

export default function LabAdminDashboard() {
  const store = useAppStore();
  const {
    fetchLabs,
    fetchUsers,
    fetchInventory,
    fetchTransactions,
    fetchExperiments,
  } = store;
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  const assignedLabs = useMemo(() => {
    const currentUserId = String(user?.id || user?._id || '');
    const currentUserEmail = (user?.email || '').toLowerCase();
    const currentUserLabId = String(user?.labId?._id || user?.labId || '');

    return store.labs.filter((lab) => {
      const labIdStr = String(lab.id || lab._id || '');

      const isDirectAdmin = Array.isArray(lab.admins) && lab.admins.some((admin) => {
        const adminIdStr = String(admin.id || admin._id || admin);
        const adminEmailStr = (admin.email || '').toLowerCase();
        return (adminIdStr && adminIdStr === currentUserId) || (adminEmailStr && adminEmailStr === currentUserEmail);
      });

      const matchesUserLabId = Boolean(currentUserLabId && currentUserLabId === labIdStr);

      const matchesAdminNameOrEmail = Boolean(
        (lab.adminEmail && lab.adminEmail.toLowerCase() === currentUserEmail) ||
        (lab.email && lab.email.toLowerCase() === currentUserEmail) ||
        (lab.admin && user?.name && lab.admin.toLowerCase().includes(user.name.toLowerCase())) ||
        (user?.labName && (lab.name || lab.labName) && (lab.name || lab.labName).toLowerCase() === user.labName.toLowerCase())
      );

      return isDirectAdmin || matchesUserLabId || matchesAdminNameOrEmail;
    });
  }, [store.labs, user]);

  const [selectedLabId, setSelectedLabId] = useState(() => localStorage.getItem('pharmlab-active-lab') || '');
  const labId = selectedLabId || assignedLabs[0]?.id || assignedLabs[0]?._id || user?.labId || '';

  // Local state for UI controls
  const [searchTerm, setSearchTerm] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState('all'); // 'all', 'optimal', 'low', 'out'
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'experiments'

  // Modal states
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [experimentOpen, setExperimentOpen] = useState(false);
  const [newItem, setNewItem] = useState(EMPTY_ITEM);
  const [editItem, setEditItem] = useState(EMPTY_ITEM);
  const [experimentForm, setExperimentForm] = useState(EMPTY_EXPERIMENT);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteExperimentTarget, setDeleteExperimentTarget] = useState(null);

  const [savingItem, setSavingItem] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingExperiment, setSavingExperiment] = useState(false);
  const [autofillingCas, setAutofillingCas] = useState(false);
  const [editAutofillingCas, setEditAutofillingCas] = useState(false);
  const [lastAutofilledCas, setLastAutofilledCas] = useState('');
  const [lastEditAutofilledCas, setLastEditAutofilledCas] = useState('');
  const [casLookupMessage, setCasLookupMessage] = useState('');
  const [casLookupType, setCasLookupType] = useState('');
  const [editCasLookupMessage, setEditCasLookupMessage] = useState('');
  const [editCasLookupType, setEditCasLookupType] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [intakeOpen, setIntakeOpen] = useState(false);

  const [storeModalOpen, setStoreModalOpen] = useState(false);
  const [storeModalData, setStoreModalData] = useState({ chemicalName: '', quantityRequested: '100', unit: 'mL', reason: '' });
  const [submittingStoreReq, setSubmittingStoreReq] = useState(false);

  const openEditModal = (item) => {
    setEditItem({
      ...EMPTY_ITEM,
      ...item,
      id: item.id || item._id,
      quantity: item.quantity !== undefined ? String(item.quantity) : '',
      costPerUnit: item.costPerUnit !== undefined ? String(item.costPerUnit) : '',
      minThreshold: item.minThreshold !== undefined ? String(item.minThreshold) : '5',
    });
    setEditOpen(true);
  };

  useEffect(() => { fetchLabs(); fetchUsers(); }, [fetchLabs, fetchUsers]);
  
  useEffect(() => {
    if (!assignedLabs.length) return;
    const validSelection = assignedLabs.some((lab) => String(lab.id || lab._id) === String(selectedLabId));
    if (!selectedLabId || !validSelection) {
      const nextLabId = String(assignedLabs[0].id || assignedLabs[0]._id);
      setSelectedLabId(nextLabId);
      localStorage.setItem('pharmlab-active-lab', nextLabId);
    }
  }, [assignedLabs, selectedLabId]);

  useEffect(() => {
    if (!labId) return;
    fetchInventory(labId);
    fetchTransactions({ labId });
    fetchExperiments({ labId });
    store.fetchLabRequests();
  }, [fetchExperiments, fetchInventory, fetchTransactions, labId]);

  const currentLab = assignedLabs.find((lab) => String(lab.id || lab._id) === String(labId)) || (store.labs || []).find((lab) => String(lab.id || lab._id) === String(labId));

  // Derived stock metrics
  const inventoryList = useMemo(() => store.inventory || [], [store.inventory]);
  
  const totalChemicalsCount = inventoryList.length;
  const optimalStockCount = useMemo(() => inventoryList.filter(i => Number(i.quantity || 0) > Number(i.minThreshold || 5)).length, [inventoryList]);
  const lowStockCount = useMemo(() => inventoryList.filter(i => Number(i.quantity || 0) > 0 && Number(i.quantity || 0) <= Number(i.minThreshold || 5)).length, [inventoryList]);
  const outOfStockCount = useMemo(() => inventoryList.filter(i => Number(i.quantity || 0) <= 0).length, [inventoryList]);
  const totalValuation = useMemo(() => inventoryList.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.costPerUnit || 0)), 0), [inventoryList]);

  // Filtered inventory list
  const filteredInventory = useMemo(() => {
    return inventoryList.filter(item => {
      const q = searchTerm.trim().toLowerCase();
      const nameMatch = !q || [item.chemicalName, item.casNumber, item.category, item.chemicalFormula, item.storageLocation].filter(Boolean).some(val => val.toLowerCase().includes(q));
      
      const qty = Number(item.quantity || 0);
      const thresh = Number(item.minThreshold || 5);

      let statusMatch = true;
      if (stockStatusFilter === 'optimal') statusMatch = qty > thresh;
      else if (stockStatusFilter === 'low') statusMatch = qty > 0 && qty <= thresh;
      else if (stockStatusFilter === 'out') statusMatch = qty <= 0;

      return nameMatch && statusMatch;
    });
  }, [inventoryList, searchTerm, stockStatusFilter]);

  const saveItem = async (payload, isEdit = false) => {
    return isEdit ? store.updateInventoryItem(payload.id, payload) : store.createInventoryItem({ labId, ...payload });
  };

  const handleAddItem = async () => {
    if (!labId || !newItem.chemicalName.trim() || !String(newItem.quantity).trim()) {
      store.setToast({ type: 'error', message: 'Chemical name and quantity are required.' });
      return;
    }
    setSavingItem(true);
    try {
      const item = await saveItem({ ...newItem, chemicalName: newItem.chemicalName.trim(), category: newItem.category.trim(), quantity: Number(newItem.quantity), costPerUnit: Number(newItem.costPerUnit || 0), minThreshold: Number(newItem.minThreshold || 5) });
      store.setToast({ type: 'success', message: `${item.chemicalName} added to inventory.` });
      setCreateOpen(false);
      setNewItem(EMPTY_ITEM);
    } catch (error) {
      store.setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to add chemical.' });
    } finally { setSavingItem(false); }
  };

  const handleEditItem = async () => {
    if (!editItem.id || !editItem.chemicalName.trim()) return;
    setSavingEdit(true);
    try {
      const item = await saveItem({ ...editItem, chemicalName: editItem.chemicalName.trim(), category: editItem.category.trim(), quantity: Number(editItem.quantity), costPerUnit: Number(editItem.costPerUnit || 0), minThreshold: Number(editItem.minThreshold || 5) }, true);
      store.setToast({ type: 'success', message: `${item.chemicalName} updated.` });
      setEditOpen(false);
    } catch (error) {
      store.setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to update chemical.' });
    } finally { setSavingEdit(false); }
  };

  const handleCreateExperiment = async () => {
    const requiredInventory = experimentForm.requiredInventory.filter((entry) => entry.inventoryItemId && Number(entry.quantity) > 0).map((entry) => ({ ...entry, quantity: Number(entry.quantity) }));
    if (!labId || !experimentForm.experimentNumber.trim() || !experimentForm.experimentObject.trim() || !requiredInventory.length) return;
    setSavingExperiment(true);
    try {
      await store.createExperiment({ labId, experimentNumber: experimentForm.experimentNumber.trim(), experimentObject: experimentForm.experimentObject.trim(), requiredInventory });
      store.setToast({ type: 'success', message: 'Experiment created successfully.' });
      setExperimentOpen(false);
      setExperimentForm(EMPTY_EXPERIMENT);
    } catch (error) {
      store.setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to create experiment.' });
    } finally { setSavingExperiment(false); }
  };

  const autofillFromCas = async (item, setItem, setLoading, setLastFetchedCas, setStatusMessage, setStatusType) => {
    const normalizedCas = item.casNumber.trim();
    if (!normalizedCas) {
      setStatusType('error');
      setStatusMessage('Enter a CAS number first.');
      return;
    }

    setStatusType('loading');
    setStatusMessage(`Checking PubChem for CAS ${normalizedCas}...`);
    setLoading(true);
    try {
      const result = await store.fetchChemicalDataByCasForInventory(normalizedCas);
      if (!result?.found) {
        setStatusType('error');
        setStatusMessage(result?.message || 'No PubChem data found for this CAS number.');
        return;
      }

      const pubchemData = result.data || {};
      setItem((state) => ({
        ...state,
        category: 'Chemical',
        chemicalName: pubchemData.chemicalName || state.chemicalName,
        casNumber: pubchemData.casNumber || state.casNumber,
        chemicalFormula: pubchemData.chemicalFormula || state.chemicalFormula,
        smiles: pubchemData.smiles || state.smiles,
        inchi: pubchemData.inchi || state.inchi,
      }));
      setLastFetchedCas(normalizedCas);
      setStatusType('success');
      setStatusMessage(`PubChem matched ${pubchemData.chemicalName || normalizedCas}. Review fields and save.`);
    } catch (error) {
      setStatusType('error');
      setStatusMessage(error?.response?.data?.message || 'Failed to fetch details from PubChem.');
    } finally {
      setLoading(false);
    }
  };

  const modalFields = (item, setItem, isLoadingCas, lastFetchedCas, setLoading, setLastFetchedCas, statusMessage, statusType, setStatusMessage, setStatusType) => (
    <div className='space-y-4'>
      <div className='rounded-xl border border-[#d9e1ca] bg-[#f8faee] p-4 dark:border-[#414a33] dark:bg-[#20251a]'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-end'>
          <div className='flex-1'>
            <Input
              label='CAS Registry Number'
              value={item.casNumber}
              onChange={(e) => {
                const nextCas = e.target.value;
                setItem((s) => ({ ...s, casNumber: nextCas }));
                if (nextCas.trim() !== lastFetchedCas) {
                  setLastFetchedCas('');
                  setStatusMessage('');
                  setStatusType('');
                }
              }}
              placeholder='e.g. 50-78-2'
            />
          </div>
          <Button type='button' variant='outline' className='sm:w-auto font-bold border-[#5c6e46] text-[#5c6e46]' onClick={() => autofillFromCas(item, setItem, setLoading, setLastFetchedCas, setStatusMessage, setStatusType)} disabled={isLoadingCas}>
            {isLoadingCas ? 'Fetching...' : '🔍 Auto Fetch PubChem'}
          </Button>
        </div>
        {statusMessage ? <div className={`mt-3 rounded-lg px-3 py-2 text-xs font-semibold ${statusType === 'success' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : statusType === 'error' ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>{statusMessage}</div> : null}
      </div>
      <Input label='Chemical Name *' value={item.chemicalName} onChange={(e) => setItem((s) => ({ ...s, chemicalName: e.target.value }))} placeholder='e.g. Salicylic Acid IP' />
      <div className='grid gap-4 sm:grid-cols-2'>
        <Input label='Cost Per Unit (₹)' type='number' value={item.costPerUnit} onChange={(e) => setItem((s) => ({ ...s, costPerUnit: e.target.value }))} placeholder='140' />
        <Input label='Category' value={item.category || 'Reagent'} onChange={(e) => setItem((s) => ({ ...s, category: e.target.value }))} placeholder='e.g. Active Ingredient / Reagent' />
      </div>
      <div className='grid gap-4 sm:grid-cols-2'>
        <Input label='Chemical Formula' value={item.chemicalFormula} onChange={(e) => setItem((s) => ({ ...s, chemicalFormula: e.target.value }))} placeholder='C7H6O3' />
        <Input label='Supplier / Manufacturer' value={item.manufacturingCompany} onChange={(e) => setItem((s) => ({ ...s, manufacturingCompany: e.target.value }))} placeholder='Sigma Aldrich / Loba Chemie' />
      </div>
      <div className='grid gap-4 sm:grid-cols-2'>
        <Input label='Quantity in Stock *' type='number' value={item.quantity} onChange={(e) => setItem((s) => ({ ...s, quantity: e.target.value }))} placeholder='500' />
        <SelectUnit value={item.quantityUnit} onChange={(e) => setItem((s) => ({ ...s, quantityUnit: e.target.value }))} />
      </div>
      <div className='grid gap-4 sm:grid-cols-2'>
        <Input label='Storage Location' value={item.storageLocation} onChange={(e) => setItem((s) => ({ ...s, storageLocation: e.target.value }))} placeholder='Shelf A2 / Acid Cabinet' />
        <Input label='Low Stock Alert Threshold' type='number' value={item.minThreshold} onChange={(e) => setItem((s) => ({ ...s, minThreshold: e.target.value }))} placeholder='5' />
      </div>
    </div>
  );

  const downloadInventoryImportTemplate = () => {
    const headers = ['chemicalName', 'quantity', 'quantityUnit', 'minThreshold', 'costPerUnit', 'casNumber', 'chemicalFormula', 'manufacturingCompany', 'storageLocation'];
    const sample = ['Acetone AR Grade', '500', 'mL', '5', '120', '67-64-1', 'C3H6O', 'Loba Chemie', 'Solvent Cabinet A1'];
    const csv = `${headers.join(',')}\n${sample.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'PharmaLab_Inventory_Template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSendStoreRequestSubmit = async () => {
    if (!storeModalData.chemicalName || !storeModalData.quantityRequested) return;
    setSubmittingStoreReq(true);
    try {
      if (store.createLabStoreRequest) {
        await store.createLabStoreRequest({
          chemicalName: storeModalData.chemicalName,
          quantityRequested: storeModalData.quantityRequested,
          unit: storeModalData.unit,
          reason: storeModalData.reason,
          labId
        });
      }
      setStoreModalOpen(false);
      store.setToast({ type: 'success', message: `Store transfer request submitted for ${storeModalData.chemicalName}` });
    } catch (e) {
      store.setToast({ type: 'error', message: 'Failed to submit store request' });
    } finally {
      setSubmittingStoreReq(false);
    }
  };

  return (
    <div className='space-y-6 pb-12 animate-in fade-in duration-200'>
      
      {/* TOP WELCOME BANNER & LAB SWITCHER (NO BOX CONTAINER, SMALLER & CLEAN TEXT STYLE) */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1'>
        
        {/* LEFT: SMALLER & CLEAN WRITTEN WELCOME BANNER & ACADEMIC METADATA */}
        <div className='space-y-1 flex-1 min-w-0'>
          
          {/* Breadcrumb Navigation */}
          <div className='flex items-center gap-1.5 text-[11px] font-semibold text-[#87996c] dark:text-[#7a8f62]'>
            <span>Pharma Laboratory</span>
            <ChevronRight size={12} />
            <span className='text-[#5c6e46] dark:text-[#a8be8a] font-bold'>Inventory Control Center</span>
          </div>

          {/* Compact Written Welcome Title */}
          <h2 className='text-base sm:text-lg font-bold text-[#37412a] dark:text-[#e4e9d8] flex flex-wrap items-center gap-1.5 leading-snug'>
            <span>Welcome <strong className='text-[#5c6e46] dark:text-[#a8be8a] font-extrabold capitalize'>{user?.name || 'Administrator'}</strong> into <strong className='text-[#37412a] dark:text-[#e4e9d8] font-extrabold'>{currentLab?.name || currentLab?.labName || 'Pharmacy'} Laboratory</strong></span>
          </h2>

          {/* Clean Inline Academic Metadata (No Box / No Heavy Pills) */}
          <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-[#71805a] dark:text-[#a5b48b] pt-0.5'>
            <span className='inline-flex items-center gap-1 text-[#3c4e23] dark:text-[#a8be8a] font-bold'>
              <GraduationCap size={14} className='text-[#5c6e46] dark:text-[#a8be8a]' />
              {currentLab?.courseType || 'B.Pharm'} &bull; Year {currentLab?.year || '1'} &bull; Sem {currentLab?.semester || '1'}
              {currentLab?.department ? ` (${currentLab.department})` : ''}
            </span>
            <span className='text-[#d9e1ca] dark:text-[#414a33]'>&bull;</span>
            <span className='inline-flex items-center gap-1 font-mono text-[#5c6e46] dark:text-[#c5d0b5] font-bold'>
              <MapPin size={12} /> Code: {currentLab?.labCode || `LAB-${currentLab?.name || '100'}`}
            </span>
            <span className='text-[#d9e1ca] dark:text-[#414a33]'>&bull;</span>
            <span className={`inline-flex items-center gap-1 font-bold ${
              lowStockCount + outOfStockCount === 0
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-amber-700 dark:text-amber-400'
            }`}>
              <PackageCheck size={13} />
              Stock Readiness: {totalChemicalsCount === 0 ? '0%' : `${Math.round((optimalStockCount / totalChemicalsCount) * 100)}% Stocked`}
            </span>
          </div>

        </div>

        {/* RIGHT: LAB SWITCHER PILLS */}
        <div className='flex flex-col items-start sm:items-end gap-1.5 shrink-0'>
          <span className='text-[11px] font-extrabold text-[#71805a] dark:text-[#a5b48b] flex items-center gap-1'>
            <Layers size={12} /> Switch Active Lab:
          </span>
          <div className='flex flex-wrap items-center gap-1.5 sm:justify-end'>
            {assignedLabs.map((lab) => {
              const labKey = String(lab.id || lab._id);
              const isSelected = labKey === String(labId);
              return (
                <button
                  key={labKey}
                  type='button'
                  onClick={() => {
                    setSelectedLabId(labKey);
                    localStorage.setItem('pharmlab-active-lab', labKey);
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all duration-200 border ${
                    isSelected
                      ? 'bg-[#5c6e46] text-white border-[#5c6e46] shadow-2xs dark:bg-[#e4e9d8] dark:text-[#20251a]'
                      : 'bg-white text-[#5c6e46] border-[#d9e1ca] hover:bg-[#f4f6ee] dark:bg-[#1a1d16] dark:text-[#a8be8a] dark:border-[#414a33]'
                  }`}
                >
                  {lab.labName || lab.name || 'Lab'} ({lab.courseType || 'B.Pharm'} Y{lab.year} S{lab.semester})
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* 4 EXECUTIVE METRIC CARDS */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <div className='rounded-2xl border border-[#d9e1ca] bg-white p-4 shadow-2xs dark:border-[#414a33] dark:bg-[#1a1d16] flex items-center justify-between'>
          <div>
            <p className='text-[10px] font-extrabold uppercase tracking-wider text-[#71805a] dark:text-[#a5b48b]'>Total Reagents</p>
            <h4 className='mt-1 text-2xl font-black text-[#37412a] dark:text-[#e4e9d8]'>{totalChemicalsCount}</h4>
            <p className='text-[10px] text-[#71805a] dark:text-[#a5b48b] font-medium mt-0.5'>Registered chemical items</p>
          </div>
          <div className='flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f4f6ee] text-[#5c6e46] dark:bg-[#28301f] dark:text-[#a8be8a] shrink-0'>
            <Boxes size={20} />
          </div>
        </div>

        <div className='rounded-2xl border border-[#d9e1ca] bg-white p-4 shadow-2xs dark:border-[#414a33] dark:bg-[#1a1d16] flex items-center justify-between'>
          <div>
            <p className='text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400'>Optimal Stock</p>
            <h4 className='mt-1 text-2xl font-black text-emerald-800 dark:text-emerald-300'>{optimalStockCount}</h4>
            <p className='text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5'>Sufficient quantity</p>
          </div>
          <div className='flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 shrink-0'>
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className='rounded-2xl border border-[#d9e1ca] bg-white p-4 shadow-2xs dark:border-[#414a33] dark:bg-[#1a1d16] flex items-center justify-between'>
          <div>
            <p className='text-[10px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400'>Low Stock Alerts</p>
            <h4 className='mt-1 text-2xl font-black text-amber-800 dark:text-amber-300'>{lowStockCount + outOfStockCount}</h4>
            <p className='text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5'>Action required</p>
          </div>
          <div className='flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 shrink-0'>
            <AlertTriangle size={20} />
          </div>
        </div>

        <div className='rounded-2xl border border-[#c5d6aa] bg-[#f8faee] p-4 shadow-2xs dark:border-[#414a33] dark:bg-[#242c1c] flex items-center justify-between'>
          <div>
            <p className='text-[10px] font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#a8be8a]'>Total Stock Valuation</p>
            <h4 className='mt-1 text-2xl font-black text-[#3c4e23] dark:text-[#e4e9d8]'>₹ {totalValuation.toLocaleString('en-IN')}</h4>
            <p className='text-[10px] text-[#5c6e46] dark:text-[#a8be8a] font-medium mt-0.5'>Lab chemical value</p>
          </div>
          <div className='flex h-11 w-11 items-center justify-center rounded-2xl bg-[#5c6e46] text-white shadow-2xs shrink-0 font-black text-lg'>
            ₹
          </div>
        </div>
      </div>

      {/* TABS & ACTION CONTROL BAR */}
      <div className='rounded-3xl border border-[#d9e1ca] bg-[#fffef8] p-5 shadow-sm dark:border-[#414a33] dark:bg-[#20251a] space-y-4'>
        
        {/* TOP TAB SWITCH & ACTIONS */}
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#e8efd9] pb-4 dark:border-[#2e3d19]'>
          <div className='flex items-center gap-2 bg-[#f4f6ee] dark:bg-[#1a1d16] p-1 rounded-2xl border border-[#d9e1ca] dark:border-[#414a33]'>
            <button
              type='button'
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                activeTab === 'inventory'
                  ? 'bg-[#5c6e46] text-white shadow-2xs dark:bg-[#e4e9d8] dark:text-[#20251a]'
                  : 'text-[#5c6e46] hover:bg-white/60 dark:text-[#a8be8a] dark:hover:bg-[#20251a]'
              }`}
            >
              <Boxes size={15} />
              <span>Chemical Stock Inventory ({filteredInventory.length})</span>
            </button>
            <button
              type='button'
              onClick={() => setActiveTab('experiments')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                activeTab === 'experiments'
                  ? 'bg-[#5c6e46] text-white shadow-2xs dark:bg-[#e4e9d8] dark:text-[#20251a]'
                  : 'text-[#5c6e46] hover:bg-white/60 dark:text-[#a8be8a] dark:hover:bg-[#20251a]'
              }`}
            >
              <FlaskConical size={15} />
              <span>Lab Experiments ({store.experiments?.length || 0})</span>
            </button>
          </div>

          <div className='flex flex-wrap items-center gap-2 shrink-0'>
            <button 
              type="button"
              onClick={() => setIntakeOpen(true)}
              className="px-3.5 py-2 text-xs font-black bg-[#5c6e46] hover:bg-[#475735] text-white rounded-xl shadow-xs flex items-center gap-1.5 uppercase tracking-wider"
            >
              <PackageCheck className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>Add Arrived Chemical (PubChem)</span>
            </button>
            <Button variant='outline' onClick={downloadInventoryImportTemplate} className='text-xs px-3 py-2 border-[#5c6e46] text-[#5c6e46] font-bold rounded-xl'>
              <FileDown size={14} className='mr-1.5' /> Template CSV
            </Button>
            <Button variant='outline' onClick={() => setImportOpen(true)} className='text-xs px-3 py-2 border-[#5c6e46] text-[#5c6e46] font-bold rounded-xl'>
              <Upload size={14} className='mr-1.5' /> Bulk Import
            </Button>
            <Button onClick={() => {
              setStoreModalData({ chemicalName: '', quantityRequested: '100', unit: 'mL', reason: `Stock replenishment for ${currentLab?.name}` });
              setStoreModalOpen(true);
            }} className='text-xs px-3.5 py-2 font-bold bg-[#c8a030] hover:bg-[#b08b26] text-white rounded-xl shadow-xs'>
              <Store size={14} className='mr-1.5' /> Request Central Store
            </Button>
            <Button onClick={() => setCreateOpen(true)} className='text-xs px-4 py-2 font-bold bg-[#5c6e46] hover:bg-[#4a5e2a] text-white rounded-xl shadow-xs'>
              <Plus size={15} className='mr-1.5' /> Add Chemical
            </Button>
          </div>
        </div>

        {/* SEARCH & STATUS FILTER BAR */}
        {activeTab === 'inventory' && (
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
            {/* Live Search Input */}
            <div className='relative flex-1'>
              <Search size={16} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-[#87996c]' />
              <input
                type='text'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder='Search by chemical name, CAS number, formula, location...'
                className='w-full rounded-xl border border-[#d9e1ca] bg-white py-2 pl-10 pr-4 text-xs font-semibold text-[#37412a] outline-none focus:border-[#5c6e46] focus:ring-2 focus:ring-[#5c6e46]/20 transition-all dark:border-[#414a33] dark:bg-[#1a1d16] dark:text-[#e4e9d8]'
              />
            </div>

            {/* Stock Status Pills */}
            <div className='flex items-center gap-1 bg-[#f4f6ee] dark:bg-[#1a1d16] p-1 rounded-xl border border-[#d9e1ca] dark:border-[#414a33] shrink-0'>
              {[
                { id: 'all', label: 'All Stock' },
                { id: 'optimal', label: 'Optimal' },
                { id: 'low', label: 'Low Stock' },
                { id: 'out', label: 'Depleted' }
              ].map(st => (
                <button
                  key={st.id}
                  type='button'
                  onClick={() => setStockStatusFilter(st.id)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    stockStatusFilter === st.id
                      ? 'bg-[#5c6e46] text-white shadow-2xs dark:bg-[#e4e9d8] dark:text-[#20251a]'
                      : 'text-[#5c6e46] hover:bg-white/60 dark:text-[#a8be8a] dark:hover:bg-[#20251a]'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 1: INVENTORY TABLE */}
        {activeTab === 'inventory' && (
          <div className='rounded-2xl border border-[#d9e1ca] bg-white overflow-hidden shadow-xs dark:border-[#414a33] dark:bg-[#1a1d16]'>
            <div className='overflow-x-auto'>
              <table className='w-full border-collapse text-left text-xs'>
                <thead>
                  <tr className='bg-[#f4f6ee] dark:bg-[#151712] border-b border-[#d9e1ca] dark:border-[#414a33]'>
                    <th className='px-5 py-3.5 font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c]'>Chemical &amp; Formula</th>
                    <th className='px-5 py-3.5 font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c]'>Category &amp; Location</th>
                    <th className='px-5 py-3.5 font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c]'>Stock Level</th>
                    <th className='px-5 py-3.5 font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c]'>Unit Cost &amp; Value</th>
                    <th className='px-5 py-3.5 font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c] text-center'>Status</th>
                    <th className='px-5 py-3.5 font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c] text-right'>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className='px-6 py-12 text-center text-xs text-[#87996c] italic space-y-2'>
                        <Boxes size={32} className='mx-auto text-[#a8be8a] opacity-50' />
                        <p className='font-bold text-[#37412a] dark:text-[#e4e9d8]'>No chemical reagents found in this lab inventory.</p>
                        <p className='text-[11px] text-[#71805a] dark:text-[#a5b48b]'>Click "+ Add Chemical" or "Bulk Import" to add reagents to stock.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredInventory.map((item) => {
                      const qty = Number(item.quantity || 0);
                      const thresh = Number(item.minThreshold || 5);
                      const unitCost = Number(item.costPerUnit || 0);
                      const totalVal = qty * unitCost;

                      const isOut = qty <= 0;
                      const isLow = !isOut && qty <= thresh;

                      return (
                        <tr key={item.id || item._id} className='border-b border-[#e4eed3] dark:border-[#2a3320] hover:bg-[#f8faee] dark:hover:bg-[#20251a] transition-colors'>
                          
                          {/* Chemical Name & CAS */}
                          <td className='px-5 py-4 font-bold text-[#37412a] dark:text-[#e4e9d8]'>
                            <div className='flex items-center gap-2'>
                              <span className='font-black text-sm text-[#2e3d19] dark:text-[#e4e9d8]'>{item.chemicalName}</span>
                              {item.casNumber && (
                                <span className='rounded bg-[#e8efd9] px-1.5 py-0.5 text-[10px] font-mono font-bold text-[#3c4e23] dark:bg-[#2a3320] dark:text-[#a8be8a]'>
                                  CAS: {item.casNumber}
                                </span>
                              )}
                            </div>
                            {item.chemicalFormula && (
                              <p className='text-[11px] font-mono text-[#71805a] dark:text-[#a5b48b] mt-0.5'>
                                🧪 {item.chemicalFormula}
                              </p>
                            )}
                          </td>

                          {/* Category & Location */}
                          <td className='px-5 py-4 font-semibold text-[#71805a] dark:text-[#a5b48b]'>
                            <span className='inline-block rounded-md bg-[#f4f6ee] px-2 py-0.5 text-xs font-bold text-[#5c6e46] dark:bg-[#28301f] dark:text-[#a8be8a]'>
                              {item.category || 'Reagent'}
                            </span>
                            {item.storageLocation && (
                              <p className='text-[10px] text-[#71805a] dark:text-[#a5b48b] mt-1 font-medium'>
                                📍 {item.storageLocation}
                              </p>
                            )}
                          </td>

                          {/* Stock Level */}
                          <td className='px-5 py-4 font-mono font-bold text-[#37412a] dark:text-[#e4e9d8]'>
                            <div className='flex items-center gap-2'>
                              <span className='text-sm'>{qty} {item.quantityUnit || 'units'}</span>
                            </div>
                            <p className='text-[10px] font-sans font-medium text-[#71805a] dark:text-[#a5b48b] mt-0.5'>
                              Alert Min: {thresh} {item.quantityUnit || 'units'}
                            </p>
                          </td>

                          {/* Unit Cost & Total Value */}
                          <td className='px-5 py-4 font-mono font-bold text-[#3c4e23] dark:text-[#e4e9d8]'>
                            <div>₹ {unitCost.toLocaleString('en-IN')} / {item.quantityUnit || 'unit'}</div>
                            <div className='text-[11px] font-extrabold text-[#5c6e46] dark:text-[#a8be8a] mt-0.5'>
                              Total: ₹ {totalVal.toLocaleString('en-IN')}
                            </div>
                          </td>

                          {/* Status */}
                          <td className='px-5 py-4 text-center'>
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${
                              isOut
                                ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                                : isLow
                                ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                            }`}>
                              {isOut ? '🔴 Depleted' : isLow ? '🟡 Low Stock' : '🟢 Optimal'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className='px-5 py-4 text-right'>
                            <div className='flex items-center justify-end gap-1.5'>
                              <Button
                                size='sm'
                                variant='outline'
                                onClick={() => openEditModal(item)}
                                className='text-xs px-2.5 py-1 border-[#5c6e46] text-[#5c6e46] rounded-lg font-bold'
                              >
                                <Pencil size={12} className='mr-1' /> Edit
                              </Button>
                              <Button
                                size='sm'
                                variant='outline'
                                onClick={() => {
                                  setStoreModalData({
                                    chemicalName: item.chemicalName,
                                    quantityRequested: '100',
                                    unit: item.quantityUnit || 'mL',
                                    reason: `Restock requisition for ${currentLab?.name || 'Lab'}`
                                  });
                                  setStoreModalOpen(true);
                                }}
                                className='text-xs px-2.5 py-1 border-[#c8a030] text-[#c8a030] rounded-lg font-bold hover:bg-amber-50'
                              >
                                <Store size={12} className='mr-1' /> Restock
                              </Button>
                              <button
                                type='button'
                                onClick={() => setDeleteTarget(item)}
                                className='p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg dark:text-rose-400 dark:hover:bg-rose-950/40 transition-colors'
                                title='Delete Chemical'
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECTION 2: LAB EXPERIMENTS TABLE */}
        {activeTab === 'experiments' && (
          <div className='rounded-2xl border border-[#d9e1ca] bg-white overflow-hidden shadow-xs dark:border-[#414a33] dark:bg-[#1a1d16] space-y-4 p-4 sm:p-6'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#e8efd9] pb-4 dark:border-[#2e3d19]'>
              <div>
                <h3 className='text-base font-extrabold text-[#37412a] dark:text-[#e4e9d8] flex items-center gap-2'>
                  <FlaskConical size={18} className='text-[#5c6e46]' /> Lab Experiments &amp; Prescribed Reagents
                </h3>
                <p className='text-xs text-[#71805a] dark:text-[#a5b48b] mt-0.5 font-medium'>
                  Experiments registered for {currentLab?.name || 'this lab'} and required inventory chemicals
                </p>
              </div>
              <Button onClick={() => setExperimentOpen(true)} className='text-xs px-4 py-2 font-bold bg-[#5c6e46] text-white rounded-xl'>
                <Plus size={15} className='mr-1.5' /> Add Experiment
              </Button>
            </div>

            <div className='overflow-x-auto'>
              <table className='w-full border-collapse text-left text-xs'>
                <thead>
                  <tr className='bg-[#f4f6ee] dark:bg-[#151712] border-b border-[#d9e1ca] dark:border-[#414a33]'>
                    <th className='px-5 py-3.5 font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c]'>Exp No</th>
                    <th className='px-5 py-3.5 font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c]'>Experiment Title</th>
                    <th className='px-5 py-3.5 font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c]'>Required Chemical Reagents</th>
                    <th className='px-5 py-3.5 font-extrabold uppercase tracking-wider text-[#5c6e46] dark:text-[#87996c] text-right'>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(store.experiments || []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className='px-6 py-8 text-center text-xs text-[#87996c] italic'>
                        No experiments registered for this lab yet.
                      </td>
                    </tr>
                  ) : (
                    (store.experiments || []).map((exp) => (
                      <tr key={exp.id || exp._id} className='border-b border-[#e4eed3] dark:border-[#2a3320] hover:bg-[#f8faee] dark:hover:bg-[#20251a] transition-colors'>
                        <td className='px-5 py-4 font-mono font-bold text-[#5c6e46] dark:text-[#a8be8a]'>
                          {exp.experimentNumber || 'Exp 01'}
                        </td>
                        <td className='px-5 py-4 font-bold text-[#37412a] dark:text-[#e4e9d8]'>
                          {exp.experimentObject}
                        </td>
                        <td className='px-5 py-4 font-medium text-[#71805a] dark:text-[#a5b48b]'>
                          {(exp.requiredInventory || []).map(r => `${r.chemicalName || r.inventoryItemId} (${r.quantity || 1} ${r.quantityUnit || 'mL'})`).join(', ') || 'No chemicals required'}
                        </td>
                        <td className='px-5 py-4 text-right'>
                          <button
                            type='button'
                            onClick={() => setDeleteExperimentTarget(exp)}
                            className='p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg dark:text-rose-400 dark:hover:bg-rose-950/40 transition-colors'
                            title='Delete Experiment'
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* CENTRAL STORE REQUISITION MODAL */}
      <Modal open={storeModalOpen} onClose={() => setStoreModalOpen(false)} title='Request Reagent Transfer from Central Store'>
        <div className='space-y-4 text-left'>
          <Input
            label='Chemical Reagent Name *'
            value={storeModalData.chemicalName}
            onChange={(e) => setStoreModalData({ ...storeModalData, chemicalName: e.target.value })}
            placeholder='e.g. Hydrochloric Acid 0.1M'
          />
          <div className='grid grid-cols-2 gap-4'>
            <Input
              label='Quantity Requested *'
              type='number'
              value={storeModalData.quantityRequested}
              onChange={(e) => setStoreModalData({ ...storeModalData, quantityRequested: e.target.value })}
              placeholder='500'
            />
            <SelectUnit
              value={storeModalData.unit}
              onChange={(e) => setStoreModalData({ ...storeModalData, unit: e.target.value })}
            />
          </div>
          <Input
            label='Reason for Store Requisition'
            value={storeModalData.reason}
            onChange={(e) => setStoreModalData({ ...storeModalData, reason: e.target.value })}
            placeholder='e.g. Stock shortage for B.Pharm Practical Practicals'
          />
          <Button
            onClick={handleSendStoreRequestSubmit}
            disabled={submittingStoreReq || !storeModalData.chemicalName || !storeModalData.quantityRequested}
            className='w-full bg-[#5c6e46] text-white font-extrabold py-2.5 rounded-xl mt-2 shadow-sm'
          >
            {submittingStoreReq ? 'Sending Requisition...' : 'Submit Requisition to Central Store'}
          </Button>
        </div>
      </Modal>

      {/* BULK IMPORT & ADD/EDIT MODALS */}
      <LabImportModal open={importOpen} onClose={() => setImportOpen(false)} labId={labId} />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title='Add Chemical Reagent to Lab Inventory'>
        <div className='space-y-4'>
          {modalFields(newItem, setNewItem, autofillingCas, lastAutofilledCas, setAutofillingCas, setLastAutofilledCas, casLookupMessage, casLookupType, setCasLookupMessage, setCasLookupType)}
          <Button className='w-full font-bold bg-[#5c6e46] text-white py-2.5 rounded-xl' onClick={handleAddItem} disabled={savingItem || !labId || autofillingCas}>
            {savingItem ? 'Saving Reagent...' : 'Save Chemical Reagent'}
          </Button>
        </div>
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title='Edit Chemical Reagent Details'>
        <div className='space-y-4'>
          {modalFields(editItem, setEditItem, editAutofillingCas, lastEditAutofilledCas, setEditAutofillingCas, setLastEditAutofilledCas, editCasLookupMessage, editCasLookupType, setEditCasLookupMessage, setEditCasLookupType)}
          <Button className='w-full font-bold bg-[#5c6e46] text-white py-2.5 rounded-xl' onClick={handleEditItem} disabled={savingEdit || editAutofillingCas}>
            {savingEdit ? 'Saving Changes...' : 'Save Reagent Changes'}
          </Button>
        </div>
      </Modal>

      <Modal open={experimentOpen} onClose={() => setExperimentOpen(false)} title='Add Practical Experiment'>
        <div className='space-y-4'>
          <Input label='Experiment Number *' value={experimentForm.experimentNumber} onChange={(e) => setExperimentForm((s) => ({ ...s, experimentNumber: e.target.value }))} placeholder='Exp 01' />
          <Input label='Experiment Object / Title *' value={experimentForm.experimentObject} onChange={(e) => setExperimentForm((s) => ({ ...s, experimentObject: e.target.value }))} placeholder='Formulation of Simple Syrup IP' />
          <div className='rounded-xl border border-[#d9e1ca] p-4 dark:border-[#414a33]'>
            <p className='font-bold text-xs text-[#3c4e23] dark:text-[#eef4e8] mb-2'>Required Inventory Chemicals</p>
            <div className='space-y-3'>
              {experimentForm.requiredInventory.map((entry, index) => (
                <div key={`req-${index}`} className='grid gap-3 rounded-lg bg-[#f7f8f1] p-3 dark:bg-[#28301f] lg:grid-cols-[1.4fr_0.8fr_0.8fr_auto]'>
                  <label className='relative block text-sm text-slate-700 dark:text-slate-300'>
                    <span className='mb-1 block text-xs font-medium tracking-wide'>Chemical</span>
                    <select value={entry.inventoryItemId} onChange={(e) => { const selected = store.inventory.find((item) => (item.id || item._id) === e.target.value); setExperimentForm((s) => ({ ...s, requiredInventory: s.requiredInventory.map((current, i) => i === index ? { ...current, inventoryItemId: e.target.value, chemicalName: selected?.chemicalName || '', quantityUnit: selected?.quantityUnit || 'mL' } : current) })); }} className='w-full rounded-lg border border-[#cfd8bd] bg-[#fffef8] px-3 py-2 text-[#3c4e23] focus:outline-none focus:ring-2 focus:ring-[#6f7d45] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]'>
                      <option value=''>Select chemical</option>
                      {store.inventory.map((item) => <option key={item.id || item._id} value={item.id || item._id}>{item.chemicalName} ({item.quantity} {item.quantityUnit})</option>)}
                    </select>
                  </label>
                  <Input label='Qty / Student' type='number' value={entry.quantity} onChange={(e) => setExperimentForm((s) => ({ ...s, requiredInventory: s.requiredInventory.map((current, i) => i === index ? { ...current, quantity: e.target.value } : current) }))} />
                  <SelectUnit value={entry.quantityUnit} onChange={(e) => setExperimentForm((s) => ({ ...s, requiredInventory: s.requiredInventory.map((current, i) => i === index ? { ...current, quantityUnit: e.target.value } : current) }))} />
                  <div className='flex items-end'>
                    <Button variant='outline' className='px-3 py-2 text-xs text-rose-700 dark:text-rose-300' onClick={() => setExperimentForm((s) => ({ ...s, requiredInventory: s.requiredInventory.filter((_, i) => i !== index) }))} disabled={experimentForm.requiredInventory.length === 1}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button variant='outline' className='mt-3 px-3 py-1 text-xs font-bold' onClick={() => setExperimentForm((s) => ({ ...s, requiredInventory: [...s.requiredInventory, { inventoryItemId: '', quantity: '', quantityUnit: 'mL' }] }))}>
              <Plus size={14} className='mr-1' /> Add Another Chemical
            </Button>
          </div>
          <Button className='w-full bg-[#5c6e46] text-white font-bold py-2.5 rounded-xl' onClick={handleCreateExperiment} disabled={savingExperiment}>
            {savingExperiment ? 'Saving...' : 'Save Experiment'}
          </Button>
        </div>
      </Modal>

      {/* DELETE CHEMICAL CONFIRMATION */}
      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title='Delete Chemical Reagent'>
        <div className='space-y-4'>
          <p className='text-sm text-[#37412a] dark:text-[#e4e9d8] font-medium'>
            Are you sure you want to delete <span className='font-black underline'>{deleteTarget?.chemicalName}</span> from this lab inventory?
          </p>
          <div className='flex gap-3 pt-2'>
            <Button variant='outline' className='w-full font-bold' onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button className='w-full font-bold bg-rose-600 hover:bg-rose-700 text-white' onClick={async () => { try { await store.deleteInventoryItem(deleteTarget.id || deleteTarget._id); store.setToast({ type: 'success', message: `${deleteTarget.chemicalName} deleted from inventory.` }); setDeleteTarget(null); } catch (error) { store.setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to delete chemical.' }); } }}>
              Delete Chemical
            </Button>
          </div>
        </div>
      </Modal>

      {/* DELETE EXPERIMENT CONFIRMATION */}
      <Modal open={Boolean(deleteExperimentTarget)} onClose={() => setDeleteExperimentTarget(null)} title='Delete Experiment'>
        <div className='space-y-4'>
          <p className='text-sm text-[#37412a] dark:text-[#e4e9d8] font-medium'>
            Delete experiment <span className='font-black'>{deleteExperimentTarget?.experimentNumber}</span> ({deleteExperimentTarget?.experimentObject})?
          </p>
          <div className='flex gap-3 pt-2'>
            <Button variant='outline' className='w-full font-bold' onClick={() => setDeleteExperimentTarget(null)}>Cancel</Button>
            <Button className='w-full font-bold bg-rose-600 hover:bg-rose-700 text-white' onClick={async () => { try { await store.deleteExperiment(deleteExperimentTarget.id || deleteExperimentTarget._id); store.setToast({ type: 'success', message: `Experiment deleted.` }); setDeleteExperimentTarget(null); } catch (error) { store.setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to delete experiment.' }); } }}>
              Delete Experiment
            </Button>
          </div>
        </div>
      </Modal>

      {/* ARRIVED CHEMICAL INTAKE MODAL (PUBCHEM AUTO-FILL) */}
      <ChemicalIntakeModal
        open={intakeOpen}
        onClose={() => setIntakeOpen(false)}
        onSuccess={() => fetchInventory(labId)}
        isStoreAdmin={false}
        labId={labId}
      />

    </div>
  );
}
