'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getRole, isLoggedIn, logout } from '../lib/auth';
import SiteHeader from '../../components/SiteHeader';
import faqService from '../services/faqService';
import { AiFaqItem } from '../types/ai';

export default function FaqPage() {
  const [faqs, setFaqs] = useState<AiFaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [askQuestion, setAskQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setLoggedIn(isLoggedIn());
    setRole(getRole());
  }, []);

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const data = await faqService.getFaqs();
        setFaqs(data);
      } catch (error) {
        console.error('Failed to fetch FAQs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchFaqs();
  }, []);

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const handleSubmitQuestion = async () => {
    if (!askQuestion.trim()) return;
    setSubmitting(true);
    try {
      await faqService.askFaq(askQuestion.trim());
      setSubmitted(true);
      setAskQuestion('');
    } catch (error) {
      console.error('Failed to submit question:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setSubmitted(false);
    setAskQuestion('');
  };

  const filteredFaqs = faqs.filter((faq) => {
    const q = searchQuery.toLowerCase();
    return (
      faq.question.toLowerCase().includes(q) ||
      faq.answer.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
      <SiteHeader
        solid
        loggedIn={loggedIn}
        role={role}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onLogout={handleLogout}
      />

      <main className="pt-24 pb-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="text-center mt-10">
            <h1 className="text-4xl font-extrabold text-[#062E22]">Frequently Asked Questions</h1>
            <p className="mt-3 text-slate-500 max-w-lg mx-auto">
              Find answers to common questions about permits, bookings, and platform features.
            </p>
          </div>

          <div className="mt-10 flex items-center gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search questions or keywords..."
                className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20 shadow-sm"
              />
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="shrink-0 rounded-xl bg-[#062E22] px-5 py-3.5 text-sm font-bold text-white shadow-md hover:bg-[#0a4a37] transition"
            >
              Ask a Question
            </button>
          </div>

          <div className="mt-10 space-y-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#062E22] border-t-transparent" />
              </div>
            ) : filteredFaqs.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                <h3 className="text-lg font-bold text-[#062E22]">No matching FAQs found</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Try adjusting your search terms.
                </p>
              </div>
            ) : (
              filteredFaqs.map((faq, index) => (
                <div key={index} className="border-b border-slate-200 pb-6">
                  <h3 className="text-base font-bold text-slate-800">{faq.question}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{faq.answer}</p>
                </div>
              ))
            )}
          </div>

          
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-400">
        © 2026 Global Connect Ethiopia. All rights reserved.
      </footer>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl">
            {submitted ? (
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-800">Question Submitted</h3>
                <p className="mt-2 text-sm text-slate-500">Your question has been received. We will get back to you soon.</p>
                <button
                  onClick={closeModal}
                  className="mt-6 rounded-xl bg-[#062E22] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#0a4a37] transition"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-800">Ask a Question</h3>
                  <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <textarea
                  value={askQuestion}
                  onChange={(e) => setAskQuestion(e.target.value)}
                  placeholder="Type your question here..."
                  rows={4}
                  className="mt-4 w-full rounded-xl border border-slate-200 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20 resize-none"
                />
                <div className="mt-4 flex justify-end gap-3">
                  <button
                    onClick={closeModal}
                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitQuestion}
                    disabled={submitting || !askQuestion.trim()}
                    className="rounded-xl bg-[#062E22] px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[#0a4a37] transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
