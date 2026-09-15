import { Boxes, Headphones, ImagePlus, IndianRupee, Laptop, MapPin, Monitor, PackageCheck, Plus, Smartphone, Sparkles, Tablet, UploadCloud, UserCheck, Wrench, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CountUp } from '../../components/CountUp'
import { Badge, Button, Field, Input, Modal, PageHeader, Select } from '../../components/ui'
import { ASSET_CATEGORIES, LOCATIONS, TODAY, type Asset, type AssetCategory } from '../../data/mock'
import { fmtINR } from '../../lib/format'
import { useApp } from '../../store'

const CATEGORY_ICON: Record<AssetCategory, typeof Laptop> = { Laptop, Phone: Smartphone, Monitor, Headset: Headphones, Tablet, Accessory: Wrench }

const CATEGORY_TINT: Record<AssetCategory, string> = {
  Laptop: 'linear-gradient(135deg, #3a3f38 0%, #23261f 100%)',
  Phone: 'linear-gradient(135deg, #4a4f92 0%, #2a2d5c 100%)',
  Monitor: 'linear-gradient(135deg, #3a5f8c 0%, #223a58 100%)',
  Headset: 'linear-gradient(135deg, #93516f 0%, #572c40 100%)',
  Tablet: 'linear-gradient(135deg, #4c7f5a 0%, #2a4a33 100%)',
  Accessory: 'linear-gradient(135deg, #92804c 0%, #574a25 100%)',
}

