import { Boxes, Headphones, Laptop, MapPin, Monitor, Smartphone, Tablet, Wrench } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Tilt3D from '../../components/Tilt3D'
import { CountUp } from '../../components/CountUp'
import { Badge, PageHeader } from '../../components/ui'
import { ASSET_CATEGORIES, LOCATIONS, type AssetCategory } from '../../data/mock'
import { fmtINR } from '../../lib/format'
import { useApp } from '../../store'

const CATEGORY_ICON: Record<AssetCategory, typeof Laptop> = { Laptop, Phone: Smartphone, Monitor, Headset: Headphones, Tablet, Accessory: Wrench }

const CATEGORY_GRADIENT: Record<AssetCategory, string> = {
  Laptop: 'linear-gradient(135deg, #232823 0%, #12140f 100%)',
  Phone: 'linear-gradient(135deg, #3a3f7a 0%, #1c1e3d 100%)',
  Monitor: 'linear-gradient(135deg, #2c4a72 0%, #16273d 100%)',
  Headset: 'linear-gradient(135deg, #7a3f5a 0%, #3a1c29 100%)',
  Tablet: 'linear-gradient(135deg, #3f6b4a 0%, #1c3322 100%)',
  Accessory: 'linear-gradient(135deg, #7a6a3f 0%, #3a321c 100%)',
}

export default function StockList() {
  const nav = useNavigate()
  const { assets } = useApp()

  const inStock = useMemo(() => assets.filter((a) => a.status !== 'Retired'), [assets])
  const total = inStock.length
  const totalValue = inStock.reduce((s, a) => s + a.cost, 0)

  const byCategory = useMemo(
    () => ASSET_CATEGORIES.map((c) => {
      const items = inStock.filter((a) => a.category === c)
      return {
        category: c,
        count: items.length,
        available: items.filter((a) => a.status === 'Available').length,
        assigned: items.filter((a) => a.status === 'Assigned').length,
        value: items.reduce((s, a) => s + a.cost, 0),
      }
    }),
    [inStock],
  )

  const byLocation = useMemo(
    () => LOCATIONS.map((l) => ({ location: l, count: inStock.filter((a) => a.location === l).length })).filter((l) => l.count > 0),
    [inStock],
  )

  const shelves = useMemo(
    () => ASSET_CATEGORIES.map((c) => ({ category: c, items: inStock.filter((a) => a.category === c) })).filter((s) => s.items.length > 0),
    [inStock],
  )

  return (
    <div>
      <PageHeader title="Stock List" subtitle={`${total} items in stock across ${ASSET_CATEGORIES.length} categories`} />

      <div className="stagger grid gap-5 lg:grid-cols-12">
        {/* Hero total */}
        <Tilt3D className="lg:col-span-4" rotateAmplitude={8}>
          <div
            className="animate-in relative flex h-full min-h-[220px] flex-col justify-between overflow-hidden rounded-[26px] p-6 text-white shadow-[0_24px_60px_-20px_rgba(26,29,27,0.55)]"
            style={{ background: 'linear-gradient(150deg, #1e221e 0%, #0d0f0c 100%)' }}
          >
            <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-lime/20 blur-[70px]" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 size-56 rounded-full bg-sky/15 blur-[70px]" />
            <div className="relative flex items-center justify-between">
              <span className="text-sm text-white/55">Total stock on hand</span>
              <span className="grid size-10 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/10"><Boxes size={18} /></span>
            </div>
            <div className="relative">
              <p className="font-display text-6xl font-semibold tracking-tight tabular-nums"><CountUp value={total} /></p>
              <p className="mt-2 text-sm text-white/55">{fmtINR(totalValue)} total value · excludes retired</p>
            </div>
          </div>
        </Tilt3D>

        {/* Category tiles */}
        <div className="grid gap-5 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-3">
          {byCategory.map(({ category, count, available, assigned, value }) => {
            const Icon = CATEGORY_ICON[category]
            return (
              <Tilt3D key={category} rotateAmplitude={12}>
                <div
                  className="animate-in relative flex h-full min-h-[160px] flex-col justify-between overflow-hidden rounded-[22px] p-5 text-white shadow-[0_18px_44px_-16px_rgba(26,29,27,0.5)]"
                  style={{ background: CATEGORY_GRADIENT[category] }}
                >
                  <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-white/10 blur-2xl" />
                  <div className="relative flex items-center justify-between">
                    <span className="text-sm font-medium text-white/80">{category}</span>
                    <span className="grid size-9 place-items-center rounded-xl bg-white/12 ring-1 ring-white/15"><Icon size={16} /></span>
                  </div>
                  <div className="relative">
                    <p className="font-display text-4xl font-semibold tabular-nums"><CountUp value={count} /></p>
                    <p className="mt-1 text-[11px] text-white/60">{available} available · {assigned} assigned</p>
                    <p className="mt-0.5 text-[11px] text-white/45">{fmtINR(value)}</p>
                  </div>
                </div>
              </Tilt3D>
            )
          })}
        </div>

        {/* Location strip */}
        <div className="card animate-in lg:col-span-12">
          <div className="mb-3 flex items-center gap-2">
            <MapPin size={15} className="text-sky-deep" />
            <h3 className="font-display text-[15px] font-semibold">Stock by Location</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {byLocation.map((l) => (
              <div key={l.location} className="rounded-2xl border border-line bg-soft/60 px-4 py-3">
                <p className="text-xs text-ash">{l.location}</p>
                <p className="mt-1 font-display text-xl font-semibold tabular-nums">{l.count}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Shelves */}
        <div className="lg:col-span-12 space-y-6">
          {shelves.map(({ category, items }) => {
            const Icon = CATEGORY_ICON[category]
            return (
              <div key={category} className="card animate-in">
                <div className="mb-4 flex items-center gap-2">
                  <span
                    className="grid size-8 place-items-center rounded-xl text-white"
                    style={{ background: CATEGORY_GRADIENT[category] }}
                  >
                    <Icon size={15} />
                  </span>
                  <h3 className="font-display text-[15px] font-semibold">{category}</h3>
                  <span className="text-xs text-ash">{items.length} on the shelf</span>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {items.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => nav(`/assets/inventory/${a.id}`)}
                      className="group w-40 shrink-0 rounded-2xl border border-line bg-soft/40 p-3 text-left transition-all duration-200 hover:border-ink/30 hover:bg-white hover:shadow-[0_10px_28px_-14px_rgba(26,29,27,0.35)]"
                    >
                      <div className="relative flex h-24 w-full items-center justify-center overflow-hidden rounded-xl bg-white/70">
                        {a.image ? (
                          <img src={a.image} alt={a.name} className="h-full w-full object-cover" />
                        ) : (
                          <span
                            className="grid size-11 place-items-center rounded-xl text-white/90"
                            style={{ background: CATEGORY_GRADIENT[category] }}
                          >
                            <Icon size={18} />
                          </span>
                        )}
                      </div>
                      <p className="mt-2.5 truncate text-[13px] font-semibold">{a.name}</p>
                      <p className="truncate text-[11px] text-ash">{a.model}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <Badge>{a.status}</Badge>
                        <span className="text-[11px] text-ash">{fmtINR(a.cost)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
