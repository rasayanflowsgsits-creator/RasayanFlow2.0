import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Beaker, 
  CheckCircle2, 
  Clock, 
  Activity, 
  Search, 
  Store, 
  Info, 
  XCircle,
  FlaskConical,
  ChevronRight,
  Package,
  X,
  Send,
  ArrowLeft
} from 'lucide-react';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';

export const FIFTEEN_PHARMA_EXPERIMENTS = [
  {
    id: 'exp-01',
    experimentNumber: 'Exp 01: Formulation & Evaluation of Simple Syrup IP',
    experimentObject: 'To prepare and evaluate 100ml of Simple Syrup IP containing 66.7% w/w Sucrose as per Indian Pharmacopoeia standards.',
    requiredInventory: [
      { chemicalName: 'Sucrose IP Powder Grade', quantity: 66.7, quantityUnit: 'g' },
      { chemicalName: 'Purified Water', quantity: 100, quantityUnit: 'mL' },
      { chemicalName: 'Methylparaben Preservative', quantity: 0.1, quantityUnit: 'g' },
      { chemicalName: 'Glycerin IP (Co-solvent)', quantity: 5, quantityUnit: 'mL' },
      { chemicalName: 'Flavoring Agent (Peppermint Oil)', quantity: 0.5, quantityUnit: 'mL' }
    ]
  },
  {
    id: 'exp-02',
    experimentNumber: 'Exp 02: Assay of Paracetamol Pure Drug by UV Spectrophotometry',
    experimentObject: 'To determine the percentage purity of Paracetamol API sample by measuring absorbance at 243nm.',
    requiredInventory: [
      { chemicalName: 'Paracetamol IP/BP Standard', quantity: 0.1, quantityUnit: 'g' },
      { chemicalName: 'Sodium Hydroxide 0.1M', quantity: 50, quantityUnit: 'mL' },
      { chemicalName: 'Ethanol 99.9% Absolute Grade', quantity: 25, quantityUnit: 'mL' },
      { chemicalName: 'Hydrochloric Acid 0.1M', quantity: 10, quantityUnit: 'mL' },
      { chemicalName: 'Distilled Water', quantity: 250, quantityUnit: 'mL' }
    ]
  },
  {
    id: 'exp-03',
    experimentNumber: 'Exp 03: Preparation & Standardization of 0.1M Hydrochloric Acid',
    experimentObject: 'To prepare 1000ml of 0.1M HCl solution and standardize it against primary standard Sodium Carbonate using Methyl Orange indicator.',
    requiredInventory: [
      { chemicalName: 'Hydrochloric Acid 37% AR', quantity: 8.5, quantityUnit: 'mL' },
      { chemicalName: 'Sodium Carbonate Anhydrous AR', quantity: 1.5, quantityUnit: 'g' },
      { chemicalName: 'Methyl Orange Indicator Solution', quantity: 2, quantityUnit: 'mL' },
      { chemicalName: 'Phenolphthalein Indicator Solution', quantity: 2, quantityUnit: 'mL' },
      { chemicalName: 'Deionized Water', quantity: 1000, quantityUnit: 'mL' }
    ]
  },
  {
    id: 'exp-04',
    experimentNumber: 'Exp 04: Emulsion Preparation by Dry Gum Method (Castor Oil)',
    experimentObject: 'To formulate a stable primary emulsion of Castor Oil using Acacia powder in 4:2:1 oil:water:gum ratio.',
    requiredInventory: [
      { chemicalName: 'Castor Oil IP Grade', quantity: 20, quantityUnit: 'mL' },
      { chemicalName: 'Acacia Powder IP Grade', quantity: 5, quantityUnit: 'g' },
      { chemicalName: 'Purified Water', quantity: 10, quantityUnit: 'mL' },
      { chemicalName: 'Tragacanth Powder', quantity: 1, quantityUnit: 'g' },
      { chemicalName: 'Amaranth Colorant Solution', quantity: 0.2, quantityUnit: 'mL' }
    ]
  },
  {
    id: 'exp-05',
    experimentNumber: 'Exp 05: Synthesis & Recrystallization of Aspirin (Acetylsalicylic Acid)',
    experimentObject: 'To synthesize Aspirin from Salicylic Acid and Acetic Anhydride using Sulfuric Acid catalyst and determine melting point.',
    requiredInventory: [
      { chemicalName: 'Salicylic Acid AR Grade', quantity: 5, quantityUnit: 'g' },
      { chemicalName: 'Acetic Anhydride AR Grade', quantity: 7, quantityUnit: 'mL' },
      { chemicalName: 'Concentrated Sulfuric Acid 98%', quantity: 0.5, quantityUnit: 'mL' },
      { chemicalName: 'Ferric Chloride 1% Solution', quantity: 2, quantityUnit: 'mL' },
      { chemicalName: 'Ice Cold Water', quantity: 50, quantityUnit: 'mL' }
    ]
  },
  {
    id: 'exp-06',
    experimentNumber: 'Exp 06: Preparation & Standardization of 0.1M Sodium Hydroxide Solution',
    experimentObject: 'To prepare 1L of 0.1M NaOH and standardize against Potassium Hydrogen Phthalate (KHP).',
    requiredInventory: [
      { chemicalName: 'Sodium Hydroxide Pellets AR', quantity: 4.2, quantityUnit: 'g' },
      { chemicalName: 'Potassium Hydrogen Phthalate (KHP)', quantity: 2, quantityUnit: 'g' },
      { chemicalName: 'Phenolphthalein Indicator Solution', quantity: 2, quantityUnit: 'mL' },
      { chemicalName: 'Carbon Dioxide Free Water', quantity: 1000, quantityUnit: 'mL' },
      { chemicalName: 'Oxalic Acid Standard Solution', quantity: 25, quantityUnit: 'mL' }
    ]
  },
  {
    id: 'exp-07',
    experimentNumber: 'Exp 07: Dissolution Rate Study of Paracetamol Tablets IP',
    experimentObject: 'To perform in-vitro dissolution profile testing of 500mg Paracetamol tablets using USP Apparatus II (Paddle Method).',
    requiredInventory: [
      { chemicalName: 'Phosphate Buffer pH 5.8 Medium', quantity: 900, quantityUnit: 'mL' },
      { chemicalName: 'Paracetamol IP/BP Standard', quantity: 0.05, quantityUnit: 'g' },
      { chemicalName: 'Sodium Hydroxide Pellets AR', quantity: 2, quantityUnit: 'g' },
      { chemicalName: 'Potassium Dihydrogen Phosphate AR', quantity: 6.8, quantityUnit: 'g' },
      { chemicalName: 'Distilled Water', quantity: 1000, quantityUnit: 'mL' }
    ]
  },
  {
    id: 'exp-08',
    experimentNumber: 'Exp 08: Thin Layer Chromatography (TLC) Analysis of Plant Extracts',
    experimentObject: 'To separate bioactive phytochemicals from crude extract on Silica Gel G plates using hexane-ethyl acetate mobile phase.',
    requiredInventory: [
      { chemicalName: 'Silica Gel G for TLC', quantity: 15, quantityUnit: 'g' },
      { chemicalName: 'n-Hexane HPLC Grade', quantity: 30, quantityUnit: 'mL' },
      { chemicalName: 'Ethyl Acetate AR Grade', quantity: 20, quantityUnit: 'mL' },
      { chemicalName: 'Methanol 99.8% AR Grade', quantity: 15, quantityUnit: 'mL' },
      { chemicalName: 'Iodine Crystals for Visualization', quantity: 2, quantityUnit: 'g' }
    ]
  },
  {
    id: 'exp-09',
    experimentNumber: 'Exp 09: Formulation & Evaluation of Calamine Lotion IP',
    experimentObject: 'To prepare 100g Calamine Lotion containing Calamine, Zinc Oxide, Bentonite, and Glycerin as a soothing topical suspension.',
    requiredInventory: [
      { chemicalName: 'Calamine IP Powder', quantity: 15, quantityUnit: 'g' },
      { chemicalName: 'Zinc Oxide IP Powder', quantity: 5, quantityUnit: 'g' },
      { chemicalName: 'Bentonite IP Clay Powder', quantity: 3, quantityUnit: 'g' },
      { chemicalName: 'Glycerin IP (Co-solvent)', quantity: 5, quantityUnit: 'mL' },
      { chemicalName: 'Calcium Hydroxide Solution (Lime Water)', quantity: 100, quantityUnit: 'mL' }
    ]
  },
  {
    id: 'exp-10',
    experimentNumber: 'Exp 10: Wet Granulation & Compression of Lactose Tablets',
    experimentObject: 'To prepare pharmaceutical granules using Starch Paste binder and compress into 300mg placebo tablets.',
    requiredInventory: [
      { chemicalName: 'Lactose Monohydrate Powder IP', quantity: 250, quantityUnit: 'g' },
      { chemicalName: 'Maize Starch Powder IP', quantity: 50, quantityUnit: 'g' },
      { chemicalName: 'Magnesium Stearate Lubricant', quantity: 3, quantityUnit: 'g' },
      { chemicalName: 'Talc Powder IP Grade', quantity: 6, quantityUnit: 'g' },
      { chemicalName: 'Purified Water', quantity: 50, quantityUnit: 'mL' }
    ]
  },
  {
    id: 'exp-11',
    experimentNumber: 'Exp 11: Determination of Partition Coefficient (Oil/Water) of Salicylic Acid',
    experimentObject: 'To determine the partition coefficient (P) of Salicylic Acid between n-Octanol and Water at room temperature.',
    requiredInventory: [
      { chemicalName: 'Salicylic Acid AR Grade', quantity: 1, quantityUnit: 'g' },
      { chemicalName: 'n-Octanol AR Grade', quantity: 50, quantityUnit: 'mL' },
      { chemicalName: 'Sodium Hydroxide 0.05M', quantity: 50, quantityUnit: 'mL' },
      { chemicalName: 'Phenolphthalein Indicator Solution', quantity: 1, quantityUnit: 'mL' },
      { chemicalName: 'Deionized Water', quantity: 100, quantityUnit: 'mL' }
    ]
  },
  {
    id: 'exp-12',
    experimentNumber: 'Exp 12: Limit Test for Chloride in Pharmacopoeial Drugs',
    experimentObject: 'To compare opalescence produced by test sample against standard Chloride solution using Silver Nitrate reagent.',
    requiredInventory: [
      { chemicalName: 'Silver Nitrate 0.1M Solution', quantity: 10, quantityUnit: 'mL' },
      { chemicalName: 'Nitric Acid Dilute (10%)', quantity: 10, quantityUnit: 'mL' },
      { chemicalName: 'Sodium Chloride Standard Solution (10ppm)', quantity: 10, quantityUnit: 'mL' },
      { chemicalName: 'Sodium Bicarbonate Test Sample', quantity: 1, quantityUnit: 'g' },
      { chemicalName: 'Purified Water', quantity: 50, quantityUnit: 'mL' }
    ]
  },
  {
    id: 'exp-13',
    experimentNumber: 'Exp 13: Limit Test for Heavy Metals (Lead) in Chemical Substances',
    experimentObject: 'To determine trace Lead impurities using Hydrogen Sulfide / Thioacetamide reagent comparison method.',
    requiredInventory: [
      { chemicalName: 'Lead Standard Solution (20ppm)', quantity: 2, quantityUnit: 'mL' },
      { chemicalName: 'Thioacetamide Reagent Solution', quantity: 2, quantityUnit: 'mL' },
      { chemicalName: 'Ammonia Buffer Solution pH 3.5', quantity: 5, quantityUnit: 'mL' },
      { chemicalName: 'Acetic Acid Dilute (6%)', quantity: 5, quantityUnit: 'mL' },
      { chemicalName: 'Glycerol IP Grade', quantity: 2, quantityUnit: 'mL' }
    ]
  },
  {
    id: 'exp-14',
    experimentNumber: 'Exp 14: Determination of Saponification Value of Fixed Oils',
    experimentObject: 'To determine mg of KOH required to saponify 1g of Sunflower Oil sample using alcoholic KOH back titration.',
    requiredInventory: [
      { chemicalName: 'Potassium Hydroxide Alcoholic 0.5M', quantity: 25, quantityUnit: 'mL' },
      { chemicalName: 'Hydrochloric Acid 0.5M Standard', quantity: 50, quantityUnit: 'mL' },
      { chemicalName: 'Phenolphthalein Indicator Solution', quantity: 1, quantityUnit: 'mL' },
      { chemicalName: 'Ethanol 99.9% Absolute Grade', quantity: 25, quantityUnit: 'mL' },
      { chemicalName: 'Fixed Oil Sample (Sunflower Oil)', quantity: 2, quantityUnit: 'g' }
    ]
  },
  {
    id: 'exp-15',
    experimentNumber: 'Exp 15: Preparation & Evaluation of Cold Cream W/O Ointment Base',
    experimentObject: 'To formulate 50g of Cold Cream containing Beeswax, Liquid Paraffin, and Borax as a water-in-oil cosmetic emulsion base.',
    requiredInventory: [
      { chemicalName: 'White Beeswax IP Grade', quantity: 10, quantityUnit: 'g' },
      { chemicalName: 'Liquid Paraffin Heavy IP', quantity: 25, quantityUnit: 'mL' },
      { chemicalName: 'Borax (Sodium Tetraborate) Powder', quantity: 0.5, quantityUnit: 'g' },
      { chemicalName: 'Rose Water Perfume Grade', quantity: 15, quantityUnit: 'mL' },
      { chemicalName: 'Cetostearyl Alcohol Excipient', quantity: 2, quantityUnit: 'g' }
    ]
  }
];

