import { create } from 'zustand';

export const INITIAL_CHEMICALS = [
  { id: 'chem-1', name: 'Hydrochloric Acid', category: 'Acid', quantity: 500, unit: 'ml', status: 'In Stock' },
  { id: 'chem-2', name: 'Sodium Hydroxide', category: 'Base', quantity: 80, unit: 'grams', status: 'Low Stock' },
  { id: 'chem-3', name: 'Ethanol', category: 'Solvent', quantity: 0, unit: 'liters', status: 'Out of Stock' },
  { id: 'chem-4', name: 'Sulfuric Acid', category: 'Acid', quantity: 250, unit: 'ml', status: 'In Stock' },
  { id: 'chem-5', name: 'Acetone', category: 'Solvent', quantity: 60, unit: 'ml', status: 'Low Stock' },
  { id: 'chem-6', name: 'Benzene', category: 'Solvent', quantity: 500, unit: 'ml', status: 'In Stock' },
  { id: 'chem-7', name: 'Copper Sulfate', category: 'Salt', quantity: 200, unit: 'grams', status: 'In Stock' },
  { id: 'chem-8', name: 'Nitric Acid', category: 'Acid', quantity: 300, unit: 'ml', status: 'In Stock' },
];

export const INITIAL_REQUESTS = [
  { id: 'req-1', lab: 'Chemistry Lab 1', chemicalName: 'Hydrochloric Acid', quantity: 100, unit: 'ml', status: 'Pending' },
  { id: 'req-2', lab: 'Chemistry Lab 2', chemicalName: 'Ethanol', quantity: 20, unit: 'liters', status: 'Pending' },
  { id: 'req-3', lab: 'Physics Lab 1', chemicalName: 'Acetone', quantity: 50, unit: 'ml', status: 'Approved' },
  { id: 'req-4', lab: 'Chemistry Lab 3', chemicalName: 'Sodium Hydroxide', quantity: 30, unit: 'grams', status: 'Rejected' },
  { id: 'req-5', lab: 'Biology Lab 1', chemicalName: 'Benzene', quantity: 100, unit: 'ml', status: 'Pending' },
];

export const INITIAL_HISTORY = [
  { id: 'hist-1', chemicalName: 'Acetone', lab: 'Physics Lab 1', quantity: 50, unit: 'ml', status: 'Approved' },
  { id: 'hist-2', chemicalName: 'Sodium Hydroxide', lab: 'Chemistry Lab 3', quantity: 30, unit: 'grams', status: 'Rejected' },
  { id: 'hist-3', chemicalName: 'Nitric Acid', lab: 'Chemistry Lab 2', quantity: 100, unit: 'ml', status: 'Approved' },
];

export function getChemicalStatus(quantity, fallback = 'In Stock') {
  const amount = Number(quantity || 0);
  if (amount <= 0) return 'Out of Stock';
  if (amount <= 80) return 'Low Stock';
  return fallback === 'Out of Stock' ? 'In Stock' : fallback;
}

export function formatQuantity(quantity, unit) {
  return `${Number(quantity || 0)} ${unit || 'units'}`.trim();
}

const normalizeChemical = (chemical) => ({
  id: chemical.id || `chem-${Date.now()}`,
  name: String(chemical.name || '').trim(),
  category: String(chemical.category || '').trim(),
  quantity: Number(chemical.quantity || 0),
  unit: String(chemical.unit || 'ml').trim(),
  status: chemical.status || getChemicalStatus(chemical.quantity),
});

const useStoreManagerMock = create((set, get) => ({
  chemicals: INITIAL_CHEMICALS,
  requests: INITIAL_REQUESTS,
  history: INITIAL_HISTORY,
  addChemical: (chemical) => {
    const normalized = normalizeChemical({
      ...chemical,
      id: `chem-${Date.now()}`,
      status: chemical.status || getChemicalStatus(chemical.quantity),
    });
    set((state) => ({ chemicals: [normalized, ...state.chemicals] }));
    return normalized;
  },
  addChemicals: (chemicals) => {
    const normalizedChemicals = chemicals.map((chemical, index) =>
      normalizeChemical({
        ...chemical,
        id: `bulk-${Date.now()}-${index}`,
        status: chemical.status || getChemicalStatus(chemical.quantity),
      })
    );
    set((state) => ({ chemicals: [...normalizedChemicals, ...state.chemicals] }));
    return normalizedChemicals.length;
  },
  updateChemical: (chemicalId, updates) => {
    set((state) => ({
      chemicals: state.chemicals.map((chemical) =>
        chemical.id === chemicalId
          ? normalizeChemical({
              ...chemical,
              ...updates,
              id: chemical.id,
              status: updates.status || getChemicalStatus(updates.quantity ?? chemical.quantity, chemical.status),
            })
          : chemical
      ),
    }));
  },
  deleteChemical: (chemicalId) => {
    set((state) => ({ chemicals: state.chemicals.filter((chemical) => chemical.id !== chemicalId) }));
  },
  reviewRequest: (requestId, nextStatus) => {
    const request = get().requests.find((entry) => entry.id === requestId);
    if (!request) return null;

    set((state) => {
      const reviewedRequest = { ...request, status: nextStatus };
      const chemicals =
        nextStatus === 'Approved'
          ? state.chemicals.map((chemical) => {
              if (chemical.name !== request.chemicalName) return chemical;
              const nextQuantity = Math.max(0, Number(chemical.quantity || 0) - Number(request.quantity || 0));
              return { ...chemical, quantity: nextQuantity, status: getChemicalStatus(nextQuantity, chemical.status) };
            })
          : state.chemicals;

      return {
        chemicals,
        requests: state.requests.map((entry) => (entry.id === requestId ? reviewedRequest : entry)),
        history: [
          {
            id: `hist-${Date.now()}`,
            chemicalName: request.chemicalName,
            lab: request.lab,
            quantity: request.quantity,
            unit: request.unit,
            status: nextStatus,
          },
          ...state.history,
        ],
      };
    });

    return { ...request, status: nextStatus };
  },
}));

export default useStoreManagerMock;
