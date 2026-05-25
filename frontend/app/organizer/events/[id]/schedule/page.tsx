'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Bot, CalendarPlus2, Sparkles, Trash2 } from 'lucide-react';
import { useEventWorkspace } from '@/app/hooks/useEventWorkspace';
import { eventsService } from '@/app/services/eventsService';
import { EventScheduleItemRecord } from '@/app/types/event';
import {
  EventWorkspaceShell,
  formatDateTime,
  sentenceCase,
  startOfInputDateTime,
} from '@/components/organizer/events';
import { isDateInPast, isEndBeforeStart } from '@/app/lib/dateUtils';

interface ScheduleFormState {
  session_title: string;
  description: string;
  start_time: string;
  end_time: string;
  speaker_id: string;
  room_location: string;
}

function buildDefaultSessionForm(startDate?: string | null): ScheduleFormState {
  const base = startDate ? startOfInputDateTime(startDate) : '';
  return {
    session_title: '',
    description: '',
    start_time: base,
    end_time: base,
    speaker_id: '',
    room_location: '',
  };
}

export default function EventSchedulePage() {
  const params = useParams();
  const eventId = params.id as string;
  const { event, loading, error, setError } = useEventWorkspace(eventId);
  const [schedule, setSchedule] = useState<EventScheduleItemRecord[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [savingSession, setSavingSession] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sessionForm, setSessionForm] = useState<ScheduleFormState>(buildDefaultSessionForm());
  const [aiDraftSettings, setAiDraftSettings] = useState({
    event_type: '',
    duration_days: 1,
    start_time: '09:00',
  });
  const [pendingDraftId, setPendingDraftId] = useState<string | null>(null);
  const [pendingDraftItems, setPendingDraftItems] = useState<any[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (event && !aiDraftSettings.event_type) {
      setAiDraftSettings(curr => ({ ...curr, event_type: event.category || 'Tech Conference' }));
    }
  }, [event]);

  const loadSchedule = async () => {
    try {
      setLoadingSchedule(true);
      setError(null);
      const response = await eventsService.getEventSchedule(eventId);
      setSchedule(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedule');
    } finally {
      setLoadingSchedule(false);
    }
  };

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    void loadSchedule();
  }, [eventId]);

  useEffect(() => {
    if (!event) return;
    setSessionForm((current) =>
      current.start_time || current.end_time ? current : buildDefaultSessionForm(event.start_date)
    );
  }, [event]);

  const sortedSchedule = useMemo(
    () =>
      [...schedule].sort(
        (left, right) => new Date(left.start_time).getTime() - new Date(right.start_time).getTime()
      ),
    [schedule]
  );

  const handleCreateSession = async () => {
    if (!event) return;
    // Validate session times: not in the past and end after start
    if (isDateInPast(sessionForm.start_time) || isDateInPast(sessionForm.end_time)) {
      setError('Session start or end time cannot be in the past.');
      return;
    }
    if (isEndBeforeStart(sessionForm.start_time, sessionForm.end_time)) {
      setError('Session end time must be after start time.');
      return;
    }
    try {
      setSavingSession(true);
      setError(null);
      const created = await eventsService.createEventScheduleItem(event.id, {
        session_title: sessionForm.session_title,
        description: sessionForm.description || undefined,
        start_time: new Date(sessionForm.start_time).toISOString(),
        end_time: new Date(sessionForm.end_time).toISOString(),
        speaker_id: sessionForm.speaker_id || undefined,
        room_location: sessionForm.room_location || undefined,
      });
      setSchedule((current) => [created, ...current]);
      setSessionForm(buildDefaultSessionForm(event.start_date));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setSavingSession(false);
    }
  };

  const handleAIDraft = async () => {
    if (!event) return;
    try {
      setDrafting(true);
      setError(null);
      const response = await eventsService.generateScheduleAIDraft(event.id, {
        duration_days: aiDraftSettings.duration_days,
        start_time: aiDraftSettings.start_time,
        event_type: aiDraftSettings.event_type
      });
      setPendingDraftId(response.id);
      setPendingDraftItems(response.generated_items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to draft schedule');
    } finally {
      setDrafting(false);
    }
  };

  const handleApplyDraft = async () => {
    if (!event || !pendingDraftId) return;
    try {
      setSavingSession(true);
      setError(null);
      await eventsService.applyScheduleAIDraft(event.id, pendingDraftId, pendingDraftItems);
      setPendingDraftId(null);
      setPendingDraftItems([]);
      setSuccessMessage('AI Draft successfully applied to your calendar!');
      await loadSchedule();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply schedule draft');
    } finally {
      setSavingSession(false);
    }
  };

  const handleDiscardDraft = () => {
    setPendingDraftId(null);
    setPendingDraftItems([]);
  };

  const markReviewed = async (item: EventScheduleItemRecord) => {
    if (!event) return;
    try {
      setReviewingId(item.id);
      setError(null);
      const updated = await eventsService.updateEventScheduleItem(event.id, item.id, {
        is_ai_suggestion: false,
      });
      setSchedule((current) =>
        current.map((entry) => (entry.id === item.id ? updated : entry))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update session');
    } finally {
      setReviewingId(null);
    }
  };

  const handleDeleteSession = async (item: EventScheduleItemRecord) => {
    if (!event) return;
    try {
      setDeletingId(item.id);
      setError(null);
      await eventsService.deleteEventScheduleItem(event.id, item.id);
      setSchedule((current) => current.filter((entry) => entry.id !== item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete session');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <EventWorkspaceShell
      event={event}
      loading={loading}
      error={error}
      activeTab="schedule"
      aside={
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-[#062E22]">AI Draft Builder</h2>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Event Type</label>
                <div className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 font-medium capitalize">
                  {event?.category ? event.category.replace('_', ' ') : 'General Event'}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">Auto-detected from event settings.</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Duration (days)</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={aiDraftSettings.duration_days}
                  onChange={(eventValue) =>
                    setAiDraftSettings((current) => ({
                      ...current,
                      duration_days: Number(eventValue.target.value) || 1,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Start Time</label>
                <input
                  type="time"
                  value={aiDraftSettings.start_time}
                  onChange={(eventValue) =>
                    setAiDraftSettings((current) => ({
                      ...current,
                      start_time: eventValue.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={() => void handleAIDraft()}
                disabled={drafting || pendingDraftId !== null}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#062E22] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a37] transition disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                {drafting ? 'Generating...' : 'Generate AI Draft'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-[#062E22]">Schedule Health</h2>
            <div className="space-y-3 mt-4 text-sm text-slate-600">
              <p>{sortedSchedule.length} schedule items currently saved.</p>
              <p>{sortedSchedule.filter((item) => item.is_ai_suggestion).length} items still marked as AI suggestions.</p>
              <p>{sortedSchedule.filter((item) => !item.is_ai_suggestion).length} items already reviewed by the organizer.</p>
            </div>
          </div>
        </div>
      }
    >
      {successMessage && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-4">
          <Sparkles className="w-5 h-5" />
          <span className="text-sm font-semibold">{successMessage}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#062E22]/10 text-[#062E22] flex items-center justify-center">
            <CalendarPlus2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#062E22]">Add Session</h2>
            <p className="text-sm text-slate-500">Create agenda items manually when you need precise control.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <div>
            <label className="text-sm font-medium text-slate-700">Session Title</label>
            <input
              value={sessionForm.session_title}
              onChange={(eventValue) =>
                setSessionForm((current) => ({ ...current, session_title: eventValue.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Room / Location</label>
            <input
              value={sessionForm.room_location}
              onChange={(eventValue) =>
                setSessionForm((current) => ({ ...current, room_location: eventValue.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Start Time</label>
            <input
              type="datetime-local"
              value={sessionForm.start_time}
              onChange={(eventValue) =>
                setSessionForm((current) => ({ ...current, start_time: eventValue.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">End Time</label>
            <input
              type="datetime-local"
              value={sessionForm.end_time}
              onChange={(eventValue) =>
                setSessionForm((current) => ({ ...current, end_time: eventValue.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Description</label>
            <textarea
              rows={3}
              value={sessionForm.description}
              onChange={(eventValue) =>
                setSessionForm((current) => ({ ...current, description: eventValue.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {((sessionForm.start_time && isDateInPast(sessionForm.start_time)) || (sessionForm.end_time && isDateInPast(sessionForm.end_time)) || isEndBeforeStart(sessionForm.start_time, sessionForm.end_time)) && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Session times are invalid: they may be in the past or the end time precedes the start time.
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            onClick={() => void handleCreateSession()}
            disabled={savingSession || (sessionForm.start_time && isDateInPast(sessionForm.start_time)) || (sessionForm.end_time && isDateInPast(sessionForm.end_time)) || isEndBeforeStart(sessionForm.start_time, sessionForm.end_time)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#062E22] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a37] transition disabled:opacity-50"
          >
            <Bot className="w-4 h-4" />
            {savingSession ? 'Saving...' : 'Add Session'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-[#062E22]">Schedule Timeline</h2>
        {pendingDraftId && pendingDraftItems.length > 0 && (
          <div className="mb-6 p-5 bg-amber-50 border border-amber-200 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-amber-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5" /> AI Generated Draft Review
              </h3>
              <div className="flex gap-2">
                 <button
                    onClick={handleDiscardDraft}
                    className="px-3 py-1.5 text-sm font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition"
                 >
                    Discard Make New
                 </button>
                 <button
                    onClick={() => void handleApplyDraft()}
                    disabled={savingSession}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition disabled:opacity-50"
                 >
                    {savingSession ? 'Applying...' : 'Apply to Calendar'}
                 </button>
              </div>
            </div>
            
            <div className="space-y-3">
              {pendingDraftItems.map((item, idx) => (
                <div key={idx} className="bg-white/80 p-4 rounded-xl border border-amber-100">
                   <div className="flex justify-between items-start">
                     <div>
                       <h4 className="font-semibold text-amber-900">{item.title}</h4>
                       <p className="text-xs text-amber-700 mt-1">
                         {item.start_time} to {item.end_time}
                       </p>
                       {item.description && <p className="text-sm text-slate-700 mt-2">{item.description}</p>}
                     </div>
                     <span className="text-xs font-bold px-2 py-1 bg-amber-100 text-amber-800 rounded-full">{item.category || 'Session'}</span>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loadingSchedule ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sortedSchedule.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 mt-4">
            No schedule items yet. Create one manually or generate an AI draft.
          </div>
        ) : (
          <div className="space-y-4 mt-5">
            {sortedSchedule.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 p-5">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-base font-semibold text-[#062E22]">{item.session_title}</h3>
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${item.is_ai_suggestion ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {item.is_ai_suggestion ? 'AI Suggestion' : 'Reviewed'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-2">
                      {formatDateTime(item.start_time)} to {formatDateTime(item.end_time)}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      {item.room_location || 'Room pending'} {item.speaker_id ? `• Speaker ID ${item.speaker_id}` : ''}
                    </p>
                    {item.description ? <p className="text-sm text-slate-600 mt-3">{item.description}</p> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {item.is_ai_suggestion ? (
                      <button
                        onClick={() => void markReviewed(item)}
                        disabled={reviewingId === item.id}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
                      >
                        {reviewingId === item.id ? 'Saving...' : 'Mark Reviewed'}
                      </button>
                    ) : (
                      <span className="text-sm font-medium text-emerald-700 px-4">{sentenceCase('reviewed')}</span>
                    )}
                    <button
                      onClick={() => void handleDeleteSession(item)}
                      disabled={deletingId === item.id}
                      className="inline-flex items-center justify-center p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition disabled:opacity-50"
                      title="Delete Session"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </EventWorkspaceShell>
  );
}
