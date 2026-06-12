'use client'

import { useTransition } from 'react'
import { signOut } from '@/app/(auth)/actions'

export default function LogoutButton() {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(() => signOut())}
      disabled={isPending}
      className="text-sm font-medium text-gray-400 hover:text-gray-100 disabled:opacity-50 transition-colors"
    >
      {isPending ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
