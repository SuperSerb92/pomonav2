import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { toast } from '@/hooks/useToast'
import type { Barcode } from '@/types/app.types'

function recalcTotal(neto: number, payPerDay: number, expenseKg: number, fuel: number, bonus: number): number {
  if (payPerDay > 0 && expenseKg === 0) return payPerDay + fuel + bonus
  if (expenseKg > 0 && payPerDay === 0) return Math.round(neto * expenseKg) + fuel + bonus
  return 0
}

function barcodeLocalDate(createdAt: string): string {
  return new Date(createdAt).toLocaleDateString('en-CA')
}

function nextLocalDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d + 1).toLocaleDateString('en-CA')
}

async function updateWorkEval(userId: string, employeeId: string, date: string) {
  const nextDay = nextLocalDate(date)

  const { data: remaining, error: remErr } = await supabase
    .from('barcodes')
    .select('neto')
    .eq('user_id', userId)
    .eq('employee_id', employeeId)
    .eq('is_storno', false)
    .gte('created_at', `${date}T00:00:00`)
    .lt('created_at', `${nextDay}T00:00:00`)
    .not('neto', 'is', null)
  if (remErr) throw remErr

  const newNeto = Math.round((remaining ?? []).reduce((s, b) => s + (b.neto ?? 0), 0) * 1000) / 1000
  const newBoxes = remaining?.length ?? 0

  const { data: ev, error: evErr } = await supabase
    .from('work_evaluations')
    .select('id, pay_per_day, expense_kg, fuel, bonus')
    .eq('user_id', userId)
    .eq('employee_id', employeeId)
    .eq('eval_date', date)
    .maybeSingle()
  if (evErr) throw evErr
  if (!ev) return

  const newTotal = recalcTotal(newNeto, ev.pay_per_day ?? 0, ev.expense_kg ?? 0, ev.fuel ?? 0, ev.bonus ?? 0)
  const { error: updateErr } = await supabase
    .from('work_evaluations')
    .update({ neto: newNeto, no_of_boxes: newBoxes, total: newTotal || null, updated_at: new Date().toISOString() })
    .eq('id', ev.id)
  if (updateErr) throw updateErr
}

export function useStornoBarcode() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [stornoTarget, setStornoTarget] = useState<Barcode | null>(null)

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ['barcodes', user?.id] })
    queryClient.invalidateQueries({ queryKey: ['barcodes-reader', user?.id] })
    queryClient.invalidateQueries({ queryKey: ['barcodes-storno', user?.id] })
  }

  // ── Single storno ────────────────────────────────────────────────────────────
  const storno = useMutation({
    mutationFn: async (barcode: Barcode) => {
      const isMeasured = barcode.bruto != null && barcode.bruto > 0

      const { error } = await supabase
        .from('barcodes')
        .update({
          is_storno: true,
          storno_at: new Date().toISOString(),
          ...(isMeasured ? { bruto: null, neto: null } : {}),
        })
        .eq('id', barcode.id)
      if (error) throw error

      if (isMeasured && barcode.employee_id) {
        await updateWorkEval(user!.id, barcode.employee_id, barcodeLocalDate(barcode.created_at))
      }
    },
    onSuccess: (_, barcode) => {
      invalidateAll()
      const isMeasured = barcode.bruto != null && barcode.bruto > 0
      toast({
        title: 'Barcode cancelled',
        description: isMeasured ? 'Weight data cleared and work evaluation updated.' : undefined,
      })
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  // ── Batch storno ─────────────────────────────────────────────────────────────
  const stornoMultiple = useMutation({
    mutationFn: async (barcodes: Barcode[]) => {
      if (barcodes.length === 0) return

      const measured = barcodes.filter(b => b.bruto != null && b.bruto > 0)
      const unmeasured = barcodes.filter(b => b.bruto == null || b.bruto === 0)
      const now = new Date().toISOString()

      if (unmeasured.length > 0) {
        const { error } = await supabase
          .from('barcodes')
          .update({ is_storno: true, storno_at: now })
          .in('id', unmeasured.map(b => b.id))
        if (error) throw error
      }

      if (measured.length > 0) {
        const { error } = await supabase
          .from('barcodes')
          .update({ is_storno: true, storno_at: now, bruto: null, neto: null })
          .in('id', measured.map(b => b.id))
        if (error) throw error

        // Deduplicate by employee+date before updating work evaluations
        const groups = new Map<string, { employeeId: string; date: string }>()
        for (const b of measured) {
          if (!b.employee_id) continue
          const date = barcodeLocalDate(b.created_at)
          const key = `${b.employee_id}_${date}`
          if (!groups.has(key)) groups.set(key, { employeeId: b.employee_id, date })
        }
        for (const { employeeId, date } of groups.values()) {
          await updateWorkEval(user!.id, employeeId, date)
        }
      }
    },
    onSuccess: (_, barcodes) => {
      invalidateAll()
      const measuredCount = barcodes.filter(b => b.bruto != null && b.bruto > 0).length
      toast({
        title: `${barcodes.length} barcode${barcodes.length !== 1 ? 's' : ''} cancelled`,
        description: measuredCount > 0
          ? `${measuredCount} work evaluation${measuredCount !== 1 ? 's' : ''} updated.`
          : undefined,
      })
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  return { stornoTarget, setStornoTarget, storno, stornoMultiple }
}
