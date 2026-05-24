'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useState, useEffect } from 'react';

import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import LoadingSpinner from '@/components/LoadingSpinner';
import { EventListItem } from '@/app/types/event';
import { useMarketplaceVendor } from '@/app/hooks/useMarketplace';
import eventsService from '@/app/services/eventsService';
import marketplaceService from '@/app/services/marketplaceService';
import Image from 'next/image';

export default function OrganizerVendorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vendorId = params.id as string;
  const { data: vendor, error, loading } = useMarketplaceVendor(vendorId);

  const [events, setEvents] = useState<EventListItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventId, setEventId] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [currentServiceIndex, setCurrentServiceIndex] = useState(0);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [requestStep, setRequestStep] = useState(0); // 0=closed, 1=form, 2=confirm
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleServiceToggle = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service]
    );
  };

  useEffect(() => {
    async function fetchEvents() {
      try {
        console.log('Fetching events...');
        const eventList = await eventsService.getEvents();
        console.log('Events loaded:', eventList);
        setEvents(eventList);
      } catch (err) {
        console.error('Failed to load events:', err);
        // Try alternative approach - direct API call
        try {
          const { api } = await import('@/app/lib/api');
          const rawEvents = await api.get<EventListItem[]>('/events/');
          console.log('Raw events:', rawEvents);
          setEvents(rawEvents.map((e: any) => ({
            id: e.id,
            proposal_id: e.proposal_id,
            title: e.title,
            event_type: e.category,
            location: e.location || 'Location pending',
            date: e.start_date || 'Date pending',
            status: 'UPCOMING',
            backend_status: e.status,
          })));
        } catch (altErr) {
          console.error('Alt fetch also failed:', altErr);
        }
      } finally {
        setEventsLoading(false);
      }
    }
    fetchEvents();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setFormError(null);
      const request = await marketplaceService.createRequest({
        vendor_id: vendorId,
        event_id: eventId,
        services: selectedServices,
        description: description.trim(),
      });
      setToast({ type: 'success', message: 'Request sent successfully!' });
      setTimeout(() => router.push(`/organizer/requests/${request.id}`), 1500);
    } catch (submitError) {
      const msg = submitError instanceof Error ? submitError.message : 'Unable to send the request.';
      setFormError(msg);
      setToast({ type: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen ">
       <div className="fixed top-6 md:left-60 left-0 -z-10 pointer-events-none">
                    <Image
                      src="/Ellipse2.png"
                      alt=""
                      width={200}
                      height={400}
                      className="opacity-80"
                    />
                  </div>
                  <div className="fixed bottom-6  right-0 -z-10 pointer-events-none">
                    <Image
                      src="/Ellipse3.png"
                      alt=""
                      width={200}
                      height={400}
                      className="opacity-80"
                    />
                  </div>
      <Sidebar role="organizer" />
      <DashboardHeader
        searchPlaceholder="Vendor details"
        actionHref="/organizer/vendors"
        actionLabel="Back To Vendors"
      />

      <main className="pt-16 md:ml-60 p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Link href="/organizer/vendors" className="inline-flex items-center text-[#062E22] hover:opacity-70 transition">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              {vendor && (
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold text-[#062E22] pt-1">{vendor.business_name}</h1>
                    {vendor.is_verified ? (
                      <span className="text-xs font-semibold tracking-wide px-2.5 py-1 rounded-full bg-orange-100 text-[#EC5B13]">
                        Verified
                      </span>
                    ) : (
                      <span className="text-xs font-semibold tracking-wide px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
                        Pending
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed text-slate-500 mt-1">
                    This vendor is visible in the verified marketplace and can immediately receive organizer requests for negotiation.
                  </p>
                </div>
              )}
            </div>
            {vendor && (
              <span className="text-lg font-bold text-amber-600">★ {vendor.rating.toFixed(1)}</span>
            )}
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          ) : null}

          {loading ? (
            <LoadingSpinner />
          ) : !vendor ? (
            <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
              <h1 className="text-2xl font-bold text-[#062E22]">Vendor not found</h1>
              <p className="mt-2 text-sm text-slate-500">This marketplace vendor could not be loaded.</p>
            </div>
          ) : (
            <>

              <div className="mt-6">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Services</p>
                <div className="mt-4">
                  {vendor.service_records && vendor.service_records.length > 0 ? (
                    <>
                      {(() => {
                        const current = vendor.service_records[currentServiceIndex];
                        if (!current) return null;
                        const len = vendor.service_records.length;
                        return (
                          <div>
                            {/* Full width image with nav arrows */}
                            <div className="relative w-full aspect-[3/1] bg-slate-100 rounded-lg overflow-hidden">
                              {current.images && current.images.length > 0 ? (
                                <button onClick={() => setPreviewImageUrl(current.images[0].url)} className="absolute inset-0 w-full h-full group">
                                  <Image src={current.images[0].url} alt={current.title} fill className="object-cover pointer-events-none transition duration-300 group-hover:scale-105" />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition duration-300 flex items-center justify-center">
                                    <svg className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                    </svg>
                                  </div>
                                </button>
                              ) : (
                                <div className="flex items-center justify-center h-full text-slate-400 text-sm">No Image</div>
                              )}

                              {len > 1 && (
                                <>
                                  <button
                                    onClick={() => setCurrentServiceIndex((currentServiceIndex - 1 + len) % len)}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow hover:bg-white transition"
                                  >
                                    <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => setCurrentServiceIndex((currentServiceIndex + 1) % len)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow hover:bg-white transition"
                                  >
                                    <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </button>
                                </>
                              )}
                            </div>

                            {/* Service details */}
                            <div className="mt-4 space-y-4">
                              <div className="flex items-center justify-between gap-3">
                                <h3 className="text-xl font-bold text-[#062E22]">{current.title}</h3>
                                <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400 whitespace-nowrap">
                                  Pricing · <span className={`${current.pricing_type === 'negotiable' ? 'text-xs font-semibold tracking-wide px-2.5 py-1 rounded-full text-emerald-600 bg-emerald-100' : 'capitalize text-slate-600'}`}>{current.pricing_type}</span>
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Category</p>
                                      <p className="mt-1 text-sm font-semibold text-[#062E22]">{current.category}</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Location</p>
                                      <p className="mt-1 text-sm font-semibold text-[#062E22]">{current.location || '—'}</p>
                                    </div>
                                  </div>

                                  {current.description && (
                                    <p className="text-sm leading-relaxed text-slate-600 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                      {current.description}
                                    </p>
                                  )}
                                </div>

                                <div>
                                  {current.service_details && Object.keys(current.service_details as any).length > 0 && (
                                    <div>
                                      <div className="flex items-center gap-2 mb-4">
                                        <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-[#0a4a37]">Service Details</h3>
                                        <div className="h-px flex-1 bg-slate-200"></div>
                                      </div>
                                      <div className="grid sm:grid-cols-2 gap-3">
                                        {Object.entries(current.service_details as Record<string, any>).map(([key, value]) => {
                                          const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, str => str.toUpperCase());
                                          let displayValue = value;
                                          if (typeof value === 'boolean') {
                                            displayValue = value ? 'Yes' : 'No';
                                          } else if (Array.isArray(value)) {
                                            displayValue = value.join(', ');
                                          } else if (typeof value === 'object' && value !== null) {
                                            displayValue = JSON.stringify(value);
                                          }
                                          return (
                                            <div key={key} className="flex items-center justify-between gap-2">
                                              <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#062E22]/10 text-[#062E22]/70 whitespace-nowrap">{formattedKey}</span>
                                              <span className="text-sm font-semibold text-[#062E22] text-right">{String(displayValue)}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex justify-end pt-2">
                                <button
                                  onClick={() => {
                                    if (!selectedServices.includes(current.title)) {
                                      handleServiceToggle(current.title);
                                    }
                                    setRequestStep(1);
                                  }}
                                  className="rounded-xl bg-[#062E22] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a4a37] shadow-lg shadow-[#062E22]/20"
                                >
                                  Add to Request
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  ) : vendor.services.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {vendor.services.map((service) => (
                        <span
                          key={`${vendor.id}-${service}`}
                          className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700"
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                      No services listed yet
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Fixed Send Request Button */}
      <button
        onClick={() => setRequestStep(1)}
        className="fixed top-30 right-0 z-40 flex items-center gap-2 rounded-l-xl bg-[#062E22]/70 backdrop-blur-xl border border-[#062E22]/30 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-[#062E22]/90 hover:shadow-xl hover:-translate-y-0.5"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
        Send Request
      </button>

      {/* Full Image Preview Modal */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <Image src={previewImageUrl} alt="" fill className="object-contain pointer-events-none" />
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/40 transition"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Request Modal (Form + Confirm steps) */}
      {requestStep > 0 && vendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between p-6 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-[#062E22]">
                  {requestStep === 1 ? 'New Request' : 'Confirm Request'}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {requestStep === 1 ? 'Fill in the details for your request' : 'Review your request before sending'}
                </p>
              </div>
              <button onClick={() => { setRequestStep(0); setFormError(null); }} className="rounded-full p-2 hover:bg-slate-100 transition-colors bg-slate-50">
                <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {formError && (
              <div className="mx-6 mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{formError}</div>
            )}

            {requestStep === 1 ? (
              <>
                <div className="p-6 space-y-4">
                  <div>
                    <label htmlFor="modalEventId" className="mb-1 block text-sm font-medium text-slate-700">Event</label>
                    <select
                      id="modalEventId"
                      required
                      value={eventId}
                      onChange={(e) => setEventId(e.target.value)}
                      disabled={eventsLoading}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
                    >
                      <option value="">{eventsLoading ? 'Loading events...' : 'Select an event...'}</option>
                      {!eventsLoading && events.length === 0 && <option value="">No events available</option>}
                      {events.map((event) => (
                        <option key={event.id} value={event.id}>
                          {event.title} — {event.event_type} ({event.date})
                        </option>
                      ))}
                    </select>
                  </div>

                  {vendor.services.length > 0 && (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Services needed</label>
                      <div className="flex flex-wrap gap-2">
                        {vendor.services.map((service) => (
                          <button
                            key={service}
                            type="button"
                            onClick={() => handleServiceToggle(service)}
                            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                              selectedServices.includes(service)
                                ? 'bg-[#062E22] text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {service}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label htmlFor="modalDescription" className="mb-1 block text-sm font-medium text-slate-700">Request description</label>
                    <textarea
                      id="modalDescription"
                      required
                      rows={7}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
                      placeholder="Describe the event scope, venue setup, expected deliverables, and any timing constraints."
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-6 border-t border-slate-100">
                  <button
                    onClick={() => { setRequestStep(0); setFormError(null); }}
                    className="flex-1 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!eventId || !description.trim() || selectedServices.length === 0) return;
                      setRequestStep(2);
                    }}
                    disabled={!eventId || !description.trim() || selectedServices.length === 0}
                    className="flex-1 rounded-xl bg-[#062E22] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a4a37] disabled:opacity-60"
                  >
                    Review Request
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="p-6 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vendor</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{vendor.business_name}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Event</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {events.find((e) => e.id === eventId)?.title || eventId}
                    </p>
                  </div>

                  {selectedServices.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Services</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {selectedServices.map((s) => (
                          <span key={s} className="text-xs px-2 py-1 rounded-full bg-[#062E22]/10 text-[#062E22] font-medium">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</p>
                    <p className="mt-1 text-sm text-slate-600 bg-slate-50 rounded-xl p-3 border border-slate-100 leading-relaxed">
                      {description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-6 border-t border-slate-100">
                  <button
                    onClick={() => setRequestStep(1)}
                    className="flex-1 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={async () => {
                      setRequestStep(0);
                      const fakeEvent = { preventDefault: () => {} } as FormEvent<HTMLFormElement>;
                      await handleSubmit(fakeEvent);
                    }}
                    disabled={submitting}
                    className="flex-1 rounded-xl bg-[#062E22] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a4a37] disabled:opacity-60"
                  >
                    {submitting ? 'Sending...' : 'Confirm & Send'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-4 z-[100] animate-in fade-in slide-in-from-right-2">
          <div className={`flex items-center gap-3 rounded-xl px-5 py-3 text-sm font-semibold shadow-xl backdrop-blur-xl border ${
            toast.type === 'success'
              ? 'bg-emerald-600/90 border-emerald-400/30 text-white'
              : 'bg-red-600/90 border-red-400/30 text-white'
          }`}>
            {toast.type === 'success' ? (
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
