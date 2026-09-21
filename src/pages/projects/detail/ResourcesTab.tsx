import clsx from 'clsx'
import { Boxes, Plus, Receipt, UserMinus, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, Badge, Button, Card, CardHeader, Empty, Field, Input, Modal, Select, Table } from '../../../components/ui'
import { employeeById, employees } from '../../../data/mock'
import { dayLabel, todayDay, toDay } from '../../../lib/dates'
import { fmtCompact, fmtINR } from '../../../lib/format'
import { photoFor } from '../../../lib/photo'
import type { Analysis } from '../../../lib/projectMetrics'
import { useApp } from '../../../store'

const MONTH = 30.44
const ROLES = ['Engineer', 'Senior Engineer', 'QA Engineer', 'Designer', 'Analyst', 'Business Analyst', 'DevOps Engineer', 'Scrum Master', 'Specialist']
const ALLOCATIONS = [100, 80, 60, 50, 40, 25]
const ASSET_LIFE_MONTHS = 36

function AddMemberModal({ a, open, onClose }: { a: Analysis; open: boolean; onClose: () => void }) {
  const add = useApp((s) => s.addProjectMember)
  const [empId, setEmpId] = useState('')
  const [role, setRole] = useState(ROLES[0])
  const [alloc, setAlloc] = useState(50)
  const taken = new Set(a.project.team.filter((m) => !m.until).map((m) => m.employeeId))
  const options = useMemo(() => employees.filter((e) => !taken.has(e.id) && e.status !== 'Notice Period').sort((x, y) => x.department.localeCompare(y.department) || x.name.localeCompare(y.name)), [a.project.team])
  const chosen = employeeById(empId || options[0]?.id)

  return (
    <Modal open={open} onClose={onClose} title="Add a team member" width={480}>
      <div className="grid gap-4">
        <Field label="Person (from People)">
          <Select className="w-full" value={empId || options[0]?.id} onChange={(e) => setEmpId(e.target.value)}>
            {options.map((e) => <option key={e.id} value={e.id}>{e.name} — {e.role}, {e.department}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Role on project"><Select className="w-full" value={role} onChange={(e) => setRole(e.target.value)}>{ROLES.map((r) => <option key={r}>{r}</option>)}</Select></Field>
          <Field label="Allocation"><Select className="w-full" value={alloc} onChange={(e) => setAlloc(Number(e.target.value))}>{ALLOCATIONS.map((x) => <option key={x} value={x}>{x}%</option>)}</Select></Field>
        </div>
        {chosen && <p className="rounded-2xl bg-soft/70 p-3 text-xs text-ash">Adds about <b className="text-ink">{fmtINR((chosen.ctcAnnual / 12) * (alloc / 100))}</b> a month to the project's salary cost.</p>}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="light" onClick={onClose}>Cancel</Button>
        <Button onClick={() => { if (chosen) { add(a.project.id, chosen.id, role, alloc); onClose() } }}>Add to project</Button>
      </div>
    </Modal>
  )
}

function DeployAssetModal({ a, open, onClose }: { a: Analysis; open: boolean; onClose: () => void }) {
  const assets = useApp((s) => s.assets)
  const link = useApp((s) => s.linkProjectAsset)
  const [id, setId] = useState('')
  const linked = new Set(a.project.assetLinks.filter((l) => !l.until).map((l) => l.assetId))
  const options = assets.filter((x) => x.status !== 'Retired' && x.status !== 'Maintenance' && !linked.has(x.id)).sort((x, y) => Number(y.status === 'Available') - Number(x.status === 'Available') || x.category.localeCompare(y.category))
  const chosen = options.find((x) => x.id === (id || options[0]?.id))
  return (
    <Modal open={open} onClose={onClose} title="Deploy an asset" width={480}>
      <Field label="Asset (from Inventory)">
        <Select className="w-full" value={chosen?.id ?? ''} onChange={(e) => setId(e.target.value)}>
          {options.slice(0, 120).map((x) => <option key={x.id} value={x.id}>{x.id} · {x.name} — {x.status}</option>)}
        </Select>
      </Field>
      {chosen && <p className="mt-3 rounded-2xl bg-soft/70 p-3 text-xs text-ash">Charged to the project at <b className="text-ink">{fmtINR(chosen.cost / ASSET_LIFE_MONTHS)}</b> a month (3-year straight-line depreciation).</p>}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="light" onClick={onClose}>Cancel</Button>
        <Button disabled={!chosen} onClick={() => { if (chosen) { link(a.project.id, chosen.id); onClose() } }}>Deploy</Button>
      </div>
    </Modal>
  )
}

export default function ResourcesTab({ a }: { a: Analysis }) {
  const nav = useNavigate()
  const { project: p, fin } = a
  const assets = useApp((s) => s.assets)
  const removeMember = useApp((s) => s.removeProjectMember)
  const unlink = useApp((s) => s.unlinkProjectAsset)
  const [addingMember, setAddingMember] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const today = todayDay()
  const closed = p.status === 'Completed'

  const team = [...p.team].sort((x, y) => Number(!!x.until) - Number(!!y.until) || y.allocation - x.allocation)
  const links = [...p.assetLinks].sort((x, y) => Number(!!x.until) - Number(!!y.until))

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      {/* People — from HR */}
      <Card className="lg:col-span-7">
        <CardHeader
          title={<span className="flex items-center gap-2"><Users size={15} /> People</span>}
          subtitle={`From HR · ${fmtCompact(fin.people)} salary cost so far`}
          action={!closed ? <Button size="sm" variant="light" onClick={() => setAddingMember(true)}><Plus size={13} /> Add</Button> : undefined}
        />
        <Table className="mt-3" head={['Person', 'Role', 'Alloc.', 'Per month', 'To date', '']}>
          {team.map((m) => {
            const e = employeeById(m.employeeId)
            if (!e) return null
            const end = m.until ? toDay(m.until) : today
            const monthly = (e.ctcAnnual / 12) * (m.allocation / 100)
            const toDate = Math.max(0, end - toDay(m.since)) / MONTH * monthly
            return (
              <tr key={m.employeeId + m.since} className={clsx(m.until && 'opacity-50')}>
                <td>
                  <button onClick={() => nav(`/hr/employees/${e.id}`)} className="flex items-center gap-2.5 text-left">
                    <Avatar name={e.name} hue={e.avatarHue} src={photoFor(e)} size={28} />
                    <span className="leading-tight"><span className="block text-[13px] font-semibold">{e.name}</span><span className="text-[11px] text-ash">{e.department}</span></span>
                  </button>
                </td>
                <td className="text-xs">{m.role}{m.until && <span className="ml-1 text-ash">(released {dayLabel(toDay(m.until))})</span>}</td>
                <td className="text-xs font-semibold tabular-nums">{m.allocation}%</td>
                <td className="text-xs tabular-nums">{fmtCompact(monthly)}</td>
                <td className="text-xs tabular-nums">{fmtCompact(toDate)}</td>
                <td className="text-right">
                  {!m.until && !closed && m.role !== 'Project Head' && (
                    <button onClick={() => removeMember(p.id, m.employeeId)} title="Release from project" aria-label={`Release ${e.name}`} className="grid size-7 place-items-center rounded-full text-ash transition-colors hover:bg-rose/60 hover:text-rose-deep"><UserMinus size={14} /></button>
                  )}
                </td>
              </tr>
            )
          })}
        </Table>
      </Card>

      {/* Assets — from Inventory */}
      <Card className="lg:col-span-5">
        <CardHeader
          title={<span className="flex items-center gap-2"><Boxes size={15} /> Assets</span>}
          subtitle={`From Inventory · ${fmtCompact(fin.assetCharge)} depreciation charged`}
          action={!closed ? <Button size="sm" variant="light" onClick={() => setDeploying(true)}><Plus size={13} /> Deploy</Button> : undefined}
        />
        {links.length === 0 ? <div className="mt-3"><Empty>No assets deployed.</Empty></div> : (
          <ul className="scroll-thin mt-3 max-h-[420px] space-y-1 overflow-y-auto">
            {links.map((l) => {
              const x = assets.find((s) => s.id === l.assetId)
              if (!x) return null
              const holder = x.assignedTo ? employeeById(x.assignedTo) : undefined
              return (
                <li key={l.assetId + l.since} className={clsx('flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-soft', l.until && 'opacity-50')}>
                  <button onClick={() => nav(`/assets/inventory/${x.id}`)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <img src={x.image} alt="" className="size-10 shrink-0 rounded-xl bg-soft object-cover" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold">{x.name}</span>
                      <span className="block truncate text-[11px] text-ash">{x.id} · {holder ? `with ${holder.name.split(' ')[0]}` : x.status} · {fmtCompact(x.cost / ASSET_LIFE_MONTHS)}/mo</span>
                    </span>
                  </button>
                  {l.until ? <Badge tone="gray" dot={false}>Released</Badge> : !closed && (
                    <button onClick={() => unlink(p.id, x.id)} title="Release from project" aria-label={`Release ${x.name}`} className="grid size-7 place-items-center rounded-full text-ash transition-colors hover:bg-rose/60 hover:text-rose-deep"><UserMinus size={14} /></button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {/* Expense claims — from Finance */}
      <Card className="lg:col-span-6">
        <CardHeader title={<span className="flex items-center gap-2"><Receipt size={15} /> Expense claims</span>} subtitle={`From Finance · claims by team members, ${fmtCompact(fin.expenseClaims)} counted`} />
        {fin.expenses.length === 0 ? <div className="mt-3"><Empty>No expense claims from this team yet.</Empty></div> : (
          <Table className="mt-3" head={['Claim', 'By', 'Category', 'Amount', 'Status']}>
            {fin.expenses.map((x) => {
              const e = employeeById(x.employeeId)
              return (
                <tr key={x.id}>
                  <td className="text-xs font-semibold">{x.id}</td>
                  <td className="text-xs">{e?.name}</td>
                  <td className="text-xs">{x.category}</td>
                  <td className="text-xs tabular-nums">{fmtINR(x.amount)}</td>
                  <td><Badge>{x.status}</Badge></td>
                </tr>
              )
            })}
          </Table>
        )}
      </Card>

      {/* Billing — from Finance */}
      <Card className="lg:col-span-6">
        <CardHeader title={<span className="flex items-center gap-2"><Receipt size={15} /> Client billing</span>} subtitle={p.client === 'Internal' ? 'Internal project — not billed' : `Invoices to ${p.client} · ${fmtCompact(fin.billed)} billed, ${fmtCompact(fin.collected)} collected`} />
        {fin.invoices.length === 0 ? <div className="mt-3"><Empty>{p.client === 'Internal' ? 'No client billing on internal projects.' : 'No invoices raised since kick-off.'}</Empty></div> : (
          <Table className="mt-3" head={['Invoice', 'Issued', 'Due', 'Total', 'Status']}>
            {fin.invoices.map((i) => (
              <tr key={i.id} className="cursor-pointer" onClick={() => nav(`/finance/invoices?open=${i.id}`)}>
                <td className="text-xs font-semibold">{i.id}</td>
                <td className="text-xs">{dayLabel(toDay(i.issueDate))}</td>
                <td className="text-xs">{dayLabel(toDay(i.dueDate))}</td>
                <td className="text-xs tabular-nums">{fmtINR(i.total)}</td>
                <td><Badge>{i.status}</Badge></td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {addingMember && <AddMemberModal a={a} open onClose={() => setAddingMember(false)} />}
      {deploying && <DeployAssetModal a={a} open onClose={() => setDeploying(false)} />}
    </div>
  )
}
