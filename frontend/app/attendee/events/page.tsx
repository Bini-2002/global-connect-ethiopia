'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AttendeeSidebar from '@/components/AttendeeSidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { eventsService } from '@/app/services/eventsService';
import { getToken } from '@/app/lib/auth';
import { EventRecord } from '@/app/types/event';
import {
  Calendar,
  ChevronRight,
  MapPin,
  Search,
  Ticket,
} from 'lucide-react';

/* ─────────────────────────────── helpers ─────────────────────────────── */

function formatDate(date?: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateRange(startDate?: string | null, endDate?: string | null): string {
  if (!startDate) return 'Schedule to be announced';
  const start = new Date(startDate);
  if (!endDate) {
    return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  const end = new Date(endDate);
  const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endLabel = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startLabel} - ${endLabel}`;
}

function monthBadge(date?: string | null): string {
  if (!date) return 'TBA';
  const value = new Date(date);
  return value.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
}

function formatEventType(type?: string | null): string {
  if (!type) return 'Professional Event';
  return type
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' / ');
}

function bookingLabel(event: EventRecord): string {
  if (event.booking_status === 'open' && event.remaining_slots && event.remaining_slots > 0) {
    return `${event.remaining_slots} Slots`;
  }
  if (event.booking_status === 'full') {
    return 'Full';
  }
  if (event.booking_status === 'closed') {
    return 'Closed';
  }
  return event.booking_status?.charAt(0).toUpperCase() + (event.booking_status?.slice(1) || '');
}

/* ─────────────────────────────── page ─────────────────────────────── */

export default function AttendeeEventsPage() {
  const router = useRouter();

  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');

  useEffect(() => {
    const load = async () => {
      const token = getToken();
      if (!token) {
        router.replace('/login');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch discoverable events (same as landing page)
        const eventsData = await eventsService.getDiscoverableEvents();
        
        // Filter to show only events available for booking
        const availableEvents = eventsData.filter((event) => {
          // Exclude fully booked events
          if (event.booking_required && event.booking_status === 'full') return false;
          return true;
        });

        setEvents(availableEvents);
      } catch (err) {
        if (err instanceof Error && err.message === 'Not authenticated') {
          router.replace('/login');
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to load events');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [router]);

  const filteredEvents = useMemo(() => {
    const available = events.filter((event) => {
      if (event.booking_required && event.booking_status === 'full') return false;
      return true;
    });

    const matchesSearch = searchQuery.trim() === ''
      ? available
      : available.filter((event) =>
          [event.title, event.location, event.category, event.description]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(searchQuery.toLowerCase()))
        );

    if (selectedTag === 'All') return matchesSearch;
    return matchesSearch.filter((event) => {
      const cat = String(event.category || '').toLowerCase();
      if (selectedTag === 'Conferences') return cat.includes('conference');
      if (selectedTag === 'Summits') return cat.includes('summit') || cat.includes('forum');
      if (selectedTag === 'Galas') return cat.includes('gala') || cat.includes('networking');
      return true;
    });
  }, [events, searchQuery, selectedTag]);

  return (
    <div className="min-h-screen bg-white">
      <AttendeeSidebar />
      <DashboardHeader searchPlaceholder="Search events..." />

      {/* Main Content - Full Width Layout */}
      <main className="md:ml-60 relative py-16 px-4 sm:px-6 lg:px-8">
        {/* Subtle dark glow background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-emerald-900/10 rounded-full mix-blend-screen filter blur-[120px] pointer-events-none"></div>

        <div className="relative z-10 mx-auto max-w-7xl">
          {/* Header Section */}
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between mb-12">
            <div className="space-y-3">
              <h2 className="text-4xl font-black tracking-tight text-[#062E22]">
                Available Events to Book
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl">
                Select a live published event, review safety permits and schedules, and complete your reservation.
              </p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-3 mb-12">
            {['All', 'Conferences', 'Summits', 'Galas'].map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`rounded-full px-6 py-2.5 text-sm font-bold transition-all duration-300 ${
                  selectedTag === tag
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center py-20">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm font-bold text-red-600">
              {error}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredEvents.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-16 text-center">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-slate-900 mb-2">No matching events found</h3>
              <p className="text-slate-600">
                {searchQuery ? 'Adjust your search keywords or filter settings' : 'Check back soon for new open booking events'}
              </p>
            </div>
          )}

          {/* Events Grid */}
          {!loading && !error && filteredEvents.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredEvents.map((event) => {
                const isOpen = event.booking_required && event.booking_status === 'open';
                return (
                  <div
                    key={event.id}
                    className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white transition-all duration-500 hover:-translate-y-2 hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-900/10 flex flex-col"
                  >
                    <div className="p-8 pb-0">
                      <div className="flex items-start justify-between gap-4 mb-6">
                        <span className="rounded-full bg-emerald-500/20 text-emerald-700 px-3 py-1 text-xs font-bold border border-emerald-500/30">
                          {monthBadge(event.start_date)}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600">
                          {formatEventType(event.category)}
                        </span>
                      </div>
                      <h3 className="text-2xl font-black leading-tight text-[#062E22] mb-2 group-hover:text-emerald-600 transition-colors duration-300">
                        {event.title}
                      </h3>
                      <p className="text-sm text-emerald-700 font-semibold mb-4">
                        {formatDateRange(event.start_date, event.end_date)}
                      </p>
                      <p className="line-clamp-2 text-sm leading-relaxed text-slate-600 mb-8">
                        {event.description || 'Details are officially published and verified.'}
                      </p>
                    </div>

                    <div className="mt-auto p-8 pt-6 border-t border-slate-200 bg-slate-50 group-hover:bg-white transition-colors duration-300">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                            Venue
                          </p>
                          <p className="text-sm font-bold text-[#062E22]">
                            {event.location || 'Addis Ababa'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                            Status
                          </p>
                          <p className="text-sm font-bold text-emerald-600">
                            {bookingLabel(event)}
                          </p>
                        </div>
                      </div>

                      {isOpen ? (
                        <Link
                          href={`/events/${event.id}`}
                          className="block w-full rounded-xl bg-emerald-500 py-3.5 text-center text-sm font-black text-white transition-all hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/25 active:scale-95"
                        >
                          Reserve Seat
                        </Link>
                      ) : (
                        <Link
                          href={`/events/${event.id}`}
                          className="block w-full rounded-xl bg-slate-200 py-3.5 text-center text-sm font-black text-slate-700 transition-all hover:bg-slate-300 active:scale-95"
                        >
                          View Details
                        </Link>
                      )}
                    </div>
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
