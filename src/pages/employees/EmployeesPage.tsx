import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MoreHorizontal, Pencil, Trash2, Users } from 'lucide-react'
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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useEmployees } from '@/hooks/useEmployees'
import type { Employee } from '@/types/app.types'

const schema = z.object({
  name: z.string().min(1, 'Required'),
  surname: z.string().min(1, 'Required'),
  middle_name: z.string().optional(),
  phone_number: z.string().optional(),
  recommendation: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function EmployeesPage() {
  const { employees, isLoading, create, update, remove } = useEmployees()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as never,
  })

  const openAdd = () => { setEditing(null); reset({}); setDialogOpen(true) }
  const openEdit = (e: Employee) => { setEditing(e); reset(e); setDialogOpen(true) }

  const onSubmit = async (data: FormData) => {
    if (editing) {
      await update.mutateAsync({ id: editing.id, ...data })
    } else {
      await create.mutateAsync(data)
    }
    setDialogOpen(false)
  }

  const columns: ColumnDef<Employee>[] = [
    { accessorKey: 'surname', header: 'Surname', size: 150 },
    { accessorKey: 'name', header: 'Name', size: 150 },
    { accessorKey: 'middle_name', header: 'Middle Name', size: 130, cell: ({ getValue }) => getValue() || '—' },
    { accessorKey: 'phone_number', header: 'Phone', size: 140, cell: ({ getValue }) => getValue() || '—' },
    { accessorKey: 'recommendation', header: 'Recommendation', cell: ({ getValue }) => getValue() || '—' },
    {
      id: 'actions',
      size: 60,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(row.original)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setDeleteTarget(row.original.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader title="Employees" description="Manage your farm workers" onAdd={openAdd} addLabel="Add employee" />

      {!isLoading && employees.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No employees yet"
          description="Add your first employee to start tracking work evaluations."
          onAdd={openAdd}
          addLabel="Add employee"
        />
      ) : (
        <DataTable columns={columns} data={employees} isLoading={isLoading} searchColumn="surname" searchPlaceholder="Search employees…" />
      )}

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit employee' : 'Add employee'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input {...register('name')} placeholder="First name" />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Surname *</Label>
                <Input {...register('surname')} placeholder="Last name" />
                {errors.surname && <p className="text-xs text-destructive">{errors.surname.message}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Middle name</Label>
              <Input {...register('middle_name')} placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone number</Label>
              <Input {...register('phone_number')} placeholder="+381 xx xxx xxxx" />
            </div>
            <div className="space-y-1.5">
              <Label>Recommendation</Label>
              <Input {...register('recommendation')} placeholder="Notes or references" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-pomona-green hover:bg-pomona-green/90" disabled={create.isPending || update.isPending}>
                {editing ? 'Save changes' : 'Add employee'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { remove.mutate(deleteTarget!); setDeleteTarget(null) }}
        title="Delete employee"
        description="This will remove the employee from your list. Work evaluations will be preserved."
        loading={remove.isPending}
      />
    </PageContainer>
  )
}
