'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { eventsService, EVENT_STATUS_CONFIG } from '@/app/services/eventsService';
import { EventRecord } from '@/app/types/event';

function formatDateRange(startDate?: string | null, endDate?: string | null): string {
  if (!startDate) return 'Date pending';
  const start = new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (!endDate) return start;
  const end = new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${start} - ${end}`;
}

function eventStatusLabel(status: string) {
  switch (status) {
    case 'draft':
      return EVENT_STATUS_CONFIG.PENDING;
    case 'published':
    case 'private_published':
      return EVENT_STATUS_CONFIG.UPCOMING;
    case 'live':
      return EVENT_STATUS_CONFIG.LIVE;
    case 'completed':
      return EVENT_STATUS_CONFIG.COMPLETED;
    case 'archived':
      return EVENT_STATUS_CONFIG.ARCHIVED;
    case 'cancelled':
      return EVENT_STATUS_CONFIG.CANCELLED;
    default:
      return EVENT_STATUS_CONFIG.PENDING;
  }
}

export default function OrganizerEventDetailPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchEvent = async () => {
    try {
      setError(null);
      const response = await eventsService.getEventById(eventId);
      setEvent(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  const statusMeta = useMemo(() => eventStatusLabel(event?.status || 'draft'), [event?.status]);

  const handleAction = async (action: 'publish' | 'start' | 'complete') => {
    if (!event) return;
    try {
      setActionLoading(action);
      setError(null);
      const updated =
        action === 'publish'
          ? await eventsService.publishEvent(event.id)
          : action === 'start'
            ? await eventsService.startLiveEvent(event.id)
            : await eventsService.completeEvent(event.id);
      setEvent(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="organizer" />
      <DashboardHeader searchPlaceholder="Search events..." />
      <main className="md:ml-60 pt-16 p-6">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !event ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <h1 className="text-xl font-bold text-[#062E22]">Event not found</h1>
              <p className="text-sm text-slate-500 mt-2">The event workspace could not be loaded.</p>
              <Link href="/organizer/events" className="inline-flex mt-4 text-sm font-semibold text-[#062E22] underline">
                Back to events
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-500">Organizer event workspace</p>
                  <h1 className="text-3xl font-bold text-[#062E22] mt-1">{event.title}</h1>
                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusMeta.bgClass}`}>
                      {statusMeta.label}
                    </span>
                    <span className="text-sm text-slate-500">{event.category || 'No event type selected'}</span>
                    <span className="text-sm text-slate-500">{formatDateRange(event.start_date, event.end_date)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/organizer/proposals/${event.proposal_id}`}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
                  >
                    Open Proposal
                  </Link>
                  {event.status === 'draft' && (
                    <button
                      onClick={() => handleAction('publish')}
                      disabled={!!actionLoading}
                      className="px-4 py-2 bg-[#062E22] text-white rounded-lg text-sm font-semibold hover:bg-[#0a4a37] transition disabled:opacity-50"
                    >
                      {actionLoading === 'publish' ? 'Publishing...' : 'Publish Event'}
                    </button>
                  )}
                  {(event.status === 'published' || event.status === 'private_published') && (
                    <button
                      onClick={() => handleAction('start')}
                      disabled={!!actionLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {actionLoading === 'start' ? 'Starting...' : 'Start Live'}
                    </button>
                  )}
                  {(event.status === 'live' || event.status === 'published' || event.status === 'private_published') && (
                    <button
                      onClick={() => handleAction('complete')}
                      disabled={!!actionLoading}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50"
                    >
                      {actionLoading === 'complete' ? 'Completing...' : 'Mark Complete'}
                    </button>
                  )}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-[#062E22]">Event Overview</h2>
                    <div className="grid md:grid-cols-2 gap-4 mt-5">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">Location</p>
                        <p className="text-sm font-medium text-slate-700 mt-1">{event.location || 'Not set'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">Capacity</p>
                        <p className="text-sm font-medium text-slate-700 mt-1">{event.capacity || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">Visibility</p>
                        <p className="text-sm font-medium text-slate-700 mt-1">{event.visibility}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">Permit Number</p>
                        <p className="text-sm font-medium text-slate-700 mt-1">{event.permit_number || 'Pending permit link'}</p>
                      </div>
                    </div>
                    <div className="mt-5">
                      <p className="text-xs uppercase tracking-wide text-slate-400">Program Summary</p>
                      <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                        {event.program_schedule_summary || 'No program summary has been added yet.'}
                      </p>
                    </div>
                    {!!event.description && (
                      <div className="mt-5">
                        <p className="text-xs uppercase tracking-wide text-slate-400">Description</p>
                        <p className="text-sm text-slate-600 mt-2 leading-relaxed">{event.description}</p>
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-[#062E22]">Execution Readiness</h2>
                    <div className="grid md:grid-cols-2 gap-4 mt-5">
                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-400">Venue Status</p>
                        <p className="text-sm font-semibold text-[#062E22] mt-2">{event.venue_status}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-400">Booking Status</p>
                        <p className="text-sm font-semibold text-[#062E22] mt-2">{event.booking_status}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-400">Booked Slots</p>
                        <p className="text-sm font-semibold text-[#062E22] mt-2">{event.booked_count}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-400">Remaining Slots</p>
                        <p className="text-sm font-semibold text-[#062E22] mt-2">{event.remaining_slots}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-[#062E22]">Next Build Steps</h2>
                    <div className="space-y-3 mt-4">
                      <Link href="/organizer/events" className="block rounded-xl border border-slate-200 p-4 hover:bg-slate-50 transition">
                        <p className="font-semibold text-[#062E22]">Events Overview</p>
                        <p className="text-sm text-slate-500 mt-1">Return to the organizer event list.</p>
                      </Link>
                      <Link href={`/organizer/proposals/${event.proposal_id}`} className="block rounded-xl border border-slate-200 p-4 hover:bg-slate-50 transition">
                        <p className="font-semibold text-[#062E22]">Proposal Source</p>
                        <p className="text-sm text-slate-500 mt-1">View the approved proposal that created this event.</p>
                      </Link>
                      <div className="rounded-xl border border-dashed border-slate-200 p-4">
                        <p className="font-semibold text-[#062E22]">Upcoming workspaces</p>
                        <p className="text-sm text-slate-500 mt-1">Schedule, venue, booking, team, vendors, and operations can now be built directly on top of this event ID.</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-[#062E22]">Project Status</h2>
                    <div className="space-y-3 mt-4 text-sm text-slate-600">
                      <p>Proposal approval to event creation is now connected end to end.</p>
                      <p>The organizer can create an event, open its workspace, and move it through draft, published, live, and completed states.</p>
                      <p>Booking and marketplace backends are ready for the next frontend slices.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
