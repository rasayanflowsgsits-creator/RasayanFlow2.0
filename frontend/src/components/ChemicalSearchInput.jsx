import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';

export default function ChemicalSearchInput({
  value = '',
  onChange,
  onSelect,
  placeholder = 'Search chemical name or CAS (e.g. Agar, Ethanol, 7647-14-5)...',
  label = 'Chemical Name',
  required = false,
  className = '',
  inputClassName = '',
  inventory = null,
}) {
  const [storeInventory, setStoreInventory] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (inventory && Array.isArray(inventory)) {
      setStoreInventory(inventory);
      return;
    }

    let isMounted = true;
    api.get('/store/inventory')
      .then((res) => {
        if (!isMounted) return;
        const items = res.data?.items || res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setStoreInventory(items);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [inventory]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    if (onChange) onChange(val);

    if (val.trim().length > 0) {
      const lower = val.toLowerCase();
      const matches = storeInventory.filter(
        (item) =>
          (item.name || item.chemicalName || '').toLowerCase().includes(lower) ||
          (item.cas || item.casNumber || '').toLowerCase().includes(lower)
      );
      setSuggestions(matches.slice(0, 8));
      setIsOpen(true);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  };

  const handleSelect = (item) => {
    const name = item.name || item.chemicalName || '';
    if (onChange) onChange(name);
    if (onSelect) onSelect(item);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-semibold text-[#37412a] dark:text-[#eef4e8] mb-1.5">
          {label} {required && <span className="text-rose-600">*</span>}
        </label>
      )}
      <input
        type="text"
        required={required}
        value={value}
        onChange={handleInputChange}
        onFocus={() => {
          if (value && value.trim().length > 0) {
            const lower = value.toLowerCase();
            const matches = storeInventory.filter(
              (item) =>
                (item.name || item.chemicalName || '').toLowerCase().includes(lower) ||
                (item.cas || item.casNumber || '').toLowerCase().includes(lower)
            );
            setSuggestions(matches.slice(0, 8));
            setIsOpen(true);
          }
        }}
        placeholder={placeholder}
        className={
          inputClassName ||
          'w-full rounded-lg border border-[#cfd8bd] bg-white px-3.5 py-2.5 text-sm text-[#2e3d19] font-medium placeholder:text-[#8a9970] focus:border-[#556b2f] focus:outline-none focus:ring-1 focus:ring-[#556b2f] dark:border-[#414a33] dark:bg-[#131610] dark:text-[#eef4e8]'
        }
      />

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-[#20251a] border border-[#cfd8bd] dark:border-[#414a33] rounded-lg shadow-2xl max-h-52 overflow-y-auto divide-y divide-[#e4eed3] dark:divide-[#2e3722]">
          {suggestions.map((item, idx) => {
            const itemName = item.name || item.chemicalName || 'Unknown Chemical';
            const itemCas = item.cas || item.casNumber;
            const availQty = item.availableQty ?? item.quantityAvailable ?? item.quantity ?? 0;
            const unit = item.unit || item.quantityUnit || '';

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelect(item)}
                className="w-full text-left p-2.5 hover:bg-[#f4f6ee] dark:hover:bg-[#2e3722] flex justify-between items-center transition-colors group cursor-pointer"
              >
                <div className="pr-2 min-w-0">
                  <div className="font-extrabold text-xs text-[#37412a] dark:text-[#e4e9d8] group-hover:text-[#556b2f] dark:group-hover:text-[#a8be8a] truncate">
                    {itemName}
                  </div>
                  {itemCas && (
                    <div className="text-[10px] text-[#71805a] dark:text-[#9eab88] font-mono mt-0.5">
                      CAS: <span className="font-semibold">{itemCas}</span>
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <span className="text-[10px] font-mono font-bold text-[#5c6e46] dark:text-[#a8be8a] bg-[#f4f6ee] dark:bg-[#1a1d16] px-2 py-0.5 rounded border border-[#cfd8bd] dark:border-[#414a33] whitespace-nowrap">
                    Available: {availQty} {unit}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
