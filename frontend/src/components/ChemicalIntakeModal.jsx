import React, { useState } from 'react';
import api from '../services/api';
import Modal from './ui/Modal';
import { 
  Sparkles, Search, CheckCircle2, AlertCircle, 
  PackageCheck, RefreshCw 
} from 'lucide-react';

export default function ChemicalIntakeModal({ 
  open, 
  onClose, 
  onSuccess, 
  isStoreAdmin = false,
  labId = null 
}) {
  const [query, setQuery] = useState('');
  const [fetchingPubChem, setFetchingPubChem] = useState(false);
  const [pubchemSuccess, setPubchemSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form Fields
  const [formData, setFormData] = useState({
    itemCode: '',
    chemicalName: '',
    casNumber: '',
    chemicalFormula: '',
    smiles: '',
    inchi: '',
    category: 'Chemical',
    subCategory: 'General',
    quantity: '',
    quantityUnit: 'g',
    costPerUnit: '',
    minThreshold: '10',
    manufacturingCompany: '',
    storageLocation: '',
    lotNumber: '',
    expiryDate: ''
  });

  const [submitting, setSubmitting] = useState(false);

  // Auto-Fetch from PubChem API
  const handleFetchPubChem = async () => {
    if (!query.trim()) {
      setErrorMessage('Please enter a Chemical Name, CAS Number, or PubChem CID');
      return;
    }

    setFetchingPubChem(true);
    setErrorMessage('');
    setPubchemSuccess(false);

    try {
      const response = await api.post('/inventory/pubchem-fetch', { query: query.trim() });
      const result = response.data?.data;

      if (result && result.found) {
        const d = result.data;
        setFormData(prev => ({
          ...prev,
          chemicalName: d.chemicalName || prev.chemicalName || query.trim(),
          casNumber: d.casNumber || prev.casNumber,
          chemicalFormula: d.chemicalFormula || prev.chemicalFormula,
          smiles: d.smiles || prev.smiles,
          inchi: d.inchi || prev.inchi,
          quantityUnit: d.chemicalFormula?.includes('H2O') || d.chemicalName?.toLowerCase().includes('acid') || d.chemicalName?.toLowerCase().includes('solution') ? 'mL' : prev.quantityUnit
        }));
        setPubchemSuccess(true);
      } else {
        setErrorMessage(result?.message || `No PubChem record found for "${query.trim()}". You can manually enter details below.`);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to connect to PubChem API. Please fill details manually.');
    } finally {
      setFetchingPubChem(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.chemicalName || !formData.quantity || !formData.quantityUnit) {
      setErrorMessage('Chemical Name, Quantity, and Quantity Unit are required.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      if (isStoreAdmin) {
        // Save to Central Store Inventory (Auto-matches existing chemical by Name/CAS/Code and adds quantity)
        await api.post('/store/inventory', {
          itemCode: formData.itemCode,
          itemName: formData.chemicalName,
          category: formData.category,
          subCategory: formData.subCategory || 'General',
          quantity: Number(formData.quantity),
          quantityUnit: formData.quantityUnit,
          storageLocation: formData.storageLocation,
          description: `Batch/Lot: ${formData.lotNumber || 'N/A'} • Mfg: ${formData.manufacturingCompany || 'N/A'} • Formula: ${formData.chemicalFormula || 'N/A'}`
        });

        // Also update StoreInventory table & generate tracking log
        try {
          await api.post('/store-inventory', {
            chemicalId: formData.itemCode,
            name: formData.chemicalName,
            cas: formData.casNumber,
            quantity: Number(formData.quantity),
            quantityUnit: formData.quantityUnit,
            packSize: `${formData.quantity}${formData.quantityUnit}`,
            storageLocation: formData.storageLocation,
            supplier: formData.manufacturingCompany
          });
        } catch (e) {
          // Ignore secondary sync error
        }
      } else {
        // Save to Lab Inventory
        await api.post('/inventory', {
          labId: labId,
          itemCode: formData.itemCode,
          chemicalName: formData.chemicalName,
          itemName: formData.chemicalName,
          category: formData.category,
          quantity: Number(formData.quantity),
          quantityUnit: formData.quantityUnit,
          costPerUnit: Number(formData.costPerUnit || 0),
          minThreshold: Number(formData.minThreshold || 5),
          casNumber: formData.casNumber,
          chemicalFormula: formData.chemicalFormula,
          smiles: formData.smiles,
          inchi: formData.inchi,
          manufacturingCompany: formData.manufacturingCompany,
          storageLocation: formData.storageLocation,
          lotNumber: formData.lotNumber,
          expiryDate: formData.expiryDate || null
        });
      }

      if (onSuccess) onSuccess();
      onClose();
      // Reset
      setQuery('');
      setPubchemSuccess(false);
      setFormData({
        itemCode: '',
        chemicalName: '',
        casNumber: '',
        chemicalFormula: '',
        smiles: '',
        inchi: '',
        category: 'Chemical',
        subCategory: 'General',
        quantity: '',
        quantityUnit: 'g',
        costPerUnit: '',
        minThreshold: '10',
        manufacturingCompany: '',
        storageLocation: '',
        lotNumber: '',
        expiryDate: ''
      });
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to register chemical stock intake.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal 
      open={open} 
      onClose={onClose} 
      title={
        <div className="flex items-center gap-2 text-base sm:text-lg font-black text-[#2e3d19] dark:text-[#eef4e8]">
          <PackageCheck className="w-6 h-6 text-[#5c6e46] dark:text-[#a8be8a]" />
          <span>Arrived Chemical Stock Intake Wizard</span>
        </div>
      } 
      panelClassName="max-w-2xl w-full"
    >
      <div className="space-y-5 text-xs font-semibold text-[#37412a] dark:text-[#e4e9d8]">
        
        {/* Banner */}
        <div className="bg-[#f4f6ee] dark:bg-[#1f2419] p-3.5 rounded-xl border border-[#cfd8bd] dark:border-[#38432a] flex items-start gap-3">
          <div className="p-2 bg-[#5c6e46] text-white rounded-lg shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-[#2e3d19] dark:text-[#eef4e8]">Zero-Friction Chemical Arrival Entry</h4>
            <p className="text-[11px] text-[#71805a] dark:text-[#a5b48b] mt-0.5 leading-relaxed font-medium">
              Eliminate manual data entry errors. Enter the Chemical Name, CAS Number, or PubChem CID below, and PubChem API will automatically populate all chemical formulas, structures, and properties!
            </p>
          </div>
        </div>

        {/* Step 1: PubChem Quick Fetch Bar */}
        <div className="p-4 bg-white dark:bg-[#161a12] rounded-xl border-2 border-[#5c6e46] shadow-2xs space-y-3">
          <label className="block font-black text-[#5c6e46] dark:text-[#a8be8a] uppercase tracking-wider text-[10px]">
            Step 1: Enter Chemical Name / CAS / PubChem CID
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#87996c]" />
              <input
                type="text"
                placeholder="e.g. Silver Nitrate, 7761-88-8, Acetone, CID 2244..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleFetchPubChem())}
                className="w-full pl-9 pr-3 py-2.5 bg-[#fdfdf7] dark:bg-[#20251a] border border-[#cfd8bd] dark:border-[#414a33] rounded-lg text-xs font-bold outline-none focus:border-[#5c6e46]"
              />
            </div>
            <button
              type="button"
              onClick={handleFetchPubChem}
              disabled={fetchingPubChem}
              className="px-5 py-2.5 bg-[#5c6e46] hover:bg-[#475735] text-white font-bold text-xs rounded-lg transition-all shadow-xs flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
            >
              {fetchingPubChem ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-300" />}
              <span>{fetchingPubChem ? 'Fetching...' : 'Auto-Fetch from PubChem API'}</span>
            </button>
          </div>

          {/* Feedback Messages */}
          {pubchemSuccess && (
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>PubChem properties successfully loaded and populated!</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-lg text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Step 2: Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="border-t border-[#e4eed3] dark:border-[#2e3722] pt-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[#5c6e46] dark:text-[#a8be8a] mb-3">
              Step 2: Arrival Quantity & Chemical Details
            </h4>
          </div>

          {/* Chemical Name & CAS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#5c6e46] mb-1">
                Chemical Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Silver Nitrate IP"
                value={formData.chemicalName}
                onChange={(e) => setFormData(prev => ({ ...prev, chemicalName: e.target.value }))}
                className="w-full p-2.5 rounded-lg border border-[#cfd8bd] dark:border-[#414a33] bg-white dark:bg-[#1a1d16] text-xs font-bold outline-none focus:border-[#5c6e46]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5c6e46] mb-1">CAS Number</label>
              <input
                type="text"
                placeholder="e.g. 7761-88-8"
                value={formData.casNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, casNumber: e.target.value }))}
                className="w-full p-2.5 rounded-lg border border-[#cfd8bd] dark:border-[#414a33] bg-white dark:bg-[#1a1d16] text-xs font-bold outline-none focus:border-[#5c6e46]"
              />
            </div>
          </div>

          {/* Quantity Received & Unit & Storage Location */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#5c6e46] mb-1">
                Quantity Received <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="e.g. 500"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                className="w-full p-2.5 rounded-lg border border-[#cfd8bd] dark:border-[#414a33] bg-white dark:bg-[#1a1d16] text-xs font-bold outline-none focus:border-[#5c6e46]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5c6e46] mb-1">Quantity Unit</label>
              <select
                value={formData.quantityUnit}
                onChange={(e) => setFormData(prev => ({ ...prev, quantityUnit: e.target.value }))}
                className="w-full p-2.5 rounded-lg border border-[#cfd8bd] dark:border-[#414a33] bg-white dark:bg-[#1a1d16] text-xs font-bold outline-none focus:border-[#5c6e46]"
              >
                {['g', 'mL', 'L', 'kg', 'mg', 'pieces'].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5c6e46] mb-1">Storage Location</label>
              <input
                type="text"
                placeholder="e.g. Cabinet B-2, Rack 3"
                value={formData.storageLocation}
                onChange={(e) => setFormData(prev => ({ ...prev, storageLocation: e.target.value }))}
                className="w-full p-2.5 rounded-lg border border-[#cfd8bd] dark:border-[#414a33] bg-white dark:bg-[#1a1d16] text-xs font-bold outline-none focus:border-[#5c6e46]"
              />
            </div>
          </div>

          {/* Molecular Formula & SMILES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#5c6e46] mb-1">Molecular Formula</label>
              <input
                type="text"
                placeholder="Auto-filled by PubChem e.g. AgNO3"
                value={formData.chemicalFormula}
                onChange={(e) => setFormData(prev => ({ ...prev, chemicalFormula: e.target.value }))}
                className="w-full p-2.5 rounded-lg border border-[#cfd8bd] dark:border-[#414a33] bg-[#f4f6ee] dark:bg-[#20251a] text-xs font-bold outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5c6e46] mb-1">SMILES Chemical Structure</label>
              <input
                type="text"
                placeholder="Auto-filled by PubChem"
                value={formData.smiles}
                onChange={(e) => setFormData(prev => ({ ...prev, smiles: e.target.value }))}
                className="w-full p-2.5 rounded-lg border border-[#cfd8bd] dark:border-[#414a33] bg-[#f4f6ee] dark:bg-[#20251a] text-xs font-mono outline-none truncate"
              />
            </div>
          </div>

          {/* Batch/Lot & Supplier & Expiry */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#5c6e46] mb-1">Batch / Lot Number</label>
              <input
                type="text"
                placeholder="e.g. LOT-2026-X89"
                value={formData.lotNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, lotNumber: e.target.value }))}
                className="w-full p-2.5 rounded-lg border border-[#cfd8bd] dark:border-[#414a33] bg-white dark:bg-[#1a1d16] text-xs font-bold outline-none focus:border-[#5c6e46]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5c6e46] mb-1">Supplier / Manufacturer</label>
              <input
                type="text"
                placeholder="e.g. Sigma Aldrich / CDH"
                value={formData.manufacturingCompany}
                onChange={(e) => setFormData(prev => ({ ...prev, manufacturingCompany: e.target.value }))}
                className="w-full p-2.5 rounded-lg border border-[#cfd8bd] dark:border-[#414a33] bg-white dark:bg-[#1a1d16] text-xs font-bold outline-none focus:border-[#5c6e46]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#5c6e46] mb-1">Expiry Date (Optional)</label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                className="w-full p-2.5 rounded-lg border border-[#cfd8bd] dark:border-[#414a33] bg-white dark:bg-[#1a1d16] text-xs font-bold outline-none focus:border-[#5c6e46]"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e4eed3] dark:border-[#2e3722]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-[#cfd8bd] text-xs font-bold text-[#5c6e46] hover:bg-[#f4f6ee]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-[#5c6e46] hover:bg-[#475735] text-white text-xs font-black shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <PackageCheck className="w-4 h-4" />
              <span>{submitting ? 'Registering Stock...' : '📥 Register Arrived Chemical Stock'}</span>
            </button>
          </div>
        </form>

      </div>
    </Modal>
  );
}
