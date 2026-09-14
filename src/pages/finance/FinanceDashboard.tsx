import clsx from 'clsx'
import { ArrowDownLeft, ArrowUp, ArrowUpRight, Download, FileText, Landmark, Plus, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { HalfGauge, HatchedArea, SoftBars } from '../../components/charts'
import { CountUp } from '../../components/CountUp'
import { Avatar, Badge, Button, Card, CardHeader, CornerLink, IconBtn, Segmented, chartTooltip } from '../../components/ui'
import { TODAY, bankAccounts, budgets, complianceDeadlines, employeeById, expenseBreakdown, monthlyFinance, transactions } from '../../data/mock'
import { fmtCompact, fmtINR, fmtShortDate } from '../../lib/format'
import { photoFor } from '../../lib/photo'
import { useApp } from '../../store'

const PIE_COLORS = ['#1a1d29', '#a7f3d0', '#bfdbfe', '#fecdd3']

export default function FinanceDashboard() {
  const nav = useNavigate()
  const { invoices, expenses, setExpenseStatus } = useApp()
  const [range, setRange] = useState<'Quarter' | 'Year'>('Year')

  const cm = monthlyFinance.at(-1)!
  const pm = monthlyFinance.at(-2)!
  const cash = bankAccounts.reduce((s, b) => s + b.balance, 0)
  const receivables = invoices.filter((i) => i.status === 'Pending' || i.status === 'Overdue')
  const overdue = invoices.filter((i) => i.status === 'Overdue')
  const pendingExp = expenses.filter((e) => e.status === 'Pending')
  const burn = monthlyFinance.slice(-3).reduce((s, m) => s + m.expenses, 0) / 3
  const series = range === 'Quarter' ? monthlyFinance.slice(-3) : monthlyFinance
  const totalBudget = budgets.reduce((s, b) => s + b.allocated, 0)
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0)
  const pct = (a: number, b: number) => ((a - b) / b) * 100

  const aging = useMemo(() => {
    const buckets = [
      { label: 'Current', value: 0 },
      { label: '1–30', value: 0 },
      { label: '31–60', value: 0 },
      { label: '60+', value: 0 },
    ]
    receivables.forEach((i) => {
      const late = (TODAY.getTime() - new Date(i.dueDate).getTime()) / 864e5
      buckets[late <= 0 ? 0 : late <= 30 ? 1 : late <= 60 ? 2 : 3].value += i.total
    })
    return buckets
  }, [receivables])

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-normal tracking-tight md:text-[40px] md:leading-[1.1]">Financial Overview</h1>
          <p className="mt-2 text-sm text-ash">FY 2026–27 · Cash, revenue, spend and compliance at a glance.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="light" onClick={() => nav('/finance/reports')}><Download size={16} /> Reports</Button>
          <Button onClick={() => nav('/finance/invoices?new=1')}><Plus size={16} /> New invoice</Button>
        </div>
      </div>

      <div className="stagger grid gap-3 lg:grid-cols-12">
        {/* Cash hero */}
        <div className="animate-in relative overflow-hidden rounded-[22px] border border-white/10 bg-ink p-5 text-white lg:col-span-4 lg:row-span-2">
          <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-lime/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-14 size-56 rounded-full bg-sky/15 blur-3xl" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-sm text-white/60">Total cash balance</p>
              <p className="mt-2 bg-gradient-to-br from-white to-white/70 bg-clip-text font-display text-4xl font-light text-transparent">{fmtINR(cash)}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-lime"><ArrowUp size={12} /> 8.4% vs last month</p>
            </div>
            <span className="grid size-10 place-items-center rounded-full bg-white/10"><Wallet size={18} /></span>
          </div>
          <div className="relative mt-5 space-y-2">
            {bankAccounts.map((b) => (
              <div key={b.name} className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-full bg-white/10"><Landmark size={14} /></span>
                  <div>
                    <p className="text-sm">{b.name}</p>
                    <p className="text-[11px] text-white/45">{b.number}</p>
                  </div>
                </div>
                <span className="font-display text-sm">{fmtCompact(b.balance)}</span>
              </div>
            ))}
          </div>
          <div className="relative mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-lime p-3 text-ink">
              <p className="text-[11px]">Runway</p>
              <p className="font-display text-xl">{(cash / burn).toFixed(1)} mo</p>
            </div>
            <div className="hatch rounded-2xl border border-white/10 p-3">
              <p className="text-[11px] text-white/60">Avg. monthly burn</p>
              <p className="font-display text-xl">{fmtCompact(burn)}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:col-span-8">
        {[
          { title: 'Revenue', value: cm.revenue, delta: pct(cm.revenue, pm.revenue), extra: <SoftBars values={monthlyFinance.slice(-6).map((m) => m.revenue)} highlight={5} height={48} color="#d1fae5" hi="#059669" /> },
          { title: 'Expenses', value: cm.expenses, delta: pct(cm.expenses, pm.expenses), extra: <SoftBars values={monthlyFinance.slice(-6).map((m) => m.expenses)} highlight={5} height={48} color="#dbeafe" hi="#3b82f6" /> },
          {
            title: 'Net Profit',
            value: cm.profit,
            delta: pct(cm.profit, pm.profit),
            extra: (
              <div className="relative">
                <HalfGauge value={Math.round((cm.profit / cm.revenue) * 100 * 2.5)} size={88} color="#99f6e4" />
                <span className="absolute inset-x-0 bottom-0 text-center text-[11px] font-bold">{((cm.profit / cm.revenue) * 100).toFixed(0)}% margin</span>
              </div>
            ),
          },
        ].map((k) => (
          <Card key={k.title} compact>
            <CardHeader title={k.title} subtitle={TODAY.toLocaleDateString('en-IN', { month: 'long' })} />
            <div className="mt-4 flex items-end justify-between gap-2">
              <div>
                <p className="font-display text-2xl font-medium"><CountUp value={fmtCompact(k.value)} /></p>
                <p className={clsx('mt-1 flex items-center gap-0.5 text-xs font-bold', k.delta >= 0 === (k.title !== 'Expenses') ? 'text-sage-deep' : 'text-rose-deep')}>
                  {k.delta >= 0 ? <ArrowUp size={12} /> : <ArrowUp size={12} className="rotate-180" />} {Math.abs(k.delta).toFixed(1)}%
                </p>
              </div>
              {k.extra}
            </div>
          </Card>
        ))}
        </div>

        <Card compact className="lg:col-span-8">
          <CardHeader
            title="Revenue vs Expenses"
            subtitle={
              <span className="flex items-center gap-4">
                <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-[#94a0ad]" />Revenue</span>
                <span className="flex items-center gap-1.5"><i className="size-2 rounded-full border border-dashed border-[#94a0ad]" />Expenses</span>
              </span>
            }
            action={<Segmented value={range} options={['Quarter', 'Year'] as const} onChange={setRange} />}
          />
          <HatchedArea data={series} dataKey="revenue" compare="expenses" xKey="month" height={180} format={fmtCompact} />
        </Card>

        <Card compact className="lg:col-span-4">
          <CardHeader title="Spend Breakdown" subtitle="This month" action={<CornerLink onClick={() => nav('/finance/budgets')} />} />
          <div className="relative mx-auto mt-2 h-[160px] w-full">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={expenseBreakdown} dataKey="value" innerRadius={58} outerRadius={82} paddingAngle={3} cornerRadius={8} stroke="none">
                  {expenseBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip {...chartTooltip} formatter={(v: number) => fmtINR(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="font-display text-lg">{fmtCompact(expenseBreakdown.reduce((s, x) => s + x.value, 0))}</p>
                <p className="text-[10px] text-ash">Total spend</p>
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            {expenseBreakdown.map((x, i) => (
              <div key={x.name} className="flex items-center gap-2">
                <i className="size-2.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
                <span className="truncate text-ash">{x.name}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card compact className="lg:col-span-4">
          <CardHeader title="Receivables" subtitle={`${receivables.length} open · ${overdue.length} overdue`} action={<CornerLink onClick={() => nav('/finance/invoices')} />} />
          <p className="mt-3 font-display text-2xl"><CountUp value={fmtCompact(receivables.reduce((s, i) => s + i.total, 0))} /></p>
          <ResponsiveContainer width="100%" height={90}>
            <BarChart data={aging} margin={{ top: 12, right: 0, bottom: 0, left: 0 }}>
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} />
              <Tooltip {...chartTooltip} formatter={(v: number) => fmtINR(v)} />
              <Bar dataKey="value" radius={[6, 6, 2, 2]} barSize={28}>
                {aging.map((_, i) => <Cell key={i} fill={['#0d9488', '#059669', '#d97706', '#e11d48'][i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <ul className="mt-1 space-y-2">
            {overdue.slice(0, 3).map((i) => (
              <li key={i.id} className="flex items-center justify-between rounded-2xl bg-soft px-3 py-2 text-xs">
                <span className="flex items-center gap-2"><FileText size={14} className="text-rose-deep" />{i.client.name}</span>
                <b>{fmtCompact(i.total)}</b>
              </li>
            ))}
          </ul>
        </Card>

        <Card compact className="lg:col-span-4">
          <CardHeader title="Expense Approvals" subtitle={`${pendingExp.length} claims waiting`} action={<CornerLink onClick={() => nav('/finance/expenses')} />} />
          <ul className="mt-2 divide-y divide-line">
            {pendingExp.slice(0, 4).map((x) => {
              const e = employeeById(x.employeeId)!
              return (
                <li key={x.id} className="flex items-center gap-2.5 py-2">
                  <Avatar name={e.name} hue={e.avatarHue} src={photoFor(e)} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{fmtINR(x.amount)}</p>
                    <p className="truncate text-[11px] text-ash">{e.name} · {x.category}</p>
                  </div>
                  <button onClick={() => setExpenseStatus(x.id, 'Approved')} className="rounded-full bg-ink px-3 py-1.5 text-[11px] text-white hover:bg-black">Approve</button>
                </li>
              )
            })}
            {pendingExp.length === 0 && <li className="py-8 text-center text-sm text-ash">No pending claims 🎉</li>}
          </ul>
        </Card>

        <Card compact className="lg:col-span-4">
          <CardHeader title="Budget Utilisation" subtitle="FY to date" />
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl"><CountUp value={`${((totalSpent / totalBudget) * 100).toFixed(0)}%`} /></span>
            <span className="text-xs text-ash">{fmtCompact(totalSpent)} of {fmtCompact(totalBudget)}</span>
          </div>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={budgets.slice(0, 5)} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="dept" type="category" axisLine={false} tickLine={false} width={78} tick={{ fontSize: 10, fill: '#6b7280' }} />
              <Tooltip {...chartTooltip} formatter={(v: number) => fmtCompact(v)} />
              <Bar dataKey="allocated" fill="#e5e8ec" radius={[4, 4, 4, 4]} barSize={10} />
              <Bar dataKey="spent" radius={[4, 4, 4, 4]} barSize={10}>
                {budgets.slice(0, 5).map((b, i) => <Cell key={i} fill={b.spent / b.allocated > 0.65 ? '#e11d48' : '#059669'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card compact className="lg:col-span-8">
          <CardHeader title="Recent Transactions" action={<IconBtn><ArrowUpRight size={16} /></IconBtn>} />
          <ul className="mt-2 divide-y divide-line">
            {transactions.slice(0, 7).map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-2">
                <span className={clsx('grid size-9 shrink-0 place-items-center rounded-full', t.amount > 0 ? 'bg-lime' : 'bg-soft')}>
                  {t.amount > 0 ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{t.description}</p>
                  <p className="text-[11px] text-ash">{fmtShortDate(t.date)} · {t.account}</p>
                </div>
                <span className={clsx('font-display text-sm', t.amount > 0 && 'text-sage-deep')}>{t.amount > 0 ? '+' : '−'}{fmtINR(Math.abs(t.amount))}</span>
              </li>
            ))}
          </ul>
        </Card>

        <div className="card-dark animate-in relative overflow-hidden border border-white/10 p-4 lg:col-span-4">
          <div className="pointer-events-none absolute -right-10 -top-14 size-36 rounded-full bg-rose/15 blur-3xl" />
          <h3 className="relative text-[17px] font-medium leading-tight tracking-tight text-white">Tax & Compliance</h3>
          <p className="relative mt-1 text-xs text-white/50">GST · TDS · PF · ESI</p>
          <ul className="relative mt-3 space-y-2">
            {complianceDeadlines.map((c) => (
              <li key={c.title} className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm text-white">{c.title}</p>
                  <p className="text-[11px] text-white/50">Due {fmtShortDate(c.date)}</p>
                </div>
                <Badge tone={c.daysLeft <= 5 ? 'rose' : c.daysLeft <= 10 ? 'amber' : 'gray'}>{c.daysLeft}d</Badge>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
