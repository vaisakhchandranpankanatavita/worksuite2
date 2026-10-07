import { appSettings } from '../data/registry'

/** The company's own words for "client" and "project" (set in Settings). Saving them reloads the app, so reading at render time is enough. */
export const term = (k: 'client' | 'project') => appSettings.orgConfig.terms[k]
const lower = (s: string) => s.toLowerCase()
export const clientOne = () => term('client').one
export const clientMany = () => term('client').many
export const projectOne = () => term('project').one
export const projectMany = () => term('project').many
export const lc = lower
