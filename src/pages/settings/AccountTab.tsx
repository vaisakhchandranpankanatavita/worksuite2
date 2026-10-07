import { useState } from 'react'
import { Button, Card, CardHeader, Field, Input } from '../../components/ui'
import { api } from '../../lib/api'
import { useApp, useAuth } from '../../store'

export default function AccountTab() {
  const user = useAuth((s) => s.user)
  const toast = useApp((s) => s.toast)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <Card className="max-w-lg">
      <CardHeader title="Your account" subtitle={user ? `${user.name} · ${user.email}` : undefined} />
      <form
        className="mt-4 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          try {
            await api.changePassword(current, next)
            toast('Password changed')
            setCurrent('')
            setNext('')
          } catch (err) {
            toast((err as Error).message, 'error')
          }
          setBusy(false)
        }}
      >
        <Field label="Current password"><Input required type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" /></Field>
        <Field label="New password"><Input required type="password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" placeholder="At least 8 characters" /></Field>
        <Button type="submit" disabled={busy}>Change password</Button>
      </form>
    </Card>
  )
}
