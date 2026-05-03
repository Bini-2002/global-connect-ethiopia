'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Building2, Search, MapPin, Users, DollarSign } from 'lucide-react';
import { useEventWorkspace } from '@/app/hooks/useEventWorkspace';
import { eventsService } from '@/app/services/eventsService';
import {
  VenueListingSearchResponse,
  VenueReservationRecord,
  VenueReservationPaymentStatus,
} from '@/app/types/event';
import {
  EventWorkspaceShell,
  formatCurrency,
  formatDateTime,
  startOfInputDateTime,
} from '@/components/organizer/events';

// ─── Status helpers ───────────────────────────────────────────────────────────

const RESERVATION_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  requested:           { label: 'Awaiting Provider',     color: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  provider_accepted:   { label: 'Provider Accepted',     color: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  offered_alternative: { label: 'Alternative Offered',   color: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
  organizer_confirmed: { label: 'You Confirmed',         color: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200' },
  confirmed:           { label: 'Confirmed',             color: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  declined:            { label: 'Declined',              color: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
  cancelled:           { label: 'Cancelled',             color: 'bg-slate-100 text-slate-500' },
};

const DEPOSIT_CONFIG: Record<VenueReservationPaymentStatus, { label: string; color: string }> = {
  not_required:   { label: 'No Deposit Required', color: 'bg-slate-100 text-slate-500' },
  deposit_pending: { label: 'Deposit Pending',    color: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  deposit_funded: { label: 'Deposit Funded',      color: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200' },
  satisfied:      { label: 'Deposit Satisfied',   color: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
};

function ReservationStatusBadge({ status }: { status: string }) {
  const cfg = RESERVATION_STATUS_CONFIG[status] ?? { label: status, color: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ReservationFormState {
  venue_listing_id: string;
  venue_name_display: string;
  requested_start: string;
  requested_end: string;
  estimated_cost: string;
  notes: string;
}

function createReservationForm(): ReservationFormState {
  return { venue_listing_id: '', venue_name_display: '', requested_start: '', requested_end: '', estimated_cost: '', notes: '' };
}

export default function EventVenuePage() {
  const params = useParams();
  const eventId = params.id as string;
  const { event, loading, error, setError } = useEventWorkspace(eventId);

  const [reservations, setReservations] = useState<VenueReservationRecord[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(true);
  const [searchCity, setSearchCity] = useState('');
  const [searchResults, setSearchResults] = useState<VenueListingSearchResponse[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [depositId, setDepositId] = useState<string | null>(null);
  const [reservationForm, setReservationForm] = useState<ReservationFormState>(createReservationForm());

  const loadReservations = async () => {
    try {
      setLoadingReservations(true);
      const response = await eventsService.getVenueReservations(eventId);
      setReservations(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load venue reservations');
    } finally {
      setLoadingReservations(false);
    }
  };

  useEffect(() => { void loadReservations(); }, [eventId]);

  useEffect(() => {
    if (!event) return;
    const defaultCity = event.office_assignments?.municipal?.city || event.location || '';
    const baseDate = startOfInputDateTime(event.start_date);
    setSearchCity((c) => c || defaultCity);
    setReservationForm((current) =>
      current.venue_listing_id || current.requested_start ? current : {
        ...current,
        requested_start: baseDate,
        requested_end: startOfInputDateTime(event.end_date) || baseDate,
      }
    );
  }, [event]);

  const confirmedReservation = useMemo(
    () => reservations.find((r) => r.status === 'confirmed' || r.status === 'organizer_confirmed') || null,
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

  const selectVenueListing = (listing: VenueListingSearchResponse) => {
    setReservationForm((f) => ({
      ...f,
      venue_listing_id: listing.id,
      venue_name_display: listing.venue_name,
      estimated_cost: listing.estimated_cost ? String(listing.estimated_cost) : f.estimated_cost,
    }));
  };

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reservationForm.venue_listing_id) {
      setError('Please select a venue from the search results first.');
      return;
    }
    try {
      setCreating(true);
      setError(null);
      await eventsService.createVenueReservation(eventId, {
        venue_listing_id: reservationForm.venue_listing_id,
        requested_start: reservationForm.requested_start,
        requested_end: reservationForm.requested_end,
        estimated_cost: reservationForm.estimated_cost ? Number(reservationForm.estimated_cost) : undefined,
        notes: reservationForm.notes || undefined,
      });
      setReservationForm(createReservationForm());
      setSearchResults([]);
      await loadReservations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create reservation');
    } finally {
      setCreating(false);
    }
  };

  const handleConfirm = async (reservationId: string) => {
    try {
      setConfirmingId(reservationId);
      setError(null);
      await eventsService.confirmVenueReservation(eventId, reservationId, {});
      await loadReservations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm reservation');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleCancel = async (reservationId: string) => {
    if (!confirm('Cancel this reservation request?')) return;
    try {
      setCancellingId(reservationId);
      setError(null);
      await eventsService.cancelVenueReservation(eventId, reservationId, {});
      await loadReservations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel reservation');
    } finally {
      setCancellingId(null);
    }
  };

  const handleDepositUpdate = async (
    reservationId: string,
    status: VenueReservationPaymentStatus
  ) => {
    try {
      setDepositId(reservationId);
      setError(null);
      await eventsService.updateVenueReservationDeposit(eventId, reservationId, {
        payment_milestone_status: status,
      });
      await loadReservations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update deposit');
    } finally {
      setDepositId(null);
    }
  };

  return (
    <EventWorkspaceShell eventId={eventId} activeTab="venue" event={event} loading={loading} error={error}>
      <div className="space-y-8">

        {/* ─── Confirmed banner ─── */}
        {confirmedReservation && (
          <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-semibold text-emerald-800">Venue confirmed: {confirmedReservation.venue_name}</p>
                <p className="text-sm text-emerald-700 mt-0.5">
                  {confirmedReservation.city} · {formatDateTime(confirmedReservation.agreed_start ?? confirmedReservation.requested_start)} →{' '}
                  {formatDateTime(confirmedReservation.agreed_end ?? confirmedReservation.requested_end)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ─── Venue Search ─── */}
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0a4a37]">Step 1</p>
          <h2 className="mt-1 text-2xl font-bold text-[#062E22]">Search Available Venues</h2>
          <p className="mt-2 text-sm text-slate-500">Search real venue listings. Select one to pre-fill the reservation form.</p>

          <div className="mt-5 flex gap-3">
            <input
              type="text"
              value={searchCity}
              onChange={(e) => setSearchCity(e.target.value)}
              placeholder="Filter by city (e.g. Addis Ababa)"
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20"
            />
            <button
              onClick={() => void handleSearch()}
              disabled={searching}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#062E22] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a37] transition disabled:opacity-60"
            >
              <Search className="w-4 h-4" />
              {searching ? 'Searching…' : 'Search'}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {searchResults.map((listing) => {
                const isSelected = reservationForm.venue_listing_id === listing.id;
                return (
                  <button
                    key={listing.id}
                    onClick={() => selectVenueListing(listing)}
                    className={`text-left rounded-2xl border p-4 transition hover:shadow-sm ${
                      isSelected
                        ? 'border-[#062E22] bg-[#F5FBF8] ring-2 ring-[#062E22]/20'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-[#062E22]">{listing.venue_name}</p>
                      {!listing.is_reservable && (
                        <span className="text-[10px] font-bold uppercase text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Not reservable</span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{listing.city}{listing.location ? `, ${listing.location}` : ''}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />Cap: {listing.capacity.toLocaleString()}</span>
                      {listing.estimated_cost ? (
                        <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{formatCurrency(listing.estimated_cost)}</span>
                      ) : null}
                    </div>
                    {listing.description ? (
                      <p className="mt-2 text-xs text-slate-400 line-clamp-2">{listing.description}</p>
                    ) : null}
                    {isSelected && (
                      <p className="mt-2 text-xs font-semibold text-[#0a4a37]">✓ Selected</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── Reservation Form ─── */}
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0a4a37]">Step 2</p>
          <h2 className="mt-1 text-2xl font-bold text-[#062E22]">Request Reservation</h2>
          {reservationForm.venue_name_display ? (
            <p className="mt-2 text-sm text-emerald-700 font-medium">Selected: {reservationForm.venue_name_display}</p>
          ) : (
            <p className="mt-2 text-sm text-slate-400 italic">Select a venue from search results above first.</p>
          )}

          <form onSubmit={(e) => void handleCreateReservation(e)} className="mt-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Start Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  title="Start date and time"
                  value={reservationForm.requested_start}
                  onChange={(e) => setReservationForm((f) => ({ ...f, requested_start: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">End Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  title="End date and time"
                  value={reservationForm.requested_end}
                  onChange={(e) => setReservationForm((f) => ({ ...f, requested_end: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Estimated Cost (ETB, optional)</label>
              <input
                type="number"
                min="0"
                value={reservationForm.estimated_cost}
                onChange={(e) => setReservationForm((f) => ({ ...f, estimated_cost: e.target.value }))}
                placeholder="50000"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5">Notes (optional)</label>
              <textarea
                rows={3}
                value={reservationForm.notes}
                onChange={(e) => setReservationForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Any special requirements…"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20"
              />
            </div>
            <button
              type="submit"
              disabled={creating || !reservationForm.venue_listing_id}
              className="w-full rounded-xl bg-[#062E22] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0a4a37] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Sending request…' : 'Send Reservation Request'}
            </button>
          </form>
        </div>

        {/* ─── Reservations List ─── */}
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0a4a37]">Step 3</p>
          <h2 className="mt-1 text-2xl font-bold text-[#062E22]">Reservation Status</h2>
          <p className="mt-2 text-sm text-slate-500">Track the handshake with each venue provider.</p>

          {loadingReservations ? (
            <div className="flex justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#062E22] border-t-transparent" />
            </div>
          ) : reservations.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-200 p-8 text-center">
              <p className="text-slate-400 text-sm">No reservations yet. Use the form above to request a venue.</p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {reservations.map((res) => (
                <div key={res.id} className="rounded-2xl border border-slate-200 p-5 space-y-4">
                  {/* Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-[#062E22]">{res.venue_name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{res.city}{res.location ? ` · ${res.location}` : ''}</p>
                    </div>
                    <ReservationStatusBadge status={res.status} />
                  </div>

                  {/* Dates */}
                  <div className="grid gap-3 sm:grid-cols-2 text-sm">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[10px] uppercase tracking-widest text-slate-400">Requested</p>
                      <p className="mt-1 font-medium text-slate-700">
                        {formatDateTime(res.requested_start)} → {formatDateTime(res.requested_end)}
                      </p>
                    </div>
                    {(res.agreed_start || res.proposed_start) && (
                      <div className={`rounded-xl p-3 ${res.agreed_start ? 'bg-emerald-50' : 'bg-orange-50'}`}>
                        <p className="text-[10px] uppercase tracking-widest text-slate-400">
                          {res.agreed_start ? 'Agreed' : 'Proposed by Provider'}
                        </p>
                        <p className="mt-1 font-medium text-slate-700">
                          {formatDateTime(res.agreed_start ?? res.proposed_start)} → {formatDateTime(res.agreed_end ?? res.proposed_end)}
                        </p>
                        {(res.agreed_cost ?? res.proposed_cost) ? (
                          <p className="mt-1 text-xs text-slate-500">
                            Cost: {formatCurrency(res.agreed_cost ?? res.proposed_cost)}
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* Provider response notes */}
                  {res.provider_response_notes && (
                    <div className="rounded-xl bg-slate-50 p-3 text-sm">
                      <p className="text-[10px] uppercase tracking-widest text-slate-400">Provider note</p>
                      <p className="mt-1 text-slate-600">{res.provider_response_notes}</p>
                    </div>
                  )}

                  {/* Failure / decline reason */}
                  {res.failure_reason && (
                    <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-700">
                      <p className="text-[10px] uppercase tracking-widest text-red-400 mb-1">Decline reason</p>
                      {res.failure_reason}
                    </div>
                  )}

                  {/* Alternative suggestions when declined */}
                  {res.alternative_suggestions && res.alternative_suggestions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Alternative venues suggested by provider:</p>
                      {res.alternative_suggestions.map((alt) => (
                        <button
                          key={alt.id}
                          onClick={() => selectVenueListing(alt)}
                          className="w-full text-left rounded-xl border border-slate-200 bg-slate-50 p-3 hover:border-[#062E22] hover:bg-[#F5FBF8] transition text-sm"
                        >
                          <p className="font-semibold text-[#062E22]">{alt.venue_name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{alt.city} · Cap: {alt.capacity.toLocaleString()}{alt.estimated_cost ? ` · ${formatCurrency(alt.estimated_cost)}` : ''}</p>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Deposit milestone */}
                  {(res.status === 'organizer_confirmed' || res.status === 'confirmed') && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-slate-400">Deposit</p>
                          <span className={`inline-flex mt-1 items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${DEPOSIT_CONFIG[res.payment_milestone_status]?.color ?? ''}`}>
                            {DEPOSIT_CONFIG[res.payment_milestone_status]?.label ?? res.payment_milestone_status}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          {res.payment_milestone_status === 'deposit_pending' && (
                            <button
                              onClick={() => void handleDepositUpdate(res.id, 'deposit_funded')}
                              disabled={depositId === res.id}
                              className="px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700 transition disabled:opacity-50"
                            >
                              {depositId === res.id ? 'Updating…' : 'Mark Deposit Paid'}
                            </button>
                          )}
                          {res.payment_milestone_status === 'deposit_funded' && (
                            <button
                              onClick={() => void handleDepositUpdate(res.id, 'satisfied')}
                              disabled={depositId === res.id}
                              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
                            >
                              {depositId === res.id ? 'Updating…' : 'Mark Satisfied'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(res.status === 'provider_accepted' || res.status === 'offered_alternative') && (
                      <button
                        onClick={() => void handleConfirm(res.id)}
                        disabled={confirmingId === res.id}
                        className="px-5 py-2 bg-[#062E22] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a37] transition disabled:opacity-50"
                      >
                        {confirmingId === res.id ? 'Confirming…' : 'Confirm This Venue'}
                      </button>
                    )}
                    {(res.status === 'requested' || res.status === 'provider_accepted' || res.status === 'offered_alternative') && (
                      <button
                        onClick={() => void handleCancel(res.id)}
                        disabled={cancellingId === res.id}
                        className="px-5 py-2 border border-red-200 bg-red-50 text-red-700 rounded-xl text-sm font-semibold hover:bg-red-100 transition disabled:opacity-50"
                      >
                        {cancellingId === res.id ? 'Cancelling…' : 'Cancel Request'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </EventWorkspaceShell>
  );
}
