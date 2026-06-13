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
        <label htmlFor="team_name" className="block text-sm font-medium text-stone-600 mb-1.5">
          Nombre de tu equipo
        </label>
        <input
          id="team_name"
          name="team_name"
          type="text"
          required
          maxLength={30}
          placeholder="Ej. Los Campeones"
          className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-900 placeholder-stone-400 transition-all focus:border-[#006847] focus:outline-none focus:ring-2 focus:ring-[#006847]/10 sm:text-sm"
        />
      </div>

      {state?.error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-[#006847] px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-[#005539] disabled:opacity-60 disabled:cursor-not-allowed sm:py-2.5"
        style={{ fontFamily: 'var(--font-russo)' }}
      >
        {isPending ? 'Uniéndose…' : `Unirse a "${leagueName}"`}
      </button>
    </form>
  )
}
