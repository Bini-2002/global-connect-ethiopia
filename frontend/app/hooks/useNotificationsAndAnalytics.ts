'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from '@/app/lib/api';
import type {
  EventRevenueAnalytics,
  NotificationRecord,
  PlatformRevenueAnalytics,
} from '@/app/types/notifications';

// ─── Notifications ────────────────────────────────────────────────────────────

export function useNotifications(unreadOnly = false) {
  const [data, setData] = useState<NotificationRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const qs = unreadOnly ? '?unread=true' : '';
        const response = await api.get<NotificationRecord[]>(`/notifications${qs}`);
        if (active) setData(response);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load notifications');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [reloadKey, unreadOnly]);

  const markRead = useCallback(async (id: string) => {
    await api.patch<NotificationRecord>(`/notifications/${id}/read`);
    setData((prev) => prev.map((n) => (n.id === id ? { ...n, read_status: true } : n)));
  }, []);

  const markAllRead = useCallback(async () => {
    await api.post('/notifications/read-all');
    setData((prev) => prev.map((n) => ({ ...n, read_status: true })));
  }, []);

  const unreadCount = data.filter((n) => !n.read_status).length;

  return {
    data,
    error,
    loading,
    unreadCount,
    markRead,
    markAllRead,
    refresh: () => setReloadKey((k) => k + 1),
  };
}

// ─── Polling hook for unread badge ───────────────────────────────────────────

export function useUnreadNotificationCount(pollIntervalMs = 30_000) {
  const [count, setCount] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch = useCallback(async () => {
    try {
      const data = await api.get<NotificationRecord[]>('/notifications?unread=true&limit=1');
      // Backend returns all unread; use length
      const full = await api.get<NotificationRecord[]>('/notifications?unread=true&limit=200');
      setCount(full.length);
    } catch {
      // silently ignore — user may not be logged in
    }
  }, []);

  useEffect(() => {
    void fetch();
    timer.current = setInterval(() => { void fetch(); }, pollIntervalMs);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [fetch, pollIntervalMs]);

  return count;
}

// ─── Event Revenue Analytics ─────────────────────────────────────────────────

export function useEventRevenueAnalytics(
  eventId: string | null,
  paymentMethod: string | null = null,
) {
  const [data, setData] = useState<EventRevenueAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!eventId) return;
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const qs = paymentMethod ? `?payment_method=${encodeURIComponent(paymentMethod)}` : '';
        const response = await api.get<EventRevenueAnalytics>(
          `/analytics/revenue/events/${eventId}${qs}`,
        );
        if (active) setData(response);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load analytics');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [eventId, paymentMethod, reloadKey]);

  return { data, error, loading, refresh: () => setReloadKey((k) => k + 1) };
}

// ─── Platform Revenue Analytics (admin) ──────────────────────────────────────

export function usePlatformRevenueAnalytics(params?: {
  paymentMethod?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
}) {
  const [data, setData] = useState<PlatformRevenueAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const qs = new URLSearchParams();
        if (params?.paymentMethod) qs.set('payment_method', params.paymentMethod);
        if (params?.fromDate) qs.set('from_date', params.fromDate);
        if (params?.toDate) qs.set('to_date', params.toDate);
        const response = await api.get<PlatformRevenueAnalytics>(
          `/admin/analytics/revenue${qs.toString() ? '?' + qs.toString() : ''}`,
        );
        if (active) setData(response);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load analytics');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [reloadKey, params?.paymentMethod, params?.fromDate, params?.toDate]);

  return { data, error, loading, refresh: () => setReloadKey((k) => k + 1) };
}

export function usePlatformReceipts() {
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get<any[]>('/admin/analytics/receipts');
        if (active) setData(response);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load receipts');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [reloadKey]);

  return { data, error, loading, refresh: () => setReloadKey((k) => k + 1) };
}
