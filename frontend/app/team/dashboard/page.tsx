'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CheckSquare,
  Clock,
  Wallet,
  TrendingUp,
  ArrowRight,
  Loader2,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Timer,
  Banknote,
} from 'lucide-react';
import { api } from '@/app/lib/api';
import { logout } from '@/app/lib/auth';
import NotificationBell from '@/components/NotificationBell';

interface Task {
  id: string;
  event_id: string;
  event_title?: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  priority: string;
  status: string;
  payout_amount?: number | null;
  updated_at?: string | null;
}

interface DashboardData {
  user: { id: string; full_name?: string; role: string };
  wallet: { balance: number; pending_withdrawal_balance: number };
  summary: { open_tasks: number; pending_approval: number; completed_tasks: number; total_earned: number };
  tasks: Task[];
  recent_transactions: Array<{
    id: string;
    type?: string;
    amount: number;
    reference_type?: string;
    payment_method?: string;
    created_at?: string;
  }>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  open: { label: 'Open', color: 'bg-sky-100 text-sky-700', icon: <Clock className="w-3.5 h-3.5" /> },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700', icon: <Timer className="w-3.5 h-3.5" /> },
  pending_approval: { label: 'Awaiting Approval', color: 'bg-purple-100 text-purple-700', icon: <AlertCircle className="w-3.5 h-3.5" /> },
  done: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-500', icon: null },
};

const PRIORITY_COLOR: Record<string, string> = {
  high: 'border-l-red-500',
  medium: 'border-l-amber-400',
  low: 'border-l-slate-300',
};

