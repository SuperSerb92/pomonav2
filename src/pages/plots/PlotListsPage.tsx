import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { MoreHorizontal, Pencil, Trash2, MapPin } from 'lucide-react'
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
import { usePlotLists } from '@/hooks/usePlots'
import type { PlotList } from '@/types/app.types'

const schema = z.object({ plot_list_name: z.string().min(1, 'Required') })
type FormData = z.infer<typeof schema>

export default function PlotListsPage() {
  const { plotLists, isLoading, create, update, remove } = usePlotLists()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<PlotList | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) as never })

  const openAdd = () => { setEditing(null); reset({}); setDialogOpen(true) }
  const openEdit = (p: PlotList) => { setEditing(p); reset(p); setDialogOpen(true) }

  const onSubmit = async (data: FormData) => {
    if (editing) await update.mutateAsync({ id: editing.id, ...data })
    else await create.mutateAsync(data.plot_list_name)
    setDialogOpen(false)
  }

  const columns: ColumnDef<PlotList>[] = [
    { accessorKey: 'plot_list_name', header: 'List Name' },
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
      <PageHeader title="Plot Lists" description="Group plots into lists" onAdd={openAdd} addLabel="Add list" />
      {!isLoading && plotLists.length === 0 ? (
        <EmptyState icon={MapPin} title="No plot lists yet" description="Create lists to organize your plots." onAdd={openAdd} addLabel="Add list" />
      ) : (
        <DataTable columns={columns} data={plotLists} isLoading={isLoading} searchColumn="plot_list_name" />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editing ? 'Edit list' : 'Add list'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>List name *</Label>
              <Input {...register('plot_list_name')} placeholder="e.g. Section A" />
              {errors.plot_list_name && <p className="text-xs text-destructive">{errors.plot_list_name.message}</p>}
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
        title="Delete plot list" loading={remove.isPending} />
    </PageContainer>
  )
}
