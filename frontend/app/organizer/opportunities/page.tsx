'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Briefcase, Plus, Filter } from 'lucide-react';

import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import { OpportunityRecord, OpportunityStatus } from '@/app/types/opportunity';
import opportunitiesService from '@/app/services/opportunitiesService';
import Image from 'next/image';
const STATUS_LABELS: Record<OpportunityStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  closed: 'Closed',
  awarded: 'Awarded',
  contracted: 'Contracted',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

const STATUS_STYLES: Record<OpportunityStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  published: 'bg-green-100 text-green-700',
  closed: 'bg-orange-100 text-orange-700',
  awarded: 'bg-blue-100 text-blue-700',
  contracted: 'bg-purple-100 text-purple-700',
  cancelled: 'bg-red-100 text-red-700',
  expired: 'bg-gray-100 text-gray-500',
};

const SOURCE_MODE_LABELS: Record<string, string> = {
  open_bid: 'Open Bidding',
  invite_only: 'Direct Invite',
  hybrid: 'Hybrid',
};

const CATEGORY_OPTIONS = [
  'catering',
  'photography',
  'videography',
  'decoration',
  'logistics',
  'equipment',
  'security',
  'entertainment',
  'transportation',
  'venue',
  'other',
];

export default function OrganizerOpportunitiesPage() {
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OpportunityStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function fetchOpportunities() {
      try {
        setLoading(true);
        setError(null);
        const data = await opportunitiesService.listOpportunities();
        setOpportunities(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load opportunities');
      } finally {
        setLoading(false);
      }
    }
    fetchOpportunities();
  }, [refreshKey]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    opportunities.forEach((opp) => {
      if (opp.category) {
        counts[opp.category] = (counts[opp.category] || 0) + 1;
      }
    });
    return counts;
  }, [opportunities]);

  const statusCounts = useMemo(() => {
    return {
      all: opportunities.length,
      draft: opportunities.filter((o) => o.status === 'draft').length,
      published: opportunities.filter((o) => o.status === 'published').length,
      closed: opportunities.filter((o) => o.status === 'closed').length,
      awarded: opportunities.filter((o) => o.status === 'awarded' || o.status === 'contracted').length,
    };
  }, [opportunities]);

  const filteredOpportunities = opportunities.filter((opp) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      [opp.title, opp.description, opp.category]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    const matchesStatus =
      statusFilter === 'all' || opp.status === statusFilter;
    const matchesCategory =
      categoryFilter === 'all' || opp.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
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
        searchPlaceholder="Search opportunities..."
        onSearch={setSearchQuery}
        actionHref="/organizer/opportunities/create"
        actionLabel="Create Opportunity"
      />

      <main className="pt-16 md:ml-60 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header Section - No Card */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[#062E22]">Opportunities</h1>
              <p className="text-gray-500 mt-1">
                Create and manage vendor opportunities for your events
              </p>
            </div>
            <Link
              href="/organizer/opportunities/create"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#062E22] text-white rounded-lg font-semibold hover:bg-[#0a4a37] transition whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              New Opportunity
            </Link>
          </div>

          {/* Status Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            {(['all', 'draft', 'published', 'closed', 'awarded'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
                  statusFilter === status
                    ? 'bg-[#062E22] text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {status === 'all' ? 'All' : STATUS_LABELS[status]}
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                  statusFilter === status ? 'bg-white/20' : 'bg-slate-100'
                }`}>
                  {statusCounts[status]}
                </span>
              </button>
            ))}
          </div>

          {/* Category Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
                categoryFilter === 'all'
                  ? 'bg-[#062E22] text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              All Categories
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                categoryFilter === 'all' ? 'bg-white/20' : 'bg-slate-100'
              }`}>
                {opportunities.length}
              </span>
            </button>
            {CATEGORY_OPTIONS.map((cat) => {
              const count = categoryCounts[cat] || 0;
              if (count === 0) return null;
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
                    categoryFilter === cat
                      ? 'bg-[#062E22] text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                    categoryFilter === cat ? 'bg-white/20' : 'bg-slate-100'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          ) : loading ? (
            <div className="flex justify-center py-20">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#062E22] border-t-transparent" />
            </div>
          ) : filteredOpportunities.length === 0 ? (
            <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
              <Briefcase className="mx-auto h-12 w-12 text-slate-300" />
              <h2 className="mt-4 text-2xl font-bold text-[#062E22]">No opportunities found</h2>
              <p className="mt-2 text-sm text-slate-500">
                {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                  ? 'Try adjusting your filters.'
                  : 'Create your first opportunity to start receiving vendor proposals.'}
              </p>
              <Link
                href="/organizer/opportunities/create"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#062E22] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0a4a37]"
              >
                <Plus className="h-4 w-4" />
                Create Opportunity
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOpportunities.map((opp) => (
                <Link
                  key={opp.id}
                  href={`/organizer/opportunities/${opp.id}`}
                  className="block rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-[#062E22] hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-[#062E22]">{opp.title}</h3>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            STATUS_STYLES[opp.status] || 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {STATUS_LABELS[opp.status]}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          {SOURCE_MODE_LABELS[opp.sourcing_mode] || opp.sourcing_mode}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-500 line-clamp-2">{opp.description}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                        <span className="rounded-full bg-slate-100 px-2 py-1">
                          {opp.category || 'General'}
                        </span>
                        {opp.budget_min || opp.budget_max ? (
                          <span>
                            Budget:{' '}
                            {opp.budget_min
                              ? `ETB ${opp.budget_min.toLocaleString()}`
                              : ''}
                            {opp.budget_min && opp.budget_max ? ' - ' : ''}
                            {opp.budget_max
                              ? `ETB ${opp.budget_max.toLocaleString()}`
                              : ''}
                          </span>
                        ) : null}
                        <span>{opp.proposal_count} proposal{opp.proposal_count !== 1 ? 's' : ''}</span>
                        <span>
                          Created {new Date(opp.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      {opp.proposal_count > 0 && (
                        <div className="rounded-full bg-[#062E22] px-3 py-1 text-sm font-bold text-white">
                          {opp.proposal_count}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
