'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useState, useEffect } from 'react';

import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import { EventListItem } from '@/app/types/event';
import { useMarketplaceVendor } from '@/app/hooks/useMarketplace';
import eventsService from '@/app/services/eventsService';
import marketplaceService from '@/app/services/marketplaceService';
import Image from 'next/image';
import { VendorServiceRecord } from '@/app/types/marketplace';

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
  const [selectedServiceRecord, setSelectedServiceRecord] = useState<VendorServiceRecord | null>(null);

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
      router.push(`/organizer/requests/${request.id}`);
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : 'Unable to send the request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
       <div className="fixed top-6 md:left-60 left-0 -z-10 pointer-events-none">
                    <Image
                      src="/Ellipse2.png"
                      alt=""
                      width={200}
                      height={400}
                      className="opacity-80"
                    />
                  </div>
                  <div className="fixed bottom-6  right-60 -z-10 pointer-events-none">
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
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {vendor.service_records && vendor.service_records.length > 0 ? (
                      vendor.service_records.map((service) => (
                        <div
                          key={service.id}
                          onClick={() => setSelectedServiceRecord(service)}
                          className="cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-[#062E22] hover:shadow-md flex flex-col"
                        >
                          {service.images && service.images.length > 0 ? (
                            <div className="aspect-video w-full bg-slate-100 relative shrink-0">
                              <Image src={service.images[0].url} alt={service.title} fill className="object-cover" />
                            </div>
                          ) : (
                            <div className="aspect-video w-full bg-slate-50 flex items-center justify-center shrink-0 border-b border-slate-100">
                              <span className="text-slate-400 text-sm">No Image</span>
                            </div>
                          )}
                          <div className="p-4 flex flex-col flex-1">
                            <h3 className="font-semibold text-slate-800 line-clamp-1">{service.title}</h3>
                            <p className="mt-1 text-sm text-slate-500 line-clamp-2">{service.description}</p>
                            <div className="mt-auto pt-3 flex flex-wrap gap-2 justify-between items-center">
                              {service.location && (
                                <p className="text-xs text-slate-400 flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  <span className="line-clamp-1 max-w-[100px]">{service.location}</span>
                                </p>
                              )}
                              <p className="text-xs font-semibold text-[#062E22]">
                                {service.price_min} ETB
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
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
                      Event
                    </label>
                    <select
                      id="eventId"
                      required
                      value={eventId}
                      onChange={(currentEvent) => setEventId(currentEvent.target.value)}
                      disabled={eventsLoading}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
                    >
                      <option value="">{eventsLoading ? 'Loading events...' : 'Select an event...'}</option>
                      {!eventsLoading && events.length === 0 && <option value="">No events available</option>}
                      {events.map((event) => (
                        <option key={event.id} value={event.id}>
                          {event.title} ({event.date})
                        </option>
                      ))}
                    </select>
                  </div>

                  {vendor && vendor.services.length > 0 && (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Services needed
                      </label>
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
                    disabled={submitting || !description.trim() || !eventId}
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

      {/* Service Detail Modal */}
      {selectedServiceRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-all duration-300">
          <div 
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between bg-white/90 p-6 backdrop-blur-md border-b border-slate-100">
              <h2 className="text-2xl font-bold text-[#062E22]">{selectedServiceRecord.title}</h2>
              <button 
                onClick={() => setSelectedServiceRecord(null)} 
                className="rounded-full p-2 hover:bg-slate-100 transition-colors bg-slate-50"
              >
                <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 pt-2">
              {selectedServiceRecord.images && selectedServiceRecord.images.length > 0 && (
                <div className="mt-2 flex gap-3 overflow-x-auto pb-4 snap-x">
                  {selectedServiceRecord.images.map((img, idx) => (
                     <div key={idx} className="relative h-40 w-64 flex-shrink-0 rounded-2xl overflow-hidden bg-slate-100 snap-center shadow-sm">
                        <Image src={img.url} alt="" fill className="object-cover" />
                     </div>
                  ))}
                </div>
              )}

              <div className="mt-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Description</p>
                <p className="text-sm leading-relaxed text-slate-600 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  {selectedServiceRecord.description}
                </p>
              </div>

              <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Category</p>
                  <p className="mt-1 text-sm font-semibold text-[#062E22]">{selectedServiceRecord.category}</p>
                </div>
                {selectedServiceRecord.location && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Location</p>
                    <p className="mt-1 text-sm font-semibold text-[#062E22]">{selectedServiceRecord.location}</p>
                  </div>
                )}
                <div className="bg-[#062E22]/5 p-4 rounded-2xl border border-[#062E22]/10">
                  <p className="text-xs font-medium text-[#062E22]/60 uppercase tracking-wider">Pricing</p>
                  <p className="mt-1 text-sm font-bold text-[#062E22]">
                    {selectedServiceRecord.pricing_type === 'fixed' 
                      ? `${selectedServiceRecord.price_min} ETB` 
                      : `${selectedServiceRecord.price_min} - ${selectedServiceRecord.price_max} ETB`}
                  </p>
                  {selectedServiceRecord.pricing_type === 'negotiable' && (
                    <span className="text-[10px] font-medium text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded ml-1">Negotiable</span>
                  )}
                </div>
              </div>

              {selectedServiceRecord.service_details && Object.keys(selectedServiceRecord.service_details as any).length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-[#0a4a37]">Service Details</h3>
                    <div className="h-px flex-1 bg-slate-200"></div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {Object.entries(selectedServiceRecord.service_details as Record<string, any>).map(([key, value]) => {
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
                        <div key={key} className="flex justify-between items-center bg-white rounded-xl p-3 border border-slate-200 shadow-sm hover:border-[#062E22]/30 transition-colors">
                          <p className="text-xs font-medium text-slate-500 mr-4">{formattedKey}</p>
                          <p className="text-sm font-semibold text-slate-800 text-right">{String(displayValue)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            
            <div className="sticky bottom-0 bg-white p-6 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => {
                  setSelectedServiceRecord(null);
                  if (!selectedServices.includes(selectedServiceRecord.title)) {
                    handleServiceToggle(selectedServiceRecord.title);
                  }
                  // Scroll to form smoothly
                  document.getElementById('eventId')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="rounded-xl bg-[#062E22] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0a4a37] shadow-lg shadow-[#062E22]/20"
              >
                Add to Request
              </button>
            </div>
          </div>
          
          <div className="absolute inset-0 -z-10" onClick={() => setSelectedServiceRecord(null)}></div>
        </div>
      )}
    </div>
  );
}