const INITIAL_CHEMICAL_INVENTORY = [
  { name: 'Sucrose IP Powder Grade', quantity: 2000, unit: 'g', category: 'Excipient' },
  { name: 'Purified Water', quantity: 10000, unit: 'mL', category: 'Solvent' },
  { name: 'Paracetamol IP/BP Standard', quantity: 450, unit: 'g', category: 'API' },
  { name: 'Sodium Hydroxide 0.1M', quantity: 3000, unit: 'mL', category: 'Reagent' },
  { name: 'Ethanol 99.9% Absolute Grade', quantity: 5000, unit: 'mL', category: 'Solvent' },
  { name: 'Hydrochloric Acid 37% AR', quantity: 2500, unit: 'mL', category: 'Acid' },
  { name: 'Sodium Carbonate Anhydrous AR', quantity: 800, unit: 'g', category: 'Reagent' },
  { name: 'Castor Oil IP Grade', quantity: 1500, unit: 'mL', category: 'Fixed Oil' },
  { name: 'Acacia Powder IP Grade', quantity: 600, unit: 'g', category: 'Emulsifier' },
  { name: 'Salicylic Acid AR Grade', quantity: 1200, unit: 'g', category: 'Reagent' },
  { name: 'Sodium Hydroxide Pellets AR', quantity: 1200, unit: 'g', category: 'Base' }
];

const BPharmDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { myLabs, fetchMyLabs, studentRequests, fetchMyStudentRequests, setToast } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Approved'); // Default to Approved per user request
  const [selectedLabFilter, setSelectedLabFilter] = useState('All');
  const [historyPage, setHistoryPage] = useState(1);

  // In-Page Interactive Lab Window Modal State
  const [activeLabWindow, setActiveLabWindow] = useState(null);
  const [labModalTab, setLabModalTab] = useState('experiments');
  const [expSearch, setExpSearch] = useState('');
  const [requestingChem, setRequestingChem] = useState(null);
  const [reqQty, setReqQty] = useState('10');
  const [reqNotes, setReqNotes] = useState('');
  const [inventoryList, setInventoryList] = useState(INITIAL_CHEMICAL_INVENTORY);
  const [localRequests, setLocalRequests] = useState([]);

  useEffect(() => {
    const c = user?.course || 'B.Pharm';
    const y = user?.year;
    const s = user?.semester;
    // Only fetch labs when the student has completed onboarding (year + semester saved)
    if (y && s) {
      fetchMyLabs(c, y, s);
    }
    fetchMyStudentRequests();
  }, [user?.course, user?.year, user?.semester, fetchMyLabs, fetchMyStudentRequests]);

  // Reset page when filters change
  useEffect(() => {
    setHistoryPage(1);
  }, [searchQuery, statusFilter, selectedLabFilter]);

  // Derived Stats
  const stats = useMemo(() => {
    const allReqs = [...localRequests, ...(studentRequests || [])];
    const totalRequests = allReqs.length;
    const pending = allReqs.filter(req => req.overallStatus === 'Pending').length;
    const approved = allReqs.filter(req => req.overallStatus === 'Approved').length;
    const subjectsCount = myLabs?.length || 0;

    return { subjectsCount, pending, approved, totalRequests };
  }, [studentRequests, localRequests, myLabs]);

  // Filtered Requests
  const filteredRequests = useMemo(() => {
    const allReqs = [...localRequests, ...(studentRequests || [])];
    return allReqs.filter(req => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        req.labName?.toLowerCase().includes(q) || 
        req.experimentName?.toLowerCase().includes(q) ||
        (Array.isArray(req.chemicalsRequested) && req.chemicalsRequested.some(c => c.chemicalName?.toLowerCase().includes(q)));
      
      const matchesStatus = statusFilter === 'All' || req.overallStatus === statusFilter;
      const matchesLab = selectedLabFilter === 'All' || req.labName?.toLowerCase().includes(selectedLabFilter.toLowerCase());
      
      return matchesSearch && matchesStatus && matchesLab;
    }).sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
  }, [studentRequests, localRequests, searchQuery, statusFilter, selectedLabFilter]);

  // Pagination for 100+ requests
  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / ITEMS_PER_PAGE));
  const paginatedRequests = useMemo(() => {
    const start = (historyPage - 1) * ITEMS_PER_PAGE;
    return filteredRequests.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRequests, historyPage]);

  const filteredExperiments = useMemo(() => {
    if (!expSearch.trim()) return FIFTEEN_PHARMA_EXPERIMENTS;
    const q = expSearch.toLowerCase();
    return FIFTEEN_PHARMA_EXPERIMENTS.filter(exp => 
      exp.experimentNumber.toLowerCase().includes(q) ||
      exp.experimentObject.toLowerCase().includes(q) ||
      exp.requiredInventory.some(c => c.chemicalName.toLowerCase().includes(q))
    );
  }, [expSearch]);

  const handleOpenRequestModal = (chemName, defaultQty, defaultUnit, expTitle) => {
    setRequestingChem({
      name: chemName,
      qty: defaultQty || 10,
      unit: defaultUnit || 'mL',
      expTitle: expTitle || 'Practical Experiment'
    });
    setReqQty(String(defaultQty || 10));
    setReqNotes('');
  };

  const handleConfirmChemicalRequest = () => {
    if (!requestingChem || !activeLabWindow) return;
    const qtyNum = Number(reqQty) || 10;

    // Deduct quantity from local inventory in real-time
    setInventoryList(prev => prev.map(item => {
      if (item.name.toLowerCase().includes(requestingChem.name.toLowerCase()) || requestingChem.name.toLowerCase().includes(item.name.toLowerCase())) {
        return { ...item, quantity: Math.max(0, item.quantity - qtyNum) };
      }
      return item;
    }));

    // Create student request entry
    const labTitle = activeLabWindow.labName || activeLabWindow.name || 'Pharmaceutics Lab - I';
    const newRequest = {
      _id: 'req-' + Date.now(),
      requestedAt: new Date().toISOString(),
      labName: labTitle,
      subject: `${activeLabWindow.labCode || '1001'} - ${activeLabWindow.department || 'Pharmacy'}`,
      experimentNo: requestingChem.expTitle ? requestingChem.expTitle.split(':')[0] : 'Exp 01',
      experimentName: `${requestingChem.expTitle} (${requestingChem.name}: ${qtyNum} ${requestingChem.unit})`,
      overallStatus: 'Approved'
    };

    setLocalRequests(prev => [newRequest, ...prev]);

    if (setToast) {
      setToast({
        type: 'success',
        message: `Chemical request for ${requestingChem.name} (${qtyNum} ${requestingChem.unit}) submitted & allocated from inventory!`
      });
    }

    setRequestingChem(null);
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Approved':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full border border-emerald-200 dark:border-emerald-800/50"><CheckCircle2 className="w-3.5 h-3.5" /> Approved</span>;
      case 'Pending':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 rounded-full border border-amber-200 dark:border-amber-800/50"><Clock className="w-3.5 h-3.5" /> Pending</span>;
      case 'Rejected':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 rounded-full border border-rose-200 dark:border-rose-800/50"><XCircle className="w-3.5 h-3.5" /> Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 rounded-full">{status}</span>;
    }
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-[#f7f9f2] dark:bg-[#141711] text-[#2c3320] dark:text-[#eef4e8] p-4 md:p-8 space-y-8 font-sans pb-24 transition-colors duration-300">
      
      {/* Static Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#e4ebda] dark:border-[#2a3321] pb-5">
        <div className="space-y-1 text-left">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#3c4e23] dark:text-[#eef4e8] tracking-tight">
            Welcome back, {user?.name || 'Student'}!
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#71805a] dark:text-[#c5d0b5]">
            <span className="bg-[#556b2f] text-white px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
              B.Pharm Y{user?.year || 1} • Sem {user?.semester || 1}
            </span>
            {user?.group && user?.group !== 'No Group' && (
              <span className="bg-[#f0f4e8] text-[#556b2f] dark:bg-[#28301f] dark:text-[#c5d0b5] px-2.5 py-0.5 rounded-full text-xs font-semibold">
                {user.group.startsWith('Group') ? user.group : `Group ${user.group}`}
              </span>
            )}
            <span className="text-[#87996c] dark:text-[#9fb384] font-medium">{currentDate}</span>
          </div>
        </div>
      </div>

      {/* Structured Mobile-Responsive Stat Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Enrolled Labs */}
        <div className="relative overflow-hidden p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#1c2117] border border-[#e4ebda] dark:border-[#38432a] shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-2">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500"></div>
          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-700 dark:text-emerald-400 shrink-0">
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center px-1">
            <p className="text-[11px] sm:text-xs font-bold text-gray-600 dark:text-gray-300 leading-tight mb-1">
              Enrolled Labs
            </p>
            <p className="text-xl sm:text-2xl font-black text-[#3c4e23] dark:text-[#eef4e8] leading-none">
              {stats.subjectsCount}
            </p>
          </div>
        </div>

        {/* Card 2: Pending Requests */}
        <div className="relative overflow-hidden p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#1c2117] border border-[#e4ebda] dark:border-[#38432a] shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-2">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>
          <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-600 dark:text-amber-400 shrink-0">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center px-1">
            <p className="text-[11px] sm:text-xs font-bold text-gray-600 dark:text-gray-300 leading-tight mb-1">
              Pending Requests
            </p>
            <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 leading-none">
              {stats.pending}
            </p>
          </div>
        </div>

        {/* Card 3: Approved Requests */}
        <div className="relative overflow-hidden p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#1c2117] border border-[#e4ebda] dark:border-[#38432a] shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-2">
          <div className="absolute top-0 left-0 right-0 h-1 bg-teal-500"></div>
          <div className="p-2 bg-teal-50 dark:bg-teal-950/40 rounded-xl text-teal-600 dark:text-teal-400 shrink-0">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center px-1">
            <p className="text-[11px] sm:text-xs font-bold text-gray-600 dark:text-gray-300 leading-tight mb-1">
              Approved Requests
            </p>
            <p className="text-xl sm:text-2xl font-black text-teal-600 dark:text-teal-400 leading-none">
              {stats.approved}
            </p>
          </div>
        </div>

        {/* Card 4: Total Activity */}
        <div className="relative overflow-hidden p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#1c2117] border border-[#e4ebda] dark:border-[#38432a] shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-2">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500"></div>
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400 shrink-0">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center px-1">
            <p className="text-[11px] sm:text-xs font-bold text-gray-600 dark:text-gray-300 leading-tight mb-1">
              Total Activity
            </p>
            <p className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 leading-none">
              {stats.totalRequests}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Navigation Card */}
      <div className="w-full">
        <button 
          onClick={() => navigate('/my-borrowings')}
          className="w-full flex items-center justify-between p-5 rounded-2xl bg-white dark:bg-[#1c2117] border border-[#e4ebda] dark:border-[#38432a] hover:border-[#556b2f] dark:hover:border-[#c8a030] hover:shadow-lg hover:-translate-y-0.5 transition-all group"
        >
          <div className="flex items-center gap-3.5 text-left">
            <div className="p-3 bg-[#556b2f]/10 dark:bg-[#c8a030]/15 rounded-xl text-[#556b2f] dark:text-[#c8a030]">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm block text-[#3c4e23] dark:text-[#eef4e8]">My Active Chemical Requisitions</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Track assigned chemical quantities & status</span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#556b2f] dark:group-hover:text-[#c8a030] group-hover:translate-x-1 transition-all" />
        </button>
      </div>

      {/* Border Divider between Quick Navigation and My Practical Subjects */}
      <div className="w-full my-6 border-t-2 border-dashed border-[#dce5cc] dark:border-[#333d26]"></div>

      {/* Dedicated Section Container Box for My Practical Subjects */}
      <div className="rounded-3xl p-5 sm:p-7 bg-[#fcfdfa] dark:bg-[#181d13] border-2 border-[#d0dcb8] dark:border-[#38432a] shadow-lg shadow-[#556b2f]/5 space-y-6 text-center">
        
        {/* Centered Header Bar */}
        <div className="flex flex-col items-center justify-center text-center space-y-1.5 pb-4 border-b-2 border-[#e4ebda] dark:border-[#38432a]">
          <div className="flex items-center justify-center gap-2.5">
            <Beaker className="w-6 h-6 sm:w-7 sm:h-7 text-[#556b2f] dark:text-[#c8a030] shrink-0" />
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#3c4e23] dark:text-[#c8a030] tracking-tight">
              My Practical Subjects
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#556b2f] dark:text-[#a5b48b] font-bold flex items-center justify-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#556b2f] dark:bg-[#c8a030]"></span>
            {user?.course || 'B.Pharm'} &bull; Year {user?.year || 1} &bull; Semester {user?.semester || 1}
          </p>
        </div>

        {/* Subjects Grid */}
        {myLabs && myLabs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 text-left">
            {myLabs.map(lab => {
              const adminName = lab.admin && lab.admin !== 'Unassigned' 
                ? lab.admin 
                : (Array.isArray(lab.admins) && lab.admins.length ? lab.admins.map(a => (typeof a === 'object' ? (a.name || a.email) : a)).join(', ') : 'Unassigned');

              const targetId = lab._id || lab.id || lab.labId;

              const handleNavigateToLab = (e) => {
                if (e) e.stopPropagation();
                if (user?.isPreview) {
                  setActiveLabWindow(lab);
                } else if (targetId) {
                  navigate(`/student/lab/${targetId}`, { state: { lab } });
                } else {
                  setActiveLabWindow(lab);
                }
              };

              return (
                <div 
                  key={targetId || lab.labCode || lab.name}
                  onClick={handleNavigateToLab}
                  className="cursor-pointer group relative overflow-hidden bg-white dark:bg-[#1c2117] border-2 border-[#b8c99d] dark:border-[#4a5836] shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-200 p-5 sm:p-6 rounded-2xl flex flex-col justify-between space-y-4 text-left"
                >
                  <div className="absolute -right-3 -bottom-3 opacity-[0.04] group-hover:opacity-[0.12] transition-opacity dark:opacity-[0.06] dark:group-hover:opacity-[0.15]">
                    <Beaker className="w-32 h-32 text-[#556b2f] dark:text-[#c8a030]" />
                  </div>

                  <div className="relative z-10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-block px-3 py-1 bg-[#556b2f]/10 dark:bg-[#c8a030]/15 text-[#556b2f] dark:text-[#c8a030] text-xs font-extrabold rounded-lg border border-[#556b2f]/25 dark:border-[#c8a030]/25 uppercase tracking-wider">
                        {lab.labCode || '100'}
                      </span>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-[#f4f7ee] dark:bg-[#252d1d] text-[#556b2f] dark:text-[#c8a030] border border-[#d5e0c2] dark:border-[#38432a]">
                        {lab.courseType || user?.course || 'B.Pharm'}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-[#3c4e23] dark:text-[#eef4e8] group-hover:text-[#556b2f] dark:group-hover:text-[#c8a030] transition-colors leading-tight">
                        {lab.labName || lab.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
                        Practical Experiments & Chemical Requisitions
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#e4ebda] dark:border-[#28301f] flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#556b2f]/10 dark:bg-[#c8a030]/15 flex items-center justify-center text-xs font-extrabold text-[#556b2f] dark:text-[#c8a030] shrink-0">
                        {adminName ? adminName.charAt(0).toUpperCase() : 'F'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">FACULTY INSTRUCTOR</p>
                        <p className="text-xs font-bold text-[#3c4e23] dark:text-[#eef4e8] truncate">
                          {adminName}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 pt-3 border-t border-[#f0f2eb] dark:border-[#28301f] flex items-center justify-between text-xs font-extrabold text-[#556b2f] dark:text-[#c8a030] group-hover:translate-x-1 transition-transform">
                    <span>Enter Subject & Experiments &rarr;</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Card className="p-8 text-left bg-white dark:bg-[#1c2117] border border-dashed border-[#d9e1ca] dark:border-[#414a33] rounded-2xl">
            <div className="flex flex-col items-start gap-3">
              <div className="p-3.5 bg-[#f4f6ee] dark:bg-[#28301f] rounded-2xl text-[#556b2f] dark:text-[#c8a030]">
                <Beaker className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#3c4e23] dark:text-[#eef4e8]">
                  No labs configured for your year and semester yet.
                </h3>
                <p className="text-sm text-[#71805a] dark:text-[#c5d0b5] mt-1 max-w-lg">
                  {user?.course && user?.year && user?.semester
                    ? `No labs have been assigned for ${user.course} · Year ${user.year} · Semester ${user.semester} yet. Please contact your administrator.`
                    : 'Your profile has been saved. Once your faculty or lab administrator sets up labs for your year and semester, they will automatically appear here.'}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Border Divider before Requisition History */}
      <div className="w-full my-6 border-t-2 border-dashed border-[#dce5cc] dark:border-[#333d26]"></div>

      {/* Dedicated Section Container Box for Requisition History & Chemical Consumption Logs */}
      <div className="rounded-3xl p-5 sm:p-7 bg-[#fcfdfa] dark:bg-[#181d13] border-2 border-[#d0dcb8] dark:border-[#38432a] shadow-lg shadow-[#556b2f]/5 space-y-6 text-left">
        
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b-2 border-[#e4ebda] dark:border-[#38432a]">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <Activity className="w-6 h-6 text-[#556b2f] dark:text-[#c8a030] shrink-0" />
              <h2 className="text-2xl sm:text-3xl font-black text-[#3c4e23] dark:text-[#c8a030] tracking-tight">
                Approved Chemical Activity & Requisition Logs
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">
              Track requested vs approved chemical quantities across all your enrolled labs
            </p>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-200/80 dark:border-emerald-800/40 self-start md:self-auto">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Showing {filteredRequests.length} Total Records</span>
          </span>
        </div>

        {/* Filter Controls Row */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by experiment or chemical name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full bg-white dark:bg-[#141711] border-2 border-[#cfd8bd] dark:border-[#4e5d35] focus:ring-2 focus:ring-[#556b2f] text-xs py-2.5 rounded-xl font-medium"
              />
            </div>

            {/* Lab Filter Selector */}
            <div className="w-full sm:w-64">
              <select
                value={selectedLabFilter}
                onChange={(e) => setSelectedLabFilter(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-[#141711] border-2 border-[#cfd8bd] dark:border-[#4e5d35] text-xs font-bold text-[#3c4e23] dark:text-[#eef4e8] rounded-xl outline-none focus:ring-2 focus:ring-[#556b2f]"
              >
                <option value="All">All Enrolled Labs ({myLabs?.length || 0})</option>
                {myLabs?.map(lab => (
                  <option key={lab._id || lab.labCode || lab.name} value={lab.labName || lab.name}>
                    {lab.labCode ? `${lab.labCode} - ` : ''}{lab.labName || lab.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 mr-1">Status Filter:</span>
            {['Approved', 'Pending', 'All', 'Rejected'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === status 
                    ? 'bg-[#556b2f] text-white shadow-sm dark:bg-[#c8a030] dark:text-black' 
                    : 'bg-white dark:bg-[#20251a] text-gray-600 dark:text-gray-300 border border-[#d5e0c2] dark:border-[#38432a] hover:bg-gray-50'
                }`}
              >
                {status === 'Approved' ? '✅ Approved Only' : status}
              </button>
            ))}
          </div>
        </div>

        {/* Structured Activity Records List */}
        {paginatedRequests.length > 0 ? (
          <div className="space-y-4">
            {paginatedRequests.map(req => {
              const formattedDate = req.requestedAt 
                ? new Date(req.requestedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                : '12 Aug 2026';

              const expNoStr = String(req.experimentNo ?? '1');
              const expBadgeLabel = expNoStr.toLowerCase().startsWith('exp') ? expNoStr : `Exp ${expNoStr}`;

              const chemList = req.chemicalsRequested && req.chemicalsRequested.length > 0 
                ? req.chemicalsRequested 
                : (req.chemicalName ? [{ chemicalName: req.chemicalName, quantityRequested: req.quantityRequested || 10, unit: req.quantityUnit || 'mL', status: req.overallStatus }] : []);

              return (
                <div 
                  key={req._id || req.id}
                  className="bg-white dark:bg-[#1c2117] border-2 border-[#b8c99d] dark:border-[#4a5836] shadow-md rounded-2xl p-4 sm:p-5 space-y-3 transition-all text-left"
                >
                  {/* Line 1 (Box Top): Exp Badge, Lab Name, Date, Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#f0f2eb] dark:border-[#28301f]">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-[#556b2f]/10 dark:bg-[#c8a030]/15 text-[#556b2f] dark:text-[#c8a030] text-xs font-black rounded-md border border-[#556b2f]/20 uppercase">
                        {expBadgeLabel}
                      </span>
                      <span className="text-base font-extrabold text-[#3c4e23] dark:text-[#eef4e8]">
                        {req.labName || 'HAP1'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-medium text-gray-500 dark:text-gray-400">
                        {formattedDate}
                      </span>
                      {getStatusBadge(req.overallStatus)}
                    </div>
                  </div>

                  {/* Line 2: Approved By Lab Admin */}
                  <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 font-semibold pt-0.5">
                    <span className="text-gray-400 dark:text-gray-500 font-medium">Approved by:</span>
                    <span className="font-bold text-[#556b2f] dark:text-[#c8a030]">
                      {req.approvedByName || (typeof req.approvedBy === 'object' ? req.approvedBy?.name : req.approvedBy) || 'Lab Admin'}
                    </span>
                  </div>

                  {/* Line 3: Experiment Object / Name */}
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-[#3c4e23] dark:text-[#eef4e8]">
                      {req.experimentName}
                    </h4>
                  </div>

                  {/* Line 4: Detailed Chemical Consumption Breakdown */}
                  {chemList.length > 0 && (
                    <div className="bg-[#fcfdfa] dark:bg-[#141711] border border-[#e4ebda] dark:border-[#2f3823] rounded-xl p-3 space-y-2">
                      <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Beaker className="w-3.5 h-3.5 text-[#556b2f]" /> Chemical Requisition & Approved Quantities:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {chemList.map((c, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#1c2117] border border-[#e8eadf] dark:border-[#38432a] text-xs">
                            <span className="font-semibold text-[#3c4e23] dark:text-[#eef4e8] truncate mr-2">
                              {c.chemicalName}
                            </span>
                            <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/40 shrink-0">
                              {c.quantityRequested || c.quantity} {c.unit || c.quantityUnit || 'mL'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Pagination Controls for 100+ Requests */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-[#e4ebda] dark:border-[#38432a]">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 font-mono">
                  Page {historyPage} of {totalPages} &bull; {filteredRequests.length} total records
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={historyPage === 1}
                    onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-[#1c2117] border border-[#cfd8bd] dark:border-[#4e5d35] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    &larr; Previous
                  </button>
                  <button
                    disabled={historyPage === totalPages}
                    onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#556b2f] text-white dark:bg-[#c8a030] dark:text-black disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
                  >
                    Next &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center bg-white dark:bg-[#1c2117] border border-dashed border-[#d9e1ca] dark:border-[#414a33] rounded-2xl space-y-2">
            <Beaker className="w-8 h-8 text-gray-400 mx-auto" />
            <h3 className="text-base font-bold text-[#3c4e23] dark:text-[#eef4e8]">No requisition records found</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              No chemical requests match your current lab filter or search query.
            </p>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* IN-PAGE FULL-SCREEN INTERACTIVE LAB WINDOW MODAL */}
      {/* ========================================================= */}
      {activeLabWindow && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-[#fdfdf7] dark:bg-[#1a1d16] text-[#2c3320] dark:text-[#eef4e8] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header Bar */}
          <div className="sticky top-0 z-30 flex items-center justify-between bg-[#556b2f] text-white px-6 py-4 shadow-md">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setActiveLabWindow(null)}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                title="Close Window"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-xl font-bold leading-tight">
                  {activeLabWindow.labName || activeLabWindow.name || 'Pharmaceutics Lab - I'}
                </h2>
                <p className="text-xs text-white/80 font-medium">
                  {activeLabWindow.labCode || '1001'} • Faculty In-Charge: {activeLabWindow.admin || 'Unassigned'}{activeLabWindow.adminEmail ? ` (${activeLabWindow.adminEmail})` : ''}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setActiveLabWindow(null)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Subheader & Tabs */}
          <div className="bg-white dark:bg-[#1f2419] border-b border-[#e8eadf] dark:border-[#3c452f] px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex gap-2">
              <button 
                onClick={() => setLabModalTab('experiments')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  labModalTab === 'experiments'
                    ? 'bg-[#556b2f] text-white shadow-sm'
                    : 'bg-[#f4f6ee] text-[#556b2f] dark:bg-[#28301f] dark:text-[#c5d0b5] hover:bg-[#e8ece1]'
                }`}
              >
                <FlaskConical className="w-4 h-4" /> All 15 Practical Experiments
              </button>
              <button 
                onClick={() => setLabModalTab('inventory')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  labModalTab === 'inventory'
                    ? 'bg-[#556b2f] text-white shadow-sm'
                    : 'bg-[#f4f6ee] text-[#556b2f] dark:bg-[#28301f] dark:text-[#c5d0b5] hover:bg-[#e8ece1]'
                }`}
              >
                <Package className="w-4 h-4" /> Lab Chemical Stock
              </button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search experiments or chemicals..."
                value={expSearch}
                onChange={(e) => setExpSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-[#cfd8bd] bg-white dark:bg-[#20251a] dark:border-[#4e5d35] outline-none focus:ring-2 focus:ring-[#556b2f]"
              />
            </div>
          </div>

          {/* Main Body */}
          <div className="p-6 max-w-7xl mx-auto w-full space-y-6 flex-1">
            
            {/* EXPERIMENTS TAB */}
            {labModalTab === 'experiments' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-[#3c4e23] dark:text-[#c8a030]">
                    Interactive Experiment & Chemical Requisition ({filteredExperiments.length} Available)
                  </h3>
                  <span className="text-xs font-semibold bg-[#556b2f]/10 text-[#556b2f] px-3 py-1 rounded-full">
                    Select any chemical to request directly
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredExperiments.map((exp) => (
                    <Card key={exp.id} className="p-5 bg-white dark:bg-[#1f2419] border-[#e8eadf] dark:border-[#3c452f] shadow-sm hover:shadow-md transition-all flex flex-col justify-between text-left">
                      <div>
                        <span className="inline-block text-xs font-bold uppercase tracking-wider bg-[#556b2f]/10 text-[#556b2f] dark:bg-[#c8a030]/20 dark:text-[#c8a030] px-2.5 py-1 rounded-md mb-2">
                          {exp.experimentNumber}
                        </span>
                        <h4 className="text-base font-bold text-[#3c4e23] dark:text-[#eef4e8] mb-3">
                          {exp.experimentObject}
                        </h4>

                        {/* Required Chemicals List */}
                        <div className="space-y-2 my-4">
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Required Chemicals (Quantities & Direct Requisition)</p>
                          {exp.requiredInventory.map((chem, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-[#fdfdf7] dark:bg-[#1a1d16] border border-[#e8eadf] dark:border-[#3c452f]">
                              <div>
                                <span className="font-semibold text-xs text-[#3c4e23] dark:text-[#eef4e8] block">
                                  {chem.chemicalName}
                                </span>
                                <span className="text-[11px] text-[#87996c]">Required: {chem.quantity} {chem.quantityUnit}</span>
                              </div>
                              <button 
                                onClick={() => handleOpenRequestModal(chem.chemicalName, chem.quantity, chem.quantityUnit, exp.experimentNumber)}
                                className="flex items-center gap-1 bg-[#556b2f] hover:bg-[#435525] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
                              >
                                <Beaker className="w-3.5 h-3.5" /> Request Chemical
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Button 
                        onClick={() => handleOpenRequestModal(exp.requiredInventory[0]?.chemicalName || 'All Required Chemicals', 10, 'units', exp.experimentNumber)}
                        className="w-full bg-[#556b2f] text-white hover:bg-[#435525] mt-2 font-semibold text-xs py-2.5 rounded-xl"
                      >
                        <FlaskConical className="w-4 h-4 mr-2" /> Request Full Experiment Chemicals
                      </Button>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* INVENTORY TAB */}
            {labModalTab === 'inventory' && (
              <div className="space-y-4 text-left">
                <h3 className="text-lg font-bold text-[#3c4e23] dark:text-[#c8a030]">
                  Lab Chemical Inventory & Real-Time Stock Status
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {inventoryList.map((item, idx) => (
                    <Card key={idx} className="p-4 bg-white dark:bg-[#1f2419] border-[#e8eadf] dark:border-[#3c452f] text-left">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                          {item.category}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${item.quantity > 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {item.quantity > 0 ? `In Stock (${item.quantity} ${item.unit})` : 'Out of Stock'}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-[#3c4e23] dark:text-[#eef4e8] mb-3">{item.name}</h4>
                      <button 
                        onClick={() => handleOpenRequestModal(item.name, 10, item.unit, 'Direct Inventory Requisition')}
                        className="w-full bg-[#556b2f] hover:bg-[#435525] text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" /> Request Chemical
                      </button>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DIRECT CHEMICAL REQUEST DIALOG */}
      {requestingChem && (
        <Modal 
          open={Boolean(requestingChem)} 
          onClose={() => setRequestingChem(null)} 
          title={`Request ${requestingChem.name}`}
        >
          <div className="space-y-4 text-left">
            <div className="p-3 rounded-xl bg-[#f4f6ee] dark:bg-[#28301f] text-xs font-semibold text-[#556b2f] dark:text-[#c5d0b5]">
              Target Subject: <span className="font-bold">{activeLabWindow?.labName || activeLabWindow?.name || 'Pharmaceutics Lab - I'}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Quantity Needed" 
                type="number" 
                value={reqQty} 
                onChange={(e) => setReqQty(e.target.value)} 
              />
              <Input 
                label="Unit" 
                value={requestingChem.unit} 
                readOnly 
                className="bg-gray-100 dark:bg-gray-800" 
              />
            </div>

            <Input 
              label="Experiment / Purpose" 
              value={requestingChem.expTitle} 
              readOnly 
              className="bg-gray-100 dark:bg-gray-800" 
            />

            <Input 
              label="Additional Notes / Group No." 
              placeholder="e.g. Group A, Batch 1" 
              value={reqNotes} 
              onChange={(e) => setReqNotes(e.target.value)} 
            />

            <Button 
              onClick={handleConfirmChemicalRequest}
              className="w-full bg-[#556b2f] hover:bg-[#435525] text-white font-bold py-3 rounded-xl"
            >
              Submit Chemical Request & Allocate Stock
            </Button>
          </div>
        </Modal>
      )}

    </div>
  );
};

export default BPharmDashboard;
