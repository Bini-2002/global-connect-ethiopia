'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import { api } from '@/app/lib/api';

export default function CreateProposalPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    event_type: '',
    start_date: '',
    end_date: '',
    location: '',
    expected_attendees: '',
    budget_estimate: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...form,
        expected_attendees: parseInt(form.expected_attendees),
        budget_estimate: parseFloat(form.budget_estimate),
      };
      const res = await api.post<{ id: string }>('/proposals/', payload);
      router.push(`/organizer/proposals/${res.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create proposal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="organizer" />
      <DashboardHeader />
      <main className="ml-60 pt-16 p-8">
        <div className="max-w-3xl mx-auto animate-fade-in">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#062E22]">Create New Proposal</h1>
            <p className="text-slate-500 text-sm mt-1">Fill in the event details. You can save as draft and submit later.</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6">
            {/* Basic Info */}
            <div>
              <h2 className="text-base font-semibold text-[#062E22] border-b border-slate-100 pb-2 mb-4">Event Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Proposal Title <span className="text-red-500">*</span></label>
                  <input name="title" value={form.title} onChange={handleChange} required
                    placeholder="e.g. Addis Tech Expo 2026"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-[#062E22]/20 focus:border-[#062E22] outline-none transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea name="description" value={form.description} onChange={handleChange} rows={3}
                    placeholder="Describe the event purpose, objectives, and expected outcomes..."
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-[#062E22]/20 focus:border-[#062E22] outline-none transition resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Event Type <span className="text-red-500">*</span></label>
                    <select name="event_type" value={form.event_type} onChange={handleChange} required
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-[#062E22]/20 focus:border-[#062E22] outline-none transition">
                      <option value="">Select type...</option>
                      {['Conference', 'Exhibition', 'Concert', 'Cultural Event', 'Sports', 'Trade Fair', 'Government Event', 'Other'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Location <span className="text-red-500">*</span></label>
                    <input name="location" value={form.location} onChange={handleChange} required
                      placeholder="e.g. Millennium Hall, Addis Ababa"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-[#062E22]/20 focus:border-[#062E22] outline-none transition" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Start Date <span className="text-red-500">*</span></label>
                    <input type="date" name="start_date" value={form.start_date} onChange={handleChange} required
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-[#062E22]/20 focus:border-[#062E22] outline-none transition" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">End Date <span className="text-red-500">*</span></label>
                    <input type="date" name="end_date" value={form.end_date} onChange={handleChange} required
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-[#062E22]/20 focus:border-[#062E22] outline-none transition" />
                  </div>
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div>
              <h2 className="text-base font-semibold text-[#062E22] border-b border-slate-100 pb-2 mb-4">Logistics</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Expected Attendees <span className="text-red-500">*</span></label>
                  <input type="number" name="expected_attendees" value={form.expected_attendees} onChange={handleChange} required min="1"
                    placeholder="e.g. 500"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-[#062E22]/20 focus:border-[#062E22] outline-none transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Budget Estimate (ETB) <span className="text-red-500">*</span></label>
                  <input type="number" name="budget_estimate" value={form.budget_estimate} onChange={handleChange} required min="0"
                    placeholder="e.g. 250000"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-[#062E22]/20 focus:border-[#062E22] outline-none transition" />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
              <button type="submit" disabled={loading}
                className="px-6 py-2.5 bg-[#062E22] text-white text-sm font-semibold rounded-lg hover:bg-[#0a4a37] transition disabled:opacity-50 flex items-center gap-2">
                {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Save as Draft
              </button>
              <button type="button" onClick={() => router.back()}
                className="px-6 py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
