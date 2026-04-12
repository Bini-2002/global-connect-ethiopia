'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import AIModal, { AIFloatingButton } from '@/components/organizer/AIModal';
import { api } from '@/app/lib/api';
import { getOfficeLabel, PROPOSAL_STATUS_META } from '@/app/lib/proposals';
import { ProposalOrganizerUpdate, ProposalRecord } from '@/app/types/proposal';
import {
  Activity,
  ArrowRight,
  Bot,
  Calendar,
  CheckCircle2,
  Clock3,
  FileCheck,
  FolderKanban,
  Gauge,
  Gavel,
  MapPin,
  Plus,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import { getOrganizerPortalRoute, getToken } from '@/app/lib/auth';

interface UserProfile {
  id: string;
  name?: string;
  full_name?: string;
  email?: string;
  role?: string;
  bio?: string;
  phone?: string;
}

interface OrganizerFeedItem {
  proposalId: string;
  proposalTitle: string;
  update: ProposalOrganizerUpdate;
}

function formatDateLabel(date?: string | null): string {
  if (!date) return 'Date pending';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTimeLabel(date?: string | null): string {
  if (!date) return 'Not available';
  return new Date(date).toLocaleString();
}

function compareByNewest(a?: string | null, b?: string | null): number {
  return new Date(b || 0).getTime() - new Date(a || 0).getTime();
}

export default function OrganizerDashboard() {
  const router = useRouter();
  const [proposals, setProposals] = useState<ProposalRecord[]>([]);
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

      try {
        const [proposalData, profileData] = await Promise.all([
          api.get<ProposalRecord[]>('/proposals/'),
          api.get<UserProfile>('/users/me'),
        ]);
        setProposals(proposalData);
        setUserProfile(profileData);
        setError(null);
      } catch (err) {
        if (err instanceof Error && err.message === 'Not authenticated') {
          setAccessAllowed(false);
          setError(null);
          router.replace('/login');
          return;
        }
        console.error('Error fetching organizer dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, [router]);

  const today = new Date();
  const sortedProposals = [...proposals].sort((a, b) => compareByNewest(a.updated_at, b.updated_at));
  const approvedEvents = proposals
    .filter((proposal) => proposal.status === 'approved')
    .sort((a, b) => new Date(a.start_date || a.updated_at).getTime() - new Date(b.start_date || b.updated_at).getTime());
  const upcomingEvents = approvedEvents.filter((proposal) => {
    if (!proposal.end_date) return true;
    return new Date(proposal.end_date) >= today;
  });
  const recentUpdates: OrganizerFeedItem[] = proposals
    .flatMap((proposal) =>
      (proposal.organizer_updates || []).map((update) => ({
        proposalId: proposal.id,
        proposalTitle: proposal.title,
        update,
      })),
    )
    .sort((a, b) => compareByNewest(a.update.created_at, b.update.created_at))
    .slice(0, 5);
  const securityAssignments = approvedEvents
    .filter((proposal) => proposal.security_assignment)
    .sort((a, b) => compareByNewest(a.security_assignment?.assigned_at, b.security_assignment?.assigned_at))
    .slice(0, 3);
  const approvalsReady = approvedEvents
    .filter((proposal) => proposal.approval_certificate_number)
    .sort((a, b) => compareByNewest(a.updated_at, b.updated_at))
    .slice(0, 4);

  const counts = {
    total: proposals.length,
    approved: proposals.filter(p => p.status === 'approved').length,
    pending: proposals.filter(p => ['submitted', 'ministry_review', 'ministry_approved', 'municipal_review'].includes(p.status)).length,
    draft: proposals.filter(p => p.status === 'draft').length,
    rejected: proposals.filter(p => p.status === 'rejected').length,
  };

  const approvalRate = proposals.length ? Math.round((counts.approved / proposals.length) * 100) : 0;
  const reviewCompletionRate = proposals.length
    ? Math.round(((counts.approved + counts.rejected) / proposals.length) * 100)
    : 0;
  const currentMonthCount = proposals.filter((proposal) => {
    const createdAt = new Date(proposal.created_at);
    return createdAt.getMonth() === today.getMonth() && createdAt.getFullYear() === today.getFullYear();
  }).length;
  const nextApprovedEvent = upcomingEvents[0] || null;
  const hasData = proposals.length > 0;

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
      <DashboardHeader searchPlaceholder="Search proposals and events..." />
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

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="w-10 h-10 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !hasData ? (
            <div className="space-y-8">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-10 flex flex-col lg:flex-row gap-8 lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#EC5B13]">
                    <Sparkles className="w-4 h-4" />
                    Organizer Workspace
                  </p>
                  <h2 className="text-3xl font-bold text-[#062E22] mt-3">Start your first event approval journey</h2>
                  <p className="text-slate-600 mt-3 leading-relaxed">
                    Create an event proposal, choose the ministry and municipal approval offices, then select the police notification office,
                    and track every review update from this dashboard.
                  </p>
                  <div className="flex flex-wrap gap-3 mt-6">
                    <Link
                      href="/organizer/create-event"
                      className="px-4 py-2.5 bg-[#062E22] text-white rounded-xl font-semibold hover:bg-[#0a4a37] transition flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Create Event Proposal
                    </Link>
                    <Link
                      href="/organizer/proposals/create"
                      className="px-4 py-2.5 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-100 transition flex items-center gap-2"
                    >
                      <FileCheck className="w-4 h-4" />
                      Open Proposal Form
                    </Link>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#062E22]/95 via-[#0B3A2E]/90 to-[#1E6F5C]/80 text-white rounded-2xl shadow p-6 flex flex-col justify-between w-full lg:w-80">
                  <div>
                    <h3 className="text-xl font-bold mt-2 mb-6 flex items-center gap-2">
                      <Bot className="w-6 h-6" />
                      AI Assistant
                    </h3>
                    <p className="text-sm text-white/90">
                      Ask for help planning your first event proposal, checklist, or review strategy.
                    </p>
                  </div>
                  <div className="mt-6">
                    <button
                      onClick={() => setIsAIModalOpen(true)}
                      className="w-full px-4 py-2 bg-white text-[#062E22] rounded-lg font-semibold hover:bg-gray-100 flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      Ask AI Assistant
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white shadow rounded-xl p-6 border border-slate-200">
                <h3 className="text-lg font-bold text-[#062E22] mb-5 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#EC5B13]" />
                  What happens next
                </h3>
                <div className="grid md:grid-cols-4 gap-4">
                  {[
                    { title: 'Create Proposal', text: 'Enter event details and choose the review offices.' },
                    { title: 'Ministry Review', text: 'The selected ministry office checks compliance first.' },
                    { title: 'Municipal Review', text: 'After ministry approval, the municipal office makes the final decision.' },
                    { title: 'Approval & Police Notice', text: 'Approved events get a certificate and the selected police office receives the event notice.' },
                  ].map((step, index) => (
                    <div key={step.title} className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Step {index + 1}</p>
                      <p className="font-semibold text-[#062E22] mt-2">{step.title}</p>
                      <p className="text-sm text-slate-600 mt-2">{step.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-4 rounded-xl border-l-4 border-[#062E22] shadow-sm hover:shadow-md transition">
              <p className="text-[10px] font-bold text-gray-400 tracking-wider">TOTAL PROPOSALS</p>
              <h3 className="text-2xl font-bold text-[#062E22] my-1">{counts.total}</h3>
              <p className="text-xs font-semibold text-slate-600">{currentMonthCount} created this month</p>
            </div>

            <div className="bg-white p-4 rounded-xl border-l-4 border-blue-500 shadow-sm hover:shadow-md transition">
              <p className="text-[10px] font-bold text-gray-400 tracking-wider">IN REVIEW</p>
              <h3 className="text-2xl font-bold text-[#062E22] my-1">{counts.pending}</h3>
              <p className="text-xs font-semibold text-blue-600">Across ministry and municipal offices</p>
            </div>

            <div className="bg-white p-4 rounded-xl border-l-4 border-green-500 shadow-sm hover:shadow-md transition">
              <p className="text-[10px] font-bold text-gray-400 tracking-wider">APPROVED EVENTS</p>
              <h3 className="text-2xl font-bold text-[#062E22] my-1">{counts.approved}</h3>
              <p className="text-xs font-semibold text-green-600">{approvalsReady.length} certificates ready</p>
            </div>

            <div className="bg-white p-4 rounded-xl border-l-4 border-orange-500 shadow-sm hover:shadow-md transition">
              <p className="text-[10px] font-bold text-gray-400 tracking-wider">DRAFTS</p>
              <h3 className="text-2xl font-bold text-[#062E22] my-1">{counts.draft}</h3>
              <p className="text-xs font-semibold text-orange-600">{counts.rejected} rejected proposals need attention</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white shadow rounded-xl p-4 md:p-6">
              <div className='flex justify-between items-center mb-4'>
                <h2 className="text-lg font-bold text-[#062E22] flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#EC5B13]" />
                  Upcoming Approved Events
                </h2>
                <Link href="/organizer/events" className="text-xs md:text-sm text-[#EC5B13] hover:underline font-medium flex items-center gap-1">
                  See More <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  <p className="text-sm">No approved upcoming events yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingEvents.slice(0, 3).map((event) => (
                    <Link key={event.id} href={`/organizer/proposals/${event.id}`} className="flex gap-4 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition cursor-pointer">
                      <div className="w-12 h-12 bg-[#062E22] rounded-lg flex items-center justify-center text-white flex-shrink-0">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[#062E22] truncate">{event.title}</h3>
                        <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {event.location || 'Location pending'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{formatDateLabel(event.start_date)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
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
                {sortedProposals.slice(0, 4).map((proposal) => {
                  const statusConfig = PROPOSAL_STATUS_META[proposal.status] || PROPOSAL_STATUS_META.draft;
                  return (
                    <Link key={proposal.id} href={`/organizer/proposals/${proposal.id}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition cursor-pointer">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-[#062E22] truncate">{proposal.title}</p>
                        <p className="text-xs text-gray-500">
                          {getOfficeLabel(proposal.office_assignments?.ministry, 'Ministry pending')} • {formatDateLabel(proposal.updated_at)}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ml-2 ${statusConfig.cls}`}>
                        {statusConfig.label}
                      </span>
                    </Link>
                  );
                })}
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
              <Link href="/organizer/proposals" className="flex flex-col items-center gap-2 p-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                <FileCheck className="w-8 h-8" />
                <span className="text-sm font-semibold">Proposal Tracker</span>
              </Link>
              <Link href="/organizer/events" className="flex flex-col items-center gap-2 p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                <Calendar className="w-8 h-8" />
                <span className="text-sm font-semibold">Approved Events</span>
              </Link>
              <button onClick={() => setIsAIModalOpen(true)} className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-[#062E22]/95 to-[#1E6F5C] text-white rounded-lg hover:opacity-90 transition">
                <Bot className="w-8 h-8" />
                <span className="text-sm font-semibold">AI Assistant</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white shadow rounded-xl p-4 md:p-6">
              <h2 className="text-lg font-bold text-[#062E22] mb-4 flex items-center gap-2">
                <Gauge className="w-5 h-5 text-[#EC5B13]" />
                Approval Health
              </h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Approval Rate
                    </span>
                    <span className="font-bold text-green-600">{approvalRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${approvalRate}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 flex items-center gap-2">
                      <Gavel className="w-4 h-4" />
                      Review Completion
                    </span>
                    <span className="font-bold text-blue-600">{reviewCompletionRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${reviewCompletionRate}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 flex items-center gap-2">
                      <Clock3 className="w-4 h-4" />
                      Proposals In Review
                    </span>
                    <span className="font-bold text-amber-600">{counts.pending}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${proposals.length ? Math.min((counts.pending / proposals.length) * 100, 100) : 0}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 flex items-center gap-2">
                      <TriangleAlert className="w-4 h-4" />
                      Rejected / Needs Action
                    </span>
                    <span className="font-bold text-red-600">{counts.rejected}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: `${proposals.length ? Math.min((counts.rejected / proposals.length) * 100, 100) : 0}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#062E22] to-[#1E6F5C] rounded-xl p-4 md:p-6 text-white">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Approval Snapshot
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-lg p-3">
                  <p className="text-2xl font-bold">{upcomingEvents.length}</p>
                  <p className="text-xs text-green-200">Upcoming Approved Events</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <p className="text-2xl font-bold">{recentUpdates.length}</p>
                  <p className="text-xs text-green-200">Recent Gov Updates</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <p className="text-2xl font-bold">{securityAssignments.length}</p>
                  <p className="text-xs text-green-200">Security Assignments</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <p className="text-2xl font-bold">{nextApprovedEvent ? formatDateLabel(nextApprovedEvent.start_date) : '—'}</p>
                  <p className="text-xs text-green-200">Next Approved Event</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-4 md:p-6 mb-8">
            <div className='flex justify-between items-center mb-6'>
              <h2 className="text-xl font-bold text-[#062E22] flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#EC5B13]" />
                Approval Certificates Ready
              </h2>
              <Link href="/organizer/proposals" className="text-sm text-[#EC5B13] hover:underline font-medium flex items-center gap-1">
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            {approvalsReady.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <p className="text-sm">No approval certificates available yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {approvalsReady.map((proposal) => (
                  <Link key={proposal.id} href={`/organizer/proposals/${proposal.id}/permit`} className="block rounded-xl border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100 transition">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-[#062E22] truncate">{proposal.title}</p>
                        <p className="text-xs text-slate-500 mt-1">Certificate {proposal.approval_certificate_number}</p>
                      </div>
                      <span className="text-xs font-semibold text-green-700">Open</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white shadow rounded-lg p-4 md:p-6">
              <div className='flex justify-between items-center mb-6'>
                <h2 className="text-xl font-bold text-[#062E22] flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#EC5B13]" />
                  Police Notifications
                </h2>
                <Link href="/organizer/proposals" className="text-sm text-[#EC5B13] hover:underline font-medium flex items-center gap-1">
                  Proposal Details <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              {securityAssignments.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  <p className="text-sm">Police notifications will appear after municipal approval.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {securityAssignments.map((proposal) => (
                    <Link key={proposal.id} href={`/organizer/proposals/${proposal.id}`} className="block rounded-xl border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100 transition">
                      <p className="font-semibold text-[#062E22]">{proposal.title}</p>
                      <p className="text-sm text-slate-600 mt-2">{proposal.security_assignment?.message}</p>
                      <p className="text-xs text-slate-500 mt-2">
                        Assigned office: {proposal.security_assignment?.office_name || getOfficeLabel(proposal.office_assignments?.police)}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white shadow rounded-lg p-4 md:p-6">
              <div className='flex justify-between items-center mb-6'>
                <h2 className="text-xl font-bold text-[#062E22] flex items-center gap-2">
                  <FolderKanban className="w-5 h-5 text-[#EC5B13]" />
                  Government Updates Feed
                </h2>
                <Link href="/organizer/proposals" className="text-sm text-[#EC5B13] hover:underline font-medium flex items-center gap-1">
                  Open Proposals <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              {recentUpdates.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  <p className="text-sm">Government updates will appear here once proposals enter review.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentUpdates.map((feedItem) => (
                    <Link key={`${feedItem.proposalId}-${feedItem.update.created_at}`} href={`/organizer/proposals/${feedItem.proposalId}`} className="block rounded-xl border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100 transition">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-[#062E22] truncate">{feedItem.proposalTitle}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {feedItem.update.office_name || feedItem.update.stage || 'Government review'}
                          </p>
                        </div>
                        <span className="text-xs text-slate-400">{formatDateTimeLabel(feedItem.update.created_at)}</span>
                      </div>
                      <p className="text-sm text-slate-600 mt-3">{feedItem.update.message}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
        </div>
      </main>

      <AIModal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} />
      {hasData && <AIFloatingButton onClick={() => setIsAIModalOpen(true)} />}
    </div>
  );
}
