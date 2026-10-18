'use client';

import { useState } from 'react';
import Link from 'next/link';
import { updateProfile } from './profile-actions';
import { connectSocialAccount, disconnectSocialAccount } from './social-actions';
import { DataExportUploadModal } from '@/components/social/DataExportUploadModal';

export interface ProfileData {
  displayName: string;
  bio: string;
  timezone: string;
  email: string;
  benchmarkOptIn?: boolean;
}

export interface ConnectedAccount {
  connected: boolean;
  handle: string | null;
  id: string | null;
}

export interface SettingsClientProps {
  initialProfile: ProfileData;
  initialAccounts: {
    instagram: ConnectedAccount;
    facebook: ConnectedAccount;
  };
}

export function SettingsClient({ initialProfile, initialAccounts }: SettingsClientProps) {
  const [profile, setProfile] = useState<ProfileData>(initialProfile);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [accounts, setAccounts] = useState(initialAccounts);
  const [activeUploadAccount, setActiveUploadAccount] = useState<{ id: string; handle: string } | null>(null);
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

  async function handleToggleConnect(platform: 'instagram' | 'facebook') {
    setConnecting(platform);
    setFeedback(null);

    const acc = accounts[platform];
    if (acc.connected && acc.id) {
      const res = await disconnectSocialAccount(acc.id);
      if (res?.error) {
        setFeedback({ type: 'error', text: res.error });
      } else {
        setAccounts((prev) => ({
          ...prev,
          [platform]: { connected: false, handle: null, id: null },
        }));
        setFeedback({ type: 'success', text: `Disconnected ${platform} account.` });
      }
    } else {
      const res = await connectSocialAccount(platform);
      if (res?.error) {
        setFeedback({ type: 'error', text: res.error });
      } else if (res?.success) {
        setAccounts((prev) => ({
          ...prev,
          [platform]: { connected: true, handle: res.handle, id: `acc_${platform}_active` },
        }));
        setFeedback({
          type: 'success',
          text: `Successfully connected ${platform} (@${res.handle})!`,
        });
      }
    }
    setConnecting(null);
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#373E3E]">
          Account &amp; Platform Settings
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage creator profile, timezone preferences, and connected social accounts.
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
        <h2 className="text-lg font-semibold text-[#373E3E]">Creator Profile</h2>
        <p className="text-xs text-zinc-500">Your profile details and timezone for scheduling.</p>

        <form onSubmit={handleSaveProfile} className="mt-6 max-w-xl space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Email</label>
            <input
              type="text"
              disabled
              value={profile.email}
              className="mt-1 block w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-sm text-zinc-500 cursor-not-allowed"
            />
          </div>

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
              placeholder="Your Name"
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
              placeholder="Tell us about yourself or your brand"
            />
          </div>

          <div>
            <label htmlFor="timezone" className="block text-sm font-medium text-zinc-700">
              Timezone (used for scheduled publishing)
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

          {/* Cross-Creator Benchmark Opt-In */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="benchmarkOptIn"
                name="benchmarkOptIn"
                value="true"
                checked={!!profile.benchmarkOptIn}
                onChange={(e) => setProfile({ ...profile, benchmarkOptIn: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-zinc-300 text-[#373E3E] focus:ring-[#373E3E]"
              />
              <div className="flex-1">
                <label htmlFor="benchmarkOptIn" className="text-sm font-bold text-zinc-900 cursor-pointer">
                  Contribute to Platform Cross-Creator Benchmarks
                </label>
                <p className="mt-1 text-xs text-zinc-600 leading-relaxed">
                  When enabled, your account&apos;s anonymized metrics contribute toward platform-wide engagement benchmarks. Strictly protected by K-anonymity (K &ge; 20). No handles, captions, or identifying information are ever shared.
                </p>
                <div className="mt-2">
                  <Link href="/privacy" className="text-xs font-semibold text-[#373E3E] hover:underline">
                    Read our Privacy Policy &amp; Anonymity Guarantees &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="btn-outline px-5 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* Connected Social Accounts Section */}
      <div className="card-elevation rounded-xl p-6">
        <h2 className="text-lg font-bold text-[#373E3E]">Connected Social Accounts</h2>
        <p className="text-xs text-zinc-600">
          Instagram and Facebook account integrations. Tokens encrypted with AES-256-GCM.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Instagram Card */}
          <div className="flex flex-col justify-between rounded-xl border border-zinc-200 p-5 transition-transform hover:scale-[1.01] hover:shadow-md bg-white">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-900">Instagram</span>
                {accounts.instagram.connected ? (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    Connected
                  </span>
                ) : (
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-700">
                    Disconnected
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-zinc-700">
                {accounts.instagram.connected && accounts.instagram.handle
                  ? `Handle: @${accounts.instagram.handle}`
                  : 'Connect your Instagram Professional or Creator account'}
              </p>
              <p className="mt-1 text-[11px] text-zinc-500 font-mono">Encrypted with AES-256-GCM</p>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              {accounts.instagram.connected && accounts.instagram.id && (
                <button
                  type="button"
                  onClick={() =>
                    setActiveUploadAccount({
                      id: accounts.instagram.id!,
                      handle: accounts.instagram.handle || 'instagram',
                    })
                  }
                  className="btn-outline w-full py-1.5 text-xs font-semibold"
                >
                  📤 Import Post History (CSV/JSON)
                </button>
              )}
              <button
                type="button"
                disabled={connecting === 'instagram'}
                onClick={() => handleToggleConnect('instagram')}
                className={`w-full rounded-lg border py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
                  accounts.instagram.connected
                    ? 'border-red-300 text-red-700 hover:bg-red-50'
                    : 'btn-outline'
                }`}
              >
                {connecting === 'instagram'
                  ? 'Processing...'
                  : accounts.instagram.connected
                    ? 'Disconnect Instagram'
                    : 'Connect Instagram'}
              </button>
            </div>
          </div>

          {/* Facebook Card */}
          <div className="flex flex-col justify-between rounded-xl border border-zinc-200 p-5 transition-transform hover:scale-[1.01] hover:shadow-md bg-white">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-900">Facebook Page</span>
                {accounts.facebook.connected ? (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    Connected
                  </span>
                ) : (
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-700">
                    Disconnected
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-zinc-700">
                {accounts.facebook.connected && accounts.facebook.handle
                  ? `Handle: @${accounts.facebook.handle}`
                  : 'Connect a Meta Facebook Business Page'}
              </p>
              <p className="mt-1 text-[11px] text-zinc-500 font-mono">Encrypted with AES-256-GCM</p>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              {accounts.facebook.connected && accounts.facebook.id && (
                <button
                  type="button"
                  onClick={() =>
                    setActiveUploadAccount({
                      id: accounts.facebook.id!,
                      handle: accounts.facebook.handle || 'facebook',
                    })
                  }
                  className="btn-outline w-full py-1.5 text-xs font-semibold"
                >
                  📤 Import Post History (CSV/JSON)
                </button>
              )}
              <button
                type="button"
                disabled={connecting === 'facebook'}
                onClick={() => handleToggleConnect('facebook')}
                className={`w-full rounded-lg border py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
                  accounts.facebook.connected
                    ? 'border-red-300 text-red-700 hover:bg-red-50'
                    : 'btn-outline'
                }`}
              >
                {connecting === 'facebook'
                  ? 'Processing...'
                  : accounts.facebook.connected
                    ? 'Disconnect Facebook'
                    : 'Connect Facebook'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CSV / Data Export Modal */}
      {activeUploadAccount && (
        <DataExportUploadModal
          isOpen={true}
          onClose={() => setActiveUploadAccount(null)}
          accountId={activeUploadAccount.id}
          accountHandle={activeUploadAccount.handle}
        />
      )}
    </div>
  );
}
