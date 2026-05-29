import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { Culture } from '@/types/app.types'
import { toast } from '@/hooks/useToast'

export function useCultures() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = ['cultures', user?.id]

  const { data: cultures = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from('cultures').select('*').eq('user_id', user!.id).eq('is_active', true).order('culture_name')
      if (error) throw error
      return data as Culture[]
    },
    enabled: !!user,
  })

  const create = useMutation({
    mutationFn: async (culture_name: string) => {
      const { error } = await supabase.from('cultures').insert({ culture_name, user_id: user!.id })
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: key }); toast({ title: 'Culture added' }) },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const update = useMutation({
    mutationFn: async ({ id, culture_name }: { id: string; culture_name: string }) => {
      const { error } = await supabase.from('cultures').update({ culture_name }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: key }); toast({ title: 'Culture updated' }) },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cultures').update({ is_active: false }).eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      const prev = queryClient.getQueryData<Culture[]>(key)
      queryClient.setQueryData<Culture[]>(key, (old) => old?.filter((c) => c.id !== id) ?? [])
      return { prev }
    },
    onError: (_e, _id, ctx) => { queryClient.setQueryData(key, ctx?.prev); toast({ title: 'Error', variant: 'destructive' }) },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  return { cultures, isLoading, create, update, remove }
}
