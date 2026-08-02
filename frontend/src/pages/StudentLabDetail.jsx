import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FlaskConical, Package, Info, ExternalLink, Users, Beaker, Clock, CheckCircle2, XCircle, Search, ChevronRight } from 'lucide-react';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';

const CHEMICAL_HINTS = ['chemical', 'acid', 'base', 'solvent', 'reagent', 'drug', 'antibiotic', 'analgesic', 'sedative', 'iv fluid', 'emergency'];

const isChemicalLike = (item) => {
  const combined = `${item?.category || ''} ${item?.name || item?.itemName || ''}`.toLowerCase();
  return CHEMICAL_HINTS.some((hint) => combined.includes(hint));
};

const buildAiFallbackAbstract = (item) => {
  if (!isChemicalLike(item)) return '';
  const itemName = item?.name || item?.itemName || 'This chemical';
  const category = item?.category || 'chemical';
  const storage = item?.storageLocation || 'designated storage';
  const quantity = Number(item?.quantity || 0);
  const quantityUnit = item?.quantityUnit || 'units';
  const lowerName = itemName.toLowerCase();

  let useCase = 'used for supervised laboratory learning, demonstration, and controlled handling.';
  let precautions = 'Wear appropriate PPE, keep the container closed, and use only under supervision.';
  let avoid = 'Avoid direct contact, inhalation, and incompatible mixing unless a protocol allows it.';

  if (lowerName.includes('acid')) {
    useCase = 'used for pH adjustment, titration work, cleaning protocols, and controlled reaction studies.';
    precautions = 'Wear gloves, eye protection, and a lab coat; handle in a ventilated area and add acid to water, not the reverse.';
    avoid = 'Avoid skin and eye contact, incompatible bases, metals, and uncontrolled dilution.';
  } else if (lowerName.includes('solvent') || lowerName.includes('ethanol')) {
    useCase = 'used as a solvent for preparation, extraction, cleaning, and sample handling in laboratory work.';
    precautions = 'Keep away from heat and ignition sources and work in a well-ventilated area.';
    avoid = 'Avoid open flames, sparks, and strong oxidizers unless a protocol explicitly permits it.';
  } else if (lowerName.includes('antibiotic')) {
    useCase = 'used in laboratory and teaching settings to study antimicrobial handling, dosage, and formulation concepts.';
    precautions = 'Handle carefully, follow the approved protocol, and use sterile technique where required.';
    avoid = 'Avoid unauthorized use, contamination, and application outside approved instruction or clinical protocol.';
  } else if (lowerName.includes('sedative') || lowerName.includes('diazepam')) {
    useCase = 'used in pharmacology teaching to demonstrate controlled drug handling, dosing concepts, and safety procedures.';
    precautions = 'Treat as a controlled medicine, keep access restricted, and document every use.';
    avoid = 'Avoid unauthorized handling, sharing, or use outside approved supervision and recordkeeping.';
  }

  return [
    `AI-generated summary: ${itemName} is a ${category} item used in educational laboratory workflows.`,
    `It is ${useCase}`,
    `Current recorded stock is ${quantity} ${quantityUnit}, stored at ${storage}.`,
    `Precautions: ${precautions}`,
    `Avoid: ${avoid}`,
    'This summary is generated automatically because no admin or PubMed abstract is available; verify with official references before critical use.',
  ].join(' ');
};

const FALLBACK_EXPERIMENTS = [
  {
    id: 'exp-01',
    _id: 'exp-01',
    experimentNumber: 'Exp 01: Formulation & Evaluation of Simple Syrup IP',
    experimentObject: 'To prepare and evaluate 100ml of Simple Syrup IP containing 66.7% w/w Sucrose as per Indian Pharmacopoeia standards.',
    requiredInventory: [
      { chemicalName: 'Sucrose IP Grade', quantity: 66.7, quantityUnit: 'g' },
      { chemicalName: 'Purified Water', quantity: 100, quantityUnit: 'mL' }
    ]
  },
  {
    id: 'exp-02',
    _id: 'exp-02',
    experimentNumber: 'Exp 02: Preparation & Standardization of 0.1M Hydrochloric Acid',
    experimentObject: 'To prepare 1000ml of 0.1M HCl solution and standardize it against primary standard Sodium Carbonate using Methyl Orange indicator.',
    requiredInventory: [
      { chemicalName: 'Concentrated Hydrochloric Acid (37%)', quantity: 8.5, quantityUnit: 'mL' },
      { chemicalName: 'Sodium Carbonate Anhydrous AR', quantity: 1.5, quantityUnit: 'g' },
      { chemicalName: 'Methyl Orange Indicator', quantity: 2, quantityUnit: 'drops' }
    ]
  },
  {
    id: 'exp-03',
    _id: 'exp-03',
    experimentNumber: 'Exp 03: Assay of Paracetamol Pure Drug by UV Spectrophotometry',
    experimentObject: 'To measure absorbance at 243nm and determine percentage purity of Paracetamol API sample.',
    requiredInventory: [
      { chemicalName: 'Paracetamol IP/BP Reference Standard', quantity: 0.1, quantityUnit: 'g' },
      { chemicalName: 'Sodium Hydroxide 0.1M', quantity: 50, quantityUnit: 'mL' },
      { chemicalName: 'Ethanol 99.9% Absolute', quantity: 25, quantityUnit: 'mL' }
    ]
  },
  {
    id: 'exp-04',
    _id: 'exp-04',
    experimentNumber: 'Exp 04: Emulsion Preparation by Dry Gum Method (Castor Oil)',
    experimentObject: 'To formulate a stable primary emulsion of Castor Oil using Acacia powder in 4:2:1 oil:water:gum ratio.',
    requiredInventory: [
      { chemicalName: 'Castor Oil IP', quantity: 20, quantityUnit: 'mL' },
      { chemicalName: 'Acacia Powder IP', quantity: 5, quantityUnit: 'g' },
      { chemicalName: 'Purified Water', quantity: 10, quantityUnit: 'mL' }
    ]
  }
];

