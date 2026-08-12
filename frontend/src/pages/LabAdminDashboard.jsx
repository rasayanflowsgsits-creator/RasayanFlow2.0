import { useEffect, useMemo, useState } from 'react';
import { Download, FileDown, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { parseCsv } from '../utils/csv';
import useStoreManagerMock from '../store/storeManagerMock';
import LabImportModal from '../components/LabImportModal';

const UNIT_OPTIONS = ['mg', 'g', 'kg', 'mcg', 'mL', 'L', 'uL', 'tablets', 'capsules', 'bottles', 'boxes', 'packs', 'vials', 'ampoules', 'units'];
const getTodayDate = () => new Date().toISOString().slice(0, 10);
const EMPTY_ITEM = { itemCode: '', chemicalName: '', category: 'Chemical', quantity: '', quantityUnit: 'mL', costPerUnit: '', minThreshold: '5', casNumber: '', smiles: '', inchi: '', chemicalFormula: '', manufacturingCompany: '', entryDate: getTodayDate(), storageLocation: '', lotNumber: '', expiryDate: '', abstract: '', pubmedId: '' };
const EMPTY_EXPERIMENT = { experimentNumber: '', experimentObject: '', requiredInventory: [{ inventoryItemId: '', quantity: '', quantityUnit: 'mL' }] };

const SelectUnit = ({ value, onChange }) => (
  <label className='relative block text-sm text-slate-700 dark:text-slate-300'>
    <span className='mb-1 block text-xs font-medium tracking-wide'>Quantity unit</span>
    <select value={value} onChange={onChange} className='w-full rounded-lg border border-[#cfd8bd] bg-[#fffef8] px-3 py-2 text-[#3c4e23] focus:outline-none focus:ring-2 focus:ring-[#6f7d45] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]'>
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
  const isTransactionsPage = location.pathname === '/transactions';
  const isAnalyticsPage = location.pathname === '/analytics';
  const assignedLabs = useMemo(() => {
    const currentUserId = String(user?.id || user?._id || '');
    const currentUserEmail = (user?.email || '').toLowerCase();
    const currentUserLabId = String(user?.labId?._id || user?.labId || '');

    return store.labs.filter((lab) => {
      const labIdStr = String(lab.id || lab._id || '');

      // 1. Check lab.admins array by ID or email
      const isDirectAdmin = Array.isArray(lab.admins) && lab.admins.some((admin) => {
        const adminIdStr = String(admin.id || admin._id || admin);
        const adminEmailStr = (admin.email || '').toLowerCase();
        return (adminIdStr && adminIdStr === currentUserId) || (adminEmailStr && adminEmailStr === currentUserEmail);
      });

      // 2. Check user.labId link
      const matchesUserLabId = Boolean(currentUserLabId && currentUserLabId === labIdStr);

      // 3. Check lab admin string / email / labName property
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
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [experimentOpen, setExperimentOpen] = useState(false);
  const [newItem, setNewItem] = useState(EMPTY_ITEM);
  const [editItem, setEditItem] = useState(EMPTY_ITEM);
  const [experimentForm, setExperimentForm] = useState(EMPTY_EXPERIMENT);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteExperimentTarget, setDeleteExperimentTarget] = useState(null);
  const [reviewingId, setReviewingId] = useState('');
  const [reviewingExperimentRequestId, setReviewingExperimentRequestId] = useState('');
  const [blockingUserId, setBlockingUserId] = useState('');
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
  const [importing, setImporting] = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const [importItems, setImportItems] = useState([]);
  const [importIssues, setImportIssues] = useState([]);
  const [experimentImportOpen, setExperimentImportOpen] = useState(false);
  const [experimentImporting, setExperimentImporting] = useState(false);
  const [experimentImportFileName, setExperimentImportFileName] = useState('');
  const [experimentImportExperiments, setExperimentImportExperiments] = useState([]);
  const [experimentImportIssues, setExperimentImportIssues] = useState([]);

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
    if (store.fetchSmartInventory) store.fetchSmartInventory(labId);
    fetchTransactions({ labId });
    fetchExperiments({ labId });
    store.fetchLabRequests();
    if (store.fetchStudentRequests) {
      store.fetchStudentRequests(labId);
    }
  }, [fetchExperiments, fetchInventory, fetchTransactions, labId, store.fetchLabRequests]);

  const currentLab = assignedLabs.find((lab) => String(lab.id || lab._id) === String(labId)) || (store.labs || []).find((lab) => String(lab.id || lab._id) === String(labId));
  const pendingBorrowRequests = (store.transactions || []).filter((tx) => tx?.status === 'pending' && tx?.type === 'borrow');
  const pendingLabRequests = (store.labRequests || []).filter(r => r?.labId === labId && r?.status === 'Pending');

  const storeRequests = useStoreManagerMock(state => state?.requests || []);
  const pendingStoreRequestsCount = (storeRequests || []).filter(r => r?.lab === currentLab?.name && r?.status === 'Pending').length;
  const pendingInventoryRequests = pendingBorrowRequests.filter((tx) => tx?.requestCategory !== 'experiment');
  const pendingExperimentRequests = pendingBorrowRequests.filter((tx) => tx?.requestCategory === 'experiment');
  const students = (store.users || []).filter((entry) => entry?.role === 'student' && (!entry?.labId || String(entry?.labId) === String(labId)));
  const lowStockCount = (store.inventory || []).filter((item) => Number(item?.quantity || 0) <= Number(item?.minThreshold || 0)).length;
  const totalInventoryValue = (store.inventory || []).reduce((sum, item) => sum + Number(item?.quantity || 0) * Number(item?.costPerUnit || 0), 0);
  const experimentSpend = (store.experiments || []).reduce((sum, experiment) => sum + Number(experiment?.totalEstimatedExpense || 0), 0);

  const smart = store.smartInventory || {};

  const saveItem = async (payload, isEdit = false) => {
    const action = isEdit ? store.updateInventoryItem(payload.id, payload) : store.createInventoryItem({ labId, ...payload });
    return action;
  };

  const handleAddItem = async () => {
    if (!labId || !newItem.chemicalName.trim() || !String(newItem.quantity).trim()) {
      store.setToast({ type: 'error', message: 'Chemical name and quantity are required before saving.' });
      return;
    }
    setSavingItem(true);
    try {
      const item = await saveItem({ ...newItem, chemicalName: newItem.chemicalName.trim(), category: newItem.category.trim(), quantity: Number(newItem.quantity), costPerUnit: Number(newItem.costPerUnit || 0), minThreshold: Number(newItem.minThreshold || 5) });
      store.setToast({ type: 'success', message: `${item.chemicalName} added.` });
      store.setHighlight(item.id);
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
      store.setHighlight(item.id);
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
      store.setToast({ type: 'success', message: 'Experiment created.' });
      setExperimentOpen(false);
      setExperimentForm(EMPTY_EXPERIMENT);
    } catch (error) {
      store.setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to create experiment.' });
    } finally { setSavingExperiment(false); }
  };

  const handleImportFile = async (file) => {
    if (!file) return;
    const text = await file.text();
    const { records } = parseCsv(text);
    const issues = [];
    const items = [];

    records.forEach((record, index) => {
      const chemicalName = String(record.chemicalName || record.itemName || '').trim();
      const quantityUnit = String(record.quantityUnit || '').trim();
      const quantity = record.quantity === '' ? 0 : Number(record.quantity);
      const minThreshold = record.minThreshold === '' ? 5 : Number(record.minThreshold);

      if (!chemicalName) issues.push({ index, message: 'Missing chemicalName' });
      if (!quantityUnit) issues.push({ index, message: 'Missing quantityUnit' });
      if (!Number.isFinite(quantity) || quantity < 0) issues.push({ index, message: 'Invalid quantity' });
      if (!Number.isFinite(minThreshold) || minThreshold < 0) issues.push({ index, message: 'Invalid minThreshold' });

      items.push({
        itemCode: String(record.itemCode || '').trim(),
        chemicalName,
        category: String(record.category || 'Chemical').trim() || 'Chemical',
        quantity,
        quantityUnit,
        costPerUnit: record.costPerUnit === '' ? 0 : Number(record.costPerUnit),
        minThreshold,
        casNumber: String(record.casNumber || '').trim(),
        smiles: String(record.smiles || '').trim(),
        inchi: String(record.inchi || '').trim(),
        chemicalFormula: String(record.chemicalFormula || '').trim(),
        manufacturingCompany: String(record.manufacturingCompany || '').trim(),
        entryDate: String(record.entryDate || '').trim(),
        storageLocation: String(record.storageLocation || '').trim(),
        lotNumber: String(record.lotNumber || '').trim(),
        expiryDate: String(record.expiryDate || '').trim(),
        abstract: String(record.abstract || '').trim(),
        pubmedId: String(record.pubmedId || '').trim(),
      });
    });

    setImportItems(items);
    setImportIssues(issues.slice(0, 50));
  };

  const submitBulkImport = async () => {
    if (!labId || importing || !importItems.length) return;
    setImporting(true);
    try {
      const result = await store.bulkImportInventoryItems({ labId, items: importItems });
      await store.fetchInventory(labId);
      store.setToast({
        type: result?.errorCount ? 'warning' : 'success',
        message: `Import done: ${result?.createdCount ?? 0} created, ${result?.skippedCount ?? 0} skipped, ${result?.errorCount ?? 0} errors.`,
      });
      setImportOpen(false);
      setImportFileName('');
      setImportItems([]);
      setImportIssues([]);
    } catch (error) {
      store.setToast({ type: 'error', message: error?.response?.data?.message || 'Bulk import failed.' });
    } finally {
      setImporting(false);
    }
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
      setStatusMessage(`PubChem matched ${pubchemData.chemicalName || normalizedCas}. Review the fields below, then save the chemical.`);
    } catch (error) {
      setStatusType('error');
      setStatusMessage(error?.response?.data?.message || 'Failed to fetch chemical details from PubChem.');
    } finally {
      setLoading(false);
    }
  };

  const modalFields = (item, setItem, isLoadingCas, lastFetchedCas, setLoading, setLastFetchedCas, statusMessage, statusType, setStatusMessage, setStatusType) => <div className='space-y-4'>
    <div className='rounded-xl border border-[#d9e1ca] bg-[#f7f8f1] p-4 dark:border-[#414a33] dark:bg-[#28301f]'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-end'>
        <div className='flex-1'>
          <Input
            label='CAS number'
            value={item.casNumber}
            onChange={(e) => {
              const nextCas = e.target.value;
              setItem((s) => ({ ...s, casNumber: nextCas, category: 'Chemical' }));
              if (nextCas.trim() !== lastFetchedCas) {
                setLastFetchedCas('');
                setStatusMessage('');
                setStatusType('');
              }
            }}
            placeholder='50-78-2'
          />
        </div>
        <Button type='button' variant='outline' className='sm:w-auto' onClick={() => autofillFromCas(item, setItem, setLoading, setLastFetchedCas, setStatusMessage, setStatusType)} disabled={isLoadingCas}>
          {isLoadingCas ? 'Fetching...' : 'Auto Fetch'}
        </Button>
      </div>
      <p className='mt-2 text-xs text-[#71805a] dark:text-[#c5d0b5]'>Enter the CAS number, then click Auto Fetch to pull available PubChem fields. This only fills the form. Use Save chemical to add it to inventory.</p>
      {statusMessage ? <div className={`mt-3 rounded-lg px-3 py-2 text-xs ${statusType === 'success' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200' : statusType === 'error' ? 'bg-rose-50 text-rose-800 dark:bg-rose-900/20 dark:text-rose-200' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>{statusMessage}</div> : null}
    </div>
    <Input label='Chemical name' value={item.chemicalName} onChange={(e) => setItem((s) => ({ ...s, chemicalName: e.target.value }))} />
    <div className='grid gap-4 sm:grid-cols-2'><Input label='Cost per unit' type='number' value={item.costPerUnit} onChange={(e) => setItem((s) => ({ ...s, costPerUnit: e.target.value }))} /><Input label='Category' value='Chemical' readOnly className='bg-[#f4f5eb] dark:bg-[#28301f]' /></div>
    <div className='grid gap-4 sm:grid-cols-2'><Input label='PubChem matched CAS' value={item.casNumber} onChange={(e) => setItem((s) => ({ ...s, casNumber: e.target.value }))} /><Input label='Chemical formula' value={item.chemicalFormula} onChange={(e) => setItem((s) => ({ ...s, chemicalFormula: e.target.value }))} /></div>
    <div className='grid gap-4 sm:grid-cols-2'><Input label='SMILES' value={item.smiles} onChange={(e) => setItem((s) => ({ ...s, smiles: e.target.value }))} /><Input label='InChI' value={item.inchi} onChange={(e) => setItem((s) => ({ ...s, inchi: e.target.value }))} /></div>
    <div className='grid gap-4 sm:grid-cols-2'><Input label='Manufacturing company' value={item.manufacturingCompany} onChange={(e) => setItem((s) => ({ ...s, manufacturingCompany: e.target.value }))} /><Input label='Entry date' type='date' value={item.entryDate} onChange={(e) => setItem((s) => ({ ...s, entryDate: e.target.value }))} /></div>
    <div className='grid gap-4 sm:grid-cols-2'><Input label='Quantity' type='number' value={item.quantity} onChange={(e) => setItem((s) => ({ ...s, quantity: e.target.value }))} /><SelectUnit value={item.quantityUnit} onChange={(e) => setItem((s) => ({ ...s, quantityUnit: e.target.value }))} /></div>
    <div className='grid gap-4 sm:grid-cols-2'><Input label='Storage location' value={item.storageLocation} onChange={(e) => setItem((s) => ({ ...s, storageLocation: e.target.value }))} /><Input label='Lot / batch number' value={item.lotNumber} onChange={(e) => setItem((s) => ({ ...s, lotNumber: e.target.value }))} /></div>
    <div className='grid gap-4 sm:grid-cols-2'><Input label='Low stock threshold' type='number' value={item.minThreshold} onChange={(e) => setItem((s) => ({ ...s, minThreshold: e.target.value }))} /><Input label='Expiry date' type='date' value={item.expiryDate} onChange={(e) => setItem((s) => ({ ...s, expiryDate: e.target.value }))} /></div>
  </div>;

  const downloadInventoryImportTemplate = () => {
    const headers = [
      'itemCode',
      'chemicalName',
      'quantity',
      'quantityUnit',
      'minThreshold',
      'costPerUnit',
      'casNumber',
      'chemicalFormula',
      'manufacturingCompany',
      'storageLocation',
      'lotNumber',
      'expiryDate',
    ];
    const sample = ['CHEM001', 'Acetone', '500', 'mL', '5', '0', '67-64-1', 'C3H6O', 'Generic', 'Shelf A1', 'LOT-123', '2030-12-31'];
    const csv = `${headers.join(',')}\n${sample.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'inventory-import-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadExperimentsImportTemplate = () => {
    const headers = ['experimentNumber', 'experimentObject', 'requirements'];
    const sample = [
      'EXP-001',
      'Measure pH of sample',
      'CHEM001:10:mL;CHEM002:5:g',
    ];
    const csv = `${headers.join(',')}\n${sample.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'experiments-import-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const parseRequirementsCell = (value) => {
    const text = String(value || '').trim();
    if (!text) return [];
    return text
      .split(';')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const [itemCode, quantity, quantityUnit] = entry.split(':').map((part) => String(part || '').trim());
        return {
          itemCode,
          quantity: Number(quantity || 0),
          quantityUnit: quantityUnit || '',
        };
      });
  };

  const handleExperimentImportFile = async (file) => {
    if (!file) return;
    const text = await file.text();
    const { records } = parseCsv(text);
    const issues = [];
    const experiments = [];

    records.forEach((record, index) => {
      const experimentNumber = String(record.experimentNumber || '').trim();
      const experimentObject = String(record.experimentObject || '').trim();
      const requiredInventory = parseRequirementsCell(record.requirements);

      if (!experimentNumber) issues.push({ index, message: 'Missing experimentNumber' });
      if (!experimentObject) issues.push({ index, message: 'Missing experimentObject' });
      if (!requiredInventory.length) issues.push({ index, message: 'Missing requirements (use ITEMCODE:QTY:UNIT;...)' });

      requiredInventory.forEach((req, reqIndex) => {
        if (!req.itemCode) issues.push({ index, message: `Requirement #${reqIndex + 1} missing itemCode` });
        if (!Number.isFinite(req.quantity) || req.quantity <= 0) issues.push({ index, message: `Requirement #${reqIndex + 1} invalid quantity` });
      });

      experiments.push({
        experimentNumber,
        experimentObject,
        requiredInventory,
      });
    });

    setExperimentImportExperiments(experiments);
    setExperimentImportIssues(issues.slice(0, 50));
  };

  const submitExperimentBulkImport = async () => {
    if (!labId || experimentImporting || !experimentImportExperiments.length) return;
    setExperimentImporting(true);
    try {
      const result = await store.bulkImportExperiments({ labId, experiments: experimentImportExperiments });
      await store.fetchExperiments({ labId });
      store.setToast({
        type: result?.errorCount ? 'warning' : 'success',
        message: `Experiment import done: ${result?.createdCount ?? 0} created, ${result?.skippedCount ?? 0} skipped, ${result?.errorCount ?? 0} errors.`,
      });
      setExperimentImportOpen(false);
      setExperimentImportFileName('');
      setExperimentImportExperiments([]);
      setExperimentImportIssues([]);
    } catch (error) {
      store.setToast({ type: 'error', message: error?.response?.data?.message || 'Experiment import failed.' });
    } finally {
      setExperimentImporting(false);
    }
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
      store.setToast({ type: 'success', message: `Store request submitted for ${storeModalData.chemicalName}` });
    } catch (e) {
      store.setToast({ type: 'error', message: 'Failed to submit store request' });
    } finally {
      setSubmittingStoreReq(false);
    }
  };

  const requiredHeaders = [
    { key: 'chemicalName', label: 'Chemical Name', render: (row) => <span className="font-semibold text-[#3c4e23] dark:text-[#eef4e8]">{row.chemicalName}</span> },
    { key: 'quantityPerStudent', label: 'Required / Student', render: (row) => <span className="font-medium text-[#556b2f] dark:text-[#c5d0b5]">{row.quantityPerStudent} {row.unit}</span> },
    { key: 'labStock', label: 'Available in Lab', render: (row) => <span className="font-bold text-[#3c4e23] dark:text-[#eef4e8]">{row.labStock} {row.unit}</span> },
    { key: 'usedInExperiments', label: 'Used in Experiments', render: (row) => (
        <div className="flex flex-wrap gap-1">
          {(row.usedInExperiments || []).map((exp, i) => (
            <span key={i} className="px-2 py-0.5 rounded-md bg-[#f4f6ee] text-[#556b2f] text-xs dark:bg-[#28301f] dark:text-[#c5d0b5]">{exp}</span>
          ))}
        </div>
      )
    },
    { key: 'status', label: 'Status', render: (row) => {
        if (row.status === 'Available') return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">✅ Available</span>;
        if (row.status === 'Low') return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">⚠️ Low Stock</span>;
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">❌ Not Available</span>;
      }
    },
    { key: 'actions', label: 'Actions', render: (row) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs border-[#cfd8bd] text-[#556b2f]"
            onClick={() => {
              setNewItem({ ...EMPTY_ITEM, chemicalName: row.chemicalName, quantityUnit: row.unit || 'g', quantity: '0' });
              setCreateOpen(true);
            }}
          >
            ➕ Add to Inventory
          </Button>
          <Button
            size="sm"
            className="text-xs bg-[#556b2f] text-white hover:bg-[#4a5f28]"
            onClick={() => {
              setStoreModalData({ chemicalName: row.chemicalName, quantityRequested: '100', unit: row.unit || 'g', reason: `Lab Requirement for ${(row.usedInExperiments || []).join(', ')}` });
              setStoreModalOpen(true);
            }}
          >
            🏪 Request from Store
          </Button>
        </div>
      )
    }
  ];

  const inventoryHeaders = [
    { key: 'chemicalName', label: 'Chemical Name' },
    { key: 'casNumber', label: 'CAS No.' },
    { key: 'quantity', label: 'Stock', render: (row) => `${row.quantity} ${row.quantityUnit || ''}`.trim() },
    { key: 'costPerUnit', label: 'Cost/Unit', render: (row) => `Rs. ${Number(row.costPerUnit || 0).toFixed(2)}` },
    { key: 'source', label: 'Source', render: (row) => {
        const isStore = row.source === 'Store Transfer';
        return <span className={`inline-block px-2 py-1 rounded-md text-xs font-medium ${isStore ? 'bg-[#6f7d45] text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}>{row.source || 'Manual Entry'}</span>
    }},
    { key: 'entryDate', label: 'Entry Date', render: (row) => row.entryDate ? new Date(row.entryDate).toLocaleString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : 'N/A' },
    { key: 'actions', label: 'Actions', render: (row) => <div className='flex flex-wrap gap-2'><Button variant='outline' className='px-3 py-1 text-xs' onClick={() => openEditModal(row)}><Pencil size={14} /> Edit</Button><Button variant='outline' className='px-3 py-1 text-xs text-red-700 dark:text-red-300' onClick={() => setDeleteTarget(row)}><Trash2 size={14} /> Delete</Button></div> }
  ];
  const experimentHeaders = [
    { key: 'experimentNumber', label: 'Experiment No.' },
    { key: 'experimentObject', label: 'Experiment Object' },
    { key: 'requiredInventory', label: 'Required Chemicals', render: (row) => (row?.requiredInventory || []).map((entry) => entry?.chemicalName || entry?.inventoryItemId || '').filter(Boolean).join(', ') || '--' },
    { key: 'totalEstimatedExpense', label: 'Expense', render: (row) => `Rs. ${Number(row?.totalEstimatedExpense || 0).toFixed(2)}` },
    { key: 'actions', label: 'Actions', render: (row) => <Button variant='outline' className='px-3 py-1 text-xs text-red-700 dark:text-red-300' onClick={() => setDeleteExperimentTarget(row)}><Trash2 size={14} /> Delete</Button> }
  ];

  return <div className='space-y-6 pb-10'>
    <div className='rounded-xl border border-[#d9e1ca] bg-[#f9faef] px-4 py-3 dark:border-[#414a33] dark:bg-[#1f2419]'><div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'><div><p className='text-sm font-medium text-[#3c4e23] dark:text-[#eef4e8]'>You are admin of {assignedLabs.length} lab{assignedLabs.length > 1 ? 's' : ''}</p><p className='mt-1 text-xs text-[#71805a] dark:text-[#c5d0b5]'>Current dashboard: {currentLab?.name || 'Assigned Lab'}{currentLab?.courseType ? ` • ${currentLab.courseType}` : ''}{currentLab?.year ? ` • Year ${currentLab.year}` : ''}{currentLab?.semester ? ` • Sem ${currentLab.semester}` : ''}{currentLab?.department ? ` • ${currentLab.department}` : ''}</p></div><div className='flex flex-wrap gap-2'>{assignedLabs.map((lab) => { const labKey = String(lab.id || lab._id); return <Button key={labKey} variant={labKey === String(labId) ? 'primary' : 'outline'} className='px-3 py-1 text-xs' onClick={() => { setSelectedLabId(labKey); localStorage.setItem('pharmlab-active-lab', labKey); }}>{lab.labName || lab.name || 'Lab'}{lab.courseType ? ` (${lab.courseType} Y${lab.year} S${lab.semester})` : ''}</Button>; })}</div></div></div>
    
    {/* Smart Top Stat Cards */}
    <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
      <Card title='Total Chemicals Needed' subtitle='Required for lab experiments'>
        <p className='text-3xl font-semibold text-[#556b2f] dark:text-[#c5d0b5]'>{smart.totalNeeded ?? 0}</p>
      </Card>
      <Card title='Available in Lab' subtitle='Sufficient stock for experiments'>
        <p className='text-3xl font-semibold text-emerald-600 dark:text-emerald-400'>{smart.available ?? 0}</p>
      </Card>
      <Card title='Not Available / Low' subtitle='Stock replenishment required'>
        <p className='text-3xl font-semibold text-rose-600 dark:text-rose-400'>{(smart.notAvailable ?? 0) + (smart.low ?? 0)}</p>
      </Card>
      <Card title='Chemicals in Stock' subtitle='Total labInventory records'>
        <p className='text-3xl font-semibold text-[#3c4e23] dark:text-[#eef4e8]'>{(store.inventory || []).length}</p>
      </Card>
    </div>

    {/* Live Practical Batch Requisition Widget */}
    <div className="rounded-2xl border border-[#d9e1ca] bg-gradient-to-r from-[#f4f6ee] to-[#ebf1e1] p-4 shadow-sm dark:border-[#3c452f] dark:from-[#1f2519] dark:to-[#171b12]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-[#556b2f] animate-pulse"></span>
            <h3 className="text-base font-bold text-[#2e3d19] dark:text-[#eef4e8]">
              Batch Student Demand Aggregator
            </h3>
          </div>
          <p className="text-xs text-[#627443] dark:text-[#b8c9a0]">
            Sum of chemical demand for 50+ students in {currentLab?.name || 'this lab'}. If stock is low, review deficits and send requisition to Central Store.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            className="bg-[#556b2f] text-white hover:bg-[#455724] font-semibold text-xs py-2 px-3 shadow-sm"
            onClick={() => {
              setStoreModalData({
                chemicalName: smart.chemicals?.[0]?.chemicalName || 'Acetone',
                quantityRequested: String(smart.chemicals?.[0]?.deficit || '500'),
                unit: smart.chemicals?.[0]?.unit || 'mL',
                reason: `Practical Batch Requisition for ${currentLab?.name || 'Lab'}`
              });
              setStoreModalOpen(true);
            }}
          >
            📤 Send Requisition to Central Store
          </Button>
        </div>
      </div>
    </div>

    {!isTransactionsPage && !isAnalyticsPage ? <>
      {/* SECTION 1 — Required for Experiments */}
      <div className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#3c4e23] dark:text-[#eef4e8]">Required for Experiments</h2>
            <p className="text-xs text-[#71805a] dark:text-[#c5d0b5]">Auto-collected list of unique chemicals required across all uploaded lab experiments.</p>
          </div>
        </div>
        <Table headers={requiredHeaders} rows={smart.chemicals || []} />
      </div>

      {/* SECTION 2 — Lab Inventory Stock */}
      <div className="space-y-3 pt-4 border-t border-[#e8efd9] dark:border-[#2e3d19]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#3c4e23] dark:text-[#eef4e8]">Lab Inventory Stock</h2>
            <p className="text-xs text-[#71805a] dark:text-[#c5d0b5]">Actual recorded inventory items and current stock levels for this lab.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={downloadInventoryImportTemplate}><FileDown size={16} /> Template CSV</Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}><Upload size={16} /> Bulk Import</Button>
            <Button variant="outline" onClick={() => setCreateOpen(true)}><Plus size={16} /> Add Chemical</Button>
          </div>
        </div>
        <Table headers={inventoryHeaders} rows={(store.inventory || []).map((item) => ({ ...item, highlight: Number(item?.quantity || 0) <= Number(item?.minThreshold || 0) }))} />
      </div>

      <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between pt-4 border-t border-[#e8efd9] dark:border-[#2e3d19]'><div><h2 className='text-xl font-semibold'>Experiments In This Lab</h2><p className='text-sm text-slate-500 dark:text-slate-400'>Experiment object, required inventory, and estimated expense are managed together here.</p></div><div className='flex flex-wrap gap-2'><Button variant='outline' onClick={downloadExperimentsImportTemplate}><FileDown size={16} /> Template CSV</Button><Button variant='outline' onClick={() => setExperimentImportOpen(true)}><Upload size={16} /> Import Experiments</Button><Button variant='outline' onClick={() => setCreateOpen(true)}><Plus size={16} /> Add Inventory First</Button><Button onClick={() => setExperimentOpen(true)}><Plus size={16} /> Add Experiment</Button></div></div>
      <Table headers={experimentHeaders} rows={store.experiments || []} />
    </> : null}

    {/* Store Request Modal */}
    <Modal open={storeModalOpen} onClose={() => setStoreModalOpen(false)} title="Request Chemical From Central Store">
      <div className="space-y-4 text-left">
        <Input
          label="Chemical Name"
          value={storeModalData.chemicalName}
          onChange={(e) => setStoreModalData({ ...storeModalData, chemicalName: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Quantity Requested"
            type="number"
            value={storeModalData.quantityRequested}
            onChange={(e) => setStoreModalData({ ...storeModalData, quantityRequested: e.target.value })}
          />
          <SelectUnit
            value={storeModalData.unit}
            onChange={(e) => setStoreModalData({ ...storeModalData, unit: e.target.value })}
          />
        </div>
        <Input
          label="Reason for Request"
          value={storeModalData.reason}
          onChange={(e) => setStoreModalData({ ...storeModalData, reason: e.target.value })}
          placeholder="e.g. Experiment requirement stock shortage"
        />
        <Button
          onClick={handleSendStoreRequestSubmit}
          disabled={submittingStoreReq || !storeModalData.chemicalName || !storeModalData.quantityRequested}
          className="w-full bg-[#556b2f] text-white font-bold py-2 rounded-xl mt-2"
        >
          {submittingStoreReq ? 'Sending Request...' : 'Send Store Request'}
        </Button>
      </div>
    </Modal>

    <LabImportModal open={importOpen} onClose={() => setImportOpen(false)} labId={labId} />
    <Modal open={experimentImportOpen} onClose={() => { if (!experimentImporting) setExperimentImportOpen(false); }} title='Import Experiments'><div className='space-y-4'><div className='rounded-lg border border-[#d9e1ca] bg-[#f7f8f1] p-4 text-xs text-[#71805a] dark:border-[#414a33] dark:bg-[#28301f] dark:text-[#c5d0b5]'><p className='font-medium text-[#3c4e23] dark:text-[#eef4e8]'>Upload a CSV to add many experiments with required chemicals.</p><p className='mt-1'>Use the <span className='font-semibold'>requirements</span> column format: <span className='font-semibold'>ITEMCODE:QTY:UNIT;ITEMCODE2:QTY:UNIT</span>.</p><p className='mt-1'>Tip: itemCode must match your inventory (download the inventory list from your system if needed).</p></div><label className='block text-sm text-slate-700 dark:text-slate-300'><span className='mb-1 block text-xs font-medium tracking-wide'>CSV file</span><input type='file' accept='.csv,text/csv' className='block w-full cursor-pointer rounded-lg border border-[#cfd8bd] bg-[#fffef8] px-3 py-2 text-sm text-[#3c4e23] file:mr-3 file:rounded-md file:border-0 file:bg-[#556b2f] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#f0f4e8] hover:file:bg-[#6f7d45] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]' onChange={async (e) => { const file = e.target.files?.[0]; setExperimentImportFileName(file?.name || ''); setExperimentImportExperiments([]); setExperimentImportIssues([]); if (file) await handleExperimentImportFile(file); }} /></label>{experimentImportFileName ? <div className='text-xs text-[#71805a] dark:text-[#c5d0b5]'>Selected: <span className='font-medium'>{experimentImportFileName}</span> • Rows: <span className='font-medium'>{experimentImportExperiments.length}</span> • Issues: <span className='font-medium'>{experimentImportIssues.length}</span></div> : null}{experimentImportIssues.length ? <div className='rounded-lg border border-[#d9e1ca] bg-[#fffef8] p-3 text-xs text-slate-600 dark:border-[#414a33] dark:bg-[#20251a] dark:text-slate-300'><p className='mb-2 font-medium'>Issues (first {experimentImportIssues.length})</p><div className='max-h-40 overflow-auto space-y-1'>{experimentImportIssues.map((issue) => <p key={`exp-issue-${issue.index}`}>Row {issue.index + 2}: {issue.message}</p>)}</div></div> : null}<Button className='w-full' onClick={submitExperimentBulkImport} disabled={experimentImporting || !labId || !experimentImportExperiments.length}>{experimentImporting ? 'Importing...' : 'Import experiments'}</Button></div></Modal>
    <Modal open={createOpen} onClose={() => setCreateOpen(false)} title='Add Chemical To Inventory'><div className='space-y-4'>{modalFields(newItem, setNewItem, autofillingCas, lastAutofilledCas, setAutofillingCas, setLastAutofilledCas, casLookupMessage, casLookupType, setCasLookupMessage, setCasLookupType)}<div className='rounded-lg border border-dashed border-[#cfd8bd] bg-[#f9faef] px-4 py-3 text-xs text-[#71805a] dark:border-[#4e5d35] dark:bg-[#1f2419] dark:text-[#c5d0b5]'>PubChem autofill does not save automatically. Review the fields, enter quantity, then click Save chemical.</div><Button className='w-full' onClick={handleAddItem} disabled={savingItem || !labId || autofillingCas}>{savingItem ? 'Saving...' : 'Save chemical'}</Button></div></Modal>

    <Modal open={editOpen} onClose={() => setEditOpen(false)} title='Edit Chemical'><div className='space-y-4'>{modalFields(editItem, setEditItem, editAutofillingCas, lastEditAutofilledCas, setEditAutofillingCas, setLastEditAutofilledCas, editCasLookupMessage, editCasLookupType, setEditCasLookupMessage, setEditCasLookupType)}<Button className='w-full' onClick={handleEditItem} disabled={savingEdit || editAutofillingCas}>{savingEdit ? 'Saving...' : 'Save changes'}</Button></div></Modal>
    <Modal open={experimentOpen} onClose={() => setExperimentOpen(false)} title='Add Experiment'><div className='space-y-4'><Input label='Experiment number' value={experimentForm.experimentNumber} onChange={(e) => setExperimentForm((s) => ({ ...s, experimentNumber: e.target.value }))} placeholder='EXP-001' /><Input label='Experiment object' value={experimentForm.experimentObject} onChange={(e) => setExperimentForm((s) => ({ ...s, experimentObject: e.target.value }))} /><div className='rounded-xl border border-[#d9e1ca] p-4 dark:border-[#414a33]'><div className='mb-3 flex items-center justify-between'><div><p className='font-medium text-[#3c4e23] dark:text-[#eef4e8]'>Required Inventory</p><p className='text-xs text-[#71805a] dark:text-[#c5d0b5]'>If a chemical is missing, add it first from this same dashboard.</p></div><Button variant='outline' className='px-3 py-1 text-xs' onClick={() => setCreateOpen(true)}><Plus size={14} /> Add Chemical</Button></div><div className='space-y-3'>{experimentForm.requiredInventory.map((entry, index) => <div key={`req-${index}`} className='grid gap-3 rounded-lg bg-[#f7f8f1] p-3 dark:bg-[#28301f] lg:grid-cols-[1.4fr_0.8fr_0.8fr_auto]'><label className='relative block text-sm text-slate-700 dark:text-slate-300'><span className='mb-1 block text-xs font-medium tracking-wide'>Chemical</span><select value={entry.inventoryItemId} onChange={(e) => { const selected = store.inventory.find((item) => item.id === e.target.value); setExperimentForm((s) => ({ ...s, requiredInventory: s.requiredInventory.map((current, i) => i === index ? { ...current, inventoryItemId: e.target.value, quantityUnit: selected?.quantityUnit || 'mL' } : current) })); }} className='w-full rounded-lg border border-[#cfd8bd] bg-[#fffef8] px-3 py-2 text-[#3c4e23] focus:outline-none focus:ring-2 focus:ring-[#6f7d45] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]'><option value=''>Select chemical</option>{store.inventory.map((item) => <option key={item.id} value={item.id}>{item.chemicalName} ({item.quantity} {item.quantityUnit})</option>)}</select></label><Input label='Required qty' type='number' value={entry.quantity} onChange={(e) => setExperimentForm((s) => ({ ...s, requiredInventory: s.requiredInventory.map((current, i) => i === index ? { ...current, quantity: e.target.value } : current) }))} /><SelectUnit value={entry.quantityUnit} onChange={(e) => setExperimentForm((s) => ({ ...s, requiredInventory: s.requiredInventory.map((current, i) => i === index ? { ...current, quantityUnit: e.target.value } : current) }))} /><div className='flex items-end'><Button variant='outline' className='px-3 py-2 text-xs text-red-700 dark:text-red-300' onClick={() => setExperimentForm((s) => ({ ...s, requiredInventory: s.requiredInventory.filter((_, i) => i !== index) }))} disabled={experimentForm.requiredInventory.length === 1}>Remove</Button></div></div>)}</div><Button variant='outline' className='mt-3 px-3 py-1 text-xs' onClick={() => setExperimentForm((s) => ({ ...s, requiredInventory: [...s.requiredInventory, { inventoryItemId: '', quantity: '', quantityUnit: 'mL' }] }))}><Plus size={14} /> Add Another Chemical</Button></div><Button className='w-full' onClick={handleCreateExperiment} disabled={savingExperiment}>{savingExperiment ? 'Saving...' : 'Save experiment'}</Button></div></Modal>
    <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title='Delete Chemical'><div className='space-y-4'><p className='text-sm text-slate-600 dark:text-slate-300'>{deleteTarget ? `Delete ${deleteTarget.chemicalName || deleteTarget.name} from inventory?` : ''}</p><div className='flex gap-3'><Button variant='outline' className='w-full' onClick={() => setDeleteTarget(null)}>Cancel</Button><Button variant='danger' className='w-full' onClick={async () => { try { await store.deleteInventoryItem(deleteTarget.id); store.setToast({ type: 'success', message: `${deleteTarget.chemicalName || deleteTarget.name} deleted.` }); setDeleteTarget(null); } catch (error) { store.setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to delete chemical.' }); } }}>Delete</Button></div></div></Modal>
    <Modal open={Boolean(deleteExperimentTarget)} onClose={() => setDeleteExperimentTarget(null)} title='Delete Experiment'><div className='space-y-4'><p className='text-sm text-slate-600 dark:text-slate-300'>{deleteExperimentTarget ? `Delete experiment ${deleteExperimentTarget.experimentNumber || deleteExperimentTarget.experimentObject || deleteExperimentTarget.id}?` : ''}</p><div className='flex gap-3'><Button variant='outline' className='w-full' onClick={() => setDeleteExperimentTarget(null)}>Cancel</Button><Button variant='danger' className='w-full' onClick={async () => { try { await store.deleteExperiment(deleteExperimentTarget.id); store.setToast({ type: 'success', message: `${deleteExperimentTarget.experimentNumber || deleteExperimentTarget.experimentObject || 'Experiment'} deleted.` }); setDeleteExperimentTarget(null); } catch (error) { store.setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to delete experiment.' }); } }}>Delete</Button></div></div></Modal>
  </div>;
}
