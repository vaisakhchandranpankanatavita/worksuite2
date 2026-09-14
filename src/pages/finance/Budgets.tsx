import clsx from 'clsx'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { HalfGauge } from '../../components/charts'
import { Badge, Card, CardHeader, PageHeader, Progress, Table, chartTooltip } from '../../components/ui'
import { CountUp } from '../../components/CountUp'
import { budgets } from '../../data/mock'
import { fmtCompact, fmtINR } from '../../lib/format'

export default function Budgets() {
  const total = budgets.reduce((s, b) => s + b.allocated, 0)
  const spent = budgets.reduce((s, b) => s + b.spent, 0)
  // FY runs Apr–Mar; expected burn = months elapsed / 12
  const now = new Date()
  const elapsed = ((now.getMonth() - 3 + 12) % 12) + now.getDate() / 30
  const expected = elapsed / 12
  const data = budgets.map((b) => ({ name: b.dept.replace('Human Resources', 'HR').replace('Customer Success', 'CS'), Allocated: b.allocated, Spent: b.spent }))

  return (
    <div>
      <PageHeader title="Budgets" subtitle={`FY 2026–27 · ${Math.round(expected * 100)}% of the year elapsed`} />
      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="flex flex-col items-center justify-center text-center lg:col-span-4">
          <p className="text-sm text-ash">Company budget used</p>
          <div className="relative mt-4">
            <HalfGauge value={(spent / total) * 100} size={220} color="#1a1d29" />
            <p className="absolute inset-x-0 bottom-0 font-display text-3xl"><CountUp value={`${((spent / total) * 100).toFixed(1)}%`} /></p>
          </div>
          <p className="mt-4 text-sm"><b>{fmtCompact(spent)}</b> spent of <b>{fmtCompact(total)}</b></p>
          <p className="mt-1 text-xs text-ash">Remaining {fmtINR(total - spent)}</p>
        </Card>
        <Card className="lg:col-span-8">
          <CardHeader title="Allocated vs Spent" subtitle="By department" />
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={{ top: 16, right: 0, left: -4, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#e5e8ec" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} interval={0} tick={{ fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={fmtCompact} width={64} />
              <Tooltip {...chartTooltip} cursor={{ fill: 'rgba(38,40,37,0.04)' }} formatter={(v: number) => fmtINR(v)} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Allocated" fill="#e2e5ea" radius={[8, 8, 3, 3]} barSize={16} />
              <Bar dataKey="Spent" fill="#1a1d29" radius={[8, 8, 3, 3]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="lg:col-span-12">
          <CardHeader title="Department Budgets" subtitle="Pace compares spend against time elapsed in the fiscal year" />
          <Table className="mt-3" head={['Department', 'Headcount', 'Allocated', 'Spent', 'Remaining', 'Utilisation', 'Pace']}>
            {budgets.map((b) => {
              const u = b.spent / b.allocated
              const pace = u - expected
              return (
                <tr key={b.dept}>
                  <td className="font-bold">{b.dept}</td>
                  <td>{b.headcount}</td>
                  <td>{fmtINR(b.allocated)}</td>
                  <td>{fmtINR(b.spent)}</td>
                  <td className="text-ash">{fmtINR(b.allocated - b.spent)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Progress value={u * 100} className="w-28" tone={pace > 0.08 ? 'rose' : 'ink'} />
                      <span className="text-xs">{Math.round(u * 100)}%</span>
                    </div>
                  </td>
                  <td><Badge tone={pace > 0.08 ? 'rose' : pace < -0.08 ? 'blue' : 'green'}>{pace > 0.08 ? 'Over pace' : pace < -0.08 ? 'Under pace' : 'On track'}</Badge></td>
                </tr>
              )
            })}
          </Table>
        </Card>
      </div>
      <p className={clsx('mt-4 text-center text-xs text-ash')}>Budgets are indicative demo figures.</p>
    </div>
  )
}
