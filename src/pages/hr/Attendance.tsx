import clsx from 'clsx'
import { Download, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { exportCsv } from './Employees'
import { Avatar, Badge, Button, Card, CardHeader, PageHeader, Segmented, Table, chartTooltip } from '../../components/ui'
import { CountUp } from '../../components/CountUp'
import { HOLIDAYS, attendanceTrend, departmentAttendance, employeeById, todayAttendance, type AttendanceStatus } from '../../data/mock'
import { fmtDate } from '../../lib/format'
import { photoFor } from '../../lib/photo'

const FILTERS = ['All', 'Present', 'Late', 'Remote', 'Absent', 'On Leave'] as const

export default function Attendance() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All')
  const [q, setQ] = useState('')

  const counts = useMemo(() => {
    const c: Record<AttendanceStatus, number> = { Present: 0, Remote: 0, Absent: 0, 'On Leave': 0, Late: 0 }
    todayAttendance.forEach((a) => c[a.status]++)
    return c
  }, [])
  const rows = todayAttendance
    .map((a) => ({ ...a, e: employeeById(a.employeeId)! }))
    .filter((r) => (filter === 'All' || r.status === filter) && r.e.name.toLowerCase().includes(q.toLowerCase()))
  const avg = attendanceTrend.reduce((s, d) => s + d.rate, 0) / attendanceTrend.length

  return (
    <div>
      <PageHeader
        title="Attendance"
        subtitle={`Today · ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}`}
        actions={<Button variant="light" onClick={() => exportCsv('attendance-today.csv', [['ID', 'Name', 'Status', 'Check-in', 'Hours'], ...rows.map((r) => [r.e.id, r.e.name, r.status, r.checkIn ?? '', r.hours])])}><Download size={16} /> Export</Button>}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {(['Present', 'Late', 'Remote', 'Absent', 'On Leave'] as const).map((s, i) => (
          <div key={s} className={clsx('animate-in rounded-[22px] p-4', i === 0 ? 'bg-ink text-white' : i === 1 ? 'bg-lime' : 'card')}>
            <p className={clsx('text-xs', i === 0 ? 'text-white/60' : 'text-ash')}>{s}</p>
            <p className="mt-1 font-display text-3xl font-light"><CountUp value={counts[s]} /></p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardHeader title="Attendance Rate" subtitle={`30-day average ${avg.toFixed(1)}%`} />
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={attendanceTrend} margin={{ top: 16, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <pattern id="hatch2" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="7" height="7" fill="#f7faef" />
                  <line x1="0" y1="0" x2="0" y2="7" stroke="#b9d46a" strokeWidth="1.2" />
                </pattern>
              </defs>
              <CartesianGrid vertical={false} stroke="#edf0ed" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} interval={4} />
              <YAxis domain={[80, 100]} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip {...chartTooltip} formatter={(v: number) => `${v}%`} />
              <Area type="monotone" dataKey="rate" name="Attendance" stroke="#262825" strokeWidth={1.5} fill="url(#hatch2)" activeDot={{ r: 6, fill: '#ddefa8', stroke: '#262825' }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader title="By Department" subtitle="Weekly rate, last 6 weeks" />
          <div className="mt-4 space-y-2">
            {departmentAttendance.map((d) => (
              <div key={d.dept} className="grid grid-cols-[110px_1fr_42px] items-center gap-2 text-xs">
                <span className="truncate text-ash">{d.dept}</span>
                <div className="grid grid-cols-6 gap-1">
                  {d.weeks.map((w, i) => (
                    <span key={i} title={`${w}%`} className="h-6 rounded-md" style={{ background: `rgba(${w > 92 ? '38,40,37' : '185,212,106'}, ${Math.max(0.15, (w - 78) / 22)})` }} />
                  ))}
                </div>
                <span className="text-right font-bold">{d.rate}%</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-9">
          <CardHeader
            title="Daily Log"
            action={
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ash" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="h-10 w-44 rounded-full border border-line bg-white pl-9 pr-3 text-sm outline-none focus:border-ink" />
              </div>
            }
          />
          <Segmented className="mt-4" value={filter} options={FILTERS} onChange={setFilter} />
          <Table className="mt-3" head={['Employee', 'Department', 'Check-in', 'Hours', 'Mode', 'Status']}>
            {rows.slice(0, 30).map((r) => (
              <tr key={r.employeeId}>
                <td>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={r.e.name} hue={r.e.avatarHue} src={photoFor(r.e)} size={32} />
                    <span className="font-bold">{r.e.name}</span>
                  </div>
                </td>
                <td className="text-ash">{r.e.department}</td>
                <td>{r.checkIn ?? '—'}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-soft"><div className="h-full bg-ink" style={{ width: `${(r.hours / 9.5) * 100}%` }} /></div>
                    <span className="text-xs">{r.hours ? `${r.hours}h` : '—'}</span>
                  </div>
                </td>
                <td className="text-ash">{r.e.workMode}</td>
                <td><Badge>{r.status}</Badge></td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader title="Upcoming Holidays" subtitle="Karnataka calendar" />
          <ul className="mt-4 space-y-3">
            {HOLIDAYS.map((h) => (
              <li key={h.date} className="flex items-center justify-between rounded-2xl bg-soft px-3 py-2.5">
                <span className="text-sm">{h.name}</span>
                <span className="text-xs text-ash">{fmtDate(h.date)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
