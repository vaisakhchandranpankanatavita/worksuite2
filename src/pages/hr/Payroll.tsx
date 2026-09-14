import clsx from 'clsx'
import { Download, Loader2, Play, Printer, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { exportCsv } from './Employees'
import { Avatar, Badge, Button, Card, CardHeader, Modal, PageHeader, Select, Table, chartTooltip } from '../../components/ui'
import { COMPANY, DEPARTMENTS, complianceDeadlines, computePayslip, employees, payrollRuns, type Employee } from '../../data/mock'
import { fmtCompact, fmtINR } from '../../lib/format'
import { photoFor } from '../../lib/photo'
import { useApp } from '../../store'

export default function Payroll() {
  const { payrollStatus, runPayroll } = useApp()
  const [q, setQ] = useState('')
  const [dept, setDept] = useState('All')
  const [slipFor, setSlipFor] = useState<Employee | null>(null)
  const current = payrollRuns[0]

  const rows = useMemo(
    () => employees.filter((e) => (dept === 'All' || e.department === dept) && e.name.toLowerCase().includes(q.toLowerCase())).map((e) => ({ e, p: computePayslip(e) })),
    [q, dept],
  )
  const totals = useMemo(() => {
    const all = employees.map(computePayslip)
    const sum = (k: keyof ReturnType<typeof computePayslip>) => all.reduce((s, p) => s + p[k], 0)
    return { gross: sum('gross'), net: sum('net'), pf: sum('pf') + sum('employerPf'), esi: sum('esi'), pt: sum('pt'), tds: sum('tds') }
  }, [])
  const history = [...payrollRuns].reverse().map((r) => ({ month: r.label.split(' ')[0].slice(0, 3), gross: r.gross, net: r.net }))

  return (
    <div>
      <PageHeader
        title="Payroll"
        actions={
          <>
            <Button variant="light" onClick={() => exportCsv('payroll-register.csv', [['ID', 'Name', 'Department', 'Basic', 'HRA', 'Special', 'Gross', 'PF', 'ESI', 'PT', 'TDS', 'Net'], ...rows.map(({ e, p }) => [e.id, e.name, e.department, p.basic, p.hra, p.special, p.gross, p.pf, p.esi, p.pt, p.tds, p.net])])}>
              <Download size={16} /> Payroll register
            </Button>
            <Button onClick={runPayroll} disabled={payrollStatus !== 'Draft'}>
              {payrollStatus === 'Processing' ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              {payrollStatus === 'Draft' ? 'Run payroll' : payrollStatus === 'Processing' ? 'Processing…' : 'Disbursed'}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="animate-in rounded-[22px] bg-ink p-6 text-white lg:col-span-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white/60">Net payable · {current.label}</p>
            <Badge tone={payrollStatus === 'Paid' ? 'lime' : payrollStatus === 'Processing' ? 'blue' : 'gray'}>{payrollStatus}</Badge>
          </div>
          <p className="mt-3 font-display text-4xl font-light">{fmtINR(totals.net)}</p>
          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-white/5 p-3"><p className="text-xs text-white/50">Gross</p><p className="font-display">{fmtCompact(totals.gross)}</p></div>
            <div className="rounded-2xl bg-white/5 p-3"><p className="text-xs text-white/50">TDS</p><p className="font-display">{fmtCompact(totals.tds)}</p></div>
            <div className="rounded-2xl bg-white/5 p-3"><p className="text-xs text-white/50">PF (EE + ER)</p><p className="font-display">{fmtCompact(totals.pf)}</p></div>
            <div className="rounded-2xl bg-white/5 p-3"><p className="text-xs text-white/50">ESI + PT</p><p className="font-display">{fmtCompact(totals.esi + totals.pt)}</p></div>
          </div>
          <div className="mt-6">
            <div className="mb-2 flex justify-between text-xs text-white/60"><span>Run progress</span><span>{payrollStatus === 'Paid' ? '4/4' : payrollStatus === 'Processing' ? '3/4' : '2/4'} steps</span></div>
            <div className="grid grid-cols-4 gap-1.5">
              {['Attendance', 'Review', 'Approve', 'Disburse'].map((s, i) => (
                <div key={s}>
                  <div className={clsx('h-2 rounded-full', i < (payrollStatus === 'Paid' ? 4 : payrollStatus === 'Processing' ? 3 : 2) ? 'bg-lime' : 'bg-white/15')} />
                  <p className="mt-1.5 text-[10px] text-white/50">{s}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Card className="lg:col-span-5">
          <CardHeader title="Payroll Cost Trend" subtitle="Gross vs net, last 6 runs" />
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={history} margin={{ top: 16, right: 0, left: -8, bottom: 0 }} barGap={4}>
              <CartesianGrid vertical={false} stroke="#e5e8ec" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={fmtCompact} width={60} />
              <Tooltip {...chartTooltip} cursor={{ fill: 'rgba(38,40,37,0.04)' }} formatter={(v: number) => fmtINR(v)} />
              <Bar dataKey="gross" name="Gross" fill="#1a1d29" radius={[8, 8, 3, 3]} barSize={18} />
              <Bar dataKey="net" name="Net" fill="#a7f3d0" radius={[8, 8, 3, 3]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader title="Statutory Deadlines" subtitle="India compliance calendar" />
          <ul className="mt-4 space-y-3">
            {complianceDeadlines.map((c) => (
              <li key={c.title} className="flex items-center gap-3">
                <span className={clsx('grid size-11 shrink-0 place-items-center rounded-2xl text-center font-display leading-none', c.daysLeft <= 5 ? 'bg-rose' : 'bg-soft')}>
                  <span className="text-sm">{new Date(c.date).getDate()}<span className="block text-[9px] text-ash">{new Date(c.date).toLocaleDateString('en-IN', { month: 'short' })}</span></span>
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm">{c.title}</p>
                  <p className="text-xs text-ash">in {c.daysLeft} days</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="lg:col-span-12">
          <CardHeader
            title="Salary Register"
            subtitle={`${rows.length} employees`}
            action={
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ash" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="h-10 w-44 rounded-full border border-line bg-white pl-9 pr-3 text-sm outline-none focus:border-ink" />
                </div>
                <Select value={dept} onChange={(e) => setDept(e.target.value)}>
                  <option value="All">All departments</option>
                  {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                </Select>
              </div>
            }
          />
          <Table className="mt-3" head={['Employee', 'Basic', 'HRA', 'Special', 'Gross', 'PF', 'ESI', 'PT', 'TDS', 'Net pay', '']}>
            {rows.slice(0, 40).map(({ e, p }) => (
              <tr key={e.id} className="hover:bg-soft/60">
                <td>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={e.name} hue={e.avatarHue} src={photoFor(e)} size={32} />
                    <div>
                      <p className="whitespace-nowrap font-bold">{e.name}</p>
                      <p className="text-xs text-ash">{e.id}</p>
                    </div>
                  </div>
                </td>
                <td>{fmtINR(p.basic)}</td>
                <td>{fmtINR(p.hra)}</td>
                <td>{fmtINR(p.special)}</td>
                <td className="font-bold">{fmtINR(p.gross)}</td>
                <td className="text-ash">{fmtINR(p.pf)}</td>
                <td className="text-ash">{p.esi ? fmtINR(p.esi) : '—'}</td>
                <td className="text-ash">{fmtINR(p.pt)}</td>
                <td className="text-ash">{fmtINR(p.tds)}</td>
                <td><span className="rounded-full bg-lime px-2.5 py-1 font-bold">{fmtINR(p.net)}</span></td>
                <td><Button size="sm" variant="light" onClick={() => setSlipFor(e)}>Payslip</Button></td>
              </tr>
            ))}
          </Table>
          {rows.length > 40 && <p className="mt-3 text-center text-xs text-ash">Showing 40 of {rows.length} — export the register for the full list.</p>}
        </Card>
      </div>

      <PayslipModal employee={slipFor} onClose={() => setSlipFor(null)} />
    </div>
  )
}

export function PayslipModal({ employee, onClose }: { employee: Employee | null; onClose: () => void }) {
  if (!employee) return null
  const e = employee
  const p = computePayslip(e)
  const month = payrollRuns[1].label
  const earnings = [['Basic', p.basic], ['House Rent Allowance', p.hra], ['Special Allowance', p.special]] as const
  const deductions = [['Provident Fund', p.pf], ['ESI', p.esi], ['Professional Tax', p.pt], ['Income Tax (TDS)', p.tds]] as const
  return (
    <Modal open onClose={onClose} title={`Payslip · ${month}`} width={680}>
      <div className="print-area rounded-2xl border border-line bg-white p-5 text-sm">
        <div className="flex items-start justify-between border-b border-line pb-4">
          <div>
            <p className="font-display text-lg font-medium">{COMPANY.name}</p>
            <p className="max-w-xs text-xs text-ash">{COMPANY.address}</p>
          </div>
          <div className="text-right text-xs text-ash">
            <p>Payslip for</p>
            <p className="font-display text-base text-ink">{month}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 border-b border-line py-4 text-xs">
          {[['Employee', e.name], ['Employee ID', e.id], ['Designation', e.role], ['Department', e.department], ['PAN', e.pan], ['UAN', e.uan], ['Bank', e.bank], ['Paid days', '30 / 30']].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2"><span className="text-ash">{k}</span><span className="text-right">{v}</span></div>
          ))}
        </div>
        <div className="grid gap-6 py-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ash">Earnings</p>
            {earnings.map(([k, v]) => <div key={k} className="flex justify-between py-1"><span>{k}</span><span>{fmtINR(v)}</span></div>)}
            <div className="mt-2 flex justify-between border-t border-line pt-2 font-bold"><span>Gross earnings</span><span>{fmtINR(p.gross)}</span></div>
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ash">Deductions</p>
            {deductions.map(([k, v]) => <div key={k} className="flex justify-between py-1"><span>{k}</span><span>{fmtINR(v)}</span></div>)}
            <div className="mt-2 flex justify-between border-t border-line pt-2 font-bold"><span>Total deductions</span><span>{fmtINR(p.deductions)}</span></div>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-lime px-4 py-3">
          <span className="font-display">Net pay</span>
          <span className="font-display text-xl">{fmtINR(p.net)}</span>
        </div>
        <p className="mt-3 text-[11px] text-ash">Employer PF contribution {fmtINR(p.employerPf)} is part of CTC. This is a system-generated payslip.</p>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="light" onClick={() => window.print()}><Printer size={16} /> Print / Save PDF</Button>
        <Button onClick={onClose}>Done</Button>
      </div>
    </Modal>
  )
}
