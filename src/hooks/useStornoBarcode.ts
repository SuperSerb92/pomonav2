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

export function useStornoBarcode() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [stornoTarget, setStornoTarget] = useState<Barcode | null>(null)

  const storno = useMutation({
    mutationFn: async (barcode: Barcode) => {
      const isMeasured = barcode.bruto != null && barcode.bruto > 0

      // Step 1: Storno the barcode, null weights if measured
      const { error: stornoErr } = await supabase
        .from('barcodes')
        .update({
          is_storno: true,
          storno_at: new Date().toISOString(),
          ...(isMeasured ? { bruto: null, neto: null } : {}),
        })
        .eq('id', barcode.id)
      if (stornoErr) throw stornoErr

      if (!isMeasured || !barcode.employee_id) return

      // Step 2: Derive the barcode date in local time (matches work_evaluations.eval_date)
      const barcodeDate = new Date(barcode.created_at).toLocaleDateString('en-CA')
      const [y, m, d] = barcodeDate.split('-').map(Number)
      const nextDay = new Date(y, m - 1, d + 1).toLocaleDateString('en-CA')

      // Step 3: Sum remaining active barcodes for that employee on that date
      const { data: remaining, error: remErr } = await supabase
        .from('barcodes')
        .select('neto')
        .eq('user_id', user!.id)
        .eq('employee_id', barcode.employee_id)
        .eq('is_storno', false)
        .gte('created_at', `${barcodeDate}T00:00:00`)
        .lt('created_at', `${nextDay}T00:00:00`)
        .not('neto', 'is', null)
      if (remErr) throw remErr

      const newNeto = Math.round((remaining ?? []).reduce((s, b) => s + (b.neto ?? 0), 0) * 1000) / 1000
      const newBoxes = remaining?.length ?? 0

      // Step 4: Find the saved work_evaluation for this employee + date
      const { data: ev, error: evErr } = await supabase
        .from('work_evaluations')
        .select('id, pay_per_day, expense_kg, fuel, bonus')
        .eq('user_id', user!.id)
        .eq('employee_id', barcode.employee_id)
        .eq('eval_date', barcodeDate)
        .maybeSingle()
      if (evErr) throw evErr
      if (!ev) return // no saved evaluation for this date — nothing to update

      // Step 5: Recalculate total with the new neto and existing pay rates
      const newTotal = recalcTotal(newNeto, ev.pay_per_day ?? 0, ev.expense_kg ?? 0, ev.fuel ?? 0, ev.bonus ?? 0)

      const { error: updateErr } = await supabase
        .from('work_evaluations')
        .update({
          neto: newNeto,
          no_of_boxes: newBoxes,
          total: newTotal || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ev.id)
      if (updateErr) throw updateErr
    },
    onSuccess: (_, barcode) => {
      const isMeasured = barcode.bruto != null && barcode.bruto > 0
      queryClient.invalidateQueries({ queryKey: ['barcodes', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['barcodes-reader', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['barcodes-storno', user?.id] })
      toast({
        title: 'Barcode cancelled',
        description: isMeasured ? 'Weight data cleared and work evaluation updated.' : undefined,
      })
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  return { stornoTarget, setStornoTarget, storno }
}
