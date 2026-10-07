import { KeyRound, Pencil, Plus, UserCheck, UserX } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Avatar, Badge, Button, Card, CardHeader, Empty, Field, Input, Modal, Select, Table } from '../../components/ui'
import { MODULES, type ModuleKey } from '../../data/roles'
import { api, type SessionUser } from '../../lib/api'
import { useApp } from '../../store'

type Level = 'none' | 'read' | 'write'
type Access = Record<ModuleKey, Level>

const accessOf = (u?: Pick<SessionUser, 'modules' | 'readOnly'>): Access =>
  Object.fromEntries(MODULES.map((m) => [m.key, !u?.modules.includes(m.key) ? 'none' : u.readOnly.includes(m.key) ? 'read' : 'write'])) as Access

const summary = (u: SessionUser) =>
  u.isSuperadmin ? 'Everything' : u.modules.length === 0 ? 'No access' : MODULES.filter((m) => u.modules.includes(m.key)).map((m) => `${m.label}${u.readOnly.includes(m.key) ? ' (view)' : ''}`).join(', ')

function UserModal({ user, onClose, onSaved }: { user: SessionUser | 'new'; onClose: () => void; onSaved: () => void }) {
  const toast = useApp((s) => s.toast)
  const existing = user === 'new' ? undefined : user
  const [name, setName] = useState(existing?.name ?? '')
  const [email, setEmail] = useState(existing?.email ?? '')
  const [label, setLabel] = useState(existing?.label ?? '')
  const [password, setPassword] = useState('')
  const [access, setAccess] = useState<Access>(accessOf(existing))
  const [busy, setBusy] = useState(false)

  async function save() {
    const modules = MODULES.map((m) => m.key).filter((k) => access[k] !== 'none')
    const readOnly = modules.filter((k) => access[k] === 'read')
    if (modules.length === 0) return toast('Give the user access to at least one module', 'error')
    setBusy(true)
    try {
      if (existing) await api.updateUser(existing.id, { name, email, label: label || 'Team member', modules, readOnly })
      else await api.createUser({ name, email, password, label: label || undefined, modules, readOnly })
      toast(existing ? 'User updated' : `${name} can now sign in`)
      onSaved()
    } catch (err) {
      toast((err as Error).message, 'error')
      setBusy(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={existing ? `Edit ${existing.name}` : 'Add user'} width={560}>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void save() }}>
        <Field label="Full name"><Input required value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Work email"><Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Job title"><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Site accountant" /></Field>
        {!existing && <Field label="Initial password"><Input required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" /></Field>}
        <div className="sm:col-span-2">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ash/80">Access</p>
          <div className="space-y-2">
            {MODULES.map((m) => (
              <div key={m.key} className="flex items-center justify-between gap-3 rounded-2xl border border-line/70 bg-white/60 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{m.label}</p>
                  <p className="truncate text-[11px] text-ash">{m.blurb}</p>
                </div>
                <Select className="!rounded-xl" value={access[m.key]} aria-label={`${m.label} access`} onChange={(e) => setAccess({ ...access, [m.key]: e.target.value as Level })}>
                  <option value="none">No access</option>
                  <option value="read">View only</option>
                  <option value="write">View & edit</option>
                </Select>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy}>{existing ? 'Save changes' : 'Create user'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function PasswordModal({ user, onClose }: { user: SessionUser; onClose: () => void }) {
  const toast = useApp((s) => s.toast)
  const [password, setPassword] = useState('')
  return (
    <Modal open onClose={onClose} title={`Reset password — ${user.name}`} width={440}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          try {
            await api.resetPassword(user.id, password)
            toast(`Password reset — ${user.name} is signed out everywhere`)
            onClose()
          } catch (err) {
            toast((err as Error).message, 'error')
          }
        }}
      >
        <Field label="New password"><Input required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="At least 8 characters" /></Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit">Reset password</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function UsersTab() {
  const toast = useApp((s) => s.toast)
  const [users, setUsers] = useState<SessionUser[] | null>(null)
  const [editing, setEditing] = useState<SessionUser | 'new' | null>(null)
  const [resetting, setResetting] = useState<SessionUser | null>(null)

  const load = useCallback(() => {
    api.users().then(setUsers, (err: Error) => toast(err.message, 'error'))
  }, [toast])
  useEffect(load, [load])

  async function toggle(u: SessionUser) {
    try {
      await api.updateUser(u.id, { active: !u.active })
      toast(u.active ? `${u.name} can no longer sign in` : `${u.name} can sign in again`)
      load()
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  return (
    <Card>
      <CardHeader title="Users" subtitle="Only you create accounts. Choose which modules each person can open, and whether they can change data there." action={<Button size="sm" onClick={() => setEditing('new')}><Plus size={14} /> Add user</Button>} />
      {users === null ? <p className="py-10 text-center text-sm text-ash">Loading…</p> : users.length === 0 ? <Empty>No users yet.</Empty> : (
        <Table className="mt-3" head={['User', 'Title', 'Access', 'Status', '']}>
          {users.map((u) => (
            <tr key={u.id}>
              <td>
                <div className="flex items-center gap-2.5">
                  <Avatar name={u.name} hue={u.hue} src={u.photo} size={30} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{u.name}</p>
                    <p className="truncate text-xs text-ash">{u.email}</p>
                  </div>
                </div>
              </td>
              <td className="text-ash">{u.label}</td>
              <td className="text-xs">{summary(u)}</td>
              <td>{u.isSuperadmin ? <Badge tone="lime">Superadmin</Badge> : <Badge tone={u.active ? 'green' : 'gray'}>{u.active ? 'Active' : 'Deactivated'}</Badge>}</td>
              <td>
                {!u.isSuperadmin && (
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(u)} aria-label={`Edit ${u.name}`}><Pencil size={14} /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setResetting(u)} aria-label={`Reset password for ${u.name}`}><KeyRound size={14} /></Button>
                    <Button size="sm" variant="ghost" onClick={() => void toggle(u)} aria-label={u.active ? `Deactivate ${u.name}` : `Reactivate ${u.name}`}>{u.active ? <UserX size={14} /> : <UserCheck size={14} />}</Button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
      {editing && <UserModal user={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
      {resetting && <PasswordModal user={resetting} onClose={() => setResetting(null)} />}
    </Card>
  )
}
