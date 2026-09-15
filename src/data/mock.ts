import { mulberry32 } from '../lib/format'
import { photoFor } from '../lib/photo'

const rand = mulberry32(20260914)
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)]
const between = (min: number, max: number) => Math.floor(min + rand() * (max - min + 1))
const round = (n: number, to = 500) => Math.round(n / to) * to

export const TODAY = new Date()
TODAY.setHours(0, 0, 0, 0)
const iso = (d: Date) => d.toISOString().slice(0, 10)
const addDays = (d: Date, n: number) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
const monthLabel = (offset: number) => {
  const d = new Date(TODAY.getFullYear(), TODAY.getMonth() + offset, 1)
  return d.toLocaleDateString('en-IN', { month: 'short' })
}

export const COMPANY = {
  name: 'Worksuite Technologies Pvt. Ltd.',
  address: '4th Floor, Prestige Tech Park, Outer Ring Road, Bengaluru 560103',
  gstin: '29AABCW1234K1Z5',
  pan: 'AABCW1234K',
}

/* ───────────────────────── People ───────────────────────── */

const FIRST = ['Aarav', 'Vivaan', 'Aditya', 'Arjun', 'Rohan', 'Karthik', 'Nikhil', 'Rahul', 'Siddharth', 'Varun', 'Anirudh', 'Pranav', 'Vikram', 'Harish', 'Manoj', 'Suresh', 'Faisal', 'Imran', 'Joel', 'Kevin',
  'Ananya', 'Diya', 'Aditi', 'Priya', 'Sneha', 'Kavya', 'Meera', 'Ishita', 'Pooja', 'Riya', 'Divya', 'Lakshmi', 'Nandini', 'Shreya', 'Fatima', 'Ayesha', 'Neha', 'Anjali', 'Sara', 'Tanvi'] as const
const LAST = ['Sharma', 'Iyer', 'Nair', 'Menon', 'Reddy', 'Patel', 'Gupta', 'Rao', 'Pillai', 'Kulkarni', 'Joshi', 'Verma', 'Khan', 'Das', 'Chatterjee', 'Singh', 'Mehta', 'Kapoor', 'Thomas', 'Varghese', 'Hegde', 'Shetty', 'Banerjee', 'Mishra'] as const

export const DEPARTMENTS = ['Engineering', 'Sales', 'Marketing', 'Finance', 'Human Resources', 'Operations', 'Customer Success', 'Design'] as const
export type Department = (typeof DEPARTMENTS)[number]

const ROLES: Record<Department, string[]> = {
  Engineering: ['Software Engineer', 'Senior Software Engineer', 'Tech Lead', 'QA Engineer', 'DevOps Engineer', 'Engineering Manager'],
  Sales: ['Account Executive', 'Sales Manager', 'Business Development Rep', 'Key Account Manager'],
  Marketing: ['Marketing Manager', 'Content Strategist', 'Performance Marketer', 'Brand Designer'],
  Finance: ['Accountant', 'Finance Manager', 'Payroll Specialist', 'Financial Analyst'],
  'Human Resources': ['HR Business Partner', 'Talent Acquisition Lead', 'HR Executive', 'People Ops Manager'],
  Operations: ['Operations Manager', 'Admin Executive', 'Procurement Specialist', 'IT Support'],
  'Customer Success': ['Customer Success Manager', 'Support Engineer', 'Onboarding Specialist'],
  Design: ['Product Designer', 'Senior Product Designer', 'UX Researcher', 'Design Lead'],
}
const DEPT_WEIGHT: Department[] = ['Engineering', 'Engineering', 'Engineering', 'Engineering', 'Sales', 'Sales', 'Marketing', 'Finance', 'Human Resources', 'Operations', 'Customer Success', 'Customer Success', 'Design', 'Design']
export const LOCATIONS = ['Bengaluru', 'Mumbai', 'Pune', 'Hyderabad', 'Kochi', 'Remote'] as const

export type EmployeeStatus = 'Active' | 'On Leave' | 'Probation' | 'Notice Period'
export type WorkMode = 'Office' | 'Hybrid' | 'Remote'

export interface Employee {
  id: string
  name: string
  email: string
  phone: string
  gender: 'M' | 'F'
  department: Department
  role: string
  location: (typeof LOCATIONS)[number]
  workMode: WorkMode
  status: EmployeeStatus
  joinDate: string
  dob: string
  managerId?: string
  ctcAnnual: number
  pan: string
  uan: string
  bank: string
  avatarHue: number
  performance: number // 1-5
}

const usedNames = new Set<string>()
function makeName() {
  for (;;) {
    const idx = Math.floor(rand() * FIRST.length)
    const name = `${FIRST[idx]} ${pick(LAST)}`
    if (!usedNames.has(name)) {
      usedNames.add(name)
      return { name, gender: (idx >= 20 ? 'F' : 'M') as 'M' | 'F' }
    }
  }
}

const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const randPan = () => Array.from({ length: 5 }, () => pick(letters.split(''))).join('') + between(1000, 9999) + pick(letters.split(''))

