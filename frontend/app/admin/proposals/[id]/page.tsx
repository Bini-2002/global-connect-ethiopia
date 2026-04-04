'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { api } from '@/app/lib/api';
import { getRole, getToken } from '@/app/lib/auth';

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
  security_plan?: string;
  security_personnel_count?: number;
  target_audience?: string[];
  organizer_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const TIMELINE_STEPS = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'ministry_review', label: 'Ministry Review' },
  { key: 'ministry_approved', label: 'Ministry Approved' },
  { key: 'municipal_review', label: 'Municipal Review' },
  { key: 'approved', label: 'Final Decision' },
];

export default function AdminProposalDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [changeNote, setChangeNote] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showChangeModal, setShowChangeModal] = useState(false);

  useEffect(() => {
    const token = getToken();
    const role = getRole();

    if (!token || (role !== 'admin' && role !== 'super_admin')) {
      setLoading(false);
      router.replace('/login');
      return;
    }

    api.get<Proposal>(`/admin/proposals/${id}`)
      .then(setProposal)
      .catch((err) => {
        if (err instanceof Error && err.message === 'Not authenticated') {
          router.replace('/login');
          return;
        }
        setError('Proposal not found');
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  const doAction = async (action: string, body?: Record<string, string>) => {
    setActionLoading(action); setError(''); setSuccess('');
    try {
      if (action === 'accept') {
        await api.post(`/admin/proposals/${id}/accept`);
      } else if (action === 'reject') {
        await api.post(`/admin/proposals/${id}/reject`, { reason: body?.reason });
      } else if (action === 'request_change') {
        await api.post(`/admin/proposals/${id}/request-changes`, { notes: body?.notes });
      }
      setSuccess(`Action '${action}' applied successfully.`);
      const updated = await api.get<Proposal>(`/admin/proposals/${id}`);
      setProposal(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading('');
      setShowRejectModal(false);
      setShowChangeModal(false);
    }
  };

  const currentStepIndex = TIMELINE_STEPS.findIndex(s => s.key === proposal?.status);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="admin" />
      <DashboardHeader />
      <main className="ml-60 pt-16 p-8">
        {loading ? (
          <div className="flex justify-center pt-20"><div className="w-10 h-10 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" /></div>
        ) : !proposal ? (
          <div className="text-center pt-20 text-slate-500">Proposal not found.</div>
        ) : (
          <div className="max-w-6xl mx-auto animate-fade-in">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
              <Link href="/admin/proposals" className="hover:text-[#062E22]">Admin Review Queue</Link>
              <span>/</span>
              <span className="px-2 py-1 border border-slate-200 rounded text-slate-600 text-[10px] font-mono">PROP-{proposal.id.substring(0, 8).toUpperCase()}</span>
              <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-[10px] font-medium">{proposal.status}</span>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <h1 className="text-2xl font-bold text-[#062E22]">Review Proposal: {proposal.title}</h1>
              <div className="flex gap-2">
                <button onClick={() => setShowChangeModal(true)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition">
                  Request Change
                </button>
                <button onClick={() => setShowRejectModal(true)}
                  className="px-4 py-2 border border-red-300 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition">
                  Reject
                </button>
                <button onClick={() => doAction('accept')} disabled={actionLoading === 'accept'}
                  className="px-4 py-2 bg-[#062E22] text-white text-sm font-semibold rounded-lg hover:bg-[#0a4a37] transition disabled:opacity-50 flex items-center gap-2">
                  {actionLoading === 'accept' && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Accept
                </button>
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
                  <h2 className="text-xl font-bold text-[#062E22] mb-5">{proposal.title}</h2>
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
                    <div className="flex-1 space-y-3">
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Event Objectives</p>
                        <p className="text-sm text-slate-600">{proposal.description || '—'}</p>
                      </div>
                      {proposal.target_audience && proposal.target_audience.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Target Audience</p>
                          <div className="flex flex-wrap gap-2">
                            {proposal.target_audience.map(a => (
                              <span key={a} className="px-3 py-1 border border-slate-200 text-xs rounded-full text-slate-700">{a}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="w-44 bg-[#062E22] rounded-xl p-4 text-white flex-shrink-0">
                      <p className="text-[10px] font-semibold text-white/60 uppercase tracking-widest mb-1">Budget Estimate</p>
                      <p className="text-2xl font-bold">{proposal.budget_estimate?.toLocaleString() || '—'}</p>
                      <p className="text-xs text-white/60">ETB</p>
                      {proposal.security_plan && (
                        <>
                          <hr className="border-white/20 my-3" />
                          <p className="text-[10px] font-semibold text-white/60 uppercase tracking-widest mb-1">Security Plan</p>
                          <p className="text-sm font-medium">{proposal.security_plan}</p>
                          {proposal.security_personnel_count && <p className="text-xs text-white/60 mt-1">{proposal.security_personnel_count} Personnel Count</p>}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right sidebar */}
              <div className="space-y-6">
                {/* Requesting Entity */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Requesting Entity</p>
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                      <span className="text-xl">🏢</span>
                    </div>
                    <div>
                      <p className="font-semibold text-[#062E22] text-sm">Organizer</p>
                      <p className="text-xs text-slate-400 font-mono">{proposal.organizer_id.substring(0, 16)}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Contact Person</span>
                      <span className="font-semibold text-slate-700">Organizer</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Verification</span>
                      <span className="font-semibold text-green-600 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Verified</span>
                    </div>
                  </div>
                </div>

                {/* Review Timeline */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-4">Review Timeline</p>
                  <div className="space-y-3">
                    {TIMELINE_STEPS.map((step, i) => {
                      const isDone = i <= currentStepIndex;
                      const isCurrent = i === currentStepIndex;
                      return (
                        <div key={step.key} className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isDone ? 'bg-[#D97706]' : 'bg-slate-200'}`}>
                            {isDone && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                          </div>
                          <div>
                            <p className={`text-xs font-semibold ${isDone ? 'text-slate-800' : 'text-slate-400'}`}>{step.label}</p>
                            {isCurrent && <p className="text-[10px] text-slate-400">Current Stage</p>}
                            {!isDone && !isCurrent && <p className="text-[10px] text-slate-300">Awaiting Step {i + 1}</p>}
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

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl animate-scale-in">
            <h3 className="font-bold text-[#062E22] mb-4">Reject Proposal</h3>
            <textarea placeholder="Reason for rejection..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-200 resize-none mb-4 text-slate-800" />
            <div className="flex gap-3">
              <button onClick={() => setShowRejectModal(false)} className="flex-1 py-2 border border-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition">Cancel</button>
              <button onClick={() => doAction('reject', { reason: rejectReason })} disabled={!rejectReason}
                className="flex-1 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition disabled:opacity-50">Confirm Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* Request Change Modal */}
      {showChangeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl animate-scale-in">
            <h3 className="font-bold text-[#062E22] mb-4">Request Changes</h3>
            <textarea placeholder="Describe the required changes..." value={changeNote} onChange={e => setChangeNote(e.target.value)} rows={3}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-200 resize-none mb-4 text-slate-800" />
            <div className="flex gap-3">
              <button onClick={() => setShowChangeModal(false)} className="flex-1 py-2 border border-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition">Cancel</button>
              <button onClick={() => doAction('request_change', { notes: changeNote })} disabled={!changeNote}
                className="flex-1 py-2 bg-[#062E22] text-white text-sm font-semibold rounded-lg hover:bg-[#0a4a37] transition disabled:opacity-50">Send Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
