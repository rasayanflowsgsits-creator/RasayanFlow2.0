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

export const COLUMN_ALIASES = {
  'Chemical Name': ['chemical name', 'chemical', 'name', 'item name', 'item', 'chemical_name', 'compound', 'compound name', 'title'],
  'CAS Number': ['cas number', 'cas', 'cas no', 'cas no.', 'cas_number', 'cas#', 'cas code'],
  'Pack Size': ['pack size', 'package size', 'pack_size', 'package_size', 'packaging', 'size', 'pack', 'bottle size'],
  'Standard Unit': ['standard unit', 'unit', 'units', 'qty unit', 'quantity unit', 'uom', 'measurement'],
  'Purchase Price (INR)': ['purchase price (inr)', 'purchase price inr', 'purchase price', 'purchasing price', 'purchase_price', 'price', 'unit price (inr)', 'unit price inr', 'unit price', 'rate', 'cost', 'cost price', 'mrp'],
  'Unit Price (INR)': ['unit price (inr)', 'unit price inr', 'unit price', 'purchase price (inr)', 'purchase price inr', 'purchase price', 'purchasing price', 'price', 'rate', 'cost'],
  'Available Quantity': ['available quantity', 'available qty', 'quantity', 'qty', 'stock', 'available stock', 'current stock', 'balance', 'count', 'units in stock', 'in stock', 'received quantity', 'received qty'],
  'Received Quantity': ['received quantity', 'received qty', 'total received', 'available quantity', 'available qty', 'quantity', 'qty', 'stock', 'opening stock'],
  'Grade': ['grade', 'purity grade', 'purity', 'quality', 'chemical grade'],
  'Chemical ID': ['chemical id', 'id', 'item id', 'code', 'item code', 'chem id', 'catalog no', 'catalog number', 'cat no', 'item_code'],
  'Supplier': ['supplier', 'vendor', 'manufacturer', 'make', 'company', 'distributor', 'brand'],
  'Batch Number': ['batch number', 'batch no', 'batch no.', 'lot number', 'lot no', 'lot no.', 'batch', 'lot'],
  'Invoice Number': ['invoice number', 'invoice no', 'invoice', 'bill no', 'bill number'],
  'Storage Location': ['storage location', 'storage', 'location', 'rack', 'shelf', 'rack no', 'shelf no', 'location code', 'storage block', 'room'],
  'Hazard Class': ['hazard class', 'hazard', 'hazard category', 'toxicity', 'hazard classification'],
  'Safety Wear': ['safety wear', 'safety', 'ppe', 'precautions', 'protective gear'],
  'Synonyms': ['synonyms', 'synonym', 'alternate name', 'other name', 'iupac name'],
  'Molecular Formula': ['molecular formula', 'formula', 'mol formula', 'chemical formula'],
  'Molecular Weight': ['molecular weight', 'mol weight', 'mw', 'mol wt', 'weight'],
  'SMILES ID': ['smiles id', 'smiles'],
  'PubChem Link URL': ['pubchem link url', 'pubchem url', 'pubchem link', 'pubchem'],
  'InChI Key': ['inchi key', 'inchi', 'inchikey']
};

export const findMatchingValue = (rawRecord, canonicalHeader) => {
  if (!rawRecord || typeof rawRecord !== 'object') return '';
  if (rawRecord[canonicalHeader] !== undefined && rawRecord[canonicalHeader] !== '') {
    return String(rawRecord[canonicalHeader]).trim();
  }

  const aliases = COLUMN_ALIASES[canonicalHeader] || [];
  const rawKeys = Object.keys(rawRecord);

  for (const key of rawKeys) {
    const cleanKey = key.toLowerCase().trim().replace(/[_\-\s]+/g, ' ');
    for (const alias of aliases) {
      if (cleanKey === alias || cleanKey.replace(/[^a-z0-9]/g, '') === alias.replace(/[^a-z0-9]/g, '')) {
        const val = rawRecord[key];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          return String(val).trim();
        }
      }
    }
  }

  return '';
};

