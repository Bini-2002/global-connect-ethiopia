'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import axios from 'axios';
import {
  Calendar,
  MapPin,
  FileText,
  Clock,
  CheckCircle,
  Plus,
  Filter,
  AlertCircle,
  RefreshCw,
  MoreHorizontal,
} from 'lucide-react';

import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import AIModal from '@/components/organizer/AIModal';
import { getToken } from '@/app/lib/auth';

/* ================= TYPES ================= */

interface Proposal {
  id: string;
  title: string;
  event_type?: string;
  location?: string;
  status: string;
  start_date?: string;
  end_date?: string;
  created_at?: string;
  updated_at?: string;
}

interface MockEvent {
  id: string;
  title: string;
  org: string;
  location: string;
  date: string;
  status: 'LIVE' | 'PENDING' | 'COMPLETED' | 'UPCOMING' | 'CANCELLED';
  progress: {
    proposal: number;
    approval: number;
    vendors: number;
    tickets: number;
  };
}

/* ================= MOCK EVENT DATA ================= */

const mockEvents: MockEvent[] = [
  {
    id: 'evt-1',
    title: 'Ethiopia Tech Summit 2026',
    org: 'Ethiopian Tech Alliance',
    location: 'Addis Ababa',
    date: 'Nov 12, 2026',
    status: 'LIVE',
    progress: { proposal: 100, approval: 100, vendors: 80, tickets: 60 },
  },
  {
    id: 'evt-2',
    title: 'Cultural Heritage Festival',
    org: 'Heritage Foundation',
    location: 'Multi-City',
    date: 'Jan 18, 2027',
    status: 'UPCOMING',
    progress: { proposal: 100, approval: 100, vendors: 40, tickets: 20 },
  },
  {
    id: 'evt-3',
    title: 'National Youth Workshop',
    org: 'Youth Initiative',
    location: 'Hawassa',
    date: 'Mar 5, 2026',
    status: 'COMPLETED',
    progress: { proposal: 100, approval: 100, vendors: 100, tickets: 100 },
  },
  {
    id: 'evt-4',
    title: 'Arts & Music Expo',
    org: 'Ethio Arts Council',
    location: 'Addis Ababa',
    date: 'Dec 20, 2025',
    status: 'COMPLETED',
    progress: { proposal: 100, approval: 100, vendors: 100, tickets: 100 },
  },
];

/* ================= CONSTANTS ================= */

const EVENT_STATUS_CONFIG: Record<string, { label: string; bgClass: string }> = {
  LIVE: { label: 'LIVE', bgClass: 'bg-green-500' },
  PENDING: { label: 'PENDING', bgClass: 'bg-amber-500' },
  COMPLETED: { label: 'COMPLETED', bgClass: 'bg-slate-500' },
  UPCOMING: { label: 'UPCOMING', bgClass: 'bg-blue-500' },
  CANCELLED: { label: 'CANCELLED', bgClass: 'bg-red-500' },
};

/* ================= COMPONENT ================= */

