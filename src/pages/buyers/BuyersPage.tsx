import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MoreHorizontal, Pencil, Trash2, ShoppingCart } from 'lucide-react'
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
import { useBuyers } from '@/hooks/useBuyers'
import type { Buyer } from '@/types/app.types'

const schema = z.object({
  name: z.string().min(1, 'Required'),
  pib: z.string().optional(),
  jmbg: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  is_active: z.boolean().default(true),
})
type FormData = z.infer<typeof schema>

export default function BuyersPage() {
  const { buyers, isLoading, create, update, remove } = useBuyers()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Buyer | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) as never })

  const openAdd = () => { setEditing(null); reset({}); setDialogOpen(true) }
  const openEdit = (b: Buyer) => { setEditing(b); reset(b); setDialogOpen(true) }

  const onSubmit = async (data: FormData) => {
    if (editing) await update.mutateAsync({ id: editing.id, ...data })
    else await create.mutateAsync(data)
    setDialogOpen(false)
  }

  const columns: ColumnDef<Buyer>[] = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'pib', header: 'PIB', cell: ({ getValue }) => getValue() || '—' },
    { accessorKey: 'jmbg', header: 'JMBG', cell: ({ getValue }) => getValue() || '—' },
    { accessorKey: 'phone', header: 'Phone', cell: ({ getValue }) => getValue() || '—' },
    { accessorKey: 'city', header: 'City', cell: ({ getValue }) => getValue() || '—' },
    { accessorKey: 'email', header: 'Email', cell: ({ getValue }) => getValue() || '—' },
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
      <PageHeader title="Buyers" description="Manage crop buyers" onAdd={openAdd} addLabel="Add buyer" />
      {!isLoading && buyers.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="No buyers yet" description="Add buyers to track crop repurchases." onAdd={openAdd} addLabel="Add buyer" />
      ) : (
        <DataTable columns={columns} data={buyers} isLoading={isLoading} searchColumn="name" searchPlaceholder="Search buyers…" />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit buyer' : 'Add buyer'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Name *</Label>
                <Input {...register('name')} placeholder="Company or person name" />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5"><Label>PIB (Tax ID)</Label><Input {...register('pib')} /></div>
              <div className="space-y-1.5"><Label>JMBG</Label><Input {...register('jmbg')} /></div>
              <div className="space-y-1.5"><Label>Phone</Label><Input {...register('phone')} /></div>
              <div className="space-y-1.5"><Label>City</Label><Input {...register('city')} /></div>
              <div className="col-span-2 space-y-1.5"><Label>Address</Label><Input {...register('address')} /></div>
              <div className="col-span-2 space-y-1.5">
                <Label>Email</Label>
                <Input {...register('email')} type="email" />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-pomona-green hover:bg-pomona-green/90" disabled={create.isPending || update.isPending}>
                {editing ? 'Save changes' : 'Add buyer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onConfirm={() => { remove.mutate(deleteTarget!); setDeleteTarget(null) }}
        title="Delete buyer" description="This will remove the buyer." loading={remove.isPending} />
    </PageContainer>
  )
}
