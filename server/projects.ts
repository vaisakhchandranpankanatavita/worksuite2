/**
 * Server-side rules for project records. The client writes whole project documents, so anything that
 * must be trustworthy — who wrote an update, who raised or resolved a blocker, the project code — is
 * set here rather than taken from the request body.
 */
import type { Doc, PublicUser, Store } from './db.js'
import { DEFAULT_ORG_CONFIG, type OrgConfig } from '../src/data/industries.js'

const asList = (v: unknown): Doc[] => (Array.isArray(v) ? v.filter((x): x is Doc => typeof x === 'object' && x !== null) : [])

/** A snapshot of the signed-in account, stored on the entries it authored. */
const personRef = (u: PublicUser) => ({ id: u.id, name: u.name, photo: u.photo, hue: u.hue })

/** Stamp the signed-in user onto updates and blocker changes that are new relative to `prev`. */
export function stampAuthors(prev: Doc | undefined, next: Doc, user: PublicUser): Doc {
  const me = personRef(user)
  const out: Doc = { ...next }

  if (Array.isArray(next.updates)) {
    const known = new Set(asList(prev?.updates).map((u) => u.id))
    out.updates = next.updates.map((u: Doc) => (known.has(u.id) ? u : { ...u, authorId: user.id, author: me }))
  }

  if (Array.isArray(next.blockers)) {
    const before = new Map(asList(prev?.blockers).map((b) => [b.id, b]))
    out.blockers = next.blockers.map((b: Doc) => {
      const old = before.get(b.id)
      let stamped = old ? b : { ...b, raisedBy: me }
      if (b.resolvedOn && !old?.resolvedOn) stamped = { ...stamped, resolvedBy: me }
      return stamped
    })
  }
  return out
}

/** A new project gets the next free code, which is also its id. */
export async function prepareNewProject(store: Store, doc: Doc, user: PublicUser): Promise<Doc> {
  const config = (await store.getJson('settings', 'orgConfig')) as OrgConfig | undefined
  const code = await store.nextCode('projects', config?.projectCodePrefix ?? DEFAULT_ORG_CONFIG.projectCodePrefix)
  return stampAuthors(undefined, { ...doc, id: code, code }, user)
}
