'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { BarChart3, Send, FileCheck2 } from 'lucide-react';
import { useEventWorkspace } from '@/app/hooks/useEventWorkspace';
import { eventsService } from '@/app/services/eventsService';
import { FeedbackSummaryRecord, FinalReportRecord } from '@/app/types/event';
import {
  EventWorkspaceShell,
  formatCurrency,
  formatDateTime,
  sentenceCase,
} from '@/components/organizer/events';

function parseVendors(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function EventWrapUpPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { event, loading, error, refresh, setError } = useEventWorkspace(eventId);
  const [feedbackSummary, setFeedbackSummary] = useState<FeedbackSummaryRecord | null>(null);
  const [finalReport, setFinalReport] = useState<FinalReportRecord | null>(null);
  const [loadingWrapUp, setLoadingWrapUp] = useState(true);
  const [sendingSurvey, setSendingSurvey] = useState(false);
  const [savingReport, setSavingReport] = useState(false);
  const [surveyForm, setSurveyForm] = useState({
    audience_segment: 'all',
    scheduled_for: '',
    custom_questions: '',
  });
  const [reportForm, setReportForm] = useState({
    timeline_summary: '',
    total_costs: '',
    vendors_used: '',
    lessons_learned: '',
    visibility: 'private',
    benchmark_notes: '',
  });

  const loadWrapUp = async () => {
    try {
      setLoadingWrapUp(true);
      setError(null);
      const summary = await eventsService.getFeedbackSummary(eventId).catch(() => null);
      const report = await eventsService.getFinalReport(eventId).catch(() => null);
      setFeedbackSummary(summary);
      setFinalReport(report);
      if (report) {
        setReportForm({
          timeline_summary: report.timeline_summary,
          total_costs: report.total_costs != null ? `${report.total_costs}` : '',
          vendors_used: report.vendors_used.join(', '),
          lessons_learned: report.lessons_learned,
          visibility: report.visibility,
          benchmark_notes: report.benchmark_notes || '',
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wrap-up workspace');
    } finally {
      setLoadingWrapUp(false);
    }
  };

  useEffect(() => {
    void loadWrapUp();
  }, [eventId]);

  const handleSendSurvey = async () => {
    if (!event) return;
    try {
      setSendingSurvey(true);
      setError(null);
      const summary = await eventsService.sendFeedbackSurvey(event.id, {
        audience_segment: surveyForm.audience_segment,
        scheduled_for: surveyForm.scheduled_for ? new Date(surveyForm.scheduled_for).toISOString() : null,
        custom_questions: surveyForm.custom_questions
          ? surveyForm.custom_questions.split('\n').map((item) => item.trim()).filter(Boolean)
          : [],
      });
      setFeedbackSummary(summary);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send survey');
    } finally {
      setSendingSurvey(false);
    }
  };

  const handleSaveReport = async () => {
    if (!event) return;
    try {
      setSavingReport(true);
      setError(null);
      const payload = {
        timeline_summary: reportForm.timeline_summary,
        total_costs: reportForm.total_costs ? Number(reportForm.total_costs) : null,
        vendors_used: parseVendors(reportForm.vendors_used),
        lessons_learned: reportForm.lessons_learned,
        visibility: reportForm.visibility as 'private' | 'sponsors' | 'government' | 'public',
        benchmark_notes: reportForm.benchmark_notes || undefined,
      };
      const saved = finalReport
        ? await eventsService.updateFinalReport(event.id, payload)
        : await eventsService.createFinalReport(event.id, payload);
      setFinalReport(saved);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save final report');
    } finally {
      setSavingReport(false);
    }
  };

  return (
    <EventWorkspaceShell
      event={event}
      loading={loading}
      error={error}
      activeTab="wrap-up"
      aside={
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-[#062E22]">Feedback Summary</h2>
            <div className="space-y-4 mt-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Survey Status</p>
                <p className="text-lg font-bold text-[#062E22] mt-2">{sentenceCase(feedbackSummary?.survey_status || event?.survey_status)}</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Responses</p>
                  <p className="text-lg font-bold text-[#062E22] mt-2">{feedbackSummary?.response_count || 0}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Rating</p>
                  <p className="text-lg font-bold text-[#062E22] mt-2">{feedbackSummary?.average_rating ?? '-'}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">NPS</p>
                  <p className="text-lg font-bold text-[#062E22] mt-2">{feedbackSummary?.average_nps ?? '-'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-[#062E22]">Report Status</h2>
            <div className="space-y-3 mt-4 text-sm text-slate-600">
              <p>Current status: {sentenceCase(finalReport?.status || event?.final_report_status)}</p>
              <p>Published at: {formatDateTime(finalReport?.published_at)}</p>
              <p>Total costs: {formatCurrency(finalReport?.total_costs, event?.budget_currency || 'ETB')}</p>
            </div>
          </div>
        </div>
      }
    >
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#062E22]/10 text-[#062E22] flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#062E22]">Send Feedback Survey</h2>
              <p className="text-sm text-slate-500">Collect post-event feedback from attendees or stakeholders.</p>
            </div>
          </div>

          <div className="space-y-4 mt-6">
            <div>
              <label className="text-sm font-medium text-slate-700">Audience Segment</label>
              <input
                value={surveyForm.audience_segment}
                onChange={(eventValue) =>
                  setSurveyForm((current) => ({ ...current, audience_segment: eventValue.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Scheduled For</label>
              <input
                type="datetime-local"
                value={surveyForm.scheduled_for}
                onChange={(eventValue) =>
                  setSurveyForm((current) => ({ ...current, scheduled_for: eventValue.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Custom Questions</label>
              <textarea
                rows={5}
                value={surveyForm.custom_questions}
                onChange={(eventValue) =>
                  setSurveyForm((current) => ({ ...current, custom_questions: eventValue.target.value }))
                }
                placeholder="One question per line"
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={() => void handleSendSurvey()}
              disabled={sendingSurvey}
              className="px-4 py-2 bg-[#062E22] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a37] transition disabled:opacity-50"
            >
              {sendingSurvey ? 'Sending...' : 'Send Survey'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#062E22]/10 text-[#062E22] flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#062E22]">Final Report</h2>
              <p className="text-sm text-slate-500">Capture costs, lessons, and benchmark notes after the event.</p>
            </div>
          </div>

          <div className="space-y-4 mt-6">
            <div>
              <label className="text-sm font-medium text-slate-700">Timeline Summary</label>
              <textarea
                rows={4}
                value={reportForm.timeline_summary}
                onChange={(eventValue) =>
                  setReportForm((current) => ({ ...current, timeline_summary: eventValue.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Total Costs</label>
                <input
                  type="number"
                  min="0"
                  value={reportForm.total_costs}
                  onChange={(eventValue) =>
                    setReportForm((current) => ({ ...current, total_costs: eventValue.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Visibility</label>
                <select
                  value={reportForm.visibility}
                  onChange={(eventValue) =>
                    setReportForm((current) => ({ ...current, visibility: eventValue.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="private">Private</option>
                  <option value="sponsors">Sponsors</option>
                  <option value="government">Government</option>
                  <option value="public">Public</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Vendors Used</label>
              <input
                value={reportForm.vendors_used}
                onChange={(eventValue) =>
                  setReportForm((current) => ({ ...current, vendors_used: eventValue.target.value }))
                }
                placeholder="Addis Catering, ASTU Media..."
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Lessons Learned</label>
              <textarea
                rows={4}
                value={reportForm.lessons_learned}
                onChange={(eventValue) =>
                  setReportForm((current) => ({ ...current, lessons_learned: eventValue.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Benchmark Notes</label>
              <textarea
                rows={3}
                value={reportForm.benchmark_notes}
                onChange={(eventValue) =>
                  setReportForm((current) => ({ ...current, benchmark_notes: eventValue.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={() => void handleSaveReport()}
              disabled={savingReport}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#062E22] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a37] transition disabled:opacity-50"
            >
              <FileCheck2 className="w-4 h-4" />
              {savingReport ? 'Saving...' : finalReport ? 'Update Final Report' : 'Publish Final Report'}
            </button>
          </div>
        </div>
      </div>

      {loadingWrapUp ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : null}
    </EventWorkspaceShell>
  );
}
