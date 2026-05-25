'use client';

import { useEffect, useState, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { getRole, getToken } from '@/app/lib/auth';
import supportService from '@/app/services/supportService';
import { SupportRequest } from '@/app/types/support';

export default function AdminSupportPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    const role = getRole();

    if (!token || (role !== 'admin' && role !== 'super_admin')) {
      setLoading(false);
      router.replace('/login');
      return;
    }

    fetchRequests();
  }, [router]);

  const fetchRequests = async () => {
    try {
      const data = await supportService.getAll();
      setRequests(data);
    } catch (err) {
      console.error('Failed to fetch support requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await supportService.delete(id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
      setConfirmDeleteId(null);
    } catch (err) {
      console.error('Failed to delete support request:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="admin" />
      <DashboardHeader />

      <main className="ml-60 pt-16 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#062E22]">Support Requests</h1>
          <p className="text-slate-500 text-sm mt-1">View and manage contact form submissions.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-slate-800">All Submissions</h2>
              <span className="px-2.5 py-0.5 bg-[#062E22]/10 text-[#062E22] text-xs font-semibold rounded-full">{requests.length}</span>
            </div>
            <button
              onClick={fetchRequests}
              className="text-xs border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-[#062E22] hover:text-white hover:border-[#062E22] transition font-medium text-slate-600"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : requests.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-slate-500 text-sm">No support requests yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Subject</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <Fragment key={req.id}>
                      <tr
                        className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition"
                        onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                      >
                        <td className="px-6 py-3 font-medium text-slate-800">{req.name}</td>
                        <td className="px-6 py-3 text-slate-500">{req.email}</td>
                        <td className="px-6 py-3 text-slate-700">{req.subject}</td>
                        <td className="px-6 py-3 text-slate-400 text-xs">{formatDate(req.created_at)}</td>
                        <td className="px-6 py-3 text-right">
                          {confirmDeleteId === req.id ? (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(req.id); }}
                                className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition font-medium"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                                className="text-xs border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition font-medium text-slate-600"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(req.id); }}
                              className="text-xs border border-red-200 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition font-medium"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                      {expandedId === req.id && (
                        <tr key={`${req.id}-details`}>
                          <td colSpan={5} className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Message</p>
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{req.message}</p>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
