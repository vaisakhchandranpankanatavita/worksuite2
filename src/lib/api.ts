/**
 * Thin client for the Worksuite API (server/). Writes go through a single queue so they reach the
 * server in the order the UI made them (e.g. a create before the update that follows it).
 */
import type { CollectionName, DatasetName, SettingName } from '../data/registry'
import type { ModuleKey, RoleId } from '../data/roles'

const BASE = (import.meta.env?.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '/api'

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
  }
}

async function request<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    signal,
    credentials: 'include',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) {
    const msg = await res.json().then((j: { error?: string }) => j.error ?? '', () => res.statusText)
    // A 401 on anything but the sign-in calls means the session ended (expired or signed out elsewhere).
    if (res.status === 401 && !path.startsWith('/auth/')) unauthorizedListeners.forEach((fn) => fn())
    throw new ApiError(res.status, msg || `HTTP ${res.status}`)
  }
  return res.status === 204 ? (undefined as T) : res.json()
}

/** The signed-in account. Its `modules` decide what the app shows and what the API allows. */
export interface SessionUser {
  id: string
  email: string
  name: string
  role: RoleId
  label: string
  description: string
  modules: ModuleKey[]
  photo?: string
  hue: number
}

export type DemoAccount = Pick<SessionUser, 'id' | 'email' | 'name' | 'label' | 'description' | 'photo' | 'hue' | 'role'>

export interface Bootstrap {
  user: SessionUser
  seededAt: string | null
  /** Only what the user's role may see — anything missing is off-limits. */
  collections: Partial<Record<CollectionName, unknown[]>>
  datasets: Partial<Record<DatasetName, unknown>>
  settings: Partial<Record<SettingName, unknown>>
}

const unauthorizedListeners = new Set<() => void>()
/** Subscribe to "the session has ended" (any 401 outside the sign-in calls). */
export const onUnauthorized = (fn: () => void) => {
  unauthorizedListeners.add(fn)
  return () => unauthorizedListeners.delete(fn)
}

let queue: Promise<unknown> = Promise.resolve()
const listeners = new Set<(err: ApiError | Error) => void>()

/** Subscribe to failed background writes (e.g. to show a toast). */
export const onWriteError = (fn: (err: ApiError | Error) => void) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function enqueue<T>(run: () => Promise<T>): Promise<T> {
  const p = queue.then(run)
  queue = p.catch((err) => listeners.forEach((fn) => fn(err)))
  return p
}

const enc = encodeURIComponent

export const api = {
  login: (email: string, password: string) => request<{ user: SessionUser }>('POST', '/auth/login', { email, password }),
  logout: () => request<void>('POST', '/auth/logout'),
  me: () => request<{ user: SessionUser }>('GET', '/auth/me'),
  accounts: () => request<DemoAccount[]>('GET', '/auth/accounts'),
  bootstrap: (signal?: AbortSignal) => request<Bootstrap>('GET', '/bootstrap', undefined, signal),
  list: <T>(c: CollectionName) => request<T[]>('GET', `/${c}`),
  get: <T>(c: CollectionName, id: string) => request<T>('GET', `/${c}/${enc(id)}`),
  create: <T>(c: CollectionName, doc: T, at: 'start' | 'end' = 'start') => enqueue(() => request<T>('POST', `/${c}${at === 'end' ? '?at=end' : ''}`, doc)),
  replace: <T>(c: CollectionName, id: string, doc: T) => enqueue(() => request<T>('PUT', `/${c}/${enc(id)}`, doc)),
  patch: <T>(c: CollectionName, id: string, changes: Partial<T>) => enqueue(() => request<T>('PATCH', `/${c}/${enc(id)}`, changes)),
  remove: (c: CollectionName, id: string) => enqueue(() => request<void>('DELETE', `/${c}/${enc(id)}`)),
  setSetting: <T>(key: SettingName, value: T) => enqueue(() => request<{ value: T }>('PUT', `/settings/${key}`, { value })),
  dataset: <T>(key: DatasetName) => request<T>('GET', `/datasets/${key}`),
  reseed: () => enqueue(() => request<{ ok: true }>('POST', '/admin/reseed')),
}

/** True once the signed-in user's data has been loaded from the server. */
export const connection = { online: false }