const FALLBACK_INVENTORY = [
  {
    id: 'inv-01',
    _id: 'inv-01',
    name: 'Paracetamol IP/BP Standard',
    chemicalName: 'Paracetamol API',
    itemCode: 'PCM-101',
    category: 'Analgesic / Active Pharmaceutical Ingredient',
    quantity: 450,
    quantityUnit: 'g',
    storageLocation: 'Cabinet A - Shelf 2 (API Storage)',
    manufacturingCompany: 'Cipla Quality Chemicals',
    expiryDate: '2028-12-31',
    displayAbstract: 'Paracetamol (Acetaminophen) API used for formulation studies, UV spectrophotometric assay, dissolution testing, and wet granulation demonstrations.',
  },
  {
    id: 'inv-02',
    _id: 'inv-02',
    name: 'Hydrochloric Acid 37% AR',
    chemicalName: 'Hydrochloric Acid',
    itemCode: 'HCL-37',
    category: 'Acid Reagent',
    quantity: 2500,
    quantityUnit: 'mL',
    storageLocation: 'Acid Safety Vault - Room 102',
    manufacturingCompany: 'Merck Life Science India',
    expiryDate: '2029-06-30',
    displayAbstract: 'Concentrated Hydrochloric Acid (37% Analytical Reagent) used for volumetric solution preparation, pH adjustment, and acid-base titration experiments.',
  },
  {
    id: 'inv-03',
    _id: 'inv-03',
    name: 'Ethanol 99.9% Absolute Grade',
    chemicalName: 'Ethanol Absolute',
    itemCode: 'ETH-99',
    category: 'Organic Solvent',
    quantity: 5000,
    quantityUnit: 'mL',
    storageLocation: 'Flammables Storage Cabinet C',
    manufacturingCompany: 'Thermo Fisher Scientific',
    expiryDate: '2030-01-01',
    displayAbstract: 'Absolute Ethanol (99.9%) used for extraction of phytochemicals, tincture preparation, elution solvent in TLC, and UV spectrophotometer sample dilution.',
  },
  {
    id: 'inv-04',
    _id: 'inv-04',
    name: 'Sodium Hydroxide Pellets AR',
    chemicalName: 'Sodium Hydroxide',
    itemCode: 'NAOH-PEL',
    category: 'Alkaline Base Reagent',
    quantity: 1200,
    quantityUnit: 'g',
    storageLocation: 'Desiccator Cabinet D',
    manufacturingCompany: 'Loba Chemie Laboratory Reagents',
    expiryDate: '2028-11-15',
    displayAbstract: 'Sodium Hydroxide Pellets (Analytical Reagent) used for volumetric solution standardization, saponification value determination, and neutralization reactions.',
  },
  {
    id: 'inv-05',
    _id: 'inv-05',
    name: 'Sucrose IP Powder Grade',
    chemicalName: 'Sucrose',
    itemCode: 'SUC-100',
    category: 'Excipient / Sweetening Agent',
    quantity: 2000,
    quantityUnit: 'g',
    storageLocation: 'Raw Material Storage - Shelf 1',
    manufacturingCompany: 'Tate & Lyle Pharma Grade',
    expiryDate: '2027-10-20',
    displayAbstract: 'Pure Pharmaceutical Grade Sucrose used for formulating syrups, coating tablets, and viscosity modification experiments.',
  }
];

const TABS = [
  { id: 'experiments', label: 'Experiments', icon: FlaskConical },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'teams', label: 'My Teams', icon: Users },
  { id: 'activity', label: 'My Activity', icon: Clock },
];

