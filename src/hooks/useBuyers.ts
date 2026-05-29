import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { Buyer } from '@/types/app.types'
import { toast } from '@/hooks/useToast'

type BuyerInput = {
  name: string
  pib?: string | null
  jmbg?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  email?: string | null
  is_active?: boolean
}

export function useBuyers() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = ['buyers', user?.id]

  const { data: buyers = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from('buyers').select('*').eq('user_id', user!.id).eq('is_active', true).order('name')
      if (error) throw error
      return data as Buyer[]
    },
    enabled: !!user,
  })

  const create = useMutation({
    mutationFn: async (input: BuyerInput) => {
      const { error } = await supabase.from('buyers').insert({ ...input, user_id: user!.id })
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: key }); toast({ title: 'Buyer added' }) },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const update = useMutation({
    mutationFn: async ({ id, ...input }: BuyerInput & { id: string }) => {
      const { error } = await supabase.from('buyers').update({ ...input, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: key }); toast({ title: 'Buyer updated' }) },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('buyers').update({ is_active: false }).eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: key })
      const prev = queryClient.getQueryData<Buyer[]>(key)
      queryClient.setQueryData<Buyer[]>(key, (old) => old?.filter((b) => b.id !== id) ?? [])
      return { prev }
    },
    onError: (_e, _id, ctx) => { queryClient.setQueryData(key, ctx?.prev); toast({ title: 'Error', variant: 'destructive' }) },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  return { buyers, isLoading, create, update, remove }
}
