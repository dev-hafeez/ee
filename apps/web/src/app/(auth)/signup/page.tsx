'use client';

import Link from 'next/link';
import { useState } from 'react';
import { signup, loginWithGoogle } from '../actions';

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await signup(formData);

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
          <h1 className="text-2xl font-bold tracking-tight text-[#373E3E]">Create your account</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Get started with quantum-inspired schedule optimization
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {successMessage ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              ✓
            </div>
            <h3 className="font-semibold text-emerald-900">Verification Email Sent</h3>
            <p className="mt-2 text-sm text-emerald-700">{successMessage}</p>
            <Link
              href="/login"
              className="mt-6 inline-block rounded-lg border border-black px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-black hover:text-white"
            >
              Return to Login
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700" htmlFor="fullName">
                  Full Name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  placeholder="Alex Rivers"
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm focus:border-[#373E3E] focus:ring-1 focus:ring-[#373E3E] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700" htmlFor="email">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="alex@creator.com"
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm focus:border-[#373E3E] focus:ring-1 focus:ring-[#373E3E] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700" htmlFor="password">
                  Password (min 8 characters)
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm focus:border-[#373E3E] focus:ring-1 focus:ring-[#373E3E] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg border border-black bg-transparent py-2.5 text-sm font-semibold text-black transition-colors hover:bg-black hover:text-white disabled:opacity-50"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200" />
              </div>
              <span className="relative bg-white px-3 text-xs tracking-wider text-zinc-400 uppercase">
                or
              </span>
            </div>

            <form action={loginWithGoogle}>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Sign up with Google
              </button>
            </form>

            <p className="mt-8 text-center text-xs text-zinc-500">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-[#373E3E] hover:underline">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
