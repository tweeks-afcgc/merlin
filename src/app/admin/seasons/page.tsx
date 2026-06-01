import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { addSeason } from './actions'
import { SetCurrentButton } from './SeasonActions'
import AppShell from '@/components/AppShell'

export const dynamic = 'force-dynamic'

function AdminNav() {
  return (
    <div className="flex gap-4 text-sm mb-8 border-b border-gray-200 pb-4">
      <Link href="/admin" className="text-gray-400 hover:text-gray-600">Overview</Link>
      <Link href="/admin/seasons" className="text-red-800 font-semibold border-b-2 border-red-800 pb-4 -mb-4">Seasons</Link>
      <Link href="/admin/teams" className="text-gray-400 hover:text-gray-600">Teams</Link>
      <Link href="/admin/users" className="text-gray-400 hover:text-gray-600">Users</Link>
    </div>
  )
}

export default async function AdminSeasonsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: seasons } = await supabase
    .from('seasons').select('*').order('start_date', { ascending: false })

  async function handleAdd(formData: FormData) {
    'use server'
    await addSeason(formData)
  }

  return (
    <AppShell userName={profile?.full_name ?? null} isAdmin>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <AdminNav />

        <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Add season</h2>
          <form action={handleAdd} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input name="name" placeholder="e.g. 2026/2027" required
              className="sm:col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700" />
            <input name="start_date" type="date" required
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700" />
            <input name="end_date" type="date" required
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700" />
            <button type="submit"
              className="sm:col-span-4 bg-red-800 hover:bg-red-900 text-white font-semibold py-2 rounded-lg text-sm transition">
              Add season
            </button>
          </form>
        </div>

        <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Seasons</h2>
          {!seasons?.length ? (
            <p className="text-sm text-gray-400">No seasons added yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide pb-3">Season</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide pb-3">Start</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide pb-3">End</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide pb-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {seasons.map(s => (
                  <tr key={s.id}>
                    <td className="py-3 pr-4 font-medium text-gray-900">{s.name}</td>
                    <td className="py-3 pr-4 text-gray-600">{new Date(s.start_date).toLocaleDateString('en-GB')}</td>
                    <td className="py-3 pr-4 text-gray-600">{new Date(s.end_date).toLocaleDateString('en-GB')}</td>
                    <td className="py-3"><SetCurrentButton seasonId={s.id} isCurrent={s.is_current} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  )
}
