'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, BellRing, Check, CheckCheck, X } from 'lucide-react';
import Link from 'next/link';
import { useNotifications } from '@/app/hooks/useNotificationsAndAnalytics';
import type { NotificationRecord } from '@/app/types/notifications';

const TYPE_ICONS: Record<string, string> = {
  booking_confirmed: '🎟️',
  booking_cancelled: '❌',
  contract_funded: '💰',
  contract_completed: '✅',
  payment_received: '💳',
  contract_cancelled: '🚫',
  withdrawal_approved: '🏦',
  announcement: '📢',
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

function NotificationItem({
  notification,
  onRead,
}: {
  notification: NotificationRecord;
  onRead: (id: string) => void;
}) {
  return (
    <div
      className={`group flex items-start gap-3 px-4 py-3 transition cursor-pointer hover:bg-slate-50 ${!notification.read_status ? 'bg-[#F5FBF8]' : ''}`}
      onClick={() => { if (!notification.read_status) onRead(notification.id); }}
    >
      <span className="text-xl mt-0.5 shrink-0">{getIcon(notification.type)}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${!notification.read_status ? 'font-semibold text-[#062E22]' : 'text-slate-600'}`}>
          {notification.message}
        </p>
        <p className="text-xs text-slate-400 mt-1">{timeAgo(notification.created_at)}</p>
      </div>
      {!notification.read_status && (
        <span className="w-2 h-2 rounded-full bg-[#062E22] mt-2 shrink-0" />
      )}
    </div>
  );
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { data, loading, unreadCount, markRead, markAllRead } = useNotifications();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const recent = data.slice(0, 8);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        id="notification-bell-btn"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg hover:bg-slate-100 transition"
      >
        {unreadCount > 0 ? (
          <BellRing className="w-5 h-5 text-[#062E22]" />
        ) : (
          <Bell className="w-5 h-5 text-slate-500" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-0.5">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          id="notification-panel"
          className="absolute right-0 top-[calc(100%+8px)] w-[360px] rounded-2xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="font-semibold text-[#062E22] text-sm">Notifications</p>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => void markAllRead()}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#062E22] hover:underline"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : recent.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No notifications yet</p>
              </div>
            ) : (
              recent.map((n) => (
                <NotificationItem key={n.id} notification={n} onRead={(id) => void markRead(id)} />
              ))
            )}
          </div>

          {/* Footer */}
          {data.length > 0 && (
            <div className="border-t border-slate-100 px-4 py-2 text-center">
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="text-xs font-semibold text-[#062E22] hover:underline"
              >
                View all notifications →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
