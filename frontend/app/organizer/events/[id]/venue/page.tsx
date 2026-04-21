'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Landmark, Search } from 'lucide-react';
import { useEventWorkspace } from '@/app/hooks/useEventWorkspace';
import { eventsService } from '@/app/services/eventsService';
import { VenueReservationRecord, VenueSearchOption } from '@/app/types/event';
import {
  EventWorkspaceShell,
  formatCurrency,
  formatDateTime,
  sentenceCase,
  startOfInputDateTime,
} from '@/components/organizer/events';

interface ReservationFormState {
  venue_name: string;
  city: string;
  location: string;
  requested_start: string;
  requested_end: string;
  estimated_cost: string;
  notes: string;
}

function createReservationForm(): ReservationFormState {
  return {
    venue_name: '',
    city: '',
    location: '',
    requested_start: '',
    requested_end: '',
    estimated_cost: '',
    notes: '',
  };
}

export default function EventVenuePage() {
  const params = useParams();
  const eventId = params.id as string;
  const { event, loading, error, refresh, setError } = useEventWorkspace(eventId);
  const [reservations, setReservations] = useState<VenueReservationRecord[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(true);
  const [searchCity, setSearchCity] = useState('');
  const [searchResults, setSearchResults] = useState<VenueSearchOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [reservationForm, setReservationForm] = useState<ReservationFormState>(createReservationForm());

  const loadReservations = async () => {
    try {
      setLoadingReservations(true);
      setError(null);
      const response = await eventsService.getVenueReservations(eventId);
      setReservations(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load venue reservations');
    } finally {
      setLoadingReservations(false);
    }
  };

  useEffect(() => {
    void loadReservations();
  }, [eventId]);

  useEffect(() => {
    if (!event) return;
    const defaultCity = event.office_assignments?.municipal?.city || event.location || '';
    const baseDate = startOfInputDateTime(event.start_date);
    setSearchCity((current) => current || defaultCity);
    setReservationForm((current) =>
      current.city || current.requested_start
        ? current
        : {
            ...current,
            city: defaultCity,
            requested_start: baseDate,
            requested_end: startOfInputDateTime(event.end_date) || baseDate,
          }
    );
  }, [event]);

  const confirmedReservation = useMemo(
    () => reservations.find((reservation) => reservation.status === 'confirmed') || null,
    [reservations]
  );

  const handleSearch = async () => {
    if (!event) return;
    try {
      setSearching(true);
      setError(null);
      const response = await eventsService.searchEventVenues(event.id, searchCity);
      setSearchResults(response.venues);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search venues');
    } finally {
      setSearching(false);
    }
  };

  const useVenueSuggestion = (venue: VenueSearchOption) => {
    setReservationForm((current) => ({
      ...current,
      venue_name: venue.venue_name,
      city: venue.city,
      estimated_cost: venue.estimated_cost ? `${venue.estimated_cost}` : current.estimated_cost,
      location: current.location || venue.city,
    }));
  };

  const handleCreateReservation = async () => {
    if (!event) return;
    try {
      setCreating(true);
      setError(null);
      const created = await eventsService.createVenueReservation(event.id, {
        venue_name: reservationForm.venue_name,
        city: reservationForm.city,
        location: reservationForm.location || undefined,
        requested_start: new Date(reservationForm.requested_start).toISOString(),
        requested_end: new Date(reservationForm.requested_end).toISOString(),
        estimated_cost: reservationForm.estimated_cost ? Number(reservationForm.estimated_cost) : undefined,
        notes: reservationForm.notes || undefined,
      });
      setReservations((current) => [created, ...current]);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create venue reservation');
    } finally {
      setCreating(false);
    }
  };

  const handleConfirm = async (reservationId: string) => {
    if (!event) return;
    try {
      setConfirmingId(reservationId);
      setError(null);
      const updated = await eventsService.confirmVenueReservation(event.id, reservationId, {
        confirmation_notes: 'Confirmed from organizer workspace',
      });
      setReservations((current) =>
        current.map((reservation) => (reservation.id === reservationId ? updated : reservation))
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm reservation');
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <EventWorkspaceShell
      event={event}
      loading={loading}
      error={error}
      activeTab="venue"
      aside={
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-[#062E22]">Venue Status</h2>
            <div className="space-y-4 mt-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Current Status</p>
                <p className="text-lg font-bold text-[#062E22] mt-2">{sentenceCase(event?.venue_status)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Confirmed Venue</p>
                <p className="text-sm font-semibold text-[#062E22] mt-2">
                  {confirmedReservation?.venue_name || event?.location || 'Not confirmed yet'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-[#062E22]">Search Venues</h2>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium text-slate-700">City</label>
                <input
                  value={searchCity}
                  onChange={(eventValue) => setSearchCity(eventValue.target.value)}
                  placeholder="Adama"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={() => void handleSearch()}
                disabled={searching}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#062E22] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a37] transition disabled:opacity-50"
              >
                <Search className="w-4 h-4" />
                {searching ? 'Searching...' : 'Find Venue Options'}
              </button>
            </div>

            {searchResults.length ? (
              <div className="space-y-3 mt-5">
                {searchResults.map((venue) => (
                  <div key={`${venue.city}-${venue.venue_name}`} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#062E22]">{venue.venue_name}</p>
                        <p className="text-sm text-slate-500 mt-1">{venue.city}</p>
                        <p className="text-sm text-slate-500 mt-1">
                          {venue.estimated_cost != null ? formatCurrency(venue.estimated_cost) : 'Cost pending'}
                        </p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${venue.available ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {venue.available ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                    <button
                      onClick={() => useVenueSuggestion(venue)}
                      className="mt-4 px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
                    >
                      Use This Venue
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      }
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#062E22]/10 text-[#062E22] flex items-center justify-center">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#062E22]">Create Venue Reservation</h2>
            <p className="text-sm text-slate-500">Reserve a venue directly from the event workspace.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <div>
            <label className="text-sm font-medium text-slate-700">Venue Name</label>
            <input
              value={reservationForm.venue_name}
              onChange={(eventValue) =>
                setReservationForm((current) => ({ ...current, venue_name: eventValue.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">City</label>
            <input
              value={reservationForm.city}
              onChange={(eventValue) =>
                setReservationForm((current) => ({ ...current, city: eventValue.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Location Notes</label>
            <input
              value={reservationForm.location}
              onChange={(eventValue) =>
                setReservationForm((current) => ({ ...current, location: eventValue.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Estimated Cost</label>
            <input
              type="number"
              min="0"
              value={reservationForm.estimated_cost}
              onChange={(eventValue) =>
                setReservationForm((current) => ({ ...current, estimated_cost: eventValue.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Requested Start</label>
            <input
              type="datetime-local"
              value={reservationForm.requested_start}
              onChange={(eventValue) =>
                setReservationForm((current) => ({ ...current, requested_start: eventValue.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Requested End</label>
            <input
              type="datetime-local"
              value={reservationForm.requested_end}
              onChange={(eventValue) =>
                setReservationForm((current) => ({ ...current, requested_end: eventValue.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Reservation Notes</label>
            <textarea
              rows={3}
              value={reservationForm.notes}
              onChange={(eventValue) =>
                setReservationForm((current) => ({ ...current, notes: eventValue.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={() => void handleCreateReservation()}
            disabled={creating}
            className="px-4 py-2 bg-[#062E22] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a37] transition disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Reserve Venue'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-[#062E22]">Reservation Timeline</h2>
        {loadingReservations ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reservations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 mt-4">
            No venue reservations yet.
          </div>
        ) : (
          <div className="space-y-4 mt-5">
            {reservations.map((reservation) => (
              <div key={reservation.id} className="rounded-2xl border border-slate-200 p-5">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-semibold text-[#062E22]">{reservation.venue_name}</h3>
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${reservation.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {sentenceCase(reservation.status)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-2">{reservation.city}</p>
                    <p className="text-sm text-slate-500 mt-1">
                      {formatDateTime(reservation.requested_start)} to {formatDateTime(reservation.requested_end)}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      Estimated {formatCurrency(reservation.estimated_cost)} {reservation.final_cost ? `• Final ${formatCurrency(reservation.final_cost)}` : ''}
                    </p>
                    {reservation.notes ? <p className="text-sm text-slate-600 mt-3">{reservation.notes}</p> : null}
                  </div>
                  {reservation.status === 'confirmed' ? (
                    <div className="text-sm text-emerald-700 font-medium">Confirmed</div>
                  ) : (
                    <button
                      onClick={() => void handleConfirm(reservation.id)}
                      disabled={confirmingId === reservation.id}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
                    >
                      {confirmingId === reservation.id ? 'Confirming...' : 'Confirm Reservation'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </EventWorkspaceShell>
  );
}
