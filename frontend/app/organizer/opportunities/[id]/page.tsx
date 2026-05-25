'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  MapPin,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  MessageSquare,
  LayoutGrid,
  List,
} from 'lucide-react';
import Image from 'next/image';
import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import {
  OpportunityRecord,
  OpportunityProposalRecord,
  OpportunityProposalStatus,
  OpportunitySourcingMode,
} from '@/app/types/opportunity';
import { EventBookingRecord } from '@/app/types/event';
import opportunitiesService from '@/app/services/opportunitiesService';
import eventsService from '@/app/services/eventsService';

const STATUS_LABELS: Record<OpportunityProposalStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  client_countered: 'Countered',
  vendor_countered: 'Vendor Countered',
  selected: 'Selected',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  expired: 'Expired',
  converted: 'Converted',
};

const STATUS_STYLES: Record<OpportunityProposalStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  submitted: 'bg-blue-100 text-blue-700',
  client_countered: 'bg-yellow-100 text-yellow-700',
  vendor_countered: 'bg-orange-100 text-orange-700',
  selected: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  withdrawn: 'bg-gray-100 text-gray-500',
  expired: 'bg-gray-100 text-gray-500',
  converted: 'bg-purple-100 text-purple-700',
};

const SOURCE_MODE_LABELS: Record<OpportunitySourcingMode, string> = {
  open_bid: 'Open Bidding',
  invite_only: 'Direct Invite',
  hybrid: 'Hybrid',
};

function formatCurrency(amount: number | null | undefined, currency: string = 'ETB'): string {
  if (!amount) return '-';
  return `${currency} ${amount.toLocaleString()}`;
}

