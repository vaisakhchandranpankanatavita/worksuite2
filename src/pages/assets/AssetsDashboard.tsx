import { AlertTriangle, Building2, CalendarClock, CheckCircle2, Laptop, MapPin, PackageCheck, PackageX, Plus, ShieldAlert, TrendingDown, Wrench } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import AiInsights from '../../components/AiInsights'
import { DonutChart, GroupedBar, RadialProgress, TrendLine } from '../../components/charts'
import { CountUp } from '../../components/CountUp'
import { Avatar, Badge, Button, Card, CardHeader, CornerLink, PageHeader } from '../../components/ui'
import { ASSET_CATEGORIES, LOCATIONS, TODAY, employeeById } from '../../data/mock'
import { bookValue } from '../../lib/depreciation'
import { fmtCompact, fmtDate, fmtINR } from '../../lib/format'
import { photoFor } from '../../lib/photo'
import { useApp } from '../../store'

const CATEGORY_COLORS = ['#1a1d1b', '#d8eca0', '#c8d9f4', '#c6e0c0', '#f0cad8', '#f5ddb2']
const MS_DAY = 86_400_000

/** Same icon chip on every stat tile; `alert` tints it amber, but only while the count is non-zero. */
function StatTile({ title, value, hint, icon, alert = false }: {
  title: string; value: number; hint: string; icon: ReactNode; alert?: boolean
}) {
  const live = alert && value > 0
  return (
    <Card className="!p-3.5">
      <CardHeader
        title={title}
        action={
          <span className={`grid size-7 shrink-0 place-items-center rounded-full ${live ? 'bg-amber text-ink' : 'bg-soft text-ash'}`}>
            {icon}
          </span>
        }
      />
      <p className="mt-2 font-display text-2xl font-semibold tabular-nums"><CountUp value={value} /></p>
      <p className="mt-0.5 text-xs text-ash">{hint}</p>
    </Card>
  )
}

/** Compact in-card empty state; the shared <Empty> is sized for full-page panels. */
function Quiet({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line/70 py-6 text-center text-xs text-ash">
      <span className="grid size-8 place-items-center rounded-full bg-soft text-ash/80">{icon}</span>
      {children}
    </div>
  )
}

