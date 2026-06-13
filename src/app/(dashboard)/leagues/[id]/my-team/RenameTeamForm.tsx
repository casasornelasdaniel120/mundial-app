'use client'

import { useState, useTransition } from 'react'
import { updateTeamName } from './actions'

export default function RenameTeamForm({
  leagueId,
  initialName,
}: {
  leagueId: string
  initialName: string
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [savedName, setSavedName] = useState(initialName)
  const [draft, setDraft] = useState(initialName)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, startTransition] = useTransition()

  function handleEdit() {
    setDraft(savedName)
    setError(null)
    setIsEditing(true)
  }

  function handleCancel() {
    setDraft(savedName)
    setError(null)
    setIsEditing(false)
  }

  function handleSave() {
    const trimmed = draft.trim()
    if (!trimmed) {
      setError('El nombre no puede estar vacío.')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await updateTeamName(leagueId, trimmed)
      if (!result.ok) {
        setError(result.error ?? 'No se pudo guardar.')
        return
      }
      setSavedName(trimmed)
      setIsEditing(false)
    })
  }

  if (isEditing) {
    return (
      <div className="mt-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            maxLength={30}
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') handleCancel()
            }}
            className="w-full min-w-0 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xl font-bold text-stone-900 placeholder-stone-400 focus:border-[#006847] focus:outline-none focus:ring-2 focus:ring-[#006847]/10 sm:w-auto"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-lg bg-[#006847] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#005539] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Guardando…' : 'Guardar'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-500 transition-colors hover:text-stone-700"
          >
            Cancelar
          </button>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    )
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-2">
      <h1 className="text-2xl font-bold text-stone-900">{savedName}</h1>
      <button
        type="button"
        onClick={handleEdit}
        className="rounded-md px-2.5 py-2 text-xs text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 sm:py-1"
      >
        Cambiar nombre
      </button>
    </div>
  )
}
