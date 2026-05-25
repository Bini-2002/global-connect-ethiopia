'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  UserPlus,
  Mail,
  User,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  QrCode,
  Search,
} from 'lucide-react';
import { useEventWorkspace } from '@/app/hooks/useEventWorkspace';
import { EventWorkspaceShell } from '@/components/organizer/events';
import { api } from '@/app/lib/api';
import type { EventBookingRecord } from '@/app/types/event';

interface ManualRegistrationResult {
  id: string;
  booking_reference: string;
  attendee_name?: string | null;
  attendee_email?: string | null;
  qr_code?: string | null;
  booking_status: string;
  created_at: string;
}

function timeAgo(str: string) {
  const diff = Date.now() - new Date(str).getTime();
  const hrs = Math.floor(diff / 3_600_000);
  if (hrs < 1) return 'just now';
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ManualAttendeesPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { event, loading, error, setError } = useEventWorkspace(eventId);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<ManualRegistrationResult | null>(null);
  const [formError, setFormError] = useState('');

  // Registered attendees list
  const [attendees, setAttendees] = useState<EventBookingRecord[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(true);
  const [attendeesError, setAttendeesError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadAttendees = useCallback(async () => {
    try {
      setLoadingAttendees(true);
      setAttendeesError(null);
      const data = await api.get<EventBookingRecord[]>(`/events/${eventId}/bookings`);
      setAttendees(data);
    } catch (err: unknown) {
      setAttendeesError(err instanceof Error ? err.message : 'Unable to load attendee bookings.');
      setAttendees([]);
    } finally {
      setLoadingAttendees(false);
    }
  }, [eventId]);

  useEffect(() => {
    void loadAttendees();
  }, [loadAttendees]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setFormError('Name and email are required.');
      return;
    }
    setFormError('');
    setSubmitting(true);
    setSuccess(null);
    try {
      const result = await api.post<ManualRegistrationResult>(
        `/events/${eventId}/attendees/manual`,
        { attendee_name: name.trim(), attendee_email: email.trim().toLowerCase(), notes: notes.trim() || undefined }
      );
      setSuccess(result);
      setName('');
      setEmail('');
      setNotes('');
      void loadAttendees();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAttendees = attendees.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (a.attendee_name || '').toLowerCase().includes(q) ||
      (a.attendee_email || '').toLowerCase().includes(q) ||
      (a.booking_reference || '').toLowerCase().includes(q)
    );
  });

  const manualCount = attendees.filter((a) => (a as EventBookingRecord & { registration_type?: string }).registration_type === 'manual').length;

  return (
    <EventWorkspaceShell
      event={event}
      loading={loading}
      error={error}
      activeTab="attendees"
      aside={
        <div className="space-y-5">
          {/* Stats */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-[#062E22] uppercase tracking-wide">Attendee Summary</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Total</p>
                <p className="mt-1 text-2xl font-bold text-[#062E22]">{attendees.length}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-4">
                <p className="text-[11px] uppercase tracking-wide text-emerald-500">Manual</p>
                <p className="mt-1 text-2xl font-bold text-emerald-700">{manualCount}</p>
              </div>
              <div className="rounded-xl bg-blue-50 p-4">
                <p className="text-[11px] uppercase tracking-wide text-blue-400">Confirmed</p>
                <p className="mt-1 text-2xl font-bold text-blue-700">
                  {attendees.filter((a) => a.booking_status === 'confirmed').length}
                </p>
              </div>
              <div className="rounded-xl bg-amber-50 p-4">
                <p className="text-[11px] uppercase tracking-wide text-amber-500">Checked In</p>
                <p className="mt-1 text-2xl font-bold text-amber-700">
                  {attendees.filter((a) => a.check_in_status === 'checked_in').length}
                </p>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="rounded-2xl bg-[#062E22]/5 border border-[#062E22]/15 p-5 text-sm text-[#062E22]">
            <p className="font-semibold mb-2">How manual registration works</p>
            <ul className="space-y-1.5 text-[#062E22]/70 text-[13px] list-disc list-inside">
              <li>Fill in the attendee's name and email</li>
              <li>A confirmed booking and QR code are generated instantly</li>
              <li>A confirmation email is sent to the attendee</li>
              <li>They can use the QR code for check-in on the day</li>
            </ul>
          </div>
        </div>
      }
    >
      {/* Registration Form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-[#062E22]/10 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-[#062E22]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#062E22]">Register an Attendee</h2>
            <p className="text-sm text-slate-500">Manually add someone to this event's attendee list.</p>
          </div>
        </div>

        {formError && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {formError}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
            <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
              <CheckCircle2 className="w-4 h-4" />
              Registered successfully!
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-white border border-emerald-100 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Booking Ref</p>
                <p className="mt-1 font-mono font-bold text-[#062E22] text-sm">{success.booking_reference}</p>
              </div>
              <div className="rounded-lg bg-white border border-emerald-100 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">QR Code</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <QrCode className="w-4 h-4 text-[#062E22]" />
                  <p className="font-mono font-bold text-[#062E22] text-sm truncate">{success.qr_code}</p>
                </div>
              </div>
            </div>
            <p className="mt-2 text-xs text-emerald-700/70">A confirmation email has been sent to the attendee.</p>
          </div>
        )}

        <form onSubmit={(e) => void handleRegister(e)} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Abebe Girma"
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="abebe@example.com"
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. VIP guest, special accessibility needs…"
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20"
            />
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#062E22] text-white rounded-xl text-sm font-bold hover:bg-[#0a4a37] transition disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {submitting ? 'Registering…' : 'Register Attendee'}
            </button>
          </div>
        </form>
      </div>

      {/* Attendee List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between gap-4 mb-5">
          <h2 className="text-lg font-bold text-[#062E22]">All Registered Attendees</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, ref…"
              className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-[#062E22]/20"
            />
          </div>
        </div>

        {loadingAttendees ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : attendeesError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-10 text-center text-sm text-amber-800">
            <p className="font-semibold">Unable to load attendee list.</p>
            <p className="mt-2">{attendeesError}</p>
          </div>
        ) : filteredAttendees.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
            {search ? 'No attendees match your search.' : 'No attendees registered yet.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Name</th>
                  <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Email</th>
                  <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Ref</th>
                  <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Check-in</th>
                  <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAttendees.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-medium text-[#062E22]">{a.attendee_name || '—'}</td>
                    <td className="py-3 px-4 text-slate-500">{a.attendee_email || '—'}</td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs bg-slate-100 rounded px-2 py-0.5">{a.booking_reference}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                        a.booking_status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                        a.booking_status === 'pending_confirmation' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {a.booking_status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                        a.check_in_status === 'checked_in' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {a.check_in_status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">{timeAgo(a.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </EventWorkspaceShell>
  );
}
