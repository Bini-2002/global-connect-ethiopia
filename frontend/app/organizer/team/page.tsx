'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { eventsService } from '@/app/services/eventsService';
import { EventListItem } from '@/app/types/event';

export default function OrganizerTeamPage() {
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTeams = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await eventsService.getEvents();
        setEvents(data);
      } catch (err: any) {
        setError(err?.message || 'Failed to load team overview.');
      } finally {
        setLoading(false);
      }
    };

    void loadTeams();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="organizer" />
      <main className="md:ml-60 pt-16 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
            <h1 className="text-3xl font-bold text-[#062E22]">Team</h1>
            <p className="mt-4 text-slate-600 text-base">
              Team management is handled inside each event workspace. Open an event to invite collaborators and assign responsibilities.
            </p>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
              <p className="font-medium">Unable to load team workspace overview.</p>
              <p className="text-sm mt-2">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
              <div className="flex items-center justify-center py-16">
                <div className="w-10 h-10 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          ) : events.length > 0 ? (
            <div className="grid gap-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <h2 className="text-xl font-semibold text-[#062E22]">Event team workspaces</h2>
                <p className="mt-2 text-slate-500">You have {events.length} event{events.length === 1 ? '' : 's'} with team collaboration enabled.</p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <h2 className="text-lg font-semibold text-[#062E22]">Open team workspaces</h2>
                <div className="mt-6 space-y-4">
                  {events.map((event) => (
                    <Link
                      key={event.id}
                      href={`/organizer/events/${event.id}/team`}
                      className="block rounded-3xl border border-slate-200 p-5 hover:border-[#062E22] hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-lg font-semibold text-[#062E22]">{event.title}</p>
                          <p className="text-sm text-slate-500">{event.location} · {event.date}</p>
                        </div>
                        <span className="rounded-full bg-[#062E22] px-3 py-1 text-sm font-semibold text-white">Manage team</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-slate-600">
              <h2 className="text-2xl font-semibold text-[#062E22]">No team registered.</h2>
              <p className="mt-3 text-sm">
                Create your first event to start inviting team members and assigning roles.
              </p>
              <Link href="/organizer/create-event" className="mt-6 inline-flex rounded-full bg-[#062E22] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0a4a37] transition">
                Create event
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
