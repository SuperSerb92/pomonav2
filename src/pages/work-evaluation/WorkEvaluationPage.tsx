import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays, FileDown, Save, Trash2, ClipboardCheck } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { toast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import { exportWorkEvaluationPdf } from '@/lib/pdfExport'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EvalRow {
  key: string            // employee_id — unique per date
  evalId: string | null  // null = not yet saved to work_evaluations
  employeeId: string
  employeeName: string
  neto: number           // summed from barcodes, read-only
  noOfBoxes: number      // counted from barcodes, read-only
  // Editable (strings so inputs are controlled without NaN)
  payPerDay: string
  expenseKg: string
  fuel: string
  bonus: string
  evaluation: string     // '1' | '2' | '3' | ''
  notes: string
  // Derived
  total: number
  saving: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcTotal(neto: number, payPerDay: string, expenseKg: string, fuel: string, bonus: string): number {
  const pay = parseFloat(payPerDay) || 0
  const exp = parseFloat(expenseKg) || 0
  const f   = parseFloat(fuel)      || 0
  const b   = parseFloat(bonus)     || 0
  if (pay > 0 && exp === 0) return pay + f + b
  if (exp > 0 && pay === 0) return Math.round(neto * exp) + f + b
  return 0
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}


// ─── Component ────────────────────────────────────────────────────────────────

export default function WorkEvaluationPage() {
  const { user } = useAuth()
  const { profile } = useProfile()

  const [selectedDate, setSelectedDate] = useState(() => toDateStr(new Date()))
  const [rows, setRows] = useState<EvalRow[]>([])
  const [loading, setLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<EvalRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ── Load for selected date ──────────────────────────────────────────────────
  const loadForDate = useCallback(async (date: string) => {
    if (!user) return
    setLoading(true)
    setRows([])

    const nextDay = toDateStr(new Date(new Date(date).getTime() + 86_400_000))

    const [barcodesRes, evalsRes] = await Promise.all([
      supabase
        .from('barcodes')
        .select('employee_id, neto, employee:employees(id, name, surname)')
        .eq('user_id', user.id)
        .eq('is_storno', false)
        .gte('created_at', `${date}T00:00:00`)
        .lt('created_at', `${nextDay}T00:00:00`)
        .not('neto', 'is', null),
      supabase
        .from('work_evaluations')
        .select('*, employee:employees(id, name, surname)')
        .eq('user_id', user.id)
        .eq('eval_date', date),
    ])

    if (barcodesRes.error) { toast({ title: 'Error loading barcodes', description: barcodesRes.error.message, variant: 'destructive' }); setLoading(false); return }
    if (evalsRes.error)    { toast({ title: 'Error loading evaluations', description: evalsRes.error.message, variant: 'destructive' }); setLoading(false); return }

    // Aggregate barcodes by employee
    const byEmp: Record<string, { neto: number; count: number; employee: any }> = {}
    for (const bc of barcodesRes.data ?? []) {
      const id = bc.employee_id as string
      if (!id) continue
      if (!byEmp[id]) byEmp[id] = { neto: 0, count: 0, employee: bc.employee }
      byEmp[id].neto  += (bc.neto as number) ?? 0
      byEmp[id].count += 1
    }

    // Index existing evaluations by employee
    const evalByEmp: Record<string, any> = {}
    for (const ev of evalsRes.data ?? []) evalByEmp[ev.employee_id] = ev

    const newRows: EvalRow[] = []

    // Rows from barcodes (auto-filled)
    for (const [empId, bc] of Object.entries(byEmp)) {
      const ev  = evalByEmp[empId]
      const emp = bc.employee as any
      const payPerDay  = ev?.pay_per_day?.toString()  ?? ''
      const expenseKg  = ev?.expense_kg?.toString()   ?? ''
      const fuel       = ev?.fuel?.toString()         ?? ''
      const bonus      = ev?.bonus?.toString()        ?? ''
      const neto       = Math.round(bc.neto * 1000) / 1000
      newRows.push({
        key: empId,
        evalId:       ev?.id ?? null,
        employeeId:   empId,
        employeeName: emp ? `${emp.surname} ${emp.name}` : '—',
        neto,
        noOfBoxes:    bc.count,
        payPerDay,
        expenseKg,
        fuel,
        bonus,
        evaluation:   ev?.evaluation?.toString() ?? '',
        notes:        ev?.notes ?? '',
        total:        ev?.total ?? calcTotal(neto, payPerDay, expenseKg, fuel, bonus),
        saving:       false,
      })
      delete evalByEmp[empId]
    }

    // Evaluations that exist but have no barcodes for this date (edge case)
    for (const ev of Object.values(evalByEmp)) {
      const emp        = ev.employee as any
      const payPerDay  = ev.pay_per_day?.toString()  ?? ''
      const expenseKg  = ev.expense_kg?.toString()   ?? ''
      const fuel       = ev.fuel?.toString()         ?? ''
      const bonus      = ev.bonus?.toString()        ?? ''
      const neto       = ev.neto ?? 0
      newRows.push({
        key:          ev.id,
        evalId:       ev.id,
        employeeId:   ev.employee_id,
        employeeName: emp ? `${emp.surname} ${emp.name}` : '—',
        neto,
        noOfBoxes:    ev.no_of_boxes ?? 0,
        payPerDay,
        expenseKg,
        fuel,
        bonus,
        evaluation:   ev.evaluation?.toString() ?? '',
        notes:        ev.notes ?? '',
        total:        ev.total ?? calcTotal(neto, payPerDay, expenseKg, fuel, bonus),
        saving:       false,
      })
    }

    // Sort by employee name
    newRows.sort((a, b) => a.employeeName.localeCompare(b.employeeName))
    setRows(newRows)
    setLoading(false)
  }, [user])

  useEffect(() => { loadForDate(selectedDate) }, [selectedDate, loadForDate])

  // ── Row helpers ─────────────────────────────────────────────────────────────

  function updateRow(key: string, changes: Partial<EvalRow>) {
    setRows(prev => prev.map(r => {
      if (r.key !== key) return r
      const updated = { ...r, ...changes }
      updated.total = calcTotal(updated.neto, updated.payPerDay, updated.expenseKg, updated.fuel, updated.bonus)
      return updated
    }))
  }

  async function saveRow(row: EvalRow) {
    const total = calcTotal(row.neto, row.payPerDay, row.expenseKg, row.fuel, row.bonus)
    const payload = {
      user_id:      user!.id,
      employee_id:  row.employeeId,
      eval_date:    selectedDate,
      neto:         row.neto,
      no_of_boxes:  row.noOfBoxes,
      pay_per_day:  parseFloat(row.payPerDay)  || null,
      expense_kg:   parseFloat(row.expenseKg)  || null,
      fuel:         parseFloat(row.fuel)        || null,
      bonus:        parseFloat(row.bonus)       || null,
      total,
      evaluation:   row.evaluation ? (parseInt(row.evaluation) as 1 | 2 | 3) : null,
      notes:        row.notes || null,
    }
    updateRow(row.key, { saving: true })
    try {
      if (row.evalId) {
        const { error } = await supabase.from('work_evaluations').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', row.evalId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('work_evaluations').insert(payload).select('id').single()
        if (error) throw error
        updateRow(row.key, { evalId: (data as any).id })
      }
      updateRow(row.key, { saving: false, total })
      toast({ title: 'Saved' })
    } catch (e: any) {
      updateRow(row.key, { saving: false })
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' })
    }
  }

  async function deleteRow(row: EvalRow) {
    if (!row.evalId) { setRows(prev => prev.filter(r => r.key !== row.key)); return }
    setDeleting(true)
    const { error } = await supabase.from('work_evaluations').delete().eq('id', row.evalId)
    setDeleting(false)
    if (error) { toast({ title: 'Delete failed', description: error.message, variant: 'destructive' }); return }
    setRows(prev => prev.filter(r => r.key !== row.key))
    setDeleteTarget(null)
    toast({ title: 'Deleted' })
  }

  // ── Date navigation ─────────────────────────────────────────────────────────
  function changeDate(days: number) {
    setSelectedDate(prev => toDateStr(new Date(new Date(prev).getTime() + days * 86_400_000)))
  }

  // ── Export PDF ──────────────────────────────────────────────────────────────
  function handleExport() {
    exportWorkEvaluationPdf(rows, selectedDate, profile?.farm_name ?? 'Pomona')
  }

  // ── Totals ──────────────────────────────────────────────────────────────────
  const totalNeto  = rows.reduce((s, r) => s + r.neto, 0)
  const totalBoxes = rows.reduce((s, r) => s + r.noOfBoxes, 0)
  const totalSum   = rows.reduce((s, r) => s + r.total, 0)

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <PageContainer>
      <PageHeader title="Work Evaluation" description="Track daily employee work performance" />

      {/* Date navigation + Print */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Button variant="outline" size="icon" onClick={() => changeDate(-1)} title="Previous day">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="relative">
          <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="pl-9 w-40"
          />
        </div>
        <Button variant="outline" size="icon" onClick={() => changeDate(1)} title="Next day">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setSelectedDate(toDateStr(new Date()))}>
          Today
        </Button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={handleExport} disabled={rows.length === 0}>
          <FileDown className="h-4 w-4 mr-2" />Export PDF
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <ClipboardCheck className="h-10 w-10 opacity-30" />
          <p className="text-sm">No barcodes with weights found for this date.</p>
          <p className="text-xs">Weigh barcodes in the Barcode Reader tab to auto-fill this table.</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">#</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Employee</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Neto (kg)</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Boxes</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pay/Day</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Exp/kg</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fuel</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bonus</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total (RSD)</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rating</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</th>
                <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <EvalRowComponent
                  key={row.key}
                  index={i + 1}
                  row={row}
                  onChange={(changes) => updateRow(row.key, changes)}
                  onSave={() => saveRow(row)}
                  onDelete={() => setDeleteTarget(row)}
                />
              ))}
            </tbody>
            {/* Summary */}
            <tfoot className="border-t bg-muted/40">
              <tr>
                <td colSpan={2} className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                  {rows.length} worker{rows.length !== 1 ? 's' : ''}
                </td>
                <td className="px-3 py-2 text-right text-sm font-semibold">{totalNeto.toFixed(3)}</td>
                <td className="px-3 py-2 text-right text-sm font-semibold">{totalBoxes}</td>
                <td colSpan={4} />
                <td className="px-3 py-2 text-right text-sm font-semibold">{totalSum.toLocaleString()} RSD</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteRow(deleteTarget)}
        title="Delete evaluation"
        description="This will remove this employee's evaluation for this date."
        loading={deleting}
      />
    </PageContainer>
  )
}

