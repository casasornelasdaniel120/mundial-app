'use client'

import { useActionState } from 'react'
import { joinLeague } from '@/app/(dashboard)/leagues/actions'

type Props = {
  inviteCode: string
  leagueName: string
}

export default function JoinForm({ inviteCode, leagueName }: Props) {
  const [state, formAction, isPending] = useActionState(joinLeague, null)

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="invite_code" value={inviteCode} />

      <div>
        <label htmlFor="team_name" className="block text-sm font-medium text-gray-700 mb-1">
          Nombre de tu equipo
        </label>
        <input
          id="team_name"
          name="team_name"
          type="text"
          required
          maxLength={30}
          placeholder="Ej. Los Campeones"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-green-600 focus:outline-none"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? 'Uniéndose…' : `Unirse a "${leagueName}"`}
      </button>
    </form>
  )
}
