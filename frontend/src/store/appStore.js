import {create} from 'zustand';
import api from '../services/api';
import useAuthStore from './authStore';

const getPayload = (responseData) => responseData?.data ?? responseData;

const PREVIEW_LABS = [
  {
    _id: 'preview-lab-1',
    id: 'preview-lab-1',
    name: 'Pharmaceutics Lab - I',
    labName: 'Pharmaceutics Lab - I',
    labCode: 'PH101L',
    location: 'Block A, Room 102',
    admin: 'Dr. R. K. Sharma',
    courseType: 'B.Pharm',
    department: 'Pharmaceutics',
    year: '1',
    semester: '1'
  },
  {
    _id: 'preview-lab-2',
    id: 'preview-lab-2',
    name: 'Pharmaceutical Chemistry Lab',
    labName: 'Pharmaceutical Chemistry Lab',
    labCode: 'PH102L',
    location: 'Block B, Room 204',
    admin: 'Prof. A. Verma',
    courseType: 'B.Pharm',
    department: 'Pharmaceutical Chemistry',
    year: '1',
    semester: '1'
  },
  {
    _id: 'preview-lab-3',
    id: 'preview-lab-3',
    name: 'Human Anatomy & Physiology Lab',
    labCode: 'PH103L',
    location: 'Block A, Room 108',
    admin: 'Dr. S. Patel',
    courseType: 'B.Pharm',
    department: 'Pharmacology',
    year: '1',
    semester: '1'
  },
  {
    _id: 'preview-lab-4',
    id: 'preview-lab-4',
    name: 'Pharmaceutical Analysis Lab',
    labCode: 'PH104L',
    location: 'Block C, Room 301',
    admin: 'Dr. M. Gupta',
    courseType: 'B.Pharm',
    department: 'Pharmaceutical Chemistry',
    year: '1',
    semester: '1'
  }
];

const PREVIEW_INVENTORY = [
  {
    _id: 'preview-item-1',
    id: 'preview-item-1',
    name: 'Paracetamol Raw Grade',
    chemicalName: 'Paracetamol',
    itemCode: 'PCM-100',
    category: 'Analgesic / Antipyretic',
    quantity: 500,
    quantityUnit: 'g',
    storageLocation: 'Shelf A-1 (Cool Room)',
    manufacturingCompany: 'Cipla Lab Reagents',
    expiryDate: '2027-12-31',
    pubmedId: '25488102',
    displayAbstract: 'Paracetamol (Acetaminophen) is a widely used non-opioid analgesic and antipyretic agent. In pharmaceutical manufacturing lab courses, it is used to teach wet granulation, tablet compression, UV-Vis spectrophotometer assay, and dissolution rate testing.',
  },
  {
    _id: 'preview-item-2',
    id: 'preview-item-2',
    name: 'Hydrochloric Acid 0.1M',
    chemicalName: 'Hydrochloric Acid',
    itemCode: 'HCL-01',
    category: 'Acid Reagent',
    quantity: 2500,
    quantityUnit: 'mL',
    storageLocation: 'Acid Cabinet B',
    manufacturingCompany: 'Merck India',
    expiryDate: '2028-06-30',
    pubmedId: '12345678',
    displayAbstract: 'Hydrochloric Acid (0.1M Volumetric Solution) is essential for acid-base titrations, solubility testing, and pH adjustment in aqueous pharmaceutical formulations.',
  },
  {
    _id: 'preview-item-3',
    id: 'preview-item-3',
    name: 'Ethanol 99.9% Absolute',
    chemicalName: 'Ethanol',
    itemCode: 'ETH-99',
    category: 'Solvent / Reagent',
    quantity: 5000,
    quantityUnit: 'mL',
    storageLocation: 'Flammables Storage C',
    manufacturingCompany: 'Thermo Fisher',
    expiryDate: '2029-01-01',
    displayAbstract: 'Absolute ethanol is an organic solvent used for extraction of phytoconstituents, preparing elixirs, tincture formulations, and HPLC sample preparation.',
  },
  {
    _id: 'preview-item-4',
    id: 'preview-item-4',
    name: 'Sodium Hydroxide Pellets',
    chemicalName: 'Sodium Hydroxide',
    itemCode: 'NAOH-PEL',
    category: 'Base Reagent',
    quantity: 1000,
    quantityUnit: 'g',
    storageLocation: 'Desiccator Cabinet D',
    manufacturingCompany: 'Loba Chemie',
    expiryDate: '2028-11-15',
    displayAbstract: 'Sodium hydroxide pellets are used to prepare standardized volumetric alkaline solutions for saponification value determination and neutralization titrations.',
  }
];

const PREVIEW_EXPERIMENTS = [
  {
    _id: 'preview-exp-1',
    id: 'preview-exp-1',
    labId: 'preview-lab-1',
    experimentNumber: 'Exp 01: Formulation & Evaluation of Simple Syrup IP',
    experimentObject: 'To prepare and evaluate 100ml of Simple Syrup IP containing 66.7% w/w Sucrose.',
    requiredInventory: [
      { chemicalName: 'Sucrose IP Grade', quantity: 66.7, quantityUnit: 'g' },
      { chemicalName: 'Purified Water', quantity: 100, quantityUnit: 'mL' }
    ]
  },
  {
    _id: 'preview-exp-2',
    id: 'preview-exp-2',
    labId: 'preview-lab-1',
    experimentNumber: 'Exp 02: Assay of Paracetamol Tablets by UV-Vis Spectrophotometry',
    experimentObject: 'To determine the percentage purity of Paracetamol tablets at lambda max 243nm.',
    requiredInventory: [
      { chemicalName: 'Paracetamol Raw Grade', quantity: 0.1, quantityUnit: 'g' },
      { chemicalName: 'Sodium Hydroxide 0.1M', quantity: 50, quantityUnit: 'mL' }
    ]
  },
  {
    _id: 'preview-exp-3',
    id: 'preview-exp-3',
    labId: 'preview-lab-1',
    experimentNumber: 'Exp 03: Viscosity Determination using Ostwald Viscometer',
    experimentObject: 'To measure the relative and absolute viscosity of liquid formulations at 25°C.',
    requiredInventory: [
      { chemicalName: 'Ethanol 99.9% Absolute', quantity: 20, quantityUnit: 'mL' },
      { chemicalName: 'Purified Water', quantity: 50, quantityUnit: 'mL' }
    ]
  }
];

const normalizeLab = (lab) => ({
  ...lab,
  id: lab._id || lab.id,
  name: lab.name || lab.labName || 'Unnamed Lab',
  location: lab.location || lab.labCode || 'N/A',
  admin: lab.admin || (Array.isArray(lab.admins) && lab.admins.length ? lab.admins.map((admin) => admin.name).join(', ') : 'Unassigned'),
  courseType: lab.courseType || '',
  department: lab.department || '',
  year: lab.year || '',
  semester: lab.semester || '',
});

const normalizeRole = (role) => {
  if (role === 'superAdmin') return 'super-admin';
  if (role === 'labAdmin') return 'lab-admin';
  if (role === 'storeAdmin') return 'store-admin';
  return role || 'student';
};

const normalizeUser = (user) => ({
  ...user,
  id: user._id || user.id,
  role: normalizeRole(user.role),
  isBlocked: Boolean(user.isBlocked),
  blockedReason: user.blockedReason || ''
});

