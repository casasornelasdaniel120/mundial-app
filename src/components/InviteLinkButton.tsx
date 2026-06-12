'use client'

import { useState } from 'react'

export default function InviteLinkButton({ inviteCode }: { inviteCode: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    const url = `${window.location.origin}/join/${inviteCode}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      onClick={handleCopy}
      className="-mx-1 -my-2.5 px-1 py-2.5 text-xs font-medium text-green-400 transition-colors hover:text-green-300"
    >
      {copied ? '✓ Enlace copiado' : '🔗 Copiar enlace de invitación'}
    </button>
  )
}
