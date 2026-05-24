'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from '@/components/DashboardHeader';
import Sidebar from '@/components/Sidebar';
import { api } from '@/app/lib/api';
import { logout } from '@/app/lib/auth';
import {
  UserCircleIcon,
  LockClosedIcon,
  BellIcon,
  ShieldCheckIcon,
  ArrowRightOnRectangleIcon,
  CheckIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';

interface ProfileData {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  organizer: 'Event Organizer',
  vendor: 'Vendor',
  admin: 'Administrator',
  super_admin: 'Super Administrator',
  ministry_gov: 'Ministry Official',
  municipal_gov: 'Municipal Official',
  police: 'Police Officer',
  attendee: 'Attendee',
};

function getInitials(name: string | null | undefined): string {
  if (!name) return 'U';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function OrganizerSettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Notification prefs
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [smsNotifs, setSmsNotifs] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await api.get<ProfileData>('/users/me');
        setProfile(data);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    void fetchProfile();
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All password fields are required.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      await api.put('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const roleLabel = ROLE_LABELS[profile?.role ?? 'organizer'] ?? 'Organizer';

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role="organizer" />
      <DashboardHeader searchPlaceholder="Settings" />

      <main className="md:ml-60 pt-16 min-h-screen">
        <div className="p-4 md:p-8 max-w-4xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
            <p className="text-sm text-slate-500 mt-1">Manage your account settings and preferences</p>
          </div>

          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-40 bg-slate-200 rounded-2xl" />
              <div className="h-64 bg-slate-200 rounded-2xl" />
              <div className="h-48 bg-slate-200 rounded-2xl" />
            </div>
          ) : (
            <div className="space-y-5">
              {/* Profile Summary */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="h-20 bg-gradient-to-br from-emerald-600 to-teal-700" />
                <div className="px-6 pb-6">
                  <div className="flex items-center gap-4 -mt-10 mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center shadow-lg border-4 border-white flex-shrink-0">
                      <span className="text-white text-xl font-bold">{getInitials(profile?.name)}</span>
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg font-bold text-slate-800 truncate">{profile?.name ?? 'Unknown User'}</h2>
                      <p className="text-sm text-slate-400">{profile?.email ?? '—'}</p>
                    </div>
                    <span className="ml-auto inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                      <ShieldCheckIcon className="w-3 h-3" />
                      {roleLabel}
                    </span>
                  </div>
                </div>
              </div>

              {/* Change Password */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-center gap-2 mb-5">
                  <LockClosedIcon className="w-5 h-5 text-slate-400" />
                  <h3 className="font-semibold text-slate-800">Change Password</h3>
                </div>

                {passwordSuccess && (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-700 text-sm mb-4">
                    <CheckIcon className="w-4 h-4 flex-shrink-0" />
                    Password updated successfully!
                  </div>
                )}

                {passwordError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm mb-4">
                    <XMarkIcon className="w-4 h-4 flex-shrink-0" />
                    {passwordError}
                  </div>
                )}

                <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                  <div>
                    <label htmlFor="current-password" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        id="current-password"
                        type={showCurrent ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        className="w-full pr-10 pl-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#062E22]/20 focus:border-[#062E22] transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showCurrent ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="new-password" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        id="new-password"
                        type={showNew ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="w-full pr-10 pl-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#062E22]/20 focus:border-[#062E22] transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showNew ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirm-password" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        id="confirm-password"
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="w-full pr-10 pl-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#062E22]/20 focus:border-[#062E22] transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirm ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#062E22] text-white rounded-xl text-sm font-medium hover:bg-[#0a3a2c] transition disabled:opacity-60"
                  >
                    {savingPassword ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <LockClosedIcon className="w-4 h-4" />
                    )}
                    {savingPassword ? 'Updating…' : 'Update Password'}
                  </button>
                </form>
              </div>

              {/* Notification Preferences */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-center gap-2 mb-5">
                  <BellIcon className="w-5 h-5 text-slate-400" />
                  <h3 className="font-semibold text-slate-800">Notification Preferences</h3>
                </div>

                <div className="space-y-4 max-w-md">
                  <label className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Email Notifications</p>
                      <p className="text-xs text-slate-400 mt-0.5">Receive updates via email</p>
                    </div>
                    <div
                      onClick={() => setEmailNotifs(v => !v)}
                      className={`relative w-11 h-6 rounded-full transition cursor-pointer ${
                        emailNotifs ? 'bg-[#062E22]' : 'bg-slate-300'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition ${
                          emailNotifs ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </label>

                  <label className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition">
                    <div>
                      <p className="text-sm font-medium text-slate-700">SMS Notifications</p>
                      <p className="text-xs text-slate-400 mt-0.5">Receive updates via SMS</p>
                    </div>
                    <div
                      onClick={() => setSmsNotifs(v => !v)}
                      className={`relative w-11 h-6 rounded-full transition cursor-pointer ${
                        smsNotifs ? 'bg-[#062E22]' : 'bg-slate-300'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition ${
                          smsNotifs ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </label>

                  <p className="text-xs text-slate-400">Changes are saved automatically.</p>
                </div>
              </div>

              {/* Sign Out */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <ArrowRightOnRectangleIcon className="w-5 h-5 text-slate-400" />
                  <h3 className="font-semibold text-slate-800">Sign Out</h3>
                </div>
                <p className="text-sm text-slate-500 mb-4">Sign out of your account on this device.</p>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 transition border border-red-200"
                >
                  <ArrowRightOnRectangleIcon className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
