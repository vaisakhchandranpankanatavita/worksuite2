import { ArrowLeft, Headphones, Laptop, Monitor, Smartphone, Tablet, Wrench } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AssetOpenTransition from '../../components/AssetOpenTransition'
import { Avatar, Badge, Button, Field, Modal, Select } from '../../components/ui'
import { employeeById, employees, type AssetStatus } from '../../data/mock'
import { fmtDate, fmtINR } from '../../lib/format'
import { photoFor } from '../../lib/photo'
import { useApp } from '../../store'

const CATEGORY_ICON = { Laptop, Phone: Smartphone, Monitor, Headset: Headphones, Tablet, Accessory: Wrench } as const

export default function AssetDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { assets, assignAsset, unassignAsset, setAssetStatus, retireAsset } = useApp()
  const [assignOpen, setAssignOpen] = useState(false)
  const [entering, setEntering] = useState(true)
  const a = assets.find((x) => x.id === id)

  useEffect(() => { setEntering(true) }, [id])

  if (!a) return <p className="py-20 text-center text-ash">Asset not found.</p>

  const holder = a.assignedTo ? employeeById(a.assignedTo) : undefined
  const Icon = CATEGORY_ICON[a.category]

  return (
    <div>
      {entering && <AssetOpenTransition key={id} assetName={a.name} icon={Icon} onDone={() => setEntering(false)} />}

      <button onClick={() => nav('/assets/inventory')} className="mb-4 inline-flex items-center gap-2 text-sm text-ash hover:text-ink">
        <ArrowLeft size={16} /> All assets
      </button>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-normal tracking-tight md:text-[38px]">{a.name}</h1>
          <p className="mt-1 text-sm text-ash">{a.category} · {a.model} · {a.id}</p>
        </div>
        <Badge tone={a.status === 'Assigned' ? 'green' : a.status === 'Maintenance' ? 'amber' : a.status === 'Retired' ? 'rose' : 'blue'}>{a.status}</Badge>
      </div>

      <div className="grid items-stretch gap-4 md:grid-cols-3">
        <div className="card animate-in flex h-full flex-col p-5">
          <div className="mb-4 flex items-center gap-3">
            {a.image ? (
              <img src={a.image} alt={a.name} className="size-12 shrink-0 rounded-2xl object-cover" />
            ) : (
              <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-ink to-ash text-white"><Icon size={22} /></span>
            )}
            <div>
              <p className="font-display text-base font-semibold">{a.name}</p>
              <p className="text-xs text-ash">{a.model}</p>
            </div>
          </div>
          <div className="space-y-2.5 text-sm">
            <Row k="Serial number" v={a.serial} />
            <Row k="Location" v={a.location} />
            <Row k="Purchase date" v={fmtDate(a.purchaseDate)} />
            {a.warrantyUntil && <Row k="Warranty until" v={fmtDate(a.warrantyUntil)} />}
            <Row k="Cost" v={<b>{fmtINR(a.cost)}</b>} />
          </div>
        </div>

        <div className="card animate-in flex h-full flex-col p-5">
          <h3 className="mb-4 text-[17px] font-medium">Assignment</h3>
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
          <div className="mt-auto flex flex-wrap gap-2 pt-4">
            {holder ? (
              <Button size="sm" variant="light" onClick={() => unassignAsset(a.id)}>Unassign</Button>
            ) : (
              <Button size="sm" onClick={() => setAssignOpen(true)}>Assign to employee</Button>
            )}
          </div>
        </div>

        <div className="card animate-in flex h-full flex-col p-5">
          <h3 className="mb-4 text-[17px] font-medium">Status actions</h3>
          <div className="flex flex-1 flex-col justify-center gap-2">
            {(['Available', 'Assigned', 'Maintenance'] as AssetStatus[]).map((s) => (
              <Button key={s} size="sm" variant={a.status === s ? 'dark' : 'light'} disabled={a.status === s || (s === 'Assigned' && !holder)} onClick={() => setAssetStatus(a.id, s)}>
                Mark {s}
              </Button>
            ))}
            <Button size="sm" variant="danger" disabled={a.status === 'Retired'} onClick={() => retireAsset(a.id)}>Retire asset</Button>
          </div>
        </div>
      </div>

      {a.notes && (
        <div className="card animate-in mt-4 p-5">
          <h3 className="mb-2 text-[17px] font-medium">Notes</h3>
          <p className="text-sm text-ash">{a.notes}</p>
        </div>
      )}

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
    <div className="flex items-center justify-between gap-4">
      <span className="text-ash">{k}</span>
      <span className="truncate text-right">{v}</span>
    </div>
  )
}
