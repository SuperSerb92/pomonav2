import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { Packaging } from '@/types/app.types'
import { toast } from '@/hooks/useToast'

type PackagingInput = { packaging_type: string; tara: number }

export function usePackaging() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = ['packaging', user?.id]

  const { data: packaging = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from('packaging').select('*').eq('user_id', user!.id).eq('is_active', true).order('packaging_type')
      if (error) throw error
      return data as Packaging[]
    },
    enabled: !!user,
  })

  const create = useMutation({
    mutationFn: async (input: PackagingInput) => {
      const { error } = await supabase.from('packaging').insert({ ...input, user_id: user!.id })
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: key }); toast({ title: 'Packaging added' }) },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const update = useMutation({
    mutationFn: async ({ id, ...input }: PackagingInput & { id: string }) => {
      const { error } = await supabase.from('packaging').update(input).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: key }); toast({ title: 'Packaging updated' }) },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('packaging').update({ is_active: false }).eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      const prev = queryClient.getQueryData<Packaging[]>(key)
      queryClient.setQueryData<Packaging[]>(key, (old) => old?.filter((p) => p.id !== id) ?? [])
      return { prev }
    },
    onError: (_e, _id, ctx) => { queryClient.setQueryData(key, ctx?.prev) },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  return { packaging, isLoading, create, update, remove }
}
