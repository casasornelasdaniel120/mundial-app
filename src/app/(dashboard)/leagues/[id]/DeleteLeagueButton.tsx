'use client'

import { useState, useTransition } from 'react'
import { deleteLeague } from './actions'

export default function DeleteLeagueButton({ leagueId }: { leagueId: string }) {
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, startTransition] = useTransition()

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const result = await deleteLeague(leagueId)
      // On success the action redirects to /leagues, so we only land here on failure.
      if (result && !result.ok) {
        setError(result.error ?? 'No se pudo eliminar la liga.')
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setError(null); setShowModal(true) }}
        className="rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:border-red-700/60 hover:bg-red-900/40"
      >
        🗑 Eliminar Liga
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-800/60 bg-gray-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Eliminar Liga</h3>
            <p className="mt-2 text-sm text-gray-400">
              ¿Estás seguro? Esta acción eliminará la liga y todos sus datos permanentemente.
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
                disabled={isDeleting}
                className="rounded-lg border border-gray-700/60 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-800/60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isDeleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
