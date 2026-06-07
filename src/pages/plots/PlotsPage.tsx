import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { MapPin, ChevronRight, ChevronDown, Pencil, Trash2, Plus } from 'lucide-react'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { DeleteConfirmDialog } from '@/components/shared/DeleteConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { usePlots, usePlotLists } from '@/hooks/usePlots'
import { cn } from '@/lib/utils'
import type { Plot, PlotList } from '@/types/app.types'

// ── Schemas ───────────────────────────────────────────────────────────────────

const plotSchema = z.object({ plot_name: z.string().min(1, 'Required') })
type PlotForm = z.infer<typeof plotSchema>

const partSchema = z.object({
  plot_name:  z.string().min(1, 'Required'),
  plot_label: z.string().optional(),
})
type PartForm = z.infer<typeof partSchema>

// ── Component ─────────────────────────────────────────────────────────────────

export default function PlotsPage() {
  const { plotLists, isLoading: listsLoading, create: createPlot, update: updatePlot, remove: removePlot } = usePlotLists()
  const { plots: parts, isLoading: partsLoading, create: createPart, update: updatePart, remove: removePart } = usePlots()

  const isLoading = listsLoading || partsLoading

  // Expanded plot row
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Plot (parcel) dialog
  const [plotDialog, setPlotDialog] = useState(false)
  const [editingPlot, setEditingPlot] = useState<PlotList | null>(null)
  const plotForm = useForm<PlotForm>({ resolver: zodResolver(plotSchema) as never })

  // Plot part dialog
  const [partDialog, setPartDialog] = useState(false)
  const [editingPart, setEditingPart] = useState<Plot | null>(null)
  const [activeParentId, setActiveParentId] = useState<string | null>(null)
  const partForm = useForm<PartForm>({ resolver: zodResolver(partSchema) as never })

  // Delete targets
  const [deletePlot, setDeletePlot] = useState<string | null>(null)
  const [deletePart, setDeletePart] = useState<string | null>(null)

  // ── Plot actions ─────────────────────────────────────────────────────────────

  const openAddPlot = () => {
    setEditingPlot(null)
    plotForm.reset({})
    setPlotDialog(true)
  }

  const openEditPlot = (p: PlotList) => {
    setEditingPlot(p)
    plotForm.reset({ plot_name: p.plot_name })
    setPlotDialog(true)
  }

  const onSubmitPlot = async (data: PlotForm) => {
    if (editingPlot) await updatePlot.mutateAsync({ id: editingPlot.id, plot_name: data.plot_name })
    else await createPlot.mutateAsync(data.plot_name)
    setPlotDialog(false)
  }

  // ── Part actions ─────────────────────────────────────────────────────────────

  const openAddPart = (parentId: string) => {
    setEditingPart(null)
    setActiveParentId(parentId)
    partForm.reset({})
    setPartDialog(true)
  }

  const openEditPart = (part: Plot) => {
    setEditingPart(part)
    setActiveParentId(part.plot_list_id)
    partForm.reset({ plot_name: part.plot_name, plot_label: part.plot_label ?? '' })
    setPartDialog(true)
  }

  const onSubmitPart = async (data: PartForm) => {
    const payload = { plot_name: data.plot_name, plot_label: data.plot_label || null, plot_list_id: activeParentId }
    if (editingPart) await updatePart.mutateAsync({ id: editingPart.id, ...payload })
    else await createPart.mutateAsync(payload)
    setPartDialog(false)
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <PageContainer>
      <PageHeader title="Plots" description="Manage plots (parcels) and their parts" onAdd={openAddPlot} addLabel="Add plot" />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : plotLists.length === 0 ? (
        <EmptyState icon={MapPin} title="No plots yet" description="Add plots to assign to barcode records." onAdd={openAddPlot} addLabel="Add plot" />
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="w-8" />
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Plot Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parts</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {plotLists.map((plot) => {
                const plotParts = parts.filter(p => p.plot_list_id === plot.id)
                const isExpanded = expandedId === plot.id
                return (
                  <>
                    <tr
                      key={plot.id}
                      className={cn('border-b transition-colors hover:bg-muted/20 cursor-pointer', isExpanded && 'bg-muted/30')}
                      onClick={() => setExpandedId(isExpanded ? null : plot.id)}
                    >
                      <td className="pl-3 py-3 text-muted-foreground">
                        {isExpanded
                          ? <ChevronDown className="h-4 w-4" />
                          : <ChevronRight className="h-4 w-4" />}
                      </td>
                      <td className="px-4 py-3 font-medium">{plot.plot_name}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">{plotParts.length} part{plotParts.length !== 1 ? 's' : ''}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditPlot(plot)} title="Edit plot">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeletePlot(plot.id)} title="Delete plot">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr key={`${plot.id}-parts`} className="border-b bg-muted/10">
                        <td colSpan={4} className="px-6 py-3">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Plot Parts</span>
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openAddPart(plot.id)}>
                                <Plus className="h-3 w-3 mr-1" />Add part
                              </Button>
                            </div>
                            {plotParts.length === 0 ? (
                              <p className="text-xs text-muted-foreground py-2">No parts yet. Add a part to this plot.</p>
                            ) : (
                              <div className="rounded-lg border overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead className="bg-muted/40 border-b">
                                    <tr>
                                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Name</th>
                                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Label</th>
                                      <th className="px-3 py-2 w-20" />
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {plotParts.map((part) => (
                                      <tr key={part.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                                        <td className="px-3 py-2">{part.plot_name}</td>
                                        <td className="px-3 py-2 text-muted-foreground">{part.plot_label || '—'}</td>
                                        <td className="px-3 py-2 text-right">
                                          <div className="flex items-center justify-end gap-1">
                                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEditPart(part)} title="Edit part">
                                              <Pencil className="h-3 w-3" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => setDeletePart(part.id)} title="Delete part">
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Plot dialog */}
      <Dialog open={plotDialog} onOpenChange={setPlotDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editingPlot ? 'Edit plot' : 'Add plot'}</DialogTitle></DialogHeader>
          <form onSubmit={plotForm.handleSubmit(onSubmitPlot)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Plot name *</Label>
              <Input {...plotForm.register('plot_name')} placeholder="e.g. North Field" />
              {plotForm.formState.errors.plot_name && <p className="text-xs text-destructive">{plotForm.formState.errors.plot_name.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPlotDialog(false)}>Cancel</Button>
              <Button type="submit" className="bg-pomona-green hover:bg-pomona-green/90" disabled={createPlot.isPending || updatePlot.isPending}>
                {editingPlot ? 'Save' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Plot part dialog */}
      <Dialog open={partDialog} onOpenChange={setPartDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editingPart ? 'Edit plot part' : 'Add plot part'}</DialogTitle></DialogHeader>
          <form onSubmit={partForm.handleSubmit(onSubmitPart)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Part name *</Label>
              <Input {...partForm.register('plot_name')} placeholder="e.g. Row 1" />
              {partForm.formState.errors.plot_name && <p className="text-xs text-destructive">{partForm.formState.errors.plot_name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Label</Label>
              <Input {...partForm.register('plot_label')} placeholder="Short code (optional)" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPartDialog(false)}>Cancel</Button>
              <Button type="submit" className="bg-pomona-green hover:bg-pomona-green/90" disabled={createPart.isPending || updatePart.isPending}>
                {editingPart ? 'Save' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete plot */}
      <DeleteConfirmDialog
        open={!!deletePlot}
        onClose={() => setDeletePlot(null)}
        onConfirm={() => { removePlot.mutate(deletePlot!); setDeletePlot(null) }}
        title="Delete plot"
        description="This will also remove the link from all its parts. Parts themselves will not be deleted."
        loading={removePlot.isPending}
      />

      {/* Delete part */}
      <DeleteConfirmDialog
        open={!!deletePart}
        onClose={() => setDeletePart(null)}
        onConfirm={() => { removePart.mutate(deletePart!); setDeletePart(null) }}
        title="Delete plot part"
        loading={removePart.isPending}
      />
    </PageContainer>
  )
}
