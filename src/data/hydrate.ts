/**
 * Loads the signed-in user's workspace from the API.
 *
 * Pages import data straight from `data/mock` (`employees`, `budgets`, …), so the server's values are
 * written into those same exported arrays/objects in place — every existing import sees them. Data the
 * user's role can't access is left empty, so nothing outside their modules shows up anywhere.
 */
import { api, connection, type SessionUser } from '../lib/api'
import { normalizeProject, type StoredProject } from './projects'
import { DEPARTMENTS } from './mock'
import { setMoneyFormat } from '../lib/format'
import { applyTheme } from '../lib/theme'
import { appSettings, collectionSources, datasetSources } from './registry'

function replaceInPlace(target: unknown, value: unknown) {
  if (Array.isArray(target)) {
    target.splice(0, target.length, ...(Array.isArray(value) ? value : []))
  } else if (target && typeof target === 'object') {
    for (const k of Object.keys(target)) delete (target as Record<string, unknown>)[k]
    if (value && typeof value === 'object') Object.assign(target, value)
  }
}

export async function loadWorkspace(): Promise<SessionUser> {
  const data = await api.bootstrap()
  for (const [name, target] of Object.entries(collectionSources)) {
    const docs = data.collections[name as keyof typeof collectionSources]
    // Projects saved before blocker tracking have no `blockers` list.
    replaceInPlace(target, name === 'projects' ? docs?.map((p) => normalizeProject(p as StoredProject)) : docs)
  }
  for (const [name, target] of Object.entries(datasetSources)) {
    replaceInPlace(target, data.datasets[name as keyof typeof datasetSources])
  }
  for (const key of Object.keys(appSettings) as (keyof typeof appSettings)[]) {
    const value = data.settings[key]
    if (value !== undefined) (appSettings as Record<string, unknown>)[key] = value
  }
  // Company configuration drives formatting, department lists and the company name shown on documents.
  const { orgConfig } = appSettings
  setMoneyFormat(orgConfig.currency, orgConfig.locale)
  replaceInPlace(DEPARTMENTS, orgConfig.departments)
  const company = datasetSources.company as { name: string }
  if (company) company.name = orgConfig.companyName
  applyTheme(appSettings.theme)
  connection.online = true
  return data.user
}
