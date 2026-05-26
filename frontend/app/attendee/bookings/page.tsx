'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AttendeeSidebar from '@/components/AttendeeSidebar';
import DashboardHeader from '@/components/DashboardHeader';
import BookingCard from '@/components/BookingCard';
import { eventsService } from '@/app/services/eventsService';
import { getToken } from '@/app/lib/auth';
import { EventBookingRecord } from '@/app/types/event';
import { Filter, AlertCircle, Calendar } from 'lucide-react';

/* ─────────────────────────────── types ─────────────────────────────── */

type BookingFilter = 'all' | 'upcoming' | 'past' | 'cancelled';

/* ─────────────────────────────── page ─────────────────────────────── */

export default function AttendeeBookingsPage() {
  const router = useRouter();

  const [bookings, setBookings] = useState<EventBookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<BookingFilter>('all');

  useEffect(() => {
    const load = async () => {
      const token = getToken();
      if (!token) {
        router.replace('/login');
        return;
      }

      try {
        setLoading(true);
        const data = await eventsService.getAllMyBookings();
        setBookings(data);
        setError(null);
      } catch (err) {
        console.error('Failed to load bookings:', err);
        setError('Failed to load your bookings. Please try again later.');
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const filteredBookings = useMemo(() => {
    const now = new Date();

    return bookings.filter((booking) => {
      if (filter === 'cancelled') {
        return booking.booking_status === 'cancelled';
      }

      if (filter === 'cancelled') return booking.booking_status === 'cancelled';

      const eventDate = booking.event_start_date
        ? new Date(booking.event_start_date)
        : null;

      if (filter === 'upcoming') {
        return eventDate && eventDate > now && booking.booking_status !== 'cancelled';
      }

      if (filter === 'past') {
        return eventDate && eventDate <= now && booking.booking_status !== 'cancelled';
      }

      return booking.booking_status !== 'cancelled';
    });
  }, [bookings, filter]);

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <AttendeeSidebar />

      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <DashboardHeader searchPlaceholder="Search bookings..." />

        {/* Page Content */}
        <div className="p-6 md:p-8">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Event Bookings</h1>
            <p className="text-gray-600">
              View and manage all your event bookings and reservations
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-3 mb-8 border-b border-gray-200 pb-4">
            {(['all', 'upcoming', 'past', 'cancelled'] as const).map((filterValue) => (
              <button
                key={filterValue}
                onClick={() => setFilter(filterValue)}
                className={`px-4 py-2 rounded-full font-medium transition-colors text-sm capitalize ${
                  filter === filterValue
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  {filterValue === 'all' && <Calendar className="w-4 h-4" />}
                  {filterValue === 'upcoming' && '📅'}
                  {filterValue === 'past' && '✓'}
                  {filterValue === 'cancelled' && '✕'}
                  {filterValue === 'all' ? 'All Bookings' : filterValue}
                </span>
              </button>
            ))}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
                  <div className="w-6 h-6 border-3 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                </div>
                <p className="text-gray-600">Loading your bookings...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="text-sm text-red-600 hover:text-red-700 mt-2 underline"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredBookings.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium mb-2">
                {filter === 'all'
                  ? "You haven't booked any events yet"
                  : `No ${filter} bookings found`}
              </p>
              <p className="text-sm text-gray-500 mb-4">
                {filter === 'all'
                  ? 'Explore available events and make your first booking'
                  : `Check other filters or browse available events`}
              </p>
              {filter === 'all' && (
                <a
                  href="/attendee/events"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Browse Events
                </a>
              )}
            </div>
          )}

          {/* Bookings Grid */}
          {!loading && !error && filteredBookings.length > 0 && (
            <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
              {filteredBookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          )}

          {/* Results Counter */}
          {!loading && !error && bookings.length > 0 && (
            <div className="mt-6 text-sm text-gray-600 text-center">
              Showing {filteredBookings.length} of {bookings.length} booking
              {bookings.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
