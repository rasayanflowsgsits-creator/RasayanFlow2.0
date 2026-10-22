// Round to 2 decimal places always
export function safeRound(num) {
  if (num === null || num === undefined || isNaN(num)) return 0;
  const val = Number(num);
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

// Parse pack size string to base unit value and unit
export function parsePackSize(packStr) {
  if (!packStr) return { baseValue: 1, baseUnit: 'UNT', value: 1, unit: 'UNT' };

  const s = packStr.toString().trim();
  const match = s.match(/^([\d.]+)\s*(.*)$/);
  if (!match) {
    return { baseValue: 1, baseUnit: 'UNT', value: 1, unit: 'UNT' };
  }

  const num = parseFloat(match[1]) || 1;
  const unitRaw = match[2].trim().toLowerCase().replace(/\s+/g, '');

  let baseValue = num;
  let baseUnit = 'UNT';

  if (/^(kg|kgs|kilogram|kilograms)$/i.test(unitRaw)) {
    baseValue = safeRound(num * 1000);
    baseUnit = 'g';
  } else if (/^(gm|gms|gm\.|g|gram|grams)$/i.test(unitRaw)) {
    baseValue = num;
    baseUnit = 'g';
  } else if (/^(mg|mgs|milligram|milligrams)$/i.test(unitRaw)) {
    baseValue = num;
    baseUnit = 'mg';
  } else if (/^(ml|mls|milliliter|milliliters|millilitre|millilitres)$/i.test(unitRaw)) {
    baseValue = num;
    baseUnit = 'ml';
  } else if (/^(l|ltr|ltrs|liter|liters|litre|litres)$/i.test(unitRaw)) {
    baseValue = safeRound(num * 1000);
    baseUnit = 'ml';
  } else {
    baseValue = num;
    baseUnit = 'UNT';
  }

  return { baseValue, baseUnit, value: baseValue, unit: baseUnit };
}

// Calculate total stock in base unit
export function totalStock(availableQty, packSize) {
  const { baseValue, baseUnit } = parsePackSize(packSize);
  const qty = parseFloat(availableQty) || 0;
  return {
    total: safeRound(qty * baseValue),
    unit: baseUnit
  };
}

// Clean Indian Rupee Currency Formatter
export function formatINR(val, { decimals = 0 } = {}) {
  if (val === null || val === undefined || isNaN(val)) return '₹0';
  const num = Number(val);
  return '₹' + Math.round(num).toLocaleString('en-IN', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals
  });
}

// Clean Unit Formatter
export function formatUnit(unit) {
  if (!unit) return 'Units';
  const u = String(unit).trim().toLowerCase();
  if (u === 'unt' || u === 'unit' || u === 'units') return 'Units';
  if (u === 'ml' || u === 'mls') return 'mL';
  if (u === 'l' || u === 'ltr' || u === 'liters') return 'L';
  if (u === 'g' || u === 'gm' || u === 'grams') return 'g';
  if (u === 'kg' || u === 'kgs') return 'kg';
  if (u === 'mg') return 'mg';
  return unit;
}

// Accurate Stock Health & Depletion Analysis (prevents false positives)
export function getChemicalStockHealth(chem) {
  const receivedRaw = Number(chem['Received Quantity'] || chem.receivedQty || 0);
  const availableRaw = Number(chem['Available Quantity'] || chem.availableQty || 0);
  const reorderLevel = Number(chem.reorderLevel !== undefined ? chem.reorderLevel : 2);

  // If received is not specified or 0, fallback to available
  const received = receivedRaw > 0 ? receivedRaw : (availableRaw > 0 ? availableRaw : 1);
  const available = Math.max(0, availableRaw);

  const percentage = received > 0 ? safeRound((available / received) * 100) : (available > 0 ? 100 : 0);

  // Item is only Low Stock if it has been depleted below 20% or below reorderLevel AND is actually depleted from received
  const isOut = available <= 0;
  const isLow = !isOut && (percentage <= 20 || (available <= reorderLevel && available < received));
  const status = isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock';

  return {
    received,
    available,
    percentage: Math.min(100, percentage),
    isOut,
    isLow,
    status
  };
}

