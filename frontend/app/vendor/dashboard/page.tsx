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
  'Hotel', 'Catering', 'Decoring', 'Security', 'Audio Visual',
  'Modeling and Hosts', 'Volunteer facilitator', 'Graphics Design'
];

type FieldDef = {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox';
  options?: string[];
  isCore?: boolean;
};

const CATEGORY_SCHEMAS: Record<string, FieldDef[]> = {
  'Hotel': [
    { name: 'room_type', label: 'Primary Room Type', type: 'select', options: ['Single', 'Double', 'Suite', 'Family'], isCore: true },
    { name: 'star_rating', label: 'Star Rating', type: 'select', options: ['1 Star', '2 Stars', '3 Stars', '4 Stars', '5 Stars'], isCore: true },
    { name: 'capacity', label: 'Max Guests / Capacity', type: 'number', isCore: true },
    { name: 'location_type', label: 'Location Setting', type: 'select', options: ['City Center', 'Resort', 'Airport', 'Suburban'], isCore: true },
    { name: 'meals_included', label: 'Meals Included', type: 'select', options: ['None', 'Breakfast', 'Half-Board', 'Full-Board'], isCore: false },
    { name: 'pool_access', label: 'Swimming Pool', type: 'checkbox', isCore: false },
    { name: 'gym_access', label: 'Fitness Center', type: 'checkbox', isCore: false },
    { name: 'wifi', label: 'Free High-Speed WiFi', type: 'checkbox', isCore: false },
    { name: 'parking', label: 'Free Parking', type: 'checkbox', isCore: false },
    { name: 'check_in_time', label: 'Check-In Time', type: 'text', isCore: false },
  ],
  'Catering': [
    { name: 'cuisine_style', label: 'Cuisine Style', type: 'select', options: ['Ethiopian', 'Italian', 'Continental', 'Asian', 'Mixed'], isCore: true },
    { name: 'service_style', label: 'Service Style', type: 'select', options: ['Buffet', 'Plated', 'Family Style', 'Food Stations'], isCore: true },
    { name: 'min_guests', label: 'Minimum Guests', type: 'number', isCore: true },
    { name: 'max_guests', label: 'Maximum Guests', type: 'number', isCore: true },
    { name: 'dietary_vegan', label: 'Vegan Options', type: 'checkbox', isCore: false },
    { name: 'dietary_halal', label: 'Halal Options', type: 'checkbox', isCore: false },
    { name: 'dietary_gluten', label: 'Gluten-Free', type: 'checkbox', isCore: false },
    { name: 'staff_included', label: 'Staff Provided', type: 'select', options: ['Food Drop-off Only', 'Servers Included', 'Chefs & Servers Included'], isCore: false },
    { name: 'tasting', label: 'Tasting Session Available', type: 'checkbox', isCore: false },
    { name: 'cutlery', label: 'Cutlery/Plates Included', type: 'checkbox', isCore: false },
  ],
  'Decoring': [
    { name: 'decor_style', label: 'Primary Style', type: 'select', options: ['Traditional', 'Modern', 'Corporate', 'Rustic', 'Luxury'], isCore: true },
    { name: 'event_focus', label: 'Primary Event Focus', type: 'select', options: ['Weddings', 'Conferences', 'Birthdays', 'Exhibitions'], isCore: true },
    { name: 'setup_time', label: 'Typical Setup Time (Hours)', type: 'number', isCore: true },
    { name: 'color_customization', label: 'Full Color Customization', type: 'checkbox', isCore: true },
    { name: 'floral', label: 'Fresh Flowers Included', type: 'checkbox', isCore: false },
    { name: 'lighting', label: 'Ambient Lighting Included', type: 'checkbox', isCore: false },
    { name: 'furniture', label: 'Furniture Rental Included', type: 'checkbox', isCore: false },
    { name: 'teardown', label: 'Teardown/Cleanup Included', type: 'checkbox', isCore: false },
    { name: 'consultation', label: 'Free Design Consultation', type: 'checkbox', isCore: false },
  ],
  'Security': [
    { name: 'personnel_type', label: 'Personnel Type', type: 'select', options: ['Bouncers', 'VIP Escorts', 'Uniformed Guards', 'Crowd Control'], isCore: true },
    { name: 'armed', label: 'Armed Security Available', type: 'checkbox', isCore: true },
    { name: 'min_guards', label: 'Minimum Guards', type: 'number', isCore: true },
    { name: 'max_guards', label: 'Maximum Guards', type: 'number', isCore: true },
    { name: 'shift_length', label: 'Standard Shift (Hours)', type: 'number', isCore: false },
    { name: 'comms_gear', label: 'Radios/Earpieces Included', type: 'checkbox', isCore: false },
    { name: 'metal_detectors', label: 'Metal Detectors Provided', type: 'checkbox', isCore: false },
    { name: 'female_guards', label: 'Female Guards Available', type: 'checkbox', isCore: false },
    { name: 'cctv_monitoring', label: 'CCTV Monitoring Service', type: 'checkbox', isCore: false },
  ],
  'Audio Visual': [
    { name: 'primary_service', label: 'Primary Service', type: 'select', options: ['Sound System', 'Lighting', 'LED Screens', 'Full Production'], isCore: true },
    { name: 'audience_size', label: 'Max Audience Coverage', type: 'select', options: ['Up to 100', '100-500', '500-2000', '2000+'], isCore: true },
    { name: 'technicians', label: 'Technicians Included', type: 'number', isCore: true },
    { name: 'backup_power', label: 'Backup Generators Included', type: 'checkbox', isCore: true },
    { name: 'microphones', label: 'Wireless Mics Included', type: 'number', isCore: false },
    { name: 'dj_gear', label: 'DJ Equipment Provided', type: 'checkbox', isCore: false },
    { name: 'livestream', label: 'Livestreaming Capabilities', type: 'checkbox', isCore: false },
    { name: 'recording', label: 'Audio/Video Recording', type: 'checkbox', isCore: false },
    { name: 'drone', label: 'Drone Coverage', type: 'checkbox', isCore: false },
  ],
  'Social Media Promoting': [
    { name: 'primary_platform', label: 'Primary Platform', type: 'select', options: ['TikTok', 'Instagram', 'Telegram', 'Facebook', 'LinkedIn'], isCore: true },
    { name: 'reach', label: 'Total Follower Reach', type: 'select', options: ['< 50k', '50k - 200k', '200k - 1M', '1M+'], isCore: true },
    { name: 'engagement_rate', label: 'Avg Engagement Rate', type: 'text', isCore: true },
    { name: 'content_type', label: 'Content Style', type: 'select', options: ['Video Reels', 'Static Posts', 'Stories', 'Giveaways'], isCore: true },
    { name: 'post_count', label: 'Number of Posts', type: 'number', isCore: false },
    { name: 'video_production', label: 'Video Production Included', type: 'checkbox', isCore: false },
    { name: 'analytics', label: 'Post-Campaign Analytics', type: 'checkbox', isCore: false },
    { name: 'duration', label: 'Campaign Duration (Days)', type: 'number', isCore: false },
    { name: 'boost_budget', label: 'Ad Boost Budget Included', type: 'checkbox', isCore: false },
  ],
  'Marketing and Advertisment': [
    { name: 'channel', label: 'Primary Channel', type: 'select', options: ['Billboards', 'Print Media', 'Radio', 'TV', 'Digital Ads'], isCore: true },
    { name: 'scale', label: 'Campaign Scale', type: 'select', options: ['Local City', 'Regional', 'National', 'International'], isCore: true },
    { name: 'target_audience', label: 'Target Demographic', type: 'text', isCore: true },
    { name: 'estimated_views', label: 'Estimated Views/Impressions', type: 'text', isCore: true },
    { name: 'design_included', label: 'Creative Design Included', type: 'checkbox', isCore: false },
    { name: 'printing_included', label: 'Printing Costs Included', type: 'checkbox', isCore: false },
    { name: 'campaign_length', label: 'Duration (Weeks)', type: 'number', isCore: false },
    { name: 'reporting', label: 'Performance Reporting', type: 'select', options: ['Weekly', 'End of Campaign', 'None'], isCore: false },
    { name: 'permit_handling', label: 'Gov Permit Handling', type: 'checkbox', isCore: false },
  ],
  'Modeling and Hosts': [
    { name: 'talent_type', label: 'Talent Role', type: 'select', options: ['Runway Models', 'Brand Ambassadors', 'Ushers', 'MCs / Hosts'], isCore: true },
    { name: 'headcount', label: 'Number of Talents', type: 'number', isCore: true },
    { name: 'gender', label: 'Gender Availability', type: 'select', options: ['All Female', 'All Male', 'Mixed'], isCore: true },
    { name: 'languages', label: 'Primary Languages', type: 'text', isCore: true },
    { name: 'wardrobe', label: 'Wardrobe Provided', type: 'checkbox', isCore: false },
    { name: 'makeup', label: 'Makeup/Styling Included', type: 'checkbox', isCore: false },
    { name: 'transport', label: 'Transport Handled by Agency', type: 'checkbox', isCore: false },
    { name: 'briefing', label: 'Pre-event Briefing Required', type: 'checkbox', isCore: false },
    { name: 'shift_hours', label: 'Max Shift Hours', type: 'number', isCore: false },
  ],
  'Volunteer facilitator': [
    { name: 'volunteer_count', label: 'Number of Volunteers', type: 'number', isCore: true },
    { name: 'role_type', label: 'Primary Role', type: 'select', options: ['Registration/Check-in', 'Crowd Control', 'Logistics/Setup', 'General Support'], isCore: true },
    { name: 'training_level', label: 'Training Provided', type: 'select', options: ['Basic Briefing', 'Specialized Training', 'Certified First Aid'], isCore: true },
    { name: 'age_group', label: 'Average Age Group', type: 'select', options: ['University Students', 'Young Professionals', 'Mixed'], isCore: true },
    { name: 'uniforms', label: 'T-Shirts/Uniforms Provided', type: 'checkbox', isCore: false },
    { name: 'meals_handled', label: 'Meals Handled by Agency', type: 'checkbox', isCore: false },
    { name: 'supervisors', label: 'Team Leads/Supervisors Included', type: 'checkbox', isCore: false },
    { name: 'transport_handled', label: 'Transport Handled by Agency', type: 'checkbox', isCore: false },
    { name: 'certificate', label: 'Provides Certificates', type: 'checkbox', isCore: false },
  ],
  'Graphics Design': [
    { name: 'design_type', label: 'Primary Design Output', type: 'select', options: ['Event Branding/Logo', 'Social Media Posters', 'Print Banners', 'Full Package'], isCore: true },
    { name: 'turnaround_time', label: 'Standard Turnaround (Days)', type: 'number', isCore: true },
    { name: 'revisions', label: 'Revisions Included', type: 'number', isCore: true },
    { name: 'source_files', label: 'Source Files Provided', type: 'checkbox', isCore: true },
    { name: 'software', label: 'Primary Software', type: 'text', isCore: false },
    { name: 'motion_graphics', label: 'Motion Graphics/Animation', type: 'checkbox', isCore: false },
    { name: 'print_ready', label: 'Print-Ready Formats', type: 'checkbox', isCore: false },
    { name: 'custom_illustrations', label: 'Custom Illustrations', type: 'checkbox', isCore: false },
    { name: 'branding_guidelines', label: 'Brand Guidelines Doc', type: 'checkbox', isCore: false },
  ]
};

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
  category: 'Hotel',
  price_min: '50000',
  price_max: '120000',
  pricing_type: 'negotiable' as 'fixed' | 'negotiable',
  location: 'Addis Ababa',
  tags: '',
  image_files: [] as File[],
  availability: '',
  service_details_obj: {} as Record<string, any>,
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
        category: summary?.business_category || 'Other',
        price_min: Number(form.price_min),
        price_max: Number(form.price_max),
        pricing_type: form.pricing_type,
        location: form.location.trim(),
        tags: form.tags
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        image_files: form.image_files,
        availability: form.availability.trim() || undefined,
        service_details: Object.keys(form.service_details_obj).length ? JSON.stringify(form.service_details_obj) : undefined,
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

                    <div className="grid gap-4 sm:grid-cols-1">
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
                      <label htmlFor="image_files" className="mb-1 block text-sm font-medium text-slate-700">Images</label>
                      <input
                        id="image_files"
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(event) => {
                          if (event.target.files) {
                            setForm((current) => ({ ...current, image_files: Array.from(event.target.files as FileList) }));
                          }
                        }}
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#062E22]/10 file:text-[#062E22] hover:file:bg-[#062E22]/20"
                      />
                    </div>

                    <div>
                      <label htmlFor="availability" className="mb-1 block text-sm font-medium text-slate-700">Availability notes or JSON</label>
                      <textarea
                        id="availability"
                        rows={2}
                        value={form.availability}
                        onChange={(event) => setForm((current) => ({ ...current, availability: event.target.value }))}
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
                        placeholder='{"days":["Mon","Tue"],"lead_time":"14 days"}'
                      />
                    </div>

                    <div className="border-t border-slate-100 pt-4">
                      <h3 className="font-semibold text-slate-800 mb-4">{summary?.business_category || 'Service'} Specific Details</h3>
                      {summary?.business_category && CATEGORY_SCHEMAS[summary.business_category] ? (
                        <div className="space-y-6">
                          <div>
                            <h4 className="text-sm font-semibold uppercase tracking-wide text-[#0a4a37] mb-3">Marketplace Display (Core)</h4>
                            <div className="grid gap-4 sm:grid-cols-2">
                              {CATEGORY_SCHEMAS[summary.business_category].filter(f => f.isCore).map(field => (
                                <div key={field.name}>
                                  <label className="mb-1 block text-sm font-medium text-slate-700">{field.label}</label>
                                  {field.type === 'select' ? (
                                    <select
                                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
                                      value={form.service_details_obj[field.name] || ''}
                                      onChange={(e) => setForm(curr => ({ ...curr, service_details_obj: { ...curr.service_details_obj, [field.name]: e.target.value } }))}
                                    >
                                      <option value="">Select...</option>
                                      {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                  ) : field.type === 'checkbox' ? (
                                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        className="w-4 h-4 accent-[#062E22]"
                                        checked={!!form.service_details_obj[field.name]}
                                        onChange={(e) => setForm(curr => ({ ...curr, service_details_obj: { ...curr.service_details_obj, [field.name]: e.target.checked } }))}
                                      />
                                      <span className="text-sm text-slate-700">Yes, included</span>
                                    </label>
                                  ) : (
                                    <input
                                      type={field.type}
                                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
                                      value={form.service_details_obj[field.name] || ''}
                                      onChange={(e) => setForm(curr => ({ ...curr, service_details_obj: { ...curr.service_details_obj, [field.name]: e.target.value } }))}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="pt-2">
                            <h4 className="text-sm font-semibold uppercase tracking-wide text-[#0a4a37] mb-3">Detailed View (Extras)</h4>
                            <div className="grid gap-4 sm:grid-cols-2">
                              {CATEGORY_SCHEMAS[summary.business_category].filter(f => !f.isCore).map(field => (
                                <div key={field.name}>
                                  <label className="mb-1 block text-sm font-medium text-slate-700">{field.label}</label>
                                  {field.type === 'select' ? (
                                    <select
                                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
                                      value={form.service_details_obj[field.name] || ''}
                                      onChange={(e) => setForm(curr => ({ ...curr, service_details_obj: { ...curr.service_details_obj, [field.name]: e.target.value } }))}
                                    >
                                      <option value="">Select...</option>
                                      {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                  ) : field.type === 'checkbox' ? (
                                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        className="w-4 h-4 accent-[#062E22]"
                                        checked={!!form.service_details_obj[field.name]}
                                        onChange={(e) => setForm(curr => ({ ...curr, service_details_obj: { ...curr.service_details_obj, [field.name]: e.target.checked } }))}
                                      />
                                      <span className="text-sm text-slate-700">Yes, included</span>
                                    </label>
                                  ) : (
                                    <input
                                      type={field.type}
                                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-[#062E22] focus:ring-2 focus:ring-[#062E22]/10"
                                      value={form.service_details_obj[field.name] || ''}
                                      onChange={(e) => setForm(curr => ({ ...curr, service_details_obj: { ...curr.service_details_obj, [field.name]: e.target.value } }))}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">No specific details configured for this category.</p>
                      )}
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
