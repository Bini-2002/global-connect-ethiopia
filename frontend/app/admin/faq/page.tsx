'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { getRole, getToken } from '@/app/lib/auth';
import faqService from '@/app/services/faqService';
import { AiFaqItem, FaqQuestion } from '@/app/types/ai';

export default function AdminFaqPage() {
  const router = useRouter();
  const [faqs, setFaqs] = useState<AiFaqItem[]>([]);
  const [pending, setPending] = useState<FaqQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPending, setSelectedPending] = useState<FaqQuestion | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = getToken();
    const role = getRole();

    if (!token || (role !== 'admin' && role !== 'super_admin')) {
      setLoading(false);
      router.replace('/login');
      return;
    }

    fetchAll();
  }, [router]);

  const fetchAll = async () => {
    try {
      const [faqData, questionData] = await Promise.all([
        faqService.getFaqs(),
        faqService.getFaqQuestions(),
      ]);
      setFaqs(faqData);
      setPending(questionData.filter((q) => q.status === 'pending'));
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async () => {
    if (!selectedPending || !answerText.trim()) return;
    setSubmitting(true);
    try {
      await faqService.answerFaqQuestion(selectedPending.id, answerText.trim());
      await fetchAll();
      setSelectedPending(null);
      setAnswerText('');
    } catch (err) {
      console.error('Failed to answer question:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="admin" />
      <DashboardHeader />

      <main className="ml-60 pt-16 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#062E22]">FAQ Management</h1>
          <p className="text-slate-500 text-sm mt-1">Manage published FAQs and answer user questions.</p>
        </div>

        <div className="flex gap-6" style={{ height: 'calc(100vh - 8rem)' }}>
          {/* Left - Published FAQs */}
          <div className="w-1/2 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-bold text-slate-800">Published FAQs</h2>
                <span className="px-2.5 py-0.5 bg-[#062E22]/10 text-[#062E22] text-xs font-semibold rounded-full">{faqs.length}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="flex justify-center py-16">
                  <div className="w-8 h-8 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : faqs.length === 0 ? (
                <div className="py-16 text-center">
                  <span className="text-4xl">📖</span>
                  <p className="text-slate-500 mt-3 text-sm">No published FAQs yet.</p>
                </div>
              ) : (
                faqs.map((faq, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 p-4">
                    <p className="text-sm font-bold text-slate-800 mb-2">{faq.question}</p>
                    <p className="text-xs text-slate-600 leading-relaxed">{faq.answer}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right - Pending Questions */}
          <div className="w-1/2 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-bold text-slate-800">Unanswered Questions</h2>
                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">{pending.length}</span>
              </div>
              <button
                onClick={fetchAll}
                className="text-xs border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-[#062E22] hover:text-white hover:border-[#062E22] transition font-medium text-slate-600"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : pending.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center py-16">
                  <span className="text-4xl">✅</span>
                  <p className="text-slate-500 mt-3 text-sm">All questions answered!</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex overflow-hidden">
                {/* Question list */}
                <div className="w-1/2 overflow-y-auto p-4 space-y-2 border-r border-slate-100">
                  {pending.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => { setSelectedPending(q); setAnswerText(''); }}
                      className={`w-full text-left rounded-xl border p-3 transition ${
                        selectedPending?.id === q.id
                          ? 'border-[#062E22] bg-[#062E22]/5'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <p className="text-xs text-slate-400 mb-1">{formatDate(q.created_at)}</p>
                      <p className="text-sm font-semibold text-slate-800 line-clamp-2">{q.question}</p>
                    </button>
                  ))}
                </div>

                {/* Answer form */}
                <div className="w-1/2 p-4 flex flex-col overflow-y-auto">
                  {!selectedPending ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <span className="text-3xl">👆</span>
                        <p className="text-slate-400 text-xs mt-2">Select a question</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-bold text-slate-800 mb-4 line-clamp-3">{selectedPending.question}</p>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Your Answer</label>
                      <textarea
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        placeholder="Type your answer..."
                        rows={8}
                        className="w-full flex-1 rounded-xl border border-slate-200 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20 resize-none"
                      />
                      <button
                        onClick={handleAnswer}
                        disabled={submitting || !answerText.trim()}
                        className="mt-4 w-full rounded-xl bg-[#062E22] py-2.5 text-sm font-bold text-white shadow-md hover:bg-[#0a4a37] transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? 'Publishing...' : 'Publish Answer'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
