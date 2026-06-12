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
        className="flex h-10 w-10 items-center justify-center rounded-md text-sm font-bold text-red-500/70 transition-colors hover:bg-red-950/50 hover:text-red-400 sm:h-8 sm:w-8 sm:text-xs"
      >
        ✕
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-800/60 bg-gray-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Expulsar Miembro</h3>
            <p className="mt-2 text-sm text-gray-400">
              ¿Expulsar a <span className="font-semibold text-white">{teamName}</span> de la liga?
            </p>

            {error && (
              <p className="mt-3 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={isKicking}
                className="rounded-lg border border-gray-700/60 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-800/60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isKicking}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
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
