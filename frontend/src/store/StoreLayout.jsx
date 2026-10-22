
export default function StoreLayout({ title, subtitle, actions, badge, children }) {
  return (
    <div className='space-y-5 pb-10'>
      <div className='rounded-xl border border-[#d9e1ca] bg-[#f9faef]/80 p-4 shadow-2xs backdrop-blur-xs dark:border-[#38432a] dark:bg-[#1a1e15]'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <div className='flex items-center gap-2'>
              <span className='inline-flex items-center gap-1 rounded-md bg-[#eef4e4] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#556b2f] dark:bg-[#28301f] dark:text-[#c5d0b5]'>
                Store Central
              </span>
              {badge}
            </div>
            <h1 className='mt-1 text-xl font-bold tracking-tight text-[#2d3a1a] dark:text-[#eef4e8]'>{title}</h1>
            {subtitle ? <p className='mt-0.5 text-xs text-[#6e7d58] dark:text-[#a8b894]'>{subtitle}</p> : null}
          </div>
          {actions ? <div className='flex flex-wrap items-center gap-2'>{actions}</div> : null}
        </div>
      </div>

      {children}
    </div>
  );
}

