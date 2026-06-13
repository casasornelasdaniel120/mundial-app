'use client'

import { useTransition } from 'react'
import { signOut } from '@/app/(auth)/actions'

export default function LogoutButton() {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(() => signOut())}
      disabled={isPending}
      className="text-sm font-medium text-stone-400 hover:text-stone-700 disabled:opacity-50 transition-colors"
    >
      {isPending ? 'Saliendo…' : 'Cerrar sesión'}
    </button>
  )
}
