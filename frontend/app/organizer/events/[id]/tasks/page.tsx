'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckSquare, PlayCircle, SquareCheckBig } from 'lucide-react';
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
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assignee_email: '',
    due_date: '',
    priority: 'medium',
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
      });
      setTasks((current) => [created, ...current]);
      setTaskForm({
        title: '',
        description: '',
        assignee_email: '',
        due_date: startOfInputDateTime(event.start_date),
        priority: 'medium',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setCreating(false);
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
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Open</p>
                <p className="text-xl font-bold text-[#062E22] mt-2">{groupedCounts.open}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Working</p>
                <p className="text-xl font-bold text-[#062E22] mt-2">{groupedCounts.inProgress}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Done</p>
                <p className="text-xl font-bold text-[#062E22] mt-2">{groupedCounts.done}</p>
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
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#062E22]/10 text-[#062E22] flex items-center justify-center">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#062E22]">Create Task</h2>
            <p className="text-sm text-slate-500">Assign the next piece of work for this event.</p>
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
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Assignee Email</label>
            <input
              list="event-team-emails"
              value={taskForm.assignee_email}
              onChange={(eventValue) =>
                setTaskForm((current) => ({ ...current, assignee_email: eventValue.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <datalist id="event-team-emails">
              {members.map((member) => (
                <option key={member.id} value={member.email} />
              ))}
            </datalist>
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
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Description</label>
            <textarea
              rows={3}
              value={taskForm.description}
              onChange={(eventValue) =>
                setTaskForm((current) => ({ ...current, description: eventValue.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
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
              <div key={task.id} className="rounded-2xl border border-slate-200 p-5">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-base font-semibold text-[#062E22]">{task.title}</h3>
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${task.priority === 'high' ? 'bg-red-100 text-red-700' : task.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                        {sentenceCase(task.priority)}
                      </span>
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${task.status === 'done' ? 'bg-emerald-100 text-emerald-700' : task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                        {sentenceCase(task.status)}
                      </span>
                    </div>
                    {task.description ? <p className="text-sm text-slate-600 mt-3">{task.description}</p> : null}
                    <p className="text-sm text-slate-500 mt-3">
                      Assigned to {task.assignee_email || 'Unassigned'} {task.due_date ? `• Due ${formatDateTime(task.due_date)}` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {task.status !== 'in_progress' && task.status !== 'done' ? (
                      <button
                        onClick={() => void updateStatus(task.id, 'in_progress')}
                        disabled={updatingId === task.id}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
                      >
                        <PlayCircle className="w-4 h-4" />
                        {updatingId === task.id ? 'Saving...' : 'Start'}
                      </button>
                    ) : null}
                    {task.status !== 'done' ? (
                      <button
                        onClick={() => void updateStatus(task.id, 'done')}
                        disabled={updatingId === task.id}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#062E22] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a37] transition disabled:opacity-50"
                      >
                        <SquareCheckBig className="w-4 h-4" />
                        {updatingId === task.id ? 'Saving...' : 'Mark Done'}
                      </button>
                    ) : null}
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
