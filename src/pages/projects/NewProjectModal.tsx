import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Field, Input, Modal, Select } from '../../components/ui'
import { DEPARTMENTS, clients, employees, type Department } from '../../data/mock'
import { DEPT_HEAD_COUNT, buildPhases, TRANCHE_SPLIT, type Project } from '../../data/projects'
import { fromDay, todayDay, toDay } from '../../lib/dates'
import { useApp } from '../../store'

export default function NewProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate()
  const heads = employees.slice(0, DEPT_HEAD_COUNT)
  const count = useApp((s) => s.projects.length)
  const addProject = useApp((s) => s.addProject)
  const toast = useApp((s) => s.toast)
  const [name, setName] = useState('')
  const [client, setClient] = useState<string>(clients[0].name)
  const [dept, setDept] = useState<Department>('Engineering')
  const [headId, setHeadId] = useState(heads[0].id)
  const [start, setStart] = useState(fromDay(todayDay() + 7))
  const [days, setDays] = useState(90)
  const [budget, setBudget] = useState(2500000)

  function submit() {
    if (!name.trim()) return toast('Give the project a name', 'error')
    if (!(budget > 0) || !(days >= 14)) return toast('Budget must be positive and duration at least 14 days', 'error')
    const startDay = toDay(start)
    const code = `PRJ-${101 + count}`
    const phases = buildPhases(code, startDay, days, [headId])
    const project: Project = {
      id: code,
      code,
      name: name.trim(),
      client,
      summary: `New ${dept} project for ${client}.`,
      status: startDay > todayDay() ? 'Initiated' : 'In Progress',
      headId,
      leadId: headId,
      fundingDept: dept,
      startDate: start,
      baselineEnd: fromDay(startDay + days),
      plannedEnd: fromDay(startDay + days),
      budget,
      tranches: [{ id: `${code}-T1`, date: fromDay(todayDay()), amount: Math.round((budget * TRANCHE_SPLIT[0]) / 1000) * 1000, note: 'Initial mobilisation' }],
      vendors: [],
      team: [{ employeeId: headId, role: 'Project Head', allocation: 20, since: start }],
      assetLinks: [],
      phases,
      updates: [],
      replans: [],
    }
    addProject(project)
    onClose()
    setName('')
    nav(`/projects/${code}`)
  }

  return (
    <Modal open={open} onClose={onClose} title="New project" width={560}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="Project name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Customer Portal Revamp" autoFocus /></Field></div>
        <Field label="Client">
          <Select className="w-full" value={client} onChange={(e) => setClient(e.target.value)}>
            {clients.map((c) => <option key={c.name}>{c.name}</option>)}
            <option>Internal</option>
          </Select>
        </Field>
        <Field label="Funded from department">
          <Select className="w-full" value={dept} onChange={(e) => setDept(e.target.value as Department)}>
            {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
          </Select>
        </Field>
        <Field label="Project head">
          <Select className="w-full" value={headId} onChange={(e) => setHeadId(e.target.value)}>
            {heads.map((h) => <option key={h.id} value={h.id}>{h.name} — {h.department}</option>)}
          </Select>
        </Field>
        <Field label="Approved budget (₹)"><Input type="number" min={0} step={50000} value={budget} onChange={(e) => setBudget(Number(e.target.value))} /></Field>
        <Field label="Start date"><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
        <Field label="Duration (days)"><Input type="number" min={14} value={days} onChange={(e) => setDays(Number(e.target.value))} /></Field>
      </div>
      <p className="mt-4 text-xs text-ash">A five-phase waterfall (Initiation → Handover) is laid out automatically, and 25% of the budget is released as the first allotment. Add people and assets from the project page.</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="light" onClick={onClose}>Cancel</Button>
        <Button onClick={submit}>Create project</Button>
      </div>
    </Modal>
  )
}