export const employees: Employee[] = Array.from({ length: 128 }, (_, i) => {
  const { name, gender } = makeName()
  const department = i < DEPARTMENTS.length ? DEPARTMENTS[i] : pick(DEPT_WEIGHT)
  const roles = ROLES[department]
  const role = i < DEPARTMENTS.length ? roles[roles.length - 1] : pick(roles.slice(0, -1))
  const senior = /Senior|Lead|Manager/.test(role)
  const ctcAnnual = round(senior ? between(1800000, 4200000) : between(480000, 1600000), 10000)
  const join = addDays(TODAY, -between(20, 2400))
  const statusRoll = rand()
  const status: EmployeeStatus = TODAY.getTime() - join.getTime() < 180 * 864e5 ? 'Probation' : statusRoll < 0.06 ? 'On Leave' : statusRoll < 0.09 ? 'Notice Period' : 'Active'
  const location = pick(LOCATIONS)
  const [first, last] = name.toLowerCase().split(' ')
  return {
    id: `WS${String(1001 + i)}`,
    name,
    email: `${first}.${last}@worksuite.in`,
    phone: `+91 ${between(70000, 99999)} ${between(10000, 99999)}`,
    gender,
    department,
    role,
    location,
    workMode: location === 'Remote' ? 'Remote' : rand() < 0.35 ? 'Hybrid' : 'Office',
    status,
    joinDate: iso(join),
    dob: iso(new Date(between(1978, 2002), between(0, 11), between(1, 28))),
    ctcAnnual,
    pan: randPan(),
    uan: String(between(100000, 999999)) + String(between(100000, 999999)),
    bank: `${pick(['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra'])} ••${between(1000, 9999)}`,
    avatarHue: between(0, 360),
    performance: Math.round((2.8 + rand() * 2.2) * 10) / 10,
  }
})

// Department heads are the first 8; everyone else reports to their head.
for (const e of employees.slice(DEPARTMENTS.length)) {
  e.managerId = employees[DEPARTMENTS.indexOf(e.department)].id
}

export const employeeById = (id: string) => employees.find((e) => e.id === id)

/* ───────────────────────── Payroll (India) ───────────────────────── */

export interface Payslip {
  basic: number
  hra: number
  special: number
  gross: number
  pf: number
  esi: number
  pt: number
  tds: number
  deductions: number
  net: number
  employerPf: number
}

/** New tax regime FY 2025-26 slabs, simplified (standard deduction ₹75k, 87A rebate up to ₹12L). */
function annualTax(taxable: number) {
  const income = Math.max(0, taxable - 75000)
  if (income <= 1200000) return 0
  const slabs = [[400000, 0], [800000, 0.05], [1200000, 0.1], [1600000, 0.15], [2000000, 0.2], [2400000, 0.25], [Infinity, 0.3]] as const
  let tax = 0, prev = 0
  for (const [limit, rate] of slabs) {
    if (income > prev) tax += (Math.min(income, limit) - prev) * rate
    prev = limit
  }
  return tax * 1.04 // health & education cess
}

export function computePayslip(e: Pick<Employee, 'ctcAnnual'>): Payslip {
  const monthly = e.ctcAnnual / 12
  const basic = Math.round(monthly * 0.4)
  const employerPf = Math.min(Math.round(basic * 0.12), 1800)
  const gross = Math.round(monthly - employerPf)
  const hra = Math.round(basic * 0.5)
  const special = gross - basic - hra
  const pf = employerPf
  const esi = gross <= 21000 ? Math.round(gross * 0.0075) : 0
  const pt = 200
  const tds = Math.round(annualTax(e.ctcAnnual) / 12)
  const deductions = pf + esi + pt + tds
  return { basic, hra, special, gross, pf, esi, pt, tds, deductions, net: gross - deductions, employerPf }
}

export interface PayrollRun {
  month: string
  label: string
  employees: number
  gross: number
  deductions: number
  net: number
  status: 'Paid' | 'Processing' | 'Draft'
  paidOn?: string
}

export const payrollRuns: PayrollRun[] = Array.from({ length: 6 }, (_, k) => {
  const offset = -k
  const d = new Date(TODAY.getFullYear(), TODAY.getMonth() + offset, 1)
  const count = employees.length - k * 2
  const base = employees.slice(0, count).map(computePayslip)
  const gross = base.reduce((s, p) => s + p.gross, 0)
  const deductions = base.reduce((s, p) => s + p.deductions, 0)
  return {
    month: iso(d).slice(0, 7),
    label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    employees: count,
    gross,
    deductions,
    net: gross - deductions,
    status: k === 0 ? 'Draft' : 'Paid',
    paidOn: k === 0 ? undefined : iso(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
  }
})

/* ───────────────────────── Attendance ───────────────────────── */

export type AttendanceStatus = 'Present' | 'Remote' | 'Absent' | 'On Leave' | 'Late'

export const todayAttendance = employees.map((e) => {
  const r = rand()
  let status: AttendanceStatus
  if (e.status === 'On Leave') status = 'On Leave'
  else if (e.workMode === 'Remote') status = r < 0.92 ? 'Remote' : 'Absent'
  else status = r < 0.78 ? 'Present' : r < 0.88 ? 'Late' : r < 0.94 ? 'Remote' : 'Absent'
  const inH = status === 'Late' ? between(10, 11) : between(8, 9)
  const checkIn = status === 'Absent' || status === 'On Leave' ? null : `${String(inH).padStart(2, '0')}:${String(between(0, 59)).padStart(2, '0')}`
  return { employeeId: e.id, status, checkIn, hours: checkIn ? Math.round((6.5 + rand() * 3) * 10) / 10 : 0 }
})

/** Last 30 working days of company-wide attendance %. */
export const attendanceTrend = (() => {
  const out: { date: string; label: string; rate: number; present: number; remote: number; absent: number }[] = []
  let d = new Date(TODAY)
  while (out.length < 30) {
    d = addDays(d, -1)
    if (d.getDay() === 0 || d.getDay() === 6) continue
    const rate = 88 + rand() * 10
    const total = employees.length
    const present = Math.round((total * rate) / 100)
    const remote = Math.round(present * (0.15 + rand() * 0.1))
    out.unshift({ date: iso(d), label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), rate: Math.round(rate * 10) / 10, present: present - remote, remote, absent: total - present })
  }
  return out
})()