function timeAgo(str?: string | null) {
  if (!str) return '';
  const diff = Date.now() - new Date(str).getTime();
  const hrs = Math.floor(diff / 3_600_000);
  if (hrs < 1) return 'just now';
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function TeamDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const result = await api.get<DashboardData>('/team/dashboard');
      setData(result);
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'Not authenticated') {
        router.push('/login');
      } else if (e instanceof Error && e.message.includes('403')) {
        router.push('/login');
      } else {
        setError(e instanceof Error ? e.message : 'Failed to load dashboard');
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const handleSubmit = async (task: Task) => {
    setSubmitting(task.id);
    try {
      await api.post(`/events/${task.event_id}/tasks/${task.id}/submit`);
      await loadDashboard();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to submit task');
    } finally {
      setSubmitting(null);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-12 w-12 rounded-full border-4 border-[#062E22] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="rounded-2xl bg-red-50 border border-red-200 p-8 text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-red-700 font-medium">{error}</p>
          <button onClick={() => void loadDashboard()} className="mt-4 px-4 py-2 bg-[#062E22] text-white text-sm rounded-lg">Retry</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { user, wallet, summary, tasks, recent_transactions } = data;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Nav */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#062E22] flex items-center justify-center">
            <CheckSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#062E22]">Team Hub</p>
            <p className="text-[11px] text-slate-400">Global Connect Ethiopia</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <div className="w-9 h-9 rounded-full bg-[#062E22] flex items-center justify-center">
            <span className="text-white text-sm font-bold">
              {(user.full_name || 'T').charAt(0).toUpperCase()}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-slate-100 transition text-slate-500"
            title="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="pt-16 p-6 max-w-5xl mx-auto space-y-6">
        {/* Welcome */}
        <div className="pt-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0a4a37]">Welcome back</p>
          <h1 className="mt-1 text-3xl font-bold text-[#062E22]">{user.full_name || 'Team Member'}</h1>
          <p className="mt-1 text-sm text-slate-500">Here's your task overview and wallet status.</p>
        </div>

        {/* KPI Strip */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Wallet Balance', value: `ETB ${wallet.balance.toLocaleString('en-ET', { maximumFractionDigits: 2 })}`, icon: <Wallet className="w-5 h-5" />, accent: true },
            { label: 'Open Tasks', value: summary.open_tasks.toString(), icon: <Clock className="w-5 h-5 text-[#062E22]" /> },
            { label: 'Awaiting Approval', value: summary.pending_approval.toString(), icon: <AlertCircle className="w-5 h-5 text-purple-600" /> },
            { label: 'Total Earned', value: `ETB ${summary.total_earned.toLocaleString('en-ET', { maximumFractionDigits: 2 })}`, icon: <TrendingUp className="w-5 h-5 text-emerald-600" /> },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className={`rounded-[24px] p-5 flex flex-col gap-3 ${kpi.accent ? 'bg-[#062E22] text-white' : 'bg-white border border-slate-200 shadow-sm'}`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${kpi.accent ? 'bg-white/15' : 'bg-slate-50'}`}>
                {kpi.icon}
              </div>
              <div>
                <p className={`text-[11px] uppercase tracking-wide ${kpi.accent ? 'text-white/60' : 'text-slate-400'}`}>{kpi.label}</p>
                <p className={`mt-1 text-xl font-bold ${kpi.accent ? 'text-white' : 'text-[#062E22]'}`}>{kpi.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Task List */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-lg font-bold text-[#062E22]">My Tasks</h2>
            {tasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
                <CheckSquare className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No tasks assigned to you yet.</p>
              </div>
            ) : (
              tasks.map((task) => {
                const cfg = STATUS_CONFIG[task.status] ?? { label: task.status, color: 'bg-slate-100 text-slate-500', icon: null };
                const canSubmit = task.status === 'open' || task.status === 'in_progress';
                return (
                  <div
                    key={task.id}
                    className={`bg-white rounded-2xl border-l-4 border border-slate-200 p-5 shadow-sm hover:shadow-md transition ${PRIORITY_COLOR[task.priority] ?? 'border-l-slate-300'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#062E22] truncate">{task.title}</p>
                        {task.event_title && (
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-slate-400">{task.event_title}</p>
                            <span className="text-slate-300">•</span>
                            <Link
                              href={`/organizer/events/${task.event_id}`}
                              className="text-[11px] text-[#062E22] hover:underline font-bold"
                            >
                              Open Workspace
                            </Link>
                          </div>
                        )}
                        {task.description && (
                          <p className="text-sm text-slate-500 mt-2 line-clamp-2">{task.description}</p>
                        )}
                      </div>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${cfg.color}`}>
                        {cfg.icon}{cfg.label}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {task.payout_amount && task.payout_amount > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-full px-2.5 py-1">
                            <Banknote className="w-3.5 h-3.5" />
                            ETB {task.payout_amount.toLocaleString()}
                          </span>
                        )}
                        {task.due_date && (
                          <span className="text-xs text-slate-400">Due: {new Date(task.due_date).toLocaleDateString()}</span>
                        )}
                      </div>
                      {canSubmit && (
                        <button
                          onClick={() => void handleSubmit(task)}
                          disabled={submitting === task.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#062E22] text-white text-xs font-bold rounded-lg hover:bg-[#0a4a37] transition disabled:opacity-60"
                        >
                          {submitting === task.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <ArrowRight className="w-3.5 h-3.5" />
                          )}
                          Submit for Approval
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right column: wallet + transactions */}
          <div className="space-y-4">
            {/* Wallet card */}
            <div className="rounded-[24px] bg-[#062E22] text-white p-6 shadow-lg">
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">Wallet</p>
              <p className="mt-3 text-3xl font-bold">ETB {wallet.balance.toLocaleString('en-ET', { maximumFractionDigits: 2 })}</p>
              <p className="mt-1 text-sm text-white/50">Available balance</p>
              {wallet.pending_withdrawal_balance > 0 && (
                <p className="mt-2 text-sm text-white/60">
                  ETB {wallet.pending_withdrawal_balance.toLocaleString('en-ET', { maximumFractionDigits: 2 })} pending
                </p>
              )}
            </div>

            {/* Recent transactions */}
            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-bold text-[#062E22] mb-4">Recent Transactions</h3>
              {recent_transactions.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No transactions yet.</p>
              ) : (
                <div className="space-y-3">
                  {recent_transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-700 capitalize">
                          {tx.reference_type?.replace(/_/g, ' ') || tx.type || 'Transaction'}
                        </p>
                        <p className="text-xs text-slate-400">{timeAgo(tx.created_at)}</p>
                      </div>
                      <p className={`text-sm font-bold ${tx.type === 'deposit' ? 'text-emerald-600' : 'text-slate-700'}`}>
                        {tx.type === 'deposit' ? '+' : '-'}ETB {tx.amount.toLocaleString('en-ET', { maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
