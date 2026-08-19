import { useEffect, useMemo, useState } from 'react';
import { 
  Pencil, Plus, Send, Trash2, FileSpreadsheet, Sparkles, 
  PackageCheck, Boxes, Clock, AlertTriangle, ShieldAlert, 
  Search, CheckCircle2, XCircle, Award, RefreshCw, UserCheck, UserX 
} from 'lucide-react';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import socket from '../services/socket';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import ImportModal from '../components/ImportModal';
import ChemicalIntakeModal from '../components/ChemicalIntakeModal';

const CATEGORY_OPTIONS = ['Glassware', 'Chemical'];
const CHEMICAL_UNITS = ['mL', 'L', 'uL', 'mg', 'g', 'kg'];

const EMPTY_STORE_ITEM = {
  itemCode: '',
  itemName: '',
  category: 'Glassware',
  subCategory: '',
  quantity: '',
  quantityUnit: 'pieces',
  storageLocation: '',
  description: '',
};

const EMPTY_ALLOTMENT = {
  storeItemId: '',
  studentId: '',
  quantity: '',
  purpose: '',
  notes: '',
  dueDate: '',
};

export default function StoreDashboard() {
  const {
    storeItems,
    storeAllotments,
    users,
    fetchStoreItems,
    fetchStoreAllotments,
    fetchUsers,
    createStoreItem,
    updateStoreItem,
    deleteStoreItem,
    createStoreAllotment,
    approveStoreRequest,
    rejectStoreRequest,
    setUserBlockedState,
    setToast,
    setHighlight,
  } = useAppStore();

  const user = useAuthStore((state) => state.user);

  // Tab State
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'requests', 'allotments', 'lowstock', 'access'
  const [inventorySearch, setInventorySearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Request Filter State
  const [requestStatusFilter, setRequestStatusFilter] = useState('Pending');
  const [requestSearch, setRequestSearch] = useState('');

  // Modal States
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [newItem, setNewItem] = useState(EMPTY_STORE_ITEM);
  const [editItem, setEditItem] = useState(EMPTY_STORE_ITEM);
  const [allotmentForm, setAllotmentForm] = useState(EMPTY_ALLOTMENT);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [allotting, setAllotting] = useState(false);
  const [reviewingRequestId, setReviewingRequestId] = useState('');
  const [blockingUserId, setBlockingUserId] = useState('');

  useEffect(() => {
    fetchStoreItems();
    fetchStoreAllotments();
    fetchUsers();

    // Set up real-time socket listeners
    socket.on('store:new_request', () => {
      fetchStoreAllotments();
    });

    socket.on('store:request_approved', () => {
      fetchStoreAllotments();
      fetchStoreItems();
    });

    socket.on('store:request_rejected', () => {
      fetchStoreAllotments();
    });

    return () => {
      socket.off('store:new_request');
      socket.off('store:request_approved');
      socket.off('store:request_rejected');
    };
  }, [fetchStoreAllotments, fetchStoreItems, fetchUsers]);

  const duplicateCodeExists = useMemo(
    () => storeItems.some((item) => item.itemCode?.toUpperCase() === newItem.itemCode.trim().toUpperCase()),
    [newItem.itemCode, storeItems]
  );

  const categoryCount = new Set(storeItems.map((item) => item.category)).size;
  const subCategoryCount = new Set(storeItems.map((item) => `${item.category}:${item.subCategory}`)).size;
  const lowStockItems = storeItems.filter((item) => Number(item.quantity || 0) <= 5);
  const students = users.filter((user) => user.role === 'student');
  const pendingStoreRequests = storeAllotments.filter((entry) => entry.status === 'pending' || entry.status === 'Pending');
  const selectedAllotmentItem = storeItems.find((item) => item.id === allotmentForm.storeItemId);

  // Filtered Inventory List
  const filteredStoreItems = useMemo(() => {
    return storeItems.filter(item => {
      const q = inventorySearch.toLowerCase().trim();
      const matchesSearch = !q ||
        (item.itemName || '').toLowerCase().includes(q) ||
        (item.itemCode || '').toLowerCase().includes(q) ||
        (item.subCategory || '').toLowerCase().includes(q) ||
        (item.storageLocation || '').toLowerCase().includes(q);

      const matchesCat = categoryFilter === 'All' || item.category === categoryFilter;
      
      const qty = Number(item.quantity || 0);
      let matchesStatus = true;
      if (statusFilter === 'Optimal') matchesStatus = qty > 5;
      else if (statusFilter === 'Low') matchesStatus = qty > 0 && qty <= 5;
      else if (statusFilter === 'Out') matchesStatus = qty <= 0;

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [storeItems, inventorySearch, categoryFilter, statusFilter]);

  // Filtered Store Requests List
  const filteredRequests = useMemo(() => {
    return storeAllotments.filter(entry => {
      const q = requestSearch.toLowerCase().trim();
      const matchesSearch = !q ||
        (entry.itemName || entry.chemicalName || '').toLowerCase().includes(q) ||
        (entry.studentName || entry.labName || '').toLowerCase().includes(q) ||
        (entry.purpose || entry.reason || '').toLowerCase().includes(q) ||
        (entry.receiptNumber || entry.itemCode || entry.requestId || '').toLowerCase().includes(q);

      const statusStr = (entry.status || 'Pending').toLowerCase();
      const targetFilter = requestStatusFilter.toLowerCase();
      const matchesStatus = requestStatusFilter === 'All' || statusStr === targetFilter;

      return matchesSearch && matchesStatus;
    });
  }, [storeAllotments, requestSearch, requestStatusFilter]);

  const applyCategoryRules = (item) => {
    if (item.category === 'Glassware') {
      return { ...item, quantityUnit: 'pieces' };
    }
    if (!CHEMICAL_UNITS.includes(item.quantityUnit)) {
      return { ...item, quantityUnit: CHEMICAL_UNITS[0] };
    }
    return item;
  };

  const openEditModal = (item) => {
    setEditItem(applyCategoryRules({
      id: item.id,
      itemCode: item.itemCode,
      itemName: item.itemName,
      category: item.category,
      subCategory: item.subCategory,
      quantity: String(item.quantity),
      quantityUnit: item.category === 'Glassware' ? 'pieces' : item.quantityUnit,
      storageLocation: item.storageLocation,
      description: item.description,
    }));
    setEditOpen(true);
  };

  const saveNewItem = async () => {
    if (!newItem.itemCode.trim() || !newItem.itemName.trim() || !newItem.subCategory.trim() || !newItem.quantity) return;
    if (duplicateCodeExists) {
      setToast({ type: 'error', message: 'This store item is already listed.' });
      return;
    }

    setSaving(true);
    try {
      const payload = applyCategoryRules(newItem);
      const created = await createStoreItem({
        itemCode: payload.itemCode.trim().toUpperCase(),
        itemName: payload.itemName.trim(),
        category: payload.category,
        subCategory: payload.subCategory.trim(),
        quantity: Number(payload.quantity),
        quantityUnit: payload.quantityUnit,
        storageLocation: payload.storageLocation.trim(),
        description: payload.description.trim(),
      });
      setToast({ type: 'success', message: `${created.itemName} added to store.` });
      setHighlight(created.id);
      setCreateOpen(false);
      setNewItem(EMPTY_STORE_ITEM);
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to create store item.' });
    } finally {
      setSaving(false);
    }
  };

  const saveEditedItem = async () => {
    if (!editItem.id || !editItem.itemCode.trim() || !editItem.itemName.trim() || !editItem.subCategory.trim() || !editItem.quantity) return;

    setSaving(true);
    try {
      const payload = applyCategoryRules(editItem);
      const updated = await updateStoreItem(editItem.id, {
        itemCode: payload.itemCode.trim().toUpperCase(),
        itemName: payload.itemName.trim(),
        category: payload.category,
        subCategory: payload.subCategory.trim(),
        quantity: Number(payload.quantity),
        quantityUnit: payload.quantityUnit,
        storageLocation: payload.storageLocation.trim(),
        description: payload.description.trim(),
      });
      setToast({ type: 'success', message: `${updated.itemName} updated.` });
      setHighlight(updated.id);
      setEditOpen(false);
      setEditItem(EMPTY_STORE_ITEM);
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to update store item.' });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      await deleteStoreItem(deleteTarget.id);
      setToast({ type: 'success', message: `${deleteTarget.itemName} deleted from store.` });
      setDeleteTarget(null);
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to delete store item.' });
    } finally {
      setDeleting(false);
    }
  };

  const submitAllotment = async () => {
    if (!allotmentForm.storeItemId || !allotmentForm.studentId || !allotmentForm.quantity) return;

    setAllotting(true);
    try {
      const created = await createStoreAllotment({
        storeItemId: allotmentForm.storeItemId,
        studentId: allotmentForm.studentId,
        quantity: Number(allotmentForm.quantity),
        purpose: allotmentForm.purpose.trim(),
        notes: allotmentForm.notes.trim(),
        dueDate: allotmentForm.dueDate || null,
      });
      await fetchStoreItems();
      setToast({ type: 'success', message: `${created.itemName} allotted to ${created.studentName}.` });
      setAllotmentForm(EMPTY_ALLOTMENT);
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to allot store item.' });
    } finally {
      setAllotting(false);
    }
  };

  const handleApproveStoreRequest = async (requestId) => {
    setReviewingRequestId(requestId);
    try {
      await approveStoreRequest(requestId);
      await Promise.all([fetchStoreItems(), fetchStoreAllotments()]);
      setToast({ type: 'success', message: 'Store request approved successfully!' });
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to approve store request.' });
    } finally {
      setReviewingRequestId('');
    }
  };

  const handleRejectStoreRequest = async (requestId) => {
    setReviewingRequestId(requestId);
    try {
      await rejectStoreRequest(requestId);
      await fetchStoreAllotments();
      setToast({ type: 'success', message: 'Store request rejected.' });
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to reject store request.' });
    } finally {
      setReviewingRequestId('');
    }
  };

  const handleToggleStudentBlock = async (student) => {
    setBlockingUserId(student.id);
    try {
      await setUserBlockedState({
        userId: student.id,
        isBlocked: !student.isBlocked,
        blockedReason: student.isBlocked ? '' : 'Blocked by store admin due to spam or misuse.',
      });
      await fetchUsers();
      setToast({ type: 'success', message: `${student.name} ${student.isBlocked ? 'unblocked' : 'blocked'}.` });
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to update student access.' });
    } finally {
      setBlockingUserId('');
    }
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-[#fdfdf7] dark:bg-[#141811] text-[#37412a] dark:text-[#e4e9d8] p-4 md:p-6 space-y-6 font-sans pb-20">
      
      {/* Executive Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#cfd8bd] dark:border-[#38432a] pb-4">
        <div className="space-y-1 text-left">
          <h1 className="text-2xl font-black text-[#37412a] dark:text-[#e4e9d8] tracking-tight flex items-center gap-2">
            <span>Welcome, {user?.name || 'Store Manager'}!</span>
            <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#5c6e46] dark:text-[#a8be8a]">
            <span className="bg-[#5c6e46] text-white px-2.5 py-0.5 rounded text-xs font-black uppercase tracking-wider flex items-center gap-1">
              <Boxes size={13} /> Central Store Manager
            </span>
            <span className="bg-white dark:bg-[#20251a] text-[#5c6e46] dark:text-[#a8be8a] px-2.5 py-0.5 rounded text-xs font-black border border-[#cfd8bd] dark:border-[#414a33]">
              Institutional Central Repository
            </span>
            <span className="text-[#87996c] dark:text-[#9fb384] font-semibold">{currentDate}</span>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button 
            onClick={() => setIntakeOpen(true)} 
            className="px-4 py-2.5 bg-[#5c6e46] hover:bg-[#475735] text-white font-black text-xs rounded-lg transition-all shadow-xs flex items-center gap-2 uppercase tracking-wider"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>Add Arrived Chemical (PubChem)</span>
          </button>

          <button 
            onClick={() => setImportOpen(true)} 
            className="px-3.5 py-2.5 bg-white dark:bg-[#20251a] hover:bg-[#f4f6ee] dark:hover:bg-[#28301f] text-[#5c6e46] dark:text-[#a8be8a] border border-[#cfd8bd] dark:border-[#414a33] font-extrabold text-xs rounded-lg transition-all shadow-2xs flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#5c6e46] dark:text-[#a8be8a]" />
            <span>Import CSV</span>
          </button>

          <button 
            onClick={() => setCreateOpen(true)} 
            className="px-3.5 py-2.5 bg-white dark:bg-[#20251a] hover:bg-[#f4f6ee] dark:hover:bg-[#28301f] text-[#37412a] dark:text-[#e4e9d8] border border-[#cfd8bd] dark:border-[#414a33] font-extrabold text-xs rounded-lg transition-all shadow-2xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-[#5c6e46]" />
            <span>Add SKU</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total SKUs */}
        <div className="rounded-lg bg-white dark:bg-[#1a1d16] border border-[#cfd8bd] dark:border-[#414a33] p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Boxes className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider truncate">
              Store Catalog SKUs
            </p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-2xl font-black text-[#37412a] dark:text-[#e4e9d8] leading-none">
                {storeItems.length}
              </span>
              <span className="text-[10px] font-bold text-indigo-800 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                {categoryCount} Categories
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Pending Requests */}
        <div className="rounded-lg bg-white dark:bg-[#1a1d16] border border-[#cfd8bd] dark:border-[#414a33] p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider truncate">
              Pending Requisitions
            </p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400 leading-none">
                {pendingStoreRequests.length}
              </span>
              <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                Action Required
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Low Stock Alerts */}
        <div className="rounded-lg bg-white dark:bg-[#1a1d16] border border-[#cfd8bd] dark:border-[#414a33] p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-wider truncate">
              Low Stock Refill Alerts
            </p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-2xl font-black text-rose-600 dark:text-rose-400 leading-none">
                {lowStockItems.length}
              </span>
              <span className="text-[10px] font-bold text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                Refill Needed
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Active Allotments */}
        <div className="rounded-lg bg-white dark:bg-[#1a1d16] border border-[#cfd8bd] dark:border-[#414a33] p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <PackageCheck className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider truncate">
              Issued Allotments
            </p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none">
                {storeAllotments.length}
              </span>
              <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                Log Registered
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Main Tabbed Store Management Container */}
      <div className="rounded-lg bg-[#fffef8] dark:bg-[#1a1d16] border border-[#cfd8bd] dark:border-[#414a33] p-4 sm:p-5 shadow-2xs space-y-5 text-left">
        
        {/* Navigation Tabs Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#e4eed3] dark:border-[#2e3722]">
          <div className="flex flex-wrap items-center gap-1.5 bg-[#f4f6ee] dark:bg-[#20251a] p-1 rounded border border-[#cfd8bd] dark:border-[#414a33]">
            {[
              { id: 'inventory', label: '📦 Store Catalog Inventory', count: filteredStoreItems.length },
              { id: 'requests', label: '⏳ Requisition Requests', count: pendingStoreRequests.length, badge: pendingStoreRequests.length > 0 },
              { id: 'allotments', label: '📤 Direct Student Allotment' },
              { id: 'lowstock', label: '⚠️ Low Stock Refill Alert', count: lowStockItems.length, danger: lowStockItems.length > 0 },
              { id: 'access', label: '🛡️ Student Access Control' }
            ].map(tb => (
              <button
                key={tb.id}
                onClick={() => setActiveTab(tb.id)}
                className={`px-3 py-1.5 rounded text-xs font-black transition-all flex items-center gap-1.5 border ${
                  activeTab === tb.id
                    ? 'bg-[#5c6e46] text-white border-[#5c6e46]'
                    : 'bg-white text-[#5c6e46] border-[#cfd8bd] hover:bg-[#e4eed3] dark:bg-[#1a1d16] dark:text-[#a8be8a] dark:border-[#414a33]'
                }`}
              >
                <span>{tb.label}</span>
                {tb.count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    tb.danger ? 'bg-rose-500 text-white' :
                    tb.badge ? 'bg-amber-500 text-white' :
                    activeTab === tb.id ? 'bg-white/20 text-white' : 'bg-[#e4eed3] text-[#5c6e46] dark:bg-[#28301f]'
                  }`}>
                    {tb.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* TAB 1: STORE INVENTORY CATALOG */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            
            {/* Search & Category Filter Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#87996c]" />
                <input
                  type="text"
                  placeholder="Search store inventory by name, code, category, location..."
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#20251a] border border-[#cfd8bd] dark:border-[#414a33] rounded text-xs font-bold outline-none focus:border-[#5c6e46]"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto">
                <span className="text-[10px] font-black uppercase text-[#5c6e46] dark:text-[#a8be8a] shrink-0">Category:</span>
                {['All', 'Chemical', 'Glassware'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition-all border ${
                      categoryFilter === cat
                        ? 'bg-[#5c6e46] text-white border-[#5c6e46]'
                        : 'bg-white text-[#5c6e46] border-[#cfd8bd] dark:bg-[#20251a] dark:text-[#a8be8a] dark:border-[#414a33]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}

                <span className="text-[10px] font-black uppercase text-[#5c6e46] dark:text-[#a8be8a] shrink-0 ml-2">Stock:</span>
                {['All', 'Optimal', 'Low', 'Out'].map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition-all border ${
                      statusFilter === st
                        ? 'bg-[#5c6e46] text-white border-[#5c6e46]'
                        : 'bg-white text-[#5c6e46] border-[#cfd8bd] dark:bg-[#20251a] dark:text-[#a8be8a] dark:border-[#414a33]'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-white dark:bg-[#1a1d16] border border-[#cfd8bd] dark:border-[#414a33] rounded overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#f4f6ee] dark:bg-[#20251a] border-b border-[#cfd8bd] dark:border-[#414a33] text-[#5c6e46] dark:text-[#a8be8a] font-black uppercase tracking-wider">
                      <th className="p-3">SKU Code</th>
                      <th className="p-3">Item / Chemical Name</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Sub-Category</th>
                      <th className="p-3">Available Qty</th>
                      <th className="p-3">Storage Location</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e4eed3] dark:divide-[#2e3722] font-semibold">
                    {filteredStoreItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-xs font-bold text-[#71805a]">
                          No store inventory items match your search filter.
                        </td>
                      </tr>
                    ) : (
                      filteredStoreItems.map(item => {
                        const qty = Number(item.quantity || 0);
                        const isLow = qty <= 5 && qty > 0;
                        const isOut = qty <= 0;

                        return (
                          <tr key={item.id || item._id} className="hover:bg-[#f4f6ee]/50 dark:hover:bg-[#20251a]/50">
                            <td className="p-3 font-mono font-bold text-[#5c6e46] dark:text-[#a8be8a]">
                              {item.itemCode || 'SKU-001'}
                            </td>
                            <td className="p-3 font-bold text-[#37412a] dark:text-[#e4e9d8]">
                              {item.itemName}
                              {item.description && (
                                <p className="text-[10px] text-[#71805a] font-normal truncate max-w-xs">{item.description}</p>
                              )}
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded bg-[#f4f6ee] dark:bg-[#20251a] border border-[#cfd8bd] text-[10px] font-bold text-[#5c6e46] dark:text-[#a8be8a]">
                                {item.category}
                              </span>
                            </td>
                            <td className="p-3 text-[#71805a] dark:text-[#a5b48b]">
                              {item.subCategory || 'General'}
                            </td>
                            <td className="p-3 font-mono font-black">
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                isOut ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300' :
                                isLow ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300' :
                                'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              }`}>
                                {qty} {item.category === 'Glassware' ? 'pcs' : item.quantityUnit || 'units'}
                              </span>
                            </td>
                            <td className="p-3 text-[#71805a] dark:text-[#a5b48b]">
                              📍 {item.storageLocation || 'Central Cabinet'}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => openEditModal(item)}
                                  className="px-2.5 py-1 bg-white dark:bg-[#20251a] hover:bg-[#f4f6ee] border border-[#cfd8bd] dark:border-[#414a33] text-[#5c6e46] dark:text-[#a8be8a] font-bold rounded text-[11px] flex items-center gap-1"
                                >
                                  <Pencil size={12} /> Edit
                                </button>
                                <button
                                  onClick={() => setDeleteTarget(item)}
                                  className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                                >
                                  <Trash2 size={14} />
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
          </div>
        )}

        {/* TAB 2: REQUISITION REQUESTS */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            
            {/* Filter Sub-Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#87996c]" />
                <input
                  type="text"
                  placeholder="Search requester, chemical, receipt code..."
                  value={requestSearch}
                  onChange={(e) => setRequestSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-[#20251a] border border-[#cfd8bd] dark:border-[#414a33] rounded text-xs font-bold outline-none focus:border-[#5c6e46]"
                />
              </div>

              <div className="flex items-center gap-1 bg-[#f4f6ee] dark:bg-[#20251a] p-1 rounded border border-[#cfd8bd]">
                {['All', 'Pending', 'Approved', 'Rejected'].map(st => (
                  <button
                    key={st}
                    onClick={() => setRequestStatusFilter(st)}
                    className={`px-3 py-1 rounded text-xs font-black transition-all border ${
                      requestStatusFilter === st
                        ? 'bg-[#5c6e46] text-white border-[#5c6e46]'
                        : 'bg-white text-[#5c6e46] border-[#cfd8bd] dark:bg-[#1a1d16] dark:text-[#a8be8a] dark:border-[#414a33]'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Requests Cards List */}
            {filteredRequests.length === 0 ? (
              <div className="p-10 bg-white dark:bg-[#1a1d16] border border-dashed border-[#cfd8bd] dark:border-[#414a33] rounded text-center space-y-2">
                <Clock className="w-8 h-8 text-[#87996c] mx-auto" />
                <h3 className="text-base font-black">No Requisitions Found</h3>
                <p className="text-xs text-[#71805a]">There are no store requisitions matching status "{requestStatusFilter}".</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRequests.map((entry) => {
                  const isPending = (entry.status || 'Pending').toLowerCase() === 'pending';
                  const isApproved = (entry.status || '').toLowerCase() === 'approved';
                  const isRejected = (entry.status || '').toLowerCase() === 'rejected';

                  return (
                    <div 
                      key={entry.id || entry._id || entry.requestId}
                      className="bg-white dark:bg-[#1a1d16] border border-[#cfd8bd] dark:border-[#414a33] rounded p-4 space-y-3 shadow-2xs"
                    >
                      {/* Card Header Row */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#e4eed3] dark:border-[#2e3722]">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded uppercase tracking-wider border ${
                            entry.requestType === 'PhD Research' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300' :
                            entry.requestType === 'M.Pharm Research' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-300' :
                            'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300'
                          }`}>
                            {entry.requestType || 'Lab Requisition'}
                          </span>
                          {entry.course && (
                            <span className="text-[10px] font-bold text-gray-600 bg-[#f4f6ee] dark:bg-[#20251a] dark:text-gray-300 px-2 py-0.5 rounded border border-gray-300 dark:border-gray-700">
                              {entry.course}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {entry.receiptNumber && (
                            <span className="font-mono text-xs font-black text-[#5c6e46] bg-[#f4f6ee] px-2 py-0.5 rounded border border-[#cfd8bd]">
                              {entry.receiptNumber}
                            </span>
                          )}
                          <span className={`px-2.5 py-0.5 rounded text-xs font-black border flex items-center gap-1 ${
                            isApproved ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                            isRejected ? 'bg-rose-50 text-rose-700 border-rose-300' :
                            'bg-amber-50 text-amber-700 border-amber-300'
                          }`}>
                            {isApproved ? <CheckCircle2 size={12} /> : isRejected ? <XCircle size={12} /> : <Clock size={12} />}
                            {entry.status || 'Pending'}
                          </span>
                        </div>
                      </div>

                      {/* Card Content Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] font-black text-[#5c6e46] dark:text-[#a8be8a] uppercase block">Requested Item & Qty</span>
                          <span className="font-black text-sm text-[#37412a] dark:text-[#e4e9d8] mt-0.5 block">
                            {entry.itemName || entry.chemicalName}
                          </span>
                          <span className="font-mono font-bold text-xs text-[#5c6e46] dark:text-[#a8be8a]">
                            Quantity: {entry.quantity || entry.quantityRequested} {entry.quantityUnit || entry.unit}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] font-black text-[#5c6e46] dark:text-[#a8be8a] uppercase block">Requester & Lab</span>
                          <span className="font-bold text-[#37412a] dark:text-[#e4e9d8] mt-0.5 block truncate">
                            {entry.studentName || entry.labName || 'Pharmacy Lab'}
                          </span>
                          <span className="text-[10px] text-[#71805a] block truncate">
                            {entry.studentEmail || entry.labName}
                          </span>
                        </div>

                        <div className="flex flex-col justify-center items-end gap-2">
                          {isPending && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleApproveStoreRequest(entry.id || entry._id)}
                                disabled={reviewingRequestId === (entry.id || entry._id)}
                                className="px-4 py-1.5 bg-[#5c6e46] hover:bg-[#475735] text-white font-bold text-xs rounded transition-all shadow-2xs flex items-center gap-1 disabled:opacity-50"
                              >
                                <CheckCircle2 size={14} /> Approve & Issue
                              </button>
                              <button
                                onClick={() => handleRejectStoreRequest(entry.id || entry._id)}
                                disabled={reviewingRequestId === (entry.id || entry._id)}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded transition-all shadow-2xs flex items-center gap-1 disabled:opacity-50"
                              >
                                <XCircle size={14} /> Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Purpose */}
                      {(entry.purpose || entry.reason) && (
                        <div className="p-2 bg-[#f4f6ee] dark:bg-[#20251a] rounded text-xs font-semibold text-[#37412a] dark:text-[#e4e9d8]">
                          <span className="text-[10px] font-black text-[#5c6e46] uppercase block">Purpose / Thesis Objective:</span>
                          {entry.purpose || entry.reason}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DIRECT ALLOTMENT FORM & LOG */}
        {activeTab === 'allotments' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left: Allotment Submission Form */}
            <div className="bg-white dark:bg-[#1a1d16] border border-[#cfd8bd] dark:border-[#414a33] rounded p-4 sm:p-5 space-y-4">
              <h3 className="text-base font-black text-[#37412a] dark:text-[#e4e9d8] flex items-center gap-2 pb-2 border-b border-[#e4eed3] dark:border-[#2e3722]">
                <Send className="w-5 h-5 text-[#5c6e46]" /> Direct Chemical Issue to Researcher
              </h3>

              <div className="space-y-3 text-xs font-bold">
                <div>
                  <label className="block text-xs font-black text-[#5c6e46] mb-1">Select Store Item *</label>
                  <select
                    value={allotmentForm.storeItemId}
                    onChange={(e) => setAllotmentForm((state) => ({ ...state, storeItemId: e.target.value }))}
                    className="w-full p-2.5 rounded border border-[#cfd8bd] bg-white dark:bg-[#20251a] text-xs font-bold"
                  >
                    <option value="">Select item from store inventory</option>
                    {storeItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.itemName} ({item.itemCode}) - {item.quantity} {item.quantityUnit} available
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-[#5c6e46] mb-1">Select Student / Researcher *</label>
                  <select
                    value={allotmentForm.studentId}
                    onChange={(e) => setAllotmentForm((state) => ({ ...state, studentId: e.target.value }))}
                    className="w-full p-2.5 rounded border border-[#cfd8bd] bg-white dark:bg-[#20251a] text-xs font-bold"
                  >
                    <option value="">Select student / researcher</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name} ({student.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-[#5c6e46] mb-1">Quantity *</label>
                    <input
                      type="number"
                      placeholder="e.g. 50"
                      value={allotmentForm.quantity}
                      onChange={(e) => setAllotmentForm((state) => ({ ...state, quantity: e.target.value }))}
                      className="w-full p-2.5 rounded border border-[#cfd8bd] bg-white dark:bg-[#20251a] text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-[#5c6e46] mb-1">Return Date (Optional)</label>
                    <input
                      type="date"
                      value={allotmentForm.dueDate}
                      onChange={(e) => setAllotmentForm((state) => ({ ...state, dueDate: e.target.value }))}
                      className="w-full p-2.5 rounded border border-[#cfd8bd] bg-white dark:bg-[#20251a] text-xs font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-[#5c6e46] mb-1">Purpose / Note</label>
                  <textarea
                    rows={2}
                    placeholder="Enter reason or practical experiment reference..."
                    value={allotmentForm.purpose}
                    onChange={(e) => setAllotmentForm((state) => ({ ...state, purpose: e.target.value }))}
                    className="w-full p-2.5 rounded border border-[#cfd8bd] bg-white dark:bg-[#20251a] text-xs font-bold"
                  />
                </div>

                <button
                  onClick={submitAllotment}
                  disabled={allotting}
                  className="w-full py-2.5 bg-[#5c6e46] hover:bg-[#475735] text-white font-black text-xs rounded transition-all shadow-2xs flex items-center justify-center gap-2 uppercase tracking-wider disabled:opacity-50"
                >
                  <Send size={15} />
                  <span>{allotting ? 'Issuing Chemical...' : 'Issue Chemical Allotment'}</span>
                </button>
              </div>
            </div>

            {/* Right: Recent Allotment Audit Log */}
            <div className="bg-white dark:bg-[#1a1d16] border border-[#cfd8bd] dark:border-[#414a33] rounded p-4 sm:p-5 space-y-4">
              <h3 className="text-base font-black text-[#37412a] dark:text-[#e4e9d8] flex items-center gap-2 pb-2 border-b border-[#e4eed3] dark:border-[#2e3722]">
                <PackageCheck className="w-5 h-5 text-[#5c6e46]" /> Recent Issued Allotment Log
              </h3>

              <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                {storeAllotments.length === 0 ? (
                  <p className="text-xs text-[#71805a] italic text-center p-6">No store chemical allotments issued yet.</p>
                ) : (
                  storeAllotments.map(entry => (
                    <div key={entry.id || entry._id} className="p-3 bg-[#f4f6ee] dark:bg-[#20251a] rounded border border-[#cfd8bd] dark:border-[#414a33] space-y-1 text-xs">
                      <div className="flex justify-between items-center font-bold">
                        <span className="text-[#37412a] dark:text-[#e4e9d8] font-black">{entry.itemName}</span>
                        <span className="font-mono text-[10px] text-[#5c6e46]">{entry.quantity} {entry.quantityUnit}</span>
                      </div>
                      <p className="text-[11px] text-[#71805a]">Issued to: <span className="font-bold text-[#37412a]">{entry.studentName}</span></p>
                      {entry.purpose && <p className="text-[10px] text-[#71805a] italic">Purpose: {entry.purpose}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: LOW STOCK REFILL ALERT */}
        {activeTab === 'lowstock' && (
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950/30 p-3.5 rounded border border-amber-300 dark:border-amber-800 text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <h4>Low Stock & Depleted Chemical Refill Center</h4>
                <p className="text-[11px] font-medium text-amber-800 dark:text-amber-300">
                  {lowStockItems.length} chemical/glassware item(s) are at or below reorder thresholds.
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1a1d16] border border-[#cfd8bd] dark:border-[#414a33] rounded overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f4f6ee] dark:bg-[#20251a] border-b border-[#cfd8bd] text-[#5c6e46] font-black uppercase">
                    <th className="p-3">Item Code</th>
                    <th className="p-3">Item Name</th>
                    <th className="p-3">Current Qty</th>
                    <th className="p-3">Storage Location</th>
                    <th className="p-3 text-right">Quick Restock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e4eed3] dark:divide-[#2e3722] font-semibold">
                  {lowStockItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-xs font-bold text-emerald-700">
                        ✅ All store SKUs have sufficient stock levels!
                      </td>
                    </tr>
                  ) : (
                    lowStockItems.map(item => (
                      <tr key={item.id || item._id} className="hover:bg-[#f4f6ee]/50">
                        <td className="p-3 font-mono font-bold">{item.itemCode}</td>
                        <td className="p-3 font-bold">{item.itemName}</td>
                        <td className="p-3 font-mono font-black text-rose-600">
                          {item.quantity} {item.quantityUnit}
                        </td>
                        <td className="p-3 text-[#71805a]">📍 {item.storageLocation || 'Store'}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => openEditModal(item)}
                            className="px-3 py-1 bg-[#5c6e46] text-white font-bold text-xs rounded hover:bg-[#475735]"
                          >
                            Restock
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

        {/* TAB 5: STUDENT ACCESS CONTROL */}
        {activeTab === 'access' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-[#1a1d16] border border-[#cfd8bd] dark:border-[#414a33] rounded p-4 space-y-3">
              <h3 className="text-base font-black text-[#37412a] dark:text-[#e4e9d8] flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#5c6e46]" /> Student Access & Safety Control
              </h3>
              <p className="text-xs font-semibold text-[#71805a]">
                Block or restore borrowing privileges for students who spam chemical requisitions or break safety guidelines.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {students.map((student) => (
                <div key={student.id || student._id} className="bg-white dark:bg-[#1a1d16] border border-[#cfd8bd] dark:border-[#414a33] p-3.5 rounded space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-[#37412a] dark:text-[#e4e9d8]">{student.name}</h4>
                      <p className="text-[11px] text-[#71805a]">{student.email}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      student.isBlocked ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {student.isBlocked ? 'Blocked' : 'Active'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleToggleStudentBlock(student)}
                    disabled={blockingUserId === (student.id || student._id)}
                    className={`w-full py-1.5 text-xs font-bold rounded transition-all flex items-center justify-center gap-1 ${
                      student.isBlocked 
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                        : 'bg-rose-600 hover:bg-rose-700 text-white'
                    }`}
                  >
                    {student.isBlocked ? <UserCheck size={14} /> : <UserX size={14} />}
                    <span>{blockingUserId === (student.id || student._id) ? 'Updating...' : student.isBlocked ? 'Unblock Student' : 'Block Student'}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* CREATE ITEM MODAL */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add Store SKU Item">
        <div className="space-y-4 text-xs font-bold">
          <Input label="Item Code *" value={newItem.itemCode} onChange={(e) => setNewItem((state) => ({ ...state, itemCode: e.target.value.toUpperCase() }))} placeholder="e.g. CHEM-001" />
          {newItem.itemCode.trim() && duplicateCodeExists ? <p className="text-xs text-rose-600">This SKU item code is already listed.</p> : null}
          <Input label="Item Name *" value={newItem.itemName} onChange={(e) => setNewItem((state) => ({ ...state, itemName: e.target.value }))} placeholder="e.g. Silver Nitrate IP" />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-black text-[#5c6e46]">
              Category
              <select
                value={newItem.category}
                onChange={(e) => setNewItem((state) => applyCategoryRules({ ...state, category: e.target.value }))}
                className="w-full mt-1 p-2 rounded border border-[#cfd8bd] bg-white dark:bg-[#20251a]"
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </label>
            <Input label="Sub Category" value={newItem.subCategory} onChange={(e) => setNewItem((state) => ({ ...state, subCategory: e.target.value }))} placeholder="e.g. Reagents / Solvents" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Quantity *" type="number" value={newItem.quantity} onChange={(e) => setNewItem((state) => ({ ...state, quantity: e.target.value }))} placeholder="500" />
            {newItem.category === 'Chemical' ? (
              <label className="block text-xs font-black text-[#5c6e46]">
                Quantity Unit
                <select
                  value={newItem.quantityUnit}
                  onChange={(e) => setNewItem((state) => ({ ...state, quantityUnit: e.target.value }))}
                  className="w-full mt-1 p-2 rounded border border-[#cfd8bd] bg-white dark:bg-[#20251a]"
                >
                  {CHEMICAL_UNITS.map((unit) => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </label>
            ) : (
              <Input label="Quantity Unit" value="pieces" readOnly className="bg-[#f4f6ee]" />
            )}
          </div>
          <Input label="Storage Location" value={newItem.storageLocation} onChange={(e) => setNewItem((state) => ({ ...state, storageLocation: e.target.value }))} placeholder="e.g. Cabinet B-1" />
          <Button className="w-full bg-[#5c6e46] text-white font-black" onClick={saveNewItem} disabled={saving || duplicateCodeExists}>
            {saving ? 'Saving...' : 'Save Store SKU'}
          </Button>
        </div>
      </Modal>

      {/* EDIT ITEM MODAL */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Store SKU Item">
        <div className="space-y-4 text-xs font-bold">
          <Input label="Item Code" value={editItem.itemCode} onChange={(e) => setEditItem((state) => ({ ...state, itemCode: e.target.value.toUpperCase() }))} />
          <Input label="Item Name" value={editItem.itemName} onChange={(e) => setEditItem((state) => ({ ...state, itemName: e.target.value }))} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Quantity" type="number" value={editItem.quantity} onChange={(e) => setEditItem((state) => ({ ...state, quantity: e.target.value }))} />
            <Input label="Storage Location" value={editItem.storageLocation} onChange={(e) => setEditItem((state) => ({ ...state, storageLocation: e.target.value }))} />
          </div>
          <Button className="w-full bg-[#5c6e46] text-white font-black" onClick={saveEditedItem} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </Modal>

      {/* DELETE MODAL */}
      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Delete Store Item">
        <div className="space-y-4 text-xs font-bold">
          <p>Delete <span className="font-black">{deleteTarget?.itemName}</span> from the central store?</p>
          <div className="flex gap-3">
            <Button variant="outline" className="w-full" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button className="w-full bg-rose-600 text-white font-black" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* IMPORT MODAL */}
      <ImportModal 
        open={importOpen} 
        onClose={() => setImportOpen(false)} 
        onImportSuccess={fetchStoreItems} 
      />

      {/* CHEMICAL INTAKE WIZARD MODAL */}
      <ChemicalIntakeModal
        open={intakeOpen}
        onClose={() => setIntakeOpen(false)}
        onSuccess={fetchStoreItems}
        isStoreAdmin={true}
      />
    </div>
  );
}
