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
    { name: 'room_type', label: 'Primary Room Type', type: 'select', options: ['Single', 'Double', 'Suite', 'Family', 'Presidential', 'Mixed Allocation'], isCore: true },
    { name: 'star_rating', label: 'Star Rating', type: 'select', options: ['1 Star', '2 Stars', '3 Stars', '4 Stars', '5 Stars', 'Unrated Boutique'], isCore: true },
    { name: 'capacity', label: 'Total Room Capacity', type: 'number', isCore: true },
    { name: 'location_type', label: 'Location Setting', type: 'select', options: ['City Center', 'Resort', 'Airport', 'Suburban', 'Diplomatic Area'], isCore: true },
    { name: 'event_halls', label: 'Number of Event/Conference Halls', type: 'number', isCore: true },
    { name: 'max_hall_capacity', label: 'Max Capacity of Largest Hall', type: 'number', isCore: true },
    { name: 'meals_included', label: 'Standard Meal Plan', type: 'select', options: ['Room Only', 'Bed & Breakfast', 'Half-Board', 'Full-Board', 'All Inclusive'], isCore: false },
    { name: 'airport_shuttle', label: 'Airport Shuttle Service', type: 'checkbox', isCore: false },
    { name: 'vip_lounge', label: 'VIP/Executive Lounge Access', type: 'checkbox', isCore: false },
    { name: 'security_level', label: 'Security (e.g., CCTV, Guards)', type: 'select', options: ['Standard', 'High Security (Diplomat Ready)', '24/7 Armed Guards'], isCore: false },
    { name: 'pool_access', label: 'Swimming Pool', type: 'checkbox', isCore: false },
    { name: 'gym_access', label: 'Fitness Center', type: 'checkbox', isCore: false },
    { name: 'wifi', label: 'High-Speed Enterprise WiFi', type: 'checkbox', isCore: false },
    { name: 'parking', label: 'Secure Parking Capacity', type: 'number', isCore: false },
    { name: 'check_in_time', label: 'Standard Check-In Time', type: 'text', isCore: false },
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

      if (servicesResponse.length > 0) {
        const existing = servicesResponse[0];
        setForm({
          title: existing.title || '',
          description: existing.description || '',
          category: existing.category || summaryResponse.business_category || 'Hotel',
          price_min: existing.price_min?.toString() || '',
          price_max: existing.price_max?.toString() || '',
          pricing_type: existing.pricing_type as 'fixed' | 'negotiable',
          location: existing.location || '',
          tags: existing.tags?.join(', ') || '',
          image_files: [],
          availability: existing.availability ? JSON.stringify(existing.availability) : '',
          service_details_obj: existing.service_details || {},
        });
      }
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

  const handleSaveService = async (event: FormEvent<HTMLFormElement>) => {
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

      if (services.length > 0) {
        await vendorPortalService.updateService(services[0].id, payload);
        setSuccess('Service updated successfully.');
      } else {
        await vendorPortalService.createService(payload);
        setSuccess('Service created successfully. It is now visible in your vendor catalog.');
      }
      
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save service.');
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

      <main className="pt-20 md:ml-64 p-6 lg:p-10 relative">
        {/* Background ambient gradient */}
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-[#062E22]/5 to-transparent pointer-events-none -z-10" />

        <div className="mx-auto max-w-[1400px] space-y-8">
          {/* Header Section */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between bg-white p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-64 h-64 bg-[#062E22]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold tracking-wide uppercase mb-4">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Live Portal
              </div>
              <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Vendor Dashboard</h1>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-500 font-medium">
                Manage your service catalog, review incoming requests, and finalize contracts. Your central hub for growing your business on Global Connect.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 relative z-10">
              <Link href="/vendor/requests" className="group inline-flex items-center justify-center gap-2 rounded-xl bg-white border-2 border-slate-200 px-6 py-3 text-sm font-bold text-slate-700 transition-all hover:border-[#062E22] hover:text-[#062E22] hover:shadow-md">
                Open Requests
              </Link>
              <Link href="/vendor/contracts" className="group inline-flex items-center justify-center gap-2 rounded-xl bg-[#062E22] border-2 border-[#062E22] px-6 py-3 text-sm font-bold text-white transition-all hover:bg-[#0a4a37] hover:border-[#0a4a37] hover:shadow-lg hover:shadow-[#062E22]/20">
                Active Contracts
              </Link>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border-l-4 border-red-500 bg-red-50 p-5 shadow-sm flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="rounded-2xl border-l-4 border-green-500 bg-green-50 p-5 shadow-sm flex items-start gap-3">
              <svg className="w-5 h-5 text-green-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-sm font-medium text-green-800">{success}</p>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-[#062E22]" />
              <p className="text-sm font-medium text-slate-500">Loading your workspace...</p>
            </div>
          ) : (
            <>
              {/* Stat Cards */}
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { title: "Business Profile", value: summary?.business_name || 'Approved', sub: summary?.business_category || 'Service provider', icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
                  { title: "Published Services", value: summary?.services_count ?? 0, sub: "Active catalog entries", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
                  { title: "Pending Requests", value: summary?.pending_requests_count ?? 0, sub: "Awaiting your response", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" },
                  { title: "Active Contracts", value: summary?.active_contracts_count ?? 0, sub: "Signed & ongoing", icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" },
                ].map((stat, i) => (
                  <div key={i} className="group relative bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-[#062E22]/5 transition-all duration-300 overflow-hidden">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-br from-[#062E22]/5 to-transparent rounded-bl-full transition-transform group-hover:scale-110" />
                    <div className="relative z-10 flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{stat.title}</p>
                        <p className="mt-3 text-3xl font-black text-slate-900 tracking-tight">{stat.value}</p>
                        <p className="mt-2 text-sm font-medium text-slate-500">{stat.sub}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-2xl text-[#062E22] group-hover:bg-[#062E22] group-hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={stat.icon} /></svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-8 xl:grid-cols-[1.5fr_1fr]">
                {/* Left Column: Services & Activity */}
                <div className="space-y-8">
                  {/* Service Catalog */}
                  <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#062E22] to-[#125c44]" />
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Your Services</h2>
                        <p className="text-sm font-medium text-slate-500 mt-1">Manage what you offer to organizers</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-4 py-1.5 text-xs font-bold text-slate-600 tracking-wide">
                        {filteredServices.length} ACTIVE {filteredServices.length === 1 ? 'SERVICE' : 'SERVICES'}
                      </span>
                    </div>

                    {filteredServices.length === 0 ? (
                      <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
                        <div className="w-16 h-16 mx-auto bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                          <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        </div>
                        <h3 className="text-lg font-bold text-slate-700">No services yet</h3>
                        <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">Use the publishing panel to create your first vendor offering and start receiving requests.</p>
                      </div>
                    ) : (
                      <div className="grid gap-5">
                        {filteredServices.map((service) => (
                          <div key={service.id} className="group relative bg-white rounded-2xl border border-slate-200 p-6 transition-all hover:border-[#062E22]/30 hover:shadow-lg hover:shadow-[#062E22]/5">
                            <div className="flex flex-col xl:flex-row gap-6">
                              <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-3 mb-2">
                                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-[#062E22] transition-colors">{service.title}</h3>
                                  <span className="rounded-md bg-[#062E22]/5 border border-[#062E22]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-[#062E22]">
                                    {service.category}
                                  </span>
                                </div>
                                <p className="text-sm leading-relaxed text-slate-600 mb-4 line-clamp-2">{service.description}</p>
                                
                                {service.tags && service.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {service.tags.map((tag) => (
                                      <span key={`${service.id}-${tag}`} className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              
                              <div className="shrink-0 w-full xl:w-48 flex flex-col gap-3 justify-center border-t xl:border-t-0 xl:border-l border-slate-100 pt-4 xl:pt-0 xl:pl-6">
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Pricing Guide</p>
                                  <p className="text-sm font-black text-[#062E22]">
                                    {formatCurrency(service.price_min)}<br/>
                                    <span className="text-slate-400 text-xs font-semibold block mt-0.5">to {formatCurrency(service.price_max)}</span>
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Location</p>
                                  <p className="text-sm font-semibold text-slate-700">{service.location || 'Addis Ababa'}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent Activity Split */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Recent Requests */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-900 tracking-tight">Recent Requests</h3>
                        <Link href="/vendor/requests" className="text-sm font-bold text-[#062E22] hover:underline">View all</Link>
                      </div>

                      <div className="space-y-3">
                        {summary?.recent_requests?.length ? (
                          summary.recent_requests.map((request) => (
                            <Link key={request.id} href={`/vendor/requests/${request.id}`} className="group block rounded-2xl border border-slate-100 p-4 transition hover:bg-[#F5FBF8] hover:border-[#062E22]/20">
                              <div className="flex justify-between items-start mb-2">
                                <p className="font-bold text-slate-800 group-hover:text-[#062E22] transition-colors">{request.service_title || 'Service request'}</p>
                                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md ${
                                  request.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                                  request.status === 'accepted' ? 'bg-green-100 text-green-700' : 
                                  'bg-slate-100 text-slate-600'
                                }`}>
                                  {request.status || 'pending'}
                                </span>
                              </div>
                              <div className="flex justify-between items-end">
                                <p className="text-sm font-semibold text-slate-600">{formatCurrency(request.proposed_amount)}</p>
                                <p className="text-xs font-medium text-slate-400">{formatDate(request.created_at)}</p>
                              </div>
                            </Link>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center px-4">
                            <p className="text-sm font-medium text-slate-500">No organizer requests pending.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Recent Contracts */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-900 tracking-tight">Active Contracts</h3>
                        <Link href="/vendor/contracts" className="text-sm font-bold text-[#062E22] hover:underline">View all</Link>
                      </div>

                      <div className="space-y-3">
                        {summary?.recent_contracts?.length ? (
                          summary.recent_contracts.map((contract) => (
                            <Link key={contract.id} href={`/vendor/contracts/${contract.id}`} className="group block rounded-2xl border border-slate-100 p-4 transition hover:bg-[#F5FBF8] hover:border-[#062E22]/20">
                              <div className="flex justify-between items-start mb-2">
                                <p className="font-bold text-slate-800 group-hover:text-[#062E22] transition-colors">{contract.title || 'Service agreement'}</p>
                                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md ${
                                  contract.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 
                                  'bg-blue-100 text-blue-700'
                                }`}>
                                  {contract.status || 'draft'}
                                </span>
                              </div>
                              <div className="flex justify-between items-end">
                                <p className="text-sm font-semibold text-slate-600">{formatCurrency(contract.amount)}</p>
                                <p className="text-xs font-medium text-slate-400">{formatDate(contract.created_at)}</p>
                              </div>
                            </Link>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-8 text-center px-4">
                            <p className="text-sm font-medium text-slate-500">No active contracts yet.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>


                {/* Right Column: Publish Form */}
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm sticky top-24 h-fit">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-[#062E22]/5 rounded-lg text-[#062E22]">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#0a4a37]">
                      {services.length > 0 ? 'Update' : 'Publish'}
                    </p>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                    {services.length > 0 ? 'Update Offering' : 'Create Offering'}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    {services.length > 0 
                      ? 'Update your existing service package information to reflect your latest offerings.'
                      : 'Add a new service package to your catalog for organizers to request.'}
                  </p>

                  <form onSubmit={handleSaveService} className="mt-8 space-y-6">
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="title" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Service title</label>
                        <input
                          id="title"
                          required
                          value={form.title}
                          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-[#062E22] focus:bg-white focus:ring-4 focus:ring-[#062E22]/10 placeholder:text-slate-400"
                          placeholder="e.g. Premium Hall Package"
                        />
                      </div>

                      <div>
                        <label htmlFor="description" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Description</label>
                        <textarea
                          id="description"
                          required
                          rows={3}
                          value={form.description}
                          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-[#062E22] focus:bg-white focus:ring-4 focus:ring-[#062E22]/10 placeholder:text-slate-400 resize-none"
                          placeholder="Describe the service scope..."
                        />
                      </div>

                      <div>
                        <label htmlFor="location" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Service location</label>
                        <input
                          id="location"
                          required
                          value={form.location}
                          onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-[#062E22] focus:bg-white focus:ring-4 focus:ring-[#062E22]/10 placeholder:text-slate-400"
                          placeholder="Addis Ababa"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="price_min" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Min Price</label>
                          <input
                            id="price_min"
                            type="number"
                            required
                            min={0}
                            value={form.price_min}
                            onChange={(event) => setForm((current) => ({ ...current, price_min: event.target.value }))}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-[#062E22] focus:bg-white focus:ring-4 focus:ring-[#062E22]/10"
                          />
                        </div>
                        <div>
                          <label htmlFor="price_max" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Max Price</label>
                          <input
                            id="price_max"
                            type="number"
                            required
                            min={0}
                            value={form.price_max}
                            onChange={(event) => setForm((current) => ({ ...current, price_max: event.target.value }))}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-[#062E22] focus:bg-white focus:ring-4 focus:ring-[#062E22]/10"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="pricing_type" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Pricing type</label>
                        <select
                          id="pricing_type"
                          value={form.pricing_type}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              pricing_type: event.target.value as 'fixed' | 'negotiable',
                            }))
                          }
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-[#062E22] focus:bg-white focus:ring-4 focus:ring-[#062E22]/10 appearance-none"
                        >
                          <option value="negotiable">Negotiable</option>
                          <option value="fixed">Fixed</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="image_files" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Images</label>
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
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium outline-none transition focus:border-[#062E22] focus:bg-white focus:ring-4 focus:ring-[#062E22]/10 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-white file:text-[#062E22] file:shadow-sm hover:file:bg-slate-50"
                        />
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-6">
                      <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#062E22]" />
                        {summary?.business_category || 'Service'} Details
                      </h3>
                      {summary?.business_category && CATEGORY_SCHEMAS[summary.business_category] ? (
                        <div className="space-y-6">
                          <div>
                            <div className="grid gap-4">
                              {CATEGORY_SCHEMAS[summary.business_category].filter(f => f.isCore).map(field => (
                                <div key={field.name}>
                                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">{field.label}</label>
                                  {field.type === 'select' ? (
                                    <select
                                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-[#062E22] focus:bg-white focus:ring-4 focus:ring-[#062E22]/10"
                                      value={form.service_details_obj[field.name] || ''}
                                      onChange={(e) => setForm(curr => ({ ...curr, service_details_obj: { ...curr.service_details_obj, [field.name]: e.target.value } }))}
                                    >
                                      <option value="">Select...</option>
                                      {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                  ) : field.type === 'checkbox' ? (
                                    <label className="flex items-center gap-3 mt-2 cursor-pointer p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-[#062E22]/30 transition-all">
                                      <input
                                        type="checkbox"
                                        className="w-4 h-4 accent-[#062E22] rounded border-slate-300"
                                        checked={!!form.service_details_obj[field.name]}
                                        onChange={(e) => setForm(curr => ({ ...curr, service_details_obj: { ...curr.service_details_obj, [field.name]: e.target.checked } }))}
                                      />
                                      <span className="text-sm font-medium text-slate-700">Yes, included</span>
                                    </label>
                                  ) : (
                                    <input
                                      type={field.type}
                                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-[#062E22] focus:bg-white focus:ring-4 focus:ring-[#062E22]/10"
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
                        <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-xl text-center border border-dashed border-slate-200">No specific details configured.</p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full relative group overflow-hidden rounded-xl bg-[#062E22] px-5 py-4 text-sm font-bold text-white transition-all disabled:cursor-not-allowed disabled:opacity-60 shadow-lg shadow-[#062E22]/20 hover:shadow-xl hover:shadow-[#062E22]/30 hover:-translate-y-0.5"
                    >
                      <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                      {saving ? (services.length > 0 ? 'Updating...' : 'Publishing...') : (services.length > 0 ? 'Update Service' : 'Publish Service')}
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
