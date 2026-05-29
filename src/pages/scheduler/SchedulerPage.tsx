import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { toast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import type { SchedulerEvent } from '@/types/app.types'

const schema = z.object({
  title: z.string().min(1, 'Required'),
  description: z.string().optional().nullable(),
  start_at: z.string().min(1, 'Required'),
  end_at: z.string().optional().nullable(),
  color: z.string().default('#2EB88E'),
})
type FormData = z.infer<typeof schema>

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function SchedulerPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [dialogOpen, setDialogOpen] = useState(false)


  const key = ['scheduler_events', user?.id]
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const { data: events = [] } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const start = new Date(year, month, 1).toISOString()
      const end = new Date(year, month + 1, 1).toISOString()
      const { data, error } = await supabase
        .from('scheduler_events')
        .select('*')
        .eq('user_id', user!.id)
        .gte('start_at', start)
        .lt('start_at', end)
        .order('start_at')
      if (error) throw error
      return data as SchedulerEvent[]
    },
    enabled: !!user,
  })

  const create = useMutation({
    mutationFn: async (input: FormData) => {
      const { error } = await supabase.from('scheduler_events').insert({ ...input, user_id: user!.id })
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: key }); toast({ title: 'Event added' }) },
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('scheduler_events').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) as never })

  const openAdd = (date?: string) => {
    const d = date ?? new Date().toISOString().slice(0, 16)
    reset({ start_at: d, color: '#2EB88E' })
    setDialogOpen(true)
  }

  const onSubmit = async (data: FormData) => {
    await create.mutateAsync(data)
    setDialogOpen(false)
  }

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter((e) => e.start_at.startsWith(dateStr))
  }

  const today = new Date()
  const isToday = (day: number) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === day

  return (
    <PageContainer>
      <PageHeader title="Scheduler" description="Plan and manage farm activities" onAdd={() => openAdd()} addLabel="Add event" />

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        {/* Month navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-1 hover:bg-muted rounded-md transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="font-semibold">{MONTHS[month]} {year}</h2>
          <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-1 hover:bg-muted rounded-md transition-colors">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b">
          {DAYS.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="h-28 border-b border-r bg-muted/20" />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dayEvents = getEventsForDay(day)
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T08:00`
            return (
              <div
                key={day}
                className={cn('h-28 border-b border-r p-1 cursor-pointer hover:bg-muted/20 transition-colors overflow-hidden', isToday(day) && 'bg-pomona-green/5')}
                onClick={() => openAdd(dateStr)}
              >
                <div className={cn('text-sm font-medium mb-1 h-6 w-6 flex items-center justify-center rounded-full', isToday(day) && 'bg-pomona-green text-white text-xs')}>
                  {day}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((e) => (
                    <div
                      key={e.id}
                      onClick={(ev) => { ev.stopPropagation(); if (confirm(`Delete "${e.title}"?`)) remove.mutate(e.id) }}
                      className="text-xs px-1.5 py-0.5 rounded text-white truncate cursor-pointer hover:opacity-90"
                      style={{ backgroundColor: e.color }}
                    >
                      {e.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && <p className="text-xs text-muted-foreground pl-1">+{dayEvents.length - 3} more</p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add event</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input {...register('title')} placeholder="Event name" />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Start *</Label>
              <Input {...register('start_at')} type="datetime-local" />
            </div>
            <div className="space-y-1.5">
              <Label>End</Label>
              <Input {...register('end_at')} type="datetime-local" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input {...register('description')} placeholder="Optional notes" />
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex items-center gap-2">
                <Input {...register('color')} type="color" className="h-10 w-16 p-1" />
                <span className="text-xs text-muted-foreground">Event color</span>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-pomona-green hover:bg-pomona-green/90" disabled={create.isPending}>Add</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
