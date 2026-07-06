import { BarChart3, ClipboardList, History, LayoutDashboard, Activity } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const storeLinks = [
  { to: '/store/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/store/inventory', label: 'Inventory', icon: ClipboardList },
  { to: '/store/tracking', label: 'Tracking', icon: Activity },
  { to: '/store/requests', label: 'Requests', icon: BarChart3 },
  { to: '/store/history', label: 'History', icon: History },
];

export default function StoreLayout({ title, subtitle, actions, children }) {
  return (
    <div className='space-y-6 pb-10'>
      <div className='rounded-2xl border border-[#d9e1ca] bg-[#f9faef] p-4 shadow-soft dark:border-[#414a33] dark:bg-[#1f2419]'>
        <div className='flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between'>
          <div>
            <p className='text-xs font-semibold uppercase text-[#71805a] dark:text-[#c5d0b5]'>Store Manager</p>
            <h1 className='mt-1 text-2xl font-semibold text-[#3c4e23] dark:text-[#eef4e8]'>{title}</h1>
            {subtitle ? <p className='mt-1 text-sm text-[#71805a] dark:text-[#c5d0b5]'>{subtitle}</p> : null}
          </div>
          {actions ? <div className='flex flex-wrap gap-2'>{actions}</div> : null}
        </div>

        <nav className='mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4'>
          {storeLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex min-h-[2.75rem] items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    isActive
                      ? 'border-transparent bg-[#556b2f] text-[#f0f4e8]'
                      : 'border-[#d9e1ca] bg-white text-[#4e5d35] hover:bg-[#f4f6ee] dark:border-[#414a33] dark:bg-[#20251a] dark:text-[#d5ddbf] dark:hover:bg-[#28301f]'
                  }`
                }
              >
                <Icon size={16} className='shrink-0' />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {children}
    </div>
  );
}
