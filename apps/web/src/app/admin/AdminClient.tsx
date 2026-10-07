'use client';

import { useState } from 'react';
import { toggleSuspendUser, deleteUser } from './actions';

export interface UserRow {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  suspended: boolean;
  createdAt: string;
}

interface AdminClientProps {
  initialUsers: UserRow[];
}

export function AdminClient({ initialUsers }: AdminClientProps) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [actionType, setActionType] = useState<'suspend' | 'delete' | null>(null);
  const [reauthPassword, setReauthPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function openConfirmation(user: UserRow, type: 'suspend' | 'delete') {
    setSelectedUser(user);
    setActionType(type);
    setReauthPassword('');
    setError(null);
  }

  function closeConfirmation() {
    setSelectedUser(null);
    setActionType(null);
    setReauthPassword('');
    setError(null);
  }

  async function handleConfirmAction(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser || !actionType) return;
    if (!reauthPassword) {
      setError('Password re-authentication is required (SRDS 4.2.8)');
      return;
    }

    setLoading(true);
    setError(null);

    if (actionType === 'suspend') {
      const res = await toggleSuspendUser(selectedUser.id, selectedUser.suspended, reauthPassword);
      if (res?.error) {
        setError(res.error);
        setLoading(false);
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? { ...u, suspended: !u.suspended } : u))
      );
    } else if (actionType === 'delete') {
      const res = await deleteUser(selectedUser.id, reauthPassword);
      if (res?.error) {
        setError(res.error);
        setLoading(false);
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
    }

    setLoading(false);
    closeConfirmation();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#373E3E]">Administrator Panel</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Manage system users, account suspensions, and platform access (SRDS FR-06, UC10).
          </p>
        </div>
        <span className="rounded-full bg-[#373E3E] px-3 py-1 text-xs font-semibold text-white">
          Admin Access
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200 text-left text-sm">
          <thead className="bg-zinc-50 text-xs font-semibold tracking-wider text-zinc-500 uppercase">
            <tr>
              <th className="px-6 py-3">User</th>
              <th className="px-6 py-3">Role</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Registered</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-zinc-50/50">
                <td className="px-6 py-4">
                  <div className="font-medium text-zinc-900">
                    {u.displayName || 'No display name'}
                  </div>
                  <div className="text-xs text-zinc-500">{u.email}</div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.role === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-zinc-100 text-zinc-800'
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {u.suspended ? (
                    <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                      Suspended
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                      Active
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-xs text-zinc-500">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td className="space-x-2 px-6 py-4 text-right">
                  <button
                    onClick={() => openConfirmation(u, 'suspend')}
                    className={`rounded border px-2.5 py-1 text-xs font-medium transition ${
                      u.suspended
                        ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                        : 'border-amber-300 text-amber-700 hover:bg-amber-50'
                    }`}
                  >
                    {u.suspended ? 'Unsuspend' : 'Suspend'}
                  </button>
                  <button
                    onClick={() => openConfirmation(u, 'delete')}
                    className="rounded border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SRDS 4.2.8 Password Re-authentication Modal */}
      {selectedUser && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-zinc-900">
              Confirm {actionType === 'delete' ? 'Account Deletion' : 'Status Change'}
            </h3>
            <p className="mt-2 text-xs text-zinc-500">
              {actionType === 'delete'
                ? `You are about to permanently delete ${selectedUser.email}. All associated posts, accounts, and optimization data will be deleted.`
                : `You are about to ${selectedUser.suspended ? 'unsuspend' : 'suspend'} ${selectedUser.email}.`}
            </p>

            <div className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              <strong>Security Check (SRDS 4.2.8):</strong> Destructive actions require
              re-authentication. Please enter your administrator password.
            </div>

            {error && (
              <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleConfirmAction} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700">Admin Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={reauthPassword}
                  onChange={(e) => setReauthPassword(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-[#373E3E] focus:ring-1 focus:ring-[#373E3E] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeConfirmation}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-50 ${
                    actionType === 'delete'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-[#373E3E] hover:bg-black'
                  }`}
                >
                  {loading
                    ? 'Verifying...'
                    : actionType === 'delete'
                      ? 'Confirm Delete'
                      : 'Confirm Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
