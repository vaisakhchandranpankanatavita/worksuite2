import clsx from 'clsx'
import { Check, Paperclip, Plus, Upload, X } from 'lucide-react'
import { useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Avatar, Badge, Button, Card, CardHeader, Field, Input, Modal, PageHeader, Segmented, Select, Table, chartTooltip } from '../../components/ui'
import { CountUp } from '../../components/CountUp'
import { EXPENSE_CATEGORIES, TODAY, employeeById, employees, type ExpenseCategory } from '../../data/mock'
import { fmtCompact, fmtDate, fmtINR } from '../../lib/format'
import { photoFor } from '../../lib/photo'
import { useApp } from '../../store'

const TABS = ['Pending', 'Approved', 'Reimbursed', 'Rejected', 'All'] as const

export default function Expenses() {
  const { expenses, setExpenseStatus, addExpense } = useApp()
  const [tab, setTab] = useState<(typeof TABS)[number]>('Pending')
  const [open, setOpen] = useState(false)
  const list = expenses.filter((e) => tab === 'All' || e.status === tab)
  const byCat = EXPENSE_CATEGORIES.map((c) => ({ name: c.replace('Client Entertainment', 'Client Ent.').replace('Office Supplies', 'Office'), value: expenses.filter((e) => e.category === c && e.status !== 'Rejected').reduce((s, e) => s + e.amount, 0) }))
  const total = (s: string) => expenses.filter((e) => e.status === s).reduce((t, e) => t + e.amount, 0)

  return (
    <div>
      <PageHeader title="Expenses" subtitle="Employee claims & reimbursements" actions={<Button onClick={() => setOpen(true)}><Plus size={16} /> New claim</Button>} />

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="grid grid-cols-2 gap-3 lg:col-span-5">
          {[
            ['Awaiting approval', total('Pending'), 'bg-ink text-white'],
            ['Approved, to reimburse', total('Approved'), 'bg-lime'],
            ['Reimbursed (60d)', total('Reimbursed'), 'card'],
            ['Rejected', total('Rejected'), 'card'],
          ].map(([k, v, cls], i) => (
            <div key={k as string} className={clsx('animate-in rounded-[22px] p-4', cls)}>
              <p className={clsx('text-xs', i === 0 ? 'text-white/60' : 'text-ash')}>{k}</p>
              <p className="mt-3 font-display text-2xl font-light"><CountUp value={fmtCompact(v as number)} /></p>
            </div>
          ))}
        </div>
        <Card className="lg:col-span-7">
          <CardHeader title="Spend by Category" subtitle="Last 60 days" />
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={byCat} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={84} />
              <Tooltip {...chartTooltip} cursor={{ fill: 'rgba(38,40,37,0.04)' }} formatter={(v: number) => fmtINR(v)} />
              <Bar dataKey="value" name="Spend" fill="#a7f3d0" radius={[4, 10, 10, 4]} barSize={14} background={{ fill: '#eef1f4', radius: 10 }} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="lg:col-span-12">
          <CardHeader title="Claims" action={<Segmented value={tab} options={TABS} onChange={setTab} />} />
          <Table className="mt-3" head={['Employee', 'Category', 'Description', 'Date', 'Receipt', 'Amount', 'Status', '']}>
            {list.map((x) => {
              const e = employeeById(x.employeeId)!
              return (
                <tr key={x.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={e.name} hue={e.avatarHue} src={photoFor(e)} size={32} />
                      <div>
                        <p className="whitespace-nowrap font-bold">{e.name}</p>
                        <p className="text-xs text-ash">{x.id}</p>
                      </div>
                    </div>
                  </td>
                  <td><span className="whitespace-nowrap rounded-full bg-soft px-2.5 py-1 text-xs">{x.category}</span></td>
                  <td className="max-w-[240px] truncate">{x.description}</td>
                  <td className="whitespace-nowrap text-ash">{fmtDate(x.date)}</td>
                  <td>{x.hasReceipt ? <Paperclip size={15} className="text-ink" /> : <span className="text-xs text-rose-deep">Missing</span>}</td>
                  <td className="font-display">{fmtINR(x.amount)}</td>
                  <td><Badge>{x.status}</Badge></td>
                  <td>
                    {x.status === 'Pending' && (
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => setExpenseStatus(x.id, 'Rejected')} className="grid size-8 place-items-center rounded-full border border-line hover:bg-rose" aria-label="Reject"><X size={14} /></button>
                        <button onClick={() => setExpenseStatus(x.id, 'Approved')} className="grid size-8 place-items-center rounded-full bg-ink text-white" aria-label="Approve"><Check size={14} /></button>
                      </div>
                    )}
                    {x.status === 'Approved' && <Button size="sm" variant="lime" onClick={() => setExpenseStatus(x.id, 'Reimbursed')}>Reimburse</Button>}
                  </td>
                </tr>
              )
            })}
          </Table>
          {list.length === 0 && <p className="py-10 text-center text-sm text-ash">Nothing here.</p>}
        </Card>
      </div>

      <NewClaim open={open} onClose={() => setOpen(false)} onSave={(v) => { addExpense({ ...v, id: `EXP-${3200 + expenses.length}`, status: 'Pending', date: TODAY.toISOString().slice(0, 10) }); setOpen(false); setTab('Pending') }} />
    </div>
  )
}

function NewClaim({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (v: { employeeId: string; category: ExpenseCategory; description: string; amount: number; hasReceipt: boolean }) => void }) {
  const [f, setF] = useState({ employeeId: employees[5].id, category: 'Travel' as ExpenseCategory, description: '', amount: '', file: '' })
  return (
    <Modal open={open} onClose={onClose} title="New expense claim">
      <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); onSave({ employeeId: f.employeeId, category: f.category, description: f.description, amount: Number(f.amount), hasReceipt: !!f.file }); setF({ ...f, description: '', amount: '', file: '' }) }}>
        <Field label="Employee">
          <Select className="w-full !rounded-xl" value={f.employeeId} onChange={(e) => setF({ ...f, employeeId: e.target.value })}>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <Select className="w-full !rounded-xl" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as ExpenseCategory })}>
              {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Amount (₹)"><Input required type="number" min={1} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
        </div>
        <Field label="Description"><Input required value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="e.g. Cab to client office" /></Field>
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-soft py-6 text-sm text-ash hover:border-ink">
          <Upload size={20} />
          {f.file ? <span className="text-ink">{f.file}</span> : 'Upload receipt (PDF, JPG)'}
          <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => setF({ ...f, file: e.target.files?.[0]?.name ?? '' })} />
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit">Submit claim</Button>
        </div>
      </form>
    </Modal>
  )
}
