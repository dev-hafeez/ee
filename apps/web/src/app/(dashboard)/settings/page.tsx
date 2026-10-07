'use client';

import { useState } from 'react';
import { updateProfile } from './profile-actions';

interface ProfileData {
  displayName: string;
  bio: string;
  timezone: string;
  email: string;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<ProfileData>({
    displayName: 'Alex Rivers',
    bio: 'Creator & Digital Strategist exploring quantum optimization for content reach.',
    timezone: 'UTC',
    email: 'alex@creator.com',
  });

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  async function handleSaveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    const formData = new FormData(e.currentTarget);
    const res = await updateProfile(formData);

    if (res?.error) {
      setFeedback({ type: 'error', text: res.error });
    } else {
      setFeedback({ type: 'success', text: 'Profile saved successfully!' });
    }
    setSaving(false);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#373E3E]">
          Account &amp; Platform Settings
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage your personal creator profile, timezone preferences, and connected social accounts.
        </p>
      </div>

      {feedback && (
        <div
          className={`rounded-lg p-4 text-sm font-medium ${
            feedback.type === 'success'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Profile Information Section */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#373E3E]">Creator Profile (FR-04)</h2>
        <p className="text-xs text-zinc-500">Your public profile name and bio information.</p>

        <form onSubmit={handleSaveProfile} className="mt-6 max-w-xl space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-zinc-700">
              Display Name
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              value={profile.displayName}
              onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3.5 py-2 text-sm shadow-sm focus:border-[#373E3E] focus:ring-1 focus:ring-[#373E3E] focus:outline-none"
              required
            />
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-zinc-700">
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={3}
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3.5 py-2 text-sm shadow-sm focus:border-[#373E3E] focus:ring-1 focus:ring-[#373E3E] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="timezone" className="block text-sm font-medium text-zinc-700">
              Timezone (used for scheduled publishing &amp; weekly digests)
            </label>
            <select
              id="timezone"
              name="timezone"
              value={profile.timezone}
              onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3.5 py-2 text-sm shadow-sm focus:border-[#373E3E] focus:ring-1 focus:ring-[#373E3E] focus:outline-none"
            >
              <option value="UTC">UTC (Coordinated Universal Time)</option>
              <option value="America/New_York">America/New_York (EST/EDT)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
              <option value="Europe/London">Europe/London (GMT/BST)</option>
              <option value="Asia/Karachi">Asia/Karachi (PKT)</option>
              <option value="Asia/Dubai">Asia/Dubai (GST)</option>
            </select>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg border border-black bg-transparent px-5 py-2 text-sm font-semibold text-black transition-colors hover:bg-black hover:text-white disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* Connected Social Accounts Section */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#373E3E]">Connected Social Accounts</h2>
        <p className="text-xs text-zinc-500">
          Instagram and Facebook account integrations only (SRDS Section 2.2).
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Instagram Card */}
          <div className="flex flex-col justify-between rounded-xl border border-zinc-200 p-5 transition-transform hover:scale-[1.01] hover:shadow-md">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-900">Instagram</span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  Connected
                </span>
              </div>
              <p className="mt-2 text-xs text-zinc-500">Account: @alex_rivers_creative</p>
              <p className="text-xs text-zinc-400">Tokens encrypted with AES-256-GCM</p>
            </div>
            <div className="mt-6">
              <button
                type="button"
                className="w-full rounded-lg border border-black bg-transparent py-1.5 text-xs font-semibold text-black transition-colors hover:bg-black hover:text-white"
              >
                Sync Data Now
              </button>
            </div>
          </div>

          {/* Facebook Card */}
          <div className="flex flex-col justify-between rounded-xl border border-zinc-200 p-5 transition-transform hover:scale-[1.01] hover:shadow-md">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-900">Facebook Page</span>
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
                  Not Connected
                </span>
              </div>
              <p className="mt-2 text-xs text-zinc-500">Connect a Meta Facebook Business Page</p>
            </div>
            <div className="mt-6">
              <button
                type="button"
                className="w-full rounded-lg border border-black bg-transparent py-1.5 text-xs font-semibold text-black transition-colors hover:bg-black hover:text-white"
              >
                Connect Facebook
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
