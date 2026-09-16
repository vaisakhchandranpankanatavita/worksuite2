import { ChevronDown, ChevronRight, FolderPlus, Plus, Tag } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'
import { Badge, Button, Card, CardHeader, Field, Input, Modal, PageHeader, Segmented, Select, Table } from '../../components/ui'
import { EXPENSE_TRACK_CATEGORIES, TODAY, expenseBills as initialBills, expenseSubCategories as initialSubCategories, type ExpenseBill } from '../../data/mock'
import { fmtDate, fmtINR } from '../../lib/format'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const TABS = ['Consolidated', 'Expense Details', 'Categories'] as const

type SubCat = { name: string; category: string }

const iso = (d: Date) => d.toISOString().slice(0, 10)
const monthIdx = (d: string) => new Date(d).getMonth()
const yearOf = (d: string) => new Date(d).getFullYear()

export default function TrackExpenses() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Consolidated')
  const [categories, setCategories] = useState<string[]>([...EXPENSE_TRACK_CATEGORIES])
  const [subCategories, setSubCategories] = useState<SubCat[]>(initialSubCategories)
  const [bills, setBills] = useState<ExpenseBill[]>(initialBills)

  return (
    <div>
      <PageHeader
        title="Track Expenses"
        subtitle="Company overheads — categories, bills and the monthly consolidated view"
        actions={<Segmented value={tab} options={TABS} onChange={setTab} />}
      />

      {tab === 'Consolidated' && <Consolidated categories={categories} subCategories={subCategories} bills={bills} />}
      {tab === 'Expense Details' && <ExpenseDetails categories={categories} subCategories={subCategories} bills={bills} setBills={setBills} />}
      {tab === 'Categories' && (
        <Categories categories={categories} setCategories={setCategories} subCategories={subCategories} setSubCategories={setSubCategories} />
      )}
    </div>
  )
}

/* ─── Consolidated (monthly P&L-style matrix) ─────────────────── */
function Consolidated({ categories, subCategories, bills }: { categories: string[]; subCategories: SubCat[]; bills: ExpenseBill[] }) {
  const years = useMemo(() => {
    const s = new Set(bills.map((b) => yearOf(b.date)))
    s.add(TODAY.getFullYear())
    return Array.from(s).sort((a, b) => b - a)
  }, [bills])
  const [year, setYear] = useState(TODAY.getFullYear())
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const rows = useMemo(() => {
    return categories.map((cat) => {
      const subs = subCategories.filter((s) => s.category === cat)
      const monthly = MONTHS.map((_, mi) => bills.filter((b) => b.category === cat && monthIdx(b.date) === mi && yearOf(b.date) === year).reduce((s, b) => s + b.amount, 0))
      const subRows = subs.map((sc) => ({
        name: sc.name,
        monthly: MONTHS.map((_, mi) => bills.filter((b) => b.subCategory === sc.name && monthIdx(b.date) === mi && yearOf(b.date) === year).reduce((s, b) => s + b.amount, 0)),
      }))
      return { cat, monthly, total: monthly.reduce((a, b) => a + b, 0), subRows }
    })
  }, [categories, subCategories, bills, year])

  const grandMonthly = MONTHS.map((_, mi) => rows.reduce((s, r) => s + r.monthly[mi], 0))
  const grandTotal = grandMonthly.reduce((a, b) => a + b, 0)

  const toggle = (cat: string) => setExpanded((prev) => { const n = new Set(prev); n.has(cat) ? n.delete(cat) : n.add(cat); return n })

  return (
    <Card>
      <CardHeader
        title="Consolidated"
        subtitle="Overheads by category, month on month"
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs text-ash">Year</span>
            <Select value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </Select>
          </div>
        }
      />
      <Table className="mt-3" head={['Particulars', ...MONTHS, 'Total']}>
        {rows.map((r) => (
          <Fragment key={r.cat}>
            <tr onClick={() => toggle(r.cat)} className="cursor-pointer">
              <td className="font-bold text-ink">
                <span className="flex items-center gap-1.5">
                  {expanded.has(r.cat) ? <ChevronDown size={13} className="text-ash" /> : <ChevronRight size={13} className="text-ash" />}
                  {r.cat}
                </span>
              </td>
              {r.monthly.map((v, i) => <td key={i} className="tabular-nums text-ash">{v ? fmtINR(v) : '0'}</td>)}
              <td className="font-display font-bold tabular-nums">{fmtINR(r.total)}</td>
            </tr>
            {expanded.has(r.cat) && r.subRows.map((sr) => (
              <tr key={r.cat + sr.name} className="bg-soft/40">
                <td className="pl-6 text-ash">{sr.name}</td>
                {sr.monthly.map((v, i) => <td key={i} className="tabular-nums text-ash/80">{v ? fmtINR(v) : '0'}</td>)}
                <td className="tabular-nums font-semibold">{fmtINR(sr.monthly.reduce((a, b) => a + b, 0))}</td>
              </tr>
            ))}
          </Fragment>
        ))}
        <tr className="!border-t-2 !border-line">
          <td className="font-display font-bold">Total Overheads</td>
          {grandMonthly.map((v, i) => <td key={i} className="font-display font-bold tabular-nums">{fmtINR(v)}</td>)}
          <td className="font-display font-bold tabular-nums">{fmtINR(grandTotal)}</td>
        </tr>
      </Table>
    </Card>
  )
}

