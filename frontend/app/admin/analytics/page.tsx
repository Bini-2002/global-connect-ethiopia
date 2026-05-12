'use client';

import { useState } from 'react';
import { BarChart3, RefreshCw, TrendingUp, DollarSign, Layers } from 'lucide-react';
import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import { usePlatformRevenueAnalytics } from '@/app/hooks/useNotificationsAndAnalytics';
import type { RevenueStream } from '@/app/types/notifications';

const PAYMENT_METHODS = ['', 'chapa', 'wallet', 'cash', 'bank_transfer'];

function KPICard({
  label,
  value,
  currency,
  icon,
  accent = false,
}: {
  label: string;
  value: number;
  currency: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-[24px] p-6 flex flex-col gap-4 ${
        accent ? 'bg-[#062E22] text-white' : 'bg-white border border-slate-200 shadow-sm'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent ? 'bg-white/15' : 'bg-[#062E22]/10 text-[#062E22]'}`}>
        {icon}
      </div>
      <div>
        <p className={`text-[11px] uppercase tracking-[0.18em] ${accent ? 'text-white/70' : 'text-slate-400'}`}>
          {label}
        </p>
        <p className={`mt-1 text-2xl font-bold ${accent ? 'text-white' : 'text-[#062E22]'}`}>
          {currency} {value.toLocaleString('en-ET', { maximumFractionDigits: 2 })}
        </p>
      </div>
    </div>
  );
}

function BreakdownCard({ title, stream, currency }: { title: string; stream: RevenueStream; currency: string }) {
  const entries = Object.entries(stream.by_payment_method);
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0a4a37]">{title}</p>
      <p className="mt-1 text-2xl font-bold text-[#062E22]">
        {currency} {stream.total.toLocaleString('en-ET', { maximumFractionDigits: 2 })}
      </p>
      {entries.length > 0 ? (
        <div className="mt-4 space-y-2">
          {entries.map(([method, info]) => {
            const pct = stream.total > 0 ? Math.round((info.total / stream.total) * 100) : 0;
            return (
              <div key={method} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-600 capitalize">{method || 'Unknown'}</span>
                  <span className="text-slate-400">{pct}% · {info.count} tx</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-[#062E22]" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-400 italic">No breakdown data available.</p>
      )}
    </div>
  );
}

export default function AdminPlatformAnalyticsPage() {
  const [paymentMethod, setPaymentMethod] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const { data, loading, error, refresh } = usePlatformRevenueAnalytics({
    paymentMethod: paymentMethod || null,
    fromDate: fromDate || null,
    toDate: toDate || null,
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="admin" />
      <DashboardHeader searchPlaceholder="Platform analytics" />

      <main className="pt-16 md:ml-60 p-6">
        <div className="mx-auto max-w-6xl space-y-6">

          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0a4a37]">Admin</p>
              <h1 className="mt-1 text-3xl font-bold text-[#062E22]">Platform Revenue Analytics</h1>
              {data && (
                <p className="mt-1 text-sm text-slate-500">
                  {data.total_events} events · Generated {new Date(data.generated_at).toLocaleString()}
                </p>
              )}
            </div>
            <button
              onClick={refresh}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#062E22] text-white text-sm font-semibold hover:bg-[#0a4a37] transition"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {/* Filters */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-700 mb-4">Filters</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  title="Payment method filter"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>{m || 'All methods'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  title="From date"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  title="To date"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#062E22]/20"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          )}

          {loading ? (
            <div className="flex justify-center py-24">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#062E22] border-t-transparent" />
            </div>
          ) : data ? (
            <>
              {/* KPI Strip */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KPICard
                  label="Total Gross Revenue"
                  value={data.total_gross_revenue}
                  currency={data.currency}
                  icon={<TrendingUp className="w-5 h-5" />}
                  accent
                />
                <KPICard
                  label="Ticket Revenue"
                  value={data.ticket_revenue.total}
                  currency={data.currency}
                  icon={<BarChart3 className="w-5 h-5 text-[#062E22]" />}
                />
                <KPICard
                  label="Commission Income"
                  value={data.commission_income}
                  currency={data.currency}
                  icon={<DollarSign className="w-5 h-5 text-[#062E22]" />}
                />
                <KPICard
                  label="Vendor Payouts"
                  value={data.payout_total}
                  currency={data.currency}
                  icon={<Layers className="w-5 h-5 text-[#062E22]" />}
                />
              </div>

              {/* Breakdown cards */}
              <div className="grid gap-6 lg:grid-cols-2">
                <BreakdownCard
                  title="Ticket Revenue Breakdown"
                  stream={data.ticket_revenue}
                  currency={data.currency}
                />
                <BreakdownCard
                  title="Vendor Fee Breakdown"
                  stream={data.vendor_fee_revenue}
                  currency={data.currency}
                />
              </div>

              {/* Summary stat row */}
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0a4a37]">Platform Summary</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-4 text-center">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Total Events</p>
                    <p className="mt-2 text-3xl font-bold text-[#062E22]">{data.total_events}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-center">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Commission Rate</p>
                    <p className="mt-2 text-3xl font-bold text-[#062E22]">10%</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-center">
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Filter Applied</p>
                    <p className="mt-2 text-xl font-bold text-[#062E22] capitalize">
                      {data.payment_method_filter || 'None'}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
