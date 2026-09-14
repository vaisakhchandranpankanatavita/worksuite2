import clsx from 'clsx'
import { Download, Plus, Printer, Search, Send, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge, Button, Card, Field, Input, Modal, PageHeader, Segmented, Select, Table } from '../../components/ui'
import { CountUp } from '../../components/CountUp'
import { exportCsv } from '../hr/Employees'
import { COMPANY, TODAY, buildInvoice, clients, type Invoice, type InvoiceLine, type InvoiceStatus } from '../../data/mock'
import { fmtCompact, fmtDate, fmtINR } from '../../lib/format'
import { useApp } from '../../store'

const TABS = ['All', 'Paid', 'Pending', 'Overdue', 'Draft'] as const

export default function Invoices() {
  const { invoices, setInvoiceStatus, addInvoice } = useApp()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<(typeof TABS)[number]>('All')
  const [q, setQ] = useState('')

  const list = useMemo(() => invoices.filter((i) => (tab === 'All' || i.status === tab) && `${i.id} ${i.client.name}`.toLowerCase().includes(q.toLowerCase())), [invoices, tab, q])
  const sum = (s: InvoiceStatus) => invoices.filter((i) => i.status === s).reduce((t, i) => t + i.total, 0)
  const openId = params.get('open')
  const open = invoices.find((i) => i.id === openId) ?? null

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle="Accounts receivable · GST-compliant invoicing"
        actions={
          <>
            <Button variant="light" onClick={() => exportCsv('invoices.csv', [['Invoice', 'Client', 'GSTIN', 'Issued', 'Due', 'Subtotal', 'GST', 'Total', 'Status'], ...list.map((i) => [i.id, i.client.name, i.client.gstin, i.issueDate, i.dueDate, i.subtotal, i.gst, i.total, i.status])])}>
              <Download size={16} /> Export
            </Button>
            <Button onClick={() => setParams({ new: '1' })}><Plus size={16} /> New invoice</Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {([['Collected', 'Paid', 'bg-ink text-white'], ['Outstanding', 'Pending', 'bg-lime'], ['Overdue', 'Overdue', 'card'], ['Drafts', 'Draft', 'card']] as const).map(([label, s, cls], i) => (
          <button key={s} onClick={() => setTab(s)} className={clsx('animate-in rounded-[22px] p-4 text-left', cls)}>
            <p className={clsx('text-xs', i === 0 ? 'text-white/60' : 'text-ash')}>{label}</p>
            <p className={clsx('mt-1 font-display text-2xl font-light', s === 'Overdue' && 'text-rose-deep')}><CountUp value={fmtCompact(sum(s))} /></p>
            <p className={clsx('text-[11px]', i === 0 ? 'text-white/50' : 'text-ash')}>{invoices.filter((x) => x.status === s).length} invoices</p>
          </button>
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented value={tab} options={TABS} onChange={setTab} />
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ash" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search invoice or client" className="h-10 w-56 rounded-full border border-line bg-white pl-9 pr-3 text-sm outline-none focus:border-ink" />
          </div>
        </div>
        <Table className="mt-3" head={['Invoice', 'Client', 'Issued', 'Due', 'Amount (incl. GST)', 'Status', '']}>
          {list.map((i) => (
            <tr key={i.id} className="cursor-pointer hover:bg-soft/60" onClick={() => setParams({ open: i.id })}>
              <td className="font-bold">{i.id}</td>
              <td>
                <p>{i.client.name}</p>
                <p className="text-xs text-ash">{i.client.city}</p>
              </td>
              <td className="whitespace-nowrap text-ash">{fmtDate(i.issueDate)}</td>
              <td className={clsx('whitespace-nowrap', i.status === 'Overdue' ? 'text-rose-deep' : 'text-ash')}>{fmtDate(i.dueDate)}</td>
              <td className="font-display">{fmtINR(i.total)}</td>
              <td><Badge>{i.status}</Badge></td>
              <td onClick={(e) => e.stopPropagation()}>
                {(i.status === 'Pending' || i.status === 'Overdue') && <Button size="sm" variant="light" onClick={() => setInvoiceStatus(i.id, 'Paid')}>Mark paid</Button>}
                {i.status === 'Draft' && <Button size="sm" onClick={() => setInvoiceStatus(i.id, 'Pending')}><Send size={12} /> Send</Button>}
              </td>
            </tr>
          ))}
        </Table>
        {list.length === 0 && <p className="py-10 text-center text-sm text-ash">No invoices found.</p>}
      </Card>

      {open && <InvoicePreview invoice={open} onClose={() => setParams({})} onPaid={() => setInvoiceStatus(open.id, 'Paid')} />}
      <NewInvoice
        open={params.get('new') === '1'}
        nextId={`INV-2026-${String(181 + invoices.length - 42).padStart(4, '0')}`}
        onClose={() => setParams({})}
        onSave={(inv) => { addInvoice(inv); setParams({ open: inv.id }) }}
      />
    </div>
  )
}

function InvoicePreview({ invoice: i, onClose, onPaid }: { invoice: Invoice; onClose: () => void; onPaid: () => void }) {
  const intra = i.client.gstin.slice(0, 2) === COMPANY.gstin.slice(0, 2)
  return (
    <Modal open onClose={onClose} title={i.id} width={720}>
      <div className="print-area rounded-2xl border border-line bg-white p-6 text-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-display text-2xl">Tax Invoice</p>
            <p className="mt-1 text-xs text-ash">{i.id}</p>
          </div>
          <div className="text-right text-xs">
            <p className="font-display text-sm">{COMPANY.name}</p>
            <p className="max-w-[260px] text-ash">{COMPANY.address}</p>
            <p className="text-ash">GSTIN {COMPANY.gstin}</p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 rounded-2xl bg-soft p-4 text-xs sm:grid-cols-3">
          <div><p className="text-ash">Billed to</p><p className="mt-1 font-bold">{i.client.name}</p><p className="text-ash">{i.client.city} · GSTIN {i.client.gstin}</p></div>
          <div><p className="text-ash">Issue date</p><p className="mt-1 font-bold">{fmtDate(i.issueDate)}</p></div>
          <div><p className="text-ash">Due date</p><p className="mt-1 font-bold">{fmtDate(i.dueDate)}</p><Badge className="mt-1">{i.status}</Badge></div>
        </div>
        <table className="mt-5 w-full text-left">
          <thead><tr className="border-b border-line text-xs text-ash"><th className="py-2">Description</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Rate</th><th className="py-2 text-right">Amount</th></tr></thead>
          <tbody>
            {i.lines.map((l, k) => (
              <tr key={k} className="border-b border-line/60"><td className="py-2.5">{l.description}<span className="block text-[11px] text-ash">SAC 998314</span></td><td className="text-right">{l.qty}</td><td className="text-right">{fmtINR(l.rate)}</td><td className="text-right">{fmtINR(l.qty * l.rate)}</td></tr>
            ))}
          </tbody>
        </table>
        <div className="ml-auto mt-4 max-w-[280px] space-y-1.5">
          <div className="flex justify-between"><span className="text-ash">Subtotal</span><span>{fmtINR(i.subtotal)}</span></div>
          {intra ? (
            <>
              <div className="flex justify-between"><span className="text-ash">CGST 9%</span><span>{fmtINR(i.gst / 2)}</span></div>
              <div className="flex justify-between"><span className="text-ash">SGST 9%</span><span>{fmtINR(i.gst / 2)}</span></div>
            </>
          ) : (
            <div className="flex justify-between"><span className="text-ash">IGST 18%</span><span>{fmtINR(i.gst)}</span></div>
          )}
          <div className="flex justify-between rounded-xl bg-lime px-3 py-2 font-display"><span>Total</span><span>{fmtINR(i.total)}</span></div>
        </div>
        <p className="mt-6 text-[11px] text-ash">Bank: HDFC Bank · A/c 50200012344821 · IFSC HDFC0001234 · UPI worksuite@hdfcbank</p>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="light" onClick={() => window.print()}><Printer size={16} /> Print / PDF</Button>
        {i.status !== 'Paid' && i.status !== 'Draft' && <Button onClick={onPaid}>Mark as paid</Button>}
      </div>
    </Modal>
  )
}

function NewInvoice({ open, onClose, onSave, nextId }: { open: boolean; onClose: () => void; onSave: (i: Invoice) => void; nextId: string }) {
  const [clientIdx, setClientIdx] = useState(0)
  const [due, setDue] = useState(30)
  const [lines, setLines] = useState<InvoiceLine[]>([{ description: 'Platform subscription — Enterprise', qty: 1, rate: 150000 }])
  const subtotal = lines.reduce((s, l) => s + l.qty * l.rate, 0)
  const setLine = (k: number, patch: Partial<InvoiceLine>) => setLines(lines.map((l, i) => (i === k ? { ...l, ...patch } : l)))

  return (
    <Modal open={open} onClose={onClose} title="New invoice" width={720}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const issue = TODAY.toISOString().slice(0, 10)
          const dueDate = new Date(TODAY)
          dueDate.setDate(dueDate.getDate() + due)
          onSave(buildInvoice({ id: nextId, client: clients[clientIdx], issueDate: issue, dueDate: dueDate.toISOString().slice(0, 10), lines, status: 'Pending' }))
        }}
        className="space-y-4"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Client">
            <Select className="w-full !rounded-xl" value={clientIdx} onChange={(e) => setClientIdx(Number(e.target.value))}>
              {clients.map((c, i) => <option key={c.name} value={i}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Invoice no."><Input value={nextId} readOnly /></Field>
          <Field label="Payment terms">
            <Select className="w-full !rounded-xl" value={due} onChange={(e) => setDue(Number(e.target.value))}>
              {[15, 30, 45, 60].map((d) => <option key={d} value={d}>Net {d}</option>)}
            </Select>
          </Field>
        </div>
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_70px_120px_36px] gap-2 text-xs font-bold text-ash"><span>Item</span><span>Qty</span><span>Rate (₹)</span><span /></div>
          {lines.map((l, k) => (
            <div key={k} className="grid grid-cols-[1fr_70px_120px_36px] gap-2">
              <Input required value={l.description} onChange={(e) => setLine(k, { description: e.target.value })} />
              <Input type="number" min={1} value={l.qty} onChange={(e) => setLine(k, { qty: Number(e.target.value) })} />
              <Input type="number" min={0} value={l.rate} onChange={(e) => setLine(k, { rate: Number(e.target.value) })} />
              <button type="button" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, i) => i !== k))} className="grid place-items-center rounded-xl text-ash hover:bg-rose/40 disabled:opacity-30"><Trash2 size={15} /></button>
            </div>
          ))}
          <Button type="button" size="sm" variant="ghost" onClick={() => setLines([...lines, { description: '', qty: 1, rate: 0 }])}><Plus size={14} /> Add line</Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-soft p-4">
          <div className="text-sm">
            <p>Subtotal <b>{fmtINR(subtotal)}</b> · GST 18% <b>{fmtINR(subtotal * 0.18)}</b></p>
            <p className="font-display text-xl">Total {fmtINR(subtotal * 1.18)}</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit"><Send size={14} /> Create & send</Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
