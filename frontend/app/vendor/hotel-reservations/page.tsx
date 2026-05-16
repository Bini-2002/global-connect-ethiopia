'use client';

import { useCallback, useEffect, useState } from 'react';
import { Building2, Loader2, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import { api } from '@/app/lib/api';

interface Room {
  room_index: number; vip_name: string; vip_email: string; room_type: string;
  bed_preference: string; floor_preference: string; smoking_preference: string;
  meal_plan: string; special_requests: string[]; notes?: string;
  assigned_room_number?: string;
}

interface HotelReservation {
  id: string; event_id: string; hotel_name: string;
  check_in_date: string; check_out_date: string; number_of_nights: number;
  total_amount: number; status: string; payment_status: string;
  hotel_response_note?: string; rooms: Room[]; created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending_hotel_review: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-emerald-100 text-emerald-800',
  payment_released: 'bg-blue-100 text-blue-800',
};

export default function HotelRoomReservationsPage() {
  const [reservations, setReservations] = useState<HotelReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Record<string, Record<number, string>>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.get<HotelReservation[]>('/vendors/hotel-room-reservations/incoming');
      setReservations(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load reservations');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const setRoomNumber = (reservationId: string, roomIndex: number, value: string) => {
    setAssignments(prev => ({
      ...prev,
      [reservationId]: { ...(prev[reservationId] || {}), [roomIndex]: value },
    }));
  };

  const handleRespond = async (reservation: HotelReservation) => {
    const roomAssignments = Object.entries(assignments[reservation.id] || {})
      .map(([idx, num]) => ({ room_index: parseInt(idx), assigned_room_number: num }))
      .filter(a => a.assigned_room_number.trim());

    if (roomAssignments.length === 0) {
      setError('Please enter at least one room number before submitting.');
      return;
    }
    setSubmitting(reservation.id);
    setSuccess(null);
    setError('');
    try {
      await api.patch(`/vendors/hotel-room-reservations/${reservation.id}/respond`, {
        room_assignments: roomAssignments,
        hotel_response_note: notes[reservation.id] || undefined,
      });
      setSuccess(`Reservation ${reservation.id.slice(0, 8)}… updated. Organizer has been notified.`);
      setAssignments(prev => { const n = { ...prev }; delete n[reservation.id]; return n; });
      setNotes(prev => { const n = { ...prev }; delete n[reservation.id]; return n; });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit room assignments');
    } finally { setSubmitting(null); }
  };

  const pendingCount = reservations.filter(r => r.status === 'pending_hotel_review').length;

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="vendor" />
      <DashboardHeader searchPlaceholder="Search reservations…" actionHref="/vendor/dashboard" actionLabel="Dashboard" />

      <main className="pt-16 md:ml-60 p-6">
        <div className="mx-auto max-w-5xl space-y-6">

          {/* Header */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#0a4a37]">Hotel Portal</p>
              <h1 className="mt-1 text-3xl font-bold text-[#062E22]">VIP Room Reservations</h1>
              <p className="mt-2 text-sm text-slate-500 max-w-2xl">
                Review incoming VIP room requests from organizers. Assign room numbers to each guest and submit your confirmation.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {pendingCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-800 px-3 py-1.5 text-sm font-bold">
                  {pendingCount} Pending
                </span>
              )}
            </div>
          </div>

          {error && (
            <div className="flex gap-2 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}
            </div>
          )}
          {success && (
            <div className="flex gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />{success}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-[#062E22]" />
            </div>
          ) : reservations.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-16 text-center">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="font-semibold text-slate-500">No reservation requests yet</p>
              <p className="text-sm text-slate-400 mt-1">When an organizer requests VIP rooms from your hotel, they will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reservations.map(r => {
                const isOpen = expanded === r.id;
                const isCompleted = r.status === 'payment_released';
                return (
                  <div key={r.id} className={`rounded-3xl border bg-white shadow-sm overflow-hidden transition ${isCompleted ? 'border-blue-200' : r.status === 'confirmed' ? 'border-emerald-200' : 'border-slate-200'}`}>
                    {/* Card Header */}
                    <button className="w-full text-left p-6" onClick={() => setExpanded(isOpen ? null : r.id)}>
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className={`text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full ${STATUS_COLORS[r.status] || 'bg-slate-100 text-slate-600'}`}>
                              {r.status.replace(/_/g, ' ')}
                            </span>
                            <span className={`text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full ${r.payment_status === 'released' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                              {r.payment_status}
                            </span>
                          </div>
                          <p className="font-bold text-[#062E22] text-lg">{r.hotel_name}</p>
                          <p className="text-sm text-slate-500 mt-1">
                            Check-in: <strong>{r.check_in_date}</strong> → Check-out: <strong>{r.check_out_date}</strong> · {r.number_of_nights} night(s)
                          </p>
                          <p className="text-sm text-slate-500">{r.rooms.length} room(s) · ETB {r.total_amount.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400">
                          <span className="text-xs hidden sm:block">{isOpen ? 'Hide details' : 'View & respond'}</span>
                          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </div>
                    </button>

                    {/* Expanded Details */}
                    {isOpen && (
                      <div className="px-6 pb-6 border-t border-slate-100 pt-5 space-y-5">
                        {/* Rooms */}
                        <div className="space-y-4">
                          {r.rooms.map(rm => (
                            <div key={rm.room_index} className="rounded-2xl bg-slate-50 border border-slate-200 p-5">
                              <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                                <div>
                                  <p className="text-sm font-bold text-[#062E22]">Room {rm.room_index + 1} – {rm.vip_name}</p>
                                  <p className="text-xs text-slate-500">{rm.vip_email}</p>
                                </div>
                                {rm.assigned_room_number && (
                                  <span className="text-sm font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                                    Assigned: {rm.assigned_room_number}
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs mb-4">
                                {[
                                  ['Room Type', rm.room_type],
                                  ['Meal Plan', rm.meal_plan.replace(/_/g, ' ')],
                                  ['Bed', rm.bed_preference.replace(/_/g, ' ')],
                                  ['Floor', rm.floor_preference.replace(/_/g, ' ')],
                                  ['Smoking', rm.smoking_preference],
                                ].map(([label, val]) => (
                                  <div key={label} className="bg-white rounded-lg border border-slate-200 p-2">
                                    <p className="text-slate-400 uppercase tracking-wide text-[10px] font-semibold">{label}</p>
                                    <p className="font-semibold text-slate-700 mt-0.5 capitalize">{val}</p>
                                  </div>
                                ))}
                              </div>
                              {rm.special_requests.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-4">
                                  {rm.special_requests.map(sr => (
                                    <span key={sr} className="bg-blue-100 text-blue-700 text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize">
                                      {sr.replace(/_/g, ' ')}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {rm.notes && <p className="text-xs text-slate-500 italic mb-4">Guest note: {rm.notes}</p>}

                              {!isCompleted && (
                                <div>
                                  <label className="text-sm font-semibold text-slate-700 block mb-1.5">
                                    Assign Room Number
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. 412 – Executive Floor"
                                    value={assignments[r.id]?.[rm.room_index] ?? rm.assigned_room_number ?? ''}
                                    onChange={e => setRoomNumber(r.id, rm.room_index, e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20"
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {!isCompleted && (
                          <>
                            <div>
                              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Response Note (optional)</label>
                              <textarea rows={2} value={notes[r.id] || ''}
                                onChange={e => setNotes(prev => ({ ...prev, [r.id]: e.target.value }))}
                                placeholder="e.g. Rooms on the 4th floor, express check-in arranged."
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20" />
                            </div>
                            <div className="flex justify-end">
                              <button onClick={() => void handleRespond(r)} disabled={submitting === r.id}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-[#062E22] text-white rounded-xl text-sm font-bold hover:bg-[#0a4a37] transition disabled:opacity-60">
                                {submitting === r.id
                                  ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</>
                                  : <><CheckCircle2 className="w-4 h-4" />Confirm Room Assignments</>}
                              </button>
                            </div>
                          </>
                        )}

                        {isCompleted && (
                          <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-700 font-semibold text-center">
                            ✓ Payment has been released to your wallet. This reservation is complete.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
