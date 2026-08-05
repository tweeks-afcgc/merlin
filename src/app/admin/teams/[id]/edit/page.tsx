'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import AppShell from '@/components/AppShell'
import BackButton from '@/components/BackButton'
import { createClient } from '@/lib/supabase/client'

export default function EditTeamPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('from') ?? '/admin/teams'
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [type, setType] = useState<'senior' | 'junior'>('senior')
  const [name, setName] = useState('')
  const [foundingAgeGroup, setFoundingAgeGroup] = useState('')
  const [foundingSeasonName, setFoundingSeasonName] = useState('')
  const [format, setFormat] = useState('')

  // Home kit
  const [kitJersey, setKitJersey] = useState('')
  const [kitShorts, setKitShorts] = useState('')
  const [kitSocks, setKitSocks] = useState('')
  const [homeKitImageUrl, setHomeKitImageUrl] = useState<string | null>(null)
  const [homeUploading, setHomeUploading] = useState(false)
  const homeFileRef = useRef<HTMLInputElement>(null)

  // Away kit
  const [hasAwayKit, setHasAwayKit] = useState(false)
  const [awayJersey, setAwayJersey] = useState('')
  const [awayShorts, setAwayShorts] = useState('')
  const [awaySocks, setAwaySocks] = useState('')
  const [awayKitImageUrl, setAwayKitImageUrl] = useState<string | null>(null)
  const [awayUploading, setAwayUploading] = useState(false)
  const awayFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const { data: team } = await supabase.from('teams').select('*').eq('id', id).single()
      if (!team) { router.push('/admin/teams'); return }

      setType(team.type)
      setName(team.name)
      setFoundingAgeGroup(team.founding_age_group?.toString() ?? '')
      setKitJersey(team.kit_jersey ?? '')
      setKitShorts(team.kit_shorts ?? '')
      setKitSocks(team.kit_socks ?? '')
      setHomeKitImageUrl((team as any).home_kit_image_url ?? null)
      setFormat(team.format ?? '')

      const awayJ = (team as any).away_kit_jersey ?? ''
      const awayS = (team as any).away_kit_shorts ?? ''
      const awayK = (team as any).away_kit_socks ?? ''
      const awayImg = (team as any).away_kit_image_url ?? null
      setAwayJersey(awayJ)
      setAwayShorts(awayS)
      setAwaySocks(awayK)
      setAwayKitImageUrl(awayImg)
      if (awayJ || awayS || awayK || awayImg) setHasAwayKit(true)

      if (team.founding_season_id) {
        const { data: season } = await supabase.from('seasons').select('name').eq('id', team.founding_season_id).single()
        setFoundingSeasonName(season?.name ?? '')
      }
      setLoading(false)
    }
    load()
  }, [id])

  async function handleImageUpload(file: File, kitType: 'home' | 'away') {
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${id}/${kitType}.${ext}`
    if (kitType === 'home') setHomeUploading(true)
    else setAwayUploading(true)

    const { error: upErr } = await supabase.storage
      .from('kit-images')
      .upload(path, file, { upsert: true })

    if (upErr) {
      setError(upErr.message)
      setHomeUploading(false)
      setAwayUploading(false)
      return
    }

    const { data } = supabase.storage.from('kit-images').getPublicUrl(path)
    // Add cache-busting param so re-uploads show immediately
    const url = `${data.publicUrl}?t=${Date.now()}`
    if (kitType === 'home') { setHomeKitImageUrl(url); setHomeUploading(false) }
    else { setAwayKitImageUrl(url); setAwayUploading(false) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const updates: Record<string, unknown> = {
      name,
      kit_jersey: kitJersey.trim() || null,
      kit_shorts: kitShorts.trim() || null,
      kit_socks: kitSocks.trim() || null,
      home_kit_image_url: homeKitImageUrl,
      away_kit_jersey: hasAwayKit ? (awayJersey.trim() || null) : null,
      away_kit_shorts: hasAwayKit ? (awayShorts.trim() || null) : null,
      away_kit_socks: hasAwayKit ? (awaySocks.trim() || null) : null,
      away_kit_image_url: hasAwayKit ? awayKitImageUrl : null,
    }
    if (type === 'junior') {
      updates.founding_age_group = parseInt(foundingAgeGroup)
      updates.format = format || null
    }

    const { error } = await supabase.from('teams').update(updates).eq('id', id)
    if (error) { setError(error.message); setSaving(false) }
    else router.push(returnTo)
  }

  function KitFields({
    jersey, setJersey,
    shorts, setShorts,
    socks, setSocks,
    imageUrl, onUpload, uploading, fileRef,
    kitType,
  }: {
    jersey: string; setJersey: (v: string) => void
    shorts: string; setShorts: (v: string) => void
    socks: string; setSocks: (v: string) => void
    imageUrl: string | null
    onUpload: (f: File) => void
    uploading: boolean
    fileRef: React.RefObject<HTMLInputElement>
    kitType: 'home' | 'away'
  }) {
    return (
      <div className="space-y-3">
        {/* Image upload */}
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Kit image <span className="font-normal text-gray-400">(optional — replaces colour circles)</span></label>
          {imageUrl ? (
            <div className="flex items-center gap-3">
              <img src={imageUrl} alt="Kit" className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="text-xs font-semibold text-red-800 hover:underline"
                >
                  Replace image
                </button>
                <button
                  type="button"
                  onClick={() => { if (kitType === 'home') setHomeKitImageUrl(null); else setAwayKitImageUrl(null) }}
                  className="text-xs text-gray-400 hover:text-red-600"
                >
                  Remove image
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 border border-dashed border-gray-300 hover:border-red-400 text-sm text-gray-500 hover:text-red-800 rounded-lg px-4 py-2.5 transition disabled:opacity-60"
            >
              {uploading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Uploading…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M4 16l4-4 4 4m0 0l4-4 4 4M12 12V4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Upload kit image
                </>
              )}
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f) }}
          />
        </div>

        {/* Colour fields */}
        <div className="space-y-2">
          <p className="text-xs text-gray-400">Kit colours <span className="font-normal">(used if no image uploaded)</span></p>
          {[
            { label: 'Jersey', value: jersey, set: setJersey, placeholder: 'e.g. Red & Black Stripes' },
            { label: 'Shorts', value: shorts, set: setShorts, placeholder: 'e.g. Black' },
            { label: 'Socks',  value: socks,  set: setSocks,  placeholder: 'e.g. Red' },
          ].map(({ label, value, set, placeholder }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="w-14 text-sm text-gray-500 flex-shrink-0">{label}</span>
              <input
                type="text"
                value={value}
                onChange={e => set(e.target.value)}
                placeholder={placeholder}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <AppShell>
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="mb-6"><BackButton /></div>
        <h1 className="text-xl font-bold text-gray-900 mb-6">Edit team</h1>

        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : (
          <>
            <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-8 mb-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {type === 'junior' ? 'Team nickname' : 'Team name'}
                  </label>
                  <input
                    type="text" required value={name} onChange={e => setName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                  />
                </div>

                {type === 'junior' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Age group in {foundingSeasonName || 'founding season'}
                      </label>
                      <input
                        type="number" min={5} max={18} required
                        value={foundingAgeGroup} onChange={e => setFoundingAgeGroup(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Age group in the founding season — all other seasons are calculated from this.
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                      <select
                        value={format} onChange={e => setFormat(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                      >
                        <option value="">Not specified</option>
                        {['3v3','5v5','7v7','9v9','11v11'].map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* Home kit */}
                <div className="border-t border-gray-100 pt-5">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Home kit</p>
                  <KitFields
                    jersey={kitJersey} setJersey={setKitJersey}
                    shorts={kitShorts} setShorts={setKitShorts}
                    socks={kitSocks}   setSocks={setKitSocks}
                    imageUrl={homeKitImageUrl}
                    onUpload={f => handleImageUpload(f, 'home')}
                    uploading={homeUploading}
                    fileRef={homeFileRef}
                    kitType="home"
                  />
                </div>

                {/* Away kit */}
                <div className="border-t border-gray-100 pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-700">Away kit</p>
                    <button
                      type="button"
                      onClick={() => { setHasAwayKit(v => !v); if (hasAwayKit) { setAwayJersey(''); setAwayShorts(''); setAwaySocks(''); setAwayKitImageUrl(null) } }}
                      className={`text-xs font-semibold px-3 py-1 rounded-full transition ${hasAwayKit ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-red-50 text-red-800 hover:bg-red-100'}`}
                    >
                      {hasAwayKit ? 'Remove away kit' : '+ Add away kit'}
                    </button>
                  </div>
                  {hasAwayKit && (
                    <KitFields
                      jersey={awayJersey} setJersey={setAwayJersey}
                      shorts={awayShorts} setShorts={setAwayShorts}
                      socks={awaySocks}   setSocks={setAwaySocks}
                      imageUrl={awayKitImageUrl}
                      onUpload={f => handleImageUpload(f, 'away')}
                      uploading={awayUploading}
                      fileRef={awayFileRef}
                      kitType="away"
                    />
                  )}
                  {!hasAwayKit && (
                    <p className="text-xs text-gray-400">No away kit added.</p>
                  )}
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => router.push(returnTo)}
                    className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-2.5 rounded-lg text-sm transition">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving || homeUploading || awayUploading}
                    className="flex-1 bg-red-800 hover:bg-red-900 text-white font-semibold py-2.5 rounded-lg text-sm transition disabled:opacity-60">
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-800">
              Team staff (managers, coaches, assistants) are now managed via <strong>Admin → Volunteers</strong>. Assign a team role to a volunteer there to give them access to this team.
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
