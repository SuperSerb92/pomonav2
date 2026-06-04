import { useRef, useState } from 'react'
import { ScanLine, Save, Printer, Scale, Plug, PlugZap, Loader2, Search, X, Ban } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useSerialScale } from '@/hooks/useSerialScale'
import { useStornoBarcode } from '@/hooks/useStornoBarcode'
import { formatDate } from '@/lib/formatters'
import { toast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BarcodePrintModal } from './BarcodePrintModal'
import type { Barcode } from '@/types/app.types'

export function BarcodeReaderTab() {
  const { user } = useAuth()
  const { profile } = useProfile()
  const queryClient = useQueryClient()
  const scale = useSerialScale()
  const scanInputRef = useRef<HTMLInputElement>(null)
  const [scanValue, setScanValue] = useState('')
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [pendingBruto, setPendingBruto] = useState<Record<string, string>>({})
  const [printTarget, setPrintTarget] = useState<Barcode[] | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchTarget, setBatchTarget] = useState<Barcode[] | null>(null)
  const { stornoTarget, setStornoTarget, storno, stornoMultiple } = useStornoBarcode()

  const toggleSelect = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })
  const clearSelection = () => setSelectedIds(new Set())
  const [filterEmployee, setFilterEmployee] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [filterCulture, setFilterCulture] = useState('')
  const [filterMeasured, setFilterMeasured] = useState<'all' | 'yes' | 'no'>('all')

  const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  const key = ['barcodes-reader', user?.id]

  const { data: barcodes = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('barcodes')
        .select('*, employee:employees(id, name, surname, middle_name), culture:cultures(id, culture_name), culture_type:culture_types(id, culture_type_name), packaging:packaging(id, packaging_type, tara)')
        .eq('user_id', user!.id)
        .eq('is_storno', false)
        .gte('created_at', fourDaysAgo)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as Barcode[]
    },
    enabled: !!user,
  })

  const updateWeight = useMutation({
    mutationFn: async ({ id, bruto, tara }: { id: string; bruto: number; tara: number }) => {
      const neto = Math.max(0, bruto - tara)
      const { error } = await supabase
        .from('barcodes')
        .update({ bruto, neto })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['barcodes', user?.id] })
      setPendingBruto((prev) => { const next = { ...prev }; delete next[id]; return next })
      toast({ title: 'Weight saved', description: `Bruto saved successfully` })
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  async function handleScan(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    const value = scanValue.trim()
    if (!value) return
    setScanValue('')

    const match = barcodes.find((b) => b.barcode_value === value)
    if (!match) {
      toast({ title: 'Barcode not found', description: `"${value}" was not found in recent barcodes.`, variant: 'destructive' })
      return
    }

    setHighlightedId(match.id)
    document.getElementById(`row-${match.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })

    if (scale.state === 'connected') {
      await readAndSave(match)
    }
  }

  async function readAndSave(barcode: Barcode) {
    const kg = await scale.readWeight()
    if (kg === null) return
    const tara = (barcode.packaging as any)?.tara ?? barcode.tara ?? 0
    updateWeight.mutate({ id: barcode.id, bruto: kg, tara })
  }

  async function readFromScale(barcodeId: string) {
    const barcode = barcodes.find((b) => b.id === barcodeId)
    if (!barcode) return
    await readAndSave(barcode)
  }

  function saveBruto(barcode: Barcode) {
    const raw = pendingBruto[barcode.id]
    if (raw === undefined) return
    const bruto = parseFloat(raw)
    if (isNaN(bruto) || bruto < 0) {
      toast({ title: 'Invalid weight', variant: 'destructive' })
      return
    }
    const tara = barcode.packaging ? (barcode.packaging as any).tara ?? barcode.tara ?? 0 : barcode.tara ?? 0
    updateWeight.mutate({ id: barcode.id, bruto, tara })
  }

  const hasFilters = filterEmployee !== '' || filterDate !== '' || filterCulture !== '' || filterMeasured !== 'all'

  const filteredBarcodes = barcodes.filter((b) => {
    if (filterEmployee) {
      const emp = b.employee
      const name = emp ? `${emp.surname} ${emp.name}`.toLowerCase() : ''
      if (!name.includes(filterEmployee.toLowerCase())) return false
    }
    if (filterDate) {
      const bDate = new Date(b.created_at).toLocaleDateString('en-CA')
      if (bDate !== filterDate) return false
    }
    if (filterCulture) {
      const cn = b.culture?.culture_name?.toLowerCase() ?? ''
      const ctn = b.culture_type?.culture_type_name?.toLowerCase() ?? ''
      if (!cn.includes(filterCulture.toLowerCase()) && !ctn.includes(filterCulture.toLowerCase())) return false
    }
    if (filterMeasured !== 'all') {
      const m = b.bruto != null && b.bruto > 0
      if (filterMeasured === 'yes' && !m) return false
      if (filterMeasured === 'no' && m) return false
    }
    return true
  })

  if (isLoading) return <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>

  return (
    <>
    <div className="space-y-4">
      {/* Scan input */}
      <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30">
        <ScanLine className="h-5 w-5 text-muted-foreground shrink-0" />
        <Input
          ref={scanInputRef}
          autoFocus
          placeholder="Scan or type barcode and press Enter…"
          value={scanValue}
          onChange={(e) => setScanValue(e.target.value)}
          onKeyDown={handleScan}
          className="max-w-sm"
        />
        <p className="text-xs text-muted-foreground">Showing barcodes from the last 4 days</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input placeholder="Employee…" value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)} className="pl-8 h-8 w-36 text-sm" />
        </div>
        <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="h-8 w-40 text-sm" />
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input placeholder="Culture…" value={filterCulture} onChange={(e) => setFilterCulture(e.target.value)} className="pl-8 h-8 w-36 text-sm" />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground pr-1">Measured:</span>
          {(['all', 'yes', 'no'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setFilterMeasured(opt)}
              className={cn(
                'px-2.5 py-1 text-xs rounded border transition-colors',
                filterMeasured === opt
                  ? 'bg-pomona-green text-white border-pomona-green'
                  : 'border-border bg-background hover:bg-muted'
              )}
            >
              {opt === 'all' ? 'All' : opt === 'yes' ? 'Yes' : 'No'}
            </button>
          ))}
        </div>
        {hasFilters && (
          <>
            <button
              onClick={() => { setFilterEmployee(''); setFilterDate(''); setFilterCulture(''); setFilterMeasured('all') }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />Clear
            </button>
            <span className="text-xs text-muted-foreground">{filteredBarcodes.length} of {barcodes.length}</span>
          </>
        )}
      </div>

      {/* Scale connection bar */}
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
        <Scale className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm text-muted-foreground flex-1">Scale (COM port)</span>

        {scale.error && (
          <span className="text-xs text-destructive max-w-xs truncate">{scale.error}</span>
        )}

        {scale.state === 'disconnected' ? (
          <Button
            size="sm"
            variant="outline"
            onClick={scale.connect}
            disabled={!scale.supported}
            title={!scale.supported ? 'Requires Chrome or Edge on desktop' : undefined}
          >
            <Plug className="h-3.5 w-3.5 mr-1.5" />
            {scale.supported ? 'Connect scale' : 'Not supported'}
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Badge className={cn('text-xs', scale.state === 'reading' ? 'bg-orange-400/20 text-orange-600 border-0' : 'bg-pomona-green/10 text-pomona-green border-0')}>
              {scale.state === 'reading' ? 'Reading…' : 'Connected'}
            </Badge>
            <Button size="sm" variant="outline" onClick={scale.disconnect}>
              <PlugZap className="h-3.5 w-3.5 mr-1.5" />
              Disconnect
            </Button>
          </div>
        )}
      </div>

      {/* Batch selection toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/40">
          <span className="text-sm text-muted-foreground">{selectedIds.size} selected</span>
          <Button
            size="sm" variant="destructive"
            onClick={() => setBatchTarget(filteredBarcodes.filter(b => selectedIds.has(b.id)))}
            disabled={stornoMultiple.isPending}
          >
            <Ban className="h-3.5 w-3.5 mr-1.5" />Cancel selected
          </Button>
          <Button size="sm" variant="ghost" onClick={clearSelection}>Clear</Button>
        </div>
      )}

      {barcodes.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No active barcodes in the last 4 days.</p>
      ) : filteredBarcodes.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No barcodes match the current filters.</p>
      ) : (
        <div className="rounded-lg border overflow-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground w-10">
                  {(() => {
                    const allChecked = filteredBarcodes.length > 0 && filteredBarcodes.every(b => selectedIds.has(b.id))
                    const someChecked = filteredBarcodes.some(b => selectedIds.has(b.id))
                    return (
                      <Checkbox
                        checked={allChecked ? true : someChecked ? 'indeterminate' : false}
                        onCheckedChange={(v) => v
                          ? setSelectedIds(new Set(filteredBarcodes.map(b => b.id)))
                          : clearSelection()
                        }
                        aria-label="Select all"
                      />
                    )
                  })()}
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Barcode</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Employee</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Culture</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Packaging</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Tara (kg)</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Bruto (kg)</th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Neto (kg)</th>
                <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">Measured</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filteredBarcodes.map((b) => {
                const tara = (b.packaging as any)?.tara ?? b.tara ?? 0
                const pendingVal = pendingBruto[b.id]
                const displayBruto = pendingVal !== undefined ? parseFloat(pendingVal) || 0 : b.bruto ?? 0
                const displayNeto = Math.max(0, displayBruto - tara)
                const isMeasured = b.bruto != null && b.bruto > 0
                const isHighlighted = highlightedId === b.id

                return (
                  <tr
                    id={`row-${b.id}`}
                    key={b.id}
                    className={cn(
                      'border-b last:border-0 transition-colors',
                      isHighlighted ? 'bg-pomona-green/10 ring-1 ring-inset ring-pomona-green/40' : 'hover:bg-muted/30'
                    )}
                  >
                    <td className="px-3 py-2">
                      <Checkbox
                        checked={selectedIds.has(b.id)}
                        onCheckedChange={() => toggleSelect(b.id)}
                        aria-label="Select row"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{b.barcode_value}</code>
                    </td>
                    <td className="px-3 py-2 text-sm">
                      {b.employee ? `${(b.employee as any).surname} ${(b.employee as any).name}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-sm text-muted-foreground">{formatDate(b.created_at)}</td>
                    <td className="px-3 py-2 text-sm">
                      {(b.culture as any)?.culture_name ?? '—'}
                      {(b.culture_type as any)?.culture_type_name && (
                        <span className="text-muted-foreground"> / {(b.culture_type as any).culture_type_name}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm">{(b.packaging as any)?.packaging_type ?? '—'}</td>
                    <td className="px-3 py-2 text-right text-sm">{tara.toFixed(3)}</td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        className="h-7 w-24 text-right ml-auto"
                        value={pendingVal ?? (b.bruto?.toString() ?? '')}
                        onChange={(e) => setPendingBruto((prev) => ({ ...prev, [b.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && saveBruto(b)}
                      />
                    </td>
                    <td className="px-3 py-2 text-right text-sm font-medium">
                      {displayNeto > 0 ? displayNeto.toFixed(3) : '—'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {isMeasured
                        ? <Badge className="text-xs bg-pomona-green/10 text-pomona-green border-0">Yes</Badge>
                        : <Badge variant="outline" className="text-xs text-muted-foreground">No</Badge>}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0"
                          onClick={() => readFromScale(b.id)}
                          disabled={scale.state !== 'connected'}
                          title={scale.state === 'disconnected' ? 'Connect scale first' : 'Read weight from scale'}
                        >
                          {scale.state === 'reading'
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Scale className="h-3.5 w-3.5" />}
                        </Button>
                        {pendingBruto[b.id] !== undefined && (
                          <Button
                            size="sm"
                            className="h-7 bg-pomona-green hover:bg-pomona-green/90 text-xs"
                            onClick={() => saveBruto(b)}
                            disabled={updateWeight.isPending}
                          >
                            <Save className="h-3 w-3 mr-1" />Save
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => setPrintTarget([b])}
                          title="Print label"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setStornoTarget(b)}
                          title="Cancel (Storno)"
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>

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
          <Button
            variant="destructive"
            onClick={() => { storno.mutate(stornoTarget!); setStornoTarget(null) }}
            disabled={storno.isPending}
          >
            Cancel barcode
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <BarcodePrintModal
      barcodes={printTarget}
      profile={profile}
      onClose={() => setPrintTarget(null)}
    />
    </>
  )
}
