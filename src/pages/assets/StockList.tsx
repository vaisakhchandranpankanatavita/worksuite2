import { Boxes, Headphones, IndianRupee, Laptop, MapPin, Monitor, PackageCheck, Smartphone, Tablet, UserCheck, Wrench } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CountUp } from '../../components/CountUp'
import { Badge, PageHeader } from '../../components/ui'
import { ASSET_CATEGORIES, LOCATIONS, type AssetCategory } from '../../data/mock'
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
  const { assets } = useApp()

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

  return (
    <div>
      <PageHeader title="Stock List" subtitle={`${total} items in stock across ${shelves.length} categories`} />

      <div className="stagger space-y-4">
        {/* Compact stat row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, fmt }) => (
            <div key={label} className="animate-in card flex items-center gap-3 p-3.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-ink text-white">
                <Icon size={15} />
              </span>
              <div className="min-w-0">
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
              <span key={l.location} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/70 px-2.5 py-1 text-[11px] text-ink/80">
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
    </div>
  )
}
