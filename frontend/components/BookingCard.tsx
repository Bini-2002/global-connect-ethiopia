'use client';

import Link from 'next/link';
import { Calendar, MapPin, Ticket, CheckCircle, Clock, XCircle, Download } from 'lucide-react';
import { EventBookingRecord } from '@/app/types/event';

interface BookingCardProps {
  booking: EventBookingRecord;
}

export default function BookingCard({ booking }: BookingCardProps) {
  const eventDate = booking.event_start_date
    ? new Date(booking.event_start_date)
    : null;
  const now = new Date();
  const isUpcoming = eventDate ? eventDate > now : false;
  const isCancelled = booking.booking_status === 'cancelled';
  const isCheckedIn = booking.check_in_status === 'checked_in' || booking.checked_in_at;

  const statusConfig = {
    confirmed: {
      label: 'Confirmed',
      color: 'bg-green-50 border-green-200 text-green-700',
      icon: CheckCircle,
    },
    cancelled: {
      label: 'Cancelled',
      color: 'bg-red-50 border-red-200 text-red-700',
      icon: XCircle,
    },
    pending: {
      label: 'Pending',
      color: 'bg-yellow-50 border-yellow-200 text-yellow-700',
      icon: Clock,
    },
  };

  const status = statusConfig[booking.booking_status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = status.icon;

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateRange = (start?: string | null, end?: string | null) => {
    if (!start) return 'Schedule to be announced';
    const startDate = new Date(start);
    if (!end) {
      return startDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    const endDate = new Date(end);
    const startLabel = startDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const endLabel = endDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${startLabel} - ${endLabel}`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow overflow-hidden">
      {/* Header with event title and status */}
      <div className="border-b border-gray-200 p-4 bg-gradient-to-r from-gray-50 to-transparent">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {booking.event_title || 'Untitled Event'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Booking Reference: <span className="font-mono text-gray-900">{booking.booking_reference}</span>
            </p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full border flex-shrink-0 ${status.color}`}>
            <StatusIcon className="w-4 h-4" />
            <span className="text-xs font-medium whitespace-nowrap">{status.label}</span>
          </div>
        </div>
      </div>

      {/* Body with event details */}
      <div className="p-4 space-y-3">
        {/* Event date range */}
        <div className="flex items-start gap-3">
          <Calendar className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">When</p>
            <p className="text-sm text-gray-900 font-medium">
              {formatDateRange(booking.event_start_date, booking.event_end_date)}
            </p>
            {isUpcoming && (
              <p className="text-xs text-blue-600 mt-1">
                {Math.ceil((eventDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} days away
              </p>
            )}
            {!isUpcoming && !isCancelled && (
              <p className="text-xs text-gray-500 mt-1">Event has passed</p>
            )}
          </div>
        </div>

        {/* Event location */}
        {booking.event_location && (
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Location</p>
              <p className="text-sm text-gray-900 font-medium truncate">{booking.event_location}</p>
            </div>
          </div>
        )}

        {/* Booking details */}
        <div className="flex items-start gap-3">
          <Ticket className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Booking</p>
            <p className="text-sm text-gray-900 font-medium">{booking.slots_requested} slot(s)</p>
            {isCheckedIn && (
              <p className="text-xs text-green-600 mt-1">
                ✓ Checked in on {formatDate(booking.checked_in_at)}
              </p>
            )}
          </div>
        </div>

        {/* Additional notes */}
        {booking.notes && (
          <div className="bg-gray-50 rounded p-3 mt-2 border border-gray-200">
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Notes</p>
            <p className="text-sm text-gray-700">{booking.notes}</p>
          </div>
        )}
      </div>

      {/* Footer with actions */}
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between gap-2">
        <div className="text-xs text-gray-500">
          Booked on {formatDate(booking.created_at)}
        </div>
        <div className="flex items-center gap-2">
          {booking.qr_code_image_url && !isCancelled && (
            <a
              href={booking.qr_code_image_url}
              download
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Download QR code"
            >
              <Download className="w-4 h-4" />
              QR Code
            </a>
          )}
          {booking.check_in_pass_image_url && !isCancelled && (
            <a
              href={booking.check_in_pass_image_url}
              download
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Download check-in pass"
            >
              <Download className="w-4 h-4" />
              Pass
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