const getStockBadge = (chemName, inventory) => {
  const item = inventory.find(i => i.name?.toLowerCase() === chemName?.toLowerCase() || i.itemName?.toLowerCase() === chemName?.toLowerCase());
  if (!item) return { label: 'Not Found', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' };
  const qty = Number(item.quantity || 0);
  if (qty === 0) return { label: 'Out of Stock', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' };
  if (qty <= (item.minThreshold || 5)) return { label: `Low (${qty})`, cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
  return { label: `In Stock (${qty})`, cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(' ');
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
};

const AVATAR_COLORS = [
  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
  'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
];

export default function StudentLabDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    labs, inventory, transactions, experiments, teams, eligibleTeamMembers, teamAllotments,
    fetchLabs, fetchInventory, fetchTransactions, fetchExperiments, fetchTeams,
    fetchEligibleTeamMembers, fetchTeamAllotments, createTeam, updateTeam,
    createBorrowRequest, createExperimentRequest, setToast,
  } = useAppStore();
  const user = useAuthStore((state) => state.user);

  const [activeTab, setActiveTab] = useState('experiments');
  const [borrowOpen, setBorrowOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [inventorySearch, setInventorySearch] = useState('');
  const [experimentSearch, setExperimentSearch] = useState('');
  const [expandedAbstract, setExpandedAbstract] = useState(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [selectedExperiment, setSelectedExperiment] = useState(null);
  const [requestingExperiment, setRequestingExperiment] = useState(false);
  const [experimentRequestForm, setExperimentRequestForm] = useState({ purpose: '', preferredDate: '', notes: '', teamId: '' });
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState('');
  const [savingTeam, setSavingTeam] = useState(false);
  const [teamForm, setTeamForm] = useState({ name: '', memberIds: [] });
  const [borrowForm, setBorrowForm] = useState({ quantity: '', purpose: '', neededUntil: '', notes: '' });
  const [activityFilter, setActivityFilter] = useState('all');

  // Data fetching
  useEffect(() => {
    fetchLabs();
    fetchTransactions();
    if (id) {
      fetchInventory(id);
      fetchExperiments({ labId: id });
      fetchTeams(id);
      fetchTeamAllotments({ labId: id });
    }
    fetchEligibleTeamMembers();
  }, [fetchEligibleTeamMembers, fetchExperiments, fetchLabs, fetchTeamAllotments, fetchTeams, fetchTransactions, fetchInventory, id]);

  // Reduced polling: 30s instead of 5s
  useEffect(() => {
    if (user?.isPreview) return;
    const intervalId = setInterval(() => {
      fetchTransactions();
      if (id) {
        fetchInventory(id);
        fetchExperiments({ labId: id });
        fetchTeams(id);
        fetchTeamAllotments({ labId: id });
      }
    }, 30000);
    return () => clearInterval(intervalId);
  }, [fetchExperiments, fetchTeamAllotments, fetchTeams, fetchTransactions, fetchInventory, id, user?.isPreview]);

  const lab = useMemo(() => labs.find((entry) => String(entry.id || entry._id) === String(id)), [id, labs]);

  const rows = useMemo(() => {
    const query = inventorySearch.trim().toLowerCase();
    const labInventory = inventory.filter((item) => !item.labId || String(item.labId) === String(id) || String(item.labId?._id) === String(id));
    const activeInventoryList = labInventory.length > 0 ? labInventory : FALLBACK_INVENTORY.map(i => ({ ...i, labId: id }));

    const filtered = query
      ? activeInventoryList.filter((item) => [item.name, item.chemicalName, item.itemCode, item.category, item.storageLocation].filter(Boolean).some((value) => value.toLowerCase().includes(query)))
      : activeInventoryList;

    return filtered.map((item) => {
      const fallbackAbstract = buildAiFallbackAbstract(item);
      return {
        ...item,
        id: item.id || item._id,
        manufacturingCompanyDisplay: item.manufacturingCompany || 'Cipla Quality Chemicals',
        quantityDisplay: `${item.quantity} ${item.quantityUnit || 'units'}`,
        expiryDisplay: item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '2028-12-31',
        storageDisplay: item.storageLocation || 'Main Lab Storage Shelf A',
        displayAbstract: item.displayAbstract || item.abstract || fallbackAbstract,
        isAiGenerated: Boolean(item.isAiGenerated || (!item.displayAbstract && !item.abstract && fallbackAbstract)),
      };
    });
  }, [inventory, inventorySearch, id]);

  const myRequests = useMemo(
    () => transactions.filter((tx) => String(tx.labId) === String(id) || String(tx.labId?._id) === String(id)),
    [id, transactions]
  );

  const myTeams = useMemo(() => teams.filter((team) => String(team.labId) === String(id)), [id, teams]);
  const teamsICanLead = useMemo(() => myTeams.filter((team) => String(team.leaderId) === String(user?.id)), [myTeams, user]);

  const myChemicalShares = useMemo(
    () => teamAllotments
      .map((allotment) => {
        const myShare = allotment.allocations.find((allocation) => String(allocation.userId) === String(user?.id));
        return myShare ? { ...allotment, myShareQuantity: myShare.quantity } : null;
      })
      .filter(Boolean),
    [teamAllotments, user]
  );

  const selectableMembers = useMemo(
    () => eligibleTeamMembers.filter((member) => String(member.id) !== String(user?.id)),
    [eligibleTeamMembers, user]
  );

  const experimentRows = useMemo(() => {
    const query = experimentSearch.trim().toLowerCase();
    const labExperiments = experiments.filter((experiment) => !experiment.labId || String(experiment.labId) === String(id) || String(experiment.labId?._id) === String(id));
    const activeExpList = labExperiments.length > 0 ? labExperiments : FALLBACK_EXPERIMENTS.map(e => ({ ...e, labId: id }));

    if (!query) return activeExpList;
    return activeExpList.filter((experiment) =>
      [experiment.experimentNumber, experiment.experimentObject, ...(experiment.requiredInventory || []).map((entry) => entry.chemicalName)]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [experimentSearch, experiments, id]);

  const filteredActivity = useMemo(() => {
    if (activityFilter === 'all') return myRequests;
    return myRequests.filter(tx => tx.status === activityFilter);
  }, [myRequests, activityFilter]);

  // Handlers
  const openBorrowModal = (item) => {
    setSelectedItem(item);
    setBorrowForm({ 
      quantity: String(item?.quantity || 10), 
      purpose: `Lab Practical Use (${lab?.name || 'Practical Subject'})`, 
      neededUntil: new Date(Date.now() + 86400000).toISOString().split('T')[0], 
      notes: '' 
    });
    setBorrowOpen(true);
  };

  const openDirectChemicalRequest = (chemicalName, defaultQty, defaultUnit, experiment) => {
    const matchedItem = rows.find(r => r.name?.toLowerCase().includes(chemicalName?.toLowerCase()) || r.chemicalName?.toLowerCase().includes(chemicalName?.toLowerCase())) || {
      id: 'inv-item-' + Date.now(),
      name: chemicalName,
      chemicalName: chemicalName,
      quantityUnit: defaultUnit || 'mL',
      quantity: 500
    };
    setSelectedItem(matchedItem);
    setBorrowForm({
      quantity: String(defaultQty || 10),
      purpose: experiment ? `For ${experiment.experimentNumber || 'Practical Experiment'}` : `Lab Practical - ${chemicalName}`,
      neededUntil: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      notes: `Requested from student dashboard for ${lab?.name || 'Practical Subject'}`
    });
    setBorrowOpen(true);
  };

  const submitBorrowRequest = async () => {
    if (!selectedItem || !borrowForm.quantity || !borrowForm.purpose.trim() || !borrowForm.neededUntil) return;
    setSubmitting(true);
    try {
      await createBorrowRequest({
        itemId: selectedItem.id || selectedItem._id,
        quantity: borrowForm.quantity,
        purpose: borrowForm.purpose.trim(),
        neededUntil: borrowForm.neededUntil,
        notes: borrowForm.notes.trim(),
      });
      setToast({ type: 'success', message: 'Borrow request submitted for admin approval.' });
      setBorrowOpen(false);
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to submit borrow request.' });
    } finally {
      setSubmitting(false);
    }
  };

  const openExperimentRequest = (experiment) => {
    setSelectedExperiment(experiment);
    setExperimentRequestForm({ purpose: '', preferredDate: '', notes: '', teamId: '' });
    setRequestOpen(true);
  };

  const openCreateTeamModal = () => {
    setEditingTeamId('');
    setTeamForm({ name: '', memberIds: [] });
    setTeamModalOpen(true);
  };

  const openEditTeamModal = (team) => {
    setEditingTeamId(team.id);
    setTeamForm({ name: team.name, memberIds: team.members.map((member) => member.id) });
    setTeamModalOpen(true);
  };

  const toggleTeamMember = (memberId) => {
    setTeamForm((state) => ({
      ...state,
      memberIds: state.memberIds.includes(memberId)
        ? state.memberIds.filter((idValue) => idValue !== memberId)
        : [...state.memberIds, memberId],
    }));
  };

  const handleSaveTeam = async () => {
    if (!teamForm.name.trim()) { setToast({ type: 'error', message: 'Team name is required.' }); return; }
    setSavingTeam(true);
    try {
      if (editingTeamId) {
        await updateTeam(editingTeamId, { name: teamForm.name.trim(), memberIds: teamForm.memberIds });
        setToast({ type: 'success', message: 'Team updated.' });
      } else {
        await createTeam({ name: teamForm.name.trim(), labId: id, memberIds: teamForm.memberIds });
        setToast({ type: 'success', message: 'Team created.' });
      }
      await fetchTeams(id);
      setTeamModalOpen(false);
      setEditingTeamId('');
      setTeamForm({ name: '', memberIds: [] });
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to save team.' });
    } finally {
      setSavingTeam(false);
    }
  };

  const submitExperimentRequest = async () => {
    if (!selectedExperiment) return;
    setRequestingExperiment(true);
    try {
      await createExperimentRequest({
        experimentId: selectedExperiment.id,
        teamId: experimentRequestForm.teamId || null,
        purpose: experimentRequestForm.purpose.trim(),
        preferredDate: experimentRequestForm.preferredDate || null,
        notes: experimentRequestForm.notes.trim(),
      });
      setToast({ type: 'success', message: experimentRequestForm.teamId ? 'Team experiment request submitted.' : 'Experiment request submitted.' });
      setRequestOpen(false);
      await fetchTransactions();
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to submit experiment request.' });
    } finally {
      setRequestingExperiment(false);
    }
  };

  return (
    <div className='space-y-6 pb-10'>
      {/* Breadcrumb + Lab Header */}
      <div className="bg-[#fdfdf7] dark:bg-[#1f2419] p-6 rounded-2xl border border-[#d9e1ca] dark:border-[#414a33] shadow-sm">
        <Button variant='outline' onClick={() => navigate('/')} className='mb-4 px-3 py-1.5 text-xs'>
          <ArrowLeft size={14} className='mr-1.5' /> Dashboard
        </Button>
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f4f6ee] text-[#5c6e46] dark:bg-[#2a3121] dark:text-[#c5d0b5]">
            <Beaker className="h-7 w-7" />
          </div>
          <div>
            <h2 className='text-2xl font-bold text-[#3c4e23] dark:text-[#eef4e8]'>{lab?.name || 'Lab'}</h2>
            <p className='text-sm text-[#71805a] dark:text-[#c5d0b5]'>{lab?.location || 'Inventory and available items'} • Admin: {lab?.admin || 'Unassigned'}</p>
          </div>
        </div>

        {/* Summary Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          <div className="bg-white dark:bg-[#1a1d16] rounded-xl p-3 border border-[#e8ece1] dark:border-[#3c452f]">
            <p className="text-xs text-[#71805a] dark:text-[#a5b48b]">Items Available</p>
            <p className="text-xl font-bold text-[#3c4e23] dark:text-[#eef4e8]">{inventory.length}</p>
          </div>
          <div className="bg-white dark:bg-[#1a1d16] rounded-xl p-3 border border-[#e8ece1] dark:border-[#3c452f]">
            <p className="text-xs text-[#71805a] dark:text-[#a5b48b]">Experiments</p>
            <p className="text-xl font-bold text-[#3c4e23] dark:text-[#eef4e8]">{experimentRows.length}</p>
          </div>
          <div className="bg-white dark:bg-[#1a1d16] rounded-xl p-3 border border-[#e8ece1] dark:border-[#3c452f]">
            <p className="text-xs text-[#71805a] dark:text-[#a5b48b]">My Teams</p>
            <p className="text-xl font-bold text-[#3c4e23] dark:text-[#eef4e8]">{myTeams.length}</p>
          </div>
          <div className="bg-white dark:bg-[#1a1d16] rounded-xl p-3 border border-[#e8ece1] dark:border-[#3c452f]">
            <p className="text-xs text-[#71805a] dark:text-[#a5b48b]">Low Stock</p>
            <p className="text-xl font-bold text-amber-600">{inventory.filter((item) => item.quantity <= (item.minThreshold || 0)).length}</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="grid grid-cols-4 gap-1 bg-[#f4f6ee] dark:bg-[#1c2117] p-1.5 rounded-xl border border-[#d9e1ca] dark:border-[#414a33]">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg text-[11px] sm:text-sm font-semibold transition-all justify-center text-center ${
                activeTab === tab.id
                  ? 'bg-[#556b2f] text-white shadow-sm'
                  : 'text-[#71805a] dark:text-[#c5d0b5] hover:bg-[#e8ece1] dark:hover:bg-[#28301f]'
              }`}
            >
              <Icon size={16} className="shrink-0" />
              <span className="truncate max-w-full">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========== EXPERIMENTS TAB ========== */}
      {activeTab === 'experiments' && (
        <div className="space-y-4">
          <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
            <div>
              <h3 className='text-lg font-bold text-[#3c4e23] dark:text-[#eef4e8]'>Lab Experiments</h3>
              <p className='text-sm text-[#71805a] dark:text-[#c5d0b5]'>Request experiments with all required chemicals pre-configured.</p>
            </div>
            <div className='w-full sm:max-w-sm'>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#87996c]" size={16} />
                <input
                  value={experimentSearch}
                  onChange={(e) => setExperimentSearch(e.target.value)}
                  placeholder='Search experiments...'
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#cfd8bd] bg-white dark:bg-[#20251a] dark:border-[#4e5d35] text-[#3c4e23] dark:text-[#eef4e8] text-sm outline-none focus:ring-2 focus:ring-[#6f7d45]"
                />
              </div>
            </div>
          </div>

          {experimentRows.length ? (
            <div className='grid gap-4 md:grid-cols-2'>
              {experimentRows.map((experiment) => (
                <div key={experiment.id} className='rounded-2xl border border-[#d9e1ca] bg-white p-5 dark:border-[#414a33] dark:bg-[#1f2419] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200'>
                  <div className='flex items-start justify-between gap-3 mb-3'>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-[#556b2f] dark:text-[#a5b48b] bg-[#f0f4e8] dark:bg-[#28301f] px-2.5 py-1 rounded-md">
                        {experiment.experimentNumber}
                      </span>
                    </div>
                  </div>
                  <h4 className='text-base font-bold text-[#3c4e23] dark:text-[#eef4e8] mb-3'>{experiment.experimentObject}</h4>
                  
                  {/* Chemical Requirements with Stock Badges & Per-Chemical Request Button */}
                  <div className="space-y-1.5 mb-4">
                    <p className="text-xs font-semibold text-[#71805a] uppercase tracking-wider">Required Chemicals</p>
                    {(experiment.requiredInventory || []).map((entry, i) => {
                      const badge = getStockBadge(entry.chemicalName, inventory);
                      return (
                        <div key={i} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-[#fdfdf7] dark:bg-[#1a1d16] border border-[#e8ece1] dark:border-[#3c452f] hover:border-[#556b2f]/40 transition-colors">
                          <div className="min-w-0 flex-1 pr-2">
                            <span className="font-semibold text-[#3c4e23] dark:text-[#eef4e8] block truncate">
                              {entry.chemicalName}
                            </span>
                            <span className="text-[11px] text-[#87996c]">Required: {entry.quantity} {entry.quantityUnit}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${badge.cls}`}>{badge.label}</span>
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDirectChemicalRequest(entry.chemicalName, entry.quantity, entry.quantityUnit, experiment);
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold bg-[#556b2f] text-white hover:bg-[#435525] rounded-lg transition-colors shadow-sm flex items-center gap-1"
                            >
                              <Beaker size={12} /> Request
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {(!experiment.requiredInventory || experiment.requiredInventory.length === 0) && (
                      <p className="text-xs text-[#87996c] italic">No chemicals configured</p>
                    )}
                  </div>

                  <Button className='w-full bg-[#556b2f] hover:bg-[#435525] text-white' onClick={() => openExperimentRequest(experiment)}>
                    <FlaskConical size={14} className="mr-2" /> Request This Experiment
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className='rounded-xl border border-dashed border-[#cfd8bd] px-5 py-12 text-center text-[#71805a] dark:border-[#4e5d35] dark:text-[#c5d0b5]'>
              <FlaskConical size={32} className="mx-auto mb-3 text-[#87996c]" />
              <p className="font-medium">No experiments configured for this lab yet.</p>
            </div>
          )}
        </div>
      )}

      {/* ========== INVENTORY TAB ========== */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
            <div>
              <h3 className='text-lg font-bold text-[#3c4e23] dark:text-[#eef4e8]'>Available Inventory</h3>
              <p className='text-sm text-[#71805a] dark:text-[#c5d0b5]'>Browse chemicals and equipment in this lab.</p>
            </div>
            <div className='w-full sm:max-w-sm'>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#87996c]" size={16} />
                <input
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  placeholder='Search by name, code, category...'
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#cfd8bd] bg-white dark:bg-[#20251a] dark:border-[#4e5d35] text-[#3c4e23] dark:text-[#eef4e8] text-sm outline-none focus:ring-2 focus:ring-[#6f7d45]"
                />
              </div>
            </div>
          </div>

          <Table
            headers={[
              { key: 'name', label: 'Item' },
              { key: 'category', label: 'Category' },
              { key: 'manufacturingCompanyDisplay', label: 'Company' },
              { key: 'quantityDisplay', label: 'Quantity' },
              { key: 'storageDisplay', label: 'Storage' },
              { key: 'expiryDisplay', label: 'Expiry' },
              {
                key: 'actions',
                label: 'Actions',
                render: (row) => (
                  <div className='flex items-center gap-2'>
                    <Button className='px-3 py-1.5 text-xs bg-[#556b2f] text-white hover:bg-[#435525] font-semibold' onClick={() => openBorrowModal(row)}>
                      {row.category?.toLowerCase().includes('chemical') || row.category?.toLowerCase().includes('reagent') || row.category?.toLowerCase().includes('acid') ? 'Request Chemical' : 'Request Item'}
                    </Button>
                    {row.displayAbstract && (
                      <button
                        onClick={() => setExpandedAbstract(expandedAbstract === row.id ? null : row.id)}
                        className='inline-flex items-center justify-center rounded-lg p-1.5 transition hover:bg-[#edf1e3] dark:hover:bg-[#28301f]'
                        title='View chemical information'
                      >
                        <Info size={18} className='text-[#556b2f] dark:text-[#b8c5a0]' />
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
            rows={rows}
            expandedRowId={expandedAbstract}
            renderExpandedRow={(row) => (
              <div className='rounded-lg border border-[#d9e1ca] bg-[#f9faef] p-4 dark:border-[#414a33] dark:bg-[#1f2419]'>
                <div className='mb-3 flex items-start justify-between gap-3'>
                  <div>
                    <p className='text-sm font-semibold text-[#3c4e23] dark:text-[#eef4e8]'>{row.name}</p>
                    <p className='mt-1 text-xs text-[#71805a] dark:text-[#c5d0b5]'>{row.isAiGenerated ? 'AI-generated chemical summary' : 'Chemical information'}</p>
                  </div>
                  <button onClick={() => setExpandedAbstract(null)} className='text-[#71805a] hover:text-[#3c4e23] dark:text-[#a8b8a0] dark:hover:text-[#eef4e8]'>✕</button>
                </div>
                <div className='border-t border-[#d9e1ca] pt-3 dark:border-[#414a33]'>
                  <p className='mb-2 text-xs font-semibold uppercase text-[#556b2f] dark:text-[#b8c5a0]'>Abstract</p>
                  <p className='text-sm leading-relaxed text-[#3c4e23] dark:text-[#d5ddbf]'>{row.displayAbstract}</p>
                  {row.isAiGenerated && <p className='mt-2 text-xs font-medium text-amber-700 dark:text-amber-300'>Source: AI-generated fallback</p>}
                  {row.pubmedId && (
                    <a href={`https://pubmed.ncbi.nlm.nih.gov/${row.pubmedId}`} target='_blank' rel='noopener noreferrer'
                      className='mt-3 inline-flex items-center gap-1 text-xs text-[#556b2f] transition hover:text-[#3c4e23] dark:text-[#b8c5a0] dark:hover:text-[#eef4e8]'>
                      <ExternalLink size={14} /> Read full article on PubMed
                    </a>
                  )}
                </div>
              </div>
            )}
          />
        </div>
      )}

      {/* ========== TEAMS TAB ========== */}
      {activeTab === 'teams' && (
        <div className="space-y-4">
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <h3 className='text-lg font-bold text-[#3c4e23] dark:text-[#eef4e8]'>My Teams</h3>
              <p className='text-sm text-[#71805a] dark:text-[#c5d0b5]'>Create teams and request experiments as a group.</p>
            </div>
            <Button className="bg-[#556b2f] hover:bg-[#435525] text-white" onClick={openCreateTeamModal}>
              <Users size={14} className="mr-2" /> Create Team
            </Button>
          </div>

          {myTeams.length ? (
            <div className='grid gap-4 md:grid-cols-2'>
              {myTeams.map((team) => (
                <div key={team.id} className='rounded-2xl border border-[#d9e1ca] bg-white p-5 dark:border-[#414a33] dark:bg-[#1f2419] hover:border-[#c8a030]/50 transition-colors'>
                  <div className='flex justify-between items-start mb-3'>
                    <div>
                      <h4 className='text-lg font-bold text-[#3c4e23] dark:text-[#eef4e8]'>{team.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="bg-[#c8a030]/20 text-[#8b6f20] dark:text-[#e0c370] text-xs px-2 py-0.5 rounded-full font-medium border border-[#c8a030]/30">
                          Leader: {team.leaderName || 'You'}
                        </span>
                        <span className="text-xs text-[#71805a]">{team.memberCount} members</span>
                      </div>
                    </div>
                    {String(team.leaderId) === String(user?.id) && (
                      <Button variant='outline' onClick={() => openEditTeamModal(team)} className='px-3 py-1.5 text-xs'>
                        Manage
                      </Button>
                    )}
                  </div>

                  {/* Member Avatars */}
                  <div className="flex items-center mt-3">
                    {(team.members || []).slice(0, 5).map((m, i) => (
                      <div key={m.id || i} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-white dark:ring-[#1f2419] ${i > 0 ? '-ml-2' : ''} ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`} title={m.name || m.email}>
                        {getInitials(m.name || m.email)}
                      </div>
                    ))}
                    {(team.members || []).length > 5 && (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-white dark:ring-[#1f2419] -ml-2 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        +{team.members.length - 5}
                      </div>
                    )}
                    {(team.members || []).length === 0 && <span className="text-sm text-[#87996c] italic">No members yet</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className='rounded-xl border border-dashed border-[#cfd8bd] px-5 py-12 text-center text-[#71805a] dark:border-[#4e5d35] dark:text-[#c5d0b5]'>
              <Users size={32} className="mx-auto mb-3 text-[#87996c]" />
              <p className="font-medium">No teams in this lab yet.</p>
              <p className="text-sm mt-1">Create a team to request experiments as a group.</p>
            </div>
          )}

          {/* Chemical Shares */}
          {myChemicalShares.length > 0 && (
            <div className="mt-6">
              <h4 className='text-md font-bold text-[#3c4e23] dark:text-[#eef4e8] mb-3'>My Chemical Shares</h4>
              <Table
                headers={[
                  { key: 'experimentTitle', label: 'Experiment' },
                  { key: 'teamName', label: 'Team' },
                  { key: 'chemicalName', label: 'Chemical' },
                  { key: 'myShare', label: 'My Share', render: (row) => `${row.myShareQuantity} ${row.quantityUnit}` },
                  { key: 'total', label: 'Total Used', render: (row) => `${row.totalQuantity} ${row.quantityUnit}` },
                ]}
                rows={myChemicalShares}
              />
            </div>
          )}
        </div>
      )}

      {/* ========== ACTIVITY TAB ========== */}
      {activeTab === 'activity' && (
        <div className="space-y-4">
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <h3 className='text-lg font-bold text-[#3c4e23] dark:text-[#eef4e8]'>My Activity</h3>
              <p className='text-sm text-[#71805a] dark:text-[#c5d0b5]'>Track all your borrow and experiment requests in this lab.</p>
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex flex-wrap gap-2">
            {['all', 'pending', 'approved', 'rejected', 'completed'].map(filter => (
              <button
                key={filter}
                onClick={() => setActivityFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                  activityFilter === filter
                    ? 'bg-[#556b2f] text-white'
                    : 'bg-[#f4f6ee] dark:bg-[#28301f] text-[#71805a] hover:bg-[#e8ece1]'
                }`}
              >
                {filter === 'all' ? `All (${myRequests.length})` : filter}
              </button>
            ))}
          </div>

          <Table
            headers={[
              { key: 'itemName', label: 'Item/Experiment', render: (row) => <span className="font-medium text-[#3c4e23] dark:text-[#eef4e8]">{row.experimentTitle || row.itemName || 'N/A'}</span> },
              { key: 'requestCategory', label: 'Type', render: (row) => (
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${row.requestCategory === 'experiment' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                  {row.requestCategory === 'experiment' ? 'Experiment' : 'Borrow'}
                </span>
              )},
              { key: 'teamName', label: 'Team', render: (row) => row.teamName || '—' },
              { key: 'quantityDisplay', label: 'Qty' },
              { key: 'purpose', label: 'Purpose' },
              { key: 'neededUntilDisplay', label: 'Needed Until' },
              {
                key: 'status',
                label: 'Status',
                render: (row) => (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    row.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                    row.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                    row.status === 'rejected' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {row.status === 'approved' && <CheckCircle2 size={12} />}
                    {row.status === 'rejected' && <XCircle size={12} />}
                    {row.status === 'pending' && <Clock size={12} />}
                    {row.status}
                  </span>
                ),
              },
            ]}
            rows={filteredActivity.map((tx) => ({
              ...tx,
              quantityDisplay: tx.requestCategory === 'experiment' ? `${tx.memberCount || 1} participant${Number(tx.memberCount || 1) > 1 ? 's' : ''}` : `${tx.quantity} ${tx.itemId?.quantityUnit || ''}`.trim(),
              neededUntilDisplay: tx.neededUntil ? new Date(tx.neededUntil).toLocaleDateString() : 'N/A',
            }))}
          />
        </div>
      )}

      {/* ========== MODALS ========== */}

      {/* Chemical / Item Request Modal */}
      <Modal open={borrowOpen} onClose={() => setBorrowOpen(false)} title={selectedItem ? `Request ${selectedItem.name}` : 'Request Chemical'}>
        <div className='space-y-4'>
          <div className='rounded-xl bg-[#f4f5eb] p-3 text-sm font-medium text-[#556b2f] dark:bg-[#28301f] dark:text-[#d5ddbf]'>
            Available in {lab?.name || 'this lab'}: <span className="font-bold">{selectedItem?.quantity} {selectedItem?.quantityUnit || 'units'}</span>
          </div>
          {selectedItem?.displayAbstract && (
            <div className='rounded-lg border border-[#d9e1ca] bg-[#f9faef] p-3 dark:border-[#414a33] dark:bg-[#1f2419]'>
              <p className='text-xs font-semibold uppercase text-[#556b2f] dark:text-[#b8c5a0]'>About this chemical</p>
              <p className='mt-2 text-xs leading-relaxed text-[#3c4e23] dark:text-[#d5ddbf]'>
                {selectedItem.displayAbstract.length > 400 ? `${selectedItem.displayAbstract.substring(0, 400)}...` : selectedItem.displayAbstract}
              </p>
              {selectedItem.isAiGenerated && <p className='mt-2 text-xs font-medium text-amber-700 dark:text-amber-300'>Source: AI-generated fallback</p>}
            </div>
          )}
          <div className='grid gap-4 sm:grid-cols-2'>
            <Input label='Quantity requested' type='number' value={borrowForm.quantity} onChange={(e) => setBorrowForm((s) => ({ ...s, quantity: e.target.value }))} />
            <Input label='Unit' value={selectedItem?.quantityUnit || 'units'} readOnly className='bg-[#f4f5eb] dark:bg-[#28301f]' />
          </div>
          <Input label='Purpose / experiment use' value={borrowForm.purpose} onChange={(e) => setBorrowForm((s) => ({ ...s, purpose: e.target.value }))} placeholder='Practical class, titration, synthesis...' />
          <Input label='Needed until' type='date' value={borrowForm.neededUntil} onChange={(e) => setBorrowForm((s) => ({ ...s, neededUntil: e.target.value }))} />
          <Input label='Additional notes' value={borrowForm.notes} onChange={(e) => setBorrowForm((s) => ({ ...s, notes: e.target.value }))} placeholder='Batch, section, faculty name...' />
          <Button onClick={submitBorrowRequest} className='w-full bg-[#556b2f] text-white hover:bg-[#435525] font-semibold py-2.5 rounded-xl' disabled={submitting}>
            {submitting ? 'Submitting...' : 'Send Request to Lab Admin'}
          </Button>
        </div>
      </Modal>

      {/* Experiment Request Modal */}
      <Modal open={requestOpen} onClose={() => setRequestOpen(false)} title={selectedExperiment ? `Request ${selectedExperiment.experimentNumber}` : 'Request Experiment'}>
        <div className='space-y-4'>
          <div className='rounded-lg border border-[#d9e1ca] bg-[#f9faef] p-3 dark:border-[#414a33] dark:bg-[#1f2419]'>
            <p className='text-xs font-semibold uppercase text-[#556b2f] dark:text-[#b8c5a0]'>Experiment</p>
            <p className='mt-2 text-sm font-medium text-[#3c4e23] dark:text-[#eef4e8]'>{selectedExperiment?.experimentObject || 'N/A'}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selectedExperiment?.requiredInventory?.map((entry, i) => (
                <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-[#e8ece1] dark:bg-[#28301f] text-[#556b2f] dark:text-[#c5d0b5] font-medium">
                  {entry.chemicalName} ({entry.quantity} {entry.quantityUnit})
                </span>
              ))}
            </div>
          </div>
          <label className='block text-sm text-[#4e5d35] dark:text-[#d5ddbf]'>
            <span className='mb-1 block text-xs font-medium tracking-wide'>Request mode</span>
            <select
              value={experimentRequestForm.teamId}
              onChange={(e) => setExperimentRequestForm((s) => ({ ...s, teamId: e.target.value }))}
              className='w-full rounded-lg border border-[#cfd8bd] bg-white px-3 py-2 text-[#3c4e23] focus:outline-none focus:ring-2 focus:ring-[#6f7d45] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]'
            >
              <option value=''>Individual request</option>
              {teamsICanLead.map((team) => (
                <option key={team.id} value={team.id}>{team.name} ({team.memberCount} members)</option>
              ))}
            </select>
          </label>
          <Input label='Purpose' value={experimentRequestForm.purpose} onChange={(e) => setExperimentRequestForm((s) => ({ ...s, purpose: e.target.value }))} placeholder='Why do you need this experiment?' />
          <Input label='Preferred date' type='date' value={experimentRequestForm.preferredDate} onChange={(e) => setExperimentRequestForm((s) => ({ ...s, preferredDate: e.target.value }))} />
          <Input label='Additional notes' value={experimentRequestForm.notes} onChange={(e) => setExperimentRequestForm((s) => ({ ...s, notes: e.target.value }))} placeholder='Faculty, batch, safety notes...' />
          <Button className='w-full bg-[#556b2f] text-white hover:bg-[#435525]' onClick={submitExperimentRequest} disabled={requestingExperiment}>
            {requestingExperiment ? 'Submitting...' : 'Send Experiment Request'}
          </Button>
        </div>
      </Modal>

      {/* Team Modal */}
      <Modal open={teamModalOpen} onClose={() => setTeamModalOpen(false)} title={editingTeamId ? 'Manage Team' : 'Create Team'}>
        <div className='space-y-4'>
          <Input label='Team name' value={teamForm.name} onChange={(e) => setTeamForm((s) => ({ ...s, name: e.target.value }))} placeholder='Analytical Chemistry Batch A' />
          <div className='rounded-lg border border-[#d9e1ca] bg-[#f9faef] p-3 dark:border-[#414a33] dark:bg-[#1f2419]'>
            <p className='text-xs font-semibold uppercase text-[#556b2f] dark:text-[#b8c5a0]'>Select Members</p>
            <p className='mt-1 text-xs text-[#71805a] dark:text-[#c5d0b5]'>You are always included as team leader.</p>
            <div className='mt-3 max-h-64 space-y-2 overflow-y-auto'>
              {selectableMembers.length ? selectableMembers.map((member) => (
                <label key={member.id} className='flex items-center gap-3 rounded-lg border border-[#d9e1ca] bg-white px-3 py-2 text-sm text-[#3c4e23] dark:border-[#414a33] dark:bg-[#20251a] dark:text-[#eef4e8] cursor-pointer hover:bg-[#f4f6ee] dark:hover:bg-[#28301f] transition'>
                  <input type='checkbox' checked={teamForm.memberIds.includes(member.id)} onChange={() => toggleTeamMember(member.id)} className="rounded text-[#556b2f] focus:ring-[#556b2f]" />
                  <span>{member.name || member.email} <span className='text-xs text-[#71805a] dark:text-[#c5d0b5]'>({member.email})</span></span>
                </label>
              )) : <p className='text-sm text-[#71805a] dark:text-[#c5d0b5]'>No eligible students found.</p>}
            </div>
          </div>
          <Button className='w-full bg-[#556b2f] text-white hover:bg-[#435525]' onClick={handleSaveTeam} disabled={savingTeam}>
            {savingTeam ? 'Saving...' : editingTeamId ? 'Save Team' : 'Create Team'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
