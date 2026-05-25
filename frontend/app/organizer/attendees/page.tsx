'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { eventsService } from '@/app/services/eventsService';
import { EventBookingRecord, EventListItem } from '@/app/types/event';

export default function OrganizerAttendeesPage() {
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [bookingsByEvent, setBookingsByEvent] = useState<Record<string, EventBookingRecord[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingsError, setBookingsError] = useState<string | null>(null);

  useEffect(() => {
    const loadAttendeesOverview = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await eventsService.getEvents();
        setEvents(data);
        setBookingsError(null);

        const bookingResults = await Promise.allSettled(
          data.map(async (event) => ({
            eventId: event.id,
            bookings: await eventsService.getMyBookings(event.id),
          }))
        );

        const bookingsMap: Record<string, EventBookingRecord[]> = {};
        const failed = bookingResults.filter((result) => result.status === 'rejected');
        bookingResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            bookingsMap[result.value.eventId] = result.value.bookings;
          }
        });

        if (failed.length > 0) {
          setBookingsError('Some attendee records could not be loaded. Open the event workspace to verify registrations.');
        }
        setBookingsByEvent(bookingsMap);
      } catch (err: any) {
        setError(err?.message || 'Failed to load attendee overview.');
      } finally {
        setLoading(false);
      }
    };

    void loadAttendeesOverview();
  }, []);

  const loadedAttendeesCount = Object.values(bookingsByEvent).reduce((sum, bookings) => sum + bookings.length, 0);
  const fallbackAttendeesCount = events.reduce((sum, event) => sum + (event.booked_count ?? 0), 0);
  const totalAttendees = Math.max(loadedAttendeesCount, fallbackAttendeesCount);
  const hasEvents = events.length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="organizer" />
      <main className="md:ml-60 pt-16 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
            <h1 className="text-3xl font-bold text-[#062E22]">Attendees</h1>
            <p className="mt-4 text-slate-600 text-base">
              Track attendee registration across your events and open the event workspace to manage bookings.
            </p>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
              <p className="font-medium">Unable to load attendee overview.</p>
              <p className="text-sm mt-2">{error}</p>
            </div>
          )}

          {bookingsError && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
              <p className="font-medium">Some attendee records could not be loaded.</p>
              <p className="text-sm mt-2">{bookingsError}</p>
            </div>
          )}

          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
              <div className="flex items-center justify-center py-16">
                <div className="w-10 h-10 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          ) : totalAttendees > 0 ? (
            <div className="grid gap-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <h2 className="text-xl font-semibold text-[#062E22]">Registered Attendees</h2>
                <p className="mt-2 text-slate-500">
                  You have {totalAttendees} attendees registered across {events.length} event{events.length === 1 ? '' : 's'}.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <h2 className="text-lg font-semibold text-[#062E22]">Event Attendance</h2>
                <div className="mt-6 space-y-6">
                  {events.map((event) => {
                    const attendees = bookingsByEvent[event.id] ?? [];
                    return (
                      <div key={event.id} className="rounded-3xl border border-slate-200 p-5 hover:border-[#062E22] hover:bg-slate-50 transition">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <Link href={`/organizer/events/${event.id}/attendees`} className="block">
                              <p className="text-lg font-semibold text-[#062E22] hover:underline">{event.title}</p>
                              <p className="text-sm text-slate-500">{event.location} · {event.date}</p>
                            </Link>
                          </div>
                          <span className="inline-flex rounded-full bg-[#062E22] px-3 py-1 text-sm font-semibold text-white">
                            {attendees.length} attendee{attendees.length === 1 ? '' : 's'}
                          </span>
                        </div>

                        {attendees.length > 0 ? (
                          <ul className="mt-5 space-y-3">
                            {attendees.slice(0, 4).map((attendee) => (
                              <li key={attendee.id} className="rounded-2xl bg-slate-50 p-4">
                                <p className="font-semibold text-slate-900">
                                  {attendee.attendee_name || attendee.attendee_email || attendee.booking_reference}
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                  {attendee.attendee_email ? `${attendee.attendee_email} · ` : ''}
                                  {attendee.booking_reference}
                                </p>
                              </li>
                            ))}
                            {attendees.length > 4 && (
                              <li className="text-sm text-slate-500">+{attendees.length - 4} more attendee{attendees.length - 4 === 1 ? '' : 's'}...</li>
                            )}
                          </ul>
                        ) : (
                          <p className="mt-4 text-sm text-slate-500">
                            This event has no registered attendees yet. Open its attendee workspace to manage bookings.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : hasEvents ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-slate-600">
              <h2 className="text-2xl font-semibold text-[#062E22]">No attendees registered yet.</h2>
              <p className="mt-3 text-sm">
                Your events are ready, but attendee registrations have not arrived. Open an event to view and manage attendee bookings.
              </p>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-slate-600">
              <h2 className="text-2xl font-semibold text-[#062E22]">No attendees registered.</h2>
              <p className="mt-3 text-sm">
                Create your first event to begin collecting attendee registrations.
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
