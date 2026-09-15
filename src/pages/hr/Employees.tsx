import clsx from 'clsx'
import { Download, LayoutGrid, List, Mail, MapPin, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Avatar, Badge, Button, Card, Field, Input, Modal, PageHeader, Select, Table } from '../../components/ui'
import { DEPARTMENTS, LOCATIONS, TODAY, employees, type Department, type Employee } from '../../data/mock'
import { fmtCompact, fmtDate } from '../../lib/format'
import { photoFor } from '../../lib/photo'
import { useApp } from '../../store'

const STATUSES = ['All', 'Active', 'Probation', 'On Leave', 'Notice Period'] as const

export function exportCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = filename
  a.click()
}

export default function Employees() {
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const toast = useApp((s) => s.toast)
  const [q, setQ] = useState('')
  const [dept, setDept] = useState<'All' | Department>('All')
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('All')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [, force] = useState(0)

  const list = useMemo(
    () =>
      employees.filter(
        (e) =>
          (dept === 'All' || e.department === dept) &&
          (status === 'All' || e.status === status) &&
          `${e.name} ${e.role} ${e.email} ${e.id}`.toLowerCase().includes(q.toLowerCase()),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q, dept, status, employees.length],
  )

  const addOpen = params.get('new') === '1'
  const closeAdd = () => setParams({})

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle={`${employees.length} people across ${DEPARTMENTS.length} departments`}
        actions={
          <>
            <Button variant="light" onClick={() => exportCsv('employees.csv', [['ID', 'Name', 'Email', 'Department', 'Role', 'Location', 'Status', 'Joined', 'CTC'], ...list.map((e) => [e.id, e.name, e.email, e.department, e.role, e.location, e.status, e.joinDate, e.ctcAnnual])])}>
              <Download size={16} /> Export
            </Button>
            <Button onClick={() => setParams({ new: '1' })}>
              <Plus size={16} /> Add employee
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* Status chips */}
        {(['Active', 'Probation', 'On Leave', 'Notice Period'] as const).map((s, i) => (
          <button
            key={s}
            onClick={() => setStatus(status === s ? 'All' : s)}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-all duration-200',
              status === s
                ? 'border-ink bg-ink text-white'
                : 'border-line bg-white/70 text-ash hover:border-ink/30 hover:text-ink',
            )}
          >
            <span className={clsx('size-1.5 rounded-full', ['bg-sage-deep', 'bg-sky-deep', 'bg-ash', 'bg-rose-deep'][i])} />
            {s}
            <span className={clsx('font-display font-medium tabular-nums', status === s ? 'text-white/70' : 'text-ink/60')}>
              {employees.filter((e) => e.status === s).length}
            </span>
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ash" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="h-8 w-44 rounded-full border border-line bg-white/80 pl-8 pr-3 text-xs outline-none transition-all duration-200 focus:w-56 focus:border-ink/30 focus:bg-white"
            />
          </div>

          {/* Dept filter */}
          <Select value={dept} onChange={(e) => setDept(e.target.value as Department)} className="h-8 !rounded-full !py-0 !text-xs">
            <option value="All">All depts</option>
            {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
          </Select>

          {/* View toggle */}
          <div className="inline-flex rounded-full border border-line bg-white/80 p-0.5">
            {(['grid', 'list'] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={clsx('grid size-7 place-items-center rounded-full transition-all duration-200', view === v ? 'bg-ink text-white' : 'text-ash hover:text-ink')} aria-label={v}>
                {v === 'grid' ? <LayoutGrid size={13} /> : <List size={13} />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === 'grid' ? (
        <div className="animate-in grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {list.map((e) => (
            <div key={e.id} onClick={() => nav(`/hr/employees/${e.id}`)} className="card group cursor-pointer overflow-hidden p-3">
              <div className="relative h-[200px] w-full overflow-hidden rounded-2xl">
                <img
                  src={photoFor(e)}
                  alt={e.name}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-ink/75 via-ink/0 to-transparent">
                  <div className="w-full p-3 text-white">
                    <p className="truncate font-display text-sm font-semibold">{e.name}</p>
                    <p className="truncate text-[11px] text-white/75">{e.role}</p>
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-1.5 px-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-ash">{e.id} · {e.department}</span>
                  <Badge>{e.status}</Badge>
                </div>
                <p className="flex items-center gap-2 text-ash"><Mail size={13} /> <span className="truncate">{e.email}</span></p>
                <p className="flex items-center gap-2 text-ash"><MapPin size={13} /> {e.location} · {e.workMode}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <Table head={['Employee', 'Department', 'Location', 'Joined', 'CTC (annual)', 'Status']}>
            {list.map((e) => (
              <tr key={e.id} onClick={() => nav(`/hr/employees/${e.id}`)} className="cursor-pointer hover:bg-soft/60">
                <td>
                  <div className="flex items-center gap-3">
                    <Avatar name={e.name} hue={e.avatarHue} src={photoFor(e)} size={36} />
                    <div>
                      <p className="font-bold">{e.name}</p>
                      <p className="text-xs text-ash">{e.role}</p>
                    </div>
                  </div>
                </td>
                <td>{e.department}</td>
                <td>{e.location}</td>
                <td className="whitespace-nowrap">{fmtDate(e.joinDate)}</td>
                <td>{fmtCompact(e.ctcAnnual)}</td>
                <td><Badge>{e.status}</Badge></td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
      {list.length === 0 && <p className="py-16 text-center text-sm text-ash">No employees match these filters.</p>}

      <AddEmployeeModal
        open={addOpen}
        onClose={closeAdd}
        onSave={(e) => {
          employees.unshift(e)
          toast(`${e.name} added to ${e.department}`)
          closeAdd()
          force((n) => n + 1)
        }}
      />
    </div>
  )
}

function AddEmployeeModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (e: Employee) => void }) {
  const [form, setForm] = useState({ name: '', email: '', department: 'Engineering' as Department, role: '', location: 'Bengaluru', ctc: '1200000', gender: 'F' })
  const set = (k: keyof typeof form) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: ev.target.value })
  return (
    <Modal open={open} onClose={onClose} title="Add employee" width={600}>
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(ev) => {
          ev.preventDefault()
          onSave({
            id: `WS${1001 + employees.length}`,
            name: form.name,
            email: form.email || `${form.name.toLowerCase().replace(/\s+/g, '.')}@worksuite.in`,
            phone: '+91 98450 12345',
            gender: form.gender as 'M' | 'F',
            department: form.department,
            role: form.role || 'Associate',
            location: form.location as Employee['location'],
            workMode: 'Hybrid',
            status: 'Probation',
            joinDate: TODAY.toISOString().slice(0, 10),
            dob: '1996-05-12',
            ctcAnnual: Number(form.ctc),
            pan: 'ABCDE1234F',
            uan: '101234567890',
            bank: 'HDFC Bank ••2231',
            avatarHue: Math.floor(Math.random() * 360),
            performance: 4,
          })
          setForm({ ...form, name: '', email: '', role: '' })
        }}
      >
        <Field label="Full name"><Input required value={form.name} onChange={set('name')} placeholder="e.g. Meera Nair" /></Field>
        <Field label="Work email"><Input type="email" value={form.email} onChange={set('email')} placeholder="auto-generated if blank" /></Field>
        <Field label="Department">
          <Select className="w-full !rounded-xl" value={form.department} onChange={set('department')}>
            {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
          </Select>
        </Field>
        <Field label="Designation"><Input value={form.role} onChange={set('role')} placeholder="e.g. Product Designer" /></Field>
        <Field label="Location">
          <Select className="w-full !rounded-xl" value={form.location} onChange={set('location')}>
            {LOCATIONS.map((d) => <option key={d}>{d}</option>)}
          </Select>
        </Field>
        <Field label="Annual CTC (₹)"><Input type="number" min={100000} step={10000} value={form.ctc} onChange={set('ctc')} /></Field>
        <Field label="Gender">
          <Select className="w-full !rounded-xl" value={form.gender} onChange={set('gender')}>
            <option value="F">Female</option>
            <option value="M">Male</option>
          </Select>
        </Field>
        <div className="flex items-end justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save employee</Button>
        </div>
      </form>
    </Modal>
  )
}
