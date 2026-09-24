export {}

/**
 * End-to-end check of sign-in, role scoping and the client data layer against a running API:
 *   API_ORIGIN=http://localhost:5173 npx tsx server/smoke-client.ts
 * Signs in through the real store code, runs store actions, then re-reads from the server.
 * Note: it changes data — run `npm run seed` afterwards to reset.
 */
const ORIGIN = process.env.API_ORIGIN ?? 'http://localhost:4000'
const EMAIL = process.env.SMOKE_EMAIL ?? 'meera.iyer@worksuite.io'
const PASSWORD = process.env.SMOKE_PASSWORD ?? 'demo1234'

// Node's fetch has no cookie jar: keep the session cookie by hand and resolve relative URLs.
let cookie = ''
const realFetch = globalThis.fetch
globalThis.fetch = (async (input: string, init: RequestInit = {}) => {
  const res = await realFetch(input.startsWith('/') ? ORIGIN + input : input, { ...init, headers: { ...(init.headers as Record<string, string>), ...(cookie ? { cookie } : {}) } })
  const set = res.headers.get('set-cookie')
  if (set) cookie = set.split(';')[0]
  return res
}) as typeof fetch
// The store's sign-out/expiry path reloads the page; not needed here.
Object.assign(globalThis, { window: { location: { hash: '', reload() {} } } })

const { signIn, useApp, useAuth } = await import('../src/store')
const { employees, leaveRequests } = await import('../src/data/mock')
const { api, ApiError } = await import('../src/lib/api')

const assert = (cond: unknown, msg: string) => {
  if (!cond) throw new Error(`FAIL: ${msg}`)
  console.log(`ok  ${msg}`)
}
const settle = () => new Promise((r) => setTimeout(r, 500))

try {
  await api.login(EMAIL, 'wrong-password')
  assert(false, 'wrong password is rejected')
} catch (err) {
  assert(err instanceof ApiError && err.status === 401, 'wrong password is rejected')
}

const user = await signIn(EMAIL, PASSWORD)
assert(useAuth.getState().status === 'signedIn' && useAuth.getState().user?.email === user.email, `signed in as ${user.label}`)
const can = (m: string) => user.modules.includes(m as never)
assert(employees.length > 0, 'employees loaded')
assert(can('hr') ? leaveRequests.length > 0 : leaveRequests.length === 0, `leave data ${can('hr') ? 'loaded' : 'withheld'} for this role`)

const s = useApp.getState()
if (can('hr')) {
  const leave = s.leaves.find((l) => l.status === 'Pending')!
  s.setLeaveStatus(leave.id, 'Approved')
  await settle()
  assert((await api.get<{ status: string }>('leaves', leave.id)).status === 'Approved', 'leave approval persisted')
}
if (can('assets')) {
  const asset = s.assets.find((a) => a.status === 'Available')!
  s.assignAsset(asset.id, employees[5].id)
  await settle()
  const a = await api.get<{ status: string; assignedTo?: string }>('assets', asset.id)
  assert(a.status === 'Assigned' && a.assignedTo === employees[5].id, 'asset assignment persisted')
  useApp.getState().unassignAsset(asset.id)
  await settle()
  const back = await api.get<{ status: string; assignedTo?: string }>('assets', asset.id)
  assert(back.status === 'Available' && back.assignedTo === undefined, 'unassign clears fields server-side')
}
if (can('projects')) {
  const proj = s.projects.find((p) => p.status === 'In Progress')!
  s.allotFunds(proj.id, 12345, 'smoke test')
  await settle()
  assert((await api.get<{ tranches: unknown[] }>('projects', proj.id)).tranches.length === proj.tranches.length + 1, 'project fund tranche persisted')
}
if (!can('finance')) {
  try {
    await api.patch('invoices', 'INV-0001', { status: 'Paid' })
    assert(false, 'invoice edit refused')
  } catch (err) {
    assert(err instanceof ApiError && (err.status === 403), 'invoice edit refused for this role')
  }
}

await api.logout()
try {
  await api.me()
  assert(false, 'session ended after sign-out')
} catch (err) {
  assert(err instanceof ApiError && err.status === 401, 'session ended after sign-out')
}

console.log('\nAll checks passed.')
process.exit(0)
