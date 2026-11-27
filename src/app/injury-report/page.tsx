import { createAdminClient } from '@/lib/supabase/admin'
import InjuryReportForm from './InjuryReportForm'
import { computeAgeGroup, teamDisplayName, type Season } from '@/lib/teamUtils'

export const dynamic = 'force-dynamic'

export default async function InjuryReportPage() {
  const supabase = createAdminClient()

  const [{ data: venues }, { data: rawTeams }, { data: seasons }] = await Promise.all([
    supabase.from('venues').select('id, name').order('name'),
    supabase.from('teams').select('id, name, type, founding_age_group, founding_season_id, age_group, nickname').order('name'),
    supabase.from('seasons').select('id, name, start_date, is_current'),
  ])

  // Sort: junior teams by age ascending (youngest = smallest number first), seniors at bottom
  const teams = (rawTeams ?? [])
    .map(t => {
      const age = t.type === 'junior' ? (computeAgeGroup(t, (seasons ?? []) as Season[]) ?? 999) : null
      const label = teamDisplayName(t, (seasons ?? []) as Season[])
      return { id: t.id, name: label, type: t.type as string, age }
    })
    .sort((a, b) => {
      if (a.type === 'junior' && b.type !== 'junior') return -1
      if (a.type !== 'junior' && b.type === 'junior') return 1
      if (a.type === 'junior' && b.type === 'junior') return (a.age ?? 999) - (b.age ?? 999)
      return a.name.localeCompare(b.name)
    })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-red-800 text-white px-4 py-4">
        <div className="max-w-xl mx-auto">
          <p className="text-xs font-semibold text-red-200 uppercase tracking-wide mb-0.5">AFC Green Court</p>
          <h1 className="text-xl font-bold">Injury / Incident Report</h1>
        </div>
      </header>
      <div className="max-w-xl mx-auto px-4 py-6">
        <InjuryReportForm
          venues={(venues ?? []).map(v => ({ id: v.id, name: v.name }))}
          teams={teams.map(t => ({ id: t.id, name: t.name }))}
        />
      </div>
    </div>
  )
}
