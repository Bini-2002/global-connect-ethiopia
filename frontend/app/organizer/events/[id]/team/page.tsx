'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { MailPlus, Users } from 'lucide-react';
import { useEventWorkspace } from '@/app/hooks/useEventWorkspace';
import { eventsService } from '@/app/services/eventsService';
import { EventTeamInvitationRecord, EventTeamMemberRecord } from '@/app/types/event';
import { EventWorkspaceShell, formatDateTime, sentenceCase } from '@/components/organizer/events';

export default function EventTeamPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { event, loading, error, setError } = useEventWorkspace(eventId);
  const [invitations, setInvitations] = useState<EventTeamInvitationRecord[]>([]);
  const [members, setMembers] = useState<EventTeamMemberRecord[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    assigned_role: 'Operations Lead',
    display_name: '',
  });

  const loadTeam = async () => {
    try {
      setLoadingTeam(true);
      setError(null);
      const [invitationResponse, memberResponse] = await Promise.all([
        eventsService.getTeamInvitations(eventId),
        eventsService.getTeamMembers(eventId),
      ]);
      setInvitations(invitationResponse);
      setMembers(memberResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team workspace');
    } finally {
      setLoadingTeam(false);
    }
  };

  useEffect(() => {
    void loadTeam();
  }, [eventId]);

  const invitationCount = useMemo(
    () => invitations.filter((invitation) => invitation.status !== 'accepted').length,
    [invitations]
  );

  const handleInvite = async () => {
    if (!event) return;
    try {
      setInviting(true);
      setError(null);
      const created = await eventsService.createTeamInvitation(event.id, {
        email: inviteForm.email,
        assigned_role: inviteForm.assigned_role,
        display_name: inviteForm.display_name || undefined,
      });
      setInvitations((current) => [created, ...current]);
      setInviteForm({ email: '', assigned_role: 'Operations Lead', display_name: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  return (
    <EventWorkspaceShell
      event={event}
      loading={loading}
      error={error}
      activeTab="team"
      aside={
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-[#062E22]">Team Snapshot</h2>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Members</p>
                <p className="text-xl font-bold text-[#062E22] mt-2">{members.length}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Open Invites</p>
                <p className="text-xl font-bold text-[#062E22] mt-2">{invitationCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-[#062E22]">Demo Tip</h2>
            <p className="text-sm text-slate-600 mt-4">
              Invite roles like catering lead, registration desk, and stage manager so the team flow feels concrete during the presentation.
            </p>
          </div>
        </div>
      }
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#062E22]/10 text-[#062E22] flex items-center justify-center">
            <MailPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#062E22]">Invite Team Member</h2>
            <p className="text-sm text-slate-500">Send role-based invitations from inside the event workspace.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mt-6">
          <div>
            <label className="text-sm font-medium text-slate-700">Full Name</label>
            <input
              value={inviteForm.display_name}
              onChange={(eventValue) =>
                setInviteForm((current) => ({ ...current, display_name: eventValue.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={inviteForm.email}
              onChange={(eventValue) =>
                setInviteForm((current) => ({ ...current, email: eventValue.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Assigned Role</label>
            <input
              value={inviteForm.assigned_role}
              onChange={(eventValue) =>
                setInviteForm((current) => ({ ...current, assigned_role: eventValue.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={() => void handleInvite()}
            disabled={inviting}
            className="px-4 py-2 bg-[#062E22] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a37] transition disabled:opacity-50"
          >
            {inviting ? 'Sending...' : 'Send Invitation'}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-[#062E22]">Active Team Members</h2>
          {loadingTeam ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : members.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 mt-4">
              No team members have joined yet.
            </div>
          ) : (
            <div className="space-y-4 mt-5">
              {members.map((member) => (
                <div key={member.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#062E22]">{member.full_name || member.email}</p>
                      <p className="text-sm text-slate-500 mt-1">{member.email}</p>
                      <p className="text-sm text-slate-500 mt-1">{member.assigned_role}</p>
                    </div>
                    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                      {sentenceCase(member.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-[#062E22]">Invitation Log</h2>
          {loadingTeam ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : invitations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 mt-4">
              No invitations have been sent yet.
            </div>
          ) : (
            <div className="space-y-4 mt-5">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#062E22]">{invitation.display_name || invitation.email}</p>
                      <p className="text-sm text-slate-500 mt-1">{invitation.assigned_role}</p>
                      <p className="text-sm text-slate-500 mt-1">{formatDateTime(invitation.created_at)}</p>
                    </div>
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${invitation.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {sentenceCase(invitation.status)}
                    </span>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 mt-3">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Invite Token</p>
                    <p className="text-sm font-mono text-slate-600 mt-1 break-all">{invitation.token}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </EventWorkspaceShell>
  );
}
