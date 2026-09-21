import { ArrowRight, CalendarClock } from 'lucide-react'
import { useState } from 'react'
import Gantt from '../../../components/projects/Gantt'
import { SlipTag } from '../../../components/projects/projectUi'
import { Avatar, Badge, Button, Card, CardHeader, Field, Input, Modal, Progress, Table } from '../../../components/ui'
import { employeeById } from '../../../data/mock'
import { dayLabel, dayLabelFull, fromDay, toDay, todayDay } from '../../../lib/dates'
import { photoFor } from '../../../lib/photo'
import type { Analysis } from '../../../lib/projectMetrics'
import { useApp } from '../../../store'
import { phaseRows, projectRow } from '../useAnalyzed'

function ReplanModal({ a, open, onClose }: { a: Analysis; open: boolean; onClose: () => void }) {
  const replan = useApp((s) => s.replanProject)
  const toast = useApp((s) => s.toast)
  const { fc } = a
  const [date, setDate] = useState(fromDay(fc.projectedEnd))
  const [reason, setReason] = useState('')

  function submit() {
    if (toDay(date) <= todayDay()) return toast('The new end date has to be in the future', 'error')
    if (!reason.trim()) return toast('Add a short reason so the change is auditable', 'error')
    replan(a.project.id, date, reason.trim())
    onClose()
    setReason('')
  }

  return (
    <Modal open={open} onClose={onClose} title="Re-plan the end date" width={480}>
      <p className="text-sm text-ash">
        Approved plan is <b className="text-ink">{dayLabelFull(fc.plannedEnd)}</b>; the forecast is <b className="text-ink">{dayLabelFull(fc.projectedEnd)}</b>.
        Approving a new date spreads the remaining work across the new window and keeps the original commitment on record.
      </p>
      <div className="mt-4 grid gap-4">
        <Field label="New end date"><Input type="date" value={date} min={fromDay(todayDay() + 1)} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Reason for the change"><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Client change request added two weeks of scope" /></Field>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="light" onClick={onClose}>Cancel</Button>
        <Button onClick={submit}>Approve new date</Button>
      </div>
    </Modal>
  )
}

export default function TimelineTab({ a }: { a: Analysis }) {
  const { project: p, fc } = a
  const [replanning, setReplanning] = useState(false)
  const rows = [projectRow(a, { id: `${p.id}-all`, sub: 'Whole project' }), ...phaseRows(a)]
  const lo = Math.min(fc.startDay, fc.today) - 4
  const hi = Math.max(fc.plannedEnd, fc.projectedEnd, fc.pessimisticEnd) + 8
  const canReplan = p.status !== 'Completed'

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Card className="lg:col-span-12">
        <CardHeader
          title="Waterfall"
          subtitle="Each phase starts when the one before it finishes — a delay cascades down the chain"
          action={canReplan ? <Button size="sm" variant="light" onClick={() => setReplanning(true)}><CalendarClock size={13} /> Re-plan end date</Button> : undefined}
        />
        <div className="mt-4"><Gantt rows={rows} rangeStart={lo} rangeEnd={hi} today={fc.today} minWidth={820} /></div>
      </Card>

      <Card className="lg:col-span-8">
        <CardHeader title="Phase forecast" subtitle="Planned vs projected, phase by phase" />
        <Table className="mt-3" head={['Phase', 'Owner', 'Planned', 'Projected', 'Slip', 'Done', 'Pace']}>
          {fc.phases.map((pf) => {
            const owner = employeeById(pf.phase.ownerId)
            return (
              <tr key={pf.phase.id}>
                <td className="font-semibold">{pf.phase.name}</td>
                <td>
                  <span className="flex items-center gap-2">
                    {owner && <Avatar name={owner.name} hue={owner.avatarHue} src={photoFor(owner)} size={24} />}
                    <span className="text-xs">{owner?.name}</span>
                  </span>
                </td>
                <td className="whitespace-nowrap text-xs tabular-nums">{dayLabel(pf.plannedStart)} → {dayLabel(pf.plannedEnd)}</td>
                <td className="whitespace-nowrap text-xs font-semibold tabular-nums">{dayLabel(pf.projStart)} → {dayLabel(pf.projEnd)}</td>
                <td>{pf.state === 'done' ? <Badge tone="green" dot={false}>Done</Badge> : <SlipTag days={pf.slip} />}</td>
                <td><div className="flex items-center gap-2"><Progress value={pf.phase.progress} className="w-16 !h-1.5" tone={pf.state === 'done' ? 'sage' : 'ink'} /><span className="text-xs tabular-nums">{pf.phase.progress}%</span></div></td>
                <td className="text-xs tabular-nums">{pf.state === 'done' ? '—' : `${Math.round(pf.eff * 100)}%`}</td>
              </tr>
            )
          })}
        </Table>
      </Card>

      <Card className="lg:col-span-4">
        <CardHeader title="Date shift history" subtitle="Every time the finish date has moved" />
        <ol className="relative mt-4 space-y-4 border-l border-line pl-5">
          <li>
            <span className="absolute -left-[5px] mt-1.5 size-2.5 rounded-full bg-ink/40" />
            <p className="text-[13px] font-semibold">Committed to {dayLabelFull(fc.baselineEnd)}</p>
            <p className="text-[11px] text-ash">Kick-off {dayLabel(fc.startDay)}</p>
          </li>
          {p.replans.map((r) => (
            <li key={r.id}>
              <span className="absolute -left-[5px] mt-1.5 size-2.5 rounded-full bg-amber-deep" />
              <p className="flex items-center gap-1.5 text-[13px] font-semibold tabular-nums">{dayLabel(toDay(r.from))} <ArrowRight size={12} /> {dayLabel(toDay(r.to))} <SlipTag days={toDay(r.to) - toDay(r.from)} /></p>
              <p className="text-[11px] text-ash">{dayLabel(toDay(r.date))} — {r.reason}</p>
            </li>
          ))}
          <li>
            <span className="absolute -left-[5px] mt-1.5 size-2.5 rounded-full bg-rose-deep ring-4 ring-rose/50" />
            <p className="text-[13px] font-semibold">{p.status === 'Completed' ? 'Delivered' : 'Forecast'} {dayLabelFull(fc.projectedEnd)}</p>
            <p className="text-[11px] text-ash">{p.status === 'Completed' ? 'Project closed' : `${fc.slipDays > 0 ? `${fc.slipDays} days past the approved plan` : fc.slipDays < 0 ? `${-fc.slipDays} days ahead of plan` : 'On the approved plan'}`}</p>
          </li>
        </ol>
      </Card>

      {replanning && <ReplanModal a={a} open onClose={() => setReplanning(false)} />}
    </div>
  )
}
