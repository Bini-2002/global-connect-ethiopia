'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';
import Sidebar from '@/components/Sidebar';
import DashboardHeader from '@/components/DashboardHeader';
import {
  UserCircleIcon,
  PencilSquareIcon,
  CheckIcon,
  XMarkIcon,
  PhoneIcon,
  MapPinIcon,
  ShieldCheckIcon,
  CalendarDaysIcon,
  IdentificationIcon,
  ChatBubbleLeftEllipsisIcon,
} from '@heroicons/react/24/outline';

interface ProfileData {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  role: string;
  bio: string | null;
  phone: string | null;
  address: string | null;
  extra_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface ProfilePageProps {
  role: 'organizer' | 'admin' | 'ministry' | 'municipal' | 'police' | 'vendor' | 'attendee';
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

const ROLE_COLORS: Record<string, string> = {
  organizer: 'from-emerald-600 to-teal-700',
  vendor: 'from-violet-600 to-purple-700',
  admin: 'from-slate-700 to-slate-900',
  super_admin: 'from-slate-700 to-slate-900',
  ministry_gov: 'from-blue-600 to-indigo-700',
  municipal_gov: 'from-orange-500 to-amber-600',
  police: 'from-sky-600 to-blue-700',
  attendee: 'from-rose-500 to-pink-600',
};

const ROLE_BADGE_COLORS: Record<string, string> = {
  organizer: 'bg-emerald-100 text-emerald-800',
  vendor: 'bg-violet-100 text-violet-800',
  admin: 'bg-slate-100 text-slate-800',
  super_admin: 'bg-slate-100 text-slate-800',
  ministry_gov: 'bg-blue-100 text-blue-800',
  municipal_gov: 'bg-amber-100 text-amber-800',
  police: 'bg-sky-100 text-sky-800',
  attendee: 'bg-rose-100 text-rose-800',
};

function getInitials(name: string | null): string {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function ProfilePage({ role }: ProfilePageProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form state
  const [formBio, setFormBio] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await api.get<ProfileData>('/users/me');
        setProfile(data);
        setFormBio(data.bio || '');
        setFormPhone(data.phone || '');
        setFormAddress(data.address || '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    void fetchProfile();
  }, []);

  const handleEdit = () => {
    setFormBio(profile?.bio || '');
    setFormPhone(profile?.phone || '');
    setFormAddress(profile?.address || '');
    setIsEditing(true);
    setSaveSuccess(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.put<ProfileData>('/users/me', {
        bio: formBio || null,
        phone: formPhone || null,
        address: formAddress || null,
      });
      setProfile(updated);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const gradientClass = ROLE_COLORS[profile?.role ?? role] ?? ROLE_COLORS.organizer;
  const badgeClass = ROLE_BADGE_COLORS[profile?.role ?? role] ?? ROLE_BADGE_COLORS.organizer;
  const roleLabel = ROLE_LABELS[profile?.role ?? role] ?? profile?.role ?? role;

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role={role} />
      <DashboardHeader searchPlaceholder="Search..." />

      {/* Main content area — offset by sidebar */}
      <main className="md:ml-60 pt-16 min-h-screen">
        <div className="p-4 md:p-8 max-w-4xl">

          {/* Page heading */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-800">My Profile</h1>
            <p className="text-sm text-slate-500 mt-1">View and manage your personal information</p>
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div className="space-y-4 animate-pulse">
              <div className="h-52 bg-slate-200 rounded-2xl" />
              <div className="h-64 bg-slate-200 rounded-2xl" />
            </div>
          )}

          {/* Error state */}
          {!loading && error && !isEditing && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Profile card */}
          {!loading && profile && (
            <div className="space-y-5">

              {/* Hero card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Banner */}
                <div className={`h-28 bg-gradient-to-br ${gradientClass} relative`}>
                  <div className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='white' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='20' cy='20' r='2'/%3E%3C/g%3E%3C/svg%3E\")" }}
                  />
                </div>

                {/* Avatar & name row */}
                <div className="px-6 pb-6">
                  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-12 mb-4">
                    {/* Avatar */}
                    <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${gradientClass} flex items-center justify-center shadow-lg border-4 border-white flex-shrink-0`}>
                      <span className="text-white text-3xl font-bold">{getInitials(profile.name)}</span>
                    </div>
                    {/* Edit button */}
                    {!isEditing && (
                      <button
                        id="edit-profile-btn"
                        onClick={handleEdit}
                        className="flex items-center gap-2 px-4 py-2 bg-[#062E22] text-white rounded-xl text-sm font-medium hover:bg-[#0a3a2c] transition-all duration-150 shadow-sm"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                        Edit Profile
                      </button>
                    )}
                  </div>

                  {/* Name & Role */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-800">{profile.name ?? 'Unknown User'}</h2>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeClass}`}>
                      <ShieldCheckIcon className="w-3 h-3" />
                      {roleLabel}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mt-1 flex items-center gap-1">
                    <CalendarDaysIcon className="w-3.5 h-3.5" />
                    Member since {formatDate(profile.created_at)}
                  </p>
                </div>
              </div>

              {/* Success banner */}
              {saveSuccess && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-700 text-sm animate-pulse">
                  <CheckIcon className="w-4 h-4 flex-shrink-0" />
                  Profile updated successfully!
                </div>
              )}

              {/* Info / Edit card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <IdentificationIcon className="w-5 h-5 text-slate-400" />
                    Personal Information
                  </h3>
                  {isEditing && (
                    <div className="flex gap-2">
                      <button
                        id="cancel-edit-btn"
                        onClick={handleCancel}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
                      >
                        <XMarkIcon className="w-4 h-4" />
                        Cancel
                      </button>
                      <button
                        id="save-profile-btn"
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-[#062E22] text-white rounded-lg text-sm font-medium hover:bg-[#0a3a2c] transition disabled:opacity-60"
                      >
                        {saving ? (
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <CheckIcon className="w-4 h-4" />
                        )}
                        {saving ? 'Saving…' : 'Save Changes'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Error during save */}
                {error && isEditing && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* Full Name — read-only always */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Full Name
                    </label>
                    <div className="flex items-center gap-2 text-slate-700 text-sm py-2 px-3 bg-slate-50 rounded-lg border border-slate-100">
                      <UserCircleIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span>{profile.name ?? '—'}</span>
                      <span className="ml-auto text-xs text-slate-400 italic">Not editable</span>
                    </div>
                  </div>

                  {/* Role — read-only always */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Role
                    </label>
                    <div className="flex items-center gap-2 text-slate-700 text-sm py-2 px-3 bg-slate-50 rounded-lg border border-slate-100">
                      <ShieldCheckIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span>{roleLabel}</span>
                    </div>
                  </div>

                  {/* Email — read-only always */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Email Address
                    </label>
                    <div className="flex items-center gap-2 text-slate-700 text-sm py-2 px-3 bg-slate-50 rounded-lg border border-slate-100">
                      <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>{profile.email ?? '—'}</span>
                      <span className="ml-auto text-xs text-slate-400 italic">Not editable</span>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-1">
                    <label htmlFor="profile-phone" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Phone Number
                    </label>
                    {isEditing ? (
                      <div className="relative">
                        <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          id="profile-phone"
                          type="tel"
                          value={formPhone}
                          onChange={(e) => setFormPhone(e.target.value)}
                          placeholder="+251 9XX XXX XXXX"
                          className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#062E22]/20 focus:border-[#062E22] transition"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-700 text-sm py-2 px-3 bg-slate-50 rounded-lg border border-slate-100">
                        <PhoneIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span>{profile.phone ?? <em className="text-slate-400">Not provided</em>}</span>
                      </div>
                    )}
                  </div>

                  {/* Address */}
                  <div className="space-y-1">
                    <label htmlFor="profile-address" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Address
                    </label>
                    {isEditing ? (
                      <div className="relative">
                        <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          id="profile-address"
                          type="text"
                          value={formAddress}
                          onChange={(e) => setFormAddress(e.target.value)}
                          placeholder="Addis Ababa, Ethiopia"
                          className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#062E22]/20 focus:border-[#062E22] transition"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-700 text-sm py-2 px-3 bg-slate-50 rounded-lg border border-slate-100">
                        <MapPinIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span>{profile.address ?? <em className="text-slate-400">Not provided</em>}</span>
                      </div>
                    )}
                  </div>

                  {/* Bio — spans both columns */}
                  <div className="space-y-1 md:col-span-2">
                    <label htmlFor="profile-bio" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Bio
                    </label>
                    {isEditing ? (
                      <div className="relative">
                        <ChatBubbleLeftEllipsisIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                        <textarea
                          id="profile-bio"
                          rows={4}
                          value={formBio}
                          onChange={(e) => setFormBio(e.target.value)}
                          placeholder="Tell others a little about yourself…"
                          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#062E22]/20 focus:border-[#062E22] transition resize-none"
                        />
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 text-slate-700 text-sm py-2.5 px-3 bg-slate-50 rounded-lg border border-slate-100 min-h-[80px]">
                        <ChatBubbleLeftEllipsisIcon className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                        <span className="whitespace-pre-wrap leading-relaxed">
                          {profile.bio ?? <em className="text-slate-400">No bio added yet. Click &quot;Edit Profile&quot; to add one.</em>}
                        </span>
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* Account meta info */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
                  <CalendarDaysIcon className="w-5 h-5 text-slate-400" />
                  Account Activity
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Member Since</p>
                    <p className="text-sm font-semibold text-slate-700">{formatDate(profile.created_at)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Last Updated</p>
                    <p className="text-sm font-semibold text-slate-700">{formatDate(profile.updated_at)}</p>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}
