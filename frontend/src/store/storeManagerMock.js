import { create } from 'zustand';

export const INITIAL_CHEMICALS = [
  { 'Chemical ID': 'chem-1', 'Chemical Name': 'Hydrochloric Acid', 'Grade': 'LR', 'Pack Size': '500ml', 'Available Quantity': 500, 'Standard Unit': 'ml', 'Unit Price (INR)': 2, 'Hazard Class': 'Acid' },
  { 'Chemical ID': 'chem-2', 'Chemical Name': 'Sodium Hydroxide', 'Grade': 'AR', 'Pack Size': '100g', 'Available Quantity': 8, 'Standard Unit': 'g', 'Unit Price (INR)': 5, 'Hazard Class': 'Base' },
  { 'Chemical ID': 'chem-3', 'Chemical Name': 'Ethanol', 'Grade': 'LR', 'Pack Size': '1L', 'Available Quantity': 0, 'Standard Unit': 'L', 'Unit Price (INR)': 150, 'Hazard Class': 'Solvent' },
];

export const INITIAL_REQUESTS = [
  // Pending
  { id: 'req-1', lab: 'Chemistry Lab 1', chemicalName: 'ACETONE LR', chemicalId: '37022-125', quantity: 500, unit: 'ml', status: 'Pending', date: new Date().toISOString() },
  { id: 'req-2', lab: 'Physics Lab 1', chemicalName: 'ACETYLACETONE LR', chemicalId: '37035-L02', quantity: 100, unit: 'ml', status: 'Pending', date: new Date().toISOString() },
  { id: 'req-3', lab: 'Biology Lab 1', chemicalName: 'ACRYLAMIDE LR', chemicalId: '37045-K05', quantity: 50, unit: 'g', status: 'Pending', date: new Date().toISOString() },
  { id: 'req-4', lab: 'Chemistry Lab 2', chemicalName: 'AMMONIA SOLN 30%', chemicalId: '37139-L05', quantity: 250, unit: 'ml', status: 'Pending', date: new Date().toISOString() },
  // Approved Mock Data (June)
  { id: 'req-jun-1', lab: 'Chemistry Lab 1', chemicalName: 'ACETONE LR', chemicalId: '37022-125', quantity: 500, unit: 'ml', status: 'Approved', date: '2026-06-15T10:00:00Z', receiptNumber: 'RF-2026-7' },
  { id: 'req-jun-2', lab: 'Biology Lab 1', chemicalName: 'AMMONIA SOLN 30%', chemicalId: '37139-L05', quantity: 250, unit: 'ml', status: 'Approved', date: '2026-06-20T10:00:00Z', receiptNumber: 'RF-2026-8' },
  { id: 'req-jun-3', lab: 'Physics Lab 1', chemicalName: 'ACRYLAMIDE LR', chemicalId: '37045-K05', quantity: 50, unit: 'g', status: 'Approved', date: '2026-06-25T10:00:00Z', receiptNumber: 'RF-2026-9' },
  // Approved Mock Data (May)
  { id: 'req-may-1', lab: 'Chemistry Lab 2', chemicalName: 'ACETONE LR', chemicalId: '37022-125', quantity: 1000, unit: 'ml', status: 'Approved', date: '2026-05-10T10:00:00Z', receiptNumber: 'RF-2026-4' },
  { id: 'req-may-2', lab: 'Chemistry Lab 1', chemicalName: 'ACETYLACETONE LR', chemicalId: '37035-L02', quantity: 100, unit: 'ml', status: 'Approved', date: '2026-05-15T10:00:00Z', receiptNumber: 'RF-2026-5' },
  { id: 'req-may-3', lab: 'Biology Lab 1', chemicalName: 'AMMONIA SOLN 30%', chemicalId: '37139-L05', quantity: 500, unit: 'ml', status: 'Approved', date: '2026-05-20T10:00:00Z', receiptNumber: 'RF-2026-6' },
  // Approved Mock Data (April)
  { id: 'req-apr-1', lab: 'Chemistry Lab 3', chemicalName: 'ACRYLAMIDE LR', chemicalId: '37045-K05', quantity: 100, unit: 'g', status: 'Approved', date: '2026-04-05T10:00:00Z', receiptNumber: 'RF-2026-1' },
  { id: 'req-apr-2', lab: 'Physics Lab 1', chemicalName: 'ACETONE LR', chemicalId: '37022-125', quantity: 750, unit: 'ml', status: 'Approved', date: '2026-04-12T10:00:00Z', receiptNumber: 'RF-2026-2' },
  { id: 'req-apr-3', lab: 'Biology Lab 1', chemicalName: 'ACETYLACETONE LR', chemicalId: '37035-L02', quantity: 200, unit: 'ml', status: 'Approved', date: '2026-04-18T10:00:00Z', receiptNumber: 'RF-2026-3' },
];

