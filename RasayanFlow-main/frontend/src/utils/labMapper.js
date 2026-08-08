import { parseNumber } from './storeMapper';

export const toFrontendLabInventory = (chem) => ({
  id: chem._id || chem.id,
  'Item Code': chem.itemCode || '',
  'Chemical Name': chem.chemicalName || chem.itemName || '',
  'Category': chem.category || 'Chemical',
  'Quantity': chem.quantity || 0,
  'Quantity Unit': chem.quantityUnit || 'mL',
  'Min Threshold': chem.minThreshold || 0,
  'Cost Per Unit (INR)': chem.costPerUnit || 0,
  'CAS Number': chem.casNumber || '',
  'Chemical Formula': chem.chemicalFormula || '',
  'SMILES': chem.smiles || '',
  'InChI': chem.inchi || '',
  'Manufacturing Company': chem.manufacturingCompany || '',
  'Storage Location': chem.storageLocation || '',
  'Lot Number': chem.lotNumber || '',
  'Entry Date': chem.entryDate ? new Date(chem.entryDate).toISOString().slice(0, 10) : '',
  'Expiry Date': chem.expiryDate ? new Date(chem.expiryDate).toISOString().slice(0, 10) : '',
  'Abstract': chem.abstract || '',
  'PubMed ID': chem.pubmedId || '',
  _raw: chem
});

export const toBackendLabInventory = (chem) => ({
  itemCode: chem['Item Code'] || '',
  chemicalName: chem['Chemical Name'] || chem['Item Name'] || '',
  category: chem['Category'] || 'Chemical',
  quantity: parseNumber(chem['Quantity']),
  quantityUnit: chem['Quantity Unit'] || 'mL',
  minThreshold: parseNumber(chem['Min Threshold']),
  costPerUnit: parseNumber(chem['Cost Per Unit (INR)']),
  casNumber: chem['CAS Number'] || '',
  chemicalFormula: chem['Chemical Formula'] || '',
  smiles: chem['SMILES'] || '',
  inchi: chem['InChI'] || '',
  manufacturingCompany: chem['Manufacturing Company'] || '',
  storageLocation: chem['Storage Location'] || '',
  lotNumber: chem['Lot Number'] || '',
  entryDate: chem['Entry Date'] || '',
  expiryDate: chem['Expiry Date'] || '',
  abstract: chem['Abstract'] || '',
  pubmedId: chem['PubMed ID'] || ''
});
