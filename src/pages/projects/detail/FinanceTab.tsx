import clsx from 'clsx'
import { AlertTriangle, Landmark, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { DonutChart } from '../../../components/charts'
import { Badge, Button, Card, CardHeader, Field, Input, Modal, Table, chartTooltip } from '../../../components/ui'
import { budgets } from '../../../data/mock'
import { dayLabel, toDay } from '../../../lib/dates'
import { fmtCompact, fmtINR } from '../../../lib/format'
import { burnSeries, type Analysis } from '../../../lib/projectMetrics'
import { useApp } from '../../../store'

const SLICES = ['#1a1d1b', '#aece52', '#6b92d8', '#f0cad8']

function AllotModal({ a, open, onClose }: { a: Analysis; open: boolean; onClose: () => void }) {
  const allot = useApp((s) => s.allotFunds)
  const toast = useApp((s) => s.toast)
  const { fin } = a
  const remaining = Math.max(0, fin.budget - fin.allotted)
  const suggest = Math.min(remaining, Math.max(0, Math.ceil((fin.used - fin.allotted) / 100000) * 100000 + 500000))
  const [amount, setAmount] = useState(suggest || Math.min(remaining, 500000))
  const [note, setNote] = useState('')

  function submit() {
    if (!(amount > 0)) return toast('Enter an amount to release', 'error')
    if (amount > remaining) return toast(`Only ${fmtINR(remaining)} of the approved budget is left to release`, 'error')
    allot(a.project.id, amount, note.trim() || 'Additional release')
    onClose()
    setNote('')
  }

  return (
    <Modal open={open} onClose={onClose} title="Release funds" width={460}>
      <p className="text-sm text-ash">
        <b className="text-ink">{fmtINR(remaining)}</b> of the approved budget is still unreleased. Used so far: <b className="text-ink">{fmtINR(fin.used)}</b> against <b className="text-ink">{fmtINR(fin.allotted)}</b> allotted.
      </p>
      <div className="mt-4 grid gap-4">
        <Field label="Amount (₹)"><Input type="number" min={0} step={50000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></Field>
        <Field label="Note"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Release for the Testing phase" /></Field>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="light" onClick={onClose}>Cancel</Button>
        <Button onClick={submit}>Release {fmtCompact(amount || 0)}</Button>
      </div>
    </Modal>
  )
}

export default function FinanceTab({ a }: { a: Analysis }) {
  const { project: p, fin, fc } = a
  const assets = useApp((s) => s.assets)
  const [releasing, setReleasing] = useState(false)
  const series = useMemo(() => burnSeries(a, assets), [a, assets])
  const dept = budgets.find((b) => b.dept === p.fundingDept)
  const overAllot = fin.used > fin.allotted
  const closed = p.status === 'Completed'

  const breakdown = [
    { name: 'People', value: Math.round(fin.people) },
    { name: 'Assets', value: Math.round(fin.assetCharge) },
    { name: 'Vendors', value: fin.vendors },
    { name: 'Expense claims', value: fin.expenseClaims },
  ]
  const max = Math.max(fin.budget, fin.eac, fin.used)
  const bars = [
    { label: 'Approved budget', value: fin.budget, cls: 'bg-ink/15' },
    { label: 'Allotted (released)', value: fin.allotted, cls: 'bg-lime-deep' },
    { label: 'Used', value: fin.used, cls: overAllot ? 'bg-rose-deep' : 'bg-ink' },
    { label: closed ? 'Final cost' : 'Forecast at completion', value: fin.eac, cls: fin.overrun > 0 ? 'bg-rose-deep/60' : 'bg-sage-deep/70' },
  ]

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      {overAllot && !closed && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-rose-deep/25 bg-rose/50 px-4 py-3 text-sm text-[#862c58] lg:col-span-12">
          <AlertTriangle size={17} className="shrink-0" />
          <p className="min-w-0 flex-1"><b>Spending is ahead of released funds</b> by {fmtINR(fin.used - fin.allotted)}. Release the next allotment to keep the team unblocked.</p>
          <Button size="sm" variant="danger" onClick={() => setReleasing(true)}>Release funds</Button>
        </div>
      )}

      <Card className="lg:col-span-7">
        <CardHeader title="Budget → allotment → usage" subtitle="From the approved envelope down to what has been spent, plus where it is forecast to land" />
        <div className="mt-5 space-y-4">
          {bars.map((b) => (
            <div key={b.label}>
              <div className="mb-1.5 flex justify-between text-xs"><span className="text-ash">{b.label}</span><span className="font-display font-semibold tabular-nums">{fmtINR(b.value)}</span></div>
              <div className="h-3.5 overflow-hidden rounded-full bg-soft shadow-[inset_0_1px_2px_rgba(26,29,27,0.08)]">
                <div className={clsx('h-full rounded-full transition-all duration-1000', b.cls)} style={{ width: `${(b.value / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { l: 'Headroom', v: fmtCompact(fin.headroom), t: fin.headroom < 0 ? 'text-rose-deep' : '' },
            { l: 'Cost efficiency (CPI)', v: fin.cpi.toFixed(2), t: fin.cpi < 0.9 ? 'text-rose-deep' : fin.cpi >= 1 ? 'text-sage-deep' : '' },
            { l: 'Daily team burn', v: fmtCompact(fin.dailyBurn), t: '' },
            { l: 'Cost of delay', v: fmtCompact(fin.delayCost), t: fin.delayCost > 0 ? 'text-amber-deep' : '' },
          ].map((x) => (
            <div key={x.l} className="rounded-2xl bg-soft/70 p-3">
              <p className="text-[11px] text-ash">{x.l}</p>
              <p className={clsx('mt-1 font-display text-lg font-semibold tabular-nums', x.t)}>{x.v}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="lg:col-span-5">
        <CardHeader title="Where the money went" subtitle={`${fmtINR(fin.used)} used so far`} />
        <div className="mt-3 flex items-center gap-4">
          <div className="w-40 shrink-0"><DonutChart data={breakdown} colors={SLICES} height={160} format={fmtCompact} innerLabel={fmtCompact(fin.used)} /></div>
          <ul className="min-w-0 flex-1 space-y-2.5">
            {breakdown.map((b, i) => (
              <li key={b.name} className="flex items-center gap-2 text-xs">
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: SLICES[i] }} />
                <span className="flex-1 text-ash">{b.name}</span>
                <span className="font-semibold tabular-nums">{fmtCompact(b.value)}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-3 text-[11px] text-ash">People = salary cost of allocated time (HR) · Assets = depreciation of deployed kit · Expense claims come from Finance.</p>
      </Card>

      <Card className="lg:col-span-12">
        <CardHeader title="Burn curve" subtitle="Cumulative cost against the plan, with the forecast to completion" />
        <div className="mt-3">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={series} margin={{ top: 10, right: 12, left: -4, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#edf0ed" />
              <XAxis dataKey="day" type="number" domain={['dataMin', 'dataMax']} axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(d: number) => dayLabel(d)} scale="linear" />
              <YAxis axisLine={false} tickLine={false} tickFormatter={fmtCompact} width={58} tick={{ fontSize: 10 }} />
              <Tooltip {...chartTooltip} labelFormatter={(d: number) => dayLabel(d)} formatter={(v: number) => fmtCompact(v)} />
              <ReferenceLine y={fin.budget} stroke="#6a6f68" strokeDasharray="2 4" label={{ value: 'Budget', position: 'insideTopRight', fontSize: 10, fill: '#6a6f68' }} />
              <ReferenceLine x={fc.today} stroke="#1a1d1b" label={{ value: 'Today', position: 'top', fontSize: 10, fill: '#1a1d1b' }} />
              <Line type="monotone" dataKey="plan" name="Planned" stroke="#a0a69f" strokeWidth={2} strokeDasharray="5 4" dot={false} />
              <Line type="monotone" dataKey="actual" name="Actual" stroke="#1a1d1b" strokeWidth={2.5} dot={false} connectNulls />
              <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#cd6a96" strokeWidth={2.5} strokeDasharray="2 5" dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="lg:col-span-7">
        <CardHeader
          title="Allotments"
          subtitle="Funds released to the project, tranche by tranche"
          action={!closed && fin.allotted < fin.budget ? <Button size="sm" variant="light" onClick={() => setReleasing(true)}><Plus size={13} /> Release funds</Button> : undefined}
        />
        <Table className="mt-3" head={['Date', 'Released', 'Cumulative', 'Note']}>
          {(() => {
            let cum = 0
            return [...p.tranches].sort((x, y) => toDay(x.date) - toDay(y.date)).map((t) => {
              cum += t.amount
              return (
                <tr key={t.id}>
                  <td className="text-xs tabular-nums">{dayLabel(toDay(t.date))}</td>
                  <td className="text-xs font-semibold tabular-nums">{fmtINR(t.amount)}</td>
                  <td className="text-xs tabular-nums text-ash">{fmtINR(cum)} <span className="text-[10px]">({Math.round((cum / fin.budget) * 100)}%)</span></td>
                  <td className="text-xs text-ash">{t.note}</td>
                </tr>
              )
            })
          })()}
          {p.tranches.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-xs text-ash">No funds released yet.</td></tr>}
        </Table>
      </Card>

      <div className="grid gap-4 lg:col-span-5">
        <Card>
          <CardHeader title="Vendor payments" subtitle={`${fmtINR(fin.vendors)} paid`} />
          {p.vendors.length === 0 ? <p className="mt-3 text-xs text-ash">No vendor payments yet.</p> : (
            <ul className="mt-3 space-y-2.5">
              {p.vendors.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 text-xs">
                  <span className="min-w-0"><span className="block truncate font-semibold">{v.vendor}</span><span className="text-ash">{v.note} · {dayLabel(toDay(v.date))}</span></span>
                  <span className="shrink-0 font-semibold tabular-nums">{fmtCompact(v.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><Landmark size={15} /> Department funding</span>} subtitle={`Drawn from the ${p.fundingDept} budget`} action={<Badge tone="gray" dot={false}>{p.fundingDept}</Badge>} />
          {dept && (
            <div className="mt-3 text-xs text-ash">
              <p>This project's budget is <b className="text-ink">{Math.round((p.budget / dept.allocated) * 100)}%</b> of {p.fundingDept}'s FY allocation of {fmtCompact(dept.allocated)}.</p>
              <p className="mt-1.5">Department has spent {fmtCompact(dept.spent)} so far ({Math.round((dept.spent / dept.allocated) * 100)}%).</p>
            </div>
          )}
        </Card>
      </div>

      {releasing && <AllotModal a={a} open onClose={() => setReleasing(false)} />}
    </div>
  )
}
