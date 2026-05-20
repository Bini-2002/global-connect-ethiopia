'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { getRole, isLoggedIn, logout } from './lib/auth';
import { eventsService } from './services/eventsService';
import { EventRecord } from './types/event';
import Chatbot from '../components/Chatbot';

const STATS = [
  { value: '150+', label: 'Premium Venues', icon: '🏛️' },
  { value: '2M+', label: 'Annual Attendees', icon: '👥' },
  { value: '500+', label: 'Certified Vendors', icon: '🤝' },
  { value: '45', label: 'Global Partners', icon: '🌍' },
];

const PILLARS = [
  {
    icon: 'Calendar',
    title: 'Organizers',
    desc: 'Move seamlessly from official permit approval into real event execution with our connected workflow.',
    bg: 'bg-white',
    text: 'text-[#062E22]',
    badge: 'Approved Permissions',
  },
  {
    icon: 'Building',
    title: 'Vendors',
    desc: 'Approved vendors can publish services, negotiate requests, and manage active legal contracts.',
    bg: 'bg-white',
    text: 'text-[#062E22]',
    badge: 'Verified Services',
  },
  {
    icon: 'Ticket',
    title: 'Attendees',
    desc: 'Discover verified events across Ethiopia, reserve your seats, and acquire secure QR-based check-in passes.',
    bg: 'bg-white',
    text: 'text-[#062E22]',
    badge: 'Instant QR Entry',
  },
];

const FEATURES = [
  {
    title: 'Approval to Execution',
    desc: 'Convert officially approved proposals into live event workspaces instantly without bureaucratic delays.',
    emoji: '🏛️',
  },
  {
    title: 'Booking and Check-in',
    desc: 'Attendees reserve tickets and receive secure QR passes for seamless scanning on arrival.',
    emoji: '🎫',
  },
  {
    title: 'Vendor Contracts',
    desc: 'Negotiate and sign contracts directly inside the secure, verified collaborative portal.',
    emoji: '🤝',
  },
];

const SHOWCASE_EVENTS = [
  {
    id: 'sample-tech-horizons',
    month: 'OCT 17',
    title: 'Africa Tech Horizons',
    desc: "Leading innovators and VC firms gather to define Ethiopia's digital future at Millennium Hall.",
    venue: 'Millennium Hall',
    tag: 'CONFERENCE',
    tone: 'from-emerald-950 via-emerald-900 to-emerald-950',
  },
  {
    id: 'sample-trade-forum',
    month: 'NOV 23',
    title: 'Global Trade Forum',
    desc: 'A government-supported commerce forum designed for exporters, investors, and regional partners.',
    venue: 'UNECA Center',
    tag: 'SUMMIT / FORUM',
    tone: 'from-[#062E22] via-[#083D2D] to-[#062E22]',
  },
  {
    id: 'sample-heritage-gala',
    month: 'DEC 01',
    title: 'Heritage & Harmony Gala',
    desc: 'An invite-focused evening connecting cultural institutions, tourism leaders, and sponsors.',
    venue: 'Skylight Hotel',
    tag: 'NETWORKING / GALA',
    tone: 'from-slate-900 via-slate-800 to-slate-900',
  },
];

const STRATEGIC_PARTNERS = [
  { name: 'Ministry of Innovation & Tech', code: 'MInT' },
  { name: 'Addis Ababa Municipality', code: 'AAM' },
  { name: 'Ethiopian Airlines', code: 'ETH' },
  { name: 'UNECA Conference Center', code: 'UNECA' },
  { name: 'Federal Police Commission', code: 'FPC' },
  { name: 'Tourism Ethiopia Authority', code: 'TEA' },
];

function formatEventType(type?: string | null): string {
  if (!type) return 'Professional Event';
  return type
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' / ');
}

