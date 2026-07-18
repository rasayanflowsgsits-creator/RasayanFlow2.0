export const parseNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  let str = String(value).trim();
  
  if (str.includes(',') && !str.includes('.')) {
    if (/,(\d{1,2})$/.test(str)) {
      str = str.replace(',', '.');
    }
  }
  
  const cleaned = str.replace(/,/g, '');
  if (!cleaned) return 0;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : 0;
};

export const toFrontendChemical = (chem) => ({
  id: chem._id || chem.id,
  'Chemical ID': chem.chemicalId || '',
  'Chemical Name': chem.name || '',
  'CAS Number': chem.cas || '',
  'Synonyms': chem.synonyms || '',
  'SMILES ID': chem.smiles || '',
  'PubChem Link URL': chem.pubchemUrl || '',
  'Molecular Formula': chem.formula || '',
  'Molecular Weight': chem.molecularWeight || '',
  'InChI Key': chem.inchiKey || '',
  'Supplier': chem.supplier || '',
  'Batch Number': chem.batchNumber || '',
  'Invoice Number': chem.invoiceNumber || '',
  'Grade': chem.grade || 'LR',
  'Pack Size': chem.packSize || '',
  'Standard Unit': chem.unit || 'UNT',
  'Purchase Price (INR)': chem.purchasePrice || '',
  'Unit Price (INR)': chem.unitPrice || '',
  'Price Per Unit (1g / 1ml)': chem.pricePerUnit || '',
  'Received Quantity': chem.receivedQty || '',
  'Available Quantity': chem.availableQty || 0,
  'Hazard Class': chem.hazard || '',
  'Safety Wear': chem.safety || '',
  'Total Current Value (INR)': chem.totalValue || 0,
  status: chem.status || 'In Stock',
  _raw: chem
});

export const toBackendChemical = (chem) => ({
  chemicalId: chem['Chemical ID'] || '',
  name: chem['Chemical Name'] || '',
  cas: chem['CAS Number'] || '',
  synonyms: chem['Synonyms'] || '',
  smiles: chem['SMILES ID'] || '',
  pubchemUrl: chem['PubChem Link URL'] || '',
  formula: chem['Molecular Formula'] || '',
  molecularWeight: chem['Molecular Weight'] || '',
  inchiKey: chem['InChI Key'] || '',
  supplier: chem['Supplier'] || '',
  batchNumber: chem['Batch Number'] || '',
  invoiceNumber: chem['Invoice Number'] || '',
  grade: chem['Grade'] || 'LR',
  packSize: chem['Pack Size'] || '',
  unit: chem['Standard Unit'] || 'UNT',
  purchasePrice: parseNumber(chem['Purchase Price (INR)']),
  unitPrice: parseNumber(chem['Unit Price (INR)']),
  pricePerUnit: parseNumber(chem['Price Per Unit (1g / 1ml)']),
  receivedQty: parseNumber(chem['Received Quantity']),
  availableQty: parseNumber(chem['Available Quantity']),
  hazard: chem['Hazard Class'] || '',
  safety: chem['Safety Wear'] || '',
  reorderLevel: 2
});

export const toFrontendRequest = (req) => ({
  id: req._id || req.requestId || req.id,
  lab: req.labName || (req.labId ? req.labId.name : null) || 'Unknown Lab',
  chemicalName: req.chemicalName || '',
  chemicalId: req.chemicalId || '',
  casNumber: req.casNumber || '',
  quantity: req.quantityRequested || req.quantity || 0,
  unit: req.unit || 'UNT',
  status: req.status || 'Pending',
  date: req.requestedAt || req.createdAt || new Date().toISOString(),
  receiptNumber: req.receiptNumber || '',
  reason: req.reason || '',
  _raw: req
});

export const toFrontendHistory = (hist) => ({
  id: hist._id || hist.id,
  type: hist.type || 'Store Transfer',
  chemicalName: hist.chemicalName || '',
  chemicalId: hist.chemicalId || '',
  lab: hist.labName || (hist.labId ? hist.labId.name : null) || hist.labId || 'Unknown Lab',
  
  qtyBeforeUNT: hist.qtyBeforeUNT || 0,
  qtyAfterUNT: hist.qtyAfterUNT || 0,
  
  qtyRequestedBase: hist.qtyRequestedBase || hist.quantityRequested || 0,
  qtyRequested: hist.quantityRequested || hist.qtyRequestedBase || 0,
  qtyBeforeBase: hist.qtyBeforeBase || hist.quantityBefore || 0,
  qtyAfterBase: hist.qtyAfterBase || hist.quantityAfter || 0,
  
  baseUnit: hist.baseUnit || hist.unit || '',
  unit: hist.unit || hist.baseUnit || '',
  
  totalValueBefore: hist.valueBefore || 0,
  totalValueAfter: hist.valueAfter || 0,
  valueReleased: hist.valueReleased || 0,
  
  unitPrice: hist.unitPrice || 0,
  costPerBase: hist.costPerBase || 0,
  
  status: hist.action || '',
  date: hist.timestamp || hist.createdAt || new Date().toISOString(),
  receiptNumber: hist.receiptNumber || '',
  actionBy: hist.approvedBy || '',
  reason: hist.reason || '',
  _raw: hist
});
