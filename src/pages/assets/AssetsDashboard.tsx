import { AlertTriangle, Building2, CalendarClock, CheckCircle2, Laptop, MapPin, PackageX, Plus, ShieldAlert, TrendingDown, Wrench } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import AiInsights from '../../components/AiInsights'
import { DonutChart, GroupedBar, RadialProgress, TrendLine } from '../../components/charts'
import { CountUp } from '../../components/CountUp'
import { Avatar, Badge, Button, Card, CardHeader, CornerLink, Empty, PageHeader } from '../../components/ui'
import { ASSET_CATEGORIES, LOCATIONS, TODAY, employeeById } from '../../data/mock'
import { bookValue } from '../../lib/depreciation'
import { fmtCompact, fmtDate, fmtINR } from '../../lib/format'
import { photoFor } from '../../lib/photo'
import { useApp } from '../../store'

const CATEGORY_COLORS = ['#1a1d1b', '#d8eca0', '#c8d9f4', '#c6e0c0', '#f0cad8', '#f5ddb2']
const MS_DAY = 86_400_000

export default function AssetsDashboard() {
  const nav = useNavigate()
  const { assets, setAssetStatus } = useApp()

  const total = assets.length
  const assigned = assets.filter((a) => a.status === 'Assigned').length
  const available = assets.filter((a) => a.status === 'Available').length
  const maintenance = assets.filter((a) => a.status === 'Maintenance').length
  const retired = assets.filter((a) => a.status === 'Retired').length
  const totalValue = assets.reduce((s, a) => s + a.cost, 0)
  const utilizationPct = total ? Math.round((assigned / total) * 100) : 0

  const categoryData = useMemo(
    () => ASSET_CATEGORIES.map((c) => ({ name: c, value: assets.filter((a) => a.category === c).length })),
    [assets],
  )

  const locationData = useMemo(
    () => LOCATIONS.map((l) => ({ name: l, count: assets.filter((a) => a.location === l && a.status !== 'Retired').length })),
    [assets],
  )

  const recentlyAssigned = useMemo(
    () =>
      [...assets]
        .filter((a) => a.assignedTo && a.assignedOn)
        .sort((a, b) => (b.assignedOn! > a.assignedOn! ? 1 : -1))
        .slice(0, 5),
    [assets],
  )

  const warrantyWatch = useMemo(() => {
    const now = Date.now()
    return assets
      .filter((a) => a.warrantyUntil && a.status !== 'Retired')
      .map((a) => ({ asset: a, daysLeft: Math.round((new Date(a.warrantyUntil!).getTime() - now) / MS_DAY) }))
      .filter((x) => x.daysLeft <= 90)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 5)
  }, [assets])

  const maintenanceQueue = useMemo(
    () => assets.filter((a) => a.status === 'Maintenance').slice(0, 5),
    [assets],
  )

  const overdueReturns = useMemo(() => {
    const now = Date.now()
    return assets
      .filter((a) => a.returnDue && a.status === 'Assigned')
      .map((a) => ({ asset: a, daysOver: Math.round((now - new Date(a.returnDue!).getTime()) / MS_DAY) }))
      .filter((x) => x.daysOver >= -14)
      .sort((a, b) => b.daysOver - a.daysOver)
      .slice(0, 5)
  }, [assets])

  const ageBuckets = useMemo(() => {
    const buckets = [
      { name: '0–1yr', count: 0 },
      { name: '1–2yr', count: 0 },
      { name: '2–3yr', count: 0 },
      { name: '3yr+', count: 0 },
    ]
    const now = Date.now()
    assets.filter((a) => a.status !== 'Retired').forEach((a) => {
      const yrs = (now - new Date(a.purchaseDate).getTime()) / (365 * MS_DAY)
      buckets[yrs < 1 ? 0 : yrs < 2 ? 1 : yrs < 3 ? 2 : 3].count++
    })
    return buckets
  }, [assets])

  const deptSpend = useMemo(() => {
    const map = new Map<string, number>()
    assets.filter((a) => a.assignedTo && a.status !== 'Retired').forEach((a) => {
      const emp = employeeById(a.assignedTo!)
      if (!emp) return
      map.set(emp.department, (map.get(emp.department) ?? 0) + a.cost)
    })
    return [...map.entries()].map(([name, spend]) => ({ name, spend })).sort((a, b) => b.spend - a.spend).slice(0, 6)
  }, [assets])

  const valueTrend = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(TODAY.getFullYear(), TODAY.getMonth() - (11 - i), 1)
      const asOf = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      const value = assets
        .filter((a) => a.status !== 'Retired' && new Date(a.purchaseDate) <= asOf)
        .reduce((s, a) => s + bookValue(a.cost, a.purchaseDate, asOf), 0)
      return { month: d.toLocaleDateString('en-IN', { month: 'short' }), value }
    })
  }, [assets])

  return (
    <div>
      <PageHeader
        title="Asset Management"
        subtitle={`${total} assets · ${fmtINR(totalValue)} total value`}
        actions={<Button onClick={() => nav('/assets/inventory?new=1')}><Plus size={15} /> Add asset</Button>}
      />

      <div className="stagger grid gap-2.5 lg:grid-cols-12">
        <AiInsights />

        {/* Stat tiles */}
        <div className="grid gap-2.5 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-4">
          <div className="card-dark animate-in relative overflow-hidden p-3">
            <div className="pointer-events-none absolute -right-14 -top-14 size-48 rounded-full bg-lime/15 blur-3xl" />
            <div className="relative flex items-start justify-between">
              <h3 className="font-display text-[12px] font-semibold leading-tight">Total Assets</h3>
              <span className="grid size-5 place-items-center rounded-full bg-white/10"><Laptop size={11} /></span>
            </div>
            <p className="relative mt-1.5 font-display text-lg font-semibold tabular-nums"><CountUp value={total} /></p>
            <p className="mt-0.5 text-[10.5px] text-white/55">{fmtINR(totalValue)} in inventory</p>
          </div>

          <Card className="p-3">
            <CardHeader title="Assigned" className="[&_h3]:text-[12px]" action={<CheckCircle2 size={13} className="text-sage-deep" />} />
            <p className="mt-1.5 font-display text-lg font-semibold"><CountUp value={assigned} /></p>
            <p className="mt-0.5 text-[10.5px] text-ash">{utilizationPct}% utilization</p>
          </Card>

          <Card className="p-3">
            <CardHeader title="Available" className="[&_h3]:text-[12px]" />
            <p className="mt-1.5 font-display text-lg font-semibold"><CountUp value={available} /></p>
            <p className="mt-0.5 text-[10.5px] text-ash">Ready to assign</p>
          </Card>

          <Card className="p-3">
            <CardHeader title="Needs Attention" className="[&_h3]:text-[12px]" action={<Wrench size={13} className="text-amber-deep" />} />
            <p className="mt-1.5 font-display text-lg font-semibold"><CountUp value={maintenance + retired} /></p>
            <p className="mt-0.5 text-[10.5px] text-ash">{maintenance} maintenance · {retired} retired</p>
          </Card>
        </div>

        {/* Utilization radial */}
        <Card className="lg:col-span-4 p-3">
          <CardHeader title="Utilization" subtitle="Assigned vs. total inventory" />
          <div className="mt-2 flex flex-1 items-center justify-center">
            <RadialProgress value={utilizationPct} color="#aece52" size={96} label="Assigned" />
          </div>
        </Card>

        {/* Category breakdown */}
        <Card className="lg:col-span-4 p-3">
          <CardHeader title="By Category" subtitle="Inventory distribution" />
          <div className="mt-2 flex flex-1 items-center gap-3">
            <div className="w-32 shrink-0">
              <DonutChart data={categoryData} colors={CATEGORY_COLORS} innerLabel={String(total)} height="100%" />
            </div>
            <div className="flex-1 space-y-2">
              {categoryData.map((c, i) => (
                <div key={c.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-ash">
                    <i className="size-2 shrink-0 rounded-full" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                    {c.name}
                  </span>
                  <span className="font-bold">{c.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Location breakdown */}
        <Card className="lg:col-span-4 p-3">
          <CardHeader title="By Location" subtitle="Active assets per office" action={<MapPin size={14} className="text-sky-deep" />} />
          <div className="mt-2 min-h-[96px] flex-1">
            <GroupedBar data={locationData} keys={['count']} colors={['#c8d9f4']} xKey="name" height="100%" />
          </div>
        </Card>

        {/* Warranty watch */}
        <Card className="lg:col-span-4 p-3">
          <CardHeader title="Warranty Watch" subtitle="Expiring within 90 days" action={<ShieldAlert size={14} className="text-rose-deep" />} />
          <div className="mt-2 divide-y divide-line/60">
            {warrantyWatch.map(({ asset, daysLeft }) => (
              <button key={asset.id} onClick={() => nav(`/assets/inventory/${asset.id}`)} className="flex w-full items-center justify-between gap-3 py-1 text-left transition-colors hover:bg-soft/60">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{asset.name}</p>
                  <p className="truncate text-xs text-ash">{asset.location} · {fmtDate(asset.warrantyUntil!)}</p>
                </div>
                <Badge tone={daysLeft < 0 ? 'rose' : daysLeft <= 30 ? 'amber' : 'gray'} className="shrink-0">
                  {daysLeft < 0 ? 'Expired' : `${daysLeft}d left`}
                </Badge>
              </button>
            ))}
            {warrantyWatch.length === 0 && <p className="py-5 text-center text-sm text-ash">Nothing expiring soon.</p>}
          </div>
        </Card>

        {/* Recently assigned */}
        <Card className="lg:col-span-4 p-3">
          <CardHeader title="Recently Assigned" subtitle="Latest handovers" action={<CornerLink onClick={() => nav('/assets/inventory')} />} />
          <div className="mt-2 divide-y divide-line/60">
            {recentlyAssigned.map((a) => {
              const holder = a.assignedTo ? employeeById(a.assignedTo) : undefined
              return (
                <button key={a.id} onClick={() => nav(`/assets/inventory/${a.id}`)} className="flex w-full items-center gap-3 py-1 text-left transition-colors hover:bg-soft/60">
                  {holder && <Avatar name={holder.name} hue={holder.avatarHue} src={photoFor(holder)} size={28} />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{a.name}</p>
                    <p className="truncate text-xs text-ash">{holder ? `${holder.name} · ${fmtDate(a.assignedOn!)}` : fmtDate(a.assignedOn!)}</p>
                  </div>
                  <Badge>{a.category}</Badge>
                </button>
              )
            })}
            {recentlyAssigned.length === 0 && <p className="py-5 text-center text-sm text-ash">No assignments yet.</p>}
          </div>
        </Card>

        {/* Maintenance queue */}
        <Card className="lg:col-span-4 p-3">
          <CardHeader title="Maintenance Queue" subtitle="Awaiting service" action={<AlertTriangle size={14} className="text-amber-deep" />} />
          <div className="mt-2 divide-y divide-line/60">
            {maintenanceQueue.map((a) => (
              <div key={a.id} className="flex items-center gap-3 py-1">
                <button onClick={() => nav(`/assets/inventory/${a.id}`)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-semibold">{a.name}</p>
                  <p className="truncate text-xs text-ash">{a.location} · {a.serial}</p>
                </button>
                <button onClick={() => setAssetStatus(a.id, 'Available')} className="shrink-0 rounded-full border border-line px-3 py-1 text-[11px] font-bold text-ash transition-colors hover:border-sage-deep/40 hover:text-sage-deep">
                  Mark fixed
                </button>
              </div>
            ))}
            {maintenanceQueue.length === 0 && <Empty>Nothing in maintenance right now.</Empty>}
          </div>
        </Card>

        {/* Overdue returns */}
        <Card className="lg:col-span-4 p-3">
          <CardHeader title="Overdue Returns" subtitle="Loaner check-in due" action={<PackageX size={14} className="text-rose-deep" />} />
          <div className="mt-2 divide-y divide-line/60">
            {overdueReturns.map(({ asset, daysOver }) => {
              const holder = asset.assignedTo ? employeeById(asset.assignedTo) : undefined
              return (
                <button key={asset.id} onClick={() => nav(`/assets/inventory/${asset.id}`)} className="flex w-full items-center justify-between gap-3 py-1 text-left transition-colors hover:bg-soft/60">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{asset.name}</p>
                    <p className="truncate text-xs text-ash">{holder?.name ?? asset.location} · Due {fmtDate(asset.returnDue!)}</p>
                  </div>
                  <Badge tone={daysOver > 0 ? 'rose' : 'amber'} className="shrink-0">
                    {daysOver > 0 ? `${daysOver}d overdue` : `Due in ${-daysOver}d`}
                  </Badge>
                </button>
              )
            })}
            {overdueReturns.length === 0 && <p className="py-5 text-center text-sm text-ash">No loaner returns due.</p>}
          </div>
        </Card>

        {/* Age distribution */}
        <Card className="lg:col-span-4 p-3">
          <CardHeader title="Age Distribution" subtitle="Active inventory by age" action={<CalendarClock size={14} className="text-ash" />} />
          <div className="mt-2 min-h-[96px] flex-1">
            <GroupedBar data={ageBuckets} keys={['count']} colors={['#f5ddb2']} xKey="name" height="100%" />
          </div>
        </Card>

        {/* Department spend */}
        <Card className="lg:col-span-4 p-3">
          <CardHeader title="Spend by Department" subtitle="Assigned asset value" action={<Building2 size={14} className="text-sky-deep" />} />
          <div className="mt-2 min-h-[96px] flex-1">
            <GroupedBar data={deptSpend} keys={['spend']} colors={['#c6e0c0']} xKey="name" height="100%" format={fmtCompact} />
          </div>
        </Card>

        {/* Portfolio value trend */}
        <Card className="lg:col-span-4 p-3">
          <CardHeader title="Portfolio Book Value" subtitle="Depreciated value, 12mo" action={<TrendingDown size={14} className="text-ash" />} />
          <div className="mt-2 min-h-[96px] flex-1">
            <TrendLine data={valueTrend} dataKey="value" xKey="month" height="100%" format={fmtCompact} />
          </div>
        </Card>
      </div>
    </div>
  )
}
