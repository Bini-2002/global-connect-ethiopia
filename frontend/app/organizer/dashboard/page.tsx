'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import axios from 'axios';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import AIModal, { AIFloatingButton } from '@/components/organizer/AIModal';
import EmptyDashboard from '@/components/organizer/EmptyDashboard';
import {
  Calendar,
  MapPin,
  Activity,
  TrendingUp,
  Users,
  Plus,
  BarChart3,
  FileCheck,
  Bot,
  ArrowRight,
  Store,
  FolderKanban,
  Circle,
  Gauge,
  Ticket,
  DollarSign,
} from 'lucide-react';
import { getOrganizerPortalRoute, getToken } from '@/app/lib/auth';

interface Proposal {
  id: string;
  title: string;
  event_type?: string;
  location?: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

interface UserProfile {
  id: string;
  name?: string;
  full_name?: string;
  email?: string;
  role?: string;
  bio?: string;
  phone?: string;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-600' },
  submitted: { label: 'Submitted', cls: 'bg-amber-100 text-amber-700' },
  ministry_review: { label: 'Ministry Review', cls: 'bg-blue-100 text-blue-700' },
  ministry_approved: { label: 'Ministry Approved', cls: 'bg-teal-100 text-teal-700' },
  municipal_review: { label: 'Municipal Review', cls: 'bg-purple-100 text-purple-700' },
  approved: { label: 'Approved', cls: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-700' },
  changes_requested: { label: 'Changes Requested', cls: 'bg-orange-100 text-orange-700' },
};

const MOCK_STATS = {
  ticketsSold: 2450,
  totalRevenue: '1.2M',
  revenueGrowth: 23,
  ticketsGrowth: 23,
  successRate: 67,
  approvalRate: 83,
};

const MOCK_UPCOMING_EVENTS = [
  {
    id: 'mock-1',
    title: 'Ethiopia Tech Summit 2026',
    org: 'Ethiopian Tech Alliance',
    location: 'Addis Ababa Convention Center',
    date: 'Nov 12, 2026',
    status: 'LIVE',
    progress: { proposal: 100, approval: 100, vendors: 80, tickets: 60 },
  },
  {
    id: 'mock-2',
    title: 'Cultural Heritage Festival',
    org: 'Heritage Foundation',
    location: 'Ethio-Russian Friendship Hall',
    date: 'Jan 18, 2027',
    status: 'UPCOMING',
    progress: { proposal: 100, approval: 100, vendors: 40, tickets: 20 },
  },
  {
    id: 'mock-3',
    title: 'National Youth Workshop',
    org: 'Youth Initiative',
    location: 'Bole Community Center',
    date: 'Mar 5, 2027',
    status: 'UPCOMING',
    progress: { proposal: 100, approval: 100, vendors: 60, tickets: 30 },
  },
];

const MOCK_RECENT_PROPOSALS: { id: string; title: string; status: string; created: string }[] = [];

const MOCK_VENDORS = [
  { id: 'vnd-1', name: 'Ethio Catering Services', category: 'Catering', rating: 4.8, status: 'verified' },
  { id: 'vnd-2', name: 'Addis Sound & Lights', category: 'Audio/Visual', rating: 4.6, status: 'verified' },
  { id: 'vnd-3', name: 'Bole Security Co.', category: 'Security', rating: 4.5, status: 'verified' },
  { id: 'vnd-4', name: 'Debre Berhan Venues', category: 'Venue', rating: 4.7, status: 'verified' },
  { id: 'vnd-5', name: 'Tech Solutions Ethiopia', category: 'IT Support', rating: 4.4, status: 'pending' },
  { id: 'vnd-6', name: 'Ambassador Transport', category: 'Transportation', rating: 4.3, status: 'verified' },
];

export default function OrganizerDashboard() {
  const router = useRouter();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessChecked, setAccessChecked] = useState(false);
  const [accessAllowed, setAccessAllowed] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      const token = getToken();
      if (!token) {
        setAccessChecked(true);
        setAccessAllowed(false);
        router.replace('/login');
        return;
      }

