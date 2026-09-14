import clsx from 'clsx'
import { ArrowDownLeft, ArrowUp, ArrowUpRight, Download, FileText, Landmark, Plus, TrendingUp, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { DonutChart, GroupedBar, HalfGauge, HatchedArea, MultiLineChart, SoftBars, WaterfallBar } from '../../components/charts'
import { CountUp } from '../../components/CountUp'
import { Avatar, Badge, Button, Card, CardHeader, CornerLink, IconBtn, Progress, Segmented, chartTooltip } from '../../components/ui'
import { TODAY, bankAccounts, budgets, complianceDeadlines, employeeById, expenseBreakdown, monthlyFinance, transactions } from '../../data/mock'
import { fmtCompact, fmtINR, fmtShortDate } from '../../lib/format'
import { photoFor } from '../../lib/photo'
import { useApp } from '../../store'

const PIE_COLORS = ['#1a1d1b', '#d8eca0', '#c8d9f4', '#f0cad8']

// Cash flow waterfall data — derived from monthlyFinance
const cashFlowData = [
  { name: 'Opening', value: 8200000 },
  ...monthlyFinance.slice(-4).map((m, i) => ({
    name: m.month ?? `M${i + 1}`,
    value: m.profit,
  })),
  { name: 'Closing', value: 8200000 + monthlyFinance.slice(-4).reduce((s, m) => s + m.profit, 0) },
]

// MoM Revenue vs Budget
const revVsBudget = monthlyFinance.slice(-6).map((m) => ({
  month: m.month,
  revenue: m.revenue,
  budget: Math.round(m.revenue * (0.92 + Math.random() * 0.16)),
  expenses: m.expenses,
  profit: m.profit,
}))

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
      { label: '1–30d', value: 0 },
      { label: '31–60d', value: 0 },
      { label: '60+d', value: 0 },
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
          <h1 className="font-display text-[32px] font-semibold leading-[1.1] tracking-tight md:text-[42px]">Financial Overview</h1>
          <p className="mt-2 text-sm text-ash">FY 2026–27 · Cash, revenue, spend and compliance at a glance.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="light" onClick={() => nav('/finance/reports')}><Download size={15} /> Reports</Button>
          <Button onClick={() => nav('/finance/invoices?new=1')}><Plus size={15} /> New invoice</Button>
        </div>
      </div>

      <div className="stagger grid gap-4 lg:grid-cols-12">

        {/* ── Cash hero dark card ──────────────────────────────────── */}
        <div className="animate-in relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#1e221e] to-[#131613] p-6 text-white lg:col-span-4 lg:row-span-2">
          <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-lime/15 blur-[70px]" />
          <div className="pointer-events-none absolute -bottom-16 left-0 size-48 rounded-full bg-sky/10 blur-[60px]" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-sm text-white/55">Total cash balance</p>
              <p className="mt-2 font-display text-4xl font-light tracking-tight">{fmtINR(cash)}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-lime">
                <ArrowUp size={12} /> 8.4% vs last month
              </p>
            </div>
            <span className="grid size-10 place-items-center rounded-full bg-white/10 ring-1 ring-white/10">
              <Wallet size={17} />
            </span>
          </div>
          <div className="relative mt-6 space-y-2">
            {bankAccounts.map((b) => (
              <div key={b.name} className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/5">
                <div className="flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-full bg-white/10"><Landmark size={13} /></span>
                  <div>
                    <p className="text-sm">{b.name}</p>
                    <p className="text-[11px] text-white/40">{b.number}</p>
                  </div>
                </div>
                <span className="font-display text-sm tabular-nums">{fmtCompact(b.balance)}</span>
              </div>
            ))}
          </div>
          <div className="relative mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-lime p-3 text-ink">
              <p className="text-[11px] font-medium">Runway</p>
              <p className="font-display text-xl font-semibold">{(cash / burn).toFixed(1)} mo</p>
            </div>
            <div className="hatch rounded-2xl border border-white/8 p-3">
              <p className="text-[11px] text-white/55">Monthly burn</p>
              <p className="font-display text-xl font-semibold">{fmtCompact(burn)}</p>
            </div>
          </div>
        </div>

        {/* ── KPI row ──────────────────────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-3 lg:col-span-8">
          {[
            {
              title: 'Revenue', value: cm.revenue, delta: pct(cm.revenue, pm.revenue),
              extra: <SoftBars values={monthlyFinance.slice(-6).map((m) => m.revenue)} highlight={5} height={52} color="#e4f1c3" hi="#aece52" />,
            },
            {
              title: 'Expenses', value: cm.expenses, delta: pct(cm.expenses, pm.expenses),
              extra: <SoftBars values={monthlyFinance.slice(-6).map((m) => m.expenses)} highlight={5} height={52} color="#dae4f6" hi="#6b92d8" />,
            },
            {
              title: 'Net Profit', value: cm.profit, delta: pct(cm.profit, pm.profit),
              extra: (
                <div className="relative">
                  <HalfGauge value={Math.round((cm.profit / cm.revenue) * 100 * 2.5)} size={96} color="#c6e0c0" track="#edf0ed" />
                  <span className="absolute inset-x-0 bottom-0 text-center text-[11px] font-bold">{((cm.profit / cm.revenue) * 100).toFixed(0)}% margin</span>
                </div>
              ),
            },
          ].map((k) => (
            <Card key={k.title}>
              <CardHeader title={k.title} subtitle={TODAY.toLocaleDateString('en-IN', { month: 'long' })} />
              <div className="mt-4 flex items-end justify-between gap-2">
                <div>
                  <p className="font-display text-2xl font-semibold"><CountUp value={fmtCompact(k.value)} /></p>
                  <p className={clsx('mt-1 flex items-center gap-0.5 text-xs font-bold', k.delta >= 0 === (k.title !== 'Expenses') ? 'text-sage-deep' : 'text-rose-deep')}>
                    {k.delta >= 0 ? <ArrowUp size={11} /> : <ArrowUp size={11} className="rotate-180" />}
                    {Math.abs(k.delta).toFixed(1)}%
                  </p>
                </div>
                {k.extra}
              </div>
            </Card>
          ))}
        </div>

        {/* ── Revenue vs Expenses line chart ───────────────────────── */}
        <Card className="lg:col-span-8">
          <CardHeader
            title="Revenue vs Expenses"
            subtitle={
              <span className="flex items-center gap-4">
                <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-[#aece52]" />Revenue</span>
                <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-[#6b92d8]" />Expenses</span>
                <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-[#5fa059]" />Profit</span>
              </span>
            }
            action={<Segmented value={range} options={['Quarter', 'Year'] as const} onChange={setRange} />}
          />
          <MultiLineChart
            data={series}
            lines={[
              { key: 'revenue', color: '#aece52' },
              { key: 'expenses', color: '#6b92d8', dashed: true },
              { key: 'profit', color: '#5fa059' },
            ]}
            xKey="month" height={200} format={fmtCompact}
          />
        </Card>

        {/* ── Spend Breakdown donut ────────────────────────────────── */}
        <Card className="lg:col-span-4">
          <CardHeader title="Spend Breakdown" subtitle="This month" action={<CornerLink onClick={() => nav('/finance/budgets')} />} />
          <DonutChart
            data={expenseBreakdown}
            colors={PIE_COLORS}
            innerLabel={fmtCompact(expenseBreakdown.reduce((s, x) => s + x.value, 0))}
            height={175}
            format={fmtINR}
          />
          <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">
            {expenseBreakdown.map((x, i) => (
              <div key={x.name} className="flex items-center gap-2">
                <i className="size-2.5 shrink-0 rounded-full" style={{ background: PIE_COLORS[i] }} />
                <span className="truncate text-ash">{x.name}</span>
                <span className="ml-auto font-bold">{fmtCompact(x.value)}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* ── NEW: Cash Flow Waterfall ─────────────────────────────── */}
        <Card className="lg:col-span-5">
          <CardHeader title="Cash Flow Waterfall" subtitle="Opening → monthly profit → closing" />
          <WaterfallBar data={cashFlowData} height={190} format={fmtCompact} />
          <div className="mt-2 flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-sage-deep" />Positive</span>
            <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-rose-deep" />Negative</span>
          </div>
        </Card>

        {/* ── NEW: Revenue vs Budget bars ──────────────────────────── */}
        <Card className="lg:col-span-4">
          <CardHeader title="Revenue vs Budget" subtitle="Last 6 months" />
          <GroupedBar
            data={revVsBudget}
            keys={['revenue', 'budget']}
            colors={['#aece52', '#dfe4de']}
            xKey="month" height={185}
            format={fmtCompact}
          />
          <div className="mt-2 flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-[#aece52]" />Actual</span>
            <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-[#dfe4de]" />Budget</span>
          </div>
        </Card>

        {/* ── Receivables ──────────────────────────────────────────── */}
        <Card className="lg:col-span-3">
          <CardHeader title="Receivables" subtitle={`${receivables.length} open · ${overdue.length} overdue`} action={<CornerLink onClick={() => nav('/finance/invoices')} />} />
          <p className="mt-4 font-display text-3xl font-semibold"><CountUp value={fmtCompact(receivables.reduce((s, i) => s + i.total, 0))} /></p>
          {/* Aging bar */}
          <div className="mt-4 flex h-2.5 overflow-hidden rounded-full">
            {aging.map((a, i) => {
              const total = aging.reduce((s, x) => s + x.value, 0) || 1
              return <div key={a.label} className={['bg-sage-deep', 'bg-lime-deep', 'bg-amber-deep', 'bg-rose-deep'][i]} style={{ width: `${(a.value / total) * 100}%` }} />
            })}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
            {aging.map((a, i) => (
              <div key={a.label} className={clsx('rounded-lg px-2.5 py-1.5', ['bg-sage/30', 'bg-lime/30', 'bg-amber/30', 'bg-rose/30'][i])}>
                <p className="text-ash text-[10px]">{a.label}</p>
                <p className="font-bold">{fmtCompact(a.value)}</p>
              </div>
            ))}
          </div>
          <ul className="mt-3 space-y-1.5">
            {overdue.slice(0, 3).map((i) => (
              <li key={i.id} className="flex items-center justify-between rounded-xl bg-soft/80 px-3 py-2 text-xs">
                <span className="flex items-center gap-2"><FileText size={13} className="text-rose-deep" />{i.client.name}</span>
                <b>{fmtCompact(i.total)}</b>
              </li>
            ))}
          </ul>
        </Card>

        {/* ── Expense Approvals ────────────────────────────────────── */}
        <Card className="lg:col-span-4">
          <CardHeader title="Expense Approvals" subtitle={`${pendingExp.length} claims waiting`} action={<CornerLink onClick={() => nav('/finance/expenses')} />} />
          <ul className="mt-3 divide-y divide-line/60">
            {pendingExp.slice(0, 4).map((x) => {
              const e = employeeById(x.employeeId)!
              return (
                <li key={x.id} className="flex items-center gap-2.5 py-2.5">
                  <Avatar name={e.name} hue={e.avatarHue} src={photoFor(e)} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{fmtINR(x.amount)}</p>
                    <p className="truncate text-[11px] text-ash">{e.name} · {x.category}</p>
                  </div>
                  <button onClick={() => setExpenseStatus(x.id, 'Approved')} className="rounded-full bg-ink px-3 py-1.5 text-[11px] font-semibold text-white transition-all hover:bg-black active:scale-90">
                    Approve
                  </button>
                </li>
              )
            })}
            {pendingExp.length === 0 && <li className="py-8 text-center text-sm text-ash">No pending claims 🎉</li>}
          </ul>
        </Card>

        {/* ── Budget Utilisation ───────────────────────────────────── */}
        <Card className="lg:col-span-4">
          <CardHeader title="Budget Utilisation" subtitle="FY to date" />
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-3xl font-semibold"><CountUp value={`${((totalSpent / totalBudget) * 100).toFixed(0)}%`} /></span>
            <span className="text-xs text-ash">{fmtCompact(totalSpent)} of {fmtCompact(totalBudget)}</span>
          </div>
          <div className="mt-4 space-y-3">
            {budgets.slice(0, 5).map((b) => {
              const pctUsed = (b.spent / b.allocated) * 100
              return (
                <div key={b.dept}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-medium">{b.dept}</span>
                    <span className={clsx('font-bold', pctUsed > 85 ? 'text-rose-deep' : pctUsed > 65 ? 'text-amber-deep' : 'text-ash')}>
                      {Math.round(pctUsed)}%
                    </span>
                  </div>
                  <Progress value={pctUsed} tone={pctUsed > 85 ? 'rose' : pctUsed > 65 ? 'lime' : 'ink'} />
                </div>
              )
            })}
          </div>
        </Card>

        {/* ── Recent Transactions ──────────────────────────────────── */}
        <Card className="lg:col-span-8">
          <CardHeader title="Recent Transactions" action={<IconBtn><ArrowUpRight size={15} /></IconBtn>} />
          <ul className="mt-3 divide-y divide-line/60">
            {transactions.slice(0, 7).map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-2.5">
                <span className={clsx('grid size-9 shrink-0 place-items-center rounded-full', t.amount > 0 ? 'bg-lime/70' : 'bg-soft')}>
                  {t.amount > 0 ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.description}</p>
                  <p className="text-[11px] text-ash">{fmtShortDate(t.date)} · {t.account}</p>
                </div>
                <span className={clsx('font-display text-sm font-semibold', t.amount > 0 ? 'text-sage-deep' : '')}>
                  {t.amount > 0 ? '+' : '−'}{fmtINR(Math.abs(t.amount))}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        {/* ── Tax & Compliance dark card ───────────────────────────── */}
        <div className="card-dark animate-in p-5 lg:col-span-4">
          <h3 className="font-display text-[16px] font-semibold leading-tight text-white">Tax & Compliance</h3>
          <p className="mt-1 text-xs text-white/50">GST · TDS · PF · ESI</p>
          <ul className="mt-4 space-y-2.5">
            {complianceDeadlines.map((c) => (
              <li key={c.title} className="flex items-center justify-between gap-2 rounded-2xl border border-white/8 bg-white/5 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm text-white">{c.title}</p>
                  <p className="text-[11px] text-white/45">Due {fmtShortDate(c.date)}</p>
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
