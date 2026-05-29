import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { MoreHorizontal, Pencil, Trash2, Layers } from 'lucide-react'
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
import { useCultureTypes } from '@/hooks/useCultureTypes'
import { useCultures } from '@/hooks/useCultures'
import type { CultureType } from '@/types/app.types'

const schema = z.object({
  culture_id: z.string().min(1, 'Select a culture'),
  culture_type_name: z.string().min(1, 'Required'),
})
type FormData = z.infer<typeof schema>

export default function CultureTypesPage() {
  const { cultureTypes, isLoading, create, update, remove } = useCultureTypes()
  const { cultures } = useCultures()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CultureType | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  const openAdd = () => { setEditing(null); reset({}); setDialogOpen(true) }
  const openEdit = (ct: CultureType) => { setEditing(ct); reset({ culture_id: ct.culture_id, culture_type_name: ct.culture_type_name }); setDialogOpen(true) }

  const onSubmit = async (data: FormData) => {
    if (editing) await update.mutateAsync({ id: editing.id, ...data })
    else await create.mutateAsync(data)
    setDialogOpen(false)
  }

  const columns: ColumnDef<CultureType>[] = [
    { accessorKey: 'culture_type_name', header: 'Type Name' },
    { id: 'culture', header: 'Culture', cell: ({ row }) => row.original.culture?.culture_name ?? '—' },
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
      <PageHeader title="Culture Types" description="Sub-types for each crop culture" onAdd={openAdd} addLabel="Add type" />
      {!isLoading && cultureTypes.length === 0 ? (
        <EmptyState icon={Layers} title="No culture types yet" description="Add sub-types to your cultures." onAdd={openAdd} addLabel="Add type" />
      ) : (
        <DataTable columns={columns} data={cultureTypes} isLoading={isLoading} searchColumn="culture_type_name" />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editing ? 'Edit culture type' : 'Add culture type'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Culture *</Label>
              <Select value={watch('culture_id')} onValueChange={(v) => setValue('culture_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select culture…" /></SelectTrigger>
                <SelectContent>
                  {cultures.map((c) => <SelectItem key={c.id} value={c.id}>{c.culture_name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.culture_id && <p className="text-xs text-destructive">{errors.culture_id.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Type name *</Label>
              <Input {...register('culture_type_name')} placeholder="e.g. Early variety" />
              {errors.culture_type_name && <p className="text-xs text-destructive">{errors.culture_type_name.message}</p>}
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
        title="Delete culture type" loading={remove.isPending} />
    </PageContainer>
  )
}
