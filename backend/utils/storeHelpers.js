// Parse pack size to base unit value and unit
function parsePackSize(packStr) {
  if (!packStr) return { baseValue: 1, baseUnit: 'UNT', value: 1, unit: 'UNT' };
  
  const s = packStr.toString()
    .trim().toLowerCase()
    .replace(/\s+/g, '');
  
  const num = parseFloat(s) || 1;
  let baseValue = num;
  let baseUnit = 'UNT';

  if (s.includes('kg')) {
    baseValue = safeRound(num * 1000);
    baseUnit = 'g';
  } else if (s.includes('mg')) {
    baseValue = num;
    baseUnit = 'mg';
  } else if (s.includes('gm') || s.includes('g')) {
    baseValue = num;
    baseUnit = 'g';
  } else if (s.includes('ml')) {
    baseValue = num;
    baseUnit = 'ml';
  } else if (s.includes('l')) {
    baseValue = safeRound(num * 1000);
    baseUnit = 'ml';
  }

  return { baseValue, baseUnit, value: baseValue, unit: baseUnit };
}

// Round to 2 decimal places always
function safeRound(num) {
  if (isNaN(num) || num === null || num === undefined) return 0;
  return Math.round(num * 100) / 100;
}

// Calculate total stock in base unit
function totalStock(availableQty, packSize) {
  const { value, unit } = parsePackSize(packSize);
  const qty = parseFloat(availableQty) || 0;
  return {
    total: safeRound(qty * value),
    unit: unit
  };
}

module.exports = {
  parsePackSize,
  safeRound,
  totalStock
};
