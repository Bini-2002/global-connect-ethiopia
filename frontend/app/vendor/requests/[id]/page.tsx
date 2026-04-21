'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useState } from 'react';

import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import NegotiationTimeline from '@/components/marketplace/NegotiationTimeline';
import StatusBadge from '@/components/marketplace/StatusBadge';
import {
  formatCurrency,
  formatDateTime,
  requestCanCounter,
  requestNeedsVendorQuote,
} from '@/app/lib/marketplace';
import { useMarketplaceRequest } from '@/app/hooks/useMarketplace';
import marketplaceService from '@/app/services/marketplaceService';

export default function VendorRequestDetailPage() {
  const params = useParams();
  const requestId = params.id as string;
  const { data: request, error, loading, refresh } = useMarketplaceRequest(requestId);

  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState<'quote' | 'counter' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!request) {
      return;
    }

    const action = requestNeedsVendorQuote(request) ? 'quote' : 'counter';

    try {
      setSaving(action);
      setActionError(null);

      if (action === 'quote') {
        await marketplaceService.sendQuote(requestId, {
          amount: Number(amount),
          message: message.trim() || undefined,
        });
      } else {
        await marketplaceService.sendCounter(requestId, {
          amount: Number(amount),
          message: message.trim() || undefined,
        });
      }

      setAmount('');
      setMessage('');
      refresh();
    } catch (nextError) {
      setActionError(nextError instanceof Error ? nextError.message : 'Unable to update the negotiation.');
    } finally {
      setSaving(null);
    }
  };

  const canRespond = request ? requestNeedsVendorQuote(request) || requestCanCounter(request) : false;

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="vendor" />
      <DashboardHeader
        searchPlaceholder="Request details"
        actionHref="/vendor/contracts"
        actionLabel="Open Contracts"
      />

      <main className="pt-16 md:ml-60 p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex items-center justify-between gap-4">
            <Link href="/vendor/requests" className="inline-flex items-center gap-2 text-sm font-semibold text-[#062E22] hover:underline">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back to requests
            </Link>
            <Link href="/vendor/wallet" className="text-sm font-semibold text-[#062E22] hover:underline">
              Vendor wallet
            </Link>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          ) : null}

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#062E22] border-t-transparent" />
            </div>
          ) : !request ? (
            <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
              <h1 className="text-2xl font-bold text-[#062E22]">Request not found</h1>
              <p className="mt-2 text-sm text-slate-500">This vendor negotiation could not be loaded.</p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <section className="space-y-6">
                <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusBadge status={request.status} />
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                      {request.organizer_name || 'Organizer'}
                    </span>
                  </div>

                  <h1 className="mt-4 text-3xl font-bold text-[#062E22]">{request.organizer_name || 'Organizer request'}</h1>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{request.description}</p>

                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <div className="rounded-[24px] bg-[#F5FBF8] p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Current amount</p>
                      <p className="mt-2 text-xl font-bold text-[#062E22]">{formatCurrency(request.current_amount)}</p>
                    </div>
                    <div className="rounded-[24px] bg-slate-100 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Created</p>
                      <p className="mt-2 text-sm font-medium text-slate-700">{formatDateTime(request.created_at)}</p>
                    </div>
                    <div className="rounded-[24px] bg-slate-100 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Last updated</p>
                      <p className="mt-2 text-sm font-medium text-slate-700">{formatDateTime(request.updated_at)}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0a4a37]">Negotiation timeline</p>
                  <h2 className="mt-2 text-2xl font-bold text-[#062E22]">Quote history</h2>
                  <div className="mt-6">
                    <NegotiationTimeline messages={request.messages} />
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0a4a37]">Vendor response</p>
                  <h2 className="mt-2 text-2xl font-bold text-[#062E22]">
                    {requestNeedsVendorQuote(request) ? 'Send your first quote' : 'Send a counteroffer'}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-slate-500">
                    Post a number with a short explanation so the organizer can accept or counter from the same thread.
                  </p>

                  {actionError ? (
                    <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{actionError}</div>
                  ) : null}

                  {canRespond ? (
                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                      <div>
                        <label htmlFor="amount" className="mb-1 block text-sm font-medium text-slate-700">
                          {requestNeedsVendorQuote(request) ? 'Quote amount' : 'Counter amount'}
                        </label>
                        <input
                          id="amount"
                          type="number"
                          min={1}
                          required
                          value={amount}
                          onChange={(currentEvent) => setAmount(currentEvent.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
                          placeholder="Enter amount"
                        />
                      </div>
                      <div>
                        <label htmlFor="message" className="mb-1 block text-sm font-medium text-slate-700">Message</label>
                        <textarea
                          id="message"
                          rows={5}
                          value={message}
                          onChange={(currentEvent) => setMessage(currentEvent.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
                          placeholder="Describe what is included, timing, or any scope notes."
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={saving !== null || !amount}
                        className="w-full rounded-xl bg-[#062E22] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0a4a37] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {saving === 'quote'
                          ? 'Sending quote...'
                          : saving === 'counter'
                            ? 'Sending counter...'
                            : requestNeedsVendorQuote(request)
                              ? 'Send Quote'
                              : 'Send Counteroffer'}
                      </button>
                    </form>
                  ) : (
                    <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                      {request.status === 'ACCEPTED'
                        ? 'This request has already been accepted and should now move through the contract flow.'
                        : 'No vendor response is available for the current request state.'}
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
