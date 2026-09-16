import { ArrowLeft, Clock, Headphones, Laptop, Monitor, Smartphone, Tablet, Wrench } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Avatar, Badge, Button, Empty, Field, Modal, Select } from '../../components/ui'
import { employeeById, employees, type AssetStatus } from '../../data/mock'
import { bookValue } from '../../lib/depreciation'
import { fmtDate, fmtINR } from '../../lib/format'
import { photoFor } from '../../lib/photo'
import { useApp } from '../../store'

const CATEGORY_ICON = { Laptop, Phone: Smartphone, Monitor, Headset: Headphones, Tablet, Accessory: Wrench } as const

export default function AssetDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { assets, assetLog, assignAsset, unassignAsset, setAssetStatus, retireAsset } = useApp()
  const [assignOpen, setAssignOpen] = useState(false)
  const a = assets.find((x) => x.id === id)
  const history = useMemo(() => assetLog.filter((l) => l.assetId === id), [assetLog, id])
  if (!a) return <p className="py-20 text-center text-ash">Asset not found.</p>

  const holder = a.assignedTo ? employeeById(a.assignedTo) : undefined
  const Icon = CATEGORY_ICON[a.category]

  return (
    <div>
      <button onClick={() => nav('/assets/inventory')} className="mb-4 inline-flex items-center gap-2 text-sm text-ash hover:text-ink">
        <ArrowLeft size={16} /> All assets
      </button>

      {/* Hero header */}
      <div className="card animate-in mb-3 flex flex-wrap items-center gap-4 p-4">
        {a.image ? (
          <img src={a.image} alt={a.name} className="size-16 shrink-0 rounded-2xl object-cover shadow-[0_6px_16px_-6px_rgba(26,29,27,0.3)]" />
        ) : (
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-ink to-ash text-white"><Icon size={26} /></span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-normal tracking-tight md:text-[30px]">{a.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ash">
            <span>{a.category}</span>
            <span className="text-ash/40">·</span>
            <span>{a.model}</span>
            <span className="text-ash/40">·</span>
            <span className="font-mono text-xs">{a.id}</span>
          </p>
        </div>
        <Badge tone={a.status === 'Assigned' ? 'green' : a.status === 'Maintenance' ? 'amber' : a.status === 'Retired' ? 'rose' : 'blue'}>{a.status}</Badge>
      </div>

      <div className="grid items-start gap-3 md:grid-cols-3">
        {/* Left: details + notes + activity */}
        <div className="flex flex-col gap-3 md:col-span-2">
          <div className="card animate-in p-4">
            <h3 className="mb-3 text-[15px] font-medium">Details</h3>
            <div className="divide-y divide-line/70">
              <Row k="Serial number" v={a.serial} />
              <Row k="Location" v={a.location} />
              <Row k="Purchase date" v={fmtDate(a.purchaseDate)} />
              {a.warrantyUntil && <Row k="Warranty until" v={fmtDate(a.warrantyUntil)} />}
              {a.returnDue && <Row k="Return due" v={<span className={new Date(a.returnDue) < new Date() ? 'font-bold text-rose-deep' : undefined}>{fmtDate(a.returnDue)}</span>} />}
              <Row k="Cost" v={fmtINR(a.cost)} />
              <Row k="Book value" v={<b>{fmtINR(bookValue(a.cost, a.purchaseDate))}</b>} />
            </div>
          </div>

          {a.notes && (
            <div className="card animate-in p-4">
              <h3 className="mb-2 text-[15px] font-medium">Notes</h3>
              <p className="text-sm text-ash">{a.notes}</p>
            </div>
          )}

          <div className="card animate-in p-4">
            <h3 className="mb-4 flex items-center gap-2 text-[15px] font-medium"><Clock size={14} className="text-ash" /> Activity</h3>
            {history.length > 0 ? (
              <ul className="relative space-y-4 before:absolute before:bottom-1 before:left-[3px] before:top-1 before:w-px before:bg-line">
                {history.map((h) => (
                  <li key={h.id} className="relative flex gap-3 pl-5 text-sm">
                    <span className="absolute left-0 top-1.5 size-[7px] shrink-0 rounded-full bg-ink/60 ring-4 ring-white" />
                    <div className="min-w-0 flex-1">
                      <p><b>{h.action}</b> — {h.detail}</p>
                      <p className="text-[11px] text-ash">{fmtDate(h.date)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No activity recorded this session yet.</Empty>
            )}
          </div>
        </div>

        {/* Right: assignment + status */}
        <div className="flex flex-col gap-3">
          <div className="card animate-in p-4">
            <h3 className="mb-4 text-[15px] font-medium">Assignment</h3>
            {holder ? (
              <div className="flex items-center gap-3">
                <Avatar name={holder.name} hue={holder.avatarHue} src={photoFor(holder)} size={44} />
                <div className="min-w-0 flex-1">
                  <button className="truncate text-left font-bold underline" onClick={() => nav(`/hr/employees/${holder.id}`)}>{holder.name}</button>
                  <p className="truncate text-xs text-ash">{holder.role} · {holder.department}</p>
                  {a.assignedOn && <p className="mt-1 text-[11px] text-ash">Since {fmtDate(a.assignedOn)}</p>}
                </div>
              </div>
            ) : (
              <p className="text-sm text-ash">Not currently assigned to anyone.</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {holder ? (
                <Button size="sm" variant="light" onClick={() => unassignAsset(a.id)}>Unassign</Button>
              ) : (
                <Button size="sm" onClick={() => setAssignOpen(true)}>Assign to employee</Button>
              )}
            </div>
          </div>

          <div className="card animate-in p-4">
            <h3 className="mb-4 text-[15px] font-medium">Status actions</h3>
            <div className="flex flex-col gap-2">
              {(['Available', 'Assigned', 'Maintenance'] as AssetStatus[]).map((s) => (
                <Button key={s} size="sm" variant={a.status === s ? 'dark' : 'light'} disabled={a.status === s || (s === 'Assigned' && !holder)} onClick={() => setAssetStatus(a.id, s)}>
                  Mark {s}
                </Button>
              ))}
              <Button size="sm" variant="danger" disabled={a.status === 'Retired'} onClick={() => retireAsset(a.id)}>Retire asset</Button>
            </div>
          </div>
        </div>
      </div>

      <AssignModal open={assignOpen} onClose={() => setAssignOpen(false)} onAssign={(employeeId) => { assignAsset(a.id, employeeId); setAssignOpen(false) }} />
    </div>
  )
}

function AssignModal({ open, onClose, onAssign }: { open: boolean; onClose: () => void; onAssign: (employeeId: string) => void }) {
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? '')
  return (
    <Modal open={open} onClose={onClose} title="Assign asset" width={440}>
      <form
        className="grid gap-4"
        onSubmit={(ev) => { ev.preventDefault(); if (employeeId) onAssign(employeeId) }}
      >
        <Field label="Employee">
          <Select className="w-full !rounded-xl" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name} — {e.role}</option>)}
          </Select>
        </Field>
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit">Assign</Button>
        </div>
      </form>
    </Modal>
  )
}

function Row({ k, v }: { k: ReactNode; v: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-sm first:pt-0 last:pb-0">
      <span className="text-ash">{k}</span>
      <span className="truncate text-right">{v}</span>
    </div>
  )
}