export const smartNormalizeCsvRecord = (rawRecord, rowIndex = 0) => {
  const chemName = findMatchingValue(rawRecord, 'Chemical Name');
  const casNumber = findMatchingValue(rawRecord, 'CAS Number') || 'N/A';
  let packSize = findMatchingValue(rawRecord, 'Pack Size');
  let standardUnit = findMatchingValue(rawRecord, 'Standard Unit');

  if (!standardUnit && packSize) {
    const match = packSize.match(/[a-zA-Z]+/);
    if (match) standardUnit = match[0];
  }
  if (!packSize) packSize = standardUnit ? `500${standardUnit}` : '500ml';
  if (!standardUnit) standardUnit = 'UNT';

  const purchasePriceStr = findMatchingValue(rawRecord, 'Purchase Price (INR)');
  const unitPriceStr = findMatchingValue(rawRecord, 'Unit Price (INR)') || purchasePriceStr;
  const purchasePrice = parseNumber(purchasePriceStr);
  const unitPrice = parseNumber(unitPriceStr) || purchasePrice;

  const availQtyStr = findMatchingValue(rawRecord, 'Available Quantity');
  const recQtyStr = findMatchingValue(rawRecord, 'Received Quantity') || availQtyStr;
  const availQty = parseNumber(availQtyStr);
  const recQty = parseNumber(recQtyStr) || availQty || 1;
  const finalAvail = availQty || recQty || 1;

  const explicitChemId = findMatchingValue(rawRecord, 'Chemical ID');
  const chemicalId = explicitChemId || `CHEM-${Date.now().toString().slice(-5)}-${String(rowIndex + 1).padStart(3, '0')}`;
  const isAutoId = !explicitChemId;
  const grade = findMatchingValue(rawRecord, 'Grade') || 'LR';
  const supplier = findMatchingValue(rawRecord, 'Supplier') || 'Central Pharmacy Depo';
  const storageLocation = findMatchingValue(rawRecord, 'Storage Location') || 'Main Chemical Rack A';
  const hazard = findMatchingValue(rawRecord, 'Hazard Class') || 'General Reagent';
  const safety = findMatchingValue(rawRecord, 'Safety Wear') || 'Lab Coat, Gloves & Safety Glasses';

  return {
    'Chemical ID': chemicalId,
    'Chemical Name': chemName,
    'CAS Number': casNumber,
    'Synonyms': findMatchingValue(rawRecord, 'Synonyms'),
    'SMILES ID': findMatchingValue(rawRecord, 'SMILES ID'),
    'PubChem Link URL': findMatchingValue(rawRecord, 'PubChem Link URL'),
    'Molecular Formula': findMatchingValue(rawRecord, 'Molecular Formula'),
    'Molecular Weight': findMatchingValue(rawRecord, 'Molecular Weight'),
    'InChI Key': findMatchingValue(rawRecord, 'InChI Key'),
    'Supplier': supplier,
    'Batch Number': findMatchingValue(rawRecord, 'Batch Number'),
    'Invoice Number': findMatchingValue(rawRecord, 'Invoice Number'),
    'Grade': grade,
    'Pack Size': packSize,
    'Standard Unit': standardUnit,
    'Purchase Price (INR)': purchasePrice || unitPrice,
    'Unit Price (INR)': unitPrice || purchasePrice,
    'Price Per Unit (1g / 1ml)': findMatchingValue(rawRecord, 'Price Per Unit (1g / 1ml)') || (purchasePrice ? (purchasePrice / 500).toFixed(2) : '0'),
    'Received Quantity': recQty,
    'Available Quantity': finalAvail,
    'Hazard Class': hazard,
    'Safety Wear': safety,
    'Storage Location': storageLocation,
    isAutoId
  };
};

