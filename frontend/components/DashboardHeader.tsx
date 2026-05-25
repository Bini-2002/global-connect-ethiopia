'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getRole } from '@/app/lib/auth';
import { logout } from '@/app/lib/auth';
import { api } from '@/app/lib/api';
import Link from 'next/link';
import { Calendar } from 'lucide-react';
import {
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import NotificationBell from '@/components/NotificationBell';

interface ProfileData {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  avatar_url: string | null;
}

function getInitials(name: string | null): string {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

type AllowedRole = 'organizer' | 'admin' | 'ministry' | 'municipal' | 'police' | 'vendor' | 'attendee' | 'team_member';

const ROLE_MAP: Record<string, AllowedRole> = {
  organizer: 'organizer',
  admin: 'admin',
  super_admin: 'admin',
  ministry_gov: 'ministry',
  municipal_gov: 'municipal',
  police: 'police',
  vendor: 'vendor',
  attendee: 'attendee',
  team_member: 'team_member',
};

const PROFILE_ROUTES: Record<string, string> = {
  organizer: '/profile/organizer',
  admin: '/profile/admin',
  ministry: '/profile/ministry',
  municipal: '/profile/municipal',
  police: '/profile/police',
  vendor: '/profile/vendor',
  attendee: '/profile/attendee',
  team_member: '/profile/team',
};

const SETTINGS_ROUTES: Record<string, string> = {
  organizer: '/organizer/settings',
  admin: '/admin/settings',
};

interface DashboardHeaderProps {
  searchPlaceholder?: string;
  onSearch?: (q: string) => void;
  actionHref?: string;
  actionLabel?: string;
}

export default function DashboardHeader({
  searchPlaceholder = 'Search...',
  onSearch,
  actionHref = '/organizer/events',
  actionLabel = 'Explore Events',
}: DashboardHeaderProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const rawRole = getRole() ?? 'organizer';
  const sidebarRole: AllowedRole = ROLE_MAP[rawRole] ?? 'organizer';
  const profileHref = PROFILE_ROUTES[sidebarRole] ?? '/profile/organizer';
  const settingsHref = SETTINGS_ROUTES[sidebarRole];

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await api.get<ProfileData>('/users/me');
        setProfileData(data);
      } catch {
        // silent — header should still render
      }
    };
    void fetchProfile();
  }, []);

  useEffect(() => {
    if (!profileOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [profileOpen]);

  const userName = profileData?.name ?? null;
  const userEmail = profileData?.email ?? null;
  const userAvatar = profileData?.avatar_url ?? null;
  const initials = getInitials(userName);

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    router.push('/login');
  };

  const ProfileDropdown = (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-[calc(100%+8px)] w-56 rounded-2xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden"
    >
      {/* User info header */}
      <div className="px-4 py-3 border-b border-slate-100">
        <p className="text-sm font-semibold text-slate-800 truncate">{userName ?? 'User'}</p>
        {userEmail && (
          <p className="text-xs text-slate-400 truncate mt-0.5">{userEmail}</p>
        )}
      </div>
      <Link
        href={profileHref}
        onClick={() => setProfileOpen(false)}
        className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition"
      >
        <UserCircleIcon className="w-5 h-5 text-slate-400" />
        My Profile
      </Link>
      <button
        onClick={handleLogout}
        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition border-t border-slate-100"
      >
        <ArrowRightOnRectangleIcon className="w-5 h-5" />
        Sign Out
      </button>
    </div>
  );

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
          <NotificationBell />

          {/* Settings - hidden on smaller desktop screens */}
          {settingsHref && (
            <Link
              href={settingsHref}
              className="p-2 rounded-lg hover:bg-slate-100 transition hidden lg:block"
            >
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
          )}

          {/* Avatar with dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(v => !v)}
              className="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-[#062E22] flex items-center justify-center cursor-pointer hover:bg-[#0a3a2c] transition overflow-hidden"
              aria-label="User menu"
            >
              {userAvatar ? (
                <img src={userAvatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span suppressHydrationWarning className="text-white text-xs lg:text-sm font-semibold">{initials}</span>
              )}
            </button>
            {profileOpen && ProfileDropdown}
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
            <NotificationBell />
            <Link href={actionHref} className='flex gap-2 px-4 py-2 bg-[#EC5B13] text-white rounded-lg font-bold hover:bg-[#d44d0f] transition text-sm md:text-base items-center'>
                <Calendar className="w-4 h-4" />
                {actionLabel}
              </Link>
            {/* Avatar with dropdown - mobile */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(v => !v)}
                className="w-8 h-8 rounded-full bg-[#062E22] flex items-center justify-center cursor-pointer hover:bg-[#0a3a2c] transition overflow-hidden"
                aria-label="User menu"
              >
                {userAvatar ? (
                  <img src={userAvatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span suppressHydrationWarning className="text-white text-xs font-semibold">{initials}</span>
                )}
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] w-56 rounded-2xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden">
                  {/* User info header */}
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-800 truncate">{userName ?? 'User'}</p>
                    {userEmail && (
                      <p className="text-xs text-slate-400 truncate mt-0.5">{userEmail}</p>
                    )}
                  </div>
                  <Link
                    href={profileHref}
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition"
                  >
                    <UserCircleIcon className="w-5 h-5 text-slate-400" />
                    My Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition border-t border-slate-100"
                  >
                    <ArrowRightOnRectangleIcon className="w-5 h-5" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
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