const normalizeInventoryItem = (item) => ({
  ...item,
  id: item._id || item.id,
  labId: item.labId?._id || item.labId || null,
  labName: item.labId?.labName || item.labName || '',
  labCode: item.labId?.labCode || item.labCode || '',
  itemCode: item.itemCode || '',
  chemicalName: item.chemicalName || item.itemName || item.name || 'Unnamed Chemical',
  name: item.name || item.itemName || 'Unnamed Item',
  category: item.category || 'General',
  quantityUnit: item.quantityUnit || item.unit || '',
  costPerUnit: Number(item.costPerUnit || 0),
  casNumber: item.casNumber || '',
  smiles: item.smiles || '',
  inchi: item.inchi || '',
  chemicalFormula: item.chemicalFormula || '',
  manufacturingCompany: item.manufacturingCompany || '',
  entryDate: item.entryDate || null,
  storageLocation: item.storageLocation || '',
  lotNumber: item.lotNumber || '',
  expiryDate: item.expiryDate || null,
  abstract: item.abstract || '',
  displayAbstract: item.displayAbstract || item.abstract || '',
  abstractSource: item.abstractSource || (item.pubmedId ? 'pubmed' : item.abstract ? 'manual' : 'none'),
  isAiGenerated: Boolean(item.isAiGenerated),
  pubmedId: item.pubmedId || '',
});

const normalizeTransaction = (tx) => ({
  ...tx,
  id: tx._id || tx.id,
  status: tx.status || 'pending',
  requestCategory: tx.requestCategory || 'inventory',
  teamId: tx.teamId?._id || tx.teamId || null,
  teamName: tx.teamId?.name || tx.teamName || '',
  memberCount: Number(tx.memberCount || tx.participantIds?.length || 1),
  participantIds: (tx.participantIds || []).map((participant) => ({
    id: participant?._id || participant?.id || participant,
    name: participant?.name || '',
    email: participant?.email || '',
  })),
  experimentTitle: tx.experimentTitle || tx.experimentId?.experimentNumber || '',
  itemName: tx.requestCategory === 'experiment' ? (tx.experimentTitle || tx.experimentId?.experimentNumber || 'Experiment') : (tx.itemName || tx.itemId?.itemName || 'item'),
  itemCode: tx.itemCode || tx.itemId?.itemCode || '',
  requesterName: tx.requesterName || tx.userId?.name || 'Unknown',
  requesterEmail: tx.requesterEmail || tx.userId?.email || '',
  detail:
    tx.detail ||
    `${tx.type === 'return' ? 'Returned' : tx.status === 'pending' ? 'Requested' : 'Borrowed'} ${tx.requestCategory === 'experiment' ? (tx.experimentTitle || tx.experimentId?.experimentNumber || 'experiment') : (tx.itemId?.itemName || 'item')}`
});

const normalizeExperiment = (experiment) => ({
  ...experiment,
  id: experiment._id || experiment.id,
  labId: experiment.labId?._id || experiment.labId || null,
  labName: experiment.labId?.labName || experiment.labName || '',
  labCode: experiment.labId?.labCode || experiment.labCode || '',
  requiredInventory: (experiment.requiredInventory || []).map((entry, index) => ({
    ...entry,
    id: entry._id || `${experiment._id || experiment.id || 'experiment'}-${index}`,
    inventoryItemId: entry.inventoryItemId?._id || entry.inventoryItemId || null,
    inventoryItem: entry.inventoryItemId && typeof entry.inventoryItemId === 'object' ? normalizeInventoryItem(entry.inventoryItemId) : null,
    chemicalName: entry.chemicalName || entry.inventoryItemId?.chemicalName || entry.inventoryItemId?.itemName || 'Chemical',
    quantity: Number(entry.quantity || 0),
    costPerUnit: Number(entry.costPerUnit || entry.inventoryItemId?.costPerUnit || 0),
    estimatedCost: Number(entry.estimatedCost || 0),
  })),
  totalEstimatedExpense: Number(experiment.totalEstimatedExpense || 0),
});

const normalizeActivityLog = (log) => ({
  ...log,
  id: log._id || log.id,
  action: log.action || 'activity',
  details: log.details || '',
  timestamp: log.timestamp || log.createdAt || null,
  actorName: log.userId?.name || 'Unknown user',
  actorEmail: log.userId?.email || '',
  actorRole: normalizeRole(log.userId?.role),
});

const normalizeStoreItem = (item) => ({
  ...item,
  id: item._id || item.id,
  itemCode: item.itemCode || '',
  itemName: item.itemName || item.name || 'Unnamed Item',
  category: item.category || 'General',
  subCategory: item.subCategory || 'Miscellaneous',
  quantity: Number(item.quantity || 0),
  quantityUnit: item.quantityUnit || 'units',
  storageLocation: item.storageLocation || '',
  description: item.description || '',
  abstract: item.abstract || '',
  pubmedId: item.pubmedId || '',
});

const normalizeStoreAllotment = (entry) => ({
  ...entry,
  id: entry._id || entry.id,
  quantity: Number(entry.quantity || 0),
  quantityUnit: entry.quantityUnit || entry.storeItemId?.quantityUnit || 'units',
  studentName: entry.studentId?.name || 'Unknown student',
  studentEmail: entry.studentId?.email || '',
  itemName: entry.storeItemId?.itemName || 'Store item',
  itemCode: entry.storeItemId?.itemCode || '',
  allottedByName: entry.allottedBy?.name || 'Unknown admin',
  status: entry.status || 'approved',
  requestNotes: entry.requestNotes || '',
  reviewNotes: entry.reviewNotes || '',
  reviewedByName: entry.reviewedBy?.name || '',
  dueDate: entry.dueDate || null,
  timestamp: entry.timestamp || null,
});

const normalizeTeam = (team) => {
  const leader = team.leaderId && typeof team.leaderId === 'object' ? team.leaderId : null;
  const members = (team.memberIds || []).map((member) => ({
    ...member,
    id: member._id || member.id,
  }));

  return {
    ...team,
    id: team._id || team.id,
    labId: team.labId?._id || team.labId || null,
    labName: team.labId?.labName || '',
    name: team.name || 'Untitled Team',
    leaderId: leader?._id || leader?.id || team.leaderId || null,
    leaderName: leader?.name || '',
    leaderEmail: leader?.email || '',
    members,
    participantIds: Array.from(new Set([leader?._id || leader?.id || team.leaderId, ...members.map((member) => member.id)].filter(Boolean))),
    memberCount: Array.from(new Set([leader?._id || leader?.id || team.leaderId, ...members.map((member) => member.id)].filter(Boolean))).length,
    canRequestExperiments: Boolean(team.canRequestExperiments ?? true),
    status: team.status || 'active',
  };
};

const normalizeTeamAllotment = (entry) => ({
  ...entry,
  id: entry._id || entry.id,
  requestTransactionId: entry.requestTransactionId?._id || entry.requestTransactionId || null,
  experimentId: entry.experimentId?._id || entry.experimentId || null,
  experimentTitle: entry.experimentId?.experimentNumber || entry.experimentTitle || 'Experiment',
  teamId: entry.teamId?._id || entry.teamId || null,
  teamName: entry.teamId?.name || entry.teamName || 'Individual request',
  inventoryItemId: entry.inventoryItemId?._id || entry.inventoryItemId || null,
  chemicalName: entry.chemicalName || entry.inventoryItemId?.chemicalName || entry.inventoryItemId?.itemName || 'Chemical',
  quantityUnit: entry.quantityUnit || entry.inventoryItemId?.quantityUnit || 'units',
  totalQuantity: Number(entry.totalQuantity || 0),
  perMemberQuantity: Number(entry.perMemberQuantity || 0),
  memberCount: Number(entry.memberCount || 1),
  allocations: (entry.allocations || []).map((allocation) => ({
    userId: allocation.userId?._id || allocation.userId || null,
    userName: allocation.userId?.name || '',
    userEmail: allocation.userId?.email || '',
    quantity: Number(allocation.quantity || 0),
  })),
  createdAt: entry.createdAt || null,
});

