'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { api } from '@/app/lib/api';
import { getRole, getToken } from '@/app/lib/auth';

interface OrganizerApp {
  id: string;
  user_id: string;
  profile_type?: string;
  full_name?: string;
  organization_name?: string;
  status: string;
  ocr_score?: number;
  created_at: string;
  updated_at: string;
}

interface OrganizerPendingResponse {
  count: number;
  items: OrganizerApp[];
}

export default function AdminOrganizersPage() {
  const router = useRouter();
  const [apps, setApps] = useState<OrganizerApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const token = getToken();
    const role = getRole();

    if (!token || (role !== 'admin' && role !== 'super_admin')) {
      setLoading(false);
      router.replace('/login');
      return;
    }

    api.get<OrganizerPendingResponse>('/admin/organizers/pending')
      .then((response) => setApps(response.items || []))
      .catch((err) => {
        if (err instanceof Error && err.message === 'Not authenticated') {
          router.replace('/login');
          return;
        }
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [router]);

  const filtered = apps.filter(a =>
    (a.full_name || a.organization_name || '').toLowerCase().includes(query.toLowerCase())
  );

  const getTierBadge = (score?: number) => {
    if (!score) return { label: 'Pending', cls: 'bg-slate-100 text-slate-500' };
    if (score >= 80) return { label: 'Gold', cls: 'bg-amber-100 text-amber-700' };
    if (score >= 60) return { label: 'Silver', cls: 'bg-slate-200 text-slate-600' };
    return { label: 'Bronze', cls: 'bg-orange-100 text-orange-600' };
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="admin" />
      <DashboardHeader searchPlaceholder="Search organizers..." onSearch={setQuery} />
      <main className="ml-60 pt-16 p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-[#062E22]">Organizer Review Queue</h1>
            <p className="text-slate-500 text-sm mt-1">Review pending organizer registration applications.</p>
          </div>
          <span className="px-3 py-1.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">{filtered.length} Pending</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 animate-fade-in delay-100">
          <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wide">
            <div className="col-span-3">Name</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">OCR Score</div>
            <div className="col-span-2">Tier</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1 text-right">Action</div>
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center"><span className="text-4xl">✅</span><p className="text-slate-500 mt-3 text-sm">No pending organizer applications.</p></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(a => {
                const tier = getTierBadge(a.ocr_score);
                return (
                  <div key={a.id} className="grid grid-cols-12 gap-4 items-center px-6 py-4 hover:bg-slate-50 transition">
                    <div className="col-span-3">
                      <p className="font-semibold text-[#062E22] text-sm">{a.full_name || a.organization_name || 'N/A'}</p>
                      <p className="text-xs font-mono text-slate-400">{a.user_id.substring(0, 8)}</p>
                    </div>
                    <div className="col-span-2 text-sm text-slate-600 capitalize">{a.profile_type || '—'}</div>
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#062E22] rounded-full" style={{ width: `${a.ocr_score || 0}%` }} />
                        </div>
                        <span className="text-xs font-mono text-slate-600">{a.ocr_score ?? '—'}</span>
                      </div>
                    </div>
                    <div className="col-span-2"><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${tier.cls}`}>{tier.label}</span></div>
                    <div className="col-span-2"><span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">Pending Review</span></div>
                    <div className="col-span-1 text-right"><Link href={`/admin/organizers/${a.id}`} className="text-xs border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-[#062E22] hover:text-white hover:border-[#062E22] transition font-medium">Review</Link></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
