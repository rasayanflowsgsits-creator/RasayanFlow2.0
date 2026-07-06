
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

      </div>

      {children}
    </div>
  );
}