/** Heatmap: 5 weeks × 5 weekdays attendance rate per department. */
export const departmentAttendance = DEPARTMENTS.map((dept) => ({
  dept,
  rate: Math.round((86 + rand() * 12) * 10) / 10,
  weeks: Array.from({ length: 6 }, () => Math.round(80 + rand() * 20)),
}))

/* ───────────────────────── Leave ───────────────────────── */

export type LeaveType = 'Casual Leave' | 'Sick Leave' | 'Earned Leave' | 'Work From Home' | 'Comp Off'
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected'

export interface LeaveRequest {
  id: string
  employeeId: string
  type: LeaveType
  from: string
  to: string
  days: number
  reason: string
  status: LeaveStatus
  appliedOn: string
}

const REASONS = ['Family function in hometown', 'Fever and cold', 'Personal work', 'Travelling to Kerala for Onam', 'Doctor appointment', 'Child’s school event', 'Moving to a new apartment', 'Wedding in the family', 'Internet outage at home — working remotely', 'Worked on weekend release']
const LEAVE_TYPES: LeaveType[] = ['Casual Leave', 'Sick Leave', 'Earned Leave', 'Work From Home', 'Comp Off']

export const leaveRequests: LeaveRequest[] = Array.from({ length: 26 }, (_, i) => {
  const start = addDays(TODAY, between(-20, 25))
  const days = between(1, 4)
  const status: LeaveStatus = i < 8 ? 'Pending' : rand() < 0.85 ? 'Approved' : 'Rejected'
  return {
    id: `LV-${2400 + i}`,
    employeeId: pick(employees).id,
    type: pick(LEAVE_TYPES),
    from: iso(start),
    to: iso(addDays(start, days - 1)),
    days,
    reason: pick(REASONS),
    status,
    appliedOn: iso(addDays(start, -between(2, 10))),
  }
})

export const LEAVE_POLICY: Record<Exclude<LeaveType, 'Work From Home' | 'Comp Off'>, number> = {
  'Casual Leave': 12,
  'Sick Leave': 10,
  'Earned Leave': 18,
}

export const HOLIDAYS = [
  { date: '2026-10-02', name: 'Gandhi Jayanti' },
  { date: '2026-10-20', name: 'Dussehra' },
  { date: '2026-11-08', name: 'Diwali' },
  { date: '2026-12-25', name: 'Christmas' },
  { date: '2027-01-01', name: 'New Year' },
  { date: '2027-01-26', name: 'Republic Day' },
]

/* ───────────────────────── Recruitment ───────────────────────── */

export const STAGES = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired'] as const
export type Stage = (typeof STAGES)[number]

export interface Job {
  id: string
  title: string
  department: Department
  location: string
  openings: number
  applicants: number
  postedOn: string
  type: 'Full-time' | 'Contract' | 'Internship'
}

export const jobs: Job[] = [
  { title: 'Senior React Developer', department: 'Engineering' as Department },
  { title: 'Backend Engineer (Node.js)', department: 'Engineering' as Department },
  { title: 'Product Designer', department: 'Design' as Department },
  { title: 'Enterprise Account Executive', department: 'Sales' as Department },
  { title: 'Payroll Specialist', department: 'Finance' as Department },
  { title: 'Customer Success Manager', department: 'Customer Success' as Department },
].map((j, i) => ({
  ...j,
  id: `JOB-${110 + i}`,
  location: pick(['Bengaluru', 'Pune', 'Hybrid · Mumbai', 'Remote']),
  openings: between(1, 3),
  applicants: between(18, 140),
  postedOn: iso(addDays(TODAY, -between(3, 40))),
  type: i === 4 ? 'Contract' : 'Full-time',
}))

export interface Candidate {
  id: string
  name: string
  jobId: string
  stage: Stage
  source: 'LinkedIn' | 'Naukri' | 'Referral' | 'Careers Page' | 'Instahyre'
  experience: number
  expectedCtc: number
  rating: number
  appliedOn: string
  avatarHue: number
}

export const candidates: Candidate[] = Array.from({ length: 26 }, (_, i) => {
  const { name } = makeName()
  const stageIdx = i < 8 ? 0 : i < 14 ? 1 : i < 20 ? 2 : i < 24 ? 3 : 4
  return {
    id: `CND-${500 + i}`,
    name,
    jobId: pick(jobs).id,
    stage: STAGES[stageIdx],
    source: pick(['LinkedIn', 'Naukri', 'Referral', 'Careers Page', 'Instahyre'] as const),
    experience: between(1, 12),
    expectedCtc: round(between(600000, 3500000), 50000),
    rating: between(2, 5),
    appliedOn: iso(addDays(TODAY, -between(1, 30))),
    avatarHue: between(0, 360),
  }
})

