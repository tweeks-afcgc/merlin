import { createAdminClient } from '@/lib/supabase/admin'
import InjuryReportForm from './InjuryReportForm'

export const dynamic = 'force-dynamic'

export default async function InjuryReportPage() {
  const supabase = createAdminClient()

  const [{ data: venues }, { data: teams }] = await Promise.all([
    supabase.from('venues').select('id, name').order('name'),
    supabase.from('teams').select('id, name').order('name'),
  ])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-red-800 text-white px-4 py-4">
        <div className="max-w-xl mx-auto">
          <p className="text-xs font-semibold text-red-200 uppercase tracking-wide mb-0.5">AFC Greenways</p>
          <h1 className="text-xl font-bold">Injury / Incident Report</h1>
        </div>
      </header>
      <div className="max-w-xl mx-auto px-4 py-6">
        <InjuryReportForm
          venues={(venues ?? []).map(v => ({ id: v.id, name: v.name }))}
          teams={(teams ?? []).map(t => ({ id: t.id, name: t.name }))}
        />
      </div>
    </div>
  )
}
