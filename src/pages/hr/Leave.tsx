import clsx from 'clsx'
import { Check, Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Avatar, Badge, Button, Card, CardHeader, Field, Input, Modal, PageHeader, Segmented, Select, Table } from '../../components/ui'
import { CountUp } from '../../components/CountUp'
import { TODAY, employeeById, employees, type LeaveStatus, type LeaveType } from '../../data/mock'
import { fmtShortDate } from '../../lib/format'
import { photoFor } from '../../lib/photo'
import { useApp } from '../../store'

const TABS = ['Pending', 'Approved', 'Rejected', 'All'] as const
const TYPES: LeaveType[] = ['Casual Leave', 'Sick Leave', 'Earned Leave', 'Work From Home', 'Comp Off']
const TYPE_COLOR: Record<LeaveType, string> = { 'Casual Leave': 'bg-lime', 'Sick Leave': 'bg-rose', 'Earned Leave': 'bg-sky', 'Work From Home': 'bg-sage', 'Comp Off': 'bg-amber' }

export default function Leave() {
  const { leaves, setLeaveStatus, addLeave } = useApp()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<(typeof TABS)[number]>('Pending')
  const [applyOpen, setApplyOpen] = useState(false)
  useEffect(() => { if (params.get('apply')) setApplyOpen(true) }, [params])

  const list = leaves.filter((l) => tab === 'All' || l.status === tab)
  const onLeaveToday = leaves.filter((l) => l.status === 'Approved' && l.from <= TODAY.toISOString().slice(0, 10) && l.to >= TODAY.toISOString().slice(0, 10))

  // 2-week strip calendar
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(TODAY)
    d.setDate(d.getDate() + i - 3)
    return d.toISOString().slice(0, 10)
  })
  const upcoming = leaves.filter((l) => l.status !== 'Rejected' && l.to >= days[0] && l.from <= days[13]).slice(0, 8)

  return (
    <div>
      <PageHeader title="Leave Management" subtitle="Review requests, balances and who's out" actions={<Button onClick={() => setApplyOpen(true)}><Plus size={16} /> Apply leave</Button>} />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['Pending requests', leaves.filter((l) => l.status === 'Pending').length, 'bg-ink text-white'],
          ['On leave today', onLeaveToday.length, 'bg-lime'],
          ['Approved this month', leaves.filter((l) => l.status === 'Approved').length, 'card'],
          ['Avg. days per request', (leaves.reduce((s, l) => s + l.days, 0) / leaves.length).toFixed(1), 'card'],
        ].map(([k, v, cls], i) => (
          <div key={k as string} className={clsx('animate-in rounded-[22px] p-4', cls)}>
            <p className={clsx('text-xs', i === 0 ? 'text-white/60' : 'text-ash')}>{k}</p>
            <p className="mt-1 font-display text-3xl font-light"><CountUp value={v} /></p>
          </div>
        ))}
      </div>

      <Card className="mb-4">
        <CardHeader title="Team Leave Calendar" subtitle="Next two weeks" />
        <div className="mt-4 overflow-x-auto scroll-thin">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[180px_repeat(14,1fr)] text-center text-[11px] text-ash">
              <span />
              {days.map((d) => (
                <span key={d} className={clsx('py-1', d === TODAY.toISOString().slice(0, 10) && 'rounded-full bg-ink text-white')}>
                  {new Date(d).toLocaleDateString('en-IN', { weekday: 'narrow' })} {new Date(d).getDate()}
                </span>
              ))}
            </div>
            {upcoming.map((l) => {
              const e = employeeById(l.employeeId)!
              const start = Math.max(0, days.indexOf(l.from) === -1 ? (l.from < days[0] ? 0 : 14) : days.indexOf(l.from))
              const end = days.indexOf(l.to) === -1 ? 13 : days.indexOf(l.to)
              return (
                <div key={l.id} className="grid grid-cols-[180px_repeat(14,1fr)] items-center border-t border-dashed border-line py-1.5">
                  <span className="flex items-center gap-2 truncate text-xs"><Avatar name={e.name} hue={e.avatarHue} src={photoFor(e)} size={24} />{e.name}</span>
                  <span className={clsx('h-6 rounded-full px-2 text-[10px] leading-6', TYPE_COLOR[l.type], l.status === 'Pending' && 'opacity-60 ring-1 ring-dashed ring-ink/30')} style={{ gridColumn: `${start + 2} / ${end + 3}` }}>
                    <span className="truncate">{l.type}</span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Requests" action={<Segmented value={tab} options={TABS} onChange={setTab} />} />
        <Table className="mt-3" head={['Employee', 'Type', 'Dates', 'Days', 'Reason', 'Status', '']}>
          {list.map((l) => {
            const e = employeeById(l.employeeId)!
            return (
              <tr key={l.id}>
                <td>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={e.name} hue={e.avatarHue} src={photoFor(e)} size={32} />
                    <div>
                      <p className="whitespace-nowrap font-bold">{e.name}</p>
                      <p className="text-xs text-ash">{e.department}</p>
                    </div>
                  </div>
                </td>
                <td><span className={clsx('whitespace-nowrap rounded-full px-2.5 py-1 text-xs', TYPE_COLOR[l.type])}>{l.type}</span></td>
                <td className="whitespace-nowrap">{fmtShortDate(l.from)} – {fmtShortDate(l.to)}</td>
                <td>{l.days}</td>
                <td className="max-w-[220px] truncate text-ash">{l.reason}</td>
                <td><Badge>{l.status}</Badge></td>
                <td>
                  {l.status === 'Pending' && (
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => setLeaveStatus(l.id, 'Rejected')} className="grid size-8 place-items-center rounded-full border border-line hover:bg-rose" aria-label="Reject"><X size={14} /></button>
                      <button onClick={() => setLeaveStatus(l.id, 'Approved')} className="grid size-8 place-items-center rounded-full bg-ink text-white hover:bg-black" aria-label="Approve"><Check size={14} /></button>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </Table>
        {list.length === 0 && <p className="py-10 text-center text-sm text-ash">No {tab.toLowerCase()} requests.</p>}
      </Card>

      <ApplyLeave
        open={applyOpen}
        defaultEmployee={params.get('apply') ?? undefined}
        onClose={() => { setApplyOpen(false); setParams({}) }}
        onSubmit={(v) => {
          addLeave({ ...v, id: `LV-${2500 + leaves.length}`, status: 'Pending' as LeaveStatus, appliedOn: TODAY.toISOString().slice(0, 10) })
          setApplyOpen(false)
          setParams({})
          setTab('Pending')
        }}
      />
    </div>
  )
}

function ApplyLeave({ open, onClose, onSubmit, defaultEmployee }: { open: boolean; onClose: () => void; defaultEmployee?: string; onSubmit: (v: { employeeId: string; type: LeaveType; from: string; to: string; days: number; reason: string }) => void }) {
  const today = TODAY.toISOString().slice(0, 10)
  const [f, setF] = useState({ employeeId: employees[3].id, type: 'Casual Leave' as LeaveType, from: today, to: today, reason: '' })
  useEffect(() => { if (defaultEmployee) setF((x) => ({ ...x, employeeId: defaultEmployee })) }, [defaultEmployee])
  const days = Math.max(1, Math.round((new Date(f.to).getTime() - new Date(f.from).getTime()) / 864e5) + 1)
  return (
    <Modal open={open} onClose={onClose} title="Apply leave">
      <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); onSubmit({ ...f, days }) }}>
        <Field label="Employee">
          <Select className="w-full !rounded-xl" value={f.employeeId} onChange={(e) => setF({ ...f, employeeId: e.target.value })}>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name} — {e.department}</option>)}
          </Select>
        </Field>
        <Field label="Leave type">
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <button type="button" key={t} onClick={() => setF({ ...f, type: t })} className={clsx('rounded-full border px-3 py-1.5 text-xs', f.type === t ? 'border-ink bg-ink text-white' : 'border-line bg-white')}>{t}</button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="From"><Input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value, to: e.target.value > f.to ? e.target.value : f.to })} /></Field>
          <Field label="To"><Input type="date" min={f.from} value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></Field>
        </div>
        <Field label="Reason"><Input required value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="Short note for your manager" /></Field>
        <div className="flex items-center justify-between">
          <span className="text-sm text-ash">{days} day{days > 1 ? 's' : ''}</span>
          <Button type="submit">Submit request</Button>
        </div>
      </form>
    </Modal>
  )
}
