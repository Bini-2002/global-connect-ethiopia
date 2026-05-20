'use client';

import Link from 'next/link';

const SECTIONS = [
  { id: 'intro', title: '1. Introduction' },
  { id: 'accounts', title: '2. User Accounts & Portals' },
  { id: 'licensing', title: '3. Licensing & Permits' },
  { id: 'vendors', title: '4. Vendor Collaboration' },
  { id: 'attendees', title: '5. Attendee Booking & QR' },
];

export default function TermsPage() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const topOffset = element.getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top: topOffset, behavior: 'smooth' });
    }
  };

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
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-10">
          <div className="text-center">
            <span className="inline-block rounded-full bg-[#062E22]/10 px-3 py-1 text-xs font-semibold tracking-wide text-[#062E22] uppercase">
              Regulatory Agreement
            </span>
            <h1 className="mt-4 text-4xl font-extrabold text-[#062E22]">Terms & Conditions</h1>
            <p className="mx-auto mt-3 max-w-lg text-slate-500">
              Please read these terms carefully before utilizing our unified licensing, event hosting, or booking workflows.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-[250px_1fr]">
            {/* Sidebar Sticky Navigation */}
            <aside className="hidden md:block">
              <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 px-3 mb-3">Sections</p>
                <nav className="space-y-1">
                  {SECTIONS.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className="w-full text-left rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-[#062E22] transition"
                    >
                      {section.title}
                    </button>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Legal Document Content */}
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm prose prose-slate max-w-none">
              <div id="intro" className="mb-10 scroll-mt-24">
                <h2 className="text-2xl font-bold text-[#062E22] border-b border-slate-100 pb-2">1. Introduction</h2>
                <p className="mt-4 text-sm text-slate-600 leading-relaxed">
                  Welcome to Global Connect Ethiopia. By accessing or using our platform, dashboards, chatbot advisor, or registry tools, you agree to comply with and be bound by the statutory regulations defined under the Ministry of Innovation and Technology (MInT) and partner municipal offices.
                </p>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  If you disagree with any segment of these licensing terms, you are requested to cease operations within the portal immediately.
                </p>
              </div>

              <div id="accounts" className="mb-10 scroll-mt-24">
                <h2 className="text-2xl font-bold text-[#062E22] border-b border-slate-100 pb-2">2. User Accounts & Portals</h2>
                <p className="mt-4 text-sm text-slate-600 leading-relaxed">
                  The platform provides specialized access tiers for **Organizers, Vendors, Municipal Authorities, and Attendees**. You represent and warrant that all credential entries (including phone number validation and national registry IDs) are entirely truthful and correct.
                </p>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  Keep your account secure at all times. Global Connect Ethiopia is not responsible for unauthorized activities performed under compromised organizer credentials.
                </p>
              </div>

              <div id="licensing" className="mb-10 scroll-mt-24">
                <h2 className="text-2xl font-bold text-[#062E22] border-b border-slate-100 pb-2">3. Licensing & Permits</h2>
                <p className="mt-4 text-sm text-slate-600 leading-relaxed">
                  Organizers submitting proposals recognize that permit issuance is governed by official government reviewers (Ministry, Municipal, Police). The AI licensing assistant provides quick informational guidance based on statutory codes but does not replace formal signed permits.
                </p>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  Live public event spaces cannot be initialized until the municipal status transitions to **Approved** in the portal workspace.
                </p>
              </div>

              <div id="vendors" className="mb-10 scroll-mt-24">
                <h2 className="text-2xl font-bold text-[#062E22] border-b border-slate-100 pb-2">4. Vendor Collaboration</h2>
                <p className="mt-4 text-sm text-slate-600 leading-relaxed">
                  Registered vendors must submit valid business permits to acquire **Verified** status. Contracts, negotiations, and pricing submitted within the workspace represent legally binding agreements between organizers and service providers.
                </p>
              </div>

              <div id="attendees" className="mb-6 scroll-mt-24">
                <h2 className="text-2xl font-bold text-[#062E22] border-b border-slate-100 pb-2">5. Attendee Booking & QR</h2>
                <p className="mt-4 text-sm text-slate-600 leading-relaxed">
                  Attendee bookings represent official seat reservations for verified event coordinates. Once a booking completes successfully, a unique **QR Pass** is generated in the portal. QR passes are non-transferable and must be verified by on-site authority checkers.
                </p>
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