export default function MyEvents() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  const fetchProposals = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
      const token = getToken();
      
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/proposals`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      setProposals(response.data);
    } catch (err: any) {
      console.error('Error fetching proposals:', err);
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
        setTimeout(() => { window.location.href = '/login'; }, 1500);
      } else {
        setError(err.response?.data?.detail || err.message || 'Failed to load events');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  // Calculate proposal counts for stats
  const counts = {
    all: proposals.length,
    draft: proposals.filter(p => p.status === 'draft').length,
    inReview: proposals.filter(p => ['submitted', 'ministry_review', 'municipal_review'].includes(p.status)).length,
    approved: proposals.filter(p => p.status === 'approved').length,
    rejected: proposals.filter(p => p.status === 'rejected').length,
  };

  // Event counts for filter tabs
  const eventCounts = {
    all: mockEvents.length,
    live: mockEvents.filter(e => e.status === 'LIVE').length,
    upcoming: mockEvents.filter(e => e.status === 'UPCOMING').length,
    completed: mockEvents.filter(e => e.status === 'COMPLETED').length,
    cancelled: mockEvents.filter(e => e.status === 'CANCELLED').length,
  };

  // Filter events
  const filteredEvents = mockEvents.filter(e => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'live') return e.status === 'LIVE';
    if (activeFilter === 'upcoming') return e.status === 'UPCOMING';
    if (activeFilter === 'completed') return e.status === 'COMPLETED';
    if (activeFilter === 'cancelled') return e.status === 'CANCELLED';
    return true;
  });

  return (
    <>
      <Sidebar role="organizer" />
      <DashboardHeader searchPlaceholder="Search events..." />

      <div className="md:ml-60 pt-16 p-6 space-y-6">
        {/* ===== HEADER ===== */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-[#062E22]">My Events</h1>
            <p className="text-gray-500">
              {mockEvents.length} total events
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchProposals(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#062E22] border border-[#062E22] text-sm font-semibold rounded-lg hover:bg-gray-50 transition shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link
              href="/organizer/proposals"
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#062E22] border border-[#062E22] text-sm font-semibold rounded-lg hover:bg-gray-50 transition shadow-sm"
            >
              <FileText className="w-4 h-4" />
              My Proposals
            </Link>
            <Link
              href="/organizer/create-event"
              className="flex items-center gap-2 px-4 py-2.5 bg-[#062E22] text-white text-sm font-semibold rounded-lg hover:bg-[#0a4a37] transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create New Event
            </Link>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* ===== STATS CARDS (Mock Event Stats) ===== */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500">
            <div className="p-2 rounded bg-green-100 text-green-600 w-fit mb-2">
              <Calendar className="w-4 h-4" />
            </div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Total Events</p>
            <p className="text-2xl font-bold text-[#062E22]">12</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
            <div className="p-2 rounded bg-blue-100 text-blue-600 w-fit mb-2">
              <Clock className="w-4 h-4" />
            </div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">In Review</p>
            <p className="text-2xl font-bold text-blue-600">3</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-orange-500">
            <div className="p-2 rounded bg-orange-100 text-orange-600 w-fit mb-2">
              <Clock className="w-4 h-4" />
            </div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Draft</p>
            <p className="text-2xl font-bold text-orange-600">2</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-purple-500">
            <div className="p-2 rounded bg-purple-100 text-purple-600 w-fit mb-2">
              <Calendar className="w-4 h-4" />
            </div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Upcoming</p>
            <p className="text-2xl font-bold text-purple-600">5</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-teal-500">
            <div className="p-2 rounded bg-teal-100 text-teal-600 w-fit mb-2">
              <CheckCircle className="w-4 h-4" />
            </div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Live</p>
            <p className="text-2xl font-bold text-teal-600">2</p>
          </div>
        </div>

        {/* ===== MAIN CONTENT ===== */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* ===== LEFT COLUMN: Events ===== */}
          <div className="flex-1">
            {/* Filter Bar */}
            <div className="flex items-center gap-3 mb-6 flex-wrap">
              {/* Filter Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition"
                >
                  <Filter className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium">Filter</span>
                </button>
                {showFilterDropdown && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-2">
                    <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100">Date Range</button>
                    <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100">Location</button>
                    <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100">Event Type</button>
                  </div>
                )}
              </div>

              {/* Event Filter Tabs */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                    activeFilter === 'all'
                      ? 'bg-[#062E22] text-white'
                      : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  All
                  <span className={`px-1.5 py-0.5 rounded text-xs ${activeFilter === 'all' ? 'bg-white/20' : 'bg-gray-100'}`}>
                    {eventCounts.all}
                  </span>
                </button>
                <button
                  onClick={() => setActiveFilter('live')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                    activeFilter === 'live'
                      ? 'bg-green-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Live
                  <span className={`px-1.5 py-0.5 rounded text-xs ${activeFilter === 'live' ? 'bg-white/20' : 'bg-gray-100'}`}>
                    {eventCounts.live}
                  </span>
                </button>
                <button
                  onClick={() => setActiveFilter('upcoming')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                    activeFilter === 'upcoming'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Upcoming
                  <span className={`px-1.5 py-0.5 rounded text-xs ${activeFilter === 'upcoming' ? 'bg-white/20' : 'bg-gray-100'}`}>
                    {eventCounts.upcoming}
                  </span>
                </button>
                <button
                  onClick={() => setActiveFilter('completed')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                    activeFilter === 'completed'
                      ? 'bg-slate-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Completed
                  <span className={`px-1.5 py-0.5 rounded text-xs ${activeFilter === 'completed' ? 'bg-white/20' : 'bg-gray-100'}`}>
                    {eventCounts.completed}
                  </span>
                </button>
                <button
                  onClick={() => setActiveFilter('cancelled')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                    activeFilter === 'cancelled'
                      ? 'bg-red-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Cancelled
                  <span className={`px-1.5 py-0.5 rounded text-xs ${activeFilter === 'cancelled' ? 'bg-white/20' : 'bg-gray-100'}`}>
                    {eventCounts.cancelled}
                  </span>
                </button>
              </div>
            </div>

            {/* Loading State */}
            {loading ? (
              <div className="flex justify-center items-center py-16">
                <div className="w-8 h-8 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-16 text-center">
                <span className="text-5xl">📋</span>
                <p className="text-slate-500 text-sm mt-3">No events found.</p>
                <Link href="/organizer/proposals/create" className="mt-4 inline-block text-sm text-[#062E22] font-semibold underline">Create your first proposal →</Link>
              </div>
            ) : (
              /* Event Cards Grid */
              <div className="grid md:grid-cols-2 gap-6">
                {filteredEvents.map((event, index) => {
                  const statusConfig = EVENT_STATUS_CONFIG[event.status] || EVENT_STATUS_CONFIG.PENDING;
                  const gradients = [
                    'from-blue-600 to-purple-700',
                    'from-emerald-600 to-teal-700',
                    'from-amber-500 to-orange-600',
                    'from-rose-600 to-pink-700',
                  ];
                  return (
                    <div key={event.id} className="bg-white rounded-xl shadow overflow-hidden hover:shadow-lg transition cursor-pointer">
                      {/* Event Header with Gradient */}
                      <div className={`h-40 bg-gradient-to-br ${gradients[index % gradients.length]} p-4 text-white relative`}>
                        <span className={`text-xs px-2 py-1 rounded ${statusConfig.bgClass}`}>
                          {statusConfig.label}
                        </span>
                        <div className="absolute bottom-4 left-4 right-4">
                          <p className="text-xs flex items-center gap-1 mb-1">
                            <MapPin size={12} /> {event.location}
                          </p>
                          <p className="text-xs flex items-center gap-1">
                            <Calendar size={12} /> {event.date}
                          </p>
                        </div>
                      </div>

                      {/* Event Body */}
                      <div className="p-4">
                        <h3 className="font-bold text-[#062E22]">{event.title}</h3>
                        <p className="text-sm text-gray-500 mb-4">By {event.org}</p>

                        {/* Progress Bars */}
                        <div className="space-y-2">
                          {Object.entries(event.progress).map(([key, value]) => (
                            <div key={key}>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="capitalize text-gray-600">{key}</span>
                                <span className="font-medium">{value}%</span>
                              </div>
                              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-green-500 rounded-full transition-all" 
                                  style={{ width: `${value}%` }} 
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-4">
                          <button className="flex-1 bg-[#062E22] text-white py-2 rounded text-sm font-medium hover:bg-[#0a4a37] transition">
                            Manage
                          </button>
                          <button className="flex-1 bg-gray-100 py-2 rounded text-sm font-medium hover:bg-gray-200 transition">
                            View
                          </button>
                          <button className="p-2 bg-gray-100 rounded hover:bg-gray-200 transition">
                            <MoreHorizontal size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ===== RIGHT COLUMN: Sidebar ===== */}
          <div className="w-full lg:w-80 xl:w-96 space-y-6">
            {/* Upcoming Deadlines Card */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                <h2 className="text-lg font-bold text-[#062E22]">Upcoming Deadlines</h2>
              </div>
              <div className="space-y-4">
                {mockEvents.filter(e => e.status === 'LIVE' || e.status === 'UPCOMING').slice(0, 3).map(event => (
                  <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-sm text-[#062E22]">{event.title}</p>
                      <p className="text-xs text-gray-500">{event.date}</p>
                    </div>
                    <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full font-medium">
                      {event.status}
                    </span>
                  </div>
                ))}
              </div>
              <Link href="/organizer/proposals?status=approved" className="text-sm text-[#EC5B13] mt-4 block font-semibold">
                View All →
              </Link>
            </div>

            {/* Featured Vendors */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[#062E22]">Featured Vendors</h2>
                <Link href="/organizer/vendors" className="text-sm text-[#EC5B13] flex items-center gap-1">
                  View All →
                </Link>
              </div>
              <div className="space-y-3">
                {[
                  { name: 'Ethio Catering', category: 'Catering', gradient: 'from-rose-500 to-pink-600' },
                  { name: 'Addis Sound & Lights', category: 'Audio/Visual', gradient: 'from-cyan-500 to-blue-600' },
                  { name: 'Bole Security', category: 'Security', gradient: 'from-slate-600 to-gray-700' },
                ].map((vendor, i) => (
                  <div key={i} className={`p-4 text-white rounded-xl bg-gradient-to-br ${vendor.gradient}`}>
                    <h3 className="font-bold">{vendor.name}</h3>
                    <p className="text-sm opacity-90">{vendor.category}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Floating Button (Fixed) */}
      <div className="fixed bottom-8 right-8 z-40">
        <button
          onClick={() => setIsAIModalOpen(true)}
          className="relative group"
        >
          <Image
            src="/ai.png"
            alt="AI Assistant"
            width={100}
            height={40}
            className="cursor-pointer hover:scale-110 transition-transform drop-shadow-lg"
          />
          <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-[#062E22] text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
            Chat with AI
          </div>
        </button>
      </div>

      {/* AI Modal */}
      <AIModal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} />
    </>
  );
}
