/* frontend/app/organizer/events/[id]/announcements/page.tsx */

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BellRing, PlayCircle } from "lucide-react";
import { useEventWorkspace } from "@/app/hooks/useEventWorkspace";
import { eventsService } from "@/app/services/eventsService";
import {
  AnnouncementDeliveryRecord,
  AnnouncementRecord,
} from "@/app/types/event";
import {
  EventWorkspaceShell,
  formatDateTime,
  sentenceCase,
} from "@/components/organizer/events";

export default function EventAnnouncementsPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { event, loading, error, setError } = useEventWorkspace(eventId);
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [selectedAnnouncementId, setSelectedAnnouncementId] =
    useState<string>("");
  const [deliveries, setDeliveries] = useState<AnnouncementDeliveryRecord[]>(
    [],
  );
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
  const [runningAnnouncement, setRunningAnnouncement] = useState<string | null>(
    null,
  );
  const [announcementForm, setAnnouncementForm] = useState({
    audience_segment: "confirmed_bookings" as const,
    subject: "",
    body: "",
    send_at: "",
  });

  const loadAnnouncements = async () => {
    try {
      setLoadingAnnouncements(true);
      setError(null);
      const response = await eventsService.getAnnouncements(eventId);
      setAnnouncements(response);
      if (!selectedAnnouncementId && response[0]) {
        setSelectedAnnouncementId(response[0].id);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load announcements",
      );
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  useEffect(() => {
    void loadAnnouncements();
  }, [eventId]);

  useEffect(() => {
    if (!selectedAnnouncementId) {
      setDeliveries([]);
      return;
    }
    eventsService
      .getAnnouncementDeliveries(eventId, selectedAnnouncementId)
      .then(setDeliveries)
      .catch(() => setDeliveries([]));
  }, [eventId, selectedAnnouncementId]);

  const handleAnnouncement = async () => {
    if (!event) return;
    try {
      setSendingAnnouncement(true);
      setError(null);
      const created = await eventsService.createAnnouncement(event.id, {
        audience_segment: "confirmed_bookings",
        subject: announcementForm.subject,
        body: announcementForm.body,
        channel: "in_app",
        send_at: announcementForm.send_at
          ? new Date(announcementForm.send_at).toISOString()
          : null,
      });
      setAnnouncements((current) => [created, ...current]);
      setSelectedAnnouncementId(created.id);
      setAnnouncementForm({
        audience_segment: "confirmed_bookings",
        subject: "",
        body: "",
        send_at: "",
      });
      if (created.status === "sent") {
        const deliveryResponse = await eventsService.getAnnouncementDeliveries(
          event.id,
          created.id,
        );
        setDeliveries(deliveryResponse);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create announcement",
      );
    } finally {
      setSendingAnnouncement(false);
    }
  };

  const handleRunNow = async (announcementId: string) => {
    if (!event) return;
    try {
      setRunningAnnouncement(announcementId);
      setError(null);
      const response = await eventsService.runScheduledAnnouncementNow(
        event.id,
        announcementId,
      );
      setAnnouncements((current) =>
        current.map((item) =>
          item.id === announcementId ? response.announcement : item,
        ),
      );
      setSelectedAnnouncementId(announcementId);
      setDeliveries(response.deliveries);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to run scheduled announcement",
      );
    } finally {
      setRunningAnnouncement(null);
    }
  };

  return (
    <EventWorkspaceShell
      event={event}
      loading={loading}
      error={error}
      activeTab="announcements"
      aside={
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-[#062E22]">
              Delivery Snapshot
            </h2>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Announcements
                </p>
                <p className="text-xl font-bold text-[#062E22] mt-2">
                  {announcements.length}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Deliveries
                </p>
                <p className="text-xl font-bold text-[#062E22] mt-2">
                  {deliveries.length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-[#062E22]">Phase 1 Rule</h2>
            <p className="text-sm text-slate-600 mt-4">
              This phase only delivers in-app announcements to confirmed
              bookings. Scheduled messages stay dormant until you run them
              manually here.
            </p>
          </div>
        </div>
      }
    >
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#062E22]/10 text-[#062E22] flex items-center justify-center">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#062E22]">
                Create Announcement
              </h2>
              <p className="text-sm text-slate-500">
                Immediate sends execute now. Future sends are saved as scheduled
                records.
              </p>
            </div>
          </div>

          <div className="space-y-4 mt-6">
            <div>
              <label className="text-sm font-medium text-slate-700">
                Audience Segment
              </label>
              <input
                value="confirmed_bookings"
                disabled
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">
                Subject
              </label>
              <input
                value={announcementForm.subject}
                onChange={(eventValue) =>
                  setAnnouncementForm((current) => ({
                    ...current,
                    subject: eventValue.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">
                Message Body
              </label>
              <textarea
                rows={5}
                value={announcementForm.body}
                onChange={(eventValue) =>
                  setAnnouncementForm((current) => ({
                    ...current,
                    body: eventValue.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">
                Send At
              </label>
              <input
                type="datetime-local"
                value={announcementForm.send_at}
                onChange={(eventValue) =>
                  setAnnouncementForm((current) => ({
                    ...current,
                    send_at: eventValue.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <p className="text-xs text-slate-500 mt-2">
                Leave blank to deliver immediately. Future dates create
                scheduled records.
              </p>
            </div>
            <button
              onClick={() => void handleAnnouncement()}
              disabled={sendingAnnouncement}
              className="px-4 py-2 bg-[#062E22] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a37] transition disabled:opacity-50"
            >
              {sendingAnnouncement ? "Saving..." : "Create Announcement"}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-[#062E22]">
            Announcement Records
          </h2>
          {loadingAnnouncements ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : announcements.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 mt-4">
              No announcements yet.
            </div>
          ) : (
            <div className="space-y-3 mt-5">
              {announcements.map((announcement) => (
                <button
                  key={announcement.id}
                  onClick={() => setSelectedAnnouncementId(announcement.id)}
                  className={`w-full text-left rounded-2xl border p-4 transition ${
                    selectedAnnouncementId === announcement.id
                      ? "border-[#062E22] bg-[#F5FBF8]"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#062E22]">
                        {announcement.subject}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        {sentenceCase(announcement.status)} •{" "}
                        {announcement.delivered_count}/
                        {announcement.recipient_count} delivered
                      </p>
                      <p className="text-xs text-slate-400 mt-2">
                        {announcement.send_at
                          ? `Scheduled for ${formatDateTime(announcement.send_at)}`
                          : `Created ${formatDateTime(announcement.created_at)}`}
                      </p>
                    </div>
                    {announcement.status === "scheduled" ? (
                      <button
                        type="button"
                        onClick={(eventValue) => {
                          eventValue.stopPropagation();
                          void handleRunNow(announcement.id);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-2 bg-[#062E22] text-white rounded-xl text-xs font-semibold hover:bg-[#0a4a37]"
                      >
                        <PlayCircle className="w-4 h-4" />
                        {runningAnnouncement === announcement.id
                          ? "Running..."
                          : "Run Now"}
                      </button>
                    ) : null}
                  </div>
                  {announcement.delivery_warning ? (
                    <p className="text-xs text-amber-700 mt-3">
                      {announcement.delivery_warning}
                    </p>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-[#062E22]">
          Resolved In-App Deliveries
        </h2>
        {selectedAnnouncementId && deliveries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 mt-4">
            No recipient deliveries recorded for this announcement yet.
          </div>
        ) : (
          <div className="space-y-3 mt-5">
            {deliveries.map((delivery) => (
              <div
                key={delivery.id}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#062E22]">
                      {delivery.recipient_name ||
                        delivery.recipient_email ||
                        delivery.recipient_user_id}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      {delivery.recipient_email || "No email on record"}
                    </p>
                    <p className="text-sm text-slate-600 mt-3">
                      {delivery.body}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <p>{sentenceCase(delivery.status)}</p>
                    <p className="mt-1">
                      {formatDateTime(
                        delivery.delivered_at || delivery.created_at,
                      )}
                    </p>
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
