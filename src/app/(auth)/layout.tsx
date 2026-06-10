export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-950 via-green-900 to-emerald-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-5xl">⚽</span>
          <h1 className="mt-3 text-2xl font-bold text-white tracking-tight">
            World Cup Fantasy 2026
          </h1>
        </div>
        {children}
      </div>
    </main>
  )
}
