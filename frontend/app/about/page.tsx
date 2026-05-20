'use client';

import Link from 'next/link';

const MILESTONES = [
  { year: '2024', title: 'Platform Conception', desc: 'Initiated planning under Ministry of Innovation and Technology to streamline public events licensing.' },
  { year: '2025', title: 'Phase 1 & 2 Release', desc: 'Rolled out organizer dashboards, permit approval systems, and vendor service negotiations.' },
  { year: '2026', title: 'Phase 3 Launch', desc: 'Introduced live attendee booking, QR-based secure check-ins, and direct AI-assisted licensing guidelines.' },
];

const PILLARS = [
  { title: 'Transparency', desc: 'Bridging event organizers and municipal authorities with a clear, digitized review process.' },
  { title: 'Efficiency', desc: 'Reducing bureaucracy and permit approval turnaround times from weeks to just a few days.' },
  { title: 'Community', desc: 'Ensuring that every event attendee receives a safe, verified, and premium check-in experience.' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-[Inter,sans-serif] text-slate-900">
      {/* Header */}
      <nav className="fixed inset-x-0 top-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm border-b border-slate-100">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 font-bold text-[#062E22] text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#062E22]">
              <span className="text-sm font-bold text-white">G</span>
            </div>
            Global Connect Ethiopia
          </Link>
          <Link
            href="/"
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition"
          >
            Back to Home
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 pb-20">
        {/* Hero Section */}
        <section className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8 mt-10">
          <span className="inline-block rounded-full bg-[#062E22]/10 px-3 py-1 text-xs font-semibold tracking-wide text-[#062E22] uppercase">
            Our Vision & Journey
          </span>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight text-[#062E22] sm:text-5xl">
            Connecting Ethiopia through <span className="bg-gradient-to-r from-[#0a4a37] to-[#1a6648] bg-clip-text text-transparent">Professional Events</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
            Global Connect Ethiopia is the nation's premier digital infrastructure built to unify event organizers, government authorities, local vendors, and attendees under a single, highly-secure, and intuitive workspace.
          </p>
        </section>

        {/* Vision Pillars */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-20">
          <div className="grid gap-8 md:grid-cols-3">
            {PILLARS.map((pillar) => (
              <div
                key={pillar.title}
                className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition hover:shadow-md hover:-translate-y-0.5 duration-300"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#062E22]/10 text-[#062E22]">
                  <span className="text-xl font-bold">★</span>
                </div>
                <h3 className="mt-5 text-xl font-bold text-[#062E22]">{pillar.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">{pillar.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Milestone Timeline */}
        <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 mt-24">
          <h2 className="text-3xl font-extrabold text-[#062E22] text-center">Our Timeline</h2>
          <div className="mt-12 relative border-l-2 border-slate-200 pl-6 ml-4 space-y-12">
            {MILESTONES.map((item) => (
              <div key={item.year} className="relative">
                <div className="absolute -left-[35px] top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#062E22] bg-white text-[#062E22]">
                  <div className="h-2 w-2 rounded-full bg-[#062E22]" />
                </div>
                <div>
                  <span className="text-sm font-bold text-[#062E22]">{item.year}</span>
                  <h3 className="text-lg font-bold text-slate-800">{item.title}</h3>
                  <p className="mt-1 text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Call to Action */}
        <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 mt-24">
          <div className="rounded-[2rem] bg-[#062E22] p-10 text-center text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-2xl font-bold">Help shape the future of event governance</h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-white/80">
                Join our ecosystem as a vendor, organizer, or attendee, and experience seamless coordination.
              </p>
              <div className="mt-6 flex justify-center gap-4">
                <Link
                  href="/register"
                  className="rounded-xl bg-white px-6 py-2.5 text-sm font-bold text-[#062E22] hover:bg-slate-100 transition shadow-md"
                >
                  Create an Account
                </Link>
                <Link
                  href="/login"
                  className="rounded-xl border border-white/40 px-6 py-2.5 text-sm font-bold text-white hover:bg-white/10 transition"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-400">
        © 2026 Global Connect Ethiopia. All rights reserved.
      </footer>
    </div>
  );
}
