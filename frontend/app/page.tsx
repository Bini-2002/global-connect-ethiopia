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
    bg: 'bg-gradient-to-br from-[#062E22] to-[#0A4A37] border border-[#8ECFC0]/20',
    text: 'text-white',
    badge: 'Approved Permissions',
  },
  {
    icon: 'Building',
    title: 'Vendors',
    desc: 'Approved vendors can publish services, negotiate requests, and manage active legal contracts.',
    bg: 'bg-white border border-slate-200/80 shadow-sm',
    text: 'text-[#062E22]',
    badge: 'Verified Services',
  },
  {
    icon: 'Ticket',
    title: 'Attendees',
    desc: 'Discover verified events across Ethiopia, reserve your seats, and acquire secure QR-based check-in passes.',
    bg: 'bg-gradient-to-br from-[#103D30] to-[#16503F] border border-[#8ECFC0]/10',
    text: 'text-white',
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
    tone: 'from-emerald-950/40 via-emerald-900/20 to-emerald-950/40',
  },
  {
    id: 'sample-trade-forum',
    month: 'NOV 23',
    title: 'Global Trade Forum',
    desc: 'A government-supported commerce forum designed for exporters, investors, and regional partners.',
    venue: 'UNECA Center',
    tag: 'SUMMIT / FORUM',
    tone: 'from-[#062E22]/30 via-emerald-900/10 to-[#062E22]/30',
  },
  {
    id: 'sample-heritage-gala',
    month: 'DEC 01',
    title: 'Heritage & Harmony Gala',
    desc: 'An invite-focused evening connecting cultural institutions, tourism leaders, and sponsors.',
    venue: 'Skylight Hotel',
    tag: 'NETWORKING / GALA',
    tone: 'from-slate-900/50 via-slate-800/30 to-slate-900/50',
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
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  }

  if (name === 'Building') {
    return (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01" />
      </svg>
    );
  }

  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 4l3 4-3 4m-8 8l-3-4 3-4m1-5h6a2 2 0 012 2v1m-10 4H5a2 2 0 01-2-2V9" />
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
        if (active) {
          setEventsLoading(false);
        }
      }
    };

    void loadEvents();
    return () => {
      active = false;
    };
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
    <div className="min-h-screen bg-slate-50 font-[Inter,sans-serif] text-slate-900 overflow-x-hidden">
      {/* Navigation */}
      <nav
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white shadow-md py-3' : 'bg-white/95 backdrop-blur-sm py-4'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 font-bold text-[#062E22] text-lg">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#062E22] shadow-md shadow-[#062E22]/10">
              <span className="text-base font-bold text-white">G</span>
            </div>
            <span className="tracking-tight">Global Connect <span className="text-emerald-700">Ethiopia</span></span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link href="/about" className="text-sm font-semibold text-slate-600 transition hover:text-[#062E22]">
              About Us
            </Link>
            <Link href="/faq" className="text-sm font-semibold text-slate-600 transition hover:text-[#062E22]">
              FAQs
            </Link>
            <Link href="/contact" className="text-sm font-semibold text-slate-600 transition hover:text-[#062E22]">
              Contact
            </Link>
            <Link href="/terms" className="text-sm font-semibold text-slate-600 transition hover:text-[#062E22]">
              Terms
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {attendeeMode ? (
              <>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search events..."
                    className="w-48 rounded-full bg-slate-100 py-1.5 pl-9 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#062E22]/20 text-slate-800 transition-all duration-300 focus:w-60"
                  />
                </div>
                <span className="rounded-full bg-[#062E22]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#062E22]">
                  {role === 'organizer' ? 'Organizer' : 'Attendee'}
                </span>
                <button
                  onClick={handleLogout}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition active:scale-95"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-xl bg-[#062E22] px-5 py-2 text-xs font-bold text-white shadow-md shadow-[#062E22]/15 hover:bg-[#0a4a37] transition active:scale-95"
              >
                Sign In
              </Link>
            )}
          </div>

          <button onClick={() => setMenuOpen((value) => !value)} className="md:hidden p-2 text-[#062E22]" aria-label="Toggle menu">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-slate-100 bg-white px-4 py-4 md:hidden space-y-3">
            <div className="grid grid-cols-2 gap-2 text-center">
              <Link href="/about" className="block rounded-lg bg-slate-50 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">About Us</Link>
              <Link href="/faq" className="block rounded-lg bg-slate-50 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">FAQs</Link>
              <Link href="/contact" className="block rounded-lg bg-slate-50 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Contact</Link>
              <Link href="/terms" className="block rounded-lg bg-slate-50 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Terms</Link>
            </div>
            {attendeeMode ? (
              <div className="space-y-3 border-t border-slate-100 pt-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search events..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-800"
                />
                <button
                  onClick={handleLogout}
                  className="w-full rounded-xl border border-slate-200 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link href="/login" className="block rounded-xl bg-[#062E22] py-2.5 text-center text-sm font-bold text-white shadow-md">
                Sign In
              </Link>
            )}
          </div>
        )}
      </nav>

      {/* Hero Section with Glowing Mesh */}
      <section className="relative overflow-hidden pt-16 bg-gradient-to-br from-[#041F17] via-[#062E22] to-[#0A4A37] text-white">
        {/* Animated Background Mesh */}
        <div className="absolute inset-0 z-0 opacity-15 mix-blend-overlay">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="8" height="8" patternUnits="userSpaceOnUse">
                <path d="M 8 0 L 0 0 0 8" fill="none" stroke="white" strokeWidth="0.1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Ambient Glowing Spheres */}
        <div className="absolute -left-12 top-10 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute right-12 bottom-10 h-96 w-96 rounded-full bg-teal-400/10 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Ethiopia&apos;s Professional Event Hub
              </span>
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl leading-[1.1]">
                {attendeeMode ? (
                  <>
                    Reserve your place.
                    <br />
                    <span className="bg-gradient-to-r from-emerald-300 to-[#8ECFC0] bg-clip-text text-transparent">Arrive with confidence.</span>
                  </>
                ) : (
                  <>
                    Connect. Create.
                    <br />
                    <span className="bg-gradient-to-r from-emerald-300 to-[#8ECFC0] bg-clip-text text-transparent">Celebrate Events.</span>
                  </>
                )}
              </h1>
              <p className="max-w-xl text-base text-slate-200/80 leading-relaxed">
                {attendeeMode
                  ? 'Browse live verified events across the country, check real-time seating availability, and secure your automated QR access pass instantly.'
                  : 'The comprehensive unified digital framework supporting governance approvals, verified local vendors, and attendee ticketing systems throughout Ethiopia.'}
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                {attendeeMode ? (
                  <>
                    <Link href="#discover-events" className="rounded-xl bg-[#8ECFC0] px-6 py-3 font-extrabold text-[#062E22] shadow-lg shadow-emerald-950/20 transition hover:bg-white active:scale-95 duration-200">
                      Discover Events
                    </Link>
                    <Link href="/profile" className="rounded-xl border border-white/30 bg-white/5 px-6 py-3 font-semibold text-white backdrop-blur-sm transition hover:bg-white/10 active:scale-95 duration-200">
                      My Portal
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/register" className="rounded-xl bg-white px-6 py-3 font-extrabold text-[#062E22] shadow-lg transition hover:bg-slate-100 active:scale-95 duration-200">
                      Register Now
                    </Link>
                    <Link href="/login" className="rounded-xl border border-white/30 bg-white/5 px-6 py-3 font-semibold text-white backdrop-blur-sm transition hover:bg-white/10 active:scale-95 duration-200">
                      Access Portal
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Premium Card Display with floating animation */}
            <div className="hidden lg:block">
              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-md relative">
                {/* Visual Glass Card */}
                <div className="rounded-2xl bg-white p-6 text-slate-800 shadow-xl space-y-4">
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-emerald-800">
                    Live Platform Progress
                  </span>
                  <h3 className="text-2xl font-bold text-[#062E22]">
                    Proposal Approval to Secure Booking
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Event licensing is fully automated. Registrants submit proposals directly to municipal authorizers, negotiate active contracts with verified vendors, and initialize live attendee booking.
                  </p>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#062E22]">
                    <span>✓ Government Approved</span>
                    <span className="text-emerald-600">✓ Real-time QR Verified</span>
                  </div>
                </div>

                {/* Sub floating tag */}
                <div className="absolute -bottom-4 -left-4 rounded-xl bg-[#8ECFC0] p-4 text-[#062E22] shadow-lg flex items-center gap-3">
                  <span className="text-2xl">🎫</span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Attendee System</p>
                    <p className="text-xs font-extrabold">Instant QR Generation</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Strategic Partners Row */}
      <section className="bg-white border-y border-slate-100 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400 mb-6">
            Supported Regulatory & Strategic Partnerships
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            {STRATEGIC_PARTNERS.map((partner) => (
              <div key={partner.code} className="flex items-center gap-2 group cursor-default">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500 transition group-hover:bg-[#062E22] group-hover:text-white duration-300">
                  {partner.code}
                </div>
                <span className="text-xs font-semibold text-slate-600 transition group-hover:text-slate-900 duration-300">
                  {partner.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Three Pillars of Excellence */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center space-y-3">
          <span className="inline-block rounded-full bg-[#062E22]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#062E22]">
            Core Ecosystem
          </span>
          <h2 className="text-3xl font-extrabold text-[#062E22] sm:text-4xl">Three Pillars of Event Success</h2>
          <p className="mx-auto max-w-xl text-slate-500 text-sm">
            Bridging public administration and modern event execution with streamlined portals for all ecosystem participants.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {PILLARS.map((pillar) => (
            <div
              key={pillar.title}
              className={`${pillar.bg} ${pillar.text} rounded-3xl p-8 transition-all hover:scale-[1.02] duration-300 flex flex-col justify-between h-80 shadow-md`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#8ECFC0]">
                    {pillar.badge}
                  </span>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-emerald-400">
                    <PillarIcon name={pillar.icon} />
                  </div>
                </div>
                <h3 className="text-2xl font-bold">{pillar.title}</h3>
                <p className="text-xs leading-relaxed opacity-85">{pillar.desc}</p>
              </div>
              <Link href={attendeeMode ? '#discover-events' : '/register'} className="text-xs font-bold underline flex items-center gap-1 mt-4 hover:opacity-80">
                Explore Portal <span>→</span>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Dynamic Statistics Bar */}
      <section className="bg-[#062E22] px-4 py-16 relative overflow-hidden text-white">
        <div className="absolute inset-0 z-0 opacity-5">
          <div className="pattern-dots pattern-dots-lg absolute inset-0" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl grid gap-8 text-center sm:grid-cols-2 md:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="space-y-2 p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
              <span className="text-2xl block">{stat.icon}</span>
              <p className="text-4xl font-extrabold text-[#8ECFC0]">{stat.value}</p>
              <p className="text-xs font-medium text-white/70">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Breakdown */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center space-y-3">
          <span className="inline-block rounded-full bg-[#062E22]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#062E22]">
            Key Capability
          </span>
          <h2 className="text-3xl font-extrabold text-[#062E22]">Seamless Event Operations</h2>
          <p className="mx-auto max-w-xl text-slate-500 text-sm">
            Everything you need, built directly over secure administrative licensing processes.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition hover:shadow-md duration-300">
              <div className="flex h-36 items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                <span className="text-5xl transform hover:scale-110 transition duration-300">{feature.emoji}</span>
              </div>
              <div className="p-6 space-y-2">
                <h3 className="text-lg font-bold text-[#062E22]">{feature.title}</h3>
                <p className="text-xs leading-relaxed text-slate-500">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Discover Events / Live Filtering */}
      <section id="discover-events" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 border-t border-slate-100">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold text-[#062E22]">
              {attendeeMode ? 'Available Events to Book' : 'Featured Event Experiences'}
            </h2>
            <p className="text-sm text-slate-500">
              {attendeeMode
                ? 'Select a live published event, review safety permits and schedules, and complete your reservation.'
                : 'Sign in to access secure attendee registrations and receive your check-in QR passes.'}
            </p>
          </div>
          {!attendeeMode && (
            <Link href="/login" className="text-sm font-bold text-[#062E22] hover:underline flex items-center gap-1 shrink-0">
              Sign in to secure tickets <span>→</span>
            </Link>
          )}
        </div>

        {/* Filter Pills */}
        <div className="mt-8 flex flex-wrap gap-2">
          {['All', 'Conferences', 'Summits', 'Galas'].map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition duration-200 ${
                selectedTag === tag
                  ? 'bg-[#062E22] text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {attendeeMode ? (
          <div className="mt-8">
            {eventsLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#062E22] border-t-transparent" />
              </div>
            ) : eventsError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-xs font-semibold text-red-700">
                {eventsError}
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-12 text-center shadow-sm">
                <h3 className="text-lg font-bold text-[#062E22]">No matching events found</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Adjust your search keywords or filter settings to browse other live events.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {filteredEvents.map((event) => {
                  const isOpen = event.booking_required && event.booking_status === 'open';
                  return (
                    <div
                      key={event.id}
                      className="group overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg flex flex-col duration-300"
                    >
                      <div className="bg-gradient-to-br from-[#062E22] to-[#124939] p-6 text-white relative">
                        <div className="flex items-start justify-between gap-4">
                          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold">
                            {monthBadge(event.start_date)}
                          </span>
                          <span className="rounded-full bg-[#8ECFC0]/20 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#CFF7EE]">
                            {formatEventType(event.category)}
                          </span>
                        </div>
                        <h3 className="mt-8 text-2xl font-bold leading-tight group-hover:text-emerald-300 transition duration-200">{event.title}</h3>
                        <p className="mt-2 text-xs text-white/70 font-semibold">{formatDateRange(event.start_date, event.end_date)}</p>
                      </div>
                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <p className="line-clamp-3 text-xs leading-relaxed text-slate-500">
                          {event.description || 'Details are officially published and verified. Open the card to view schedules and coordinate QR passes.'}
                        </p>
                        <div className="mt-6 pt-4 border-t border-slate-100 space-y-4">
                          <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                            <div className="rounded-xl bg-slate-50 p-2.5">
                              <p className="text-[9px] uppercase tracking-wider text-slate-400">Venue</p>
                              <p className="mt-0.5 text-slate-800 truncate">{event.location || 'Addis Ababa'}</p>
                            </div>
                            <div className="rounded-xl bg-slate-50 p-2.5">
                              <p className="text-[9px] uppercase tracking-wider text-slate-400">Booking</p>
                              <p className="mt-0.5 text-slate-800">{bookingLabel(event)}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <div className="text-[10px] font-semibold text-slate-400">
                              {event.booking_required ? (
                                <div>
                                  <span className={(event.remaining_slots ?? 0) <= 5 ? 'text-amber-600' : 'text-slate-600'}>
                                    {event.remaining_slots ?? 0} slots left
                                  </span>
                                  <span className="block text-[8px] text-slate-400">{event.booked_count ?? 0} booked</span>
                                </div>
                              ) : (
                                <span>No reservation needed</span>
                              )}
                            </div>
                            {isOpen ? (
                              <Link
                                href={`/events/${event.id}`}
                                className="inline-flex items-center gap-1 rounded-xl bg-[#062E22] px-4 py-2 text-xs font-extrabold text-white transition hover:bg-[#0a4a37] active:scale-95 duration-200"
                              >
                                Reserve Seat <span>→</span>
                              </Link>
                            ) : (
                              <Link
                                href={`/events/${event.id}`}
                                className="text-xs font-bold text-[#062E22] hover:underline flex items-center gap-1"
                              >
                                View Info <span>→</span>
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {SHOWCASE_EVENTS.map((event) => (
              <div key={event.id} className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm flex flex-col justify-between">
                <div className={`bg-gradient-to-br ${event.tone} p-6 text-white`}>
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold">
                    {event.month}
                  </span>
                  <h3 className="mt-8 text-2xl font-bold">{event.title}</h3>
                  <span className="inline-block mt-2 rounded bg-[#8ECFC0]/20 px-2 py-0.5 text-[8px] font-bold tracking-wider uppercase text-emerald-200">
                    {event.tag}
                  </span>
                </div>
                <div className="p-6 space-y-4">
                  <p className="text-xs leading-relaxed text-slate-500">{event.desc}</p>
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-slate-400">Venue</p>
                      <p className="text-xs font-bold text-[#062E22]">{event.venue}</p>
                    </div>
                    <Link href="/login" className="rounded-xl border border-slate-200 p-2 text-[#062E22] hover:bg-[#062E22] hover:text-white transition duration-200">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Call to Action Banner */}
      <section className="px-4 py-20">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] bg-[#062E22] px-8 py-16 text-center shadow-2xl">
          <div className="absolute inset-0 z-0 opacity-5">
            <div className="pattern-dots pattern-dots-sm absolute inset-0" />
          </div>
          <div className="relative z-10 space-y-6">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              {attendeeMode ? 'Ready to secure your tickets?' : 'Ready to streamline event permits?'}
            </h2>
            <p className="mx-auto max-w-lg text-sm text-white/80 leading-relaxed">
              {attendeeMode
                ? 'Browse upcoming public sessions, review safety permits, and secure your reservation code now.'
                : 'Join the premier administrative ecosystem in Ethiopia connecting municipal coordinators, verified local vendors, and attendee platforms.'}
            </p>
            <div className="pt-2">
              <Link
                href={attendeeMode ? '#discover-events' : '/register'}
                className="inline-block rounded-xl bg-[#8ECFC0] px-8 py-3.5 text-xs font-extrabold text-[#062E22] shadow-lg shadow-emerald-950/20 hover:bg-white transition active:scale-95 duration-200"
              >
                {attendeeMode ? 'Browse Events Now' : 'Create an Account'}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Chatbot Floating Advisor */}
      <Chatbot />

      {/* Unified Footer */}
      <footer className="bg-[#062E22] px-4 py-16 text-white border-t border-white/5 relative z-10">
        <div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-bold">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10">
                <span className="text-sm font-bold text-[#8ECFC0]">G</span>
              </div>
              <span className="tracking-tight">Global Connect</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-300/80">
              The statutory digital coordination network simplifying regulatory permit workflows, vendor verification status, and attendee QR verification tags in Addis Ababa and beyond.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#8ECFC0]">Quick Navigation</h4>
            <ul className="space-y-2 text-xs text-slate-300/60">
              <li><Link href="/about" className="hover:text-white transition">About Our Vision</Link></li>
              <li><Link href="/faq" className="hover:text-white transition">Regulatory FAQ</Link></li>
              <li><Link href="/contact" className="hover:text-white transition">Submit Inquiry Support</Link></li>
              <li><Link href="/terms" className="hover:text-white transition">Portal Terms & Disclaimer</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#8ECFC0]">Platform Portals</h4>
            <ul className="space-y-2 text-xs text-slate-300/60">
              <li><Link href="/login" className="hover:text-white transition">Organizer Workspace</Link></li>
              <li><Link href="/login" className="hover:text-white transition">Vendor Service Desk</Link></li>
              <li><Link href="/login" className="hover:text-white transition">Municipal Approvals Portal</Link></li>
              <li><Link href="/login" className="hover:text-white transition">Attendee Registration</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#8ECFC0]">System Integrity</h4>
            <div className="space-y-2 text-[10px] text-slate-300/50">
              <p>✓ Permitting workflow officially aligned with Ministry protocols.</p>
              <p>✓ Automated QR codes securely verified against local registries.</p>
              <p>✓ AI chatbot operates under licensing regulations advisory.</p>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-7xl border-t border-white/5 pt-8 text-center text-[10px] text-slate-300/30">
          © 2026 Global Connect Ethiopia. All statutory rights reserved.
        </div>
      </footer>
    </div>
  );
}

