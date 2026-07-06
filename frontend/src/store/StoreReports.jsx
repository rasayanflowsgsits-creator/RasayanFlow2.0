import React, { useState, useMemo } from 'react';
import { Calendar, Download, ArrowUpRight, ArrowDownRight, TrendingUp, Filter, Boxes, PackageX, AlertTriangle, Activity } from 'lucide-react';
import StoreLayout from './StoreLayout';
import Card from '../components/ui/Card';
import useStoreManagerMock, { parsePackSize } from './storeManagerMock';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const YEARS = [2024, 2025, 2026];

function StatCard({ title, value, prevValue, type = 'number', unit = '' }) {
  const current = Number(value) || 0;
  const previous = Number(prevValue) || 0;
  
  let percentChange = 0;
  if (previous > 0) {
    percentChange = ((current - previous) / previous) * 100;
  } else if (current > 0) {
    percentChange = 100;
  }

  const isUp = percentChange > 0;
  const isDown = percentChange < 0;
  const isNeutral = percentChange === 0;

  const displayValue = type === 'currency' 
    ? `₹${current.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : type === 'text'
    ? value
    : `${current.toLocaleString('en-IN')} ${unit}`.trim();

  return (
    <div className="bg-[#f7f8f1] dark:bg-[#28301f] border border-[#d9e1ca] dark:border-[#414a33] p-4 rounded-xl flex flex-col justify-between">
      <p className="text-xs font-semibold text-[#71805a] dark:text-[#c5d0b5] uppercase">{title}</p>
      <p className="text-xl font-bold text-[#3c4e23] dark:text-[#eef4e8] mt-2 truncate" title={displayValue}>{displayValue || '--'}</p>
      
      {type !== 'text' && (
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-[#d9e1ca]/50 dark:border-[#414a33]/50">
          {isUp ? <span className="flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400"><ArrowUpRight size={14} /> {Math.abs(percentChange).toFixed(1)}%</span> :
           isDown ? <span className="flex items-center text-xs font-bold text-rose-600 dark:text-rose-400"><ArrowDownRight size={14} /> {Math.abs(percentChange).toFixed(1)}%</span> :
           <span className="text-xs font-medium text-slate-500">No change</span>}
          <span className="text-[10px] text-slate-500 truncate">vs prev</span>
        </div>
      )}
    </div>
  );
}

export default function StoreReports() {
  const historyRaw = useStoreManagerMock(state => state.history);
  const requestsRaw = useStoreManagerMock(state => state.requests);
  const chemicalsRaw = useStoreManagerMock(state => state.chemicals);
  const alertThreshold = useStoreManagerMock(state => state.alertThreshold);

  const [tab, setTab] = useState('monthly');
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(2026);

  // Filter valid history: qtyBefore > 0 and totalValueBefore > 0 and Approved
  const history = useMemo(() => {
    return historyRaw.filter(h => h.status === 'Approved' && Number(h.qtyBefore) > 0 && Number(h.totalValueBefore) > 0);
  }, [historyRaw]);

  // Filter valid requests: Approved
  const requests = useMemo(() => {
    return requestsRaw.filter(r => r.status === 'Approved');
  }, [requestsRaw]);

  // Current Inventory Computations
  const inventoryStats = useMemo(() => {
    let totalChemicals = chemicalsRaw.length;
    let totalAvailableValue = 0;
    let totalReceivedValue = 0;
    let outOfStockCount = 0;
    let lowStockCount = 0;

    chemicalsRaw.forEach(chem => {
      const avail = Number(chem['Available Quantity'] || 0);
      const rec = Number(chem['Received Quantity'] || 0);
      const price = Number(chem['Unit Price (INR)'] || 0);
      
      totalAvailableValue += avail * price;
      totalReceivedValue += rec * price;

      const packData = parsePackSize(chem['Pack Size']);
      const totalBase = rec * packData.value;
      const availableBase = avail * packData.value;
      
      if (avail === 0) {
        outOfStockCount++;
      } else if (totalBase > 0) {
        const percentage = (availableBase / totalBase) * 100;
        if (percentage < alertThreshold) {
          lowStockCount++;
        }
      }
    });

    return { totalChemicals, totalAvailableValue, totalReceivedValue, outOfStockCount, lowStockCount };
  }, [chemicalsRaw, alertThreshold]);

  // Period filtering
  const { cReqs, pReqs, yReqs, pyReqs, cHist, pHist, yHist, pyHist } = useMemo(() => {
    return {
      cReqs: requests.filter(r => new Date(r.date).getMonth() === month && new Date(r.date).getFullYear() === year),
      pReqs: requests.filter(r => new Date(r.date).getMonth() === (month === 0 ? 11 : month - 1) && new Date(r.date).getFullYear() === (month === 0 ? year - 1 : year)),
      yReqs: requests.filter(r => new Date(r.date).getFullYear() === year),
      pyReqs: requests.filter(r => new Date(r.date).getFullYear() === year - 1),
      cHist: history.filter(h => new Date(h.date).getMonth() === month && new Date(h.date).getFullYear() === year),
      pHist: history.filter(h => new Date(h.date).getMonth() === (month === 0 ? 11 : month - 1) && new Date(h.date).getFullYear() === (month === 0 ? year - 1 : year)),
      yHist: history.filter(h => new Date(h.date).getFullYear() === year),
      pyHist: history.filter(h => new Date(h.date).getFullYear() === year - 1),
    };
  }, [requests, history, month, year]);

  const formatQtyMap = (qtyMap) => Object.entries(qtyMap).map(([u, q]) => `${q.toLocaleString()} ${u}`).join(', ');

  const aggregateData = (reqs, hist) => {
    let approvals = reqs.length;
    let qtyReleased = {};
    
    const chemMap = {};
    const labMap = {};
    const uniqueChems = new Set();

    reqs.forEach(r => {
      const qty = Number(r.quantity || 0);
      const unit = r.unit || 'ml';
      
      qtyReleased[unit] = (qtyReleased[unit] || 0) + qty;
      uniqueChems.add(r.chemicalId);

      if (!chemMap[r.chemicalId]) {
        chemMap[r.chemicalId] = {
          name: r.chemicalName,
          id: r.chemicalId,
          qty: 0,
          unit: unit,
          value: 0,
          approvals: 0,
          labs: new Set(),
          months: Array(12).fill(0)
        };
      }
      chemMap[r.chemicalId].qty += qty;
      chemMap[r.chemicalId].approvals += 1;
      chemMap[r.chemicalId].labs.add(r.lab);
      chemMap[r.chemicalId].months[new Date(r.date).getMonth()] += qty;

      if (!labMap[r.lab]) {
        labMap[r.lab] = {
          name: r.lab,
          approvals: 0,
          qtyByUnit: {},
          value: 0,
          chems: new Set(),
          months: Array(12).fill(0)
        };
      }
      labMap[r.lab].approvals += 1;
      labMap[r.lab].qtyByUnit[unit] = (labMap[r.lab].qtyByUnit[unit] || 0) + qty;
      labMap[r.lab].chems.add(r.chemicalName);
      labMap[r.lab].months[new Date(r.date).getMonth()] += qty;
    });

    let valueReleased = 0;
    hist.forEach(h => {
      const valBefore = Number(h.totalValueBefore || 0);
      const valAfter = Number(h.totalValueAfter || 0);
      const valConsumed = valBefore - valAfter;
      valueReleased += valConsumed;

      if (chemMap[h.chemicalId]) {
        chemMap[h.chemicalId].value += valConsumed;
      }
      if (labMap[h.lab]) {
        labMap[h.lab].value += valConsumed;
      }
    });

    let mostReqChem = { name: '--', approvals: 0 };
    Object.values(chemMap).forEach(c => {
      if (c.approvals > mostReqChem.approvals) mostReqChem = c;
    });

    let mostActiveLab = { name: '--', approvals: 0 };
    Object.values(labMap).forEach(l => {
      if (l.approvals > mostActiveLab.approvals) mostActiveLab = l;
    });

    return {
      approvals,
      chemsReleased: uniqueChems.size,
      qtyReleased,
      valueReleased,
      mostReqChem: mostReqChem.name,
      mostActiveLab: mostActiveLab.name,
      chemBreakdown: Object.values(chemMap),
      labBreakdown: Object.values(labMap)
    };
  };

  const mCurrent = useMemo(() => aggregateData(cReqs, cHist), [cReqs, cHist]);
  const mPrev = useMemo(() => aggregateData(pReqs, pHist), [pReqs, pHist]);
  const yCurrent = useMemo(() => aggregateData(yReqs, yHist), [yReqs, yHist]);
  const yPrev = useMemo(() => aggregateData(pyReqs, pyHist), [pyReqs, pyHist]);

  const monthWiseYearData = useMemo(() => {
    return MONTHS.map((m, idx) => {
      const monthReqs = yReqs.filter(r => new Date(r.date).getMonth() === idx);
      const monthHist = yHist.filter(h => new Date(h.date).getMonth() === idx);
      const agg = aggregateData(monthReqs, monthHist);
      return { month: m, ...agg };
    });
  }, [yReqs, yHist]);

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const isMonthly = tab === 'monthly';
    const data = isMonthly ? mCurrent : yCurrent;
    const filename = isMonthly ? `RasayanFlow_Report_${MONTHS[month]}_${year}.xlsx` : `RasayanFlow_Report_${year}.xlsx`;

    // Sheet 1: Summary
    const summaryData = [
      { Metric: 'Total Approvals', Value: data.approvals },
      { Metric: 'Total Chemicals Released', Value: data.chemsReleased },
      { Metric: 'Total Quantity Released', Value: formatQtyMap(data.qtyReleased) },
      { Metric: 'Total Value Released (INR)', Value: data.valueReleased },
      { Metric: 'Most Requested Chemical', Value: data.mostReqChem },
      { Metric: 'Most Active Lab', Value: data.mostActiveLab },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), 'Summary');

    // Sheet 2: Chem Breakdown
    const chemSheetData = data.chemBreakdown.map(c => ({
      'Chemical Name': c.name,
      'Chemical ID': c.id,
      'Total Approvals': c.approvals,
      'Total Quantity': `${c.qty} ${c.unit}`,
      'Total Value (INR)': c.value,
      ...(isMonthly ? { 'Requesting Labs': Array.from(c.labs).join(', ') } : {}),
      ...(isMonthly ? {} : MONTHS.reduce((acc, m, i) => ({ ...acc, [m]: `${c.months[i]} ${c.unit}` }), {}))
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(chemSheetData), 'Chemical Breakdown');

    // Sheet 3: Lab Breakdown
    const labSheetData = data.labBreakdown.map(l => ({
      'Lab Name': l.name,
      'Total Approvals': l.approvals,
      'Chemicals Requested': Array.from(l.chems).join(', '),
      'Total Quantity': formatQtyMap(l.qtyByUnit),
      'Total Value (INR)': l.value,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(labSheetData), 'Lab Breakdown');

    // Sheet 4: Month Wise (Yearly Only)
    if (!isMonthly) {
      const monthSheetData = monthWiseYearData.map(m => ({
        'Month': m.month,
        'Total Approvals': m.approvals,
        'Total Chemicals': m.chemsReleased,
        'Total Quantity': formatQtyMap(m.qtyReleased),
        'Total Value (INR)': m.valueReleased,
        'Most Requested Chemical': m.mostReqChem,
        'Most Active Lab': m.mostActiveLab
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(monthSheetData), 'Month Wise');
    }

    XLSX.writeFile(wb, filename);
  };

  const handleExportCSV = () => {
    const isMonthly = tab === 'monthly';
    const data = isMonthly ? mCurrent : yCurrent;
    const filename = isMonthly ? `RasayanFlow_Report_${MONTHS[month]}_${year}.csv` : `RasayanFlow_Report_${year}.csv`;

    const chemSheetData = data.chemBreakdown.map(c => ({
      'Chemical Name': c.name,
      'Chemical ID': c.id,
      'Total Approvals': c.approvals,
      'Total Quantity': `${c.qty} ${c.unit}`,
      'Total Value (INR)': c.value,
      'Requesting Labs': Array.from(c.labs).join(', ')
    }));

    const csv = Papa.unparse(chemSheetData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <StoreLayout title="Reports" subtitle="Monthly and yearly chemical usage and approval reports">
      
      {/* Tabs */}
      <div className="flex border-b border-[#d9e1ca] dark:border-[#414a33] mb-6">
        <button
          onClick={() => setTab('monthly')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm transition-colors ${tab === 'monthly' ? 'border-[#556b2f] text-[#3c4e23] dark:text-[#eef4e8]' : 'border-transparent text-[#71805a] hover:text-[#556b2f] dark:text-[#c5d0b5]'}`}
        >
          <Calendar size={18} /> Monthly Report
        </button>
        <button
          onClick={() => setTab('yearly')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm transition-colors ${tab === 'yearly' ? 'border-[#556b2f] text-[#3c4e23] dark:text-[#eef4e8]' : 'border-transparent text-[#71805a] hover:text-[#556b2f] dark:text-[#c5d0b5]'}`}
        >
          <TrendingUp size={18} /> Yearly Report
        </button>
      </div>

      {/* Current Inventory Section */}
      <Card title="Current Inventory Status" subtitle="Live store inventory metrics">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-2">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2"><Boxes size={16} className="text-blue-500" /><p className="text-xs font-semibold text-slate-500 uppercase">Total Chemicals</p></div>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{inventoryStats.totalChemicals}</p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
            <div className="flex items-center gap-2 mb-2"><Activity size={16} className="text-emerald-500" /><p className="text-xs font-semibold text-emerald-600 dark:text-emerald-500 uppercase">Available Value</p></div>
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">₹{inventoryStats.totalAvailableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
            <div className="flex items-center gap-2 mb-2"><Activity size={16} className="text-indigo-500" /><p className="text-xs font-semibold text-indigo-600 dark:text-indigo-500 uppercase">Received Value</p></div>
            <p className="text-xl font-bold text-indigo-700 dark:text-indigo-400">₹{inventoryStats.totalReceivedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30">
            <div className="flex items-center gap-2 mb-2"><AlertTriangle size={16} className="text-amber-500" /><p className="text-xs font-semibold text-amber-600 dark:text-amber-500 uppercase">Low Stock</p></div>
            <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{inventoryStats.lowStockCount}</p>
          </div>
          <div className="bg-rose-50 dark:bg-rose-900/10 p-4 rounded-xl border border-rose-100 dark:border-rose-900/30">
            <div className="flex items-center gap-2 mb-2"><PackageX size={16} className="text-rose-500" /><p className="text-xs font-semibold text-rose-600 dark:text-rose-500 uppercase">Out of Stock</p></div>
            <p className="text-xl font-bold text-rose-700 dark:text-rose-400">{inventoryStats.outOfStockCount}</p>
          </div>
        </div>
      </Card>

      <div className="h-6"></div>

      {/* Filters & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-[#1a1d16] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6 gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="p-2 bg-[#e8efd9] text-[#4a6022] dark:bg-[#2a3320] dark:text-[#a8be8a] rounded-lg">
            <Filter size={20} />
          </div>
          {tab === 'monthly' && (
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#556b2f]"
            >
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          )}
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#556b2f]"
          >
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="bg-[#556b2f] text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-[#4a5e29] transition-colors ml-2">
            Generate Report
          </button>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button onClick={handleExportExcel} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white dark:bg-[#1a1d16] border border-[#556b2f] text-[#556b2f] dark:text-[#a8be8a] dark:border-[#a8be8a] px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-[#f4f6ee] dark:hover:bg-[#2a3320] transition-colors">
            <Download size={16} /> Export Excel
          </button>
          <button onClick={handleExportCSV} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white dark:bg-[#1a1d16] border border-[#556b2f] text-[#556b2f] dark:text-[#a8be8a] dark:border-[#a8be8a] px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-[#f4f6ee] dark:hover:bg-[#2a3320] transition-colors">
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <StatCard title="Approvals" value={tab === 'monthly' ? mCurrent.approvals : yCurrent.approvals} prevValue={tab === 'monthly' ? mPrev.approvals : yPrev.approvals} />
        <StatCard title="Chems Released" value={tab === 'monthly' ? mCurrent.chemsReleased : yCurrent.chemsReleased} prevValue={tab === 'monthly' ? mPrev.chemsReleased : yPrev.chemsReleased} />
        <StatCard title="Qty Released" value={formatQtyMap(tab === 'monthly' ? mCurrent.qtyReleased : yCurrent.qtyReleased)} type="text" />
        <StatCard title="Value Released" value={tab === 'monthly' ? mCurrent.valueReleased : yCurrent.valueReleased} prevValue={tab === 'monthly' ? mPrev.valueReleased : yPrev.valueReleased} type="currency" />
        <StatCard title="Top Chemical" value={tab === 'monthly' ? mCurrent.mostReqChem : yCurrent.mostReqChem} type="text" />
        <StatCard title="Top Lab" value={tab === 'monthly' ? mCurrent.mostActiveLab : yCurrent.mostActiveLab} type="text" />
      </div>

      <div className="space-y-6">
        
        {/* Month Wise Breakdown (Yearly Only) */}
        {tab === 'yearly' && (
          <Card title="Month Wise Breakdown" subtitle={`Activity for ${year}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#d9e1ca] dark:border-[#414a33]">
                    <th className="py-3 px-4 text-xs font-semibold text-[#71805a] dark:text-[#c5d0b5] uppercase">Month</th>
                    <th className="py-3 px-4 text-xs font-semibold text-[#71805a] dark:text-[#c5d0b5] uppercase">Approvals</th>
                    <th className="py-3 px-4 text-xs font-semibold text-[#71805a] dark:text-[#c5d0b5] uppercase">Chems</th>
                    <th className="py-3 px-4 text-xs font-semibold text-[#71805a] dark:text-[#c5d0b5] uppercase">Quantity</th>
                    <th className="py-3 px-4 text-xs font-semibold text-[#71805a] dark:text-[#c5d0b5] uppercase">Value (₹)</th>
                    <th className="py-3 px-4 text-xs font-semibold text-[#71805a] dark:text-[#c5d0b5] uppercase">Top Chemical</th>
                    <th className="py-3 px-4 text-xs font-semibold text-[#71805a] dark:text-[#c5d0b5] uppercase">Top Lab</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d9e1ca]/50 dark:divide-[#414a33]/50">
                  {monthWiseYearData.map((m, i) => (
                    <tr key={i} className="hover:bg-[#f4f6ee] dark:hover:bg-[#28301f] transition-colors">
                      <td className="py-3 px-4 text-sm font-medium text-[#3c4e23] dark:text-[#eef4e8]">{m.month}</td>
                      <td className="py-3 px-4 text-sm text-[#4e5d35] dark:text-[#d5ddbf]">{m.approvals}</td>
                      <td className="py-3 px-4 text-sm text-[#4e5d35] dark:text-[#d5ddbf]">{m.chemsReleased}</td>
                      <td className="py-3 px-4 text-sm text-[#4e5d35] dark:text-[#d5ddbf]">{formatQtyMap(m.qtyReleased)}</td>
                      <td className="py-3 px-4 text-sm font-semibold text-[#3c4e23] dark:text-[#eef4e8]">₹{m.valueReleased.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-4 text-sm text-[#4e5d35] dark:text-[#d5ddbf]">{m.mostReqChem}</td>
                      <td className="py-3 px-4 text-sm text-[#4e5d35] dark:text-[#d5ddbf]">{m.mostActiveLab}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <Card title={`Chemical ${tab === 'monthly' ? 'Monthly' : 'Yearly'} Breakdown`} subtitle={`Detailed view of chemical usage for ${tab === 'monthly' ? MONTHS[month] : ''} ${year}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#d9e1ca] dark:border-[#414a33]">
                  <th className="py-3 px-4 text-xs font-semibold text-[#71805a] dark:text-[#c5d0b5] uppercase">Chemical</th>
                  {tab === 'yearly' && MONTHS.map(m => <th key={m} className="py-3 px-4 text-xs font-semibold text-[#71805a] dark:text-[#c5d0b5] uppercase">{m.substring(0,3)}</th>)}
                  <th className="py-3 px-4 text-xs font-semibold text-[#71805a] dark:text-[#c5d0b5] uppercase">Approvals</th>
                  <th className="py-3 px-4 text-xs font-semibold text-[#71805a] dark:text-[#c5d0b5] uppercase">Total Qty</th>
                  <th className="py-3 px-4 text-xs font-semibold text-[#71805a] dark:text-[#c5d0b5] uppercase">Total Value (₹)</th>
                  {tab === 'monthly' && <th className="py-3 px-4 text-xs font-semibold text-[#71805a] dark:text-[#c5d0b5] uppercase">Labs</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d9e1ca]/50 dark:divide-[#414a33]/50">
                {(tab === 'monthly' ? mCurrent : yCurrent).chemBreakdown.map((c, i) => (
                  <tr key={i} className="hover:bg-[#f4f6ee] dark:hover:bg-[#28301f] transition-colors">
                    <td className="py-3 px-4">
                      <p className="text-sm font-semibold text-[#3c4e23] dark:text-[#eef4e8]">{c.name}</p>
                      <p className="text-xs text-[#71805a] dark:text-[#c5d0b5]">{c.id}</p>
                    </td>
                    {tab === 'yearly' && c.months.map((mQty, j) => (
                      <td key={j} className="py-3 px-4 text-sm text-[#4e5d35] dark:text-[#d5ddbf]">{mQty > 0 ? `${mQty.toLocaleString()} ${c.unit}` : '-'}</td>
                    ))}
                    <td className="py-3 px-4 text-sm text-[#4e5d35] dark:text-[#d5ddbf]">{c.approvals}</td>
                    <td className="py-3 px-4 text-sm text-[#4e5d35] dark:text-[#d5ddbf]">{`${c.qty.toLocaleString()} ${c.unit}`}</td>
                    <td className="py-3 px-4 text-sm font-semibold text-[#3c4e23] dark:text-[#eef4e8]">₹{c.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    {tab === 'monthly' && <td className="py-3 px-4 text-sm text-[#4e5d35] dark:text-[#d5ddbf]">{Array.from(c.labs).join(', ')}</td>}
                  </tr>
                ))}
                {(tab === 'monthly' ? mCurrent : yCurrent).chemBreakdown.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-sm text-[#71805a]">
                      No approved requests found for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title={`Lab ${tab === 'monthly' ? 'Monthly' : 'Yearly'} Breakdown`} subtitle={`Detailed view of lab activity for ${tab === 'monthly' ? MONTHS[month] : ''} ${year}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#d9e1ca] dark:border-[#414a33]">
                  <th className="py-3 px-4 text-xs font-semibold text-[#71805a] dark:text-[#c5d0b5] uppercase">Lab Name</th>
                  <th className="py-3 px-4 text-xs font-semibold text-[#71805a] dark:text-[#c5d0b5] uppercase">Approvals</th>
                  <th className="py-3 px-4 text-xs font-semibold text-[#71805a] dark:text-[#c5d0b5] uppercase">Chemicals</th>
                  <th className="py-3 px-4 text-xs font-semibold text-[#71805a] dark:text-[#c5d0b5] uppercase">Total Qty</th>
                  <th className="py-3 px-4 text-xs font-semibold text-[#71805a] dark:text-[#c5d0b5] uppercase">Total Value (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d9e1ca]/50 dark:divide-[#414a33]/50">
                {(tab === 'monthly' ? mCurrent : yCurrent).labBreakdown.map((l, i) => (
                  <tr key={i} className="hover:bg-[#f4f6ee] dark:hover:bg-[#28301f] transition-colors">
                    <td className="py-3 px-4 text-sm font-semibold text-[#3c4e23] dark:text-[#eef4e8]">{l.name}</td>
                    <td className="py-3 px-4 text-sm text-[#4e5d35] dark:text-[#d5ddbf]">{l.approvals}</td>
                    <td className="py-3 px-4 text-sm text-[#4e5d35] dark:text-[#d5ddbf] max-w-[200px] truncate" title={Array.from(l.chems).join(', ')}>{Array.from(l.chems).join(', ')}</td>
                    <td className="py-3 px-4 text-sm text-[#4e5d35] dark:text-[#d5ddbf]">{formatQtyMap(l.qtyByUnit)}</td>
                    <td className="py-3 px-4 text-sm font-semibold text-[#3c4e23] dark:text-[#eef4e8]">₹{l.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
                {(tab === 'monthly' ? mCurrent : yCurrent).labBreakdown.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-[#71805a]">
                      No lab activity found for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

      </div>
    </StoreLayout>
  );
}