export const INITIAL_HISTORY = [
  // June 2026 approvals
  { id: 'hist-jun-1', chemicalName: 'ACETONE LR', chemicalId: '37022-125', lab: 'Chemistry Lab 1', qtyRequestedBase: 500, baseUnit: 'ml', qtyBefore: 10, totalValueBefore: 10000, totalValueAfter: 10000 - 761, status: 'Approved', date: '2026-06-15T10:00:00Z', receiptNumber: 'RF-2026-7' },
  { id: 'hist-jun-2', chemicalName: 'AMMONIA SOLN 30%', chemicalId: '37139-L05', lab: 'Biology Lab 1', qtyRequestedBase: 250, baseUnit: 'ml', qtyBefore: 10, totalValueBefore: 5000, totalValueAfter: 5000 - 165.50, status: 'Approved', date: '2026-06-20T10:00:00Z', receiptNumber: 'RF-2026-8' },
  { id: 'hist-jun-3', chemicalName: 'ACRYLAMIDE LR', chemicalId: '37045-K05', lab: 'Physics Lab 1', qtyRequestedBase: 50, baseUnit: 'g', qtyBefore: 5, totalValueBefore: 1000, totalValueAfter: 1000 - 63.80, status: 'Approved', date: '2026-06-25T10:00:00Z', receiptNumber: 'RF-2026-9' },
  // May 2026 approvals
  { id: 'hist-may-1', chemicalName: 'ACETONE LR', chemicalId: '37022-125', lab: 'Chemistry Lab 2', qtyRequestedBase: 1000, baseUnit: 'ml', qtyBefore: 15, totalValueBefore: 15000, totalValueAfter: 15000 - 1521, status: 'Approved', date: '2026-05-10T10:00:00Z', receiptNumber: 'RF-2026-4' },
  { id: 'hist-may-2', chemicalName: 'ACETYLACETONE LR', chemicalId: '37035-L02', lab: 'Chemistry Lab 1', qtyRequestedBase: 100, baseUnit: 'ml', qtyBefore: 5, totalValueBefore: 5000, totalValueAfter: 5000 - 362, status: 'Approved', date: '2026-05-15T10:00:00Z', receiptNumber: 'RF-2026-5' },
  { id: 'hist-may-3', chemicalName: 'AMMONIA SOLN 30%', chemicalId: '37139-L05', lab: 'Biology Lab 1', qtyRequestedBase: 500, baseUnit: 'ml', qtyBefore: 12, totalValueBefore: 6000, totalValueAfter: 6000 - 331, status: 'Approved', date: '2026-05-20T10:00:00Z', receiptNumber: 'RF-2026-6' },
  // April 2026 approvals
  { id: 'hist-apr-1', chemicalName: 'ACRYLAMIDE LR', chemicalId: '37045-K05', lab: 'Chemistry Lab 3', qtyRequestedBase: 100, baseUnit: 'g', qtyBefore: 6, totalValueBefore: 1200, totalValueAfter: 1200 - 127.60, status: 'Approved', date: '2026-04-05T10:00:00Z', receiptNumber: 'RF-2026-1' },
  { id: 'hist-apr-2', chemicalName: 'ACETONE LR', chemicalId: '37022-125', lab: 'Physics Lab 1', qtyRequestedBase: 750, baseUnit: 'ml', qtyBefore: 20, totalValueBefore: 20000, totalValueAfter: 20000 - 1140.75, status: 'Approved', date: '2026-04-12T10:00:00Z', receiptNumber: 'RF-2026-2' },
  { id: 'hist-apr-3', chemicalName: 'ACETYLACETONE LR', chemicalId: '37035-L02', lab: 'Biology Lab 1', qtyRequestedBase: 200, baseUnit: 'ml', qtyBefore: 6, totalValueBefore: 6000, totalValueAfter: 6000 - 724, status: 'Approved', date: '2026-04-18T10:00:00Z', receiptNumber: 'RF-2026-3' },
  
  // Example invalid dummy entry to test ignoring
  { id: 'hist-invalid-1', chemicalName: 'OLD DUMMY', chemicalId: '000-00', lab: 'Test', qtyRequestedBase: 100, baseUnit: 'g', qtyBefore: 0, totalValueBefore: 0, totalValueAfter: 0, status: 'Approved', date: '2026-06-10T10:00:00Z' }
];

