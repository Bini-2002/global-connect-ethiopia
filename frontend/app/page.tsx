'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { getRole, isLoggedIn, logout } from './lib/auth';
import { eventsService } from './services/eventsService';
import { EventRecord } from './types/event';

const NAV_LINKS = ['Attendees', 'Organizers', 'Vendors', 'Authorities'];

const STATS = [
  { value: '150+', label: 'Premium Venues' },
  { value: '2M+', label: 'Annual Attendees' },
  { value: '500+', label: 'Certified Vendors' },
  { value: '45', label: 'Global Partners' },
];

const PILLARS = [
  {
    icon: 'Calendar',
    title: 'Organizers',
    desc: 'Move from official approval into real event execution with one connected workflow.',
    bg: 'bg-[#062E22]',
    text: 'text-white',
  },
  {
    icon: 'Building',
    title: 'Vendors',
    desc: 'Approved vendors can publish services, negotiate requests, and manage active contracts.',
    bg: 'bg-[#8ECFC0]',
    text: 'text-[#062E22]',
  },
  {
    icon: 'Ticket',
    title: 'Attendees',
    desc: 'Discover verified events, reserve your place, and receive a check-in QR pass.',
    bg: 'bg-[#1A5C45]',
    text: 'text-white',
  },
];

const FEATURES = [
  {
    title: 'Approval to Execution',
    desc: 'Turn an officially approved proposal into a live event workspace without leaving the platform.',
    emoji: '🏛️',
  },
  {
    title: 'Booking and Check-in',
    desc: 'Attendees can reserve seats and receive QR-based event access for smooth on-site arrival.',
    emoji: '🎫',
  },
  {
    title: 'Vendor Collaboration',
    desc: 'Service requests, negotiation, and contract signing now support the organizer-vendor relationship.',
    emoji: '🤝',
  },
];

