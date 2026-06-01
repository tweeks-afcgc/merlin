import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase
    .from('profiles').select('full_name, role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const [
    { data: currentSeason },
    { data: teams },
    { count: userCount },
  ] = await Promise.all([
    supabase.from('seasons').select('*').eq('is_current', true).maybeSingle(),
    supabase.from('teams').select('id, type'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
  ])

  const seniorCount = teams?.filter(t => t.type === 'senior').length ?? 0
  const juniorCount = teams?.filter(t => t.type === 'junior').length ?? 0

  return (
    <AppShell userName={profile?.full_name ?? null} isAdmin>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin</h1>
          <p className="text-sm text-gray-400 mt-1">Club management overview.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Current season */}
          <Link
            href="/admin/seasons"
            className="group bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md hover:border-red-200 transition"
          >
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Current season
            </p>
            <p className="text-2xl font-bold text-gray-900 group-hover:text-red-800 transition leading-tight">
              {currentSeason?.name ?? 'â€”'}
            </p>
            {currentSeason && (
              <p className="text-xs text-gray-400 mt-1">
                Ends {new Date(currentSeason.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            )}
            <p className="text-xs text-red-700 font-medium mt-4">Manage seasons â†’</p>
          </Link>

          {/* Teams */}
          <Link
            href="/admin/teams"
            className="group bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md hover:border-red-200 transition"
          >
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Teams
            </p>
            <p className="text-2xl font-bold text-gray-900 group-hover:text-red-800 transition">
              {(teams?.length ?? 0)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {seniorCount} senior Â· {juniorCount} junior
            </p>
            <p className="text-xs text-red-700 font-medium mt-4">Add / edit teams â†’</p>
          </Link>

          {/* Users */}
          <Link
            href="/admin/users"
            className="group bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md hover:border-red-200 transition"
          >
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Users
            </p>
            <p className="text-2xl font-bold text-gray-900 group-hover:text-red-800 transition">
              {userCount ?? 'â€”'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Registered members</p>
            <p className="text-xs text-red-700 font-medium mt-4">Manage users â†’</p>
          </Link>

        </div>
      </div>
    </AppShell>
  )
}

