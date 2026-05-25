'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/app/lib/api';
import { eventsService } from '@/app/services/eventsService';
import { EventRecord, EventBookingRecord } from '@/app/types/event';
import { formatCurrency } from '@/components/organizer/events';
import { 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Calendar, 
  ArrowLeft, 
  Copy, 
  Check, 
  Download, 
  QrCode,
  AlertCircle
} from 'lucide-react';

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  
  const eventId = params.id as string;
  const bookingId = params.bookingId as string;

  const [event, setEvent] = useState<EventRecord | null>(null);
  const [booking, setBooking] = useState<EventBookingRecord | null>(null);
  // Ticket types removed; booking records drive the display
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const bookingData = await eventsService.getBookingById(eventId, bookingId);
        if (!active) return;
        setBooking(bookingData);

        const eventData = await eventsService.getEventById(eventId);
        if (!active) return;
        setEvent(eventData);

        // no-op: ticket types deprecated
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load booking details');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadData();
    return () => {
      active = false;
    };
  }, [eventId, bookingId]);

  const handleCopyReference = () => {
    if (!booking) return;
    navigator.clipboard.writeText(booking.booking_reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !booking || !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Error Loading Booking</h2>
        <p className="text-slate-500 mt-2 max-w-md text-center">{error || 'Booking or event details could not be found.'}</p>
        <Link
          href={`/events/${eventId}`}
          className="mt-6 px-6 py-2.5 bg-[#062E22] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a37] transition shadow-sm"
        >
          Back to Event Details
        </Link>
      </div>
    );
  }

  const isOffline = booking.payment_method === 'bank' || booking.payment_method === 'cash';
  const isPending = booking.booking_status === 'pending_payment' || (isOffline && booking.booking_status === 'pending_confirmation');
  const totalAmount = (booking as any).total_amount || 0;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href={`/events/${eventId}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Event
          </Link>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Header Banner */}
          <div className="bg-[#062E22] p-8 text-white relative overflow-hidden">
            <p className="text-xs uppercase tracking-widest text-emerald-400 font-bold">Booking Details</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">{event.title}</h1>
            <p className="text-slate-300 mt-2 text-sm sm:text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
              {event.start_date ? new Date(event.start_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Date TBA'}
            </p>
          </div>

          <div className="p-6 sm:p-10 space-y-8">
            {/* Status Pill Section */}
            {isPending ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-amber-800 text-lg">Pending Payment Approval</h3>
                  <p className="text-amber-700 text-sm mt-1">
                    Your offline reservation is placed. Please transfer the total amount using the banking instructions below to activate your ticket.
                  </p>
                </div>
              </div>
            ) : booking.booking_status === 'confirmed' ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-emerald-800 text-lg">Booking Confirmed</h3>
                  <p className="text-emerald-700 text-sm mt-1">
                    Your booking is fully verified and active. Show the QR code below at the check-in counter on the day of the event.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 text-lg">Status: {booking.booking_status}</h3>
                  <p className="text-slate-600 text-sm mt-1">
                    Your booking is in the '{booking.booking_status}' state. Contact the event organizer if you have any questions.
                  </p>
                </div>
              </div>
            )}

            {/* Offline Payment Banking Details */}
            {isPending && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                <h4 className="font-bold text-[#062E22] text-md uppercase tracking-wider">Bank Transfer Instructions</h4>
                <p className="text-sm text-slate-600">
                  Please transfer exactly <strong className="text-[#062E22]">{formatCurrency(totalAmount)} ETB</strong> to the following account:
                </p>
                <div className="grid sm:grid-cols-2 gap-4 pt-2">
                  <div className="bg-white p-4 rounded-xl border border-slate-150">
                    <p className="text-xs text-slate-400 font-medium">Bank Name</p>
                    <p className="text-sm font-semibold text-[#062E22] mt-1">Commercial Bank of Ethiopia (CBE)</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-150">
                    <p className="text-xs text-slate-400 font-medium">Account Name</p>
                    <p className="text-sm font-semibold text-[#062E22] mt-1">Event-Sphere Ltd.</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-150 sm:col-span-2">
                    <p className="text-xs text-slate-400 font-medium">Account Number</p>
                    <p className="text-base font-bold text-[#062E22] mt-1">1000284759382</p>
                  </div>
                  
                  <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/50 sm:col-span-2 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-amber-600 font-bold uppercase tracking-wider">Payment Reference Number (Mandatory)</p>
                      <p className="text-lg font-mono font-bold text-[#062E22] mt-1">{booking.booking_reference}</p>
                    </div>
                    <button
                      onClick={handleCopyReference}
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition active:scale-95"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy Ref
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed italic">
                  *Important: You must specify the reference number above in your transfer notes so that organizers can match your transaction.
                </p>
              </div>
            )}

            {/* QR Code and Check-in Info */}
            {booking.booking_status === 'confirmed' && (
              <div className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-slate-200 rounded-3xl text-center space-y-4">
                <p className="text-sm font-semibold text-slate-500">Scan QR Code at On-site Check-in</p>
                {booking.qr_code_image_url ? (
                  <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={api.resolveUrl(booking.qr_code_image_url)} 
                      alt="Check-in QR Code" 
                      className="w-48 h-48 mx-auto"
                    />
                    <div className="mt-3 text-center">
                      <a
                        href={api.resolveUrl(booking.qr_code_image_url) + '?download=true'}
                        download
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download QR
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="w-48 h-48 bg-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                    <QrCode className="w-12 h-12 mb-2" />
                    <span className="text-xs">Generating Code...</span>
                  </div>
                )}
                
                <p className="text-xs font-mono text-slate-400 mt-2">Reference: {booking.booking_reference}</p>

                {booking.check_in_pass_image_url && (
                  <a
                    href={api.resolveUrl(booking.check_in_pass_image_url) + '?download=true'}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#062E22] hover:bg-[#0a4a37] text-white rounded-xl text-sm font-semibold transition shadow-sm mt-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Pass
                  </a>
                )}
              </div>
            )}

            {/* General Ticket Metadata Grid */}
            <div className="border-t border-slate-150 pt-8 grid sm:grid-cols-2 gap-6 text-sm">
              <div className="space-y-4">
                <h4 className="font-bold text-[#062E22] uppercase tracking-wider text-xs">Attendee Info</h4>
                <div className="space-y-1">
                  <p className="text-slate-400 font-medium">Full Name</p>
                  <p className="text-slate-800 font-semibold text-base">{booking.attendee_name || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-400 font-medium">Email Address</p>
                  <p className="text-slate-800 font-semibold">{booking.attendee_email || 'N/A'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-[#062E22] uppercase tracking-wider text-xs">Booking Info</h4>
                <div className="space-y-1">
                  <p className="text-slate-400 font-medium">Slots Requested</p>
                  <p className="text-slate-800 font-bold text-lg">{booking.slots_requested}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-400 font-medium">Total Paid</p>
                  <p className="text-slate-800 font-bold text-lg">{totalAmount === 0 ? 'Free' : formatCurrency(totalAmount)}</p>
                </div>
              </div>

              <div className="sm:col-span-2 border-t border-slate-100 pt-6 space-y-3">
                <h4 className="font-bold text-[#062E22] uppercase tracking-wider text-xs">Location & Venue</h4>
                <p className="text-slate-700 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                  {event.location || 'Online / TBA'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