export function parsePackSize(packSizeStr) {
  if (!packSizeStr) return { value: 1, unit: 'ml' };
  const str = packSizeStr.toLowerCase().trim();
  const match = str.match(/^([\d.]+)\s*(ml|l|g|kg|mg)$/);
  if (!match) return { value: 1, unit: 'ml' };
  
  let val = parseFloat(match[1]);
  let unit = match[2];
  
  if (unit === 'l') { val *= 1000; unit = 'ml'; }
  else if (unit === 'kg') { val *= 1000; unit = 'g'; }
  else if (unit === 'mg') { val /= 1000; unit = 'g'; }
  
  return { value: val, unit };
}

export function calcTotalChemical(qty, packSizeStr) {
  if (!packSizeStr) return '--';
  const str = String(packSizeStr).trim();
  if (str.toUpperCase().includes('UNT')) {
    return str;
  }
  const match = str.match(/^([\d.]+)\s*(.*)$/);
  if (match) {
    const num = Number(match[1]);
    const unit = match[2].trim();
    if (!isNaN(num)) {
      return `${qty * num} ${unit}`;
    }
  }
  return str;
}

export const INITIAL_TRACKING_LOGS = INITIAL_CHEMICALS.map(c => ({
  trackId: `init-${c['Chemical ID']}`,
  timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
  chemicalId: c['Chemical ID'],
  chemicalName: c['Chemical Name'],
  casNumber: c['CAS Number'] || '',
  formula: c['Molecular Formula'] || '',
  smiles: c['SMILES ID'] || '',
  grade: c['Grade'] || '',
  packSize: c['Pack Size'] || '',
  updateType: 'Added New',
  previousQty: 0,
  newQty: c['Available Quantity'],
  qtyChange: c['Available Quantity'],
  previousPrice: 0,
  newPrice: c['Unit Price (INR)'],
  totalChemical: calcTotalChemical(c['Available Quantity'], c['Pack Size']),
  totalPrice: c['Available Quantity'] * c['Unit Price (INR)'],
  totalValue: c['Available Quantity'] * c['Unit Price (INR)'],
  status: getChemicalStatus(c['Available Quantity']),
  snapshot: { ...c }
}));

export const SHEET_IMPORT_HEADERS = [
  'Chemical ID',
  'Chemical Name',
  'CAS Number',
  'Synonyms',
  'SMILES ID',
  'PubChem Link URL',
  'Molecular Formula',
  'Molecular Weight',
  'InChI Key',
  'Supplier',
  'Batch Number',
  'Invoice Number',
  'Grade',
  'Pack Size',
  'Standard Unit',
  'Purchase Price (INR)',
  'Unit Price (INR)',
  'Price Per Unit (1g / 1ml)',
  'Received Quantity',
  'Available Quantity',
  'Hazard Class',
  'Safety Wear'
];

export function getChemicalStatus(quantity) {
  const amount = Number(quantity || 0);
  if (amount <= 0) return 'Out of Stock';
  if (amount <= 10) return 'Low Stock';
  return 'In Stock';
}

export function formatQuantity(quantity, unit) {
  return `${Number(quantity || 0)} ${unit || ''}`.trim();
}

