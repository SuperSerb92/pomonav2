import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { MoreHorizontal, Pencil, Trash2, ClipboardCheck, Star } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useWorkEvaluations } from '@/hooks/useWorkEvaluations'
import { useEmployees } from '@/hooks/useEmployees'
import { formatDate, formatCurrency, formatWeight } from '@/lib/formatters'
import type { WorkEvaluation } from '@/types/app.types'

const schema = z.object({
  employee_id: z.string().min(1, 'Select an employee'),
  eval_date: z.string().min(1, 'Required'),
  neto: z.coerce.number().optional().nullable(),
  no_of_boxes: z.coerce.number().int().optional().nullable(),
  evaluation: z.coerce.number().min(1).max(3).optional().nullable(),
  pay_per_day: z.coerce.number().optional().nullable(),
  expense_kg: z.coerce.number().optional().nullable(),
  total: z.coerce.number().optional().nullable(),
  fuel: z.coerce.number().optional().nullable(),
  bonus: z.coerce.number().optional().nullable(),
  notes: z.string().optional().nullable(),
})
type FormData = z.infer<typeof schema>

function StarRating({ value }: { value: number | null }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3].map((s) => (
        <Star key={s} className={`h-3.5 w-3.5 ${s <= (value ?? 0) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
      ))}
    </div>
  )
}

export default function WorkEvaluationPage() {
  const { evaluations, isLoading, create, update, remove } = useWorkEvaluations()
  const { employees } = useEmployees()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<WorkEvaluation | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  const openAdd = () => { setEditing(null); reset({ eval_date: new Date().toISOString().split('T')[0] }); setDialogOpen(true) }
  const openEdit = (e: WorkEvaluation) => { setEditing(e); reset(e as FormData); setDialogOpen(true) }

  const onSubmit = async (data: FormData) => {
    const n = <T,>(v: T | null | undefined): T | null => v ?? null
    const input = {
      employee_id: data.employee_id,
      eval_date: data.eval_date,
      neto: n(data.neto),
      no_of_boxes: n(data.no_of_boxes),
      evaluation: n(data.evaluation) as 1 | 2 | 3 | null,
      pay_per_day: n(data.pay_per_day),
      expense_kg: n(data.expense_kg),
      total: n(data.total),
      fuel: n(data.fuel),
      bonus: n(data.bonus),
      notes: n(data.notes),
    }
    if (editing) await update.mutateAsync({ id: editing.id, ...input })
    else await create.mutateAsync(input)
    setDialogOpen(false)
  }

  const columns: ColumnDef<WorkEvaluation>[] = [
    { accessorKey: 'eval_date', header: 'Date', cell: ({ getValue }) => formatDate(getValue() as string) },
    { id: 'employee', header: 'Employee', cell: ({ row }) => row.original.employee ? `${row.original.employee.surname} ${row.original.employee.name}` : '—' },
    { accessorKey: 'neto', header: 'Neto (kg)', cell: ({ getValue }) => getValue() != null ? formatWeight(getValue() as number) : '—' },
    { accessorKey: 'no_of_boxes', header: 'Boxes', cell: ({ getValue }) => getValue() ?? '—' },
    { accessorKey: 'evaluation', header: 'Rating', cell: ({ getValue }) => <StarRating value={getValue() as number | null} /> },
    { accessorKey: 'total', header: 'Total', cell: ({ getValue }) => getValue() != null ? formatCurrency(getValue() as number) : '—' },
    {
      id: 'actions', size: 60,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(row.original)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(row.original.id)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader title="Work Evaluation" description="Track daily employee work performance" onAdd={openAdd} addLabel="Add evaluation" />
      {!isLoading && evaluations.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="No evaluations yet" description="Track your workers' daily harvest performance." onAdd={openAdd} addLabel="Add evaluation" />
      ) : (
        <DataTable columns={columns} data={evaluations} isLoading={isLoading} searchColumn="eval_date" />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit evaluation' : 'Add evaluation'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit as never)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Employee *</Label>
                <Select value={watch('employee_id')} onValueChange={(v) => setValue('employee_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.surname} {e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.employee_id && <p className="text-xs text-destructive">{errors.employee_id.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input {...register('eval_date')} type="date" />
              </div>
              <div className="space-y-1.5"><Label>Neto (kg)</Label><Input {...register('neto')} type="number" step="0.001" /></div>
              <div className="space-y-1.5"><Label>Boxes</Label><Input {...register('no_of_boxes')} type="number" /></div>
              <div className="space-y-1.5">
                <Label>Rating (1–3)</Label>
                <Select value={watch('evaluation')?.toString()} onValueChange={(v) => setValue('evaluation', Number(v) as 1|2|3)}>
                  <SelectTrigger><SelectValue placeholder="Rate…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 ★</SelectItem>
                    <SelectItem value="2">2 ★★</SelectItem>
                    <SelectItem value="3">3 ★★★</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Pay per day (RSD)</Label><Input {...register('pay_per_day')} type="number" step="0.01" /></div>
              <div className="space-y-1.5"><Label>Expense/kg (RSD)</Label><Input {...register('expense_kg')} type="number" step="0.0001" /></div>
              <div className="space-y-1.5"><Label>Total (RSD)</Label><Input {...register('total')} type="number" step="0.01" /></div>
              <div className="space-y-1.5"><Label>Fuel (RSD)</Label><Input {...register('fuel')} type="number" step="0.01" /></div>
              <div className="space-y-1.5"><Label>Bonus (RSD)</Label><Input {...register('bonus')} type="number" step="0.01" /></div>
              <div className="col-span-2 space-y-1.5"><Label>Notes</Label><Input {...register('notes')} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-pomona-green hover:bg-pomona-green/90" disabled={create.isPending || update.isPending}>
                {editing ? 'Save' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={() => { remove.mutate(deleteTarget!); setDeleteTarget(null) }}
        title="Delete evaluation" loading={remove.isPending} />
    </PageContainer>
  )
}
