'use client';

import { useState, useRef, useEffect } from 'react';
import { Filter, MapPin, DollarSign } from 'lucide-react';

import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import VendorCard from '@/components/marketplace/VendorCard';
import LoadingSpinner from '@/components/LoadingSpinner';
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
  'Venue',
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
  const [aiQuery, setAiQuery] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

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

  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading || filteredVendors.length === 0) return;
    const el = gridRef.current;
    if (!el) return;

    el.classList.remove('cards-visible');
    void el.offsetWidth;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('cards-visible');
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);

    return () => observer.disconnect();
  }, [loading, filteredVendors]);
  const handleAiRecommend = () => {
    if (!aiQuery.trim()) return;
    setIsAiLoading(true);
    
    // Simulate AI processing time
    setTimeout(() => {
      const queryLower = aiQuery.toLowerCase();
      
      // Basic NLP matching
      let foundCategory = 'all';
      if (queryLower.includes('cater') || queryLower.includes('food')) foundCategory = 'catering';
      else if (queryLower.includes('venue') || queryLower.includes('hall')) foundCategory = 'venue';
      else if (queryLower.includes('av') || queryLower.includes('sound') || queryLower.includes('light')) foundCategory = 'av';
      else if (queryLower.includes('photo') || queryLower.includes('video')) foundCategory = 'photography';
      
      const matchingCategory = categories.find(c => c.toLowerCase() === foundCategory);
      
      if (matchingCategory) {
        setActiveCategory(matchingCategory);
        setSearchQuery('');
      } else {
        setActiveCategory('all');
        // If category not found as a direct tag, just use it as search query
        const keywords = aiQuery.replace(/(for|with|in|and|the|a|an|attendees|people)\b/gi, '').trim().split(/\s+/);
        if (keywords.length > 0) {
          setSearchQuery(keywords[0]);
        }
      }
      
      setIsAiLoading(false);
    }, 800);
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
        searchPlaceholder="Search vendors..."
        onSearch={setSearchQuery}
        actionHref="/organizer/requests"
        actionLabel="Open Requests"
      />

      <main className="md:ml-60 md:pt-6">
        <div className="space-y-6 pt-16 px-4 md:px-6 max-w-7xl">
          {/* Header Section */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-3xl font-bold text-[#062E22]">Vendors</h1>
              <p className="text-gray-500">Browse and manage verified vendors for your events</p>
            </div>
          </div>

          {/* AI Vendor Recommendation */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h2 className="text-lg font-bold text-emerald-900">AI Vendor Recommendation</h2>
            </div>
            <p className="text-sm text-emerald-700 mb-4">
              Describe your needs and our AI will recommend the best matched vendors.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input 
                type="text" 
                placeholder="e.g., Catering for 5,000 attendees..." 
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAiRecommend()}
                className="flex-1 px-4 py-2 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <button 
                onClick={handleAiRecommend}
                disabled={isAiLoading || !aiQuery.trim()}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isAiLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                )}
                Find Matches
              </button>
            </div>
          </div>

          {/* Filter Buttons - Service Categories */}
          <div className="space-y-3">
            {/* Filter dropdown */}
            <div className="relative w-fit" ref={filterRef}>
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
                {(filterLocation || filterPriceMin || filterPriceMax) && (
                  <span className="ml-1 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-white/60" />
                    <span className="text-[10px] font-normal opacity-80">
                      {[filterLocation, filterPriceMin || filterPriceMax ? `${filterPriceMin || '0'}–${filterPriceMax || '∞'}` : ''].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                )}
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

            <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setActiveCategory('all')}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition ${
                    activeCategory === 'all'
                      ? 'border border-[#062E22] text-[#062E22] bg-transparent'
                      : 'bg-[#062E22]/10 text-[#062E22] hover:bg-[#062E22]/20'
                  }`}
                >
                  All
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                    activeCategory === 'all' ? 'border border-[#062E22] text-[#062E22]' : 'bg-[#062E22]/20'
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
                      className={`flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition ${
                        activeCategory === category
                          ? 'border border-[#062E22] text-[#062E22] bg-transparent'
                          : 'bg-[#062E22]/10 text-[#062E22] hover:bg-[#062E22]/20'
                      }`}
                    >
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                      <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                        activeCategory === category ? 'border border-[#062E22] text-[#062E22]' : 'bg-[#062E22]/20'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}

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
                      className={`flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition ${
                        activeCategory === category
                          ? 'border border-[#062E22] text-[#062E22] bg-transparent'
                          : 'bg-[#062E22]/10 text-[#062E22] hover:bg-[#062E22]/20'
                      }`}
                    >
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                      <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                        activeCategory === category ? 'border border-[#062E22] text-[#062E22]' : 'bg-[#062E22]/20'
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
            <LoadingSpinner />
          ) : filteredVendors.length === 0 ? (
            <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
              <h2 className="text-2xl font-bold text-[#062E22]">No vendors found</h2>
              <p className="mt-2 text-sm text-slate-500">Try adjusting your filters or search term.</p>
            </div>
          ) : (
            <>
              <div ref={gridRef} className="grid gap-5 lg:grid-cols-3">
                {filteredVendors.map((vendor, index) => (
                  <div
                    key={vendor.id}
                    className="vendor-card-wrapper"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <VendorCard vendor={vendor} href={`/organizer/vendors/${vendor.id}`} />
                  </div>
                ))}
              </div>

              <style>{`
                .vendor-card-wrapper {
                  opacity: 0;
                  transform: translateY(24px);
                  will-change: transform, opacity;
                }
                .cards-visible .vendor-card-wrapper {
                  animation: cardFadeIn 0.6s ease-out forwards;
                }
                @keyframes cardFadeIn {
                  from { opacity: 0; transform: translateY(24px); }
                  to { opacity: 1; transform: translateY(0); }
                }
              `}</style>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
