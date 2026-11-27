'use server'

import { createAdminClient } from '@/lib/supabase/admin'

const REPORT_PIN = process.env.INJURY_REPORT_PIN ?? '1234'

export async function submitInjuryReport(pin: string, data: {
  reporter_name: string
  reporter_role: string
  reporter_team_id: string | null
  reporter_contact: string
  incident_date: string
  incident_time: string | null
  venue_id: string | null
  venue_label: string | null
  activity: string | null
  opposition: string | null
  injured_name: string
  injured_role: string | null
  is_under_18: boolean | null
  parent_carer_present: boolean | null
  what_happened: string
  body_part: string | null
  injury_type: string | null
  injury_description: string | null
  first_aid_given: string | null
  first_aid_by: string | null
  defib_used: boolean | null
  ambulance_called: boolean | null
  outcome: string | null
  parent_carer_informed: boolean | null
  parent_carer_informed_when: string | null
  suspected_concussion: boolean | null
}) {
  if (pin !== REPORT_PIN) return { error: 'Incorrect PIN. Please check with your club admin.' }

  const supabase = createAdminClient()
  const { error } = await supabase.from('injury_logs').insert({
    ...data,
    reporter_team_id: data.reporter_team_id || null,
    venue_id: data.venue_id || null,
  })

  if (error) return { error: error.message }
  return { success: true }
}
