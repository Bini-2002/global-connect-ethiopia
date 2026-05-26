/* frontend/components/organizer/events/EventWorkspaceShell.tsx */

'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  CheckSquare,
  Crown,
  FileBarChart2,
  FolderOpen,
  Landmark,
  Megaphone,
  ShieldAlert,
  Tickets,
  UserCheck,
  Users,
  Wallet,
  BarChart3,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { EVENT_STATUS_CONFIG } from '@/app/services/eventsService';
import { EventRecord } from '@/app/types/event';

type EventWorkspaceTab =
  | 'overview'
  | 'budget'
  | 'schedule'
  | 'venue'
  | 'analytics'
  | 'announcements'
  | 'team'
  | 'tasks'
  | 'attendees'
  | 'vip'
  | 'booking'
  | 'engagement'
  | 'operations'
  | 'vip-reservations'
  | 'wrap-up';

interface EventWorkspaceShellProps {
  event: EventRecord | null;
  loading: boolean;
  error?: string | null;
  activeTab: EventWorkspaceTab;
  actions?: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
}

type TabConfig = {
  id: EventWorkspaceTab;
  label: string;
  icon: typeof FolderOpen;
  href: (eventId: string) => string;
};

const tabConfigs: TabConfig[] = [
  { id: 'overview', label: 'Overview', icon: FolderOpen, href: (eventId) => `/organizer/events/${eventId}` },
  { id: 'budget', label: 'Budget', icon: Wallet, href: (eventId) => `/organizer/events/${eventId}/budget` },
  { id: 'schedule', label: 'Schedule', icon: CalendarDays, href: (eventId) => `/organizer/events/${eventId}/schedule` },
  { id: 'venue', label: 'Venue', icon: Landmark, href: (eventId) => `/organizer/events/${eventId}/venue` },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, href: (eventId) => `/organizer/events/${eventId}/analytics` },
  { id: 'announcements', label: 'Announcements', icon: Megaphone, href: (eventId) => `/organizer/events/${eventId}/announcements` },
  { id: 'team', label: 'Team', icon: Users, href: (eventId) => `/organizer/events/${eventId}/team` },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, href: (eventId) => `/organizer/events/${eventId}/tasks` },
  { id: 'attendees', label: 'Attendees', icon: UserCheck, href: (eventId) => `/organizer/events/${eventId}/attendees` },
  { id: 'vip', label: 'Hotels', icon: Crown, href: (eventId) => `/organizer/events/${eventId}/vip` },
  { id: 'booking', label: 'Booking', icon: Tickets, href: (eventId) => `/organizer/events/${eventId}/booking` },
  { id: 'engagement', label: 'Engagement', icon: Megaphone, href: (eventId) => `/organizer/events/${eventId}/engagement` },
  { id: 'operations', label: 'Operations', icon: ShieldAlert, href: (eventId) => `/organizer/events/${eventId}/operations` },
  { id: 'vip-reservations', label: 'VIP Rooms', icon: Crown, href: (eventId) => `/organizer/events/${eventId}/vip-reservations` },
  { id: 'wrap-up', label: 'Wrap-Up', icon: FileBarChart2, href: (eventId) => `/organizer/events/${eventId}/wrap-up` },
];

function getStatusMeta(status: string) {
  switch (status) {
    case 'published':
    case 'private_published':
      return EVENT_STATUS_CONFIG.UPCOMING;
    case 'live':
      return EVENT_STATUS_CONFIG.LIVE;
    case 'completed':
      return EVENT_STATUS_CONFIG.COMPLETED;
    case 'archived':
      return EVENT_STATUS_CONFIG.ARCHIVED;
    case 'cancelled':
      return EVENT_STATUS_CONFIG.CANCELLED;
    default:
      return EVENT_STATUS_CONFIG.PENDING;
  }
}

