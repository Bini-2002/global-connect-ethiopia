'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { logout } from '@/app/lib/auth';
import {
  HomeIcon,
  CalendarIcon,
  UsersIcon,
  CogIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  SparklesIcon,
  XMarkIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  role: 'organizer' | 'admin' | 'ministry' | 'municipal' | 'police' | 'vendor';
  portalName?: string;
}

const icons = {
  dashboard: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth="2" />
      <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth="2" />
      <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth="2" />
      <rect x="14" y="14" width="7" height="7" rx="1" strokeWidth="2" />
    </svg>
  ),
  proposals: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  users: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  check: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  reject: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  queue: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  ),
  vendor: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  ),
  shield: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  events: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
};

const navItems: Record<string, SidebarItem[]> = {
  organizer: [
    { label: 'Dashboard', href: '/organizer/dashboard', icon: <HomeIcon className="w-5 h-5" /> },
    { label: 'My Events', href: '/organizer/events', icon: <CalendarIcon className="w-5 h-5" /> },
    { label: 'Vendors', href: '/organizer/vendors', icon: <BuildingOfficeIcon className="w-5 h-5" /> },
    { label: 'Requests', href: '/organizer/requests', icon: icons.queue },
    { label: 'Contracts', href: '/organizer/contracts', icon: icons.proposals },
    { label: 'Wallet', href: '/organizer/wallet', icon: icons.vendor },
    { label: 'Attendees', href: '/organizer/attendees', icon: <UsersIcon className="w-5 h-5" /> },
    { label: 'Team', href: '/organizer/team', icon: <UserGroupIcon className="w-5 h-5" /> },
    { label: 'Government', href: '/organizer/government', icon: <ClipboardDocumentListIcon className="w-5 h-5" /> },
    { label: 'Reports & Analytics', href: '/organizer/reports', icon: <ChartBarIcon className="w-5 h-5" /> },
    { label: 'AI Assistant', href: '/organizer/ai-assistant', icon: <SparklesIcon className="w-5 h-5" /> },
    { label: 'Settings', href: '/organizer/settings', icon: <CogIcon className="w-5 h-5" /> },
  ],
  admin: [
    { label: 'Organizers', href: '/admin/organizers', icon: icons.users },
    { label: 'Vendors', href: '/admin/vendors', icon: icons.vendor },
  ],
  ministry: [
    { label: 'Overview', href: '/ministry/proposals', icon: icons.dashboard },
    { label: 'Review Queue', href: '/ministry/proposals', icon: icons.queue },
    { label: 'Approved', href: '/ministry/proposals?tab=approved', icon: icons.check },
    { label: 'Rejected', href: '/ministry/proposals?tab=rejected', icon: icons.reject },
  ],
  municipal: [
    { label: 'Overview', href: '/municipal/proposals', icon: icons.dashboard },
    { label: 'Review Queue', href: '/municipal/proposals', icon: icons.queue },
    { label: 'Approved', href: '/municipal/proposals?tab=approved', icon: icons.check },
    { label: 'Rejected', href: '/municipal/proposals?tab=rejected', icon: icons.reject },
  ],
  police: [
    { label: 'Overview', href: '/police/proposals', icon: icons.dashboard },
    { label: 'Allowed Events', href: '/police/proposals', icon: icons.events },
  ],
  vendor: [
    { label: 'Dashboard', href: '/vendor/dashboard', icon: icons.dashboard },
    { label: 'Requests', href: '/vendor/requests', icon: icons.queue },
    { label: 'Contracts', href: '/vendor/contracts', icon: icons.proposals },
    { label: 'Wallet', href: '/vendor/wallet', icon: icons.vendor },
    { label: 'Verification', href: '/vendor/verification', icon: icons.shield },
  ],
};

const portalNames: Record<string, string> = {
  organizer: 'Organizer Hub',
  admin: 'Admin Portal',
  ministry: 'Ministry Portal',
  municipal: 'Municipal Portal',
  police: 'Police Portal',
  vendor: 'Vendor Portal',
};

export default function Sidebar({ role, portalName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const items = navItems[role] || [];
  const name = portalName || portalNames[role] || 'Portal';
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const SidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 md:px-6 py-5 border-b border-slate-100">
        <div className="w-9 h-9 bg-[#062E22] rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
          </svg>
        </div>
        <div className="min-w-0">
          <p suppressHydrationWarning className="text-xs font-bold text-[#062E22] truncate">{name}</p>
          <p suppressHydrationWarning className="text-[10px] text-slate-400 truncate">Global Connect</p>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 md:px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const isMyEventsActive = item.href === '/organizer/events' && (
            pathname === '/organizer/events' ||
            pathname.startsWith('/organizer/events/') ||
            pathname.includes('/proposals/') ||
            pathname === '/organizer/proposal-review' ||
            pathname === '/organizer/proposals/create' ||
            pathname === '/organizer/create-event'
          );
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                (isActive || isMyEventsActive)
                  ? 'bg-[#062E22] text-white font-medium'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-[#062E22]'
              }`}
              onClick={() => setIsOpen(false)}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <span suppressHydrationWarning className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-2 md:px-3 py-4 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all duration-150"
        >
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span suppressHydrationWarning className="truncate">Sign Out</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-60 bg-white border-r border-slate-200 flex-col z-40 shadow-sm">
        {SidebarContent}
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-1 py-3   fixed top-0 left-0 right-0 z-50">
        <button onClick={() => setIsOpen(true)} className="p-2 -mr-2">
          <Bars3Icon className="w-6 h-6 text-slate-700" />
        </button>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/30 transition-opacity"
            onClick={() => setIsOpen(false)}
          />
          {/* Drawer */}
          <aside className="relative w-64 max-w-[80%] h-full bg-white shadow-lg flex flex-col animate-slide-in">
            <div className="flex justify-end p-3 border-b border-slate-100">
              <button onClick={() => setIsOpen(false)} className="p-2">
                <XMarkIcon className="w-5 h-5 text-slate-700" />
              </button>
            </div>
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Add animation styles */}
      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
