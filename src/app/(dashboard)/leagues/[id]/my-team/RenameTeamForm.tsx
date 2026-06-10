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
            className="rounded-lg border border-gray-700/60 bg-gray-950/80 px-3 py-1.5 text-xl font-bold text-white placeholder-gray-600 focus:border-green-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Guardando…' : 'Guardar'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="rounded-lg border border-gray-700/60 px-3 py-1.5 text-sm text-gray-400 transition-colors hover:text-gray-200"
          >
            Cancelar
          </button>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    )
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-2">
      <h1 className="text-2xl font-bold text-white">{savedName}</h1>
      <button
        type="button"
        onClick={handleEdit}
        className="rounded-md px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-800/50 hover:text-gray-300"
      >
        Cambiar nombre
      </button>
    </div>
  )
}
