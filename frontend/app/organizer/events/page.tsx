'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  FileText,
  Clock,
  CheckCircle,
  Filter,
  Loader2,
} from 'lucide-react';
import Image from 'next/image';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import AIModal from '@/components/organizer/AIModal';
import { eventsService, EVENT_STATUS_CONFIG } from '@/app/services/eventsService';
import { EventListItem, ApprovedProposal } from '@/app/types/event';
import { EventCard, EventsSidebar, AIFloatingButton } from '@/components/organizer/events';

export default function MyEvents() {
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [approvedProposals, setApprovedProposals] = useState<ApprovedProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [eventsData, proposalsData] = await Promise.all([
          eventsService.getEvents(),
          eventsService.getApprovedProposals(),
        ]);
        setEvents(eventsData);
        setApprovedProposals(proposalsData);
      } catch (err: any) {
        console.error('Error fetching events:', err);
        setError(err.message || 'Failed to load events');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate event counts for filter tabs
  const eventCounts = {
    all: events.length,
    live: events.filter(e => e.status === 'LIVE').length,
    upcoming: events.filter(e => e.status === 'UPCOMING').length,
    completed: events.filter(e => e.status === 'COMPLETED').length,
    cancelled: events.filter(e => e.status === 'CANCELLED').length,
  };

  // Filter events
  const filteredEvents = events.filter(e => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'live') return e.status === 'LIVE';
    if (activeFilter === 'upcoming') return e.status === 'UPCOMING';
    if (activeFilter === 'completed') return e.status === 'COMPLETED';
    if (activeFilter === 'cancelled') return e.status === 'CANCELLED';
    return true;
  });

  // Calculate stats for cards
  const stats = {
    total: events.length,
    live: events.filter(e => e.status === 'LIVE').length,
    upcoming: events.filter(e => e.status === 'UPCOMING').length,
    draft: approvedProposals.filter(p => p.status === 'draft').length,
  };

  return (
    <>
      <Sidebar role="organizer" />
      <DashboardHeader searchPlaceholder="Search events..." />

            <div className="fixed top-6 md:left-60 left-0 -z-10 pointer-events-none">
              <Image
                src="/Ellipse2.png"
                alt=""
                width={200}
                height={400}
                className="opacity-80"
              />
            </div>
            <div className="fixed bottom-6  right-60 -z-10 pointer-events-none">
              <Image
                src="/Ellipse3.png"
                alt=""
                width={200}
                height={400}
                className="opacity-80"
              />
            </div>

      <div className="flex flex-col lg:flex-row items-stretch gap-8 md:ml-60 md:pl-6 md:pt-6 ">
        <div className="flex-1 space-y-6 pt-16">
          {/* ===== HEADER ===== */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-3xl font-bold text-[#062E22]">My Events</h1>
              <p className="text-gray-500">Manage and monitor all your events across Ethiopia</p>
            </div>
            <Link
              href="/organizer/proposals"
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#062E22] border border-[#062E22] text-sm font-semibold rounded-xl hover:bg-gray-50 transition shadow-sm"
            >
              <FileText className="w-4 h-4" />
              My Proposals
            </Link>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* ===== STATS CARDS ===== */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500">
              <div className="p-2 rounded bg-green-100 text-green-600 w-fit mb-2">
                <Calendar className="w-4 h-4" />
              </div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Total Events</p>
              <p className="text-2xl font-bold text-[#062E22]">{stats.total}</p>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-[#FCD116]">
              <div className="p-2 rounded bg-yellow-100 text-[#FCD116] w-fit mb-2">
                <Clock className="w-4 h-4" />
              </div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Draft</p>
              <p className="text-2xl font-bold text-[#FCD116]">{stats.draft}</p>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-[#EC5B13]">
              <div className="p-2 rounded bg-[#EC5B13]/10 text-[#EC5B13] w-fit mb-2">
                <Calendar className="w-4 h-4" />
              </div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Upcoming</p>
              <p className="text-2xl font-bold text-[#EC5B13]">{stats.upcoming}</p>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-[#062E22]">
              <div className="p-2 rounded bg-[#062E22]/10 text-[#062E22] w-fit mb-2">
                <CheckCircle className="w-4 h-4" />
              </div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Live</p>
              <p className="text-2xl font-bold text-[#062E22]">{stats.live}</p>
            </div>
          </div>

          {/* ===== EVENT CARDS ===== */}
          <div>
            {/* Filter Bar */}
            <div className="mb-6">
              {/* Filter Dropdown - Above tabs, right aligned */}
              <div className="flex justify-end mb-4">
                <div className="relative">
                  <button
                    onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-full bg-white hover:bg-gray-50 transition"
                  >
                    <Filter className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium">Filter</span>
                  </button>
                  {showFilterDropdown && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-2">
                      <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100">Date Range</button>
                      <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100">Location</button>
                      <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100">Event Type</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Event Filter Tabs - Grid */}
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition ${
                    activeFilter === 'all'
                      ? 'bg-[#062E22] text-white'
                      : 'bg-[#062E22]/10 text-[#062E22] hover:bg-[#062E22]/20'
                  }`}
                >
                  All
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeFilter === 'all' ? 'bg-white/20' : 'bg-[#062E22]/20'}`}>
                    {eventCounts.all}
                  </span>
                </button>
                <button
                  onClick={() => setActiveFilter('live')}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition ${
                    activeFilter === 'live'
                      ? 'bg-[#062E22] text-white'
                      : 'bg-[#062E22]/10 text-[#062E22] hover:bg-[#062E22]/20'
                  }`}
                >
                  Live
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeFilter === 'live' ? 'bg-white/20' : 'bg-[#062E22]/20'}`}>
                    {eventCounts.live}
                  </span>
                </button>
                <button
                  onClick={() => setActiveFilter('upcoming')}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition ${
                    activeFilter === 'upcoming'
                      ? 'bg-[#062E22] text-white'
                      : 'bg-[#062E22]/10 text-[#062E22] hover:bg-[#062E22]/20'
                  }`}
                >
                  Upcoming
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeFilter === 'upcoming' ? 'bg-white/20' : 'bg-[#062E22]/20'}`}>
                    {eventCounts.upcoming}
                  </span>
                </button>
                <button
                  onClick={() => setActiveFilter('completed')}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition ${
                    activeFilter === 'completed'
                      ? 'bg-[#062E22] text-white'
                      : 'bg-[#062E22]/10 text-[#062E22] hover:bg-[#062E22]/20'
                  }`}
                >
                  Completed
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeFilter === 'completed' ? 'bg-white/20' : 'bg-[#062E22]/20'}`}>
                    {eventCounts.completed}
                  </span>
                </button>
                <button
                  onClick={() => setActiveFilter('cancelled')}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition ${
                    activeFilter === 'cancelled'
                      ? 'bg-[#062E22] text-white'
                      : 'bg-[#062E22]/10 text-[#062E22] hover:bg-[#062E22]/20'
                  }`}
                >
                  Cancelled
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeFilter === 'cancelled' ? 'bg-white/20' : 'bg-[#062E22]/20'}`}>
                    {eventCounts.cancelled}
                  </span>
                </button>
              </div>
            </div>

            {/* Event Cards Grid */}
            {loading ? (
              <div className="flex justify-center items-center py-16">
                <Loader2 className="w-8 h-8 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-16 text-center">
                <span className="text-5xl">📋</span>
                <p className="text-slate-500 text-sm mt-3">No events found.</p>
                <Link href="/organizer/proposals/create" className="mt-4 inline-block text-sm text-[#062E22] font-semibold underline">Create your first proposal →</Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {filteredEvents.map((event, index) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    index={index}
                    statusConfig={EVENT_STATUS_CONFIG}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ===== RIGHT COLUMN: Sidebar ===== */}
        <EventsSidebar
          events={events}
          approvedProposals={approvedProposals}
        />
      </div>

      {/* AI Floating Button */}
      <AIFloatingButton isOpen={isAIModalOpen} onToggle={() => setIsAIModalOpen(true)} />

      {/* AI Modal */}
      <AIModal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} />
    </>
  );
}
