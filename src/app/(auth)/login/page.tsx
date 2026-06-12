'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signIn } from '../actions'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(signIn, null)

  return (
    <div className="rounded-2xl border border-gray-800/60 bg-gray-900/80 p-8 shadow-2xl shadow-black/40 backdrop-blur-sm">
      <h2 className="mb-1 text-xl font-bold text-white">Bienvenido de nuevo</h2>
      <p className="mb-6 text-sm text-gray-400">Inicia sesión en tu cuenta</p>

      <form action={formAction} className="space-y-4">
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
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="w-full rounded-lg border border-gray-700/60 bg-gray-950/80 px-3 py-2.5 text-base text-white placeholder-gray-600 transition-colors focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 sm:text-sm"
          />
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
          {isPending ? 'Iniciando sesión…' : 'Iniciar sesión'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        ¿No tienes cuenta?{' '}
        <Link href="/register" className="font-medium text-green-400 hover:text-green-300 transition-colors">
          Regístrate
        </Link>
      </p>
    </div>
  )
}
