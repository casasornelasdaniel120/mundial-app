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
        className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 sm:py-2"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Eliminar Liga
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-stone-900">Eliminar Liga</h3>
            <p className="mt-2 text-sm text-stone-500">
              ¿Estás seguro? Esta acción eliminará la liga y todos sus datos permanentemente.
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
                disabled={isDeleting}
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-600 transition-colors hover:bg-stone-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isDeleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
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
