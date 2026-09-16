import clsx from 'clsx'
import { CheckSquare, Columns3, Download, FileUp, LayoutGrid, List, Plus, Search, Square, Upload, UserCheck, X, XCircle } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { exportCsv } from '../hr/Employees'
import { Avatar, Badge, Button, Card, Field, Input, Modal, PageHeader, Select, Table } from '../../components/ui'
import { ASSET_CATEGORIES, employeeById, employees, LOCATIONS, TODAY, type Asset, type AssetCategory, type AssetStatus } from '../../data/mock'
import { csvToObjects } from '../../lib/csv'
import { fmtDate, fmtINR } from '../../lib/format'
import { photoFor } from '../../lib/photo'
import { useApp } from '../../store'

const STATUSES: (AssetStatus | 'All')[] = ['All', 'Available', 'Assigned', 'Maintenance', 'Retired']
const KANBAN_COLUMNS: AssetStatus[] = ['Available', 'Assigned', 'Maintenance', 'Retired']

export default function Assets() {
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const { assets, addAsset, addAssets, assignAsset, setAssetStatus, retireAsset } = useApp()
  const [q, setQ] = useState('')
  const [category, setCategory] = useState<'All' | AssetCategory>('All')
  const [status, setStatus] = useState<AssetStatus | 'All'>('All')
  const [view, setView] = useState<'grid' | 'list' | 'kanban'>('list')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false)
  const [dragAssignId, setDragAssignId] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const list = useMemo(
    () =>
      assets.filter(
        (a) =>
          (category === 'All' || a.category === category) &&
          (status === 'All' || a.status === status) &&
          `${a.name} ${a.model} ${a.serial} ${a.id}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [assets, q, category, status],
  )

  const addOpen = params.get('new') === '1'
  const closeAdd = () => setParams({})

  const toggleSelect = (id: string) =>
    setSelected((s) => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  const allVisibleSelected = list.length > 0 && list.every((a) => selected.has(a.id))
  const toggleSelectAll = () => setSelected(allVisibleSelected ? new Set() : new Set(list.map((a) => a.id)))
  const clearSelection = () => setSelected(new Set())

  const exportSelected = () => {
    const rows = list.filter((a) => selected.has(a.id))
    exportCsv('assets-selected.csv', [
      ['ID', 'Name', 'Category', 'Serial', 'Status', 'Assigned To', 'Purchase Date', 'Cost'],
      ...rows.map((a) => [a.id, a.name, a.category, a.serial, a.status, a.assignedTo ? employeeById(a.assignedTo)?.name ?? a.assignedTo : '—', a.purchaseDate, a.cost]),
    ])
  }

  const bulkRetire = () => {
    selected.forEach((id) => retireAsset(id))
    clearSelection()
  }

  const dropOnColumn = (id: string, targetStatus: AssetStatus) => {
    const asset = assets.find((a) => a.id === id)
    if (!asset || asset.status === targetStatus) return
    if (targetStatus === 'Retired') return retireAsset(id)
    if (targetStatus === 'Assigned' && !asset.assignedTo) return setDragAssignId(id)
    setAssetStatus(id, targetStatus)
  }

  return (
    <div>
      <PageHeader
        title="Asset Inventory"
        subtitle={`${assets.length} assets across ${ASSET_CATEGORIES.length} categories`}
        actions={
          <>
            <Button
              variant="light"
              onClick={() =>
                exportCsv('assets.csv', [
                  ['ID', 'Name', 'Category', 'Serial', 'Status', 'Assigned To', 'Purchase Date', 'Cost'],
                  ...list.map((a) => [a.id, a.name, a.category, a.serial, a.status, a.assignedTo ? employeeById(a.assignedTo)?.name ?? a.assignedTo : '—', a.purchaseDate, a.cost]),
                ])
              }
            >
              <Download size={16} /> Export
            </Button>
            <Button variant="light" onClick={() => setImportOpen(true)}>
              <FileUp size={16} /> Import
            </Button>
            <Button onClick={() => setParams({ new: '1' })}>
              <Plus size={16} /> Add asset
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(['Available', 'Assigned', 'Maintenance', 'Retired'] as const).map((s, i) => (
          <button
            key={s}
            onClick={() => setStatus(status === s ? 'All' : s)}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-all duration-200',
              status === s ? 'border-ink bg-ink text-white' : 'border-line bg-white/70 text-ash hover:border-ink/30 hover:text-ink',
            )}
          >
            <span className={clsx('size-1.5 rounded-full', ['bg-sky-deep', 'bg-sage-deep', 'bg-amber-deep', 'bg-ash'][i])} />
            {s}
            <span className={clsx('font-display font-medium tabular-nums', status === s ? 'text-white/70' : 'text-ink/60')}>
              {assets.filter((a) => a.status === s).length}
            </span>
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ash" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="h-8 w-44 rounded-full border border-line bg-white/80 pl-8 pr-3 text-xs outline-none transition-all duration-200 focus:w-56 focus:border-ink/30 focus:bg-white"
            />
          </div>

          <Select value={category} onChange={(e) => setCategory(e.target.value as AssetCategory)} className="h-8 !rounded-full !py-0 !text-xs">
            <option value="All">All categories</option>
            {ASSET_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </Select>

          <div className="inline-flex rounded-full border border-line bg-white/80 p-0.5">
            {(['grid', 'list', 'kanban'] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={clsx('grid size-7 place-items-center rounded-full transition-all duration-200', view === v ? 'bg-ink text-white' : 'text-ash hover:text-ink')} aria-label={v}>
                {v === 'grid' ? <LayoutGrid size={13} /> : v === 'list' ? <List size={13} /> : <Columns3 size={13} />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="animate-in mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white/90 px-4 py-2.5">
          <span className="text-sm font-bold">{selected.size} selected</span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button size="sm" variant="light" onClick={() => setBulkAssignOpen(true)}><UserCheck size={14} /> Bulk assign</Button>
            <Button size="sm" variant="light" onClick={exportSelected}><Download size={14} /> Export selected</Button>
            <Button size="sm" variant="danger" onClick={bulkRetire}><XCircle size={14} /> Bulk retire</Button>
            <Button size="sm" variant="ghost" onClick={clearSelection}><X size={14} /> Clear</Button>
          </div>
        </div>
      )}

      {view === 'kanban' ? (
        <KanbanBoard list={list} onDropAsset={dropOnColumn} onOpen={(id) => nav(`/assets/inventory/${id}`)} />
      ) : view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {list.map((a) => {
            const holder = a.assignedTo ? employeeById(a.assignedTo) : undefined
            return (
              <button key={a.id} onClick={() => nav(`/assets/inventory/${a.id}`)} className="card group overflow-hidden p-4 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ash">{a.id} · {a.category}</span>
                  <Badge>{a.status}</Badge>
                </div>
                {a.image && (
                  <img src={a.image} alt={a.name} className="mt-3 h-28 w-full rounded-xl object-cover" />
                )}
                <p className="mt-2 truncate font-display text-base font-semibold">{a.name}</p>
                <p className="truncate text-xs text-ash">{a.model}</p>
                <div className="mt-3 flex items-center justify-between text-xs">
                  {holder ? (
                    <span className="flex items-center gap-2">
                      <Avatar name={holder.name} hue={holder.avatarHue} src={photoFor(holder)} size={22} />
                      <span className="truncate">{holder.name}</span>
                    </span>
                  ) : (
                    <span className="text-ash">Unassigned</span>
                  )}
                  <span className="text-ash">{fmtINR(a.cost)}</span>
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        <Card className="p-4">
          <Table head={[
            <button key="all" onClick={toggleSelectAll} className="grid place-items-center text-ash hover:text-ink" aria-label="Select all">
              {allVisibleSelected ? <CheckSquare size={15} /> : <Square size={15} />}
            </button>,
            'Asset', 'Category', 'Serial', 'Assigned To', 'Purchased', 'Cost', 'Status',
          ]}>
            {list.map((a) => {
              const holder = a.assignedTo ? employeeById(a.assignedTo) : undefined
              return (
                <tr key={a.id} onClick={() => nav(`/assets/inventory/${a.id}`)} className="cursor-pointer hover:bg-soft/60">
                  <td onClick={(e) => { e.stopPropagation(); toggleSelect(a.id) }}>
                    <button className="grid place-items-center text-ash hover:text-ink" aria-label={`Select ${a.name}`}>
                      {selected.has(a.id) ? <CheckSquare size={15} className="text-ink" /> : <Square size={15} />}
                    </button>
                  </td>
                  <td>
                    <p className="font-bold">{a.name}</p>
                    <p className="text-xs text-ash">{a.model}</p>
                  </td>
                  <td>{a.category}</td>
                  <td className="text-xs text-ash">{a.serial}</td>
                  <td>
                    {holder ? (
                      <div className="flex items-center gap-2">
                        <Avatar name={holder.name} hue={holder.avatarHue} src={photoFor(holder)} size={26} />
                        <span className="text-sm">{holder.name}</span>
                      </div>
                    ) : (
                      <span className="text-ash">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap">{fmtDate(a.purchaseDate)}</td>
                  <td>{fmtINR(a.cost)}</td>
                  <td><Badge>{a.status}</Badge></td>
                </tr>
              )
            })}
          </Table>
        </Card>
      )}
      {list.length === 0 && <p className="py-16 text-center text-sm text-ash">No assets match these filters.</p>}

      <AddAssetModal
        open={addOpen}
        onClose={closeAdd}
        onSave={(a) => {
          addAsset(a)
          closeAdd()
        }}
      />

      <BulkAssignModal
        open={bulkAssignOpen}
        count={selected.size}
        onClose={() => setBulkAssignOpen(false)}
        onAssign={(employeeId) => {
          selected.forEach((id) => assignAsset(id, employeeId))
          setBulkAssignOpen(false)
          clearSelection()
        }}
      />

      <BulkAssignModal
        open={dragAssignId !== null}
        count={1}
        onClose={() => setDragAssignId(null)}
        onAssign={(employeeId) => {
          if (dragAssignId) assignAsset(dragAssignId, employeeId)
          setDragAssignId(null)
        }}
      />

      <ImportModal
        open={importOpen}
        existingCount={assets.length}
        onClose={() => setImportOpen(false)}
        onImport={(rows) => {
          addAssets(rows)
          setImportOpen(false)
        }}
      />
    </div>
  )
}

function ImportModal({ open, existingCount, onClose, onImport }: { open: boolean; existingCount: number; onClose: () => void; onImport: (rows: Asset[]) => void }) {
  const [dragOver, setDragOver] = useState(false)
  const [rows, setRows] = useState<Asset[]>([])
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = () => { setRows([]); setFileName(''); setError('') }

  const handleFile = (file: File | undefined) => {
    if (!file) return
    setFileName(file.name)
    setError('')
    const reader = new FileReader()
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : ''
      const objs = csvToObjects(text)
      if (objs.length === 0 || !('name' in objs[0])) {
        setError('Could not read this file — make sure the first row has a "Name" column header.')
        setRows([])
        return
      }
      const parsed: Asset[] = objs
        .filter((o) => o.name)
        .map((o, i) => {
          const category = (ASSET_CATEGORIES.find((c) => c.toLowerCase() === o.category?.toLowerCase()) ?? 'Accessory') as AssetCategory
          const location = (LOCATIONS.find((l) => l.toLowerCase() === o.location?.toLowerCase()) ?? 'Bengaluru') as Asset['location']
          const cost = Number(o.cost) || 0
          return {
            id: `AS${1001 + existingCount + i + Math.floor(Math.random() * 1000)}`,
            name: o.name,
            category,
            model: o.model || '—',
            serial: o.serial || `WS-${category.slice(0, 2).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
            status: 'Available',
            purchaseDate: TODAY.toISOString().slice(0, 10),
            warrantyUntil: new Date(TODAY.getFullYear() + 1, TODAY.getMonth(), TODAY.getDate()).toISOString().slice(0, 10),
            cost,
            location,
          }
        })
      setRows(parsed)
    }
    reader.readAsText(file)
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title="Import stock from CSV" width={560}>
      {rows.length === 0 ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]) }}
          onClick={() => inputRef.current?.click()}
          className={clsx(
            'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-all duration-200',
            dragOver ? 'border-ink bg-soft scale-[1.01]' : 'border-line bg-soft/40 hover:border-ink/40 hover:bg-soft',
          )}
        >
          <span className="grid size-12 place-items-center rounded-2xl bg-white shadow-sm"><Upload size={20} className="text-ash" /></span>
          <div>
            <p className="text-sm font-semibold">Drag & drop a CSV file here</p>
            <p className="mt-1 text-xs text-ash">or click to browse · columns: Name, Category, Model, Cost, Location</p>
          </div>
          {error && <p className="text-xs font-bold text-rose-deep">{error}</p>}
          <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        </div>
      ) : (
        <div>
          <div className="mb-3 flex items-center justify-between rounded-xl bg-soft px-3 py-2 text-xs">
            <span className="font-bold">{fileName}</span>
            <button onClick={reset} className="text-ash hover:text-ink">Choose a different file</button>
          </div>
          <p className="mb-2 text-sm">Ready to import <b>{rows.length}</b> item{rows.length === 1 ? '' : 's'}:</p>
          <div className="max-h-56 space-y-1.5 overflow-y-auto scroll-thin pr-1">
            {rows.slice(0, 20).map((r, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-soft/60 px-3 py-1.5 text-xs">
                <span className="truncate font-medium">{r.name}</span>
                <span className="shrink-0 text-ash">{r.category} · {fmtINR(r.cost)}</span>
              </div>
            ))}
            {rows.length > 20 && <p className="py-1 text-center text-[11px] text-ash">+{rows.length - 20} more</p>}
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={reset}>Cancel</Button>
            <Button onClick={() => onImport(rows)}>Import {rows.length} item{rows.length === 1 ? '' : 's'}</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function KanbanBoard({ list, onDropAsset, onOpen }: { list: Asset[]; onDropAsset: (id: string, status: AssetStatus) => void; onOpen: (id: string) => void }) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<AssetStatus | null>(null)

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {KANBAN_COLUMNS.map((col) => {
        const items = list.filter((a) => a.status === col)
        return (
          <div
            key={col}
            onDragOver={(e) => { e.preventDefault(); setOverCol(col) }}
            onDragLeave={() => setOverCol((c) => (c === col ? null : c))}
            onDrop={(e) => {
              e.preventDefault()
              const id = e.dataTransfer.getData('text/asset-id')
              if (id) onDropAsset(id, col)
              setDragId(null)
              setOverCol(null)
            }}
            className={clsx(
              'flex min-h-[420px] flex-col rounded-2xl border p-3 transition-colors duration-150',
              overCol === col ? 'border-ink/30 bg-soft' : 'border-line/70 bg-soft/40',
            )}
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wide text-ash">{col}</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-ash">{items.length}</span>
            </div>
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto scroll-thin">
              {items.map((a) => (
                <div
                  key={a.id}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.setData('text/asset-id', a.id); setDragId(a.id) }}
                  onDragEnd={() => setDragId(null)}
                  onClick={() => onOpen(a.id)}
                  className={clsx(
                    'cursor-grab select-none rounded-xl border border-line bg-white p-3 text-left shadow-sm transition-all duration-150 active:cursor-grabbing hover:shadow-md',
                    dragId === a.id && 'opacity-40',
                  )}
                >
                  <p className="truncate text-sm font-semibold">{a.name}</p>
                  <p className="truncate text-[11px] text-ash">{a.category} · {a.serial}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[11px] text-ash">{a.location}</span>
                    <span className="text-[11px] font-bold">{fmtINR(a.cost)}</span>
                  </div>
                </div>
              ))}
              {items.length === 0 && <p className="py-6 text-center text-xs text-ash/70">Drop here</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function BulkAssignModal({ open, count, onClose, onAssign }: { open: boolean; count: number; onClose: () => void; onAssign: (employeeId: string) => void }) {
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? '')
  return (
    <Modal open={open} onClose={onClose} title={`Assign ${count} asset${count === 1 ? '' : 's'}`} width={440}>
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

function AddAssetModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (a: Asset) => void }) {
  const { assets } = useApp()
  const [form, setForm] = useState({ name: '', category: 'Laptop' as AssetCategory, model: '', location: 'Bengaluru', cost: '50000', image: '', assignedTo: '' })
  const set = (k: keyof typeof form) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: ev.target.value })

  const onImagePick = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setForm((f) => ({ ...f, image: typeof reader.result === 'string' ? reader.result : '' }))
    reader.readAsDataURL(file)
  }

  return (
    <Modal open={open} onClose={onClose} title="Add asset" width={600}>
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(ev) => {
          ev.preventDefault()
          const assigned = !!form.assignedTo
          onSave({
            id: `AS${1001 + assets.length + Math.floor(Math.random() * 1000)}`,
            name: form.name,
            category: form.category,
            model: form.model || '—',
            serial: `WS-${form.category.slice(0, 2).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
            status: assigned ? 'Assigned' : 'Available',
            assignedTo: assigned ? form.assignedTo : undefined,
            assignedOn: assigned ? TODAY.toISOString().slice(0, 10) : undefined,
            purchaseDate: TODAY.toISOString().slice(0, 10),
            warrantyUntil: new Date(TODAY.getFullYear() + 1, TODAY.getMonth(), TODAY.getDate()).toISOString().slice(0, 10),
            cost: Number(form.cost),
            location: form.location as Asset['location'],
            image: form.image || undefined,
          })
          setForm({ ...form, name: '', model: '', image: '', assignedTo: '' })
        }}
      >
        <Field label="Asset name"><Input required value={form.name} onChange={set('name')} placeholder="e.g. MacBook Pro 14&quot;" /></Field>
        <Field label="Category">
          <Select className="w-full !rounded-xl" value={form.category} onChange={set('category')}>
            {ASSET_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Model / spec"><Input value={form.model} onChange={set('model')} placeholder="e.g. Apple M3 Pro · 18GB" /></Field>
        <Field label="Location">
          <Select className="w-full !rounded-xl" value={form.location} onChange={set('location')}>
            {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Cost (₹)"><Input type="number" min={0} step={500} value={form.cost} onChange={set('cost')} /></Field>
        <Field label="Assign to employee (optional)">
          <Select className="w-full !rounded-xl" value={form.assignedTo} onChange={set('assignedTo')}>
            <option value="">Unassigned</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name} — {e.role}</option>)}
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-line bg-soft px-4 py-3 text-sm text-ash hover:border-ink">
            {form.image ? (
              <img src={form.image} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
            ) : (
              <Upload size={18} className="shrink-0" />
            )}
            <span>{form.image ? 'Image selected — click to change' : 'Upload asset image (optional)'}</span>
            <input type="file" className="hidden" accept="image/*" onChange={(e) => onImagePick(e.target.files?.[0])} />
          </label>
        </div>
        <div className="flex items-end justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save asset</Button>
        </div>
      </form>
    </Modal>
  )
}
