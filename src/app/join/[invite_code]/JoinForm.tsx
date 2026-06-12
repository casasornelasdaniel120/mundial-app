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
        <label htmlFor="team_name" className="block text-sm font-medium text-gray-400 mb-1">
          Nombre de tu equipo
        </label>
        <input
          id="team_name"
          name="team_name"
          type="text"
          required
          maxLength={30}
          placeholder="Ej. Los Campeones"
          className="w-full rounded-lg border border-gray-700/60 bg-gray-950/80 px-3 py-2.5 text-base text-white placeholder-gray-600 transition-colors focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 sm:py-2 sm:text-sm"
        />
      </div>

      {state?.error && (
        <p className="rounded-lg border border-red-800/40 bg-red-950/40 px-3 py-2 text-sm text-red-400">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-green-950 hover:bg-green-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors sm:py-2.5"
      >
        {isPending ? 'Uniéndose…' : `Unirse a "${leagueName}"`}
      </button>
    </form>
  )
}
