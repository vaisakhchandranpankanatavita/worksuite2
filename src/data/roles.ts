/** The app's four modules. A user's `modules` (and `readOnly` subset) are set by the superadmin. */
export type ModuleKey = 'hr' | 'finance' | 'assets' | 'projects'

export const MODULES: { key: ModuleKey; label: string; blurb: string }[] = [
  { key: 'hr', label: 'People', blurb: 'Employees, attendance, leave, recruitment, payroll' },
  { key: 'finance', label: 'Finance', blurb: 'Invoices, expenses, budgets, reports' },
  { key: 'assets', label: 'Assets', blurb: 'Inventory and stock' },
  { key: 'projects', label: 'Projects', blurb: 'Portfolio, timelines, delivery' },
]
