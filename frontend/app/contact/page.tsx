'use client';

import { useState } from 'react';
import Link from 'next/link';
import SiteHeader from '../../components/SiteHeader';
import supportService from '../services/supportService';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await supportService.submit(formData);
      setIsSubmitted(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setError('Failed to send message. Please try again.');
      console.error('Failed to submit support request:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-[Inter,sans-serif] text-slate-900">
      <SiteHeader solid />

      {/* Main Content */}
      <main className="pt-24 pb-20">
        <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 mt-10">
          <div className="text-center">
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
                    <label htmlFor="subject" className="block text-sm font-semibold text-slate-700">Subject</label>
                    <input
                      type="text"
                      id="subject"
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20"
                      placeholder="e.g. Permit Approval Inquiry"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-semibold text-slate-700">Message</label>
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

                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{error}</p>
                  )}
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
