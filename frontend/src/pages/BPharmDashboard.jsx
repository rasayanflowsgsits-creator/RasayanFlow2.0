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

const FIFTEEN_PHARMA_EXPERIMENTS = [
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
  const [statusFilter, setStatusFilter] = useState('All');

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
    const y = user?.year || '1';
    const s = user?.semester || '1';
    fetchMyLabs(c, y, s);
    fetchMyStudentRequests();
  }, [user?.course, user?.year, user?.semester, fetchMyLabs, fetchMyStudentRequests]);

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
      const matchesSearch = 
        req.labName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        req.experimentName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All' || req.overallStatus === statusFilter;
      return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
  }, [studentRequests, localRequests, searchQuery, statusFilter]);

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
    <div className="min-h-screen bg-[#fdfdf7] dark:bg-[#1a1d16] text-[#2c3320] dark:text-[#eef4e8] p-4 md:p-8 space-y-8 font-sans pb-24 transition-colors duration-300">
      
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#556b2f] to-[#3c4e23] text-white p-5 sm:p-8 shadow-lg">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none hidden sm:block">
          <FlaskConical className="w-48 h-48" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">Welcome back, {user?.name}!</h1>
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-medium">
              <span className="bg-[#c8a030] text-black px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider">
                B.Pharm Y{user?.year || 1} • Sem {user?.semester || 1}
              </span>
              {user?.group && user?.group !== 'No Group' && (
                <span className="bg-black/30 text-white px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-medium">
                  {user.group.startsWith('Group') ? user.group : `Group ${user.group}`}
                </span>
              )}
              <span className="text-white/80">{currentDate}</span>
            </div>
          </div>
          <button 
            onClick={() => {
              if (myLabs && myLabs.length > 0) setActiveLabWindow(myLabs[0]);
            }}
            className="flex items-center gap-2 bg-[#c8a030] hover:bg-[#b58f28] text-black px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all shrink-0"
          >
            <FlaskConical className="w-4 h-4" /> Open Subject Lab Window
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-white dark:bg-[#1f2419] border-[#e8eadf] dark:border-[#3c452f] text-left">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#556b2f]/10 dark:bg-[#c8a030]/10 rounded-xl text-[#556b2f] dark:text-[#c8a030]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Enrolled Subjects</p>
              <p className="text-2xl font-bold text-[#3c4e23] dark:text-[#eef4e8]">{stats.subjectsCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-[#1f2419] border-[#e8eadf] dark:border-[#3c452f] text-left">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 rounded-xl text-amber-700 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Pending Requests</p>
              <p className="text-2xl font-bold text-[#3c4e23] dark:text-[#eef4e8]">{stats.pending}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-[#1f2419] border-[#e8eadf] dark:border-[#3c452f] text-left">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Approved Requisitions</p>
              <p className="text-2xl font-bold text-[#3c4e23] dark:text-[#eef4e8]">{stats.approved}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-[#1f2419] border-[#e8eadf] dark:border-[#3c452f] text-left">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-700 dark:text-blue-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Activity</p>
              <p className="text-2xl font-bold text-[#3c4e23] dark:text-[#eef4e8]">{stats.totalRequests}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button 
          onClick={() => navigate('/my-borrowings')}
          className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-[#1f2419] border border-[#e8eadf] dark:border-[#3c452f] hover:border-[#556b2f] dark:hover:border-[#c8a030] hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#556b2f]/10 dark:bg-[#c8a030]/10 rounded-lg text-[#556b2f] dark:text-[#c8a030]">
              <Store className="w-5 h-5" />
            </div>
            <span className="font-semibold text-left">My Active Chemical Requisitions</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#556b2f] dark:group-hover:text-[#c8a030] transition-colors" />
        </button>
        
        <button 
          onClick={() => navigate('/about')}
          className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-[#1f2419] border border-[#e8eadf] dark:border-[#3c452f] hover:border-[#556b2f] dark:hover:border-[#c8a030] hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#556b2f]/10 dark:bg-[#c8a030]/10 rounded-lg text-[#556b2f] dark:text-[#c8a030]">
              <Info className="w-5 h-5" />
            </div>
            <span className="font-semibold text-left">About RasayanFlow</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#556b2f] dark:group-hover:text-[#c8a030] transition-colors" />
        </button>
      </div>

      {/* My Labs Grid */}
      <div>
        <h2 className="text-xl font-bold text-[#3c4e23] dark:text-[#c8a030] mb-4 flex items-center gap-2">
          <Beaker className="w-5 h-5" /> My Practical Subjects
        </h2>
        
        {myLabs && myLabs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {myLabs.map(lab => {
              const adminName = lab.admin && lab.admin !== 'Unassigned' 
                ? lab.admin 
                : (Array.isArray(lab.admins) && lab.admins.length ? lab.admins.map(a => a.name || a.email).join(', ') : 'user10');

              const targetId = lab._id || lab.id || lab.labId;

              const handleNavigateToLab = (e) => {
                if (e) e.stopPropagation();
                console.log('Navigating to lab detail for lab object:', lab, 'Target ID:', targetId);
                if (targetId) {
                  navigate(`/student/lab/${targetId}`, { state: { lab } });
                }
              };

              return (
                <Card 
                  key={targetId || lab.labCode || lab.name}
                  onClick={handleNavigateToLab}
                  className="cursor-pointer group relative overflow-hidden bg-white dark:bg-[#1f2419] border-[#e8eadf] dark:border-[#3c452f] hover:border-[#556b2f] dark:hover:border-[#c8a030] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-6 flex flex-col justify-between"
                >
                  <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity dark:opacity-[0.05] dark:group-hover:opacity-[0.1]">
                    <Beaker className="w-32 h-32 text-[#556b2f] dark:text-[#c8a030]" />
                  </div>
                  
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-3">
                      <span className="inline-block px-2.5 py-1 bg-[#556b2f]/10 dark:bg-[#c8a030]/10 text-[#556b2f] dark:text-[#c8a030] text-xs font-bold rounded-lg uppercase tracking-wide">
                        {lab.labCode || '1001'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md">
                        {lab.department || lab.courseType || 'Pharmacy'}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-bold mb-2 text-[#3c4e23] dark:text-[#eef4e8] group-hover:text-[#556b2f] dark:group-hover:text-[#c8a030] transition-colors line-clamp-2">
                      {lab.labName || lab.name}
                    </h3>

                    <div className="mt-3 pt-3 border-t border-[#e8eadf] dark:border-[#3c452f]/60 flex items-center gap-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#3c4e23] dark:text-[#eef4e8] truncate">
                          {adminName}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                          {lab.adminEmail || 'user10@gmail.com'}
                        </p>
                      </div>
                    </div>
                    
                    <div 
                      onClick={handleNavigateToLab}
                      className="mt-4 pt-3 border-t border-[#f0f2eb] dark:border-[#2a3121] flex items-center justify-between text-xs font-semibold text-[#556b2f] dark:text-[#c8a030] group-hover:translate-x-1 transition-transform cursor-pointer"
                    >
                      <span>Enter Subject & Experiments →</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-6 sm:p-8 text-left bg-white dark:bg-[#1f2419] border border-dashed border-[#d9e1ca] dark:border-[#414a33] rounded-2xl">
            <div className="flex flex-col items-start gap-3">
              <div className="p-3 bg-[#f4f6ee] dark:bg-[#28301f] rounded-2xl text-[#556b2f] dark:text-[#c8a030]">
                <Beaker className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#3c4e23] dark:text-[#eef4e8]">No Labs Assigned Yet</h3>
                <p className="text-sm text-[#71805a] dark:text-[#c5d0b5] mt-1 max-w-lg">
                  No laboratories or subjects have been created for your semester yet. Your profile has been saved successfully! Once your faculty or lab administrator sets up labs, they will automatically appear here.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Requisition History Section */}
      <Card className="bg-white dark:bg-[#1f2419] border-[#e8eadf] dark:border-[#3c452f] overflow-hidden text-left">
        <div className="p-4 sm:p-6 border-b border-[#e8eadf] dark:border-[#3c452f] space-y-4 text-left">
          <h2 className="text-xl font-bold text-[#3c4e23] dark:text-[#c8a030] flex items-center gap-2 text-left">
            <Activity className="w-5 h-5" /> Requisition History
          </h2>
          
          <div className="flex flex-col md:flex-row md:items-center justify-start gap-3 text-left">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by lab or experiment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full bg-gray-50 dark:bg-[#1a1d16] border-[#e8eadf] dark:border-[#3c452f] focus:border-[#556b2f] dark:focus:border-[#c8a030] text-sm"
              />
            </div>
            
            <div className="flex overflow-x-auto gap-2 pb-1 text-left justify-start">
              {['All', 'Pending', 'Approved', 'Partial', 'Rejected'].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    statusFilter === status 
                      ? 'bg-[#556b2f] text-white dark:bg-[#c8a030] dark:text-black' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 text-left">
          <Table
            headers={[
              { key: 'date', label: 'Date', render: (row) => new Date(row.requestedAt).toLocaleDateString('en-GB') },
              { key: 'subject', label: 'Subject / Lab', render: (row) => (
                <div className="text-left">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{row.labName}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{row.subject}</div>
                </div>
              )},
              { key: 'experiment', label: 'Experiment', render: (row) => (
                <div className="text-sm text-gray-900 dark:text-gray-100 text-left">
                  <span className="font-medium mr-1 text-[#556b2f] dark:text-[#c8a030]">Exp {row.experimentNo}:</span> 
                  {row.experimentName}
                </div>
              )},
              { key: 'status', label: 'Status', render: (row) => getStatusBadge(row.overallStatus) }
            ]}
            rows={filteredRequests}
          />
        </div>
      </Card>

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
                  {activeLabWindow.labCode || '1001'} • Faculty In-Charge: {activeLabWindow.admin || 'user10'} ({activeLabWindow.adminEmail || 'user10@gmail.com'})
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
