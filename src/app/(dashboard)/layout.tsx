import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'
import { russo, chakra } from '@/lib/fonts'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div
      className={`${russo.variable} ${chakra.variable} min-h-screen bg-gray-950`}
      style={{ fontFamily: 'var(--font-chakra), system-ui, sans-serif' }}
    >
      <header className="sticky top-0 z-10 border-b border-gray-800/50 bg-gray-950/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">

          {/* Brand + nav */}
          <div className="flex items-center gap-5">
            <Link href="/leagues" className="group flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-green-600/25 bg-green-600/10 transition-colors group-hover:bg-green-600/20">
                <svg className="h-4 w-4 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  <path d="M2 12h20" />
                </svg>
              </div>
              <span
                className="hidden text-[13px] tracking-[0.1em] text-white uppercase sm:block"
                style={{ fontFamily: 'var(--font-russo)' }}
              >
                Mundial Fantasy
              </span>
            </Link>

            <div className="h-4 w-px bg-gray-800" />

            <nav>
              <Link
                href="/leagues"
                className="rounded-md px-2.5 py-1 text-[11px] font-medium uppercase tracking-widest text-gray-500 transition-colors hover:bg-white/5 hover:text-white"
              >
                Ligas
              </Link>
            </nav>
          </div>

          {/* User + logout */}
          <div className="flex items-center gap-3">
            <span className="hidden max-w-[160px] truncate text-[11px] text-gray-600 sm:block">
              {user.email}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  )
}
