'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import vendorPortalService from '@/app/services/vendorPortalService';
import { VendorRequestRecord } from '@/app/types/marketplace';

const STATUS_FILTERS = ['all', 'pending', 'negotiating', 'accepted', 'rejected'] as const;

function formatCurrency(value?: number | null, currency = 'ETB') {
  if (value === undefined || value === null) return 'Amount pending';
  return `${currency} ${new Intl.NumberFormat('en-ET', { maximumFractionDigits: 0 }).format(value)}`;
}

function formatDate(value?: string | null) {
  if (!value) return 'Recently';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function VendorRequestsPage() {
  const [requests, setRequests] = useState<VendorRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('all');

  useEffect(() => {
    let active = true;

    const loadRequests = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await vendorPortalService.getRequests();
        if (!active) return;
        setRequests(response);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load vendor requests.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadRequests();

    return () => {
      active = false;
    };
  }, []);

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const matchesStatus = statusFilter === 'all' ? true : request.status === statusFilter;
      const query = searchQuery.trim().toLowerCase();
      const matchesQuery = !query
        ? true
        : [request.event_title, request.service_title, request.organizer_name, request.message]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query));

      return matchesStatus && matchesQuery;
    });
  }, [requests, searchQuery, statusFilter]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="vendor" />
      <DashboardHeader
        searchPlaceholder="Search requests..."
        onSearch={setSearchQuery}
        actionHref="/vendor/contracts"
        actionLabel="Open Contracts"
      />

      <main className="pt-16 md:ml-60 p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#0a4a37]">Requests inbox</p>
              <h1 className="mt-1 text-3xl font-bold text-[#062E22]">Review organizer requests and respond clearly.</h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
                Every request here is tied to one of your published services. Open a request to accept it, reject it, or counter with a revised amount and message.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-400">Inbox volume</p>
              <p className="mt-1 text-3xl font-extrabold text-[#062E22]">{requests.length}</p>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((status) => {
              const active = statusFilter === status;
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? 'bg-[#062E22] text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {status}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#062E22] border-t-transparent" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center shadow-sm">
              <h2 className="text-2xl font-bold text-[#062E22]">No requests match the current view</h2>
              <p className="mt-2 text-sm text-slate-500">
                Once organizers target your services, they will appear here with negotiation history and deal status.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <Link
                  key={request.id}
                  href={`/vendor/requests/${request.id}`}
                  className="block rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-bold text-[#062E22]">{request.service_title || 'Requested service'}</h2>
                        <span className="rounded-full bg-[#F5FBF8] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#062E22]">
                          {request.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">
                        {request.event_title || request.proposal_title || 'Organizer request'}
                      </p>
                      <p className="mt-4 text-sm leading-relaxed text-slate-600">{request.message}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      <p className="text-slate-400">Organizer</p>
                      <p className="mt-1 font-semibold text-[#062E22]">{request.organizer_name || 'Organizer'}</p>
                      <p className="mt-3 text-slate-400">Current amount</p>
                      <p className="mt-1 font-semibold text-[#062E22]">
                        {formatCurrency(request.agreed_amount ?? request.proposed_amount, request.currency)}
                      </p>
                      <p className="mt-3 text-slate-400">Updated</p>
                      <p className="mt-1 font-medium text-slate-700">{formatDate(request.updated_at)}</p>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-between text-sm">
                    <p className="text-slate-400">{request.messages.length} message{request.messages.length === 1 ? '' : 's'} in thread</p>
                    <span className="font-semibold text-[#062E22]">Open request</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