/* ───────────────────────── Schedule ───────────────────────── */

export interface ScheduleItem {
  id: string
  date: string
  time: string
  title: string
  person: string
  subtitle: string
  tag: string
  avatarHue: number
}

export const schedule: ScheduleItem[] = [0, 1, 2].flatMap((day) =>
  ['10:00', '11:30', '14:30', '16:00', '17:30'].slice(0, 3 + (day % 2)).map((time, k) => {
    const c = candidates[(day * 5 + k) % candidates.length]
    const kind = pick(['Technical Interview', 'Culture Fit', 'Performance Review', '1:1 Check-in', 'Onboarding'])
    return {
      id: `SCH-${day}-${k}`,
      date: iso(addDays(TODAY, day)),
      time,
      title: kind,
      person: kind.includes('Interview') || kind === 'Culture Fit' ? c.name : pick(employees).name,
      subtitle: kind.includes('Interview') ? jobs.find((j) => j.id === c.jobId)!.title : pick(DEPARTMENTS),
      tag: kind,
      avatarHue: between(0, 360),
    }
  }),
)

/* ───────────────────────── Headcount history ───────────────────────── */

export const headcountTrend = (() => {
  let total = employees.length - 26
  return Array.from({ length: 12 }, (_, i) => {
    const hires = between(3, 7)
    const exits = between(0, 3)
    total += hires - exits
    return { month: monthLabel(i - 11), total, hires, exits }
  })
})()
headcountTrend[headcountTrend.length - 1].total = employees.length

/* ───────────────────────── Finance ───────────────────────── */

const CLIENTS = [
  { name: 'Tata Digital', gstin: '27AAACT2727Q1ZW', city: 'Mumbai' },
  { name: 'Zeta Fintech', gstin: '29AAFCZ4521M1Z2', city: 'Bengaluru' },
  { name: 'Mahindra Logistics', gstin: '27AAECM3121F1Z8', city: 'Mumbai' },
  { name: 'Freshleaf Organics', gstin: '32AADCF8812R1ZK', city: 'Kochi' },
  { name: 'Nexora Health', gstin: '36AAHCN6634P1Z1', city: 'Hyderabad' },
  { name: 'Bluecart Retail', gstin: '07AAICB9981D1ZQ', city: 'New Delhi' },
  { name: 'Kinetic Motors', gstin: '27AABCK4410L1ZT', city: 'Pune' },
  { name: 'Aster Learning', gstin: '33AAKCA7302H1Z6', city: 'Chennai' },
] as const

export type InvoiceStatus = 'Paid' | 'Pending' | 'Overdue' | 'Draft'

export interface InvoiceLine { description: string; qty: number; rate: number }
export interface Invoice {
  id: string
  client: (typeof CLIENTS)[number]
  issueDate: string
  dueDate: string
  lines: InvoiceLine[]
  subtotal: number
  gst: number
  total: number
  status: InvoiceStatus
}

const SERVICES = ['Platform subscription — Enterprise', 'Implementation & onboarding', 'Custom integration development', 'Dedicated support retainer', 'UX audit & redesign sprint', 'Cloud hosting (managed)', 'Data migration services']

export function buildInvoice(partial: Omit<Invoice, 'subtotal' | 'gst' | 'total'>): Invoice {
  const subtotal = partial.lines.reduce((s, l) => s + l.qty * l.rate, 0)
  const gst = Math.round(subtotal * 0.18)
  return { ...partial, subtotal, gst, total: subtotal + gst }
}

export const invoices: Invoice[] = Array.from({ length: 42 }, (_, i) => {
  const issue = addDays(TODAY, -Math.floor((i / 42) * 330) - between(0, 6))
  const due = addDays(issue, 30)
  const lines = Array.from({ length: between(1, 3) }, () => ({ description: pick(SERVICES), qty: between(1, 4), rate: round(between(45000, 320000), 5000) }))
  let status: InvoiceStatus
  if (i < 3) status = 'Draft'
  else if (due.getTime() > TODAY.getTime()) status = rand() < 0.35 ? 'Paid' : 'Pending'
  else status = rand() < 0.85 ? 'Paid' : 'Overdue'
  return buildInvoice({ id: `INV-2026-${String(180 - i).padStart(4, '0')}`, client: pick(CLIENTS), issueDate: iso(issue), dueDate: iso(due), lines, status })
})

export const clients = CLIENTS

export type ExpenseStatus = 'Pending' | 'Approved' | 'Rejected' | 'Reimbursed'
export const EXPENSE_CATEGORIES = ['Travel', 'Meals', 'Software', 'Office Supplies', 'Training', 'Client Entertainment'] as const
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export interface Expense {
  id: string
  employeeId: string
  category: ExpenseCategory
  description: string
  amount: number
  date: string
  status: ExpenseStatus
  hasReceipt: boolean
}

