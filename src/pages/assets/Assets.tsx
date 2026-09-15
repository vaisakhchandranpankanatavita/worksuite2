import clsx from 'clsx'
import { Download, LayoutGrid, List, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { exportCsv } from '../hr/Employees'
import { Avatar, Badge, Button, Card, Field, Input, Modal, PageHeader, Select, Table } from '../../components/ui'
import { ASSET_CATEGORIES, employeeById, LOCATIONS, TODAY, type Asset, type AssetCategory, type AssetStatus } from '../../data/mock'
import { fmtDate, fmtINR } from '../../lib/format'
import { photoFor } from '../../lib/photo'
import { useApp } from '../../store'

const STATUSES: (AssetStatus | 'All')[] = ['All', 'Available', 'Assigned', 'Maintenance', 'Retired']

export default function Assets() {
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const { assets, addAsset } = useApp()
  const [q, setQ] = useState('')
  const [category, setCategory] = useState<'All' | AssetCategory>('All')
  const [status, setStatus] = useState<AssetStatus | 'All'>('All')
  const [view, setView] = useState<'grid' | 'list'>('list')

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
            {(['grid', 'list'] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={clsx('grid size-7 place-items-center rounded-full transition-all duration-200', view === v ? 'bg-ink text-white' : 'text-ash hover:text-ink')} aria-label={v}>
                {v === 'grid' ? <LayoutGrid size={13} /> : <List size={13} />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {list.map((a) => {
            const holder = a.assignedTo ? employeeById(a.assignedTo) : undefined
            return (
              <button key={a.id} onClick={() => nav(`/assets/inventory/${a.id}`)} className="card group overflow-hidden p-4 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ash">{a.id} · {a.category}</span>
                  <Badge>{a.status}</Badge>
                </div>
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
        <Card>
          <Table head={['Asset', 'Category', 'Serial', 'Assigned To', 'Purchased', 'Cost', 'Status']}>
            {list.map((a) => {
              const holder = a.assignedTo ? employeeById(a.assignedTo) : undefined
              return (
                <tr key={a.id} onClick={() => nav(`/assets/inventory/${a.id}`)} className="cursor-pointer hover:bg-soft/60">
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
    </div>
  )
}

function AddAssetModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (a: Asset) => void }) {
  const { assets } = useApp()
  const [form, setForm] = useState({ name: '', category: 'Laptop' as AssetCategory, model: '', location: 'Bengaluru', cost: '50000' })
  const set = (k: keyof typeof form) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: ev.target.value })
  return (
    <Modal open={open} onClose={onClose} title="Add asset" width={600}>
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(ev) => {
          ev.preventDefault()
          onSave({
            id: `AS${1001 + assets.length + Math.floor(Math.random() * 1000)}`,
            name: form.name,
            category: form.category,
            model: form.model || '—',
            serial: `WS-${form.category.slice(0, 2).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
            status: 'Available',
            purchaseDate: TODAY.toISOString().slice(0, 10),
            warrantyUntil: new Date(TODAY.getFullYear() + 1, TODAY.getMonth(), TODAY.getDate()).toISOString().slice(0, 10),
            cost: Number(form.cost),
            location: form.location as Asset['location'],
          })
          setForm({ ...form, name: '', model: '' })
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
        <div className="flex items-end justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save asset</Button>
        </div>
      </form>
    </Modal>
  )
}
