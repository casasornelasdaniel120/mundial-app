'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { createLeague } from '../actions'

export default function NewLeaguePage() {
  const [state, formAction, isPending] = useActionState(createLeague, null)

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link href="/leagues" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to leagues
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">Create a League</h1>
        <p className="mt-1 text-sm text-gray-500">
          You&apos;ll be the admin. Invite others with the link generated after creation.
        </p>
      </div>

      <form action={formAction} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            League name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={80}
            placeholder="e.g. Office World Cup League"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/20"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="max_teams" className="block text-sm font-medium text-gray-700 mb-1">
              Max teams
            </label>
            <input
              id="max_teams"
              name="max_teams"
              type="number"
              defaultValue={20}
              min={2}
              max={100}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/20"
            />
          </div>

          <div>
            <label htmlFor="budget_cap" className="block text-sm font-medium text-gray-700 mb-1">
              Budget cap ($M)
            </label>
            <input
              id="budget_cap"
              name="budget_cap"
              type="number"
              defaultValue={100}
              min={50}
              max={1000}
              step={0.5}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/20"
            />
          </div>
        </div>

        <p className="text-xs text-gray-400">
          Default scoring rules (goal +5, assist +3, yellow −1, red −3, clean sheet +4) will be added automatically. You can edit them later as admin.
        </p>

        {state?.error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Creating…' : 'Create league'}
        </button>
      </form>
    </div>
  )
}