const EXPENSE_DESC: Record<ExpenseCategory, string[]> = {
  Travel: ['Flight BLR → BOM client visit', 'Uber rides — client meetings', 'Train tickets to Pune office', 'Hotel stay, Hyderabad'],
  Meals: ['Team lunch after release', 'Dinner with client stakeholders', 'Working lunch — sprint planning'],
  Software: ['Figma annual seat', 'JetBrains license', 'Notion team plan', 'Zoom Pro renewal'],
  'Office Supplies': ['Ergonomic chair', 'Monitor stand & cables', 'Whiteboard markers & notebooks'],
  Training: ['AWS certification exam', 'Udemy course bundle', 'HR conference pass — NHRD'],
  'Client Entertainment': ['Diwali gifts for clients', 'Client offsite dinner'],
}

export const expenses: Expense[] = Array.from({ length: 34 }, (_, i) => {
  const category = pick(EXPENSE_CATEGORIES)
  const status: ExpenseStatus = i < 9 ? 'Pending' : rand() < 0.2 ? 'Approved' : rand() < 0.9 ? 'Reimbursed' : 'Rejected'
  return {
    id: `EXP-${3100 + i}`,
    employeeId: pick(employees).id,
    category,
    description: pick(EXPENSE_DESC[category]),
    amount: round(category === 'Travel' ? between(2500, 38000) : category === 'Software' ? between(1500, 24000) : between(600, 15000), 50),
    date: iso(addDays(TODAY, -between(0, 60) - (i < 9 ? 0 : 5))),
    status,
    hasReceipt: rand() < 0.88,
  }
})

/** Monthly P&L for last 12 months. */
export const monthlyFinance = Array.from({ length: 12 }, (_, i) => {
  const growth = 1 + i * 0.035
  const revenue = round((21500000 + rand() * 3500000) * growth, 10000)
  const payroll = round(payrollRuns[0].gross * (0.86 + i * 0.012) + payrollRuns[0].gross * 0.08, 10000)
  const operating = round(2600000 + rand() * 900000, 10000)
  const marketing = round(1100000 + rand() * 700000, 10000)
  const expensesTotal = payroll + operating + marketing
  return { month: monthLabel(i - 11), revenue, payroll, operating, marketing, expenses: expensesTotal, profit: revenue - expensesTotal }
})

export const budgets = DEPARTMENTS.map((dept) => {
  const heads = employees.filter((e) => e.department === dept)
  const payroll = heads.reduce((s, e) => s + e.ctcAnnual, 0)
  const allocated = round(payroll * 1.25 + between(800000, 3000000), 100000)
  const spentRatio = 0.35 + rand() * 0.35 // FY started in April
  return { dept, allocated, spent: round(allocated * spentRatio, 10000), headcount: heads.length }
})

export const expenseBreakdown = [
  { name: 'Payroll', value: monthlyFinance.at(-1)!.payroll },
  { name: 'Operations', value: round(monthlyFinance.at(-1)!.operating * 0.6, 10000) },
  { name: 'Cloud & Software', value: round(monthlyFinance.at(-1)!.operating * 0.4, 10000) },
  { name: 'Marketing', value: monthlyFinance.at(-1)!.marketing },
]

export const bankAccounts = [
  { name: 'HDFC Current A/c', number: '••4821', balance: 98450000 },
  { name: 'ICICI Payroll A/c', number: '••1190', balance: 32600000 },
  { name: 'Razorpay Settlements', number: 'Wallet', balance: 4575000 },
]

export const transactions = Array.from({ length: 14 }, (_, i) => {
  const inflow = rand() < 0.45
  const inv = invoices.filter((x) => x.status === 'Paid')[i % 20]
  return {
    id: `TXN-${88000 + i}`,
    date: iso(addDays(TODAY, -Math.floor(i * 1.6))),
    description: inflow ? `Payment received — ${inv.client.name}` : pick(['AWS India — cloud hosting', 'Office rent — Prestige Tech Park', 'GST payment (GSTR-3B)', 'TDS deposit — Challan 281', 'Google Workspace', 'BESCOM electricity', 'Vendor: Aarna Facility Services']),
    amount: inflow ? inv.total : -round(between(25000, 780000), 100),
    account: inflow ? 'HDFC Current A/c' : pick(['HDFC Current A/c', 'ICICI Payroll A/c']),
  }
})

export const complianceDeadlines = [
  { title: 'TDS deposit (Challan 281)', due: 7, type: 'Monthly' },
  { title: 'PF & ESI remittance', due: 15, type: 'Monthly' },
  { title: 'GSTR-1 filing', due: 11, type: 'Monthly' },
  { title: 'GSTR-3B filing', due: 20, type: 'Monthly' },
  { title: 'Professional Tax (Karnataka)', due: 20, type: 'Monthly' },
].map((c) => {
  let d = new Date(TODAY.getFullYear(), TODAY.getMonth(), c.due)
  if (d < TODAY) d = new Date(TODAY.getFullYear(), TODAY.getMonth() + 1, c.due)
  return { ...c, date: iso(d), daysLeft: Math.round((d.getTime() - TODAY.getTime()) / 864e5) }
}).sort((a, b) => a.daysLeft - b.daysLeft)

export type ActivityType = 'leave' | 'payroll' | 'payment' | 'recruitment' | 'expense' | 'onboarding' | 'alert'

