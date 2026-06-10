'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signUp } from '../actions'

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(signUp, null)

  if (state?.success) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
        <span className="text-4xl">📬</span>
        <h2 className="mt-4 text-xl font-semibold text-gray-900">Check your inbox</h2>
        <p className="mt-2 text-sm text-gray-500">{state.success}</p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-medium text-green-700 hover:text-green-600"
        >
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">Create account</h2>
      <p className="text-sm text-gray-500 mb-6">Join the fantasy league</p>

      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/20"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/20"
            placeholder="••••••••"
          />
          <p className="mt-1 text-xs text-gray-400">Minimum 6 characters</p>
        </div>

        {state?.error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-green-700 hover:text-green-600">
          Sign in
        </Link>
      </p>
    </div>
  )
}
