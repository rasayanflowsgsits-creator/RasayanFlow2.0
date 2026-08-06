const asyncHandler = require('express-async-handler');
const StoreInventory = require('../models/StoreInventory');

const getStoreOverview = asyncHandler(async (req, res) => {
  const allChemicals = await StoreInventory.find({});

  const totalChemicals = allChemicals.length;

  let totalValue = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  allChemicals.forEach((chem) => {
    const qty = Number(chem.availableQty) || 0;
    const unitPrice = Number(chem.unitPrice || chem.pricePerUnit || chem.purchasePrice) || 0;
    const itemVal = (chem.totalValue !== undefined && chem.totalValue !== null)
      ? Number(chem.totalValue)
      : (qty * unitPrice);

    totalValue += itemVal;

    const status = chem.status || (qty <= 0 ? 'Out of Stock' : qty <= (chem.reorderLevel || 2) ? 'Low Stock' : 'In Stock');
    if (status === 'Low Stock') lowStockCount++;
    if (status === 'Out of Stock') outOfStockCount++;
  });

  const sorted = [...allChemicals].sort((a, b) => {
    const valA = (a.totalValue !== undefined && a.totalValue !== null)
      ? Number(a.totalValue)
      : ((Number(a.availableQty) || 0) * (Number(a.unitPrice || a.pricePerUnit) || 0));
    const valB = (b.totalValue !== undefined && b.totalValue !== null)
      ? Number(b.totalValue)
      : ((Number(b.availableQty) || 0) * (Number(b.unitPrice || b.pricePerUnit) || 0));
    return valB - valA;
  });

  const topChemicals = sorted.slice(0, 10).map((c) => {
    const qty = Number(c.availableQty) || 0;
    const uPrice = Number(c.unitPrice || c.pricePerUnit || c.purchasePrice) || 0;
    const tVal = (c.totalValue !== undefined && c.totalValue !== null) ? Number(c.totalValue) : (qty * uPrice);
    const status = c.status || (qty <= 0 ? 'Out of Stock' : qty <= (c.reorderLevel || 2) ? 'Low Stock' : 'In Stock');

    return {
      _id: c._id,
      id: c._id,
      name: c.name || 'Unnamed Chemical',
      grade: c.grade || 'N/A',
      availableQty: qty,
      unit: c.unit || '',
      unitPrice: uPrice,
      totalValue: tVal,
      status
    };
  });

  res.json({
    success: true,
    totalChemicals,
    totalValue,
    lowStockCount,
    outOfStockCount,
    topChemicals
  });
});

module.exports = {
  getStoreOverview
};
