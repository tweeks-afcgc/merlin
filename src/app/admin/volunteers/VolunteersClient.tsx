'use client'

import { useState } from 'react'
import { addVolunteer, updateVolunteer, deleteVolunteer, addVolunteerRole, removeVolunteerRole } from './actions'

type VolunteerRole = { id: string; role_type: string; role_name: string; team_id: string | null; teamName: string | null }
type Volunteer = {
  id: string; first_name: string; last_name: string
  email: string | null; is_app_user: boolean; user_role: string | null; is_referee: boolean
  roles: VolunteerRole[]
}
type Team = { id: string; displayName: string }

const USER_ROLES = [
  { value: 'standard', label: 'Standard' },
  { value: 'fixture_secretary', label: 'Fixture Secretary' },
  { value: 'admin', label: 'Admin' },
]

function VolunteerForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: Partial<Volunteer>
  onSave: (fd: FormData) => Promise<void>
  onCancel: () => void
  saving: boolean
}) {
  const [firstName, setFirstName] = useState(initial?.first_name ?? '')
  const [lastName, setLastName] = useState(initial?.last_name ?? '')
  const [isAppUser, setIsAppUser] = useState(initial?.is_app_user ?? false)
  const [email, setEmail] = useState(initial?.email ?? '')
  const [userRole, setUserRole] = useState(initial?.user_role ?? 'standard')
  const [isReferee, setIsReferee] = useState(initial?.is_referee ?? false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData()
    fd.set('first_name', firstName)
    fd.set('last_name', lastName)
    fd.set('is_app_user', isAppUser ? 'true' : 'false')
    fd.set('email', email)
    fd.set('user_role', userRole)
    fd.set('is_referee', isReferee ? 'true' : 'false')
    await onSave(fd)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-3">
        <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" required
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700" />
        <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" required
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700" />
      </div>

      {/* Referee */}
      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input type="checkbox" checked={isReferee} onChange={e => setIsReferee(e.target.checked)}
          className="rounded border-gray-300 text-red-800 focus:ring-red-700" />
        Referee
      </label>

      {/* App user toggle */}
      <div className="border border-gray-100 rounded-xl p-4 space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
          <input type="checkbox" checked={isAppUser} onChange={e => setIsAppUser(e.target.checked)}
            className="rounded border-gray-300 text-red-800 focus:ring-red-700" />
          App user <span className="font-normal text-gray-400">(can log in to Merlin)</span>
        </label>
        {isAppUser && (
          <div className="space-y-3 pl-6">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="email@example.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700" />
              {!initial?.id && <p className="text-xs text-gray-400 mt-1">An invitation email will be sent to this address.</p>}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">User role</label>
              <select value={userRole} onChange={e => setUserRole(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700">
                {USER_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={saving}
          className="bg-red-800 hover:bg-red-900 text-white font-semibold px-5 py-2 rounded-lg text-sm transition disabled:opacity-60">
          {saving ? 'Saving…' : initial?.id ? 'Save changes' : 'Add volunteer'}
        </button>
        <button type="button" onClick={onCancel}
          className="border border-gray-300 text-gray-600 hover:bg-gray-50 font-semibold px-4 py-2 rounded-lg text-sm transition">
          Cancel
        </button>
      </div>
    </form>
  )
}

function RoleForm({ volunteerId, teams, onAdded }: { volunteerId: string; teams: Team[]; onAdded: (role: VolunteerRole) => void }) {
  const [roleType, setRoleType] = useState<'club' | 'team'>('club')
  const [roleName, setRoleName] = useState('')
  const [teamId, setTeamId] = useState(teams[0]?.id ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd() {
    if (!roleName.trim()) return
    setSaving(true)
    setError(null)
    const fd = new FormData()
    fd.set('role_type', roleType)
    fd.set('role_name', roleName.trim())
    if (roleType === 'team') fd.set('team_id', teamId)
    const result = await addVolunteerRole(volunteerId, fd)
    if (result?.error) { setError(result.error); setSaving(false); return }
    const team = teams.find(t => t.id === teamId)
    onAdded({
      id: crypto.randomUUID(),
      role_type: roleType,
      role_name: roleName.trim(),
      team_id: roleType === 'team' ? teamId : null,
      teamName: roleType === 'team' ? (team?.displayName ?? null) : null,
    })
    setRoleName('')
    setSaving(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Type</label>
          <select value={roleType} onChange={e => setRoleType(e.target.value as 'club' | 'team')}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-700">
            <option value="club">Club</option>
            <option value="team">Team</option>
          </select>
        </div>
        {roleType === 'team' && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Team</label>
            <select value={teamId} onChange={e => setTeamId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-700">
              {teams.map(t => <option key={t.id} value={t.id}>{t.displayName}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Role name</label>
          <input value={roleName} onChange={e => setRoleName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
            placeholder={roleType === 'team' ? 'e.g. Manager' : 'e.g. Chairman'}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-700" />
        </div>
        <button onClick={handleAdd} disabled={saving || !roleName.trim()}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-4 py-1.5 rounded-lg text-sm transition disabled:opacity-50">
          + Add role
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

export default function VolunteersClient({ volunteers: initial, teams }: { volunteers: Volunteer[]; teams: Team[] }) {
  const [volunteers, setVolunteers] = useState(initial)
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const sorted = [...volunteers].sort((a, b) =>
    `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)
  )

  async function handleAdd(fd: FormData) {
    setSaving(true)
    setError(null)
    const result = await addVolunteer(fd)
    if (result?.error) { setError(result.error); setSaving(false); return }
    setSaving(false)
    setShowAddForm(false)
    window.location.reload()
  }

  async function handleEdit(volunteerId: string, fd: FormData) {
    setSaving(true)
    const result = await updateVolunteer(volunteerId, fd)
    if (result?.error) { setError(result.error); setSaving(false); return }
    const firstName = fd.get('first_name') as string
    const lastName = fd.get('last_name') as string
    const isAppUser = fd.get('is_app_user') === 'true'
    const email = fd.get('email') as string
    const userRole = fd.get('user_role') as string
    const isReferee = fd.get('is_referee') === 'true'
    setVolunteers(vs => vs.map(v => v.id === volunteerId
      ? { ...v, first_name: firstName, last_name: lastName, email: isAppUser ? email : null, is_app_user: isAppUser, user_role: isAppUser ? userRole : null, is_referee: isReferee }
      : v))
    setEditingId(null)
    setSaving(false)
  }

  async function handleDelete(v: Volunteer) {
    if (!window.confirm(`Delete ${v.first_name} ${v.last_name}?`)) return
    await deleteVolunteer(v.id)
    setVolunteers(vs => vs.filter(x => x.id !== v.id))
  }

  function userRoleLabel(role: string | null) {
    return USER_ROLES.find(r => r.value === role)?.label ?? role ?? '—'
  }

  return (
    <div className="space-y-6">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Volunteers</h1>
        {!showAddForm && (
          <button onClick={() => setShowAddForm(true)}
            className="bg-red-800 hover:bg-red-900 text-white font-semibold px-4 py-2 rounded-lg text-sm transition flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Add volunteer
          </button>
        )}
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Add volunteer</h2>
          {error && <div className="mb-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}
          <VolunteerForm onSave={handleAdd} onCancel={() => { setShowAddForm(false); setError(null) }} saving={saving} />
        </div>
      )}

      {/* Volunteers list */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
        <p className="text-xs text-gray-400 mb-4">{volunteers.length} volunteer{volunteers.length !== 1 ? 's' : ''}</p>
        {sorted.length === 0 ? (
          <p className="text-sm text-gray-400">No volunteers added yet.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {sorted.map(v => {
              const isExpanded = expandedId === v.id
              const isEditing = editingId === v.id
              const fullName = `${v.first_name} ${v.last_name}`

              return (
                <div key={v.id}>
                  {isEditing ? (
                    <div className="py-4">
                      {error && <div className="mb-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}
                      <VolunteerForm
                        initial={v}
                        onSave={fd => handleEdit(v.id, fd)}
                        onCancel={() => { setEditingId(null); setError(null) }}
                        saving={saving}
                      />
                    </div>
                  ) : (
                    <div className="py-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-gray-900">{fullName}</p>
                            {v.is_referee && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">Referee</span>
                            )}
                            {v.is_app_user && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">App user</span>
                            )}
                          </div>
                          {v.email && <p className="text-xs text-gray-400 mt-0.5">{v.email}{v.is_app_user && v.user_role ? ` · ${userRoleLabel(v.user_role)}` : ''}</p>}
                          {v.roles.length > 0 && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {v.roles.map(r => r.role_type === 'team' ? `${r.teamName}: ${r.role_name}` : r.role_name).join(' · ')}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 text-xs">
                          <button onClick={() => { setExpandedId(isExpanded ? null : v.id); setEditingId(null) }}
                            className="text-red-800 hover:underline font-medium">
                            {isExpanded ? 'Hide' : 'Roles'}
                          </button>
                          <button onClick={() => { setEditingId(v.id); setExpandedId(null) }}
                            className="text-gray-500 hover:text-gray-800 transition">Edit</button>
                          <button onClick={() => handleDelete(v)}
                            className="text-gray-400 hover:text-red-600 transition">Delete</button>
                        </div>
                      </div>

                      {/* Roles panel */}
                      {isExpanded && (
                        <div className="mt-3 pl-3 space-y-3">
                          {v.roles.length > 0 ? (
                            <ul className="divide-y divide-gray-50 border border-gray-100 rounded-lg overflow-hidden mb-3">
                              {v.roles.map(r => (
                                <li key={r.id} className="flex items-center justify-between px-4 py-2.5 bg-gray-50">
                                  <div>
                                    <p className="text-sm font-medium text-gray-800">{r.role_name}</p>
                                    <p className="text-xs text-gray-400">
                                      {r.role_type === 'team' ? `Team: ${r.teamName ?? '—'}` : 'Club role'}
                                    </p>
                                  </div>
                                  <button onClick={async () => {
                                    await removeVolunteerRole(r.id)
                                    setVolunteers(vs => vs.map(vol => vol.id === v.id
                                      ? { ...vol, roles: vol.roles.filter(x => x.id !== r.id) }
                                      : vol))
                                  }} className="text-xs text-gray-400 hover:text-red-600 transition">Remove</button>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-gray-400 mb-3">No roles assigned yet.</p>
                          )}
                          <RoleForm volunteerId={v.id} teams={teams} onAdded={role => {
                            setVolunteers(vs => vs.map(vol => vol.id === v.id
                              ? { ...vol, roles: [...vol.roles, role] }
                              : vol))
                          }} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
