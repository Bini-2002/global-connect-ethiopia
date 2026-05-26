'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckSquare, PlayCircle, SquareCheckBig, UserPlus, X } from 'lucide-react';
import { useEventWorkspace } from '@/app/hooks/useEventWorkspace';
import { eventsService } from '@/app/services/eventsService';
import { EventTaskRecord, EventTeamMemberRecord } from '@/app/types/event';
import {
  EventWorkspaceShell,
  formatDateTime,
  sentenceCase,
  startOfInputDateTime,
} from '@/components/organizer/events';

export default function EventTasksPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { event, loading, error, setError } = useEventWorkspace(eventId);
  const [tasks, setTasks] = useState<EventTaskRecord[]>([]);
  const [members, setMembers] = useState<EventTeamMemberRecord[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Reject Modal State
  const [rejectingTaskId, setRejectingTaskId] = useState<string | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Quick Invite State
  const [isInviting, setIsInviting] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'Team Member' });
  const [sendingInvite, setSendingInvite] = useState(false);

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assignee_email: '',
    due_date: '',
    priority: 'medium',
    payout_amount: '',
  });

  const loadTaskWorkspace = async () => {
    try {
      setLoadingTasks(true);
      setError(null);
      const [taskResponse, memberResponse] = await Promise.all([
        eventsService.getEventTasks(eventId),
        eventsService.getTeamMembers(eventId),
      ]);
      setTasks(taskResponse);
      setMembers(memberResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    void loadTaskWorkspace();
  }, [eventId]);

  useEffect(() => {
    if (!event) return;
    setTaskForm((current) =>
      current.due_date ? current : { ...current, due_date: startOfInputDateTime(event.start_date) }
    );
  }, [event]);

  const groupedCounts = useMemo(
    () => ({
      open: tasks.filter((task) => task.status === 'open').length,
      inProgress: tasks.filter((task) => task.status === 'in_progress').length,
      pendingApproval: tasks.filter((task) => task.status === 'pending_approval').length,
      done: tasks.filter((task) => task.status === 'done').length,
    }),
    [tasks]
  );

  const handleCreateTask = async () => {
    if (!event) return;
    try {
      setCreating(true);
      setError(null);
      const created = await eventsService.createEventTask(event.id, {
        title: taskForm.title,
        description: taskForm.description || undefined,
        assignee_email: taskForm.assignee_email || undefined,
        due_date: taskForm.due_date ? new Date(taskForm.due_date).toISOString() : undefined,
        priority: taskForm.priority as 'low' | 'medium' | 'high',
        payout_amount: taskForm.payout_amount ? parseFloat(taskForm.payout_amount) : undefined,
      });
      setTasks((current) => [created, ...current]);
      setTaskForm({
        title: '',
        description: '',
        assignee_email: '',
        due_date: startOfInputDateTime(event.start_date),
        priority: 'medium',
        payout_amount: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setCreating(false);
    }
  };

  const handleRejectTask = async () => {
    if (!event || !rejectingTaskId || !rejectionNote.trim()) return;
    try {
      setRejecting(true);
      setError(null);
      const updated = await eventsService.rejectTask(event.id, rejectingTaskId, rejectionNote);
      setTasks((current) => current.map((task) => (task.id === rejectingTaskId ? updated : task)));
      setRejectingTaskId(null);
      setRejectionNote('');
      alert("Task successfully sent back to team member with correction request.");
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject task');
    } finally {
      setRejecting(false);
    }
  };

  const handleLockNegotiation = async (taskId: string) => {
    if (!event) return;
    try {
      setUpdatingId(taskId);
      setError(null);
      const updated = await eventsService.lockVendorNegotiation(event.id, taskId);
      setTasks((current) => current.map((task) => (task.id === taskId ? updated : task)));
      alert("Vendor negotiation phase has been locked. Organizer takes over contracts.");
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to lock negotiation');
    } finally {
      setUpdatingId(null);
    }
  };

  const updateStatus = async (taskId: string, status: 'in_progress' | 'done') => {
    if (!event) return;
    try {
      setUpdatingId(taskId);
      setError(null);
      const updated = await eventsService.updateEventTask(event.id, taskId, { status });
      setTasks((current) => current.map((task) => (task.id === taskId ? updated : task)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleApproveAndPay = async (taskId: string) => {
    if (!event) return;
    try {
      setUpdatingId(taskId);
      setError(null);
      // Always fetch the latest task state first to avoid stale-state errors
      const freshTasks = await eventsService.getEventTasks(event.id);
      setTasks(freshTasks);
      const freshTask = freshTasks.find(t => t.id === taskId);
      if (!freshTask) {
        setError('Task not found after refresh.');
        return;
      }
      if (freshTask.status !== 'pending_approval') {
        setError(`Cannot approve: task status is currently "${freshTask.status.replace('_', ' ')}". The team member must first click "Submit for Approval".`);
        return;
      }
      const updated = await eventsService.approveAndPayTask(event.id, taskId);
      setTasks((current) => current.map((task) => (task.id === taskId ? updated : task)));
    } catch (err) {
      // Extract the real error detail from the API response
      if (err instanceof Error) {
        setError(err.message);
      } else if (typeof err === 'object' && err !== null && 'detail' in err) {
        setError(String((err as { detail: string }).detail));
      } else {
        setError('Failed to approve and pay task');
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const handleQuickInvite = async () => {
    if (!inviteForm.email) return;
    try {
      setSendingInvite(true);
      setError(null);
      await eventsService.createTeamInvitation(eventId, {
        email: inviteForm.email,
        assigned_role: inviteForm.role,
      });
      // Refresh members to update the datalist
      const memberResponse = await eventsService.getTeamMembers(eventId);
      setMembers(memberResponse);
      // Auto-select the newly invited email
      setTaskForm(prev => ({ ...prev, assignee_email: inviteForm.email }));
      setIsInviting(false);
      setInviteForm({ email: '', role: 'Team Member' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setSendingInvite(false);
    }
  };

  return (
    <EventWorkspaceShell
      event={event}
      loading={loading}
      error={error}
      activeTab="tasks"
      aside={
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-[#062E22]">Task Snapshot</h2>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Open</p>
                <p className="text-xl font-bold text-[#062E22] mt-2">{groupedCounts.open}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Working</p>
                <p className="text-xl font-bold text-[#062E22] mt-2">{groupedCounts.inProgress}</p>
              </div>
              <div className="rounded-xl bg-purple-50 p-4">
                <p className="text-xs uppercase tracking-wide text-purple-400">Awaiting Approval</p>
                <p className="text-xl font-bold text-purple-700 mt-2">{groupedCounts.pendingApproval}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-4">
                <p className="text-xs uppercase tracking-wide text-emerald-500">Done</p>
                <p className="text-xl font-bold text-emerald-700 mt-2">{groupedCounts.done}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-[#062E22]">Available Assignees</h2>
            <div className="space-y-3 mt-4 text-sm text-slate-600">
              {members.length === 0 ? <p>No team members yet. You can still assign by email.</p> : null}
              {members.slice(0, 5).map((member) => (
                <div key={member.id} className="rounded-xl bg-slate-50 p-3">
                  <p className="font-semibold text-[#062E22]">{member.full_name || member.email}</p>
                  <p className="text-slate-500 mt-1">{member.assigned_role}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      }
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#062E22]/10 text-[#062E22] flex items-center justify-center">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#062E22]">Create Task</h2>
              <p className="text-sm text-slate-500">Assign the next piece of work for this event.</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <div>
            <label className="text-sm font-medium text-slate-700">Task Title</label>
            <input
              value={taskForm.title}
              onChange={(eventValue) =>
                setTaskForm((current) => ({ ...current, title: eventValue.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="e.g. Venue Setup"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Assignee Email</label>
              <button
                onClick={() => setIsInviting(!isInviting)}
                className="text-xs font-semibold text-[#062E22] hover:underline flex items-center gap-1"
              >
                {isInviting ? <X className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
                {isInviting ? 'Cancel' : 'Quick Invite'}
              </button>
            </div>
            {isInviting ? (
              <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-[#062E22]/20 animate-in fade-in slide-in-from-top-1">
                <p className="text-[10px] font-bold text-[#062E22] uppercase tracking-wider mb-2">New Team Invitation</p>
                <div className="space-y-2">
                  <input
                    type="email"
                    placeholder="Email address"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Role (e.g. Catering Lead)"
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                  />
                  <button
                    onClick={() => void handleQuickInvite()}
                    disabled={sendingInvite || !inviteForm.email}
                    className="w-full py-1.5 bg-[#062E22] text-white rounded-lg text-xs font-semibold hover:bg-[#0a4a37] transition disabled:opacity-50"
                  >
                    {sendingInvite ? 'Sending...' : 'Send Invite & Select'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <input
                  list="event-team-emails"
                  value={taskForm.assignee_email}
                  onChange={(eventValue) =>
                    setTaskForm((current) => ({ ...current, assignee_email: eventValue.target.value }))
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Select or type email"
                />
                <datalist id="event-team-emails">
                  {members.map((member) => (
                    <option key={member.id} value={member.email} />
                  ))}
                </datalist>
              </>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Due Date</label>
            <input
              type="datetime-local"
              value={taskForm.due_date}
              onChange={(eventValue) =>
                setTaskForm((current) => ({ ...current, due_date: eventValue.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Priority</label>
            <select
              value={taskForm.priority}
              onChange={(eventValue) =>
                setTaskForm((current) => ({ ...current, priority: eventValue.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Payout Amount (ETB)</label>
            <input
              type="number"
              min="0"
              placeholder="0.00"
              value={taskForm.payout_amount}
              onChange={(e) => setTaskForm(prev => ({ ...prev, payout_amount: e.target.value }))}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Description</label>
            <textarea
              rows={3}
              value={taskForm.description}
              onChange={(eventValue) =>
                setTaskForm((current) => ({ ...current, description: eventValue.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Provide details about the task..."
            />
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={() => void handleCreateTask()}
            disabled={creating}
            className="px-4 py-2 bg-[#062E22] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a37] transition disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-[#062E22]">Task Board</h2>
        {loadingTasks ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500 mt-4">
            No tasks yet.
          </div>
        ) : (
          <div className="space-y-4 mt-5">
            {tasks.map((task) => (
              <div key={task.id} className={`rounded-2xl border p-5 transition-all ${task.status === 'pending_approval' ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'}`}>
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-base font-semibold text-[#062E22]">{task.title}</h3>
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${task.priority === 'high' ? 'bg-red-100 text-red-700' : task.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                        {sentenceCase(task.priority)}
                      </span>
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${task.status === 'done' ? 'bg-emerald-100 text-emerald-700' :
                          task.status === 'pending_approval' ? 'bg-amber-100 text-amber-700' :
                            task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                              'bg-slate-100 text-slate-700'
                        }`}>
                        {task.status === 'pending_approval' ? '⏳ Pending Approval' : sentenceCase(task.status)}
                      </span>
                      {task.workspace_open && (
                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 items-center gap-1.5 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Workspace Active
                        </span>
                      )}
                      {task.escrow_locked && (
                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-[#062E22] border border-[#8CB988]/20 items-center gap-1">
                          🔒 Escrow Locked
                        </span>
                      )}
                      {task.negotiation_phase_locked && (
                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          🚫 Negotiation Locked
                        </span>
                      )}
                    </div>
                    {task.description ? <p className="text-sm text-slate-600 mt-3">{task.description}</p> : null}
                    {task.rejection_note && task.status === 'in_progress' && (
                      <div className="mt-3 p-3 bg-red-50 border-l-4 border-red-500 rounded-r-xl">
                        <p className="text-xs font-bold text-red-800 uppercase tracking-wider">Changes Requested:</p>
                        <p className="text-xs text-red-700 mt-1">{task.rejection_note}</p>
                      </div>
                    )}
                    <p className="text-sm text-slate-500 mt-3">
                      Assigned to {task.assignee_email || 'Unassigned'} {task.due_date ? `• Due ${formatDateTime(task.due_date)}` : ''}
                      {task.payout_amount ? ` • Payout: ETB ${task.payout_amount.toLocaleString()}` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 items-center">
                    {/* Move to contract stage/Lock negotiation — only for tasks in progress without lock */}
                    {task.status === 'in_progress' && !task.negotiation_phase_locked && (
                      <button
                        onClick={() => void handleLockNegotiation(task.id)}
                        disabled={updatingId === task.id}
                        className="inline-flex items-center gap-1.5 px-3 py-2 border border-amber-300 bg-amber-50 text-amber-700 rounded-xl text-xs font-semibold hover:bg-amber-100 transition disabled:opacity-50"
                      >
                        Lock Negotiation
                      </button>
                    )}

                    {/* Start button — only for open tasks */}
                    {task.status === 'open' ? (
                      <button
                        onClick={() => void updateStatus(task.id, 'in_progress')}
                        disabled={updatingId === task.id}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
                      >
                        <PlayCircle className="w-4 h-4" />
                        {updatingId === task.id ? 'Saving...' : 'Start'}
                      </button>
                    ) : null}

                    {/* Approve & Pay — only when team member has submitted for approval AND task has a payout */}
                    {task.status === 'pending_approval' && (task.payout_amount ?? 0) > 0 ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => void handleApproveAndPay(task.id)}
                          disabled={updatingId === task.id}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-[#062E22] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a37] transition disabled:opacity-50 shadow-md animate-bounce"
                        >
                          <SquareCheckBig className="w-4 h-4" />
                          {updatingId === task.id ? 'Processing...' : 'Approve & Pay'}
                        </button>
                        <button
                          onClick={() => setRejectingTaskId(task.id)}
                          disabled={updatingId === task.id}
                          className="inline-flex items-center gap-2 px-4 py-2 border border-red-200 bg-red-50 text-red-700 rounded-xl text-sm font-semibold hover:bg-red-100 transition disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    ) : null}

                    {/* Approve without pay — pending_approval but no payout set */}
                    {task.status === 'pending_approval' && (task.payout_amount ?? 0) === 0 ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => void updateStatus(task.id, 'done')}
                          disabled={updatingId === task.id}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-semibold hover:bg-emerald-600 transition disabled:opacity-50 shadow-md"
                        >
                          <SquareCheckBig className="w-4 h-4" />
                          {updatingId === task.id ? 'Approving...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => setRejectingTaskId(task.id)}
                          disabled={updatingId === task.id}
                          className="inline-flex items-center gap-2 px-4 py-2 border border-red-200 bg-red-50 text-red-700 rounded-xl text-sm font-semibold hover:bg-red-100 transition disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    ) : null}

                    {/* Completed badge */}
                    {task.status === 'done' ? (
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-semibold border border-emerald-100">
                        <SquareCheckBig className="w-4 h-4" />
                        Paid & Done
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectingTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md border border-slate-100 shadow-2xl">
            <h3 className="text-lg font-black text-[#062E22] uppercase tracking-wider mb-2">
              Reject Task Submission
            </h3>
            <p className="text-xs text-slate-500 font-medium mb-4">
              Please specify the required changes or correction instructions. The team member will keep workspace access to edit.
            </p>
            <textarea
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              placeholder="e.g. Please negotiate a lower rate for catering, or add more VIP room options..."
              rows={4}
              className="w-full p-4 border border-slate-200 rounded-2xl text-sm outline-none focus:border-[#062E22] transition-colors resize-none mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setRejectingTaskId(null);
                  setRejectionNote('');
                }}
                disabled={rejecting}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleRejectTask()}
                disabled={rejecting || !rejectionNote.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {rejecting ? "Rejecting..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </EventWorkspaceShell>
  );
}
