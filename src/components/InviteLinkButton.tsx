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
      className="group flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-stone-500 transition-all duration-200 hover:text-[#006847] cursor-pointer"
      aria-label="Copiar enlace de invitación"
    >
      {copied ? (
        <>
          <svg className="h-3.5 w-3.5" style={{ color: '#006847' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span style={{ color: '#006847' }}>Copiado</span>
        </>
      ) : (
        <>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          Copiar invitación
        </>
      )}
    </button>
  )
}
