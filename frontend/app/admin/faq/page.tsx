'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { getRole, getToken } from '@/app/lib/auth';
import faqService from '@/app/services/faqService';
import { FaqQuestion } from '@/app/types/ai';

export default function AdminFaqPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<FaqQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [answeringId, setAnsweringId] = useState<string | null>(null);
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

    fetchQuestions();
  }, [router]);

  const fetchQuestions = async () => {
    try {
      const data = await faqService.getFaqQuestions();
      setQuestions(data);
    } catch (err) {
      console.error('Failed to fetch questions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (questionId: string) => {
    if (!answerText.trim()) return;
    setSubmitting(true);
    try {
      await faqService.answerFaqQuestion(questionId, answerText.trim());
      setQuestions((prev) => prev.filter((q) => q.id !== questionId));
      setAnsweringId(null);
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
    <div className="flex h-screen bg-slate-50">
      <Sidebar role="admin" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">User Questions</h2>
                <p className="text-sm text-slate-500 mt-1">Review and respond to questions submitted by users.</p>
              </div>
              <button
                onClick={fetchQuestions}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#062E22] border-t-transparent" />
              </div>
            ) : questions.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-800">No questions yet</h3>
                <p className="mt-1 text-sm text-slate-500">User-submitted questions will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((q) => (
                  <div key={q.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            q.status === 'answered'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {q.status}
                          </span>
                          <span className="text-xs text-slate-400">{formatDate(q.created_at)}</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-800">{q.question}</p>
                      </div>
                    </div>

                    {answeringId === q.id ? (
                      <div className="mt-4">
                        <textarea
                          value={answerText}
                          onChange={(e) => setAnswerText(e.target.value)}
                          placeholder="Type your answer..."
                          rows={3}
                          className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20 resize-none"
                        />
                        <div className="mt-3 flex justify-end gap-2">
                          <button
                            onClick={() => { setAnsweringId(null); setAnswerText(''); }}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleAnswer(q.id)}
                            disabled={submitting || !answerText.trim()}
                            className="rounded-xl bg-[#062E22] px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-[#0a4a37] transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {submitting ? 'Publishing...' : 'Publish Answer'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAnsweringId(q.id)}
                        className="mt-4 rounded-xl border border-[#062E22]/20 bg-[#062E22]/5 px-4 py-2 text-sm font-semibold text-[#062E22] hover:bg-[#062E22]/10 transition"
                      >
                        Answer This Question
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
