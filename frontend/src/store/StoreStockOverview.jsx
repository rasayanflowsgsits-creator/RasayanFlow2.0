import { useEffect, useMemo, useState } from 'react';
import Card from '../components/ui/Card';
import api from '../services/api';
import { toFrontendChemical, toFrontendHistory } from '../utils/storeMapper';
import useAppStore from './appStore';
import StoreLayout from './StoreLayout';
import { parsePackSize } from './storeManagerMock';

function getPackData(chemical) {
  const parsed = parsePackSize(chemical['Pack Size']);
  const standardUnit = chemical['Standard Unit'] || parsed.unit || 'units';
  return {
    value: Number(parsed.value || 1),
    unit: parsed.unit && parsed.unit !== 'ml' ? parsed.unit : standardUnit,
  };
}

function StockOverviewCard({ chemical }) {
  const received = Number(chemical['Received Quantity'] || 0);
  const available = Number(chemical['Available Quantity'] || 0);
  const packData = getPackData(chemical);
  const approvedIssuedBase = Number(chemical.overview?.approvedIssuedBase || 0);
  const inventoryUsedBase = Math.max(0, (received - available) * packData.value);
  const usedBase = Math.max(approvedIssuedBase, inventoryUsedBase);
  const availableBase = available * packData.value;
  const receivedBase = Math.max(received * packData.value, availableBase + usedBase);
  const percentage = receivedBase > 0 ? (availableBase / receivedBase) * 100 : 0;

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
    <div className={`flex flex-col gap-3 rounded-xl border-2 ${borderClass} bg-white p-4 shadow-sm dark:bg-[#1a1d16]`}>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <h4 className='truncate font-bold text-slate-800 dark:text-slate-100'>{chemical['Chemical Name']}</h4>
          <p className='mt-0.5 text-xs text-slate-500 dark:text-slate-400'>{chemical['Chemical ID']}</p>
          {chemical.overview?.lastLab ? <p className='mt-1 text-xs text-[#71805a] dark:text-[#c5d0b5]'>Last issued to {chemical.overview.lastLab}</p> : null}
        </div>
        <span className='rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'>
          {chemical['Grade'] || 'LR'}
        </span>
      </div>

      <div>
        <div className='mb-1 flex justify-between text-xs font-semibold'>
          <span className='text-slate-600 dark:text-slate-300'>Available vs Received</span>
          <span className='text-slate-800 dark:text-slate-100'>{percentage === 0 && receivedBase > 0 ? 'Out of Stock' : `${Math.round(percentage)}%`}</span>
        </div>
        <div className='h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800'>
          <div className={`h-full ${colorClass} transition-all duration-500`} style={{ width: `${Math.min(100, percentage)}%` }} />
        </div>
      </div>

      <div className='mt-1 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 dark:border-slate-800'>
        <div>
          <p className='mb-0.5 text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400'>Total Received</p>
          <p className='text-sm font-bold leading-tight text-slate-700 dark:text-slate-200'>{receivedBase.toLocaleString()} {packData.unit}</p>
        </div>
        <div>
          <p className='mb-0.5 text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400'>Available</p>
          <p className='text-sm font-bold leading-tight text-emerald-600 dark:text-emerald-400'>{availableBase.toLocaleString()} {packData.unit}</p>
        </div>
        <div>
          <p className='mb-0.5 text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400'>Used</p>
          <p className='text-sm font-bold leading-tight text-rose-600 dark:text-rose-400'>{usedBase.toLocaleString()} {packData.unit}</p>
        </div>
      </div>
    </div>
  );
}

