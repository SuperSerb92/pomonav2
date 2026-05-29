import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { MoreHorizontal, Pencil, Trash2, Package } from 'lucide-react'
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
import { usePackaging } from '@/hooks/usePackaging'
import { formatWeight } from '@/lib/formatters'
import type { Packaging } from '@/types/app.types'

const schema = z.object({
  packaging_type: z.string().min(1, 'Required'),
  tara: z.coerce.number().min(0, 'Must be ≥ 0'),
})
type FormData = z.infer<typeof schema>

export default function PackagingPage() {
  const { packaging, isLoading, create, update, remove } = usePackaging()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Packaging | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) as never })

  const openAdd = () => { setEditing(null); reset({}); setDialogOpen(true) }
  const openEdit = (p: Packaging) => { setEditing(p); reset(p); setDialogOpen(true) }

  const onSubmit = async (data: FormData) => {
    if (editing) await update.mutateAsync({ id: editing.id, ...data })
    else await create.mutateAsync(data)
    setDialogOpen(false)
  }

  const columns: ColumnDef<Packaging>[] = [
    { accessorKey: 'packaging_type', header: 'Packaging Type' },
    { accessorKey: 'tara', header: 'Tara (empty weight)', cell: ({ getValue }) => formatWeight(getValue() as number) },
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
      <PageHeader title="Packaging" description="Manage container types and tara weights" onAdd={openAdd} addLabel="Add packaging" />
      {!isLoading && packaging.length === 0 ? (
        <EmptyState icon={Package} title="No packaging types yet" description="Add packaging used for harvested goods." onAdd={openAdd} addLabel="Add packaging" />
      ) : (
        <DataTable columns={columns} data={packaging} isLoading={isLoading} searchColumn="packaging_type" />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editing ? 'Edit packaging' : 'Add packaging'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Packaging type *</Label>
              <Input {...register('packaging_type')} placeholder="e.g. Plastic crate 10kg" />
              {errors.packaging_type && <p className="text-xs text-destructive">{errors.packaging_type.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Tara (kg) *</Label>
              <Input {...register('tara')} type="number" step="0.001" placeholder="0.000" />
              {errors.tara && <p className="text-xs text-destructive">{errors.tara.message}</p>}
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
        title="Delete packaging" loading={remove.isPending} />
    </PageContainer>
  )
}
