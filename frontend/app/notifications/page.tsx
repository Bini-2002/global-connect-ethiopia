'use client';

import { useState } from 'react';
import { Bell, BellRing, CheckCheck, Filter } from 'lucide-react';
import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import { useNotifications } from '@/app/hooks/useNotificationsAndAnalytics';
import { getRole } from '@/app/lib/auth';
import type { NotificationRecord } from '@/app/types/notifications';

type AllowedRole = 'organizer' | 'admin' | 'ministry' | 'municipal' | 'police' | 'vendor' | 'attendee' | 'team_member';

const ROLE_MAP: Record<string, AllowedRole> = {
  organizer: 'organizer',
  admin: 'admin',
  super_admin: 'admin',
  ministry_gov: 'ministry',
  municipal_gov: 'municipal',
  police: 'police',
  vendor: 'vendor',
  attendee: 'attendee',
  team_member: 'team_member',
};

const TYPE_ICONS: Record<string, string> = {
  booking_confirmed: '🎟️',
  booking_cancelled: '❌',
  contract_funded: '💰',
  contract_completed: '✅',
  payment_received: '💳',
  contract_cancelled: '🚫',
  withdrawal_approved: '🏦',
  announcement: '📢',
  task_pending_approval: '⏳',
  payment_sent: '💸',
  default: '🔔',
};

function getIcon(type: string) {
  return TYPE_ICONS[type] ?? TYPE_ICONS.default;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function NotificationRow({
  n,
  onRead,
}: {
  n: NotificationRecord;
  onRead: (id: string) => void;
}) {
  return (
    <div
      onClick={() => { if (!n.read_status) onRead(n.id); }}
      className={`flex items-start gap-4 p-5 rounded-2xl border transition cursor-pointer hover:shadow-sm ${
        !n.read_status
          ? 'border-[#062E22]/20 bg-[#F5FBF8] hover:border-[#062E22]/40'
          : 'border-slate-200 bg-white hover:bg-slate-50'
      }`}
    >
      <span className="text-2xl mt-0.5 shrink-0">{getIcon(n.type)}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm leading-snug ${!n.read_status ? 'font-semibold text-[#062E22]' : 'text-slate-700'}`}>
            {n.message}
          </p>
          {!n.read_status && (
            <span className="w-2.5 h-2.5 rounded-full bg-[#062E22] shrink-0 mt-0.5" />
          )}
        </div>
        <div className="flex items-center gap-3 mt-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {n.type.replace(/_/g, ' ')}
          </span>
          <span className="text-xs text-slate-400">{timeAgo(n.created_at)}</span>
        </div>
        {n.related_entity?.type && n.related_entity?.id && (
          <p className="mt-2 text-xs text-slate-400">
            Related: {n.related_entity.type} #{n.related_entity.id.slice(-6)}
          </p>
        )}
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data, loading, error, unreadCount, markRead, markAllRead } =
    useNotifications(unreadOnly);

  const rawRole = getRole() ?? 'organizer';
  const sidebarRole: AllowedRole = ROLE_MAP[rawRole] ?? 'organizer';
  const displayed = data;

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role={sidebarRole} />
      <DashboardHeader searchPlaceholder="Notifications" />

      <main className="pt-16 md:ml-60 p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Page Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0a4a37]">
                Inbox
              </p>
              <h1 className="mt-1 text-3xl font-bold text-[#062E22]">Notifications</h1>
              {unreadCount > 0 && (
                <p className="mt-1 text-sm text-slate-500">
                  {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setUnreadOnly((v) => !v)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                  unreadOnly
                    ? 'bg-[#062E22] text-white border-[#062E22]'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Filter className="w-4 h-4" />
                {unreadOnly ? 'All' : 'Unread only'}
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={() => void markAllRead()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                >
                  <CheckCheck className="w-4 h-4" />
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#062E22] border-t-transparent" />
            </div>
          ) : displayed.length === 0 ? (
            <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-14 text-center shadow-sm">
              {unreadOnly ? (
                <>
                  <BellRing className="mx-auto h-10 w-10 text-[#062E22] mb-4" />
                  <h2 className="text-xl font-bold text-[#062E22]">All caught up!</h2>
                  <p className="mt-2 text-sm text-slate-500">You have no unread notifications.</p>
                  <button
                    onClick={() => setUnreadOnly(false)}
                    className="mt-4 text-sm font-semibold text-[#062E22] hover:underline"
                  >
                    View all notifications
                  </button>
                </>
              ) : (
                <>
                  <Bell className="mx-auto h-10 w-10 text-slate-300 mb-4" />
                  <h2 className="text-xl font-bold text-[#062E22]">No notifications yet</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Activity from tasks, bookings, contracts, and payments will appear here.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {displayed.map((n) => (
                <NotificationRow key={n.id} n={n} onRead={(id) => void markRead(id)} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
