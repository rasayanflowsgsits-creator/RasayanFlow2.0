import { useMemo } from 'react';
import Card from '../components/ui/Card';
import StoreLayout from './StoreLayout';
import useStoreManagerMock, { parsePackSize } from './storeManagerMock';

function StockOverviewCard({ chemical }) {
  const received = Number(chemical['Received Quantity'] || 0);
  const available = Number(chemical['Available Quantity'] || 0);
  const used = Math.max(0, received - available);
  
  const packData = parsePackSize(chemical['Pack Size']);
  const unit = packData.unit;
  
  const receivedBase = received * packData.value;
  const availableBase = available * packData.value;
  const usedBase = used * packData.value;
  
  let percentage = 0;
  if (received > 0) {
    percentage = (available / received) * 100;
  } else if (available > 0) {
    percentage = 100;
  }
  
  let colorClass = 'bg-rose-500';
  let borderClass = 'border-rose-400 dark:border-rose-800';
  if (percentage > 50) {
    colorClass = 'bg-emerald-500';
    borderClass = 'border-emerald-400 dark:border-emerald-800';
  } else if (percentage >= 25) {
    colorClass = 'bg-amber-500';
    borderClass = 'border-amber-400 dark:border-amber-800';
  }

  return (
    <div className={`p-4 rounded-xl border-2 ${borderClass} bg-white dark:bg-[#1a1d16] flex flex-col gap-3 shadow-sm`}>
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-bold text-slate-800 dark:text-slate-100">{chemical['Chemical Name']}</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{chemical['Chemical ID']}</p>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700">
          {chemical['Grade'] || 'LR'}
        </span>
      </div>
      
      <div>
        <div className="flex justify-between text-xs font-semibold mb-1">
          <span className="text-slate-600 dark:text-slate-300">Available vs Received</span>
          <span className="text-slate-800 dark:text-slate-100">{percentage === 0 && received > 0 ? 'Out of Stock' : `${Math.round(percentage)}%`}</span>
        </div>
        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full ${colorClass} transition-all duration-500`} style={{ width: `${Math.min(100, percentage)}%` }} />
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-2 mt-1 pt-3 border-t border-slate-100 dark:border-slate-800">
        <div>
          <p className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-semibold mb-0.5">Total Received</p>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-tight">
            {receivedBase.toLocaleString()} {unit}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-semibold mb-0.5">Available</p>
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 leading-tight">
            {availableBase.toLocaleString()} {unit}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-semibold mb-0.5">Used</p>
          <p className="text-sm font-bold text-rose-600 dark:text-rose-400 leading-tight">
            {usedBase.toLocaleString()} {unit}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function StoreStockOverview() {
  const chemicals = useStoreManagerMock((state) => state.chemicals);
  const history = useStoreManagerMock((state) => state.history);

  const approvedChemicalIds = useMemo(() => {
    const ids = new Set();
    history.forEach(h => {
      if (h.status === 'Approved' && h.chemicalId) {
        ids.add(h.chemicalId);
      }
    });
    return Array.from(ids);
  }, [history]);

  const overviewChemicals = useMemo(() => {
    return chemicals.filter(c => approvedChemicalIds.includes(c['Chemical ID']));
  }, [chemicals, approvedChemicalIds]);

  return (
    <StoreLayout title="Stock Overview" subtitle="Approved request impact on inventory">
      {overviewChemicals.length > 0 ? (
        <Card title="Chemical Stock Overview" subtitle="Live tracking of available vs used stock">
          <div className="mb-4 text-sm font-medium text-[#71805a] dark:text-[#c5d0b5]">
            Showing {overviewChemicals.length} chemical{overviewChemicals.length !== 1 ? 's' : ''} affected by approved requests
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {overviewChemicals.map(chem => (
              <StockOverviewCard key={chem.id} chemical={chem} />
            ))}
          </div>
        </Card>
      ) : (
        <div className="p-8 text-center bg-white dark:bg-[#1a1d16] rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 font-medium">No chemicals have approved requests yet.</p>
        </div>
      )}
    </StoreLayout>
  );
}
