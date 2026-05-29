import { useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
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

const nullable = <T extends z.ZodTypeAny>(s: T) => s.nullish().transform((v) => v ?? null)

const schema = z.object({
  employee_id: z.string().min(1, 'Select an employee'),
  eval_date: z.string().min(1, 'Required'),
  neto: nullable(z.coerce.number()),
  no_of_boxes: nullable(z.coerce.number().int()),
  evaluation: nullable(z.coerce.number().min(1).max(3)),
  pay_per_day: nullable(z.coerce.number()),
  expense_kg: nullable(z.coerce.number()),
  total: nullable(z.coerce.number()),
  fuel: nullable(z.coerce.number()),
  bonus: nullable(z.coerce.number()),
  notes: nullable(z.string()),
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

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    if (editing) await update.mutateAsync({ id: editing.id, ...data })
    else await create.mutateAsync(data)
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
