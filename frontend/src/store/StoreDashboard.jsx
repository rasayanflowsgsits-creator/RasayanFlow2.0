import { AlertTriangle, Boxes, ClipboardList, FileSpreadsheet, PackageX, IndianRupee, TrendingUp, TrendingDown, Minus, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import StoreImportModal from './StoreImportModal';
import StoreLayout from './StoreLayout';
import { UpdateTypeBadge } from './StoreTracking';
import { formatQuantity } from './storeManagerMock';
import { safeRound, totalStock } from '../utils/storeHelpers';
import api from '../services/api';
import { toFrontendChemical } from '../utils/storeMapper';

export default function StoreDashboard() {
  const [chemicals, setChemicals] = useState([]);
  const [requests, setRequests] = useState([]);
  const [history, setHistory] = useState([]);
  const [trackingLogs, setTrackingLogs] = useState([]);
  const [importOpen, setImportOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [invRes, reqRes, histRes, trackRes] = await Promise.all([
          api.get('/store/inventory'),
          api.get('/store/requests'),
          api.get('/store/history'),
          api.get('/store/tracking')
        ]);
        setChemicals((invRes.data || []).map(toFrontendChemical));
        setRequests(reqRes.data || []);
        setHistory(histRes.data || []);
        setTrackingLogs(trackRes.data || []);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const pendingRequests = requests.filter((request) => request.status === 'Pending').length;
  const lowStock = chemicals.filter((chemical) => chemical.status === 'Low Stock').length;
  const outOfStock = chemicals.filter((chemical) => chemical.status === 'Out of Stock').length;
  const categories = new Set(chemicals.map((chemical) => chemical.category || chemical['Hazard Class'])).size;

  const totalInventoryValue = safeRound(chemicals.reduce((acc, chem) => acc + (chem['Total Current Value (INR)'] || 0), 0));
  const mostExpensiveChem = chemicals.reduce((max, chem) => ((chem['Unit Price (INR)'] || 0) > (max['Unit Price (INR)'] || 0) ? chem : max), chemicals[0] || {});
  
  const inStockChems = chemicals.filter(chem => (chem['Total Current Value (INR)'] || 0) > 0);
  const lowestStockChem = inStockChems.reduce((min, chem) => ((chem['Total Current Value (INR)'] || 0) < (min['Total Current Value (INR)'] || Infinity) ? chem : min), inStockChems[0] || {});

  const outOfStockLoss = safeRound(chemicals
    .filter(chem => chem.status === 'Out of Stock')
    .reduce((acc, chem) => acc + ((chem['Unit Price (INR)'] || 0) * (chem['Received Quantity'] || 0)), 0));

  const alertThreshold = 15; // Set to 15% directly instead of using mock state

  const lowStockAlerts = [...chemicals].reduce((acc, chem) => {
    const receivedStock = totalStock(chem['Received Quantity'], chem['Pack Size']);
    const availableStock = totalStock(chem['Available Quantity'], chem['Pack Size']);
    const totalBase = receivedStock.total;
    const availableBase = availableStock.total;
    if (totalBase > 0) {
      const percentage = safeRound((availableBase / totalBase) * 100);
      if (percentage < alertThreshold) {
        acc.push({ chem, percentage, availableBase, unit: availableStock.unit });
      }
    }
    return acc;
  }, []).sort((a, b) => a.percentage - b.percentage);

  const stats = [
    { title: 'Total Chemicals', subtitle: 'Total distinct chemicals', value: chemicals.length, icon: Boxes, gradient: 'from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/20', iconColor: 'text-blue-600 dark:text-blue-400', trend: TrendingUp },
    { title: 'Pending Requests', subtitle: 'Awaiting store action', value: pendingRequests, icon: ClipboardList, gradient: 'from-emerald-50 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/20', iconColor: 'text-emerald-600 dark:text-emerald-400', trend: Minus },
    { title: 'Low Stock', subtitle: 'Refill should be planned', value: lowStock, icon: AlertTriangle, gradient: 'from-amber-50 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/20', iconColor: 'text-amber-600 dark:text-amber-400', trend: TrendingDown },
    { title: 'Out of Stock', subtitle: 'Unavailable right now', value: outOfStock, icon: PackageX, gradient: 'from-rose-50 to-red-100 dark:from-rose-900/30 dark:to-red-900/20', iconColor: 'text-rose-600 dark:text-rose-400', trend: TrendingDown },
  ];

  return (
    <StoreLayout title='Dashboard' subtitle='Overview of store chemicals, request pressure, and recent movement.'>
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        {stats.map((stat) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trend;
          return (
            <Card key={stat.title} title={stat.title} subtitle={stat.subtitle}>
              <div className={`-m-4 mt-2 rounded-b-xl bg-gradient-to-br p-4 ${stat.gradient}`}>
                <div className='flex items-end justify-between gap-3'>
                  <div className='flex items-center gap-2'>
                    <p className={`text-3xl font-semibold ${stat.iconColor}`}>{stat.value}</p>
                    <TrendIcon size={16} className={`${stat.iconColor} opacity-70`} />
                  </div>
                  <span className={`rounded-xl bg-white/60 p-3 shadow-sm dark:bg-black/20 ${stat.iconColor}`}>
                    <Icon size={20} />
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className='grid gap-4 lg:grid-cols-[1fr_0.8fr_0.8fr]'>
        <Card title='Inventory Value Summary' subtitle='Overall price distribution'>
          <div className='grid gap-3 sm:grid-cols-2'>
            <div className='rounded-xl bg-emerald-50 p-4 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30'>
              <div className='flex items-center justify-between'>
                <p className='text-xs font-semibold uppercase text-emerald-800 dark:text-emerald-400'>Total Inventory Value</p>
                <IndianRupee size={14} className='text-emerald-600 dark:text-emerald-500' />
              </div>
              <p className='mt-2 text-2xl font-bold text-emerald-900 dark:text-emerald-100'>{totalInventoryValue.toLocaleString('en-IN')} ₹</p>
            </div>
            <div className='rounded-xl bg-rose-50 p-4 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/30'>
              <div className='flex items-center justify-between'>
                <p className='text-xs font-semibold uppercase text-rose-800 dark:text-rose-400'>Out of Stock Loss</p>
                <IndianRupee size={14} className='text-rose-600 dark:text-rose-500' />
              </div>
              <p className='mt-2 text-2xl font-bold text-rose-900 dark:text-rose-100'>{outOfStockLoss.toLocaleString('en-IN')} ₹</p>
            </div>
            <div className='rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700'>
              <p className='text-xs font-semibold uppercase text-slate-500 dark:text-slate-400'>Most Expensive Chemical</p>
              <p className='mt-1 text-sm font-medium text-slate-800 dark:text-slate-200 truncate' title={mostExpensiveChem['Chemical Name']}>{mostExpensiveChem['Chemical Name'] || '--'}</p>
              <p className='mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100'>{(mostExpensiveChem['Unit Price (INR)'] || 0).toLocaleString('en-IN')} ₹ / {mostExpensiveChem['Standard Unit'] || 'Unit'}</p>
            </div>
            <div className='rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700'>
              <p className='text-xs font-semibold uppercase text-slate-500 dark:text-slate-400'>Lowest Stock Value</p>
              <p className='mt-1 text-sm font-medium text-slate-800 dark:text-slate-200 truncate' title={lowestStockChem['Chemical Name']}>{lowestStockChem['Chemical Name'] || '--'}</p>
              <p className='mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100'>{(lowestStockChem['Total Current Value (INR)'] || 0).toLocaleString('en-IN')} ₹ total</p>
            </div>
          </div>
        </Card>

        <Card title='Platform Snapshot' subtitle='Current dummy store position'>
          <div className='grid gap-3'>
            <div className='flex items-center justify-between rounded-xl bg-[#f7f8f1] p-3 px-4 dark:bg-[#28301f]'>
              <p className='text-sm font-semibold text-[#71805a] dark:text-[#c5d0b5]'>Categories</p>
              <p className='text-xl font-semibold'>{categories}</p>
            </div>
            <div className='flex items-center justify-between rounded-xl bg-[#f7f8f1] p-3 px-4 dark:bg-[#28301f]'>
              <p className='text-sm font-semibold text-[#71805a] dark:text-[#c5d0b5]'>In Stock</p>
              <p className='text-xl font-semibold'>{chemicals.filter((chemical) => chemical.status === 'In Stock').length}</p>
            </div>
            <div className='flex items-center justify-between rounded-xl bg-[#f7f8f1] p-3 px-4 dark:bg-[#28301f]'>
              <p className='text-sm font-semibold text-[#71805a] dark:text-[#c5d0b5]'>History Rows</p>
              <p className='text-xl font-semibold'>{history.length}</p>
            </div>
          </div>
        </Card>

        <Card title='Quick Actions' subtitle='Common store manager tasks'>
          <div className='flex flex-col gap-3 h-full justify-center'>
            <button
              type='button'
              className='inline-flex w-full min-h-[2.75rem] items-center justify-start gap-3 rounded-lg border border-transparent bg-[#556b2f] px-5 py-2 text-sm font-semibold text-[#f0f4e8] hover:bg-[#6f7d45] transition-colors shadow-sm'
              onClick={() => setImportOpen(true)}
            >
              <FileSpreadsheet size={18} /> Import from Google Sheets
            </button>
            <Link to='/store/inventory' className='inline-flex w-full min-h-[2.75rem] items-center justify-start gap-3 rounded-lg border border-transparent bg-[#556b2f] px-5 py-2 text-sm font-semibold text-[#f0f4e8] hover:bg-[#6f7d45] transition-colors shadow-sm'>
              <Boxes size={18} /> Manage Inventory
            </Link>
            <Link to='/store/requests' className='inline-flex w-full min-h-[2.75rem] items-center justify-start gap-3 rounded-lg border border-[#cfd8bd] bg-white px-5 py-2 text-sm font-semibold text-[#3c4e23] hover:bg-[#f4f6ee] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8] dark:hover:bg-[#2a3121] transition-colors shadow-sm'>
              <ClipboardList size={18} /> Review Requests
            </Link>
          </div>
        </Card>

        <Card title='⚠️ Low Stock Alerts' subtitle='Chemicals needing attention'>
          {lowStockAlerts.length > 0 ? (
            <div className='flex flex-col gap-3 h-full justify-between'>
              <div className='space-y-3'>
                {lowStockAlerts.slice(0, 3).map((item) => (
                  <div key={item.chem.id} className='flex justify-between items-center bg-rose-50 dark:bg-rose-900/10 p-3 rounded-lg border border-rose-100 dark:border-rose-900/30'>
                    <div>
                      <p className='text-sm font-semibold text-slate-800 dark:text-slate-200'>{item.chem['Chemical Name']}</p>
                      <p className='text-xs text-slate-500 dark:text-slate-400 mt-0.5'>{item.availableBase.toLocaleString()} {item.unit} available</p>
                    </div>
                    <div className='flex flex-col items-end gap-1'>
                      <span className='text-xs font-bold text-rose-600 dark:text-rose-400'>
                        {item.percentage === 0 ? '0%' : `${item.percentage.toFixed(1)}%`}
                      </span>
                      <span className='text-[10px] font-bold px-1.5 py-0.5 bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 rounded border border-rose-200 dark:border-rose-800'>
                        {item.percentage === 0 ? 'Out of Stock' : item.percentage < 5 ? 'Critical' : 'Warning'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <Link to='/store/lowstock' className='inline-flex w-full min-h-[2.75rem] items-center justify-center gap-3 rounded-lg border border-rose-200 bg-white px-5 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-900/50 dark:bg-[#20251a] dark:text-rose-400 dark:hover:bg-rose-900/20 transition-colors shadow-sm mt-2'>
                View All Alerts
              </Link>
            </div>
          ) : (
            <div className='flex flex-col items-center justify-center h-full py-6 text-center'>
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full flex items-center justify-center mb-3">
                <CheckCircle2 size={24} />
              </div>
              <p className='text-sm font-semibold text-slate-700 dark:text-slate-300'>All Stock Safe</p>
              <p className='text-xs text-slate-500 mt-1'>No chemicals below {alertThreshold}% threshold</p>
            </div>
          )}
        </Card>
      </div>

      <Card title='Recent Activity' subtitle='Latest request and allotment events'>
        <div className='space-y-3'>
          {history.slice(0, 5).map((entry) => (
            <div key={entry.id} className='flex flex-col justify-between gap-2 rounded-xl bg-[#f7f8f1] p-4 dark:bg-[#28301f] sm:flex-row sm:items-center'>
              <div>
                <p className='font-medium text-[#3c4e23] dark:text-[#eef4e8]'>{entry.chemicalName} to {entry.lab}</p>
                <p className='mt-1 text-sm text-[#71805a] dark:text-[#c5d0b5]'>{formatQuantity(entry.quantity, entry.unit)}</p>
              </div>
              <span className='w-fit rounded-full bg-[#e8efd9] px-3 py-1 text-xs font-semibold text-[#4a6022] dark:bg-[#2a3320] dark:text-[#a8be8a]'>{entry.status}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card title='Recent Chemical Updates' subtitle='Latest inventory changes'>
        <div className='space-y-3'>
          {trackingLogs.slice(0, 5).map((entry) => (
            <div key={entry.trackId} className='flex flex-col justify-between gap-2 rounded-xl bg-[#f7f8f1] p-4 dark:bg-[#28301f] sm:flex-row sm:items-center'>
              <div className='flex flex-col'>
                <p className='font-medium text-[#3c4e23] dark:text-[#eef4e8]'>{entry.chemicalName}</p>
                <p className='mt-1 text-sm text-[#71805a] dark:text-[#c5d0b5]'>{new Date(entry.timestamp).toLocaleString()}</p>
              </div>
              <div className='flex items-center gap-4'>
                <div className='text-right'>
                  {entry.qtyChange === 0 ? (
                    <span className='text-slate-500 font-semibold text-sm'>0 Qty</span>
                  ) : entry.qtyChange > 0 ? (
                    <span className='text-emerald-600 dark:text-emerald-400 font-semibold text-sm'>+{entry.qtyChange} Qty</span>
                  ) : (
                    <span className='text-rose-600 dark:text-rose-400 font-semibold text-sm'>{entry.qtyChange} Qty</span>
                  )}
                  <p className='text-xs text-[#71805a] dark:text-[#c5d0b5]'>{entry.totalValue} ₹</p>
                </div>
                <UpdateTypeBadge type={entry.updateType} />
              </div>
            </div>
          ))}
          {trackingLogs.length === 0 && (
            <p className='text-sm text-[#71805a] dark:text-[#c5d0b5]'>No recent updates.</p>
          )}
        </div>
      </Card>
      
      <StoreImportModal open={importOpen} onClose={() => { setImportOpen(false); window.location.reload(); }} />
    </StoreLayout>
  );
}