export default function StoreStockOverview() {
  const [chemicals, setChemicals] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const setToast = useAppStore((state) => state.setToast);

  useEffect(() => {
    const fetchOverviewData = async () => {
      setLoading(true);
      try {
        const [inventoryRes, historyRes] = await Promise.all([
          api.get('/store/inventory'),
          api.get('/store/history'),
        ]);
        setChemicals((inventoryRes.data || []).map(toFrontendChemical));
        setHistory((historyRes.data || []).map(toFrontendHistory));
      } catch (error) {
        console.error('Failed to load stock overview:', error);
        setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to load stock overview.' });
      } finally {
        setLoading(false);
      }
    };

    fetchOverviewData();
  }, [setToast]);

  const approvedByChemical = useMemo(() => {
    return history.reduce((acc, entry) => {
      if (entry.status !== 'Approved') return acc;
      const key = entry.chemicalId || entry.chemicalName;
      if (!key) return acc;

      const current = acc.get(key) || {
        approvedIssuedBase: 0,
        approvals: 0,
        lastLab: '',
        lastDate: '',
      };
      current.approvedIssuedBase += Number(entry.qtyRequestedBase || entry.qtyRequested || 0);
      current.approvals += 1;
      if (!current.lastDate || new Date(entry.date) > new Date(current.lastDate)) {
        current.lastDate = entry.date;
        current.lastLab = entry.lab;
      }
      acc.set(key, current);
      return acc;
    }, new Map());
  }, [history]);

  const overviewChemicals = useMemo(() => {
    return chemicals
      .map((chemical) => {
        const byId = approvedByChemical.get(chemical['Chemical ID']);
        const byName = approvedByChemical.get(chemical['Chemical Name']);
        const overview = byId || byName || null;
        const received = Number(chemical['Received Quantity'] || 0);
        const available = Number(chemical['Available Quantity'] || 0);
        const hasInventoryImpact = received > 0 && available < received;
        if (!overview && !hasInventoryImpact) return null;
        return {
          ...chemical,
          overview: overview || {
            approvedIssuedBase: Math.max(0, received - available) * getPackData(chemical).value,
            approvals: 0,
            lastLab: '',
            lastDate: '',
          },
        };
      })
      .filter(Boolean);
  }, [approvedByChemical, chemicals]);

  const totalIssued = overviewChemicals.reduce((sum, chemical) => sum + Number(chemical.overview?.approvedIssuedBase || 0), 0);
  const totalApprovals = Array.from(approvedByChemical.values()).reduce((sum, item) => sum + item.approvals, 0);

  return (
    <StoreLayout title='Stock Overview' subtitle='Approved request impact on inventory from the store database'>
      {loading ? (
        <div className='rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-[#1a1d16]'>
          <p className='font-medium text-slate-500 dark:text-slate-400'>Loading stock overview...</p>
        </div>
      ) : overviewChemicals.length > 0 ? (
        <Card title='Chemical Stock Overview' subtitle='Live tracking of available vs used stock from approved requests'>
          <div className='mb-4 grid gap-3 text-sm font-medium text-[#71805a] dark:text-[#c5d0b5] sm:grid-cols-3'>
            <div className='rounded-xl bg-[#f7f8f1] p-3 dark:bg-[#28301f]'>
              <p className='text-xs uppercase'>Affected Chemicals</p>
              <p className='mt-1 text-xl font-semibold text-[#3c4e23] dark:text-[#eef4e8]'>{overviewChemicals.length}</p>
            </div>
            <div className='rounded-xl bg-[#f7f8f1] p-3 dark:bg-[#28301f]'>
              <p className='text-xs uppercase'>Approved Requests</p>
              <p className='mt-1 text-xl font-semibold text-[#3c4e23] dark:text-[#eef4e8]'>{totalApprovals}</p>
            </div>
            <div className='rounded-xl bg-[#f7f8f1] p-3 dark:bg-[#28301f]'>
              <p className='text-xs uppercase'>Issued Quantity</p>
              <p className='mt-1 text-xl font-semibold text-[#3c4e23] dark:text-[#eef4e8]'>{totalIssued.toLocaleString()}</p>
            </div>
          </div>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {overviewChemicals.map((chemical) => (
              <StockOverviewCard key={chemical.id || chemical['Chemical ID']} chemical={chemical} />
            ))}
          </div>
        </Card>
      ) : (
        <div className='rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-[#1a1d16]'>
          <p className='font-medium text-slate-500 dark:text-slate-400'>No approved request impact found in the store database yet.</p>
        </div>
      )}
    </StoreLayout>
  );
}
