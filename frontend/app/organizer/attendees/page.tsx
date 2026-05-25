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
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  useEffect(() => {
    const loadAttendeesOverview = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await eventsService.getEvents();
        setEvents(data);
        if (data.length > 0) {
          setSelectedEventId(data[0].id);
        }
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
          ) : hasEvents ? (
            <div className="grid gap-6">
              {/* Event Selector */}
              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <label htmlFor="event-selector" className="block text-sm font-semibold text-[#062E22] mb-3">
                  Select Event
                </label>
                <select
                  id="event-selector"
                  value={selectedEventId || ''}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#062E22] text-slate-700"
                >
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title} - {event.location} · {event.date}
                    </option>
                  ))}
                </select>
              </div>

              {/* Attendees for Selected Event */}
              {selectedEventId && (
                <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                  {(() => {
                    const selectedEvent = events.find(e => e.id === selectedEventId);
                    const attendees = bookingsByEvent[selectedEventId] ?? [];
                    return (
                      <>
                        <h2 className="text-xl font-semibold text-[#062E22]">{selectedEvent?.title}</h2>
                        <p className="mt-2 text-slate-500">
                          {selectedEvent?.location} · {selectedEvent?.date}
                        </p>
                        
                        <div className="mt-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-[#062E22]">Registered Attendees</h3>
                            <span className="inline-flex rounded-full bg-[#062E22] px-3 py-1 text-sm font-semibold text-white">
                              {attendees.length} attendee{attendees.length === 1 ? '' : 's'}
                            </span>
                          </div>

                          {attendees.length > 0 ? (
                            <div className="space-y-3">
                              {attendees.map((attendee) => (
                                <div key={attendee.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:border-[#062E22] transition">
                                  <p className="font-semibold text-slate-900">
                                    {attendee.attendee_name || attendee.attendee_email || attendee.booking_reference}
                                  </p>
                                  <div className="mt-2 flex flex-col gap-1 text-sm text-slate-600">
                                    {attendee.attendee_email && <p>📧 {attendee.attendee_email}</p>}
                                    <p>🔖 {attendee.booking_reference}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500 py-8 text-center">
                              This event has no registered attendees yet. Open its attendee workspace to manage bookings.
                            </p>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
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
