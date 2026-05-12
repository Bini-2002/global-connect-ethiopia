'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  Hotel,
  Mail,
  User,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  CalendarRange,
  Plus,
  BedDouble,
} from 'lucide-react';
import { useEventWorkspace } from '@/app/hooks/useEventWorkspace';
import { EventWorkspaceShell } from '@/components/organizer/events';
import { api } from '@/app/lib/api';

interface VipReservation {
  id: string;
  event_id: string;
  vip_name: string;
  vip_email: string;
  hotel_name: string;
  hotel_address?: string | null;
  check_in_date: string;
  check_out_date: string;
  room_type?: string | null;
  notes?: string | null;
  status: string;
  created_at: string;
}

const emptyForm = {
  vip_name: '',
  vip_email: '',
  hotel_name: '',
  hotel_address: '',
  check_in_date: '',
  check_out_date: '',
  room_type: '',
  notes: '',
};

export default function VipReservationsPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { event, loading, error, setError } = useEventWorkspace(eventId);

  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState(false);
  const [reservations, setReservations] = useState<VipReservation[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadReservations = useCallback(async () => {
    try {
      setLoadingList(true);
      const data = await api.get<VipReservation[]>(`/events/${eventId}/vip-reservations`);
      setReservations(data);
    } catch {
      // silent
    } finally {
      setLoadingList(false);
    }
  }, [eventId]);

  useEffect(() => { void loadReservations(); }, [loadReservations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.vip_name || !form.vip_email || !form.hotel_name || !form.check_in_date || !form.check_out_date) {
      setFormError('VIP name, email, hotel name, and dates are required.');
      return;
    }
    setSubmitting(true);
    setSuccess(false);
    try {
      await api.post(`/events/${eventId}/vip-reservations`, {
        ...form,
        hotel_address: form.hotel_address || undefined,
        room_type: form.room_type || undefined,
        notes: form.notes || undefined,
      });
      setSuccess(true);
      setForm(emptyForm);
      void loadReservations();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create reservation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await api.delete(`/events/${eventId}/vip-reservations/${id}`);
      setReservations((prev) => prev.filter((r) => r.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to cancel reservation.');
    } finally {
      setDeleting(null);
    }
  };

  const f = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <EventWorkspaceShell
      event={event}
      loading={loading}
      error={error}
      activeTab="vip"
      aside={
        <div className="space-y-4">
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
            <h3 className="font-bold text-[#062E22] text-sm uppercase tracking-wide">Summary</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#062E22] text-white p-4">
                <p className="text-[11px] uppercase tracking-wide text-white/60">Total VIPs</p>
                <p className="mt-1 text-2xl font-bold">{reservations.length}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Confirmed</p>
                <p className="mt-1 text-2xl font-bold text-[#062E22]">
                  {reservations.filter((r) => r.status === 'confirmed').length}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 text-sm text-amber-800">
            <p className="font-semibold mb-1">Email delivery</p>
            <p className="text-[13px] text-amber-700/80">A confirmation email is sent directly to each VIP when you create their reservation — no app login required.</p>
          </div>
        </div>
      }
    >
      {/* Form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center">
            <Hotel className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#062E22]">Add VIP Hotel Reservation</h2>
            <p className="text-sm text-slate-500">The VIP will receive a confirmation email immediately.</p>
          </div>
        </div>

        {formError && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{formError}
          </div>
        )}
        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 font-semibold">
            <CheckCircle2 className="w-4 h-4" />Reservation confirmed and email sent to VIP.
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> VIP Full Name</label>
              <input required value={form.vip_name} onChange={f('vip_name')} placeholder="Dr. Lemma Megersa" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> VIP Email</label>
              <input required type="email" value={form.vip_email} onChange={f('vip_email')} placeholder="vip@example.com" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5"><Hotel className="w-3.5 h-3.5" /> Hotel Name</label>
              <input required value={form.hotel_name} onChange={f('hotel_name')} placeholder="Skylight Hotel Addis" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5"><BedDouble className="w-3.5 h-3.5" /> Room Type (optional)</label>
              <input value={form.room_type} onChange={f('room_type')} placeholder="Executive Suite" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5"><CalendarRange className="w-3.5 h-3.5" /> Check-in Date</label>
              <input required type="date" value={form.check_in_date} onChange={f('check_in_date')} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5"><CalendarRange className="w-3.5 h-3.5" /> Check-out Date</label>
              <input required type="date" value={form.check_out_date} onChange={f('check_out_date')} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Hotel Address (optional)</label>
            <input value={form.hotel_address} onChange={f('hotel_address')} placeholder="Bole Road, Addis Ababa" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Notes (optional)</label>
            <textarea value={form.notes} onChange={f('notes')} rows={2} placeholder="Late check-in requested, airport transfer included…" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20" />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#062E22] text-white rounded-xl text-sm font-bold hover:bg-[#0a4a37] transition disabled:opacity-60">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {submitting ? 'Confirming…' : 'Confirm Reservation'}
            </button>
          </div>
        </form>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-[#062E22] mb-5">VIP Reservations</h2>
        {loadingList ? (
          <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" /></div>
        ) : reservations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">No VIP reservations yet.</div>
        ) : (
          <div className="space-y-3">
            {reservations.map((r) => (
              <div key={r.id} className="rounded-2xl border border-slate-200 p-5 flex items-start justify-between gap-4 hover:bg-slate-50 transition">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-[#062E22]">{r.vip_name}</p>
                    <span className="text-xs text-slate-400">{r.vip_email}</span>
                    <span className="rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-0.5 text-[11px] font-bold uppercase">{r.status}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-600">
                    <span className="flex items-center gap-1.5"><Hotel className="w-3.5 h-3.5 text-slate-400" />{r.hotel_name}{r.room_type ? ` · ${r.room_type}` : ''}</span>
                    <span className="flex items-center gap-1.5"><CalendarRange className="w-3.5 h-3.5 text-slate-400" />{r.check_in_date} → {r.check_out_date}</span>
                  </div>
                  {r.notes && <p className="mt-1.5 text-xs text-slate-400 italic">{r.notes}</p>}
                </div>
                <button
                  onClick={() => void handleDelete(r.id)}
                  disabled={deleting === r.id}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-60"
                  title="Cancel reservation"
                >
                  {deleting === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </EventWorkspaceShell>
  );
}
