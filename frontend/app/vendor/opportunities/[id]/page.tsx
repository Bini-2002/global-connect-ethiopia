'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import OpportunityStatusBadge from '@/components/marketplace/OpportunityStatusBadge';
import { useOpportunity, useVendorProposals } from '@/app/hooks/useOpportunities';
import { opportunityService } from '@/app/services/opportunityService';
import { OpportunityProposalRecord } from '@/app/types/opportunity';

export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const opportunityId = params.id as string;
  
  const { data: opportunity, error: oppError, loading: oppLoading } = useOpportunity(opportunityId);
  const { data: proposals, refresh: refreshProposals } = useVendorProposals();
  
  const [amount, setAmount] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [timeline, setTimeline] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Find if we already have a proposal for this opportunity
  const existingProposal = proposals.find(p => p.opportunity_id === opportunityId);

  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    
    setSubmitting(true);
    try {
      await opportunityService.submitProposal(opportunityId, {
        proposal_amount: Number(amount),
        cover_letter: coverLetter,
        delivery_timeline_days: timeline ? Number(timeline) : undefined,
      });
      refreshProposals();
    } catch (err) {
      console.error(err);
      alert('Failed to submit proposal.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptCounter = async () => {
    if (!existingProposal) return;
    setSubmitting(true);
    try {
      await opportunityService.acceptCounter(existingProposal.id);
      refreshProposals();
    } catch (err) {
      console.error(err);
      alert('Failed to accept counter offer.');
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleCounterOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!existingProposal || !amount) return;
    
    setSubmitting(true);
    try {
      await opportunityService.counterProposal(existingProposal.id, {
        amount: Number(amount),
        message: coverLetter,
      });
      refreshProposals();
      setAmount('');
      setCoverLetter('');
    } catch (err) {
      console.error(err);
      alert('Failed to submit counter offer.');
    } finally {
      setSubmitting(false);
    }
  };

  if (oppLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Sidebar role="vendor" />
        <DashboardHeader actionHref="/vendor/contracts" actionLabel="Open Contracts" />
        <main className="pt-16 md:ml-60 p-6 flex justify-center items-center h-[calc(100vh-64px)]">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#062E22] border-t-transparent" />
        </main>
      </div>
    );
  }

  if (oppError || !opportunity) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Sidebar role="vendor" />
        <DashboardHeader actionHref="/vendor/contracts" actionLabel="Open Contracts" />
        <main className="pt-16 md:ml-60 p-6">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {oppError || 'Opportunity not found'}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="vendor" />
      <DashboardHeader actionHref="/vendor/contracts" actionLabel="Open Contracts" />

      <main className="pt-16 md:ml-60 p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <Link
            href="/vendor/opportunities"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#062E22]"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Opportunities
          </Link>

          <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
            <div className="p-8">
              <div className="flex flex-wrap items-center gap-3">
                <OpportunityStatusBadge status={opportunity.status} />
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                  {opportunity.category}
                </span>
              </div>

              <h1 className="mt-4 text-3xl font-bold text-[#062E22]">{opportunity.title}</h1>
              <p className="mt-2 text-slate-500">
                {opportunity.client_name || 'Client'} • {opportunity.location?.city || 'Addis Ababa'}
              </p>

              <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
                <div className="md:col-span-2 space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Description</h3>
                    <p className="mt-2 whitespace-pre-wrap text-slate-700 leading-relaxed">
                      {opportunity.description}
                    </p>
                  </div>
                  {opportunity.requirements && (
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Requirements</h3>
                      <p className="mt-2 whitespace-pre-wrap text-slate-700 leading-relaxed">
                        {opportunity.requirements}
                      </p>
                    </div>
                  )}
                </div>

                <div className="rounded-[24px] bg-slate-50 p-6 space-y-6">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Budget Range</p>
                    <p className="mt-1 text-xl font-bold text-[#062E22]">
                      {opportunity.budget_min ? `${opportunity.budget_min.toLocaleString()} ${opportunity.currency}` : 'Negotiable'} 
                      {opportunity.budget_max ? ` - ${opportunity.budget_max.toLocaleString()} ${opportunity.currency}` : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Deadline</p>
                    <p className="mt-1 font-semibold text-slate-700">
                      {opportunity.submission_deadline ? new Date(opportunity.submission_deadline).toLocaleDateString() : 'Rolling'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Sourcing Mode</p>
                    <p className="mt-1 font-semibold text-slate-700">
                      {opportunity.sourcing_mode === 'open_bid' ? 'Open Bid' : 'Invite Only'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Proposal Section */}
            <div className="border-t border-slate-200 bg-slate-50 p-8">
              {!existingProposal ? (
                <div className="max-w-2xl">
                  <h2 className="text-xl font-bold text-[#062E22]">Submit your proposal</h2>
                  <p className="mt-2 text-sm text-slate-500">Provide your best competitive offer.</p>
                  
                  <form onSubmit={handleSubmitProposal} className="mt-6 space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Proposed Amount (ETB)</label>
                      <input
                        type="number"
                        required
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="mt-1 block w-full rounded-xl border-slate-200 p-3 shadow-sm focus:border-[#062E22] focus:ring-[#062E22] sm:text-sm"
                        placeholder="e.g. 50000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Timeline (Days)</label>
                      <input
                        type="number"
                        value={timeline}
                        onChange={(e) => setTimeline(e.target.value)}
                        className="mt-1 block w-full rounded-xl border-slate-200 p-3 shadow-sm focus:border-[#062E22] focus:ring-[#062E22] sm:text-sm"
                        placeholder="e.g. 14"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Cover Letter</label>
                      <textarea
                        rows={4}
                        value={coverLetter}
                        onChange={(e) => setCoverLetter(e.target.value)}
                        className="mt-1 block w-full rounded-xl border-slate-200 p-3 shadow-sm focus:border-[#062E22] focus:ring-[#062E22] sm:text-sm"
                        placeholder="Why are you the best fit for this opportunity?"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex w-full justify-center rounded-full bg-[#EC5B13] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#d54e0c] disabled:opacity-50"
                    >
                      {submitting ? 'Submitting...' : 'Submit Proposal'}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-[#062E22]">Your Proposal</h2>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="text-sm text-slate-500">Status:</span>
                        <OpportunityStatusBadge status={existingProposal.status} />
                      </div>
                    </div>
                    {['selected', 'converted'].includes(existingProposal.status.toLowerCase()) && existingProposal.contract_id && (
                      <Link
                        href={`/vendor/contracts/${existingProposal.contract_id}`}
                        className="rounded-full bg-[#062E22] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#0a4a37]"
                      >
                        View Contract
                      </Link>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 rounded-2xl bg-white p-6 border border-slate-200 shadow-sm">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Current Amount</p>
                      <p className="mt-1 text-2xl font-bold text-[#062E22]">
                        {existingProposal.proposal_amount?.toLocaleString() || 0} {existingProposal.currency}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Submitted On</p>
                      <p className="mt-1 font-semibold text-slate-700">
                        {existingProposal.submitted_at ? new Date(existingProposal.submitted_at).toLocaleDateString() : new Date(existingProposal.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {existingProposal.status === 'client_countered' && (
                    <div className="rounded-2xl border border-violet-200 bg-violet-50 p-6 mt-6">
                      <h3 className="text-lg font-bold text-violet-900">Client Countered Your Offer</h3>
                      <p className="mt-2 text-sm text-violet-700 mb-6">
                        The organizer has proposed a new amount. You can accept their offer or submit another counter.
                      </p>
                      
                      <div className="flex gap-4">
                        <button
                          onClick={handleAcceptCounter}
                          disabled={submitting}
                          className="rounded-full bg-violet-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-violet-700 disabled:opacity-50"
                        >
                          Accept Offer
                        </button>
                      </div>

                      <div className="mt-8 pt-8 border-t border-violet-200">
                        <h4 className="font-semibold text-violet-900 mb-4">Or Counter Back</h4>
                        <form onSubmit={handleCounterOffer} className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-violet-900">New Amount</label>
                            <input
                              type="number"
                              required
                              value={amount}
                              onChange={(e) => setAmount(e.target.value)}
                              className="mt-1 block w-full rounded-xl border-violet-200 p-3 shadow-sm focus:border-violet-500 focus:ring-violet-500 sm:text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-violet-900">Message (Optional)</label>
                            <textarea
                              rows={2}
                              value={coverLetter}
                              onChange={(e) => setCoverLetter(e.target.value)}
                              className="mt-1 block w-full rounded-xl border-violet-200 p-3 shadow-sm focus:border-violet-500 focus:ring-violet-500 sm:text-sm"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={submitting}
                            className="rounded-full bg-white px-6 py-3 text-sm font-bold text-violet-900 border border-violet-300 transition hover:bg-violet-100 disabled:opacity-50"
                          >
                            Submit Counter
                          </button>
                        </form>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
