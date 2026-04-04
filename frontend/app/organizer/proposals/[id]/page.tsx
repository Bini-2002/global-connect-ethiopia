'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { api } from '@/app/lib/api';
import {
  formatProposalStage,
  getOfficeLabel,
  proposalToSessionData,
  PROPOSAL_STATUS_META,
} from '@/app/lib/proposals';
import { ProposalRecord } from '@/app/types/proposal';

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
  const [proposal, setProposal] = useState<ProposalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.get<ProposalRecord>(`/proposals/${id}`).then(setProposal).catch(() => setError('Proposal not found')).finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const updated = await api.post<ProposalRecord>(`/proposals/${id}/submit`);
      setProposal(updated);
      setSuccess('Proposal submitted for review!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = () => {
    if (!proposal) return;
    localStorage.setItem('pendingProposal', JSON.stringify(proposalToSessionData(proposal)));
    router.push('/organizer/proposals/create');
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
                    const cfg = PROPOSAL_STATUS_META[proposal.status] || { label: proposal.status, cls: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' };
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
                  <button
                    onClick={handleEdit}
                    className="px-4 py-2 border border-slate-200 text-sm font-medium rounded-lg hover:bg-slate-100 transition text-slate-700">
                    Edit
                  </button>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Expected Attendees</p>
                        <p className="text-sm font-medium text-slate-800">{proposal.expected_attendees?.toLocaleString() || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Program Overview</p>
                        <p className="text-sm text-slate-600 leading-relaxed">{proposal.program_overview || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Event Objectives</p>
                        <p className="text-sm text-slate-600 leading-relaxed">{proposal.event_objectives || '—'}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-[#062E22] rounded-xl p-4 text-white">
                        <p className="text-[10px] font-semibold text-white/60 uppercase tracking-widest mb-1">Budget Estimate</p>
                        <p className="text-xl font-bold">{proposal.budget_estimate?.toLocaleString() || '—'}</p>
                        <p className="text-xs text-white/60 mt-0.5">ETB</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Target Audience</p>
                        <div className="flex flex-wrap gap-2">
                          {(proposal.target_audience || []).map((audience) => (
                            <span key={audience} className="px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-xs font-medium text-green-700">
                              {audience}
                            </span>
                          ))}
                          {!proposal.target_audience?.length && <span className="text-sm text-slate-500">—</span>}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Security Level</p>
                          <p className="text-sm font-medium text-slate-800">{proposal.security_level || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Personnel Count</p>
                          <p className="text-sm font-medium text-slate-800">{proposal.personnel_count || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A2 2 0 013 15.382V5.618a2 2 0 011.553-1.894l4-1A2 2 0 019 2.764m0 17.236l6-2m-6 2V2.764m6 15.236l5.447-2.724A2 2 0 0021 13.382V3.618a2 2 0 00-1.553-1.894l-4-1A2 2 0 0015 0.764m0 17.236V0.764m0 0L9 2.764" /></svg>
                    Review Routing
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Ministry</p>
                      <p className="font-semibold text-[#062E22]">{getOfficeLabel(proposal.office_assignments?.ministry)}</p>
                      <p className="text-xs text-slate-500 mt-2">{proposal.office_assignments?.ministry?.email || 'No ministry office assigned'}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Municipal</p>
                      <p className="font-semibold text-[#062E22]">{getOfficeLabel(proposal.office_assignments?.municipal)}</p>
                      <p className="text-xs text-slate-500 mt-2">{proposal.office_assignments?.municipal?.email || 'No municipal office assigned'}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Police</p>
                      <p className="font-semibold text-[#062E22]">{getOfficeLabel(proposal.office_assignments?.police)}</p>
                      <p className="text-xs text-slate-500 mt-2">{proposal.office_assignments?.police?.email || 'No police office assigned'}</p>
                    </div>
                  </div>
                </div>

                {(proposal.organizer_updates?.length || 0) > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h6m-6 4h10M5 3h14a2 2 0 012 2v14l-4-3-4 3-4-3-4 3V5a2 2 0 012-2z" /></svg>
                      Organizer Updates
                    </div>
                    <div className="space-y-3">
                      {[...(proposal.organizer_updates || [])]
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .map((update, index) => (
                          <div key={`${update.created_at}-${index}`} className="rounded-xl border border-slate-200 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-semibold text-[#062E22]">{update.office_name || formatProposalStage(update.stage)}</p>
                              <span className="text-xs text-slate-400">{new Date(update.created_at).toLocaleString()}</span>
                            </div>
                            <p className="text-sm text-slate-600 mt-2">{update.message}</p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Proposal ID */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Proposal ID</p>
                  <p className="text-xs font-mono text-slate-600 break-all">{proposal.id}</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Current Review Stage</p>
                  <p className="text-sm font-semibold text-[#062E22]">{formatProposalStage(proposal.status)}</p>
                  {proposal.review_stage && (
                    <p className="text-xs text-slate-500 mt-2">Backend stage: {proposal.review_stage}</p>
                  )}
                  {proposal.rejection_reason && (
                    <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                      {proposal.rejection_reason}
                    </div>
                  )}
                </div>

                {proposal.approval_certificate_number && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Approval Certificate</p>
                    <p className="text-lg font-bold text-[#062E22]">{proposal.approval_certificate_number}</p>
                    <p className="text-xs text-slate-500 mt-2">Issued after municipal approval.</p>
                    <Link href={`/organizer/proposals/${id}/permit`} className="inline-flex mt-4 text-sm font-semibold text-green-700 hover:underline">
                      Open approval certificate
                    </Link>
                  </div>
                )}

                {proposal.security_assignment && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Security Assignment</p>
                    <p className="text-sm font-semibold text-[#062E22]">{proposal.security_assignment.office_name}</p>
                    <p className="text-sm text-slate-600 mt-2">{proposal.security_assignment.message}</p>
                  </div>
                )}

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
