import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { MoreHorizontal, Pencil, Trash2, Leaf } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useCultures } from '@/hooks/useCultures'
import { formatDate } from '@/lib/formatters'
import type { Culture } from '@/types/app.types'

const schema = z.object({ culture_name: z.string().min(1, 'Required') })
type FormData = z.infer<typeof schema>

export default function CulturesPage() {
  const { cultures, isLoading, create, update, remove } = useCultures()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Culture | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  const openAdd = () => { setEditing(null); reset({}); setDialogOpen(true) }
  const openEdit = (c: Culture) => { setEditing(c); reset(c); setDialogOpen(true) }

  const onSubmit = async (data: FormData) => {
    if (editing) await update.mutateAsync({ id: editing.id, ...data })
    else await create.mutateAsync(data.culture_name)
    setDialogOpen(false)
  }

  const columns: ColumnDef<Culture>[] = [
    { accessorKey: 'culture_name', header: 'Culture Name' },
    { accessorKey: 'created_at', header: 'Added', cell: ({ getValue }) => formatDate(getValue() as string) },
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
      <PageHeader title="Cultures" description="Manage crop types" onAdd={openAdd} addLabel="Add culture" />
      {!isLoading && cultures.length === 0 ? (
        <EmptyState icon={Leaf} title="No cultures yet" description="Add your first crop type." onAdd={openAdd} addLabel="Add culture" />
      ) : (
        <DataTable columns={columns} data={cultures} isLoading={isLoading} searchColumn="culture_name" />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editing ? 'Edit culture' : 'Add culture'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Culture name *</Label>
              <Input {...register('culture_name')} placeholder="e.g. Strawberry" />
              {errors.culture_name && <p className="text-xs text-destructive">{errors.culture_name.message}</p>}
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
        title="Delete culture" description="Related culture types will also be affected." loading={remove.isPending} />
    </PageContainer>
  )
}