/* ─── Expense Details (bill listing) ───────────────────────────── */
function ExpenseDetails({ categories, subCategories, bills, setBills }: {
  categories: string[]; subCategories: SubCat[]; bills: ExpenseBill[]; setBills: (fn: ExpenseBill[] | ((b: ExpenseBill[]) => ExpenseBill[])) => void
}) {
  const [from, setFrom] = useState(iso(new Date(TODAY.getFullYear(), TODAY.getMonth() - 1, TODAY.getDate())))
  const [to, setTo] = useState(iso(TODAY))
  const [category, setCategory] = useState('All')
  const [subCategory, setSubCategory] = useState('All')
  const [open, setOpen] = useState(false)

  const subsForCategory = category === 'All' ? subCategories : subCategories.filter((s) => s.category === category)

  const filtered = useMemo(
    () => bills
      .filter((b) => b.date >= from && b.date <= to)
      .filter((b) => category === 'All' || b.category === category)
      .filter((b) => subCategory === 'All' || b.subCategory === subCategory)
      .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [bills, from, to, category, subCategory],
  )
  const total = filtered.reduce((s, b) => s + b.amount, 0)

  return (
    <Card>
      <CardHeader title="Expense Details" subtitle={`${filtered.length} bill${filtered.length === 1 ? '' : 's'} in range`} action={<Button onClick={() => setOpen(true)}><Plus size={15} /> New bill</Button>} />

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="From"><Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="To"><Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></Field>
        <Field label="Bill Category">
          <Select className="w-full !rounded-xl" value={category} onChange={(e) => { setCategory(e.target.value); setSubCategory('All') }}>
            <option>All</option>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Bill Sub Category">
          <Select className="w-full !rounded-xl" value={subCategory} onChange={(e) => setSubCategory(e.target.value)}>
            <option>All</option>
            {subsForCategory.map((s) => <option key={s.name}>{s.name}</option>)}
          </Select>
        </Field>
      </div>

      <Table className="mt-5" head={['Bill Date', 'Category', 'Sub Category', 'Vendor', 'Narration', 'Amount']}>
        {filtered.map((b) => (
          <tr key={b.id}>
            <td className="whitespace-nowrap text-ash">{fmtDate(b.date)}</td>
            <td><span className="whitespace-nowrap rounded-full bg-soft px-2.5 py-1 text-xs">{b.category}</span></td>
            <td className="whitespace-nowrap">{b.subCategory}</td>
            <td className="whitespace-nowrap">{b.vendor}</td>
            <td className="max-w-[280px] truncate text-ash">{b.narration}</td>
            <td className="font-display tabular-nums">{fmtINR(b.amount)}</td>
          </tr>
        ))}
        {filtered.length > 0 && (
          <tr className="!border-t-2 !border-line">
            <td colSpan={5} className="text-right font-display font-bold">Total</td>
            <td className="font-display font-bold tabular-nums">{fmtINR(total)}</td>
          </tr>
        )}
      </Table>
      {filtered.length === 0 && <p className="py-10 text-center text-sm text-ash">No bills in this range.</p>}

      <NewBill open={open} onClose={() => setOpen(false)} categories={categories} subCategories={subCategories} onSave={(v) => { setBills((prev) => [{ ...v, id: `BILL-${5000 + prev.length}` }, ...prev]); setOpen(false) }} />
    </Card>
  )
}