export function formatDateRange(startDate?: string | null, endDate?: string | null): string {
  if (!startDate) return 'Date pending';
  const start = new Date(startDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  if (!endDate) return start;
  const end = new Date(endDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${start} - ${end}`;
}

export function formatDateTime(value?: string | null): string {
  if (!value) return 'Not set';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatCurrency(amount?: number | null, currency = 'ETB'): string {
  if (amount == null || Number.isNaN(amount)) return `${currency} 0`;
  return `${currency} ${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

export function startOfInputDateTime(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number) => `${part}`.padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function sentenceCase(value?: string | null): string {
  if (!value) return 'Not started';
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function defaultAside(event: EventRecord) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-[#062E22]">Event Snapshot</h2>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Venue</p>
            <p className="text-sm font-semibold text-[#062E22] mt-2">{sentenceCase(event.venue_status)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Bookings</p>
            <p className="text-sm font-semibold text-[#062E22] mt-2">{sentenceCase(event.booking_status)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Survey</p>
            <p className="text-sm font-semibold text-[#062E22] mt-2">{sentenceCase(event.survey_status)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Report</p>
            <p className="text-sm font-semibold text-[#062E22] mt-2">{sentenceCase(event.final_report_status)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-[#062E22]">Demo Route</h2>
        <div className="space-y-3 mt-4 text-sm text-slate-600">
          <p>Open proposal, confirm the event workspace, then walk the audience through budget, schedule, venue, and booking in that order.</p>
          <p>Operations and wrap-up are ready too, so you can show the full lifecycle instead of stopping at approval.</p>
        </div>
      </div>
    </div>
  );
}

export default function EventWorkspaceShell({
  event,
  loading,
  error,
  activeTab,
  actions,
  children,
  aside,
}: EventWorkspaceShellProps) {
  const role = typeof window !== 'undefined' ? (localStorage.getItem('role') as any || 'organizer') : 'organizer';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Sidebar role={role} />
        <DashboardHeader searchPlaceholder="Search event workspaces..." />
        <main className="md:ml-60 pt-16 p-6">
          <div className="max-w-7xl mx-auto flex justify-center py-24">
            <div className="w-10 h-10 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" />
          </div>
        </main>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Sidebar role={role} />
        <DashboardHeader searchPlaceholder="Search event workspaces..." />
        <main className="md:ml-60 pt-16 p-6">
          <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <h1 className="text-xl font-bold text-[#062E22]">Event workspace not found</h1>
            <p className="text-sm text-slate-500 mt-2">The event could not be loaded from the organizer workspace.</p>
            <Link href="/organizer/events" className="inline-flex mt-4 text-sm font-semibold text-[#062E22] underline">
              Back to events
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const statusMeta = getStatusMeta(event.status);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role={role} />
      <DashboardHeader searchPlaceholder="Search event workspaces..." />
      <main className="md:ml-60 pt-16 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">Organizer event workspace</p>
              <h1 className="text-3xl font-bold text-[#062E22] mt-1">{event.title}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusMeta.bgClass}`}>
                  {statusMeta.label}
                </span>
                <span className="text-sm text-slate-500">{event.category || 'No event type selected'}</span>
                <span className="text-sm text-slate-500">{formatDateRange(event.start_date, event.end_date)}</span>
                <span className="text-sm text-slate-500">{event.location || 'Location pending'}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">{actions}</div>
          </div>

          {error ? (
            error === 'FORBIDDEN' ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-300">
                  <div className="p-8 text-center">
                    <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <ShieldAlert className="w-10 h-10 text-amber-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-[#062E22]">Access Restricted</h2>
                    <p className="text-slate-600 mt-4 leading-relaxed">
                      You do not have the required permissions to access this specific module.
                      This section is reserved for event organizers and authorized administrators.
                    </p>

                    <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                      <Link
                        href={`/organizer/events/${event?.id}`}
                        className="px-8 py-3 bg-[#062E22] text-white rounded-xl font-bold hover:bg-[#0a4a37] transition-all shadow-lg shadow-[#062E22]/20"
                      >
                        Return to Workspace
                      </Link>
                      <Link
                        href="/team/dashboard"
                        className="px-8 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all"
                      >
                        Team Dashboard
                      </Link>
                    </div>
                  </div>
                  <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex justify-center">
                    <p className="text-xs text-slate-400 font-medium italic">
                      Professional Security Enforcement • Event-Sphere
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
                {error}
              </div>
            )
          ) : null}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3">
            <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {(role === 'team_member' ? tabConfigs.filter(t => ['overview', 'venue', 'tasks'].includes(t.id)) : tabConfigs).map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <Link
                    key={tab.id}
                    href={tab.href(event.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${isActive
                        ? 'border-[#062E22] text-[#062E22] bg-[#062E22]/5'
                        : 'border-transparent text-slate-500 hover:text-[#062E22] hover:bg-slate-50'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="grid xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">{children}</div>
            <div className="space-y-6">{aside || defaultAside(event)}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
