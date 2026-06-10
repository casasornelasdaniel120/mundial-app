export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen flex items-center justify-center bg-gray-950 px-4 overflow-hidden">
      {/* Background glows — mirrors the landing page hero */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-green-900/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-emerald-900/15 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 text-center">
          <span className="text-4xl">⚽</span>
          <h1 className="mt-3 text-xl font-bold tracking-tight text-white">
            Mundial Fantasy 2026
          </h1>
        </div>

        {children}
      </div>
    </main>
  )
}
