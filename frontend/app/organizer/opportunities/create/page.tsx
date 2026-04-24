'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Clock,
  Search,
  X,
  Briefcase,
} from 'lucide-react';

import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import {
  CreateOpportunityPayload,
  OpportunitySourcingMode,
} from '@/app/types/opportunity';
import { EventListItem } from '@/app/types/event';
import { MarketplaceVendorRecord as VendorRecord } from '@/app/types/marketplace';
import opportunitiesService from '@/app/services/opportunitiesService';
import eventsService from '@/app/services/eventsService';
import marketplaceService from '@/app/services/marketplaceService';
import Image from 'next/image';
const CATEGORY_OPTIONS = [
  { value: 'catering', label: 'Catering' },
  { value: 'photography', label: 'Photography' },
  { value: 'videography', label: 'Videography' },
  { value: 'decoration', label: 'Decoration' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'equipment', label: 'Equipment Rental' },
  { value: 'security', label: 'Security' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'venue', label: 'Venue' },
  { value: 'other', label: 'Other' },
];

export default function CreateOpportunityPage() {
  const router = useRouter();

  const [events, setEvents] = useState<EventListItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [vendors, setVendors] = useState<VendorRecord[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [vendorSearch, setVendorSearch] = useState('');
  const [filteredVendors, setFilteredVendors] = useState<VendorRecord[]>([]);

  const [formData, setFormData] = useState<CreateOpportunityPayload>({
    title: '',
    description: '',
    category: 'catering',
    requirements: '',
    budget_min: undefined,
    budget_max: undefined,
    submission_deadline: '',
    event_date: '',
    sourcing_mode: 'open_bid',
    invited_vendor_ids: [],
    invited_vendor_user_ids: [],
  });

  const [sourcingMode, setSourcingMode] = useState<OpportunitySourcingMode>('open_bid');
  const [selectedVendors, setSelectedVendors] = useState<VendorRecord[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const data = await eventsService.getEvents();
        setEvents(data);
      } catch (err) {
        console.error('Failed to load events:', err);
      } finally {
        setEventsLoading(false);
      }
    }
    fetchEvents();
  }, []);

  useEffect(() => {
    async function fetchVendors() {
      try {
        const data = await marketplaceService.listVendors();
        setVendors(data);
        setFilteredVendors(data);
      } catch (err) {
        console.error('Failed to load vendors:', err);
      } finally {
        setVendorsLoading(false);
      }
    }
    fetchVendors();
  }, []);

  useEffect(() => {
    if (!vendorSearch.trim()) {
      setFilteredVendors(vendors);
    } else {
      const query = vendorSearch.toLowerCase();
      setFilteredVendors(
        vendors.filter(
          (v) =>
            v.business_name.toLowerCase().includes(query) ||
            v.services.some((s: string) => s.toLowerCase().includes(query))
        )
      );
    }
  }, [vendorSearch, vendors]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    const parsedValue =
      type === 'number' || name === 'budget_min' || name === 'budget_max'
        ? value === ''
          ? undefined
          : parseFloat(value)
        : value;
    setFormData((prev) => ({ ...prev, [name]: parsedValue }));
  };

  const handleSourcingModeChange = (mode: OpportunitySourcingMode) => {
    setSourcingMode(mode);
    setFormData((prev) => ({ ...prev, sourcing_mode: mode }));
  };

