'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { signUp } from '../actions'

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(signUp, null)
  const [confirmError, setConfirmError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    const confirm = (form.elements.namedItem('confirm_password') as HTMLInputElement).value

    if (password !== confirm) {
      e.preventDefault()
      setConfirmError('Las contraseñas no coinciden.')
      return
    }
    setConfirmError(null)
  }

  if (state?.success) {
    return (
      <div className="rounded-2xl border border-gray-800/60 bg-gray-900/80 p-8 text-center shadow-2xl shadow-black/40 backdrop-blur-sm">
        <span className="text-4xl">📬</span>
        <h2 className="mt-4 text-xl font-bold text-white">Revisa tu correo</h2>
        <p className="mt-2 text-sm text-gray-400">{state.success}</p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-medium text-green-400 hover:text-green-300 transition-colors"
        >
          Volver al inicio de sesión
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-800/60 bg-gray-900/80 p-8 shadow-2xl shadow-black/40 backdrop-blur-sm">
      <h2 className="mb-1 text-xl font-bold text-white">Crear cuenta</h2>
      <p className="mb-6 text-sm text-gray-400">Únete a la fantasy del Mundial</p>

      <form action={formAction} onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-400">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="tu@email.com"
            className="w-full rounded-lg border border-gray-700/60 bg-gray-950/80 px-3 py-2.5 text-base text-white placeholder-gray-600 transition-colors focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-400">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            placeholder="••••••••"
            className="w-full rounded-lg border border-gray-700/60 bg-gray-950/80 px-3 py-2.5 text-base text-white placeholder-gray-600 transition-colors focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-600">Mínimo 6 caracteres</p>
        </div>

        <div>
          <label htmlFor="confirm_password" className="mb-1.5 block text-sm font-medium text-gray-400">
            Confirmar contraseña
          </label>
          <input
            id="confirm_password"
            name="confirm_password"
            type="password"
            autoComplete="new-password"
            required
            placeholder="••••••••"
            className={`w-full rounded-lg border bg-gray-950/80 px-3 py-2.5 text-base text-white placeholder-gray-600 transition-colors focus:outline-none focus:ring-2 sm:text-sm ${
              confirmError
                ? 'border-red-700/60 focus:border-red-500 focus:ring-red-500/20'
                : 'border-gray-700/60 focus:border-green-500 focus:ring-green-500/20'
            }`}
          />
          {confirmError && (
            <p className="mt-1 text-xs text-red-400">{confirmError}</p>
          )}
        </div>

        {state?.error && (
          <p className="rounded-lg border border-red-800/40 bg-red-950/40 px-3 py-2 text-sm text-red-400">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-green-950 transition-colors hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 disabled:cursor-not-allowed disabled:opacity-60 sm:py-2.5"
        >
          {isPending ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="font-medium text-green-400 hover:text-green-300 transition-colors">
          Inicia sesión
        </Link>
      </p>
    </div>
  )
}