// ─── Inline row component ─────────────────────────────────────────────────────

interface EvalRowProps {
  index: number
  row: EvalRow
  onChange: (changes: Partial<EvalRow>) => void
  onSave: () => void
  onDelete: () => void
}

function EvalRowComponent({ index, row, onChange, onSave, onDelete }: EvalRowProps) {
  const inputCls = 'h-7 w-24 text-sm text-right tabular-nums px-2'

  return (
    <tr className={cn('border-b last:border-0 hover:bg-muted/20 transition-colors', row.saving && 'opacity-60')}>
      <td className="px-3 py-1.5 text-muted-foreground text-xs">{index}</td>
      <td className="px-3 py-1.5 font-medium whitespace-nowrap">{row.employeeName}</td>
      <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{row.neto.toFixed(3)}</td>
      <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">{row.noOfBoxes}</td>

      {/* Editable: Pay/Day */}
      <td className="px-1.5 py-1">
        <Input
          value={row.payPerDay}
          onChange={(e) => onChange({ payPerDay: e.target.value, expenseKg: e.target.value ? '' : row.expenseKg })}
          placeholder="0"
          type="number"
          min="0"
          className={inputCls}
          disabled={!!row.expenseKg && !row.payPerDay}
          title="Daily pay (RSD) — cannot combine with Exp/kg"
        />
      </td>

      {/* Editable: Expense/kg */}
      <td className="px-1.5 py-1">
        <Input
          value={row.expenseKg}
          onChange={(e) => onChange({ expenseKg: e.target.value, payPerDay: e.target.value ? '' : row.payPerDay })}
          placeholder="0"
          type="number"
          min="0"
          step="0.0001"
          className={inputCls}
          disabled={!!row.payPerDay && !row.expenseKg}
          title="Expense per kg (RSD) — cannot combine with Pay/Day"
        />
      </td>

      {/* Editable: Fuel */}
      <td className="px-1.5 py-1">
        <Input value={row.fuel} onChange={(e) => onChange({ fuel: e.target.value })} placeholder="0" type="number" min="0" className={inputCls} />
      </td>

      {/* Editable: Bonus */}
      <td className="px-1.5 py-1">
        <Input value={row.bonus} onChange={(e) => onChange({ bonus: e.target.value })} placeholder="0" type="number" min="0" className={inputCls} />
      </td>

      {/* Total — calculated */}
      <td className="px-3 py-1.5 text-right tabular-nums font-medium">
        {row.total > 0 ? row.total.toLocaleString() : <span className="text-muted-foreground">—</span>}
      </td>

      {/* Rating */}
      <td className="px-1.5 py-1">
        <Select value={row.evaluation} onValueChange={(v) => onChange({ evaluation: v })}>
          <SelectTrigger className="h-7 w-20 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">★</SelectItem>
            <SelectItem value="2">★★</SelectItem>
            <SelectItem value="3">★★★</SelectItem>
          </SelectContent>
        </Select>
      </td>

      {/* Notes */}
      <td className="px-1.5 py-1">
        <Input value={row.notes} onChange={(e) => onChange({ notes: e.target.value })} placeholder="Notes…" className="h-7 min-w-28 text-sm" />
      </td>

      {/* Actions */}
      <td className="px-1.5 py-1">
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7 text-pomona-green" onClick={onSave} disabled={row.saving} title="Save">
            <Save className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onDelete} disabled={row.saving} title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  )
}