export const activity: { who: string; what: string; target: string; when: string; kind: 'hr' | 'finance'; type: ActivityType; photo?: string }[] = [
  { who: 'Priya Menon', what: 'approved leave for', target: 'Rahul Iyer', when: '12m ago', kind: 'hr', type: 'leave', photo: 'https://randomuser.me/api/portraits/women/44.jpg' },
  { who: 'Payroll', what: 'draft generated for', target: payrollRuns[0].label, when: '1h ago', kind: 'finance', type: 'payroll' },
  { who: 'Zeta Fintech', what: 'paid invoice', target: invoices[5].id, when: '2h ago', kind: 'finance', type: 'payment' },
  { who: 'Karthik Rao', what: 'moved candidate to Offer —', target: candidates[20].name, when: '3h ago', kind: 'hr', type: 'recruitment', photo: 'https://randomuser.me/api/portraits/men/32.jpg' },
  { who: 'Sneha Kulkarni', what: 'submitted expense', target: '₹12,400 travel', when: '5h ago', kind: 'finance', type: 'expense', photo: 'https://randomuser.me/api/portraits/women/65.jpg' },
  { who: 'System', what: 'onboarded new joiner', target: employees[employees.length - 1].name, when: 'Yesterday', kind: 'hr', type: 'onboarding', photo: photoFor(employees[employees.length - 1]) },
  { who: 'Ananya Bose', what: 'flagged an overdue invoice for', target: clients[2]?.name ?? 'a client', when: 'Yesterday', kind: 'finance', type: 'alert', photo: 'https://randomuser.me/api/portraits/women/21.jpg' },
  { who: 'Rohit Verma', what: 'completed onboarding for', target: employees[employees.length - 2]?.name ?? 'a new joiner', when: '2d ago', kind: 'hr', type: 'onboarding', photo: 'https://randomuser.me/api/portraits/men/54.jpg' },
]

/* ───────────────────────── Assets (IT inventory) ───────────────────────── */

export type AssetCategory = 'Laptop' | 'Phone' | 'Monitor' | 'Headset' | 'Tablet' | 'Accessory'
export type AssetStatus = 'Available' | 'Assigned' | 'Maintenance' | 'Retired'

export const ASSET_CATEGORIES: AssetCategory[] = ['Laptop', 'Phone', 'Monitor', 'Headset', 'Tablet', 'Accessory']

export interface Asset {
  id: string
  name: string
  category: AssetCategory
  model: string
  serial: string
  status: AssetStatus
  assignedTo?: string
  assignedOn?: string
  returnDue?: string
  purchaseDate: string
  warrantyUntil?: string
  cost: number
  location: (typeof LOCATIONS)[number]
  notes?: string
  image?: string
}

const EXTRA_ASSET_SPECS: { category: AssetCategory; name: string; model: string; cost: number }[] = [
  { category: 'Monitor', name: 'Dell UltraSharp 27"', model: 'U2723QE · 4K', cost: 42000 },
  { category: 'Monitor', name: 'LG UltraFine 24"', model: 'Full HD', cost: 18000 },
  { category: 'Headset', name: 'Jabra Evolve2 55', model: 'Wireless · ANC', cost: 22000 },
  { category: 'Headset', name: 'Sony WH-1000XM5', model: 'Wireless · ANC', cost: 29990 },
  { category: 'Phone', name: 'iPhone 15', model: '128GB · Company SIM', cost: 79900 },
  { category: 'Phone', name: 'Samsung Galaxy S24', model: '256GB', cost: 74999 },
  { category: 'Tablet', name: 'iPad Air', model: '64GB · WiFi', cost: 59900 },
  { category: 'Accessory', name: 'Logitech MX Master 3S', model: 'Wireless mouse', cost: 8500 },
  { category: 'Accessory', name: 'Keychron K8', model: 'Mechanical keyboard', cost: 6500 },
]

const managersAndSeniors = employees.filter((e) => /Manager|Lead|Sales|Account/.test(e.role))

const IMG = (id: string) => `https://images.unsplash.com/${id}?w=400&q=60&auto=format&fit=crop`

// Mock product photos keyed by exact asset name, falling back to a category default.
const ASSET_IMAGE_BY_NAME: Record<string, string> = {
  'MacBook Pro 14"': IMG('photo-1517336714731-489689fd1ca8'),
  'Dell Latitude 5440': IMG('photo-1588872657578-7efd1f1555ed'),
  'Dell UltraSharp 27"': IMG('photo-1527443195645-1133f7f28990'),
  'LG UltraFine 24"': IMG('photo-1547082299-de196ea013d6'),
  'Jabra Evolve2 55': IMG('photo-1505740420928-5e560c06d30e'),
  'Sony WH-1000XM5': IMG('photo-1618366712010-f4ae9c647dcb'),
  'iPhone 15': IMG('photo-1510557880182-3d4d3cba35a5'),
  'Samsung Galaxy S24': IMG('photo-1580910051074-3eb694886505'),
  'iPad Air': IMG('photo-1544244015-0df4b3ffc6b0'),
  'Logitech MX Master 3S': IMG('photo-1527814050087-3793815479db'),
  'Keychron K8': IMG('photo-1587829741301-dc798b83add3'),
}

const ASSET_IMAGE_BY_CATEGORY: Record<AssetCategory, string> = {
  Laptop: IMG('photo-1517336714731-489689fd1ca8'),
  Phone: IMG('photo-1580910051074-3eb694886505'),
  Monitor: IMG('photo-1527443195645-1133f7f28990'),
  Headset: IMG('photo-1505740420928-5e560c06d30e'),
  Tablet: IMG('photo-1544244015-0df4b3ffc6b0'),
  Accessory: IMG('photo-1527814050087-3793815479db'),
}

