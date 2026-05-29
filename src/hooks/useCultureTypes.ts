import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { CultureType } from '@/types/app.types'
import { toast } from '@/hooks/useToast'

type CultureTypeInput = { culture_id: string; culture_type_name: string }

export function useCultureTypes() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = ['culture_types', user?.id]

  const { data: cultureTypes = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('culture_types')
        .select('*, culture:cultures(id, culture_name)')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .order('culture_type_name')
      if (error) throw error
      return data as unknown as CultureType[]
    },
    enabled: !!user,
  })

  const create = useMutation({
    mutationFn: async (input: CultureTypeInput) => {
      const { error } = await supabase.from('culture_types').insert({ ...input, user_id: user!.id })
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: key }); toast({ title: 'Culture type added' }) },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const update = useMutation({
    mutationFn: async ({ id, ...input }: CultureTypeInput & { id: string }) => {
      const { error } = await supabase.from('culture_types').update(input).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: key }); toast({ title: 'Culture type updated' }) },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('culture_types').update({ is_active: false }).eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      const prev = queryClient.getQueryData<CultureType[]>(key)
      queryClient.setQueryData<CultureType[]>(key, (old) => old?.filter((c) => c.id !== id) ?? [])
      return { prev }
    },
    onError: (_e, _id, ctx) => { queryClient.setQueryData(key, ctx?.prev) },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  return { cultureTypes, isLoading, create, update, remove }
}
