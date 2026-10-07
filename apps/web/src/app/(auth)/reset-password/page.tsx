'use client';

import Link from 'next/link';
import { useState } from 'react';
import { resetPassword } from '../actions';

export default function ResetPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await resetPassword(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else if (result?.success) {
      setSuccessMessage(result.message);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fbfbfb] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#373E3E] text-white">
            <span className="font-mono text-xl font-bold">EE</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#373E3E]">Reset your password</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Enter your email address and we will send you a password reset link
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {successMessage ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center">
            <h3 className="font-semibold text-emerald-900">Check Your Email</h3>
            <p className="mt-2 text-sm text-emerald-700">{successMessage}</p>
            <Link
              href="/login"
              className="mt-6 inline-block rounded-lg border border-black px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-black hover:text-white"
            >
              Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className="mt-1 block w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm focus:border-[#373E3E] focus:ring-1 focus:ring-[#373E3E] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg border border-black bg-transparent py-2.5 text-sm font-semibold text-black transition-colors hover:bg-black hover:text-white disabled:opacity-50"
            >
              {loading ? 'Sending link...' : 'Send Reset Link'}
            </button>

            <p className="mt-6 text-center text-xs text-zinc-500">
              Remember your password?{' '}
              <Link href="/login" className="font-semibold text-[#373E3E] hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
