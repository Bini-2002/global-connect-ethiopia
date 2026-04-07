'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import vendorPortalService from '@/app/services/vendorPortalService';
import { VendorRequestRecord } from '@/app/types/marketplace';

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

export default function VendorRequestDetailPage() {
  const params = useParams();
  const requestId = params.id as string;

  const [request, setRequest] = useState<VendorRequestRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [finalAmount, setFinalAmount] = useState('');

  const loadRequest = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await vendorPortalService.getRequestById(requestId);
      setRequest(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load request details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRequest();
  }, [requestId]);

  const handleAction = async (action: 'counter' | 'accept' | 'reject', event?: FormEvent) => {
    event?.preventDefault();
    setError(null);

    try {
      setSavingAction(action);
      let updated: VendorRequestRecord;

      if (action === 'counter') {
        updated = await vendorPortalService.counterOfferRequest(requestId, {
          message: message || undefined,
          final_amount: finalAmount ? Number(finalAmount) : undefined,
        });
      } else if (action === 'accept') {
        updated = await vendorPortalService.acceptRequest(requestId, {
          message: message || undefined,
          final_amount: finalAmount ? Number(finalAmount) : undefined,
        });
      } else {
        updated = await vendorPortalService.rejectRequest(requestId);
      }

      setRequest(updated);
      setMessage('');
      setFinalAmount('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update request.');
    } finally {
      setSavingAction(null);
    }
  };

  const canNegotiate = request ? ['pending', 'negotiating'].includes(request.status) : false;

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="vendor" />
      <DashboardHeader
        searchPlaceholder="Request detail"
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
            <Link href="/vendor/contracts" className="text-sm font-semibold text-[#062E22] hover:underline">
              View contracts
            </Link>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#062E22] border-t-transparent" />
            </div>
          ) : !request ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center shadow-sm">
              <h1 className="text-2xl font-bold text-[#062E22]">Request not found</h1>
              <p className="mt-2 text-sm text-slate-500">This vendor request could not be loaded.</p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
              <div className="space-y-6">
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-[#F5FBF8] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#062E22]">
                      {request.status}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                      {request.service_title || 'Requested service'}
                    </span>
                  </div>
                  <h1 className="mt-4 text-3xl font-bold text-[#062E22]">{request.event_title || request.proposal_title || 'Organizer request'}</h1>
                  <p className="mt-3 text-sm leading-relaxed text-slate-500">{request.message}</p>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">Organizer</p>
                      <p className="mt-1 text-sm font-semibold text-[#062E22]">{request.organizer_name || 'Organizer'}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">Current deal amount</p>
                      <p className="mt-1 text-sm font-semibold text-[#062E22]">
                        {formatCurrency(request.agreed_amount ?? request.proposed_amount, request.currency)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">Event date</p>
                      <p className="mt-1 text-sm font-semibold text-[#062E22]">{formatDate(request.event_date)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">Last updated</p>
                      <p className="mt-1 text-sm font-semibold text-[#062E22]">{formatDate(request.updated_at)}</p>
                    </div>
                  </div>

                  {request.requirements && (
                    <div className="mt-6 rounded-2xl border border-slate-200 p-4">
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">Organizer requirements</p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">{request.requirements}</p>
                    </div>
                  )}
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#0a4a37]">Conversation</p>
                  <h2 className="mt-1 text-2xl font-bold text-[#062E22]">Negotiation history</h2>

                  <div className="mt-5 space-y-4">
                    {request.messages.length ? (
                      request.messages.map((item, index) => (
                        <div key={`${item.created_at}-${index}`} className="rounded-2xl border border-slate-200 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[#062E22]">{item.sender_name || item.sender_role}</p>
                              <p className="text-xs uppercase tracking-wide text-slate-400">{item.message_type}</p>
                            </div>
                            <p className="text-xs text-slate-400">{formatDate(item.created_at)}</p>
                          </div>
                          <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.body}</p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                        No negotiation messages are stored on this request yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#0a4a37]">Vendor response</p>
                  <h2 className="mt-1 text-2xl font-bold text-[#062E22]">Accept, counter, or decline</h2>
                  <p className="mt-3 text-sm leading-relaxed text-slate-500">
                    Use this panel to progress the deal. Once the request reaches accepted status, the organizer can generate the contract for signatures.
                  </p>

                  {canNegotiate ? (
                    <form onSubmit={(event) => handleAction('counter', event)} className="mt-6 space-y-4">
                      <div>
                        <label htmlFor="message" className="mb-1 block text-sm font-medium text-slate-700">Response message</label>
                        <textarea
                          id="message"
                          rows={4}
                          value={message}
                          onChange={(event) => setMessage(event.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
                          placeholder="Share your availability, clarifications, or deal adjustments."
                        />
                      </div>
                      <div>
                        <label htmlFor="finalAmount" className="mb-1 block text-sm font-medium text-slate-700">Counter / final amount</label>
                        <input
                          id="finalAmount"
                          type="number"
                          min={0}
                          value={finalAmount}
                          onChange={(event) => setFinalAmount(event.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
                          placeholder="Optional revised amount"
                        />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => void handleAction('accept')}
                          disabled={!!savingAction}
                          className="rounded-xl bg-[#062E22] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0a4a37] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingAction === 'accept' ? 'Accepting...' : 'Accept Request'}
                        </button>
                        <button
                          type="submit"
                          disabled={!!savingAction}
                          className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingAction === 'counter' ? 'Sending...' : 'Send Counter'}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleAction('reject')}
                        disabled={!!savingAction}
                        className="w-full rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingAction === 'reject' ? 'Rejecting...' : 'Reject Request'}
                      </button>
                    </form>
                  ) : (
                    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                      This request is already in <span className="font-semibold text-[#062E22]">{request.status}</span> status.
                      {request.status === 'accepted' && (
                        <span> The organizer can now create a contract for signatures.</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#0a4a37]">Next step</p>
                  <h2 className="mt-1 text-xl font-bold text-[#062E22]">After acceptance</h2>
                  <p className="mt-3 text-sm leading-relaxed text-slate-500">
                    Accepted requests move into the contract workflow. Once the organizer creates the contract, you will be able to open it from the contracts area and sign directly in the portal.
                  </p>
                  <Link href="/vendor/contracts" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#062E22] hover:underline">
                    Open contract workspace
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
