'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface SiteHeaderProps {
  solid?: boolean;
  showSignIn?: boolean;
  loggedIn?: boolean;
  role?: string | null;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onLogout?: () => void;
}

export default function SiteHeader({
  solid = false,
  showSignIn = true,
  loggedIn = false,
  role = null,
  searchQuery = '',
  onSearchChange,
  onLogout,
}: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(solid);

  useEffect(() => {
    if (solid) return;
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [solid]);

  const attendeeMode = loggedIn && (role === 'attendee' || role === 'organizer');

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled ? 'bg-white/70 backdrop-blur-xl border-b border-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.03)] py-3' : 'bg-transparent py-6'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 font-bold group">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#062E22] to-emerald-600 shadow-lg shadow-emerald-900/20 group-hover:scale-105 transition-transform duration-300">
            <span className="text-lg font-black text-white tracking-tighter">G</span>
          </div>
          <span className={`text-xl tracking-tight font-extrabold transition-colors duration-300 ${scrolled ? 'text-[#062E22]' : 'text-white'}`}>
            Global Connect <span className="text-emerald-400">Ethiopia</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {['About Us', 'FAQs', 'Contact', 'Terms'].map((item) => (
            <Link key={item} href={`/${item.toLowerCase().replace(' ', '')}`} className={`text-sm font-semibold transition-colors duration-300 hover:text-emerald-400 ${scrolled ? 'text-slate-600' : 'text-slate-200'}`}>
              {item}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-4">
          {attendeeMode ? (
            <>
              <div className="relative group">
                <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => onSearchChange?.(event.target.value)}
                  placeholder="Search events..."
                  className="w-56 rounded-full bg-white/10 backdrop-blur-md border border-white/20 py-2 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-800 placeholder:text-slate-400 transition-all duration-300 focus:w-64 focus:bg-white shadow-inner"
                />
              </div>
              <button
                onClick={onLogout}
                className={`rounded-full px-5 py-2 text-sm font-bold transition active:scale-95 ${scrolled ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-md border border-white/10'}`}
              >
                Sign Out
              </button>
            </>
            ) : showSignIn && (
              <Link
                href="/login"
                className="group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-emerald-500 px-6 py-2.5 font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
              >
                <span className="absolute inset-0 h-full w-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-[#062E22] opacity-0 transition-opacity duration-300 group-hover:opacity-100"></span>
                <span className="relative">Sign In</span>
              </Link>
            )}
        </div>

        <button onClick={() => setMenuOpen((value) => !value)} className={`md:hidden p-2 ${scrolled ? 'text-[#062E22]' : 'text-white'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="absolute top-full left-0 w-full border-t border-slate-100/20 bg-white/90 backdrop-blur-2xl px-4 py-6 md:hidden shadow-2xl flex flex-col gap-4">
           <Link href="/about" className="text-lg font-bold text-slate-800">About Us</Link>
           <Link href="/faq" className="text-lg font-bold text-slate-800">FAQs</Link>
           {showSignIn && <Link href="/login" className="mt-4 rounded-2xl bg-emerald-500 py-3 text-center text-lg font-bold text-white shadow-md">Sign In</Link>}
        </div>
      )}
    </nav>
  );
}