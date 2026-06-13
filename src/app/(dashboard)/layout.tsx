import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">

          {/* Brand + nav */}
          <div className="flex items-center gap-5">
            <Link href="/leagues" className="group flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#006847]/20 bg-green-50 transition-colors group-hover:bg-green-100">
                <svg className="h-4 w-4" style={{ color: '#006847' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  <path d="M2 12h20" />
                </svg>
              </div>
              <span
                className="hidden text-[13px] tracking-[0.1em] text-stone-800 uppercase sm:block"
                style={{ fontFamily: 'var(--font-russo)' }}
              >
                Mundial Fantasy
              </span>
            </Link>

            <div className="h-4 w-px bg-stone-200" />

            <nav>
              <Link
                href="/leagues"
                className="rounded-md px-2.5 py-1 text-[11px] font-medium uppercase tracking-widest text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
              >
                Ligas
              </Link>
            </nav>
          </div>

          {/* User + logout */}
          <div className="flex items-center gap-3">
            <span className="hidden max-w-[160px] truncate text-[11px] text-stone-400 sm:block">
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
