'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import aiService from '@/app/services/aiService';
import { AiFaqItem } from '@/app/types/ai';

const CATEGORIES = ['All', 'Licensing', 'Booking', 'Portals', 'Support'];

export default function FaqPage() {
  const [faqs, setFaqs] = useState<AiFaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const data = await aiService.getFaq();
        setFaqs(data);
      } catch (error) {
        console.error('Failed to fetch FAQs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchFaqs();
  }, []);

  const getFaqCategory = (faq: AiFaqItem): string => {
    const q = faq.question.toLowerCase();
    const a = faq.answer.toLowerCase();
    if (q.includes('permit') || q.includes('licens') || q.includes('approv') || q.includes('ministry')) {
      return 'Licensing';
    }
    if (q.includes('book') || q.includes('ticket') || q.includes('qr') || q.includes('seat')) {
      return 'Booking';
    }
    if (q.includes('vendor') || q.includes('portal') || q.includes('dashboard') || q.includes('account')) {
      return 'Portals';
    }
    return 'Support';
  };

  const filteredFaqs = faqs.filter((faq) => {
    const categoryMatches = activeCategory === 'All' || getFaqCategory(faq) === activeCategory;
    const searchMatches =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return categoryMatches && searchMatches;
  });

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mt-10">
            <span className="inline-block rounded-full bg-[#062E22]/10 px-3 py-1 text-xs font-semibold tracking-wide text-[#062E22] uppercase">
              Support Center
            </span>
            <h1 className="mt-4 text-4xl font-extrabold text-[#062E22]">Frequently Asked Questions</h1>
            <p className="mt-3 text-slate-500 max-w-lg mx-auto">
              Find instant advisory answers regarding permits, regulations, vendor negotiations, and QR bookings.
            </p>
          </div>

          {/* Search Bar */}
          <div className="mt-10 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by keywords (e.g. 'permit', 'booking', 'vendor')..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20 shadow-sm"
            />
          </div>

          {/* Category Tabs */}
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => {
                  setActiveCategory(category);
                  setExpandedIndex(null);
                }}
                className={`rounded-full px-5 py-1.5 text-xs font-bold transition duration-200 ${
                  activeCategory === category
                    ? 'bg-[#062E22] text-white shadow-md'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Accordion Questions */}
          <div className="mt-10">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#062E22] border-t-transparent" />
              </div>
            ) : filteredFaqs.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                <h3 className="text-lg font-bold text-[#062E22]">No matching FAQs found</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Try adjusting your search terms or select a different category filter.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredFaqs.map((faq, index) => {
                  const isExpanded = expandedIndex === index;
                  const cat = getFaqCategory(faq);
                  return (
                    <div
                      key={index}
                      className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all duration-300"
                    >
                      <button
                        onClick={() => toggleExpand(index)}
                        className="w-full text-left p-6 flex items-start justify-between gap-4 focus:outline-none"
                      >
                        <div>
                          <span className="inline-block rounded-full bg-[#062E22]/5 px-2.5 py-0.5 text-[10px] font-bold text-[#062E22] uppercase tracking-wider mb-2">
                            {cat}
                          </span>
                          <h3 className="text-base font-bold text-slate-800 leading-tight">
                            {faq.question}
                          </h3>
                        </div>
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-transform duration-300 ${
                          isExpanded ? 'rotate-180 bg-[#062E22] text-white' : ''
                        }`}>
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                          </svg>
                        </span>
                      </button>
                      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                        isExpanded ? 'max-h-[300px] border-t border-slate-100' : 'max-h-0'
                      }`}>
                        <div className="p-6 bg-slate-50/50 text-sm text-slate-600 leading-relaxed">
                          {faq.answer}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Help Callout */}
          <div className="mt-12 rounded-2xl bg-[#062E22]/5 border border-[#062E22]/10 p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-lg font-bold text-[#062E22]">Still need official guidance?</h3>
              <p className="mt-1 text-sm text-slate-600 leading-relaxed max-w-md">
                If you are looking for specific legal permits, municipal licenses, or custom technical assistance, submit a query directly.
              </p>
            </div>
            <Link
              href="/contact"
              className="shrink-0 rounded-xl bg-[#062E22] px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-[#0a4a37] transition"
            >
              Contact Ministry Official
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-400">
        © 2026 Global Connect Ethiopia. All rights reserved.
      </footer>
    </div>
  );
}