export const analyzeCsvHeaders = (incomingHeaders) => {
  const cleaned = (incomingHeaders || []).map(h => String(h || '').trim()).filter(Boolean);
  const detected = [];
  const missingCore = [];

  cleaned.forEach(h => {
    const lower = h.toLowerCase().trim().replace(/[_\-\s]+/g, ' ');
    for (const [canon, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (
        canon.toLowerCase() === lower ||
        aliases.includes(lower) ||
        aliases.some(a => a.replace(/[^a-z0-9]/g, '') === lower.replace(/[^a-z0-9]/g, ''))
      ) {
        if (!detected.includes(canon)) {
          detected.push(canon);
        }
      }
    }
  });

  const hasName = detected.includes('Chemical Name');
  if (!hasName) {
    missingCore.push('Chemical Name (or Name, Item)');
  }

  return {
    cleanedHeaders: cleaned,
    detectedColumns: detected,
    hasRequiredCore: hasName,
    missingCore
  };
};

export const toBackendChemical = (chem) => {
  const purchasePrice = parseNumber(chem['Purchase Price (INR)'] || chem.purchasePrice || chem.price);
  const unitPrice = parseNumber(chem['Unit Price (INR)'] || chem.unitPrice) || purchasePrice;
  const receivedQty = parseNumber(chem['Received Quantity'] || chem.receivedQty);
  const availableQty = parseNumber(chem['Available Quantity'] || chem.availableQty) || receivedQty || 1;
  const finalReceived = receivedQty || availableQty;

  const packSize = chem['Pack Size'] || chem.packSize || '500ml';
  const unit = chem['Standard Unit'] || chem.unit || (packSize.match(/[a-zA-Z]+/)?.[0] || 'UNT');
  const isAutoId = chem.isAutoId !== undefined ? chem.isAutoId : !chem['Chemical ID'];

  return {
    chemicalId: chem['Chemical ID'] || chem.chemicalId || '',
    isAutoId,
    name: chem['Chemical Name'] || chem.name || '',
    cas: chem['CAS Number'] || chem.cas || 'N/A',
    synonyms: chem['Synonyms'] || chem.synonyms || '',
    smiles: chem['SMILES ID'] || chem.smiles || '',
    pubchemUrl: chem['PubChem Link URL'] || chem.pubchemUrl || '',
    formula: chem['Molecular Formula'] || chem.formula || '',
    molecularWeight: chem['Molecular Weight'] || chem.molecularWeight || '',
    inchiKey: chem['InChI Key'] || chem.inchiKey || '',
    supplier: chem['Supplier'] || chem.supplier || 'Central Pharmacy Depo',
    batchNumber: chem['Batch Number'] || chem.batchNumber || '',
    invoiceNumber: chem['Invoice Number'] || chem.invoiceNumber || '',
    grade: chem['Grade'] || chem.grade || 'LR',
    packSize,
    unit,
    purchasePrice: purchasePrice || unitPrice,
    unitPrice: unitPrice || purchasePrice,
    pricePerUnit: parseNumber(chem['Price Per Unit (1g / 1ml)'] || chem.pricePerUnit),
    receivedQty: finalReceived,
    availableQty,
    hazard: chem['Hazard Class'] || chem.hazard || 'General Chemical',
    safety: chem['Safety Wear'] || chem.safety || 'Lab Coat, Gloves & Safety Glasses',
    storageLocation: chem['Storage Location'] || chem.storageLocation || 'Main Chemical Rack A',
    reorderLevel: 2
  };
};


export const toFrontendRequest = (req) => ({
  id: req._id || req.requestId || req.id,
  lab: req.labName || (req.labId ? req.labId.name : null) || 'PhD Research Scholar',
  chemicalName: req.chemicalName || '',
  chemicalId: req.chemicalId || '',
  casNumber: req.casNumber || '',
  quantity: req.quantityRequested || req.quantity || 0,
  unit: req.unit || 'UNT',
  status: req.status || 'Pending',
  date: req.requestedAt || req.createdAt || new Date().toISOString(),
  receiptNumber: req.receiptNumber || '',
  reason: req.reason || '',
  requestType: req.requestType || (req.course === 'PhD' ? 'PhD Research' : 'Lab Requisition'),
  studentName: req.studentName || '',
  projectThesisName: req.projectThesisName || '',
  supervisorName: req.supervisorName || '',
  course: req.course || '',
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
