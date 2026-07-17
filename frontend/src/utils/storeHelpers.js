// Parse pack size to base unit value and unit
export function parsePackSize(packSize) {
  if (!packSize) return { value: 1, unit: 'UNT' };
  
  const str = packSize.toString()
    .trim().toLowerCase()
    .replace(/\s+/g, '');
  
  const num = parseFloat(str);
  if (isNaN(num)) return { value: 1, unit: 'UNT' };
  
  if (str.includes('kg')) 
    return { value: Math.round(num * 1000 * 100) / 100, unit: 'g' };
  if (str.includes('gm'))
    return { value: num, unit: 'g' };
  if (str.includes('mg'))
    return { value: num, unit: 'mg' };
  if (str.includes('g'))
    return { value: num, unit: 'g' };
  if (str.includes('ml'))
    return { value: num, unit: 'ml' };
  if (str.includes('l'))
    return { value: Math.round(num * 1000 * 100) / 100, unit: 'ml' };
  
  return { value: num, unit: 'UNT' };
}

// Round to 2 decimal places always
export function safeRound(num) {
  if (isNaN(num) || num === null || num === undefined) return 0;
  return Math.round(num * 100) / 100;
}

// Calculate total stock in base unit
export function totalStock(availableQty, packSize) {
  const { value, unit } = parsePackSize(packSize);
  const qty = parseFloat(availableQty) || 0;
  return {
    total: safeRound(qty * value),
    unit: unit
  };
}