      const organizerRoute = await getOrganizerPortalRoute();
      if (organizerRoute !== '/organizer/dashboard') {
        setAccessChecked(true);
        setAccessAllowed(false);
        router.replace(organizerRoute);
        return;
      }

      setAccessAllowed(true);
      setAccessChecked(true);

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

      Promise.all([
        axios.get(`${API_BASE_URL}/proposals/`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        axios.get(`${API_BASE_URL}/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
      ])
        .then(([proposalsRes, profileRes]) => {
          setProposals(proposalsRes.data);
          setUserProfile(profileRes.data);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Error fetching data:', err);
          if (err.response?.status === 401) {
            router.replace('/login');
          } else {
            setError(err.message || 'Failed to load data');
            setLoading(false);
          }
        });
    };

    void loadDashboard();
  }, [router]);

  // Calculate real proposal counts
  const counts = {
    total: proposals.length,
    approved: proposals.filter(p => p.status === 'approved').length,
    pending: proposals.filter(p => ['submitted', 'ministry_review', 'municipal_review'].includes(p.status)).length,
    draft: proposals.filter(p => p.status === 'draft').length,
    rejected: proposals.filter(p => p.status === 'rejected').length,
  };

  const hasEvents = proposals.length > 0;

  if (!accessChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Checking organizer access...</p>
        </div>
      </div>
    );
  }

  if (!accessAllowed) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="organizer" />
      <DashboardHeader searchPlaceholder="Search " />
      <main className="md:ml-60 pt-3 md:pt-16 relative p-4 md:p-8">
        <div className="min-h-screen bg-gray-50 p-4 md:p-6">
          <div className='flex flex-col md:flex-row justify-between md:pb-8 gap-4'>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-[#062E22]">
                Welcome, {userProfile?.name || userProfile?.full_name || 'User'}
              </h1> 
              <span className='text-sm md:text-base text-gray-500'>Ready to host your next big event in Ethiopia?</span>
            </div>
            
            <div className='flex items-center gap-3'>

              
              <div className='border flex gap-2 md:gap-3 px-3 md:px-5 bg-green-50 h-9 md:h-9 font-bold items-center justify-center rounded-full text-green-700'>

                <span className="text-xs md:text-sm whitespace-nowrap">✓ Verified</span>
              </div>
            </div>
          </div>

          {/* Stats Cards - Mock */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-4 rounded-xl border-l-4 border-green-500 shadow-sm hover:shadow-md transition">
              <p className="text-[10px] font-bold text-gray-400 tracking-wider">TOTAL EVENTS</p>
              <h3 className="text-2xl font-bold text-[#062E22] my-1">12</h3>
              <p className="text-xs font-semibold text-green-600">+3 this month</p>
            </div>

            <div className="bg-white p-4 rounded-xl border-l-4 border-blue-500 shadow-sm hover:shadow-md transition">
              <p className="text-[10px] font-bold text-gray-400 tracking-wider">TICKETS SOLD</p>
              <h3 className="text-2xl font-bold text-[#062E22] my-1">2,450</h3>
              <p className="text-xs font-semibold text-blue-600">+23% this month</p>
            </div>

            <div className="bg-white p-4 rounded-xl border-l-4 border-orange-500 shadow-sm hover:shadow-md transition">
              <p className="text-[10px] font-bold text-gray-400 tracking-wider">DRAFT</p>
              <h3 className="text-2xl font-bold text-[#062E22] my-1">3</h3>
              <p className="text-xs font-semibold text-orange-600">In progress</p>
            </div>

            <div className="bg-white p-4 rounded-xl border-l-4 border-teal-700 shadow-sm hover:shadow-md transition">
              <p className="text-[10px] font-bold text-gray-400 tracking-wider">REVENUE</p>
              <h3 className="text-2xl font-bold text-[#062E22] my-1">1.2M ETB</h3>
              <p className="text-xs font-semibold text-teal-700">+23% growth</p>
            </div>
          </div>

          {/* Upcoming Events & Recent Proposals */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Upcoming Events - Mock */}
            <div className="bg-white shadow rounded-xl p-4 md:p-6">
              <div className='flex justify-between items-center mb-4'>
                <h2 className="text-lg font-bold text-[#062E22] flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#EC5B13]" />
                  Upcoming Events
                </h2>
                <Link href="/organizer/events" className="text-xs md:text-sm text-[#EC5B13] hover:underline font-medium flex items-center gap-1">
                  See More <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-4">
                {MOCK_UPCOMING_EVENTS.map((event) => (
                  <div key={event.id} className="flex gap-4 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition cursor-pointer">
                    <div className="w-12 h-12 bg-[#062E22] rounded-lg flex items-center justify-center text-white flex-shrink-0">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#062E22] truncate">{event.title}</h3>
                      <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {event.location}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{event.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Proposals - Real */}
            <div className="bg-white shadow rounded-xl p-4 md:p-6">
              <div className='flex justify-between items-center mb-4'>
                <h2 className="text-lg font-bold text-[#062E22] flex items-center gap-2">
                  <FolderKanban className="w-5 h-5 text-[#EC5B13]" />
                  Recent Proposals
                </h2>
                <Link href="/organizer/proposals" className="text-xs md:text-sm text-[#EC5B13] hover:underline font-medium flex items-center gap-1">
                  View All <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[#062E22] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : proposals.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No proposals yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {proposals.slice(0, 4).map((proposal) => {
                    const statusConfig = STATUS_CONFIG[proposal.status] || STATUS_CONFIG.draft;
                    return (
                      <Link key={proposal.id} href={`/organizer/proposals/${proposal.id}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition cursor-pointer">
                        <div className="flex items-center gap-3 min-w-0">
                          <Circle className={`w-3 h-3 flex-shrink-0 ${
                            proposal.status === 'approved' ? 'text-green-500 fill-green-500' :
                            proposal.status === 'rejected' ? 'text-red-500 fill-red-500' :
                            proposal.status === 'draft' ? 'text-slate-400 fill-slate-400' :
                            'text-blue-500 fill-blue-500'
                          }`} />
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-[#062E22] truncate">{proposal.title}</p>
                            <p className="text-xs text-gray-500">{proposal.location || 'No location'}</p>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ml-2 ${statusConfig.cls}`}>
                          {statusConfig.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions - Mock */}
          <div className="bg-white shadow rounded-xl p-4 md:p-6 mb-8">
            <h2 className="text-lg font-bold text-[#062E22] mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#EC5B13]" />
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/organizer/create-event" className="flex flex-col items-center gap-2 p-4 bg-[#062E22] text-white rounded-lg hover:bg-green-800 transition">
                <Plus className="w-8 h-8" />
                <span className="text-sm font-semibold">Create Event</span>
              </Link>
              <Link href="/organizer/reports" className="flex flex-col items-center gap-2 p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                <BarChart3 className="w-8 h-8" />
                <span className="text-sm font-semibold">Analytics</span>
              </Link>
              <Link href="/organizer/proposals" className="flex flex-col items-center gap-2 p-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                <FileCheck className="w-8 h-8" />
                <span className="text-sm font-semibold">Proposals</span>
              </Link>
              <button onClick={() => setIsAIModalOpen(true)} className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-[#062E22]/95 to-[#1E6F5C] text-white rounded-lg hover:opacity-90 transition">
                <Bot className="w-8 h-8" />
                <span className="text-sm font-semibold">AI Assistant</span>
              </button>
            </div>
          </div>

          {/* Performance & Quick Stats - Mock */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Performance Metrics - Mock */}
            <div className="bg-white shadow rounded-xl p-4 md:p-6">
              <h2 className="text-lg font-bold text-[#062E22] mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#EC5B13]" />
                Performance Metrics
              </h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 flex items-center gap-2">
                      <Gauge className="w-4 h-4" />
                      Success Rate
                    </span>
                    <span className="font-bold text-green-600">{MOCK_STATS.successRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${MOCK_STATS.successRate}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Approval Rate
                    </span>
                    <span className="font-bold text-blue-600">{MOCK_STATS.approvalRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${MOCK_STATS.approvalRate}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 flex items-center gap-2">
                      <Ticket className="w-4 h-4" />
                      Tickets Sold
                    </span>
                    <span className="font-bold text-purple-600">{MOCK_STATS.ticketsSold.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Revenue Growth
                    </span>
                    <span className="font-bold text-teal-600">{MOCK_STATS.revenueGrowth}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-teal-500 h-2 rounded-full" style={{ width: `${MOCK_STATS.revenueGrowth * 3}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats - Mock */}
            <div className="bg-gradient-to-br from-[#062E22] to-[#1E6F5C] rounded-xl p-4 md:p-6 text-white">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Quick Stats
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-lg p-3">
                  <p className="text-2xl font-bold">{MOCK_UPCOMING_EVENTS.length}</p>
                  <p className="text-xs text-green-200">Upcoming Events</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <p className="text-2xl font-bold">{MOCK_VENDORS.length}</p>
                  <p className="text-xs text-green-200">Vendors</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <p className="text-2xl font-bold">{MOCK_STATS.ticketsSold.toLocaleString()}</p>
                  <p className="text-xs text-green-200">Tickets Sold</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <p className="text-2xl font-bold">{MOCK_STATS.totalRevenue}M</p>
                  <p className="text-xs text-green-200">Revenue (ETB)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Events - Mock Gradient Cards */}
          <div className="bg-white shadow rounded-lg p-4 md:p-6 mb-8">
            <div className='flex justify-between items-center mb-6'>
              <h2 className="text-xl font-bold text-[#062E22] flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#EC5B13]" />
                Upcoming Events
              </h2>
              <Link href="/organizer/events" className="text-sm text-[#EC5B13] hover:underline font-medium flex items-center gap-1">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {MOCK_UPCOMING_EVENTS.map((event, index) => {
                const gradients = ['from-blue-600 to-purple-700', 'from-emerald-600 to-teal-700', 'from-amber-500 to-orange-600'];
                return (
                  <div key={event.id} className="relative group overflow-hidden rounded-xl h-64 cursor-pointer">
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradients[index % gradients.length]}`} />
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition" />
                    <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
                      <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        {event.date}
                      </div>
                      <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium">
                        {event.status}
                      </div>
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mb-3">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-bold mb-1">{event.title}</h3>
                      <p className="text-sm text-white/90 flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {event.location}
                      </p>
                      <div className="mt-4 flex gap-2">
                        <button className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium hover:bg-white/30 transition">
                          Manage
                        </button>
                        <button className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium hover:bg-white/30 transition">
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Featured Vendors - Mock */}
          <div className="bg-white shadow rounded-lg p-4 md:p-6 mb-8">
            <div className='flex justify-between items-center mb-6'>
              <h2 className="text-xl font-bold text-[#062E22] flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#EC5B13]" />
                Featured Vendors
              </h2>
              <Link href="/organizer/vendors" className="text-sm text-[#EC5B13] hover:underline font-medium flex items-center gap-1">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {MOCK_VENDORS.slice(0, 3).map((vendor, index) => {
                const gradients = ['from-rose-500 to-pink-600', 'from-cyan-500 to-blue-600', 'from-slate-600 to-gray-700'];
                return (
                  <div key={vendor.id} className="relative group overflow-hidden rounded-xl h-64 cursor-pointer">
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradients[index % gradients.length]}`} />
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition" />
                    <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
                      <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium">
                        ★ {vendor.rating}
                      </div>
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mb-3">
                        <Store className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-bold mb-1">{vendor.name}</h3>
                      <p className="text-sm text-white/90">{vendor.category}</p>
                      <div className="mt-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          vendor.status === 'verified' ? 'bg-green-500' : 'bg-amber-500'
                        }`}>
                          {vendor.status === 'verified' ? '✓ Verified' : vendor.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      <AIModal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} />
      {hasEvents && <AIFloatingButton onClick={() => setIsAIModalOpen(true)} />}
    </div>
  );
}
