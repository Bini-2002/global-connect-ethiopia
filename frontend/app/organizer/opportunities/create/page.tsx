'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Clock,
  Briefcase,
} from 'lucide-react';

import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import { CreateOpportunityPayload } from '@/app/types/opportunity';
import { EventListItem } from '@/app/types/event';
import opportunitiesService from '@/app/services/opportunitiesService';
import eventsService from '@/app/services/eventsService';
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

  const [formData, setFormData] = useState<CreateOpportunityPayload>({
    title: '',
    description: '',
    category: 'catering',
    requirements: '',
    expected_attendees: undefined,
    budget_min: undefined,
    budget_max: undefined,
    submission_deadline: '',
    event_date: '',
    sourcing_mode: 'open_bid',
    invited_vendor_ids: [],
    invited_vendor_user_ids: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const data = await eventsService.getEvents();
        setEvents(data);
      } catch (err) {
        console.error('Failed to load events via service, trying direct fallback:', err);
        try {
          const { api } = await import('@/app/lib/api');
          const rawEvents = await api.get<any[]>('/events/');
          setEvents(rawEvents.map(e => ({
            id: e.id,
            proposal_id: e.proposal_id || '',
            title: e.title,
            location: e.location || 'Location pending',
            date: e.start_date || 'Date pending',
            status: 'UPCOMING',
            backend_status: e.status,
          } as EventListItem)));
        } catch (fallbackErr) {
          console.error('Fallback failed:', fallbackErr);
        }
      } finally {
        setEventsLoading(false);
      }
    }
    fetchEvents();
  }, []);



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

  const validateForm = (): boolean => {
    const errors: string[] = [];
    if (!formData.title.trim()) errors.push('Title is required');
    if (!formData.description.trim()) errors.push('Description is required');
    if (formData.budget_min && formData.budget_max && formData.budget_min > formData.budget_max) {
      errors.push('Minimum budget cannot exceed maximum budget');
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
        event_id: formData.event_id || undefined,
        requirements: formData.requirements || undefined,
        submission_deadline: formData.submission_deadline ? new Date(formData.submission_deadline).toISOString() : undefined,
        event_date: formData.event_date ? new Date(formData.event_date).toISOString() : undefined,
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

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Expected Attendees (optional)
                  </label>
                  <input
                    type="number"
                    name="expected_attendees"
                    value={formData.expected_attendees || ''}
                    onChange={handleChange}
                    min={0}
                    placeholder="e.g., 500"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22]"
                  />
                </div>
              </div>
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

            <div className="flex items-center justify-between">
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