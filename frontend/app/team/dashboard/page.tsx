'use client';

import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  ListTodo,
  LogOut,
  Wallet,
  ArrowUpRight,
  History,
  TrendingUp,
  LayoutDashboard
} from 'lucide-react';
import { eventsService } from '@/app/services/eventsService';
import { EventTaskRecord } from '@/app/types/event';
import { logout } from '@/app/lib/auth';
import { useRouter } from 'next/navigation';
import { useWallet, useWalletTransactions } from '@/app/hooks/useMarketplace';
import marketplaceService from '@/app/services/marketplaceService';

export default function TeamDashboardPage() {
  const [tasks, setTasks] = useState<EventTaskRecord[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const router = useRouter();

  const { data: wallet, loading: loadingWallet, refresh: refreshWallet } = useWallet();
  const { data: transactions, loading: loadingTx, refresh: refreshTx } = useWalletTransactions();

  useEffect(() => {
    const loadTasks = async () => {
      try {
        setLoadingTasks(true);
        const data = await eventsService.getMyTasks();
        setTasks(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tasks');
      } finally {
        setLoadingTasks(false);
      }
    };
    void loadTasks();
  }, []);

  const handleWithdraw = async () => {
    const available = wallet?.balance || wallet?.available_balance || 0;
    if (available <= 0) {
      alert('Insufficient funds to withdraw.');
      return;
    }
    try {
      setIsWithdrawing(true);
      // Simulating Chapa API call for MVP by directly hitting our withdraw endpoint
      await marketplaceService.withdrawFromWallet({ amount: available });
      await refreshWallet();
      await refreshTx();
      alert('Withdrawal successful! Funds have been sent to your registered Chapa account.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to process withdrawal';
      alert(msg);
    } finally {
      setIsWithdrawing(false);
    }
  };

  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleUpdateStatus = async (task: EventTaskRecord, status: 'in_progress' | 'pending_approval') => {
    try {
      setUpdatingId(task.id);
      const updated = await eventsService.updateEventTask(task.event_id, task.id, { status });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update task status';
      alert(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  const formatCurrency = (amount: number = 0) => {
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loadingTasks || loadingWallet || loadingTx) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[#062E22] font-semibold animate-pulse">Loading Workspace...</p>
      </div>
    );
  }

  const stats = {
    pending: tasks.filter(t => t.status === 'open' || t.status === 'pending_approval').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    done: tasks.filter(t => t.status === 'done').length,
    totalEarned: transactions
      .filter(tx => tx.transaction_type === 'TASK_PAYOUT' || tx.type === 'TASK_PAYOUT')
      .reduce((sum, tx) => sum + tx.amount, 0)
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Premium Header */}
      <header className="bg-[#062E22] text-white py-8 px-4 sm:px-8 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/10">
              <LayoutDashboard className="w-6 h-6 text-[#8CB988]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Team Portal</h1>
              <p className="text-[#8CB988] text-sm font-medium">Global Connect Ethiopia • Workforce</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end mr-4">
              <p className="text-xs text-white/50 uppercase tracking-widest font-bold">Wallet Balance</p>
              <p className="text-lg font-bold text-[#8CB988]">{formatCurrency(wallet?.balance || wallet?.available_balance)}</p>
            </div>
            <button
              onClick={() => { logout(); router.push('/login'); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-2xl transition-all duration-300 text-sm font-bold border border-white/10 backdrop-blur-md"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-10 px-4 sm:px-8">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Left Column: Stats & Wallet */}
          <div className="lg:col-span-4 space-y-8">

            {/* Wallet Card */}
            <div className="bg-[#062E22] rounded-[2.5rem] p-8 shadow-2xl shadow-emerald-900/20 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700" />

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/60 uppercase tracking-widest font-bold">Available Funds</p>
                    <h2 className="text-3xl font-black mt-1 tracking-tight">{formatCurrency(wallet?.balance || wallet?.available_balance)}</h2>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center py-3 border-b border-white/10">
                    <span className="text-sm text-white/60">Total Earned</span>
                    <span className="font-bold text-[#8CB988] flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      {formatCurrency(stats.totalEarned)}
                    </span>
                  </div>
                </div>

                <button
                  className="w-full py-4 bg-[#8CB988] hover:bg-[#7aa976] text-[#062E22] rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-300 shadow-xl shadow-emerald-950/40 flex items-center justify-center gap-2 group/btn disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleWithdraw}
                  disabled={isWithdrawing || (wallet?.balance || wallet?.available_balance || 0) <= 0}
                >
                  {isWithdrawing ? 'Processing...' : 'Withdraw Funds'}
                  <ArrowUpRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1" />
                </button>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-2">Pending</p>
                <p className="text-3xl font-black text-slate-800">{stats.pending}</p>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-2">Active</p>
                <p className="text-3xl font-black text-blue-600">{stats.inProgress}</p>
              </div>
            </div>

            {/* Recent Payouts */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                <h3 className="font-black text-[#062E22] text-sm uppercase tracking-widest flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Recent Payouts
                </h3>
              </div>
              <div className="divide-y divide-slate-50">
                {loadingTx ? (
                  <div className="p-8 text-center animate-pulse">
                    <div className="w-8 h-8 bg-slate-100 rounded-full mx-auto mb-2" />
                    <div className="h-4 bg-slate-100 rounded w-1/2 mx-auto" />
                  </div>
                ) : transactions.filter(t => t.transaction_type === 'TASK_PAYOUT' || t.type === 'TASK_PAYOUT').length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 font-medium">
                    No task payouts yet
                  </div>
                ) : (
                  transactions.filter(t => t.transaction_type === 'TASK_PAYOUT' || t.type === 'TASK_PAYOUT').slice(0, 5).map((tx, idx) => (
                    <div key={idx} className="p-4 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-bold text-slate-800">Task Completion</p>
                        <p className="text-[10px] text-slate-400">{new Date(tx.created_at).toLocaleDateString()}</p>
                      </div>
                      <span className="text-sm font-black text-emerald-600">+{formatCurrency(tx.amount)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Right Column: Tasks */}
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden min-h-[600px]">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#062E22] text-white flex items-center justify-center">
                    <ListTodo className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-[#062E22]">Active Assignments</h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Tasks currently assigned to you</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="px-4 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 shadow-sm">
                    {tasks.length} Total
                  </div>
                </div>
              </div>

              <div className="p-4">
                {loadingTasks ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-12 h-12 border-4 border-[#062E22] border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-slate-500 font-bold text-sm tracking-widest uppercase">Syncing your tasks...</p>
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-32 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6">
                      <ListTodo className="w-10 h-10 text-slate-200" />
                    </div>
                    <h3 className="text-lg font-black text-slate-800 mb-2">No Active Tasks</h3>
                    <p className="text-slate-400 text-sm max-w-xs mx-auto font-medium">When organizers assign you tasks, they'll appear here automatically.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {tasks.map((task) => (
                      <div key={task.id} className="group p-6 bg-white hover:bg-slate-50 border border-slate-100 rounded-[2rem] transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-3 mb-3">
                              <h3 className="text-lg font-black text-[#062E22] group-hover:text-black transition-colors">{task.title}</h3>
                              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${task.priority === 'high' ? 'bg-red-50 text-red-600 border border-red-100' :
                                  task.priority === 'medium' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                    'bg-slate-50 text-slate-500 border border-slate-100'
                                }`}>
                                {task.priority} Priority
                              </span>
                              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${task.status === 'done' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                  task.status === 'pending_approval' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                    task.status === 'in_progress' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                      'bg-slate-50 text-slate-500 border border-slate-100'
                                }`}>
                                {task.status === 'pending_approval' ? 'Pending Approval' : task.status.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-sm text-slate-500 font-medium leading-relaxed mb-4">{task.description || 'No specialized instructions provided for this assignment.'}</p>

                            <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold text-slate-400">
                              {task.due_date && (
                                <div className="flex items-center gap-1.5 py-1 px-3 bg-slate-100/50 rounded-lg">
                                  <Clock className="w-3.5 h-3.5" />
                                  DUE: {new Date(task.due_date).toLocaleDateString()}
                                </div>
                              )}
                              {task.payout_amount && (
                                <div className="flex items-center gap-1.5 py-1 px-3 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                                  <TrendingUp className="w-3.5 h-3.5" />
                                  PAYOUT: {formatCurrency(task.payout_amount)}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 pt-2">
                            {task.status === 'open' && (
                              <button
                                onClick={() => void handleUpdateStatus(task, 'in_progress')}
                                disabled={updatingId === task.id}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-lg shadow-blue-200"
                              >
                                {updatingId === task.id ? 'Starting...' : 'Start Work'}
                              </button>
                            )}
                            {task.status === 'in_progress' && (
                              <button
                                onClick={() => void handleUpdateStatus(task, 'pending_approval')}
                                disabled={updatingId === task.id}
                                className="px-6 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-lg shadow-amber-200"
                              >
                                {updatingId === task.id ? 'Submitting...' : 'Submit for Approval'}
                              </button>
                            )}
                            {task.status === 'pending_approval' && (
                              <div className="flex items-center gap-2 px-6 py-3 bg-amber-50 text-amber-600 rounded-2xl text-xs font-black uppercase tracking-widest border border-amber-100">
                                <Clock className="w-4 h-4" />
                                Awaiting Organizer Approval
                              </div>
                            )}
                            {task.status === 'done' && (
                              <div className="flex items-center gap-2 px-6 py-3 bg-emerald-50 text-emerald-600 rounded-2xl text-xs font-black uppercase tracking-widest border border-emerald-100">
                                <CheckCircle2 className="w-4 h-4" />
                                Paid & Completed
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