const normalizeChemical = (chemical) => {
  const availableQuantity = Number(chemical['Available Quantity'] || chemical.quantity || 0);
  const unitPrice = Number(chemical['Unit Price (INR)'] || chemical.unitPrice || 0);
  const receivedQuantity = Number(chemical['Received Quantity'] || 0);
  const purchasePrice = Number(chemical['Purchase Price (INR)'] || 0);

  const packSize = String(chemical['Pack Size'] || '').trim();
  const packSizeValueMatch = packSize.match(/[\d.]+/);
  const packSizeValue = packSizeValueMatch ? Number(packSizeValueMatch[0]) : 0;
  const packSizeUnit = packSize.replace(/[\d.\s]/g, '');
  
  const totalVolume = packSizeValue * receivedQuantity;
  const totalVolumeStr = `${totalVolume}${packSizeUnit}`;
  const pricePerUnit = totalVolume > 0 ? (purchasePrice / totalVolume).toFixed(2) : '0';
  
  return {
    ...chemical,
    id: chemical.id || String(chemical['Chemical ID'] || `chem-${Date.now()}`).trim(),
    'Chemical ID': String(chemical['Chemical ID'] || chemical.id || `chem-${Date.now()}`).trim(),
    'Chemical Name': String(chemical['Chemical Name'] || chemical.name || '').trim(),
    'CAS Number': String(chemical['CAS Number'] || '').trim(),
    'Synonyms': String(chemical['Synonyms'] || '').trim(),
    'SMILES ID': String(chemical['SMILES ID'] || '').trim(),
    'PubChem Link URL': String(chemical['PubChem Link URL'] || '').trim(),
    'Molecular Formula': String(chemical['Molecular Formula'] || '').trim(),
    'Molecular Weight': String(chemical['Molecular Weight'] || '').trim(),
    'InChI Key': String(chemical['InChI Key'] || '').trim(),
    'Supplier': String(chemical['Supplier'] || '').trim(),
    'Batch Number': String(chemical['Batch Number'] || '').trim(),
    'Invoice Number': String(chemical['Invoice Number'] || '').trim(),
    'Grade': String(chemical['Grade'] || 'LR').trim(),
    'Pack Size': packSize,
    'Standard Unit': String(chemical['Standard Unit'] || chemical.unit || 'UNT').trim(),
    'Purchase Price (INR)': purchasePrice,
    'Unit Price (INR)': unitPrice,
    'Price Per Unit (1g / 1ml)': Number(chemical['Price Per Unit (1g / 1ml)'] || 0),
    'Received Quantity': receivedQuantity,
    'Available Quantity': availableQuantity,
    'Hazard Class': String(chemical['Hazard Class'] || chemical.category || '').trim(),
    'Safety Wear': String(chemical['Safety Wear'] || '').trim(),
    
    // Auto-calculated fields
    status: getChemicalStatus(availableQuantity),
    'Total Value (INR)': unitPrice * availableQuantity,
    'Total Current Value (INR)': unitPrice * availableQuantity,
    'Total Volume': totalVolumeStr,
    'Price Per ml/g (INR)': pricePerUnit,
    
    // Legacy mappings so existing requests/history don't break
    name: String(chemical['Chemical Name'] || chemical.name || '').trim(),
    category: String(chemical['Hazard Class'] || chemical.category || '').trim(),
    quantity: availableQuantity,
    unit: String(chemical['Standard Unit'] || chemical.unit || 'UNT').trim(),
    
    sheetData: chemical.sheetData || null,
  };
};

