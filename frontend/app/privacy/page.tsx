'use client';

import Link from 'next/link';

const SECTIONS = [
  { id: 'overview', title: '1. Overview' },
  { id: 'data', title: '2. Data We Collect' },
  { id: 'use', title: '3. How We Use Data' },
  { id: 'sharing', title: '4. Sharing & Disclosure' },
  { id: 'rights', title: '5. Your Choices' },
];

export default function PrivacyPage() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const topOffset = element.getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top: topOffset, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-[Inter,sans-serif] text-slate-900">
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

      <main className="pt-24 pb-20">
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-10">
          <div className="text-center">
            <span className="inline-block rounded-full bg-[#062E22]/10 px-3 py-1 text-xs font-semibold tracking-wide text-[#062E22] uppercase">
              Privacy Notice
            </span>
            <h1 className="mt-4 text-4xl font-extrabold text-[#062E22]">Privacy Policy</h1>
            <p className="mx-auto mt-3 max-w-lg text-slate-500">
              This page explains how Global Connect Ethiopia handles account, event, and verification data across the platform.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-[250px_1fr]">
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

            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm prose prose-slate max-w-none">
              <div id="overview" className="mb-10 scroll-mt-24">
                <h2 className="text-2xl font-bold text-[#062E22] border-b border-slate-100 pb-2">1. Overview</h2>
                <p className="mt-4 text-sm text-slate-600 leading-relaxed">
                  We collect and process information needed to create accounts, verify identities, manage registrations, and support platform features for organizers, vendors, attendees, and public officials.
                </p>
              </div>

              <div id="data" className="mb-10 scroll-mt-24">
                <h2 className="text-2xl font-bold text-[#062E22] border-b border-slate-100 pb-2">2. Data We Collect</h2>
                <p className="mt-4 text-sm text-slate-600 leading-relaxed">
                  Depending on the feature you use, we may collect your name, email, password hash, role, contact details, uploaded documents, event records, and support messages. We also store verification-related information when you submit licensing or registration forms.
                </p>
              </div>

              <div id="use" className="mb-10 scroll-mt-24">
                <h2 className="text-2xl font-bold text-[#062E22] border-b border-slate-100 pb-2">3. How We Use Data</h2>
                <p className="mt-4 text-sm text-slate-600 leading-relaxed">
                  Data is used to authenticate accounts, send OTPs, process submissions, review approvals, and provide service updates. We may also use it to improve reliability, detect abuse, and meet legal or administrative requirements.
                </p>
              </div>

              <div id="sharing" className="mb-10 scroll-mt-24">
                <h2 className="text-2xl font-bold text-[#062E22] border-b border-slate-100 pb-2">4. Sharing & Disclosure</h2>
                <p className="mt-4 text-sm text-slate-600 leading-relaxed">
                  We only share information when required to operate the platform, fulfill verification workflows, or comply with review and approval processes. Sensitive documents are not intended for public display.
                </p>
              </div>

              <div id="rights" className="mb-6 scroll-mt-24">
                <h2 className="text-2xl font-bold text-[#062E22] border-b border-slate-100 pb-2">5. Your Choices</h2>
                <p className="mt-4 text-sm text-slate-600 leading-relaxed">
                  You may update your profile, request account support, or contact us if you need clarification about stored data. For platform issues, use the support page or the contact form linked from the application.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-400">
        © 2026 Global Connect Ethiopia. All rights reserved.
      </footer>
    </div>
  );
}