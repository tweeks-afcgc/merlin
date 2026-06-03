import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import RoleSelect from './RoleSelect'
import RefereeToggle from './RefereeToggle'
import AppShell from '@/components/AppShell'
import AdminNav from '@/components/AdminNav'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: profiles } = await supabase
    .from('profiles').select('id, full_name, email, role, is_referee, created_at').order('created_at', { ascending: true })

  return (
    <AppShell userName={profile?.full_name ?? null} isAdmin>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <AdminNav />

        <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Users</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide pb-3">Name</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide pb-3">Email</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide pb-3">Role</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide pb-3">Referee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {profiles?.map(p => (
                <tr key={p.id}>
                  <td className="py-3 pr-4 text-gray-900">{p.full_name ?? '—'}</td>
                  <td className="py-3 pr-4 text-gray-600">{p.email ?? '—'}</td>
                  <td className="py-3 pr-4">
                    <RoleSelect userId={p.id} currentRole={p.role} isSelf={p.id === user.id} />
                  </td>
                  <td className="py-3">
                    <RefereeToggle userId={p.id} isReferee={p.is_referee ?? false} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  )
}
