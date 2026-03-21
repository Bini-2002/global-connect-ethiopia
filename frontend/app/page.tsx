'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

const NAV_LINKS = ['Attendees', 'Organizers', 'Vendors', 'Authorities'];

const STATS = [
  { value: '150+', label: 'Premium Venues' },
  { value: '2M+', label: 'Annual Attendees' },
  { value: '500+', label: 'Certified Vendors' },
  { value: '45', label: 'Global Partners' },
];

const PILLARS = [
  {
    icon: '📅',
    title: 'Organizers',
    desc: 'Powerful tools for venue management and logistics.',
    bg: 'bg-[#062E22]',
    text: 'text-white',
  },
  {
    icon: '🏪',
    title: 'Vendors',
    desc: 'Showcase your services to global event planners.',
    bg: 'bg-[#8ECFC0]',
    text: 'text-[#062E22]',
  },
  {
    icon: '🎟️',
    title: 'Attendees',
    desc: 'Discover and book exclusive access to premier events.',
    bg: 'bg-[#1a5c45]',
    text: 'text-white',
  },
];

const FEATURES = [
  {
    title: 'AI Planner',
    desc: 'Smart scheduling and dynamic resource allocation using proprietary machine learning models.',
    emoji: '🤖',
  },
  {
    title: 'Secure Government Portals',
    desc: 'Integrated compliance, VISA processing, and official documentation with ministerial approval channels.',
    emoji: '🏛️',
  },
  {
    title: 'Real-time Analytics',
    desc: 'Data-driven insights for measurable event success, attendee demographics, and ROI reporting.',
    emoji: '📊',
  },
];

