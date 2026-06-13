'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { createLeague } from '../actions'

export default function NewLeaguePage() {
  const [state, formAction, isPending] = useActionState(createLeague, null)

  return (
    <div className="max-w-lg">

      {/* Back + heading */}
      <div className="mb-7">
        <Link
          href="/leagues"
          className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-stone-400 transition-colors hover:text-stone-700 cursor-pointer"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
          </svg>
          Mis ligas
        </Link>

        <div className="mt-4">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.3em]" style={{ color: '#006847' }}>
            Nueva competencia
          </p>
          <h1
            className="text-3xl text-stone-900 uppercase tracking-tight"
            style={{ fontFamily: 'var(--font-russo)' }}
          >
            Crear Liga
          </h1>
          <p className="mt-1.5 text-xs text-stone-400">
            Serás el administrador. El enlace de invitación se genera al crear.
          </p>
        </div>
      </div>

      {/* Form card */}
      <form
        action={formAction}
        className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-5"
      >

        {/* League name */}
        <div>
          <label
            htmlFor="name"
            className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-widest text-stone-500"
          >
            <svg className="h-3 w-3" style={{ color: '#006847' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            Nombre de la liga
            <span className="text-red-400 ml-0.5">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={80}
            placeholder="Ej. Liga de la Oficina 2026"
            className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 placeholder-stone-400 transition-all focus:border-[#006847] focus:outline-none focus:ring-2 focus:ring-[#006847]/10"
          />
        </div>

        {/* Max teams + Budget */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="max_teams"
              className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-widest text-stone-500"
            >
              <svg className="h-3 w-3" style={{ color: '#006847' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Máx. equipos
            </label>
            <input
              id="max_teams"
              name="max_teams"
              type="number"
              defaultValue={20}
              min={2}
              max={100}
              className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 transition-all focus:border-[#006847] focus:outline-none focus:ring-2 focus:ring-[#006847]/10"
            />
          </div>

          <div>
            <label
              htmlFor="budget_cap"
              className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-widest text-stone-500"
            >
              <svg className="h-3 w-3" style={{ color: '#006847' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Presupuesto $M
            </label>
            <input
              id="budget_cap"
              name="budget_cap"
              type="number"
              defaultValue={100}
              min={50}
              max={1000}
              step={0.5}
              className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 transition-all focus:border-[#006847] focus:outline-none focus:ring-2 focus:ring-[#006847]/10"
            />
          </div>
        </div>

        {/* Scoring rules note */}
        <div className="flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
          <svg className="mt-0.5 h-4 w-4 shrink-0" style={{ color: '#006847', opacity: 0.6 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-[11px] leading-relaxed text-stone-500">
            Reglas de puntuación por defecto: gol <span className="text-stone-700">+5</span>, asistencia <span className="text-stone-700">+3</span>, amarilla <span className="text-stone-700">−1</span>, roja <span className="text-stone-700">−3</span>, arco en cero <span className="text-stone-700">+4</span>. Puedes editarlas desde el panel de admin.
          </p>
        </div>

        {/* Error */}
        {state?.error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-xs text-red-600">{state.error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-xl bg-[#006847] px-4 py-3 text-sm font-semibold uppercase tracking-widest text-white transition-all hover:bg-[#005539] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          style={{ fontFamily: 'var(--font-russo)' }}
        >
          {isPending ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creando…
            </span>
          ) : 'Crear Liga'}
        </button>
      </form>
    </div>
  )
}
