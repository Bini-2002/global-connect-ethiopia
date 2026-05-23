'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Calendar,
  FileText,
  Clock,
  CheckCircle,
  Filter,
  Loader2,
  X,
  Plus,
} from 'lucide-react';
import Image from 'next/image';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import AIModal from '@/components/organizer/AIModal';
import { eventsService, EVENT_STATUS_CONFIG } from '@/app/services/eventsService';
import { EventListItem, ApprovedProposal } from '@/app/types/event';
import { EventCard, AIFloatingButton } from '@/components/organizer/events';

export default function MyEvents() {
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [approvedProposals, setApprovedProposals] = useState<ApprovedProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [showProposals, setShowProposals] = useState(false);
  const [showDeadlines, setShowDeadlines] = useState(false);
  const [filterDate, setFilterDate] = useState('all');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterEventType, setFilterEventType] = useState('');
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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

  // Unique values for filter dropdowns
  const uniqueLocations = [...new Set(events.map(e => e.location).filter(Boolean))];
  const uniqueEventTypes = [...new Set(events.map(e => e.event_type).filter(Boolean))];

  // Filter events
  const filteredEvents = events.filter(e => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'live') return e.status === 'LIVE';
    if (activeFilter === 'upcoming') return e.status === 'UPCOMING';
    if (activeFilter === 'completed') return e.status === 'COMPLETED';
    if (activeFilter === 'cancelled') return e.status === 'CANCELLED';
    return true;
  }).filter(e => {
    if (filterDate === 'week') {
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(e.date) >= weekAgo;
    }
    if (filterDate === 'month') {
      const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1);
      return new Date(e.date) >= monthAgo;
    }
    return true;
  }).filter(e => !filterLocation || e.location === filterLocation
  ).filter(e => !filterEventType || e.event_type === filterEventType);

  // Calculate stats for cards
  const stats = {
    total: events.length,
    live: events.filter(e => e.status === 'LIVE').length,
    upcoming: events.filter(e => e.status === 'UPCOMING').length,
    draft: approvedProposals.filter(p => p.status === 'draft').length,
  };

  return (
    <>
      <style>{`
        @keyframes glow-green {
          0%, 100% { box-shadow: 0 0 5px rgba(6, 46, 34, 0.3), 0 0 10px rgba(6, 46, 34, 0.1); }
          50% { box-shadow: 0 0 12px rgba(6, 46, 34, 0.6), 0 0 25px rgba(6, 46, 34, 0.3); }
        }
        @keyframes glow-orange {
          0%, 100% { box-shadow: 0 0 5px rgba(236, 91, 19, 0.3), 0 0 10px rgba(236, 91, 19, 0.1); }
          50% { box-shadow: 0 0 12px rgba(236, 91, 19, 0.6), 0 0 25px rgba(236, 91, 19, 0.3); }
        }
        .glow-green { animation: glow-green 2s ease-in-out infinite; }
        .glow-orange { animation: glow-orange 2s ease-in-out infinite; }
      `}</style>
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
            <div className="fixed bottom-6  right-0 -z-10 pointer-events-none">
              <Image
                src="/Ellipse3.png"
                alt=""
                width={200}
                height={400}
                className="opacity-80"
              />
            </div>

      <div className="md:ml-60 md:pt-6">
        <div className="space-y-6 pt-16 px-4 md:px-6">
          {/* ===== HEADER ===== */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-3xl font-bold text-[#062E22]">My Events</h1>
              <p className="text-gray-500">Manage and monitor all your events across Ethiopia</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/organizer/create-event"
                className="flex items-center gap-2 px-4 py-2.5 bg-[#062E22] text-white text-sm font-semibold rounded-xl hover:bg-[#0a4a37] transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Create Event
              </Link>
              <Link
                href="/organizer/proposals"
                className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#062E22] border border-[#062E22] text-sm font-semibold rounded-xl hover:bg-gray-50 transition shadow-sm"
              >
                <FileText className="w-4 h-4" />
                My Proposals
              </Link>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* ===== STATS CARDS ===== */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl shadow-sm p-3">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Total Events</p>
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-gray-100">
                    <Calendar className="w-4 h-4 text-gray-600" />
                  </div>
                  <p className="text-xl font-bold text-gray-900">{stats.total}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-3">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Draft</p>
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-gray-100">
                    <Clock className="w-4 h-4 text-gray-600" />
                  </div>
                  <p className="text-xl font-bold text-gray-900">{stats.draft}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-3">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Upcoming</p>
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-gray-100">
                    <Calendar className="w-4 h-4 text-gray-600" />
                  </div>
                  <p className="text-xl font-bold text-gray-900">{stats.upcoming}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-3">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Live</p>
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-gray-100">
                    <CheckCircle className="w-4 h-4 text-gray-600" />
                  </div>
                  <p className="text-xl font-bold text-gray-900">{stats.live}</p>
                </div>
            </div>
          </div>

          {/* ===== EVENT CARDS ===== */}
          <div>
            {/* Filter Bar */}
            <div className="mb-6">
              {/* Filter Dropdown - Above tabs, right aligned */}
              <div className="flex justify-start mb-4">
                <div className="relative" ref={filterRef}>
                  <button
                    onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-full bg-white hover:bg-gray-50 transition"
                  >
                    <Filter className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium">Filter</span>
                  </button>
                  {showFilterDropdown && (
                    <div className="absolute left-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-3 px-3 space-y-3">
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Date</p>
                        <div className="flex gap-1">
                          {['all', 'week', 'month'].map(d => (
                            <button key={d} onClick={() => { setFilterDate(d); setShowFilterDropdown(false); }}
                              className={`flex-1 px-2 py-1 rounded-lg text-xs font-medium transition ${filterDate === d ? 'bg-[#062E22] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                              {d === 'all' ? 'All' : d === 'week' ? 'Week' : 'Month'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Location</p>
                        <select value={filterLocation} onChange={e => { setFilterLocation(e.target.value); setShowFilterDropdown(false); }}
                          className="w-full text-xs px-2 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#062E22]">
                          <option value="">All locations</option>
                          {uniqueLocations.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Event Type</p>
                        <select value={filterEventType} onChange={e => { setFilterEventType(e.target.value); setShowFilterDropdown(false); }}
                          className="w-full text-xs px-2 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#062E22]">
                          <option value="">All types</option>
                          {uniqueEventTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      {(filterDate !== 'all' || filterLocation || filterEventType) && (
                        <button onClick={() => { setFilterDate('all'); setFilterLocation(''); setFilterEventType(''); }}
                          className="w-full text-xs text-center text-red-500 font-medium py-1 hover:text-red-700 transition">
                          Clear filters
                        </button>
                      )}
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
                      ? 'border border-[#062E22] text-[#062E22] bg-transparent'
                      : 'bg-[#062E22]/10 text-[#062E22] hover:bg-[#062E22]/20'
                  }`}
                >
                  All
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeFilter === 'all' ? 'border border-[#062E22] text-[#062E22]' : 'bg-[#062E22]/20'}`}>
                    {eventCounts.all}
                  </span>
                </button>
                <button
                  onClick={() => setActiveFilter('live')}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition ${
                    activeFilter === 'live'
                      ? 'border border-[#062E22] text-[#062E22] bg-transparent'
                      : 'bg-[#062E22]/10 text-[#062E22] hover:bg-[#062E22]/20'
                  }`}
                >
                  Live
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeFilter === 'live' ? 'border border-[#062E22] text-[#062E22]' : 'bg-[#062E22]/20'}`}>
                    {eventCounts.live}
                  </span>
                </button>
                <button
                  onClick={() => setActiveFilter('upcoming')}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition ${
                    activeFilter === 'upcoming'
                      ? 'border border-[#062E22] text-[#062E22] bg-transparent'
                      : 'bg-[#062E22]/10 text-[#062E22] hover:bg-[#062E22]/20'
                  }`}
                >
                  Upcoming
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeFilter === 'upcoming' ? 'border border-[#062E22] text-[#062E22]' : 'bg-[#062E22]/20'}`}>
                    {eventCounts.upcoming}
                  </span>
                </button>
                <button
                  onClick={() => setActiveFilter('completed')}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition ${
                    activeFilter === 'completed'
                      ? 'border border-[#062E22] text-[#062E22] bg-transparent'
                      : 'bg-[#062E22]/10 text-[#062E22] hover:bg-[#062E22]/20'
                  }`}
                >
                  Completed
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeFilter === 'completed' ? 'border border-[#062E22] text-[#062E22]' : 'bg-[#062E22]/20'}`}>
                    {eventCounts.completed}
                  </span>
                </button>
                <button
                  onClick={() => setActiveFilter('cancelled')}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition ${
                    activeFilter === 'cancelled'
                      ? 'border border-[#062E22] text-[#062E22] bg-transparent'
                      : 'bg-[#062E22]/10 text-[#062E22] hover:bg-[#062E22]/20'
                  }`}
                >
                  Cancelled
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeFilter === 'cancelled' ? 'border border-[#062E22] text-[#062E22]' : 'bg-[#062E22]/20'}`}>
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
              <div className="grid md:grid-cols-3 gap-6">
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
      </div>

      {/* Right Toggle Buttons */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 space-y-2">
        <button
          onClick={() => setShowProposals(true)}
          className="flex flex-col items-center gap-1 px-3 py-2.5 bg-[#062E22]/40 backdrop-blur-xl border border-[#062E22]/30 rounded-l-xl hover:bg-[#062E22]/60 transition-all glow-green"
        >
          <FileText className="w-4 h-4 text-gray-900" />
          <span className="text-[10px] font-semibold leading-tight text-gray-900">Approved  Proposals</span>
        </button>
        <button
          onClick={() => setShowDeadlines(true)}
          className="flex flex-col items-center gap-1 px-3 py-2.5 bg-[#EC5B13]/40 backdrop-blur-xl border border-[#EC5B13]/30 rounded-l-xl hover:bg-[#EC5B13]/60 transition-all glow-orange"
        >
          <Calendar className="w-4 h-4 text-gray-900" />
          <span className="text-[10px] font-semibold leading-tight text-gray-900">Upcoming Deadlines</span>
        </button>
      </div>

      {/* Proposals Panel */}
      {showProposals && (
        <>
          <div className="fixed inset-0 z-30 bg-black/20" onClick={() => setShowProposals(false)} />
          <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl rounded-l-2xl z-40 p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[#062E22]">Approved Proposals ({approvedProposals.length})</h2>
              <button onClick={() => setShowProposals(false)} className="p-1 hover:bg-gray-100 rounded-lg transition">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-3">
              {approvedProposals
                .sort((a, b) => new Date(b.approved_date).getTime() - new Date(a.approved_date).getTime())
                .map(proposal => (
                  <Link
                    key={proposal.id}
                    href={proposal.event_id ? `/organizer/events/${proposal.event_id}` : `/organizer/create-event/${proposal.id}`}
                    className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    <p className="font-semibold text-sm text-[#062E22] truncate">{proposal.title}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Approved: {new Date(proposal.approved_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {proposal.event_id ? 'Event workspace ready' : 'Create event workspace'}
                    </p>
                  </Link>
                ))}
              {approvedProposals.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">No approved proposals yet.</p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Deadlines Panel */}
      {showDeadlines && (
        <>
          <div className="fixed inset-0 z-30 bg-black/20" onClick={() => setShowDeadlines(false)} />
          <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl rounded-l-2xl z-40 p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[#062E22]">Upcoming Deadlines</h2>
              <button onClick={() => setShowDeadlines(false)} className="p-1 hover:bg-gray-100 rounded-lg transition">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-3">
              {events.filter(e => e.status === 'LIVE' || e.status === 'UPCOMING').length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No upcoming deadlines.</p>
              ) : (
                events.filter(e => e.status === 'LIVE' || e.status === 'UPCOMING')
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map(event => (
                    <Link
                      key={event.id}
                      href={`/organizer/events/${event.id}`}
                      className={`block p-3 rounded-lg hover:bg-gray-100 transition ${
                        event.status === 'LIVE' ? 'bg-red-50 border-l-2 border-red-500' : 'bg-amber-50 border-l-2 border-amber-300'
                      }`}
                    >
                      <p className="font-semibold text-sm text-[#062E22]">{event.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{event.date}</p>
                      <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-medium ${
                        event.status === 'LIVE' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                        {event.status}
                      </span>
                    </Link>
                  ))
              )}
            </div>
          </div>
        </>
      )}

      {/* AI Floating Button */}
      <AIFloatingButton isOpen={isAIModalOpen} onToggle={() => setIsAIModalOpen(true)} />

      {/* AI Modal */}
      <AIModal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} />
    </>
  );
}
