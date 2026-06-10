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

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? 'Joining…' : `Join "${leagueName}"`}
      </button>
    </form>
  )
}