const useAppStore = create((set) => ({
  labs: [],
  users: [],
  inventory: [],
  experiments: [],
  teams: [],
  eligibleTeamMembers: [],
  teamAllotments: [],
  storeItems: [],
  storeAllotments: [],
  transactions: [],
  activityLogs: [],
  labRequests: [],
  labStructure: [],
  studentRequests: [],
  researchRequests: [],
  loading: false,
  filters: { search: '', lab: 'All' },
  toast: null,
  highlight: null,
  fetchLabs: async () => {
    const isPreview = useAuthStore.getState().user?.isPreview;
    set({ loading: true });
    try {
      const { data } = await api.get('/labs');
      const labs = (getPayload(data) || []).map(normalizeLab);
      set({ labs: labs.length ? labs : PREVIEW_LABS, loading: false });
    } catch {
      set({ labs: isPreview ? PREVIEW_LABS : [], loading: false });
    }
  },
  createLab: async ({ name, code, courseType, department, year, semester }) => {
    const { data } = await api.post('/labs', {
      labName: name,
      labCode: code,
      courseType: courseType || 'B.Pharm',
      department: department || '',
      year: year || '',
      semester: semester || '',
    });
    const createdLab = normalizeLab(getPayload(data));
    set((state) => ({ labs: [createdLab, ...state.labs] }));
    return createdLab;
  },
  deleteLab: async (labId) => {
    await api.delete(`/labs/${labId}`);
    set((state) => ({
      labs: state.labs.filter((lab) => lab.id !== labId),
      users: state.users.map((user) =>
        user.labId === labId
          ? {
              ...user,
              labId: null,
              role: user.role === 'lab-admin' ? 'student' : user.role,
              isApproved: user.role === 'lab-admin' ? false : user.isApproved,
            }
          : user
      ),
      inventory: state.inventory.filter((item) => item.labId !== labId),
      transactions: state.transactions.filter((tx) => String(tx.labId) !== String(labId) && String(tx.labId?._id) !== String(labId)),
    }));
  },
  createInventoryItem: async ({ labId, itemCode, chemicalName, name, category, quantity, quantityUnit, costPerUnit = 0, minThreshold = 5, casNumber = '', smiles = '', inchi = '', chemicalFormula = '', manufacturingCompany = '', entryDate = '', storageLocation = '', lotNumber = '', expiryDate = '', abstract = '', pubmedId = '' }) => {
    const response = await api.post('/inventory', {
      labId,
      itemCode,
      itemName: name || chemicalName,
      chemicalName: chemicalName || name,
      category,
      quantity: Number(quantity),
      quantityUnit,
      costPerUnit: Number(costPerUnit),
      minThreshold: Number(minThreshold),
      casNumber,
      smiles,
      inchi,
      chemicalFormula,
      manufacturingCompany,
      entryDate: entryDate || null,
      storageLocation,
      lotNumber,
      expiryDate: expiryDate || null,
      abstract,
      pubmedId
    });
    const item = normalizeInventoryItem(getPayload(response.data));
    set((state) => ({ inventory: [item, ...state.inventory] }));
    return item;
  },
  bulkImportInventoryItems: async ({ labId, items }) => {
    const response = await api.post('/inventory/bulk-import', { labId, items });
    return getPayload(response.data);
  },
  updateInventoryItem: async (itemId, updates) => {
    const payload = { ...updates };
    // Ensure abstract and pubmedId are included if provided
    if ('abstract' in updates) payload.abstract = updates.abstract;
    if ('pubmedId' in updates) payload.pubmedId = updates.pubmedId;
    const response = await api.put(`/inventory/${itemId}`, payload);
    const updatedItem = normalizeInventoryItem(getPayload(response.data));
    set((state) => ({
      inventory: state.inventory.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    }));
    return updatedItem;
  },
  deleteInventoryItem: async (itemId) => {
    await api.delete(`/inventory/${itemId}`);
    set((state) => ({
      inventory: state.inventory.filter((item) => item.id !== itemId)
    }));
  },
  fetchChemicalAbstractForInventory: async (chemicalName, inventoryItemId = null) => {
    try {
      const response = await api.post('/inventory/fetch-abstract', {
        chemicalName,
        inventoryItemId,
      });
      const result = getPayload(response.data);
      
      // If inventoryItemId was provided and abstract was fetched, update the inventory item in state
      if (inventoryItemId && result.source === 'pubmed') {
        set((state) => ({
          inventory: state.inventory.map((item) =>
            item.id === inventoryItemId
              ? { ...item, abstract: result.abstract, pubmedId: result.pmid }
              : item
          )
        }));
      }
      
      return result;
    } catch (error) {
      console.error('Failed to fetch abstract:', error);
      throw error;
    }
  },
  fetchChemicalDataByCasForInventory: async (casNumber) => {
    const response = await api.post('/inventory/fetch-pubchem', { casNumber });
    return getPayload(response.data);
  },
  createBorrowRequest: async ({ itemId, quantity, purpose, neededUntil, notes = '' }) => {
    const isPreview = useAuthStore.getState().user?.isPreview;
    if (isPreview) {
      const mockTx = normalizeTransaction({
        _id: 'preview-tx-' + Date.now(),
        id: 'preview-tx-' + Date.now(),
        labId: 'preview-lab-1',
        itemName: 'Paracetamol Raw Grade',
        quantity: Number(quantity),
        purpose,
        neededUntil,
        notes,
        status: 'pending',
        requestCategory: 'inventory',
        createdAt: new Date().toISOString()
      });
      set((state) => ({ transactions: [mockTx, ...state.transactions] }));
      return mockTx;
    }
    const response = await api.post('/transactions/borrow', {
      itemId,
      quantity: Number(quantity),
      purpose,
      neededUntil,
      notes
    });
    return normalizeTransaction(getPayload(response.data)?.transaction || getPayload(response.data));
  },
  approveBorrowRequest: async (transactionId, reviewNotes = '') => {
    const response = await api.put(`/transactions/approve/${transactionId}`, { reviewNotes });
    return getPayload(response.data);
  },
  rejectBorrowRequest: async (transactionId, reviewNotes = '') => {
    const response = await api.put(`/transactions/reject/${transactionId}`, { reviewNotes });
    return getPayload(response.data);
  },
  assignAdminToLab: async ({ labId, adminId, email, name, password }) => {
    const response = await api.post('/labs/assign', { labId, adminId, email, name, password });
    return getPayload(response.data);
  },
  removeAdminFromLab: async ({ labId, adminId }) => {
    const response = await api.post('/labs/remove', { labId, adminId });
    return getPayload(response.data);
  },
  createLabAdmin: async ({ name, email, password }) => {
    const response = await api.post('/users/lab-admins', { name, email, password });
    return normalizeUser(getPayload(response.data));
  },
  createStoreAdmin: async ({ name, email, password }) => {
    const response = await api.post('/users/store-admins', { name, email, password });
    return normalizeUser(getPayload(response.data));
  },
  createSuperAdmin: async ({ name, email, password }) => {
    const response = await api.post('/users/super-admins', { name, email, password });
    return normalizeUser(getPayload(response.data));
  },
  approveUserAccount: async (userId) => {
    const response = await api.put(`/users/approve/${userId}`);
    return normalizeUser(getPayload(response.data));
  },
  fetchActivityLogs: async () => {
    try {
      const response = await api.get('/logs?limit=500');
      const logsData = response?.data?.logs || response?.data?.data || response?.data || [];
      const list = Array.isArray(logsData) ? logsData : [];
      set({ activityLogs: list });
      return list;
    } catch (error) {
      console.error('Failed to fetch real activity logs:', error);
      return [];
    }
  },
  setUserBlockedState: async ({ userId, isBlocked, blockedReason = '' }) => {
    const response = await api.put(`/users/block/${userId}`, { isBlocked, blockedReason });
    const updatedUser = normalizeUser(getPayload(response.data));
    set((state) => ({
      users: state.users.map((user) => (user.id === updatedUser.id ? updatedUser : user))
    }));
    return updatedUser;
  },
  fetchUsers: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/users');
      const users = (getPayload(data) || []).map(normalizeUser);
      set({ users, loading: false });
    } catch {
      set({ users: [], loading: false });
    }
  },
  fetchInventory: async (labId) => {
    const isPreview = useAuthStore.getState().user?.isPreview;
    set({ loading: true });
    try {
      const { data } = await api.get(`/inventory?labId=${labId}`);
      const inventory = (getPayload(data) || []).map(normalizeInventoryItem);
      set({ inventory: inventory.length ? inventory : PREVIEW_INVENTORY, loading: false });
    } catch {
      set({ inventory: isPreview ? PREVIEW_INVENTORY : [], loading: false });
    }
  },
  fetchInventorySearch: async (itemName) => {
    set({ loading: true });
    try {
      const query = `/inventory?itemName=${encodeURIComponent(itemName)}&limit=100`;
      const { data } = await api.get(query);
      const inventory = (getPayload(data) || []).map(normalizeInventoryItem);
      set({ loading: false });
      return inventory;
    } catch {
      set({ loading: false });
      return [];
    }
  },
  fetchExperiments: async (filters = {}) => {
    const isPreview = useAuthStore.getState().user?.isPreview;
    set({ loading: true });
    try {
      const queryParams = new URLSearchParams();
      if (filters.labId) queryParams.set('labId', filters.labId);
      if (filters.search) queryParams.set('search', filters.search);

      const query = queryParams.toString() ? `/experiments?${queryParams.toString()}` : '/experiments';
      const { data } = await api.get(query);
      const experiments = (getPayload(data) || []).map(normalizeExperiment);
      set({ experiments: experiments.length ? experiments : PREVIEW_EXPERIMENTS, loading: false });
      return experiments.length ? experiments : PREVIEW_EXPERIMENTS;
    } catch {
      set({ experiments: isPreview ? PREVIEW_EXPERIMENTS : [], loading: false });
      return isPreview ? PREVIEW_EXPERIMENTS : [];
    }
  },
  createExperiment: async (payload) => {
    const response = await api.post('/experiments', payload);
    const experiment = normalizeExperiment(getPayload(response.data));
    set((state) => ({ experiments: [experiment, ...state.experiments] }));
    return experiment;
  },
  bulkImportExperiments: async ({ labId, experiments }) => {
    const response = await api.post('/experiments/bulk-import', { labId, experiments });
    return getPayload(response.data);
  },
  deleteExperiment: async (experimentId) => {
    await api.delete(`/experiments/${experimentId}`);
    set((state) => ({ experiments: state.experiments.filter((entry) => entry.id !== experimentId) }));
  },
  fetchTeams: async (labId) => {
    const isPreview = useAuthStore.getState().user?.isPreview;
    if (isPreview) {
      set({ teams: [] });
      return [];
    }
    try {
      const query = labId ? `/teams?labId=${labId}` : '/teams';
      const response = await api.get(query);
      const teams = (getPayload(response.data) || []).map(normalizeTeam);
      set({ teams });
      return teams;
    } catch {
      set({ teams: [] });
      return [];
    }
  },
  fetchEligibleTeamMembers: async () => {
    const isPreview = useAuthStore.getState().user?.isPreview;
    if (isPreview) {
      set({ eligibleTeamMembers: [] });
      return [];
    }
    try {
      const response = await api.get('/teams/eligible-members');
      const eligibleTeamMembers = (getPayload(response.data) || []).map(normalizeUser);
      set({ eligibleTeamMembers });
      return eligibleTeamMembers;
    } catch {
      set({ eligibleTeamMembers: [] });
      return [];
    }
  },
  createTeam: async ({ name, labId, memberIds = [] }) => {
    const response = await api.post('/teams', { name, labId, memberIds });
    const team = normalizeTeam(getPayload(response.data));
    set((state) => ({ teams: [team, ...state.teams.filter((entry) => entry.id !== team.id)] }));
    return team;
  },
  updateTeam: async (teamId, payload) => {
    const response = await api.put(`/teams/${teamId}`, payload);
    const team = normalizeTeam(getPayload(response.data));
    set((state) => ({
      teams: state.teams.map((entry) => (entry.id === team.id ? team : entry)),
    }));
    return team;
  },
  fetchTeamAllotments: async (filters = {}) => {
    const queryParams = new URLSearchParams();
    if (filters.labId) queryParams.set('labId', filters.labId);
    if (filters.teamId) queryParams.set('teamId', filters.teamId);
    const query = queryParams.toString() ? `/teams/allotments?${queryParams.toString()}` : '/teams/allotments';
    const response = await api.get(query);
    const teamAllotments = (getPayload(response.data) || []).map(normalizeTeamAllotment);
    set({ teamAllotments });
    return teamAllotments;
  },
  createExperimentRequest: async ({ experimentId, teamId = null, purpose, preferredDate, notes = '' }) => {
    const isPreview = useAuthStore.getState().user?.isPreview;
    if (isPreview) {
      const mockTx = normalizeTransaction({
        _id: 'preview-exp-req-' + Date.now(),
        id: 'preview-exp-req-' + Date.now(),
        labId: 'preview-lab-1',
        requestCategory: 'experiment',
        experimentTitle: 'Exp 01: Formulation & Evaluation of Simple Syrup IP',
        purpose,
        neededUntil: preferredDate || null,
        notes,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      set((state) => ({ transactions: [mockTx, ...state.transactions] }));
      return mockTx;
    }
    const response = await api.post('/transactions/experiment-request', {
      experimentId,
      teamId,
      purpose,
      neededUntil: preferredDate || null,
      notes,
    });
    const transaction = normalizeTransaction(getPayload(response.data)?.transaction || getPayload(response.data));
    set((state) => ({ transactions: [transaction, ...state.transactions] }));
    return transaction;
  },
  fetchStoreItems: async (filters = {}) => {
    set({ loading: true });
    try {
      const queryParams = new URLSearchParams();
      if (filters.category) queryParams.set('category', filters.category);
      if (filters.subCategory) queryParams.set('subCategory', filters.subCategory);
      if (filters.search) queryParams.set('search', filters.search);

      const query = queryParams.toString() ? `/store-items?${queryParams.toString()}` : '/store-items';
      const { data } = await api.get(query);
      const storeItems = (getPayload(data) || []).map(normalizeStoreItem);
      set({ storeItems, loading: false });
      return storeItems;
    } catch {
      set({ storeItems: [], loading: false });
      return [];
    }
  },
  createStoreItem: async (payload) => {
    const response = await api.post('/store-items', payload);
    const createdItem = normalizeStoreItem(getPayload(response.data));
    set((state) => ({ storeItems: [createdItem, ...state.storeItems] }));
    return createdItem;
  },
  bulkImportStoreItems: async ({ items, importMode }) => {
    const response = await api.post('/store-items/bulk-import', { items, importMode });
    return getPayload(response.data);
  },
  updateStoreItem: async (itemId, updates) => {
    const response = await api.put(`/store-items/${itemId}`, updates);
    const updatedItem = normalizeStoreItem(getPayload(response.data));
    set((state) => ({
      storeItems: state.storeItems.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    }));
    return updatedItem;
  },
  deleteStoreItem: async (itemId) => {
    await api.delete(`/store-items/${itemId}`);
    set((state) => ({
      storeItems: state.storeItems.filter((item) => item.id !== itemId)
    }));
  },
  fetchChemicalAbstract: async (chemicalName, storeItemId = null) => {
    try {
      const response = await api.post('/store-items/fetch-abstract', {
        chemicalName,
        storeItemId,
      });
      const result = getPayload(response.data);
      
      // If storeItemId was provided and abstract was fetched, update the store item in state
      if (storeItemId && result.source === 'pubmed') {
        set((state) => ({
          storeItems: state.storeItems.map((item) =>
            item.id === storeItemId
              ? { ...item, abstract: result.abstract, pubmedId: result.pmid }
              : item
          )
        }));
      }
      
      return result;
    } catch (error) {
      console.error('Failed to fetch abstract:', error);
      throw error;
    }
  },
  fetchStoreAllotments: async (filters = {}) => {
    set({ loading: true });
    try {
      const queryParams = new URLSearchParams();
      if (filters.studentId) queryParams.set('studentId', filters.studentId);
      if (filters.storeItemId) queryParams.set('storeItemId', filters.storeItemId);

      const query = queryParams.toString() ? `/store-allotments?${queryParams.toString()}` : '/store-allotments';
      const { data } = await api.get(query);
      const storeAllotments = (getPayload(data) || []).map(normalizeStoreAllotment);
      set({ storeAllotments, loading: false });
      return storeAllotments;
    } catch {
      set({ storeAllotments: [], loading: false });
      return [];
    }
  },
  createStoreAllotment: async (payload) => {
    const response = await api.post('/store-allotments', payload);
    const allotment = normalizeStoreAllotment(getPayload(response.data));
    set((state) => ({ storeAllotments: [allotment, ...state.storeAllotments] }));
    return allotment;
  },
  requestStoreItem: async (payload) => {
    const response = await api.post('/store-allotments/request', payload);
    const allotment = normalizeStoreAllotment(getPayload(response.data));
    set((state) => ({ storeAllotments: [allotment, ...state.storeAllotments] }));
    return allotment;
  },
  approveStoreRequest: async (allotmentId, reviewNotes = '') => {
    const response = await api.put(`/store-allotments/approve/${allotmentId}`, { reviewNotes });
    const updated = normalizeStoreAllotment(getPayload(response.data));
    set((state) => ({
      storeAllotments: state.storeAllotments.map((entry) => (entry.id === updated.id ? updated : entry))
    }));
    return updated;
  },
  rejectStoreRequest: async (allotmentId, reviewNotes = '') => {
    const response = await api.put(`/store-allotments/reject/${allotmentId}`, { reviewNotes });
    const updated = normalizeStoreAllotment(getPayload(response.data));
    set((state) => ({
      storeAllotments: state.storeAllotments.map((entry) => (entry.id === updated.id ? updated : entry))
    }));
    return updated;
  },
  fetchTransactions: async (paramsOrLabId) => {
    const isPreview = useAuthStore.getState().user?.isPreview;
    if (isPreview) {
      set({ loading: false });
      return;
    }
    set({ loading: true });
    try {
      const filters =
        typeof paramsOrLabId === 'string' || !paramsOrLabId
          ? { labId: paramsOrLabId || '' }
          : paramsOrLabId;
      const queryParams = new URLSearchParams();

      if (filters.labId) queryParams.set('labId', filters.labId);
      if (filters.userId) queryParams.set('userId', filters.userId);
      if (filters.status) queryParams.set('status', filters.status);
      if (filters.itemCode) queryParams.set('itemCode', filters.itemCode.trim().toUpperCase());

      const query = queryParams.toString() ? `/transactions?${queryParams.toString()}` : '/transactions';
      const { data } = await api.get(query);
      const transactions = (getPayload(data) || []).map(normalizeTransaction);
      set({ transactions, loading: false });
    } catch {
      set({ transactions: [], loading: false });
    }
  },
  fetchLabRequests: async () => {
    try {
      const { data } = await api.get('/lab/requests');
      set({ labRequests: getPayload(data) || [] });
    } catch {
      set({ labRequests: [] });
    }
  },
  notifications: [],
  unreadNotificationCount: 0,
  fetchNotifications: async () => {
    try {
      const { data } = await api.get('/notifications');
      const notifs = getPayload(data) || [];
      set({ notifications: notifs, unreadNotificationCount: notifs.filter(n => !n.isRead).length });
    } catch {
      set({ notifications: [], unreadNotificationCount: 0 });
    }
  },
  fetchUnreadNotificationCount: async () => {
    try {
      const { data } = await api.get('/notifications/unread-count');
      set({ unreadNotificationCount: getPayload(data)?.count || 0 });
    } catch {
      set({ unreadNotificationCount: 0 });
    }
  },
  markNotificationAsRead: async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      set((state) => {
        const notifs = state.notifications.map(n => n._id === id ? { ...n, isRead: true } : n);
        return { notifications: notifs, unreadNotificationCount: notifs.filter(n => !n.isRead).length };
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  },
  markAllNotificationsAsRead: async () => {
    try {
      await api.put('/notifications/read-all');
      set((state) => {
        const notifs = state.notifications.map(n => ({ ...n, isRead: true }));
        return { notifications: notifs, unreadNotificationCount: 0 };
      });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  },
  createLabRequest: async ({ labId, labName, chemicalName, quantityRequested, unit, purpose, groupName = '' }) => {
    const response = await api.post('/lab/requests', {
      labId,
      labName,
      chemicalName,
      quantityRequested: Number(quantityRequested),
      unit,
      purpose,
      groupName
    });
    const request = getPayload(response.data);
    set((state) => ({ labRequests: [request, ...state.labRequests] }));
    return request;
  },
  fetchMyLabRequests: async () => {
    try {
      const { data } = await api.get('/lab/requests/my');
      set({ labRequests: getPayload(data) || [] });
    } catch {
      set({ labRequests: [] });
    }
  },
  approveLabRequest: async (requestId) => {
    const response = await api.put(`/lab/requests/${requestId}/approve`);
    const updated = getPayload(response.data);
    set((state) => ({
      labRequests: state.labRequests.map((entry) => (entry._id === updated._id ? updated : entry))
    }));
    return updated;
  },
  rejectLabRequest: async (requestId, rejectionReason = '') => {
    const response = await api.put(`/lab/requests/${requestId}/reject`, { rejectionReason });
    const updated = getPayload(response.data);
    set((state) => ({
      labRequests: state.labRequests.map((entry) => (entry._id === updated._id ? updated : entry))
    }));
    return updated;
  },
  fetchActivityLogs: async (filters = {}) => {
    set({ loading: true });
    try {
      const queryParams = new URLSearchParams();

      if (filters.page) queryParams.set('page', String(filters.page));
      if (filters.limit) queryParams.set('limit', String(filters.limit));
      if (filters.userId) queryParams.set('userId', filters.userId);
      if (filters.action) queryParams.set('action', filters.action);

      const query = queryParams.toString() ? `/logs?${queryParams.toString()}` : '/logs';
      const { data } = await api.get(query);
      const activityLogs = (getPayload(data) || []).map(normalizeActivityLog);
      set({ activityLogs, loading: false });
      return activityLogs;
    } catch {
      set({ activityLogs: [], loading: false });
      return [];
    }
  },
  setFilters: (payload) => set((state) => ({ filters: { ...state.filters, ...payload } })),
  setToast: (toast) => set({ toast }),
  removeToast: () => set({ toast: null }),
  // Lab Structure Methods
  fetchLabStructure: async (labId) => {
    set({ loading: true });
    try {
      const { data } = await api.get(labId ? `/lab/structure?labId=${labId}` : '/lab/structure');
      set({ labStructure: getPayload(data) || [], loading: false });
    } catch {
      set({ labStructure: [], loading: false });
    }
  },
  uploadLabStructure: async (structures) => {
    set({ loading: true });
    try {
      await api.post('/lab/structure/upload', { structures });
      set({ loading: false, toast: { title: 'Success', message: 'Lab structure uploaded successfully', type: 'success' } });
    } catch (err) {
      set({ loading: false, toast: { title: 'Error', message: err?.response?.data?.message || 'Upload failed', type: 'error' } });
      throw err;
    }
  },

  // Student Request Methods
  fetchStudentRequests: async (labId) => {
    set({ loading: true });
    try {
      const { data } = await api.get(labId ? `/student/requests/lab?labId=${labId}` : '/student/requests/lab');
      set({ studentRequests: getPayload(data) || [], loading: false });
    } catch {
      set({ studentRequests: [], loading: false });
    }
  },
  fetchMyStudentRequests: async () => {
    const isPreview = useAuthStore.getState().user?.isPreview;
    if (isPreview) {
      set({ loading: false });
      return;
    }
    set({ loading: true });
    try {
      const { data } = await api.get('/student/requests/my');
      set({ studentRequests: getPayload(data) || [], loading: false });
    } catch {
      set({ studentRequests: [], loading: false });
    }
  },
  createStudentRequest: async (payload) => {
    set({ loading: true });
    try {
      await api.post('/student/requests', payload);
      set({ loading: false, toast: { title: 'Success', message: 'Request submitted successfully', type: 'success' } });
    } catch (err) {
      set({ loading: false, toast: { title: 'Error', message: err?.response?.data?.message || 'Request failed', type: 'error' } });
      throw err;
    }
  },
  approveStudentRequest: async (id, approveType) => {
    set({ loading: true });
    try {
      await api.put(`/student/requests/${id}/approve`, { approveType });
      set({ loading: false, toast: { title: 'Success', message: 'Request approved', type: 'success' } });
      useAppStore.getState().fetchStudentRequests();
      useAppStore.getState().fetchInventory(); // Inventory reduced
    } catch (err) {
      set({ loading: false, toast: { title: 'Error', message: err?.response?.data?.message || 'Approval failed', type: 'error' } });
      throw err;
    }
  },
  rejectStudentRequest: async (id, reason) => {
    set({ loading: true });
    try {
      await api.put(`/student/requests/${id}/reject`, { reason });
      set({ loading: false, toast: { title: 'Success', message: 'Request rejected', type: 'success' } });
      useAppStore.getState().fetchStudentRequests();
    } catch (err) {
      set({ loading: false, toast: { title: 'Error', message: err?.response?.data?.message || 'Rejection failed', type: 'error' } });
      throw err;
    }
  },
  setupStudentProfile: async (payload) => {
    set({ loading: true });
    try {
      const { data } = await api.put('/student/profile/setup', payload);
      set({ loading: false });
      return getPayload(data);
    } catch (err) {
      set({ loading: false, toast: { title: 'Error', message: err?.response?.data?.message || 'Setup failed', type: 'error' } });
      throw err;
    }
  },
  fetchMatchingLabs: async (courseType, year, semester) => {
    try {
      const { data } = await api.get(`/labs/matching?courseType=${courseType}&year=${year}&semester=${semester}`);
      return getPayload(data) || [];
    } catch (err) {
      console.error('Failed to fetch matching labs', err);
      return [];
    }
  },
  myLabs: [],
  fetchMyLabs: async (courseType, year, semester) => {
    const isPreview = useAuthStore.getState().user?.isPreview;
    if (isPreview) {
      set({ myLabs: PREVIEW_LABS, labs: PREVIEW_LABS, loading: false });
      return;
    }
    set({ loading: true });
    try {
      const { data } = await api.get(`/labs/matching?courseType=${courseType}&year=${year}&semester=${semester}`);
      const fetched = getPayload(data) || [];
      set({ myLabs: fetched.length ? fetched : PREVIEW_LABS, loading: false });
    } catch (err) {
      console.error('Failed to fetch my labs', err);
      set({ myLabs: PREVIEW_LABS, loading: false });
    }
  },
  fetchStudentLabStructure: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/lab/structure/student');
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  },
  markAllNotificationsAsRead: async () => {
    try {
      await api.put('/notifications/read-all');
      set((state) => {
        const notifs = state.notifications.map(n => ({ ...n, isRead: true }));
        return { notifications: notifs, unreadNotificationCount: 0 };
      });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  },
  createLabRequest: async ({ labId, labName, chemicalName, quantityRequested, unit, purpose, groupName = '' }) => {
    const response = await api.post('/lab/requests', {
      labId,
      labName,
      chemicalName,
      quantityRequested: Number(quantityRequested),
      unit,
      purpose,
      groupName
    });
    const request = getPayload(response.data);
    set((state) => ({ labRequests: [request, ...state.labRequests] }));
    return request;
  },
  fetchMyLabRequests: async () => {
    try {
      const { data } = await api.get('/lab/requests/my');
      set({ labRequests: getPayload(data) || [] });
    } catch {
      set({ labRequests: [] });
    }
  },
  approveLabRequest: async (requestId) => {
    const response = await api.put(`/lab/requests/${requestId}/approve`);
    const updated = getPayload(response.data);
    set((state) => ({
      labRequests: state.labRequests.map((entry) => (entry._id === updated._id ? updated : entry))
    }));
    return updated;
  },
  rejectLabRequest: async (requestId, rejectionReason = '') => {
    const response = await api.put(`/lab/requests/${requestId}/reject`, { rejectionReason });
    const updated = getPayload(response.data);
    set((state) => ({
      labRequests: state.labRequests.map((entry) => (entry._id === updated._id ? updated : entry))
    }));
    return updated;
  },
  fetchActivityLogs: async (filters = {}) => {
    set({ loading: true });
    try {
      const queryParams = new URLSearchParams();

      if (filters.page) queryParams.set('page', String(filters.page));
      if (filters.limit) queryParams.set('limit', String(filters.limit));
      if (filters.userId) queryParams.set('userId', filters.userId);
      if (filters.action) queryParams.set('action', filters.action);

      const query = queryParams.toString() ? `/logs?${queryParams.toString()}` : '/logs';
      const { data } = await api.get(query);
      const activityLogs = (getPayload(data) || []).map(normalizeActivityLog);
      set({ activityLogs, loading: false });
      return activityLogs;
    } catch {
      set({ activityLogs: [], loading: false });
      return [];
    }
  },
  setFilters: (payload) => set((state) => ({ filters: { ...state.filters, ...payload } })),
  setToast: (toast) => set({ toast }),
  removeToast: () => set({ toast: null }),
  // Lab Structure Methods
  fetchLabStructure: async (labId) => {
    set({ loading: true });
    try {
      const { data } = await api.get(labId ? `/lab/structure?labId=${labId}` : '/lab/structure');
      set({ labStructure: getPayload(data) || [], loading: false });
    } catch {
      set({ labStructure: [], loading: false });
    }
  },
  uploadLabStructure: async (structures) => {
    set({ loading: true });
    try {
      await api.post('/lab/structure/upload', { structures });
      set({ loading: false, toast: { title: 'Success', message: 'Lab structure uploaded successfully', type: 'success' } });
    } catch (err) {
      set({ loading: false, toast: { title: 'Error', message: err?.response?.data?.message || 'Upload failed', type: 'error' } });
      throw err;
    }
  },

  // Student Request Methods
  fetchStudentRequests: async (labId) => {
    set({ loading: true });
    try {
      const { data } = await api.get(labId ? `/student/requests/lab?labId=${labId}` : '/student/requests/lab');
      set({ studentRequests: getPayload(data) || [], loading: false });
    } catch {
      set({ studentRequests: [], loading: false });
    }
  },
  fetchMyStudentRequests: async () => {
    const isPreview = useAuthStore.getState().user?.isPreview;
    if (isPreview) {
      set({ loading: false });
      return;
    }
    set({ loading: true });
    try {
      const { data } = await api.get('/student/requests/my');
      set({ studentRequests: getPayload(data) || [], loading: false });
    } catch {
      set({ studentRequests: [], loading: false });
    }
  },
  createStudentRequest: async (payload) => {
    set({ loading: true });
    try {
      await api.post('/student/requests', payload);
      set({ loading: false, toast: { title: 'Success', message: 'Request submitted successfully', type: 'success' } });
    } catch (err) {
      set({ loading: false, toast: { title: 'Error', message: err?.response?.data?.message || 'Request failed', type: 'error' } });
      throw err;
    }
  },
  approveStudentRequest: async (id, approveType) => {
    set({ loading: true });
    try {
      await api.put(`/student/requests/${id}/approve`, { approveType });
      set({ loading: false, toast: { title: 'Success', message: 'Request approved', type: 'success' } });
      useAppStore.getState().fetchStudentRequests();
      useAppStore.getState().fetchInventory(); // Inventory reduced
    } catch (err) {
      set({ loading: false, toast: { title: 'Error', message: err?.response?.data?.message || 'Approval failed', type: 'error' } });
      throw err;
    }
  },
  rejectStudentRequest: async (id, reason) => {
    set({ loading: true });
    try {
      await api.put(`/student/requests/${id}/reject`, { reason });
      set({ loading: false, toast: { title: 'Success', message: 'Request rejected', type: 'success' } });
      useAppStore.getState().fetchStudentRequests();
    } catch (err) {
      set({ loading: false, toast: { title: 'Error', message: err?.response?.data?.message || 'Rejection failed', type: 'error' } });
      throw err;
    }
  },
  setupStudentProfile: async (payload) => {
    set({ loading: true });
    try {
      const { data } = await api.put('/student/profile/setup', payload);
      set({ loading: false });
      return getPayload(data);
    } catch (err) {
      set({ loading: false, toast: { title: 'Error', message: err?.response?.data?.message || 'Setup failed', type: 'error' } });
      throw err;
    }
  },
  fetchMatchingLabs: async (courseType, year, semester) => {
    try {
      const { data } = await api.get(`/labs/matching?courseType=${courseType}&year=${year}&semester=${semester}`);
      return getPayload(data) || [];
    } catch (err) {
      console.error('Failed to fetch matching labs', err);
      return [];
    }
  },
  myLabs: [],
  fetchMyLabs: async (courseType, year, semester) => {
    const isPreview = useAuthStore.getState().user?.isPreview;
    if (isPreview) {
      set({ myLabs: PREVIEW_LABS, labs: PREVIEW_LABS, loading: false });
      return;
    }
    set({ loading: true });
    try {
      const { data } = await api.get(`/labs/matching?courseType=${courseType}&year=${year}&semester=${semester}`);
      const fetched = getPayload(data) || [];
      set({ myLabs: fetched.length ? fetched : PREVIEW_LABS, loading: false });
    } catch (err) {
      console.error('Failed to fetch my labs', err);
      set({ myLabs: PREVIEW_LABS, loading: false });
    }
  },
  fetchStudentLabStructure: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/lab/structure/student');
      set({ labStructure: getPayload(data) || [], loading: false });
    } catch {
      set({ labStructure: [], loading: false });
    }
  },
  bulkApproveStudentRequests: async ({ group, experimentNo, forceApproveAvailable }) => {
    set({ loading: true });
    try {
      const response = await api.put('/student/requests/approve-bulk', { group, experimentNo, forceApproveAvailable });
      set({ loading: false, toast: { title: 'Success', message: 'Bulk approval successful', type: 'success' } });
      useAppStore.getState().fetchStudentRequests();
      useAppStore.getState().fetchInventory(); 
      return response.data;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },
  studentHistory: [],
  fetchStudentHistory: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/student/requests/history');
      set({ studentHistory: getPayload(data) || [], loading: false });
    } catch {
      set({ studentHistory: [], loading: false });
    }
  },

  // Research Request Methods (M.Pharm/PhD)
  fetchMyResearchRequests: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/student/research-requests/my');
      set({ researchRequests: getPayload(data) || [], loading: false });
    } catch {
      set({ researchRequests: [], loading: false });
    }
  },
  createResearchRequest: async (payload) => {
    set({ loading: true });
    try {
      await api.post('/student/research-requests', payload);
      set({ loading: false, toast: { title: 'Success', message: 'Research request submitted successfully', type: 'success' } });
    } catch (err) {
      set({ loading: false, toast: { title: 'Error', message: err?.response?.data?.message || 'Request failed', type: 'error' } });
      throw err;
    }
  },

  // Master Chemical Catalog
  masterChemicals: [
    { id: 'mc-1', name: 'Paracetamol IP/BP', casNumber: '103-90-2', hazardClass: 'Non-Hazardous', storageTemp: '15-25°C', sdsAvailable: true, category: 'Active Pharmaceutical Ingredient' },
    { id: 'mc-2', name: 'Hydrochloric Acid 0.1M', casNumber: '7647-01-0', hazardClass: 'Corrosive / Acid', storageTemp: 'Room Temp', sdsAvailable: true, category: 'Reagent' },
    { id: 'mc-3', name: 'Ethanol 99.9% Absolute', casNumber: '64-17-5', hazardClass: 'Flammable Liquid', storageTemp: 'Cool Storage', sdsAvailable: true, category: 'Solvent' },
    { id: 'mc-4', name: 'Sodium Hydroxide Pellets', casNumber: '1310-73-2', hazardClass: 'Corrosive / Base', storageTemp: 'Dry Storage', sdsAvailable: true, category: 'Base' },
    { id: 'mc-5', name: 'Sulphuric Acid 98% AR', casNumber: '7664-93-9', hazardClass: 'Toxic / Corrosive', storageTemp: 'Acid Cabinet', sdsAvailable: true, category: 'Acid' },
    { id: 'mc-6', name: 'Methanol HPLC Grade', casNumber: '67-56-1', hazardClass: 'Flammable / Toxic', storageTemp: 'Solvent Cabinet', sdsAvailable: true, category: 'Solvent' },
  ],
  addMasterChemical: (payload) => {
    const newItem = { id: `mc-${Date.now()}`, sdsAvailable: true, ...payload };
    set((state) => ({ masterChemicals: [newItem, ...state.masterChemicals] }));
    return newItem;
  },

  // Curriculum Practical Experiments
  curriculumExperiments: [
    // B.Pharm Semester 1
    { id: 'curr-1', course: 'B.Pharm', year: '1', semester: '1', subject: 'Pharmaceutics Lab - I', expNo: 'Exp 01', name: 'Formulation & Evaluation of Simple Syrup IP', requiredChemicals: 'Sucrose (66.7% w/w), Purified Water, Methylparaben' },
    { id: 'curr-2', course: 'B.Pharm', year: '1', semester: '1', subject: 'Pharmaceutics Lab - I', expNo: 'Exp 02', name: 'Preparation of Calamine Lotion IP', requiredChemicals: 'Calamine, Zinc Oxide, Bentonite, Glycerin' },
    { id: 'curr-3', course: 'B.Pharm', year: '1', semester: '1', subject: 'Pharmaceutical Analysis Lab', expNo: 'Exp 01', name: 'Assay of Paracetamol Tablets by UV-Vis Spectrophotometry', requiredChemicals: 'Paracetamol IP, 0.1M NaOH, Methanol' },
    { id: 'curr-4', course: 'B.Pharm', year: '1', semester: '1', subject: 'Inorganic Chemistry Lab', expNo: 'Exp 01', name: 'Limit Test for Chloride and Sulphate', requiredChemicals: 'Dilute Nitric Acid, Silver Nitrate, Barium Chloride' },

    // B.Pharm Semester 2
    { id: 'curr-5', course: 'B.Pharm', year: '1', semester: '2', subject: 'Pharmaceutical Organic Chemistry - I', expNo: 'Exp 01', name: 'Systematic Qualitative Analysis of Organic Compounds', requiredChemicals: 'HCl, NaOH, NaHCO3, Ether, Litmus Paper' },
    { id: 'curr-6', course: 'B.Pharm', year: '1', semester: '2', subject: 'Biochemistry Lab', expNo: 'Exp 01', name: 'Qualitative Analysis of Carbohydrates (Benedict & Barfoed Test)', requiredChemicals: 'Benedict Reagent, Barfoed Reagent, Glucose, Fructose' },

    // B.Pharm Semester 3
    { id: 'curr-7', course: 'B.Pharm', year: '2', semester: '3', subject: 'Physical Pharmaceutics - I', expNo: 'Exp 01', name: 'Viscosity Determination using Ostwald Viscometer', requiredChemicals: 'Glycerin Solutions, Ethanol, Distilled Water' },
    { id: 'curr-8', course: 'B.Pharm', year: '2', semester: '3', subject: 'Pharmaceutical Microbiology', expNo: 'Exp 01', name: 'Gram Staining Technique for Microorganisms', requiredChemicals: 'Crystal Violet, Gram Iodine, Decolorizer, Safranin' },

    // B.Pharm Semester 4
    { id: 'curr-9', course: 'B.Pharm', year: '2', semester: '4', subject: 'Medicinal Chemistry - I', expNo: 'Exp 01', name: 'Synthesis of Aspirin from Salicylic Acid', requiredChemicals: 'Salicylic Acid, Acetic Anhydride, Concentrated H2SO4' },
    { id: 'curr-10', course: 'B.Pharm', year: '2', semester: '4', subject: 'Pharmacognosy - I', expNo: 'Exp 01', name: 'Morphological & Microscopical Study of Senna Leaf', requiredChemicals: 'Chloral Hydrate, Phloroglucinol, Concentrated HCl' },

    // B.Pharm Semester 5
    { id: 'curr-11', course: 'B.Pharm', year: '3', semester: '5', subject: 'Industrial Pharmacy - I', expNo: 'Exp 01', name: 'Evaluation of Compressed Tablets (Friability & Hardness)', requiredChemicals: 'Paracetamol Granules, Magnesium Stearate, Talc' },

    // B.Pharm Semester 6
    { id: 'curr-12', course: 'B.Pharm', year: '3', semester: '6', subject: 'Biopharmaceutics & Pharmacokinetics', expNo: 'Exp 01', name: 'In-Vitro Dissolution Rate Testing of Oral Dosage Forms', requiredChemicals: '0.1N HCl dissolution medium, UV Cuvettes' },

    // B.Pharm Semester 7
    { id: 'curr-13', course: 'B.Pharm', year: '4', semester: '7', subject: 'Instrumental Methods of Analysis', expNo: 'Exp 01', name: 'HPLC Assay of Active Pharmaceutical Ingredients', requiredChemicals: 'Acetonitrile HPLC Grade, Water HPLC Grade, Methanol' },

    // B.Pharm Semester 8
    { id: 'curr-14', course: 'B.Pharm', year: '4', semester: '8', subject: 'Advanced Project Lab', expNo: 'Exp 01', name: 'Formulation of Polymeric Nanoparticles for Drug Delivery', requiredChemicals: 'PLGA, Dichloromethane, PVA (Polyvinyl Alcohol)' },

    // M.Pharm
    { id: 'curr-15', course: 'M.Pharm', year: '1', semester: '1', subject: 'Advanced Pharmaceutics', expNo: 'Exp 01', name: 'Formulation & Characterization of Liposomal Drug Delivery', requiredChemicals: 'Soya Lecithin, Cholesterol, Chloroform, Phosphate Buffer' },
    { id: 'curr-16', course: 'M.Pharm', year: '1', semester: '2', subject: 'Advanced Spectral Analysis', expNo: 'Exp 01', name: 'FTIR Spectral Interpretation & Structural Elucidation', requiredChemicals: 'KBr Pellets, Nujol, Sample Analytes' },

    // PhD / Research
    { id: 'curr-17', course: 'PhD', year: '1', semester: '1', subject: 'Molecular Research Lab', expNo: 'Exp 01', name: 'High-Throughput Cell Line Toxicity & Binding Assay', requiredChemicals: 'MTT Reagent, DMSO, PBS Buffer, Fetal Bovine Serum' },
  ],
  addCurriculumExperiment: (payload) => {
    const newItem = { id: `curr-${Date.now()}`, ...payload };
    set((state) => ({ curriculumExperiments: [newItem, ...state.curriculumExperiments] }));
    return newItem;
  },
  updateCurriculumExperiment: (id, updates) => {
    set((state) => ({
      curriculumExperiments: state.curriculumExperiments.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      )
    }));
  },
  deleteCurriculumExperiment: (id) => {
    set((state) => ({
      curriculumExperiments: state.curriculumExperiments.filter((item) => item.id !== id)
    }));
  },

  // Broadcast System & Announcements
  broadcastAnnouncements: [
    { id: 'bcast-1', title: 'Central Store Annual Stock Audit', message: 'Central Store will remain closed for inventory verification on Friday.', targetRole: 'All Users', active: true, createdAt: new Date().toISOString() },
    { id: 'bcast-2', title: 'Safety Inspection Reminder', message: 'All lab admins must verify fume hood performance before end of week.', targetRole: 'Lab Admins', active: true, createdAt: new Date().toISOString() },
  ],
  addBroadcastAnnouncement: (payload) => {
    const newItem = { id: `bcast-${Date.now()}`, active: true, createdAt: new Date().toISOString(), ...payload };
    set((state) => ({ broadcastAnnouncements: [newItem, ...state.broadcastAnnouncements] }));
    return newItem;
  },
  toggleBroadcastStatus: (id) => {
    set((state) => ({
      broadcastAnnouncements: state.broadcastAnnouncements.map((b) => (b.id === id ? { ...b, active: !b.active } : b))
    }));
  },

  // Global Feature Flags
  globalFeatureFlags: {
    teamRequestsEnabled: true,
    directStoreAccess: true,
    studentPreviewMode: true,
    autoApproveStudents: false,
    pciComplianceMode: true,
  },
  toggleFeatureFlag: (flagKey) => {
    set((state) => ({
      globalFeatureFlags: {
        ...state.globalFeatureFlags,
        [flagKey]: !state.globalFeatureFlags[flagKey]
      }
    }));
  },

  // User Account Suspension / Activation Toggle
  toggleUserStatus: async (userId) => {
    set((state) => ({
      users: state.users.map((u) => {
        if (u.id === userId || u._id === userId) {
          const isSuspended = u.isSuspended;
          return { ...u, isSuspended: !isSuspended };
        }
        return u;
      })
    }));
  },

  resetAppState: () =>
    set({
      labs: [],
      users: [],
      inventory: [],
      experiments: [],
      teams: [],
      eligibleTeamMembers: [],
      teamAllotments: [],
      storeItems: [],
      storeAllotments: [],
      transactions: [],
      activityLogs: [],
      loading: false,
      filters: { search: '', lab: 'All' },
      toast: null,
      highlight: null,
    }),
  setHighlight: (id) => {
    set({ highlight: id });
    setTimeout(() => set({ highlight: null }), 1000);
  }
}));

export default useAppStore;
