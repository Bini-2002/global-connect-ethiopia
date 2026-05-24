'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Filter, MapPin, DollarSign } from 'lucide-react';

import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import VendorCard from '@/components/marketplace/VendorCard';
import { useMarketplaceVendors } from '@/app/hooks/useMarketplace';
import type { VendorServiceRecord } from '@/app/types/marketplace';
import Image from 'next/image';

function extractPriceRange(service?: VendorServiceRecord): { min?: number; max?: number } {
  const details = service?.service_details;
  if (!details || typeof details !== 'object') return {};
  const prices: number[] = [];
  for (const [key, value] of Object.entries(details)) {
    if (key.toLowerCase().includes('price') && typeof value === 'number') {
      prices.push(value);
    }
  }
  if (prices.length === 0) return {};
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

const VENDOR_CATEGORIES = [
  'Hotel',
  'Catering',
  'Decoring',
  'Security',
  'Audio Visual',
  'Social Media Promoting',
  'Marketing and Advertisment',
  'Modeling and Hosts',
  'Volunteer facilitator',
  'Graphics Design',
];

export default function OrganizerVendorsPage() {
  const { data: vendors, error, loading } = useMarketplaceVendors();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [filterLocation, setFilterLocation] = useState('');
  const [filterPriceMin, setFilterPriceMin] = useState('');
  const [filterPriceMax, setFilterPriceMax] = useState('');
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const uniqueLocations = [...new Set(
    vendors.map(v => v.service_records?.[0]?.location).filter((l): l is string => l != null)
  )];

  const filteredVendors = vendors.filter((vendor) => {
    const vendorCategory = vendor.business_category ?? vendor.service_records?.[0]?.category ?? null;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      [vendor.business_name, vendorCategory]
        .filter((v): v is string => v !== null && v !== undefined)
        .some((value) => value.toLowerCase().includes(query));
    const matchesCategory =
      activeCategory === 'all' || vendorCategory === activeCategory;
    const svc = vendor.service_records?.[0];
    const matchesLocation = !filterLocation || svc?.location === filterLocation;
    const range = extractPriceRange(svc);
    const matchesPriceMin = !filterPriceMin || (range.min != null && range.min >= Number(filterPriceMin));
    const matchesPriceMax = !filterPriceMax || (range.max != null && range.max <= Number(filterPriceMax));
    return matchesSearch && matchesCategory && matchesLocation && matchesPriceMin && matchesPriceMax;
  });

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
        searchPlaceholder="Search vendors..."
        onSearch={setSearchQuery}
        actionHref="/organizer/requests"
        actionLabel="Open Requests"
      />

      <main className="pt-16 md:ml-60 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header Section - No Card */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[#062E22]">Vendors</h1>
              <p className="text-gray-500 mt-1">
                Browse and manage verified vendors for your events
              </p>
            </div>
            <Link
              href="/organizer/opportunities"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#062E22] text-white rounded-lg font-semibold hover:bg-[#0a4a37] transition whitespace-nowrap"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              View Opportunities
            </Link>
          </div>

          {/* Filter Buttons - Service Categories */}
          <div className="space-y-3">
            {/* Filter dropdown */}
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setShowFilterDropdown(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition border ${
                  showFilterDropdown || filterLocation || filterPriceMin || filterPriceMax
                    ? 'bg-[#062E22] text-white border-[#062E22]'
                    : 'text-slate-600 border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                Filter
              </button>

              {showFilterDropdown && (
                <div className="absolute left-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-3 px-4 space-y-3">
                  {/* Location */}
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Location
                    </p>
                    <select
                      value={filterLocation}
                      onChange={e => { setFilterLocation(e.target.value); }}
                      className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#062E22]"
                    >
                      <option value="">All locations</option>
                      {uniqueLocations.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>

                  {/* Price range */}
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      Price Range (ETB)
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filterPriceMin}
                        onChange={e => setFilterPriceMin(e.target.value)}
                        className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#062E22] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-xs text-slate-400">—</span>
                      <input
                        type="number"
                        placeholder="Max"
                        value={filterPriceMax}
                        onChange={e => setFilterPriceMax(e.target.value)}
                        className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#062E22] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>

                  {/* Clear */}
                  {(filterLocation || filterPriceMin || filterPriceMax) && (
                    <button
                      onClick={() => { setFilterLocation(''); setFilterPriceMin(''); setFilterPriceMax(''); }}
                      className="w-full text-xs text-center text-red-500 font-medium py-1 hover:text-red-700 transition"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              <div className="flex flex-wrap gap-2 flex-1">
                <button
                  onClick={() => setActiveCategory('all')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
                    activeCategory === 'all'
                      ? 'bg-[#062E22] text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  All
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                    activeCategory === 'all' ? 'bg-white/20' : 'bg-slate-100'
                  }`}>
                    {vendors.length}
                  </span>
                </button>
                {VENDOR_CATEGORIES.slice(0, 5).map((category) => {
                  const count = vendors.filter((v) => {
                    const cat = v.business_category ?? v.service_records?.[0]?.category ?? null;
                    return cat === category;
                  }).length;
                  return (
                    <button
                      key={category}
                      onClick={() => setActiveCategory(category)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
                        activeCategory === category
                          ? 'bg-[#062E22] text-white'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                      <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                        activeCategory === category ? 'bg-white/20' : 'bg-slate-100'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {VENDOR_CATEGORIES.length > 5 && (
                <button
                  onClick={() => setShowAllCategories(v => !v)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold text-white bg-[#062E22]/40 backdrop-blur-md border border-white/20 shadow-sm hover:bg-[#062E22]/60 transition"
                >
                  {showAllCategories ? 'Less' : 'More'}
                  <svg className={`w-3.5 h-3.5 transition ${showAllCategories ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
            </div>
            {showAllCategories && (
              <div className="flex flex-wrap gap-2">
                {VENDOR_CATEGORIES.slice(5).map((category) => {
                  const count = vendors.filter((v) => {
                    const cat = v.business_category ?? v.service_records?.[0]?.category ?? null;
                    return cat === category;
                  }).length;
                  return (
                    <button
                      key={category}
                      onClick={() => setActiveCategory(category)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
                        activeCategory === category
                          ? 'bg-[#062E22] text-white'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                      <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                        activeCategory === category ? 'bg-white/20' : 'bg-slate-100'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          ) : null}

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#062E22] border-t-transparent" />
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
              <h2 className="text-2xl font-bold text-[#062E22]">No vendors found</h2>
              <p className="mt-2 text-sm text-slate-500">Try adjusting your filters or search term.</p>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-3">
              {filteredVendors.map((vendor) => (
                <VendorCard key={vendor.id} vendor={vendor} href={`/organizer/vendors/${vendor.id}`} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