const imageFor = (name: string, category: AssetCategory) => ASSET_IMAGE_BY_NAME[name] ?? ASSET_IMAGE_BY_CATEGORY[category]

export const assets: Asset[] = []

// One laptop per employee — every hire is issued one on day one.
employees.forEach((e, i) => {
  const isDesignEng = e.department === 'Design' || e.department === 'Engineering'
  const purchase = addDays(new Date(e.joinDate), -between(0, 20))
  const name = isDesignEng ? 'MacBook Pro 14"' : 'Dell Latitude 5440'
  assets.push({
    id: `AS${String(1001 + i)}`,
    name,
    category: 'Laptop',
    model: isDesignEng ? 'Apple M3 Pro · 18GB' : 'Intel i7 · 16GB',
    serial: `WS-LT-${between(1000, 9999)}`,
    status: 'Assigned',
    assignedTo: e.id,
    assignedOn: e.joinDate,
    purchaseDate: iso(purchase),
    warrantyUntil: iso(addDays(purchase, 365 * 3)),
    cost: isDesignEng ? 220000 : 95000,
    location: e.location === 'Remote' ? pick(LOCATIONS.filter((l) => l !== 'Remote')) : e.location,
    image: imageFor(name, 'Laptop'),
  })
})

// Extra pool assets (monitors, headsets, phones, tablets, accessories) — some assigned, some sitting in inventory.
let nextAssetId = 1001 + employees.length
for (let i = 0; i < 60; i++) {
  const spec = pick(EXTRA_ASSET_SPECS)
  const purchase = addDays(TODAY, -between(30, 1200))
  const statusRoll = rand()
  const status: AssetStatus = statusRoll < 0.55 ? 'Assigned' : statusRoll < 0.78 ? 'Available' : statusRoll < 0.92 ? 'Maintenance' : 'Retired'
  const assignee = status === 'Assigned' ? pick(spec.category === 'Phone' ? managersAndSeniors : employees) : undefined
  const assignedOnDate = assignee ? addDays(purchase, between(1, 60)) : undefined
  const isLoaner = ['Phone', 'Tablet', 'Headset', 'Accessory'].includes(spec.category)
  assets.push({
    id: `AS${String(nextAssetId++)}`,
    name: spec.name,
    category: spec.category,
    model: spec.model,
    serial: `WS-${spec.category.slice(0, 2).toUpperCase()}-${between(1000, 9999)}`,
    status,
    assignedTo: assignee?.id,
    assignedOn: assignedOnDate ? iso(assignedOnDate) : undefined,
    returnDue: assignedOnDate && isLoaner && rand() < 0.45 ? iso(addDays(assignedOnDate, between(20, 150))) : undefined,
    purchaseDate: iso(purchase),
    warrantyUntil: iso(addDays(purchase, 365 * pick([1, 2, 3]))),
    cost: round(spec.cost, 500),
    location: assignee ? assignee.location : pick(LOCATIONS),
    image: imageFor(spec.name, spec.category),
  })
}

export const assetById = (id: string) => assets.find((a) => a.id === id)

/* ───────────────────────── Employee detail (profile page) ───────────────────────── */

export interface EmployeeDetail {
  weeklyHours: { day: string; hours: number }[]
  todaySeconds: number
  onboarding: { title: string; date: string; done: boolean; icon: 'monitor' | 'zap' | 'message' | 'target' | 'link' | 'file' | 'laptop' | 'user' }[]
  onboardingPhases: { label: string; pct: number }[]
  devices: { name: string; model: string; serial: string; assignedOn: string; kind: 'laptop' | 'phone' | 'monitor' | 'headset' }[]
  pf: { month: string; employee: number; employer: number }[]
  pfBalance: number
  benefits: { name: string; detail: string }[]
  meetings: { day: number; start: number; end: number; title: string; subtitle: string; attendees: number[]; dark?: boolean }[]
  leaveBalance: { type: string; used: number; total: number }[]
  skills: string[]
  emergency: { name: string; relation: string; phone: string }
}

const SKILLS: Record<Department, string[]> = {
  Engineering: ['React', 'TypeScript', 'Node.js', 'AWS', 'PostgreSQL', 'System Design', 'Kubernetes'],
  Sales: ['Negotiation', 'Salesforce', 'Enterprise Sales', 'Pipeline Mgmt', 'Demos'],
  Marketing: ['SEO', 'Google Ads', 'Content', 'HubSpot', 'Analytics'],
  Finance: ['Tally Prime', 'GST', 'Payroll', 'Excel Modelling', 'Zoho Books'],
  'Human Resources': ['Talent Acquisition', 'Labour Law', 'Keka', 'Employee Relations'],
  Operations: ['Vendor Mgmt', 'Procurement', 'IT Asset Mgmt', 'SOPs'],
  'Customer Success': ['Onboarding', 'Zendesk', 'Renewals', 'QBRs'],
  Design: ['Figma', 'Design Systems', 'User Research', 'Prototyping', 'Motion'],
}

