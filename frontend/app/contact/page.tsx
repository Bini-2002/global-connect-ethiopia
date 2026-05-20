'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: 'general',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    // Mock API request
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setFormData({ name: '', email: '', department: 'general', message: '' });
    }, 1200);
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
        <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 mt-10">
          <div className="text-center">
            <span className="inline-block rounded-full bg-[#062E22]/10 px-3 py-1 text-xs font-semibold tracking-wide text-[#062E22] uppercase">
              Get in Touch
            </span>
            <h1 className="mt-4 text-4xl font-extrabold text-[#062E22]">Contact Our Support</h1>
            <p className="mx-auto mt-4 max-w-lg text-slate-500">
              Have questions about permit approvals, vendor verification, or attendee tickets? Our dedicated ministry support is here to help.
            </p>
          </div>

          <div className="mt-16 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            {/* Form */}
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              {isSubmitted ? (
                <div className="text-center py-10">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="mt-6 text-2xl font-bold text-[#062E22]">Message Sent Successfully!</h3>
                  <p className="mt-3 text-slate-500">
                    Thank you for reaching out. A ministry coordinator or support specialist will respond to your inquiry via email shortly.
                  </p>
                  <button
                    onClick={() => setIsSubmitted(false)}
                    className="mt-6 rounded-xl bg-[#062E22] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#0a4a37] transition"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="name" className="block text-sm font-semibold text-slate-700">Full Name</label>
                      <input
                        type="text"
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20"
                        placeholder="e.g. Abebe Kebede"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-semibold text-slate-700">Email Address</label>
                      <input
                        type="email"
                        id="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20"
                        placeholder="abebe@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="department" className="block text-sm font-semibold text-slate-700">Relevant Department</label>
                    <select
                      id="department"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20 text-slate-700"
                    >
                      <option value="general">General Support / FAQ Inquiry</option>
                      <option value="licensing">Event Approval & Licensing Permits</option>
                      <option value="vendors">Vendor Verification Support</option>
                      <option value="tickets">Attendee Ticket & QR Inquiries</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-semibold text-slate-700">Inquiry Message</label>
                    <textarea
                      id="message"
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20 resize-none"
                      placeholder="Describe your request in detail..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-xl bg-[#062E22] py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[#0a4a37] disabled:opacity-55"
                  >
                    {isSubmitting ? 'Sending inquiry...' : 'Submit Support Request'}
                  </button>
                </form>
              )}
            </div>

            {/* Office Info */}
            <div className="flex flex-col gap-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-[#062E22]">Ministry Headquarters</h3>
                <p className="mt-3 text-sm text-slate-500 leading-relaxed">
                  Ministry of Innovation and Technology (MInT) building,<br />
                  Addis Ababa, Ethiopia
                </p>
                <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-600 space-y-2">
                  <p className="flex items-center gap-2">
                    <span className="font-semibold text-[#062E22]">Tel:</span> +251 11 126 5737
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="font-semibold text-[#062E22]">Hours:</span> Mon - Fri, 8:30 AM - 5:30 PM
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-[#062E22]/5 border border-[#062E22]/10 p-6">
                <h3 className="text-lg font-bold text-[#062E22]">AI Support Agent</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Don't want to wait? Use our **AI Licensing Assistant** instantly on the homepage for standard regulatory permit inquiries.
                </p>
                <Link
                  href="/#discover-events"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#062E22] hover:underline"
                >
                  Ask AI Assistant
                  <span className="text-xs">→</span>
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