const EVENTS = [
  {
    tag: 'TECHNOLOGY',
    month: 'OCT 17',
    title: 'Africa Tech Horizons',
    desc: "Leading innovators and VC firms gather to define Ethiopia's digital future in Addis...",
    venue: 'Millennium Hall',
    color: 'bg-cyan-900',
  },
  {
    tag: 'HERITAGE',
    month: 'NOV 23',
    title: 'Heritage & Harmony Gala',
    desc: 'An exclusive evening celebrating Ethiopian artistry, fashion, and culinary traditions...',
    venue: 'Skylight Hotel',
    color: 'bg-amber-900',
  },
  {
    tag: 'COMMERCE',
    month: 'DEC 01',
    title: 'Global Trade Forum',
    desc: "The continent's largest multi-sector trade exposition facilitating B2B partnerships...",
    venue: 'UNECA Center',
    color: 'bg-emerald-900',
  },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white font-[Inter,sans-serif]">
      {/* ─── NAVBAR ─── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white shadow-md' : 'bg-white/95 backdrop-blur-sm'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 font-bold text-[#062E22] text-lg">
            <div className="w-8 h-8 bg-[#062E22] rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">G</span>
            </div>
            Global Connect Ethiopia
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((l) => (
              <Link
                key={l}
                href="#"
                className="text-sm text-slate-600 hover:text-[#062E22] font-medium transition-colors"
              >
                {l}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-3">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search events..."
                className="pl-9 pr-4 py-2 text-sm bg-slate-100 rounded-full focus:outline-none focus:ring-2 focus:ring-[#062E22]/20 w-48"
              />
            </div>
            <Link
              href="/login"
              className="px-5 py-2 bg-[#062E22] text-white text-sm font-semibold rounded-lg hover:bg-[#0a4a37] transition-all duration-200 shadow-sm hover:shadow-md"
            >
              Sign In
            </Link>
          </div>

          {/* Mobile menu btn */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2">
            <svg className="w-6 h-6 text-[#062E22]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 py-3 px-4 space-y-2 animate-fade-in">
            {NAV_LINKS.map((l) => (
              <Link key={l} href="#" className="block py-2 text-sm text-slate-700 hover:text-[#062E22]">{l}</Link>
            ))}
            <Link href="/login" className="block mt-3 text-center py-2 bg-[#062E22] text-white text-sm font-semibold rounded-lg">Sign In</Link>
          </div>
        )}
      </nav>

      {/* ─── HERO ─── */}
      <section className="pt-16 relative overflow-hidden">
        <div className="relative h-[480px] sm:h-[560px] w-full">
          {/* Gradient overlay background */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#062E22] via-[#0a4a37] to-[#1a6648]" />
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}
          />

          {/* Hero content */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
            <div className="flex flex-col md:flex-row items-center gap-12 w-full">
              {/* Text */}
              <div className="text-white flex-1 animate-fade-in">
                <span className="inline-block px-3 py-1 text-xs font-semibold bg-white/20 text-white rounded-full mb-4 tracking-wide">
                  ETHIOPIA'S PREMIER EVENT PLATFORM
                </span>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-4">
                  Connect. Create.<br />
                  <span className="text-[#8ECFC0]">Celebrate.</span>
                </h1>
                <p className="text-white/80 text-lg mb-8 max-w-md">
                  The premier digital infrastructure for professional events in Ethiopia and beyond.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/register" className="px-6 py-3 bg-white text-[#062E22] font-bold rounded-lg hover:bg-slate-100 transition-all shadow-lg hover:shadow-xl">
                    Get Started Free
                  </Link>
                  <Link href="/login" className="px-6 py-3 border-2 border-white/50 text-white font-semibold rounded-lg hover:bg-white/10 transition-all">
                    Sign In →
                  </Link>
                </div>
              </div>

              {/* Hero image card */}
              <div className="flex-1 hidden md:flex justify-end gap-4 animate-slide-right">
                <div className="relative">
                  <div className="w-72 h-56 rounded-2xl bg-gradient-to-br from-amber-800/60 to-amber-900/80 overflow-hidden shadow-2xl border border-white/20 flex items-center justify-center">
                    <div className="text-center text-white/60">
                      <svg className="w-16 h-16 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm">Grand Event Hall</p>
                    </div>
                  </div>
                  {/* Floating circle image */}
                  <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full bg-gradient-to-br from-[#8ECFC0] to-[#062E22] border-4 border-white shadow-xl flex items-center justify-center">
                    <span className="text-4xl">🎉</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── THREE PILLARS ─── */}
      <section className="py-20 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#062E22] mb-3">Three Pillars of Excellence</h2>
          <p className="text-slate-500 max-w-xl mx-auto text-base">
            Tailored solutions for every stakeholder in the event ecosystem, ensuring quality from planning to applause.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PILLARS.map((p, i) => (
            <div
              key={p.title}
              className={`${p.bg} ${p.text} rounded-2xl p-8 flex flex-col items-center text-center shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-fade-in delay-${(i + 1) * 100}`}
            >
              <span className="text-4xl mb-4">{p.icon}</span>
              <h3 className="text-xl font-bold mb-2">{p.title}</h3>
              <p className="text-sm opacity-80">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── STATS STRIP ─── */}
      <section className="bg-[#062E22] py-12 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map((s, i) => (
            <div key={s.label} className={`animate-fade-in delay-${(i + 1) * 100}`}>
              <p className="text-3xl sm:text-4xl font-extrabold text-[#8ECFC0]">{s.value}</p>
              <p className="text-white/70 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="py-20 px-4 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
          <div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#062E22] mb-3">Enterprise-Grade Features</h2>
            <p className="text-slate-500 max-w-xl">
              Advanced tools designed for high-impact professional events and seamless international collaboration.
            </p>
          </div>
          <Link href="/register" className="text-[#062E22] font-semibold text-sm hover:underline whitespace-nowrap flex items-center gap-1">
            View all features →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={`bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-fade-in delay-${(i + 1) * 200}`}
            >
              <div className="h-40 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                <span className="text-6xl">{f.emoji}</span>
              </div>
              <div className="p-6">
                <h3 className="font-bold text-[#062E22] text-lg mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── TRENDING EVENTS ─── */}
      <section className="py-20 px-4 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-[#062E22] mb-2">Trending Events</h2>
            <p className="text-slate-500 text-sm">Discover what's happening across Ethiopia this month.</p>
          </div>
          <Link href="#" className="text-[#062E22] font-semibold text-sm hover:underline whitespace-nowrap flex items-center gap-1">
            View All Events →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {EVENTS.map((e, i) => (
            <div
              key={e.title}
              className={`bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer animate-fade-in delay-${(i + 1) * 150}`}
            >
              <div className={`h-44 ${e.color} flex items-end justify-between p-4 relative`}>
                <span className="absolute top-3 left-3 bg-[#062E22] text-white text-[10px] font-bold px-2 py-1 rounded-full">
                  {e.month}
                </span>
              </div>
              <div className="p-5">
                <span className="text-[10px] font-bold text-[#D97706] tracking-widest">{e.tag}</span>
                <h3 className="font-bold text-[#062E22] text-lg mt-1 mb-2">{e.title}</h3>
                <p className="text-slate-500 text-sm line-clamp-2 mb-4">{e.desc}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    {e.venue}
                  </div>
                  <button className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center hover:bg-[#062E22] hover:text-white transition-all">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA SECTION ─── */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto bg-[#062E22] rounded-3xl py-16 px-8 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}
          />
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
              Ready to transform your<br className="hidden sm:block" /> event experience?
            </h2>
            <p className="text-white/70 mb-8 text-base max-w-md mx-auto">
              Join the thousands of organizers and vendors already scaling their impact with Global Connect Ethiopia.
            </p>
            <Link
              href="/register"
              className="inline-block px-8 py-3.5 bg-[#8ECFC0] text-[#062E22] font-bold rounded-xl hover:bg-white transition-all duration-200 shadow-lg hover:shadow-xl text-sm"
            >
              Get Started Now
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-[#062E22] text-white py-14 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 font-bold text-lg mb-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-sm font-bold">G</span>
              </div>
              Global Connect
            </div>
            <p className="text-white/60 text-sm leading-relaxed">
              The premier digital infrastructure for professional events in Ethiopia and beyond.
            </p>
          </div>
          {/* Platform */}
          <div>
            <h4 className="font-semibold text-sm mb-4 text-white/90">Platform</h4>
            <ul className="space-y-2">
              {['Find Events', 'Organize', 'Vendor Directory', 'Venue Partners'].map((l) => (
                <li key={l}><Link href="#" className="text-white/60 text-sm hover:text-white transition">{l}</Link></li>
              ))}
            </ul>
          </div>
          {/* Support */}
          <div>
            <h4 className="font-semibold text-sm mb-4 text-white/90">Support</h4>
            <ul className="space-y-2">
              {['Help Center', 'Permit Guide', 'Security Protocol', 'Terms of Service'].map((l) => (
                <li key={l}><Link href="#" className="text-white/60 text-sm hover:text-white transition">{l}</Link></li>
              ))}
            </ul>
          </div>
          {/* Connect */}
          <div>
            <h4 className="font-semibold text-sm mb-4 text-white/90">Connect</h4>
            <div className="flex gap-3">
              {['🔗', '📧', '📞'].map((icon, i) => (
                <button key={i} className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition">
                  <span className="text-base">{icon}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-white/10 mt-10 pt-6 text-center text-white/40 text-xs">
          © 2024 Global Connect Ethiopia. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
