import React, { useMemo } from 'react';
import { AlertTriangle, PackageX, AlertCircle, Settings2 } from 'lucide-react';
import StoreLayout from './StoreLayout';
import Card from '../components/ui/Card';
import useStoreManagerMock, { parsePackSize } from './storeManagerMock';

function AlertCard({ chemical, alertThreshold }) {
  const received = Number(chemical['Received Quantity'] || 0);
  const available = Number(chemical['Available Quantity'] || 0);
  const packData = parsePackSize(chemical['Pack Size']);
  const unit = packData.unit;
  
  const totalBase = received * packData.value;
  const availableBase = available * packData.value;
  
  let percentage = 0;
  if (totalBase > 0) {
    percentage = (availableBase / totalBase) * 100;
  } else if (availableBase > 0) {
    percentage = 100;
  }
  
  const thresholdValue = (totalBase * alertThreshold) / 100;
  const shortage = Math.max(0, thresholdValue - availableBase);

  let barColor = 'bg-emerald-500';
  let badge = null;
  
  if (percentage === 0 && totalBase > 0) {
    barColor = 'bg-rose-800';
    badge = <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 rounded border border-rose-200 dark:border-rose-800"><PackageX size={12}/> Out of Stock</span>;
  } else if (percentage < 5) {
    barColor = 'bg-rose-500';
    badge = <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 rounded border border-rose-200 dark:border-rose-800/50"><AlertCircle size={12}/> Critical</span>;
  } else if (percentage < alertThreshold) {
    barColor = 'bg-amber-500';
    badge = <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded border border-amber-200 dark:border-amber-800/50"><AlertTriangle size={12}/> Warning</span>;
  }

  return (
    <div className={`p-4 rounded-xl border-2 ${percentage === 0 ? 'border-rose-800/50' : percentage < 5 ? 'border-rose-400 dark:border-rose-800' : 'border-amber-400 dark:border-amber-800'} bg-white dark:bg-[#1a1d16] flex flex-col gap-3 shadow-sm relative overflow-hidden`}>
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-bold text-slate-800 dark:text-slate-100">{chemical['Chemical Name']}</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{chemical['Chemical ID']}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700">
            {chemical['Grade'] || 'LR'}
          </span>
          {badge}
        </div>
      </div>
      
      <div className="mt-2">
        <div className="flex justify-between text-xs font-semibold mb-1">
          <span className="text-slate-600 dark:text-slate-300">Stock Remaining</span>
          <span className="text-slate-800 dark:text-slate-100">{percentage === 0 && totalBase > 0 ? '0%' : `${percentage.toFixed(1)}%`}</span>
        </div>
        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${Math.min(100, percentage)}%` }} />
        </div>
      </div>
      
      <div className="flex flex-col gap-1.5 mt-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-500 font-medium">Total Stock</span>
          <span className="font-semibold text-slate-700 dark:text-slate-200">{totalBase.toLocaleString()} {unit}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500 font-medium">Available</span>
          <span className="font-bold text-slate-800 dark:text-slate-100">{availableBase.toLocaleString()} {unit}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500 font-medium">Threshold ({alertThreshold}%)</span>
          <span className="font-semibold text-slate-600 dark:text-slate-400">{thresholdValue.toLocaleString()} {unit}</span>
        </div>
        {shortage > 0 && (
          <div className="flex justify-between text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/10 -mx-4 -mb-4 p-3 px-4 mt-2 border-t border-rose-100 dark:border-rose-900/30">
            <span className="font-semibold text-[11px] uppercase">Shortage</span>
            <span className="font-bold">{shortage.toLocaleString()} {unit} below threshold</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StoreAlerts() {
  const chemicals = useStoreManagerMock((state) => state.chemicals);
  const alertThreshold = useStoreManagerMock((state) => state.alertThreshold);
  const setAlertThreshold = useStoreManagerMock((state) => state.setAlertThreshold);

  const alerts = useMemo(() => {
    const list = [];
    let outOfStock = 0;
    let critical = 0;
    let warning = 0;

    chemicals.forEach(chem => {
      const received = Number(chem['Received Quantity'] || 0);
      const available = Number(chem['Available Quantity'] || 0);
      const packData = parsePackSize(chem['Pack Size']);
      
      const totalBase = received * packData.value;
      const availableBase = available * packData.value;
      
      if (totalBase > 0) {
        const percentage = (availableBase / totalBase) * 100;
        if (percentage < alertThreshold) {
          list.push({ chem, percentage, totalBase });
          if (percentage === 0) outOfStock++;
          else if (percentage < 5) critical++;
          else warning++;
        }
      }
    });

    list.sort((a, b) => a.percentage - b.percentage);

    return { list, outOfStock, critical, warning };
  }, [chemicals, alertThreshold]);

  return (
    <StoreLayout title="Low Stock Alerts" subtitle={`Chemicals below ${alertThreshold}% threshold`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 bg-white dark:bg-[#1a1d16] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-lg">
            <Settings2 size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Global Alert Threshold</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Adjust the warning sensitivity for all chemicals.</p>
          </div>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto justify-end">
          <input 
            type="range" 
            min="1" 
            max="50" 
            value={alertThreshold} 
            onChange={(e) => setAlertThreshold(Number(e.target.value))}
            className="w-full md:w-48 accent-[#556b2f] dark:accent-[#a8be8a]"
          />
          <span className="font-bold text-lg text-slate-800 dark:text-slate-100 min-w-[3rem] text-right">{alertThreshold}%</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#f7f8f1] dark:bg-[#28301f] border border-[#d9e1ca] dark:border-[#414a33] p-4 rounded-xl">
          <p className="text-xs font-semibold text-[#71805a] dark:text-[#c5d0b5] uppercase">Total Alerts</p>
          <p className="text-2xl font-bold text-[#3c4e23] dark:text-[#eef4e8] mt-1">{alerts.list.length}</p>
        </div>
        <div className="bg-rose-900/10 border border-rose-800/30 p-4 rounded-xl">
          <p className="text-xs font-semibold text-rose-800 dark:text-rose-400 uppercase">Out of Stock</p>
          <p className="text-2xl font-bold text-rose-900 dark:text-rose-100 mt-1">{alerts.outOfStock}</p>
        </div>
        <div className="bg-rose-50 dark:bg-rose-900/5 border border-rose-200 dark:border-rose-900/20 p-4 rounded-xl">
          <p className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase">Critical &lt; 5%</p>
          <p className="text-2xl font-bold text-rose-800 dark:text-rose-200 mt-1">{alerts.critical}</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/5 border border-amber-200 dark:border-amber-900/20 p-4 rounded-xl">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase">Warning</p>
          <p className="text-2xl font-bold text-amber-800 dark:text-amber-200 mt-1">{alerts.warning}</p>
        </div>
      </div>

      <Card title="Action Required" subtitle={`${alerts.list.length} chemicals currently below safe levels`}>
        {alerts.list.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
            {alerts.list.map(item => (
              <AlertCard key={item.chem.id} chemical={item.chem} alertThreshold={alertThreshold} />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-white dark:bg-[#1a1d16] rounded-xl border border-dashed border-emerald-300 dark:border-emerald-800/50 mt-4">
            <div className="mx-auto w-12 h-12 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full flex items-center justify-center mb-3">
              <AlertTriangle size={24} />
            </div>
            <p className="text-emerald-800 dark:text-emerald-300 font-bold text-lg">All Stock Safe!</p>
            <p className="text-emerald-600 dark:text-emerald-500 font-medium text-sm mt-1">No chemicals are currently below the {alertThreshold}% threshold.</p>
          </div>
        )}
      </Card>
    </StoreLayout>
  );
}