const toggleVendorSelection = (vendor: VendorRecord) => {
    setSelectedVendors((prev) => {
      const exists = prev.find((v) => v.id === vendor.id);
      if (exists) {
        return prev.filter((v) => v.id !== vendor.id);
      }
      return [...prev, vendor];
    });
    setFormData((prev) => {
      const vendorIds = prev.invited_vendor_ids || [];
      const userIds = prev.invited_vendor_user_ids || [];
      if (vendorIds.includes(vendor.id)) {
        return {
          ...prev,
          invited_vendor_ids: vendorIds.filter((id) => id !== vendor.id),
          invited_vendor_user_ids: userIds.filter((id) => id !== vendor.user_id),
        };
      }
      return {
        ...prev,
        invited_vendor_ids: [...vendorIds, vendor.id],
        invited_vendor_user_ids: [...userIds, vendor.user_id],
      };
    });
  };

  const removeSelectedVendor = (vendorId: string) => {
    const vendor = selectedVendors.find((v) => v.id === vendorId);
    if (vendor) {
      toggleVendorSelection(vendor);
    }
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];
    if (!formData.title.trim()) errors.push('Title is required');
    if (!formData.description.trim()) errors.push('Description is required');
    if (formData.budget_min && formData.budget_max && formData.budget_min > formData.budget_max) {
      errors.push('Minimum budget cannot exceed maximum budget');
    }
    if (sourcingMode === 'invite_only' && selectedVendors.length === 0) {
      errors.push('Please select at least one vendor to invite');
    }
    if (errors.length > 0) {
      setError(errors.join('. '));
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const payload: CreateOpportunityPayload = {
        ...formData,
        invited_vendor_ids:
          sourcingMode === 'invite_only' ? formData.invited_vendor_ids : [],
        invited_vendor_user_ids:
          sourcingMode === 'invite_only' ? formData.invited_vendor_user_ids : [],
      };

      const result = await opportunitiesService.createOpportunity(payload);
      router.push(`/organizer/opportunities/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create opportunity');
    } finally {
      setLoading(false);
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
        searchPlaceholder="Create opportunity"
        actionHref="/organizer/opportunities"
        actionLabel="Back to Opportunities"
      />

      <main className="pt-16 md:ml-60 p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <Link
            href="/organizer/opportunities"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#062E22] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Opportunities
          </Link>

          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Briefcase className="h-8 w-8 text-[#062E22]" />
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0a4a37]">
                  Create Opportunity
                </p>
                <h1 className="text-2xl font-bold text-[#062E22]">
                  Define your event needs and invite vendors
                </h1>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-500">
              Create a vendor opportunity for your event. Choose between open bidding (any vendor can
              apply) or direct invite (specific vendors receive an invitation).
            </p>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#062E22]">Basic Information</h2>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Event (optional)
                  </label>
                  <select
                    name="event_id"
                    value={formData.event_id || ''}
                    onChange={handleChange}
                    disabled={eventsLoading}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22]"
                  >
                    <option value="">Select an event...</option>
                    {events.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.title} ({event.date})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    placeholder="e.g., Wedding Catering Services"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    required
                    rows={5}
                    placeholder="Describe your requirements, expectations, and any specific needs for this opportunity."
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Category
                  </label>
                  <select
                    name="category"
                    value={formData.category || 'other'}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22]"
                  >
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Requirements (optional)
                  </label>
                  <textarea
                    name="requirements"
                    value={formData.requirements || ''}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Specific requirements, qualifications, or conditions for vendors."
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22]"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#062E22]">Sourcing Mode</h2>
              <p className="mt-1 text-sm text-slate-500">
                Choose how vendors will be selected for this opportunity.
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => handleSourcingModeChange('open_bid')}
                  className={`rounded-[24px] border-2 p-5 text-left transition ${
                    sourcingMode === 'open_bid'
                      ? 'border-[#062E22] bg-[#F5FBF8]'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-5 w-5 rounded-full border-2 ${
                        sourcingMode === 'open_bid'
                          ? 'border-[#062E22] bg-[#062E22]'
                          : 'border-slate-300'
                      }`}
                    >
                      {sourcingMode === 'open_bid' && (
                        <div className="h-full w-full rounded-full bg-white" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-[#062E22]">Open Bidding</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Any verified vendor can submit a proposal
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSourcingModeChange('invite_only')}
                  className={`rounded-[24px] border-2 p-5 text-left transition ${
                    sourcingMode === 'invite_only'
                      ? 'border-[#062E22] bg-[#F5FBF8]'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-5 w-5 rounded-full border-2 ${
                        sourcingMode === 'invite_only'
                          ? 'border-[#062E22] bg-[#062E22]'
                          : 'border-slate-300'
                      }`}
                    >
                      {sourcingMode === 'invite_only' && (
                        <div className="h-full w-full rounded-full bg-white" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-[#062E22]">Direct Invite</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Invite specific vendors directly
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              {sourcingMode === 'invite_only' && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">
                      Select Vendors to Invite
                    </label>
                    <span className="text-sm text-slate-500">
                      {selectedVendors.length} selected
                    </span>
                  </div>

                  {selectedVendors.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedVendors.map((vendor) => (
                        <div
                          key={vendor.id}
                          className="flex items-center gap-2 rounded-full bg-[#062E22] px-3 py-1 text-sm text-white"
                        >
                          {vendor.business_name}
                          <button
                            type="button"
                            onClick={() => removeSelectedVendor(vendor.id)}
                            className="ml-1 rounded-full p-0.5 hover:bg-white/20"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={vendorSearch}
                      onChange={(e) => setVendorSearch(e.target.value)}
                      placeholder="Search vendors by name or service..."
                      className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[#062E22]"
                    />
                  </div>

                  <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-3">
                    {vendorsLoading ? (
                      <div className="flex justify-center py-4">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#062E22] border-t-transparent" />
                      </div>
                    ) : filteredVendors.length === 0 ? (
                      <p className="py-4 text-center text-sm text-slate-500">
                        No vendors found
                      </p>
                    ) : (
                      filteredVendors.map((vendor) => (
                        <div
                          key={vendor.id}
                          className={`flex cursor-pointer items-center justify-between rounded-lg p-3 transition ${
                            selectedVendors.some((v) => v.id === vendor.id)
                              ? 'bg-[#F5FBF8]'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <h4 className="font-medium text-[#062E22]">
                              {vendor.business_name}
                            </h4>
                            <p className="text-xs text-slate-500">
                              {vendor.services?.join(', ') || 'No services'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleVendorSelection(vendor)}
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                              selectedVendors.some((v) => v.id === vendor.id)
                                ? 'bg-[#062E22] text-white'
                                : 'border border-slate-300 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {selectedVendors.some((v) => v.id === vendor.id)
                              ? 'Selected'
                              : 'Select'}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#062E22]">Budget & Timeline</h2>

              <div className="mt-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Minimum Budget (ETB)
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="number"
                        name="budget_min"
                        value={formData.budget_min || ''}
                        onChange={handleChange}
                        min={0}
                        placeholder="Min"
                        className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[#062E22]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Maximum Budget (ETB)
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="number"
                        name="budget_max"
                        value={formData.budget_max || ''}
                        onChange={handleChange}
                        min={0}
                        placeholder="Max"
                        className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[#062E22]"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Submission Deadline (optional)
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="datetime-local"
                      name="submission_deadline"
                      value={formData.submission_deadline || ''}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[#062E22]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Event Date (optional)
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="datetime-local"
                      name="event_date"
                      value={formData.event_date || ''}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[#062E22]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm text-slate-500">
                Your opportunity will be saved as a draft. You can publish it after review.
              </div>
              <div className="flex gap-3">
                <Link
                  href="/organizer/opportunities"
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-[#062E22] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0a4a37] disabled:opacity-60"
                >
                  {loading ? 'Creating...' : 'Create Opportunity'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}