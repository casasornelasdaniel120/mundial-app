import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="sticky top-0 z-10 border-b border-gray-800/60 bg-gray-900/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/leagues" className="flex items-center gap-2 font-bold text-white">
              <span className="text-xl">⚽</span>
              <span className="hidden text-sm sm:inline">Mundial Fantasy</span>
            </Link>
            <nav className="flex items-center gap-4">
              <Link
                href="/leagues"
                className="text-sm font-medium text-gray-400 transition-colors hover:text-gray-100"
              >
                Ligas
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden max-w-[180px] truncate text-xs text-gray-500 sm:block">
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
