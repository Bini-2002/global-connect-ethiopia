'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Ticket } from 'lucide-react';
import { eventsService } from '@/app/services/eventsService';
import { EventRecord, TicketTypeRecord, EventBookingRecord } from '@/app/types/event';
import { formatCurrency } from '@/components/organizer/events';

type CheckoutStep = 'details' | 'payment' | 'confirmation';

export default function TicketCheckoutPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const eventId = params.id as string;
  const ticketId = searchParams.get('ticket_id');

  const [event, setEvent] = useState<EventRecord | null>(null);
  const [ticketType, setTicketType] = useState<TicketTypeRecord | null>(null);
  const [booking, setBooking] = useState<EventBookingRecord | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [step, setStep] = useState<CheckoutStep>('details');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    attendee_name: '',
    attendee_email: '',
    quantity: 1,
    notes: '',
    attendee_profile: {} as Record<string, string>,
  });

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        setLoading(true);
        if (!ticketId) throw new Error('No ticket selected.');

        const [eventData, tickets] = await Promise.all([
          eventsService.getEventById(eventId),
          eventsService.getTicketTypes(eventId),
        ]);

        if (!active) return;

        const ticket = tickets.find((t) => t.id === ticketId);
        if (!ticket) throw new Error('Ticket type not found.');

        setEvent(eventData);
        setTicketType(ticket);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load checkout details.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadData();
    return () => { active = false; };
  }, [eventId, ticketId]);

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketType) return;
    
    try {
      setSubmitting(true);
      setError(null);
      
      const createdBooking = await eventsService.checkoutTicket(eventId, {
        ticket_type_id: ticketType.id,
        quantity: form.quantity,
        attendee_name: form.attendee_name || undefined,
        attendee_email: form.attendee_email || undefined,
        notes: form.notes || undefined,
        attendee_profile: form.attendee_profile,
      });

      setBooking(createdBooking);

      // All bookings are strictly free, auto-confirm immediately without showing payment step
      await handlePaymentConfirm(createdBooking.booking_reference);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize checkout.');
      setSubmitting(false);
    }
  };

  const handlePaymentConfirm = async (referenceId = 'FREE_BOOKING') => {
    try {
      setSubmitting(true);
      setError(null);
      
      const confirmedBooking = await eventsService.confirmTicketPayment(eventId, {
        payment_reference_id: referenceId,
        payment_method: 'free',
      });
      
      setBooking(confirmedBooking);
      setStep('confirmation');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm booking.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FBF9] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !ticketType) {
    return (
      <div className="min-h-screen bg-[#F8FBF9] p-8 flex justify-center">
        <div className="bg-white p-6 rounded-2xl border border-red-200 max-w-md w-full text-center">
          <p className="text-red-700">{error}</p>
          <Link href={`/events/${eventId}`} className="inline-block mt-4 text-[#062E22] font-semibold hover:underline">
            Back to event
          </Link>
        </div>
      </div>
    );
  }

  if (!event || !ticketType) return null;

  const totalAmount = ticketType.price * form.quantity;
  const requiredFields = event.required_attendee_fields || [];

  return (
    <main className="min-h-screen bg-[#F8FBF9] text-slate-900 pb-16">
      <section className="bg-white border-b border-slate-200 py-6">
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#0a4a37]">Secure Checkout</p>
            <h1 className="mt-1 text-2xl font-bold text-[#062E22]">{event.title}</h1>
          </div>
          <Link href={`/events/${eventId}`} className="text-sm font-semibold text-slate-500 hover:text-[#062E22]">
            Cancel
          </Link>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 mt-8">
        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-8">
          <div className={`h-2 flex-1 rounded-full ${step === 'details' ? 'bg-[#062E22]' : 'bg-[#062E22]/20'}`} />
          <div className={`h-2 flex-1 rounded-full ${step === 'payment' ? 'bg-[#062E22]' : step === 'confirmation' ? 'bg-[#062E22]/20' : 'bg-slate-200'}`} />
          <div className={`h-2 flex-1 rounded-full ${step === 'confirmation' ? 'bg-[#062E22]' : 'bg-slate-200'}`} />
        </div>

        <div className="bg-white rounded-[28px] border border-slate-200 shadow-sm overflow-hidden">
          {/* Order Summary Sidebar/Header */}
          <div className="bg-slate-50 border-b border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#062E22] text-white rounded-xl flex items-center justify-center">
                <Ticket className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-[#062E22]">{ticketType.name}</h3>
                <p className="text-sm text-slate-500">{form.quantity} x Free Booking</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Total Due</p>
              <p className="text-2xl font-black text-[#062E22]">Free</p>
            </div>
          </div>

          <div className="p-6 md:p-8">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {step === 'details' && (
              <form onSubmit={handleCheckoutSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      min={1}
                      max={Math.min(10, ticketType.remaining_quantity)}
                      value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) || 1 })}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-1 focus:ring-[#062E22]"
                    />
                    <p className="mt-1 text-xs text-slate-500">Remaining slots: {ticketType.remaining_quantity}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                    <input
                      required
                      type="text"
                      value={form.attendee_name}
                      onChange={(e) => setForm({ ...form, attendee_name: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-1 focus:ring-[#062E22]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                    <input
                      required
                      type="email"
                      value={form.attendee_email}
                      onChange={(e) => setForm({ ...form, attendee_email: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-1 focus:ring-[#062E22]"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Optional Notes</label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      rows={3}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-1 focus:ring-[#062E22]"
                    />
                  </div>

                  {requiredFields.map((field) => (
                    <div key={field} className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {field.replace(/_/g, ' ')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        value={form.attendee_profile[field] || ''}
                        onChange={(e) => setForm({
                          ...form,
                          attendee_profile: { ...form.attendee_profile, [field]: e.target.value }
                        })}
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-1 focus:ring-[#062E22]"
                      />
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full md:w-auto px-8 py-3 bg-[#062E22] text-white rounded-xl font-bold hover:bg-[#0a4a37] transition disabled:opacity-50"
                  >
                    {submitting ? 'Processing...' : (ticketType.price === 0 ? 'Complete Registration' : 'Continue to Payment')}
                  </button>
                </div>
              </form>
            )}

            {step === 'payment' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-[#062E22]/10 text-[#062E22] rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-[#062E22]">Payment Required</h3>
                <p className="mt-2 text-slate-500 max-w-sm mx-auto mb-8">
                  You will be securely redirected to Chapa to complete your payment of <strong>{formatCurrency(totalAmount)} {ticketType.currency}</strong>.
                </p>
                <div className="flex flex-col gap-4 max-w-xs mx-auto">
                  <button
                    onClick={() => handlePaymentConfirm(`TX-MOCK-${Date.now()}`)}
                    disabled={submitting}
                    className="w-full px-6 py-3 bg-[#062E22] text-white rounded-xl font-bold hover:bg-[#0a4a37] transition disabled:opacity-50"
                  >
                    {submitting ? 'Verifying...' : 'Pay with Chapa (Mock)'}
                  </button>
                </div>
              </div>
            )}

            {step === 'confirmation' && booking && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-[#062E22]">Booking Confirmed!</h3>
                <p className="mt-2 text-slate-500 mb-6">Your reference is <strong>{booking.booking_reference}</strong>.</p>
                
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 max-w-sm mx-auto mb-8 text-left">
                  <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                    <div className="text-slate-500">Name</div>
                    <div className="font-semibold text-[#062E22] text-right">{booking.attendee_name}</div>
                    <div className="text-slate-500">Ticket</div>
                    <div className="font-semibold text-[#062E22] text-right">{ticketType.name} (x{booking.slots_requested})</div>
                    <div className="text-slate-500">Status</div>
                    <div className="font-semibold text-green-600 text-right uppercase text-xs tracking-wider">{booking.booking_status}</div>
                  </div>
                </div>

                <Link
                  href={`/events/${eventId}`}
                  className="inline-flex px-8 py-3 bg-[#062E22] text-white rounded-xl font-bold hover:bg-[#0a4a37] transition"
                >
                  View My Pass
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
