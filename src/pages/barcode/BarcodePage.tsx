import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { MoreHorizontal, Ban, QrCode, Printer, CalendarDays } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useEmployees } from '@/hooks/useEmployees'
import { useCultures } from '@/hooks/useCultures'
import { useCultureTypes } from '@/hooks/useCultureTypes'
import { usePackaging } from '@/hooks/usePackaging'
import { usePlots } from '@/hooks/usePlots'
import { formatDate } from '@/lib/formatters'
import { toast } from '@/hooks/useToast'
import { useStornoBarcode } from '@/hooks/useStornoBarcode'
import { BarcodeReaderTab } from './BarcodeReaderTab'
import { BarcodeStornoTab } from './BarcodeStornoTab'
import { BarcodePrintModal } from './BarcodePrintModal'
import { useProfile } from '@/hooks/useProfile'
import type { Barcode } from '@/types/app.types'

const schema = z.object({
  date: z.string().min(1, 'Required'),
  employee_id: z.string().min(1, 'Required'),
  culture_id: z.string().min(1, 'Required'),
  culture_type_id: z.string().min(1, 'Required'),
  packaging_id: z.string().min(1, 'Required'),
  plot_id: z.string().min(1, 'Required'),
  tara: z.coerce.number().optional().nullable(),
  neto: z.coerce.number().optional().nullable(),
  bruto: z.coerce.number().optional().nullable(),
})
type FormData = z.infer<typeof schema>

function generateBarcodeValue(userId: string, index = 0) {
  return `PM-${userId.slice(0, 4).toUpperCase()}-${Date.now() + index}`
}