export default function StockList() {
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const { assets, addAsset } = useApp()

  const inStock = useMemo(() => assets.filter((a) => a.status !== 'Retired'), [assets])
  const total = inStock.length
  const totalValue = inStock.reduce((s, a) => s + a.cost, 0)
  const available = inStock.filter((a) => a.status === 'Available').length
  const assigned = inStock.filter((a) => a.status === 'Assigned').length

  const byLocation = useMemo(
    () => LOCATIONS.map((l) => ({ location: l, count: inStock.filter((a) => a.location === l).length })).filter((l) => l.count > 0),
    [inStock],
  )

  const shelves = useMemo(
    () => ASSET_CATEGORIES.map((c) => ({ category: c, items: inStock.filter((a) => a.category === c) })).filter((s) => s.items.length > 0),
    [inStock],
  )

  const stats = [
    { label: 'In stock', value: total, icon: Boxes, fmt: (n: number) => n },
    { label: 'Available', value: available, icon: PackageCheck, fmt: (n: number) => n },
    { label: 'Assigned', value: assigned, icon: UserCheck, fmt: (n: number) => n },
    { label: 'Total value', value: totalValue, icon: IndianRupee, fmt: (n: number) => fmtINR(n) },
  ]

  const addOpen = params.get('new') === '1'
  const closeAdd = () => setParams({})

  return (
    <div>
      <PageHeader
        title="Stock List"
        subtitle={`${total} items in stock across ${shelves.length} categories`}
        actions={
          <Button onClick={() => setParams({ new: '1' })} className="!bg-gradient-to-r !from-lime-deep !to-sky-deep !text-white shadow-[0_10px_24px_-10px_rgba(103,148,54,0.55)]">
            <Plus size={15} /> Add stock
          </Button>
        }
      />

      <div className="stagger space-y-4">
        {/* Compact stat row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, fmt }) => (
            <div key={label} className="animate-in card group relative flex items-center gap-3 overflow-hidden p-3.5">
              <div aria-hidden className="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full bg-lime/15 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />
              <span className="relative grid size-9 shrink-0 place-items-center rounded-xl bg-ink text-white shadow-[0_0_0_3px_rgba(26,29,27,0.06)]">
                <Icon size={15} />
              </span>
              <div className="relative min-w-0">
                <p className="truncate text-[11px] text-ash">{label}</p>
                <p className="font-display text-lg font-semibold leading-tight tabular-nums">
                  {typeof value === 'number' && label !== 'Total value' ? <CountUp value={value} /> : fmt(value)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Location chips */}
        {byLocation.length > 0 && (
          <div className="animate-in flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] text-ash"><MapPin size={12} /> By location</span>
            {byLocation.map((l) => (
              <span key={l.location} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/70 px-2.5 py-1 text-[11px] text-ink/80 transition-colors duration-200 hover:border-ink/25">
                {l.location}
                <span className="font-display font-semibold tabular-nums text-ink">{l.count}</span>
              </span>
            ))}
          </div>
        )}

        {/* Shelves */}
        <div className="space-y-3">
          {shelves.map(({ category, items }) => {
            const Icon = CATEGORY_ICON[category]
            return (
              <div key={category} className="animate-in card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-lg text-white" style={{ background: CATEGORY_TINT[category] }}>
                    <Icon size={13} />
                  </span>
                  <h3 className="font-display text-sm font-semibold">{category}</h3>
                  <span className="text-[11px] text-ash">{items.length}</span>
                </div>

                <div className="scroll-thin flex gap-3 overflow-x-auto">
                  {items.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => nav(`/assets/inventory/${a.id}`)}
                      className="group w-32 shrink-0 rounded-xl border border-line/70 bg-soft/30 p-2 text-left transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-ink/25 hover:bg-white hover:shadow-[0_12px_26px_-14px_rgba(26,29,27,0.35)]"
                    >
                      <div className="relative flex h-16 w-full items-center justify-center overflow-hidden rounded-lg bg-white/70">
                        {a.image ? (
                          <img
                            src={a.image}
                            alt={a.name}
                            className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                          />
                        ) : (
                          <span className="grid size-9 place-items-center rounded-lg text-white/90" style={{ background: CATEGORY_TINT[category] }}>
                            <Icon size={15} />
                          </span>
                        )}
                      </div>
                      <p className="mt-2 truncate text-[12px] font-semibold leading-tight">{a.name}</p>
                      <p className="truncate text-[10px] text-ash">{a.model}</p>
                      <div className="mt-1.5 flex items-center justify-between gap-1">
                        <Badge className="!px-1.5 !py-0 !text-[9px]">{a.status}</Badge>
                        <span className="shrink-0 text-[10px] text-ash">{fmtINR(a.cost)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <AddStockModal open={addOpen} onClose={closeAdd} onSave={(a) => { addAsset(a); closeAdd() }} existingCount={assets.length} />
    </div>
  )
}

function AddStockModal({ open, onClose, onSave, existingCount }: {
  open: boolean; onClose: () => void; onSave: (a: Asset) => void; existingCount: number
}) {
  const [form, setForm] = useState({ name: '', category: 'Laptop' as AssetCategory, model: '', location: 'Bengaluru' as Asset['location'], cost: '50000', image: '' })
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const set = <K extends keyof typeof form>(k: K) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: ev.target.value }))

  const readImage = (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => setForm((f) => ({ ...f, image: typeof reader.result === 'string' ? reader.result : '' }))
    reader.readAsDataURL(file)
  }

  const reset = () => setForm({ name: '', category: 'Laptop', model: '', location: 'Bengaluru', cost: '50000', image: '' })

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault()
    onSave({
      id: `AS${2000 + existingCount + Math.floor(Math.random() * 1000)}`,
      name: form.name,
      category: form.category,
      model: form.model || '—',
      serial: `WS-${form.category.slice(0, 2).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'Available',
      purchaseDate: TODAY.toISOString().slice(0, 10),
      warrantyUntil: new Date(TODAY.getFullYear() + 1, TODAY.getMonth(), TODAY.getDate()).toISOString().slice(0, 10),
      cost: Number(form.cost) || 0,
      location: form.location,
      image: form.image || undefined,
    })
    reset()
  }

  return (
    <Modal open={open} onClose={() => { onClose(); reset() }} title="Add stock" width={620}>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <div className="sm:col-span-2">
          <label
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); readImage(e.dataTransfer.files?.[0]) }}
            className={`relative flex cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-all duration-300 ${
              dragOver
                ? 'scale-[1.01] border-lime-deep bg-lime/15 shadow-[0_0_0_6px_rgba(174,206,82,0.15)]'
                : 'border-line bg-soft/50 hover:border-ink/30 hover:bg-soft'
            }`}
          >
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lime-deep/60 to-transparent" />
            {form.image ? (
              <>
                <img src={form.image} alt="" className="h-24 w-24 rounded-xl object-cover shadow-[0_8px_20px_-8px_rgba(26,29,27,0.35)]" />
                <span className="flex items-center gap-1 text-xs font-medium text-ink/70"><Sparkles size={12} className="text-lime-deep" /> Image ready — drop another to replace</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); setForm((f) => ({ ...f, image: '' })) }}
                  className="absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-white/90 text-ash shadow hover:text-rose-deep"
                  aria-label="Remove image"
                >
                  <X size={12} />
                </button>
              </>
            ) : (
              <>
                <span className="grid size-11 place-items-center rounded-2xl bg-ink text-white">
                  {dragOver ? <ImagePlus size={18} /> : <UploadCloud size={18} />}
                </span>
                <span className="text-sm font-semibold">{dragOver ? 'Drop to add photo' : 'Drag & drop a product photo'}</span>
                <span className="text-xs text-ash">or click to browse · PNG, JPG</span>
              </>
            )}
            <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={(e) => readImage(e.target.files?.[0])} />
          </label>
        </div>

        <Field label="Item name"><Input required value={form.name} onChange={set('name')} placeholder="e.g. MacBook Pro 14&quot;" /></Field>
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
          <Button type="button" variant="ghost" onClick={() => { onClose(); reset() }}>Cancel</Button>
          <Button type="submit" className="!bg-gradient-to-r !from-lime-deep !to-sky-deep !text-white">
            <Plus size={15} /> Add to shelf
          </Button>
        </div>
      </form>
    </Modal>
  )
}
