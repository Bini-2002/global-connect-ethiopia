'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { BarChart3, RefreshCw, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useEventWorkspace } from '@/app/hooks/useEventWorkspace';
import { useEventRevenueAnalytics } from '@/app/hooks/useNotificationsAndAnalytics';
import { EventWorkspaceShell, formatCurrency } from '@/components/organizer/events';
import type { RevenueStream } from '@/app/types/notifications';

const PAYMENT_METHODS = ['', 'chapa', 'wallet', 'cash', 'bank_transfer'];

// ─── Revenue vs Budget Bar Chart ─────────────────────────────────────────────

interface ChartBar {
  label: string;
  revenue: number;
  budget: number;
  currency: string;
}

function RevenueVsBudgetChart({ bars }: { bars: ChartBar[] }) {
  const max = Math.max(...bars.flatMap((b) => [b.revenue, b.budget]), 1);
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-[#0a4a37]">Revenue vs. Budget</h3>
      <div className="mt-6 flex items-end gap-5 overflow-x-auto pb-2">
        {bars.map((bar) => {
          const revPct = Math.min((bar.revenue / max) * 100, 100);
          const budPct = Math.min((bar.budget / max) * 100, 100);
          const overBudget = bar.revenue > bar.budget && bar.budget > 0;
          return (
            <div key={bar.label} className="flex flex-col items-center gap-2 min-w-[80px]">
              <div className="flex items-end gap-1.5 h-40 w-full justify-center">
                {/* Revenue bar */}
                <div className="flex flex-col justify-end w-8 h-40 relative group">
                  <div
                    className={`w-full rounded-t-lg transition-all duration-500 ${
                      overBudget ? 'bg-red-400' : 'bg-[#062E22]'
                    }`}
                    style={{ height: `${revPct}%`, minHeight: bar.revenue > 0 ? '4px' : '0' }}
                  />
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 bg-[#062E22] text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap">
                    Revenue: {bar.currency} {bar.revenue.toLocaleString()}
                  </div>
                </div>
                {/* Budget bar */}
                <div className="flex flex-col justify-end w-8 h-40 relative group">
                  <div
                    className="w-full rounded-t-lg bg-[#8ECFC0] transition-all duration-500"
                    style={{ height: `${budPct}%`, minHeight: bar.budget > 0 ? '4px' : '0' }}
                  />
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 bg-slate-700 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap">
                    Budget: {bar.currency} {bar.budget.toLocaleString()}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 text-center font-medium leading-tight">{bar.label}</p>
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="mt-5 flex items-center gap-5 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-3 h-3 rounded-sm bg-[#062E22] inline-block" /> Revenue
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-3 h-3 rounded-sm bg-[#8ECFC0] inline-block" /> Budget estimate
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-3 h-3 rounded-sm bg-red-400 inline-block" /> Over budget
        </div>
      </div>
    </div>
  );
}

// ─── Revenue Stat Card ───────────────────────────────────────────────────────

function RevenueStat({
  label,
  value,
  prev,
  currency,
  accent = false,
}: {
  label: string;
  value: number;
  prev?: number;
  currency: string;
  accent?: boolean;
}) {
  const delta = prev !== undefined ? value - prev : null;
  return (
    <div className={`rounded-[24px] p-5 ${accent ? 'bg-[#062E22] text-white' : 'bg-slate-50'}`}>
      <p className={`text-[11px] uppercase tracking-[0.18em] ${accent ? 'text-white/70' : 'text-slate-400'}`}>
        {label}
      </p>
      <p className={`mt-2 text-2xl font-bold ${accent ? 'text-white' : 'text-[#062E22]'}`}>
        {currency} {value.toLocaleString('en-ET', { maximumFractionDigits: 2 })}
      </p>
      {delta !== null && (
        <div className={`mt-2 flex items-center gap-1 text-xs font-semibold ${
          delta > 0 ? (accent ? 'text-[#8ECFC0]' : 'text-emerald-600') :
          delta < 0 ? 'text-red-400' : 'text-slate-400'
        }`}>
          {delta > 0 ? <TrendingUp className="w-3.5 h-3.5" /> :
           delta < 0 ? <TrendingDown className="w-3.5 h-3.5" /> :
           <Minus className="w-3.5 h-3.5" />}
          {delta > 0 ? '+' : ''}{currency} {delta.toLocaleString('en-ET', { maximumFractionDigits: 0 })}
        </div>
      )}
    </div>
  );
}

// ─── Method Breakdown ────────────────────────────────────────────────────────

function MethodBreakdown({ stream, currency }: { stream: RevenueStream; currency: string }) {
  const entries = Object.entries(stream.by_payment_method);
  if (entries.length === 0) {
    return <p className="text-sm text-slate-400 mt-2 italic">No payment method breakdown available.</p>;
  }
  const total = entries.reduce((s, [, v]) => s + v.total, 0) || 1;
  return (
    <div className="mt-4 space-y-2">
      {entries.map(([method, info]) => (
        <div key={method} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#F5FBF8] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#062E22]">
                {method || 'Unknown'}
              </span>
              <span className="text-xs text-slate-500">{info.count} txn{info.count !== 1 ? 's' : ''}</span>
            </div>
            <p className="text-sm font-bold text-[#062E22]">
              {currency} {info.total.toLocaleString('en-ET', { maximumFractionDigits: 2 })}
            </p>
          </div>
          {/* Mini progress bar */}
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#062E22] rounded-full transition-all duration-500"
              style={{ width: `${(info.total / total) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function EventRevenueAnalyticsPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { event, loading: eventLoading, error: eventError } = useEventWorkspace(eventId);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const { data, loading, error, refresh } = useEventRevenueAnalytics(
    eventId,
    paymentMethod || null,
  );

  // Track when data arrives
  useEffect(() => {
    if (data) setLastRefreshed(new Date());
  }, [data]);

  const handleRefresh = () => {
    refresh();
  };

  // Build chart bars: Ticket / Vendor / Sponsorship vs estimated budget
  const budgetTotal = event?.budget_total_estimated ?? 0;
  const chartBars: ChartBar[] = data
    ? [
        {
          label: 'Tickets',
          revenue: data.ticket_revenue.total,
          budget: budgetTotal * 0.5,  // allocate 50% of budget estimate to tickets as heuristic
          currency: data.currency,
        },
        {
          label: 'Vendor Fees',
          revenue: data.vendor_fee_revenue.total,
          budget: budgetTotal * 0.3,
          currency: data.currency,
        },
        {
          label: 'Sponsorship',
          revenue: data.sponsorship_revenue.total,
          budget: budgetTotal * 0.2,
          currency: data.currency,
        },
        {
          label: 'Total',
          revenue: data.total_gross_revenue,
          budget: budgetTotal,
          currency: data.currency,
        },
      ]
    : [];

  const timeSince = () => {
    const secs = Math.floor((Date.now() - lastRefreshed.getTime()) / 1000);
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    return `${mins}m ago`;
  };

  return (
    <EventWorkspaceShell
      event={event}
      loading={eventLoading}
      error={eventError}
      activeTab="analytics"
      aside={
        <div className="space-y-6">
          {/* Filter */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#062E22]">Filter</h2>
            <div className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-slate-700">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20"
                title="Filter by payment method"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m || 'All methods'}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Last updated */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Clock className="w-4 h-4 shrink-0" />
              <span>Last updated: <strong className="text-[#062E22]">{timeSince()}</strong></span>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing…' : 'Refresh Now'}
            </button>
            {data && (
              <p className="mt-2 text-center text-xs text-slate-400">
                Generated: {new Date(data.generated_at).toLocaleString()}
              </p>
            )}
          </div>

          {/* Budget snapshot */}
          {event && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Budget Estimate</p>
              <p className="mt-2 text-xl font-bold text-[#062E22]">{formatCurrency(event.budget_total_estimated, event.budget_currency)}</p>
              {data && (
                <div className={`mt-2 text-xs font-semibold flex items-center gap-1.5 ${
                  data.total_gross_revenue >= event.budget_total_estimated ? 'text-emerald-600' : 'text-amber-600'
                }`}>
                  {data.total_gross_revenue >= event.budget_total_estimated
                    ? <TrendingUp className="w-3.5 h-3.5" />
                    : <TrendingDown className="w-3.5 h-3.5" />}
                  {data.total_gross_revenue >= event.budget_total_estimated
                    ? 'Revenue covers budget'
                    : `${formatCurrency(event.budget_total_estimated - data.total_gross_revenue, data.currency)} short`}
                </div>
              )}
            </div>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Page title */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#062E22]/10 text-[#062E22] flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#062E22]">Revenue Analytics</h1>
              <p className="text-sm text-slate-500">Aggregated financial overview — UC-25</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        {loading && !data ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#062E22] border-t-transparent" />
          </div>
        ) : data ? (
          <>
            {/* KPI strip */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <RevenueStat label="Total Gross Revenue" value={data.total_gross_revenue} currency={data.currency} accent />
              <RevenueStat label="Ticket Revenue" value={data.ticket_revenue.total} currency={data.currency} />
              <RevenueStat label="Vendor Fees" value={data.vendor_fee_revenue.total} currency={data.currency} />
              <RevenueStat label="Sponsorships" value={data.sponsorship_revenue.total} currency={data.currency} />
            </div>

            {/* Revenue vs Budget Chart */}
            {chartBars.length > 0 && <RevenueVsBudgetChart bars={chartBars} />}

            {/* Payment method breakdowns */}
            <div className="grid gap-6 lg:grid-cols-3">
              {(
                [
                  { title: 'Ticket Sales', stream: data.ticket_revenue },
                  { title: 'Vendor Fees', stream: data.vendor_fee_revenue },
                  { title: 'Sponsorship', stream: data.sponsorship_revenue },
                ] as const
              ).map(({ title, stream }) => (
                <div key={title} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0a4a37]">{title}</p>
                  <p className="mt-1 text-2xl font-bold text-[#062E22]">
                    {data.currency} {stream.total.toLocaleString('en-ET', { maximumFractionDigits: 2 })}
                  </p>
                  <MethodBreakdown stream={stream} currency={data.currency} />
                </div>
              ))}
            </div>

            {/* Syncing warning */}
            {loading && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                Refreshing analytics data…
              </div>
            )}
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-14 text-center">
            <BarChart3 className="mx-auto w-10 h-10 text-slate-300 mb-4" />
            <h2 className="text-lg font-bold text-[#062E22]">No analytics data yet</h2>
            <p className="mt-2 text-sm text-slate-500">Revenue data will appear once bookings or vendor transactions are recorded for this event.</p>
          </div>
        )}
      </div>
    </EventWorkspaceShell>
  );
}