function NewBill({ open, onClose, categories, subCategories, onSave }: {
  open: boolean; onClose: () => void; categories: string[]; subCategories: SubCat[]; onSave: (v: Omit<ExpenseBill, 'id'>) => void
}) {
  const [f, setF] = useState({ date: iso(TODAY), category: categories[0] ?? '', subCategory: '', vendor: '', narration: '', amount: '' })
  const subs = subCategories.filter((s) => s.category === f.category)

  return (
    <Modal open={open} onClose={onClose} title="New expense bill">
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          onSave({ date: f.date, category: f.category as ExpenseBill['category'], subCategory: f.subCategory, vendor: f.vendor, narration: f.narration, amount: Number(f.amount) })
          setF({ date: iso(TODAY), category: categories[0] ?? '', subCategory: '', vendor: '', narration: '', amount: '' })
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Bill Date"><Input required type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Field label="Amount (₹)"><Input required type="number" min={1} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <Select className="w-full !rounded-xl" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value, subCategory: '' })}>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Sub Category">
            <Select required className="w-full !rounded-xl" value={f.subCategory} onChange={(e) => setF({ ...f, subCategory: e.target.value })}>
              <option value="" disabled>Select…</option>
              {subs.map((s) => <option key={s.name}>{s.name}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Vendor"><Input required value={f.vendor} onChange={(e) => setF({ ...f, vendor: e.target.value })} placeholder="e.g. Oman Oil" /></Field>
        <Field label="Narration"><Input required value={f.narration} onChange={(e) => setF({ ...f, narration: e.target.value })} placeholder="e.g. Fuel charges for the month" /></Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save bill</Button>
        </div>
      </form>
    </Modal>
  )
}

/* ─── Categories & Sub Categories ──────────────────────────────── */
function Categories({ categories, setCategories, subCategories, setSubCategories }: {
  categories: string[]; setCategories: (fn: string[] | ((c: string[]) => string[])) => void
  subCategories: SubCat[]; setSubCategories: (fn: SubCat[] | ((s: SubCat[]) => SubCat[])) => void
}) {
  const [view, setView] = useState<'Category' | 'Sub Category'>('Category')
  const [openCat, setOpenCat] = useState(false)
  const [openSub, setOpenSub] = useState(false)

  return (
    <Card>
      <CardHeader
        title={view === 'Category' ? 'Expense Category List' : 'Expense Sub Category List'}
        action={
          <div className="flex items-center gap-2">
            <Segmented value={view} options={['Category', 'Sub Category'] as const} onChange={setView} />
            {view === 'Category'
              ? <Button size="sm" onClick={() => setOpenCat(true)}><FolderPlus size={14} /> Add category</Button>
              : <Button size="sm" onClick={() => setOpenSub(true)}><Tag size={14} /> Add sub category</Button>}
          </div>
        }
      />

      {view === 'Category' ? (
        <Table className="mt-3" head={['No', 'Category Name', 'Sub Categories']}>
          {categories.map((c, i) => (
            <tr key={c}>
              <td className="text-ash">{i + 1}</td>
              <td className="font-semibold">{c}</td>
              <td className="text-ash">{subCategories.filter((s) => s.category === c).length}</td>
            </tr>
          ))}
        </Table>
      ) : (
        <Table className="mt-3" head={['No', 'Name', 'Category']}>
          {subCategories.map((s, i) => (
            <tr key={s.name}>
              <td className="text-ash">{i + 1}</td>
              <td className="font-semibold">{s.name}</td>
              <td><Badge tone="gray">{s.category}</Badge></td>
            </tr>
          ))}
        </Table>
      )}

      <Modal open={openCat} onClose={() => setOpenCat(false)} title="Add expense category">
        <AddCategoryForm onClose={() => setOpenCat(false)} onSave={(name) => { setCategories((prev) => (prev.includes(name) ? prev : [...prev, name])); setOpenCat(false) }} />
      </Modal>
      <Modal open={openSub} onClose={() => setOpenSub(false)} title="Add expense sub category">
        <AddSubCategoryForm categories={categories} onClose={() => setOpenSub(false)} onSave={(v) => { setSubCategories((prev) => [...prev, v]); setOpenSub(false) }} />
      </Modal>
    </Card>
  )
}

function AddCategoryForm({ onClose, onSave }: { onClose: () => void; onSave: (name: string) => void }) {
  const [name, setName] = useState('')
  return (
    <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSave(name.trim()) }}>
      <Field label="Category Name"><Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Utilities" /></Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit">Save category</Button>
      </div>
    </form>
  )
}

function AddSubCategoryForm({ categories, onClose, onSave }: { categories: string[]; onClose: () => void; onSave: (v: SubCat) => void }) {
  const [f, setF] = useState({ name: '', category: categories[0] ?? '' })
  return (
    <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); if (f.name.trim()) onSave({ name: f.name.trim(), category: f.category }) }}>
      <Field label="Name"><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Electricity" /></Field>
      <Field label="Category">
        <Select className="w-full !rounded-xl" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </Select>
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit">Save sub category</Button>
      </div>
    </form>
  )
}