export default function OrganizerOpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const opportunityId = params.id as string;

  const [opportunity, setOpportunity] = useState<OpportunityRecord | null>(null);
  const [proposals, setProposals] = useState<OpportunityProposalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedProposals, setSelectedProposals] = useState<Set<string>>(new Set());
  const [actedProposals, setActedProposals] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(`acted_proposals_${opportunityId}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    }
    return new Set();
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showCounterModal, setShowCounterModal] = useState<string | null>(null);
  const [counterAmount, setCounterAmount] = useState('');
  const [dismissedError, setDismissedError] = useState(false);

  const [attendees, setAttendees] = useState<EventBookingRecord[]>([]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [oppData, proposalsData] = await Promise.all([
        opportunitiesService.getOpportunity(opportunityId),
        opportunitiesService.listProposals(opportunityId),
      ]);
      setOpportunity(oppData);
      setProposals(proposalsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load opportunity');
    } finally {
      setLoading(false);
    }
  }, [opportunityId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    sessionStorage.setItem(`acted_proposals_${opportunityId}`, JSON.stringify([...actedProposals]));
  }, [actedProposals, opportunityId]);

  useEffect(() => {
    if (opportunity?.event_id) {
      setAttendeesLoading(true);
      eventsService.getMyBookings(opportunity.event_id)
        .then(setAttendees)
        .catch(() => setAttendees([]))
        .finally(() => setAttendeesLoading(false));
    } else {
      setAttendees([]);
    }
  }, [opportunity?.event_id]);

  const handlePublish = async () => {
    try {
      setActionLoading('publish');
      const updated = await opportunitiesService.publishOpportunity(opportunityId);
      setOpportunity(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setActionLoading(null);
    }
  };

  const handleClose = async () => {
    try {
      setActionLoading('close');
      const updated = await opportunitiesService.closeOpportunity(opportunityId);
      setOpportunity(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAccept = async (proposalId: string) => {
    try {
      setActionLoading(proposalId);
      await opportunitiesService.acceptProposal(opportunityId, proposalId);
      setActedProposals((prev) => new Set(prev).add(proposalId));
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept proposal');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (proposalId: string) => {
    try {
      setActionLoading(proposalId);
      await opportunitiesService.rejectProposal(opportunityId, proposalId, { reason: rejectReason });
      setShowRejectModal(null);
      setRejectReason('');
      setActedProposals((prev) => new Set(prev).add(proposalId));
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject proposal');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCounter = async (proposalId: string) => {
    try {
      setActionLoading(proposalId);
      await opportunitiesService.counterProposal(opportunityId, proposalId, {
        amount: parseFloat(counterAmount),
      });
      setShowCounterModal(null);
      setCounterAmount('');
      setActedProposals((prev) => new Set(prev).add(proposalId));
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to counter proposal');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleProposalSelection = (proposalId: string) => {
    const newSet = new Set(selectedProposals);
    if (newSet.has(proposalId)) {
      newSet.delete(proposalId);
    } else {
      newSet.add(proposalId);
    }
    setSelectedProposals(newSet);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Sidebar role="organizer" />
        <div className="flex justify-center py-20 pt-16 md:ml-60">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#062E22] border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error && !opportunity) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Sidebar role="organizer" />
        <main className="pt-16 md:ml-60 p-6">
          <div className="mx-auto max-w-6xl">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          </div>
        </main>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Sidebar role="organizer" />
        <main className="pt-16 md:ml-60 p-6">
          <div className="mx-auto max-w-6xl">
            <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-10 text-center">
              <h2 className="text-2xl font-bold text-[#062E22]">Opportunity not found</h2>
              <Link href="/organizer/opportunities" className="mt-4 text-[#062E22] hover:underline">
                Back to Opportunities
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const canReview = ['submitted', 'client_countered', 'vendor_countered'].includes(
    opportunity.status
  );

  return (
    <div className="min-h-screen ">
                  <div className="fixed top-6 md:left-60 left-0 -z-10 pointer-events-none">
                    <Image
                      src="/Ellipse2.png"
                      alt=""
                      width={200}
                      height={400}
                      className="opacity-80"
                    />
                  </div>
                  <div className="fixed bottom-6  right-0 -z-10 pointer-events-none">
                    <Image
                      src="/Ellipse3.png"
                      alt=""
                      width={200}
                      height={400}
                      className="opacity-80"
                    />
                  </div>
      <Sidebar role="organizer" />
      <DashboardHeader
        searchPlaceholder="Opportunity details"
        actionHref="/organizer/opportunities"
        actionLabel="Back to Opportunities"
      />

      <main className="pt-16 md:ml-60 p-6">
        {error && !dismissedError && (
          <div className="mx-auto max-w-7xl mb-6">
            <div className="flex items-start justify-between rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <span>{error}</span>
              <button onClick={() => { setDismissedError(true); setError(null); }} className="ml-4 text-red-500 hover:text-red-700 shrink-0">
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
        <div className="mx-auto max-w-7xl space-y-6">
          <Link
            href="/organizer/opportunities"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#062E22] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Opportunities
          </Link>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="space-y-6">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl font-bold text-[#062E22]">{opportunity.title}</h1>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          opportunity.status === 'draft'
                            ? 'bg-slate-100 text-slate-600'
                            : opportunity.status === 'published'
                            ? 'bg-green-100 text-green-700'
                            : opportunity.status === 'awarded'
                            ? 'bg-blue-100 text-blue-700'
                            : opportunity.status === 'contracted'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {opportunity.status.charAt(0).toUpperCase() +
                          opportunity.status.slice(1)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{opportunity.description}</p>
                  </div>
                  {opportunity.status === 'draft' && (
                    <button
                      onClick={handlePublish}
                      disabled={actionLoading === 'publish'}
                      className="rounded-xl bg-[#062E22] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0a4a37] disabled:opacity-60"
                    >
                      {actionLoading === 'publish' ? 'Publishing...' : 'Publish Opportunity'}
                    </button>
                  )}
                  {opportunity.status === 'published' && (
                    <button
                      onClick={handleClose}
                      disabled={actionLoading === 'close'}
                      className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
                    >
                      {actionLoading === 'close' ? 'Closing...' : 'Close Opportunity'}
                    </button>
                  )}
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-[24px] bg-[#F5FBF8] p-5">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      Sourcing Mode
                    </p>
                    <p className="mt-2 text-lg font-bold text-[#062E22]">
                      {SOURCE_MODE_LABELS[opportunity.sourcing_mode] ||
                        opportunity.sourcing_mode}
                    </p>
                  </div>
                  <div className="rounded-[24px] bg-[#F5FBF8] p-5">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      Category
                    </p>
                    <p className="mt-2 text-lg font-bold text-[#062E22] capitalize">
                      {opportunity.category || 'General'}
                    </p>
                  </div>
                  {(opportunity.budget_min || opportunity.budget_max) && (
                    <>
                      <div className="rounded-[24px] bg-[#F5FBF8] p-5">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                          Budget Range
                        </p>
                        <p className="mt-2 text-lg font-bold text-[#062E22]">
                          {formatCurrency(opportunity.budget_min)}
                          {opportunity.budget_min && opportunity.budget_max && ' - '}
                          {formatCurrency(opportunity.budget_max)}
                        </p>
                      </div>
                      <div className="rounded-[24px] bg-[#F5FBF8] p-5">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                          Proposals
                        </p>
                        <p className="mt-2 text-lg font-bold text-[#062E22]">
                          {opportunity.proposal_count}
                        </p>
                      </div>
                    </>
                  )}
                  {opportunity.submission_deadline && (
                    <div className="rounded-[24px] bg-[#F5FBF8] p-5">
                      <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                        <Clock className="h-3 w-3" />
                        Deadline
                      </p>
                      <p className="mt-2 text-lg font-bold text-[#062E22]">
                        {new Date(opportunity.submission_deadline).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>

                {opportunity.requirements && (
                  <div className="mt-6">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      Requirements
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      {opportunity.requirements}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0a4a37]">
                      Proposals
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-[#062E22]">
                      {proposals.length} proposal{proposals.length !== 1 ? 's' : ''} received
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewMode('cards')}
                      className={`rounded-lg p-2 transition ${
                        viewMode === 'cards'
                          ? 'bg-[#062E22] text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      className={`rounded-lg p-2 transition ${
                        viewMode === 'table'
                          ? 'bg-[#062E22] text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {proposals.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-slate-200 p-8 text-center">
                    <Users className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-3 text-sm text-slate-500">
                      No proposals yet. {opportunity.status === 'published'
                        ? 'Vendors will start submitting proposals soon.'
                        : 'Publish this opportunity to receive proposals.'}
                    </p>
                  </div>
                ) : viewMode === 'cards' ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {proposals.map((proposal) => (
                      <div
                        key={proposal.id}
                        className={`rounded-[24px] border p-5 transition ${
                          selectedProposals.has(proposal.id)
                            ? 'border-[#062E22] bg-[#F5FBF8]'
                            : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-bold text-[#062E22]">
                              {proposal.vendor_business_name || proposal.vendor_name || 'Unknown Vendor'}
                            </h3>
                            <span
                              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                                STATUS_STYLES[proposal.status]
                              }`}
                            >
                              {STATUS_LABELS[proposal.status]}
                            </span>
                          </div>
                          <input
                            type="checkbox"
                            checked={selectedProposals.has(proposal.id)}
                            onChange={() => toggleProposalSelection(proposal.id)}
                            className="h-5 w-5 rounded border-slate-300"
                          />
                        </div>

                        {proposal.proposal_amount && (
                          <div className="mt-3">
                            <p className="text-2xl font-bold text-[#062E22]">
                              {formatCurrency(proposal.proposal_amount, proposal.currency)}
                            </p>
                            {proposal.counter_round > 0 && (
                              <p className="text-xs text-slate-400">
                                {proposal.counter_round} counter round{proposal.counter_round !== 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        )}

                        {proposal.scope_summary && (
                          <p className="mt-3 text-sm text-slate-500 line-clamp-3">
                            {proposal.scope_summary}
                          </p>
                        )}

                        <div className="mt-4 flex flex-wrap gap-2">
                          {['selected', 'converted'].includes(proposal.status) ? (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700">
                              <CheckCircle className="h-3 w-3" />
                              Accepted
                            </span>
                          ) : actedProposals.has(proposal.id) ||
                            ['rejected', 'withdrawn', 'expired'].includes(proposal.status) ? null : ['submitted', 'vendor_countered'].includes(
                            proposal.status
                          ) ? (
                            <>
                              <button
                                onClick={() => {
                                  setCounterAmount(String(proposal.proposal_amount || ''));
                                  setShowCounterModal(proposal.id);
                                }}
                                disabled={actionLoading === proposal.id}
                                className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
                              >
                                <MessageSquare className="h-3 w-3" />
                                Counter
                              </button>
                              <button
                                onClick={() => handleAccept(proposal.id)}
                                disabled={actionLoading === proposal.id}
                                className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
                              >
                                {actionLoading === proposal.id ? (
                                  <>Accepting...</>
                                ) : (
                                  <><CheckCircle className="h-3 w-3" /> Accept</>
                                )}
                              </button>
                              <button
                                onClick={() => setShowRejectModal(proposal.id)}
                                disabled={actionLoading === proposal.id}
                                className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                              >
                                <XCircle className="h-3 w-3" />
                                Reject
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-400">
                          <th className="pb-3 pr-4 font-semibold">Vendor</th>
                          <th className="pb-3 pr-4 font-semibold">Amount</th>
                          <th className="pb-3 pr-4 font-semibold">Status</th>
                          <th className="pb-3 pr-4 font-semibold">Counter Rounds</th>
                          <th className="pb-3 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {proposals.map((proposal) => (
                          <tr
                            key={proposal.id}
                            className={`border-b border-slate-100 ${
                              selectedProposals.has(proposal.id)
                                ? 'bg-[#F5FBF8]'
                                : ''
                            }`}
                          >
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={selectedProposals.has(proposal.id)}
                                  onChange={() => toggleProposalSelection(proposal.id)}
                                  className="h-4 w-4 rounded border-slate-300"
                                />
                                <span className="font-medium text-[#062E22]">
                                  {proposal.vendor_business_name || proposal.vendor_name || 'Unknown Vendor'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 pr-4 font-semibold text-[#062E22]">
                              {formatCurrency(proposal.proposal_amount, proposal.currency)}
                            </td>
                            <td className="py-3 pr-4">
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  STATUS_STYLES[proposal.status]
                                }`}
                              >
                                {STATUS_LABELS[proposal.status]}
                              </span>
                            </td>
                            <td className="py-3 pr-4 text-slate-500">
                              {proposal.counter_round}
                            </td>
                            <td className="py-3">
                              {['selected', 'converted'].includes(proposal.status) ? (
                                <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                                  <CheckCircle className="h-3 w-3" />
                                  Accepted
                                </span>
                              ) : actedProposals.has(proposal.id) ||
                                ['rejected', 'withdrawn', 'expired'].includes(proposal.status) ? null : ['submitted', 'vendor_countered'].includes(
                                proposal.status
                              ) ? (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      setCounterAmount(
                                        String(proposal.proposal_amount || '')
                                      );
                                      setShowCounterModal(proposal.id);
                                    }}
                                    className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                                  >
                                    Counter
                                  </button>
                                  <button
                                    onClick={() => handleAccept(proposal.id)}
                                    disabled={actionLoading === proposal.id}
                                    className="rounded bg-green-600 px-2 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                                  >
                                    {actionLoading === proposal.id ? 'Accepting...' : 'Accept'}
                                  </button>
                                  <button
                                    onClick={() => setShowRejectModal(proposal.id)}
                                    disabled={actionLoading === proposal.id}
                                    className="rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

            <aside className="space-y-6">
              {selectedProposals.size > 1 && (
                <div className="rounded-[24px] border border-slate-200 bg-white p-5">
                  <h4 className="font-semibold text-[#062E22]">
                    Compare Selected ({selectedProposals.size})
                  </h4>
                  <div className="mt-3 space-y-2">
                    {Array.from(selectedProposals).map((pid) => {
                      const proposal = proposals.find((p) => p.id === pid);
                      if (!proposal) return null;
                      return (
                        <div
                          key={pid}
                          className="flex justify-between rounded-lg bg-slate-50 p-3"
                        >
                          <span className="text-sm font-medium">
                            {proposal.vendor_business_name || proposal.vendor_name || 'Unknown Vendor'}
                          </span>
                          <span className="text-sm font-bold text-[#062E22]">
                            {formatCurrency(
                              proposal.proposal_amount,
                              proposal.currency
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#062E22]" />
                  <h3 className="font-bold text-[#062E22]">Attendees</h3>
                </div>
                {opportunity.event_id ? (
                  <>
                    <p className="mt-2 text-sm text-slate-500">
                      Expected: {opportunity.expected_attendees ?? 'N/A'}
                    </p>
                    <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                      {attendeesLoading ? (
                        <div className="flex justify-center py-4">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#062E22] border-t-transparent" />
                        </div>
                      ) : attendees.length === 0 ? (
                        <p className="text-sm text-slate-400">No attendees registered yet.</p>
                      ) : (
                        attendees.slice(0, 10).map((a) => (
                          <div key={a.id} className="flex items-center justify-between rounded-lg bg-[#F5FBF8] p-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-[#062E22] truncate">
                                {a.attendee_name || 'Unknown'}
                              </p>
                              <p className="text-xs text-slate-500 truncate">
                                {a.attendee_email || ''}
                              </p>
                            </div>
                            <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${
                              a.check_in_status === 'checked_in'
                                ? 'bg-green-100 text-green-700'
                                : a.booking_status === 'confirmed'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}>
                              {a.check_in_status === 'checked_in' ? 'Checked In' : a.booking_status}
                            </span>
                          </div>
                        ))
                      )}
                      {attendees.length > 10 && (
                        <Link
                          href={`/organizer/events/${opportunity.event_id}/attendees`}
                          className="mt-3 block text-center text-sm font-semibold text-[#062E22] hover:underline"
                        >
                          View all {attendees.length} attendees
                        </Link>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">
                    No event linked to this opportunity.
                  </p>
                )}
              </div>
            </aside>
          </div>
        </div>
      </main>

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-[24px] bg-white p-6">
            <h3 className="text-lg font-bold text-[#062E22]">Reject Proposal</h3>
            <p className="mt-2 text-sm text-slate-500">
              Please provide a reason for rejecting this proposal.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason (optional)"
              rows={4}
              className="mt-4 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none transition focus:border-[#062E22]"
            />
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectReason('');
                }}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(showRejectModal)}
                disabled={actionLoading === showRejectModal}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {actionLoading === showRejectModal ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCounterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-[24px] bg-white p-6">
            <h3 className="text-lg font-bold text-[#062E22]">Counter Proposal</h3>
            <p className="mt-2 text-sm text-slate-500">
              Enter your counter amount.
            </p>
            <div className="mt-4">
              <label className="mb-2 block text-sm font-medium text-slate-600">
                Counter Amount (ETB)
              </label>
              <input
                type="number"
                value={counterAmount}
                onChange={(e) => setCounterAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none transition focus:border-[#062E22]"
              />
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => {
                  setShowCounterModal(null);
                  setCounterAmount('');
                }}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCounter(showCounterModal)}
                disabled={actionLoading === showCounterModal || !counterAmount}
                className="flex-1 rounded-xl bg-[#062E22] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0a4a37] disabled:opacity-60"
              >
                {actionLoading === showCounterModal ? 'Sending...' : 'Send Counter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 