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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { usePlots, usePlotLists } from '@/hooks/usePlots'
import type { Plot } from '@/types/app.types'

const schema = z.object({
  plot_name: z.string().min(1, 'Required'),
  plot_label: z.string().optional(),
  plot_list_id: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function PlotsPage() {
  const { plots, isLoading, create, update, remove } = usePlots()
  const { plotLists } = usePlotLists()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Plot | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  const openAdd = () => { setEditing(null); reset({}); setDialogOpen(true) }
  const openEdit = (p: Plot) => {
    setEditing(p)
    reset({ plot_name: p.plot_name, plot_label: p.plot_label ?? '', plot_list_id: p.plot_list_id ?? '' })
    setDialogOpen(true)
  }

  const onSubmit = async (data: FormData) => {
    const payload = { ...data, plot_list_id: data.plot_list_id || null }
    if (editing) await update.mutateAsync({ id: editing.id, ...payload })
    else await create.mutateAsync(payload)
    setDialogOpen(false)
  }

  const columns: ColumnDef<Plot>[] = [
    { accessorKey: 'plot_name', header: 'Plot Name' },
    { accessorKey: 'plot_label', header: 'Label', cell: ({ getValue }) => getValue() || '—' },
    { id: 'plot_list', header: 'Plot List', cell: ({ row }) => row.original.plot_list?.plot_list_name ?? '—' },
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
      <PageHeader title="Plots" description="Manage farm plots and parcels" onAdd={openAdd} addLabel="Add plot" />
      {!isLoading && plots.length === 0 ? (
        <EmptyState icon={MapPin} title="No plots yet" description="Add plots to assign to barcode records." onAdd={openAdd} addLabel="Add plot" />
      ) : (
        <DataTable columns={columns} data={plots} isLoading={isLoading} searchColumn="plot_name" />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editing ? 'Edit plot' : 'Add plot'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Plot name *</Label>
              <Input {...register('plot_name')} placeholder="e.g. North field" />
              {errors.plot_name && <p className="text-xs text-destructive">{errors.plot_name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Label</Label>
              <Input {...register('plot_label')} placeholder="Short code (optional)" />
            </div>
            <div className="space-y-1.5">
              <Label>Plot list</Label>
              <Select value={watch('plot_list_id') ?? ''} onValueChange={(v) => setValue('plot_list_id', v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  {plotLists.map((pl) => <SelectItem key={pl.id} value={pl.id}>{pl.plot_list_name}</SelectItem>)}
                </SelectContent>
              </Select>
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
        title="Delete plot" loading={remove.isPending} />
    </PageContainer>
  )
}
