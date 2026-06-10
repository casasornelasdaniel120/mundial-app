'use client'

import { useTransition } from 'react'
import { signOut } from '@/app/(auth)/actions'

export default function LogoutButton() {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(() => signOut())}
      disabled={isPending}
      className="text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50 transition-colors"
    >
      {isPending ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