const CATEGORY_TO_DEVICE_KIND: Partial<Record<AssetCategory, EmployeeDetail['devices'][number]['kind']>> = {
  Laptop: 'laptop', Phone: 'phone', Monitor: 'monitor', Headset: 'headset',
}

const detailCache = new Map<string, EmployeeDetail>()

/** Deterministic per-employee detail, generated lazily from the employee id. */
export function getEmployeeDetail(e: Employee): EmployeeDetail {
  const cached = detailCache.get(e.id)
  if (cached) return cached
  const r = mulberry32(Number(e.id.slice(2)) * 7919)
  const b = (min: number, max: number) => Math.floor(min + r() * (max - min + 1))
  const p = <T,>(arr: readonly T[]) => arr[Math.floor(r() * arr.length)]

  const weeklyHours = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => ({
    day,
    hours: i >= 5 ? (i === 5 && r() < 0.3 ? Math.round((1 + r() * 2) * 10) / 10 : 0) : Math.round((6.5 + r() * 3) * 10) / 10,
  }))

  const tenureDays = (TODAY.getTime() - new Date(e.joinDate).getTime()) / 864e5
  const doneCount = tenureDays > 90 ? 8 : Math.min(8, Math.max(1, Math.floor(tenureDays / 12)))
  const join = new Date(e.joinDate)
  const titles: [string, EmployeeDetail['onboarding'][number]['icon']][] = [
    ['Offer letter signed', 'file'], ['Laptop & ID card issued', 'laptop'], ['HR induction', 'user'], ['Team introduction', 'message'],
    ['Tools & access setup', 'link'], ['Policy acknowledgement', 'zap'], ['30-day goals review', 'target'], ['Probation review', 'monitor'],
  ]
  const onboarding = titles.map(([title, icon], i) => ({ title, icon, done: i < doneCount, date: iso(addDays(join, [-7, 0, 0, 1, 2, 5, 30, 180][i])) }))
  const pct = (from: number, to: number) => Math.round((Math.max(0, Math.min(doneCount, to) - from) / (to - from)) * 100)

  const kinds: EmployeeDetail['devices'] = assets
    .filter((a) => a.assignedTo === e.id && CATEGORY_TO_DEVICE_KIND[a.category])
    .map((a) => ({ kind: CATEGORY_TO_DEVICE_KIND[a.category]!, name: a.name, model: a.model, serial: a.serial, assignedOn: a.assignedOn ?? e.joinDate }))

  const slip = computePayslip(e)
  const pf = Array.from({ length: 6 }, (_, i) => ({ month: monthLabel(i - 5), employee: slip.pf, employer: slip.employerPf }))
  const months = Math.max(1, Math.floor(tenureDays / 30))

  const hues = [b(0, 360), b(0, 360), b(0, 360)]
  const meetings: EmployeeDetail['meetings'] = [
    { day: 0, start: 9.5, end: 10.25, title: 'Weekly Team Sync', subtitle: 'Discuss progress on sprint goals', attendees: hues, dark: true },
    { day: 2, start: 11, end: 12, title: `${e.department} Review`, subtitle: 'Quarterly OKR check-in', attendees: hues.slice(0, 2) },
    { day: 3, start: 9, end: 9.75, title: '1:1 with Manager', subtitle: 'Career & feedback', attendees: hues.slice(1, 2) },
    { day: 1, start: 12, end: 13, title: 'Onboarding Session', subtitle: 'Introduction for new hires', attendees: hues.slice(0, 2) },
    { day: 4, start: 10, end: 11, title: 'Town Hall', subtitle: 'Company updates from leadership', attendees: hues, dark: true },
  ].slice(0, 3 + b(0, 2))

  const detail: EmployeeDetail = {
    weeklyHours,
    todaySeconds: b(1, 6) * 3600 + b(0, 59) * 60 + b(0, 59),
    onboarding,
    onboardingPhases: [
      { label: 'Pre-joining', pct: pct(0, 2) },
      { label: 'Week 1', pct: pct(2, 6) },
      { label: 'Probation', pct: pct(6, 8) },
    ],
    devices: kinds,
    pf,
    pfBalance: (slip.pf + slip.employerPf) * months * 1.04,
    benefits: [
      { name: 'Group Health Insurance', detail: `₹5,00,000 cover · Self + ${e.gender === 'F' ? 'spouse, 2 children' : 'spouse, parents'} · ICICI Lombard` },
      { name: 'Term Life Insurance', detail: `3× annual CTC · HDFC Life` },
      { name: 'Meal Card', detail: '₹2,200 / month · Zeta' },
      { name: 'Learning Budget', detail: '₹40,000 / year' },
      { name: 'Internet Reimbursement', detail: '₹1,500 / month' },
    ],
    meetings,
    leaveBalance: [
      { type: 'Casual', used: b(1, 8), total: 12 },
      { type: 'Sick', used: b(0, 5), total: 10 },
      { type: 'Earned', used: b(0, 10), total: 18 },
    ],
    skills: [...SKILLS[e.department]].sort(() => r() - 0.5).slice(0, 4),
    emergency: { name: `${p(FIRST)} ${e.name.split(' ')[1]}`, relation: p(['Spouse', 'Father', 'Mother', 'Sibling']), phone: `+91 ${b(70000, 99999)} ${b(10000, 99999)}` },
  }
  detailCache.set(e.id, detail)
  return detail
}
