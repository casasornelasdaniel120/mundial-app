import { russo, chakra } from './fonts'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      className={`${russo.variable} ${chakra.variable} relative min-h-screen flex items-center justify-center bg-[#060a0d] px-4 overflow-hidden`}
      style={{ fontFamily: 'var(--font-chakra), system-ui, sans-serif' }}
    >
      {/* ── Pitch pattern ── */}
      <svg
        className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.035]"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Centre circle */}
        <circle cx="50%" cy="50%" r="160" fill="none" stroke="#22c55e" strokeWidth="2" />
        {/* Centre spot */}
        <circle cx="50%" cy="50%" r="5" fill="#22c55e" />
        {/* Halfway line */}
        <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#22c55e" strokeWidth="2" />
        {/* Penalty arc top */}
        <path d="M calc(50% - 100px) 0 Q 50% 80px calc(50% + 100px) 0" fill="none" stroke="#22c55e" strokeWidth="1.5" />
        {/* Penalty arc bottom */}
        <path d="M calc(50% - 100px) 100% Q 50% calc(100% - 80px) calc(50% + 100px) 100%" fill="none" stroke="#22c55e" strokeWidth="1.5" />
        {/* Corner arcs */}
        <path d="M 0 0 Q 20 0 20 20" fill="none" stroke="#22c55e" strokeWidth="1.5" />
        <path d="M 100% 0 Q calc(100% - 20px) 0 calc(100% - 20px) 20px" fill="none" stroke="#22c55e" strokeWidth="1.5" />
        <path d="M 0 100% Q 20 100% 20 calc(100% - 20px)" fill="none" stroke="#22c55e" strokeWidth="1.5" />
        <path d="M 100% 100% Q calc(100% - 20px) 100% calc(100% - 20px) calc(100% - 20px)" fill="none" stroke="#22c55e" strokeWidth="1.5" />
      </svg>

      {/* ── Atmospheric glows ── */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-48 -left-32 h-[520px] w-[520px] rounded-full bg-green-900/20 blur-[130px]" />
        <div className="absolute -bottom-48 -right-32 h-[440px] w-[440px] rounded-full bg-emerald-900/15 blur-[110px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[280px] w-[600px] rounded-full bg-green-950/30 blur-[90px]" />
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 w-full max-w-sm">

        {/* Brand */}
        <div className="mb-8 text-center">
          {/* Ball icon */}
          <div className="mx-auto mb-5 w-14 h-14 rounded-2xl bg-green-600/10 border border-green-600/20 flex items-center justify-center shadow-lg shadow-green-900/20">
            <svg className="w-7 h-7 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              <path d="M2 12h20" />
            </svg>
          </div>

          <h1
            className="text-[22px] font-normal text-white tracking-[0.12em] uppercase"
            style={{ fontFamily: 'var(--font-russo)' }}
          >
            Mundial Fantasy
          </h1>
          <p
            className="mt-1 text-[11px] tracking-[0.35em] uppercase text-green-400/80 font-medium"
          >
            2026 · México
          </p>
        </div>

        {children}
      </div>
    </main>
  )
}
