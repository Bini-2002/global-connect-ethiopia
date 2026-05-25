'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { eventsService } from '@/app/services/eventsService';
import { EventListItem, EventStats } from '@/app/types/event';

export default function OrganizerReportsPage() {
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReports = async () => {
      setLoading(true);
      setError(null);

      try {
        const [eventList, eventStats] = await Promise.all([
          eventsService.getEvents(),
          eventsService.getEventStats(),
        ]);
        setEvents(eventList);
        setStats(eventStats);
      } catch (err: any) {
        setError(err?.message || 'Failed to load reports and analytics.');
      } finally {
        setLoading(false);
      }
    };

    void loadReports();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="organizer" />
      <main className="md:ml-60 pt-16 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
            <h1 className="text-3xl font-bold text-[#062E22]">Reports & Analytics</h1>
            <p className="mt-4 text-slate-600 text-base">
              Review event performance, attendee counts, and proposal progress from a single place.
            </p>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
              <p className="font-medium">Unable to load reports.</p>
              <p className="text-sm mt-2">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
              <div className="flex items-center justify-center py-16">
                <div className="w-10 h-10 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          ) : stats && stats.totalEvents > 0 ? (
            <div className="grid gap-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <h2 className="text-xl font-semibold text-[#062E22]">Snapshot</h2>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Total events</p>
                    <p className="mt-2 text-2xl font-bold text-[#062E22]">{stats.totalEvents}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400">This month</p>
                    <p className="mt-2 text-2xl font-bold text-[#062E22]">{stats.thisMonth}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Draft proposals</p>
                    <p className="mt-2 text-2xl font-bold text-[#062E22]">{stats.drafts}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-[#062E22]">Recent events</h2>
                    <p className="mt-2 text-slate-500">Open an event page for full report and analytics details.</p>
                  </div>
                  <Link href="/organizer/events" className="text-sm font-semibold text-[#062E22] hover:text-[#0a4a37]">
                    View all events
                  </Link>
                </div>
                <div className="mt-6 space-y-4">
                  {events.slice(0, 5).map((event) => (
                    <Link
                      key={event.id}
                      href={`/organizer/events/${event.id}`}
                      className="block rounded-3xl border border-slate-200 p-5 hover:border-[#062E22] hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-lg font-semibold text-[#062E22]">{event.title}</p>
                          <p className="text-sm text-slate-500">{event.location} · {event.date}</p>
                        </div>
                        <span className="rounded-full bg-[#062E22] px-3 py-1 text-sm font-semibold text-white">
                          {event.status}
                        </span>
                      </div>
                      <div className="mt-3 text-sm text-slate-500">
                        {event.booked_count ?? 0} attendees registered · {event.remaining_slots ?? 0} tickets remaining
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-slate-600">
              <h2 className="text-2xl font-semibold text-[#062E22]">No reports registered.</h2>
              <p className="mt-3 text-sm">
                Reports appear once you create and publish events. Start by creating an event or submitting a proposal.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/organizer/create-event" className="inline-flex rounded-full bg-[#062E22] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0a4a37] transition">
                  Create event
                </Link>
                <Link href="/organizer/proposals/create" className="inline-flex rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[#062E22] hover:bg-slate-50 transition">
                  Create proposal
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
