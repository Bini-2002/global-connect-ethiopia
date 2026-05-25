'use client';

import Link from 'next/link';

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-[Inter,sans-serif] text-slate-900">
      <nav className="fixed inset-x-0 top-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm border-b border-slate-100">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 font-bold text-[#062E22] text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#062E22]">
              <span className="text-sm font-bold text-white">G</span>
            </div>
            Event-Sphere
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
        <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 mt-10">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm text-center">
            <span className="inline-block rounded-full bg-[#062E22]/10 px-3 py-1 text-xs font-semibold tracking-wide text-[#062E22] uppercase">
              Support Center
            </span>
            <h1 className="mt-4 text-4xl font-extrabold text-[#062E22]">Need help?</h1>
            <p className="mx-auto mt-4 max-w-2xl text-slate-500">
              If registration, login, verification, or event workflow pages are not loading correctly, use the contact page to send us a support request.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-left">
                <h2 className="text-lg font-bold text-[#062E22]">Quick actions</h2>
                <p className="mt-2 text-sm text-slate-600">Go to the contact form for direct support, or return to the home page to retry registration.</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href="/contact" className="rounded-lg bg-[#062E22] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a4a37] transition">
                    Contact Support
                  </Link>
                  <Link href="/register" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 transition">
                    Register Again
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-left">
                <h2 className="text-lg font-bold text-[#062E22]">Common issues</h2>
                <ul className="mt-2 space-y-2 text-sm text-slate-600 list-disc list-inside">
                  <li>OTP email delay or spam filtering</li>
                  <li>404s from missing policy links</li>
                  <li>Browser cache after a new deployment</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-400">
        © 2026 Event-Sphere. All rights reserved.
      </footer>
    </div>
  );
}