'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, BadgeCheck } from 'lucide-react';
import { useEventWorkspace } from '@/app/hooks/useEventWorkspace';
import { eventsService } from '@/app/services/eventsService';
import {
  AnnouncementRecord,
  BadgeRecord,
  EventBookingRecord,
  IncidentRecord,
} from '@/app/types/event';
import { EventWorkspaceShell, formatDateTime, sentenceCase } from '@/components/organizer/events';

export default function EventOperationsPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { event, loading, error, setError } = useEventWorkspace(eventId);
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [badges, setBadges] = useState<BadgeRecord[]>([]);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [savingIncident, setSavingIncident] = useState(false);
  const [generatingBadges, setGeneratingBadges] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<EventBookingRecord | null>(null);
  const [incidentForm, setIncidentForm] = useState({
    type: 'Crowd Flow',
    severity: 'medium',
    time: '',
    description: '',
  });
  const [checkInQr, setCheckInQr] = useState('');

  const loadWorkspace = async () => {
    try {
      setLoadingWorkspace(true);
      setError(null);
      const [announcementResponse, incidentResponse, badgeResponse] = await Promise.all([
        eventsService.getAnnouncements(eventId),
        eventsService.getIncidents(eventId),
        eventsService.getBadges(eventId),
      ]);
      setAnnouncements(announcementResponse);
      setIncidents(incidentResponse);
      setBadges(badgeResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load operations workspace');
    } finally {
      setLoadingWorkspace(false);
    }
  };

  useEffect(() => {
    void loadWorkspace();
  }, [eventId]);

  const handleIncident = async () => {
    if (!event) return;
    try {
      setSavingIncident(true);
      setError(null);
      const created = await eventsService.createIncident(event.id, {
        type: incidentForm.type,
        severity: incidentForm.severity as 'low' | 'medium' | 'high' | 'critical',
        time: incidentForm.time ? new Date(incidentForm.time).toISOString() : undefined,
        description: incidentForm.description,
      });
      setIncidents((current) => [created, ...current]);
      setIncidentForm({
        type: 'Crowd Flow',
        severity: 'medium',
        time: '',
        description: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create incident');
    } finally {
      setSavingIncident(false);
    }
  };

  const handleGenerateBadges = async () => {
    if (!event) return;
    try {
      setGeneratingBadges(true);
      setError(null);
      const response = await eventsService.generateBadges(event.id, {
        include_unchecked_in: true,
      });
      setBadges(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate badges');
    } finally {
      setGeneratingBadges(false);
    }
  };

  const handleScan = async () => {
    if (!event) return;
    try {
      setScanning(true);
      setError(null);
      const response = await eventsService.scanCheckIn(event.id, { qr_code: checkInQr });
      setLastScan(response);
      setCheckInQr('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan QR code');
    } finally {
      setScanning(false);
    }
  };

  return (
    <EventWorkspaceShell
      event={event}
      loading={loading}
      error={error}
      activeTab="operations"
      aside={
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-[#062E22]">Ops Snapshot</h2>
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Msgs</p>
                <p className="text-xl font-bold text-[#062E22] mt-2">{announcements.length}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Incidents</p>
                <p className="text-xl font-bold text-[#062E22] mt-2">{incidents.length}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Badges</p>
                <p className="text-xl font-bold text-[#062E22] mt-2">{badges.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-[#062E22]">Check-In Scan</h2>
            <div className="space-y-4 mt-4">
              <input
                value={checkInQr}
                onChange={(eventValue) => setCheckInQr(eventValue.target.value)}
                placeholder="Paste QR code value"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <button
                onClick={() => void handleScan()}
                disabled={scanning}
                className="w-full px-4 py-2 bg-[#062E22] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a37] transition disabled:opacity-50"
              >
                {scanning ? 'Scanning...' : 'Process Check-In'}
              </button>
            </div>

            {lastScan ? (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 mt-5">
                <p className="text-sm font-semibold text-emerald-700">{lastScan.attendee_name || lastScan.booking_reference}</p>
                <p className="text-sm text-emerald-600 mt-1">Check-in status: {sentenceCase(lastScan.check_in_status)}</p>
              </div>
            ) : null}
          </div>
        </div>
      }
    >
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-[#062E22]">Announcement Handoff</h2>
          <p className="text-sm text-slate-500 mt-3">
            Announcement creation, scheduling, and manual run-now execution now live in their own workspace.
          </p>
          <Link
            href={`/organizer/events/${eventId}/announcements`}
            className="inline-flex mt-5 px-4 py-2 bg-[#062E22] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a37] transition"
          >
            Open Announcements Workspace
          </Link>
          <div className="space-y-3 mt-6">
            {announcements.slice(0, 3).map((announcement) => (
              <div key={announcement.id} className="rounded-xl border border-slate-200 p-4">
                <p className="font-semibold text-[#062E22]">{announcement.subject}</p>
                <p className="text-sm text-slate-500 mt-1">
                  {sentenceCase(announcement.status)} • {announcement.delivered_count}/{announcement.recipient_count} delivered
                </p>
              </div>
            ))}
            {announcements.length === 0 ? <p className="text-sm text-slate-500 mt-4">No announcements created yet.</p> : null}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#062E22]/10 text-[#062E22] flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#062E22]">Incident Log</h2>
              <p className="text-sm text-slate-500">Capture issues during setup or live operations.</p>
            </div>
          </div>

          <div className="space-y-4 mt-6">
            <div>
              <label className="text-sm font-medium text-slate-700">Incident Type</label>
              <input
                value={incidentForm.type}
                onChange={(eventValue) =>
                  setIncidentForm((current) => ({ ...current, type: eventValue.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Severity</label>
                <select
                  value={incidentForm.severity}
                  onChange={(eventValue) =>
                    setIncidentForm((current) => ({ ...current, severity: eventValue.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Time</label>
                <input
                  type="datetime-local"
                  value={incidentForm.time}
                  onChange={(eventValue) =>
                    setIncidentForm((current) => ({ ...current, time: eventValue.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Description</label>
              <textarea
                rows={4}
                value={incidentForm.description}
                onChange={(eventValue) =>
                  setIncidentForm((current) => ({ ...current, description: eventValue.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={() => void handleIncident()}
              disabled={savingIncident}
              className="px-4 py-2 bg-[#062E22] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a37] transition disabled:opacity-50"
            >
              {savingIncident ? 'Saving...' : 'Log Incident'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#062E22]/10 text-[#062E22] flex items-center justify-center">
              <BadgeCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#062E22]">Badge Generation</h2>
              <p className="text-sm text-slate-500">Create attendee badges from confirmed bookings.</p>
            </div>
          </div>
          <button
            onClick={() => void handleGenerateBadges()}
            disabled={generatingBadges}
            className="px-4 py-2 bg-[#062E22] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a37] transition disabled:opacity-50"
          >
            {generatingBadges ? 'Generating...' : 'Generate Badges'}
          </button>
        </div>

        {loadingWorkspace ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid xl:grid-cols-3 gap-6 mt-6">
            <div>
              <h3 className="text-base font-semibold text-[#062E22] mb-4">Announcements</h3>
              <div className="space-y-3">
                {announcements.length === 0 ? <p className="text-sm text-slate-500">No announcements yet.</p> : null}
                {announcements.map((announcement) => (
                  <div key={announcement.id} className="rounded-xl border border-slate-200 p-4">
                    <p className="font-semibold text-[#062E22]">{announcement.subject}</p>
                    <p className="text-sm text-slate-500 mt-1">
                      {sentenceCase(announcement.status)} • {announcement.channel}
                    </p>
                    <p className="text-sm text-slate-600 mt-3">{announcement.body}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-[#062E22] mb-4">Incident Feed</h3>
              <div className="space-y-3">
                {incidents.length === 0 ? <p className="text-sm text-slate-500">No incidents yet.</p> : null}
                {incidents.map((incident) => (
                  <div key={incident.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-[#062E22]">{incident.type}</p>
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${incident.severity === 'critical' || incident.severity === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {sentenceCase(incident.severity)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{formatDateTime(incident.time)}</p>
                    <p className="text-sm text-slate-600 mt-3">{incident.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-[#062E22] mb-4">Generated Badges</h3>
              <div className="space-y-3">
                {badges.length === 0 ? <p className="text-sm text-slate-500">No badges generated yet.</p> : null}
                {badges.map((badge) => (
                  <div key={badge.id} className="rounded-xl border border-slate-200 p-4">
                    <p className="font-semibold text-[#062E22]">{badge.attendee_name || badge.attendee_email || badge.badge_code}</p>
                    <p className="text-sm text-slate-500 mt-1">{badge.badge_code}</p>
                    <p className="text-sm text-slate-500 mt-1">{formatDateTime(badge.generated_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </EventWorkspaceShell>
  );
}
