'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Building2, UserCircle2, Mail, Plus, Trash2 } from 'lucide-react';
import { eventsService } from '@/app/services/eventsService';
import { VipReservationRecord, EventRecord } from '@/app/types/event';
import { EventWorkspaceShell } from '@/components/organizer/events';

export default function VipReservationsPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<EventRecord | null>(null);
  const [reservations, setReservations] = useState<VipReservationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const [form, setForm] = useState({
    vip_name: '',
    hotel_name: '',
    vip_email: '',
    notes: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [eventData, vipData] = await Promise.all([
          eventsService.getEventById(eventId),
          eventsService.listVipReservations(eventId)
        ]);
        setEvent(eventData);
        setReservations(vipData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load VIP reservations');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [eventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const newReservation = await eventsService.createVipReservation(eventId, form);
      setReservations(prev => [newReservation, ...prev]);
      setForm({ vip_name: '', hotel_name: '', vip_email: '', notes: '' });
    } catch (err) {
      console.error(err);
      alert('Failed to create VIP reservation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (reservationId: string) => {
    if (!confirm('Are you sure you want to delete this VIP reservation?')) return;
    try {
      setIsDeleting(reservationId);
      await eventsService.deleteVipReservation(eventId, reservationId);
      setReservations(prev => prev.filter(r => r.id !== reservationId));
    } catch (err) {
      console.error(err);
      alert('Failed to delete reservation');
    } finally {
      setIsDeleting(null);
    }
  };

  const aside = (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-[#062E22]">VIP Logistics Tracker</h2>
        <div className="space-y-3 mt-4 text-sm text-slate-600">
          <p>Easily manage hotel accommodations and transport logistics for your VIP speakers, ministers, and special guests.</p>
          <p>Providing an email will automatically dispatch a confirmation package directly to their office.</p>
        </div>
      </div>
    </div>
  );

  return (
    <EventWorkspaceShell
      event={event}
      loading={loading}
      error={error}
      activeTab="vip-reservations"
      aside={aside}
    >
      <div className="space-y-6">
        {/* Form Card */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
          <h2 className="text-lg font-black text-[#062E22] mb-6 flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#8CB988]" />
            Add VIP Reservation
          </h2>
          <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">VIP Name</label>
              <div className="relative">
                <UserCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={form.vip_name}
                  onChange={e => setForm({...form, vip_name: e.target.value})}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8CB988] transition-all"
                  placeholder="e.g. Hon. Minister"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Hotel Name</label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={form.hotel_name}
                  onChange={e => setForm({...form, hotel_name: e.target.value})}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8CB988] transition-all"
                  placeholder="e.g. Skylight Hotel"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">VIP Email (Optional)</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={form.vip_email}
                  onChange={e => setForm({...form, vip_email: e.target.value})}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8CB988] transition-all"
                  placeholder="e.g. minister@gov.et"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-[#062E22] hover:bg-[#0a4231] text-white rounded-2xl font-bold text-sm uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Confirm Reservation'}
              </button>
            </div>
          </form>
        </div>

        {/* List Card */}
        <div className="space-y-4">
          {reservations.length === 0 ? (
            <div className="bg-white rounded-[2rem] border border-slate-100 p-12 text-center shadow-sm">
              <Building2 className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-700 mb-2">No VIP Reservations</h3>
              <p className="text-slate-500 text-sm">Add your first VIP hotel booking using the form above.</p>
            </div>
          ) : (
            reservations.map(res => (
              <div key={res.id} className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm flex items-center justify-between group hover:border-[#8CB988]/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-[#062E22]">
                    <UserCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-[#062E22]">{res.vip_name}</h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        {res.hotel_name}
                      </span>
                      {res.vip_email && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-[#8CB988]">
                            <Mail className="w-4 h-4" />
                            Notified via Email
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(res.id)}
                  disabled={isDeleting === res.id}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-rose-500 hover:bg-rose-50 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </EventWorkspaceShell>
  );
}