export default function BarcodePage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { employees } = useEmployees()
  const { cultures } = useCultures()
  const { cultureTypes } = useCultureTypes()
  const { packaging } = usePackaging()
  const { plots } = usePlots()
  const { profile } = useProfile()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [printTarget, setPrintTarget] = useState<Barcode | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchTarget, setBatchTarget] = useState<Barcode[] | null>(null)
  const { stornoTarget, setStornoTarget, storno, stornoMultiple } = useStornoBarcode()

  const toggleSelect = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })
  const clearSelection = () => setSelectedIds(new Set())

  const key = ['barcodes', user?.id]

  const { data: barcodes = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barcodes')
        .select('*, employee:employees(id, name, surname, middle_name), culture:cultures(id, culture_name), culture_type:culture_types(id, culture_type_name), packaging:packaging(id, packaging_type)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      return data as unknown as Barcode[]
    },
    enabled: !!user,
  })

  const create = useMutation({
    mutationFn: async (input: FormData) => {
      const { date, ...rest } = input
      const { error } = await supabase.from('barcodes').insert({
        ...rest,
        user_id: user!.id,
        barcode_value: generateBarcodeValue(user!.id),
        created_at: new Date(date).toISOString(),
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['barcodes-reader', user?.id] })
      toast({ title: 'Barcode generated' })
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

const { handleSubmit, register, setValue, watch, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) as never })

  const onSubmit = async (data: FormData) => {
    await create.mutateAsync(data)
    setDialogOpen(false)
    reset({})
  }

  const today = new Date().toISOString().split('T')[0]
  const openAdd = () => { reset({ date: today }); setDialogOpen(true) }
  const selectedCultureId = watch('culture_id')
  const filteredTypes = cultureTypes.filter((ct) => ct.culture_id === selectedCultureId)

  const activeBarcodesForSelection = barcodes.filter(b => !b.is_storno)
  const allSelected = activeBarcodesForSelection.length > 0 && activeBarcodesForSelection.every(b => selectedIds.has(b.id))
  const someSelected = activeBarcodesForSelection.some(b => selectedIds.has(b.id))

  const columns: ColumnDef<Barcode>[] = [
    {
      id: 'select', size: 40,
      header: () => (
        <Checkbox
          checked={allSelected ? true : someSelected ? 'indeterminate' : false}
          onCheckedChange={(v) => v
            ? setSelectedIds(new Set(activeBarcodesForSelection.map(b => b.id)))
            : clearSelection()
          }
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => row.original.is_storno ? null : (
        <Checkbox
          checked={selectedIds.has(row.original.id)}
          onCheckedChange={() => toggleSelect(row.original.id)}
          aria-label="Select row"
        />
      ),
    },
    { accessorKey: 'barcode_value', header: 'Barcode', cell: ({ getValue }) => <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{getValue() as string}</code> },
    { accessorKey: 'created_at', header: 'Date', size: 110, cell: ({ getValue }) => formatDate(getValue() as string) },
    {
      id: 'employee', header: 'Employee',
      accessorFn: (row) => { const e = row.employee as any; return e ? `${e.surname} ${e.name}` : '' },
      cell: ({ row }) => { const e = row.original.employee as any; return e ? `${e.surname} ${e.name}` : '—' },
    },
    {
      id: 'culture', header: 'Culture',
      accessorFn: (row) => (row.culture as any)?.culture_name ?? '',
      cell: ({ row }) => (row.original.culture as any)?.culture_name ?? '—',
    },
    {
      id: 'status', header: 'Status', size: 90,
      cell: ({ row }) => row.original.is_storno
        ? <Badge variant="destructive" className="text-xs">Cancelled</Badge>
        : <Badge className="text-xs bg-pomona-green/10 text-pomona-green border-0">Active</Badge>,
    },
    {
      id: 'actions', size: 60,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setPrintTarget(row.original)}>
              <Printer className="mr-2 h-4 w-4" />Print label
            </DropdownMenuItem>
            {!row.original.is_storno && (
              <DropdownMenuItem className="text-destructive" onClick={() => setStornoTarget(row.original)}>
                <Ban className="mr-2 h-4 w-4" />Cancel (Storno)
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader title="Barcodes" description="Generate, measure, and manage harvest barcodes" />

      <Tabs defaultValue="generator">
        <TabsList>
          <TabsTrigger value="generator">Generator</TabsTrigger>
          <TabsTrigger value="reader">Reader</TabsTrigger>
          <TabsTrigger value="storno">Storno</TabsTrigger>
        </TabsList>

        {/* GENERATOR TAB */}
        <TabsContent value="generator">
          <div className="flex items-center justify-between mb-4 gap-3">
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <>
                  <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
                  <Button
                    size="sm" variant="destructive"
                    onClick={() => setBatchTarget(barcodes.filter(b => selectedIds.has(b.id)))}
                    disabled={stornoMultiple.isPending}
                  >
                    <Ban className="h-3.5 w-3.5 mr-1.5" />Cancel selected
                  </Button>
                  <Button size="sm" variant="ghost" onClick={clearSelection}>Clear</Button>
                </>
              )}
            </div>
            <Button className="bg-pomona-green hover:bg-pomona-green/90" onClick={openAdd}>
              Generate barcode
            </Button>
          </div>
          {!isLoading && barcodes.length === 0 ? (
            <EmptyState icon={QrCode} title="No barcodes yet" description="Generate barcodes to track harvested goods." onAdd={openAdd} addLabel="Generate barcode" />
          ) : (
            <DataTable columns={columns} data={barcodes} isLoading={isLoading} searchColumn="barcode_value" searchPlaceholder="Search by barcode, employee, culture…" />
          )}
        </TabsContent>

        {/* READER TAB */}
        <TabsContent value="reader">
          <BarcodeReaderTab />
        </TabsContent>

        {/* STORNO TAB */}
        <TabsContent value="storno">
          <BarcodeStornoTab />
        </TabsContent>
      </Tabs>

      {/* Generate dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Generate barcode</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input type="date" {...register('date')} className="pl-9" />
                </div>
                {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Employee *</Label>
                <Select value={watch('employee_id') ?? ''} onValueChange={(v) => setValue('employee_id', v, { shouldValidate: true })}>
                  <SelectTrigger className={errors.employee_id ? 'border-destructive' : ''}><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.surname} {e.name}</SelectItem>)}</SelectContent>
                </Select>
                {errors.employee_id && <p className="text-xs text-destructive">{errors.employee_id.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Culture *</Label>
                <Select value={watch('culture_id') ?? ''} onValueChange={(v) => { setValue('culture_id', v, { shouldValidate: true }); setValue('culture_type_id', '', { shouldValidate: false }) }}>
                  <SelectTrigger className={errors.culture_id ? 'border-destructive' : ''}><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{cultures.map((c) => <SelectItem key={c.id} value={c.id}>{c.culture_name}</SelectItem>)}</SelectContent>
                </Select>
                {errors.culture_id && <p className="text-xs text-destructive">{errors.culture_id.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Culture type *</Label>
                <Select value={watch('culture_type_id') ?? ''} onValueChange={(v) => setValue('culture_type_id', v, { shouldValidate: true })}>
                  <SelectTrigger className={errors.culture_type_id ? 'border-destructive' : ''}><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{filteredTypes.map((ct) => <SelectItem key={ct.id} value={ct.id}>{ct.culture_type_name}</SelectItem>)}</SelectContent>
                </Select>
                {errors.culture_type_id && <p className="text-xs text-destructive">{errors.culture_type_id.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Packaging *</Label>
                <Select value={watch('packaging_id') ?? ''} onValueChange={(v) => setValue('packaging_id', v, { shouldValidate: true })}>
                  <SelectTrigger className={errors.packaging_id ? 'border-destructive' : ''}><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{packaging.map((p) => <SelectItem key={p.id} value={p.id}>{p.packaging_type}</SelectItem>)}</SelectContent>
                </Select>
                {errors.packaging_id && <p className="text-xs text-destructive">{errors.packaging_id.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Plot *</Label>
                <Select value={watch('plot_id') ?? ''} onValueChange={(v) => setValue('plot_id', v, { shouldValidate: true })}>
                  <SelectTrigger className={errors.plot_id ? 'border-destructive' : ''}><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{plots.map((p) => <SelectItem key={p.id} value={p.id}>{p.plot_name}</SelectItem>)}</SelectContent>
                </Select>
                {errors.plot_id && <p className="text-xs text-destructive">{errors.plot_id.message}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-pomona-green hover:bg-pomona-green/90" disabled={create.isPending}>
                Generate barcode
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <BarcodePrintModal
    barcode={printTarget}
    profile={profile}
    onClose={() => setPrintTarget(null)}
    onCreateCopies={async (copies) => {
      const records = Array.from({ length: copies }, (_, i) => ({
        user_id: user!.id,
        employee_id: printTarget!.employee_id,
        culture_id: printTarget!.culture_id,
        culture_type_id: printTarget!.culture_type_id,
        packaging_id: printTarget!.packaging_id,
        plot_id: printTarget!.plot_id,
        tara: printTarget!.tara,
        barcode_value: generateBarcodeValue(user!.id, i),
      }))
      const { data, error } = await supabase.from('barcodes').insert(records).select('barcode_value')
      if (error) throw error
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['barcodes-reader', user?.id] })
      return (data as { barcode_value: string }[]).map(r => r.barcode_value)
    }}
  />

      {/* Batch storno confirm dialog */}
      <Dialog open={!!batchTarget} onOpenChange={() => setBatchTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Cancel {batchTarget?.length} barcodes?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            {(() => {
              const m = batchTarget?.filter(b => b.bruto != null && b.bruto > 0).length ?? 0
              return m > 0
                ? `${m} of these have been weighed. Their weight data will be cleared and work evaluations updated.`
                : 'All selected barcodes will be marked as cancelled.'
            })()}
            {' '}This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchTarget(null)}>Keep</Button>
            <Button
              variant="destructive"
              disabled={stornoMultiple.isPending}
              onClick={() => { stornoMultiple.mutate(batchTarget!); setBatchTarget(null); clearSelection() }}
            >
              Cancel {batchTarget?.length} barcodes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Storno confirm dialog */}
      <Dialog open={!!stornoTarget} onOpenChange={() => setStornoTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Cancel barcode?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            {stornoTarget?.bruto != null && stornoTarget.bruto > 0
              ? 'This barcode has been weighed. Cancelling it will clear the weight data and update the work evaluation for that day.'
              : 'This will mark the barcode as cancelled (storno).'}
            {' '}This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStornoTarget(null)}>Keep</Button>
            <Button variant="destructive" onClick={() => { storno.mutate(stornoTarget!); setStornoTarget(null) }} disabled={storno.isPending}>
              Cancel barcode
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
