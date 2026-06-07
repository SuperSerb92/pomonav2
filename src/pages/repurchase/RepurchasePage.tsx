import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { MoreHorizontal, Pencil, Trash2, RefreshCw, Loader2, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
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
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatWeight } from '@/lib/formatters'
import type { Repurchase } from '@/types/app.types'

function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const schema = z.object({
  buyer_id: z.string().min(1, 'Required'),
  culture_id: z.string().min(1, 'Required'),
  repurchase_date: z.string().min(1, 'Required'),
  neto: z.coerce.number().min(0, 'Required'),
  neto_shipped: z.coerce.number().min(0.001, 'Required'),
  difference: z.coerce.number().optional().nullable(),
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
  const { user } = useAuth()
  const { repurchases, isLoading, create, update, remove } = useRepurchase()
  const { buyers } = useBuyers()
  const { cultures } = useCultures()
  const { rates, loading: ratesLoading, error: ratesError, fetchRates } = useExchangeRate()

  const [selectedDate, setSelectedDate] = useState(() => localDateStr())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Repurchase | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [rateType, setRateType] = useState<'srednji' | 'prodajni'>('srednji')
  const [autofillLoading, setAutofillLoading] = useState(false)
  const [autofillMsg, setAutofillMsg] = useState<string | null>(null)

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as never,
  })

  const watchedPriceRsd   = watch('price_rsd')
  const watchedNetoShipped = watch('neto_shipped')
  const watchedNeto        = watch('neto')
  const watchedEurRate     = watch('eur_rate')
  const watchedCultureId   = watch('culture_id')
  const watchedDate        = watch('repurchase_date')

  // Auto-calculate income from neto_shipped × price, and difference = neto_shipped - neto
  useEffect(() => {
    const price       = Number(watchedPriceRsd)    || 0
    const netoShipped = Number(watchedNetoShipped)  || 0
    const neto        = Number(watchedNeto)         || 0
    const rate        = Number(watchedEurRate)      || 0
    if (netoShipped > 0) {
      setValue('difference', round2(netoShipped - neto))
    }
    if (price > 0 && netoShipped > 0) {
      const incomeRsd = round2(price * netoShipped)
      setValue('income_rsd', incomeRsd)
      if (rate > 0) {
        setValue('price_eur', round4(price / rate))
        setValue('income_eur', round2(incomeRsd / rate))
      }
    }
  }, [watchedPriceRsd, watchedNetoShipped, watchedNeto, watchedEurRate, setValue])

  // When rates are fetched or rate type changes, fill eur_rate field
  useEffect(() => {
    if (!rates) return
    setValue('eur_rate', round4(rates[rateType]))
  }, [rates, rateType, setValue])

  // Auto-fill neto + boxes from barcodes when culture & date are selected (add mode only)
  useEffect(() => {
    if (editing || !watchedCultureId || !watchedDate || !user) return
    let cancelled = false
    setAutofillLoading(true)
    setAutofillMsg(null)
    ;(async () => {
      const nextDay = localDateStr(new Date(new Date(watchedDate).getTime() + 86_400_000))
      const [bcRes, repRes] = await Promise.all([
        supabase
          .from('barcodes')
          .select('neto')
          .eq('user_id', user.id)
          .eq('culture_id', watchedCultureId)
          .eq('is_storno', false)
          .gte('created_at', `${watchedDate}T00:00:00`)
          .lt('created_at', `${nextDay}T00:00:00`)
          .not('neto', 'is', null),
        supabase
          .from('repurchase')
          .select('neto, no_of_boxes')
          .eq('user_id', user.id)
          .eq('culture_id', watchedCultureId)
          .eq('repurchase_date', watchedDate),
      ])
      if (cancelled) return
      if (bcRes.data && bcRes.data.length > 0) {
        const totalNeto  = bcRes.data.reduce((s, b) => s + ((b.neto as number) ?? 0), 0)
        const totalBoxes = bcRes.data.length
        const repNeto    = repRes.data?.reduce((s, r) => s + ((r.neto as number) ?? 0), 0) ?? 0
        const repBoxes   = repRes.data?.reduce((s, r) => s + ((r.no_of_boxes as number) ?? 0), 0) ?? 0
        const availNeto  = Math.max(0, Math.round((totalNeto - repNeto) * 1000) / 1000)
        const availBoxes = Math.max(0, totalBoxes - repBoxes)
        setValue('neto', availNeto)
        setValue('no_of_boxes', availBoxes)
        const note = repRes.data?.length ? ` · ${repRes.data.length} existing repurchase(s) deducted` : ''
        setAutofillMsg(`Auto-filled from ${bcRes.data.length} barcode(s)${note}`)
      } else {
        setAutofillMsg('No weighed barcodes found for this culture and date')
      }
      setAutofillLoading(false)
    })()
    return () => { cancelled = true }
  }, [watchedCultureId, watchedDate, editing, user, setValue])

  // Date navigation
  function changeDate(days: number) {
    setSelectedDate(prev => localDateStr(new Date(new Date(prev).getTime() + days * 86_400_000)))
  }

  const openAdd = () => {
    setEditing(null)
    setAutofillMsg(null)
    reset({ repurchase_date: selectedDate })
    setDialogOpen(true)
  }

  const openEdit = (r: Repurchase) => {
    setEditing(r)
    setAutofillMsg(null)
    reset(r as unknown as FormData)
    setDialogOpen(true)
  }

  const onSubmit = async (data: FormData) => {
    if (editing) await update.mutateAsync({ id: editing.id, ...data })
    else await create.mutateAsync(data)
    setDialogOpen(false)
  }

  // Filter by selected date
  const filtered = repurchases.filter(r => r.repurchase_date === selectedDate)

  const totNeto    = filtered.reduce((s, r) => s + (r.neto          ?? 0), 0)
  const totShipped = filtered.reduce((s, r) => s + (r.neto_shipped   ?? 0), 0)
  const totDiff    = filtered.reduce((s, r) => s + (r.difference     ?? 0), 0)
  const totBoxes   = filtered.reduce((s, r) => s + (r.no_of_boxes    ?? 0), 0)
  const totIncRsd  = filtered.reduce((s, r) => s + (r.income_rsd     ?? 0), 0)
  const totIncEur  = filtered.reduce((s, r) => s + (r.income_eur     ?? 0), 0)
  const avgPriceRsd = totShipped > 0 ? totIncRsd / totShipped : null

  const columns: ColumnDef<Repurchase>[] = [
    { id: 'culture', header: 'Culture', cell: ({ row }) => row.original.culture?.culture_name ?? '—' },
    { id: 'buyer',   header: 'Buyer',   cell: ({ row }) => row.original.buyer?.name ?? '—' },
    { accessorKey: 'neto',        header: 'Neto (kg)',         cell: ({ getValue }) => formatWeight(getValue() as number) },
    { accessorKey: 'neto_shipped', header: 'Net Repurchase', cell: ({ getValue }) => getValue() != null ? formatWeight(getValue() as number) : '—' },
    { accessorKey: 'difference',  header: 'Difference',       cell: ({ getValue }) => getValue() != null ? formatWeight(getValue() as number) : '—' },
    { accessorKey: 'no_of_boxes', header: 'Boxes',            cell: ({ getValue }) => getValue() ?? '—' },
    { accessorKey: 'income_rsd',  header: 'Income (RSD)',     cell: ({ getValue }) => getValue() != null ? formatCurrency(getValue() as number) : '—' },
    { accessorKey: 'income_eur',  header: 'Income (EUR)',     cell: ({ getValue }) => getValue() != null ? formatCurrency(getValue() as number, 'EUR') : '—' },
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
      <PageHeader title="Purchase" description="Track crop purchases from employees" />

      {/* Date navigation */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Button variant="outline" size="icon" onClick={() => changeDate(-1)} title="Previous day">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="relative">
          <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="pl-9 w-40"
          />
        </div>
        <Button variant="outline" size="icon" onClick={() => changeDate(1)} title="Next day">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setSelectedDate(localDateStr())}>Today</Button>
        <div className="flex-1" />
        <Button className="bg-pomona-green hover:bg-pomona-green/90" size="sm" onClick={openAdd}>
          Add purchase
        </Button>
      </div>

      {!isLoading && filtered.length === 0 ? (
        <EmptyState icon={RefreshCw} title="No purchases for this date" description="Add a purchase or navigate to a different date." onAdd={openAdd} addLabel="Add purchase" />
      ) : (
        <>
          <DataTable columns={columns} data={filtered} isLoading={isLoading} searchColumn="culture" />
          {!isLoading && filtered.length > 0 && (
            <div className="rounded-lg border bg-muted/40 px-4 py-2.5 flex flex-wrap gap-x-6 gap-y-1 text-sm mt-2">
              <span className="text-muted-foreground font-medium">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
              <span><span className="text-muted-foreground">Neto:</span> <strong>{totNeto.toFixed(3)} kg</strong></span>
              <span><span className="text-muted-foreground">Net Purch.:</span> <strong>{totShipped.toFixed(3)} kg</strong></span>
              <span><span className="text-muted-foreground">Difference:</span> <strong>{totDiff.toFixed(3)} kg</strong></span>
              <span><span className="text-muted-foreground">Boxes:</span> <strong>{totBoxes}</strong></span>
              <span><span className="text-muted-foreground">Price/kg:</span> <strong>{avgPriceRsd != null ? `${avgPriceRsd.toFixed(4)} RSD` : '—'}</strong></span>
              <span><span className="text-muted-foreground">Income RSD:</span> <strong>{formatCurrency(totIncRsd)}</strong></span>
              <span><span className="text-muted-foreground">Income EUR:</span> <strong>{formatCurrency(totIncEur, 'EUR')}</strong></span>
            </div>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setAutofillMsg(null); setDialogOpen(open) }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit purchase' : 'Add purchase'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* NBS Exchange Rate bar */}
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">EUR/RSD Rate (NBS)</span>
                <Button type="button" size="sm" variant="outline" onClick={fetchRates} disabled={ratesLoading} className="ml-auto h-7 text-xs">
                  {ratesLoading ? <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" />Fetching…</> : "Get today's rate"}
                </Button>
              </div>
              {ratesError && <p className="text-xs text-destructive">{ratesError}</p>}
              {rates && (
                <div className="flex items-center gap-4">
                  {(['srednji', 'prodajni'] as const).map((type) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="rateType" value={type} checked={rateType === type} onChange={() => setRateType(type)} className="accent-pomona-green" />
                      <span className="text-sm">
                        {type === 'srednji' ? 'Srednji kurs' : 'Prodajni kurs'}
                        <span className="ml-1.5 font-semibold text-foreground">{rates[type].toFixed(4)} RSD</span>
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

              <div className="col-span-2 space-y-1.5"><Label>Date *</Label><Input {...register('repurchase_date')} type="date" /></div>

              {/* Neto — auto-filled from barcodes */}
              <div className="space-y-1.5">
                <Label>Neto (kg) <span className="text-xs text-muted-foreground font-normal">from barcodes</span></Label>
                <div className="relative">
                  <Input {...register('neto')} type="number" step="0.001" className={autofillLoading ? 'pr-8' : ''} />
                  {autofillLoading && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
              </div>

              {/* Net Repurchase — user enters actual shipped amount */}
              <div className="space-y-1.5">
                <Label>Net Repurchase (kg) *</Label>
                <Input {...register('neto_shipped')} type="number" step="0.001" />
                {errors.neto_shipped && <p className="text-xs text-destructive">{errors.neto_shipped.message}</p>}
              </div>

              {/* Autofill message */}
              {!editing && autofillMsg && (
                <div className={`col-span-2 text-xs px-2 py-1.5 rounded-md ${autofillMsg.startsWith('No') ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                  {autofillMsg}
                </div>
              )}

              {/* Difference — read-only, auto-calculated */}
              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Difference (kg)</Label>
                <Input {...register('difference')} type="number" step="0.001" readOnly className="bg-muted/40 cursor-default" />
              </div>

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
        title="Delete purchase" loading={remove.isPending} />
    </PageContainer>
  )
}
