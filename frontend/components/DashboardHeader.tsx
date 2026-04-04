'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logout } from '@/app/lib/auth';
import Link from 'next/link';
import {
  Calendar,
} from 'lucide-react';

interface DashboardHeaderProps {
  searchPlaceholder?: string;
  onSearch?: (q: string) => void;
}

export default function DashboardHeader({ searchPlaceholder = 'Search...', onSearch }: DashboardHeaderProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // For desktop: fixed header with left offset for sidebar
  // For mobile: full width header without left offset
  return (
    <>
      {/* Desktop Header */}
      <header className="hidden md:flex fixed top-0 left-60 right-0 h-16 bg-white border-b border-slate-200 items-center justify-between px-6 z-30">
        {/* Search */}
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative w-full">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={query}
              onChange={e => { setQuery(e.target.value); onSearch?.(e.target.value); }}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#062E22]/20 focus:border-[#062E22] transition"
            />
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 lg:gap-3">
          {/* Notification bell */}
          <button className="relative p-2 rounded-lg hover:bg-slate-100 transition">
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span suppressHydrationWarning className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* Settings - hidden on smaller desktop screens */}
          <button className="p-2 rounded-lg hover:bg-slate-100 transition hidden lg:block">
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* Avatar */}
          <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-[#062E22] flex items-center justify-center cursor-pointer hover:bg-[#0a3a2c] transition" onClick={handleLogout}>
            <span suppressHydrationWarning className="text-white text-xs lg:text-sm font-semibold">U</span>
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 pl-5 right-0 bg-white shadow-sm z-30">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 flex-1">
            <button 
              onClick={() => setShowMobileSearch(!showMobileSearch)}
              className="p-2 -ml-2 rounded-lg hover:bg-slate-100 transition"
              aria-label="Toggle search"
            >
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            
            {!showMobileSearch && (
              <span className="text-sm text-slate-500 truncate">
                {searchPlaceholder}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {/* Notification bell - mobile */}
            <button className="relative p-2 rounded-lg hover:bg-slate-100 transition">
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span suppressHydrationWarning className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <Link href="/organizer/events" className='flex gap-2 px-4 py-2 bg-[#EC5B13] text-white rounded-lg font-bold hover:bg-[#d44d0f] transition text-sm md:text-base items-center'>
                <Calendar className="w-4 h-4" />
                Explore Events
              </Link>
            {/* Avatar - mobile */}
            <button 
              className="w-8 h-8 rounded-full bg-[#062E22] flex items-center justify-center cursor-pointer hover:bg-[#0a3a2c] transition" 
              onClick={handleLogout}
              aria-label="User menu"
            >
              <span suppressHydrationWarning className="text-white text-xs font-semibold">U</span>
            </button>
          </div>
        </div>

        {/* Mobile Search Bar - expands when search is toggled */}
        <div className={`overflow-hidden transition-all duration-200 ease-in-out ${
          showMobileSearch ? 'max-h-16 opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="px-4 pb-3">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={query}
                onChange={e => { setQuery(e.target.value); onSearch?.(e.target.value); }}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#062E22]/20 focus:border-[#062E22] transition"
                autoFocus={showMobileSearch}
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery('');
                    onSearch?.('');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Spacer for mobile to account for fixed header */}
      <div className="md:hidden h-16"></div>
      
      {/* Additional spacer when search is expanded */}
      {showMobileSearch && <div className="md:hidden h-16"></div>}
    </>
  );
}
