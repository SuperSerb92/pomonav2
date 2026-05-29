import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { MoreHorizontal, Pencil, Trash2, RefreshCw, Loader2 } from 'lucide-react'
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
import { useRepurchase } from '@/hooks/useRepurchase'
import { useBuyers } from '@/hooks/useBuyers'
import { useCultures } from '@/hooks/useCultures'
import { useExchangeRate } from '@/hooks/useExchangeRate'
import { formatDate, formatCurrency, formatWeight } from '@/lib/formatters'
import type { Repurchase } from '@/types/app.types'

const schema = z.object({
  buyer_id: z.string().min(1, 'Required'),
  culture_id: z.string().min(1, 'Required'),
  repurchase_date: z.string().min(1, 'Required'),
  neto: z.coerce.number().min(0.001, 'Required'),
  no_of_boxes: z.coerce.number().int().optional().nullable(),
  price_rsd: z.coerce.number().optional().nullable(),
  price_eur: z.coerce.number().optional().nullable(),
  income_rsd: z.coerce.number().optional().nullable(),
  income_eur: z.coerce.number().optional().nullable(),
  eur_rate: z.coerce.number().optional().nullable(),
  notes: z.string().optional().nullable(),
})
type FormData = z.infer<typeof schema>

function round2(n: number) { return Math.round(n * 100) / 100 }
function round4(n: number) { return Math.round(n * 10000) / 10000 }

export default function RepurchasePage() {
  const { repurchases, isLoading, create, update, remove } = useRepurchase()
  const { buyers } = useBuyers()
  const { cultures } = useCultures()
  const { rates, loading: ratesLoading, error: ratesError, fetchRates } = useExchangeRate()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Repurchase | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [rateType, setRateType] = useState<'srednji' | 'prodajni'>('srednji')

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as never,
  })

  const watchedPriceRsd = watch('price_rsd')
  const watchedNeto = watch('neto')
  const watchedEurRate = watch('eur_rate')

  // Auto-calculate EUR price and incomes when RSD price, neto or rate changes
  useEffect(() => {
    const price = Number(watchedPriceRsd) || 0
    const neto = Number(watchedNeto) || 0
    const rate = Number(watchedEurRate) || 0
    if (price <= 0 || neto <= 0) return
    const incomeRsd = round2(price * neto)
    setValue('income_rsd', incomeRsd)
    if (rate > 0) {
      setValue('price_eur', round4(price / rate))
      setValue('income_eur', round2(incomeRsd / rate))
    }
  }, [watchedPriceRsd, watchedNeto, watchedEurRate, setValue])

  // When rates are fetched or rate type changes, fill eur_rate field
  useEffect(() => {
    if (!rates) return
    setValue('eur_rate', round4(rates[rateType]))
  }, [rates, rateType, setValue])

  const openAdd = () => {
    setEditing(null)
    reset({ repurchase_date: new Date().toISOString().split('T')[0] })
    setDialogOpen(true)
  }

  const openEdit = (r: Repurchase) => {
    setEditing(r)
    reset(r as unknown as FormData)
    setDialogOpen(true)
  }

  const onSubmit = async (data: FormData) => {
    if (editing) await update.mutateAsync({ id: editing.id, ...data })
    else await create.mutateAsync(data)
    setDialogOpen(false)
  }

  const columns: ColumnDef<Repurchase>[] = [
    { accessorKey: 'repurchase_date', header: 'Date', cell: ({ getValue }) => formatDate(getValue() as string) },
    { id: 'culture', header: 'Culture', cell: ({ row }) => row.original.culture?.culture_name ?? '—' },
    { id: 'buyer', header: 'Buyer', cell: ({ row }) => row.original.buyer?.name ?? '—' },
    { accessorKey: 'neto', header: 'Neto', cell: ({ getValue }) => formatWeight(getValue() as number) },
    { accessorKey: 'income_rsd', header: 'Income (RSD)', cell: ({ getValue }) => getValue() != null ? formatCurrency(getValue() as number) : '—' },
    { accessorKey: 'income_eur', header: 'Income (EUR)', cell: ({ getValue }) => getValue() != null ? formatCurrency(getValue() as number, 'EUR') : '—' },
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
      <PageHeader title="Repurchase" description="Track crop purchases from employees" onAdd={openAdd} addLabel="Add repurchase" />
      {!isLoading && repurchases.length === 0 ? (
        <EmptyState icon={RefreshCw} title="No repurchases yet" description="Record crop purchases with pricing and buyer information." onAdd={openAdd} addLabel="Add repurchase" />
      ) : (
        <DataTable columns={columns} data={repurchases} isLoading={isLoading} searchColumn="repurchase_date" />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit repurchase' : 'Add repurchase'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* NBS Exchange Rate bar */}
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">EUR/RSD Rate (NBS)</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={fetchRates}
                  disabled={ratesLoading}
                  className="ml-auto h-7 text-xs"
                >
                  {ratesLoading
                    ? <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" />Fetching…</>
                    : 'Get today\'s rate'}
                </Button>
              </div>

              {ratesError && (
                <p className="text-xs text-destructive">{ratesError}</p>
              )}

              {rates && (
                <div className="flex items-center gap-4">
                  {(['srednji', 'prodajni'] as const).map((type) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="rateType"
                        value={type}
                        checked={rateType === type}
                        onChange={() => setRateType(type)}
                        className="accent-pomona-green"
                      />
                      <span className="text-sm">
                        {type === 'srednji' ? 'Srednji kurs' : 'Prodajni kurs'}
                        <span className="ml-1.5 font-semibold text-foreground">
                          {rates[type].toFixed(4)} RSD
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Buyer *</Label>
                <Select value={watch('buyer_id')} onValueChange={(v) => setValue('buyer_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Select buyer…" /></SelectTrigger>
                  <SelectContent>{buyers.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
                {errors.buyer_id && <p className="text-xs text-destructive">{errors.buyer_id.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Culture *</Label>
                <Select value={watch('culture_id')} onValueChange={(v) => setValue('culture_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Select culture…" /></SelectTrigger>
                  <SelectContent>{cultures.map((c) => <SelectItem key={c.id} value={c.id}>{c.culture_name}</SelectItem>)}</SelectContent>
                </Select>
                {errors.culture_id && <p className="text-xs text-destructive">{errors.culture_id.message}</p>}
              </div>
              <div className="space-y-1.5"><Label>Date *</Label><Input {...register('repurchase_date')} type="date" /></div>
              <div className="space-y-1.5"><Label>Neto (kg) *</Label><Input {...register('neto')} type="number" step="0.001" /></div>
              <div className="space-y-1.5"><Label>Boxes</Label><Input {...register('no_of_boxes')} type="number" /></div>
              <div className="space-y-1.5">
                <Label>EUR rate</Label>
                <Input {...register('eur_rate')} type="number" step="0.0001" placeholder="Auto-filled from NBS" />
              </div>
              <div className="space-y-1.5"><Label>Price/kg (RSD)</Label><Input {...register('price_rsd')} type="number" step="0.0001" /></div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Price/kg (EUR)</Label>
                <Input {...register('price_eur')} type="number" step="0.0001" readOnly className="bg-muted/40 cursor-default" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Income (RSD)</Label>
                <Input {...register('income_rsd')} type="number" step="0.01" readOnly className="bg-muted/40 cursor-default" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Income (EUR)</Label>
                <Input {...register('income_eur')} type="number" step="0.01" readOnly className="bg-muted/40 cursor-default" />
              </div>
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
        title="Delete repurchase" loading={remove.isPending} />
    </PageContainer>
  )
}
