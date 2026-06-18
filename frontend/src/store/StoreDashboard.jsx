import { AlertTriangle, Boxes, ClipboardList, PackageX } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import StoreLayout from './StoreLayout';
import useStoreManagerMock, { formatQuantity } from './storeManagerMock';

export default function StoreDashboard() {
  const chemicals = useStoreManagerMock((state) => state.chemicals);
  const requests = useStoreManagerMock((state) => state.requests);
  const history = useStoreManagerMock((state) => state.history);

  const pendingRequests = requests.filter((request) => request.status === 'Pending').length;
  const lowStock = chemicals.filter((chemical) => chemical.status === 'Low Stock').length;
  const outOfStock = chemicals.filter((chemical) => chemical.status === 'Out of Stock').length;
  const categories = new Set(chemicals.map((chemical) => chemical.category)).size;

  const stats = [
    { title: 'Total Chemicals', subtitle: 'Dummy inventory records', value: chemicals.length, icon: Boxes },
    { title: 'Pending Requests', subtitle: 'Awaiting store action', value: pendingRequests, icon: ClipboardList },
    { title: 'Low Stock', subtitle: 'Refill should be planned', value: lowStock, icon: AlertTriangle },
    { title: 'Out of Stock', subtitle: 'Unavailable right now', value: outOfStock, icon: PackageX },
  ];

  return (
    <StoreLayout title='Dashboard' subtitle='Overview of store chemicals, request pressure, and recent movement.'>
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} title={stat.title} subtitle={stat.subtitle}>
              <div className='flex items-end justify-between gap-3'>
                <p className='text-3xl font-semibold'>{stat.value}</p>
                <span className='rounded-xl bg-[#eef4e4] p-3 text-[#556b2f] dark:bg-[#28301f] dark:text-[#c5d0b5]'>
                  <Icon size={20} />
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      <div className='grid gap-4 lg:grid-cols-[1.25fr_0.75fr]'>
        <Card title='Platform Snapshot' subtitle='Current dummy store position'>
          <div className='grid gap-3 sm:grid-cols-3'>
            <div className='rounded-xl bg-[#f7f8f1] p-4 dark:bg-[#28301f]'>
              <p className='text-xs font-semibold uppercase text-[#71805a] dark:text-[#c5d0b5]'>Categories</p>
              <p className='mt-2 text-2xl font-semibold'>{categories}</p>
            </div>
            <div className='rounded-xl bg-[#f7f8f1] p-4 dark:bg-[#28301f]'>
              <p className='text-xs font-semibold uppercase text-[#71805a] dark:text-[#c5d0b5]'>In Stock</p>
              <p className='mt-2 text-2xl font-semibold'>{chemicals.filter((chemical) => chemical.status === 'In Stock').length}</p>
            </div>
            <div className='rounded-xl bg-[#f7f8f1] p-4 dark:bg-[#28301f]'>
              <p className='text-xs font-semibold uppercase text-[#71805a] dark:text-[#c5d0b5]'>History Rows</p>
              <p className='mt-2 text-2xl font-semibold'>{history.length}</p>
            </div>
          </div>
        </Card>

        <Card title='Quick Actions' subtitle='Common store manager tasks'>
          <div className='grid gap-2'>
            <Link to='/store/inventory' className='inline-flex min-h-[2.5rem] items-center justify-center gap-2 rounded-lg border border-transparent bg-[#556b2f] px-4 py-2 text-sm font-semibold text-[#f0f4e8] hover:bg-[#6f7d45]'>
              Manage Inventory
            </Link>
            <Link to='/store/requests' className='inline-flex min-h-[2.5rem] items-center justify-center gap-2 rounded-lg border border-[#cfd8bd] bg-white px-4 py-2 text-sm font-semibold text-[#3c4e23] hover:bg-[#f4f6ee] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8] dark:hover:bg-[#2a3121]'>
              Review Requests
            </Link>
            <Link to='/store/history' className='inline-flex min-h-[2.5rem] items-center justify-center gap-2 rounded-lg border border-[#cfd8bd] bg-white px-4 py-2 text-sm font-semibold text-[#3c4e23] hover:bg-[#f4f6ee] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8] dark:hover:bg-[#2a3121]'>
              Export History
            </Link>
          </div>
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
    </StoreLayout>
  );
}
