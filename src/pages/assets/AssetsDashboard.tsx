import { CheckCircle2, Laptop, Plus, Wrench } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DonutChart, RadialProgress } from '../../components/charts'
import { CountUp } from '../../components/CountUp'
import { Avatar, Badge, Button, Card, CardHeader, CornerLink, PageHeader } from '../../components/ui'
import { ASSET_CATEGORIES, employeeById } from '../../data/mock'
import { fmtDate, fmtINR } from '../../lib/format'
import { photoFor } from '../../lib/photo'
import { useApp } from '../../store'

const CATEGORY_COLORS = ['#1a1d1b', '#d8eca0', '#c8d9f4', '#c6e0c0', '#f0cad8', '#f5ddb2']

export default function AssetsDashboard() {
  const nav = useNavigate()
  const { assets } = useApp()

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

  const recentlyAssigned = useMemo(
    () =>
      [...assets]
        .filter((a) => a.assignedTo && a.assignedOn)
        .sort((a, b) => (b.assignedOn! > a.assignedOn! ? 1 : -1))
        .slice(0, 6),
    [assets],
  )

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <PageHeader title="Asset Management" subtitle={`${total} assets · ${fmtINR(totalValue)} total value`} />
        <Button onClick={() => nav('/assets/inventory?new=1')}><Plus size={15} /> Add asset</Button>
      </div>

      <div className="stagger grid gap-4 lg:grid-cols-12">
        {/* Stat tiles */}
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-4">
          <div className="card-dark animate-in relative overflow-hidden p-5">
            <div className="pointer-events-none absolute -right-14 -top-14 size-48 rounded-full bg-lime/15 blur-3xl" />
            <div className="relative flex items-start justify-between">
              <h3 className="font-display text-[16px] font-semibold leading-tight">Total Assets</h3>
              <span className="grid size-9 place-items-center rounded-full bg-white/10"><Laptop size={16} /></span>
            </div>
            <p className="relative mt-5 font-display text-3xl font-semibold tabular-nums"><CountUp value={total} /></p>
            <p className="mt-1.5 text-[11px] text-white/55">{fmtINR(totalValue)} in inventory</p>
          </div>

          <Card>
            <CardHeader title="Assigned" action={<CheckCircle2 size={15} className="text-sage-deep" />} />
            <p className="mt-4 font-display text-3xl font-semibold"><CountUp value={assigned} /></p>
            <p className="mt-1 text-[11px] text-ash">{utilizationPct}% utilization</p>
          </Card>

          <Card>
            <CardHeader title="Available" />
            <p className="mt-4 font-display text-3xl font-semibold"><CountUp value={available} /></p>
            <p className="mt-1 text-[11px] text-ash">Ready to assign</p>
          </Card>

          <Card>
            <CardHeader title="Needs Attention" action={<Wrench size={15} className="text-amber-deep" />} />
            <p className="mt-4 font-display text-3xl font-semibold"><CountUp value={maintenance + retired} /></p>
            <p className="mt-1 text-[11px] text-ash">{maintenance} maintenance · {retired} retired</p>
          </Card>
        </div>

        {/* Utilization radial */}
        <Card className="lg:col-span-4">
          <CardHeader title="Utilization" subtitle="Assigned vs. total inventory" />
          <div className="mt-3 flex items-center justify-center">
            <RadialProgress value={utilizationPct} color="#aece52" size={130} label="Assigned" />
          </div>
        </Card>

        {/* Category breakdown */}
        <Card className="lg:col-span-5">
          <CardHeader title="By Category" subtitle="Inventory distribution" />
          <div className="mt-3 flex items-center gap-4">
            <div className="w-40 shrink-0">
              <DonutChart data={categoryData} colors={CATEGORY_COLORS} innerLabel={String(total)} height={160} />
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

        {/* Recently assigned */}
        <Card className="lg:col-span-7">
          <CardHeader title="Recently Assigned" subtitle="Latest asset handovers" action={<CornerLink onClick={() => nav('/assets/inventory')} />} />
          <div className="mt-3 divide-y divide-line/60">
            {recentlyAssigned.map((a) => {
              const holder = a.assignedTo ? employeeById(a.assignedTo) : undefined
              return (
                <button key={a.id} onClick={() => nav(`/assets/inventory/${a.id}`)} className="flex w-full items-center gap-3 py-2.5 text-left transition-colors hover:bg-soft/60">
                  {holder && <Avatar name={holder.name} hue={holder.avatarHue} src={photoFor(holder)} size={32} />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{a.name}</p>
                    <p className="truncate text-xs text-ash">{holder ? `${holder.name} · ${fmtDate(a.assignedOn!)}` : fmtDate(a.assignedOn!)}</p>
                  </div>
                  <Badge>{a.category}</Badge>
                </button>
              )
            })}
            {recentlyAssigned.length === 0 && <p className="py-6 text-center text-sm text-ash">No assignments yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  )
}
