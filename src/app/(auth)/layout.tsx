import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Aztec diamond background pattern */}
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <svg className="absolute inset-0 h-full w-full" style={{ color: '#006847', opacity: 0.025 }}>
          <defs>
            <pattern id="aztec-auth" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
              <rect x="10" y="1" width="8" height="2" fill="currentColor"/>
              <rect x="1" y="10" width="2" height="8" fill="currentColor"/>
              <rect x="25" y="10" width="2" height="8" fill="currentColor"/>
              <rect x="10" y="25" width="8" height="2" fill="currentColor"/>
              <rect x="10" y="10" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1"/>
              <circle cx="14" cy="14" r="1.5" fill="currentColor"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#aztec-auth)" />
        </svg>
      </div>

      {/* Brand */}
      <div className="relative z-10 mb-8 text-center">
        <Link href="/" className="inline-flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-[#006847]/20 bg-white shadow-sm">
            <svg className="h-8 w-8" style={{ color: '#006847' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              <path d="M2 12h20" />
            </svg>
          </div>
          <div>
            <p className="text-[18px] tracking-[0.12em] text-stone-900 uppercase" style={{ fontFamily: 'var(--font-russo)' }}>
              Mundial Fantasy
            </p>
            <p className="mt-0.5 text-[10px] tracking-[0.3em] uppercase font-medium" style={{ color: '#006847' }}>
              2026 · México
            </p>
          </div>
        </Link>
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {children}
      </div>
    </main>
  )
}
