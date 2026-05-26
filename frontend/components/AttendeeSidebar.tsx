import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarIcon, BuildingOfficeIcon, CreditCardIcon } from '@heroicons/react/24/outline';

export default function AttendeeSidebar() {
  const pathname = usePathname();
  const items = [
    { label: 'Events', href: '/attendee/events', icon: <CalendarIcon className="w-5 h-5" /> },
    { label: 'Bookings', href: '/attendee/bookings', icon: <CreditCardIcon className="w-5 h-5" /> },
    { label: 'Vendors', href: '/attendee/vendors', icon: <BuildingOfficeIcon className="w-5 h-5" /> },
  ];
  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-60 bg-white border-r border-slate-200 flex-col z-40 shadow-sm">
      <div className="flex items-center gap-3 px-4 md:px-6 py-5 border-b border-slate-100">
        <div className="w-9 h-9 bg-[#062E22] rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-[#062E22] truncate">Attendee Portal</p>
          <p className="text-[10px] text-slate-400 truncate">Global Connect</p>
        </div>
      </div>
      <nav className="flex-1 px-2 md:px-3 py-4 space-y-1 overflow-y-auto">
        {items.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                isActive ? 'bg-[#062E22] text-white font-medium' : 'text-slate-600 hover:bg-slate-100 hover:text-[#062E22]'
              }`}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
