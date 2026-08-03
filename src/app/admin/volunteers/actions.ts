'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function addVolunteer(formData: FormData) {
  const supabase = await createClient()
  const firstName = (formData.get('first_name') as string).trim()
  const lastName = (formData.get('last_name') as string).trim()
  if (!firstName || !lastName) return { error: 'First and last name are required' }

  const isAppUser = formData.get('is_app_user') === 'true'
  const email = (formData.get('email') as string | null)?.trim() || null
  const userRole = (formData.get('user_role') as string | null) || null
  const isReferee = formData.get('is_referee') === 'true'

  if (isAppUser && !email) return { error: 'Email is required for app users' }

  const { data: volunteer, error } = await supabase
    .from('volunteers')
    .insert({ first_name: firstName, last_name: lastName, email: isAppUser ? email : null, is_app_user: isAppUser, user_role: isAppUser ? userRole : null, is_referee: isReferee })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Invite as app user via Supabase admin API
  if (isAppUser && email) {
    const adminClient = createAdminClient()
    await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name: `${firstName} ${lastName}`, role: userRole ?? 'standard', is_referee: isReferee },
    })
  }

  revalidatePath('/admin/volunteers')
  return { id: volunteer.id }
}

export async function updateVolunteer(volunteerId: string, formData: FormData) {
  const supabase = await createClient()
  const firstName = (formData.get('first_name') as string).trim()
  const lastName = (formData.get('last_name') as string).trim()
  if (!firstName || !lastName) return { error: 'First and last name are required' }

  const isAppUser = formData.get('is_app_user') === 'true'
  const email = (formData.get('email') as string | null)?.trim() || null
  const userRole = (formData.get('user_role') as string | null) || null
  const isReferee = formData.get('is_referee') === 'true'

  const { error } = await supabase
    .from('volunteers')
    .update({ first_name: firstName, last_name: lastName, email: isAppUser ? email : null, is_app_user: isAppUser, user_role: isAppUser ? userRole : null, is_referee: isReferee })
    .eq('id', volunteerId)

  if (error) return { error: error.message }
  revalidatePath('/admin/volunteers')
}

export async function deleteVolunteer(volunteerId: string) {
  const supabase = await createClient()
  await supabase.from('volunteers').delete().eq('id', volunteerId)
  revalidatePath('/admin/volunteers')
}

export async function addVolunteerRole(volunteerId: string, formData: FormData) {
  const supabase = await createClient()
  const roleType = formData.get('role_type') as string
  const roleName = (formData.get('role_name') as string).trim()
  const teamId = (formData.get('team_id') as string | null) || null

  if (!roleName) return { error: 'Role name is required' }
  if (roleType === 'team' && !teamId) return { error: 'Team is required for team roles' }

  const { error } = await supabase.from('volunteer_roles').insert({
    volunteer_id: volunteerId,
    role_type: roleType,
    role_name: roleName,
    team_id: roleType === 'team' ? teamId : null,
  })

  if (error) return { error: error.message }
  revalidatePath('/admin/volunteers')
}

export async function removeVolunteerRole(roleId: string) {
  const supabase = await createClient()
  await supabase.from('volunteer_roles').delete().eq('id', roleId)
  revalidatePath('/admin/volunteers')
}

export async function createVolunteerFromProfile(formData: FormData) {
  const supabase = await createClient()
  const profileId = formData.get('profile_id') as string
  const firstName = (formData.get('first_name') as string).trim()
  const lastName = (formData.get('last_name') as string).trim()
  const email = (formData.get('email') as string | null)?.trim() || null
  const userRole = (formData.get('user_role') as string | null) || null
  const isReferee = formData.get('is_referee') === 'true'

  if (!firstName || !lastName) return { error: 'First and last name are required' }

  const { data: volunteer, error } = await supabase
    .from('volunteers')
    .insert({ profile_id: profileId, first_name: firstName, last_name: lastName, email, is_app_user: true, user_role: userRole, is_referee: isReferee })
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/admin/volunteers')
  return { id: volunteer.id }
}
