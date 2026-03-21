'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { api } from '@/app/lib/api';

interface Proposal {
  id: string;
  title: string;
  description?: string;
  event_type?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  expected_attendees?: number;
  budget_estimate?: number;
  status: string;
  organizer_id: string;
  created_at: string;
  updated_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string; dot: string }> = {
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  submitted: { label: 'Submitted', cls: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400' },
  ministry_review: { label: 'Ministry Review', cls: 'bg-blue-100 text-blue-700', dot: 'bg-blue-400' },
  ministry_approved: { label: 'Ministry Approved', cls: 'bg-teal-100 text-teal-700', dot: 'bg-teal-400' },
  municipal_review: { label: 'Municipal Review', cls: 'bg-purple-100 text-purple-700', dot: 'bg-purple-400' },
  approved: { label: 'Approved ✓', cls: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-600', dot: 'bg-red-500' },
  changes_requested: { label: 'Changes Requested', cls: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400' },
};

const TIMELINE_STEPS = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'ministry_review', label: 'Ministry Review' },
  { key: 'ministry_approved', label: 'Ministry Approved' },
  { key: 'municipal_review', label: 'Municipal Review' },
  { key: 'approved', label: 'Final Approved' },
];

export default function ProposalDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.get<Proposal>(`/proposals/${id}`).then(setProposal).catch(() => setError('Proposal not found')).finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const updated = await api.post<Proposal>(`/proposals/${id}/submit`);
      setProposal(updated);
      setSuccess('Proposal submitted for review!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const canEdit = proposal && ['draft', 'changes_requested'].includes(proposal.status);
  const canSubmit = proposal && ['draft', 'changes_requested'].includes(proposal.status);
  const isApproved = proposal?.status === 'approved';

  const currentStepIndex = TIMELINE_STEPS.findIndex(s => s.key === proposal?.status);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="organizer" />
      <DashboardHeader />
      <main className="ml-60 pt-16 p-8">
        {loading ? (
          <div className="flex justify-center pt-20"><div className="w-10 h-10 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" /></div>
        ) : !proposal ? (
          <div className="text-center pt-20 text-slate-500">Proposal not found.</div>
        ) : (
          <div className="max-w-5xl mx-auto animate-fade-in">
            {/* Breadcrumb + status */}
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
              <Link href="/organizer/proposals" className="hover:text-[#062E22]">Proposals</Link>
              <span>/</span>
              <span className="text-slate-600">{proposal.title}</span>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  {(() => {
                    const cfg = STATUS_CONFIG[proposal.status] || { label: proposal.status, cls: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' };
                    return (
                      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}></span>
                        {cfg.label}
                      </span>
                    );
                  })()}
                </div>
                <h1 className="text-2xl font-bold text-[#062E22]">{proposal.title}</h1>
              </div>
              <div className="flex gap-2 flex-wrap">
                {canEdit && (
                  <Link href={`/organizer/proposals/${id}/edit`}
                    className="px-4 py-2 border border-slate-200 text-sm font-medium rounded-lg hover:bg-slate-100 transition text-slate-700">
                    Edit
                  </Link>
                )}
                {canSubmit && (
                  <button onClick={handleSubmit} disabled={submitting}
                    className="px-4 py-2 bg-[#062E22] text-white text-sm font-semibold rounded-lg hover:bg-[#0a4a37] transition disabled:opacity-50 flex items-center gap-2">
                    {submitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    Submit for Review
                  </button>
                )}
                {isApproved && (
                  <Link href={`/organizer/proposals/${id}/permit`}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    View Permit
                  </Link>
                )}
              </div>
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}
            {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{success}</div>}

            <div className="grid grid-cols-3 gap-6">
              {/* Main content */}
              <div className="col-span-2 space-y-6">
                {/* Event Info */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Event Info
                  </div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Official Name</p>
                  <h2 className="text-xl font-bold text-[#062E22] mb-4">{proposal.title}</h2>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Type</p>
                      <p className="text-sm font-medium text-slate-800">{proposal.event_type || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Location</p>
                      <p className="text-sm font-medium text-slate-800">{proposal.location || '—'}</p>
                    </div>
                  </div>

                  {proposal.description && (
                    <div className="mb-4">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Description</p>
                      <p className="text-sm text-slate-600 leading-relaxed">{proposal.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-xl p-4">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Start Date</p>
                      <p className="text-sm font-bold text-[#062E22]">{proposal.start_date ? new Date(proposal.start_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">End Date</p>
                      <p className="text-sm font-bold text-[#062E22]">{proposal.end_date ? new Date(proposal.end_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</p>
                    </div>
                  </div>
                </div>

                {/* Program Details */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Program Details
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Expected Attendees</p>
                      <p className="text-sm font-medium text-slate-800">{proposal.expected_attendees?.toLocaleString() || '—'}</p>
                    </div>
                    <div className="flex-1 bg-[#062E22] rounded-xl p-4 text-white">
                      <p className="text-[10px] font-semibold text-white/60 uppercase tracking-widest mb-1">Budget Estimate</p>
                      <p className="text-xl font-bold">{proposal.budget_estimate?.toLocaleString() || '—'}</p>
                      <p className="text-xs text-white/60 mt-0.5">ETB</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Proposal ID */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Proposal ID</p>
                  <p className="text-xs font-mono text-slate-600 break-all">{proposal.id}</p>
                </div>

                {/* Review Timeline */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-4">Review Timeline</p>
                  <div className="space-y-3">
                    {TIMELINE_STEPS.map((step, i) => {
                      const isDone = i <= currentStepIndex;
                      const isCurrent = i === currentStepIndex;
                      return (
                        <div key={step.key} className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-[#062E22]' : 'bg-slate-200'}`}>
                            {isDone ? (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                            ) : (
                              <div className="w-2 h-2 rounded-full bg-slate-400" />
                            )}
                          </div>
                          <div>
                            <p className={`text-xs font-medium ${isDone ? 'text-[#062E22]' : 'text-slate-400'}`}>{step.label}</p>
                            {isCurrent && <p className="text-[10px] text-slate-400">Current stage</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
