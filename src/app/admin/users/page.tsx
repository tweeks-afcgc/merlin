import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import RoleSelect from './RoleSelect'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function AdminNav() {
  return (
    <div className="flex gap-4 text-sm mb-8">
      <Link href="/admin/seasons" className="text-gray-500 hover:text-gray-700">Seasons</Link>
      <Link href="/admin/teams" className="text-gray-500 hover:text-gray-700">Teams</Link>
      <Link href="/admin/users" className="text-green-700 font-semibold border-b-2 border-green-700 pb-0.5">Users</Link>
    </div>
  )
}

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/signin')

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (currentProfile?.role !== 'admin') redirect('/profile')

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, created_at')
    .order('created_at', { ascending: true })

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-green-700">Merlin</h1>
          <Link href="/profile" className="text-sm text-gray-500 hover:text-gray-700 transition">
            Back to profile
          </Link>
        </div>

        <AdminNav />

        <div className="bg-white shadow rounded-xl p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">User management</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide pb-3">Name</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide pb-3">Email</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide pb-3">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {profiles?.map(profile => (
                  <tr key={profile.id}>
                    <td className="py-3 pr-4 text-gray-900">{profile.full_name ?? '—'}</td>
                    <td className="py-3 pr-4 text-gray-600">{profile.email ?? '—'}</td>
                    <td className="py-3">
                      <RoleSelect
                        userId={profile.id}
                        currentRole={profile.role}
                        isSelf={profile.id === user.id}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}
