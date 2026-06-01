import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/auth/actions'

export const dynamic = 'force-dynamic'

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/signin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, dob')
    .eq('id', user.id)
    .single()

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-green-700">Merlin</h1>
          <form action={signOut}>
            <button
              type="submit"
              className="text-sm text-gray-500 hover:text-red-600 transition"
            >
              Sign out
            </button>
          </form>
        </div>

        <div className="bg-white shadow rounded-xl p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xl font-bold">
              {profile?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{profile?.full_name ?? '—'}</h2>
              <p className="text-sm text-gray-500">Member</p>
            </div>
          </div>

          <dl className="space-y-4 mb-6">
            <div>
              <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">Full name</dt>
              <dd className="mt-1 text-sm text-gray-900">{profile?.full_name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">Email address</dt>
              <dd className="mt-1 text-sm text-gray-900">{profile?.email ?? user.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">Date of birth</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(profile?.dob ?? null)}</dd>
            </div>
          </dl>

          <Link
            href="/profile/edit"
            className="block w-full text-center border border-green-700 text-green-700 hover:bg-green-50 font-semibold py-2.5 rounded-lg text-sm transition"
          >
            Edit profile
          </Link>
        </div>
      </div>
    </main>
  )
}