function createTrackingLog(chemical, updateType, previousQty, previousPrice, newQty, newPrice) {
  return {
    trackId: `track-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    timestamp: new Date().toISOString(),
    chemicalId: chemical['Chemical ID'],
    chemicalName: chemical['Chemical Name'],
    casNumber: chemical['CAS Number'],
    formula: chemical['Molecular Formula'],
    smiles: chemical['SMILES ID'],
    grade: chemical['Grade'],
    packSize: chemical['Pack Size'],
    updateType,
    previousQty,
    newQty,
    qtyChange: newQty - previousQty,
    previousPrice,
    newPrice,
    totalChemical: calcTotalChemical(newQty, chemical['Pack Size']),
    totalPrice: newQty * newPrice,
    totalValue: newQty * newPrice,
    status: getChemicalStatus(newQty),
    snapshot: { ...chemical }
  };
}

const useStoreManagerMock = create((set, get) => ({
  chemicals: INITIAL_CHEMICALS,
  requests: INITIAL_REQUESTS,
  history: INITIAL_HISTORY,
  trackingLogs: INITIAL_TRACKING_LOGS,
  alertThreshold: 15,
  receiptCounter: 10,
  setAlertThreshold: (value) => set({ alertThreshold: value }),
  addChemical: (chemical) => {
    let normalized;
    set((state) => {
      normalized = normalizeChemical({
        ...chemical,
        id: `chem-${Date.now()}`,
        status: chemical.status || getChemicalStatus(chemical.quantity),
      });
      const logEntry = createTrackingLog(normalized, 'Added New', 0, 0, normalized['Available Quantity'], normalized['Unit Price (INR)']);
      return { 
        chemicals: [normalized, ...state.chemicals],
        trackingLogs: [logEntry, ...state.trackingLogs]
      };
    });
    return normalized;
  },
  addChemicals: (chemicals, mode = 'merge') => {
    let added = 0;
    let updated = 0;

    set((state) => {
      const newLogs = [];
      let newChemicalsList = [...state.chemicals];

      chemicals.forEach((chemical, index) => {
        const chemId = String(chemical['Chemical ID'] || chemical.id || '').trim();
        const chemName = String(chemical['Chemical Name'] || chemical.name || '').trim().toLowerCase();

        let existingIndex = -1;
        if (chemId) {
          existingIndex = newChemicalsList.findIndex(c => c['Chemical ID'] === chemId || c.id === chemId);
        }
        if (existingIndex === -1 && chemName) {
          existingIndex = newChemicalsList.findIndex(c => String(c['Chemical Name'] || '').trim().toLowerCase() === chemName);
        }

        if (existingIndex !== -1) {
          updated++;
          const oldChem = newChemicalsList[existingIndex];
          
          const uploadedAvailableQty = Number(chemical['Available Quantity'] || chemical.quantity || 0);
          const uploadedReceivedQty = Number(chemical['Received Quantity'] || 0);
          
          const newChemRaw = {
            ...oldChem,
            'Unit Price (INR)': chemical['Unit Price (INR)'] !== undefined && chemical['Unit Price (INR)'] !== '' ? chemical['Unit Price (INR)'] : oldChem['Unit Price (INR)'],
            'Purchase Price (INR)': chemical['Purchase Price (INR)'] !== undefined && chemical['Purchase Price (INR)'] !== '' ? chemical['Purchase Price (INR)'] : oldChem['Purchase Price (INR)'],
            'Pack Size': chemical['Pack Size'] !== undefined && chemical['Pack Size'] !== '' ? chemical['Pack Size'] : oldChem['Pack Size'],
            'Available Quantity': oldChem['Available Quantity'] + uploadedAvailableQty,
            'Received Quantity': oldChem['Received Quantity'] + uploadedReceivedQty,
          };
          
          const newChem = normalizeChemical({
            ...newChemRaw,
            id: oldChem.id,
            'Chemical ID': oldChem['Chemical ID'],
            'Chemical Name': oldChem['Chemical Name'],
            'CAS Number': oldChem['CAS Number'],
            'Molecular Formula': oldChem['Molecular Formula'],
            'SMILES ID': oldChem['SMILES ID'],
            'Grade': oldChem['Grade'],
            'Hazard Class': oldChem['Hazard Class'],
            'Safety Wear': oldChem['Safety Wear'],
          });
          
          newChemicalsList[existingIndex] = newChem;
          newLogs.push(createTrackingLog(
            newChem, 
            'Stock Replenishment', 
            oldChem['Available Quantity'], 
            oldChem['Unit Price (INR)'],
            newChem['Available Quantity'],
            newChem['Unit Price (INR)']
          ));
        } else {
          added++;
          const newChem = normalizeChemical({
            ...chemical,
            id: chemId || `bulk-${Date.now()}-${index}`,
          });
          newChemicalsList.unshift(newChem);
          newLogs.push(createTrackingLog(newChem, 'Bulk Upload', 0, 0, newChem['Available Quantity'], newChem['Unit Price (INR)']));
        }
      });

      return { chemicals: newChemicalsList, trackingLogs: [...newLogs, ...state.trackingLogs] };
    });

    return { added, updated };
  },
  updateChemical: (chemicalId, updates) => {
    set((state) => {
      const newChemicals = [...state.chemicals];
      const newLogs = [];
      
      const idx = newChemicals.findIndex(c => c.id === chemicalId || c['Chemical ID'] === chemicalId);
      if (idx !== -1) {
        const oldChem = newChemicals[idx];
        const newChem = normalizeChemical({
          ...oldChem,
          ...updates,
          id: oldChem.id,
        });
        newChemicals[idx] = newChem;
        newLogs.push(createTrackingLog(
          newChem,
          'Manual Edit',
          oldChem['Available Quantity'],
          oldChem['Unit Price (INR)'],
          newChem['Available Quantity'],
          newChem['Unit Price (INR)']
        ));
      }
      
      return { 
        chemicals: newChemicals,
        trackingLogs: newLogs.length ? [...newLogs, ...state.trackingLogs] : state.trackingLogs
      };
    });
  },
  deleteChemical: (chemicalId) => {
    set((state) => ({ chemicals: state.chemicals.filter((chemical) => chemical.id !== chemicalId) }));
  },
  reviewRequest: (requestId, nextStatus, reason = '') => {
    const request = get().requests.find((entry) => entry.id === requestId);
    if (!request) return null;

    set((state) => {
      const reviewedRequest = { ...request, status: nextStatus };
      let newHistoryEntry = null;

      const chemicals = state.chemicals.map((chemical) => {
        if (chemical['Chemical ID'] === request.chemicalId || chemical['Chemical Name'] === request.chemicalName) {
          const currentQty = Number(chemical['Available Quantity'] || 0);
          const unitPrice = Number(chemical['Unit Price (INR)'] || 0);
          const reqQty = Number(request.quantity || 0);
          
          const packData = parsePackSize(chemical['Pack Size']);
          const totalBaseAvailable = currentQty * packData.value;

          if (nextStatus === 'Approved') {
            const remainingBase = Math.max(0, totalBaseAvailable - reqQty);
            const nextQuantityUNT = Math.round((remainingBase / packData.value) * 100) / 100;
            const newReceiptNum = `RF-2026-${state.receiptCounter}`;
            reviewedRequest.receiptNumber = newReceiptNum;
            
            newHistoryEntry = {
              id: `hist-${Date.now()}`,
              chemicalName: chemical['Chemical Name'],
              chemicalId: chemical['Chemical ID'],
              lab: request.lab,
              qtyBefore: currentQty,
              qtyBeforeBase: totalBaseAvailable,
              qtyRequestedBase: reqQty,
              qtyAfter: nextQuantityUNT,
              qtyAfterBase: remainingBase,
              baseUnit: packData.unit,
              unitPrice,
              totalValueBefore: currentQty * unitPrice,
              totalValueAfter: nextQuantityUNT * unitPrice,
              actionBy: 'Store Manager',
              date: new Date().toISOString(),
              status: 'Approved',
              reason,
              receiptNumber: newReceiptNum
            };
            return normalizeChemical({ ...chemical, 'Available Quantity': nextQuantityUNT, quantity: nextQuantityUNT });
          }
        }
        return chemical;
      });

      if (nextStatus === 'Rejected') {
        const chemical = state.chemicals.find(c => c['Chemical ID'] === request.chemicalId || c['Chemical Name'] === request.chemicalName) || {};
        const currentQty = Number(chemical['Available Quantity'] || 0);
        const unitPrice = Number(chemical['Unit Price (INR)'] || 0);
        const packData = parsePackSize(chemical['Pack Size']);
        const totalBaseAvailable = currentQty * packData.value;
        const reqQty = Number(request.quantity || 0);
        
        newHistoryEntry = {
          id: `hist-${Date.now()}`,
          chemicalName: request.chemicalName,
          chemicalId: request.chemicalId,
          lab: request.lab,
          qtyBefore: currentQty,
          qtyBeforeBase: totalBaseAvailable,
          qtyRequestedBase: reqQty,
          qtyAfter: currentQty,
          qtyAfterBase: totalBaseAvailable,
          baseUnit: packData.unit,
          unitPrice,
          totalValueBefore: currentQty * unitPrice,
          totalValueAfter: currentQty * unitPrice,
          actionBy: 'Store Manager',
          date: new Date().toISOString(),
          status: 'Rejected',
          reason
        };
      }

      return {
        chemicals,
        requests: state.requests.map((entry) => (entry.id === requestId ? reviewedRequest : entry)),
        history: newHistoryEntry ? [newHistoryEntry, ...state.history] : state.history,
        receiptCounter: nextStatus === 'Approved' ? state.receiptCounter + 1 : state.receiptCounter,
      };
    });

    return { ...request, status: nextStatus };
  },
}));

export default useStoreManagerMock;
