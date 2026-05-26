'use client';

import Link from 'next/link';
import {
  Calendar,
  MapPin,
  Activity,
  TrendingUp,
  Users,
  Plus,
  BarChart3,
  FileCheck,
  ArrowRight,
  Ticket,
  DollarSign,
  Shield,
  Clock,
  MoreHorizontal,
  FolderKanban,   
  Circle,        
  Gauge,          
  Store,  
} from 'lucide-react';
import AIAssistantIcon from '@/components/AIAssistantIcon';


interface DashboardStats {
  ticketsSold: number;
  totalRevenue: string;
  revenueGrowth: number;
  ticketsGrowth: number;
  successRate: number;
  approvalRate: number;
}

interface Vendor {
  id: string;
  name: string;
  category: string;
  rating: number;
  status: 'verified' | 'pending' | 'unverified';
}

const MOCK_STATS: DashboardStats = {
  ticketsSold: 2450,
  totalRevenue: '1.2M',
  revenueGrowth: 23,
  ticketsGrowth: 23,
  successRate: 67,
  approvalRate: 83,
};

export interface DashboardWithEventsProps {
  proposals: Array<{
    id: string;
    title: string;
    event_type?: string;
    location?: string;
    status: string;
    created_at: string;
    updated_at?: string;
  }>;
  onOpenAI?: () => void;
  stats?: DashboardStats;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-600' },
  submitted: { label: 'Submitted', cls: 'bg-amber-100 text-amber-700' },
  ministry_review: { label: 'Ministry Review', cls: 'bg-blue-100 text-blue-700' },
  ministry_approved: { label: 'Ministry Approved', cls: 'bg-teal-100 text-teal-700' },
  municipal_review: { label: 'Municipal Review', cls: 'bg-purple-100 text-purple-700' },
  approved: { label: 'Approved ✓', cls: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-700' },
  changes_requested: { label: 'Changes Requested', cls: 'bg-orange-100 text-orange-700' },
};

const mockVendors: Vendor[] = [
  {
    id: 'vnd-001',
    name: 'Ethio Catering Services',
    category: 'Catering',
    rating: 4.8,
    status: 'verified',
  },
  {
    id: 'vnd-002',
    name: 'Addis Sound & Lights',
    category: 'Audio/Visual',
    rating: 4.6,
    status: 'verified',
  },
  {
    id: 'vnd-003',
    name: 'Bole Security Co.',
    category: 'Security',
    rating: 4.5,
    status: 'verified',
  },
  {
    id: 'vnd-004',
    name: 'Debre Berhan Venues',
    category: 'Venue',
    rating: 4.7,
    status: 'verified',
  },
  {
    id: 'vnd-005',
    name: 'Tech Solutions Ethiopia',
    category: 'IT Support',
    rating: 4.4,
    status: 'pending',
  },
  {
    id: 'vnd-006',
    name: 'Ambassador Transport',
    category: 'Transportation',
    rating: 4.3,
    status: 'verified',
  },
];


export default function DashboardWithEvents({ 
  proposals, 
  onOpenAI, 
  stats = MOCK_STATS 
}: DashboardWithEventsProps) {
  const counts = {
    approved: proposals.filter(p => p.status === 'approved').length,
    submitted: proposals.filter(p =>
      ['submitted','ministry_review','ministry_approved','municipal_review'].includes(p.status)
    ).length,
  };
  const pendingApprovals = proposals.filter(p => 
    ['submitted', 'ministry_review', 'municipal_review'].includes(p.status)
  ).length;

 
  const upcomingEvents = proposals.filter(p => 
    ['approved', 'ministry_approved', 'municipal_review'].includes(p.status)
  ).slice(0, 3);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl border-l-4 border-green-500 shadow-sm hover:shadow-md transition">
          <p className="text-[10px] font-bold text-gray-400 tracking-wider">TOTAL EVENTS</p>
          <h3 className="text-2xl font-bold text-[#062E22] my-1">{proposals.length}</h3>
          <p className="text-xs font-semibold text-green-600">+{proposals.length > 0 ? 2 : 0} this month</p>
        </div>

        <div className="bg-white p-4 rounded-xl border-l-4 border-yellow-400 shadow-sm hover:shadow-md transition">
          <p className="text-[10px] font-bold text-gray-400 tracking-wider">PENDING APPROVALS</p>
          <h3 className="text-2xl font-bold text-[#062E22] my-1">{pendingApprovals}</h3>
          <p className="text-xs font-semibold text-yellow-600">Needs attention</p>
        </div>

        <div className="bg-white p-4 rounded-xl border-l-4 border-orange-500 shadow-sm hover:shadow-md transition">
          <p className="text-[10px] font-bold text-gray-400 tracking-wider">TICKETS SOLD</p>
          <h3 className="text-2xl font-bold text-[#062E22] my-1">{stats.ticketsSold.toLocaleString()}</h3>
          <p className="text-xs font-semibold text-orange-600">{stats.ticketsGrowth}% increase</p>
        </div>

        <div className="bg-white p-4 rounded-xl border-l-4 border-teal-700 shadow-sm hover:shadow-md transition">
          <p className="text-[10px] font-bold text-gray-400 tracking-wider">TOTAL REVENUE</p>
          <h3 className="text-2xl font-bold text-[#062E22] my-1">{stats.totalRevenue} ETB</h3>
          <p className="text-xs font-semibold text-teal-700">{stats.revenueGrowth}% increase</p>
        </div>
      </div>

     

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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
            {proposals.slice(0, 3).map((event) => (
              <div key={event.id} className="flex gap-4 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition cursor-pointer">
                <div className="w-12 h-12 bg-[#062E22] rounded-lg flex items-center justify-center text-white flex-shrink-0">
                  <Calendar className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[#062E22] truncate">{event.title}</h3>
                  <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {event.location || 'TBD'} • {event.event_type || 'General'}
                  </p>
                  <div className="mt-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${STATUS_CONFIG[event.status]?.cls || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_CONFIG[event.status]?.label || event.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

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
          <div className="space-y-3">
            {proposals.slice(0, 4).map((proposal) => (
              <div key={proposal.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition cursor-pointer">
                <div className="flex items-center gap-3 min-w-0">
                  <Circle className={`w-3 h-3 flex-shrink-0 ${
                    proposal.status === 'approved' ? 'text-green-500 fill-green-500' :
                    proposal.status === 'rejected' ? 'text-red-500 fill-red-500' :
                    proposal.status === 'draft' ? 'text-slate-400 fill-slate-400' :
                    'text-blue-500 fill-blue-500'
                  }`} />
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-[#062E22] truncate">{proposal.title}</p>
                    <p className="text-xs text-gray-500">{proposal.id}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${STATUS_CONFIG[proposal.status]?.cls || 'bg-gray-100 text-gray-600'} flex-shrink-0 ml-2`}>
                  {STATUS_CONFIG[proposal.status]?.label || proposal.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

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
          <button onClick={onOpenAI} className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-[#062E22]/95 to-[#1E6F5C] text-white rounded-lg hover:opacity-90 transition">
            <AIAssistantIcon className="w-8 h-8" />
            <span className="text-sm font-semibold">AI Assistant</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white shadow rounded-xl p-4 md:p-6">
          <h2 className="text-lg font-bold text-[#062E22] mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#EC5B13]" />
            Performance Metrics
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 flex items-center gap-2">
                  <FolderKanban className="w-4 h-4" />
                  Total Events
                </span>
                <span className="font-bold text-[#062E22]">{proposals.length}</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 flex items-center gap-2">
                  <Gauge className="w-4 h-4" />
                  Success Rate
                </span>
                <span className="font-bold text-green-600">{stats.successRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${stats.successRate}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Approval Rate
                </span>
                <span className="font-bold text-blue-600">{stats.approvalRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${stats.approvalRate}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#062E22] to-[#1E6F5C] rounded-xl p-4 md:p-6 text-white">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <AIAssistantIcon className="w-5 h-5" />
            Quick Stats
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-2xl font-bold">{proposals.length}</p>
              <p className="text-xs text-green-200">Total Events</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-2xl font-bold">{counts.approved}</p>
              <p className="text-xs text-green-200">Approved</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-2xl font-bold">{mockVendors.length}</p>
              <p className="text-xs text-green-200">Vendors</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-2xl font-bold">{counts.submitted}</p>
              <p className="text-xs text-green-200">In Review</p>
            </div>
          </div>
        </div>
      </div>

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
          {upcomingEvents.length > 0 ? upcomingEvents.map((event, index) => {
            const gradients = ['from-blue-600 to-purple-700', 'from-amber-500 to-orange-600', 'from-emerald-600 to-teal-700'];
            return (
              <div key={event.id} className="relative group overflow-hidden rounded-xl h-64 cursor-pointer">
                <div className={`absolute inset-0 bg-gradient-to-br ${gradients[index % gradients.length]}`} />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition" />
                <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
                  <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    {new Date(event.created_at).toLocaleDateString()}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{event.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-white/90">
                    <MapPin className="w-4 h-4" />
                    <span>{event.location || 'TBD'}</span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      event.status === 'approved' ? 'bg-green-500' :
                      event.status === 'ministry_approved' ? 'bg-teal-500' :
                      'bg-blue-500'
                    }`}>
                      {STATUS_CONFIG[event.status]?.label || event.status}
                    </span>
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="col-span-3 text-center py-12 text-gray-500">
              <Calendar className="w-16 h-16 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">No upcoming events</p>
              <p className="text-sm mt-1">Create your first event to see it here</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-4 md:p-6 mb-8">
        <div className='flex justify-between items-center mb-6'>
          <h2 className="text-xl font-bold text-[#062E22] flex items-center gap-2">
            <Store className="w-5 h-5 text-[#EC5B13]" />
            Featured Vendors
          </h2>
          <Link href="/organizer/vendors" className="text-sm text-[#EC5B13] hover:underline font-medium flex items-center gap-1">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {mockVendors.slice(0, 3).map((vendor, index) => {
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
                      vendor.status === 'verified' ? 'bg-green-500' :
                      vendor.status === 'pending' ? 'bg-amber-500' :
                      'bg-gray-500'
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
    </>
  );
}