function formatDateRange(startDate?: string | null, endDate?: string | null): string {
  if (!startDate) return 'Schedule to be announced';

  const start = new Date(startDate);
  if (!endDate) {
    return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const end = new Date(endDate);
  const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endLabel = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startLabel} - ${endLabel}`;
}

function monthBadge(date?: string | null): string {
  if (!date) return 'TBA';
  const value = new Date(date);
  return value
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    .toUpperCase();
}

function bookingLabel(event: EventRecord): string {
  if (!event.booking_required) return 'Booking disabled';
  switch (event.booking_status) {
    case 'open':
      return 'Booking open';
    case 'full':
      return 'Fully reserved';
    case 'closed':
      return 'Booking closed';
    case 'scheduled':
      return 'Booking opens soon';
    default:
      return 'Booking pending';
  }
}

function PillarIcon({ name }: { name: string }) {
  if (name === 'Calendar') {
    return (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  }

  if (name === 'Building') {
    return (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01" />
      </svg>
    );
  }

  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 4l3 4-3 4m-8 8l-3-4 3-4m1-5h6a2 2 0 012 2v1m-10 4H5a2 2 0 01-2-2V9" />
    </svg>
  );
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');
  const [authReady, setAuthReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setLoggedIn(isLoggedIn());
    setRole(getRole());
    setAuthReady(true);
  }, []);

  useEffect(() => {
    if (!authReady || !loggedIn || (role !== 'attendee' && role !== 'organizer')) return;

    let active = true;
    const loadEvents = async () => {
      try {
        setEventsLoading(true);
        setEventsError(null);
        const response = await eventsService.getDiscoverableEvents();
        if (!active) return;
        setEvents(response);
      } catch (err) {
        if (!active) return;
        setEventsError(err instanceof Error ? err.message : 'Unable to load events right now.');
      } finally {
        if (active) setEventsLoading(false);
      }
    };

    void loadEvents();
    return () => { active = false; };
  }, [authReady, loggedIn, role]);

  const attendeeMode = loggedIn && (role === 'attendee' || role === 'organizer');

  const filteredEvents = useMemo(() => {
    const available = events.filter((event) => {
      if (event.booking_required && event.booking_status === 'full') return false;
      return true;
    });

    const matchesSearch = searchQuery.trim() === '' 
      ? available 
      : available.filter((event) =>
          [event.title, event.location, event.category, event.description]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(searchQuery.toLowerCase()))
        );

    if (selectedTag === 'All') return matchesSearch;
    return matchesSearch.filter((event) => {
      const cat = String(event.category || '').toLowerCase();
      if (selectedTag === 'Conferences') return cat.includes('conference');
      if (selectedTag === 'Summits') return cat.includes('summit') || cat.includes('forum');
      if (selectedTag === 'Galas') return cat.includes('gala') || cat.includes('networking');
      return true;
    });
  }, [events, searchQuery, selectedTag]);

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-[Inter,sans-serif] text-slate-900 selection:bg-emerald-500 selection:text-white overflow-x-hidden">
      
      {/* 
        ========================================
        PREMIUM GLASS NAVIGATION
        ========================================
      */}
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
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search events..."
                    className="w-56 rounded-full bg-white/10 backdrop-blur-md border border-white/20 py-2 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-800 placeholder:text-slate-400 transition-all duration-300 focus:w-64 focus:bg-white shadow-inner"
                  />
                </div>
                <button
                  onClick={handleLogout}
                  className={`rounded-full px-5 py-2 text-sm font-bold transition active:scale-95 ${scrolled ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-md border border-white/10'}`}
                >
                  Sign Out
                </button>
              </>
            ) : (
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

        {/* Mobile Menu Dropdown */}
        {menuOpen && (
          <div className="absolute top-full left-0 w-full border-t border-slate-100/20 bg-white/90 backdrop-blur-2xl px-4 py-6 md:hidden shadow-2xl flex flex-col gap-4">
             <Link href="/about" className="text-lg font-bold text-slate-800">About Us</Link>
             <Link href="/faq" className="text-lg font-bold text-slate-800">FAQs</Link>
             <Link href="/login" className="mt-4 rounded-2xl bg-emerald-500 py-3 text-center text-lg font-bold text-white shadow-md">Sign In</Link>
          </div>
        )}
      </nav>

      {/* 
        ========================================
        HERO SECTION: DYNAMIC & IMMERSIVE
        ========================================
      */}
      <section className="relative min-h-[95vh] flex items-center justify-center pt-20 overflow-hidden bg-[#062E22]">
        
        {/* Animated Orbs */}
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-emerald-500/20 rounded-full mix-blend-screen filter blur-[100px] animate-pulse"></div>
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-[#8ECFC0]/10 rounded-full mix-blend-screen filter blur-[120px] animate-pulse delay-700"></div>
        <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-900/40 rounded-full mix-blend-screen filter blur-[150px]"></div>
        
        {/* Mesh Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]"></div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
          
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-md px-4 py-1.5 text-xs font-bold text-emerald-300 mb-8 shadow-2xl">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Ethiopia's Professional Event Hub
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-white mb-6 leading-[1.1]">
            Elevate your <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-[#8ECFC0] to-emerald-200">
              event experience.
            </span>
          </h1>
          
          <p className="max-w-2xl text-lg md:text-xl text-emerald-50/70 mb-10 leading-relaxed font-medium">
            {attendeeMode
              ? 'Browse verified events across Ethiopia, view safety documentation, and secure QR-based tickets in seconds.'
              : 'Create events, manage verified vendors, and connect with municipal approvals using a single secure portal.'}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full sm:w-auto">
            {attendeeMode ? (
              <>
                <Link href="#discover-events" className="w-full sm:w-auto px-8 py-4 rounded-full bg-emerald-500 text-white font-bold tracking-wide hover:bg-emerald-400 hover:scale-105 transition-all shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)]">
                  Discover Events
                </Link>
                <Link href="/profile" className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white font-bold tracking-wide hover:bg-white/20 transition-all">
                  My Portal
                </Link>
              </>
            ) : (
              <>
                <Link href="/register" className="w-full sm:w-auto px-8 py-4 rounded-full bg-emerald-500 text-white font-bold tracking-wide hover:bg-emerald-400 hover:scale-105 transition-all shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)]">
                  Create Account
                </Link>
                <Link href="/login" className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-white font-bold tracking-wide hover:bg-white/10 transition-all">
                  Access Portal
                </Link>
              </>
            )}
          </div>

        </div>
        
        {/* Curved Bottom Separator */}
        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-[#FAFAFA] to-transparent" style={{ clipPath: 'polygon(0 100%, 100% 100%, 100% 0, 0 100%)' }}></div>
      </section>

      {/* 
        ========================================
        STRATEGIC PARTNERS (Scrolling Marquee Style)
        ========================================
      */}
      <section className="bg-[#FAFAFA] py-12 overflow-hidden border-b border-slate-200/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-8">
            Trusted by Regulatory & Strategic Partners
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8 opacity-70 grayscale hover:grayscale-0 transition-all duration-700">
            {STRATEGIC_PARTNERS.map((partner) => (
              <div key={partner.code} className="flex items-center gap-3 group cursor-pointer">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm text-sm font-black text-slate-400 group-hover:bg-[#062E22] group-hover:text-emerald-400 group-hover:scale-110 transition-all duration-300">
                  {partner.code}
                </div>
                <span className="text-sm font-bold text-slate-500 group-hover:text-slate-900 transition-colors duration-300">
                  {partner.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 
        ========================================
        BENTO GRID: PILLARS & FEATURES
        ========================================
      */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">The Event Operating System</h2>
          <p className="mx-auto max-w-2xl text-lg text-slate-500 font-medium">
            Bridging public administration and modern event execution with streamlined portals for all ecosystem participants.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Large Main Bento Box */}
          <div className="md:col-span-2 rounded-[2rem] bg-gradient-to-br from-[#062E22] to-[#0A4A37] p-10 text-white relative overflow-hidden group shadow-2xl shadow-emerald-900/10">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <PillarIcon name="Calendar" />
            </div>
            <span className="inline-block rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-300 mb-6 backdrop-blur-md">
              For Organizers
            </span>
            <h3 className="text-3xl font-black mb-4">Approval to Execution</h3>
            <p className="text-emerald-50/70 text-lg leading-relaxed max-w-md">
              Move seamlessly from official permit approval into real event execution. Our connected workflow eliminates bureaucratic delays.
            </p>
          </div>

          {/* Smaller Bento Boxes */}
          <div className="rounded-[2rem] bg-white border border-slate-200/60 p-8 shadow-xl shadow-slate-200/20 hover:-translate-y-1 transition-transform duration-300">
             <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-6">
               <PillarIcon name="Building" />
             </div>
             <h3 className="text-xl font-bold text-slate-900 mb-3">Verified Vendors</h3>
             <p className="text-slate-500 text-sm leading-relaxed">
               Approved vendors can publish services, negotiate requests, and manage active legal contracts securely.
             </p>
          </div>

          <div className="rounded-[2rem] bg-white border border-slate-200/60 p-8 shadow-xl shadow-slate-200/20 hover:-translate-y-1 transition-transform duration-300">
             <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-6">
               <span className="text-2xl">🎫</span>
             </div>
             <h3 className="text-xl font-bold text-slate-900 mb-3">Instant Booking</h3>
             <p className="text-slate-500 text-sm leading-relaxed">
               Attendees reserve tickets and receive secure QR passes for seamless scanning on arrival.
             </p>
          </div>

          <div className="md:col-span-2 rounded-[2rem] bg-gradient-to-tr from-slate-900 to-slate-800 p-10 text-white shadow-2xl shadow-slate-900/10 relative overflow-hidden group">
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
             <span className="relative z-10 inline-block rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-300 mb-6 backdrop-blur-md">
               Data & Analytics
             </span>
             <h3 className="relative z-10 text-3xl font-black mb-4">Real-time Insights</h3>
             <p className="relative z-10 text-slate-400 text-lg leading-relaxed max-w-md">
               Track attendance, vendor payouts, and overall budget health in a beautiful, unified dashboard.
             </p>
          </div>
        </div>
      </section>

      {/* 
        ========================================
        DISCOVER EVENTS (DARK MODE CONTRAST)
        ========================================
      */}
      <section id="discover-events" className="relative py-24 bg-slate-900 text-white rounded-t-[3rem] mt-12 overflow-hidden">
        {/* Subtle dark glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-emerald-900/30 rounded-full mix-blend-screen filter blur-[120px]"></div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between mb-12">
            <div className="space-y-3">
              <h2 className="text-4xl font-black tracking-tight text-white">
                {attendeeMode ? 'Available Events to Book' : 'Featured Event Experiences'}
              </h2>
              <p className="text-lg text-slate-400 max-w-2xl">
                {attendeeMode
                  ? 'Select a live published event, review safety permits and schedules, and complete your reservation.'
                  : 'Sign in to access secure attendee registrations and receive your check-in QR passes.'}
              </p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-3 mb-12">
            {['All', 'Conferences', 'Summits', 'Galas'].map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`rounded-full px-6 py-2.5 text-sm font-bold transition-all duration-300 ${
                  selectedTag === tag
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                    : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {attendeeMode ? (
            <div className="mt-8">
              {eventsLoading ? (
                <div className="flex justify-center py-20">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
                </div>
              ) : eventsError ? (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm font-bold text-red-400 backdrop-blur-md">
                  {eventsError}
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="rounded-[2rem] border border-white/10 bg-white/5 p-16 text-center backdrop-blur-md">
                  <h3 className="text-2xl font-bold text-white mb-2">No matching events found</h3>
                  <p className="text-slate-400">Adjust your search keywords or filter settings to browse other live events.</p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {filteredEvents.map((event) => {
                    const isOpen = event.booking_required && event.booking_status === 'open';
                    return (
                      <div
                        key={event.id}
                        className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur-lg transition-all duration-500 hover:-translate-y-2 hover:bg-white/10 hover:shadow-2xl hover:shadow-emerald-900/20 flex flex-col"
                      >
                        <div className="p-8 pb-0">
                          <div className="flex items-start justify-between gap-4 mb-6">
                            <span className="rounded-full bg-emerald-500/20 text-emerald-300 px-3 py-1 text-xs font-bold border border-emerald-500/20">
                              {monthBadge(event.start_date)}
                            </span>
                            <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-300">
                              {formatEventType(event.category)}
                            </span>
                          </div>
                          <h3 className="text-2xl font-black leading-tight text-white mb-2 group-hover:text-emerald-400 transition-colors duration-300">{event.title}</h3>
                          <p className="text-sm text-emerald-200/80 font-semibold mb-4">{formatDateRange(event.start_date, event.end_date)}</p>
                          <p className="line-clamp-2 text-sm leading-relaxed text-slate-400 mb-8">
                            {event.description || 'Details are officially published and verified.'}
                          </p>
                        </div>
                        
                        <div className="mt-auto p-8 pt-6 border-t border-white/5 bg-black/20">
                           <div className="flex items-center justify-between mb-6">
                             <div>
                               <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Venue</p>
                               <p className="text-sm font-bold text-white">{event.location || 'Addis Ababa'}</p>
                             </div>
                             <div className="text-right">
                               <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Status</p>
                               <p className="text-sm font-bold text-emerald-400">{bookingLabel(event)}</p>
                             </div>
                           </div>
                           
                           {isOpen ? (
                             <Link
                               href={`/events/${event.id}`}
                               className="block w-full rounded-xl bg-emerald-500 py-3.5 text-center text-sm font-black text-white transition-all hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/25 active:scale-95"
                             >
                               Reserve Seat
                             </Link>
                           ) : (
                             <Link
                               href={`/events/${event.id}`}
                               className="block w-full rounded-xl bg-white/10 py-3.5 text-center text-sm font-black text-white transition-all hover:bg-white/20 active:scale-95"
                             >
                               View Details
                             </Link>
                           )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {SHOWCASE_EVENTS.map((event) => (
                <div key={event.id} className="group relative overflow-hidden rounded-[2rem] bg-gradient-to-br border border-white/10 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-emerald-900/30 flex flex-col" style={{ backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${event.tone} opacity-50`}></div>
                  <div className="relative z-10 p-8 flex flex-col h-full">
                    <span className="self-start rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-xs font-bold text-white mb-8 border border-white/10">
                      {event.month}
                    </span>
                    <h3 className="text-3xl font-black text-white mb-2">{event.title}</h3>
                    <span className="self-start inline-block rounded-md bg-emerald-500/30 px-2 py-1 text-[10px] font-black tracking-widest uppercase text-emerald-200 mb-6">
                      {event.tag}
                    </span>
                    <p className="text-sm leading-relaxed text-slate-300 mb-8 flex-1">{event.desc}</p>
                    
                    <div className="pt-6 border-t border-white/10 flex items-center justify-between mt-auto">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-1">Venue</p>
                        <p className="text-sm font-bold text-white">{event.venue}</p>
                      </div>
                      <Link href="/login" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-emerald-500 hover:text-white transition-all duration-300 group-hover:scale-110">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 
        ========================================
        CALL TO ACTION BANNER
        ========================================
      */}
      <section className="bg-slate-900 py-24 pb-32">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-[3rem] transform -rotate-1 scale-105 opacity-50 blur-xl"></div>
          <div className="relative rounded-[3rem] bg-gradient-to-r from-emerald-600 to-emerald-500 p-16 text-center text-white shadow-2xl overflow-hidden border border-emerald-400/30">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
            
            <h2 className="relative z-10 text-4xl font-black tracking-tight sm:text-5xl mb-6">
              {attendeeMode ? 'Ready to secure your tickets?' : 'Ready to streamline event permits?'}
            </h2>
            <p className="relative z-10 mx-auto max-w-2xl text-lg font-medium text-emerald-50/90 mb-10">
              {attendeeMode
                ? 'Browse upcoming public sessions, review safety permits, and secure your reservation code now.'
                : 'Join the premier administrative ecosystem in Ethiopia connecting municipal coordinators, verified local vendors, and attendee platforms.'}
            </p>
            <div className="relative z-10">
              <Link href={attendeeMode ? '#discover-events' : '/register'} className="inline-block rounded-full bg-white px-10 py-5 text-lg font-black text-emerald-700 shadow-xl shadow-emerald-900/20 hover:scale-105 hover:shadow-2xl transition-all duration-300">
                {attendeeMode ? 'Browse Events Now' : 'Create an Account'}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Chatbot Floating Advisor */}
      <Chatbot />

      {/* 
        ========================================
        UNIFIED FOOTER
        ========================================
      */}
      <footer className="bg-[#02100C] px-4 pt-20 pb-10 text-white relative z-10 border-t border-white/5">
        <div className="mx-auto grid max-w-7xl gap-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-6">
            <div className="flex items-center gap-3 font-bold group">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#062E22] to-emerald-600">
                <span className="text-lg font-black text-white">G</span>
              </div>
              <span className="text-xl tracking-tight font-extrabold text-white">Global Connect</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-400 font-medium">
              The statutory digital coordination network simplifying regulatory permit workflows, vendor verification status, and attendee QR verification tags in Addis Ababa and beyond.
            </p>
          </div>

          <div className="space-y-6">
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-500">Quick Navigation</h4>
            <ul className="space-y-3 text-sm font-medium text-slate-400">
              <li><Link href="/about" className="hover:text-emerald-400 transition-colors">About Our Vision</Link></li>
              <li><Link href="/faq" className="hover:text-emerald-400 transition-colors">Regulatory FAQ</Link></li>
              <li><Link href="/contact" className="hover:text-emerald-400 transition-colors">Submit Inquiry Support</Link></li>
              <li><Link href="/terms" className="hover:text-emerald-400 transition-colors">Portal Terms & Disclaimer</Link></li>
            </ul>
          </div>

          <div className="space-y-6">
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-500">Platform Portals</h4>
            <ul className="space-y-3 text-sm font-medium text-slate-400">
              <li><Link href="/login" className="hover:text-emerald-400 transition-colors">Organizer Workspace</Link></li>
              <li><Link href="/login" className="hover:text-emerald-400 transition-colors">Vendor Service Desk</Link></li>
              <li><Link href="/login" className="hover:text-emerald-400 transition-colors">Municipal Approvals Portal</Link></li>
              <li><Link href="/login" className="hover:text-emerald-400 transition-colors">Attendee Registration</Link></li>
            </ul>
          </div>

          <div className="space-y-6">
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-500">System Integrity</h4>
            <div className="space-y-3 text-xs font-medium text-slate-400">
              <p className="flex gap-2"><span className="text-emerald-500">✓</span> Permitting workflow officially aligned with Ministry protocols.</p>
              <p className="flex gap-2"><span className="text-emerald-500">✓</span> Automated QR codes securely verified against local registries.</p>
              <p className="flex gap-2"><span className="text-emerald-500">✓</span> AI chatbot operates under licensing regulations advisory.</p>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-20 max-w-7xl border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs font-medium text-slate-500">
            © 2026 Global Connect Ethiopia. All statutory rights reserved.
          </p>
          <div className="flex gap-4">
            <Link href="#" className="text-slate-500 hover:text-white transition-colors">Twitter</Link>
            <Link href="#" className="text-slate-500 hover:text-white transition-colors">LinkedIn</Link>
            <Link href="#" className="text-slate-500 hover:text-white transition-colors">Instagram</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
