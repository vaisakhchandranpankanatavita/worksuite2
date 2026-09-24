/**
 * Who can see and change what. Access is granted per module (hr, finance, assets, projects);
 * a signed-in user gets the modules of their role (`users.modules`).
 *
 * `read` lists the modules whose pages need the data; `write` the module that owns it. Some data is
 * shared read-only across modules — e.g. Projects reads invoices and expense claims to cost a project,
 * and every module shows employee names.
 */
import type { ModuleKey } from '../src/data/roles'
import type { Collection } from './db'

interface Rule { read: ModuleKey[]; write: ModuleKey[] }

const ALL: ModuleKey[] = ['hr', 'finance', 'assets', 'projects']

export const COLLECTION_ACCESS: Record<Collection, Rule> = {
  employees: { read: ALL, write: ['hr'] },
  jobs: { read: ['hr'], write: ['hr'] },
  leaves: { read: ['hr'], write: ['hr'] },
  candidates: { read: ['hr'], write: ['hr'] },
  expenses: { read: ['finance', 'projects'], write: ['finance'] },
  invoices: { read: ['finance', 'projects'], write: ['finance'] },
  expenseBills: { read: ['finance'], write: ['finance'] },
  expenseSubCategories: { read: ['finance'], write: ['finance'] },
  assets: { read: ['assets', 'projects'], write: ['assets'] },
  assetLog: { read: ['assets'], write: ['assets'] },
  projects: { read: ['projects'], write: ['projects'] },
}

/** Read-only reference datasets. */
export const DATASET_ACCESS: Record<string, ModuleKey[]> = {
  company: ['hr', 'finance'],
  payrollRuns: ['hr', 'finance'],
  todayAttendance: ['hr'],
  attendanceTrend: ['hr'],
  departmentAttendance: ['hr'],
  leavePolicy: ['hr'],
  holidays: ['hr'],
  schedule: ['hr'],
  headcountTrend: ['hr'],
  complianceDeadlines: ['hr', 'finance'],
  activity: ['hr', 'finance', 'assets'],
  clients: ['finance', 'projects'],
  monthlyFinance: ['finance'],
  budgets: ['finance', 'projects'],
  expenseBreakdown: ['finance'],
  bankAccounts: ['finance'],
  transactions: ['finance'],
}

export const SETTING_ACCESS: Record<string, Rule> = {
  payrollStatus: { read: ['hr', 'finance'], write: ['hr'] },
  expenseTrackCategories: { read: ['finance'], write: ['finance'] },
}

const overlaps = (have: readonly ModuleKey[], need: readonly ModuleKey[]) => need.some((m) => have.includes(m))

export const canReadCollection = (modules: ModuleKey[], c: Collection) => overlaps(modules, COLLECTION_ACCESS[c].read)
export const canWriteCollection = (modules: ModuleKey[], c: Collection) => overlaps(modules, COLLECTION_ACCESS[c].write)
export const canReadDataset = (modules: ModuleKey[], key: string) => overlaps(modules, DATASET_ACCESS[key] ?? [])
export const canReadSetting = (modules: ModuleKey[], key: string) => overlaps(modules, SETTING_ACCESS[key]?.read ?? [])
export const canWriteSetting = (modules: ModuleKey[], key: string) => overlaps(modules, SETTING_ACCESS[key]?.write ?? [])
