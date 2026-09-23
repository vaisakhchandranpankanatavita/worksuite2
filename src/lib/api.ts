/**
 * Thin client for the Worksuite API (server/). Writes go through a single queue so they reach the
 * server in the order the UI made them (e.g. a create before the update that follows it).
 */
import type { CollectionName, DatasetName, SettingName } from '../data/registry'

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
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) {
    const msg = await res.json().then((j) => j.error as string, () => res.statusText)
    throw new ApiError(res.status, msg || `HTTP ${res.status}`)
  }
  return res.status === 204 ? (undefined as T) : res.json()
}

export interface Bootstrap {
  seededAt: string | null
  collections: Record<CollectionName, unknown[]>
  datasets: Record<DatasetName, unknown>
  settings: Record<SettingName, unknown>
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

/** True once the app has loaded its data from the server (false = running on the built-in demo data). */
export const connection = { online: false }
