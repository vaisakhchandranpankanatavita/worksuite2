import { Download, FileBarChart, FileSpreadsheet, Landmark, Receipt, Users, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button, Card, CardHeader, PageHeader, Segmented, Table, chartTooltip } from '../../components/ui'
import { CountUp } from '../../components/CountUp'
import { exportCsv } from '../hr/Employees'
import { budgets, computePayslip, employees, monthlyFinance, payrollRuns } from '../../data/mock'
import { fmtCompact, fmtINR } from '../../lib/format'
import { useApp } from '../../store'

export default function Reports() {
  const { invoices, expenses, toast } = useApp()
  const [period, setPeriod] = useState<'Q' | 'H1' | 'FY'>('FY')
  const rows = period === 'Q' ? monthlyFinance.slice(-3) : period === 'H1' ? monthlyFinance.slice(-6) : monthlyFinance
  const sum = (k: keyof (typeof rows)[number]) => rows.reduce((s, r) => s + (r[k] as number), 0)

  const REPORTS = [
    { icon: FileBarChart, title: 'Profit & Loss', desc: 'Revenue, COGS, opex and net profit', run: () => exportCsv('profit-loss.csv', [['Month', 'Revenue', 'Payroll', 'Operating', 'Marketing', 'Profit'], ...monthlyFinance.map((m) => [m.month, m.revenue, m.payroll, m.operating, m.marketing, m.profit])]) },
    { icon: Wallet, title: 'Payroll Summary', desc: 'Gross, deductions and net by month', run: () => exportCsv('payroll-summary.csv', [['Month', 'Employees', 'Gross', 'Deductions', 'Net'], ...payrollRuns.map((r) => [r.label, r.employees, r.gross, r.deductions, r.net])]) },
    { icon: Landmark, title: 'TDS & PF Statement', desc: 'Statutory deductions per employee', run: () => exportCsv('statutory.csv', [['ID', 'Name', 'PAN', 'UAN', 'PF', 'ESI', 'PT', 'TDS'], ...employees.map((e) => { const p = computePayslip(e); return [e.id, e.name, e.pan, e.uan, p.pf, p.esi, p.pt, p.tds] })]) },
    { icon: FileSpreadsheet, title: 'GST Sales Register', desc: 'Invoice-wise GST for GSTR-1', run: () => exportCsv('gst-register.csv', [['Invoice', 'Date', 'Client', 'GSTIN', 'Taxable', 'GST', 'Total'], ...invoices.map((i) => [i.id, i.issueDate, i.client.name, i.client.gstin, i.subtotal, i.gst, i.total])]) },
    { icon: Receipt, title: 'Expense Report', desc: 'All claims with status', run: () => exportCsv('expenses.csv', [['ID', 'Employee', 'Category', 'Amount', 'Status', 'Date'], ...expenses.map((x) => [x.id, x.employeeId, x.category, x.amount, x.status, x.date])]) },
    { icon: Users, title: 'Headcount Cost', desc: 'CTC by department', run: () => exportCsv('headcount-cost.csv', [['Department', 'Headcount', 'Annual budget', 'Spent'], ...budgets.map((b) => [b.dept, b.headcount, b.allocated, b.spent])]) },
  ]

  return (
    <div>
      <PageHeader title="Reports" subtitle="Financial statements and exports" actions={<Segmented value={period} options={['Q', 'H1', 'FY'] as const} onChange={setPeriod} />} />

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardHeader title="Profit & Loss Trend" subtitle="Revenue and expenses (bars), net profit (line)" />
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={rows} margin={{ top: 16, right: 0, left: -4, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#e5e8ec" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={fmtCompact} width={64} />
              <Tooltip {...chartTooltip} cursor={{ fill: 'rgba(38,40,37,0.04)' }} formatter={(v: number) => fmtINR(v)} />
              <Bar dataKey="revenue" name="Revenue" fill="#a7f3d0" radius={[8, 8, 3, 3]} barSize={14} />
              <Bar dataKey="expenses" name="Expenses" fill="#e2e5ea" radius={[8, 8, 3, 3]} barSize={14} />
              <Line dataKey="profit" name="Net profit" stroke="#1a1d29" strokeWidth={2} dot={{ r: 3, fill: '#1a1d29' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        <div className="animate-in rounded-[22px] bg-ink p-6 text-white lg:col-span-4">
          <p className="text-sm text-white/60">Income statement · {period === 'FY' ? 'Last 12 months' : period === 'H1' ? 'Last 6 months' : 'Last quarter'}</p>
          <div className="mt-5 space-y-3 text-sm">
            {[
              ['Revenue', sum('revenue')],
              ['Payroll', -sum('payroll')],
              ['Operating expenses', -sum('operating')],
              ['Marketing', -sum('marketing')],
            ].map(([k, v]) => (
              <div key={k as string} className="flex justify-between border-b border-dashed border-white/10 pb-2.5">
                <span className="text-white/70">{k}</span>
                <span className="font-display">{(v as number) < 0 ? '−' : ''}{fmtCompact(Math.abs(v as number))}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl bg-lime p-4 text-ink">
            <p className="text-xs">Net profit</p>
            <p className="font-display text-3xl"><CountUp value={fmtCompact(sum('profit'))} /></p>
            <p className="text-xs">{((sum('profit') / sum('revenue')) * 100).toFixed(1)}% margin</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-12 lg:grid-cols-3">
          {REPORTS.map((r) => (
            <Card key={r.title} className="flex items-center gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-soft"><r.icon size={20} /></span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-medium">{r.title}</p>
                <p className="truncate text-xs text-ash">{r.desc}</p>
              </div>
              <Button size="sm" variant="light" onClick={() => { r.run(); toast(`${r.title} exported`) }}><Download size={13} /> CSV</Button>
            </Card>
          ))}
        </div>

        <Card className="lg:col-span-12">
          <CardHeader title="Monthly Breakdown" />
          <Table className="mt-3" head={['Month', 'Revenue', 'Payroll', 'Operating', 'Marketing', 'Total expenses', 'Net profit', 'Margin']}>
            {rows.map((m) => (
              <tr key={m.month}>
                <td className="font-bold">{m.month}</td>
                <td>{fmtINR(m.revenue)}</td>
                <td className="text-ash">{fmtINR(m.payroll)}</td>
                <td className="text-ash">{fmtINR(m.operating)}</td>
                <td className="text-ash">{fmtINR(m.marketing)}</td>
                <td>{fmtINR(m.expenses)}</td>
                <td className={m.profit < 0 ? 'text-rose-deep' : 'font-bold'}>{fmtINR(m.profit)}</td>
                <td>{((m.profit / m.revenue) * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </div>
  )
}
