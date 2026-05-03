'use client';

import { useEffect, useState } from 'react';
import { Inbox, CheckCircle, XCircle, GitBranch } from 'lucide-react';
import Link from 'next/link';
import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import { VenueReservationRecord } from '@/app/types/event';
import { VenueReservationProviderResponsePayload } from '@/app/types/marketplace';
import marketplaceService from '@/app/services/marketplaceService';
import { formatDateTime } from '@/app/lib/marketplace';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  requested:           { label: 'Pending Response',  color: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  provider_accepted:   { label: 'You Accepted',      color: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  offered_alternative: { label: 'Alternative Sent',  color: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
  organizer_confirmed: { label: 'Org Confirmed',     color: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200' },
  confirmed:           { label: 'Confirmed',         color: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  declined:            { label: 'You Declined',      color: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
  cancelled:           { label: 'Cancelled',         color: 'bg-slate-100 text-slate-500' },
};

interface ResponseFormState {
  action: 'accept' | 'decline' | 'offer_alternative';
  response_notes: string;
  proposed_start: string;
  proposed_end: string;
  proposed_cost: string;
  proposed_deposit_amount: string;
}

function emptyResponseForm(): ResponseFormState {
  return { action: 'accept', response_notes: '', proposed_start: '', proposed_end: '', proposed_cost: '', proposed_deposit_amount: '' };
}

export default function VendorReservationInboxPage() {
  const [reservations, setReservations] = useState<VenueReservationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [forms, setForms] = useState<Record<string, ResponseFormState>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const loadReservations = async () => {
    try {
      setLoading(true);
      const data = await marketplaceService.listProviderReservations();
<<<<<<< HEAD
      console.log('[Vendor Reservations] API response:', data);
      setReservations(data);
    } catch (err) {
      console.error('[Vendor Reservations] Error:', err);
=======
      setReservations(data);
    } catch (err) {
>>>>>>> origin/venue-listing-backend
      setError(err instanceof Error ? err.message : 'Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadReservations(); }, []);

  const getForm = (id: string): ResponseFormState => forms[id] ?? emptyResponseForm();

  const updateForm = (id: string, patch: Partial<ResponseFormState>) => {
    setForms((f) => ({ ...f, [id]: { ...getForm(id), ...patch } }));
  };

  const handleRespond = async (reservationId: string) => {
    const form = getForm(reservationId);
    const payload: VenueReservationProviderResponsePayload = {
      action: form.action,
      response_notes: form.response_notes || undefined,
    };
    if (form.action !== 'accept') {
      if (form.proposed_start) payload.proposed_start = form.proposed_start;
      if (form.proposed_end) payload.proposed_end = form.proposed_end;
      if (form.proposed_cost) payload.proposed_cost = Number(form.proposed_cost);
      if (form.proposed_deposit_amount) payload.proposed_deposit_amount = Number(form.proposed_deposit_amount);
    }
    try {
      setSubmitting(reservationId);
      setError(null);
      await marketplaceService.respondToReservation(reservationId, payload);
      setRespondingId(null);
      await loadReservations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit response');
    } finally {
      setSubmitting(null);
    }
  };

  const pending = reservations.filter((r) => r.status === 'requested');
  const others = reservations.filter((r) => r.status !== 'requested');

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="vendor" />
      <DashboardHeader
        searchPlaceholder="Reservation inbox"
        actionHref="/vendor/venue-listings"
        actionLabel="My Listings"
      />

      <main className="pt-16 md:ml-60 p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <Link href="/vendor/venue-listings" className="text-xs text-slate-400 hover:text-[#062E22] transition">← My Listings</Link>
              <h1 className="text-3xl font-bold text-[#062E22] mt-1">Reservation Inbox</h1>
              <p className="text-slate-500 text-sm mt-0.5">Respond to venue reservation requests from organizers.</p>
            </div>
            {pending.length > 0 && (
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700">
                <Inbox className="w-4 h-4" />
                {pending.length} pending
              </span>
            )}
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          )}

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#062E22] border-t-transparent" />
            </div>
          ) : reservations.length === 0 ? (
            <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
              <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-[#062E22]">No reservation requests yet</h2>
              <p className="mt-2 text-sm text-slate-500">When organizers request your venues, they&apos;ll appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pending first */}
              {pending.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Pending Response</p>
                  <div className="space-y-4">
                    {pending.map((res) => {
                      const form = getForm(res.id);
                      const isOpen = respondingId === res.id;
                      return (
                        <div key={res.id} className="rounded-[28px] border border-amber-200 bg-white p-5 shadow-sm space-y-4">
                          {/* Info */}
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-bold text-[#062E22]">{res.venue_name}</p>
                              <p className="text-xs text-slate-400 mt-0.5">Event ID: {res.event_id}</p>
                            </div>
                            <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${STATUS_CONFIG.requested.color}`}>
                              {STATUS_CONFIG.requested.label}
                            </span>
                          </div>

                          <div className="grid gap-2 sm:grid-cols-2 text-sm">
                            <div className="rounded-xl bg-slate-50 p-3">
                              <p className="text-[10px] uppercase tracking-widest text-slate-400">Requested dates</p>
                              <p className="mt-1 font-medium text-slate-700">
                                {formatDateTime(res.requested_start)} → {formatDateTime(res.requested_end)}
                              </p>
                            </div>
                            {res.estimated_cost ? (
                              <div className="rounded-xl bg-slate-50 p-3">
                                <p className="text-[10px] uppercase tracking-widest text-slate-400">Estimated cost</p>
                                <p className="mt-1 font-medium text-slate-700">ETB {res.estimated_cost.toLocaleString()}</p>
                              </div>
                            ) : null}
                          </div>

                          {res.notes ? (
                            <div className="rounded-xl bg-slate-50 p-3 text-sm">
                              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Organizer notes</p>
                              <p className="text-slate-600">{res.notes}</p>
                            </div>
                          ) : null}

                          {/* Response */}
                          {!isOpen ? (
                            <button
                              onClick={() => setRespondingId(res.id)}
                              className="w-full py-2.5 bg-[#062E22] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a37] transition"
                            >
                              Respond to Request
                            </button>
                          ) : (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                              <p className="text-sm font-semibold text-[#062E22]">Your Response</p>

                              {/* Action selector */}
                              <div className="flex flex-wrap gap-2">
                                {(['accept', 'decline', 'offer_alternative'] as const).map((action) => (
                                  <button
                                    key={action}
                                    type="button"
                                    onClick={() => updateForm(res.id, { action })}
                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                                      form.action === action
                                        ? action === 'accept' ? 'bg-emerald-600 text-white'
                                          : action === 'decline' ? 'bg-red-600 text-white'
                                          : 'bg-orange-500 text-white'
                                        : 'border border-slate-200 text-slate-600 hover:bg-white'
                                    }`}
                                  >
                                    {action === 'accept' && <CheckCircle className="w-4 h-4" />}
                                    {action === 'decline' && <XCircle className="w-4 h-4" />}
                                    {action === 'offer_alternative' && <GitBranch className="w-4 h-4" />}
                                    {action === 'accept' ? 'Accept' : action === 'decline' ? 'Decline' : 'Offer Alternative'}
                                  </button>
                                ))}
                              </div>

                              {/* Notes */}
                              <div>
                                <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Response Notes</label>
                                <textarea
                                  rows={2}
                                  value={form.response_notes}
                                  onChange={(e) => updateForm(res.id, { response_notes: e.target.value })}
                                  placeholder="Explain your response…"
                                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20 bg-white"
                                />
                              </div>

                              {/* Proposed dates (decline / offer_alternative) */}
                              {form.action !== 'accept' && (
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div>
                                    <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Proposed Start</label>
                                    <input
                                      type="datetime-local"
<<<<<<< HEAD
                                      title="Proposed start"
=======
>>>>>>> origin/venue-listing-backend
                                      value={form.proposed_start}
                                      onChange={(e) => updateForm(res.id, { proposed_start: e.target.value })}
                                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#062E22]/20"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Proposed End</label>
                                    <input
                                      type="datetime-local"
<<<<<<< HEAD
                                      title="Proposed end"
=======
>>>>>>> origin/venue-listing-backend
                                      value={form.proposed_end}
                                      onChange={(e) => updateForm(res.id, { proposed_end: e.target.value })}
                                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#062E22]/20"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Proposed Cost (ETB)</label>
                                    <input
<<<<<<< HEAD
                                      type="number" min={0} title="Proposed cost"
=======
                                      type="number" min={0}
>>>>>>> origin/venue-listing-backend
                                      value={form.proposed_cost}
                                      onChange={(e) => updateForm(res.id, { proposed_cost: e.target.value })}
                                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#062E22]/20"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Proposed Deposit (ETB)</label>
                                    <input
<<<<<<< HEAD
                                      type="number" min={0} title="Proposed deposit amount"
=======
                                      type="number" min={0}
>>>>>>> origin/venue-listing-backend
                                      value={form.proposed_deposit_amount}
                                      onChange={(e) => updateForm(res.id, { proposed_deposit_amount: e.target.value })}
                                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#062E22]/20"
                                    />
                                  </div>
                                </div>
                              )}

                              <div className="flex gap-3 pt-1">
                                <button
                                  onClick={() => void handleRespond(res.id)}
                                  disabled={submitting === res.id}
                                  className="px-6 py-2.5 bg-[#062E22] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a37] transition disabled:opacity-50"
                                >
                                  {submitting === res.id ? 'Submitting…' : 'Submit Response'}
                                </button>
                                <button
                                  onClick={() => setRespondingId(null)}
                                  className="px-6 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-white transition"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Responded */}
              {others.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Responded</p>
                  <div className="space-y-3">
                    {others.map((res) => {
                      const cfg = STATUS_CONFIG[res.status] ?? { label: res.status, color: 'bg-slate-100 text-slate-500' };
                      return (
                        <div key={res.id} className="rounded-[24px] border border-slate-200 bg-white p-4 flex items-center justify-between gap-4">
                          <div>
                            <p className="font-semibold text-[#062E22]">{res.venue_name}</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {formatDateTime(res.requested_start)} → {formatDateTime(res.requested_end)}
                            </p>
                          </div>
                          <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
