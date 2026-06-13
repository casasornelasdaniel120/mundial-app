'use client'

import { useState, useTransition } from 'react'
import { kickMember } from './actions'

export default function KickMemberButton({
  leagueId,
  memberUserId,
  teamName,
}: {
  leagueId: string
  memberUserId: string
  teamName: string
}) {
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isKicking, startTransition] = useTransition()

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const result = await kickMember(leagueId, memberUserId)
      if (!result.ok) {
        setError(result.error ?? 'No se pudo expulsar al miembro.')
        return
      }
      setShowModal(false)
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setError(null); setShowModal(true) }}
        title={`Expulsar a ${teamName}`}
        className="flex h-10 w-10 items-center justify-center rounded-md text-stone-300 transition-colors hover:bg-red-50 hover:text-red-500 sm:h-8 sm:w-8"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-stone-900">Expulsar Miembro</h3>
            <p className="mt-2 text-sm text-stone-500">
              ¿Expulsar a <span className="font-semibold text-stone-800">{teamName}</span> de la liga?
            </p>

            {error && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={isKicking}
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-600 transition-colors hover:bg-stone-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isKicking}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isKicking ? 'Expulsando…' : 'Expulsar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
