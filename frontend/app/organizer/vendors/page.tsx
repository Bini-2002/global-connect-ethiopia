'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import VendorCard from '@/components/marketplace/VendorCard';
import { useMarketplaceVendors } from '@/app/hooks/useMarketplace';
import Image from 'next/image';

export default function OrganizerVendorsPage() {
  const { data: vendors, error, loading } = useMarketplaceVendors();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [aiQuery, setAiQuery] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const categories = useMemo(() => {
    const allServices = vendors.flatMap((v) => v.services);
    const unique = Array.from(new Set(allServices)).sort();
    return unique;
  }, [vendors]);

  const filteredVendors = vendors.filter((vendor) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      [vendor.business_name, vendor.services.join(' ')]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
    const matchesCategory =
      activeCategory === 'all' || vendor.services.includes(activeCategory);
    return matchesSearch && matchesCategory;
  });

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
          <div className="flex flex-wrap gap-2">
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
            {categories.map((category) => {
              const count = vendors.filter((v) => v.services.includes(category)).length;
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
            <div className="grid gap-5 lg:grid-cols-2">
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