export default function AssetsDashboard() {
  const nav = useNavigate()
  const { assets, setAssetStatus } = useApp()

  const total = assets.length
  const assigned = assets.filter((a) => a.status === 'Assigned').length
  const available = assets.filter((a) => a.status === 'Available').length
  const maintenance = assets.filter((a) => a.status === 'Maintenance').length
  const retired = assets.filter((a) => a.status === 'Retired').length
  const maintenanceDue = assets.filter((a) => a.nextMaintenanceDate && new Date(a.nextMaintenanceDate) <= TODAY).length
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
      { name: '0-1yr', count: 0 },
      { name: '1-2yr', count: 0 },
      { name: '2-3yr', count: 0 },
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

      <div className="stagger grid gap-4 lg:grid-cols-12">
        <AiInsights />

        {/* Stat tiles */}
        <div className="grid gap-3 sm:grid-cols-2 lg:col-span-12 lg:grid-cols-5">
          <div className="card-dark animate-in relative overflow-hidden p-3.5">
            <div className="pointer-events-none absolute -right-14 -top-14 size-48 rounded-full bg-lime/15 blur-3xl" />
            <div className="relative flex items-start justify-between">
              <h3 className="font-display text-[15px] font-semibold leading-tight tracking-tight">Total Assets</h3>
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/10"><Laptop size={14} /></span>
            </div>
            <p className="relative mt-2 font-display text-2xl font-semibold tabular-nums"><CountUp value={total} /></p>
            <p className="mt-0.5 text-xs text-white/55">{fmtINR(totalValue)} in inventory</p>
          </div>

          <StatTile title="Needs Attention" value={maintenance + retired} hint={`${maintenance} in maintenance, ${retired} retired`} icon={<Wrench size={14} />} alert />
          <StatTile title="Assigned" value={assigned} hint={`${utilizationPct}% utilization`} icon={<CheckCircle2 size={14} />} />
          <StatTile title="Maintenance Due" value={maintenanceDue} hint="Scheduled for service" icon={<AlertTriangle size={14} />} alert />
          <StatTile title="Available" value={available} hint="Ready to assign" icon={<PackageCheck size={14} />} />
        </div>

        {/* Category breakdown */}
        <Card className="lg:col-span-5">
          <CardHeader title="By Category" subtitle="Inventory distribution" />
          <div className="mt-4 flex flex-1 items-center gap-4">
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
        <Card className="lg:col-span-4">
          <CardHeader title="By Location" subtitle="Active assets per office" action={<MapPin size={14} className="text-sky-deep" />} />
          <div className="mt-4 min-h-[96px] flex-1">
            <GroupedBar data={locationData} keys={['count']} colors={['#c8d9f4']} xKey="name" height="100%" />
          </div>
        </Card>

        {/* Utilization radial */}
        <Card className="lg:col-span-3">
          <CardHeader title="Utilization" subtitle="Assigned vs. total" />
          <div className="mt-3 flex flex-1 flex-col items-center justify-between gap-3">
            <RadialProgress value={utilizationPct} color="#aece52" size={100} label="Assigned" />
            <dl className="w-full space-y-1.5 border-t border-line/60 pt-3 text-xs">
              {[
                ['Assigned', assigned],
                ['Available', available],
                ['Maintenance', maintenance],
                ['Retired', retired],
              ].map(([label, n]) => (
                <div key={label} className="flex items-center justify-between">
                  <dt className="text-ash">{label}</dt>
                  <dd className="font-bold tabular-nums">{n}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Card>

        {/* Warranty watch */}
        <Card className="lg:col-span-5">
          <CardHeader title="Warranty Watch" subtitle="Expiring within 90 days" action={<ShieldAlert size={14} className="text-rose-deep" />} />
          <div className="mt-3 divide-y divide-line/60">
            {warrantyWatch.map(({ asset, daysLeft }) => (
              <button key={asset.id} onClick={() => nav(`/assets/inventory/${asset.id}`)} className="clickable -mx-2 flex w-[calc(100%+1rem)] items-center justify-between gap-3 rounded-xl px-2 py-2 text-left">
                <div className="min-w-0">
                  <p className="clickable-title truncate text-sm font-semibold transition-colors">{asset.name}</p>
                  <p className="truncate text-xs text-ash">{asset.location} · {fmtDate(asset.warrantyUntil!)}</p>
                </div>
                <Badge tone={daysLeft < 0 ? 'rose' : daysLeft <= 30 ? 'amber' : 'gray'} className="shrink-0">
                  {daysLeft < 0 ? 'Expired' : `${daysLeft}d left`}
                </Badge>
              </button>
            ))}
            {warrantyWatch.length === 0 && <Quiet icon={<ShieldAlert size={14} />}>No warranties expiring in the next 90 days.</Quiet>}
          </div>
        </Card>

        {/* Recently assigned */}
        <Card className="lg:col-span-4">
          <CardHeader title="Recently Assigned" subtitle="Latest handovers" action={<CornerLink onClick={() => nav('/assets/inventory')} />} />
          <div className="mt-3 divide-y divide-line/60">
            {recentlyAssigned.map((a) => {
              const holder = a.assignedTo ? employeeById(a.assignedTo) : undefined
              return (
                <button key={a.id} onClick={() => nav(`/assets/inventory/${a.id}`)} className="clickable -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 py-2 text-left">
                  {holder && <Avatar name={holder.name} hue={holder.avatarHue} src={photoFor(holder)} size={28} />}
                  <div className="min-w-0 flex-1">
                    <p className="clickable-title truncate text-sm font-semibold transition-colors">{a.name}</p>
                    <p className="truncate text-xs text-ash">{holder ? `${holder.name} · ${fmtDate(a.assignedOn!)}` : fmtDate(a.assignedOn!)}</p>
                  </div>
                  <Badge>{a.category}</Badge>
                </button>
              )
            })}
            {recentlyAssigned.length === 0 && <Quiet icon={<Laptop size={14} />}>No assets have been handed over yet.</Quiet>}
          </div>
        </Card>

        {/* Maintenance queue */}
        <Card className="lg:col-span-3">
          <CardHeader title="Maintenance Queue" subtitle="Awaiting service" action={<AlertTriangle size={14} className="text-amber-deep" />} />
          <div className="mt-3 divide-y divide-line/60">
            {maintenanceQueue.map((a) => (
              <div key={a.id} className="flex items-center gap-2 py-1.5">
                <button onClick={() => nav(`/assets/inventory/${a.id}`)} className="clickable -mx-2 min-w-0 flex-1 rounded-xl px-2 py-1 text-left">
                  <p className="clickable-title truncate text-sm font-semibold transition-colors">{a.name}</p>
                  <p className="truncate text-xs text-ash">{a.location} · {a.serial}</p>
                </button>
                <button
                  onClick={() => setAssetStatus(a.id, 'Available')}
                  aria-label={`Mark ${a.name} as fixed`}
                  className="shrink-0 rounded-full border border-line px-3 py-1 text-[11px] font-bold text-ash transition-all duration-200 hover:-translate-y-0.5 hover:border-sage-deep/40 hover:bg-sage/30 hover:text-sage-deep hover:shadow-sm active:translate-y-0 active:scale-95"
                >
                  Mark fixed
                </button>
              </div>
            ))}
            {maintenanceQueue.length === 0 && <Quiet icon={<Wrench size={14} />}>Nothing in maintenance right now.</Quiet>}
          </div>
        </Card>

        {/* Overdue returns */}
        <Card className="lg:col-span-3">
          <CardHeader title="Overdue Returns" subtitle="Loaner check-in due" action={<PackageX size={14} className="text-rose-deep" />} />
          <div className="mt-3 divide-y divide-line/60">
            {overdueReturns.map(({ asset, daysOver }) => {
              const holder = asset.assignedTo ? employeeById(asset.assignedTo) : undefined
              return (
                <button key={asset.id} onClick={() => nav(`/assets/inventory/${asset.id}`)} className="clickable -mx-2 flex w-[calc(100%+1rem)] items-center justify-between gap-3 rounded-xl px-2 py-2 text-left">
                  <div className="min-w-0">
                    <p className="clickable-title truncate text-sm font-semibold transition-colors">{asset.name}</p>
                    <p className="truncate text-xs text-ash">{holder?.name ?? asset.location} · Due {fmtDate(asset.returnDue!)}</p>
                  </div>
                  <Badge tone={daysOver > 0 ? 'rose' : 'amber'} className="shrink-0">
                    {daysOver > 0 ? `${daysOver}d overdue` : `Due in ${-daysOver}d`}
                  </Badge>
                </button>
              )
            })}
            {overdueReturns.length === 0 && <Quiet icon={<PackageX size={14} />}>No loaner returns are due.</Quiet>}
          </div>
        </Card>

        {/* Age distribution */}
        <Card className="lg:col-span-5">
          <CardHeader title="Age Distribution" subtitle="Active inventory by age" action={<CalendarClock size={14} className="text-ash" />} />
          <div className="mt-4 min-h-[96px] flex-1">
            <GroupedBar data={ageBuckets} keys={['count']} colors={['#f5ddb2']} xKey="name" height="100%" />
          </div>
        </Card>

        {/* Department spend */}
        <Card className="lg:col-span-4">
          <CardHeader title="Spend by Department" subtitle="Assigned asset value" action={<Building2 size={14} className="text-sky-deep" />} />
          <div className="mt-4 min-h-[96px] flex-1">
            <GroupedBar data={deptSpend} keys={['spend']} colors={['#c6e0c0']} xKey="name" height="100%" format={fmtCompact} />
          </div>
        </Card>

        {/* Portfolio value trend */}
        <Card className="lg:col-span-12">
          <CardHeader title="Portfolio Book Value" subtitle="Depreciated value, 12mo" action={<TrendingDown size={14} className="text-ash" />} />
          <div className="mt-4 min-h-[120px] flex-1">
            <TrendLine data={valueTrend} dataKey="value" xKey="month" height="100%" format={fmtCompact} />
          </div>
        </Card>
      </div>
    </div>
  )
}
