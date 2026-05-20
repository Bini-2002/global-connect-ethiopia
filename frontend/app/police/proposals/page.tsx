'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { api } from '@/app/lib/api';
import { PoliceNotificationRecord } from '@/app/types/proposal';

export default function PoliceProposalsPage() {
  const [notifications, setNotifications] = useState<PoliceNotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    setError(null);
    api.get<PoliceNotificationRecord[]>('/police/proposals/')
      .then(setNotifications)
      .catch((err) => {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Unable to load police notifications.');
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = notifications.filter((item) =>
    item.event_title.toLowerCase().includes(query.toLowerCase()) ||
    (item.location || '').toLowerCase().includes(query.toLowerCase()) ||
    (item.organizer_contact.organizer_name || '').toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="police" />
      <DashboardHeader searchPlaceholder="Search events..." onSearch={setQuery} />
      <main className="ml-60 pt-16 p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-[#062E22]">Police Notifications</h1>
            <p className="text-slate-500 text-sm mt-1">
              Persisted, read-only security notifications created automatically after municipal approval.
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            {filtered.length} Assigned Events
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 animate-fade-in delay-100">
          <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wide">
            <div className="col-span-4">Event Name</div>
            <div className="col-span-2">Location</div>
            <div className="col-span-2">Dates</div>
            <div className="col-span-2">Expected Attendees</div>
            <div className="col-span-1">Permit</div>
            <div className="col-span-1 text-right">Action</div>
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-slate-500 mt-3 text-sm">No approved event notifications found.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-4 items-center px-6 py-4 hover:bg-slate-50 transition">
                  <div className="col-span-4">
                    <p className="font-semibold text-[#062E22] text-sm">{item.event_title}</p>
                    <p className="text-xs text-slate-500 mt-1">{item.police_office.office_name || 'Assigned Police Office'}</p>
                    <p className="text-xs font-mono text-slate-400">{item.approval_reference || item.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <div className="col-span-2 text-sm text-slate-600">{item.location || '—'}</div>
                  <div className="col-span-2 text-xs text-slate-500">
                    {item.start_date ? new Date(item.start_date).toLocaleDateString() : '—'}
                    {item.end_date ? ` → ${new Date(item.end_date).toLocaleDateString()}` : ''}
                  </div>
                  <div className="col-span-2 text-sm text-slate-600">{item.expected_attendees?.toLocaleString() || '—'}</div>
                  <div className="col-span-1 text-xs text-slate-500">{item.permit_reference || '—'}</div>
                  <div className="col-span-1 flex justify-end">
                    <Link href={`/police/proposals/${item.proposal_id}`} className="text-xs border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-[#062E22] hover:text-white hover:border-[#062E22] transition font-medium">
                      Open
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
