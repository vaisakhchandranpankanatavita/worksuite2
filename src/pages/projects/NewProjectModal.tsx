import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Field, Input, Modal, Select } from '../../components/ui'
import { DEPARTMENTS, clients, employees, type Department } from '../../data/mock'
import { DEPT_HEAD_COUNT, buildPhases, TRANCHE_SPLIT, type Project } from '../../data/projects'
import { fromDay, todayDay, toDay } from '../../lib/dates'
import { useApp } from '../../store'
import { currencySymbol } from '../../lib/format'
import { CustomFieldInputs, cleanValues, missingRequired } from '../../components/CustomFields'
import type { CustomValues } from '../../data/industries'
import { appSettings } from '../../data/registry'
import { clientOne, lc, projectOne } from '../../lib/terms'

export default function NewProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate()
  const heads = employees.slice(0, DEPT_HEAD_COUNT)
  const count = useApp((s) => s.projects.length)
  const addProject = useApp((s) => s.addProject)
  const toast = useApp((s) => s.toast)
  const [name, setName] = useState('')
  const [client, setClient] = useState<string>(clients[0].name)
  const [dept, setDept] = useState<Department>(DEPARTMENTS[0])
  const [custom, setCustom] = useState<CustomValues>({})
  const [headId, setHeadId] = useState(heads[0].id)
  const [start, setStart] = useState(fromDay(todayDay() + 7))
  const [days, setDays] = useState(90)
  const [budget, setBudget] = useState(2500000)

  async function submit() {
    if (!name.trim()) return toast(`Give the ${lc(projectOne())} a name`, 'error')
    const missing = missingRequired('projects', custom)
    if (missing) return toast(`${missing} is required`, 'error')
    if (!(budget > 0) || !(days >= 14)) return toast('Budget must be positive and duration at least 14 days', 'error')
    const startDay = toDay(start)
    // The server assigns the real code (and id) from the company's prefix; this is only a placeholder until it replies.
    const code = `${appSettings.orgConfig.projectCodePrefix}${101 + count}`
    const phases = buildPhases(code, startDay, days, [headId])
    const project: Project = {
      id: code,
      code,
      name: name.trim(),
      client,
      summary: `New ${dept} ${lc(projectOne())} for ${client}.`,
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
      blockers: [],
      custom: cleanValues('projects', custom),
    }
    const saved = await addProject(project)
    if (!saved) return
    onClose()
    setName('')
    setCustom({})
    nav(`/projects/${saved.id}`)
  }

  return (
    <Modal open={open} onClose={onClose} title={`New ${lc(projectOne())}`} width={560}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label={`${projectOne()} name`}><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Give it a clear name" autoFocus /></Field></div>
        <Field label={clientOne()}>
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
        <Field label={`${projectOne()} head`}>
          <Select className="w-full" value={headId} onChange={(e) => setHeadId(e.target.value)}>
            {heads.map((h) => <option key={h.id} value={h.id}>{h.name} — {h.department}</option>)}
          </Select>
        </Field>
        <Field label={`Approved budget (${currencySymbol()})`}><Input type="number" min={0} step={50000} value={budget} onChange={(e) => setBudget(Number(e.target.value))} /></Field>
        <Field label="Start date"><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
        <Field label="Duration (days)"><Input type="number" min={14} value={days} onChange={(e) => setDays(Number(e.target.value))} /></Field>
        <CustomFieldInputs entity="projects" values={custom} onChange={setCustom} />
      </div>
      <p className="mt-4 text-xs text-ash">A five-phase waterfall (Initiation → Handover) is laid out automatically, and 25% of the budget is released as the first allotment. Add people and assets from the page that opens next.</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="light" onClick={onClose}>Cancel</Button>
        <Button onClick={submit}>Create project</Button>
      </div>
    </Modal>
  )
}
