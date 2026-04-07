'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import vendorPortalService from '@/app/services/vendorPortalService';
import {
  VendorPortalSummary,
  VendorServiceCreatePayload,
  VendorServiceRecord,
} from '@/app/types/marketplace';

const CATEGORY_OPTIONS = [
  'Venue Provider',
  'Catering Provider',
  'Decor',
  'Audio / Visual',
  'Security',
  'Photography',
];

function formatCurrency(value?: number | null) {
  if (value === undefined || value === null) return 'N/A';
  return `ETB ${new Intl.NumberFormat('en-ET', { maximumFractionDigits: 0 }).format(value)}`;
}

function formatDate(value?: string | null) {
  if (!value) return 'Recently';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const initialFormState = {
  title: '',
  description: '',
  category: 'Venue Provider',
  price_min: '50000',
  price_max: '120000',
  pricing_type: 'negotiable' as 'fixed' | 'negotiable',
  location: 'Addis Ababa',
  tags: '',
  image_urls: '',
  availability: '',
};

export default function VendorDashboardPage() {
  const [summary, setSummary] = useState<VendorPortalSummary | null>(null);
  const [services, setServices] = useState<VendorServiceRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState(initialFormState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const [summaryResponse, servicesResponse] = await Promise.all([
        vendorPortalService.getPortalSummary(),
        vendorPortalService.getMyServices(),
      ]);
      setSummary(summaryResponse);
      setServices(servicesResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load the vendor portal.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return services;
    const query = searchQuery.toLowerCase();
    return services.filter((service) =>
      [service.title, service.category, service.location, service.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [searchQuery, services]);

  const handleCreateService = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: VendorServiceCreatePayload = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        price_min: Number(form.price_min),
        price_max: Number(form.price_max),
        pricing_type: form.pricing_type,
        location: form.location.trim(),
        tags: form.tags
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        image_urls: form.image_urls
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        availability: form.availability.trim() || undefined,
      };

      await vendorPortalService.createService(payload);
      setForm(initialFormState);
      setSuccess('Service created successfully. It is now visible in your vendor catalog.');
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create service.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="vendor" />
      <DashboardHeader
        searchPlaceholder="Search your services..."
        onSearch={setSearchQuery}
        actionHref="/vendor/requests"
        actionLabel="View Requests"
      />

      <main className="pt-16 md:ml-60 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#0a4a37]">Vendor portal</p>
              <h1 className="mt-1 text-3xl font-bold text-[#062E22]">Manage your services and incoming business.</h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
                This dashboard is now wired to the approved vendor backend. Publish services here, monitor recent request activity, and move into contracts once an organizer accepts your deal.
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/vendor/requests" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                Open Requests
              </Link>
              <Link href="/vendor/contracts" className="rounded-xl bg-[#062E22] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0a4a37]">
                Open Contracts
              </Link>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              {success}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#062E22] border-t-transparent" />
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Business</p>
                  <p className="mt-2 text-xl font-bold text-[#062E22]">{summary?.business_name || 'Approved vendor'}</p>
                  <p className="mt-2 text-sm text-slate-500">{summary?.business_category || 'Service provider'}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Published services</p>
                  <p className="mt-2 text-3xl font-extrabold text-[#062E22]">{summary?.services_count ?? 0}</p>
                  <p className="mt-2 text-sm text-slate-500">Active catalog entries for organizers to request.</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Pending requests</p>
                  <p className="mt-2 text-3xl font-extrabold text-[#062E22]">{summary?.pending_requests_count ?? 0}</p>
                  <p className="mt-2 text-sm text-slate-500">New organizer requests waiting for your response.</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Active contracts</p>
                  <p className="mt-2 text-3xl font-extrabold text-[#062E22]">{summary?.active_contracts_count ?? 0}</p>
                  <p className="mt-2 text-sm text-slate-500">Contracts already signed by both parties.</p>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
                <div className="space-y-6">
                  <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-wide text-[#0a4a37]">Service catalog</p>
                        <h2 className="mt-1 text-2xl font-bold text-[#062E22]">Your published services</h2>
                      </div>
                      <span className="rounded-full bg-[#F5FBF8] px-3 py-1 text-xs font-semibold text-[#062E22]">
                        {filteredServices.length} item{filteredServices.length === 1 ? '' : 's'}
                      </span>
                    </div>

                    {filteredServices.length === 0 ? (
                      <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                        No services found yet. Use the form on the right to publish your first vendor offering.
                      </div>
                    ) : (
                      <div className="mt-5 grid gap-4">
                        {filteredServices.map((service) => (
                          <div key={service.id} className="rounded-2xl border border-slate-200 p-5">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-lg font-bold text-[#062E22]">{service.title}</h3>
                                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                                    {service.category}
                                  </span>
                                </div>
                                <p className="mt-3 text-sm leading-relaxed text-slate-500">{service.description}</p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                  {service.tags.map((tag) => (
                                    <span key={`${service.id}-${tag}`} className="rounded-full bg-[#F5FBF8] px-3 py-1 text-xs font-medium text-[#062E22]">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                                <p className="text-slate-400">Price range</p>
                                <p className="mt-1 font-semibold text-[#062E22]">
                                  {formatCurrency(service.price_min)} - {formatCurrency(service.price_max)}
                                </p>
                                <p className="mt-3 text-slate-400">Location</p>
                                <p className="mt-1 font-medium text-slate-700">{service.location || 'Addis Ababa'}</p>
                                <p className="mt-3 text-slate-400">Created</p>
                                <p className="mt-1 font-medium text-slate-700">{formatDate(service.created_at)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-wide text-[#0a4a37]">Recent requests</p>
                          <h3 className="mt-1 text-xl font-bold text-[#062E22]">Organizer activity</h3>
                        </div>
                        <Link href="/vendor/requests" className="text-sm font-semibold text-[#062E22] hover:underline">
                          View all
                        </Link>
                      </div>

                      <div className="mt-5 space-y-3">
                        {summary?.recent_requests?.length ? (
                          summary.recent_requests.map((request) => (
                            <Link key={request.id} href={`/vendor/requests/${request.id}`} className="block rounded-2xl border border-slate-200 p-4 transition hover:bg-slate-50">
                              <p className="font-semibold text-[#062E22]">{request.service_title || 'Service request'}</p>
                              <p className="mt-1 text-sm text-slate-500">{request.status || 'pending'} • {formatCurrency(request.proposed_amount)}</p>
                              <p className="mt-2 text-xs text-slate-400">{formatDate(request.created_at)}</p>
                            </Link>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                            No organizer requests have reached this portal yet.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-wide text-[#0a4a37]">Recent contracts</p>
                          <h3 className="mt-1 text-xl font-bold text-[#062E22]">Signature progress</h3>
                        </div>
                        <Link href="/vendor/contracts" className="text-sm font-semibold text-[#062E22] hover:underline">
                          View all
                        </Link>
                      </div>

                      <div className="mt-5 space-y-3">
                        {summary?.recent_contracts?.length ? (
                          summary.recent_contracts.map((contract) => (
                            <Link key={contract.id} href={`/vendor/contracts/${contract.id}`} className="block rounded-2xl border border-slate-200 p-4 transition hover:bg-slate-50">
                              <p className="font-semibold text-[#062E22]">{contract.title || 'Service contract'}</p>
                              <p className="mt-1 text-sm text-slate-500">{contract.status || 'draft'} • {formatCurrency(contract.amount)}</p>
                              <p className="mt-2 text-xs text-slate-400">{formatDate(contract.created_at)}</p>
                            </Link>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                            Contracts will appear here once an organizer converts an accepted request into an agreement.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#0a4a37]">Publish a service</p>
                  <h2 className="mt-1 text-2xl font-bold text-[#062E22]">Create a new vendor offering</h2>
                  <p className="mt-3 text-sm leading-relaxed text-slate-500">
                    Services you add here become the basis for organizer requests. Keep the scope and pricing clear so the request and contract flow stays easy to negotiate.
                  </p>

                  <form onSubmit={handleCreateService} className="mt-6 space-y-4">
                    <div>
                      <label htmlFor="title" className="mb-1 block text-sm font-medium text-slate-700">Service title</label>
                      <input
                        id="title"
                        required
                        value={form.title}
                        onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
                        placeholder="Venue Provider - Premium Hall Package"
                      />
                    </div>

                    <div>
                      <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                      <textarea
                        id="description"
                        required
                        rows={4}
                        value={form.description}
                        onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
                        placeholder="Describe the service scope, delivery style, capacity, and what the organizer receives."
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="category" className="mb-1 block text-sm font-medium text-slate-700">Category</label>
                        <select
                          id="category"
                          value={form.category}
                          onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
                        >
                          {CATEGORY_OPTIONS.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="location" className="mb-1 block text-sm font-medium text-slate-700">Service location</label>
                        <input
                          id="location"
                          required
                          value={form.location}
                          onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
                          placeholder="Addis Ababa"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <label htmlFor="price_min" className="mb-1 block text-sm font-medium text-slate-700">Minimum price</label>
                        <input
                          id="price_min"
                          type="number"
                          required
                          min={0}
                          value={form.price_min}
                          onChange={(event) => setForm((current) => ({ ...current, price_min: event.target.value }))}
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
                        />
                      </div>
                      <div>
                        <label htmlFor="price_max" className="mb-1 block text-sm font-medium text-slate-700">Maximum price</label>
                        <input
                          id="price_max"
                          type="number"
                          required
                          min={0}
                          value={form.price_max}
                          onChange={(event) => setForm((current) => ({ ...current, price_max: event.target.value }))}
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
                        />
                      </div>
                      <div>
                        <label htmlFor="pricing_type" className="mb-1 block text-sm font-medium text-slate-700">Pricing type</label>
                        <select
                          id="pricing_type"
                          value={form.pricing_type}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              pricing_type: event.target.value as 'fixed' | 'negotiable',
                            }))
                          }
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
                        >
                          <option value="negotiable">Negotiable</option>
                          <option value="fixed">Fixed</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="tags" className="mb-1 block text-sm font-medium text-slate-700">Tags</label>
                      <input
                        id="tags"
                        value={form.tags}
                        onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
                        placeholder="premium, conference, indoor, large-capacity"
                      />
                    </div>

                    <div>
                      <label htmlFor="image_urls" className="mb-1 block text-sm font-medium text-slate-700">Image URLs</label>
                      <input
                        id="image_urls"
                        value={form.image_urls}
                        onChange={(event) => setForm((current) => ({ ...current, image_urls: event.target.value }))}
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
                        placeholder="https://example.com/photo-1.jpg, https://example.com/photo-2.jpg"
                      />
                    </div>

                    <div>
                      <label htmlFor="availability" className="mb-1 block text-sm font-medium text-slate-700">Availability notes or JSON</label>
                      <textarea
                        id="availability"
                        rows={4}
                        value={form.availability}
                        onChange={(event) => setForm((current) => ({ ...current, availability: event.target.value }))}
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
                        placeholder='{"days":["Mon","Tue"],"lead_time":"14 days"}'
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full rounded-xl bg-[#062E22] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0a4a37] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? 'Publishing service...' : 'Publish Service'}
                    </button>
                  </form>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
