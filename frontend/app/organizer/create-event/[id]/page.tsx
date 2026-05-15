'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { api } from '@/app/lib/api';
import { ProposalRecord } from '@/app/types/proposal';
import { eventsService } from '@/app/services/eventsService';
import { Globe, Lock } from 'lucide-react';

export default function CreateEventFromProposalPage() {
  const params = useParams();
  const router = useRouter();
  const proposalId = params.id as string;

  const [proposal, setProposal] = useState<ProposalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadProposal = async () => {
      try {
        const response = await api.get<ProposalRecord>(`/proposals/${proposalId}`);
        if (!mounted) return;
        setProposal(response);
        if (response.visibility) {
          setVisibility(response.visibility as 'public' | 'private');
        }
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load proposal');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadProposal();

    return () => {
      mounted = false;
    };
  }, [proposalId]);

  const handleCreateEvent = async () => {
    if (!proposal) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await eventsService.createEventFromProposal(proposal.id, visibility);
      router.replace(`/organizer/events/${response.event_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="organizer" />
      <DashboardHeader searchPlaceholder="Search events..." />
      <main className="md:ml-60 pt-16 p-6">
        <div className="max-w-3xl mx-auto">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !proposal ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <h1 className="text-xl font-bold text-[#062E22]">Proposal not found</h1>
              <p className="text-sm text-slate-500 mt-2">We could not load the approved proposal needed for event creation.</p>
              <Link href="/organizer/proposals" className="inline-flex mt-4 text-sm font-semibold text-[#062E22] underline">
                Back to proposals
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <p className="text-sm text-slate-500">Approved proposal to event</p>
                <h1 className="text-3xl font-bold text-[#062E22] mt-1">Create Event Workspace</h1>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Proposal Title</p>
                    <h2 className="text-xl font-bold text-[#062E22] mt-1">{proposal.title}</h2>
                    <p className="text-sm text-slate-500 mt-3">{proposal.description || 'No description provided.'}</p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">Event Type</p>
                      <p className="text-sm font-medium text-slate-700 mt-1">{proposal.event_type || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">Location</p>
                      <p className="text-sm font-medium text-slate-700 mt-1">{proposal.location || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">Dates</p>
                      <p className="text-sm font-medium text-slate-700 mt-1">
                        {proposal.start_date ? new Date(proposal.start_date).toLocaleDateString() : 'TBD'}
                        {' '}to{' '}
                        {proposal.end_date ? new Date(proposal.end_date).toLocaleDateString() : 'TBD'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-lg font-bold text-[#062E22] mb-4">Event Availability</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setVisibility('public')}
                    className={`flex items-start gap-4 p-4 rounded-xl border-2 transition text-left ${
                      visibility === 'public'
                        ? 'border-[#062E22] bg-[#062E22]/5'
                        : 'border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      visibility === 'public' ? 'bg-[#062E22] text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-[#062E22]">Public Event</p>
                      <p className="text-xs text-slate-500 mt-1">Anyone can discover and register for this event on the platform.</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setVisibility('private')}
                    className={`flex items-start gap-4 p-4 rounded-xl border-2 transition text-left ${
                      visibility === 'private'
                        ? 'border-[#062E22] bg-[#062E22]/5'
                        : 'border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      visibility === 'private' ? 'bg-[#062E22] text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-[#062E22]">Private (By Invitation)</p>
                      <p className="text-xs text-slate-500 mt-1">Only users with an invitation or the direct link can view and join.</p>
                    </div>
                  </button>
                </div>
              </div>

              {proposal.status !== 'approved' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                  This proposal is not approved yet, so the event workspace cannot be created.
                </div>
              )}

              {proposal.event_id && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
                  An event already exists for this proposal.
                  <Link href={`/organizer/events/${proposal.event_id}`} className="ml-2 font-semibold underline">
                    Open event workspace
                  </Link>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/organizer/proposals/${proposal.id}`}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
                >
                  Back to proposal
                </Link>
                {proposal.event_id ? (
                  <Link
                    href={`/organizer/events/${proposal.event_id}`}
                    className="px-4 py-2 bg-[#062E22] text-white rounded-lg text-sm font-semibold hover:bg-[#0a4a37] transition"
                  >
                    Open Event Workspace
                  </Link>
                ) : (
                  <button
                    onClick={handleCreateEvent}
                    disabled={proposal.status !== 'approved' || submitting}
                    className="px-4 py-2 bg-[#062E22] text-white rounded-lg text-sm font-semibold hover:bg-[#0a4a37] transition disabled:opacity-50"
                  >
                    {submitting ? 'Creating event...' : 'Create Event'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