const SHOWCASE_EVENTS = [
  {
    id: 'sample-tech-horizons',
    month: 'OCT 17',
    title: 'Africa Tech Horizons',
    desc: "Leading innovators and VC firms gather to define Ethiopia's digital future in Addis Ababa.",
    venue: 'Millennium Hall',
    tag: 'CONFERENCE',
    tone: 'from-cyan-900 to-cyan-700',
  },
  {
    id: 'sample-trade-forum',
    month: 'NOV 23',
    title: 'Global Trade Forum',
    desc: 'A government-supported commerce forum designed for exporters, investors, and regional partners.',
    venue: 'UNECA Center',
    tag: 'SUMMIT / FORUM',
    tone: 'from-emerald-900 to-emerald-700',
  },
  {
    id: 'sample-heritage-gala',
    month: 'DEC 01',
    title: 'Heritage & Harmony Gala',
    desc: 'An invite-focused evening connecting cultural institutions, tourism leaders, and sponsors.',
    venue: 'Skylight Hotel',
    tag: 'NETWORKING / GALA',
    tone: 'from-amber-900 to-amber-700',
  },
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
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  }

  if (name === 'Building') {
    return (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01" />
      </svg>
    );
  }

  return (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 4l3 4-3 4m-8 8l-3-4 3-4m1-5h6a2 2 0 012 2v1m-10 4H5a2 2 0 01-2-2V9" />
    </svg>
  );
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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
    if (!authReady || !loggedIn || role !== 'attendee') return;

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

  const attendeeMode = loggedIn && role === 'attendee';

  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const query = searchQuery.trim().toLowerCase();

    return events.filter((event) =>
      [event.title, event.location, event.category, event.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [events, searchQuery]);

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-white font-[Inter,sans-serif] text-slate-900">
      <nav
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white shadow-md' : 'bg-white/95 backdrop-blur-sm'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 font-bold text-[#062E22] text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#062E22]">
              <span className="text-sm font-bold text-white">G</span>
            </div>
            Global Connect Ethiopia
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <Link key={link} href="#discover-events" className="text-sm font-medium text-slate-600 transition-colors hover:text-[#062E22]">
                {link}
              </Link>
            ))}
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
                    placeholder="Search published events..."
                    className="w-56 rounded-full bg-slate-100 py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20"
                  />
                </div>
                <span className="rounded-full bg-[#062E22]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#062E22]">
                  Attendee Portal
                </span>
                <button
                  onClick={handleLogout}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-lg bg-[#062E22] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#0a4a37]"
              >
                Sign In
              </Link>
            )}
          </div>

          <button onClick={() => setMenuOpen((value) => !value)} className="md:hidden p-2" aria-label="Toggle menu">
            <svg className="w-6 h-6 text-[#062E22]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-slate-100 bg-white px-4 py-3 md:hidden">
            <div className="space-y-2">
              {NAV_LINKS.map((link) => (
                <Link key={link} href="#discover-events" className="block py-2 text-sm text-slate-700 hover:text-[#062E22]">
                  {link}
                </Link>
              ))}
              {attendeeMode ? (
                <>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search published events..."
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20"
                  />
                  <button
                    onClick={handleLogout}
                    className="mt-3 w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Link href="/login" className="mt-3 block rounded-lg bg-[#062E22] py-2 text-center text-sm font-semibold text-white">
                  Sign In
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      <section className="relative overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-to-r from-[#062E22] via-[#0a4a37] to-[#1a6648]" />
        <div className="pattern-dots pattern-dots-lg absolute inset-0 opacity-10" />

        <div className="relative mx-auto flex min-h-[520px] max-w-7xl items-center px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid w-full gap-12 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            <div className="text-white">
              <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold tracking-wide">
                ETHIOPIA&apos;S PROFESSIONAL EVENT HUB
              </span>
              <h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
                {attendeeMode ? (
                  <>
                    Reserve your place.
                    <br />
                    <span className="text-[#8ECFC0]">Arrive with confidence.</span>
                  </>
                ) : (
                  <>
                    Connect. Create.
                    <br />
                    <span className="text-[#8ECFC0]">Celebrate.</span>
                  </>
                )}
              </h1>
              <p className="mt-5 max-w-xl text-lg text-white/80">
                {attendeeMode
                  ? 'Browse published events, review what matters, and complete your reservation with a QR check-in pass.'
                  : 'The digital infrastructure for approved professional events, verified vendors, and attendee-ready booking across Ethiopia.'}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {attendeeMode ? (
                  <>
                    <Link href="#discover-events" className="rounded-lg bg-white px-6 py-3 font-bold text-[#062E22] shadow-lg transition hover:bg-slate-100">
                      Browse Events
                    </Link>
                    <Link href="/login" className="rounded-lg border-2 border-white/50 px-6 py-3 font-semibold text-white transition hover:bg-white/10">
                      Open Portal
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/register" className="rounded-lg bg-white px-6 py-3 font-bold text-[#062E22] shadow-lg transition hover:bg-slate-100">
                      Get Started Free
                    </Link>
                    <Link href="/login" className="rounded-lg border-2 border-white/50 px-6 py-3 font-semibold text-white transition hover:bg-white/10">
                      Sign In
                    </Link>
                  </>
                )}
              </div>
            </div>

            <div className="hidden md:block">
              <div className="rounded-[28px] border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-sm">
                <div className="grid gap-4">
                  <div className="rounded-2xl bg-white/95 p-5 text-[#062E22] shadow-lg">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0a4a37]/70">
                      {attendeeMode ? 'Current Attendee Flow' : 'Platform Progress'}
                    </p>
                    <h2 className="mt-3 text-2xl font-bold">
                      {attendeeMode ? 'Event details -> booking -> QR pass' : 'Approval -> event creation -> booking'}
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">
                      {attendeeMode
                        ? 'You now have a real attendee path from homepage selection into reservation and check-in preparation.'
                        : 'The platform now supports proposal approval, event execution, vendor negotiation, and attendee booking preparation.'}
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl bg-[#8ECFC0] p-5 text-[#062E22] shadow-lg">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em]">Booking</p>
                      <p className="mt-2 text-xl font-bold">QR-based check-in passes</p>
                    </div>
                    <div className="rounded-2xl bg-[#133c30] p-5 text-white shadow-lg">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Vendor Portal</p>
                      <p className="mt-2 text-xl font-bold">Requests + contracts active</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {attendeeMode && (
        <section className="border-b border-slate-100 bg-[#F5FBF8]">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#0a4a37]">Attendee workspace</p>
              <h2 className="mt-2 text-2xl font-bold text-[#062E22]">Select an event from the homepage and reserve your place.</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                This attendee view is connected to real published events. Open a card below to read the event details, confirm availability, and receive your QR check-in pass after booking.
              </p>
            </div>
            <div className="rounded-2xl border border-[#8ECFC0] bg-white px-5 py-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Published events loaded</p>
              <p className="mt-1 text-3xl font-extrabold text-[#062E22]">{events.length}</p>
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-[#062E22] sm:text-4xl">Three Pillars of Excellence</h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-slate-500">
            The product is now centered on an approval-backed professional event lifecycle for organizers, vendors, and attendees.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {PILLARS.map((pillar) => (
            <div key={pillar.title} className={`${pillar.bg} ${pillar.text} rounded-3xl p-8 text-center shadow-lg`}>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
                <PillarIcon name={pillar.icon} />
              </div>
              <h3 className="mt-5 text-xl font-bold">{pillar.title}</h3>
              <p className="mt-3 text-sm leading-relaxed opacity-85">{pillar.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#062E22] px-4 py-12">
        <div className="mx-auto grid max-w-7xl gap-8 text-center sm:grid-cols-2 md:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl font-extrabold text-[#8ECFC0] sm:text-4xl">{stat.value}</p>
              <p className="mt-1 text-sm text-white/70">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-extrabold text-[#062E22] sm:text-4xl">Built Around Real Workflow</h2>
            <p className="mt-3 max-w-2xl text-slate-500">
              The current product is strongest where governance and execution meet, and the new attendee and vendor experiences now build directly on that live backend state.
            </p>
          </div>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex h-40 items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                <span className="text-6xl">{feature.emoji}</span>
              </div>
              <div className="p-6">
                <h3 className="text-lg font-bold text-[#062E22]">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="discover-events" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-extrabold text-[#062E22]">
              {attendeeMode ? 'Available Events' : 'Featured Event Experiences'}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {attendeeMode
                ? 'Choose a published event to review the agenda, confirm availability, and reserve your place.'
                : 'Sign in as an attendee to browse live event records and complete a reservation with QR check-in support.'}
            </p>
          </div>
          {!attendeeMode && (
            <Link href="/login" className="text-sm font-semibold text-[#062E22] hover:underline">
              Sign in to reserve an event
            </Link>
          )}
        </div>

        {attendeeMode ? (
          <div className="mt-10">
            {eventsLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#062E22] border-t-transparent" />
              </div>
            ) : eventsError ? (
              <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                {eventsError}
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-10 text-center">
                <h3 className="text-xl font-bold text-[#062E22]">No events match your search</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Try another keyword or wait for the next published event to become available.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {filteredEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="bg-gradient-to-br from-[#062E22] via-[#0d4f39] to-[#1A5C45] p-5 text-white">
                      <div className="flex items-start justify-between gap-4">
                        <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold tracking-wide">
                          {monthBadge(event.start_date)}
                        </span>
                        <span className="rounded-full bg-[#8ECFC0]/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#CFF7EE]">
                          {formatEventType(event.category)}
                        </span>
                      </div>
                      <h3 className="mt-10 text-2xl font-bold leading-tight">{event.title}</h3>
                      <p className="mt-3 text-sm text-white/75">{formatDateRange(event.start_date, event.end_date)}</p>
                    </div>
                    <div className="p-5">
                      <p className="line-clamp-3 text-sm leading-relaxed text-slate-500">
                        {event.description || 'Published event details are now available for attendee review and booking.'}
                      </p>
                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">Venue</p>
                          <p className="mt-1 text-sm font-semibold text-[#062E22]">{event.location || 'Venue to be announced'}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">Booking</p>
                          <p className="mt-1 text-sm font-semibold text-[#062E22]">{bookingLabel(event)}</p>
                        </div>
                      </div>
                      <div className="mt-5 flex items-center justify-between">
                        <p className="text-xs text-slate-400">
                          {event.booking_required
                            ? `${event.remaining_slots} slots remaining`
                            : 'Open for event details'}
                        </p>
                        <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#062E22]">
                          Open details
                          <svg className="h-4 w-4 transition group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {SHOWCASE_EVENTS.map((event) => (
              <div key={event.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className={`bg-gradient-to-br ${event.tone} p-5 text-white`}>
                  <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold tracking-wide">
                    {event.month}
                  </span>
                  <h3 className="mt-10 text-2xl font-bold">{event.title}</h3>
                  <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">
                    {event.tag}
                  </p>
                </div>
                <div className="p-5">
                  <p className="text-sm leading-relaxed text-slate-500">{event.desc}</p>
                  <div className="mt-5 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">Venue</p>
                      <p className="mt-1 text-sm font-semibold text-[#062E22]">{event.venue}</p>
                    </div>
                    <Link href="/login" className="rounded-full border border-slate-200 p-2 transition hover:bg-[#062E22] hover:text-white">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="px-4 py-20">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[32px] bg-[#062E22] px-8 py-16 text-center shadow-2xl">
          <div className="pattern-dots pattern-dots-sm absolute inset-0 opacity-10" />
          <div className="relative z-10">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              {attendeeMode ? 'Ready to secure your seat?' : 'Ready to move your event forward?'}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-white/70">
              {attendeeMode
                ? 'Open an event card, review the agenda and venue details, then complete your reservation to receive your check-in QR pass.'
                : 'Join the ecosystem that now supports approved proposals, live event workspaces, vendor collaboration, and attendee booking.'}
            </p>
            <div className="mt-8">
              <Link
                href={attendeeMode ? '#discover-events' : '/register'}
                className="inline-block rounded-xl bg-[#8ECFC0] px-8 py-3.5 text-sm font-bold text-[#062E22] shadow-lg transition hover:bg-white"
              >
                {attendeeMode ? 'Browse Events Now' : 'Get Started Now'}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[#062E22] px-4 py-14 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div className="sm:col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 text-lg font-bold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                <span className="text-sm font-bold">G</span>
              </div>
              Global Connect
            </div>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              Professional events in Ethiopia now have a clearer path from approval to execution, vendor delivery, and attendee arrival.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white/90">Platform</h4>
            <ul className="mt-4 space-y-2 text-sm text-white/60">
              <li><Link href="#discover-events" className="transition hover:text-white">Find Events</Link></li>
              <li><Link href="/register" className="transition hover:text-white">Organize</Link></li>
              <li><Link href="/vendor/verification" className="transition hover:text-white">Vendor Verification</Link></li>
              <li><Link href="/login" className="transition hover:text-white">Portal Access</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white/90">Support</h4>
            <ul className="mt-4 space-y-2 text-sm text-white/60">
              <li><span>Permit Guidance</span></li>
              <li><span>Vendor Onboarding</span></li>
              <li><span>Booking Workflow</span></li>
              <li><span>Government Review</span></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white/90">Status</h4>
            <div className="mt-4 space-y-3 text-sm text-white/60">
              <p>Approval to event creation is connected.</p>
              <p>Attendee booking and QR delivery are now available.</p>
              <p>Vendor requests and contracts are ready in the portal.</p>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-7xl border-t border-white/10 pt-6 text-center text-xs text-white/40">
          © 2026 Global Connect Ethiopia. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
