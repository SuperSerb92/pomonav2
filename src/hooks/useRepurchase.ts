import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { Repurchase } from '@/types/app.types'
import { toast } from '@/hooks/useToast'

type RepurchaseInput = {
  buyer_id: string
  culture_id: string
  repurchase_date: string
  neto: number
  neto_shipped?: number | null
  difference?: number | null
  no_of_boxes?: number | null
  price_rsd?: number | null
  price_eur?: number | null
  income_rsd?: number | null
  income_eur?: number | null
  eur_rate?: number | null
  notes?: string | null
  paid?: boolean
  paid_date?: string | null
}

export function useRepurchase() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = ['repurchase', user?.id]

  const { data: repurchases = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('repurchase')
        .select('*, buyer:buyers(id, name), culture:cultures(id, culture_name)')
        .eq('user_id', user!.id)
        .order('repurchase_date', { ascending: false })
        .limit(200)
      if (error) throw error
      return data as unknown as Repurchase[]
    },
    enabled: !!user,
  })

  const create = useMutation({
    mutationFn: async (input: RepurchaseInput) => {
      const { error } = await supabase.from('repurchase').insert({ ...input, user_id: user!.id })
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: key }); toast({ title: 'Purchase recorded' }) },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const update = useMutation({
    mutationFn: async ({ id, ...input }: RepurchaseInput & { id: string }) => {
      const { error } = await supabase.from('repurchase').update({ ...input, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: key }); toast({ title: 'Purchase updated' }) },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('repurchase').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      const prev = queryClient.getQueryData<Repurchase[]>(key)
      queryClient.setQueryData<Repurchase[]>(key, (old) => old?.filter((r) => r.id !== id) ?? [])
      return { prev }
    },
    onError: (_e, _id, ctx) => { queryClient.setQueryData(key, ctx?.prev) },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  return { repurchases, isLoading, create, update, remove }
}
