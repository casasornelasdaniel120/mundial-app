'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { signUp } from '../actions'

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(signUp, null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    const confirm  = (form.elements.namedItem('confirm_password') as HTMLInputElement).value
    if (password !== confirm) {
      e.preventDefault()
      setConfirmError('Las contraseñas no coinciden.')
      return
    }
    setConfirmError(null)
  }

  // ── Success state ─────────────────────────────────────────
  if (state?.success) {
    return (
      <div className="rounded-2xl border border-white/5 bg-white/[0.04] backdrop-blur-xl shadow-2xl shadow-black/50 p-7 text-center">
        <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-green-600/10 border border-green-600/20 flex items-center justify-center">
          <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2
          className="text-lg text-white uppercase tracking-wide"
          style={{ fontFamily: 'var(--font-russo)' }}
        >
          Revisa tu correo
        </h2>
        <p className="mt-2 text-xs text-gray-500 leading-relaxed">{state.success}</p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-1.5 text-xs font-medium text-green-400 hover:text-green-300 transition-colors cursor-pointer tracking-wide"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
          </svg>
          Volver al inicio de sesión
        </Link>
      </div>
    )
  }

  // ── Register form ─────────────────────────────────────────
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.04] backdrop-blur-xl shadow-2xl shadow-black/50 p-7">

      {/* Heading */}
      <div className="mb-6">
        <h2
          className="text-xl text-white tracking-wide uppercase"
          style={{ fontFamily: 'var(--font-russo)' }}
        >
          Crear cuenta
        </h2>
        <p className="mt-1 text-xs text-gray-500 tracking-wide">
          Únete a la fantasy del Mundial 2026
        </p>
      </div>

      <form action={formAction} onSubmit={handleSubmit} className="space-y-4">

        {/* Email */}
        <div>
          <label htmlFor="email" className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-gray-400 uppercase tracking-widest">
            <svg className="w-3 h-3 text-green-500/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="tu@email.com"
            className="w-full rounded-xl border border-white/8 bg-black/30 px-4 py-3 text-sm text-white placeholder-gray-700 transition-all duration-200 focus:border-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/15 focus:bg-black/50"
          />
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-gray-400 uppercase tracking-widest">
            <svg className="w-3 h-3 text-green-500/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Contraseña
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={6}
              placeholder="••••••••"
              className="w-full rounded-xl border border-white/8 bg-black/30 px-4 py-3 pr-11 text-sm text-white placeholder-gray-700 transition-all duration-200 focus:border-green-500/50 focus:outline-none focus:ring-2 focus:ring-green-500/15 focus:bg-black/50"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors cursor-pointer p-1"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-gray-700 tracking-wide">Mínimo 6 caracteres</p>
        </div>

        {/* Confirm password */}
        <div>
          <label htmlFor="confirm_password" className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-gray-400 uppercase tracking-widest">
            <svg className="w-3 h-3 text-green-500/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Confirmar contraseña
          </label>
          <div className="relative">
            <input
              id="confirm_password"
              name="confirm_password"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              required
              placeholder="••••••••"
              className={`w-full rounded-xl border bg-black/30 px-4 py-3 pr-11 text-sm text-white placeholder-gray-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:bg-black/50 ${
                confirmError
                  ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/15'
                  : 'border-white/8 focus:border-green-500/50 focus:ring-green-500/15'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors cursor-pointer p-1"
              aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showConfirm ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {confirmError && (
            <p className="mt-1.5 text-[11px] text-red-400 flex items-center gap-1">
              <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {confirmError}
            </p>
          )}
        </div>

        {/* Server error */}
        {state?.error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3">
            <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-xs text-red-400 leading-relaxed">{state.error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white uppercase tracking-widest shadow-lg shadow-green-900/40 transition-all duration-200 hover:bg-green-500 hover:shadow-green-900/60 focus:outline-none focus:ring-2 focus:ring-green-500/50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          style={{ fontFamily: 'var(--font-russo)' }}
        >
          {isPending ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creando cuenta…
            </span>
          ) : (
            'Crear cuenta'
          )}
        </button>
      </form>

      {/* Footer link */}
      <div className="mt-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/5" />
        <p className="text-xs text-gray-600">¿Ya tienes cuenta?</p>
        <div className="h-px flex-1 bg-white/5" />
      </div>
      <Link
        href="/login"
        className="mt-3 flex items-center justify-center gap-1.5 w-full rounded-xl border border-white/6 px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-widest transition-all duration-200 hover:border-green-500/30 hover:text-green-400 hover:bg-green-950/20 cursor-pointer"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
        </svg>
        Iniciar sesión
      </Link>
    </div>
  )
}
