// Round to 2 decimal places always using EPSILON safety
function safeRound(num) {
  if (num === null || num === undefined || isNaN(num)) return 0;
  const val = Number(num);
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

// Parse pack size string to base value and unit
// "2.5L" -> { baseValue: 2500, baseUnit: "ml" }
// "1 KG" -> { baseValue: 1000, baseUnit: "g" }
// "500g" -> { baseValue: 500, baseUnit: "g" }
// "500ml" -> { baseValue: 500, baseUnit: "ml" }
// "500 GM" -> { baseValue: 500, baseUnit: "g" }
function parsePackSize(packStr) {
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
function totalStock(availableQty, packSize) {
  const { baseValue, baseUnit } = parsePackSize(packSize);
  const qty = parseFloat(availableQty) || 0;
  return {
    total: safeRound(qty * baseValue),
    unit: baseUnit
  };
}

module.exports = {
  parsePackSize,
  safeRound,
  totalStock
};
