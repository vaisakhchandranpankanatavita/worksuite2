export {}

/**
 * End-to-end check of the client data layer against a running API:
 *   API_ORIGIN=http://localhost:5173 npx tsx server/smoke-client.ts
 * Hydrates, runs real store actions, then re-reads from the server to confirm they persisted.
 */
const ORIGIN = process.env.API_ORIGIN ?? 'http://localhost:4000'
const realFetch = globalThis.fetch
globalThis.fetch = ((input: string, init?: RequestInit) => realFetch(input.startsWith('/') ? ORIGIN + input : input, init)) as typeof fetch

const { hydrateFromApi } = await import('../src/data/hydrate')
const { startSync, useApp } = await import('../src/store')
const { employees } = await import('../src/data/mock')
const { api } = await import('../src/lib/api')

const assert = (cond: unknown, msg: string) => {
  if (!cond) throw new Error(`FAIL: ${msg}`)
  console.log(`ok  ${msg}`)
}
const settle = () => new Promise((r) => setTimeout(r, 400))

assert(await hydrateFromApi(), 'hydrates from the API')
startSync()
assert(employees.length > 0 && useApp.getState().projects.length > 0, 'store and module data are populated')

const s = useApp.getState()
const leave = s.leaves.find((l) => l.status === 'Pending')!
s.setLeaveStatus(leave.id, 'Approved')
const asset = s.assets.find((a) => a.status === 'Available')!
s.assignAsset(asset.id, employees[5].id)
const proj = s.projects.find((p) => p.status === 'In Progress')!
const tranches = proj.tranches.length
s.allotFunds(proj.id, 12345, 'smoke test')
const newId = `EXP-SMOKE-${Date.now()}`
s.addExpense({ ...s.expenses[0], id: newId, description: 'Smoke test claim', status: 'Pending' })
s.runPayroll()
await settle()

assert((await api.get<{ status: string }>('leaves', leave.id)).status === 'Approved', 'leave approval persisted')
const a = await api.get<{ status: string; assignedTo?: string }>('assets', asset.id)
assert(a.status === 'Assigned' && a.assignedTo === employees[5].id, 'asset assignment persisted')
const log = await api.list<{ assetId: string }>('assetLog')
assert(log[0]?.assetId === asset.id, 'asset log entry persisted')
assert((await api.get<{ tranches: unknown[] }>('projects', proj.id)).tranches.length === tranches + 1, 'project fund tranche persisted')
assert((await api.list<{ id: string }>('expenses'))[0].id === newId, 'new expense persisted at the head of the list')
assert((await (await fetch('/api/settings/payrollStatus')).json()).value === 'Processing', 'payroll status persisted')

useApp.getState().unassignAsset(asset.id)
await settle()
const back = await api.get<{ status: string; assignedTo?: string }>('assets', asset.id)
assert(back.status === 'Available' && back.assignedTo === undefined, 'unassign clears fields server-side')

console.log('\nAll client sync checks passed.')
process.exit(0)
