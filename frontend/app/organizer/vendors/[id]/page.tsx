'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import { useMarketplaceVendor } from '@/app/hooks/useMarketplace';
import marketplaceService from '@/app/services/marketplaceService';

export default function OrganizerVendorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vendorId = params.id as string;
  const { data: vendor, error, loading } = useMarketplaceVendor(vendorId);

  const [description, setDescription] = useState('');
  const [eventId, setEventId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setFormError(null);
      const request = await marketplaceService.createRequest({
        vendor_id: vendorId,
        event_id: eventId.trim() || undefined,
        description: description.trim(),
      });
      router.push(`/organizer/requests/${request.id}`);
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : 'Unable to send the request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="organizer" />
      <DashboardHeader
        searchPlaceholder="Vendor details"
        actionHref="/organizer/vendors"
        actionLabel="Back To Vendors"
      />

      <main className="pt-16 md:ml-60 p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <Link href="/organizer/vendors" className="inline-flex items-center gap-2 text-sm font-semibold text-[#062E22] hover:underline">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to vendor marketplace
          </Link>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          ) : null}

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#062E22] border-t-transparent" />
            </div>
          ) : !vendor ? (
            <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
              <h1 className="text-2xl font-bold text-[#062E22]">Vendor not found</h1>
              <p className="mt-2 text-sm text-slate-500">This marketplace vendor could not be loaded.</p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0a4a37]">Vendor profile</p>
                <h1 className="mt-2 text-3xl font-bold text-[#062E22]">{vendor.business_name}</h1>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">
                  This vendor is visible in the verified marketplace and can immediately receive organizer requests for negotiation.
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-[24px] bg-[#F5FBF8] p-5">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Verification</p>
                    <p className="mt-2 text-2xl font-bold text-[#062E22]">{vendor.is_verified ? 'Verified' : 'Pending'}</p>
                  </div>
                  <div className="rounded-[24px] bg-slate-100 p-5">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Rating</p>
                    <p className="mt-2 text-2xl font-bold text-[#062E22]">{vendor.rating.toFixed(1)}</p>
                  </div>
                </div>

                <div className="mt-6">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Services</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {vendor.services.length ? (
                      vendor.services.map((service) => (
                        <span
                          key={`${vendor.id}-${service}`}
                          className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700"
                        >
                          {service}
                        </span>
                      ))
                    ) : (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                        No services listed yet
                      </span>
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0a4a37]">Send request</p>
                <h2 className="mt-2 text-2xl font-bold text-[#062E22]">Start the negotiation</h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">
                  Describe the scope clearly. The vendor will quote first, then both sides can counter until you accept the final amount.
                </p>

                {formError ? (
                  <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{formError}</div>
                ) : null}

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div>
                    <label htmlFor="eventId" className="mb-1 block text-sm font-medium text-slate-700">
                      Event ID
                    </label>
                    <input
                      id="eventId"
                      value={eventId}
                      onChange={(currentEvent) => setEventId(currentEvent.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
                      placeholder="Optional event id for this request"
                    />
                  </div>

                  <div>
                    <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">
                      Request description
                    </label>
                    <textarea
                      id="description"
                      required
                      rows={7}
                      value={description}
                      onChange={(currentEvent) => setDescription(currentEvent.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
                      placeholder="Describe the event scope, venue setup, expected deliverables, and any timing constraints."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !description.trim()}
                    className="w-full rounded-xl bg-[#062E22] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0a4a37] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? 'Sending request...' : 'Send Request'}
                  </button>
                </form>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
