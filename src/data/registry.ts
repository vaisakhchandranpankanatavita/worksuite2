/**
 * Single map from API names to the in-memory data the app is built on.
 *
 * The server seeds its database from these values, and the client hydrates them in place from the
 * API on start-up — so every page that imports `employees`, `budgets`, etc. sees the server's data
 * without changing its imports.
 */
import {
  activity, assets, attendanceTrend, bankAccounts, budgets, candidates, clients, COMPANY, complianceDeadlines, departmentAttendance,
  employees, EXPENSE_TRACK_CATEGORIES, expenseBills, expenseBreakdown, expenses, expenseSubCategories, headcountTrend, HOLIDAYS,
  invoices, jobs, LEAVE_POLICY, leaveRequests, monthlyFinance, payrollRuns, schedule, todayAttendance, transactions,
} from './mock.js'
import { DEFAULT_THEME, type ThemeId } from './themes.js'
import { projects } from './projects.js'
import { DEFAULT_CUSTOM_FIELDS, DEFAULT_ORG_CONFIG, type CustomFieldDefs, type OrgConfig } from './industries.js'

/** CRUD collections. Names must match `COLLECTIONS` in server/db.ts. */
export const collectionSources = {
  employees,
  jobs,
  leaves: leaveRequests,
  expenses,
  invoices,
  candidates,
  assets,
  assetLog: [] as { id: number; assetId: string; date: string; action: string; detail: string }[],
  projects,
  expenseBills,
  expenseSubCategories,
}
export type CollectionName = keyof typeof collectionSources

/** Read-only reference data (charts, trends, company profile…). */
export const datasetSources = {
  company: COMPANY,
  payrollRuns,
  todayAttendance,
  attendanceTrend,
  departmentAttendance,
  leavePolicy: LEAVE_POLICY,
  holidays: HOLIDAYS,
  schedule,
  headcountTrend,
  clients,
  monthlyFinance,
  budgets,
  expenseBreakdown,
  bankAccounts,
  transactions,
  complianceDeadlines,
  activity,
}
export type DatasetName = keyof typeof datasetSources

/** Mutable app-wide values (seed values here; replaced by the server's on start-up). */
export const appSettings = {
  payrollStatus: payrollRuns[0].status as 'Draft' | 'Processing' | 'Paid',
  expenseTrackCategories: [...EXPENSE_TRACK_CATEGORIES] as string[],
  /** Company configuration — industry, currency, departments, terminology. Written by the superadmin. */
  orgConfig: structuredClone(DEFAULT_ORG_CONFIG) as OrgConfig,
  /** Custom field definitions per record type. Written by the superadmin. */
  customFields: structuredClone(DEFAULT_CUSTOM_FIELDS) as CustomFieldDefs,
  /** Colour theme for the whole company. Written by the superadmin. */
  theme: DEFAULT_THEME as ThemeId,
}
export type SettingName = keyof typeof appSettings
