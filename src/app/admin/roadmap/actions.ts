'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Not authorised')
  return supabase
}

export async function addRoadmapItem(title: string, description: string): Promise<{ error?: string }> {
  try {
    const supabase = await requireAdmin()
    const { data: max } = await supabase.from('roadmap_items').select('position').order('position', { ascending: false }).limit(1).maybeSingle()
    const position = (max?.position ?? 0) + 1
    const { error } = await supabase.from('roadmap_items').insert({ title: title.trim(), description: description.trim() || null, position })
    if (error) return { error: error.message }
    revalidatePath('/admin/roadmap')
    return {}
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function updateRoadmapItem(id: string, title: string, description: string): Promise<{ error?: string }> {
  try {
    const supabase = await requireAdmin()
    const { error } = await supabase.from('roadmap_items').update({ title: title.trim(), description: description.trim() || null }).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/admin/roadmap')
    return {}
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function toggleRoadmapItem(id: string, completed: boolean): Promise<{ error?: string }> {
  try {
    const supabase = await requireAdmin()
    const { error } = await supabase.from('roadmap_items').update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    }).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/admin/roadmap')
    return {}
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function reorderRoadmapItems(ids: string[]): Promise<{ error?: string }> {
  try {
    const supabase = await requireAdmin()
    await Promise.all(
      ids.map((id, i) => supabase.from('roadmap_items').update({ position: i + 1 }).eq('id', id))
    )
    revalidatePath('/admin/roadmap')
    return {}
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function deleteRoadmapItem(id: string): Promise<{ error?: string }> {
  try {
    const supabase = await requireAdmin()
    const { error } = await supabase.from('roadmap_items').delete().eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/admin/roadmap')
    return {}
  } catch (e: any) {
    return { error: e.message }
  }
}
